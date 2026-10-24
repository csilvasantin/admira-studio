(function(){
  'use strict';
  const P=window.StockPlaylistProgress;
  let data={rows:[],assignments:[]},pending=null,at=0,error='',timer=null,checking=null,generation=0,again=false,progressError='';
  const downloads=new Map(),recent=new Map();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const members=id=>StockDestinations.memberships(data,id);
  const screens=id=>[...new Set(members(id).map(a=>a.screen).filter(Boolean))];
  function state(id){
    const expected=screens(id),d=downloads.get(id);
    return P.summarize((d?.targets||[]).filter(t=>expected.includes(t.screen)),Math.max(expected.length,d?.total||0));
  }
  function badge(id){
    const list=members(id);if(!list.length)return '';
    const count=new Set(list.map(a=>a.id||a.name)).size,s=state(id),d=downloads.get(id);
    const detail=StockDestinations.membershipText(data,id);
    const names=new Map(list.map(a=>[a.screen,a.deviceName||a.screen]));
    const targets=new Map((d?.targets||[]).map(t=>[t.screen,t]));
    const status=screens(id).map(screen=>{const t=targets.get(screen),valid=t&&P.fresh(t.at);return (names.get(screen)||screen)+': '+(!valid?'sin confirmación reciente':t.state==='ready'?'descarga completa':t.state==='downloading'?'descargando '+t.pct+' %':t.state==='waiting'?'pendiente de descarga':'sin confirmación reciente');}).join('\n');
    const label=(s.complete?'Descarga completa':'Distribuyendo')+' · '+s.pct+' % · '+s.ready+'/'+s.total+' destinos confirmados';
    const title=detail+'\n\n'+label+'\n'+status+(progressError?'\nNo se pudo actualizar el estado. Se reintentará automáticamente.':'');
    return '<button type="button" class="stock-playlist-badge '+(s.complete?'is-ready':'is-pending')+'" data-act="playlist-memberships" title="'+esc(title)+'" aria-label="'+esc('Playlist: '+title)+'"><span>Playlist'+(count>1?' · '+count:'')+' <span class="stock-playlist-pct">'+s.pct+'%</span></span><span class="stock-playlist-track" role="progressbar" aria-label="Descarga en los players destino" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.pct+'" aria-valuetext="'+esc(label)+'"><span style="width:'+s.pct+'%"></span></span></button>';
  }
  function paint(){document.querySelectorAll('.stock-card[data-id]').forEach(card=>{const box=card.querySelector('.stock-card-media');if(!box)return;const old=box.querySelector('.stock-playlist-badge'),html=badge(card.dataset.id);if(old?.outerHTML===html)return;if(old)old.remove();box.insertAdjacentHTML('beforeend',html);});}
  const visibleIds=()=>[...document.querySelectorAll('.stock-card[data-id]')].filter(card=>card.getClientRects().length&&members(card.dataset.id).length).map(card=>card.dataset.id);
  function schedule(delay=0){clearTimeout(timer);if(document.hidden)return;timer=setTimeout(()=>refresh().catch(()=>{}),delay);}
  async function refresh(){
    if(document.hidden)return;
    if(checking){again=true;return checking;}
    const ids=[...new Set(visibleIds())];if(!ids.length)return;
    const revision=generation;
    checking=(async()=>{
      try{
        const next=new Map();
        for(let start=0;start<ids.length;start+=24){
          const batch=ids.slice(start,start+24),extraTargets={};
          for(const id of batch){const entries=recent.get(id);if(entries?.length)extraTargets[id]=[...new Set(entries.map(x=>x.screen))];}
          let cursor=0;
          do{
            const r=await fetch('/stock-playlist-progress',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:batch,extraTargets,cursor})});
            const d=await r.json();if(!r.ok||!d.ok||!Array.isArray(d.items))throw Error(d.error||'progress_unavailable');
            if(revision!==generation){again=true;return;}
            for(const item of d.items){if(!batch.includes(item.id)||!Number.isInteger(item.total)||item.total<0||!Array.isArray(item.targets))throw Error('invalid_progress');const value=next.get(item.id)||{total:0,targets:[]};value.total=Math.max(value.total,item.total);value.targets.push(...item.targets);next.set(item.id,value);}
            const following=d.nextCursor;if(following!==null&&(!Number.isInteger(following)||following<=cursor))throw Error('invalid_cursor');cursor=following;
          }while(cursor!==null);
        }
        if(revision!==generation){again=true;return;}
        for(const [id,value]of next)downloads.set(id,value);
        progressError='';
      }catch(e){progressError=e.message;}
      finally{checking=null;paint();const rerun=again;again=false;schedule(rerun?0:ids.some(id=>!state(id).complete)?5000:30000);}
    })();return checking;
  }
  function mergeRecent(catalog){
    const allowed=new Set(catalog.rows.map(r=>r.screen));
    for(const [id,entries]of recent){
      const keep=entries.filter(a=>allowed.has(a.screen)&&Date.now()-a.savedAt<600000&&!catalog.assignments.some(x=>x.screen===a.screen&&x.stockIds?.includes(id)));
      if(!keep.length){recent.delete(id);continue;}recent.set(id,keep);
      for(const entry of keep)catalog.assignments.push({...entry,stockIds:[id]});
    }
    return catalog;
  }
  function markAssigned(ids,results,selection){
    const accepted=(results||[]).filter(x=>x.ok&&x.screen);
    if(!accepted.length)return;
    for(const id of ids){
      const entries=recent.get(id)||[];
      for(const result of accepted){
        const row=StockDestinations.rowsFor(data,selection).find(r=>r.screen===result.screen);if(!row)continue;
        const entry={...row,id:'default:'+result.screen,name:result.name||result.screen,stockIds:[id],savedAt:Date.now()};
        const previous=entries.findIndex(x=>x.screen===entry.screen);if(previous>=0)entries[previous]=entry;else entries.push(entry);
        const assignment=data.assignments.find(a=>a.screen===entry.screen&&a.project===entry.project&&a.circuit===entry.circuit&&a.location===entry.location);
        if(assignment){assignment.stockIds=[...new Set([...(assignment.stockIds||[]),id])];assignment.name=entry.name;}else data.assignments.push(entry);
      }
      recent.set(id,entries);downloads.delete(id);
    }
    generation++;paint();schedule();
  }
  async function load(force=false){
    if(pending)return pending;
    if(!force&&Date.now()-at<30000)return data;
    pending=(async()=>{try{const r=await fetch('/stock-playlists',{cache:'no-store',credentials:'same-origin'});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'destinations_unavailable');data=mergeRecent(d);generation++;at=Date.now();error='';paint();schedule();document.dispatchEvent(new CustomEvent('stock:playlists',{detail:data}));return data;}catch(e){error=e.message;throw e;}finally{pending=null;}})();
    return pending;
  }
  window.StockPlaylistData={load,badge,paint,markAssigned,current:()=>data,error:()=>error};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else{paint();schedule();}});
  document.addEventListener('DOMContentLoaded',()=>{
    load().catch(()=>{});const grid=document.getElementById('stockGrid');if(grid)new MutationObserver(()=>{paint();schedule();}).observe(grid,{childList:true});
    setInterval(()=>{if(!document.hidden)load(true).catch(()=>{});},60000);
  });
})();

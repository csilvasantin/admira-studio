(function(root){
  'use strict';
  const defs={portrait:{key:'portrait',icon:'↕',label:'Vertical'},landscape:{key:'landscape',icon:'↔',label:'Horizontal'},square:{key:'square',icon:'□',label:'Cuadrado'},anamorphic:{key:'anamorphic',icon:'◈',label:'Anamórfico'},unknown:{key:'unknown',icon:'◇',label:'Sin formato confirmado'}};
  const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const aliases={vertical:'portrait',portrait:'portrait',horizontal:'landscape',landscape:'landscape',square:'square',cuadrado:'square',anamorfico:'anamorphic',anamorphic:'anamorphic'};
  const visual=it=>['video','image','animation','interactive','digital-twin'].includes(it?.type);
  function dimensions(it){
    for(const [w,h]of [[it?.ancho,it?.alto],[it?.width,it?.height],[it?.dimensions?.width,it?.dimensions?.height],[it?.validacion?.ancho,it?.validacion?.alto],[it?._mediaWidth,it?._mediaHeight]])if(Number(w)>0&&Number(h)>0)return {width:Number(w),height:Number(h)};
    return null;
  }
  function format(it){
    if(root.StockSync?.get(it))return {key:'sync-creative',icon:'▦',label:'Multipantalla'};
    if(!visual(it))return null;
    const tags=(it.tags||[]).map(clean),explicit=[it.presentationFormat,it.displayFormat,...tags.filter(t=>/^(?:formato|format):/.test(t)).map(t=>t.slice(t.indexOf(':')+1))].map(clean).find(Boolean);
    if(explicit&&!['video','image','audio'].includes(explicit)){const key=aliases[explicit]||'custom:'+explicit.slice(0,60);return defs[key]||{key,icon:'◈',label:explicit.slice(0,60)};}
    // Anamorphic is an authored projection format, never inferred from a wide aspect ratio.
    if(tags.some(t=>aliases[t]==='anamorphic'))return defs.anamorphic;
    const d=dimensions(it);let ratio=d?d.width/d.height:0;
    if(!ratio&&typeof it.aspectRatio==='string'){const [w,h]=it.aspectRatio.split(':').map(Number);if(w>0&&h>0)ratio=w/h;}
    if(ratio)return ratio<.99?defs.portrait:ratio>1.01?defs.landscape:defs.square;
    const labelled=aliases[clean(it.orientacion)]||tags.map(t=>aliases[t]).find(Boolean);if(labelled)return defs[labelled];
    if(/(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)/i.test(String(it.prompt||'')))return defs.portrait;
    return defs.unknown;
  }
  // Clave de formato que declara una etiqueta de texto (#vertical, #portrait, #cuadrado, formato:videowall…) o ''.
  // Sirve para no repetir como etiqueta lo que ya muestra la insignia de formato de la tarjeta.
  function tagFormat(tag){const c=clean(String(tag||'').replace(/^#+/,'')),m=/^(?:formato|format):(.*)$/.exec(c),v=m?m[1].trim():c;return aliases[v]||(m&&v&&!['video','image','audio'].includes(v)?'custom:'+v.slice(0,60):'');}
  function language(it){const tag=(it.tags||[]).find(t=>/^content-language:/i.test(t));return tag?clean(tag.split(':')[1]):'';}
  function family(it,byId,seen=new Set()){
    if(!it?.id||seen.has(it.id))return 'asset:'+it?.id;
    seen.add(it.id);if(it.motor!=='adaptador')return 'asset:'+it.id+'|lang:'+language(it);
    // Authored campaign identity is stronger than a shared source asset: revisions are distinct.
    let meta;try{meta=JSON.parse(it.comment||'');}catch{}
    if(meta?.schema==='admira.campaign-style-provenance.v1'&&typeof meta.campaign==='string'&&meta.campaign&&Number.isInteger(meta.revision))return 'campaign:'+meta.campaign.slice(0,160)+':r'+meta.revision+':'+String(meta.contentLanguage||language(it));
    const ref=String(it.externalRef||''),original=byId.get(ref);if(original&&visual(original)){const base=family(original,byId,seen);return language(it)?base.replace(/\|lang:[^|]*$/,'')+'|lang:'+language(it):base;}
    if(/^creator-[a-z0-9-]+$/i.test(ref))return 'campaign:'+ref+':'+language(it);
    const source=ref.match(/^pixeria:[^:]+:stock-([^:]+):/);if(source&&byId.has(source[1]))return family(byId.get(source[1]),byId,seen).replace(/\|lang:[^|]*$/,'')+'|lang:'+language(it);
    return 'asset:'+it.id;
  }
  function index(items){
    const byId=new Map(items.map(it=>[String(it.id),it])),groups=new Map(),keys=new Map(),membership=root.StockSync?.membership(items)||new Map();
    for(const it of items){let key=root.StockSync?.get(it)?'sync:'+it.id:membership.has(it.id)?'sync:'+membership.get(it.id):family(it,byId);key=key.replace(/(?:\|lang:)+$/,''); // Unlabelled original and its direct adaptations share a family.
      keys.set(it.id,key);const list=groups.get(key)||[];list.push(it);groups.set(key,list);}
    return {byId,groups,keys,versions:it=>visual(it)?(groups.get(keys.get(it.id))||[it]).filter(x=>visual(x)&&x.type===it.type):[it]};
  }
  function representatives(items,idx,chosen=new Map()){
    const groups=new Map();for(const it of items){const family=idx.keys.get(it.id),key=family?.startsWith('sync:')?family:family+'|type:'+it.type;const list=groups.get(key)||[];list.push(it);groups.set(key,list);}
    return [...groups.values()].map(list=>(idx.keys.get(list[0].id)?.startsWith('sync:')?idx.byId.get(idx.keys.get(list[0].id).slice(5)):null)||list.find(x=>x.id===chosen.get(idx.keys.get(x.id)))||list.find(x=>'asset:'+x.id===idx.keys.get(x.id)?.replace(/\|lang:.*$/,''))||list[0]);
  }
  function options(items){const found=new Map();for(const it of items){const f=format(it);if(f)found.set(f.key,f);}const order=['landscape','portrait','square','anamorphic','unknown'];return [...found.values()].sort((a,b)=>{const ai=order.indexOf(a.key),bi=order.indexOf(b.key);return (ai<0?4:ai)-(bi<0?4:bi)||a.label.localeCompare(b.label,'es');});}
  const api={format,tagFormat,dimensions,index,representatives,options,visual};root.StockFormats=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

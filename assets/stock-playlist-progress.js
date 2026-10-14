(function(root){
  'use strict';
  // /screen/cache caduca a los 10 min y, sin cambios, se guarda cada 7 min.
  const MAX_AGE=600000;
  const fresh=(at,now=Date.now())=>Number(at)>0&&now-Number(at)<=MAX_AGE&&Number(at)-now<=60000;
  function target(cache,id,screen,now=Date.now()){
    const at=Number(cache?.at)||0,key='default:'+id;
    if(!cache||!fresh(at,now))return {screen,state:'unknown',pct:0,at};
    const downloading=(cache.downloading||[]).find(x=>x.id===key);
    if(downloading)return {screen,state:'downloading',pct:Math.max(0,Math.min(99,Math.floor(Number(downloading.pct)||0))),at};
    if((cache.ready||[]).includes(key))return {screen,state:'ready',pct:100,at};
    return {screen,state:'waiting',pct:0,at};
  }
  function summarize(targets,total,now=Date.now()){
    const unique=[...new Map((targets||[]).map(t=>[t.screen,t])).values()].slice(0,total);
    let ready=0,sum=0;for(const t of unique){if(!fresh(t.at,now))continue;if(t.state==='ready'){ready++;sum+=100;}else sum+=Math.max(0,Math.min(99,Number(t.pct)||0));}
    const complete=total>0&&unique.length===total&&ready===total;
    return {total,ready,complete,pct:complete?100:Math.min(99,total?Math.floor(sum/total):0)};
  }
  const api={MAX_AGE,fresh,target,summarize};root.StockPlaylistProgress=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

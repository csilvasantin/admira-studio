(function(root){
  'use strict';
  function measure(available,matching){
    const catalog=[...new Map((available||[]).filter(i=>i?.id).map(i=>[i.id,i])).values()];
    const ids=new Set(catalog.map(i=>i.id)),results=[...new Map((matching||[]).filter(i=>ids.has(i?.id)).map(i=>[i.id,i])).values()];
    const index=root.StockFormats.index(catalog);
    return {found:root.StockFormats.representatives(results,index).length,total:root.StockFormats.representatives(catalog,index).length,foundVersions:results.length,totalVersions:catalog.length};
  }
  function label(count,en=false){return count.found+(en?' of ':' de ')+count.total+(en?' contents':' contenidos');}
  const api={measure,label};root.StockCounts=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

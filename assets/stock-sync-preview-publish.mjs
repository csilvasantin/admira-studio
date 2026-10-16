import './stock-sync-core.js';
import {createEngine} from '../adaptaciones/adapter-export.js';
import {publishAdaptation} from '../adaptaciones/stock-publish.mjs';
import {previewJob,previewIdentity} from './stock-sync-preview-job.mjs';

// Uses the Adaptador encoder and ordinary authenticated Stock publication.
// No proxy replaces a delivery output, campaign revision or playlist item.
export async function prepareCreativePreviews(creative,{onProgress=()=>{},fetch:f=fetch,engine=createEngine(),publish=publishAdaptation,wait=ms=>new Promise(r=>setTimeout(r,ms)),signal}={}){
 const original=globalThis.StockSync.validate(creative);
 let updated=original;
 const alive=()=>{if(signal?.aborted)throw Error('cancelled');},cancel=()=>engine.cancel();
 signal?.addEventListener('abort',cancel,{once:true});
 try{
  alive();
  const fresh=await f('/stock-creatives',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()),latest=fresh.creatives?.find(c=>c.id===original.id);
  if(!latest||latest.revision!==original.revision||original.adaptations.some(a=>{const current=latest.adaptations.find(x=>x.id===a.id);return !current||previewIdentity(current)!==previewIdentity(a);}))throw Error('preview-campaign-changed');
  updated=globalThis.StockSync.validate(latest);
  const targets=updated.adaptations.filter(a=>a.screens.length>1&&!a.preview);
  for(const [n,a]of targets.entries()){
   const job=previewJob(a);let movie;
   onProgress({adaptation:a.id,index:n,total:targets.length,phase:'loading',progress:0});
   await engine.encode(job.sourceURL,job,e=>onProgress({...e,adaptation:a.id,index:n,total:targets.length}),(output,blob)=>{movie=blob;});
   alive();if(!movie)throw Error('preview-encoding-failed');
   onProgress({adaptation:a.id,index:n,total:targets.length,phase:'publishing',progress:1});
   const result=await publish(movie,{title:original.title+' · previo conjunto · '+a.id,originId:original.id+':r'+original.revision,client:original.client,format:'sync-preview',width:job.width,height:job.height,duration:a.seconds},{tags:[original.client.id,'previo-sincronizado','campaign:'+original.id],externalRef:'sync-preview:'+original.id+':r'+original.revision+':'+a.id,comment:JSON.stringify({schema:'admira.sync-preview.v1',creative:original.id,revision:original.revision,adaptation:a.id,sourceStockIds:a.screens.map(s=>s.stockId),width:job.width,height:job.height,fps:a.fps,seconds:a.seconds})},{fetch:f});
   alive();if(!result.ok)throw Error(result.error||'preview-publish-failed');
   const preview={stockId:result.id,url:'https://stock.admira.store/stock/'+encodeURIComponent(result.id)+'/asset.mp4'};
   let saved=false;
   for(let attempt=0;attempt<8&&!saved;attempt++){
    alive();
    const prior=await f('/stock-creatives',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()),current=prior.creatives?.find(c=>c.id===original.id),currentA=current?.adaptations.find(x=>x.id===a.id);
    if(!current||current.revision!==original.revision||!currentA||previewIdentity(currentA)!==previewIdentity(a))throw Error('preview-campaign-changed');
    updated=globalThis.StockSync.validate(current);updated.adaptations.find(x=>x.id===a.id).preview=preview;
    const r=await f('/stock-creatives',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({creative:updated,rev:current.registryRevision})}),d=await r.json();
    if(r.ok&&d.ok){updated={...updated,registryRevision:d.creative?.registryRevision||d.rev};saved=true;}
    else if(['stock_members_not_ready','revision_conflict'].includes(d.error))await wait(1500);
    else throw Error(d.error||'preview-register-failed');
   }
   if(!saved)throw Error('preview-stock-index-pending');
  }
  onProgress({phase:'done',progress:1,total:targets.length});return updated;
 }finally{signal?.removeEventListener('abort',cancel);engine.cancel();}
}

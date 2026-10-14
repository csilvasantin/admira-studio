import '../assets/stock-sync-core.js';
import {publishAdaptation} from './stock-publish.mjs?v=sync-creative-1';
const S=globalThis.StockSync;
const nativeUrl=id=>'https://stock.admira.store/stock/'+encodeURIComponent(id)+'/asset.mp4';
export async function publishCampaignCreative({campaign,items,poster,fetch:f=fetch}){
 if(!Array.isArray(items)||!items.length)throw Error('creative-empty');
 if(!campaign.client?.id)throw Error('creative-client-required');
 const adaptations=[];
 for(const item of items){
  const snap=item.campaign.contract.campaign,i=snap.installations.find(i=>i.id===item.campaign.installation),s=i.screens.find(s=>s.id===item.campaign.screen),language=snap.wallStory?'mixed':item.campaign.contentLanguage||'es',id=i.id+'-'+language;
  let a=adaptations.find(a=>a.id===id);if(!a){a={id,name:(i.name.es||i.name)+' · '+language.toUpperCase(),width:i.width,height:i.height,seconds:item.campaign.seconds,fps:25,screens:[],expectedScreens:i.screens.length};adaptations.push(a);}
  const file=item.files[0];if(!file?.stock?.id)throw Error('creative-output-not-published');
  a.screens.push({...s,stockId:file.stock.id,url:nativeUrl(file.stock.id),languages:item.campaign.screenContentLanguages||[language],seconds:a.seconds,fps:25});
 }
 if(adaptations.some(a=>!a.screens.length||a.screens.length!==a.expectedScreens))throw Error('creative-empty');
 const title=campaign.name,root=await publishAdaptation(poster,{type:'image',title,client:campaign.client,format:'sync-creative',width:poster.width||1280,height:poster.height||720},{tags:[campaign.client.id,'creatividad-sincronizada','campaign:'+campaign.id],externalRef:'sync-creative:'+campaign.id+':r'+campaign.revision,comment:JSON.stringify({schema:'admira.sync-creative-card.v1',campaign:campaign.id,revision:campaign.revision})},{fetch:f});
 if(!root.ok)throw Error(root.error||'creative-poster-failed');
 const creative=S.validate({schema:S.SCHEMA,id:campaign.id+'-'+campaign.direction,stockId:root.id,title,client:{id:campaign.client.id,name:campaign.client.name||campaign.client.nombre||campaign.client.id},revision:campaign.revision,defaultAdaptation:adaptations.find(a=>a.screens.length>1)?.id||adaptations[0].id,adaptations});
 const prior=await f('/stock-creatives',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json());const previous=prior.creatives?.find(c=>c.id===creative.id);
 // Stock's public index may take a few seconds to include a just-uploaded file.
 for(let attempt=0;attempt<8;attempt++){const r=await f('/stock-creatives',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({creative,rev:previous?.registryRevision})}),d=await r.json();if(r.ok&&d.ok)return d;if(d.error!=='stock_members_not_ready')throw Error(d.error||'creative-register-failed');await new Promise(resolve=>setTimeout(resolve,1500));}
 throw Error('creative-stock-index-pending');
}

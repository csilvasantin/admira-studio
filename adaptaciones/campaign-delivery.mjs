import {campaignContract,restoreCampaign} from './campaign-core.mjs?v=eink-cartela-1';
import {campaignVariants,contentLanguage} from './campaign-language.mjs?v=starbucks-story-1';
import {deliveryInstallations} from './content-request-core.mjs?v=eink-cartela-1';

// Keep identifiers lossless: sanitising two different IDs must never merge folders.
const segment=value=>encodeURIComponent(String(value)).replace(/\./g,'%2E');
export const deliveryKey=(language,installation,screen)=>JSON.stringify([language,installation,screen]);
export const deliveryMedia=(campaign,installation)=>campaign.visualStyle==='eink-poster'||installation.mediaType==='image'?'png':'mp4';
const signature=campaign=>JSON.stringify(restoreCampaign(campaign));

export function deliveryPlan(value,format='native'){
 if(!['native','png','mp4'].includes(format))throw Error('delivery-format');
 const c=restoreCampaign(value),rows=[];
 for(const variant of campaignVariants(c)){
  const language=contentLanguage(variant),contract=campaignContract(variant),source=signature(variant);
  const installations=format==='native'?variant.installations.filter(i=>i.enabled!==false):deliveryInstallations(variant,format);
  for(const installation of installations)for(const screen of installation.screens){
   const derived=contract.derived.find(d=>d.installation===installation.id&&d.screen===screen.id),kind=format==='native'?deliveryMedia(variant,installation):format;
   if(kind==='mp4'&&variant.visualStyle==='eink-poster')throw Error('eink-image-only');
   const languages=derived.contentLanguages,folder=languages.join('-');
   rows.push({key:deliveryKey(language,installation.id,screen.id),language,languages,installation:installation.id,screen:screen.id,
    kind,width:derived.width,height:derived.height,seconds:kind==='mp4'?(installation.phase==='unit'?variant.unitSeconds||8:variant.seconds):null,
    fps:kind==='mp4'?25:null,source,path:`${segment(installation.id)}/${segment(screen.id)}/${segment(folder)}/${segment(c.id)}-r${c.revision}.${kind}`});
  }
 }
 if(new Set(rows.map(r=>r.path)).size!==rows.length)throw Error('delivery-duplicate-path');
 return {campaignId:c.id,name:c.name,revision:c.revision,direction:c.direction,format,rows};
}

export function deliveryItemKey(item){const m=item?.campaign;return m?deliveryKey(m.contentLanguage,m.installation,m.screen):null;}
export function deliveryItemMatches(row,item){
 const m=item?.campaign;
 return !!m&&row.key===deliveryItemKey(item)&&m.contract?.campaign&&signature(m.contract.campaign)===row.source;
}
export function inspectDelivery(plan,items){
 const rows=plan.rows.map(row=>{
  const candidates=items.filter(item=>deliveryItemMatches(row,item));
  if(candidates.length>1)return {...row,state:'duplicate',file:null};
  const item=candidates[0];if(!item)return {...row,state:'missing',file:null};
  if(item.state!=='done')return {...row,state:item.state||'missing',file:null};
  const file=item.files?.[0],output=file?.output;
  const valid=item.files?.length===1&&file.blob?.size>0&&output?.W===row.width&&output?.H===row.height&&
   String(file.filename||'').toLowerCase().endsWith('.'+row.kind)&&
   (row.kind!=='mp4'||item.campaign.seconds===row.seconds);
  return {...row,state:valid?'done':'invalid',file:valid?file:null};
 });
 return {rows,complete:rows.length>0&&rows.every(r=>r.state==='done'),done:rows.filter(r=>r.state==='done').length,total:rows.length};
}

export async function deliveryEntries(plan,items,contract){
 const status=inspectDelivery(plan,items);
 if(!status.complete)throw Error('delivery-incomplete');
 if(contract.campaign.id!==plan.campaignId||contract.campaign.revision!==plan.revision||contract.campaign.direction!==plan.direction)throw Error('delivery-contract-mismatch');
 const contractPlan=deliveryPlan(contract.campaign,plan.format);
 if(JSON.stringify(contractPlan.rows.map(({source,...row})=>row))!==JSON.stringify(plan.rows.map(({source,...row})=>row)))throw Error('delivery-contract-mismatch');
 for(const row of plan.rows){
  const review=contract.approvals?.[`${row.installation}:${plan.direction}:${row.language}:r${plan.revision}`];
  if(review?.revision!==plan.revision||review?.direction!==plan.direction||!review.reviewedAt)throw Error('delivery-unapproved');
 }
 const entries={},files=[];
 for(const row of status.rows){
  const bytes=new Uint8Array(await row.file.blob.arrayBuffer());
  if(bytes.length!==row.file.blob.size)throw Error('delivery-unreadable');
  entries[row.path]=bytes;
  files.push({path:row.path,installation:row.installation,screen:row.screen,contentLanguages:row.languages,
   mediaType:row.kind==='png'?'image':'video',width:row.width,height:row.height,seconds:row.seconds,fps:row.fps,bytes:bytes.length});
 }
 const manifest={schema:'admira.campaign-delivery.v1',campaignId:plan.campaignId,name:plan.name,revision:plan.revision,direction:plan.direction,
  complete:true,expectedFiles:plan.rows.length,includedFiles:files.length,missingFiles:[],hardwareVerified:false,files};
 const text=value=>new TextEncoder().encode(value);
 entries['campaign.json']=text(JSON.stringify(contract,null,2));
 entries['delivery.json']=text(JSON.stringify(manifest,null,2));
 entries['LEEME-README.txt']=text(`ENTREGA / DELIVERY\n${plan.name} · r${plan.revision}\n\n${files.length}/${plan.rows.length} archivos completos / complete files.\nCarpetas / folders: instalación / pantalla / idioma(s).\n\ncampaign.json: campaña editable, originales y revisiones / editable campaign, originals and reviews.\ndelivery.json: archivos, resolución nativa, duración e idiomas / files, native resolution, duration and languages.\n\nLos MP4 de un mismo montaje comparten duración y 25 fps. Reproducirlos con inicio sincronizado.\nMP4s in one layout share duration and 25 fps. Start them in sync.\nConfirmar medidas, orientación y sincronización de players antes de instalar.\nConfirm actual dimensions, orientation and player synchronisation before installation.\n`);
 return {entries,manifest};
}

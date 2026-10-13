import {HANDOFF_KEY,MAX_CONTRACT_BYTES,adaptCreatorContract,reviewedCreatorOutput} from './creator-adapter-core.mjs';
import {drawCampaign} from './campaign-render.mjs';
export function mountCreatorAdapter({t,queue}){
 if(/(?:^|\/)creador(?:\/|$)/.test(location.pathname))return;
 const section=document.createElement('section');section.className='creator-adapter card';section.id='creator-adapter';
 section.innerHTML=`<h2>${t('Creador → Adaptador · GOOD','Creator → Adapter · GOOD')}</h2><p>${t('Abre la campaña editable aprobada de Creador para cambiar su formato conservando todos los textos, la marca y el producto.','Open an approved editable Creator campaign to change format while preserving every word, the brand and the product.')}</p><label class="pill">${t('Abrir campaña de Creador · JSON','Open Creator campaign · JSON')}<input id="creator-adapter-file" type="file" accept="application/json,.json"></label><div id="creator-adapter-editor" hidden><label>${t('Formato de salida','Output format')}<select id="creator-adapter-target"><option value="portrait">${t('Vertical','Portrait')} · 1080×1920</option><option value="landscape">${t('Horizontal','Landscape')} · 1920×1080</option></select></label><p><strong>GOOD</strong> · ${t('Recomposición local de capas · sin generación IA','Local layer recomposition · no AI generation')}</p><canvas id="creator-adapter-canvas" role="img"></canvas><p id="creator-adapter-copy"></p><label><input id="creator-adapter-review" type="checkbox">${t('He revisado que texto, marca y producto están completos','I reviewed the complete copy, brand and product')}</label><div class="next-actions"><button id="creator-adapter-png" class="pill" type="button" disabled>${t('Descargar PNG','Download PNG')}</button><button id="creator-adapter-mp4" class="pill" type="button" disabled>${t('Preparar MP4 GOOD','Prepare GOOD MP4')}</button><button id="creator-adapter-json" class="pill" type="button" disabled>${t('Guardar adaptación y contrato','Save adaptation and contract')}</button></div></div><p id="creator-adapter-status" role="status" aria-live="polite"></p>`;
 document.querySelector('#paso-1').append(section);
 const $=id=>section.querySelector('#'+id),language=document.documentElement.lang==='en'?'en':'es';let raw,adaptation,output,assets,turn=0,ready=false;
 const urls=[];
 function buttons(){for(const id of ['png','mp4','json'])$('creator-adapter-'+id).disabled=!ready||!$('creator-adapter-review').checked;}
 const measureCanvas=document.createElement('canvas'),measure=(text,size)=>{const x=measureCanvas.getContext('2d');x.font=`900 ${size}px 'Campaign Sans',sans-serif`;return x.measureText(text).width;};
 const loadImage=async url=>{const i=new Image();i.src=url;await i.decode();if(i.naturalWidth*i.naturalHeight>16777216)throw Error('creator-asset-size');return i;};
 function say(message){$('creator-adapter-status').textContent=message;}
 function redraw(){
  ready=false;buttons();$('creator-adapter-review').checked=false;
  try{
   adaptation=adaptCreatorContract(raw,$('creator-adapter-target').value,language);output=reviewedCreatorOutput(adaptation,measure);
   const {campaign,installation}=adaptation,cv=$('creator-adapter-canvas');cv.width=Math.min(960,installation.width);drawCampaign(cv,campaign,installation,output.plan,assets);
   cv.setAttribute('aria-label',campaign.name+' · GOOD · '+installation.width+'×'+installation.height);
   $('creator-adapter-copy').textContent=campaign.headline+' · '+campaign.cta;
   ready=true;buttons();say(t('GOOD listo para revisar. Copia completa y producto conservados; no se ha publicado ni programado.','GOOD ready for review. Complete copy and product preserved; nothing has been published or scheduled.'));
  }catch(e){say(t('No se puede recomponer esta campaña: ','Cannot recompose this campaign: ')+e.message);}
 }
 async function open(value){
  const mine=++turn;ready=false;buttons();$('creator-adapter-editor').hidden=true;
  // Validation precedes any decoding; imported contracts cannot fetch external URLs.
  const first=value.campaign?.installations?.find(i=>i.enabled!==false);const target=first?.width>first?.height?'portrait':'landscape';
  const valid=adaptCreatorContract(value,target,language);
  say(t('Cargando capas de Creador…','Loading Creator layers…'));
  const [product,logo]=await Promise.all([loadImage(valid.campaign.product),loadImage(valid.campaign.logo),document.fonts.load('900 80px "Campaign Sans"')]);
  if(mine!==turn)return;raw=value;assets={product,logo};$('creator-adapter-target').value=target;$('creator-adapter-editor').hidden=false;redraw();
 }
 $('creator-adapter-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>MAX_CONTRACT_BYTES)throw Error('creator-contract-too-large');await open(JSON.parse(await file.text()));}catch(e){++turn;ready=false;buttons();$('creator-adapter-editor').hidden=true;say(t('No se abrió la campaña. Conserva el original y revisa el JSON: ','Campaign was not opened. Keep the original and check the JSON: ')+e.message);}event.target.value='';};
 $('creator-adapter-target').onchange=()=>{if(raw&&assets)redraw();};$('creator-adapter-review').onchange=()=>{if(ready){const c=adaptation.campaign,i=adaptation.installation;output.contract.approvals=$('creator-adapter-review').checked?{[`${i.id}:${c.direction}:r${c.revision}`]:{revision:c.revision,direction:c.direction,reviewedAt:new Date().toISOString()}}:{};}buttons();};
 function master(){if(!ready||!$('creator-adapter-review').checked)throw Error('review-required');const cv=document.createElement('canvas');cv.width=adaptation.installation.width;return drawCampaign(cv,adaptation.campaign,adaptation.installation,output.plan,assets);}
 const png=cv=>new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(Error('canvas-export')),'image/png'));
 function download(blob,name){const url=URL.createObjectURL(blob);urls.push(url);const a=document.createElement('a');a.href=url;a.download=name;a.click();}
 $('creator-adapter-png').onclick=async()=>{try{const cv=master(),blob=await png(cv);cv.width=cv.height=0;download(blob,adaptation.campaign.id+'-'+language+'-'+adaptation.installation.width+'x'+adaptation.installation.height+'.png');}catch(e){say(e.message);}};
 $('creator-adapter-json').onclick=()=>{if(!ready||!$('creator-adapter-review').checked)return;download(new Blob([JSON.stringify(output.contract,null,2)],{type:'application/json'}),adaptation.campaign.id+'-'+language+'.json');};
 $('creator-adapter-mp4').onclick=async()=>{try{const cv=master(),blob=await png(cv);cv.width=cv.height=0;const sourceURL=URL.createObjectURL(blob);urls.push(sourceURL);queue.add({label:adaptation.campaign.name+' · GOOD · '+adaptation.installation.width+'×'+adaptation.installation.height,sub:t('Capas completas · sin recorte','Complete layers · no crop'),sourceURL,job:output.job,quality:'good',adaptation:adaptation.provenance});say(t('MP4 GOOD en Exportaciones. Descárgalo cuando termine.','GOOD MP4 queued in Exports. Download it when complete.'));}catch(e){say(e.message);}};
 if(new URLSearchParams(location.search).get('creatorCampaign')==='1'){
  try{const text=sessionStorage.getItem(HANDOFF_KEY);if(!text||text.length>MAX_CONTRACT_BYTES)throw Error('creator-handoff-missing');void open(JSON.parse(text)).catch(e=>say(e.message));}catch(e){say(t('Abre el JSON descargado de Creador: ','Open the JSON downloaded from Creator: ')+e.message);}
 }
 window.addEventListener('pagehide',()=>{++turn;for(const url of urls)URL.revokeObjectURL(url);},{once:true});
 return {section};
}

import '../extensions/admira-studio-importer/media-link.js';
import {downloadWithFailover,relayNodes} from './import-failover.mjs';
import {stockSource} from '../adaptaciones/stock-publish.mjs';
import {readMediaDimensions} from './content-orientation.mjs';
import {posterFromVideo} from './poster-frame.mjs';

const $=id=>document.getElementById(id);
const form=$('link-form'), progress=$('progress'), params=new URLSearchParams(location.search);
const supplied=globalThis.AdmiraMediaLink.publicURL(params.get('importUrl'));
$('source').value=supplied;
$('notes').value=(params.get('importComment') || '').slice(0,500);
$('tags').value=(params.get('importTags') || '').slice(0,400);
history.replaceState(null,'',location.pathname);

const priority=$('priority'), assign=$('assign'), destination=$('destination');
const targeted=params.get('importDelivery')==='1';
priority.value=targeted && ['0','1','2'].includes(params.get('importPriority')) ? params.get('importPriority') : '2';
assign.checked=targeted;
let catalog=null,loading=false,pending=null;
function wantsScreen(){return priority.value!=='2'||assign.checked;}
async function showDestination(){
  const show=wantsScreen();
  $('assign-row').hidden=priority.value!=='2';$('destination-row').hidden=!show;destination.required=show;
  $('submit').textContent=priority.value==='0'?'Importar y activar emergencia':priority.value==='1'?'Importar y emitir primero':show?'Importar y añadir al final':'Importar en Stock';
  if(!show||catalog||loading)return;
  loading=true;destination.replaceChildren(new Option('Cargando pantallas…',''));
  try {
    const r=await fetch('/stock-playlists',{credentials:'same-origin',cache:'no-store'}),data=await r.json();
    if(!r.ok||!data.ok)throw Error();
    const project=params.get('deliveryProject');
    catalog=(data.rows||[]).filter(row=>!project||row.project===project);
    destination.replaceChildren(new Option(catalog.length?'Selecciona una pantalla':'Sin pantallas disponibles',''),
      ...catalog.map((row,index)=>new Option([row.projectName,row.locationName,row.deviceName||row.screen].filter(Boolean).join(' · '),String(index))));
  }catch{destination.replaceChildren(new Option('Pantallas no disponibles',''));progress.textContent='No se pudo cargar el destino. Vuelve a seleccionarlo para reintentar.';}
  finally{loading=false;}
}
priority.onchange=assign.onchange=showDestination;
destination.onfocus=()=>{if(!catalog)showDestination();};
showDestination();
function delivered(job){
  progress.textContent='Guardado en Stock. '+['Emergencia activa en ','Emisión prioritaria enviada a ','Añadido al final de la playlist de '][job.priority]+job.selection.device+'.';
  pending=null;$('retry-delivery').hidden=true;
}
async function deliver(){
  const job=pending;if(!job)return;
  $('retry-delivery').disabled=true;
  try {
    const r=await fetch('/stock-playlists',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(job)});
    const d=await r.json();
    if(!r.ok||!d.ok||d.event!==job.event)throw Error(d.error||'distribución no confirmada');
    delivered(job);
  }catch(e){progress.textContent='Guardado en Stock. Envío a la pantalla pendiente ('+e.message+').';$('retry-delivery').hidden=false;}
  finally{$('retry-delivery').disabled=false;}
}
$('retry-delivery').onclick=deliver;
async function download(url) {
  if (globalThis.AdmiraMediaLink.usesDownloader(url)) {
    try {
      return await downloadWithFailover({url,format:params.get('importFormat')==='audio'?'audio':'video',nodes:relayNodes(),maxBytes:300*1024*1024,
        onProgress:s=>{progress.textContent=s.bytes?'Descargando · '+(s.bytes/1048576).toFixed(1)+' MB':'Buscando el vídeo original…';}});
    } catch(e){if(params.get('importFormat')==='audio')throw Error('No se pudo descargar el audio solicitado.');if(e.status===401)throw Error('Inicia sesión en Admira Studio y vuelve a intentarlo.');}
  }
  progress.textContent='Buscando el contenido multimedia en la página de origen…';
  const r=await fetch('/stock-link-media?url='+encodeURIComponent(url),{method:'POST',credentials:'same-origin'});
  if (!r.ok) throw Error((await r.json().catch(()=>({}))).error || 'El origen no respondió.');
  return {blob:await r.blob(),title:''};
}
let busy=false;
form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(pending){progress.textContent='El archivo ya está en Stock. Usa «Reintentar el envío a la playlist».';return;}
  const url=globalThis.AdmiraMediaLink.publicURL($('source').value);
  if (!url || busy) {if(!url)progress.textContent='Introduce una URL pública HTTP o HTTPS.';return;}
  const tags=[...new Set($('tags').value.split(/[,;\n]/).flatMap(t=>t.split('#')).map(t=>t.trim()).filter(Boolean))];
  if(tags.length>10){progress.textContent='El máximo es de 10 etiquetas.';return;}
  const row=wantsScreen() && destination.value!=='' && catalog?.[Number(destination.value)];
  if(wantsScreen()&&!row){progress.textContent='Selecciona la pantalla de destino.';return;}
  const selection=row?{project:row.project,circuit:row.circuit,location:row.location,device:row.screen}:null;
  const level=Number(priority.value);
  const delivery=selection?{selection,priority:level,event:crypto.randomUUID()}:null;
  busy=true;const controls=[...form.elements];controls.forEach(el=>el.disabled=true);
  const result=$('stock-result');result.hidden=true;progress.textContent='Preparando la importación…';
  try {
    const {blob,title,description}=await download(url);
    const mime=blob.type.split(';')[0],type=mime.split('/')[0];
    if (!blob.size || !['image','video','audio'].includes(type)) throw Error('El enlace no devolvió un archivo multimedia válido.');
    let dimensions=null, poster=null;
    if(type!=='audio') try {dimensions=await readMediaDimensions(blob,type);}catch{}
    if(type==='video') {
      const preview=URL.createObjectURL(blob);
      try {poster=await posterFromVideo(preview);}catch{}finally{URL.revokeObjectURL(preview);}
    }
    progress.textContent='Guardando en Stock…';
    const source=await stockSource(blob,{type,mime,motor:'yt-dlp',onProgress:(n,total)=>{progress.textContent='Guardando en Stock · '+Math.floor(100*n/total)+' %';}});
    if(!source.ok)throw Error(source.error || 'Error al subir el archivo.');
    const payload={type,mime,motor:'yt-dlp',prompt:url,title:title || (supplied===url && params.get('importTitle')) || new URL(url).pathname.split('/').filter(Boolean).pop() || new URL(url).hostname,
      comment:$('notes').value,tags,...(delivery?{delivery}:{}),searchContext:{version:1,description:description||''},dimensions,...(poster?{poster}:{}),...source.fields};
    const r=await fetch('/stock-publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok || !data.ok || !data.id)throw Error(data.error || 'No se ha confirmado la publicación en Stock.');
    result.href='/stock.html?type='+encodeURIComponent(type)+'&highlight='+encodeURIComponent(data.id);result.hidden=false;
    if(params.get('importCustomFormat') && params.get('importProject')){
      const target=new URL(result.href);target.searchParams.set('adapterProject',params.get('importProject'));target.searchParams.set('adapterFormat',params.get('importCustomFormat'));result.href=target.href;
    }
    if(selection){
      const job={...delivery,stockIds:[data.id]};
      if(data.delivery?.ok && data.delivery.event===job.event)delivered(job);
      else {pending=job;$('retry-delivery').hidden=false;progress.textContent='Guardado en Stock. Envío pendiente · '+(data.delivery?.error||'sin confirmación del player');}
      return;
    }
    progress.textContent=data.reused?'Este contenido ya estaba en Stock.':'Guardado en Stock.';
  } catch(error){progress.textContent='Importación sin completar. '+error.message;}
  finally{busy=false;controls.forEach(el=>el.disabled=false);}
});
if(supplied && !wantsScreen() && params.get('importAutostart')==='1')form.requestSubmit();

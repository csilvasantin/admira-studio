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

async function download(url) {
  if (globalThis.AdmiraMediaLink.usesDownloader(url)) {
    try {
      return await downloadWithFailover({url,format:'video',nodes:relayNodes(),maxBytes:300*1024*1024,
        onProgress:s=>{progress.textContent=s.bytes?'Descargando · '+(s.bytes/1048576).toFixed(1)+' MB':'Buscando el vídeo original…';}});
    } catch(e){if(e.status===401)throw Error('Inicia sesión en Admira Studio y vuelve a intentarlo.');}
  }
  progress.textContent='Buscando el contenido multimedia en la página de origen…';
  const r=await fetch('/stock-link-media?url='+encodeURIComponent(url),{method:'POST',credentials:'same-origin'});
  if (!r.ok) throw Error((await r.json().catch(()=>({}))).error || 'El origen no respondió.');
  return {blob:await r.blob(),title:''};
}
let busy=false;
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const url=globalThis.AdmiraMediaLink.publicURL($('source').value);
  if (!url || busy) {if(!url)progress.textContent='Introduce una URL pública HTTP o HTTPS.';return;}
  const tags=[...new Set($('tags').value.split(/[,;\n]/).flatMap(t=>t.split('#')).map(t=>t.trim()).filter(Boolean))];
  if(tags.length>10){progress.textContent='El máximo es de 10 etiquetas.';return;}
  busy=true;const controls=[...form.elements];controls.forEach(el=>el.disabled=true);
  const result=$('stock-result');result.hidden=true;progress.textContent='Preparando la importación…';
  try {
    const {blob,title}=await download(url);
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
      comment:$('notes').value,tags,dimensions,...(poster?{poster}:{}),...source.fields};
    const r=await fetch('/stock-publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok || !data.ok || !data.id)throw Error(data.error || 'No se ha confirmado la publicación en Stock.');
    result.href='/stock.html?type='+encodeURIComponent(type)+'&highlight='+encodeURIComponent(data.id);result.hidden=false;
    progress.textContent=data.reused?'Este contenido ya estaba en Stock.':'Guardado en Stock.';
  } catch(error){progress.textContent='Importación sin completar. '+error.message;}
  finally{busy=false;controls.forEach(el=>el.disabled=false);}
});
if(supplied && params.get('importAutostart')==='1')form.requestSubmit();

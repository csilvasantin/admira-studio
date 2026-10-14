import {validateLocalFiles,localTags} from './stock-local-files.mjs';
import {publishLocalFile} from './stock-local-publish.mjs';
const $=id=>document.getElementById(id),dlg=$('localUploadModal');
if(dlg){
  let queue=[],busy=false,dragDepth=0;
  const report=text=>{$('localUploadStatus').textContent=text;};
  const suggestedTags=()=>{const PC=window.PixeriaCliente,c=PC?.actual?.();return c&&!PC.esDefecto?.()?'#'+c.id:'';};
  function render(){
    const box=$('localUploadQueue');box.replaceChildren();
    for(const entry of queue){
      const row=document.createElement('li'),info=document.createElement('span'),state=document.createElement('span'),remove=document.createElement('button');
      info.textContent=entry.file.name+' · '+(entry.file.size/1_000_000).toFixed(2)+' MB';info.className='local-file-name';
      state.textContent=entry.status==='done'?'✓ En Stock':entry.status==='failed'?'No se ha subido':entry.status==='uploading'?entry.progress:'Listo para subir';state.className='local-file-state';
      if(entry.error){state.textContent+=' · '+entry.error;}
      remove.type='button';remove.textContent='✕';remove.setAttribute('aria-label','Quitar '+entry.file.name);remove.disabled=busy;
      remove.addEventListener('click',()=>{queue=queue.filter(q=>q!==entry);report('');render();});row.append(info,state,remove);box.append(row);
    }
    const pending=queue.filter(e=>e.status!=='done');$('localUploadSend').disabled=busy||!pending.length;$('localUploadSend').textContent=queue.some(e=>e.status==='failed')?'Reintentar pendientes':'Subir archivos';
    for(const id of ['localUploadBrowse','localUploadClose','localUploadClear','localUploadComment','localUploadTags','localUploadInput','localUploadView'])$(id).disabled=busy;
    $('localUploadClear').disabled=busy||!queue.length;$('localUploadView').hidden=!queue.some(e=>e.status==='done');dlg.setAttribute('aria-busy',String(busy));
  }
  function open(){if(!dlg.open){if(!queue.length&&!$('localUploadTags').value)$('localUploadTags').value=suggestedTags();dlg.showModal();}render();}
  function add(files){
    if(busy){report('Espera a que termine esta carga para añadir archivos.');return;}
    const next=queue.slice();for(const file of files){if(!next.some(e=>e.file.name===file.name&&e.file.size===file.size&&e.file.lastModified===file.lastModified))next.push({file,status:'pending'});}
    const error=validateLocalFiles(next.map(e=>e.file));if(error){report(error+' No se ha añadido ningún archivo de esta selección.');return;}
    queue=next;report('');render();
  }
  $('stockLocalUpload').addEventListener('click',open);
  $('localUploadBrowse').addEventListener('click',()=>$('localUploadInput').click());
  $('localUploadInput').addEventListener('change',e=>{add([...e.target.files]);e.target.value='';});
  $('localUploadClose').addEventListener('click',()=>dlg.close());dlg.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('localUploadClear').addEventListener('click',()=>{queue=[];$('localUploadComment').value='';$('localUploadTags').value=suggestedTags();report('');render();});
  $('localUploadView').addEventListener('click',()=>{dlg.close();document.dispatchEvent(new CustomEvent('stock:local-view',{detail:{ids:queue.filter(e=>e.status==='done').map(e=>e.item.id)}}));});
  $('localUploadSend').addEventListener('click',async()=>{
    if(busy)return;const invalid=validateLocalFiles(queue.map(e=>e.file));if(invalid){report(invalid);return;}
    busy=true;const tags=localTags($('localUploadTags').value),comment=$('localUploadComment').value.trim();report('Subiendo archivos…');render();
    try{for(const entry of queue.filter(e=>e.status!=='done')){
      entry.status='uploading';entry.error='';entry.progress='Preparando…';render();
      try{entry.item=await publishLocalFile(entry.file,{tags,comment,onProgress:(done,total)=>{entry.progress='Subiendo '+Math.floor(done/total*100)+' %';render();}});entry.status='done';document.dispatchEvent(new CustomEvent('stock:local-published',{detail:{item:entry.item}}));}
      catch(e){entry.status='failed';entry.error=/network|fetch|connect/i.test(String(e.message||e))?'No se pudo conectar. Reintenta este archivo.':'No se pudo completar la subida. Reintenta este archivo.';}render();
    }}finally{busy=false;const done=queue.filter(e=>e.status==='done').length;report(done+' de '+queue.length+' archivos en Stock.'+(done<queue.length?' Puedes reintentar los pendientes.':''));render();}
  });
  // Sólo Files: no interfiere con el arrastre de etiquetas de las tarjetas.
  const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  document.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth++;$('localDropOverlay').hidden=false;});
  document.addEventListener('dragover',e=>{if(hasFiles(e)){e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';}});
  document.addEventListener('dragleave',e=>{if(hasFiles(e)&&--dragDepth<=0){dragDepth=0;$('localDropOverlay').hidden=true;}});
  document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth=0;$('localDropOverlay').hidden=true;open();add([...e.dataTransfer.files]);});
  window.addEventListener('blur',()=>{dragDepth=0;$('localDropOverlay').hidden=true;});
  window.StockLocalUpload={open};render();
}

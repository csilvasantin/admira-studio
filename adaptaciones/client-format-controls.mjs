import {clientEntry,clientInstallations,applyClientInstallations} from './client-installations.mjs?v=starbucks-story-1';
import {saveHandoff,readHandoff,handoffURL} from './campaign-handoff.mjs?v=starbucks-story-1';
const getJSON=async url=>{const r=await fetch(url+(url.includes("/adaptaciones/proyectos/")?(url.includes("?")?"&":"?")+"v=starbucks-layouts-3":""),{cache:"no-cache"});if(!r.ok)throw Error('catalogue');return r.json();};
const imageBlob=async image=>{const cv=document.createElement('canvas');cv.width=image.naturalWidth;cv.height=image.naturalHeight;cv.getContext('2d').drawImage(image,0,0);try{const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob)throw Error('image');return blob;}finally{cv.width=cv.height=0;}};
export function mountCreatorFormats({root,t,get,begin,newCampaign,select,source,portable,locked,say,hadSaved=false}){
 const en=document.documentElement.lang==='en',params=new URLSearchParams(location.search),panel=document.createElement('section');panel.className='campaign-client-formats';
 const label=document.createElement('label');label.textContent=t('Formatos de cliente','Client formats');const pick=document.createElement('select');pick.id='campaign-format-client';label.append(pick);
 const apply=document.createElement('button');apply.type='button';apply.className='pill';apply.textContent=t('Añadir formatos a esta campaña','Add formats to this campaign');apply.id='campaign-apply-client';
 const adapter=document.createElement('button');adapter.type='button';adapter.className='pill';adapter.id='campaign-to-adapter';adapter.textContent=t('Continuar en Adaptador','Continue in Adapter');
 const note=document.createElement('p');note.className='muted';note.setAttribute('role','status');panel.append(label,apply,adapter,note);root.querySelector('.campaign-tools').after(panel);
 let index=[],working=false;const cache=new Map();
 const ficha=async entry=>{if(!entry)throw Error('catalogue');if(!cache.has(entry.id)){const doc=await getJSON('/adaptaciones/proyectos/'+entry.archivo);clientInstallations(doc);cache.set(entry.id,doc);}return cache.get(entry.id);};
 const update=()=>{pick.disabled=working||locked();apply.disabled=working||locked()||!clientEntry(index,pick.value);adapter.disabled=working||locked()||!source();};
 async function act(fn){if(working||locked())return;working=true;update();try{await fn();}catch(e){say(t('No se pudo completar. Tu campaña se conserva. ','Could not complete. Your campaign is retained. ')+(e.message==='handoff-expired'?t('Abre de nuevo el contenido desde Creador o Adaptador.','Open the content again from Creator or Adapter.'):e.message));}finally{working=false;update();}}
 pick.onchange=()=>{const entry=clientEntry(index,pick.value);note.textContent=entry?t('Horizontal, vertical y ','Landscape, portrait and ')+entry.instalaciones+' '+t('montajes disponibles.','available layouts.'):t('Formatos generales de la biblioteca.','General library formats.');update();};
 apply.onclick=()=>void act(async()=>{const doc=await ficha(clientEntry(index,pick.value));begin(applyClientInstallations(get(),doc));say(doc.nombre+' · '+t('Formatos añadidos. Se conservan tus imágenes, textos y medidas guardadas.','Formats added. Your images, copy and saved geometry are retained.')); });
 adapter.onclick=()=>void act(async()=>{const c=get(),entry=clientEntry(index,c.client?.id||pick.value),blob=await imageBlob(source());const id=await saveHandoff({campaign:portable(),source:{blob,name:c.productLabel||c.name},project:entry?.id});location.href=handoffURL(en?'/en/adaptaciones/':'/adaptaciones/',id,{project:entry?.id,client:c.client?.id});});
 async function fresh(){const entry=clientEntry(index,pick.value);return entry?applyClientInstallations(newCampaign(),await ficha(entry),{fresh:true}):newCampaign();}
 async function init(){
  try{const [data,session]=await Promise.all([getJSON('/adaptaciones/proyectos/index.json'),getJSON('/auth/session').catch(()=>null)]);const permitted=Array.isArray(session?.clientes)?session.clientes:window.PixeriaCliente?.permitidos?.();index=(data.proyectos||[]).filter(p=>p.creador&&(!permitted||permitted.includes(p.cliente)||permitted.includes('alsea')&&p.cliente==='starbucks'));
   pick.replaceChildren(new Option(t('General · biblioteca de formatos','General · format library'),''),...index.map(p=>new Option(p.nombre+' · '+p.instalaciones+' '+t('montajes','layouts'),p.id)));
   const requested=clientEntry(index,params.get('proyecto')||params.get('cliente')||get().client?.id||window.PixeriaCliente?.actual?.()?.id);if(requested)pick.value=requested.id;pick.onchange();
   if(params.has('handoff')){const transfer=await readHandoff(params.get('handoff')),entry=clientEntry(index,transfer.project||requested?.id);let next=transfer.campaign||newCampaign();
    if(transfer.source.blob.size>8*1048576)throw Error('handoff-image-too-large');
    if(!transfer.campaign){next.product=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(transfer.source.blob);});next.productLabel=transfer.source.name||next.name;}
    if(entry){pick.value=entry.id;next=applyClientInstallations(next,await ficha(entry),{fresh:!transfer.campaign,only:transfer.installation||params.get('instalacion')});}
    begin(next);select(transfer.installation||params.get('instalacion'));const clean=new URL(location.href);clean.searchParams.delete('handoff');history.replaceState(history.state,'',clean.href);say(t('Campaña e imagen recuperadas del Adaptador. Revisa los formatos y completa los textos si empiezas desde una imagen.','Campaign and image restored from Adapter. Review formats and complete copy when starting from an image.'));
   }else if(requested&&!hadSaved&&!params.has('demo')&&params.get('flow')!=='contenido'){begin(applyClientInstallations(get(),await ficha(requested),{fresh:true,only:params.get('instalacion')}));select(params.get('instalacion'));}
   if(params.get('instalacion'))select(params.get('instalacion'));
  }catch(e){say(t('No se pudieron cargar los formatos de cliente. La campaña sigue disponible. ','Client formats could not load. Your campaign remains available. ')+e.message);}finally{update();}
 }
 return {init,update,fresh};
}
export function mountAdapterInstallations({host,t,getSource,getCampaign,locked}){
 const panel=document.createElement('section');panel.className='adapter-client-installations';panel.hidden=true;host.prepend(panel);let current=null,working=false;
 function update(ficha){current=ficha;panel.replaceChildren();panel.hidden=!ficha?.instalaciones?.length;if(panel.hidden)return;
  const heading=document.createElement('h2');heading.textContent=ficha.nombre+' · '+t('Montajes de pantallas','Screen layouts');const description=document.createElement('p');description.textContent=t('Usa la imagen de esta campaña y continúa en Creador para preparar el vídeo por pantalla.','Use this campaign image and continue in Creator to prepare per-screen video.');panel.append(heading,description);
  for(const i of clientInstallations(ficha)){const card=document.createElement('div');card.className='adapter-installation-card';const title=document.createElement('b');title.textContent=i.name[document.documentElement.lang==='en'?'en':'es'];const map=document.createElement('div');map.className='client-screen-map';map.setAttribute('aria-label',i.pattern);let group=null;
   for(const s of i.screens){if(group?.dataset.group!==String(s.group||1)){group=document.createElement('span');group.className='client-screen-group';group.dataset.group=s.group||1;map.append(group);}const screen=document.createElement('span');screen.className=s.w>s.h?'client-screen landscape':'client-screen portrait';screen.textContent=s.w>s.h?'H':'V';group.append(screen);}
   const link=document.createElement('button');link.type='button';link.className='pill';link.textContent=t('Crear este montaje','Create this layout');link.onclick=async()=>{if(working||locked())return;working=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);try{const image=getSource();if(!image){location.href=(document.documentElement.lang==='en'?'/en/creador/':'/creador/')+'?proyecto='+encodeURIComponent(current.id)+'&cliente='+encodeURIComponent(current.cliente)+'&instalacion='+encodeURIComponent(i.id);return;}
     const blob=await imageBlob(image),id=await saveHandoff({source:{blob,name:t('Imagen de campaña','Campaign image')},campaign:getCampaign?.()||null,project:current.id,installation:i.id});location.href=handoffURL(document.documentElement.lang==='en'?'/en/creador/':'/creador/',id,{project:current.id,installation:i.id,client:current.cliente});
    }catch{description.textContent=t('No se pudo trasladar la imagen. Conserva el original y vuelve a intentarlo.','The image could not transfer. Keep the original and try again.');}finally{working=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}};card.append(title,map,link);panel.append(card);
  }
 }
 return {update};
}

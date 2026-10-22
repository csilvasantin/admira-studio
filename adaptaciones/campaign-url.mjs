// Creador de contenidos desde URL (22-oct-2026): pegar una URL bajo «＋ Nueva campaña» crea una campaña
// con el paso Contenido relleno (marca/producto, titular, llamada a la acción e imagen de la fuente).
// Reutiliza el borrador de pixer-worker (/capsula/url/borrador, modo «campana») vía /creator-capsule-url.
export const SOURCE_MAX=1000;
export function restoreSource(v){
 if(!v||typeof v!=='object')throw Error('campaign-source');
 let u;try{u=new URL(String(v.url||''));}catch{throw Error('campaign-source');}
 if(u.protocol!=='https:'||u.username||u.password||u.href.length>SOURCE_MAX)throw Error('campaign-source');
 const s=(x,m)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,m);
 return {url:u.href,title:s(v.title,300),author:s(v.author,200),kind:s(v.kind,20),idea:s(v.idea,280)};
}
// Campaña nueva + borrador → misma forma que si Carlos subiera producto y texto a mano.
export function urlCampaign(base,draft,image){
 const c=JSON.parse(JSON.stringify(base)),k=draft.campana||{},src=draft.source||{};
 if(k.nombre)c.name=k.nombre.slice(0,500);if(k.titular)c.headline=k.titular.slice(0,500);if(k.cta)c.cta=k.cta.slice(0,500);
 if(image){c.product=image;c.productLabel=(k.etiqueta||src.title||'Imagen de la fuente').slice(0,500);}
 c.source=restoreSource({url:src.url||draft.url,title:src.title,author:src.author,kind:src.kind,idea:k.idea});
 return c;
}
export async function imageData(url,fetcher=fetch){
 if(!url)return '';const r=await fetcher(url);if(!r.ok)return '';const b=await r.blob();if(!/^image\/(png|jpeg|webp)$/.test(b.type)||b.size>8*1048576)return '';
 const u=new Uint8Array(await b.arrayBuffer());let bin='';for(let i=0;i<u.length;i+=32768)bin+=String.fromCharCode(...u.subarray(i,i+32768));
 return 'data:'+b.type+';base64,'+btoa(bin);
}
export function sourceLink(doc,c,t){
 if(!c?.source?.url)return null;const a=doc.createElement('a');a.className='campaign-source-link';a.href=c.source.url;a.target='_blank';a.rel='noopener noreferrer';
 a.textContent='↗ '+t('Fuente','Source')+': '+(c.source.title||c.source.url).slice(0,90);a.title=c.source.url;return a;
}
// Estados y errores siempre visibles (23-oct-2026: Carlos pegaba la URL y «no pasaba nada»: sólo el botón
// lanzaba la acción y el aviso quedaba en texto gris). Ahora pegar la lanza sola, hay botón «Crear» y cada fase
// y cada error se ven en una franja con color.
export function isCampaignUrl(v){try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&!!u.hostname.includes('.')&&!u.username&&!u.password&&u.href.length<=2000;}catch{return false;}}
export function urlError(status,code,t){
 if(status===401||code==='session-required')return {kind:'session',text:t('Tu sesión ha caducado. Vuelve a iniciar sesión y repite.','Your session has expired. Sign in again and retry.')};
 if(code==='invalid-url'||code==='bad-url')return {kind:'url',text:t('La URL no es válida. Pega un enlace completo que empiece por https://','The URL is not valid. Paste a full link starting with https://')};
 if(/^source-|^url-|fetch-failed|unreadable/.test(code||'')||status===422)return {kind:'source',text:t('No se pudo leer la fuente. Pega el texto de la publicación abajo y pulsa «Crear».','The source could not be read. Paste the post text below and press «Create».')};
 if(status===0||status===502||status===504||code==='stock-unreachable'||code==='network')return {kind:'network',text:t('Error de red: no se pudo contactar con el servidor. Comprueba la conexión y repite.','Network error: the server could not be reached. Check the connection and retry.')};
 return {kind:'error',text:t('No se pudo crear la campaña','Could not create the campaign')+' ('+(code||('HTTP '+status))+').'};
}
export function mountUrlCampaign({root,fresh,begin,t,locked,say,fetcher=(...a)=>fetch(...a),loginPath='/auth/login'}){
 const form=root.querySelector('#campaign-url-form');if(!form)return null;
 const $=s=>form.querySelector(s),input=$('#campaign-url'),go=$('#campaign-url-go'),box=$('#campaign-url-status');let working=false,timer=0;
 const status=(state,text,login)=>{box.dataset.state=state;box.replaceChildren(text);if(login){const a=root.ownerDocument.createElement('a');a.href=loginPath+'?return_to='+encodeURIComponent(location.pathname+location.search);a.textContent=' '+t('Iniciar sesión','Sign in')+' ↗';box.append(a);}if(say)say(text);};
 const setBusy=on=>{working=on;go.disabled=on;input.readOnly=on;form.setAttribute('aria-busy',String(on));go.textContent=on?t('Creando…','Creating…'):t('Crear','Create');};
 const run=async()=>{if(working)return;const url=input.value.trim();
  if(!isCampaignUrl(url)){status('error',urlError(400,'invalid-url',t).text);return;}
  if(locked()){status('error',t('Espera a que termine la operación en curso y repite.','Wait for the current operation to finish and retry.'));return;}
  setBusy(true);status('working',t('Leyendo la fuente…','Reading the source…'));clearTimeout(timer);timer=setTimeout(()=>{if(working)status('working',t('Redactando con IA…','Drafting with AI…'));},2500);
  try{let r,d={};
   try{r=await fetcher('/creator-capsule-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'borrador-campana',url,texto:$('#campaign-url-text').value})});}catch{const e=urlError(0,'network',t);status('error',e.text);return;}
   d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok){const e=urlError(r.status,d.error,t);if(e.kind==='source'){$('#campaign-url-paste').open=true;$('#campaign-url-text').focus();}status('error',e.text,e.kind==='session');return;}
   clearTimeout(timer);status('working',t('Preparando la campaña…','Preparing the campaign…'));
   let image='';try{image=await imageData(d.imageProxy,fetcher);}catch{}
   const ok=await begin(urlCampaign(await fresh(),{...d,url},image));
   if(ok===false){status('error',t('No se pudo abrir la campaña nueva: espera a que termine la operación en curso y repite.','Could not open the new campaign: wait for the current operation to finish and retry.'));return;}
   root.ownerDocument.querySelector('#campaign-edit')?.click();
   status('done',t('Campaña creada. Revisa las propuestas y ajusta la copia en Editar contenido.','Campaign created. Review the proposals and adjust the copy in Edit content.')+(image?'':t(' La fuente no tenía imagen utilizable: sube tu producto.',' The source had no usable image: upload your product.')));
  }catch(err){status('error',t('No se pudo crear la campaña: ','Could not create the campaign: ')+(err?.message||err));}
  finally{clearTimeout(timer);setBusy(false);}};
 form.onsubmit=e=>{e.preventDefault();void run();};
 input.addEventListener('paste',()=>setTimeout(()=>{if(isCampaignUrl(input.value))void run();},0));
 input.addEventListener('input',()=>{if(!working&&box.dataset.state==='error'&&isCampaignUrl(input.value))status('idle','');});
 setBusy(false);
 return {form,run};
}

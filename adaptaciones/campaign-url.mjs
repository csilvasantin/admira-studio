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
export function mountUrlCampaign({root,fresh,begin,t,locked,say}){
 const form=root.querySelector('#campaign-url-form');if(!form)return null;
 const $=s=>form.querySelector(s),status=x=>{$('#campaign-url-status').textContent=x;say(x);};let working=false;
 form.onsubmit=async e=>{e.preventDefault();if(working||locked())return;const url=$('#campaign-url').value.trim();if(!/^https:\/\//.test(url)){status(t('Pega una URL que empiece por https://','Paste a URL starting with https://'));return;}
  working=true;$('#campaign-url-go').disabled=true;status(t('Leyendo la fuente y redactando la campaña…','Reading the source and drafting the campaign…'));
  try{const r=await fetch('/creator-capsule-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'borrador-campana',url,texto:$('#campaign-url-text').value})});const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok){$('#campaign-url-paste').open=true;throw Error(d.error==='source-has-no-readable-content'?t('No se pudo leer la página: pega el texto abajo y repite.','Page unreadable: paste the text below and retry.'):(d.error||('HTTP '+r.status)));}
   let image='';try{image=await imageData(d.imageProxy);}catch{}
   await begin(urlCampaign(await fresh(),{...d,url},image));document.querySelector('#campaign-edit')?.click();
   status(t('Campaña creada desde la fuente. Revisa las propuestas y ajusta la copia en Editar contenido.','Campaign created from the source. Review the proposals and adjust the copy in Edit content.')+(image?'':t(' La fuente no tenía imagen utilizable: sube tu producto.',' The source had no usable image: upload your product.')));
  }catch(err){status(t('No se pudo crear desde la URL: ','Could not create from URL: ')+err.message);}finally{working=false;$('#campaign-url-go').disabled=false;}};
 return {form};
}

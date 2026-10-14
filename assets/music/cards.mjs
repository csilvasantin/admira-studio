// Music is a content category; an MP4 container or cover does not turn it into video/image.
export const FORMATS = Object.freeze({landscape:{width:1920,height:1080},portrait:{width:1080,height:1920}});
const xml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sunoSource(item) {
  return [item?.motor,item?.provider].some(value=>/^suno(?:$|[-_\s])/i.test(String(value || ''))) ||
    (item?.motor==='local' && ['audio','music'].includes(item?.type) && (Array.isArray(item.tags)?item.tags:[]).some(tag=>/^suno$/i.test(String(tag))));
}
export function isMusic(item) {
  return item?.type === 'music' || (sunoSource(item) && ['audio','video'].includes(item?.type)) ||
    (item?.musicCard?.schema === 'admira.music-card.v1' && typeof item.musicCard.trackId === 'string');
}
export function normalizeMusic(item) {
  return isMusic(item) && item.type !== 'music' ? {...item,type:'music',sourceMediaType:item.sourceMediaType || item.type} : item;
}
export function hasMusicCards(item) { return isMusic(item) && (sunoSource(item) || item.musicCard?.schema === 'admira.music-card.v1'); }
export function matchesMusicType(item,type) {
  return isMusic(item) ? (!type || type === 'music') : null;
}
const artwork = item => {
  const value=String(item?.thumbnail || item?.cover_url || item?.cover || '');
  return /^https?:\/\/[^\s"'<>]+$/.test(value) || /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : '';
};
function wrap(text,limit,lines) {
  const words=String(text || 'Admira Studio Music').trim().split(/\s+/),out=[];let line='';
  // Long unbroken titles also fit: split by Unicode characters without interpreting markup.
  const pieces=words.flatMap(w=>Array.from(w).length>limit?Array.from({length:Math.ceil(Array.from(w).length/limit)},(_,i)=>Array.from(w).slice(i*limit,(i+1)*limit).join('')):[w]);
  for(const word of pieces){if(line&&Array.from(line+' '+word).length>limit){out.push(line);line=word;}else line+=(line?' ':'')+word;}
  if(line)out.push(line);if(out.length>lines){out.length=lines;out[lines-1]=Array.from(out[lines-1]).slice(0,limit-1).join('')+'…';}return out;
}
export function durationText(item) {
  const n=Number(item?.duration ?? item?.metadata?.duration);
  if(Number.isFinite(n)&&n>0)return Math.floor(n/60)+':'+String(Math.floor(n)%60).padStart(2,'0');
  const t=String(item?.metadata?.duration_formatted || item?.duration || '');return /^\d{1,3}:\d{2}$/.test(t)?t:'';
}
export function cardSvg(item,format='landscape',{lang='es',cover=artwork(item)}={}) {
  if(!hasMusicCards(item))throw new Error('Music cards require a music track');
  const dims=FORMATS[format];if(!dims)throw new Error('Unknown music card format');
  const vertical=format==='portrait',w=dims.width,h=dims.height;
  const uid='mc-'+Array.from(String(item.id||item.title||'music')).reduce((n,c)=>Math.imul(n^c.codePointAt(0),16777619)>>>0,2166136261).toString(36)+'-'+format;
  const art={x:vertical?100:112,y:vertical?170:130,size:vertical?880:820};
  const tx=vertical?100:1060,ty=vertical?1168:250,size=vertical?78:70;
  const lines=wrap(item.title || item.prompt || 'Admira Studio Music',vertical?19:21,4);
  const label=lang==='en'?'MUSIC':'MÚSICA',duration=durationText(item),safeCover=artwork({thumbnail:cover});
  const title=String(item.title || item.prompt || 'Admira Studio Music');
  const wave=Array.from({length:28},(_,i)=>{const bh=14+(Math.sin(i*1.4)+1)*19;return `<rect x="${tx+i*22}" y="${h-170-bh/2}" width="8" height="${bh.toFixed(1)}" rx="4"/>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><defs><linearGradient id="${uid}-background" x2="1" y2="1"><stop stop-color="#092d2a"/><stop offset="1" stop-color="#071615"/></linearGradient><linearGradient id="${uid}-record" x2="1" y2="1"><stop stop-color="#284a42"/><stop offset="1" stop-color="#112823"/></linearGradient><clipPath id="${uid}-art"><rect x="${art.x}" y="${art.y}" width="${art.size}" height="${art.size}" rx="24"/></clipPath></defs><rect width="${w}" height="${h}" fill="url(#${uid}-background)"/><circle cx="${w}" cy="0" r="${w*.54}" fill="#28483d" opacity=".28"/><g clip-path="url(#${uid}-art)"><rect x="${art.x}" y="${art.y}" width="${art.size}" height="${art.size}" fill="#d8dbc8"/><circle cx="${art.x+art.size/2}" cy="${art.y+art.size/2}" r="${art.size*.42}" fill="url(#${uid}-record)"/>${[.37,.31,.25].map(r=>`<circle cx="${art.x+art.size/2}" cy="${art.y+art.size/2}" r="${art.size*r}" fill="none" stroke="#829585" stroke-width="2" opacity=".4"/>`).join('')}<circle cx="${art.x+art.size/2}" cy="${art.y+art.size/2}" r="${art.size*.105}" fill="#cadbb7"/><circle cx="${art.x+art.size/2}" cy="${art.y+art.size/2}" r="${art.size*.012}" fill="#173831"/>${safeCover?`<image x="${art.x}" y="${art.y}" width="${art.size}" height="${art.size}" preserveAspectRatio="xMidYMid slice" href="${xml(safeCover)}"/>`:''}</g><g font-family="Arial,Helvetica,sans-serif"><text x="${vertical?100:112}" y="92" fill="#bdd8ca" font-size="30" letter-spacing="5">ADMIRA STUDIO MUSIC</text><text x="${tx}" y="${ty}" fill="#a5ccad" font-size="30" letter-spacing="6">${label}${duration?' · '+xml(duration):''}</text><text fill="#f6f3e8" font-size="${size}" font-weight="700">${lines.map((l,i)=>`<tspan x="${tx}" y="${ty+110+i*size*1.18}">${xml(l)}</tspan>`).join('')}</text><text x="${tx}" y="${Math.min(h-260,ty+155+lines.length*size*1.18)}" fill="#bdd0c5" font-size="30">${xml(item.artist || item.author || 'Admira Studio Music')}</text><g fill="#bdd8ad">${wave}</g><text x="${w-100}" y="${h-80}" text-anchor="end" fill="#8caca0" font-size="26">${vertical?'9:16':'16:9'}</text></g></svg>`;
}
export function cardHtml(item,{format='landscape',lang='es',player=true}={}) {
  if(!hasMusicCards(item))return '';
  const en=lang==='en',id=String(item.id || '').replace(/[^a-z0-9-]/gi,'');
  return `<section class="music-card-tools" data-music-id="${id}" data-music-format="${format}"><div class="music-cartela" data-music-art>${cardSvg(item,format,{lang})}</div><div class="music-card-actions" role="group" aria-label="${en?'Music card format':'Formato de la cartela musical'}"><button type="button" data-music-action="format" data-format="landscape" aria-pressed="${format==='landscape'}">${en?'Horizontal':'Horizontal'}</button><button type="button" data-music-action="format" data-format="portrait" aria-pressed="${format==='portrait'}">${en?'Vertical':'Vertical'}</button><button type="button" data-music-action="download">${en?'Download card':'Descargar cartela'} · PNG</button></div>${player&&item.url&&(item.sourceMediaType || item.type)!=='image'?`<audio controls preload="none" src="${xml(item.url)}" data-pixer-title="${xml(item.title || 'Admira Studio Music')}" data-pixer-cover="${xml(artwork(item))}" data-pixer-audio="${xml(item.audioUrl || item.url)}"></audio>`:''}<p class="music-card-status" role="status" aria-live="polite"></p></section>`;
}
export function filename(item,format,ext='png') {
  const name=String(item.title || item.id || 'music').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,100).trim()||'music';
  const {width,height}=FORMATS[format];return `${name}-${width}x${height}.${ext}`;
}
async function embeddedCover(item) {
  const url=artwork(item);if(!url)return '';
  let data=url;
  if(!url.startsWith('data:')){
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),credentials:'omit'});if(!response.ok)throw Error('cover');
    const blob=await response.blob();if(!blob.type.startsWith('image/')||blob.size>12*1024*1024)throw Error('cover');
    data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  }
  // Some old thumbnails are truncated data URLs. Use the authored record fallback, never a broken-image icon.
  const image=new Image();image.src=data;
  try{await image.decode();return data;}catch{return '';}
}
export async function pngBlob(item,format,{lang='es'}={}) {
  const cover=await embeddedCover(item),svg=cardSvg(item,format,{lang,cover});
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
    const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const {width,height}=FORMATS[format],canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(img,0,0,width,height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('export')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
}
export function bindMusicCards(root,lookup,{lang=()=>document.documentElement.lang==='en'?'en':'es',onFormat=()=>{}}={}) {
  root.addEventListener('error',event=>{if(event.target.localName==='image'&&event.target.closest('.music-cartela'))event.target.remove();},true);
  root.addEventListener('click',async event=>{
    const button=event.target.closest('[data-music-action]');if(!button)return;
    event.preventDefault();event.stopPropagation();const panel=button.closest('[data-music-id]'),item=lookup(panel.dataset.musicId);if(!item)return;
    const currentLang=lang(),en=currentLang==='en';
    if(button.dataset.musicAction==='format'){
      const format=button.dataset.format;if(!FORMATS[format])return;
      panel.dataset.musicFormat=format;onFormat(item.id,format);panel.querySelector('[data-music-art]').innerHTML=cardSvg(item,format,{lang:currentLang});
      panel.querySelectorAll('[data-music-action="format"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===format)));return;
    }
    button.disabled=true;const status=panel.querySelector('.music-card-status');status.textContent=en?'Preparing card…':'Preparando cartela…';
    try{
      const format=panel.dataset.musicFormat,blob=await pngBlob(item,format,{lang:currentLang}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=filename(item,format);a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      status.textContent=en?'Card downloaded. Stored only with this music track.':'Cartela descargada. Vinculada sólo a esta pieza musical.';
    }catch{status.textContent=en?'Could not export the card. Check the cover connection and retry.':'No se pudo exportar la cartela. Comprueba la conexión de la portada y reintenta.';}
    finally{button.disabled=false;}
  });
}

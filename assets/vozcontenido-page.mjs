import {textos, videoItems, sourceURL, voiceRequest, recorderMime, publishMeta} from './vozcontenido.mjs?v=20261109-1';

import {priceCents, offerLabel, narration, paintOffer, validOffer} from './voz-oferta.mjs';

const $ = id => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es';
const T = textos(lang);
document.documentElement.lang = lang;
document.title = 'Admira Studio · ' + T.name;
for (const [id, k] of [['vc-title','name'],['vc-intro','intro'],['vc-step1','step1'],['vc-step2','step2'],['vc-step3','step3'],['vc-voice','voice'],['vc-create','create'],['vc-dictate','dictate'],['vc-download','download'],['vc-open','open']]) $(id).textContent = T[k];
$('vc-nav-self').textContent = T.name;
if (lang === 'en') { $('vc-nav-campanas').textContent = 'Campaigns'; $('vc-nav-campanas').href = '/campanas/?lang=en'; $('vc-nav-stock').href = '/en/stock.html?type=video'; }
$('vc-lang').textContent = lang === 'en' ? 'ESP' : 'ENG';
$('vc-lang').href = lang === 'en' ? '?lang=es' : '?lang=en';
$('vc-search').placeholder = T.search; $('vc-text').placeholder = T.placeholder; $('vc-voice-lang').value = lang;

const say = (msg, err) => { $('vc-status').textContent = err ? T.error + msg : msg; };
let all = [], chosen = null, voiceBlob = null, voiceFor = '';

const t = (es,en) => lang === 'en' ? en : es;
const priceError = t('Escribe el producto y un precio en euros, por ejemplo 3,50.', 'Enter a product and a euro price, for example 3.50.');
const labels = {
  'vc-script-label': t('Guion', 'Script'), 'vc-offers-label': t('Mis ofertas', 'My offers'),
  'vc-reload':t('Actualizar lista', 'Refresh list'), 'vc-save':t('Guardar oferta en mi cuenta', 'Save offer to my account'),
  'vc-offer-heading':t('Producto y precio', 'Product and price'), 'vc-product-label':t('Producto', 'Product'),
  'vc-price-label':t('Precio (€)', 'Price (€)'), 'vc-offer-help':t('Escribe el mensaje sin el precio. Añadiremos el producto y su precio a la locución y al vídeo.', 'Write your message without the price. We add the product and price to the narration and video.'),
};
for (const [id,label] of Object.entries(labels)) $(id).textContent=label;
$('vc-play').setAttribute('aria-label',t('Previsualizar vídeo con voz','Preview video with voice'));
$('vc-voice-lang').setAttribute('aria-label',t('Idioma de la voz','Voice language'));
$('vc-search').setAttribute('aria-label',T.search);
const freshLabel=t('Nuevo contenido','New content');
$('vc-offers').options[0].textContent=freshLabel;
let offers=[], draftId=crypto.randomUUID(), version=0, working=false, listTurn=0;
function priceDraft() {
  const name=$('vc-product').value.trim(), raw=$('vc-price').value.trim();
  if (!name && !raw) return null;
  const cents=priceCents(raw);
  if (!name || cents === null) throw Error(priceError);
  return {name,cents};
}
function requestVoice() {
  const language=$('vc-voice-lang').value;
  return voiceRequest(narration($('vc-text').value,priceDraft(),language),language);
}
function refreshPreview() {
  const cv=$('vc-overlay'), v=$('vc-video');
  cv.width=v.videoWidth || 640; cv.height=v.videoHeight || 360;
  try {
    const offer=priceDraft(), language=$('vc-voice-lang').value;
    $('vc-offer-preview').textContent=offer ? narration($('vc-text').value,offer,language) : '';
    paintOffer(cv.getContext('2d'),cv.width,cv.height,offer,language);
  } catch { $('vc-offer-preview').textContent=priceError; }
}
function discardOutput() {
  const a=$('vc-audio'),v=$('vc-video');
  a.pause(); v.pause(); v.loop=false;
  for (const [id,attr] of [['vc-audio','src'],['vc-download','href']]) {
    const el=$(id), old=el.getAttribute(attr);
    if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
    el.removeAttribute(attr);
  }
  $('vc-download').hidden=$('vc-open').hidden=true; voiceBlob=null; voiceFor='';
  refreshPreview();
}
for (const id of ['vc-product','vc-price','vc-text','vc-voice-lang']) $(id).addEventListener('input',discardOutput);
$('vc-video').addEventListener('loadedmetadata',refreshPreview);
function drawOfferList() {
  $('vc-offers').replaceChildren(new Option(freshLabel,''),
    ...offers.map(o=>new Option(o.name+' · '+offerLabel(o,lang),o.id)));
  $('vc-offers').value=version ? draftId : '';
}
async function loadOffers() {
  const turn=++listTurn;
  try {
    const r=await fetch('/voice-offers?list=1',{method:'POST',credentials:'same-origin'});
    if (!r.ok) throw Error();
    const data=await r.json();
    if (turn!==listTurn) return;
    offers=data.offers; drawOfferList(); $('vc-offer-state').textContent='';
  } catch { if (turn===listTurn) $('vc-offer-state').textContent=t('No se pudo cargar la lista. Vuelve a actualizarla.','Offer list unavailable. Try refreshing it.'); }
}
$('vc-reload').onclick=loadOffers;
$('vc-offers').onchange=()=>{
  const offer=offers.find(o=>o.id===$('vc-offers').value);
  draftId=offer?.id || crypto.randomUUID(); version=offer?.version || 0;
  $('vc-product').value=offer?.name || ''; $('vc-price').value=offer ? (offer.cents/100).toFixed(2).replace('.',lang==='es'?',':'.') : '';
  $('vc-text').value=offer?.script || ''; $('vc-voice-lang').value=offer?.lang || lang; $('vc-offer').open=!!offer;
  if (offer) pick(all.find(v=>v.id===offer.videoId) || {id:offer.videoId,title:offer.videoTitle,url:'https://api.admira.store/stock/asset/'+encodeURIComponent(offer.videoId)});
  else { chosen=null; $('vc-video').removeAttribute('src'); $('vc-video').load(); discardOutput(); render(); }
  $('vc-offer-state').textContent='';
};
$('vc-save').onclick=async()=>{
  if (working || rec) return;
  try {
    if (!chosen) throw Error(T.needVideo);
    const draft=priceDraft();
    if (!draft) throw Error(priceError);
    const offer={...draft,lang:$('vc-voice-lang').value,script:$('vc-text').value,videoId:chosen.id,videoTitle:String(chosen.title || chosen.id).slice(0,180)};
    if (!validOffer(offer)) throw Error(t('Revisa el guion y la oferta. El texto completo admite 5000 caracteres.','Check the script and offer. The complete text allows 5000 characters.'));
    lock(true);
    const r=await fetch('/voice-offers',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:draftId,version,offer})});
    if (r.status===409) {
      await loadOffers();
      $('vc-offers').value='';
      throw Error(t('Otro dispositivo ha cambiado esta oferta. Selecciónala en la lista para revisar el último precio.','Another device changed this offer. Select it from the list to review its latest price.'));
    }
    if (!r.ok) throw Error(t('No se ha guardado la oferta. Comprueba la sesión y vuelve a intentarlo.','Offer was not saved. Check your session and retry.'));
    version=(await r.json()).version;
    ++listTurn; offers=[{...offer,id:draftId,version},...offers.filter(o=>o.id!==draftId)];
    drawOfferList();
    $('vc-offer-state').textContent=t('Oferta guardada.','Offer saved.');
    say(t('Precio guardado en tu cuenta. Crea el vídeo para llevar esta versión a Stock.','Price saved to your account. Create the video to add this version to Stock.'));
  } catch(e) { say(e.message,true); } finally { lock(false); }
};
function lock(on) {
  working=on;
  document.querySelectorAll('.vc button,.vc input,.vc textarea,.vc select').forEach(el=>{el.disabled=on;});
}

async function loadStock() {
  $('vc-list-state').textContent = T.loading;
  for (const src of ['/stock-index', 'https://api.admira.store/stock/list?limit=200&type=video']) {
    try { const r = await fetch(src, {cache: 'no-store'}); if (!r.ok) continue; const d = await r.json(); if (Array.isArray(d.items)) { all = d.items; break; } } catch {}
  }
  render();
}
function render() {
  const list = videoItems(all, $('vc-search').value).slice(0, 240);
  $('vc-list-state').textContent = list.length ? `${list.length}` : T.none;
  $('vc-grid').replaceChildren(...list.map(it => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(chosen?.id === it.id)); b.title = it.title || it.id;
    const img = document.createElement('img'); img.loading = 'lazy'; img.alt = ''; img.src = it.poster || it.thumbnail || '';
    const s = document.createElement('span'); s.textContent = it.title || it.id;
    b.append(img, s); b.onclick = () => pick(it); return b;
  }));
}
function pick(it) {
  if (working || rec) return;
  chosen = it; discardOutput();
  $('vc-video').src = sourceURL(it); $('vc-video').load();
  render(); say('');
}
$('vc-search').oninput = render;

// Dictado con la API del navegador (Chrome/Edge/Safari).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
$('vc-dictate').onclick = () => {
  if (!SR) { $('vc-text').focus(); return say(t('Usa el micrófono del teclado o escribe tu guion.', 'Use keyboard dictation or type your script.')); }
  if (rec) { rec.stop(); return; }
  const base=$('vc-text').value.trimEnd();
  try {
    const active=new SR(); rec=active;
    active.lang=$('vc-voice-lang').value==='en'?'en-US':'es-ES';
    active.continuous=true; active.interimResults=true;
    active.onresult=e=>{
      if (rec!==active) return;
      const spoken=Array.from(e.results,r=>r[0].transcript.trim()).join(' ');
      $('vc-text').value=[base,spoken].filter(Boolean).join(' ').slice(0,5000);
      discardOutput();
    };
    const finish=()=>{ if (rec!==active) return; rec=null; lock(false); $('vc-dictate').textContent=T.dictate; $('vc-dictate').setAttribute('aria-pressed','false'); };
    active.onend=finish;
    active.onerror=e=>{ finish(); say(e.error==='not-allowed' ? t('Activa el permiso de micrófono o usa el teclado.', 'Allow microphone access or use your keyboard.') : t('Dictado interrumpido. Puedes revisar el texto y volver a dictar.', 'Dictation stopped. Review your text and try again.'),true); };
    active.start(); lock(true); $('vc-dictate').disabled=false; $('vc-dictate').textContent=T.stop; $('vc-dictate').setAttribute('aria-pressed','true');
    say(t('Escuchando…', 'Listening…'));
  } catch { rec=null; lock(false); say(t('El micrófono no está disponible. Puedes escribir el mensaje.', 'Microphone unavailable. You can type your message.'),true); }
};

async function ensureVoice() {
  const req = requestVoice();
  const key = req.language + '|' + req.text;
  if (voiceBlob && voiceFor === key) return voiceBlob;
  say(T.voicing);
  const r = await fetch('/stock-video-voice', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(req)});
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw Error(d.error || 'HTTP ' + r.status); }
  voiceBlob = await r.blob(); voiceFor = key;
  $('vc-audio').src = URL.createObjectURL(voiceBlob);
  return voiceBlob;
}
const guard = fn => async () => {
  if (!chosen) return say(T.needVideo, true);
  if (working || rec) return;
  try { requestVoice(); lock(true); await fn(); }
  catch (e) { say(e.message === 'text-required' ? T.needText : e.message === 'text-too-long' ? t('El guion supera 5000 caracteres.', 'The script exceeds 5000 characters.') : e.message || String(e), true); }
  finally { lock(false); }
};
$('vc-voice').onclick = guard(async () => { await ensureVoice(); say(T.voiced); });
$('vc-play').onclick = guard(async () => {
  await ensureVoice(); const v = $('vc-video'), a = $('vc-audio');
  v.currentTime = 0; a.currentTime = 0; v.loop = true; await Promise.all([v.play(), a.play()]);
  a.onended = () => { v.pause(); v.loop = false; };
});

// Grabación en tiempo real: vídeo (en bucle si la voz es más larga) + voz.
async function record() {
  if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error(t('Este navegador no puede exportar el vídeo. Guarda tu oferta y ábrela en Chrome.', 'This browser cannot export video. Save your offer and open it in Chrome.'));
  const offer=priceDraft(),language=$('vc-voice-lang').value;
  $('vc-audio').pause();
  const blob = await ensureVoice();
  const v = $('vc-video'); v.pause();
  if (v.error) throw Error(t('El vídeo de origen no está disponible.', 'The source video is unavailable.'));
  if (v.readyState < 1) await new Promise((ok,ko)=>{
    const finish=err=>{clearTimeout(timer); v.removeEventListener('loadedmetadata',ready); v.removeEventListener('error',failed); err ? ko(err) : ok();};
    const ready=()=>finish(), failed=()=>finish(Error('video-load'));
    const timer=setTimeout(failed,20000); v.addEventListener('loadedmetadata',ready); v.addEventListener('error',failed);
  });
  const ac = new AudioContext(); let stream, raf;
  try { await ac.resume(); const buf = await ac.decodeAudioData(await blob.arrayBuffer());
  const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
  const W = Math.round(v.videoWidth * scale / 2) * 2, H = Math.round(v.videoHeight * scale / 2) * 2;
  const canvas = Object.assign(document.createElement('canvas'), {width: W, height: H}), ctx = canvas.getContext('2d');
  const dest = ac.createMediaStreamDestination(), srcNode = ac.createBufferSource(); srcNode.buffer = buf; srcNode.connect(dest);
  stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = recorderMime(); const mr = new MediaRecorder(stream, mime ? {mimeType: mime, videoBitsPerSecond: 4e6} : {});
  const chunks = []; mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const duration = Math.max(buf.duration + 0.4, Math.min(v.duration || 0, 180));
  v.currentTime = 0; v.loop = true; await v.play();
  const draw = () => { ctx.drawImage(v, 0, 0, W, H); paintOffer(ctx,W,H,offer,language); raf = requestAnimationFrame(draw); }; draw();
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{if (mr.state!=='inactive') mr.stop();},duration*1000);
    mr.onstop=()=>{clearTimeout(timer);resolve();};
    mr.onerror=e=>{clearTimeout(timer);reject(e.error || Error('recording'));};
    try { mr.start(500); srcNode.start(); } catch(e){clearTimeout(timer);reject(e);}
  });
  const out=new Blob(chunks,{type:(mr.mimeType || mime || 'video/webm').split(';')[0]});
  if (!out.size) throw Error('recording-empty');
  return {out,W,H,duration};
  } finally {cancelAnimationFrame(raf); v.pause(); v.loop=false; stream?.getTracks().forEach(track=>track.stop()); await ac.close();}
}
$('vc-create').onclick = guard(async () => {
  $('vc-create').disabled = true;
  try {
    say(T.recording);
    const {out, W, H, duration} = await record();
    const dl = $('vc-download'); if (dl.href.startsWith('blob:')) URL.revokeObjectURL(dl.href); dl.href = URL.createObjectURL(out); dl.download = `vozcontenido-${chosen.id}.${/mp4/.test(out.type) ? 'mp4' : 'webm'}`; dl.hidden = false;
    say(T.saving);
    const {meta, extra} = publishMeta(chosen, {lang: $('vc-voice-lang').value, text: requestVoice().text, width: W, height: H, duration, mime: out.type});
    const offer=priceDraft();
    if (offer) meta.title=(offer.name+' · '+offerLabel(offer,$('vc-voice-lang').value)+' · '+meta.title).slice(0,160);
    const {publishAdaptation} = await import('/adaptaciones/stock-publish.mjs');
    const p = await publishAdaptation(out, meta, extra);
    if (!p.ok) throw Error(p.error || 'publish');
    const o = $('vc-open'); o.href = (lang === 'en' ? '/en/stock.html' : '/stock.html') + '?type=video&highlight=' + encodeURIComponent(p.id); o.hidden = false;
    say(T.done);
  } finally { $('vc-create').disabled = false; }
});

loadStock();
loadOffers();

import {textos, videoItems, sourceURL, voiceRequest, recorderMime, publishMeta} from './vozcontenido.mjs?v=20261109-1';

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
  chosen = it; voiceBlob = null;
  $('vc-video').src = sourceURL(it); $('vc-video').load();
  render(); say('');
}
$('vc-search').oninput = render;

// Dictado con la API del navegador (Chrome/Edge/Safari).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
$('vc-dictate').onclick = () => {
  if (!SR) return say(T.noDictation, true);
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = $('vc-voice-lang').value === 'en' ? 'en-US' : 'es-ES'; rec.continuous = true; rec.interimResults = false;
  const base = $('vc-text').value ? $('vc-text').value.trim() + ' ' : '';
  let said = '';
  rec.onresult = e => { said = Array.from(e.results).map(r => r[0].transcript).join(' '); $('vc-text').value = (base + said).slice(0, 5000); };
  rec.onend = () => { rec = null; $('vc-dictate').textContent = T.dictate; };
  rec.onerror = e => say(e.error, true);
  rec.start(); $('vc-dictate').textContent = T.stop;
};

async function ensureVoice() {
  const req = voiceRequest($('vc-text').value, $('vc-voice-lang').value);
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
  if (!$('vc-text').value.trim()) return say(T.needText, true);
  try { await fn(); } catch (e) { say(e.message || String(e), true); }
};
$('vc-voice').onclick = guard(async () => { await ensureVoice(); say(T.voiced); });
$('vc-play').onclick = guard(async () => {
  await ensureVoice(); const v = $('vc-video'), a = $('vc-audio');
  v.currentTime = 0; a.currentTime = 0; v.loop = true; await Promise.all([v.play(), a.play()]);
  a.onended = () => { v.pause(); v.loop = false; };
});

// Grabación en tiempo real: vídeo (en bucle si la voz es más larga) + voz.
async function record() {
  const blob = await ensureVoice();
  const v = $('vc-video'); v.pause();
  if (v.readyState < 1) await new Promise((ok, ko) => { v.onloadedmetadata = ok; v.onerror = () => ko(Error('video-load')); });
  const ac = new AudioContext(); const buf = await ac.decodeAudioData(await blob.arrayBuffer());
  const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
  const W = Math.round(v.videoWidth * scale / 2) * 2, H = Math.round(v.videoHeight * scale / 2) * 2;
  const canvas = Object.assign(document.createElement('canvas'), {width: W, height: H}), ctx = canvas.getContext('2d');
  const dest = ac.createMediaStreamDestination(), srcNode = ac.createBufferSource(); srcNode.buffer = buf; srcNode.connect(dest);
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = recorderMime(); const mr = new MediaRecorder(stream, mime ? {mimeType: mime, videoBitsPerSecond: 4e6} : {});
  const chunks = []; mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const duration = Math.max(buf.duration + 0.4, Math.min(v.duration || 0, 180));
  v.currentTime = 0; v.loop = true; await v.play();
  let raf; const draw = () => { ctx.drawImage(v, 0, 0, W, H); raf = requestAnimationFrame(draw); }; draw();
  mr.start(500); srcNode.start();
  await new Promise(ok => setTimeout(ok, duration * 1000));
  await new Promise(ok => { mr.onstop = ok; mr.stop(); });
  cancelAnimationFrame(raf); v.pause(); v.loop = false; ac.close();
  return {out: new Blob(chunks, {type: (mime || 'video/webm').split(';')[0]}), W, H, duration};
}
$('vc-create').onclick = guard(async () => {
  $('vc-create').disabled = true;
  try {
    say(T.recording);
    const {out, W, H, duration} = await record();
    const dl = $('vc-download'); dl.href = URL.createObjectURL(out); dl.download = `vozcontenido-${chosen.id}.${/mp4/.test(out.type) ? 'mp4' : 'webm'}`; dl.hidden = false;
    say(T.saving);
    const {meta, extra} = publishMeta(chosen, {lang: $('vc-voice-lang').value, text: $('vc-text').value, width: W, height: H, duration, mime: out.type});
    const {publishAdaptation} = await import('/adaptaciones/stock-publish.mjs');
    const p = await publishAdaptation(out, meta, extra);
    if (!p.ok) throw Error(p.error || 'publish');
    const o = $('vc-open'); o.href = (lang === 'en' ? '/en/stock.html' : '/stock.html') + '?type=video&highlight=' + encodeURIComponent(p.id); o.hidden = false;
    say(T.done);
  } finally { $('vc-create').disabled = false; }
});

loadStock();

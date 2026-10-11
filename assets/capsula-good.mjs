export const BANK_URL = '/capsulas/capsulas-good.json';

export function parseKnowledgeDemo(arg, lang = 'es') {
  const words = String(arg || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/);
  if (!['capsula', 'capsule'].includes(words[0])) return null;
  if (words.slice(1).some(w => !['conocimiento', 'knowledge', 'good', 'es', 'en', 'cerrar', 'close', 'help', 'ayuda'].includes(w))) {
    return {action:'help', lang};
  }
  return {action: words.some(w => ['cerrar','close'].includes(w)) ? 'close' : words.some(w => ['help','ayuda'].includes(w)) ? 'help' : 'play', lang: words.includes('en') ? 'en' : words.includes('es') ? 'es' : lang};
}

let active = null;
let requestVersion = 0;
export function closeKnowledgeDemo() {
  requestVersion += 1;
  if (!active) return;
  active.doc.removeEventListener('keydown', active.escape);
  active.video.pause();
  active.video.removeAttribute('src');
  active.video.load();
  active.dialog.close();
  active.dialog.remove();
  active = null;
}

export async function runKnowledgeDemo(arg, lang = 'es', {doc=document, fetcher=fetch} = {}) {
  const command = parseKnowledgeDemo(arg, lang);
  if (!command) return '';
  const en = command.lang === 'en';
  if (command.action === 'close') { closeKnowledgeDemo(); return en ? 'Capsule closed.' : 'Cápsula cerrada.'; }
  if (command.action === 'help') return '/demo capsula conocimiento good [es|en] · /demo capsula cerrar · /docs/capsula-conocimiento-good.md';
  closeKnowledgeDemo();
  const request = ++requestVersion;
  const response = await fetcher(BANK_URL, {cache:'no-store'});
  if (!response.ok) throw Error('capsulas-good.json HTTP ' + response.status);
  const bank = await response.json();
  if (request !== requestVersion) return en ? 'Capsule closed.' : 'Cápsula cerrada.';
  const capsule = bank.capsulas.find(c => c.tipo === 'conocimiento' && c.calidad === 'good');
  if (!capsule?.videos?.[command.lang]?.src) throw Error(en ? 'Capsule unavailable.' : 'Cápsula no disponible.');
  const dialog = doc.createElement('dialog');
  dialog.className = 'knowledge-capsule';
  dialog.style.cssText = 'position:fixed;inset:24px auto auto 50%;transform:translateX(-50%);z-index:100001;border:1px solid #405562;border-radius:18px;background:#071a24;color:#f6f1e7;width:min(400px,calc(100vw - 24px));box-sizing:border-box;padding:18px;max-height:85dvh;overflow:auto;font:16px system-ui,sans-serif;box-shadow:0 10px 80px #0009;';
  dialog.setAttribute('aria-label', capsule.titulo[command.lang]);
  const title = doc.createElement('h2'); title.textContent = capsule.titulo[command.lang]; title.style.cssText = 'font-size:20px;margin:0 0 12px;';
  const controls = doc.createElement('div'); controls.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0;';
  const video = doc.createElement('video');
  video.controls = true; video.playsInline = true; video.preload = 'metadata';
  video.poster = capsule.poster; video.src = capsule.videos[command.lang].src;
  video.style.cssText = 'display:block;width:100%;height:auto;max-height:60dvh;aspect-ratio:9/16;object-fit:contain;border:0;box-shadow:none;border-radius:10px;background:#000;';
  const status = doc.createElement('p'); status.setAttribute('role','status'); status.textContent = en ? 'GOOD · 30 seconds · €0' : 'GOOD · 30 segundos · 0 €';
  const switchLang = doc.createElement('button'); switchLang.type='button'; switchLang.textContent = en ? 'Español' : 'English';
  switchLang.onclick = () => { runKnowledgeDemo('capsula conocimiento good ' + (en ? 'es' : 'en'), command.lang, {doc,fetcher}).catch(e => { status.textContent = e.message; }); };
  const close = doc.createElement('button'); close.type='button'; close.textContent = en ? 'Close' : 'Cerrar'; close.onclick = closeKnowledgeDemo;
  const download = doc.createElement('a'); download.href = capsule.videos[command.lang].src; download.download = 'capsula-conocimiento-good-' + command.lang + '.mp4'; download.textContent = en ? 'Download MP4' : 'Descargar MP4'; download.style.color='#ffd166';
  controls.append(switchLang, download, close);
  dialog.append(title, video, controls, status);
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeKnowledgeDemo(); });
  const escape = e => { if (e.key === 'Escape') closeKnowledgeDemo(); };
  doc.body.append(dialog); active={dialog,video,doc,escape}; doc.addEventListener('keydown',escape); dialog.show();
  video.addEventListener('error', () => { status.textContent = en ? 'Video could not be loaded. Try the MP4 link.' : 'No se pudo cargar el vídeo. Prueba el enlace MP4.'; });
  try { await video.play(); } catch { status.textContent = en ? 'Press Play to watch with sound.' : 'Pulsa Play para verlo con sonido.'; }
  return (en ? 'Did you know…? · ' : '¿Sabías que…? · ') + capsule.titulo[command.lang] + '\nGOOD · 30 s · Nemotron Ultra · FLUX.1-schnell local · ' + (en ? 'Daniel · €0' : 'Mónica · 0 €');
}

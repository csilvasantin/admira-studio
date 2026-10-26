/* Cápsula ⇄ formato alterno (Carlos, 24-oct-2026).
 *
 * Al importar/subir una cápsula (vídeo o imagen) y etiquetarla con #capsula + un pilar de
 * Admira U (#negocio/#business · #creatividad/#creativity · #tecnologia/#technology), se genera
 * sola la orientación contraria (16:9 → 9:16 y al revés) y se guarda en el Stock con las mismas
 * etiquetas, así cae en «Cápsulas». Reutiliza el motor del Adaptador: FFmpeg WASM en el navegador
 * para vídeo (modo «blur»: encuadre centrado + fondo del propio vídeo desenfocado) y canvas para
 * imagen (mismo reencuadre). Sin IA ni servidor nuevo.
 *
 * Enlace: la alterna lleva externalRef = id del original y la etiqueta `par-<id original>`; el
 * original recibe también `par-<id>` si le cabe (tope 12). Anti-bucle: la alterna lleva
 * `formato-alterno` y nunca dispara otra generación. Se salta si ya existe una alterna.
 */
export const ALT_TAG = 'formato-alterno';
export const MAX_TAGS = 12;
export const norm = t => String(t ?? '').trim().replace(/^#+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const CAPSULE_TAGS = ['capsula', 'capsulas', 'capsule', 'capsules'];
export const PILLARS = {
  business: ['business', 'negocio', 'negocios'],
  creativity: ['creativity', 'creatividad', 'creativida'],
  technology: ['technology', 'tecnologia', 'tecnologias'],
};
const ORIENT_TAGS = ['vertical', 'horizontal', 'portrait', 'landscape', '9:16', '16:9'];
export const pairTag = id => 'par-' + String(id).toLowerCase().replace(/[^a-z0-9-]/g, '');
export const isCapsuleTag = t => CAPSULE_TAGS.includes(norm(t));
export function pillarOf(tags) {
  const n = (tags || []).map(norm);
  return Object.keys(PILLARS).find(p => PILLARS[p].some(x => n.includes(x))) || null;
}
export const isAlternate = it => (it?.tags || []).some(t => norm(t) === ALT_TAG);
export function qualifies(it) {
  if (!it || !['video', 'image'].includes(it.type) || isAlternate(it)) return false;
  const tags = it.tags || [];
  return tags.some(isCapsuleTag) && !!pillarOf(tags);
}
// Orientación contraria: solo horizontal ↔ vertical; un cuadrado no tiene alterna.
export function targetFor(w, h) {
  if (!(w > 0 && h > 0) || w === h) return null;
  return w > h ? {W: 1080, H: 1920, format: '9:16', orient: 'vertical'} : {W: 1920, H: 1080, format: '16:9', orient: 'horizontal'};
}
export function alreadyHasAlternate(it, items) {
  const p = pairTag(it.id);
  return (items || []).some(x => x && x.id !== it.id && (isAlternate(x) && (x.externalRef === it.id || (x.tags || []).some(t => norm(t) === p))));
}
// Etiquetas de la alterna: las del original sin las de orientación, + orientación nueva, marca y par.
// Si no caben 12, se recorta por el final pero cápsula y pilar se conservan siempre.
export function alternateTags(tags, target, id) {
  const base = (tags || []).filter(t => !ORIENT_TAGS.includes(norm(t)) && !norm(t).startsWith('par-') && norm(t) !== ALT_TAG);
  const must = [ALT_TAG, pairTag(id), target.orient];
  const keep = base.filter(t => isCapsuleTag(t) || Object.values(PILLARS).flat().includes(norm(t)));
  const rest = base.filter(t => !keep.includes(t));
  return [...keep, ...must, ...rest].slice(0, MAX_TAGS);
}
export function originalTagsWithPair(tags, id) {
  const p = pairTag(id);
  if ((tags || []).some(t => norm(t) === p) || (tags || []).length >= MAX_TAGS) return null;
  return [...tags, p];
}

// ── Navegador ───────────────────────────────────────────────────────────────
function mediaSize(it) {
  const w = +(it.ancho || it.validacion?.ancho || it.dimensions?.width || 0), h = +(it.alto || it.validacion?.alto || it.dimensions?.height || 0);
  if (w && h) return Promise.resolve({w, h});
  return new Promise((resolve, reject) => {
    if (it.type === 'image') { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve({w: img.naturalWidth, h: img.naturalHeight}); img.onerror = () => reject(new Error('media')); img.src = it.url; }
    else { const v = document.createElement('video'); v.preload = 'metadata'; v.crossOrigin = 'anonymous'; v.onloadedmetadata = () => resolve({w: v.videoWidth, h: v.videoHeight, d: v.duration}); v.onerror = () => reject(new Error('media')); v.src = it.url; }
  });
}
async function renderImage(it, t) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('media')); i.src = it.url; });
  const c = document.createElement('canvas'); c.width = t.W; c.height = t.H; const g = c.getContext('2d');
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const cover = Math.max(t.W / sw, t.H / sh) * 1.1, fit = Math.min(t.W / sw, t.H / sh);
  g.filter = `blur(${Math.round(14 * Math.max(t.W, t.H) / 384)}px) brightness(0.85)`;
  g.drawImage(img, (t.W - sw * cover) / 2, (t.H - sh * cover) / 2, sw * cover, sh * cover);
  g.filter = 'none';
  g.drawImage(img, (t.W - sw * fit) / 2, (t.H - sh * fit) / 2, sw * fit, sh * fit);
  return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encoding')), 'image/png'));
}
// Un solo motor FFmpeg WASM para cápsula alterna y subtítulos (capsula-traduce.mjs): engine.encode
// cancela el trabajo anterior si se le llama en paralelo, así que todo pasa por esta cola.
let engine = null, tail = Promise.resolve();
export async function sharedEngine() {
  const {createEngine} = await import('/adaptaciones/adapter-export.js?v=20261026-probe');
  return (engine ||= createEngine());
}
export function ffmpegQueue(fn) { const run = tail.then(fn, fn); tail = run.catch(() => {}); return run; }
async function renderVideo(it, t, size, onStatus) {
  const {exportJob} = await import('/adaptaciones/adapter-core.mjs');
  await sharedEngine();
  const job = exportJob({ancho: size.w, alto: size.h}, {ancho: t.W, alto: t.H, techoKbps: 6000, h264: 'high@4.1'}, {fps: 25, bitrateKbps: 6000}, 'blur', {fx: .5, fy: .5, zoom: 1}, it.title || 'capsula', t.format.replace(':', 'x'));
  let out = null;
  await ffmpegQueue(() => engine.encode(it.url, job, onStatus || (() => {}), (_, blob) => { out = blob; }));
  if (!out) throw new Error('encoding');
  return out;
}
const running = new Set();
// Genera la alterna de `it` si toca. ctx: {items, saveTags(id,tags), onStatus(text), onCreated(id)}.
export async function maybeGenerateAlternate(it, ctx = {}) {
  if (!qualifies(it) || !it.url || running.has(it.id)) return {skipped: 'no-aplica'};
  if (alreadyHasAlternate(it, ctx.items)) return {skipped: 'ya-existe'};
  if ((it.tags || []).some(t => norm(t) === pairTag(it.id))) return {skipped: 'ya-existe'};
  running.add(it.id);
  const say = s => { try { ctx.onStatus?.(s); } catch (_) {} };
  try {
    const size = await mediaSize(it);
    const t = targetFor(size.w, size.h);
    if (!t) return {skipped: 'cuadrado'};
    say(`🔁 cápsula: generando versión ${t.format}…`);
    const blob = it.type === 'image' ? await renderImage(it, t) : await renderVideo(it, t, size, s => s.phase === 'encoding' && say(`🔁 cápsula ${t.format}: ${Math.round((s.progress || 0) * 100)} %`));
    const {publishAdaptation} = await import('/adaptaciones/stock-publish.mjs');
    const title = [String(it.title || '').trim() || 'Cápsula', t.format].join(' · ').slice(0, 300);
    const r = await publishAdaptation(blob, {title, originId: it.id, format: t.format, width: t.W, height: t.H, duration: size.d, type: it.type},
      {tags: alternateTags(it.tags, t, it.id), externalRef: it.id, comment: `Formato alterno ${t.format} de ${it.id}`});
    if (!r.ok) throw new Error(r.error || 'publish');
    const orig = originalTagsWithPair(it.tags || [], it.id);
    if (orig && ctx.saveTags) await ctx.saveTags(it.id, orig, {silent: true});
    say(`✓ cápsula: versión ${t.format} guardada en Cápsulas`);
    try { ctx.onCreated?.(r.id); } catch (_) {}
    return {ok: true, id: r.id, format: t.format};
  } catch (e) {
    say(`// cápsula: no se pudo generar la versión alterna (${String(e?.message || e).slice(0, 60)})`);
    return {ok: false, error: String(e?.message || e)};
  } finally { running.delete(it.id); }
}

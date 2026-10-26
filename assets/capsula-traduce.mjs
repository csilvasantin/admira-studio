/* Cápsula #traduce / #translate (Carlos, 24-oct-2026).
 *
 * #traduce  → el vídeo está en inglés  → se le queman subtítulos en castellano abajo.
 * #translate → el vídeo está en castellano → se le queman subtítulos en inglés abajo.
 * Sin mayúsculas ni tildes (mismo `norm` que capsula-alterna.mjs).
 *
 * La versión subtitulada se guarda en el Stock como vídeo nuevo con las etiquetas del original +
 * `subtitulado-es` / `subtitulado-en` + `par-<id original>` y externalRef = id del original.
 * Anti-bucle: un vídeo con `subtitulado-*` nunca vuelve a pedir subtítulos. Se salta si ya existe.
 *
 * Automático desde el 24-oct-2026 (noche): audio con FFmpeg WASM → /stock-subtitles (Workers AI
 * whisper-large-v3-turbo + m2m100-1.2b) → quemado con libass en el navegador → /stock-publish.
 * Si algo falla, la insignia «subtítulos XX pendientes» sigue ahí y copia el encargo para la caja.
 */
import {norm, pairTag, isCapsuleTag, PILLARS, ALT_TAG, MAX_TAGS} from './capsula-alterna.mjs';

const ES_SUBS = {from: 'en', to: 'es'}, EN_SUBS = {from: 'es', to: 'en'};
// Alias (24-oct-2026, Carlos importó con #traducir y no pasó nada): palabra española → subtítulos ES
// a un vídeo en inglés; palabra inglesa → subtítulos EN a un vídeo en castellano.
export const DIRECTIONS = Object.fromEntries([
  ...['traduce', 'traducir', 'traduccion', 'traducido', 'traducelo', 'traduceme', 'traducir-es', 'traduce-es', 'traducir-al-espanol',
    'traducir-castellano', 'traduccion-es', 'subtitular', 'subtitula', 'subtitulos', 'subtitulos-es', 'subtitular-es'].map(k => [k, ES_SUBS]),
  ...['translate', 'translation', 'translated', 'translate-en', 'translate-to-english', 'translate-english', 'subtitles',
    'subtitles-en', 'english-subtitles', 'subtitle-en'].map(k => [k, EN_SUBS]),
  // An explicit destination never flips to English when the audio is Spanish.
  // Without an audio-language hint, let Whisper detect the actual language.
  ...['subtitulos-es', 'subtitular-es'].map(k => [k, {from: 'auto', to: 'es'}]),
  ...['subtitles-en', 'subtitle-en'].map(k => [k, {from: 'auto', to: 'en'}]),
]);
export const SUB_PREFIX = 'subtitulado-';
export const subTag = lang => SUB_PREFIX + lang;
const LANG = {es: 'es', spa: 'es', spanish: 'es', espanol: 'es', castellano: 'es', en: 'en', eng: 'en', english: 'en', ingles: 'en'};
export const langOf = it => LANG[norm(String(it?.lang || it?.language || it?.audioLang || '').split(/[-_]/)[0])] || null;
// Etiquetas efectivas: las del campo Etiquetas + los #hashtags escritos en Comentarios/título al importar.
export function tagsOf(it) {
  const hash = `${it?.comment || ''} ${it?.title || ''}`.match(/#[\p{L}\p{N}_-]+/gu) || [];
  return [...(it?.tags || []), ...hash];
}
// Explicit subtitle-language tags keep their destination. Legacy #traduce /
// #translate retain the opposite-language behavior when an audio hint is known.
export function directionOf(tags, lang) {
  const explicit = (tags || []).map(t => DIRECTIONS[norm(t)]).find(d => d?.from === 'auto');
  if (explicit) return {from: lang || 'auto', to: explicit.to};
  let d = null;
  for (const t of tags || []) { d = DIRECTIONS[norm(t)]; if (d) break; }
  if (!d) return null;
  if (lang === 'es') return EN_SUBS;
  if (lang === 'en') return ES_SUBS;
  return d;
}
export const isSubtitled = it => tagsOf(it).some(t => norm(t).startsWith(SUB_PREFIX));
export const qualifiesTranslation = it => !!it && it.type === 'video' && !isSubtitled(it) && !!directionOf(tagsOf(it), langOf(it));
export function alreadySubtitled(it, items) {
  const p = pairTag(it.id);
  const dir = directionOf(tagsOf(it), langOf(it));
  if (!dir) return false;
  return (items || []).some(x => x && x.id !== it.id && isSubtitled(x) && !(x.tags || []).some(t => norm(t) === ALT_TAG)
    && (x.tags || []).some(t => norm(t) === subTag(dir.to))
    && (x.externalRef === it.id || (x.tags || []).some(t => norm(t) === p)));
}
// Etiquetas de la subtitulada: cápsula, pilar y #traduce/#translate siempre; luego marca y par; tope 12.
export function subtitledTags(tags, dir, id) {
  const base = (tags || []).filter(t => !norm(t).startsWith('par-') && !norm(t).startsWith(SUB_PREFIX) && norm(t) !== ALT_TAG);
  const keep = base.filter(t => isCapsuleTag(t) || Object.values(PILLARS).flat().includes(norm(t)) || DIRECTIONS[norm(t)]);
  const rest = base.filter(t => !keep.includes(t));
  const required = [subTag(dir.to), ...(id ? [pairTag(id)] : [])];
  return [...keep.slice(0, MAX_TAGS - required.length), ...required, ...rest].slice(0, MAX_TAGS);
}

// ── SRT ─────────────────────────────────────────────────────────────────────
const ts = s => { const m = /(\d+):(\d\d):(\d\d)[,.](\d{1,3})/.exec(s); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000 : NaN; };
const fmt = x => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
export function parseSrt(text) {
  return String(text || '').replace(/\r/g, '').split(/\n{2,}/).map(b => {
    const lines = b.trim().split('\n'); const i = lines.findIndex(l => l.includes('-->'));
    if (i < 0) return null; const [a, z] = lines[i].split('-->');
    const start = ts(a), end = ts(z), txt = lines.slice(i + 1).join('\n').trim();
    return Number.isFinite(start) && Number.isFinite(end) && end > start && txt ? {start, end, text: txt} : null;
  }).filter(Boolean);
}
export const toSrt = cues => cues.map((c, n) => `${n + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join('\n');
// Estilo del quemado (caja: ffmpeg subtitles=…:force_style=…): blanco, caja oscura, márgenes seguros.
export const BURN_STYLE = 'FontName=DejaVu Sans,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H60000000,BackColour=&H99000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2';

// ── Navegador ───────────────────────────────────────────────────────────────
// Automático (24-oct-2026, tarde): FFmpeg WASM extrae el audio → /stock-subtitles (Workers AI:
// whisper + m2m100) devuelve el SRT traducido → FFmpeg WASM lo quema (libass, fuente empaquetada
// /assets/fonts/DejaVuSans-Bold.ttf) → /stock-publish con subtitulado-xx + par-<id>.
export const MAX_SECONDS = 180;
export const SUBTITLES_URL = '/stock-subtitles';
export const FONT_URL = '/assets/fonts/DejaVuSans-Bold.ttf';
export const audioArgs = () => ['-i', 'input', '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', '-t', String(MAX_SECONDS), '-y', 'audio.mp3'];
// Tamaño relativo a PlayRes 384×288 de libass: legible en 16:9 y en 9:16 sin tapar el centro.
export function burnArgs(w, h) {
  const vertical = h > w, size = vertical ? 11 : 16, margin = vertical ? 38 : 22;
  const style = `${BURN_STYLE},Fontsize=${size},MarginV=${margin},MarginL=18,MarginR=18`;
  // Subtitle burn requires a video encode. Keep the source dimensions/frame rate,
  // use a high-quality CRF, and copy the original audio without another lossy pass.
  return ['-i', 'input', '-vf', `subtitles=subs.srt:fontsdir=fonts:force_style='${style}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-y', 'output.mp4'];
}
const b64 = async blob => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
};
function videoMeta(it) {
  // Reading duration/dimensions does not require a CORS-enabled media element.
  // Keep the same loading mode as Stock's player; the encoder fetches bytes with
  // CORS separately. A cached non-CORS player response can reject an anonymous load.
  return new Promise((resolve, reject) => { const v = document.createElement('video'); v.preload = 'metadata';
    const finish = (error, meta) => { clearTimeout(timer); v.onloadedmetadata = v.onerror = null; v.removeAttribute('src'); v.load(); error ? reject(error) : resolve(meta); };
    const timer = setTimeout(() => finish(new Error('media-timeout')), 15000);
    v.onloadedmetadata = () => finish(null, {w: v.videoWidth, h: v.videoHeight, d: v.duration});
    v.onerror = () => finish(new Error('media')); v.src = it.url; });
}
const running = new Set();
// ctx: {items, onStatus(text), onCreated(id), fetch}; optional media/engine/publisher adapters.
// Devuelve {ok,id} | {skipped} | {ok:false,error}.
export async function maybeSubtitle(it, ctx = {}) {
  if (!qualifiesTranslation(it)) return {skipped: 'no-aplica'};
  if (alreadySubtitled(it, ctx.items)) return {skipped: 'ya-existe'};
  if (!it.url) return {skipped: 'sin-url'};
  if (running.has(it.id)) return {skipped: 'en-curso'};
  const dir = directionOf(tagsOf(it), langOf(it));
  const say = s => { try { ctx.onStatus?.(s); } catch (_) {} };
  const f = ctx.fetch || ((...a) => fetch(...a));
  running.add(it.id);
  try {
    const meta = await (ctx.videoMeta || videoMeta)(it);
    if (![meta.w, meta.h, meta.d].every(n => Number.isFinite(n) && n > 0)) throw new Error('media-metadata');
    if (meta.d > MAX_SECONDS) { say(`// 🈯 subtítulos: el vídeo dura ${Math.round(meta.d)} s; el automático llega hasta ${MAX_SECONDS} s`); return {skipped: 'largo'}; }
    const {sharedEngine, ffmpegQueue} = await import('./capsula-alterna.mjs');
    const engine = ctx.engine || await sharedEngine();
    say(`🈯 subtítulos ${dir.to.toUpperCase()}: extrayendo audio…`);
    let audio = null;
    await ffmpegQueue(() => engine.encode(it.url, {args: audioArgs(), outputs: [{file: 'audio.mp3'}]}, () => {}, (_, b) => { audio = b; }));
    if (!audio?.size) throw new Error('audio');
    say(`🈯 subtítulos ${dir.to.toUpperCase()}: transcribiendo y traduciendo…`);
    const r = await f(SUBTITLES_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({audio: await b64(audio), ...(dir.from !== 'auto' ? {from: dir.from} : {}), to: dir.to})});
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.error || ('HTTP ' + r.status));
    if (d.to !== dir.to) throw new Error('subtitle-language');
    if (!d.cues?.length) { say('// 🈯 subtítulos: no se ha detectado voz en el vídeo'); return {skipped: 'sin-voz'}; }
    if (!Array.isArray(d.cues) || d.cues.some(c => !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.start < 0 || c.end <= c.start || c.end > meta.d + .25 || typeof c.text !== 'string' || !c.text.trim())) throw new Error('subtitle-cues');
    const srt = toSrt(d.cues);
    const srtURL = URL.createObjectURL(new Blob([srt], {type: 'text/plain'}));
    let out = null;
    try {
      await ffmpegQueue(() => engine.encode(it.url, {args: burnArgs(meta.w, meta.h), durationSeconds: meta.d,
        extraFiles: [{name: 'subs.srt', url: srtURL}, {name: 'fonts/DejaVuSans-Bold.ttf', url: FONT_URL}]},
        s => s.phase === 'encoding' && say(`🈯 subtítulos ${dir.to.toUpperCase()}: quemando ${Math.round((s.progress || 0) * 100)} %`), (_, b) => { out = b; }));
    } finally { URL.revokeObjectURL(srtURL); }
    if (!out) throw new Error('encoding');
    const publishAdaptation = ctx.publish || (await import('/adaptaciones/stock-publish.mjs')).publishAdaptation;
    const title = [String(it.title || '').trim() || 'Vídeo', `subtítulos ${dir.to.toUpperCase()}`].join(' · ').slice(0, 300);
    const p = await publishAdaptation(out, {title, originId: it.id, format: `subtitulado-${dir.to}`, width: meta.w, height: meta.h, duration: meta.d, type: 'video'},
      {tags: subtitledTags(tagsOf(it), dir, it.id), externalRef: it.id, comment: `Subtítulos ${String(d.from || 'auto').toUpperCase()}→${dir.to.toUpperCase()} (Workers AI) de ${it.id}\n\n${srt}`.slice(0, 4000)});
    if (!p.ok) throw new Error(p.error || 'publish');
    say(`✓ subtítulos ${dir.to.toUpperCase()} quemados y guardados (${d.cues.length} frases)`);
    try { ctx.onCreated?.(p.id); } catch (_) {}
    return {ok: true, id: p.id, cues: d.cues.length};
  } catch (e) {
    say(`// 🈯 subtítulos ${dir.to.toUpperCase()}: no se pudieron generar (${String(e?.message || e).slice(0, 60)}) · clic en la insignia para copiar el encargo`);
    return {ok: false, error: String(e?.message || e)};
  } finally { running.delete(it.id); }
}

// Insignia visible en la tarjeta mientras falten los subtítulos (clic = copiar el encargo para la caja).
export function pendingInfo(it, items) {
  if (!qualifiesTranslation(it) || alreadySubtitled(it, items)) return null;
  const dir = directionOf(tagsOf(it), langOf(it));
  return {...dir, running: running.has(it.id), label: `🈯 subtítulos ${dir.to.toUpperCase()} ${running.has(it.id) ? 'en curso' : 'pendientes'}`,
    encargo: `Subtitular ${dir.from.toUpperCase()}→${dir.to.toUpperCase()} el vídeo ${it.id} del Stock (${it.prompt || it.url || ''}): transcribir, traducir, quemar abajo y publicar con ${subTag(dir.to)} + ${pairTag(it.id)}`};
}

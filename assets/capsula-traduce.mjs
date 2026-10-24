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
 * HUECO (24-oct-2026): Studio no tiene motor de transcripción/traducción (ni binding Workers AI
 * ni ruta de servidor), y en el navegador no es realista. Por eso aquí vive la detección, las
 * etiquetas y el formato SRT; si hay SRT (ctx.srt) se publica junto al vídeo, y si no, el Stock
 * avisa de que los subtítulos quedan pendientes y se generan fuera (caja: ffmpeg + libass).
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
// Si se conoce el idioma real del audio, manda él: los subtítulos van siempre al idioma contrario.
export function directionOf(tags, lang) {
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
  return (items || []).some(x => x && x.id !== it.id && isSubtitled(x) && !(x.tags || []).some(t => norm(t) === ALT_TAG)
    && (x.externalRef === it.id || (x.tags || []).some(t => norm(t) === p)));
}
// Etiquetas de la subtitulada: cápsula, pilar y #traduce/#translate siempre; luego marca y par; tope 12.
export function subtitledTags(tags, dir, id) {
  const base = (tags || []).filter(t => !norm(t).startsWith('par-') && !norm(t).startsWith(SUB_PREFIX) && norm(t) !== ALT_TAG);
  const keep = base.filter(t => isCapsuleTag(t) || Object.values(PILLARS).flat().includes(norm(t)) || DIRECTIONS[norm(t)]);
  const rest = base.filter(t => !keep.includes(t));
  return [...keep, subTag(dir.to), ...(id ? [pairTag(id)] : []), ...rest].slice(0, MAX_TAGS);
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
export const BURN_STYLE = 'FontName=DejaVu Sans,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2';

// ── Navegador ───────────────────────────────────────────────────────────────
// ctx: {items, onStatus(text)}. Hoy solo avisa (no hay motor de voz→texto en Studio).
export async function maybeSubtitle(it, ctx = {}) {
  if (!qualifiesTranslation(it)) return {skipped: 'no-aplica'};
  if (alreadySubtitled(it, ctx.items)) return {skipped: 'ya-existe'};
  const dir = directionOf(tagsOf(it), langOf(it));
  try { ctx.onStatus?.(`// #${dir.to === 'es' ? 'traduce' : 'translate'}: subtítulos ${dir.to.toUpperCase()} pendientes · se generan fuera del navegador y se guardan con ${subTag(dir.to)} + ${pairTag(it.id)}`); } catch (_) {}
  return {pending: true, from: dir.from, to: dir.to};
}

// Insignia visible en la tarjeta mientras falten los subtítulos (clic = copiar el encargo para la caja).
export function pendingInfo(it, items) {
  if (!qualifiesTranslation(it) || alreadySubtitled(it, items)) return null;
  const dir = directionOf(tagsOf(it), langOf(it));
  return {...dir, label: `🈯 subtítulos ${dir.to.toUpperCase()} pendientes`,
    encargo: `Subtitular ${dir.from.toUpperCase()}→${dir.to.toUpperCase()} el vídeo ${it.id} del Stock (${it.prompt || it.url || ''}): transcribir, traducir, quemar abajo y publicar con ${subTag(dir.to)} + ${pairTag(it.id)}`};
}

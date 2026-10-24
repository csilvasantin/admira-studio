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

export const DIRECTIONS = {
  traduce: {from: 'en', to: 'es'}, traducir: {from: 'en', to: 'es'}, traduccion: {from: 'en', to: 'es'},
  translate: {from: 'es', to: 'en'}, translation: {from: 'es', to: 'en'},
};
export const SUB_PREFIX = 'subtitulado-';
export const subTag = lang => SUB_PREFIX + lang;
export function directionOf(tags) {
  for (const t of tags || []) { const d = DIRECTIONS[norm(t)]; if (d) return d; }
  return null;
}
export const isSubtitled = it => (it?.tags || []).some(t => norm(t).startsWith(SUB_PREFIX));
export const qualifiesTranslation = it => !!it && it.type === 'video' && !isSubtitled(it) && !!directionOf(it.tags);
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
  const dir = directionOf(it.tags);
  try { ctx.onStatus?.(`// #${dir.to === 'es' ? 'traduce' : 'translate'}: subtítulos ${dir.to.toUpperCase()} pendientes · se generan fuera del navegador y se guardan con ${subTag(dir.to)} + ${pairTag(it.id)}`); } catch (_) {}
  return {pending: true, from: dir.from, to: dir.to};
}

/* Etiquetas funcionales (Carlos, 24-oct-2026): «las que solo etiquetan, normal; las que realizan una
 * función como ordenar, clasificar o traducir, en negrita» — así se ve al momento si #traducir se ha
 * escrito bien. Lista ÚNICA para todo el Stock (tarjetas, editor, vista previa de importar).
 * Las marcas que pone el sistema (par-<id>, formato-alterno, subtitulado-xx) no son funciones del
 * usuario: se pintan normales, solo con un title que explica de dónde salen.
 */
import {norm, CAPSULE_TAGS, PILLARS, ALT_TAG} from './capsula-alterna.mjs';
import {DIRECTIONS, SUB_PREFIX} from './capsula-traduce.mjs';
import {FORMAT_TAGS, SUBTITLE_OFF} from './importer-options.mjs';

const PILLAR_ES = {business: 'Negocio', creativity: 'Creatividad', technology: 'Tecnología'};
const FUNCIONES = new Map();
const add = (keys, kind, title) => keys.forEach(k => FUNCIONES.set(norm(k), {kind, title}));
for (const [k, d] of Object.entries(DIRECTIONS))
  add([k], 'traducir', `Traduce: transcribe el audio (${d.from === 'auto' ? 'idioma detectado automáticamente' : d.from.toUpperCase()}), lo traduce al ${d.to === 'es' ? 'castellano' : 'inglés'} si hace falta y guarda una copia con subtítulos ${d.to.toUpperCase()} quemados`);
add(CAPSULE_TAGS, 'capsula', 'Clasifica en «Cápsulas». Con un pilar (#negocio, #creatividad, #tecnologia) genera además la versión en la otra orientación (16:9 ⇄ 9:16)');
add(['sabiasque', 'sabias-que'], 'capsula', 'Clasifica el vídeo en «Cápsulas» («¿Sabías que?»)');
for (const [p, keys] of Object.entries(PILLARS))
  add(keys, 'pilar', `Pilar ${PILLAR_ES[p]} de Admira U. Con #capsula genera la versión en la otra orientación (16:9 ⇄ 9:16)`);
add(['furni', 'mobiliario'], 'clasifica', 'Clasifica en «Mobiliario»');
add(['tiktok'], 'clasifica', 'Clasifica en «TikToks»');
add(['twin-npc'], 'clasifica', 'Clasifica en «Gemelos · NPC» (Anonimizador)');
add(['digital-twin'], 'clasifica', 'Clasifica en «Gemelos · persona sintética» (Anonimizador)');
add(['catalogo'], 'clasifica', 'Agrupa el contenido en su catálogo');
add([SUBTITLE_OFF], 'subtitulos', 'Conserva la voz y omite la generación de subtítulos para esta importación');
add([FORMAT_TAGS.original], 'formato', 'Conserva el formato original sin generar una orientación alterna');
add([FORMAT_TAGS.vertical], 'formato', 'Crea una copia vertical 9:16 sin recortar la imagen y conservando la voz');
add([FORMAT_TAGS.horizontal], 'formato', 'Crea una copia horizontal 16:9 sin recortar la imagen y conservando la voz');
add([FORMAT_TAGS.both], 'formato', 'Prepara vertical 9:16 y horizontal 16:9; reutiliza el original si ya tiene uno de esos formatos');

export const FUNCTIONAL_TAGS = Object.freeze(Object.fromEntries(FUNCIONES));
export function functionalTag(t) { return FUNCIONES.get(norm(t)) || null; }
export const isFunctionalTag = t => !!functionalTag(t);
// Marcas automáticas: informativas, no negrita.
export function systemTag(t) {
  const n = norm(t);
  if (n.startsWith('par-')) return {title: 'Marca automática: enlaza este contenido con su pareja (versión alterna o subtitulada)'};
  if (n === ALT_TAG) return {title: 'Marca automática: versión en la otra orientación generada desde una cápsula'};
  if (n.startsWith(SUB_PREFIX)) return {title: `Marca automática: copia con subtítulos ${n.slice(SUB_PREFIX.length).toUpperCase()} quemados`};
  return null;
}
// Clase y title para un chip: {cls:'stock-tag-fn'|'', title:string|null}.
export function tagChip(t) {
  const f = functionalTag(t);
  if (f) return {cls: 'stock-tag-fn', title: '⚙ ' + f.title};
  const s = systemTag(t);
  return {cls: s ? 'stock-tag-sys' : '', title: s ? s.title : null};
}

// Functional requests carried by the existing Importer tags, without new permissions.
const norm = value => String(value || '').trim().replace(/^#+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const SUBTITLE_OFF = 'sin-subtitulos';
export const FORMAT_TAGS = {original: 'formato-original', vertical: 'adaptar-vertical', horizontal: 'adaptar-horizontal', both: 'adaptar-ambos'};
export const isFormatRequestTag = tag => Object.values(FORMAT_TAGS).includes(norm(tag));
export function formatRequest(tags) {
  const values = (tags || []).map(norm);
  return Object.keys(FORMAT_TAGS).find(key => values.includes(FORMAT_TAGS[key])) || null;
}
export function waitsForSubtitles(tags) {
  const values = (tags || []).map(norm);
  return !values.includes(SUBTITLE_OFF) && !values.some(t => t.startsWith('subtitulado-'))
    && values.some(t => ['subtitulos-es', 'subtitular-es', 'subtitles-en', 'subtitle-en'].includes(t));
}

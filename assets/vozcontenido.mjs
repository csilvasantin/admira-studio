/* VozContenido / Voice Content (9-nov-2026, Neo).
 * Vídeo del Stock + texto (escrito o dictado) → voz IA (/stock-video-voice) →
 * vídeo nuevo con voz, grabado en el navegador y guardado en el Stock con la
 * etiqueta `vozcontenido` + `storeos`, para que storeos.com lo recoja. */
export const VOZ_TAG = 'vozcontenido';
export const STOREOS_TAG = 'storeos';
export const MAX_TEXT = 5000;

export function textos(lang) {
  const en = lang === 'en';
  const t = (es, e) => en ? e : es;
  return {
    name: t('VozContenido', 'Voice Content'),
    intro: t('Elige un vídeo del Stock, escribe o dicta el mensaje y Admira le pone voz. El resultado se guarda en el Stock y aparece en storeos.com.',
      'Pick a Stock video, type or dictate the message and Admira gives it a voice. The result is saved to Stock and shows up on storeos.com.'),
    step1: t('1 · Vídeo del Stock', '1 · Stock video'), step2: t('2 · Mensaje', '2 · Message'), step3: t('3 · Voz y vídeo', '3 · Voice and video'),
    search: t('Buscar vídeo…', 'Search video…'), loading: t('Cargando vídeos…', 'Loading videos…'), none: t('Sin vídeos', 'No videos'),
    placeholder: t('Escribe aquí lo que dirá la voz…', 'Type what the voice will say…'),
    dictate: t('🎙 Dictar', '🎙 Dictate'), stop: t('■ Parar', '■ Stop'), noDictation: t('Este navegador no permite dictar; escribe el texto.', 'This browser cannot dictate; type the text.'),
    voice: t('Generar voz', 'Generate voice'), create: t('Crear VozContenido', 'Create Voice Content'),
    needVideo: t('Elige primero un vídeo.', 'Pick a video first.'), needText: t('Escribe o dicta el mensaje.', 'Type or dictate the message.'),
    voicing: t('Generando voz…', 'Generating voice…'), voiced: t('Voz lista. Pulsa ▶ para escucharla sobre el vídeo.', 'Voice ready. Press ▶ to hear it over the video.'),
    recording: t('Grabando vídeo con voz…', 'Recording video with voice…'), saving: t('Guardando en el Stock…', 'Saving to Stock…'),
    done: t('✓ Guardado en el Stock. Saldrá en storeos.com.', '✓ Saved to Stock. It will show up on storeos.com.'),
    open: t('Abrir en Stock', 'Open in Stock'), download: t('Descargar', 'Download'), error: t('Error: ', 'Error: ')
  };
}

export function videoItems(items, query = '') {
  const q = String(query).trim().toLowerCase();
  return (items || []).filter(it => it && it.id && it.url && (it.type === 'video' || /^video\//.test(it.mime || '')))
    .filter(it => !q || [it.title, ...(it.tags || [])].join(' ').toLowerCase().includes(q));
}

export function sourceURL(item) {
  return /^[a-zA-Z0-9-]{1,100}$/.test(String(item?.id || ''))
    ? 'https://api.admira.store/stock/asset/' + encodeURIComponent(item.id) : item.url;
}

export function voiceRequest(text, lang) {
  const clean = String(text || '').trim();
  if (!clean) throw Error('text-required');
  if (clean.length > MAX_TEXT) throw Error('text-too-long');
  return {text: clean, language: lang === 'en' ? 'en' : 'es'};
}

export function recorderMime(isSupported = t => globalThis.MediaRecorder?.isTypeSupported?.(t)) {
  for (const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']) if (isSupported(m)) return m;
  return '';
}

export function publishMeta(item, {lang, text, width, height, duration, mime}) {
  const name = textos(lang).name;
  return {
    meta: {title: `${name} · ${item.title || item.id}`.slice(0, 160), originId: item.id, format: VOZ_TAG, width, height, duration, type: 'video'},
    extra: {
      tags: [VOZ_TAG, STOREOS_TAG, `voz-${lang === 'en' ? 'en' : 'es'}`, `par-${item.id}`],
      externalRef: item.id, mime: String(mime || 'video/mp4').split(';')[0],
      comment: `${name} (${lang === 'en' ? 'EN' : 'ES'}): ${String(text).trim().slice(0, 400)}`
    }
  };
}

// Comprobación de un mp4 renderizado frente a lo esperado. Sin ffmpeg aquí: recibe medidas.
export const comprobarMedidas = ({ duracionSeg, esperadaSeg, ancho, alto, anchoEsperado, altoEsperado, mediaDb, silencios = [], pistas = [] }, { toleranciaSeg = 0.5, minDb = -30, silencioMaxSeg = 2 } = {}) => {
  const problemas = [];
  if (!Number.isFinite(duracionSeg)) problemas.push('sin duración');
  else if (Math.abs(duracionSeg - esperadaSeg) > toleranciaSeg) problemas.push(`dura ${duracionSeg.toFixed(2)} s y se esperaban ${esperadaSeg.toFixed(2)} s`);
  if (ancho !== anchoEsperado || alto !== altoEsperado) problemas.push(`tamaño ${ancho}×${alto}, se esperaba ${anchoEsperado}×${altoEsperado}`);
  if (!pistas.includes('video')) problemas.push('sin pista de vídeo');
  if (!pistas.includes('audio')) problemas.push('sin pista de audio');
  if (Number.isFinite(mediaDb) && mediaDb < minDb) problemas.push(`audio bajo: media ${mediaDb} dB (mínimo ${minDb})`);
  const largo = silencios.filter((s) => s.fin - s.inicio > silencioMaxSeg && s.inicio > 0.5 && s.fin < duracionSeg - 1.5);
  if (largo.length) problemas.push(`silencio de ${(largo[0].fin - largo[0].inicio).toFixed(1)} s en ${largo[0].inicio.toFixed(1)} s`);
  return { ok: problemas.length === 0, problemas };
};

// Trocea la salida de ffmpeg silencedetect en tramos {inicio, fin}.
export const silenciosDe = (stderr) => {
  const ini = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const fin = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  return ini.map((i, k) => ({ inicio: i, fin: fin[k] ?? Infinity }));
};

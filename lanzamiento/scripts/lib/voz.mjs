// Ayudantes de voz: palabras con tiempos a partir de la alineación por caracteres, y rellenar el guion.

// alignment.{chars,starts,ends} (segundos por carácter) → palabras con startMs/endMs.
export const palabrasDesdeAlineacion = ({ chars = [], starts = [], ends = [] } = {}) => {
  const palabras = [];
  let cur = null;
  chars.forEach((c, i) => {
    if (c === ' ' || c === '\n') { if (cur) { palabras.push(cur); cur = null; } return; }
    const s = Math.round(Number(starts[i]) * 1000), e = Math.round(Number(ends[i]) * 1000);
    if (!cur) cur = { text: c, startMs: s, endMs: e };
    else { cur.text += c; cur.endMs = e; }
  });
  if (cur) palabras.push(cur);
  return palabras;
};

export const duracionMs = (palabras) => (palabras.length ? palabras[palabras.length - 1].endMs : 0);

// guion (sin tiempos) + resultados por id {fichero, palabras} → lanzamiento (con tiempos).
export const rellenarGuion = (guion, resultados) => {
  const lineas = guion.lineas.map((l) => {
    const r = resultados[l.id];
    if (!r || !r.palabras?.length) throw new Error(`línea ${l.id}: sin voz`);
    return { id: l.id, quien: l.quien, text: l.text, fichero: r.fichero, durMs: duracionMs(r.palabras), palabras: r.palabras };
  });
  const { idioma, ...resto } = guion;
  return { ...resto, lineas, marca: { ...guion.marca }, nombre: guion.nombre };
};

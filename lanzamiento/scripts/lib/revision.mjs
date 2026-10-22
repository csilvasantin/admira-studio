// Ayudantes de revisión: fotogramas clave por escena y comprobaciones con parada.
import { planificar } from '../../src/guion.ts';
import { validarLanzamiento, PROHIBIDAS } from '../../src/props.ts';

// Un fotograma por escena, a mitad de su duración (donde ya se ve todo lo que entra animado).
export const fotogramasClave = (lanzamiento) => {
  const { escenas } = planificar(lanzamiento);
  return escenas.map((e) => ({ id: e.id, frame: e.desde + Math.floor(e.frames * 0.55) }));
};

// Comprobaciones sin red ni render: datos válidos, ficheros presentes, duración razonable.
// Devuelve {ok, problemas[], avisos[], duracionSeg, fotogramas[]}; `existe(ruta)` la aporta quien llama.
export const comprobar = (datos, { existe, duracionMaxSeg = 120, duracionMinSeg = 20 } = {}) => {
  const problemas = [], avisos = [];
  let l;
  try { l = validarLanzamiento(datos); } catch (e) { return { ok: false, problemas: [String(e.message || e)], avisos, duracionSeg: 0, fotogramas: [] }; }
  const { total } = planificar(l);
  const duracionSeg = total / l.fps;
  if (duracionSeg > duracionMaxSeg) problemas.push(`dura ${duracionSeg.toFixed(1)} s, más de ${duracionMaxSeg}`);
  if (duracionSeg < duracionMinSeg) problemas.push(`dura ${duracionSeg.toFixed(1)} s, menos de ${duracionMinSeg}`);
  const ficheros = [l.musica.fichero, ...l.lineas.map((x) => x.fichero), l.piezas.horizontal.fichero, l.piezas.vertical.fichero, l.piezas.conjunto.fichero, ...l.piezas.posters];
  for (const f of [...new Set(ficheros)]) if (existe && !existe(f)) problemas.push(`falta public/${f}`);
  for (const x of l.lineas) {
    if (x.durMs > 12000) avisos.push(`línea ${x.id} larga: ${(x.durMs / 1000).toFixed(1)} s`);
    if (PROHIBIDAS.test(x.text)) problemas.push(`línea ${x.id} con palabra prohibida`);
  }
  if (!l.rotulos.pantallaHorizontal || !l.rotulos.pantallaVertical) avisos.push('rótulos de pantalla vacíos');
  return { ok: problemas.length === 0, problemas, avisos, duracionSeg, fotogramas: fotogramasClave(l) };
};

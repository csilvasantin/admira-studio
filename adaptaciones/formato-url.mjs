// Ida y vuelta con los gemelos de admira.store (Carlos, 15-oct-2026 · misión
// DCL-d7966deb02734a6f34beb54e «Hoy #22 · los 18 espacios Altadis»).
// Cada espacio tipo de https://www.admira.store/xpacios/altadis-18/ abre el Adaptador con
// ?formato=cliente-NN (o varios: ?formato=cliente-06,cliente-10). Aquí se lee y valida ese
// parámetro y se construyen los enlaces de vuelta al espacio: Xtanco y cafetería Starbucks.
// Módulo puro: lo usan el navegador y los tests.

export const PARAM_FORMATO = 'formato';
// Proyecto de Yokup cuya ficha trae los formatos cliente-NN (Altadis).
export const PROYECTO_ALTADIS = 'altadis-estancos-bcn';
// Los 18 formatos tipo de Altadis: uno por espacio de admira.store.
export const ALTADIS_18 = Object.freeze(Array.from({length: 18}, (_, i) => `cliente-${String(i + 1).padStart(2, '0')}`));
export const ESPACIOS_URL = 'https://www.admira.store/xpacios/altadis-18/';
// Forma de un id de formato de Altadis: cliente-NN o, para los videowalls ESPECIAL, cliente-esp-N.
const ID_RE = /^cliente-(?:\d{2}|esp-\d{1,2})$/;
const MAX_IDS = 24, MAX_LARGO = 512;

// ?formato=cliente-06 · ?formato=cliente-06,cliente-10 · ?formato=a&formato=b.
// Devuelve los ids en el orden pedido y sin repetir. Lo que no tiene forma de id se ignora;
// con `validos` (ids del catálogo cargado) se ignora también lo que no existe en él.
export function formatosPedidos(search, validos = null) {
  let valores;
  try {
    const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search ?? ''));
    valores = params.getAll(PARAM_FORMATO);
  } catch (_) { return []; }
  const existe = validos ? new Set(validos) : null, ids = [];
  for (const valor of valores) {
    for (const trozo of String(valor).slice(0, MAX_LARGO).split(',')) {
      const id = trozo.trim().toLowerCase();
      if (!ID_RE.test(id) || ids.includes(id) || (existe && !existe.has(id))) continue;
      ids.push(id);
      if (ids.length >= MAX_IDS) return ids;
    }
  }
  return ids;
}

// Un ?proyecto= explícito manda. Sin él, un formato cliente-NN es de la ficha de Altadis.
export function proyectoPorFormatos(proyecto, ids) {
  if (proyecto != null && String(proyecto).trim()) return proyecto;
  return ids?.length ? PROYECTO_ALTADIS : proyecto;
}

// Deja encendidos solo los formatos pedidos que existen y apaga el resto del catálogo.
// Devuelve los que quedan encendidos, en el orden pedido; si no existe ninguno, no toca nada.
export function encenderSolo(formatos, ids) {
  const existentes = (ids || []).filter(id => formatos.some(f => f.id === id));
  if (!existentes.length) return [];
  for (const f of formatos) f.on = existentes.includes(f.id);
  return existentes;
}

// Enlaces de vuelta al gemelo del espacio, solo para los 18 formatos tipo.
export function enlacesEspacio(id) {
  if (!ALTADIS_18.includes(id)) return [];
  const href = tipo => `${ESPACIOS_URL}?${new URLSearchParams({[PARAM_FORMATO]: id, tipo})}`;
  return [
    {tipo: 'xtanco', href: href('xtanco'), es: 'Ver en su espacio', en: 'View in its space'},
    {tipo: 'cafe', href: href('cafe'), es: 'Ver en su espacio en Starbucks', en: 'View in its Starbucks space'},
  ];
}

// Solo la página del Adaptador lee ?formato= (/adaptaciones/ y /en/adaptaciones/). Creador carga el
// mismo adaptaciones.js y no debe actuar.
export const esPaginaAdaptador = pathname => /^\/(?:en\/)?adaptaciones(?:\/(?:index\.html)?)?$/.test(String(pathname ?? ''));

// ── Vista temporal (revisión del PR #51) ────────────────────────────────────────────────────
// El filtro de ?formato= no es una decisión del usuario: no pisa la selección que tenía guardada.
// `antes` es lo que se guardaría justo antes de aplicar el filtro (la selección del usuario).
export function abrirVista(antes, ids) {
  return {ids: [...ids], perfil: 'proyecto', previo: {profile: antes.profile, selected: [...antes.selected]}, base: JSON.stringify(antes)};
}
// Una marca manual termina la vista y se aplica SOBRE la selección previa: previa ∪ marcados −
// desmarcados, contados respecto al filtro. El perfil vuelve al previo, salvo que el usuario lo
// haya cambiado a mano durante la vista.
export function seleccionAlTerminar(vista, actual, perfil) {
  const marcados = actual.filter(id => !vista.ids.includes(id)), desmarcados = vista.ids.filter(id => !actual.includes(id));
  const selected = [...new Set([...vista.previo.selected, ...marcados])].filter(id => !desmarcados.includes(id));
  return {selected, profile: perfil !== vista.perfil ? perfil : vista.previo.profile};
}
// Qué se guarda mientras hay vista. Devuelve {snap, fin}: snap null = no se escribe nada.
// - Vista aún sin aplicar (solo {ids}): no se escribe nada.
// - Si la selección ya no es la del filtro, el usuario ha marcado o desmarcado formatos a mano: la
//   vista termina (fin) y `seleccion` dice la selección y el perfil que quedan (seleccionAlTerminar);
//   quien llama la aplica y guarda.
// - Si sigue siendo la del filtro, se guarda con la selección y el perfil de antes del enlace, y solo
//   si algo más ha cambiado (un ajuste de método, foco o zoom, por ejemplo). Cambiar el desplegable
//   de perfil durante la vista no se guarda: es parte de mirar.
export function guardadoEnVista(snap, vista) {
  if (!vista) return {snap, fin: false};
  if (!vista.previo) return {snap: null, fin: false};
  const mismos = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  if (!mismos(snap.selected, vista.ids)) return {snap: null, fin: true, seleccion: seleccionAlTerminar(vista, snap.selected, snap.profile)};
  const previo = {...snap, profile: vista.previo.profile, selected: [...vista.previo.selected]};
  return {snap: JSON.stringify(previo) === vista.base ? null : previo, fin: false};
}

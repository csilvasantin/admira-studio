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

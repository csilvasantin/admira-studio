// Resolver piezas del Stock por etiquetas y describir la campaña (sin red: recibe el índice).
// Etiquetas que usa el Stock: campaign:<id> · installation:<id> · screen:<id> · content-language:<es|en>.

const ETIQ = (item) => (Array.isArray(item.tags) ? item.tags.map(String) : []);
const con = (item, prefijo, valor) => ETIQ(item).includes(`${prefijo}:${valor}`);
// La campaña admite variantes con sufijo («campaign:<id>-travel»): se busca por prefijo.
const conCampana = (item, valor) => ETIQ(item).some((t) => t === `campaign:${valor}` || t.startsWith(`campaign:${valor}-`));
const NO_PANTALLA = new Set(['landscape', 'portrait', 'horizontal', 'vertical']);
const valoresDe = (items, prefijo) =>
  [...new Set(items.flatMap((i) => ETIQ(i).filter((t) => t.startsWith(prefijo + ':')).map((t) => t.slice(prefijo.length + 1))))].sort();

export const orientacionDe = (item) => {
  const w = Number(item.ancho || 0), h = Number(item.alto || 0);
  if (w && h) {
    if (w / h >= 2.2) return 'panoramica';
    return w >= h ? 'horizontal' : 'vertical';
  }
  const t = ETIQ(item);
  if (t.includes('vertical') || t.includes('portrait')) return 'vertical';
  return 'horizontal';
};

// «Starbucks · Gran de Gràcia 51 · Siete mensajes · ES + EN · …» → cliente, local, descripción.
export const partesDelTitulo = (titulo) => {
  const p = String(titulo || '').split(' · ').map((s) => s.trim()).filter(Boolean);
  return { cliente: p[0] || '', local: p[1] || '', descripcion: p[2] || '' };
};

export const filtrar = (items, { campana, instalacion, pantalla, idioma } = {}) =>
  items.filter((i) =>
    (!campana || conCampana(i, campana)) &&
    (!instalacion || con(i, 'installation', instalacion)) &&
    (!pantalla || con(i, 'screen', pantalla)) &&
    (!idioma || con(i, 'content-language', idioma)),
  );

const ficheroDe = (item) => `stock/${item.id}.${String(item.ext || (item.type === 'image' ? 'jpg' : 'mp4')).replace(/^\./, '')}`;
const posterDe = (item) => `stock/${item.id}.poster.jpg`;
const pieza = (item) => ({ id: item.id, fichero: ficheroDe(item), poster: posterDe(item), titulo: String(item.title || '').slice(0, 140), orientacion: orientacionDe(item) });

// Resuelve la campaña: piezas por orientación, pantallas, idiomas y el local.
export const resolverCampana = (indice, filtro) => {
  const items = (Array.isArray(indice) ? indice : indice.items || indice.stock || []);
  const propios = filtrar(items, filtro);
  if (!propios.length) throw new Error(`sin piezas en el Stock para ${JSON.stringify(filtro)}`);
  const videos = propios.filter((i) => i.type === 'video');
  const porOri = (o) => videos.filter((i) => orientacionDe(i) === o);
  const horizontales = porOri('horizontal'), verticales = porOri('vertical'), panoramicas = porOri('panoramica');
  const conjunto = panoramicas[0] || horizontales[0] || verticales[0];
  const horizontal = horizontales[0] || conjunto;
  const vertical = verticales[0] || horizontal;
  // Pósters: primero los vídeos (uno por pantalla), luego imágenes; máximo 8, sin repetir.
  const conPoster = [...videos, ...propios.filter((i) => i.type === 'image')];
  const posters = [...new Set(conPoster.map(posterDe))].slice(0, 8);
  const primero = propios[0];
  const { cliente, local, descripcion } = partesDelTitulo(primero.title);
  // Instalación principal: la que más piezas tiene; las pantallas se cuentan solo en ella.
  const instalaciones = valoresDe(propios, 'installation');
  const cuenta = (ins) => propios.filter((i) => con(i, 'installation', ins)).length;
  const instalacionPrincipal = instalaciones.length ? [...instalaciones].sort((a, b) => cuenta(b) - cuenta(a))[0] : '';
  const enPrincipal = instalacionPrincipal ? propios.filter((i) => con(i, 'installation', instalacionPrincipal)) : propios;
  const pantallas = valoresDe(enPrincipal, 'screen').filter((x) => !NO_PANTALLA.has(x));
  return {
    filtro,
    cliente, local, descripcion,
    idiomas: valoresDe(propios, 'content-language'),
    pantallas,
    instalaciones,
    instalacionPrincipal,
    piezas: { horizontal: pieza(horizontal), vertical: pieza(vertical), conjunto: pieza(conjunto), posters },
    avisos: [
      ...(horizontales.length ? [] : ['sin pieza horizontal: se usa el conjunto o la vertical en su lugar']),
      ...(verticales.length ? [] : ['sin pieza vertical: se usa la horizontal en su lugar']),
    ],
    todas: propios.map((i) => ({ id: i.id, type: i.type, titulo: String(i.title || '').slice(0, 120), orientacion: orientacionDe(i), tags: ETIQ(i) })),
    descargas: [...new Map(
      [horizontal, vertical, conjunto].filter(Boolean).map((i) => [i.id, { id: i.id, fichero: ficheroDe(i), url: `https://stock.admira.store/stock/${i.id}/asset.${ficheroDe(i).split('.').pop()}` }]),
    ).values()].concat(posters.map((p) => ({ id: p.split('/')[1].replace('.poster.jpg', ''), fichero: p, url: `https://stock.admira.store/stock/${p.split('/')[1].replace('.poster.jpg', '')}/poster.jpg` }))),
  };
};

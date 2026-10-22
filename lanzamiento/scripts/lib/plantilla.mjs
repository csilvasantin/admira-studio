// Plantilla «Un prompt. Una tienda.» en español e inglés. Recibe el brief y devuelve el guion
// (props sin tiempos de voz: los pone `voz`). Nada aquí nombra motores internos.

const NUM = {
  es: ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
};
const num = (n, idioma) => NUM[idioma][n] ?? String(n);
const IDIOMAS = { es: { es: 'español', en: 'inglés' }, en: { es: 'Spanish', en: 'English' } };
const listaIdiomas = (codigos, idioma) => {
  const n = codigos.map((c) => IDIOMAS[idioma][c] || c);
  if (!n.length) return '';
  if (n.length === 1) return n[0];
  const ultimo = n[n.length - 1];
  // En español, «e» solo delante de i-/hi-: «inglés y español», «español e inglés».
  const nexo = idioma === 'es' ? (/^h?i/i.test(ultimo) ? ' e ' : ' y ') : ' and ';
  return n.slice(0, -1).join(', ') + nexo + ultimo;
};

export const PLANTILLAS = {
  es: (b, x) => ({
    titulo: { linea1: 'Un prompt.', linea2: 'Una tienda.' },
    prompt: {
      cabecera: `${x.crea} · Crear · ¿Qué montamos hoy?`,
      texto: `Monta el lanzamiento para ${b.cliente} · ${b.local}. ${x.pantallasTxt}${x.idiomasTxt}. Editable.`,
      pie: `${x.crea} · creación y adaptación · Stock`,
    },
    rotulos: {
      stock: `Stock · ${x.crea} · ${b.cliente} · ${b.local}`,
      pantallas: 'Visuales generados · colocados en cada pantalla',
      pantallaHorizontal: `${x.piezas.horizontal.orientacion} · ${x.piezas.horizontal.id}`,
      pantallaVertical: `${x.piezas.vertical.orientacion} · ${x.piezas.vertical.id}`,
      curvas: `${x.crea} · adaptación · curva de entrada · fotogramas clave`,
      anuncio: `${x.emite} · emitiendo · ${b.cliente} · ${b.local}`,
      listo: `${x.emite} · ${b.descripcion || 'lanzamiento'} · ${x.idiomasCorto}`,
      tutorial: 'Cómo se hace',
      cierre: `${x.crea} · ${x.emite}`,
    },
    tutorial: [`Entra en ${x.crea}`, 'Elige el local', 'Describe la campaña', `${x.emite} la emite en tus pantallas`],
    cierre: { linea1: 'Doce ideas en una tarde.', linea2: 'Emite la que funcione.' },
    lineas: [
      { id: 'v1', quien: 'neo', text: 'Empiezo. Cojo las piezas del Stock, preparo las capas y monto las composiciones.' },
      { id: 'v2', quien: 'neo', text: 'Genero los visuales y los coloco en cada escena.' },
      { id: 'v3', quien: 'neo', text: 'Afino las curvas y el ritmo.' },
      { id: 'v4', quien: 'off', text: `Con ${x.crea} haces los anuncios que nunca tuviste tiempo ni presupuesto de hacer. Con un prompt.` },
      { id: 'v5', quien: 'neo', text: `Tu lanzamiento está listo. ${x.pantallasTxt}${x.idiomasTxtVoz}, en ${b.local}.` },
      { id: 'v6', quien: 'off', text: `Entra en ${x.crea}. Elige el local. Describe la campaña. Studio la monta, editable, y ${x.emite} la emite en tus pantallas.` },
      { id: 'v7', quien: 'off', text: 'Prueba doce ideas en una tarde. Emite la que funcione.' },
    ],
  }),
  en: (b, x) => ({
    titulo: { linea1: 'One prompt.', linea2: 'One store.' },
    prompt: {
      cabecera: `${x.crea} · Create · What are we building today?`,
      texto: `Build the launch for ${b.cliente} · ${b.local}. ${x.pantallasTxt}${x.idiomasTxt}. Editable.`,
      pie: `${x.crea} · creation and adaptation · Stock`,
    },
    rotulos: {
      stock: `Stock · ${x.crea} · ${b.cliente} · ${b.local}`,
      pantallas: 'Generated visuals · placed on every screen',
      pantallaHorizontal: `${x.piezas.horizontal.orientacion} · ${x.piezas.horizontal.id}`,
      pantallaVertical: `${x.piezas.vertical.orientacion} · ${x.piezas.vertical.id}`,
      curvas: `${x.crea} · adaptation · entry curve · keyframes`,
      anuncio: `${x.emite} · on air · ${b.cliente} · ${b.local}`,
      listo: `${x.emite} · ${b.descripcion || 'launch'} · ${x.idiomasCorto}`,
      tutorial: 'How it works',
      cierre: `${x.crea} · ${x.emite}`,
    },
    tutorial: [`Open ${x.crea}`, 'Pick the store', 'Describe the campaign', `${x.emite} plays it on your screens`],
    cierre: { linea1: 'Twelve ideas in one afternoon.', linea2: 'Air the one that works.' },
    lineas: [
      { id: 'v1', quien: 'neo', text: 'Starting. I pick the pieces from the Stock, set up the layers and build the compositions.' },
      { id: 'v2', quien: 'neo', text: 'I generate the visuals and place them in every scene.' },
      { id: 'v3', quien: 'neo', text: 'I refine the curves and the pacing.' },
      { id: 'v4', quien: 'off', text: `With ${x.crea} you make the ads you never had the time or the budget for. With one prompt.` },
      { id: 'v5', quien: 'neo', text: `Your launch is ready. ${x.pantallasTxt}${x.idiomasTxtVoz}, at ${b.local}.` },
      { id: 'v6', quien: 'off', text: `Open ${x.crea}. Pick the store. Describe the campaign. Studio builds it, editable, and ${x.emite} plays it on your screens.` },
      { id: 'v7', quien: 'off', text: 'Try twelve ideas in one afternoon. Air the one that works.' },
    ],
  }),
};

// Genera el guion completo (props sin tiempos) a partir del brief.
export const guionDesdeBrief = (brief, { idioma = 'es', crea = 'admira.studio', emite = 'admira.store', fecha = '' } = {}) => {
  if (!PLANTILLAS[idioma]) throw new Error(`idioma sin plantilla: ${idioma}`);
  const n = brief.pantallas?.length || 0;
  // El idioma del guion va primero («español e inglés» en es, «English and Spanish» en en).
  const idiomas = [...(brief.idiomas || [])].sort((a, b) => (a === idioma ? -1 : b === idioma ? 1 : a.localeCompare(b)));
  const x = {
    crea, emite,
    piezas: brief.piezasPorIdioma?.[idioma] || brief.piezas,
    pantallasTxt: n ? (idioma === 'es' ? `${num(n, 'es')[0].toUpperCase()}${num(n, 'es').slice(1)} pantalla${n === 1 ? '' : 's'}` : `${num(n, 'en')[0].toUpperCase()}${num(n, 'en').slice(1)} screen${n === 1 ? '' : 's'}`) : (idioma === 'es' ? 'Tus pantallas' : 'Your screens'),
    idiomasTxt: idiomas.length ? `, ${listaIdiomas(idiomas, idioma)}` : '',
    idiomasTxtVoz: idiomas.length ? (idioma === 'es' ? `, en ${listaIdiomas(idiomas, idioma)}` : `, in ${listaIdiomas(idiomas, idioma)}`) : '',
    idiomasCorto: idiomas.map((c) => c.toUpperCase()).join(' + ') || (idioma === 'es' ? 'previo' : 'preview'),
  };
  const t = PLANTILLAS[idioma](brief, x);
  return {
    nombre: `${brief.cliente} · ${brief.local} · ${brief.descripcion || 'lanzamiento'} · ${idioma}`,
    idioma,
    marca: { crea, emite, fecha, voz: 'Admirito' },
    local: { cliente: brief.cliente, nombre: brief.local, pantallas: brief.pantallas?.join(', ') || '' },
    titulo: t.titulo,
    prompt: t.prompt,
    piezas: brief.piezasPorIdioma?.[idioma] || brief.piezas,
    rotulos: t.rotulos,
    tutorial: t.tutorial,
    cierre: t.cierre,
    musica: { fichero: 'musica/campanas.mp4', volumen: 0.34, volumenHablando: 0.16 },
    voz: { volumen: 1.3 },
    lineas: t.lineas.map((l) => ({ ...l, fichero: `voz/${l.id}.mp3` })),
    escenas: [
      { id: 'titulo', segundos: 4.5 }, { id: 'prompt', segundos: 6 },
      { id: 'stock', voz: 'v1', respiro: 0.6 }, { id: 'pantallas', voz: 'v2', respiro: 0.6 },
      { id: 'curvas', voz: 'v3', respiro: 0.6 }, { id: 'anuncio', voz: 'v4', respiro: 0.9 },
      { id: 'listo', voz: 'v5', respiro: 0.9 }, { id: 'tutorial', voz: 'v6', respiro: 0.9 },
      { id: 'cierre', voz: 'v7', respiro: 1.6 },
    ],
    fps: 30, ancho: 1920, alto: 1080,
  };
};

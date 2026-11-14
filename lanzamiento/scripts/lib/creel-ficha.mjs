// Ficha de una pieza por personaje del Hotel Creel en el Stock: título, etiquetas y comentario.
// `personaje:<slug>` es la etiqueta que leen la pared de la maqueta (admira.store) y el kiosko /creel (admira.tv).
export const fichaDe = (p, { idioma = 'es', version = 'v1' } = {}) => ({
  titulo: `Hotel Creel · ${p.nombre} · ${p.zona} · ${idioma.toUpperCase()} · 16:9 · ${version}`.slice(0, 140),
  tags: ['hotel-creel', 'stranger-things', 'creel-personaje', `personaje:${p.slug}`, 'horizontal', 'portaventura', 'portaventuranext', `content-language:${idioma}`, 'admira-studio'].slice(0, 10),
  comment: `Pieza por personaje del Hotel Creel (PortAventura NeXT), hecha con la herramienta «creel» de admira.studio: ${p.nombre} · ${p.zona} · celda ${p.celda}. Voz: Admirito. Música de la casa. La pared de la maqueta (admira.store/portaventura/hotel/casa-creel) y el kiosko /creel de admira.tv la emiten cuando ${p.nombre} manda. #hotel-creel #personaje:${p.slug}`,
});

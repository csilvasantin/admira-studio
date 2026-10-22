// Subida al Stock por partes y alta de la pieza (protocolo de api.admira.store), con fetch inyectable
// para poder probarlo en seco. No pide clave; borrar sí la pide, y aquí no se borra nunca.
export const API = 'https://api.admira.store';

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Título y etiquetas de una pieza de lanzamiento.
export const fichaDe = (lanzamiento, brief, { idioma, vertical, version = 'v1' }) => {
  const titulo = `${lanzamiento.local.cliente} · ${lanzamiento.local.nombre} · ${brief.descripcion || 'Lanzamiento'} · Lanzamiento ${idioma.toUpperCase()} · ${vertical ? 'vertical 9:16' : '16:9'} · ${version}`;
  const tags = [
    'lanzamiento',
    vertical ? 'lanzamiento-vertical' : 'lanzamiento-horizontal',
    ...(brief.filtro?.campana ? [`campaign:${brief.filtro.campana}`] : []),
    ...(brief.instalacionPrincipal ? [`installation:${brief.instalacionPrincipal}`] : []),
    `content-language:${idioma}`,
    slug(lanzamiento.local.cliente),
    slug(lanzamiento.marca.crea), slug(lanzamiento.marca.emite),
  ].filter(Boolean);
  const comment = `Vídeo de lanzamiento hecho con la skill «lanzamiento» de ${lanzamiento.marca.crea} a partir de las piezas del Stock ${[lanzamiento.piezas.horizontal.id, lanzamiento.piezas.vertical.id, lanzamiento.piezas.conjunto.id].filter((v, i, a) => a.indexOf(v) === i).join(', ')}. Voz: ${lanzamiento.marca.voz}. #lanzamiento`;
  return { titulo: titulo.slice(0, 140), tags: [...new Set(tags)].slice(0, 10), comment };
};

export const partesDe = (bytes, tam) => { const n = Math.ceil(bytes / tam); return Array.from({ length: n }, (_, i) => ({ n: i + 1, desde: i * tam, hasta: Math.min((i + 1) * tam, bytes) })); };

// Sube un fichero por partes y da de alta la pieza. `fetchImpl` permite simular.
export const subirYPublicar = async ({ buffer, mime, ficha, poster, dimensions, fetchImpl = fetch, api = API, log = () => {} }) => {
  const j = async (r, paso) => { const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false || d.error) throw new Error(`${paso}: HTTP ${r.status} ${JSON.stringify(d).slice(0, 160)}`); return d; };
  const init = await j(await fetchImpl(`${api}/stock/upload/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mime, size: buffer.length }) }), 'init');
  const partes = [];
  for (const p of partesDe(buffer.length, init.partSize)) {
    const r = await j(await fetchImpl(`${api}/stock/upload/part?key=${encodeURIComponent(init.key)}&uploadId=${encodeURIComponent(init.uploadId)}&n=${p.n}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: buffer.subarray(p.desde, p.hasta) }), `parte ${p.n}`);
    partes.push({ partNumber: r.partNumber, etag: r.etag });
    log(`parte ${p.n}/${Math.ceil(buffer.length / init.partSize)} · ${p.hasta - p.desde} bytes`);
  }
  const comp = await j(await fetchImpl(`${api}/stock/upload/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: init.key, uploadId: init.uploadId, parts: partes }) }), 'complete');
  const pub = await j(await fetchImpl(`${api}/stock/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    type: 'video', motor: 'local', mime, r2Staged: comp.key, title: ficha.titulo, tags: ficha.tags, comment: ficha.comment,
    poster: poster ? `data:image/jpeg;base64,${poster.toString('base64')}` : undefined, dimensions,
  }) }), 'publish');
  return { id: pub.id, num: pub.num, url: pub.url, tags: pub.tags, key: comp.key };
};

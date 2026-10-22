// brief · resuelve las piezas de una campaña del Stock por etiquetas, las baja y escribe trabajo/<nombre>/brief.json
// Uso: node scripts/brief.mjs --campana <id> [--instalacion <id>] [--pantalla <id>] [--idioma es|en] [--nombre <carpeta>] [--sin-descargar]
import fs from 'node:fs';
import path from 'node:path';
import { resolverCampana } from './lib/stock.mjs';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const filtro = { campana: arg('campana'), instalacion: arg('instalacion'), pantalla: arg('pantalla'), idioma: arg('idioma') };
if (!filtro.campana && !filtro.instalacion) { console.error('hace falta --campana <id> o --instalacion <id>'); process.exit(2); }
const nombre = arg('nombre') || filtro.campana || filtro.instalacion;
const INDICE = process.env.STOCK_INDEX || 'https://stock.admira.store/stock/index.json';

const indice = INDICE.startsWith('http') ? await (await fetch(INDICE)).json() : JSON.parse(fs.readFileSync(INDICE, 'utf8'));
const brief = resolverCampana(indice, Object.fromEntries(Object.entries(filtro).filter(([, v]) => v)));
brief.nombre = nombre;
brief.fecha = new Date().toISOString().slice(0, 10);

const carpeta = path.join(raiz, 'trabajo', nombre);
fs.mkdirSync(carpeta, { recursive: true });
fs.mkdirSync(path.join(raiz, 'public/stock'), { recursive: true });
if (!process.argv.includes('--sin-descargar')) {
  for (const d of brief.descargas) {
    const destino = path.join(raiz, 'public', d.fichero);
    if (fs.existsSync(destino) && fs.statSync(destino).size > 0) { console.log('ya está', d.fichero); continue; }
    const r = await fetch(d.url);
    if (!r.ok) { console.warn('no se pudo bajar', d.url, r.status); continue; }
    fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
    console.log('bajado', d.fichero, fs.statSync(destino).size, 'bytes');
  }
}
fs.writeFileSync(path.join(carpeta, 'brief.json'), JSON.stringify(brief, null, 1) + '\n');
console.log(`brief → trabajo/${nombre}/brief.json · ${brief.cliente} · ${brief.local} · ${brief.descripcion} · pantallas ${brief.pantallas.length} · idiomas ${brief.idiomas.join('+') || '?'} · piezas ${brief.todas.length}`);
for (const a of brief.avisos) console.log('aviso:', a);

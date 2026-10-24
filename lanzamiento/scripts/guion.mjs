// guion · escribe el guion (props sin tiempos) desde la plantilla, a partir de trabajo/<nombre>/brief.json
// Uso: node scripts/guion.mjs <nombre> [--idioma es|en] [--crea admira.studio] [--emite admira.store] [--fecha "22 oct 2026"]
import fs from 'node:fs';
import path from 'node:path';
import { guionDesdeBrief } from './lib/plantilla.mjs';
import { validarGuion } from '../src/props.ts';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/guion.mjs <nombre> [--idioma es|en]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const brief = JSON.parse(fs.readFileSync(path.join(raiz, 'trabajo', nombre, 'brief.json'), 'utf8'));
const fecha = arg('fecha', new Date().toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''));
const guion = validarGuion(guionDesdeBrief(brief, { idioma, crea: arg('crea', 'admira.studio'), emite: arg('emite', 'admira.store'), fecha }));
const salida = path.join(raiz, 'trabajo', nombre, `guion.${idioma}.json`);
fs.writeFileSync(salida, JSON.stringify(guion, null, 1) + '\n');
console.log(`guion → trabajo/${nombre}/guion.${idioma}.json · ${guion.lineas.length} líneas · ${guion.escenas.length} escenas`);
for (const l of guion.lineas) console.log(`  ${l.id} [${l.quien}] ${l.text}`);

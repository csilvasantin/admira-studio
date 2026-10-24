// montar · valida el lanzamiento con tiempos y lo deja en props/<nombre>.<idioma>.json, listo para --props.
// Uso: node scripts/montar.mjs <nombre> [--idioma es|en]
import fs from 'node:fs';
import path from 'node:path';
import { validarLanzamiento } from '../src/props.ts';
import { planificar } from '../src/guion.ts';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/montar.mjs <nombre> [--idioma es|en]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const l = validarLanzamiento(JSON.parse(fs.readFileSync(path.join(raiz, 'trabajo', nombre, `lanzamiento.${idioma}.json`), 'utf8')));
const { escenas, total } = planificar(l);
fs.mkdirSync(path.join(raiz, 'props'), { recursive: true });
const salida = `props/${nombre}.${idioma}.json`;
fs.writeFileSync(path.join(raiz, salida), JSON.stringify(l, null, 1) + '\n');
console.log(`montado → ${salida} · ${(total / l.fps).toFixed(1)} s · ${escenas.length} escenas`);
for (const e of escenas) console.log(`  ${e.id.padEnd(10)} ${(e.desde / l.fps).toFixed(1).padStart(5)} s → ${((e.desde + e.frames) / l.fps).toFixed(1).padStart(5)} s${e.voz ? ' · ' + e.voz : ''}`);
console.log(`render: npx remotion render UnPromptUnaTienda out/${nombre}.${idioma}.mp4 --codec h264 --props=${salida}`);

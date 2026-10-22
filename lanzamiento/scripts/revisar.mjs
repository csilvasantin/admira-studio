// revisar · comprobaciones con parada + hoja de fotogramas por escena + nivel de la voz.
// Uso: node scripts/revisar.mjs <nombre> [--idioma es|en] [--sin-fotogramas]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { comprobar } from './lib/revision.mjs';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/revisar.mjs <nombre> [--idioma es|en]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const props = `props/${nombre}.${idioma}.json`;
const datos = JSON.parse(fs.readFileSync(path.join(raiz, props), 'utf8'));
const r = comprobar(datos, { existe: (f) => fs.existsSync(path.join(raiz, 'public', f)) });
const informe = { nombre, idioma, props, duracionSeg: Number(r.duracionSeg.toFixed(2)), problemas: r.problemas, avisos: r.avisos, voz: {}, hoja: null };
const carpeta = path.join(raiz, 'trabajo', nombre);

// Nivel de la voz: media de cada línea con ffmpeg (parada si alguna queda por debajo de -30 dB).
try {
  for (const l of datos.lineas || []) {
    const f = path.join(raiz, 'public', l.fichero);
    if (!fs.existsSync(f)) continue;
    // ffmpeg escribe el informe de volumedetect por stderr.
    const out = spawnSync('ffmpeg', ['-v', 'info', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
    const media = Number((out.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
    informe.voz[l.id] = media;
    if (Number.isFinite(media) && media < -30) r.problemas.push(`voz ${l.id} baja: ${media} dB`);
  }
} catch (e) { r.avisos.push('ffmpeg no disponible para medir la voz: ' + String(e.message || e).slice(0, 80)); }

// Hoja de fotogramas: uno por escena.
if (!process.argv.includes('--sin-fotogramas') && r.fotogramas.length) {
  const frames = r.fotogramas.map((f) => f.frame).join(',');
  const dir = path.join(raiz, 'out', `revision-${nombre}-${idioma}`);
  fs.rmSync(dir, { recursive: true, force: true });
  execFileSync('npx', ['remotion', 'render', 'UnPromptUnaTienda', dir, `--frames=${frames}`, '--image-format=png', '--log=error', `--props=${props}`], { cwd: raiz, stdio: 'inherit' });
  const hoja = path.join(carpeta, `revision.${idioma}.png`);
  const n = r.fotogramas.length, cols = 3, filas = Math.ceil(n / cols);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(dir, '*.png'), '-vf', `scale=640:-1,tile=${cols}x${filas}:margin=4:padding=4`, hoja]);
  informe.hoja = path.relative(raiz, hoja);
}
informe.problemas = r.problemas;
informe.ok = r.problemas.length === 0;
fs.writeFileSync(path.join(carpeta, `revision.${idioma}.json`), JSON.stringify(informe, null, 1) + '\n');
console.log(`revisión ${informe.ok ? 'OK' : 'CON PROBLEMAS'} · ${informe.duracionSeg} s · voz media ${Object.values(informe.voz).map((v) => v.toFixed(1)).join('/')} dB${informe.hoja ? ' · hoja ' + informe.hoja : ''}`);
for (const a of r.avisos) console.log('aviso:', a);
for (const p of r.problemas) console.error('problema:', p);
process.exit(informe.ok ? 0 : 1);

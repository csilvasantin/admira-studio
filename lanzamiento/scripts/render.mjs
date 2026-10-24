// render · saca el mp4 16:9 y el 9:16 (pantallas del local) desde props/<nombre>.<idioma>.json y los comprueba.
// Uso: node scripts/render.mjs <nombre> [--idioma es|en] [--solo horizontal|vertical]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { validarLanzamiento } from '../src/props.ts';
import { planificar } from '../src/guion.ts';
import { comprobarMedidas, silenciosDe } from './lib/render.mjs';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/render.mjs <nombre> [--idioma es|en] [--solo horizontal|vertical]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const solo = arg('solo', '');
const props = `props/${nombre}.${idioma}.json`;
const l = validarLanzamiento(JSON.parse(fs.readFileSync(path.join(raiz, props), 'utf8')));
const esperadaSeg = planificar(l).total / l.fps;
fs.mkdirSync(path.join(raiz, 'salida'), { recursive: true });

const SALIDAS = [
  { clave: 'horizontal', composicion: 'UnPromptUnaTienda', fichero: `salida/${nombre}.${idioma}.mp4`, ancho: 1920, alto: 1080 },
  { clave: 'vertical', composicion: 'UnPromptUnaTiendaVertical', fichero: `salida/${nombre}.${idioma}.vertical.mp4`, ancho: 1080, alto: 1920 },
].filter((s) => !solo || s.clave === solo);

const informe = { nombre, idioma, props, esperadaSeg: Number(esperadaSeg.toFixed(2)), salidas: {} };
let todoOk = true;
for (const s of SALIDAS) {
  console.log(`→ ${s.clave} (${s.composicion}) …`);
  execFileSync('npx', ['remotion', 'render', s.composicion, s.fichero, '--codec', 'h264', '--log=error', `--props=${props}`], { cwd: raiz, stdio: 'inherit' });
  const ruta = path.join(raiz, s.fichero);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', ruta], { encoding: 'utf8' }));
  const video = probe.streams.find((x) => x.codec_type === 'video') || {};
  const vol = spawnSync('ffmpeg', ['-v', 'info', '-i', ruta, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const sil = spawnSync('ffmpeg', ['-v', 'info', '-i', ruta, '-af', 'silencedetect=noise=-40dB:d=2', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const medidas = {
    duracionSeg: Number(probe.format.duration), esperadaSeg, ancho: video.width, alto: video.height, anchoEsperado: s.ancho, altoEsperado: s.alto,
    mediaDb: Number((vol.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]), maxDb: Number((vol.match(/max_volume:\s*(-?[\d.]+)/) || [])[1]),
    silencios: silenciosDe(sil), pistas: probe.streams.map((x) => x.codec_type), bytes: Number(probe.format.size),
  };
  const r = comprobarMedidas(medidas);
  informe.salidas[s.clave] = { fichero: s.fichero, ...medidas, ok: r.ok, problemas: r.problemas };
  todoOk = todoOk && r.ok;
  console.log(`  ${r.ok ? 'OK' : 'PROBLEMAS'} · ${medidas.duracionSeg.toFixed(2)} s · ${medidas.ancho}×${medidas.alto} · ${(medidas.bytes / 1e6).toFixed(1)} MB · audio media ${medidas.mediaDb} dB, pico ${medidas.maxDb} dB`);
  for (const p of r.problemas) console.error('  problema:', p);
}
informe.ok = todoOk;
fs.writeFileSync(path.join(raiz, 'trabajo', nombre, `render.${idioma}.json`), JSON.stringify(informe, null, 1) + '\n');
console.log(`render ${todoOk ? 'OK' : 'CON PROBLEMAS'} → trabajo/${nombre}/render.${idioma}.json`);
process.exit(todoOk ? 0 : 1);

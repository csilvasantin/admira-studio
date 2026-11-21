// creel · piezas por personaje del Hotel Creel (PortAventura NeXT): una pieza de vídeo por cada uno de los 13 personajes
// de la maqueta de admira.store, con la voz de Admirito, la cama musical de la casa y el mismo lenguaje que la pared.
// Uso: node scripts/creel.mjs <musica|voz|montar|render|publicar|todo> [--idioma es] [--solo <slug>] [--si] [--version v1] [--handon <fichero>]
//   musica   → public/musica/creel-bed.mp3 (sintetizada en casa, sin material de terceros)
//   voz      → public/voz/creel/<idioma>/<slug>.mp3 + trabajo/creel/voz.<idioma>.json (Admirito, tiempos por palabra)
//   montar   → props/creel/<slug>.<idioma>.json validados (plan de escenas por personaje)
//   render   → salida/creel/<slug>.<idioma>.mp4 + póster, comprobados con ffprobe; trabajo/creel/render.<idioma>.json
//   publicar → EN SECO por defecto; con --si sube cada pieza al Stock con póster y etiquetas; trabajo/creel/publicacion.<idioma>.json
// Emitir en la pared es otra orden, en admira.store, y la da el humano.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { palabrasDesdeAlineacion, duracionMs } from './lib/voz.mjs';
import { escribeWav } from './lib/creel-musica.mjs';
import { subirYPublicar } from './lib/stock-subida.mjs';
import { fichaDe } from './lib/creel-ficha.mjs';
import { planPersonaje, validarPersonaje } from '../src/creel/props.ts';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const orden = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const idioma = arg('idioma', 'es');
const solo = arg('solo', '');
const version = arg('version', 'v1');
const TTS = process.env.TTS_URL || 'https://brain.digitalavatar.ai/tts';
const trabajo = path.join(raiz, 'trabajo/creel');
const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/creel/personajes.json'), 'utf8'));
const personajes = datos.personajes.filter((p) => !solo || p.slug === solo);
if (!personajes.length) { console.error(`sin personaje «${solo}»`); process.exit(2); }
fs.mkdirSync(trabajo, { recursive: true });
const lee = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const escribe = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n'); };

async function musica() {
  const wav = path.join(trabajo, 'creel-bed.wav'), mp3 = path.join(raiz, 'public/musica/creel-bed.mp3');
  escribeWav(wav, { segundos: 16 });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-af', 'lowpass=f=2400,aecho=0.6:0.4:160:0.25,alimiter=limit=0.9', '-b:a', '160k', mp3]);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], { encoding: 'utf8' }).trim());
  console.log(`música → public/musica/creel-bed.mp3 · ${dur.toFixed(1)} s · ${(fs.statSync(mp3).size / 1024).toFixed(0)} kB`);
}

async function voz() {
  // Las voces de Admirito (una por idioma) viven en el código de la nube; no se copian a ningún sitio.
  const fuente = fs.readFileSync(path.join(process.env.HOME, 'Claude/digitalavatar.ai/assets/da-demo-voice.js'), 'utf8');
  const voiceId = (fuente.match(new RegExp(`${idioma}:\\s*'([^']+)'`)) || [])[1];
  if (!voiceId) throw new Error(`sin voz para ${idioma}`);
  const f = path.join(trabajo, `voz.${idioma}.json`);
  const resultados = fs.existsSync(f) ? lee(f) : {};
  fs.mkdirSync(path.join(raiz, 'public/voz/creel', idioma), { recursive: true });
  for (const p of personajes) {
    const texto = idioma === 'es' ? p.linea : p[`linea_${idioma}`];
    if (!texto) throw new Error(`${p.slug}: sin línea en ${idioma}`);
    const r = await fetch(TTS, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://admira.studio' }, body: JSON.stringify({ text: texto, lang: idioma, voiceId, timestamps: true }) });
    if (!r.ok) throw new Error(`${p.slug}: HTTP ${r.status}`);
    const d = await r.json();
    if (!d.ok || !d.audioBase64) throw new Error(`${p.slug}: respuesta sin audio`);
    const fichero = `voz/creel/${idioma}/${p.slug}.mp3`;
    fs.writeFileSync(path.join(raiz, 'public', fichero), Buffer.from(d.audioBase64, 'base64'));
    const palabras = palabrasDesdeAlineacion(d.alignment);
    resultados[p.slug] = { text: texto, fichero, palabras, durMs: duracionMs(palabras) };
    console.log(p.slug.padEnd(11), `${(resultados[p.slug].durMs / 1000).toFixed(2)} s`, `${palabras.length} palabras`);
    escribe(f, resultados);
  }
  console.log(`voz → trabajo/creel/voz.${idioma}.json · ${Object.keys(resultados).length} líneas`);
}

const propsDe = (p) => path.join(raiz, 'props/creel', `${p.slug}.${idioma}.json`);
async function montar() {
  const voces = lee(path.join(trabajo, `voz.${idioma}.json`));
  for (const p of personajes) {
    const v = voces[p.slug]; if (!v) throw new Error(`${p.slug}: sin voz (ejecuta «voz» antes)`);
    const { linea, ...resto } = p;
    void linea;
    const datosPieza = validarPersonaje({ ...resto, idioma, total: datos.personajes.length, linea: { text: v.text, fichero: v.fichero, durMs: v.durMs, palabras: v.palabras } });
    escribe(propsDe(p), datosPieza);
    const plan = planPersonaje(datosPieza);
    console.log(p.slug.padEnd(11), `${(plan.total / datosPieza.fps).toFixed(1)} s`, `intro ${plan.intro} · ficha ${plan.ficha} · línea ${plan.linea} · cierre ${plan.cierre} fotogramas`);
  }
  console.log(`montar → props/creel/*.${idioma}.json · ${personajes.length} piezas`);
}

async function render() {
  const f = path.join(trabajo, `render.${idioma}.json`);
  const informe = fs.existsSync(f) ? lee(f) : { ok: true, piezas: {} };
  fs.mkdirSync(path.join(raiz, 'salida/creel'), { recursive: true });
  const bundle = path.join(trabajo, 'bundle');
  console.log('empaquetando la composición una vez…');
  execFileSync('npx', ['remotion', 'bundle', `--out-dir=${bundle}`, '--log=error'], { cwd: raiz, stdio: 'inherit' });
  for (const p of personajes) {
    const props = propsDe(p);
    if (!fs.existsSync(props)) throw new Error(`${p.slug}: sin props (ejecuta «montar» antes)`);
    const d = validarPersonaje(lee(props)), plan = planPersonaje(d);
    const mp4 = path.join(raiz, 'salida/creel', `${p.slug}.${idioma}.mp4`), poster = path.join(raiz, 'salida/creel', `${p.slug}.${idioma}.poster.jpg`);
    console.log(`\n▶ ${p.nombre} (${(plan.total / d.fps).toFixed(1)} s)`);
    execFileSync('npx', ['remotion', 'render', bundle, 'CreelPersonaje', mp4, '--codec', 'h264', '--log=error', `--props=${props}`], { cwd: raiz, stdio: 'inherit' });
    execFileSync('npx', ['remotion', 'still', bundle, 'CreelPersonaje', poster, `--frame=${plan.poster}`, '--image-format=jpeg', '--jpeg-quality=88', '--log=error', `--props=${props}`], { cwd: raiz, stdio: 'inherit' });
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', mp4], { encoding: 'utf8' }));
    const dur = Number(probe.format.duration), esperada = plan.total / d.fps;
    const video = probe.streams.find((s) => s.codec_type === 'video'), audio = probe.streams.find((s) => s.codec_type === 'audio');
    // Nivel medio de audio: la voz tiene que oírse (por encima de −30 dB en la línea).
    const vol = spawnSync('ffmpeg', ['-v', 'info', '-i', mp4, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
    const media = Number((vol.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
    const ok = Math.abs(dur - esperada) < 0.35 && video && video.width === 1920 && video.height === 1080 && !!audio && media > -33 && fs.existsSync(poster);
    informe.piezas[p.slug] = { ok, mp4: path.relative(raiz, mp4), poster: path.relative(raiz, poster), duracion: dur, esperada, bytes: fs.statSync(mp4).size, audioMedioDb: media, ancho: video?.width, alto: video?.height };
    informe.ok = Object.values(informe.piezas).every((x) => x.ok);
    escribe(f, informe);
    console.log(`  ${ok ? '✓' : '✗'} ${(dur).toFixed(2)} s (esperados ${esperada.toFixed(2)}) · ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB · audio medio ${media} dB`);
  }
  console.log(`\nrender → trabajo/creel/render.${idioma}.json · ${informe.ok ? 'todo OK' : 'HAY PIEZAS CON FALLOS'}`);
  if (!informe.ok) process.exit(1);
}

async function publicar() {
  const si = flag('si');
  const informe = lee(path.join(trabajo, `render.${idioma}.json`));
  const f = path.join(trabajo, `publicacion.${idioma}.json`);
  const resultado = fs.existsSync(f) ? lee(f) : { idioma, version, piezas: {} };
  console.log(si ? 'PUBLICANDO en el Stock…' : 'PRUEBA EN SECO (nada se sube; añade --si con el permiso del humano)');
  for (const p of personajes) {
    const r = informe.piezas[p.slug];
    if (!r || !r.ok) { console.error(`${p.slug}: el render no pasó la comprobación: no se publica`); process.exit(1); }
    const ficha = fichaDe(p, { idioma, version });
    console.log(`\n${p.nombre}: ${r.mp4} · ${(r.bytes / 1048576).toFixed(1)} MB · ${r.duracion.toFixed(1)} s`);
    console.log(`  título: ${ficha.titulo}`);
    console.log(`  etiquetas: ${ficha.tags.join(', ')}`);
    console.log(`  póster: ${r.poster}`);
    if (!si) continue;
    if (resultado.piezas[p.slug]?.id) { console.log(`  ya publicada: Stock #${resultado.piezas[p.slug].num} · ${resultado.piezas[p.slug].id}`); continue; }
    const pub = await subirYPublicar({ buffer: fs.readFileSync(path.join(raiz, r.mp4)), mime: 'video/mp4', ficha, poster: fs.readFileSync(path.join(raiz, r.poster)), dimensions: { width: 1920, height: 1080 }, log: (m) => console.log('   ', m) });
    resultado.piezas[p.slug] = { ...pub, ficha, fecha: new Date().toISOString() };
    escribe(f, resultado);
    console.log(`  ✓ Stock #${pub.num} · ${pub.id} · ${pub.url}`);
  }
  if (si) {
    const linea = `- Hotel Creel · piezas por personaje publicadas en el Stock (${idioma.toUpperCase()}, ${version}): ${Object.entries(resultado.piezas).map(([s, x]) => `#${x.num} (${s}, ${x.id})`).join(' · ')} · etiquetas hotel-creel, creel-personaje, personaje:<slug>.`;
    console.log(`\n${linea}`);
    const handon = arg('handon', '');
    if (handon) { fs.appendFileSync(handon, linea + '\n'); console.log(`anotado en ${handon}`); }
  }
}

const ordenes = { musica, voz, montar, render, publicar, async todo() { await musica(); await voz(); await montar(); await render(); } };
if (!ordenes[orden]) { console.error('uso: node scripts/creel.mjs <musica|voz|montar|render|publicar|todo> [--idioma es] [--solo <slug>] [--si] [--version v1] [--handon <fichero>]'); process.exit(2); }
await ordenes[orden]();

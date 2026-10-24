// voz · Admirito (es/en) con marcas de tiempo por palabra, desde el guion de un trabajo.
// Uso: node scripts/voz.mjs <nombre> [--idioma es|en]   → public/voz/<nombre>/<idioma>/<id>.mp3 + trabajo/<nombre>/lanzamiento.<idioma>.json
import fs from 'node:fs';
import path from 'node:path';
import { palabrasDesdeAlineacion, rellenarGuion } from './lib/voz.mjs';
import { validarLanzamiento } from '../src/props.ts';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/voz.mjs <nombre> [--idioma es|en]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const TTS = process.env.TTS_URL || 'https://brain.digitalavatar.ai/tts';

// Las voces de Admirito (una por idioma) viven en el código de la nube; no se copian a ningún sitio.
const fuente = fs.readFileSync(path.join(process.env.HOME, 'Claude/digitalavatar.ai/assets/da-demo-voice.js'), 'utf8');
const voiceId = (fuente.match(new RegExp(`${idioma}:\\s*'([^']+)'`)) || [])[1];
if (!voiceId) throw new Error(`sin voz para ${idioma}`);

const guion = JSON.parse(fs.readFileSync(path.join(raiz, 'trabajo', nombre, `guion.${idioma}.json`), 'utf8'));
const carpeta = path.join(raiz, 'public/voz', nombre, idioma);
fs.mkdirSync(carpeta, { recursive: true });
const resultados = {};
for (const l of guion.lineas) {
  const r = await fetch(TTS, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://admira.studio' },
    body: JSON.stringify({ text: l.text, lang: idioma, voiceId, timestamps: true }) });
  if (!r.ok) throw new Error(`${l.id}: HTTP ${r.status}`);
  const d = await r.json();
  if (!d.ok || !d.audioBase64) throw new Error(`${l.id}: respuesta sin audio`);
  const fichero = `voz/${nombre}/${idioma}/${l.id}.mp3`;
  fs.writeFileSync(path.join(raiz, 'public', fichero), Buffer.from(d.audioBase64, 'base64'));
  const palabras = palabrasDesdeAlineacion(d.alignment);
  resultados[l.id] = { fichero, palabras };
  console.log(l.id, `${(palabras.at(-1)?.endMs / 1000).toFixed(2)} s`, `${palabras.length} palabras`);
}
const lanzamiento = validarLanzamiento(rellenarGuion(guion, resultados));
const salida = path.join(raiz, 'trabajo', nombre, `lanzamiento.${idioma}.json`);
fs.writeFileSync(salida, JSON.stringify(lanzamiento, null, 1) + '\n');
const total = lanzamiento.lineas.reduce((s, l) => s + l.durMs, 0) / 1000;
console.log(`voz → trabajo/${nombre}/lanzamiento.${idioma}.json · ${lanzamiento.lineas.length} líneas · ${total.toFixed(1)} s de voz`);

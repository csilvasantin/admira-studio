// publicar · sube los renders al Stock como piezas aparte (16:9 y vertical), con póster del propio render.
// Por defecto es una PRUEBA EN SECO: enseña qué subiría y no toca nada. Solo sube con --si (el sí expreso del humano).
// Uso: node scripts/publicar.mjs <nombre> [--idioma es|en] [--solo horizontal|vertical] [--version v1] [--si] [--handon <fichero.md>]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validarLanzamiento } from '../src/props.ts';
import { planificar } from '../src/guion.ts';
import { fichaDe, partesDe, subirYPublicar } from './lib/stock-subida.mjs';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const nombre = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
if (!nombre || nombre.startsWith('--')) { console.error('uso: node scripts/publicar.mjs <nombre> [--idioma es|en] [--solo horizontal|vertical] [--si]'); process.exit(2); }
const idioma = arg('idioma', 'es');
const solo = arg('solo', '');
const version = arg('version', 'v1');
const enSerio = process.argv.includes('--si');
const handon = arg('handon', '');

const carpeta = path.join(raiz, 'trabajo', nombre);
const brief = JSON.parse(fs.readFileSync(path.join(carpeta, 'brief.json'), 'utf8'));
const l = validarLanzamiento(JSON.parse(fs.readFileSync(path.join(raiz, 'props', `${nombre}.${idioma}.json`), 'utf8')));
const informeRender = JSON.parse(fs.readFileSync(path.join(carpeta, `render.${idioma}.json`), 'utf8'));
if (!informeRender.ok) { console.error('el render no pasó la comprobación: no se publica'); process.exit(1); }

// Póster: fotograma de la escena «anuncio» a mitad, sacado del propio mp4.
const { escenas } = planificar(l);
const anuncio = escenas.find((e) => e.id === 'anuncio') || escenas[0];
const segPoster = (anuncio.desde + anuncio.frames * 0.5) / l.fps;

const SALIDAS = [
  { clave: 'horizontal', vertical: false, ancho: 1920, alto: 1080 },
  { clave: 'vertical', vertical: true, ancho: 1080, alto: 1920 },
].filter((s) => !solo || s.clave === solo);

const resultado = { nombre, idioma, enSerio, piezas: [] };
for (const s of SALIDAS) {
  const salida = informeRender.salidas[s.clave];
  if (!salida || !salida.ok) { console.error(`sin render ${s.clave} comprobado: no se publica`); process.exit(1); }
  const fichero = path.join(raiz, salida.fichero);
  const buffer = fs.readFileSync(fichero);
  const posterRuta = path.join(carpeta, `poster.${idioma}.${s.clave}.jpg`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(segPoster), '-i', fichero, '-frames:v', '1', '-vf', `scale=${s.vertical ? '540:-1' : '960:-1'}`, '-q:v', '6', posterRuta]);
  const poster = fs.readFileSync(posterRuta);
  const ficha = fichaDe(l, brief, { idioma, vertical: s.vertical, version });
  const partes = partesDe(buffer.length, 25 * 1024 * 1024);
  console.log(`\n[${s.clave}] ${salida.fichero} · ${(buffer.length / 1e6).toFixed(1)} MB · ${partes.length} parte(s) · póster ${(poster.length / 1024).toFixed(0)} KB (segundo ${segPoster.toFixed(1)})`);
  console.log(`  título: ${ficha.titulo}`);
  console.log(`  etiquetas: ${ficha.tags.join(', ')}`);
  if (!enSerio) { resultado.piezas.push({ clave: s.clave, enSeco: true, ficha, bytes: buffer.length, partes: partes.length, poster: path.relative(raiz, posterRuta) }); continue; }
  const r = await subirYPublicar({ buffer, mime: 'video/mp4', ficha, poster, dimensions: { ancho: s.ancho, alto: s.alto, width: s.ancho, height: s.alto }, log: (m) => console.log('  ' + m) });
  console.log(`  ✓ Stock #${r.num} · ${r.id} · ${r.url}`);
  resultado.piezas.push({ clave: s.clave, enSeco: false, ficha, ...r });
}
fs.writeFileSync(path.join(carpeta, `publicacion.${idioma}.json`), JSON.stringify(resultado, null, 1) + '\n');
const linea = enSerio
  ? `- Lanzamiento «${l.nombre}» publicado en el Stock: ${resultado.piezas.map((p) => `#${p.num} (${p.clave}, ${p.id})`).join(' · ')} · etiquetas ${resultado.piezas[0].ficha.tags.join(', ')}.`
  : `- Prueba en seco de publicación de «${l.nombre}»: ${resultado.piezas.map((p) => `${p.clave} ${(p.bytes / 1e6).toFixed(1)} MB`).join(' · ')}; nada subido.`;
console.log(`\n${enSerio ? 'PUBLICADO' : 'EN SECO (nada subido; añade --si con el permiso del humano para subir)'} → trabajo/${nombre}/publicacion.${idioma}.json`);
console.log('HANDON:', linea);
if (handon) { fs.appendFileSync(handon, linea + '\n'); console.log('anotado en', handon); }

// Cama musical del Hotel Creel, hecha en casa: arpegio de sintetizador oscuro (Do menor) sobre un bordón grave,
// en bucle limpio. Se sintetiza muestra a muestra y se escribe como WAV; ffmpeg lo convierte y lo redondea.
// Sin material de terceros: ni la melodía ni la grabación de la serie.
import fs from 'node:fs';

const NOTAS = [130.81, 155.56, 196.0, 233.08, 261.63, 233.08, 196.0, 155.56]; // Do3 Mi♭3 Sol3 Si♭3 Do4 …
const BORDON = [65.41, 98.0]; // Do2 · Sol2

export const sintetiza = ({ segundos = 16, sampleRate = 48000, porSegundo = 8 } = {}) => {
  const n = Math.round(segundos * sampleRate), pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate, paso = t * porSegundo, k = Math.floor(paso) % NOTAS.length, f = NOTAS[k], tn = (paso - Math.floor(paso)) / porSegundo;
    const env = Math.exp(-tn * 9) * 0.9 + 0.1; // ataque inmediato, cola corta
    const arp = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t) + 0.12 * Math.sin(8 * Math.PI * f * t)) * env;
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 0.35 * t);
    const bordon = BORDON.reduce((s, b) => s + Math.sin(2 * Math.PI * b * vib * t) + 0.3 * Math.sin(4 * Math.PI * b * vib * t), 0);
    const respira = 0.85 + 0.15 * Math.sin(2 * Math.PI * t / 8); // sube y baja cada 8 s
    pcm[i] = arp * 0.26 * respira + bordon * 0.14;
  }
  let max = 0; for (const v of pcm) max = Math.max(max, Math.abs(v));
  const g = 0.85 / (max || 1);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i] * g)) * 32767), 44 + i * 2);
  return buf;
};

export const escribeWav = (ruta, opciones) => { fs.writeFileSync(ruta, sintetiza(opciones)); return ruta; };

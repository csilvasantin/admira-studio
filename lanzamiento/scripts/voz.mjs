// Genera la voz de Admirito (ElevenLabs vía brain.digitalavatar.ai/tts) con marcas de tiempo
// y deja public/voz/<id>.mp3 + public/voz/lineas.json (palabras con startMs/endMs).
import fs from 'node:fs';
import path from 'node:path';
const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const src = fs.readFileSync(path.join(process.env.HOME, 'Claude/digitalavatar.ai/assets/da-demo-voice.js'), 'utf8');
const voiceId = (src.match(/es:\s*'([^']+)'/) || [])[1];
if (!voiceId) throw new Error('voiceId es no encontrado');
const LINEAS = [
  { id: 'v1', quien: 'neo', text: 'Empiezo. Cojo las piezas del Stock, preparo las capas y monto las composiciones.' },
  { id: 'v2', quien: 'neo', text: 'Genero los visuales y los coloco en cada escena.' },
  { id: 'v3', quien: 'neo', text: 'Afino las curvas y el ritmo.' },
  { id: 'v4', quien: 'off', text: 'Con admira.studio haces los anuncios que nunca tuviste tiempo ni presupuesto de hacer. Con un prompt.' },
  { id: 'v5', quien: 'neo', text: 'Tu lanzamiento está listo. Siete mensajes, en español y en inglés, en las pantallas de Gran de Gràcia 51.' },
  { id: 'v6', quien: 'off', text: 'Entra en admira.studio. Elige el local. Describe la campaña. Studio la monta, editable, y admira.store la emite en tus pantallas.' },
  { id: 'v7', quien: 'off', text: 'Prueba doce ideas en una tarde. Emite la que funcione.' },
];
const out = [];
for (const l of LINEAS) {
  const r = await fetch('https://brain.digitalavatar.ai/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://admira.biz' },
    body: JSON.stringify({ text: l.text, lang: 'es', voiceId, timestamps: true }) });
  if (!r.ok) throw new Error(`${l.id}: HTTP ${r.status}`);
  const d = await r.json();
  if (!d.ok || !d.audioBase64) throw new Error(`${l.id}: respuesta sin audio`);
  const ext = /mpeg|mp3/.test(d.mime || '') ? 'mp3' : 'audio';
  const fichero = path.join(raiz, 'public/voz', `${l.id}.${ext}`);
  fs.writeFileSync(fichero, Buffer.from(d.audioBase64, 'base64'));
  // palabras a partir de los caracteres
  const { chars = [], starts = [], ends = [] } = d.alignment || {};
  const palabras = []; let cur = null;
  chars.forEach((c, i) => {
    if (c === ' ' || c === '\n') { if (cur) { palabras.push(cur); cur = null; } return; }
    if (!cur) cur = { text: c, startMs: Math.round(starts[i] * 1000), endMs: Math.round(ends[i] * 1000) };
    else { cur.text += c; cur.endMs = Math.round(ends[i] * 1000); }
  });
  if (cur) palabras.push(cur);
  const durMs = palabras.length ? palabras[palabras.length - 1].endMs : 0;
  out.push({ id: l.id, quien: l.quien, text: l.text, fichero: `voz/${l.id}.${ext}`, durMs, palabras });
  console.log(l.id, `${(durMs / 1000).toFixed(2)} s`, `${palabras.length} palabras`, d.mime);
}
fs.writeFileSync(path.join(raiz, 'public/voz/lineas.json'), JSON.stringify(out, null, 1));
console.log('total voz', (out.reduce((s, l) => s + l.durMs, 0) / 1000).toFixed(1), 's');

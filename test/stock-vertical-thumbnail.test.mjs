import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Las piezas verticales deben verse verticales en la rejilla del Stock: caja 9:16 y
// <img> anclada con inset:0 para que object-fit:contain actúe (si la <img> usa
// height:100% sobre una caja con alto solo por aspect-ratio, se resuelve a auto y
// overflow:hidden la recorta en horizontal).
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../stock.html', import.meta.url), 'utf8');

// Todas las miniaturas miden lo mismo: sin caja propia para verticales/cuadradas.
assert.doesNotMatch(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media[^{]*\{[^}]*aspect-ratio/);
assert.doesNotMatch(css, /view-list \.stock-card:is\(\[data-orientation="portrait"\]/);
// El hueco lo rellena el póster desenfocado (--poster), no bandas negras.
assert.match(css, /\.stock-card:is\(\[data-orientation="portrait"\],\[data-orientation="square"\]\) \.stock-card-media::before\s*\{[^}]*var\(--poster[^}]*filter:\s*blur/);
for (const page of [html, readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8')]) {
  assert.match(page, /data-id="\$\{idAttr\}"\$\{mediaArStyle\(it\)\}/);
  assert.match(page, /--poster:url\(/);
}
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,\s*\.stock-card\[data-orientation="square"\] \.stock-card-media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0/);
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,[^{]*\{\s*object-fit:\s*contain/);
// El <video> creado al pulsar ▶ no fuerza cover en línea: lo decide la hoja de estilos.
assert.doesNotMatch(html, /v\.style\.cssText = '[^']*object-fit:cover/);
// Filas mixtas: las tarjetas no se estiran a la altura de la más alta.
assert.match(css, /\.stock-grid\s*\{[^}]*align-items:\s*start/);
assert.match(css, /\.stock-group-grid\s*\{[^}]*align-items:\s*start/);
console.log('stock-vertical-thumbnail ok');
// Lista: la miniatura de vídeo ocupa toda la altura de la fila (sin hueco negro debajo).
assert.match(css, /\.stock-grid\.view-list \.stock-card:is\(\[data-type="video"\],\[data-type="animation"\]\) \.stock-card-media\s*\{[^}]*align-self:\s*stretch/);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Las piezas verticales deben verse verticales en la rejilla del Stock: caja 9:16 y
// <img> anclada con inset:0 para que object-fit:contain actúe (si la <img> usa
// height:100% sobre una caja con alto solo por aspect-ratio, se resuelve a auto y
// overflow:hidden la recorta en horizontal).
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../stock.html', import.meta.url), 'utf8');

assert.match(css, /\.stock-grid:not\(\.view-list\) \.stock-card\[data-orientation="portrait"\] \.stock-card-media,[^{]*\{[^}]*aspect-ratio:\s*var\(--media-ar,\s*9\s*\/\s*16\)/);
// Lista: la miniatura vertical/cuadrada toma la proporción real (--media-ar) a alto fijo,
// sin la caja 16:9 que dejaba bandas negras.
assert.match(css, /\.stock-grid\.view-list \.stock-card:is\(\[data-orientation="portrait"\],\[data-orientation="square"\]\) \.stock-card-media\s*\{[^}]*height:\s*200px;[^}]*aspect-ratio:\s*var\(--media-ar/);
for (const page of [html, readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8')]) {
  assert.match(page, /data-id="\$\{idAttr\}"\$\{mediaArStyle\(it\)\}/);
  assert.match(page, /card\.style\.setProperty\('--media-ar',ar\)/);
}
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,\s*\.stock-card\[data-orientation="square"\] \.stock-card-media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0/);
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,[^{]*\{\s*object-fit:\s*contain/);
// El <video> creado al pulsar ▶ no fuerza cover en línea: lo decide la hoja de estilos.
assert.doesNotMatch(html, /v\.style\.cssText = '[^']*object-fit:cover/);
// Filas mixtas: las tarjetas no se estiran a la altura de la más alta.
assert.match(css, /\.stock-grid\s*\{[^}]*align-items:\s*start/);
assert.match(css, /\.stock-group-grid\s*\{[^}]*align-items:\s*start/);
console.log('stock-vertical-thumbnail ok');

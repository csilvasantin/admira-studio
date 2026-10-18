import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Las piezas verticales deben verse verticales en la rejilla del Stock: caja 9:16 y
// <img> anclada con inset:0 para que object-fit:contain actúe (si la <img> usa
// height:100% sobre una caja con alto solo por aspect-ratio, se resuelve a auto y
// overflow:hidden la recorta en horizontal).
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../stock.html', import.meta.url), 'utf8');

assert.match(css, /\.stock-grid:not\(\.view-list\) \.stock-card\[data-orientation="portrait"\] \.stock-card-media\s*\{[^}]*aspect-ratio:\s*9\s*\/\s*16/);
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,\s*\.stock-card\[data-orientation="square"\] \.stock-card-media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0/);
assert.match(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media img,[^{]*\{\s*object-fit:\s*contain/);
// El <video> creado al pulsar ▶ no fuerza cover en línea: lo decide la hoja de estilos.
assert.doesNotMatch(html, /v\.style\.cssText = '[^']*object-fit:cover/);
// Filas mixtas: las tarjetas no se estiran a la altura de la más alta.
assert.match(css, /\.stock-grid\s*\{[^}]*align-items:\s*start/);
assert.match(css, /\.stock-group-grid\s*\{[^}]*align-items:\s*start/);
console.log('stock-vertical-thumbnail ok');

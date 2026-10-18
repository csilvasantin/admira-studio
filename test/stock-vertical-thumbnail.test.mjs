import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Las miniaturas de imagen/vídeo del Stock se ven enteras y sin franja vacía: la caja
// (.media-fit) toma la proporción real del contenido (--media-ar) y la <img>/<video> se anclan
// con inset:0 + object-fit:contain. Así una pieza vertical sigue vertical (nunca se recorta a
// horizontal) y una horizontal llega hasta el borde inferior. Si height:100% se usara sobre una
// caja con alto solo por aspect-ratio se resolvería a auto y overflow:hidden la recortaría (#93).
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const pages = { 'stock.html': readFileSync(new URL('../stock.html', import.meta.url), 'utf8'), 'en/stock.html': readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8') };

assert.match(css, /\.stock-card-media\.media-fit\s*\{[^}]*aspect-ratio:\s*var\(--media-ar,\s*16\s*\/\s*10\)/);
assert.match(css, /\.stock-card-media\.media-fit > img,\s*\.stock-card-media\.media-fit > video\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*object-fit:\s*contain/);
// Nada de caja 9:16 fija ni de cover para vertical/cuadrado: lo decide la proporción real.
assert.doesNotMatch(css, /\.stock-card\[data-orientation="portrait"\] \.stock-card-media\s*\{[^}]*aspect-ratio/);
// Lo que sobre (ratio extremo, columna de la lista estirada) lo cubre el fotograma difuminado, no negro muerto.
assert.match(css, /\.stock-card-media\.media-fit::before\s*\{[^}]*var\(--media-ambient\)[^}]*filter:\s*blur/);
// Rejilla: una pieza vertical no pasa de 440px de alto (la caja se estrecha en vez de estirar la fila).
assert.match(css, /\.stock-grid:not\(\.view-list\) \.stock-card-media\.media-fit\s*\{[^}]*width:\s*min\(100%,\s*calc\(440px \* var\(--media-ar/);
// Lista: la columna de la miniatura se estira hasta la línea inferior de la tarjeta (sin franja vacía).
assert.match(css, /\.stock-grid\.view-list \.stock-card\[data-type\] \.stock-card-media\.media-fit\s*\{[^}]*align-self:\s*stretch/);
// Filas mixtas: las tarjetas no se estiran a la altura de la más alta.
assert.match(css, /\.stock-grid\s*\{[^}]*align-items:\s*start/);
assert.match(css, /\.stock-group-grid\s*\{[^}]*align-items:\s*start/);

for (const [name, html] of Object.entries(pages)) {
  // El <video> creado al pulsar ▶ no fuerza object-fit en línea: lo decide la hoja de estilos.
  assert.doesNotMatch(html, /v\.style\.cssText = '[^']*object-fit:/, name);
  // La caja la marca el JS con la clase y la proporción: dimensiones declaradas al pintar, reales al cargar.
  assert.match(html, /stock-card-media\$\{mediaFit \? ' media-fit' : ''\}/, name);
  assert.match(html, /css\.push\('--media-ar:'/, name);
  assert.match(html, /box\.style\.setProperty\('--media-ar'/, name);
  assert.match(html, /const mediaRatio = \(w, h\) => Math\.min\(21 \/ 9, Math\.max\(9 \/ 16, w \/ h\)\)/, name);
}
console.log('stock-vertical-thumbnail ok');

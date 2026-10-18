import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// «VERTICAL»/«HORIZONTAL»/«CUADRADO» ya no es una cartela encima de la imagen: es una etiqueta
// normal (↕ vertical, ↔ horizontal, □ cuadrado…) en la fila de tags de la tarjeta, siempre visible
// (también en la vista compacta) y construida con la insignia de StockFormats. Las etiquetas de
// texto que dicen lo mismo (#vertical/#portrait del importador) no se repiten.
const F = createRequire(import.meta.url)('../assets/stock-formats.js');
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const pages = { 'stock.html': readFileSync(new URL('../stock.html', import.meta.url), 'utf8'), 'en/stock.html': readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8') };

// StockFormats.tagFormat: qué formato declara una etiqueta de texto (reutiliza aliases/clean de la insignia).
assert.equal(F.tagFormat('vertical'), 'portrait');
assert.equal(F.tagFormat('Portrait'), 'portrait');
assert.equal(F.tagFormat('#horizontal'), 'landscape');
assert.equal(F.tagFormat('landscape'), 'landscape');
assert.equal(F.tagFormat('cuadrado'), 'square');
assert.equal(F.tagFormat('formato:Vertical'), 'portrait');
assert.equal(F.tagFormat('format:videowall'), 'custom:videowall');
assert.equal(F.tagFormat('formato:video'), '');   // tipo de medio, no formato (igual que format())
for (const t of ['16:9', 'good', 'sabiasque', 'vertical-slider', '']) assert.equal(F.tagFormat(t), '', t);
// Coherencia con format(): la clave que dedupica es la que pinta la etiqueta.
for (const [tags, key] of [[['vertical', 'portrait'], 'portrait'], [['horizontal', 'landscape'], 'landscape'], [['cuadrado'], 'square']])
  assert.deepEqual([...new Set(tags.map(F.tagFormat))], [key]);
assert.equal(F.format({ type: 'video', tags: ['vertical', 'portrait'] }).key, 'portrait');

for (const [name, html] of Object.entries(pages)) {
  // Ninguna cartela superpuesta queda en el JS (ni la de formato ni la de cápsula).
  assert.doesNotMatch(html, /stock-orientation/, name);
  assert.doesNotMatch(html, /orientationBadgeHtml/, name);
  // La etiqueta sale de la misma insignia (icono + nombre de StockFormats) y es una .stock-tag.
  assert.match(html, /function formatTagHtml\(it\)[\s\S]*?class="stock-tag stock-tag-format \$\{css\}"[\s\S]*?\$\{o\.icon\} \$\{escText\(label\)\}/, name);
  // Con varias versiones sigue siendo el selector de versión, ahora en la fila de tags.
  assert.match(html, /<select class="stock-tag stock-tag-format stock-format-versions[^"]*" data-role="orientation"[^>]*data-act="format-version"/, name);
  // Va la primera de la fila y oculta (solo en pantalla) las etiquetas de texto equivalentes.
  assert.match(html, /function renderTagsHtml\(tags, id, it\)/, name);
  assert.match(html, /\.filter\(t => !formatKey \|\| StockFormats\.tagFormat\(t\) !== formatKey\)/, name);
  assert.match(html, /const tagsBlock = renderTagsHtml\(it\.tags, it\.id, it\);/, name);
  // Al conocerse las dimensiones reales se refresca la fila (no una cartela suelta).
  assert.match(html, /tagRow\.outerHTML=renderTagsHtml\(it\.tags,it\.id,it\)/, name);
  // Clic = filtrar por formato (filtro «Formato»); doble clic no la renombra como si fuera un tag de datos.
  assert.match(html, /const formatBtn = e\.target\.closest\('\.stock-tag-format'\)/, name);
  assert.match(html, /!tagBtn \|\| tagBtn\.classList\.contains\('stock-tag-format'\)/, name);
  // La etiqueta de formato no es arrastrable ni lleva data-tag: no se copia ni se guarda como etiqueta de datos.
  assert.doesNotMatch(html.match(/function formatTagHtml[\s\S]*?\n    }\n/)[0], /data-drag-tag|data-tag=/, name);
}
// Estilo: hereda .stock-tag, color por formato; no hay cartela absoluta.
assert.doesNotMatch(css, /\.stock-orientation/);
for (const k of ['portrait', 'landscape', 'square']) assert.match(css, new RegExp(`\\.stock-tag-format\\.${k}\\s*\\{[^}]*color:`));
// Vista compacta: se ocultan las demás etiquetas pero la de formato sigue visible.
assert.match(css, /\.stock-grid\.view-compact \.stock-tags:has\(\.stock-tag-format\)\s*\{\s*display:\s*flex/);
assert.match(css, /\.stock-grid\.view-compact \.stock-tags > :not\(\.stock-tag-format\)\s*\{\s*display:\s*none/);
console.log('stock-format-tag ok');

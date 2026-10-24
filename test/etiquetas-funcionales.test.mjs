import test from 'node:test';
import assert from 'node:assert/strict';
import {functionalTag, isFunctionalTag, tagChip, FUNCTIONAL_TAGS} from '../assets/etiquetas-funcionales.mjs';
import {readFileSync} from 'node:fs';

test('traducir y sus alias son funcionales (negrita) sin tildes ni #', () => {
  for (const t of ['#traducir', 'Traducción', 'traduce', 'translate', 'TRANSLATION']) assert.equal(functionalTag(t)?.kind, 'traducir', t);
  assert.equal(tagChip('traducir').cls, 'stock-tag-fn');
  assert.match(tagChip('traducir').title, /subtítulos ES/);
});
test('cápsula + pilares + clasificadores; etiquetas normales no', () => {
  for (const t of ['cápsula', 'capsule', 'negocio', 'creativity', 'tecnología', 'mobiliario', 'tiktok', 'catalogo']) assert.ok(isFunctionalTag(t), t);
  for (const t of ['alsea', 'verano', 'traductor']) assert.ok(!isFunctionalTag(t), t);
});
test('marcas automáticas: no negrita, cursiva con title', () => {
  for (const t of ['par-abc123', 'formato-alterno', 'subtitulado-es']) { const c = tagChip(t); assert.equal(c.cls, 'stock-tag-sys'); assert.ok(c.title); }
  assert.deepEqual(tagChip('alsea'), {cls: '', title: null});
  assert.ok(Object.keys(FUNCTIONAL_TAGS).length > 30);
});
test('el Stock pinta la clase en tarjetas, editor y filtro, y el import tiene vista previa', () => {
  const s = readFileSync(new URL('../stock.html', import.meta.url), 'utf8');
  assert.match(s, /\.stock-tag-fn[^{]*\{font-weight:700\}/);
  assert.equal((s.match(/tagFx\(t\)/g) || []).length >= 4, true);
  assert.match(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), /imp-tags-preview/);
});

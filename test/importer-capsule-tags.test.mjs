import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('el importador instalado 1.0.1 puede activar cápsulas ES con sus etiquetas actuales', () => {
  const app = readFileSync('app.js', 'utf8');
  const fn = app.slice(app.indexOf('  function capsuleImportTags('), app.indexOf('  function etiquetasImport('));
  const tags = new Function(fn + '; return capsuleImportTags;')();
  assert.deepEqual(tags(['cliente', 'Cápsula'], '', 'video'), ['subtitulos-es', 'cliente', 'Cápsula']);
  assert.deepEqual(tags(['cliente'], 'Ejemplo #capsula', 'video'), ['subtitulos-es', 'cliente']);
  assert.deepEqual(tags(['capsula'], '', 'audio'), ['capsula']);
  assert.deepEqual(tags(['cliente'], '', 'video'), ['cliente']);
  assert.deepEqual(tags(['capsula', 'subtitles-en'], '', 'video'), ['capsula', 'subtitles-en']);
  const full = ['capsula', ...Array.from({length: 9}, (_, i) => 'cliente-' + i)];
  assert.deepEqual(tags(full, '', 'video'), ['subtitulos-es', ...full]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseProcessStatus } from '../assets/stock-process-dock.mjs';

test('interpreta el progreso real de subtítulos y cápsulas', () => {
  const subtitles = parseProcessStatus('🈯 subtítulos EN: quemando 37 %', 'es');
  assert.deepEqual({ kind: subtitles.kind, percent: subtitles.percent, state: subtitles.state }, { kind: 'subtitles', percent: 37, state: 'running' });
  const capsule = parseProcessStatus('🔁 cápsula 9:16: 82 %', 'es');
  assert.deepEqual({ kind: capsule.kind, percent: capsule.percent, label: capsule.label }, { kind: 'capsule', percent: 82, label: 'CÁPSULA' });
});

test('el importador usa progreso indeterminado y termina al 100 %', () => {
  const running = parseProcessStatus('// admira-tube-studio OK · descargando video…', 'es');
  assert.equal(running.kind, 'importer');
  assert.equal(running.percent, null);
  assert.equal(running.state, 'running');
  const uploading = parseProcessStatus('✓ Importado (12 MB) · subiendo a Stock… 37 %', 'es');
  assert.equal(uploading.percent, 37);
  assert.equal(uploading.state, 'running');
  const done = parseProcessStatus('✓ Importado (12 MB) · ✅ en Stock', 'es');
  assert.equal(done.kind, 'importer');
  assert.equal(done.percent, 100);
  assert.equal(done.state, 'done');
});

test('los errores completan la barra en rojo y los avisos normales no fingen progreso', () => {
  const failed = parseProcessStatus('// 🈯 subtítulos ES: no se pudieron generar (FFmpeg)', 'es');
  assert.equal(failed.state, 'error');
  assert.equal(failed.percent, 100);
  const status = parseProcessStatus('// no se pudo cargar el stock · pulsa ↻', 'es');
  assert.equal(status.kind, 'stock');
  assert.equal(status.process, false);
});

test('Stock elimina búsquedas guardadas e integra el dock en el cabezal', () => {
  for (const path of ['stock.html', 'en/stock.html']) {
    const html = readFileSync(path, 'utf8');
    assert.doesNotMatch(html, /stockSavedSearchControls|mountSavedSearches|Guardar búsqueda|Saved searches/);
    assert.match(html, /id="stockProcessDock"/);
    assert.match(html, /mountStockProcessDock/);
    assert.match(html, /id="stockStatus"/);
    assert.match(html, /workspace\.css\?v=stock-process-dock-20261024-1/);
  }
  const css = readFileSync('workspace.css', 'utf8');
  assert.match(css, /\.stock-process-track/);
  assert.match(css, /data-progress="indeterminate"/);
});

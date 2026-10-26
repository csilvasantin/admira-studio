import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve('extensions/admira-studio-importer');
const read = name => readFileSync(resolve(root, name), 'utf8');

test('manifest v3: panel lateral, YouTube y permisos mínimos del flujo', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'AdmiraStudioImporter');
  assert.equal(manifest.side_panel.default_path, 'sidepanel.html');
  assert.deepEqual(manifest.content_scripts[0].js, ['shared.js', 'content.js']);
  assert.ok(manifest.permissions.includes('sidePanel'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(!manifest.permissions.includes('tabs'));
  assert.ok(manifest.host_permissions.every(host => host.includes('youtube.com') || host.includes('youtu.be')));
  assert.ok(!manifest.permissions.includes('cookies'));
  assert.ok(!manifest.host_permissions.some(host => host.includes('admira.studio')));
  for (const [declaredSize, path] of Object.entries(manifest.icons)) {
    const iconPath = resolve(root, path);
    assert.ok(existsSync(iconPath), `falta ${path}`);
    const png = readFileSync(iconPath);
    assert.equal(png.readUInt32BE(16), Number(declaredSize), `${path}: ancho incorrecto`);
    assert.equal(png.readUInt32BE(20), Number(declaredSize), `${path}: alto incorrecto`);
  }
});

test('shared: solo acepta vídeos YouTube y construye el handoff de Admira Studio', () => {
  const sandbox = { URL };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('shared.js'), sandbox);
  const api = sandbox.AdmiraImporter;
  assert.equal(api.videoId('https://youtu.be/dQw4w9WgXcQ?t=1'), 'dQw4w9WgXcQ');
  assert.equal(api.canonicalUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(api.canonicalUrl('https://example.com/watch?v=dQw4w9WgXcQ'), '');
  const handoff = new URL(api.handoffUrl({
    url: 'https://youtu.be/dQw4w9WgXcQ', format: 'audio', comment: 'Demo', tags: '#test', autostart: true,
  }));
  assert.equal(handoff.origin, 'https://www.admira.studio');
  assert.equal(handoff.searchParams.get('importSource'), 'chrome');
  assert.equal(handoff.searchParams.get('importUrl'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(handoff.searchParams.get('importFormat'), 'audio');
  assert.equal(handoff.searchParams.get('importAutostart'), '1');
  assert.equal(handoff.searchParams.get('importTags'), '#test');
});

test('la interfaz ofrece botón YouTube, panel y feedback accesible', () => {
  const html = read('sidepanel.html');
  const content = read('content.js');
  const background = read('background.js');
  assert.match(html, /id="importForm"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /admira-studio-importer\/privacy/);
  assert.match(html, /viewBox="0 0 28 20"/);
  assert.match(content, /IMPORTAR EN ADMIRA/);
  assert.match(content, /yt-navigate-finish/);
  assert.match(background, /chrome\.sidePanel\.open/);
  assert.match(background, /const panelOpening = chrome\.sidePanel\.open\(\{ tabId \}\);\s+const contextUpdate = rememberContext/);
  assert.doesNotMatch(background, /await rememberContext[\s\S]{0,300}chrome\.sidePanel\.open/);
  assert.match(background, /chrome\.contextMenus\.create/);
  assert.ok(existsSync(resolve(root, 'privacy.html')));
  assert.ok(existsSync(resolve(root, 'support.html')));
});

test('Admira Studio recibe el handoff, limpia la URL e inicia el importador', () => {
  const app = readFileSync('app.js', 'utf8');
  assert.match(app, /importSource/);
  assert.match(app, /importAutostart/);
  assert.match(app, /AdmiraStudioImporter/);
  assert.match(app, /history\.replaceState/);
  assert.match(app, /chromeImportButton\?\.click\(\)/);
});



test('privacidad y soporte son públicos para la ficha de Chrome Web Store', () => {
  const middleware = readFileSync('functions/_middleware.js', 'utf8');
  for (const page of ['privacy', 'privacy.html', 'support', 'support.html']) {
    assert.match(middleware, new RegExp(`/extensions/admira-studio-importer/${page.replace('.', '\\.')}`));
  }
  assert.match(middleware, /PUBLIC_EXTENSION_DOCUMENTS\.has\(url\.pathname\)/);
});

function importerApi() {
  const sandbox = {URL}; sandbox.globalThis = sandbox;
  vm.runInNewContext(read('shared.js'), sandbox);
  return sandbox.AdmiraImporter;
}

test('cápsula ES: handoff usa etiquetas existentes, sin credenciales ni permisos nuevos', () => {
  const api = importerApi();
  const url = new URL(api.handoffUrl({url: 'https://youtu.be/jNQXAC9IVRw', format: 'video', subtitleLanguage: 'es', tags: '#cliente, #Cápsula, #negocio'}));
  assert.equal(url.searchParams.get('importTags'), 'capsula, subtitulos-es, cliente, negocio');
  assert.equal(url.searchParams.get('importFormat'), 'video');
  assert.equal(url.searchParams.has('token'), false);
  assert.equal(api.tagsForImport({format: 'audio', subtitleLanguage: 'es', tags: '#cliente'}), '#cliente');
  assert.equal(api.tagsForImport({format: 'video', tags: '#cliente'}), '#cliente');
});

test('cápsula ES: no pierde etiquetas de cliente al exceder la capacidad del Stock', () => {
  const api = importerApi();
  assert.throws(() => api.tagsForImport({subtitleLanguage: 'es', tags: Array.from({length: 9}, (_, i) => 'cliente' + i).join(',')}), /máximo 10/);
  assert.throws(() => api.tagsForImport({subtitleLanguage: 'es', tags: Array.from({length: 5}, (_, i) => String(i).repeat(76)).join(',')}), /400 caracteres/);
  const tags = api.tagsForImport({subtitleLanguage: 'es', tags: '#cliente;#negocio\n#subtítulos-es'});
  assert.equal(tags, 'capsula, subtitulos-es, cliente, negocio');
});

test('panel: la opción ES es por vídeo, se desactiva en audio y no queda como preferencia', async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {id, value: '', checked: false, hidden: false, disabled: false, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }});
    return elements.get(id);
  };
  const radios = ['video', 'audio'].map(value => ({...element(value), value}));
  radios[0].checked = true;
  const selected = () => radios.find(r => r.checked);
  const saved = [], messages = [];
  let tab = {id: 3, url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw'};
  const events = {};
  const chrome = {
    tabs: {query: async () => [tab], sendMessage: async () => ({url: tab.url, title: 'Fixture capsule'}),
      onActivated: {addListener(fn) {events.activate = fn;}}, onUpdated: {addListener() {}}},
    storage: {sync: {get: async defaults => defaults, set: async value => saved.push(value)}, session: {get: async () => ({})}},
    runtime: {sendMessage: async value => {messages.push(value); return {ok: true};}},
  };
  const document = {getElementById: element, querySelectorAll: () => radios, querySelector(selector) {
    const value = /value="(audio|video)"/.exec(selector)?.[1];
    return value ? radios.find(r => r.value === value) : selected();
  }};
  vm.runInNewContext(read('sidepanel.js'), {document, chrome, AdmiraImporter: importerApi()});
  await new Promise(resolve => setImmediate(resolve));
  const option = element('subtitleSpanish'); option.checked = true;
  element('autostart').checked = true;
  await element('importForm').listeners.submit({preventDefault() {}});
  assert.equal(messages[0].data.subtitleLanguage, 'es');
  assert.equal(saved[0].subtitleLanguage, undefined);
  assert.equal(saved[0].tags, '');
  assert.match(element('status').textContent, /castellano/);
  radios[0].checked = false; radios[1].checked = true; radios[1].listeners.change();
  assert.equal(option.checked, false); assert.equal(option.disabled, true);
  radios[0].checked = true; radios[1].checked = false; radios[0].listeners.change();
  option.checked = true;
  tab = {...tab, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'};
  await events.activate(); assert.equal(option.checked, false);
  option.checked = true;
  element('tags').value = Array.from({length: 9}, (_, i) => 'tag' + i).join(',');
  await element('importForm').listeners.submit({preventDefault() {}});
  assert.equal(messages.length, 1); assert.equal(saved.length, 1);
  assert.match(element('status').textContent, /máximo 10/);
  assert.equal(element('importButton').disabled, false);
});

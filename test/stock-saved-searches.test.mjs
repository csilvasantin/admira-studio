import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, MAX_SEARCHES, normalizeSearch, readSavedSearches, saveSearch, removeSearch, mountSavedSearches} from '../assets/stock-saved-searches.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {values, writes, getItem: key => values.has(key) ? values.get(key) : null,
    setItem(key, value) { writes.push(key); values.set(key, String(value)); }};
}
const combination = {q: 'Starbucks', type: 'video', format: 'portrait'};

test('normalizes a combination, preserves its text and deduplicates casing/whitespace without rewriting', () => {
  assert.deepEqual(normalizeSearch({q: '  Starbucks\n  café  ', type: ' VIDEO ', format: ' PORTRAIT '}), {q: 'Starbucks café', type: 'video', format: 'portrait'});
  assert.deepEqual(normalizeSearch({q: {bad: true}, type: null}), {q: '', type: '', format: ''});
  const storage = memoryStorage();
  const first = saveSearch(combination, storage);
  assert.equal(first.status, 'saved');
  assert.equal(first.search.q, 'Starbucks');
  const raw = storage.getItem(STORAGE_KEY);
  const duplicate = saveSearch({q: ' STARBUCKS ', type: 'VIDEO', format: 'portrait'}, storage);
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.search.id, first.search.id);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.equal(storage.writes.length, 1);
  assert.equal(saveSearch({...combination, type: 'image'}, storage).searches.length, 2);
  assert.equal(saveSearch({...combination, format: 'landscape'}, storage).searches.length, 3);
});

test('preserves existing version-1 entries, unknown fields and all unrelated saved data', () => {
  const original = {version: 1, metadata: {keep: true}, searches: [{id: 'old', q: 'Café', type: 'image', format: 'square', extra: 'keep'}]};
  const legacy = {'stockView': 'compact', 'stockSort': 'name-asc', 'stockPageSize': '25', 'pixeria-playlists-v1': '["playlist"]'};
  const storage = memoryStorage({...legacy, [STORAGE_KEY]: JSON.stringify(original)});
  const saved = saveSearch(combination, storage);
  assert.equal(saved.ok, true);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).searches[0], original.searches[0]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).metadata, original.metadata);
  assert.deepEqual(storage.writes, [STORAGE_KEY]);
  for (const [key, value] of Object.entries(legacy)) assert.equal(storage.getItem(key), value);
  const removed = removeSearch(saved.search.id, storage);
  assert.equal(removed.status, 'removed');
  assert.deepEqual(removed.searches, original.searches);
});

test('malformed, partial and future-version data are never overwritten by save or remove', () => {
  const cases = [
    ['{broken', 'invalid'], ['', 'invalid'], ['null', 'invalid'], ['[]', 'invalid'],
    [JSON.stringify({version: 1, searches: [{id: 'old', q: 'preserve'}]}), 'invalid'],
    [JSON.stringify({version: 1, searches: [{id: 'old', ...combination}, {id: 'old', ...combination}]}), 'invalid'],
    [JSON.stringify({version: 2, searches: 'unknown future payload', extra: true}), 'future']
  ];
  for (const [raw, status] of cases) {
    const storage = memoryStorage({[STORAGE_KEY]: raw});
    assert.equal(readSavedSearches(storage).status, status);
    assert.equal(saveSearch(combination, storage).status, status);
    assert.equal(removeSearch('old', storage).status, status);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(storage.writes.length, 0);
  }
});

test('limit never evicts old searches and removal permits another save', () => {
  const searches = Array.from({length: MAX_SEARCHES}, (_, i) => ({id: 's' + i, q: 'Search ' + i, type: 'video', format: ''}));
  const storage = memoryStorage({[STORAGE_KEY]: JSON.stringify({version: 1, searches})});
  const original = storage.getItem(STORAGE_KEY);
  assert.equal(saveSearch(combination, storage).status, 'limit');
  assert.equal(storage.getItem(STORAGE_KEY), original);
  assert.equal(saveSearch(searches[0], storage).status, 'duplicate');
  assert.equal(removeSearch('s20', storage).searches.length, MAX_SEARCHES - 1);
  assert.equal(saveSearch(combination, storage).searches.length, MAX_SEARCHES);
  assert.deepEqual(readSavedSearches(storage).searches.slice(0, 20), searches.slice(0, 20));
});

test('denied reads, quota failures and missing storage report failure without claiming a save', () => {
  assert.equal(readSavedSearches(null).status, 'unavailable');
  assert.equal(saveSearch(combination, {getItem() { throw Error('denied'); }, setItem() {}}).ok, false);
  const storage = memoryStorage();
  saveSearch({q: '', type: 'video', format: ''}, storage);
  const original = storage.getItem(STORAGE_KEY);
  storage.setItem = () => { throw Error('quota'); };
  for (const result of [saveSearch(combination, storage), removeSearch(readSavedSearches(storage).searches[0].id, storage)]) {
    assert.equal(result.ok, false);
    assert.equal(result.status, 'unavailable');
    assert.equal(result.searches.length, 1);
  }
  assert.equal(storage.getItem(STORAGE_KEY), original);
});

// A tiny DOM adapter exercises the event contract and rejects HTML insertion.
// Actual 320/390/desktop rendering is checked separately with the real browser.
function createHost() {
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.events = {}; this.ownText = ''; this.hidden = false; }
    set textContent(value) { this.ownText = String(value); this.children = []; }
    get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
    set innerHTML(_) { throw Error('Unsafe HTML insertion'); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.ownText = ''; this.children = children; }
    addEventListener(name, callback) { this.events[name] = callback; }
    click() { this.events.click?.(); }
    focus() { this.focused = true; }
  }
  const document = {createElement: tag => new Node(tag)};
  const host = new Node('div'); host.ownerDocument = document;
  const find = predicate => {
    function visit(node) { if (predicate(node)) return node; for (const child of node.children) { const found = visit(child); if (found) return found; } }
    return visit(host);
  };
  return {host, find};
}

test('UI saves, restores and removes in one touch; user strings remain literal text and accessible', () => {
  const {host, find} = createHost();
  const storage = memoryStorage();
  const maliciousText = '<img src=x onerror=alert(1)> & "Starbucks"';
  let current = {q: maliciousText, type: 'video', format: 'portrait'}, applied;
  const ui = mountSavedSearches({element: host, language: 'en-GB', storage, getSearch: () => current,
    applySearch: search => { applied = search; current = search; }, typeLabel: type => type === 'video' ? 'Video' : 'Image', formatLabel: () => 'Vertical'});
  const save = find(node => node.id === 'stockSaveSearch');
  const status = find(node => node.id === 'stockSavedSearchStatus');
  assert.equal(save.textContent, 'Save search');
  assert.equal(status.attributes['aria-live'], 'polite');
  save.click();
  assert.equal(status.textContent, 'Search saved.');
  const saved = readSavedSearches(storage).searches[0];
  const chip = find(node => node.dataset.savedSearch === saved.id);
  assert.equal(chip.textContent, maliciousText + ' · Video · Vertical');
  assert.equal(chip.attributes['aria-pressed'], 'true');
  current = {...combination, q: 'Other', type: 'image'}; ui.refresh();
  assert.equal(find(node => node.dataset.savedSearch === saved.id).attributes['aria-pressed'], 'false');
  find(node => node.dataset.savedSearch === saved.id).click();
  assert.equal(applied.q, maliciousText);
  assert.equal(applied.id, saved.id);
  assert.equal(applied.label, maliciousText + ' · Video · Vertical');
  assert.equal(status.textContent, 'Search restored.');
  const remove = find(node => node.dataset.removeSavedSearch === saved.id);
  assert.match(remove.attributes['aria-label'], /^Remove search: /);
  remove.click();
  assert.equal(readSavedSearches(storage).searches.length, 0);
  assert.equal(status.textContent, 'Search removed.');
  assert.equal(save.focused, true);
});

test('UI reports ES errors and never announces success when storage rejects a change', () => {
  const {host, find} = createHost();
  const storage = memoryStorage(); storage.setItem = () => { throw Error('quota'); };
  mountSavedSearches({element: host, language: 'es', storage, getSearch: () => combination, applySearch() {}});
  const save = find(node => node.id === 'stockSaveSearch');
  assert.equal(save.textContent, 'Guardar búsqueda');
  save.click();
  const status = find(node => node.id === 'stockSavedSearchStatus');
  assert.equal(status.dataset.state, 'unavailable');
  assert.match(status.textContent, /No se ha podido guardar/);
  assert.equal(readSavedSearches(storage).searches.length, 0);
});

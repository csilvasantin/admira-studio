export const STORAGE_KEY = 'admira:stock:saved-searches:v1';
export const MAX_SEARCHES = 50;

// These preferences have their own key. Stock's existing cache, playlists and
// view/sort/page-size preferences are never read or rewritten here.
export function normalizeSearch(value = {}) {
  const text = key => typeof value?.[key] === 'string' ? value[key].trim() : '';
  return {q: text('q').replace(/\s+/gu, ' '), type: text('type').toLowerCase(), format: text('format').toLowerCase()};
}

function searchKey(value) {
  const search = normalizeSearch(value);
  return JSON.stringify([search.q.toLowerCase(), search.type, search.format]);
}

function validRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.id === 'string' && value.id.length > 0
    && ['q', 'type', 'format'].every(key => typeof value[key] === 'string');
}

export function readSavedSearches(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') {
      return {ok: false, status: 'unavailable', searches: []};
    }
    const raw = target.getItem(STORAGE_KEY);
    if (raw === null) return {ok: true, status: 'ready', searches: [], data: {version: 1, searches: []}, storage: target};
    let data;
    try { data = JSON.parse(raw); } catch { return {ok: false, status: 'invalid', searches: []}; }
    if (data && typeof data === 'object' && Number.isInteger(data.version) && data.version > 1) {
      return {ok: false, status: 'future', searches: []};
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1
      || !Array.isArray(data.searches) || !data.searches.every(validRecord)
      || new Set(data.searches.map(search => search.id)).size !== data.searches.length) {
      return {ok: false, status: 'invalid', searches: []};
    }
    return {ok: true, status: 'ready', searches: data.searches, data, storage: target};
  } catch { return {ok: false, status: 'unavailable', searches: []}; }
}

function writeSavedSearches(state, searches) {
  try {
    // Keep unknown fields from valid version-1 data so future additions to the
    // current schema do not disappear when someone saves or removes a search.
    state.storage.setItem(STORAGE_KEY, JSON.stringify({...state.data, searches}));
    return {ok: true, searches};
  } catch { return {ok: false, status: 'unavailable', searches: state.searches}; }
}

export function saveSearch(value, storage) {
  const state = readSavedSearches(storage);
  if (!state.ok) return state;
  const search = normalizeSearch(value);
  const existing = state.searches.find(item => searchKey(item) === searchKey(search));
  if (existing) return {ok: true, status: 'duplicate', searches: state.searches, search: existing};
  if (state.searches.length >= MAX_SEARCHES) return {ok: false, status: 'limit', searches: state.searches};
  let id;
  do { id = globalThis.crypto?.randomUUID?.() || `search-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
  while (state.searches.some(item => item.id === id));
  const record = {id, ...search};
  const result = writeSavedSearches(state, [...state.searches, record]);
  return result.ok ? {...result, status: 'saved', search: record} : result;
}

export function removeSearch(id, storage) {
  const state = readSavedSearches(storage);
  if (!state.ok) return state;
  if (!state.searches.some(item => item.id === id)) return {ok: true, status: 'unchanged', searches: state.searches};
  const result = writeSavedSearches(state, state.searches.filter(item => item.id !== id));
  return result.ok ? {...result, status: 'removed'} : result;
}

export function mountSavedSearches({element, language = 'es', getSearch, applySearch, typeLabel, formatLabel, storage}) {
  if (!element || typeof getSearch !== 'function' || typeof applySearch !== 'function') {
    throw new TypeError('Saved searches require an element, getSearch and applySearch');
  }
  const document = element.ownerDocument;
  const english = String(language).toLowerCase().startsWith('en');
  const t = (es, en) => english ? en : es;
  const texts = {
    title: t('Búsquedas guardadas', 'Saved searches'), save: t('Guardar búsqueda', 'Save search'),
    saved: t('Búsqueda guardada.', 'Search saved.'), duplicate: t('Esta búsqueda ya está guardada.', 'This search is already saved.'),
    removed: t('Búsqueda eliminada.', 'Search removed.'), applied: t('Búsqueda recuperada.', 'Search restored.'),
    unavailable: t('No se ha podido guardar el cambio en este navegador. Tus búsquedas anteriores se conservan.', 'The change could not be saved in this browser. Your existing searches are preserved.'),
    invalid: t('No se pueden actualizar las búsquedas guardadas: sus datos no se reconocen y se han conservado.', 'Saved searches cannot be updated: their data is not recognized and has been preserved.'),
    future: t('Estas búsquedas se guardaron con una versión más reciente. Sus datos se han conservado.', 'These searches were saved with a newer version. Their data has been preserved.'),
    limit: t('Has alcanzado 50 búsquedas guardadas. Elimina alguna para guardar otra.', 'You have reached 50 saved searches. Remove one to save another.'),
    restoreFailed: t('No se ha podido recuperar esta búsqueda. Vuelve a intentarlo.', 'This search could not be restored. Please try again.')
  };
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const heading = create('span', 'stock-saved-searches-title', texts.title);
  const saveButton = create('button', 'stock-pager-btn stock-save-search', texts.save);
  saveButton.type = 'button';
  saveButton.id = 'stockSaveSearch';
  const list = create('div', 'stock-saved-searches');
  list.id = 'stockSavedSearches';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', texts.title);
  const status = create('p', 'stock-saved-search-status');
  status.id = 'stockSavedSearchStatus';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  element.replaceChildren(heading, saveButton, list, status);

  const label = value => {
    const search = normalizeSearch(value);
    const type = typeLabel ? typeLabel(search.type) : (search.type || t('Todos los tipos', 'All types'));
    const format = formatLabel ? formatLabel(search.format) : (search.format || t('Todos los formatos', 'All formats'));
    return [search.q, type, format].filter(Boolean).join(' · ');
  };
  function announce(code) {
    status.textContent = texts[code] || '';
    status.dataset.state = code;
  }
  function refresh() {
    const focusedId = document.activeElement?.dataset?.savedSearch;
    const scrollTop = list.scrollTop;
    let focusTarget;
    const current = getSearch();
    const currentLabel = label(current);
    saveButton.title = `${texts.save}: ${currentLabel}`;
    saveButton.setAttribute('aria-label', saveButton.title);
    const state = readSavedSearches(storage);
    list.replaceChildren();
    for (const search of state.searches) {
      const title = label(search);
      const row = create('span', 'stock-saved-search-item');
      const button = create('button', 'stock-pager-btn stock-saved-search', title);
      button.type = 'button';
      button.dataset.savedSearch = search.id;
      if (search.id === focusedId) focusTarget = button;
      button.title = title;
      button.setAttribute('aria-pressed', String(searchKey(search) === searchKey(current)));
      button.addEventListener('click', () => {
        try {
          applySearch({...normalizeSearch(search), id: search.id, label: title});
          announce('applied');
          refresh();
        } catch { announce('restoreFailed'); }
      });
      const remove = create('button', 'stock-pager-btn stock-remove-saved-search', '×');
      remove.type = 'button';
      remove.dataset.removeSavedSearch = search.id;
      remove.title = t('Eliminar búsqueda', 'Remove search') + ': ' + title;
      remove.setAttribute('aria-label', remove.title);
      remove.addEventListener('click', () => {
        const result = removeSearch(search.id, storage);
        announce(result.status);
        refresh();
        if (result.ok) saveButton.focus();
      });
      row.append(button, remove);
      list.append(row);
    }
    list.hidden = !state.searches.length;
    list.scrollTop = scrollTop;
    focusTarget?.focus({preventScroll: true});
    if (!state.ok) announce(state.status);
  }
  saveButton.addEventListener('click', () => {
    const result = saveSearch(getSearch(), storage);
    announce(result.status);
    refresh();
  });
  document.defaultView?.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) refresh();
  });
  refresh();
  return {refresh};
}

export const NAVIGATION_KEY = 'admira:stock:state:v1';
const types = new Set(['', 'video', 'image', 'audio', 'locucion', 'music', 'twin-npc', 'digital-twin', 'xpaces', 'catalogo', 'animation', 'tiktok', 'furni', 'capsula', 'fallidos']);
const sorts = new Set(['date-desc', 'date-asc', 'name-asc', 'name-desc']);
const text = (value, max = 200) => typeof value === 'string' ? value.slice(0, max) : '';
const integer = (value, fallback, min, max) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;

export function normalizeNavigation(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return {
    q: text(value.q), type: types.has(value.type) ? value.type : 'video',
    format: text(value.format, 80), origen: text(value.origen, 160).replace(/[^A-Za-z0-9-]/g, ''),
    motor: text(value.motor, 120),
    tags: Array.isArray(value.tags) ? value.tags.filter(t => typeof t === 'string' && /^[a-zA-Z0-9:_-]{1,80}$/.test(t)).map(t => t.toLowerCase()).slice(0, 50) : [],
    tagMode: value.tagMode === 'and' ? 'and' : 'or',
    page: integer(value.page, 1, 1, 1000000), pageSize: integer(value.pageSize, 10, 0, 1000000),
    sort: sorts.has(value.sort) ? value.sort : 'date-desc', view: value.view === 'compact' ? 'compact' : 'list'
  };
}

export function readNavigation(url, storage, preferences = {}) {
  const u = new URL(url), p = u.searchParams;
  let saved = {};
  try {
    const data = JSON.parse(storage?.getItem(NAVIGATION_KEY) || 'null');
    if (data?.version === 1 && data.context === (p.get('cliente') || '') && data.state) saved = data.state;
  } catch {}
  const explicit = ['q', 'type', 'format', 'origen', 'tag', 'highlight', 'catalogo'].some(k => p.has(k));
  const {sort, view, pageSize} = preferences;
  const state = {sort, view, pageSize, ...(explicit ? {} : saved)};
  for (const key of ['q', 'type', 'format', 'origen', 'motor', 'sort', 'view', 'page', 'pageSize', 'tagMode']) {
    if (p.has(key)) state[key] = p.get(key);
  }
  if (p.has('tag')) state.tags = p.getAll('tag');
  return normalizeNavigation(state);
}

export function navigationUrl(url, value) {
  const u = new URL(url), s = normalizeNavigation(value);
  // Empty type means all types, while an absent type defaults to video.
  u.searchParams.set('type', s.type);
  for (const key of ['q', 'format', 'origen', 'motor']) {
    if (s[key]) u.searchParams.set(key, s[key]); else u.searchParams.delete(key);
  }
  u.searchParams.delete('tag');
  for (const tag of s.tags) u.searchParams.append('tag', tag);
  for (const [key, fallback] of [['page', 1], ['pageSize', 10], ['sort', 'date-desc'], ['view', 'list'], ['tagMode', 'or']]) {
    if (s[key] !== fallback) u.searchParams.set(key, String(s[key])); else u.searchParams.delete(key);
  }
  return u;
}

export function saveNavigation(storage, url, state) {
  try {
    const raw = storage?.getItem(NAVIGATION_KEY);
    const previous = raw ? JSON.parse(raw) : null;
    if (previous && previous.version !== 1) return false;
    storage?.setItem(NAVIGATION_KEY, JSON.stringify({version: 1, context: new URL(url).searchParams.get('cliente') || '', state: normalizeNavigation(state)}));
    return !!storage;
  } catch { return false; }
}

/* global AdmiraImporter */
'use strict';

const ui = {
  empty: document.getElementById('emptyState'),
  form: document.getElementById('importForm'),
  thumbnail: document.getElementById('thumbnail'),
  title: document.getElementById('videoTitle'),
  channel: document.getElementById('videoChannel'),
  comment: document.getElementById('comment'),
  tags: document.getElementById('tags'),
  autostart: document.getElementById('autostart'),
  subtitleLanguage: document.getElementById('subtitleLanguage'),
  targetFormat: document.getElementById('targetFormat'),
  button: document.getElementById('importButton'),
  status: document.getElementById('status'),
};

let activeTab = null;
let context = null;

function showStatus(message, kind) {
  ui.status.textContent = message;
  ui.status.className = `status${kind ? ` ${kind}` : ''}`;
}

function render(next) {
  const previousUrl = context && context.url;
  context = next && AdmiraImporter.canonicalUrl(next.url) ? {
    ...next,
    url: AdmiraImporter.canonicalUrl(next.url),
    thumbnail: next.thumbnail || AdmiraImporter.thumbnailUrl(next.url),
  } : null;
  ui.empty.hidden = !!context;
  ui.form.hidden = !context;
  // Translation is an explicit choice for this video, never a sticky preference.
  if (!context || context.url !== previousUrl) {ui.subtitleLanguage.value = 'none'; ui.targetFormat.value = 'original';}
  if (!context) return;
  ui.thumbnail.src = context.thumbnail;
  ui.title.textContent = context.title || 'Vídeo de YouTube';
  ui.channel.textContent = context.channel || 'YouTube';
  showStatus('Listo para importar.', '');
}

function updateSubtitleAvailability() {
  const audio = document.querySelector('input[name="format"]:checked')?.value === 'audio';
  ui.subtitleLanguage.disabled = ui.targetFormat.disabled = audio;
  if (audio) {ui.subtitleLanguage.value = 'none'; ui.targetFormat.value = 'original';}
}
document.querySelectorAll('input[name="format"]').forEach(input => input.addEventListener('change', updateSubtitleAvailability));

async function contextFromTab(tab) {
  if (!tab || !tab.id) return null;
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT' });
    if (result && result.url) return result;
  } catch {}
  const url = AdmiraImporter.canonicalUrl(tab.url);
  return url ? { url, title: String(tab.title || '').replace(/\s+-\s+YouTube\s*$/i, ''), thumbnail: AdmiraImporter.thumbnailUrl(url) } : null;
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  activeTab = tab || null;
  let next = await contextFromTab(activeTab);
  if (!next) {
    const saved = await chrome.storage.session.get('currentVideo');
    if (saved.currentVideo && activeTab && AdmiraImporter.canonicalUrl(activeTab.url)) next = saved.currentVideo;
  }
  render(next);
}

async function loadPreferences() {
  const saved = await chrome.storage.sync.get({ format: 'video', tags: '', autostart: true });
  const radio = document.querySelector(`input[name="format"][value="${saved.format === 'audio' ? 'audio' : 'video'}"]`);
  if (radio) radio.checked = true;
  ui.tags.value = String(saved.tags || '');
  ui.autostart.checked = saved.autostart !== false;
  updateSubtitleAvailability();
}

ui.form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!context) return;
  const format = document.querySelector('input[name="format"]:checked')?.value || 'video';
  const data = {
    url: context.url,
    title: context.title,
    comment: ui.comment.value.trim(),
    tags: ui.tags.value.trim(),
    format,
    autostart: ui.autostart.checked,
    subtitleLanguage: format === 'video' ? ui.subtitleLanguage.value : '',
    targetFormat: format === 'video' ? ui.targetFormat.value : '',
  };
  ui.button.disabled = true;
  showStatus('Abriendo Admira Studio y preparando el Stock…', '');
  try {
    // Validate before opening a tab or saving preferences. The background repeats
    // this validation when it builds the handoff.
    AdmiraImporter.tagsForImport(data);
    await chrome.storage.sync.set({ format, tags: data.tags, autostart: data.autostart });
    const response = await chrome.runtime.sendMessage({ type: 'OPEN_IMPORT', data, openerTabId: activeTab && activeTab.id });
    if (!response || !response.ok) throw new Error(response && response.error || 'No se pudo abrir Admira Studio');
    if (activeTab && activeTab.id) chrome.tabs.sendMessage(activeTab.id, { type: 'IMPORT_STARTED' }).catch(() => {});
    showStatus(data.autostart
      ? `✓ Importación iniciada.${['es', 'en'].includes(data.subtitleLanguage) ? ` Subtítulos en ${data.subtitleLanguage === 'es' ? 'castellano' : 'inglés'}.` : ''}${data.targetFormat && data.targetFormat !== 'original' ? ' Se prepararán los formatos elegidos.' : ''} El progreso continúa en Stock; mantenlo abierto.`
      : '✓ Importación preparada para confirmar en Admira Studio.', 'ok');
  } catch (error) {
    showStatus(`No se pudo abrir: ${String(error && error.message || error)}`, 'error');
  } finally {
    ui.button.disabled = false;
  }
});

chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (activeTab && tabId === activeTab.id && (changeInfo.url || changeInfo.status === 'complete')) refresh();
});

Promise.all([loadPreferences(), refresh()]).catch(error => showStatus(String(error && error.message || error), 'error'));

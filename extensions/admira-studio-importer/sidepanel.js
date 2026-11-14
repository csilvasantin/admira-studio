/* global AdmiraImporter */
'use strict';

const ui = {
  search: document.getElementById('youtubeSearch'),
  query: document.getElementById('youtubeQuery'),
  searchStatus: document.getElementById('youtubeSearchStatus'),
  results: document.getElementById('youtubeResults'),
  videoSource: document.getElementById('videoSource'),
  form: document.getElementById('importForm'),
  thumbnail: document.getElementById('thumbnail'),
  poster: document.getElementById('videoPoster'),
  playPreview: document.getElementById('playPreview'),
  preview: document.getElementById('videoPreview'),
  previewStatus: document.getElementById('previewStatus'),
  title: document.getElementById('videoTitle'),
  channel: document.getElementById('videoChannel'),
  comment: document.getElementById('comment'),
  tags: document.getElementById('tags'),
  tagHelp: document.getElementById('tagHelp'),
  autostart: document.getElementById('autostart'),
  subtitleLanguage: document.getElementById('subtitleLanguage'),
  targetFormat: document.getElementById('targetFormat'),
  formatHelp: document.getElementById('formatHelp'),
  login: document.getElementById('googleLogin'),
  project: document.getElementById('importProject'),
  projectStatus: document.getElementById('projectStatus'),
  button: document.getElementById('importButton'),
  status: document.getElementById('status'),
};

let activeTab = null;
let context = null;
let selectedResult = null;
let selectedQuery = '';
let defaultComment = '';
let searchSequence = 0;
let tagsEdited = false;
let formatEdited = false;
let refreshSequence = 0;
let projectSession = null;
let projectRefreshSequence = 0;
let loginTabId = null;
let importing = false;
let previewSequence = 0;
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = `v${manifest.version_name || manifest.version}`;
ui.tags.addEventListener('input', () => { tagsEdited = true; });
ui.targetFormat.addEventListener('change', () => { formatEdited = true; updateSubtitleAvailability(); });

function selectedProject() {
  if (!projectSession?.authenticated) return null;
  const id = ui.project.value;
  if (id === '' && projectSession.allProjects) return '';
  return projectSession.projects.some(project => project.id === id) ? id : null;
}

function updateImportAvailability() {
  ui.button.disabled = importing || selectedProject() === null;
}

async function refreshProjectSession() {
  const sequence = ++projectRefreshSequence;
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_PROJECT_SESSION' });
    if (sequence !== projectRefreshSequence) return;
    if (!state?.ok) throw new Error(state?.error || 'No se pudo comprobar la sesión.');
    const previous = state.account === projectSession?.account ? selectedProject() : null;
    projectSession = state;
    ui.login.hidden = state.authenticated;
    ui.login.disabled = false;
    ui.login.textContent = 'Entrar con Google';
    ui.project.hidden = !state.authenticated;
    ui.projectStatus.textContent = '';
    if (state.authenticated) {
      loginTabId = null;
      const projects = state.projects.map(p => new Option(AdmiraProjectFormats.label(p), p.id));
      if (state.allProjects) projects.unshift(new Option('Todos los proyectos', ''));
      else if (projects.length !== 1) {
        const placeholder = new Option(projects.length ? 'Elegir proyecto' : 'Sin proyectos', '');
        placeholder.disabled = true;
        projects.unshift(placeholder);
      }
      ui.project.replaceChildren(...projects);
      ui.project.disabled = !state.allProjects && state.projects.length === 0;
      if (previous !== null && projects.some(option => option.value === previous && !option.disabled)) ui.project.value = previous;
      else ui.project.selectedIndex = 0;
      updateProjectFormats();
    }
  } catch (error) {
    if (sequence !== projectRefreshSequence) return;
    projectSession = null;
    ui.project.hidden = true;
    ui.login.hidden = false;
    ui.login.disabled = false;
    ui.login.textContent = 'Reintentar';
    ui.projectStatus.textContent = error.message;
  }
  updateImportAvailability();
}

function updateProjectFormats() {
  const previous=ui.targetFormat.value;
  ui.targetFormat.replaceChildren(...[['original','Conservar formato original'],['vertical','Vertical · 9:16'],['horizontal','Horizontal · 16:9'],['both','Vertical y horizontal'],['all','Todos los formatos del proyecto']].map(([v,n])=>new Option(n,v)));
  const project=projectSession?.projects.find(p=>p.id===ui.project.value);
  const allOption=[...ui.targetFormat.options].find(o=>o.value==='all');
  allOption.disabled=project?.formatsKnown===false;
  allOption.textContent=project?.hasCustom?`Todos los formatos de ${project.name} (${project.formats.length})`:'Todos · vertical y horizontal';
  if(project?.hasCustom){const group=document.createElement('optgroup');group.label='Formatos de '+project.name;
    for(const f of project.formats){const suffix=f.pattern?` · ${f.pattern} · ${f.screens.length} pantallas`:f.size?` · ${f.size.join(' × ')}`:'';group.append(new Option(f.name+suffix,f.value));}
    ui.targetFormat.append(group);
  }
  ui.targetFormat.value=[...ui.targetFormat.options].some(o=>o.value===previous)?previous:'original';
  formatEdited=true;
  ui.projectStatus.textContent=project?.formatsKnown===false?'No se pudieron verificar los formatos custom. Vuelve a cargar los proyectos.':'';
  updateSubtitleAvailability();
}
ui.project.addEventListener('change', () => { updateProjectFormats(); updateImportAvailability(); });
ui.login.addEventListener('click', async () => {
  if (!projectSession) {
    await refreshProjectSession();
    return;
  }
  try {
    const login = await chrome.tabs.create({ url: 'https://admira.studio/auth/login?return_to=%2Fstock.html' });
    loginTabId = login.id;
  } catch {
    ui.projectStatus.textContent = 'No se pudo abrir el acceso con Google.';
  }
});

function showResults(results, searchQuery = '') {
  const items = results.map(result => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selectedResult?.url === result.url));
    const image = document.createElement('img');
    image.src = AdmiraImporter.thumbnailUrl(result.url);
    image.alt = '';
    image.loading = 'lazy';
    const description = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = result.title;
    const channel = document.createElement('small');
    channel.textContent = result.channel || (result.short ? 'Short · YouTube' : 'YouTube');
    description.append(title, channel);
    button.append(image, description);
    button.addEventListener('click', () => {
      selectedResult = result;
      selectedQuery = searchQuery;
      for (const entry of ui.results.querySelectorAll('button')) {
        entry.setAttribute('aria-pressed', String(entry === button));
      }
      render(result);
      ui.searchStatus.textContent = 'Vídeo listo para importar.';
    });
    item.append(button);
    return item;
  });
  ui.results.replaceChildren(...items);
  ui.results.hidden = !items.length;
}

ui.search.addEventListener('submit', async event => {
  event.preventDefault();
  const sequence = ++searchSequence;
  const query = ui.query.value.trim();
  const bareYoutubeLink = /^(?:(?:www\.|m\.|music\.)?youtube\.com|youtu\.be)\//i.test(query);
  const videoUrl = AdmiraImporter.canonicalUrl(bareYoutubeLink ? `https://${query}` : query);
  showResults([]);
  if (videoUrl) {
    selectedResult = context?.url === videoUrl ? context : { url: videoUrl, short: /\/shorts\//i.test(query) };
    selectedQuery = '';
    render(selectedResult);
    ui.searchStatus.textContent = 'Enlace listo para importar.';
    return;
  }
  if (!query) {
    ui.searchStatus.textContent = 'Escribe un título o pega un enlace de YouTube.';
    return;
  }
  if (bareYoutubeLink || /^[a-z][a-z\d+.-]*:\/\//i.test(query)) {
    ui.searchStatus.textContent = 'Pega el enlace de un vídeo, Short o directo de YouTube.';
    return;
  }
  ui.searchStatus.textContent = 'Buscando en YouTube…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SEARCH_YOUTUBE', query });
    if (sequence !== searchSequence) return;
    if (!response?.ok) throw new Error(response?.error || 'YouTube no está disponible.');
    showResults(response.results, query);
    ui.searchStatus.textContent = response.results.length ? 'Elige un vídeo para importarlo.' : 'No se encontraron vídeos. Prueba otra búsqueda.';
  } catch (error) {
    if (sequence === searchSequence) ui.searchStatus.textContent = error.message;
  }
});

function showStatus(message, kind) {
  ui.status.textContent = message;
  ui.status.className = `status${kind ? ` ${kind}` : ''}`;
}

function closeVideoPreview() {
  ++previewSequence;
  ui.preview.replaceChildren();
  ui.preview.hidden = ui.previewStatus.hidden = true;
  ui.poster.hidden = ui.playPreview.disabled = false;
}

ui.playPreview.addEventListener('click', async () => {
  const id = AdmiraImporter.videoId(context?.url);
  if (!id) return;
  const sequence = ++previewSequence;
  ui.playPreview.disabled = true;
  ui.previewStatus.hidden = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'PREPARE_VIDEO_PREVIEW' });
    if (sequence !== previewSequence) return;
    if (!response?.ok) throw new Error('No se pudo cargar el reproductor. Vuelve a intentarlo.');
    const player = document.createElement('iframe');
    player.title = 'Vista previa de YouTube';
    player.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    player.allowFullscreen = true;
    player.src = `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
    ui.preview.replaceChildren(player);
    ui.poster.hidden = true;
    ui.preview.hidden = false;
    player.focus();
  } catch {
    if (sequence !== previewSequence) return;
    ui.previewStatus.textContent = 'No se pudo cargar el reproductor. Vuelve a intentarlo.';
    ui.previewStatus.hidden = ui.playPreview.disabled = false;
    ui.playPreview.focus();
  }
});

function render(next) {
  const previousUrl = context && context.url;
  context = next && AdmiraImporter.canonicalUrl(next.url) ? {
    ...next,
    url: AdmiraImporter.canonicalUrl(next.url),
    thumbnail: next.thumbnail || AdmiraImporter.thumbnailUrl(next.url),
  } : null;
  ui.form.hidden = !context;
  ui.videoSource.textContent = selectedResult ? 'VÍDEO ELEGIDO' : 'VÍDEO DETECTADO';
  if (context?.url !== previousUrl) {
    closeVideoPreview();
    ui.subtitleLanguage.value = 'none';
    ui.targetFormat.value = 'original';
    ui.tags.value = '';
    tagsEdited = false;
    formatEdited = false;
  }
  if (!context) return;
  const title = String(context.title || '').trim();
  if (title !== defaultComment) {
    const notes = ui.comment.value.startsWith(defaultComment + '\n')
      ? ui.comment.value.slice(defaultComment.length).trim()
      : ui.comment.value === defaultComment ? '' : ui.comment.value.trim();
    defaultComment = title;
    ui.comment.value = [title, notes].filter(Boolean).join('\n').slice(0, ui.comment.maxLength);
  }
  ui.thumbnail.src = context.thumbnail;
  ui.title.textContent = context.title || 'Vídeo de YouTube';
  ui.channel.textContent = context.channel || 'YouTube';
  updateSubtitleAvailability();
  if (!tagsEdited) {
    const suggested = AdmiraImporter.suggestTags(context, selectedQuery);
    ui.tags.value = suggested.join(', ');
    ui.tagHelp.textContent = selectedQuery
      ? 'Etiquetas del vídeo y de tu búsqueda. Puedes editarlas.'
      : 'Etiquetas sugeridas a partir de los datos de YouTube. Puedes editarlas.';
  }
  showStatus('Listo para importar.', '');
}

function updateSubtitleAvailability() {
  const audio = document.querySelector('input[name="format"]:checked')?.value === 'audio';
  ui.subtitleLanguage.disabled = ui.targetFormat.disabled = audio;
  if (audio) {
    ui.subtitleLanguage.value = 'none';
    ui.targetFormat.value = 'original';
    formatEdited = false;
  } else if (!formatEdited) {
    ui.targetFormat.value = AdmiraImporter.suggestedFormat(context);
  }
  if(ui.targetFormat.value==='all'){ui.formatHelp.textContent='Todos los formatos del proyecto. Los formatos custom se revisan y exportan desde Adaptador.';return;}
  const selected=projectSession?.projects.find(p=>p.id===ui.project.value)?.formats?.find(f=>f.value===ui.targetFormat.value);
  if(selected){ui.formatHelp.textContent=selected.pattern?'De izquierda a derecha: '+selected.screens.map((s,i)=>`${i+1}: ${s.h>s.w?'vertical':'horizontal'}`).join(' · '):'Formato propio del proyecto. Se prepara para revisar en Adaptador.';return;}
  const width = Number(context?.width), height = Number(context?.height);
  ui.formatHelp.textContent = width > 0 && height > 0
    ? 'Original ' + (width > height ? 'horizontal' : width < height ? 'vertical' : 'cuadrado') + ' · ' + width + ' × ' + height
    : 'Orientación original pendiente. Puedes elegir la adaptación.';
}
document.querySelectorAll('input[name="format"]').forEach(input => input.addEventListener('change', updateSubtitleAvailability));

async function contextFromTab(tab) {
  if (!tab || !tab.id) return null;
  const url = AdmiraImporter.canonicalUrl(tab.url);
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT' });
    if (url && AdmiraImporter.canonicalUrl(result?.url) === url) return result;
  } catch {}
  return url ? { url, title: String(tab.title || '').replace(/\s+-\s+YouTube\s*$/i, ''), thumbnail: AdmiraImporter.thumbnailUrl(url), short: /\/shorts\//.test(tab.url) } : null;
}

async function refresh() {
  const sequence = ++refreshSequence;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let next = await contextFromTab(tab);
  if (next && !next.channel && !next.width) {
    const { currentVideo } = await chrome.storage.session.get('currentVideo');
    if (currentVideo?.url === next.url) {
      next = { ...next, title: next.title || currentVideo.title, channel: currentVideo.channel,
        width: currentVideo.width, height: currentVideo.height };
    }
  }
  if (sequence !== refreshSequence) return;
  activeTab = tab || null;
  if (!selectedResult) render(next);
}

async function loadPreferences() {
  const saved = await chrome.storage.sync.get({ format: 'video', autostart: true });
  const radio = document.querySelector(`input[name="format"][value="${saved.format === 'audio' ? 'audio' : 'video'}"]`);
  if (radio) radio.checked = true;
  ui.autostart.checked = saved.autostart !== false;
  updateSubtitleAvailability();
}

ui.form.addEventListener('submit', async event => {
  event.preventDefault();
  const projectId = selectedProject();
  if (!context || importing || projectId === null) return;
  const account = projectSession.account;
  const format = document.querySelector('input[name="format"]:checked')?.value || 'video';
  const data = {
    url: context.url,
    title: context.title,
    comment: ui.comment.value.trim(),
    tags: ui.tags.value.trim(),
    format,
    projectId,
    autostart: ui.autostart.checked,
    subtitleLanguage: format === 'video' ? ui.subtitleLanguage.value : '',
    targetFormat: format === 'video' ? ui.targetFormat.value : '',
  };
  const openerTabId = activeTab?.id;
  const importingActiveVideo = AdmiraImporter.canonicalUrl(activeTab?.url) === context.url;
  importing = true;
  updateImportAvailability();
  showStatus('Abriendo Admira Studio y preparando el Stock…', '');
  try {
    // Validate before opening a tab or saving preferences. The background repeats
    // this validation when it builds the handoff.
    AdmiraImporter.tagsForImport(data);
    await chrome.storage.sync.set({ format, autostart: data.autostart });
    const response = await chrome.runtime.sendMessage({ type: 'OPEN_IMPORT', data, openerTabId, account });
    if (!response || !response.ok) throw new Error(response && response.error || 'No se pudo abrir Admira Studio');
    if (openerTabId && importingActiveVideo) chrome.tabs.sendMessage(openerTabId, { type: 'IMPORT_STARTED' }).catch(() => {});
    showStatus(data.autostart
      ? `✓ Importación iniciada.${['es', 'en'].includes(data.subtitleLanguage) ? ` Subtítulos en ${data.subtitleLanguage === 'es' ? 'castellano' : 'inglés'}.` : ''}${data.targetFormat && data.targetFormat !== 'original' ? ' Se prepararán los formatos elegidos.' : ''} El progreso continúa en Stock; mantenlo abierto.`
      : '✓ Importación preparada para confirmar en Admira Studio.', 'ok');
  } catch (error) {
    showStatus(`No se pudo abrir: ${String(error && error.message || error)}`, 'error');
    void refreshProjectSession();
  } finally {
    importing = false;
    updateImportAvailability();
  }
});

chrome.tabs.onActivated.addListener(refresh);
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'VIDEO_CONTEXT_CHANGED' && sender.tab?.id === activeTab?.id) void refresh();
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (activeTab && tabId === activeTab.id && (changeInfo.url || changeInfo.status === 'complete')) refresh();
  if (tabId === loginTabId && changeInfo.status === 'complete') void refreshProjectSession();
});

window.addEventListener('focus', () => void refreshProjectSession());
void refreshProjectSession();
Promise.all([loadPreferences(), refresh()]).catch(error => showStatus(String(error && error.message || error), 'error'));

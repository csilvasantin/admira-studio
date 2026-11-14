/* global AdmiraImporter */
'use strict';

importScripts('shared.js', 'youtube-search.js', 'project-formats.js');

const MENU_ID = 'admira-studio-import-youtube';
const STUDIO_ORIGIN = 'https://admira.studio';
const YOKUP_PROJECTS = 'https://api.yokup.com/projects';
const PREVIEW_REFERRER_RULE = 1;
let previewReferrerReady;

function preparePreview() {
  // YouTube requires an HTTPS Referer identifying the extension for embed requests.
  previewReferrerReady ??= chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [PREVIEW_REFERRER_RULE],
    addRules: [{
      id: PREVIEW_REFERRER_RULE,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'referer',
          operation: 'set',
          value: `https://admirastudioimporter.${chrome.runtime.id}/`,
        }],
      },
      condition: {
        urlFilter: '|https://www.youtube.com/embed/',
        initiatorDomains: [chrome.runtime.id],
        resourceTypes: ['sub_frame'],
      },
    }],
  }).catch(error => {
    previewReferrerReady = undefined;
    throw error;
  });
  return previewReferrerReady;
}

async function readProjectSession() {
  const headers = { Accept: 'application/json' };
  const options = { headers, cache: 'no-store' };
  const response = await fetch(`${STUDIO_ORIGIN}/auth/session`, {
    ...options, credentials: 'include', signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) return { authenticated: false };
  if (!response.ok) throw new Error('No se pudo comprobar la sesión de Admira Studio.');
  const session = await response.json();
  if (!session.ok || !session.email || !(session.clientes === null || Array.isArray(session.clientes))) {
    throw new Error('Admira Studio no confirmó los proyectos de esta cuenta.');
  }

  let catalog;
  try {
    const live = await fetch(YOKUP_PROJECTS, { ...options, credentials: 'omit', signal: AbortSignal.timeout(4000) });
    if (!live.ok) throw new Error('Catálogo de Yokup no disponible.');
    const payload = await live.json();
    catalog = payload.projects ?? payload.proyectos;
  } catch { /* El Adaptador usa la misma copia como respaldo. */ }
  if (!Array.isArray(catalog)) {
    const snapshot = await fetch(`${STUDIO_ORIGIN}/adaptaciones/proyectos/yokup.json`, {
      ...options, credentials: 'omit', signal: AbortSignal.timeout(4000),
    });
    if (!snapshot.ok) throw new Error('No se pudo cargar el catálogo de proyectos.');
    catalog = (await snapshot.json()).proyectos;
    if (!Array.isArray(catalog)) throw new Error('No se pudo leer el catálogo de proyectos.');
  }
  const allowed = session.clientes === null ? null : new Set(session.clientes);
  const projects = new Map();
  for (const item of catalog) {
    const id = item?.id;
    if (!/^[a-z0-9][a-z0-9-]{0,70}$/.test(id || '') || typeof id !== 'string') continue;
    if ((item.status ?? item.estado ?? 'activo') !== 'activo' || (allowed && !allowed.has(id))) continue;
    projects.set(id, { id, name: String(item.name ?? item.nombre ?? id).trim() || id });
  }
  return {
    authenticated: true,
    account: session.email,
    allProjects: allowed === null,
    projects: await AdmiraProjectFormats.catalog([...projects.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')), STUDIO_ORIGIN).catch(() => [...projects.values()].map(p=>({...p,formats:[],formatsKnown:false}))),
  };
}

function setBadge(tabId, text, color) {
  if (!Number.isInteger(tabId)) return;
  chrome.action.setBadgeBackgroundColor({ tabId, color }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  if (text) setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {}), 2400);
}

async function rememberContext(context) {
  const clean = {
    url: AdmiraImporter.canonicalUrl(context && context.url),
    title: String((context && context.title) || '').slice(0, 180),
    channel: String((context && context.channel) || '').slice(0, 100),
    thumbnail: AdmiraImporter.thumbnailUrl(context && context.url),
    short: context?.short === true,
    width: Number(context?.width) || 0,
    height: Number(context?.height) || 0,
  };
  if (clean.url) await chrome.storage.session.set({ currentVideo: clean });
  return clean;
}

async function openImporter(data, openerTabId) {
  const target = AdmiraImporter.handoffUrl(data);
  if (!target) {
    setBadge(openerTabId, '!', '#ff335f');
    return false;
  }
  await chrome.tabs.create({ url: target, active: true, openerTabId });
  setBadge(openerTabId, 'OK', '#00c853');
  return true;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Importar en Admira Studio',
      contexts: ['page', 'link'],
      documentUrlPatterns: [
        'https://www.youtube.com/*',
        'https://m.youtube.com/*',
        'https://youtu.be/*',
      ],
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;
  const fromPanel = sender.url === chrome.runtime.getURL('sidepanel.html');
  if (message.type === 'PREPARE_VIDEO_PREVIEW' && fromPanel) {
    preparePreview().then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
    return true;
  }
  if (message.type === 'GET_PROJECT_SESSION' && fromPanel) {
    readProjectSession()
      .then(state => sendResponse({ ok: true, ...state }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'SEARCH_YOUTUBE' && fromPanel) {
    searchYouTube(message.query)
      .then(results => sendResponse({ ok: true, results }))
      .catch(error => sendResponse({ ok: false, error: error.name === 'TimeoutError' ? 'YouTube tardó demasiado. Vuelve a intentarlo.' : error.message }));
    return true;
  }
  if (message.type === 'OPEN_PANEL') {
    const tabId = sender.tab && sender.tab.id;
    if (!Number.isInteger(tabId)) {
      sendResponse({ ok: false, error: 'No se pudo identificar la pestaña de YouTube' });
      return false;
    }

    // Chrome exige que sidePanel.open() se invoque directamente dentro del
    // gesto del usuario. No debe haber ningún await antes de esta llamada.
    const panelOpening = chrome.sidePanel.open({ tabId });
    const contextUpdate = rememberContext(message.context || {});
    Promise.all([panelOpening, contextUpdate])
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }
  if (message.type === 'OPEN_IMPORT' && fromPanel) {
    const tabId = Number.isInteger(message.openerTabId) ? message.openerTabId : sender.tab && sender.tab.id;
    const data = message.data || {};
    readProjectSession().then(state => {
      if (!state.authenticated || state.account !== message.account) throw new Error('La sesión de Google ha cambiado. Revisa el proyecto y vuelve a intentarlo.');
      const valid = data.projectId === '' ? state.allProjects : state.projects.some(project => project.id === data.projectId);
      if (!valid) throw new Error('Elige un proyecto disponible para tu cuenta.');
      if (data.targetFormat === 'all' && data.projectId) {
        const project=state.projects.find(p=>p.id===data.projectId);
        if(project?.formatsKnown===false)throw new Error('No se pudieron verificar todos los formatos. Vuelve a cargar los proyectos.');
        if(project?.hasCustom) data.formatProject=project.formatProject;
        else data.targetFormat='both';
      }
      if (/^(project|layout):/.test(data.targetFormat || '')) {
        const project=state.projects.find(p=>p.id===data.projectId);
        if(!project?.formats?.some(f=>f.value===data.targetFormat))throw new Error('El formato ya no está disponible en este proyecto.');
        data.formatProject=project.formatProject;
      }
      return openImporter(data, tabId);
    })
      .then(ok => sendResponse({ ok }))
      .catch(error => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }
  return false;
});

async function prepareQuickImport(rawUrl, tab) {
  const url = AdmiraImporter.canonicalUrl(rawUrl);
  if (!url) return;
  let context = { url: rawUrl };
  if (AdmiraImporter.canonicalUrl(tab?.url) === url) {
    context.title = String(tab.title || '').replace(/\s+-\s+YouTube\s*$/i, '');
    try {
      const current = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT' });
      if (AdmiraImporter.canonicalUrl(current?.url) === url) context = current;
    } catch {}
  }
  await openImporter({
    url, title: context.title, tags: AdmiraImporter.suggestTags(context).join(', '),
    targetFormat: AdmiraImporter.suggestedFormat(context), subtitleLanguage: 'none', format: 'video', autostart: false,
  }, tab?.id);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  prepareQuickImport(info.linkUrl || info.pageUrl || tab?.url, tab).catch(() => {});
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'import-current-video') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  prepareQuickImport(tab.url, tab).catch(() => {});
});

/* global AdmiraImporter */
'use strict';

importScripts('shared.js');

const MENU_ID = 'admira-studio-import-youtube';

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
  if (message.type === 'OPEN_IMPORT') {
    const tabId = Number.isInteger(message.openerTabId) ? message.openerTabId : sender.tab && sender.tab.id;
    openImporter(message.data || {}, tabId)
      .then(ok => sendResponse({ ok }))
      .catch(error => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }
  return false;
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = AdmiraImporter.canonicalUrl(info.linkUrl || info.pageUrl || (tab && tab.url));
  openImporter({ url, title: tab && tab.title, format: 'video', autostart: true }, tab && tab.id).catch(() => {});
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'import-current-video') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  openImporter({ url: tab.url, title: tab.title, format: 'video', autostart: true }, tab.id).catch(() => {});
});

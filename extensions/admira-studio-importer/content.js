/* global AdmiraImporter */
'use strict';

const ROOT_ID = 'admira-studio-importer-root';

function textFrom(selector) {
  return String(document.querySelector(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
}

function pageContext() {
  const url = AdmiraImporter.canonicalUrl(location.href);
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
  const title = String(ogTitle || document.title || '').replace(/\s+-\s+YouTube\s*$/i, '').trim();
  const channel = textFrom('ytd-watch-metadata ytd-channel-name a')
    || textFrom('#owner #channel-name a')
    || textFrom('ytm-slim-owner-renderer .slim-owner-channel-name');
  return { url, title, channel, thumbnail: AdmiraImporter.thumbnailUrl(url) };
}

function setButtonState(label, state) {
  const button = document.querySelector(`#${ROOT_ID} button`);
  if (!button) return;
  button.dataset.state = state || '';
  const copy = button.querySelector('.asi-copy');
  if (copy) copy.textContent = label;
}

function mountButton() {
  const context = pageContext();
  const current = document.getElementById(ROOT_ID);
  if (!context.url) {
    current?.remove();
    return;
  }
  if (current) return;

  const root = document.createElement('div');
  root.id = ROOT_ID;
  const button = document.createElement('button');
  button.type = 'button';
  button.title = 'Enviar este vídeo directamente al Stock de Admira Studio';
  button.setAttribute('aria-label', 'Importar este vídeo en Admira Studio');

  const mark = document.createElement('span');
  mark.className = 'asi-mark';
  mark.textContent = 'A';
  mark.setAttribute('aria-hidden', 'true');
  const copy = document.createElement('span');
  copy.className = 'asi-copy';
  copy.textContent = 'IMPORTAR EN ADMIRA';
  const arrow = document.createElement('span');
  arrow.className = 'asi-arrow';
  arrow.textContent = '↗';
  arrow.setAttribute('aria-hidden', 'true');
  button.append(mark, copy, arrow);

  button.addEventListener('click', async () => {
    setButtonState('ABRIENDO IMPORTER…', 'busy');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'OPEN_PANEL', context: pageContext() });
      if (!response || !response.ok) throw new Error(response && response.error || 'No se pudo abrir el panel');
      setButtonState('LISTO PARA IMPORTAR', 'ok');
    } catch {
      setButtonState('ABRE LA EXTENSIÓN', 'error');
    }
    setTimeout(() => setButtonState('IMPORTAR EN ADMIRA', ''), 2200);
  });
  root.appendChild(button);
  document.documentElement.appendChild(root);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'GET_CONTEXT') {
    sendResponse(pageContext());
    return false;
  }
  if (message && message.type === 'IMPORT_STARTED') {
    setButtonState('ENVIADO A ADMIRA ✓', 'ok');
    setTimeout(() => setButtonState('IMPORTAR EN ADMIRA', ''), 2600);
  }
  return false;
});

let scheduled = 0;
function scheduleMount() {
  clearTimeout(scheduled);
  scheduled = setTimeout(mountButton, 180);
}

document.addEventListener('yt-navigate-finish', scheduleMount, true);
window.addEventListener('popstate', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
scheduleMount();

/* global AdmiraImporter */
'use strict';

const ROOT_ID = 'admira-studio-importer-root';

function textFrom(selector) {
  return String(document.querySelector(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
}

function pageContext() {
  const url = AdmiraImporter.canonicalUrl(location.href);
  const meta = selector => document.querySelector(selector)?.content || '';
  const metaUrl = AdmiraImporter.canonicalUrl(meta('meta[property="og:url"]'));
  const id = AdmiraImporter.videoId(url);
  const matchingMetadata = !!id && (metaUrl ? metaUrl === url : meta('meta[itemprop="videoId"]') === id);
  const short = location.pathname.startsWith('/shorts/');
  const title = String((matchingMetadata && meta('meta[property="og:title"]'))
    || (!short && textFrom('ytd-watch-metadata h1'))
    || document.title || '').replace(/\s+-\s+YouTube\s*$/i, '').trim().slice(0, 180);
  const channel = (short ? textFrom('ytd-reel-video-renderer[is-active] #channel-name a')
    : textFrom('ytd-watch-metadata ytd-channel-name a')
      || textFrom('#owner #channel-name a')
      || textFrom('ytm-slim-owner-renderer .slim-owner-channel-name')).slice(0, 100);
  const player = short ? document.querySelector('ytd-reel-video-renderer[is-active]')
    : document.querySelector('ytd-watch-flexy[video-id]');
  const playerId = player?.getAttribute('video-id') || player?.getAttribute('videoid');
  const video = (!short || player) && (!playerId || playerId === id)
    ? (player || document).querySelector(short ? 'video' : 'video.html5-main-video') : null;
  const original = video && !video.closest('.ad-showing') ? video : null;
  return { url, title, channel, short, width: original?.videoWidth, height: original?.videoHeight, thumbnail: AdmiraImporter.thumbnailUrl(url),
    keywords: matchingMetadata ? meta('meta[name="keywords"]').slice(0, 800) : '',
    description: matchingMetadata ? meta('meta[property="og:description"]').slice(0, 600) : '' };
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

function notifyContextChange() {
  chrome.runtime.sendMessage({ type: 'VIDEO_CONTEXT_CHANGED' }).catch(() => {});
}
document.addEventListener('yt-navigate-finish', () => {
  scheduleMount();
  notifyContextChange();
}, true);
document.addEventListener('loadedmetadata', event => {
  if (event.target instanceof HTMLVideoElement) notifyContextChange();
}, true);
window.addEventListener('popstate', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
scheduleMount();

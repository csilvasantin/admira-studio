const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const plain = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

export function parseProcessStatus(rawText, language = 'es') {
  const text = clean(rawText);
  if (!text) return { hidden: true, text: '', kind: 'stock', label: '', process: false, percent: null, state: 'idle' };

  const normalized = plain(text);
  let kind = 'stock';
  if (/subtitul|subtitle|🈯/.test(normalized)) kind = 'subtitles';
  else if (/capsula|🔁/.test(normalized)) kind = 'capsule';
  else if (/import|descarg|subiendo a stock|admira-tube|yt-dlp|comprobando|\d+ de \d+ en el stock/.test(normalized)) kind = 'importer';

  const process = kind !== 'stock';
  const values = [...text.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*%/g)];
  const explicit = values.length ? clamp(values.at(-1)[1].replace(',', '.')) : null;
  const failed = /(?:❌|\berror\b|no se pudo|no se ha podido|no se pudieron|no se han podido|no se ha detectado|ninguna url valida|fallo|failed|unavailable)/.test(normalized);
  const active = /subiendo|descarg|importando|comprobando|quemando|transcrib|traduciendo|continuando|procesando|generando/.test(normalized);
  const done = !failed && !active && /(?:^|\s)(?:✓|✅)|guardad[oa]s?|completad[oa]|\blisto\b|\blista\b|\bpublished\b|\ben stock\b/.test(normalized);
  const percent = explicit ?? (process && (done || failed) ? 100 : null);
  const state = failed ? 'error' : done ? 'done' : process ? 'running' : 'status';
  const labels = language === 'en'
    ? { stock: 'STATUS', importer: 'IMPORTER', capsule: 'CAPSULE', subtitles: 'SUBTITLES' }
    : { stock: 'ESTADO', importer: 'IMPORTADOR', capsule: 'CÁPSULA', subtitles: 'SUBTÍTULOS' };

  return { hidden: false, text, kind, label: labels[kind], process, percent, state };
}

export function mountStockProcessDock({ dock, status, importStatus, importFill, language = 'es' } = {}) {
  if (!dock || !status) return { refresh() {}, disconnect() {} };
  const kind = dock.querySelector('[data-process-kind]');
  const percent = dock.querySelector('[data-process-percent]');
  const track = dock.querySelector('[data-process-track]');
  const fill = dock.querySelector('[data-process-fill]');

  function refresh() {
    const parsed = parseProcessStatus(status.textContent, language);
    dock.hidden = parsed.hidden;
    if (parsed.hidden) return;
    dock.dataset.state = parsed.state;
    dock.dataset.progress = !parsed.process ? 'status' : parsed.percent == null ? 'indeterminate' : 'determinate';
    status.title = parsed.text;
    if (kind) kind.textContent = parsed.label;
    if (percent) percent.textContent = parsed.percent == null ? (parsed.process ? '•••' : '') : `${Math.round(parsed.percent)} %`;
    if (track) {
      track.hidden = !parsed.process;
      track.setAttribute('aria-label', `${parsed.label}: ${parsed.text}`);
      if (parsed.percent == null) track.removeAttribute('aria-valuenow');
      else track.setAttribute('aria-valuenow', String(Math.round(parsed.percent)));
    }
    if (fill) fill.style.width = parsed.percent == null ? '' : `${parsed.percent}%`;
  }

  function mirrorImport() {
    const text = clean(importStatus && importStatus.textContent);
    if (!text) {
      if (parseProcessStatus(status.textContent, language).kind === 'importer') status.textContent = '';
      return;
    }
    const width = parseFloat(importFill && importFill.style.width || '');
    const withPercent = Number.isFinite(width) && width > 0 && !/%/.test(text)
      ? `${text} · ${Math.round(width)} %`
      : text;
    if (status.textContent !== withPercent) status.textContent = withPercent;
  }

  const observers = [];
  const statusObserver = new MutationObserver(refresh);
  statusObserver.observe(status, { childList: true, characterData: true, subtree: true });
  observers.push(statusObserver);
  if (importStatus) {
    const importObserver = new MutationObserver(mirrorImport);
    importObserver.observe(importStatus, { childList: true, characterData: true, subtree: true });
    observers.push(importObserver);
  }
  if (importFill) {
    const fillObserver = new MutationObserver(mirrorImport);
    fillObserver.observe(importFill, { attributes: true, attributeFilter: ['style'] });
    observers.push(fillObserver);
  }
  refresh();
  return { refresh, disconnect() { observers.forEach(observer => observer.disconnect()); } };
}

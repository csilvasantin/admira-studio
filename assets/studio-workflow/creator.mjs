// Studio-owned presentation layer. Move existing controls, preserving their IDs,
// handlers and campaign state; the shared Creator remains the source of behaviour.
export function compactCreator(root, en = document.documentElement.lang === 'en') {
  if (root.dataset.studioWorkflow) return;
  const toolbar = root.querySelector('.campaign-tools');
  const newCampaign = root.querySelector('#campaign-new');
  const edit = root.querySelector('#campaign-edit');
  const fromUrl = root.querySelector('#campaign-url-form');
  const resume = root.querySelector('#campaign-resume')?.closest('.campaign-tools');
  if (!toolbar || !newCampaign || !edit || !resume) return;
  const t = (es, english) => en ? english : es;
  const document = root.ownerDocument;
  function group(id, title) {
    const details = document.createElement('details');
    details.id = id;
    details.className = 'studio-creator-group';
    const summary = document.createElement('summary');
    summary.textContent = title;
    const body = document.createElement('div');
    body.className = 'studio-creator-group-body';
    details.append(summary, body);
    return {details, body};
  }
  const original = [...toolbar.children];
  const primary = document.createElement('div');
  primary.className = 'studio-creator-primary';
  primary.setAttribute('aria-label', t('Acciones de campaña', 'Campaign actions'));
  const saved = group('studio-creator-resume', t('Retomar campaña', 'Resume campaign'));
  const examples = group('studio-creator-examples', t('Ejemplos y demos', 'Examples and demos'));
  const tools = group('studio-creator-tools', t('Herramientas', 'Tools'));
  const formats = group('studio-creator-formats', t('Formatos e idiomas', 'Formats and languages'));
  const secondary = document.createElement('div');
  secondary.className = 'studio-creator-secondary';
  saved.body.append(resume);
  primary.append(newCampaign, ...(fromUrl ? [fromUrl] : []), saved.details, edit);
  for (const control of original) {
    if (control === newCampaign || control === edit || control === fromUrl) continue;
    const href = control.getAttribute('href') || '';
    const isExample = ['campaign-starbucks', 'campaign-demo'].includes(control.id)
      || href.includes('demo=creador') || href.includes('/campanas/next-step/');
    (isExample ? examples.body : tools.body).append(control);
  }
  secondary.append(examples.details, formats.details, tools.details);
  toolbar.append(primary, secondary);
  toolbar.classList.add('studio-creator-toolbar');
  root.dataset.studioWorkflow = 'compact';
  root.classList.add('studio-creator');

  // The client catalogue can arrive after the workshop's initial render.
  const collect = () => {
    for (const panel of root.querySelectorAll('.campaign-client-formats, .campaign-content-language')) {
      if (panel.parentElement !== formats.body) formats.body.append(panel);
    }
  };
  collect();
  const observer = new MutationObserver(collect);
  observer.observe(root, {childList: true, subtree: true});
  return () => observer.disconnect();
}

if (typeof document !== 'undefined' && /\/(?:en\/)?creador\/(?:index\.html)?$/.test(location.pathname)) {
  const mount = () => {
    const root = document.getElementById('campaign-workshop');
    if (!root) return false;
    compactCreator(root);
    return !!root.dataset.studioWorkflow;
  };
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.documentElement, {childList: true, subtree: true});
  }
}

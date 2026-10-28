// Product actions for an imported video, mounted beside its date in Stock detail.
const normalizedLanguage = value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[-_]/)[0];
const languageCode = value => /^(en|eng|english|ingles)$/i.test(normalizedLanguage(value)) ? 'en'
  : /^(es|esp|spa|spanish|espanol|castellano)$/i.test(normalizedLanguage(value)) ? 'es' : null;
export function importedVideoLanguage(item, fallback = 'es') {
  for (const value of [item?.audioLang, item?.lang, item?.language, ...(item?.tags || []).map(tag => String(tag).replace(/^#?(?:content-language|audio-language|idioma|lang):/i, ''))]) {
    const lang = languageCode(value); if (lang) return lang;
  }
  return fallback === 'en' ? 'en' : 'es';
}
export const canTransformStockVideo = item => !!item && item.type === 'video' && !!item.url;
const other = lang => lang === 'es' ? 'en' : 'es';
const readSaved = (storage, id) => { try { return JSON.parse(storage?.getItem('admira.stock.video-options.' + id) || 'null') || {}; } catch { return {}; } };
const save = (storage, id, state) => { try { storage?.setItem('admira.stock.video-options.' + id, JSON.stringify(state)); } catch {} };

export function mountStockImportActions({item, header, detailRoot, stockBase = 'https://api.admira.store',
  onCreated, execute, doc = document, storage = globalThis.localStorage} = {}) {
  if (!canTransformStockVideo(item) || !header || !detailRoot) return null;
  const en = doc.documentElement.lang.startsWith('en'), t = (es, eng) => en ? eng : es;
  const saved = readSaved(storage, item.id);
  const state = {
    sourceLanguage: languageCode(saved.sourceLanguage) || importedVideoLanguage(item),
    subtitles: ['original', 'translate', 'none'].includes(saved.subtitles) ? saved.subtitles : 'original',
    brand: {mode: saved.brand?.mode === 'white-label' ? 'white-label' : 'admira', name: String(saved.brand?.name || '').slice(0, 80), logo: String(saved.brand?.logo || '').slice(0, 2000)},
    cards: {initial: saved.cards?.initial !== false, final: saved.cards?.final !== false}
  };
  const subtitleLanguage = state.subtitles === 'translate' ? other(state.sourceLanguage) : state.sourceLanguage;
  const targets = {subtitle: subtitleLanguage, voice: other(state.sourceLanguage), adapt: subtitleLanguage};
  const controller = new AbortController(); let destroyed = false, busy = false, resultObjectURL;
  const row = doc.createElement('span'); row.className = 'stock-import-actions'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', t('Acciones del vídeo importado', 'Imported video actions'));
  const actions = [['subtitle', t('Subtitular', 'Subtitle'), t('Añadir subtítulos al vídeo', 'Add subtitles to the video')], ['voice', t('Locutar', 'Dub'), t('Crear una locución en el idioma elegido', 'Create a voiceover in the selected language')], ['adapt', t('Adaptar', 'Adapt'), t('Cambiar horizontal ↔ vertical', 'Switch landscape ↔ portrait')]];
  for (const [gesture, label, title] of actions) {
    const pair = doc.createElement('span'); pair.className = 'stock-import-action';
    const button = doc.createElement('button'); button.type = 'button'; button.textContent = label; button.title = title; button.dataset.stockGesture = gesture;
    const select = doc.createElement('select'); select.dataset.gestureLanguage = gesture; select.setAttribute('aria-label', `${label} · ${t('idioma', 'language')}`);
    select.add(new Option('ESP', 'es')); select.add(new Option('ENG', 'en')); select.value = targets[gesture];
    pair.append(button, select); row.append(pair);
  }
  const date = header.querySelector('.stock-date'); if (date) date.after(row); else header.append(row);
  function voiceLanguageOptions() { row.querySelectorAll('[data-gesture-language="voice"] option').forEach(option => { option.disabled = option.value === state.sourceLanguage; }); }
  voiceLanguageOptions();
  const options = doc.createElement('details'); options.className = 'stock-import-options'; options.open = true;
  options.innerHTML = `<summary>${t('Cápsula · subtítulos y cartelas', 'Capsule · subtitles and brand cards')}</summary>
    <div class="stock-import-settings">
      <label>${t('Idioma del audio', 'Audio language')}<select data-video-option="audio"><option value="es">Español · ESP</option><option value="en">English · ENG</option></select></label>
      <label>${t('Subtítulos', 'Subtitles')}<select data-video-option="subtitles"><option value="original">${t('Original', 'Original')}</option><option value="translate">${t('Traducir', 'Translate')}</option><option value="none">${t('Nada', 'None')}</option></select></label>
      <label>${t('Marca de las cartelas', 'Brand cards')}<select data-video-option="brand"><option value="admira">Admira</option><option value="white-label">${t('Marca blanca', 'White label')}</option></select></label>
      <label class="stock-import-client" hidden>${t('Nombre del cliente', 'Client name')}<input data-video-option="name" maxlength="80" placeholder="Starbucks" autocomplete="organization"></label>
      <label class="stock-import-client stock-import-logo-field" hidden>${t('Logo del cliente (URL opcional)', 'Client logo (optional URL)')}<input data-video-option="logo" type="url" maxlength="2000" placeholder="https://…/logo.png"></label>
      <fieldset class="stock-import-cards"><legend>${t('Cartelas', 'Cards')}</legend><label><input type="checkbox" data-video-option="initial"> ${t('Inicial', 'Opening')}</label><label><input type="checkbox" data-video-option="final"> ${t('Final', 'Closing')}</label><span data-brand-summary></span></fieldset>
    </div>`;
  header.after(options);
  const output = doc.createElement('section'); output.className = 'stock-import-output'; output.setAttribute('aria-label', t('Resultado de la acción', 'Action result')); output.hidden = true;
  const status = doc.createElement('p'); status.className = 'stock-import-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const result = doc.createElement('div'); result.className = 'stock-import-result';
  output.append(status, result); options.after(output);
  const field = name => options.querySelector(`[data-video-option="${name}"]`);
  field('audio').value = state.sourceLanguage; field('subtitles').value = state.subtitles; field('brand').value = state.brand.mode;
  field('name').value = state.brand.name; field('logo').value = state.brand.logo;
  field('initial').checked = state.cards.initial; field('final').checked = state.cards.final;
  function updateBrand() {
    const custom = state.brand.mode === 'white-label'; options.querySelectorAll('.stock-import-client').forEach(label => { label.hidden = !custom; });
    options.querySelector('[data-brand-summary]').textContent = custom ? state.brand.name || t('Tu marca', 'Your brand') : 'Admira';
  }
  updateBrand();
  function syncSubtitleTarget() {
    targets.subtitle = state.subtitles === 'translate' ? other(state.sourceLanguage) : state.sourceLanguage;
    row.querySelector('[data-gesture-language="subtitle"]').value = targets.subtitle;
    if (state.subtitles !== 'none') { targets.adapt = targets.subtitle; row.querySelector('[data-gesture-language="adapt"]').value = targets.adapt; }
  }
  function say(text) { if (destroyed) return; output.hidden = false; status.textContent = String(text); }
  function setBusy(value) { busy = value; row.querySelectorAll('button,select').forEach(el => { el.disabled = value; }); options.querySelectorAll('input,select').forEach(el => { el.disabled = value; }); row.setAttribute('aria-busy', String(value)); }
  function remember() { save(storage, item.id, state); }
  options.addEventListener('change', event => {
    const key = event.target.dataset.videoOption; if (!key) return;
    if (key === 'audio') { state.sourceLanguage = field('audio').value; targets.voice = other(state.sourceLanguage); targets.adapt = state.sourceLanguage; row.querySelector('[data-gesture-language="voice"]').value = targets.voice; voiceLanguageOptions(); row.querySelector('[data-gesture-language="adapt"]').value = targets.adapt; syncSubtitleTarget(); }
    if (key === 'subtitles') { state.subtitles = field('subtitles').value; syncSubtitleTarget(); }
    if (key === 'brand') state.brand.mode = field('brand').value;
    if (key === 'name' || key === 'logo') state.brand[key] = field(key).value.trim();
    if (key === 'initial' || key === 'final') state.cards[key] = field(key).checked;
    updateBrand(); remember();
  });
  row.addEventListener('change', event => {
    const gesture = event.target.dataset.gestureLanguage; if (!gesture) return;
    targets[gesture] = event.target.value;
    if (gesture === 'subtitle') { state.subtitles = targets.subtitle === state.sourceLanguage ? 'original' : 'translate'; field('subtitles').value = state.subtitles; syncSubtitleTarget(); remember(); }
    if (gesture === 'adapt' && state.subtitles !== 'none') { state.subtitles = targets.adapt === state.sourceLanguage ? 'original' : 'translate'; field('subtitles').value = state.subtitles; syncSubtitleTarget(); remember(); }
  });
  row.addEventListener('click', async event => {
    const button = event.target.closest('[data-stock-gesture]'); if (!button || busy) return;
    // Read current text values too: an input need not blur before an action is clicked.
    state.brand.name = field('name').value.trim(); state.brand.logo = field('logo').value.trim(); remember();
    if (state.brand.mode === 'white-label' && (state.cards.initial || state.cards.final) && !state.brand.name) { options.open = true; field('name').focus(); say(t('Escribe el nombre del cliente para sus cartelas.', 'Enter the client name for the brand cards.')); return; }
    if (state.brand.mode === 'white-label' && state.brand.logo && !/^https:\/\//i.test(state.brand.logo)) { options.open = true; field('logo').focus(); say(t('El logo necesita una URL https:// válida.', 'The logo needs a valid https:// URL.')); return; }
    const gesture = button.dataset.stockGesture;
    if (gesture === 'subtitle' && state.subtitles === 'none') { options.open = true; field('subtitles').focus(); say(t('Has elegido Nada: se mantienen sin subtítulos. Elige Original o Traducir para subtitular.', 'You selected None: subtitles remain off. Choose Original or Translate to add subtitles.')); return; }
    const request = {gesture, sourceLanguage: state.sourceLanguage, targetLanguage: targets[gesture], subtitles: state.subtitles,
      brand: {...state.brand, ...(state.brand.mode === 'admira' ? {name: 'Admira', logo: ''} : {})}, cards: {...state.cards}};
    setBusy(true); result.replaceChildren(); say(t('Preparando la nueva versión…', 'Preparing the new version…'));
    try {
      const run = execute || (await import('./stock-import-render.mjs?v=20261028-7185')).executeStockGesture;
      const answer = await run(item, request, {onStatus: say, signal: controller.signal});
      if (destroyed) return;
      if (!answer?.ok) throw Error(answer?.error || 'action-failed');
      const created = answer.item;
      const id = answer.id || created?.id;
      let url = answer.url || created?.url;
      if (!url && answer.blob) { resultObjectURL && URL.revokeObjectURL(resultObjectURL); url = resultObjectURL = URL.createObjectURL(answer.blob); }
      if (!url && id) url = `${stockBase}/stock/asset/${encodeURIComponent(id)}`;
      if (url) {
        const video = doc.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.src = url; result.append(video);
        const link = doc.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = t('Abrir vídeo resultante', 'Open resulting video'); result.append(link);
      }
      if (id) { const link = doc.createElement('a'); link.href = (en ? '/en' : '') + '/stock.html?highlight=' + encodeURIComponent(id); link.textContent = t('Ver nueva versión en Stock', 'View new version in Stock') + ' →'; result.append(link); }
      options.open = false;
      say(id ? t('✓ Nueva versión guardada en Stock.', '✓ New version saved to Stock.') : t('✓ Nueva versión lista.', '✓ New version ready.'));
      if (created && id) await onCreated?.({...created, id, url: created.url || url});
    } catch (error) {
      if (!destroyed && error?.name !== 'AbortError') say(t('No se pudo crear la versión: ', 'Could not create the version: ') + String(error?.message || error));
    } finally { if (!destroyed) setBusy(false); }
  });
  return {element: row, options, destroy() { destroyed = true; controller.abort(); resultObjectURL && URL.revokeObjectURL(resultObjectURL); row.remove(); options.remove(); output.remove(); }};
}

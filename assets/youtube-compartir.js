/* «Compartir» en el Stock: YouTube y enlace. Expone window.YTCompartir.abrir(item). */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const LOGO = '<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><path fill="#ff0033" d="M27.4 3.1A3.5 3.5 0 0 0 25 .6C22.8 0 14 0 14 0S5.2 0 3 .6A3.5 3.5 0 0 0 .6 3.1 36.7 36.7 0 0 0 0 10a36.7 36.7 0 0 0 .6 6.9A3.5 3.5 0 0 0 3 19.4c2.2.6 11 .6 11 .6s8.8 0 11-.6a3.5 3.5 0 0 0 2.4-2.5A36.7 36.7 0 0 0 28 10a36.7 36.7 0 0 0-.6-6.9Z"/><path fill="#fff" d="m11.2 14.3 7.3-4.3-7.3-4.3v8.6Z"/></svg>';
  const EN = /^en\b/i.test(document.documentElement.lang || '');
  const T = EN ? {
    head: 'Share - YouTube', title: 'Title', desc: 'Description', priv: 'Privacy', unlisted: 'Unlisted', private: 'Private', public: 'Public',
    publish: 'Publish to YouTube', link: '🔗 Share link', close: 'Close', copied: 'Link copied', notConn: 'YouTube not connected',
    checking: 'Checking YouTube account…', ready: 'Ready to upload', account: 'Destination channel',
    uploading: 'Uploading to YouTube', elapsed: 'elapsed', published: 'Published', error: 'Error',
  } : {
    head: 'Compartir - YouTube', title: 'Título', desc: 'Descripción', priv: 'Privacidad', unlisted: 'Oculto', private: 'Privado', public: 'Público',
    publish: 'Publicar en YouTube', link: '🔗 Compartir enlace', close: 'Cerrar', copied: 'Enlace copiado', notConn: 'YouTube no conectado',
    checking: 'Comprobando la cuenta de YouTube…', ready: 'Listo para subir', account: 'Canal de destino',
    uploading: 'Subiendo a YouTube', elapsed: 'transcurridos', published: 'Publicado', error: 'Error',
  };
  const ERRORES = EN ? {
    'youtube-no-conectado': 'YouTube not connected', 'youtube-canal': 'Could not identify the destination channel',
    'session-required': 'Please sign in', 'solo-superusuario': 'Superusers only', 'youtube-cuota': 'Daily YouTube quota exhausted', 'no-es-video': 'Stock videos only',
  } : {
    'youtube-no-conectado': 'YouTube no conectado', 'youtube-canal': 'No se pudo identificar el canal de destino',
    'session-required': 'Inicia sesión', 'solo-superusuario': 'Solo superusuarios', 'youtube-cuota': 'Cuota diaria de YouTube agotada', 'no-es-video': 'Solo vídeos del Stock',
  };
  function esVideo(it) {
    return Boolean(it && it.url && (it.type === 'video' || String(it.mime || '').startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(it.url)));
  }
  async function compartirEnlace(it, st) {
    try {
      if (navigator.share) { await navigator.share({title: it.title || 'Admira Stock', url: it.url}); return; }
      await navigator.clipboard.writeText(it.url); st.textContent = T.copied;
    } catch (e) { if (e && e.name !== 'AbortError') st.textContent = it.url; }
  }
  function abrir(it) {
    if (!esVideo(it)) return;
    if (!document.getElementById('yt-share-style')) {
      const style = document.createElement('style'); style.id = 'yt-share-style';
      style.textContent = '@keyframes yt-progress{from{transform:translateX(-100%)}to{transform:translateX(265%)}}'; document.head.appendChild(style);
    }
    const dlg = document.createElement('dialog');
    dlg.className = 'yt-share';
    dlg.style.cssText = 'max-width:520px;width:92vw;background:#0a0f0a;color:inherit;border:1px solid #2a4;border-radius:10px;padding:16px;';
    dlg.innerHTML = `<form method="dialog" style="display:flex;flex-direction:column;gap:8px">
      <strong style="display:flex;align-items:center;gap:9px">${LOGO}<span data-yt="titulo">${T.head} // ${T.checking}</span></strong>
      <div data-yt="cuenta" aria-live="polite" style="display:flex;align-items:center;gap:9px;min-height:42px;padding:8px 10px;border:1px solid #263826;border-radius:7px;background:#080c08;font-size:12px">${T.checking}</div>
      <label>${T.title}<input name="title" maxlength="100" value="${esc((it.title || it.prompt || '').slice(0, 100))}" style="width:100%"></label>
      <label>${T.desc}<textarea name="description" rows="4" style="width:100%">${esc(it.comment || it.prompt || '')}</textarea></label>
      <label>${T.priv} <select name="privacyStatus"><option value="unlisted" selected>${T.unlisted}</option><option value="private">${T.private}</option><option value="public">${T.public}</option></select></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn" data-yt="subir" disabled style="display:inline-flex;align-items:center;gap:8px">${LOGO}${T.publish}</button>
        <button type="button" class="btn" data-yt="enlace">${T.link}</button><button type="submit" class="btn">${T.close}</button>
      </div>
      <div data-yt="progreso" hidden style="height:3px;overflow:hidden;background:#193119;border-radius:3px"><span style="display:block;width:38%;height:100%;background:#ff0033;animation:yt-progress 1.15s ease-in-out infinite alternate"></span></div>
      <span data-yt="estado" role="status" aria-live="polite" style="font-size:12px;min-height:18px"></span></form>`;
    document.body.appendChild(dlg); dlg.addEventListener('close', () => dlg.remove());
    const st = dlg.querySelector('[data-yt="estado"]');
    const titulo = dlg.querySelector('[data-yt="titulo"]');
    const cuenta = dlg.querySelector('[data-yt="cuenta"]');
    const progreso = dlg.querySelector('[data-yt="progreso"]');
    const subir = dlg.querySelector('[data-yt="subir"]');
    dlg.querySelector('[data-yt="enlace"]').onclick = () => compartirEnlace(it, st);
    let canal = null;
    fetch('/api/youtube/upload', {credentials: 'same-origin'}).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.conectado || !j.canal) throw new Error(j.conectado === false ? T.notConn : (ERRORES[j.error] || j.error || `HTTP ${r.status}`));
      canal = j.canal;
      const identidad = `${canal.nombre}${canal.handle ? ` · ${canal.handle}` : ''}`;
      titulo.textContent = `${T.head} // ${identidad}`;
      cuenta.innerHTML = `${canal.avatar ? `<img src="${esc(canal.avatar)}" alt="" width="30" height="30" style="border-radius:50%">` : LOGO}<span><small style="display:block;opacity:.7">${T.account}</small><strong>${esc(identidad)}</strong></span>`;
      subir.disabled = false; st.textContent = T.ready;
    }).catch(e => { cuenta.textContent = T.notConn; st.textContent = T.error + ': ' + e.message; });
    subir.onclick = async () => {
      const f = dlg.querySelector('form'); subir.disabled = true; progreso.hidden = false;
      const started = Date.now();
      const tick = () => { st.textContent = `${T.uploading} → ${canal?.nombre || ''} · ${Math.floor((Date.now() - started) / 1000)}s ${T.elapsed}`; };
      tick(); const timer = setInterval(tick, 1000);
      try {
        const r = await fetch('/api/youtube/upload', {method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin',
          body: JSON.stringify({id: it.id, title: f.title.value, description: f.description.value, privacyStatus: f.privacyStatus.value})});
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.mensaje || ERRORES[j.error] || j.error || ('HTTP ' + r.status));
        st.innerHTML = `${T.published} en <strong>${esc(canal?.nombre || '')}</strong>: <a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.url)}</a>`;
      } catch (e) { st.textContent = T.error + ': ' + e.message; subir.disabled = false; }
      finally { clearInterval(timer); progreso.hidden = true; }
    };
    dlg.showModal();
  }
  window.YTCompartir = {abrir, esVideo, T};
})();

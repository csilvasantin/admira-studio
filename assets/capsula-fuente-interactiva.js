/* Cápsulas desde URL (v5.1, 22-oct-2026): el tramo del b-roll del vídeo lleva a la fuente.
 * Lee la ficha del Stock: it.capsuleSource = {sourceUrl, credit, broll:{start,end}, version}.
 * · Mientras el vídeo pasa por el tramo se muestra «▶ Ver el original · Vídeo: <autor>» (enlace, pestaña nueva).
 * · Al ENTRAR en el tramo se intenta abrir la fuente en una pestaña nueva (una vez por apertura del modal;
 *   si el navegador bloquea la ventana emergente queda el enlace).
 * · Pulsar el vídeo dentro del tramo, o el crédito, abre la fuente. Fuera del tramo, el clic es el de siempre.
 * v5.3 (22-oct-2026): el tramo es toda la explicación (2–14 s). En tramos largos (≥ 6 s) no se abre ninguna
 *   pestaña sola: el enlace se ve todo el tramo y pulsar el vídeo abre la fuente en cualquier momento. */
(function () {
  'use strict';
  function fuente(it) {
    const c = it && it.capsuleSource; if (!c || typeof c.sourceUrl !== 'string' || !/^https:\/\//.test(c.sourceUrl)) return null;
    const b = c.broll && Number.isFinite(+c.broll.start) && Number.isFinite(+c.broll.end) && +c.broll.end > +c.broll.start ? { start: +c.broll.start, end: +c.broll.end } : null;
    return b ? { url: c.sourceUrl, credit: String(c.credit || ''), start: b.start, end: b.end } : null;
  }
  function enTramo(f, t) { return t >= f.start && t < f.end; }
  const AUTO_MAX = 6; // s: sólo los tramos cortos de v5.1/v5.2 intentan abrir la fuente al entrar
  function autoAbre(f) { return f.end - f.start < AUTO_MAX; }
  function abrir(url) { try { window.open(url, '_blank', 'noopener'); } catch (_) {} }
  function attach(video, it, opts) {
    const f = fuente(it); if (!video || !f) return null;
    const en = (opts && opts.lang === 'en') || document.documentElement.lang.startsWith('en');
    const box = video.parentElement; if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    const a = document.createElement('a');
    a.className = 'capsula-fuente-link'; a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.hidden = true;
    a.textContent = '▶ ' + (en ? 'Watch the original' : 'Ver el original') + (f.credit ? ' · ' + f.credit : '');
    a.style.cssText = 'position:absolute;left:50%;bottom:18%;transform:translateX(-50%);z-index:5;background:rgba(20,20,24,.82);color:#fff;padding:.55em 1em;border-radius:999px;font:600 15px/1.2 system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 18px rgba(0,0,0,.35)';
    box.appendChild(a);
    let abierta = false;
    const tick = () => {
      const dentro = enTramo(f, video.currentTime); a.hidden = !dentro; video.style.cursor = dentro ? 'pointer' : '';
      if (dentro && autoAbre(f) && !abierta && !video.paused) { abierta = true; abrir(f.url); }
    };
    video.addEventListener('timeupdate', tick); video.addEventListener('seeked', tick);
    video.addEventListener('click', e => {
      if (!enTramo(f, video.currentTime)) return;
      // Solo la zona de imagen: los controles nativos ocupan la franja inferior.
      const r = video.getBoundingClientRect(); if (e.clientY > r.bottom - 48) return;
      e.preventDefault(); e.stopPropagation(); abrir(f.url);
    }, true);
    return { fuente: f, link: a };
  }
  const api = { fuente, enTramo, attach, autoAbre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AdmiraCapsulaFuente = api;
})();

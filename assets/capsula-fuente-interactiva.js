/* Cápsulas desde URL (v5.1, 22-oct-2026): el tramo del b-roll del vídeo lleva a la fuente.
 * Lee la ficha del Stock: it.capsuleSource = {sourceUrl, credit, broll:{start,end}, version}.
 * · Mientras el vídeo pasa por el tramo se muestra «▶ Ver el original · Vídeo: <autor>» (enlace, pestaña nueva).
 * · Al ENTRAR en el tramo se intenta abrir la fuente en una pestaña nueva (una vez por apertura del modal;
 *   si el navegador bloquea la ventana emergente queda el enlace).
 * · Pulsar el vídeo dentro del tramo, o el crédito, abre la fuente. Fuera del tramo, el clic es el de siempre.
 * v5.3 (22-oct-2026): el tramo es toda la explicación (2–14 s). En tramos largos (≥ 6 s) no se abre ninguna
 *   pestaña sola: el enlace se ve todo el tramo y pulsar el vídeo abre la fuente en cualquier momento.
 * v5.6 (22-oct-2026, Carlos): sin pastilla «Ver el original» sobre el vídeo. La pista es sólo el cursor de mano
 *   y el título accesible del vídeo; pulsar la imagen dentro del tramo sigue abriendo la fuente. */
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
    // v5.6: nada se añade al contenedor del vídeo.
    const label = (en ? 'Watch the original' : 'Ver el original') + (f.credit ? ' · ' + f.credit : '');
    const a = null; // v5.6: sin pastilla visible
    let abierta = false;
    const tick = () => {
      const dentro = enTramo(f, video.currentTime); video.style.cursor = dentro ? 'pointer' : ''; video.title = dentro ? label : '';
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

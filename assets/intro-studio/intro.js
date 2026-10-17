/* Admira Studio · intro de la portada / homepage intro (NeoMacStudio, 17-oct-2026).
   La intro «Todo en orden» de xpaceos.com con el look de admira.studio (Matrix): 15 s a pantalla completa.
   - Solo en la portada (/ y /en/), una vez por sesión (sessionStorage 'admirastudio_intro_a').
   - Se salta con «Saltar intro» o Esc; se cierra sola al terminar o si el vídeo no arranca en 4 s.
   - En el idioma de la página (<html lang>): español en /, inglés en /en/.
   - No sale con «reducir movimiento». ?intro=0 la quita; ?intro=1 la fuerza.
   - 1080p en pantallas grandes, 720p en el resto.
   - Música: alterna «Tic-tac y campanas» y «Pulso» (localStorage 'admirastudio_intro_musica').
     Intenta sonar; si el navegador no deja, queda el botón «Activar sonido». ?musica=campanas|pulso|0.
   Fichero propio de admira.studio: declarado en marca.json («propios» y la última «sustitución»).
   Contrato / contract: assets/intro-studio/LEEME.md */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.start(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const SEEN_KEY = 'admirastudio_intro_a';
  const MUSIC_KEY = 'admirastudio_intro_musica';
  const BASE = '/assets/intro-studio/';
  const SOURCES = {
    es: {1080: BASE + 'intro-studio-a-es-1080.mp4', 720: BASE + 'intro-studio-a-es-720.mp4'},
    en: {1080: BASE + 'intro-studio-a-en-1080.mp4', 720: BASE + 'intro-studio-a-en-720.mp4'}
  };
  // .mp4 y no .m4a: Cloudflare no guarda .m4a en caché y entonces no responde por rangos (206), y sin rangos la música no se puede poner en el segundo del vídeo.
  const MUSIC = {campanas: BASE + 'musica-campanas.mp4', pulso: BASE + 'musica-pulso.mp4'};
  const LABELS = {
    es: {skip: 'Saltar intro', soundOn: 'Activar sonido', soundOff: 'Silenciar', aria: 'Intro de Admira Studio: antes de abrir fallan las pantallas, la música, el aroma y el wifi, y quedan en orden.'},
    en: {skip: 'Skip intro', soundOn: 'Turn sound on', soundOff: 'Mute', aria: 'Admira Studio intro: before opening, screens, music, scent and wifi fail, and they are put back in order.'}
  };
  const has = lang => Object.prototype.hasOwnProperty.call(SOURCES, lang);

  // Solo la portada: el ancla de marca.json también inyecta el script en _cuadopen y en el backoffice.
  function isHome(path) { return /^\/(index\.html)?$|^\/en\/(index\.html)?$/.test(String(path || '')); }
  function shouldShow(o) {
    const intro = new URLSearchParams(o.search || '').get('intro');
    if (!isHome(o.path)) return false;
    if (intro === '1') return true;
    if (intro === '0') return false;
    return has(o.lang) && !o.reducedMotion && !o.seen;
  }
  function pickSource(width, dpr, lang) {
    const set = has(lang) ? SOURCES[lang] : SOURCES.es;
    return (Number(width) || 0) * (Number(dpr) || 1) >= 1600 ? set[1080] : set[720];
  }
  function pickMusic(search, last) {
    const forced = new URLSearchParams(search || '').get('musica');
    if (forced === '0') return '';
    if (forced && Object.prototype.hasOwnProperty.call(MUSIC, forced)) return forced;
    return last === 'campanas' ? 'pulso' : 'campanas';
  }

  const CSS = `
.as-intro{position:fixed;inset:0;z-index:100000;background:#020602;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .6s ease}
.as-intro.is-closing{opacity:0}
.as-intro video{width:100%;height:100%;object-fit:contain;background:#020602}
.as-intro-actions{position:absolute;right:max(20px,env(safe-area-inset-right,0px));bottom:max(24px,env(safe-area-inset-bottom,0px));display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
.as-intro-actions button{padding:10px 14px;border:1px solid #00ff41;border-radius:2px;background:rgba(2,6,2,.82);color:#00ff41;font:700 13px/1 "JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;text-shadow:0 0 7px currentColor;cursor:pointer}
.as-intro-actions button::before{content:"["}
.as-intro-actions button::after{content:"]"}
.as-intro-actions button:hover{background:#00ff41;color:#020602;text-shadow:none}
.as-intro-actions button:focus-visible{outline:2px solid #d4ff5a;outline-offset:3px}
.as-intro-sound[aria-pressed="false"]{border-color:#d4ff5a;color:#d4ff5a}
.as-intro-bar{position:absolute;left:0;bottom:0;height:3px;width:0;background:#00ff41;box-shadow:0 0 10px #00ff41}`;

  function storage(win, kind) { try { return win[kind]; } catch (_) { return null; } }

  function start(win) {
    const doc = win.document;
    const session = storage(win, 'sessionStorage');
    let seen = false;
    try { seen = !!(session && session.getItem(SEEN_KEY)); } catch (_) {}
    const lang = String(doc.documentElement.lang || 'es').slice(0, 2).toLowerCase();
    const reducedMotion = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!shouldShow({search: win.location.search, path: win.location.pathname, lang, reducedMotion, seen})) return;
    const t = LABELS[lang] || LABELS.es;

    const style = doc.createElement('style');
    style.textContent = CSS;
    const box = doc.createElement('div');
    box.className = 'as-intro';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', t.aria);
    const video = doc.createElement('video');
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.autoplay = true;
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.preload = 'auto';
    video.src = pickSource(win.innerWidth, win.devicePixelRatio, lang);
    const skip = doc.createElement('button');
    skip.type = 'button'; skip.className = 'as-intro-skip'; skip.textContent = t.skip + ' ✕';
    const bar = doc.createElement('div');
    bar.className = 'as-intro-bar';
    const actions = doc.createElement('div');
    actions.className = 'as-intro-actions';

    // Música aparte del vídeo: alterna en cada intro y se ajusta al tiempo del vídeo.
    const local = storage(win, 'localStorage');
    let last = '';
    try { last = (local && local.getItem(MUSIC_KEY)) || ''; } catch (_) {}
    const track = pickMusic(win.location.search, last);
    let audio = null, soundOn = false, triedAuto = false;
    const sound = doc.createElement('button');
    sound.type = 'button'; sound.className = 'as-intro-sound';
    const paintSound = () => { sound.textContent = soundOn ? '🔇 ' + t.soundOff : '🔊 ' + t.soundOn; sound.setAttribute('aria-pressed', String(soundOn)); };
    if (track) {
      try { local && local.setItem(MUSIC_KEY, track); } catch (_) {}
      audio = new win.Audio(MUSIC[track]);
      audio.preload = 'auto';
      const syncPlay = () => { try { audio.currentTime = video.currentTime; } catch (_) {} return audio.play(); };
      const tryOn = () => { soundOn = true; paintSound(); const p = syncPlay(); if (p && p.catch) p.catch(() => { soundOn = false; paintSound(); }); };
      video.addEventListener('playing', () => { if (!triedAuto) { triedAuto = true; tryOn(); } else if (soundOn) syncPlay(); });
      video.addEventListener('pause', () => audio.pause());
      video.addEventListener('timeupdate', () => { if (soundOn && !audio.paused && Math.abs(audio.currentTime - video.currentTime) > 0.25) audio.currentTime = video.currentTime; });
      sound.addEventListener('click', () => { if (soundOn) { soundOn = false; audio.pause(); paintSound(); } else tryOn(); });
      paintSound();
      actions.append(sound);
    }
    actions.append(skip);
    box.append(video, actions, bar);

    const html = doc.documentElement, overflow = html.style.overflow;
    let closed = false, watchdog = 0;
    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(watchdog);
      if (audio) { try { audio.pause(); } catch (_) {} }
      try { session && session.setItem(SEEN_KEY, '1'); } catch (_) {}
      win.removeEventListener('keydown', onKey);
      html.style.overflow = overflow;
      box.classList.add('is-closing');
      win.setTimeout(() => { try { video.pause(); } catch (_) {} box.remove(); style.remove(); }, 650);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    skip.addEventListener('click', close);
    win.addEventListener('keydown', onKey);
    video.addEventListener('ended', close);
    video.addEventListener('error', close);
    video.addEventListener('timeupdate', () => { if (video.duration) bar.style.width = (100 * video.currentTime / video.duration) + '%'; });
    watchdog = win.setTimeout(() => { if (!(video.currentTime > 0)) close(); }, 4000);

    (doc.head || html).appendChild(style);
    const mount = () => {
      doc.body.appendChild(box);
      html.style.overflow = 'hidden';
      const p = video.play();
      if (p && p.catch) p.catch(close);
      try { skip.focus({preventScroll: true}); } catch (_) {}
    };
    if (doc.body && doc.readyState !== 'loading') mount(); else doc.addEventListener('DOMContentLoaded', mount, {once: true});
  }

  return {SEEN_KEY, MUSIC_KEY, SOURCES, MUSIC, isHome, shouldShow, pickSource, pickMusic, start};
});

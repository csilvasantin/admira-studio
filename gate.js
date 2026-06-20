/* ============================================================================
 * gate.js — portada "Coming Soon" + login Google para las webs de producción
 * de Admira (admira.studio · admira.store · admira.app).
 * ----------------------------------------------------------------------------
 * Se incluye en el <head> de cada página:  <script src="/gate.js"></script>
 * Oculta TODO el contenido hasta que hay sesión válida (allowlist en el worker
 * admira-gate). El público ve la portada; el equipo autorizado entra con Google.
 * Mismo fichero en las 3 webs → portada unificada.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__ADMIRA_GATE) return; window.__ADMIRA_GATE = true;

  var GATE = 'https://admira-gate.csilvasantin.workers.dev';
  var CLIENT_ID = '861856772040-quq6ut76k4mqj3fdq87h6g6caht3nm4l.apps.googleusercontent.com';
  var LS = 'admira_gate_session';
  var SITE = location.hostname.replace(/^www\./, '') || 'admira';

  // ── 1) Ocultar el contenido de inmediato (anti-flash) ──
  var hideStyle = document.createElement('style');
  hideStyle.textContent = 'html.admira-gating body{visibility:hidden!important}' +
    '#admira-gate{position:fixed;inset:0;z-index:2147483647;visibility:visible!important}';
  (document.head || document.documentElement).appendChild(hideStyle);
  document.documentElement.classList.add('admira-gating');

  // ── 2) Overlay ──
  var ov = document.createElement('div');
  ov.id = 'admira-gate';
  ov.innerHTML = [
    '<style>',
    '#admira-gate{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;',
    'background:radial-gradient(1200px 800px at 50% -10%,#16222c 0%,#0b1117 55%,#070b10 100%);',
    'color:#f4f0e8;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '#admira-gate .ag-bg{position:absolute;inset:0;opacity:.5;background:',
    'radial-gradient(2px 2px at 20% 30%,#68dce933,transparent),',
    'radial-gradient(2px 2px at 80% 60%,#68dce922,transparent),',
    'radial-gradient(1px 1px at 60% 20%,#ffffff22,transparent)}',
    '#admira-gate .ag-card{position:relative;text-align:center;max-width:440px;width:90%;padding:8px}',
    '#admira-gate .ag-mark{font-weight:800;letter-spacing:.42em;font-size:34px;margin:0 0 6px;',
    'background:linear-gradient(90deg,#68dce9,#bdeff5);-webkit-background-clip:text;background-clip:text;color:transparent;',
    'padding-left:.42em}',
    '#admira-gate .ag-site{font-size:12px;letter-spacing:.34em;color:#7f9098;text-transform:uppercase;margin:0 0 30px}',
    '#admira-gate .ag-soon{font-size:26px;font-weight:600;margin:0 0 10px}',
    '#admira-gate .ag-sub{font-size:15px;line-height:1.55;color:#aeb9bd;margin:0 0 30px}',
    '#admira-gate .ag-access{border-top:1px solid #1d2a33;padding-top:22px}',
    '#admira-gate .ag-lbl{font-size:11px;letter-spacing:.22em;color:#5d6e76;text-transform:uppercase;margin:0 0 14px}',
    '#admira-gate .ag-btnbox{display:flex;justify-content:center;min-height:44px}',
    '#admira-gate .ag-msg{margin-top:16px;font-size:13.5px;min-height:18px}',
    '#admira-gate .ag-msg.err{color:#ff8f8f}#admira-gate .ag-msg.ok{color:#8fe9b4}',
    '#admira-gate .ag-foot{position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:11px;color:#3f4d55;letter-spacing:.12em}',
    '#admira-gate .ag-spin{width:26px;height:26px;border:2px solid #1d2a33;border-top-color:#68dce9;border-radius:50%;animation:agspin .8s linear infinite;margin:6px auto}',
    '@keyframes agspin{to{transform:rotate(360deg)}}',
    '</style>',
    '<div class="ag-bg"></div>',
    '<div class="ag-card">',
    '  <h1 class="ag-mark">ADMIRA</h1>',
    '  <p class="ag-site">' + SITE + '</p>',
    '  <div class="ag-body"><div class="ag-spin"></div></div>',
    '</div>',
    '<div class="ag-foot">© ADMIRA · acceso restringido</div>'
  ].join('');
  function mount() {
    if (document.body) document.body.appendChild(ov);
    else document.documentElement.appendChild(ov);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var body = function () { return ov.querySelector('.ag-body'); };

  function reveal() {
    document.documentElement.classList.remove('admira-gating');
    ov.remove();
  }

  function showComingSoon(msg, cls) {
    var b = body(); if (!b) return;
    b.innerHTML = [
      '<h2 class="ag-soon">Próximamente</h2>',
      '<p class="ag-sub">Estamos preparando algo nuevo.<br>Esta web estará disponible muy pronto.</p>',
      '<div class="ag-access">',
      '  <p class="ag-lbl">Acceso equipo</p>',
      '  <div class="ag-btnbox" id="ag-gbtn"></div>',
      '  <div class="ag-msg ' + (cls || '') + '">' + (msg || '') + '</div>',
      '</div>'
    ].join('');
    renderGoogle();
  }

  function renderGoogle() {
    function go() {
      try {
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential });
        google.accounts.id.renderButton(document.getElementById('ag-gbtn'),
          { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 240 });
      } catch (e) {
        var box = document.getElementById('ag-gbtn');
        if (box) box.innerHTML = '<span style="color:#ff8f8f;font-size:13px">No se pudo cargar Google. Recarga la página.</span>';
      }
    }
    if (window.google && google.accounts && google.accounts.id) return go();
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = go; document.head.appendChild(s);
  }

  function setMsg(text, cls) {
    var m = ov.querySelector('.ag-msg'); if (m) { m.textContent = text; m.className = 'ag-msg ' + (cls || ''); }
  }

  function onCredential(resp) {
    setMsg('Verificando…', '');
    fetch(GATE + '/gate/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: resp.credential, site: SITE })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && d.token) {
        try { localStorage.setItem(LS, d.token); } catch (e) {}
        setMsg('Acceso concedido. Entrando…', 'ok');
        setTimeout(reveal, 500);
      } else if (d && d.error === 'not-allowed') {
        setMsg('La cuenta ' + (d.email || '') + ' no está autorizada.', 'err');
      } else {
        setMsg('No se pudo verificar la cuenta. Inténtalo de nuevo.', 'err');
      }
    }).catch(function () { setMsg('Error de red. Inténtalo de nuevo.', 'err'); });
  }

  // ── 3) Al cargar: ¿hay sesión válida? ──
  var tok = null; try { tok = localStorage.getItem(LS); } catch (e) {}
  if (!tok) { showComingSoon(); }
  else {
    fetch(GATE + '/gate/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) reveal();
      else { try { localStorage.removeItem(LS); } catch (e) {} showComingSoon(); }
    }).catch(function () {
      // si el worker no responde, no dejamos ver el sitio: portada
      showComingSoon();
    });
  }

  // utilidad consola: para cerrar sesión manualmente
  window.admiraGateLogout = function () { try { localStorage.removeItem(LS); } catch (e) {} location.reload(); };
})();

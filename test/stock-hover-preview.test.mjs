import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Preview al reposar el ratón (hover intent) sobre la miniatura de un vídeo: mudo, en bucle, con el <video>
// creado solo entonces, un único preview a la vez, sin efecto en táctil / reduced-motion, y sin tocar ▶.
const css = readFileSync(new URL('../workspace.css', import.meta.url), 'utf8');
const pages = { 'stock.html': readFileSync(new URL('../stock.html', import.meta.url), 'utf8'), 'en/stock.html': readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8') };

for (const [name, html] of Object.entries(pages)) {
  const intent = Number(html.match(/const HOVER_INTENT_MS = (\d+)/)?.[1]);
  assert.ok(intent >= 600 && intent <= 800, `${name}: hover intent entre 600 y 800 ms (${intent})`);
  assert.match(html, /HOVER_JITTER_PX = \d+/, name);
  // Solo ratón real con hover, sin reduced-motion ni ahorro de datos, pestaña visible y visor cerrado.
  const allowed = html.match(/function hoverAllowed\(e\) \{[\s\S]*?\n    \}/)[0];
  for (const needle of ["e.pointerType === 'mouse'", '(hover: hover) and (pointer: fine)', '(prefers-reduced-motion: reduce)', 'saveData', "visibilityState === 'visible'", 'lightbox.hidden'])
    assert.ok(allowed.includes(needle), `${name}: hoverAllowed comprueba ${needle}`);
  // El <video> nace en el momento del preview: preload none → src; muted + loop; sin PiP; oculto a lectores.
  const start = html.match(/function startHoverPreview\(media\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(start, /createElement\('video'\)/, name);
  assert.match(start, /v\.preload = 'none'/, name);
  assert.ok(start.indexOf("v.preload = 'none'") < start.indexOf('v.src = it.url'), `${name}: preload none antes de asignar src`);
  assert.match(start, /v\.muted = true; v\.loop = true/, name);
  assert.match(start, /\/\^\(video\|animation\)\$\/\.test\(card\.dataset\.type\)/, name);           // audio/imagen: nada
  assert.match(start, /media\.querySelector\('video\[controls\]'\)/, name);                          // ▶ ya reproduciendo: no tocar
  assert.match(start, /querySelector\('video\.stock-video-preview'\)/, name);                        // reutiliza el <video> perezoso existente
  // Parada: corta la descarga del vídeo propio y vuelve la miniatura.
  const stop = html.match(/function stopHoverPreview\(\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(stop, /removeAttribute\('src'\); v\.load\(\); v\.remove\(\)/, name);
  // Cancelaciones: mover (fuera de la tolerancia), salir, pulsar, scroll, perder foco/pestaña, repintar la rejilla, ▶.
  assert.match(html, /grid\.addEventListener\('pointermove'[\s\S]*?HOVER_JITTER_PX[\s\S]*?setTimeout\(\(\) => startHoverPreview\(media\), HOVER_INTENT_MS\)/, name);
  for (const needle of ["grid.addEventListener('pointerout'", "grid.addEventListener('pointerdown', stopHoverPreview)", "window.addEventListener('scroll', stopHoverPreview", "window.addEventListener('blur', stopHoverPreview", "visibilityState !== 'visible'"])
    assert.ok(html.includes(needle), `${name}: ${needle}`);
  assert.match(html, /function hydrateMediaOrientations\(\) \{\s*stopHoverPreview\(\);/, name);
  // El botón ▶ sigue igual: detiene el preview y no confunde el <video> de preview con el de reproducción.
  assert.match(html, /if \(playMini\) \{[\s\S]*?stopHoverPreview\(\);[\s\S]*?media\.querySelector\('video:not\(\.stock-hover-video\)'\)/, name);
  // El estado `hover` se declara antes de la primera repintada (hydrate lo usa): sin zona muerta temporal.
  assert.ok(html.indexOf('const hover = {') < html.indexOf("grid.innerHTML = pageItems.map(renderCard).join('')"), `${name}: orden de declaración`);
}
// Estilo: encima de la miniatura, sin capturar el ratón, aparece al empezar a reproducir y respeta reduced-motion.
assert.match(css, /\.stock-card-media \.stock-hover-video\s*\{[^}]*pointer-events:\s*none;[^}]*opacity:\s*0/);
assert.match(css, /\.stock-hover-video\.is-ready\s*\{\s*opacity:\s*1/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.stock-card-media \.stock-hover-video\s*\{\s*transition:\s*none/);
console.log('stock-hover-preview ok');

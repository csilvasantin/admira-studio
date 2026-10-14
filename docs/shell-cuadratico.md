# Shell cuadrático de Admira Studio / Four-band shell (FLT-101334)

**Regla: toda página nueva usa el shell.** Ninguna página de admira.studio (admira.studio) trae su propia cabecera ni su propia navegación: todas llevan la misma barra de 4 bandas que la portada. Lo mismo que en admira.app (`clearchannel-tv/docs/galaxy-shell.md`).

## Qué es

La interfaz cuadrática de la portada (`index.html`) en cuatro bandas:

- **Barra superior** (`header.pf-topbar`): a la izquierda ☰ Opciones + «Admira Studio» (enlace al inicio); en el centro las secciones (Audio, Música, Imágenes, Video, TikTok, Publicidad, Anonimizador, Ideas, Assets, Stock); al fondo a la derecha ▤ Avanzado justo antes de ⌘ Experto. El orden lo fijó Carlos (29-sep-2026): no se cambia.
- **☰ Opciones** (raíl `.rail-left`): las secciones de Admira Studio con su descripción y el sello del release.
- **▤ Avanzado** (raíl `.rail-right`): radar, arquitectura, documentación y concepto.
- **⌘ Experto** (franja inferior): la consola web (`assets/expert-cli.js`, ver `docs/expert-cli.md`), con `/marca` para la marca blanca (`docs/marca-blanca.md`).

En las páginas interiores no hay idioma ni Contacto en la barra (decisión de producto: el contacto sigue en el pie). La portada y `en/` conservan los suyos.

## Paneles superpuestos (Carlos, 3-oct-2026)

> «El cuerpo central del sitio (contenido) no se desplaza al abrir las barras opcionales, ni verticales ni la horizontal inferior.»

- **Se superponen.** ☰ (raíl izquierdo), ▤ (raíl derecho) y ⌘ (consola Experto, abajo) son capas `position:fixed` con fondo y sombra por encima del contenido, en todos los anchos. Abrirlas no cambia la posición, el ancho ni el alto del contenido (`main`, `.cuad-center`, `.page-head`, `body`), ni lo recoloca (tamaño del titular, ancho del `.lead`, columnas del paginador de `stock`…). Lo que queda debajo de un panel abierto se lee al cerrarlo o desplazando la página. Así lo hace ya Yokup.
- **Entran cerrados en cada página.** El script en línea al abrir `<body>` es el mismo en las 58 páginas que lo llevan (las 57 del shell y `adaptaciones/`): `document.body.classList.add('pf-left-off','pf-right-off','pf-bottom-off');`. No lee nada, así que es inocuo si una página no tiene alguno de los paneles. El estado abierto no se guarda (`cuadratura.js` y `site-nav.js` ya no escriben `pixeria_pf_left/right/bottom`, y `site-nav.js` borra esas claves si quedaron de antes). Sí se recuerda el tamaño redimensionado: `pixeria_pf_left_w`, `pixeria_pf_right_w`, `pixeria_pf_bottom_h` y la altura de la consola `pixeria_cli_height`.
- **Única excepción: `_cuadopen.html` y `en/_cuadopen.html`.** Son la ficha de QA de la cuadratura (noindex y sin enlaces): enseñan los tres paneles abiertos, superpuestos, para revisarlos. No guardan nada; el resto del sitio entra cerrado igualmente.
- **La consola ⌘** (`assets/expert-cli.js`) ya no envuelve el `<body>` en `.pf-cli-viewport` ni le recorta la altura: es una franja fija abajo. Siguen igual la entrada, el historial (↑/↓), Tab, los verbos y `/marca`. Los raíles laterales se apoyan encima de ella (`body.pf-cli-open .rail{bottom:…}`): eso sí está permitido, porque solo cambia un panel.
- **`quad-ui`** (`audio`, `musica`, `imagenes`, `video`): el relleno del marco de `workspace.css` es fijo; `body.quad-<lado>-open` queda como marcador de estado sin efecto en el contenido.
- **Qué está prohibido**: cualquier regla de CSS (hojas, `<style>` de las páginas o CSS inyectado desde JS) que, según `pf-*-off`, `pf-cli-open`, `quad-*-open` o un `:has()` de un panel, cambie `margin`, `padding`, `width`, `height`, `grid-template-columns`, posición, tamaño de letra o variables del contenido; medir el contenido con `--pf-left-w`, `--pf-right-w`, `--pf-bottom-h` o `--pf-cli-height`; envolver el contenido en un contenedor que cambie con los paneles; y guardar o restaurar el estado abierto. Lo vigila `test/studio-navigation.browser.cjs`.

### Quién monta qué

| Pieza | Papel |
|---|---|
| `assets/site-nav.js` | El shell de las interiores. Convierte la cabecera de la página en `.pf-topbar` (`canonicalHeader`), pinta las secciones, inyecta los raíles Opciones/Avanzado (`ensureHomeRails`, clase `body.pix-nav-home-rails`), monta Experto (`#pixNavExpertLayer` + `expert-cli.js`), engancha la marca blanca y publica la altura real de la barra en `--pf-topbar-h`. |
| `assets/cuadratura.css` | Estilos de la barra y los raíles, y el bloque **Shell universal**: fija en la barra la tipografía y los colores de la portada y la aísla del CSS de cada página. |
| `assets/cuadratura.js` | En la portada, `en/` y `_cuadopen` monta la cuadratura artesanal (`.cuad`). En las interiores no hace nada (sale al ver `pix-nav-home-rails`), pero se carga igual para que todas las páginas compartan el mismo código. |

## Cómo adopta el shell una página

Patrón de `admira-xp.html`:

```html
<head>
  …tu CSS (styles.css, workspace.css, <style>…)…
  <link rel="stylesheet" href="/assets/cuadratura.css?v=<sello>">   <!-- después de TODO el CSS propio -->
  <script defer src="/assets/site-nav.js?v=<sello>"></script>
</head>
<body>
  <!-- Cuadratura: los paneles entran cerrados en cada carga (sin parpadeo) y se superponen al contenido -->
  <script>document.body.classList.add('pf-left-off','pf-right-off','pf-bottom-off');</script>
  <header class="site-header">                       <!-- o class="topnav" -->
    <a class="brand" href="/" aria-label="Admira Studio inicio"><span>Admira Studio</span></a>   <!-- .brand, hijo DIRECTO -->
    <nav class="nav" aria-label="Secciones de Admira Studio">…</nav>                         <!-- o .primary-nav -->
  </header>
  <main>…contenido…</main>
  <script defer src="/assets/cuadratura.js?v=<sello>"></script>
</body>
```

- La cabecera **tiene** que llevar la marca como hijo directo (`.brand`, o `<div class="brand"><a class="brand-link">`) y un `<nav class="nav">` o `.primary-nav`: sin ellos `canonicalHeader` no convierte la barra (le pasaba a `404.html`). Los enlaces del `<nav>` los reescribe `site-nav.js`; los de la página son el respaldo sin JavaScript.
- El `<main>` envuelve el contenido: ahí llegan los enlaces de la franja Experto. Los raíles y la consola se le superponen; no le cambian los márgenes.
- Las páginas `quad-ui` (`audio.html`, `musica.html`, `imagenes.html`, `video.html`) usan `nav.quad-top` con `data-quad-toggle`, `.quad-brand` y `.quad-links`: `site-nav.js` convierte `.quad-top` en la misma `.pf-topbar`.
- `?v=` lo pone `scripts/sellar.py`: no a mano.

### Reglas de convivencia

- **Una sola barra.** Nada de navegaciones ni selectores de idioma propios en la página. La banda `nav.admira-nav` del kit admira-design ya no se ve en ninguna página: la ocultan `workspace.css` y `styles.css` (`display:none !important`), además de `cuadratura.css` con `pf-has-frame`.
- **Cabeceras de contenido.** Un `<header>` que es el título de la página se queda, con su CSS acotado a su clase (`header.tester-head`, `header.page-head`, `header.topbar` de `tool/`), nunca `header{…}` a secas.
- **Alturas.** Nada de `100vh - Npx` ni `top:88px` pensados para la cabecera vieja: `var(--pf-topbar-h, 70px)`. La barra mide 70 px en escritorio y 94 px en móvil (dos filas); `site-nav.js` la mide con `ResizeObserver` y los raíles ya empiezan debajo.
- **Capas.** Raíles 160, barra 180, consola experta 190, paneles flotantes 1200. Los modales y avisos propios van por encima (≥ 1300; los de `crear/` usan 99998–1000000). Las líneas CRT de `tester/` (z-index 100, sin eventos) quedan bajo la barra.
- **Misma barra en todas.** El bloque «Shell universal» de `cuadratura.css` fija familia, cuerpo y colores de la barra y de la marca, y anula en sus botones las reglas genéricas de la página (`button[aria-pressed="true"]` de `tester/` los pintaba de verde lleno). Con marca blanca manda `marca-blanca.css` (todo va bajo `:root:not([data-mb-marca])`).
- **Puertas de acceso.** El shell no toca la verja: el bloque `GATE-INICIO … GATE-FIN`, `auth-gate.js`, `backoffice/backoffice-auth.js` y `functions/_middleware.js` siguen igual. En local, `?gate=off` solo vale donde ya existía.

## Guardián

`test/studio-navigation.test.mjs` inspecciona todos los HTML: una página de interfaz tiene main, cabecera montable, scripts comunes diferidos, versiones de assets vigentes y cierre inicial de paneles. `test/studio-page-exceptions.json` documenta exclusivamente alias, documentos de emisión y redirecciones fuera de Studio. Una nueva página sin shell hace fallar la prueba; los alias de administración conservan query/hash y no incluyen lógica local de privilegios.

`test/studio-navigation.browser.cjs` verifica las 76 rutas de navegación, incluidos los seis alias interiores, en español e inglés: una barra, Inicio/Stock del idioma actual, tres controles de panel, superposición sin mover main y barra visible después de scroll. Recorre cambios reales `/language ENG` → `/language ESP` desde Creador, Adaptador y Cápsulas, conserva los parámetros del ejemplo y comprueba accesos a Stock e Inicio en escritorio y móvil. La variante de fuentes locales usa `STUDIO_SOURCE_OVERLAY=1`; la comprobación final usa la web real con autenticación de servidor, sin sustituir API ni acceso.

## Páginas

**Con shell (70 de 88).**

| Grupo | Páginas |
|---|---|
| Portada y variantes (cuadratura artesanal) | `index.html`, `en/index.html`, `_cuadopen.html`, `en/_cuadopen.html` |
| Secciones (ya lo llevaban) | `admira-xp.html`, `anonimizador.html`, `avatar.html`, `concepto.html`, `director.html`, `ideas.html`, `plataforma.html`, `publicidad.html`, `stock.html`, `clearchannel/`, `radar/` |
| `quad-ui` (barra propia que `site-nav.js` convierte) | `audio.html`, `musica.html`, `imagenes.html`, `video.html` |
| Adoptadas en FLT-101334 | `404.html`, `backoffice/` (+ `crear/`, `labs/`, `tool/`), `calendario/`, `campanas/`, `crear/`, `crear-campana/`, `documentacion/`, `help/`, `hilomusical/`, `hilomusical.html`, `labs/`, `mcp/`, `megafonia/`, `megafonia.html`, `privacidad.html`, `segmentado/`, `segmentado.html`, `tester/`, `tool/`, `flags/australia/` |
| Inglés, igualadas a su versión española | `en/admira-xp.html`, `en/anonimizador.html`, `en/audio.html`, `en/avatar.html`, `en/concepto.html`, `en/crear-campana/`, `en/director.html`, `en/imagenes.html`, `en/musica.html`, `en/plataforma.html`, `en/privacy.html`, `en/publicidad.html`, `en/radar/`, `en/stock.html`, `en/video.html` |

Qué cambió al adoptarlas:

| Página | Cambio |
|---|---|
| `404.html` | La cabecera no tenía `<nav>` y no se convertía: ahora sí. Altura `calc(100vh - var(--pf-topbar-h) - 50px)`. |
| `tester/` | Cabecera canónica + `<main>`. Su `<header>` de título pasa a `header.tester-head` con el CSS acotado. |
| `hilomusical.html`, `megafonia.html`, `segmentado.html` | Sin shell hasta ahora: cabecera canónica y `<main class="tool-main">`; el relleno pasa del `<body>` al `<main>` para que la barra quede pegada arriba. |
| `help/` | Cabecera canónica y `<main>`; un trozo suelto del comentario de la verja se pintaba como texto encima de todo (ahora es comentario). |
| `flags/australia/`, `mcp/` | Cabecera canónica (`flags/`) y `<main>` (`mcp/`). Pie acotado. |
| `documentacion/` | Índice pegajoso `top: calc(var(--pf-topbar-h) + 18px)` y anclas `scroll-margin-top: calc(var(--pf-topbar-h) + 22px)`. |
| `crear-campana/`, `en/crear-campana/`, `hilomusical/`, `megafonia/`, `segmentado/` | Héroe a pantalla completa `calc(100vh - var(--pf-topbar-h))`. |
| `stock.html` | `cuadratura.css` pasa detrás de `viewer.css` y `editor.css`. |
| Resto | `cuadratura.css`, script en línea de cierre y `cuadratura.js` (la barra ya se montaba). |

### Excepciones (18)

Los seis alias interiores (idea, privacy y cuatro rutas god) terminan en una página de Studio con shell. Las seis rutas de Xpacios trasladadas mantienen su redirección a XpaceOS. Los seis documentos de emisión/fragmentos conservan el lienzo de pantalla completa que consumen los players e iframes; no son páginas de navegación del estudio.

| Página | Motivo |
|---|---|
| `privacy.html` | Redirección a la política inglesa, con retorno a español mediante idioma. |
| `god/` (+ `crear/`, `labs/`, `tool/`) | Alias antiguos hacia su equivalente `/backoffice/`, con autorización de servidor intacta y query/hash conservados. |
| `idea.html` | Redirección inmediata a `/concepto.html`; no pinta nada. |
| `xpacios/index.html` | Redirección a xpaceos.com (Xpacios se mudó a XpaceOS). |
| `xpacios/crear/index.html` | Ídem. |
| `xpacios/crear/phone.html` | Ídem. |
| `xpacios/grok/index.html` | Ídem. |
| `xpacios/xtanco-barcelona/index.html` | Ídem. |
| `xpacios/xtanco-valencia/index.html` | Ídem. |
| `signage.html` | Player del Pixer Feed a pantalla completa (overflow oculto) para las pantallas: una barra encima cortaría la emisión. |
| `xtore.html` | Player del Pixer Feed a pantalla completa para tienda. |
| `en/signage.html` | Ídem (inglés). |
| `en/xtore.html` | Ídem (inglés). |
| `campanas/sabiasque-tabaco/bucle.html` | Bucle de la campaña a pantalla completa: lo que emite la pantalla y lo que se previsualiza en el iframe de `/campanas/`. |
| `campanas/sabiasque-tabaco/slide.html` | Fragmento: cada pieza que el bucle carga en su iframe. |

`_cuadopen.html` y `en/_cuadopen.html` no son excepción: son la portada con la cuadratura completa y ya cumplen.

### Pendiente conocido

- `tool/` y `backoffice/tool/` cargan JetBrains Mono de Google Fonts; el resto del sitio no la descarga y usa la monoespaciada del sistema. La barra declara la misma familia en todas, pero en esas dos se ve con la fuente real.
- `en/audio.html` no es `quad-ui` (la española sí). Las dos montan la misma barra; convertirla es otra tarea.
- La barra mantiene `position:sticky`; el body de páginas con shell usa `overflow-x:clip`, sin crear un contenedor de scroll que se lleve la barra fuera de la vista.

---

**Rule: every new Admira Studio page uses the shell.** Load `/assets/cuadratura.css` after the page CSS, `/assets/site-nav.js` (defer) and `/assets/cuadratura.js`, give the page a `header.site-header` (or `.topnav`) with a direct `.brand` child and a `nav.nav`, and wrap the content in `<main>`. Use `var(--pf-topbar-h)` for heights and keep own modals above z-index 1300. Panels overlay the content (Carlos, 3 Oct 2026): opening ☰, ▤ or ⌘ never moves or resizes `main`, `.cuad-center`, `.page-head` or `body`, and every page loads with the three panels closed (only their resized size is remembered); `test/studio-navigation.browser.cjs` enforces it. 70 of the 88 pages carry the shell; the 18 exceptions (redirects, full-screen players, an iframe fragment and the migrated administration aliases) are listed above and in `test/studio-page-exceptions.json` of `test/studio-navigation.test.mjs`, which fails when a page skips the shell.


## Continuidad ES / EN · 14-oct-2026

ES: Inicio y Stock están en la misma barra de todas las páginas de interfaz. Los enlaces del raíl Opciones y de la marca siguen el idioma de la interfaz. Cuando una demo cambia el idioma sin recargar, sólo se actualiza la navegación: el contenido central, el borrador y los paneles abiertos se conservan. El comando de idioma actualiza también `lang` en la URL para que una recarga no revierta la selección; mantiene los demás parámetros y el fragmento. Las parejas traducidas, incluida Privacidad, navegan a su ruta real. Las fichas públicas y las páginas de demos, cápsulas y ensayos ahora adoptan el mismo shell. Los alias god usan las páginas protegidas backoffice y no restauran un superusuario local.

EN: Home and Stock remain in the common header on every workspace page. The brand and Options links follow the UI language. In-place language changes update navigation without replacing the main content, draft or open panels. The language command updates the URL preference so reload retains the choice; other parameters and the fragment survive. Translated counterparts, including Privacy, resolve to their actual routes. Public sheets, demos, capsules and adapter studies now use the shared shell. Legacy god aliases lead to server-protected backoffice pages without restoring a local superuser. Full-screen media documents and redirects to XpaceOS retain their delivery roles.

Read-only public browser audit: `PLAYWRIGHT_MODULE=/path/to/playwright node test/studio-navigation.browser.cjs`. Static guard: `node --test test/studio-navigation.test.mjs`.

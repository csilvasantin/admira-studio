# Intro en vídeo de la portada · Homepage video intro

Admira Studio · NeoMacStudio · MacStudio · 17-oct-2026.

## Español

La portada de admira.studio abre con la intro «Todo en orden» de xpaceos.com, pero con el look de admira.studio (Matrix). Son 15 segundos:
- un reloj marca las 09:58;
- fallan pantallas, música, aroma y wifi;
- pasa la línea «ADMIRA STUDIO» y todo queda en verde;
- cierra con «Admira Studio▌» tecleado y la frase de la portada.

Lleva lluvia Matrix, JetBrains Mono en verde fósforo (`#00ff41`) y textos de terminal.

- **Dónde sale:** solo en la portada, `/` (español) y `/en/` (inglés), según el `<html lang>` de la página. El script también se carga en `_cuadopen` y en el backoffice, porque comparten la cabecera, pero allí no arranca.
- **Cuándo:** una vez por sesión del navegador **y por idioma** (`sessionStorage`, `admirastudio_intro_a`, con los idiomas vistos). Al pasar de `/en/` a `/` (castellano) sale en castellano si aún no se ha visto en él. No sale con «reducir movimiento». `?intro=0` la quita y `?intro=1` la fuerza.
- **Cerrar:** «[Saltar intro ✕]», tecla Esc, o sola al terminar. Si el vídeo no arranca en 4 segundos, se quita sola.
- **Música:** las dos bandas sonoras originales de xpaceos.com, alternas (`localStorage`, `admirastudio_intro_musica`): «Tic-tac y campanas» y «Pulso».
  - Intenta sonar. Si el navegador no lo deja, queda el botón «[🔊 Activar sonido]».
  - `?musica=campanas|pulso` fija una y `?musica=0` la quita.
- **Ficheros (esta carpeta):**
  - `intro.js`: lógica y estilo;
  - `intro-studio-a-es-1080.mp4` / `-720.mp4` e `intro-studio-a-en-1080.mp4` / `-720.mp4`: unos 10 MB los de 1080p y unos 5,5 MB los de 720p;
  - `musica-campanas.mp4` y `musica-pulso.mp4`: solo audio (AAC). Van en `.mp4` porque Cloudflare no guarda `.m4a` en caché y entonces no responde por rangos; sin rangos, la música no se puede poner en el segundo del vídeo.
  - Desde 1600 píxeles reales de ancho se sirve la de 1080p.
- **Espejo de Pixeria:** esta carpeta está en `propios` de `marca.json`, así que `sync.sh` no la borra. La carga del script es la última `sustitución` de `marca.json`, así que el siguiente sync la vuelve a poner.
- **Cómo se hizo el vídeo:**
  - es la misma maqueta de xpaceos.com con `?tema=studio`, y `&lang=en` para el inglés;
  - se capturó fotograma a fotograma a 30 fps y se codificó en H.264 con AVFoundation;
  - la lluvia Matrix también depende del tiempo, así que cada fotograma es exacto.
- **Pruebas:** `test/intro-studio.test.mjs`.
- No cambia el uso del producto.

## English

The admira.studio homepage opens with xpaceos.com's «All in order» intro, restyled as admira.studio (Matrix). It runs for 15 seconds:
- a clock shows 09:58;
- screens, music, scent and wifi fail;
- the «ADMIRA STUDIO» line sweeps through and everything turns green;
- it ends with a typed «Admira Studio▌» and the homepage claim.

- **Where:** homepage only, `/` (Spanish) and `/en/` (English), following `<html lang>`.
- **When:** once per browser session and per language: going from `/en/` to `/` plays the Spanish intro if it has not been seen in Spanish. It is skipped with reduced motion. `?intro=0` removes it and `?intro=1` forces it.
- **Close:** «[Skip intro ✕]», the Esc key, or automatically at the end.
- **Music:** the two original soundtracks alternate. If the browser blocks sound, «[🔊 Turn sound on]» is shown.
- **Mirror:** this folder is listed under `propios` in `marca.json`, and the script tag is the last `sustitución`, so `sync.sh` keeps both.

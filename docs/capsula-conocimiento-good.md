# Cápsula de conocimiento GOOD / GOOD knowledge capsule

ES: En el modo Experto de Admira Studio, escribe `/demo capsula conocimiento good`. Reproduce un vídeo vertical de 30 segundos con voz Mónica. Añade `en` para Daniel en inglés o `es` para español. Los botones English/Español cambian la versión; los controles del vídeo permiten pausar, repetir y ajustar el volumen. Descargar MP4 conserva el vídeo completo. Escape o `/demo capsula cerrar` detienen y cierran el reproductor. Si el navegador bloquea la reproducción automática con sonido, pulsa Play.

EN: In Admira Studio's Expert mode, enter `/demo capsule knowledge good`. Add `en` for Daniel's English narration or `es` for Mónica's Spanish narration. The English/Español buttons change versions. Native video controls pause, replay and adjust volume. Download MP4 keeps the complete video. Escape or `/demo capsule close` stops playback and closes the player. If the browser blocks autoplay with sound, press Play.

Abrir / Open: https://www.admira.studio/capsulas/ (ES) · https://www.admira.studio/capsulas/?lang=en (EN).

Vídeos / Videos: `/capsulas/conocimiento-good-es.mp4`, `/capsulas/conocimiento-good-en.mp4`. Formato / Format: H.264 + AAC, 720×1280 (9:16), 25 fps, 30 s.

Registro / Registry: `/capsulas/capsulas-good.json`, esquema 1. Incluye / Includes: guiones ES/EN, modelo, uso de tokens, voces, URLs, fuentes, semilla, prompt del fondo y coste. Guion / Script: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b`), API gratuita / free API. Fondo / Background: FLUX.1-schnell q8 con mflux/MLX en MacBook Pro 16, 4 pasos / steps, semilla / seed 5664. Voz / Voice: `say` del sistema macOS, Mónica ES y Daniel EN. Generación / Generation: 0 €; abrir la demo no solicita generación / opening the demo does not request generation.

Tema / Topic: Internet y la Web son distintos / The Internet and the Web are different. Fuentes primarias / Primary sources: [Tim Berners-Lee, W3C](https://www.w3.org/People/Berners-Lee/FAQ.html), [CERN: 35 years of the Web](https://home.cern/world-wide-web-35/).

MCP: esta entrega añade un reproductor web y recursos públicos. El catálogo `/mcp/capsula-good.json` describe el comando y los archivos como recursos; no anuncia una herramienta nueva en el servidor MCP. Un agente puede consultar el registro y descargar ambos vídeos por HTTPS. / This delivery adds a web player and public resources. `/mcp/capsula-good.json` describes the command and files as resources; it does not announce a new server MCP tool. Agents can read the registry and download both videos over HTTPS.

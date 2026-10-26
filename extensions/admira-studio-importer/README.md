# AdmiraStudioImporter

Extensión Chrome Manifest V3 para importar el vídeo de YouTube que estás viendo directamente al Stock de Admira Studio, sin pasar por Telegram.

## Qué incluye

- Botón flotante **IMPORTAR EN ADMIRA** dentro de YouTube.
- Panel lateral persistente con miniatura, título, canal, formato, comentarios y etiquetas.
- Importación de vídeo MP4 o audio MP3.
- Opción por vídeo **Cápsula con subtítulos en castellano**: conserva el original y crea una copia con el audio original y subtítulos visibles, hasta tres minutos. Requiere también la actualización web de Stock descrita más abajo.
- Inicio automático opcional y progreso completo dentro de Admira Studio.
- Menú contextual **Importar en Admira Studio**.
- Atajo `Alt+Shift+A` para importar el vídeo actual con los valores guardados.

La extensión no contiene claves ni descarga el vídeo por su cuenta. Abre un handoff seguro hacia `https://www.admira.studio/stock.html`, que reutiliza el flujo existente `yt-dlp → Stock` y la sesión del usuario.

La política específica de la extensión está publicada en `https://www.admira.studio/extensions/admira-studio-importer/privacy` y el soporte en `https://www.admira.studio/extensions/admira-studio-importer/support`.

## Instalación recomendada

Instala la versión publicada desde [Chrome Web Store](https://chromewebstore.google.com/detail/admirastudioimporter/empmdckpifcmhnlalcmkpceanaehedhl). La versión publicada y este código en desarrollo pueden ser distintas: la opción de subtítulos se prepara para 1.0.2. No sustituyas una instalación existente para revisar este cambio.

La publicación de una extensión y el aviso de confianza de Navegación segura mejorada son comprobaciones distintas. Google decide la confianza del editor según su historial de cumplimiento; verificar el dominio no garantiza que desaparezca el aviso ni fija un plazo. [Ayuda de Chrome](https://support.google.com/chrome/answer/2664769?hl=es).

## Desarrollo y carga descomprimida

Para desarrollar una versión nueva en un perfil de pruebas, utiliza esta carpeta del código fuente. El ZIP público `AdmiraStudioImporter-v1.0.1.zip` corresponde a la versión anterior. Después:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona esta carpeta: `extensions/admira-studio-importer`.
5. Abre cualquier vídeo o Short de YouTube.

## Cápsulas con subtítulos ES

La corrección web está publicada desde PR140. Con la extensión instalada **1.0.1** basta marcar un vídeo nuevo con `#capsula` (o `#cápsula`) en Etiquetas o Comentarios: la web fija el destino `subtitulos-es`. Las etiquetas del usuario se conservan, el audio y las importaciones sin marca de cápsula no activan este trabajo. No hace falta reinstalar ni actualizar la extensión. La casilla siguiente pertenece a **1.0.2 en desarrollo**, todavía sin publicar en la tienda.

La casilla solo se ofrece para vídeo y se desmarca al cambiar de vídeo o elegir audio. No se guarda como preferencia ni activa trabajos desde el atajo o menú contextual. El handoff existente entrega `capsula, subtitulos-es` junto con las etiquetas del usuario; no añade credenciales, permisos ni llamadas de IA a la extensión. Si se exceden diez etiquetas o 400 caracteres, el panel pide corregirlas antes de importar.

Stock reutiliza `assets/capsula-traduce.mjs`: extrae audio con FFmpeg WASM, llama a `/stock-subtitles` con destino `es` y detección automática del idioma, quema el SRT en otro MP4 y lo publica enlazado al original mediante `externalRef` y `par-<id>`. Las versiones `subtitulado-es` no vuelven a disparar el proceso; una versión EN previa no impide crear la ES. Se conserva la sesión y el publicador existentes. Sin voz, traducción incompleta o vídeo de más de 180 segundos no se publica una copia parcial como si estuviese completa.

La versión web debe incorporar también los cambios de `assets/capsula-traduce.mjs`, `assets/etiquetas-funcionales.mjs`, `functions/stock-subtitles.js` y su importación en `stock.html` antes de distribuir la extensión 1.0.2. No publicar solo el ZIP: el código web anterior puede invertir el destino cuando conoce que el audio está en español.

Cada vídeo entregado al importador es la referencia de imagen y voz. La copia subtitulada mantiene resolución, encuadre y cadencia; quemar los subtítulos requiere recodificar la imagen (H.264, CRF 18), por lo que no se promete identidad de píxeles ni mejora del original. La pista de audio se copia sin volver a comprimirla: no se sustituye por una voz sintetizada. La copia mono 16 kHz usada para reconocer voz solo se envía al transcriptor y nunca se usa como audio del vídeo final. Si el audio original no es compatible con el MP4 de salida, la generación informa del fallo en lugar de degradarlo silenciosamente.

Pruebas locales (sin servicios de IA reales ni escrituras en Stock):

```sh
node --test test/admira-studio-importer.test.mjs test/capsula-traduce.test.mjs test/stock-subtitles.test.mjs test/etiquetas-funcionales.test.mjs test/capsula-alterna.test.mjs
```

La corrección web propia de Studio se identifica en `.source-patches/importer-auto-subtitles-web.json` y se publicó separada del paquete de extensión. PR139 conserva solo la propuesta 1.0.2 y las herramientas de prueba. Al portar la fuente hay que conservar estos cambios; no regenerar el espejo antiguo sobre las mejoras publicadas.

### Resultado de la prueba real (26-oct-2026)

El vídeo ya importado `1793037808156-6vymvy` permitió reproducir un fallo `media` al cargar los metadatos con el reproductor nativo. La corrección publicada lee duración y dimensiones mediante FFprobe del mismo motor FFmpeg que extrae el audio. La prueba real en navegador obtuvo 320×240, 19.063583s y 115276bytes de audio con una sola descarga. La cola del motor es común a cápsulas alternas y subtítulos. También se repinta el estado tras finalizar para evitar una insignia «en curso» después de fallar.

La prueba REST aislada (`scripts/test-importer-subtitles-real.mjs`) devolvió HTTP401/código10000. La auditoría de lectura del run40403239960 confirmó un token activo con acceso a Pages (200), pero sin acceso al catálogo de Workers AI (403/código10000). Esta credencial de CI es distinta del binding AI de producción: no se cambiaron permisos ni credenciales. El workflow manual arranca por defecto en modo `audit`, sin inferencias ni escrituras; `render` debe seleccionarse expresamente y requiere una credencial autorizada para esa API.

Se completó una alternativa local con reconocimiento real de Whisper medium.en y traducción revisada en el chat. La copia está en [Stock #1898](https://www.admira.studio/stock.html?highlight=1793048061800-nnxzdn): 19,063583 s, 320×240, 15 fps, cinco bloques ES. Se comprobó que el bitstream de audio es idéntico al original y que el archivo publicado coincide con el generado. Esto demuestra la entrega local y su publicación, sin dar por aprobada la integración automática. La extensión instalada no se modificó y se restauraron las etiquetas temporales del original.

## Publicar

Comprime el contenido de esta carpeta —con `manifest.json` en la raíz del ZIP— y súbelo al Chrome Web Store Developer Dashboard.

Los textos, justificaciones y recursos gráficos preparados para la ficha están en `extensions/admira-studio-importer-store/`.

### Verificación automática en producción

Tras PR140 y el despliegue 40404111096, el vídeo importado `1792770584397-znilej` generó automáticamente con el binding AI real una [versión con 23 frases ES](https://www.admira.studio/stock.html?highlight=1793050177742-l99iqd). Original y copia conservan 720×1280, 30fps y 59.015011s; el hash de la pista de audio es idéntico. Se restauraron las etiquetas temporales del original y del clip de robótica sin voz utilizado para la comprobación negativa. La transcripción automática todavía requiere revisión editorial: esta muestra incluye una hora mal reconocida y dos frases muy breves al final. No se presenta como transcripción revisada.

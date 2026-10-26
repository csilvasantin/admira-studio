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

## Subtítulos y formatos (1.0.2 en desarrollo)

La versión instalada 1.0.1 se mantiene intacta. En ella, la corrección web ya publicada permite pedir ES marcando un vídeo con `#capsula` en Etiquetas o Comentarios. La versión 1.0.2 añade dos selectores por vídeo: **Subtítulos / Subtitles: ninguno, castellano o inglés**, y **Formato de la copia: original, vertical 9:16, horizontal 16:9 o ambos**. Se restablecen al cambiar de vídeo y se desactivan en audio; no se guardan como preferencias.

El handoff conserva su formato existente. Transporta las opciones con etiquetas funcionales explícitas: `subtitulos-es`, `subtitles-en` o `sin-subtitulos`; `formato-original`, `adaptar-vertical`, `adaptar-horizontal` o `adaptar-ambos`. Las elecciones actuales sustituyen otras etiquetas de opción contradictorias; las etiquetas de cliente se conservan. Si se exceden diez etiquetas o 400 caracteres, el panel pide corregirlas antes de importar.

Stock mantiene el original. Si se combinan subtítulos y formato, primero transcribe y traduce una vez, guarda la versión subtitulada y después adapta esa copia. Las copias de formato conservan la imagen completa sobre fondo desenfocado, la cadencia de origen y la pista de audio copiada. Una proporción ya existente se reutiliza; un cuadrado con «ambos» genera dos proporciones. La deduplicación distingue idioma y proporción, y un fallo parcial no vuelve a generar la copia ya guardada. El límite automático es de 180 segundos. La transcripción automática debe revisarse.

Esta ampliación exige desplegar también `assets/importer-options.mjs`, los módulos de cápsulas/subtítulos, `app.js` y `stock.html` antes de enviar el paquete 1.0.2. La web actualmente publicada solo tiene las correcciones de PR140/141; los formatos explícitos de esta propuesta todavía no están desplegados. El ZIP candidato no debe distribuirse como actualización oficial antes de esa validación.

Para preparar el paquete revisable, sin instalar ni enviar a Google:

```sh
python3 scripts/package-importer.py /ruta/de/salida/AdmiraStudioImporter-v1.0.2-candidate.zip
```

Para la actualización oficial se sube ese paquete completo a la ficha existente, con versión superior a 1.0.1, se actualizan capturas/textos y se envía a revisión. Se recomienda publicación diferida para verificar la web antes de distribuir. Fuente: https://developer.chrome.com/docs/webstore/update. No es necesario crear otra extensión ni otro ID.

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

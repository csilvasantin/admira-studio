# Novedades de AdmiraStudioImporter

Historial de los cambios del paquete de Chrome. La ayuda pública ofrece este mismo apartado en [Novedades por versión](https://www.admira.studio/extensions/admira-studio-importer/support#novedades).

El estado indicado se comprobó el **27 de octubre de 2026**. Es una observación de ese día, no la fecha exacta de aprobación ni una garantía sobre la versión instalada. La [ficha oficial](https://chromewebstore.google.com/detail/admirastudioimporter/empmdckpifcmhnlalcmkpceanaehedhl) muestra la versión disponible para instalar.

## 1.0.2 · Subtítulos y formatos

**Estado observado:** aprobada por Google, lista para publicar con publicación diferida. Todavía no publicada; la versión pública seguía siendo la 1.0.1.

### Novedades

- Selector por vídeo de **Sin subtítulos, Castellano o English**.
- Selector de **formato original, vertical 9:16, horizontal 16:9 o ambos**, independiente del idioma.
- Las opciones se restablecen al cambiar de vídeo y se desactivan al elegir audio.
- Las elecciones actuales sustituyen etiquetas de subtítulos o formato incompatibles. El panel valida el máximo de diez etiquetas y 400 caracteres en total antes de importar.
- El panel muestra la versión 1.0.2 y confirma las opciones de procesamiento elegidas.

### Resultado y requisitos

Stock conserva el original y genera las copias solicitadas. Mantiene la pista de voz original; adapta la imagen completa sobre fondo desenfocado y coloca los subtítulos sobre cada formato final. La generación automática admite vídeos de hasta tres minutos y requiere mantener Stock abierto. Hay que revisar la transcripción y la traducción antes de usar el resultado.

El procesamiento depende de la actualización web de Stock, ya desplegada. Los permisos de Chrome y los dominios autorizados coinciden con los de la 1.0.1. La aprobación y la verificación del dominio no garantizan que desaparezca el aviso de Navegación segura mejorada.

## 1.0.1 · Importación a Stock

**Estado observado:** publicada en Chrome Web Store.

- Importación del vídeo de YouTube detectado al Stock de Admira Studio, sin pasar por Telegram.
- Vídeo MP4 con audio o extracción de audio MP3.
- Panel lateral con miniatura, título y canal; comentario, etiquetas e inicio automático opcional.
- Botón dentro de YouTube, icono de la extensión, menú contextual y atajo Alt+Shift+A.

Esta versión no incluye los selectores de subtítulos ni de orientación de la 1.0.2. La web actual permite solicitar una copia en castellano mediante la etiqueta `#capsula`.

## Mejoras de la web que acompañan a la 1.0.2

Se desplegaron por separado del paquete de Chrome:

- Carga de metadatos del vídeo compatible con el motor de procesamiento de Stock.
- Reconocimiento de voz y traducción automáticos mediante el servicio de IA de producción.
- Composición de subtítulos sobre la resolución final y adaptación vertical u horizontal conservando la voz original.
- Correcciones de fragmentos demasiado breves y de tiempos de reconocimiento; guardado seguro de etiquetas.

La prueba real completada el 27 de octubre generó nuevas copias ES vertical y horizontal de un vídeo de 102,957279 segundos. Ambas se decodificaron completas y conservaron la pista de audio original. No se reutilizaron subtítulos revisados como entrada de esa generación.

La descarga del SRT completo sigue siendo un parche local pendiente de integrar y desplegar. No forma parte del paquete 1.0.2 aprobado.

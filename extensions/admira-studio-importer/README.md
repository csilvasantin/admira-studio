# AdmiraStudioImporter

Extensión Chrome Manifest V3 para importar el vídeo de YouTube que estás viendo directamente al Stock de Admira Studio, sin pasar por Telegram.

## Qué incluye

- Botón flotante **IMPORTAR EN ADMIRA** dentro de YouTube.
- Panel lateral persistente con miniatura, título, canal, formato, comentarios y etiquetas.
- Importación de vídeo MP4 o audio MP3.
- Inicio automático opcional y progreso completo dentro de Admira Studio.
- Menú contextual **Importar en Admira Studio**.
- Atajo `Alt+Shift+A` para importar el vídeo actual con los valores guardados.

La extensión no contiene claves ni descarga el vídeo por su cuenta. Abre un handoff seguro hacia `https://www.admira.studio/stock.html`, que reutiliza el flujo existente `yt-dlp → Stock` y la sesión del usuario.

## Instalar para probar

Descarga el paquete desde `https://www.admira.studio/extensions/AdmiraStudioImporter-v1.0.0.zip`, descomprímelo y después:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona esta carpeta: `extensions/admira-studio-importer`.
5. Abre cualquier vídeo o Short de YouTube.

## Publicar

Comprime el contenido de esta carpeta —con `manifest.json` en la raíz del ZIP— y súbelo al Chrome Web Store Developer Dashboard.

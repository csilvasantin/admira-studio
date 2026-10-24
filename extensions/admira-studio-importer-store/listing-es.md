# AdmiraStudioImporter · Chrome Web Store

## Ficha

- Nombre: `AdmiraStudioImporter`
- Resumen: `Importa vídeos y audio de YouTube directamente al Stock de Admira Studio, sin pasar por Telegram.`
- Categoría: `Productividad`
- Idioma principal: `Español`
- Precio: `Gratis`
- Visibilidad: `Pública`
- Regiones: `Todas las regiones`
- Sitio web: `https://www.admira.studio/`
- Soporte: `https://www.admira.studio/extensions/admira-studio-importer/support`
- Privacidad: `https://www.admira.studio/extensions/admira-studio-importer/privacy`

## Descripción detallada

AdmiraStudioImporter lleva el vídeo de YouTube que estás viendo directamente al Stock de Admira Studio. Elimina el paso intermedio por Telegram y mantiene visible el contexto de la importación.

Funciones principales:

- Detecta vídeos, Shorts y directos de YouTube.
- Importa vídeo MP4 o extrae audio MP3.
- Permite añadir comentarios y etiquetas antes de importar.
- Abre un panel lateral persistente con miniatura, título y canal.
- Ofrece botón dentro de YouTube, icono de extensión, menú contextual y atajo Alt+Shift+A.
- Inicia automáticamente la importación o la deja preparada para confirmarla.
- Muestra el progreso dentro del Stock de Admira Studio.

La extensión es gratuita, no contiene anuncios, no incorpora analítica y no descarga el contenido por su cuenta. Para completar la importación se necesita una cuenta autorizada de Admira Studio.

## Única finalidad

Preparar, bajo una acción explícita del usuario, la importación del vídeo de YouTube abierto hacia el Stock de Admira Studio.

## Justificación de permisos

- `sidePanel`: muestra el formulario de importación junto al vídeo sin abandonar YouTube.
- `storage`: conserva temporalmente el vídeo detectado y sincroniza formato, etiquetas e inicio automático elegidos por el usuario.
- `contextMenus`: añade la acción “Importar en Admira Studio” sobre páginas y enlaces de YouTube.
- Hosts de YouTube: detecta únicamente la URL y los metadatos visibles del vídeo actual e inserta el botón de importación. No se solicita acceso a otros sitios.

## Privacidad · respuestas del panel

- ¿Usa código remoto? `No`.
- Datos tratados: `actividad de navegación limitada al vídeo actual`, `contenido del sitio web (título, canal y miniatura)` y `contenido aportado por el usuario (comentario y etiquetas)`.
- Finalidad: `funcionalidad de la aplicación`.
- Venta o transferencia para publicidad: `No`.
- Uso para crédito o préstamos: `No`.
- Lectura humana de datos: `No`, salvo solicitud concreta del usuario, seguridad o exigencia legal conforme a la política.
- Transmisión: solo tras pulsar Importar, mediante HTTPS hacia `www.admira.studio`.
- Certificación de Uso Limitado: `Sí`.

## Instrucciones de revisión

1. Instalar la extensión y abrir cualquier vídeo público de YouTube.
2. Comprobar el botón `IMPORTAR EN ADMIRA` y el panel lateral.
3. Elegir vídeo o audio, añadir etiquetas y pulsar `IMPORTAR EN ADMIRA STUDIO`.
4. Se abrirá `https://www.admira.studio/stock.html` con la importación preparada.
5. La interfaz de YouTube y el handoff pueden comprobarse sin credenciales. La ejecución final en el Stock requiere una cuenta autorizada de Admira Studio; si Google exige acceso completo, proporcionar en el campo privado del revisor una cuenta temporal, nunca en la descripción pública.

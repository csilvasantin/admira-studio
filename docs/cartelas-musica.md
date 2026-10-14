# Cartelas de música / Music cards

## Español

Cada pieza musical de Suno dispone de una cartela horizontal (1920×1080) y vertical (1080×1920), con título original, autor cuando consta, duración conocida y portada si existe. Cuando no hay portada se usa una composición de disco y onda musical; no se inventa una fotografía.

En Música, las versiones generadas muestran ambos formatos y permiten descargar una cartela PNG. En Stock, el filtro Música ofrece los mismos controles y el visor conserva el formato elegido durante esa visita. Los PNG descargados son archivos locales: no se publican como fichas de imagen o vídeo.

`assets/music/cards.mjs` distingue la categoría del contenido de su contenedor. Una pieza Suno identificada por su motor/proveedor (o una importación local de audio explícitamente etiquetada Suno) y guardada antiguamente como `audio` o `video` se muestra como `music` en Stock. Su ID, URL, MIME y archivo original se mantienen. Un MP4 musical sigue siendo música. Las cartelas explícitamente vinculadas mediante `musicCard.schema = admira.music-card.v1` también pertenecen a música.

No se reclasifica una imagen o un vídeo ordinario por llevar una etiqueta libre `suno`. La normalización se aplica a las vistas, filtros, contadores y selección de playlists de Stock de Studio; no reescribe los metadatos originales del bucket ni constituye una migración de otros consumidores.

La cartela no cambia el audio, no gasta créditos de Suno ni crea entradas adicionales en el catálogo. Los formatos son presentaciones de la misma pieza, no canciones nuevas. No se cambia la autorización ni la cuadratura de Studio.

## English

Each Suno music track has a landscape (1920×1080) and portrait (1080×1920) music card. Cards preserve the original title, known author, known duration and existing artwork. Tracks without artwork use a record and waveform composition.

Generated versions on Music and existing tracks under Stock’s Music filter offer both formats and PNG downloads. A downloaded card is a local file, never a standalone image/video catalog item. The lightbox keeps the selected orientation during the current visit.

Music category is independent of its container: legacy Suno audio/video entries and local Suno-tagged audio imports display as music while retaining their IDs, URLs, MIME types and original files. Explicitly linked music-card presentations also remain music. An ordinary image or video is not reclassified merely because a user adds a `suno` tag.

Normalization covers Studio Stock views, filters, counters and playlist selection. It does not rewrite original bucket metadata or migrate other consumers. Cards do not alter audio, spend Suno credits, add catalog entries, change authentication or change Studio’s shared navigation.

## Comprobación / Verification

```sh
node --test test/music-cards.test.mjs test/stock-counts.test.mjs test/stock-formats.test.mjs
```

`scripts/test-music-cards-browser.mjs` checks ES/EN Stock with a real approved Studio session and a labelled subset of the public index. It blocks all browser writes and generation calls. Provider generation is intercepted with fixture clips and spends no credits. It verifies music-only visibility, unchanged ordinary image/video entries, reloadable filters, lightbox controls, PNG dimensions and a covered track. Configure `STUDIO_REVIEW_TOKEN`, `STUDIO_REVIEW_INDEX`, `PLAYWRIGHT_PATH` and optionally `STUDIO_REVIEW_OUT`; credentials remain in memory and are not part of the artifact.

# Starbucks · seis pantallas / Six screens

ES: Prueba editable en [Creador](https://admira.studio/creador/?demo=starbucks-six&lang=es): un café cruza un único lienzo V–H–V–V–H–V, de izquierda a derecha. Después, las seis pantallas muestran la pieza individual de su orientación. El recorrido dura 24 segundos y las individuales 8: ciclo común de 32 segundos, 25 fps, sin audio. Producto, marca, mensaje, colores y duración son editables. La ilustración de café es una muestra propia sustituible; no se generó imagen IA nueva.

EN: Editable [Creator test](https://admira.studio/en/creador/?demo=starbucks-six&lang=en): one cup crosses a single P–L–P–P–L–P canvas, left to right. Then all six screens show their individual orientation version. The journey lasts 24 seconds and individual items 8: a common 32-second cycle, 25 fps, no audio. Product, brand, copy, colours and durations are editable. The authored coffee illustration is a replaceable sample; no new AI image generation was used.

## Tutorial ES

1. Abre **Ejemplo · Starbucks seis pantallas** desde Creador; usa un borrador separado del Creador habitual. Adaptador conserva su acceso a Creador y los flujos de imágenes/vídeos existentes.
2. En **Editar contenido**, sustituye producto y logotipo, escribe mensaje y CTA y ajusta las dos duraciones. Pulsa **Listo · revisar composición** para cerrar Opciones y revisar sin que el panel tape los controles. **Recorrido animado** produce movimiento; las otras tres propuestas anteriores siguen siendo composiciones fijas.
3. Revisa **Mural · 6 pantallas V–H–V–V–H–V**, **Individual · Horizontal** y **Individual · Vertical**. Pulsa **Ver recorrido**, pausa o mueve **Momento** para comprobar cada unión. Las juntas recortan intencionadamente el producto móvil. Los textos conservan su espacio seguro; las piezas individuales usan el layout adaptativo anterior.
4. **Ajustar instalación** permite editar posiciones y tamaños. El mapa nominal es 8160×1920: cuatro ventanas 1080×1920 y dos 1920×1080, horizontales centradas en altura. La foto acredita el orden; no determina milímetros, separaciones físicas ni calibración anamórfica. Para movimiento, los paneles deben compartir una franja vertical, estar sin girar y tener dimensiones pares.
5. Aprueba las tres piezas. Cambiar contenido o mapa invalida las aprobaciones. **Preparar MP4 por pantalla** usa la cola FFmpeg existente: seis recortes de la misma trayectoria y dos archivos individuales. El ZIP PNG conserva un fotograma, no la animación.
6. Cuando terminen los ocho trabajos, **Descargar playlist mixta** entrega ZIP con MP4, campaña portable y `playlist-mixta.json`: dos entradas por screen, recorrido y pieza individual del formato correcto. Los cuatro verticales comparten el archivo individual vertical; los dos horizontales comparten el horizontal. **Publicar MP4 en Stock** sigue siendo una acción posterior explícita.
7. Para probar sin codificar, descarga el [paquete de ejemplo](https://admira.studio/assets/demos/starbucks-six/starbucks-six-playlist-mixta.zip) o el [programa](https://admira.studio/assets/demos/starbucks-six/playlist-mixta.json). Los ocho MP4 han sido codificados/probados: H.264, 25 fps, 600 o 200 fotogramas, dimensiones nativas, sin audio.

## English tutorial

1. Open **Example · Starbucks six screens**. Its draft is separate from the regular Creator draft. Adapter retains its Creator link and existing image/video workflows.
2. **Edit content** changes product, logo, copy, colours and both durations. Click **Done · review composition** to close Options before reviewing/exporting. **Animated journey** moves the product; the original three proposals remain still compositions.
3. Review the six-screen wall, Landscape and Portrait. **Play journey**, pause and **Time** inspect the joins. The moving product intentionally crosses joints; text retains safe placement. Individual items use the existing adaptive layout.
4. **Adjust installation** edits dimensions and positions. The nominal 8160×1920 map uses four 1080×1920 portrait windows and two centered 1920×1080 landscape windows. The photograph confirms order, not measured gaps, physical scale or anamorphic calibration. Moving panels need a shared vertical band, no rotation and even output dimensions.
5. Approve all three pieces. Edits invalidate approvals. **Prepare per-screen MP4** uses the existing FFmpeg queue: six cuts of one path and two individual files. PNG ZIP is a still frame, not animation.
6. Once eight jobs finish, **Download mixed playlist** delivers movies, portable campaign and `playlist-mixta.json`: two slots per screen, a wall segment then its individual orientation item. Four portraits share one individual portrait movie, two landscapes share one landscape movie. **Publish MP4 to Stock** remains a separate explicit action.
7. [Example package](https://admira.studio/assets/demos/starbucks-six/starbucks-six-playlist-mixta.zip) and [program](https://admira.studio/assets/demos/starbucks-six/playlist-mixta.json) are available without encoding. Eight example MP4s were encoded/probed: H.264, 25 fps, 600/200 frames, native dimensions, no audio.

## Contrato / Contract

- Campaign: `pixeria.installation-campaign.v1`, direction `travel`, optional `unitSeconds`, installation `phase: mural|unit`. Existing identities, saved campaigns, other directions and cloud history remain valid.
- Program: `admira.mixed-screen-program.v1`; each screen has native format and ordered items with `kind`, `seconds`, `file` and published example `url`. All six have identical slot lengths; clock: `https://brain.digitalavatar.ai/sync/state`. It is not a rectangular 2×3 tile grid.
- Sources: `adaptaciones/campaign-travel.mjs`, `campaign-core.mjs`, `campaign-render.mjs`, `campaign-studio.mjs`; seed `adaptaciones/campanas/starbucks-six.json`; delivery `assets/demos/starbucks-six/`.
- Real MCP `campana_instalacion {demo:"starbucks-six"}` at `https://mcp-pixeria.admira.store/mcp`: read-only campaign, layout, eight export plans and six mixed programs; no rendering, spending, publication or hardware launch. CLI `open creator` and the existing `/creador` / `/creator` open the Creator; choose the Starbucks example there.

| Orden / Order | Screen | Formato / Format |
|---|---|---|
| 1 | macstudio-starbucks-vertical | 1080×1920 |
| 2 | macstudio-starbucks-horizontal | 1920×1080 |
| 3 | macstudio-starbucks-vertical-right | 1080×1920 |
| 4 | macmini-starbucks-vertical | 1080×1920 |
| 5 | macmini-starbucks-horizontal | 1920×1080 |
| 6 | macmini-starbucks-vertical-right | 1080×1920 |

ES: Los players permanecen parados por petición de Carlos. Preparación/exportación no implica reproducción física; la aceptación con las seis pantallas y la calibración de separaciones queda para la siguiente prueba autorizada.

EN: Players remain stopped at Carlos’s request. Preparation/export does not imply physical playback; six-panel acceptance and gap calibration remain for the next authorized test.

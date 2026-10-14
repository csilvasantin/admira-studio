# Creator · idiomas a crear / Languages to create

ES: **Idiomas a crear** muestra casillas **Castellano** e **Inglés**. Pueden seleccionarse juntas. Una creación nueva marca el idioma de la interfaz: castellano en ESP e inglés en ENG. Añadir otro idioma conserva el primero y prepara otra versión de sus textos. Cambiar los menús no reescribe campañas guardadas.

EN: **Languages to create** offers **Spanish** and **English** checkboxes that may both be checked. New campaigns select the interface language: Spanish on ESP, English on ENG. Adding another language retains the first and prepares a separate copy version. Changing UI language never rewrites saved campaigns.

## Tutorial ES

1. Abre Creador. El idioma de los menús ya está marcado. Marca también el otro idioma para crear ambos.
2. Con ambos marcados, **Idioma que estás revisando** cambia la versión del editor y sus vistas previas; mantiene ambas casillas. Edita titular y CTA de cada idioma. Fotos, logo, colores, mapas, tiempos y animaciones siguen compartidos.
3. Starbucks contiene las dos copias: «Tu café sigue contigo.» / «Your coffee goes with you.» y «Disfruta el momento.» / «Enjoy the moment.». Textos propios sin traducción guardada abren un borrador para completar; no se exporta castellano como si fuera inglés.
4. Revisa y aprueba cada pieza en cada idioma. Cambiar sólo la versión que estás mirando conserva las aprobaciones de la otra; editar contenido o idiomas a crear exige revisar de nuevo.
5. **Preparar MP4**, PNG y publicación preparan todos los idiomas marcados. Starbucks: ocho archivos por idioma, dieciséis con ambos. El ZIP mixto incluye `playlist-mixta-es.json`, `playlist-mixta-en.json`, `programs.json` y el contrato común. Un idioma conserva `playlist-mixta.json` para compatibilidad.
6. Guardar/abrir JSON, historial y versiones privadas conservan los idiomas seleccionados, la versión activa y las dos copias. Desmarcar un idioma lo excluye de la próxima exportación y conserva sus textos. Los contratos antiguos sin selección conservan su idioma activo, o castellano si tampoco lo declaran.
7. Demo local y Creador completo usan las mismas casillas. Full genera una imagen/vídeo base sin letras y reutiliza ese material para los idiomas seleccionados; cambiar idiomas no solicita nueva IA. Las exportaciones animadas full preparan cada versión y evitan nombres repetidos.
8. Los nombres ingleses incluyen `-en-`. Los vídeos Starbucks siguen sin audio. Elegir idiomas y exportar no arranca pantallas físicas.

## English tutorial

1. Open Creator: the UI language is already checked. Check the other language to create both.
2. **Language under review** changes the editor and previews without unchecking either target. Edit each language’s headline and CTA. Artwork, logo, colours, timing, maps and animation remain shared.
3. Starbucks includes “Your coffee goes with you.” / “Enjoy the moment.” and its Spanish originals. Custom copy with no saved translation needs a completed draft; untranslated copy is never exported under a false language label.
4. Review and approve every destination in each language. Preview switching retains the other language’s approvals; copy or selection edits require renewed review.
5. PNG, **Prepare MP4** and publication cover all checked languages. Starbucks creates eight outputs per language, sixteen for both. Bilingual ZIPs include `playlist-mixta-es.json`, `playlist-mixta-en.json`, `programs.json` and a shared campaign. Single-language packages retain `playlist-mixta.json`.
6. JSON, history and private cloud versions retain selection, active language and both copies. Unchecking excludes a language from the next export but retains its copy. Legacy contracts retain their active language, falling back to Spanish only when absent.
7. Local demo and full Creator offer the same checkboxes. Full reuses the generated text-free image/video for both copy versions; language selection does not trigger new AI generation. Animated exports and filenames preserve each language separately.
8. Starbucks keeps silent video and existing artwork. Native screen startup is a separate explicit action.

## Campaign and proof / Campaña y prueba

- [Editar ambos / Edit both](https://admira.studio/creador/?demo=starbucks-six&content=es&contents=es,en).
- [Ver inglés / Watch English](https://admira.studio/campanas/starbucks-six/?content=en).
- [Paquete inglés / English delivery](https://admira.studio/assets/demos/starbucks-six/en/starbucks-six-en-playlist-mixta.zip?content=en-r3).
- [Versión castellana conservada / Retained Spanish](https://admira.studio/campanas/starbucks-six/?content=es).
- [Prueba de galería inglesa / English gallery proof](https://admira.studio/assets/demos/starbucks-six/en/browser-proof.json).

ES/EN: El ciclo físico permanece 24s de mural y 8s individual, seis pantallas V-H-V-V-H-V, 25fps y sin audio / The physical cycle retains six native screens, a shared 24+8 seconds, 25fps and no audio. The browser proof certifies the gallery; physical playback has a separate dated hardware proof.

## MCP, CLI and schema

`campana_instalacion({demo:"starbucks-six",ui_language:"en",content_languages:["es","en"]})` devuelve las dos versiones, dieciséis planes y dos programas de seis pantallas / returns both copies, sixteen native plans and two six-screen programs. `content_language` is the active review version; `content_languages` is the export selection. New requests default to `ui_language`, or `es` when omitted. Imported campaigns keep saved choices unless explicitly changed. The actual tool remains read-only: no render, AI spend, publication or hardware startup. Custom missing translations return `campaign-translation-required`.

CLI: `/creador`, `/creator`, `open creator` → **Idiomas a crear / Languages to create**. Existing demo commands retained; no new CLI verb.

Additive fields under `pixeria.installation-campaign.v1`: `contentLanguages: [es|en]` (one or both, unique), `contentLanguage` (active, included in selection), `copyByLanguage` (headline/CTA/price and optional translationDraft per language). Active authored copy remains authoritative. Creation/review UI is in `adaptaciones/campaign-language.mjs`; the actual MCP at `https://mcp-pixeria.admira.store/mcp` mirrors its validation and provides `languagePlans` for every selected language. Cloud/history retain these fields without replacing IDs or older versions.

## Estado físico fechado / Dated physical state · 14-oct-2026

ES: Inglés asignado a las seis fuentes de tema y por defecto. Arranque nativo y ambas fases observados en seis pantallas; medición parcial 25.4s, reloj máximo59ms. Esc desde Mac Mini cerró ambos grupos a07:59 y Carlos ordenó mantenerlos parados. No se da por completada la comprobación continua32s; no se han vuelto a arrancar. Protección contra inactividad instalada y bloqueo manual conservado.

EN: English assigned to all six theme/default sources. Both phases observed natively on six screens over a partial 25.4s sample, maximum clock spread59ms. Escape on Mac Mini closed both groups at07:59; Carlos instructed to keep them stopped. Uninterrupted32s verification did not complete; no restart followed. Idle protection is installed and manual lock remains available.

Proof: https://admira.studio/assets/demos/starbucks-six/en/hardware-attempt-r3.json

ES: Por la indicación de Carlos de bloquear sólo bajo orden, Mac Studio tiene además `tv.admira.signage.mac.idle-awake`: una protección permanente contra apagado/reposo por inactividad, incluso con los players parados. Es un LaunchAgent de usuario con `caffeinate -di`; no cambia la contraseña, la autenticación, ni el bloqueo/reposo manual. El ajuste de energía displaysleep10 permanece sin modificar; su temporizador se inhibe por esta protección. Configuración publicada en `scripts/tv.admira.signage.mac.idle-awake.plist`.

EN: Carlos requested locking only on explicit command. Mac Studio additionally runs a persistent user `idle-awake` LaunchAgent that inhibits idle display/system sleep even while the players are stopped. It retains authentication and manual lock/sleep. The display timeout preference remains10min; its idle action is inhibited by the assertion. The published plist documents the installed configuration.

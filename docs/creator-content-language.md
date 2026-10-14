# Creator · idioma del contenido / Content language

ES: **Idioma del contenido** permite escoger **Castellano** (por defecto) o **Inglés** en Creador, Demo Creador y Creador completo. Cambia el idioma de titular, CTA y textos de las piezas; conserva producto, logo, fotos, colores, mapas, tiempos y movimiento. Los menús conservan su idioma. `lang` elige la interfaz; `content` elige el contenido.

EN: **Content language** selects **Spanish** (default) or **English** in Creator, Creator demo and full Creator. It controls the authored copy in previews, videos and adaptations while retaining artwork, brand, colours, maps, timing and motion. Interface language remains independent: `lang` selects the UI; `content` selects content.

## Tutorial ES

1. Abre Creador y elige **Idioma del contenido** antes de escribir el anuncio o abrir una demo. Un Creador nuevo empieza en castellano incluso si los menús están en inglés.
2. Las campañas preparadas guardan las dos versiones. Starbucks usa «Tu café sigue contigo.» / «Your coffee goes with you.» y «Disfruta el momento.» / «Enjoy the moment.».
3. Puedes editar cada versión y volver a la otra sin perder los cambios. En campañas propias sin variante traducida, Creador conserva el original y abre un borrador del idioma elegido: completa el titular y CTA en **Editar contenido**. No declara que el texto castellano sea una traducción inglesa. Las demos con textos personalizados requieren escoger el idioma antes de personalizarlos.
4. Al cambiar idioma, se anulan las aprobaciones y exportaciones pendientes de esa versión. Revisa el mural y los dos formatos, aprueba y exporta. Las piezas se componen y ajustan de nuevo con sus textos reales; no se recorta una imagen que lleva textos del otro idioma.
5. Guardar/abrir JSON, historial y versiones privadas conservan `contentLanguage`, `copyByLanguage` y la copia activa. Los contratos antiguos siguen siendo válidos; sin idioma explícito usan castellano. Los borradores sin titular quedan bloqueados para exportar.
6. PNG, MP4, ZIP y metadatos conservan idioma; los nombres ingleses incluyen `-en-` para no sustituir los archivos castellanos. Esto cambia textos: los vídeos Starbucks siguen sin audio.

## English tutorial

1. Choose **Content language** before writing an ad or starting a demo. New campaigns default to Spanish even on the English interface.
2. Prepared campaigns carry both copy versions. Starbucks uses “Your coffee goes with you.” and “Enjoy the moment.” in English.
3. Edit either language and return without losing its changes. For custom copy without a saved translation, the workshop retains the original and opens a draft: enter the selected-language headline and CTA under **Edit content**. It never presents unchanged Spanish as translated English. In demos, choose language before customizing copy.
4. Changing language invalidates reviews and pending exports. Review/approve every destination again. Copy is re-typeset to each native composition rather than cropping a finished ad in the other language.
5. Portable JSON, history and private cloud versions retain active copy and both variants. Legacy contracts default to Spanish and retain their original copy. Incomplete drafts cannot export.
6. English media filenames include `-en-`; language is retained in packages and Stock tags. Starbucks videos remain silent: this feature chooses text language.

## Starbucks aplicado / Applied Starbucks campaign

- [Creador inglés / English content in Creator](https://admira.studio/creador/?demo=starbucks-six&content=en).
- [Ver los ocho vídeos ingleses / Watch eight English movies](https://admira.studio/campanas/starbucks-six/?content=en).
- [Descargar paquete inglés / English package](https://admira.studio/assets/demos/starbucks-six/en/starbucks-six-en-playlist-mixta.zip?content=en-r3).
- [Contrato inglés / English contract](https://admira.studio/adaptaciones/campanas/starbucks-six-en.json).
- [Programa inglés / English program](https://admira.studio/assets/demos/starbucks-six/en/playlist-mixta.json).
- [Versión castellana conservada / Spanish version retained](https://admira.studio/campanas/starbucks-six/?content=es).

ES/EN: Ocho MP4 ingleses: seis recortes de mural24s y adaptaciones horizontal/vertical8s, 25fps, H264, sin audio; orden V–H–V–V–H–V y ciclo32s conservados / Eight English native movies retain the shared 24+8-second cycle and screen order. English physical playback is verified separately; the prior Spanish hardware proof does not certify English playback.

## MCP / CLI / Contrato

`campana_instalacion({demo:"starbucks-six",content_language:"en"})` devuelve textos ingleses, ocho planes nativos y seis programas de dos entradas; no genera, renderiza, publica ni arranca hardware / returns actual English copy and native plans without generation, rendering, publication or hardware startup. `content_language:"es"` is the default for a new demo. Imported campaigns retain their selected language when this argument is omitted. Custom copy without a stored target variant returns `campaign-translation-required`: complete it in the web workshop.

CLI: `/creador`, `/creator`, `open creator` → **Idioma del contenido / Content language**. Demos keep their existing commands and have the same selector. No new CLI verb. No provider generation is triggered by language selection.

Schema remains `pixeria.installation-campaign.v1`; additive fields `contentLanguage: es|en`, `copyByLanguage:{es?:{headline,cta,price},en?:{headline,cta,price}}`, `translationDraft?:boolean`. Active authored copy is authoritative. Language change preserves campaign ID and increments revision. Source: `adaptaciones/campaign-language.mjs`; actual MCP at `https://mcp-pixeria.admira.store/mcp` mirrors the same validator and selection rules.

## Comprobación pública / Public verification

ES: Creator comprobado en ambas interfaces: castellano por defecto, selección inglesa, conservación de ediciones y recuperación del historial. Los ocho MP4 y el ZIP publicados coinciden por SHA256 con la entrega; sus dimensiones, 25fps, 24/8s y ausencia de audio se comprobaron con ffprobe. El mural inglés completó las dos fases en navegador público: 35 muestras, seis vídeos decodificados, desfase máximo 37ms. Esto verifica la galería; la reproducción física inglesa conserva `hardwareVerified:false`. Prueba / proof: https://admira.studio/assets/demos/starbucks-six/en/browser-proof.json. Stock accepts twelve tags; the English language tag is included within that limit, together with campaign, brand, style and orientation tags. Original photography provenance remains in the contract/comment.

EN: Public Creator checks cover both UI languages, Spanish default, English selection, retained edits and restored history. All eight public MP4s and the ZIP match the delivery hashes. Native resolution, 25fps, 24/8s and no audio were verified with ffprobe. The English public gallery completed both phases over 35 samples with six decoded videos and a maximum 37ms clock spread. This is browser playback; English physical playback remains unverified. Stock language tags fit its twelve-tag limit.

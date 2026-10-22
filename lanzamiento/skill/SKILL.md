---
name: lanzamiento
description: Convierte una campaña del Stock de admira.studio en un vídeo de lanzamiento (piezas reales, voz de Admirito con subtítulos, música de la casa). Úsala cuando pidan un vídeo de lanzamiento, un teaser de campaña o «lo del vídeo de un prompt» para un local o una campaña del Stock.
---

# Lanzamiento · admira.studio

admira.studio **crea y adapta**; admira.store **distribuye y reproduce**. Esta skill produce el vídeo; emitirlo es otra orden, en admira.store, y la da el humano.

## Cuándo usarla

- Piden un vídeo de lanzamiento o un teaser para un local, una campaña o un cliente que ya tiene piezas en el Stock (`https://stock.admira.store/stock/index.json`, etiquetas `campaign:…`, `installation:…`, `screen:…`, `content-language:…`).
- Piden rehacer una pieza existente con otro texto, otro idioma o otra música.

No la uses para piezas sin material en el Stock: primero hay que crear o subir las piezas.

## Dónde está la herramienta

`lanzamiento/` en el repo `admira-studio` (Node + proyecto de vídeo). Instalar una vez con `npm install` dentro de esa carpeta. Lee antes `lanzamiento/README.md` y, si vas a tocar `src/`, las skills de `lanzamiento/.agents/skills/` (reglas de animación: todo se anima con el fotograma actual, nunca con transiciones CSS).

## Orden de trabajo (cada paso se puede repetir solo)

1. **Brief.** Pide al humano la campaña o instalación (etiquetas del Stock) y el idioma; no inventes nada. Ejecuta `npm run brief -- --campana <id> [--instalacion <id>] [--idioma es|en]`: resuelve y baja las piezas y deja `trabajo/<nombre>/brief.json`. Enseña al humano cliente, local, pantallas, idiomas, piezas elegidas y avisos.
2. **Guion.** `npm run guion -- <nombre> --idioma es` (y `en` si procede) → `trabajo/<nombre>/guion.<idioma>.json`, validado. Si el humano quiere cambiar un texto, cámbialo en ese JSON (o en `scripts/lib/plantilla.mjs` si es para siempre), nunca en el vídeo a mano. Quién habla: `neo` = la máquina (naranja), `off` = voz en off (blanco).
3. **Piezas.** Ya están en `public/stock/` tras el brief; si falta alguna, el brief lo avisa.
4. **Voz.** `npm run voz -- <nombre> --idioma es` (y `en`): Admirito con tiempos por palabra; deja `trabajo/<nombre>/lanzamiento.<idioma>.json`. Los tiempos de las escenas salen de la voz real: no los escribas a mano.
5. **Montar y revisar.** `npm run montar -- <nombre> --idioma es` deja `props/<nombre>.es.json` e imprime el plan de escenas. `npm run revisar -- <nombre> --idioma es` para si falta un fichero, la duración se sale, una voz está baja o hay una palabra prohibida, y deja la hoja `trabajo/<nombre>/revision.es.png`: mírala (textos, pósters, subtítulos) antes de seguir. Si algo no te convence, cambia el JSON del guion y repite desde `voz`.
6. **Render.** `npm run render -- <nombre> --idioma es` saca el 16:9 y el 9:16 (`salida/<nombre>.<idioma>.mp4` y `.vertical.mp4`) y los comprueba solo (duración, tamaño, pistas, nivel de audio, silencios); para si algo falla. Antes, mira también la hoja vertical: `npm run revisar -- <nombre> --idioma es --vertical`.
7. **Entregar y publicar.** Manda los mp4 y las hojas al humano y enseña la prueba en seco: `npm run publicar -- <nombre> --idioma es` (no sube nada; muestra título, etiquetas, póster y tamaño de cada pieza). **Solo cuando el humano diga que sí**, repite con `--si` (y `--handon <HANDON del día>` para dejar la línea anotada). Cada versión, 16:9 y vertical, es una pieza aparte del Stock. Emitir en pantallas sigue siendo otra orden, en admira.store, que también pide su sí.

## Palabras prohibidas en pantalla y en voz

`Claude`, `Codex`, `Remotion`, nombres de modelos y de conectores. Antes de renderizar: `grep -i -E 'claude|codex|remotion' src/escenas.tsx src/voz.json scripts/voz.mjs` debe devolver nada (salvo rutas de ficheros). El asistente que aparece en pantalla es admira.studio; la emisión, admira.store; la voz, Admirito.

## Qué no hacer

- Inventar piezas, cifras o nombres de clientes.
- Tocar producción web (admira.studio se publica con `deploy.sh`, que deja `lanzamiento/` fuera).
- Subir al Stock, borrar del Stock o emitir en pantallas sin el sí expreso del humano.
- Dejar vídeos pesados en el repo: `public/stock/`, `out/` y `node_modules/` no se versionan.

## Entrega mínima

mp4 final · hoja de fotogramas · lista de piezas usadas (ids) · duración y nivel de audio medidos · si se subió, número de pieza y etiquetas.

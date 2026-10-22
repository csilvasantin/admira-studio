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

1. **Brief.** Anota: local o campaña (etiquetas del Stock), idioma(s), duración orientativa, plantilla («Un prompt. Una tienda.» es la única hoy), piezas concretas si el humano las nombra. Si falta el local o la campaña, pregunta; no inventes.
2. **Piezas.** Resuelve los ids en el índice del Stock y bájalos a `public/stock/<id>.mp4|.poster.jpg`. Lista en el informe cada id y su título.
3. **Guion.** Escribe las líneas en `scripts/voz.mjs` (o en el JSON de guion cuando exista): quién habla (`neo` = la máquina, en naranja; `off` = voz en off, en blanco), texto corto, verbos en presente. Comprueba las palabras prohibidas (abajo).
4. **Voz.** `node scripts/voz.mjs` → `public/voz/*.mp3` y `lineas.json`; copia `lineas.json` a `src/voz.json`. Los tiempos de las escenas salen de la voz real: no los escribas a mano.
5. **Montar y revisar.** Renderiza fotogramas clave (`npx remotion render <composición> out/frames --frames=… --image-format=png`), júntalos en una hoja (`ffmpeg … tile=3x3`) y mírala: textos, pósters, subtítulos. Comprueba el audio del render final con `ffmpeg -af volumedetect` (media por encima de −30 dB) y que no hay silencios largos.
6. **Render.** `npx remotion render <composición> out/lanzamiento.mp4 --codec h264`. Verifica con `ffprobe` duración, tamaño y pistas.
7. **Entregar.** Manda el mp4 y la hoja de revisión al humano. **No subas al Stock ni emitas sin su sí.** Con el sí: subida por partes + alta (`/stock/upload/init` → `/stock/upload/part?n=` → `/stock/upload/complete` → `/stock/publish` con `r2Staged`, título, etiquetas y póster). Anota el número de pieza en el HANDON.

## Palabras prohibidas en pantalla y en voz

`Claude`, `Codex`, `Remotion`, nombres de modelos y de conectores. Antes de renderizar: `grep -i -E 'claude|codex|remotion' src/escenas.tsx src/voz.json scripts/voz.mjs` debe devolver nada (salvo rutas de ficheros). El asistente que aparece en pantalla es admira.studio; la emisión, admira.store; la voz, Admirito.

## Qué no hacer

- Inventar piezas, cifras o nombres de clientes.
- Tocar producción web (admira.studio se publica con `deploy.sh`, que deja `lanzamiento/` fuera).
- Subir al Stock, borrar del Stock o emitir en pantallas sin el sí expreso del humano.
- Dejar vídeos pesados en el repo: `public/stock/`, `out/` y `node_modules/` no se versionan.

## Entrega mínima

mp4 final · hoja de fotogramas · lista de piezas usadas (ids) · duración y nivel de audio medidos · si se subió, número de pieza y etiquetas.

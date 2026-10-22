---
name: lanzamiento
description: Convierte una campaña del Stock de admira.studio en un vídeo de lanzamiento (piezas reales, voz de Admirito con subtítulos, música de la casa), en español e inglés, 16:9 y vertical 9:16, y lo publica en el Stock solo con el sí del humano. Úsala cuando pidan un vídeo de lanzamiento, un teaser de campaña o «lo del vídeo de un prompt» para un local o una campaña del Stock.
---

# Lanzamiento · admira.studio

admira.studio **crea y adapta**; admira.store **distribuye y reproduce**. Esta skill produce el vídeo y, con permiso, lo deja en el Stock. Emitirlo en las pantallas es otra orden, en admira.store, y la da el humano.

## Cuándo usarla

- Piden un vídeo de lanzamiento o un teaser para un local, una campaña o un cliente con piezas en el Stock (`https://stock.admira.store/stock/index.json`; etiquetas `campaign:…`, `installation:…`, `screen:…`, `content-language:…`).
- Piden rehacerlo con otro texto, otro idioma, otra música u otra versión (`--version v2`).

No vale para piezas sin material en el Stock: primero hay que crear o subir las piezas.

## Dónde está la herramienta

`lanzamiento/` en el repo `admira-studio` (Node + proyecto de vídeo). Una vez: `cd lanzamiento && npm install`. Lee `lanzamiento/README.md`. Si vas a tocar `src/`, lee antes `lanzamiento/.agents/skills/` (se anima solo con el fotograma actual; nunca transiciones CSS) y comprueba que la v2 sigue idéntica (fotogramas de referencia, md5).

## Las siete órdenes, en este orden (cada una se repite sola)

| Orden | Qué hace | Deja |
|---|---|---|
| `npm run brief -- --campana <id> [--instalacion <id>] [--idioma es\|en]` | Resuelve las piezas por etiquetas (campaña con variantes, instalación principal, pantallas reales, idiomas, piezas por idioma) y las baja | `trabajo/<nombre>/brief.json`, `public/stock/` |
| `npm run guion -- <nombre> --idioma es` | Guion desde la plantilla «Un prompt. Una tienda.» (es/en), validado | `trabajo/<nombre>/guion.<idioma>.json` |
| `npm run voz -- <nombre> --idioma es` | Admirito con tiempos por palabra | `public/voz/<nombre>/<idioma>/`, `trabajo/<nombre>/lanzamiento.<idioma>.json` |
| `npm run montar -- <nombre> --idioma es` | Valida y deja el props; imprime el plan de escenas | `props/<nombre>.<idioma>.json` |
| `npm run revisar -- <nombre> --idioma es [--vertical]` | Para si falta algo, la duración se sale, la voz está baja o hay palabra prohibida; hoja por escena | `trabajo/<nombre>/revision.<idioma>[.vertical].png/json` |
| `npm run render -- <nombre> --idioma es` | mp4 16:9 y 9:16 comprobados (ffprobe, audio, silencios) | `salida/`, `trabajo/<nombre>/render.<idioma>.json` |
| `npm run publicar -- <nombre> --idioma es` | **En seco** por defecto; con `--si`, sube cada versión al Stock con póster y etiquetas | `trabajo/<nombre>/publicacion.<idioma>.json` |

`npm test` prueba la cadena entera sin red (índice de ejemplo, voz falsa, publicación simulada).

## Cómo trabajar con el humano

1. Pide la campaña o instalación y el idioma. Si falta, pregunta; no inventes.
2. Tras el brief, enséñale cliente, local, pantallas, idiomas, piezas elegidas y avisos.
3. Tras `revisar`, mira tú la hoja (textos, pósters, subtítulos) y mándasela.
4. Tras `render`, mándale los mp4 y las medidas (duración, tamaño, nivel de audio).
5. Enseña la prueba en seco de `publicar`. **Solo con su sí** repite con `--si` (y `--handon <HANDON del día>` para dejar la línea anotada).
6. Para emitir en pantallas, pide su sí aparte: se hace desde admira.store, no desde aquí.

## Palabras prohibidas en pantalla y en voz

`Claude`, `Codex`, `Remotion`, nombres de modelos y de conectores. La validación para si aparecen; el asistente en pantalla es admira.studio, la emisión admira.store, la voz Admirito. Pixeria solo si el humano lo pide para esa pieza.

## Qué no hacer

- Inventar piezas, cifras o nombres de clientes.
- Tocar producción web (admira.studio se publica con `deploy.sh`, que deja `lanzamiento/` fuera).
- Subir, borrar o emitir sin el sí expreso.
- Versionar pesados: `public/stock/`, `public/voz/<nombre>/`, `props/*.es|en.json`, `trabajo/`, `salida/`, `out/` no van al repo.

## Protocolo de estreno (primera pieza de verdad en un local)

1. Campaña con piezas en el Stock y pantallas reales (`installation:` conocida).
2. Cadena completa en los idiomas del local; hojas y mp4 vistos por el humano.
3. Publicación en el Stock con su sí (16:9 y vertical, piezas aparte).
4. Emisión: el humano decide pantalla, franja y duración y la programa en admira.store; la skill no emite.
5. Comprobación en el local (foto o vídeo de la pantalla con la pieza) y línea en el HANDON con los números de pieza.

## Entrega mínima

mp4 16:9 y 9:16 · hojas de revisión · piezas usadas (ids) · duración y audio medidos · si se publicó, números de pieza y etiquetas · si se emitió, dónde y cuándo.

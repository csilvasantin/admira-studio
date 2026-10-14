# Búsqueda de Stock / Stock search

## Español

El número visible de la ficha se puede buscar como `1549` o `#1549`. Un hashtag numérico identifica exactamente esa referencia: `#154` no encuentra `#1549`. Puedes combinarla con texto, por ejemplo `#1549 Leonardo`. Los filtros de tipo, formato y permisos siguen aplicándose; para buscar entre todos los medios selecciona Todos los tipos.

Las etiquetas como `#leonardo`, los títulos, prompts y comentarios conservan su búsqueda sin distinguir mayúsculas ni acentos. Un número sin hashtag también puede coincidir con un número completo en esos textos. Buscar no crea etiquetas ni modifica los contenidos.

## English

Search the displayed Stock reference as `1549` or `#1549`. A numeric hashtag matches that exact reference: `#154` does not match `#1549`. Combine it with text, such as `#1549 Leonardo`. Type, format and access filters still apply; select All types to search across media.

Text hashtags, titles, prompts and comments keep their case/accent-insensitive matching. A bare number can also match an exact numeric token in that text. Searching does not create tags or change content.

## Prueba / Test

`node --test test/stock-search-reference.test.mjs`

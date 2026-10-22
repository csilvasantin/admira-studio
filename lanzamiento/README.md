# Lanzamiento · admira.studio

De una campaña del Stock a un vídeo de lanzamiento: piezas reales, voz de Admirito con subtítulos palabra a palabra y la música de la casa. admira.studio crea y adapta; admira.store distribuye y reproduce.

Es una **herramienta**, no una página: `deploy.sh` la deja fuera de la publicación web. Se usa desde la terminal o desde la skill `lanzamiento` (`skill/SKILL.md`).

## Qué hay hoy (paso 1 del plan, 22-oct-2026)

- `src/`: la composición «Un prompt. Una tienda.» (demo v2, Stock #1817) tal como se montó a mano: `guion.ts` (escenas y tiempos a partir de la voz real), `piezas.tsx` (subtítulos, pantallas, vídeo del Stock), `escenas.tsx`, `Composition.tsx`.
- `scripts/voz.mjs`: voz de Admirito con marcas de tiempo por palabra → `public/voz/*.mp3` + `lineas.json`.
- `public/musica/campanas.mp4`: música «Tic-tac y campanas» de las intros.
- `.agents/skills/`: las skills oficiales de Remotion para los agentes (leerlas antes de tocar `src/`).

Las piezas del Stock (`public/stock/`) no se versionan: se bajan por id (`https://stock.admira.store/stock/<id>/asset.mp4` y `poster.jpg`).

## Paso 2 · los datos mandan (22-oct-2026)

Todo lo que se ve u oye sale de `props/un-prompt-una-tienda.json`, validado por `src/props.ts` (esquema zod): nombre, marca (quién crea y quién emite), local, título, prompt, piezas del Stock, rótulos, pasos del tutorial, cierre, música, volumen de la voz, líneas con sus palabras y tiempos, y la lista de escenas. La duración de cada escena sale de la voz real (`src/guion.ts`, `planificar`). La validación para si aparece una palabra prohibida en pantalla o en voz. Comprobado: la v2 se regenera idéntica desde el JSON (diez fotogramas iguales byte a byte).

Para otra campaña: copia el JSON, cambia textos y piezas, regenera la voz y renderiza.

## Uso

```bash
npm install
node scripts/voz.mjs                 # regenera la voz y los tiempos
# pega public/voz/lineas.json en "lineas" del props.json (en el paso 4 lo hará el script)
npx remotion render UnPromptUnaTienda out/frames --frames=60,240,420 --image-format=png   # revisión por fotogramas
npx remotion render UnPromptUnaTienda out/lanzamiento.mp4 --codec h264
npm test                             # esquema, palabras prohibidas y plan de escenas
```

Subir al Stock: `node ../tools/… ` → ver la skill; nunca sin el sí del humano.

## Plan

Siete pasos (uno por PR): sitio y nombre · plantilla parametrizada · `brief` + `guion` · `voz` + `montar` + `revisar` · `render` + vertical · `publicar` · pruebas y skill final. Detalle en `~/Documents/Neo/entregas/2026-10-22-video-lanzamiento/plan-nivel-c.md` (Neo, MacStudio).

## Reglas

- En pantalla y en la voz no aparecen Claude, Codex ni Remotion.
- Nada inventado: cada pieza viene del Stock con su id.
- Publicar y emitir piden el sí expreso de Carlos.

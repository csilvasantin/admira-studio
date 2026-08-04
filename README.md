# Admira Studio

Admira Studio is a static website for `admira.studio`, positioned as a global reference for AI content creation.

## ⚠️ Esto es un ESPEJO GENERADO de Pixeria — no se edita a mano

Este repo **no se toca a mano**. Se regenera desde `../pixeria` con:

```bash
./sync.sh            # simula y enseña qué cambiaría
./sync.sh --aplicar  # lo escribe, sella y firma
```

Lo único que diferencia a admira.studio de pixeria.com está declarado en **`marca.json`**.
Si quieres cambiar algo del sitio, se cambia en Pixeria o en `marca.json`; cualquier edición
directa de un HTML/CSS/JS de aquí la pisa la siguiente regeneración.

**Por qué.** Se medieron los 119 ficheros comunes el 4-ago-2026: **59 eran sustitución de marca
pura, 17 tenían deriva y 0 eran divergencia de diseño deliberada**. El CSS es idéntico hasta la
variable. La réplica se venía haciendo a mano commit a commit y falló dos veces (17-jun y
17-jul): el 4-ago el clon llevaba 14 commits de retraso y su menú enseñaba **«Concepto Pixeria»**
y **«Pixeria · sistema creativo»** a los visitantes de admira.studio. Un espejo copiado a mano
deriva siempre; este se genera.

**Lo que el sync NUNCA copia** (está en `marca.json`): `CNAME`, `deploy.sh` y `.github/` —
la configuración de despliegue no se hereda; ese fue exactamente el fallo que tuvo cargado este
repo del 17-jul al 3-ago, con el `deploy.sh` de Pixeria publicando admira.studio **encima de
pixeria.com**. Tampoco `functions/`: son Cloudflare Pages Functions y esto lo sirve GitHub Pages.

**Lo que el sync nunca borra:** `god/`, que solo existe aquí.

**Mejoras recientes (junio 2026):**
- Nuevo hero cinematografico optimizado (242 KB vs 1.8 MB anterior)
- Navegacion movil completa (hamburger + overlay)
- Seccion "Modelos destacados" con recomendaciones concretas y editables
- Nueva seccion /labs/ como hub editorial de herramientas en produccion (Lanetro, Pixer Feed, Stream Deck Bridge).
- "Labs" en lugar de "Tool" + barra superior Admira Studio oscura en /tool/ para que se sienta parte del sitio (el puente Lanetro/Yarig sigue intacto)
- Conexion real: Pixer Feed (el pipeline que empuja contenido IA a pantallas y directo en eventos Admira/Xtanco). Mencion en hero panel, intro, Admira Studio Index y radar note.
- Micro-interacciones, hovers, active states en nav, focus visible
- JSON-LD, copy refinements, CTAs de newsletter, footer actualizado
- Mantiene diseno editorial oscuro premium, cero dependencias externas

## Local preview

Open `index.html` directly or serve the folder:

```bash
python3 -m http.server 9134
```

## Deploy

GitHub Pages deploys from `.github/workflows/pages.yml` on every push to `main`.

Para actualizar el radar de modelos edita directamente el bloque `.radar-live` en `index.html`.

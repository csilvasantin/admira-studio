#!/usr/bin/env bash
# ============================================================================
# Publica admira.studio en CLOUDFLARE PAGES (proyecto 'admira-studio').
#
# ── POR QUÉ ESTE SCRIPT DESCONFÍA TANTO ────────────────────────────────────
# Del 17-jul al 3-ago-2026 aquí vivió, línea por línea, el deploy.sh de PIXERIA:
# se copió al clonar el gemelo y nadie volvió a mirarlo. Su última orden era
#
#     wrangler pages deploy "$TMP" --project-name pixeria --branch main
#
# o sea que quien entrara aquí y ejecutara ./deploy.sh creyendo que publicaba su
# gemelo, publicaba admira.studio ENCIMA de pixeria.com, que es producción. No
# llegó a fallar porque nadie lo ejecutó. Por eso el nombre del proyecto se
# comprueba abajo antes de subir nada, y por eso `deploy.sh` está en la lista de
# `excluidos` de marca.json: el CÓMO SE PUBLICA no se hereda jamás del origen.
#
# ── HISTORIA DEL HOSTING ───────────────────────────────────────────────────
# Hasta el 5-ago-2026 lo servía GitHub Pages y el despliegue era `git push`.
# Se movió a Cloudflare Pages porque /tiktok y /presentaciones dependen de
# Pages Functions, que en GitHub Pages no se ejecutan: llevaban muertas desde
# el 17 de julio. El CNAME de www lo cambió Carlos en GoDaddy (la zona sigue
# ahí, es el único dominio del ecosistema fuera de Cloudflare).
#
# ── USO ────────────────────────────────────────────────────────────────────
#     ./sync.sh --aplicar     # regenera el espejo desde Pixeria, sella y firma
#     ./deploy.sh             # publica lo commiteado
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

PROYECTO="admira-studio"
[ "$PROYECTO" = "admira-studio" ] || { echo "✖ este script solo publica en admira-studio"; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "✖ hay cambios sin commitear. Se publica lo commiteado, no el escritorio:"
  git status --short | sed 's/^/    /'
  exit 1
fi

echo "→ GitHub (push de código, backup)…"
git push origin main 2>&1 | tail -1 || echo "  (nada que pushear)"

echo "→ Cloudflare Pages ($PROYECTO)…"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"
# Fuera lo que es herramienta del espejo, no activo web.
rm -rf "$TMP/sync.sh" "$TMP/marca.json" "$TMP/deploy.sh" "$TMP/.fuente" "$TMP/README.md"

npx --yes wrangler@latest pages deploy "$TMP" \
  --project-name="$PROYECTO" --branch=main --commit-dirty=true

echo "→ comprobando lo que sirve producción…"
SERVIDO="$(curl -fsSL --max-time 25 "https://www.admira.studio/version.json?cb=$$" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])' 2>/dev/null || echo '?')"
LOCAL="$(python3 -c 'import json; print(json.load(open("version.json"))["version"])' 2>/dev/null || echo '?')"
if [ "$SERVIDO" = "$LOCAL" ]; then
  echo "✓ https://www.admira.studio sirve $SERVIDO"
else
  echo "· producción sirve «$SERVIDO» y aquí tenemos «$LOCAL»: puede ser la caché de tu DNS o del borde."
  echo "  Comprueba sin caché:  curl -s --resolve www.admira.studio:443:172.66.46.230 https://www.admira.studio/version.json"
fi

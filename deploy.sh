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

[ "$(git branch --show-current)" = "main" ] || { echo "✖ publica solo desde main"; exit 1; }
git fetch origin main
SOURCE_SHA="$(git rev-parse HEAD)"
[ "$SOURCE_SHA" = "$(git rev-parse FETCH_HEAD)" ] || { echo "✖ main no coincide con origin/main; sincroniza antes de publicar"; exit 1; }

echo "→ Cloudflare Pages ($PROYECTO)…"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git archive "$SOURCE_SHA" | tar -x -C "$TMP"
# Fuera lo que es herramienta del espejo, no activo web.
rm -rf "$TMP/sync.sh" "$TMP/marca.json" "$TMP/deploy.sh" "$TMP/.fuente" "$TMP/README.md"

# La firma del artefacto identifica el SHA archivado, incluso después de merge.
# Conserva versión, responsable y configuración del propio Studio.
python3 - "$TMP" "$SOURCE_SHA" <<'PY_RELEASE'
import json, re, sys
from pathlib import Path
from datetime import datetime, timezone
artifact, sha = Path(sys.argv[1]), sys.argv[2]
if not re.fullmatch(r"[0-9a-f]{40}", sha):
    raise SystemExit("SHA de publicación inválido")
version = json.loads((artifact / "version.json").read_text())
signature = json.loads((artifact / "release-signature.json").read_text())
if version.get("version") != signature.get("version"):
    raise SystemExit("Versiones del sello no coinciden")
for name, data in [("version.json", version), ("release-signature.json", signature)]:
    data.update(git=sha, gitFull=sha, gitShort=sha[:7], dirty=False)
    if name == "version.json":
        data["deployedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    (artifact / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
for page in artifact.rglob("*.html"):
    html = page.read_text(encoding="utf-8")
    updated = re.sub(r'(<span\b(?=[^>]*\bclass="rail-ver")(?=[^>]*\bdata-release-signature)[^>]*>[^<]*? · )[0-9a-fA-F]{7,40}( · )(?:clean|dirty)', lambda m: m.group(1) + sha[:7] + m.group(2) + "clean", html)
    if updated != html:
        page.write_text(updated, encoding="utf-8")
PY_RELEASE
python3 "$TMP/scripts/check-release-contract.py" "$TMP/version.json" "$TMP/index.html"
[ "$SOURCE_SHA" = "$(git rev-parse HEAD)" ] && [ -z "$(git status --porcelain)" ] || { echo "✖ checkout cambió durante el build"; exit 1; }

# wrangler.toml viaja dentro del archive y declara el binding D1 de autenticación.
# Ejecutar desde el temporal hace que pages_build_output_dir="." apunte al
# contenido commiteado, nunca al working tree de esta máquina.
(
  cd "$TMP"
  npx --yes wrangler@latest pages deploy \
    --project-name="$PROYECTO" --branch=main --commit-hash="$SOURCE_SHA" --commit-dirty=false
)

echo "→ comprobando lo que sirve producción…"
SERVIDO="$(curl -fsSL --max-time 25 "https://www.admira.studio/version.json?cb=$$" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])' 2>/dev/null || echo '?')"
LOCAL="$(python3 -c 'import json; print(json.load(open("version.json"))["version"])' 2>/dev/null || echo '?')"
if [ "$SERVIDO" = "$LOCAL" ]; then
  echo "✓ https://www.admira.studio sirve $SERVIDO"
else
  echo "· producción sirve «$SERVIDO» y aquí tenemos «$LOCAL»: puede ser la caché de tu DNS o del borde."
  echo "  Comprueba sin caché:  curl -s --resolve www.admira.studio:443:172.66.46.230 https://www.admira.studio/version.json"
fi

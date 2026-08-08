#!/usr/bin/env bash
# ============================================================================
# Regenera admira.studio a partir de Pixeria aplicando marca.json.
#
# POR QUÉ EXISTE
# La réplica se venía haciendo a mano, commit a commit («réplica de pixeria
# 60ed388»). Falló dos veces: el 17-jun y el 17-jul. El 4-ago el clon llevaba
# 14 commits de retraso y, peor, su menú enseñaba «Concepto Pixeria» y
# «Pixeria · sistema creativo» a los visitantes de admira.studio, porque una
# réplica anterior copió assets/site-nav.js sin pasarle las sustituciones.
#
# Un espejo que se copia a mano deriva siempre. Este se GENERA:
#   ./sync.sh            → regenera y enseña el diff, sin tocar git
#   ./sync.sh --aplicar  → regenera de verdad
#
# NO EDITES A MANO ningún HTML/CSS/JS de este repo: el siguiente sync te lo
# pisa. Lo que cambia de Pixeria se cambia en marca.json.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

DRY=1; [ "${1:-}" = "--aplicar" ] && DRY=0

command -v jq >/dev/null || { echo "hace falta jq"; exit 1; }

ORIGEN="$(jq -r .origen marca.json)"
[ -d "$ORIGEN/.git" ] || { echo "✖ no encuentro el origen en $ORIGEN"; exit 1; }

# La fuente es origin/main, NO el clon local. Dos razones, las dos aprendidas el
# 4-ago-2026:
#  1) Un clon puede ir por detrás. Producción de admiranext.com se cayó al 2-ago
#     porque alguien publicó desde una copia de trabajo con base vieja.
#  2) Un clon puede ir por DELANTE con trabajo a medias. El clon de Pixeria tenía
#     sin commitear la sección #pixerfeed, con la nota «mientras estén en “—” no
#     publicar». Espejar el working tree la habría publicado en admira.studio.
# El espejo refleja lo PUBLICADO, y eso es origin/main. Así además no hace falta
# tocar el repo de origen para nada.
git -C "$ORIGEN" fetch -q origin

SUCIO="$(git -C "$ORIGEN" status --porcelain | wc -l | tr -d ' ')"
if [ "$SUCIO" != "0" ]; then
  echo "· aviso: el origen tiene $SUCIO fichero(s) sin commitear. NO se espejan."
  git -C "$ORIGEN" status --porcelain | sed 's/^/    /'
  echo
fi

FUENTE="$(git -C "$ORIGEN" rev-parse origin/main)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git -C "$ORIGEN" archive origin/main | tar -x -C "$TMP"

# Fuera lo que nunca se hereda (config de despliegue) y lo que es nuestro.
while read -r x; do rm -rf "${TMP:?}/${x}"; done < <(jq -r '.excluidos[]' marca.json)

# Las sustituciones, en el orden declarado: los dominios antes que la marca,
# para que «www.pixeria.com» no quede a medias.
# (nada de mapfile: el bash que trae macOS es el 3.2 y no lo tiene)
PARES=()
while IFS= read -r linea; do PARES+=("$linea"); done < <(jq -r '.sustituciones[] | @tsv' marca.json)
# Los .sh también: campanas/…/distribuir.sh llevaba una URL de pixeria.com dentro y
# se coló en el clon. (deploy.sh no está aquí: se excluye antes de la copia.)
find "$TMP" -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' \
     -o -name '*.txt' -o -name '*.xml' -o -name '*.md' -o -name '*.webmanifest' \
     -o -name '*.sh' \) -print0 |
while IFS= read -r -d '' f; do
  for par in "${PARES[@]}"; do
    de="${par%%$'\t'*}"; a="${par#*$'\t'}"
    LC_ALL=C sed -i '' "s|$(printf '%s' "$de" | sed 's/[][\.*^$/]/\\&/g')|${a}|g" "$f"
  done
done

# Y ahora se vuelca sobre el repo, respetando lo propio.
EXCL=(--exclude '.git/')
while read -r p; do EXCL+=(--exclude "$p"); done < <(jq -r '.propios[], .excluidos[]' marca.json)

if [ "$DRY" = 1 ]; then
  echo "── SIMULACIÓN · origen $ORIGEN @ ${FUENTE:0:7} ─────────────────────────"
  rsync -rcn --delete "${EXCL[@]}" --out-format='%o %n' "$TMP/" . | grep -vE '^(send|del)\. ' | head -40
  echo
  echo "ficheros que cambiarían: $(rsync -rcn --delete "${EXCL[@]}" --out-format='%n' "$TMP/" . | grep -vc '/$' || true)"
  echo "Repite con ./sync.sh --aplicar para escribirlo."
else
  rsync -rc --delete "${EXCL[@]}" "$TMP/" .
  printf '%s\n' "$FUENTE" > .fuente

  # ── SELLO Y FIRMA (reglas 07, 08 y 09) ────────────────────────────────────
  # Lo pone el sync, no una mano: el sello que viene heredado del origen es el de
  # Pixeria, y cualquier retoque manual se lo lleva la siguiente regeneración.
  # La r sube dentro del mismo día y vuelve a 1 al cambiar de fecha.
  AGENTE="${AGENTE:-$(whoami)}"
  MAQUINA="${MAQUINA:-$(scutil --get ComputerName 2>/dev/null || hostname)}"
  HOY="$(date '+%d.%m.%Y')"; AHORA="$(date '+%H:%M')"
  PREVIA="$(jq -r '.version // ""' version.json 2>/dev/null || echo "")"
  case "$PREVIA" in
    # «v.04.08.2026.r3.11:58» → quita el prefijo, quédate con lo de antes del
    # punto (el 3) y súbelo. Sin recortar la hora primero, la aritmética peta.
    v.$HOY.r*) RESTO="${PREVIA#v.$HOY.r}"; R=$(( ${RESTO%%.*} + 1 ));;
    *) R=1;;
  esac
  SELLO="v.${HOY}.r${R}.${AHORA}"

  # El sello viaja en el <meta> canónico y en el pie, igual que en admiranext.com.
  GIT_SHORT="${FUENTE:0:7}"
  FIRMA="$AGENTE · $MAQUINA"
  LC_ALL=C sed -i '' -E "s|(<meta name=\"admiranext-version\" content=\")[^\"]*(\")|\1Admira Studio ${SELLO}\2|" index.html
  LC_ALL=C sed -i '' -E "s|<span class=\"rail-ver\"[^>]*>[^<]*</span>|<span class=\"rail-ver\" data-release-signature>Admira Studio ${SELLO} · ${AGENTE} · ${GIT_SHORT} · clean</span>|" index.html
  jq -n --arg v "$SELLO" --arg a "$AGENTE" --arg m "$MAQUINA" --arg g "$FUENTE" --arg gs "$GIT_SHORT" \
        --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{version:$v,deployedAt:$t,author:$a,agent:$a,deployer:$a,machine:$m,signature:($a+" · "+$m),git:$g,gitShort:$gs,gitFull:$g,dirty:false,espejoDe:"pixeria",fuente:$g}' \
        > version.json
  jq '{version,author,agent,deployer,machine,signature,git,gitShort,gitFull,dirty}' version.json > release-signature.json
  python3 scripts/check-release-contract.py version.json index.html
  # Aquí version.json SÍ se commitea, al revés que en admiranext.com: GitHub Pages
  # publica el push tal cual, no hay paso de CI donde generarlo. No se hereda firma
  # de nadie porque se reescribe entero en cada regeneración.

  echo "✓ espejo regenerado desde $ORIGEN @ ${FUENTE:0:7}"
  echo "  sello ${SELLO} · firma ${AGENTE} · ${MAQUINA}"
  echo "  revisa con 'git diff' y publica con 'git push origin main'."
fi

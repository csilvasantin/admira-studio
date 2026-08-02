#!/usr/bin/env bash
# ============================================================================
# ⛔ ESTE SCRIPT NO PUBLICA NADA. Y hace bien.
#
# Hasta el 3-ago-2026 aquí vivía, línea por línea, el deploy.sh de PIXERIA: se
# copió al clonar el gemelo y nadie volvió a mirarlo. Su cabecera decía «Publica
# pixeria.com en CLOUDFLARE PAGES» y su última orden era:
#
#     wrangler pages deploy "$TMP" --project-name pixeria --branch main
#
# Es decir: quien entrara en admira-studio y ejecutara ./deploy.sh creyendo que
# publicaba su gemelo, publicaba el contenido de admira-studio ENCIMA de
# pixeria.com, que es producción de Admira. No llegó a fallar porque nadie lo
# ejecutó nunca; llevaba cargado desde el 17 de julio.
#
# ── CÓMO SE PUBLICA admira.studio ──────────────────────────────────────────
#     git push origin main
#
# Lo sirve GitHub Pages (comprobado por cabecera: server: GitHub.com), no
# Cloudflare. El push ES el despliegue.
#
# Si admira.studio pasa a Cloudflare Pages —está decidido, ver
# admiranext.com/webmaster— tendrá su propio proyecto y su propio script, y ese
# script dirá «admira-studio» donde este decía «pixeria».
#
# El original no se pierde: sigue en su sitio, el repo de pixeria.
# ============================================================================
set -euo pipefail

cat <<'TXT'
⛔ admira.studio NO se publica con este script.

   Se publica con:   git push origin main
   (lo sirve GitHub Pages: el push ES el despliegue)

   Aquí había una copia del deploy.sh de pixeria, que publicaba en
   PIXERIA.COM. Se retiró el 3-ago-2026 para que nadie sobrescriba
   un sitio en producción por error.

   Volver atrás:  git checkout retorno/pre-neutralizar-deploy-20260803
TXT
exit 1

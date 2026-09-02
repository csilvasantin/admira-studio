#!/usr/bin/env python3
"""Fail a release when prominent public UI strings remain in Spanish."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
pages = [
    "index.html", "audio.html", "musica.html", "imagenes.html", "video.html",
    "publicidad.html", "plataforma.html", "stock.html", "anonimizador.html",
    "avatar.html", "concepto.html", "director.html", "signage.html",
    "admira-xp.html", "xtore.html", "radar/index.html",
]

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "template"}:
            self.skip += 1
        if not self.skip:
            for key, value in attrs:
                if key in {"title", "aria-label", "placeholder", "alt"} and value:
                    self.parts.append(value)
    def handle_endtag(self, tag):
        if tag in {"script", "style", "template"} and self.skip:
            self.skip -= 1
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

spanish = re.compile(
    r"\b(?:cliente|proyecto|personaje|locutor|idioma|tono|ritmo|duraci[oó]n|guion|"
    r"generar|copiar|descargar|limpiar|guardar|cerrar|buscar|importar|comentarios|"
    r"etiquetas|todos|todas|anterior|siguiente|pantalla destino|fuente de se[nñ]al|"
    r"producto|servicio|oferta|desarrollo|campa[nñ]a|galer[ií]a|p[uú]blica|"
    r"m[uú]sica|im[aá]genes|megafon[ií]a|abrir|seleccionar|sin imagen)\b",
    re.I,
)
spanish_runtime = re.compile(
    r"\b(?:necesario|introduce|bloquear|continuar|guardar|borrar|cerrar|generar|"
    r"generando|descargar|enviar|seleccionar|pr[oó]ximamente|duraci[oó]n aproximada|"
    r"no se pudo|sin (?:clips|audio|imagen|respuesta|conexi[oó]n))\b",
    re.I,
)
errors = []
for rel in pages:
    path = root / rel
    if not path.exists():
        errors.append(f"{rel}: missing")
        continue
    raw = path.read_text(encoding="utf-8")
    if not re.search(r"<html\b[^>]*\blang=[\"']en[\"']", raw, re.I):
        errors.append(f"{rel}: html lang is not en")
    parser = VisibleText()
    parser.feed(raw)
    for text in parser.parts:
        clean = " ".join(text.split())
        if clean and spanish.search(clean):
            errors.append(f"{rel}: {clean[:150]}")

for rel in ("app.js", "assets/site-nav.js", "assets/cuadratura.js", "functions/_auth.js"):
    raw = (root / rel).read_text(encoding="utf-8")
    # Comments are implementation notes; inspect only quoted/template literals,
    # which are the strings that can reach the interface.
    for match in re.finditer(r"(?s)(?<!\\)(['\"`])((?:\\.|(?!\1).)*?)\1", raw):
        value = " ".join(match.group(2).split())
        if any(code in value for code in ("); //", "querySelector", "classList.", "function ")):
            continue
        if spanish_runtime.search(value):
            errors.append(f"{rel}: {value[:150]}")

if errors:
    print("\n".join(f"✗ English UI: {error}" for error in errors[:80]))
    if len(errors) > 80:
        print(f"✗ English UI: {len(errors) - 80} more issue(s)")
    raise SystemExit(1)
print(f"✓ English UI · {len(pages)} public surfaces + shared runtime")

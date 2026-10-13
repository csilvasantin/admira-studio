#!/usr/bin/env python3
"""Create explicit static review copies only in a disposable Pages package."""
import json,re,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve()
if (root/'.git').exists() or root==Path(__file__).resolve().parents[1]:
    raise SystemExit('Use a disposable package, never the checkout')
for language in ['es','en']:
    prefix=f'/review/5839/{language}/'
    for route in ['creador','adaptaciones']:
        source=root/('en/' if language=='en' else '')/route/'index.html'
        content=source.read_text()
        content=re.sub(r'<!-- GATE-INICIO -->.*?<!-- GATE-FIN -->','',content,flags=re.S)
        content=content.replace('<body class="','<body data-preview-root="'+prefix+'" class="',1)
        content=content.replace('<head>','<head><meta name="robots" content="noindex,nofollow">',1)
        destination=root/prefix.lstrip('/')/route/'index.html'
        destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(content)
    source=root/('en/' if language=='en' else '')/'video.html'
    if source.exists():
        content=re.sub(r'<!-- GATE-INICIO -->.*?<!-- GATE-FIN -->','',source.read_text(),flags=re.S)
        (root/prefix.lstrip('/')/'video.html').write_text(content)
routes_path=root/'_routes.json'
routes=json.loads(routes_path.read_text()) if routes_path.exists() else {'version':1,'include':['/*'],'exclude':[]}
routes['exclude']=list(dict.fromkeys(routes['exclude']+['/review/5839/*','/campanas/starbucks-5839/*','/docs/encargos/5839/*']))
routes_path.write_text(json.dumps(routes,indent=2)+'\n')

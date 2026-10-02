from pathlib import Path
p=Path('functions/_middleware.js')
s=p.read_text()
if 'withPresence' not in s:
    if 'export async function onRequest(context)' in s:
        s=s.replace('export async function onRequest(context)', 'async function guardedRequest(context)')
        s+='\nimport {withPresence} from "./_live-presence.js";\nexport async function onRequest(context) { return withPresence(await guardedRequest(context)); }\n'
    elif 'export const onRequest = (context) => perimetro(context);' in s:
        s=s.replace('export const onRequest = (context) => perimetro(context);', 'import {withPresence} from "./_live-presence.js";\nexport const onRequest = async (context) => withPresence(await perimetro(context));')
    else:
        raise SystemExit('Unknown middleware contract; review before syncing')
    p.write_text(s)

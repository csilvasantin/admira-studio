import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {urlCampaign,restoreSource,imageData} from '../adaptaciones/campaign-url.mjs';import {newCampaign} from '../adaptaciones/campaign-entry.mjs';import {restoreCampaign} from '../adaptaciones/campaign-core.mjs';
import {onRequestPost} from '../functions/creator-capsule-url.js';import {handleAuth} from '../functions/_auth.js';
const draft={ok:true,modo:'campana',source:{url:'https://lnkd.in/p/e9zXSPkK',title:'We turned Claude Opus 5.5 into a motion design studio',author:'',kind:'linkedin'},campana:{nombre:'Motion Design con IA',titular:'Crea vídeos profesionales con IA',cta:'Prueba la IA en tu próximo proyecto',etiqueta:'Vídeo de lanzamiento',idea:'Un agente orquesta un estudio.'}};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
test('la URL rellena el paso Contenido como si se subieran producto y texto, y la fuente sobrevive a guardar/abrir',()=>{
 const c=urlCampaign(newCampaign(false),draft,png);
 assert.equal(c.name,'Motion Design con IA');assert.equal(c.headline,'Crea vídeos profesionales con IA');assert.equal(c.cta,'Prueba la IA en tu próximo proyecto');assert.equal(c.product,png);assert.equal(c.productLabel,'Vídeo de lanzamiento');
 assert.equal(c.source.url,'https://lnkd.in/p/e9zXSPkK');assert.equal(c.direction,'hero');
 const back=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(back.source.url,'https://lnkd.in/p/e9zXSPkK');assert.equal(back.headline,c.headline);
 const sin=urlCampaign(newCampaign(false),draft,'');assert.equal(sin.product,'/adaptaciones/campanas/product-placeholder.svg');
 assert.throws(()=>restoreSource({url:'javascript:alert(1)'}));assert.throws(()=>restoreCampaign({...JSON.parse(JSON.stringify(c)),source:{url:'http://x.y'}}));
});
test('la imagen de la fuente se lee por el proxy CORS y se descarta si no es PNG/JPG/WebP',async()=>{
 const ok=await imageData('https://api.admira.store/image/proxy?url=x',async()=>new Response(new Blob([new Uint8Array([1,2])],{type:'image/jpeg'})));assert.match(ok,/^data:image\/jpeg;base64,/);
 assert.equal(await imageData('u',async()=>new Response(new Blob(['x'],{type:'image/svg+xml'}))),'');assert.equal(await imageData(''),'');
});
const token='agent-test-token-at-least-32-characters',env={PIXERIA_SIGNING_KEY:'test-signing-key-with-enough-entropy',ADMIRA_AGENT_LOGIN_TOKEN:token};
test('borrador-campana reenvía al borrador del worker en modo campana, con sesión y mismo origen',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(u,init={})=>{calls.push({u:String(u),body:JSON.parse(init.body)});return Response.json(draft);});
 const cookie=(await handleAuth(new Request('https://admira.studio/auth/agente',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP14'}}),env)).headers.get('set-cookie').split(';')[0];
 const req=(c,o='https://admira.studio')=>new Request('https://admira.studio/creator-capsule-url',{method:'POST',headers:{Cookie:c,Origin:o,'Content-Type':'application/json'},body:JSON.stringify({accion:'borrador-campana',url:'https://lnkd.in/p/e9zXSPkK',texto:'t'})});
 assert.equal((await onRequestPost({request:req(''),env})).status,401);assert.equal((await onRequestPost({request:req(cookie,'https://evil.test'),env})).status,403);
 assert.equal((await onRequestPost({request:req(cookie),env})).status,200);assert.deepEqual(calls[0].body,{url:'https://lnkd.in/p/e9zXSPkK',texto:'t',modo:'campana'});assert.equal(calls[0].u,'https://api.admira.store/capsula/url/borrador');
});
test('el campo «Crear desde URL» va justo debajo de «＋ Nueva campaña» y el Creador lo mantiene en las acciones principales',()=>{
 const s=readFileSync(new URL('../adaptaciones/campaign-studio.mjs',import.meta.url),'utf8');const a=s.indexOf('id="campaign-new"'),b=s.indexOf('id="campaign-url-form"');assert.ok(a>0&&b>a&&b-a<200);assert.match(s,/mountUrlCampaign\(/);
 const w=readFileSync(new URL('../assets/studio-workflow/creator.mjs',import.meta.url),'utf8');assert.match(w,/primary\.append\(newCampaign, \.\.\.\(fromUrl \? \[fromUrl\] : \[\]\)/);
});

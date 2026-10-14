import test from 'node:test';import assert from 'node:assert/strict';import {buildCreatorCapsule} from '../assets/creator-capsule-core.mjs';import {onRequestPost} from '../functions/stock-capsule.js';import {handleAuth} from '../functions/_auth.js';
const raw={kind:'didyouknow',tesis:'¿Sabías que?',carbono:'Contenido redactado por la persona.',source:'Una referencia verificable',topic:'ciencia',language:'es'};
test('cápsula conocimiento y sabías que manual requiere título, texto y fuente; conserva texto y no inventa vídeo',()=>{
 const b=buildCreatorCapsule(raw);assert.equal(b.ok,true);assert.equal(b.payload.type,'capsula');assert.equal(b.payload.skipVideo,true);assert.match(b.payload.comment,/Fuente: Una referencia/);assert.ok(b.payload.tags.includes('sabiasque'));assert.equal(b.payload.sourceUrl,undefined);assert.equal(b.payload.base64,undefined);
 for(const field of ['tesis','carbono','source'])assert.equal(buildCreatorCapsule({...raw,[field]:''}).ok,false);
 assert.equal(buildCreatorCapsule(null).ok,false);assert.equal(buildCreatorCapsule({...raw,kind:'other'}).ok,false);
 assert.equal(buildCreatorCapsule({...raw,kind:'knowledge',language:'en'}).payload.tags.includes('content-language:en'),true);
});
test('el resumen Blinkist conserva su contrato, consejeros y fuente sin URL obligatoria',()=>{
 const b=buildCreatorCapsule({kind:'blinkist',tesis:'Tesis',libro:'Libro',autor:'Autor',carbono:'Resumen',consejeroId:'stevejobs',tema:'business'});assert.equal(b.ok,true);assert.ok(b.payload.tags.includes('blinkist'));assert.match(b.payload.comment,/PARA CARBONO/);assert.equal(buildCreatorCapsule({kind:'blinkist'}).ok,false);
});
const token='agent-test-token-at-least-32-characters',env={PIXERIA_SIGNING_KEY:'test-signing-key-with-enough-entropy',ADMIRA_AGENT_LOGIN_TOKEN:token};
test('publicar desde Creador requiere sesión y mismo origen; sólo reenvía contrato de texto saneado',async t=>{
 let calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{calls.push({u,body:JSON.parse(init.body)});return Response.json({ok:true,id:'new',num:2000});});
 const url='https://admira.studio/stock-capsule',req=(c,body,origin='https://admira.studio')=>new Request(url,{method:'POST',headers:{Cookie:c,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await onRequestPost({request:req('',raw),env})).status,401);
 const auth=await handleAuth(new Request('https://admira.studio/auth/agente',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP14'}}),env),cookie=auth.headers.get('set-cookie').split(';')[0];
 assert.equal((await onRequestPost({request:req(cookie,raw,'https://evil.test'),env})).status,403);assert.equal((await onRequestPost({request:req(cookie,null),env})).status,400);assert.equal(calls.length,0);
 const r=await onRequestPost({request:req(cookie,{...raw,externalId:'overwrite-existing',sourceUrl:'https://evil.test',catalogo:{id:'inject'},base64:'data',tags:['starbucks']}),env});assert.equal(r.status,200);assert.equal(calls.length,1);assert.equal(calls[0].body.externalId,undefined);assert.equal(calls[0].body.catalogo,undefined);assert.equal(calls[0].body.tags.includes('starbucks'),false);assert.equal(calls[0].body.type,'capsula');
});

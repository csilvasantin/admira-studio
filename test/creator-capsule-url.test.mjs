import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {onRequestPost,onRequestGet} from '../functions/creator-capsule-url.js';import {handleAuth} from '../functions/_auth.js';import {readGuion,statusText,CAMPOS} from '../assets/creator-capsule-url.mjs';
const token='agent-test-token-at-least-32-characters',env={PIXERIA_SIGNING_KEY:'test-signing-key-with-enough-entropy',ADMIRA_AGENT_LOGIN_TOKEN:token};
const cookie=async()=>(await handleAuth(new Request('https://admira.studio/auth/agente',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP14'}}),env)).headers.get('set-cookie').split(';')[0];
const req=(c,body,origin='https://admira.studio')=>new Request('https://admira.studio/creator-capsule-url',{method:'POST',headers:{Cookie:c,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('crear cápsula desde URL exige sesión y mismo origen y reenvía al pipeline del Stock',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(u,init={})=>{calls.push({u:String(u),body:init.body?JSON.parse(init.body):null,origin:init.headers?.Origin});return Response.json({ok:true,ref:'capsula-url:0123456789abcdef',status:'sin-encargo',guion:{gancho:'g'}});});
 assert.equal((await onRequestPost({request:req('',{accion:'borrador',url:'https://lnkd.in/p/e9zXSPkK'}),env})).status,401);
 const c=await cookie();
 assert.equal((await onRequestPost({request:req(c,{accion:'borrador',url:'https://lnkd.in/p/e9zXSPkK'},'https://evil.test'),env})).status,403);
 assert.equal((await onRequestPost({request:req(c,{accion:'borrador',url:'javascript:alert(1)'}),env})).status,400);
 assert.equal((await onRequestPost({request:req(c,{accion:'otra',url:'https://lnkd.in/p/e9zXSPkK'}),env})).status,400);assert.equal(calls.length,0);
 const r=await onRequestPost({request:req(c,{accion:'borrador',url:'https://lnkd.in/p/e9zXSPkK',texto:'x'}),env});assert.equal(r.status,200);
 assert.equal(calls[0].u,'https://api.admira.store/capsula/url/borrador');assert.equal(calls[0].origin,'https://www.admira.studio');assert.deepEqual(calls[0].body,{url:'https://lnkd.in/p/e9zXSPkK',texto:'x'});
 await onRequestPost({request:req(c,{accion:'encargar',url:'https://lnkd.in/p/e9zXSPkK',guion:{objeto:'O',gancho:'G',giro:'Gi',remate:'R',fuente:'Fuente: F',cifra:{hasta:12,unidad:'portátiles'},base64:'x'},externalRef:'inject',tags:['starbucks']}),env});
 assert.equal(calls[1].u,'https://api.admira.store/capsula/url/encargar');assert.equal(calls[1].body.guion.base64,undefined);assert.equal(calls[1].body.externalRef,undefined);assert.equal(calls[1].body.tags,undefined);assert.equal(calls[1].body.guion.cifra.hasta,12);
 const g=await onRequestGet({request:new Request('https://admira.studio/creator-capsule-url?ref=capsula-url:0123456789abcdef',{headers:{Cookie:c}}),env});assert.equal(g.status,200);assert.match(calls[2].u,/\/capsula\/url\/estado\?ref=capsula-url%3A0123456789abcdef$/);
 assert.equal((await onRequestGet({request:new Request('https://admira.studio/creator-capsule-url?ref=../x',{headers:{Cookie:c}}),env})).status,400);
});
test('el editor lee el guion editado (gancho, giro, remate, cifra) y explica el estado',()=>{
 const v={'capurl-cifra':'17.000','capurl-unidad':'tokens/s','capurl-tema':'tecnología'};for(const [k] of CAMPOS)v['capurl-'+k]=' '+k+' ';
 const g=readGuion(id=>v[id]);assert.equal(g.gancho,'gancho');assert.equal(g.cifra.hasta,17000);assert.equal(readGuion(id=>id==='capurl-cifra'?'':v[id]).cifra.hasta,null);
 const t=(es)=>es;assert.match(statusText({status:'publicada',existing:{vertical:{num:1800},horizontal:{num:1801}}},t),/#1800.*#1801/);assert.match(statusText({status:'en-cola'},t),/plantilla|v5/);
});
test('el Creador (ES y EN) carga el bloque «Crear cápsula desde URL» después del panel de cápsulas',()=>{
 for(const f of ['creador/index.html','en/creador/index.html']){const h=readFileSync(new URL('../'+f,import.meta.url),'utf8');const a=h.indexOf('/assets/creator-capsule.mjs'),b=h.indexOf('/assets/creator-capsule-url.mjs');assert.ok(a>0&&b>a,f);}
 assert.match(readFileSync(new URL('../assets/creator-capsule-url.mjs',import.meta.url),'utf8'),/Crear cápsula desde URL/);
});

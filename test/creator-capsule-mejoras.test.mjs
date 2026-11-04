// Mejoras Creador de cápsulas (4-nov-2026): vista previa de la cartela, cápsula bilingüe y lote de URLs.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {previewModel,previewHtml,fmtCifra,parseUrlList,MAX_LOTE,avisoText} from '../assets/creator-capsule-url.mjs';
import {translationTexts,applyTranslation,otherLanguage,capsuleErrorText} from '../assets/creator-capsule-core.mjs';
import {onRequestPost} from '../functions/stock-capsule.js';import {handleAuth} from '../functions/_auth.js';
const token='agent-test-token-at-least-32-characters',env={PIXERIA_SIGNING_KEY:'test-signing-key-with-enough-entropy',ADMIRA_AGENT_LOGIN_TOKEN:token};
const cookie=async()=>(await handleAuth(new Request('https://admira.studio/auth/agente',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP14'}}),env)).headers.get('set-cookie').split(';')[0];
const req=(c,body)=>new Request('https://admira.studio/stock-capsule',{method:'POST',headers:{Cookie:c,Origin:'https://admira.studio','Content-Type':'application/json'},body:JSON.stringify(body)});
const raw={kind:'didyouknow',language:'es',tesis:'Título',carbono:'Párrafo uno.\n\nPárrafo dos.',source:'https://fuente.test',topic:'ciencia'};

test('vista previa: modelo con cifra formateada y avisos de lo que falta',()=>{
 const m=previewModel({objeto:'Chip',gancho:'G',giro:'',remate:'R',fuente:'',cifra:{hasta:17000,unidad:'tokens/s'},tema:'tecnología'});
 assert.equal(m.cifra,'17.000 tokens/s');assert.deepEqual(m.avisos,['giro','fuente']);assert.equal(fmtCifra({hasta:null}),'');assert.equal(fmtCifra({hasta:1500},true),'1,500');
 assert.deepEqual(previewModel({objeto:'a',gancho:'a',giro:'a',remate:'a',fuente:'a',cifra:{hasta:NaN}}).avisos,['cifra']);assert.equal(avisoText('gancho',true),'Hook missing');
});
test('vista previa: pinta 9:16 y 16:9, escapa texto y solo usa imagen https',()=>{
 const h=previewHtml(previewModel({objeto:'<img src=x onerror=alert(1)>',gancho:'G'}),"https://x.test/a.jpg'),url(evil",{preroll:true});
 assert.match(h,/capurl-pv-v[\s\S]*9:16[\s\S]*capurl-pv-h[\s\S]*16:9/);assert.ok(!h.includes('<img'));assert.ok(!/url\(evil/.test(h));assert.match(h,/preroll/);
 assert.ok(!previewHtml(previewModel({}),'javascript:alert(1)').includes('background-image'));
});
test('lote: URLs https únicas, una por línea o separadas, máx. 10',()=>{
 assert.deepEqual(parseUrlList('https://a.test/1\nhttp://b.test, https://a.test/1 javascript:x https://c.test/2.'),['https://a.test/1','https://c.test/2']);
 assert.equal(parseUrlList(Array.from({length:15},(_,i)=>'https://x.test/'+i).join('\n')).length,MAX_LOTE);
});
test('bilingüe: textos a traducir conservan párrafos y la hermana va en el otro idioma',()=>{
 const tx=translationTexts(raw);assert.equal(tx.length,3);assert.match(tx[1],/¶/);
 const r=applyTranslation(raw,['Title','Paragraph one. ¶ Paragraph two.','science']);assert.equal(r.language,'en');assert.equal(r.carbono,'Paragraph one.\n\nParagraph two.');assert.equal(r.topic,'science');assert.equal(r.source,raw.source);
 assert.equal(otherLanguage('en'),'es');assert.match(capsuleErrorText('translation-failed'),/traducir/);
});
test('bilingüe: publica original + hermana traducida con par-<id>; si la IA falla, el original queda',async t=>{
 const calls=[];let n=0;t.mock.method(globalThis,'fetch',async(u,init)=>{calls.push(JSON.parse(init.body));n++;return Response.json({ok:true,id:'cap-'+n,num:2000+n});});
 const c=await cookie();
 const ai={run:async()=>({response:'1. Title\n2. Paragraph one. ¶ Paragraph two.\n3. science'})};
 let d=await (await onRequestPost({request:req(c,{...raw,bilingual:true}),env:{...env,AI:ai}})).json();
 assert.equal(calls.length,2);assert.equal(d.num,2001);assert.deepEqual(d.pair,{id:'cap-2',num:2002,language:'en'});
 assert.ok(calls[1].tags.includes('content-language:en'));assert.ok(calls[1].tags.includes('par-cap-1'));assert.equal(calls[1].title,'Title');assert.match(calls[1].comment,/Paragraph two\.\n\nSource: /);
 calls.length=0;d=await (await onRequestPost({request:req(c,{...raw,bilingual:true}),env:{...env,AI:{run:async()=>{throw Error('x');}}}})).json();
 assert.equal(calls.length,1);assert.equal(d.ok,true);assert.equal(d.pair,null);assert.equal(d.pairError,'translation-failed');
 calls.length=0;d=await (await onRequestPost({request:req(c,{...raw,bilingual:true}),env})).json();assert.equal(calls.length,1);assert.equal(d.pairError,'translation-unavailable');
 calls.length=0;await onRequestPost({request:req(c,raw),env:{...env,AI:ai}});assert.equal(calls.length,1);
});
test('el Creador (ES y EN) carga las versiones nuevas y el panel trae preview, lote y bilingüe',()=>{
 for(const f of ['creador/index.html','en/creador/index.html'])assert.match(readFileSync(new URL('../'+f,import.meta.url),'utf8'),/creator-capsule-url\.mjs\?v=04\.11\.2026/);
 const u=readFileSync(new URL('../assets/creator-capsule-url.mjs',import.meta.url),'utf8'),c=readFileSync(new URL('../assets/creator-capsule.mjs',import.meta.url),'utf8');
 for(const re of [/id="capurl-preview"/,/id="capurl-lista"/,/id="capurl-cola"/])assert.match(u,re);assert.match(c,/id="cap-bilingual"/);
});

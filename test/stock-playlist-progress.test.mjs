import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {onRequestPost} from '../functions/stock-playlist-progress.js';
import {handleAuth} from '../functions/_auth.js';
const P=createRequire(import.meta.url)('../assets/stock-playlist-progress.js');
const id='song1',now=Date.now();
test('sólo ready reciente confirma: 100% en tránsito, caché ausente/caducada y relojes futuros siguen pendientes',()=>{
 assert.equal(P.target(null,id,'a',now).state,'unknown');
 assert.equal(P.target({at:now,ready:[],downloading:[{id:'default:song1',pct:100}]},id,'a',now).pct,99);
 assert.equal(P.target({at:now,ready:['default:song1'],downloading:[{id:'default:song1',pct:75}]},id,'a',now).state,'downloading');
 assert.equal(P.target({at:now-420000,ready:['default:song1']},id,'a',now).state,'ready'); // Worker renueva recibos estables cada siete minutos.
 for(const at of [now-600001,now+60001])assert.equal(P.target({at,ready:['default:song1']},id,'a',now).state,'unknown');
 assert.equal(P.target({at:now,ready:['default:other']},id,'a',now).state,'waiting');
});
test('todos los destinos únicos deben confirmar; incompletos nunca muestran 100 ni verde',()=>{
 const a={screen:'a',state:'ready',pct:100,at:now},b={screen:'b',state:'downloading',pct:50,at:now};
 assert.deepEqual(P.summarize([a,b],2,now),{total:2,ready:1,complete:false,pct:75});
 assert.equal(P.summarize([a,a],2,now).complete,false);assert.equal(P.summarize([a],2,now).pct,50);
 assert.equal(P.summarize([a,{...b,pct:100}],2,now).pct,99);
 assert.equal(P.summarize([a,{...b,state:'ready',pct:100}],2,now).complete,true);
 assert.equal(P.summarize([{...a,at:now-600001}],1,now).complete,false);
 assert.equal(P.summarize([],0,now).complete,false);
});
const token='agent-test-token-at-least-32-characters';const env={PIXERIA_SIGNING_KEY:'test-signing-key-with-enough-entropy',ADMIRA_AGENT_LOGIN_TOKEN:token,STOCK_NOTIFY_KEY:'server-only'};
const base='https://www.admira.studio/stock-playlist-progress';
async function cookie(){const r=await handleAuth(new Request('https://www.admira.studio/auth/agente',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP14'}}),env);assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const req=(c,body,origin='https://www.admira.studio')=>new Request(base,{method:'POST',headers:{Cookie:c,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const catalog={ok:true,rows:[{project:'starbucks',screen:'iphone'},{project:'starbucks',screen:'ipad'},{project:'other',screen:'other'}],assignments:[{project:'starbucks',screen:'iphone',stockIds:[id]},{project:'starbucks',screen:'iphone',stockIds:[id]},{project:'starbucks',screen:'ipad',stockIds:[id]}]};
test('API autenticada sin secreto en salida, con deduplicación por player y recibo final',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,init)=>{calls.push({url,init});if(url.includes('stock-playlists'))return Response.json(catalog);const screen=new URL(url).searchParams.get('screen');return Response.json({ok:true,cache:{at:Date.now(),ready:screen==='iphone'?['default:'+id]:[],downloading:screen==='ipad'?[{id:'default:'+id,pct:100}]:[]}});});
 assert.equal((await onRequestPost({request:req('',{ids:[id]}),env})).status,401);assert.equal(calls.length,0);
 const c=await cookie();assert.equal((await onRequestPost({request:req(c,{ids:[id]},'https://evil.example'),env})).status,403);assert.equal(calls.length,0);
 const r=await onRequestPost({request:req(c,{ids:[id]}),env}),d=await r.json();assert.equal(r.status,200);assert.equal(d.items[0].total,2);assert.equal(d.items[0].targets.length,2);assert.equal(P.summarize(d.items[0].targets,2).pct,99);assert.equal(d.nextCursor,null);assert.equal(JSON.stringify(d).includes('server-only'),false);assert.equal(calls[0].init.headers['X-Notify-Key'],'server-only');assert.ok(calls.every(x=>!x.init.method));
});
test('API rechaza entradas inválidas y destinos extra ajenos; acepta la asignación recién confirmada antes del catálogo',async t=>{
 t.mock.method(globalThis,'fetch',async url=>Response.json(url.includes('stock-playlists')?catalog:{ok:true,cache:null}));const c=await cookie();
 for(const body of [null,{}, {ids:[]},{ids:['../x']},{ids:Array.from({length:25},(_,i)=>'s'+i)},{ids:[id],cursor:-1},{ids:[id],cursor:1.5}])assert.equal((await onRequestPost({request:req(c,body),env})).status,400);
 for(const extraTargets of [{song1:['not-authorized']},{other:['iphone']},[],{song1:Array(37).fill('iphone')}])assert.equal((await onRequestPost({request:req(c,{ids:[id],extraTargets}),env})).status,403);
 const d=await(await onRequestPost({request:req(c,{ids:['new-song'],extraTargets:{'new-song':['iphone']}}),env})).json();assert.equal(d.items[0].total,1);assert.equal(d.items[0].targets[0].state,'unknown');
});
test('paginación limita 36 consultas sin declarar completa una flota parcial; fallo de caché conserva pendiente',async t=>{
 const screens=Array.from({length:38},(_,i)=>'screen-'+String(i).padStart(2,'0'));const fleet={ok:true,rows:screens.map(screen=>({project:'starbucks',screen})),assignments:screens.map(screen=>({project:'starbucks',screen,stockIds:[id]}))};let cacheCalls=0;
 t.mock.method(globalThis,'fetch',async url=>{if(url.includes('stock-playlists'))return Response.json(fleet);cacheCalls++;if(url.includes('screen-37'))throw Error('offline');return Response.json({ok:true,cache:{at:Date.now(),ready:['default:'+id]}});});const c=await cookie();
 const a=await(await onRequestPost({request:req(c,{ids:[id]}),env})).json();assert.equal(cacheCalls,36);assert.equal(a.items[0].total,38);assert.equal(a.nextCursor,36);assert.equal(P.summarize(a.items[0].targets,38).complete,false);
 const b=await(await onRequestPost({request:req(c,{ids:[id],cursor:a.nextCursor}),env})).json();assert.equal(cacheCalls,38);assert.equal(b.nextCursor,null);assert.equal(P.summarize([...a.items[0].targets,...b.items[0].targets],38).complete,false);assert.equal(b.items[0].targets.at(-1).state,'unknown');
});
test('permisos de lectura cierran alcance: sólo proyectos explícitos, directorio caído devuelve 503',async t=>{
 const email='ordinary@example.com',ts=Math.floor(Date.now()/1000),payload=Buffer.from(JSON.stringify({aud:'admira.studio',email,sub:'ordinary-sub',sv:1,iat:ts,exp:ts+600})).toString('base64url');const signed=payload+'.'+createHmac('sha256',env.PIXERIA_SIGNING_KEY).update('px:'+payload).digest('base64url');const c='__Host-pixeria_session='+signed;
 const AUTH_DB={prepare(sql){return {bind(){return this;},run:async()=>({success:true}),first:async()=>sql.includes('SELECT * FROM pixeria_users')?{email,status:'active',session_version:1}:{role:'user',account_kind:'team'},all:async()=>({results:[{project_key:'commercial:starbucks'}]})};}};
 const calls=[];t.mock.method(globalThis,'fetch',async url=>{calls.push(url);return Response.json(url.includes('stock-playlists')?catalog:url.includes('/screen/cache')?{ok:true,cache:null}:{emails:[email]});});
 const scoped={...env,AUTH_DB};assert.equal((await onRequestPost({request:req(c,{ids:[id],extraTargets:{song1:['other']}}),env:scoped})).status,403);assert.equal(calls.some(x=>x.includes('/screen/cache')),false);
 AUTH_DB.prepare=sql=>({bind(){return this;},run:async()=>({success:true}),first:async()=>{if(sql.includes('SELECT * FROM pixeria_users'))return {email,status:'active',session_version:1};throw Error('directory down');}});
 assert.equal((await onRequestPost({request:req(c,{ids:[id]}),env:scoped})).status,503);
});

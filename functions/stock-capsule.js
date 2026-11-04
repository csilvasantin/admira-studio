import {sessionInfo} from './_auth.js';
import {buildCreatorCapsule as build,translationTexts,applyTranslation,otherLanguage} from '../assets/creator-capsule-core.mjs';
import {stockBase,cabeceras,error,respuesta} from './_stock-proxy.js';
import {translateAll} from './stock-subtitles.js';
const pairTag=id=>'par-'+String(id).toLowerCase().replace(/[^a-z0-9-]/g,'');
const publish=(env,payload)=>fetch(stockBase(env)+'/stock/publish',{method:'POST',headers:cabeceras({'Content-Type':'application/json'}),body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
// bilingual:true (4-nov-2026) → publica la cápsula y, con Workers AI, su hermana en el otro idioma (`par-<id>`).
// Si la traducción falla, el original ya está publicado: se devuelve con pairError, nunca se pierde.
async function publishPair(env,body,payload){
 const r=await publish(env,payload),d=await r.clone().json().catch(()=>null);if(!r.ok||!d?.ok)return respuesta(r);
 let pair=null,pairError=null;
 if(!env.AI)pairError='translation-unavailable';
 else{let raw2=null;try{const lang=body.language==='en'?'en':'es';raw2=applyTranslation(body,await translateAll(env,translationTexts(body),lang,otherLanguage(lang)));}catch{pairError='translation-failed';}
  if(raw2){const b2=build(raw2);if(!b2.ok)pairError='translation-failed';else{b2.payload.tags.push(pairTag(d.id));try{const r2=await publish(env,b2.payload),d2=await r2.json().catch(()=>null);if(r2.ok&&d2?.ok)pair={id:d2.id,num:d2.num,language:raw2.language};else pairError='pair-publish-failed';}catch{pairError='pair-publish-failed';}}}}
 return new Response(JSON.stringify({...d,pair,pairError}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
export async function onRequestPost({request,env}){
 if(!await sessionInfo(request,env))return error(401,'session-required');
 if(request.headers.get('Origin')!==new URL(request.url).origin)return error(403,'invalid-origin');
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return error(415,'json-required');
 let body;try{const raw=await request.text();if(raw.length>24000)return error(413,'too-big');body=JSON.parse(raw);}catch{return error(400,'bad-json');}
 const built=build(body);if(!built.ok)return error(400,'invalid-capsule',{errors:built.errors});
 try{if(body.bilingual===true&&body.kind!=='blinkist')return await publishPair(env,body,built.payload);return await respuesta(await publish(env,built.payload));}catch{return error(502,'stock-unreachable');}
}

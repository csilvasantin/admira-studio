import {sessionInfo} from './_auth.js';
import {buildCreatorCapsule} from '../assets/creator-capsule-core.mjs';
import {stockBase,cabeceras,error,respuesta} from './_stock-proxy.js';
export async function onRequestPost({request,env}){
 if(!await sessionInfo(request,env))return error(401,'session-required');
 if(request.headers.get('Origin')!==new URL(request.url).origin)return error(403,'invalid-origin');
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return error(415,'json-required');
 let body;try{const raw=await request.text();if(raw.length>24000)return error(413,'too-big');body=JSON.parse(raw);}catch{return error(400,'bad-json');}
 const built=buildCreatorCapsule(body);if(!built.ok)return error(400,'invalid-capsule',{errors:built.errors});
 try{return await respuesta(await fetch(stockBase(env)+'/stock/publish',{method:'POST',headers:cabeceras({'Content-Type':'application/json'}),body:JSON.stringify(built.payload),signal:AbortSignal.timeout(30000)}));}catch{return error(502,'stock-unreachable');}
}

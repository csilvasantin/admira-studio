/* /creator-capsule-url — «Crear cápsula desde URL» del Creador (22-oct-2026).
 * POST {accion:'borrador', url, texto?}  → api.admira.store/capsula/url/borrador (extrae + guion Gemini, no escribe)
 * POST {accion:'encargar', url, guion, image?, author?, title?, preroll?, postroll?} (cartelas, apagadas por defecto) → /capsula/url/encargar (cola v5, dedup por origen)
 * POST {accion:'borrador-campana', url, texto?} → mismo borrador en modo «campana» (Creador de campañas: marca, titular, CTA, imagen)
 * GET  ?ref=capsula-url:<hash>           → /capsula/url/estado (publicada cuando hay vertical + horizontal)
 * Sesión de admira.studio y mismo origen; el render lo hace el pipeline v5 de GrokBotBox. Sin secretos aquí. */
import {sessionInfo} from './_auth.js';
import {stockBase,cabeceras,error,respuesta} from './_stock-proxy.js';
const REF=/^capsula-url:[a-f0-9]{16}$/;
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
async function proxy(env,path,init){try{return await respuesta(await fetch(stockBase(env)+path,{...init,signal:AbortSignal.timeout(60000)}));}catch{return error(502,'stock-unreachable');}}
export async function onRequestGet({request,env}){
 if(!await sessionInfo(request,env))return error(401,'session-required');
 const ref=new URL(request.url).searchParams.get('ref')||'';if(!REF.test(ref))return error(400,'bad-ref');
 return proxy(env,'/capsula/url/estado?ref='+encodeURIComponent(ref),{headers:cabeceras()});
}
export async function onRequestPost({request,env}){
 if(!await sessionInfo(request,env))return error(401,'session-required');
 if(request.headers.get('Origin')!==new URL(request.url).origin)return error(403,'invalid-origin');
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return error(415,'json-required');
 let body;try{const raw=await request.text();if(raw.length>16000)return error(413,'too-big');body=JSON.parse(raw);}catch{return error(400,'bad-json');}
 const url=str(body?.url,2000);if(!/^https:\/\/[^\s"'<>]+$/.test(url))return error(400,'invalid-url');
 if(body.accion==='borrador-campana')return proxy(env,'/capsula/url/borrador',{method:'POST',headers:cabeceras({'Content-Type':'application/json'}),body:JSON.stringify({url,texto:str(body.texto,12000),modo:'campana'})});
 if(body.accion==='borrador')return proxy(env,'/capsula/url/borrador',{method:'POST',headers:cabeceras({'Content-Type':'application/json'}),body:JSON.stringify({url,texto:str(body.texto,12000)})});
 if(body.accion==='encargar'){
  const g=body.guion&&typeof body.guion==='object'?body.guion:{};
  const guion={objeto:str(g.objeto,90),subtitulo:str(g.subtitulo,60),tema:str(g.tema,24),cifra:{hasta:g.cifra?.hasta??null,unidad:str(g.cifra?.unidad,16)},gancho:str(g.gancho,70),giro:str(g.giro,80),remate:str(g.remate,90),fuente:str(g.fuente,80),idea:str(g.idea,280)};
  return proxy(env,'/capsula/url/encargar',{method:'POST',headers:cabeceras({'Content-Type':'application/json'}),body:JSON.stringify({url,guion,image:str(body.image,600),author:str(body.author,200),title:str(body.title,300),requestedBy:'Creador admira.studio',preroll:body.preroll===true,postroll:body.postroll===true})});
 }
 return error(400,'invalid-action');
}

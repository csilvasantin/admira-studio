import {sessionInfo,esSuperusuario} from './_auth.js';
export const SCREENS=Object.freeze(['macstudio-starbucks-vertical','macstudio-starbucks-horizontal','macstudio-starbucks-vertical-right','macmini-starbucks-vertical-right','macmini-starbucks-horizontal','macmini-starbucks-vertical','macbookpro16']);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function launchDemo(request,session,owner,fetchImpl=fetch){
 if(!session)return reply({ok:false,error:'unauthorized'},401);
 if(!owner)return reply({ok:false,error:'owner_required'},403);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,error:'origin_denied'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply({ok:false,error:'json_required'},415);
 let body;try{const text=await request.text();if(text.length>512)return reply({ok:false,error:'body_too_large'},413);body=JSON.parse(text);}catch{return reply({ok:false,error:'invalid_json'},400);}
 if(body?.action!=='start'||Object.keys(body).some(k=>k!=='action'))return reply({ok:false,error:'invalid_action'},400);
 const results=await Promise.all(SCREENS.map(async screen=>{
  const commands=[];
  for(const cmd of ['resume','sync']){
   try{const r=await fetchImpl('https://api.admira.store/locations/cmd',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (compatible; AdmiraStudio/1.0)'},body:JSON.stringify({id:screen,screen,cmd})});const data=await r.json();commands.push({cmd,queued:r.ok&&data.ok===true,action:data.action||null});}
   catch{commands.push({cmd,queued:false,action:null});}
  }
  return {screen,commands};
 }));
 return reply({ok:results.every(r=>r.commands.every(c=>c.queued)),queued:true,results});
}
export async function onRequest({request,env}){const session=await sessionInfo(request,env);return launchDemo(request,session,!!session&&esSuperusuario(session));}

import {sessionInfo,esSuperusuario} from './_auth.js';
import {PROGRAM} from './_starbucks-180-program.js';
export const SCREENS=Object.freeze(['macstudio-starbucks-vertical','macstudio-starbucks-horizontal','macstudio-starbucks-vertical-right','macbookpro16']);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function launch180(request,session,owner,fetchImpl=fetch,program=PROGRAM){
 if(!session)return reply({ok:false,error:'unauthorized'},401);
 if(!owner)return reply({ok:false,error:'owner_required'},403);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,error:'origin_denied'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply({ok:false,error:'json_required'},415);
 let body;try{const text=await request.text();if(text.length>512)return reply({ok:false,error:'body_too_large'},413);body=JSON.parse(text);}catch{return reply({ok:false,error:'invalid_json'},400);}
 if(body?.action!=='start'||Object.keys(body).some(k=>k!=='action'))return reply({ok:false,error:'invalid_action'},400);
 if(program.screens?.length!==4||program.screens.some((s,n)=>s.screen!==SCREENS[n]||s.items?.length!==4||s.items.reduce((a,i)=>a+i.seconds,0)!==64||s.items.some(i=>!i.id||!/^https:\/\/api\.admira\.store\/stock\/asset\/[a-zA-Z0-9_-]+$/.test(i.url||''))))return reply({ok:false,error:'program_unavailable'},503);
 const post=async(url,data)=>{try{const r=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (compatible; AdmiraStudio/1.0)'},body:JSON.stringify(data)}),d=await r.json();return {queued:r.ok&&d.ok===true,action:d.action||null};}catch{return {queued:false,action:null};}};
 // Fixed four-player configuration. The request cannot select equipment or supply media URLs.
 const results=await Promise.all(program.screens.map(async s=>({screen:s.screen,playlist:await post('https://brain.digitalavatar.ai/control/playlist',{screen:s.screen+'-tema',items:s.items.map(i=>({id:i.id,title:i.title,type:'video',url:i.url,dur:i.seconds,num:i.stockNumber}))}),commands:[]})));
 if(results.some(r=>!r.playlist.queued))return reply({ok:false,queued:false,error:'playlist_not_confirmed',results},502);
 await Promise.all(results.map(async r=>{for(const cmd of ['resume','sync'])r.commands.push({cmd,...await post('https://api.admira.store/locations/cmd',{id:r.screen,screen:r.screen,cmd})});}));
 return reply({ok:results.every(r=>r.commands.every(c=>c.queued)),queued:true,screens:4,results});
}
export async function onRequest({request,env}){const session=await sessionInfo(request,env);return launch180(request,session,!!session&&esSuperusuario(session));}

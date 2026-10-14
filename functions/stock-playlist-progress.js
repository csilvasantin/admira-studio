import {sessionInfo} from './_auth.js';
import {distributionClients,restrictCatalog} from './stock-playlists.js';
import progress from '../assets/stock-playlist-progress.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(id);
export async function onRequestPost({request,env}){
  const session=await sessionInfo(request,env);if(!session)return reply({ok:false,error:'unauthorized'},401);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,error:'origin_denied'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply({ok:false,error:'json_required'},415);
  let body;try{const raw=await request.text();if(raw.length>65536)return reply({ok:false,error:'body_too_large'},413);body=JSON.parse(raw);}catch{return reply({ok:false,error:'invalid_json'},400);}
  const ids=[...new Set(Array.isArray(body?.ids)?body.ids:[])],cursor=body?.cursor??0;
  if(!ids.length||ids.length>24||!ids.every(validId)||!Number.isInteger(cursor)||cursor<0)return reply({ok:false,error:'invalid_selection'},400);
  if(!env.STOCK_NOTIFY_KEY)return reply({ok:false,error:'unavailable'},503);
  let clients;try{clients=await distributionClients(session,env);}catch{return reply({ok:false,error:'permissions_unavailable'},503);}
  let catalog;try{const r=await fetch('https://admira.tv/api/stock-playlists',{headers:{'X-Notify-Key':env.STOCK_NOTIFY_KEY,'User-Agent':'Mozilla/5.0 (compatible; AdmiraStudio/1.0)'},cache:'no-store',signal:AbortSignal.timeout(20000)});catalog=r.ok?await r.json():null;}catch{}
  if(!catalog?.ok)return reply({ok:false,error:'destinations_unavailable'},503);
  catalog=restrictCatalog(catalog,clients);const allowed=new Set(catalog.rows.map(r=>r.screen));
  const extra=body.extraTargets||{};
  if(typeof extra!=='object'||Array.isArray(extra)||Object.keys(extra).some(id=>!ids.includes(id)||!Array.isArray(extra[id])||extra[id].length>36||extra[id].some(s=>!allowed.has(s))))return reply({ok:false,error:'destination_denied'},403);
  const targets=new Map(ids.map(id=>[id,new Set([...(catalog.assignments||[]).filter(a=>a.stockIds?.includes(id)).map(a=>a.screen),...(extra[id]||[])])]));
  const screens=[...new Set([...targets.values()].flatMap(s=>[...s]))].sort(),page=screens.slice(cursor,cursor+36),cache=new Map();
  await Promise.all(page.map(async screen=>{let value=null;try{const r=await fetch('https://api.admira.store/screen/cache?screen='+encodeURIComponent(screen),{headers:{'User-Agent':'Mozilla/5.0 (compatible; AdmiraStudio/1.0)'},cache:'no-store',signal:AbortSignal.timeout(8000)});const d=r.ok?await r.json():null;if(d?.ok)value=d.cache;}catch{}cache.set(screen,value);}));
  return reply({ok:true,items:ids.map(id=>({id,total:targets.get(id).size,targets:page.filter(s=>targets.get(id).has(s)).map(s=>progress.target(cache.get(s),id,s))})),nextCursor:cursor+36<screens.length?cursor+36:null,checkedAt:Date.now()});
}

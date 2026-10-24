import {sessionInfo} from './_auth.js';
import {distributionClients} from './stock-playlists.js';
import '../assets/stock-sync-core.js';
const S=globalThis.StockSync;
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const TABLE='CREATE TABLE IF NOT EXISTS studio_stock_creatives (id TEXT PRIMARY KEY, rev INTEGER NOT NULL, client_id TEXT NOT NULL, parent_id TEXT NOT NULL UNIQUE, manifest TEXT NOT NULL, updated_at INTEGER NOT NULL)';
export async function onRequest({request,env}){
 const session=await sessionInfo(request,env);if(!session)return reply({ok:false,error:'unauthorized'},401);
 if(!env.AUTH_DB)return reply({ok:false,error:'storage_unavailable'},503);
 let clients;try{clients=await distributionClients(session,env);}catch{return reply({ok:false,error:'permissions_unavailable'},503);}const allowed=id=>clients===null||clients.includes(id);
 if(request.method==='GET'){
  try{const rows=await env.AUTH_DB.prepare('SELECT manifest,rev,client_id FROM studio_stock_creatives').all();return reply({ok:true,creatives:(rows.results||[]).filter(r=>allowed(r.client_id)).map(r=>({...JSON.parse(r.manifest),registryRevision:r.rev}))});}
  catch(e){if(/no such table/i.test(String(e)))return reply({ok:true,creatives:[]});return reply({ok:false,error:'storage_unavailable'},503);}
 }
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,error:'origin_denied'},403);
 let c,body;try{const raw=await request.text();if(raw.length>2000000)throw Error();body=JSON.parse(raw);c=S.validate(body.creative);}catch{return reply({ok:false,error:'invalid_creative'},422);}
 if(!allowed(c.client.id))return reply({ok:false,error:'forbidden'},403);
 // The registry references existing public Stock files. No private campaign JSON,
 // credentials, or device assignment is accepted or exposed here.
 const response=await fetch('https://stock.admira.store/stock/index.json',{cache:'no-store'}).catch(()=>null);
 const catalog=response?.ok?await response.json().catch(()=>null):null;
 const items=Array.isArray(catalog)?catalog:catalog?.items||catalog?.assets;
 if(!Array.isArray(items))return reply({ok:false,error:'stock_unavailable'},503);
 const byId=new Map(items.map(i=>[i.id,i]));
 if([c.stockId,...S.members(c)].some(id=>!byId.has(id)||!(byId.get(id).tags||[]).includes(c.client.id)))return reply({ok:false,error:'stock_members_not_ready'},409);
 try{
  await env.AUTH_DB.prepare(TABLE).run();
  const previous=await env.AUTH_DB.prepare('SELECT rev,client_id FROM studio_stock_creatives WHERE id=?').bind(c.id).first();
  if(previous&&!allowed(previous.client_id))return reply({ok:false,error:'forbidden'},403);
  if(previous&&body.rev!==previous.rev)return reply({ok:false,error:'revision_conflict',rev:previous.rev},409);
  const revision=(previous?.rev||0)+1;
  if(previous){const r=await env.AUTH_DB.prepare('UPDATE studio_stock_creatives SET rev=?,client_id=?,parent_id=?,manifest=?,updated_at=? WHERE id=? AND rev=?').bind(revision,c.client.id,c.stockId,JSON.stringify(c),Date.now(),c.id,previous.rev).run();if(!r.meta?.changes)return reply({ok:false,error:'revision_conflict'},409);}
  else await env.AUTH_DB.prepare('INSERT INTO studio_stock_creatives(id,rev,client_id,parent_id,manifest,updated_at) VALUES(?,?,?,?,?,?)').bind(c.id,revision,c.client.id,c.stockId,JSON.stringify(c),Date.now()).run();
  return reply({ok:true,creative:c,rev:revision},previous?200:201);
 }catch{return reply({ok:false,error:'storage_conflict'},409);}
}

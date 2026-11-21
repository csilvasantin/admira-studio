import {sessionInfo} from './_auth.js';
import {validOffer} from '../assets/voz-oferta.mjs';
const result = (data,status=200) => Response.json(data,{status, headers:{'Cache-Control':'private, no-store'}});
const schema = 'CREATE TABLE IF NOT EXISTS studio_voice_offers (owner TEXT NOT NULL, id TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(owner,id))';

export async function voiceOffers(request, db, session) {
  if (!session?.email) return result({error:'session'},401);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return result({error:'origin'},403);
  if (!db) return result({error:'offline'},503);
  const owner = session.email.toLowerCase();
  try {
    await db.prepare(schema).run();
    if (new URL(request.url).searchParams.get('list') === '1') {
      const rows = await db.prepare('SELECT id, version, data FROM studio_voice_offers WHERE owner=? ORDER BY updated DESC').bind(owner).all();
      return result({offers:rows.results.map(r=>({id:r.id,version:r.version,...JSON.parse(r.data)}))});
    }
    // The paged editor snapshot contains at most 5,000 UTF-16 characters of script.
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return result({error:'invalid'},415);
    const reader = request.body?.getReader();
    if (!reader) return result({error:'invalid'},400);
    const decoder = new TextDecoder(); let bytes=0, raw='';
    try { for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      bytes += value.length; if (bytes > 32000) { await reader.cancel(); return result({error:'too-large'},413); }
      raw += decoder.decode(value,{stream:true});
    }} finally {reader.releaseLock();}
    let body; try {body=JSON.parse(raw+decoder.decode());} catch {return result({error:'invalid'},400);}
    if (!body || !/^[a-f0-9-]{36}$/i.test(body.id || '') || !Number.isSafeInteger(body.version) || body.version<0 || !validOffer(body.offer)) return result({error:'invalid'},400);
    const {name,cents,videoId,videoTitle,script,lang}=body.offer;
    const data=JSON.stringify({name:name.trim(),cents,videoId,videoTitle,script,lang});
    const args=[owner,body.id], now=new Date().toISOString();
    const write=body.version===0
      ? db.prepare('INSERT OR IGNORE INTO studio_voice_offers(owner,id,version,data,updated) VALUES(?,?,1,?,?)').bind(...args,data,now)
      : db.prepare('UPDATE studio_voice_offers SET data=?,updated=?,version=version+1 WHERE owner=? AND id=? AND version=?').bind(data,now,...args,body.version);
    if ((await write.run()).meta.changes) return result({version:body.version+1});
    const latest=await db.prepare('SELECT data,version FROM studio_voice_offers WHERE owner=? AND id=?').bind(...args).first();
    return latest?.data===data && latest.version===body.version+1 ? result({version:latest.version}) : result({error:'conflict'},409);
  } catch {return result({error:'offline'},503);}
}
export async function onRequestPost({request,env}) { return voiceOffers(request,env.AUTH_DB,await sessionInfo(request,env)); }

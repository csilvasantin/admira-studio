import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {onRequestPost} from '../functions/stock-video-voice.js';
import {verifyApiToken} from '../functions/_auth.js';
import {submitStockVoice} from '../assets/stock-import-render.mjs';

const env = {PIXERIA_SIGNING_KEY:'stock-voice-fixture-signing-key', ADMIRA_AGENT_LOGIN_TOKEN:'stock-voice-fixture-agent-token-not-a-real-secret'};
function cookie() {
  const sign = text => createHmac('sha256',env.PIXERIA_SIGNING_KEY).update(text).digest('base64url');
  const now = Math.floor(Date.now()/1000);
  const body = Buffer.from(JSON.stringify({aud:'admira.studio',email:'agentes@silicio.admiranext.com',iat:now,exp:now+600,agent:sign('agente:'+env.ADMIRA_AGENT_LOGIN_TOKEN).slice(0,22)})).toString('base64url');
  return '__Host-pixeria_session='+body+'.'+sign('px:'+body);
}
const request = (body={text:'Hello world',language:'en'},headers={}) => new Request('https://admira.studio/stock-video-voice',{
  method:'POST',headers:{Cookie:cookie(),Origin:'https://admira.studio','Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('voice relay rejects foreign origins, unauthenticated sessions and oversized text before provider calls', async () => {
  assert.equal((await onRequestPost({request:request({}, {Origin:'https://evil.example'}),env})).status,403);
  assert.equal((await onRequestPost({request:request({}, {Cookie:''}),env})).status,401);
  assert.equal((await onRequestPost({request:request({text:'x'.repeat(5001),language:'es'}),env})).status,400);
  assert.equal((await onRequestPost({request:request({text:'Hello',language:'fr'}),env})).status,400);
  assert.equal((await onRequestPost({request:request({text:'x'.repeat(24001),language:'en'}),env})).status,413);
});

test('authenticated relay generates a server token, fixes allowed voice settings and streams only audio', async () => {
  const previous=globalThis.fetch;let captured;
  globalThis.fetch=async(url,init)=>{captured={url,init};return new Response('tts-real-audio',{headers:{'Content-Type':'audio/mpeg','X-Private-Upstream':'not-forwarded'}});};
  try {
    const response=await onRequestPost({request:request({text:' Hola mundo ',language:'es',voice_id:'attacker',model_id:'arbitrary'}),env});
    assert.equal(response.status,200);assert.equal(await response.text(),'tts-real-audio');
    assert.equal(response.headers.get('X-Private-Upstream'),null);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal(captured.url,'https://api.admira.store/tts');
    const signed=await verifyApiToken(captured.init.headers.Authorization.slice(7),env);
    assert.equal(signed.email,'agentes@silicio.admiranext.com');
    const body=JSON.parse(captured.init.body);assert.equal(body.language_code,'es');assert.equal(body.text,'Hola mundo');
    assert.equal(body.model_id,'eleven_multilingual_v2');assert.notEqual(body.voice_id,'attacker');
  } finally {globalThis.fetch=previous;}
});

test('provider errors and non-audio responses are surfaced without publishing success', async () => {
  const previous=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response('private upstream details',{status:429});
    let response=await onRequestPost({request:request(),env});
    assert.equal(response.status,429);assert.equal((await response.json()).error,'voice-provider-429');
    globalThis.fetch=async()=>Response.json({token:'never-forward-this'});
    response=await onRequestPost({request:request(),env});assert.equal(response.status,502);
  } finally {globalThis.fetch=previous;}
});

test('verified preview agent exchanges only at fixed production endpoints, retaining credentials on the server', async () => {
  const previous=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,init={})=>{
    calls.push({url,init});
    if(url==='https://admira.studio/auth/agente')return Response.json({ok:true},{headers:{'Set-Cookie':'__Host-pixeria_session=production-fixture; Path=/; Secure; HttpOnly'}});
    if(url==='https://admira.studio/auth/api-token')return Response.json({ok:true,token:'production-api-fixture'});
    return new Response('audio',{headers:{'Content-Type':'audio/mpeg'}});
  };
  try {
    const req=new Request('https://preview.admira-studio.pages.dev/stock-video-voice',{method:'POST',headers:{Cookie:cookie(),Origin:'https://preview.admira-studio.pages.dev','Content-Type':'application/json'},body:JSON.stringify({text:'Hello',language:'en'})});
    const response=await onRequestPost({request:req,env});assert.equal(response.status,200);
    assert.deepEqual(calls.map(c=>c.url),['https://admira.studio/auth/agente','https://admira.studio/auth/api-token','https://api.admira.store/tts']);
    assert.equal(calls[0].init.headers.Authorization,'Bearer '+env.ADMIRA_AGENT_LOGIN_TOKEN);
    assert.equal(calls[0].init.redirect,'manual');assert.equal(calls[1].init.redirect,'manual');
    assert.equal(calls[1].init.headers.Cookie,'__Host-pixeria_session=production-fixture');
    assert.equal(calls[2].init.headers.Authorization,'Bearer production-api-fixture');
    assert.equal(await response.text(),'audio');assert.equal(response.headers.get('Set-Cookie'),null);
  } finally {globalThis.fetch=previous;}
});

test('browser voice client calls the same-origin relay with bounded public fields and checks audio', async () => {
  let captured;
  const result=await submitStockVoice({brief:'Hello',languages:['ENG']},'',async(url,init)=>{captured={url,init};return new Response('voice',{headers:{'Content-Type':'audio/mpeg'}});});
  assert.equal(captured.url,'/stock-video-voice');assert.deepEqual(JSON.parse(captured.init.body),{text:'Hello',language:'en'});
  assert.equal(captured.init.headers.Authorization,undefined);assert.equal(result.blob.size,5);
  await assert.rejects(submitStockVoice({brief:'Hello',languages:['ENG']},'',async()=>Response.json({ok:true})),/invalid-audio/);
});

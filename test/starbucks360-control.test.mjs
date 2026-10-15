import test from 'node:test';import assert from 'node:assert/strict';
import {launchDemo,SCREENS} from '../functions/starbucks-360.js';
const request=(body={action:'start'},origin='https://admira.studio')=>new Request('https://admira.studio/starbucks-360',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('launch is restricted to an authenticated owner and same-origin JSON; invalid input never reaches players',async()=>{
 let calls=0;const fetcher=()=>{calls++;throw Error('must not send');};
 for(const [session,owner,status] of [[null,false,401],[{email:'viewer'},false,403]])assert.equal((await launchDemo(request(),session,owner,fetcher)).status,status);
 assert.equal((await launchDemo(request({},'https://other.example'),{email:'owner'},true,fetcher)).status,403);
 assert.equal((await launchDemo(request({action:'start',screen:'other'}),{email:'owner'},true,fetcher)).status,400);assert.equal(calls,0);
});
test('only the seven fixed players receive resume then sync; queuing is not reported as confirmed playback',async()=>{
 const sent=[];const r=await launchDemo(request(),{email:'owner'},true,async(url,options)=>{const b=JSON.parse(options.body);sent.push(b);return Response.json({ok:true,action:'action-'+sent.length});});
 const d=await r.json();assert.equal(d.ok,true);assert.equal(sent.length,14);assert.equal(d.queued,true);assert.equal(d.playing,undefined);
 for(const screen of SCREENS)assert.deepEqual(sent.filter(s=>s.screen===screen).map(s=>s.cmd),['resume','sync']);
 assert(sent.every(s=>s.id===s.screen&&SCREENS.includes(s.screen)));
});

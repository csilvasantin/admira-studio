import test from 'node:test';import assert from 'node:assert/strict';
import {launch180,SCREENS} from '../functions/starbucks-180.js';
const req=(body={action:'start'},origin='https://admira.studio')=>new Request('https://admira.studio/starbucks-180',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const program={screens:SCREENS.map(screen=>({screen,items:[24,8,24,8].map((seconds,n)=>({id:screen+'-'+n,url:'https://api.admira.store/stock/asset/test-'+n,seconds,title:'Coffee'}))}))};
test('180 is owner-only, same-origin and cannot be redirected to the MacMini or other hardware',async()=>{
 let calls=0;const fetcher=()=>{calls++;throw Error('must not send');};
 for(const [session,owner,status] of [[null,false,401],[{email:'viewer'},false,403]])assert.equal((await launch180(req(),session,owner,fetcher,program)).status,status);
 assert.equal((await launch180(req({},'https://evil.example'),{},true,fetcher,program)).status,403);
 assert.equal((await launch180(req({action:'start',screen:'macmini-starbucks-vertical'}),{},true,fetcher,program)).status,400);assert.equal(calls,0);
});
test('the four fixed players receive their four-part bilingual programme, then resume and sync; none targets Mini',async()=>{
 const sent=[];const response=await launch180(req(),{},true,async(url,options)=>{sent.push({url,body:JSON.parse(options.body)});return Response.json({ok:true});},program),d=await response.json();
 assert.equal(d.ok,true);assert.equal(d.screens,4);assert.equal(sent.length,12);assert.equal(d.playing,undefined);
 assert.ok(sent.every(x=>!JSON.stringify(x).includes('macmini')));assert.ok(sent.slice(0,4).every(x=>x.url.endsWith('/control/playlist')));
 for(const screen of SCREENS){assert.equal(sent.filter(x=>x.body.screen===screen+'-tema').length,1);assert.deepEqual(sent.filter(x=>x.body.screen===screen).map(x=>x.body.cmd),['resume','sync']);}
});
test('an incomplete native programme or failed playlist save never resumes the players',async()=>{
 let calls=0;assert.equal((await launch180(req(),{},true,()=>{calls++;}, {screens:[]})).status,503);assert.equal(calls,0);
 const sent=[];const r=await launch180(req(),{},true,async(url,options)=>{sent.push(JSON.parse(options.body));return Response.json({ok:false},{status:503});},program);assert.equal(r.status,502);assert.equal(sent.length,4);assert.ok(sent.every(x=>!x.cmd));
});

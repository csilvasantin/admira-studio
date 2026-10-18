import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {finalize} from '../tools/availability-worker/checks.mjs';

async function runtime() {
  const data = new Map();
  let calls = 0;
  const context = vm.createContext({Response,Request,URL,console});
  const module = new vm.SourceTextModule(await readFile(new URL('../tools/availability-worker/worker.mjs',import.meta.url),'utf8'),{context});
  const storage = {
    async get(k){return data.get(k);},
    async put(k,v){if(typeof k==='string')data.set(k,v);else for(const [key,value]of Object.entries(k))data.set(key,value);},
    async delete(keys){for(const key of keys)data.delete(key);},
    async list({prefix,end,reverse,limit}){let rows=[...data].filter(([k])=>k.startsWith(prefix)&&(!end||k<end)).sort(([a],[b])=>a.localeCompare(b));if(reverse)rows.reverse();return new Map(rows.slice(0,limit));},
  };
  let queue=Promise.resolve();
  const ctx={storage,blockConcurrencyWhile(fn){const next=queue.then(fn);queue=next;return next;}};
  const base=new vm.SyntheticModule(['DurableObject'],function(){this.setExport('DurableObject',class{constructor(ctx,env){this.ctx=ctx;this.env=env;}});},{context});
  const checks=new vm.SyntheticModule(['collect','finalize'],function(){
    this.setExport('collect',async()=>{calls++;return {checks:[],errors:['test coverage unavailable']};});
    this.setExport('finalize',finalize);
  },{context});
  await module.link(name=>name==='cloudflare:workers'?base:checks);await module.evaluate();
  const monitor=new module.namespace.AvailabilityMonitor(ctx,{});
  const env={MONITOR:{idFromName:n=>n,get:()=>monitor}};
  return {worker:module.namespace.default,env,data,calls:()=>calls};
}
test('public requests cannot trigger probes, including the private tick path',async()=>{
  const r=await runtime();
  for(const path of ['/tick','/report.json','/notification.json']){
    assert.equal((await r.worker.fetch(new Request('https://example.test'+path,{method:'POST'}),r.env)).status,405);
  }
  assert.equal((await r.worker.fetch(new Request('https://example.test/tick'),r.env)).status,404);
  assert.equal((await r.worker.fetch(new Request('https://example.test/report.json'),r.env)).status,503);
  assert.equal(r.calls(),0);
});
test('scheduled delivery is deduplicated durably and reads do not start work',async()=>{
  const r=await runtime();const waits=[];const ctx={waitUntil:p=>waits.push(p)};
  const scheduledTime=Date.now();
  await Promise.all([r.worker.scheduled({scheduledTime},r.env,ctx),r.worker.scheduled({scheduledTime},r.env,ctx)]);
  await Promise.all(waits);
  assert.equal(r.calls(),1);
  const response=await r.worker.fetch(new Request('https://example.test/report.json'),r.env);
  const report=await response.json();
  assert.equal(report.latest.sequence,1);
  assert.equal(report.latest.scheduler,'cloudflare-cron');
  assert.equal(report.latest.run_url,'https://example.test/report.json?sequence=1');
  await r.worker.fetch(new Request('https://example.test/notification.json'),r.env);
  assert.equal(r.calls(),1);
  const next=[];await r.worker.scheduled({scheduledTime:scheduledTime+300000},r.env,{waitUntil:p=>next.push(p)});await Promise.all(next);
  assert.equal(r.calls(),2);assert.equal(r.data.get('latest').sequence,2);
});
test('notification pages fit the 10KB relay limit and retain all incidents',async()=>{
  const r=await runtime();
  const probe=country=>({country,city:'Test city',asn:3352,network:'Test residential network'});
  const rows=['ES','DE','US'].flatMap(country=>['admira.studio','www.admira.studio'].flatMap(host=>
    ['version','home','login','www','dns-apex','dns-www'].map(check=>({check,host,probe:probe(country),issues:['Unexpected response']}))));
  const latest={schema:2,scheduler:'cloudflare-cron',sequence:50,attempts:[{checks:rows,errors:[]}],
    confirmed_failures:rows,pending_failures:[],run_url:'https://monitor.internal/report.json?sequence=50'};
  r.data.set('latest',latest);
  for(let sequence=1;sequence<=20;sequence++)r.data.set('event:'+String(sequence).padStart(3,'0'),{
    sequence,checked_at:new Date().toISOString(),event:'incident',confirmed_failures:rows,run_url:'https://monitor.internal/report.json?sequence='+sequence});
  const seen=[];let after=0;
  do{
    const response=await r.worker.fetch(new Request('https://example.test/notification.json?after='+after),r.env);
    const body=await response.text();assert.ok(Buffer.byteLength(body)<10000);
    const page=JSON.parse(body);seen.push(...page.history.map(h=>h.sequence));after=page.next_after;
  }while(after);
  assert.deepEqual(seen,Array.from({length:20},(_,i)=>i+1));
});

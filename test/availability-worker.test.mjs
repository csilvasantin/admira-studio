import test from 'node:test';
import assert from 'node:assert/strict';
import {CHECKS, evaluate, finalize, publicIPv4, selectLocations, collect} from '../tools/availability-worker/checks.mjs';
const instant = Date.parse('2026-10-18T21:00:00Z');
const probe = {country:'ES', city:'Sevilla', asn:3352, network:'Telefonica'};
function item(status=401, body='Admira Studio Acceso con Google') {
  return {probe, result:{status:'finished',statusCode:status,rawBody:body,headers:{},
    tls:{authorized:true,subject:{alt:'DNS:admira.studio'},expiresAt:'2027-01-01T00:00:00Z'}}};
}
const attempt = row => ({checked_at:new Date(instant).toISOString(),checks:[row],errors:[]});
const good = () => evaluate(CHECKS[2], item(), instant);
const bad = () => evaluate(CHECKS[2], item(503), instant);
test('expected protected login is healthy; success error page fails',()=>{
  assert.equal(good().outcome,'healthy');
  assert.equal(evaluate(CHECKS[2],item(200),instant).outcome,'down');
});
test('TLS trust, hostname and expiry are enforced',()=>{
  for (const transform of [i=>i.result.tls.authorized=false,i=>i.result.tls.subject.alt='DNS:other.example',
      i=>i.result.tls.expiresAt='2026-01-01T00:00:00Z']) {
    const i=item(); transform(i); assert.equal(evaluate(CHECKS[2],i,instant).outcome,'down');
  }
  const i=item();i.result.tls.expiresAt='2026-10-25T00:00:00Z';
  assert.equal(evaluate(CHECKS[2],i,instant).warnings.length,1);
});
test('redirect must remain on the requested host',()=>{
  const i=item(302);i.result.headers.Location='/auth/login?return_to=%2F';
  assert.equal(evaluate(CHECKS[1],i,instant).outcome,'healthy');
  i.result.headers.Location='https://other.example/auth/login';
  assert.equal(evaluate(CHECKS[1],i,instant).outcome,'down');
});
test('DNS requires a public IPv4 answer',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','100.64.1.2','169.254.1.1','192.168.1.1','172.16.0.1','192.0.2.1','198.18.1.1','203.0.113.1','255.255.255.255','1.2.3.999'])assert.equal(publicIPv4(ip),false,ip);
  assert.equal(publicIPv4('172.66.45.26'),true);
  const i=item(0);i.result.answers=[{type:'A',value:'172.66.45.26'}];
  assert.equal(evaluate(CHECKS[4],i,instant).outcome,'healthy');
  i.result.answers[0].value='127.0.0.1';assert.equal(evaluate(CHECKS[4],i,instant).outcome,'down');
});
test('probe internal errors never become a website outage',()=>{
  const i=item();i.result={status:'failed',failureSource:'internal'};
  const row=evaluate(CHECKS[0],i,instant);assert.equal(row.outcome,'unknown');
  const r=finalize(attempt(row),{},instant,instant);
  assert.equal(finalize(attempt(row),r,instant+300000,instant+300000).availability,'unknown');
  i.result.failureSource='target';assert.equal(evaluate(CHECKS[0],i,instant).outcome,'down');
});
test('one target failure is pending; two consecutive cycles confirm; recovery follows',()=>{
  const first=finalize(attempt(bad()),{},instant,instant);assert.equal(first.availability,'suspect');
  const second=finalize(attempt(bad()),first,instant+300000,instant+300000);
  assert.equal(second.availability,'down');assert.equal(second.event,'incident');
  assert.equal(finalize(attempt(bad()),second,instant+600000,instant+600000).event,'unchanged');
  assert.equal(finalize(attempt(good()),second,instant+600000,instant+600000).event,'recovered');
});
test('old or nonmatching failure cannot confirm an outage',()=>{
  const first=finalize(attempt(bad()),{},instant,instant);
  assert.equal(finalize(attempt(bad()),first,instant+1200000,instant+1200000).availability,'suspect');
  const changed=bad();changed.probe={...probe,country:'US'};
  assert.equal(finalize(attempt(changed),first,instant+300000,instant+300000).availability,'suspect');
  assert.equal(finalize(attempt(good()),first,instant+300000,instant+300000).availability,'healthy');
});
test('coverage failures preserve last known state',()=>{
  const r=finalize({checks:[],errors:['incomplete ES coverage']},{last_known_availability:'down'},instant,instant);
  assert.equal(r.availability,'unknown');assert.equal(r.last_known_availability,'down');
  assert.equal(finalize(attempt(good()),r,instant+300000,instant+300000).event,'recovered');
});
test('only sanitized fields leave the evaluator',()=>{
  const i=item();i.result.headers['set-cookie']='SECRET';i.result.rawBody+='nonce=SECRET';
  const r=evaluate(CHECKS[2],i,instant);
  assert.equal(JSON.stringify(r).includes('SECRET'),false);
});
test('Spain must be residential and prefers Telefonica',async()=>{
  const make=(asn,tags=['eyeball-network'])=>({location:{country:'ES',asn},tags});
  const locations=await selectLocations(async()=>Response.json([make(12479),make(3352),make(1,['datacenter-network'])]));
  assert.equal(locations[0].asn,3352);
  await assert.rejects(()=>selectLocations(async()=>Response.json([make(3352,['datacenter-network'])])));
});
test('quota error is an unknown measurement, never a site failure',async()=>{
  const a=await collect(async()=>new Response('',{status:429}));
  const r=finalize(a,{},instant,instant);assert.equal(r.availability,'unknown');
  assert.equal(r.confirmed_failures.length,0);assert.ok(a.errors.includes('Globalping HTTP 429'));
});

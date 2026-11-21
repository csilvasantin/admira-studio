import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {priceCents,offerLabel,narration,paintOffer} from '../assets/voz-oferta.mjs';
import {voiceOffers} from '../functions/voice-offers.js';

test('un precio decimal alimenta tanto el rótulo como la locución',()=>{
  assert.deepEqual(['2,50','2.5','0,05','0','2.500','-2','','3,','1e2'].map(priceCents),[250,250,5,0,null,null,null,null,null]);
  const offer={name:'Café',cents:350}, labels=[];
  const ctx={save(){},restore(){},fillRect(){},fillText(v){labels.push(v);}};
  paintOffer(ctx,720,1280,offer,'es');
  assert.deepEqual(labels,['Café',offerLabel(offer,'es')]);
  assert.ok(narration('Hoy en tienda.',offer,'es').includes(labels[1]));
  assert.equal(narration('Solo el guion.',null,'es'),'Solo el guion.');
});
test('las ofertas son privadas, editables desde una segunda sesión y resistentes a conflictos y reintentos',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},run(){return {meta:sqlite.prepare(sql).run(...this.args)};},first(){return sqlite.prepare(sql).get(...this.args);},all(){return {results:sqlite.prepare(sql).all(...this.args)};}};}};
  const id=crypto.randomUUID(), offer={name:'Café',cents:350,videoId:'clip-1',videoTitle:'Café del día',script:'Hoy.',lang:'es'};
  async function call(owner,body) {
    const r=await voiceOffers(new Request('https://admira.studio/voice-offers'+(body?'':'?list=1'),{method:'POST',headers:{Origin:'https://admira.studio','Content-Type':'application/json'},body:body&&JSON.stringify(body)}),db,owner?{email:owner}:null);
    return [r.status,await r.json()];
  }
  assert.equal((await call(null))[0],401);
  assert.deepEqual(await call('a',{id,version:0,offer}),[200,{version:1}]);
  assert.deepEqual(await call('b'),[200,{offers:[]}]);
  const row=(await call('a'))[1].offers[0];
  const change={id,version:row.version,offer:{...offer,cents:395}};
  assert.deepEqual(await call('a',change),[200,{version:2}]);
  assert.deepEqual(await call('a',change),[200,{version:2}]);
  assert.equal((await call('a',{...change,offer:{...offer,cents:420}}))[0],409);
  assert.equal((await call('a'))[1].offers[0].cents,395);
  sqlite.close();
});

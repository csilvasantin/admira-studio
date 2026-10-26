import test from 'node:test';
import assert from 'node:assert/strict';
import {maybeSubtitle, qualifiesTranslation} from '../assets/capsula-traduce.mjs';
import {maybeGenerateAlternate, requestedTargets, qualifies, formatVideoJob, alternateTags} from '../assets/capsula-alterna.mjs';

test('formatos explícitos: horizontal/vertical exactos, ambos desde cuadrado y sin duplicar el formato existente',()=>{
  assert.deepEqual(requestedTargets(1920,1080,'both').map(t=>t.format),['9:16']);
  assert.deepEqual(requestedTargets(720,1280,'both').map(t=>t.format),['16:9']);
  assert.deepEqual(requestedTargets(1000,1000,'both').map(t=>t.format),['9:16','16:9']);
  assert.equal(requestedTargets(720,1280,'vertical').length,0);
  assert.equal(requestedTargets(720,960,'vertical').length,1);
  const it={type:'video',tags:['capsula','negocio','sin-subtitulos','formato-original'],comment:'#traduce'};
  assert.equal(qualifies(it),false);assert.equal(qualifiesTranslation(it),false);
});
test('adaptación mantiene imagen completa en primer plano, voz copiada y cadencia sin forzar',()=>{
  const job=formatVideoJob({w:640,h:360,d:3},{W:180,H:320});
  assert.equal(job.args[job.args.indexOf('-c:a')+1],'copy');
  assert.equal(job.args[job.args.indexOf('-crf')+1],'18');
  assert.ok(!job.args.includes('-r'));assert.ok(!job.args.includes('-b:a'));
  assert.match(job.args[job.args.indexOf('-filter_complex')+1],/\[b\]scale=180:102/);
  const tags=alternateTags(['capsula','subtitulado-es','adaptar-ambos','cliente'],{orient:'vertical',format:'9:16'},'original');
  for(const tag of ['capsula','subtitulado-es','cliente','9:16','par-original','formato-alterno'])assert.ok(tags.includes(tag));
  assert.ok(!tags.includes('adaptar-ambos'));
});
function formatHarness(items=[]) {
  const calls={renders:[],published:[]};
  const ctx={items,engine:{},mediaSize:async()=>({w:1000,h:1000,d:3}),
    render:async(it,target)=>{calls.renders.push(target.format);return new Blob(['video']);},
    publish:async(blob,meta,extra)=>{calls.published.push({meta,extra});return {ok:true,id:'format-'+meta.format};},
    onCreated:async(id,item)=>{items.push({...item,url:'https://media.test/'+id});}};
  return {ctx,calls};
}
test('ambos genera dos destinos desde cuadrado, respeta originales y se deduplica por formato',async()=>{
  const it={id:'square',url:'https://media.test/source',type:'video',tags:['capsula','sin-subtitulos','adaptar-ambos','cliente']};
  const before=structuredClone(it),{ctx,calls}=formatHarness();
  const r=await maybeGenerateAlternate(it,ctx);assert.equal(r.ok,true);assert.equal(r.generated.length,2);
  assert.deepEqual(calls.renders,['9:16','16:9']);assert.deepEqual(it,before);
  assert.deepEqual(await maybeGenerateAlternate(it,ctx),{skipped:'ya-existe'});
  assert.equal(calls.published.length,2);
});
test('subtítulos y formato se ejecutan en orden con una sola transcripción',async()=>{
  const it={id:'english',type:'video',url:'https://media.test/source',tags:['capsula','subtitulos-es','adaptar-vertical']};
  const {ctx,calls}=formatHarness();ctx.mediaSize=async()=>({w:640,h:360,d:3});
  assert.deepEqual(await maybeGenerateAlternate(it,ctx),{skipped:'espera-subtitulos'});
  let aiCalls=0;
  const result=await maybeSubtitle(it,{items:ctx.items,videoMeta:ctx.mediaSize,
    engine:{encode:async(url,job,status,done)=>done({},new Blob(['data']))},
    fetch:async()=>{aiCalls++;return Response.json({ok:true,from:'en',to:'es',cues:[{start:0,end:2,text:'Hola.'}]});},
    publish:async()=>({ok:true,id:'spanish'}),
    onCreated:async(id,item)=>{ctx.items.push(item);await maybeGenerateAlternate({...item,url:'https://media.test/'+id},ctx);}});
  assert.equal(result.ok,true);assert.equal(aiCalls,1);assert.deepEqual(calls.renders,['9:16']);
  assert.ok(calls.published[0].extra.tags.includes('subtitulado-es'));
  assert.equal(calls.published[0].extra.externalRef,'spanish');
  assert.deepEqual(await maybeSubtitle(it,{items:ctx.items}),{skipped:'ya-existe'});
});
test('si falla el segundo formato, al reintentar se conserva el primero y solo se genera el pendiente',async()=>{
  const it={id:'partial',url:'https://media.test/source',type:'video',tags:['sin-subtitulos','adaptar-ambos']};
  const {ctx,calls}=formatHarness();const publish=ctx.publish;let fail=true;
  ctx.publish=async(blob,meta,extra)=>meta.format==='16:9'&&fail ? {ok:false,error:'publish'} : publish(blob,meta,extra);
  assert.equal((await maybeGenerateAlternate(it,ctx)).ok,false);assert.equal(ctx.items.length,1);
  fail=false;assert.equal((await maybeGenerateAlternate(it,ctx)).ok,true);
  assert.deepEqual(calls.renders,['9:16','16:9','16:9']);
  assert.equal(calls.published.length,2);
});

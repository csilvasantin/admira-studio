import test from 'node:test';
import assert from 'node:assert/strict';
import {subtitleLayout,subtitlePlans,subtitleVideoJob} from '../assets/subtitle-layout.mjs';
import {maybeSubtitle} from '../assets/capsula-traduce.mjs';

test('cada orientación usa su resolución final, dos líneas y márgenes seguros',()=>{
  const cues=[{start:0,end:8,text:'Esta es una frase suficientemente larga para comprobar que el texto se parte en bloques legibles sin ocupar más de dos líneas.'}];
  for(const [w,h]of[[1080,1920],[1920,1080]]){
    const layout=subtitleLayout(cues,w,h);
    assert.match(layout.ass,new RegExp('PlayResX: '+w+'\\nPlayResY: '+h));
    assert.ok(layout.cues.every(c=>c.text.split('\n').length<=2));
    assert.equal(layout.cues[0].start,0);assert.ok(Math.abs(layout.cues.at(-1).end-8)<.001);
  }
  assert.equal(subtitlePlans(720,1280,'both')[0].W,720);
  const same=subtitleVideoJob({w:720,h:1280,d:2},{W:720,H:1280});
  assert.ok(same.args.includes('0:v:0'));assert.ok(same.args.includes('0:a?'));
});
test('texto no puede introducir instrucciones de ASS y las frases ilegibles requieren revisión',()=>{
  const a=subtitleLayout([{start:0,end:5,text:'Hola {\\pos(1,2)} mundo.'}],1080,1920).ass;
  assert.ok(!a.includes('{\\pos'));assert.ok(a.includes('｛＼pos'));
  assert.throws(()=>subtitleLayout([{start:1,end:1.04,text:'Adiós.'}],1080,1920),/subtitle-review-required/);
});
test('une fragmentos contiguos demasiado breves sin cambiar palabras ni tiempos exteriores',()=>{
  const source=[{start:0,end:.06,text:'Las vacas'},{start:.06,end:3,text:'no saben que existe el dinero.'},{start:3,end:3.05,text:'Pero'},{start:3.05,end:6,text:'nosotros sí lo sabemos.'}];
  const before=structuredClone(source);
  for(const [w,h] of [[1080,1920],[1920,1080]]){
    const layout=subtitleLayout(source,w,h);
    assert.equal(layout.mergedSegments,2);
    assert.equal(layout.cues.map(c=>c.text).join(' ').replace(/\s+/g,' '),source.map(c=>c.text).join(' '));
    assert.equal(layout.cues[0].start,0);assert.equal(layout.cues.at(-1).end,6);
    assert.ok(layout.cues.every(c=>c.end-c.start>=.3&&c.text.split('\n').length<=2));
  }
  assert.deepEqual(source,before);
});
test('el ajuste automático no rellena silencios ni acepta diálogo que sigue siendo demasiado rápido',()=>{
  assert.throws(()=>subtitleLayout([{start:0,end:3,text:'Una frase normal.'},{start:4,end:4.05,text:'Adiós.'}],1080,1920),/subtitle-review-required/);
  assert.throws(()=>subtitleLayout([{start:0,end:.04,text:'Esta frase es demasiado rápida.'},{start:.04,end:.1,text:'Y esta tampoco tiene tiempo de lectura.'}],1080,1920),/subtitle-review-required/);
  const cues=[{start:0,end:3,text:'Una frase normal.'},{start:3,end:6,text:'Otra frase normal.'}];
  const result=subtitleLayout(cues,1080,1920);
  assert.equal(result.mergedSegments,0);assert.deepEqual(result.cues,cues);
});
test('ambos se publica por proporción y al reintentar solo falta el segundo, con una transcripción por intento',async()=>{
  const it={id:'two-formats',url:'https://media.test/video',type:'video',tags:['capsula','subtitulos-es','adaptar-ambos']};
  const items=[],published=[];let fail=true,requests=0;
  const ctx={items,videoMeta:async()=>({w:320,h:240,d:2}),engine:{encode:async(u,j,s,done)=>done({},new Blob(['media']))},
    fetch:async()=>{requests++;return Response.json({ok:true,from:'en',to:'es',cues:[{start:0,end:1.8,text:'Hola, mundo.'}]});},
    publish:async(blob,meta,extra)=>{if(meta.format==='16:9'&&fail)return {ok:false,error:'publish'};published.push(meta.format);return {ok:true,id:'subtitle-'+meta.format};},
    onCreated:async(id,item)=>items.push(item)};
  assert.equal((await maybeSubtitle(it,ctx)).ok,false);assert.deepEqual(published,['9:16']);
  fail=false;assert.equal((await maybeSubtitle(it,ctx)).ok,true);assert.deepEqual(published,['9:16','16:9']);
  assert.deepEqual(await maybeSubtitle(it,ctx),{skipped:'ya-existe'});assert.equal(requests,2);
});
test('una respuesta automática con fragmentos contiguos cortos produce los dos formatos con trazabilidad',async()=>{
  const published=[];let calls=0;
  const r=await maybeSubtitle({id:'fresh-short-fragments',url:'https://media.test/fresh-video',type:'video',tags:['subtitulos-es','adaptar-ambos']},
    {items:[],videoMeta:async()=>({w:1080,h:1080,d:3}),engine:{encode:async(u,j,s,done)=>done({},new Blob(['media']))},
      fetch:async()=>{calls++;return Response.json({ok:true,from:'en',to:'es',cues:[{start:0,end:.06,text:'Las vacas'},{start:.06,end:3,text:'no saben que existe el dinero.'}]});},
      publish:async(blob,meta,extra)=>{published.push({meta,extra});return {ok:true,id:'fresh-'+meta.format};}});
  assert.equal(r.ok,true);assert.equal(calls,1);
  assert.deepEqual(published.map(p=>[p.meta.width,p.meta.height]),[[1080,1920],[1920,1080]]);
  for(const {extra} of published){assert.match(extra.comment,/Workers AI.*ajuste automático de tiempos: 1 fragmentos unidos/);assert.match(extra.comment,/Las vacas no saben/);}
});
test('si la traducción no es legible no publica ninguno de los dos formatos',async()=>{
  let writes=0;const statuses=[];
  const r=await maybeSubtitle({id:'bad-cues',url:'https://media.test/video',type:'video',tags:['subtitulos-es','adaptar-ambos']},
    {items:[],videoMeta:async()=>({w:320,h:240,d:2}),engine:{},subtitleData:{ok:true,from:'en',to:'es',cues:[{start:0,end:.04,text:'Adiós.'}]},publish:async()=>{writes++;},onStatus:s=>statuses.push(s)});
  assert.equal(r.error,'subtitle-review-required');assert.equal(writes,0);
  assert.deepEqual(r.review,{start:0,end:.04,text:'Adiós.'});assert.ok(statuses.some(s=>s.includes('0.00–0.04 s: «Adiós.»')));
});

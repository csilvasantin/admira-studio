import test from 'node:test';
import assert from 'node:assert/strict';
import {executeStockGesture, gestureVideoJob, normalizeGesture, gestureSourceURL} from '../assets/stock-import-render.mjs';

const item = {id:'youtube-real', type:'video', title:'Imported video', url:'https://stock.example/video.mp4', tags:['capsula','negocio','horizontal']};
const meta = {w:320,h:240,d:19};
const request = {gesture:'adapt', sourceLanguage:'en', targetLanguage:'es', subtitles:'none', brand:{mode:'white-label',name:'Starbucks'}, cards:{initial:true,final:true}};

test('encoder uses canonical CORS asset bytes separately from the cached R2 playback URL', () => {
  assert.equal(gestureSourceURL(item),'https://api.admira.store/stock/asset/youtube-real');
});

test('adaptation graph changes ratio, brackets the complete body with brand cards, and offsets audio', () => {
  const job = gestureVideoJob(meta, request);
  assert.equal(job.W,720); assert.equal(job.H,1280); assert.equal(job.durationSeconds,23);
  const graph = job.args[job.args.indexOf('-filter_complex')+1];
  assert.match(graph,/\[initial\]\[body\]\[final\]concat=n=3/);
  assert.ok(job.args.includes('adelay=2000:all=1,apad'));
  assert.ok(job.args.includes('0:a?'));
  assert.ok(!job.args.includes('-shortest'));
});

test('voice preserves a longer narration by extending the image instead of truncating speech', () => {
  const job = gestureVideoJob(meta,{...request,gesture:'voice'},{voiceDuration:25,subtitles:true});
  assert.equal(job.durationSeconds,29);
  assert.ok(job.args.includes('2:a:0'));
  assert.match(job.args[job.args.indexOf('-filter_complex')+1],/tpad=stop_mode=clone:stop_duration=6.000/);
  assert.throws(()=>normalizeGesture({...request,gesture:'voice',targetLanguage:'en'}),/voice-opposite/);
});

test('long input is rejected before a paid service or publication is called', async () => {
  let called=false;
  await assert.rejects(executeStockGesture(item,request,{engine:{},videoMeta:async()=>({...meta,d:181}),fetch:async()=>{called=true;}}),/too-long/);
  assert.equal(called,false);
});

function engine() {
  const jobs=[];
  return {jobs, async encode(url,job,status,result) {jobs.push(job); result({},new Blob(['encoded media']));}};
}

test('adapt gesture publishes actual encoder output as a new related Stock version', async () => {
  const worker=engine(); let publication;
  const result=await executeStockGesture(item,request,{engine:worker,videoMeta:async()=>meta,
    brandCard:async brand=>{assert.equal(brand.name,'Starbucks');return new Blob(['png']);},
    publish:async(blob,metadata,extra)=>{publication={blob,metadata,extra};return {ok:true,id:'new-video'};}});
  assert.equal(result.id,'new-video'); assert.equal(result.item.externalRef,item.id);
  assert.equal(publication.metadata.duration,23); assert.equal(publication.metadata.width,720);
  assert.equal(publication.extra.tags.includes('horizontal'),false);
  assert.ok(publication.extra.tags.includes('sin-subtitulos'));
  assert.ok(worker.jobs[0].extraFiles.some(f=>f.name==='brand.png'));
  assert.equal(await publication.blob.text(),'encoded media');
});

test('subtitle original uses source language and retains source words and timings', async () => {
  const worker=engine();let payload;let published=false;
  const result=await executeStockGesture(item,{...request,gesture:'subtitle',subtitles:'original',cards:{initial:false,final:false}}, {
    engine:worker, videoMeta:async()=>meta,
    fetch:async(url,init)=>{payload=JSON.parse(init.body);return Response.json({ok:true,from:'en',to:'en',cues:[{start:0,end:3,text:'Here are the elephants.',source:'Here are the elephants.'}]});},
    publish:async()=>{published=true;return {ok:true,id:'subbed'};}});
  assert.equal(payload.from,'en'); assert.equal(payload.to,'en'); assert.ok(published);assert.equal(result.id,'subbed');
  assert.equal(worker.jobs.length,2);assert.ok(worker.jobs[1].extraFiles.some(f=>f.name==='subs.ass'));
  assert.ok(result.item.tags.includes('subtitulado-en'));
});

test('Adapt translate selects the opposite subtitle language even if the per-gesture selector still shows source', async () => {
  let payload;
  const result=await executeStockGesture({...item,tags:[...item.tags,'adaptar-vertical','translate','formato-original']},
    {...request,targetLanguage:'en',subtitles:'translate',cards:{initial:false,final:false}}, {
      engine:engine(),videoMeta:async()=>meta,
      fetch:async(url,init)=>{payload=JSON.parse(init.body);return Response.json({ok:true,from:'en',to:'es',cues:[{start:0,end:3,text:'Aquí están los elefantes.',source:'Here are the elephants.'}]});},
      publish:async()=>({ok:true,id:'adapt-translated'})});
  assert.equal(payload.to,'es');assert.ok(result.item.tags.includes('subtitulado-es'));
  assert.ok(result.item.tags.includes('formato-original'));
  assert.ok(!result.item.tags.includes('translate'));
  assert.ok(!result.item.tags.includes('adaptar-vertical'));
});

test('locution transcribes into opposite language, obtains real TTS audio and maps that track', async () => {
  const worker=engine();let spoken;
  const result=await executeStockGesture(item,{...request,gesture:'voice',cards:{initial:false,final:false}}, {
    engine:worker,videoMeta:async()=>meta,
    fetch:async()=>Response.json({ok:true,from:'en',to:'es',cues:[{start:0,end:3,text:'Aquí están los elefantes.',source:'Here are the elephants.'}]}),
    voicePreflight:async()=> 'token-not-logged',submitVoice:async job=>{spoken=job;return {blob:new Blob(['real tts'])};},audioDuration:async()=>20,
    publish:async()=>({ok:true,id:'voiced'})});
  assert.equal(spoken.languages[0],'ESP');assert.equal(spoken.brief,'Aquí están los elefantes.');
  assert.ok(worker.jobs[1].args.includes('1:a:0'));assert.equal(result.item.validacion.duracion,20);
  assert.ok(result.item.tags.includes('locutado-es'));
});

test('transcription and encoder failures never publish an unchanged source as success', async () => {
  let published=false;
  await assert.rejects(executeStockGesture(item,{...request,gesture:'subtitle',subtitles:'original'}, {
    engine:engine(),videoMeta:async()=>meta,fetch:async()=>Response.json({ok:false,error:'whisper'},{status:502}),publish:async()=>{published=true;}}),/whisper/);
  assert.equal(published,false);
  await assert.rejects(executeStockGesture(item,request,{engine:{encode:async()=>{throw Error('encoding');}},videoMeta:async()=>meta,brandCard:async()=>new Blob(['png']),publish:async()=>{published=true;}}),/encoding/);
  assert.equal(published,false);
});

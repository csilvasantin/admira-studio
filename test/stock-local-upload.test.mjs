import test from 'node:test';import assert from 'node:assert/strict';
import {validateLocalFiles,localMedia,localTags,MAX_LOCAL_BYTES} from '../assets/stock-local-files.mjs';
import {publishLocalFile} from '../assets/stock-local-publish.mjs';
import {onRequestPost as start} from '../functions/stock-upload/[accion].js';
const file=(name='video.mp4',size=100,type='video/mp4')=>({name,size,type});
test('máximo5 y100MB POR ARCHIVO: cinco de100MB caben, sexto o un byte adicional rechaza el lote',()=>{
 assert.equal(validateLocalFiles(Array.from({length:5},(_,i)=>file(i+'.mp4',MAX_LOCAL_BYTES))), '');
 assert.match(validateLocalFiles(Array.from({length:6},()=>file())),/5 archivos/);
 assert.match(validateLocalFiles([file(),file('large.mp4',MAX_LOCAL_BYTES+1)]),/100 MB por archivo/);
 assert.match(validateLocalFiles([file('empty.mp4',0)]),/vacío/);assert.match(validateLocalFiles([file('data.pdf',20,'application/pdf')]),/compatible/);
 assert.deepEqual(localMedia(file('clip.MP4',20,'')),{type:'video',mime:'video/mp4'});assert.equal(localMedia(file('unknown.bin',20,'')),null);assert.deepEqual(localTags('#starbucks #hilomusical, #starbucks'),['starbucks','hilomusical']);
});
test('límite local también en inicio servidor: exacto100MB permitido, exceso no llama al Stock; Adaptador conserva su tope',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{calls.push({u,body:JSON.parse(init.body)});return Response.json({ok:true,key:'uploads/test-file.mp4'});});
 const run=(size,motor='local')=>start({request:new Request('https://admira.studio/stock-upload/start',{method:'POST',body:JSON.stringify({size,motor,type:'video',mime:'video/mp4'})}),env:{},params:{accion:'start'}});
 assert.equal((await run(MAX_LOCAL_BYTES)).status,200);assert.equal((await run(MAX_LOCAL_BYTES+1)).status,413);assert.equal(calls.length,1);assert.equal((await run(200_000_000,'adaptador')).status,200);
});
globalThis.FileReader??=class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onload();});}};
test('publicación conserva imagen/audio/video, comentarios y etiquetas, usa mismo origen y sólo retorna éxito confirmado',async()=>{
 for(const type of ['image/png','audio/mpeg','video/mp4']){
  const f=new File(['content'],'sample.'+(type==='image/png'?'png':type==='audio/mpeg'?'mp3':'mp4'),{type});let body;
  const r=await publishLocalFile(f,{tags:['test'],comment:'Music1982',dimensions:async()=>({width:1080,height:1920}),sample:async()=>['data:image/jpeg;base64,AA=='],fetch:async(url,init)=>{assert.equal(url,'/stock-publish');body=JSON.parse(init.body);return Response.json({ok:true,id:'saved',num:20,url:'https://stock.admira.store/stock/saved/asset',tags:['test','vertical']});}});
  assert.equal(body.type,type.split('/')[0]);assert.equal(body.comment,'Music1982');assert.deepEqual(body.tags,['test']);assert.equal(body.motor,'local');assert.ok(body.base64);assert.equal(r.id,'saved');assert.equal(r.num,20);assert.equal(r.base64,undefined);
 }
 await assert.rejects(()=>publishLocalFile(new File(['x'],'test.png',{type:'image/png'}),{dimensions:async()=>null,fetch:async()=>Response.json({ok:false,error:'failed'},{status:503})}),/failed/);
 let called=false;await assert.rejects(()=>publishLocalFile(file('too-big.mp4',MAX_LOCAL_BYTES+1),{fetch:()=>{called=true;}}),/100 MB/);assert.equal(called,false);
});
test('archivo grande viaja en partes, no base64, y publicar espera a complete',async()=>{
 const f=new File([new Uint8Array(9*1024*1024)],'large.mp4',{type:'video/mp4'}),calls=[];
 const r=await publishLocalFile(f,{dimensions:async()=>null,sample:async()=>[],fetch:async(url,init)=>{calls.push(url);if(url.endsWith('/start'))return Response.json({ok:true,key:'uploads/large-file.mp4',uploadId:'upload-test',partSize:5*1024*1024});if(url.includes('/part?'))return Response.json({etag:'etag-'+new URL(url,'https://test').searchParams.get('n')});if(url.endsWith('/complete'))return Response.json({ok:true,size:f.size});assert.equal(url,'/stock-publish');const body=JSON.parse(init.body);assert.equal(body.r2Staged,'uploads/large-file.mp4');assert.equal(body.base64,undefined);return Response.json({ok:true,id:'large',url:'https://stock.admira.store/stock/large/asset.mp4'});}});
 assert.equal(r.id,'large');assert.equal(calls.at(-2),'/stock-upload/complete');assert.equal(calls.at(-1),'/stock-publish');assert.equal(calls.filter(x=>x.includes('/part?')).length,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolveMedia} from '../functions/stock-link-media.js';

const ext='extensions/admira-studio-importer/';
const sandbox={URL}; vm.createContext(sandbox);
for(const f of ['media-link.js','shared.js'])vm.runInContext(readFileSync(ext+f,'utf8'),sandbox);
const post='https://lnkd.in/p/eSanFgAY';
test('publicación real, archivos directos y búsquedas de YouTube conservan sus rutas',()=>{
  for(const url of [post,'https://cdn.example.com/photo.jpg','https://cdn.example.com/song.mp3','https://cdn.example.com/v.mp4?q=a,b;c']) {
    const ref=new URL(sandbox.AdmiraImporter.handoffUrl({url,format:'video',projectId:'cafeteria',comment:'Novedad',tags:'demo'}));
    assert.equal(ref.searchParams.get('importUrl'),url);
    assert.equal(ref.searchParams.get('importFormat'),'auto');
    assert.equal(ref.searchParams.get('importTags'),'proyecto-cafeteria, demo');
    assert.equal(ref.searchParams.get('importComment'),'Novedad');
  }
  for(const url of ['file:///a','https://127.0.0.1/a','http://host.local/','https://user:secret@example.org/a']) assert.equal(sandbox.AdmiraImporter.handoffUrl({url}),'');
});
test('archivos directos, redirección corta y fallo recuperable conservan el tipo real',async()=>{
  for (const mime of ['image/jpeg','video/mp4','audio/mpeg']) {
    const seen=[],get=async(url,init)=>{
      seen.push(url);assert.equal(init.redirect,'manual');assert.equal(init.credentials,'omit');
      if(url===post)return Response.redirect('https://www.linkedin.com/posts/public',302);
      return new Response('asset',{headers:{'Content-Type':mime}});
    };
    const r=await resolveMedia(post,get);
    assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),mime);assert.equal(await r.text(),'asset');assert.equal(seen.length,2);
  }
  const bad=await resolveMedia(post,async()=>new Response('login',{status:403}));assert.equal(bad.status,422);
  await assert.rejects(()=>resolveMedia(post,async()=>Response.redirect('http://localhost/secret',302)));
  const big=await resolveMedia(post,async()=>new Response('a',{headers:{'Content-Type':'image/jpeg','Content-Length':'200000000'}}));
  assert.equal(big.status,413);
});
test('un post con imagen se entrega como imagen y una página sin medios devuelve error',async()=>{
  const get=async u=>u.endsWith('/art')?new Response('pic',{headers:{'content-type':'image/webp'}}):new Response('<html>',{headers:{'content-type':'text/html'}});
  const media=await resolveMedia(post,get,()=>['https://cdn.example.org/art']);
  assert.equal(media.headers.get('content-type'),'image/webp');assert.equal(await media.text(),'pic');
  assert.equal((await resolveMedia(post,get,()=>[])).status,422);
});

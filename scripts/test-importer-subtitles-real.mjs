// Explicit real-provider integration test for Carlos's already-imported clip.
// Never deploys, installs an extension, updates source tags or deletes media.
// Authentication is isolated to this in-process test handler, not a production
// Studio session. Workers AI inference and optional Stock publication are real.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import {maybeSubtitle} from '../assets/capsula-traduce.mjs';
import {onRequestPost as subtitles} from '../functions/stock-subtitles.js';
import {onRequestPost as publish} from '../functions/stock-publish.js';
import {publishAdaptation} from '../adaptaciones/stock-publish.mjs';

const out='/tmp/importer-subtitles-real';
const source={id:'1793037808156-6vymvy',url:'https://stock.admira.store/stock/1793037808156-6vymvy/asset.mp4?v=744412',title:'Me at the zoo',type:'video',tags:['prueba-importer-20261026','subtitulos-es']};
const report={sourceId:source.id,sourceUrl:source.url,installedExtensionModified:false,productionDeployed:false,applicationSession:'isolated test session; production UI metadata failure recorded separately',inference:'real Cloudflare Workers AI',stockWrites:0};
await mkdir(out,{recursive:true});
const runtime=new URL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/');
const f=globalThis.fetch;
const env={PIXERIA_SIGNING_KEY:randomBytes(32).toString('hex'),ADMIRA_AGENT_LOGIN_TOKEN:randomBytes(32).toString('hex')};
function cookie(){
 const sign=s=>createHmac('sha256',env.PIXERIA_SIGNING_KEY).update(s).digest('base64url'),now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({aud:'admira.studio',email:'agentes@silicio.admiranext.com',agent:sign('agente:'+env.ADMIRA_AGENT_LOGIN_TOKEN).slice(0,22),iat:now,exp:now+600})).toString('base64url');
 return '__Host-pixeria_session='+payload+'.'+sign('px:'+payload);
}
env.AI={async run(model,input){
 const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
 if(!token||!account)throw new Error('Workers AI credentials are unavailable in this test environment');
 const r=await f(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(90000)});
 const d=await r.json();
 if(!r.ok||d.success===false)throw new Error(`Workers AI request failed (HTTP ${r.status}; code ${d.errors?.[0]?.code||'unknown'})`);
 return d.result;
}};

try{
 const src=await f(source.url,{headers:{'User-Agent':'Mozilla/5.0'}});assert.equal(src.status,200);const bytes=new Uint8Array(await src.arrayBuffer());assert.equal(bytes.length,744412);
 await writeFile(path.join(out,'original.mp4'),bytes);
 for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm']){const r=await f(new URL(name,runtime));assert.ok(r.ok);await writeFile(path.join(out,name==='ffmpeg-core.js'?'ffmpeg-core.cjs':name),new Uint8Array(await r.arrayBuffer()));}
 globalThis.self={location:{href:new URL('file://'+out+'/ffmpeg-core.cjs').href}};
 const core=await createRequire(import.meta.url)(path.join(out,'ffmpeg-core.cjs'))({wasmBinary:await readFile(path.join(out,'ffmpeg-core.wasm'))});
 core.setLogger(()=>{});core.FS.writeFile('input',bytes);
 const probe=file=>{
  try{core.FS.unlink('probe.json');}catch{}
  core.ffprobe('-v','error','-show_streams','-show_format','-of','json','-o','probe.json',file);core.reset();
  const d=JSON.parse(core.FS.readFile('probe.json',{encoding:'utf8'}));
  assert.ok(d.streams.length&&Number.isFinite(+d.format.duration));return d;
 };
 const before=probe('input'),v=before.streams.find(s=>s.codec_type==='video');
 const hash=file=>{
  core.exec('-i',file,'-map','0:a:0','-c:a','copy','-f','hash','-hash','SHA256','audio.hash');
  const code=core.ret;core.reset();assert.equal(code,0);
  return core.FS.readFile('audio.hash',{encoding:'utf8'}).trim();
 };
 const engine={async encode(url,job,onStatus,onResult){
  for(const x of job.extraFiles||[]){if(x.name.includes('/'))try{core.FS.mkdir(x.name.split('/')[0]);}catch{}
   const b=x.url.startsWith('/assets/')?new Uint8Array(await readFile(path.resolve('.'+x.url))):new Uint8Array(await(await f(x.url)).arrayBuffer());core.FS.writeFile(x.name,b);}
  core.exec(...job.args);const code=core.ret;core.reset();assert.equal(code,0,'WASM encode must succeed');
  const file=job.outputs?.[0]?.file||'output.mp4';onResult({},new Blob([core.FS.readFile(file)],{type:job.outputs?'audio/mpeg':'video/mp4'}));
 }};
 // FileReader's only use here is the browser publisher's real base64 conversion.
 globalThis.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onload();}).catch(e=>{this.error=e;this.onerror?.();});}};
 const request=(url,init)=>new Request('https://www.admira.studio'+url,{...init,headers:{...init.headers,Origin:'https://www.admira.studio',Cookie:cookie()}});
 const workerFetch=async(url,init)=>{
  if(url==='/stock-subtitles'){
   const r=await subtitles({request:request(url,init),env});
   const d=await r.clone().json();
   if(d.ok){await writeFile(path.join(out,'subtitles-es.srt'),d.srt);await writeFile(path.join(out,'transcription-translation.json'),JSON.stringify(d,null,2));report.cues=d.cues.length;}
   else report.providerFailure={error:d.error,detail:d.detail||null};
   return r;
  }
  if(url==='/stock-publish')return publish({request:request(url,init),env});
  return f(url,init);
 };
 const result=await maybeSubtitle(source,{items:[],videoMeta:async()=>({w:v.width,h:v.height,d:+before.format.duration}),engine,fetch:workerFetch,
  onStatus:message=>console.log(message),publish:async(blob,meta,extra)=>{
   await writeFile(path.join(out,'me-at-the-zoo-subtitulos-castellano.mp4'),new Uint8Array(await blob.arrayBuffer()));
   const after=probe('output.mp4'),a=after.streams.find(s=>s.codec_type==='video');
   assert.equal(hash('input'),hash('output.mp4'));
   assert.equal(a.width,v.width);assert.equal(a.height,v.height);assert.equal(a.avg_frame_rate,v.avg_frame_rate);
   report.audioBitstreamIdentical=true;report.width=a.width;report.height=a.height;report.frameRate=a.avg_frame_rate;report.durationSeconds=+after.format.duration;
   // Publish only the verified derivative, using the existing real publisher.
   const p=await publishAdaptation(blob,{...meta,title:'Me at the zoo · subtítulos ES · prueba Importer'},extra,{fetch:workerFetch});
   if(p.ok){report.stockWrites=1;report.resultId=p.id;report.stockUrl='https://www.admira.studio/stock.html?highlight='+p.id;}
   return p;
  }});
 report.result=result;assert.ok(result.ok,result.error||JSON.stringify(result));
 report.status='complete';
}catch(error){report.status='failed';report.error=String(error.message||error).slice(0,400);process.exitCode=1;}
await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

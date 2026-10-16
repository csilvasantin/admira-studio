import test from 'node:test';import assert from 'node:assert/strict';
import {previewJob} from '../assets/stock-sync-preview-job.mjs';
import {prepareCreativePreviews} from '../assets/stock-sync-preview-publish.mjs';
const dims=[[0,0,1080,1920],[1080,420,1920,1080],[3000,0,1080,1920],[4080,0,1080,1920],[5160,420,1920,1080],[7080,0,1080,1920],[8160,420,1920,1080]];
const a={id:'wall-es',name:'Seven ES',width:10080,height:1920,seconds:24,fps:25,screens:dims.map(([x,y,w,h],n)=>({id:'s'+n,stockId:'asset-'+n,url:'https://stock.admira.store/stock/asset-'+n+'/asset.mp4',x,y,w,h,rotation:0,seconds:24,fps:25,languages:['es']}))};
const creative=()=>({schema:'admira.sync-creative.v1',id:'coffee',stockId:'parent',client:{id:'starbucks'},title:'Coffee',revision:6,defaultAdaptation:a.id,adaptations:[structuredClone(a)],registryRevision:2});
test('one viewing video preserves all seven crops and reduces decoded pixel load',()=>{
 const before=JSON.stringify(a),j=previewJob(a);assert.equal(j.width,4032);assert.equal(j.height,768);assert.equal(j.extraFiles.length,6);
 assert.deepEqual(j.inputs.map(s=>[s.x,s.y,s.w,s.h]),dims.map(d=>d.map(v=>v*.4)));
 assert.equal(JSON.stringify(a),before);assert(j.width*j.height<a.screens.reduce((n,s)=>n+s.w*s.h,0)/4);assert(j.args.includes('+faststart'));
});
test('rotated delivery outputs are restored before the viewing copy is scaled',()=>{
 for(const [rotation,filter]of [[90,'transpose=2'],[180,'hflip,vflip'],[270,'transpose=1']]){const c=structuredClone(a);c.screens[0].rotation=rotation;assert(previewJob(c).args.join(' ').includes(filter));}
 const invalid=structuredClone(a);invalid.screens[0].url='https://untrusted.example/file.mp4';assert.throws(()=>previewJob(invalid));
});
test('native preview publication adds one referenced Stock member without changing delivery files or revision',async()=>{
 const c=creative(),before=JSON.stringify(c),posts=[];let cancelled=false;
 const engine={encode:async(u,j,progress,result)=>{progress({phase:'encoding',progress:.5});result(j.outputs[0],new Blob(['movie']));},cancel(){cancelled=true;}};
 const f=async(url,opts)=>{if(!opts?.method)return{json:async()=>({creatives:[c]})};posts.push(JSON.parse(opts.body));return{ok:true,json:async()=>({ok:true,rev:3})};};
 const out=await prepareCreativePreviews(c,{engine,fetch:f,publish:async()=>({ok:true,id:'atlas-es'})});
 assert.equal(cancelled,true);assert.equal(posts.length,1);assert.equal(posts[0].rev,2);assert.equal(out.revision,6);assert.deepEqual(out.adaptations[0].screens,c.adaptations[0].screens);assert.equal(out.adaptations[0].preview.stockId,'atlas-es');assert.equal(JSON.stringify(c),before);
});
test('a campaign changed during encoding is not overwritten by an obsolete preview',async()=>{
 const c=creative(),changed=creative();changed.adaptations[0].screens[0].url='https://stock.admira.store/stock/new-file/asset.mp4';let posts=0;
 let gets=0;const f=async(u,o)=>{if(o?.method)posts++;return{json:async()=>({creatives:[gets++?changed:c]})};};
 await assert.rejects(prepareCreativePreviews(c,{engine:{encode:async(u,j,p,r)=>r(j.outputs[0],new Blob(['movie'])),cancel(){}},fetch:f,publish:async()=>({ok:true,id:'atlas-es'})}),/preview-campaign-changed/);assert.equal(posts,0);
});
test('retry reuses already-saved previews and closing cancels before publication',async()=>{
 const c=creative(),saved=creative();saved.adaptations[0].preview={stockId:'atlas-es',url:'https://stock.admira.store/stock/atlas-es/asset.mp4'};let encodes=0;
 const result=await prepareCreativePreviews(c,{fetch:async()=>({json:async()=>({creatives:[saved]})}),engine:{encode(){encodes++;},cancel(){}}});
 assert.equal(encodes,0);assert.equal(result.adaptations[0].preview.stockId,'atlas-es');
 const controller=new AbortController();let publishes=0;
 await assert.rejects(prepareCreativePreviews(c,{signal:controller.signal,fetch:async()=>({json:async()=>({creatives:[c]})}),engine:{async encode(u,j,p,r){controller.abort();r(j.outputs[0],new Blob(['movie']));},cancel(){}},publish:async()=>{publishes++;return{ok:true,id:'atlas-es'};}}),/cancelled/);assert.equal(publishes,0);
});

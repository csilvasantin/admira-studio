import test from 'node:test';
import assert from 'node:assert/strict';
import {newEinkSeries,runEinkSeries,einkSeriesPlaylist,validateEinkSeries} from '../adaptaciones/eink-series-core.mjs';
import {contentRequestURL} from '../adaptaciones/content-request-core.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {planCampaign,restoreCampaign} from '../adaptaciones/campaign-core.mjs';
const seed='0123456789abcdef0123456789abcdef';
test('exact command opens four native Samsung posters with a five minute interval',()=>{
 const u=new URL(contentRequestURL('cartela tintaelectronica'),'https://admira.studio');
 for(const [key,value] of Object.entries({flow:'cartela-tinta',count:'4',center:'d634',interval:'300'}))assert.equal(u.searchParams.get(key),value);
});
test('four source images are created and archived once, then four distinct native adaptations preserve lineage',async()=>{
 const job=newEinkSeries({seed}),calls=[],saved=[];const request=async(action,body)=>{calls.push([action,body]);return action==='image'?{image:'data:image/png;base64,YQ==',model:'test'}:{id:'source-'+calls.length};};
 await runEinkSeries(job,{request,persist:async j=>saved.push(JSON.parse(JSON.stringify(j))),base:newCampaign(false)});
 assert.equal(calls.filter(x=>x[0]==='image').length,4);assert.equal(calls.filter(x=>x[0]==='archive-eink').length,4);
 assert.equal(new Set(job.pieces.map(p=>p.campaign.id)).size,4);assert.equal(new Set(job.pieces.map(p=>p.campaign.headline)).size,4);
 for(const p of job.pieces){const c=restoreCampaign(p.campaign),i=c.installations[0];assert.deepEqual([i.width,i.height,i.mediaType],[1200,1600,'image']);assert.equal(c.creationRequest.eink.source.stockId,p.sourceStock.id);assert.equal(planCampaign(c,i).valid,true);p.stock={id:'poster-'+p.index};}
 const playlist=einkSeriesPlaylist(job);assert.equal(playlist.items.length,4);assert.equal(playlist.screens.length,4);assert.equal(playlist.cycleSeconds,1200);assert.ok(playlist.items.every(p=>p.seconds===300&&p.assetType==='image'));
 await runEinkSeries(job,{request,persist:async()=>{},base:newCampaign(false)});assert.equal(calls.length,8);
 assert.ok(saved.some(j=>j.pieces[0].phase==='image-requested'));assert.ok(saved.some(j=>j.pieces[0].phase==='source-publish-requested'));
});
test('an interrupted provider call is retained and cannot be retried as another paid image',async()=>{
 const job=newEinkSeries({seed});let calls=0;const opts={request:async()=>{calls++;throw Error('lost response');},persist:async()=>{},base:newCampaign(false)};
 await assert.rejects(runEinkSeries(job,opts),/lost response/);assert.equal(job.pieces[0].phase,'image-requested');await assert.rejects(runEinkSeries(job,opts),/No se repite/);assert.equal(calls,1);
});
test('unpublished or wrong format series cannot produce an assignable playlist',()=>{
 const job=newEinkSeries({seed});assert.throws(()=>einkSeriesPlaylist(job),/not-published/);job.seconds=30;assert.throws(()=>validateEinkSeries(job),/invalid/);
});

test('startup URL cleanup retains the recoverable series identity',async()=>{
 const fs=await import('node:fs');const source=fs.readFileSync(new URL('../adaptaciones/campaign-studio.mjs',import.meta.url),'utf8');
 assert.ok(source.indexOf("params.set('serie',seed)")<source.indexOf("if(creator||params.get('taller')==='sneakers-store'){open();"));
});

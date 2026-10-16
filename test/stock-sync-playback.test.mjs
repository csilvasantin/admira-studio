import test from 'node:test';
import assert from 'node:assert/strict';
import {loopDrift,previewCorrection,followPreviewVideo} from '../assets/stock-sync-playback.mjs';

test('seven continuously decoded streams tolerate frame jitter without flushing their decoders',()=>{
 let seeks=0;const rows=Array.from({length:7},()=>({v:{get currentTime(){return this.time;},set currentTime(t){seeks++;this.time=t;},time:0,seeking:false,playbackRate:1}}));
 for(let frame=0;frame<25*72;frame++)for(const [n,row]of rows.entries()){
  const target=(frame/25)%24;row.v.time=(target+(n%2?1:-1)*.06+24)%24;
  followPreviewVideo(row,{target,duration:24,fps:25,playing:true,now:frame*40});
 }
 assert.equal(seeks,0);
});
test('a loop boundary is continuous and moderate drift uses rate correction',()=>{
 assert(Math.abs(loopDrift(.02,23.98,24)-.04)<1e-10);
 assert.equal(previewCorrection({target:.02,current:23.98,duration:24}).rate,1);
 const faster=previewCorrection({target:5.2,current:5,duration:24}),slower=previewCorrection({target:5,current:5.2,duration:24});
 assert.equal(faster.kind,'rate');assert(faster.rate>1&&faster.rate<=1.03);assert(slower.rate<1&&slower.rate>=.97);
});
test('large drift seeks once, then waits for the decoder and respects the retry interval',()=>{
 let seeks=0;const row={v:{time:0,get currentTime(){return this.time;},set currentTime(t){this.time=t;seeks++;},seeking:false,playbackRate:1}};
 followPreviewVideo(row,{target:5,duration:24,now:0});assert.equal(seeks,1);
 row.v.seeking=true;row.v.time=0;followPreviewVideo(row,{target:5,duration:24,now:500});assert.equal(seeks,1);
 row.v.seeking=false;followPreviewVideo(row,{target:5,duration:24,now:1000});assert.equal(seeks,1);
 followPreviewVideo(row,{target:5,duration:24,now:1500});assert.equal(seeks,2);
});
test('pausing and buffering preserve the last frame instead of repositioning the media',()=>{
 assert.deepEqual(previewCorrection({target:6,current:2,duration:24,playing:false}),{kind:'hold',rate:1});
 assert.equal(previewCorrection({target:6,current:2,duration:24,seeking:true}).kind,'hold');
});

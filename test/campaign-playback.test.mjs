import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignPlayback} from '../adaptaciones/campaign-playback.mjs';
test('twin clock follows native frames, loops, pauses and resumes without drift',()=>{
 let ms=0;const p=createCampaignPlayback(()=>ms),wall={id:'wall',phase:'mural'},c={seconds:24,unitSeconds:8};
 p.start(wall,c);ms=2099;assert.equal(p.snapshot(wall,c).time,2.08);
 p.toggle();ms=10000;assert.equal(p.snapshot(wall,c).time,2.08);
 p.toggle();ms=11000;assert.equal(p.snapshot(wall,c).time,3.08);
 p.seek(23.96);ms=11080;assert.equal(p.snapshot(wall,c).time,.04);
 p.stop();assert.equal(p.snapshot(wall,c).active,false);
});
test('switching a layout restarts its own native duration and seeking clamps the last frame',()=>{
 let ms=0;const p=createCampaignPlayback(()=>ms),wall={id:'wall',phase:'mural'},unit={id:'unit',phase:'unit'},c={seconds:24,unitSeconds:8};
 p.start(wall,c);ms=9000;assert.equal(p.snapshot(unit,c).time,0);assert.equal(p.snapshot(unit,c).duration,8);
 p.seek(99);assert.equal(p.snapshot(unit,c).time,7.96);p.seek(NaN);assert.equal(p.snapshot(unit,c).time,7.96);
 assert.throws(()=>p.snapshot(wall,{seconds:0}),/playback-duration/);
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {restoreCampaign,planCampaign,campaignJob,DEFAULT_CAMPAIGN} from '../adaptaciones/campaign-core.mjs';
import {travelPosition,mixedProgram} from '../adaptaciones/campaign-travel.mjs';
const demo=()=>restoreCampaign(JSON.parse(fs.readFileSync(new URL('../adaptaciones/campanas/starbucks-six.json',import.meta.url))));
test('six outputs retain requested physical order and orientation; unit phases retain their own duration',()=>{
 const c=demo();assert.equal(c.installations[0].screens.map(s=>s.w<s.h?'V':'H').join('-'),'V-H-V-V-H-V');
 const jobs=c.installations.flatMap(i=>i.screens.map(s=>campaignJob(c,i,s)));assert.equal(jobs.length,8);assert.deepEqual(jobs.map(j=>j.durationSeconds),[24,24,24,24,24,24,8,8]);assert(jobs.every(j=>j.W%2===0&&j.H%2===0));assert(c.installations.every(i=>planCampaign(c,i).valid));
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.unitSeconds,8);assert.equal(restored.installations[0].phase,'mural');
});
test('travel is one global path and a panel only offsets coordinates; every export has exactly 600 frames',()=>{
 const c=demo(),i=c.installations[0];let prev=-Infinity;for(let t=0;t<=24;t+=.04){const p=travelPosition(c,i,t);assert(p.x>=prev);prev=p.x;assert(p.y>=420&&p.y+p.h<=1500);}
 for(const s of i.screens){const job=campaignJob(c,i,s),args=job.args;assert.equal(args[args.indexOf('-frames:v')+1],'600');assert(args.includes('-filter_complex'));assert.equal(args[args.indexOf('-i')+1],'input.png');}
});
test('mixed program routes the correct local format and refuses a missing orientation',()=>{
 const c=demo(),p=mixedProgram(c);assert.equal(p.screens.length,6);assert.equal(p.totalSeconds,32);assert(p.screens.every(s=>s.items.length===2));c.installations=c.installations.filter(i=>i.id!=='portrait');assert.throws(()=>mixedProgram(c),/mixed-orientation-required/);
});
test('legacy campaigns and dangerous imports keep validation behavior',()=>{
 assert.equal(restoreCampaign(DEFAULT_CAMPAIGN).id,'sneakers-store');for(const patch of [{unitSeconds:0},{unitSeconds:8.5}])assert.throws(()=>restoreCampaign({...demo(),...patch}),/campaign-unit-duration/);
 const c=demo();c.installations[0].screens[1].y=0;c.installations[0].screens[2].y=1100;c.installations[0].screens[2].h=800;assert.equal(planCampaign(c,c.installations[0]).valid,false);
});

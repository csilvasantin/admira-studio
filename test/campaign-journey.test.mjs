import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CAMPAIGN,restoreCampaign,planCampaign,campaignJob,campaignContract} from '../adaptaciones/campaign-core.mjs';
import {COFFEE_JOURNEY,journeyArrival,journeyStory,steamGeometry} from '../adaptaciones/campaign-journey.mjs';
import {campaignVariants} from '../adaptaciones/campaign-language.mjs';
import {travelGeometry,travelPosition,mixedPrograms} from '../adaptaciones/campaign-travel.mjs';
import {integratedLayers} from '../adaptaciones/campaign-integrated.mjs';
import {layerMotion} from '../adaptaciones/campaign-story.mjs';

function campaign(){
 const screens=[1080,1920,1080,1080,1920,1080,1920].map((w,n,a)=>({id:'panel-'+(n+1),x:a.slice(0,n).reduce((a,b)=>a+b,0),y:w===1920?420:0,w,h:w===1920?1080:1920,rotation:0}));
 return {...structuredClone(DEFAULT_CAMPAIGN),id:'coffee-seven',headline:'Tu café sigue contigo.',cta:'Disfruta el momento.',seconds:24,unitSeconds:8,visualStyle:'coffee-integrated',direction:'travel',contentLanguage:'es',contentLanguages:['es','en'],copyByLanguage:{en:{headline:'Your coffee goes with you.',cta:'Enjoy the moment.',price:''}},journeyStory:structuredClone(COFFEE_JOURNEY),installations:[{id:'wall',phase:'mural',width:10080,height:1920,screens},...[['horizontal',1920,1080],['vertical',1080,1920]].map(([id,w,h])=>({id,phase:'unit',width:w,height:h,screens:[{id,x:0,y:0,w,h,rotation:0}]}))]};
}
test('messages follow the cup centre across all seven panels, regardless of stored screen order',()=>{
 const c=campaign(),i=c.installations[0],g=travelGeometry(i,c);
 const times=i.screens.map(s=>journeyArrival(c,i,s));
 assert.equal(times[0],0);assert(times.every((t,n)=>n===0||t>times[n-1]));assert(times.at(-1)<23);
 for(const [n,s] of i.screens.entries()){
  const arrival=times[n],r=travelPosition(c,i,arrival);
  if(n)assert(Math.abs(r.x+g.w/2-s.x)<.001);
  assert.equal(journeyStory(c,{...i,screens:[...i.screens].reverse()},s).at(-1).text,COFFEE_JOURNEY.copy.es[n]);
  const layers=integratedLayers(planCampaign(c,i)).filter(l=>l.role==='headline'&&l.x>=s.x&&l.x<s.x+s.w);
  const active=layers.filter(l=>layerMotion(l,arrival+.8).alpha>.9);
  assert.equal(active.length,1);assert.equal(active[0].text,COFFEE_JOURNEY.copy.es[n]);
 }
});
test('two full language rounds produce 18 distinct native jobs and separate 32-second mixed programmes',()=>{
 const c=restoreCampaign(campaign()),variants=campaignVariants(c);assert.deepEqual(variants.map(c=>c.contentLanguage),['es','en']);
 const jobs=[];
 for(const variant of variants){
  for(const i of variant.installations){const plan=planCampaign(variant,i);assert.equal(plan.valid,true,JSON.stringify(plan.errors));
   for(const s of i.screens){const j=campaignJob(variant,i,s,plan);jobs.push(j);assert.deepEqual(j.contentLanguages,[variant.contentLanguage]);
    if(i.phase==='mural'){
     assert(j.files.includes('steam.png'));assert.equal(j.steam,true);
     const filter=j.args[j.args.indexOf('-filter_complex')+1];assert.match(filter,/floor\(mod\(t\*12,24\)\)\*256/);assert.match(filter,/\[steamed\]/);
     assert(j.layers.filter(l=>l.role==='headline').every(l=>l.language===variant.contentLanguage));
    }else {assert.equal(j.steam,false);assert(!j.files.includes('steam.png'));assert.equal(j.durationSeconds,8);}
   }
  }
  assert(mixedPrograms(variant).every(p=>p.program.totalSeconds===32&&p.program.screens.length===7&&p.program.screens.every(s=>s.items.length===2)));
 }
 assert.equal(jobs.length,18);assert.equal(new Set(jobs.map(j=>j.filename)).size,18);
 const g=travelGeometry(c.installations[0],c),steam=steamGeometry(g);
 assert(Math.abs(steam.x+steam.w/2-g.w/2)<1);assert(Math.abs(steam.y+steam.h-(g.y+g.h*.405))<1);
 assert.equal(campaignContract(c).delivery.journeyStory.steam,true);
});
test('invalid imported stories and maps fail validation; disabling steam retains ordinary exports',()=>{
 const c=campaign();assert.deepEqual(restoreCampaign(c).journeyStory,COFFEE_JOURNEY);
 for(const bad of [null,{...COFFEE_JOURNEY,steam:'true'},{...COFFEE_JOURNEY,copy:{es:['x'],en:['y']}}])assert.throws(()=>restoreCampaign({...c,journeyStory:bad}),/campaign-journey/);
 assert.throws(()=>restoreCampaign({...c,wallStory:{acts:Array.from({length:3},()=>({es:['a','b','c'],en:['a','b','c']}))}}),/campaign-story-mode/);
 assert.equal(planCampaign({...c,seconds:13},c.installations[0]).valid,false);
 assert.equal(planCampaign(c,{...c.installations[0],screens:c.installations[0].screens.slice(0,6)}).valid,false);
 c.journeyStory.steam=false;const i=c.installations[0],j=campaignJob(c,i,i.screens[0],planCampaign(c,i));assert.equal(j.steam,false);assert(!j.files.includes('steam.png'));
});

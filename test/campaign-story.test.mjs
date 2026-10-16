import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {STARBUCKS_STORY,screenStory,screenLanguages,layerMotion,motionExpressions} from '../adaptaciones/campaign-story.mjs';
import {applyClientInstallations} from '../adaptaciones/client-installations.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {restoreCampaign,planCampaign,campaignJob,campaignContract} from '../adaptaciones/campaign-core.mjs';
import {integratedLayers} from '../adaptaciones/campaign-integrated.mjs';
import {campaignVariants} from '../adaptaciones/campaign-language.mjs';
import {mixedPrograms} from '../adaptaciones/campaign-travel.mjs';
const ficha=JSON.parse(fs.readFileSync(new URL('../adaptaciones/proyectos/pixeria-alsea.json',import.meta.url)));
const campaign=()=>applyClientInstallations({...newCampaign(false,'story-test'),headline:'Cada café tiene una historia.',cta:'Disfruta el momento.',wallStory:structuredClone(STARBUCKS_STORY)},ficha,{fresh:true});
const included=c=>c.installations.filter(i=>i.enabled!==false);
test('each six-screen wall has three Spanish then three English screens and distinct fragments in every act',()=>{
 const c=campaign();assert.equal(included(c).filter(i=>i.phase==='mural').length,3);for(const i of included(c).filter(i=>i.phase==='mural')){
  assert.deepEqual(i.screens.flatMap(s=>screenLanguages(c,i,s)),['es','es','es','en','en','en']);
  for(let n=0;n<3;n++)assert.equal(new Set(i.screens.map(s=>screenStory(c,i,s)[n].text)).size,6);
  assert.equal(screenStory(c,i,i.screens[0])[0].text,'Cada café');assert.equal(screenStory(c,i,i.screens[3])[0].text,'Every coffee');
 }
});
test('story has bounded fade/slide entrances and exits, with one readable message per screen at representative times',()=>{
 const c=campaign(),i=c.installations.find(i=>i.phase==='mural'),p=planCampaign(c,i);assert.equal(p.valid,true);
 for(const s of i.screens){const layers=integratedLayers(p).filter(l=>l.role==='headline'&&l.x>=s.x&&l.x<s.x+s.w);
  for(const time of [2,10,18]){const visible=layers.filter(l=>layerMotion(l,time).alpha>0);assert(visible.length>0);assert.equal(new Set(visible.map(l=>l.end)).size,1);}
  const l=layers[0];assert.equal(layerMotion(l,0).alpha,0);assert.equal(layerMotion(l,l.end).alpha,0);assert(Math.abs(layerMotion(l,2).x)<=10);assert(motionExpressions(l).x.includes('pow'));
 }
});
test('five destinations yield 20 native jobs, with actual language metadata and two-language individual timelines',()=>{
 const c=campaign(),jobs=included(c).flatMap(i=>{const p=planCampaign(c,i);assert.equal(p.valid,true);return i.screens.map(s=>campaignJob(c,i,s,p));});
 assert.equal(jobs.length,20);assert.equal(new Set(jobs.map(j=>j.filename)).size,20);
 assert.equal(jobs.filter(j=>j.contentLanguages.join(',')==='en').length,9);assert.equal(jobs.filter(j=>j.contentLanguages.length===2).length,2);
 for(const j of jobs){assert.equal(j.args[j.args.indexOf('-frames:v')+1],String(j.durationSeconds*25));assert(j.args[j.args.indexOf('-filter_complex')+1].includes('fade=t=out'));}
 const unit=c.installations.find(i=>i.phase==='unit');assert.deepEqual(screenStory(c,unit,unit.screens[0]).map(r=>[r.language,r.start]),[['es',0],['en',4]]);
 const contract=campaignContract(c);assert.equal(contract.derived.filter(d=>d.tags.includes('content-language:en')).length,11);
 c.contentLanguages=['es','en'];c.copyByLanguage.en={headline:'Every coffee has a story.',cta:'Enjoy the moment.',price:''};assert.equal(campaignVariants(c).length,1);
 assert(mixedPrograms(c).every(p=>p.program.totalSeconds===24&&p.program.screens.every(s=>s.items.length===1)));
});
test('story copy round-trips and malformed imports or unsupported geometry cannot crash planning',()=>{
 const c=campaign();assert.deepEqual(restoreCampaign(c).wallStory,c.wallStory);
 const invalid=structuredClone(c);invalid.wallStory.acts[0].en=['x'];assert.throws(()=>restoreCampaign(invalid),/campaign-story-copy/);
 const i={...c.installations.find(i=>i.phase==='mural'),screens:[c.installations.find(i=>i.phase==='mural').screens[0]]};assert.equal(planCampaign(c,i).valid,false);
 assert.equal(planCampaign({...c,seconds:3},c.installations.find(i=>i.phase==='mural')).valid,false);
});

test('the seven-screen wall is added excluded to a bilingual story campaign and explains why it cannot carry the story',()=>{
 const c=campaign(),seven=c.installations.find(i=>i.id==='starbucks-gdg51-seven');assert.equal(seven.enabled,false);assert.deepEqual(planCampaign(c,seven).errors,['story-six-screens']);
 const plain=applyClientInstallations(newCampaign(false,'story-free'),ficha,{fresh:true});assert.notEqual(plain.installations.find(i=>i.id==='starbucks-gdg51-seven').enabled,false);
});

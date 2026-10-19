import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreCampaign,campaignContract} from '../adaptaciones/campaign-core.mjs';
import {campaignVariants,setContentLanguages} from '../adaptaciones/campaign-language.mjs';
import {deliveryPlan,inspectDelivery,deliveryEntries} from '../adaptaciones/campaign-delivery.mjs';
import {STARBUCKS_STORY} from '../adaptaciones/campaign-story.mjs';
import {applyClientInstallations} from '../adaptaciones/client-installations.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';

const demo=()=>restoreCampaign(JSON.parse(readFileSync(new URL('../adaptaciones/campanas/starbucks-six.json',import.meta.url))));
function fixture(c=demo(),format='native'){
 const plan=deliveryPlan(c,format),variants=campaignVariants(c),approvals={};
 for(const row of plan.rows)approvals[`${row.installation}:${c.direction}:${row.language}:r${c.revision}`]={revision:c.revision,direction:c.direction,reviewedAt:'2026-10-19T17:00:00Z'};
 const items=plan.rows.map(row=>({state:'done',campaign:{contentLanguage:row.language,installation:row.installation,screen:row.screen,seconds:row.seconds,
  contract:campaignContract(variants.find(v=>v.contentLanguage===row.language))},files:[{filename:'native.'+row.kind,blob:new Blob([row.key]),output:{W:row.width,H:row.height}}]}));
 return {plan,items,contract:campaignContract(c,approvals)};
}
test('one complete delivery contains each native screen, editable originals and an accurate manifest',async()=>{
 const c=demo(),before=JSON.stringify(c),{plan,items,contract}=fixture(c);
 const {entries,manifest}=await deliveryEntries(plan,items,contract);
 assert.equal(manifest.files.length,8);assert.equal(Object.keys(entries).length,11);assert.equal(manifest.complete,true);
 assert.equal(new Set(manifest.files.map(f=>f.path)).size,8);assert.equal(manifest.hardwareVerified,false);
 assert.deepEqual(manifest.files.map(f=>f.seconds),[24,24,24,24,24,24,8,8]);
 for(const file of manifest.files){assert(file.path.split('/').length===4);assert.equal(file.fps,25);assert.equal(file.bytes,entries[file.path].length);}
 assert.equal(new TextDecoder().decode(entries['campaign.json']),JSON.stringify(contract,null,2));assert.equal(JSON.stringify(c),before);
});
test('separate Spanish/English revisions produce sixteen distinct language folders; disabled formats are excluded',async()=>{
 const c=setContentLanguages(demo(),['es','en']),{plan,items,contract}=fixture(c);
 const {manifest}=await deliveryEntries(plan,items,contract);assert.equal(manifest.files.length,16);
 assert.equal(manifest.files.filter(f=>f.path.includes('/en/')).length,8);
 c.installations[0].enabled=false;assert.equal(deliveryPlan(c).rows.length,4);
});
test('PNG delivery is organised without claiming video timing or frame rate',async()=>{
 const {plan,items,contract}=fixture(demo(),'png'),{manifest}=await deliveryEntries(plan,items,contract);
 assert(manifest.files.every(f=>f.mediaType==='image'&&f.path.endsWith('.png')&&f.fps===null&&f.seconds===null));
});
test('Starbucks delivers twenty outputs with real per-screen languages, including bilingual individual screens',async()=>{
 const client=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/pixeria-alsea.json',import.meta.url)));
 const c=applyClientInstallations({...newCampaign(false,'delivery-story'),headline:'Cada café tiene una historia.',cta:'Disfruta el momento.',wallStory:structuredClone(STARBUCKS_STORY)},client,{fresh:true});
 const {plan,items,contract}=fixture(c),{manifest}=await deliveryEntries(plan,items,contract);
 assert.equal(manifest.files.length,20);assert.equal(new Set(manifest.files.map(f=>f.path)).size,20);
 assert.equal(manifest.files.filter(f=>f.contentLanguages.length===2).length,2);
 assert.equal(manifest.files.filter(f=>f.contentLanguages.join('-')==='es').length,9);
 assert.equal(manifest.files.filter(f=>f.contentLanguages.join('-')==='en').length,9);
});
test('a mixed image/video campaign keeps each destination in its native media type',async()=>{
 const c=demo();c.installations[1].mediaType='image';
 const {plan,items,contract}=fixture(c),{manifest}=await deliveryEntries(plan,items,contract);
 assert.equal(manifest.files.filter(f=>f.mediaType==='image').length,1);
 assert.equal(manifest.files.filter(f=>f.mediaType==='video').length,7);
});
test('pending, failed, cancelled, missing, duplicate and invalid files never produce a complete ZIP',async()=>{
 for(const state of ['queued','running','error','cancelled']){
  const f=fixture();f.items[0].state=state;assert.equal(inspectDelivery(f.plan,f.items).complete,false);
  await assert.rejects(deliveryEntries(f.plan,f.items,f.contract),/incomplete/);
 }
 for(const change of [f=>f.items.pop(),f=>f.items.push(f.items[0]),f=>f.items[0].files=[],f=>f.items[0].files[0].blob=new Blob([]),f=>f.items[0].files[0].output.W=1,f=>f.items[0].campaign.seconds=1]){
  const f=fixture();change(f);await assert.rejects(deliveryEntries(f.plan,f.items,f.contract),/incomplete/);
 }
});
test('an old revision or changed composition cannot silently satisfy the current delivery',async()=>{
 for(const change of [c=>c.revision++,c=>c.headline='Otra campaña',c=>c.product='/different.png']){
  const f=fixture();change(f.items[0].campaign.contract.campaign);
  assert.equal(inspectDelivery(f.plan,f.items).rows[0].state,'missing');await assert.rejects(deliveryEntries(f.plan,f.items,f.contract),/incomplete/);
 }
});
test('missing reviews, a stale review or a different delivery contract block packaging',async()=>{
 const f=fixture();delete f.contract.approvals[Object.keys(f.contract.approvals)[0]];
 await assert.rejects(deliveryEntries(f.plan,f.items,f.contract),/unapproved/);
 const stale=fixture();Object.values(stale.contract.approvals)[0].revision--;
 await assert.rejects(deliveryEntries(stale.plan,stale.items,stale.contract),/unapproved/);
 const other=fixture();other.contract.campaign.installations[0].screens[0].w-=2;
 await assert.rejects(deliveryEntries(other.plan,other.items,other.contract),/contract-mismatch/);
});
test('retry retains successful files and reports only the missing screen until it completes',async()=>{
 const f=fixture(),last=f.items.pop(),before=f.items.map(item=>item.files[0].blob);
 assert.equal(inspectDelivery(f.plan,f.items).done,7);f.items.push(last);
 assert.equal(inspectDelivery(f.plan,f.items).complete,true);assert.deepEqual(f.items.slice(0,7).map(item=>item.files[0].blob),before);
 await deliveryEntries(f.plan,f.items,f.contract);
});

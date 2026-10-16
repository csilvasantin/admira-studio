import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {clientInstallations,applyClientInstallations,clientEntry} from '../adaptaciones/client-installations.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {restoreCampaign,planCampaign,campaignJob,campaignContract,validateInstallation} from '../adaptaciones/campaign-core.mjs';
import {mixedPrograms} from '../adaptaciones/campaign-travel.mjs';
import {validateFicha,projectFormats,resolveProject,mergeProjects} from '../adaptaciones/proyectos-core.mjs';
import {validateHandoff,handoffURL} from '../adaptaciones/campaign-handoff.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url))),ficha=read('adaptaciones/proyectos/pixeria-alsea.json'),index=read('adaptaciones/proyectos/index.json').proyectos;
test('Starbucks is discoverable without the remote project service and shares one catalogue',()=>{
 assert.deepEqual(validateFicha(ficha,{lists:{estandar:ficha.formatos.estandar,especiales:[]},file:'pixeria-alsea.json'}),[]);
 assert.equal(resolveProject('starbucks',mergeProjects([],index),index),'pixeria-alsea');assert.equal(clientEntry(index,'starbucks').archivo,'pixeria-alsea.json');
 assert.equal(projectFormats(ficha,ficha.formatos).length,2);assert.equal(clientInstallations(ficha).length,4);
 const entry=clientEntry(index,'starbucks');assert.equal(entry.instalaciones,ficha.instalaciones.length);assert.equal(entry.ultimoContenido.formatos,7);assert.equal(entry.ultimoContenido.campana,'starbucks-gdg51-seven-20261015');
});
test('PG103 has six verticals grouped 2+1+3; GdG51 preserves the requested mixed order at full HD',()=>{
 const [pg,gdg]=clientInstallations(ficha);assert.equal(pg.screens.map(s=>s.w<s.h?'V':'H').join(''),'VVVVVV');assert.deepEqual(pg.groups,[2,1,3]);assert.deepEqual(pg.screens.map(s=>s.group),[1,1,2,3,3,3]);assert.equal(gdg.screens.map(s=>s.w<s.h?'V':'H').join('-'),'H-V-H-H-V-H');
 for(const i of [pg,gdg]){assert.deepEqual(validateInstallation(i),[]);assert.equal(i.approximate,true);assert.equal(i.anamorphic.calibrated,false);assert(i.screens.every(s=>s.w*s.h===1920*1080));}
 assert(validateInstallation({...gdg,width:16384,height:16384}).includes('installation-size'));
});
test('a fresh client campaign has horizontal, vertical and all four layouts, all animated on the same clock',()=>{
 const c=applyClientInstallations(newCampaign(false,'test-starbucks'),ficha,{fresh:true});assert.equal(c.installations.length,6);assert.equal(c.client.id,'starbucks');assert(c.installations.every(i=>planCampaign(c,i).valid));
 const jobs=c.installations.flatMap(i=>i.screens.map(s=>campaignJob(c,i,s)));assert.equal(jobs.length,27);assert(jobs.every(j=>j.kind==='animated-integrated'));
 for(const j of jobs)assert.equal(j.args[j.args.indexOf('-frames:v')+1],String(j.durationSeconds*25));
 const programs=mixedPrograms(c);assert.equal(programs.length,4);assert.deepEqual(programs.map(p=>p.program.screens.length),[6,6,6,7]);for(const {program} of programs){assert.equal(program.totalSeconds,32);assert.equal(program.fps,25);assert.equal(program.hardwareVerified,false);assert(program.screens.every(s=>s.items.map(i=>i.seconds).join(',')==='24,8'));}
 const contract=campaignContract(c);assert.equal(contract.derived.length,27);assert(contract.derived.every(d=>d.tags.includes('starbucks')));assert.equal(contract.limits.anamorphicExport,false);
});
test('applying the catalogue preserves media, copy, edited maps and disabled destinations across save/reopen',()=>{
 let c=applyClientInstallations(newCampaign(false,'test-preserve'),ficha,{fresh:true});c.headline='Un café para ti';c.product='data:image/png;base64,AAAA';const id=c.installations[2].id;c.installations[2].screens[1].y=10;c.installations[2].height+=10;c.installations[2].enabled=false;
 const twice=applyClientInstallations(c,ficha);assert.equal(twice.product,c.product);assert.equal(twice.headline,c.headline);assert.equal(twice.installations.length,6);assert.equal(twice.installations.find(i=>i.id===id).screens[1].y,10);assert.equal(twice.installations.find(i=>i.id===id).enabled,false);assert.equal(restoreCampaign(twice).client.id,'starbucks');
 assert.throws(()=>restoreCampaign({...c,client:{id:'<script>',name:'x'}}),/campaign-client/);
});
test('choosing one installation does not include the other location in a new package',()=>{
 const c=applyClientInstallations(newCampaign(false,'test-one'),ficha,{fresh:true,only:'starbucks-pg103'});assert.equal(campaignContract(c).derived.length,8);assert.deepEqual(mixedPrograms(c).map(p=>p.installation),['starbucks-pg103']);
 assert.throws(()=>applyClientInstallations(c,ficha,{only:'unknown'}));
});
test('handoff retains a campaign and source locally, rejects stale/unsafe records, and keeps media out of URLs',()=>{
 const c=applyClientInstallations(newCampaign(false,'test-handoff'),ficha,{fresh:true}),now=Date.now(),record={id:'12345678-1234-1234-1234-123456789abc',created:now,project:'pixeria-alsea',campaign:c,source:{blob:new Blob(['image'],{type:'image/png'}),name:'poster'}};
 assert.equal(validateHandoff(record,now).campaign.client.id,'starbucks');assert.throws(()=>validateHandoff({...record,created:now-86400001},now),/handoff-expired/);assert.throws(()=>validateHandoff({...record,source:{blob:new Blob(['<svg>'],{type:'text/html'})}},now),/handoff-image/);
 const url=handoffURL('/adaptaciones/',record.id,{project:record.project,client:'starbucks'});assert(url.includes('handoff='));assert(!url.includes('data:'));assert(!url.includes('Un+caf'));
});

test('an existing campaign also retains individual orientations and receives all four layout programmes',()=>{const original=newCampaign(false,'test-existing');original.headline='Tu momento';const c=applyClientInstallations(original,ficha);assert.equal(c.headline,original.headline);assert.equal(c.unitSeconds,original.seconds);assert.equal(mixedPrograms(c).length,4);assert(c.installations.filter(i=>['landscape','portrait'].includes(i.id)).every(i=>i.phase==='unit'));});

test('excluding an individual orientation never creates missing-file or unequal-duration programmes',()=>{const c=applyClientInstallations(newCampaign(false,'test-optional'),ficha,{fresh:true});c.installations.find(i=>i.id==='landscape').enabled=false;const programmes=mixedPrograms(c);assert.equal(programmes.find(p=>p.installation==='starbucks-pg103').program.totalSeconds,32);const mixed=programmes.find(p=>p.installation==='starbucks-gdg51').program;assert.equal(mixed.totalSeconds,24);assert(mixed.screens.every(s=>s.items.length===1));assert.throws(()=>mixedPrograms(c,[{installation:'wrong',screen:'wrong',filename:'wrong.mp4'}]),/mixed-export-file-required/);});

test('adding the third layout upgrades an existing four-destination campaign without resetting either older wall',()=>{
 const old={...ficha,instalaciones:ficha.instalaciones.slice(0,2)},c=applyClientInstallations(newCampaign(false,'upgrade-third'),old,{fresh:true});c.installations[2].height+=20;c.installations[2].screens[0].y=20;c.installations[3].enabled=false;const original=JSON.stringify(c.installations.slice(0,4));const next=applyClientInstallations(c,ficha);assert.equal(JSON.stringify(next.installations.slice(0,4)),original);assert.equal(next.installations.length,6);assert.equal(next.installations[4].id,'starbucks-gdg51-vhvvhv');assert.equal(next.installations[5].id,'starbucks-gdg51-seven');
});

test('the seven-screen Gran de Gràcia 51 layout of the latest content is a client format with its seven players',()=>{
 const seven=clientInstallations(ficha).find(i=>i.id==='starbucks-gdg51-seven'),source=read('campanas/starbucks-360/campana-editable.json'),latest=(source.campaign||source).installations.find(i=>i.id==='starbucks-gdg51-seven');
 assert.deepEqual(validateInstallation(seven),[]);assert.equal(seven.screens.map(s=>s.w<s.h?'V':'H').join('-'),'V-H-V-V-H-V-H');assert.equal(seven.approximate,true);assert.equal(seven.anamorphic.calibrated,false);
 assert.deepEqual(seven.screens.map(({group,...s})=>s),latest.screens);assert.equal(seven.width,latest.width);assert.equal(seven.height,latest.height);
 const c=applyClientInstallations(newCampaign(false,'test-seven'),ficha,{fresh:true,only:'starbucks-gdg51-seven'});assert.equal(campaignContract(c).derived.length,9);assert.deepEqual(mixedPrograms(c).map(p=>p.installation),['starbucks-gdg51-seven']);
});

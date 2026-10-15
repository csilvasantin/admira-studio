import test from 'node:test';
import assert from 'node:assert/strict';
import {contentRequestURL,CONTENT_REQUEST_SCHEMA,contentCampaign,restoreContentRequest,deliveryInstallations,anamorphicRequest,validateAnamorphicGeometry} from '../adaptaciones/content-request-core.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {restoreCampaign,campaignContract,campaignJob,planCampaign} from '../adaptaciones/campaign-core.mjs';
const request=(overrides={})=>({schema:CONTENT_REQUEST_SCHEMA,brief:'Una pausa en la Diagonal',destinations:['poster','portrait','landscape'],anamorphicRequested:false,geometry:null,...overrides});
test('expert route retains the brief as data and starts a recoverable new draft in either language',()=>{
 const u=new URL(contentRequestURL('contenido Starbucks & café <script>','es'),'https://admira.studio');
 assert.equal(u.pathname,'/creador/');assert.equal(u.searchParams.get('flow'),'contenido');assert.equal(u.searchParams.get('nuevo'),'1');assert.equal(u.searchParams.get('brief'),'Starbucks & café <script>');
 const en=new URL(contentRequestURL('content anamorphic Coffee','en'),'https://admira.studio');assert.equal(en.pathname,'/en/creador/');assert.equal(en.searchParams.get('anamorphic'),'1');assert.equal(en.searchParams.get('brief'),'Coffee');
 assert.throws(()=>contentRequestURL('otro comando'));assert.throws(()=>contentRequestURL('contenido '+'x'.repeat(2001)));
});
test('campaign round-trip retains separate image and video deliveries and native dimensions',()=>{
 const c=restoreCampaign(contentCampaign(newCampaign(false,'test-content'),request()));
 assert.deepEqual(c.creationRequest,request());assert.equal(c.installations.length,3);
 assert.deepEqual(deliveryInstallations(c,'stock-png').map(i=>i.id),['poster']);
 assert.deepEqual(deliveryInstallations(c,'mp4').map(i=>i.id),['portrait','landscape']);
 assert.deepEqual(campaignContract(c).derived.map(d=>[d.width,d.height,d.mediaType]),[[1080,1920,'image'],[1080,1920,'video'],[1920,1080,'video']]);
 for(const i of deliveryInstallations(c,'mp4')){const job=campaignJob(c,i,i.screens[0]);assert.equal(job.W,i.width);assert.equal(job.H,i.height);assert.equal(job.durationSeconds,c.seconds);}
});
test('odd native label sizes remain PNG and never enter an MP4 job',()=>{
 const c=restoreCampaign(contentCampaign(newCampaign(false,'label-only'),request({destinations:['poster']}),{posterWidth:297,posterHeight:601}));
 assert.equal(deliveryInstallations(c,'mp4').length,0);assert.equal(deliveryInstallations(c,'png')[0].width,297);
 assert.throws(()=>contentCampaign(newCampaign(),request(),{posterWidth:8192,posterHeight:8192}));
});
test('legacy campaign exports retain every included installation',()=>{
 const c=newCampaign();assert.equal(deliveryInstallations(c,'mp4').length,c.installations.length);assert.equal(deliveryInstallations(c,'png').length,c.installations.length);
});
test('anamorphic request never claims a render or calibration, even when geometry is supplied',()=>{
 const c=contentCampaign(newCampaign(),request({anamorphicRequested:true}));
 assert.equal(anamorphicRequest(c).status,'awaiting-geometry');assert.equal(anamorphicRequest(c).mediaRendered,false);
 const geometry={units:'m',observer:[0,1.6,4],panels:[{id:'left',resolution:[1920,1080],corners:[[0,0,0],[2,0,0],[2,1,0],[0,1,0]]}]};
 c.creationRequest.geometry=geometry;assert.equal(anamorphicRequest(c).status,'geometry-supplied-awaiting-calibration');assert.equal(anamorphicRequest(c).calibrationVerified,false);
 assert.throws(()=>validateAnamorphicGeometry({...geometry,panels:[{...geometry.panels[0],corners:[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]}]}));
 assert.throws(()=>restoreContentRequest(request({destinations:[]})));assert.throws(()=>restoreContentRequest(request({destinations:['poster','poster']})));
});
test('the existing coffee renderer plans all three requested surfaces without copy conflicts',()=>{
 const c=contentCampaign({...newCampaign(),headline:'Una pausa en la Diagonal.',cta:'Tu momento. Diagonal 634.',visualStyle:'coffee-integrated',direction:'travel',seconds:12},request());
 for(const i of c.installations){const p=planCampaign(c,i);assert.equal(p.valid,true,JSON.stringify(p.errors));}
});

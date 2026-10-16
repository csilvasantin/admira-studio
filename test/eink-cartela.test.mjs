import test from 'node:test';
import assert from 'node:assert/strict';
import {contentRequestURL,restoreContentRequest,deliveryInstallations} from '../adaptaciones/content-request-core.mjs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {einkCampaign} from '../adaptaciones/eink-request-core.mjs';
import {restoreCampaign,planCampaign,campaignContract,campaignJob} from '../adaptaciones/campaign-core.mjs';
import {quantizeBWRY,BWRY,einkStockTags} from '../adaptaciones/eink-core.mjs';
import {campaignComposition} from '../adaptaciones/campaign-composition.mjs';
const video=()=>({...newCampaign(false,'diagonal-video'),client:{id:'starbucks',name:'Starbucks'},revision:6,name:'Starbucks · Diagonal 634',headline:'Tu próximo horizonte.',cta:'Haz una pausa. Diagonal 634.',visualStyle:'coffee-integrated',direction:'travel'});
test('expert e-paper command preserves the brief and opens a separate poster draft',()=>{
 for(const command of ['cartela tintaelectronica','cartela tinta electrónica','poster e-ink']){
  const u=new URL(contentRequestURL(command+' Diagonal & café <texto>'),'https://admira.studio');assert.equal(u.searchParams.get('flow'),'cartela-tinta');assert.equal(u.searchParams.get('brief'),'Diagonal & café <texto>');assert.equal(u.searchParams.get('nuevo'),'1');
 }
 assert.equal(new URL(contentRequestURL('poster eink','en'),'https://admira.studio').pathname,'/en/creador/');
 assert.throws(()=>contentRequestURL('cartela tintaelectronica '+'x'.repeat(2001)));
});
test('a video campaign derives static native Samsung and bridge posters without changing the source',()=>{
 const source=video(),before=JSON.stringify(source),c=restoreCampaign(einkCampaign(source,{profiles:['samsung-em13dx','bridge-bwry']}));
 assert.equal(JSON.stringify(source),before);assert.equal(c.id,'diagonal-video-eink');assert.equal(c.headline,source.headline);assert.equal(c.product,source.product);assert.deepEqual(c.creationRequest.eink.source,{campaignId:source.id,revision:6});
 assert.deepEqual(deliveryInstallations(c,'mp4'),[]);assert.deepEqual(deliveryInstallations(c,'png').map(i=>[i.width,i.height,i.mediaType]),[[1200,1600,'image'],[480,800,'image']]);
 for(const i of c.installations){const p=planCampaign(c,i);assert.equal(p.valid,true,p.errors.join(','));assert.throws(()=>campaignJob(c,i,i.screens[0]),/eink-image-only/);const composition=campaignComposition(c,i,i.screens[0],p,{mediaType:'image'});assert.equal(composition.copy.find(x=>x.role==='headline').text,source.headline);}
 for(const d of campaignContract(c).derived){assert.ok(d.tags.includes('eink'));assert.ok(d.tags.includes('source-campaign:diagonal-video'));}
 assert.throws(()=>restoreContentRequest({...c.creationRequest,destinations:['poster','portrait']}),/eink-image-only/);
 assert.throws(()=>einkCampaign(source,{profiles:['unknown']}),/eink-profile/);
});
test('native e-paper posters retain edits and refuse unsafe placements',()=>{
 const c=einkCampaign(video()),i=c.installations[0];c.placements[`${i.id}:hero:headline`]={x:1.2,y:.17,w:.86,h:.22};assert.equal(planCampaign(c,i).valid,false);
 const odd=restoreCampaign(einkCampaign(video(),{profiles:['custom'],dimensions:{posterWidth:601,posterHeight:801}}));assert.deepEqual([odd.installations[0].width,odd.installations[0].height],[601,801]);
});
test('four-colour conversion uses only opaque BWRY pixels and preserves palette solids',()=>{
 const data=new Uint8ClampedArray([...BWRY.flatMap(p=>[...p,255]),120,160,170,255,80,30,130,255,210,210,190,255,0,0,0,255]);const image=quantizeBWRY({width:4,height:2,data});
 const allowed=new Set(BWRY.map(p=>p.join(',')));for(let n=0;n<8;n++){assert.ok(allowed.has([...image.data.slice(n*4,n*4+3)].join(',')));assert.equal(image.data[n*4+3],255);}
 assert.deepEqual([...image.data.slice(0,16)],BWRY.flatMap(p=>[...p,255]));
});

test('bounded Stock publication tags retain e-paper identity, native profile and both possible source references',()=>{
 const c=einkCampaign(video(),{source:{campaignId:'diagonal-video',revision:6,stockId:'stock-source',frameSeconds:2}}),tags=einkStockTags(c,c.installations[0]);
 assert.ok(tags.length<=9);for(const tag of ['eink','cartela','starbucks','profile:samsung-em13dx','source-campaign:diagonal-video','source-stock:stock-source'])assert.ok(tags.includes(tag));
});

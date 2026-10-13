import {CAMPAIGN_SCHEMA,INSTALLATIONS,restoreCampaign,planCampaign,campaignContract,campaignJob} from './campaign-core.mjs';
export const HANDOFF_KEY='admira.creator-adapter.v1';
export const MAX_CONTRACT_BYTES=8*1024*1024;
// GOOD reflows authored layers. It never crops a baked advertisement or invokes AI.
export function adaptCreatorContract(raw,target,language='es'){
 if(!raw||raw.schema!==CAMPAIGN_SCHEMA||!raw.campaign)throw Error('creator-contract-required');
 if(!['landscape','portrait'].includes(target)||!['es','en'].includes(language))throw Error('creator-target');
 const original=restoreCampaign(raw.campaign);
 const included=original.installations.filter(i=>i.enabled!==false);
 if(included.length!==1||included[0].screens.length!==1||included[0].masks?.length)throw Error('creator-single-screen');
 for(const role of ['product','logo'])if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(original[role]))throw Error('creator-portable-assets');
 const source=included[0],review=raw.approvals?.[`${source.id}:${original.direction}:r${original.revision}`];
 if(review?.revision!==original.revision||review?.direction!==original.direction)throw Error('creator-source-review');
 const campaign=restoreCampaign(original),installation=JSON.parse(JSON.stringify(INSTALLATIONS.find(i=>i.id===target)));
 installation.enabled=true;campaign.id=original.id.slice(0,52)+'-'+target+'-good';campaign.installations=[installation];campaign.placements={};
 return {campaign,installation,provenance:{schema:'admira.creator-adaptation.v1',quality:'good',language,method:'authored-layer-reflow',sourceCampaign:original.id,sourceRevision:original.revision,sourceDimensions:[source.width,source.height],outputDimensions:[installation.width,installation.height],preserved:['headline','cta','price','product','logo','background','accent','foreground','seconds'],aiCalls:0}};
}
export function reviewedCreatorOutput(adaptation,measure){
 const {campaign,installation}=adaptation,plan=planCampaign(campaign,installation,campaign.direction,measure);
 if(!plan.valid)throw Error('creator-layout-review');
 return {plan,contract:{...campaignContract(campaign),adaptation:adaptation.provenance},job:campaignJob(campaign,installation,installation.screens[0])};
}

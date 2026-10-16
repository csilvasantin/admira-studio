import {CONTENT_REQUEST_SCHEMA,contentCampaign} from './content-request-core.mjs?v=eink-cartela-1';
import {EINK_STYLE} from './eink-core.mjs?v=eink-cartela-1';
export function einkCampaign(base,{brief='',profiles=['samsung-em13dx'],source,dimensions}={}){
 const previous=base.creationRequest?.eink?.source;
 source||=previous||{campaignId:base.id,revision:base.revision};
 const c={...base,id:base.creationRequest?.eink?base.id:(base.id.slice(0,74)+'-eink'),name:base.creationRequest?.eink?base.name:base.name+' · Cartela',visualStyle:EINK_STYLE,direction:'hero',background:'#ffffff',foreground:'#111111',accent:'#d70000',placements:{},contentLanguages:[base.contentLanguage||'es']};
 delete c.wallStory;delete c.journeyStory;
 return contentCampaign(c,{schema:CONTENT_REQUEST_SCHEMA,brief,destinations:['poster'],anamorphicRequested:false,geometry:null,eink:{profiles,source}},dimensions);
}

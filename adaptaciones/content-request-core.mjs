import {restoreEink,einkInstallations} from './eink-core.mjs?v=eink-cartela-1';
// One content brief, three explicit media deliveries. No generation on navigation.
export const CONTENT_REQUEST_SCHEMA='admira.create-content.v1';
export const CONTENT_DESTINATIONS=['poster','portrait','landscape'];
export function contentRequestURL(args='',language='es'){
 const text=String(args).trim();
 const cartela=/^(?:cartela|cartel|poster)\s+(?:tinta\s*electr[oó]nica|e-?ink)(?:\s|$)/i;
 if(cartela.test(text)){const brief=text.replace(cartela,'').trim();if(brief.length>2000)throw Error('content-brief-size');const q=new URLSearchParams({flow:'cartela-tinta',nuevo:'1',lang:language==='en'?'en':'es'});if(brief)q.set('brief',brief);return(language==='en'?'/en/creador/':'/creador/')+'?'+q;}
 if(!/^(contenido|content)(?:\s|$)/i.test(text))throw Error('content-command');
 let brief=text.replace(/^(contenido|content)\s*/i,'');
 const anamorphic=/(?:^|\s)(?:anam[oó]rfic[oa]s?|anamorphic)(?:\s|$)/i.test(brief);
 brief=brief.replace(/(?:^|\s)(?:anam[oó]rfic[oa]s?|anamorphic)(?=\s|$)/ig,' ').trim();
 if(brief.length>2000)throw Error('content-brief-size');
 const en=language==='en',q=new URLSearchParams({flow:'contenido',nuevo:'1',lang:en?'en':'es'});
 if(brief)q.set('brief',brief);if(anamorphic)q.set('anamorphic','1');
 return (en?'/en/creador/':'/creador/')+'?'+q;
}
export function validateAnamorphicGeometry(value){
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=10000);
 if(!value||value.units!=='m'||!vector(value.observer)||!Array.isArray(value.panels)||value.panels.length<1||value.panels.length>8)throw Error('anamorphic-geometry');
 const ids=new Set();
 const panels=value.panels.map(p=>{
  if(!p||!/^[a-z0-9_-]{1,60}$/i.test(p.id)||ids.has(p.id)||!Array.isArray(p.resolution)||p.resolution.length!==2||p.resolution.some(n=>!Number.isInteger(n)||n<64||n>8192||n%2)||p.resolution[0]*p.resolution[1]>16777216||!Array.isArray(p.corners)||p.corners.length!==4||!p.corners.every(vector))throw Error('anamorphic-panel');
  ids.add(p.id);const [a,b,,d]=p.corners,u=b.map((n,i)=>n-a[i]),v=d.map((n,i)=>n-a[i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...cross)<1e-6)throw Error('anamorphic-panel');
  return {id:p.id,resolution:[...p.resolution],corners:p.corners.map(x=>[...x])};
 });
 return {units:'m',observer:[...value.observer],panels};
}
export function restoreContentRequest(raw){
 if(!raw||raw.schema!==CONTENT_REQUEST_SCHEMA||typeof raw.brief!=='string'||raw.brief.length>2000||!Array.isArray(raw.destinations)||!raw.destinations.length||raw.destinations.some(x=>!CONTENT_DESTINATIONS.includes(x))||new Set(raw.destinations).size!==raw.destinations.length||typeof raw.anamorphicRequested!=='boolean')throw Error('content-request');
 if(raw.eink&&(raw.destinations.length!==1||raw.destinations[0]!=='poster'||raw.anamorphicRequested))throw Error('eink-image-only');
 return {schema:CONTENT_REQUEST_SCHEMA,brief:raw.brief,destinations:[...raw.destinations],anamorphicRequested:raw.anamorphicRequested,geometry:raw.anamorphicRequested&&raw.geometry?validateAnamorphicGeometry(raw.geometry):null,...(raw.eink?{eink:restoreEink(raw.eink)}:{})};
}
export function contentInstallations(request,{posterWidth=1080,posterHeight=1920}={},en=false){
 const r=restoreContentRequest(request);
 if(![posterWidth,posterHeight].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)||posterWidth*posterHeight>16777216)throw Error('poster-resolution');
 if(r.eink)return einkInstallations(r.eink,{posterWidth,posterHeight});
 const profiles={poster:{width:posterWidth,height:posterHeight,mediaType:'image',name:{es:'Póster · etiqueta digital',en:'Poster · digital label'}},portrait:{width:1080,height:1920,mediaType:'video',name:{es:'Pantalla vertical',en:'Portrait screen'}},landscape:{width:1920,height:1080,mediaType:'video',name:{es:'Pantalla horizontal',en:'Landscape screen'}}};
 return r.destinations.map(id=>({id,...profiles[id],phase:'unit',screens:[{id:id==='poster'?'label':id==='portrait'?'portrait-screen':'landscape-screen',x:0,y:0,w:profiles[id].width,h:profiles[id].height,rotation:0}]}));
}
export function contentCampaign(base,request,dimensions){
 const creationRequest=restoreContentRequest(request);
 return {...base,unitSeconds:base.seconds,creationRequest,installations:contentInstallations(creationRequest,dimensions),placements:{}};
}
export function deliveryInstallations(campaign,kind){
 return campaign.installations.filter(i=>i.enabled!==false&&(!campaign.creationRequest||(kind==='mp4'?i.mediaType!=='image':i.mediaType==='image')));
}
export function anamorphicRequest(campaign){
 const r=restoreContentRequest(campaign.creationRequest);
 if(!r.anamorphicRequested)throw Error('anamorphic-not-requested');
 return {schema:'admira.anamorphic-request.v1',campaignId:campaign.id,revision:campaign.revision,brief:r.brief,geometry:r.geometry,status:r.geometry?'geometry-supplied-awaiting-calibration':'awaiting-geometry',mediaRendered:false,calibrationVerified:false};
}

// The branded example sets explicit client metadata before generation and export.
export function starbucksContentExample(base,en=false){
 return {...base,client:{id:'starbucks',name:'Starbucks'},name:'Starbucks · Diagonal · Demo contenido',headline:en?'A pause on Diagonal.':'Una pausa en la Diagonal.',cta:en?'Your moment. Diagonal 634.':'Tu momento. Diagonal 634.',product:'/adaptaciones/campanas/coffee/coffee-beans.jpg',portraitPhoto:'/adaptaciones/campanas/coffee/coffee-pause.jpg',logo:'/adaptaciones/campanas/coffee/starbucks-siren.svg',productLabel:en?'Existing coffee photograph · example':'Fotografía de café existente · ejemplo',background:'#003e2e',accent:'#e8e5c9',foreground:'#fffaf0',visualStyle:'coffee-integrated',direction:'travel',seconds:12};
}

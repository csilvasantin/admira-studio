import {einkCampaign} from './eink-request-core.mjs?v=eink-series-1';
export const EINK_SERIES_SCHEMA='admira.eink-series.v1';
export const DIAGONAL_MOMENTS=[
 {key:'horizonte',headline:'Tu próximo horizonte.',cta:'Haz una pausa. Diagonal 634.',scene:'A steaming ceramic coffee cup on a wooden terrace table. One continuous Barcelona Diagonal avenue skyline leading towards the Mediterranean, coherent warm sunset sky.'},
 {key:'pausa',headline:'La Diagonal puede esperar.',cta:'Tu momento. Diagonal 634.',scene:'A fresh espresso and a croissant on a wooden café table, leafy Barcelona Diagonal avenue beyond the terrace, soft morning light.'},
 {key:'ciudad',headline:'Fuera, la ciudad. Aquí, tu momento.',cta:'Baja el ritmo. Diagonal 634.',scene:'A glass of iced coffee with visible ice on a Barcelona Diagonal café terrace, calm urban greenery and buildings softly out of focus, bright afternoon light. No steam.'},
 {key:'ritmo',headline:'Sigue tu Diagonal.',cta:'Vuelve con ganas. Diagonal 634.',scene:'A ceramic cappuccino with a clear latte art heart on a wooden café table, Barcelona Diagonal avenue and warm late afternoon light in the background.'}
];
export function einkSeriesPrompt(moment,brief=''){
 return `Premium photorealistic café campaign photograph. ${moment.scene} A single coherent camera perspective and lighting, one sky and one horizon only. No collage, split image, duplicated background, lettering, watermark or logo. Product entirely visible, realistic materials and elegant composition. Brand and copy will be added separately by the native poster adapter. Campaign brief: ${String(brief).slice(0,1600)}`;
}
export function newEinkSeries({seed,brief='Starbucks Diagonal 634 · Cuatro momentos'}={}){
 if(!/^[a-f0-9]{32}$/.test(seed||''))throw Error('series-id');
 return {schema:EINK_SERIES_SCHEMA,seed,brief:String(brief).slice(0,2000),center:'d634',seconds:300,createdAt:new Date().toISOString(),pieces:DIAGONAL_MOMENTS.map((m,n)=>({...m,index:n,phase:'brief',prompt:einkSeriesPrompt(m,brief),approval:null,stock:null}))};
}
export function validateEinkSeries(job){
 if(job?.schema!==EINK_SERIES_SCHEMA||!/^[a-f0-9]{32}$/.test(job.seed||'')||job.center!=='d634'||job.seconds!==300||job.pieces?.length!==4)throw Error('series-invalid');
 if(new Set(job.pieces.map(p=>p.index)).size!==4||job.pieces.some(p=>!Number.isInteger(p.index)||p.index<0||p.index>3||p.stock?.id&&!/^[a-zA-Z0-9_-]{1,160}$/.test(p.stock.id)))throw Error('series-pieces');
 for(const p of job.pieces)if(p.campaign){const c=p.campaign,i=c.installations?.[0];if(c.visualStyle!=='eink-poster'||c.installations.length!==1||i.einkProfile!=='samsung-em13dx'||i.width!==1200||i.height!==1600||i.screens.length!==1||i.mediaType!=='image')throw Error('series-format');}
 return job;
}
export function seriesCampaign(job,p,base){
 const c=einkCampaign({...base,id:'series-'+job.seed.slice(0,24)+'-'+(p.index+1),revision:1,name:'Starbucks Diagonal 634 · '+p.headline,headline:p.headline,cta:p.cta,price:'',client:{id:'starbucks',name:'Starbucks'},logo:'/adaptaciones/campanas/coffee/starbucks-siren.svg',product:p.image,portraitPhoto:p.image,contentLanguage:'es',contentLanguages:['es']},{brief:job.brief,profiles:['samsung-em13dx'],source:{stockId:p.sourceStock.id,frameSeconds:0}});
 c.id='series-'+job.seed.slice(0,24)+'-eink-'+(p.index+1);return c;
}
// Persist before each POST. An interrupted/unknown response is never charged again on refresh.
export async function runEinkSeries(job,{request,persist,base,changed=()=>{}}){
 validateEinkSeries(job);
 const save=async()=>{await persist(job);changed(job);};
 for(const p of job.pieces){
  if(/-requested$/.test(p.phase))throw Error('Resultado pendiente de confirmar para la pieza '+(p.index+1)+'. No se repite la solicitud.');
  if(p.phase==='brief'){p.phase='image-requested';await save();const r=await request('image',{prompt:p.prompt});if(!/^data:image\//.test(r.image||''))throw Error('series-image');p.image=r.image;p.model=r.model;p.phase='image-ready';await save();}
  if(p.phase==='image-ready'){p.phase='source-publish-requested';await save();const r=await request('archive-eink',{image:p.image,prompt:p.prompt,title:'Starbucks Diagonal · '+p.headline+' · imagen IA',seed:job.seed.slice(0,30)+String(p.index).padStart(2,'0')});if(!r.id)throw Error('series-stock');p.sourceStock={id:r.id,num:r.num};p.phase='source-ready';await save();}
  if(p.phase==='source-ready'){p.campaign=seriesCampaign(job,p,base);p.phase='adapted';await save();}
 }
 return job;
}
export function einkSeriesPlaylist(job){
 validateEinkSeries(job);if(job.pieces.some(p=>!p.stock?.id))throw Error('series-not-published');
 return {schema:'admira.eink-playlist.v1',id:'starbucks-d634-tinta-'+job.seed,name:'Diagonal 634 · Cuatro momentos',center:'d634',secondsPerItem:300,cycleSeconds:1200,loop:true,screens:['D634-EINK-01','D634-EINK-02','D634-EINK-03','D634-EINK-04'],items:job.pieces.map(p=>({id:'stock-'+p.stock.id,stockId:p.stock.id,title:p.campaign.headline,seconds:300,asset:'https://api.admira.store/stock/asset/'+p.stock.id,assetType:'image',width:1200,height:1600}))};
}

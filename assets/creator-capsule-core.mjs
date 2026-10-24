import {buildCapsulaPayload} from './capsula-publicar.mjs';
const text=(v,max)=>String(v??'').replace(/\r\n/g,'\n').trim().slice(0,max);
export function buildCreatorCapsule(raw={}){
 if(!raw||typeof raw!=='object')return {ok:false,errors:['invalid_capsule']};
 if(raw.kind==='blinkist'){const built=buildCapsulaPayload(Object.fromEntries(['url','libro','autor','tesis','consejeroId','tema','carbono','silicio','aplicacion'].map(k=>[k,text(raw[k],k==='carbono'?8000:2000)])));if(built.ok)built.payload.tags.push('content-language:'+(raw.language==='en'?'en':'es'));return built;}
 if(!['knowledge','didyouknow'].includes(raw.kind))return {ok:false,errors:['invalid_kind']};
 const title=text(raw.tesis,300),content=text(raw.carbono,8000),source=text(raw.source,1000),topic=text(raw.topic,80),language=raw.language==='en'?'en':'es',errors=[];
 if(!title)errors.push('missing_title');if(!content)errors.push('missing_content');if(!source)errors.push('missing_source');if(errors.length)return {ok:false,errors};
 return {ok:true,payload:{type:'capsula',motor:'Creador · cápsula',title,prompt:source,comment:content+'\n\n'+(language==='en'?'Source: ':'Fuente: ')+source,tags:['formacion','conocimiento',raw.kind==='didyouknow'?'sabiasque':'capsula','content-language:'+language,...(topic?[topic]:[])],quality:'good',costEst:'texto · autoría manual',skipVideo:true}};
}

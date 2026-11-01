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
// Mejoras Creador (1-nov-2026): errores legibles, borrador local y enlace directo al activo publicado.
const ERRORES={missing_title:['Falta el título','Title is missing'],missing_content:['Falta el contenido','Content is missing'],missing_source:['Falta la fuente verificable','Verifiable source is missing'],invalid_kind:['Tipo de cápsula no válido','Invalid capsule type'],invalid_capsule:['Cápsula no válida','Invalid capsule'],'session-required':['Inicia sesión para publicar','Sign in to publish'],'invalid-origin':['Origen no permitido','Origin not allowed'],'too-big':['La cápsula es demasiado larga','Capsule is too long'],'stock-unreachable':['Stock no responde, prueba en un momento','Stock is unreachable, try again shortly']};
export function capsuleErrorText(codes,en=false){return [].concat(codes||[]).filter(Boolean).map(c=>ERRORES[c]?.[en?1:0]||String(c)).join(' · ');}
export function stockLinkFor(d,en=false){const base=(en?'/en':'')+'/stock.html';return d?.id?base+'?highlight='+encodeURIComponent(d.id):base+'?type=capsula';}
export const DRAFT_KEY='admira.creator.capsule.draft.v1';
export const DRAFT_FIELDS=['kind','language','tesis','carbono','source','topic','url','libro','autor','consejero','tema','silicio','aplicacion'];
export function readDraft(storage){try{const d=JSON.parse(storage?.getItem(DRAFT_KEY)||'null');return d&&typeof d==='object'?Object.fromEntries(DRAFT_FIELDS.filter(k=>typeof d[k]==='string').map(k=>[k,d[k]])):null;}catch{return null;}}
export function writeDraft(storage,get){try{const d=Object.fromEntries(DRAFT_FIELDS.map(k=>[k,String(get(k)??'')]));if(!d.tesis&&!d.carbono&&!d.source&&!d.url)storage?.removeItem(DRAFT_KEY);else storage?.setItem(DRAFT_KEY,JSON.stringify(d));}catch{}}

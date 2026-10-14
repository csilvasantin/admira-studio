(function(root){
 'use strict';
 if(root.StockSync){if(typeof module!=='undefined'&&module.exports)module.exports=root.StockSync;return;}
 const SCHEMA='admira.sync-creative.v1',registry=new Map();
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(v);
 const positive=v=>Number.isFinite(v)&&v>0;
 function asset(v,stockId){try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='stock.admira.store'&&/^\/stock\/[a-zA-Z0-9-]+\/asset\.[a-z0-9]+$/.test(u.pathname)&&(!stockId||u.pathname.split('/')[2]===stockId);}catch{return false;}}
 function validate(raw){
  if(raw?.schema!==SCHEMA||!id(raw.id)||!id(raw.stockId)||!id(raw.client?.id)||typeof raw.title!=='string'||!raw.title.trim()||!Number.isInteger(raw.revision)||raw.revision<1||!Array.isArray(raw.adaptations)||!raw.adaptations.length)throw Error('invalid-creative');
  const copy=JSON.parse(JSON.stringify(raw)),ids=new Set(),members=new Set();
  for(const a of copy.adaptations){
   if(!id(a.id)||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||!positive(a.width)||!positive(a.height)||!positive(a.seconds)||a.seconds>600||!Number.isInteger(a.fps)||a.fps<1||a.fps>120||!Array.isArray(a.screens)||!a.screens.length)throw Error('invalid-adaptation');
   ids.add(a.id);const slots=new Set();
   if(a.preview&&(!id(a.preview.stockId)||!asset(a.preview.url,a.preview.stockId)))throw Error('invalid-preview');
   for(const s of a.screens){
    if(!id(s.id)||slots.has(s.id)||!id(s.stockId)||!asset(s.url,s.stockId)||![s.x,s.y,s.w,s.h].every(Number.isFinite)||s.x<0||s.y<0||s.w<=0||s.h<=0||s.x+s.w>a.width+.01||s.y+s.h>a.height+.01||!Array.isArray(s.languages)||!s.languages.length||s.languages.some(l=>!['es','en'].includes(l))||s.seconds!==a.seconds||s.fps!==a.fps||![0,90,180,270].includes(s.rotation||0))throw Error('invalid-screen');
    slots.add(s.id);members.add(s.stockId);
   }
  }
  if(members.has(copy.stockId)||copy.defaultAdaptation&&!ids.has(copy.defaultAdaptation))throw Error('invalid-parent');
  return {schema:SCHEMA,id:copy.id,stockId:copy.stockId,title:copy.title.slice(0,300),client:{id:copy.client.id,name:String(copy.client.name||copy.client.id).slice(0,100)},revision:copy.revision,defaultAdaptation:copy.defaultAdaptation||copy.adaptations[0].id,adaptations:copy.adaptations.map(a=>({id:a.id,name:a.name.slice(0,200),width:a.width,height:a.height,seconds:a.seconds,fps:a.fps,...(a.preview?{preview:{stockId:a.preview.stockId,url:a.preview.url}}:{}),screens:a.screens.map(s=>({id:s.id,x:s.x,y:s.y,w:s.w,h:s.h,rotation:s.rotation||0,stockId:s.stockId,url:s.url,languages:s.languages,seconds:s.seconds,fps:s.fps}))}))};
 }
 function register(rows){registry.clear();for(const r of rows||[]){try{const c=validate(r);registry.set(c.stockId,c);}catch{}}return registry.size;}
 const get=it=>registry.get(typeof it==='string'?it:it?.id)||null;
 const members=c=>[...new Set(c.adaptations.flatMap(a=>[...a.screens.map(s=>s.stockId),a.preview?.stockId].filter(Boolean)))].filter(x=>x!==c.stockId);
 function membership(items){const present=new Set(items.map(i=>i.id)),out=new Map();for(const c of registry.values())if(present.has(c.stockId))for(const id of members(c))if(present.has(id)&&!out.has(id))out.set(id,c.stockId);return out;}
 function formats(c){return c.adaptations.map(a=>({id:a.id,nombre:a.name,client:c.client,syncCreative:true,adaptation:a,custom:[a.width,a.height],syncGeometry:{pared:{ancho:a.width,alto:a.height},segments:a.screens.map((s,n)=>({n:n+1,N:a.screens.length,wall:{x:s.x,y:s.y,w:s.w,h:s.h}})),allowGaps:true,source:'sync-creative',warnings:[]}}));}
 const time=(seconds,fps,t)=>Math.floor((((t%seconds)+seconds)%seconds)*fps+1e-7)/fps;
 const api={SCHEMA,validate,register,get,members,membership,formats,time,asset,loaded:false};root.StockSync=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

import {validateInstallation,restoreCampaign,INSTALLATIONS} from './campaign-core.mjs?v=six-verticals-1';
const clone=value=>JSON.parse(JSON.stringify(value));
export function clientInstallations(ficha){
 if(!ficha||!Array.isArray(ficha.instalaciones)||ficha.instalaciones.length>32)throw Error('client-installations');
 const seen=new Set();return ficha.instalaciones.map(i=>{
  if(validateInstallation(i).length||seen.has(i.id)||i.catalogClient!==ficha.cliente||!i.name?.es||!i.name?.en)throw Error('client-installations');
  seen.add(i.id);return clone(i);
 });
}
// Explicitly applying a catalogue retains copy, media, custom maps and inclusion state.
// Previously saved catalogue maps are never silently reset to the current defaults.
// The bilingual wall story needs six screens: other walls are added excluded.
export function applyClientInstallations(c,ficha,{only=null,fresh=false}={}){
 const list=clientInstallations(ficha);if(only&&!list.some(i=>i.id===only))throw Error('client-installation-not-found');
 const next=clone(c);next.client={id:ficha.cliente,name:ficha.nombre};
 if(fresh)for(const key of ['visualStyle','direction','seconds','unitSeconds','background','accent','foreground','logo'])if(ficha.creacion?.[key]!==undefined)next[key]=clone(ficha.creacion[key]);
 if(fresh)next.installations=INSTALLATIONS.slice(0,2).map(i=>({...clone(i),phase:'unit'}));
 for(const unit of INSTALLATIONS.slice(0,2)){const existing=next.installations.find(i=>i.id===unit.id);if(existing)existing.phase='unit';else next.installations.push({...clone(unit),phase:'unit'});}
 if(next.unitSeconds===undefined)next.unitSeconds=next.seconds;
 const ids=new Set(next.installations.map(i=>i.id));
 next.installations.push(...list.filter(i=>!ids.has(i.id)).map(i=>({...i,enabled:(!only||i.id===only)&&!(next.wallStory&&i.screens.length!==6)})));
 next.revision++;return restoreCampaign(next);
}
export function clientEntry(index,id){return index.find(p=>p.creador&&(p.id===id||p.cliente===id||p.alias?.includes(id)))||null;}
export function clientReference(i,en=false){
 if(!i.catalogClient)return null;
 const pattern=i.pattern||i.screens.map(s=>s.w>s.h?'H':'V').join('–');
 return (en?'Nominal layout ':'Mapa nominal ')+pattern+(en?'. Adjust dimensions and spacing before delivery. Anamorphic perspective requires viewpoint calibration.':'. Ajusta medidas y separaciones antes de entregar. La perspectiva anamórfica requiere calibrar el punto de vista.');
}

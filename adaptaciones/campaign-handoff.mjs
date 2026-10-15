import {restoreCampaign} from './campaign-core.mjs?v=create-content-1';
const DB='admira.campaign-handoff.v1',STORE='transfers',TTL=86400000;
async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('handoff-storage'));});}
export function validateHandoff(value,now=Date.now()){
 if(!value||!/^[-a-zA-Z0-9]{16,80}$/.test(value.id)||!Number.isFinite(value.created)||now-value.created>TTL||value.created>now+60000)throw Error('handoff-expired');
 if(!(value.source?.blob instanceof Blob)||value.source.blob.size<1||value.source.blob.size>100*1048576||!/^image\/(png|jpeg|webp)$/.test(value.source.blob.type))throw Error('handoff-image');
 if(value.campaign)value={...value,campaign:restoreCampaign(value.campaign)};
 if(value.project&&!/^[a-z0-9-]{1,80}$/.test(value.project))throw Error('handoff-project');
 if(value.installation&&!/^[a-z0-9-]{1,80}$/.test(value.installation))throw Error('handoff-installation');return value;
}
export async function saveHandoff(value){
 const record=validateHandoff({...value,id:crypto.randomUUID(),created:Date.now()});const db=await database();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('handoff-storage'));});return record.id;}finally{db.close();}
}
export async function readHandoff(id){
 if(!/^[-a-zA-Z0-9]{16,80}$/.test(id||''))throw Error('handoff-expired');const db=await database();
 try{return await new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>{try{resolve(validateHandoff(r.result));}catch(e){reject(e);}};r.onerror=()=>reject(Error('handoff-storage'));});}finally{db.close();}
}
export function handoffURL(path,id,{project,installation,client}={}){
 const u=new URL(path,'https://admira.studio');u.searchParams.set('handoff',id);if(project)u.searchParams.set('proyecto',project);if(installation)u.searchParams.set('instalacion',installation);if(client)u.searchParams.set('cliente',client);return u.pathname+u.search;
}

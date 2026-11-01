import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {capsuleErrorText,stockLinkFor,readDraft,writeDraft,DRAFT_KEY} from '../assets/creator-capsule-core.mjs';
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
test('errores de validación se muestran en lenguaje humano ES/EN',()=>{
 assert.equal(capsuleErrorText(['missing_title','missing_source']),'Falta el título · Falta la fuente verificable');
 assert.equal(capsuleErrorText('session-required',true),'Sign in to publish');assert.equal(capsuleErrorText(['otro']),'otro');assert.equal(capsuleErrorText(null),'');
});
test('Ver en Stock abre la cápsula recién publicada',()=>{
 assert.equal(stockLinkFor({id:'a b'}),'/stock.html?highlight=a%20b');assert.equal(stockLinkFor({},true),'/en/stock.html?type=capsula');
});
test('el borrador se guarda, se restaura saneado y se borra si está vacío',()=>{
 const s=mem(),v={tesis:'T',carbono:'C',kind:'didyouknow'};writeDraft(s,k=>v[k]);assert.deepEqual(readDraft(s).tesis,'T');assert.equal(readDraft(s).kind,'didyouknow');
 s.setItem(DRAFT_KEY,JSON.stringify({tesis:'x',evil:'y',carbono:5}));assert.deepEqual(readDraft(s),{tesis:'x'});
 writeDraft(s,()=>'');assert.equal(s.getItem(DRAFT_KEY),null);s.setItem(DRAFT_KEY,'{roto');assert.equal(readDraft(s),null);
});
test('el panel usa borrador, contador, atajo y limpia tras publicar',()=>{
 const src=readFileSync(new URL('../assets/creator-capsule.mjs',import.meta.url),'utf8');
 for(const re of [/readDraft\(store\)/,/id="cap-count"/,/e\.ctrlKey\|\|e\.metaKey/,/form\.reset\(\)/,/removeItem\(DRAFT_KEY\)/,/stockLinkFor\(d,en\)/])assert.match(src,re);
});

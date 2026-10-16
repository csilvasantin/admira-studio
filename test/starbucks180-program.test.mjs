import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SCREENS} from '../functions/starbucks-180.js';
test('the published native programme has exactly four mapped screens and both languages with no Mini gap',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../campanas/starbucks-180/programa-cuatro.json',import.meta.url)));assert.deepEqual(p.screens.map(s=>s.screen),SCREENS);assert.equal(p.totalSeconds,64);assert.deepEqual(p.contentLanguages,['es','en']);assert.equal(p.journeyStory.steam,true);
 for(const lang of ['es','en']){assert.equal(p.journeyStory.copy[lang].length,4);assert.equal(p.journeyStory.lowerCopy[lang].length,4);}
 assert.deepEqual(p.screens.map(s=>s.format.width<s.format.height?'V':'H'),['V','H','V','H']);for(const s of p.screens){assert.deepEqual(s.items.map(i=>i.seconds),[24,8,24,8]);assert.deepEqual(s.items.map(i=>i.contentLanguage),['es','es','en','en']);assert.ok(s.items.every(i=>i.stockId&&i.url.endsWith(i.stockId)));}
 const c=JSON.parse(fs.readFileSync(new URL('../campanas/starbucks-180/campana-editable.json',import.meta.url))).campaign;const mural=c.installations.find(i=>i.phase==='mural');assert.deepEqual(mural.screens.map(s=>s.x),[0,1080,3000,4080]);assert.equal(mural.width,6000);
});

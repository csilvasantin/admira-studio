import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('v5.7: interruptores Preroll/Postroll apagados por defecto y reenviados a /capsula/url/encargar',()=>{
 const ui=r('assets/creator-capsule-url.mjs');
 assert.match(ui,/id="capurl-preroll" type="checkbox">/);assert.match(ui,/id="capurl-postroll" type="checkbox">/);assert.doesNotMatch(ui,/capurl-(pre|post)roll" type="checkbox" checked/);
 assert.match(ui,/preroll:\$\('capurl-preroll'\)\.checked,postroll:\$\('capurl-postroll'\)\.checked/);
 assert.match(r('functions/creator-capsule-url.js'),/preroll:body\.preroll===true,postroll:body\.postroll===true/);
 for(const f of ['creador/index.html','en/creador/index.html'])assert.match(r(f),/creator-capsule-url\.mjs\?v=22\.10\.2026\.r10/);
});

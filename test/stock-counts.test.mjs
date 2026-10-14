import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);require('../assets/stock-formats.js');const C=require('../assets/stock-counts.js');
const source={id:'source',type:'video',motor:'local'},variant={id:'variant',type:'video',motor:'adaptador',externalRef:'source'},image={id:'image',type:'image'},capsule={id:'capsule',type:'capsula'};const catalog=[source,variant,image,capsule];
test('encontrados/total usa los filtros completos, no la página ni reproducibles; agrupa versiones en ambas cifras',()=>{
 assert.deepEqual(C.measure(catalog,[source,variant]),{found:1,total:3,foundVersions:2,totalVersions:4});assert.equal(C.measure(catalog,[image]).found,1);assert.equal(C.measure(catalog,[capsule]).found,1);assert.equal(C.label(C.measure(catalog,[source])),'1 de 3 contenidos');assert.equal(C.label(C.measure(catalog,[source]),true),'1 of 3 contents');
});
test('sin resultados, catálogo vacío y selección repetida no conservan ni inflan cifras',()=>{
 assert.deepEqual(C.measure(catalog,[]),{found:0,total:3,foundVersions:0,totalVersions:4});assert.deepEqual(C.measure([],[]),{found:0,total:0,foundVersions:0,totalVersions:0});assert.equal(C.measure([source,source],[source,source]).found,1);
});
test('total sólo cuenta lo disponible para la cuenta y excluye piezas ajenas aunque entren en la selección',()=>{
 assert.deepEqual(C.measure([image],[source,image]),{found:1,total:1,foundVersions:1,totalVersions:1});
});
test('idiomas y revisiones de campaña permanecen contenidos diferentes',()=>{
 const v=(id,lang,rev)=>({id,type:'video',motor:'adaptador',comment:JSON.stringify({schema:'admira.campaign-style-provenance.v1',campaign:'coffee',revision:rev,contentLanguage:lang})});const items=[v('es-h','es',1),v('es-v','es',1),v('en','en',1),v('r2','es',2)];assert.equal(C.measure(items,items).total,3);
});

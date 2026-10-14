import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {starbucksPlacement,isStarbucksFormat,STARBUCKS_ROOM} from '../adaptaciones/starbucks-twin-core.mjs';
import {twinGeometry,screenCrop,previewSize} from '../adaptaciones/gemelo-core.mjs';
const doc=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/pixeria-alsea.json',import.meta.url)));
function geometry(i){return twinGeometry({installation:i},{ancho:i.width,alto:i.height});}
test('photo-derived PG103 wall keeps six native crops in wide 2+1+3 physical groups',()=>{
 const i=doc.instalaciones.find(i=>i.id==='starbucks-pg103'),before=JSON.stringify(i),g=geometry(i),p=starbucksPlacement(g,{formatId:i.id});
 assert.equal(p.photoLayout,true);assert.equal(p.pattern,'2V–1V–3V');assert.deepEqual(p.pieces.map(v=>v.group),[1,1,2,3,3,3]);assert.equal(p.measuredGeometry,false);
 assert(p.pieces[2].position.x-p.pieces[1].position.x>2.5);assert(p.pieces[3].position.x-p.pieces[2].position.x>3.8);
 assert(p.pieces.every(v=>v.height>v.width&&v.position.x-v.width/2>0&&v.position.x+v.width/2<STARBUCKS_ROOM.width));
 assert.deepEqual(p.pieces.map(v=>v.wall),g.segments.map(v=>v.wall));assert.equal(JSON.stringify(i),before);assert.equal(p.exportGeometryUnchanged,true);
});
test('Gran de Gracia retains H–V–H–H–V–H, centre alignment, pixel aspect and exact native crops',()=>{
 const i=doc.instalaciones.find(i=>i.id==='starbucks-gdg51'),g=geometry(i),p=starbucksPlacement(g,{formatId:i.id}),size=previewSize(g);
 assert.equal(p.pattern,'H–V–H–H–V–H');assert.equal(p.location,'gdg51');assert.equal(p.photoLayout,false);assert.equal(p.pieces.length,6);
 for(const [n,v] of p.pieces.entries()){const original=g.segments[n].wall;assert(Math.abs(v.width/v.height-original.w/original.h)<1e-10);assert.equal(v.position.y,2.65);assert.deepEqual(screenCrop(v.wall,g.pared,size),screenCrop(original,g.pared,size));}
});
test('individual campaigns use their client identity while unrelated formats keep their retail model',()=>{
 assert(isStarbucksFormat({id:'landscape',client:{id:'starbucks'}}));assert(isStarbucksFormat({id:'portrait',client:{id:'alsea'}}));assert(isStarbucksFormat({id:'starbucks-vertical'}));assert(isStarbucksFormat({installation:{catalogClient:'starbucks'}}));assert(!isStarbucksFormat({id:'landscape',client:{id:'altadis'}}));
 const g={pared:{ancho:1920,alto:1080},segments:[{n:1,wall:{x:0,y:0,w:1920,h:1080}}]},p=starbucksPlacement(g,{formatId:'landscape'});assert.equal(p.pieces.length,1);assert(Math.abs(p.width/p.height-16/9)<1e-10);
});
test('invalid or out-of-canvas screen geometry is rejected without mutating imported maps',()=>{
 for(const g of [{pared:{ancho:NaN,alto:1},segments:[]},{pared:{ancho:10,alto:10},segments:[{wall:{x:9,y:0,w:2,h:10}}]},{pared:{ancho:10,alto:10},segments:[{wall:{x:0,y:-1,w:10,h:10}}]}])assert.throws(()=>starbucksPlacement(g));
});

test('the additional Gran de Gracia V–H–V–V–H–V is independent and uses all six unchanged native crops',()=>{
 const i=doc.instalaciones.find(i=>i.id==='starbucks-gdg51-vhvvhv'),g=geometry(i),p=starbucksPlacement(g,{formatId:i.id});assert.equal(i.width,8160);assert.equal(p.pattern,'V–H–V–V–H–V');assert.deepEqual(p.pieces.map(v=>v.wall),g.segments.map(v=>v.wall));assert(p.pieces.every(v=>v.position.y===2.65));assert.equal(doc.instalaciones.find(i=>i.id==='starbucks-gdg51').pattern,'H-V-H-H-V-H');
});

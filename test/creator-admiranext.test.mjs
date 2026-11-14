import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign} from '../adaptaciones/campaign-entry.mjs';
import {applyClientInstallations} from '../adaptaciones/client-installations.mjs';
import {twinKind} from '../adaptaciones/gemelo-factory.mjs';
import {twinGeometry} from '../adaptaciones/gemelo-core.mjs';
import {admiraNextPlacement} from '../adaptaciones/admiranext-twin-core.mjs';
import {runProjectCommand} from '../assets/project-scope.mjs';
const ficha=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/admiranext.json',import.meta.url)));
test('fresh project campaigns contain only the two requested workstations',()=>{
 const c=applyClientInstallations(newCampaign(),ficha,{fresh:true});
 assert.equal(c.client.id,'admiranext');assert.deepEqual(c.installations.map(i=>i.id),['macstudio-vhv','macmini-vhv']);
 for(const i of c.installations){assert.equal(i.enabled,true);assert.equal(twinKind({installation:i}),'admiranext');}
 assert.equal(twinKind({client:{id:'altadis'}}),'retail');assert.equal(twinKind({client:{id:'starbucks'}}),'starbucks');
});
test('office preview has two V-H-V desks and preserves every source crop',()=>{
 const i=ficha.instalaciones[0],g=twinGeometry({installation:i},{ancho:i.width,alto:i.height}),before=JSON.stringify(g),p=admiraNextPlacement(g);
 assert.equal(p.pieces.length,6);assert.deepEqual(p.pieces.map(x=>x.height>x.width?'V':'H'),['V','H','V','V','H','V']);
 assert.deepEqual(p.pieces.map(x=>x.station),['MacStudio','MacStudio','MacStudio','MacMini','MacMini','MacMini']);
 assert.deepEqual(p.pieces.slice(0,3).map(x=>x.wall),g.segments.map(s=>s.wall));assert.equal(JSON.stringify(g),before);
 assert.throws(()=>admiraNextPlacement({pared:{ancho:10,alto:10},segments:[{wall:{x:9,y:0,w:3,h:5}}]}));
});
test('project commands stay in Creator in both languages and reset explicitly',async()=>{
 for(const lang of ['es','en']){let target;const win={document:{documentElement:{lang}},sessionStorage:{setItem(){}},location:{pathname:lang==='en'?'/en/creador/':'/creador/',origin:'https://admira.studio',assign:u=>target=u},fetch:async url=>({ok:true,json:async()=>url.includes('session')?{ok:true,clientes:null}:{proyectos:[{id:'admiranext',nombre:'AdmiraNeXT'}]}})};
 await runProjectCommand('AdmiraNeXT',win);assert(target.startsWith(win.location.pathname));assert.match(target,/proyecto=admiranext/);
 await runProjectCommand('all',win);assert(target.startsWith(win.location.pathname));assert.match(target,/proyecto=general/);}
});

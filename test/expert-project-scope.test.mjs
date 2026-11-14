import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveScope,availableProjects,readScope,runProjectCommand,SCOPE_KEY} from '../assets/project-scope.mjs';
import {clientInstallations} from '../adaptaciones/client-installations.mjs';
import {validateFicha} from '../adaptaciones/proyectos-core.mjs';
const index=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/index.json',import.meta.url),'utf8')).proyectos;
const ficha=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/admiranext.json',import.meta.url),'utf8'));
test('ES and EN reset aliases resolve to all; project names and aliases are case insensitive',()=>{
 for(const name of ['all','todos','default','ALL',' Todos '])assert.equal(resolveScope(name,index),'all');
 for(const name of ['AdmiraNeXT','admiranext','despacho','Gran-de-Gracia'])assert.equal(resolveScope(name,index),'admiranext');
 assert.equal(resolveScope('nonexistent',index),null);
 assert.equal(readScope({getItem:()=>null}),'all');
});
test('all is restricted to account permissions and never grants a new project',()=>{
 assert.equal(availableProjects(index,{ok:true,clientes:null}).length,index.length);
 assert.deepEqual(availableProjects(index,{ok:true,clientes:['admiranext']}).map(p=>p.id),['admiranext']);
 assert.deepEqual(availableProjects(index,{ok:false,clientes:null}),[]);
});
test('AdmiraNeXT contains exactly two independent V-H-V workstations',()=>{
 assert.deepEqual(validateFicha(ficha),[]);
 const layouts=clientInstallations(ficha);assert.equal(layouts.length,2);
 assert.deepEqual(layouts.map(x=>x.id),['macstudio-vhv','macmini-vhv']);
 for(const i of layouts){assert.equal(i.screens.length,3);assert.deepEqual(i.screens.map(s=>s.w>s.h?'H':'V'),['V','H','V']);assert.deepEqual(i.screens.map(s=>s.x),[0,1080,3000]);}
 assert.equal(new Set(layouts.flatMap(i=>i.screens.map(s=>s.id))).size,6);
});
test('command keeps the active page when the filter is mounted; unknown projects do not mutate scope',async()=>{
 const calls=[],store=new Map();const win={document:{documentElement:{lang:'es'}},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},fetch:async url=>({ok:true,json:async()=>url.includes('session')?{ok:true,clientes:['admiranext']}:{proyectos:index}}),AdmiraProjectView:{select:async id=>calls.push(id)}};
 await runProjectCommand('AdmiraNeXT',win);await runProjectCommand('todos',win);await runProjectCommand('default',win);await runProjectCommand('all',win);
 assert.deepEqual(calls,['admiranext','all','all','all']);
 await assert.rejects(runProjectCommand('Altadis',win));assert.equal(calls.length,4);
});
test('outside Adapter the command carries the chosen scope across ES/EN navigation',async()=>{
 const values=new Map();let target;const win={document:{documentElement:{lang:'en'}},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},location:{origin:'https://admira.studio',assign:url=>target=url},fetch:async url=>({ok:true,json:async()=>url.includes('session')?{ok:true,clientes:null}:{proyectos:index}})};
 await runProjectCommand('AdmiraNeXT',win);assert.equal(values.get(SCOPE_KEY),'admiranext');assert.match(target,/^\/en\/adaptaciones\//);assert.match(target,/expertProject=admiranext/);
 await runProjectCommand('all',win);assert.match(target,/expertProject=all/);assert.match(target,/proyecto=general/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../adaptaciones/adaptaciones.js',import.meta.url),'utf8');
const start=source.indexOf('function syncURL() {');
const end=source.indexOf('\n// ── Gemelos',start);
assert(start>=0&&end>start,'shared project URL handler is available');
const handler=source.slice(start,end);

function browser(path,project,{view=false}={}){
 let url=new URL(path,'https://admira.studio');
 const writes=[],preferences=new Map([['last-project','admiranext']]);
 const location={get href(){return url.href;},get pathname(){return url.pathname;}};
 const history={state:{kept:true},replaceState(state,title,next){writes.push(next);url=new URL(next,url);}};
 const localStorage={setItem(k,v){preferences.set(k,v);},removeItem(k){preferences.delete(k);}};
 const sync=new Function('URL','location','history','state','GENERAL','vistaFormato','localStorage','PROJECT_KEY',handler+'\nreturn syncURL;')(
  URL,location,history,{proyecto:project},'general',view,localStorage,'last-project');
 return {sync,writes,preferences,url:()=>url.href};
}

test('Creator reload retains its original campaign context instead of inheriting the Adapter project',()=>{
 for(const path of ['/creador/','/en/creador/','/creador/?demo=starbucks-six&content=en&contents=es,en']){
  const page=browser(path,'admiranext'),before=page.url();
  page.sync();page.sync(); // Initial project selection and a later catalogue refresh.
  assert.equal(page.url(),before);
  assert.deepEqual(page.writes,[]);
  assert.equal(page.preferences.get('last-project'),'admiranext');
 }
});

test('explicit Starbucks project, language, installation and campaign parameters survive an unrelated Adapter fallback',()=>{
 const path='/creador/?proyecto=pixeria-alsea&cliente=alsea&instalacion=starbucks-gdg51-seven&content=en&contents=es,en#campaign';
 for(const project of ['general','admiranext']){
  const page=browser(path,project),before=page.url();page.sync();
  assert.equal(page.url(),before);
  assert.equal(page.preferences.get('last-project'),'admiranext');
 }
});

test('Adapter still updates its own project and preserves other navigation parameters',()=>{
 for(const prefix of ['', '/en']){
  const page=browser(prefix+'/adaptaciones/?lang=es#formats','pixeria-alsea');page.sync();
  const url=new URL(page.url());assert.equal(url.searchParams.get('proyecto'),'pixeria-alsea');
  assert.equal(url.searchParams.get('lang'),'es');assert.equal(url.hash,'#formats');
  assert.equal(page.preferences.get('last-project'),'pixeria-alsea');
 }
 const page=browser('/adaptaciones/?proyecto=admiranext','general');page.sync();
 assert.equal(new URL(page.url()).searchParams.has('proyecto'),false);
 assert.equal(page.preferences.has('last-project'),false);
});

test('a temporary Adapter format view does not replace its saved project',()=>{
 const page=browser('/adaptaciones/?formato=cliente-06','altadis-estancos-bcn',{view:true});page.sync();
 assert.equal(new URL(page.url()).searchParams.get('formato'),'cliente-06');
 assert.equal(page.preferences.get('last-project'),'admiranext');
});

test('mirror regeneration preserves the Creator guard and remains idempotent',()=>{
 const {sustituciones}=JSON.parse(readFileSync(new URL('../marca.json',import.meta.url),'utf8'));
 const regenerate=text=>sustituciones.reduce((value,[from,to])=>value.replaceAll(from,to),text);
 const original="function syncURL() {\n  try { history.replaceState(null,'','?proyecto=admiranext'); } catch (_) {}\n}";
 const generated=regenerate(original),writes=[];
 new Function('location','history',generated+'\nsyncURL();')({pathname:'/creador/'},{replaceState(...args){writes.push(args);}});
 assert.deepEqual(writes,[]);
 assert.equal(regenerate(generated),generated);
});

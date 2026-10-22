import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const {fuente,enTramo,attach}=createRequire(import.meta.url)('../assets/capsula-fuente-interactiva.js');
const it={type:'video',capsuleSource:{sourceUrl:'https://lnkd.in/p/e9zXSPkK',credit:'Vídeo: Alber Adilov',broll:{start:5.05,end:9.05},version:2}};
test('la ficha de la cápsula da fuente y tramo del b-roll sin mirar el prompt',()=>{
 const f=fuente({...it,prompt:'nada'});assert.deepEqual(f,{url:'https://lnkd.in/p/e9zXSPkK',credit:'Vídeo: Alber Adilov',start:5.05,end:9.05});
 assert.equal(enTramo(f,5.05),true);assert.equal(enTramo(f,7),true);assert.equal(enTramo(f,9.05),false);assert.equal(enTramo(f,2),false);
 assert.equal(fuente({type:'video'}),null);assert.equal(fuente({capsuleSource:{sourceUrl:'javascript:alert(1)',broll:{start:1,end:2}}}),null);assert.equal(fuente({capsuleSource:{sourceUrl:'https://a.b',broll:{start:3,end:2}}}),null);
 assert.equal(attach(null,it),null);
});
test('el modal de vídeo del Stock (ES y EN) engancha la fuente interactiva',()=>{
 for(const f of ['stock.html','en/stock.html']){const h=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.match(h,/AdmiraCapsulaFuente\?\.attach\(lightboxInner\.querySelector\('video'\), it\)/,f);assert.match(h,/\/assets\/capsula-fuente-interactiva\.js\?v=/,f);}
});

test('v5.3: tramo de toda la explicación sin pestaña automática; v5.1 conserva la suya',()=>{
 const {autoAbre}=createRequire(import.meta.url)('../assets/capsula-fuente-interactiva.js');
 const f53=fuente({capsuleSource:{sourceUrl:'https://www.youtube.com/shorts/MgKUv4ZV1Mc',broll:{start:2,end:14},version:3}});
 assert.equal(enTramo(f53,2),true);assert.equal(enTramo(f53,13.9),true);assert.equal(enTramo(f53,14),false);assert.equal(enTramo(f53,1.9),false);
 assert.equal(autoAbre(f53),false);assert.equal(autoAbre(fuente(it)),true);
});

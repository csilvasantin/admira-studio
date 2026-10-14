import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const F=createRequire(import.meta.url)('../assets/stock-formats.js');
const video=(id,extra={})=>({id,type:'video',motor:'local',title:'Same title',...extra});
test('formato real desde dimensiones españolas, validación, proporción y etiquetas; anamorfico requiere declaración explícita',()=>{
 assert.equal(F.format(video('v',{ancho:1800,alto:2000})).key,'portrait');assert.equal(F.format(video('h',{validacion:{ancho:1920,alto:1080}})).key,'landscape');
 assert.equal(F.format(video('wide',{width:6000,height:1000})).key,'landscape');assert.equal(F.format(video('a',{width:6000,height:1000,tags:['anamórfico']})).key,'anamorphic');
 assert.equal(F.format(video('s',{aspectRatio:'1:1'})).key,'square');assert.equal(F.format(video('short',{prompt:'https://youtube.com/shorts/abc'})).key,'portrait');
 assert.equal(F.format(video('tag',{tags:['portrait']})).key,'portrait');assert.equal(F.format(video('new',{tags:['formato:videowall']})).key,'custom:videowall');
 assert.equal(F.format(video('unknown',{thumbnail:'https://square-poster.jpg'})).key,'unknown');assert.equal(F.format({type:'audio'}),null);
});
test('opciones se descubren en el catálogo: tipos multimedia no cuentan como formatos; etiquetas nuevas aparecen',()=>{
 const opts=F.options([video('v',{format:'video',tags:['vertical']}),video('a',{tags:['format:anamorphic']}),video('x',{tags:['formato:columna']}),{id:'a',type:'audio'}]);assert.deepEqual(new Set(opts.map(x=>x.key)),new Set(['portrait','anamorphic','custom:columna']));
});
test('vínculos reales agrupan originales y adaptaciones encadenadas; títulos idénticos no unen piezas distintas',()=>{
 const original=video('original',{ancho:1080,alto:1920}),adapt=video('adapt',{motor:'adaptador',externalRef:'original',ancho:1920,alto:1080}),chain=video('chain',{motor:'adaptador',externalRef:'adapt'}),other=video('unrelated');
 const idx=F.index([original,adapt,chain,other]);assert.deepEqual(idx.versions(original).map(i=>i.id),['original','adapt','chain']);assert.equal(idx.versions(other).length,1);
 const chosen=new Map([[idx.keys.get('original'),'adapt']]);assert.deepEqual(F.representatives([chain,adapt,original,other],idx,chosen).map(i=>i.id),['adapt','unrelated']);
 assert.equal(F.representatives([original],idx,chosen)[0].id,'original'); // No muestra una variante excluida por el filtro.
});
test('campañas separan idioma/revisión, admiten formatos de un mismo contrato y cápsulas siguen buscables',()=>{
 const p=(id,lang,rev)=>video(id,{motor:'adaptador',comment:JSON.stringify({schema:'admira.campaign-style-provenance.v1',campaign:'coffee',revision:rev,contentLanguage:lang})});
 const a=p('es-h','es',3),b=p('es-v','es',3),c=p('en-h','en',3),d=p('es-old','es',2),cap={id:'cap',type:'capsula'};const idx=F.index([a,b,c,d,cap]);assert.equal(idx.versions(a).length,2);assert.equal(idx.versions(c).length,1);assert.deepEqual(idx.versions(cap),[cap]);
 const orig=video('orig',{tags:['content-language:en']}),en=video('en',{motor:'adaptador',externalRef:'orig',tags:['content-language:en']}),es=video('es',{motor:'adaptador',externalRef:'orig',tags:['content-language:es']});const tr=F.index([orig,en,es]);assert.equal(tr.versions(orig).length,2);assert.equal(tr.versions(es).length,1);
});

test('procedencia de campaña evita mezclar revisiones que comparten fuente original',()=>{const original=video('original'),a=video('a',{motor:'adaptador',externalRef:'original',comment:JSON.stringify({schema:'admira.campaign-style-provenance.v1',campaign:'coffee',revision:1,contentLanguage:'es'})}),b=video('b',{...a,id:'b',comment:JSON.stringify({schema:'admira.campaign-style-provenance.v1',campaign:'coffee',revision:2,contentLanguage:'es'})});const idx=F.index([original,a,b]);assert.equal(idx.versions(a).length,1);assert.equal(idx.versions(b).length,1);});

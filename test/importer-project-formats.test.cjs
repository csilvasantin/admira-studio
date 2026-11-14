const test=require('node:test'),assert=require('node:assert/strict');
require('../extensions/admira-studio-importer/project-formats.js');
require('../extensions/admira-studio-importer/shared.js');
const {options,catalog,label}=globalThis.AdmiraProjectFormats;
test('counts distinct custom formats and preserves V-H-V screen order',()=>{
 const formats=options({instalaciones:[{id:'macstudio-vhv',name:{es:'MacStudio'},screens:[{id:'left',w:1080,h:1920},{id:'center',w:1920,h:1080},{id:'right',w:1080,h:1920}]}]}, {estandar:[{id:'wall',nombre:'Wall',custom:[3000,600]},{id:'wall',nombre:'Wall',custom:[3000,600]}]});
 assert.equal(formats.length,2);assert.equal(formats[1].pattern,'V-H-V');
 assert.deepEqual(formats[1].screens.map(s=>s.id),['left','center','right']);
 assert.equal(label({name:'PortAventuraNeXT',hasCustom:true,formats:Array(4)}),'PortAventuraNeXT (4) formatos');
});
test('resolves project references and never double counts MyBlu',async()=>{
 const origin='https://admira.studio',fixtures={
 '/adaptaciones/proyectos/index.json':{proyectos:[{id:'altadis',archivo:'altadis.json'}]},
 '/adaptaciones/proyectos/altadis.json':{formatos:{estandar:{archivo:'../standard.json',clave:'formats'},especiales:[]}},
 '/adaptaciones/standard.json':{formats:Array.from({length:29},(_,i)=>({id:'f-'+i,custom:[1000+i,300],nombre:'Format '+i}))}};
 const result=await catalog([{id:'altadis',name:'Altadis'},{id:'general',name:'General'}],origin,async url=>({ok:true,json:async()=>fixtures[new URL(url).pathname]}));
 assert.equal(label(result[0]),'Altadis (29) formatos');assert.equal(label(result[1]),'General');
});
test('catalog errors are visible and cross-origin references are rejected',async()=>{
 const fixtures=[{proyectos:[{id:'x',archivo:'x.json'}]},{formatos:{estandar:{archivo:'https://evil.test/a.json',clave:'formats'}}}];let calls=0;
 const result=await catalog([{id:'x',name:'X'}],'https://admira.studio',async()=>({ok:true,json:async()=>fixtures[calls++]}));
 assert.equal(calls,2);assert.equal(result[0].formatsKnown,false);
});
test('custom selection survives handoff separately from ordinary orientation tags',()=>{
 const url=new URL(AdmiraImporter.handoffUrl({url:'https://youtube.com/watch?v=dQw4w9WgXcQ',format:'video',targetFormat:'layout:macstudio-vhv',projectId:'starbucks',formatProject:'pixeria-alsea',subtitleLanguage:'en'}));
 assert.equal(url.searchParams.get('importCustomFormat'),'layout:macstudio-vhv');
 assert.equal(url.searchParams.get('importProject'),'pixeria-alsea');
 assert.match(url.searchParams.get('importTags'),/subtitles-en/);
 assert.throws(()=>AdmiraImporter.handoffUrl({url:'https://youtube.com/watch?v=dQw4w9WgXcQ',targetFormat:'layout:macstudio-vhv'}));
});

test('all preserves project scope and subtitles; unscoped all remains the two orientations',()=>{
 const data={url:'https://youtube.com/watch?v=dQw4w9WgXcQ',format:'video',targetFormat:'all',projectId:'admiranext',subtitleLanguage:'en'};
 const u=new URL(AdmiraImporter.handoffUrl(data));
 assert.equal(u.searchParams.get('importCustomFormat'),'all');
 assert.equal(u.searchParams.get('importProject'),'admiranext');
 assert.match(u.searchParams.get('importTags'),/subtitles-en/);
 const general=new URL(AdmiraImporter.handoffUrl({...data,projectId:''}));
 assert.equal(general.searchParams.get('importCustomFormat'),null);
 assert.match(general.searchParams.get('importTags'),/adaptar-ambos/);
 const audio=new URL(AdmiraImporter.handoffUrl({...data,format:'audio'}));
 assert.equal(audio.searchParams.get('importCustomFormat'),null);
 assert.doesNotMatch(audio.searchParams.get('importTags'),/subtitles|adaptar/);
});

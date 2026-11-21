import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const context=vm.createContext({URL});
for(const file of ['media-link.js','shared.js'])vm.runInContext(readFileSync('extensions/admira-studio-importer/'+file,'utf8'),context);
const link=(url,extra={})=>new URL(context.AdmiraImporter.handoffUrl({url,projectId:'tienda',...extra})).searchParams;
test('solo Stock por defecto; para una pantalla, las tres prioridades llegan sin perder cero ni el formato de audio',()=>{
  for(const url of ['https://lnkd.in/p/eSanFgAY','https://youtu.be/jNQXAC9IVRw']){
    assert.equal(link(url).has('importDelivery'),false);
    for(const priority of [0,1,2]){
      const q=link(url,{priority,queue:priority===2,format:'audio'});
      assert.equal(q.get('importPriority'),String(priority));assert.equal(q.get('deliveryProject'),'tienda');
      assert.equal(q.get('importFormat'),url.includes('youtu')?'audio':'auto');
    }
    assert.throws(()=>link(url,{priority:-1}));
  }
});

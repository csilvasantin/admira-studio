import test from 'node:test';import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';
test('old Assets GET and HEAD links go directly to Store before any Studio session check',async()=>{
 for(const method of ['GET','HEAD'])for(const [path,target] of [['/crear','/assets/'],['/crear/','/assets/'],['/crear/index.html','/assets/'],['/en/crear/','/assets/en/'],['/assets','/assets/'],['/assets/','/assets/']]){
  const response=await onRequest({request:new Request('https://admira.studio'+path+'?view=edicion&furniture=stock-id',{method}),get env(){throw Error('redirect must not request a Studio session');},next(){throw Error('redirect must not serve old generator');}});
  assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://www.admira.store'+target+'?view=edicion&furniture=stock-id');
 }
});
test('multimedia resource paths keep serving their original bytes',async()=>{let calls=0;const response=await onRequest({request:new Request('https://admira.studio/assets/example.png'),env:{},next:async()=>{calls++;return new Response('image',{headers:{'Content-Type':'image/png'}});}});assert.equal(calls,1);assert.equal(response.status,200);assert.equal(await response.text(),'image');});

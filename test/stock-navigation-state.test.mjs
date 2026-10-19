import test from 'node:test';
import assert from 'node:assert/strict';
import {NAVIGATION_KEY, normalizeNavigation, readNavigation, navigationUrl, saveNavigation} from '../assets/stock-navigation-state.mjs';
const memory = () => {
  const data = new Map([['stockView', 'compact'], ['playlists', '["keep"]']]);
  return {data, getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v)};
};
const url = 'https://admira.studio/stock?cliente=Starbucks';
test('return state preserves all filters, page, density and sort without changing existing data', () => {
  const storage = memory(), state = normalizeNavigation({q:'Starbucks', type:'image', format:'portrait', page:3, pageSize:20, view:'compact', sort:'name-asc', tags:['coffee'], tagMode:'and'});
  assert.equal(saveNavigation(storage,url,state),true);
  assert.deepEqual(readNavigation(url,storage),state);
  assert.equal(storage.data.get('stockView'),'compact');assert.equal(storage.data.get('playlists'),'["keep"]');
});
test('explicit URLs override stale filters and page; empty type is all types', () => {
  const storage=memory();saveNavigation(storage,url,{q:'old',type:'image',format:'portrait',page:9});
  assert.deepEqual(readNavigation(url+'&q=new&type=',storage),normalizeNavigation({q:'new',type:''}));
  assert.deepEqual(readNavigation(url+'&highlight=new-asset',storage),normalizeNavigation({}));
  assert.equal(readNavigation(url+'&type=tiktok&page=2',storage).type,'tiktok');
  assert.equal(readNavigation(url+'&type=tiktok&page=2',storage).page,2);
  assert.equal(readNavigation('https://admira.studio/stock?cliente=Other',storage).q,'');
});
test('URL roundtrip preserves context, preview parameters, tags and exact all-types meaning', () => {
  const state=normalizeNavigation({q:'Coffee & tea',type:'',format:'custom:columna',page:4,pageSize:0,view:'compact',sort:'name-desc',tags:['cafe','es'],tagMode:'and'});
  const u=navigationUrl(url+'&highlight=asset&gate=off#section',state);
  assert.equal(u.searchParams.get('highlight'),'asset');assert.equal(u.searchParams.get('cliente'),'Starbucks');assert.equal(u.hash,'#section');
  assert.deepEqual(readNavigation(u, memory()),state);
});
test('closing a preview after clearing filters cannot revive the original query or page', () => {
  const storage=memory(), initial={q:'Starbucks',type:'video',format:'portrait',page:3,view:'compact',sort:'name-asc',pageSize:20};
  saveNavigation(storage,url,initial);
  const cleared=navigationUrl(url,{...initial,q:'',type:'',format:'',page:1});
  const restored=readNavigation(cleared,storage,initial);
  assert.equal(restored.q,'');assert.equal(restored.type,'');assert.equal(restored.format,'');assert.equal(restored.page,1);
  assert.equal(restored.view,'compact');assert.equal(restored.sort,'name-asc');assert.equal(restored.pageSize,20);
});
test('bad or unavailable storage does not corrupt data or prevent explicit URL navigation', () => {
  for(const raw of ['broken',JSON.stringify({version:2,state:{q:'future'}})]){
    const storage=memory();storage.data.set(NAVIGATION_KEY,raw);
    assert.equal(saveNavigation(storage,url,{q:'new'}),false);assert.equal(storage.data.get(NAVIGATION_KEY),raw);
    assert.equal(readNavigation(url+'&q=usable',storage).q,'usable');
  }
  assert.equal(readNavigation(url,{getItem(){throw Error('blocked')}}).type,'video');
  assert.equal(saveNavigation({getItem(){throw Error('blocked')}},url,{}),false);
  assert.equal(normalizeNavigation({type:'bad',page:-3,pageSize:NaN,sort:'bad',tags:['<bad>']}).page,1);
});

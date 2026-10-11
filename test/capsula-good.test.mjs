import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKnowledgeDemo} from '../assets/capsula-good.mjs';
test('accepts ES/EN capsule commands and language overrides',()=>{
  assert.deepEqual(parseKnowledgeDemo('capsula conocimiento good'),{action:'play',lang:'es'});
  assert.deepEqual(parseKnowledgeDemo('cápsula conocimiento good en'),{action:'play',lang:'en'});
  assert.deepEqual(parseKnowledgeDemo('capsule knowledge good','en'),{action:'play',lang:'en'});
  assert.deepEqual(parseKnowledgeDemo('capsula cerrar'),{action:'close',lang:'es'});
});
test('unsupported qualities or commands cannot silently play GOOD',()=>{
  assert.equal(parseKnowledgeDemo('capsula conocimiento best').action,'help');
  assert.equal(parseKnowledgeDemo('taza'),null);
});

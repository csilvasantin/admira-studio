import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngine, metadataOf, MAX_SOURCE_BYTES} from '../adaptaciones/adapter-export.js';

const metadata = {streams: [{codec_type: 'audio'}, {codec_type: 'video', width: 320, height: 240}], format: {duration: '19.063583'}};
test('sondeo exige vídeo y duración finitos y descarta la carátula de audio', () => {
  assert.deepEqual(metadataOf(metadata), {w: 320, h: 240, d: 19.063583});
  for (const d of [null, {streams: []}, {streams: [{codec_type: 'video', width: 320, height: 240, disposition: {attached_pic: 1}}], format: {duration: 2}}, {...metadata, format: {duration: 'Infinity'}}]) {
    assert.throws(() => metadataOf(d), /media-metadata/);
  }
});

function worker() {
  const files = new Map(), calls = {probes: 0, inputs: 0, terminated: 0};
  return {files, calls, load: async () => {}, on() {}, off() {},
    async writeFile(name, data) {files.set(name, data); if (name === 'input') calls.inputs++;},
    async readFile(name) {if (!files.has(name)) throw new Error('missing'); return files.get(name);},
    async deleteFile(name) {files.delete(name);},
    async ffprobe(args, timeout) {calls.probes++; assert.equal(timeout, 30000); files.set('source-metadata.json', JSON.stringify(metadata)); return -1;},
    async exec() {files.set('output.mp4', new Uint8Array([1, 2, 3])); return 0;},
    terminate() {calls.terminated++;},
  };
}
test('sondeo y codificación comparten la descarga; un resultado nuevo válido admite el -1 de WASM', async () => {
  const w = worker(), requests = [], old = globalThis.fetch;
  globalThis.fetch = async url => {requests.push(url); return new Response(new Uint8Array([0, 1, 2]));};
  const engine = createEngine({createWorker: async () => w});
  try {
    assert.deepEqual(await engine.probe('https://media.test/clip.mp4'), {w: 320, h: 240, d: 19.063583});
    let blob;
    await engine.encode('https://media.test/clip.mp4', {args: []}, () => {}, (_, b) => {blob = b;});
    assert.equal(blob.size, 3); assert.equal(w.calls.inputs, 1);
    assert.equal(requests.filter(url => url === 'https://media.test/clip.mp4').length, 1);
    assert.equal(w.files.has('source-metadata.json'), false);
  } finally {engine.cancel(); globalThis.fetch = old;}
});
test('sondeo no acepta JSON antiguo tras timeout y respeta el límite de descarga', async () => {
  const old = globalThis.fetch;
  for (const tooBig of [false, true]) {
    const w = worker(); w.files.set('source-metadata.json', JSON.stringify(metadata));
    w.ffprobe = async () => 1;
    globalThis.fetch = async url => new Response('data', {headers: url.includes('media.test') && tooBig ? {'Content-Length': String(MAX_SOURCE_BYTES + 1)} : {}});
    const engine = createEngine({createWorker: async () => w});
    try {
      await assert.rejects(engine.probe('https://media.test/clip.mp4'), tooBig ? /source-size/ : /missing/);
      assert.equal(w.calls.terminated, 1);
    } finally {engine.cancel(); globalThis.fetch = old;}
  }
});

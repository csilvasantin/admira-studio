import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAuth} from '../functions/_auth.js';
import {readFile} from 'node:fs/promises';

function fakeDatabase() {
  return {
    prepare() {
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async run() { return {success:true, values}; }
      };
    }
  };
}

test('Google vuelve al dominio apex autorizado de admira.studio', async () => {
  const response = await handleAuth(
    new Request('https://admira.studio/auth/login?return_to=%2F'),
    {AUTH_DB:fakeDatabase(), PIXERIA_SIGNING_KEY:'test-signing-key'}
  );
  const html = await response.text();

  assert.equal(response.status, 401);
  assert.match(html, /data-login_uri="https:\/\/admira\.studio\/auth\/callback"/);
  assert.doesNotMatch(html, /data-login_uri="https:\/\/www\.admira\.studio/);
});

test('la siguiente regeneración conserva el callback autorizado', async () => {
  const config = JSON.parse(await readFile(new URL('../marca.json', import.meta.url), 'utf8'));
  const generated = config.sustituciones.reduce(
    (source, [from, to]) => source.replaceAll(from, to),
    "const CALLBACK_URI = 'https://www.pixeria.com/auth/callback';"
  );

  assert.match(generated, /https:\/\/admira\.studio\/auth\/callback/);
  assert.doesNotMatch(generated, /https:\/\/www\.admira\.studio\/auth\/callback/);
});

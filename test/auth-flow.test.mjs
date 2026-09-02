import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAuth, verifyGoogleCredential} from '../functions/_auth.js';
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

test('una cuenta corporativa verificada no depende del claim opcional hd', async () => {
  const keyPair = await crypto.subtle.generateKey(
    {name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'},
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encoded({alg:'RS256', kid:'test-key'});
  const payload = encoded({
    sub:'corporate-owner',
    email:'csilva@admira.com',
    email_verified:true,
    aud:'861856772040-e1ri6kpu6maagtb6crdfbb923hsaalgb.apps.googleusercontent.com',
    iss:'https://accounts.google.com',
    exp:Math.floor(Date.now() / 1000) + 300,
    nonce:'test-nonce'
  });
  const signature = await crypto.subtle.sign(
    {name:'RSASSA-PKCS1-v1_5'},
    keyPair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const token = `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
  const fetchJwks = async () => Response.json({keys:[{...publicJwk, kid:'test-key', alg:'RS256'}]});

  assert.deepEqual(await verifyGoogleCredential(token, fetchJwks), {
    email:'csilva@admira.com', sub:'corporate-owner', nonce:'test-nonce'
  });
});

test('la siguiente regeneración conserva la compatibilidad corporativa', async () => {
  const config = JSON.parse(await readFile(new URL('../marca.json', import.meta.url), 'utf8'));
  const original = "const googleAuthoritative = email.endsWith('@gmail.com') || (emailVerified && typeof payload.hd === 'string' && payload.hd.length > 0);";
  const generated = config.sustituciones.reduce(
    (source, [from, to]) => source.replaceAll(from, to), original
  );

  assert.equal(generated, 'const googleAuthoritative = emailVerified;');
});

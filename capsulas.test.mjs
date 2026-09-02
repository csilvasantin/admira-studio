import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(new URL("./index.html", import.meta.url), "utf8");
const stock = await readFile(new URL("./stock.html", import.meta.url), "utf8");

test("Admira Studio presenta Capsules como formato de conocimiento", () => {
  assert.match(home, /<h3>Capsules<\/h3>/);
  assert.match(home, /verifiable source/);
  assert.match(stock, /<option value="capsula">Capsules<\/option>/);
  assert.doesNotMatch(stock, />Scriptes<\/option>/);
});

test("el Stock pinta cápsulas nuevas y guiones históricos bajo el mismo nombre", () => {
  assert.match(stock, /function isCapsule\(it\)/);
  assert.match(stock, /it\.type === 'capsula' \|\| it\.type === 'guion'/);
  assert.match(stock, /capsula: 'Capsule', guion: 'Capsule'/);
  assert.match(stock, /class="stock-capsula"/);
});

test("el detalle de una cápsula permite valorar de una a cinco estrellas", () => {
  assert.match(stock, /function renderRatingHtml\(it\)/);
  assert.match(stock, /data-act="rate-capsule"/);
  assert.match(stock, /\/rating`/);
  assert.match(stock, /ratingVoterId\(\)/);
  assert.match(stock, /rememberRating\(it\.id, value\)/);
});

test("estrellas y views comparten la línea de fecha del detalle", () => {
  assert.match(stock, /class="stock-lightbox-head"/);
  assert.match(stock, /\$\{fmtDate\(it\.createdAt\)\}<\/span>\$\{ratingBlock\}\$\{consumptionBlock\}/);
  assert.match(stock, /event=consume/);
  assert.match(stock, /sessionStorage\.getItem\(CONSUMPTION_SESSION_KEY\)/);
  assert.match(stock, /trackCapsuleConsumption\(it\)/);
});

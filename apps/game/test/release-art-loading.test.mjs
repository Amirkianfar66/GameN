import assert from 'node:assert/strict';
import test from 'node:test';
import { ART_BUNDLES, COMMON_ART_BUNDLES, loadArt } from '../hosted/art.mjs';

function page() {
  const links = [], events = [];
  const document = { documentElement: { dataset: {} }, dispatchEvent: event => events.push(event.type),
    createElement: () => ({ listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } }),
    head: { append: link => links.push(link) } };
  return { document, links, events };
}
test('all eight player bundles start uniformly and Ready loading does not settle before the supplements', async () => {
  const { document, links } = page(); const pending = loadArt('player', document);
  assert.deepEqual(links.map(link => link.href).sort(), [...Object.values(ART_BUNDLES), ...Object.values(COMMON_ART_BUNDLES)].sort());
  for (const link of links.filter(link => Object.values(ART_BUNDLES).includes(link.href))) link.listeners.load();
  assert.equal(document.documentElement.dataset.artSettled, 'false');
  for (const link of links.filter(link => Object.values(COMMON_ART_BUNDLES).includes(link.href))) link.listeners.load();
  await pending;
  assert.equal(document.documentElement.dataset.artSettled, 'true');
  assert.equal(document.documentElement.dataset.art.split(' ').length, 8);
});
test('a failed supplement is not acknowledged; its later arrival can recover without erasing loaded bundles', async () => {
  const { document, links } = page(); const pending = loadArt('player', document);
  const failed = links.find(link => link.href === COMMON_ART_BUNDLES['setup-art']);
  for (const link of links) (link === failed ? link.listeners.error : link.listeners.load)();
  await pending;
  assert.equal(document.documentElement.dataset.artSettled, 'true');
  assert.ok(!document.documentElement.dataset.art.split(' ').includes('setup-art'));
  failed.listeners.load();
  assert.equal(new Set(document.documentElement.dataset.art.split(' ')).size, 8);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import hosted from '../../apps/game/hosted/vite.config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const boundary = hosted.plugins.find(plugin => plugin.name === 'hosted-preview-source-boundary');
const components = 'design/phone-ui/components/';

test('the hosted component list admits each named source file exactly', () => {
  for (const name of ['main-menu/main-menu.mjs', 'round-stamp/round-stamp.css', 'kit/kit.mjs']) {
    const path = root + components + name;
    assert.doesNotThrow(() => boundary.transform('', path + '?direct'), name);
    assert.throws(() => boundary.transform('', path + '.map'), /Non-hosted source/, name);
  }
});

test('runtime directories exclude preview and review folders and keep the hosted preview stylesheet', () => {
  const room = root + components + 'room-scene/';
  assert.doesNotThrow(() => boundary.transform('', room + 'room-scene.mjs'));
  assert.doesNotThrow(() => boundary.transform('', root + 'apps/game/hosted/preview.css'));
  for (const file of ['preview/preview.mjs', 'review/430x932-own.jpg']) {
    assert.throws(() => boundary.transform('', room + file), /Non-hosted source/, file);
  }
});

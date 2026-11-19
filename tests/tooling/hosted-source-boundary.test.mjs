import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import hosted from '../../apps/game/hosted/vite.config.mjs';
import {pregameMenuMediaPlugin} from '../../scripts/pregame-menu-media.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const boundary = hosted.plugins.find(plugin => plugin.name === 'hosted-preview-source-boundary');
const components = 'design/phone-ui/components/';

test('the hosted component list admits each named source file exactly', () => {
  for (const name of ['main-menu/main-menu.mjs', 'main-menu/entry-title.mjs', 'main-menu/entry-title.css', 'round-stamp/round-stamp.css', 'kit/kit.mjs']) {
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

test('the menu admits only the two runtime layer files from the Animator package', () => {
  const base = root + 'design/menu-space-film/';
  for (const path of ['runtime/layer.mjs', 'runtime/layer.css']) {
    assert.doesNotThrow(() => boundary.transform('', base + path));
  }
  for (const path of ['runtime/other.mjs', 'preview/layer.mjs', 'review/mobile-encode.mp4']) {
    assert.throws(() => boundary.transform('', base + path), /Non-hosted source/);
  }
});

test('the hosted menu and its three media files must be selected together', async t => {
  const key = 'import.meta.env.VITE_GAMEN_PREGAME_MEDIA';
  const disabled = pregameMenuMediaPlugin({});
  assert.equal(disabled.config().define[key], '"0"');
  await disabled.generateBundle.call({emitFile: () => assert.fail('default build emitted menu media')});
  assert.throws(() => pregameMenuMediaPlugin({VITE_GAMEN_PREGAME_MEDIA:'1'}), /requires MOTHERSHIP_PREGAME_MEDIA_DIR/);
  assert.throws(() => pregameMenuMediaPlugin({VITE_GAMEN_PREGAME_MEDIA:'yes'}), /must be 0 or 1/);
  const directory = await mkdtemp(join(tmpdir(), 'gamen-menu-exports-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const enabled = pregameMenuMediaPlugin({MOTHERSHIP_PREGAME_MEDIA_DIR:directory});
  assert.equal(enabled.config().define[key], '"1"');
  const context = {emitFile: () => assert.fail('unverified media entered the release')};
  await assert.rejects(enabled.generateBundle.call(context), {code:'ENOENT'});
  await mkdir(join(directory, 'menu-film/480b53fb'), {recursive:true});
  await writeFile(join(directory, 'menu-film/480b53fb/night-passage.mp4'), 'different film');
  await assert.rejects(enabled.generateBundle.call(context), /differs from the reviewed export/);
});

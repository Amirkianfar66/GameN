// The Room ↔ Board zoom (design/phone-ui/components/view-zoom): a runtime source the game imports as it is, so its
// module graph, its timings (the handoff's motion table and the kit's ease), its geometry and its inputs are checked
// here; its frames, taps, cancelling and cleaning up in a browser under the production headers by
// design/tools/view-zoom-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEW_ZOOM_VERSION, ZOOM_TIMING, zoomGeometry, zoomRoomBoard } from '../../../design/phone-ui/components/view-zoom/view-zoom.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/view-zoom';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');

test('the component is a runtime source with no imports, nothing development-only, and marked previews', () => {
  const source = read(`${COMPONENT}/view-zoom.mjs`);
  assert.doesNotMatch(source, /^\s*import\s/m, 'it imports nothing');
  assert.doesNotMatch(source, /mothership:dev-only/);
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs']) assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, path);
  assert.match(read('design/tools/view-zoom-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(VIEW_ZOOM_VERSION, 'view-zoom-0.1.0');
});

test('the timings are the handoff\'s motion table, on the kit\'s ease', () => {
  assert.deepEqual(ZOOM_TIMING, { zoom: 450, fade: 180, crossfade: 220, ease: 'cubic-bezier(0.2, 0, 0, 1)' });
  const handoff = read('docs/design/phone-ui-handoff.md');
  assert.match(handoff, /\| Room ↔ Board \| 450 ms zoom from the current room's panel \| Direct \|/);
  assert.match(handoff, /\| Tab or state change \| 220 ms crossfade \| Direct \|/);
  assert.match(read('design/phone-ui/components/kit/kit.css'), /--ms-k-ease: cubic-bezier\(0\.2, 0, 0, 1\);/);
});

test('the geometry: the panel covers the stage, centred, and the room view sets into the panel', () => {
  const stage = { width: 390, height: 653 }, panel = { left: 6, top: 171, width: 186, height: 260 };
  const g = zoomGeometry(stage, panel);
  assert.equal(g.scale, Math.max(390 / 186, 653 / 260));
  const map = (x, y) => [g.tx + g.scale * x, g.ty + g.scale * y];
  const [l, t] = map(panel.left, panel.top), [r, b] = map(panel.left + panel.width, panel.top + panel.height);
  assert.ok(l <= 1e-9 && t <= 1e-9 && r >= stage.width - 1e-9 && b >= stage.height - 1e-9, 'it covers the stage');
  assert.ok(Math.abs((l + r) / 2 - stage.width / 2) < 1e-9 && Math.abs((t + b) / 2 - stage.height / 2) < 1e-9, 'centred');
  // The room view's transform is the board's inverse: the stage's centre goes to the panel's.
  const inv = (x, y) => [-g.tx / g.scale + x / g.scale, -g.ty / g.scale + y / g.scale];
  const [cx, cy] = inv(stage.width / 2, stage.height / 2);
  assert.ok(Math.abs(cx - (panel.left + panel.width / 2)) < 1e-9 && Math.abs(cy - (panel.top + panel.height / 2)) < 1e-9);
  assert.equal(g.cover, `translate(${g.tx}px, ${g.ty}px) scale(${g.scale})`);
  assert.equal(g.into, `translate(${-g.tx / g.scale}px, ${-g.ty / g.scale}px) scale(${1 / g.scale})`);
});

test('inputs: two elements, a direction, a panel or null, a Reduce motion setting and a hold', () => {
  for (const bad of [{}, { room: {}, board: {}, to: 'board' }, { room: null, board: null, to: 'room' }]) assert.throws(() => zoomRoomBoard(bad), TypeError);
});

test('the check\'s record: every capture and the probe passed, on clean committed source, under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/view-zoom-check.mjs');
  assert.equal(record.sourceClean, true);
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  assert.equal(record.headersSha256, '424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb');
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 10, 'five moments at both phone sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.held && c.views === 2, `${key}: both views, held where asked`);
    assert.equal(c.sha256, sha256(c.file), `${key}: the committed capture is the recorded one`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['frames', 'timing', 'crossfade', 'direct', 'taps', 'partway', 'clean', 'inputs']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['direct']);
  for (const run of Object.values(record.probe)) assert.ok(run.ok && run.checks.every(c => c.ok));
});

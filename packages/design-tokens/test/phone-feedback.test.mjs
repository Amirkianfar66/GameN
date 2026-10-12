// mothership:dev-only
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CREW } from '../../../design/board-motion/figures/crew.mjs';
import { GESTURES, skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { figureSvg } from '../../../design/board-motion/figures/body.mjs';
import { wardrobeSvg, outfitFor, OUTFITS } from '../../../design/phone-feedback/source/wardrobe.mjs';
import { voteComposition, hackComposition, windowState, HACK_TIMING } from '../../../design/phone-feedback/source/compositions.mjs';
import { compactSlots, compactBands } from '../../../design/phone-feedback/source/compact-layout.mjs';
import { planPhoneAssets, root } from '../../../design/tools/phone-feedback-assets.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
test('crew output is byte-identical; all nine identities render in every existing pose/mark/layer', () => {
  let drawings = 0;
  for (const crew of Object.values(CREW)) for (const pose of Object.keys(GESTURES)) for (const mark of ['', '+injured', '+still']) for (const outfit of OUTFITS) for (const layer of ['body', 'front']) {
    const sk = skeletonOf(pose + mark), options = { prefix: 'test', layer, outfit };
    const svg = wardrobeSvg(crew, sk, options); assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    assert.match(svg, /viewBox="-90 -40 300 300"/);
    if (outfit === 'crew') assert.equal(svg, figureSvg(crew, sk, options));
    if (layer === 'body' && outfit !== 'crew') assert.ok(svg.includes(crew.skin), 'original face/skin stays present');
    drawings++;
  }
  assert.equal(drawings, 9 * Object.keys(GESTURES).length * 3 * 3 * 2);
});
test('clothes are public room only; released injured Jail and Healthy Hospital remain truthful', () => {
  assert.equal(outfitFor('Jail'), 'prisoner'); assert.equal(outfitFor('Hospital'), 'patient');
  for (const place of ['Room A', 'Room B', 'Command Room', 'Final Zone']) assert.equal(outfitFor(place), 'crew');
  assert.throws(() => wardrobeSvg(CREW.c1, GESTURES.stand, { outfit: 'Red' }));
});
test('new manifest/exports/port proposals reproduce exactly; source guards remain separate', async () => {
  const { files, manifest } = await planPhoneAssets();
  for (const [path, bytes] of files) assert.equal(await readFile(resolve(root, path), 'utf8'), bytes, path);
  assert.equal(manifest.entries.filter(entry => entry.character).length, 54);
  assert.equal(manifest.proposedPorts['design/phone-feedback/source/wardrobe.mjs'].proposedRuntimePath, 'apps/game/hosted/scene-drawing/wardrobe.mjs');
});
const seats = [{ n: 1, name: 'Vega', character: 'c1', location: 'Jail', health: 'Injured', jailed: false, captain: false, role: 'Undercover', actualFaction: 'Red' }];
test('public result cannot acquire secret ballots, a faction/game winner, roles or Code', () => {
  const result = voteComposition({ outcome: 'PLAYER_RELEASED', kind: 'RELEASE_VOTE', eligibleVoterCount: 9, yesCount: 5, selectedSeatId: 'seat-1', counts: {}, ballots: [{ voter: 'seat-2', choice: true }], winner: 'Red', code: [1, 2, 3, 4] }, seats);
  const bytes = JSON.stringify(result); assert.doesNotMatch(bytes, /Undercover|Red|ballots|winner|code|actualFaction/); assert.equal(result.selected.jailed, false);
  assert.equal(voteComposition({ outcome: 'Red', eligibleVoterCount: 9 }, seats), null);
});
test('vote outcome is explicitly supplied, never inferred from an aggregate threshold', () => {
  const counts = { 'seat-1': 5 };
  for (const outcome of ['CAPTAIN_ELECTED', 'RUNOFF_REQUIRED', 'NO_CAPTAIN_ELECTED', 'PLAYER_JAILED', 'NO_JAIL_SELECTION', 'PLAYER_RELEASED', 'RELEASE_DENIED']) {
    const value = voteComposition({ outcome, kind: outcome.includes('RELEASE') ? 'RELEASE_VOTE' : 'CAPTAIN_ELECTION', eligibleVoterCount: 9, selectedSeatId: 'seat-1', yesCount: 5, counts }, seats);
    assert.equal(value.outcome, outcome);
  }
});
test('private Hack shows the declaration, no truth inference, and has no uninvolved/stale output', () => {
  const view = { phase: { kind: 'HACK_RESULT', endsAt: 5000 }, partner: seats[0], hackFeedback: { status: 'DECLARED', declaredSide: 'Blue', actualFaction: 'Red' } };
  const opts = { current: true, concealed: false, participant: true };
  assert.equal(hackComposition(view, opts).declaration, 'Blue'); assert.doesNotMatch(JSON.stringify(hackComposition(view, opts)), /Undercover|Red|actualFaction/);
  assert.equal(hackComposition(view, { ...opts, participant: false }), null); assert.equal(hackComposition(view, { ...opts, current: false }), null); assert.equal(hackComposition(view, { ...opts, concealed: true }), null);
  assert.equal(hackComposition({ ...view, hackFeedback: { status: 'NO_DECLARATION', declaredSide: null } }, opts).declaration, 'No side declared');
  assert.deepEqual(HACK_TIMING, { declarationMaxMs: 15000, resultMs: 5000, conversationMs: 60000 });
});
test('five-second result includes entrance/exit, reconnect/reduction never restarts its deadline', () => {
  const phase = { id: 'public-result', startedAt: 1000, endsAt: 6000 };
  assert.equal(windowState(phase, 1000).beat, 'enter'); assert.equal(windowState(phase, 5999).beat, 'exit'); assert.equal(windowState(phase, 6000).visible, false);
  for (const opts of [{ reconnect: true }, { reduced: true }, { seen: true }]) assert.deepEqual(windowState(phase, 4200, opts), { visible: true, remainingMs: 1800, beat: 'settled' });
  assert.equal(windowState(phase, 4200, { current: false }).visible, false);
});
test('compact anchors fit one to five occupants without overlap; two occupants use one row', () => {
  for (let n = 1; n <= 5; n++) {
    const slots = compactSlots(n, { width: 148, height: n > 3 ? 136 : 92 }); assert.ok(slots);
    for (const [i, a] of slots.entries()) { assert.equal(a.side, 44); assert.ok(a.left >= 0 && a.left + 44 <= 148); for (const b of slots.slice(i + 1)) assert.ok(a.left + 44 <= b.left || b.left + 44 <= a.left || a.top + 44 <= b.top || b.top + 44 <= a.top); }
  }
  const two = compactSlots(2, { width: 148, height: 92 }); assert.equal(two[0].top, two[1].top);
  const bands = compactBands({ command: 1, a: 5, b: 2, h: 1, j: 0 }, { available: 348, action: true }); assert.ok(bands.reduce((a, b) => a + b, 0) <= 348.01);
});

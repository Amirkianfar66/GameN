// mothership:dev-only
//
// Library group 6 (design/library/offices/; docs/design/library/offices.md): the Captain's Officer
// appointment, the Officer's movement block, the public office badges and the board's block marker.
// These test the proposal's own modules: the state maps from a player view, the words, the art's
// family and palette, the generated assets and the motion. None of them is a rule or a server answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { O, OFFICE_ART_VERSION, officeAssets } from '../../../design/library/offices/art.mjs';
import { OFFICE_COPY } from '../../../design/library/offices/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/offices/motion.mjs';
import { appointState, badges, blockState, officeChanges, publicStage, selfBlocked } from '../../../design/library/offices/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

function view({ seat = 'seat-7', phase = 'ORDINARY_TURN', round = 4, captain = 'seat-7', officer = 'seat-3', blocked = null, offers = {} }) {
  return { round, phase: { id: `r${round}-${phase}`, kind: phase }, self: { seatId: seat }, offices: { captainSeatId: captain, officerSeatId: officer, blockedSeatId: blocked }, offers: Object.entries(offers).map(([type, targetSeatIds]) => ({ type, targetSeatIds })) };
}

test('the appointment: only the Captain, only in its 30 seconds; the offer lists the eligible; none eligible leaves the office vacant', () => {
  const appoint = (o = {}) => view({ phase: 'OFFICER_APPOINTMENT', officer: null, offers: { APPOINT_OFFICER: ['seat-6', 'seat-1', 'seat-3'] }, ...o });
  assert.equal(appointState(view({ seat: 'seat-2', phase: 'OFFICER_APPOINTMENT', officer: null })).state, 'none', 'not the Captain');
  assert.equal(appointState(view({ phase: 'ORDINARY_TURN', officer: null })).state, 'none', 'another phase');
  assert.deepEqual(appointState(appoint()), { state: 'choose', targets: ['seat-1', 'seat-3', 'seat-6'] });
  assert.deepEqual(appointState(appoint(), { picked: 'seat-3' }), { state: 'confirm', targets: ['seat-1', 'seat-3', 'seat-6'], target: 'seat-3' });
  assert.equal(appointState(appoint(), { picked: 'seat-7' }).state, 'choose', 'a player the offer does not list');
  assert.equal(appointState(appoint(), { pending: 'APPOINT_OFFICER', picked: 'seat-3' }).state, 'sending');
  assert.deepEqual(appointState(appoint({ officer: 'seat-3', offers: {} })), { state: 'appointed', officer: 'seat-3' });
  assert.equal(appointState(appoint({ offers: { APPOINT_OFFICER: [] } })).state, 'vacant');
  assert.equal(appointState(appoint({ offers: {} })).state, 'closed');
  assert.equal(appointState(appoint(), { rejected: { APPOINT_OFFICER: { phaseId: 'r4-OFFICER_APPOINTMENT', code: 'NOT_ALLOWED' } } }).state, 'refused');
});

test('the block: only the Officer, only in the pre-turn window; optional; the offer leaves out who cannot be blocked', () => {
  const pre = (o = {}) => view({ seat: 'seat-3', phase: 'PRE_TURN', offers: { BLOCK_MOVE: ['seat-5', 'seat-1', 'seat-8'] }, ...o });
  assert.equal(blockState(view({ seat: 'seat-2', phase: 'PRE_TURN' })).state, 'none');
  assert.equal(blockState(view({ seat: 'seat-3', phase: 'ORDINARY_TURN' })).state, 'none');
  assert.deepEqual(blockState(pre()), { state: 'choose', targets: ['seat-1', 'seat-5', 'seat-8'] });
  assert.equal(blockState(pre(), { picked: 'seat-5' }).state, 'confirm');
  assert.equal(blockState(pre(), { picked: 'seat-2' }).state, 'choose', 'a player the offer leaves out');
  assert.equal(blockState(pre(), { pending: 'BLOCK_MOVE', picked: 'seat-5' }).state, 'sending');
  assert.deepEqual(blockState(pre({ blocked: 'seat-5', offers: {} })), { state: 'blocked', target: 'seat-5' });
  assert.equal(blockState(pre({ offers: {} })).state, 'closed');
  assert.match(OFFICE_COPY.blockChoose, /If you choose no one, nobody is blocked/);
});

test('the public stage reads the same whoever acts in the pre-turn window, and never hints at anything secret', () => {
  assert.deepEqual(publicStage(view({ phase: 'OFFICER_APPOINTMENT' })), { stage: 'appointing', captain: 'seat-7' });
  assert.deepEqual(publicStage(view({ phase: 'PRE_TURN' })), { stage: 'pre-turn', officer: 'seat-3' });
  assert.deepEqual(publicStage(view({ phase: 'PRE_TURN', officer: null })), { stage: 'quiet' });
  // The stage depends on public fields only: a view carrying anything else draws the same stage.
  const extra = { ...view({ phase: 'PRE_TURN' }), abilities: { blackholeSpent: true }, self: { seatId: 1, role: 'Alien' } };
  assert.deepEqual(publicStage(extra), publicStage(view({ phase: 'PRE_TURN' })));
  for (const text of [OFFICE_COPY.preTurn, OFFICE_COPY.quiet, OFFICE_COPY.appointing]) assert.doesNotMatch(text, /blackhole|alien|secret|role|faction/i, text);
});

test('badges and the block: offices first, the block for this round only; the blocked player\'s own note; changes play once', () => {
  const v = view({ blocked: 'seat-5', captain: 'seat-7', officer: 'seat-3' });
  assert.deepEqual(badges(v, 'seat-7'), ['captain']); assert.deepEqual(badges(v, 'seat-3'), ['officer']); assert.deepEqual(badges(v, 'seat-5'), ['blocked']); assert.deepEqual(badges(v, 'seat-1'), []);
  assert.deepEqual(badges(view({ captain: 'seat-7', officer: 'seat-7' }), 'seat-7'), ['captain', 'officer'], 'one seat, both offices, in order');
  assert.equal(selfBlocked(view({ seat: 'seat-5', blocked: 'seat-5' })), true); assert.equal(selfBlocked(view({ seat: 'seat-1', blocked: 'seat-5' })), false);
  assert.match(OFFICE_COPY.selfBlocked, /still vote.*windows.*Hospital or the Jail, still happens/);
  assert.deepEqual(officeChanges(null, v), { appointed: null, blocked: null, expired: null }, 'a reconnect draws at rest');
  assert.deepEqual(officeChanges(view({ officer: null }), view({ officer: 'seat-3' })), { appointed: 'seat-3', blocked: null, expired: null });
  assert.deepEqual(officeChanges(view({}), view({ blocked: 'seat-5' })), { appointed: null, blocked: 'seat-5', expired: null });
  assert.deepEqual(officeChanges(view({ blocked: 'seat-5' }), view({ round: 5 })), { appointed: null, blocked: null, expired: 'seat-5' });
});

test('the words: the Officer is an office, never a role or a side; nothing says whether the clock chose', () => {
  const texts = Object.values(OFFICE_COPY).map(v => (typeof v === 'function' ? v('Player 3, Cleo') : v));
  for (const text of texts) {
    assert.doesNotMatch(text, /\b(blue|red|alien|faction|side|team)\b/i, text);
    assert.doesNotMatch(text, /\b(timed out|chosen for you|auto)\b/i, text);
  }
  assert.match(OFFICE_COPY.officeNote, /public office.*nothing about a player's secret role/);
  assert.match(OFFICE_COPY.appointChoose, /chosen at random/);
});

test('the art: the Captain badge\'s family (disc, rim, shadow, glyph at 0.66); dashed only for the block; one palette off the accents', () => {
  const assets = officeAssets();
  const palette = new Set(Object.values(O).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex}`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  for (const name of ['of-badge-officer', 'of-badge-blocked']) {
    const svg = assets[name].svg;
    assert.match(svg, /<circle cx="19.5" cy="19.5" r="14.5" fill="#151923"\/><circle cx="17" cy="17" r="14.5" fill="#F4EBDD" stroke="#151923" stroke-width="2.5"/, `${name}: the Captain badge's disc`);
    assert.match(svg, /translate\(17 17\) scale\(0\.66\) translate\(-16 -16\)/, `${name}: the glyph at 0.66`);
  }
  assert.doesNotMatch(assets['of-badge-officer'].svg, /stroke-dasharray/, 'an office is solid');
  assert.match(assets['of-badge-blocked'].svg, /stroke-dasharray/, 'a block is dashed');
  assert.notEqual(assets['of-glyph-officer'].svg.replace(/<!--[\s\S]*?-->/, ''), assets['of-glyph-blocked'].svg.replace(/<!--[\s\S]*?-->/, ''));
  assert.equal(Object.keys(assets).length, 7);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('offices');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/offices/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, OFFICE_ART_VERSION);
  assert.equal(manifest.assets.length, 7);
});

test('the motion: once, bounded; reduced is fades only', () => {
  for (const kind of Object.keys(FRAMES)) {
    assert.ok(MOTION[kind].end <= 900, kind);
    assert.equal(FRAMES[kind](motionEnd(kind), {}).done, true, kind);
    for (let t = 0; t <= motionEnd(kind, true); t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.equal(f.reduced, true);
      if (f.badge) { assert.equal(f.badge.scale, 1); assert.equal(f.badge.rotate, 0); }
      if (f.tape) { assert.equal(f.tape.reveal, 1); assert.equal(f.tape.drop, 0); }
    }
  }
  assert.equal(FRAMES.block(MOTION.block.end).tape.reveal, 1);
  assert.equal(FRAMES.expire(MOTION.expire.end).tape.reveal, 0);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/offices/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});

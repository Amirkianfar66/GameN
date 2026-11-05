// mothership:dev-only
//
// Library group 3 (design/library/hospital-panel/; docs/design/library/hospital-panel.md): a living
// Hospital patient's own code console. These test the proposal's own modules: the state map from a
// player view (and R12's proposed fields, where present), what the console may and may not say, the
// art's palette, the generated assets and the motion. None of them is a rule or a server answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { H, KEY_DIGIT, KEY_FACE, PANEL_ART_VERSION, panelAssets } from '../../../design/library/hospital-panel/art.mjs';
import { PANEL_COPY } from '../../../design/library/hospital-panel/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/hospital-panel/motion.mjs';
import { STATES, deadline, keypad, panelState } from '../../../design/library/hospital-panel/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const PATIENT = 8;
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
function view({ seat = PATIENT, role = 'Undercover', round = 4, phase = 'ORDINARY_TURN', playerCount = 9, offers = [], health = 'Injured', location = 'Hospital', medical = { admittedRound: 3, rescueDueAfterRound: 5, rescueOpportunity: 'NEXT_NORMAL_ROUND' }, panelAttemptSpent = false, panelRequest, injectionsRemaining = null, targets = [] }) {
  const seats = Array.from({ length: playerCount }, (_, i) => i + 1).map(n => ({ seatId: n, health: n === seat ? health : 'Healthy', location: n === seat ? location : 'Room A', slotId: null, jailed: false, captain: false, officer: false, revealedFaction: null, rescueDueAfterRound: null, medical: n === seat ? medical : null }));
  const abilities = { panelAttemptSpent, injectionsRemaining };
  if (panelRequest !== undefined) abilities.panelRequest = panelRequest;
  return { round, playerCount, phase: { id: `p${round}`, kind: phase }, self: { seatId: seat, role }, board: { kind: 'PLAYER_CURRENT', seats }, abilities, offers: offers.map(type => ({ type, targetSeatIds: targets, slotIds: [], windowIds: [], promiseTargetSeatIds: [] })) };
}
const open = { offers: ['PANEL_CODE'] };

test('the console: only a living Hospital patient\'s; the offer decides the keypad; a picked number is confirmed before it is sent', () => {
  assert.equal(panelState(view({ location: 'Room A', health: 'Healthy', medical: null })).state, 'none');
  assert.equal(panelState(view({ health: 'Eliminated', location: null })).state, 'none');
  assert.deepEqual(panelState(view(open)), { deadline: { tone: 'next', round: 5 }, state: 'available', keys: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
  assert.deepEqual(panelState(view({ ...open, playerCount: 7, seat: 5 })).keys, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(keypad(view({ ...open, targets: [3, 1, 2] })), [1, 2, 3]);
  assert.deepEqual(panelState(view(open), { picked: 6 }), { deadline: { tone: 'next', round: 5 }, state: 'choosing', keys: [1, 2, 3, 4, 5, 6, 7, 8, 9], number: 6 });
  assert.equal(panelState(view(open), { picked: 12 }).state, 'available', 'a number the keypad does not offer is not picked');
  assert.equal(panelState(view(open), { pending: 'PANEL_CODE', picked: 6 }).state, 'sending');
  assert.equal(panelState(view({ phase: 'JAIL_VOTE' })).state, 'closed');
  // No keypad without the offer, whatever else holds.
  for (const phase of ['ORDINARY_TURN', 'JAIL_VOTE', 'BLACKOUT']) assert.notEqual(panelState(view({ phase })).state, 'available');
});

test('without R12 the console never says whether the number was right; with it, each result and fate', () => {
  assert.equal(panelState(view({ panelAttemptSpent: true }), { accepted: { PANEL_CODE: 'p4' } }).state, 'registered');
  assert.equal(panelState(view({ panelAttemptSpent: true })).state, 'used');
  assert.equal(panelState(view({ panelAttemptSpent: true }), { accepted: { PANEL_CODE: 'p3' } }).state, 'used', 'an acceptance from another phase');
  const R = (result, status) => panelState(view({ panelAttemptSpent: true, panelRequest: { round: 4, result, status } })).state;
  assert.equal(R('RESERVED', 'QUEUED'), 'reserved');
  assert.equal(R('WRONG', null), 'wrong');
  assert.equal(R('RESERVED', 'TREATED'), 'treated');
  assert.equal(R('RESERVED', 'NO_EFFECT'), 'no-effect');
  assert.equal(R('RESERVED', 'DISCARDED'), 'discarded');
  // A field that is not R12's shape is not read as a result.
  assert.equal(panelState(view({ panelAttemptSpent: true, panelRequest: { round: 4, result: 'MAYBE' } })).state, 'used');
});

test('P21: "no injection left" only from an explicit reason, never inferred; nothing else refuses as exhausted', () => {
  const at = code => panelState(view(open), { rejected: { PANEL_CODE: { phaseId: 'p4', code } } }).state;
  assert.equal(at('NO_INJECTION'), 'exhausted');
  assert.equal(at('NOT_ALLOWED'), 'refused');
  assert.equal(at('PHASE_CLOSED'), 'refused');
  assert.equal(panelState(view(open), { rejected: { PANEL_CODE: { phaseId: 'p3', code: 'NO_INJECTION' } } }).state, 'available', 'a refusal from another phase');
  assert.match(PANEL_COPY.exhausted, /not checked/);
  assert.match(PANEL_COPY.exhausted, /not used/);
  // "Empty inventory must not confirm Doctor identity": the refusal is the same whatever number was sent.
  const refusals = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9].map(picked => JSON.stringify(panelState(view(open), { picked, rejected: { PANEL_CODE: { phaseId: 'p4', code: 'NO_INJECTION' } } }))));
  assert.equal(refusals.size, 1);
});

test('the console never reads the injection count or the role: the Doctor as a patient sees what anyone sees', () => {
  const allowed = new Set(['state', 'deadline', 'keys', 'number', 'round']);
  for (const opts of [{}, { picked: 6 }, { pending: 'PANEL_CODE' }, { accepted: { PANEL_CODE: 'p4' } }]) {
    for (const base of [open, { panelAttemptSpent: true }, { phase: 'JAIL_VOTE' }]) {
      const anyone = panelState(view({ ...base }), opts);
      for (const key of Object.keys(anyone)) assert.ok(allowed.has(key), key);
      assert.deepEqual(panelState(view({ ...base, role: 'Doctor', injectionsRemaining: 2 }), opts), anyone);
      assert.deepEqual(panelState(view({ ...base, role: 'Doctor', injectionsRemaining: 0 }), opts), anyone);
    }
  }
});

test('the deadline line reads the seat\'s own medical facts, as the berth\'s rescue tag does', () => {
  assert.deepEqual(deadline(view({})), { tone: 'next', round: 5 });
  assert.deepEqual(deadline(view({ medical: { admittedRound: 3, rescueDueAfterRound: 4, rescueOpportunity: 'CURRENT_NORMAL_ROUND' } })), { tone: 'current', round: 4 });
  assert.deepEqual(deadline(view({ medical: { admittedRound: 3, rescueDueAfterRound: 4, rescueOpportunity: 'CLOSED' } })), { tone: 'closed', round: 4 });
  assert.equal(deadline(view({ medical: null })), null);
  for (const s of STATES) assert.equal(typeof s, 'string');
});

test('the words: registering is never a heal; no count; only the explicit refusal names the empty pool; nothing names who the Doctor is', () => {
  for (const [key, value] of Object.entries(PANEL_COPY)) {
    const texts = typeof value === 'function' ? [value(6), value({ tone: 'next', round: 5 }), value({ tone: 'current', round: 4 }), value({ tone: 'closed', round: 4 })].filter(x => typeof x === 'string') : [value];
    for (const text of texts) {
      assert.doesNotMatch(text, /\b(\d+|one|two) (shared )?injections? (left|remaining)\b|\binjections? remaining\b|\b\d+ injections?\b|\btwo injections\b/i, `${key}: ${text}`);
      if (key !== 'exhausted') assert.doesNotMatch(text, /\binjections? (left|available)\b|\bhas no injection\b|\bno injection (left|available|remains)\b/i, `${key}: ${text}`);
      assert.doesNotMatch(text, /\bDoctor is\b|\bthe Doctor:\s*\d/i, `${key}: ${text}`);
    }
  }
  assert.doesNotMatch(PANEL_COPY.registered, /heal|treat|correct/i);
  assert.match(PANEL_COPY.reservedNote, /nothing is healed/i);
});

test('the art: the medical palette only, off every faction accent, no words or links; every key the same', () => {
  const assets = panelAssets();
  const palette = new Set(Object.values(H).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex} is not the medical palette's`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  // One plain key cap for every number: no key is drawn apart from the others.
  assert.equal(Object.keys(assets).filter(name => name.startsWith('hp-key-')).sort().join(','), 'hp-key-picked,hp-key-plain');
  assert.equal(Object.keys(assets).length, 13);
});

test('the keypad\'s digits are legible on both caps, and the review page draws them in those colours', async () => {
  for (const kind of ['plain', 'picked']) {
    assert.ok(contrast(KEY_DIGIT[kind], KEY_FACE[kind]) >= 4.5, `${kind}: ${contrast(KEY_DIGIT[kind], KEY_FACE[kind]).toFixed(2)}`);
    assert.ok(panelAssets()[`hp-key-${kind}`].svg.includes(`fill="${KEY_FACE[kind]}"`), kind);
  }
  const css = await readFile(new URL('../../../design/library/hospital-panel/page.css', import.meta.url), 'utf8');
  const rule = selector => css.split('\n').find(line => line.startsWith(`${selector} {`)) ?? '';
  assert.match(rule('.hp-keys .ab-button.hp-key'), new RegExp(`color: ${KEY_DIGIT.plain};.*background: ${KEY_FACE.plain};`, 'i'));
  assert.match(rule('.hp-keys .ab-button.hp-key[aria-pressed="true"]'), new RegExp(`color: ${KEY_DIGIT.picked}; background: ${KEY_FACE.picked};`, 'i'));
  // No rule singles out one key by its position (the dossier's first-button yellow is outranked, never imitated).
  assert.doesNotMatch(css, /\.hp-key:(first|last|nth)-/);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('hospital-panel');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/hospital-panel/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, PANEL_ART_VERSION);
  assert.equal(manifest.assets.length, 13);
});

test('the motion: once, bounded, no shake; reduced is fades only', () => {
  for (const kind of Object.keys(FRAMES)) {
    assert.ok(MOTION[kind].end <= 900, kind);
    assert.equal(FRAMES[kind](motionEnd(kind), {}).done, true, kind);
    for (let t = 0; t <= motionEnd(kind, true); t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.equal(f.reduced, true);
      if (f.stamp) assert.equal(f.stamp.scale, 1);
      if (f.vial) assert.equal(f.vial.rise, 1, 'reduced never moves the vial');
      if (f.strike) assert.equal(f.strike.draw, 1, 'reduced never draws the strike');
    }
  }
  assert.equal(FRAMES.wrong(MOTION.wrong.end).strike.draw, 1);
  assert.equal(FRAMES.reserve(MOTION.reserve.end).vial.rise, 1);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/hospital-panel/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});

// mothership:dev-only
//
// Library group 8 (design/library/successor/; docs/design/library/successor.md): the successor
// sweep. These test the proposal's own modules: the current names and the pictures that draw them,
// the lobby's states from the session snapshot, the Supply's private receipt, the admission walk's
// plan, the words, the art (the Engineer's device in the reviewed devices' family), the generated
// assets and the motion. None of them is a rule or a server answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { DEVICE, NEUTRAL, SUCCESSOR_ART_VERSION, successorAssets } from '../../../design/library/successor/art.mjs';
import { SUCCESSOR_COPY } from '../../../design/library/successor/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/successor/motion.mjs';
import { CURRENT_ROLES, OBSOLETE_NAMES, OVERLAY, ROLE_DEVICES, SUPERSEDED, usesCurrentNames } from '../../../design/library/successor/names.mjs';
import { LOBBY_STATES, WALK, admissionPlan, lobbyState, supplyReceipt } from '../../../design/library/successor/states.mjs';
import { ROLE_SIDE } from '../../../design/library/end/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const root = new URL('../../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const hexes = svg => new Set((svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map(h => h.toUpperCase()));

/** Every string a copy table can say, its functions called with sample arguments. */
function texts(table) {
  return Object.values(table).flatMap(v => (typeof v === 'function' ? [v('Player 5, Eli'), v(1, 7), v(3, 7)].map(String) : typeof v === 'object' ? texts(v) : [v]));
}

test('the nine current roles, each with a held device; the removed Officer\'s device and the Showdown icon are never drawn', async () => {
  assert.deepEqual([...CURRENT_ROLES].sort(), Object.keys(ROLE_SIDE).sort(), 'the same nine roles as the end reveal\'s sides');
  assert.deepEqual(Object.keys(ROLE_DEVICES).sort(), [...CURRENT_ROLES].sort());
  assert.equal(ROLE_DEVICES.Doctor.asset, 'device-cracker', 'the Doctor keeps the reviewed injector art; only its name was obsolete');
  assert.equal(ROLE_DEVICES.Engineer.property, '--sw-asset-sw-device-engineer');
  for (const id of Object.keys(SUPERSEDED)) assert.ok(Object.values(ROLE_DEVICES).every(d => d.asset !== id) && OVERLAY.every(o => !o.mark.includes(id)), id);
  // The reviewed devices are the design-0.2.0 exports, whose bundle defines each property.
  const files = await readdir(new URL('design/exports/roles/', root));
  const bundle = await read(`design/exports/roles/${files.find(f => /^roles\.art\.[0-9a-f]+\.css$/.test(f))}`);
  for (const [role, d] of Object.entries(ROLE_DEVICES)) {
    if (d.source !== 'reviewed') continue;
    assert.ok(bundle.includes(`${d.property}:`), `${role}: ${d.property}`);
    assert.ok(files.some(f => f.startsWith(`${d.asset}.held.`)), `${role}: ${d.asset}`);
  }
});

test('the action overlay: every successor command has a current label and a mark its own art sheet defines', async () => {
  const sheets = {
    0: 'design/abilities/assets/abilities.art.css', 1: 'design/library/hack-engineer/assets/library.art.css', 2: 'design/library/navigation/assets/navigation.art.css',
    3: 'design/library/hospital-panel/assets/hospital-panel.art.css', 4: 'design/library/promises/assets/promises.art.css', 5: 'design/library/windows/assets/windows.art.css', 6: 'design/library/offices/assets/offices.art.css',
  };
  const commands = OVERLAY.map(o => o.command);
  assert.equal(new Set(commands).size, commands.length);
  for (const o of OVERLAY) {
    assert.ok(usesCurrentNames(o.label), o.label);
    assert.ok((await read(sheets[o.group])).includes(`${o.mark}:`), `${o.command}: ${o.mark} in ${sheets[o.group]}`);
  }
  // The candidate contract's commands, as planet-game.ts at 79418e7 names them.
  for (const c of ['ACTIVATE_SHIP_HACK', 'ENGINEER_SUPPRESS', 'SUBMIT_CODE', 'CHOOSE_NAV_DIRECTION', 'CONFIRM_NAVIGATION', 'PANEL_CODE', 'OFFER_PROMISE', 'ACCEPT_PROMISE', 'SHOW_WINDOW', 'APPOINT_OFFICER', 'BLOCK_MOVE', 'RESCUE', 'SUPPLY']) assert.ok(commands.includes(c), c);
});

test('current names: no obsolete name in this group\'s words or in any library group\'s words', async () => {
  for (const old of Object.keys(OBSOLETE_NAMES)) assert.equal(usesCurrentNames(`The ${old} acts.`), false, old);
  for (const text of [...texts(SUCCESSOR_COPY), ...CURRENT_ROLES]) assert.ok(usesCurrentNames(text), text);
  for (const group of ['hack-engineer', 'navigation', 'hospital-panel', 'promises', 'windows', 'offices', 'end', 'successor']) {
    const source = (await read(`design/library/${group}/copy.mjs`)).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.ok(usesCurrentNames(source), `design/library/${group}/copy.mjs`);
  }
});

const member = (seatId, controller = 'human') => ({ seatId, displayName: `P${seatId}`, characterId: null, controller, ready: false });
const snap = over => ({ matchId: 'm', roomCode: 'K7Q2ZD', status: 'lobby', playerCount: 7, isHost: false, selfSeatId: 2, members: [member(1), member(2)], pendingAdmissions: [], setup: null, privateRole: null, publicView: null, playerView: null, ...over });

test('the lobby from the session snapshot and the request\'s answer: every state, Begin only when every seat is filled', () => {
  assert.equal(lobbyState(null).state, 'start');
  assert.equal(lobbyState(null, { requested: true }).state, 'requesting');
  assert.deepEqual(lobbyState(null, { requested: true, acknowledged: true, code: 'K7Q2ZD' }), { state: 'waiting', code: 'K7Q2ZD' });
  assert.equal(lobbyState(snap({ selfSeatId: null })).state, 'waiting', 'a pending player, if the server gives it a snapshot (R14)');
  const host = lobbyState(snap({ isHost: true, selfSeatId: 1, pendingAdmissions: [{ id: 'a', kind: 'display', displayName: 'TV' }] }));
  assert.equal(host.state, 'host'); assert.deepEqual(host.seats, { filled: 2, total: 7, bots: 0 }); assert.equal(host.canBegin, false); assert.equal(host.pending.length, 1);
  const full = lobbyState(snap({ isHost: true, selfSeatId: 1, members: [1, 2, 3, 4, 5, 6, 7].map(n => member(n, n > 4 ? 'bot' : 'human')) }));
  assert.equal(full.canBegin, true); assert.equal(full.seats.bots, 3);
  assert.equal(lobbyState(snap({})).state, 'joined');
  assert.equal(lobbyState(snap({ selfSeatId: null }), { kind: 'display' }).state, 'display');
  assert.equal(lobbyState(snap({ status: 'choosing' })).state, 'setup');
  assert.equal(lobbyState(snap({ status: 'reading' })).state, 'setup');
  for (const status of ['running', 'finished', 'aborted']) assert.equal(lobbyState(snap({ status })).state, 'none', status);
  assert.deepEqual(lobbyState(null, { error: 'NOT_FOUND' }), { state: 'refused', code: 'NOT_FOUND' });
  const reached = new Set(['start', 'requesting', 'waiting', 'host', 'joined', 'display', 'setup', 'none', 'refused']);
  assert.deepEqual([...reached].sort(), [...LOBBY_STATES].sort());
});

test('the lobby\'s words: every failure code worded, a fallback, no room picker, the host never told who is on which side', () => {
  for (const code of ['NOT_FOUND', 'INVALID_REQUEST', 'FORBIDDEN', 'NOT_ALLOWED', 'RATE_LIMITED', 'UNAVAILABLE']) assert.ok(SUCCESSOR_COPY.refused[code], code);
  assert.ok(SUCCESSOR_COPY.refused.other);
  assert.match(SUCCESSOR_COPY.setup, /drawn at random/);
  for (const text of texts(SUCCESSOR_COPY)) {
    assert.doesNotMatch(text, /\b(choose|pick|select) (a |your |the )?(starting )?room\b/i, text);
    assert.doesNotMatch(text, /\b(Blue|Red|Alien) (team|side)\b/i, text);
  }
  assert.equal(SUCCESSOR_COPY.beginHint(7, 7), 'Every seat is filled. Begin when the table is ready.');
  assert.equal(SUCCESSOR_COPY.beginHint(6, 7), 'Fill 1 more seat with players or bots to begin.');
});

test('the Supply: a receipt only on the recipient\'s own phone, only when its weapons grow, never on a reconnect', () => {
  const v = (n, round = 3) => ({ round, self: { ordinaryWeapons: n } });
  assert.deepEqual(supplyReceipt(v(0), v(1)), { gained: 1, total: 1, round: 3 });
  assert.equal(supplyReceipt(null, v(1)), null, 'a reconnect draws the inventory at rest');
  assert.equal(supplyReceipt(v(1), v(1)), null);
  assert.equal(supplyReceipt(v(1, 4), v(0, 4)), null, 'a weapon used is not a delivery');
  assert.match(SUCCESSOR_COPY.supplyReceived, /one ordinary weapon/);
  assert.match(SUCCESSOR_COPY.supplierWaiting, /Round 3's Supply stage/);
  assert.doesNotMatch(SUCCESSOR_COPY.supplierWaiting, /\b(received|delivered|have|got)\b/i, 'a receipt never says the delivery resolved');
  assert.match(SUCCESSOR_COPY.supplyReceived, /from Round 4/);
  for (const text of [SUCCESSOR_COPY.supplyReceived, SUCCESSOR_COPY.supplyPrivate]) assert.doesNotMatch(text, /Supplier|from Player|by Player/i, 'never who sent it');
});

test('the admission: a walk only from a known room slot, a snap without one (R4), nothing otherwise', () => {
  const hospital = { location: 'Hospital', slotId: 'H2' };
  assert.deepEqual(admissionPlan({ location: 'Room B', slotId: 'B4' }, hospital), { plan: 'walk', from: { location: 'Room B', slotId: 'B4' }, to: 'H2', end: WALK.end });
  assert.deepEqual(admissionPlan(null, hospital), { plan: 'snap', to: 'H2' });
  assert.deepEqual(admissionPlan({ location: 'Room A' }, hospital), { plan: 'snap', to: 'H2' }, 'no slot, no path');
  assert.equal(admissionPlan({ location: 'Hospital', slotId: 'H1' }, hospital).plan, 'none');
  assert.equal(admissionPlan({ location: 'Room A', slotId: 'A1' }, { location: 'Room B', slotId: 'B1' }).plan, 'none');
  assert.doesNotMatch(SUCCESSOR_COPY.admissionWalk('Player 5, Eli') + SUCCESSOR_COPY.admissionSnap('Player 5, Eli'), /\b(shot|shooter|attack|by)\b/i);
});

test('the art: the Engineer\'s device in the reviewed devices\' family; the crate and the plate off every faction accent; no words or links', async () => {
  const assets = successorAssets();
  assert.equal(Object.keys(assets).length, 3);
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  // The reviewed Blue devices' colours (Insider, Doctor, Blue Disabler, Supplier) hold every colour of the Engineer's.
  const files = await readdir(new URL('design/exports/roles/', root));
  const blue = new Set();
  for (const id of ['device-insider', 'device-cracker', 'device-blue-disabler', 'device-supplier']) for (const h of hexes(await read(`design/exports/roles/${files.find(f => f.startsWith(`${id}.held.`))}`))) blue.add(h);
  const engineer = assets['sw-device-engineer'].svg;
  for (const h of hexes(engineer)) assert.ok(blue.has(h), `${h} is not a reviewed Blue device colour`);
  for (const h of Object.values(DEVICE)) assert.ok(blue.has(h.toUpperCase()), h);
  assert.ok(hexes(engineer).has(FACTION_ACCENTS.blue.toUpperCase()), 'the Blue roles\' private glow');
  for (const side of ['red', 'alien']) assert.ok(!hexes(engineer).has(FACTION_ACCENTS[side].toUpperCase()), side);
  // The same sleeve and arm as every reviewed device.
  const cracker = await read(`design/exports/roles/${files.find(f => f.startsWith('device-cracker.held.'))}`);
  assert.ok(cracker.includes('64,103 92,97 126,150 80,150') && engineer.includes('64,103 92,97 126,150 80,150'));
  assert.match(engineer, /viewBox="0 0 120 140"/);
  for (const name of ['sw-crate', 'sw-code-plate']) for (const h of hexes(assets[name].svg)) for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(h, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${h} near ${faction}`);
  for (const h of Object.values(NEUTRAL)) for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(h, accent) >= MIN_ACCENT_DISTANCE, `neutral ${h} near ${faction}`);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('successor');
  for (const [name, text] of Object.entries(files)) assert.equal(await read(`design/library/successor/assets/${name}`), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, SUCCESSOR_ART_VERSION);
  assert.equal(manifest.assets.length, 3);
});

test('the motion: once, bounded; the walk keeps its beats and never shows a hit; reduced is fades only', () => {
  for (const kind of ['supply', 'admission', 'seat']) {
    assert.equal(FRAMES[kind](motionEnd(kind)).done, true, kind);
    assert.equal(FRAMES[kind](motionEnd(kind) - 1).done, false, kind);
    assert.equal(motionEnd(kind, true), MOTION.reduced.end);
    for (let t = 0; t <= MOTION.reduced.end; t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.equal(f.reduced, true);
      if (f.crate) assert.equal(f.crate.drop, 1);
      if ('bob' in f) { assert.equal(f.bob, 0); assert.equal(f.lie, 1); }
      if ('slide' in f) assert.equal(f.slide, 1);
    }
  }
  assert.ok(MOTION.supply.end <= 600 && MOTION.seat.end <= 300, 'phone receipts stay short');
  const stages = [];
  for (let t = 0; t <= WALK.end; t += 20) {
    const f = FRAMES.admission(t);
    if (stages.at(-1) !== f.stage) stages.push(f.stage);
    assert.ok(f.bob >= 0 && f.bob <= 3, 'an injured gait, a small bob');
    assert.ok(f.opacity >= 0 && f.opacity <= 1);
  }
  assert.deepEqual(stages, ['leave', 'cross', 'enter', 'settle']);
  assert.equal(FRAMES.admission(WALK.end).lie, 1);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await read('design/library/successor/review/report.json'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(entry.file, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});

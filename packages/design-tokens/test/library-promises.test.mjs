// mothership:dev-only
//
// Library group 4 (design/library/promises/; docs/design/library/promises.md): the giver's
// composer, the recipient's inbox and the ledger of a seat's Promises. These test the proposal's
// own modules: the state maps from a player view, what the words may and may not say, the art's
// palette and silhouettes, the generated assets and the motion. None of them is a rule or a server
// answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { KIND_FILES, P, PROMISE_ART_VERSION, SEAL_FILES, promiseAssets } from '../../../design/library/promises/art.mjs';
import { BLURBS, PROMISE_COPY, TITLES, decided, label, result, term } from '../../../design/library/promises/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/promises/motion.mjs';
import { KINDS, STATUSES, changes, composerState, inboxState, ledger, opportunity, promiseRecord, quota } from '../../../design/library/promises/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const HANA = 8, CLEO = 3, ELI = 5, ADA = 1;
function view({ seat = HANA, round = 4, phase = 'HACK', offers = [], recipients = [CLEO], targets = [1, 2, 4, 5, 6, 7, 9], promises = [], promiseQuota = { given: false, received: false } }) {
  return {
    round, playerCount: 9, phase: { id: `r${round}-${phase}`, kind: phase }, self: { seatId: seat },
    offers: offers.map(type => ({ type, targetSeatIds: type === 'OFFER_PROMISE' ? recipients : [], slotIds: [], windowIds: [], promiseTargetSeatIds: type === 'OFFER_PROMISE' ? targets : [] })),
    promises, promiseQuota,
  };
}
let n = 0;
const promise = f => ({ id: `p${++n}`, giverSeatId: HANA, recipientSeatId: CLEO, targetSeatId: null, round: 4, electionId: null, accepted: f.offerStatus === 'accepted', status: 'Pending', offerStatus: 'offered', ...f });
const talk = { offers: ['OFFER_PROMISE'] };
const answer = { offers: ['ACCEPT_PROMISE', 'DECLINE_PROMISE'] };

test('records are the pair\'s: one given and one received at most; offers that were not accepted are never records or slots', () => {
  const others = promise({ giverSeatId: ADA, recipientSeatId: ELI, offerStatus: 'accepted' });
  assert.equal(promiseRecord(view({}), others), null, 'a pair this seat is not in');
  const v = view({ promises: [promise({ kind: 'MEET_A', offerStatus: 'declined' }), promise({ giverSeatId: ELI, recipientSeatId: HANA, kind: 'JAIL_VOTE', targetSeatId: CLEO, offerStatus: 'expired' }), promise({ kind: 'MEET_B', offerStatus: 'offered' })] });
  assert.deepEqual(ledger(v), { given: null, received: null });
  assert.deepEqual(quota(v), { given: 'open', received: 'open' });
  const made = view({ promises: [promise({ kind: 'JAIL_VOTE', targetSeatId: ELI, offerStatus: 'accepted', status: 'Fulfilled' }), promise({ giverSeatId: CLEO, recipientSeatId: HANA, kind: 'CAPTAIN_SUPPORT', electionId: 'e5', offerStatus: 'accepted' })] });
  const l = ledger(made);
  assert.equal(l.given.kind, 'JAIL_VOTE'); assert.equal(l.given.partner, CLEO); assert.equal(l.given.status, 'Fulfilled');
  assert.equal(l.received.kind, 'CAPTAIN_SUPPORT'); assert.equal(l.received.partner, CLEO); assert.equal(l.received.status, 'Pending');
  assert.deepEqual(quota(made), { given: 'used', received: 'used' });
  // promiseQuota's sense is not stated (R13): it is never read.
  for (const promiseQuota of [{ given: true, received: true }, { given: false, received: false }]) {
    assert.deepEqual(quota({ ...made, promiseQuota }), quota(made));
    assert.deepEqual(composerState({ ...view(talk), promiseQuota }), composerState(view(talk)));
  }
});

test('the composer: the offer decides; a Jail Vote needs a target from the offer; the exact draft is reviewed before it is sent', () => {
  assert.equal(composerState(view({ phase: 'ORDINARY_TURN' })).state, 'closed');
  const choose = composerState(view(talk));
  assert.equal(choose.state, 'choose'); assert.equal(choose.recipient, CLEO, 'the only recipient is the default');
  assert.equal(composerState(view({ ...talk, recipients: [CLEO, ELI] })).recipient, null, 'two recipients: pick one');
  assert.equal(composerState(view({ ...talk, recipients: [CLEO, ELI] }), { draft: { kind: 'MEET_A' } }).state, 'choose');
  assert.equal(composerState(view(talk), { draft: { kind: 'JAIL_VOTE' } }).state, 'target');
  assert.equal(composerState(view(talk), { draft: { kind: 'JAIL_VOTE', target: 3 } }).state, 'target', 'a target the offer does not list');
  assert.deepEqual(composerState(view(talk), { draft: { kind: 'JAIL_VOTE', target: ELI } }), { recipients: [CLEO], targets: [1, 2, 4, 5, 6, 7, 9], note: null, state: 'review', recipient: CLEO, kind: 'JAIL_VOTE', target: ELI });
  for (const kind of KINDS.filter(k => k !== 'JAIL_VOTE')) assert.equal(composerState(view(talk), { draft: { kind, target: ELI } }).target, null, `${kind} carries no target`);
  assert.equal(composerState(view(talk), { draft: { kind: 'NOT_A_KIND' } }).state, 'choose');
  assert.equal(composerState(view(talk), { pending: 'OFFER_PROMISE' }).state, 'sending');
  assert.equal(composerState(view({ promises: [promise({ kind: 'MEET_A' })] })).state, 'waiting');
  assert.equal(composerState(view(talk), { rejected: { OFFER_PROMISE: { phaseId: 'r4-HACK', code: 'NOT_ALLOWED' } } }).state, 'refused');
  assert.equal(composerState(view(talk), { rejected: { OFFER_PROMISE: { phaseId: 'r3-HACK', code: 'NOT_ALLOWED' } } }).state, 'choose', 'a refusal from another phase');
  // The one given Promise is made: nothing more to give, whatever the offers say.
  assert.equal(composerState(view({ ...talk, promises: [promise({ kind: 'MEET_B', offerStatus: 'accepted' })] })).state, 'given');
  // A declined or unanswered offer of this round is a note; nothing is used.
  assert.deepEqual(composerState(view({ ...talk, promises: [promise({ kind: 'MEET_A', offerStatus: 'declined' })] })).note.offer, 'declined');
  assert.equal(composerState(view({ ...talk, round: 5, promises: [promise({ kind: 'MEET_A', offerStatus: 'declined' })] })).note, null, 'an earlier round');
});

test('the inbox: Accept only with both answers offered; the received slot used leaves Decline alone; nothing replays', () => {
  assert.equal(inboxState(view({ seat: CLEO })).state, 'none');
  const offered = [promise({ kind: 'MEET_A' })];
  assert.equal(inboxState(view({ seat: CLEO, ...answer, promises: offered })).state, 'incoming');
  assert.equal(inboxState(view({ seat: CLEO, offers: ['DECLINE_PROMISE'], promises: offered })).state, 'decline-only');
  assert.equal(inboxState(view({ seat: CLEO, promises: offered })).state, 'locked');
  assert.equal(inboxState(view({ seat: CLEO, ...answer, promises: offered }), { pending: 'ACCEPT_PROMISE' }).answer, 'accept');
  assert.equal(inboxState(view({ seat: HANA, ...answer, promises: offered })).state, 'none', 'the giver has nothing to answer');
  assert.equal(inboxState(view({ seat: CLEO, promises: [promise({ kind: 'MEET_A', offerStatus: 'declined' })] })).note.offer, 'declined');
});

test('changes: once, against the previous view only; a result only from Pending (R6), never on a reconnect', () => {
  const offered = promise({ kind: 'JAIL_VOTE', targetSeatId: ELI });
  const accepted = { ...offered, offerStatus: 'accepted', accepted: true };
  const decided = { ...accepted, status: 'Not fulfilled' };
  const at = (seat, p) => view({ seat, promises: p ? [p] : [] });
  assert.deepEqual(changes(null, at(CLEO, decided)), { arrived: [], accepted: [], declined: [], results: [] }, 'a reconnect draws everything at rest');
  assert.deepEqual(changes(at(CLEO, null), at(CLEO, offered)).arrived, [offered.id]);
  assert.deepEqual(changes(at(HANA, null), at(HANA, offered)).arrived, [], 'the giver\'s own offer does not arrive');
  assert.deepEqual(changes(at(HANA, offered), at(HANA, accepted)).accepted, [offered.id]);
  assert.deepEqual(changes(at(CLEO, offered), at(CLEO, { ...offered, offerStatus: 'expired' })).declined, [offered.id]);
  assert.deepEqual(changes(at(HANA, accepted), at(HANA, decided)).results, [offered.id]);
  assert.deepEqual(changes(at(HANA, decided), at(HANA, decided)).results, [], 'a repeated view');
  assert.deepEqual(changes(at(HANA, offered), at(HANA, decided)).results, [], 'accepted and decided at once: the accept plays, not a result');
  assert.equal(opportunity({ kind: 'MEET_B', round: 4 }).at, 'voting-start');
  assert.equal(opportunity({ kind: 'NO_JAIL_VOTE', round: 4 }).at, 'jail-vote');
  assert.equal(opportunity({ kind: 'OFFICER_SELECTION', electionId: 'e5' }).at, 'election');
});

test('the words: every kind and result from either side, in grammar; no lie, betrayal or outcome claimed; nothing goes public', () => {
  const names = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
  const texts = [];
  for (const reader of [HANA, CLEO, ELI, ADA]) for (const kind of KINDS) {
    const t = { giver: label(HANA, reader, s => names[s - 1]), recipient: label(CLEO, reader, s => names[s - 1]), target: label(ELI, reader, s => names[s - 1]), round: 4 };
    texts.push(term(kind, t), decided(kind, t), ...STATUSES.map(s => result(kind, s, t)));
  }
  texts.push(...Object.values(TITLES), ...Object.values(BLURBS), ...Object.values(PROMISE_COPY).map(v => (typeof v === 'function' ? v('Player 3, Cleo') : v)));
  for (const text of texts) {
    assert.doesNotMatch(text, /\b(you is|you was|you wins|you has)\b/i, text);
    assert.doesNotMatch(text, /\b(liar|lied|lying|betray\w*|broke|broken|cheat\w*|traitor)\b/i, text);
    assert.doesNotMatch(text, /\b(everyone|all players|the table|announce\w*|public)\b/i, text);
    if (/\blie\b/i.test(text)) assert.match(text, /not proof of a lie/, text);
  }
  // A ballot counts, never the vote's outcome or the admission (P16, P23).
  const t = { giver: 'you', recipient: 'Player 3, Cleo', target: 'Player 5, Eli', round: 4 };
  assert.match(result('JAIL_VOTE', 'Fulfilled', t), /does not count/);
  assert.match(result('CAPTAIN_SUPPORT', 'Fulfilled', t), /Who won does not count/);
  assert.match(result('CAPTAIN_SUPPORT', 'Condition not met', t), /not a candidate/);
  assert.match(result('MEET_A', 'Not fulfilled', t), /not proof of a lie/);
  assert.throws(() => term('NOT_A_KIND', t));
});

test('the art: one palette off every faction accent; six silhouettes; four seals that differ in shape; no words or links', () => {
  const assets = promiseAssets();
  const palette = new Set(Object.values(P).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex} is not the palette's`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  const body = name => assets[name].svg.replace(/<!--[\s\S]*?-->/, '');
  assert.equal(new Set(Object.values(KIND_FILES).map(body)).size, 6, 'six distinct kind pictures');
  assert.equal(new Set(Object.values(SEAL_FILES).map(body)).size, 4, 'four distinct seals');
  // "Not fulfilled" is grey and a bar: no amber, no green, no cross.
  const notFulfilled = body(SEAL_FILES['Not fulfilled']);
  assert.ok(!notFulfilled.includes(P.amber) && !notFulfilled.includes(P.stable));
  assert.match(notFulfilled, /M20 32 H44/);
  assert.equal(Object.keys(assets).length, 13);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('promises');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/promises/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, PROMISE_ART_VERSION);
  assert.equal(manifest.assets.length, 13);
});

test('the motion: once, bounded, no shake; reduced is fades only', () => {
  for (const kind of Object.keys(FRAMES)) {
    assert.ok(MOTION[kind].end <= 900, kind);
    assert.equal(FRAMES[kind](motionEnd(kind), {}).done, true, kind);
    for (let t = 0; t <= motionEnd(kind, true); t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.equal(f.reduced, true);
      if (f.card) { assert.equal(f.card.scale ?? 1, 1); assert.equal(f.card.lift ?? 0, 0); assert.equal(f.card.tilt ?? 0, 0); assert.equal(f.card.rise ?? 1, 1); }
      if (f.envelope) { assert.equal(f.envelope.scale ?? 1, 1); assert.equal(f.envelope.drop ?? 1, 1); }
      if (f.seal) { assert.equal(f.seal.scale, 1); assert.equal(f.seal.rotate, 0); }
      if (f.stamp) assert.equal(f.stamp.scale, 1);
      if (f.before) { assert.equal(f.before.turn, 1); assert.equal(f.after.turn, 1); }
    }
  }
  // The decline tips the card back a little and never past 3 degrees.
  for (let t = 0; t <= MOTION.decline.end; t += 20) assert.ok(Math.abs(FRAMES.decline(t).card.tilt) <= 3);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/promises/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});

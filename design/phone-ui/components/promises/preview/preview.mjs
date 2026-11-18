// mothership:dev-only
//
// Promises' preview: the runtime component itself (../promises.mjs, unchanged) on the phone pack's synthetic fixtures,
// in each state Frontend checks, at the two development phone sizes: the body in the phone shell's sheet
// (../../phone-shell, unchanged; its frame and footer from promisesSheet()) over Room A (../../room-scene, unchanged),
// with the Promises button open in the top bar, as sheets 33 and 33.1 draw it. The quota, the talk, the offers, the
// Promises with their exact terms, when and why, and Jail Vote's players stand in for what Frontend gives from the
// projection: the pack's own sample words (screens-more.mjs PROMISES and PROMISE_RESULTS).
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=list     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountPromises, promisesSheet } from '../promises.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, ROSTER, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// The release's pictures, the room scene's extension and the crew's portraits, on the CSS properties the game's
// bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable), as the shell's preview sets them.
for (const art of Object.values(ROOM_ART)) {
  for (const { property, file } of [art.back, ...art.layers, art.dark]) {
    document.documentElement.style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/${file}`, import.meta.url).href}")`);
  }
}
for (const ext of Object.values(ROOM_EXTENSION)) {
  for (const { property, file } of [ext.lit, ext.dark]) {
    document.documentElement.style.setProperty(property, `url("${new URL(`../../room-scene/assets/${file}`, import.meta.url).href}")`);
  }
}
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}
/** A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew. */
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

// ── Room A in a match, behind Promises ──
const fixture = ROOM_FIXTURES['room-a'];
const person = n => { const p = seatOf(n); return Object.freeze({ seat: p.seat, name: p.name, character: p.character }); };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
export const room = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
export const AVA = person(1), DEV = person(SELF);
/** The top bar: in a talk, the pack's pair bar (Ava + Dev, Private talk, R3, 0:41); otherwise Gus's turn. Promises open. */
const barOf = (input, round = 3) => (input.talk
  ? { kind: 'pair', pair: [AVA, DEV], sub: 'Private talk', round: 3, timer: { remainingMs: 41000 }, promises: { count: 0, open: true } }
  : { kind: 'turn', who: person(7), self: false, round, timer: { remainingMs: 42000 }, promises: { count: 0, open: true } });
/** The shell around the sheet: the bar, the plain tabs, and the sheet from promisesSheet(). */
export const shellOf = (input, extra = {}, round = 3) => ({
  viewer: SELF, versions, bar: barOf(input, round),
  tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } },
  sheet: promisesSheet(input),
  ...extra,
});

// ── What Frontend gives, standing in: the pack's sample words (screens-more.mjs promises and PROMISE_RESULTS) ──
const ON = Object.freeze({ enabled: true });
/** Jail Vote's players, as the offer's promiseTargetSeatIds would give them (a sample: everyone but Dev). */
export const TARGETS = Object.freeze(ROSTER.filter(p => p.seat !== SELF).map(p => person(p.seat)));
/** Frontend's exact terms and condition, standing in: the pack's sentences for its two samples. */
export const TERMS = Object.freeze({
  MEET_A: 'Dev will be in Room A when Round 3’s voting begins.',
  CAPTAIN_SUPPORT: 'Ava votes for Dev at the next Captain election: in every ballot of that election in which the recipient is a candidate.',
  JAIL_VOTE: 'Dev votes for Player 2 at the next Jail vote of Round 3; admission is not required.',
});
export const CONDITION = 'If Dev is a candidate in no ballot of that election, the result is Condition not met';
/** Ava's incoming offer (sheet 33, "Offer from Ava"). */
export const INCOMING = Object.freeze({ id: 'p-in', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'offered', terms: TERMS.CAPTAIN_SUPPORT, condition: CONDITION });
/** Dev's offer, waiting for Ava (sheet 33's offered list). */
export const OFFERED = Object.freeze({ id: 'p-out', kind: 'MEET_A', giver: DEV, recipient: AVA, state: 'offered', terms: TERMS.MEET_A });
/** The four result states (sheet 33.1, PROMISE_RESULTS), one match moment each. */
export const RESULTS = Object.freeze({
  pending: { round: 3, quota: { given: false, received: true }, received: { id: 'r1', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'accepted', status: 'Pending', when: 'next Captain election', why: 'Checked when that election is held.' } },
  fulfilled: { round: 4, quota: { given: true, received: false }, given: { id: 'g1', kind: 'MEET_A', giver: DEV, recipient: AVA, state: 'accepted', status: 'Fulfilled', when: 'Round 3 voting', why: 'Dev was in Room A when Round 3’s voting began.' } },
  'not-fulfilled': { round: 5, quota: { given: false, received: true }, received: { id: 'r2', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'accepted', status: 'Not fulfilled', when: 'Round 4 election', why: 'In the runoff, a ballot in which Dev was a candidate, Ava voted for Ben.' } },
  condition: { round: 5, quota: { given: false, received: true }, received: { id: 'r3', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'accepted', status: 'Condition not met', when: 'Round 4 election', why: 'Dev was a candidate in no ballot of that election.' } },
});
/** In the talk with Ava (sheet 33's list): the offer offered, Ava's offer waiting. */
export const inputOf = (extra = {}) => ({ view: 'list', viewer: SELF, versions, quota: { given: false, received: false }, talk: AVA, offer: ON, received: INCOMING,
  answer: { accept: ON, decline: ON }, targets: TARGETS, ...extra });
const resultOf = key => { const r = RESULTS[key]; return { view: 'list', viewer: SELF, versions, quota: r.quota, given: r.given ?? null, received: r.received ?? null }; };
const draft = (kind, extra = {}) => ({ kind, target: null, terms: TERMS[kind] ?? null, ...extra });

/** Each state Frontend checks: the component's input, the shell's extra input, the round, and the text size. */
export const PREVIEW_STATES = Object.freeze({
  list: { caption: 'Promises · in a talk · sheet 33', input: inputOf() },
  offered: { caption: 'Promises · Dev\'s offer waiting · sheet 33', input: inputOf({ given: OFFERED }) },
  kinds: { caption: 'Offer to Ava · the six kinds · sheet 33', input: inputOf({ view: 'kinds', draft: draft('MEET_A', { terms: null }) }) },
  target: { caption: 'Jail Vote · who? · undrawn state (answer 4)', input: inputOf({ view: 'target', draft: { kind: 'JAIL_VOTE', target: 2, terms: null } }) },
  confirm: { caption: 'Check the terms · sheet 33', input: inputOf({ view: 'confirm', draft: draft('MEET_A') }) },
  offering: { caption: 'Offer in flight', input: inputOf({ view: 'confirm', draft: draft('MEET_A'), offer: { enabled: true, busy: true } }) },
  incoming: { caption: 'Offer from Ava · sheet 33', input: inputOf({ view: 'incoming' }) },
  pending: { caption: 'Results · Pending · sheet 33.1', input: resultOf('pending'), round: 3 },
  fulfilled: { caption: 'Results · Fulfilled · sheet 33.1', input: resultOf('fulfilled'), round: 4 },
  'not-fulfilled': { caption: 'Results · Not fulfilled · sheet 33.1', input: resultOf('not-fulfilled'), round: 5 },
  condition: { caption: 'Results · Condition not met · sheet 33.1', input: resultOf('condition'), round: 5 },
  stale: { caption: 'Reconnecting · Offer waits, Back still works', input: inputOf({ view: 'confirm', draft: draft('MEET_A'), status: 'stale' }), shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Offer from Ava · Largest text (200 %)', input: inputOf({ view: 'incoming' }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onOffer', 'onIncoming', 'onKind', 'onTarget', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry', 'onPromises'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with Room A in its stage, its sheet from promisesSheet(),
 * and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s.shell, s.round), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountPromises(shell.sheetBody, input, { ...handlers, ...extra });
  return { host, shell, scene, input };
}
export const disposeState = m => { m.host.dispose(); m.scene?.dispose(); m.shell?.dispose(); };

function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => mountState(frame, key, size.insets) };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runPromisesAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runPromisesProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, inputOf, AVA, DEV, TARGETS, TERMS, CONDITION, INCOMING, OFFERED, RESULTS }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'list', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Promises · preview</h1><p>The runtime component on Dev’s phone (Player 4), in the shell’s sheet over Room A with Promises open in the top bar. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [key, s] of Object.entries(PREVIEW_STATES)) {
    if (s.text) continue;
    for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${s.caption}<small>${sizeKey.replace('x', ' × ')} · state=${key}</small>`;
      const p = phone(sizeKey, key);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
}

window.__promises = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

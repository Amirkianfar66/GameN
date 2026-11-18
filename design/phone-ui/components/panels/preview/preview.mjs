// mothership:dev-only
//
// Panels' preview: the runtime component itself (../panels.mjs, unchanged) on the phone pack's synthetic fixtures, in
// each state Frontend checks, at the two development phone sizes: the body in the phone shell's sheet
// (../../phone-shell, unchanged; its frame from panelsSheet()) over Room A (../../room-scene, unchanged), with the
// Panels tab open, as sheet 32 draws it. Who can open each destination, the players' public facts and the round's
// steps stand in for what Frontend gives from the projection and the ruleset: the pack's own sample words.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=list     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountPanels, panelsSheet } from '../panels.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

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

// ── Room A in a match, as sheet 32 draws it behind Panels: Gus's turn, Round 3, 0:42, the Panels tab open ──
const fixture = ROOM_FIXTURES['room-a'];
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
export const room = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
/** The shell around the sheet: the pack's turnBar() and the tabs with Panels open; the sheet from panelsSheet(). */
export const shellOf = (input, extra = {}) => ({
  viewer: SELF, versions,
  bar: { kind: 'turn', who: person(fixture.active), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 0 } },
  tabs: { variant: 'game', view: 'room', open: 'panels', hero: { mode: 'pass', enabled: false } },
  sheet: panelsSheet(input),
  ...extra,
});

// ── What Frontend gives, standing in: the pack's sample words ──
/** The windows of Room A (screens-game.mjs panels). */
export const ROOM_A_WINDOWS = Object.freeze([Object.freeze(['Room A', 'Room B']), Object.freeze(['Room A', 'Hospital'])]);
/** Frontend's words for a destination this player can't open now, standing in. */
export const REFUSED = Object.freeze({ navigation: 'Only the Captain and the Officer use Navigation', hospital: 'Only patients in the Hospital use its panel' });
/** As a passenger (Dev, Player 4, in Room A), as the pack draws it: Navigation and the Hospital panel dimmed. */
export const DESTINATIONS = Object.freeze({
  windows: { enabled: true, rooms: ROOM_A_WINDOWS },
  navigation: { enabled: false, reason: REFUSED.navigation },
  hospital: { enabled: false, reason: REFUSED.hospital },
});
/**
 * Every seat's public facts, as Frontend gives them from the board and the offices (the pack's players screen draws
 * the Captain on seat 2 and the Officer on seat 3).
 */
/** Fay and Ike in Jail (the jail fixture's seats 6 and 9), while Dev, the viewer, stays in Room A behind the sheet. */
export const OTHERS_IN_JAIL = Object.freeze({ 6: ['Jail', 'J1'], 9: ['Jail', 'J4'] });
export const playersOf = (place = fixture.place) => board({ place }).map(p => ({
  seat: p.seat, name: p.name, character: p.character, location: p.location, health: p.health, jailed: p.jailed, captain: p.seat === 2, officer: p.seat === 3,
}));
/** The round's steps, as Frontend gives them from the ruleset: the pack's six, in its words (screens-more.mjs rules). */
export const STEPS = Object.freeze([
  { kind: 'pre-turn', title: 'Before turns', timing: '15 s · Officer block, Blackhole' },
  { kind: 'turns', title: 'Turns', timing: '60 s each · private talk after a turn' },
  { kind: 'sync', title: 'Ship synchronized', timing: '6 s · only after a Blackhole' },
  { kind: 'jail-vote', title: 'Jail vote', timing: '60 s, then 5 s result' },
  { kind: 'blackout', title: 'Blackout', timing: '5 s lit, 10 s dark' },
  { kind: 'navigation', title: 'Navigation', timing: '15 s, then the offices acknowledge' },
].map(Object.freeze));
export const inputOf = (extra = {}) => ({ view: 'list', viewer: SELF, versions, ...DESTINATIONS, players: playersOf(), steps: STEPS, ...extra });

/** Each state Frontend checks: the component's input, the shell's extra input, and the text size. */
export const PREVIEW_STATES = Object.freeze({
  list: { caption: 'Panels · as a passenger · sheet 32', input: inputOf() },
  captain: { caption: 'Panels · as the Captain: Navigation open', input: inputOf({ navigation: { enabled: true } }) },
  nowindow: { caption: 'Panels · in the Command Room: no window', input: inputOf({ windows: { enabled: true, rooms: [] } }) },
  players: { caption: 'Players · sheet 32', input: inputOf({ view: 'players' }) },
  jailed: { caption: 'Players · Fay and Ike in Jail', input: inputOf({ view: 'players', players: playersOf(OTHERS_IN_JAIL) }) },
  order: { caption: 'Round order · sheet 32', input: inputOf({ view: 'round-order' }) },
  stale: { caption: 'Reconnecting · the rows still open', input: inputOf({ status: 'stale' }), shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Players · Largest text (200 %)', input: inputOf({ view: 'players' }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onOpen', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry', 'onTab'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with Room A in its stage, its sheet from panelsSheet(),
 * and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s.shell), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountPanels(shell.sheetBody, input, { ...handlers, ...extra });
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runPanelsAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runPanelsProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, inputOf, playersOf, OTHERS_IN_JAIL, STEPS, REFUSED }))
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
  head.innerHTML = `<h1>Panels · preview</h1><p>The runtime component on Dev’s phone (Player 4), in the shell’s sheet over Room A with the Panels tab open. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__panels = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

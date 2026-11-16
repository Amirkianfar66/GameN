// mothership:dev-only
//
// Office decisions' preview: the runtime component itself (../office-decisions.mjs, unchanged) on the phone pack's
// synthetic fixtures, in each state Frontend checks, at the two development phone sizes: the body in the phone shell's
// sheet (../../phone-shell, unchanged; its frame and footer from officeDecisionsSheet()) over the room the pack draws
// behind it (../../room-scene, unchanged): the Command Room for the Captain and Navigation, Room B for the Officer, as
// sheets 40 and 41 draw them. The seats with their notes, the choices, the Captain, the blocked seat and the private
// navigation stand in for what Frontend gives from the projection: the pack's own samples (screens-more.mjs captain,
// officer and nav).
//   index.html                                        every state
//   index.html?single=1&size=390x844&state=appoint    one phone, for the check's captures
//   index.html?single=1&probe=1                       the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                       the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountOfficeDecisions, officeDecisionsSheet } from '../office-decisions.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROSTER, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

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

const person = n => { const p = seatOf(n); return Object.freeze({ seat: p.seat, name: p.name, character: p.character }); };
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
/** The room behind the sheet, as the pack's roomScene(room, { fixture }) draws it. */
const sceneOf = (key, { place, offices, active = null }) => {
  const people = board({ place }).filter(p => p.location === ROOM_NAMES[key]).map(p => ({
    seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
    office: offices.captain === p.seat ? 'captain' : offices.officer === p.seat ? 'officer' : null,
  }));
  return Object.freeze({ room: key, roster: 9, people, self: SELF, active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
};
// The pack's scenes (screens-more.mjs captain, officer and nav).
const COMMAND = sceneOf('command-room', { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'] }, offices: { captain: 4, officer: 3 } });
const COMMAND_APPOINT = sceneOf('command-room', { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'] }, offices: { captain: 4 } });
const ROOM_B = sceneOf('room-b', { place: { 4: ['Room B', 'B4'] }, offices: { captain: 2, officer: 4 } });
const phase = (icon, title, sub, round, seconds) => ({ kind: 'phase', icon, title, sub, round, timer: { remainingMs: seconds * 1000 } });

// ── What Frontend gives, standing in: the pack's samples (screens-more.mjs captain, officer and nav) ──
/** Every seat, with Frontend's note under each that can't be chosen. */
const seatsWith = notes => ROSTER.map(p => ({ ...person(p.seat), note: notes[p.seat] ?? null }));
export const APPOINT_SEATS = Object.freeze(seatsWith({ 2: 'In Hospital', 4: 'You are Captain', 5: 'Injured', 6: 'In Jail', 9: 'Out' }));
export const BLOCK_SEATS = Object.freeze(seatsWith({ 8: 'Blocked last round', 9: 'Out' }));
const ON = Object.freeze({ enabled: true });
export const appointOf = (extra = {}) => ({ view: 'appoint', viewer: SELF, versions, seats: APPOINT_SEATS, choices: [1, 3, 7, 8], chosen: 3, command: ON, offices: { captain: SELF, officer: null }, ...extra });
export const blockOf = (extra = {}) => ({ view: 'block', viewer: SELF, versions, seats: BLOCK_SEATS, choices: [1, 2, 3, 4, 5, 6, 7], chosen: 7, command: ON, offices: { captain: 2, officer: SELF }, ...extra });
export const navOf = (navigation, extra = {}) => ({ view: 'navigation', viewer: SELF, versions, offices: { captain: SELF, officer: 3 }, command: ON, navigation: { position: 'B1', direction: null, next: null, tie: false, confirmation: false, ...navigation }, ...extra });
const tieOf = (extra = {}) => navOf({ tie: true }, { offices: { captain: 2, officer: SELF }, ...extra });

/** Each state Frontend checks: the component's input, the bar, the room, the shell's extra input, and the text size. */
export const PREVIEW_STATES = Object.freeze({
  appoint: { caption: 'Choose your Officer · sheet 40', input: appointOf(), bar: phase('officer', 'Appoint Officer', 'Random if time runs out', 2, 22), scene: COMMAND_APPOINT },
  appointing: { caption: 'Officer appointment · everyone else · sheet 40', input: { view: 'appointing', viewer: SELF, versions, captain: person(2), offices: { captain: 2, officer: null } }, bar: phase('officer', 'New Officer', 'Ben chooses', 2, 22), scene: COMMAND_APPOINT },
  sending: { caption: 'Appoint in flight', input: appointOf({ command: { enabled: true, busy: true } }), bar: phase('officer', 'Appoint Officer', 'Random if time runs out', 2, 18), scene: COMMAND_APPOINT },
  block: { caption: 'Block movement · the Officer · sheet 40', input: blockOf(), bar: phase('officer', 'Block a move', 'Before turns · Officer', 3, 11), scene: ROOM_B },
  blocked: { caption: 'Blocked · sheet 40', input: blockOf({ view: 'blocked', blocked: person(7) }), bar: phase('officer', 'Block a move', 'Before turns · Officer', 3, 11), scene: ROOM_B },
  route: { caption: 'Navigation · Captain · route · sheet 41', input: navOf({}), bar: phase('course', 'Setting course', 'Captain · private', 3, 9), scene: COMMAND },
  tie: { caption: 'Navigation · Officer · genuine tie · sheet 41', input: tieOf(), bar: phase('course', 'Setting course', 'Officer · private', 3, 9), scene: COMMAND },
  confirm: { caption: 'Navigation · acknowledge, no veto · sheet 41', input: navOf({ direction: 'Blue', next: 'B2', confirmation: true }), bar: phase('course', 'Setting course', 'Captain · private', 3, 13), scene: COMMAND },
  stale: { caption: 'Reconnecting · the tie waits with the banner\'s words', input: tieOf({ status: 'stale' }), bar: phase('course', 'Setting course', 'Officer · private', 3, 9), scene: COMMAND, shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Choose your Officer · Largest text (200 %)', input: appointOf(), bar: phase('officer', 'Appoint Officer', 'Random if time runs out', 2, 22), scene: COMMAND_APPOINT, text: 200 },
});

/** The shell around the sheet: the pack's phase bar and the tabs with the hero off; the sheet from officeDecisionsSheet(). */
export const shellOf = (input, bar, extra = {}) => ({
  viewer: SELF, versions, bar,
  tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } },
  sheet: officeDecisionsSheet(input),
  ...extra,
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onChoose', 'onDirection', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry', 'onTab'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with the state's room in its stage, its sheet from
 * officeDecisionsSheet(), and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s.bar, s.shell), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...s.scene, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountOfficeDecisions(shell.sheetBody, input, { ...handlers, ...extra });
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runOfficeDecisionsAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runOfficeDecisionsProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, appointOf, blockOf, navOf, tieOf, person, APPOINT_SEATS, BLOCK_SEATS }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'appoint', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Office decisions · preview</h1><p>The runtime component on Dev’s phone (Player 4), in the shell’s sheet over the room the pack draws. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__offices = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

// mothership:dev-only
//
// The Captain console's preview: the runtime component itself (../captain-console.mjs, unchanged) on the phone pack's
// synthetic fixtures, in each state Frontend checks, at the two development phone sizes: the body in the phone shell's
// sheet (../../phone-shell, unchanged; its frame and footer from captainConsoleSheet()) over the Command Room
// (../../room-scene, unchanged) on the Captain's turn, as sheets 22 and 24 draw it. Each plate's state and reason and
// who is in Jail stand in for what Frontend gives from the projection: the pack's own samples (screens-more.mjs
// captain). The plates' art is the game's film bundle, on the CSS properties the game's bundle defines.
//   index.html                                        every state
//   index.html?single=1&size=390x844&state=console    one phone, for the check's captures
//   index.html?single=1&probe=1                       the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                       the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { PLATE_KINDS, PLATE_STATES, captainConsoleSheet, mountCaptainConsole, plateProperty } from '../captain-console.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// The release's pictures, the room scene's extension, the crew's portraits and the Captain's plates, on the CSS
// properties the game's bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable, the film bundle's
// catalog.json), as the shell's preview sets them.
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
for (const kind of PLATE_KINDS) {
  for (const state of PLATE_STATES) {
    document.documentElement.style.setProperty(plateProperty(kind, state), `url("${new URL(`../../../../../apps/game/hosted/board-v2-film-art/captain/plate-${kind}-${state}.svg`, import.meta.url).href}")`);
  }
}
/** A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew. */
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

const person = n => { const p = seatOf(n); return Object.freeze({ seat: p.seat, name: p.name, character: p.character }); };
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
// The pack's Command Room on the Captain's turn (screens-more.mjs captain): Dev at C1, Fay and Ike in Jail.
const offices = { captain: SELF, officer: 3 };
const people = board({ place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'], 6: ['Jail', 'J1'], 9: ['Jail', 'J2'] } }).filter(p => p.location === ROOM_NAMES['command-room']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: offices.captain === p.seat ? 'captain' : offices.officer === p.seat ? 'officer' : null,
}));
export const room = Object.freeze({ room: 'command-room', roster: 9, people, self: SELF, active: SELF, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
/** The pack's turnBar on Dev's own turn, and the tabs: Actions open behind the console, as sheet 22 draws it. */
const shellBar = seconds => ({ kind: 'turn', who: person(SELF), self: true, round: 3, timer: { remainingMs: seconds * 1000 }, promises: { count: 0 } });

// ── What Frontend gives, standing in: the pack's samples (screens-more.mjs captain) ──
const ON = Object.freeze({ enabled: true });
export const JAILED = Object.freeze(['Fay', 'Ike']);
export const consoleOf = (extra = {}) => ({ view: 'console', viewer: SELF, captain: SELF, versions, jailed: JAILED, command: ON,
  plates: { release: { state: 'available' }, eject: { state: 'available' } }, ...extra });
/** Release used, and Eject not offered: Frontend's reason, the pack's "No one in Jail" (decision 3). */
export const USED = Object.freeze({ release: { state: 'used' }, eject: { state: 'unavailable', reason: 'No one in Jail' } });

/** Each state Frontend checks: the component's input, the bar's seconds, the tab open, the shell's extra input, and the text size. */
export const PREVIEW_STATES = Object.freeze({
  console: { caption: 'Captain console · sheet 22', input: consoleOf(), seconds: 44, open: 'actions' },
  used: { caption: 'Commands used · sheet 22', input: consoleOf({ jailed: [], plates: USED }), seconds: 44, open: 'actions' },
  release: { caption: 'Release · confirm · sheet 22', input: consoleOf({ view: 'release' }), seconds: 33 },
  eject: { caption: 'Eject from the console · sheet 24', input: consoleOf({ view: 'eject' }), seconds: 33 },
  sending: { caption: 'Release in flight', input: consoleOf({ view: 'release', command: { enabled: true, busy: true } }), seconds: 31 },
  stale: { caption: 'Reconnecting · Release waits with the banner\'s words', input: consoleOf({ view: 'release', status: 'stale' }), seconds: 33, shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Captain console · Largest text (200 %)', input: consoleOf(), seconds: 44, open: 'actions', text: 200 },
});

/** The shell around the sheet: the bar, the tabs with the hero's Pass, and the sheet from captainConsoleSheet(). */
export const shellOf = (input, s, extra = {}) => ({
  viewer: SELF, versions, bar: shellBar(s.seconds),
  tabs: { variant: 'game', view: 'room', open: s.open ?? null, hero: { mode: 'pass', enabled: true } },
  sheet: captainConsoleSheet(input),
  ...extra,
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onPlate', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry', 'onTab'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with the Command Room in its stage, its sheet from
 * captainConsoleSheet(), and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s, s.shell), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountCaptainConsole(shell.sheetBody, input, { ...handlers, ...extra });
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runCaptainConsoleAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runCaptainConsoleProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, consoleOf, USED, JAILED }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'console', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Captain console · preview</h1><p>The runtime component on Dev’s phone (Player 4, Captain), in the shell’s sheet over the Command Room on his turn. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__console = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

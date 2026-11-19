// mothership:dev-only
//
// Windows' preview: the runtime component itself (../windows.mjs, unchanged) on the phone pack's synthetic fixtures, in
// each state Frontend checks, at the two development phone sizes: the body in the phone shell's sheet
// (../../phone-shell, unchanged; its frame and footer from windowsSheet()) over Room A (../../room-scene, unchanged),
// with the Panels tab open, as sheet 34 draws it. The windows, the station and the drawings stand in for what Frontend
// gives from the projection: the pack's own samples (screens-more.mjs windows: Hana's face, Eli's arrow and Dev's
// "13"), each sketch turned into the contract's strokes, as a phone would send them.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=view     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { INKS, PEN_WIDTH, mountWindows, windowsSheet } from '../windows.mjs';
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

// ── Room A in a match, as sheet 34 draws it behind Windows: Gus's turn, Round 3, 0:42, the Panels tab open ──
const fixture = ROOM_FIXTURES['room-a'];
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name }; };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
export const room = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
/** The shell around the sheet: the pack's turnBar() and the tabs with Panels open; the sheet from windowsSheet(). */
export const shellOf = (input, extra = {}) => ({
  viewer: SELF, versions,
  bar: { kind: 'turn', who: { ...person(fixture.active), character: seatOf(fixture.active).character }, self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 0 } },
  tabs: { variant: 'game', view: 'room', open: 'panels', hero: { mode: 'pass', enabled: false } },
  sheet: windowsSheet(input),
  ...extra,
});

// ── The pack's sketches (screens-more.mjs ARROW, NUMBER and FACE), as the contract's strokes ──
/** The pack's sketch paths, in its 512 × 280 box. */
export const SKETCHES = Object.freeze({
  arrow: ['M80 200 C 160 120, 260 110, 380 120', 'M350 92 L 386 120 L 348 146'],
  number: ['M120 70 L 150 50 L 150 220', 'M110 220 L 190 220', 'M260 60 C 330 40, 360 120, 300 140 C 360 150, 350 240, 260 220'],
  face: ['M256 60 A 90 90 0 1 0 256.1 60', 'M220 120 L 222 132', 'M290 120 L 292 132', 'M210 180 C 240 205, 280 205, 305 180'],
  one: ['M120 70 L 150 50 L 150 220', 'M110 220 L 190 220'],
});
const NS = 'http://www.w3.org/2000/svg';
const probeSvg = document.createElementNS(NS, 'svg');
probeSvg.setAttribute('aria-hidden', 'true');
Object.assign(probeSvg.style, { position: 'absolute', width: '0', height: '0', overflow: 'hidden' });
const round4 = v => Math.round(v * 10000) / 10000;
const unitPoint = (x, y) => [round4(x / 512), round4(y / 280)];
/**
 * A sketch path as a stroke's points: a line's corners exactly, and each curve or arc sampled every 3 units along it,
 * its ends included, as a finger drawing it would give them.
 */
export function pointsOf(d) {
  if (!probeSvg.isConnected) document.body.append(probeSvg);
  const t = d.match(/[MLCA]|-?\d*\.?\d+/g);
  const points = [];
  let i = 0, cur = null;
  const num = () => Number(t[i++]);
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; points.push(unitPoint(...cur)); continue; }
    const n = cmd === 'C' ? 6 : 7;
    const args = t.slice(i, i + n).map(Number);
    i += n;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${cur[0]} ${cur[1]} ${cmd}${args.join(' ')}`);
    probeSvg.append(path);
    const length = path.getTotalLength(), steps = Math.max(2, Math.ceil(length / 3));
    for (let k = 1; k <= steps; k += 1) { const p = path.getPointAtLength((length * k) / steps); points.push(unitPoint(p.x, p.y)); }
    path.remove();
    cur = args.slice(-2);
  }
  return points;
}
const ink = name => INKS.find(i => i.name === name).color;
/** A sketch as the contract's drawing: its paths, in one ink at the pen's width. */
export const drawingOf = (sketch, inkName) => ({ strokes: SKETCHES[sketch].map(d => ({ color: ink(inkName), width: PEN_WIDTH, points: pointsOf(d) })) });

// ── What Frontend gives, standing in: the pack's samples (screens-more.mjs windows) ──
export const HANA = person(8), ELI = person(5), DEV = person(SELF);
export const FACE = Object.freeze({ id: 'd-hana', order: 0, round: 3, author: HANA, drawing: drawingOf('face', 'Teal') });
export const ARROW = Object.freeze({ id: 'd-eli', order: 0, round: 3, author: ELI, drawing: drawingOf('arrow', 'Paper') });
export const NUMBER = Object.freeze({ id: 'd-dev', order: 1, round: 3, author: DEV, drawing: drawingOf('number', 'Gold') });
/** Room A's two windows, as the projection gives them; at A2 this player can draw at Room A ↔ Hospital. */
export const windowsOf = ({ station = null, shown = false } = {}) => [
  { windowId: 'A_B', rooms: ['Room A', 'Room B'], station: null, drawings: [FACE] },
  { windowId: 'A_HOSPITAL', rooms: ['Room A', 'Hospital'], station, drawings: shown ? [ARROW, NUMBER] : [ARROW] },
];
/** Dev's drawing being made at A2: the pack's "1", in Gold. */
export const DRAFT = Object.freeze({ windowId: 'A_HOSPITAL', ink: ink('Gold'), strokes: drawingOf('one', 'Gold').strokes });
export const NONE = Object.freeze({ title: 'No window here', line: 'The Command Room has no window' });
const ON = Object.freeze({ enabled: true });
export const inputOf = (extra = {}) => ({ view: 'windows', viewer: SELF, windows: windowsOf(), ...extra });
const drawInput = (extra = {}) => inputOf({ windows: windowsOf({ station: 'A2' }), draft: DRAFT, show: ON, ...extra });

/** The keyboard drawing: focus the box, move the pen, and draw a short line with Shift. */
const byKeyboard = m => {
  const pad = m.host.element.querySelector('.ms-wn-pad');
  pad.focus();
  const key = (k, shift = false) => pad.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true }));
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp']) key(k);
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) key(k, true);
};

/** Each state Frontend checks: the component's input, the shell's extra input, the text size, and what happens after mounting. */
export const PREVIEW_STATES = Object.freeze({
  view: { caption: 'Windows · the room\'s two windows · sheet 34', input: inputOf() },
  draw: { caption: 'Draw at your station · A2 · sheet 34', input: drawInput() },
  shown: { caption: 'Shown · sheet 34', input: inputOf({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: 'd-dev' }) },
  none: { caption: 'No window here · sheet 34', input: inputOf({ windows: [], none: NONE }) },
  blank: { caption: 'At your station, nothing drawn · Show off', input: drawInput({ draft: null }) },
  showing: { caption: 'Show in flight', input: drawInput({ show: { enabled: true, busy: true } }) },
  keyboard: { caption: 'Drawing with the keyboard · the pen\'s mark', input: drawInput(), after: byKeyboard },
  stale: { caption: 'Reconnecting · drawing works, Show waits', input: drawInput({ status: 'stale' }), shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Draw at your station · Largest text (200 %)', input: drawInput(), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onDraft', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry', 'onTab'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with Room A in its stage, its sheet from windowsSheet(),
 * and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s.shell), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountWindows(shell.sheetBody, input, { ...handlers, ...extra });
  const m = { host, shell, scene, input };
  if (!given) s.after?.(m);
  return m;
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runWindowsAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runWindowsProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, inputOf, windowsOf, drawingOf, DRAFT, NONE, FACE, ARROW, NUMBER, HANA, ELI, DEV }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'view', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Windows · preview</h1><p>The runtime component on Dev’s phone (Player 4), in the shell’s sheet over Room A with the Panels tab open. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__windows = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

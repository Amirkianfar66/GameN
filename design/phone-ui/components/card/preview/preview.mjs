// mothership:dev-only
//
// The Card sheet's preview: the runtime component itself (../card.mjs, unchanged) inside the phone shell
// (../../phone-shell/phone-shell.mjs, unchanged), with the room scene (../../room-scene/room-scene.mjs,
// unchanged) in the shell's stage, on the phone pack's synthetic fixtures (states.mjs, from
// design/phone-ui/prototype/fixtures.mjs: invented names, seats and roles, as the review sheets use), at the
// two development phone sizes, in each state the pack draws on sheet 31 and the ones it leaves out.
//   index.html                                        every state at 390 × 844 and 430 × 932
//   index.html?single=1&size=390x844&state=card       one phone, for the check's captures
//   index.html?single=1&probe=1                       the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                       the component beside the pinned pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { cardSheet, mountCardSheet } from '../card.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board } from '../../../prototype/fixtures.mjs';
import { CARD_STATES } from './states.mjs';

/** The development phone sizes, with the pack's review frames' safe areas; 320 × 568 for the largest text. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '320x568': Object.freeze({ width: 320, height: 568, insets: Object.freeze({ top: 20, bottom: 0 }) }),
});

// The release's pictures, the room scene's extension, the crew's portraits, and the card's person and held
// device, on the CSS properties the game's bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable,
// and the role card's personVariable and deviceVariable).
const DESIGN = new URL('../../../../', import.meta.url);
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
  document.documentElement.style.setProperty(`--ms-asset-piece-crew-card-c${n}`, `url("${new URL(`crew-drawing/assets/cards/card-c${n}.svg`, DESIGN).href}")`);
}
for (const device of ['cracker', 'insider', 'blue-disabler', 'red-disabler', 'supplier', 'undercover', 'hacker', 'alien']) {
  document.documentElement.style.setProperty(`--ms-asset-device-${device}-held`, `url("${new URL(`crew-drawing/assets/roles/device-${device}.held.svg`, DESIGN).href}")`);
}

// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew.
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const params = new URLSearchParams(location.search);
// The captures hold one moment of the voyage (2:10), as the shell's do.
const at = params.has('at') ? Number(params.get('at')) : null;
const clock = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };
if (params.get('text')) document.documentElement.style.fontSize = `${Number(params.get('text'))}%`;

// ── The room behind: Room A, seen by seat 4 (Dev), as the pack's card() screen draws it ──
const fixture = ROOM_FIXTURES['room-a'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
// Gus's turn (seat 7); no room control under a sheet.
export const ROOM = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: 7, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const shellHandlers = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onCancelTarget', 'onChip', 'onRetry', 'onSheetAction', 'onSheetBack', 'onSheetClose'].map(n => [n, record(n)]));

/** One state's three inputs (the shell, the room scene and the component), with the state's status applied. */
export function inputsFor(stateKey, size) {
  const state = CARD_STATES[stateKey];
  if (!state) throw new Error(`Unknown state: ${stateKey}`);
  const status = state.status ?? 'live';
  const component = { ...state.card, versions, status };
  const shell = { ...state.shell, versions, insets: size.insets, status, sheet: cardSheet(component),
    ...(status === 'stale' ? { bar: { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, promises: { count: 0 }, menu: {} }, banner: { kind: 'reconnecting' } } : {}) };
  return { state, shell, scene: { ...ROOM, status }, component };
}

/** A phone at a development size: the shell in it, the room scene in its stage, the Card sheet in its sheet. */
function phone(sizeKey, stateKey) {
  const size = PREVIEW_SIZES[sizeKey];
  const { shell: shellInput, scene: sceneInput, component } = inputsFor(stateKey, size);
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null;
    const shell = mountPhoneShell(frame, shellInput, { ...shellHandlers, onLayout: layout => scene?.update({ size: layout.stage }) });
    scene = mountRoomScene(shell.stage, { ...sceneInput, size: shell.layout().stage }, {});
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) scene.suspend();
    const part = shell.sheetBody ? mountCardSheet(shell.sheetBody, component, { onView: record('onView'), onShow: record('onShow'), onFocusReturn: record('onFocusReturn') }) : null;
    return { shell, scene, part };
  } };
}

const mounted = [];
let probe = null, agree = null;
if (params.get('probe') || params.get('agree')) {
  document.body.classList.add('pv-single');
  const run = params.get('probe')
    ? import('./probe.mjs').then(m => m.runCardProbe({ sizes: PREVIEW_SIZES, versions, room: ROOM, inputsFor }))
    : import('./agree.mjs').then(m => m.runCardAgreement({ sizes: PREVIEW_SIZES, inputsFor }));
  const outcome = document.fonts.ready.then(() => run).catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
  if (params.get('probe')) probe = outcome; else agree = outcome;
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'card', state = CARD_STATES[stateKey];
  const sizeKey = params.get('size') ?? state?.sizes?.[0] ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !state) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  if (state.text && !params.get('text')) document.documentElement.style.fontSize = `${state.text}%`;
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Card sheet · preview</h1><p>The runtime component inside the phone shell, with the room scene in its stage: Room A, seen by Player 4. ${FIXTURE_LABEL}. The Largest text states have their own pages (index.html?single=1&amp;state=large-…). Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [stateKey, state] of Object.entries(CARD_STATES)) {
    if (state.text) continue;
    for (const sizeKey of state.sizes ?? ['390x844', '430x932']) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${state.caption}<small>${sizeKey.replace('x', ' × ')} · sheet ${state.sheet} · state=${stateKey}</small>`;
      const p = phone(sizeKey, stateKey);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__card = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

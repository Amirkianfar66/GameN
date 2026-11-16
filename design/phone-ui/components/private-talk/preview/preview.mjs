// mothership:dev-only
//
// The private talk preview: the runtime component itself (../private-talk.mjs, with ../../play-parts, unchanged)
// inside the phone shell (../../phone-shell/phone-shell.mjs, unchanged), with the room scene
// (../../room-scene/room-scene.mjs, unchanged) or the capsule in the shell's stage, on the phone pack's synthetic
// fixtures (states.mjs, from design/phone-ui/prototype/fixtures.mjs: invented names, seats and roles, as the
// review sheets use), at the two development phone sizes and the smallest, in each state the pack draws on sheet
// 25 and the ones it leaves out.
//   index.html                                          every state at 390 × 844 and 430 × 932, the small phone's at 320 × 568
//   index.html?single=1&size=390x844&state=declare-own  one phone, for the check's captures
//   index.html?single=1&probe=1                          the lifecycle and privacy probe (probe.mjs), for the check
//   index.html?single=1&agree=1                          the component beside the pinned pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { CAPSULE_LAYERS, mountCapsule, mountClaim, mountDeclare, mountTalkWait } from '../private-talk.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, board } from '../../../prototype/fixtures.mjs';
import { TALK_STATES } from './states.mjs';

/** The development phone sizes, with the pack's review frames' safe areas; 320 × 568 for the smallest phone. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '320x568': Object.freeze({ width: 320, height: 568, insets: Object.freeze({ top: 20, bottom: 0 }) }),
});

// The release's pictures (the rooms' and the capsule's), the room scene's extension and the crew's portraits, on
// the CSS properties the game's bundles define (room-art.mjs, CAPSULE_LAYERS, room-extension.mjs, crewPortraitVariable).
const style = document.documentElement.style;
for (const art of Object.values(ROOM_ART)) {
  for (const { property, file } of [art.back, ...art.layers, art.dark]) style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/${file}`, import.meta.url).href}")`);
}
for (const { property } of CAPSULE_LAYERS) {
  const name = property.replace('--board-v2-art-capsule-', '');
  style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/capsule.${name}.svg`, import.meta.url).href}")`);
}
for (const ext of Object.values(ROOM_EXTENSION)) {
  for (const { property, file } of [ext.lit, ext.dark]) style.setProperty(property, `url("${new URL(`../../room-scene/assets/${file}`, import.meta.url).href}")`);
}
for (let n = 1; n <= 9; n += 1) {
  style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}

// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew.
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const params = new URLSearchParams(location.search);
// The captures hold one moment of the voyage (2:10), as the shell's do.
const at = params.has('at') ? Number(params.get('at')) : null;
export const clock = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };
if (params.get('text')) document.documentElement.style.fontSize = `${Number(params.get('text'))}%`;

// ── The room behind the sheets: Room A, as the pack's sheet 25 draws it (no one's turn) ──
const fixture = ROOM_FIXTURES['room-a'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
export const ROOM = Object.freeze({ room: 'room-a', roster: 9, people, active: null, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });

export const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const shellHandlers = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onRetry', 'onSheetAction', 'onSheetBack', 'onSheetClose'].map(n => [n, record(n)]));
const MOUNTS = { declare: mountDeclare, claim: mountClaim, wait: mountTalkWait };

/** One state's inputs (the shell, the room scene or the capsule, the part), with the state's status applied. */
export function inputsFor(stateKey, size) {
  const state = TALK_STATES[stateKey];
  if (!state) throw new Error(`Unknown state: ${stateKey}`);
  const status = state.status ?? 'live';
  const shell = { ...state.shell, versions, insets: size.insets, status,
    ...(status === 'stale' ? { bar: { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, promises: { count: 0 }, menu: {} }, banner: { kind: 'reconnecting' } } : {}) };
  const viewer = `seat-${state.viewer}`;
  const scene = state.stage === 'room' ? { ...ROOM, self: state.viewer, status } : null;
  const capsule = state.stage === 'capsule' ? { viewer, versions, status, clock, ...state.part.input } : null;
  const part = state.part && state.stage !== 'capsule' ? { kind: state.part.kind, input: { viewer, versions, status, ...state.part.input } } : null;
  return { state, shell, scene, capsule, part };
}

/** Mounts a sheet's part in the shell's sheet body, as Frontend does for the step's sheet. */
export function mountPart(shell, part, handlers = {}) {
  if (!part || !shell.sheetBody) return null;
  return MOUNTS[part.kind](shell.sheetBody, part.input, { onSide: record('onSide'), onFocusReturn: record('onFocusReturn'), ...handlers });
}

/** The stage's content: the capsule in the talk, otherwise the room scene, sized as the stage. */
export function mountStage(shell, { scene, capsule }, handlers = {}) {
  const size = shell.layout().stage;
  if (capsule) return mountCapsule(shell.stage, { ...capsule, size }, { onFocusReturn: record('onFocusReturn'), ...handlers });
  return mountRoomScene(shell.stage, { ...scene, size }, { onSeat: record('onSeat'), onSlot: record('onSlot') });
}

/** A phone at a development size: the shell in it, the room scene or the capsule in its stage, the part in its sheet. */
function phone(sizeKey, stateKey) {
  const size = PREVIEW_SIZES[sizeKey];
  const inputs = inputsFor(stateKey, size);
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let stage = null;
    const shell = mountPhoneShell(frame, inputs.shell, { ...shellHandlers, onLayout: layout => { record('onLayout')(layout); if (layout.stage.width > 0 && layout.stage.height > 0) stage?.update({ size: layout.stage }); } });
    stage = mountStage(shell, inputs);
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) stage.suspend();
    const part = mountPart(shell, inputs.part);
    return { shell, stage, part };
  } };
}

const mounted = [];
let probe = null, agree = null;
if (params.get('probe') || params.get('agree')) {
  document.body.classList.add('pv-single');
  const run = params.get('probe')
    ? import('./probe.mjs').then(m => m.runTalkProbe({ sizes: PREVIEW_SIZES, versions, inputsFor }))
    : import('./agree.mjs').then(m => m.runTalkAgreement({ sizes: PREVIEW_SIZES, inputsFor }));
  const outcome = document.fonts.ready.then(() => run).catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
  if (params.get('probe')) probe = outcome; else agree = outcome;
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'declare-own', state = TALK_STATES[stateKey];
  const sizeKey = params.get('size') ?? state?.sizes?.[0] ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !state) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  if (state.text && !params.get('text')) document.documentElement.style.fontSize = `${state.text}%`;
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Private talk · preview</h1><p>The runtime component inside the phone shell, over the room scene or in the capsule: Ava (Player 1) asked Dev (Player 4) to talk; Gus (Player 7) is another phone. ${FIXTURE_LABEL}. The text-size states have their own pages (index.html?single=1&amp;state=largest-declare, largest-claim, largest-wait, largest-talk). Desktop browser at each phone’s CSS size: not a phone.</p>`;
  document.body.append(head);
  const sections = new Map();
  for (const [stateKey, state] of Object.entries(TALK_STATES)) {
    // A text size applies to the whole page, so those states have their own pages.
    if (state.text) continue;
    const title = `Sheet ${state.sheet}`;
    if (!sections.has(title)) {
      const h2 = document.createElement('h2');
      h2.className = 'pv-section';
      h2.textContent = title;
      const grid = document.createElement('div');
      grid.className = 'pv-grid';
      document.body.append(h2, grid);
      sections.set(title, grid);
    }
    for (const sizeKey of state.sizes ?? ['390x844', '430x932']) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${state.caption}<small>${sizeKey.replace('x', ' × ')} · sheet ${state.sheet} · Player ${state.viewer}'s phone · state=${stateKey}</small>`;
      const p = phone(sizeKey, stateKey);
      cell.append(caption, p.frame);
      sections.get(title).append(cell);
      mounted.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__talk = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

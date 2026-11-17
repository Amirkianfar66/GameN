// mothership:dev-only
//
// The ballot's and the result window's preview: the runtime component itself (../vote.mjs, unchanged)
// inside the phone shell (../../phone-shell/phone-shell.mjs, unchanged), with the room scene
// (../../room-scene/room-scene.mjs, unchanged) in the shell's stage, on the phone pack's synthetic
// fixtures (states.mjs, from design/phone-ui/prototype/fixtures.mjs: invented names, seats and results,
// as the review sheets use), at the two development phone sizes, in each state the pack draws.
//   index.html                                          every state at 390 × 844 and 430 × 932, then sheet 56's at 320 × 568
//   index.html?single=1&size=390x844&state=jail-open    one phone, for the check's captures
//   index.html?single=1&probe=1                         the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                         the component beside the pinned pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { ballotBar, ballotSheet, mountBallot, mountVoteResult, resultBar } from '../vote.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board } from '../../../prototype/fixtures.mjs';
import { VOTE_STATES } from './states.mjs';

/** The development phone sizes, with the pack's review frames' safe areas; 320 × 568 for the largest text. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '320x568': Object.freeze({ width: 320, height: 568, insets: Object.freeze({ top: 20, bottom: 0 }) }),
});

// The release's pictures, the room scene's extension and the crew's portraits, on the CSS properties the
// game's bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable).
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

// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew.
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const params = new URLSearchParams(location.search);
// The captures hold one moment of the voyage (2:10), as the shell's do.
const at = params.has('at') ? Number(params.get('at')) : null;
const clock = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };
if (params.get('text')) document.documentElement.style.fontSize = `${Number(params.get('text'))}%`;

// ── The room behind: Room A, seen by seat 4 (Dev), as the pack's vote sheets draw it ──
const fixture = ROOM_FIXTURES['room-a'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
// No one's turn while a vote is open, and no room control under a sheet or the result window.
export const ROOM = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: null, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const shellHandlers = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onCancelTarget', 'onChip', 'onRetry', 'onSheetAction', 'onSheetBack', 'onSheetClose'].map(n => [n, record(n)]));

/** One state's three inputs (the shell, the room scene and the component), with the state's status applied. */
export function inputsFor(stateKey, size) {
  const state = VOTE_STATES[stateKey];
  if (!state) throw new Error(`Unknown state: ${stateKey}`);
  const status = state.status ?? 'live';
  const component = { ...(state.ballot ?? state.result), versions, status };
  // The bar's words are the component's (ballotBar, resultBar); the round and the clock are Frontend's.
  const words = state.ballot ? ballotBar(component) : resultBar(component);
  const bar = { ...state.shell.bar, ...words };
  const shell = { ...state.shell, versions, insets: size.insets, status, bar: status === 'stale'
    ? { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: bar.round, promises: { count: 0 }, menu: {} } : bar,
  banner: status === 'stale' ? { kind: 'reconnecting' } : null,
  sheet: state.ballot ? ballotSheet(component) : null };
  return { state, shell, scene: { ...ROOM, status }, component };
}

/** A phone at a development size: the shell in it, the room scene in its stage, the ballot or the result. */
function phone(sizeKey, stateKey) {
  const size = PREVIEW_SIZES[sizeKey];
  const { state, shell: shellInput, scene: sceneInput, component } = inputsFor(stateKey, size);
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null;
    const shell = mountPhoneShell(frame, shellInput, { ...shellHandlers, onLayout: layout => scene?.update({ size: layout.stage }) });
    scene = mountRoomScene(shell.stage, { ...sceneInput, size: shell.layout().stage }, {});
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) scene.suspend();
    let part = null;
    if (state.ballot && shell.sheetBody) part = mountBallot(shell.sheetBody, component, { onSelect: record('onSelect'), onFocusReturn: record('onFocusReturn') });
    // The result window in the shell's cover: over the stage and the room scene's tags, under the shell's own layers.
    if (state.result) part = mountVoteResult(shell.slot('cover'), component);
    return { shell, scene, part, kind: state.ballot ? 'ballot' : 'result' };
  } };
}

const mounted = [];
let probe = null, agree = null;
if (params.get('probe') || params.get('agree')) {
  document.body.classList.add('pv-single');
  const run = params.get('probe')
    ? import('./probe.mjs').then(m => m.runVoteProbe({ sizes: PREVIEW_SIZES, versions, room: ROOM }))
    : import('./agree.mjs').then(m => m.runVoteAgreement({ sizes: PREVIEW_SIZES, versions, room: ROOM, inputsFor }));
  const outcome = document.fonts.ready.then(() => run).catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
  if (params.get('probe')) probe = outcome; else agree = outcome;
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'jail-open', state = VOTE_STATES[stateKey];
  const sizeKey = params.get('size') ?? state?.sizes?.[0] ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !state) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  if (state.text && !params.get('text')) document.documentElement.style.fontSize = `${state.text}%`;
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Ballot and result · preview</h1><p>The runtime component inside the phone shell, with the room scene in its stage: Room A, seen by Player 4. ${FIXTURE_LABEL}. Sheet 56’s states are drawn at 320 × 568 with the Largest text on their own pages (index.html?single=1&amp;state=large-…). Desktop browser at each phone’s CSS size: not a phone.</p>`;
  document.body.append(head);
  const sections = new Map();
  for (const [stateKey, state] of Object.entries(VOTE_STATES)) {
    // The Largest text applies to the whole page, so its states have their own pages.
    if (state.text) continue;
    const title = state.sheet === '—' || state.sheet === '45' ? 'The policies: reconnecting and concealed' : `Sheet ${state.sheet}`;
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
      caption.innerHTML = `${state.caption}<small>${sizeKey.replace('x', ' × ')} · state=${stateKey}</small>`;
      const p = phone(sizeKey, stateKey);
      cell.append(caption, p.frame);
      sections.get(title).append(cell);
      mounted.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__vote = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

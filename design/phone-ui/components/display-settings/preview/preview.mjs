// mothership:dev-only
//
// Display settings' preview: the runtime component itself (../display-settings.mjs, unchanged) on the phone
// pack's synthetic fixtures, in each state Frontend checks, at the two development phone sizes: the Display page
// before a match; and in a match, the Settings sheet's content in the phone shell's sheet (../../phone-shell,
// unchanged) over Room A (../../room-scene, unchanged), as sheet 32 draws it. The settings stand in for what
// Frontend keeps on the phone (preferences.mjs); the lock's reason stands in for Frontend's words.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=page     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     both mounts beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountDisplayPage, mountSettingsSheet, SETTINGS_WORDS } from '../display-settings.mjs';
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

// The release's pictures, the room scene's extension and the crew's portraits, on the CSS properties the
// game's bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable), as the shell's preview sets them.
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

// ── Room A in a match, as sheet 32 draws it behind Settings: Gus's turn, Round 3, 0:42, ⋮ open ──
const fixture = ROOM_FIXTURES['room-a'];
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
/** A still moment of the voyage (the shell preview's 2:10), so every capture shows the same picture. */
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
export const room = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
/** The shell around the sheet: the pack's turnBar({ open: 'menu' }) and plain tabs, the Settings sheet open. */
export const shellOf = (extra = {}) => ({
  viewer: SELF, versions,
  bar: { kind: 'turn', who: person(fixture.active), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 0 }, menu: { open: true } },
  tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } },
  sheet: { id: 'settings', title: SETTINGS_WORDS.sheet },
  ...extra,
});

/** Frontend's words for the lock, standing in (the Lead's example on #294). */
export const LOCK = Object.freeze({ reason: 'On, because this phone asks for less motion' });
const HOST = Object.freeze({ enabled: true });

/** Each state Frontend checks: which mount, its input, the shell's (for the sheet), and the text size. */
export const PREVIEW_STATES = Object.freeze({
  page: { caption: 'Display page · before a match', mount: 'page', input: {} },
  'page-on': { caption: 'Display page · Reduce motion on', mount: 'page', input: { reducedMotion: true } },
  'page-locked': { caption: 'Display page · locked by the phone', mount: 'page', input: { reducedMotion: true, motionLock: LOCK } },
  'page-large': { caption: 'Display page · Large text (150 %)', mount: 'page', input: { textScale: 1.5 }, text: 150 },
  'page-largest': { caption: 'Display page · Largest text (200 %)', mount: 'page', input: { textScale: 2 }, text: 200 },
  sheet: { caption: 'Settings (⋮) · sheet 32', mount: 'sheet', input: {} },
  'sheet-host': { caption: 'Settings · host · sheet 32', mount: 'sheet', input: { hostControls: HOST } },
  'sheet-locked': { caption: 'Settings · locked by the phone', mount: 'sheet', input: { reducedMotion: true, motionLock: LOCK, hostControls: HOST } },
  'sheet-stale': { caption: 'Settings · reconnecting (still taking taps)', mount: 'sheet', input: { hostControls: HOST }, shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  'sheet-largest': { caption: 'Settings · host · Largest text (200 %)', mount: 'sheet', input: { textScale: 2, hostControls: HOST }, text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onReducedMotion', 'onTextScale', 'onBack', 'onHostControls', 'onFocusReturn'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the page; or the shell with Room A in its stage, its Settings
 * sheet open, and the content in the sheet's body. Returns { settings, shell, scene }.
 */
export function mountState(frame, key, insets, extra = {}, { still = true } = {}) {
  const s = PREVIEW_STATES[key];
  if (s.mount === 'page') return { settings: mountDisplayPage(frame, { ...s.input, insets }, { ...handlers, ...extra }), shell: null, scene: null };
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(s.shell), insets, reducedMotion: !!s.input.reducedMotion }, { onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const settings = mountSettingsSheet(shell.sheetBody, s.input, { ...handlers, ...extra });
  return { settings, shell, scene };
}
const disposeState = m => { m.settings.dispose(); m.scene?.dispose(); m.shell?.dispose(); };

/** A phone at a development size, the state in it. */
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runDisplaySettingsAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runDisplaySettingsProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, LOCK }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'page', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Display settings · preview</h1><p>The runtime component on Player 4’s phone: the Display page before a match, and Settings in a match. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__displaySettings = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

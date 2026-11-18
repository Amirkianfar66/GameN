// mothership:dev-only
//
// The phone shell's preview: the runtime component itself (../phone-shell.mjs, unchanged) with the room
// scene (../../room-scene/room-scene.mjs, unchanged) mounted in its stage, on the phone pack's synthetic
// fixtures (design/phone-ui/prototype/fixtures.mjs: invented names, seats and places, as the review
// sheets use), at the two development phone sizes, in each state Frontend checks. What is not the
// shell's (a sheet's content, the private-talk capsule) is a labelled stand-in.
//   index.html                                    every state at 390 × 844 and 430 × 932
//   index.html?single=1&size=390x844&state=own    one phone, for the check's captures
//   …&text=200                                    the game's Largest text (200%)
//   index.html?single=1&probe=1                   the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                   the shell beside the pinned pack (agree.mjs), for the check
// The phase bars' words (0.2.10) are ../phase-bars.mjs's, unchanged: every phase state here calls it.

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountPhoneShell } from '../phone-shell.mjs';
import { phaseBar, movedBar, loadingBar, reconnectingBar, phaseClosedToast } from '../phase-bars.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

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
// The captures hold one moment of the voyage, as the pack's sheet 55 does (2:10); the page alone runs it.
const at = params.has('at') ? Number(params.get('at')) : null;
const clock = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };
if (params.get('text')) document.documentElement.style.fontSize = `${Number(params.get('text'))}%`;

// ── The fixtures: Room B, seen by seat 4 (Dev) ──────────────────────
const fixture = ROOM_FIXTURES['room-b'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-b']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const room = Object.freeze({ room: 'room-b', roster: 9, people, self: SELF, active: fixture.active, versions, clock,
  control: { id: 'windows', label: 'Windows · 2', icon: 'window' }, roomArt: ROOM_ART_RELEASE });
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const seconds = s => ({ remainingMs: s * 1000 });
const turnBar = (n, extra = {}) => ({ kind: 'turn', who: person(n), self: n === SELF, round: 3, timer: seconds(42), promises: { count: 1 }, menu: {}, ...extra });
const tabs = (extra = {}) => ({ variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false }, ...extra });
const own = { viewer: SELF, versions, bar: turnBar(SELF), tabs: tabs({ hero: { mode: 'pass' } }) };
// A phase bar on a player's phone (0.2.10): the words come from phase-bars.mjs; Promises and ⋮ are the phone's.
const player = { promises: { count: 0 }, menu: {} };
const phase = (kind, facts = {}) => phaseBar({ phase: kind, round: 3, ...player, ...facts });
const idle = { ...room, active: null };
const sheetNote = text => ({ fill: body => { const p = document.createElement('p'); p.className = 'pv-note'; p.textContent = text; body.append(p); } });
const sheetStandIn = text => ({ fill: body => { const p = document.createElement('div'); p.className = 'pv-sheet-stand-in'; p.textContent = text; body.append(p); } });

/** Each state Frontend checks: the shell's input, the room scene's (null: a stand-in), and a sheet's content. */
export const PREVIEW_STATES = Object.freeze({
  turn: { caption: 'Another player’s turn', shell: { viewer: SELF, versions, bar: turnBar(fixture.active), tabs: tabs() }, scene: room },
  own: { caption: 'Your turn · Pass ready', shell: own, scene: { ...room, active: SELF } },
  urgent: { caption: 'Your turn · the last 10 s', shell: { ...own, bar: turnBar(SELF, { timer: seconds(8) }) }, scene: { ...room, active: SELF } },
  vote: { caption: 'Jail vote · the ballot open', shell: { viewer: SELF, versions, bar: { kind: 'phase', icon: 'jail', title: 'Jail vote', sub: 'Choose who goes to Jail', round: 3, timer: seconds(24), promises: { count: 0 }, menu: {} }, tabs: tabs({ hero: { mode: 'vote' } }) }, scene: { ...room, active: null } },
  voted: { caption: 'Jail vote · voted', shell: { viewer: SELF, versions, bar: { kind: 'phase', icon: 'jail', title: 'Jail vote', sub: 'Your ballot is in', round: 3, timer: seconds(19), promises: { count: 0 }, menu: {} }, tabs: tabs({ hero: { mode: 'voted' } }) }, scene: { ...room, active: null } },
  result: { caption: 'The 5 s result · a ring, ⋮ only; the window in the cover', shell: { viewer: SELF, versions, bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, timer: { remainingMs: 3000, ring: 0.6 }, menu: {} }, tabs: tabs({ hero: { mode: 'vote', enabled: false } }) }, scene: { ...room, active: null }, cover: 'The result window · the vote component (#267), in slot(\'cover\')' },
  // 0.2.10: the pack's own words and time for the dark (sheets 07 and 30), from phase-bars.mjs.
  dark: { caption: 'Blackout · dark, positions fixed', shell: { viewer: SELF, versions, bar: phase('BLACKOUT', { dark: true, remainingMs: 8000 }), tabs: tabs() }, scene: room, then: { lighting: 'dark', hold: 'blackout-1', control: null } },
  target: { caption: 'Choosing a target · Cancel in the bar', shell: { ...own, target: { icon: 'rescue', title: 'Rescue', sub: 'Choose a player · in your room' }, chip: { id: 'other-rooms', label: 'Other rooms · 1', icon: 'board' } }, scene: { ...room, active: SELF, control: null, targets: { seats: [3, 6, 8], picked: null } } },
  // With a sheet docked, the room's own control is not offered (the pack hides it under a sheet).
  pass: { caption: 'Pass asks once', shell: { ...own, tabs: tabs({ hero: { mode: 'pass', busy: false } }), sheet: { id: 'pass', title: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', close: false, actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'pass', label: 'Pass', kind: 'primary', icon: 'pass' }] } }, scene: { ...room, active: SELF, control: null }, content: sheetNote('Your move stays open on the other turns this round.') },
  actions: { caption: 'Actions open · its sheet docked', shell: { ...own, tabs: tabs({ open: 'actions', hero: { mode: 'pass' } }), sheet: { id: 'actions', title: 'Actions', sub: 'Doctor · Round 3' } }, scene: { ...room, active: SELF, control: null }, content: sheetStandIn('The Actions tiles · the next component (sheet 28)') },
  // A head action, as sheet 31's "Hide card", before Close.
  card: { caption: 'Card open · Hide card in the sheet’s head', shell: { ...own, tabs: tabs({ open: 'card', hero: { mode: 'pass' } }), sheet: { id: 'card', title: 'Your role', sub: 'Only on this phone', detent: 'large', head: [{ id: 'hide', icon: 'hide', label: 'Hide card' }] } }, scene: { ...room, active: SELF, control: null }, content: sheetStandIn('The Card sheet · the Gameplay UI builder’s (#270)') },
  talk: { caption: 'Private talk · its own two buttons', shell: { viewer: SELF, versions, bar: { kind: 'pair', pair: [person(1), person(SELF)], round: 3, timer: seconds(47), promises: { count: 0 }, menu: {} }, tabs: { variant: 'talk' } }, scene: null, standIn: 'The private-talk capsule · a later component (sheet 25)' },
  stale: { caption: 'Reconnecting · the last room, dimmed', shell: { viewer: SELF, versions, status: 'stale', bar: reconnectingBar({ round: 3, ...player }), tabs: tabs(), banner: { kind: 'reconnecting' } }, scene: { ...room, status: 'stale' } },
  // An eliminated player's phone (sheet 44's Eliminated frame, 0.2.8): the banner's words without Retry, over the room
  // they watch, down in their place; Actions not offered, as Frontend gives it.
  out: { caption: 'Eliminated · watching, the role private', shell: { viewer: SELF, versions, bar: turnBar(fixture.active), tabs: tabs({ enabled: { actions: false }, reasons: { actions: 'You’re out' } }), banner: { kind: 'out' } },
    scene: { ...room, people: people.map(p => (p.seat === SELF ? { ...p, health: 'Eliminated' } : p)) } },
  concealed: { caption: 'Concealed', shell: { ...own, status: 'concealed' }, scene: { ...room, status: 'concealed' } },
  // bar: null and edge, as the role stage's film (#268): the stage edge to edge, the banner at the bar's place (sheet 18).
  film: { caption: 'No top bar · a film edge to edge, the banner at the bar’s place', shell: { viewer: SELF, versions, status: 'stale', bar: null, tabs: null, edge: true, banner: { kind: 'reconnecting' } }, scene: null, standIn: 'A full-screen film · the role stage (#268) mounts it in the stage' },
  // edge under a bar, as ship travel's public poster (#269, sheet 41): the bar's glass lies over the stage.
  poster: { caption: 'Edge to edge under the bar · a poster, no tabs', shell: { viewer: SELF, versions, bar: phase('NAV_SETTING', { remainingMs: 11000 }), tabs: null, edge: true }, scene: null, standIn: 'A full-screen poster · ship travel (#269) mounts it in the stage, under the bar' },
  large: { caption: 'Largest text (200%) · 320 × 568', shell: own, scene: { ...room, active: SELF }, sizes: ['320x568'], text: 200 },
  // 0.2.9: while reconnecting, the target bar stays below the banner, so its Cancel (local, 0.2.7) stays in reach.
  'target-stale': { caption: 'Choosing a target while reconnecting · the bar under the banner', shell: { ...own, status: 'stale', bar: reconnectingBar({ round: 3, ...player }), banner: { kind: 'reconnecting' }, target: { icon: 'rescue', title: 'Rescue', sub: 'Choose a player · in your room' }, chip: { id: 'other-rooms', label: 'Other rooms · 1', icon: 'board' } }, scene: { ...room, status: 'stale', active: SELF, control: null, targets: { seats: [3, 6, 8], picked: null } } },
  // 0.2.9: the Largest text on the two phones: Cancel under the bar's words, and the chip's label wrapping, whole.
  'target-large': { caption: 'Choosing a target at the Largest text (200%)', shell: { ...own, target: { icon: 'move', title: 'Move within Room A', sub: 'Choose an empty position · or another room on the Board' }, chip: { id: 'move-board', label: 'Other rooms on the Board', icon: 'board', tone: 'paper' } }, scene: { ...room, active: SELF, control: null }, sizes: ['390x844', '430x932'], text: 200 },
  // 0.2.10, the phase bars: a state for each row of the words table that dark, stale and poster above don't draw, each
  // bar from phase-bars.mjs. The deciding player's own bar comes with their sheet, whose content is a stand-in.
  before: { caption: 'Before turns · an Officer, no block yet', shell: { viewer: SELF, versions, bar: phase('PRE_TURN', { hasOfficer: true, remainingMs: 12000 }), tabs: tabs() }, scene: idle },
  'before-start': { caption: 'Before turns · a block shown, or no Officer', shell: { viewer: SELF, versions, bar: phase('PRE_TURN', { hasOfficer: true, blocked: true, remainingMs: 9000 }), tabs: tabs() }, scene: idle },
  block: { caption: 'Before turns · the Officer’s own phone', shell: { viewer: SELF, versions, bar: phase('PRE_TURN', { own: true, hasOfficer: true, remainingMs: 11000 }), tabs: tabs(),
    sheet: { id: 'block', title: 'Block movement', sub: 'Optional · once a round', detent: 'large', close: false, actions: [{ id: 'skip', label: 'Skip' }, { id: 'block', label: 'Block Gus', kind: 'primary', icon: 'block' }] } },
    scene: { ...idle, control: null }, content: sheetStandIn('The Officer’s choice · the office decisions component (sheet 40)') },
  appointment: { caption: 'Officer appointment · everyone else, never amber', shell: { viewer: SELF, versions, bar: phase('OFFICER_APPOINTMENT', { chooser: { name: 'Ben' }, round: 2, remainingMs: 9000 }), tabs: tabs() }, scene: idle },
  appoint: { caption: 'Officer appointment · the Captain’s own phone', shell: { viewer: SELF, versions, bar: phase('OFFICER_APPOINTMENT', { own: true, round: 2, remainingMs: 22000 }), tabs: tabs(),
    sheet: { id: 'appoint', title: 'Choose your Officer', detent: 'large', close: false, actions: [{ id: 'appoint', label: 'Appoint Cleo', kind: 'primary', icon: 'officer' }] } },
    scene: { ...idle, control: null }, content: sheetStandIn('The Captain’s choice · the office decisions component (sheet 40)') },
  // The lit Blackout's line counts down: two moments a second apart, whose bars the check compares box for box.
  lit: { caption: 'Blackout · lit, lights out in 0:03', shell: { viewer: SELF, versions, bar: phase('BLACKOUT', { lightsOutMs: 3000, remainingMs: 13000 }), tabs: tabs() }, scene: idle },
  'lit-next': { caption: 'Blackout · lit, a second later', shell: { viewer: SELF, versions, bar: phase('BLACKOUT', { lightsOutMs: 2000, remainingMs: 12000 }), tabs: tabs() }, scene: idle },
  synchronized: { caption: 'Ship synchronized · a ring, never amber, ⋮ only', shell: { viewer: SELF, versions, bar: phase('BLACKHOLE_PRESENTATION', { round: 4, remainingMs: 4000, durationMs: 6000 }), tabs: null, edge: true }, scene: null, standIn: 'The six seconds after a Sync · its film mounts in the stage, under the bar (sheet 44)' },
  'course-own': { caption: 'Setting course · the Captain’s own phone', shell: { viewer: SELF, versions, bar: phase('NAV_SETTING', { office: 'captain', remainingMs: 9000 }), tabs: tabs(),
    sheet: { id: 'navigation', title: 'Navigation', sub: 'Only the Captain and Officer see this', detent: 'large', close: false } },
    scene: { ...idle, control: null }, content: sheetStandIn('The route · the office decisions component (sheet 41)') },
  moved: { caption: 'The ship moved · no clock', shell: { viewer: SELF, versions, bar: movedBar({ round: 3, ...player }), tabs: null, edge: true }, scene: null, standIn: 'Ship travel’s still (#269) · in the stage, under the bar' },
  loading: { caption: 'Loading the ship · before the match', shell: { viewer: SELF, versions, bar: loadingBar({ index: 3, total: 5 }), tabs: null, backdrop: 'canvas' }, scene: null, standIn: 'The rooms’ pictures loading (sheet 45)' },
  closed: { caption: 'That phase closed · the toast', shell: { ...own, bar: turnBar(SELF, { timer: seconds(0) }), toast: phaseClosedToast({ id: 'phase-3-turn-4' }) }, scene: { ...room, active: SELF } },
  'phase-large': { caption: 'A phase bar at the Largest text (200%) · 320 × 568', shell: { viewer: SELF, versions, bar: phase('OFFICER_APPOINTMENT', { own: true, round: 2, remainingMs: 22000 }), tabs: tabs() }, scene: idle, sizes: ['320x568'], text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onCancelTarget', 'onChip', 'onRetry', 'onSheetAction', 'onSheetBack', 'onSheetClose'].map(n => [n, record(n)]));

/** A phone at a development size, the shell in it and the room scene in the shell's stage. */
function phone(sizeKey, stateKey) {
  const size = PREVIEW_SIZES[sizeKey], state = PREVIEW_STATES[stateKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null;
    const shell = mountPhoneShell(frame, { ...state.shell, insets: size.insets }, { ...handlers,
      onLayout: layout => scene?.update({ size: layout.stage }) });
    if (state.scene) {
      scene = mountRoomScene(shell.stage, { ...state.scene, size: shell.layout().stage }, {});
      if (state.then) scene.update(state.then);
      // A fixed moment is a still picture: the voyage and the crew hold where they are.
      if (at !== null) scene.suspend();
    } else if (state.standIn) {
      const stand = document.createElement('div');
      stand.className = 'pv-stand-in';
      stand.textContent = state.standIn;
      shell.stage.append(stand);
    }
    if (state.content && shell.sheetBody) state.content.fill(shell.sheetBody);
    if (state.cover) {
      const card = document.createElement('div');
      card.className = 'pv-cover-stand-in';
      card.textContent = state.cover;
      shell.slot('cover').append(card);
    }
    return { shell, scene };
  } };
}

const mounted = [];
let probe = null, agree = null;
if (params.get('probe') || params.get('agree')) {
  document.body.classList.add('pv-single');
  const run = params.get('probe')
    ? import('./probe.mjs').then(m => m.runPhoneShellProbe({ sizes: PREVIEW_SIZES, versions, person, room }))
    : import('./agree.mjs').then(m => m.runPhoneShellAgreement({ size: PREVIEW_SIZES['390x844'], versions, person }));
  const outcome = document.fonts.ready.then(() => run).catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
  if (params.get('probe')) probe = outcome; else agree = outcome;
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'own', state = PREVIEW_STATES[stateKey];
  const sizeKey = params.get('size') ?? state?.sizes?.[0] ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !state) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  if (state.text && !params.get('text')) document.documentElement.style.fontSize = `${state.text}%`;
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Phone shell · preview</h1><p>The runtime component, with the room scene in its stage: Room B, seen by Player 4. ${FIXTURE_LABEL}. A sheet’s content and the capsule are labelled stand-ins. Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [stateKey, state] of Object.entries(PREVIEW_STATES)) {
    if (state.text) continue;
    for (const sizeKey of state.sizes ?? ['390x844', '430x932']) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${state.caption}<small>${sizeKey.replace('x', ' × ')} · state=${stateKey}</small>`;
      const p = phone(sizeKey, stateKey);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__phoneShell = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};

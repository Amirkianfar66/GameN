// mothership:dev-only
//
// The screen registry: every screen of the pack, each a function (root, params) that draws one state.
// The builders live in screens-*.mjs by flow; this module holds the game shell they share and the
// prototype's flows.

import { h, ic, topBar, tabs, caption, pill } from './ui.mjs';
import { paintRoom, paintCapsule, ROOM_NAMES, BOARD_ROOMS } from './art.mjs';
import { ROSTER, SELF, board, ROOM_FIXTURES, seatOf } from './fixtures.mjs';

/** Measures the phone and its bars once they are in the document. */
export function measure(root) {
  return {
    width: root.clientWidth, height: root.clientHeight,
    top: root.querySelector('.tb')?.offsetHeight ?? 0,
    bottom: root.querySelector('.tabs')?.offsetHeight ?? 0,
  };
}

/** The default turn bar: the active player's portrait and name, Promises, the round, the time and ⋮. */
export function turnBar({ active = 7, round = 3, seconds = 42, ...bar } = {}) {
  const who = seatOf(active);
  return topBar({ kind: 'turn', who, self: active === SELF, round, seconds, ...bar });
}

/**
 * The game shell: a scene under translucent bars, then overlays, a sheet and the tabs.
 * cfg.scene: { kind: 'room'|'board', room, fixture, ...paintRoom options }
 */
export function game(root, cfg) {
  const scene = h('div.scene', { 'aria-label': cfg.scene?.kind === 'board' ? 'The whole ship' : 'Your room' });
  root.append(scene);
  if (cfg.top !== null) root.append(cfg.top ?? turnBar());
  if (cfg.tabs !== null) root.append(tabs({ view: cfg.scene?.kind === 'board' ? 'board' : 'room', ...(cfg.tabs ?? {}) }));
  const dims = measure(root);
  if (cfg.scene) paintScene(scene, dims, cfg.scene);
  // In the game every sheet docks between the bars: the phase, the clock and Pass/Vote stay in view.
  for (const node of [cfg.sheet].flat().filter(Boolean)) if (cfg.tabs !== null && cfg.top !== null) node.dataset.docked = '';
  for (const node of [cfg.overlay, cfg.sheet, cfg.toast].flat().filter(Boolean)) root.insertBefore(node, root.querySelector('.tabs'));
  if (cfg.sheet && cfg.sheetOverTabs) for (const node of [cfg.sheet].flat()) root.append(node);
  return dims;
}

/** The seats a scene draws, from a room fixture and per-screen changes. */
export function seatsFor(fixture = ROOM_FIXTURES['room-a'], { roster = 9, place = {}, health = {} } = {}) {
  return board({ roster, place: { ...fixture.place, ...place }, health });
}

export function paintScene(host, dims, s) {
  const fixture = s.fixture ?? ROOM_FIXTURES[s.room ?? 'room-a'];
  const seats = s.seats ?? seatsFor(fixture, { roster: s.roster ?? 9, place: s.place, health: s.health });
  const common = { roster: s.roster ?? 9, seats, self: SELF, active: s.active === undefined ? fixture.active : s.active, offices: s.offices ?? fixture.offices,
    targets: s.targets ?? null, targetGo: s.targetGo ?? null, picked: s.picked ?? [], dimOthers: s.dimOthers ?? !!s.targets, slots: s.slots ?? null, dark: s.dark ?? false, blocked: s.blocked ?? null };
  if (s.kind === 'board') return paintBoard(host, dims, s, common);
  // The room view fills the space between the bars, framed wide (art.mjs phoneFrame).
  const between = dims.height - dims.top - dims.bottom;
  const inner = h('div', { style: { position: 'absolute', left: '0', top: `${dims.top}px`, overflow: 'hidden' } });
  host.append(inner);
  paintRoom(inner, { ...common, room: s.room, width: dims.width, height: between, cap: 46, pad: 8, fit: 'phone', ambient: s.ambient ?? true });
  if (s.label !== false) host.append(h('div.room-label', { style: { top: `${dims.top + 10}px` } }, caption(ROOM_NAMES[s.room])));
  if (s.veil) host.append(h('div.scene-veil', { style: { background: s.veil } }));
}

/** The whole ship: the five rooms and the private-talk capsule, in the board's own arrangement. */
function paintBoard(host, dims, s, common) {
  const gap = 6, x0 = 6, y0 = dims.top + 6, w = dims.width - 12, hAvail = dims.height - dims.top - dims.bottom - 12;
  const rowH = [0.25, 0.41, 0.34].map(f => Math.floor((hAvail - 2 * gap) * f));
  const half = Math.floor((w - gap) / 2);
  const commandW = Math.floor((w - gap) * 0.64);
  const boxes = {
    'command-room': [x0, y0, commandW, rowH[0]],
    capsule: [x0 + commandW + gap, y0, w - commandW - gap, rowH[0]],
    'room-a': [x0, y0 + rowH[0] + gap, half, rowH[1]],
    'room-b': [x0 + half + gap, y0 + rowH[0] + gap, w - half - gap, rowH[1]],
    hospital: [x0, y0 + rowH[0] + rowH[1] + 2 * gap, half, rowH[2]],
    jail: [x0 + half + gap, y0 + rowH[0] + rowH[1] + 2 * gap, w - half - gap, rowH[2]],
  };
  const own = common.seats.find(x => x.seat === SELF);
  for (const room of BOARD_ROOMS) {
    const [left, top, width, height] = boxes[room];
    const panel = h('section.board-panel', { 'aria-label': ROOM_NAMES[room], style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }, 'data-current': own?.location === ROOM_NAMES[room] ? '' : null });
    const inner = h('div', { style: { position: 'absolute', inset: '0' } });
    panel.append(inner);
    host.append(panel);
    paintRoom(inner, { ...common, room, width, height, cap: 30, pad: 4, compact: true, slots: s.slotsByRoom?.[room] ?? null });
    panel.append(h('div.room-label', caption(ROOM_NAMES[room])));
    if (own?.location === ROOM_NAMES[room]) panel.append(h('span.here', pill('You', { icon: 'self', tone: 'accent' })));
  }
  const [left, top, width, height] = boxes.capsule;
  const cap = h('section.board-panel', { 'aria-label': 'Private talk', style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` } });
  const inner = h('div', { style: { position: 'absolute', inset: '0' } });
  cap.append(inner);
  paintCapsule(inner, { width, height, pair: s.talk ?? [], seats: common.seats, busy: !!s.talk, self: SELF });
  cap.append(h('div.room-label', caption('Talk')));
  host.append(cap);
}

// ── The registry ────────────────────────────────────────────────────────
import { ENTRY_SCREENS } from './screens-entry.mjs';
import { PREGAME_SCREENS } from './screens-pregame.mjs';
import { GAME_SCREENS } from './screens-game.mjs';
import { VOTE_SCREENS } from './screens-vote.mjs';
import { MORE_SCREENS } from './screens-more.mjs';

let merged = null;
/** Every screen by name. Built on first use: the screen modules import this module's shell. */
export function screenRegistry() {
  merged ??= Object.freeze({ ...ENTRY_SCREENS, ...PREGAME_SCREENS, ...GAME_SCREENS, ...VOTE_SCREENS, ...MORE_SCREENS });
  return merged;
}

/** The clickable prototype's flows (each step's address starts a state the phone can click on from). */
export const FLOWS = Object.freeze([
  { title: 'Start', steps: [
    { label: 'Intro, 2 seconds', go: 's=intro' },
    { label: 'Main menu', go: 's=menu' },
    { label: 'Host: setup', go: 's=host-setup' },
    { label: 'Host: lobby', go: 's=host-lobby&state=requests' },
    { label: 'Join', go: 's=join' },
    { label: 'Recover', go: 's=recover' },
  ] },
  { title: 'Before Round 1', steps: [
    { label: 'Choose a character', go: 's=choose&state=open' },
    { label: 'Your role, 30 seconds', go: 's=role&t=4000' },
    { label: 'Boarding, 10 seconds', go: 's=boarding&t=1500' },
  ] },
  { title: 'The tab bar: what each button shows', steps: [
    { label: 'Your turn · start here', go: 's=room&room=room-a&state=own' },
    { label: 'Board', go: 's=board' },
    { label: 'Actions', go: 's=actions&role=Doctor&active=4' },
    { label: 'Pass', go: 's=room&room=room-a&state=pass' },
    { label: 'Card', go: 's=card&role=Doctor' },
    { label: 'Panels', go: 's=panels' },
  ] },
  { title: 'The top bar: Promises and Settings', steps: [
    { label: 'Your room · start here', go: 's=room&room=room-a' },
    { label: 'Promises', go: 's=promises&state=list' },
    { label: 'Settings (⋮)', go: 's=settings' },
  ] },
  { title: 'Playing', steps: [
    { label: 'Your room', go: 's=room&room=room-a' },
    { label: 'Whole board', go: 's=board' },
    { label: 'Actions', go: 's=actions&role=Doctor&active=4' },
    { label: 'Card', go: 's=card&role=Doctor' },
    { label: 'Panels', go: 's=panels' },
    { label: 'Private talk', go: 's=talk&stage=talk' },
  ] },
  { title: 'Voting and results', steps: [
    { label: 'Jail vote', go: 's=vote&kind=jail' },
    { label: 'Captain election', go: 's=vote&kind=captain' },
    { label: 'Result', go: 's=result&outcome=PLAYER_JAILED' },
    { label: 'Blackout', go: 's=blackout&state=lit' },
  ] },
  { title: 'End', steps: [
    { label: 'Match result', go: 's=end&winner=Blue' },
  ] },
]);

export { ROSTER, SELF };

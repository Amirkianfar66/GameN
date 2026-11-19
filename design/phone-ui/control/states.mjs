// mothership:dev-only
//
// The bars and icons control (control.mjs): its switches, its presets, and the phone shell's input for a
// set of switches. Every bar here is drawn by the runtime component (../components/phone-shell), and every
// phase bar's words come from ../components/phone-shell/phase-bars.mjs, as in the game. The people and
// places are the phone pack's synthetic fixtures (../prototype/fixtures.mjs): invented names and seats.
// Nothing here is a rule: a set of switches may be a combination the game never shows.

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { phaseBar, movedBar, loadingBar, reconnectingBar, phaseClosedToast } from '../components/phone-shell/phase-bars.mjs';
import { ROOM_NAMES } from '../components/room-scene/room-scene.mjs';
import { ROOM_ART_RELEASE } from '../components/room-scene/room-art.mjs';
import { ROOM_FIXTURES, SELF, board, seatOf } from '../prototype/fixtures.mjs';

/** A match pinned to the crew release, as the game's crew runtime needs to draw the approved crew. */
export const VERSIONS = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

const fixture = ROOM_FIXTURES['room-b'];
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-b']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));

/**
 * The switches, in the order the control shows them. `when` hides a switch that has no effect for the
 * other switches' values. The first option of each is its value in BASE unless BASE says otherwise.
 */
export const SWITCHES = Object.freeze([
  { key: 'bar', group: 'Top bar', label: 'Top bar', options: [
    ['turn', 'Another player’s turn'], ['own', 'Your turn'], ['vote', 'Jail vote'], ['result', 'Vote result · ring'],
    ['before', 'Before turns'], ['before-start', 'Before turns · block shown'], ['block-own', 'Before turns · the Officer’s own'],
    ['appointment', 'Officer appointment'], ['appoint-own', 'Officer appointment · the Captain’s own'],
    ['lit', 'Blackout · lights on'], ['dark', 'Blackout · dark'], ['synchronized', 'Ship synchronized · ring'],
    ['course', 'Setting course'], ['course-own', 'Setting course · the Captain’s own'], ['moved', 'The ship moved'],
    ['talk', 'Private talk'], ['loading', 'Loading the ship'], ['reconnecting', 'Reconnecting'], ['none', 'No top bar'],
  ] },
  // The names in the bar: the cast's own, or the names the game gives when none is chosen (the bar's fit, draft).
  { key: 'names', group: 'Top bar', label: 'Names', options: [['cast', 'The cast’s names'], ['crew', '“Crew 6”, “Crew 1”'], ['player', '“Player 10”, “Crew 10”']] },
  { key: 'clock', group: 'Top bar', label: 'Clock', options: [['42', '0:42'], ['8', '0:08 · the last 10 s'], ['0', '0:00'], ['run', 'Counting down']] },
  { key: 'promises', group: 'Top bar', label: 'Promises', options: [['1', '1 waiting'], ['0', 'None waiting'], ['3', '3 waiting'], ['off', 'Not shown']] },
  { key: 'tabs', group: 'Bottom bar', label: 'Bottom bar', options: [['game', 'Game tabs'], ['talk', 'Private talk’s two buttons'], ['none', 'None']] },
  { key: 'hero', group: 'Bottom bar', label: 'Round button', when: c => c.tabs === 'game', options: [
    ['pass-off', 'Pass · unavailable'], ['pass', 'Pass · ready'], ['pass-busy', 'Pass · sending'],
    ['vote', 'Vote · ready'], ['vote-off', 'Vote · unavailable'], ['voted', 'Voted'],
  ] },
  { key: 'open', group: 'Bottom bar', label: 'Open tab', when: c => c.tabs === 'game', options: [['none', 'None'], ['actions', 'Actions'], ['card', 'Card'], ['panels', 'Panels']] },
  // Shell 0.3.0 (the owner, 18 November 2026): the Card tab draws the player's own character; with none, the card icon.
  { key: 'me', group: 'Bottom bar', label: 'Card tab', when: c => c.tabs === 'game', options: [['portrait', 'My character'], ['icon', 'No character yet · the card’s tile'], ['other', 'My character · another colour']] },
  { key: 'view', group: 'Bottom bar', label: 'First tab', when: c => c.tabs === 'game', options: [['room', 'Board (you are in the room view)'], ['board', 'Room (you are on the Board)']] },
  { key: 'actionsTab', group: 'Bottom bar', label: 'Actions tab', when: c => c.tabs === 'game', options: [['on', 'Available'], ['off', 'Unavailable · eliminated']] },
  { key: 'badge', group: 'Bottom bar', label: 'Badge', when: c => c.tabs === 'game', options: [['none', 'None'], ['actions', '1 on Actions'], ['panels', '2 on Panels']] },
  { key: 'talkOpen', group: 'Bottom bar', label: 'Open button', when: c => c.tabs === 'talk', options: [['none', 'None'], ['promises', 'Promises'], ['my-card', 'My card']] },
  { key: 'target', group: 'Other bars', label: 'Target bar', options: [['none', 'None'], ['rescue', 'Rescue · with Cancel'], ['move', 'Move · long words'], ['final', 'Fixed position · no Cancel']] },
  { key: 'chip', group: 'Other bars', label: 'Chip', options: [['off', 'None'], ['on', 'Other rooms · 1']] },
  { key: 'banner', group: 'Other bars', label: 'Banner', options: [['none', 'None'], ['reconnecting', 'Connection lost · Retry'], ['out', 'You’re out']] },
  { key: 'toast', group: 'Other bars', label: 'Toast', options: [['none', 'None'], ['closed', 'That phase closed · choices cleared'], ['short', 'Copied'], ['receipt', 'Registered · the receipt after a choice']] },
  { key: 'sheet', group: 'Sheets', label: 'Sheet', options: [
    ['none', 'None'], ['pass', 'Pass your turn? · two buttons'], ['actions', 'Actions'], ['card', 'Your role · a head button'],
    ['block', 'Block movement · tall, two buttons'], ['appoint', 'Choose your Officer · one button'],
    ['navigation', 'Navigation · no Close'], ['host', 'Host controls · Back and a warning button'],
    ['offer', 'An offer · a long title, a note, two buttons'],
  ] },
  { key: 'status', group: 'Phone', label: 'Connection', options: [['live', 'Live'], ['stale', 'Reconnecting · dimmed'], ['concealed', 'Concealed · the phone put away']] },
  { key: 'edge', group: 'Phone', label: 'Room area', options: [['off', 'Between the bars'], ['on', 'Edge to edge · a film or poster']] },
]);

/** Each switch's value before a preset changes it: another player's turn, in the room view. */
export const BASE = Object.freeze({
  bar: 'turn', names: 'cast', clock: '42', promises: '1', tabs: 'game', hero: 'pass-off', open: 'none', me: 'portrait', view: 'room', actionsTab: 'on', badge: 'none',
  talkOpen: 'none', target: 'none', chip: 'off', banner: 'none', toast: 'none', sheet: 'none', status: 'live', edge: 'off',
});

const own = { bar: 'own', hero: 'pass' };
const film = { tabs: 'none', edge: 'on' };

/**
 * The presets, by group. `crop` says which part of the phone a strip shows: the top bar, the bottom bar,
 * what lies over the room, the chip, a sheet, or the whole phone. `sheet` is the phone pack's sheet number.
 */
export const GROUPS = Object.freeze([
  { id: 'top', route: 'top-bar', title: 'Top bar', note: 'The room label side, Promises, ⋮, the round and the clock.', crop: 'top', presets: [
    ['turn', 'Another player’s turn', '07', {}],
    ['own', 'Your turn', '07', own],
    ['urgent', 'Your turn · the last 10 seconds', '07', { ...own, clock: '8' }],
    ['promises-3', 'Three promises waiting', '07', { promises: '3' }],
    ['vote', 'Jail vote', '38', { bar: 'vote', promises: '0', hero: 'vote' }],
    ['result', 'Vote result · the clock is a ring, ⋮ only', '38', { bar: 'result', promises: 'off', hero: 'vote-off' }],
    ['before', 'Before turns', '40', { bar: 'before', promises: '0' }],
    ['before-start', 'Before turns · a block shown', '40', { bar: 'before-start', promises: '0' }],
    ['block-own', 'Before turns · the Officer’s own phone', '40', { bar: 'block-own', promises: '0' }],
    ['appointment', 'Officer appointment · everyone else', '40', { bar: 'appointment', promises: '0' }],
    ['appoint-own', 'Officer appointment · the Captain’s own phone', '40', { bar: 'appoint-own', promises: '0' }],
    ['lit', 'Blackout · lights on', '30', { bar: 'lit', promises: '0' }],
    ['dark', 'Blackout · dark', '30', { bar: 'dark', promises: '0' }],
    ['synchronized', 'Ship synchronized · a ring', '41', { bar: 'synchronized', promises: 'off', ...film }],
    ['course', 'Setting course', '41', { bar: 'course', promises: '0' }],
    ['course-own', 'Setting course · the Captain’s own phone', '41', { bar: 'course-own', promises: '0' }],
    ['moved', 'The ship moved · no clock', '41', { bar: 'moved', promises: '0', ...film }],
    ['talk', 'Private talk · the pair', '25', { bar: 'talk', promises: '0', tabs: 'talk' }],
    ['loading', 'Loading the ship', '45', { bar: 'loading', promises: 'off', tabs: 'none' }],
    ['reconnecting', 'Reconnecting', '45', { bar: 'reconnecting', promises: '0', status: 'stale' }],
  ] },
  { id: 'bottom', route: 'bottom-bar', title: 'Bottom bar', note: 'The tabs, the round button as Pass, Vote or Voted, and the private talk’s two buttons. Card is the last tab and shows the player’s own character.', crop: 'bottom', presets: [
    ['pass', 'Pass · ready', '27', own],
    ['pass-off', 'Pass · unavailable', '27', {}],
    ['pass-busy', 'Pass · sending', '27', { ...own, hero: 'pass-busy' }],
    ['tab-vote', 'Vote · ready', '38', { bar: 'vote', promises: '0', hero: 'vote' }],
    ['tab-vote-off', 'Vote · unavailable', '38', { bar: 'result', promises: 'off', hero: 'vote-off' }],
    ['voted', 'Voted', '38', { bar: 'vote', promises: '0', hero: 'voted' }],
    ['open-actions', 'Actions open · an amber ring round its tile', '28', { ...own, open: 'actions' }],
    ['open-card', 'Card open · an amber ring round the portrait', '31', { ...own, open: 'card' }],
    ['card-icon', 'No character yet · the Card tab draws the card’s tile', '08', { ...own, me: 'icon' }],
    ['open-panels', 'Panels open', '32', { ...own, open: 'panels' }],
    ['on-board', 'On the Board · the first tab says Room', '27', { view: 'board' }],
    ['badge', 'A badge on Panels', '27', { badge: 'panels' }],
    ['out-tabs', 'Eliminated · Actions unavailable', '44', { actionsTab: 'off' }],
    ['talk-buttons', 'Private talk · Promises and My card', '25', { bar: 'talk', promises: '0', tabs: 'talk' }],
    ['talk-promises', 'Private talk · Promises open', '25', { bar: 'talk', promises: '0', tabs: 'talk', talkOpen: 'promises' }],
  ] },
  { id: 'over', route: 'other-bars', title: 'Other bars', note: 'What lies over the room: the target bar with Cancel, both banners, the chip and the toast.', crop: 'over', presets: [
    ['target', 'Choosing a target · Cancel in the bar', '29', { ...own, target: 'rescue' }],
    ['target-move', 'Choosing a position · long words', '29', { ...own, target: 'move' }],
    ['target-final', 'A fixed position · no Cancel', '30', { bar: 'dark', promises: '0', target: 'final' }],
    ['chip', 'The chip · other rooms', '29', { ...own, target: 'rescue', chip: 'on' }, 'chip'],
    ['banner-lost', 'Connection lost · Retry', '45', { bar: 'reconnecting', promises: '0', status: 'stale', banner: 'reconnecting' }],
    ['target-lost', 'Choosing a target while reconnecting', '45', { bar: 'reconnecting', promises: '0', status: 'stale', banner: 'reconnecting', target: 'rescue' }],
    ['banner-out', 'You’re out', '44', { banner: 'out', actionsTab: 'off' }],
    ['toast', 'Toast · that phase closed', '45', { ...own, clock: '0', toast: 'closed' }],
  ] },
  { id: 'sheet', route: 'sheets', title: 'Sheets', note: 'The glass sheet’s frame: title, line, Back, Close, head and footer buttons. The content inside is other builders’.', crop: 'sheet', presets: [
    ['sheet-pass', 'Pass asks once · two buttons', '27', { ...own, sheet: 'pass' }],
    ['sheet-actions', 'Actions', '28', { ...own, open: 'actions', sheet: 'actions' }],
    ['sheet-card', 'Your role · Hide card in the head', '31', { ...own, open: 'card', sheet: 'card' }],
    ['sheet-block', 'Block movement · tall, two buttons', '40', { bar: 'block-own', promises: '0', sheet: 'block' }],
    ['sheet-appoint', 'Choose your Officer · one button', '40', { bar: 'appoint-own', promises: '0', sheet: 'appoint' }],
    ['sheet-navigation', 'Navigation · no Close', '41', { bar: 'course-own', promises: '0', sheet: 'navigation' }],
    ['sheet-host', 'Host controls · Back and a warning button', '15', { sheet: 'host' }],
    ['sheet-offer', 'An offer · a long title, a note, two buttons', '33', { sheet: 'offer' }],
    ['sheet-lost', 'A sheet while reconnecting · below the banner', '45', { bar: 'reconnecting', promises: '0', status: 'stale', banner: 'reconnecting', sheet: 'host' }],
  ] },
  { id: 'whole', route: 'whole-phone', title: 'Whole phone', note: 'States where the bars leave, or the whole phone changes.', crop: 'whole', presets: [
    ['concealed', 'Concealed · the phone put away', '45', { ...own, status: 'concealed' }],
    ['film', 'No top bar · a film edge to edge', '18', { bar: 'none', promises: 'off', status: 'stale', banner: 'reconnecting', ...film }],
    ['poster', 'Edge to edge under the bar · no tabs', '41', { bar: 'course', promises: '0', ...film }],
  ] },
].map(group => Object.freeze({ ...group, presets: Object.freeze(group.presets.map(([key, label, sheet, change, crop]) =>
  Object.freeze({ key, label, sheet, group: group.id, groupTitle: group.title, crop: crop ?? group.crop, controls: Object.freeze({ ...BASE, ...change }) }))) })));

export const PRESETS = Object.freeze(GROUPS.flatMap(group => group.presets));

/**
 * A draft of a look, for the owner's look before anything is checked: the toast over an open sheet. Today it lies
 * across a tall sheet's head; in the draft it sits under the head. The last two states are ones where it keeps its place.
 */
/**
 * DRAFT (shell 0.3.4): the top bar's words, which were cut with the game's own names. Six bars, each drawn at the
 * width and the text size the view's switches choose.
 */
export const BAR_FIT_DRAFT = Object.freeze([
  ['pair-crew', 'A private talk · “Crew 6 + Crew 1”', { bar: 'talk', promises: '0', tabs: 'talk', names: 'crew' }],
  ['pair-player', 'A private talk · “Player 6 + Player 10”', { bar: 'talk', promises: '0', tabs: 'talk', names: 'player' }],
  ['own-crew', 'Your turn · “Player 6 · Crew 6”', { ...own, names: 'crew' }],
  ['own-player', 'Your turn · “Player 10 · Crew 10”', { ...own, names: 'player' }],
  ['turn-player', 'Another player’s turn · “Crew 10” over “Player 10 · Turn”', { names: 'player' }],
  ['own-short', 'Your turn · a short name, “Player 4 · Dev”', { ...own }],
].map(([key, label, change]) => Object.freeze({ key, label, sheet: '07', group: 'top', groupTitle: 'Top bar', crop: 'top', controls: Object.freeze({ ...BASE, ...change }) })));

export const TOAST_DRAFT = Object.freeze([
  ['role', 'A tall sheet · the receipt after a choice', { ...own, open: 'card', sheet: 'card', toast: 'receipt' }],
  ['host', 'A tall sheet with Back · the receipt', { sheet: 'host', toast: 'receipt' }],
  ['copied', 'A tall sheet · a short toast', { ...own, open: 'card', sheet: 'card', toast: 'short' }],
  ['lost', 'Connection lost · no sheet · the toast under the banner', { bar: 'reconnecting', promises: '0', status: 'stale', banner: 'reconnecting', toast: 'short' }],
  ['lost-sheet', 'Connection lost · a tall sheet · the toast under the sheet’s title', { bar: 'reconnecting', promises: '0', status: 'stale', banner: 'reconnecting', sheet: 'host', toast: 'short' }],
  ['low', 'A low sheet · the toast keeps its place', { ...own, sheet: 'pass', toast: 'receipt' }],
  ['none', 'No sheet · the toast keeps its place', { ...own, clock: '0', toast: 'closed' }],
].map(([key, label, change]) => Object.freeze({ key, label, sheet: '45', group: 'sheet', groupTitle: 'Sheets', crop: 'toast', controls: Object.freeze({ ...BASE, ...change }) })));

/**
 * A second draft: a sheet with a long title, a note and two footer buttons. On a small phone at the Largest text its
 * head and footer leave the body a line or two; in the draft the footer then scrolls with the body.
 */
export const SHEET_DRAFT = Object.freeze({ key: 'offer', label: 'An offer · a long title, a note, two buttons', sheet: '33', group: 'sheet', groupTitle: 'Sheets', crop: 'phone',
  controls: Object.freeze({ ...BASE, sheet: 'offer' }) });

/**
 * The owner's picture of the bottom bar (18 November 2026; approved the same day, shell 0.3.2): every tab's icon as a
 * painted tile like the character's portrait, and the round button's icon painted. The bottom bar's states, as the
 * bar was beside as it is.
 */
export const TILES_DRAFT = Object.freeze([
  ['own', 'Your turn · Pass ready', own],
  ['turn', 'Another player’s turn · Pass unavailable', {}],
  ['actions', 'Actions open', { ...own, open: 'actions' }],
  ['panels', 'Panels open', { ...own, open: 'panels' }],
  ['card', 'Card open', { ...own, open: 'card' }],
  ['board', 'On the Board · the first tab says Room', { view: 'board' }],
  ['badge', 'A badge on Panels', { badge: 'panels' }],
  ['vote', 'Voting · Vote replaces Pass', { bar: 'vote', promises: '0', hero: 'vote' }],
  ['voted', 'Ballot registered', { bar: 'vote', promises: '0', hero: 'voted' }],
  ['busy', 'Pass · sending', { ...own, hero: 'pass-busy' }],
  ['out', 'Eliminated · Actions unavailable', { actionsTab: 'off' }],
  ['no-character', 'No character yet · the Card tab is a tile too', { ...own, me: 'icon' }],
  ['dark', 'Blackout · dark · no one’s picture is shown', { bar: 'dark', promises: '0' }],
  ['other', 'A player with another character · the tiles stay orange', { me: 'other' }],
].map(([key, label, change]) => Object.freeze({ key, label, sheet: '08', group: 'bottom', groupTitle: 'Bottom bar', crop: 'bottom', controls: Object.freeze({ ...BASE, ...change }) })));

/**
 * Sheet 08's nine states (Bottom navigation), in the sheet's order, for the Card tab's before and after: the
 * owner's 18 November 2026 decision moved Card to the last place and gave it the player's own character.
 */
export const SHEET_08 = Object.freeze([
  ['turn', 'Room view · another player’s turn', {}],
  ['own', 'Room view · your turn', own],
  ['board', 'Board view · the first tab says Room', { view: 'board' }],
  ['actions', 'Actions open', { ...own, open: 'actions' }],
  ['card', 'Card open', { open: 'card' }],
  ['panels', 'Panels open', { open: 'panels' }],
  ['vote', 'Voting · Vote replaces Pass', { bar: 'vote', promises: '0', hero: 'vote' }],
  ['voted', 'Ballot registered', { bar: 'vote', promises: '0', hero: 'voted' }],
  ['out', 'Eliminated · Actions unavailable', { actionsTab: 'off' }],
].map(([key, label, change]) => Object.freeze({ key, label, sheet: '08', group: 'bottom', groupTitle: 'Bottom bar', crop: 'bottom', controls: Object.freeze({ ...BASE, ...change }) })));
export const presetOf = key => PRESETS.find(p => p.key === key) ?? null;

/**
 * The game page's situations (the real Planet app with a practice match; the Gameplay UI builder's page), by the
 * name its address takes after "#". A bar opens the situation it is drawn in, and none where the game page has no
 * such situation: a phase bar, a lost connection, a phone put away, an eliminated player.
 */
export const GAME_STATES = Object.freeze({
  'your-turn': 'Your turn', 'their-turn': 'Another player’s turn', 'jail-vote': 'The Jail vote', 'private-talk': 'The private talk',
});
const GAME_STATE_OF_BAR = Object.freeze({ own: 'your-turn', turn: 'their-turn', vote: 'jail-vote', talk: 'private-talk' });
/** The game page's situation for these controls: { hash, label }, or null. */
export function gameStateOf(controls) {
  if (!controls || controls.status !== 'live' || controls.banner !== 'none') return null;
  const hash = GAME_STATE_OF_BAR[controls.bar] ?? null;
  return hash ? { hash, label: GAME_STATES[hash] } : null;
}
/** The game page's address, as the build was given it: only a claude.ai artifact's own address is taken. */
export const gamePageOf = value => (typeof value === 'string' && /^https:\/\/claude\.ai\/artifact\/[A-Za-z0-9]{8,64}$/.test(value) ? value : null);
/** The preset whose switches are exactly these, or null: a custom combination. */
export const matchPreset = controls => PRESETS.find(p => Object.keys(BASE).every(k => p.controls[k] === controls[k])) ?? null;

const SHEETS = Object.freeze({
  pass: { frame: { id: 'pass', title: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', close: false, actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'pass', label: 'Pass', kind: 'primary', icon: 'pass' }] }, content: null },
  actions: { frame: { id: 'actions', title: 'Actions', sub: 'Doctor · Round 3' }, content: 'The Actions tiles · the Gameplay UI builder’s part (sheet 28)' },
  card: { frame: { id: 'card', title: 'Your role', sub: 'Only on this phone', detent: 'large', head: [{ id: 'hide', icon: 'hide', label: 'Hide card' }] }, content: 'The role card · its own component (sheet 31)' },
  block: { frame: { id: 'block', title: 'Block movement', sub: 'Optional · once a round', detent: 'large', close: false, actions: [{ id: 'skip', label: 'Skip' }, { id: 'block', label: 'Block Gus', kind: 'primary', icon: 'block' }] }, content: 'The Officer’s choice · the office decisions component (sheet 40)' },
  appoint: { frame: { id: 'appoint', title: 'Choose your Officer', detent: 'large', close: false, actions: [{ id: 'appoint', label: 'Appoint Cleo', kind: 'primary', icon: 'officer' }] }, content: 'The Captain’s choice · the office decisions component (sheet 40)' },
  navigation: { frame: { id: 'navigation', title: 'Navigation', sub: 'Only the Captain and Officer see this', detent: 'large', close: false }, content: 'The route · the office decisions component (sheet 41)' },
  // A long title, a line under it, Back and Close, and two footer buttons: at the Largest text on a small phone the head
  // takes three lines and the buttons a row each. Its content is the Promises component's; here, a card and a note.
  offer: { frame: { id: 'offer', title: 'Offer from Fay · Player 6', sub: 'A promise · answer before the talk ends', detent: 'large', back: true, close: true,
    actions: [{ id: 'decline', label: 'Decline' }, { id: 'accept', label: 'Accept', kind: 'primary', icon: 'check' }] },
    content: 'The offer’s card · the Promises component (sheet 33)', note: 'You can accept one promise this round. An accepted promise can’t be taken back.' },
  host: { frame: { id: 'host', title: 'Host controls', close: true, back: true, detent: 'large', actions: [{ id: 'keep', label: 'Keep playing', local: true }, { id: 'abort', label: 'Abort match', kind: 'warn' }] }, content: 'Host controls · its own component (sheet 15)' },
});
/** The labelled stand-in for a sheet's content, which is another builder's component; null when the sheet has none. */
export const sheetContent = controls => SHEETS[controls.sheet]?.content ?? null;
/** The words of a note under that stand-in, where the sheet has one: plain text the content's owner would draw. */
export const sheetNote = controls => SHEETS[controls.sheet]?.note ?? null;

const TARGETS = Object.freeze({
  rescue: { icon: 'rescue', title: 'Rescue', sub: 'Choose a player · in your room' },
  move: { icon: 'move', title: 'Move within Room A', sub: 'Choose an empty position · or another room on the Board' },
  final: { icon: 'position', title: 'Position A3 fixed', sub: 'Resolves after the window · no effect shown now', cancel: false },
});
const HEROES = Object.freeze({
  pass: { mode: 'pass' }, 'pass-off': { mode: 'pass', enabled: false }, 'pass-busy': { mode: 'pass', busy: true },
  vote: { mode: 'vote' }, 'vote-off': { mode: 'vote', enabled: false }, voted: { mode: 'voted' },
});

/** The clock's seconds for a set of switches: the fixed choice, or `running`, the control's own countdown. */
export const clockSeconds = (controls, running = 42) => (controls.clock === 'run' ? running : Number(controls.clock));

/** A person under a name the game gives when none is chosen, with a character's portrait and, for seat 10, its seat. */
const named = (n, name, seat = null) => ({ ...person(n), name, ...(seat ? { seat } : {}) });
/** The bar's people under the game's own longer names (the `names` switch): a pair, the viewer on their turn, another player on theirs. */
const NAMED = Object.freeze({
  crew: { pair: [named(6, 'Crew 6'), named(1, 'Crew 1')], own: named(6, 'Crew 6'), turn: named(1, 'Crew 1') },
  player: { pair: [named(6, 'Player\u00a06'), named(2, 'Player\u00a010', 'seat-10')], own: named(2, 'Crew 10', 'seat-10'), turn: named(2, 'Crew 10', 'seat-10') },
});

function barInput(c, seconds) {
  const ms = seconds * 1000;
  const mine = { promises: c.promises === 'off' ? null : { count: Number(c.promises) }, menu: {} };
  const phase = (kind, facts = {}) => phaseBar({ phase: kind, round: 3, remainingMs: ms, ...mine, ...facts });
  switch (c.bar) {
    case 'turn': return { kind: 'turn', who: NAMED[c.names]?.turn ?? person(fixture.active), self: false, round: 3, timer: { remainingMs: ms }, ...mine };
    case 'own': return { kind: 'turn', who: NAMED[c.names]?.own ?? person(SELF), self: true, round: 3, timer: { remainingMs: ms }, ...mine };
    case 'vote': return { kind: 'phase', icon: 'jail', title: 'Jail vote', sub: c.hero === 'voted' ? 'Your ballot is in' : 'Choose who goes to Jail', round: 3, timer: { remainingMs: ms }, ...mine };
    case 'result': return { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, timer: { remainingMs: 3000, ring: 0.6 }, menu: {} };
    case 'before': return phase('PRE_TURN', { hasOfficer: true });
    case 'before-start': return phase('PRE_TURN', { hasOfficer: true, blocked: true });
    case 'block-own': return phase('PRE_TURN', { own: true, hasOfficer: true });
    case 'appointment': return phase('OFFICER_APPOINTMENT', { chooser: { name: 'Ben' }, round: 2 });
    case 'appoint-own': return phase('OFFICER_APPOINTMENT', { own: true, round: 2 });
    case 'lit': return phase('BLACKOUT', { lightsOutMs: 3000, remainingMs: 13000 });
    case 'dark': return phase('BLACKOUT', { dark: true, remainingMs: 8000 });
    case 'synchronized': return phase('BLACKHOLE_PRESENTATION', { round: 4, remainingMs: 4000, durationMs: 6000 });
    case 'course': return phase('NAV_SETTING');
    case 'course-own': return phase('NAV_SETTING', { office: 'captain' });
    case 'moved': return movedBar({ round: 3, ...mine });
    case 'talk': return { kind: 'pair', pair: NAMED[c.names]?.pair ?? [person(1), person(SELF)], round: 3, timer: { remainingMs: ms }, ...mine };
    case 'loading': return loadingBar({ index: 3, total: 5 });
    case 'reconnecting': return reconnectingBar({ round: 3, ...mine });
    case 'none': return null;
    default: throw new TypeError(`No top bar ${JSON.stringify(c.bar)}`);
  }
}

function tabsInput(c) {
  if (c.tabs === 'none') return null;
  if (c.tabs === 'talk') return { variant: 'talk', open: c.talkOpen === 'none' ? null : c.talkOpen };
  return {
    variant: 'game', view: c.view, open: c.open === 'none' ? null : c.open, hero: HEROES[c.hero],
    // The viewer's own person: the Card tab draws their portrait (shell 0.3.0). None: the card icon. In the Blackout's
    // dark the game gives no one's identity, the viewer's own among them, so the tab shows the card icon there too.
    // `other`: a viewer whose character has another colour (the fixture's seat 7), for the painted tiles' draft.
    me: c.bar === 'dark' ? null : c.me === 'portrait' ? person(SELF) : c.me === 'other' ? person(7) : null,
    ...(c.actionsTab === 'off' ? { enabled: { actions: false }, reasons: { actions: 'You’re out' } } : {}),
    ...(c.badge === 'actions' ? { badges: { actions: 1 } } : c.badge === 'panels' ? { badges: { panels: 2 } } : {}),
  };
}

/**
 * The phone shell's whole input for a set of switches. Every key is given, so an update replaces what the
 * last one drew. `toastId` makes a toast show again: the shell shows each id once.
 */
export function shellInput(c, { seconds = clockSeconds(c), toastId = 'control' } = {}) {
  return {
    viewer: SELF, versions: VERSIONS, status: c.status,
    bar: barInput(c, seconds),
    tabs: tabsInput(c),
    edge: c.edge === 'on',
    backdrop: c.bar === 'loading' ? 'canvas' : 'scene',
    target: c.target === 'none' ? null : TARGETS[c.target],
    chip: c.chip === 'on' ? { id: 'other-rooms', label: 'Other rooms · 1', icon: 'board' } : null,
    banner: c.banner === 'none' ? null : { kind: c.banner },
    toast: c.toast === 'closed' ? phaseClosedToast({ id: toastId }) : c.toast === 'short' ? { id: toastId, text: 'Copied', icon: 'copy' }
      // The game's receipt after a registered choice (Frontend's planetRegistrationText), which Actions and Promises show over their sheets.
      : c.toast === 'receipt' ? { id: toastId, text: 'Registered. Waiting for the authoritative view.', icon: 'check' } : null,
    sheet: SHEETS[c.sheet]?.frame ?? null,
  };
}

/** Whether a set of switches shows the room at all: a private talk, a film, a poster and loading show something else. */
const NO_ROOM = Object.freeze({
  talk: 'The private talk’s capsule · its own component (sheet 25)',
  synchronized: 'The six seconds after a Sync · its film plays here',
  moved: 'Ship travel’s still · its own component (sheet 41)',
  loading: 'The rooms’ pictures loading (sheet 45)',
  none: 'A full-screen film · the role stage plays here',
});

/**
 * What the room area holds for a set of switches: the room scene's input (Room B, seen by Player 4, as the
 * shell's own preview draws it), or the words of a labelled stand-in where the game shows something else.
 */
export function sceneInput(c, { clock }) {
  if (NO_ROOM[c.bar]) return { standIn: NO_ROOM[c.bar] };
  if (c.edge === 'on') return { standIn: 'A full-screen poster · ship travel mounts it here, under the bar' };
  const turn = c.bar === 'own' ? SELF : c.bar === 'turn' ? fixture.active : null;
  const choosing = c.target === 'rescue';
  return { scene: {
    room: 'room-b', roster: 9, self: SELF, active: turn, versions: VERSIONS, clock, roomArt: ROOM_ART_RELEASE,
    status: c.status,
    people: people.map(p => (c.banner === 'out' && p.seat === SELF ? { ...p, health: 'Eliminated' } : p)),
    control: c.sheet !== 'none' || c.target !== 'none' || c.bar === 'dark' ? null : { id: 'windows', label: 'Windows · 2', icon: 'window' },
    ...(choosing ? { targets: { seats: [3, 6, 8], picked: null } } : {}),
  }, then: c.bar === 'dark' ? { lighting: 'dark', hold: 'blackout-1', control: null } : null };
}

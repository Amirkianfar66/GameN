// mothership:dev-only
//
// The Card sheet's preview states: one per frame the phone pack draws on sheet 31, and the states the pack
// leaves out, on the pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented names, seats
// and roles, as the review sheets use). Each state gives the shell's bar and tabs, and the component's own
// input as docs/design/components/card.md proposes it. What the server holds (the role, the knowledge) and
// Frontend's words for the resources are written out here as fixture data, standing in for them.

import { ROLE_FIXTURES, SELF, seatOf } from '../../../prototype/fixtures.mjs';

/** Frontend's role → device picture map, as the role stage's preview has it (packages/presentation planetRoleLook). */
const DEVICES = Object.freeze({ Doctor: 'cracker', Insider: 'insider', 'Blue Disabler': 'blue-disabler', Supplier: 'supplier', Undercover: 'undercover', Hacker: 'hacker', Alien: 'alien', 'Red Disabler': 'red-disabler', Engineer: 'engineer' });

/** The viewer's own card, as the role stage takes it: Player 4's character, the role's team and lines. */
export const cardOf = role => ({ role, team: ROLE_FIXTURES[role].team, facts: [...ROLE_FIXTURES[role].facts], character: seatOf(SELF).character, device: DEVICES[role] ?? null, art: 'ok' });

/** The projection's knowledge, as the pack's fixtures have it (screens-game.mjs card()). */
const KNOWLEDGE = Object.freeze({
  Doctor: { insiderSeatIds: [], knownUndercoverSeatId: null, scanResults: [] },
  Hacker: { insiderSeatIds: [], knownUndercoverSeatId: 'seat-6', scanResults: [{ round: 2, targetSeatId: 'seat-7', guess: 'Blue', matched: true, inCode: true }] },
  Insider: { insiderSeatIds: ['seat-2', 'seat-6', 'seat-8'], knownUndercoverSeatId: null, scanResults: [] },
});

/** Frontend's words for the resources, as the pack's Doctor has them (screens-game.mjs card(), 'holds'). */
const RESOURCES = Object.freeze({
  Doctor: [{ kind: 'weapons', value: '0' }, { kind: 'role-action', value: 'Available' }, { kind: 'move', value: 'Used this round' },
    { kind: 'injections', value: '2 of 2' }, { kind: 'promises', value: 'Given 0/1 · Received 1/1' }],
});

// The pack's card() screen: Gus's turn (Player 7), Round 3, 0:42, Promises, the Card tab open.
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const shell = () => ({
  viewer: SELF,
  bar: { kind: 'turn', who: person(7), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 0 }, menu: {} },
  tabs: { variant: 'game', view: 'room', open: 'card', hero: { mode: 'pass', enabled: false } },
});
const sheetInput = (role, extra = {}) => ({
  viewer: SELF, view: 'card', hidden: false, card: cardOf(role), knowledge: KNOWLEDGE[role] ?? KNOWLEDGE.Doctor, resources: RESOURCES[role] ?? RESOURCES.Doctor, ...extra,
});
const large = state => ({ ...state, sizes: ['320x568'], text: 200 });

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const CARD_STATES = Object.freeze({
  // Sheet 31's four frames.
  card: { sheet: '31', caption: 'Card · the Doctor', shell: shell(), card: sheetInput('Doctor') },
  'knowledge-hacker': { sheet: '31', caption: 'Knowledge · the Hacker, with a Scan', shell: shell(), card: sheetInput('Hacker', { view: 'knowledge' }) },
  resources: { sheet: '31', caption: 'Resources · the Doctor', shell: shell(), card: sheetInput('Doctor', { view: 'resources' }) },
  hidden: { sheet: '31', caption: 'Hidden', shell: shell(), card: sheetInput('Doctor', { hidden: true }) },
  // What the pack does not draw as its own frame.
  'knowledge-empty': { sheet: '31+', caption: 'Knowledge · nothing known (T3’s principle)', shell: shell(), card: sheetInput('Doctor', { view: 'knowledge' }) },
  'knowledge-insider': { sheet: '31+', caption: 'Knowledge · the Insider’s trio', shell: shell(), card: sheetInput('Insider', { view: 'knowledge' }) },
  'card-hacker': { sheet: '31+', caption: 'Card · the Hacker, Red team', shell: shell(), card: sheetInput('Hacker') },
  stale: { sheet: '45', caption: 'Reconnecting · the views still switch', shell: shell(), card: sheetInput('Doctor'), status: 'stale' },
  concealed: { sheet: '—', caption: 'Concealed · nothing drawn', shell: shell(), card: sheetInput('Doctor'), status: 'concealed' },
  // 320 × 568 at the Largest text (200%).
  'large-card': { sheet: '56-like', caption: 'Largest text · Card', ...large({ shell: shell(), card: sheetInput('Doctor') }) },
  'large-knowledge': { sheet: '56-like', caption: 'Largest text · Knowledge', ...large({ shell: shell(), card: sheetInput('Hacker', { view: 'knowledge' }) }) },
  'large-resources': { sheet: '56-like', caption: 'Largest text · Resources', ...large({ shell: shell(), card: sheetInput('Doctor', { view: 'resources' }) }) },
});

/** The pack's frame each state is compared with (screens-game.mjs card(), sheet 31). */
export const PACK_FRAMES = Object.freeze({
  card: 'card&role=Doctor', 'knowledge-hacker': 'card&role=Hacker&state=knows', resources: 'card&role=Doctor&state=holds', hidden: 'card&role=Doctor&state=hidden',
  'knowledge-empty': 'card&role=Doctor&state=knows', 'card-hacker': 'card&role=Hacker',
});

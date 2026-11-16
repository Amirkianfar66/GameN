// mothership:dev-only
//
// The private talk preview's states: one per frame the phone pack draws on sheet 25 (screens-more.mjs talk():
// declare with the role's own side and with any side, the claim, the talk), and the states the pack leaves out
// (the Lead's D1–D3: the initiator's wait, the initiator's claim, no declaration; choosing, sending; another
// player's phone; reconnecting; concealed; the Largest text), on the pack's synthetic fixtures
// (design/phone-ui/prototype/fixtures.mjs: invented names, seats and roles, as the review sheets use). Ava (seat
// 1) asked Dev (seat 4, this phone in most states) to talk; Gus (seat 7) is a third phone. Each state gives the
// shell's input, what the stage holds (the room scene, or the capsule), and the part with its input as
// docs/design/components/private-talk.md has it. The offer's sides stand in for the server's, as the pack's
// declarableSides() gives them.

import { ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';
import { claimSheet, declareSheet, talkBar, waitSheet } from '../private-talk.mjs';

const seats = board({ place: ROOM_FIXTURES['room-a'].place });
const at = n => seats.find(s => s.seat === n);
/** A person as the parts take them: the seat as the projection names it, the name, the character. */
const who = n => { const p = seatOf(n); return { seat: `seat-${n}`, name: p.name, character: p.character }; };
/** A person as the capsule takes them, from the public board: health, where they are, jailed. */
const seated = (n, extra = {}) => { const s = at(n); return { ...who(n), health: s.health, location: s.location, jailed: s.jailed, ...extra }; };

const PARTNER = who(1), DECLARER = who(SELF), OTHER = 7;
const PAIR = [PARTNER, DECLARER];
const ALL = ['Blue', 'Red', 'Alien'];

/** The game's tabs with Pass off, while declaring and during the claim (D7); the talk's own foot in the talk. */
const GAME_TABS = { variant: 'game', view: 'room', open: null, hero: { mode: 'pass', enabled: false } };
const TALK_TABS = { variant: 'talk' };
const bar = (phase, seconds) => talkBar({ phase, pair: PAIR, remainingMs: seconds * 1000, round: 3, promises: { count: 0 }, menu: {} });

/** A state: its caption, its sheet, the viewer, the shell's input, the stage ('room' or 'capsule') and the part. */
const state = (caption, sheet, { viewer = SELF, shell, stage = 'room', part = null }) => ({ caption, sheet, viewer, shell: { viewer: `seat-${viewer}`, ...shell }, stage, part });
const declareState = (caption, sides, selected, { phase = 'ready', interactive = true, sheet = '25' } = {}) => state(caption, sheet, {
  shell: { bar: bar('declare', 12), tabs: GAME_TABS, sheet: declareSheet({ selected, phase }) },
  part: { kind: 'declare', input: { partner: PARTNER, declarer: DECLARER, sides, selected, interactive } },
});
const claimState = (caption, view, claim, sheet = '25') => state(caption, sheet, {
  viewer: view === 'declarer' ? SELF : 1,
  shell: { bar: bar('claim', 4), tabs: GAME_TABS, sheet: claimSheet({ view, partner: PARTNER, declarer: DECLARER }) },
  part: { kind: 'claim', input: { view, partner: PARTNER, declarer: DECLARER, claim } },
});
const talkState = (caption, viewer, pair = [seated(1), seated(SELF)], sheet = '25') => state(caption, sheet, {
  viewer, shell: { bar: bar('talk', 47), tabs: TALK_TABS }, stage: 'capsule',
  part: { kind: 'capsule', input: { pair } },
});

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const TALK_STATES = Object.freeze({
  // Sheet 25's four frames.
  'declare-own': declareState('Declare · the role’s own side (Doctor)', ['Blue'], 'Blue'),
  'declare-any': declareState('Declare · any side (Undercover)', ALL, 'Blue'),
  'claim-declarer': claimState('The claim · on Dev’s phone', 'declarer', 'Blue'),
  talk: talkState('Talk · the capsule, on Dev’s phone', SELF),
  // What the pack does not draw as its own frame.
  'declare-unchosen': declareState('Declare · nothing chosen yet', ALL, null, { sheet: '25+' }),
  'declare-red': declareState('Declare · Red chosen', ALL, 'Red', { sheet: '25+' }),
  'declare-sending': declareState('Declare · sending', ['Blue'], 'Blue', { phase: 'sending', interactive: false, sheet: '25+' }),
  wait: state('While Dev declares · on Ava’s phone (D1)', '25+', {
    viewer: 1, shell: { bar: bar('declare', 12), tabs: GAME_TABS, sheet: waitSheet() },
    part: { kind: 'wait', input: { partner: PARTNER, declarer: DECLARER } },
  }),
  'declare-other': state('While Dev declares · on Gus’s phone: the pair bar only', '25+', {
    viewer: OTHER, shell: { bar: bar('declare', 12), tabs: GAME_TABS },
  }),
  'claim-initiator': claimState('The claim · on Ava’s phone (D2)', 'initiator', 'Blue', '25+'),
  'claim-none-declarer': claimState('No side declared · on Dev’s phone (D3)', 'declarer', null, '25+'),
  'claim-none-initiator': claimState('No side declared · on Ava’s phone (D3)', 'initiator', null, '25+'),
  'claim-alien': claimState('The claim · Alien, on Ava’s phone', 'initiator', 'Alien', '25+'),
  'talk-initiator': talkState('Talk · on Ava’s phone', 1, undefined, '25+'),
  'talk-status': talkState('Talk · Ava from the Jail, Dev Injured from the Hospital', SELF,
    [seated(1, { location: 'Jail', jailed: true }), seated(SELF, { health: 'Injured', location: 'Hospital' })], '25+'),
  'talk-other': state('Talk · on Gus’s phone: the pair bar and the room', '25+', {
    viewer: OTHER, shell: { bar: bar('talk', 47), tabs: GAME_TABS },
  }),
  stale: { ...declareState('Reconnecting · as last seen, no taps', ALL, 'Blue', { sheet: '25+' }), status: 'stale' },
  concealed: { ...declareState('Concealed · nothing drawn', ['Blue'], 'Blue', { sheet: '—' }), status: 'concealed' },
  // The smallest phone, and the Largest text there.
  'small-declare': { ...declareState('320 × 568 · declare', ALL, 'Blue', { sheet: '25+' }), sizes: ['320x568'] },
  'small-talk': { ...talkState('320 × 568 · talk', SELF, undefined, '25+'), sizes: ['320x568'] },
  'largest-declare': { ...declareState('Largest text (200 %) · declare', ALL, 'Blue', { sheet: '56-like' }), sizes: ['320x568'], text: 200 },
  'largest-claim': { ...claimState('Largest text · the claim', 'declarer', 'Blue', '56-like'), sizes: ['320x568'], text: 200 },
  'largest-wait': { ...state('Largest text · the wait', '56-like', {
    viewer: 1, shell: { bar: bar('declare', 12), tabs: GAME_TABS, sheet: waitSheet() },
    part: { kind: 'wait', input: { partner: PARTNER, declarer: DECLARER } },
  }), sizes: ['320x568'], text: 200 },
  'largest-talk': { ...talkState('Largest text · talk', SELF, undefined, '56-like'), sizes: ['320x568'], text: 200 },
});

/** The pack's frame each state is compared with (sheets/catalog.mjs), where the pack draws it. */
export const PACK_FRAMES = Object.freeze({
  'declare-own': { frame: 'talk&stage=declare&role=Doctor' },
  'declare-any': { frame: 'talk&stage=declare&role=Undercover&side=blue' },
  'claim-declarer': { frame: 'talk&stage=result' },
  talk: { frame: 'talk&stage=talk' },
});

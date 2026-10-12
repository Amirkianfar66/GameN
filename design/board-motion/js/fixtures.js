// mothership:dev-only
//
// Labeled synthetic fixtures for the board-motion prototype (issue #87). Every name, seat,
// role and choice here is made up; none is the result of a rule or a match. The public part
// of a scenario has the shape of the public view (seats with location, health, jailed,
// captain, revealedFaction; round; phase; active seat; ballot; last tally). The private part
// has the shape of the viewer's own view: the role, and what the server offers, as
// legalTargets, movement destinations and availability flags would list it. The prototype
// reads offers only from here, exactly as the game reads them only from the server.

import { COPY, PROPOSED, SHELL } from './copy.js';

export const SYNTHETIC_LABEL = 'Synthetic fixture · design prototype, not a match';
export const VIEWER = 3;

/** The nine crew characters (design/contract/crew-catalog.json). Every one walks, is hit and falls the same way: only its picture differs. */
export const CREW = [
  { id: 'c1', sign: 'Vega' },
  { id: 'c2', sign: 'Rigel' },
  { id: 'c3', sign: 'Lyra' },
  { id: 'c4', sign: 'Atlas' },
  { id: 'c5', sign: 'Orion' },
  { id: 'c6', sign: 'Nova' },
  { id: 'c7', sign: 'Juno' },
  { id: 'c8', sign: 'Mira' },
  { id: 'c9', sign: 'Echo' },
];

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
export const LONG_NAMES = ['WWWWWWWWWWWW', 'Maximiliana', 'Bartholomew!', 'Konstantinos', 'Wilhelmina R', 'Oluwaseun A.', 'Anastasiaaaa', 'Christophers', 'Guinevere II'];
const CHARACTER = ['c4', 'c7', 'c1', 'c9', 'c2', 'c6', 'c3', 'c8', 'c5'];
/** Where the nine stand when nothing says otherwise. Seat 7 is Captain. */
const SPREAD = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Jail'];

export function seatsFor(count, locations = SPREAD) {
  return Array.from({ length: count }, (_, index) => ({
    n: index + 1, name: NAMES[index], character: CHARACTER[index], location: locations[index],
    health: locations[index] === 'Hospital' ? 'Injured' : 'Healthy', jailed: locations[index] === 'Jail', captain: index === 6, revealedFaction: null,
  }));
}

/** The declared-side Hack's windows, ms (Backend's proposal): the declaration at most 15 s, the claim exactly 5 s, the talk 60 s. */
const HACK_WINDOW = { HACK_DECLARE: 15000, HACK_RESULT: 5000, HACK: 60000 };

/** A whole synthetic state: public facts, the viewer's private facts, the action flow and what is open. */
function state({ count = 9, locations, seats: change = () => {}, round = 2, phase = 'ORDINARY_TURN', active = VIEWER, seconds = 42, voteResult = null, resultElapsed = 1500, hackFeedback = null, hackElapsed = null, phaseId = null, hackFlow = null, role = count === 9 ? 'Officer' : 'Insider', offers = {}, flow = { step: 'idle' }, view = 'board', ballot = null, tally = null, result = null, endReveal = null, knowledge = [], intel = null, hackPartner = null, resources = null, acks = null, answer = 'accept', banner = null, staleCard = false, legacy = false, notice = null, pending = 0 }) {
  const seats = seatsFor(count, locations);
  change(seats);
  return {
    // A finished or ended match has no deadline (the contract's terminal phase: endsAt null).
    // A vote's result (issue #119) is its own five-second phase: its clock is the page's here (app.js sets startedAt
    // and endsAt from resultElapsed, how far into the five seconds the page loads), the server's in the game.
    // The declared-side Hack (issue #120): its prelude's windows (15 s at most, then 5 s) are timed the same way, from
    // hackElapsed; the initiator stays the active seat through HACK_DECLARE, HACK_RESULT and HACK.
    public: { playerCount: count, round, phase: { kind: phase, seconds: ['FINISHED', 'ABORTED'].includes(phase) ? 0 : phase === 'VOTE_RESULT' ? Math.ceil((5000 - resultElapsed) / 1000) : HACK_WINDOW[phase] && hackElapsed !== null ? Math.ceil((HACK_WINDOW[phase] - hackElapsed) / 1000) : seconds, ...(phaseId ? { id: phaseId } : {}) },
      active: ['ORDINARY_TURN', 'HACK_DECLARE', 'HACK_RESULT', 'HACK', 'RELEASE_CHOICE'].includes(phase) ? active : null, seats, ballot, tally, result, endReveal, voteResult, resultElapsed, hackElapsed },
    // resources: what the seat holds (self.rescuesRemaining as rescues); acks: its own acknowledgments
    // (supplierResults with the recipients' seat numbers, receivedSupply, historyAvailable).
    // hackFeedback: the participants' own (Backend's proposal, PR #125), null for everyone else.
    private: { role, offers: { pass: phase === 'ORDINARY_TURN' && active === VIEWER && !legacy, move: [], ...offers }, knowledge, intel, hackPartner, hackFeedback, resources, acks, pending },
    flow, view, answer, banner, staleCard, legacy, notice, hackFlow,
  };
}

const roomOf = (seats, n) => seats.find(seat => seat.n === n).location;
const sameRoom = (count = 9, locations = SPREAD, self = VIEWER) => seatsFor(count, locations).filter(seat => seat.location === roomOf(seatsFor(count, locations), self) && seat.n !== self).map(seat => seat.n);
/** Room A holds seats 1, 3 (the viewer), 5 and 8 in these scenarios, so a same-room action has three people to name. */
const BUSY_A = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Jail'];
const CROWD_A = ['Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Hospital', 'Jail'];
const ALL_A = Array(9).fill('Room A');
/** Room A full (seats 1, 2, 4, 5 and 8); the viewer alone in Room B. */
const FULL_A = ['Room A', 'Room A', 'Room B', 'Room A', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Jail'];
const CROWD_HOSPITAL = ['Hospital', 'Hospital', 'Room A', 'Hospital', 'Hospital', 'Hospital', 'Command Room', 'Hospital', 'Room B'];
const FINAL = Array(9).fill('Final Zone');
const HOSPITAL_8 = Array.from({ length: 9 }, (_, index) => (index + 1 === VIEWER ? 'Room A' : 'Hospital'));
const EVERYONE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OTHERS = EVERYONE.filter(n => n !== VIEWER);
const moveTo = ['Room B'];
/**
 * The end's reveal (synthetic): every seat's role, the viewer's own the Officer it holds in every nine-player
 * scenario, and the Code's four as the view might list them, not in seat order (the Hacker is never in it).
 */
const END_ROLES = { 1: 'Insider', 2: 'Hacker', 3: 'Officer', 4: 'Red Disabler', 5: 'Undercover', 6: 'Cracker', 7: 'Supplier', 8: 'Alien', 9: 'Blue Disabler' };
const END_REVEAL = { roles: EVERYONE.map(seat => ({ seat, role: END_ROLES[seat] })), code: [6, 1, 8, 4] };
const fallen = (seats, list) => { for (const [n, faction] of list) { seats[n - 1].health = 'Eliminated'; seats[n - 1].revealedFaction = faction; seats[n - 1].captain = false; } };

/**
 * A published vote result (synthetic), in the shape of Backend's proposal (FullVoteResultSchema, PR #125): the
 * contract's seat IDs and outcome, the aggregate count only. Its startedAt and endsAt are set by the page.
 */
export function voteResultFixture(kind, outcome, { round = 2, counts = {}, eligible = 9, selected = null, tied = [], yes = null, released = null } = {}) {
  const slug = kind.toLowerCase().replace(/_/g, '-');
  return {
    id: `fixture-result-${slug}-r${round}`, votePhaseId: `fixture-${slug}-r${round}`, round, kind, outcome,
    tiedSeatIds: tied.map(n => `seat-${n}`), counts: Object.fromEntries(Object.entries(counts).map(([n, votes]) => [`seat-${n}`, votes])),
    eligibleVoterCount: eligible, yesCount: yes, selectedSeatId: selected === null ? null : `seat-${selected}`, released,
  };
}
/**
 * The two participants' own hackFeedback (synthetic), in the shape of Backend's proposal (PR #125): the exchange's
 * id is its declaration phase's id; the declared side only once the server has accepted it. Nobody else's view has it.
 */
export function hackFeedbackFixture(status, declaredSide = null, { round = 2 } = {}) {
  return { hackId: `fixture-hack-declare-r${round}`, round, status, declaredSide: status === 'DECLARED' ? declaredSide : null };
}
/** This phone (Player 3) as the Hack's target, Player 5 the initiator (the active seat); or as the initiator, Player 5 the target. */
const AS_TARGET = { locations: BUSY_A, active: 5, hackPartner: 5 };
const AS_INITIATOR = { locations: BUSY_A, active: VIEWER, hackPartner: 5 };
const DECLARING = { phase: 'HACK_DECLARE', phaseId: 'fixture-hack-declare-r2', hackElapsed: 3000 };
const CLAIMING = { phase: 'HACK_RESULT', phaseId: 'fixture-hack-result-r2', hackElapsed: 1200 };
const TALKING = { phase: 'HACK', phaseId: 'fixture-hack-r2', hackElapsed: 8000 };
/** Five in Room A with this phone (seats 1, 3, 4, 5 and 8). */
const FIVE_A = ['Room A', 'Room B', 'Room A', 'Room A', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Jail'];
const awaiting = () => hackFeedbackFixture('AWAITING_DECLARATION');
const declared = side => hackFeedbackFixture('DECLARED', side);
const undeclared = () => hackFeedbackFixture('NO_DECLARATION');
// Before voting, the prelude keeps the once-a-round move (Integration, docs/frontend/phone-feedback-contract-review.md).
const declareOffer = { declare: [VIEWER], move: moveTo };

/** Where the nine are once Player 5 is elected Captain: in the Command Room, the last Captain back in Room A. */
const ELECTED_5 = ['Room A', 'Room B', 'Room A', 'Room B', 'Command Room', 'Hospital', 'Room A', 'Room B', 'Jail'];
/** Player 4 sent to Jail beside Player 9. */
const JAILED_4 = ['Room A', 'Room B', 'Room A', 'Jail', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Jail'];
/** Player 9 released from the Jail to Room A. */
const RELEASED_9 = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Room A'];
/** Five in the Hospital, in gowns (the owner's capacity of five). */
const FIVE_HOSPITAL = ['Hospital', 'Hospital', 'Room A', 'Hospital', 'Hospital', 'Hospital', 'Command Room', 'Room B', 'Jail'];
/** Five in the Jail, in stripes. */
const FIVE_JAIL = ['Jail', 'Jail', 'Room A', 'Jail', 'Jail', 'Hospital', 'Command Room', 'Room B', 'Jail'];
/** The Hospital full (five); Player 9 released but Injured, still waiting in the Jail beside Player 2. */
const FULL_HOSPITAL_WAITING = ['Hospital', 'Jail', 'Room A', 'Hospital', 'Hospital', 'Hospital', 'Command Room', 'Hospital', 'Jail'];

export const SCENARIOS = [
  // ---------- the board ----------
  { id: 'board.idle', group: 'Board', title: 'Your turn: the board, nothing open', s: () => state({ offers: { move: moveTo, shot: sameRoom() } }) },
  { id: 'board.other-turn', group: 'Board', title: 'Someone else’s turn: Pass is unavailable', s: () => state({ active: 5, offers: { move: [] } }) },
  { id: 'board.seven', group: 'Board', title: 'Seven players', s: () => state({ count: 7, offers: { move: moveTo } }) },
  { id: 'board.eight', group: 'Board', title: 'Eight players', s: () => state({ count: 8, offers: { move: moveTo } }) },
  { id: 'board.crowded', group: 'Board', status: 'layout-stress', title: 'Layout stress: Seven in Room A, everyone reachable', s: () => state({ locations: CROWD_A, seats: s => { s[6].captain = false; }, offers: { move: moveTo } }) },
  { id: 'board.all-one-room', group: 'Board', status: 'layout-stress', title: 'Layout stress: All nine in Room A', s: () => state({ locations: ALL_A, seats: s => { s[6].captain = false; }, offers: { move: moveTo } }) },
  { id: 'board.crowded-hospital', group: 'Board', status: 'layout-stress', title: 'Layout stress: Six in the Hospital', s: () => state({ locations: CROWD_HOSPITAL, active: 7, offers: {} }) },
  { id: 'board.final-zone', group: 'Board', title: 'Final Zone: the showdown', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[8].health = 'Eliminated'; s[8].revealedFaction = 'Blue'; s[5].health = 'Healthy'; }, offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8] } }) },
  { id: 'board.long-names', group: 'Board', title: 'Twelve-character names', names: 'long', s: () => state({ offers: { move: moveTo } }) },
  { id: 'board.tightest', group: 'Board', status: 'layout-stress', title: 'Layout stress: The tallest board: six in Room A, the Captain, two in the Hospital', s: () => state({ locations: ['Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Hospital'], seats: s => { s[8].jailed = false; s[8].health = 'Injured'; }, offers: { move: [], vote: null, shot: [1, 2, 4, 5, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },

  // ---------- the match's end: the result, the roles and the Code, on every screen alike ----------
  { id: 'end.blue', group: 'The end', title: 'Blue wins: the result, the roles and the Code', s: () => state({ phase: 'FINISHED', round: 4, seats: s => fallen(s, [[2, 'Red'], [4, 'Red'], [5, 'Red']]), result: { winner: 'Blue', alienCoWinner: false }, endReveal: END_REVEAL, offers: {} }) },
  { id: 'end.alien-co', group: 'The end', title: 'Blue wins, and the Alien with Blue', s: () => state({ phase: 'FINISHED', round: 4, seats: s => fallen(s, [[2, 'Red'], [4, 'Red'], [5, 'Red']]), result: { winner: 'Blue', alienCoWinner: true }, endReveal: END_REVEAL, offers: {} }) },
  { id: 'end.red', group: 'The end', title: 'Red wins', s: () => state({ phase: 'FINISHED', round: 5, seats: s => fallen(s, [[7, 'Blue'], [9, 'Blue']]), result: { winner: 'Red', alienCoWinner: false }, endReveal: END_REVEAL, offers: {} }) },
  { id: 'end.alien', group: 'The end', title: 'The Alien wins', s: () => state({ phase: 'FINISHED', round: 5, seats: s => fallen(s, [[1, 'Blue'], [2, 'Red'], [4, 'Red'], [5, 'Red'], [6, 'Blue'], [7, 'Blue'], [9, 'Blue']]), result: { winner: 'Alien', alienCoWinner: false }, endReveal: END_REVEAL, offers: {} }) },
  { id: 'end.draw', group: 'The end', title: 'A draw after the showdown, in the Final Zone', s: () => state({ locations: FINAL, phase: 'FINISHED', round: 5, seats: s => fallen(s, [[4, 'Red'], [5, 'Red'], [7, 'Blue']]), result: { winner: 'Draw', alienCoWinner: false }, endReveal: END_REVEAL, offers: {} }) },
  { id: 'end.aborted', group: 'The end', title: 'The host ended the match: no winner, nothing revealed', s: () => state({ phase: 'ABORTED', round: 3, offers: {} }) },

  // ---------- the tray ----------
  { id: 'tray.open', group: 'Actions tray', title: 'Actions tray: what the view opens, over the board', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, view: 'actions', offers: { move: moveTo, shot: [1, 5, 8], hack: [1, 5, 8], scan: [1, 3, 5, 8], code: true } }) },
  { id: 'tray.empty', group: 'Actions tray', title: 'Actions tray: nothing open', s: () => state({ active: 5, role: 'Insider', view: 'actions', offers: {} }) },
  // Each action's mark in its chip (design/abilities/, slice 7), in a tray for each set of actions a view opens together.
  { id: 'tray.undercover', group: 'Actions tray', title: 'Actions tray, the Undercover in Round 4: a shot, Protection, a Hack', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 4, view: 'actions', resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8], protect: [1, 3, 5, 8], hack: [1, 5, 8] } }) },
  { id: 'tray.cracker', group: 'Actions tray', title: 'Actions tray, the Cracker: a Rescue, a Hack', s: () => state({ locations: BUSY_A, role: 'Cracker', resources: { rescues: 2 }, view: 'actions', offers: { move: moveTo, rescue: [6], hack: [1, 5, 8] } }) },
  { id: 'tray.disabler', group: 'Actions tray', title: 'Actions tray, a Disabler: the Disable, a Hack', s: () => state({ locations: BUSY_A, role: 'Red Disabler', view: 'actions', offers: { move: moveTo, disable: [1, 5, 8], hack: [1, 5, 8] } }) },
  { id: 'tray.supplier', group: 'Actions tray', title: 'Actions tray, the Supplier in Round 3: Supply, a Hack', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, view: 'actions', offers: { move: moveTo, supply: [1, 5, 8], hack: [1, 5, 8] } }) },
  { id: 'tray.showdown', group: 'Actions tray', title: 'Actions tray in the Final Zone: the showdown shot', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[5].health = 'Healthy'; }, view: 'actions', offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8, 9] } }) },
  { id: 'tray.vote', group: 'Actions tray', title: 'Actions tray in a Jail vote: a ballot', s: () => state({ phase: 'JAIL_VOTE', seconds: 37, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, view: 'actions', offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } } }) },
  { id: 'tray.release', group: 'Actions tray', title: 'Actions tray, the Captain: the release request', s: () => state({ phase: 'RELEASE_CHOICE', seconds: 49, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], seats: s => { s[6].captain = false; s[2].captain = true; }, ballot: { voters: [], targets: [], release: null }, view: 'actions', offers: { 'release-choice': [9] } }) },
  { id: 'tray.release-vote', group: 'Actions tray', title: 'Actions tray in a release vote: the same ballot', s: () => state({ phase: 'RELEASE_VOTE', seconds: 44, ballot: { voters: EVERYONE, targets: [], release: 9 }, view: 'actions', offers: { 'release-vote': true } }) },

  // ---------- one target ----------
  { id: 'shot.choose', group: 'One target', title: 'Shot: eligible characters on the board', s: () => state({ locations: BUSY_A, resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },
  { id: 'shot.confirm', group: 'One target', title: 'Shot: one character chosen, confirm in the strip', s: () => state({ locations: BUSY_A, resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'confirming', kind: 'shot', picked: [5] } }) },
  { id: 'shot.pending', group: 'One target', title: 'Shot: sending', s: () => state({ locations: BUSY_A, resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'submitting', kind: 'shot', picked: [5], weaponsAtSend: 1 } }) },
  { id: 'shot.registered', group: 'One target', title: 'Shot: registered (not a result), the round spent', s: () => state({ locations: BUSY_A, resources: { weapons: 0 }, offers: { move: moveTo }, flow: { step: 'accepted', kind: 'shot', picked: [5], weaponsAtSend: 1 } }) },
  // The same strip for every seat that shoots: the Officer's first shot from Round 1, the Undercover's, an Alien's supplied weapon.
  { id: 'shot.officer', group: 'One target', title: 'The Officer\'s shot in Round 1, its one round', s: () => state({ locations: BUSY_A, round: 1, resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },
  { id: 'shot.undercover-confirm', group: 'One target', title: 'The Undercover\'s shot in Round 4: the same strip', s: () => state({ locations: BUSY_A, round: 4, role: 'Undercover', resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'confirming', kind: 'shot', picked: [5] } }) },
  { id: 'shot.alien-confirm', group: 'One target', title: 'An Alien\'s supplied weapon in Round 4: the same strip', s: () => state({ locations: BUSY_A, round: 4, role: 'Alien', resources: { weapons: 1 }, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'confirming', kind: 'shot', picked: [5] } }) },
  { id: 'shot.rejected', group: 'One target', title: 'Shot: not accepted', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'rejected', kind: 'shot', picked: [5], code: 'NOT_ALLOWED' } }) },
  { id: 'shot.unknown', group: 'One target', title: 'Shot: result unknown', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'unknown', kind: 'shot', picked: [5] } }) },
  { id: 'disable.choose', group: 'One target', title: 'Disable: eligible characters', s: () => state({ locations: BUSY_A, role: 'Red Disabler', offers: { move: moveTo, disable: [1, 5, 8] }, flow: { step: 'choosing', kind: 'disable', picked: [] } }) },
  // The two Disablers' strips, part for part the same: each one's identity stays in its own role card.
  { id: 'disable.confirm', group: 'One target', title: 'Disable (Blue Disabler): the target in the sparks, the one charge', s: () => state({ locations: BUSY_A, role: 'Blue Disabler', offers: { move: moveTo, disable: [1, 5, 8] }, flow: { step: 'confirming', kind: 'disable', picked: [5] } }) },
  { id: 'disable.registered', group: 'One target', title: 'Disable (Blue Disabler) registered: the charge spent, not a result', s: () => state({ locations: BUSY_A, role: 'Blue Disabler', offers: { move: moveTo }, flow: { step: 'accepted', kind: 'disable', picked: [5] } }) },
  { id: 'disable.red-confirm', group: 'One target', title: 'Disable (Red Disabler): the same strip as the Blue Disabler\'s', s: () => state({ locations: BUSY_A, role: 'Red Disabler', offers: { move: moveTo, disable: [1, 5, 8] }, flow: { step: 'confirming', kind: 'disable', picked: [5] } }) },
  { id: 'disable.red-registered', group: 'One target', title: 'Disable (Red Disabler) registered: the same receipt', s: () => state({ locations: BUSY_A, role: 'Red Disabler', offers: { move: moveTo }, flow: { step: 'accepted', kind: 'disable', picked: [5] } }) },
  { id: 'protect.choose', group: 'One target', title: 'Protection: yourself included', s: () => state({ locations: BUSY_A, role: 'Undercover', offers: { move: moveTo, protect: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'protect', picked: [] } }) },
  { id: 'protect.confirm', group: 'One target', title: 'Protection: the target on the shield', s: () => state({ locations: BUSY_A, role: 'Undercover', offers: { move: moveTo, protect: [1, 3, 5, 8] }, flow: { step: 'confirming', kind: 'protect', picked: [5] } }) },
  { id: 'protect.registered', group: 'One target', title: 'Protection registered: not a grant', s: () => state({ locations: BUSY_A, role: 'Undercover', offers: { move: moveTo }, flow: { step: 'accepted', kind: 'protect', picked: [5] } }) },
  { id: 'rescue.choose', group: 'One target', title: 'Rescue: a character in the Hospital, from Room A', s: () => state({ locations: BUSY_A, role: 'Cracker', resources: { rescues: 2 }, offers: { move: moveTo, rescue: [6] }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'rescue.self', group: 'One target', title: 'Rescue: yourself, injured', s: () => state({ locations: BUSY_A, role: 'Cracker', resources: { rescues: 1 }, seats: s => { s[2].health = 'Injured'; }, offers: { rescue: [3] }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'rescue.confirm', group: 'One target', title: 'Rescue: the target in the medical cross, two Rescues left', s: () => state({ locations: BUSY_A, role: 'Cracker', resources: { rescues: 2 }, offers: { move: moveTo, rescue: [6] }, flow: { step: 'confirming', kind: 'rescue', picked: [6] } }) },
  { id: 'rescue.registered', group: 'One target', title: 'Rescue registered: one vial spent, not a recovery', s: () => state({ locations: BUSY_A, role: 'Cracker', resources: { rescues: 1 }, offers: { move: moveTo }, flow: { step: 'accepted', kind: 'rescue', picked: [6] } }) },
  { id: 'rescue.kit', group: 'Private file', title: 'Cracker card: one Rescue left', s: () => state({ locations: BUSY_A, role: 'Cracker', round: 3, active: 5, resources: { rescues: 1 }, offers: { move: [] }, view: 'card' }) },
  { id: 'hack.choose', group: 'One target', title: 'Hack request: eligible characters', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, hack: [1, 5, 8] }, flow: { step: 'choosing', kind: 'hack', picked: [] } }) },
  // Any seat may ask for a Hack: here the Supplier (a Hacker's card would hold the Hacker's file too).
  { id: 'hack.phase', group: 'One target', title: 'Hack phase: its own full minute', s: () => state({ locations: BUSY_A, role: 'Supplier', phase: 'HACK', seconds: 60, hackPartner: 5, offers: {}, view: 'card' }) },
  // A Hack's request, and the same note on the other partner's phone (here not the one who asked, nor the Hacker).
  { id: 'hack.confirm', group: 'One target', title: 'Hack request: the asked player in the comms ring', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, hack: [1, 5, 8] }, flow: { step: 'confirming', kind: 'hack', picked: [5] } }) },
  { id: 'hack.requested', group: 'One target', title: 'Hack request accepted: not the Hack itself', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo }, flow: { step: 'accepted', kind: 'hack', picked: [5] } }) },
  { id: 'hack.partner', group: 'One target', title: 'Hack phase on the other partner’s phone: the same note', s: () => state({ locations: BUSY_A, role: 'Cracker', phase: 'HACK', seconds: 52, active: 5, hackPartner: 5, offers: {}, view: 'card' }) },
  { id: 'showdown.choose', group: 'One target', title: 'Showdown shot in the Final Zone', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[5].health = 'Healthy'; }, offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8, 9] }, flow: { step: 'choosing', kind: 'showdown-shot', picked: [] } }) },
  // The showdown's shots resolved (the Reds down), the match about to end: where the end's storyboard starts.
  { id: 'showdown.resolved', group: 'One target', title: 'Showdown resolved: the shots landed, before the end', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seconds: 4, seats: s => fallen(s, [[2, 'Red'], [4, 'Red'], [5, 'Red']]), offers: {} }) },
  // The seat's own special shot (design/abilities/js/finale.js): the target in the reticle, the shot spent on the receipt.
  { id: 'showdown.confirm', group: 'One target', title: 'Showdown shot: the target in the reticle, the special shot', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[5].health = 'Healthy'; }, offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8, 9] }, flow: { step: 'confirming', kind: 'showdown-shot', picked: [5] } }) },
  { id: 'showdown.registered', group: 'One target', title: 'Showdown shot registered: spent, the target still secret', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[5].health = 'Healthy'; }, offers: {}, flow: { step: 'accepted', kind: 'showdown-shot', picked: [5] } }) },

  // ---------- crowded rooms: every character the rules allow is a target ----------
  { id: 'crowd.shot', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Shot at any of eight', s: () => state({ locations: ALL_A, seats: s => { s[6].captain = false; }, offers: { move: moveTo, shot: OTHERS }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },
  { id: 'crowd.disable', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Disable at any of eight', s: () => state({ locations: ALL_A, role: 'Red Disabler', seats: s => { s[6].captain = false; }, offers: { move: moveTo, disable: OTHERS }, flow: { step: 'choosing', kind: 'disable', picked: [] } }) },
  { id: 'crowd.protect', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: Protection for any of nine', s: () => state({ locations: ALL_A, role: 'Undercover', seats: s => { s[6].captain = false; }, offers: { move: moveTo, protect: EVERYONE }, flow: { step: 'choosing', kind: 'protect', picked: [] } }) },
  { id: 'crowd.rescue', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: Eight in the Hospital: a Rescue for any of them', s: () => state({ locations: HOSPITAL_8, role: 'Cracker', active: 3, resources: { rescues: 2 }, seats: s => { for (const seat of s) if (seat.n !== VIEWER) seat.health = 'Injured'; s[6].captain = false; }, offers: { rescue: OTHERS }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'crowd.hack', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Hack request with any of eight', s: () => state({ locations: ALL_A, role: 'Hacker', seats: s => { s[6].captain = false; }, offers: { move: moveTo, hack: OTHERS }, flow: { step: 'choosing', kind: 'hack', picked: [] } }) },
  { id: 'crowd.scan', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Scan of any of nine', s: () => state({ locations: ALL_A, role: 'Hacker', seats: s => { s[6].captain = false; }, offers: { move: moveTo, scan: EVERYONE }, flow: { step: 'choosing', kind: 'scan', picked: [] } }) },
  { id: 'crowd.supply', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: Supply, one chosen', s: () => state({ locations: ALL_A, role: 'Supplier', round: 3, seats: s => { s[6].captain = false; }, offers: { move: moveTo, supply: EVERYONE }, flow: { step: 'choosing', kind: 'supply', picked: [9] } }) },
  { id: 'crowd.vote', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: nine candidates, all reachable', s: () => state({ locations: ALL_A, phase: 'CAPTAIN_ELECTION', seconds: 51, round: 2, seats: s => { s[6].captain = false; }, ballot: { voters: EVERYONE, targets: EVERYONE, release: null }, offers: { vote: { targets: EVERYONE, on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },

  // ---------- several parts ----------
  { id: 'scan.choose', group: 'Several parts', title: 'Scan: choose a character', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'scan', picked: [] } }) },
  { id: 'scan.faction', group: 'Several parts', title: 'Scan: guess a faction inline', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'scan', picked: [8] } }) },
  { id: 'scan.result', group: 'Several parts', title: 'Scan: accepted; the result is private, in the card', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo }, view: 'card', intel: { undercoverSeatId: 4, scanResults: [{ round: 2, target: 8, guess: 'Red', matched: true, inCode: false }] } }) },
  { id: 'scan.sending', group: 'Several parts', title: 'Scan: on its way, the scanner sweeping its target', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, flow: { step: 'submitting', kind: 'scan', picked: [8, 'Red'] }, intel: { undercoverSeatId: 4, scanResults: [] } }) },
  { id: 'scan.fresh', group: 'Several parts', title: 'Scan from the board; its result printed once in the Hacker\'s file', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, intel: { undercoverSeatId: 4, scanResults: [] } }) },
  { id: 'supply.first', group: 'Several parts', title: 'Supply: choose the first of two', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'choosing', kind: 'supply', picked: [] } }) },
  { id: 'supply.second', group: 'Several parts', title: 'Supply: one chosen, choose the second', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'choosing', kind: 'supply', picked: [1] } }) },
  { id: 'supply.confirm', group: 'Several parts', title: 'Supply: two chosen, confirm', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'confirming', kind: 'supply', picked: [1, 8] } }) },
  { id: 'supply.registered', group: 'Several parts', title: 'Supply registered: the two tags tied, not a delivery', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo }, flow: { step: 'accepted', kind: 'supply', picked: [8, 1] } }) },
  // The Supplier's own acknowledgment after Round 3 (the players who received a weapon) and a recipient's own; synthetic.
  { id: 'supply.ack', group: 'Several parts', title: 'Supply: delivered to both, the Supplier\'s slip in the card', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', acks: { historyAvailable: true, supplierResults: [{ round: 3, recipients: [1, 8] }], receivedSupply: [] } }) },
  { id: 'supply.ack-one', group: 'Several parts', title: 'Supply: delivered to one of the two', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', acks: { historyAvailable: true, supplierResults: [{ round: 3, recipients: [8] }], receivedSupply: [] } }) },
  { id: 'supply.ack-none', group: 'Several parts', title: 'Supply: no one received a weapon', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', acks: { historyAvailable: true, supplierResults: [{ round: 3, recipients: [] }], receivedSupply: [] } }) },
  { id: 'supply.self', group: 'Several parts', title: 'Supply to yourself and Player 8: two slips', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', acks: { historyAvailable: true, supplierResults: [{ round: 3, recipients: [8, 3] }], receivedSupply: [{ round: 3 }] } }) },
  { id: 'supply.received', group: 'Several parts', title: 'A recipient\'s slip: one weapon received, no Supplier named', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 4, offers: {}, view: 'card', acks: { historyAvailable: true, supplierResults: [], receivedSupply: [{ round: 3 }] } }) },
  { id: 'supply.history', group: 'Several parts', title: 'Supply: the result history is unavailable', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', acks: { historyAvailable: false, supplierResults: [], receivedSupply: [] } }) },
  // The Insider's file (design/abilities/): the three candidates as the view might list them (not in seat order).
  { id: 'file.insider', group: 'Private file', title: 'Insider file: three players, three roles, who is which unknown', s: () => state({ locations: BUSY_A, role: 'Insider', active: 5, offers: { move: [] }, view: 'card', intel: { insiderCandidates: [8, 2, 5] } }) },
  { id: 'file.hidden', group: 'Private file', title: 'Private file: hidden while the view is out of date', s: () => state({ locations: BUSY_A, role: 'Insider', active: 5, offers: { move: [] }, view: 'card', banner: 'stale', intel: { insiderCandidates: [8, 2, 5] } }) },
  // The Hacker's file: the known Undercover, and every Scan result the view carries, in its order (synthetic results).
  { id: 'file.hacker', group: 'Private file', title: 'Hacker file: the known Undercover and two Scan results', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 3, active: 5, offers: { move: [] }, view: 'card', intel: { undercoverSeatId: 4, scanResults: [{ round: 1, target: 8, guess: 'Red', matched: false, inCode: null }, { round: 2, target: 5, guess: 'Blue', matched: true, inCode: true }] } }) },
  { id: 'file.hacker-start', group: 'Private file', title: 'Hacker file at the start: the known Undercover, no Scan yet', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 1, active: 5, offers: { move: [] }, view: 'card', intel: { undercoverSeatId: 4, scanResults: [] } }) },
  // The Alien's file: the Code's four players as the view might list them (not in seat order), the viewer among them.
  { id: 'file.alien', group: 'Private file', title: 'Alien file: the Code, four players in no order', s: () => state({ locations: BUSY_A, role: 'Alien', active: 5, offers: { move: [] }, view: 'card', intel: { code: [9, 3, 5, 1] } }) },
  // The Undercover's own notes of its Protections (knowledge.protections, synthetic), and what a seat holds.
  { id: 'guard.card', group: 'Private file', title: 'Undercover card: Protection for Player 5, one weapon', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 3, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 1 }, intel: { protections: [{ seat: 5, activeFromRound: 3, consumed: false }] } }) },
  { id: 'guard.used', group: 'Private file', title: 'Undercover card: the Protection used up', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 4, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 1 }, intel: { protections: [{ seat: 5, activeFromRound: 3, consumed: true }] } }) },
  { id: 'guard.self', group: 'Private file', title: 'Undercover card: Protection for yourself, and one used up', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 4, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 1 }, intel: { protections: [{ seat: 8, activeFromRound: 2, consumed: true }, { seat: 3, activeFromRound: 4, consumed: false }] } }) },
  { id: 'weapons.officer-spent', group: 'Private file', title: 'Officer card after the one shot', s: () => state({ locations: BUSY_A, round: 2, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 0 } }) },
  // The view counts a weapon supplied after the Officer's shot and carries nothing saying it cannot be used (DSN-REQ-15).
  { id: 'weapons.officer-supplied', group: 'Private file', title: 'Officer card after the one shot, a weapon supplied in Round 3', s: () => state({ locations: BUSY_A, round: 4, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 1 }, acks: { historyAvailable: true, supplierResults: [], receivedSupply: [{ round: 3 }] } }) },
  { id: 'alien.weapon', group: 'Private file', title: 'Alien card in Round 4: the Code, a supplied weapon', s: () => state({ locations: BUSY_A, role: 'Alien', round: 4, active: 5, offers: { move: [] }, view: 'card', resources: { weapons: 1 }, intel: { code: [9, 3, 5, 1] }, acks: { historyAvailable: true, supplierResults: [], receivedSupply: [{ round: 3 }] } }) },
  { id: 'code.two', group: 'Several parts', title: 'Code attempt: two of four chosen', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: moveTo, code: true }, flow: { step: 'choosing', kind: 'code', picked: [6, 2] } }) },
  { id: 'code.four', group: 'Several parts', title: 'Code attempt: four chosen, confirm', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: moveTo, code: true }, flow: { step: 'confirming', kind: 'code', picked: [6, 2, 9, 7] } }) },
  { id: 'code.registered', group: 'Several parts', title: 'Code attempt: registered (not a result), the card punched', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: moveTo }, flow: { step: 'accepted', kind: 'code', picked: [6, 2, 9, 7] } }) },

  // ---------- ballots ----------
  { id: 'vote.election', group: 'Ballots', title: 'Captain election: tap a candidate, or abstain', s: () => state({ phase: 'CAPTAIN_ELECTION', seconds: 51, round: 2, seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, ballot: { voters: [1, 2, 3, 4, 5, 6, 7, 8, 9], targets: [1, 2, 3, 4, 5, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 7, 8], on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.runoff', group: 'Ballots', title: 'Captain election again, among the tied', s: () => state({ phase: 'CAPTAIN_ELECTION', seconds: 58, round: 2, seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, ballot: { voters: [1, 2, 3, 4, 5, 6, 7, 8, 9], targets: [2, 7], release: null }, offers: { vote: { targets: [2, 7], on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.jail', group: 'Ballots', title: 'Jail vote: tap a player, or abstain', s: () => state({ phase: 'JAIL_VOTE', seconds: 37, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.recorded', group: 'Ballots', title: 'Ballot recorded (not a result)', s: () => state({ phase: 'JAIL_VOTE', seconds: 21, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'accepted', kind: 'vote', picked: [4] } }) },
  { id: 'vote.tally', group: 'Ballots', title: 'The count, published when the vote closes', s: () => state({ active: 1, round: 3, locations: ['Room A', 'Room B', 'Room A', 'Jail', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Room B'], seats: s => { s[8].jailed = false; }, tally: { kind: 'JAIL_VOTE', counts: { 4: 4, 2: 1, 8: 1 }, eligible: 7, selected: 4 }, offers: { move: moveTo } }) },
  { id: 'release.choice', group: 'Ballots', title: 'Captain’s release request: a jailed character', s: () => state({ phase: 'RELEASE_CHOICE', seconds: 49, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], seats: s => { s[6].captain = false; s[2].captain = true; }, ballot: { voters: [], targets: [], release: null }, offers: { 'release-choice': [9] }, flow: { step: 'choosing', kind: 'release-choice', picked: [] } }) },
  { id: 'release.vote', group: 'Ballots', title: 'Release vote: Yes, No or Abstain inline', s: () => state({ phase: 'RELEASE_VOTE', seconds: 44, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true }, flow: { step: 'choosing', kind: 'release-vote', picked: [] } }) },
  // The seat's own ballot (design/abilities/js/ballot.js): its pick ticked on a slip, posted into the box on the receipt.
  { id: 'vote.confirm', group: 'Ballots', title: 'Captain election: the ballot for Player 5', s: () => state({ phase: 'CAPTAIN_ELECTION', seconds: 40, round: 2, seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, ballot: { voters: [1, 2, 3, 4, 5, 6, 7, 8, 9], targets: [1, 2, 3, 4, 5, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 7, 8], on: 'CAPTAIN_ELECTION' } }, flow: { step: 'confirming', kind: 'vote', picked: [5] } }) },
  { id: 'vote.abstain', group: 'Ballots', title: 'Jail vote: an abstention, a blank slip', s: () => state({ phase: 'JAIL_VOTE', seconds: 30, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'confirming', kind: 'vote', picked: ['none'] } }) },
  { id: 'vote.abstained', group: 'Ballots', title: 'Abstention recorded: the blank slip posted', s: () => state({ phase: 'JAIL_VOTE', seconds: 18, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'accepted', kind: 'vote', picked: ['none'] } }) },
  { id: 'release.confirm', group: 'Ballots', title: 'Captain’s release request: Player 9 in the key ring', s: () => state({ phase: 'RELEASE_CHOICE', seconds: 41, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], seats: s => { s[6].captain = false; s[2].captain = true; }, ballot: { voters: [], targets: [], release: null }, offers: { 'release-choice': [9] }, flow: { step: 'confirming', kind: 'release-choice', picked: [9] } }) },
  { id: 'release.requested', group: 'Ballots', title: 'Release request accepted: not the vote', s: () => state({ phase: 'RELEASE_CHOICE', seconds: 35, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], seats: s => { s[6].captain = false; s[2].captain = true; }, ballot: { voters: [], targets: [], release: null }, offers: {}, flow: { step: 'accepted', kind: 'release-choice', picked: [9] } }) },
  { id: 'release.vote-yes', group: 'Ballots', title: 'Release vote: Yes, ticked on Player 9’s slip', s: () => state({ phase: 'RELEASE_VOTE', seconds: 38, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true }, flow: { step: 'confirming', kind: 'release-vote', picked: ['yes'] } }) },
  { id: 'release.vote-no', group: 'Ballots', title: 'Release vote: No, crossed', s: () => state({ phase: 'RELEASE_VOTE', seconds: 38, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true }, flow: { step: 'confirming', kind: 'release-vote', picked: ['no'] } }) },
  { id: 'release.voted', group: 'Ballots', title: 'Release ballot recorded: posted, not a result', s: () => state({ phase: 'RELEASE_VOTE', seconds: 27, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true }, flow: { step: 'accepted', kind: 'release-vote', picked: ['yes'] } }) },

  // ---------- movement ----------
  { id: 'move.tags', group: 'Movement', title: 'Room name tags are the move controls', s: () => state({ seats: s => { s[6].captain = false; s[6].location = 'Room B'; s[2].captain = true; }, offers: { move: ['Room B', 'Command Room'] } }) },
  { id: 'move.confirm', group: 'Movement', title: 'Room B pressed: a tentative place, then confirm', s: () => state({ offers: { move: ['Room B'] }, flow: { step: 'confirming', kind: 'move', picked: ['Room B'] } }) },
  { id: 'move.pending', group: 'Movement', title: 'Move: sending', s: () => state({ offers: { move: ['Room B'] }, flow: { step: 'submitting', kind: 'move', picked: ['Room B'] } }) },
  { id: 'move.accepted', group: 'Movement', title: 'Move accepted; the piece moves with the public update', s: () => state({ offers: { move: [] }, flow: { step: 'accepted', kind: 'move', picked: ['Room B'] }, seats: s => { s[2].location = 'Room B'; } }) },
  { id: 'move.refused', group: 'Movement', title: 'A room you cannot move to', s: () => state({ offers: { move: ['Room B'] }, notice: SHELL.cannotMove }) },
  { id: 'move.full', group: 'Movement', title: 'Room A is full (five, the owner’s capacity): its tag says FULL on every screen, and it is never offered', s: () => state({ locations: FULL_A, offers: { move: [] } }) },

  // ---------- pass ----------
  { id: 'pass.confirm', group: 'Pass', title: 'Pass: confirm on the board', s: () => state({ offers: { move: moveTo }, flow: { step: 'confirming', kind: 'pass', picked: ['pass'] } }) },
  { id: 'pass.passed', group: 'Pass', title: 'Pass accepted: neutral receipt', s: () => state({ offers: { move: moveTo }, flow: { step: 'accepted', kind: 'pass', picked: ['pass'] } }) },
  { id: 'pass.legacy', group: 'Pass', title: 'A match on the legacy rules: no Pass', s: () => state({ legacy: true, offers: { move: moveTo } }) },

  // ---------- public changes, the same on every screen ----------
  { id: 'public.injured', group: 'Public changes', title: 'A player is now Injured', s: () => state({ active: 1, seats: s => { s[4].health = 'Injured'; } }) },
  { id: 'public.eliminated', group: 'Public changes', title: 'A player is now Eliminated; the faction the rules reveal', s: () => state({ active: 1, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; } }) },
  { id: 'public.jailed', group: 'Public changes', title: 'A player is now in Jail', s: () => state({ active: 1, seats: s => { s[7].location = 'Jail'; s[7].jailed = true; } }) },
  { id: 'public.captain', group: 'Public changes', title: 'A new Captain', s: () => state({ active: 1, seats: s => { s[6].captain = false; s[0].captain = true; } }) },

  // ---------- robustness ----------
  // The latest update could not be read (the release's other banner): the same pause, its own words.
  { id: 'robust.unreadable', group: 'Robustness', title: 'An update could not be read: actions paused, Reconnect now', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, banner: 'unreadable' }) },
  // DSN-REQ-16, recommended (design/abilities/, slice 7): the card kept on an out-of-date view, at rest and marked.
  { id: 'stale.card', group: 'Robustness', title: 'Out of date with the card kept: the Insider file at rest, marked', s: () => state({ locations: BUSY_A, role: 'Insider', active: 5, offers: { move: [] }, view: 'card', banner: 'stale', staleCard: true, intel: { insiderCandidates: [8, 2, 5] } }) },
  { id: 'stale.card-notes', group: 'Robustness', title: 'Out of date with the card kept: the Undercover’s notes, marked', s: () => state({ locations: BUSY_A, role: 'Undercover', round: 4, active: 5, offers: { move: [] }, view: 'card', banner: 'stale', staleCard: true, resources: { weapons: 1 }, intel: { protections: [{ seat: 5, activeFromRound: 4, consumed: false }] } }) },
  { id: 'robust.stale', group: 'Robustness', title: 'Connection lost: actions paused, private cues gone', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, banner: 'stale' }) },
  { id: 'robust.dropped', group: 'Robustness', title: 'Backgrounded while choosing: the choice was not sent', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, notice: COPY.choiceDropped }) },
  { id: 'robust.withdrawn', group: 'Robustness', title: 'A fresh view no longer offers a chosen character', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] }, notice: PROPOSED.noLongerOffered(5) }) },
  { id: 'robust.queued', group: 'Robustness', title: 'One command at a time: an earlier one is still registered', s: () => state({ locations: BUSY_A, offers: { move: moveTo }, pending: 1, view: 'actions' }) },
  // ---------- the vote's result: five seconds after each vote (issue #119; phone kit, issue #121) ----------
  { id: 'result.captain', group: 'Vote results', title: 'Captain elected: Player 5, five votes of nine (the count, five seconds)', s: () => state({ phase: 'VOTE_RESULT', locations: ELECTED_5, seats: s => { s[6].captain = false; s[4].captain = true; }, voteResult: voteResultFixture('CAPTAIN_ELECTION', 'CAPTAIN_ELECTED', { counts: { 5: 5, 2: 2, 8: 1 }, eligible: 9, selected: 5 }) }) },
  { id: 'result.runoff', group: 'Vote results', title: 'Captain election tied: Players 2 and 7, a runoff next', s: () => state({ phase: 'VOTE_RESULT', seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, voteResult: voteResultFixture('CAPTAIN_ELECTION', 'RUNOFF_REQUIRED', { counts: { 2: 4, 7: 4 }, eligible: 9, tied: [2, 7] }) }) },
  { id: 'result.no-captain', group: 'Vote results', title: 'No Captain: everyone abstained', s: () => state({ phase: 'VOTE_RESULT', seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, voteResult: voteResultFixture('CAPTAIN_ELECTION', 'NO_CAPTAIN_ELECTED', { counts: {}, eligible: 9 }) }) },
  { id: 'result.jailed', group: 'Vote results', title: 'Jail vote: Player 4 sent to Jail, five votes of eight', s: () => state({ phase: 'VOTE_RESULT', round: 3, locations: JAILED_4, seats: s => { s[3].jailed = true; }, voteResult: voteResultFixture('JAIL_VOTE', 'PLAYER_JAILED', { round: 3, counts: { 4: 5, 2: 1, 8: 1 }, eligible: 8, selected: 4 }) }) },
  { id: 'result.no-jail-tie', group: 'Vote results', title: 'Jail vote tied: Players 2 and 4, nobody sent to Jail', s: () => state({ phase: 'VOTE_RESULT', round: 3, voteResult: voteResultFixture('JAIL_VOTE', 'NO_JAIL_SELECTION', { round: 3, counts: { 2: 3, 4: 3, 8: 1 }, eligible: 8, tied: [2, 4] }) }) },
  { id: 'result.no-jail', group: 'Vote results', title: 'Jail vote: three votes for Player 4 of nine, nobody sent to Jail', s: () => state({ phase: 'VOTE_RESULT', round: 3, voteResult: voteResultFixture('JAIL_VOTE', 'NO_JAIL_SELECTION', { round: 3, counts: { 4: 3, 2: 2, 8: 1 }, eligible: 9 }) }) },
  { id: 'result.released', group: 'Vote results', title: 'Release vote: Player 9 released, five yes of eight', s: () => state({ phase: 'VOTE_RESULT', round: 3, locations: RELEASED_9, seats: s => { s[8].jailed = false; }, voteResult: voteResultFixture('RELEASE_VOTE', 'PLAYER_RELEASED', { round: 3, eligible: 8, selected: 9, yes: 5, released: true }) }) },
  { id: 'result.denied', group: 'Vote results', title: 'Release vote: Player 9 not released, three yes of eight', s: () => state({ phase: 'VOTE_RESULT', round: 3, voteResult: voteResultFixture('RELEASE_VOTE', 'RELEASE_DENIED', { round: 3, eligible: 8, selected: 9, yes: 3, released: false }) }) },
  { id: 'result.late', group: 'Vote results', title: 'A screen that joins at 3.2 s (a reconnect): the settled result for the time left, no entrance', s: () => state({ phase: 'VOTE_RESULT', locations: ELECTED_5, resultElapsed: 3200, seats: s => { s[6].captain = false; s[4].captain = true; }, voteResult: voteResultFixture('CAPTAIN_ELECTION', 'CAPTAIN_ELECTED', { counts: { 5: 5, 2: 2, 8: 1 }, eligible: 9, selected: 5 }) }) },
  { id: 'result.long-names', group: 'Vote results', names: 'long', title: 'Tie with long names', s: () => state({ phase: 'VOTE_RESULT', seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, voteResult: voteResultFixture('CAPTAIN_ELECTION', 'RUNOFF_REQUIRED', { counts: { 2: 3, 7: 3, 8: 3 }, eligible: 9, tied: [2, 7, 8] }) }) },

  // ---------- room clothes: the public location's (issue #121) ----------
  { id: 'clothes.hospital-five', group: 'Room clothes', title: 'Five in the Hospital in gowns (one Healthy again, still in the gown until the next move)', s: () => state({ locations: FIVE_HOSPITAL, seats: s => { s[3].health = 'Healthy'; }, offers: { move: moveTo } }) },
  { id: 'clothes.jail-five', group: 'Room clothes', title: 'Five in the Jail in stripes, one of them Injured', s: () => state({ locations: FIVE_JAIL, seats: s => { s[3].health = 'Injured'; }, offers: { move: moveTo } }) },
  { id: 'clothes.waiting', group: 'Room clothes', title: 'Released, Injured, still waiting in the Jail (Hospital full): stripes, no Jailed badge', s: () => state({ locations: FULL_HOSPITAL_WAITING, active: 3, seats: s => { for (const n of [1, 4, 5, 6, 8]) s[n - 1].health = 'Injured'; s[1].jailed = true; s[8].jailed = false; s[8].health = 'Injured'; }, offers: { move: moveTo } }) },

  // ---------- the private Hack, declared side first (issue #120; the phone kit, issue #121) ----------
  { id: 'hack.declare', group: 'Private Hack', title: 'Target: declare a side within 15 s (the same three for every target)', s: () => state({ ...AS_TARGET, ...DECLARING, hackFeedback: awaiting(), offers: declareOffer }) },
  { id: 'hack.declare-undercover', group: 'Private Hack', title: 'Target holding the Undercover: the same three, alike', s: () => state({ ...AS_TARGET, ...DECLARING, role: 'Undercover', hackFeedback: awaiting(), offers: declareOffer }) },
  { id: 'hack.declare-confirm', group: 'Private Hack', title: 'Target: Red chosen, confirm before it is sent', s: () => state({ ...AS_TARGET, ...DECLARING, hackElapsed: 6000, hackFeedback: awaiting(), offers: declareOffer, hackFlow: { step: 'confirming', side: 'Red' } }) },
  { id: 'hack.declare-sending', group: 'Private Hack', title: 'Target: the declaration on its way (pending)', s: () => state({ ...AS_TARGET, ...DECLARING, hackElapsed: 7000, hackFeedback: awaiting(), offers: declareOffer, hackFlow: { step: 'sending', side: 'Red' } }) },
  { id: 'hack.declare-not-accepted', group: 'Private Hack', title: 'Target: not accepted, choose again', s: () => state({ ...AS_TARGET, ...DECLARING, hackElapsed: 8000, hackFeedback: awaiting(), offers: declareOffer, hackFlow: { step: 'not-accepted' } }) },
  { id: 'hack.declare-unknown', group: 'Private Hack', title: 'Target: sent, no answer yet (the next view decides)', s: () => state({ ...AS_TARGET, ...DECLARING, hackElapsed: 9000, hackFeedback: awaiting(), offers: declareOffer, hackFlow: { step: 'unknown', side: 'Red' } }) },
  { id: 'hack.declare-accepted', group: 'Private Hack', title: 'Target: declared (the receipt, before the claim\'s view)', s: () => state({ ...AS_TARGET, ...DECLARING, hackElapsed: 7600, hackFeedback: awaiting(), offers: declareOffer, hackFlow: { step: 'accepted', side: 'Red' } }) },
  { id: 'hack.declare-five', group: 'Private Hack', title: 'Target in a room of five', s: () => state({ ...AS_TARGET, ...DECLARING, locations: FIVE_A, hackFeedback: awaiting(), offers: { declare: [VIEWER], move: moveTo } }) },
  { id: 'hack.declare-long-names', group: 'Private Hack', names: 'long', title: 'Target: twelve-character names', s: () => state({ ...AS_TARGET, ...DECLARING, hackFeedback: awaiting(), offers: declareOffer }) },
  { id: 'hack.waiting', group: 'Private Hack', title: 'Initiator: waiting for Player 5 to declare', s: () => state({ ...AS_INITIATOR, ...DECLARING, hackElapsed: 5000, hackFeedback: awaiting(), offers: { move: moveTo } }) },
  { id: 'hack.claim-blue', group: 'Private Hack', title: 'Initiator: Player 5 claims Blue (five seconds)', s: () => state({ ...AS_INITIATOR, ...CLAIMING, hackFeedback: declared('Blue'), offers: { move: moveTo } }) },
  { id: 'hack.claim-red', group: 'Private Hack', title: 'Initiator: Player 5 claims Red', s: () => state({ ...AS_INITIATOR, ...CLAIMING, hackFeedback: declared('Red'), offers: { move: moveTo } }) },
  { id: 'hack.claim-alien', group: 'Private Hack', title: 'Initiator: Player 5 claims Alien', s: () => state({ ...AS_INITIATOR, ...CLAIMING, hackFeedback: declared('Alien'), offers: { move: moveTo } }) },
  { id: 'hack.claim-none', group: 'Private Hack', title: 'Initiator: no side declared', s: () => state({ ...AS_INITIATOR, ...CLAIMING, hackFeedback: undeclared(), offers: { move: moveTo } }) },
  { id: 'hack.claim-late', group: 'Private Hack', title: 'Initiator joins at 3.2 s (a reconnect): the settled claim, no entrance', s: () => state({ ...AS_INITIATOR, ...CLAIMING, hackElapsed: 3200, hackFeedback: declared('Red'), offers: { move: moveTo } }) },
  { id: 'hack.own-claim', group: 'Private Hack', title: 'Target: what you declared, shown to Player 5 only', s: () => state({ ...AS_TARGET, ...CLAIMING, hackFeedback: declared('Red'), offers: { move: moveTo } }) },
  { id: 'hack.own-none', group: 'Private Hack', title: 'Target: time ran out, no side declared', s: () => state({ ...AS_TARGET, ...CLAIMING, hackFeedback: undeclared(), offers: { move: moveTo } }) },
  { id: 'hack.talk', group: 'Private Hack', title: 'Initiator: the full minute\'s talk, the claim beside it', s: () => state({ ...AS_INITIATOR, ...TALKING, hackFeedback: declared('Red') }) },
  { id: 'hack.talk-target', group: 'Private Hack', title: 'Target: the full minute\'s talk', s: () => state({ ...AS_TARGET, ...TALKING, hackFeedback: declared('Red') }) },
  { id: 'hack.talk-none', group: 'Private Hack', title: 'Initiator: the talk after no declaration', s: () => state({ ...AS_INITIATOR, ...TALKING, hackFeedback: undeclared() }) },
  { id: 'hack.public', group: 'Private Hack', title: 'Any other phone during the prelude: the phase only, no partner, no claim', s: () => state({ locations: BUSY_A, active: 5, ...DECLARING, offers: { move: moveTo } }) },
];

/** Public events the fixture panel can deliver to every screen. Each is one public fact. */
export const EVENTS = [
  { id: 'move', label: 'Player 2 moves to Room A', fact: { type: 'PUBLIC_MOVE', seat: 2, location: 'Room A' } },
  { id: 'move-back', label: 'Player 2 moves to Room B', fact: { type: 'PUBLIC_MOVE', seat: 2, location: 'Room B' } },
  { id: 'injure', label: 'Player 5 is now Injured', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 5, health: 'Injured' } },
  { id: 'to-hospital', label: 'Player 5 is now in Hospital', fact: { type: 'PUBLIC_MOVE', seat: 5, location: 'Hospital' } },
  { id: 'eliminate', label: 'Player 4 is now Eliminated', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 4, health: 'Eliminated', revealedFaction: 'Red' } },
  { id: 'recover', label: 'Player 6 is now Healthy', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 6, health: 'Healthy' } },
  { id: 'leave-hospital', label: 'Player 6 is now in Room B', fact: { type: 'PUBLIC_MOVE', seat: 6, location: 'Room B' } },
  { id: 'jail', label: 'Player 8 is sent to Jail', fact: { type: 'PUBLIC_MOVE', seat: 8, location: 'Jail', jailed: true } },
  { id: 'release', label: 'Player 9 is released to Room A', fact: { type: 'PUBLIC_MOVE', seat: 9, location: 'Room A', jailed: false } },
  { id: 'captain', label: 'Player 1 becomes Captain', fact: { type: 'VIEW_CAPTAIN', seat: 1 } },
  { id: 'phase', label: 'Next player’s turn', fact: { type: 'PHASE_CHANGED', next: 'turn' } },
  { id: 'round', label: 'Next round', fact: { type: 'PHASE_CHANGED', next: 'round' } },
  { id: 'replay', label: 'Deliver the last snapshot again', fact: { type: 'REPLAY' } },
  { id: 'reconnect', label: 'Reconnect: a fresh snapshot', fact: { type: 'RECONNECT' } },
  { id: 'close-vote', label: 'The vote closes: its result for five seconds', fact: { type: 'VOTE_CLOSED' } },
  { id: 'result-ends', label: 'The result’s five seconds end: the next phase', fact: { type: 'RESULT_ENDED' } },
  // The declared-side Hack's windows (synthetic): each a public phase change; a participant's view also says what it means for them.
  { id: 'hack-declare-ends', label: 'The declaration window closes: the five-second claim', fact: { type: 'HACK_PHASE', next: 'HACK_RESULT' } },
  { id: 'hack-result-ends', label: 'The claim\u2019s five seconds end: the Hack\u2019s full minute', fact: { type: 'HACK_PHASE', next: 'HACK' } },
  { id: 'hack-ends', label: 'The Hack\u2019s minute ends: the next turn', fact: { type: 'HACK_PHASE', next: 'ORDINARY_TURN' } },
  { id: 'finish', label: 'The match ends: Blue wins', fact: { type: 'MATCH_ENDED', phase: 'FINISHED', result: { winner: 'Blue', alienCoWinner: false }, endReveal: END_REVEAL } },
  { id: 'abort', label: 'The host ends the match', fact: { type: 'MATCH_ENDED', phase: 'ABORTED' } },
];

/**
 * Facts of the seat's own view alone (synthetic), for the fixture panel: nothing public changes with them, except that
 * the Hack partner's accepted declaration also ends the public declaration window, as the server does (the phase, never the claim).
 */
export const PRIVATE_EVENTS = [
  { id: 'guard-granted', label: 'The round resolves: your Protection for Player 5', fact: { type: 'PRIVATE_GUARD_GRANTED', seat: 5 } },
  { id: 'guard-used', label: 'Your Protection for Player 5 is used up', fact: { type: 'PRIVATE_GUARD_USED', seat: 5 } },
  { id: 'hack-declared-blue', label: 'Your Hack partner declares Blue', fact: { type: 'PRIVATE_HACK_DECLARED', side: 'Blue' } },
  { id: 'hack-declared-red', label: 'Your Hack partner declares Red', fact: { type: 'PRIVATE_HACK_DECLARED', side: 'Red' } },
  { id: 'hack-declared-alien', label: 'Your Hack partner declares Alien', fact: { type: 'PRIVATE_HACK_DECLARED', side: 'Alien' } },
  { id: 'hack-audience', label: 'Your view stops carrying the Hack (the audience changes)', fact: { type: 'PRIVATE_HACK_CLEARED' } },
];

export const scenario = id => SCENARIOS.find(entry => entry.id === id) ?? SCENARIOS[0];

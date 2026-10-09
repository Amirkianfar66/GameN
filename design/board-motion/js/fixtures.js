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

/** The nine crew characters (design/contract/crew-catalog.json) and a public flourish each: how it settles after landing. */
export const CREW = [
  { id: 'c1', sign: 'Vega', settle: -3, hop: 6 },
  { id: 'c2', sign: 'Rigel', settle: 2, hop: 4 },
  { id: 'c3', sign: 'Lyra', settle: -2, hop: 8 },
  { id: 'c4', sign: 'Atlas', settle: 1, hop: 3 },
  { id: 'c5', sign: 'Orion', settle: -1, hop: 4 },
  { id: 'c6', sign: 'Nova', settle: 3, hop: 7 },
  { id: 'c7', sign: 'Juno', settle: -2, hop: 5 },
  { id: 'c8', sign: 'Mira', settle: 2, hop: 6 },
  { id: 'c9', sign: 'Echo', settle: -3, hop: 4 },
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

/** A whole synthetic state: public facts, the viewer's private facts, the action flow and what is open. */
function state({ count = 9, locations, seats: change = () => {}, round = 2, phase = 'ORDINARY_TURN', active = VIEWER, seconds = 42, role = count === 9 ? 'Officer' : 'Insider', offers = {}, flow = { step: 'idle' }, view = 'board', ballot = null, tally = null, knowledge = [], hackPartner = null, answer = 'accept', banner = null, legacy = false, notice = null, pending = 0 }) {
  const seats = seatsFor(count, locations);
  change(seats);
  return {
    public: { playerCount: count, round, phase: { kind: phase, seconds }, active: ['ORDINARY_TURN', 'HACK', 'RELEASE_CHOICE'].includes(phase) ? active : null, seats, ballot, tally },
    private: { role, offers: { pass: phase === 'ORDINARY_TURN' && active === VIEWER && !legacy, move: [], ...offers }, knowledge, hackPartner, pending },
    flow, view, answer, banner, legacy, notice,
  };
}

const roomOf = (seats, n) => seats.find(seat => seat.n === n).location;
const sameRoom = (count = 9, locations = SPREAD, self = VIEWER) => seatsFor(count, locations).filter(seat => seat.location === roomOf(seatsFor(count, locations), self) && seat.n !== self).map(seat => seat.n);
/** Room A holds seats 1, 3 (the viewer), 5 and 8 in these scenarios, so a same-room action has three people to name. */
const BUSY_A = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Jail'];
const CROWD_A = ['Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Hospital', 'Jail'];
const ALL_A = Array(9).fill('Room A');
const CROWD_HOSPITAL = ['Hospital', 'Hospital', 'Room A', 'Hospital', 'Hospital', 'Hospital', 'Command Room', 'Hospital', 'Room B'];
const FINAL = Array(9).fill('Final Zone');
const HOSPITAL_8 = Array.from({ length: 9 }, (_, index) => (index + 1 === VIEWER ? 'Room A' : 'Hospital'));
const EVERYONE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OTHERS = EVERYONE.filter(n => n !== VIEWER);
const moveTo = ['Room B'];

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

  // ---------- the tray ----------
  { id: 'tray.open', group: 'Actions tray', title: 'Actions tray: what the view opens, over the board', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, view: 'actions', offers: { move: moveTo, shot: [1, 5, 8], hack: [1, 5, 8], scan: [1, 3, 5, 8], code: true } }) },
  { id: 'tray.empty', group: 'Actions tray', title: 'Actions tray: nothing open', s: () => state({ active: 5, role: 'Insider', view: 'actions', offers: {} }) },

  // ---------- one target ----------
  { id: 'shot.choose', group: 'One target', title: 'Shot: eligible characters on the board', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },
  { id: 'shot.confirm', group: 'One target', title: 'Shot: one character chosen, confirm in the strip', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'confirming', kind: 'shot', picked: [5] } }) },
  { id: 'shot.pending', group: 'One target', title: 'Shot: sending', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'submitting', kind: 'shot', picked: [5] } }) },
  { id: 'shot.registered', group: 'One target', title: 'Shot: registered (not a result)', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'accepted', kind: 'shot', picked: [5] } }) },
  { id: 'shot.rejected', group: 'One target', title: 'Shot: not accepted', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'rejected', kind: 'shot', picked: [5], code: 'NOT_ALLOWED' } }) },
  { id: 'shot.unknown', group: 'One target', title: 'Shot: result unknown', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, flow: { step: 'unknown', kind: 'shot', picked: [5] } }) },
  { id: 'disable.choose', group: 'One target', title: 'Disable: eligible characters', s: () => state({ locations: BUSY_A, role: 'Red Disabler', offers: { move: moveTo, disable: [1, 5, 8] }, flow: { step: 'choosing', kind: 'disable', picked: [] } }) },
  { id: 'protect.choose', group: 'One target', title: 'Protection: yourself included', s: () => state({ locations: BUSY_A, role: 'Undercover', offers: { move: moveTo, protect: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'protect', picked: [] } }) },
  { id: 'rescue.choose', group: 'One target', title: 'Rescue: a character in the Hospital', s: () => state({ locations: BUSY_A, role: 'Cracker', offers: { move: moveTo, rescue: [6] }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'rescue.self', group: 'One target', title: 'Rescue: yourself, injured', s: () => state({ locations: BUSY_A, role: 'Cracker', seats: s => { s[2].health = 'Injured'; }, offers: { rescue: [3] }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'hack.choose', group: 'One target', title: 'Hack request: eligible characters', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, hack: [1, 5, 8] }, flow: { step: 'choosing', kind: 'hack', picked: [] } }) },
  { id: 'hack.phase', group: 'One target', title: 'Hack phase: its own full minute', s: () => state({ locations: BUSY_A, role: 'Hacker', phase: 'HACK', seconds: 60, hackPartner: 5, offers: {}, view: 'card' }) },
  { id: 'showdown.choose', group: 'One target', title: 'Showdown shot in the Final Zone', s: () => state({ locations: FINAL, phase: 'SHOWDOWN', round: 5, seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; s[5].health = 'Healthy'; }, offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8, 9] }, flow: { step: 'choosing', kind: 'showdown-shot', picked: [] } }) },

  // ---------- crowded rooms: every character the rules allow is a target ----------
  { id: 'crowd.shot', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Shot at any of eight', s: () => state({ locations: ALL_A, seats: s => { s[6].captain = false; }, offers: { move: moveTo, shot: OTHERS }, flow: { step: 'choosing', kind: 'shot', picked: [] } }) },
  { id: 'crowd.disable', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Disable at any of eight', s: () => state({ locations: ALL_A, role: 'Red Disabler', seats: s => { s[6].captain = false; }, offers: { move: moveTo, disable: OTHERS }, flow: { step: 'choosing', kind: 'disable', picked: [] } }) },
  { id: 'crowd.protect', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: Protection for any of nine', s: () => state({ locations: ALL_A, role: 'Undercover', seats: s => { s[6].captain = false; }, offers: { move: moveTo, protect: EVERYONE }, flow: { step: 'choosing', kind: 'protect', picked: [] } }) },
  { id: 'crowd.rescue', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: Eight in the Hospital: a Rescue for any of them', s: () => state({ locations: HOSPITAL_8, role: 'Cracker', active: 3, seats: s => { for (const seat of s) if (seat.n !== VIEWER) seat.health = 'Injured'; s[6].captain = false; }, offers: { rescue: OTHERS }, flow: { step: 'choosing', kind: 'rescue', picked: [] } }) },
  { id: 'crowd.hack', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Hack request with any of eight', s: () => state({ locations: ALL_A, role: 'Hacker', seats: s => { s[6].captain = false; }, offers: { move: moveTo, hack: OTHERS }, flow: { step: 'choosing', kind: 'hack', picked: [] } }) },
  { id: 'crowd.scan', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: a Scan of any of nine', s: () => state({ locations: ALL_A, role: 'Hacker', seats: s => { s[6].captain = false; }, offers: { move: moveTo, scan: EVERYONE }, flow: { step: 'choosing', kind: 'scan', picked: [] } }) },
  { id: 'crowd.supply', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: Supply, one chosen', s: () => state({ locations: ALL_A, role: 'Supplier', round: 3, seats: s => { s[6].captain = false; }, offers: { move: moveTo, supply: EVERYONE }, flow: { step: 'choosing', kind: 'supply', picked: [9] } }) },
  { id: 'crowd.vote', group: 'Crowded rooms', status: 'layout-stress', title: 'Layout stress: All nine in Room A: nine candidates, all reachable', s: () => state({ locations: ALL_A, phase: 'CAPTAIN_ELECTION', seconds: 51, round: 2, seats: s => { s[6].captain = false; }, ballot: { voters: EVERYONE, targets: EVERYONE, release: null }, offers: { vote: { targets: EVERYONE, on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },

  // ---------- several parts ----------
  { id: 'scan.choose', group: 'Several parts', title: 'Scan: choose a character', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'scan', picked: [] } }) },
  { id: 'scan.faction', group: 'Several parts', title: 'Scan: guess a faction inline', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo, scan: [1, 3, 5, 8] }, flow: { step: 'choosing', kind: 'scan', picked: [8] } }) },
  { id: 'scan.result', group: 'Several parts', title: 'Scan: accepted; the result is private, in the card', s: () => state({ locations: BUSY_A, role: 'Hacker', offers: { move: moveTo }, view: 'card', knowledge: ['Round 2: you scanned Player 8, guessing Red. The guess was right, and that player is not in the Code.'] }) },
  { id: 'supply.first', group: 'Several parts', title: 'Supply: choose the first of two', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'choosing', kind: 'supply', picked: [] } }) },
  { id: 'supply.second', group: 'Several parts', title: 'Supply: one chosen, choose the second', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'choosing', kind: 'supply', picked: [1] } }) },
  { id: 'supply.confirm', group: 'Several parts', title: 'Supply: two chosen, confirm', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: moveTo, supply: [1, 5, 8] }, flow: { step: 'confirming', kind: 'supply', picked: [1, 8] } }) },
  { id: 'supply.ack', group: 'Several parts', title: 'Supply: the acknowledgment, private, in the card', s: () => state({ locations: BUSY_A, role: 'Supplier', round: 4, offers: {}, view: 'card', knowledge: ['Your Round 3 Supply granted one weapon each to Player 1 and Player 8.'] }) },
  { id: 'code.two', group: 'Several parts', title: 'Code attempt: two of four chosen', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: moveTo, code: true }, flow: { step: 'choosing', kind: 'code', picked: [6, 2] } }) },
  { id: 'code.four', group: 'Several parts', title: 'Code attempt: four chosen, confirm', s: () => state({ locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: moveTo, code: true }, flow: { step: 'confirming', kind: 'code', picked: [6, 2, 9, 7] } }) },

  // ---------- ballots ----------
  { id: 'vote.election', group: 'Ballots', title: 'Captain election: tap a candidate, or abstain', s: () => state({ phase: 'CAPTAIN_ELECTION', seconds: 51, round: 2, seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, ballot: { voters: [1, 2, 3, 4, 5, 6, 7, 8, 9], targets: [1, 2, 3, 4, 5, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 7, 8], on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.runoff', group: 'Ballots', title: 'Captain election again, among the tied', s: () => state({ phase: 'CAPTAIN_ELECTION', seconds: 58, round: 2, seats: s => { s[6].captain = false; s[6].location = 'Room B'; }, ballot: { voters: [1, 2, 3, 4, 5, 6, 7, 8, 9], targets: [2, 7], release: null }, offers: { vote: { targets: [2, 7], on: 'CAPTAIN_ELECTION' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.jail', group: 'Ballots', title: 'Jail vote: tap a player, or abstain', s: () => state({ phase: 'JAIL_VOTE', seconds: 37, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'choosing', kind: 'vote', picked: [] } }) },
  { id: 'vote.recorded', group: 'Ballots', title: 'Ballot recorded (not a result)', s: () => state({ phase: 'JAIL_VOTE', seconds: 21, ballot: { voters: EVERYONE, targets: [1, 2, 3, 4, 5, 6, 7, 8], release: null }, offers: { vote: { targets: [1, 2, 3, 4, 5, 6, 7, 8], on: 'JAIL_VOTE' } }, flow: { step: 'accepted', kind: 'vote', picked: [4] } }) },
  { id: 'vote.tally', group: 'Ballots', title: 'The count, published when the vote closes', s: () => state({ active: 1, round: 3, locations: ['Room A', 'Room B', 'Room A', 'Jail', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Room B'], seats: s => { s[8].jailed = false; }, tally: { kind: 'JAIL_VOTE', counts: { 4: 4, 2: 1, 8: 1 }, eligible: 7, selected: 4 }, offers: { move: moveTo } }) },
  { id: 'release.choice', group: 'Ballots', title: 'Captain’s release request: a jailed character', s: () => state({ phase: 'RELEASE_CHOICE', seconds: 49, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], seats: s => { s[6].captain = false; s[2].captain = true; }, ballot: { voters: [], targets: [], release: null }, offers: { 'release-choice': [9] }, flow: { step: 'choosing', kind: 'release-choice', picked: [] } }) },
  { id: 'release.vote', group: 'Ballots', title: 'Release vote: Yes, No or Abstain inline', s: () => state({ phase: 'RELEASE_VOTE', seconds: 44, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true }, flow: { step: 'choosing', kind: 'release-vote', picked: [] } }) },

  // ---------- movement ----------
  { id: 'move.tags', group: 'Movement', title: 'Room name tags are the move controls', s: () => state({ seats: s => { s[6].captain = false; s[6].location = 'Room B'; s[2].captain = true; }, offers: { move: ['Room B', 'Command Room'] } }) },
  { id: 'move.confirm', group: 'Movement', title: 'Room B pressed: a tentative place, then confirm', s: () => state({ offers: { move: ['Room B'] }, flow: { step: 'confirming', kind: 'move', picked: ['Room B'] } }) },
  { id: 'move.pending', group: 'Movement', title: 'Move: sending', s: () => state({ offers: { move: ['Room B'] }, flow: { step: 'submitting', kind: 'move', picked: ['Room B'] } }) },
  { id: 'move.accepted', group: 'Movement', title: 'Move accepted; the piece moves with the public update', s: () => state({ offers: { move: [] }, flow: { step: 'accepted', kind: 'move', picked: ['Room B'] }, seats: s => { s[2].location = 'Room B'; } }) },
  { id: 'move.refused', group: 'Movement', title: 'A room you cannot move to', s: () => state({ offers: { move: ['Room B'] }, notice: SHELL.cannotMove }) },

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
  { id: 'robust.stale', group: 'Robustness', title: 'Connection lost: actions paused, private cues gone', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, banner: 'stale' }) },
  { id: 'robust.dropped', group: 'Robustness', title: 'Backgrounded while choosing: the choice was not sent', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 5, 8] }, notice: COPY.choiceDropped }) },
  { id: 'robust.withdrawn', group: 'Robustness', title: 'A fresh view no longer offers a chosen character', s: () => state({ locations: BUSY_A, offers: { move: moveTo, shot: [1, 8] }, flow: { step: 'choosing', kind: 'shot', picked: [] }, notice: PROPOSED.noLongerOffered(5) }) },
  { id: 'robust.queued', group: 'Robustness', title: 'One command at a time: an earlier one is still registered', s: () => state({ locations: BUSY_A, offers: { move: moveTo }, pending: 1, view: 'actions' }) },
];

/** Public events the fixture panel can deliver to every screen. Each is one public fact. */
export const EVENTS = [
  { id: 'move', label: 'Player 2 moves to Room A', fact: { type: 'PUBLIC_MOVE', seat: 2, location: 'Room A' } },
  { id: 'move-back', label: 'Player 2 moves to Room B', fact: { type: 'PUBLIC_MOVE', seat: 2, location: 'Room B' } },
  { id: 'injure', label: 'Player 5 is now Injured', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 5, health: 'Injured' } },
  { id: 'to-hospital', label: 'Player 5 is now in Hospital', fact: { type: 'PUBLIC_MOVE', seat: 5, location: 'Hospital' } },
  { id: 'eliminate', label: 'Player 4 is now Eliminated', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 4, health: 'Eliminated', revealedFaction: 'Red' } },
  { id: 'jail', label: 'Player 8 is sent to Jail', fact: { type: 'PUBLIC_MOVE', seat: 8, location: 'Jail', jailed: true } },
  { id: 'release', label: 'Player 9 is released to Room A', fact: { type: 'PUBLIC_MOVE', seat: 9, location: 'Room A', jailed: false } },
  { id: 'captain', label: 'Player 1 becomes Captain', fact: { type: 'VIEW_CAPTAIN', seat: 1 } },
  { id: 'phase', label: 'Next player’s turn', fact: { type: 'PHASE_CHANGED', next: 'turn' } },
  { id: 'round', label: 'Next round', fact: { type: 'PHASE_CHANGED', next: 'round' } },
  { id: 'replay', label: 'Deliver the last snapshot again', fact: { type: 'REPLAY' } },
  { id: 'reconnect', label: 'Reconnect: a fresh snapshot', fact: { type: 'RECONNECT' } },
];

export const scenario = id => SCENARIOS.find(entry => entry.id === id) ?? SCENARIOS[0];

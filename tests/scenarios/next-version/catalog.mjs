// The acceptance cases for the owner's specification of 13 October 2026 (see spec.mjs), written
// before any engine plays it. A case here is a specification of one situation: where everybody
// is, what is sent and when, and what must then be true and visible. It is not a fixture in the
// executable format of the Version 1 catalogue, because the commands it needs do not exist yet,
// and it has never been run. `npm run materialize --workspace @mothership/balance` writes one file
// per number of players from this catalogue; a test holds the files to it.
//
// Every expectation is derived from the packet and from the rules the packet keeps. Where the
// packet does not settle a point, the case says so (`basis: 'reading'`) and names the finding in
// docs/balance/next-version/README.md that reports it.

export const NEXT_VERSION_FILES = { 7: 'mode-7.acceptance.json', 8: 'mode-8.acceptance.json', 9: 'mode-9.acceptance.json' };
export const MODES = [7, 8, 9];

const ROLE_ORDER = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler', 'Officer'];
const FACTION = { Insider: 'Blue', Cracker: 'Blue', 'Blue Disabler': 'Blue', Supplier: 'Blue', Officer: 'Blue', Undercover: 'Red', Hacker: 'Red', 'Red Disabler': 'Red', Alien: 'Alien' };

/** The seats of this suite: player number n holds the n-th role of the engine's canonical order. */
export const roster = mode => ROLE_ORDER.slice(0, mode).map((role, index) => ({ seat: index + 1, role, faction: FACTION[role] }));

/** What differs between the three games and is used in the wording of a case. */
export function factsOf(mode) {
  const votes = voters => Math.ceil(voters / 2);
  return {
    mode,
    two: mode >= 8,              // a second Disabler exists
    officer: mode === 9,
    last: ROLE_ORDER[mode - 1],  // the role with the highest player number
    need: votes(mode),           // ballots that jail when everybody may vote
    votes,
    hospitalSlots: mode,
  };
}

// The layouts the cases start from. Each is a legal starting draw: any assignment with at most
// five players in a room is (BAL-OD-1). The slot numbers assume that the players of a starting
// room hold its lowest slots in order of player number, which the packet does not state (NV-F-06).
export const LAYOUTS = {
  MIX: {
    title: 'Both sides in Room A',
    rooms: mode => ({
      'Room A': ['Cracker', 'Blue Disabler', 'Undercover', 'Alien', ...(mode >= 8 ? ['Red Disabler'] : [])],
      'Room B': ['Insider', 'Supplier', 'Hacker', ...(mode === 9 ? ['Officer'] : [])],
    }),
  },
  ARMS: {
    title: 'Supplier in Room A, so that players of Room A can be armed in Round 3',
    rooms: mode => ({
      'Room A': ['Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Alien'],
      'Room B': ['Insider', 'Hacker', ...(mode >= 8 ? ['Red Disabler'] : []), ...(mode === 9 ? ['Officer'] : [])],
    }),
  },
  SPLIT: {
    title: 'The two Disablers in different rooms (eight and nine players)',
    rooms: mode => ({
      'Room A': ['Cracker', 'Blue Disabler', 'Undercover', 'Alien', ...(mode === 9 ? ['Officer'] : [])],
      'Room B': ['Insider', 'Supplier', 'Hacker', 'Red Disabler'],
    }),
  },
  PAIRS: {
    title: 'Three and three, for six hurt players at nine (nine players)',
    rooms: () => ({
      'Room A': ['Cracker', 'Blue Disabler', 'Supplier', 'Alien'],
      'Room B': ['Insider', 'Undercover', 'Hacker', 'Red Disabler', 'Officer'],
    }),
  },
};

const STATUSES = {
  specified: 'Specified, not run. No engine plays the specification of 13 October 2026.',
  synthetic: 'Specified, not run. No legal play reaches this state; a test of it needs a constructed state.',
  manual: 'Not run. The evidence must come from people or devices.',
};
export const STATUS_TEXT = STATUSES;
export const BASES = {
  stated: 'The packet states the outcome.',
  kept: 'A rule of the earlier versions states it, and the packet keeps that rule.',
  derived: 'Follows from what the packet states and the rules it keeps, taken together.',
  reading: 'Neither the packet nor a kept rule settles it, or two passages disagree. The expectation is the reading this audit recommends; the other outcome is given beside it, and a finding reports the point.',
};
export const LAYERS = {
  engine: 'The rules engine',
  service: 'The service: receipts, retries, deadlines, reconnection',
  client: 'The phone and the shared display',
  table: 'People at a table',
};
export const VERSION = 'next: the specification of 13 October 2026. No protocol, ruleset or engine version is allocated.';

// The moments every case uses. V: the commit that closes the Jail vote. W: the commit that closes
// its result and opens the window. X: the commit that closes the window and resolves the round.
const CLOCK = 'Result [V, V + 5 s). Window from W ≥ V + 5 s: lit [W, W + 5 s), dark [W + 5 s, W + 15 s). The round resolves at X ≥ W + 15 s.';
const NO_CLOCK = 'Nothing of its own: the round keeps the schedule of BLK-01.';
// A match that reaches the Round 5 check with equal Power, and so the showdown: used by the Clone and showdown cases.
const TIE = m => `Layout MIX. Nobody was hurt in Rounds 1 to 4. ${m.mode === 8
  ? 'The votes of Rounds 1 and 2 jailed the Insider and the Supplier.'
  : 'The votes of Rounds 1, 2 and 3 jailed the Insider, the Supplier and the Cracker.'} The election before Round 2 elected the Hacker, who is in Command Room. Neither command was used. No Code was submitted.`;
const R5_SHOT = 'Round 5: Undercover\'s shot injures the Alien, who is in Hospital when the round has resolved.';

const list = [];
const add = (code, title, spec) => { list.push({ code, title, ...spec }); };

// ---------------------------------------------------------------------------------------------
// BLK: the vote result, the Blackout window and what a Blackout does
// ---------------------------------------------------------------------------------------------
add('BLK-01', 'The window runs in a round in which nobody asked for a Blackout', {
  refs: ['G-01', 'Q-B01', 'Q-B02a', 'Q-B03a', 'Q-D02'], rules: ['VOTE-RESULT-03', 'VOTE-RESULT-04'], basis: 'stated',
  given: ['Layout MIX. Round 1. No Blackout is requested.'],
  when: ['The turns end.', 'The Jail vote closes at V and jails nobody.', 'Result, window, resolution.'],
  then: ['Nobody changes health, room or slot between V and the next round.', m => `No Blackout use is spent: ${m.two ? 'both Disablers keep theirs' : 'the Blue Disabler keeps theirs'}.`],
  sees: ['Every seat, the host and the shared display get the same phase and the same lighting in every room.', 'No seat is offered a selection.', 'No payload says, or lets anyone work out, that nobody had asked.'],
  timing: [CLOCK, 'The window is neither skipped nor shortened.'],
  needs: ['BE-04', 'BE-05', 'FE-04'], controls: ['V13-01', 'V14-01'],
});
add('BLK-02', 'One request, one hit: the table sees the same window as with none', {
  refs: ['G-01', 'G-07', 'Q-B01', 'Q-B02c', 'Q-B03a', 'Q-D02', 'Q-H04'], rules: ['R-STATE-01', 'R-ACT-08'], basis: 'stated', pair: 'BLK-01',
  given: ['Layout MIX. Round 1.'],
  when: ['Blue Disabler, own turn: requests a Blackout. It names nobody.', 'The turns end. The Jail vote closes at V and jails nobody.', 'In darkness the Blue Disabler selects Room A slot 3, where Undercover stood at the snapshot.', 'The window ends. The round resolves.'],
  then: ['Undercover: Injured, in Hospital, slot 1. Injury episode: admitted in Round 1, due at the end of Round 2.', 'Room A slot 3 is empty; nobody else changed slot.', 'Blue Disabler: the Blackout use is spent; the Main Action of that turn is used.'],
  sees: ['Until X the public view, the shared display and every seat but the Blue Disabler read exactly what they read in BLK-01 at the same moments.', 'The request, its admission, the selection and its receipt are in the Blue Disabler\'s private view only.', 'After X: Undercover\'s health and place are public, with no cause, source, direction or room of origin.'],
  timing: [CLOCK, 'The same instants as BLK-01, whenever the selection is made.'],
  needs: ['BE-04', 'BE-05', 'BE-06', 'BE-09', 'FE-04'], controls: ['V13-05'],
});
add('BLK-03', 'Selecting at the first instant of darkness shortens nothing', {
  refs: ['G-01', 'Q-B03a'], rules: [], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['The Blue Disabler selects Room A slot 3 at W + 5 s exactly.'],
  then: ['The selection is accepted and final.', 'The outcome is that of BLK-02.'],
  sees: ['Nothing public changes at the moment of selection: no phase change, no lighting change, no revision of anyone else\'s view.'],
  timing: ['Accepted at W + 5 s, the first instant of the dark interval.', 'The window still ends at W + 15 s and the round does not resolve before it.'],
  needs: ['BE-04', 'BE-05'],
});
add('BLK-04', 'A selection sent in the lit preview is refused and locks nothing', {
  refs: ['G-01', 'Q-B03'], rules: ['R-ACT-09'], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['The Blue Disabler sends Room A slot 3 at W + 2 s.', 'The Blue Disabler sends Room A slot 3 again at W + 7 s.'],
  then: ['The first is refused: nothing is spent and no selection is locked.', 'The second is accepted and final. The outcome is that of BLK-02; the use is spent once.'],
  sees: ['The refusal is the sender\'s own receipt and nobody else\'s.'],
  timing: ['Selections are accepted only in [W + 5 s, W + 15 s).'],
  needs: ['BE-04', 'BE-05'],
});
add('BLK-05', 'A selection at the instant the window ends is too late', {
  refs: ['G-01', 'Q-B03', 'Q-B03b'], rules: [], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['The Blue Disabler sends Room A slot 3 at W + 15 s exactly and nothing before.'],
  then: ['Refused: the dark interval is half open.', 'The admitted request ends as a miss: no damage, no replacement target.', 'The Blackout use is spent.'],
  sees: ['No public trace of the miss.'],
  timing: ['The last accepted instant is the last server instant before W + 15 s.'],
  needs: ['BE-04', 'BE-05'],
});
add('BLK-06', 'The first valid selection is final', {
  refs: ['G-01', 'Q-B03'], rules: [], basis: 'stated', layer: 'service',
  given: ['As BLK-02.'],
  when: ['Slot 3 at W + 6 s.', 'Slot 1 at W + 8 s, as a new command.', 'The first command again, with its own command identifier, at W + 9 s.'],
  then: ['Slot 3 is accepted.', 'Slot 1 is refused and replaces nothing.', 'The repeat returns the receipt of the first command and changes nothing.', 'One attack, on the frozen occupant of slot 3; the use is spent once.'],
  sees: ['Only the Blue Disabler reads any of the three answers.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-11'],
});
add('BLK-07', 'Inputs that are wrong lock nothing, and the deadline still applies', {
  refs: ['G-01', 'Q-B03', 'Q-B03b', 'Q-B03f'], rules: ['R-ACT-09'], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['In darkness the Blue Disabler sends, one after another: a slot of Room B; a slot of Jail; a slot of Hospital; slot 6 of Room A; a selection that names an earlier snapshot.', 'Nothing else is sent before W + 15 s.'],
  then: ['Each is refused. None locks a selection and none spends the use at that moment.', 'At the deadline the request ends as a miss and the use is spent once.', 'Nobody is hurt.'],
  sees: ['No public trace.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-09'], needs: ['BE-05'],
});
add('BLK-08', 'No selection at all, with the phone offline through the window', {
  refs: ['G-01', 'Q-B03b'], rules: ['R-OPS-01'], basis: 'stated', layer: 'service',
  given: ['As BLK-02, and the Blue Disabler\'s phone loses its connection before W.'],
  when: ['The window runs to its end without a selection.'],
  then: ['A miss: no damage, no random target, no retry in a later round.', 'The Blackout use is spent.'],
  sees: ['No public trace. The Blue Disabler reads the spent use on reconnecting.'],
  timing: ['The window is not paused or extended for the missing phone.'],
  needs: ['BE-05', 'BE-11', 'FE-04'],
});
add('BLK-09', 'An empty position, also when its occupant left before the window', {
  refs: ['G-01', 'Q-B02c', 'Q-B03f'], rules: [], basis: 'stated',
  given: ['Layout MIX. Round 1.'],
  when: ['Blue Disabler, own turn: requests a Blackout.', m => `During a later turn the Alien moves to Room B and takes slot ${m.officer ? 5 : 4} there. Room A slot 4 is now empty.`, 'In darkness the Blue Disabler selects Room A slot 4.'],
  then: ['A miss: accepted, final, no damage.', 'The Alien, in Room B, is not hurt: a Blackout has no named target and no replacement.', 'The Blackout use is spent.'],
  sees: ['The empty position is offered like every other position. No public trace of the miss.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-05', 'FE-04'],
});
add('BLK-10', 'The Disabler\'s own position', {
  refs: ['G-01', 'Q-B03d'], rules: [], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['In darkness the Blue Disabler selects Room A slot 2, their own.', 'Then sends slot 3.'],
  then: ['Slot 2 is accepted and final: a miss, no damage to the Blue Disabler or to anyone.', 'Slot 3 is refused: there is no second try.', 'The Blackout use is spent.'],
  sees: ['The own position is neutral and selectable in darkness, with no warning, label or highlight.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'FE-04'],
});
add('BLK-11', 'A position held by a player Eliminated in an earlier round', {
  refs: ['G-01', 'G-07', 'Q-B03e', 'Q-H04'], rules: ['R-ACT-06', 'R-CAP-24'], basis: 'derived',
  given: ['Layout ARMS. The election after Round 1 elects the Alien. Round 3: the Alien moves out to Room A and takes slot 5; Supplier arms the Cracker and the Blue Disabler. Round 4: the Cracker and Undercover each register a shot at the Alien in Room A, and the Alien then moves into Command Room. The Alien is Eliminated, and the body is seated in Room A slot 5 (HSP-20).'],
  when: ['Round 5. Blue Disabler, own turn, in Room A, with the Blackout unspent: requests a Blackout.', 'In darkness the Blue Disabler selects Room A slot 5, where the Alien\'s body lies.'],
  then: ['The selection is the miss of a position held by a player who was already Eliminated when the snapshot was taken: no further effect, no replacement target.', 'The Blackout use is spent.'],
  other: ['If the transfer to Hospital at the first hit is taken to decide where this body lies too (HSP-20, NV-F-01), slot 5 is empty and this is the miss of an empty position, as in BLK-09.'],
  sees: ['No public trace of the miss. The lit preview shows the body in slot 5.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-02', 'BE-05', 'BE-09'],
});
add('BLK-12', 'Jailed before the window: the request is cancelled and the use is kept', {
  refs: ['G-01', 'Q-B02a', 'Q-B02b'], rules: ['R-VOTE-03'], basis: 'stated', pair: 'BLK-01',
  given: ['Layout MIX. Round 1.'],
  when: ['Blue Disabler, own turn: requests a Blackout.', m => `Jail vote: ${m.need} of ${m.mode} ballots name the Blue Disabler. It closes at V.`, 'Result, window, resolution.'],
  then: ['Blue Disabler: Jailed at V, in Jail slot 1. Room A slot 2 is empty.', 'The request is cancelled before admission. No attack exists and nobody is hurt.', 'The Blackout use is NOT spent.', 'The request does not come back in a later round by itself.'],
  sees: ['Public: the tally, and the Blue Disabler in Jail.', 'From V on, the public view, the shared display and every other seat read what they read in a run in which the jailed player had asked for nothing.', 'The Blue Disabler gets no selection control, and reads privately that the use is still theirs.', 'There is no public sign of a cancellation.'],
  timing: [CLOCK],
  needs: ['BE-05', 'BE-06'],
});
add('BLK-13', 'The kept use, used in a later round after a RELEASE', {
  refs: ['G-01', 'G-06', 'Q-B02b', 'Q-P02'], rules: ['R-CAPT-01', 'R-CAPT-05'], basis: 'derived',
  given: ['The end of BLK-12. The election after Round 1 elects the Insider, who is placed in Command Room.'],
  when: ['Round 2. Insider, own turn: RELEASE.', 'Blue Disabler, own turn, later in the same round: requests a Blackout.', 'In darkness the Blue Disabler selects Room A slot 3.'],
  then: ['The release puts the Blue Disabler in Room A slot 2, the lowest free slot of the room they remember.', 'The request is accepted: the player is Healthy and free on their own turn and the use is unspent.', 'Undercover: Injured, Hospital slot 1, admitted in Round 2, due at the end of Round 3.', 'The Blackout use is spent now.'],
  sees: ['The release is public. The request and the selection are private.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-10'],
});
add('BLK-14', 'A cancelled Disabler\'s ordinary shot of the same round still resolves', {
  refs: ['G-01', 'Q-B02b'], rules: ['R-ACT-05', 'R-SHOT-03', 'R-ROLE-07'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Blue Disabler and the Alien.'],
  when: ['Round 4. Blue Disabler, own turn: requests a Blackout and registers a shot at Undercover (Room A slot 4).', m => `Jail vote: ${m.need} of ${m.mode} ballots name the Blue Disabler.`],
  then: ['The Blackout request is cancelled; its use is kept.', 'The shot resolves although its shooter is now in Jail: Undercover is Injured, Hospital slot 1, admitted in Round 4, due at the end of Round 5.', 'The weapon is spent.'],
  sees: ['Undercover\'s injury is public, without a cause.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-15', 'The request follows the Disabler to the room they are in when the window opens', {
  refs: ['G-01', 'Q-B02c', 'Q-B02d', 'Q-M01'], rules: ['R-MOVE-01'], basis: 'stated',
  given: ['Layout MIX. Round 1.'],
  when: ['Blue Disabler, own turn (third): requests a Blackout in Room A.', m => `During the Hacker's turn the Blue Disabler moves to Room B and takes slot ${m.officer ? 5 : 4}.`, 'In darkness the Blue Disabler sends Room A slot 3, then Room B slot 1.'],
  then: ['The request is bound to Room B. The map is Room B\'s as frozen at W.', 'Room A slot 3 is refused as a wrong room and locks nothing.', 'Room B slot 1 is accepted: the Insider is Injured, Hospital slot 1.', 'Nobody in Room A is hurt.'],
  sees: ['The move is public when it is made. Nothing ties it to a request.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-05'],
});
add('BLK-16', 'The snapshot is taken after the vote has placed its prisoner', {
  refs: ['G-01', 'Q-B02a', 'Q-B02d'], rules: ['R-VOTE-01'], basis: 'stated',
  given: ['Layout MIX. Round 1.'],
  when: ['Blue Disabler, own turn: requests a Blackout.', m => `Jail vote: ${m.need} of ${m.mode} ballots name Undercover.`, 'In darkness the Blue Disabler selects Room A slot 3.'],
  then: ['At V Undercover is in Jail slot 1 and Room A slot 3 is empty.', 'The frozen map of Room A has no occupant in slot 3: a miss.', 'Undercover is not hurt. The Blackout use is spent.', 'The vote is not affected by anything in the window.'],
  sees: ['The lit preview shows Room A without Undercover.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-05'],
});
add('BLK-17', 'A Disabler who is Captain and has stepped into Command Room when the window opens', {
  refs: ['G-01', 'Q-B02c', 'Q-B03d', 'Q-B03f'], rules: ['R-CAPT-05', 'R-MOVE-04', 'R-MOVE-05'], basis: 'derived',
  given: ['Layout MIX. The election after Round 1 elects the Blue Disabler. In Round 2 the Blue Disabler moves out to Room A and takes slot 2.'],
  when: ['Round 3. Blue Disabler, own turn, in Room A: requests a Blackout.', 'Later in Round 3 the Blue Disabler moves into Command Room.', 'In darkness the Blue Disabler selects the one position of Command Room, or selects nothing.'],
  then: ['The request is admitted: the player is Healthy and free.', 'It is bound to the room the Disabler is in when the window opens: Command Room, whose one position is the Disabler\'s own.', 'Either way it is a miss, and the Blackout use is spent.'],
  sees: ['No public trace.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'FE-04'],
});
add('BLK-18', 'Two Disablers in two rooms', {
  modes: [8, 9], refs: ['G-01', 'Q-B03c'], rules: ['R-RES-02'], basis: 'stated',
  given: ['Layout SPLIT. Round 1.'],
  when: ['Both Disablers request on their own turns.', 'In darkness the Blue Disabler selects Room A slot 3 (Undercover) and the Red Disabler selects Room B slot 1 (Insider).'],
  then: ['Each request is bound to its own room and its own frozen map.', 'Undercover and the Insider are Injured.', 'Both are in Hospital, in positions 1 and 2.', 'Both uses are spent.'],
  note: ['Which of the two holds position 1 is the question of SLOT-03 (NV-F-03). The attack on Undercover resolves first.'],
  sees: ['One window, the same for everyone. Nothing shows how many requests there were.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-03'], needs: ['BE-02', 'BE-05'],
});
add('BLK-19', 'Both Disablers choose the same occupied position', {
  modes: [8, 9], refs: ['G-01', 'G-07', 'Q-B03c', 'Q-H04'], rules: ['R-RES-02', 'R-ROLE-02', 'R-ACT-07'], basis: 'stated',
  given: ['Layout MIX. Round 1.'],
  when: ['Cracker, own turn: registers a Rescue of Undercover, who is Healthy and in the same room.', 'Both Disablers request on their own turns.', 'In darkness both select Room A slot 3.'],
  then: ['Two attack records are kept and resolved one after the other in turn order.', 'Undercover: Healthy, then Injured, then Eliminated, all in the attack stage.', 'The Rescue stage finds Undercover Eliminated: no effect. The Cracker has one Rescue left.', 'Both Blackout uses are spent.', 'By the letter of the packet the body is in Hospital, where the first hit had put the player (NV-F-01).'],
  other: ['If a player eliminated in the stage that first hurt them keeps their position (NV-F-01), the body lies in Room A slot 3.'],
  sees: ['Public: Undercover Eliminated. Two hits are shown as two outcomes, not merged into one.', 'Undercover\'s faction is shown at the end-of-round reveal.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-05', 'BE-09'],
});
add('BLK-20', 'The same position, and its occupant holds an active Protection', {
  modes: [8, 9], refs: ['G-01', 'G-04', 'Q-B03c', 'Q-B03'], rules: ['R-PROT-02', 'R-PROT-03', 'R-RES-02'], basis: 'stated',
  given: ['Layout MIX. Round 1: Undercover grants Protection to the Cracker. It is active from Round 2.'],
  when: ['Round 2. Both Disablers request on their own turns.', 'In darkness both select Room A slot 1 (Cracker).'],
  then: ['The first attack in turn order is blocked and uses up the Protection.', 'The second injures: the Cracker is in Hospital slot 1, admitted in Round 2, due at the end of Round 3.', 'Both uses are spent.'],
  sees: ['The block is a room event for the seats of Room A (DEF-01). The injury is public.', 'Undercover reads privately that the Protection was used up.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-08'],
});
add('BLK-21', 'The same position, and its occupant is the Alien under an active Clone', {
  modes: [8, 9], refs: ['G-01', 'G-03', 'Q-B03c', 'Q-C01', 'Q-C02a'], rules: ['R-PROT-02'], basis: 'stated',
  given: ['Layout MIX. Round 1: Undercover grants Protection to the Alien. It is active from Round 2.'],
  when: ['Round 2. The Alien, own turn: activates the Clone.', 'Both Disablers request on their own turns.', 'In darkness both select Room A slot 4 (Alien).'],
  then: ['Both attacks are blocked by the Clone.', 'The Clone stays active until Round 3 has resolved.', 'The Protection is not used up and stays active.', 'The Alien is Healthy in Room A slot 4. Both uses are spent.'],
  sees: ['Two block events on the Alien, each to the seats of Room A, each the same as a Protection block.', 'Undercover\'s private record still shows the Protection unused.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-07', 'BE-08'],
});
add('BLK-22', 'One Disabler picks their own position and the other picks the same position', {
  modes: [8, 9], refs: ['G-01', 'Q-B03d'], rules: [], basis: 'stated',
  given: ['Layout MIX. Round 1. Both Disablers request on their own turns.'],
  when: ['In darkness the Blue Disabler selects Room A slot 2, their own. The Red Disabler selects Room A slot 2 as well.'],
  then: ['The Blue Disabler\'s selection is a miss for the Blue Disabler only.', 'The Red Disabler\'s attack stands: the Blue Disabler is Injured, Hospital slot 1.', 'Both uses are spent.'],
  sees: ['The injury is public, without a cause.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-23', 'The two Disablers hit each other', {
  modes: [8, 9], refs: ['G-01', 'Q-B03c'], rules: ['R-ACT-05', 'R-RES-02'], basis: 'stated',
  given: ['Layout MIX. Round 1. Both Disablers request on their own turns.'],
  when: ['In darkness the Blue Disabler selects Room A slot 5 (Red Disabler) and the Red Disabler selects Room A slot 2 (Blue Disabler).'],
  then: ['Both attempts are registered before either resolves.', 'The Blue Disabler\'s attack resolves first and injures the Red Disabler.', 'The Red Disabler\'s attack still resolves, although its actor is now Injured, and injures the Blue Disabler.', 'Both are in Hospital, in positions 1 and 2.'],
  note: ['Which of the two holds position 1 is the question of SLOT-03 (NV-F-03). The attack on the Red Disabler resolves first.'],
  sees: ['Both injuries are public, without causes, in an order that does not follow the attackers.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-03'], needs: ['BE-02', 'BE-05'],
});
add('BLK-24', 'A Blackout and an ordinary shot on one player, and a Rescue registered for them', {
  refs: ['G-01', 'G-07', 'Q-B03', 'Q-H04'], rules: ['R-RES-02', 'R-SHOT-03', 'R-ROLE-02', 'R-ACT-07'], basis: 'stated',
  given: ['Layout MIX. Round 4.'],
  when: ['Cracker, own turn (second): registers a Rescue of the Alien, who is Healthy and in the same room.', 'Blue Disabler, own turn (third): requests a Blackout.', 'Undercover, own turn (fifth): registers a shot at the Alien with their own weapon.', 'In darkness the Blue Disabler selects Room A slot 4 (Alien).'],
  then: ['Attack stage, in turn order, Main Action before Shot: the Blackout injures the Alien; Undercover\'s shot eliminates the Alien.', 'Rescue stage: the Alien is Eliminated; the Rescue has no effect and is spent.', 'The Blackout use and the weapon are spent.', 'By the letter of the packet the body is in Hospital, where the first hit had put the player (NV-F-01).'],
  other: ['If a player eliminated in the stage that first hurt them keeps their position (NV-F-01), the body lies in Room A slot 4.'],
  sees: ['Public: the Alien Eliminated, two outcomes. The faction is shown at the end-of-round reveal.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-05', 'BE-09'],
});
add('BLK-25', 'A third attack on a player who was Eliminated earlier in the same stage', {
  refs: ['G-01', 'Q-B03'], rules: ['R-ACT-06', 'R-SHOT-05', 'R-RES-02'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Blue Disabler and the Alien.'],
  when: ['Round 4. Blue Disabler, own turn: requests a Blackout and registers a shot at the Cracker (Room A slot 1).', 'Undercover, own turn: registers a shot at the Cracker.', 'In darkness the Blue Disabler selects Room A slot 1.'],
  then: ['Player 3\'s Main Action injures the Cracker; player 3\'s Shot eliminates the Cracker.', 'Player 5\'s Shot has no effect. Its target is not changed and its weapon is spent.'],
  sees: ['Public: the Cracker Eliminated. Nothing shows a third attempt.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-26', 'The order in which two selections arrive decides nothing', {
  modes: [8, 9], refs: ['G-01', 'Q-B03c', 'Q-B03'], rules: ['R-RES-02'], basis: 'stated', layer: 'service',
  given: ['As BLK-20, played twice.'],
  when: ['Run one: the Red Disabler\'s selection reaches the server before the Blue Disabler\'s.', 'Run two: after it.'],
  then: ['The final state is the same in both runs.', 'The attacks resolve in the stored turn order in both.'],
  sees: ['Every audience reads the same payloads in both runs, in the same order.'],
  timing: ['The times of the public and room outcomes do not follow the arrival of either selection.'],
  needs: ['BE-05', 'BE-08'],
});
add('BLK-27', 'Reconnecting in darkness', {
  refs: ['G-01', 'G-08', 'Q-D01'], rules: ['R-OPS-01'], basis: 'stated', layer: 'client',
  given: ['As BLK-02. The Blue Disabler\'s phone drops at W + 3 s and returns at W + 9 s.'],
  when: ['On return the Blue Disabler selects Room A slot 3 at W + 11 s.'],
  then: ['Accepted: the request was admitted at W and the dark interval is still open.', 'The outcome is that of BLK-02.'],
  sees: ['On return the phone shows darkness and the remaining time. The lit preview is not replayed.'],
  timing: ['The remaining time is W + 15 s minus the server\'s now, not a fresh ten seconds.'],
  needs: ['BE-11', 'FE-04'],
});
add('BLK-28', 'An accepted selection whose acknowledgement never arrives', {
  refs: ['G-01', 'Q-B03b'], rules: [], basis: 'stated', layer: 'service',
  given: ['As BLK-02. The selection of slot 3 is accepted at W + 8 s and its acknowledgement is lost.'],
  when: ['The phone sends nothing more, or repeats the same command after W + 15 s.'],
  then: ['The accepted selection stands and takes precedence over the timeout: Undercover is Injured.', 'A repeat with the same identifier returns the original receipt, also after the window.'],
  sees: ['Private to the Blue Disabler.'],
  timing: [NO_CLOCK],
  needs: ['BE-11'],
});
add('BLK-29', 'Nobody can select for a Disabler, and nobody without an admitted request can select', {
  refs: ['G-01', 'Q-B01'], rules: ['R-ACT-09'], basis: 'stated',
  given: ['As BLK-02.'],
  when: ['In darkness the Cracker sends Room A slot 3.', m => (m.two ? 'The Red Disabler, who made no request, sends Room A slot 3.' : null)],
  then: ['Refused. Nothing is spent and nothing is locked.', m => (m.two ? 'The Red Disabler\'s use is untouched.' : null), 'The Blue Disabler\'s own selection is unaffected.'],
  sees: ['The refusal is the sender\'s own receipt.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-30', 'One Blackout in a match, hit or miss', {
  refs: ['G-01', 'Q-B03b'], rules: ['R-SETUP-13'], basis: 'stated',
  given: ['After BLK-02, or after any of the misses BLK-05, BLK-09, BLK-10.'],
  when: ['In a later round the Blue Disabler, Healthy and free, requests a Blackout on their own turn.'],
  then: ['Refused. The Main Action of that turn is not used by the refusal.'],
  sees: ['The Blue Disabler\'s private view shows the use as spent from the round it was spent in.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-06'],
});
add('BLK-31', 'When a request can be made', {
  refs: ['G-01', 'Q-B01'], rules: ['R-ACT-01', 'R-STATE-03', 'R-STATE-04', 'R-ROLE-17'], basis: 'stated',
  given: ['Layout ARMS. The Blue Disabler holds an unspent use, and in Round 4 a weapon from Supplier.'],
  when: ['A request on another player\'s turn; in a Hack stage; in the vote, its result or the window.', 'A request while Injured; a request while Jailed.', 'Round 4, own turn, Healthy and free: a request, a shot at Undercover and a Hack request to the Cracker.'],
  then: ['The first five are refused and spend nothing.', 'The last three are all accepted: the request uses the Main Action and leaves Shot and Hack alone.'],
  sees: ['The request has no public cue.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-32', 'A Blackout in Round 5', {
  refs: ['G-01', 'G-07', 'Q-H03a'], rules: ['R-WIN-01', 'R-WIN-10'], basis: 'stated',
  given: ['Layout MIX. Round 5. The Blue Disabler\'s use is unspent.'],
  when: ['Blue Disabler, own turn: requests a Blackout. In darkness selects Room A slot 3 (Undercover).'],
  then: ['Undercover is Injured when Round 5 resolves, in Hospital.', 'No Hospital death is due for this new injury and no round is added.', 'At the Round 5 check Undercover counts nothing for Red Power.', 'If there is no winner, the showdown follows and Undercover takes part from Hospital.'],
  sees: ['As BLK-02.'],
  timing: [CLOCK, 'The window runs in Round 5 as in every round.'],
  needs: ['BE-05', 'BE-09', 'BE-12'],
});
add('BLK-33', 'An attack whose actor is Eliminated earlier in the same stage still resolves', {
  refs: ['G-01', 'G-07', 'Q-B03', 'Q-H04'], rules: ['R-ACT-05', 'R-RES-02', 'R-SHOT-03', 'R-ROLE-07'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Cracker and the Blue Disabler.'],
  when: ['Round 4. Cracker, own turn (second): registers a shot at Undercover (Room A slot 4).', 'Blue Disabler, own turn (third): requests a Blackout.', 'Undercover, own turn (fifth): registers a shot at the Alien with their own weapon.', 'In darkness the Blue Disabler selects Room A slot 4 (Undercover).'],
  then: ['In turn order: the Cracker\'s shot injures Undercover; the Blackout eliminates Undercover.', 'Undercover\'s shot, registered while Undercover was alive, still resolves: the Alien is Injured, in Hospital, admitted in Round 4 and due at the end of Round 5.', 'Both weapons and the Blackout use are spent.', 'By the letter of the packet the body is in Hospital, where the first hit had put the player (NV-F-01).'],
  other: ['If a player eliminated in the stage that first hurt them keeps their position (NV-F-01), Undercover\'s body lies in Room A slot 4.'],
  sees: ['Public: Undercover Eliminated and the Alien Injured, with no cause. Nothing shows that the Alien was hit by a player who was already dead.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-05', 'BE-09'],
});
add('BLK-34', 'A Blackout on an occupant who was alive at the snapshot and is Eliminated earlier in the stage', {
  refs: ['G-01', 'Q-B03'], rules: ['R-ACT-06', 'R-RES-02', 'R-SHOT-03'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Cracker and the Alien.', 'Round 4: the turn order is by player number, except that the Blue Disabler is last.'],
  when: ['Round 4. The Cracker and the Alien each register a shot at Undercover (Room A slot 4) on their own turns.', 'Blue Disabler, own turn (last): requests a Blackout.', 'In darkness the Blue Disabler selects Room A slot 4. Undercover is alive in the snapshot.'],
  then: ['In turn order: the Cracker\'s shot injures Undercover; the Alien\'s shot eliminates Undercover.', 'The Blackout, last, has no further effect and takes no other target.', 'The Blackout use is spent, and both weapons.'],
  sees: ['Public: Undercover Eliminated, two outcomes. Nothing shows a third attempt.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('BLK-35', 'A Protection takes the first of two attacks, and the second injures', {
  refs: ['G-01', 'G-04', 'Q-B03'], rules: ['R-PROT-02', 'R-PROT-03', 'R-RES-02', 'R-SHOT-03'], basis: 'stated',
  given: ['Layout MIX. Round 1: Undercover grants Protection to the Cracker. It is active from Round 2.'],
  when: ['Round 4. Blue Disabler, own turn (third): requests a Blackout. Undercover, own turn (fifth): registers a shot at the Cracker.', 'In darkness the Blue Disabler selects Room A slot 1 (Cracker).'],
  then: ['The Blackout is applied first and is blocked; the Protection is used up.', 'The shot injures: the Cracker is in Hospital, admitted in Round 4, due at the end of Round 5.', 'The Blackout use and the weapon are spent.'],
  sees: ['The block is a room event for the seats of Room A. The injury is public.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-08'],
});
add('BLK-36', 'One request cancelled by the vote and one admitted, in the same window', {
  modes: [8, 9], refs: ['G-01', 'Q-B02b', 'Q-B03c', 'Q-D02'], rules: ['R-VOTE-03'], basis: 'stated',
  given: ['Layout MIX. Round 1. Both Disablers request on their own turns.'],
  when: [m => `Jail vote: ${m.need} of ${m.mode} ballots name the Red Disabler.`, 'In darkness the Blue Disabler selects Room A slot 3 (Undercover).'],
  then: ['At V the Red Disabler is in Jail slot 1. Their request is cancelled and their use is kept.', 'The Blue Disabler\'s request is admitted: Undercover is Injured, in Hospital slot 1. That use is spent.'],
  sees: ['One window, the same for everyone as in BLK-01. Nothing shows that there were two requests, or that one was cancelled.'],
  timing: [CLOCK],
  needs: ['BE-05', 'BE-06'],
});
add('BLK-37', 'A requester who is no longer Healthy when the window opens', {
  refs: ['G-01', 'Q-B02b'], rules: [], basis: 'stated', status: 'synthetic',
  given: ['A constructed state: at W a Disabler has a request of this round pending and is Injured.'],
  when: ['The window opens.'],
  then: ['The request is cancelled before admission. The use is kept, and there is no public sign.', 'By legal play this state does not arise: nothing deals damage between a request and the window of the same round. Only the vote of the round makes a requester ineligible (BLK-12).'],
  sees: ['Not applicable.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-09'], needs: ['BE-05'],
});

// ---------------------------------------------------------------------------------------------
// MOV and SLOT: when a player may move, and where players are put
// ---------------------------------------------------------------------------------------------
add('MOV-01', 'A move during another player\'s turn, before the mover\'s own', {
  refs: ['G-09', 'Q-M01'], rules: ['R-MOVE-01', 'R-MOVE-03', 'R-MOVE-07'], basis: 'stated',
  given: ['Layout MIX. Round 1, the Insider\'s turn (first).'],
  when: ['The Alien moves to Room B.'],
  then: ['Accepted and applied at once.', m => `The Alien is in Room B slot ${m.officer ? 5 : 4}, the lowest free slot.`, 'Room A slot 4 is empty. Nobody else changes slot.', 'The Alien\'s move of Round 1 is used; the room they remember is Room B.'],
  sees: ['Public at once.'],
  timing: ['At any server instant of the turn stage.'],
  needs: ['BE-02', 'BE-03', 'FE-02', 'FE-03'],
});
add('MOV-02', 'A move after the mover\'s own turn', {
  refs: ['G-09', 'Q-M01'], rules: ['R-MOVE-01'], basis: 'stated',
  given: ['Layout MIX. Round 1, Undercover\'s turn (fifth). The Cracker\'s turn (second) is over.'],
  when: ['The Cracker moves to Room B.'],
  then: ['Accepted.', m => `The Cracker is in Room B slot ${m.officer ? 5 : 4}; Room A slot 1 is empty.`],
  sees: ['Public at once.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-03'],
});
add('MOV-03', 'Moves during a Hack that is not the round\'s last, one in each stage', {
  refs: ['G-09', 'G-02', 'Q-M01', 'Q-HK02'], rules: ['HACK-DECLARE-06'], basis: 'stated',
  given: ['Layout MIX. Round 1. The Insider (first) requests a Hack with the Supplier on their own turn.'],
  when: ['Declaration stage: the Cracker moves to Room B.', 'Result stage: the Hacker moves to Room A.', 'Conversation stage: the Alien moves to Room B.'],
  then: ['All three are accepted.', m => `Cracker: Room B slot ${m.officer ? 5 : 4}. Hacker: Room A slot 1, the hole the Cracker left. Alien: Room B slot 3, the hole the Hacker left.`, 'Nobody who did not move changes slot.'],
  sees: ['Each move is public when made.'],
  timing: ['The Hack\'s three deadlines are not changed by the moves.'],
  needs: ['BE-02', 'BE-03'], controls: ['V15-05'],
});
add('MOV-04', 'The final ordinary turn ends: voluntary movement is closed', {
  refs: ['G-09', 'Q-M01', 'Q-M02', 'Q-B02d'], rules: ['R-ACT-09'], basis: 'stated',
  given: ['Layout MIX. Round 1. Nobody has moved.', m => `The last turn is the ${m.last}'s. It ends at its deadline with no Hack requested.`],
  when: ['The Supplier sends a move during the Jail vote.', 'The Insider sends a move during the result.', 'The Hacker sends a move in the lit preview, and again in darkness.'],
  then: ['Each is refused. No move is marked as used.', 'No player is offered a destination from the end of the final turn until the round has resolved. What holds after that, during an election, is MOV-14.'],
  sees: ['The refusals are the senders\' own receipts.'],
  timing: ['Movement closes when the final ordinary turn ends: at its deadline on the server\'s clock, or at an accepted Pass. A closure that commits late keeps nothing open (MOV-15).'],
  needs: ['BE-03', 'FE-03'], controls: ['V13-03'],
});
add('MOV-05', 'The final player\'s Hack does not reopen movement', {
  refs: ['G-09', 'G-02', 'Q-M01'], rules: [], basis: 'stated',
  given: ['Layout MIX. Round 1. Nobody has moved.', m => `The ${m.last}, on the last turn, requests a Hack with a player of their room.`],
  when: ['After that turn ends the Insider sends a move in the declaration stage, the Supplier in the result stage and the Hacker in the conversation stage.', 'One of the two Hack participants sends a move in the conversation stage.'],
  then: ['All are refused. Nobody\'s move is used.'],
  sees: ['The refusals are private.'],
  timing: ['Movement closed when the final ordinary turn ended, before the declaration stage opened.'],
  needs: ['BE-03', 'FE-03'], controls: ['V13-03', 'V15-05'],
});
add('MOV-06', 'The final turn is ended by Pass', {
  refs: ['G-09', 'Q-M01'], rules: ['PASS-01', 'PASS-02'], basis: 'derived',
  given: ['Layout MIX. Round 1. Nobody has moved.'],
  when: [m => `The ${m.last}, on the last turn, passes ten seconds into it.`, 'One second later the Insider sends a move.'],
  then: ['The pass closes the turn and, with it, voluntary movement.', 'The Insider\'s move is refused, although the sixty seconds of the turn would not have been over.'],
  sees: ['The pass is public as the phase change it causes.'],
  timing: ['The Jail vote opens at the pass with its full sixty seconds.'],
  needs: ['BE-03', 'FE-03'],
});
add('MOV-07', 'One voluntary move in a round, and a forced transfer is not one', {
  refs: ['G-09', 'G-06', 'Q-M02'], rules: ['R-MOVE-06', 'R-MOVE-01'], basis: 'stated',
  given: ['Layout MIX. Round 1: the vote jails Undercover. The election elects the Insider.'],
  when: ['Round 2. Insider, own turn (first): RELEASE.', 'Undercover then moves to Room B, and afterwards sends a move back to Room A.'],
  then: ['The release places Undercover in Room A slot 3 and uses no move.', 'The move to Room B is accepted: slot 1, the lowest free slot.', 'The move back is refused: one voluntary move in a round.'],
  sees: ['Release and move are public.'],
  timing: [NO_CLOCK],
  needs: ['BE-03', 'BE-10'],
});
add('MOV-08', 'Transfers the game makes after the cutoff still happen', {
  refs: ['G-09', 'Q-M02'], rules: ['R-MOVE-06'], basis: 'stated',
  given: ['Layout MIX. Round 1. The Blue Disabler has requested a Blackout.'],
  when: [m => `After the final turn: the Jail vote (${m.need} of ${m.mode}) jails the Supplier.`, 'In darkness the Blue Disabler selects Room A slot 3 (Undercover).'],
  then: ['At V the Supplier is in Jail slot 1.', 'At X Undercover is in Hospital slot 1.', 'Neither transfer is a move, and neither is held back because voluntary movement is closed.'],
  sees: ['Both transfers are public when they happen.'],
  timing: ['Jail placement at V, before the window. Hospital admission at X.'],
  needs: ['BE-03', 'FE-03'],
});
add('MOV-09', 'Which turn is the final one when the last seat of the order is Eliminated', {
  refs: ['G-09', 'Q-M01'], rules: ['R-FLOW-04', 'R-FLOW-11'], basis: 'derived',
  given: ['Layout MIX. Round 1: the Blue Disabler\'s Blackout injures the Alien (Room A slot 4). Nobody rescues; the Alien dies at the end of Round 2.', m => `Round 3: the turn order is by player number, except that the Alien is last. The last living seat of the order is the ${m.mode === 7 ? 'Hacker' : m.last}.`],
  when: [m => `Round 3. The ${m.mode === 7 ? 'Hacker' : m.last}'s turn ends.`, 'The Insider sends a move.'],
  then: ['The Alien takes no turn.', 'Voluntary movement closed with the last living seat\'s turn: the Insider\'s move is refused.', 'The Jail vote opens next.'],
  sees: ['Public: the phase goes from that turn to the Jail vote.'],
  timing: [NO_CLOCK],
  needs: ['BE-03'],
});
add('MOV-10', 'An EJECT removes the player who would have had the last turn', {
  refs: ['G-09', 'G-06', 'Q-M01', 'Q-P02'], rules: ['R-FLOW-11', 'R-VOTE-03'], basis: 'derived',
  given: [m => `Layout MIX. Round 1: the vote jails the ${m.last}. The election elects the Insider.`, m => `Round 2: the turn order is by player number, except that the Insider is second to last and the ${m.last} is last.`],
  when: ['Round 2. Insider, own turn: EJECT.', 'Still in the Insider\'s turn the Cracker moves to Room B.', 'The Insider\'s turn ends. The Supplier sends a move.'],
  then: [m => `The ${m.last} is Eliminated and takes no turn.`, 'The Insider\'s turn has become the final ordinary turn. The Cracker\'s move, made inside it, is accepted.', 'The Supplier\'s move is refused.', m => `The Jail vote that follows has ${m.mode - 1} eligible voters; ${m.votes(m.mode - 1)} ballots for one player jail.`],
  sees: ['Public: the EJECT, the Cracker\'s move, the vote\'s eligible voters.'],
  timing: [NO_CLOCK],
  needs: ['BE-03', 'BE-10'],
});
add('MOV-11', 'Nobody walks out of Hospital or Jail', {
  refs: ['G-09', 'G-05', 'Q-H02'], rules: ['R-MOVE-02'], basis: 'stated',
  given: ['A patient in Hospital; a prisoner in Jail; a detained patient in Hospital (as HSP-02).'],
  when: ['Each sends a move to Room A during the turn stage.'],
  then: ['Each is refused. None is offered a destination.'],
  sees: ['Private refusals.'],
  timing: [NO_CLOCK],
  needs: ['BE-03'],
});
add('MOV-12', 'The Captain leaves Command Room and cannot return in the same round', {
  refs: ['G-09', 'Q-M01', 'Q-B03f'], rules: ['R-MOVE-04', 'R-MOVE-05', 'R-CAPT-09'], basis: 'derived',
  given: ['Layout MIX. The election after Round 1 elects the Insider, who is in Command Room slot 1. Room B slot 1 is empty.'],
  when: ['Round 2, during another player\'s turn: the Insider moves to Room B.', 'Later in Round 2 the Insider sends a move to Command Room.', 'Round 3: the Insider moves to Command Room.'],
  then: ['Accepted: Room B slot 1. Command Room is empty. The Insider stays Captain.', 'Refused: the round\'s move is used.', 'Accepted: Command Room slot 1.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-03'],
});
add('MOV-13', 'A room of five takes nobody', {
  refs: ['G-09', 'Q-B03f'], rules: ['R-CAP-01', 'R-CAP-02'], basis: 'kept',
  given: ['Layout MIX. Round 1.', m => (m.mode === 7 ? 'Room A holds four. The Insider moves in first and takes slot 5.' : 'Room A holds five.')],
  when: [m => (m.mode === 7 ? 'The Supplier sends a move to Room A.' : 'The Insider sends a move to Room A.')],
  then: ['Refused. The move is not used.', 'Room A is not among the destinations offered to anyone while it holds five.'],
  sees: ['Private refusal.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-03'],
});
add('MOV-14', 'A move while a Captain election is being held', {
  refs: ['G-09', 'Q-M01'], rules: ['R-MOVE-08'], basis: 'reading',
  given: ['Layout MIX. Round 1 has resolved. The election of the first Captain is open.'],
  when: ['The Cracker sends a move to Room B.'],
  then: ['Recommended reading (NV-F-05): refused. The move belongs to the player-turn stage, which opens with the round\'s first ordinary turn.', 'The Cracker\'s move of Round 2 is unused.'],
  other: ['Accepted, as the engines of today do, and charged to Round 2.'],
  sees: ['Private refusal.'],
  timing: ['The window for voluntary movement runs from the opening of the round\'s first ordinary turn to the end of its final one.'],
  findings: ['NV-F-05'], needs: ['BE-03'], controls: ['V13-04'],
});
add('MOV-15', 'A move sent after the final turn\'s deadline, while its closure is late', {
  refs: ['G-09', 'Q-M01'], rules: ['R-FLOW-08', 'VOTE-RESULT-05'], basis: 'derived',
  given: ['Layout MIX. Round 1. Nobody has moved. The last turn\'s deadline is T.'],
  when: ['The closure of the last turn is delivered two seconds late and commits at T + 2 s.', 'The Insider sends a move at T + 1 s.'],
  then: ['Refused: the turn was over at T on the server\'s clock, and with it voluntary movement. The Insider\'s move is unused.', 'The Jail vote opens at T + 2 s with its full sixty seconds.'],
  sees: ['A private refusal.'],
  timing: ['Input is accepted until a deadline, whatever the moment at which the closure commits.'],
  needs: ['BE-03', 'BE-11'],
});
add('MOV-16', 'A RELEASE on the round\'s final turn: the released may move until that turn ends', {
  refs: ['G-09', 'G-06', 'Q-M01', 'Q-M02', 'Q-P02'], rules: ['R-MOVE-01', 'R-MOVE-06'], basis: 'derived',
  given: ['Layout MIX. Round 1: the vote jails Undercover. The election elects the Insider.', 'Round 2: the turn order is by player number, except that the Insider is last.'],
  when: ['Round 2. Insider, own turn (last): RELEASE.', 'Still in the Insider\'s turn, Undercover moves to Room B.', 'The Insider\'s turn ends. The Alien sends a move.'],
  then: ['The release places Undercover in Room A slot 3.', 'Undercover\'s move is accepted: Room B slot 1. The turn in which Undercover could have acted is past; the move of the round is not.', 'The Alien\'s move is refused.'],
  sees: ['Public: the release and Undercover\'s move.'],
  timing: [NO_CLOCK],
  needs: ['BE-03', 'BE-10'],
});
add('SLOT-01', 'How many positions there are, and who holds which at the start', {
  refs: ['G-01', 'G-05', 'Q-B03f', 'Q-H01'], rules: ['R-CAP-25'], basis: 'reading',
  given: ['Layout MIX, before anything is done.'],
  when: ['The match opens.'],
  then: [m => `Room A 5 positions, Room B 5, Jail 5, Command Room 1, Hospital ${m.hospitalSlots}. The numbers do not change during the match.`, 'Every position exists from the start, the empty ones too.', 'The players of a starting room hold its lowest positions in order of player number. This order is a reading (NV-F-06): the packet gives none.'],
  other: ['Any other fixed order. The counts of positions do not depend on it.'],
  sees: ['Positions are public: the board shows who stands where.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-06'], needs: ['BE-02', 'FE-02'],
});
add('SLOT-02', 'One occupant a position, one position a player, in every published state', {
  refs: ['G-01', 'G-09', 'Q-B03f'], rules: [], basis: 'stated',
  given: ['Any match.'],
  when: ['Any state that any audience can read, at any moment.'],
  then: ['No position has two occupants.', 'Every player who is on the board has exactly one position, with a number within its room\'s count.', 'A player removed by EJECT has none.', 'No Injured player is shown anywhere but in Hospital.'],
  sees: ['The same positions for every audience.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'FE-02'],
});
add('SLOT-03', 'Two players hurt in one round take Hospital positions by player number, not in the order the attacks resolved', {
  refs: ['G-05', 'G-07', 'Q-H04', 'Q-D02'], rules: ['R-CAP-18', 'R-RES-02'], basis: 'reading',
  given: ['Layout MIX. Round 4.'],
  when: ['Blue Disabler, own turn (third): requests a Blackout.', 'Undercover, own turn (fifth): registers a shot at the Blue Disabler.', 'In darkness the Blue Disabler selects Room A slot 4 (Alien).'],
  then: ['The Blackout resolves first and injures the Alien; then the shot injures the Blue Disabler.', 'Recommended reading (NV-F-03): positions are given when the stage is complete, in order of player number. Hospital: Blue Disabler (player 3) slot 1, Alien (player 7) slot 2.'],
  other: ['In the order of the hits: the Alien in slot 1 and the Blue Disabler in slot 2.'],
  sees: ['Under the recommended reading the two positions tell the table nothing about which attack came first.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-03'], needs: ['BE-02', 'BE-08'],
});
add('SLOT-04', 'A hole is taken by the next player who enters, and a former occupant has no claim on it', {
  refs: ['G-01', 'G-09', 'Q-B03f'], rules: ['R-CAP-02'], basis: 'stated',
  given: ['Layout MIX.'],
  when: ['Round 1: the Alien moves to Room B. Then the Hacker moves to Room A.', 'Round 2: the Alien sends a move to Room A.'],
  then: ['The Hacker takes Room A slot 4, the hole the Alien left.', m => (m.mode === 7 ? 'Round 2: accepted; the Alien takes Room A slot 5, not slot 4.' : 'Round 2: refused; Room A holds five again.')],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02'],
});
add('SLOT-05', 'Jail positions over a match', {
  refs: ['G-05', 'G-06', 'Q-B03f', 'Q-P02'], rules: ['R-VOTE-01'], basis: 'stated',
  given: ['Layout MIX. The election after Round 1 elects the Insider.'],
  when: ['Round 1: the vote jails Undercover. Round 2: the vote jails the Supplier.', 'Round 3: Insider, own turn: RELEASE. Round 3: the vote jails the Hacker.'],
  then: ['Undercover: Jail slot 1. Supplier: Jail slot 2.', 'After the release Jail is empty.', 'The Hacker takes Jail slot 1.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-10'],
});
add('SLOT-06', 'A body keeps its Hospital position', {
  refs: ['G-05', 'G-07', 'Q-H01', 'Q-H04'], rules: [], basis: 'stated',
  given: ['Layout MIX. Round 1: the Blue Disabler\'s Blackout injures Undercover (Hospital slot 1). Nobody rescues, and Undercover dies at the end of Round 2.', 'Round 3: Supplier arms the Insider and the Hacker.'],
  when: ['Round 4. The Hacker moves to Room A, takes slot 3 there, and registers a shot at the Alien.'],
  then: ['Undercover\'s body is in Hospital slot 1 from the end of Round 2 on.', 'The Alien is Injured when Round 4 resolves and takes Hospital slot 2, the lowest free position.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-09'],
});

// ---------------------------------------------------------------------------------------------
// CLN: the Alien's Phantom Clone
// ---------------------------------------------------------------------------------------------
add('CLN-01', 'Activation', {
  refs: ['G-03', 'Q-C02', 'Q-C02b', 'Q-C02d', 'Q-C02e'], rules: ['R-ACT-01', 'R-VIEW-07'], basis: 'stated',
  given: ['Layout MIX. Round 2. The Alien is Healthy and free.'],
  when: ['The Alien, own turn: activates the Clone.'],
  then: ['Accepted and in effect at once.', 'The Clone is active and is scheduled to end when Round 3 has resolved.', 'The one use of the match is spent; the Main Action of that turn is used.', 'Health, room, position and Power are unchanged.'],
  sees: ['The Alien\'s private view only.', 'The public view, the shared display and every other seat read exactly what they read in a run in which the Alien did nothing on that turn, at every moment until an attack on the Alien is blocked.', 'No asset, sound or timing that anyone else can observe differs.'],
  timing: ['At the server instant of acceptance.'],
  needs: ['BE-05', 'BE-06', 'BE-07', 'FE-05'],
});
add('CLN-02', 'Activations that are refused', {
  refs: ['G-03', 'Q-C02b', 'Q-C02e'], rules: ['R-ACT-09'], basis: 'stated',
  given: ['Layout MIX. The Clone is unused unless the line says otherwise.'],
  when: ['On another player\'s turn; in a Hack stage; in the vote, its result or the window.', 'On the Alien\'s own turn while Injured; while Jailed.', 'A second time, in a later round, after it was used.', 'By a seat that is not the Alien.'],
  then: ['Each is refused. Nothing is spent and nothing changes.'],
  sees: ['Private refusals. No refusal differs by role in a way another seat could read.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('CLN-03', 'Shot and Hack stay available on the turn of activation', {
  refs: ['G-03', 'Q-C02'], rules: ['R-ACT-01', 'R-SHOT-03', 'R-HACK-02'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Alien and the Cracker.'],
  when: ['Round 4. The Alien, own turn: activates the Clone, registers a shot at Undercover and requests a Hack with the Cracker.'],
  then: ['All three are accepted.'],
  sees: ['Only the Hack becomes public, when its first stage opens.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('CLN-04', 'From activation to the end of the following round, and not beyond', {
  refs: ['G-03', 'Q-C01', 'Q-C02c', 'Q-C02d'], rules: ['R-SHOT-03'], basis: 'stated',
  given: ['Layout ARMS (Alien in Room A slot 5). Round 3: Supplier arms the Cracker and the Blue Disabler.'],
  when: ['Round 3. The Alien, own turn: activates the Clone. The Blue Disabler requests a Blackout and in darkness selects Room A slot 5.', 'Round 4. Undercover registers a shot at the Alien.', 'Round 5. The Cracker registers a shot at the Alien.'],
  then: ['Round 3: blocked.', 'Round 4: blocked. The Clone ends when Round 4 has resolved.', 'Round 5: not blocked. The Alien is Injured, in Hospital; no death is due.', 'The Blackout use and both weapons are spent.'],
  sees: ['Two room events in Rounds 3 and 4; a public injury in Round 5.'],
  timing: ['Active from acceptance in Round 3 until the end-of-round checkpoint of Round 4.'],
  needs: ['BE-05', 'BE-07'],
});
add('CLN-05', 'An activation late in the round covers attacks registered earlier in it', {
  refs: ['G-03', 'Q-C02d'], rules: ['R-ACT-06'], basis: 'stated',
  given: ['Layout MIX. Round 4. Undercover\'s turn (fifth) is before the Alien\'s (seventh).'],
  when: ['Undercover registers a shot at the Alien.', 'The Alien, own turn: activates the Clone.'],
  then: ['The shot is blocked: defences are read when the attack resolves.', 'The weapon is spent.'],
  sees: ['A room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-07'],
});
add('CLN-06', 'Several attacks in one round', {
  refs: ['G-03', 'Q-C01'], rules: ['R-RES-02'], basis: 'stated',
  given: ['Layout ARMS. Round 3: Supplier arms the Cracker and the Blue Disabler.'],
  when: ['Round 4. The Alien activates the Clone.', 'The Blue Disabler requests a Blackout and registers a shot at the Alien; the Cracker and Undercover each register a shot at the Alien.', 'In darkness the Blue Disabler selects Room A slot 5.'],
  then: ['All four attacks are blocked.', 'The Clone is still active; it ends when Round 5 has resolved.', 'The Alien is Healthy.'],
  sees: ['Four room events, each the same.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-08'],
});
add('CLN-07', 'Clone first, the Protection kept, the Protection used afterwards', {
  refs: ['G-03', 'Q-C02a'], rules: ['R-PROT-02', 'R-PROT-03', 'R-PROT-06'], basis: 'stated',
  given: ['Layout ARMS. Round 2: Undercover grants Protection to the Alien (active from Round 3). Round 3: Supplier arms the Cracker and the Blue Disabler.'],
  when: ['Round 3. The Alien activates the Clone.', 'Round 4. The Cracker registers a shot at the Alien.', 'Round 5. The Blue Disabler registers a shot at the Alien.'],
  then: ['Round 4: blocked by the Clone. The Protection is not used up.', 'The Clone ends when Round 4 has resolved.', 'Round 5: blocked by the Protection, which is used up.', 'The Alien is Healthy throughout.'],
  sees: ['Undercover\'s private record: unused after Round 4, used after Round 5.', 'The two room events are the same.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-08'],
});
add('CLN-08', 'Jailed after activation', {
  refs: ['G-03', 'Q-C02f'], rules: ['R-ACT-06', 'R-VOTE-01'], basis: 'stated',
  given: ['Layout MIX. The election after Round 1 elects the Insider, who stays in Command Room. Round 4.'],
  when: ['Undercover registers a shot at the Alien. The Alien, own turn: activates the Clone.', m => `Jail vote: ${m.need} of ${m.mode} ballots name the Alien.`, 'Round 5: the Insider, own turn (first), uses RELEASE; the Alien, own turn, then tries to activate again.'],
  then: ['At V the Alien is in Jail.', 'The shot resolves there and is blocked: the Clone is still active.', 'Its end is unchanged: when Round 5 has resolved.', 'The second activation is refused: the use is spent.'],
  sees: ['The block is a room event for the seats in Jail at that moment, the Alien among them. Room A, the shooter included, gets nothing.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-08'],
});
add('CLN-09', 'EJECT takes no notice of the Clone', {
  refs: ['G-03', 'G-06', 'Q-C01', 'Q-C02f', 'Q-P02'], rules: [], basis: 'stated',
  given: ['Layout MIX. Round 2: the Alien activates the Clone; the vote jails the Alien. A Captain is in office.'],
  when: ['Round 3. The Captain, own turn, in Command Room: EJECT.'],
  then: ['The Alien is Eliminated. The Clone ends with them.', 'There is no block.'],
  sees: ['No room event. The elimination is public; the faction is shown at the end-of-round reveal.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-10'],
});
add('CLN-10', 'Activation in Round 5', {
  refs: ['G-03', 'Q-C01b', 'Q-H03'], rules: ['R-SHOW-02'], basis: 'stated',
  given: [TIE, 'Undercover has kept their weapon.'],
  when: ['Round 5. The Alien activates the Clone. Undercover registers a shot at the Alien.', m => `Round 5 resolves: Power is ${m.mode === 7 ? '2 and 2' : '3 and 3'}, no winner. In the showdown Undercover names the Alien.`],
  then: ['The Round 5 shot is blocked.', 'The Clone ends when the normal resolution of Round 5 is complete, before the showdown.', 'The special shot is not blocked: the Alien is Injured, in Hospital.'],
  sees: ['One room event, in Round 5.'],
  timing: ['No Clone is active at any moment of the showdown.'],
  needs: ['BE-07', 'BE-12'],
});
add('CLN-11', 'Activated in Round 4, then the showdown, with a Protection in reserve', {
  refs: ['G-03', 'Q-C01b', 'Q-C02a', 'Q-H03'], rules: ['R-PROT-03', 'R-SHOW-06'], basis: 'stated',
  given: [TIE, 'Round 3: Undercover grants Protection to the Alien (active from Round 4).'],
  when: ['Round 4. The Alien activates the Clone. Undercover registers a shot at the Alien.', m => `Round 5 resolves: Power is ${m.mode === 7 ? '2 and 2' : '3 and 3'}, no winner. In the showdown Undercover and the Blue Disabler name the Alien.`],
  then: ['Round 4: blocked by the Clone; the Protection is kept.', 'Showdown: the first special shot in the Round 5 order is blocked by the Protection, which is used up. The second injures the Alien.'],
  sees: ['The showdown block is a room event for the seats of the Alien\'s room.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-12'],
});
add('CLN-12', 'What the Clone does not stop', {
  refs: ['G-03', 'Q-C01'], rules: ['R-ROLE-13', 'R-ROLE-14', 'R-HACK-02', 'R-ROLE-02'], basis: 'stated',
  given: ['Layout MIX. Round 2: the Alien activates the Clone. It is active until Round 3 has resolved.'],
  when: ['Round 3. Cracker, own turn: registers a Rescue of the Alien. Undercover, own turn: requests a Hack with the Alien, and it runs.', 'The Alien then moves to Room B. Hacker, own turn: scans the Alien there.', m => `The Jail vote (${m.need} of ${m.mode}) names the Alien.`],
  then: ['The Hack runs through its three stages.', 'The Scan returns its result at once, as for any target.', 'The Alien is jailed at the closing of the vote.', 'The Rescue finds a Healthy target, heals nobody and is spent.', 'None of the four is blocked.'],
  sees: ['No room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-07'],
});
add('CLN-13', 'Injury while the Clone is active', {
  refs: ['G-03', 'Q-C02'], rules: ['R-STATE-01'], basis: 'derived', status: 'synthetic',
  given: ['A constructed state: the Alien is Injured in Hospital and the Clone is active.'],
  when: ['The round in which the injury episode is due resolves.'],
  then: ['The injury did not end the Clone and the Clone does not stop the Hospital death.', 'By legal play this state does not arise: activation needs a Healthy Alien, and while the Clone is active every source of damage in a normal round is blocked.'],
  sees: ['Not applicable.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-09'], needs: ['BE-07'],
});
add('CLN-14', 'The end of the Clone', {
  refs: ['G-03', 'Q-C02d', 'Q-H03'], rules: ['R-WIN-01'], basis: 'stated',
  given: ['The Clone was activated in Round 2 and nothing attacked the Alien.'],
  when: ['Round 3 resolves.'],
  then: ['The Clone is inactive from the end-of-round checkpoint of Round 3, before the victory check of that round is read by anyone.', 'Health, room, position and Power are unchanged by the end.'],
  sees: ['A private notice to the Alien. Nothing else: the public figure is the same before and after.'],
  timing: ['After the attack, Rescue and Hospital stages of the round and its reveals; with the victory check.'],
  needs: ['BE-06', 'BE-07', 'FE-05'],
});
add('CLN-15', 'Activation by an Alien who is Captain, inside Command Room', {
  refs: ['G-03', 'G-06', 'Q-C02b', 'Q-C02e'], rules: ['R-CAPT-11', 'R-CAPT-15'], basis: 'reading',
  given: ['The Alien is Captain and in Command Room. Round 2.'],
  when: ['The Alien, own turn: activates the Clone.'],
  then: ['Recommended reading (NV-F-10): accepted. The activation names nobody, and the packet\'s conditions for it are the Alien\'s own turn, Healthy and not Jailed.'],
  other: ['Refused, if the rule that a Captain inside Command Room cannot protect themself (R-CAPT-15) is read to cover the Clone.'],
  sees: ['Private.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-10'], needs: ['BE-05'],
});
add('CLN-16', 'An activation that is delivered twice, or sent again in a later round', {
  refs: ['G-03', 'Q-C02', 'Q-C02d'], rules: [], basis: 'stated', layer: 'service',
  given: ['Layout MIX. Round 2.'],
  when: ['The Alien, own turn: activates the Clone. The same command is delivered a second time in Round 2.', 'In Round 3 the same command, with its own identifier, is delivered again.', 'In Round 4 the Alien sends a new activation.'],
  then: ['One activation. Each repeat returns the receipt of the first and changes nothing.', 'The end stays where it was: when Round 3 has resolved. Nothing restarts or extends it.', 'The new activation of Round 4 is refused: the use is spent.'],
  sees: ['Private to the Alien.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-11'],
});
add('CLN-17', 'The Officer\'s shot in Round 1 against the Clone', {
  modes: [9], refs: ['G-03', 'G-04', 'Q-C01', 'Q-C02b'], rules: ['R-ROLE-11', 'R-PROT-02'], basis: 'stated',
  given: ['Layout MIX. Round 1.'],
  when: ['The Alien, own turn (seventh): activates the Clone, then moves to Room B and takes slot 5.', 'The Officer, own turn (ninth): registers their shot at the Alien.'],
  then: ['Blocked. The Officer\'s one shot is spent.', 'The Clone stays active until Round 2 has resolved.'],
  sees: ['A room event for the seats of Room B: the Insider, the Supplier, the Hacker, the Officer and the Alien.', 'No Protection can be active in Round 1, so everyone who reads this event can work out that it was the Clone.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-08'],
});

// ---------------------------------------------------------------------------------------------
// CAP: the Captain's RELEASE and EJECT
// ---------------------------------------------------------------------------------------------
const CAPTAIN = 'Layout MIX. The election after Round 1 elects the Insider, who is placed in Command Room and stays there.';
add('CAP-01', 'RELEASE', {
  refs: ['G-06', 'Q-P01', 'Q-P01a', 'Q-P02'], rules: ['R-CAP-22', 'R-CAP-26', 'R-MOVE-06'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover (Jail slot 1). Round 2: the vote jails the Supplier (Jail slot 2).'],
  when: ['Round 3. Insider, own turn: RELEASE.'],
  then: ['Accepted, in effect at once. There is no vote and no choice of prisoner.', 'Both are free. Seated by player number: the Supplier (4) in Room B slot 1; then Undercover (5) in Room A slot 3.', 'Jail is empty.', 'The RELEASE allowance of the match is used. The EJECT allowance is untouched.', 'The Insider\'s Main Action, Shot, Hack request and move are untouched.'],
  sees: ['Public at once: who is free and where. The Captain is known, and so is who pressed.'],
  timing: ['At the server instant of acceptance, inside the Captain\'s turn.'],
  needs: ['BE-02', 'BE-05', 'BE-10', 'FE-06'], controls: ['V13-08'],
});
add('CAP-02', 'EJECT', {
  refs: ['G-06', 'Q-P01', 'Q-P01a', 'Q-P02'], rules: ['R-FLOW-11', 'R-VOTE-02', 'R-VOTE-03', 'R-VIEW-03', 'R-VIEW-08'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover. Round 2: the vote jails the Supplier.'],
  when: ['Round 3. Insider, own turn (first): EJECT.', 'The round continues.'],
  then: ['Accepted, in effect at once: Undercover and the Supplier are Eliminated.', 'All five Jail positions are empty. The two are off the board, in the elimination record.', 'The EJECT allowance of the match is used. The RELEASE allowance is untouched.', 'Their turns later in Round 3 are not taken. They do not vote and cannot be voted for.', m => `The Jail vote of Round 3 has ${m.mode - 2} eligible voters; ${m.votes(m.mode - 2)} ballots for one player jail.`, 'The match does not end at the EJECT: victory is read at the end-of-round checkpoint.'],
  sees: ['Public at once: both Eliminated, Jail empty.', 'Their factions are NOT shown until the end-of-round reveal of Round 3: the table votes without them. Then Red for Undercover and Blue for the Supplier.', 'Roles and the Code stay hidden until the match ends.'],
  timing: ['At the server instant of acceptance. Reveal and victory at the checkpoint of Round 3.'],
  needs: ['BE-02', 'BE-05', 'BE-07', 'BE-10', 'FE-06', 'FE-09'], controls: ['V13-10'],
});
add('CAP-03', 'An empty Jail', {
  refs: ['G-06', 'Q-P01'], rules: ['R-ACT-09'], basis: 'stated',
  given: [CAPTAIN, 'Nobody is in Jail. Both allowances are unused.'],
  when: ['Round 2. Insider, own turn: RELEASE, then EJECT.'],
  then: ['Both are refused. Neither allowance is spent.', 'Each button is temporarily unavailable, not used.'],
  sees: ['No success scene. The Captain reads that the button cannot be used now, which is not the same as used.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-10', 'FE-06'],
});
add('CAP-04', 'The wrong moment, the wrong place, the wrong player', {
  refs: ['G-06', 'Q-P01', 'Q-P01a'], rules: ['R-ACT-09'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover. Both allowances are unused.'],
  when: ['The Insider, in Command Room, on another player\'s turn; in a Hack stage; in the vote, its result or the window.', 'The Insider, on their own turn, after moving out of Command Room.', 'The Cracker, who is not Captain, on their own turn.'],
  then: ['Every attempt is refused. No allowance is spent and nothing changes.'],
  sees: ['Private refusals.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-10', 'FE-06'],
});
add('CAP-05', 'Two allowances, each its own', {
  refs: ['G-06', 'Q-P01'], rules: [], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover.'],
  when: ['Round 2. Insider, own turn: RELEASE. The vote of Round 2 jails the Supplier.', 'Round 3. Insider, own turn: RELEASE, then EJECT.'],
  then: ['Round 2: Undercover is free, in Room A slot 3.', 'Round 3: RELEASE is refused, used. EJECT is accepted: the Supplier is Eliminated.'],
  sees: ['The two buttons show their states apart: RELEASE used from Round 2, EJECT used from Round 3.'],
  timing: [NO_CLOCK],
  needs: ['BE-10', 'FE-06'],
});
add('CAP-06', 'The allowances outlive the Captain who spent them', {
  refs: ['G-06', 'Q-P01'], rules: ['R-CAPT-07', 'R-CAPT-12'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover.'],
  when: ['Round 2. Insider, own turn: EJECT.', m => `The vote of Round 2 (${m.votes(m.mode - 1)} of ${m.mode - 1}) jails the Insider.`, 'The election before Round 3 elects the Cracker.', 'Round 3. Cracker, own turn, in Command Room: EJECT, then RELEASE.'],
  then: ['Undercover is Eliminated in Round 2.', 'The Insider loses the title at V and is in Jail slot 1.', 'The new Captain\'s EJECT is refused: the match\'s EJECT is used.', 'The new Captain\'s RELEASE is accepted: the Insider is free, in Room B slot 1.'],
  sees: ['The EJECT button is shown as used to the new Captain from the first moment.'],
  timing: [NO_CLOCK],
  needs: ['BE-10', 'FE-06'],
});
add('CAP-07', 'Both buttons in one turn', {
  refs: ['G-06', 'Q-P01'], rules: [], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover. Both allowances are unused.'],
  when: ['Round 2, one match: RELEASE, then EJECT.', 'Round 2, another match from the same state: EJECT, then RELEASE.'],
  then: ['First match: Undercover is free; EJECT finds no living prisoner in Jail, is refused and stays unused.', 'Second match: Undercover is Eliminated; RELEASE finds no living prisoner, is refused and stays unused.'],
  sees: ['The second button is temporarily unavailable, not used.'],
  timing: ['The second command is judged against the state the first one left.'],
  needs: ['BE-10', 'FE-06'],
});
add('CAP-08', 'A detained patient is outside both commands', {
  refs: ['G-05', 'G-06', 'Q-H02', 'Q-P02'], rules: ['R-ACT-06'], basis: 'stated',
  given: [CAPTAIN, 'The end of HSP-02: the Alien is Injured, in Hospital, detained. Nobody is in Jail.'],
  when: ['Round 5. Insider, own turn: RELEASE, then EJECT.'],
  then: ['Both are refused: no living prisoner is physically in Jail. Neither allowance is spent.', 'The Alien stays in Hospital, detained, with the same deadline.'],
  sees: ['The buttons are temporarily unavailable.'],
  timing: [NO_CLOCK],
  needs: ['BE-09', 'BE-10', 'FE-06'],
});
add('CAP-09', 'A patient is left where they are while a prisoner beside them is released', {
  refs: ['G-05', 'G-06', 'Q-H02', 'Q-P02'], rules: [], basis: 'stated',
  given: [CAPTAIN, 'Round 3: the vote jails the Supplier (Jail slot 1). Round 4: Undercover registers a shot at the Alien; the vote jails the Alien (Jail slot 2); the shot injures the Alien, who is in Hospital and detained.'],
  when: ['Round 5. Insider, own turn: RELEASE.'],
  then: ['The Supplier is free, in Room B. The Alien is not released: still detained, still in Hospital.', 'The RELEASE allowance is used.', 'If the Alien is healed in Round 5 they return to Jail; nothing can release them then.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-09', 'BE-10'],
});
add('CAP-10', 'No defence stops a command', {
  refs: ['G-06', 'G-04', 'Q-C01', 'Q-P02'], rules: ['R-PROT-02'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: Undercover grants Protection to the Cracker (active from Round 2). The vote of Round 1 jails the Cracker.'],
  when: ['Round 2. Insider, own turn: EJECT.'],
  then: ['The Cracker is Eliminated. The Protection blocks nothing.'],
  sees: ['No room event. Undercover\'s private record does not show the Protection as used up by a block.'],
  timing: [NO_CLOCK],
  needs: ['BE-08', 'BE-10'],
});
add('CAP-11', 'A released player is free for the rest of the round', {
  refs: ['G-06', 'G-09', 'Q-P02', 'Q-M02'], rules: ['R-ACT-01', 'R-VOTE-02', 'R-WIN-01', 'R-PROT-01'], basis: 'derived',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover.'],
  when: ['Round 2. Insider, own turn (first): RELEASE.', 'Undercover, own turn (fifth): grants Protection to the Cracker. Later moves to Room B.', 'The Jail vote of Round 2 opens.'],
  then: ['Undercover is in Room A slot 3 from the release.', 'The grant is accepted: Undercover is Healthy and free on their own turn.', 'The move is accepted: Room B slot 1.', 'Undercover can be voted for in the Jail vote of Round 2.', 'Undercover counts for Red Power from the release.'],
  sees: ['Public: the release, the move, the list of who can be voted for.'],
  timing: [NO_CLOCK],
  needs: ['BE-10'],
});
add('CAP-12', 'Victory waits for the end of the round', {
  refs: ['G-06', 'Q-P02'], rules: ['R-WIN-03', 'R-WIN-07', 'R-RES-03'], basis: 'stated',
  given: [CAPTAIN, m => (m.mode === 7 ? 'The votes of Rounds 1 and 2 jail Undercover and the Hacker: every Red player is in Jail.' : 'The votes of Rounds 1, 2 and 3 jail Undercover, the Hacker and the Red Disabler: every Red player is in Jail.')],
  when: [m => `Round ${m.mode === 7 ? 3 : 4}. Insider, own turn (first): EJECT.`, 'The other turns, the vote, the result, the window and the resolution follow.'],
  then: ['Every Red player is Eliminated during the turns. The match goes on.', 'Whatever was registered in the round still resolves.', 'At the end-of-round checkpoint: every Red player is Eliminated and a Blue player is Healthy. Blue wins. The Alien wins with Blue.'],
  sees: ['The result, the roles and the Code appear at the checkpoint and not before.'],
  timing: ['Not at the EJECT. At the checkpoint of the same round.'],
  needs: ['BE-07', 'BE-10'],
});
add('CAP-13', 'The Hacker is ejected in Round 5, after or before the Code', {
  refs: ['G-06', 'Q-P02'], rules: ['R-ROLE-15', 'R-WIN-06', 'R-STATE-04'], basis: 'derived',
  given: ['Layout MIX. Round 1: the vote jails the Hacker. The election elects the Cracker, who stays in Command Room. Nobody is hurt in the match.'],
  when: ['Round 5, one match: during the Insider\'s turn (first) the Hacker submits the correct Code. Cracker, own turn (second): EJECT.', 'Round 5, another match: Cracker, own turn: EJECT. Afterwards the Hacker sends a Code.'],
  then: ['First match: the attempt stands. At the Round 5 check the Code is correct and a Red player is Healthy: Red wins.', 'Second match: the attempt is refused; nobody inherits it.'],
  sees: ['Nobody is told whether the Code was right before the match ends.'],
  timing: [NO_CLOCK],
  needs: ['BE-10'],
});
add('CAP-14', 'A repeated command, and two commands at once', {
  refs: ['G-06', 'Q-P01'], rules: [], basis: 'stated', layer: 'service',
  given: [CAPTAIN, 'Round 1: the vote jails Undercover.'],
  when: ['Round 2. The same EJECT command is delivered twice.', 'In another match the same RELEASE command is delivered twice.', 'In a third two different EJECT commands are sent at the same moment.'],
  then: ['A second delivery returns the first receipt and changes nothing.', 'One of the two new commands is accepted; the other sees the committed state and is refused.', 'The allowance is spent once in each match.'],
  sees: ['One command is shown, once.'],
  timing: [NO_CLOCK],
  needs: ['BE-11'],
});
add('CAP-15', 'Stepping into Command Room and commanding in the same turn; stepping out and not', {
  refs: ['G-06', 'G-09', 'Q-P01', 'Q-P01a', 'Q-M01'], rules: ['R-MOVE-04', 'R-MOVE-05'], basis: 'derived',
  given: ['Layout MIX. The election after Round 1 elects the Insider. Round 1: the vote jails Undercover. In Round 2 the Insider moves out to Room B.'],
  when: ['Round 3. Insider, own turn: moves into Command Room, then RELEASE.', 'The vote of Round 3 jails the Supplier.', 'Round 4. Insider, own turn: moves out to Room B, then EJECT.'],
  then: ['Round 3: both accepted; Undercover is free.', 'Round 4: the EJECT is refused, because the Captain is not in Command Room. It stays unused.'],
  sees: ['Public: the moves and the release.'],
  timing: ['A voluntary move during the mover\'s own turn is legal (NV-A-02).'],
  needs: ['BE-03', 'BE-10'],
});
add('CAP-16', 'RELEASE when the room a prisoner remembers has one place left', {
  refs: ['G-06', 'G-05', 'Q-P02'], rules: ['R-CAP-07', 'R-CAP-22', 'R-CAP-27'], basis: 'stated',
  given: [CAPTAIN, 'Round 1: the vote jails the Supplier. Round 2: the vote jails the Hacker. Both remember Room B.', m => `Round 3, with the Insider last in the turn order: ${m.officer ? 'the Cracker, the Blue Disabler and Undercover move to Room B, which then holds four with the Officer' : 'the Cracker, the Blue Disabler, Undercover and the Alien move to Room B, which then holds four'}.`],
  when: ['Round 3. Insider, own turn: RELEASE.'],
  then: ['The Supplier (player 4) is seated first: Room B slot 5. Room B is full.', 'The Hacker (player 6) goes to the other room: Room A slot 1.', 'The Hacker now remembers Room A.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-10'],
});
add('CAP-17', 'Both factions gone between two victory checks, one of them by an EJECT earlier in the round', {
  refs: ['G-06', 'G-07', 'Q-P02', 'Q-H03a'], rules: ['R-WIN-08', 'R-WIN-05', 'R-WIN-10', 'R-WIN-11', 'R-RES-03'], basis: 'derived',
  given: ['Round 5. Every Red player is a Healthy prisoner in Jail. Every Blue player who is not Eliminated is a patient admitted in Round 4. The Alien is Healthy, free, Captain and in Command Room.', m => `One legal line to this state, from layout ARMS: the election after Round 1 elects the Alien. ${m.mode === 7
    ? 'The vote of Round 1 jails the Hacker.'
    : 'In Round 1 the Red Disabler\'s Blackout injures the Insider, who dies at the end of Round 2. The votes of Rounds 1, 2 and 3 jail the Hacker, the Red Disabler and Undercover.'} In Round 3 the Alien comes out to Room A, and Supplier arms the Cracker and the Alien. ${m.mode === 7
    ? 'Round 4: the Cracker shoots the Blue Disabler; the Blue Disabler requests a Blackout and moves to Room B; Undercover shoots the Supplier; the Alien shoots the Cracker; the vote jails Undercover; in darkness the Blue Disabler selects the Insider\'s position.'
    : m.mode === 8
      ? 'Round 4, Room A: the Blue Disabler\'s Blackout hits the Supplier; the Cracker shoots the Blue Disabler; the Alien shoots the Cracker.'
      : 'Round 4: the Officer moves to Room A. There the Blue Disabler\'s Blackout hits the Officer; the Officer shoots the Supplier; the Cracker shoots the Blue Disabler; the Alien shoots the Cracker.'} In Round 5 the Alien moves back into Command Room.`],
  note: ['For comparison: if the Alien does not use the EJECT, every Blue player is Eliminated at the Round 5 check and a Red player is Healthy, though Jailed, and Red wins.'],
  when: ['Round 5. The Alien, own turn, in Command Room: EJECT.', 'Round 5 resolves: nobody was rescued, and every patient dies.'],
  then: ['Every Red player is Eliminated during the turns; every Blue player is Eliminated when the round resolves; the Alien is not Eliminated.', 'By the rule the packet keeps (R-WIN-08), "at the same time" means within one complete resolution stage. Red was gone before that stage began: nothing was simultaneous, and no condition is met at the Round 5 check.', 'The showdown follows with one participant and no shot. The match is a Draw.',],
  other: ['If the owner decides that everything since the previous victory check counts as one stage, the Alien wins alone at the Round 5 check. The packet does not say so and this matrix does not assume it.'],
  sees: ['The Draw appears when the showdown has resolved.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-04'], needs: ['BE-07', 'BE-10'],
});
add('CAP-18', 'A detained patient who is healed is in reach of the commands again', {
  refs: ['G-05', 'G-06', 'Q-H02', 'Q-P02'], rules: ['R-STATE-08'], basis: 'stated',
  given: [CAPTAIN, 'The end of HSP-10: Undercover was healed when Round 3 resolved and is in Jail slot 1, Healthy and detained.'],
  when: ['Round 4, one match: Insider, own turn: EJECT.', 'Round 4, another match from the same state: Insider, own turn: RELEASE.'],
  then: ['First match: Undercover is Eliminated, and Jail is empty.', 'Second match: Undercover is free, in Room A slot 3.'],
  note: ['While Undercover was a patient neither command reached them (CAP-08).'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-09', 'BE-10'],
});
add('CAP-19', 'A prisoner killed by shots registered before the vote, and what EJECT clears', {
  refs: ['G-06', 'G-05', 'G-07', 'Q-P01', 'Q-P02', 'Q-H04'], rules: ['R-ACT-06', 'R-CAP-03', 'R-SHOT-03'], basis: 'derived',
  given: ['Layout ARMS. The election after Round 1 elects the Insider, who stays in Command Room. Round 3: Supplier arms the Cracker and the Blue Disabler; the vote jails the Hacker (Jail slot 1).', m => `Round 4: the Cracker and the Blue Disabler each register a shot at Undercover. The vote (${m.need} of ${m.mode}) jails Undercover, who is in Jail slot 2 at V. When the round resolves the two shots injure Undercover and then eliminate them.`],
  when: ['Round 5, one match: Insider, own turn: EJECT.', 'Round 5, another match in which the Hacker was never jailed: Insider, own turn: EJECT, then RELEASE.'],
  then: ['By the letter of the packet the first shot moved Undercover to Hospital, detained, and the second killed them there. Jail holds no body.', 'First match: accepted. The Hacker is Eliminated and Jail is empty.', 'Second match: Jail is empty. Both commands are refused, and neither allowance is spent.'],
  other: ['If a player eliminated in the stage that first hurt them keeps their position (NV-F-01), Undercover\'s body lies in Jail, in the position Undercover held: slot 2 in the first match, slot 1 in the second. In the first match the EJECT clears both positions, the body with them. In the second Jail holds only a body, and both commands are still refused, because no living prisoner is there.'],
  note: ['By the letter EJECT never clears a body, and the packet\'s "including retained eliminated bodies" has no case (NV-F-09).'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01', 'NV-F-09'], needs: ['BE-02', 'BE-09', 'BE-10'],
});

// ---------------------------------------------------------------------------------------------
// HSP: Hospital, Rescue and death
// ---------------------------------------------------------------------------------------------
add('HSP-01', 'One full round: hurt in Round 2, dead at the end of Round 3', {
  refs: ['G-07', 'G-05', 'Q-H04'], rules: ['R-RES-01', 'R-STATE-01'], basis: 'stated',
  given: ['Layout MIX. Round 2: the Blue Disabler\'s Blackout injures Undercover (Hospital slot 1). Admitted in Round 2; due at the end of Round 3.'],
  when: ['Round 3. Nobody registers a Rescue of Undercover.', 'Round 3 resolves.'],
  then: ['Undercover is Injured, alive and in Hospital through all of Round 3: the turns, the vote, the result, the window, the attack stage and the Rescue stage.', 'After the Rescue stage the due death applies: Undercover is Eliminated, in Hospital slot 1.', 'The faction is shown at the reveal of Round 3.'],
  sees: ['Public: the patient, and from server state how long the rescue opportunity lasts, in rounds.', 'The death is public when the round resolves, with no cause other than the Hospital itself.'],
  timing: ['Not before the Rescue stage of Round 3 has resolved. No client clock can bring it forward.'],
  needs: ['BE-07', 'BE-09', 'FE-07'], controls: ['V13-05'],
});
add('HSP-02', 'A prisoner who is hurt goes to Hospital and stays detained', {
  refs: ['G-05', 'G-07', 'Q-H02', 'Q-H04'], rules: ['R-ACT-06', 'R-ACT-05'], basis: 'stated',
  given: ['Layout MIX. Round 4.'],
  when: ['Undercover, own turn: registers a shot at the Alien (Room A slot 4).', m => `Jail vote: ${m.need} of ${m.mode} ballots name the Alien.`, 'The round resolves.'],
  then: ['At V the Alien is Jailed and in Jail slot 1.', 'At X the shot injures the Alien: Injured, in Hospital slot 1, still detained. Jail slot 1 is empty.', 'Episode: admitted in Round 4, due at the end of Round 5.'],
  sees: ['Public: Injured, in Hospital, detained. A patient\'s clothes with a detention marker, not a prisoner\'s.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-09', 'FE-07'], controls: ['V13-06'],
});
add('HSP-03', 'A Captain hurt inside Command Room goes straight to Hospital', {
  refs: ['G-05', 'G-07', 'G-09', 'Q-H04'], rules: ['R-ACT-06', 'R-CAPT-07', 'R-CAPT-08', 'R-CAP-23'], basis: 'stated',
  given: ['Layout MIX. The election after Round 1 elects the Cracker. In Round 3 the Cracker moves out to Room A (slot 1).'],
  when: ['Round 4. Undercover, own turn: registers a shot at the Cracker, who is in Room A.', 'Later in Round 4 the Cracker moves into Command Room.', 'The round resolves.'],
  then: ['The shot resolves: where the target is at resolution does not matter.', 'The Cracker is Injured, loses the title at once and is in Hospital slot 1.', 'No published state shows the Cracker in Room A or Room B on the way.', 'An election is held before Round 5.'],
  sees: ['Public: the injury and the loss of the title.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-09'],
});
add('HSP-04', 'Everybody who can be hurt in one round has a bed', {
  refs: ['G-05', 'Q-H01', 'Q-B03f'], rules: ['R-ACT-05', 'R-RES-02', 'R-SHOT-03'], basis: 'stated',
  given: [m => (m.officer ? 'Layout PAIRS. Round 3: Supplier arms the Cracker and the Alien. Nobody has attacked yet.' : 'Layout ARMS. Round 3: Supplier arms the Cracker and the Alien. Nobody has attacked yet.')],
  when: [m => (m.mode === 7
    ? 'Round 4, Room A: the Blue Disabler\'s Blackout hits the Supplier; Undercover shoots the Blue Disabler; the Cracker shoots Undercover; the Alien shoots the Cracker.'
    : m.mode === 8
      ? 'Round 4, Room A: the Blue Disabler\'s Blackout hits the Supplier; Undercover shoots the Blue Disabler; the Cracker shoots Undercover; the Alien shoots the Cracker. Room B: the Red Disabler\'s Blackout hits the Insider.'
      : 'Round 4, Room A: the Blue Disabler\'s Blackout hits the Supplier; the Cracker shoots the Blue Disabler; the Alien shoots the Cracker. Room B: the Red Disabler\'s Blackout hits the Insider; Undercover shoots the Hacker; the Officer shoots Undercover.')],
  then: [m => `${m.mode === 7 ? 'Four' : m.mode === 8 ? 'Five' : 'Six'} players are Injured in one stage. Every registered attack resolves although several of its actors are hurt in the same stage.`, m => `All are in Hospital, in positions 1 to ${m.mode === 7 ? 4 : m.mode === 8 ? 5 : 6}. Nobody waits in a room.`, m => `Hospital has ${m.hospitalSlots} positions; ${m.hospitalSlots - (m.mode === 7 ? 4 : m.mode === 8 ? 5 : 6)} are free.`],
  note: ['Which player holds which position is the question of SLOT-03 (NV-F-03).'],
  sees: ['Public: every patient in Hospital.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-03'], needs: ['BE-02', 'BE-09'],
});
add('HSP-05', 'Rescued in the following round', {
  refs: ['G-07', 'G-05', 'Q-H04'], rules: ['R-ROLE-02', 'R-ROLE-04', 'R-STATE-08', 'R-CAP-19'], basis: 'stated',
  given: ['As HSP-01 at the start of Round 3.'],
  when: ['Round 3. Cracker, own turn, in Room A: registers a Rescue of Undercover, who is in Hospital.', 'Round 3 resolves.'],
  then: ['Rescue stage: Undercover is Healthy. The episode is cleared.', 'No death applies.', 'Placement: Undercover returns to Room A, the room they remember, in slot 3, the lowest free slot.', 'The Cracker has one Rescue left.'],
  sees: ['The recovery is public and comes from the Hospital. Nothing points to the Cracker.'],
  timing: ['The Rescue stage is before the due deaths in the same resolution.'],
  needs: ['BE-07', 'BE-09', 'FE-07'],
});
add('HSP-06', 'A Rescue registered in the round of the injury', {
  refs: ['G-07', 'G-05', 'Q-H04', 'Q-D02'], rules: ['R-ROLE-02', 'R-ACT-06', 'R-ACT-08', 'R-CAP-22'], basis: 'reading',
  given: ['Layout MIX. Round 2.'],
  when: ['Cracker, own turn (second): registers a Rescue of Undercover, who is Healthy and in the same room. The Cracker then moves to Room B, leaving Room A slot 1 empty.', 'Blue Disabler: requests a Blackout and in darkness selects Room A slot 3 (Undercover).'],
  then: ['Attack stage: Undercover is Injured, and by the letter of the packet in Hospital from that instant. Rescue stage: Undercover is Healthy. No episode remains.', 'Placement: Undercover returns to Room A as a healed player and takes slot 1, the lowest free position, not slot 3.', 'The Rescue and the Blackout use are spent.'],
  other: ['Only the resulting change is shown, as the kept rule R-ACT-08 has it: Undercover appears in slot 1, and no outcome is shown.', 'If nobody changes place within a stage (the answer suggested under NV-F-01), Undercover stays in slot 3, and whether the recovery is shown is the only question left.'],
  sees: ['Recommended reading (NV-F-08): the recovery is shown, as the packet shows medical recoveries, without its source. The table sees that Undercover was hurt and healed in this round; here the new position shows that something happened anyway.', 'The table learns that Undercover was attacked, and that the Cracker stood in Undercover\'s room when the Rescue was registered. Today it sees nothing of such a round.', 'No payload names the Cracker or the Blue Disabler.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-08', 'NV-F-01'], needs: ['BE-07', 'BE-08', 'BE-09'],
});
add('HSP-07', 'A Rescue that heals nobody is spent and moves no deadline', {
  refs: ['G-07', 'Q-H04'], rules: ['R-ACT-07', 'R-ROLE-02'], basis: 'stated',
  given: ['Layout MIX. Round 1: the Blue Disabler\'s Blackout injures Undercover. Due at the end of Round 2.'],
  when: ['Round 2. Cracker, own turn: registers a Rescue of the Alien, who is Healthy.', 'Round 2 resolves.'],
  then: ['The Rescue heals nobody and is spent: one left.', 'Undercover dies on schedule at the end of Round 2.'],
  sees: ['Public: the death.'],
  timing: [NO_CLOCK],
  needs: ['BE-09'],
});
add('HSP-08', 'Healed and hurt again: a new episode with its own deadline', {
  refs: ['G-07', 'Q-H04'], rules: ['R-ROLE-07', 'R-SHOT-03'], basis: 'stated',
  given: ['Layout ARMS. Round 1: the Blue Disabler\'s Blackout injures Undercover (Room A slot 4).'],
  when: ['Round 2. The Cracker rescues Undercover.', 'Round 3. Supplier arms the Alien and the Cracker.', 'Round 4. The Alien registers a shot at Undercover.'],
  then: ['End of Round 2: Undercover is Healthy, back in Room A slot 4. The first episode is cleared.', 'End of Round 4: Undercover is Injured again. A new episode: admitted in Round 4, due at the end of Round 5.', 'The first episode\'s deadline plays no part.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-09'],
});
add('HSP-09', 'A vote against a patient records detention and moves nobody, and the deadline stands', {
  refs: ['G-05', 'G-07', 'Q-H02', 'Q-H04'], rules: ['R-VOTE-02'], basis: 'stated',
  given: ['As HSP-01 at the start of Round 3.'],
  when: [m => `Round 3. Jail vote: ${m.need} of ${m.mode} ballots name Undercover, the patient.`, 'Round 3 resolves with no Rescue.'],
  then: ['At V Undercover is detained and stays in Hospital slot 1. Nobody enters Jail.', 'At the end of Round 3 Undercover dies on schedule.'],
  sees: ['Public: detained, in Hospital.'],
  timing: ['Detention neither shortens nor lengthens the episode.'],
  needs: ['BE-09', 'FE-07'],
});
add('HSP-10', 'A detained patient who is healed returns to Jail', {
  refs: ['G-05', 'G-07', 'Q-H02'], rules: ['R-STATE-08', 'R-VOTE-08'], basis: 'stated',
  given: ['As HSP-01 at the start of Round 3.'],
  when: ['Round 3. Cracker, own turn: registers a Rescue of Undercover.', m => `Jail vote: ${m.need} of ${m.mode} ballots name Undercover.`, 'Round 3 resolves.'],
  then: ['Rescue stage: Undercover is Healthy.', 'Placement: Undercover goes to Jail slot 1, still detained. Not to Room A.', 'Hospital slot 1 is empty.'],
  sees: ['Public: the recovery, then a prisoner in Jail.'],
  timing: ['In placement, healed detained patients are returned to Jail before free players are returned to rooms.'],
  needs: ['BE-02', 'BE-09'],
});
add('HSP-11', 'The Cracker as a free patient', {
  refs: ['G-05', 'G-07'], rules: ['R-ROLE-03', 'R-STATE-03'], basis: 'kept',
  given: ['Layout MIX. Round 2: the Blue Disabler\'s Blackout injures the Cracker (Room A slot 1).'],
  when: ['Round 3. Cracker, own turn, in Hospital: registers a Rescue of themself.'],
  then: ['Accepted: an Injured Cracker may Rescue themself, and nobody else.', 'Rescue stage: the Cracker is Healthy, and returns to Room A slot 1.', 'One Rescue left.', 'A Rescue of any other patient by the Injured Cracker would be refused.'],
  sees: ['Public: the recovery.'],
  timing: [NO_CLOCK],
  needs: ['BE-09'],
});
add('HSP-12', 'The Cracker as a detained patient', {
  refs: ['G-05', 'G-07', 'Q-H02'], rules: ['R-STATE-04', 'R-ROLE-03'], basis: 'derived',
  given: ['Layout MIX. Round 4: Undercover registers a shot at the Cracker; the vote jails the Cracker; the shot injures them. The Cracker is in Hospital, detained, due at the end of Round 5.'],
  when: ['Round 5. Cracker, own turn: registers a Rescue of themself.'],
  then: ['Refused: a Jailed player has no Main Action, and being in Hospital does not change that.', 'At the end of Round 5 the Cracker dies.'],
  sees: ['Public: the death.'],
  timing: [NO_CLOCK],
  needs: ['BE-09'],
});
add('HSP-13', 'A patient of Round 4: Round 5 is the whole rescue opportunity', {
  refs: ['G-07', 'Q-H03a'], rules: ['R-WIN-01', 'R-WIN-07', 'R-RES-01'], basis: 'stated',
  given: ['Layout MIX. Round 4: Undercover\'s shot injures the Alien. Admitted in Round 4; due at the end of Round 5.'],
  when: ['Round 5, one match: nobody rescues.', 'Round 5, another match: the Cracker rescues the Alien.'],
  then: ['First match: after the Rescue stage of Round 5 the Alien dies. At the Round 5 check the Alien adds nothing to Blue Power and cannot win with Blue.', 'Second match: the Alien is Healthy and back in Room A before the Round 5 check; they add one to Blue Power.'],
  sees: ['Public.'],
  timing: ['Rescue, then due deaths, then placement, then the victory check, all inside the resolution of Round 5.'],
  needs: ['BE-07', 'BE-09'],
});
add('HSP-14', 'Hurt in Round 5: no death, no extra round', {
  refs: ['G-07', 'Q-H03a'], rules: ['R-FLOW-01', 'R-WIN-10'], basis: 'stated',
  given: ['Layout MIX. Round 5.'],
  when: ['Undercover registers a shot at the Alien. Round 5 resolves.'],
  then: ['The Alien is Injured, in Hospital, alive.', 'No death is due for this episode. No Round 6, no extra Rescue.', 'At the Round 5 check the Alien adds nothing to Blue Power.', 'If there is no winner the showdown follows, and the Alien takes part from Hospital.'],
  sees: ['Public. No countdown is shown that could run out.'],
  timing: [NO_CLOCK],
  needs: ['BE-09', 'BE-12', 'FE-07'],
});
add('HSP-15', 'Two patients of one round and one Rescue a round', {
  refs: ['G-07', 'Q-H04'], rules: ['R-ACT-01', 'R-SETUP-13'], basis: 'derived',
  given: ['The end of SLOT-03: the Blue Disabler and the Alien were both admitted in Round 4.'],
  when: ['Round 5. Cracker, own turn: registers a Rescue of the Alien.'],
  then: ['The Alien is healed and returns to Room A.', 'The Blue Disabler dies at the end of Round 5: a Rescue is a Main Action, one a turn.', 'Of the patients of one round, the Rescue of the following round can save one.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-09'],
});
add('HSP-16', 'A Protection does not stop a Hospital death', {
  refs: ['G-07', 'Q-H04'], rules: ['R-PROT-02', 'R-PROT-03'], basis: 'stated',
  given: ['Layout MIX. Round 1: Undercover grants Protection to the Cracker (active from Round 2). In the same round the Blue Disabler\'s Blackout injures the Cracker: a pending Protection blocks nothing.'],
  when: ['Round 2. Nobody rescues, the Cracker included. Round 2 resolves.'],
  then: ['The Cracker dies at the end of Round 2, holding an active, unused Protection.', 'The Protection is not used up by the death.'],
  sees: ['No room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-08', 'BE-09'],
});
add('HSP-17', 'A patient\'s own turn', {
  refs: ['G-05', 'G-07'], rules: ['R-STATE-03', 'R-FLOW-04', 'R-HACK-03', 'R-MOVE-02'], basis: 'derived',
  given: ['The end of SLOT-03: the Blue Disabler and the Alien are patients in Hospital. Round 5.'],
  when: ['The Alien, own turn: requests a Hack with the Blue Disabler; tries to activate the Clone; sends a move.', 'The Alien votes in the Jail vote.'],
  then: ['The Hack is accepted: the two are in the same place.', 'The activation and the move are refused.', 'The ballot is accepted.'],
  sees: ['The Hack\'s pair is public from its first stage.'],
  timing: [NO_CLOCK],
  needs: ['BE-05', 'BE-09'],
});
add('HSP-18', 'A healed player whose room has filled up goes to the other room', {
  refs: ['G-05', 'G-07', 'Q-H04'], rules: ['R-CAP-07', 'R-CAP-22', 'R-ROLE-04', 'R-STATE-08'], basis: 'stated',
  given: ['Layout MIX. Round 1: the Blue Disabler\'s Blackout injures Undercover (Room A slot 3).'],
  when: [m => (m.mode === 7 ? 'Round 2. The Insider and the Supplier move to Room A and take slots 3 and 5. Room A holds five.' : 'Round 2. The Insider moves to Room A and takes slot 3. Room A holds five.'), 'Cracker, own turn, in Room A: registers a Rescue of Undercover.', 'Round 2 resolves.'],
  then: ['Undercover is healed. The room they remember, Room A, is full.', 'Undercover goes to Room B and takes slot 1, the lowest free position.', 'Undercover now remembers Room B.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-02', 'BE-09'],
});
add('HSP-19', 'A Captain hurt and healed in one round has lost the title and is seated in a room', {
  refs: ['G-05', 'G-07', 'G-09', 'Q-H04', 'Q-M02'], rules: ['R-ACT-06', 'R-CAPT-07', 'R-CAPT-14', 'R-ROLE-02', 'R-CAP-22'], basis: 'derived',
  given: ['Layout MIX. The election after Round 1 elects the Alien. In Round 3 the Alien moves out to Room A and takes slot 4.'],
  when: ['Round 4. Cracker, own turn (second): registers a Rescue of the Alien, who is Healthy and in the same room.', 'Undercover, own turn (fifth): registers a shot at the Alien.', 'The Alien then moves into Command Room.', 'The round resolves.'],
  then: ['Attack stage: the Alien is Injured and loses the title at once.', 'Rescue stage: the Alien is Healthy. The title does not come back.', 'Placement: no longer Captain, the Alien is seated in Room A, the room they remember, in slot 4, the lowest free position. Command Room is empty.', 'An election is held before Round 5.'],
  sees: ['Public: the loss of the title and the Alien\'s place. What the table sees of the injury and the recovery is NV-F-08.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-08'], needs: ['BE-02', 'BE-09'],
});
add('HSP-20', 'A Captain Eliminated by two shots registered in a room, after stepping into Command Room', {
  refs: ['G-05', 'G-07', 'Q-H04'], rules: ['R-ACT-06', 'R-CAPT-07', 'R-CAP-24'], basis: 'derived',
  given: ['Layout ARMS. The election after Round 1 elects the Alien. Round 3: the Alien moves out to Room A and takes slot 5; Supplier arms the Cracker and the Blue Disabler.'],
  when: ['Round 4. The Cracker and Undercover each register a shot at the Alien, who is in Room A.', 'The Alien then moves into Command Room.', 'The round resolves.'],
  then: ['The first shot injures the Alien, who loses the title at once and, by the letter of the packet, goes straight to Hospital. The second eliminates the Alien.', 'After the resolution the body is seated like a returning player, as the owner decided for this case on 11 October (R-CAP-24): in Room A, the room the Alien was last in, slot 5. Command Room is empty.'],
  other: ['If the transfer to Hospital at the first hit is taken to decide where this body lies too, as it does for every other player, the body stays in Hospital (NV-F-01).'],
  sees: ['Public: the Alien Eliminated, and where the body is.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-02', 'BE-09'],
});
add('HSP-21', 'A detained patient and a Hack', {
  refs: ['G-05', 'G-02', 'Q-H02'], rules: ['R-STATE-04', 'R-HACK-02', 'R-HACK-03'], basis: 'reading',
  given: ['Layout MIX. Round 4: the Blue Disabler\'s Blackout injures the Cracker; Undercover registers a shot at the Alien; the vote jails the Alien; the shot injures them.', 'The Cracker is a free patient and the Alien a detained patient, both in Hospital.'],
  when: ['Round 5. The Alien, own turn: requests a Hack with the Cracker.'],
  then: ['Recommended reading (NV-F-12): accepted. A Jailed player may take part in a Hack where the other rules allow it, and the two are in the same place.'],
  other: ['Refused, if "medical detention does not create additional Hospital actions" means that a detained patient can do no more than a prisoner in Jail could, who could not have reached the Cracker.'],
  sees: ['If it is accepted, the pair is public like any other.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-12'], needs: ['BE-05', 'BE-09'],
});

// ---------------------------------------------------------------------------------------------
// DEF: what a room sees of a block
// ---------------------------------------------------------------------------------------------
const PROTECTED = 'Layout MIX. Round 1: Undercover grants Protection to the Cracker. It is active from Round 2.';
add('DEF-01', 'A Protection blocks: who is told, and what', {
  refs: ['G-04', 'Q-D01', 'Q-D02'], rules: ['R-PROT-03'], basis: 'stated',
  given: [PROTECTED],
  when: ['Round 2. The Blue Disabler requests a Blackout and in darkness selects Room A slot 1 (Cracker).'],
  then: ['Blocked. The Cracker is Healthy in Room A slot 1. The Protection is used up. The Blackout use is spent.'],
  sees: [m => `A room event goes to the seats that were in Room A when the attack was applied: the Cracker, the Blue Disabler, Undercover, the Alien${m.two ? ' and the Red Disabler' : ''}.`, 'It names the affected player and says ATTACK BLOCKED. It carries no cause, grantor, attacker, direction, role or counter.', 'The Cracker learns that they were attacked and that something stopped it, and not what.', 'Undercover also reads, privately as before, that the Protection was used up.'],
  timing: ['Delivered after the whole resolution, not when the single attack is applied.'],
  needs: ['BE-08', 'FE-05'], controls: ['V13-07'],
});
add('DEF-02', 'A Clone blocks: the same event', {
  refs: ['G-04', 'G-03', 'Q-C02a', 'Q-D01'], rules: ['R-VIEW-07'], basis: 'stated',
  given: ['Layout MIX, played twice. Run one: in Round 2 the Alien activates the Clone and holds no Protection. Run two: in Round 1 Undercover grants Protection to the Alien, and the Alien never activates the Clone.'],
  when: ['Round 2, both runs. The Blue Disabler requests a Blackout and in darkness selects Room A slot 4 (Alien).'],
  then: ['Blocked in both runs. The Alien is Healthy.', 'Run one: the Clone stays active. Run two: the Protection is used up.'],
  sees: ['Every seat of Room A other than the Alien and Undercover reads the same payloads in both runs, at every moment of the match up to this point.', 'The event has the same fields, the same values and the same form of identity in both.', 'The Alien and Undercover differ only in what was already private to them.'],
  timing: ['The same instants in both runs.'],
  needs: ['BE-08', 'FE-05'],
});
add('DEF-03', 'Outside the room nothing is shown', {
  refs: ['G-04', 'Q-D01', 'Q-D02'], rules: ['R-VIEW-02'], basis: 'stated', pair: 'DEF-01',
  given: ['DEF-01, and beside it a run in which the Blue Disabler asks for nothing in Round 2.'],
  when: ['Both runs resolve Round 2.'],
  then: ['The public state is the same in both runs.'],
  sees: [m => `The seats of Room B (the Insider, the Supplier, the Hacker${m.officer ? ', the Officer' : ''}), a host without a seat and the shared display read the same payloads in both runs at every moment.`, 'They get no event, badge, count or sound, and no revision of their view that the other run lacks.'],
  timing: ['The same instants in both runs.'],
  needs: ['BE-08', 'FE-05'],
});
add('DEF-04', 'Entering the room later, or reconnecting, shows nothing of it', {
  refs: ['G-04', 'G-08', 'Q-D01'], rules: [], basis: 'stated', layer: 'client',
  given: ['The end of DEF-01.'],
  when: ['Round 3. The Alien moves to Room B; the Insider then moves to Room A.', 'Undercover, who was in Room A for the block, closes the app and opens it again.'],
  then: ['The Insider is in Room A and receives nothing about Round 2.', 'Undercover gets the current state and no replay.'],
  sees: ['Neither can read from any payload that a block happened in the room.'],
  timing: [NO_CLOCK],
  needs: ['BE-08', 'BE-11', 'FE-05'],
});
add('DEF-05', 'A room member who is hurt later in the same stage still gets the event', {
  refs: ['G-04', 'Q-D01'], rules: ['R-RES-02'], basis: 'stated',
  given: [PROTECTED, 'Round 4. Turn order by player number.'],
  when: ['The Blue Disabler (third) requests a Blackout; Undercover (fifth) registers a shot at the Alien.', 'In darkness the Blue Disabler selects Room A slot 1 (Cracker).'],
  then: ['The Blackout is applied first and blocked. Then the shot injures the Alien.', 'The Alien was in Room A when the block was applied and is a recipient, although the event reaches them in Hospital.'],
  sees: ['The Alien reads the room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-08'],
});
add('DEF-06', 'A room member who is hurt earlier in the same stage', {
  refs: ['G-04', 'Q-D01', 'Q-D02'], rules: ['R-RES-02'], basis: 'reading',
  given: ['As DEF-05, but the turn order of Round 4 has Undercover before the Blue Disabler.'],
  when: ['The same commands.'],
  then: ['The shot is applied first and injures the Alien. Then the Blackout is blocked.', 'Recommended reading: who is in the room is fixed once, when the attack stage begins. The Alien is a recipient, exactly as in DEF-05.'],
  other: ['By the letter of the sentence on recipients: the Alien was already in Hospital in the working state when the block was applied, and is not a recipient. What the Alien received then says which of the two attackers acted first.'],
  sees: ['Under the recommended reading no seat can tell DEF-05 from DEF-06 by what it received.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-02'], needs: ['BE-08'],
});
add('DEF-07', 'The target was jailed after the shot was registered', {
  refs: ['G-04', 'Q-D01'], rules: ['R-ACT-06', 'R-VIEW-06'], basis: 'stated',
  given: ['Layout ARMS. Round 1: Undercover grants Protection to the Cracker. Round 3: Supplier arms the Alien and the Blue Disabler.'],
  when: ['Round 4. The Alien registers a shot at the Cracker.', m => `Jail vote: ${m.need} of ${m.mode} ballots name the Cracker.`],
  then: ['At V the Cracker is in Jail. The shot is applied there and blocked.', 'The Cracker is Healthy, in Jail.'],
  sees: ['The room is the one the target is in when the attack is applied: Jail. The Cracker is the only recipient.', 'Room A gets nothing. The Alien, who fired, is told only that the shot was completed.'],
  timing: [NO_CLOCK],
  needs: ['BE-08'],
});
add('DEF-08', 'A Captain blocked inside Command Room', {
  refs: ['G-04', 'Q-D01'], rules: ['R-ACT-06', 'R-CAPT-07'], basis: 'derived',
  given: [PROTECTED, 'The election after Round 1 elects the Cracker. In Round 3 the Cracker moves out to Room A.'],
  when: ['Round 4. Undercover registers a shot at the Cracker in Room A. The Cracker then moves into Command Room.'],
  then: ['The shot is applied in Command Room and blocked. The Cracker is Healthy and stays Captain.'],
  sees: ['The Cracker alone receives the room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-08'],
});
add('DEF-09', 'An Eliminated seat that lies in the room of a block', {
  refs: ['G-04', 'Q-D01'], rules: ['R-CAP-24', 'R-PROT-02', 'R-PROT-03'], basis: 'derived',
  given: ['Layout ARMS. Round 1: Undercover grants Protection to the Supplier. Nobody attacks the Supplier in Rounds 2 to 4.', 'The election after Round 1 elects the Alien. Round 3: the Alien moves out to Room A and takes slot 5; Supplier arms the Cracker and the Blue Disabler. Round 4: the Cracker and Undercover each register a shot at the Alien in Room A, and the Alien then moves into Command Room. The Alien is Eliminated, and the body is seated in Room A slot 5 (HSP-20).'],
  when: ['Round 5. The Blue Disabler requests a Blackout and in darkness selects Room A slot 3 (Supplier).'],
  then: ['Blocked; the Protection is used up.'],
  other: ['If the transfer to Hospital at the first hit is taken to decide where the Alien\'s body lies too (HSP-20, NV-F-01), no body lies in Room A and the Alien\'s seat is not a recipient.'],
  sees: ['The room event goes to the seats in Room A when the stage began: the Cracker, the Blue Disabler, the Supplier, Undercover, and the Alien\'s Eliminated seat.', 'As the packet says of retained Eliminated occupants, the Alien\'s seat gains no other room\'s events.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-08'],
});
add('DEF-10', 'Nothing in the delivery follows the attackers', {
  refs: ['G-04', 'Q-D02'], rules: ['R-RES-02'], basis: 'stated',
  given: [PROTECTED, 'Round 4, played twice. The Alien activates the Clone on their turn in both runs.'],
  when: ['Run one: the Blue Disabler\'s Blackout hits slot 1 (Cracker); Undercover shoots the Alien.', 'Run two: the Blue Disabler\'s Blackout hits slot 4 (Alien); Undercover shoots the Cracker.'],
  then: ['Both attacks are blocked in both runs. The same two players are affected.', 'The order in which the two blocks were applied is the reverse in run two.'],
  sees: [m => `${m.two ? 'The Cracker, the Alien and the Red Disabler' : 'The Cracker and the Alien'} read the same payloads in both runs: the same two events, in the same order, with the same times.`, 'Event identities do not count attacks or carry a resolution index.'],
  timing: ['The same instants in both runs.'],
  needs: ['BE-08', 'FE-05'],
});
add('DEF-11', 'What an attacker is told', {
  refs: ['G-04', 'Q-D01'], rules: ['R-VIEW-06'], basis: 'derived',
  given: ['DEF-01 and DEF-07.'],
  when: ['The round resolves.'],
  then: ['The attacker\'s own record says registered, and later completed. It never says blocked.', 'In DEF-01 the Blue Disabler is in the target\'s room and receives the room event like every member.', 'In DEF-07 the Alien is not, and learns nothing more.'],
  sees: ['As stated.'],
  timing: [NO_CLOCK],
  needs: ['BE-06', 'BE-08'],
});
add('DEF-12', 'A hit that is not blocked', {
  refs: ['G-04', 'G-01', 'Q-D02'], rules: ['R-ACT-08', 'R-VIEW-06'], basis: 'stated',
  given: ['BLK-02 and BLK-24.'],
  when: ['The round resolves.'],
  then: ['The health and place of the player who was hit are public.', 'No audience gets a cause, a source, a room of origin or a direction.', 'Two hits on one player are two outcomes.'],
  sees: ['The same public facts for a seat in the room, a seat outside it and the shared display.'],
  timing: ['The times of the outcomes do not follow the order or the arrival of the hidden actions.'],
  needs: ['BE-08', 'FE-05'],
});
add('DEF-13', 'A host who holds a seat reads what that seat reads, and no more', {
  refs: ['G-04', 'Q-D01', 'Q-D02'], rules: ['R-VIEW-04', 'R-PROT-06'], basis: 'stated', layer: 'service',
  given: ['DEF-01, played twice. In one match the host holds the Alien\'s seat, in Room A. In the other the host holds the Insider\'s seat, in Room B.'],
  when: ['Round 2 resolves.'],
  then: ['First match: the host reads the room event as the Alien\'s seat does, and nothing of any other seat\'s private view: not Undercover\'s record that the Protection was used up.', 'Second match: the host reads what the Insider\'s seat reads, with the host\'s own controls: nothing of the block.'],
  sees: ['Being host gives no audience of its own.'],
  timing: [NO_CLOCK],
  needs: ['BE-08'],
});

// ---------------------------------------------------------------------------------------------
// VOT and HCK: vote results and the declared-side Hack
// ---------------------------------------------------------------------------------------------
add('VOT-01', 'From the closing of the vote to the resolution, with a Captain jailed', {
  refs: ['G-01', 'G-09', 'Q-B02a', 'Q-M02'], rules: ['VOTE-RESULT-01', 'VOTE-RESULT-03', 'R-CAPT-07', 'R-CAPT-12'], basis: 'stated',
  given: [CAPTAIN],
  when: [m => `Round 2. Jail vote: ${m.need} of ${m.mode} ballots name the Insider. It closes at V.`],
  then: ['At V: the Insider is Jailed, loses the title and is in Jail slot 1. Command Room is empty.', 'Then the result, then the window, then the resolution.', 'An election is held before Round 3.'],
  sees: ['The tally is public for the whole result. No individual ballot is shown.'],
  timing: [CLOCK],
  needs: ['BE-04', 'FE-08'], controls: ['V14-01', 'V14-04'],
});
add('VOT-02', 'A closure that is delivered late takes no time from the next phase', {
  refs: ['G-01', 'Q-B03a'], rules: ['VOTE-RESULT-04', 'VOTE-RESULT-05'], basis: 'derived', layer: 'service',
  given: ['Layout MIX. Round 1. The Blue Disabler has requested a Blackout.'],
  when: ['The Jail vote closes at V.', 'The closure of the result is delivered three seconds late and commits at V + 8 s.', 'The closure of the window is delivered two seconds late and commits at V + 25 s.'],
  then: ['The window opens at V + 8 s and is whole: lit [V + 8 s, V + 13 s), dark [V + 13 s, V + 23 s).', 'A selection at V + 22 s is accepted. A selection at V + 24 s is refused.', 'The round resolves at V + 25 s. The phase that follows gets its full time from then.'],
  sees: ['Every phone shows the times the server gives, not times it counted itself.'],
  timing: ['Each phase runs its full length from the commit that opened it.'],
  needs: ['BE-04', 'BE-11', 'FE-08'], controls: ['V14-03'],
});
add('VOT-03', 'What is accepted between the closing of the vote and the resolution', {
  refs: ['G-01', 'G-09', 'Q-B02d', 'Q-P01a', 'Q-C02b'], rules: ['VOTE-RESULT-04', 'R-ROLE-15'], basis: 'derived',
  given: ['Layout MIX. Round 5. The Blue Disabler has requested a Blackout. A Captain is in office and a prisoner is in Jail. The Clone is unused.'],
  when: ['During the result: a move, a ballot, a Clone activation, RELEASE, EJECT, a Code.', 'During the window: the same six, and the Blue Disabler\'s selection in darkness.'],
  then: ['During the result every one of the six is refused.', 'During the window the selection is accepted and the first five are refused.', 'The Code during the window is accepted: the Hacker may enter it at any time in Round 5 before the round\'s resolution closes (R-ROLE-15), and the packet, which closes the window to movement, to the Clone and to the Captain\'s commands, does not close it to the Code.'],
  other: ['If the window is meant to be like the result, the Code is refused in it too. The packet does not say so.'],
  sees: ['Private refusals.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-07'], needs: ['BE-04', 'BE-05'], controls: ['V14-02'],
});
add('VOT-04', 'Election and runoff results', {
  refs: ['G-08'], rules: ['VOTE-RESULT-01', 'VOTE-RESULT-03', 'R-CAPT-02', 'R-CAPT-05'], basis: 'kept',
  given: ['Layout MIX. Round 1 has resolved.'],
  when: ['The election ties between the Insider and the Cracker.', 'The runoff elects the Insider.'],
  then: ['A five-second result after the election; a runoff of sixty seconds; a five-second result after the runoff.', 'The Insider is Captain and in Command Room from the closing of the runoff.', 'The first turn of Round 2 has its full sixty seconds.'],
  sees: ['Each result shows totals only.'],
  timing: ['Election 60 s, result 5 s, runoff 60 s, result 5 s, each from its own opening.'],
  needs: ['BE-04', 'FE-08'], controls: ['V14-04'],
});
add('HCK-01', 'Who is in the Chamber is public', {
  refs: ['G-02', 'Q-HK01'], rules: ['R-VIEW-07', 'HACK-DECLARE-04'], basis: 'reading',
  given: ['Layout MIX. Round 1. The Insider requests a Hack with the Supplier on their own turn.'],
  when: ['The Insider\'s turn ends and the declaration stage opens.'],
  then: ['The pair and the stage are public facts of the Hack. That much the packet states.', 'Recommended reading (NV-F-11): from the opening of the declaration stage, through the result and the conversation.', 'Before the declaration stage the request is private.'],
  other: ['The pair becomes public with the entrance, in the result stage; during the declaration the table reads only the initiator, as today.'],
  sees: ['Every seat, the host and the shared display read both participants and the stage.', 'This replaces the rule of the declared-Hack ruleset, under which only the two read who the partner is.'],
  timing: ['From the opening of the declaration stage to the end of the conversation, under the recommended reading.'],
  findings: ['NV-F-11'], needs: ['BE-07', 'FE-08'], controls: ['V15-04', 'V13-02'],
});
add('HCK-02', 'What is claimed stays between the two', {
  refs: ['G-02', 'Q-HK01', 'Q-HK03'], rules: ['HACK-DECLARE-02', 'HACK-DECLARE-04', 'R-ROLE-12'], basis: 'stated',
  given: ['Layout MIX, played twice. Round 1. The Cracker requests a Hack with Undercover.'],
  when: ['Run one: Undercover declares Blue four seconds into the declaration stage.', 'Run two: Undercover declares Red at the same instant.'],
  then: ['Both declarations are accepted: Undercover may bluff.'],
  sees: ['The Cracker and Undercover read the declared side for the five seconds of the result.', 'Every other audience reads the same payloads in both runs: the pair and the stage, no claim, no sign of whether one was made truthfully.', 'After the conversation the two no longer read the claim as a live result.'],
  timing: ['The same instants in both runs.'],
  needs: ['BE-07', 'FE-08'], controls: ['V15-03', 'V15-04'],
});
add('HCK-03', 'Fifteen, five, sixty', {
  refs: ['G-02', 'Q-HK01'], rules: ['HACK-DECLARE-01', 'HACK-DECLARE-03', 'HACK-DECLARE-07'], basis: 'stated',
  given: ['As HCK-01. The declaration stage opens at D.'],
  when: ['The Supplier declares at D + 4 s.', 'No phone sends anything else, and none acknowledges an animation.'],
  then: ['Declaration: closes at D + 4 s. Without a declaration it would close at D + 15 s.', 'Result: five seconds. Entrance and door are inside it.', 'Conversation: sixty seconds from its own opening.', 'Then the next player\'s turn, with its full sixty seconds.'],
  sees: ['The private result is readable for all five seconds: the entrance does not cover it.'],
  timing: ['Result [D + 4 s, D + 9 s). Conversation [D + 9 s, D + 69 s), when both closures are delivered on time.', 'No stage waits for a client.'],
  needs: ['BE-04', 'FE-08'], controls: ['V15-01'],
});
add('HCK-04', 'No declaration', {
  refs: ['G-02', 'Q-HK01'], rules: ['HACK-DECLARE-03'], basis: 'stated',
  given: ['As HCK-01.'],
  when: ['The Supplier declares nothing for fifteen seconds.'],
  then: ['The result says No side declared. No side is made up.', 'Then five seconds of result and sixty of conversation, as in HCK-03.'],
  sees: ['The two participants read the result. The pair stays public.'],
  timing: ['Result [D + 15 s, D + 20 s). Conversation [D + 20 s, D + 80 s).'],
  needs: ['BE-04', 'FE-08'], controls: ['V15-02'],
});
add('HCK-05', 'The Chamber is not a room', {
  refs: ['G-02', 'Q-HK02'], rules: ['R-MOVE-01', 'HACK-DECLARE-06'], basis: 'stated',
  given: ['Layout MIX. Round 1. The Cracker requests a Hack with Undercover on their own turn. The Cracker is in Room A slot 1 and Undercover in Room A slot 3.'],
  when: ['During the conversation Undercover moves to Room B.'],
  then: [m => `Accepted: Undercover is in Room B slot ${m.officer ? 5 : 4}, and Room A slot 3 is empty.`, 'Through all three stages both participants keep their room and position unless they move themselves.', 'No room gains or loses a place because of the Hack. Nobody becomes harder or easier to target, vote for or move next to.'],
  sees: ['The move is public when it is made.', 'At the end of the conversation each figure is shown at the position the server gives then: the Cracker in Room A slot 1, Undercover in Room B.'],
  timing: ['The exit is not a phase and has no time of its own.'],
  needs: ['BE-02', 'FE-08'],
});
add('HCK-06', 'A declaration deadline that is delivered late', {
  refs: ['G-02', 'Q-HK01'], rules: ['HACK-DECLARE-07', 'HACK-DECLARE-03'], basis: 'stated', layer: 'service',
  given: ['As HCK-04.'],
  when: ['The closure of the declaration stage commits at D + 17 s. The closure of the result commits at D + 24 s.'],
  then: ['Result [D + 17 s, D + 22 s): five full seconds from its opening.', 'Conversation [D + 24 s, D + 84 s): sixty full seconds from its opening.'],
  sees: ['Phones show the server\'s times.'],
  timing: ['As stated.'],
  needs: ['BE-04', 'BE-11'], controls: ['V15-06'],
});
add('HCK-07', 'The conversation itself', {
  refs: ['G-02', 'Q-HK03'], rules: ['R-HACK-04', 'R-HACK-05'], basis: 'stated', status: 'manual', layer: 'table',
  given: ['A table of people, during a Hack\'s conversation stage.'],
  when: ['The two step aside and talk.'],
  then: ['They can talk for sixty seconds without the others hearing.', 'The app carries no voice, records nothing, and shows no microphone or recording sign.'],
  sees: ['The app does not, and cannot, show that nobody overheard.'],
  timing: ['Sixty seconds on the shared clock.'],
  needs: ['FE-08'],
});
add('HCK-08', 'Who may start a Hack, and with whom', {
  refs: ['G-02'], rules: ['R-HACK-01', 'R-HACK-02', 'R-HACK-03', 'R-ACT-04', 'HACK-DECLARE-05'], basis: 'kept',
  given: ['Layout MIX. Round 1.'],
  when: ['The Insider requests a Hack with the Cracker, who is in the other room; with themself; with the Supplier.', 'Later in the round two more players each request a Hack.', 'In Round 2 the Insider requests another.'],
  then: ['Other room: refused. Self: refused. The Supplier: accepted.', 'The second Hack of the round is accepted; the third is refused.', 'The Insider\'s second is refused: one a match.'],
  sees: ['A refused request is private.'],
  timing: [NO_CLOCK],
  needs: ['BE-05'],
});
add('HCK-09', 'A declaration at the instant the stage ends', {
  refs: ['G-02', 'Q-HK01'], rules: ['R-FLOW-08', 'HACK-DECLARE-01', 'HACK-DECLARE-03'], basis: 'kept',
  given: ['As HCK-01. The declaration stage opens at D.'],
  when: ['The Supplier declares at D + 15 s exactly, and nothing before.'],
  then: ['Refused: the stage is over at its deadline.', 'The result says No side declared.'],
  sees: ['The two participants read the result.'],
  timing: ['A declaration is accepted in [D, D + 15 s).'],
  needs: ['BE-04'],
});

// ---------------------------------------------------------------------------------------------
// SHW: the showdown
// ---------------------------------------------------------------------------------------------
add('SHW-01', 'Everybody stays where they are', {
  refs: ['G-07', 'Q-H03'], rules: ['R-WIN-10', 'R-SHOW-01', 'R-SHOW-02'], basis: 'stated',
  given: [TIE, R5_SHOT, m => `At the Round 5 check Red Power is ${m.mode === 7 ? 2 : 3} and Blue Power is ${m.mode === 7 ? 1 : 2}; no Code; nobody Eliminated. No condition is met.`],
  when: ['The showdown opens.'],
  then: ['Nobody is moved. Rooms and positions are what they were: prisoners in Jail, the Alien in Hospital, the Hacker in Command Room.', 'There is no Final Zone.', 'Every player who is not Eliminated has one special shot: the prisoners and the patient too.'],
  sees: ['A shared scene is laid over the board; the board under it is unchanged.'],
  timing: ['One window of sixty seconds for every participant.'],
  needs: ['BE-12', 'FE-10'], controls: ['V13-09'],
});
add('SHW-02', 'Any other survivor can be named, from anywhere', {
  refs: ['G-07', 'Q-H03'], rules: ['R-SHOW-03', 'R-SHOW-04', 'R-ACT-04'], basis: 'stated',
  given: ['The state of SHW-01.'],
  when: ['The Blue Disabler (Room A) names the Hacker, who is inside Command Room.', 'The Insider (Jail) names Undercover (Room A).', 'The Alien (Hospital) names the Supplier (Jail).', 'Undercover names themself.'],
  then: ['The first three are accepted: room, Jail, injury and Command Room make no difference to a special shot.', 'The fourth is refused: the target is another survivor.'],
  sees: ['Targets are private until the batch resolves.'],
  timing: [NO_CLOCK],
  needs: ['BE-12', 'FE-10'],
});
add('SHW-03', 'The batch: all registered first, a dead shooter\'s shot still fired', {
  refs: ['G-07', 'Q-H03'], rules: ['R-SHOW-05', 'R-SHOW-07', 'R-SHOW-08', 'R-WIN-01'], basis: 'stated',
  given: ['The state of SHW-01. The Round 5 turn order is by player number.'],
  when: ['Undercover (fifth) names the Alien. The Alien (seventh) names Undercover. Nobody else shoots.', 'The window closes.'],
  then: ['In the Round 5 order: Undercover\'s shot eliminates the Alien, who was Injured.', 'The Alien\'s shot, registered before, still resolves: Undercover is Injured and is in Hospital.', 'No Rescue stage follows and no Hospital deadline runs.', m => `Final check: Red Power ${m.mode === 7 ? 1 : 2}, Blue Power ${m.mode === 7 ? 1 : 2}; no Code; neither side eliminated. The match is a Draw.`],
  sees: ['Outcomes are shown after the whole batch. The Alien\'s faction is shown with the final result.'],
  timing: ['Nothing resolves before the window closes.'],
  needs: ['BE-09', 'BE-12', 'FE-10'],
});
add('SHW-04', 'A Protection granted in Round 5 is not a defence in the showdown', {
  refs: ['G-03', 'G-07', 'Q-C01b', 'Q-H03'], rules: ['R-PROT-02', 'R-PROT-07', 'R-SHOW-06'], basis: 'stated',
  given: [TIE, 'Round 5: Undercover grants Protection to the Blue Disabler. Nobody is hurt in Round 5.', m => `At the Round 5 check Power is ${m.mode === 7 ? '2 and 2' : '3 and 3'}: no winner.`],
  when: ['In the showdown the Hacker names the Blue Disabler.'],
  then: ['Not blocked: a grant of Round 5 never becomes active.', 'The Blue Disabler is Injured and is in Hospital.'],
  sees: ['No room event.'],
  timing: [NO_CLOCK],
  needs: ['BE-12'],
});
add('SHW-05', 'A patient of Round 5 whom nobody names lives through the showdown', {
  refs: ['G-07', 'Q-H03a'], rules: ['R-SHOW-08'], basis: 'stated',
  given: ['The state of SHW-01.'],
  when: ['Nobody names the Alien. The window closes.'],
  then: ['The Alien is Injured and alive at the final check.', 'Nothing kills them: no deadline runs after the last normal round.'],
  sees: ['Public.'],
  timing: [NO_CLOCK],
  needs: ['BE-09', 'BE-12'],
});
add('SHW-06', 'Two special shots at one Healthy player', {
  refs: ['G-07', 'Q-H03', 'Q-H04'], rules: ['R-SHOW-05', 'R-STATE-01'], basis: 'stated',
  given: ['The state of SHW-01.'],
  when: ['Undercover and the Hacker both name the Blue Disabler.'],
  then: ['The first shot in the Round 5 order injures; the second eliminates.', 'By the letter of the packet the body is in Hospital, where the first hit had put the player (NV-F-01).'],
  other: ['If a player eliminated in the stage that first hurt them keeps their position (NV-F-01), the body lies in Room A slot 2.'],
  sees: ['Two outcomes.'],
  timing: [NO_CLOCK],
  findings: ['NV-F-01'], needs: ['BE-12'],
});
add('SHW-07', 'A block in the showdown', {
  refs: ['G-04', 'G-07', 'Q-C01b', 'Q-D01'], rules: ['R-SHOW-06', 'R-PROT-03'], basis: 'stated',
  given: [TIE, 'Round 3: Undercover grants Protection to the Blue Disabler (active from Round 4). Nobody attacks the Blue Disabler in Rounds 4 and 5.', m => `At the Round 5 check Power is ${m.mode === 7 ? '2 and 2' : '3 and 3'}: no winner.`],
  when: ['In the showdown the Hacker names the Blue Disabler.'],
  then: ['Blocked. The Protection is used up. The Blue Disabler is Healthy.'],
  sees: ['A room event for the seats of the Blue Disabler\'s actual room, Room A. The Hacker, in Command Room, receives nothing.'],
  timing: [NO_CLOCK],
  needs: ['BE-08', 'BE-12'],
});

// ---------------------------------------------------------------------------------------------
// INT: whole lines that cross several of the mechanics
// ---------------------------------------------------------------------------------------------
add('INT-01', 'A match that ends at the checkpoint of Round 2', {
  refs: ['G-01', 'G-06', 'G-07', 'Q-P02', 'Q-H04'], rules: ['R-WIN-03', 'R-WIN-07', 'R-CAPT-01'], basis: 'derived',
  given: ['Layout MIX.'],
  when: [m => (m.mode === 7
    ? 'Round 1: the Blue Disabler\'s Blackout injures Undercover. The vote jails the Hacker. The election elects the Insider.'
    : m.mode === 8
      ? 'Round 1: the Blue Disabler\'s Blackout injures the Red Disabler; the Red Disabler\'s Blackout injures Undercover. The vote jails the Hacker. The election elects the Insider.'
      : 'Round 1: the Blue Disabler\'s Blackout injures Undercover; the Officer shoots the Hacker in Room B. The vote jails the Red Disabler, who asked for nothing. The election elects the Insider.'),
  'Round 2: Insider, own turn: EJECT. Nobody rescues. Round 2 resolves.'],
  then: [m => `During Round 2 the ${m.officer ? 'Red Disabler' : 'Hacker'} is Eliminated by the EJECT.`, m => `At the end of Round 2 ${m.mode === 7 ? 'Undercover dies' : m.mode === 8 ? 'Undercover and the Red Disabler die' : 'Undercover and the Hacker die'} in Hospital.`, 'At the checkpoint of Round 2 every Red player is Eliminated and a Blue player is Healthy: Blue wins, and the Alien with Blue.'],
  sees: ['Result, roles and Code at the checkpoint of Round 2.'],
  timing: ['No match can end at an earlier checkpoint: Round 1 has no Captain and no Hospital death, its attacks can eliminate one player at most, and nothing but elimination ends a match before Round 5.'],
  needs: ['BE-07', 'BE-09', 'BE-10'],
});
add('INT-02', 'The Alien alone', {
  refs: ['G-06', 'G-07', 'Q-P02', 'Q-H03a'], rules: ['R-WIN-08', 'R-RES-03', 'R-ROLE-07'], basis: 'derived',
  given: [m => (m.officer ? 'Layout PAIRS. The election after Round 1 elects the Alien, who stays in Command Room.' : `Layout ARMS. The election after Round 1 elects the Alien, who stays in Command Room. ${m.two ? 'In Round 2 the Red Disabler moves to Room A. The Cracker, the Blue Disabler, the Supplier, Undercover and the Red Disabler are then in Room A.' : 'The Cracker, the Blue Disabler, the Supplier and Undercover are in Room A.'}`)],
  when: ['The votes of Rounds 1 and 2 jail the Insider and the Hacker.', 'Round 3: the Alien, own turn: EJECT. Supplier arms the Cracker and the Blue Disabler.', m => (m.mode === 7
    ? 'Round 4: the Blue Disabler\'s Blackout hits the Supplier and their shot hits the Cracker; Undercover shoots the Blue Disabler; the Cracker shoots Undercover.'
    : m.mode === 8
      ? 'Round 4: the Blue Disabler\'s Blackout hits the Supplier and their shot hits Undercover; the Red Disabler\'s Blackout hits the Cracker; Undercover shoots the Red Disabler; the Cracker shoots the Blue Disabler.'
      : 'Round 4, Room A: the Blue Disabler\'s Blackout hits the Supplier and their shot hits the Cracker; the Cracker shoots the Blue Disabler. Room B: the Officer shoots Undercover; Undercover shoots the Red Disabler; the Red Disabler\'s Blackout hits the Officer.'),
  'Round 5: nobody rescues. Round 5 resolves.'],
  then: ['Round 3: the Insider and the Hacker are Eliminated. A Blue and a Red player are gone; both sides still have members.', m => `Round 4: ${m.mode === 7 ? 'four' : m.mode === 8 ? 'five' : 'six'} players are Injured, every remaining Blue and Red player among them.`, 'End of Round 5: all of them die in one stage. Both sides had a member before it and neither has one after.', 'The Alien is not Eliminated and wins alone.'],
  sees: ['The result at the Round 5 checkpoint.'],
  timing: [NO_CLOCK],
  needs: ['BE-07', 'BE-09', 'BE-10'],
});
add('INT-03', 'Five rounds, a showdown without a shot, a draw', {
  refs: ['G-07', 'G-01', 'Q-H03', 'Q-B03a'], rules: ['R-SHOW-08', 'R-WIN-04', 'R-FLOW-08'], basis: 'stated',
  given: [TIE, 'Nobody is hurt in Round 5.'],
  when: ['Five rounds are played to their ends, each with its vote, result and window.', 'The showdown opens. Nobody names a target. Its window closes.'],
  then: [m => `Round 5 check: Blue Power ${m.mode === 7 ? 2 : 3} and Red Power ${m.mode === 7 ? 2 : 3}. Blue is not stronger; no Code; no winner.`, 'After the showdown nothing has changed: the match is a Draw.', 'Every player is where they were when Round 5 resolved.'],
  sees: ['The Draw, the roles and the Code when the showdown has resolved.'],
  timing: ['Five windows of fifteen seconds were run, one in each round, though nobody asked for a Blackout.'],
  needs: ['BE-04', 'BE-12'],
});

const CODE = /^(BLK|MOV|SLOT|CLN|CAP|HSP|DEF|VOT|HCK|SHW|INT)-\d{2}$/;
export const AREAS = {
  BLK: 'The vote result, the Blackout window and the Blackout',
  MOV: 'Voluntary movement and its cutoff',
  SLOT: 'Positions',
  CLN: 'The Alien\'s Phantom Clone',
  CAP: 'The Captain\'s RELEASE and EJECT',
  HSP: 'Hospital, Rescue and death',
  DEF: 'What a room sees of a block',
  VOT: 'Votes and their results',
  HCK: 'The declared-side Hack and the Chamber',
  SHW: 'The showdown',
  INT: 'Whole lines',
};

const resolve = (value, facts) => (Array.isArray(value) ? value : [value])
  .map(item => (typeof item === 'function' ? item(facts) : item)).filter(item => item !== null && item !== undefined);

/** The cases of one number of players, with every wording resolved for it. */
export function casesOf(mode) {
  const facts = factsOf(mode);
  return list.filter(item => (item.modes ?? MODES).includes(mode)).map(item => {
    if (!CODE.test(item.code)) throw new Error(`${item.code}: not a case code`);
    const status = item.status ?? 'specified';
    return {
      id: `NV-M${mode}-${item.code}`,
      code: item.code,
      area: item.code.split('-')[0],
      title: item.title,
      mode,
      specification: [...item.refs],
      rules: [...item.rules],
      version: 'next',
      basis: item.basis,
      layer: item.layer ?? 'engine',
      status,
      execution: 'not-run',
      pair: item.pair ?? null,
      preconditions: resolve(item.given, facts),
      sequence: resolve(item.when, facts),
      expected: { state: resolve(item.then, facts), visibility: resolve(item.sees, facts), timing: resolve(item.timing, facts) },
      // What the outcome would be under the other reading, or if a point were decided otherwise.
      // Never part of the expectation: a test asserts `expected` and nothing of this.
      otherOutcome: resolve(item.other ?? [], facts),
      // Context for a reader: a comparison, a cross-reference. Never asserted.
      notes: resolve(item.note ?? [], facts),
      findings: [...(item.findings ?? [])],
      needs: [...(item.needs ?? [])],
      controls: [...(item.controls ?? [])],
    };
  });
}

export function buildNextVersionCatalog() {
  return Object.fromEntries(MODES.map(mode => [mode, casesOf(mode)]));
}

// What the cases point to: the findings of the audit, the assumptions the matrix makes, and what
// Backend, Frontend and Integration have to provide before a case can be run. The audit document
// prints its summary tables from this file, and a test holds the document to them, so that a
// case never names something the audit does not explain.
import { MODES, casesOf } from './catalog.mjs';

// `kind`: contradiction (two passages cannot both hold); gap (neither the packet nor a rule it
// keeps says, and an implementation has to); consequence (the rules do answer, and the answer is
// one the owner may not have meant); information (nothing to decide).
export const FINDINGS = Object.freeze([
  { id: 'NV-F-01', kind: 'contradiction', title: 'Where a player lies who is eliminated by a second hit in the stage that first hurt them: in Hospital by the letter, in their last room for a Captain by a kept decision' },
  { id: 'NV-F-02', kind: 'contradiction', title: 'Who is in the room, for a block, when several attacks resolve in one stage' },
  { id: 'NV-F-03', kind: 'contradiction', title: 'Which Hospital position each of several players hurt in one stage takes' },
  { id: 'NV-F-04', kind: 'consequence', title: 'An EJECT earlier in the round and the deaths at its end are not "at the same time": a Draw where the Alien might be thought to win alone' },
  { id: 'NV-F-05', kind: 'gap', title: 'Whether a player may move while a Captain election is held' },
  { id: 'NV-F-06', kind: 'gap', title: 'Which positions the players hold at the start' },
  { id: 'NV-F-07', kind: 'consequence', title: 'The Code is refused during the vote result and accepted during the window that follows it' },
  { id: 'NV-F-08', kind: 'gap', title: 'What the table is shown of a player hurt and rescued in the same round' },
  { id: 'NV-F-09', kind: 'information', title: 'Rules of the packet that no legal play reaches' },
  { id: 'NV-F-10', kind: 'gap', title: 'Whether a Blackout request or a Clone activation is accepted from inside Command Room' },
  { id: 'NV-F-11', kind: 'gap', title: 'From which instant the pair of a Hack is public' },
  { id: 'NV-F-12', kind: 'gap', title: 'Whether a detained patient may take part in a Hack with a free patient' },
]);

export const ASSUMPTIONS = Object.freeze([
  { id: 'NV-A-01', text: 'The players of a starting room hold its lowest positions in order of player number. The packet does not say (NV-F-06).' },
  { id: 'NV-A-02', text: 'A voluntary move during the mover\'s own turn stays legal. G-09 names "another player\'s turn or after their own turn"; Q-M01 says "including", and the contracts say the cutoff is "independent of the mover\'s own turn".' },
  { id: 'NV-A-03', text: 'A rule of the earlier versions applies wherever the packet does not replace it, as the packet\'s overview says: the rulebook, the capacity decisions except the Hospital of five, Pass, the five-second vote result and the declared-side Hack except who reads the pair.' },
  { id: 'NV-A-04', text: 'The Jail vote, the elections and their thresholds are unchanged, and each keeps its window of sixty seconds.' },
  { id: 'NV-A-05', text: 'The round of an injury is the round whose resolution caused it. A patient hurt when Round 2 resolves is "admitted in Round 2" and due at the end of Round 3.' },
  { id: 'NV-A-06', text: 'The packet\'s "any other surviving participant" settles that nobody names themself in the showdown, which the rulebook had left open (R-SHOW-11).' },
]);

// What has to exist before a case can be bound to an executable fixture or checked on a screen.
export const NEEDS = Object.freeze([
  { id: 'BE-01', owner: 'Backend', text: 'A new, immutable tuple of protocol, ruleset and engine version that every consumer adopts together, exported among the tuples the engine names, so that a run can ask for it by its ruleset. The five existing tuples keep playing exactly as they do.' },
  { id: 'BE-02', owner: 'Backend', text: 'Positions in the authoritative state and in every view: a room and a position number for each player on the board; five, five, five, one and the roster count; the lowest free position for an entrant; players who enter in one step seated by player number; the starting positions; "off the board" for a player removed by EJECT.' },
  { id: 'BE-03', owner: 'Backend', text: 'The movement window as server state: open from the round\'s first ordinary turn until its final ordinary turn ends, at that turn\'s deadline on the server\'s clock or at an accepted Pass, whenever the closure commits; destinations offered only while it is open; forced transfers independent of it.' },
  { id: 'BE-04', owner: 'Backend', text: 'Phases and clocks: five seconds of result after every completed vote; the window after the Jail vote\'s result in every normal round, fifteen seconds, with the start of darkness as a server time and not as a second deadline task; every phase its full length from the commit that opens it; no phase waits for a client.' },
  { id: 'BE-05', owner: 'Backend', text: 'Commands and receipts: a Blackout request that names nobody; a selection that names a position and the snapshot; Clone activation; RELEASE; EJECT. Each is refused without effect when it is not allowed, with a reason a client can turn into "not now" or "used". The first valid selection is final.' },
  { id: 'BE-06', owner: 'Backend', text: 'Private views: for a Disabler the state of the request (none, pending, cancelled with the use kept, admitted, selected, spent), and a stated answer to what the Disabler is told of the outcome beyond what the room and the table see; for the Alien the Clone (unused, active until the end of round n, ended); for an attacker "registered" and "completed" and never "blocked".' },
  { id: 'BE-07', owner: 'Backend', text: 'Public view: the window and its stage; the Hack pair and stage; the two Captain allowances as used or unused; for each patient the round at whose end the episode is due; an Eliminated player whose faction is not yet shown, which today\'s schema forbids; reveals and victory at the end-of-round checkpoint only. The Clone appears nowhere but in the Alien\'s view.' },
  { id: 'BE-08', owner: 'Backend', text: 'Room events: one sanitized event for each block, for the seats in the target\'s room, delivered after the whole resolution, with an identity, an order and a time that carry no attacker, cause, grantor or resolution index. Nothing for other seats, the host or the display: no event, and no change of their view or of its revision. No history for a later entrant or on reconnection. The audience rule of NV-F-02 decided.' },
  { id: 'BE-09', owner: 'Backend', text: 'Hospital: the injury episode in state, with its admission round and due round; death after the Rescue stage of the due round; the exceptions of Round 5 and the showdown; detention kept in Hospital; a healed detained patient to Jail; no Injured player published outside Hospital. Where a player eliminated by a second hit lies (NV-F-01).' },
  { id: 'BE-10', owner: 'Backend', text: 'Captain commands: validation (Captain, own ordinary turn, in Command Room, allowance unused, a living prisoner physically in Jail); effect atomic and at once; allowances for the whole match; the later turns of the ejected skipped and the vote of the same round counted without them.' },
  { id: 'BE-11', owner: 'Backend', text: 'Service behaviour: a repeated command returns the first receipt; two competing commands cannot spend one resource twice; a deadline task that comes late opens the next phase with its full time; reconnection gives the current state and the remaining time; an accepted selection survives a lost acknowledgement.' },
  { id: 'BE-12', owner: 'Backend', text: 'The showdown without the Final Zone: nobody is moved; a special shot may name any other survivor; no Clone is active; Protection as today; a Healthy player who is hit goes to Hospital.' },
  { id: 'BE-13', owner: 'Backend', text: 'For the test binding: the pure engine keeps taking recorded turn orders, starting rooms and trusted times, and lets a test adapter read the server\'s truth for positions, the frozen snapshot, episodes, allowances, the Clone and the events each audience was given.' },
  { id: 'FE-01', owner: 'Frontend', text: 'Adopt the new tuple together with Backend. A phase or command of a tuple the client does not know is refused, not guessed.' },
  { id: 'FE-02', owner: 'Frontend', text: 'Draw every player at the server\'s position. Nothing is reordered, compacted or re-seated on the client, and the same logical positions hold at every width.' },
  { id: 'FE-03', owner: 'Frontend', text: 'Offer movement only from the server\'s destinations; show that movement is closed after the final ordinary turn; animate a forced transfer whenever it comes.' },
  { id: 'FE-04', owner: 'Frontend', text: 'The window from server times: lit and dark stages; the remaining time on reconnection, without the preview again; numbered positions with no name, portrait, label, accessible name or highlight that identifies an occupant, the own position included; the first accepted selection final; no invented hit, miss or replacement.' },
  { id: 'FE-05', owner: 'Frontend', text: 'Room events from the seat\'s own feed only; one treatment whatever the cause; nothing on the shared display or a host screen; silent by default; nothing replayed on entering later or reconnecting. No asset fetched, no element rendered and no timing changed that tells the two causes apart or tells an outsider that anything happened. The same for the Clone: no public trace of activation, activity or end.' },
  { id: 'FE-06', owner: 'Frontend', text: 'The two command buttons in four states from the server (available, temporarily unavailable, accepted, used), the same on every screen and for every Captain. No success scene for a refused or unanswered command.' },
  { id: 'FE-07', owner: 'Frontend', text: 'Hospital from server state: the rescue opportunity in rounds; a detention marker on a patient. No client countdown that can show a death the server has not decided, or end the life of a patient of Round 5.' },
  { id: 'FE-08', owner: 'Frontend', text: 'The vote result for its five seconds without taking time from the next phase. The Hack\'s pair and stage for everyone, the claim for the two only, the entrance inside the five seconds, sixty seconds of conversation on the server\'s clock, and no microphone or recording sign.' },
  { id: 'FE-09', owner: 'Frontend', text: 'A player shown as Eliminated before their faction is shown, after an EJECT, and the reveal at the end of the round.' },
  { id: 'FE-10', owner: 'Frontend', text: 'The showdown over the unchanged board: targets in any room, in Hospital, in Jail and in Command Room.' },
  { id: 'FE-11', owner: 'Frontend', text: 'Tests that hold these for each audience (a seat in the room, a seat outside it, the shared display): that a block leaves no trace outside its room in the document, the accessibility tree, the network and the timing; that in darkness no position identifies its occupant; reduced motion; reconnection.' },
]);

export const findingIds = () => FINDINGS.map(item => item.id);
export const needIds = () => NEEDS.map(item => item.id);

/** The cases that name an item, as codes, with the numbers of players where a case does not exist in all three. */
export function casesNaming(field, id) {
  const modesByCode = new Map();
  for (const mode of MODES) for (const item of casesOf(mode)) if (item[field].includes(id)) modesByCode.set(item.code, [...(modesByCode.get(item.code) ?? []), mode]);
  return [...modesByCode.entries()].map(([code, modes]) => (modes.length === MODES.length ? code : `${code} (${modes.join(', ')})`));
}

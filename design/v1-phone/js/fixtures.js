// mothership:dev-only
//
// SYNTHETIC FIXTURES for the phone-first V1 journey prototype (issue #76).
//
// Everything here is authored for looking at layout, flow and wording. It is the outcome of
// no rule and no match: no engine, transport, Firebase project or contract fixture is
// involved. Names, device tags, codes and identifiers are made up and obviously so. A role
// appears only in a fixture whose surface is private to its own seat (the reveal, the
// private sheet), and in the end reveal, which the rules make public at the end of a match.
//
// Words quoted from the current copy-refresh source are in RELEASE_COPY with the file they come from;
// design/tools/v1-phone-check.mjs finds each one, verbatim, in that file at the copy-refresh source.
// Words this design adds are marked PROPOSED where they are drawn.

export const SYNTHETIC_LABEL = 'Synthetic fixture · design prototype, not a match';

/** The nine public characters (design/contract/crew-catalog.json, crew-0.1.0). */
export const CREW = [
  { id: 'c1', sign: 'Vega' }, { id: 'c2', sign: 'Rigel' }, { id: 'c3', sign: 'Lyra' },
  { id: 'c4', sign: 'Atlas' }, { id: 'c5', sign: 'Orion' }, { id: 'c6', sign: 'Nova' },
  { id: 'c7', sign: 'Juno' }, { id: 'c8', sign: 'Mira' }, { id: 'c9', sign: 'Echo' },
];
export const callSign = id => CREW.find(entry => entry.id === id)?.sign ?? id;

/** How the release draws a role (packages/presentation/src/markup/comic-shell.ts ROLES). Private. */
export const ROLE_LOOK = {
  Officer: { device: 'officer', team: 'Blue' }, Insider: { device: 'insider', team: 'Blue' },
  Cracker: { device: 'cracker', team: 'Blue' }, 'Blue Disabler': { device: 'blue-disabler', team: 'Blue' },
  Supplier: { device: 'supplier', team: 'Blue' }, Undercover: { device: 'undercover', team: 'Red' },
  Hacker: { device: 'hacker', team: 'Red' }, 'Red Disabler': { device: 'red-disabler', team: 'Red' },
  Alien: { device: 'alien', team: 'Alien' },
};

/** The release's role reminders, verbatim (apps/game/hosted/role-guide.js at the copy-refresh source). */
export const ROLE_GUIDE = {
  Insider: 'When play starts, your private panel shows three players: the Undercover, Alien and Cracker, without telling you which is which. Use that information to help Blue.',
  Cracker: 'You have two Rescues for the match. A Rescue heals an injured target at the end of the round. You can rescue yourself while injured, or rescue a player in Hospital from Room A or B; otherwise the target must share your location. Eliminated players cannot be revived.',
  'Blue Disabler': 'You have one Disabler attack for the match, against another player in your location. It injures a healthy target or eliminates an injured target, unless a defense blocks it. Help Blue.',
  Supplier: 'In Round 3, choose two distinct eligible players in your location. Each successful recipient gains a weapon usable in Round 4 or 5. The grants stay private; the Officer still has only one ordinary shot per match.',
  Officer: 'You have one ordinary shot for the entire match, available from Round 1 during your own turn. The target must share your location and be eligible. Receiving another weapon does not grant another shot. Help Blue.',
  Undercover: 'Grant secret Protection to an eligible player in your location. It activates at the next normal round and blocks the first applicable attack. You can grant to each player only once per match. You may lie during a standard Hack. Help Red.',
  Hacker: 'When play starts, you learn who the Undercover is. Scan once per round: correctly guess an eligible target’s faction to learn whether their number is in the Code; a wrong guess consumes the Scan. Submit your one Code attempt in Round 5 to help Red.',
  'Red Disabler': 'You have one Disabler attack for the match, against another player in your location. It injures a healthy target or eliminates an injured target, unless a defense blocks it. You do not start with an ordinary weapon. Help Red.',
  Alien: 'When play starts, your private panel shows the full Code. You may lie during a standard Hack. If you survive, you share a Blue victory, or win alone if both factions are eliminated at the same resolution checkpoint. A Red victory does not include you.',
};

/** Earlier-release keys retained as retirement evidence, never active copy. */
export const RETIRED_RELEASE_KEYS = ["nameTaken", "choosePrompt", "characterConfirmed", "selectionOverPlayer", "botsAutomatic", "revealWhere", "confirmCharacter"];

/** Current source quotes. Key → [source file, exact text]. */
export const RELEASE_COPY = {
  chooseCharacter: ['apps/game/hosted/setup-controls.js', 'Choose your character'],
  selectionUnavailable: ['apps/game/hosted/setup-controls.js', 'Selection unavailable. Try again.'],
  tapToReveal: ['apps/game/hosted/role-confirmation.js', 'Tap to reveal'],
  waitingSeat: ['apps/game/hosted/main.js', 'Waiting for the host to seat you.'],
  endedInLobby: ['apps/game/hosted/main.js', 'The host ended this match before it started. There is nothing of it to show.'],
  hostNoRoles: ['apps/game/hosted/main.js', 'Hosting gives no view of anyone’s role. To play, join from another tab with the room code.'],
  endNote: ['apps/game/hosted/main.js', 'This ends the match for every player and for the display. It is recorded as ended by the host, without a winner, and cannot be undone.'],
  endAsk: ['apps/game/hosted/main.js', 'End the match for everyone…'],
  endKeep: ['apps/game/hosted/main.js', 'No, keep the match'],
  endYes: ['apps/game/hosted/main.js', 'Yes, end the match now'],
  noRequests: ['apps/game/hosted/main.js', 'Waiting for players'],
  codeForm: ['apps/game/hosted/main.js', 'A room code is twelve characters, 0 to 9 and A to F.'],
  signinFailed: ['apps/game/hosted/main.js', 'Could not verify this session. Check your connection and reload to try again.'],
  giveUp: ['apps/game/hosted/main.js', 'Give this request up'],
  sendSame: ['apps/game/hosted/main.js', 'Send the same request again'],
  givenUp: ['apps/game/hosted/main.js', 'Given up. If the server received that request, it may still carry it out.'],
  codeOtherDevice: ['apps/game/hosted/main.js', 'The device that holds the seat now loses it when the code is used.'],
  codeMemory: ['apps/game/hosted/main.js', 'A code is kept nowhere but on this page: reloading the page loses it.'],
  oneTabPerPlayer: ['apps/game/hosted/main.js', 'Each tab is its own device with its own identity. Open one tab per player.'],
  recoverWaiting: ['apps/game/hosted/main.js', 'This device asked to take over a seat in this match and has no answer yet. Asking the server whether it has the seat…'],
  recoverStartOver: ['apps/game/hosted/main.js', 'Start over with another code'],
  takenOver: ['apps/game/hosted/main.js', 'This device has taken over a seat. Opening the match…'],
  issueCode: ['apps/game/hosted/main.js', 'Issue a one-time recovery code'],
  admitDisplay: ['apps/game/hosted/main.js', 'Admit the display'],
  takeOffPage: ['apps/game/hosted/main.js', 'Take it off this page'],
  unconfirmedAssigned: ['apps/game/hosted/setup-controls.js', 'Unconfirmed characters are assigned when the 30-second timer ends.'],
  readingWaits: ['apps/game/hosted/setup-controls.js', 'The first turn waits for 30 seconds of reading and everyone’s Ready.'],
  selectionOverHost: ['apps/game/hosted/setup-controls.js', 'Selection time has ended. Waiting for the server…'],
  readingOver: ['apps/game/hosted/setup-controls.js', 'Reading time has ended. Waiting for everyone to be Ready.'],
  waitingSetup: ['apps/game/hosted/setup-controls.js', 'Waiting for the host to start setup.'],
  choiceUncertain: ['apps/game/hosted/setup-controls.js', 'Connection interrupted. Retry your selection.'],
  characterTaken: ['apps/game/hosted/setup-controls.js', 'Taken. Choose another character.'],
  readyWaiting: ['apps/game/hosted/setup-controls.js', 'Ready. Waiting for the timer and other players.'],
  syncCountdown: ['apps/game/hosted/setup-controls.js', 'Synchronizing countdown…'],
  sameChoiceAgain: ['apps/game/hosted/setup-controls.js', 'Retry selection'],
  revealMine: ['apps/game/hosted/role-confirmation.js', 'Reveal my role'],
  hideMine: ['apps/game/hosted/role-confirmation.js', 'Hide my role'],
  readyAgain: ['apps/game/hosted/role-confirmation.js', 'Retry Ready'],
  freshRole: ['apps/game/hosted/role-confirmation.js', 'Waiting for a fresh, authorized role.'],
  readyOthers: ['apps/game/hosted/role-confirmation.js', 'You are ready. Waiting for everyone else.'],
  readyUncertain: ['apps/game/hosted/role-confirmation.js', 'Your Ready answer is uncertain. Send the same request again.'],
  pressReady: ['apps/game/hosted/role-confirmation.js', 'Press Ready when you understand your role.'],
  revealThenReady: ['apps/game/hosted/role-confirmation.js', 'Reveal your role, then press Ready.'],
  soloTip: ['apps/game/hosted/practice-controls.js', 'For a solo test, leave one seat for yourself and join from a Player tab. Bots make simple legal choices; they do not chat or bluff.'],
  privateHint: ['packages/presentation/src/copy/en.ts', 'Only open this where other players cannot see your screen.'],
  pausedStale: ['packages/presentation/src/copy/en.ts', 'Actions are paused until the connection is restored.'],
  pausedUnsynced: ['packages/presentation/src/copy/en.ts', 'Actions are paused until this device has the server’s time.'],
  matchOver: ['packages/presentation/src/copy/en.ts', 'The match is over.'],
  chooseNote: ['packages/presentation/src/copy/en.ts', 'These are the choices the server offers you now.'],
  registeredConsequence: ['packages/presentation/src/copy/en.ts', 'You cannot change or withdraw it here once it is registered.'],
  acceptedConsequence: ['packages/presentation/src/copy/en.ts', 'You cannot change or withdraw it here once the server accepts it.'],
  registerShot: ['packages/presentation/src/copy/en.ts', 'Register shot'],
  shotNotResult: ['packages/presentation/src/copy/en.ts', 'This is not a result. Registered shots are resolved at the end of the round.'],
  notResult: ['packages/presentation/src/copy/en.ts', 'This is not a result.'],
  phaseClosed: ['packages/presentation/src/copy/en.ts', 'Not accepted. It reached the server after that phase had ended.'],
  tryAgainHint: ['packages/presentation/src/copy/en.ts', 'You can choose again if the server still offers it.'],
  choiceDropped: ['packages/presentation/src/copy/en.ts', 'Your choice was not sent.'],
  unknown: ['packages/presentation/src/copy/en.ts', 'Result unknown. The app could not confirm what the server did with your action.'],
  unknownDetail: ['packages/presentation/src/copy/en.ts', 'Do not assume either way. You can check again at any time.'],
  checking: ['packages/presentation/src/copy/en.ts', 'Checking what the server did with your action…'],
  checkingReload: ['packages/presentation/src/copy/en.ts', 'This page was reloaded before the server answered. Checking what became of your action…'],
  oneBallot: ['packages/presentation/src/copy/en.ts', 'This is your one ballot in this vote. You cannot change it once the server accepts it.'],
  ballotNotResult: ['packages/presentation/src/copy/en.ts', 'This is not a result. The count is shown to everyone when the vote closes.'],
  jailPrompt: ['packages/presentation/src/copy/en.ts', 'Who do you vote to send to Jail?'],
  captainPrompt: ['packages/presentation/src/copy/en.ts', 'Who do you vote for as Captain?'],
  abstain: ['packages/presentation/src/copy/en.ts', 'Abstain'],
  noRelease: ['packages/presentation/src/copy/en.ts', 'No release request'],
  releaseYes: ['packages/presentation/src/copy/en.ts', 'Yes, release'],
  releaseNo: ['packages/presentation/src/copy/en.ts', 'No, do not release'],
  releaseUses: ['packages/presentation/src/copy/en.ts', 'The Captain has one release request in a match. This uses it, whatever the vote decides. You cannot change it once the server accepts it.'],
  castBallot: ['packages/presentation/src/copy/en.ts', 'Cast your ballot'],
  stale: ['packages/presentation/src/copy/en.ts', 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…'],
  connecting: ['packages/presentation/src/copy/en.ts', 'Connecting to the match…'],
  updateRequired: ['packages/presentation/src/copy/en.ts', 'Update required'],
  incompatible1: ['packages/presentation/src/copy/en.ts', 'This match uses a game version that this app cannot display.'],
  incompatible2: ['packages/presentation/src/copy/en.ts', 'Reload to get the current version. The match itself is not affected.'],
  noAccess: ['packages/presentation/src/copy/en.ts', 'No access to this match'],
  noAccess1: ['packages/presentation/src/copy/en.ts', 'The server did not let this device read the match, so nothing of it is shown.'],
  noAccess2: ['packages/presentation/src/copy/en.ts', 'This happens when a device is not in the match, or when its seat has been moved to another device. If you did not expect it, ask the host.'],
  unconfirmed: ['packages/presentation/src/copy/en.ts', 'This device cannot read the match right now'],
  unconfirmed1: ['packages/presentation/src/copy/en.ts', 'The server is not letting this device read the match, so nothing of it is shown.'],
  tryAgain: ['packages/presentation/src/copy/en.ts', 'Try again'],
  blue: ['packages/presentation/src/copy/en.ts', 'Blue wins.'],
  draw: ['packages/presentation/src/copy/en.ts', 'Nobody wins. The match is a draw.'],
  alienWithBlue: ['packages/presentation/src/copy/en.ts', 'The Alien wins with Blue.'],
  aborted: ['packages/presentation/src/copy/en.ts', 'The host ended this match. There is no winner.'],
  abortedPhase: ['packages/presentation/src/copy/en.ts', 'Match ended by the host'],
  lastVote: ['packages/presentation/src/copy/en.ts', 'Last vote counted'],
  nobodyElected: ['packages/presentation/src/copy/en.ts', 'Nobody was elected.'],
  scanWrong: ['packages/presentation/src/copy/en.ts', 'The guess was wrong.'],
  scanRightInCode: ['packages/presentation/src/copy/en.ts', 'The guess was right, and that player is in the Code.'],
  readableList: ['packages/presentation/src/markup/comic-shell.ts', 'Players and locations — readable list'],
  supplyResults: ['packages/presentation/src/markup/comic-shell.ts', 'Supply results'],
  queuedOne: ['packages/presentation/src/copy/en.ts', 'One action of yours is registered and waiting to be resolved.'],
  sendingShot: ['packages/presentation/src/copy/en.ts', 'Sending your shot to the server…'],
  checkAgain: ['packages/presentation/src/copy/en.ts', 'Check again'],
  done: ['packages/presentation/src/copy/en.ts', 'Done'],
  chooseSomeoneElse: ['packages/presentation/src/copy/en.ts', 'Choose someone else'],
  cancel: ['packages/presentation/src/copy/en.ts', 'Cancel'],
  chooseMove: ['packages/presentation/src/copy/en.ts', 'Choose where to move'],
  chooseTarget: ['packages/presentation/src/copy/en.ts', 'Choose a target'],
  available: ['packages/presentation/src/copy/en.ts', 'Available'],
  notAvailable: ['packages/presentation/src/copy/en.ts', 'Not available'],
  wherePrompt: ['packages/presentation/src/copy/en.ts', 'Where do you move?'],
  releasePrompt: ['packages/presentation/src/copy/en.ts', 'Ask for a release vote for which jailed player?'],
};
export const say = key => RELEASE_COPY[key][1];

/* ---------- the synthetic roster ---------- */

// The character is deliberately not the seat's number: a player picks any of the nine before
// roles are dealt. The roles below are used ONLY by private fixtures of their own seat and by
// the end reveal; no public fixture reads them.
const BASE = [
  { n: 1, name: 'Ada', character: 'c4', role: 'Insider', device: 'Qm7tRk' },
  { n: 2, name: 'Ben', character: 'c7', role: 'Undercover', device: 'zP4wLe' },
  { n: 3, name: 'Cleo', character: 'c1', role: 'Officer', device: 'H8dNs2' },
  { n: 4, name: 'Dev', character: 'c9', role: 'Hacker', device: 'Xa3vYc' },
  { n: 5, name: 'Eli', character: 'c2', role: 'Supplier', device: 'mK9pQd' },
  { n: 6, name: 'Fay', character: 'c6', role: 'Cracker', device: 'T2fGh7' },
  { n: 7, name: 'Gus', character: 'c3', role: 'Alien', device: 'bR5nWs' },
  { n: 8, name: 'Hana', character: 'c8', role: 'Red Disabler', device: 'Lc6jUe' },
  { n: 9, name: 'Ivo', character: 'c5', role: 'Blue Disabler', device: 'pV1zKo' },
];
/** The widest twelve-character names a player may type, and long realistic ones. For measuring. */
export const LONG_NAMES = ['WWWWWWWWWWWW', 'Maximiliana', 'Bartholomew!', 'Konstantinos', 'Wilhelmina R', 'Oluwaseun A.', 'Anastasiaaaa', 'Christophers', 'Guinevere II'];
export const VIEWER = 3;
const SYNTHETIC_CODE = '4F2A9C71E03B';
const SYNTHETIC_MATCH = 'demo-match-0b7e';
const SYNTHETIC_DISPLAY = 'DISPLAYdemo7kQ2xWm9pL4sT8vRb';
const SYNTHETIC_RECOVERY = 'DEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEM';
export const SYNTHETIC_IDS = { code: SYNTHETIC_CODE, match: SYNTHETIC_MATCH, display: SYNTHETIC_DISPLAY, recovery: SYNTHETIC_RECOVERY };

/** Seats of a match. `where` maps a seat number to a location; `extra` adds public facts. */
function seats(count, where, extra = {}) {
  return BASE.slice(0, count).map(seat => ({
    n: seat.n, name: seat.name, character: seat.character, device: seat.device,
    location: where[seat.n] ?? 'Room A', health: 'Healthy', jailed: false, captain: false, revealed: null,
    ...(extra[seat.n] ?? {}),
  }));
}
export const roleOf = n => BASE[n - 1].role;

const R2 = { 1: 'Room A', 2: 'Room A', 3: 'Room B', 4: 'Room A', 5: 'Command Room', 6: 'Room B', 7: 'Room B', 8: 'Hospital', 9: 'Jail' };
const R2X = { 5: { captain: true }, 8: { health: 'Injured' }, 9: { jailed: true } };
const roundTwo = (more = {}) => seats(9, R2, { ...R2X, ...more });

const timer = (seconds, total = 60, label = 'Time remaining') => ({ seconds, total, label });
const turnOf = n => ({ kind: 'ORDINARY_TURN', active: n });

/* ---------- fixtures, one per state id in contract/journey.json ---------- */

const lobbySeats = (count, filled, bots = []) => Array.from({ length: count }, (_, i) => {
  const n = i + 1;
  if (bots.includes(n)) return { n, kind: 'bot', room: n % 2 ? 'Room A' : 'Room B' };
  if (filled.includes(n)) return { n, kind: 'human', room: n % 3 ? 'Room A' : 'Room B', device: BASE[i].device };
  return { n, kind: 'open' };
});
// The server names a seat it fills at expiry "Player N" and a bot "Bot N" (services/game-api/src/full-game.ts).
const setupSeats = (count, done, stage, bots = []) => BASE.slice(0, count).map(seat => ({
  n: seat.n, kind: bots.includes(seat.n) ? 'bot' : 'human',
  name: stage === 'choosing' && !done.includes(seat.n) ? null : bots.includes(seat.n) ? `Bot ${seat.n}` : seat.name,
  character: stage === 'choosing' && !done.includes(seat.n) ? null : seat.character,
  state: stage === 'choosing' ? (done.includes(seat.n) ? 'confirmed' : 'choosing') : (done.includes(seat.n) ? 'ready' : 'reading'),
}));

const requests = [
  { device: 'H8dNs2', room: 'Room B', seat: 3 },
  { device: 'Xa3vYc', room: 'Room A', seat: 4, fresh: true },
];

const crewTaken = { c4: 1, c7: 2, c9: 4, c2: 5 };

export const FIXTURES = {
  // ---------- entry ----------
  'entry.choose': { view: 'entry', surface: 'any', data: { variant: 'choose' } },
  'entry.signing-in': { view: 'entry', surface: 'any', data: { variant: 'signing' } },
  'entry.signin-failed': { view: 'entry', surface: 'any', data: { variant: 'failed' } },

  // ---------- host ----------
  'host.create': { view: 'host-create', surface: 'host', data: { selected: 9 } },
  'host.lobby-empty': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, []), requests: [], bots: 0 } },
  'host.share': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2]), requests: [], bots: 0, hostSheet: 'share' } },
  'host.requests': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2]), requests, bots: 0 } },
  'host.request-unsettled': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2]), requests: [{ ...requests[0], state: 'unsettled' }, requests[1]], bots: 0, notice: { kind: 'uncertain', text: 'Seating the player: no answer. Press again to send the same request again.' } } },
  'host.no-free-seat': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2, 3, 4, 5, 6], [7, 8, 9]), requests: [{ device: 'Wq2sEr', room: 'Room A', state: 'no-seat' }], bots: 3 } },
  'host.bots': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2, 3, 4, 5, 6], [7, 8, 9]), requests: [], bots: 3, botsOpen: true, botDraft: 3 } },
  'host.full': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2, 3, 4, 5, 6, 7, 8, 9]), requests: [], bots: 0, full: true } },
  'host.choosing': { view: 'host-setup', surface: 'host', data: { stage: 'choosing', timer: timer(21, 30, 'Character selection'), seats: setupSeats(9, [1, 2, 4, 5, 9], 'choosing') } },
  'host.choosing-expired': { view: 'host-setup', surface: 'host', data: { stage: 'choosing', timer: { ...timer(0, 30, 'Character selection'), expired: true }, seats: setupSeats(9, [1, 2, 3, 4, 5, 6, 9], 'choosing') } },
  'host.reading': { view: 'host-setup', surface: 'host', data: { stage: 'reading', timer: timer(18, 30, 'Minimum reading time'), seats: setupSeats(9, [1, 5, 9, 4], 'reading') } },
  'host.waiting-ready': { view: 'host-setup', surface: 'host', data: { stage: 'reading', timer: { ...timer(0, 30, 'Minimum reading time'), expired: true }, seats: setupSeats(9, [1, 2, 4, 5, 6, 7, 9], 'reading') } },
  'host.running': { view: 'host-running', surface: 'host', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo() } },
  'host.recovery': { view: 'host-running', surface: 'host', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo(), hostSheet: 'recovery', recovery: { seat: 4, issued: true } } },
  'host.recovery-unsettled': { view: 'host-running', surface: 'host', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo(), hostSheet: 'recovery', recovery: { seat: 4, issued: false, unsettled: true } } },
  'host.display': { view: 'host-lobby', surface: 'host', data: { count: 9, seats: lobbySeats(9, [1, 2, 3, 4, 5, 6, 7, 8, 9]), requests: [], bots: 0, full: true, displayOpen: true } },
  'host.end-confirm': { view: 'host-running', surface: 'host', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo(), hostSheet: 'end' } },
  'host.ended': { view: 'host-ended', surface: 'host', data: {} },

  // ---------- join ----------
  'join.code': { view: 'join-form', surface: 'player', data: { code: '', room: 'Room B' } },
  'join.code-invalid': { view: 'join-form', surface: 'player', data: { code: '4F2A9C71E03', room: 'Room B', invalid: true } },
  'join.sending': { view: 'join-form', surface: 'player', data: { code: SYNTHETIC_CODE, room: 'Room B', busy: true } },
  'join.no-answer': { view: 'join-form', surface: 'player', data: { code: SYNTHETIC_CODE, room: 'Room B', unsettled: true } },
  'join.refused': { view: 'join-form', surface: 'player', data: { code: SYNTHETIC_CODE, room: 'Room B', refused: true } },
  'join.busy': { view: 'join-form', surface: 'player', data: { code: SYNTHETIC_CODE, room: 'Room B', busyServer: 4 } },
  'join.waiting-host': { view: 'join-wait', surface: 'player', data: { state: 'waiting', device: 'H8dNs2', room: 'Room B' } },
  'join.seated': { view: 'join-wait', surface: 'player', data: { state: 'seated', device: 'H8dNs2', room: 'Room B', seat: 3, seats: lobbySeats(9, [1, 2, 3, 5, 6]) } },
  'join.ended-in-lobby': { view: 'join-wait', surface: 'player', data: { state: 'ended' } },
  'join.recover': { view: 'join-recover', surface: 'player', data: {} },
  'join.recover-checking': { view: 'join-wait', surface: 'player', data: { state: 'recover-checking' } },
  'join.recover-refused': { view: 'join-wait', surface: 'player', data: { state: 'recover-refused' } },

  // ---------- character selection ----------
  'select.open': { view: 'select', surface: 'player', data: { phase: 'open', timer: timer(28, 30, 'To choose'), taken: {}, selected: null, name: '' } },
  'select.picked': { view: 'select', surface: 'player', data: { phase: 'submitting', timer: timer(19, 30, 'To choose'), taken: crewTaken, selected: 'c1', name: 'Cleo' } },
  'select.taken': { view: 'select', surface: 'player', data: { phase: 'open', timer: timer(22, 30, 'To choose'), taken: { ...crewTaken, c6: 6, c3: 7 }, selected: null, name: '' } },
  'select.submitting': { view: 'select', surface: 'player', data: { phase: 'submitting', timer: timer(17, 30, 'To choose'), taken: crewTaken, selected: 'c1', name: 'Cleo' } },
  'select.confirmed': { view: 'select', surface: 'player', data: { phase: 'confirmed', timer: timer(12, 30, 'Deal in'), taken: crewTaken, selected: 'c1', name: 'Cleo', progress: setupSeats(9, [1, 2, 3, 4, 5, 9], 'choosing') } },
  'select.conflict': { view: 'select', surface: 'player', data: { phase: 'conflict', timer: timer(15, 30, 'To choose'), taken: { ...crewTaken, c1: 6 }, justTaken: 'c1', selected: null, name: 'Cleo' } },
  'select.unavailable': { view: 'select', surface: 'player', data: { phase: 'unavailable', timer: timer(14, 30, 'To choose'), taken: crewTaken, selected: 'c1', name: 'Ben' } },
  'select.retry': { view: 'select', surface: 'player', data: { phase: 'retry', timer: timer(9, 30, 'To choose'), taken: crewTaken, selected: 'c1', name: 'Cleo' } },
  'select.expired': { view: 'select', surface: 'player', data: { phase: 'expired', timer: { ...timer(0, 30, 'To choose'), expired: true }, taken: crewTaken, selected: 'c1', name: 'Cl' } },
  'select.assigned': { view: 'select', surface: 'player', data: { phase: 'assigned', timer: timer(29, 30, 'Reading'), assigned: { character: 'c8', name: 'Player 3' } } },
  'select.unsynced': { view: 'select', surface: 'player', data: { phase: 'open', timer: { ...timer(null, 30, 'To choose'), syncing: true }, taken: crewTaken, selected: null, name: '' } },

  // ---------- role reveal and Ready (the viewer is Player 3, the Officer, in a nine-seat match) ----------
  'reveal.dealing': { view: 'reveal', surface: 'player', data: { phase: 'dealing', timer: timer(30, 30, 'Reading') } },
  'reveal.concealed': { view: 'reveal', surface: 'player', data: { phase: 'concealed', timer: timer(27, 30, 'Reading'), progress: setupSeats(9, [5, 9], 'reading') } },
  'reveal.revealed': { view: 'reveal', surface: 'player', data: { phase: 'revealed', timer: timer(21, 30, 'Reading'), role: 'Officer', progress: setupSeats(9, [5, 9, 1], 'reading') } },
  'reveal.ready-sending': { view: 'reveal', surface: 'player', data: { phase: 'sending', timer: timer(16, 30, 'Reading') } },
  'reveal.ready-early': { view: 'reveal', surface: 'player', data: { phase: 'ready-early', timer: timer(14, 30, 'Reading'), progress: setupSeats(9, [1, 3, 5, 9, 4], 'reading') } },
  'reveal.ready-retry': { view: 'reveal', surface: 'player', data: { phase: 'retry', timer: timer(11, 30, 'Reading') } },
  'reveal.waiting-others': { view: 'reveal', surface: 'player', data: { phase: 'waiting', timer: { ...timer(0, 30, 'Reading'), expired: true }, progress: setupSeats(9, [1, 2, 3, 4, 5, 7, 9], 'reading') } },
  'reveal.everyone-ready': { view: 'reveal', surface: 'player', data: { phase: 'everyone', timer: timer(9, 30, 'Reading'), progress: setupSeats(9, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'reading') } },
  'reveal.reconnecting': { view: 'reveal', surface: 'player', data: { phase: 'reconnecting', timer: { ...timer(null, 30, 'Reading'), syncing: true } } },
  'reveal.recovered': { view: 'reveal', surface: 'player', data: { phase: 'recovered', timer: timer(20, 30, 'Reading') } },
  'reveal.backgrounded': { view: 'reveal', surface: 'player', data: { phase: 'backgrounded', timer: timer(24, 30, 'Reading') } },
  'reveal.devices': { view: 'devices', surface: 'player', data: {} },

  // ---------- main game: Player 3 (Cleo) in a nine-seat match, round 2 ----------
  'game.waiting': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo() } },
  'game.own-turn': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(52), seats: roundTwo() } },
  'game.private-open': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(48), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'idle', offers: [['Move', 'available', 'Choose where to move'], ['Shot', 'available', 'Choose a target']] } } } },
  'game.choose-room': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(44), seats: roundTwo(), picking: { offered: ['Room A'], picked: null }, sheet: { role: 'Officer', peek: true, card: { kind: 'choosing', title: 'Move', prompt: say('wherePrompt'), choices: [{ room: 'Room A' }] } } } },
  'game.choose-target': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(39), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'choosing', title: 'Shot', prompt: 'Choose a target', choices: [{ seat: 6 }, { seat: 7 }] } } } },
  'game.confirm': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(35), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'confirming', title: 'Shot', prompt: 'Register a shot at Player 7 · Gus?', consequence: say('registeredConsequence'), confirm: say('registerShot') } } } },
  'game.submitting': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(33), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'busy', title: 'Shot', text: say('sendingShot') } } } },
  'game.registered': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(31), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'result', title: 'Shot', outcome: 'registered', text: 'Shot at Player 7 · Gus registered.', detail: say('shotNotResult') } } } },
  'game.move-accepted': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(40), seats: roundTwo({ 3: { location: 'Room A' } }), moving: { seat: 3, x: 96, y: 150 }, sheet: null, toast: 'Move to Room A accepted.' } },
  'game.rejected': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(4), timer: timer(59), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'result', title: 'Shot', outcome: 'not-accepted', text: say('phaseClosed'), detail: say('tryAgainHint') } } } },
  'game.not-available': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(28), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'idle', note: say('queuedOne'), offers: [['Move', 'available', 'Choose where to move'], ['Shot', 'unavailable', null]] } } } },
  'game.checking': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(30), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'busy', title: 'Shot', status: 'Checking', text: say('checking') } } } },
  'game.unknown': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(4), timer: timer(55), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'result', title: 'Shot', outcome: 'unknown', text: say('unknown'), detail: say('unknownDetail'), action: say('checkAgain') } } } },
  'game.withdrawn': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(4), timer: timer(58), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'result', title: 'Shot', outcome: 'dropped', text: say('choiceDropped'), detail: say('tryAgainHint') } } } },
  'game.knowledge': { view: 'game', surface: 'player', data: { viewer: 4, round: 3, phase: turnOf(1), timer: timer(37), seats: seats(9, { 1: 'Room A', 2: 'Room B', 3: 'Room A', 4: 'Room B', 5: 'Command Room', 6: 'Room A', 7: 'Room B', 8: 'Hospital', 9: 'Room A' }, { 5: { captain: true }, 8: { health: 'Injured' } }), sheet: { role: 'Hacker', knowledge: ['The Undercover is Player 2 · Ben.', 'Round 1: you scanned Player 7 · Gus and guessed Alien. The guess was right, and that player is in the Code.', 'Round 2: you scanned Player 6 · Fay and guessed Red. The guess was wrong.', 'Ordinary weapons you hold: 0.'], card: { kind: 'idle', offers: [['Move', 'unavailable', null], ['Shot', 'unavailable', null]] } } } },
  'game.supply': { view: 'game', surface: 'player', data: { viewer: 5, round: 4, phase: turnOf(8), timer: timer(46), seats: seats(9, { 1: 'Room A', 2: 'Room B', 3: 'Room A', 4: 'Room B', 5: 'Room A', 6: 'Room A', 7: 'Room B', 8: 'Room B', 9: 'Room A' }), sheet: { role: 'Supplier', acknowledgments: ['Your Round 3 Supply granted one weapon each to Player 1 · Ada and Player 9 · Ivo.'], knowledge: ['Ordinary weapons you hold: 0.'], card: { kind: 'idle', offers: [['Move', 'unavailable', null], ['Shot', 'unavailable', null]] } } } },
  'game.supply-received': { view: 'game', surface: 'player', data: { viewer: 9, round: 4, phase: turnOf(8), timer: timer(46), seats: seats(9, { 1: 'Room A', 2: 'Room B', 3: 'Room A', 4: 'Room B', 5: 'Room A', 6: 'Room A', 7: 'Room B', 8: 'Room B', 9: 'Room A' }), sheet: { role: 'Blue Disabler', acknowledgments: ['You received one ordinary weapon from Supply in Round 3.'], knowledge: ['Ordinary weapons you hold: 1.'], card: { kind: 'idle', offers: [['Move', 'unavailable', null], ['Shot', 'unavailable', null]] } } } },
  'game.board-7': { view: 'game', surface: 'player', data: { round: 1, phase: turnOf(1), timer: timer(51), seats: seats(7, { 1: 'Room A', 2: 'Room A', 3: 'Room B', 4: 'Room A', 5: 'Room B', 6: 'Room B', 7: 'Room A' }) } },
  'game.board-8': { view: 'game', surface: 'player', data: { round: 1, phase: turnOf(5), timer: timer(33), seats: seats(8, { 1: 'Room A', 2: 'Room A', 3: 'Room B', 4: 'Room A', 5: 'Room B', 6: 'Room B', 7: 'Room A', 8: 'Room A' }) } },
  'game.crowded': { view: 'game', surface: 'player', data: { round: 1, phase: turnOf(6), timer: timer(24), seats: seats(9, { 1: 'Room A', 2: 'Room A', 3: 'Room B', 4: 'Room A', 5: 'Room A', 6: 'Room B', 7: 'Room A', 8: 'Room A', 9: 'Room A' }) } },
  'game.readable': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo(), readableOpen: true } },

  // ---------- timed phases ----------
  'phase.election': { view: 'game', surface: 'player', data: { round: 2, phase: { kind: 'CAPTAIN_ELECTION' }, timer: timer(51), seats: seats(9, R2, { 8: { health: 'Injured' }, 9: { jailed: true }, 5: { location: 'Room A' } }), vote: { kind: 'CAPTAIN_ELECTION', candidates: [1, 2, 3, 4, 5, 6, 7], voters: 9 } } },
  'phase.election-again': { view: 'game', surface: 'player', data: { round: 2, phase: { kind: 'CAPTAIN_ELECTION' }, timer: timer(57), seats: seats(9, R2, { 8: { health: 'Injured' }, 9: { jailed: true }, 5: { location: 'Room A' } }), vote: { kind: 'CAPTAIN_ELECTION', candidates: [1, 7], voters: 9 }, tally: { kind: 'CAPTAIN_ELECTION', counts: { 1: 3, 7: 3 }, voters: 9, line: say('nobodyElected') } } },
  'phase.jail-vote': { view: 'game', surface: 'player', data: { round: 2, phase: { kind: 'JAIL_VOTE' }, timer: timer(38), seats: roundTwo(), vote: { kind: 'JAIL_VOTE', candidates: [1, 2, 3, 4, 5, 6, 7, 8], voters: 9 }, sheet: { role: 'Officer', card: { kind: 'choosing', title: 'Vote', prompt: say('jailPrompt'), ballot: true, choices: [1, 2, 3, 4, 5, 6, 7, 8].map(seat => ({ seat })), extra: [say('abstain')] } } } },
  'phase.ballot-recorded': { view: 'game', surface: 'player', data: { round: 2, phase: { kind: 'JAIL_VOTE' }, timer: timer(21), seats: roundTwo(), vote: { kind: 'JAIL_VOTE', candidates: [1, 2, 3, 4, 5, 6, 7, 8], voters: 9 }, sheet: { role: 'Officer', ballotLine: 'Your ballot in this vote: Player 7 · Gus.', card: { kind: 'result', title: 'Vote', outcome: 'registered', stampWord: 'Recorded', text: 'Your vote for Player 7 · Gus is recorded.', detail: say('ballotNotResult') } } } },
  'phase.tally': { view: 'game', surface: 'player', data: { round: 3, phase: { kind: 'CAPTAIN_ELECTION' }, timer: timer(54), seats: seats(9, { ...R2, 7: 'Jail' }, { 8: { health: 'Injured' }, 9: { jailed: true }, 7: { jailed: true }, 5: { location: 'Room A' } }), vote: { kind: 'CAPTAIN_ELECTION', candidates: [1, 2, 3, 4, 5, 6], voters: 9 }, tally: { kind: 'JAIL_VOTE', counts: { 7: 4, 4: 2, 6: 1 }, voters: 9, line: 'Sent to Jail: Player 7 · Gus.' } } },
  'phase.release-choice': { view: 'game', surface: 'player', data: { round: 3, phase: { kind: 'RELEASE_CHOICE' }, timer: timer(47), seats: seats(9, { ...R2, 3: 'Command Room', 5: 'Room A', 7: 'Jail' }, { 3: { captain: true }, 8: { health: 'Injured' }, 9: { jailed: true }, 7: { jailed: true } }), vote: { kind: 'RELEASE_CHOICE', chooser: 3, jailed: [7, 9] }, sheet: { role: 'Officer', card: { kind: 'choosing', title: 'Release request', prompt: say('releasePrompt'), choices: [{ seat: 7 }, { seat: 9 }], extra: [say('noRelease')], note: say('releaseUses') } } } },
  'phase.release-vote': { view: 'game', surface: 'player', data: { round: 3, phase: { kind: 'RELEASE_VOTE' }, timer: timer(40), seats: seats(9, { ...R2, 3: 'Command Room', 5: 'Room A', 7: 'Jail' }, { 3: { captain: true }, 8: { health: 'Injured' }, 9: { jailed: true }, 7: { jailed: true } }), vote: { kind: 'RELEASE_VOTE', subject: 9, voters: 9 }, sheet: { role: 'Officer', card: { kind: 'choosing', title: 'Release vote', prompt: 'Release Player 9 · Ivo from Jail?', answers: [say('releaseYes'), say('releaseNo'), say('abstain')] } } } },
  'phase.hack': { view: 'game', surface: 'player', data: { round: 2, phase: { kind: 'HACK' }, timer: timer(56), seats: roundTwo(), sheet: { role: 'Officer', hack: 'Hack: you and Player 4 · Dev.', card: { kind: 'idle', offers: [['Move', 'unavailable', null], ['Shot', 'unavailable', null]] } } } },
  'phase.resolution': { view: 'game', surface: 'player', data: { newRound: true, round: 3, phase: { kind: 'CAPTAIN_ELECTION' }, timer: timer(58), seats: seats(9, { ...R2, 5: 'Room A', 7: 'Jail' }, { 6: { health: 'Injured' }, 8: { health: 'Eliminated', revealed: 'Red' }, 9: { jailed: true }, 7: { jailed: true } }), vote: { kind: 'CAPTAIN_ELECTION', candidates: [1, 2, 3, 4, 5], voters: 8 }, summary: [['injured', 'Player 6 · Fay is now Injured.'], ['eliminated', 'Player 8 · Hana is now Eliminated. Revealed: Red.'], ['jail', 'Player 7 · Gus is now jailed.']] } },
  'phase.showdown': { view: 'game', surface: 'player', data: { round: 5, phase: { kind: 'SHOWDOWN' }, timer: timer(49), final: true, seats: seats(9, { 1: 'Final Zone', 2: 'Final Zone', 3: 'Final Zone', 4: 'Final Zone', 5: 'Final Zone', 6: 'Hospital', 7: 'Final Zone', 8: 'Hospital', 9: 'Final Zone' }, { 6: { health: 'Eliminated', revealed: 'Blue' }, 8: { health: 'Eliminated', revealed: 'Red' }, 9: { jailed: true }, 4: { health: 'Injured' } }), sheet: { role: 'Officer', card: { kind: 'choosing', title: 'Showdown shot', prompt: 'Choose a target', choices: [1, 2, 4, 5, 7, 9].map(seat => ({ seat })) } } } },

  // ---------- player status ----------
  'status.injured': { view: 'game', surface: 'player', data: { round: 3, phase: turnOf(1), timer: timer(44), seats: roundTwo({ 3: { health: 'Injured' }, 5: { location: 'Room A', captain: false } }) } },
  'status.hospital': { view: 'game', surface: 'player', data: { round: 3, phase: turnOf(1), timer: timer(44), seats: roundTwo({ 3: { location: 'Hospital', health: 'Injured' }, 5: { location: 'Room A', captain: false } }) } },
  'status.jailed': { view: 'game', surface: 'player', data: { round: 3, phase: turnOf(1), timer: timer(44), seats: roundTwo({ 3: { location: 'Jail', jailed: true }, 5: { location: 'Room A', captain: false } }) } },
  'status.captain': { view: 'game', surface: 'player', data: { round: 3, phase: turnOf(1), timer: timer(44), seats: roundTwo({ 3: { location: 'Command Room', captain: true }, 5: { location: 'Room A', captain: false } }) } },
  'status.eliminated': { view: 'game', surface: 'player', data: { round: 3, phase: turnOf(1), timer: timer(44), seats: roundTwo({ 3: { health: 'Eliminated', revealed: 'Blue' }, 5: { location: 'Room A', captain: false } }) } },
  'status.watching': { view: 'game', surface: 'player', data: { round: 4, phase: { kind: 'JAIL_VOTE' }, timer: timer(30), seats: roundTwo({ 3: { health: 'Eliminated', revealed: 'Blue' }, 5: { location: 'Room A', captain: false } }), vote: { kind: 'JAIL_VOTE', candidates: [1, 2, 4, 5, 6, 7, 8], voters: 8 } } },

  // ---------- system ----------
  'system.loading': { view: 'system', surface: 'player', data: { variant: 'loading' } },
  'system.reconnecting': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(2), timer: timer(42), seats: roundTwo(), stale: true } },
  'system.clock': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: { ...timer(null), syncing: true }, seats: roundTwo(), unsynced: true } },
  'system.unresolved': { view: 'game', surface: 'player', data: { round: 2, phase: turnOf(3), timer: timer(38), seats: roundTwo(), sheet: { role: 'Officer', card: { kind: 'busy', title: 'Your action', status: 'Checking', text: say('checkingReload') } } } },
  'system.access-unconfirmed': { view: 'system', surface: 'player', data: { variant: 'unconfirmed' } },
  'system.no-access': { view: 'system', surface: 'player', data: { variant: 'no-access' } },
  'system.incompatible': { view: 'system', surface: 'player', data: { variant: 'incompatible' } },
  'system.seat-moved-in': { view: 'system', surface: 'player', data: { variant: 'moved-in' } },

  // ---------- end ----------
  'end.winner': { view: 'end', surface: 'player', data: { winner: 'Blue', alien: true, reveal: true } },
  'end.draw': { view: 'end', surface: 'player', data: { winner: 'Draw', reveal: true } },
  'end.aborted': { view: 'end', surface: 'player', data: { aborted: true } },
  'end.next': { view: 'end', surface: 'player', data: { winner: 'Blue', alien: true, reveal: false, next: true } },

  // ---------- public display ----------
  'display.admit': { view: 'display-admit', surface: 'display', data: {} },
  'display.setup': { view: 'display-setup', surface: 'display', data: { timer: timer(17, 30, 'Character selection'), seats: setupSeats(9, [1, 2, 4, 5, 6, 9], 'choosing') } },
  'display.board': { view: 'display-board', surface: 'display', data: { round: 3, phase: turnOf(4), timer: timer(37), seats: seats(9, { ...R2, 5: 'Room A', 7: 'Jail' }, { 6: { health: 'Injured' }, 8: { health: 'Eliminated', revealed: 'Red' }, 9: { jailed: true }, 7: { jailed: true } }), tally: { kind: 'JAIL_VOTE', counts: { 7: 4, 4: 2, 6: 1 }, voters: 9, line: 'Sent to Jail: Player 7 · Gus.' } } },
  'display.result': { view: 'display-result', surface: 'display', data: { winner: 'Blue', alien: true } },
};

/** The end reveal: every seat's role and the Code. Public only at the end of a match (V1-18). */
export const END_REVEAL = { roles: BASE.map(seat => ({ n: seat.n, name: seat.name, character: seat.character, role: seat.role })), code: [1, 5, 7, 9] };
export const BASE_SEATS = BASE.map(({ role, ...publicSeat }) => publicSeat);

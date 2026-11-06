// mothership:dev-only
//
// Proposed words for library group 8 (the successor sweep). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice. Current names only
// (names.mjs usesCurrentNames); the Supply's words never name the Supplier to a recipient or a
// recipient to anyone else; the lobby never offers a room picker (initial rooms are random).

export const SUCCESSOR_COPY = Object.freeze({
  tapeLobby: 'Lobby',
  tapeRole: 'Your role',
  tapeSupply: 'Supply',
  tapeAdmission: 'Hospital admission',
  // The lobby.
  start: 'Host a match on this phone, or join one with its room code.',
  host: 'Host a match',
  join: 'Join',
  codeLabel: 'Room code',
  joinAs: 'Join as a player, or as the shared display.',
  stampSending: 'Sending',
  requesting: 'Asking the host to let you in…',
  waiting: 'The host has your request. You join when they approve it.',
  shareCode: 'Share this code with the players and the display.',
  seats: (filled, total) => `${filled} of ${total} seats filled`,
  bots: n => `${n} ${n === 1 ? 'bot' : 'bots'}`,
  approve: 'Approve',
  begin: 'Begin',
  beginHint: (filled, total) => (filled === total ? 'Every seat is filled. Begin when the table is ready.' : `Fill ${total - filled} more ${total - filled === 1 ? 'seat' : 'seats'} with players or bots to begin.`),
  joined: 'You are in. The host begins the match.',
  display: 'This screen shows the shared board when the match begins.',
  setup: 'Setup: choose your character, then read your role. Starting rooms are drawn at random.',
  refused: Object.freeze({
    NOT_FOUND: 'No match has that code. Check it with the host.',
    INVALID_REQUEST: 'A room code is six letters and numbers. Check it with the host.',
    FORBIDDEN: 'This match is not taking new players.',
    NOT_ALLOWED: 'This match is not taking new players.',
    RATE_LIMITED: 'Too many tries. Wait a moment, then try again.',
    UNAVAILABLE: 'The server is not answering. Try again in a moment.',
    other: 'Your request did not go through. Try again.',
  }),
  pendingKind: kind => (kind === 'display' ? 'display' : 'player'),
  memberBot: 'bot',
  // Role cards.
  roleRead: 'Read your role. Ready unlocks after 30 seconds.',
  // The Supply.
  supplierWaiting: 'Registered. Deliveries happen at Round 3\'s Supply stage, after the Rescue. Nobody else sees them.',
  supplyReceived: 'You received one ordinary weapon. You can use it from Round 4.',
  supplyPrivate: 'Only you see this.',
  // The count at rest, for any change the receipt does not claim (a Blackhole Sync's restore, a
  // weapon used, a reconnect, or no R15 marker): the number only, never "received" or "delivered".
  inventory: n => `Ordinary weapons: ${n}.`,
  // Admission.
  admissionWalk: name => `${name} is taken to the Hospital.`,
  admissionSnap: name => `${name} is in the Hospital.`,
});

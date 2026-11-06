// mothership:dev-only
//
// Proposed words for library group 1 (the Hacker's final Code and ship hack, the Engineer's
// capture). Frontend owns the game's copy (packages/presentation/src/copy/); these are proposals,
// written in the dossier's voice (design/abilities/js/*.js COPY): short, plain, in the second person,
// never a claim the view does not make. "Registered" is never a result; a stamp is never the only
// place a meaning appears. Seat lists are in seat order, as the dossier writes them.

const who = seat => `Player ${seat.n}, ${seat.name}`;
/**
 * A seat list in words. Each label holds a comma ("Player 5, Eli"), so labels are never joined by a
 * bare comma: "Player 5, Eli and Player 6, Fay"; "Player 1, Ada; Player 2, Ben and Player 3, Cy".
 * (Replacing the last comma with "and" would split the last label: "Player 5, Eli, Player 6 and Fay".)
 */
export const listSeats = seats => {
  const names = seats.map(who);
  return names.length > 1 ? `${names.slice(0, -1).join('; ')} and ${names.at(-1)}` : (names[0] ?? '');
};
const list = listSeats;

export const LIBRARY_COPY = Object.freeze({
  // Tapes (label tapes, as the dossier sets them).
  tapeFinalCode: 'Final Code',
  tapeShipHack: 'Ship hack',
  tapeCapture: room => `Capture ${room}`,
  tapeEngineer: 'Engineer file',
  // Stamps (the dossier's stamp frame; the words carry the meaning beside them too).
  stampSending: 'Sending',
  stampUnlocked: 'Unlocked',
  stampWrong: 'Wrong Code',
  stampRetained: 'Retained',
  stampUsed: 'Used',
  stampCaptured: 'Captured',
  // The final Code.
  finalCodeRound1: 'Your final Code opens in Round 2.',
  finalCodeAsk: picks => `Submit this final Code: ${picks.map(seat => `Player ${seat.n}`).join(', ')}?`,
  finalCodeRule: 'This is your one final Code in the match. A correct Code unlocks the ship hack. You cannot change it once the server accepts it.',
  finalCodeChoose: count => (count < 4 ? `Pick ${4 - count} more ${4 - count === 1 ? 'player' : 'players'} for the Code.` : 'Four players picked.'),
  finalCodeClosed: 'You cannot submit your final Code right now.',
  finalCodeSending: 'Sending your final Code to the server…',
  finalCodeCorrect: 'Your final Code is correct. The ship hack is unlocked.',
  finalCodeCorrectNote: 'Unlocking does not move the ship. Use the ship hack on an eligible turn.',
  finalCodeWrong: 'Your final Code is not correct. Scan stays available. There is no second attempt.',
  submitFinalCode: 'Submit final Code',
  chooseAgain: 'Choose again',
  // The ship hack.
  shipSealed: 'Ship hack: locked. A correct final Code unlocks it.',
  shipArmed: 'Ship hack: unlocked and not used.',
  shipRule: 'Use it on your own turn while Healthy, free and in Room A or B, with your Role Action unused.',
  shipAsk: 'Hack the ship now? At this round’s navigation the route goes to Red. It uses your Role Action, and it works once in the match.',
  shipSending: 'Sending your ship hack to the server…',
  shipRetained: 'Ship hack registered. It applies at this round’s navigation.',
  shipUsed: round => (round ? `Ship hack used in Round ${round}.` : 'Ship hack used.'),
  hackShip: 'Hack the ship',
  notNow: 'Not now',
  // The Engineer's capture.
  engineerRule: 'Capture: once in the match, from Room A or B, on your own turn with your Role Action unused.',
  captureAsk: (room, seats) => (seats.length
    ? `Capture everyone in ${room} now: ${list(seats)}. Their navigation input is set to zero through this round. Votes are not affected.`
    : `${room} is empty right now. Capturing now captures no one.`),
  captureOnce: 'You can do this once in the match.',
  captureButton: room => `Capture ${room}`,
  captureSending: 'Sending your capture to the server…',
  captured: (seats, round) => (seats.length ? `Captured: ${list(seats)}. Their navigation input is zero through Round ${round}.` : `Captured no one in Round ${round}.`),
  capturedNoRecord: 'Capture registered.',
  captureUsed: (seats, round) => (seats ? (seats.length ? `Captured in Round ${round}: ${list(seats)}.` : `Captured no one in Round ${round}.`) : 'Capture used.'),
  // Why an action is not offered now (the seat's own facts; the server decides).
  blockers: Object.freeze({
    eliminated: 'You are out of the match.',
    notYourTurn: 'It is not your turn.',
    injured: 'You are Injured.',
    jailed: 'You are in the Jail.',
    notInAB: 'You are not in Room A or Room B.',
    actionUsed: 'Your Role Action is used this round.',
    notNow: 'Not available right now.',
  }),
  // A refused command (the release's failure words stay Frontend's).
  rejected: 'The server did not accept that. Nothing was used.',
});

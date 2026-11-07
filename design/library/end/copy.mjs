// mothership:dev-only
//
// Proposed words for library group 7 (the match's end and recovery). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice. An ending is said
// only as the result says it; the Alien's co-win is named only when the result carries it, with the
// rule's two conditions; no survivors is never inferred from a crew that is jailed or injured; a
// reconnect promises the latest state, never a replay.

export const END_COPY = Object.freeze({
  tapeEnd: 'Match end',
  tapeConnection: 'Connection',
  sides: Object.freeze({ Blue: 'Blue team', Red: 'Red team', Alien: 'Alien' }),
  // Stamps.
  stampWins: 'Wins',
  stampCoWin: 'Wins too',
  stampNoWinner: 'No winner',
  stampEnded: 'Ended',
  // The arrival.
  wins: side => `${side === 'Blue' ? 'Blue' : 'Red'} team wins.`,
  arrived: side => `The ship reached the ${side} Planet.`,
  coWin: 'The Alien wins too: it was alive at the arrival and used the Blackhole.',
  // No survivors and abort.
  noSurvivors: 'No player is alive. There is no winner.',
  aborted: 'The host ended the match. There is no winner and no reveal.',
  // The reveal.
  revealTitle: 'Every role',
  code: list => `The Code was Players ${list}.`,
  winnerMark: 'winner',
  // Connection and recovery.
  reconnecting: 'Reconnecting… The game goes on. When you are back you will see the latest state.',
  restored: 'Back. This is the latest state.',
  stale: 'Waiting for the server…',
  pictureFailed: 'This picture did not load. The words here say what it shows.',
  filmFailed: 'This film did not load. The latest state is shown instead.',
  lateJoin: 'You joined after this happened, so it is shown as it ended.',
});

/** "2, 5, 7 and 8". */
export const listNumbers = ns => (ns.length > 1 ? `${ns.slice(0, -1).join(', ')} and ${ns.at(-1)}` : String(ns[0] ?? ''));

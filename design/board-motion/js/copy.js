// mothership:dev-only
//
// The words the board-motion prototype shows. What the release already says is the release's
// own wording: each function below mirrors one in packages/presentation/src/copy/en.ts, and
// design/tools/board-motion-check.mjs compares their output with the built `en` for every
// value the prototype uses. Words the release does not have are in PROPOSED, and listed as
// proposals in docs/design/board-motion-handoff.md.

const who = (n, self) => (self ? 'yourself' : `Player ${n}`);

export const COPY = {
  kind: {
    pass: 'Pass', move: 'Move', shot: 'Shot', disable: 'Disable', protect: 'Protection', rescue: 'Rescue', hack: 'Hack', 'showdown-shot': 'Showdown shot',
    vote: 'Vote', 'release-choice': 'Release request', 'release-vote': 'Release vote', scan: 'Scan', supply: 'Supply', code: 'Code attempt',
  },
  status: { idle: 'Nothing in progress', choosing: 'Choosing', confirming: 'Not sent yet', submitting: 'Submitting', checking: 'Checking', unknown: 'Result unknown', accepted: 'Accepted', 'not-accepted': 'Not accepted' },
  open: {
    pass: 'Pass turn', move: 'Choose where to move', shot: 'Choose a target', disable: 'Choose a target', protect: 'Choose a player', rescue: 'Choose a player',
    hack: 'Choose a player', 'showdown-shot': 'Choose a target', vote: 'Cast your ballot', 'release-choice': 'Choose', 'release-vote': 'Cast your ballot',
    scan: 'Choose a player', supply: 'Choose two players', code: 'Enter a Code',
  },
  choosePrompt: {
    pass: 'End your turn now?', move: 'Where do you move?', shot: 'Choose a target', disable: 'Choose a target', protect: 'Who is the Protection for?', rescue: 'Who is the Rescue for?',
    hack: 'Who do you request a Hack with?', 'showdown-shot': 'Choose a target', 'release-choice': 'Ask for a release vote for which jailed player?',
  },
  cancel: 'Cancel',
  chooseAgain: 'Choose again',
  who,
  confirmMove: destination => `Move to ${destination}?`,
  confirmTarget: {
    shot: w => `Register a shot at ${w}?`, disable: w => `Register a Disable at ${w}?`, protect: w => `Register Protection for ${w}?`,
    rescue: w => `Register a Rescue of ${w}?`, hack: w => `Request a Hack with ${w}?`, 'showdown-shot': w => `Register a showdown shot at ${w}?`,
  },
  consequence: {
    pass: 'Your turn ends when the server accepts Pass.',
    move: 'You cannot change or withdraw it here once the server accepts it.',
    shot: 'You cannot change or withdraw it here once it is registered.',
    disable: 'You cannot change or withdraw it here once it is registered.',
    protect: 'You cannot change or withdraw it here once it is registered.',
    rescue: 'You cannot change or withdraw it here once it is registered.',
    hack: 'You cannot change or withdraw it here once the server accepts it.',
    'showdown-shot': 'You cannot change or withdraw it here once it is registered.',
    vote: 'This is your one ballot in this vote. You cannot change it once the server accepts it.',
    'release-vote': 'This is your one ballot in this vote. You cannot change it once the server accepts it.',
    'release-choice': 'The Captain has one release request in a match. This uses it, whatever the vote decides. You cannot change it once the server accepts it.',
    scan: 'This uses your Scan for this round, whatever the result. You cannot change or withdraw it once the server accepts it.',
    supply: 'You cannot change or withdraw it here once it is registered.',
    code: 'This is your one Code attempt in this match. You cannot change it once the server accepts it.',
  },
  confirm: {
    pass: 'Pass', move: 'Move', shot: 'Register shot', disable: 'Register Disable', protect: 'Register Protection', rescue: 'Register Rescue', hack: 'Request Hack',
    'showdown-shot': 'Register shot', vote: 'Cast ballot', 'release-choice': 'Confirm choice', 'release-vote': 'Cast ballot', scan: 'Scan', supply: 'Register Supply', code: 'Submit Code attempt',
  },
  submitting: {
    pass: 'Passing your turn…', move: 'Sending your move to the server…', shot: 'Sending your shot to the server…', disable: 'Sending your Disable to the server…',
    protect: 'Sending your Protection to the server…', rescue: 'Sending your Rescue to the server…', hack: 'Sending your Hack request to the server…',
    'showdown-shot': 'Sending your shot to the server…', vote: 'Sending your ballot to the server…', 'release-choice': 'Sending your choice to the server…',
    'release-vote': 'Sending your ballot to the server…', scan: 'Sending your Scan to the server…', supply: 'Sending your Supply to the server…', code: 'Sending your Code attempt to the server…',
  },
  checking: 'Checking what the server did with your action…',
  moved: destination => `Move to ${destination} accepted.`,
  acceptedTarget: {
    shot: w => `Shot at ${w} registered.`, disable: w => `Disable at ${w} registered.`, protect: w => `Protection for ${w} registered.`,
    rescue: w => `Rescue of ${w} registered.`, hack: w => `Hack request with ${w} accepted.`, 'showdown-shot': w => `Showdown shot at ${w} registered.`,
  },
  acceptedDetail: {
    shot: 'This is not a result. Registered shots are resolved at the end of the round.',
    disable: 'This is not a result. Registered actions are resolved at the end of the round.',
    protect: 'This is not a result. Registered actions are resolved at the end of the round.',
    rescue: 'This is not a result. Registered actions are resolved at the end of the round.',
    hack: 'The phase shown at the top of this screen says what happens next.',
    'showdown-shot': 'This is not a result.',
  },
  hackWith: n => `Hack: you and Player ${n}.`,
  ballot: {
    votePrompt: { CAPTAIN_ELECTION: 'Who do you vote for as Captain?', JAIL_VOTE: 'Who do you vote to send to Jail?', other: 'Who do you vote for?' },
    releaseVotePrompt: w => (w === null ? 'Release the jailed player this vote is on?' : `Release ${w} from Jail?`),
    abstain: 'Abstain', noRequest: 'No release request', yes: 'Yes, release', no: 'No, do not release',
    confirmVote: { CAPTAIN_ELECTION: w => `Vote for ${w} as Captain?`, JAIL_VOTE: w => `Vote to send ${w} to Jail?`, other: w => `Vote for ${w}?` },
    confirmAbstain: 'Abstain from this vote?',
    confirmRelease: w => `Ask for a vote on releasing ${w} from Jail?`,
    confirmNoRequest: 'Make no release request now?',
    confirmReleaseVote: { yes: w => (w === null ? 'Vote yes to the release?' : `Vote yes to releasing ${w}?`), no: w => (w === null ? 'Vote no to the release?' : `Vote no to releasing ${w}?`) },
    consequenceNoRequest: 'The release request stays unused. You cannot change this choice once the server accepts it.',
    votedFor: w => `Your vote for ${w} is recorded.`,
    abstained: 'Your abstention is recorded.',
    releaseRequested: w => `Release vote for ${w} requested.`,
    noRequestMade: 'Your choice is recorded: no release request.',
    releaseVoted: { yes: 'Your vote is recorded: yes.', no: 'Your vote is recorded: no.' },
    acceptedDetail: {
      vote: 'This is not a result. The count is shown to everyone when the vote closes.',
      'release-choice': 'The phase shown at the top of this screen says what happens next.',
      'release-vote': 'This is not a result. The count is shown to everyone when the vote closes.',
    },
  },
  compound: {
    scanSeat: 'Who do you scan?',
    scanGuess: w => `Guess a faction for ${w}.`,
    supplyFirst: 'Two players get a weapon each. Choose the first.',
    supplySecond: 'Choose the second player.',
    codePick: left => (left === 4 ? 'Choose the four players of your Code attempt.' : left === 1 ? 'Choose one more player.' : `Choose ${left} more players.`),
    picked: names => `Chosen so far: ${names}.`,
    undo: name => `Take back ${name}`,
    confirmScan: (w, guess) => `Scan ${w}, guessing ${guess}?`,
    confirmSupply: (a, b) => `Register a weapon each for ${a} and ${b}?`,
    confirmCode: names => `Submit this Code attempt: ${names}?`,
    scanAccepted: (w, guess) => `Scan of ${w}, guessing ${guess}, accepted.`,
    scanDetail: 'The result is listed under “What you know”, as the server gives it.',
    supplyAccepted: (a, b) => `Supply for ${a} and ${b} registered.`,
    supplyDetail: 'This is not a result. Registered actions are resolved at the end of the round.',
    codeAccepted: 'Your Code attempt is recorded.',
    codeDetail: 'This is not a result. It is checked when the round is resolved, not now.',
  },
  rejected: { PHASE_CLOSED: 'Not accepted. It reached the server after that phase had ended.', NOT_ALLOWED: 'Not accepted. The server did not allow it.' },
  tryAgainHint: 'You can choose again if the server still offers it.',
  choiceDropped: 'Your choice was not sent.',
  unknown: 'Result unknown. The app could not confirm what the server did with your action.',
  unknownDetail: 'Do not assume either way. You can check again at any time.',
  checkAgain: 'Check again',
  done: 'Done',
  ok: 'OK',
  movedDetail: 'Where you are is shown under “Your location”, as the server has it.',
  queued: count => (count === 1 ? 'One action of yours is registered and waiting to be resolved.' : `${count} actions of yours are registered and waiting to be resolved.`),
  phase: {
    round: round => `Round ${round}`,
    yourTurn: 'Your turn',
    turnOf: seat => `Player ${seat}’s turn`,
    kind: {
      HACK: 'Hack', CAPTAIN_ELECTION: 'Captain election', RELEASE_CHOICE: 'Release choice', RELEASE_VOTE: 'Release vote',
      JAIL_VOTE: 'Jail vote', SHOWDOWN: 'Showdown', FINISHED: 'Match finished', ABORTED: 'Match ended by the host',
    },
  },
  timer: { label: 'Time remaining', expired: 'Time is up', waiting: 'Waiting for phase update', syncing: 'Syncing time with the server' },
  marker: { self: 'You', turn: 'Active turn', jailed: 'Jailed', captain: 'Captain', health: health => health, faction: faction => `Revealed: ${faction}` },
  actions: {
    pausedStale: 'Actions are paused until the connection is restored.',
    pausedExpired: 'This phase has ended. Waiting for phase update.',
  },
  privateArea: { hint: 'Only open this where other players cannot see your screen.', role: 'Your role' },
  roster: { column: { player: 'Player', location: 'Location', status: 'Status' }, noStatus: 'None' },
  banner: { fixture: 'Fixture data. A synthetic development scenario, not a live match.', stale: 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…' },
  tally: {
    heading: 'Last vote counted',
    votes: count => (count === 1 ? '1 vote' : `${count} votes`),
    elected: seat => `Elected Captain: Player ${seat}.`,
    jailed: seat => `Sent to Jail: Player ${seat}.`,
    released: seat => `Player ${seat} was released.`,
  },
  announce: {
    health: (seat, health) => `Player ${seat} is now ${health}.`,
    jailed: seat => `Player ${seat} is now jailed.`,
    released: seat => `Player ${seat} is no longer jailed.`,
    location: (seat, location) => `Player ${seat} is now in ${location}.`,
    captain: seat => `Player ${seat} is now Captain.`,
    captainEnded: seat => `Player ${seat} is no longer Captain.`,
  },
};

/** Words the pinned release uses outside en.ts: its comic shell, its model and its room tags. */
export const SHELL = {
  boardHeading: 'The ship', navigation: 'Game navigation', closePanel: 'Close panel', tapCharacter: 'Tap a character', noActions: 'No actions available right now.',
  yourCard: 'Your card', readableList: 'Players and locations — readable list',
  passLabel: 'Pass — end your turn', passConfirm: 'End your turn now?', passAccepted: 'Turn passed.', passDetail: 'The next phase is shown at the top of the board.',
  nav: { board: 'Board', actions: 'Actions', card: 'Card', menu: 'Menu' },
  cannotMove: 'You cannot move to that room right now.', finishFirst: 'Finish or cancel the current action first.',
};

/** Where each SHELL word is in the release. The check finds every quote verbatim in its file. */
const SHELL_TS = 'packages/presentation/src/markup/comic-shell.ts';
const MODEL_TS = 'packages/presentation/src/model/connected-player.ts';
const ROOMS_MJS = 'apps/game/hosted/room-movement.mjs';
export const RELEASE_TEXT = {
  boardHeading: [SHELL_TS, `'${SHELL.boardHeading}'`],
  navigation: [SHELL_TS, `'${SHELL.navigation}'`],
  closePanel: [SHELL_TS, `'${SHELL.closePanel}'`],
  tapCharacter: [SHELL_TS, ` · ${SHELL.tapCharacter}`],
  noActions: [SHELL_TS, SHELL.noActions],
  yourCard: [SHELL_TS, `'${SHELL.yourCard}'`],
  readableList: [SHELL_TS, `'${SHELL.readableList}'`],
  passLabel: [SHELL_TS, `'${SHELL.passLabel}'`],
  passConfirm: [MODEL_TS, SHELL.passConfirm],
  passAccepted: [MODEL_TS, SHELL.passAccepted],
  passDetail: [MODEL_TS, SHELL.passDetail],
  navBoard: [SHELL_TS, `'${SHELL.nav.board}'`],
  navActions: [SHELL_TS, `'${SHELL.nav.actions}'`],
  navCard: [SHELL_TS, `'${SHELL.nav.card}'`],
  navMenu: [SHELL_TS, `'${SHELL.nav.menu}'`],
  cannotMove: [ROOMS_MJS, SHELL.cannotMove],
  finishFirst: [ROOMS_MJS, SHELL.finishFirst],
};

/** New words this prototype proposes. Nothing the release says is reworded. */
export const PROPOSED = {
  moveTentative: 'You?',
  moveSent: 'Your character moves when the board update arrives.',
  moveArrived: 'Your character is shown where the server has it.',
  pendingStamp: 'Sending',
  registeredStamp: 'Registered',
  notAcceptedStamp: 'Not accepted',
  unknownStamp: 'Unknown',
  roomSubtitle: { 'Command Room': 'Captain', 'Room A': 'Engineering', 'Room B': 'Laboratory' },
  noLongerOffered: n => `Player ${n} is no longer offered. Choose again.`,
  subject: 'On the ballot',
  passLegacy: 'This match has no Pass.',
  passNotYours: 'Pass is available on your own turn.',
  observerTitle: 'Everyone else sees',
};

// mothership:dev-only
//
// Words for the Designer's review pages.
//
// `en` repeats the English interface strings exactly as Frontend implements them in
// packages/presentation/src/copy/en.ts at fccadf7 (agent/frontend-motion-gallery), so a
// review page reads like the shells. Only the strings a review page shows are repeated.
// Frontend owns those strings; this is a copy for looking at layout, not a second source
// of truth.
//
// Nothing here is drawn into an illustration.

export const en = {
  appName: 'Mothership',
  skipToContent: 'Skip to main content',
  surface: { table: 'Table display', youAre: 'You are', player: 'Player phone' },
  seat: { label: n => `Player ${n}`, labelSelf: n => `Player ${n} (you)` },
  banner: {
    fixture: 'Fixture data. A synthetic development scenario, not a live match.',
    stale: 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…',
    reconnect: 'Reconnect now',
  },
  phase: {
    round: n => `Round ${n}`,
    yourTurn: 'Your turn',
    turnOf: n => `Player ${n}’s turn`,
    turnUnassigned: 'Turn in progress',
    resolution: 'Round resolution',
    resolutionDetail: 'The round is being resolved.',
  },
  timer: {
    label: 'Time remaining',
    remaining: seconds => (seconds === 1 ? '1 second remaining' : `${seconds} seconds remaining`),
    expiredDisplay: '0:00',
    expired: 'Time is up',
    waiting: 'Waiting for phase update',
    syncingDisplay: '–:––',
    syncing: 'Syncing time with the server',
    none: 'This phase has no timer',
  },
  location: { heading: 'Your location', status: 'Your public status', others: 'Also here', alone: 'No other players are here.', empty: 'No players here.' },
  marker: { self: 'You', turn: 'Active turn', jailed: 'Jailed', captain: 'Captain' },
  privateArea: {
    heading: 'Private',
    show: 'Show private information',
    hide: 'Hide private information',
    hint: 'Only open this where other players cannot see your screen.',
    role: 'Your role',
  },
  actions: {
    heading: 'Actions',
    pausedStale: 'Actions are paused until the connection is restored.',
    pausedExpired: 'This phase has ended. Waiting for phase update.',
  },
  shot: {
    title: 'Shot',
    status: {
      available: 'Available', unavailable: 'Not available', targeting: 'Choosing a target', confirming: 'Not sent yet',
      submitting: 'Submitting', checking: 'Checking', unknown: 'Result unknown', registered: 'Registered',
      'was-registered': 'Was registered', 'not-registered': 'Not registered',
    },
    open: 'Choose a target',
    reasonNotYourTurn: 'You can register a shot during your own turn.',
    registeredEarlier: 'A shot is registered. It is resolved at the end of the round.',
    registeredAt: n => `Your shot at Player ${n} is registered. It is resolved at the end of the round.`,
    targetPrompt: 'Choose a target',
    targetNote: 'Players in your location are listed. The server decides whether a shot is allowed.',
    targetEmpty: 'No other players are in your location.',
    cancel: 'Cancel',
    confirmPrompt: n => `Register a shot at Player ${n}?`,
    confirmConsequence: 'You cannot change or withdraw it here once it is registered.',
    confirm: 'Register shot',
    chooseAgain: 'Choose someone else',
    submitting: 'Sending your shot to the server…',
    checking: 'Checking whether your shot was registered…',
    registered: n => `Shot at Player ${n} registered.`,
    registeredNoTarget: 'Your shot is registered.',
    registeredDetail: 'This is not a result. Registered shots are resolved at the end of the round.',
    wasRegistered: n => `Your shot at Player ${n} was registered.`,
    wasRegisteredNoTarget: 'Your shot was registered.',
    wasRegisteredDetail: 'It is no longer waiting to be resolved. This is not a result.',
    rejectedNotAllowed: 'Not registered. The server did not allow this shot.',
    tryAgainHint: 'You can choose again if it is still your turn.',
    unknown: 'Result unknown. The app could not confirm whether your shot was registered.',
    unknownDetail: 'Do not assume either way. You can check again at any time.',
    checkAgain: 'Check again',
    done: 'Done',
    ok: 'OK',
  },
  roster: {
    playerHeading: 'All players', boardHeading: 'Board', tableHeading: 'Players',
    caption: 'Public status of all nine players',
    column: { player: 'Player', location: 'Location', health: 'Health', status: 'Status' },
    noStatus: 'None',
  },
  settings: { heading: 'Display settings', reduceMotion: 'Reduce motion', followsDeviceOff: 'Follows this device’s setting.' },
  details: {
    summary: 'Match details', match: 'Match', source: 'Data source', protocol: 'Protocol', sourceFixture: 'Fixture (synthetic)',
  },
};

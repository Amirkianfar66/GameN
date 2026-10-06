import type { DataSourceMode, Destination, FactionName, HealthState, LocationName, NotAcceptedReason, PhaseFacts, ShotRejectionCode } from '../model/types.js';

type NamedPhaseKind = Exclude<PhaseFacts['kind'], 'ORDINARY_TURN' | 'ROUND_RESOLUTION'>;

// Every string the shells show or speak. Interface wording only: nothing here states a
// rule, an eligibility reason or an outcome that the audience view did not supply.
export const en = {
  appName: 'Mothership',
  skipToContent: 'Skip to main content',

  title: {
    player: (seat: number) => `Mothership — Player ${seat}`,
    playerConnecting: 'Mothership — Player',
    table: 'Mothership — Table display',
  },
  surface: { table: 'Table display', youAre: 'You are', player: 'Player phone' },

  seat: {
    label: (seat: number) => `Player ${seat}`,
    labelSelf: (seat: number) => `Player ${seat} (you)`,
  },

  banner: {
    fixture: 'Fixture data. A synthetic development scenario, not a live match.',
    emulator: 'Local emulator. A development backend, not a live match.',
    stale: 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…',
    unreadable: 'The latest update could not be read. Showing the last known state, which may be out of date.',
    unreadableNoView: 'The latest update could not be read. Waiting for a readable update.',
    reconnect: 'Reconnect now',
  },

  connecting: { heading: 'Connecting', text: 'Connecting to the match…' },

  blocked: {
    incompatible: {
      heading: 'Update required',
      paragraphs: [
        'This match uses a game version that this app cannot display.',
        'Reload to get the current version. The match itself is not affected.',
      ],
    },
    integrity: {
      heading: 'Match data check failed',
      paragraphs: [
        'This device received match data that does not belong to this match or seat, so none of it is shown.',
        'Reload to reconnect. The match itself is not affected.',
      ],
    },
    reload: 'Reload',
  },

  phase: {
    round: (round: number) => `Round ${round}`,
    yourTurn: 'Your turn',
    turnOf: (seat: number) => `Player ${seat}’s turn`,
    turnUnassigned: 'Turn in progress',
    resolution: 'Round resolution',
    resolutionDetail: 'The round is being resolved.',
    // The server's own phase kinds under wire protocol 2, named and nothing more.
    kind: {
      HACK: 'Hack',
      CAPTAIN_ELECTION: 'Captain election',
      RELEASE_CHOICE: 'Release choice',
      RELEASE_VOTE: 'Release vote',
      JAIL_VOTE: 'Jail vote',
      SHOWDOWN: 'Showdown',
      FINISHED: 'Match finished',
      ABORTED: 'Match ended by the host',
    } satisfies Record<NamedPhaseKind, string>,
    notPlayableYet: 'This preview shows this phase and its clock. It cannot take part in it yet.',
  },

  timer: {
    label: 'Time remaining',
    remaining: (seconds: number) => (seconds === 1 ? '1 second remaining' : `${seconds} seconds remaining`),
    expiredDisplay: '0:00',
    expired: 'Time is up',
    waiting: 'Waiting for phase update',
    syncingDisplay: '–:––',
    syncing: 'Syncing time with the server',
    none: 'This phase has no timer',
  },

  location: {
    heading: 'Your location',
    status: 'Your public status',
    others: 'Also here',
    alone: 'No other players are here.',
    empty: 'No players here.',
    name: (location: LocationName): string => location,
  },

  marker: {
    self: 'You',
    turn: 'Active turn',
    jailed: 'Jailed',
    captain: 'Captain',
    health: (health: HealthState): string => health,
    faction: (faction: FactionName): string => `Revealed: ${faction}`,
  },

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

  // Interface wording for the shot flow, provisional until the copy is reviewed. "Registered"
  // is never an outcome. The two statements about the game are taken from the current rule
  // sources: an ordinary turn is the player's own minute to act (turn_timing), and registered
  // attacks are resolved at the end of the round (end_of_round_order).
  shot: {
    title: 'Shot',
    status: {
      available: 'Available',
      unavailable: 'Not available',
      targeting: 'Choosing a target',
      confirming: 'Not sent yet',
      submitting: 'Submitting',
      checking: 'Checking',
      unknown: 'Result unknown',
      registered: 'Registered',
      'was-registered': 'Was registered',
      'not-registered': 'Not registered',
    },
    open: 'Choose a target',
    reasonNotYourTurn: 'You can register a shot during your own turn.',
    registeredEarlier: 'A shot is registered. It is resolved at the end of the round.',
    registeredAt: (seat: number) => `Your shot at Player ${seat} is registered. It is resolved at the end of the round.`,
    targetPrompt: 'Choose a target',
    targetNote: 'Players in your location are listed. The server decides whether a shot is allowed.',
    targetEmpty: 'No other players are in your location.',
    cancel: 'Cancel',
    confirmPrompt: (seat: number) => `Register a shot at Player ${seat}?`,
    // An interface fact, not a rule: this app has no way to change or withdraw a registered shot.
    confirmConsequence: 'You cannot change or withdraw it here once it is registered.',
    confirm: 'Register shot',
    chooseAgain: 'Choose someone else',
    submitting: 'Sending your shot to the server…',
    checking: 'Checking whether your shot was registered…',
    checkingAfterReload: 'This page was reloaded before the server answered. Checking whether your shot was registered…',
    registered: (seat: number) => `Shot at Player ${seat} registered.`,
    registeredNoTarget: 'Your shot is registered.',
    registeredDetail: 'This is not a result. Registered shots are resolved at the end of the round.',
    registeredAfterReload: 'This page was reloaded, so it no longer knows the target. This is not a result. Registered shots are resolved at the end of the round.',
    // The server registered it, and the player's view has since stopped listing it as waiting.
    wasRegistered: (seat: number) => `Your shot at Player ${seat} was registered.`,
    wasRegisteredNoTarget: 'Your shot was registered.',
    wasRegisteredDetail: 'It is no longer waiting to be resolved. This is not a result.',
    rejected: {
      PHASE_CLOSED: 'Not registered. It reached the server after the turn had ended.',
      NOT_ALLOWED: 'Not registered. The server did not allow this shot.',
    },
    notRegistered: {
      UNAUTHENTICATED: 'Not registered. This device is not signed in to the match.',
      FORBIDDEN: 'Not registered. This device may not act for this seat.',
      INVALID_REQUEST: 'Not registered. The server could not read the request.',
      UNSUPPORTED_PROTOCOL: 'Not registered. This app is out of date. Reload to update.',
      COMMAND_ID_CONFLICT: 'Not registered. The server refused the request.',
      NOT_SENT: 'Not registered. The request could not be sent.',
      PHASE_OVER: 'Not registered. The turn ended before the server received your shot.',
    },
    tryAgainHint: 'You can choose again if it is still your turn.',
    choiceDropped: 'Your choice was not sent.',
    unknown: 'Result unknown. The app could not confirm whether your shot was registered.',
    unknownDetail: 'Do not assume either way. You can check again at any time.',
    unknownAfterReload: 'This page was reloaded before the server answered, so it cannot send the shot again. Do not assume either way.',
    unknownPhaseOver: 'That turn has ended, so nothing more can be registered for it. Do not assume either way.',
    checkAgain: 'Check again',
    stopChecking: 'Stop checking',
    done: 'Done',
    ok: 'OK',
  },

  // Interface wording for the connected prototype's one action card, provisional until the
  // copy is reviewed. "Registered" and "accepted" are never outcomes. Two statements are
  // about the game: a move takes effect when the server accepts it, as the engine does it,
  // and registered shots are resolved at the end of the round (end_of_round_order).
  action: {
    title: 'Your action',
    kind: { move: 'Move', shot: 'Shot' },
    status: {
      idle: 'Nothing in progress',
      choosing: 'Choosing',
      confirming: 'Not sent yet',
      submitting: 'Submitting',
      checking: 'Checking',
      unknown: 'Result unknown',
      accepted: 'Accepted',
      'not-accepted': 'Not accepted',
    },
    offer: {
      available: 'Available',
      paused: 'Paused',
      unavailable: 'Not available',
      noTarget: 'No one you can target right now',
    },
    open: { move: 'Choose where to move', shot: 'Choose a target' },
    queued: (count: number) => (count === 1
      ? 'One action of yours is registered and waiting to be resolved.'
      : `${count} actions of yours are registered and waiting to be resolved.`),
    choosePrompt: { move: 'Where do you move?', shot: 'Choose a target' },
    chooseNote: 'These are the choices the server offers you now.',
    cancel: 'Cancel',
    chooseAgain: 'Choose again',
    confirmMove: (destination: Destination) => `Move to ${destination}?`,
    confirmShot: (seat: number) => `Register a shot at Player ${seat}?`,
    consequence: {
      move: 'A move takes effect as soon as the server accepts it.',
      shot: 'You cannot change or withdraw it here once it is registered.',
    },
    confirm: { move: 'Move', shot: 'Register shot' },
    submitting: { move: 'Sending your move to the server…', shot: 'Sending your shot to the server…', unknownKind: 'Sending your action to the server…' },
    checking: 'Checking what the server did with your action…',
    checkingAfterReload: 'This page was reloaded before the server answered. Checking what became of your action…',
    moved: (destination: Destination) => `Moved to ${destination}.`,
    shotRegistered: (seat: number) => `Shot at Player ${seat} registered.`,
    shotRegisteredDetail: 'This is not a result. Registered shots are resolved at the end of the round.',
    acceptedAfterReload: 'The server accepted your action.',
    acceptedAfterReloadDetail: 'This page was reloaded, so it no longer knows what the action was. This is not a result.',
    rejected: {
      PHASE_CLOSED: 'Not accepted. It reached the server after that phase had ended.',
      NOT_ALLOWED: 'Not accepted. The server did not allow it.',
    } satisfies Record<ShotRejectionCode, string>,
    notAccepted: {
      UNAUTHENTICATED: 'Not accepted. This device is not signed in to the match.',
      FORBIDDEN: 'Not accepted. This device may not act for this seat.',
      INVALID_REQUEST: 'Not accepted. The server could not read the request.',
      UNSUPPORTED_PROTOCOL: 'Not accepted. This app is out of date. Reload to update.',
      COMMAND_ID_CONFLICT: 'Not accepted. The server refused the request.',
      REQUEST_ID_CONFLICT: 'Not accepted. The server refused the request.',
      NOT_SENT: 'Not accepted. The request could not be sent.',
      PHASE_OVER: 'Not accepted. That phase ended before the server received it.',
    } satisfies Record<NotAcceptedReason, string>,
    tryAgainHint: 'You can choose again if the server still offers it.',
    choiceDropped: 'Your choice was not sent.',
    unknown: 'Result unknown. The app could not confirm what the server did with your action.',
    unknownDetail: 'Do not assume either way. You can check again at any time.',
    unknownAfterReload: 'This page was reloaded before the server answered, so it cannot send the action again. Do not assume either way.',
    unknownPhaseOver: 'That phase has ended, so nothing more can be accepted for it. Do not assume either way.',
    checkAgain: 'Check again',
    stopChecking: 'Stop checking',
    done: 'Done',
    ok: 'OK',
  },

  roster: {
    playerHeading: 'All players',
    boardHeading: 'Board',
    tableHeading: 'Players',
    caption: 'Public status of every player',
    column: { player: 'Player', location: 'Location', health: 'Health', status: 'Status' },
    noStatus: 'None',
  },

  settings: {
    heading: 'Display settings',
    reduceMotion: 'Reduce motion',
    followsDeviceOn: 'On because this device asks for reduced motion.',
    followsDeviceOff: 'Follows this device’s setting.',
    chosen: 'Set on this device for this session.',
  },

  details: {
    summary: 'Match details',
    match: 'Match',
    source: 'Data source',
    protocol: 'Protocol',
    ruleset: 'Ruleset',
    rulesetHash: 'Ruleset hash',
    engine: 'Engine',
    assets: 'Assets',
    sourceName: (mode: DataSourceMode): string =>
      mode === 'fixture' ? 'Fixture (synthetic)' : mode === 'emulator' ? 'Local emulator' : 'Live server',
  },

  announce: {
    connected: (summary: string) => `Connected. ${summary}`,
    reconnected: (summary: string) => `Reconnected. ${summary}`,
    readableAgain: (summary: string) => `Up to date again. ${summary}`,
    connectionLost: 'Connection lost. Showing the last known state.',
    unreadable: 'The latest update could not be read.',
    timeUp: 'Time is up. Waiting for phase update.',
    finalSeconds: (seconds: number) => (seconds === 1 ? '1 second left.' : `${seconds} seconds left.`),
    health: (seat: number, health: HealthState) => `Player ${seat} is now ${health}.`,
    jailed: (seat: number) => `Player ${seat} is now jailed.`,
    released: (seat: number) => `Player ${seat} is no longer jailed.`,
    location: (seat: number, location: LocationName) => `Player ${seat} is now in ${location}.`,
    captain: (seat: number) => `Player ${seat} is now Captain.`,
    captainEnded: (seat: number) => `Player ${seat} is no longer Captain.`,
    manyChanges: 'Several players changed status. Review the player list.',
  },
} as const;

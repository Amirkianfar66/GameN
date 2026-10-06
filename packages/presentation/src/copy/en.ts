import type {
  ActionKind, DataSourceMode, Destination, FactionName, HealthState, LocationName, NotAcceptedReason, PhaseFacts, ReleaseVoteKind, SeatBallotKind,
  ShotRejectionCode, TargetActionKind,
} from '../model/types.js';

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
    pausedUnsynced: 'Actions are paused until this device has the server’s time.',
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
    // The names of the actions, as the approved rules name them. "Protection" is the
    // Undercover's grant; "Disable" is a Disabler's attack; "Hack" is the standard Hack.
    kind: {
      move: 'Move', shot: 'Shot', disable: 'Disable', protect: 'Protection', rescue: 'Rescue', hack: 'Hack', 'showdown-shot': 'Showdown shot',
      vote: 'Vote', 'release-choice': 'Release request', 'release-vote': 'Release vote',
    } satisfies Record<ActionKind, string>,
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
    open: {
      move: 'Choose where to move', shot: 'Choose a target', disable: 'Choose a target', protect: 'Choose a player', rescue: 'Choose a player',
      hack: 'Choose a player', 'showdown-shot': 'Choose a target',
      vote: 'Cast your ballot', 'release-choice': 'Choose', 'release-vote': 'Cast your ballot',
    } satisfies Record<ActionKind, string>,
    queued: (count: number) => (count === 1
      ? 'One action of yours is registered and waiting to be resolved.'
      : `${count} actions of yours are registered and waiting to be resolved.`),
    choosePrompt: {
      move: 'Where do you move?', shot: 'Choose a target', disable: 'Choose a target', protect: 'Who is the Protection for?', rescue: 'Who is the Rescue for?',
      hack: 'Who do you request a Hack with?', 'showdown-shot': 'Choose a target',
      'release-choice': 'Ask for a release vote for which jailed player?',
      // A vote's question depends on what is being voted on, which the server's phase and ballot say: see "ballot" below.
    } satisfies Record<Exclude<ActionKind, 'vote' | ReleaseVoteKind>, string>,
    chooseNote: 'These are the choices the server offers you now.',
    cancel: 'Cancel',
    chooseAgain: 'Choose again',
    /** How a chosen seat is named in a sentence: by its public number, or as the player's own. */
    who: (seat: number, isSelf: boolean) => (isSelf ? 'yourself' : `Player ${seat}`),
    confirmMove: (destination: Destination) => `Move to ${destination}?`,
    confirmTarget: {
      shot: who => `Register a shot at ${who}?`,
      disable: who => `Register a Disable at ${who}?`,
      protect: who => `Register Protection for ${who}?`,
      rescue: who => `Register a Rescue of ${who}?`,
      hack: who => `Request a Hack with ${who}?`,
      'showdown-shot': who => `Register a showdown shot at ${who}?`,
    } satisfies Record<TargetActionKind, (who: string) => string>,
    // About this screen, not about the game: there is no control here that takes a command back.
    consequence: {
      move: 'You cannot change or withdraw it here once the server accepts it.',
      shot: 'You cannot change or withdraw it here once it is registered.',
      disable: 'You cannot change or withdraw it here once it is registered.',
      protect: 'You cannot change or withdraw it here once it is registered.',
      rescue: 'You cannot change or withdraw it here once it is registered.',
      hack: 'You cannot change or withdraw it here once the server accepts it.',
      'showdown-shot': 'You cannot change or withdraw it here once it is registered.',
      // One final ballot for each player in each vote (V1-10).
      vote: 'This is your one ballot in this vote. You cannot change it once the server accepts it.',
      'release-vote': 'This is your one ballot in this vote. You cannot change it once the server accepts it.',
      // The Captain has one release request in a match, and a request that fails is still used up (V1-11).
      'release-choice': 'The Captain has one release request in a match. This uses it, whatever the vote decides. You cannot change it once the server accepts it.',
    } satisfies Record<ActionKind, string>,
    confirm: {
      move: 'Move', shot: 'Register shot', disable: 'Register Disable', protect: 'Register Protection', rescue: 'Register Rescue', hack: 'Request Hack',
      'showdown-shot': 'Register shot', vote: 'Cast ballot', 'release-choice': 'Confirm choice', 'release-vote': 'Cast ballot',
    } satisfies Record<ActionKind, string>,
    submitting: {
      move: 'Sending your move to the server…', shot: 'Sending your shot to the server…', disable: 'Sending your Disable to the server…',
      protect: 'Sending your Protection to the server…', rescue: 'Sending your Rescue to the server…', hack: 'Sending your Hack request to the server…',
      'showdown-shot': 'Sending your shot to the server…', vote: 'Sending your ballot to the server…',
      'release-choice': 'Sending your choice to the server…', 'release-vote': 'Sending your ballot to the server…',
      unknownKind: 'Sending your action to the server…',
    } satisfies Record<ActionKind | 'unknownKind', string>,
    checking: 'Checking what the server did with your action…',
    checkingAfterReload: 'This page was reloaded before the server answered. Checking what became of your action…',
    // The receipt says the server accepted the command. Where the player is, is what the view says.
    moved: (destination: Destination) => `Move to ${destination} accepted.`,
    movedDetail: 'Where you are is shown under “Your location”, as the server has it.',
    // What the server accepted, in the words of its receipt. Never what came of it.
    acceptedTarget: {
      shot: who => `Shot at ${who} registered.`,
      disable: who => `Disable at ${who} registered.`,
      protect: who => `Protection for ${who} registered.`,
      rescue: who => `Rescue of ${who} registered.`,
      hack: who => `Hack request with ${who} accepted.`,
      'showdown-shot': who => `Showdown shot at ${who} registered.`,
    } satisfies Record<TargetActionKind, (who: string) => string>,
    // Registered actions are resolved at the end of the round (the approved resolution
    // order, V1-07). A showdown is not a round, and a Hack request is not a registration:
    // what follows either is shown by the phase the server reports.
    acceptedDetail: {
      shot: 'This is not a result. Registered shots are resolved at the end of the round.',
      disable: 'This is not a result. Registered actions are resolved at the end of the round.',
      protect: 'This is not a result. Registered actions are resolved at the end of the round.',
      rescue: 'This is not a result. Registered actions are resolved at the end of the round.',
      hack: 'The phase shown at the top of this screen says what happens next.',
      'showdown-shot': 'This is not a result.',
    } satisfies Record<TargetActionKind, string>,
    /** Shown to the two players of a Hack while the server says they are in one. */
    hackWith: (seat: number) => `Hack: you and Player ${seat}.`,
    // Ballots. The server has one command for a vote in a Captain election and in a Jail
    // vote; which it is, is the phase the server reports. Three statements are about the
    // game and are taken from the approved rules: a player has one final ballot in a vote
    // and the count is published when the vote closes (V1-09, V1-10), and the Captain's one
    // release request is used up by asking, not by declining (V1-11).
    ballot: {
      votePrompt: { CAPTAIN_ELECTION: 'Who do you vote for as Captain?', JAIL_VOTE: 'Who do you vote to send to Jail?', other: 'Who do you vote for?' },
      releaseVotePrompt: (who: string | null) => (who === null ? 'Release the jailed player this vote is on?' : `Release ${who} from Jail?`),
      abstain: 'Abstain',
      noRequest: 'No release request',
      yes: 'Yes, release',
      no: 'No, do not release',
      confirmVote: {
        CAPTAIN_ELECTION: (who: string) => `Vote for ${who} as Captain?`,
        JAIL_VOTE: (who: string) => `Vote to send ${who} to Jail?`,
        other: (who: string) => `Vote for ${who}?`,
      },
      confirmAbstain: 'Abstain from this vote?',
      confirmRelease: (who: string) => `Ask for a vote on releasing ${who} from Jail?`,
      confirmNoRequest: 'Make no release request now?',
      confirmReleaseVote: {
        yes: (who: string | null) => (who === null ? 'Vote yes to the release?' : `Vote yes to releasing ${who}?`),
        no: (who: string | null) => (who === null ? 'Vote no to the release?' : `Vote no to releasing ${who}?`),
      },
      consequenceNoRequest: 'The release request stays unused. You cannot change this choice once the server accepts it.',
      // What the server accepted. A ballot is not a result: the count is.
      votedFor: (who: string) => `Your vote for ${who} is recorded.`,
      abstained: 'Your abstention is recorded.',
      releaseRequested: (who: string) => `Release vote for ${who} requested.`,
      noRequestMade: 'Your choice is recorded: no release request.',
      releaseVoted: { yes: 'Your vote is recorded: yes.', no: 'Your vote is recorded: no.' },
      acceptedDetail: {
        vote: 'This is not a result. The count is shown to everyone when the vote closes.',
        'release-choice': 'The phase shown at the top of this screen says what happens next.',
        'release-vote': 'This is not a result. The count is shown to everyone when the vote closes.',
      } satisfies Record<SeatBallotKind | ReleaseVoteKind, string>,
      /** The player's own ballot in the open vote, as the server's view states it. Private to that player. */
      own: {
        seat: (who: string) => `Your ballot in this vote: ${who}.`,
        abstained: 'Your ballot in this vote: an abstention.',
        yes: 'Your ballot in this vote: yes.',
        no: 'Your ballot in this vote: no.',
      },
    },
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
      NOT_RECORDED: 'Not sent. This browser would not keep the identifiers the app needs to ask about an action after a reload.',
      PHASE_OVER: 'Not accepted. That phase ended before the server received it.',
    } satisfies Record<NotAcceptedReason, string>,
    tryAgainHint: 'You can choose again if the server still offers it.',
    choiceDropped: 'Your choice was not sent.',
    unknown: 'Result unknown. The app could not confirm what the server did with your action.',
    unknownDetail: 'Do not assume either way. You can check again at any time.',
    unknownAfterReload: 'This page was reloaded before the server answered, so it cannot send the action again. Do not assume either way.',
    unknownPhaseOver: 'That phase has ended, so nothing more can be accepted for it. Do not assume either way. You can check again at any time.',
    checkAgain: 'Check again',
    done: 'Done',
    ok: 'OK',
  },

  // What every audience may know about a vote: what is being voted on, who may be voted
  // for, and the count the server publishes when a vote closes. The four result sentences
  // say what the server's tally names; the counting is the server's.
  vote: {
    heading: 'Voting',
    voters: (count: number) => (count === 1 ? '1 player may vote.' : `${count} players may vote.`),
    candidates: (names: string) => `Candidates: ${names}.`,
    noCandidates: 'There are no candidates.',
    jailTargets: (names: string) => `Can be voted into Jail: ${names}.`,
    noJailTargets: 'Nobody can be voted into Jail.',
    releaseChooser: (seat: number) => `Player ${seat} may ask for a vote on releasing one jailed player.`,
    releaseCandidates: (names: string) => `Jailed: ${names}.`,
    releaseSubject: (seat: number) => `The vote is on releasing Player ${seat} from Jail.`,
    tally: {
      heading: 'Last vote counted',
      votes: (count: number) => (count === 1 ? '1 vote' : `${count} votes`),
      voters: (count: number) => (count === 1 ? '1 player could vote.' : `${count} players could vote.`),
      votedForNobody: (count: number) => `Abstained or did not vote: ${count}.`,
      elected: (seat: number) => `Elected Captain: Player ${seat}.`,
      nobodyElected: 'Nobody was elected.',
      jailed: (seat: number) => `Sent to Jail: Player ${seat}.`,
      nobodyJailed: 'Nobody was sent to Jail.',
      releaseSubject: (seat: number) => `The vote was on releasing Player ${seat}.`,
      yes: (yes: number, voters: number) => `Yes: ${yes} of ${voters}.`,
      released: (seat: number) => `Player ${seat} was released.`,
      notReleased: (seat: number) => `Player ${seat} was not released.`,
    },
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
    tally: (title: string, result: string) => `${title} counted. ${result}`,
  },
} as const;

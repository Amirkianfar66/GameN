import type { DataSourceMode, HealthState, LocationName } from '../model/types.js';

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
    shot: { title: 'Shot', available: 'Available', unavailable: 'Not available' },
  },

  roster: {
    playerHeading: 'All players',
    boardHeading: 'Board',
    tableHeading: 'Players',
    caption: 'Public status of all nine players',
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

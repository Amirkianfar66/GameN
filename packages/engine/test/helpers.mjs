// Test-only authoritative fixture. No runtime export or fixture seeding endpoint.
export const fixtureProvenance = Object.freeze({
  baseCommit: '333c9e820f362a211352bc689372663f29b73ac4',
  sourceManifestSha256: '34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc',
  fixtureOnly: true,
  assumptions: [
    'Nine canonical roles, two controlled identities, seven scripted seats, optional powers off.',
    'Fixed locations and recorded remaining turn order; no movement handler or competing effects.',
    'One completed no-jail vote is supplied explicitly to internal resolution after all turns.',
    'Stop after the attack/defense stage; no Hospital relocation, reveals, Rescue or victory.',
    'Non-Officer role knowledge is omitted and self-shooting is outside this fixture.',
  ],
});

export const seatIds = Object.freeze(Array.from({ length: 9 }, (_, index) => `seat-${index + 1}`));
const roles = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
export const fixtureStart = 1_800_000_000_000;

export function makeState(variant = 'unprotected') {
  if (!['protected', 'unprotected'].includes(variant)) throw new Error('Unknown fixture variant');
  return {
    versions: {
      protocolVersion: 1,
      rulesetVersion: 'fixture-source-2026-09-26',
      rulesetHash: fixtureProvenance.sourceManifestSha256,
      engineVersion: '0.1.0-officer-slice',
      assetManifestVersion: '0.0.0-no-assets',
    },
    // Paired fixtures differ only in server-only Protection; IDs reveal no variant.
    matchId: 'fixture-match-a',
    round: 2,
    seats: seatIds.map((seatId, index) => ({
      seatId, role: roles[index], shotAvailable: index === 0,
      location: index === 4 ? 'Command Room' : index >= 6 ? 'Room B' : 'Room A',
      health: 'Healthy', jailed: false, captain: index === 4,
      protection: variant === 'protected' && index === 1
        ? { activeFromRound: 2, consumed: false, lifetimeReceipts: 1 } : null,
    })),
    phase: { id: 'phase-a', kind: 'ORDINARY_TURN', startedAt: fixtureStart, endsAt: fixtureStart + 60_000 },
    activeSeatId: 'seat-1',
    remainingTurnSeatIds: seatIds.slice(1),
    deadlineToken: 'deadline-a',
    turnsComplete: false,
    attacks: [],
    resolved: false,
    journalSequence: 0,
    revisions: { public: 10, players: Object.fromEntries(seatIds.map((seatId, index) => [seatId, 20 + index * 10])) },
  };
}

export function makeRequest(state, overrides = {}) {
  return {
    protocolVersion: 1, matchId: state.matchId, phaseId: state.phase.id,
    commandId: 'command-a', command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' },
    ...overrides,
  };
}

export function context(overrides = {}) {
  return { actorSeatId: 'seat-1', evaluatedAt: fixtureStart + 1, recordedRandomFacts: [], ...overrides };
}

export function finishTurns(state, advanceDeadline, delay = 0) {
  let current = state;
  for (let index = 0; !current.turnsComplete; index += 1) {
    current = advanceDeadline(current, {
      phaseId: current.phase.id, deadlineToken: current.deadlineToken,
      now: current.phase.endsAt + delay,
      nextPhaseId: `phase-${index + 2}`, nextDeadlineToken: `deadline-${index + 2}`,
    }).state;
  }
  return current;
}

// TEST ONLY. Import this subpath deliberately in a test/dev harness.
// Never serve this whole object or include it in a production client bundle.
import type { PlayerPresentationEvent, PlayerView, PublicView, Receipt, RegisterShot } from './index.js';

export const fixtureProvenance = {
  fixtureOnly: true,
  baseCommit: '0a4ff9a772eda25ea27922a331ff406a3ffc9000',
  sourceManifest: 'rules/source-manifest.json',
  sourceManifestSha256: '34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc',
  sourceReferences: [
    'rules/overlays/player-modes-officer.json#/officer',
    'rules/overlays/direct-shot-decision.json#/current',
    'rules/sources/v2.1-decisions.json#/protection',
    'rules/overlays/consolidated-decisions-2026-09-26.json#/undercover_protection',
    'rules/overlays/consolidated-decisions-2026-09-26.json#/end_of_round_order',
    'docs/backend/first-slice.md#scenario-and-boundaries',
  ],
} as const;

const roles = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'] as const;
const seats = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7', 'seat-8', 'seat-9'] as const;
const initialPublic: PublicView = {
  versions: {
    protocolVersion: 1,
    rulesetVersion: 'fixture-source-2026-09-26',
    rulesetHash: fixtureProvenance.sourceManifestSha256,
    engineVersion: '0.0.0-bootstrap-no-engine',
    assetManifestVersion: '0.0.0-no-assets',
  },
  matchId: 'fixture-match-a',
  audience: { kind: 'public' },
  viewRevision: 10,
  playerCount: 9,
  round: 2,
  // Shared IDs never encode the active player's hidden role.
  phase: { id: 'phase-a', kind: 'ORDINARY_TURN', startedAt: 1_800_000_000_000, endsAt: 1_800_000_060_000 },
  activeSeatId: 'seat-1',
  seats: seats.map((seatId, i) => ({
    seatId, location: i === 4 ? 'Command Room' : i >= 6 ? 'Room B' : 'Room A',
    health: 'Healthy', jailed: false, captain: i === 4,
  })),
};
const officerBefore: PlayerView = {
  ...initialPublic,
  audience: { kind: 'player', seatId: 'seat-1' },
  viewRevision: 20,
  self: { seatId: 'seat-1', role: 'Officer', shotAvailable: true },
  ownPendingCommandIds: [],
};
const targetBefore: PlayerView = {
  ...initialPublic,
  audience: { kind: 'player', seatId: 'seat-2' },
  viewRevision: 30,
  self: { seatId: 'seat-2', role: 'Insider', shotAvailable: false },
  ownPendingCommandIds: [],
};
const command: RegisterShot = {
  protocolVersion: 1, matchId: initialPublic.matchId, phaseId: initialPublic.phase.id,
  commandId: 'fixture-command-1', command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' },
};
const acceptedReceipt: Receipt = {
  protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId,
  status: 'accepted', code: 'REGISTERED',
};
const officerAfter: PlayerView = {
  ...officerBefore, viewRevision: 21,
  self: { ...officerBefore.self, shotAvailable: false }, ownPendingCommandIds: [command.commandId],
};
const registrationEvent: PlayerPresentationEvent = {
  protocolVersion: 1, matchId: initialPublic.matchId, eventId: 'player-event-a',
  audience: { kind: 'player', seatId: 'seat-1' }, viewRevision: officerAfter.viewRevision,
  fact: { type: 'COMMAND_REGISTERED', commandId: command.commandId },
};

// Every fixture field is JSON data; keep each caller's synthetic copies independent.
function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Authored examples of expected wire states, NOT the result of an engine transition.
export function createOfficerFixture(variant: 'protected' | 'unprotected') {
  return cloneFixture({
    fixtureOnly: true as const,
    variant,
    provenance: fixtureProvenance,
    assumptions: [
      'Fixed synthetic seat/room assignment and one Captain supplied by the harness; no initial-deal or routing rule.',
      'Two controlled identities (Officer/target); seven scripted seats; optional powers off.',
      'Single attack and fixed locations; harness later supplies a completed Jail vote with nobody jailed.',
      'No competing effects, movement, Code, Rescue, victory or disconnect-policy adjudication.',
      'Defense/result recipients unresolved under RULE-003; no block cue or Protection facts in audience payloads.',
      'Non-Officer private knowledge is omitted; these are partial first-slice views, not complete role implementations.',
    ],
    serverOnly: {
      seats: seats.map((seatId, i) => ({ seatId, role: roles[i]! })),
      optionalPowers: false as const,
      officerOrdinaryShotsRemaining: 1 as const,
      protection: variant === 'protected' ? {
        grantedBy: 'seat-6' as const, recipient: 'seat-2' as const,
        grantedInRound: 1 as const, activeFromRound: 2 as const, lifetimeReceipts: 1 as const,
      } : null,
      // Expected future engine evidence; bootstrap tests do not execute or prove this.
      resolutionExpectation: { targetHealth: variant === 'protected' ? 'Healthy' : 'Injured', officerOrdinaryShotsRemaining: 0 },
    },
    command,
    acceptedReceipt,
    before: { public: initialPublic, officer: officerBefore, target: targetBefore },
    afterRegistration: {
      public: initialPublic, officer: officerAfter, target: targetBefore,
      publicEvents: [], targetEvents: [], officerEvents: [registrationEvent],
    },
  });
}

// Synthetic wire protocol 2 views and the inputs a connected phone is drawn from. Test-only.
// Every view is hand-built and checked against the shared strict schema where it is made;
// none is the result of an engine.
import { FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';
import { buildConnectedPlayerShellModel, renderConnectedPlayerShell } from '@mothership/presentation';

export const EPOCH = 1_900_000_000_000;
export const facts = (playerCount = 7) => ({
  versions: { protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: 'a'.repeat(64), engineVersion: 'full-game-1.0.0', assetManifestVersion: '0.0.0-no-assets' },
  matchId: 'connected-test-match', viewRevision: 4, playerCount, round: 1,
  phase: { id: 'phase-one', kind: 'ORDINARY_TURN', startedAt: EPOCH, endsAt: EPOCH + 60_000 }, activeSeatId: 'seat-1',
  seats: Array.from({ length: playerCount }, (unused, index) => ({ seatId: `seat-${index + 1}`, health: 'Healthy', location: index % 2 === 0 ? 'Room A' : 'Room B', jailed: false, captain: false, revealedFaction: null })),
  ballot: { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null }, lastTally: null, result: null, endReveal: null,
});
export const publicView = (change = () => {}, playerCount = 7) => {
  const view = { ...facts(playerCount), audience: { kind: 'public' } };
  change(view);
  return FullPublicViewSchema.parse(view);
};
/** Seat 1's own view. The role is one with no role-specific knowledge, so the view is valid without inventing any. */
export const playerView = (change = () => {}) => {
  const view = {
    ...facts(), audience: { kind: 'player', seatId: 'seat-1' },
    self: { seatId: 'seat-1', role: 'Cracker', movementDestinations: ['Room B'], releaseVoteAvailable: false, ordinaryWeapons: 0, shotAvailable: false, rescuesRemaining: 1, disablerAvailable: false, hackAvailable: false, scanAvailable: false, codeAttemptAvailable: false },
    knowledge: { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] },
    legalTargets: {}, ownPendingCommandIds: [], ownBallot: null, hasVoted: false, hackPartnerSeatId: null,
  };
  change(view);
  return FullPlayerViewSchema.parse(view);
};
export const environment = { mode: 'emulator', connection: 'live', problem: null, deadline: { kind: 'running', remainingMs: 42_000 }, motion: { reducedMotion: false, followsDevice: true } };
export const IDLE = { step: 'idle' };
export const input = (view, action = IDLE, overrides = {}) => ({ ...environment, view, privacy: { concealed: false, revealed: true }, action, ...overrides });
export const closed = { privacy: { concealed: false, revealed: false } };
export const model = (...args) => buildConnectedPlayerShellModel(input(...args));
export const card = (...args) => model(...args).match.privateArea.content.actions.card;
export const markup = (...args) => renderConnectedPlayerShell(model(...args));

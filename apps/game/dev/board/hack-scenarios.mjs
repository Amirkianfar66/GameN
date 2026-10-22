// mothership:dev-only — schema-checked authored snapshots, not an engine or game clock.
globalThis[Symbol.for('mothership:dev-only')] = true;
import { DECLARED_HACK_VERSION_PINS, FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';
export function declaredHackView(base, { stage, startedAt, side = 'Blue', publicOnly = false }) {
  const view = structuredClone(base), self = view.self?.seatId;
  view.versions = { ...DECLARED_HACK_VERSION_PINS, assetManifestVersion: '0.0.0-no-assets' };
  view.voteResult = null;
  view.activeSeatId = 'seat-1';
  view.phase = { id: stage === 'HACK_DECLARE' ? 'fixture-declare' : `fixture-${stage}`, kind: stage, startedAt, endsAt: startedAt + (stage === 'HACK_DECLARE' ? 15000 : stage === 'HACK_RESULT' ? 5000 : 60000) };
  if (!publicOnly) {
    view.hackPartnerSeatId = self === 'seat-1' ? 'seat-3' : 'seat-1';
    view.legalTargets = stage === 'HACK_DECLARE' && self === 'seat-3' ? { DECLARE_HACK_SIDE: [self] } : {};
    view.self.codeAttemptAvailable = false;
    view.hackFeedback = { hackId: 'fixture-declare', phaseId: view.phase.id, round: view.round, status: stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : side === null ? 'NO_DECLARATION' : 'DECLARED', declaredSide: stage === 'HACK_DECLARE' ? null : side };
  }
  return (publicOnly ? FullPublicViewSchema : FullPlayerViewSchema).parse(view);
}

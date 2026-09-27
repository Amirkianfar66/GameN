import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerPresentationEventSchema, PublicPresentationEventSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { proposedDesignTokens } from '@mothership/design-tokens';

test('private registration event cannot be converted into public activity', () => {
  const event = createOfficerFixture('protected').afterRegistration.officerEvents[0];
  assert.ok(PlayerPresentationEventSchema.safeParse(event).success);
  assert.equal(PublicPresentationEventSchema.safeParse(event).success, false);
  assert.equal(PublicPresentationEventSchema.safeParse({ ...event, audience: { kind: 'public' } }).success, false);
});

test('public event vocabulary permits health facts but rejects attack causes and private sequences', () => {
  const event = { protocolVersion: 1, matchId: 'fixture-match-a', audience: { kind: 'public' }, eventId: 'display-event-a', viewRevision: 11, fact: { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-2', health: 'Injured' } };
  assert.ok(PublicPresentationEventSchema.safeParse(event).success);
  for (const extra of [{ shooterSeatId: 'seat-1' }, { protection: true }, { cause: 'SHOT' }]) {
    assert.equal(PublicPresentationEventSchema.safeParse({ ...event, fact: { ...event.fact, ...extra } }).success, false);
  }
  for (const type of ['SHOT_RESOLVED', 'BLOCKED', 'PROTECTION_CONSUMED']) {
    assert.equal(PublicPresentationEventSchema.safeParse({ ...event, fact: { type, seatId: 'seat-2' } }).success, false);
  }
  assert.equal(PublicPresentationEventSchema.safeParse({ ...event, internalSequence: 99 }).success, false);
});

test('published token proposal retains comic direction and reduced-motion limits', () => {
  assert.equal(proposedDesignTokens.status, 'proposal_for_evaluation');
  assert.equal(proposedDesignTokens.motionMs.reducedMotionFade, 80);
  assert.equal(proposedDesignTokens.motionPolicy.publicSecretActionCue, false);
  assert.equal(proposedDesignTokens.motionPolicy.blocksActiveControls, false);
  assert.equal(proposedDesignTokens.motionPolicy.mutatesGameplayState, false);
});

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOSPITAL_FOUR_VERSION_PINS as PINS, CLONE_VERSION_PINS as OLD,
  supportsHospitalFour, HOSPITAL_FOUR_LAYOUT_REVISION, HOSPITAL_FOUR_ASSET_MANIFEST_VERSION,
  blackoutSlotIds, BoardSlotIdSchema, HospitalOverflowFactSchema,
  FullVersionsSchema, FullPublicViewSchema, FullPlayerViewSchema,
  FullOutcomeFactSchema, FullOutcomeEventSchema, FullOutcomePublicEventSchema,
  FullOutcomePlayerEventSchema, FullEventSchema, ClinicalPresentationAnchorSchema,
  validClinicalAnchorForPlayerCount, fullRoomCapacityForVersions,
} from '@mothership/contracts';

// Synthetic reader inputs only: no engine transition, real match, or hidden role data.
const CURRENT_ART = 'design-0.5.0';
const HISTORICAL_ART = 'design-0.4.0';
const CURRENT_LAYOUT = 'board-v2-four-0.1.0';
const HISTORICAL_LAYOUT = 'board-v2-0.1.1';
const copy = value => structuredClone(value);
const versions = (pins = PINS) => ({ ...pins, assetManifestVersion: pins === PINS ? CURRENT_ART : HISTORICAL_ART });
const episode = () => ({ admittedRound: 1, rescueDueAfterRound: 2, rescueOpportunity: 'CURRENT_NORMAL_ROUND' });

function publicView(count, { pins = PINS, hospital = 4, removed = false } = {}) {
  return {
    versions: versions(pins), matchId: `hospital-four-reader-${count}`, viewRevision: 10,
    playerCount: count, round: 2,
    phase: { id: 'ordinary-phase', kind: 'ORDINARY_TURN', startedAt: 1_000, endsAt: 61_000 },
    activeSeatId: `seat-${count}`,
    seats: Array.from({ length: count }, (_, index) => {
      const n = index + 1;
      if (removed && n === 5) return { seatId: `seat-${n}`, health: 'Eliminated', location: null,
        slotId: null, medical: null, jailed: false, captain: false, revealedFaction: null };
      return { seatId: `seat-${n}`, health: n <= hospital ? 'Injured' : 'Healthy',
        location: n <= hospital ? 'Hospital' : 'Room A', slotId: n <= hospital ? `H${n}` : `A${n - hospital}`,
        medical: n <= hospital ? episode() : null, jailed: false, captain: false, revealedFaction: null };
    }),
    ballot: { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null },
    lastTally: null, voteResult: null, hackSession: null, blackout: null, result: null, endReveal: null,
  };
}

function playerView(view) {
  const own = `seat-${view.playerCount}`;
  return {
    ...copy(view), audience: { kind: 'player', seatId: own },
    self: { seatId: own, role: 'Cracker', movementDestinations: [], releaseVoteAvailable: false,
      ordinaryWeapons: 0, shotAvailable: false, rescuesRemaining: 1, disablerAvailable: false,
      hackAvailable: false, scanAvailable: false, codeAttemptAvailable: false,
      cloneStatus: null, blackoutTargeting: null, captainCommandUses: null },
    knowledge: { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] },
    legalTargets: {}, ownPendingCommandIds: [], ownBallot: null, hasVoted: false,
    hackPartnerSeatId: null, hackFeedback: null,
  };
}

function blackoutView(view, layoutRevision) {
  return { ...copy(view), phase: { id: 'blackout-phase', kind: 'BLACKOUT', startedAt: 1_000, endsAt: 16_000 },
    activeSeatId: null, blackout: { snapshotId: 'blackout-phase', layoutRevision, darkStartsAt: 6_000 } };
}

function overflowEvent(audience = { kind: 'public' }) {
  return { protocolVersion: 2, versions: { ...PINS }, matchId: 'hospital-four-occurrence',
    eventId: 'public-overflow-occurrence', outcomeId: 'public-overflow-occurrence', viewRevision: 11,
    audience, publishedAt: 100_000, expiresAt: 130_000,
    fact: { type: 'HOSPITAL_OVERFLOW_REMOVED', phaseId: 'completed-resolution', round: 2, seatId: 'seat-5' } };
}

function clinicalEvent(count, pins = PINS) {
  const event = overflowEvent();
  event.versions = { ...pins };
  event.fact = { type: 'MEDICAL_OUTCOME', phaseId: 'completed-resolution', round: 2,
    kind: 'DEATH', seatId: 'seat-5', health: 'Eliminated',
    presentationAnchor: { kind: 'CLINICAL_VIGNETTE', batchId: 'clinical-batch', anchorId: 'HV5', slotCount: count } };
  return event;
}

function assertBothReaders(view, accepted, label) {
  const pub = { ...copy(view), audience: { kind: 'public' } };
  assert.equal(FullPublicViewSchema.safeParse(pub).success, accepted, `${label}: public reader`);
  assert.equal(FullPlayerViewSchema.safeParse(playerView(view)).success, accepted, `${label}: own reader`);
}

for (const count of [7, 8, 9]) {
  test(`${count}: four physical Hospital slots preserve the complete roster and retained offboard identity`, () => {
    const view = publicView(count);
    assertBothReaders(view, true, 'four occupied beds');
    assert.equal(view.seats.length, count);
    assert.deepEqual(view.seats.filter(seat => seat.location === 'Hospital').map(seat => seat.slotId), ['H1', 'H2', 'H3', 'H4']);
    assert.equal(fullRoomCapacityForVersions(PINS, 'Hospital', count), 4);
    assert.equal(fullRoomCapacityForVersions(OLD, 'Hospital', count), count);
    assert.deepEqual(blackoutSlotIds('Hospital', count, PINS), ['H1', 'H2', 'H3', 'H4']);
    const historicalSlots = Array.from({ length: count }, (_, index) => `H${index + 1}`);
    assert.deepEqual(blackoutSlotIds('Hospital', count, OLD), historicalSlots);
    assert.deepEqual(blackoutSlotIds('Hospital', count), historicalSlots, 'two-argument historical helper stays exact');
    assertBothReaders(publicView(count, { removed: true }), true, 'overflow subject remains in roster');
    const missing = publicView(count, { removed: true });
    missing.seats = missing.seats.filter(seat => seat.seatId !== 'seat-5');
    assertBothReaders(missing, false, 'overflow cannot erase a roster seat');
  });

  test(`${count}: successor readers refuse fifth beds, duplicate placement and fabricated offboard state`, () => {
    assertBothReaders(publicView(count, { hospital: 5 }), false, 'fifth physical Hospital bed');
    for (const slotId of ['H0', 'H5', 'H9', 'HV1', 'A1']) {
      const bad = publicView(count); bad.seats[0].slotId = slotId;
      assertBothReaders(bad, false, `invalid Hospital slot ${slotId}`);
    }
    const duplicate = publicView(count); duplicate.seats[1].slotId = 'H1';
    assertBothReaders(duplicate, false, 'two occupants in one bed');
    const fake = publicView(count, { removed: true }); fake.seats[4].health = 'Healthy';
    assertBothReaders(fake, false, 'Healthy is not an overflow removal');
    const erased = publicView(count, { removed: true }); erased.seats[4].slotId = 'H4';
    assertBothReaders(erased, false, 'offboard identity has no physical slot');
  });

  test(`${count}: historical readers retain roster-sized Hospital geometry and reject successor layout pairing`, () => {
    const historical = publicView(count, { pins: OLD, hospital: count });
    historical.activeSeatId = null;
    assertBothReaders(historical, true, 'historical roster-sized Hospital');
    const current = copy(historical); current.versions = versions();
    assertBothReaders(current, false, 'new tuple cannot import old full Hospital');
    assertBothReaders(blackoutView(historical, HISTORICAL_LAYOUT), true, 'historical Blackout layout');
    assertBothReaders(blackoutView(historical, CURRENT_LAYOUT), false, 'historical tuple with four-bed layout');
    assertBothReaders(blackoutView(publicView(count), CURRENT_LAYOUT), true, 'successor four-bed Blackout layout');
    assertBothReaders(blackoutView(publicView(count), HISTORICAL_LAYOUT), false, 'successor tuple with old Blackout layout');
  });

  test(`${count}: clinical anchors retain the roster namespace independently of four physical beds`, () => {
    const event = clinicalEvent(count);
    assert.equal(ClinicalPresentationAnchorSchema.safeParse(event.fact.presentationAnchor).success, true);
    assert.equal(validClinicalAnchorForPlayerCount(event.fact.presentationAnchor, count), true);
    assert.equal(FullEventSchema.safeParse(event).success, true, 'HV5 is clinical, not a fifth physical bed');
    const finalAnchor = { ...event.fact.presentationAnchor, anchorId: `HV${count}` };
    assert.equal(validClinicalAnchorForPlayerCount(finalAnchor, count), true);
    for (const patch of [{ slotCount: 4 }, { anchorId: 'H4' }, { anchorId: `HV${count + 1}` }, { bedId: 'H4' }]) {
      const bad = copy(event); Object.assign(bad.fact.presentationAnchor, patch);
      assert.equal(FullEventSchema.safeParse(bad).success, false, `invalid clinical geometry ${JSON.stringify(patch)}`);
    }
    const mismatchedCount = count === 7 ? 8 : 7;
    assert.equal(validClinicalAnchorForPlayerCount(event.fact.presentationAnchor, mismatchedCount), false);
  });

  test(`${count}: unanchored overflow does not make genuine clinical DEATH anchors optional`, () => {
    for (const pins of [PINS, OLD]) {
      const event = clinicalEvent(count, pins);
      assert.equal(FullEventSchema.safeParse(event).success, true, `${pins.engineVersion}: anchored clinical death`);
      delete event.fact.presentationAnchor;
      assert.equal(FullEventSchema.safeParse(event).success, false, `${pins.engineVersion}: missing clinical anchor`);
    }
  });
}

test('Hospital Four is an exact successor tuple with the new art pairing only', () => {
  assert.equal(PINS.engineVersion, 'full-game-1.11.0');
  assert.equal(PINS.rulesetVersion, 'in-person-v1-hospital-four-2026-10-19');
  assert.equal(PINS.rulesetHash, '7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c');
  assert.equal(HOSPITAL_FOUR_LAYOUT_REVISION, CURRENT_LAYOUT);
  assert.equal(HOSPITAL_FOUR_ASSET_MANIFEST_VERSION, CURRENT_ART);
  assert.equal(supportsHospitalFour(PINS), true);
  assert.equal(supportsHospitalFour(OLD), false);
  assert.equal(FullVersionsSchema.safeParse(versions()).success, true);
  assert.equal(FullVersionsSchema.safeParse(versions(OLD)).success, true);
  assert.equal(FullVersionsSchema.safeParse({ ...versions(OLD), assetManifestVersion: CURRENT_ART }).success, false);
  assert.equal(BoardSlotIdSchema.safeParse('H5').success, true, 'historical physical slot vocabulary is not narrowed globally');
  assert.equal(BoardSlotIdSchema.safeParse('HV5').success, false, 'clinical anchor is never a board slot');
  for (const patch of [{ engineVersion: OLD.engineVersion }, { rulesetVersion: OLD.rulesetVersion },
    { rulesetHash: OLD.rulesetHash }, { protocolVersion: 1 }, { assetManifestVersion: HISTORICAL_ART },
    { assetManifestVersion: 'design-0.5.1' }, { extra: 'unreviewed' }]) {
    assert.equal(FullVersionsSchema.safeParse({ ...versions(), ...patch }).success, false, JSON.stringify(patch));
  }
});

test('overflow occurrence is strict, source-free and public/player only on the exact successor', () => {
  const fact = overflowEvent().fact;
  assert.deepEqual(HospitalOverflowFactSchema.parse(fact), fact);
  assert.deepEqual(FullOutcomeFactSchema.parse(fact), fact);
  for (const audience of [{ kind: 'public' }, { kind: 'player', seatId: 'seat-1' }]) {
    const event = overflowEvent(audience);
    const audienceSchema = audience.kind === 'public' ? FullOutcomePublicEventSchema : FullOutcomePlayerEventSchema;
    assert.deepEqual(audienceSchema.parse(event), event);
    assert.deepEqual(FullOutcomeEventSchema.parse(event), event);
    assert.deepEqual(FullEventSchema.parse(event), event);
    for (const pins of [OLD, { ...PINS, rulesetHash: OLD.rulesetHash }]) {
      const old = { ...event, versions: pins };
      assert.equal(audienceSchema.safeParse(old).success, false, 'audience reader rejects historical/mixed overflow');
      assert.equal(FullOutcomeEventSchema.safeParse(old).success, false);
      assert.equal(FullEventSchema.safeParse(old).success, false);
    }
    for (const extra of [{ presentationAnchor: { kind: 'CLINICAL_VIGNETTE', batchId: 'b', anchorId: 'HV1', slotCount: 7 } },
      { slotId: 'H4' }, { location: null }, { cause: 'FULL_HOSPITAL' }, { actorSeatId: 'seat-2' },
      { attackerSeatId: 'seat-2' }, { healerSeatId: 'seat-2' }, { role: 'Cracker' }, { health: 'Eliminated' }]) {
      assert.equal(FullEventSchema.safeParse({ ...event, fact: { ...fact, ...extra } }).success, false, JSON.stringify(extra));
    }
    const noVersions = copy(event); delete noVersions.versions;
    assert.equal(FullEventSchema.safeParse(noVersions).success, false);
    assert.equal(FullEventSchema.safeParse({ ...event, audience: { kind: 'display' } }).success, false);
  }
});

test('overflow occurrence enforces stable identity, exact 30-second lifetime and safe timestamps', () => {
  const event = overflowEvent();
  for (const patch of [{ outcomeId: 'different-occurrence' }, { protocolVersion: 1 }, { viewRevision: -1 },
    { publishedAt: -1 }, { publishedAt: 100_000.5 }, { expiresAt: 129_999 }, { expiresAt: 130_001 },
    { expiresAt: Number.MAX_SAFE_INTEGER + 1 }, { unexpected: true }]) {
    const malformed = { ...event, ...patch };
    assert.equal(FullOutcomeEventSchema.safeParse(malformed).success, false, JSON.stringify(patch));
    assert.equal(FullEventSchema.safeParse(malformed).success, false, JSON.stringify(patch));
  }
  for (const patch of [{ phaseId: '' }, { round: 0 }, { round: 6 }, { round: 2.5 }, { seatId: 'seat-10' }]) {
    assert.equal(FullEventSchema.safeParse({ ...event, fact: { ...event.fact, ...patch } }).success, false, JSON.stringify(patch));
  }
});


test('physical placement and player-only impact events apply the four-bed bound only to the successor', () => {
  for (const type of ['BOARD_PLACEMENT_CHANGED', 'ATTACK_BLOCKED']) {
    const event = overflowEvent(type === 'ATTACK_BLOCKED' ? { kind: 'player', seatId: 'seat-5' } : { kind: 'public' });
    event.fact = { type, phaseId: 'completed-resolution', round: 2, seatId: 'seat-5', location: 'Hospital', slotId: 'H4' };
    assert.equal(FullEventSchema.safeParse(event).success, true, `${type}: last successor bed`);
    assert.equal(FullEventSchema.safeParse({ ...event, fact: { ...event.fact, slotId: 'H5' } }).success, false, `${type}: fifth successor bed`);
    assert.equal(FullEventSchema.safeParse({ ...event, versions: { ...OLD }, fact: { ...event.fact, slotId: 'H5' } }).success, true, `${type}: fifth historical bed`);
    if (type === 'ATTACK_BLOCKED') assert.equal(FullEventSchema.safeParse({ ...event, audience: { kind: 'public' } }).success, false, 'room-defense disclosure remains player-only');
    for (const slotId of ['HV4', 'A4', 'H0', 'H10']) {
      assert.equal(FullEventSchema.safeParse({ ...event, fact: { ...event.fact, slotId } }).success, false, `${type}: invalid physical impact ${slotId}`);
    }
  }
});

// The immutable executable tuple must identify the exact recorded owner rule bytes.
test('successor ruleset hash is the exact owner overlay, with preserved original ordering reply', () => {
  const bytes=readFileSync(new URL('../../rules/overlays/hospital-four-owner-decision-2026-10-19.json',import.meta.url));
  const rule=JSON.parse(bytes.toString());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),PINS.rulesetHash);
  assert.equal(rule.engine_version,PINS.engineVersion);
  assert.equal(rule.ruleset_version,PINS.rulesetVersion);
  assert.equal(rule.ordering_owner_reply.answer,'Free healed Hospital places first, then use existing seat order');
  assert.deepEqual(rule.ordering_owner_reply.question_item_id,['request_user_input_async','call_aa4dac80a0a8494882e1e5d35336cb8f',0]);
});

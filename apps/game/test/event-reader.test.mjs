import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { readPlayerEvent, readPublicEvent } from '@mothership/game';

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const registrationEvent = afterRegistration.officerEvents[0];
// Frontend-authored synthetic events. The contract fixture authors one event, the registration.
const publicEvent = fact => ({ protocolVersion: 1, matchId, eventId: 'display-event-a', audience: { kind: 'public' }, viewRevision: 11, fact });
const phaseChanged = publicEvent({ type: 'PHASE_CHANGED', phaseId: 'phase-b' });
const healthChanged = publicEvent({ type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-2', health: 'Injured' });
const moved = publicEvent({ type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' });
const unreadable = { kind: 'rejected', rejection: { kind: 'unreadable' } };

test('each audience reads the events of its own stream', () => {
  assert.deepEqual(readPlayerEvent(registrationEvent, matchId), { kind: 'accepted', event: registrationEvent });
  for (const event of [phaseChanged, healthChanged, moved]) {
    assert.deepEqual(readPublicEvent(event, matchId), { kind: 'accepted', event });
    const forSeat = { ...event, audience: { kind: 'player', seatId: 'seat-2' } };
    assert.deepEqual(readPlayerEvent(forSeat, matchId), { kind: 'accepted', event: forSeat });
  }
});

test('a player’s event cannot enter the public route, and a registration is not a public fact under any label', () => {
  assert.deepEqual(readPublicEvent(registrationEvent, matchId), unreadable);
  assert.deepEqual(readPublicEvent({ ...registrationEvent, audience: { kind: 'public' } }, matchId), unreadable);
  assert.deepEqual(readPublicEvent({ ...phaseChanged, audience: { kind: 'player', seatId: 'seat-2' } }, matchId), unreadable);
  // And the table's events are not a seat's.
  assert.deepEqual(readPlayerEvent(phaseChanged, matchId), unreadable);
});

test('a fact or field the contract does not list never enters client state', () => {
  for (const read of [readPublicEvent, readPlayerEvent]) {
    const base = read === readPublicEvent ? healthChanged : { ...healthChanged, audience: { kind: 'player', seatId: 'seat-1' } };
    assert.equal(read(base, matchId).kind, 'accepted');
    for (const extra of [{ shooterSeatId: 'seat-1' }, { cause: 'SHOT' }, { protection: true }, { blocked: true }]) {
      assert.deepEqual(read({ ...base, fact: { ...base.fact, ...extra } }, matchId), unreadable);
    }
    for (const type of ['SHOT_RESOLVED', 'BLOCKED', 'PROTECTION_CONSUMED', 'BANG']) {
      assert.deepEqual(read({ ...base, fact: { type, seatId: 'seat-2' } }, matchId), unreadable);
    }
    assert.deepEqual(read({ ...base, internalSequence: 99 }, matchId), unreadable);
    assert.deepEqual(read({ ...base, audience: { ...base.audience, role: 'Officer' } }, matchId), unreadable);
  }
});

test('another protocol version is recognized as incompatible rather than corrupt', () => {
  assert.deepEqual(readPlayerEvent({ ...registrationEvent, protocolVersion: 2 }, matchId), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 2 } });
  assert.deepEqual(readPublicEvent({ protocolVersion: 7 }, matchId), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 7 } });
  // Only a well-formed version number says anything about the protocol.
  for (const protocolVersion of ['2', 2.5, -1, null]) {
    assert.deepEqual(readPlayerEvent({ ...registrationEvent, protocolVersion }, matchId), unreadable);
  }
});

test('garbage is unreadable, never a crash and never an event', () => {
  for (const payload of [null, undefined, 0, 'event', [], [registrationEvent], {}, { fact: registrationEvent.fact }, JSON.stringify(registrationEvent)]) {
    assert.deepEqual(readPlayerEvent(payload, matchId), unreadable);
    assert.deepEqual(readPublicEvent(payload, matchId), unreadable);
  }
  const { eventId: _eventId, ...withoutId } = registrationEvent;
  assert.deepEqual(readPlayerEvent(withoutId, matchId), unreadable);
  assert.deepEqual(readPlayerEvent({ ...registrationEvent, viewRevision: -1 }, matchId), unreadable);
});

test('an event for another match is refused', () => {
  assert.deepEqual(readPlayerEvent(registrationEvent, 'another-match'), { kind: 'rejected', rejection: { kind: 'wrong-match' } });
  assert.deepEqual(readPublicEvent({ ...phaseChanged, matchId: 'another-match' }, matchId), { kind: 'rejected', rejection: { kind: 'wrong-match' } });
});

test('the caller’s payload object is not retained, so later mutation of it changes nothing', () => {
  const payload = structuredClone(registrationEvent);
  const outcome = readPlayerEvent(payload, matchId);
  payload.fact.commandId = 'changed-afterwards';
  payload.viewRevision = 999;
  assert.deepEqual(outcome.event, registrationEvent);
});

test('both fixture variants author the same registration event', () => {
  assert.deepEqual(createOfficerFixture('unprotected').afterRegistration.officerEvents, afterRegistration.officerEvents);
  for (const variant of ['protected', 'unprotected']) {
    const fixture = createOfficerFixture(variant);
    assert.deepEqual(fixture.afterRegistration.publicEvents, [], 'A registration puts nothing on the public stream');
    assert.deepEqual(fixture.afterRegistration.targetEvents, [], 'Nor on the target’s');
  }
});

import assert from 'node:assert/strict';
import {
  FullSetupDocumentSchema, FullSetupPlayerViewSchema, FullLobbyIdentityDocumentSchema,
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
} from '@mothership/contracts';

// Test-only setup fixtures. Direct delivery belongs to isolated service tests;
// real Functions smoke observes automatic deadline delivery without invoking workers.
export const setupRequest = (h, fields = {}) => ({ schemaVersion: 1, ...h.request(fields) });
export const setupDocument = async h => FullSetupDocumentSchema.parse((await h.base.collection('setup').doc('public').get()).data());
function accepted(schema, response, body) {
  const value = schema.parse(response);
  assert.equal(value.ok, true, 'The staged setup operation must succeed');
  assert.equal(value.matchId, body.matchId);
  assert.equal(value.requestId, body.requestId);
  return value;
}
export async function beginStagedSetup(h, body = setupRequest(h)) {
  const value = accepted(FullBeginSetupResponseSchema, await h.service.beginSetup(h.host.uid, body), body);
  assert.equal(value.stage, 'choosing'); assert.equal(value.dealId, null);
  return value;
}
// Observe real Functions/Tasks progression. Admin is used only for local reads;
// this path never enqueues, advances a clock or invokes a setup/gameplay worker.
export async function observeSetupDeadline(h, initial) {
  const previous = FullSetupDocumentSchema.parse(initial);
  assert.equal(previous.matchId, h.base.id);
  assert.ok(['choosing', 'awaiting-ready'].includes(previous.stage));
  const expected = previous.stage === 'choosing' ? 'awaiting-ready' : 'running';
  const expires = performance.now() + 60_000;
  do {
    const setup = await setupDocument(h);
    assert.equal(setup.setupId, previous.setupId, 'Automatic delivery preserves the setup epoch');
    assert.equal(setup.choosingStartedAt, previous.choosingStartedAt);
    assert.equal(setup.choosingEndsAt, previous.choosingEndsAt);
    assert.ok([previous.stage, expected].includes(setup.stage), 'Automatic setup follows the next persisted stage');
    const engine = await h.base.collection('engine').doc('current').get();
    if (previous.stage === 'choosing') {
      assert.equal(engine.exists, false, 'Selection and role dealing cannot create gameplay');
      if (setup.stage === expected) {
        assert.ok(setup.readingStartedAt >= previous.choosingEndsAt, 'Roles cannot be dealt before selection expires');
        assert.equal(setup.readingEndsAt - setup.readingStartedAt, 30_000);
        return setup;
      }
    } else {
      assert.equal(setup.dealId, previous.dealId);
      assert.equal(setup.readingStartedAt, previous.readingStartedAt);
      assert.equal(setup.readingEndsAt, previous.readingEndsAt);
      if (setup.stage === expected) {
        assert.equal(engine.exists, true, 'Automatic reading expiry creates actual gameplay');
        const phase = engine.get('phase');
        assert.ok(phase.startedAt >= previous.readingEndsAt, 'Gameplay cannot begin before the full reading window');
        assert.ok(phase.startedAt <= Date.now(), 'The first phase uses actual server time');
        assert.equal(phase.endsAt - phase.startedAt, 60_000, 'The first ordinary phase keeps its full minute');
        return setup;
      }
      // The engine read can race a legitimate commit at the deadline; before
      // that boundary its absence is mandatory on every observation.
      if (Date.now() < previous.readingEndsAt) assert.equal(engine.exists, false, 'Early Ready cannot create gameplay');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (performance.now() < expires);
  assert.fail('Automatic ' + previous.stage + ' deadline must reach ' + expected + ' within 60 seconds');
}

const currentTime = h => typeof h.now === 'function' ? h.now() : typeof h.now === 'number' ? h.now : Date.now();
export async function deliverSetupDeadline(h, stage) {
  assert.ok(['choosing', 'awaiting-ready'].includes(stage));
  const expected = stage === 'choosing' ? 'awaiting-ready' : 'running';
  let setup = await setupDocument(h);
  if (setup.stage === expected || (stage === 'choosing' && setup.stage === 'running')) return setup;
  assert.equal(setup.stage, stage, 'Only the current persisted setup stage can supply a deadline');
  const dueAt = stage === 'choosing' ? setup.choosingEndsAt : setup.readingEndsAt;
  const intents = (await h.base.collection('setupOutbox').get()).docs.filter(doc =>
    doc.get('setupId') === setup.setupId && doc.get('stage') === stage);
  assert.equal(intents.length, 1, 'The current timing epoch must have exactly one stored stage intent');
  const intent = intents[0].data();
  assert.equal(intent.kind, 'SETUP_DEADLINE'); assert.equal(intent.protocolVersion, 2);
  assert.equal(intent.matchId, h.base.id); assert.equal(intent.dueAt, dueAt);
  assert.equal(typeof intent.deadlineToken, 'string'); assert.ok(intent.deadlineToken.length > 0);
  const moveClock = h.setTime ?? h.setNow;
  if (moveClock) moveClock(Math.max(currentTime(h), dueAt));
  else {
    const expires = Date.now() + 40_000;
    while (Date.now() < dueAt) {
      assert.ok(Date.now() < expires, 'A real 30-second setup window must expire within the bounded wait');
      await new Promise(resolve => setTimeout(resolve, Math.min(200, dueAt - Date.now())));
      setup = await setupDocument(h);
      if (setup.stage === expected || (stage === 'choosing' && setup.stage === 'running')) return setup;
      assert.equal(setup.stage, stage, 'The match must retain this setup stage while its timer is active');
    }
  }
  setup = await setupDocument(h);
  if (setup.stage === expected || (stage === 'choosing' && setup.stage === 'running')) return setup;
  assert.equal(setup.stage, stage);
  const invokedAt = currentTime(h);
  const response = await h.service.runSetupDeadline({
    matchId: intent.matchId, setupId: intent.setupId, stage: intent.stage, deadlineToken: intent.deadlineToken,
  });
  assert.ok(['advanced', 'unchanged'].includes(response.status), 'The stored setup deadline callback must succeed');
  setup = await setupDocument(h);
  assert.equal(setup.stage, expected, 'The actual setup worker must advance the expired stage');
  assert.equal(setup.setupId, intent.setupId, 'Deadline delivery must preserve the timing epoch');
  if (stage === 'choosing') {
    assert.ok(setup.readingStartedAt >= dueAt, 'Role reading cannot start before selection expires');
    assert.equal(setup.readingEndsAt - setup.readingStartedAt, 30_000);
    assert.equal((await h.base.collection('engine').doc('current').get()).exists, false, 'A prepared deal must not create gameplay');
  } else {
    const engine = (await h.base.collection('engine').doc('current').get()).data();
    assert.ok(engine, 'The reading deadline must create actual gameplay');
    if (moveClock) assert.equal(engine.phase.startedAt, invokedAt, 'Gameplay begins at the injected service clock');
    else assert.ok(engine.phase.startedAt >= invokedAt && engine.phase.startedAt <= Date.now(), 'Gameplay begins during actual deadline delivery');
    assert.equal(engine.phase.endsAt - engine.phase.startedAt, 60_000, 'The first ordinary phase retains its full window');
  }
  return setup;
}
const nameKey = value => value.normalize('NFKC').trim().toLowerCase();
function nextChoice(identities, seatId) {
  const own = identities.seats.find(seat => seat.seatId === seatId);
  assert.ok(own, 'The admitted human must have a public identity entry');
  if (own.displayName !== null && own.characterId !== null) return { displayName: own.displayName, characterId: own.characterId };
  const usedCharacters = new Set(identities.seats.filter(seat => seat.seatId !== seatId).map(seat => seat.characterId));
  const characterId = Array.from({ length: 9 }, (_, index) => `c${index + 1}`).find(id => !usedCharacters.has(id));
  const usedNames = new Set(identities.seats.filter(seat => seat.seatId !== seatId && seat.displayName !== null).map(seat => nameKey(seat.displayName)));
  const displayName = ['Test', 'Seat', 'Pilot', 'Crew'].map(prefix => `${prefix} ${seatId.slice(5)}`).find(name => !usedNames.has(nameKey(name)));
  assert.ok(characterId && displayName, 'A deterministic unused public test identity must fit this roster');
  return { displayName, characterId };
}
export async function confirmStagedChoices(h) {
  let setup = await setupDocument(h);
  assert.ok(['choosing', 'awaiting-ready', 'running'].includes(setup.stage), 'Begin must open setup before completing it');
  const bindings = (await h.base.collection('seats').get()).docs.sort((a, b) => a.id.localeCompare(b.id));
  for (const binding of bindings) {
    setup = await setupDocument(h);
    if (setup.stage !== 'choosing') break;
    if (binding.get('controller') === 'bot' || setup.seats.find(seat => seat.seatId === binding.id)?.confirmed) continue;
    const uid = binding.get('uid'), bindingRevision = binding.get('bindingRevision');
    assert.equal(typeof uid, 'string', 'Human setup uses its actual current bound identity');
    const identities = FullLobbyIdentityDocumentSchema.parse((await h.base.collection('identities').doc('public').get()).data());
    const body = setupRequest(h, { bindingRevision, ...nextChoice(identities, binding.id) });
    const result = accepted(FullConfirmSetupChoiceResponseSchema, await h.service.confirmSetupChoice(uid, body), body);
    assert.equal(result.seatId, binding.id); assert.equal(result.bindingRevision, bindingRevision);
    assert.equal(result.stage, 'choosing', 'Explicit confirmation cannot shorten the selection timer');
  }
  setup = await setupDocument(h);
  if (setup.stage === 'choosing') {
    assert.ok(setup.seats.every(seat => seat.confirmed), 'Every test human has confirmed its public choice');
    assert.equal(setup.dealId, null);
    assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
    setup = await deliverSetupDeadline(h, 'choosing');
  }
  assert.ok(['awaiting-ready', 'running'].includes(setup.stage), 'The expired selection worker prepares one stable deal');
  return setup;
}
export async function completeStagedSetup(h) {
  let setup = await confirmStagedChoices(h);
  const bindings = (await h.base.collection('seats').get()).docs.sort((a, b) => a.id.localeCompare(b.id));
  for (const binding of bindings) {
    setup = await setupDocument(h);
    if (setup.stage === 'running') break;
    assert.equal(setup.stage, 'awaiting-ready', 'Every human confirms a choice before role readiness');
    if (binding.get('controller') === 'bot' || setup.seats.find(seat => seat.seatId === binding.id)?.ready) continue;
    const uid = binding.get('uid');
    const preview = FullSetupPlayerViewSchema.parse((await h.base.collection('setupPlayerViews').doc(uid).get()).data());
    assert.equal(preview.matchId, h.base.id); assert.equal(preview.self.seatId, binding.id);
    assert.equal(preview.bindingRevision, binding.get('bindingRevision')); assert.equal(preview.dealId, setup.dealId);
    const body = setupRequest(h, { dealId: preview.dealId, bindingRevision: preview.bindingRevision });
    const result = accepted(FullReadyForMatchResponseSchema, await h.service.readyForMatch(uid, body), body);
    assert.equal(result.seatId, binding.id); assert.equal(result.bindingRevision, body.bindingRevision); assert.equal(result.dealId, body.dealId);
    assert.equal(result.stage, 'awaiting-ready', 'Early Ready cannot shorten the reading timer');
  }
  setup = await setupDocument(h);
  if (setup.stage === 'awaiting-ready') {
    assert.ok(setup.seats.every(seat => seat.ready));
    assert.equal((await h.base.collection('engine').doc('current').get()).exists, false, 'Early Ready has not opened gameplay');
    setup = await deliverSetupDeadline(h, 'awaiting-ready');
  }
  assert.equal(setup.stage, 'running', 'The expired reading worker opens actual gameplay');
  return setup;
}
export async function startStagedMatch(h) {
  const setup = await setupDocument(h);
  if (setup.stage === 'lobby') await beginStagedSetup(h);
  return completeStagedSetup(h);
}

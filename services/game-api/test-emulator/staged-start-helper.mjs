import assert from 'node:assert/strict';
import {
  FullSetupDocumentSchema, FullSetupPlayerViewSchema, FullLobbyIdentityDocumentSchema,
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
} from '@mothership/contracts';

// Test-only real service calls: never synthesize authority, skip confirmations or move the clock.
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
  return accepted(FullBeginSetupResponseSchema, await h.service.beginSetup(h.host.uid, body), body);
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
  assert.ok(['choosing', 'awaiting-ready', 'running'].includes(setup.stage), 'Begin must open the setup before completing it');
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
  }
  setup = await setupDocument(h);
  assert.ok(['awaiting-ready', 'running'].includes(setup.stage), 'Confirmed choices must prepare one stable deal');
  return setup;
}
export async function completeStagedSetup(h) {
  let setup = await confirmStagedChoices(h);
  const bindings = (await h.base.collection('seats').get()).docs.sort((a, b) => a.id.localeCompare(b.id));
  for (const binding of bindings) {
    setup = await setupDocument(h);
    if (setup.stage === 'running') break;
    assert.equal(setup.stage, 'awaiting-ready', 'Every human choice must be explicitly confirmed before role readiness');
    if (binding.get('controller') === 'bot' || setup.seats.find(seat => seat.seatId === binding.id)?.ready) continue;
    const uid = binding.get('uid');
    const preview = FullSetupPlayerViewSchema.parse((await h.base.collection('setupPlayerViews').doc(uid).get()).data());
    assert.equal(preview.matchId, h.base.id); assert.equal(preview.self.seatId, binding.id);
    assert.equal(preview.bindingRevision, binding.get('bindingRevision')); assert.equal(preview.dealId, setup.dealId);
    const body = setupRequest(h, { dealId: preview.dealId, bindingRevision: preview.bindingRevision });
    const result = accepted(FullReadyForMatchResponseSchema, await h.service.readyForMatch(uid, body), body);
    assert.equal(result.seatId, binding.id); assert.equal(result.bindingRevision, body.bindingRevision); assert.equal(result.dealId, body.dealId);
  }
  setup = await setupDocument(h);
  assert.equal(setup.stage, 'running', 'The final readiness acknowledgment must open actual gameplay');
  return setup;
}
export async function startStagedMatch(h) {
  const setup = await setupDocument(h);
  if (setup.stage === 'lobby') await beginStagedSetup(h);
  return completeStagedSetup(h);
}

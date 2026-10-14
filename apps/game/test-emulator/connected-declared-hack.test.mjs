import assert from 'node:assert/strict';
import test from 'node:test';
import { supportsDeclaredHack } from '@mothership/contracts';
import { createConnectedPlayerScreen, DEFAULT_ACTION_FLOW_TIMING } from '@mothership/game';
import { renderComicPlayerShell, toHtml } from '@mothership/presentation';
import { nextView, ports, requestId, startedMatch } from './support/match.mjs';
import { until } from './support/rest-transport.mjs';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function frameWhen(screen, check, label) {
  return until(deliver => {
    const stop = screen.subscribe(() => deliver(screen.getFrame()));
    queueMicrotask(() => deliver(screen.getFrame()));
    return stop;
  }, check, label);
}

// Real local Functions, Auth and Rules reads with real server deadlines. The lost command
// response and unavailable receipt channel are arranged in the test transport; the real
// stored receipt is restored only after the current result is concealed.
// Ready acknowledgment here is fixture-only; this is not hosted art/version acceptance.
test('connected: a declared Hack claim stays private and a lost reply recovers the original command across the result phase', { timeout: 150_000 }, async t => {
  const { host, display, players, matchId, publicView } = await startedMatch(t);
  assert.ok(supportsDeclaredHack(publicView.versions), 'This suite explicitly consumes the published 1.5 checkpoint');
  const actor = players.find(player => player.seatId === publicView.activeSeatId);
  const targetIds = actor.view.legalTargets.REQUEST_HACK;
  assert.ok(targetIds.length > 0, 'The first turn has an authoritative local Hack offer');
  const target = players.find(player => targetIds.includes(player.seatId) && player.view.self.role === 'Undercover')
    ?? players.find(player => targetIds.includes(player.seatId));
  const outsider = players.find(player => player !== actor && player !== target);
  const command = value => ({ protocolVersion: 2, matchId, phaseId: publicView.phase.id, commandId: requestId(), command: value });
  const requested = await actor.api.command(command({ type: 'REQUEST_HACK', targetSeatId: target.seatId }));
  assert.equal(requested.receipt?.status, 'accepted');
  assert.equal((await actor.api.command(command({ type: 'PASS_TURN' }))).receipt?.status, 'accepted');
  const declaration = await nextView(target, { kind: 'player-view', matchId }, target.store, view => view.phase.kind === 'HACK_DECLARE', 'the fixed target declaration');
  assert.equal(declaration.phase.endsAt - declaration.phase.startedAt, 15_000);
  assert.deepEqual(declaration.legalTargets.DECLARE_HACK_SIDE, [target.seatId]);

  const kept = { value: null, load() { return this.value; }, save(value) { this.value = value; }, clear() { this.value = null; } };
  let declarations = 0, allowReceipts = false;
  const transport = { ...target.transport, async post(operation, body) {
    if (operation === 'v1Receipt' && !allowReceipts)
      return { ok: false, serverTimeMs: Date.now(), error: { code: 'UNAVAILABLE' } };
    const result = await target.transport.post(operation, body);
    if (operation !== 'v1Command' || body.command.type !== 'DECLARE_HACK_SIDE') return result;
    declarations += 1;
    assert.equal(result.receipt?.status, 'accepted');
    return { ok: false, serverTimeMs: Date.now(), error: { code: 'UNAVAILABLE' } };
  } };
  const screen = createConnectedPlayerScreen({ transport, matchId, seatId: target.seatId, ports: { ...ports, unresolved: kept }, host: { reload() {} } });
  t.after(() => screen.dispose());
  screen.start();
  await frameWhen(screen, frame => frame.model.match?.phaseKind === 'HACK_DECLARE' && frame.model.match.phase.timer.state === 'running', 'a trusted declaration window');
  screen.dispatch({ type: 'private/toggle' });
  screen.dispatch({ type: 'action/open', kind: 'declare-hack-side' });
  const choices = screen.getFrame().model.match.privateArea.content.actions.card.body.choices;
  assert.deepEqual(choices.map(choice => choice.value), ['Blue', 'Red', 'Alien']);
  // Only test input selection uses the dealt role. The UI offers the same three choices.
  const role = target.view.self.role;
  const side = ['Undercover', 'Alien'].includes(role) ? 'Blue'
    : ['Insider', 'Cracker', 'Supplier', 'Officer', 'Blue Disabler'].includes(role) ? 'Blue' : 'Red';
  screen.dispatch({ type: 'action/choose', value: side });
  await pause(DEFAULT_ACTION_FLOW_TIMING.controlGuardMs + 30);
  screen.dispatch({ type: 'action/confirm' });
  const result = await nextView(target, { kind: 'player-view', matchId }, target.store, view => view.phase.kind === 'HACK_RESULT', 'the committed private result');
  assert.equal(result.phase.endsAt - result.phase.startedAt, 5_000);
  assert.equal(result.hackFeedback.hackId, declaration.phase.id);
  await frameWhen(screen, frame => frame.model.match?.phaseKind === 'HACK_RESULT', 'the consumer result phase');
  assert.match(toHtml(renderComicPlayerShell(screen.getFrame().model)), new RegExp(`claims ${side.toUpperCase()}`));
  assert.ok(kept.value, 'The lost response retains its reconciliation identity');
  const saved = JSON.parse(kept.value);
  assert.deepEqual(Object.keys(saved).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
  assert.equal(saved.phaseId, declaration.phase.id);
  assert.doesNotMatch(kept.value, /declaredSide|DECLARE_HACK_SIDE|Blue|Red|Alien/);
  screen.setPageVisible(false);
  assert.doesNotMatch(toHtml(renderComicPlayerShell(screen.getFrame().model)), /claims|hack-feedback/);
  assert.equal(kept.value, JSON.stringify(saved), 'Concealment preserves the unresolved identifiers');
  allowReceipts = true;
  screen.setPageVisible(true);
  assert.equal(screen.getFrame().model.match.privateArea.open, false);
  screen.dispatch({ type: 'private/toggle' });
  await frameWhen(screen, frame => frame.model.match?.privateArea.content?.actions.card.status === 'accepted', 'the original declaration receipt');
  assert.equal(declarations, 1);
  assert.equal(kept.value, null);
  const wire = target.requests.filter(request => request.operation === 'v1Command' && request.body.command.type === 'DECLARE_HACK_SIDE');
  assert.equal(wire.length, 1);
  const receipt = await target.api.receipt({ protocolVersion: 2, matchId, commandId: saved.commandId });
  assert.equal(receipt.receipt.phaseId, declaration.phase.id);
  assert.doesNotMatch(JSON.stringify(receipt.receipt), /declaredSide|Blue|Red|Alien/);
  const publicResult = await nextView(display, { kind: 'public-view', matchId }, display.store, view => view.phase.id !== publicView.phase.id, 'public Hack phase');
  assert.doesNotMatch(JSON.stringify(publicResult), /hackFeedback|hackPartnerSeatId|declaredSide/);
  const uninvolved = await nextView(outsider, { kind: 'player-view', matchId }, outsider.store, view => view.phase.id !== publicView.phase.id, 'uninvolved player phase');
  assert.equal(uninvolved.hackFeedback, null);
  assert.equal(uninvolved.hackPartnerSeatId, null);
  assert.equal((await host.api.abortMatch({ protocolVersion: 2, matchId, requestId: requestId() })).kind, 'done');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerScreen, createTableScreen, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { renderPlayerShell, renderTableShell, textOf, toHtml } from '@mothership/presentation';
import { createFixtureTransport } from '../dev/fixture/fixture-transport.mjs';
import { createScenario } from '../dev/fixture/scenario.mjs';
import { createFakeHost, flush } from './support/fakes.mjs';

// The risks docs/design/motion-direction.md names for the event director, run with the real
// client core for three audiences against one scripted fixture scenario: a registration
// causes no public effect, a repeated event does not replay, a reconnect skips what is
// stale, nothing waits for a cue, and the same facts are on screen in words without one.
//
// FIXTURE BEHAVIOR, NOT INTEGRATION. The scenario is a scripted double whose event streams
// follow a delivery proposal that has not been run against a backend. Its phase-change,
// move and status events are frontend-authored and synthetic. Nothing here draws or
// animates anything: these are the cues a renderer is handed, not what a device shows.

const MATCH = 'fixture-match-a';
const GUARD = DEFAULT_SHOT_FLOW_TIMING.controlGuardMs;
const TOGGLE = { type: 'private/toggle' };

async function world() {
  const host = createFakeHost({ localStart: 0 });
  const scenario = createScenario({ now: () => host.localNow() });
  const sent = [];
  const base = createFixtureTransport(scenario, 'seat-1');
  const screens = {
    officer: createPlayerScreen({
      transport: { ...base, submitCommand: command => { sent.push(structuredClone(command)); return base.submitCommand(command); } },
      matchId: MATCH, ports: host.ports, host: { reload() {} },
    }),
    target: createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-2'), matchId: MATCH, ports: host.ports, host: { reload() {} } }),
    table: createTableScreen({ transport: createFixtureTransport(scenario, 'public'), matchId: MATCH, ports: host.ports, host: { reload() {} } }),
  };
  const names = Object.keys(screens);
  for (const name of names) screens[name].start();
  await flush();
  const frame = name => screens[name].getFrame();
  const w = {
    host, scenario, sent, screens, names, frame,
    cues: name => frame(name).cues.map(item => item.cue),
    privateCues: name => frame(name).privateCues.map(item => item.cue),
    /** The cue lists of each screen's current frame, public and private. */
    allCues: () => Object.fromEntries(names.map(name => [name, [frame(name).cues, frame(name).privateCues]])),
    frames: () => Object.fromEntries(names.map(name => [name, frame(name)])),
    html: name => toHtml((name === 'table' ? renderTableShell : renderPlayerShell)(frame(name).model)),
    text: name => textOf((name === 'table' ? renderTableShell : renderPlayerShell)(frame(name).model)),
    /** Player 1 opens the private panel, picks Player 2 and confirms once the control is active. */
    async registerShot() {
      screens.officer.dispatch(TOGGLE);
      screens.officer.dispatch({ type: 'shot/open' });
      screens.officer.dispatch({ type: 'shot/choose-target', seatId: 'seat-2' });
      await host.advance(GUARD);
      screens.officer.dispatch({ type: 'shot/confirm' });
      await flush();
    },
  };
  return w;
}

test('journey: a registration is a stamp on the registering player’s own open panel and nothing anywhere else', async () => {
  const w = await world();
  const others = { target: w.frame('target'), table: w.frame('table') };
  const documents = { target: w.html('target'), table: w.html('table') };
  await w.registerShot();
  const commandId = w.sent[0].commandId;
  assert.deepEqual(w.privateCues('officer'), [{ kind: 'registration' }]);
  assert.deepEqual(w.cues('officer'), [], 'Not a public cue, even on the registering phone');
  // The table and the target's phone were not handed a cue, a frame or a changed document.
  for (const name of ['target', 'table']) {
    assert.equal(w.frame(name), others[name], name);
    assert.equal(w.html(name), documents[name], name);
    assert.deepEqual([w.frame(name).cues, w.frame(name).privateCues], [[], []], name);
  }
  // The identifier that tells one registration from another is in no frame and no document.
  for (const name of w.names) assert.equal((JSON.stringify(w.frame(name)) + w.html(name)).includes(commandId), false, name);
  // Closing the panel withdraws the stamp with everything else that is private.
  w.screens.officer.dispatch(TOGGLE);
  assert.deepEqual(w.privateCues('officer'), []);
});

test('journey: a registration the operator steps in, with the panel closed, changes nothing on any screen', async () => {
  const w = await world();
  const before = w.frames();
  w.scenario.advance();
  await flush();
  for (const name of w.names) assert.equal(w.frame(name), before[name], name);
});

test('journey: a public phase change is one cue on every screen, in the frame that shows the new phase', async () => {
  const w = await world();
  w.scenario.endFirstTurn();
  await flush();
  for (const name of w.names) {
    assert.deepEqual(w.cues(name), [{ kind: 'phase-change' }], name);
    assert.deepEqual(w.privateCues(name), [], name);
  }
  assert.equal(w.frame('table').model.match.phase.phaseLabel, 'Player 2’s turn');
  assert.equal(w.frame('target').model.match.phase.phaseLabel, 'Your turn');
  // Nobody learns anything from the cue that is not on the screen in words, and spoken.
  assert.match(w.text('table'), /Player 2’s turn/);
  assert.equal(w.frame('table').announcement.text, 'Round 2. Player 2’s turn.');
  assert.equal(w.frame('target').announcement.text, 'Round 2. Your turn.');
});

test('journey: the events arrive before their view. Each is still played once, with that view', async () => {
  const w = await world();
  w.scenario.setEventOrder('event-first');
  w.scenario.endFirstTurn();
  await flush();
  w.scenario.synthetic('move');
  await flush();
  for (const name of w.names) {
    // The phase has not changed again, so its cue is still due beside the newer one.
    assert.deepEqual(w.cues(name), [{ kind: 'phase-change' }, { kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' }], name);
    assert.deepEqual(w.frame(name).cues.map(item => item.seq), [1, 2], `${name}: the phase change was cue 1`);
  }
});

test('journey: an event sent again is not played again, on any screen', async () => {
  const w = await world();
  await w.registerShot();
  w.scenario.endFirstTurn();
  w.scenario.synthetic('status');
  await flush();
  const before = w.frames();
  for (const audience of ['public', 'seat-1', 'seat-2']) {
    w.scenario.redeliverEvents(audience);
    w.scenario.redeliver(audience);
    w.scenario.redeliverEvents(audience);
  }
  await flush();
  for (const name of w.names) assert.equal(w.frame(name), before[name], `${name}: not even a redraw`);
});

test('journey: a screen that was away replays nothing on return, though its stream hands everything over again', async () => {
  const w = await world();
  w.scenario.endFirstTurn();
  await flush();
  for (const name of w.names) assert.deepEqual(w.cues(name), [{ kind: 'phase-change' }], `${name}: the turn change is being emphasized`);
  for (const audience of ['public', 'seat-1', 'seat-2']) w.scenario.setConnected(audience, false);
  await flush();
  // A feed that is no longer current emphasizes nothing: the last known state stays, its cue does not.
  for (const name of w.names) assert.deepEqual([w.frame(name).cues, w.frame(name).privateCues], [[], []], name);
  // The match moves on while every feed is down.
  w.scenario.advance();
  w.scenario.synthetic('move');
  w.scenario.synthetic('status');
  for (const audience of ['public', 'seat-1', 'seat-2']) w.scenario.setConnected(audience, true);
  await flush();
  for (const name of w.names) {
    assert.equal(w.frame(name).model.connection, 'live', name);
    assert.equal(w.frame(name).model.match.phase.phaseLabel, 'Round resolution', name);
    assert.deepEqual([w.frame(name).cues, w.frame(name).privateCues], [[], []], `${name}: nothing played for what was missed, and nothing old brought back`);
    assert.match(w.frame(name).announcement.text, /^Reconnected\. Round 2\. Round resolution\.$/, `${name}: the present is stated instead`);
    assert.match(w.text(name), /Player 9[^.]*Injured/, `${name}: and the missed facts are on screen`);
  }
  // The same on the reconnect control, with the stream delivered ahead of the view.
  w.scenario.setEventOrder('event-first');
  for (const name of w.names) w.screens[name].dispatch({ type: 'session/reconnect' });
  await flush();
  for (const name of w.names) assert.deepEqual([w.frame(name).cues, w.frame(name).privateCues], [[], []], name);
  // What happens next is played.
  w.scenario.synthetic('move');
  await flush();
  for (const name of w.names) assert.deepEqual(w.cues(name), [{ kind: 'public-move', seatId: 'seat-8', from: 'Room A', to: 'Room B' }], name);
});

test('journey: a public move and a status change are cues about one token each, and say nothing the screen does not say in words', async () => {
  const w = await world();
  w.scenario.synthetic('move');
  await flush();
  for (const name of w.names) {
    assert.deepEqual(w.cues(name), [{ kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' }], name);
    assert.equal(w.frame(name).announcement.text, 'Player 8 is now in Room A.', name);
  }
  w.scenario.synthetic('status');
  await flush();
  for (const name of w.names) {
    // Another seat's fact does not cut the first cue short: Player 8 is still where it moved to.
    assert.deepEqual(w.cues(name), [{ kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' }, { kind: 'status-change', seatId: 'seat-9', health: 'Injured' }], name);
    assert.equal(w.frame(name).announcement.text, 'Player 9 is now Injured.', name);
    assert.match(w.text(name), /Player 9[^.]*Injured/, name);
    // No cause is known, so none is shown: not in a cue, a spoken line or the words on screen.
    const told = JSON.stringify([w.frame(name).cues, w.frame(name).privateCues, w.frame(name).announcement]) + w.text(name);
    assert.doesNotMatch(told, /\b(shot at|was hit|hit by|attack|BANG|blocked|protect)/i, name);
  }
});

test('journey: nothing waits for a cue. The turn clock keeps its seconds and a shot can be registered at once', async () => {
  const w = await world();
  await w.host.advance(3_000);
  const timerBefore = w.frame('officer').model.match.phase.timer.display;
  w.scenario.synthetic('move');
  await flush();
  assert.deepEqual(w.cues('officer').map(cue => cue.kind), ['public-move']);
  assert.equal(w.frame('officer').model.match.phase.timer.display, timerBefore, 'A cue does not touch the countdown');
  // The player acts in the same instant; the cue has no say in it.
  await w.registerShot();
  assert.equal(w.sent.length, 1);
  assert.equal(w.frame('officer').model.match.privateArea.content.actions.cards[0].status, 'registered');
  assert.deepEqual(w.privateCues('officer').map(cue => cue.kind), ['registration']);
  // The registration changed this seat's own view and nothing public: the public cue is still there, as on every other screen.
  assert.deepEqual(w.cues('officer').map(cue => cue.kind), ['public-move'], 'A private registration takes no public cue away');
  assert.deepEqual(w.frame('officer').cues, w.frame('target').cues, 'The Officer’s public list is what a phone that registered nothing shows');
  // And the clock went on counting through all of it: a second per second, whatever was cued.
  await w.host.advance(2_000 - GUARD);
  assert.equal(w.frame('table').model.match.phase.timer.display, '0:55');
  assert.equal(w.frame('officer').model.match.phase.timer.display, '0:55');
});

test('journey: choosing reduced motion changes the screen’s motion setting at once and takes no fact away', async () => {
  const w = await world();
  w.scenario.synthetic('status');
  await flush();
  assert.equal(w.frame('table').model.motion, 'full');
  const cues = w.frame('table').cues;
  w.screens.table.dispatch({ type: 'settings/reduce-motion', checked: true });
  assert.equal(w.frame('table').model.motion, 'reduced');
  assert.match(w.html('table'), /data-motion="reduced"/, 'What a renderer keys its motion on changes with the very next frame');
  assert.equal(w.frame('table').cues, cues, 'The cue is not issued a second time');
  assert.match(w.text('table'), /Player 9[^.]*Injured/);
  // Later facts are still cued; how little is drawn for them is the renderer's part.
  w.scenario.synthetic('move');
  await flush();
  assert.deepEqual(w.cues('table').map(cue => cue.kind), ['status-change', 'public-move']);
});

test('journey: events a correct backend would never send change nothing on any screen', async () => {
  const w = await world();
  w.screens.officer.dispatch(TOGGLE);
  w.screens.target.dispatch(TOGGLE);
  const before = w.frames();
  for (const audience of ['public', 'seat-1', 'seat-2']) {
    w.scenario.injectEvent(audience, 'unreadable');
    w.scenario.injectEvent(audience, 'incompatible-protocol');
  }
  // An event shaped like the other seat's registration, addressed to the view each phone has now.
  w.scenario.injectEvent('seat-1', 'other-audience');
  w.scenario.injectEvent('seat-2', 'other-audience');
  await flush();
  for (const name of w.names) {
    assert.equal(w.frame(name), before[name], name);
    assert.equal(w.frame(name).model.screen, 'match', `${name}: no recovery screen for a bad event`);
  }
  // The screens still work afterwards.
  w.scenario.endFirstTurn();
  await flush();
  for (const name of w.names) assert.deepEqual(w.cues(name).map(cue => cue.kind), ['phase-change'], name);
});

test('journey: the whole script, with every screen open. No cue of any kind names an attack, a block or a role', async () => {
  const w = await world();
  const seen = [];
  for (const name of w.names) w.screens[name].subscribe(() => seen.push(...w.frame(name).cues, ...w.frame(name).privateCues));
  w.screens.target.dispatch(TOGGLE);
  await w.registerShot();
  while (w.scenario.advance()) await flush();
  for (const fact of ['move', 'status', 'move', 'status']) {
    w.scenario.synthetic(fact);
    await flush();
  }
  const kinds = new Set(seen.map(item => item.cue.kind));
  assert.deepEqual([...kinds].sort(), ['phase-change', 'public-move', 'registration', 'status-change']);
  assert.doesNotMatch(JSON.stringify(seen), /shoot|bang|block|protect|attack|damage|target|cause|officer|insider|role/i);
  // The registration cue went to one screen only.
  assert.equal(w.frame('table').privateCues.length + w.frame('target').privateCues.length, 0);
});

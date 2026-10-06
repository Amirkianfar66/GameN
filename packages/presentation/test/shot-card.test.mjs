import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlayerShellModel, parseShellIntent, renderPlayerShell, resolveShotGate, SHELL_IDS, shotStepFocusId, shotTargetCandidates,
  shotTargetId, splitRegions, textOf, toHtml,
} from '@mothership/presentation';
import { fixture, IDLE_SHOT, openInput, playerInput, playerVariant, ROLE_NAMES } from './support/inputs.mjs';
import { auditMarkup, byClass, byId, find, findAll } from './support/markup-audit.mjs';

const { before, afterRegistration } = fixture();
const officer = before.officer;

const cardOf = input => buildPlayerShellModel(input).match.privateArea.content.actions.cards[0];
const card = (shot, view = officer, overrides) => cardOf(openInput(view, shot, overrides));
const markup = (shot, view = officer, overrides) => renderPlayerShell(buildPlayerShellModel(openInput(view, shot, overrides)));

/** One input for every step of the flow, all aimed at Player 2. */
const STEPS = {
  idle: IDLE_SHOT,
  targeting: { step: 'targeting' },
  confirming: { step: 'confirming', targetSeatId: 'seat-2' },
  submitting: { step: 'submitting', targetSeatId: 'seat-2' },
  checking: { step: 'checking', targetSeatId: 'seat-2' },
  unknown: { step: 'unknown', targetSeatId: 'seat-2' },
  registered: { step: 'registered', targetSeatId: 'seat-2' },
  'rejected (phase closed)': { step: 'rejected', targetSeatId: 'seat-2', code: 'PHASE_CLOSED' },
  'rejected (not allowed)': { step: 'rejected', targetSeatId: 'seat-2', code: 'NOT_ALLOWED' },
  'not registered': { step: 'not-registered', targetSeatId: 'seat-2', reason: 'FORBIDDEN' },
};

test('the gate opens only on the player’s own ordinary turn, with a shot the server calls available, on current unexpired facts', () => {
  const live = openInput(officer);
  assert.deepEqual(resolveShotGate(live, officer), { open: true });
  assert.deepEqual(resolveShotGate(live, before.target), { open: false, why: 'unavailable' });
  assert.deepEqual(resolveShotGate({ ...live, connection: 'stale' }, officer), { open: false, why: 'paused' });
  assert.deepEqual(resolveShotGate({ ...live, problem: 'unreadable-update' }, officer), { open: false, why: 'paused' });
  assert.deepEqual(resolveShotGate({ ...live, deadline: { kind: 'expired' } }, officer), { open: false, why: 'paused' });
  // The countdown is only a display. Not having measured the time yet does not stop a player acting.
  assert.deepEqual(resolveShotGate({ ...live, deadline: { kind: 'unsynced' } }, officer), { open: true });
  const othersTurn = playerVariant(officer, v => { v.activeSeatId = 'seat-2'; });
  assert.deepEqual(resolveShotGate(live, othersTurn), { open: false, why: 'not-your-turn' });
  const resolution = playerVariant(officer, v => { v.phase = { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt: v.phase.endsAt, endsAt: null }; v.activeSeatId = null; });
  assert.deepEqual(resolveShotGate({ ...live, deadline: { kind: 'none' } }, resolution), { open: false, why: 'not-your-turn' });
});

test('target hints are the other players in the same location and infer nothing else', () => {
  assert.deepEqual(shotTargetCandidates(officer), ['seat-2', 'seat-3', 'seat-4', 'seat-6']);
  assert.deepEqual(shotTargetCandidates(before.target), ['seat-1', 'seat-3', 'seat-4', 'seat-6']);
  // No health, Jail or Captain rule is applied here: the server decides, and the hint says so.
  const mixed = playerVariant(officer, v => { v.seats[1].health = 'Eliminated'; v.seats[2].jailed = true; v.seats[3].captain = true; v.seats[4].captain = false; });
  assert.deepEqual(shotTargetCandidates(mixed), ['seat-2', 'seat-3', 'seat-4', 'seat-6']);
  const moved = playerVariant(officer, v => { v.seats[1].location = 'Room B'; });
  assert.deepEqual(shotTargetCandidates(moved), ['seat-3', 'seat-4', 'seat-6']);
  const alone = playerVariant(officer, v => { v.seats[0].location = 'Hospital'; });
  assert.deepEqual(shotTargetCandidates(alone), []);
});

test('idle: the card offers a start only when the gate is open, and explains only what the player may know', () => {
  assert.deepEqual(card(IDLE_SHOT), {
    id: 'shot', title: 'Shot', status: 'available', statusLabel: 'Available', selected: false,
    body: { step: 'idle', open: { id: 'ms-shot-open', label: 'Choose a target', intent: 'shot/open', primary: true }, reason: null, note: null },
  });
  const othersTurn = playerVariant(officer, v => { v.activeSeatId = 'seat-2'; });
  assert.deepEqual(card(IDLE_SHOT, othersTurn).body, { step: 'idle', open: null, reason: 'You can register a shot during your own turn.', note: null });
  assert.equal(card(IDLE_SHOT, othersTurn).status, 'available');
  // Paused: the notice above the cards says why, and the card offers nothing.
  for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }]) {
    assert.deepEqual(card(IDLE_SHOT, officer, overrides).body, { step: 'idle', open: null, reason: null, note: null });
  }
  const actions = overrides => buildPlayerShellModel(openInput(officer, IDLE_SHOT, overrides)).match.privateArea.content.actions;
  assert.equal(actions({ connection: 'stale' }).notice, 'Actions are paused until the connection is restored.');
  assert.equal(actions({ deadline: { kind: 'expired' } }).notice, 'This phase has ended. Waiting for phase update.');
  // "Not available" comes with no reason: whether a shot was spent or never held is not this screen's to say.
  assert.deepEqual(card(IDLE_SHOT, before.target).body, { step: 'idle', open: null, reason: null, note: null });
});

test('targeting lists each hinted player with the public status everyone can see', () => {
  const view = playerVariant(officer, v => { v.seats[2].health = 'Injured'; v.seats[2].jailed = true; });
  const model = card(STEPS.targeting, view);
  assert.equal(model.status, 'targeting');
  assert.equal(model.statusLabel, 'Choosing a target');
  assert.equal(model.selected, true);
  assert.equal(model.body.prompt, 'Choose a target');
  assert.deepEqual(model.body.targets, [
    { seatId: 'seat-2', number: 2, label: 'Player 2', detail: 'Healthy' },
    { seatId: 'seat-3', number: 3, label: 'Player 3', detail: 'Injured, Jailed' },
    { seatId: 'seat-4', number: 4, label: 'Player 4', detail: 'Healthy' },
    { seatId: 'seat-6', number: 6, label: 'Player 6', detail: 'Healthy' },
  ]);
  assert.deepEqual(model.body.back, { id: 'ms-shot-back', label: 'Cancel', intent: 'shot/back', primary: false });
  const alone = playerVariant(officer, v => { v.seats[0].location = 'Hospital'; });
  assert.deepEqual(card(STEPS.targeting, alone).body.targets, []);
  assert.equal(card(STEPS.targeting, alone).body.emptyText, 'No other players are in your location.');
});

test('confirming names the target and offers exactly a send and a way back', () => {
  const model = card(STEPS.confirming);
  assert.equal(model.status, 'confirming');
  assert.deepEqual(model.body, {
    step: 'confirming',
    prompt: 'Register a shot at Player 2?',
    consequence: 'You cannot change or withdraw it here once it is registered.',
    confirm: { id: 'ms-shot-confirm', label: 'Register shot', intent: 'shot/confirm', primary: true },
    back: { id: 'ms-shot-back', label: 'Choose someone else', intent: 'shot/back', primary: false },
  });
  // The chosen player left the location: the choice is asked for again instead of being sent.
  const moved = playerVariant(officer, v => { v.seats[1].location = 'Room B'; });
  assert.equal(card(STEPS.confirming, moved).body.step, 'targeting');
});

test('a choice that was not sent cannot be drawn once the gate has closed', () => {
  const closed = [
    [officer, { connection: 'stale' }],
    [officer, { deadline: { kind: 'expired' } }],
    [playerVariant(officer, v => { v.activeSeatId = 'seat-2'; }), {}],
    [playerVariant(officer, v => { v.self.shotAvailable = false; }), {}],
  ];
  for (const [view, overrides] of closed) {
    for (const step of [STEPS.targeting, STEPS.confirming]) {
      const model = card(step, view, overrides);
      assert.equal(model.body.step, 'idle');
      assert.equal(model.body.open, null);
      assert.equal(JSON.stringify(model).includes('shot/confirm'), false);
    }
  }
});

test('a sent command locks the card until the server’s answer is known', () => {
  assert.deepEqual(card(STEPS.submitting), { id: 'shot', title: 'Shot', status: 'submitting', statusLabel: 'Submitting', selected: true, body: { step: 'busy', text: 'Sending your shot to the server…' } });
  assert.deepEqual(card(STEPS.checking).body, { step: 'busy', text: 'Checking whether your shot was registered…' });
  const unknown = card(STEPS.unknown);
  assert.equal(unknown.statusLabel, 'Result unknown');
  assert.equal(unknown.selected, true);
  assert.deepEqual(unknown.body, {
    step: 'result', outcome: 'unknown',
    text: 'Result unknown. The app could not confirm whether your shot was registered.',
    detail: 'Do not assume either way. Check again when the connection is back.',
    action: { id: 'ms-shot-check', label: 'Check again', intent: 'shot/check-again', primary: true },
  });
  // Whatever the connection or the clock does meanwhile, none of these steps offers a way to
  // start over or to pick someone else: a changed target must be a new, deliberate command.
  for (const step of [STEPS.submitting, STEPS.checking, STEPS.unknown]) {
    for (const overrides of [{}, { connection: 'stale' }, { deadline: { kind: 'expired' } }]) {
      const text = JSON.stringify(card(step, officer, overrides));
      for (const intent of ['shot/open', 'shot/choose-target', 'shot/confirm', 'shot/back', 'shot/dismiss']) assert.equal(text.includes(intent), false, `${step.step} ${intent}`);
    }
  }
});

test('registered is reported as a registration and never as an outcome', () => {
  const model = card(STEPS.registered);
  assert.equal(model.statusLabel, 'Registered');
  assert.equal(model.selected, false);
  assert.deepEqual(model.body, {
    step: 'result', outcome: 'registered',
    text: 'Shot at Player 2 registered.',
    detail: 'This is not a result. Registered shots are resolved at the end of the round.',
    action: { id: 'ms-shot-dismiss', label: 'Done', intent: 'shot/dismiss', primary: true },
  });
  // Nothing in any step of the flow names damage, a defense or a result.
  for (const [name, step] of Object.entries(STEPS)) {
    assert.doesNotMatch(JSON.stringify(card(step)), /\b(hit|miss|injur|damag|eliminat|block|protect|wound|kill|dead)/i, name);
  }
});

test('a rejection or a known failure says so plainly, with the server’s reason and nothing guessed', () => {
  const text = shot => card(shot).body;
  assert.equal(card(STEPS['rejected (phase closed)']).statusLabel, 'Not registered');
  assert.deepEqual(text(STEPS['rejected (phase closed)']), {
    step: 'result', outcome: 'not-registered', text: 'Not registered. The turn had already ended.', detail: null,
    action: { id: 'ms-shot-dismiss', label: 'OK', intent: 'shot/dismiss', primary: true },
  });
  assert.equal(text(STEPS['rejected (not allowed)']).text, 'Not registered. The server did not allow this shot.');
  assert.equal(text(STEPS['rejected (not allowed)']).detail, 'You can choose again if it is still your turn.');
  const reasons = {
    UNAUTHENTICATED: ['Not registered. This device is not signed in to the match.', null],
    FORBIDDEN: ['Not registered. This device may not act for this seat.', null],
    INVALID_REQUEST: ['Not registered. The server could not read the request.', null],
    UNSUPPORTED_PROTOCOL: ['Not registered. This app is out of date. Reload to update.', null],
    COMMAND_ID_CONFLICT: ['Not registered. The server refused the request.', 'You can choose again if it is still your turn.'],
    NOT_SENT: ['Not registered. The request could not be sent.', 'You can choose again if it is still your turn.'],
  };
  for (const [reason, [message, detail]] of Object.entries(reasons)) {
    const body = text({ step: 'not-registered', targetSeatId: 'seat-2', reason });
    assert.equal(body.text, message);
    assert.equal(body.detail, detail);
    assert.equal(body.outcome, 'not-registered');
  }
});

test('after registration the card follows the view; this device adds the target only while it remembers it', () => {
  const remembered = { step: 'idle', registeredTargetSeatId: 'seat-2' };
  // The view lists the command: the server's facts, plus the target from this device's memory.
  const listed = card(remembered, afterRegistration.officer);
  assert.equal(listed.status, 'registered');
  assert.deepEqual(listed.body, { step: 'idle', open: null, reason: null, note: 'Your shot at Player 2 is registered. It is resolved at the end of the round.' });
  // After a reload the memory is gone; the view still says a shot is registered, not at whom.
  assert.equal(card(IDLE_SHOT, afterRegistration.officer).body.note, 'A shot is registered. It is resolved at the end of the round.');
  // The receipt arrived before the view did. The stale view still calls the shot available,
  // and the card must not offer it again on that basis.
  const behind = card(remembered, officer);
  assert.equal(behind.status, 'registered');
  assert.equal(behind.body.open, null);
  assert.match(behind.body.note, /^Your shot at Player 2 is registered\./);
  // Should the server ever say both "pending" and "available", its word stands.
  const both = playerVariant(afterRegistration.officer, v => { v.self.shotAvailable = true; });
  assert.equal(card(remembered, both).body.open?.intent, 'shot/open');
});

test('the card is the same for every role at every step; only server facts and the player’s own progress differ', () => {
  for (const [name, step] of Object.entries(STEPS)) {
    for (const role of ROLE_NAMES) {
      const reassigned = playerVariant(officer, v => { v.self.role = role; });
      assert.deepEqual(card(step, reassigned), card(step), `${name} ${role}`);
    }
  }
});

test('Protection truth never reaches the card: both fixture variants draw every step identically', () => {
  const guarded = fixture('protected');
  const unguarded = fixture('unprotected');
  for (const [name, step] of Object.entries(STEPS)) {
    for (const stage of ['before', 'afterRegistration']) {
      assert.deepEqual(card(step, guarded[stage].officer), card(step, unguarded[stage].officer), `${name} ${stage}`);
    }
  }
});

test('no step of the flow is in the model or the document unless the private panel is open in the foreground', () => {
  for (const [name, shot] of Object.entries(STEPS)) {
    for (const privacy of [{ concealed: false, revealed: false }, { concealed: true, revealed: true }, { concealed: true, revealed: false }]) {
      const model = buildPlayerShellModel(playerInput(officer, { privacy, shot }));
      assert.equal(model.match.privateArea.content, null, name);
      const html = toHtml(renderPlayerShell(model));
      for (const word of ['Shot', 'shot', 'Register', 'registered', 'target', 'Submitting', 'Checking', 'Result unknown', 'ms-card']) assert.equal(html.includes(word), false, `${name}: ${word}`);
      // A closed phone is byte-for-byte the same whatever its command is doing.
      assert.equal(html, toHtml(renderPlayerShell(buildPlayerShellModel(playerInput(officer, { privacy })))), name);
    }
  }
});

test('every step passes the structural audit and keeps exactly one line to focus on', () => {
  const views = { ...STEPS, 'idle, registered earlier': IDLE_SHOT, 'idle, not your turn': IDLE_SHOT, 'targeting, alone': STEPS.targeting };
  const viewFor = name => name === 'idle, registered earlier' ? afterRegistration.officer
    : name === 'idle, not your turn' ? playerVariant(officer, v => { v.activeSeatId = 'seat-2'; })
    : name === 'targeting, alone' ? playerVariant(officer, v => { v.seats[0].location = 'Hospital'; })
    : officer;
  for (const [name, shot] of Object.entries(views)) {
    const root = markup(shot, viewFor(name));
    assert.deepEqual(auditMarkup(root), [], name);
    const title = find(root, byId(SHELL_IDS.shotTitle));
    assert.equal(title.tag, 'h4');
    assert.equal(title.attrs.tabindex, '-1');
    const lines = findAll(root, byId(SHELL_IDS.shotStep));
    const body = buildPlayerShellModel(openInput(viewFor(name), shot)).match.privateArea.content.actions.cards[0].body;
    const plainIdle = body.step === 'idle' && body.note === null && body.reason === null;
    assert.equal(lines.length, plainIdle ? 0 : 1, name);
    for (const line of lines) {
      // The focused line is text. Arriving on it can never activate anything.
      assert.equal(line.tag, 'p', name);
      assert.equal(line.attrs.tabindex, '-1', name);
      assert.equal(line.attrs['data-intent'], undefined, name);
    }
  }
});

test('target controls are buttons that carry their seat, a name and a public status in words', () => {
  const root = markup(STEPS.targeting, playerVariant(officer, v => { v.seats[2].health = 'Injured'; }));
  const targets = findAll(root, element => element.attrs['data-intent'] === 'shot/choose-target');
  assert.deepEqual(targets.map(target => [target.tag, target.attrs.type, target.attrs.id, target.attrs['data-target-seat']]), [
    ['button', 'button', 'ms-shot-target-seat-2', 'seat-2'],
    ['button', 'button', 'ms-shot-target-seat-3', 'seat-3'],
    ['button', 'button', 'ms-shot-target-seat-4', 'seat-4'],
    ['button', 'button', 'ms-shot-target-seat-6', 'seat-6'],
  ]);
  assert.equal(shotTargetId('seat-3'), 'ms-shot-target-seat-3');
  assert.equal(textOf(targets[1]), '3Player 3, Injured');
  assert.equal(find(targets[1], byClass('ms-token')).attrs['aria-hidden'], 'true');
  const list = find(root, byClass('ms-targets'));
  assert.equal(list.attrs['aria-labelledby'], SHELL_IDS.shotStep);
  // The list is hints from public facts; the page says who decides.
  assert.match(textOf(find(root, byClass('ms-card__state'))), /The server decides whether a shot is allowed\./);
});

test('the card’s state is carried by text and mirrored in attributes for styling', () => {
  for (const [name, shot] of Object.entries(STEPS)) {
    const root = markup(shot);
    const model = card(shot);
    const state = find(root, byClass('ms-card__state'));
    assert.equal(state.attrs['data-status'], model.status, name);
    assert.equal(state.attrs['data-step'], model.body.step, name);
    assert.equal(state.attrs['data-selected'], String(model.selected), name);
    assert.equal(textOf(find(root, byClass('ms-card__status'))), model.statusLabel, name);
  }
});

test('a step change redraws the Shot card alone; a pause notice redraws the actions and not the panel around them', () => {
  const regions = (shot, overrides) => splitRegions(markup(shot, officer, overrides)).regions;
  const changed = (a, b) => [...new Set([...a.keys(), ...b.keys()])].filter(id => a.get(id) !== b.get(id));
  assert.deepEqual(changed(regions(IDLE_SHOT), regions(STEPS.targeting)), ['shot']);
  assert.deepEqual(changed(regions(STEPS.targeting), regions(STEPS.confirming)), ['shot']);
  assert.deepEqual(changed(regions(STEPS.submitting), regions(STEPS.registered)), ['shot']);
  // The title sits outside the redrawn part, so it can hold focus while a command is in flight.
  assert.equal(regions(STEPS.submitting).get('shot').includes(`id="${SHELL_IDS.shotTitle}"`), false);
  assert.equal(regions(STEPS.submitting).get('actions').includes(`id="${SHELL_IDS.shotTitle}"`), true);
  // Losing the connection while a command is unresolved adds the notice: the role card is not rebuilt.
  assert.deepEqual(changed(regions(STEPS.checking), regions(STEPS.checking, { connection: 'stale' })), ['banners', 'actions']);
});

test('focus after a step the player took lands on the line for that step, never on a control that sends', () => {
  assert.equal(shotStepFocusId(card(STEPS.targeting)), SHELL_IDS.shotStep);
  assert.equal(shotStepFocusId(card(STEPS.confirming)), SHELL_IDS.shotStep);
  assert.notEqual(shotStepFocusId(card(STEPS.confirming)), SHELL_IDS.shotConfirm);
  // While a command is in flight focus rests on the title, which is not redrawn; results are spoken.
  assert.equal(shotStepFocusId(card(STEPS.submitting)), SHELL_IDS.shotTitle);
  assert.equal(shotStepFocusId(card(STEPS.checking)), SHELL_IDS.shotTitle);
  assert.equal(shotStepFocusId(card(STEPS.unknown)), SHELL_IDS.shotStep);
  assert.equal(shotStepFocusId(card(STEPS.registered)), SHELL_IDS.shotStep);
  // Back at the start, focus returns to the control that opens the flow, when there is one.
  assert.equal(shotStepFocusId(card(IDLE_SHOT)), SHELL_IDS.shotOpen);
  assert.equal(shotStepFocusId(card(IDLE_SHOT, afterRegistration.officer)), SHELL_IDS.shotStep);
  assert.equal(shotStepFocusId(card(IDLE_SHOT, before.target)), SHELL_IDS.shotTitle);
  // Every id the helper can return exists in the markup for that step.
  for (const [name, shot] of Object.entries(STEPS)) {
    for (const view of [officer, afterRegistration.officer, before.target]) {
      const model = buildPlayerShellModel(openInput(view, shot));
      const id = shotStepFocusId(model.match.privateArea.content.actions.cards[0]);
      assert.equal(findAll(renderPlayerShell(model), byId(id)).length, 1, `${name}: ${id}`);
    }
  }
});

test('a host can only turn a control into an intent the shells define', () => {
  assert.deepEqual(parseShellIntent('shot/open'), { type: 'shot/open' });
  assert.deepEqual(parseShellIntent('shot/confirm', { seatId: 'seat-9', checked: true }), { type: 'shot/confirm' });
  assert.deepEqual(parseShellIntent('shot/choose-target', { seatId: 'seat-4' }), { type: 'shot/choose-target', seatId: 'seat-4' });
  assert.deepEqual(parseShellIntent('settings/reduce-motion', { checked: false }), { type: 'settings/reduce-motion', checked: false });
  assert.deepEqual(parseShellIntent('private/toggle'), { type: 'private/toggle' });
  for (const seatId of [undefined, '', 'seat-0', 'seat-10', 'Seat-1', 'seat-1 ', 'toString', '__proto__']) {
    assert.equal(parseShellIntent('shot/choose-target', { seatId }), null, String(seatId));
  }
  assert.equal(parseShellIntent('settings/reduce-motion', {}), null);
  for (const type of [undefined, '', 'shot/fire', 'toString', 'constructor', '__proto__', 'SHOT/OPEN']) assert.equal(parseShellIntent(type), null, String(type));
  // Every intent a rendered control carries can be parsed back.
  for (const shot of Object.values(STEPS)) {
    for (const control of findAll(markup(shot), element => element.attrs['data-intent'] !== undefined)) {
      const parsed = parseShellIntent(control.attrs['data-intent'], { seatId: control.attrs['data-target-seat'], checked: control.attrs.checked === true });
      assert.equal(parsed?.type, control.attrs['data-intent']);
    }
  }
});

test('a region names where focus goes if what held it is redrawn away, and that place always exists', () => {
  const fallbacks = root => Object.fromEntries(findAll(root, element => element.attrs['data-focus-fallback'] !== undefined)
    .map(element => [element.attrs['data-region'], element.attrs['data-focus-fallback']]));
  for (const [name, shot] of Object.entries(STEPS)) {
    const root = markup(shot);
    assert.deepEqual(fallbacks(root), { private: SHELL_IDS.privateToggle, shot: SHELL_IDS.shotTitle }, name);
    // The card's fallback sits outside the part that is redrawn, so it survives the redraw it is for.
    const title = find(root, byId(SHELL_IDS.shotTitle));
    assert.equal(findAll(find(root, byClass('ms-card__state')), element => element === title).length, 0, name);
    assert.equal(title.attrs.tabindex, '-1');
  }
  // Closed, the panel still names its own toggle, which is always there.
  const closed = renderPlayerShell(buildPlayerShellModel(playerInput(officer)));
  assert.deepEqual(fallbacks(closed), { private: SHELL_IDS.privateToggle });
  assert.equal(findAll(closed, byId(SHELL_IDS.privateToggle)).length, 1);
});

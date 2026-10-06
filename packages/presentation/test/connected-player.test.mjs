import assert from 'node:assert/strict';
import test from 'node:test';
import { FullPlayerViewSchema, FullPublicViewSchema, RoleSchema } from '@mothership/contracts';
import {
  ACTION_KINDS, actionStepFocusId, buildConnectedPlayerShellModel, buildTableShellModel, createConnectedPlayerAnnouncer, describeAction, isActionKind, offeredTargets,
  parseShellIntent, renderConnectedPlayerShell, renderTableShell, SHELL_IDS, TARGET_ACTION_COMMANDS, textOf, toHtml,
} from '@mothership/presentation';
import { auditMarkup, byClass, byId, byRegion, find, findAll } from './support/markup-audit.mjs';

// The connected phone and table on wire protocol 2 views. Synthetic, hand-built views that
// satisfy the shared strict schema; none is the result of an engine.

const EPOCH = 1_900_000_000_000;
const facts = (playerCount = 7) => ({
  versions: { protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: 'a'.repeat(64), engineVersion: 'full-game-1.0.0', assetManifestVersion: '0.0.0-no-assets' },
  matchId: 'connected-test-match', viewRevision: 4, playerCount, round: 1,
  phase: { id: 'phase-one', kind: 'ORDINARY_TURN', startedAt: EPOCH, endsAt: EPOCH + 60_000 }, activeSeatId: 'seat-1',
  seats: Array.from({ length: playerCount }, (unused, index) => ({ seatId: `seat-${index + 1}`, health: 'Healthy', location: index % 2 === 0 ? 'Room A' : 'Room B', jailed: false, captain: false, revealedFaction: null })),
  ballot: { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null }, lastTally: null, result: null, endReveal: null,
});
const publicView = (change = () => {}, playerCount = 7) => {
  const view = { ...facts(playerCount), audience: { kind: 'public' } };
  change(view);
  return FullPublicViewSchema.parse(view);
};
const playerView = (change = () => {}) => {
  const view = {
    ...facts(), audience: { kind: 'player', seatId: 'seat-1' },
    self: { seatId: 'seat-1', role: 'Cracker', movementDestinations: ['Room B'], releaseVoteAvailable: false, ordinaryWeapons: 0, shotAvailable: false, rescuesRemaining: 1, disablerAvailable: false, hackAvailable: false, scanAvailable: false, codeAttemptAvailable: false },
    knowledge: { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] },
    legalTargets: {}, ownPendingCommandIds: [], ownBallot: null, hasVoted: false, hackPartnerSeatId: null,
  };
  change(view);
  return FullPlayerViewSchema.parse(view);
};
const armed = view => { view.self.shotAvailable = true; view.self.ordinaryWeapons = 1; view.legalTargets = { REGISTER_SHOT: ['seat-5', 'seat-3'] }; };
const environment = { mode: 'emulator', connection: 'live', problem: null, deadline: { kind: 'running', remainingMs: 42_000 }, motion: { reducedMotion: false, followsDevice: true } };
const IDLE = { step: 'idle' };
const input = (view, action = IDLE, overrides = {}) => ({ ...environment, view, privacy: { concealed: false, revealed: true }, action, ...overrides });
const closed = { privacy: { concealed: false, revealed: false } };
const model = (...args) => buildConnectedPlayerShellModel(input(...args));
const card = (...args) => model(...args).match.privateArea.content.actions.card;
const markup = (...args) => renderConnectedPlayerShell(model(...args));
const MOVE = { kind: 'move', destination: 'Room B' };
const SHOT = { kind: 'shot', targetSeatId: 'seat-3' };

test('a protocol-2 table shows seven, eight or nine seats, names every phase kind, and labels the emulator', () => {
  for (const count of [7, 8, 9]) {
    const table = buildTableShellModel({ ...environment, view: publicView(() => {}, count) });
    assert.equal(table.match.roster.rows.length, count);
    assert.deepEqual(auditMarkup(renderTableShell(table)), []);
    assert.equal(table.banners.some(banner => banner.variant === 'emulator' && /emulator/i.test(banner.text)), true, 'Emulator mode is labeled, apart from fixture mode');
  }
  const labels = {
    HACK: 'Hack', CAPTAIN_ELECTION: 'Captain election', RELEASE_CHOICE: 'Release choice', RELEASE_VOTE: 'Release vote', JAIL_VOTE: 'Jail vote', SHOWDOWN: 'Showdown',
  };
  for (const [kind, label] of Object.entries(labels)) {
    const phase = buildTableShellModel({ ...environment, view: publicView(view => { view.phase = { ...view.phase, kind }; view.activeSeatId = null; }) }).match.phase;
    // The voting phases have no controls yet, and the screen says so. A Hack and a showdown
    // offer whatever the server opens for the seat, so nothing is disclaimed there.
    const detail = kind === 'HACK' || kind === 'SHOWDOWN' ? null : 'This preview shows this phase and its clock. It cannot take part in it yet.';
    assert.deepEqual([phase.phaseLabel, phase.detail], [label, detail], kind);
  }
  const aborted = buildTableShellModel({ ...environment, deadline: { kind: 'none' }, view: publicView(view => { view.phase = { ...view.phase, kind: 'ABORTED', endsAt: null }; view.activeSeatId = null; }) });
  assert.deepEqual([aborted.match.phase.phaseLabel, aborted.match.phase.detail, aborted.match.phase.timer.state], ['Match ended by the host', null, 'none']);
});

test('a revealed faction is shown as the public fact it is, and nothing is shown before the server reveals it', () => {
  const view = publicView(next => { next.seats[2] = { ...next.seats[2], health: 'Eliminated', revealedFaction: 'Red' }; });
  const table = buildTableShellModel({ ...environment, view });
  const row = table.match.roster.rows.find(candidate => candidate.seat.seatId === 'seat-3');
  assert.deepEqual(row.seat.markers.map(marker => marker.label), ['Eliminated', 'Revealed: Red']);
  assert.equal(row.status, 'Revealed: Red');
  for (const other of table.match.roster.rows.filter(candidate => candidate.seat.seatId !== 'seat-3')) assert.equal(other.seat.markers.some(marker => marker.kind === 'faction'), false);
  assert.doesNotMatch(toHtml(renderTableShell(buildTableShellModel({ ...environment, view: publicView() }))), /Revealed|ms-marker--faction|\b(Blue|Red|Alien)\b/);
});

test('closed, the connected phone holds nothing private in its model or its document, whatever the command’s state', () => {
  const roles = RoleSchema.options;
  for (const action of [IDLE, { step: 'choosing', kind: 'move' }, { step: 'confirming', choice: SHOT, armed: true }, { step: 'accepted', choice: MOVE, armed: true }, { step: 'unknown', choice: SHOT, recovered: false, phaseOver: false, armed: true }]) {
    for (const hidden of [closed, { privacy: { concealed: true, revealed: true } }]) {
      const built = buildConnectedPlayerShellModel(input(playerView(armed), action, hidden));
      assert.equal(built.match.privateArea.content, null);
      const html = toHtml(renderConnectedPlayerShell(built));
      for (const role of roles) assert.equal(html.includes(role), false, role);
      assert.doesNotMatch(html, /ms-card|action\/|Move to|Moved|Register|registered|Accepted|Result unknown|Choose a target|Choose where/);
      assert.deepEqual(auditMarkup(renderConnectedPlayerShell(built)), []);
    }
  }
});

test('idle, the card lists what the server offers now: a move, a shot, both or neither', () => {
  const plain = card(playerView());
  assert.deepEqual([plain.title, plain.status, plain.statusLabel, plain.selected], ['Your action', 'idle', 'Nothing in progress', false]);
  assert.deepEqual(plain.body.offers, [
    { kind: 'move', label: 'Move', statusLabel: 'Available', open: { id: 'ms-action-open-move', label: 'Choose where to move' } },
    { kind: 'shot', label: 'Shot', statusLabel: 'Not available', open: null },
  ]);
  assert.equal(card(playerView(armed)).body.offers[1].open.label, 'Choose a target');
  // The category is open and nobody can be targeted: said as it is.
  const noTarget = card(playerView(view => { armed(view); view.legalTargets = { REGISTER_SHOT: [] }; })).body.offers[1];
  assert.deepEqual([noTarget.statusLabel, noTarget.open], ['No one you can target right now', null]);
  // Targets listed while the category is closed offer nothing.
  assert.equal(card(playerView(view => { armed(view); view.self.shotAvailable = false; })).body.offers[1].open, null);
  assert.deepEqual(card(playerView(view => { view.self.movementDestinations = []; })).body.offers[0], { kind: 'move', label: 'Move', statusLabel: 'Not available', open: null });
  // How many commands are waiting, and not which: the view does not say.
  assert.equal(card(playerView()).body.note, null);
  assert.equal(card(playerView(view => { view.ownPendingCommandIds = ['command-a']; })).body.note, 'One action of yours is registered and waiting to be resolved.');
  assert.equal(card(playerView(view => { view.ownPendingCommandIds = ['command-a', 'command-b']; })).body.note, '2 actions of yours are registered and waiting to be resolved.');
});

test('nothing can be started on a view that is not fresh or whose clock has run out, and the screen says why', () => {
  for (const [overrides, notice] of [
    [{ connection: 'stale' }, 'Actions are paused until the connection is restored.'],
    [{ problem: 'unreadable-update' }, 'Actions are paused until the connection is restored.'],
    [{ deadline: { kind: 'expired' } }, 'This phase has ended. Waiting for phase update.'],
    // No trusted clock is not permission: without one this device cannot say the phase is still running.
    [{ deadline: { kind: 'unsynced' } }, 'Actions are paused until this device has the server’s time.'],
  ]) {
    const built = model(playerView(armed), IDLE, overrides);
    assert.equal(built.match.privateArea.content.actions.notice, notice);
    for (const offer of built.match.privateArea.content.actions.card.body.offers) assert.equal(offer.open, null, JSON.stringify(overrides));
    // What the server last offered is not called "available": this device cannot vouch for the present.
    assert.deepEqual(built.match.privateArea.content.actions.card.body.offers.map(offer => offer.statusLabel), ['Paused', 'Paused'], JSON.stringify(overrides));
    // What it did not offer stays what it was.
    assert.deepEqual(card(playerView(view => { view.self.movementDestinations = []; }), IDLE, overrides).body.offers.map(offer => offer.statusLabel), ['Not available', 'Not available']);
    // An unsent choice is not drawn either, whatever the flow still holds.
    assert.equal(card(playerView(armed), { step: 'confirming', choice: SHOT, armed: true }, overrides).body.step, 'idle');
  }
});

test('choosing lists the server’s own choices, each with a public description only', () => {
  const move = card(playerView(), { step: 'choosing', kind: 'move' });
  assert.deepEqual([move.title, move.status, move.selected, move.body.prompt], ['Move', 'choosing', true, 'Where do you move?']);
  assert.deepEqual(move.body.choices, [{ id: 'ms-action-choice-room-b', value: 'Room B', label: 'Room B', detail: null, number: null }]);
  const shot = card(playerView(view => { armed(view); view.seats[4] = { ...view.seats[4], health: 'Injured' }; }), { step: 'choosing', kind: 'shot' });
  assert.deepEqual(shot.body.choices, [
    { id: 'ms-action-choice-seat-3', value: 'seat-3', label: 'Player 3', detail: 'Healthy', number: 3 },
    { id: 'ms-action-choice-seat-5', value: 'seat-5', label: 'Player 5', detail: 'Injured', number: 5 },
  ]);
  assert.equal(shot.body.note, 'These are the choices the server offers you now.');
});

test('confirming names the choice and what it does; the control is drawn as not yet active until its wait is over', () => {
  const move = card(playerView(), { step: 'confirming', choice: MOVE, armed: false });
  assert.deepEqual([move.status, move.statusLabel, move.body.prompt, move.body.consequence], ['confirming', 'Not sent yet', 'Move to Room B?', 'You cannot change or withdraw it here once the server accepts it.']);
  assert.deepEqual(move.body.confirm, { id: SHELL_IDS.actionConfirm, label: 'Move', intent: 'action/confirm', primary: true, disabled: true });
  assert.equal(card(playerView(), { step: 'confirming', choice: MOVE, armed: true }).body.confirm.disabled, false);
  const shot = card(playerView(armed), { step: 'confirming', choice: SHOT, armed: true });
  assert.deepEqual([shot.body.prompt, shot.body.confirm.label], ['Register a shot at Player 3?', 'Register shot']);
});

test('what the server did is reported as given: accepted is not a result, a rejection names no invented reason, unknown assumes nothing', () => {
  assert.deepEqual(card(playerView(), { step: 'submitting', choice: MOVE }).body, { step: 'busy', text: 'Sending your move to the server…' });
  assert.equal(card(playerView(), { step: 'checking', choice: null, recovered: true }).body.text, 'This page was reloaded before the server answered. Checking what became of your action…');
  // A receipt says the server accepted the command. It is not where the player is: that is
  // read from the view, and the card says where to read it.
  const moved = card(playerView(), { step: 'accepted', choice: MOVE, armed: false });
  assert.deepEqual([moved.status, moved.selected, moved.body.text, moved.body.detail, moved.body.action.disabled],
    ['accepted', false, 'Move to Room B accepted.', 'Where you are is shown under “Your location”, as the server has it.', true]);
  const registered = card(playerView(armed), { step: 'accepted', choice: SHOT, armed: true });
  assert.deepEqual([registered.body.text, registered.body.detail], ['Shot at Player 3 registered.', 'This is not a result. Registered shots are resolved at the end of the round.']);
  const reloaded = card(playerView(), { step: 'accepted', choice: null, armed: true });
  assert.deepEqual([reloaded.title, reloaded.body.text], ['Your action', 'The server accepted your action.']);
  assert.match(reloaded.body.detail, /no longer knows what the action was/);
  assert.equal(card(playerView(), { step: 'rejected', choice: MOVE, code: 'PHASE_CLOSED', armed: true }).body.text, 'Not accepted. It reached the server after that phase had ended.');
  assert.equal(card(playerView(), { step: 'not-accepted', choice: null, reason: 'PHASE_OVER', armed: true }).body.text, 'Not accepted. That phase ended before the server received it.');
  const unknown = card(playerView(), { step: 'unknown', choice: MOVE, recovered: false, phaseOver: false, armed: true });
  assert.deepEqual([unknown.status, unknown.selected, unknown.body.action.intent], ['unknown', true, 'action/check-again']);
  // A command whose outcome is unknown can be asked about again and cannot be put away:
  // whatever phase it is by now, the card has that one control and no way to dismiss.
  for (const state of [{ recovered: false, phaseOver: false }, { recovered: false, phaseOver: true }, { recovered: true, phaseOver: true }]) {
    const body = card(playerView(), { step: 'unknown', choice: null, armed: true, ...state }).body;
    assert.deepEqual(Object.keys(body).sort(), ['action', 'detail', 'outcome', 'step', 'text']);
    assert.equal(body.action.intent, 'action/check-again');
    assert.doesNotMatch(toHtml(renderConnectedPlayerShell(model(playerView(), { step: 'unknown', choice: null, armed: true, ...state }))), /action\/dismiss|Stop checking/);
  }
  assert.equal(card(playerView(), { step: 'not-accepted', choice: MOVE, reason: 'NOT_RECORDED', armed: true }).body.text,
    'Not sent. This browser would not keep the identifiers the app needs to ask about an action after a reload.');
  // No step of the card names an outcome of the game, for either kind of action. "Moved",
  // like "hit", would be an outcome: the card only ever says what the server accepted.
  for (const choice of [MOVE, SHOT]) {
    for (const action of [
      { step: 'accepted', choice, armed: true }, { step: 'rejected', choice, code: 'NOT_ALLOWED', armed: true }, { step: 'rejected', choice, code: 'PHASE_CLOSED', armed: true },
      { step: 'unknown', choice, recovered: false, phaseOver: false, armed: true }, { step: 'submitting', choice }, { step: 'confirming', choice, armed: true },
    ]) {
      assert.doesNotMatch(JSON.stringify(card(playerView(armed), action)), /\b(moved|you are now|arrived|hit|miss|injur|damag|block|protect|killed|eliminat)/i, `${choice.kind} ${action.step}`);
    }
  }
});

test('every step of the open card passes the structural audit, and focus goes to the line that asks or reports', () => {
  const steps = [
    [IDLE, 'ms-action-open-move'], [{ step: 'choosing', kind: 'move' }, SHELL_IDS.actionStep], [{ step: 'confirming', choice: MOVE, armed: false }, SHELL_IDS.actionStep],
    [{ step: 'submitting', choice: MOVE }, SHELL_IDS.actionTitle], [{ step: 'checking', choice: null, recovered: true }, SHELL_IDS.actionTitle],
    [{ step: 'unknown', choice: MOVE, recovered: false, phaseOver: true, armed: true }, SHELL_IDS.actionStep], [{ step: 'accepted', choice: MOVE, armed: true }, SHELL_IDS.actionStep],
    [{ step: 'rejected', choice: MOVE, code: 'NOT_ALLOWED', armed: true }, SHELL_IDS.actionStep],
  ];
  for (const [action, focusId] of steps) {
    const root = markup(playerView(armed), action);
    assert.deepEqual(auditMarkup(root), [], action.step);
    assert.equal(actionStepFocusId(card(playerView(armed), action)), focusId, action.step);
    assert.equal(findAll(root, byId(focusId)).length, 1, `${action.step}: the focus target exists`);
    assert.equal(find(root, byRegion('action')).attrs['data-status'], card(playerView(armed), action).status);
  }
  // With nothing offered, focus rests on the card's title.
  assert.equal(actionStepFocusId(card(playerView(view => { view.self.movementDestinations = []; }))), SHELL_IDS.actionTitle);
  // A control that is not active yet says so and stays reachable.
  const confirm = find(markup(playerView(), { step: 'confirming', choice: MOVE, armed: false }), byId(SHELL_IDS.actionConfirm));
  assert.equal(confirm.attrs['aria-disabled'], 'true');
  assert.equal(confirm.attrs.disabled, undefined);
  // The choices are controls that carry their value; the role card is in the panel and nowhere else.
  const choices = findAll(markup(playerView(armed), { step: 'choosing', kind: 'shot' }), element => element.attrs['data-intent'] === 'action/choose');
  assert.deepEqual(choices.map(choice => [choice.attrs['data-value'], textOf(choice)]), [['seat-3', '3Player 3, Healthy'], ['seat-5', '5Player 5, Healthy']]);
  assert.equal(textOf(find(markup(playerView()), byClass('ms-role-card'))), 'Cracker');
});

test('the intent parser accepts the action intents and nothing a control could not carry', () => {
  assert.deepEqual(parseShellIntent('action/open', { kind: 'move' }), { type: 'action/open', kind: 'move' });
  assert.deepEqual(parseShellIntent('action/open', { kind: 'shot' }), { type: 'action/open', kind: 'shot' });
  assert.equal(parseShellIntent('action/open', { kind: 'vote' }), null);
  assert.equal(parseShellIntent('action/open', {}), null);
  assert.deepEqual(parseShellIntent('action/choose', { value: 'Room B' }), { type: 'action/choose', value: 'Room B' });
  assert.equal(parseShellIntent('action/choose', {}), null);
  assert.equal(parseShellIntent('action/choose', { value: '' }), null);
  assert.equal(parseShellIntent('action/choose', { value: 'x'.repeat(33) }), null);
  for (const type of ['action/back', 'action/confirm', 'action/check-again', 'action/dismiss']) assert.deepEqual(parseShellIntent(type), { type });
  assert.equal(parseShellIntent('action/send-anything'), null);
});

test('what became of a command is spoken privately, once, and only in front of an open panel', () => {
  const said = inputs => {
    const announcer = createConnectedPlayerAnnouncer();
    return inputs.map(next => announcer.next(next).filter(line => line.private === true).map(line => `${line.politeness}: ${line.text}`));
  };
  const view = playerView(armed);
  assert.deepEqual(said([
    input(view), input(view, { step: 'choosing', kind: 'move' }), input(view, { step: 'confirming', choice: MOVE, armed: true }),
    input(view, { step: 'submitting', choice: MOVE }), input(view, { step: 'accepted', choice: MOVE, armed: false }), input(view, { step: 'accepted', choice: MOVE, armed: true }), input(view),
  ]), [[], [], [], ['polite: Sending your move to the server…'], ['polite: Move to Room B accepted.'], [], []]);
  assert.deepEqual(said([input(view), input(view, { step: 'rejected', choice: SHOT, code: 'NOT_ALLOWED', armed: false })]).at(-1), ['assertive: Not accepted. The server did not allow it.']);
  assert.deepEqual(said([input(view), input(view, { step: 'unknown', choice: SHOT, recovered: false, phaseOver: false, armed: false })]).at(-1), ['assertive: Result unknown. The app could not confirm what the server did with your action.']);
  // Closed: nothing private is said. Opened later: the result is said then.
  assert.deepEqual(said([input(view, IDLE, closed), input(view, { step: 'accepted', choice: SHOT, armed: true }, closed), input(view, { step: 'accepted', choice: SHOT, armed: true })]),
    [[], [], ['polite: Shot at Player 3 registered.']]);
  // A choice taken away by a lost connection is said to be unsent; one the player put down is not.
  assert.deepEqual(said([input(view), input(view, { step: 'confirming', choice: MOVE, armed: true }), input(view, IDLE, { connection: 'stale' })]).at(-1), ['polite: Your choice was not sent.']);
  assert.deepEqual(said([input(view), input(view, { step: 'confirming', choice: MOVE, armed: true }), input(view)]).at(-1), []);
  // So is one cleared because the phase changed under it.
  const nextPhase = playerView(next => { armed(next); next.viewRevision += 1; next.phase = { ...next.phase, id: 'phase-two' }; });
  assert.deepEqual(said([input(view), input(view, { step: 'choosing', kind: 'shot' }), input(nextPhase)]).at(-1), ['polite: Your choice was not sent.']);
  // The card and the spoken line never say different things.
  for (const action of [{ step: 'accepted', choice: MOVE, armed: true }, { step: 'checking', choice: null, recovered: false }]) {
    const body = card(view, action).body;
    assert.equal(body.text, describeAction(action));
  }
});

// ---- The other actions that name one seat: Disable, Protection, Rescue, Hack, showdown shot ----

/** What each of them says on the card, for a target that is another player (seat 3) and one that is the player's own seat. */
const TARGET_ACTIONS = {
  disable: { command: 'DISABLE', label: 'Disable', open: 'Choose a target', prompt: 'Choose a target', confirm: 'Register a Disable at Player 3?', button: 'Register Disable', accepted: 'Disable at Player 3 registered.', detail: 'This is not a result. Registered actions are resolved at the end of the round.' },
  protect: { command: 'PROTECT', label: 'Protection', open: 'Choose a player', prompt: 'Who is the Protection for?', confirm: 'Register Protection for Player 3?', button: 'Register Protection', accepted: 'Protection for Player 3 registered.', detail: 'This is not a result. Registered actions are resolved at the end of the round.' },
  rescue: { command: 'RESCUE', label: 'Rescue', open: 'Choose a player', prompt: 'Who is the Rescue for?', confirm: 'Register a Rescue of Player 3?', button: 'Register Rescue', accepted: 'Rescue of Player 3 registered.', detail: 'This is not a result. Registered actions are resolved at the end of the round.' },
  hack: { command: 'REQUEST_HACK', label: 'Hack', open: 'Choose a player', prompt: 'Who do you request a Hack with?', confirm: 'Request a Hack with Player 3?', button: 'Request Hack', accepted: 'Hack request with Player 3 accepted.', detail: 'The phase shown at the top of this screen says what happens next.' },
  'showdown-shot': { command: 'SHOWDOWN_SHOT', label: 'Showdown shot', open: 'Choose a target', prompt: 'Choose a target', confirm: 'Register a showdown shot at Player 3?', button: 'Register shot', accepted: 'Showdown shot at Player 3 registered.', detail: 'This is not a result.' },
};
const listing = (command, seats) => view => { view.legalTargets = { ...view.legalTargets, [command]: seats }; };

test('the actions the phone can offer are a fixed list, and each one that names a seat reads its targets from the view under its own command', () => {
  assert.deepEqual(ACTION_KINDS, ['move', 'shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot']);
  assert.deepEqual(TARGET_ACTION_COMMANDS, { shot: 'REGISTER_SHOT', disable: 'DISABLE', protect: 'PROTECT', rescue: 'RESCUE', hack: 'REQUEST_HACK', 'showdown-shot': 'SHOWDOWN_SHOT' });
  for (const kind of ACTION_KINDS) assert.equal(isActionKind(kind), true);
  for (const other of ['vote', 'scan', 'supply', 'code', 'MOVE', '', null, undefined, 3]) assert.equal(isActionKind(other), false, String(other));
  for (const [kind, { command }] of Object.entries(TARGET_ACTIONS)) {
    assert.equal(offeredTargets(playerView(), kind), null, `${kind}: not opened by the view`);
    assert.deepEqual(offeredTargets(playerView(listing(command, ['seat-5', 'seat-3'])), kind), ['seat-5', 'seat-3'], `${kind}: the view's own list, as given`);
    assert.deepEqual(offeredTargets(playerView(listing(command, [])), kind), [], `${kind}: open with nobody to choose`);
    // A list under another command opens nothing for this one.
    const elsewhere = Object.values(TARGET_ACTIONS).map(action => action.command).filter(other => other !== command);
    assert.equal(offeredTargets(playerView(view => { for (const other of elsewhere) listing(other, ['seat-3'])(view); view.self.shotAvailable = true; }), kind), null);
  }
  // An ordinary shot is stated twice by the view, and both must agree.
  assert.equal(offeredTargets(playerView(listing('REGISTER_SHOT', ['seat-3'])), 'shot'), null);
  assert.deepEqual(offeredTargets(playerView(armed), 'shot'), ['seat-5', 'seat-3']);
});

test('an action other than a move or a shot is listed only while the server opens it, and then with the server’s own targets', () => {
  // Nothing opened: the card lists a move and a shot, and no role's action by name.
  assert.deepEqual(card(playerView()).body.offers.map(offer => offer.kind), ['move', 'shot']);
  // Commands this screen does not offer, and keys it does not know, list nothing either.
  const unknown = card(playerView(view => { view.legalTargets = { VOTE: ['seat-2'], SCAN: ['seat-2'], SUPPLY: ['seat-2', 'seat-3'], RELEASE_CHOICE: ['seat-2'], SOMETHING_NEW: ['seat-4'] }; }));
  assert.deepEqual(unknown.body.offers.map(offer => offer.kind), ['move', 'shot']);

  for (const [kind, expected] of Object.entries(TARGET_ACTIONS)) {
    const open = card(playerView(listing(expected.command, ['seat-5', 'seat-3'])));
    assert.deepEqual(open.body.offers.map(offer => offer.kind), ['move', 'shot', kind]);
    assert.deepEqual(open.body.offers[2], { kind, label: expected.label, statusLabel: 'Available', open: { id: `ms-action-open-${kind}`, label: expected.open } }, kind);
    // Open with nobody to choose: listed, said as it is, and no control.
    assert.deepEqual(card(playerView(listing(expected.command, []))).body.offers[2], { kind, label: expected.label, statusLabel: 'No one you can target right now', open: null }, kind);
    // On a view this device cannot vouch for, or without a running trusted clock: no control, and not called available.
    for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }, { deadline: { kind: 'unsynced' } }]) {
      assert.deepEqual(card(playerView(listing(expected.command, ['seat-3'])), IDLE, overrides).body.offers[2], { kind, label: expected.label, statusLabel: 'Paused', open: null }, kind);
    }
    // Closed, none of it is in the model or the document.
    const built = model(playerView(listing(expected.command, ['seat-3'])), IDLE, closed);
    assert.equal(built.match.privateArea.content, null);
    assert.equal(toHtml(renderConnectedPlayerShell(built)).includes(expected.label === 'Hack' ? 'ms-action-open-hack' : expected.label), false, kind);
  }
  // Several at once, in the phone's own fixed order whatever order the view lists them in.
  const several = card(playerView(view => { view.legalTargets = { REQUEST_HACK: ['seat-3'], RESCUE: ['seat-1'], PROTECT: ['seat-3'] }; }));
  assert.deepEqual(several.body.offers.map(offer => offer.kind), ['move', 'shot', 'protect', 'rescue', 'hack']);
});

test('each of them asks, confirms and reports in its own words, names the player’s own seat as theirs, and never names an outcome', () => {
  for (const [kind, expected] of Object.entries(TARGET_ACTIONS)) {
    const view = playerView(listing(expected.command, ['seat-5', 'seat-1', 'seat-3']));
    const choosing = card(view, { step: 'choosing', kind });
    assert.deepEqual([choosing.title, choosing.status, choosing.body.prompt], [expected.label, 'choosing', expected.prompt], kind);
    // Sorted by seat, each named by its public number; the player's own seat is named as theirs.
    assert.deepEqual(choosing.body.choices.map(choice => [choice.value, choice.label, choice.number]), [['seat-1', 'Player 1 (you)', 1], ['seat-3', 'Player 3', 3], ['seat-5', 'Player 5', 5]], kind);
    assert.deepEqual(choosing.body.choices.map(choice => choice.detail), ['Healthy', 'Healthy', 'Healthy'], 'Described by public status only');

    const other = { kind, targetSeatId: 'seat-3' };
    const confirming = card(view, { step: 'confirming', choice: other, armed: true });
    assert.deepEqual([confirming.body.prompt, confirming.body.confirm.label, confirming.body.confirm.intent], [expected.confirm, expected.button, 'action/confirm'], kind);
    assert.match(confirming.body.consequence, /^You cannot change or withdraw it here once /);
    assert.match(card(view, { step: 'submitting', choice: other }).body.text, /^Sending your .* to the server…$/);
    const accepted = card(view, { step: 'accepted', choice: other, armed: true });
    assert.deepEqual([accepted.status, accepted.body.text, accepted.body.detail], ['accepted', expected.accepted, expected.detail], kind);
    assert.equal(describeAction({ step: 'accepted', choice: other, armed: true }, 'seat-1'), expected.accepted, 'The spoken line is the card’s line');

    // The player's own seat as the target.
    const own = { kind, targetSeatId: 'seat-1' };
    assert.equal(card(view, { step: 'confirming', choice: own, armed: true }).body.prompt, expected.confirm.replace('Player 3', 'yourself'), kind);
    assert.equal(card(view, { step: 'accepted', choice: own, armed: true }).body.text, expected.accepted.replace('Player 3', 'yourself'), kind);

    // No step names an outcome of the game.
    for (const action of [
      { step: 'choosing', kind }, { step: 'confirming', choice: other, armed: true }, { step: 'submitting', choice: other }, { step: 'accepted', choice: other, armed: true },
      { step: 'rejected', choice: other, code: 'NOT_ALLOWED', armed: true }, { step: 'unknown', choice: other, recovered: false, phaseOver: false, armed: true },
    ]) {
      // Judged on the words a player reads or hears, not on the names of the model's fields.
      const words = `${textOf(find(markup(view, action), byRegion('action')))} ${describeAction(action, 'seat-1') ?? ''}`;
      assert.doesNotMatch(words, /\b(hit|miss|injur|damag|blocked|protected|rescued|disabled|healed|killed|eliminat|succe|fail)/i, `${kind} ${action.step}`);
      assert.deepEqual(auditMarkup(markup(view, action)), [], `${kind} ${action.step}: structure`);
    }
  }
});

test('while the server says this seat is in a Hack, the open panel says who with, and nothing else does', () => {
  const inHack = playerView(view => { view.hackPartnerSeatId = 'seat-4'; view.phase = { ...view.phase, kind: 'HACK' }; });
  const open = model(inHack);
  assert.equal(open.match.privateArea.content.hack, 'Hack: you and Player 4.');
  assert.equal(textOf(find(renderConnectedPlayerShell(open), byId('ms-hack-with'))), 'Hack: you and Player 4.');
  assert.equal(model(playerView()).match.privateArea.content.hack, null);
  assert.equal(findAll(renderConnectedPlayerShell(model(playerView())), byId('ms-hack-with')).length, 0);
  // Closed, or on the table, nobody is told who is in it.
  const shut = model(inHack, IDLE, closed);
  assert.equal(shut.match.privateArea.content, null);
  assert.doesNotMatch(toHtml(renderConnectedPlayerShell(shut)), /Player 4\.|ms-hack-with/);
  const table = toHtml(renderTableShell(buildTableShellModel({ ...environment, view: publicView(view => { view.phase = { ...view.phase, kind: 'HACK' }; }) })));
  assert.doesNotMatch(table, /you and Player|ms-hack-with/);
});

test('a control can ask to open any of these actions and nothing that is not one', () => {
  for (const kind of ACTION_KINDS) assert.deepEqual(parseShellIntent('action/open', { kind }), { type: 'action/open', kind });
  for (const kind of ['vote', 'scan', 'supply', 'REGISTER_SHOT', '', undefined]) assert.equal(parseShellIntent('action/open', { kind }), null, String(kind));
});

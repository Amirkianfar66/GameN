import assert from 'node:assert/strict';
import test from 'node:test';
import { FullCommandRequestSchema } from '@mothership/contracts';
import { createConnectedPlayerScreen, createConnectedTableScreen, DEFAULT_ACTION_FLOW_TIMING, DEFAULT_CATCH_UP_TIMING } from '@mothership/game';
import { renderConnectedPlayerShell, SHELL_IDS, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView, publicView } from './support/connected.mjs';

// The connected phone and table as their controllers run them: snapshots and intents in,
// frames out, against a transport whose every delivery and answer the test scripts. No
// backend is involved; the emulator-connected tests are a separate suite.

const GUARD = DEFAULT_ACTION_FLOW_TIMING.controlGuardMs;
const TOGGLE = { type: 'private/toggle' };
const OWN = { kind: 'player-view', matchId: MATCH };
const PUBLIC = { kind: 'public-view', matchId: MATCH };

function setup(surface = 'player', { kept = null } = {}) {
  const host = createFakeHost({ serverStart: EPOCH });
  host.kept = kept;
  const fake = createFakeConnectedTransport(host);
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const options = { transport: fake.transport, matchId: MATCH, ports: host.ports, host: { reload() {} } };
  const screen = surface === 'player' ? createConnectedPlayerScreen({ ...options, seatId: 'seat-1' }) : createConnectedTableScreen(options);
  const frames = [];
  screen.subscribe(() => frames.push(screen.getFrame()));
  const frame = () => screen.getFrame();
  const card = () => frame().model.match?.privateArea.content?.actions.card ?? null;
  const receipt = (request, status = 'accepted', code = 'REGISTERED') => ({ ok: true, serverTimeMs: host.serverNow(), receipt: { protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId, status, code } });
  return { host, fake, screen, frames, frame, card, receipt, html: () => toHtml(renderConnectedPlayerShell(frame().model)) };
}

test('a connected phone is connecting until the server confirms its own view, then shows the match labeled as the emulator', async () => {
  const s = setup();
  assert.equal(s.frame().model.screen, 'connecting');
  s.screen.start();
  assert.equal(s.fake.listeners(OWN), 1, 'It listens to its own private view and nothing else');
  assert.equal(s.fake.listeners(PUBLIC), 0);
  await s.fake.deliver(OWN, null);
  assert.equal(s.frame().model.screen, 'connecting', 'No view yet, before the match starts');
  await s.fake.deliver(OWN, playerView());
  const { model } = s.frame();
  assert.deepEqual([model.screen, model.connection, model.mode, model.match.identity.label], ['match', 'live', 'emulator', 'Player 1']);
  assert.equal(model.banners.some(banner => banner.variant === 'emulator'), true);
  assert.equal(model.banners.some(banner => banner.variant === 'fixture'), false, 'Never labeled as the fixture');
  assert.equal(model.match.roster.zones.flatMap(zone => zone.seats).length, 7, 'Seven seats, as the view says');
  // Server time is asked for this match, and the countdown comes from it.
  assert.deepEqual(s.fake.callsTo('v1ServerTime')[0], { protocolVersion: 2, matchId: MATCH });
  assert.equal(model.match.phase.timer.display, '1:00');
  assert.equal(model.match.privateArea.content, null, 'Nothing private until the player asks');
});

test('only a snapshot the server confirmed makes the view current; a cached one is shown as the last known state', async () => {
  const s = setup();
  s.screen.start();
  // From a cache: readable, kept, and not current.
  await s.fake.deliver(OWN, playerView(), false);
  assert.deepEqual([s.frame().model.screen, s.frame().model.connection], ['match', 'stale']);
  assert.equal(s.frame().model.banners.some(banner => banner.variant === 'stale'), true);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().body.offers.every(offer => offer.open === null), true, 'Nothing can be started on it');
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.equal(s.card().status, 'idle');
  // The server's confirmation arrives without the bytes changing.
  await s.fake.deliver(OWN, playerView(), true);
  assert.equal(s.frame().model.connection, 'live');
  assert.notEqual(s.card().body.offers[0].open, null);
  // The listener fails: stale again, and actions are withdrawn.
  await s.fake.fail(OWN);
  assert.equal(s.frame().model.connection, 'stale');
  assert.equal(s.card().body.offers.every(offer => offer.open === null), true);
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'Actions are paused until the connection is restored.');
});

test('a view for another seat, or a public view, never becomes this phone’s view', async () => {
  const other = setup();
  other.screen.start();
  await other.fake.deliver(OWN, playerView('seat-2'));
  assert.equal(other.frame().model.screen, 'connecting');
  assert.equal(other.frame().model.banners.some(banner => banner.variant === 'unreadable'), true);
  await other.fake.deliver(OWN, publicView());
  assert.equal(other.frame().model.match, null);
  // Once it holds its own view, another seat's is refused and nothing of it is shown.
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  await s.fake.deliver(OWN, playerView('seat-2', view => { view.viewRevision += 1; }));
  assert.equal(s.frame().model.match.identity.label, 'Player 1');
  assert.equal(s.frame().model.banners.some(banner => banner.variant === 'unreadable'), true);
});

test('a move by intents alone: the server’s destination, one command, the receipt, and private words for it', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'idle');
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.deepEqual([s.card().status, s.frame().focus.targetId], ['choosing', SHELL_IDS.actionStep]);
  // A name the server does not offer is not a choice.
  s.screen.dispatch({ type: 'action/choose', value: 'Command Room' });
  s.screen.dispatch({ type: 'action/choose', value: 'seat-2' });
  assert.equal(s.card().status, 'choosing');
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  assert.deepEqual([s.card().status, s.card().body.prompt, s.card().body.confirm.disabled], ['confirming', 'Move to Room B?', true]);
  s.screen.dispatch({ type: 'action/confirm' });
  assert.deepEqual(s.fake.callsTo('v1Command'), [], 'Not before the control is active');
  await s.host.advance(GUARD);
  assert.equal(s.card().body.confirm.disabled, false);

  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  const sent = s.fake.callsTo('v1Command');
  assert.equal(sent.length, 1, 'One confirmation, one command');
  assert.deepEqual(FullCommandRequestSchema.parse(sent[0]), sent[0]);
  assert.deepEqual([sent[0].phaseId, sent[0].command], ['phase-one', { type: 'MOVE', destination: 'Room B' }]);
  assert.deepEqual([s.card().status, s.card().body.text], ['accepted', 'Move to Room B accepted.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Move to Room B accepted.');
  assert.doesNotMatch(s.frame().announcement?.text ?? '', /Moved|Room B/, 'Nothing about it on the public channel');
  // The authoritative view then shows the move; the card goes back to what the server offers.
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; view.seats[0].location = 'Room B'; view.self.movementDestinations = []; }));
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/dismiss' });
  assert.deepEqual(s.card().body.offers[0], { kind: 'move', label: 'Move', statusLabel: 'Not available', open: null });
  assert.equal(s.frame().model.match.location.name, 'Room B');
});

test('a role action by intents alone: listed only when the view opens it, the server’s targets, one command, and words that name no outcome', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch(TOGGLE);
  assert.deepEqual(s.card().body.offers.map(offer => offer.kind), ['move', 'shot'], 'Nothing of any role’s action while the view opens none');
  s.screen.dispatch({ type: 'action/open', kind: 'protect' });
  assert.equal(s.card().status, 'idle', 'An action the view does not open cannot be opened');

  // The server opens Protection for this seat, with its own seat among the targets.
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; view.legalTargets = { PROTECT: ['seat-3', 'seat-1'] }; }));
  assert.deepEqual(s.card().body.offers.map(offer => [offer.kind, offer.statusLabel]), [['move', 'Available'], ['shot', 'Not available'], ['protect', 'Available']]);
  s.screen.dispatch({ type: 'action/open', kind: 'protect' });
  assert.deepEqual(s.card().body.choices.map(choice => choice.label), ['Player 1 (you)', 'Player 3']);
  s.screen.dispatch({ type: 'action/choose', value: 'seat-9' });
  assert.equal(s.card().status, 'choosing', 'A seat the server does not list is not a choice');
  s.screen.dispatch({ type: 'action/choose', value: 'seat-1' });
  assert.deepEqual([s.card().status, s.card().body.prompt], ['confirming', 'Register Protection for yourself?']);
  await s.host.advance(GUARD);
  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  const [sent] = s.fake.callsTo('v1Command');
  assert.equal(FullCommandRequestSchema.safeParse(sent).success, true);
  assert.deepEqual(sent.command, { type: 'PROTECT', targetSeatId: 'seat-1' });
  assert.deepEqual([s.card().status, s.card().body.text, s.card().body.detail], ['accepted', 'Protection for yourself registered.', 'This is not a result. Registered actions are resolved at the end of the round.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Protection for yourself registered.');
  assert.equal(s.frame().announcement.text.includes('Protection'), false, 'Nothing of it is said on the public channel');
  // Closed, nothing of it is in the frame or the document.
  s.screen.dispatch(TOGGLE);
  assert.doesNotMatch(`${JSON.stringify(s.frame())} ${s.html()}`, /Protection|PROTECT|ms-action-open-protect/);
});

const VOTERS = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7'];
/** A Jail vote as one seat's own view and as the public view. Synthetic: no rule produced it. */
const jailVoteFacts = view => {
  view.viewRevision += 1;
  view.phase = { ...view.phase, id: 'phase-jail-vote', kind: 'JAIL_VOTE' };
  view.activeSeatId = null;
  view.ballot = { eligibleVoters: [...VOTERS], eligibleTargets: ['seat-3', 'seat-5', 'seat-1'], releaseTargetSeatId: null };
};
const jailVote = (change = () => {}) => playerView('seat-1', view => {
  jailVoteFacts(view);
  view.self.movementDestinations = [];
  view.legalTargets = { VOTE: ['seat-3', 'seat-5', 'seat-1'] };
  change(view);
});

test('a ballot by intents alone: offered when the view opens it, one command, and afterwards the server’s own statement of the ballot, privately', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'vote' });
  assert.equal(s.card().status, 'idle', 'No vote is open, so none can be started');

  await s.fake.deliver(OWN, jailVote());
  assert.deepEqual(s.card().body.offers.map(offer => [offer.kind, offer.statusLabel]), [['move', 'Not available'], ['shot', 'Not available'], ['vote', 'Available']]);
  // What every audience may know of the vote is outside the private panel.
  assert.deepEqual(s.frame().model.match.vote.current, { title: 'Jail vote', lines: ['Can be voted into Jail: Player 1, Player 3, Player 5.', '7 players may vote.'] });
  s.screen.dispatch({ type: 'action/open', kind: 'vote' });
  assert.deepEqual(s.card().body.choices.map(choice => choice.label), ['Player 1 (you)', 'Player 3', 'Player 5', 'Abstain']);
  for (const value of ['seat-2', 'yes', 'Room B', 'abstain']) {
    s.screen.dispatch({ type: 'action/choose', value });
    assert.equal(s.card().status, 'choosing', `${value} is not an answer the server offers for this vote`);
  }
  s.screen.dispatch({ type: 'action/choose', value: 'none' });
  assert.deepEqual([s.card().status, s.card().body.prompt], ['confirming', 'Abstain from this vote?']);
  s.screen.dispatch({ type: 'action/back' });
  s.screen.dispatch({ type: 'action/choose', value: 'seat-5' });
  assert.deepEqual([s.card().status, s.card().body.prompt], ['confirming', 'Vote to send Player 5 to Jail?']);
  await s.host.advance(GUARD);
  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  assert.equal(s.fake.callsTo('v1Command').length, 1, 'One confirmation, one ballot');
  const [sent] = s.fake.callsTo('v1Command');
  assert.equal(FullCommandRequestSchema.safeParse(sent).success, true);
  assert.deepEqual([sent.phaseId, sent.command], ['phase-jail-vote', { type: 'VOTE', targetSeatId: 'seat-5' }]);
  assert.deepEqual([s.card().status, s.card().body.text, s.card().body.detail], ['accepted', 'Your vote for Player 5 is recorded.', 'This is not a result. The count is shown to everyone when the vote closes.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Your vote for Player 5 is recorded.');
  assert.doesNotMatch(s.frame().announcement.text, /Player 5|vote for|recorded/, 'Nothing of the ballot is said on the public channel');
  assert.doesNotMatch(JSON.stringify(s.frame().model.match.vote), /Player 5 is|recorded|Your/, 'Nor shown in the public voting panel');

  // The server's next view says this seat has voted, and how. The card is put away; the ballot stays shown from the view.
  await s.fake.deliver(OWN, jailVote(view => { view.viewRevision += 1; view.legalTargets = {}; view.hasVoted = true; view.ownBallot = 'seat-5'; }));
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/dismiss' });
  assert.deepEqual(s.card().body.offers.map(offer => offer.kind), ['move', 'shot'], 'The server offers no second ballot');
  assert.equal(s.frame().model.match.privateArea.content.ballot, 'Your ballot in this vote: Player 5.');
  s.screen.dispatch({ type: 'action/open', kind: 'vote' });
  assert.equal(s.card().status, 'idle');
  assert.equal(s.fake.callsTo('v1Command').length, 1);
  // Nothing of the ballot was ever in what the page keeps.
  assert.equal(s.host.everKept.some(record => /VOTE|seat-5/.test(record)), false);
  assert.equal(s.host.kept, null);
  // Closed, nothing of it is in the frame or the document; what is public about the vote still is.
  s.screen.dispatch(TOGGLE);
  assert.doesNotMatch(`${JSON.stringify(s.frame())} ${s.html()}`, /Your ballot|vote for Player 5|ms-own-ballot|ms-action-open-vote/);
  assert.match(s.html(), /Can be voted into Jail: Player 1, Player 3, Player 5\./);
});

test('the connected table shows what is being voted on and the count the server publishes, and nothing of any ballot', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.deliver(PUBLIC, publicView(jailVoteFacts));
  assert.deepEqual(s.frame().model.match.vote, { heading: 'Voting', current: { title: 'Jail vote', lines: ['Can be voted into Jail: Player 1, Player 3, Player 5.', '7 players may vote.'] }, lastTally: null });
  // The vote closes: the next public view carries the count, and the display says it once.
  await s.fake.deliver(PUBLIC, publicView(view => {
    view.viewRevision += 2;
    view.round = 2;
    view.phase = { ...view.phase, id: 'phase-two', kind: 'ORDINARY_TURN' };
    view.seats[4] = { ...view.seats[4], jailed: true, location: 'Jail' };
    view.lastTally = { kind: 'JAIL_VOTE', counts: { 'seat-1': 0, 'seat-3': 1, 'seat-5': 4 }, eligibleVoterCount: 7, yesCount: null, selectedSeatId: 'seat-5', released: null };
  }));
  const { vote } = s.frame().model.match;
  assert.equal(vote.current, null);
  assert.deepEqual(vote.lastTally.counts.map(row => [row.label, row.votes]), [['Player 1', 0], ['Player 3', 1], ['Player 5', 4]]);
  assert.deepEqual(vote.lastTally.lines, ['7 players could vote.', 'Abstained or did not vote: 2.', 'Sent to Jail: Player 5.']);
  assert.match(s.frame().announcement.text, /Jail vote counted\. Sent to Jail: Player 5\./);
  assert.doesNotMatch(JSON.stringify(s.frame()), /Your ballot|ownBallot|hasVoted|legalTargets/);
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
});

test('a Scan by intents alone: a seat, then a guess, one command, and the result read from the server’s view in the private panel', async () => {
  const s = setup();
  s.screen.start();
  // A seat that may scan: the server lists who. (The role is the one the schema lets hold scan results.)
  const scanner = (change = () => {}) => playerView('seat-1', view => {
    view.self.role = 'Hacker';
    view.self.rescuesRemaining = 0;
    view.knowledge.undercoverSeatId = 'seat-4';
    view.legalTargets = { SCAN: ['seat-3', 'seat-1'] };
    change(view);
  });
  await s.fake.deliver(OWN, scanner());
  s.screen.dispatch(TOGGLE);
  assert.deepEqual(s.frame().model.match.privateArea.content.knowledge.items, ['The Undercover is Player 4.', 'Ordinary weapons you hold: 0.']);
  assert.deepEqual(s.card().body.offers.map(offer => [offer.kind, offer.statusLabel]), [['move', 'Available'], ['shot', 'Not available'], ['scan', 'Available']]);
  s.screen.dispatch({ type: 'action/open', kind: 'scan' });
  assert.deepEqual([s.card().status, s.card().body.prompt, s.card().body.choices.map(choice => choice.label)], ['choosing', 'Who do you scan?', ['Player 1 (you)', 'Player 3']]);
  for (const value of ['seat-2', 'Red', 'none']) {
    s.screen.dispatch({ type: 'action/choose', value });
    assert.equal(s.card().body.prompt, 'Who do you scan?', `${value} is not offered as the first part`);
  }
  s.screen.dispatch({ type: 'action/choose', value: 'seat-3' });
  assert.deepEqual([s.card().status, s.card().body.prompt, s.card().body.progress, s.card().body.choices.map(choice => choice.label)], ['choosing', 'Guess a faction for Player 3.', 'Chosen so far: Player 3.', ['Blue', 'Red', 'Alien']]);
  assert.equal(s.frame().focus.targetId, SHELL_IDS.actionStep, 'Focus goes to the new question, not to a control');
  // Undo, and pick again.
  s.screen.dispatch({ type: 'action/back' });
  assert.equal(s.card().body.prompt, 'Who do you scan?');
  s.screen.dispatch({ type: 'action/choose', value: 'seat-3' });
  s.screen.dispatch({ type: 'action/choose', value: 'seat-1' });
  assert.equal(s.card().status, 'choosing', 'A second seat is not a guess');
  s.screen.dispatch({ type: 'action/choose', value: 'Blue' });
  assert.deepEqual([s.card().status, s.card().body.prompt], ['confirming', 'Scan Player 3, guessing Blue?']);
  assert.equal(s.fake.callsTo('v1Command').length, 0, 'Nothing is sent by choosing');
  await s.host.advance(GUARD);
  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  const [sent] = s.fake.callsTo('v1Command');
  assert.equal(FullCommandRequestSchema.safeParse(sent).success, true);
  assert.deepEqual(sent.command, { type: 'SCAN', targetSeatId: 'seat-3', guess: 'Blue' });
  assert.deepEqual([s.card().status, s.card().body.text, s.card().body.detail], ['accepted', 'Scan of Player 3, guessing Blue, accepted.', 'The result is listed under “What you know”, as the server gives it.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Scan of Player 3, guessing Blue, accepted.');
  assert.doesNotMatch(s.frame().announcement.text, /Scan|Player 3|Blue/, 'Nothing of it is said on the public channel');

  // The result is whatever the server's next view carries, and is shown as that view states it.
  await s.fake.deliver(OWN, scanner(view => {
    view.viewRevision += 1;
    view.legalTargets = {};
    view.knowledge.scanResults = [{ round: 1, targetSeatId: 'seat-3', guess: 'Blue', matched: true, inCode: false }];
  }));
  assert.deepEqual(s.frame().model.match.privateArea.content.knowledge.items, [
    'The Undercover is Player 4.', 'Round 1: you scanned Player 3 and guessed Blue. The guess was right, and that player is not in the Code.', 'Ordinary weapons you hold: 0.',
  ]);
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/dismiss' });
  assert.deepEqual(s.card().body.offers.map(offer => offer.kind), ['move', 'shot'], 'The server offers no second Scan');
  assert.equal(s.fake.callsTo('v1Command').length, 1);
  // Nothing of the Scan or of what is known was ever in what the page keeps.
  assert.equal(s.host.everKept.some(record => /SCAN|seat-3|Blue|Undercover/.test(record)), false);
  // Closed, none of it is in the frame or the document.
  s.screen.dispatch(TOGGLE);
  assert.doesNotMatch(`${JSON.stringify(s.frame())} ${s.html()}`, /What you know|The Undercover is|you scanned|guessing Blue|ms-knowledge|ms-action-open-scan|Hacker/);
});

// The end of a match, as the views say it. Synthetic: no rule produced these.
const endedByHost = view => {
  view.viewRevision += 1;
  view.phase = { id: 'phase-aborted', kind: 'ABORTED', startedAt: view.phase.startedAt, endsAt: null };
  view.activeSeatId = null;
  if ('self' in view) view.self.movementDestinations = [];
};
const END_ROLES = ['Cracker', 'Insider', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const finishedFor = winner => view => {
  view.viewRevision += 1;
  view.round = 5;
  view.phase = { id: 'phase-finished', kind: 'FINISHED', startedAt: view.phase.startedAt, endsAt: null };
  view.activeSeatId = null;
  view.result = { winner, alienCoWinner: false };
  view.endReveal = { roles: END_ROLES.map((role, index) => ({ seatId: `seat-${index + 1}`, role })), code: ['seat-7', 'seat-1', 'seat-2', 'seat-3'] };
  if ('self' in view) view.self.movementDestinations = [];
};

test('when the host ends the match, a phone shows it ended without a winner, reveals nothing, and can start nothing', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.legalTargets = { PROTECT: ['seat-3'] }; }));
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'protect' });
  s.screen.dispatch({ type: 'action/choose', value: 'seat-3' });
  assert.equal(s.card().status, 'confirming');
  assert.equal(s.frame().model.match.result, null);

  await s.fake.deliver(OWN, playerView('seat-1', endedByHost));
  const { match } = s.frame().model;
  assert.deepEqual(match.result, { heading: 'Result', outcome: 'The host ended this match. There is no winner.', lines: [], reveal: null });
  assert.deepEqual([match.phase.phaseLabel, match.phase.timer.state], ['Match ended by the host', 'none']);
  assert.match(s.frame().announcement.text, /The host ended this match\. There is no winner\./);
  // What was being chosen is dropped, the player is told, and nothing can be started.
  assert.deepEqual([s.card().status, match.privateArea.content.actions.notice], ['idle', 'The match is over.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Your choice was not sent.');
  assert.equal(s.card().body.offers.every(offer => offer.open === null), true);
  for (const intent of [{ type: 'action/open', kind: 'move' }, { type: 'action/open', kind: 'protect' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
  await s.host.advance(GUARD);
  assert.equal(s.card().status, 'idle');
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  // No countdown is left, so the phone asks the server to look at no deadline.
  await s.host.advance(180_000);
  assert.deepEqual(s.fake.callsTo('v1Advance'), []);
  // The phone's own role is where it was; the public part of the screen names none.
  assert.equal(match.privateArea.content.role.name, 'Cracker');
  s.screen.dispatch(TOGGLE);
  assert.doesNotMatch(s.html(), /Cracker|The Code was|wins/);
  assert.match(s.html(), /The host ended this match\. There is no winner\./);
});

test('a finished match is shown with the winner and the reveal the server’s view carries, the same on the table and on a phone', async () => {
  const table = setup('table');
  table.screen.start();
  await table.fake.deliver(PUBLIC, publicView(view => { view.round = 5; }));
  assert.equal(table.frame().model.match.result, null);
  assert.doesNotMatch(JSON.stringify(table.frame()), /Cracker|Undercover|Alien/, 'No role is on the display while the match is played');
  await table.fake.deliver(PUBLIC, publicView(finishedFor('Red')));
  const shown = table.frame().model.match.result;
  assert.deepEqual([shown.outcome, shown.lines], ['Red wins.', []]);
  assert.deepEqual(shown.reveal.roles.map(entry => [entry.label, entry.role]), END_ROLES.map((role, index) => [`Player ${index + 1}`, role]));
  assert.equal(shown.reveal.code, 'The Code was: Player 1, Player 2, Player 3, Player 7.');
  assert.match(table.frame().announcement.text, /Round 5\. Match finished\..*Red wins\./);
  await table.host.advance(180_000);
  assert.deepEqual([table.fake.callsTo('v1Advance'), table.fake.callsTo('v1Command')], [[], []]);

  const phone = setup();
  phone.screen.start();
  await phone.fake.deliver(OWN, playerView('seat-1', finishedFor('Red')));
  const own = phone.frame().model.match.result;
  assert.deepEqual([own.outcome, own.reveal.roles.map(entry => entry.role)], ['Red wins.', END_ROLES]);
  assert.equal(own.reveal.roles[0].label, 'Player 1 (you)');
  assert.equal(phone.frame().model.match.privateArea.content, null, 'The result is public; the private panel is still closed');
});

test('with the panel closed nothing of the command is in the frame or the document, and action intents are ignored', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.equal(s.frame().model.match.privateArea.content, null);
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  await s.host.advance(GUARD);
  // Closing the panel drops the unsent choice and leaves nothing private behind.
  s.screen.dispatch(TOGGLE);
  assert.deepEqual([s.frame().model.match.privateArea.content, s.frame().privateAnnouncement, s.frame().focus], [null, null, null]);
  assert.doesNotMatch(s.html(), /Cracker|Move to|ms-card|action\//);
  s.screen.dispatch({ type: 'action/confirm' });
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'idle', 'Opening again does not bring the choice back');
  // Backgrounding does the same.
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.setPageVisible(false);
  assert.equal(s.frame().model.match.privateArea.content, null);
  s.screen.setPageVisible(true);
  assert.equal(s.frame().model.match.privateArea.open, false);
});

test('an unsent choice is cleared when the phase changes, and the player is told it was not sent', async () => {
  const s = setup();
  s.screen.start();
  const view = playerView();
  await s.fake.deliver(OWN, view);
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  await s.fake.deliver(OWN, playerView('seat-1', next => { next.viewRevision += 1; next.phase = { ...next.phase, id: 'phase-two', startedAt: EPOCH + 60_000, endsAt: EPOCH + 120_000 }; next.activeSeatId = 'seat-2'; }));
  assert.equal(s.card().status, 'idle');
  assert.equal(s.frame().privateAnnouncement.text, 'Your choice was not sent.');
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
});

test('a reloaded phone asks about its unresolved command once it has a confirmed view, and sends nothing', async () => {
  const kept = JSON.stringify({ matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: 'kept-command' });
  const s = setup('player', { kept });
  s.screen.start();
  s.fake.respond.v1Receipt = async request => ({ status: 'found', serverTimeMs: s.host.serverNow(), receipt: { protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one', commandId: request.commandId, status: 'accepted', code: 'REGISTERED' } });
  await s.fake.deliver(OWN, playerView());
  assert.deepEqual(s.fake.callsTo('v1Receipt'), [{ protocolVersion: 2, matchId: MATCH, commandId: 'kept-command' }]);
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  assert.equal(s.host.kept, null);
  // The panel is closed after a reload, so nothing was said. Opened, it tells what it knows.
  assert.equal(s.frame().privateAnnouncement, null);
  s.screen.dispatch(TOGGLE);
  assert.deepEqual([s.card().status, s.card().title, s.card().body.text], ['accepted', 'Your action', 'The server accepted your action.']);
  assert.equal(s.frame().privateAnnouncement.text, 'The server accepted your action.');
});

test('the connected table shows public facts only, listens to the public view only, and can send no command', async () => {
  const s = setup('table');
  s.screen.start();
  assert.deepEqual([s.fake.listeners(PUBLIC), s.fake.listeners(OWN)], [1, 0]);
  await s.fake.deliver(PUBLIC, playerView());
  assert.equal(s.frame().model.match, null, 'A private view is unreadable to the table');
  await s.fake.deliver(PUBLIC, publicView());
  const { model } = s.frame();
  assert.deepEqual([model.screen, model.mode, model.match.roster.rows.length], ['match', 'emulator', 7]);
  assert.doesNotMatch(JSON.stringify(s.frame()), /Cracker|role|knowledge|legalTargets/);
  for (const intent of [TOGGLE, { type: 'action/open', kind: 'move' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
  await s.host.advance(120_000);
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  assert.deepEqual(s.fake.callsTo('v1Receipt'), []);
});

test('a snapshot the server confirmed with a lower revision is a match gone backwards: the screen stops, and nothing can be sent', async () => {
  for (const surface of ['player', 'table']) {
    const s = setup(surface);
    const [target, make] = surface === 'player' ? [OWN, change => playerView('seat-1', change)] : [PUBLIC, change => publicView(change)];
    s.screen.start();
    await s.fake.deliver(target, make(view => { view.viewRevision = 9; }));
    assert.deepEqual([s.frame().model.screen, s.frame().model.connection], ['match', 'live'], surface);
    // From a cache, a lower revision proves nothing and is dropped.
    await s.fake.deliver(target, make(view => { view.viewRevision = 4; }), false);
    assert.equal(s.frame().model.screen, 'match', `${surface}: a cached older copy changes nothing`);
    // Confirmed by the server, it is not a replay: the match was restored or replaced.
    await s.fake.deliver(target, make(view => { view.viewRevision = 4; }));
    assert.equal(s.frame().model.screen, 'blocked', surface);
    assert.equal(s.frame().model.blocked.heading, 'Match data check failed');
    assert.equal(s.frame().model.match, null, 'Nothing of the match is shown');
    if (surface === 'player') {
      for (const intent of [TOGGLE, { type: 'action/open', kind: 'move' }, { type: 'action/choose', value: 'Room B' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
      await s.host.advance(GUARD);
      s.screen.dispatch({ type: 'action/confirm' });
      await flush();
      assert.deepEqual(s.fake.callsTo('v1Command'), []);
    }
    // Later data does not clear it: the feed is not trusted again.
    await s.fake.deliver(target, make(view => { view.viewRevision = 12; }));
    assert.equal(s.frame().model.screen, 'blocked');
  }
});

test('without a trusted clock nothing can be started: not knowing the time is not permission', async () => {
  const s = setup();
  // The server's time cannot be had: the request never gets an answer.
  s.fake.respond.v1ServerTime = async () => { throw new Error('unreachable'); };
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  // Ten minutes into a sixty-second phase, as far as anyone can tell.
  await s.host.advance(600_000);
  assert.equal(s.frame().model.match.phase.timer.state, 'syncing');
  s.screen.dispatch(TOGGLE);
  assert.deepEqual(s.card().body.offers.map(offer => [offer.statusLabel, offer.open]), [['Paused', null], ['Not available', null]]);
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'Actions are paused until this device has the server’s time.');
  for (const intent of [{ type: 'action/open', kind: 'move' }, { type: 'action/choose', value: 'Room B' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  assert.equal(s.card().status, 'idle');
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  // Nor does it ask the server to end a phase it cannot tell has ended. Neither does a display.
  assert.deepEqual(s.fake.callsTo('v1Advance'), []);
  const table = setup('table');
  table.fake.respond.v1ServerTime = async () => { throw new Error('unreachable'); };
  table.screen.start();
  await table.fake.deliver(PUBLIC, publicView());
  await table.host.advance(600_000);
  assert.deepEqual(table.fake.callsTo('v1Advance'), []);
});

const NEXT_PHASE = next => {
  next.viewRevision += 1;
  next.phase = { ...next.phase, id: 'phase-two', startedAt: EPOCH + 61_000, endsAt: EPOCH + 121_000 };
  next.activeSeatId = 'seat-2';
};

test('when its countdown ends the display asks the server to look at the deadline; only the next view changes the phase on screen', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.deliver(PUBLIC, publicView());
  s.fake.respond.v1Advance = async request => ({ protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, serverTimeMs: s.host.serverNow(), result: 'advanced' });
  const phase = () => s.frame().model.match.phase;
  await s.host.advance(59_999);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [], 'Nothing is asked while the phase is running');
  await s.host.advance(1 + DEFAULT_CATCH_UP_TIMING.firstDelayMs - 1);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [], 'nor at the instant the countdown reaches zero');
  await s.host.advance(1);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [{ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one' }], 'It names the match and the phase on its screen');
  // The server answered "advanced". That is not a view: the screen still shows the phase it was sent, ended.
  assert.deepEqual([phase().phaseLabel, phase().timer.state], ['Player 1’s turn', 'expired']);
  await s.fake.deliver(PUBLIC, publicView(NEXT_PHASE));
  assert.deepEqual([phase().phaseLabel, phase().timer.state], ['Player 2’s turn', 'running']);
  await s.host.advance(30_000);
  assert.equal(s.fake.callsTo('v1Advance').length, 1, 'With the next phase on screen it has nothing more to ask');
});

test('a phone asks later than a display would, not at all once the next view is here, and never on a view it cannot trust', async () => {
  const late = setup();
  late.screen.start();
  await late.fake.deliver(OWN, playerView());
  await late.host.advance(60_000 + DEFAULT_CATCH_UP_TIMING.playerDelayMs - 1);
  assert.deepEqual(late.fake.callsTo('v1Advance'), [], 'A display on the table would have asked by now');
  await late.host.advance(1);
  assert.deepEqual(late.fake.callsTo('v1Advance'), [{ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one' }]);

  const beaten = setup();
  beaten.screen.start();
  await beaten.fake.deliver(OWN, playerView());
  await beaten.host.advance(60_000 + DEFAULT_CATCH_UP_TIMING.playerDelayMs - 1);
  await beaten.fake.deliver(OWN, playerView('seat-1', NEXT_PHASE));
  await beaten.host.advance(30_000);
  assert.deepEqual(beaten.fake.callsTo('v1Advance'), [], 'The next view arrived first');

  const stale = setup();
  stale.screen.start();
  await stale.fake.deliver(OWN, playerView());
  await stale.fake.fail(OWN);
  await stale.host.advance(300_000);
  assert.deepEqual(stale.fake.callsTo('v1Advance'), [], 'A countdown on a view the server no longer confirms is not a reason to ask');

  const hidden = setup();
  hidden.screen.start();
  await hidden.fake.deliver(OWN, playerView());
  hidden.screen.setPageVisible(false);
  await hidden.host.advance(300_000);
  assert.deepEqual(hidden.fake.callsTo('v1Advance'), [], 'nor does a page nobody is looking at');
});

test('dispose stops the listener, the timers and the command flow', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispose();
  assert.equal(s.fake.listeners(OWN), 0);
  assert.equal(s.host.pendingTimers(), 0);
  const count = s.frames.length;
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; }));
  assert.equal(s.frames.length, count);

  // Also with a deadline catch-up waiting to ask.
  const ended = setup('table');
  ended.screen.start();
  await ended.fake.deliver(PUBLIC, publicView());
  await ended.host.advance(60_000);
  ended.screen.dispose();
  assert.equal(ended.host.pendingTimers(), 0);
  await ended.host.advance(60_000);
  assert.deepEqual(ended.fake.callsTo('v1Advance'), []);
});

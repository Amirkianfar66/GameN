import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTableShellModel, buildVotePanel, choiceValue, createConnectedPlayerAnnouncer, createTableAnnouncer, describeAction, offeredChoices, ownBallotLine,
  parseShellIntent, renderConnectedPlayerShell, renderTableShell, sameChoice, SEAT_BALLOT_COMMANDS, tallyResult, textOf, toHtml,
} from '@mothership/presentation';
import { fixture } from './support/inputs.mjs';
import { auditMarkup, byId, byRegion, find, findAll } from './support/markup-audit.mjs';
import { card, closed, environment, IDLE, input, markup, model, playerView, publicView } from './support/protocol2-views.mjs';

// Voting on the connected phone and the shared display: the Captain election, the Jail vote,
// the Captain's release choice and the vote on it. Synthetic, hand-built protocol 2 views
// that satisfy the shared strict schema. None is the result of an engine, and nothing here
// shows how a vote is counted: the counts are whatever the view says.

const ALL = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7'];
/** The public facts of a voting phase. */
const voting = (kind, targets, more = () => {}) => view => {
  view.phase = { ...view.phase, id: `phase-${kind.toLowerCase()}`, kind };
  view.activeSeatId = null;
  view.ballot = { eligibleVoters: [...ALL], eligibleTargets: targets, releaseTargetSeatId: null };
  if ('self' in view) view.self.movementDestinations = [];
  more(view);
};
/** A voter's own view of a vote the server has opened for them. */
const voter = (kind, targets, more = () => {}) => playerView(voting(kind, targets, view => {
  view.legalTargets = { VOTE: targets };
  more(view);
}));
const jail = (seat, view) => { view.seats[seat - 1] = { ...view.seats[seat - 1], jailed: true, location: 'Jail' }; };
const captain = (seat, view) => { view.seats[seat - 1] = { ...view.seats[seat - 1], captain: true, location: 'Command Room' }; };
/** The Captain's own view of the release choice, with seat 4 in Jail. */
const choosing = (more = () => {}) => playerView(view => {
  voting('RELEASE_CHOICE', ['seat-4'])(view);
  captain(1, view);
  jail(4, view);
  view.activeSeatId = 'seat-1';
  view.ballot.eligibleVoters = [];
  view.legalTargets = { RELEASE_CHOICE: ['seat-4'] };
  more(view);
});
/** A voter's own view of the vote on releasing a seat. */
const releasing = (seat = 4, more = () => {}) => playerView(view => {
  voting('RELEASE_VOTE', [])(view);
  jail(seat, view);
  view.ballot.releaseTargetSeatId = `seat-${seat}`;
  view.self.releaseVoteAvailable = true;
  more(view);
});
const VOTE_3 = { kind: 'vote', targetSeatId: 'seat-3' };
const ABSTAIN = { kind: 'vote', targetSeatId: null };
const ONE_BALLOT = 'This is your one ballot in this vote. You cannot change it once the server accepts it.';
const NOT_A_RESULT = 'This is not a result. The count is shown to everyone when the vote closes.';
const NEXT_PHASE = 'The phase shown at the top of this screen says what happens next.';
/** Words that would state what a vote decided. A ballot's own screens never use them. */
const DECIDED = /\b(elected|is jailed|was jailed|sent to jail|was released|is released|not released|wins|won|lost)\b/i;

test('a ballot is offered only while the server’s view opens it: its own candidates, and always the answer that names nobody', () => {
  assert.deepEqual(SEAT_BALLOT_COMMANDS, { vote: 'VOTE', 'release-choice': 'RELEASE_CHOICE' });
  // Nothing opened: no ballot of any kind, whatever the phase is called.
  for (const kind of ['vote', 'release-choice', 'release-vote']) {
    assert.equal(offeredChoices(playerView(), kind), null, kind);
    assert.equal(offeredChoices(playerView(voting('JAIL_VOTE', ['seat-2'])), kind), null, `${kind}: a voting phase by itself opens nothing`);
  }
  // The server's own list, as given, then the abstention.
  assert.deepEqual(offeredChoices(voter('JAIL_VOTE', ['seat-5', 'seat-1']), 'vote'), [{ kind: 'vote', targetSeatId: 'seat-5' }, { kind: 'vote', targetSeatId: 'seat-1' }, ABSTAIN]);
  // Open with nobody to vote for: the abstention is still a ballot the server accepts.
  assert.deepEqual(offeredChoices(voter('JAIL_VOTE', []), 'vote'), [ABSTAIN]);
  assert.deepEqual(offeredChoices(choosing(), 'release-choice'), [{ kind: 'release-choice', targetSeatId: 'seat-4' }, { kind: 'release-choice', targetSeatId: null }]);
  // A list under one ballot's command opens nothing for the other.
  assert.equal(offeredChoices(voter('JAIL_VOTE', ['seat-5']), 'release-choice'), null);
  assert.equal(offeredChoices(choosing(), 'vote'), null);
  // A release vote is opened by the view's own flag, and has three answers and no seat.
  assert.deepEqual(offeredChoices(releasing(), 'release-vote'), [{ kind: 'release-vote', approve: true }, { kind: 'release-vote', approve: false }, { kind: 'release-vote', approve: null }]);
  assert.equal(offeredChoices(releasing(4, view => { view.self.releaseVoteAvailable = false; }), 'release-vote'), null);
  assert.equal(offeredChoices(releasing(), 'vote'), null, 'A release vote is not a vote for a seat');
  // The actions that name one seat are untouched by a ballot's list.
  for (const kind of ['shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot']) assert.equal(offeredChoices(voter('JAIL_VOTE', ['seat-5']), kind), null, kind);
});

test('a control carries one short name for a choice, and no two choices of one action share it', () => {
  assert.deepEqual(offeredChoices(voter('JAIL_VOTE', ['seat-5', 'seat-1']), 'vote').map(choiceValue), ['seat-5', 'seat-1', 'none']);
  assert.deepEqual(offeredChoices(choosing(), 'release-choice').map(choiceValue), ['seat-4', 'none']);
  assert.deepEqual(offeredChoices(releasing(), 'release-vote').map(choiceValue), ['yes', 'no', 'none']);
  assert.equal(choiceValue({ kind: 'move', destination: 'Room B' }), 'Room B');
  assert.equal(choiceValue({ kind: 'shot', targetSeatId: 'seat-3' }), 'seat-3');
  assert.equal(sameChoice(VOTE_3, { kind: 'vote', targetSeatId: 'seat-3' }), true);
  assert.equal(sameChoice(VOTE_3, ABSTAIN), false);
  // The same seat or the same "nobody" under another action is another choice.
  assert.equal(sameChoice(VOTE_3, { kind: 'shot', targetSeatId: 'seat-3' }), false);
  assert.equal(sameChoice(ABSTAIN, { kind: 'release-choice', targetSeatId: null }), false);
  assert.equal(sameChoice(ABSTAIN, { kind: 'release-vote', approve: null }), false);
  assert.equal(sameChoice({ kind: 'release-vote', approve: false }, { kind: 'release-vote', approve: null }), false);
  // A control may ask to open a ballot and carry any of these names.
  for (const kind of ['vote', 'release-choice', 'release-vote']) assert.deepEqual(parseShellIntent('action/open', { kind }), { type: 'action/open', kind });
  for (const value of ['none', 'yes', 'no', 'seat-7']) assert.deepEqual(parseShellIntent('action/choose', { value }), { type: 'action/choose', value });
});

test('the idle card lists a ballot only while it is open, and never on a view or a clock this device cannot vouch for', () => {
  const expected = {
    vote: { view: voter('JAIL_VOTE', ['seat-3']), label: 'Vote', open: 'Cast your ballot' },
    'release-choice': { view: choosing(), label: 'Release request', open: 'Choose' },
    'release-vote': { view: releasing(), label: 'Release vote', open: 'Cast your ballot' },
  };
  for (const [kind, { view, label, open }] of Object.entries(expected)) {
    const offers = card(view).body.offers;
    assert.deepEqual(offers.map(offer => offer.kind), ['move', 'shot', kind]);
    assert.deepEqual(offers[2], { kind, label, statusLabel: 'Available', open: { id: `ms-action-open-${kind}`, label: open } });
    for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }, { deadline: { kind: 'unsynced' } }]) {
      assert.deepEqual(card(view, IDLE, overrides).body.offers[2], { kind, label, statusLabel: 'Paused', open: null }, kind);
    }
    // Closed, nothing of it is in the model or the document.
    const shut = model(view, IDLE, closed);
    assert.equal(shut.match.privateArea.content, null);
    assert.equal(toHtml(renderConnectedPlayerShell(shut)).includes(`ms-action-open-${kind}`), false, kind);
    assert.deepEqual(auditMarkup(markup(view)), [], kind);
  }
  // Outside a vote the card is what it was: a move and a shot.
  assert.deepEqual(card(playerView()).body.offers.map(offer => offer.kind), ['move', 'shot']);
  // Once the server's view no longer opens the ballot, it is not listed.
  assert.deepEqual(card(playerView(voting('JAIL_VOTE', ['seat-3'], view => { view.hasVoted = true; view.ownBallot = 'seat-3'; }))).body.offers.map(offer => offer.kind), ['move', 'shot']);
});

test('a vote asks what the server’s phase says it is about, lists the candidates in seat order with the abstention last, and confirms in those words', () => {
  const cases = [
    ['CAPTAIN_ELECTION', 'Who do you vote for as Captain?', 'Vote for Player 3 as Captain?', 'Vote for yourself as Captain?'],
    ['JAIL_VOTE', 'Who do you vote to send to Jail?', 'Vote to send Player 3 to Jail?', 'Vote to send yourself to Jail?'],
  ];
  for (const [kind, prompt, confirm, confirmSelf] of cases) {
    const view = voter(kind, ['seat-5', 'seat-1', 'seat-3'], next => { next.seats[4] = { ...next.seats[4], health: 'Injured', location: 'Hospital' }; });
    const picking = card(view, { step: 'choosing', kind: 'vote' });
    assert.deepEqual([picking.title, picking.status, picking.body.prompt], ['Vote', 'choosing', prompt], kind);
    assert.deepEqual(picking.body.choices.map(choice => [choice.value, choice.label, choice.number, choice.detail]), [
      ['seat-1', 'Player 1 (you)', 1, 'Healthy'], ['seat-3', 'Player 3', 3, 'Healthy'], ['seat-5', 'Player 5', 5, 'Injured'], ['none', 'Abstain', null, null],
    ], 'A candidate is described by public status only');
    assert.deepEqual(picking.body.choices.map(choice => choice.id), ['ms-action-choice-seat-1', 'ms-action-choice-seat-3', 'ms-action-choice-seat-5', 'ms-action-choice-none']);

    const confirming = card(view, { step: 'confirming', choice: VOTE_3, armed: true });
    assert.deepEqual([confirming.body.prompt, confirming.body.consequence, confirming.body.confirm.label, confirming.body.confirm.intent], [confirm, ONE_BALLOT, 'Cast ballot', 'action/confirm'], kind);
    assert.equal(card(view, { step: 'confirming', choice: { kind: 'vote', targetSeatId: 'seat-1' }, armed: true }).body.prompt, confirmSelf, 'Self-voting is the server’s to allow; the phone names the seat as the player’s own');
    const abstaining = card(view, { step: 'confirming', choice: ABSTAIN, armed: false });
    assert.deepEqual([abstaining.body.prompt, abstaining.body.consequence, abstaining.body.confirm.disabled], ['Abstain from this vote?', ONE_BALLOT, true]);
    assert.equal(card(view, { step: 'submitting', choice: VOTE_3 }).body.text, 'Sending your ballot to the server…');

    const accepted = card(view, { step: 'accepted', choice: VOTE_3, armed: true });
    assert.deepEqual([accepted.status, accepted.body.text, accepted.body.detail], ['accepted', 'Your vote for Player 3 is recorded.', NOT_A_RESULT], kind);
    assert.equal(card(view, { step: 'accepted', choice: { kind: 'vote', targetSeatId: 'seat-1' }, armed: true }).body.text, 'Your vote for yourself is recorded.');
    assert.equal(card(view, { step: 'accepted', choice: ABSTAIN, armed: true }).body.text, 'Your abstention is recorded.');
    assert.equal(describeAction({ step: 'accepted', choice: VOTE_3, armed: true }, 'seat-1'), 'Your vote for Player 3 is recorded.', 'The spoken line is the card’s line');

    for (const action of [
      { step: 'choosing', kind: 'vote' }, { step: 'confirming', choice: VOTE_3, armed: true }, { step: 'confirming', choice: ABSTAIN, armed: true }, { step: 'submitting', choice: VOTE_3 },
      { step: 'accepted', choice: VOTE_3, armed: true }, { step: 'accepted', choice: ABSTAIN, armed: true }, { step: 'rejected', choice: VOTE_3, code: 'NOT_ALLOWED', armed: true },
      { step: 'unknown', choice: VOTE_3, recovered: false, phaseOver: false, armed: true },
    ]) {
      assert.deepEqual(auditMarkup(markup(view, action)), [], `${kind} ${action.step}: structure`);
      // A ballot is not a count: none of its screens says what the vote decided.
      assert.doesNotMatch(`${textOf(find(markup(view, action), byRegion('action')))} ${describeAction(action, 'seat-1') ?? ''}`, DECIDED, `${kind} ${action.step}`);
    }
  }
  // A vote the server opens in a phase this screen has no words for is still a vote.
  const other = playerView(view => { view.legalTargets = { VOTE: ['seat-3'] }; });
  assert.equal(card(other, { step: 'choosing', kind: 'vote' }).body.prompt, 'Who do you vote for?');
  assert.equal(card(other, { step: 'confirming', choice: VOTE_3, armed: true }).body.prompt, 'Vote for Player 3?');
});

test('the Captain’s release choice lists the jailed players the server offers and “no request”, and says what asking uses up', () => {
  const view = choosing();
  const picking = card(view, { step: 'choosing', kind: 'release-choice' });
  assert.deepEqual([picking.title, picking.body.prompt], ['Release request', 'Ask for a release vote for which jailed player?']);
  assert.deepEqual(picking.body.choices.map(choice => [choice.value, choice.label, choice.number, choice.detail]), [['seat-4', 'Player 4', 4, 'Healthy, Jailed'], ['none', 'No release request', null, null]]);

  const asking = card(view, { step: 'confirming', choice: { kind: 'release-choice', targetSeatId: 'seat-4' }, armed: true });
  assert.deepEqual([asking.body.prompt, asking.body.confirm.label], ['Ask for a vote on releasing Player 4 from Jail?', 'Confirm choice']);
  // The approved rule (V1-11): one request in a match, used by asking whatever the vote decides.
  assert.equal(asking.body.consequence, 'The Captain has one release request in a match. This uses it, whatever the vote decides. You cannot change it once the server accepts it.');
  const declining = card(view, { step: 'confirming', choice: { kind: 'release-choice', targetSeatId: null }, armed: true });
  assert.deepEqual([declining.body.prompt, declining.body.consequence], ['Make no release request now?', 'The release request stays unused. You cannot change this choice once the server accepts it.']);
  assert.equal(card(view, { step: 'submitting', choice: { kind: 'release-choice', targetSeatId: 'seat-4' } }).body.text, 'Sending your choice to the server…');

  const asked = card(view, { step: 'accepted', choice: { kind: 'release-choice', targetSeatId: 'seat-4' }, armed: true });
  assert.deepEqual([asked.body.text, asked.body.detail], ['Release vote for Player 4 requested.', NEXT_PHASE]);
  const declined = card(view, { step: 'accepted', choice: { kind: 'release-choice', targetSeatId: null }, armed: true });
  assert.deepEqual([declined.body.text, declined.body.detail], ['Your choice is recorded: no release request.', NEXT_PHASE]);
  for (const action of [{ step: 'choosing', kind: 'release-choice' }, { step: 'confirming', choice: { kind: 'release-choice', targetSeatId: 'seat-4' }, armed: true }, { step: 'accepted', choice: { kind: 'release-choice', targetSeatId: 'seat-4' }, armed: true }]) {
    assert.deepEqual(auditMarkup(markup(view, action)), [], action.step);
    assert.doesNotMatch(textOf(find(markup(view, action), byRegion('action'))), DECIDED, action.step);
  }
});

test('a release vote names the jailed player the public ballot names, offers yes, no and an abstention, and reports only the ballot', () => {
  const view = releasing();
  const picking = card(view, { step: 'choosing', kind: 'release-vote' });
  assert.deepEqual([picking.title, picking.body.prompt], ['Release vote', 'Release Player 4 from Jail?']);
  assert.deepEqual(picking.body.choices.map(choice => [choice.value, choice.label, choice.number, choice.detail]), [['yes', 'Yes, release', null, null], ['no', 'No, do not release', null, null], ['none', 'Abstain', null, null]]);
  const answers = [[true, 'Vote yes to releasing Player 4?', 'Your vote is recorded: yes.'], [false, 'Vote no to releasing Player 4?', 'Your vote is recorded: no.'], [null, 'Abstain from this vote?', 'Your abstention is recorded.']];
  for (const [approve, confirm, accepted] of answers) {
    const choice = { kind: 'release-vote', approve };
    const confirming = card(view, { step: 'confirming', choice, armed: true });
    assert.deepEqual([confirming.body.prompt, confirming.body.consequence, confirming.body.confirm.label], [confirm, ONE_BALLOT, 'Cast ballot']);
    const done = card(view, { step: 'accepted', choice, armed: true });
    assert.deepEqual([done.body.text, done.body.detail], [accepted, NOT_A_RESULT]);
    assert.doesNotMatch(`${confirming.body.prompt} ${done.body.text} ${done.body.detail}`, DECIDED);
    assert.deepEqual(auditMarkup(markup(view, { step: 'confirming', choice, armed: true })), []);
  }
  // A jailed player votes too. When the vote is on their own release, the phone says so in the second person.
  const own = releasing(1);
  assert.equal(card(own, { step: 'choosing', kind: 'release-vote' }).body.prompt, 'Release yourself from Jail?');
  assert.equal(card(own, { step: 'confirming', choice: { kind: 'release-vote', approve: true }, armed: true }).body.prompt, 'Vote yes to releasing yourself?');
  // A ballot the server opens without naming its subject is still asked, without a name.
  const unnamed = releasing(4, next => { next.ballot.releaseTargetSeatId = null; });
  assert.equal(card(unnamed, { step: 'choosing', kind: 'release-vote' }).body.prompt, 'Release the jailed player this vote is on?');
  assert.equal(card(unnamed, { step: 'confirming', choice: { kind: 'release-vote', approve: false }, armed: true }).body.prompt, 'Vote no to the release?');
});

test('the player’s own ballot is shown from the server’s view, inside the open private panel and nowhere else', () => {
  const voted = (kind, ballot, more = () => {}) => playerView(voting(kind, ['seat-3', 'seat-1'], view => { view.hasVoted = true; view.ownBallot = ballot; more(view); }));
  const lines = [
    [voted('JAIL_VOTE', 'seat-3'), 'Your ballot in this vote: Player 3.'],
    [voted('CAPTAIN_ELECTION', 'seat-1'), 'Your ballot in this vote: yourself.'],
    [voted('JAIL_VOTE', null), 'Your ballot in this vote: an abstention.'],
    [voted('RELEASE_VOTE', true, view => { jail(4, view); view.ballot.releaseTargetSeatId = 'seat-4'; }), 'Your ballot in this vote: yes.'],
    [voted('RELEASE_VOTE', false, view => { jail(4, view); view.ballot.releaseTargetSeatId = 'seat-4'; }), 'Your ballot in this vote: no.'],
    [voted('RELEASE_VOTE', null, view => { jail(4, view); view.ballot.releaseTargetSeatId = 'seat-4'; }), 'Your ballot in this vote: an abstention.'],
  ];
  for (const [view, line] of lines) {
    assert.equal(ownBallotLine(view), line);
    const open = model(view);
    assert.equal(open.match.privateArea.content.ballot, line);
    assert.equal(textOf(find(renderConnectedPlayerShell(open), byId('ms-own-ballot'))), line);
    assert.deepEqual(auditMarkup(renderConnectedPlayerShell(open)), []);
    // The public panel on the same phone says nothing of it.
    assert.doesNotMatch(JSON.stringify(open.match.vote), /Your ballot|yourself/);
    // Closed, it is not in the model or the document.
    const shut = model(view, IDLE, closed);
    assert.equal(shut.match.privateArea.content, null);
    assert.doesNotMatch(toHtml(renderConnectedPlayerShell(shut)), /Your ballot|ms-own-ballot/);
    // Backgrounded while open: the same.
    assert.doesNotMatch(toHtml(renderConnectedPlayerShell(model(view, IDLE, { privacy: { concealed: true, revealed: true } }))), /Your ballot|ms-own-ballot/);
  }
  // The view does not say this seat has voted: nothing is claimed, whatever else it holds.
  assert.equal(ownBallotLine(voter('JAIL_VOTE', ['seat-3'])), null);
  assert.equal(model(voter('JAIL_VOTE', ['seat-3'])).match.privateArea.content.ballot, null);
  assert.equal(findAll(markup(voter('JAIL_VOTE', ['seat-3'])), byId('ms-own-ballot')).length, 0);
  assert.equal(ownBallotLine(playerView(view => { view.ownBallot = 'seat-3'; })), null, 'A ballot without the server saying the seat voted is not shown');
});

const table = view => buildTableShellModel({ ...environment, view });
const JAIL_TALLY = { kind: 'JAIL_VOTE', counts: { 'seat-5': 1, 'seat-3': 4, 'seat-1': 0 }, eligibleVoterCount: 7, yesCount: null, selectedSeatId: 'seat-3', released: null };

test('every audience is told what is being voted on, in the same words, from the public ballot alone', () => {
  // No vote and no count: nothing to say, and the region is there and empty.
  assert.equal(table(publicView()).match.vote, null);
  assert.equal(model(playerView()).match.vote, null);
  for (const drawn of [renderTableShell(table(publicView())), markup(playerView())]) {
    assert.deepEqual(find(drawn, byRegion('vote')).children, []);
    assert.deepEqual(auditMarkup(drawn), []);
  }
  // A protocol 1 view has no voting facts at all.
  assert.equal(buildVotePanel(fixture().before.public), null);
  assert.equal(buildTableShellModel({ ...environment, mode: 'fixture', view: fixture().before.public }).match.vote, null);

  const cases = [
    [voting('CAPTAIN_ELECTION', ['seat-3', 'seat-1']), 'Captain election', ['Candidates: Player 1, Player 3.', '7 players may vote.']],
    [voting('CAPTAIN_ELECTION', []), 'Captain election', ['There are no candidates.', '7 players may vote.']],
    [voting('JAIL_VOTE', ['seat-2', 'seat-6', 'seat-4']), 'Jail vote', ['Can be voted into Jail: Player 2, Player 4, Player 6.', '7 players may vote.']],
    [voting('JAIL_VOTE', [], view => { view.ballot.eligibleVoters = ['seat-2']; }), 'Jail vote', ['Nobody can be voted into Jail.', '1 player may vote.']],
    [voting('RELEASE_CHOICE', ['seat-4'], view => { captain(1, view); jail(4, view); view.activeSeatId = 'seat-1'; view.ballot.eligibleVoters = []; }), 'Release choice', ['Player 1 may ask for a vote on releasing one jailed player.', 'Jailed: Player 4.']],
    [voting('RELEASE_VOTE', [], view => { jail(4, view); view.ballot.releaseTargetSeatId = 'seat-4'; }), 'Release vote', ['The vote is on releasing Player 4 from Jail.', '7 players may vote.']],
  ];
  for (const [change, title, lines] of cases) {
    const shown = table(publicView(change)).match.vote;
    assert.deepEqual(shown, { heading: 'Voting', current: { title, lines }, lastTally: null }, title);
    // A phone shows exactly what the display shows, whatever that phone's own ballot or role.
    assert.deepEqual(model(playerView(view => { change(view); view.hasVoted = true; view.ownBallot = null; })).match.vote, shown, title);
    const drawn = renderTableShell(table(publicView(change)));
    assert.deepEqual(auditMarkup(drawn), []);
    assert.equal(textOf(find(drawn, byRegion('vote'))).includes(lines[0]), true);
  }
  // Outside a voting phase nothing is "being voted on", whatever the ballot still holds.
  assert.equal(table(publicView(view => { view.ballot.eligibleTargets = ['seat-2']; })).match.vote, null);
});

test('the last count is shown as the server published it: its numbers, and the seat it names', () => {
  const shown = change => table(publicView(view => { view.round = 2; change(view); })).match.vote.lastTally;
  assert.deepEqual(shown(view => { jail(3, view); view.lastTally = JAIL_TALLY; }), {
    heading: 'Last vote counted', title: 'Jail vote',
    // Every seat that could be voted for, in seat order, with the number the server counted.
    counts: [{ seatId: 'seat-1', label: 'Player 1', votes: 0 }, { seatId: 'seat-3', label: 'Player 3', votes: 4 }, { seatId: 'seat-5', label: 'Player 5', votes: 1 }],
    lines: ['7 players could vote.', 'Abstained or did not vote: 2.', 'Sent to Jail: Player 3.'],
  });
  assert.deepEqual(shown(view => { view.lastTally = { ...JAIL_TALLY, counts: { 'seat-3': 1, 'seat-5': 1 }, selectedSeatId: null }; }).lines, ['7 players could vote.', 'Abstained or did not vote: 5.', 'Nobody was sent to Jail.']);
  const election = { kind: 'CAPTAIN_ELECTION', counts: { 'seat-2': 5, 'seat-6': 2 }, eligibleVoterCount: 7, yesCount: null, selectedSeatId: 'seat-2', released: null };
  assert.deepEqual(shown(view => { captain(2, view); view.lastTally = election; }).lines, ['7 players could vote.', 'Abstained or did not vote: 0.', 'Elected Captain: Player 2.']);
  assert.deepEqual(shown(view => { view.lastTally = { ...election, counts: { 'seat-2': 3, 'seat-6': 3 }, selectedSeatId: null }; }).lines, ['7 players could vote.', 'Abstained or did not vote: 1.', 'Nobody was elected.']);
  const release = { kind: 'RELEASE_VOTE', counts: {}, eligibleVoterCount: 7, yesCount: 4, selectedSeatId: 'seat-4', released: true };
  assert.deepEqual(shown(view => { view.lastTally = release; }), {
    heading: 'Last vote counted', title: 'Release vote', counts: [], lines: ['The vote was on releasing Player 4.', 'Yes: 4 of 7.', 'Player 4 was released.'],
  });
  assert.deepEqual(shown(view => { jail(4, view); view.lastTally = { ...release, yesCount: 3, released: false }; }).lines, ['The vote was on releasing Player 4.', 'Yes: 3 of 7.', 'Player 4 was not released.']);
  // Numbers that do not add up are shown as published, and nothing is derived from them.
  assert.deepEqual(shown(view => { view.lastTally = { ...JAIL_TALLY, eligibleVoterCount: 3 }; }).lines, ['3 players could vote.', 'Sent to Jail: Player 3.']);
  assert.equal(tallyResult({ ...release, released: null }), null, 'A release count that does not say whether it was granted is not interpreted');
  assert.equal(tallyResult({ ...release, selectedSeatId: null }), null);

  // It stays through the phases that follow, next to whatever is being voted on now, on the display and on every phone alike.
  const later = view => { voting('CAPTAIN_ELECTION', ['seat-2', 'seat-6'])(view); view.round = 2; jail(3, view); view.lastTally = JAIL_TALLY; };
  const display = table(publicView(later));
  assert.deepEqual([display.match.vote.current.title, display.match.vote.lastTally.title], ['Captain election', 'Jail vote']);
  assert.deepEqual(model(playerView(later)).match.vote, display.match.vote);
  const drawn = renderTableShell(display);
  assert.deepEqual(auditMarkup(drawn), []);
  const text = textOf(find(drawn, byRegion('vote')));
  for (const part of ['Last vote counted: Jail vote', 'Player 3: 4 votes', 'Player 5: 1 vote', 'Player 1: 0 votes', 'Sent to Jail: Player 3.']) assert.equal(text.includes(part), true, part);
  // A count names seats and numbers. It never says who voted for whom.
  assert.doesNotMatch(toHtml(drawn), /Your ballot|voted for Player/);
});

test('a newly published count is spoken once, to the display and to every phone, and never replayed after a reconnection', () => {
  const during = publicView(voting('JAIL_VOTE', ['seat-1', 'seat-3', 'seat-5']));
  const after = publicView(view => { voting('CAPTAIN_ELECTION', ['seat-2', 'seat-6'])(view); view.round = 2; jail(3, view); view.lastTally = JAIL_TALLY; });
  const speak = (announcer, view, overrides = {}) => announcer.next({ ...environment, view, ...overrides }).map(line => line.text);

  const display = createTableAnnouncer();
  speak(display, during);
  const said = speak(display, after);
  assert.deepEqual(said.filter(line => /counted/.test(line)), ['Jail vote counted. Sent to Jail: Player 3.']);
  assert.equal(said.includes('Round 2. Captain election.'), true, 'The phase is still announced');
  assert.equal(said.includes('Player 3 is now jailed.'), true, 'and so are the public changes to a seat');
  assert.deepEqual(speak(display, after), [], 'Said once');

  // The next vote closes with a count that happens to be the same: it is new, and is said.
  const again = publicView(view => { voting('JAIL_VOTE', ['seat-1', 'seat-3', 'seat-5'])(view); view.phase.id = 'phase-jail-two'; view.round = 2; jail(3, view); view.lastTally = JAIL_TALLY; });
  const closed2 = publicView(view => { view.round = 3; view.phase.id = 'phase-three'; jail(3, view); view.lastTally = JAIL_TALLY; });
  speak(display, again);
  assert.deepEqual(speak(display, closed2).filter(line => /counted/.test(line)), ['Jail vote counted. Sent to Jail: Player 3.']);

  // A display that was not current when the count arrived states the present and replays nothing.
  const away = createTableAnnouncer();
  speak(away, during);
  speak(away, during, { connection: 'stale' });
  assert.deepEqual(speak(away, after).filter(line => /counted/.test(line)), []);

  // A phone hears the same public line, with or without its private panel open.
  for (const privacy of [{ concealed: false, revealed: true }, { concealed: false, revealed: false }]) {
    const phone = createConnectedPlayerAnnouncer();
    const hear = view => phone.next({ ...input(view), privacy });
    hear(playerView(voting('JAIL_VOTE', ['seat-1', 'seat-3', 'seat-5'])));
    const lines = hear(playerView(view => { voting('CAPTAIN_ELECTION', ['seat-2', 'seat-6'])(view); view.round = 2; jail(3, view); view.lastTally = JAIL_TALLY; }));
    const counted = lines.filter(line => /counted/.test(line.text));
    assert.deepEqual(counted.map(line => [line.text, line.private ?? false]), [['Jail vote counted. Sent to Jail: Player 3.', false]]);
  }
  // The host ends the match in the middle of a vote. That vote was never counted: the count
  // still in the view is the one from the round before, and it is not said again as if new.
  for (const kind of ['JAIL_VOTE', 'CAPTAIN_ELECTION']) {
    const old = kind === 'JAIL_VOTE' ? JAIL_TALLY : { kind, counts: { 'seat-2': 3, 'seat-6': 3 }, eligibleVoterCount: 7, yesCount: null, selectedSeatId: null, released: null };
    const open = publicView(view => { voting(kind, ['seat-2', 'seat-6'])(view); view.round = 3; view.phase.id = 'phase-vote-three'; view.lastTally = old; });
    const ended = publicView(view => { view.round = 3; view.phase = { id: 'phase-ended', kind: 'ABORTED', startedAt: view.phase.startedAt, endsAt: null }; view.activeSeatId = null; view.lastTally = old; });
    const cut = createTableAnnouncer();
    speak(cut, open);
    const heard = speak(cut, ended);
    assert.deepEqual(heard.filter(line => /counted/.test(line)), [], `${kind}: no count is said`);
    assert.equal(heard.some(line => line.includes('Match ended by the host')), true, 'The end is announced');
    // A count that did arrive with the end, because this screen missed the view in between, is new and is said.
    const late = createTableAnnouncer();
    speak(late, open);
    const fresh = { ...old, counts: { 'seat-2': 4, 'seat-6': 1 }, selectedSeatId: 'seat-2' };
    assert.equal(speak(late, publicView(view => { view.round = 3; view.phase = { id: 'phase-ended', kind: 'ABORTED', startedAt: view.phase.startedAt, endsAt: null }; view.activeSeatId = null; view.lastTally = fresh; })).filter(line => /counted/.test(line)).length, 1);
  }

  // A release count that does not say whether it was granted is announced without a result.
  const odd = createTableAnnouncer();
  speak(odd, publicView(view => { voting('RELEASE_VOTE', [])(view); jail(4, view); view.ballot.releaseTargetSeatId = 'seat-4'; }));
  assert.deepEqual(speak(odd, publicView(view => { voting('JAIL_VOTE', ['seat-1'])(view); jail(4, view); view.lastTally = { kind: 'RELEASE_VOTE', counts: {}, eligibleVoterCount: 7, yesCount: 2, selectedSeatId: 'seat-4', released: null }; })).filter(line => /counted/.test(line)), ['Release vote counted.']);
});

test('the last seconds of a vote are announced to a seat the public ballot says may vote, once', () => {
  const view = voter('JAIL_VOTE', ['seat-3']);
  const last = { deadline: { kind: 'running', remainingMs: 9_000 } };
  const voterPhone = createConnectedPlayerAnnouncer();
  voterPhone.next(input(view));
  assert.deepEqual(voterPhone.next(input(view, IDLE, last)).map(line => line.text), ['9 seconds left.']);
  assert.deepEqual(voterPhone.next(input(view, IDLE, { deadline: { kind: 'running', remainingMs: 8_000 } })), [], 'Once');
  // A seat the ballot does not list is told nothing; neither is the display.
  const bystander = playerView(voting('JAIL_VOTE', ['seat-3'], next => { next.ballot.eligibleVoters = ['seat-2', 'seat-3']; }));
  const other = createConnectedPlayerAnnouncer();
  other.next(input(bystander));
  assert.deepEqual(other.next(input(bystander, IDLE, last)), []);
  const display = createTableAnnouncer();
  display.next({ ...environment, view: publicView(voting('JAIL_VOTE', ['seat-3'])) });
  assert.deepEqual(display.next({ ...environment, ...last, view: publicView(voting('JAIL_VOTE', ['seat-3'])) }), []);
});

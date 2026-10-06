import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildResult, buildTableShellModel, createConnectedPlayerAnnouncer, createTableAnnouncer, matchOutcome, renderConnectedPlayerShell, renderTableShell, textOf, toHtml,
} from '@mothership/presentation';
import { fixture } from './support/inputs.mjs';
import { auditMarkup, byRegion, find } from './support/markup-audit.mjs';
import { card, closed, environment, IDLE, input, markup, model, playerView, publicView } from './support/protocol2-views.mjs';

// The end of a match on the connected phone and the shared display: a finished match with
// the winner the server names and its end reveal, and a match the host ended. Synthetic,
// hand-built protocol 2 views that satisfy the shared strict schema. Nothing here decides
// who wins: the winner is whatever the view says.

// A complete seven-seat roster, as the schema requires of an end reveal. Seat 1 holds the role the test phone's own view has.
const ROLES = ['Cracker', 'Insider', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
// In no particular order, as a view may list them: the screens put seats in seat order.
const REVEAL = { roles: ROLES.map((role, index) => ({ seatId: `seat-${index + 1}`, role })).reverse(), code: ['seat-7', 'seat-3', 'seat-1', 'seat-2'] };
const finished = (winner = 'Blue', alienCoWinner = false, more = () => {}) => view => {
  view.round = 5;
  view.phase = { id: 'phase-finished', kind: 'FINISHED', startedAt: view.phase.startedAt, endsAt: null };
  view.activeSeatId = null;
  view.result = { winner, alienCoWinner };
  view.endReveal = structuredClone(REVEAL);
  if ('self' in view) view.self.movementDestinations = [];
  more(view);
};
const aborted = view => {
  view.phase = { id: 'phase-aborted', kind: 'ABORTED', startedAt: view.phase.startedAt, endsAt: null };
  view.activeSeatId = null;
  if ('self' in view) view.self.movementDestinations = [];
};
const over = { deadline: { kind: 'none' } };
const table = (change, overrides = over) => buildTableShellModel({ ...environment, ...overrides, view: publicView(change) });
const phone = (change, action = IDLE, overrides = over) => model(playerView(change), action, overrides);

test('while a match is being played there is no result, and the region for it is there and empty', () => {
  assert.equal(table(() => {}, {}).match.result, null);
  assert.equal(model(playerView()).match.result, null);
  assert.equal(matchOutcome(publicView()), null);
  for (const drawn of [renderTableShell(table(() => {}, {})), markup(playerView())]) {
    assert.deepEqual(find(drawn, byRegion('result')).children, []);
    assert.deepEqual(auditMarkup(drawn), []);
  }
  // A protocol 1 view cannot carry an end.
  assert.equal(buildResult(fixture().before.public, null), null);
  assert.equal(buildTableShellModel({ ...environment, mode: 'fixture', view: fixture().before.public }).match.result, null);
});

test('a finished match shows the winner the server names, in the same words on every screen', () => {
  const outcomes = [
    ['Blue', false, 'Blue wins.', []],
    ['Blue', true, 'Blue wins.', ['The Alien wins with Blue.']],
    ['Red', false, 'Red wins.', []],
    ['Alien', false, 'The Alien wins.', []],
    ['Draw', false, 'Nobody wins. The match is a draw.', []],
  ];
  for (const [winner, alienCoWinner, outcome, lines] of outcomes) {
    const display = table(finished(winner, alienCoWinner));
    assert.deepEqual([display.match.result.heading, display.match.result.outcome, display.match.result.lines], ['Result', outcome, lines], winner);
    assert.deepEqual([display.match.phase.phaseLabel, display.match.phase.timer.state], ['Match finished', 'none']);
    const own = phone(finished(winner, alienCoWinner));
    assert.deepEqual([own.match.result.outcome, own.match.result.lines], [outcome, lines], 'A phone says what the display says');
    assert.equal(matchOutcome(publicView(finished(winner, alienCoWinner))), outcome);
    for (const drawn of [renderTableShell(display), renderConnectedPlayerShell(own)]) {
      assert.deepEqual(auditMarkup(drawn), [], winner);
      assert.equal(textOf(find(drawn, byRegion('result'))).includes(outcome), true);
    }
  }
});

test('the roles and the Code are shown when the server’s view carries them, which is at the end of a match and not before', () => {
  const display = table(finished());
  assert.deepEqual(display.match.result.reveal, {
    heading: 'Roles', columns: { player: 'Player', role: 'Role' },
    roles: ROLES.map((role, index) => ({ seatId: `seat-${index + 1}`, label: `Player ${index + 1}`, role })),
    code: 'The Code was: Player 1, Player 2, Player 3, Player 7.',
  });
  const drawn = renderTableShell(display);
  const text = textOf(find(drawn, byRegion('result')));
  for (const [index, role] of ROLES.entries()) assert.equal(text.includes(`Player ${index + 1}${role}`), true, `${role} is shown against its seat`);
  assert.equal(text.includes('The Code was: Player 1, Player 2, Player 3, Player 7.'), true, 'and the Code is written out');
  const ownText = textOf(find(renderConnectedPlayerShell(phone(finished())), byRegion('result')));
  assert.equal(ownText.includes('Player 1 (you)Cracker') && ownText.includes('The Code was: Player 1 (you), Player 2, Player 3, Player 7.'), true, 'A phone draws the same, with its own seat marked');
  // A phone marks the player's own seat as theirs, in the table and in the Code. Nothing else differs.
  const own = phone(finished()).match.result.reveal;
  assert.deepEqual(own.roles.map(entry => entry.label), ['Player 1 (you)', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7']);
  assert.deepEqual(own.roles.map(entry => entry.role), ROLES);
  assert.equal(own.code, 'The Code was: Player 1 (you), Player 2, Player 3, Player 7.');
  // It is public: it is on a phone whose private panel is closed, too.
  const shut = model(playerView(finished()), IDLE, { ...over, ...closed });
  assert.equal(shut.match.privateArea.content, null);
  assert.deepEqual(shut.match.result.reveal, own);
  // Before the end, no screen names a role anywhere outside a phone's own open private panel.
  const during = toHtml(renderTableShell(table(() => {}, {})));
  for (const role of ROLES) assert.equal(during.includes(role), false, role);
  assert.doesNotMatch(during, /The Code was|ms-result__roles/);
});

test('a match the host ended has no winner, and nothing is revealed that the view does not carry', () => {
  const display = table(aborted);
  assert.deepEqual(display.match.result, { heading: 'Result', outcome: 'The host ended this match. There is no winner.', lines: [], reveal: null });
  assert.deepEqual([display.match.phase.phaseLabel, display.match.phase.timer.state], ['Match ended by the host', 'none']);
  const own = phone(aborted);
  assert.deepEqual(own.match.result, display.match.result);
  for (const drawn of [renderTableShell(display), renderConnectedPlayerShell(own)]) assert.deepEqual(auditMarkup(drawn), []);
  const html = toHtml(renderTableShell(display));
  for (const role of ROLES) assert.equal(html.includes(role), false, `${role} is not shown for a match the host ended`);
  assert.doesNotMatch(html, /The Code was|wins/);
  // The phone's own role stays where it was: in its own private panel, and nowhere else.
  assert.equal(own.match.privateArea.content.role.name, 'Cracker');
  assert.equal(toHtml(renderConnectedPlayerShell(model(playerView(aborted), IDLE, { ...over, ...closed }))).includes('Cracker'), false);
});

test('once the match is over the phone says so and offers nothing', () => {
  for (const change of [finished(), aborted]) {
    const actions = phone(change).match.privateArea.content.actions;
    assert.equal(actions.notice, 'The match is over.');
    assert.equal(actions.card.body.offers.every(offer => offer.open === null), true);
    assert.deepEqual(actions.card.body.offers.map(offer => [offer.kind, offer.statusLabel]), [['move', 'Not available'], ['shot', 'Not available']]);
  }
  // A lost connection is still said first: the phone cannot vouch for what it shows.
  assert.equal(phone(aborted, IDLE, { ...over, connection: 'stale' }).match.privateArea.content.actions.notice, 'Actions are paused until the connection is restored.');
  // While the match is played, nothing says it is over.
  assert.equal(card(playerView()).body.offers.some(offer => offer.open !== null), true);
  assert.equal(model(playerView()).match.privateArea.content.actions.notice, null);
});

test('the end of the match is spoken once, when the view first carries it', () => {
  const speak = (announcer, view, overrides = {}) => announcer.next({ ...environment, view, ...overrides }).map(line => line.text);
  const display = createTableAnnouncer();
  speak(display, publicView(view => { view.round = 5; }));
  const said = speak(display, publicView(finished('Blue', true)), over);
  assert.equal(said.includes('Round 5. Match finished.'), true);
  assert.deepEqual(said.filter(line => /wins|winner/.test(line)), ['Blue wins. The Alien wins with Blue.']);
  assert.deepEqual(speak(display, publicView(finished('Blue', true)), over), [], 'Once');

  const ended = createTableAnnouncer();
  speak(ended, publicView());
  assert.deepEqual(speak(ended, publicView(aborted), over).filter(line => /host ended/.test(line)), ['The host ended this match. There is no winner.']);

  // A screen that connects to a match already over is told how it ended with where it stands, once.
  const late = createTableAnnouncer();
  assert.deepEqual(speak(late, publicView(finished('Red')), over), ['Connected. Round 5. Match finished. Red wins.']);
  assert.deepEqual(speak(late, publicView(finished('Red')), over), []);
  // So is one that was not current when the match ended: the end is part of the present it comes back to.
  for (const [lost, back] of [[{ connection: 'stale' }, 'Reconnected. Round 5. Match finished. Blue wins. The Alien wins with Blue.'], [{ problem: 'unreadable-update' }, 'Up to date again. Round 5. Match finished. Blue wins. The Alien wins with Blue.']]) {
    const away = createTableAnnouncer();
    speak(away, publicView(view => { view.round = 5; }));
    speak(away, publicView(view => { view.round = 5; }), lost);
    assert.deepEqual(speak(away, publicView(finished('Blue', true)), over), [back]);
    assert.deepEqual(speak(away, publicView(finished('Blue', true)), over), [], 'and not again');
  }
  const cut = createTableAnnouncer();
  assert.deepEqual(speak(cut, publicView(aborted), over), ['Connected. Round 1. Match ended by the host. The host ended this match. There is no winner.']);
  // While a match is played, connecting says where it stands and nothing about an end.
  assert.deepEqual(speak(createTableAnnouncer(), publicView(view => { view.round = 5; })), ['Connected. Round 5. Player 1’s turn.']);

  // A phone hears the same public line, with its private panel open or closed.
  for (const privacy of [{ concealed: false, revealed: true }, { concealed: false, revealed: false }]) {
    const own = createConnectedPlayerAnnouncer();
    own.next({ ...input(playerView(view => { view.round = 5; })), privacy });
    const lines = own.next({ ...input(playerView(finished('Draw')), IDLE, over), privacy });
    assert.deepEqual(lines.filter(line => /draw/.test(line.text)).map(line => [line.text, line.private ?? false]), [['Nobody wins. The match is a draw.', false]]);
  }
});

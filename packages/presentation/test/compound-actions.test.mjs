import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildKnowledge, buildTableShellModel, choiceValue, completeChoice, COMPOUND_ACTION_COMMANDS, describeAction, FACTIONS, isCompoundKind, isOffered, nextOptions,
  openness, parseShellIntent, renderConnectedPlayerShell, renderTableShell, sameChoice, textOf, toHtml,
} from '@mothership/presentation';
import { auditMarkup, byId, byRegion, find, findAll } from './support/markup-audit.mjs';
import { card, closed, environment, IDLE, markup, model, playerView, publicView } from './support/protocol2-views.mjs';

// The actions whose choice has several parts (a Scan, a Supply, a Code attempt), and the
// private panel that says what the server tells one seat alone. Synthetic, hand-built
// protocol 2 views that satisfy the shared strict schema; none is the result of an engine.

const listing = (command, seats) => view => { view.legalTargets = { ...view.legalTargets, [command]: seats }; };
const scanning = (seats = ['seat-5', 'seat-1', 'seat-3']) => playerView(listing('SCAN', seats));
const supplying = (seats = ['seat-5', 'seat-1', 'seat-3']) => playerView(listing('SUPPLY', seats));
const coding = (more = () => {}) => playerView(view => { view.round = 5; view.self.codeAttemptAvailable = true; more(view); });
const ALL = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7'];
const SCAN = { kind: 'scan', targetSeatId: 'seat-3', guess: 'Red' };
const SUPPLY = { kind: 'supply', targetSeatIds: ['seat-5', 'seat-1'] };
const CODE = { kind: 'code', seatIds: ['seat-7', 'seat-1', 'seat-5', 'seat-3'] };
/** Words that would state what came of an action. No step of a card uses them. */
const OUTCOME = /\b(hit|miss|injur|damag|blocked|healed|killed|eliminat|succe|fail|correct|incorrect|wins|won|lost|armed)\b/i;

test('these three actions are the ones with several parts, and each has its own wire command', () => {
  assert.deepEqual(COMPOUND_ACTION_COMMANDS, { scan: 'SCAN', supply: 'SUPPLY', code: 'SUBMIT_CODE' });
  assert.deepEqual(FACTIONS, ['Blue', 'Red', 'Alien']);
  for (const kind of ['scan', 'supply', 'code']) assert.equal(isCompoundKind(kind), true);
  for (const kind of ['move', 'shot', 'vote', 'release-vote', 'hack']) assert.equal(isCompoundKind(kind), false, kind);
  for (const kind of ['scan', 'supply', 'code']) assert.deepEqual(parseShellIntent('action/open', { kind }), { type: 'action/open', kind });
  for (const value of ['Blue', 'Red', 'Alien']) assert.deepEqual(parseShellIntent('action/choose', { value }), { type: 'action/choose', value });
});

test('a Scan is opened by the server’s list: a seat from it, then one of the three factions', () => {
  assert.equal(openness(playerView(), 'scan'), 'closed');
  assert.equal(nextOptions(playerView(), 'scan'), null);
  assert.equal(openness(scanning([]), 'scan'), 'empty', 'Open with nobody to scan');
  const view = scanning();
  assert.equal(openness(view, 'scan'), 'open');
  assert.deepEqual(nextOptions(view, 'scan'), ['seat-5', 'seat-1', 'seat-3'], 'The view’s own list, as given');
  assert.deepEqual(nextOptions(view, 'scan', ['seat-3']), ['Blue', 'Red', 'Alien']);
  assert.deepEqual(nextOptions(view, 'scan', ['seat-3', 'Red']), [], 'Whole');
  assert.deepEqual(completeChoice(view, 'scan', ['seat-3', 'Red']), SCAN);
  assert.equal(completeChoice(view, 'scan', ['seat-3']), null, 'Not whole yet');
  // A seat the server does not list, a faction that is none, the parts the wrong way round, too many parts.
  for (const picks of [['seat-2'], ['seat-2', 'Red'], ['seat-3', 'Green'], ['Red', 'seat-3'], ['Red'], ['seat-3', 'Red', 'Blue']]) {
    assert.equal(nextOptions(view, 'scan', picks), null, picks.join());
    assert.equal(completeChoice(view, 'scan', picks), null, picks.join());
  }
  assert.equal(isOffered(view, SCAN), true);
  assert.equal(isOffered(view, { ...SCAN, targetSeatId: 'seat-2' }), false);
  assert.equal(isOffered(view, { ...SCAN, guess: 'Green' }), false);
  assert.equal(isOffered(playerView(), SCAN), false);
  // A list under another command opens no Scan, and a Scan list opens nothing else.
  assert.equal(openness(playerView(listing('SUPPLY', ['seat-3'])), 'scan'), 'closed');
  for (const kind of ['supply', 'code', 'disable', 'protect', 'rescue', 'hack', 'vote']) assert.equal(openness(view, kind), 'closed', kind);
});

test('a Supply is opened by the server’s list and names two different seats from it', () => {
  assert.equal(openness(playerView(), 'supply'), 'closed');
  const view = supplying();
  assert.equal(openness(view, 'supply'), 'open');
  assert.deepEqual(nextOptions(view, 'supply'), ['seat-5', 'seat-1', 'seat-3']);
  assert.deepEqual(nextOptions(view, 'supply', ['seat-5']), ['seat-1', 'seat-3'], 'The rest of the list');
  assert.deepEqual(nextOptions(view, 'supply', ['seat-5', 'seat-1']), []);
  assert.deepEqual(completeChoice(view, 'supply', ['seat-5', 'seat-1']), SUPPLY);
  for (const picks of [['seat-2'], ['seat-5', 'seat-5'], ['seat-5', 'seat-2'], ['seat-5', 'Red'], ['seat-5', 'seat-1', 'seat-3']]) {
    assert.equal(nextOptions(view, 'supply', picks), null, picks.join());
    assert.equal(completeChoice(view, 'supply', picks), null, picks.join());
  }
  // Fewer seats than a Supply names: open, and no whole choice can be made. Nothing is made up to fill it.
  assert.equal(openness(supplying(['seat-3']), 'supply'), 'empty');
  assert.equal(openness(supplying([]), 'supply'), 'empty');
  assert.equal(completeChoice(supplying(['seat-3']), 'supply', ['seat-3']), null);
  // The two seats are a set: either order is the same choice.
  assert.equal(isOffered(view, SUPPLY), true);
  assert.equal(sameChoice(SUPPLY, { kind: 'supply', targetSeatIds: ['seat-1', 'seat-5'] }), true);
  assert.equal(sameChoice(SUPPLY, { kind: 'supply', targetSeatIds: ['seat-1', 'seat-3'] }), false);
  assert.equal(isOffered(view, { kind: 'supply', targetSeatIds: ['seat-5', 'seat-5'] }), false);
  assert.equal(isOffered(view, { kind: 'supply', targetSeatIds: ['seat-5', 'seat-2'] }), false);
});

test('a Code attempt is opened by the view’s own flag and names four different seats of the match', () => {
  assert.equal(openness(playerView(), 'code'), 'closed');
  // A list under the command's name opens nothing: the contract puts no list on a Code attempt.
  assert.equal(openness(playerView(listing('SUBMIT_CODE', ALL)), 'code'), 'closed');
  const view = coding();
  assert.equal(openness(view, 'code'), 'open');
  assert.deepEqual(nextOptions(view, 'code'), ALL, 'Every seat of the match, the player’s own among them');
  assert.deepEqual(nextOptions(view, 'code', ['seat-7', 'seat-1']), ['seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6']);
  assert.deepEqual(nextOptions(view, 'code', CODE.seatIds), []);
  assert.deepEqual(completeChoice(view, 'code', CODE.seatIds), CODE);
  assert.equal(completeChoice(view, 'code', CODE.seatIds.slice(0, 3)), null);
  // A seat that is not in this match, a seat twice, a fifth seat.
  for (const picks of [['seat-8'], ['seat-7', 'seat-7'], ['seat-7', 'seat-1', 'seat-5', 'seat-9'], [...CODE.seatIds, 'seat-2']]) {
    assert.equal(nextOptions(view, 'code', picks), null, picks.join());
    assert.equal(completeChoice(view, 'code', picks), null, picks.join());
  }
  assert.equal(isOffered(view, CODE), true);
  assert.equal(isOffered(playerView(), CODE), false);
  assert.equal(sameChoice(CODE, { kind: 'code', seatIds: ['seat-1', 'seat-3', 'seat-5', 'seat-7'] }), true, 'A Code is a set of four');
  assert.equal(choiceValue(CODE), 'seat-1+seat-3+seat-5+seat-7');
  assert.equal(choiceValue(SCAN), 'seat-3/Red');
});

test('an action with one pick is the same thing with one part', () => {
  const view = playerView(listing('PROTECT', ['seat-3', 'seat-1']));
  assert.deepEqual(nextOptions(view, 'move'), ['Room B']);
  assert.deepEqual(completeChoice(view, 'move', ['Room B']), { kind: 'move', destination: 'Room B' });
  assert.deepEqual(nextOptions(view, 'move', ['Room B']), []);
  assert.equal(nextOptions(view, 'move', ['Room A']), null);
  assert.deepEqual(nextOptions(view, 'protect'), ['seat-3', 'seat-1']);
  assert.deepEqual(completeChoice(view, 'protect', ['seat-1']), { kind: 'protect', targetSeatId: 'seat-1' });
  assert.equal(completeChoice(view, 'protect', ['seat-2']), null);
  assert.equal(completeChoice(view, 'protect', []), null);
  assert.equal(nextOptions(view, 'disable'), null);
  assert.deepEqual([openness(view, 'move'), openness(view, 'protect'), openness(view, 'shot'), openness(view, 'disable')], ['open', 'open', 'closed', 'closed']);
  assert.equal(openness(playerView(v => { v.self.movementDestinations = []; }), 'move'), 'empty');
});

test('the idle card lists each of them only while the view opens it, and says so when no whole choice can be made', () => {
  const expected = {
    scan: { view: scanning(), label: 'Scan', open: 'Choose a player' },
    supply: { view: supplying(), label: 'Supply', open: 'Choose two players' },
    code: { view: coding(), label: 'Code attempt', open: 'Enter a Code' },
  };
  for (const [kind, { view, label, open }] of Object.entries(expected)) {
    const offers = card(view).body.offers;
    assert.deepEqual(offers.map(offer => offer.kind), ['move', 'shot', kind]);
    assert.deepEqual(offers[2], { kind, label, statusLabel: 'Available', open: { id: `ms-action-open-${kind}`, label: open } });
    for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }, { deadline: { kind: 'unsynced' } }]) {
      assert.deepEqual(card(view, IDLE, overrides).body.offers[2], { kind, label, statusLabel: 'Paused', open: null }, kind);
    }
    const shut = model(view, IDLE, closed);
    assert.equal(shut.match.privateArea.content, null);
    assert.equal(toHtml(renderConnectedPlayerShell(shut)).includes(`ms-action-open-${kind}`), false, kind);
    assert.deepEqual(auditMarkup(markup(view)), [], kind);
  }
  assert.deepEqual(card(scanning([])).body.offers[2], { kind: 'scan', label: 'Scan', statusLabel: 'No one you can target right now', open: null });
  assert.deepEqual(card(supplying(['seat-3'])).body.offers[2], { kind: 'supply', label: 'Supply', statusLabel: 'Too few players to choose right now', open: null });
  // In the phone's own fixed order, whatever order the view lists them in.
  const several = card(playerView(view => { view.self.codeAttemptAvailable = true; view.legalTargets = { REQUEST_HACK: ['seat-3'], SUPPLY: ['seat-3', 'seat-5'], SCAN: ['seat-3'] }; }));
  assert.deepEqual(several.body.offers.map(offer => offer.kind), ['move', 'shot', 'scan', 'supply', 'hack', 'code']);
});

test('each part is asked for in turn, with what is already picked shown in the order picked, and going back names the pick it takes away', () => {
  // A Scan: the seat, then the guess.
  const scanSeat = card(scanning(), { step: 'choosing', kind: 'scan' });
  assert.deepEqual([scanSeat.title, scanSeat.body.prompt, scanSeat.body.progress, scanSeat.body.back.label], ['Scan', 'Who do you scan?', null, 'Cancel']);
  assert.deepEqual(scanSeat.body.choices.map(choice => [choice.value, choice.label, choice.number, choice.detail]), [['seat-1', 'Player 1 (you)', 1, 'Healthy'], ['seat-3', 'Player 3', 3, 'Healthy'], ['seat-5', 'Player 5', 5, 'Healthy']]);
  const scanGuess = card(scanning(), { step: 'choosing', kind: 'scan', picked: ['seat-3'] });
  assert.deepEqual([scanGuess.body.prompt, scanGuess.body.progress, scanGuess.body.back.label], ['Guess a faction for Player 3.', 'Chosen so far: Player 3.', 'Take back Player 3']);
  assert.deepEqual(scanGuess.body.choices, ['Blue', 'Red', 'Alien'].map(name => ({ id: `ms-action-choice-${name.toLowerCase()}`, value: name, label: name, detail: null, number: null })));
  assert.equal(card(scanning(), { step: 'choosing', kind: 'scan', picked: ['seat-1'] }).body.prompt, 'Guess a faction for yourself.');

  // A Supply: one seat, then another from the rest.
  const first = card(supplying(), { step: 'choosing', kind: 'supply' });
  assert.deepEqual([first.title, first.body.prompt, first.body.progress], ['Supply', 'Two players get a weapon each. Choose the first.', null]);
  assert.deepEqual(first.body.choices.map(choice => choice.value), ['seat-1', 'seat-3', 'seat-5']);
  const second = card(supplying(), { step: 'choosing', kind: 'supply', picked: ['seat-5'] });
  assert.deepEqual([second.body.prompt, second.body.progress, second.body.back.label], ['Choose the second player.', 'Chosen so far: Player 5.', 'Take back Player 5']);
  assert.deepEqual(second.body.choices.map(choice => choice.label), ['Player 1 (you)', 'Player 3']);

  // A Code attempt: four seats, counted down.
  const prompts = [[], ['seat-7'], ['seat-7', 'seat-1'], ['seat-7', 'seat-1', 'seat-5']].map(picked => card(coding(), { step: 'choosing', kind: 'code', picked }).body);
  assert.deepEqual(prompts.map(body => body.prompt), ['Choose the four players of your Code attempt.', 'Choose 3 more players.', 'Choose 2 more players.', 'Choose one more player.']);
  // In the order picked, not in seat order: the last one named is the one going back takes away, and the control says so.
  assert.deepEqual(prompts.map(body => body.progress), [null, 'Chosen so far: Player 7.', 'Chosen so far: Player 7, Player 1 (you).', 'Chosen so far: Player 7, Player 1 (you), Player 5.']);
  assert.deepEqual(prompts.map(body => body.back.label), ['Cancel', 'Take back Player 7', 'Take back Player 1 (you)', 'Take back Player 5']);
  // A pick that names no seat cannot come from a control. Going back would still take it away, and says no more than that.
  assert.equal(card(coding(), { step: 'choosing', kind: 'code', picked: ['seat-7', 'elsewhere'] }).body.back.label, 'Take back the last choice');
  assert.deepEqual(prompts.map(body => body.choices.length), [7, 6, 5, 4]);
  assert.deepEqual(prompts[3].choices.map(choice => choice.value), ['seat-2', 'seat-3', 'seat-4', 'seat-6']);

  for (const [view, action] of [[scanning(), { step: 'choosing', kind: 'scan', picked: ['seat-3'] }], [supplying(), { step: 'choosing', kind: 'supply', picked: ['seat-5'] }], [coding(), { step: 'choosing', kind: 'code', picked: ['seat-7', 'seat-1'] }]]) {
    const drawn = markup(view, action);
    assert.deepEqual(auditMarkup(drawn), [], action.kind);
    assert.equal(textOf(find(drawn, byId('ms-action-progress'))).startsWith('Chosen so far: '), true);
  }
  assert.equal(findAll(markup(scanning(), { step: 'choosing', kind: 'scan' }), byId('ms-action-progress')).length, 0);
});

test('each of them confirms in its own words, says what is final about it, and reports acceptance without an outcome', () => {
  const cases = [
    { view: scanning(), choice: SCAN, confirm: 'Scan Player 3, guessing Red?', button: 'Scan', consequence: 'This uses your Scan for this round, whatever the result. You cannot change or withdraw it once the server accepts it.',
      sending: 'Sending your Scan to the server…', accepted: 'Scan of Player 3, guessing Red, accepted.', detail: 'The result is listed under “What you know”, as the server gives it.' },
    { view: supplying(), choice: SUPPLY, confirm: 'Register a weapon each for Player 5 and yourself?', button: 'Register Supply', consequence: 'You cannot change or withdraw it here once it is registered.',
      sending: 'Sending your Supply to the server…', accepted: 'Supply for Player 5 and yourself registered.', detail: 'This is not a result. Registered actions are resolved at the end of the round.' },
    { view: coding(), choice: CODE, confirm: 'Submit this Code attempt: Player 1 (you), Player 3, Player 5, Player 7?', button: 'Submit Code attempt', consequence: 'This is your one Code attempt in this match. You cannot change it once the server accepts it.',
      sending: 'Sending your Code attempt to the server…', accepted: 'Your Code attempt is recorded.', detail: 'This is not a result. It is checked when the round is resolved, not now.' },
  ];
  for (const { view, choice, confirm, button, consequence, sending, accepted, detail } of cases) {
    const confirming = card(view, { step: 'confirming', choice, armed: true });
    assert.deepEqual([confirming.body.prompt, confirming.body.consequence, confirming.body.confirm.label, confirming.body.confirm.intent], [confirm, consequence, button, 'action/confirm'], choice.kind);
    assert.equal(card(view, { step: 'submitting', choice }).body.text, sending);
    const done = card(view, { step: 'accepted', choice, armed: true });
    assert.deepEqual([done.status, done.body.text, done.body.detail], ['accepted', accepted, detail], choice.kind);
    assert.equal(describeAction({ step: 'accepted', choice, armed: true }, 'seat-1'), accepted, 'The spoken line is the card’s line');
    for (const action of [
      { step: 'confirming', choice, armed: true }, { step: 'submitting', choice }, { step: 'accepted', choice, armed: true },
      { step: 'rejected', choice, code: 'NOT_ALLOWED', armed: true }, { step: 'unknown', choice, recovered: false, phaseOver: false, armed: true },
    ]) {
      assert.deepEqual(auditMarkup(markup(view, action)), [], `${choice.kind} ${action.step}: structure`);
      assert.doesNotMatch(`${textOf(find(markup(view, action), byRegion('action')))} ${describeAction(action, 'seat-1') ?? ''}`, OUTCOME, `${choice.kind} ${action.step}`);
    }
  }
  // Once it is sent, a Code attempt is not written out again: not on the card and not in what is spoken.
  for (const step of ['submitting', 'accepted', 'unknown']) {
    const action = { step, choice: CODE, recovered: false, phaseOver: false, armed: true };
    assert.doesNotMatch(`${textOf(find(markup(coding(), action), byRegion('action')))} ${describeAction(action, 'seat-1') ?? ''}`, /Player \d/, step);
  }
});

// What the server tells one seat. Each view below is what the strict schema allows that role to hold.
const insider = playerView(view => { view.self.role = 'Insider'; view.self.rescuesRemaining = 0; view.knowledge.insiderCandidates = ['seat-6', 'seat-2', 'seat-4']; });
const hacker = (results = []) => playerView(view => { view.round = 3; view.self.role = 'Hacker'; view.self.rescuesRemaining = 0; view.knowledge.undercoverSeatId = 'seat-4'; view.knowledge.scanResults = results; });
const alien = playerView(view => { view.self.role = 'Alien'; view.self.rescuesRemaining = 0; view.knowledge.code = ['seat-5', 'seat-1', 'seat-7', 'seat-2']; });
const undercover = (protections, more = () => {}) => playerView(view => { view.round = 3; view.self.role = 'Undercover'; view.self.rescuesRemaining = 0; view.self.ordinaryWeapons = 1; view.knowledge.protections = protections; more(view); });

test('the private panel says what the server’s view tells this seat, one sentence for each thing it carries', () => {
  const said = view => model(view).match.privateArea.content.knowledge;
  // Every seat is told what it holds. A seat the view gives nothing more is told nothing more.
  assert.deepEqual(said(playerView()), { heading: 'What you know', items: ['Ordinary weapons you hold: 0.', 'Rescues you have left: 1.'] });
  assert.deepEqual(said(playerView(view => { view.self.rescuesRemaining = 0; view.self.ordinaryWeapons = 2; })).items, ['Ordinary weapons you hold: 2.']);
  assert.deepEqual(said(insider).items, [
    'Player 2, Player 4, Player 6 hold the roles Undercover, Alien and Cracker, one each. You are not told which of them holds which.',
    'Ordinary weapons you hold: 0.',
  ]);
  assert.deepEqual(said(alien).items, ['The Code is these four players: Player 1 (you), Player 2, Player 5, Player 7.', 'Ordinary weapons you hold: 0.']);
  assert.deepEqual(said(hacker()).items, ['The Undercover is Player 4.', 'Ordinary weapons you hold: 0.']);
  // Scan results, in the order the view lists them. A wrong guess says nothing of the Code; a right one says membership and no more.
  assert.deepEqual(said(hacker([
    { round: 1, targetSeatId: 'seat-3', guess: 'Blue', matched: false, inCode: null },
    { round: 2, targetSeatId: 'seat-5', guess: 'Blue', matched: true, inCode: true },
    { round: 3, targetSeatId: 'seat-1', guess: 'Red', matched: true, inCode: false },
  ])).items, [
    'The Undercover is Player 4.',
    'Round 1: you scanned Player 3 and guessed Blue. The guess was wrong.',
    'Round 2: you scanned Player 5 and guessed Blue. The guess was right, and that player is in the Code.',
    'Round 3: you scanned yourself and guessed Red. The guess was right, and that player is not in the Code.',
    'Ordinary weapons you hold: 0.',
  ]);
  // A Protection, as only the seat that granted it is told: the round the view says it is
  // active from, or that it is used up. Whether that round has come is not worked out: the
  // sentence is the same before it, in it and after it.
  const protections = [{ seatId: 'seat-2', activeFromRound: 4, consumed: false }, { seatId: 'seat-5', activeFromRound: 3, consumed: false }, { seatId: 'seat-1', activeFromRound: 2, consumed: true }];
  const told = ['Protection for Player 2: active from round 4.', 'Protection for Player 5: active from round 3.', 'Protection for yourself: used up.', 'Ordinary weapons you hold: 1.'];
  assert.deepEqual(said(undercover(protections)).items, told);
  for (const round of [1, 4, 5]) assert.deepEqual(said(undercover(protections, view => { view.round = round; })).items, told, `round ${round}`);
  assert.deepEqual(buildKnowledge(insider), said(insider));
});

test('none of it is anywhere but the open private panel, and nothing in the markup varies with what is known', () => {
  const scanned = hacker([{ round: 2, targetSeatId: 'seat-5', guess: 'Blue', matched: true, inCode: true }]);
  for (const view of [insider, alien, scanned, undercover([{ seatId: 'seat-2', activeFromRound: 4, consumed: false }])]) {
    const open = renderConnectedPlayerShell(model(view));
    assert.deepEqual(auditMarkup(open), []);
    const region = find(open, byRegion('knowledge'));
    assert.equal(textOf(region).includes('What you know'), true);
    // Tags, classes and identifiers are the same whatever the sentences say.
    assert.doesNotMatch(toHtml(region).replace(/>[^<]*</g, '><'), /insider|hacker|alien|undercover|cracker|code|scan|protect|blue|red/i);
    // Closed, or in the background: not in the model, not in the document.
    for (const overrides of [closed, { privacy: { concealed: true, revealed: true } }]) {
      const hidden = model(view, IDLE, overrides);
      assert.equal(hidden.match.privateArea.content, null);
      assert.doesNotMatch(toHtml(renderConnectedPlayerShell(hidden)), /What you know|The Code is|The Undercover is|you scanned|Protection for|hold the roles|weapons you hold|ms-knowledge/);
    }
  }
  // The shared display is built from a public view, which carries none of it.
  assert.doesNotMatch(toHtml(renderTableShell(buildTableShellModel({ ...environment, view: publicView() }))), /What you know|ms-knowledge|weapons you hold/);
});

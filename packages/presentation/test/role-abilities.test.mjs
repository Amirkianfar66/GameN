import test from 'node:test';
import assert from 'node:assert/strict';
import { FullPlayerViewSchema } from '@mothership/contracts';
import { buildKnowledge, buildTableShellModel, renderComicPlayerShell, renderComicTableShell, renderConnectedPlayerShell, textOf, toHtml } from '@mothership/presentation';
import { byClass, find, findAll } from './support/markup-audit.mjs';
import { card, environment, IDLE, model, playerView, publicView } from './support/protocol2-views.mjs';

// The role abilities, prepared for the Designer's treatments (issue #99). Every state the phone
// draws is one the seat's own view or its own command's receipt states, and the hooks a
// treatment can style say no more than the words beside them. Synthetic views that satisfy the
// shared strict schema; none is the result of an engine.

const listing = (command, seats) => view => { view.legalTargets = { ...view.legalTargets, [command]: seats }; };
const offersOf = markup => findAll(markup, byClass('ms-offer')).map(offer => [offer.attrs['data-kind'], offer.attrs['data-offer'], textOf(find(offer, byClass('ms-offer__status')))]);
const stripOf = markup => find(find(markup, byClass('phone-strip')), byClass('ms-card__state'));
const permutations = items => (items.length <= 1 ? [items] : items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(rest => [item, ...rest])));
/** A view of a match with this many players: the Red Disabler needs eight, the Officer nine. */
const sized = (count, change = () => {}) => playerView(view => {
  view.playerCount = count;
  view.seats = Array.from({ length: count }, (unused, index) => ({ seatId: `seat-${index + 1}`, health: 'Healthy', location: index % 2 === 0 ? 'Room A' : 'Room B', jailed: false, captain: false, revealedFaction: null }));
  change(view);
});
const nine = change => sized(9, change);

test('each line of the idle card carries its state for styling, and the state says what its words say', () => {
  assert.deepEqual(offersOf(renderConnectedPlayerShell(model(playerView()))), [['move', 'available', 'Available'], ['shot', 'unavailable', 'Not available']]);
  for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }, { deadline: { kind: 'unsynced' } }]) {
    if (overrides.connection === 'stale') { assert.deepEqual(offersOf(renderConnectedPlayerShell(model(playerView(), IDLE, overrides))), []); continue; }
    assert.deepEqual(offersOf(renderConnectedPlayerShell(model(playerView(), IDLE, overrides))), [['move', 'paused', 'Paused'], ['shot', 'unavailable', 'Not available']], JSON.stringify(overrides));
  }
  assert.deepEqual(offersOf(renderConnectedPlayerShell(model(playerView(listing('DISABLE', []))))).at(-1), ['disable', 'no-target', 'No one you can target right now']);
  assert.deepEqual(offersOf(renderConnectedPlayerShell(model(playerView(listing('SUPPLY', ['seat-3']))))).at(-1), ['supply', 'too-few', 'Too few players to choose right now']);
  // The phone's tray draws the same lines with the same hooks; its moves are the room tags.
  const tray = renderComicPlayerShell(model(playerView(listing('DISABLE', ['seat-3']))), { phoneView: 'actions' });
  assert.deepEqual(offersOf(tray), [['shot', 'unavailable', 'Not available'], ['disable', 'available', 'Available']]);
  // A state is one of five, whatever the action.
  for (const [, state] of offersOf(tray)) assert.match(state, /^(available|paused|unavailable|no-target|too-few)$/);
});

test('the strip and the card name the action they are about, for its own art, and only while they know it', () => {
  const view = playerView(listing('DISABLE', ['seat-3', 'seat-5']));
  const choice = { kind: 'disable', targetSeatId: 'seat-3' };
  for (const action of [
    { step: 'choosing', kind: 'disable', picked: [] },
    { step: 'confirming', choice, armed: true },
    { step: 'submitting', choice },
    { step: 'checking', choice, recovered: false },
    { step: 'accepted', choice, armed: true },
    { step: 'rejected', choice, code: 'NOT_ALLOWED', armed: true },
    { step: 'unknown', choice, recovered: false, phaseOver: false, armed: true },
  ]) {
    assert.equal(stripOf(renderComicPlayerShell(model(view, action), { phoneView: 'actions' })).attrs['data-kind'], 'disable', action.step);
    assert.equal(find(renderConnectedPlayerShell(model(view, action)), byClass('ms-card__state')).attrs['data-kind'], 'disable', action.step);
  }
  // A page reloaded with only the command's identifiers does not know what it was, and says nothing of it.
  for (const action of [{ step: 'checking', choice: null, recovered: true }, { step: 'accepted', choice: null, armed: true }]) {
    assert.equal(stripOf(renderComicPlayerShell(model(view, action), { phoneView: 'actions' })).attrs['data-kind'], undefined, action.step);
  }
  // Idle, the card is about nothing; closed or in the background, nothing of it is drawn at all.
  assert.equal(find(renderConnectedPlayerShell(model(view)), byClass('ms-card__state')).attrs['data-kind'], undefined);
  for (const privacy of [{ concealed: false, revealed: false }, { concealed: true, revealed: true }]) {
    const hidden = toHtml(renderComicPlayerShell(model(view, { step: 'submitting', choice }, { privacy }), { phoneView: 'actions' }));
    assert.doesNotMatch(hidden, /data-kind="disable"|data-offer=|Disable/, JSON.stringify(privacy));
  }
  // The shared display is built from the public view, which has no action of anyone's.
  assert.doesNotMatch(toHtml(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() }), { identities: [] })), /data-kind=|data-offer=/);
});

test('a Protection is used up, active, or active from a later round, as only the Undercover’s view states it', () => {
  const undercover = (round, protections) => playerView(view => { view.round = round; view.self.role = 'Undercover'; view.self.rescuesRemaining = 0; view.self.ordinaryWeapons = 1; view.knowledge.protections = protections; });
  // Resolved at the end of round 2: active from round 3, so in place in round 3, until it is used.
  assert.deepEqual(buildKnowledge(undercover(3, [{ seatId: 'seat-4', activeFromRound: 3, consumed: false }])).items.slice(0, 1), ['Protection for Player 4: active.']);
  assert.deepEqual(buildKnowledge(undercover(4, [{ seatId: 'seat-4', activeFromRound: 3, consumed: true }])).items.slice(0, 1), ['Protection for Player 4: used up.']);
  // Granted in round 5, it is active from a round the match never reaches: the showdown says so as the view does.
  assert.deepEqual(buildKnowledge(undercover(5, [{ seatId: 'seat-1', activeFromRound: 6, consumed: false }])).items.slice(0, 1), ['Protection for yourself: active from round 6.']);
  // No other role's view may carry one: the contract refuses it.
  for (const role of ['Cracker', 'Hacker', 'Supplier', 'Insider']) {
    const view = { ...playerView(), self: { ...playerView().self, role, rescuesRemaining: 0 }, knowledge: { ...playerView().knowledge, protections: [{ seatId: 'seat-4', activeFromRound: 3, consumed: false }] } };
    if (role === 'Hacker') view.knowledge.undercoverSeatId = 'seat-2';
    if (role === 'Insider') view.knowledge.insiderCandidates = ['seat-2', 'seat-3', 'seat-4'];
    assert.equal(FullPlayerViewSchema.safeParse(view).success, false, role);
  }
  // Registered and not yet resolved, a Protection is its receipt: never a line of what the seat knows, and never an outcome.
  const registered = card(playerView(view => { view.self.role = 'Undercover'; view.self.rescuesRemaining = 0; listing('PROTECT', ['seat-4'])(view); }), { step: 'accepted', choice: { kind: 'protect', targetSeatId: 'seat-4' }, armed: true });
  assert.deepEqual([registered.body.text, registered.body.detail], ['Protection for Player 4 registered.', 'This is not a result. Registered actions are resolved at the end of the round.']);
});

test('a Cracker is told how many Rescues are left, and when none are; no other role is told of Rescues', () => {
  const cracker = left => buildKnowledge(playerView(view => { view.self.rescuesRemaining = left; })).items.filter(item => /Rescue/.test(item));
  assert.deepEqual([cracker(2), cracker(1), cracker(0)], [['Rescues you have left: 2.'], ['Rescues you have left: 1.'], ['You have no Rescues left.']]);
  for (const role of ['Supplier', 'Blue Disabler', 'Undercover']) {
    assert.deepEqual(buildKnowledge(playerView(view => { view.self.role = role; view.self.rescuesRemaining = 0; })).items.filter(item => /Rescue/.test(item)), [], role);
  }
  // With none left the view does not open Rescue, and the card does not list it: the server decides, not the count.
  assert.deepEqual(card(playerView(view => { view.self.rescuesRemaining = 0; })).body.offers.map(offer => offer.kind), ['move', 'shot']);
});

test('the Alien’s starting Code is a set: every order the view could give says the same four players the same way', () => {
  const alien = order => playerView(view => { view.self.role = 'Alien'; view.self.rescuesRemaining = 0; view.knowledge.code = order; });
  const drawn = permutations(['seat-6', 'seat-1', 'seat-4', 'seat-2']).map(order => toHtml(renderComicPlayerShell(model(alien(order)), { phoneView: 'role' })));
  assert.equal(drawn.length, 24);
  assert.equal(new Set(drawn).size, 1);
  assert.match(drawn[0], /The Code is these four players: Player 1 \(you\), Player 2, Player 4, Player 6\./);
});

test('the Officer’s one shot is offered when the nine-player view offers it, from round 1, and is never called used by guesswork', () => {
  // Only a nine-player match has an Officer: the contract refuses one in seven or eight.
  for (const count of [7, 8]) {
    const view = { ...nine(), playerCount: count, seats: nine().seats.slice(0, count), self: { ...nine().self, role: 'Officer', rescuesRemaining: 0 } };
    assert.equal(FullPlayerViewSchema.safeParse(view).success, false, `${count} players`);
  }
  const officer = (change = () => {}) => nine(view => { view.self.role = 'Officer'; view.self.rescuesRemaining = 0; view.self.ordinaryWeapons = 1; change(view); });
  // Round 1: the phone has no round rule of its own; the view's offer is the shot.
  const armed = card(officer(view => { view.self.shotAvailable = true; listing('REGISTER_SHOT', ['seat-3', 'seat-5'])(view); }));
  assert.deepEqual(armed.body.offers.find(offer => offer.kind === 'shot'), { kind: 'shot', label: 'Shot', state: 'available', statusLabel: 'Available', open: { id: 'ms-action-open-shot', label: 'Choose a target' } });
  // After the one shot the view no longer offers it. It does not say the shot is spent, so neither
  // does the phone: "Not available" is all it states (the view gap is recorded on #99).
  const after = model(officer(view => { view.self.ordinaryWeapons = 1; }));
  assert.deepEqual(after.match.privateArea.content.actions.card.body.offers.find(offer => offer.kind === 'shot').statusLabel, 'Not available');
  assert.doesNotMatch(toHtml(renderComicPlayerShell(after, { phoneView: 'actions' })), /\b(used|spent)\b/i);
});

test('a Disable is the Disabler’s own: drawn in the private card and strip only, with nothing that sets it apart in public', () => {
  for (const [role, count] of [['Blue Disabler', 7], ['Red Disabler', 8]]) {
    const view = sized(count, change => { change.self.role = role; change.self.rescuesRemaining = 0; change.self.disablerAvailable = true; change.legalTargets = { DISABLE: ['seat-3'] }; });
    const choice = { kind: 'disable', targetSeatId: 'seat-3' };
    const accepted = card(view, { step: 'accepted', choice, armed: true });
    assert.deepEqual([accepted.body.text, accepted.body.detail], ['Disable at Player 3 registered.', 'This is not a result. Registered actions are resolved at the end of the round.'], role);
    // Once it is registered the board marks nothing: no ring, pick or pending mark on the target.
    assert.deepEqual(accepted.board, { eligible: [], picked: [], numbered: false, pending: [], faint: false, move: null }, role);
  }
  // The Red Disabler needs eight players: the contract refuses one in seven.
  assert.throws(() => sized(7, change => { change.self.role = 'Red Disabler'; change.self.rescuesRemaining = 0; }));
  // The public display is the same for every role: the public view carries no role and no command.
  assert.doesNotMatch(toHtml(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() }), { identities: [] })), /Disabl|disable/);
});

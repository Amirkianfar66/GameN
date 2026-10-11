import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, renderComicPlayerShell, renderComicTableShell, renderConnectedPlayerShell, textOf, toHtml } from '@mothership/presentation';
import { closed, environment, IDLE, model, playerView, publicView } from './support/protocol2-views.mjs';
import { auditMarkup, byClass, byId, find, findAll } from './support/markup-audit.mjs';

// The Insider's investigation board. The rule: at game start the Insider receives the
// unordered set of the three players who are Undercover, Alien and Cracker, without knowing
// which is which. The board draws that set and nothing more, and only in the Insider's own
// deliberately opened card while the view is live.

const IDENTITIES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus'].map((displayName, index) => ({ seatId: `seat-${index + 1}`, displayName, characterId: `c${index + 3 > 9 ? index - 6 : index + 3}` }));
const insider = (candidates = ['seat-2', 'seat-4', 'seat-6']) => playerView(view => {
  view.self.role = 'Insider'; view.self.rescuesRemaining = 0; view.knowledge.insiderCandidates = candidates;
});
const draw = (view, overrides = {}, context = {}) => renderComicPlayerShell(model(view, IDLE, overrides), { phoneView: 'role', identities: IDENTITIES, investigation: true, ...context });
const boardOf = markup => find(markup, byId('phone-investigation'));
const ROLE = /Undercover|Alien|Cracker/;
const SENTENCE = /hold the roles/;
const permutations = items => (items.length <= 1 ? [items] : items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(rest => [item, ...rest])));

test('the board shows the three players in seat order, and the three roles once, apart from them', () => {
  const markup = draw(insider(['seat-6', 'seat-2', 'seat-4']));
  // The board adds nothing to the shell's audit: the same findings with it open as with the card alone.
  assert.deepEqual(auditMarkup(markup), auditMarkup(draw(insider(['seat-6', 'seat-2', 'seat-4']), {}, { investigation: false })));
  const board = boardOf(markup);
  assert.equal(board.attrs['data-treatment'], 'interim', 'The Designer’s treatment is pending; this one says so');
  assert.equal(textOf(find(board, byId('phone-investigation-heading'))), 'Investigation board');
  const players = findAll(board, byClass('phone-investigation__player'));
  assert.deepEqual(players.map(textOf), ['Player 2, Ben', 'Player 4, Dev', 'Player 6, Fay']);
  assert.deepEqual(players.map(player => find(player, byClass('phone-investigation__portrait')).attrs['data-character']), ['c4', 'c6', 'c8']);
  // The three roles as one set: one picture with one accessible name, in the rule's order.
  const set = find(board, byClass('phone-investigation__role-set'));
  assert.deepEqual([set.attrs.role, set.attrs['aria-label']], ['img', 'Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.']);
  assert.deepEqual(findAll(set, byClass('phone-investigation__role-name')).map(textOf), ['Undercover', 'Alien', 'Cracker']);
  assert.match(textOf(board), /Between them, one each:.*Who holds which is not known\./s);
  // The toggle says what it shows and that it is open.
  const toggle = find(markup, byId('phone-investigation-toggle'));
  assert.deepEqual([toggle.attrs['aria-expanded'], toggle.attrs['aria-controls'], textOf(toggle)], ['true', 'phone-investigation', 'Hide investigation board']);
  // The card's list of what the seat knows does not say it a second time.
  assert.doesNotMatch(textOf(find(markup, byClass('phone-knowledge'))), SENTENCE);
});

test('every order the view could give, and so every deal of the three roles, draws the same board', () => {
  // The view carries no role for any of the three, so a deal can only show up as an order.
  const drawn = permutations(['seat-2', 'seat-4', 'seat-6']).map(order => toHtml(draw(insider(order))));
  assert.equal(drawn.length, 6);
  assert.equal(new Set(drawn).size, 1);
  // Closed, too: the same toggle whatever the order.
  assert.equal(new Set(permutations(['seat-2', 'seat-4', 'seat-6']).map(order => toHtml(draw(insider(order), {}, { investigation: false })))).size, 1);
  // A different set is a different board.
  assert.notEqual(toHtml(draw(insider(['seat-1', 'seat-3', 'seat-5']))), drawn[0]);
});

test('nothing on the board pairs a player with a role', () => {
  const board = boardOf(draw(insider()));
  const players = findAll(board, byClass('phone-investigation__player'));
  for (const player of players) {
    assert.doesNotMatch(textOf(player), ROLE, 'no role is written on a player');
    assert.doesNotMatch(toHtml(player), /data-(?:role|device|team|faction)/, 'no role hook on a player');
  }
  // The roles are one set, outside the players' list, every name drawn the same way, and never a
  // list a screen reader could pair item by item with the three players.
  const names = findAll(board, byClass('phone-investigation__role-name'));
  assert.equal(names.length, 3);
  assert.equal(new Set(names.map(name => JSON.stringify(name.attrs))).size, 1);
  const roles = find(board, byClass('phone-investigation__roles'));
  assert.equal(findAll(roles, element => ['ul', 'ol', 'li'].includes(element.tag) || ['list', 'listitem'].includes(String(element.attrs.role))).length, 0);
  assert.equal(findAll(find(board, byClass('phone-investigation__players')), byClass('phone-investigation__role-name')).length, 0);
  assert.equal(findAll(roles, byClass('phone-investigation__player')).length, 0);
  // Only the set's own name says a role. Nothing on or around a player does, and nothing points from a player to the set.
  const labelled = findAll(board, element => Object.entries(element.attrs).some(([name, value]) => name.startsWith('aria-') && ROLE.test(String(value))));
  assert.deepEqual(labelled.map(element => element.attrs.class), ['phone-investigation__role-set']);
  for (const player of players) {
    assert.equal(findAll(player, element => ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns'].some(name => name in element.attrs)).length, 0);
  }
});

test('the board is only in the Insider’s own open card, while the view is live', () => {
  const absent = (markup, label) => {
    const html = toHtml(markup);
    assert.doesNotMatch(html, /phone-investigation/, `${label}: no board or toggle`);
    assert.doesNotMatch(textOf(markup), SENTENCE, `${label}: the set is not written anywhere`);
  };
  // A card not opened, or a page in the background: nothing private is in the model at all.
  absent(draw(insider(), closed), 'closed');
  absent(draw(insider(), { privacy: { concealed: true, revealed: true } }), 'background');
  // A view the server no longer confirms shows neither the board nor the sentence.
  absent(draw(insider(), { connection: 'stale' }), 'stale');
  // Only the card shows it; actions, the board and the menu do not.
  for (const phoneView of ['board', 'actions', 'more']) absent(draw(insider(), {}, { phoneView }), phoneView);
  // Other roles have no board: their views carry no such set.
  for (const role of ['Cracker', 'Supplier', 'Blue Disabler']) absent(draw(playerView(view => { view.self.role = role; view.self.rescuesRemaining = 0; })), role);
  // The shared display is built from a public view.
  absent(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() }), { identities: IDENTITIES }), 'display');
  // Closed by default: the toggle, and nothing of the three until it is pressed.
  const shut = draw(insider(), {}, { investigation: false });
  assert.equal(find(shut, byId('phone-investigation-toggle')).attrs['aria-expanded'], 'false');
  assert.deepEqual([find(shut, byId('phone-investigation')).attrs.hidden, find(shut, byId('phone-investigation')).children], [true, []]);
  assert.equal(findAll(shut, byClass('phone-investigation__player')).length, 0);
  assert.doesNotMatch(textOf(shut), SENTENCE);
});

test('without public identities the portraits are numbers, and a name is only ever text', () => {
  const bare = boardOf(draw(insider(), {}, { identities: [] }));
  const players = findAll(bare, byClass('phone-investigation__player'));
  assert.deepEqual(players.map(textOf), ['2Player 2', '4Player 4', '6Player 6']);
  assert.equal(players.some(player => find(player, byClass('phone-investigation__portrait')).attrs['data-character'] !== undefined), false);
  // A name is text: escaped, and never a class, an identifier or a resource.
  const odd = IDENTITIES.map(identity => (identity.seatId === 'seat-4' ? { ...identity, displayName: '<b>Konstantinos' } : identity));
  const html = toHtml(boardOf(draw(insider(), {}, { identities: odd })));
  assert.match(html, /&lt;b&gt;Konstantinos/);
  assert.doesNotMatch(html, /<b>/);
});

test('the plain phone still says the set in one sentence', () => {
  assert.match(textOf(renderConnectedPlayerShell(model(insider()))), /Player 2, Player 4, Player 6 hold the roles Undercover, Alien and Cracker, one each\. You are not told which of them holds which\./);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, renderComicPlayerShell, renderComicTableShell, renderConnectedPlayerShell, textOf, toHtml } from '@mothership/presentation';
import { closed, environment, IDLE, model, playerView, publicView } from './support/protocol2-views.mjs';
import { auditMarkup, byClass, byId, find, findAll } from './support/markup-audit.mjs';

// The Insider's file (the Designer's ability art abilities-0.1.0, PR #102 at 1453500, ported).
// The rule: at game start the Insider receives the unordered set of the three players who are
// Undercover, Alien and Cracker, without knowing which is which. The file draws that set and
// nothing more, and only in the Insider's own deliberately opened card while the view is live.
// These are the Designer's checks (docs/design/abilities-handoff.md, section 11) on the markup;
// the browser capture measures the rest.

const IDENTITIES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus'].map((displayName, index) => ({ seatId: `seat-${index + 1}`, displayName, characterId: `c${index + 3 > 9 ? index - 6 : index + 3}` }));
const insider = (candidates = ['seat-2', 'seat-4', 'seat-6'], change = () => {}) => playerView(view => {
  view.self.role = 'Insider'; view.self.rescuesRemaining = 0; view.knowledge.insiderCandidates = candidates; change(view);
});
const draw = (view, overrides = {}, context = {}) => renderComicPlayerShell(model(view, IDLE, overrides), { phoneView: 'role', identities: IDENTITIES, ...context });
const fileOf = markup => find(markup, byClass('ab-file'));
const photosOf = markup => findAll(markup, byClass('ab-photo'));
const ROLE = /Undercover|Alien|Cracker/;
const SENTENCE = /hold the roles/;
const PAIRING = ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns'];
const permutations = items => (items.length <= 1 ? [items] : items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(rest => [item, ...rest])));
/** A snapshot with what may differ between the three taken out: its seat, its name and its portrait. */
const shapeOf = photo => toHtml(photo)
  .replace(/(id="ab-photo-|data-seat=")\d/g, '$1#').replace(/aria-label="[^"]*"/, 'aria-label="#"')
  .replace(/data-character="c\d"/g, 'data-character="#"').replace(/>[^<]*</g, '><');

test('the file shows the three players in seat order, and the three roles once, as one set below them', () => {
  const markup = draw(insider(['seat-6', 'seat-2', 'seat-4']));
  // The file adds nothing to the shell's audit: the same findings as another role's card.
  assert.deepEqual(auditMarkup(markup), auditMarkup(draw(playerView(view => { view.self.role = 'Supplier'; view.self.rescuesRemaining = 0; }))));
  const file = fileOf(markup);
  assert.deepEqual([file.tag, file.attrs['data-file'], file.attrs['aria-labelledby'], file.attrs['data-region']], ['section', 'insider', 'ab-file-title', 'insider-file']);
  assert.equal(textOf(find(file, byId('ab-file-title'))), 'Insider file');
  // The release's own sentence is the file's summary, and the card's list does not say it again.
  assert.match(textOf(find(file, byClass('ab-vh'))), /^Player 2, Player 4, Player 6 hold the roles Undercover, Alien and Cracker, one each\. You are not told which of them holds which\.$/);
  assert.doesNotMatch(textOf(find(markup, byClass('phone-knowledge'))), SENTENCE);
  // Three snapshots, in seat order whatever order the view gave, each said whole by its button.
  const photos = photosOf(markup);
  assert.deepEqual(photos.map(photo => photo.attrs['data-seat']), ['2', '4', '6']);
  assert.deepEqual(photos.map(photo => photo.attrs['aria-label']), ['Player 2, Ben. Inspect', 'Player 4, Dev. Inspect', 'Player 6, Fay. Inspect']);
  assert.deepEqual(photos.map(photo => find(photo, byClass('ab-photo__art')).attrs['data-character']), ['c4', 'c6', 'c8']);
  assert.deepEqual(photos.map(photo => textOf(find(photo, byClass('ab-photo__name')))), ['Ben', 'Dev', 'Fay']);
  assert.deepEqual(photos.map(photo => photo.attrs['aria-pressed']), ['false', 'false', 'false']);
  assert.equal(find(file, byClass('ab-suspects')).attrs['aria-label'], 'The three players');
  // The three roles as one set: one picture with one accessible name, in the rule's order, after the snapshots.
  const roles = findAll(file, element => element.attrs.role === 'img');
  assert.equal(roles.length, 1);
  assert.equal(roles[0].attrs['aria-label'], 'Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.');
  assert.deepEqual(findAll(roles[0], byClass('ab-roles__name')).map(textOf), ['Undercover', 'Alien', 'Cracker']);
  const field = find(file, byClass('ab-file__field'));
  const order = field.children.filter(child => typeof child !== 'string').map(child => String(child.attrs.class));
  assert.ok(order.indexOf('ab-suspects') < order.indexOf('ab-roles'), 'the roles come after the three snapshots');
  assert.equal(textOf(find(file, byClass('ab-file__note'))), 'Who is which: unknown.');
  // The inspect card is there, empty, inside a live container that stays put.
  assert.deepEqual([find(file, byClass('ab-inspect')).attrs['aria-live'], find(file, byClass('ab-inspect__card')).attrs.hidden, find(file, byClass('ab-inspect__card')).children], ['polite', true, []]);
  // The file follows the role card, which is told to make way.
  const panel = find(markup, byId('ms-private-panel'));
  assert.equal(panel.attrs['data-file'], 'insider');
  const kids = panel.children.filter(child => typeof child !== 'string');
  assert.equal(kids.findIndex(child => String(child.attrs.class).includes('ab-file')), kids.findIndex(child => String(child.attrs.class).includes('ms-role-card')) + 1);
});

test('every order the view could give, and so every deal of the three roles, draws the same file', () => {
  // The view carries no role for any of the three, so a deal can only show up as an order.
  const drawn = permutations(['seat-2', 'seat-4', 'seat-6']).map(order => toHtml(draw(insider(order))));
  assert.equal(drawn.length, 6);
  assert.equal(new Set(drawn).size, 1);
  // Inspected, too: the same file whatever the order.
  assert.equal(new Set(permutations(['seat-2', 'seat-4', 'seat-6']).map(order => toHtml(draw(insider(order), {}, { inspect: 'seat-4' })))).size, 1);
  // A different set is a different file.
  assert.notEqual(toHtml(draw(insider(['seat-1', 'seat-3', 'seat-5']))), drawn[0]);
});

test('nothing in the file pairs a player with a role', () => {
  const markup = draw(insider());
  const file = fileOf(markup);
  const photos = photosOf(markup);
  // Built alike: the same elements, classes and attributes; only the seat, the name and the portrait differ.
  assert.equal(new Set(photos.map(shapeOf)).size, 1);
  for (const photo of photos) {
    assert.doesNotMatch(textOf(photo), ROLE, 'no role is written on a snapshot');
    assert.doesNotMatch(String(photo.attrs['aria-label']), ROLE, 'no role in a snapshot’s name');
    assert.doesNotMatch(toHtml(photo), /data-(?:role|device|team|faction)/, 'no role hook on a snapshot');
    assert.equal(findAll(photo, element => PAIRING.some(name => name in element.attrs)).length, 0, 'a snapshot points nowhere');
  }
  // The roles are one set outside the snapshots' list, every name drawn the same way, and never a
  // list a screen reader could pair item by item with the three players.
  const roles = find(file, byClass('ab-roles'));
  const names = findAll(roles, byClass('ab-roles__name'));
  assert.equal(new Set(names.map(name => JSON.stringify(name.attrs))).size, 1);
  assert.equal(findAll(roles, element => ['ul', 'ol', 'li'].includes(element.tag) || ['list', 'listitem'].includes(String(element.attrs.role))).length, 0);
  assert.equal(findAll(find(file, byClass('ab-suspects')), byClass('ab-roles__name')).length, 0);
  // Only the set's own name says a role. Nothing on or around a player does.
  const labelled = findAll(file, element => Object.entries(element.attrs).some(([name, value]) => name.startsWith('aria-') && ROLE.test(String(value))));
  assert.deepEqual(labelled.map(element => element.attrs.class), ['ab-roles']);
});

test('inspecting a snapshot presses it and says that player’s public facts, and nothing else', () => {
  const view = insider(['seat-2', 'seat-4', 'seat-6'], change => {
    change.seats[1] = { ...change.seats[1], location: 'Command Room', captain: true };
    change.seats[3] = { ...change.seats[3], location: 'Jail', jailed: true, health: 'Injured' };
  });
  const markup = draw(view, {}, { inspect: 'seat-4' });
  assert.deepEqual(photosOf(markup).map(photo => photo.attrs['aria-pressed']), ['false', 'true', 'false']);
  const card = find(markup, byClass('ab-inspect__card'));
  assert.equal(card.attrs.hidden, undefined);
  assert.equal(card.attrs['data-region'], 'insider-inspect');
  assert.equal(textOf(find(card, byClass('ab-inspect__who'))), 'Player 4, Dev');
  assert.equal(textOf(find(card, byClass('ab-inspect__facts'))), 'Jail · Injured · Jailed');
  const buttons = findAll(card, element => element.tag === 'button');
  assert.deepEqual(buttons.map(button => [textOf(button), button.attrs['data-file-act'], button.attrs['data-seat']]), [['Show on board', 'show', '4'], ['Back', 'back', '4']]);
  assert.doesNotMatch(textOf(card), ROLE);
  assert.equal(textOf(find(draw(view, {}, { inspect: 'seat-2' }), byClass('ab-inspect__facts'))), 'Command Room · Healthy · Captain');
  // The file adds nothing to the shell's audit while inspecting, either.
  assert.deepEqual(auditMarkup(markup), auditMarkup(draw(view)));
  // A seat that is not one of the three is never inspected: nothing is pressed and the card stays empty.
  const stray = draw(view, {}, { inspect: 'seat-5' });
  assert.deepEqual(photosOf(stray).map(photo => photo.attrs['aria-pressed']), ['false', 'false', 'false']);
  assert.deepEqual([find(stray, byClass('ab-inspect__card')).attrs.hidden, find(stray, byClass('ab-inspect__card')).children], [true, []]);
});

test('the file is only in the Insider’s own open card, while the view is live', () => {
  const absent = (markup, label) => {
    assert.doesNotMatch(toHtml(markup), /ab-file|ab-photo|ab-roles/, `${label}: no file`);
    assert.doesNotMatch(textOf(markup), SENTENCE, `${label}: the set is not written anywhere`);
  };
  // A card not opened, or a page in the background: nothing private is in the model at all.
  absent(draw(insider(), closed), 'closed');
  absent(draw(insider(), { privacy: { concealed: true, revealed: true } }), 'background');
  // A view the server no longer confirms shows the closed folder instead.
  absent(draw(insider(), { connection: 'stale' }), 'stale');
  // Only the card shows it; actions, the board and the menu do not.
  for (const phoneView of ['board', 'actions', 'more']) absent(draw(insider(), {}, { phoneView }), phoneView);
  // Other roles have no file: their views carry no such set.
  for (const role of ['Cracker', 'Supplier', 'Blue Disabler']) absent(draw(playerView(view => { view.self.role = role; view.self.rescuesRemaining = 0; })), role);
  // The shared display is built from a public view.
  absent(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() }), { identities: IDENTITIES }), 'display');
});

test('a card that cannot be shown is one closed folder, the same for every role and seat', () => {
  const folderOf = view => find(draw(view, { connection: 'stale' }), byId('ms-private-panel'));
  const insiderFolder = folderOf(insider());
  assert.equal(textOf(insiderFolder), 'Your card stays hidden until your view is up to date.');
  assert.doesNotMatch(toHtml(insiderFolder), /ms-role-card|data-device|data-team|data-file|Insider/);
  const others = {
    Cracker: () => {}, Supplier: view => { view.self.rescuesRemaining = 0; }, 'Blue Disabler': view => { view.self.rescuesRemaining = 0; },
    // A role whose view carries knowledge of its own: the Alien's Code.
    Alien: view => { view.self.rescuesRemaining = 0; view.knowledge.code = ['seat-1', 'seat-3', 'seat-5', 'seat-7']; },
  };
  for (const [role, change] of Object.entries(others)) {
    const other = folderOf(playerView(view => { view.self.role = role; change(view); }));
    assert.equal(toHtml(other), toHtml(insiderFolder), `${role}: the same folder`);
  }
  // The folder stands for the card only: the Actions view keeps its own paused notice.
  assert.doesNotMatch(toHtml(draw(insider(), { connection: 'stale' }, { phoneView: 'actions' })), /ab-folder/);
  // While the view is live the card is the card.
  assert.doesNotMatch(toHtml(draw(insider())), /ab-folder/);
});

test('without public identities a snapshot shows the seat number, and a name is only ever text', () => {
  const bare = draw(insider(), {}, { identities: [] });
  const photos = photosOf(bare);
  assert.deepEqual(photos.map(photo => photo.attrs['aria-label']), ['Player 2. Inspect', 'Player 4. Inspect', 'Player 6. Inspect']);
  assert.deepEqual(photos.map(photo => textOf(find(photo, byClass('ab-photo__numeral')))), ['2', '4', '6']);
  assert.equal(photos.some(photo => find(photo, byClass('ab-photo__art')).attrs['data-character'] !== undefined), false);
  assert.equal(new Set(photos.map(shapeOf)).size, 1);
  // A name is text: escaped, and never a class, an identifier or a resource.
  const odd = IDENTITIES.map(identity => (identity.seatId === 'seat-4' ? { ...identity, displayName: '<b>Konstantinos' } : identity));
  const html = toHtml(fileOf(draw(insider(), {}, { identities: odd })));
  assert.match(html, /&lt;b&gt;Konstantinos/);
  assert.doesNotMatch(html, /<b>/);
});

test('the plain phone still says the set in one sentence', () => {
  assert.match(textOf(renderConnectedPlayerShell(model(insider()))), /Player 2, Player 4, Player 6 hold the roles Undercover, Alien and Cracker, one each\. You are not told which of them holds which\./);
});

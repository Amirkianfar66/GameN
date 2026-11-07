import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, renderComicPlayerShell, renderComicTableShell, toHtml, splitRegions } from '@mothership/presentation';
import { model, playerView, publicView, environment, closed } from './support/protocol2-views.mjs';
import { auditMarkup, find, findAll, byRegion, byClass } from './support/markup-audit.mjs';
const identities = Array.from({ length: 7 }, (_, index) => ({ seatId: `seat-${index + 1}`, displayName: index === 1 ? '<Eli>' : `Name ${index + 1}`, characterId: `c${index + 1}` }));
const role = (name, patch = () => {}) => playerView(view => { view.self.role = name; view.self.rescuesRemaining = name === 'Cracker' ? 2 : 0; patch(view); });
const draw = (view, action = undefined, overrides = {}, context = {}) => renderComicPlayerShell(model(view, action, overrides), { identities, phoneView: 'role', ...context });
const html = (...args) => toHtml(draw(...args));

test('Hacker printouts retain view order; wrong results never draw Code membership, and only known Undercover is labeled', () => {
  const view = role('Hacker', v => { v.knowledge.undercoverSeatId = 'seat-5'; v.round = 3; v.knowledge.scanResults = [{ round: 2, targetSeatId: 'seat-2', guess: 'Red', matched: false, inCode: null }, { round: 1, targetSeatId: 'seat-3', guess: 'Blue', matched: true, inCode: false }]; });
  const drawn = draw(view); assert.equal(find(drawn, byClass('ab-file')).attrs['aria-labelledby'], 'ab-file-title');
  const prints = findAll(drawn, byClass('ab-printout'));
  assert.deepEqual(prints.map(node => node.attrs['data-scan']), ['2:seat-2', '1:seat-3']);
  assert.doesNotMatch(toHtml(prints[0]), /ab-code-mark|data-struck/);
  assert.match(toHtml(prints[1]), /data-struck="true"/);
  const photos = findAll(drawn, byClass('ab-photo'));
  assert.deepEqual(photos.map(node => node.attrs['data-seat']), ['5']);
  assert.equal(findAll(drawn, byClass('ab-photo__tape')).length, 1);
  assert.match(toHtml(drawn), /&lt;Eli&gt;/);
});
test('Alien Code and compound strip windows are unordered sets in seat order; every board pick uses the same check', () => {
  const view = role('Alien', v => { v.knowledge.code = ['seat-7', 'seat-1', 'seat-3', 'seat-2']; });
  const drawn = draw(view); assert.equal(find(drawn, byClass('ab-file')).attrs['aria-labelledby'], 'ab-file-title');
  assert.deepEqual(findAll(drawn, byClass('ab-photo')).map(node => node.attrs['data-seat']), ['1', '2', '3', '7']);
  assert.equal(findAll(drawn, byClass('ab-photo__own')).length, 1);
  assert.match(html(view), /<ul class="ab-code-set"/);
  const coding = role('Hacker', v => { v.knowledge.undercoverSeatId = 'seat-5'; v.legalTargets.CODE_ATTEMPT = v.seats.map(seat => seat.seatId); v.self.codeAttemptAvailable = true; v.round = 5; });
  const action = { step: 'confirming', choice: { kind: 'code', seatIds: ['seat-7', 'seat-1', 'seat-3', 'seat-2'] }, armed: true };
  const strip = draw(coding, action, {}, { phoneView: 'actions' });
  const card = find(strip, byClass('ab-code-card'));
  assert.deepEqual(findAll(card, byClass('ab-chip')).map(node => node.attrs['data-seat']), ['1', '2', '3', '7']);
  const board = toHtml(find(strip, byRegion('comic-board'))); assert.equal([...board.matchAll(/data-mark="check"/g)].length, 4); assert.doesNotMatch(board, /data-mark="number"/);
});
test('known private resources render empty Cracker vials and consumed shields; unavailable offers cannot manufacture durable spent flags', () => {
  const cracker = role('Cracker', v => { v.self.rescuesRemaining = 0; });
  const note = find(draw(cracker), byClass('ab-vials'));
  assert.equal(note.attrs['data-remaining'], '0'); assert.ok(findAll(note, byClass('ab-vial')).every(node => node.attrs['data-full'] === 'false'));
  assert.match(html(cracker), /You have no Rescues left/);
  const under = role('Undercover', v => { v.round = 3; v.knowledge.protections = [{ seatId: 'seat-2', activeFromRound: 2, consumed: true }, { seatId: 'seat-3', activeFromRound: 3, consumed: false }, { seatId: 'seat-4', activeFromRound: 4, consumed: false }]; });
  assert.deepEqual(findAll(draw(under), byClass('ab-guard')).map(node => node.attrs['data-state']), ['used', 'active', 'queued']);
  assert.match(html(under), /data-mark="shield-used"/);
  assert.doesNotMatch(html(role('Blue Disabler')), /ab-cell|data-spent|ab-vials/);
  const rejected = { step: 'rejected', choice: { kind: 'disable', targetSeatId: 'seat-2' }, code: 'NOT_ALLOWED', armed: true };
  assert.doesNotMatch(html(role('Blue Disabler'), rejected, {}, { phoneView: 'actions' }), /ab-cell/, 'no current offer cannot claim a charged cell');
  const accepted = { step: 'accepted', choice: { kind: 'disable', targetSeatId: 'seat-2' }, armed: true };
  assert.match(html(role('Blue Disabler'), accepted, {}, { phoneView: 'actions' }), /ab-cell.*data-spent="true"/, 'a known own receipt can spend its picture');
});
test('private action portraits, Code windows and Scan effects are removed on stale/expired/unsynced/background views and identifier-only recovery', () => {
  const view = role('Hacker', v => { v.knowledge.undercoverSeatId = 'seat-5'; v.self.scanAvailable = true; v.legalTargets.SCAN = ['seat-2']; });
  const action = { step: 'submitting', choice: { kind: 'scan', targetSeatId: 'seat-2', guess: 'Red' } };
  assert.match(html(view, action, {}, { phoneView: 'actions' }), /ab-scan-target.*data-sweeping="true"/);
  for (const overrides of [{ connection: 'stale' }, { deadline: { kind: 'expired' } }, { deadline: { kind: 'unsynced' } }, { privacy: { concealed: true, revealed: true } }]) {
    const drawn = draw(view, action, overrides, { phoneView: 'actions' });
    assert.doesNotMatch(toHtml(drawn), /ab-scan-target|ab-code-card|ab-cell|ab-rounds|ab-chip/, JSON.stringify(overrides));
    if (overrides.connection || overrides.privacy) assert.equal(model(view, action, overrides).match.privateArea.content, null);
  }
  const recovered = draw(view, { step: 'checking', choice: null, recovered: true }, {}, { phoneView: 'actions' });
  assert.doesNotMatch(toHtml(recovered), /ab-scan-target|ab-chip|ab-code-card/);
  assert.match(toHtml(recovered), /Checking/);
});
test('paired private knowledge does not change public regions; concealment removes every new private note', () => {
  const hacker = role('Hacker', v => { v.knowledge.undercoverSeatId = 'seat-5'; });
  const alien = role('Alien', v => { v.knowledge.code = ['seat-7', 'seat-1', 'seat-3', 'seat-2']; });
  const a = splitRegions(draw(hacker)), b = splitRegions(draw(alien));
  for (const key of ['comic-board','phase','timer','vote','result','location','roster']) assert.equal(a.regions.get(key), b.regions.get(key), key);
  for (const view of [hacker, alien]) {
    assert.doesNotMatch(html(view, undefined, closed), /ab-file|ab-kit|ab-chip|ab-printout|ab-guard|data-device|data-team/);
    assert.doesNotMatch(toHtml(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() }), { identities })), /ab-file|ab-kit|ab-chip|ab-printout|ab-guard/);
  }
});
test('Supply art names only delivered recipients in own acknowledgments; a received slip never identifies a Supplier', () => {
  const own = { seatId: 'seat-1', historyAvailable: true, supplierResults: [{ round: 3, commandId: 'own-command', successfulRecipientSeatIds: ['seat-5', 'seat-1'] }], receivedSupply: [{ round: 3 }] };
  const drawn = draw(role('Supplier'), undefined, {}, { acknowledgments: own });
  assert.deepEqual(findAll(drawn, byClass('ab-slip')).map(node => node.attrs['data-slip']), ['supplied:3:own-command', 'received:3']);
  const received = findAll(drawn, byClass('ab-slip'))[1]; assert.doesNotMatch(toHtml(received), /Supplier|seat-5|Name 5/);
  const outsider = draw(role('Supplier'), undefined, {}, { acknowledgments: { ...own, seatId: 'seat-2' } }); assert.equal(findAll(outsider, byClass('ab-slip')).length, 0);
  assert.doesNotMatch(html(role('Supplier'), undefined, closed, { acknowledgments: own }), /ab-slip|own-command/);
});

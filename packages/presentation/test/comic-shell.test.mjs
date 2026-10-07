import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, renderComicPlayerShell, renderComicTableShell, splitRegions, toHtml } from '@mothership/presentation';
import { model, playerView, publicView, environment, closed } from './support/protocol2-views.mjs';
import { auditMarkup } from './support/markup-audit.mjs';

const identities = [{ seatId: 'seat-1', displayName: '<Hacker>', characterId: 'c8' }, { seatId: 'seat-2', displayName: 'Ada', characterId: 'c1' }];
test('comic names are escaped text with seat numbers, character selection never derives from a role', () => {
  const markup = renderComicPlayerShell(model(playerView()), { identities });
  auditMarkup(markup);
  const html = toHtml(markup);
  assert.match(html, /&lt;Hacker&gt;/u);
  assert.doesNotMatch(html, /<Hacker>/u);
  assert.match(html, /data-character="c8"/u);
  assert.match(html, /data-device="cracker"/u);
  assert.match(html, /Players and locations/u);
  assert.match(html, /ms-comic-board-heading/u);
});
test('closing or concealing the private panel removes every role/device/team hook while keeping the comic board', () => {
  for (const privacy of [closed, { privacy: { concealed: true, revealed: true } }]) {
    const markup = renderComicPlayerShell(model(playerView(), undefined, privacy), { identities });
    auditMarkup(markup);
    const html = toHtml(markup);
    assert.doesNotMatch(html, /data-device|data-team|ms-role-card__art|Cracker/u);
    assert.match(html, /ms-comic-board-heading/u);
  }
});
test('paired private states produce identical public comic regions', () => {
  const a = playerView();
  const b = playerView(view => { view.self.role = 'Supplier'; view.legalTargets.SUPPLY = ['seat-2','seat-3']; });
  const first = splitRegions(renderComicPlayerShell(model(a), { identities }));
  const other = splitRegions(renderComicPlayerShell(model(b), { identities }));
  for (const key of ['comic-board','roster','location','phase','timer','vote','result']) assert.equal(first.regions.get(key), other.regions.get(key), key);
});
test('table gets public identities and no private card; missing and unknown characters keep numbered tokens', () => {
  const table = buildTableShellModel({ ...environment, view: publicView() });
  const html = toHtml(renderComicTableShell(table, { identities }));
  assert.match(html, /data-character="c8"/u);
  assert.doesNotMatch(html, /data-device|ms-role-card__art|data-team/u);
  assert.doesNotMatch(toHtml(renderComicTableShell(table)), /data-character/u);
  assert.doesNotMatch(toHtml(renderComicTableShell(table, { identities: [{ seatId: 'seat-1', displayName: null, characterId: 'Officer' }] })), /data-character/u);
});
test('comic styling cannot alter the server-provided action controls', () => {
  const choosing = model(playerView(), { step: 'choosing', kind: 'move' });
  const html = toHtml(renderComicPlayerShell(choosing, { identities }));
  assert.equal((html.match(/data-intent="action\/choose"/gu) ?? []).length, 1);
  assert.match(html, /data-value="Room B"/u);
  assert.doesNotMatch(html, /data-value="Command Room"/u);
});
test('Supply results appear only in the open own private area and preserve explicit empty success', () => {
  const own={schemaVersion:1,protocolVersion:2,matchId:playerView().matchId,seatId:'seat-1',bindingRevision:1,revision:2,historyAvailable:true,supplierResults:[{round:3,commandId:'test-supply',successfulRecipientSeatIds:[]}],receivedSupply:[]};
  const open=model(playerView());
  const empty=toHtml(renderComicPlayerShell(open,{identities,acknowledgments:own}));
  assert.match(empty,/No players received a weapon from your Round 3 Supply/);
  const granted={...own,supplierResults:[{...own.supplierResults[0],successfulRecipientSeatIds:['seat-2','seat-3']}]};
  assert.match(toHtml(renderComicPlayerShell(open,{acknowledgments:granted})),/one weapon each to Player 2 and Player 3/);
  for(const [m,a] of [[model(playerView(),undefined,closed),own],[open,{...own,seatId:'seat-2'}],[open,null]]) {
    assert.doesNotMatch(toHtml(renderComicPlayerShell(m,{acknowledgments:a})),/Supply results|No players received|one weapon each/);
  }
  const pub=buildTableShellModel({...environment,view:publicView()});
  assert.doesNotMatch(toHtml(renderComicTableShell(pub,{acknowledgments:own})),/Supply results|No players received/);
});

test('practice mode and bot seats are labeled on live phone/table surfaces without private hooks', () => {
  const practice = { schemaVersion:1, protocolVersion:2, matchId:playerView().matchId, revision:1, policyVersion:'practice-1', botSeatIds:['seat-2'] };
  const phone = model(playerView(), undefined, closed);
  const table = buildTableShellModel({ ...environment, view: publicView() });
  for (const [render, screen] of [[renderComicPlayerShell, phone], [renderComicTableShell, table]]) {
    const markup = render(screen, { identities, practice }); auditMarkup(markup);
    const html = toHtml(markup);
    assert.match(html, /Practice match · 1 bot/);
    assert.match(html, /ms-seat__bot/);
    assert.match(html, /do not chat or bluff/);
    assert.doesNotMatch(html, /data-device|data-team|ms-role-card__art/);
    assert.doesNotMatch(toHtml(render(screen, { identities, practice: { ...practice, botSeatIds: [] } })), /Practice match|ms-seat__bot/);
    assert.doesNotMatch(toHtml(render({ ...screen, connection: 'stale' }, { identities, practice })), /Practice match|ms-seat__bot/);
  }
});

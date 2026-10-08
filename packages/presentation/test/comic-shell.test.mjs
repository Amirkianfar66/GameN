import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, renderComicPlayerShell, renderComicTableShell, splitRegions, toHtml } from '@mothership/presentation';
import { model, playerView, publicView, environment, closed } from './support/protocol2-views.mjs';
import { auditMarkup, find, byRegion, byClass, byId } from './support/markup-audit.mjs';

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
  for (const key of ['comic-board','phone-self','roster','location','phase','timer','vote','result']) assert.equal(first.regions.get(key), other.regions.get(key), key);
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


test('the bottom navigation is role-neutral and only explicit private views include the own card', () => {
  const first=playerView(), other=playerView(view=>{view.self.role='Supplier';view.legalTargets.SUPPLY=['seat-2','seat-3'];});
  const a=renderComicPlayerShell(model(first,undefined,closed),{identities});
  const b=renderComicPlayerShell(model(other,undefined,closed),{identities});
  assert.equal(splitRegions(a).regions.get('private'),splitRegions(b).regions.get('private'));
  assert.doesNotMatch(toHtml(a),/aria-modal|role="dialog"|data-device|data-team/);
  const opened=renderComicPlayerShell(model(first),{identities});auditMarkup(opened);
  assert.doesNotMatch(toHtml(opened),/aria-modal/);
  assert.match(toHtml(opened),/aria-label="Private card"/);
  assert.match(toHtml(opened),/role="navigation"/);
});


test('an ended phone never keeps its private sheet or action prompt in the result screen', () => {
  const ended=playerView(view=>{
    view.phase={id:'phase-aborted',kind:'ABORTED',startedAt:view.phase.startedAt,endsAt:null};
    view.activeSeatId=null;view.self.movementDestinations=[];
  });
  const markup=renderComicPlayerShell(model(ended,undefined,{deadline:{kind:'none'}}),{identities});
  auditMarkup(markup);
  const html=toHtml(markup);
  assert.match(html,/The host ended this match/);
  assert.doesNotMatch(html,/role="dialog"|data-device|data-team|private\/toggle|Open your private card to act/);
});

test('finished and aborted phones can switch between their result and an unobstructed Menu', () => {
  for (const kind of ['FINISHED', 'ABORTED']) {
    const ended = playerView(view => {
      view.phase = { id: 'phase-ended', kind, startedAt: view.phase.startedAt, endsAt: null };
      view.activeSeatId = null; view.self.movementDestinations = [];
      if (kind === 'FINISHED') {
        view.result = { winner: 'Blue', alienCoWinner: false };
        view.endReveal = { roles: ['Cracker', 'Insider', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'].map((role, index) => ({ seatId: `seat-${index + 1}`, role })), code: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] };
      }
    });
    const screen = model(ended, undefined, { deadline: { kind: 'none' } });
    for (const phoneView of ['board', 'more', 'board']) {
      const markup = renderComicPlayerShell(screen, { identities, phoneView });
      assert.equal(find(markup, byRegion('result')).attrs.hidden, phoneView === 'more', kind);
      assert.equal(Boolean(find(markup, byClass('phone-menu')).attrs.hidden), phoneView !== 'more', kind);
      assert.equal(find(markup, byId('ms-phone-more')).attrs.disabled, undefined);
      assert.equal(find(markup, byId('ms-phone-board')).attrs.disabled, undefined);
      assert.equal(find(markup, byId('ms-phone-actions')).attrs.disabled, true);
      assert.deepEqual(find(markup, byRegion('private')).children, []);
    }
  }
});

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

test('room labels are uniform public controls, and Move is absent from the action menu', () => {
  const normal = playerView(), restricted = playerView(view => { view.self.movementDestinations = []; });
  const first = renderComicPlayerShell(model(normal, undefined, closed), { phoneView: 'board' });
  const second = renderComicPlayerShell(model(restricted, undefined, closed), { phoneView: 'board' });
  const board = splitRegions(first).regions.get('comic-board');
  assert.equal(board, splitRegions(second).regions.get('comic-board'));
  for (const room of ['Room A', 'Room B', 'Command Room']) assert.ok(board.includes(`data-move-room="${room}"`));
  assert.doesNotMatch(board, /data-move-room="(?:Hospital|Jail)"/);
  const opened = renderComicPlayerShell(model(normal), { phoneView: 'actions' });
  assert.doesNotMatch(toHtml(opened), /id="ms-action-open-move"/);
  assert.notEqual(find(opened, byRegion('comic-board')).attrs.hidden, true);
  assert.match(toHtml(opened), /phone-private-close/);
  const choosing = model(normal, { step: 'choosing', kind: 'move' });
  assert.match(toHtml(renderComicPlayerShell(choosing, { phoneView: 'actions' })), /data-value="Room B"/);
});
test('Actions, Card and Menu remain panels over the same board', () => {
  for (const phoneView of ['board', 'actions', 'role', 'more']) {
    const view = renderComicPlayerShell(model(playerView(), undefined, phoneView === 'actions' || phoneView === 'role' ? {} : closed), { phoneView });
    assert.notEqual(find(view, byRegion('comic-board')).attrs.hidden, true);
    assert.doesNotMatch(toHtml(view), /aria-current="page"/);
  }
});


test('choosing an action targets only offered characters on the board, with no duplicate player list', () => {
  const view = playerView(v => { v.self.shotAvailable = true; v.legalTargets.REGISTER_SHOT = ['seat-3','seat-5']; });
  const markup = renderComicPlayerShell(model(view, {step:'choosing',kind:'shot'}), {phoneView:'actions', identities});
  auditMarkup(markup);
  const board = toHtml(find(markup, byRegion('comic-board')));
  const panel = toHtml(find(markup, byRegion('private')));
  for (const id of ['seat-3','seat-5']) assert.match(board, new RegExp(`data-value="${id}"`));
  assert.equal((board.match(/data-intent="action\/choose"/g) ?? []).length, 2);
  assert.doesNotMatch(panel, /data-value="seat-|data-device|data-team/);
  assert.match(panel, /Shot · Tap a character/);
  assert.match(panel, /action\/back/);
  assert.equal(markup.attrs['data-action-dock'], 'true');
});
test('ordered compound picks stay on the board; answers and abstention stay in the compact strip', () => {
  const view = playerView(v => { v.legalTargets.SUPPLY = ['seat-1','seat-2','seat-3']; v.legalTargets.SCAN = ['seat-2']; });
  const supply = renderComicPlayerShell(model(view,{step:'choosing',kind:'supply',picked:['seat-2']}), {phoneView:'actions'});
  auditMarkup(supply);
  const board = toHtml(find(supply,byRegion('comic-board')));
  assert.match(board,/data-board-target="picked"/);
  assert.match(board,/aria-label="Selected 1"/);
  assert.doesNotMatch(board,/data-value="seat-2"/);
  for (const id of ['seat-1','seat-3']) assert.match(board,new RegExp(`data-value="${id}"`));
  const scan = renderComicPlayerShell(model(view,{step:'choosing',kind:'scan',picked:['seat-2']}),{phoneView:'actions'});
  auditMarkup(scan);
  const panel = toHtml(find(scan,byRegion('private')));
  for (const faction of ['Blue','Red','Alien']) assert.match(panel,new RegExp(`data-value="${faction}"`));
  assert.doesNotMatch(panel,/data-value="seat-/);
  const ballot = playerView(v => { v.legalTargets.VOTE = ['seat-1','seat-2']; });
  const vote = renderComicPlayerShell(model(ballot,{step:'choosing',kind:'vote'}),{phoneView:'actions'});
  auditMarkup(vote);
  assert.match(toHtml(find(vote,byRegion('private'))),/data-value="none"/);
  assert.doesNotMatch(toHtml(find(vote,byRegion('private'))),/data-value="seat-/);
});
test('target hints clear on close, concealment, stale data, expired time, and other phone views', () => {
  const view = playerView(v => {v.legalTargets.PROTECT = ['seat-2'];});
  const action = {step:'choosing',kind:'protect'};
  for (const [overrides, phoneView] of [[closed,'board'],[{privacy:{revealed:true,concealed:true}},'actions'],[{connection:'stale'},'actions'],[{deadline:{kind:'expired'}},'actions'],[{},'role'],[{},'more']]) {
    const markup = renderComicPlayerShell(model(view,action,overrides),{phoneView});
    assert.doesNotMatch(toHtml(find(markup,byRegion('comic-board'))),/data-board-target|phone-character-target|data-value="seat-/);
  }
});
test('Pass is the central control, server-gated, and its receipt reveals no private card', () => {
  const view = playerView(v => {v.legalTargets.PASS_TURN = ['seat-1'];});
  const markup = renderComicPlayerShell(model(view,undefined,closed),{phoneView:'board'});
  auditMarkup(markup);
  const nav = find(markup,byRegion('phone-navigation'));
  assert.equal(nav.children[2].attrs.id,'ms-phone-pass');
  assert.equal(nav.children[2].attrs.disabled,undefined);
  for (const [v,action,overrides] of [[playerView(),undefined,closed],[view,{step:'checking',choice:{kind:'move',destination:'Room B'},recovered:false},closed],[view,undefined,{...closed,connection:'stale'}],[view,undefined,{...closed,deadline:{kind:'expired'}}]]) {
    assert.equal(find(renderComicPlayerShell(model(v,action,overrides)),byId('ms-phone-pass')).attrs.disabled,true);
  }
  const accepted=renderComicPlayerShell(model(view,{step:'accepted',choice:{kind:'pass'},armed:true},closed),{phoneView:'board'});
  auditMarkup(accepted);
  assert.match(toHtml(accepted),/Turn passed/);
  assert.doesNotMatch(toHtml(accepted),/data-device|data-team|Cracker|ms-role-card__art/);
});

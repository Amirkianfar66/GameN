import assert from 'node:assert/strict';
import test from 'node:test';
import { DECLARED_HACK_VERSION_PINS, FullPlayerViewSchema } from '@mothership/contracts';
import { buildHackFeedback, buildConnectedPlayerShellModel, createConnectedPlayerAnnouncer, renderComicPlayerShell, toHtml, offeredChoices } from '@mothership/presentation';
import { EPOCH, input, playerView } from './support/protocol2-views.mjs';

function hack(stage = 'HACK_DECLARE', { role = 'Cracker', side = 'Blue', initiator = false, noDeclaration = false } = {}) {
  return playerView(v => {
    v.versions = { ...DECLARED_HACK_VERSION_PINS, assetManifestVersion: '0.0.0-no-assets' };
    v.voteResult = null;
    v.activeSeatId = initiator ? 'seat-1' : 'seat-2';
    v.hackPartnerSeatId = 'seat-2';
    v.phase = { id: stage === 'HACK_DECLARE' ? 'hack-exchange' : `phase-${stage}`, kind: stage, startedAt: EPOCH, endsAt: EPOCH + (stage === 'HACK_DECLARE' ? 15000 : stage === 'HACK_RESULT' ? 5000 : 60000) };
    v.self.role = role;
    v.knowledge = { insiderCandidates: [], undercoverSeatId: role === 'Hacker' ? 'seat-3' : null, code: role === 'Alien' ? ['seat-1','seat-2','seat-3','seat-4'] : [], scanResults: [], protections: [] };
    v.legalTargets = stage === 'HACK_DECLARE' && !initiator ? { DECLARE_HACK_SIDE: ['seat-1'] } : {};
    v.hackFeedback = { hackId: 'hack-exchange', phaseId: v.phase.id, round: 1, status: stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : noDeclaration ? 'NO_DECLARATION' : 'DECLARED', declaredSide: stage === 'HACK_DECLARE' || noDeclaration ? null : side };
  });
}
const live = v => input(v, undefined, { deadline: { kind:'running', remainingMs:1000 } });

test('all three declaration choices are identical across roles; only the fixed target can declare',()=>{
  for (const role of ['Cracker','Undercover','Alien','Hacker']) {
    const v=hack('HACK_DECLARE',{role});
    assert.deepEqual(offeredChoices(v,'declare-hack-side'),['Blue','Red','Alien'].map(declaredSide=>({kind:'declare-hack-side',declaredSide})));
    const model=buildConnectedPlayerShellModel({...live(v),action:{step:'choosing',kind:'declare-hack-side',picked:[]}});
    assert.deepEqual(model.match.privateArea.content.actions.card.body.choices.map(c=>c.label),['Blue','Red','Alien']);
    assert.deepEqual(model.match.privateArea.content.actions.card.board.eligible,[]);
  }
  assert.equal(offeredChoices(hack('HACK_DECLARE',{initiator:true}),'declare-hack-side'),null);
  assert.equal(offeredChoices(hack('HACK_RESULT'),'declare-hack-side'),null);
  assert.equal(offeredChoices(playerView(),'declare-hack-side'),null);
  const valid=hack();
  for (const change of [{audience:{kind:'player',seatId:'seat-2'}},{hackFeedback:{...valid.hackFeedback,round:2}}, {hackFeedback:{...valid.hackFeedback,declaredSide:'Blue'}}])
    assert.equal(offeredChoices({...valid,...change},'declare-hack-side'),null);
});
test('a pending or accepted declaration card preserves the current claim in the compact private panel',()=>{
  const v=hack('HACK_RESULT'),choice={kind:'declare-hack-side',declaredSide:'Blue'};
  for(const action of [{step:'accepted',choice,armed:true},{step:'unknown',choice,recovered:false,phaseOver:true,armed:true}]) {
    const html=toHtml(renderComicPlayerShell(buildConnectedPlayerShellModel({...live(v),action}),{phoneView:'actions'}));
    assert.match(html,/phone-action-dock/);assert.match(html,/data-region="hack-feedback"/);assert.match(html,/claims BLUE/);
    assert.match(html,action.step==='accepted'?/Declaration of Blue accepted/:/Result unknown/);
    assert.doesNotMatch(toHtml(renderComicPlayerShell(buildConnectedPlayerShellModel({...live(v),action,privacy:{revealed:false,concealed:false}}),{phoneView:'actions'})),/claims BLUE|hack-feedback/);
  }
});
test('result and talk render the current declaration, including permitted bluffing and explicit no declaration',()=>{
  for (const stage of ['HACK_RESULT','HACK']) for(const side of ['Blue','Red','Alien']) {
    const v=hack(stage,{role:'Undercover',side});
    const f=buildHackFeedback(live(v),v);assert.equal(f.stage,stage);assert.match(f.message,new RegExp(`claims ${side.toUpperCase()}`));assert.equal(f.declaredSide,side);
    const html=toHtml(renderComicPlayerShell(buildConnectedPlayerShellModel(live(v)),{phoneView:'actions'}));
    assert.match(html,/data-region="hack-feedback"/);assert.match(html,/Declarations may be bluffs/);
  }
  const v=hack('HACK_RESULT',{noDeclaration:true});assert.equal(buildHackFeedback(live(v),v).message,'No side declared');
});
test('private feedback requires exact exchange/phase, participant, status, and current timing',()=>{
  const v=hack('HACK_RESULT');
  for(const f of [{phaseId:'obsolete'},{hackId:''},{hackId:v.phase.id},{round:2},{status:'AWAITING_DECLARATION',declaredSide:null},{status:'DECLARED',declaredSide:null},{status:'NO_DECLARATION',declaredSide:'Blue'}]) {
    const bad={...v,hackFeedback:{...v.hackFeedback,...f}};assert.equal(buildHackFeedback(live(bad),bad),null);
  }
  for(const change of [{hackPartnerSeatId:null},{hackPartnerSeatId:'seat-1'},{activeSeatId:'seat-3'},{audience:{kind:'player',seatId:'seat-2'}}]) {
    const bad={...v,...change};assert.equal(buildHackFeedback(live(bad),bad),null);
  }
  for(const change of [{connection:'stale'},{problem:'unreadable-update'},{deadline:{kind:'expired'}},{deadline:{kind:'unsynced'}},{privacy:{revealed:false,concealed:false}},{privacy:{revealed:true,concealed:true}}])
    assert.equal(buildHackFeedback({...live(v),...change},v),null);
});
test('claim announcements are private and once per exchange, with no stale or talk replay',()=>{
  const a=createConnectedPlayerAnnouncer(),v=hack('HACK_RESULT');
  const claim=lines=>lines.filter(l=>l.text.includes('claims BLUE'));
  assert.equal(claim(a.next({...live(v),privacy:{revealed:false,concealed:false}})).length,0);
  const said=claim(a.next(live(v)));assert.equal(said.length,1);assert.equal(said[0].private,true);
  assert.equal(claim(a.next(live(v))).length,0);
  a.next({...live(v),connection:'stale'});assert.equal(claim(a.next(live(v))).length,0);
  assert.equal(claim(createConnectedPlayerAnnouncer().next(live(hack('HACK')))).length,0);
});
test('private panel closure removes feedback and the legacy action list stays unchanged',()=>{
  const v=hack('HACK_RESULT'),closed=buildConnectedPlayerShellModel({...live(v),privacy:{revealed:false,concealed:false}});
  assert.equal(closed.match.privateArea.content,null);assert.doesNotMatch(toHtml(renderComicPlayerShell(closed)),/claims BLUE|hack-feedback/);
  const legacy=buildConnectedPlayerShellModel(live(playerView()));
  assert.equal(legacy.match.privateArea.content.hackFeedback,null);
  assert.ok(legacy.match.privateArea.content.actions.card.body.offers.every(o=>o.kind!=='declare-hack-side'));
  assert.equal(FullPlayerViewSchema.safeParse(v).success,true);
});

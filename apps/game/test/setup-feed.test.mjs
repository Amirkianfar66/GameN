import assert from 'node:assert/strict';
import test from 'node:test';
import { FullSetupDocumentSchema, FullSetupPlayerViewSchema } from '@mothership/contracts';
import { createSetupFeed, documentPath } from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createFakeConnectedTransport, playerView, MATCH } from './support/connected.mjs';
const target = kind => ({ kind, matchId: MATCH });
const session = (bindingRevision = 1) => ({ schemaVersion: 1, protocolVersion: 2, matchId: MATCH, seatId: 'seat-1', bindingRevision });
const setupDoc = (stage = 'awaiting-ready', revision = 2) => FullSetupDocumentSchema.parse({
  schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', matchId: MATCH, playerCount: 7, revision, stage,
  dealId: ['awaiting-ready','running'].includes(stage) ? 'deal-one' : null,
  seats: Array.from({ length: 7 }, (_, i) => ({ seatId: `seat-${i + 1}`, confirmed: ['awaiting-ready','running'].includes(stage), ready: stage === 'running' })),
});
const preview = (bindingRevision = 1) => FullSetupPlayerViewSchema.parse({
  schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', versions: playerView().versions, matchId: MATCH,
  playerCount: 7, dealId: 'deal-one', bindingRevision, audience: { kind: 'player', seatId: 'seat-1' }, self: { seatId: 'seat-1', role: 'Hacker' },
});
async function make(seatId = 'seat-1') {
  const host = createFakeHost(), fake = createFakeConnectedTransport(host); await fake.transport.signIn();
  const feed = createSetupFeed({ transport: fake.transport, ports: host.ports, matchId: MATCH, ...(seatId ? { seatId } : {}) });
  feed.start(); return { host, fake, feed };
}
async function ready(s) {
  await s.fake.deliver(target('setup'), setupDoc()); await s.fake.deliver(target('seat-session'), session());
  await s.fake.deliver(target('setup-player-view'), preview());
}
test('private pregame subscription and reveal require current public stage and own binding', async () => {
  const s = await make();
  assert.equal(s.fake.listeners(target('setup-player-view')), 0);
  await s.fake.deliver(target('setup'), setupDoc('choosing',1)); await s.fake.deliver(target('seat-session'), session());
  assert.equal(s.fake.listeners(target('setup-player-view')), 0);
  await s.fake.deliver(target('setup'), setupDoc());
  assert.equal(s.feed.own(), null); assert.equal(s.fake.listeners(target('setup-player-view')), 1);
  await s.fake.deliver(target('setup-player-view'), preview()); assert.equal(s.feed.own().self.role, 'Hacker');
  await s.fake.deliver(target('setup'), setupDoc('running',3));
  assert.equal(s.feed.own(), null); assert.equal(s.fake.listeners(target('setup-player-view')), 0);
  s.feed.dispose();
});
test('stale or refused public/binding/private snapshots erase held role immediately', async () => {
  for (const kind of ['setup','seat-session','setup-player-view']) {
    for (const stale of [true,false]) {
      const s = await make(); await ready(s); assert.notEqual(s.feed.own(),null);
      if (stale) await s.fake.deliver(target(kind), kind === 'setup' ? setupDoc() : kind === 'seat-session' ? session() : preview(), false);
      else await s.fake.fail(target(kind),'refused');
      assert.equal(s.feed.own(),null,kind); s.feed.dispose();
    }
  }
});
test('recovered binding must match independently fresh preview, same role deal, and own audience', async () => {
  const s = await make(); await ready(s);
  await s.fake.deliver(target('seat-session'),session(2)); assert.equal(s.feed.own(),null);
  await s.fake.deliver(target('setup-player-view'),preview(2)); assert.equal(s.feed.own().bindingRevision,2);
  s.feed.quarantine(); assert.equal(s.feed.own(),null);
  s.feed.start(); await s.fake.deliver(target('setup'),setupDoc()); await s.fake.deliver(target('seat-session'),session(2));
  assert.equal(s.feed.own(),null); await s.fake.deliver(target('setup-player-view'),preview(2)); assert.notEqual(s.feed.own(),null);
  s.fake.transport.currentUid=()=> 'another-uid'; assert.equal(s.feed.own(),null);assert.equal(s.feed.binding(),null);assert.equal(s.feed.public(),null);
  s.feed.dispose();
});
test('conflicting or unsupported setup documents quarantine the affected stream', async () => {
  for (const corrupt of [p=>({...p,dealId:'another-deal'}),p=>({...p,protocolVersion:1}),p=>({...p,self:{seatId:'seat-2',role:'Alien'}}),p=>({...p,secret:'never'})]) {
    const s = await make(); await ready(s); await s.fake.deliver(target('setup-player-view'),corrupt(preview()));
    assert.equal(s.feed.own(),null); await s.fake.deliver(target('setup-player-view'),preview()); assert.equal(s.feed.own(),null); s.feed.dispose();
  }
  const s = await make(); await ready(s); await s.fake.deliver(target('setup'),setupDoc('choosing',1));
  assert.equal(s.feed.own(),null); await s.fake.deliver(target('setup'),setupDoc()); assert.equal(s.feed.own(),null); s.feed.dispose();
});
test('host and display observe only public setup, and transports supply the caller UID', async () => {
  const s = await make(null); await s.fake.deliver(target('setup'),setupDoc());
  assert.equal(s.feed.public().stage,'awaiting-ready');assert.equal(s.feed.own(),null);
  assert.equal(s.fake.listeners(target('seat-session')),0);assert.equal(s.fake.listeners(target('setup-player-view')),0);
  assert.deepEqual(documentPath(target('setup'),'display'),['matches',MATCH,'setup','public']);
  assert.deepEqual(documentPath(target('setup-player-view'),'own-uid'),['matches',MATCH,'setupPlayerViews','own-uid']);
  assert.throws(()=>documentPath(target('setup-player-view'),'uid/other'));
  s.feed.dispose();
});

test('own Ready removes the private listener while neutral progress remains available',async()=>{
  const s=await make();await ready(s);
  const next=setupDoc('awaiting-ready',3);next.seats[0].ready=true;
  await s.fake.deliver(target('setup'),next);
  assert.equal(s.feed.own(),null);assert.equal(s.fake.listeners(target('setup-player-view')),0);
  assert.equal(s.feed.public().seats[0].ready,true);s.feed.dispose();
});

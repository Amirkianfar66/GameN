import assert from 'node:assert/strict';
import test from 'node:test';
import { createSetupClock } from '../hosted/setup-clock.js';
import { createSetupProgress } from '../hosted/setup-controls.js';
import { createFakeHost, flush } from './support/fakes.mjs';

test('setup countdown uses server time, resynchronizes after suspension, and never transitions game state',async()=>{
  const host=createFakeHost(),calls=[],ticks=[];
  const clock=createSetupClock({ports:host.ports,matchId:'clock-match',onTick:()=>ticks.push(clock.read()),api:{serverTime:async matchId=>{
    calls.push(matchId);return {kind:'time',sample:{requestedAt:host.localNow(),receivedAt:host.localNow(),serverTimeMs:host.serverNow()}};
  }}});
  clock.setActive(true);await flush();assert.equal(clock.read().serverNowMs,host.serverNow());
  await host.advance(30_000);assert.equal(calls.length,3);assert.ok(ticks.length>=30);
  clock.suspend();assert.equal(clock.read().status,'unsynced');assert.equal(host.pendingTimers(),0);
  host.sleepDevice(45_000);clock.setActive(true);await flush();assert.equal(clock.read().serverNowMs,host.serverNow());
  clock.dispose();await host.advance(60_000);assert.equal(calls.length,4);assert.equal(host.pendingTimers(),0);
});
test('late time answers after suspension cannot enable a stale countdown',async()=>{
  const host=createFakeHost();let resolve;
  const clock=createSetupClock({ports:host.ports,matchId:'clock-match',api:{serverTime:()=>new Promise(done=>{resolve=done;})}});
  clock.setActive(true);clock.suspend();resolve({kind:'time',sample:{requestedAt:host.localNow(),receivedAt:host.localNow(),serverTimeMs:host.serverNow()}});await flush();
  assert.equal(clock.read().status,'unsynced');assert.equal(host.pendingTimers(),0);clock.dispose();
});
test('zero on the countdown shows server waiting, and only a fresh document changes the stage',()=>{
  const nodes=new Map();const el=(tag,text,attrs={})=>{const node={textContent:text??'',hidden:false,children:[],setAttribute(){},append(...value){this.children.push(...value);},replaceChildren(...value){this.children=value;}};if(attrs.id)nodes.set(attrs.id,node);return node;};
  const progress=createSetupProgress({el});
  const setup={stage:'choosing',choosingEndsAt:50_000,playerCount:7,seats:[]};
  progress.update(setup,{status:'synced',serverNowMs:20_000});assert.match(nodes.get('setup-countdown').textContent,/30 s/);
  progress.update(setup,{status:'synced',serverNowMs:50_001});assert.match(nodes.get('setup-countdown').textContent,/Waiting for the server/);
  assert.equal(nodes.get('setup-progress-heading').textContent,'Choose characters');
  progress.update({...setup,stage:'awaiting-ready',readingEndsAt:81_000},{status:'synced',serverNowMs:51_000});assert.match(nodes.get('setup-countdown').textContent,/Role reading · 30 s/);
  progress.update({...setup,stage:'awaiting-ready',readingEndsAt:81_000},{status:'synced',serverNowMs:82_000});assert.match(nodes.get('setup-countdown').textContent,/everyone to be Ready/);
});


test('a failed time request clears the estimate and a later sample restores it', async () => {
  const host = createFakeHost(); let failing = false;
  const clock = createSetupClock({ ports: host.ports, matchId: 'clock-match', api: { serverTime: async () => {
    if (failing) throw new Error('Connection interrupted');
    return { kind: 'time', sample: { requestedAt: host.localNow(), receivedAt: host.localNow(), serverTimeMs: host.serverNow() } };
  } } });
  clock.setActive(true); await flush(); assert.equal(clock.read().status, 'synced');
  failing = true; await host.advance(15_000); assert.equal(clock.read().status, 'unsynced');
  failing = false; await host.advance(15_000); assert.equal(clock.read().status, 'synced');
  clock.dispose(); assert.equal(host.pendingTimers(), 0);
});

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {PlanetAtomicCreateConflict} from '../dist/planet-persistence-errors.js';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Adapter causal fixtures, never seeded game state or real-time acceptance.
// Synthetic wake namespaces cannot enter the game's deadline outbox query.
let app,db,store;
before(()=>{
  assertLocalEmulators();
  app=initializeApp({projectId:'demo-mothership'},'prefix-create-'+randomUUID());
  db=getFirestore(app);store=createFirestorePlanetStore(db);
});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
const key=scope=>scope+'/'+randomUUID();
const requireCreate=tx=>assert.equal(typeof tx.create,'function');
const read=(...keys)=>store.readOnly(tx=>Promise.all(keys.map(k=>tx.get(k))));

test('Firestore concurrent create claims preserve atomic pre-claim reads, one owner and one wake',async context=>{
  const leaseKey=key('prefixCreateProbeLease'),guardKey=key('prefixCreateProbeGuard');
  await store.transaction(tx=>tx.set(guardKey,{allowed:true}));
  const candidates=[0,1].map(()=>({owner:randomUUID(),wakeKey:key('prefixCreateProbeWake')}));
  const started=performance.now();
  const results=await Promise.allSettled(candidates.map(candidate=>store.transaction(async tx=>{
    requireCreate(tx);assert.deepEqual(await tx.get(guardKey),{allowed:true});
    tx.create(leaseKey,{owner:candidate.owner,wakeKey:candidate.wakeKey});
    tx.create(candidate.wakeKey,{owner:candidate.owner,leaseKey});
  })));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const loserIndex=results.findIndex(r=>r.status==='rejected'),winner=candidates[1-loserIndex],loser=candidates[loserIndex];
  assert.ok(results[loserIndex].reason instanceof PlanetAtomicCreateConflict);
  assert.equal(results[loserIndex].reason.cause.code,6);
  assert.deepEqual(await read(leaseKey,winner.wakeKey,loser.wakeKey,guardKey),[
    {owner:winner.owner,wakeKey:winner.wakeKey},{owner:winner.owner,leaseKey},null,{allowed:true},
  ]);
  const orphan=await db.collection('planetDocuments').where('key','==',loser.wakeKey).get();
  assert.equal(orphan.size,0);
  context.diagnostic(JSON.stringify({concurrentGuardedCreateMs:performance.now()-started,winners:1,orphanWakes:0}));
});

test('Firestore stale missing hint cannot replace an existing lease or leave a competing wake',async()=>{
  const leaseKey=key('prefixCreateProbeLease'),original={owner:randomUUID(),expiresAt:8000},wakeKey=key('prefixCreateProbeWake');
  await store.transaction(tx=>tx.set(leaseKey,original));
  await assert.rejects(store.transaction(async tx=>{
    requireCreate(tx);tx.create(leaseKey,{owner:randomUUID(),expiresAt:16000});tx.create(wakeKey,{pending:true});
  }),error=>error instanceof PlanetAtomicCreateConflict&&error.cause.code===6);
  assert.deepEqual(await read(leaseKey,wakeKey),[original,null]);
});

test('Firestore create encodes multiple chunks and clones buffered reads and caller values',async()=>{
  const target=key('prefixCreateProbeLarge'),value={strokes:[{points:[[0,0],[1,1]]}],large:'x'.repeat(120000)};
  const expected=structuredClone(value);
  await store.transaction(async tx=>{
    requireCreate(tx);tx.create(target,value);value.large='changed outside the buffer';
    const buffered=await tx.get(target);assert.deepEqual(buffered,expected);buffered.large='changed returned clone';
    assert.deepEqual(await tx.get(target),expected);
  });
  assert.deepEqual(await read(target),[expected]);
  const metadata=await db.collection('planetDocuments').where('key','==',target).get();
  assert.equal(metadata.size,1);assert.ok(metadata.docs[0].get('chunks')>1);
});

test('Firestore mixed create/set conflict remains a raw SDK failure and applies no partial update',async()=>{
  const existing=key('prefixCreateProbeExisting'),other=key('prefixCreateProbeOther');
  await store.transaction(tx=>{tx.set(existing,{original:true});tx.set(other,{counter:0});});
  await assert.rejects(store.transaction(async tx=>{
    requireCreate(tx);tx.create(existing,{replacement:true});tx.set(other,{counter:1});
  }),error=>!(error instanceof PlanetAtomicCreateConflict)&&error.code===6);
  assert.deepEqual(await read(existing,other),[{original:true},{counter:0}]);
});

import assert from 'node:assert/strict';
import {ok} from './planet-service-helper.mjs';

export async function beginPlanetReading(h){
  ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
  await h.deadline();
  const session=await h.current();assert.equal(session.status,'reading');
  return session;
}

export async function readyPlanetHumans(h,except=[]){
  for(const uid of h.players.filter(uid=>!except.includes(uid)))ok(await h.operation(uid,'ready',{matchId:h.matchId}));
}

export async function enterPlanetBoarding(h){
  const reading=await beginPlanetReading(h);
  await readyPlanetHumans(h);
  assert.equal((await h.current()).status,'reading','Early Ready cannot bypass the minimum');
  await h.deadline();
  const session=await h.current();assert.equal(session.status,'boarding');
  assert.equal(session.state,null);return {reading,session};
}

export async function currentPlanetJournal(h){
  const keys=await h.store.listKeys('journal',100);
  return (await Promise.all(keys.filter(key=>key.startsWith('journal/'+h.matchId+'/')).map(key=>h.store.transaction(tx=>tx.get(key)))))
    .sort((a,b)=>a.sequence-b.sequence);
}

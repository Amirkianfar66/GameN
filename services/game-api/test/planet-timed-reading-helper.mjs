import assert from 'node:assert/strict';
import {ok} from './planet-service-helper.mjs';
import {beginPlanetReading} from './planet-boarding-helper.mjs';

export async function enterTimedPlanetBoarding(h){
  const reading=await beginPlanetReading(h);
  assert.equal(reading.setupFlowVersion,3);
  h.setTime(reading.setup.endsAt);
  for(const uid of h.players)ok(await h.operation(uid,'ready',{matchId:h.matchId}));
  if(h.players.length===0)await h.service.runDeadline(await h.currentJob());
  const session=await h.current();assert.equal(session.status,'boarding');
  return {reading,session};
}

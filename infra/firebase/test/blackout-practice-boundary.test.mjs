import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLACKOUT_VERSION_PINS, CAPTAIN_OUTCOMES_VERSION_PINS } from '@mothership/contracts';
import { practiceBlackoutWaitMs } from '../dist/v1.js';
const versions={...BLACKOUT_VERSION_PINS,assetManifestVersion:'test-only-blackout-assets'};
const phase={id:'shared-window',kind:'BLACKOUT',startedAt:10000,endsAt:25000};
test('bot wake uses only the exact new public5-second boundary and never delays gameplay',()=>{
  assert.equal(practiceBlackoutWaitMs(versions,phase,10000),5000);
  assert.equal(practiceBlackoutWaitMs(versions,phase,14999),1);
  for(const now of [15000,20000,25000,30000])assert.equal(practiceBlackoutWaitMs(versions,phase,now),0);
  assert.equal(practiceBlackoutWaitMs({...versions,...CAPTAIN_OUTCOMES_VERSION_PINS},phase,10000),0);
  assert.equal(practiceBlackoutWaitMs({...versions,rulesetHash:'0'.repeat(64)},phase,10000),0);
  assert.equal(practiceBlackoutWaitMs(versions,{...phase,endsAt:24000},10000),0);
  assert.equal(practiceBlackoutWaitMs(versions,{...phase,kind:'HACK_DECLARE'},10000),0);
  assert.throws(()=>practiceBlackoutWaitMs(versions,phase,NaN));
});

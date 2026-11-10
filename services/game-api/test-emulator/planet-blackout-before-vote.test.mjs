import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {PLANET_BLACKOUT_ENGINE_PROFILE} from '@mothership/contracts';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness} from '../test/planet-service-helper.mjs';
import {assertBlackoutThroughFinalization,assertFullHospitalBeforeRescue} from '../test/planet-blackout-service-control.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';
let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'blackout-before-vote-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
for(const count of [7,8,9])test(`${count}: genuine Firestore transactions commit the batch, updated physical snapshots and fresh deadlines once`,async()=>{
 const h=await planetServiceHarness({count,humans:count,store:createFirestorePlanetStore(db),engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
 await assertBlackoutThroughFinalization(h);
});
for(const count of [7,8,9])for(const panel of [false,true])test(`${count}: Firestore retains permanent overflow before later ${panel?'panel':'Doctor'} Rescue`,async()=>{
 const h=await planetServiceHarness({count,humans:count,store:createFirestorePlanetStore(db),engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
 await assertFullHospitalBeforeRescue(h,{panel});
});

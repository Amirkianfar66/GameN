import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {runHumanFoodJourney} from '../test/planet-food-native-service-control.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'native-food-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
for(const count of [7,8,9])for(const control of ['WINCH','PANEL'])test(`${count}: genuine Firestore Food ${control}, full cadence, fixed return, restart receipt and meal`,async()=>{
  await runHumanFoodJourney({count,control,store:createFirestorePlanetStore(db)});
});

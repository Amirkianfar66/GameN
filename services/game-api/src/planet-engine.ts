import {
  createPlanetGame,applyPlanetCommand,advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,
  projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState,
  applyPlanetFoodCommand,setPlanetFoodPresence,projectPlanetFoodPublic,projectPlanetFoodPlayer,hasOnlyDuePlanetFoodWarnings,
} from '@mothership/engine';
import {createPlanetService} from './planet-game.js';
import {PLANET_PHONE_ENGINE_PROFILE,PLANET_BLACKOUT_ENGINE_PROFILE,PLANET_FOOD_TASK_ENGINE_PROFILE} from '@mothership/contracts';
import type {PlanetPersistence} from './planet-game.js';
import {setTimeout as wait} from 'node:timers/promises';

/** The deployable adapter always uses the real, tuple-dispatched engine. */
export function createProductionPlanetService(dependencies:{
  store:PlanetPersistence;clock?:()=>number;assetManifestVersion?:string;enabled?:boolean;setupFlowVersion?:1|2|3;
  waitForBotWake?:(delayMs:number)=>Promise<void>;
  engineProfile?:typeof PLANET_PHONE_ENGINE_PROFILE|typeof PLANET_BLACKOUT_ENGINE_PROFILE|typeof PLANET_FOOD_TASK_ENGINE_PROFILE;
}){
  // Real bot timing uses a bounded local wait; injected-clock callers retain no-wait behavior.
  const waitForBotWake=dependencies.waitForBotWake??(dependencies.clock===undefined?async(ms:number)=>{await wait(ms);}:undefined);
  return createPlanetService({...dependencies,...(waitForBotWake?{waitForBotWake}:{}),engine:{createPlanetGame,applyPlanetCommand,
    advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState,
    applyPlanetFoodCommand,setPlanetFoodPresence,projectPlanetFoodPublic,projectPlanetFoodPlayer,hasOnlyDuePlanetFoodWarnings}});
}

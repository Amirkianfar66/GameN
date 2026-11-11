import {
  createPlanetGame,applyPlanetCommand,advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,
  projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState,
} from '@mothership/engine';
import {createPlanetService} from './planet-game.js';
import {PLANET_PHONE_ENGINE_PROFILE,PLANET_BLACKOUT_ENGINE_PROFILE} from '@mothership/contracts';
import type {PlanetPersistence} from './planet-game.js';

/** The deployable adapter always uses the real, tuple-dispatched engine. */
export function createProductionPlanetService(dependencies:{
  store:PlanetPersistence;clock?:()=>number;assetManifestVersion?:string;enabled?:boolean;setupFlowVersion?:1|2|3;
  engineProfile?:typeof PLANET_PHONE_ENGINE_PROFILE|typeof PLANET_BLACKOUT_ENGINE_PROFILE;
}){
  return createPlanetService({...dependencies,engine:{createPlanetGame,applyPlanetCommand,
    advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState}});
}

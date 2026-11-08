import {
  createPlanetGame,applyPlanetCommand,advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,
  projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState,
} from '@mothership/engine';
import {createPlanetService} from './planet-game.js';
import type {PlanetPersistence} from './planet-game.js';

/** The deployable adapter always uses the real, tuple-dispatched engine. */
export function createProductionPlanetService(dependencies:{
  store:PlanetPersistence;clock?:()=>number;assetManifestVersion?:string;enabled?:boolean;setupFlowVersion?:1|2;
}){
  return createPlanetService({...dependencies,engine:{createPlanetGame,applyPlanetCommand,
    advancePlanetDeadline,planetDeadlineAt,abortPlanetGame,projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState}});
}

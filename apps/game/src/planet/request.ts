import {PlanetServiceRequestSchema} from '@mothership/contracts';
import type {PlanetServiceRequest} from '@mothership/contracts';
export type {PlanetServiceRequest};
/** Shared validation remains in the client core; browser adapters only carry validated bytes. */
export function readPlanetRequest(value:unknown):PlanetServiceRequest{return PlanetServiceRequestSchema.parse(value);}

import {PlanetFoodTransportRequestSchema,PlanetServiceRequestSchema} from '@mothership/contracts';
import type {PlanetFoodTransportRequest,PlanetServiceRequest} from '@mothership/contracts';
export type {PlanetServiceRequest};
/** Shared validation remains in the client core; browser adapters only carry validated bytes. */
export function readPlanetRequest(value:unknown):PlanetServiceRequest{return PlanetServiceRequestSchema.parse(value);}
export function readPlanetFoodTransportRequest(value:unknown):PlanetFoodTransportRequest{return PlanetFoodTransportRequestSchema.parse(value);}

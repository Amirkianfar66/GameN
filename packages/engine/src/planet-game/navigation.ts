import type { PlanetDirection, PlanetRoutePosition } from '@mothership/contracts';
import type { PlanetGameState, PlanetWorld } from './model.js';
import { planetFaction } from './model.js';
export function planetNavigationWeights(state:PlanetGameState,world:PlanetWorld):{Blue:number;Red:number} {
  const weights={Blue:0,Red:0};
  for(const seat of world.seats){if(seat.health!=='Healthy'||seat.jailed||!['Room A','Room B'].includes(seat.location??'')||world.suppressedSeatIds.includes(seat.seatId))continue;
    const side=planetFaction(state.roles[seat.seatId]!);if(side!=='Alien')weights[side]+=seat.seatId===world.captainSeatId?2:1;}
  return weights;
}
export function nextPlanetPosition(position:PlanetRoutePosition,direction:PlanetDirection):PlanetRoutePosition {
  if(position==='Start')return 'Junction';
  if(position==='Blue Planet'||position==='Red Planet')throw Error('Planet route already complete');
  const blue=direction==='Blue';
  if(position==='Junction')return blue?'B1':'R1';
  if(position==='B1')return blue?'B2':'R1';if(position==='R1')return blue?'B1':'R2';
  if(position==='B2')return blue?'Blue Planet':'R2';return blue?'B2':'Red Planet';
}

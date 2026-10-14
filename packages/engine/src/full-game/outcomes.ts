import { FullOutcomeFactSchema } from '@mothership/contracts';
import type { FullOutcomeFact, SeatId } from '@mothership/contracts';
import { captainCommandsEnabled } from './model.js';
import type { FullGameState } from './model.js';

// Server-only frozen recipients. Never transmit or recompute this list at delivery.
export interface FullGameOutcome { fact:FullOutcomeFact; recipientSeatIds:SeatId[] | null }
export function appendOutcome(state:FullGameState,fact:FullOutcomeFact,recipientSeatIds:SeatId[]|null=null):void {
  if(!captainCommandsEnabled(state.versions)) return;
  if(!Array.isArray(state.outcomes)) throw new Error('Missing outcome history');
  state.outcomes.push({fact:FullOutcomeFactSchema.parse(fact),recipientSeatIds:recipientSeatIds===null?null:[...recipientSeatIds]});
}
export function clinicalOutcome(state:FullGameState,seatId:SeatId,kind:'INJURY'|'HEALED'|'DEATH'):void {
  appendOutcome(state,{type:'MEDICAL_OUTCOME',phaseId:state.phase.id,round:state.round,seatId,kind,
    health:kind==='INJURY'?'Injured':kind==='HEALED'?'Healthy':'Eliminated'});
}
export function assertOutcomes(state:FullGameState):void {
  if(!captainCommandsEnabled(state.versions)) { if(Object.hasOwn(state,'outcomes')) throw new Error('Historical tuple has new outcomes');return; }
  if(!Array.isArray(state.outcomes) || state.outcomes.length>512) throw new Error('Invalid outcome history');
  for(const event of state.outcomes) {
    if(Object.keys(event).sort().join(',')!=='fact,recipientSeatIds' || !FullOutcomeFactSchema.safeParse(event.fact).success
      || event.fact.round>state.round || event.recipientSeatIds!==null) throw new Error('Invalid outcome record');
  }
}

import { FullOutcomeFactSchema, SeatIdSchema } from '@mothership/contracts';
import type { FullOutcomeFact, SeatId } from '@mothership/contracts';
import { captainCommandsEnabled, blackoutEnabled, hospitalFourEnabled } from './model.js';
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
      || event.fact.round>state.round || (hospitalFourEnabled(state.versions)
        && (event.fact.type==='ATTACK_BLOCKED' || event.fact.type==='BOARD_PLACEMENT_CHANGED')
        && event.fact.location==='Hospital' && Number(event.fact.slotId?.slice(1))>4)
      || (event.fact.type==='HOSPITAL_OVERFLOW_REMOVED' && !hospitalFourEnabled(state.versions)) || (event.fact.type==='ATTACK_BLOCKED'
        ? !blackoutEnabled(state.versions) || event.recipientSeatIds===null || event.recipientSeatIds.length===0
          || new Set(event.recipientSeatIds).size!==event.recipientSeatIds.length || !event.recipientSeatIds.includes(event.fact.seatId)
          || event.recipientSeatIds.some(id=>!SeatIdSchema.safeParse(id).success || !state.seats.some(s=>s.seatId===id))
        : event.recipientSeatIds!==null)) throw new Error('Invalid outcome record');
  }
}

export function roomBlockOutcome(state:FullGameState,subject:import('./roster.js').GameSeat):void {
  if(!blackoutEnabled(state.versions))return;
  if(subject.location===null || subject.location==='Final Zone' || typeof subject.slotId!=='string')throw new Error('Missing physical block anchor');
  const recipients=state.seats.filter(s=>s.location===subject.location).map(s=>s.seatId);
  appendOutcome(state,{type:'ATTACK_BLOCKED',phaseId:state.phase.id,round:state.round,seatId:subject.seatId,location:subject.location,slotId:subject.slotId},recipients);
}

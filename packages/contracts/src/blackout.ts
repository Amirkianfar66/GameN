import { z } from 'zod';
import { IdentifierSchema,TimestampSchema,SeatIdSchema } from './protocol.js';
import { BoardSlotIdSchema } from './board-medical.js';
import type { FullGameplayPins } from './full-game-versions.js';
import { supportsBlackout, supportsHospitalFour, HOSPITAL_FOUR_LAYOUT_REVISION } from './full-game-versions.js';
export const BlackoutRoomSchema=z.enum(['Room A','Room B','Command Room','Hospital','Jail']);
export type BlackoutRoom=z.infer<typeof BlackoutRoomSchema>;
export const FullBlackoutPublicSchema=z.strictObject({snapshotId:IdentifierSchema,layoutRevision:z.union([z.literal('board-v2-0.1.1'),z.literal(HOSPITAL_FOUR_LAYOUT_REVISION)]),darkStartsAt:TimestampSchema});
export const FullBlackoutTargetingSchema=z.strictObject({snapshotId:IdentifierSchema,room:BlackoutRoomSchema,
  slotIds:z.array(BoardSlotIdSchema).min(1).max(9),darkStartsAt:TimestampSchema,endsAt:TimestampSchema,selectedSlotId:BoardSlotIdSchema.nullable()
}).refine(t=>t.endsAt-t.darkStartsAt===10_000 && new Set(t.slotIds).size===t.slotIds.length && (t.selectedSlotId===null || t.slotIds.includes(t.selectedSlotId)), 'Fixed private targeting window and final logical selection');
export type FullBlackoutTargeting=z.infer<typeof FullBlackoutTargetingSchema>;
export function blackoutSlotIds(room:BlackoutRoom,playerCount:7|8|9,versions?:FullGameplayPins):string[] {
  const prefix={'Room A':'A','Room B':'B','Command Room':'C',Hospital:'H',Jail:'J'}[room];
  return Array.from({length:room==='Hospital'?(versions && supportsHospitalFour(versions)?4:playerCount):room==='Command Room'?1:5},(_,i)=>`${prefix}${i+1}`);
}
type Public={versions:FullGameplayPins;phase:{id:string;kind:string;startedAt:number;endsAt:number|null};activeSeatId:string|null;
  blackout?:z.infer<typeof FullBlackoutPublicSchema>|null|undefined};
export function validBlackoutPublic(v:Public):boolean {
  if(!supportsBlackout(v.versions))return v.phase.kind!=='BLACKOUT' && !Object.hasOwn(v,'blackout');
  if(!Object.hasOwn(v,'blackout') || v.blackout===undefined)return false;
  if(v.phase.kind!=='BLACKOUT')return v.blackout===null;
  return v.blackout!==null && v.blackout.layoutRevision===(supportsHospitalFour(v.versions)?HOSPITAL_FOUR_LAYOUT_REVISION:'board-v2-0.1.1') && v.activeSeatId===null && v.blackout.snapshotId===v.phase.id
    && v.blackout.darkStartsAt===v.phase.startedAt+5_000 && v.phase.endsAt===v.phase.startedAt+15_000;
}
export const RoomBlockFactSchema=z.strictObject({type:z.literal('ATTACK_BLOCKED'),phaseId:IdentifierSchema,
  round:z.number().int().min(1).max(5),seatId:SeatIdSchema,location:BlackoutRoomSchema,slotId:BoardSlotIdSchema
}).refine(f=>blackoutSlotIds(f.location,9).includes(f.slotId),'Authorized physical impact anchor');

import {z} from 'zod';
import {IdentifierSchema,SeatIdSchema,TimestampSchema} from './protocol.js';
import {FullFailureSchema,FullReceiptSchema} from './full-game.js';
const protocol={protocolVersion:z.literal(2)};
const match={...protocol,matchId:IdentifierSchema};
const operation={...match,requestId:IdentifierSchema};
const uid=z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const room=z.enum(['Room A','Room B']);
const playerCount=z.union([z.literal(7),z.literal(8),z.literal(9)]);
const roomCode=z.string().regex(/^[A-F0-9]{12}$/);
const recoveryToken=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
// Exact Firestore document bodies. Match/admission identity comes from the authorized path;
// do not add path IDs, admission protocol fields, or engine secrets to these existing shapes.
export const FullHostSessionSchema=z.strictObject({...protocol,hostUid:uid,playerCount,
  status:z.enum(['lobby','running','complete','aborted']),roomCode,createdAt:TimestampSchema});
const admissionDocument={uid,initialRoom:room,requestedAt:TimestampSchema};
export const FullAdmissionDocumentSchema=z.discriminatedUnion('status',[
  z.strictObject({...admissionDocument,status:z.literal('pending')}),
  z.strictObject({...admissionDocument,status:z.literal('approved'),seatId:SeatIdSchema}),
]);
export type FullHostSession=z.infer<typeof FullHostSessionSchema>;
export type FullAdmissionDocument=z.infer<typeof FullAdmissionDocumentSchema>;
export const FullCreateMatchRequestSchema=z.strictObject({...protocol,requestId:IdentifierSchema,playerCount});
export const FullAdmissionRequestSchema=z.strictObject({...protocol,requestId:IdentifierSchema,roomCode,initialRoom:room});
export const FullApproveAdmissionRequestSchema=z.strictObject({...operation,admissionId:IdentifierSchema,seatId:SeatIdSchema});
export const FullAdmitDisplayRequestSchema=z.strictObject({...operation,displayUid:uid});
export const FullStartMatchRequestSchema=z.strictObject(operation);
export const FullAbortMatchRequestSchema=z.strictObject(operation);
export const FullIssueSeatRecoveryRequestSchema=z.strictObject({...operation,seatId:SeatIdSchema});
export const FullRedeemSeatRecoveryRequestSchema=z.strictObject({...operation,recoveryToken});
export const FullLookupRequestSchema=z.strictObject({...match,commandId:IdentifierSchema});
export const FullAdvanceRequestSchema=z.strictObject({...match,phaseId:IdentifierSchema});
export const FullServerTimeRequestSchema=z.strictObject(match);
export const FullLobbyViewSchema=z.strictObject({...match,playerCount,status:z.enum(['lobby','running','complete','aborted']),
  seats:z.array(z.strictObject({seatId:SeatIdSchema,initialRoom:room})).max(9),
}).refine(v=>v.seats.length<=v.playerCount && new Set(v.seats.map(s=>s.seatId)).size===v.seats.length && v.seats.every(s=>Number(s.seatId.slice(5))<=v.playerCount)
  && (!['running','complete'].includes(v.status)||v.seats.length===v.playerCount));
export type FullLobbyView=z.infer<typeof FullLobbyViewSchema>;
const result=z.union([
  z.strictObject({matchId:IdentifierSchema,roomCode,playerCount,status:z.literal('lobby')}),
  z.strictObject({matchId:IdentifierSchema,admissionId:IdentifierSchema,status:z.literal('pending')}),
  z.strictObject({admissionId:IdentifierSchema,seatId:SeatIdSchema,status:z.literal('approved')}),
  z.strictObject({admitted:z.literal(true)}),
  z.strictObject({started:z.literal(true),matchId:IdentifierSchema}),
  z.strictObject({aborted:z.literal(true)}),
  z.strictObject({issued:z.literal(true),seatId:SeatIdSchema,recoveryToken:recoveryToken.nullable(),expiresAt:TimestampSchema}),
  z.strictObject({recovered:z.literal(true),seatId:SeatIdSchema}),
]);
export const FullOperationResponseSchema=z.union([z.strictObject({ok:z.literal(true),serverTimeMs:TimestampSchema,result}),FullFailureSchema]);
export const FullCommandResponseSchema=z.union([z.strictObject({ok:z.literal(true),serverTimeMs:TimestampSchema,receipt:FullReceiptSchema}),FullFailureSchema]);
export const FullLookupResponseSchema=z.union([
  z.strictObject({status:z.literal('found'),serverTimeMs:TimestampSchema,receipt:FullReceiptSchema}),
  z.strictObject({status:z.literal('unknown'),serverTimeMs:TimestampSchema}),FullFailureSchema,
]);
export const FullAdvanceResponseSchema=z.union([z.strictObject({...match,phaseId:IdentifierSchema,serverTimeMs:TimestampSchema,result:z.enum(['advanced','unchanged'])}),FullFailureSchema]);
export const FullServerTimeResponseSchema=z.union([z.strictObject({...protocol,serverTimeMs:TimestampSchema}),FullFailureSchema]);
export type FullCreateMatchRequest=z.infer<typeof FullCreateMatchRequestSchema>;
export type FullAdmissionRequest=z.infer<typeof FullAdmissionRequestSchema>;
export type FullApproveAdmissionRequest=z.infer<typeof FullApproveAdmissionRequestSchema>;
export type FullAdmitDisplayRequest=z.infer<typeof FullAdmitDisplayRequestSchema>;
export type FullStartMatchRequest=z.infer<typeof FullStartMatchRequestSchema>;
export type FullAbortMatchRequest=z.infer<typeof FullAbortMatchRequestSchema>;
export type FullIssueSeatRecoveryRequest=z.infer<typeof FullIssueSeatRecoveryRequestSchema>;
export type FullRedeemSeatRecoveryRequest=z.infer<typeof FullRedeemSeatRecoveryRequestSchema>;
export type FullLookupRequest=z.infer<typeof FullLookupRequestSchema>;
export type FullAdvanceRequest=z.infer<typeof FullAdvanceRequestSchema>;
export type FullServerTimeRequest=z.infer<typeof FullServerTimeRequestSchema>;
export type FullOperationResponse=z.infer<typeof FullOperationResponseSchema>;
export type FullCommandResponse=z.infer<typeof FullCommandResponseSchema>;
export type FullLookupResponse=z.infer<typeof FullLookupResponseSchema>;
export type FullAdvanceResponse=z.infer<typeof FullAdvanceResponseSchema>;
export type FullServerTimeResponse=z.infer<typeof FullServerTimeResponseSchema>;

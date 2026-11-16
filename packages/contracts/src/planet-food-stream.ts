import {z} from 'zod';
import {IdentifierSchema,TimestampSchema} from './protocol.js';
import {PlanetFoodStreamOfferSchema,PlanetSessionSnapshotSchema} from './planet-service.js';

/** Read-only transport operations. They are not gameplay commands or presence renewals. */
export const PlanetFoodStreamScopeSchema=PlanetFoodStreamOfferSchema.extend({matchId:IdentifierSchema});
export type PlanetFoodStreamScope=z.infer<typeof PlanetFoodStreamScopeSchema>;
export const PlanetFoodWatchRequestSchema=PlanetFoodStreamScopeSchema.extend({operation:z.literal('foodWatch')});
export const PlanetFoodClockRequestSchema=PlanetFoodStreamScopeSchema.extend({operation:z.literal('foodClock')});
export const PlanetFoodTransportRequestSchema=z.discriminatedUnion('operation',[
  PlanetFoodWatchRequestSchema,PlanetFoodClockRequestSchema,
]);
export type PlanetFoodTransportRequest=z.infer<typeof PlanetFoodTransportRequestSchema>;

const frameContext={...PlanetFoodStreamScopeSchema.shape,frameEpoch:IdentifierSchema,
  frameSequence:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),serverTimeMs:TimestampSchema};
export const PlanetFoodStreamFrameSchema=z.discriminatedUnion('kind',[
  z.strictObject({...frameContext,kind:z.literal('snapshot'),fresh:z.boolean(),snapshot:PlanetSessionSnapshotSchema}),
  z.strictObject({...frameContext,kind:z.literal('closed'),reason:z.enum(['phase-ended','unavailable','authorization']),
    snapshot:PlanetSessionSnapshotSchema.optional()}),
]).superRefine((frame,ctx)=>{
  const snapshot=frame.snapshot;
  if(snapshot&&snapshot.matchId!==frame.matchId)ctx.addIssue({code:'custom',message:'Stream snapshot belongs to its match'});
  if(frame.kind==='snapshot'){
    if(snapshot?.foodStream?.version!==frame.version||snapshot.foodStream.phaseId!==frame.phaseId
      ||snapshot.foodStream.foodStepId!==frame.foodStepId)
      ctx.addIssue({code:'custom',message:'Snapshot belongs to the offered stream scope'});
    if(snapshot?.foodPublicView?.serverNowMs!==frame.serverTimeMs)
      ctx.addIssue({code:'custom',message:'Frame carries the projection clock, not an independently sampled time'});
    if(!frame.fresh&&!snapshot?.foodPlayerView?.participantTask)
      ctx.addIssue({code:'custom',message:'Private participant freshness is not exposed to another audience'});
  }else{
    if((frame.reason==='phase-ended')!==(snapshot!==undefined))
      ctx.addIssue({code:'custom',message:'Only planned closure includes a final authorized snapshot'});
    if(frame.reason==='phase-ended'&&snapshot?.foodStream?.phaseId===frame.phaseId
      &&snapshot.foodStream.foodStepId===frame.foodStepId)
      ctx.addIssue({code:'custom',message:'Planned closure cannot silently resume polling the same active scope'});
  }
});
export type PlanetFoodStreamFrame=z.infer<typeof PlanetFoodStreamFrameSchema>;

/** Only this paired response can calibrate time; one-way stream timestamps cannot. */
export const PlanetFoodClockResponseSchema=z.strictObject({
  ok:z.literal(true),scope:PlanetFoodStreamScopeSchema,receivedAt:TimestampSchema,serverTimeMs:TimestampSchema,
}).refine(value=>value.serverTimeMs>=value.receivedAt,{message:'Clock response follows request receipt'});
export type PlanetFoodClockResponse=z.infer<typeof PlanetFoodClockResponseSchema>;

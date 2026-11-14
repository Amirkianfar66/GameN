// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {FoodTaskPlayerViewSchema} from '@mothership/contracts';

// Only bounded validation facts leave this observer, never a private projection,
// actor/Task identity or command payload. The rewritten candidate is diagnostic:
// it is never given to the policy, controller or server.
export function foodPolicyObservation(model){
 const v=model.view,t=v?.participantTask,clock=model.clock,local=clock.status==='synced'?Math.floor(clock.serverNowMs):null;
 const original=FoodTaskPlayerViewSchema.safeParse(v),rewritten=local===null?null:FoodTaskPlayerViewSchema.safeParse({...v,serverNowMs:local});
 const predicates=now=>!t||now===null?null:{
  taskNotEnded:t.stage!=='ENDED',actorAlive:t.people.some(p=>p.seatId===v.seatId&&p.alive),withinDeadline:now<t.deadlineAt,
  pressBindingsMatch:v.offers.filter(o=>o.type==='TASK_PRESS').every(o=>o.taskId===t.taskId&&o.controlSessionId===t.controlSessionId&&o.controlRevision===t.controlRevision&&o.crateId===t.crate.id),
  inputControlMatches:v.offers.filter(o=>o.type==='TASK_PRESS').every(o=>o.inputs.every(k=>k==='KEY'||(k==='HOLD')===(t.selfControl==='WINCH'))),
  nonHoldAfterBriefing:v.offers.filter(o=>o.type==='TASK_PRESS').every(o=>o.inputs.every(k=>k==='HOLD'||now>=t.runningAt)),
 };
 const codes=result=>result?.success?[]:result?[...new Set(result.error.issues.map(i=>i.code))]:null;
 return {fresh:model.fresh,clockStatus:clock.status,originalValid:original.success,rewrittenValid:rewritten?.success??null,
  originalIssueCodes:codes(original),rewrittenIssueCodes:codes(rewritten),
  originalTaskOffsetMs:t?v.serverNowMs-t.startedAt:null,observedTaskOffsetMs:t&&local!==null?local-t.startedAt:null,
  pressOfferPresent:!!v?.offers.some(o=>o.type==='TASK_PRESS'),original:predicates(v?.serverNowMs??null),rewritten:predicates(local)};
}

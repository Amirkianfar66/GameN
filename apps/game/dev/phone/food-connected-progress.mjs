// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {PLANET_PHASE_DURATIONS as D} from '@mothership/contracts';

// Observer tolerance only. It does not change any server phase or deadline.
export const ORDINARY_TRANSPORT_TOLERANCE_MS=20_000;
export function ordinaryWaitBudget(playerCount){
 if(![7,8,9].includes(playerCount))throw TypeError('Expected 7, 8 or 9 players');
 // The engine permits at most two standard Hack sequences per round.
 const ruleMs=D.PRE_TURN+(playerCount-1)*D.ORDINARY_TURN+2*(D.HACK_DECLARE+D.HACK_RESULT+D.HACK);
 return {ruleMs,transportToleranceMs:ORDINARY_TRANSPORT_TOLERANCE_MS,totalMs:ruleMs+ORDINARY_TRANSPORT_TOLERANCE_MS};
}

/** Public phase/active-seat observation, not access to the saved future order. */
export function createOrdinaryProgress(playerCount,startedAtMs){
 const budget=ordinaryWaitBudget(playerCount),grace=budget.transportToleranceMs;
 let phaseId=null,phaseNumber=0,phaseEndBy=startedAtMs+grace,round=null,ownTurnSeen=false,previousWasOwn=false,lastLiveAt=startedAtMs;
 let lastInterval=null;
 return {budget,observe(model,atMs){
  const p=model?.phase,own=p?.kind==='ORDINARY_TURN'&&model.activeSeatId===model.ownSeatId&&model.ownSeatId!==null;
  const changed=!!p&&p.id!==phaseId,leftOwn=changed&&previousWasOwn;
  if(model?.connection==='live')lastLiveAt=atMs;
  if(round===null&&model?.round!==null&&model?.round!==undefined)round=model.round;
  const interval=p?JSON.stringify([p.kind,p.startedAt,p.endsAt]):null;
  const conflicting=!!p&&!changed&&lastInterval!==interval;
  if(changed){phaseId=p.id;phaseNumber++;lastInterval=interval;previousWasOwn=own;
   const remaining=p.trusted&&Number.isFinite(p.nowMs)&&Number.isFinite(p.endsAt)?Math.max(0,p.endsAt-p.nowMs):D[p.kind];
   phaseEndBy=atMs+(remaining??0)+grace;
  }
  ownTurnSeen||=!!own;
  const facts={phaseNumber,round:model?.round??null,kind:p?.kind??null,activeSeatId:model?.activeSeatId??null,ownSeatId:model?.ownSeatId??null,
   phaseStartedAt:p?.startedAt??null,phaseEndsAt:p?.endsAt??null,observedServerNowMs:p?.nowMs??null,phaseTrusted:p?.trusted??false,phaseExpired:p?.expired??null,
   connection:model?.connection??null,canPass:model?.canPass??false,ownTurnSeen,completedReads:model?.completedReads??null};
  const fail=reason=>({state:'failed',reason,facts});
  if(conflicting)return fail('PUBLIC_PHASE_INTERVAL_CHANGED');
  if(model?.round>round)return fail('ROUND_ADVANCED_BEFORE_OWN_PASS');
  if(['FINISHED','ABORTED'].includes(p?.kind))return fail('MATCH_ENDED_BEFORE_OWN_PASS');
  if(leftOwn)return fail('OWN_ORDINARY_TURN_LEFT_WITHOUT_PASS');
  if(model?.canPass){
   if(!own||model.connection!=='live'||!p.trusted||p.expired)return fail('INCONSISTENT_OWN_PASS_OFFER');
   return {state:'ready',reason:null,facts};
  }
  if(atMs-startedAtMs>budget.totalMs)return fail(ownTurnSeen?'OWN_PASS_NOT_OFFERED_WITHIN_BOUND':'OWN_TURN_NOT_OBSERVED_WITHIN_BOUND');
  if(atMs-lastLiveAt>grace)return fail('NO_LIVE_PUBLIC_PHASE');
  if(atMs>phaseEndBy)return fail(own?'OWN_PHASE_EXPIRED_WITHOUT_PASS':'PUBLIC_PHASE_STALLED_PAST_DEADLINE');
  return {state:'waiting',reason:null,facts};
 }};
}

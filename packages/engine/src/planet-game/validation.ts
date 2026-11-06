import { IdentifierSchema, PlanetVersionsSchema, PlanetRoundSchema, PlanetPhaseSchema, PlanetPromiseSchema, PlanetWindowDrawingSchema, PlanetEventSchema, PlanetResultSchema, PlanetTallySchema, PlanetCommandSchema, PlanetBoardViewSchema, validClinicalAnchorForPlayerCount, PlanetEngineerCaptureSchema, PlanetPanelRequestSchema, planetSupportsPhase } from '@mothership/contracts';
import type { SeatId } from '@mothership/contracts';
import type { PlanetGameContext, PlanetGameState } from './model.js';
import { planetFaction, seatIds, planetWorld, freeHealthy, planetHasSyncPresentation, planetHasPrivateFeedback } from './model.js';
import { planetSlotIds, planetJailOccupancy } from './physical.js';
export function assertPlanetContext(context:PlanetGameContext):void {
  if(!Number.isSafeInteger(context.now)||context.now<0||context.now>Number.MAX_SAFE_INTEGER-60000||!IdentifierSchema.safeParse(context.nextPhaseId).success
    ||!IdentifierSchema.safeParse(context.nextDeadlineToken).success||!Array.isArray(context.random)||context.random.some(x=>!Number.isFinite(x)||x<0||x>=1))throw Error('Invalid recorded planet transition context');
}
function fail(ok:unknown,label:string):asserts ok {if(!ok)throw Error(`Invalid planet authority: ${label}`);}
const distinct=(xs:readonly string[])=>new Set(xs).size===xs.length;
export function assertPlanetGameState(value:unknown):asserts value is PlanetGameState {
  fail(value!==null&&typeof value==='object'&&!Array.isArray(value),'object');const s=value as PlanetGameState;
  PlanetVersionsSchema.parse(s.versions);fail(planetSupportsPhase(s.versions,s.phase.kind),'versioned phase');PlanetRoundSchema.parse(s.round);PlanetPhaseSchema.parse(s.phase);IdentifierSchema.parse(s.matchId);
  fail([7,8,9].includes(s.playerCount),'player count');fail(Number.isSafeInteger(s.evaluatedAt)&&s.evaluatedAt>=s.phase.startedAt,'trusted time');
  const ids=seatIds(s),expected=Array.from({length:s.playerCount},(_,i)=>`seat-${i+1}`);
  fail(ids.length===s.playerCount&&ids.every(id=>expected.includes(id)),'original identities');
  const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(s.playerCount>=8?['Red Disabler']:[]),...(s.playerCount===9?['Engineer']:[])];
  fail(distinct(Object.values(s.roles))&&Object.values(s.roles).every(r=>roles.includes(r)),'original role roster');
  const code=ids.filter(id=>['Undercover','Alien','Insider','Doctor'].includes(s.roles[id]!));fail(Array.isArray(s.code)&&distinct(s.code)&&[...s.code].sort().join()===code.sort().join(),'original Code');
  const isIds=(a:unknown):a is SeatId[]=>Array.isArray(a)&&a.every(id=>ids.includes(id))&&distinct(a);
  fail(isIds(s.turnOrder)&&s.turnOrder.length===s.playerCount&&Number.isInteger(s.turnIndex)&&s.turnIndex>=0&&s.turnIndex<=s.playerCount,'round order');
  fail(s.global&&isIds(s.global.movementSpent)&&isIds(s.global.panelAttempts)&&isIds(s.global.hackSpent)&&isIds(s.global.promiseGiven)&&isIds(s.global.promiseReceived),'global ledgers');
  fail(Object.hasOwn(s.global.roundOrders,String(s.round))&&JSON.stringify(s.global.roundOrders[String(s.round)])===JSON.stringify(s.turnOrder),'saved current order');
  for(const [round,order]of Object.entries(s.global.roundOrders)){fail(/^[1-9][0-9]*$/.test(round)&&Number(round)<=s.round&&isIds(order)&&order.length===s.playerCount,'lazy saved orders');}
  fail(typeof s.global.blackholeSpent==='boolean'&&typeof s.global.codeAttempted==='boolean'&&typeof s.global.shipHackUnlocked==='boolean','global flags');
  fail(!s.global.shipHackUnlocked||s.global.codeAttempted,'Code unlock');
  for(const id of ids)fail(Number.isInteger(s.global.hackCounts[id])&&s.global.hackCounts[id]!>=0&&s.global.hackCounts[id]!<=1,'Hack lifetime');
  for(const promise of s.global.promises){PlanetPromiseSchema.parse(promise);if(promise.accepted)fail(s.global.promiseEvaluation[promise.id]&&Array.isArray(s.global.promiseEvaluation[promise.id]!.ballotPhaseIds),'accepted Promise opportunity ledger');}
  const accepted=s.global.promises.filter(p=>p.accepted);fail(distinct(accepted.map(p=>p.giverSeatId))&&distinct(accepted.map(p=>p.recipientSeatId))&&[...s.global.promiseGiven].sort().join()===accepted.map(p=>p.giverSeatId).sort().join()&&[...s.global.promiseReceived].sort().join()===accepted.map(p=>p.recipientSeatId).sort().join(),'Promise quotas');
  for(const drawing of s.global.drawings)PlanetWindowDrawingSchema.parse(drawing);
  fail(distinct(s.global.promises.map(p=>p.id))&&distinct(s.global.drawings.map(d=>d.id)),'record identity');
  const worlds=Object.entries(s.worlds);fail(worlds.length>0&&worlds.length<=s.playerCount+1&&Object.hasOwn(s.worlds,s.currentWorldId),'world inventory');
  fail(Object.keys(s.realityOf).length===ids.length&&ids.every(id=>Object.hasOwn(s.worlds,s.realityOf[id]!)),'assigned worlds');
  fail(typeof s.blackholeActive==='boolean'&&typeof s.blackoutPreviewComplete==='boolean','window flags');
  fail(s.blackholeActive||worlds.length===1,'collapsed worlds');
  const feedback=planetHasPrivateFeedback(s.versions);
  if(feedback) {
    fail(s.global.panelRequests&&typeof s.global.panelRequests==='object'&&!Array.isArray(s.global.panelRequests),'patient knowledge ledger');
    const attempts=Object.keys(s.global.panelRequests);fail(attempts.every(id=>ids.includes(id as SeatId))&&attempts.sort().join()===[...s.global.panelAttempts].sort().join(),'patient attempt identities');
    for(const record of Object.values(s.global.panelRequests)){PlanetPanelRequestSchema.parse(record);fail(record!.round<=s.round,'patient attempt round');}
    fail(typeof s.navigation.settingTie==='boolean'&&(s.navigation.settingDirection===null||['Blue','Red'].includes(s.navigation.settingDirection!)),'private setting state');
  }else fail(!Object.hasOwn(s.global,'panelRequests')&&!Object.hasOwn(s.navigation,'settingTie')&&!Object.hasOwn(s.navigation,'settingDirection'),'legacy private shape');
  if(s.phase.kind==='NAV_SETTING')fail(feedback&&s.round>=2&&s.navigation.started&&s.navigation.direction===null&&s.navigation.lastMovedRound<s.round&&!s.panelOpen&&s.ballot===null&&s.activeSeatId===null,'neutral setting opportunity');
  if(s.phase.kind==='BLACKHOLE_PRESENTATION') {
    fail(planetHasSyncPresentation(s.versions)&&!s.blackholeActive&&s.global.blackholeSpent&&s.global.blackholeRound===s.round
      &&!s.panelOpen&&s.ballot===null&&s.activeSeatId===null&&s.afterVote===null&&!s.navigation.started
      &&s.finalized.round===s.round&&planetWorld(s).events.some(r=>r.event.kind==='BLACKHOLE_SYNCED'&&r.event.round===s.round),'authorized post-Sync presentation');
    fail(s.global.promises.every(p=>!p.accepted||p.round!==s.round||!['MEET_A','MEET_B'].includes(p.kind)||p.status==='Pending'),'meeting opportunity still closed');
  }
  for(const [worldId,w]of worlds){IdentifierSchema.parse(worldId);fail(w.seats.length===ids.length&&isIds(w.seats.map(x=>x.seatId)),'world complete roster');
    if(feedback){
      fail(w.panelReservations&&typeof w.panelReservations==='object'&&!Array.isArray(w.panelReservations),'world reservation ledger');
      for(const [key,reservation]of Object.entries(w.panelReservations)){
        const knowledge=s.global.panelRequests![reservation.seatId];
        fail(ids.includes(reservation.seatId)&&knowledge&&key===`${reservation.seatId}:${knowledge.commandId}`&&reservation.round===knowledge.round&&reservation.round<=s.round&&['QUEUED','TREATED','NO_EFFECT'].includes(reservation.status)&&reservation.status===knowledge.status,'world reservation identity');
        if(reservation.status==='QUEUED')fail(w.actions.some(a=>a.actorSeatId===reservation.seatId&&a.commandId===knowledge.commandId&&a.command.type==='PANEL_CODE'),'retained queued reservation');
      }
    }else fail(!Object.hasOwn(w,'panelReservations'),'legacy world shape');
    fail(Number.isInteger(w.injectionsRemaining)&&w.injectionsRemaining>=0&&w.injectionsRemaining<=2,'healing pool');const slots:string[]=[];
    for(const seat of w.seats){
      if(feedback){fail(Object.hasOwn(seat,'engineerCapture'),'capture evidence field');if(seat.engineerCapture){PlanetEngineerCaptureSchema.parse(seat.engineerCapture);fail(s.roles[seat.seatId]==='Engineer'&&seat.engineerCapture.round<=s.round&&isIds(seat.engineerCapture.seatIds),'fixed original capture');}fail(seat.engineerSpent===(seat.engineerCapture!==null),'capture/use consistency');}
      else fail(!Object.hasOwn(seat,'engineerCapture'),'legacy seat shape');
      fail(['Healthy','Injured','Eliminated'].includes(seat.health),'health');
      fail(seat.location===null?seat.slotId===null&&seat.health==='Eliminated':seat.slotId!==null&&planetSlotIds(seat.location).includes(seat.slotId),'physical slot');
      if(seat.slotId!==null)slots.push(seat.slotId);
      fail(seat.health!=='Injured'||seat.location==='Hospital','admission finalized');
      fail(seat.health==='Injured'?seat.medical!==null&&seat.medical!==undefined&&seat.medical.admittedRound===seat.rescueDueAfterRound!-1&&seat.medical.rescueDueAfterRound===seat.rescueDueAfterRound:seat.medical===null,'medical episode');
      fail(seat.rescueDueAfterRound===null||(seat.health==='Injured'&&Number.isSafeInteger(seat.rescueDueAfterRound)&&seat.rescueDueAfterRound>=s.round),'rescue deadline');
      fail(Number.isInteger(seat.ordinaryWeapons)&&seat.ordinaryWeapons>=0&&seat.ordinaryWeapons<=2,'ammunition');
      fail(['Room A','Room B'].includes(seat.lastRoom)&&typeof seat.jailed==='boolean'&&typeof seat.roleActionSpent==='boolean'&&typeof seat.shotSpent==='boolean','seat bookkeeping');
      fail(!seat.jailed||seat.location==='Jail'||seat.location==='Hospital','detention');
      fail(!seat.clone.active||(s.roles[seat.seatId]==='Alien'&&seat.clone.used&&seat.health!=='Eliminated'&&seat.clone.expiresAfterRound!==null&&seat.clone.expiresAfterRound>=s.round),'Clone');
      fail(seat.revealedFaction===null||seat.revealedFaction===planetFaction(s.roles[seat.seatId]!), 'faction reveal');
    }
    fail(distinct(slots)&&planetJailOccupancy(w)<=5,'occupied capacity');
    for(const office of [w.captainSeatId,w.officerSeatId])fail(office===null||w.seats.some(x=>x.seatId===office&&freeHealthy(x)),'office holder');
    fail(w.captainSeatId===null?w.officerSeatId===null:w.captainSeatId!==w.officerSeatId,'office term');
    for(const action of w.actions){
      PlanetCommandSchema.parse(action.command);fail(ids.includes(action.actorSeatId)&&IdentifierSchema.safeParse(action.commandId).success&&action.order===s.turnOrder.indexOf(action.actorSeatId),'retained action');
      fail(['REGISTER_SHOT','PROTECT','REQUEST_BLACKOUT','RESCUE','SUPPLY','PANEL_CODE'].includes(action.command.type),'retained opcode');
      if('targetSeatId'in action.command)fail(action.command.targetSeatId!==null&&ids.includes(action.command.targetSeatId),'retained target');
      if(action.command.type==='SUPPLY')fail(action.command.targetSeatIds.every(id=>ids.includes(id)),'retained Supply targets');
      if(action.command.type==='PANEL_CODE')fail(s.roles[action.command.doctorSeatId]==='Doctor'&&s.global.panelAttempts.includes(action.actorSeatId),'reserved panel');
      if(feedback&&action.command.type==='PANEL_CODE')fail(w.panelReservations?.[`${action.actorSeatId}:${action.commandId}`]?.status==='QUEUED','queued panel reservation');
      if(action.command.type==='REQUEST_BLACKOUT')fail(action.boundRoom&&['Room A','Room B','Command Room'].includes(action.boundRoom)&&(action.selectedSlotId===null||action.selectedSlotId!==undefined&&planetSlotIds(action.boundRoom).includes(action.selectedSlotId)),'retained Blackout binding');
    }
    for(const e of w.events){PlanetEventSchema.parse(e.event);fail(e.recipients===null||isIds(e.recipients),'frozen audience');
      fail(e.event.seatIds.every(id=>ids.includes(id)),'event original identities');
      if(e.event.kind==='ATTACK_BLOCKED')fail(e.event.location!==null&&e.event.actorSeatId===null&&e.event.seatIds.length===1&&e.recipients!==null&&e.recipients.length>0&&e.recipients.includes(e.event.seatIds[0]!),'room-only defense audience');
      else fail(e.recipients===null,'public event audience');
      fail(e.event.clinicalAnchor===null||validClinicalAnchorForPlayerCount(e.event.clinicalAnchor,s.playerCount),'clinical anchor');
      if(['INJURED','RESCUED','ELIMINATED'].includes(e.event.kind))fail(e.event.clinicalAnchor!==null,'clinical consequence anchor');
      if(e.event.kind==='HOSPITAL_OVERFLOW_REMOVED')fail(e.event.clinicalAnchor===null,'nonclinical overflow');
    }
  }
  PlanetBoardViewSchema.parse({kind:'FINALIZED',finalizedRound:s.finalized?.round,seats:s.finalized?.seats});
  fail(s.finalized&&s.finalized.seats.length===ids.length&&isIds(s.finalized.seats.map(x=>x.seatId)),'finalized board');
  fail(Number.isInteger(s.finalized.round)&&s.finalized.round>=0&&s.finalized.round<=s.round,'finalized checkpoint');
  fail(s.eventPublications!==null&&typeof s.eventPublications==='object','publication ledger');
  fail(Number.isInteger(s.revisions.public)&&s.revisions.public>=0&&ids.every(id=>Number.isInteger(s.revisions.players[id])&&s.revisions.players[id]!>=0),'audience revisions');
  if(s.ballot)fail(isIds(s.ballot.eligibleVoters)&&isIds(s.ballot.eligibleTargets)&&Object.entries(s.ballot.votes).every(([id,target])=>s.ballot!.eligibleVoters.includes(id as SeatId)&&(target===null||s.ballot!.eligibleTargets.includes(target))),'actual ballots');
  if(s.lastTally)PlanetTallySchema.parse(s.lastTally);if(s.result)PlanetResultSchema.parse(s.result);
  fail(['FINISHED','ABORTED'].includes(s.phase.kind)?s.deadlineToken===null&&s.result!==null:s.result===null&&IdentifierSchema.safeParse(s.deadlineToken).success,'terminal/deadline');
  fail(s.activeSeatId===null||ids.includes(s.activeSeatId),'active actor');planetWorld(s);
}
export function decodePlanetGameState(value:unknown):PlanetGameState {const parsed=JSON.parse(JSON.stringify(value)) as unknown;assertPlanetGameState(parsed);return parsed;}
export function encodePlanetGameState(state:PlanetGameState):PlanetGameState {return decodePlanetGameState(state);}

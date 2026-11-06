import type { PlanetCommand, SeatId } from '@mothership/contracts';
import { copyPlanet, planetWorld, planetSeat, alive, freeHealthy, ownTurn, canRoleAction, planetFaction, seatIds, planetHasPrivateFeedback } from './model.js';
import type { PlanetGameState } from './model.js';
import { physicalPlanetCommand, planetLocalTarget, planetSlotIds } from './physical.js';
import { socialPlanetCommand } from './social.js';

export function planetMovementOpen(state:PlanetGameState):boolean {
  if(state.phase.kind==='ORDINARY_TURN')return true;
  return ['HACK_DECLARE','HACK_RESULT','HACK'].includes(state.phase.kind)&&state.turnOrder.slice(state.turnIndex+1).some(id=>alive(planetSeat(planetWorld(state,id),id)));
}
export function planetBaseCommand(state:PlanetGameState,actorId:SeatId,command:PlanetCommand,commandId:string,now:number):boolean {
  if(!state.roles[actorId]||state.result)return false;
  const world=planetWorld(state,actorId),actor=planetSeat(world,actorId);
  if(!alive(actor))return false;
  const target='targetSeatId'in command&&command.targetSeatId!==null?world.seats.find(s=>s.seatId===command.targetSeatId):undefined;
  switch(command.type){
    case 'PASS_TURN':return ownTurn(state,actorId);
    case 'MOVE': {
      if(!planetMovementOpen(state)||!freeHealthy(actor)||state.global.movementSpent.includes(actorId)||state.global.blockedSeatId===actorId
        ||(command.destination==='Command Room'&&world.captainSeatId!==actorId)||!planetSlotIds(command.destination).includes(command.slotId)
        ||world.seats.some(s=>s.slotId===command.slotId))return false;
      const crossing=(actor.location==='Room A'&&command.destination==='Room B')||(actor.location==='Room B'&&command.destination==='Room A');
      if(crossing&&state.blackholeActive){const id=`world-${state.nextWorldNumber++}`;state.worlds[id]=copyPlanet(world);state.realityOf[actorId]=id;}
      const moved=planetSeat(planetWorld(state,actorId),actorId);moved.location=command.destination;moved.slotId=command.slotId;
      if(command.destination==='Room A'||command.destination==='Room B')moved.lastRoom=command.destination;
      state.global.movementSpent.push(actorId);return true;
    }
    case 'APPOINT_OFFICER':
      if(state.phase.kind!=='OFFICER_APPOINTMENT'||world.captainSeatId!==actorId||!freeHealthy(actor)||!target||target.seatId===actorId||!freeHealthy(target))return false;
      world.officerSeatId=target.seatId;return true;
    case 'BLOCK_MOVE':
      if(state.phase.kind!=='PRE_TURN'||world.officerSeatId!==actorId||!freeHealthy(actor)||state.global.blockedSeatId!==null||!target||!alive(target)||target.seatId===state.global.lastBlockedSeatId)return false;
      state.global.blockedSeatId=target.seatId;return true;
    case 'ACTIVATE_BLACKHOLE':
      if(state.phase.kind!=='PRE_TURN'||state.roles[actorId]!=='Alien'||!freeHealthy(actor)||actor.roleActionSpent||state.global.blackholeSpent||![world.captainSeatId,world.officerSeatId].includes(actorId))return false;
      state.global.blackholeSpent=true;state.global.blackholeRound=state.round;actor.roleActionSpent=true;state.blackholeActive=true;return true;
    case 'SCAN': {
      if(state.roles[actorId]!=='Hacker'||!canRoleAction(state,actorId)||state.global.shipHackUnlocked||state.global.scanUsedRound===state.round
        ||(state.global.scanBlockedThroughRound!==null&&state.global.scanBlockedThroughRound>=state.round)||!target||!planetLocalTarget(state,world,actor,target,true))return false;
      actor.roleActionSpent=true;state.global.scanUsedRound=state.round;
      const matched=planetFaction(state.roles[target.seatId]!)===command.guess;
      state.global.scanResults.push({round:state.round,targetSeatId:target.seatId,guess:command.guess,matched,inCode:matched?state.code.includes(target.seatId):null});
      if(!matched)state.global.scanBlockedThroughRound=state.round+1;return true;
    }
    case 'SUBMIT_CODE':
      if(state.roles[actorId]!=='Hacker'||state.round<2||state.navigation.started||state.global.codeAttempted||command.seatIds.some(id=>!state.roles[id]))return false;
      state.global.codeAttempted=true;state.global.shipHackUnlocked=[...command.seatIds].sort().join() === [...state.code].sort().join();return true;
    case 'ACTIVATE_SHIP_HACK':
      if(state.roles[actorId]!=='Hacker'||!canRoleAction(state,actorId)||!['Room A','Room B'].includes(actor.location??'')||!state.global.shipHackUnlocked||world.shipHackSpent)return false;
      actor.roleActionSpent=true;world.shipHackSpent=true;world.shipHackOverride=true;return true;
    case 'REQUEST_HACK':
      if(!ownTurn(state,actorId)||state.global.hackCounts[actorId]!>0||state.global.hackSpent.length>=2||state.hack!==null||!target||!planetLocalTarget(state,world,actor,target))return false;
      state.global.hackCounts[actorId]!++;state.global.hackSpent.push(actorId);state.hack={id:commandId,actorSeatId:actorId,targetSeatId:target.seatId,declaredSide:null,status:'AWAITING_DECLARATION'};return true;
    case 'DECLARE_HACK_SIDE':
      if(state.phase.kind!=='HACK_DECLARE'||state.hack?.targetSeatId!==actorId||state.hack.status!=='AWAITING_DECLARATION'
        ||(!['Undercover','Alien'].includes(state.roles[actorId]!)&&planetFaction(state.roles[actorId]!)!==command.declaredSide))return false;
      state.hack.declaredSide=command.declaredSide;state.hack.status='DECLARED';return true;
    case 'VOTE':
      if(!state.ballot||!['JAIL_VOTE','CAPTAIN_ELECTION'].includes(state.phase.kind)||!state.ballot.eligibleVoters.includes(actorId)||Object.hasOwn(state.ballot.votes,actorId)
        ||(command.targetSeatId!==null&&!state.ballot.eligibleTargets.includes(command.targetSeatId)))return false;
      state.ballot.votes[actorId]=command.targetSeatId;return true;
    case 'SELECT_BLACKOUT_SLOT': {
      const request=world.actions.find(a=>a.actorSeatId===actorId&&a.command.type==='REQUEST_BLACKOUT');
      if(state.phase.kind!=='BLACKOUT'||command.windowId!==state.phase.id||now<state.phase.startedAt+5000||!request||!freeHealthy(actor)||request.selectedSlotId!==null
        ||!request.boundRoom||!planetSlotIds(request.boundRoom).includes(command.slotId))return false;
      request.selectedSlotId=command.slotId;actor.blackoutSpent=true;return true;
    }
    case 'CHOOSE_NAV_DIRECTION':
      if(world.officerSeatId!==actorId||!freeHealthy(actor))return false;
      if(planetHasPrivateFeedback(state.versions)) {
        if(state.phase.kind!=='NAV_SETTING'||state.navigation.settingTie!==true||state.navigation.settingDirection!==null)return false;
        state.navigation.settingDirection=command.direction;return true;
      }
      if(state.phase.kind!=='NAV_TIE'||state.navigation.direction!==null)return false;
      state.navigation.direction=command.direction;return true;
    case 'CONFIRM_NAVIGATION':return freeHealthy(actor)&&((state.phase.kind==='NAV_CAPTAIN_CONFIRM'&&world.captainSeatId===actorId)||(state.phase.kind==='NAV_OFFICER_CONFIRM'&&world.officerSeatId===actorId));
    default:return false;
  }
}
export function planetCommand(state:PlanetGameState,id:SeatId,command:PlanetCommand,commandId:string,now:number):boolean {
  return planetBaseCommand(state,id,command,commandId,now)||physicalPlanetCommand(state,id,command,commandId)||socialPlanetCommand(state,id,command,commandId,now);
}
export function canPlanetBaseCommand(state:PlanetGameState,id:SeatId,command:PlanetCommand):boolean {return planetBaseCommand(copyPlanet(state),id,command,'offer',state.evaluatedAt);}

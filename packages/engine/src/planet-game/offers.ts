import type { PlanetCommand, PlanetOffer, SeatId } from '@mothership/contracts';
import { copyPlanet, planetWorld, seatIds, alive, planetSeat, planetHasPhoneOffers } from './model.js';
import type { PlanetGameState } from './model.js';
import { planetPhysicalOffers, planetSlotIds } from './physical.js';
import { canPlanetBaseCommand } from './commands.js';
import { socialPlanetCommand, planetWindows } from './social.js';
export function planetOffers(state:PlanetGameState,id:SeatId):PlanetOffer[] {
  if(!state.roles[id]||state.result||!alive(planetSeat(planetWorld(state,id),id)))return [];
  const out=planetPhysicalOffers(state,id),ids=seatIds(state);
  const add=(type:PlanetOffer['type'],targetSeatIds:SeatId[]=[],slotIds:PlanetOffer['slotIds']=[],windowIds:PlanetOffer['windowIds']=[])=>out.push({type,targetSeatIds,slotIds,windowIds,promiseTargetSeatIds:type==='OFFER_PROMISE'?ids:[]});
  for(const type of ['PASS_TURN','ACTIVATE_BLACKHOLE','ACTIVATE_SHIP_HACK','CONFIRM_NAVIGATION'] as const)if(canPlanetBaseCommand(state,id,{type}))add(type,[id]);
  for(const type of ['REQUEST_HACK','APPOINT_OFFICER','BLOCK_MOVE'] as const){const targets=ids.filter(targetSeatId=>canPlanetBaseCommand(state,id,{type,targetSeatId} as PlanetCommand));if(targets.length)add(type,targets);}
  const scan=ids.filter(targetSeatId=>canPlanetBaseCommand(state,id,{type:'SCAN',targetSeatId,guess:'Blue'}));if(scan.length)add('SCAN',scan);
  const code=ids.slice(0,4);if(code.length===4&&canPlanetBaseCommand(state,id,{type:'SUBMIT_CODE',seatIds:code}))add('SUBMIT_CODE',ids);
  const moves=(['Room A','Room B','Command Room'] as const).flatMap(destination=>planetSlotIds(destination).filter(slotId=>canPlanetBaseCommand(state,id,{type:'MOVE',destination,slotId})));if(moves.length)add('MOVE',[],moves);
  if(state.ballot&&canPlanetBaseCommand(state,id,{type:'VOTE',targetSeatId:null}))add('VOTE',[...state.ballot.eligibleTargets]);
  const declaredSides=(['Blue','Red','Alien'] as const).filter(declaredSide=>canPlanetBaseCommand(state,id,{type:'DECLARE_HACK_SIDE',declaredSide}));
  if(declaredSides.length){add('DECLARE_HACK_SIDE',[id]);if(planetHasPhoneOffers(state.versions))out[out.length-1]!.declaredSides=declaredSides;}
  if((['Blue','Red'] as const).some(direction=>canPlanetBaseCommand(state,id,{type:'CHOOSE_NAV_DIRECTION',direction})))add('CHOOSE_NAV_DIRECTION',[id]);
  const req=planetWorld(state,id).actions.find(a=>a.actorSeatId===id&&a.command.type==='REQUEST_BLACKOUT');
  if(state.phase.kind==='BLACKOUT'&&req?.boundRoom&&req.selectedSlotId===null){const slots=planetSlotIds(req.boundRoom).filter(slotId=>canPlanetBaseCommand(state,id,{type:'SELECT_BLACKOUT_SLOT',windowId:state.phase.id,slotId}));if(slots.length)add('SELECT_BLACKOUT_SLOT',[id],slots);}
  const social=(command:PlanetCommand)=>socialPlanetCommand(copyPlanet(state),id,command,'offer',state.evaluatedAt);
  const recipients=ids.filter(recipientSeatId=>social({type:'OFFER_PROMISE',recipientSeatId,kind:'MEET_A',targetSeatId:null}));if(recipients.length)add('OFFER_PROMISE',recipients);
  for(const type of ['ACCEPT_PROMISE','DECLINE_PROMISE'] as const)if(state.global.promises.some(p=>social({type,promiseId:p.id})))add(type,[id]);
  const windows=planetWindows(state,id).filter(w=>w.canDraw).map(w=>w.windowId);if(windows.length)add('SHOW_WINDOW',[],[],windows);
  return out;
}

import assert from 'node:assert/strict';
import {planetWorldDriver,prepareBlackholeRound,moveAcross} from '../../../packages/engine/test/planet-world-helper.mjs';

const voteAll=(d,target)=>{for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:target});d.deadline();};
export function navigationControl(count){
  const d=planetWorldDriver(count);d.until(s=>s.round===1&&s.phase.kind==='JAIL_VOTE');voteAll(d,'seat-1');
  d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');voteAll(d,'seat-7');d.deadline();
  d.command('seat-7',{type:'APPOINT_OFFICER',targetSeatId:'seat-4'});
  d.until(s=>s.round===2&&s.phase.kind==='JAIL_VOTE');voteAll(d,count===8?null:'seat-2');
  d.until(s=>s.round===2&&s.phase.kind==='NAV_SETTING');assert.equal(d.state.navigation.settingTie,true);return d;
}
export function branchedPanelControl(count){
  const d=prepareBlackholeRound(planetWorldDriver(count),{patient:true}),branch=moveAcross(d,'seat-2');
  d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===d.ids.at(-1));return {driver:d,branch};
}

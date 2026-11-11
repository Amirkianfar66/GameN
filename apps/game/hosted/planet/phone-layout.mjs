import {turnsLayout} from '../board-v2-drawing/turns-four.mjs';
import {pressSide,slotRects} from '../board-v2-drawing/fit-four.mjs';
import {BOARD_ROOMS,LOCATION_OF,sceneOf,slotsOf} from '../board-v2-drawing/slots-four.mjs';
import {frameScene} from '../scene-drawing/frame.mjs';
import {phoneFrame,framingInput} from './phone-framing.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const phoneRoom=location=>BOARD_ROOMS.find(room=>LOCATION_OF[room]===location)??null;

/** Designer #229: the measured outline and motion allowance keep the actual figure whole. */
export function phoneRoomFrame(room,count,panel,present=[]){
 return phoneFrame(sceneOf(room,count),panel,present);
}
export function phoneSlotRects(room,count,panel,frame=phoneRoomFrame(room,count,panel)){
 return slotsOf(room,count).map(slot=>{
  const side=pressSide(slot.scale*frame.k),[x,y]=slot.pressAt;
  const left=clamp(frame.tx+x*frame.k-side/2,0,panel.width-side),top=clamp(frame.ty+y*frame.k-side/2,panel.cap,panel.height-panel.pad-side);
  return {id:slot.id,left,top,side,press:[frame.tx+x*frame.k,frame.ty+y*frame.k],marker:[left+side-12,top+12],badge:[frame.tx+slot.badgeAt[0]*frame.k,frame.ty+slot.badgeAt[1]*frame.k],frame};
 });
}
/** Board keeps the approved panel fitting. A short/large-text screen scrolls that board
 * between the bars instead of shrinking targets or making the controls unreachable. */
export function phoneLayouts({width,height,top,nav},count,positions=[],{frameAll=false,roomInputs=null}={}){
 const stageHeight=Math.max(120,height-top-nav),roomPanel={width:width-4,height:stageHeight-4,cap:44,pad:8};
 let virtualHeight=height,board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});
 while(!board.fits&&virtualHeight<1800){virtualHeight+=40;board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});}
 const boardBoxes=Object.fromEntries(Object.entries(board.board.boxes).map(([id,b])=>[id,{...b,top:b.top-top}]));
 const inputs=roomInputs??Object.freeze(Object.fromEntries(BOARD_ROOMS.map(id=>[id,framingInput(slotsOf(id,count).flatMap(slot=>{
  if(frameAll)return [{...slot,eliminated:false}];const p=positions.find(p=>p.location===LOCATION_OF[id]&&p.slotId===slot.id);return p?[{...slot,eliminated:p.eliminated===true||p.health==='Eliminated'}]:[];
 }))])));
 const roomFrames=Object.fromEntries(BOARD_ROOMS.map(id=>[id,phoneFrame(sceneOf(id,count),roomPanel,[],inputs[id])]));
 const roomPresses=Object.fromEntries(BOARD_ROOMS.map(id=>[id,phoneSlotRects(id,count,roomPanel,roomFrames[id])]));
 const boardFrames=Object.fromEntries(BOARD_ROOMS.map(id=>[id,frameScene(sceneOf(id,count),board.board.panels[id])]));
 const boardPresses=Object.fromEntries(BOARD_ROOMS.map(id=>[id,slotRects(id,count,board.board.panels[id])]));
 return {top,nav,width,stageHeight,roomPanel,roomFrames,roomPresses,boardFrames,boardPresses,roomInputs:inputs,
  board:{...board,board:{...board.board,boxes:boardBoxes},contentHeight:virtualHeight-top-nav},
  room:{fits:true,board:{shell:{border:2,top:0},navTop:stageHeight,boxes:Object.fromEntries([...BOARD_ROOMS,'capsule'].map(id=>[id,{left:0,top:0,width,height:stageHeight}])),panels:Object.fromEntries(BOARD_ROOMS.map(id=>[id,roomPanel]))},contentHeight:stageHeight}};
}

/** Stores only coordinates for both views for one authoritative window. No roster survives. */
export function createBlackoutGeometry(){
 let saved=null;
 return {read(windowId,make,{viewportKey=null,reflow=null}={}){
  if(!windowId){saved=null;return make();}
  if(saved?.id===windowId){if(viewportKey!==saved.viewportKey&&reflow){const geometry=reflow(saved.geometry.roomInputs);if(!geometry)return null;saved={id:windowId,geometry,viewportKey};}return saved.geometry;}
  const geometry=make();if(geometry)saved={id:windowId,geometry,viewportKey};return geometry;
 },clear(){saved=null;}};
}

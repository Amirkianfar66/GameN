import {turnsLayout} from '../board-v2-drawing/turns-four.mjs';
import {pressSide,slotRects} from '../board-v2-drawing/fit-four.mjs';
import {BOARD_ROOMS,LOCATION_OF,sceneOf,slotsOf} from '../board-v2-drawing/slots-four.mjs';
import {frameScene,slotGeometry} from '../scene-drawing/frame.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const phoneRoom=location=>BOARD_ROOMS.find(room=>LOCATION_OF[room]===location)??null;

/** Geometry uses all fixed places, never occupants, roles, eligibility or a private target.
 * This also makes a reconnect directly into darkness deterministic without retaining people. */
export function phoneRoomFrame(room,count,panel){
 const scene=sceneOf(room,count),[x0,y0,x1,y1]=scene.inner??[0,0,1024,768];
 const k=Math.max(panel.width/(x1-x0),panel.height/(y1-y0));
 const places=slotsOf(room,count),xs=places.map(s=>s.pressAt[0]);
 const lo=Math.min(...xs),hi=Math.max(...xs),margin=48;
 let tx=panel.width/2-(scene.focus[0]+scene.focus[2])/2*k;
 if((hi-lo)*k>panel.width-2*margin)tx=panel.width/2-(lo+hi)/2*k;
 else tx=clamp(tx,margin-lo*k,panel.width-margin-hi*k);
 tx=clamp(tx,panel.width-x1*k,-x0*k);
 const gs=places.map(s=>slotGeometry(s)),top=Math.min(...gs.map(g=>g.headTop)),bottom=Math.max(...gs.map(g=>g.press[1]+22/k));
 const avail=panel.height-panel.cap-panel.pad;
 const ty=clamp((bottom-top)*k>avail?panel.height-panel.pad-bottom*k:panel.cap+(avail-(bottom-top)*k)/2-top*k,panel.height-y1*k,-y0*k);
 return {k,tx,ty};
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
export function phoneLayouts({width,height,top,nav},count){
 const stageHeight=Math.max(120,height-top-nav),roomPanel={width:width-4,height:stageHeight-4,cap:44,pad:8};
 let virtualHeight=height,board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});
 while(!board.fits&&virtualHeight<1800){virtualHeight+=40;board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});}
 const boardBoxes=Object.fromEntries(Object.entries(board.board.boxes).map(([id,b])=>[id,{...b,top:b.top-top}]));
 const roomFrames=Object.fromEntries(BOARD_ROOMS.map(id=>[id,phoneRoomFrame(id,count,roomPanel)]));
 const roomPresses=Object.fromEntries(BOARD_ROOMS.map(id=>[id,phoneSlotRects(id,count,roomPanel,roomFrames[id])]));
 const boardFrames=Object.fromEntries(BOARD_ROOMS.map(id=>[id,frameScene(sceneOf(id,count),board.board.panels[id])]));
 const boardPresses=Object.fromEntries(BOARD_ROOMS.map(id=>[id,slotRects(id,count,board.board.panels[id])]));
 return {top,nav,width,stageHeight,roomPanel,roomFrames,roomPresses,boardFrames,boardPresses,
  board:{...board,board:{...board.board,boxes:boardBoxes},contentHeight:virtualHeight-top-nav},
  room:{fits:true,board:{shell:{border:2,top:0},navTop:stageHeight,boxes:Object.fromEntries([...BOARD_ROOMS,'capsule'].map(id=>[id,{left:0,top:0,width,height:stageHeight}])),panels:Object.fromEntries(BOARD_ROOMS.map(id=>[id,roomPanel]))},contentHeight:stageHeight}};
}

/** Stores only coordinates for both views for one authoritative window. No roster survives. */
export function createBlackoutGeometry(){
 let saved=null;
 return {read(windowId,make){if(!windowId){saved=null;return make();}if(saved?.id!==windowId)saved={id:windowId,geometry:make()};return saved.geometry;},clear(){saved=null;}};
}

import {turnsLayout} from '../board-v2-drawing/turns-four.mjs';
import {pressSide,slotRects} from '../board-v2-drawing/fit-four.mjs';
import {BOARD_ROOMS,LOCATION_OF,sceneOf,slotsOf} from '../board-v2-drawing/slots-four.mjs';
import {frameScene} from '../scene-drawing/frame.mjs';
import {FRAME} from '../scene-drawing/body.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const phoneRoom=location=>BOARD_ROOMS.find(room=>LOCATION_OF[room]===location)??null;

/** Geometry uses all fixed places, never occupants, roles, eligibility or a private target.
 * This also makes a reconnect directly into darkness deterministic without retaining people. */
export function phoneRoomFrame(room,count,panel){
 const scene=sceneOf(room,count),[x0,y0,x1,y1]=scene.inner??[0,0,1024,768];
 const [bx,by,side]=FRAME.box,[ax,ay]=FRAME.anchor,margin=8;
 // Fit the complete public rig canvas at every fixed place. Cover-only framing
 // could keep a clamped hitbox on screen while cropping its actual person away.
 // All places participate regardless of occupants, health or private permission.
 const boxes=slotsOf(room,count).map(s=>({left:s.at[0]-(ax-bx)*s.scale,top:s.at[1]-(ay-by)*s.scale,side:side*s.scale}));
 const lo=Math.min(...boxes.map(b=>b.left)),hi=Math.max(...boxes.map(b=>b.left+b.side)),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.top+b.side));
 const availableWidth=panel.width-2*margin,availableHeight=panel.height-panel.cap-panel.pad-2*margin;
 const k=Math.min(Math.max(panel.width/(x1-x0),panel.height/(y1-y0)),availableWidth/(hi-lo),availableHeight/(bottom-top));
 const tx=clamp(panel.width/2-(scene.focus[0]+scene.focus[2])/2*k,margin-lo*k,panel.width-margin-hi*k);
 const ty=panel.cap+margin+(availableHeight-(bottom-top)*k)/2-top*k;
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

import {turnsLayout} from '../board-v2-drawing/turns-four.mjs';
import {pressSide,slotRects} from '../board-v2-drawing/fit-four.mjs';
import {BOARD_ROOMS,LOCATION_OF,sceneOf,slotsOf} from '../board-v2-drawing/slots-four.mjs';
import {frameScene,PRESS,slotGeometry} from '../scene-drawing/frame.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const phoneRoom=location=>BOARD_ROOMS.find(room=>LOCATION_OF[room]===location)??null;

const within=(value,lo,hi)=>lo<=hi?clamp(value,lo,hi):(lo+hi)/2;
/** Owner T1 / Designer #221 phoneFrame: cover the room; keep lit occupants' press areas whole.
 * Callers supply only authorized lit/public-pre-window positions, never hidden current occupancy. */
export function phoneRoomFrame(room,count,panel,present=[]){
 const scene=sceneOf(room,count),[x0,y0,x1,y1]=scene.inner??[0,0,1024,768];
 let k=Math.max(panel.width/(x1-x0),panel.height/(y1-y0)),cx=(scene.focus[0]+scene.focus[2])/2;
 if(present.length){const xs=present.map(s=>s.pressAt[0]),span=Math.max(...xs)-Math.min(...xs);if(span>0&&span*k+PRESS>panel.width)k=(panel.width-PRESS)/span;
  const reach=panel.width/(2*k)-48/k,lo=Math.max(...xs)-reach,hi=Math.min(...xs)+reach;cx=lo<=hi?clamp(cx,lo,hi):(Math.min(...xs)+Math.max(...xs))/2;
 }
 const tx=within(panel.width/2-cx*k,panel.width-x1*k,-x0*k),half=PRESS/2/k,geometry=scene.slots.map(s=>slotGeometry(s));
 const top=Math.min(...geometry.map(g=>g.headTop)),bottom=Math.max(...geometry.map(g=>g.press[1]+half)),avail=panel.height-panel.cap-panel.pad;
 const ty=(bottom-top)*k>avail?panel.height-panel.pad-bottom*k:panel.cap+(avail-(bottom-top)*k)/2-top*k;
 return {k,tx,ty:within(ty,panel.height-y1*k,-y0*k)};
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
export function phoneLayouts({width,height,top,nav},count,positions=[]){
 const stageHeight=Math.max(120,height-top-nav),roomPanel={width:width-4,height:stageHeight-4,cap:44,pad:8};
 let virtualHeight=height,board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});
 while(!board.fits&&virtualHeight<1800){virtualHeight+=40;board=turnsLayout({width,height:virtualHeight},count,{bars:{top,nav}});}
 const boardBoxes=Object.fromEntries(Object.entries(board.board.boxes).map(([id,b])=>[id,{...b,top:b.top-top}]));
 const roomFrames=Object.fromEntries(BOARD_ROOMS.map(id=>[id,phoneRoomFrame(id,count,roomPanel,slotsOf(id,count).filter(slot=>positions.some(p=>p.location===LOCATION_OF[id]&&p.slotId===slot.id)))]));
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
 return {read(windowId,make,{dark=true}={}){if(!windowId){saved=null;return make();}if(dark&&saved?.id===windowId)return saved.geometry;const geometry=make();if(geometry)saved={id:windowId,geometry};return geometry;},clear(){saved=null;}};
}

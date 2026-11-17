// In the match: the Settings sheet and Host controls (release 4 of the owner's plan of 16 November 2026, part 8).
// Designer's components, mounted as they are in the phone shell's open sheet: Display settings' Settings sheet
// (#294, sheet 32) when ⋮ opens Settings, and, for the host, Host controls (#295, sheet 15) from its Host controls row.
// The shell connection's hooks place them (#307): `settings(parent)` for the Settings sheet's content, and
// `hostSheet` ({ frame, mount, action, back, close, toast }) for Host controls' sheet while it is open.
//
// One instance of each per match, kept through the renderer's redraws: each redraw empties the sheet's body and asks
// again, and the same element goes back with its state and, where it had it, the focus. The manager keeps this
// phone's own state (the sheet open, its view, the seat it asked a code for, Reveal) and routes each tap to the
// session's existing operations (advance, runBots, issueRecovery, abort, and retry for its own request). It keeps no
// copy of the session's data: the issued code stays the session's, and reaches the page only while revealed.
import {mountSettingsSheet} from '../../../../design/phone-ui/components/display-settings/display-settings.mjs';
import {HOST_WORDS,hostControlsSheet,mountHostControls} from '../../../../design/phone-ui/components/host-controls/host-controls.mjs';
import '../../../../design/phone-ui/components/host-controls/host-controls.css';
import {COPY_REFUSED,createHostUi,hostControlsInput,hostControlsOffered,hostRetrySent,hostSettle,settingsSheetInput} from './pregame-input.mjs';

/**
 * The manager for one match: `settings` and `hostSheet` are the renderer's options; `sync()` follows the session
 * after each of its changes; `rerender()` asks the renderer to draw its open sheet again (settingsChanged()).
 */
export function createMatchSettings({session,preferences,game,win,rerender}){
 const doc=win.document,ui=createHostUi();
 // sent: null, 'asked' (this sheet sent a command) or 'taken' (the session took it up: busy); it settles once free.
 let sheet=null,host=null,disposed=false,toast=null,toastSeq=0,sent=null,frameKey=null;
 const prefs=()=>preferences.state();
 const offered=()=>hostControlsOffered(session.getModel(),game.getModel());
 const settingsInput=()=>settingsSheetInput(prefs(),{host:offered()});
 const hostInput=()=>hostControlsInput(session.getModel(),game.getModel(),ui,{reducedMotion:prefs().reduced});
 const again=()=>{if(!disposed)rerender();};
 const paint=()=>{if(disposed)return;sheet?.update(settingsInput());host?.update(hostInput());};
 const reset=()=>{ui.open=false;ui.view='list';ui.revealed=false;toast=null;};
 const unsubscribe=preferences.subscribe(paint);

 /** The focus a redraw took from a component's control goes back to it once the same element is placed again. */
 const focusOf=new WeakMap();
 function keepFocus(component){
  const root=component.element,state={last:null};
  root.addEventListener('focusin',event=>{state.last=event.target;});
  root.addEventListener('focusout',event=>{if(event.relatedTarget&&!root.contains(event.relatedTarget))state.last=null;});
  focusOf.set(component,state);
 }
 function restoreFocus(component){
  const last=focusOf.get(component)?.last;
  if(last&&last.isConnected&&component.element.contains(last)&&(doc.activeElement===doc.body||doc.activeElement===null))last.focus({preventScroll:true});
 }

 function send(op,action){
  const s=session.getModel();if(!s.matchId)return;
  ui.lastOp=op;sent='asked';void session.operate({...action,matchId:s.matchId});
 }
 const hostHandlers={
  onDeadline:()=>send('advance',{operation:'advance'}),
  onBots:()=>send('runBots',{operation:'runBots'}),
  // The list shows the row in flight; the code's card opens once the session holds the code it issued.
  onIssueRecovery:seat=>{ui.asked={seat};ui.revealed=false;send('issueRecovery',{operation:'issueRecovery',seatId:`seat-${seat}`});},
  onAbortAsk:()=>{ui.view='abort';again();},
 };
 const settingsHandlers={
  onReducedMotion:on=>preferences.setReducedMotion(on),
  onTextScale:scale=>preferences.setTextScale(scale),
  onHostControls:()=>{if(!offered())return;ui.open=true;ui.view='list';ui.revealed=false;again();},
 };

 async function copy(){
  const value=session.getModel().recoveryCode;if(!value)return;
  let copied=false;try{await win.navigator.clipboard.writeText(value);copied=true;}catch{}
  // Refused, the code stays selectable while revealed, and the toast says so (the Lead, 17 November: the lobby's rule).
  if(!disposed&&ui.open){toast=copied?{id:`host-copy-${++toastSeq}`,text:HOST_WORDS.copied,icon:'check'}:{id:`host-copy-${++toastSeq}`,text:COPY_REFUSED,icon:'info'};again();}
 }

 const hostSheet={
  /** Host controls' sheet while open, or null: the Settings sheet then shows. It closes when the host leaves Settings. */
  frame(){
   if(disposed||!ui.open)return null;
   if(game.getModel().panel!=='settings'||!offered()){reset();frameKey=null;return null;}
   const frame=hostControlsSheet(hostInput());frameKey=JSON.stringify(frame);return frame;
  },
  mount(body){
   if(disposed)return;
   const input=hostInput();
   if(!host){host=mountHostControls(body,input,hostHandlers);keepFocus(host);}
   else {body.append(host.element);host.update(input);restoreFocus(host);}
  },
  action(id){
   if(id==='reveal')ui.revealed=true;
   else if(id==='hide')ui.revealed=false;
   else if(id==='copy')void copy();
   else if(id==='keep')ui.view='list';
   else if(id==='abort')send('abort',{operation:'abort'});
   // The session's own request, sent again as it was (today's "Retry original session request"); this sheet's, when it
   // still holds it, settles with its receipt and, for a code, the card.
   else if(id==='retry'){sent=hostRetrySent(ui);void session.retry();}
   paint();
  },
  back(){if(ui.view==='list')ui.open=false;else {ui.view='list';ui.revealed=false;}},
  close(){reset();},
  /** A local toast once: "Copied", or a receipt in the session's own words. */
  toast(){const next=toast;toast=null;return next;},
 };

 return {
  hostSheet,
  /** The Settings sheet's content. */
  settings(parent){
   if(disposed)return;
   const input=settingsInput();
   if(!sheet){sheet=mountSettingsSheet(parent,input,settingsHandlers);keepFocus(sheet);}
   else {parent.append(sheet.element);sheet.update(input);restoreFocus(sheet);}
  },
  /** After each session change: the receipt of what this sheet sent, the issued code's card, then the inputs. */
  sync(){
   if(disposed)return;
   const s=session.getModel();
   if(ui.open&&!offered()){reset();again();return;}
   // A command the session never took up (it sends nothing while busy or uncertain) has no receipt.
   const settled=hostSettle(s,ui,sent);sent=settled.sent;Object.assign(ui,settled.ui);
   if(settled.receipt&&ui.open)toast={id:`host-${++toastSeq}`,...settled.receipt};
   // The code leaves with the session's (hidden, a new request, the viewer away): back to the list.
   if(ui.view==='code'&&!s.recoveryCode&&!s.busy){ui.view='list';ui.revealed=false;}
   paint();
   if(!ui.open)return;
   const next=JSON.stringify(hostControlsSheet(hostInput()));
   if(next!==frameKey||toast)again();
  },
  dispose(){
   if(disposed)return;disposed=true;unsubscribe();sheet?.dispose();host?.dispose();sheet=host=null;
  },
 };
}

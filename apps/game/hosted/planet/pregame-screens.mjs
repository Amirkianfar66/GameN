// The pre-game screens' manager (release 4 of the owner's plan of 16 November 2026): Designer's components,
// mounted as they are, one at a time in the app's root, with their inputs from pregame-input.mjs. It keeps the
// phone's local state (navigation, the drafts, the command it last sent) and routes each intent to the session's
// existing operations or to local navigation. It keeps no copy of the session's data: while the session withholds
// a matched screen's data, the mounted screen stays and is told only its status (G11).
import {mountMainMenu} from '../../../../design/phone-ui/components/main-menu/main-menu.mjs';
import {mountDisplayPage} from '../../../../design/phone-ui/components/display-settings/display-settings.mjs';
import {mountHostSetup} from '../../../../design/phone-ui/components/host-room/host-setup.mjs';
import {mountHostLobby} from '../../../../design/phone-ui/components/host-room/host-lobby.mjs';
import {mountJoinForm} from '../../../../design/phone-ui/components/join-room/join-form.mjs';
import {mountJoinWait} from '../../../../design/phone-ui/components/join-room/join-wait.mjs';
import {mountRecover} from '../../../../design/phone-ui/components/recover/recover.mjs';
import {mountCharacterSelect} from '../../../../design/phone-ui/components/character-select/character-select.mjs';
import {mountRoleStage} from '../../../../design/phone-ui/components/role-stage/role-stage.mjs';
import {mountBoardingStage} from '../../../../design/phone-ui/components/boarding-stage/boarding-stage.mjs';
import {mountMenuSpaceFilm} from '../../../../design/menu-space-film/runtime/layer.mjs';
import {brandSvg} from '../pregame-films/brand/brand.mjs';
import {createPregameUi,pregameScreen,withheldStatus,menuInput,displayInput,hostSetupInput,hostLobbyInput,joinInput,joinRequest,waitInput,recoverInput,
 settleRecovery,charactersInput,roleInput,boardingInput,roomCodeDraft,codeValid} from './pregame-input.mjs';
// Each component's styles, scoped under its own root (they start with the kit's, and the stages' with the shell's).
import '../../../../design/phone-ui/components/main-menu/main-menu.css';
import '../../../../design/phone-ui/components/display-settings/display-settings.css';
import '../../../../design/phone-ui/components/host-room/host-room.css';
import '../../../../design/phone-ui/components/join-room/join-room.css';
import '../../../../design/phone-ui/components/recover/recover.css';
import '../../../../design/phone-ui/components/character-select/character-select.css';
import '../../../../design/phone-ui/components/role-stage/role-card.css';
import '../../../../design/phone-ui/components/role-stage/role-stage.css';
import '../../../../design/phone-ui/components/boarding-stage/boarding-stage.css';
import '../../../../design/menu-space-film/runtime/layer.css';
import './pregame-connection.css';

/** The brand film's moment the menu's hero holds still, as the pack's menu draws it (sheet 10). */
export const HERO_MS=1650;
/** The matched screens: they belong to one match and seat, and stay mounted while its data is withheld. */
const MATCHED=Object.freeze(['host-lobby','join-wait','characters','role','boarding']);
const STAGES=Object.freeze(['characters','role','boarding']);
/** How long "✓ Copied" stays, the lobby toast's own time (entry-parts ENTRY_TOAST_MS). */
const COPIED_MS=2400;

/**
 * The manager: `sync(model)` draws the screen this model asks for and returns true, or disposes what it drew and
 * returns false so the app draws its own view. `hooks.rerender()` asks the app to render again after a local change.
 */
export function createPregameScreens(root,{session,preferences,draft,media,hooks}){
 const document=root.ownerDocument,win=document.defaultView,parser=new win.DOMParser();
 const ui=createPregameUi();
 let mounted=null,menuFilm=null,model=null,disposed=false,copyTimer=null,toastSeq=0,blurred=false;
 const visible=()=>document.visibilityState==='visible'&&!blurred;
 const prefs=()=>preferences.state();
 const rerender=()=>{if(!disposed)hooks.rerender();};
 const op=(name,action)=>{
  ui.lastOp=name;
  ui.operationAttempt++;
  void session.operate(action);
 };
 const go=mode=>{ui.mode=mode;ui.lastOp=null;ui.join.tried=false;rerender();};
 // The session withholds the role on blur, and reveals nothing until Show role; the stages follow the page.
 const onBlur=()=>{blurred=true;rerender();},onFocus=()=>{blurred=false;rerender();};
 win.addEventListener('blur',onBlur);win.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',rerender);
 const unsubscribe=preferences.subscribe(rerender);

 /** The pinned menu for builds without the Night Passage media. */
 function drawHero(menu){
  const hero=menu.hero,{width,height}=hero.getBoundingClientRect();
  if(!(width>0&&height>0))return;
  const key=`${Math.round(width)}x${Math.round(height)}`;if(hero.dataset.drawn===key)return;
  const svg=parser.parseFromString(brandSvg(HERO_MS,{width,height}),'image/svg+xml').documentElement;
  if(svg.localName!=='svg')return;
  svg.classList.add('planet-pregame-hero');hero.replaceChildren(document.importNode(svg,true));hero.dataset.drawn=key;
 }

 async function copyCode(){
  const code=model?.roomCode;if(!code)return;
  let copied=false;try{await win.navigator.clipboard.writeText(code);copied=true;}catch{}
  ui.lobby.copied=copied;ui.lobby.toast=copied?{id:`copy-${++toastSeq}`,text:'Copied',icon:'check'}:{id:`copy-${++toastSeq}`,text:'Select the room code to copy.',icon:'info'};
  if(copyTimer!==null)win.clearTimeout(copyTimer);copyTimer=win.setTimeout(()=>{copyTimer=null;ui.lobby.copied=false;rerender();},COPIED_MS);
  rerender();
 }

 /** Each screen's mount, its input from the model, and its intents. */
 const SCREENS={
  menu:{mount:(host,input)=>{
    const menu=mountMainMenu(host,input,{onJoin:()=>go('join'),onHost:()=>go('host'),onRecover:()=>go('recover'),onSettings:()=>go('display'),
     onLayout:media?undefined:()=>drawHero(menu)});
    if(media){
     menu.element.dataset.menuSpaceFilm='';
     menu.element.setAttribute('aria-label','Game N');
     menuFilm=mountMenuSpaceFilm(menu.hero,media);
    }else win.requestAnimationFrame(()=>{if(!disposed&&mounted?.view===menu)drawHero(menu);});
    return menu;
   },
   input:m=>menuInput(m,ui,prefs())},
  display:{mount:(host,input)=>mountDisplayPage(host,input,{onReducedMotion:on=>preferences.setReducedMotion(on),onTextScale:scale=>preferences.setTextScale(scale),onBack:()=>go('menu')}),
   input:()=>displayInput(prefs())},
  'host-setup':{mount:(host,input)=>mountHostSetup(host,input,{onBack:()=>go('menu'),onCount:value=>{ui.hostCount=value;rerender();},
    onOpen:count=>op('create',{operation:'create',playerCount:count})}),
   input:m=>hostSetupInput(m,ui,prefs())},
  'host-lobby':{mount:(host,input)=>mountHostLobby(host,input,{
    // G6: there is no command for a host to leave or close a lobby, so the input draws Leave unavailable and no
    // handler is given for it.
    onCopy:()=>void copyCode(),
    onAdmit:id=>op(`approveAdmission:${id}`,{operation:'approveAdmission',matchId:model.matchId,admissionId:id}),
    onBots:count=>op('setBots',{operation:'setBots',matchId:model.matchId,count}),
    onStart:()=>op('beginSetup',{operation:'beginSetup',matchId:model.matchId})}),
   input:m=>hostLobbyInput(m,ui,prefs())},
  join:{mount:(host,input)=>{const form=mountJoinForm(host,input,{onBack:()=>go('menu'),
    onCode:text=>{draft.roomCode=roomCodeDraft(text);rerender();},onName:text=>{draft.displayName=text;rerender();},onDevice:kind=>{draft.kind=kind==='display'?'display':'player';rerender();},
    onAsk:()=>{const request=joinRequest(draft);if(!request){ui.join.tried=true;rerender();if(!codeValid(roomCodeDraft(draft.roomCode)))form.focus('code');else form.focus('name');return;}
     op('requestAdmission',request);}});return form;},
   input:m=>joinInput(m,ui,draft,prefs())},
  'join-wait':{mount:(host,input)=>mountJoinWait(host,input,{
    // G6: there is no command to withdraw a request or leave an admitted lobby, and the request lives in the
    // session until it settles, so Back to menu can't drop it either. The input draws Cancel, Leave and Back to
    // menu unavailable, and no handler is given for them.
    onCheck:()=>void session.refresh()}),
   input:m=>waitInput(m,ui,draft,prefs())},
  recover:{mount:(host,input)=>mountRecover(host,input,{onBack:()=>go('menu'),onMatchId:text=>{ui.recover.matchId=String(text);rerender();},onCode:({length})=>{ui.recover.codeLength=length;rerender();},
    onRecover:({matchId,recoveryCode})=>{
     // The code goes straight into the command; this connection keeps no copy of it.
     const id=String(matchId).trim();hooks.beforeRecover();ui.recover.pending=id;op('redeemRecovery',{operation:'redeemRecovery',matchId:id,recoveryCode});},
    onContinue:()=>{ui.recover.recovered=null;ui.recover.matchId='';ui.recover.codeLength=0;ui.mode='menu';ui.lastOp=null;rerender();}}),
   input:m=>recoverInput(m,ui,prefs())},
  characters:{mount:(host,input)=>mountCharacterSelect(host,input,{onChoose:id=>{ui.choosing=id;op('chooseCharacter',{operation:'chooseCharacter',matchId:model.matchId,characterId:id});},
    onRetry:()=>void session.refresh()}),
   input:m=>charactersInput(m,ui,prefs(),{visible:visible()})},
  role:{mount:(host,input)=>mountRoleStage(host,input,{onShowRole:()=>session.revealRole(true),onReady:()=>op('ready',{operation:'ready',matchId:model.matchId}),
    onRetry:()=>void session.refresh()}),
   input:m=>roleInput(m,ui,prefs(),{visible:visible()})},
  boarding:{mount:(host,input)=>mountBoardingStage(host,input,{onSkip:hooks.skipBoarding,onRetry:()=>void session.refresh()}),
   input:m=>boardingInput(m,prefs(),{visible:visible(),playing:hooks.boardingPlaying()})},
 };

 function unmount(){
  if(!mounted)return;const was=mounted;mounted=null;
  menuFilm?.dispose();menuFilm=null;
  if(was.screen==='recover')ui.recover.codeLength=0;
  try{was.view.dispose();}finally{was.host.remove();if(!root.querySelector('.planet-pregame-host'))root.classList.remove('planet-pregame');}
 }

 function draw(screen,input){
  const key=`${screen}|${model.matchId??''}|${model.selfSeatId??''}`,inputKey=JSON.stringify(input);
  if(mounted?.key!==key){
   unmount();root.className='planet-pregame';root.removeAttribute('data-setup-status');root.replaceChildren();
   const host=document.createElement('div');host.className='planet-pregame-host';host.dataset.screen=screen;root.append(host);
   const view=SCREENS[screen].mount(host,input);mounted={key,screen,host,view,inputKey,matchId:model.matchId};return;
  }
  if(mounted.inputKey!==inputKey){mounted.inputKey=inputKey;mounted.view.update(input);}
 }

 return {
  ui,
  /** Draw the screen this model asks for, or return false for the app's own view. */
  sync(next,{boardingEnded=false}={}){
   if(disposed)return false;model=next;
   ui.recover=settleRecovery(model,ui);
   if(ui.choosing&&!model.busy)ui.choosing=null;
   const screen=pregameScreen(model,ui);
   // Every input says it takes taps, so a screen refused while withheld takes them again once the data returns.
   if(screen){draw(screen,{interactive:true,...SCREENS[screen].input(model)});return true;}
   // A matched screen stays while its data is withheld, told only its status; anything else is the app's.
   const withheld=mounted&&MATCHED.includes(mounted.screen)&&mounted.matchId===model.matchId?withheldStatus(model,{visible:visible()}):null;
   if(withheld){
    const status=STAGES.includes(mounted.screen)?{status:withheld}:{interactive:false};
    if(mounted.screen==='boarding'){
     // A withheld read cannot support a countdown, even on the retained screen.
     status.clock=null;
     if(boardingEnded)Object.assign(status,{view:'holding',skip:null});
    }
    const inputKey=JSON.stringify(status);if(mounted.inputKey!==inputKey){mounted.inputKey=inputKey;mounted.view.update(status);}
    return true;
   }
   unmount();return false;
  },
  syncMenuFilm(allowPlayback){menuFilm?.update({visible:allowPlayback&&visible(),reduced:prefs().reduced});},
  get boardingFilm(){return mounted?.screen==='boarding'?mounted.view.film:null;},
  get screen(){return mounted?.screen??null;},
  dispose(){
   if(disposed)return;disposed=true;unsubscribe();win.removeEventListener('blur',onBlur);win.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',rerender);
   if(copyTimer!==null)win.clearTimeout(copyTimer);unmount();
  },
 };
}

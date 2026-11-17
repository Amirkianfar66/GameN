import {setCrewPictureSurface} from '../crew-runtime.mjs';
import {createPlanetSession,createPlanetController,createPlanetPregame,readFoodRecovery} from '@mothership/game';
import {planetHasLibraryArt,planetHasFood} from '@mothership/presentation';
import {loadArt} from '../art.mjs';
import {mountPlanetRenderer} from './render.mjs';
import {createPlanetLibraryAssets} from './art.mjs';
import {PLANET_LIBRARY_MEDIA} from './library-assets.mjs';
import {mountPregamePresentation} from './pregame.mjs';
import {createPlanetPreferences} from './preferences.mjs';
import {mountFoodApp,mountFoodPublic} from './food-app.mjs';
import {createFoodAssets} from './food-assets.mjs';
import {labelPhoneControl} from './phone-controls.mjs';
// BEGIN pre-game connection (release 4 of the owner's plan of 16 November 2026): Designer's pre-game components.
import {createPregameScreens} from './pregame-screens.mjs';
// END pre-game connection
import '../comic-tokens.css';
import '../comic.css';
import '../comic-layout.css';
import '../claude-phone-kit.css';
import '../board-v2.css';
import './planet.css';
import '../crew-runtime.css';
import './phone.css';
// The room view's room scene (design/phone-ui/components/room-scene): its styles, scoped under .ms-room-scene.
import '../../../../design/phone-ui/components/room-scene/room-scene.css';
// The match's frame, Designer's phone shell (design/phone-ui/components/phone-shell): its styles and the kit's, scoped under .ms-phone-shell.
import '../../../../design/phone-ui/components/phone-shell/phone-shell.css';

/** Both production and the explicit development harness mount this same consumer. */
export async function mountPlanetApp(root,{connection,matchId,allowSynthetic=false,ports:injectedPorts=null,stores:injectedStores=null}={}){
 if(!connection||connection.mode==='synthetic'&&!allowSynthetic)throw new TypeError('An authenticated Planet connection is required');
 const document=root.ownerDocument,win=document.defaultView;
 const store=key=>({load:()=>win.sessionStorage.getItem(key),save:value=>win.sessionStorage.setItem(key,value),clear:()=>win.sessionStorage.removeItem(key)});
 const ports=injectedPorts??{clock:{now:()=>win.performance.now()},scheduler:{setTimeout:(f,ms)=>win.setTimeout(f,ms),clearTimeout:h=>win.clearTimeout(h)},ids:{next:()=>win.crypto.randomUUID()},unresolved:store('mothership:planet:command')};
 const stores=injectedStores??{resume:store('mothership:planet:resume'),requests:store('mothership:planet:requests'),rolePrivacy:store('mothership:planet:role-privacy')};
 const session=createPlanetSession(connection,ports,stores);
 let recoveringEntry=true;
 try{recoveringEntry=!!matchId||stores.resume.load()!==null||stores.requests.load()!==null||ports.unresolved.load()!==null;}catch{}
 const preferences=createPlanetPreferences(document),pregame=createPlanetPregame(ports.clock,store('mothership:planet:films-seen'),{skipEntry:recoveringEntry,skipRoleOnEntry:recoveringEntry});
 const presentation=mountPregamePresentation(root,pregame,{preferences:preferences.get});
 const libraryAssets=createPlanetLibraryAssets(document);
 // Uniform art loading never holds admission, recovery, Ready eligibility or the server clock.
 const commonArt=loadArt('player',document).catch(()=>{});
 let game=null,renderer=null,gameRoot=null,terminalReturn=null,key=null,model=null,disposed=false,hostOpen=false,abortConfirm=false,unsubscribe=null,roleOpen=false,lastStatus=null,sessionKey=null;
 let setupSettings=false,recoveryShown=false,hostState=null,food=null,foodPublic=null,foodAssets=null;
 const entryDraft={roomCode:'',displayName:'',kind:'player'};
 // BEGIN pre-game connection: the menu, Display settings, host, join, recover, characters, the role stage and boarding.
 const screens=createPregameScreens(root,{session,preferences,draft:entryDraft,hooks:{
  rerender:()=>{sessionKey=null;if(model)render(session.getModel());},
  // As today's recovery form did: no role film replays for a recovered seat.
  beforeRecover:()=>{pregame.suppressRolePlayback();presentation.clear();}}});
 // END pre-game connection
 const el=(tag,text=null)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;return n;};
 const button=(label,run)=>{const b=el('button',label);b.type='button';b.addEventListener('click',run);return b;};
 const operate=action=>void session.operate(action);
 const foodPending=()=>!!food&&(food.controller.getModel().pendingCount>0||food.controller.getModel().recoveryBlocked);
 const foodBinding=()=>({uid:connection.currentUid(),matchId:model.matchId,seatId:model.selfSeatId});
 const foodRecoveryStore=binding=>stores.food?.(binding)??store(`mothership:planet:food:${JSON.stringify([binding.uid,binding.matchId,binding.seatId])}`);
 const hasSavedFood=()=>{if(!planetHasFood(model?.versions)||!model.selfSeatId)return false;const binding=foodBinding();try{const raw=foodRecoveryStore(binding).load();return raw!==null&&readFoodRecovery(raw,binding).entries.length>0;}catch{return true;}};
 const hasCommandRecovery=()=>{try{return foodPending()||hasSavedFood()||ports.unresolved.load()!==null||!!game?.getModel().recovery||game?.getModel().action?.step==='sending';}catch{return true;}};
 const canReturnToLobby=()=>{const s=session.getModel(),g=game?.getModel();return !foodPending()&&s.canReturnToLobby&&(!g||g.connection==='live'&&!g.concealed&&g.phase?.trusted&&!g.recovery&&g.action?.step!=='sending');};
 function returnButton(){const b=button('Return to lobby',()=>{if(!canReturnToLobby())return;screens.ui.mode='menu';hostOpen=false;abortConfirm=false;roleOpen=false;Object.assign(entryDraft,{roomCode:'',displayName:'',kind:'player'});try{food?.recovery.clear();}catch{return;}session.returnToLobby();});b.id='planet-return-lobby';b.className='planet-return-lobby';return b;}
 function lobbyView(){
  root.className='planet-setup';root.replaceChildren();
  root.dataset.setupStatus=model.status??'entry';
  const heading=el('h1',model.status==='choosing'?'Choose your character':model.status==='reading'?'Your role':model.matchId?'Lobby':'Mothership'),top=el('header');top.className='planet-setup-top';
  const settings=labelPhoneControl(button('Settings',()=>{setupSettings=!setupSettings;sessionKey=null;render(model);}), 'Settings','settings');settings.id='planet-setup-settings';settings.setAttribute('aria-expanded',String(setupSettings));top.append(heading,settings);root.append(top);
  if(setupSettings){const panel=el('section');panel.className='planet-setup-settings';preferences.controls(panel);if(model.isHost&&model.status!=='lobby')hostControls(panel);root.append(panel);}
  const status=el('p',model.message??(model.connection==='connecting'?'Connecting…':''));status.setAttribute('role','status');status.hidden=!status.textContent;root.append(status);
  if(model.uncertain){const retry=button('Retry original session request',()=>void session.retry());retry.disabled=model.busy;root.append(retry);return;}
  if(model.connection!=='live'){root.append(button('Reconnect',()=>void session.refresh()));return;}
  // Release 4: with no match, the pre-game screens draw the menu and its four screens (pregame-screens.mjs).
  if(!model.matchId)return;
  if(model.status==='lobby'){
   const roomCode=el('section');roomCode.className='planet-room-code';const text=el('strong',model.roomCode??'…'),feedback=el('span');feedback.setAttribute('role','status');feedback.id='planet-copy-status';
   const copy=button('Copy room code',async()=>{try{await win.navigator.clipboard.writeText(model.roomCode);feedback.textContent='Copied';copy.textContent='Copied ✓';}catch{feedback.textContent='Select the room code to copy.';const range=document.createRange();range.selectNodeContents(text);win.getSelection()?.removeAllRanges();win.getSelection()?.addRange(range);}});copy.id='planet-copy-room-code';roomCode.append(el('small','Room code'),text,copy,feedback);root.append(roomCode);
  }
  // Release 4: a seated phone's choosing and reading are the pre-game screens' (character selection, the role stage).
  if(model.status==='boarding'){
   root.append(el('h2','Boarding'),el('p','The crew is boarding. The match will begin when the server confirms it.'));
  }else if(model.status==='aborted'){
   root.append(el('h2','Match aborted · No winner'));
   if(canReturnToLobby())root.append(returnButton());
   else if(foodPending()){const recovery=food.controller.getModel(),check=button('Check original receipt',async()=>{await food?.controller.checkReceipts();sessionKey=null;render(session.getModel());});check.id='planet-terminal-food-receipts';check.disabled=!recovery.canCheck;root.append(el('p',recovery.message??'The previous Food input still needs its original receipt.'),check);}
   else if(game){const recovery=game.getModel(),check=button('Check original receipt',async()=>{await game?.checkReceipt();sessionKey=null;render(session.getModel());});check.id='planet-terminal-check-receipt';check.disabled=!recovery.recovery?.canCheck;root.append(el('p',recovery.message??'The previous command still needs its original receipt.'),check);}
  }
  else root.append(el('p',model.isHost?'Host lobby':'Waiting for admission or the next stage.'));
  const roster=el('ul');for(const member of model.members)roster.append(el('li',`Player ${member.seatId.slice(5)} · ${member.displayName}${member.controller==='bot'?' · Bot':''}${member.ready?' · Ready':''}`));if(['reading','lobby'].includes(model.status)){const details=el('details');details.append(el('summary',model.status==='reading'?`${model.members.filter(m=>m.ready).length} of ${model.playerCount} players ready`:`${model.members.length} of ${model.playerCount} seats filled`),roster);root.append(details);}
  const timer=el('p');timer.id='planet-setup-timer';root.append(timer);updateTimer();
 }
 function hostControls(parent){
  if(model.uncertain){const status=el('p',model.message),retry=button('Retry original session request',()=>void session.retry());status.setAttribute('role','status');retry.disabled=model.busy;parent.append(status,retry);return;}
  for(const admission of model.pendingAdmissions)parent.append(button(`Admit ${admission.displayName} (${admission.kind})`,()=>operate({operation:'approveAdmission',matchId:model.matchId,admissionId:admission.id})));
  if(['running','reading','choosing','boarding'].includes(model.status)){
   parent.append(button('Check server deadline',()=>operate({operation:'advance',matchId:model.matchId})),button('Run eligible bots',()=>operate({operation:'runBots',matchId:model.matchId})));
   const end=button(abortConfirm?'Confirm abort · No winner':'Abort match',()=>{if(!abortConfirm){abortConfirm=true;sessionKey=null;render(model);}else {abortConfirm=false;operate({operation:'abort',matchId:model.matchId});}});parent.append(end);
  }
  if(['running','reading','choosing','boarding'].includes(model.status))for(const member of model.members.filter(m=>m.controller==='human'))parent.append(button(`Issue recovery for Player ${member.seatId.slice(5)}`,()=>operate({operation:'issueRecovery',matchId:model.matchId,seatId:member.seatId})));
  if(model.recoveryCode){const recovery=el('section');recovery.className='planet-recovery-secret';recovery.setAttribute('aria-label','Private seat recovery');const match=el('p',`Match ID: ${model.matchId}`);match.id='planet-issued-match-id';recovery.append(match,button(recoveryShown?'Hide recovery code':'Reveal recovery code',()=>{recoveryShown=!recoveryShown;sessionKey=null;renderer?.settingsChanged();if(!game)render(model);}));if(recoveryShown){const code=el('p',model.recoveryCode);code.id='planet-issued-recovery-code';recovery.append(code);}parent.append(recovery);}
 }
 function updateTimer(){const t=document.getElementById('planet-setup-timer');if(t)t.textContent=model.remainingMs===null?'':model.status==='reading'?model.remainingMs>0?model.setupFlowVersion===3&&model.setupClock.status==='synced'?`${model.setupClock.serverNowMs<model.setup.roleFilmStartsAt?'Role card':'Role film'} · ${Math.ceil(model.remainingMs/1000)}s`:`Read for ${Math.ceil(model.remainingMs/1000)}s`:'Ready when you are':`${Math.ceil(model.remainingMs/1000)}s`;}
 function disposeGame(){food?.dispose();food=null;foodPublic?.dispose();foodPublic=null;renderer?.dispose();renderer=null;game?.dispose();game=null;terminalReturn=null;}
 function connectFood(surface){
  if(!planetHasFood(model.versions))return;
  if(surface==='display'){const host=el('div');gameRoot.append(host);foodPublic=mountFoodPublic(host,game);return;}
  const binding=foodBinding(),recovery=foodRecoveryStore(binding);
  food=mountFoodApp(gameRoot,{session,game,transport:session.gameTransport(surface),binding,ports,recovery,assets:foodAssets,preferences:preferences.get,
   renderer:renderer??{navigate(){},foodSurface(){},get view(){return 'room';},bars(){return {top:0,bottom:0};}}});
 }
 function render(next){
  if(disposed)return;model=next;if(planetHasFood(model.versions)&&!foodAssets){foodAssets=createFoodAssets(document);void foodAssets.load();}setCrewPictureSurface(root,model.versions);libraryAssets.setVersions(model.versions);
  if(!model.ownRole)roleOpen=false;
  pregame.update(model,{visible:document.visibilityState==='visible',focused:document.hasFocus(),uid:connection.currentUid()});presentation.sync();
  if(terminalReturn)terminalReturn.hidden=!canReturnToLobby();
  const running=['running','finished'].includes(model.status),surface=model.selfSeatId?'player':'display';
  // BEGIN pre-game connection: a pre-game screen, when the model asks for one, takes the root.
  if(screens.sync(model)){if(key&&!running){disposeGame();key=null;}lastStatus=model.status;sessionKey=null;return;}
  // END pre-game connection
  if(running){
   const nextKey=`${model.matchId}:${surface}:${model.selfSeatId}${planetHasFood(model.versions)?`:${connection.currentUid()}`:''}`;
   if(key!==nextKey){
    disposeGame();root.className='planet-container';root.replaceChildren();gameRoot=el('div');root.append(gameRoot);key=nextKey;
    game=createPlanetController(session.gameTransport(surface),ports,{matchId:model.matchId,surface});terminalReturn=returnButton();terminalReturn.hidden=true;
    // The shell's Retry reads the session again at once, as the lobby's Reconnect does.
    renderer=mountPlanetRenderer(gameRoot,game,{cinematics:planetHasLibraryArt(model.versions)?PLANET_LIBRARY_MEDIA:[],terminalAction:terminalReturn,reconnect:()=>void session.refresh(),
     food:planetHasFood(model.versions)?{openTasks:()=>food?.openTasks()}:null,
     settings:parent=>{preferences.controls(parent);if(model.isHost&&!game?.getModel().dark)hostControls(parent);}});
    connectFood(surface);void game.start();
   }
   food?.refresh();
   const nextHostState=JSON.stringify([model.isHost,model.busy,model.uncertain,model.recoveryCode,model.pendingAdmissions,model.status,abortConfirm]);if(nextHostState!==hostState){hostState=nextHostState;recoveryShown=false;renderer?.settingsChanged();}return;
  }
  // A stale/hidden session does not discard a command's controller or recovery identifiers.
  if(game&&renderer&&(model.connection!=='live'||model.status===null&&model.matchId!==null)){root.querySelector('.planet-host-menu')?.remove();return;}
  if(model.status==='aborted'&&hasCommandRecovery()){
   // An abort closes gameplay, but the original command receipt remains readable.
   // Keep its controller, or reconstruct it from UID-bound identifiers after reload.
   food?.detach();foodPublic?.dispose();foodPublic=null;renderer?.dispose();renderer=null;terminalReturn=null;
   if(!game){key=`${model.matchId}:${surface}:${model.selfSeatId}`;gameRoot=el('div');game=createPlanetController(session.gameTransport(surface),ports,{matchId:model.matchId,surface});connectFood(surface);food?.detach();void game.start();}
  }else if(key){disposeGame();key=null;}
  if(lastStatus!==model.status){roleOpen=false;lastStatus=model.status;}
  const nextSessionKey=JSON.stringify({...model,remainingMs:null,setupClock:null,canChoose:model.canChoose,canReady:model.canReady,commandRecovery:game?.getModel().recovery,commandMessage:game?.getModel().message,foodRecovery:food?.controller.getModel().pendingCount,foodMessage:food?.controller.getModel().message});
  if(sessionKey!==nextSessionKey){const focus=document.activeElement?.id;sessionKey=nextSessionKey;lobbyView();if(focus)document.getElementById(focus)?.focus({preventScroll:true});}updateTimer();
 }
 const visibility=()=>{const visible=document.visibilityState==='visible';food?.setVisible(visible);session.setVisible(visible&&(document.hasFocus()||!!food));if(!visible)roleOpen=false;};
 const artReady=()=>{sessionKey=null;if(model)render(session.getModel());};
 const concealRole=()=>{roleOpen=false;recoveryShown=false;setupSettings=false;food?.setVisible(false);session.setVisible(false);presentation.clear();};
 document.addEventListener('visibilitychange',visibility);document.addEventListener('mothership:art-ready',artReady);win.addEventListener('blur',concealRole);win.addEventListener('focus',visibility);unsubscribe=session.subscribe(render);session.setVisible(document.visibilityState==='visible');await session.start(matchId);
 return {session,artReady:Promise.all([commonArt,libraryAssets.ready,foodAssets?.load()]),get game(){return game;},get food(){return food?.controller??null;},get presentationStats(){return presentation.stats},dispose(){disposed=true;unsubscribe?.();screens.dispose();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('mothership:art-ready',artReady);win.removeEventListener('blur',concealRole);win.removeEventListener('focus',visibility);presentation.dispose();pregame.dispose();preferences.dispose();disposeGame();session.dispose();libraryAssets.dispose();foodAssets?.dispose();void connection.dispose?.();delete root.dataset.crewArt;root.replaceChildren();}};
}

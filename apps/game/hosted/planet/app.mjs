import {crewPortraitVariable,setCrewPictureSurface} from '../crew-runtime.mjs';
import {createPlanetSession,createPlanetController,createPlanetPregame} from '@mothership/game';
import {planetRoleLook,planetHasLibraryArt} from '@mothership/presentation';
import {CrewDisplayNameSchema,CREW_NAME_MAX_LENGTH} from '@mothership/contracts';
import {loadArt} from '../art.mjs';
import {mountPlanetRenderer} from './render.mjs';
import {createPlanetLibraryAssets} from './art.mjs';
import {PLANET_LIBRARY_MEDIA} from './library-assets.mjs';
import {mountPregamePresentation} from './pregame.mjs';
import {createPlanetPreferences} from './preferences.mjs';
import {CREW} from '../crew-drawing/crew.mjs';
import {labelPhoneControl} from './phone-controls.mjs';
import '../comic-tokens.css';
import '../comic.css';
import '../comic-layout.css';
import '../claude-phone-kit.css';
import '../board-v2.css';
import './planet.css';
import '../crew-runtime.css';
import './phone.css';

/** Both production and the explicit development harness mount this same consumer. */
export async function mountPlanetApp(root,{connection,matchId,allowSynthetic=false,ports:injectedPorts=null,stores:injectedStores=null}={}){
 if(!connection||connection.mode==='synthetic'&&!allowSynthetic)throw new TypeError('An authenticated Planet connection is required');
 const document=root.ownerDocument,win=document.defaultView;
 const store=key=>({load:()=>win.sessionStorage.getItem(key),save:value=>win.sessionStorage.setItem(key,value),clear:()=>win.sessionStorage.removeItem(key)});
 const ports=injectedPorts??{clock:{now:()=>win.performance.now()},scheduler:{setTimeout:(f,ms)=>win.setTimeout(f,ms),clearTimeout:h=>win.clearTimeout(h)},ids:{next:()=>win.crypto.randomUUID()},unresolved:store('mothership:planet:command')};
 const stores=injectedStores??{resume:store('mothership:planet:resume'),requests:store('mothership:planet:requests')};
 const session=createPlanetSession(connection,ports,stores);
 let recoveringEntry=true;
 try{recoveringEntry=!!matchId||stores.resume.load()!==null||stores.requests.load()!==null||ports.unresolved.load()!==null;}catch{}
 const preferences=createPlanetPreferences(document),pregame=createPlanetPregame(ports.clock,store('mothership:planet:films-seen'),{skipEntry:recoveringEntry,skipRoleOnEntry:recoveringEntry});
 const presentation=mountPregamePresentation(root,pregame,{preferences:preferences.get});
 const libraryAssets=createPlanetLibraryAssets(document);
 // Uniform art loading never holds admission, recovery, Ready eligibility or the server clock.
 const commonArt=loadArt('player',document).catch(()=>{});
 let game=null,renderer=null,gameRoot=null,terminalReturn=null,key=null,model=null,disposed=false,hostOpen=false,abortConfirm=false,unsubscribe=null,roleOpen=false,lastStatus=null,sessionKey=null,entryMode='join';
 let setupSettings=false,recoveryShown=false,hostState=null;
 const entryDraft={roomCode:'',displayName:'',kind:'player'};
 const el=(tag,text=null)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;return n;};
 const button=(label,run)=>{const b=el('button',label);b.type='button';b.addEventListener('click',run);return b;};
 const operate=action=>void session.operate(action);
 const hasCommandRecovery=()=>{try{return ports.unresolved.load()!==null||!!game?.getModel().recovery||game?.getModel().action?.step==='sending';}catch{return true;}};
 const canReturnToLobby=()=>{const s=session.getModel(),g=game?.getModel();return s.canReturnToLobby&&(!g||g.connection==='live'&&!g.concealed&&g.phase?.trusted&&!g.recovery&&g.action?.step!=='sending');};
 function returnButton(){const b=button('Return to lobby',()=>{if(!canReturnToLobby())return;entryMode='join';hostOpen=false;abortConfirm=false;roleOpen=false;Object.assign(entryDraft,{roomCode:'',displayName:'',kind:'player'});session.returnToLobby();});b.id='planet-return-lobby';b.className='planet-return-lobby';return b;}
 function createRoleCard(value,own){
  const look=planetRoleLook(value.role,value.faction),card=el('article');card.className='ms-role-card ms-role-card--full';card.dataset.device=look.device??'';card.dataset.team=value.faction.toLowerCase();
  if(own?.characterId){card.dataset.character=own.characterId;card.style.setProperty('--ms-role-person',crewPortraitVariable(own.characterId,model.versions));}
  if(look.device)card.style.setProperty('--ms-role-device',`var(--ms-asset-device-${look.device}-held)`);
  else if(value.role==='Engineer'&&(document.documentElement.dataset.art??'').split(' ').includes('successor')){card.dataset.device='engineer';card.style.setProperty('--ms-role-device','var(--sw-asset-sw-device-engineer)');}
  const art=el('span');art.className='ms-role-card__art';art.setAttribute('aria-hidden','true');const text=el('div');text.className='ms-role-card__text';text.append(el('h2',look.name),el('p',`${look.faction} team`));card.append(art,text,el('p',look.guide));
  if(value.knowledge.insiderSeatIds.length)card.append(el('p',`Unmapped trio: ${[...value.knowledge.insiderSeatIds].sort().map(id=>`Player ${id.slice(5)}`).join(', ')}.`));
  if(value.knowledge.knownUndercoverSeatId)card.append(el('p',`Undercover: Player ${value.knowledge.knownUndercoverSeatId.slice(5)}.`));return card;
 }
 function lobbyView(){
  root.className='planet-setup';root.replaceChildren();
  root.dataset.setupStatus=model.status??'entry';
  const heading=el('h1',model.status==='choosing'?'Choose your character':model.status==='reading'?'Your role':model.matchId?'Lobby':'Mothership'),top=el('header');top.className='planet-setup-top';
  const settings=labelPhoneControl(button('Settings',()=>{setupSettings=!setupSettings;sessionKey=null;render(model);}), 'Settings','settings');settings.id='planet-setup-settings';settings.setAttribute('aria-expanded',String(setupSettings));top.append(heading,settings);root.append(top);
  if(setupSettings){const panel=el('section');panel.className='planet-setup-settings';preferences.controls(panel);if(model.isHost&&model.status!=='lobby')hostControls(panel);root.append(panel);}
  const status=el('p',model.message??(model.connection==='connecting'?'Connecting…':''));status.setAttribute('role','status');status.hidden=!status.textContent;root.append(status);
  if(model.uncertain){const retry=button('Retry original session request',()=>void session.retry());retry.disabled=model.busy;root.append(retry);return;}
  if(model.pendingAdmission){
   const state=model.pendingAdmission.status,denied=state==='closed'||state==='declined';status.textContent=model.connection==='error'?model.message:state==='closed'?'Request closed.':state==='declined'?'Request declined.':'Request registered.';root.append(el('h2',`Room ${model.pendingAdmission.roomCode}`),el('p',`Requested ${model.pendingAdmission.kind==='display'?'shared display':'player seat'}. ${denied?'This request was not admitted.':'Waiting for the server to confirm admission.'}`));
   const check=button('Check admission',()=>void session.refresh());check.id='planet-check-admission';root.append(check);return;
  }
  if(model.connection!=='live'){root.append(button('Reconnect',()=>void session.refresh()));return;}
  if(!model.matchId){
   const tabs=el('nav');tabs.className='planet-entry-tabs';tabs.setAttribute('aria-label','Enter a match');
   for(const [value,label]of [['join','Join'],['host','Host'],['recover','Recover']]){const tab=button(label,()=>{entryMode=value;sessionKey=null;render(model);});tab.id=`planet-entry-${value}`;tab.setAttribute('aria-pressed',String(entryMode===value));tabs.append(tab);}root.append(tabs);
   const create=el('form'),count=el('select');count.id='planet-player-count';for(const n of [7,8,9]){const o=el('option',`${n} players`);o.value=String(n);count.append(o);}
   const countLabel=el('label','Players');countLabel.htmlFor=count.id;create.append(countLabel,count);const host=el('button','Host a game');host.id='planet-create';host.disabled=model.busy;create.append(host);create.hidden=entryMode!=='host';create.addEventListener('submit',e=>{e.preventDefault();operate({operation:'create',playerCount:Number(count.value)});});root.append(create);
   const join=el('form'),room=el('input'),name=el('input'),kind=el('select');room.id='planet-room-code';room.autocomplete='off';room.maxLength=6;room.required=true;room.pattern='[A-Za-z0-9]{6}';name.id='planet-display-name';name.maxLength=CREW_NAME_MAX_LENGTH*2;name.required=true;name.autocomplete='nickname';
   for(const [text,input]of [['Room code',room],['Your name',name]]){const label=el('label',text);label.htmlFor=input.id;join.append(label,input);}
   room.className='planet-code-input';room.inputMode='text';room.autocapitalize='characters';room.spellcheck=false;
   const nameHint=el('p',`0 / ${CREW_NAME_MAX_LENGTH}`);nameHint.id='planet-name-hint';nameHint.setAttribute('role','status');name.setAttribute('aria-describedby',nameHint.id);join.append(nameHint);
   room.value=entryDraft.roomCode;name.value=entryDraft.displayName;room.addEventListener('input',()=>{entryDraft.roomCode=room.value;});name.addEventListener('input',()=>{entryDraft.displayName=name.value;});
   const validateName=()=>{const value=name.value.trim(),valid=CrewDisplayNameSchema.safeParse(value).success;name.setCustomValidity(valid?'':`Enter a name of 1–${CREW_NAME_MAX_LENGTH} characters without control characters.`);name.setAttribute('aria-invalid',String(!valid));nameHint.textContent=valid?`${[...value].length} / ${CREW_NAME_MAX_LENGTH} characters`:name.validationMessage;return valid;};
   name.addEventListener('input',validateName);
   kind.id='planet-join-kind';for(const value of ['player','display']){const o=el('option',value==='player'?'Player phone':'Shared display');o.value=value;kind.append(o);}kind.value=entryDraft.kind;kind.addEventListener('change',()=>{entryDraft.kind=kind.value;});const kindLabel=el('label','Device');kindLabel.htmlFor=kind.id;join.append(kindLabel,kind);const submit=el('button','Request admission');submit.id='planet-join';submit.disabled=model.busy;join.append(submit);join.hidden=entryMode!=='join';join.addEventListener('submit',e=>{e.preventDefault();if(!validateName()){name.reportValidity();return;}operate({operation:'requestAdmission',roomCode:room.value.trim().toUpperCase(),kind:kind.value,displayName:name.value.trim()});});root.append(join);
   const recover=el('section');recover.hidden=entryMode!=='recover';recover.setAttribute('aria-label','Recover a player seat');const form=el('form'),id=el('input'),token=el('input');id.id='planet-recovery-match';id.required=true;token.id='planet-recovery-code';token.type='password';token.required=true;token.autocomplete='off';for(const [text,input]of [['Match ID',id],['Recovery code',token]]){const label=el('label',text);label.htmlFor=input.id;form.append(label,input);}form.append(el('button','Recover seat'));form.addEventListener('submit',e=>{e.preventDefault();const recoveryCode=token.value;token.value='';pregame.suppressRolePlayback();presentation.clear();operate({operation:'redeemRecovery',matchId:id.value.trim(),recoveryCode});});recover.append(form);root.append(recover);return;
  }
  if(model.status==='lobby'){
   const roomCode=el('section');roomCode.className='planet-room-code';const text=el('strong',model.roomCode??'…'),feedback=el('span');feedback.setAttribute('role','status');feedback.id='planet-copy-status';
   const copy=button('Copy room code',async()=>{try{await win.navigator.clipboard.writeText(model.roomCode);feedback.textContent='Copied';copy.textContent='Copied ✓';}catch{feedback.textContent='Select the room code to copy.';const range=document.createRange();range.selectNodeContents(text);win.getSelection()?.removeAllRanges();win.getSelection()?.addRange(range);}});copy.id='planet-copy-room-code';roomCode.append(el('small','Room code'),text,copy,feedback);root.append(roomCode);
  }
  const own=model.members.find(m=>m.seatId===model.selfSeatId);
  if(model.status==='choosing'&&own){
   const grid=el('div');grid.className='planet-crew';
   for(let n=1;n<=9;n++){const id=`c${n}`,occupant=model.members.find(m=>m.seatId!==model.selfSeatId&&m.characterId===id),b=button('',()=>operate({operation:'chooseCharacter',matchId:model.matchId,characterId:id}));b.append(el('span',CREW[id].sign),el('small',occupant?`Player ${occupant.seatId.slice(5)}`:own.characterId===id?'Yours':model.busy?'Saving…':'Available'));b.id=`planet-character-${id}`;b.dataset.character=id;b.style.setProperty('--crew-picture',crewPortraitVariable(id,model.versions));b.setAttribute('aria-label',`${CREW[id].sign}${occupant?`, taken by Player ${occupant.seatId.slice(5)}`:''}`);b.setAttribute('aria-pressed',String(own.characterId===id));b.disabled=!model.canChoose||!!occupant;grid.append(b);}root.append(grid);
   root.append(el('p',own.characterId?'Character selected':'An available character is assigned when time ends.'));
  }else if(model.status==='reading'&&own){
   root.append(el('h2',`Player ${model.selfSeatId.slice(5)} · Read your role`));
   const toggle=button(model.ownRole?'Conceal my role':'Reveal my role',()=>{roleOpen=model.ownRole===null;session.revealRole(roleOpen);});toggle.id='planet-role-reveal';toggle.setAttribute('aria-expanded',String(model.ownRole!==null));root.append(toggle);
   const privatePanel=el('div');privatePanel.className='ms-shell planet-setup-card';const inner=el('div');inner.className='ms-private__panel';if(model.ownRole)inner.append(createRoleCard(model.ownRole,own));else inner.append(el('p',own.ready?'Ready. Waiting for the other players.':'Your role is concealed.'));privatePanel.append(inner);root.append(privatePanel);
   const ready=button(own.ready?'Ready ✓':'Ready',()=>{roleOpen=false;operate({operation:'ready',matchId:model.matchId});});ready.id='planet-ready';ready.disabled=!model.canReady;root.append(ready);
  }else if(model.status==='boarding'){
   root.append(el('h2','Boarding'),el('p','The crew is boarding. The match will begin when the server confirms it.'));
  }else if(model.status==='aborted'){
   root.append(el('h2','Match aborted · No winner'));
   if(canReturnToLobby())root.append(returnButton());
   else if(game){const recovery=game.getModel(),check=button('Check original receipt',async()=>{await game?.checkReceipt();sessionKey=null;render(session.getModel());});check.id='planet-terminal-check-receipt';check.disabled=!recovery.recovery?.canCheck;root.append(el('p',recovery.message??'The previous command still needs its original receipt.'),check);}
  }
  else root.append(el('p',model.isHost?'Host lobby':'Waiting for admission or the next stage.'));
  const roster=el('ul');for(const member of model.members)roster.append(el('li',`Player ${member.seatId.slice(5)} · ${member.displayName}${member.controller==='bot'?' · Bot':''}${member.ready?' · Ready':''}`));if(['reading','lobby'].includes(model.status)){const details=el('details');details.append(el('summary',model.status==='reading'?`${model.members.filter(m=>m.ready).length} of ${model.playerCount} players ready`:`${model.members.length} of ${model.playerCount} seats filled`),roster);root.append(details);}
  if(model.isHost&&model.status==='lobby')hostControls(root);
  const timer=el('p');timer.id='planet-setup-timer';root.append(timer);updateTimer();
 }
 function hostControls(parent){
  if(model.uncertain){const status=el('p',model.message),retry=button('Retry original session request',()=>void session.retry());status.setAttribute('role','status');retry.disabled=model.busy;parent.append(status,retry);return;}
  for(const admission of model.pendingAdmissions)parent.append(button(`Admit ${admission.displayName} (${admission.kind})`,()=>operate({operation:'approveAdmission',matchId:model.matchId,admissionId:admission.id})));
  if(model.status==='lobby'){
   const form=el('form'),select=el('select');select.id='planet-bot-count';for(let n=0;n<=model.playerCount-model.members.filter(m=>m.controller==='human').length;n++){const o=el('option',`${n} bots`);o.value=String(n);select.append(o);}select.value=String(model.members.filter(m=>m.controller==='bot').length);const label=el('label','Bots');label.htmlFor=select.id;form.append(label,select,el('button','Set bots'));form.addEventListener('submit',e=>{e.preventDefault();operate({operation:'setBots',matchId:model.matchId,count:Number(select.value)});});parent.append(form);
   const begin=button('Start',()=>operate({operation:'beginSetup',matchId:model.matchId}));begin.id='planet-begin-setup';begin.disabled=model.busy||model.members.length!==model.playerCount;parent.append(begin);if(model.members.length!==model.playerCount)parent.append(el('p',`${model.playerCount-model.members.length} more seats to fill`));
  }
  if(['running','reading','choosing','boarding'].includes(model.status)){
   parent.append(button('Check server deadline',()=>operate({operation:'advance',matchId:model.matchId})),button('Run eligible bots',()=>operate({operation:'runBots',matchId:model.matchId})));
   const end=button(abortConfirm?'Confirm abort · No winner':'Abort match',()=>{if(!abortConfirm){abortConfirm=true;sessionKey=null;render(model);}else {abortConfirm=false;operate({operation:'abort',matchId:model.matchId});}});parent.append(end);
  }
  if(['running','reading','choosing','boarding'].includes(model.status))for(const member of model.members.filter(m=>m.controller==='human'))parent.append(button(`Issue recovery for Player ${member.seatId.slice(5)}`,()=>operate({operation:'issueRecovery',matchId:model.matchId,seatId:member.seatId})));
  if(model.recoveryCode){const recovery=el('section');recovery.className='planet-recovery-secret';recovery.setAttribute('aria-label','Private seat recovery');const match=el('p',`Match ID: ${model.matchId}`);match.id='planet-issued-match-id';recovery.append(match,button(recoveryShown?'Hide recovery code':'Reveal recovery code',()=>{recoveryShown=!recoveryShown;sessionKey=null;renderer?.settingsChanged();if(!game)render(model);}));if(recoveryShown){const code=el('p',model.recoveryCode);code.id='planet-issued-recovery-code';recovery.append(code);}parent.append(recovery);}
 }
 function updateTimer(){const t=document.getElementById('planet-setup-timer');if(t)t.textContent=model.remainingMs===null?'':model.status==='reading'?model.remainingMs>0?model.setupFlowVersion===3&&model.setupClock.status==='synced'?`${model.setupClock.serverNowMs<model.setup.roleFilmStartsAt?'Role card':'Role film'} · ${Math.ceil(model.remainingMs/1000)}s`:`Read for ${Math.ceil(model.remainingMs/1000)}s`:'Ready when you are':`${Math.ceil(model.remainingMs/1000)}s`;}
 function render(next){
  if(disposed)return;model=next;setCrewPictureSurface(root,model.versions);libraryAssets.setVersions(model.versions);
  if(!model.ownRole)roleOpen=false;
  pregame.update(model,{visible:document.visibilityState==='visible',focused:document.hasFocus(),uid:connection.currentUid()});presentation.sync();
  if(terminalReturn)terminalReturn.hidden=!canReturnToLobby();
  const running=['running','finished'].includes(model.status),surface=model.selfSeatId?'player':'display';
  if(running){
   const nextKey=`${model.matchId}:${surface}:${model.selfSeatId}`;
   if(key!==nextKey){renderer?.dispose();game?.dispose();root.className='planet-container';root.replaceChildren();gameRoot=el('div');root.append(gameRoot);key=nextKey;game=createPlanetController(session.gameTransport(surface),ports,{matchId:model.matchId,surface});terminalReturn=returnButton();terminalReturn.hidden=true;renderer=mountPlanetRenderer(gameRoot,game,{cinematics:planetHasLibraryArt(model.versions)?PLANET_LIBRARY_MEDIA:[],terminalAction:terminalReturn,settings:parent=>{preferences.controls(parent);if(model.isHost&&!game?.getModel().dark)hostControls(parent);}});void game.start();}
   const nextHostState=JSON.stringify([model.isHost,model.busy,model.uncertain,model.recoveryCode,model.pendingAdmissions,model.status]);if(nextHostState!==hostState){hostState=nextHostState;recoveryShown=false;renderer?.settingsChanged();}return;
  }
  // A stale/hidden session does not discard a command's controller or recovery identifiers.
  if(game&&renderer&&model.connection!=='live'){root.querySelector('.planet-host-menu')?.remove();return;}
  if(model.status==='aborted'&&hasCommandRecovery()){
   // An abort closes gameplay, but the original command receipt remains readable.
   // Keep its controller, or reconstruct it from UID-bound identifiers after reload.
   renderer?.dispose();renderer=null;terminalReturn=null;
   if(!game){key=`${model.matchId}:${surface}:${model.selfSeatId}`;game=createPlanetController(session.gameTransport(surface),ports,{matchId:model.matchId,surface});void game.start();}
  }else if(key){renderer?.dispose();game?.dispose();renderer=null;game=null;terminalReturn=null;key=null;}
  if(lastStatus!==model.status){roleOpen=false;lastStatus=model.status;}
  const nextSessionKey=JSON.stringify({...model,remainingMs:null,setupClock:null,canChoose:model.canChoose,canReady:model.canReady,commandRecovery:game?.getModel().recovery,commandMessage:game?.getModel().message});
  if(sessionKey!==nextSessionKey){const focus=document.activeElement?.id;sessionKey=nextSessionKey;lobbyView();if(focus)document.getElementById(focus)?.focus({preventScroll:true});}updateTimer();
 }
 const visibility=()=>{session.setVisible(document.visibilityState==='visible'&&document.hasFocus());if(document.visibilityState!=='visible')roleOpen=false;};
 const artReady=()=>{sessionKey=null;if(model)render(session.getModel());};
 const concealRole=()=>{roleOpen=false;recoveryShown=false;setupSettings=false;session.revealRole(false);session.setVisible(false);presentation.clear();};
 document.addEventListener('visibilitychange',visibility);document.addEventListener('mothership:art-ready',artReady);win.addEventListener('blur',concealRole);win.addEventListener('focus',visibility);unsubscribe=session.subscribe(render);await session.start(matchId);
 return {session,artReady:Promise.all([commonArt,libraryAssets.ready]),get game(){return game;},get presentationStats(){return presentation.stats},dispose(){disposed=true;unsubscribe?.();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('mothership:art-ready',artReady);win.removeEventListener('blur',concealRole);win.removeEventListener('focus',visibility);presentation.dispose();pregame.dispose();preferences.dispose();renderer?.dispose();game?.dispose();session.dispose();libraryAssets.dispose();void connection.dispose?.();delete root.dataset.crewArt;root.replaceChildren();}};
}

import {createPlanetSession,createPlanetController} from '@mothership/game';
import {planetRoleLook} from '@mothership/presentation';
import {CrewDisplayNameSchema,CREW_NAME_MAX_LENGTH} from '@mothership/contracts';
import {loadArt} from '../art.mjs';
import {mountPlanetRenderer} from './render.mjs';
import '../comic-tokens.css';
import '../comic.css';
import '../comic-layout.css';
import '../claude-phone-kit.css';
import '../board-v2.css';
import './planet.css';

/** Both production and the explicit development harness mount this same consumer. */
export async function mountPlanetApp(root,{connection,matchId,allowSynthetic=false,ports:injectedPorts=null,stores:injectedStores=null}={}){
 if(!connection||connection.mode==='synthetic'&&!allowSynthetic)throw new TypeError('An authenticated Planet connection is required');
 const document=root.ownerDocument,win=document.defaultView;
 const store=key=>({load:()=>win.sessionStorage.getItem(key),save:value=>win.sessionStorage.setItem(key,value),clear:()=>win.sessionStorage.removeItem(key)});
 const ports=injectedPorts??{clock:{now:()=>win.performance.now()},scheduler:{setTimeout:(f,ms)=>win.setTimeout(f,ms),clearTimeout:h=>win.clearTimeout(h)},ids:{next:()=>win.crypto.randomUUID()},unresolved:store('mothership:planet:command')};
 const stores=injectedStores??{resume:store('mothership:planet:resume'),requests:store('mothership:planet:requests')};
 const session=createPlanetSession(connection,ports,stores);
 await loadArt('player',document);
 let game=null,renderer=null,gameRoot=null,key=null,model=null,disposed=false,hostOpen=false,abortConfirm=false,unsubscribe=null,roleOpen=false,lastStatus=null,sessionKey=null;
 const el=(tag,text=null)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;return n;};
 const button=(label,run)=>{const b=el('button',label);b.type='button';b.addEventListener('click',run);return b;};
 const operate=action=>void session.operate(action);
 function createRoleCard(value,own){
  const look=planetRoleLook(value.role,value.faction),card=el('article');card.className='ms-role-card ms-role-card--full';card.dataset.device=look.device??'';card.dataset.team=value.faction.toLowerCase();
  if(own?.characterId){card.dataset.character=own.characterId;card.style.setProperty('--ms-role-person',`var(--ms-asset-piece-crew-card-${own.characterId})`);}
  if(look.device)card.style.setProperty('--ms-role-device',`var(--ms-asset-device-${look.device}-held)`);
  const art=el('span');art.className='ms-role-card__art';art.setAttribute('aria-hidden','true');const text=el('div');text.className='ms-role-card__text';text.append(el('h2',look.name),el('p',`${look.faction} team`));card.append(art,text,el('p',look.guide));
  if(value.knowledge.insiderSeatIds.length)card.append(el('p',`Unmapped trio: ${[...value.knowledge.insiderSeatIds].sort().map(id=>`Player ${id.slice(5)}`).join(', ')}.`));
  if(value.knowledge.knownUndercoverSeatId)card.append(el('p',`Undercover: Player ${value.knowledge.knownUndercoverSeatId.slice(5)}.`));return card;
 }
 function lobbyView(){
  root.className='planet-setup';root.replaceChildren();
  const heading=el('h1',model.mode==='synthetic'?'SYNTHETIC · Mothership':'Mothership');root.append(heading);
  const status=el('p',model.message??(model.connection==='connecting'?'Connecting…':''));status.setAttribute('role','status');root.append(status);
  if(model.uncertain){root.append(button('Retry original session request',()=>void session.retry()));return;}
  if(model.pendingAdmission){
   status.textContent='Request registered.';root.append(el('h2',`Room ${model.pendingAdmission.roomCode}`),el('p',`Requested ${model.pendingAdmission.kind==='display'?'shared display':'player seat'}. Waiting for the server to confirm admission.`));
   const check=button('Check admission',()=>void session.refresh());check.id='planet-check-admission';root.append(check);return;
  }
  if(model.connection!=='live'){root.append(button('Reconnect',()=>void session.refresh()));return;}
  if(!model.matchId){
   const create=el('form'),count=el('select');count.id='planet-player-count';for(const n of [7,8,9]){const o=el('option',`${n} players`);o.value=String(n);count.append(o);}
   const countLabel=el('label','Players');countLabel.htmlFor=count.id;create.append(countLabel,count);const host=el('button','Create Planet game');host.id='planet-create';host.disabled=model.busy;create.append(host);create.addEventListener('submit',e=>{e.preventDefault();operate({operation:'create',playerCount:Number(count.value)});});root.append(create);
   const join=el('form'),room=el('input'),name=el('input'),kind=el('select');room.id='planet-room-code';room.autocomplete='off';room.maxLength=6;room.required=true;room.pattern='[A-Za-z0-9]{6}';name.id='planet-display-name';name.maxLength=CREW_NAME_MAX_LENGTH*2;name.required=true;name.autocomplete='nickname';
   for(const [text,input]of [['Room code',room],['Your name',name]]){const label=el('label',text);label.htmlFor=input.id;join.append(label,input);}
   const nameHint=el('p',`Use 1–${CREW_NAME_MAX_LENGTH} characters.`);nameHint.id='planet-name-hint';nameHint.setAttribute('role','status');name.setAttribute('aria-describedby',nameHint.id);join.append(nameHint);
   const validateName=()=>{const value=name.value.trim(),valid=CrewDisplayNameSchema.safeParse(value).success;name.setCustomValidity(valid?'':`Enter a name of 1–${CREW_NAME_MAX_LENGTH} characters without control characters.`);name.setAttribute('aria-invalid',String(!valid));nameHint.textContent=valid?`${[...value].length} / ${CREW_NAME_MAX_LENGTH} characters`:name.validationMessage;return valid;};
   name.addEventListener('input',validateName);
   kind.id='planet-join-kind';for(const value of ['player','display']){const o=el('option',value==='player'?'Player phone':'Shared display');o.value=value;kind.append(o);}const kindLabel=el('label','Device');kindLabel.htmlFor=kind.id;join.append(kindLabel,kind);const submit=el('button','Request admission');submit.id='planet-join';submit.disabled=model.busy;join.append(submit);join.addEventListener('submit',e=>{e.preventDefault();if(!validateName()){name.reportValidity();return;}operate({operation:'requestAdmission',roomCode:room.value.trim().toUpperCase(),kind:kind.value,displayName:name.value.trim()});});root.append(join);
   const recover=el('details');recover.append(el('summary','Recover a player seat'));const form=el('form'),id=el('input'),token=el('input');id.id='planet-recovery-match';id.required=true;token.id='planet-recovery-code';token.type='password';token.required=true;token.autocomplete='off';for(const [text,input]of [['Match ID',id],['Recovery code',token]]){const label=el('label',text);label.htmlFor=input.id;form.append(label,input);}form.append(el('button','Recover seat'));form.addEventListener('submit',e=>{e.preventDefault();const recoveryCode=token.value;token.value='';operate({operation:'redeemRecovery',matchId:id.value.trim(),recoveryCode});});recover.append(form);root.append(recover);return;
  }
  root.append(el('p',`Room ${model.roomCode??'…'}`));
  const own=model.members.find(m=>m.seatId===model.selfSeatId);
  if(model.status==='choosing'&&own){
   root.append(el('h2','Choose your character'),el('p','A character is assigned automatically when the 30-second selection window closes.'));
   const grid=el('div');grid.className='planet-crew';
   for(let n=1;n<=9;n++){const id=`c${n}`,taken=model.members.some(m=>m.seatId!==model.selfSeatId&&m.characterId===id),b=button(`Character ${n}`,()=>operate({operation:'chooseCharacter',matchId:model.matchId,characterId:id}));b.id=`planet-character-${id}`;b.dataset.character=id;b.style.setProperty('--crew-picture',`var(--ms-asset-piece-crew-card-${id})`);b.setAttribute('aria-pressed',String(own.characterId===id));b.disabled=!model.canChoose||taken;grid.append(b);}root.append(grid);
  }else if(model.status==='reading'&&own){
   root.append(el('h2',`Player ${model.selfSeatId.slice(5)} · Read your role`));
   const toggle=button(model.ownRole?'Conceal my role':'Reveal my role',()=>{roleOpen=!roleOpen;session.revealRole(roleOpen);});toggle.id='planet-role-reveal';toggle.setAttribute('aria-expanded',String(model.ownRole!==null));root.append(toggle);
   const privatePanel=el('div');privatePanel.className='ms-shell planet-setup-card';const inner=el('div');inner.className='ms-private__panel';if(model.ownRole)inner.append(createRoleCard(model.ownRole,own));else inner.append(el('p',own.ready?'Ready. Waiting for the other players.':'Your role is concealed.'));privatePanel.append(inner);root.append(privatePanel);
   const ready=button(own.ready?'Ready ✓':'Ready',()=>{roleOpen=false;operate({operation:'ready',matchId:model.matchId});});ready.id='planet-ready';ready.disabled=!model.canReady;root.append(ready);
  }else if(model.status==='aborted')root.append(el('h2','Match aborted · No winner'));
  else root.append(el('p',model.isHost?'Host lobby':'Waiting for admission or the next stage.'));
  const roster=el('ul');for(const member of model.members)roster.append(el('li',`Player ${member.seatId.slice(5)} · ${member.displayName}${member.controller==='bot'?' · Bot':''}${member.ready?' · Ready':''}`));if(model.status==='reading'){const details=el('details');details.append(el('summary',`${model.members.filter(m=>m.ready).length} of ${model.playerCount} players ready`),roster);root.append(details);}else root.append(roster);
  if(model.isHost)hostControls(root);
  const timer=el('p');timer.id='planet-setup-timer';root.append(timer);updateTimer();
 }
 function hostControls(parent){
  for(const admission of model.pendingAdmissions)parent.append(button(`Admit ${admission.displayName} (${admission.kind})`,()=>operate({operation:'approveAdmission',matchId:model.matchId,admissionId:admission.id})));
  if(model.status==='lobby'){
   const form=el('form'),select=el('select');select.id='planet-bot-count';for(let n=0;n<=model.playerCount-model.members.filter(m=>m.controller==='human').length;n++){const o=el('option',`${n} bots`);o.value=String(n);select.append(o);}select.value=String(model.members.filter(m=>m.controller==='bot').length);const label=el('label','Bots');label.htmlFor=select.id;form.append(label,select,el('button','Set bots'));form.addEventListener('submit',e=>{e.preventDefault();operate({operation:'setBots',matchId:model.matchId,count:Number(select.value)});});parent.append(form);
   const begin=button('Begin 30-second character selection',()=>operate({operation:'beginSetup',matchId:model.matchId}));begin.id='planet-begin-setup';begin.disabled=model.busy||model.members.length!==model.playerCount;parent.append(begin);
  }
  if(['running','reading','choosing'].includes(model.status)){
   parent.append(button('Check server deadline',()=>operate({operation:'advance',matchId:model.matchId})),button('Run eligible bots',()=>operate({operation:'runBots',matchId:model.matchId})));
   const end=button(abortConfirm?'Confirm abort · No winner':'Abort match',()=>{if(!abortConfirm){abortConfirm=true;sessionKey=null;render(model);}else {abortConfirm=false;operate({operation:'abort',matchId:model.matchId});}});parent.append(end);
  }
  if(['running','reading','choosing'].includes(model.status))for(const member of model.members.filter(m=>m.controller==='human'))parent.append(button(`Issue recovery for Player ${member.seatId.slice(5)}`,()=>operate({operation:'issueRecovery',matchId:model.matchId,seatId:member.seatId})));
  if(model.recoveryCode){const recovery=el('p',`Private recovery code: ${model.recoveryCode}`);recovery.className='planet-recovery-secret';parent.append(recovery);}
 }
 function updateTimer(){const t=document.getElementById('planet-setup-timer');if(t)t.textContent=model.remainingMs===null?'':model.status==='reading'?model.remainingMs>0?`Read for at least ${Math.ceil(model.remainingMs/1000)} more seconds.`:'Ready is available after the minimum reading time.':`${Math.ceil(model.remainingMs/1000)} seconds remaining.`;}
 function render(next){
  if(disposed)return;model=next;
  const running=['running','finished'].includes(model.status),surface=model.selfSeatId?'player':'display';
  if(running){
   const nextKey=`${model.matchId}:${surface}:${model.selfSeatId}`;
   if(key!==nextKey){renderer?.dispose();game?.dispose();root.className='planet-container';root.replaceChildren();gameRoot=el('div');root.append(gameRoot);key=nextKey;game=createPlanetController(session.gameTransport(surface),ports,{matchId:model.matchId,surface});renderer=mountPlanetRenderer(gameRoot,game);void game.start();}
   root.querySelector('.planet-host-menu')?.remove();if(model.isHost){const menu=el('aside');menu.className='planet-host-menu';const open=button(hostOpen?'Close host controls':'Host controls',()=>{hostOpen=!hostOpen;render(model);});menu.append(open);if(hostOpen){const panel=el('section');panel.className='planet-host-panel';panel.append(el('h2',`Room ${model.roomCode}`));hostControls(panel);menu.append(panel);}root.append(menu);}return;
  }
  // A stale/hidden session does not discard a command's controller or recovery identifiers.
  if(game&&model.connection!=='live'){root.querySelector('.planet-host-menu')?.remove();return;}
  if(key){renderer?.dispose();game?.dispose();renderer=null;game=null;key=null;}
  if(lastStatus!==model.status){roleOpen=false;lastStatus=model.status;}
  const nextSessionKey=JSON.stringify({...model,remainingMs:null,canChoose:model.canChoose,canReady:model.canReady});
  if(sessionKey!==nextSessionKey){const focus=document.activeElement?.id;sessionKey=nextSessionKey;lobbyView();if(focus)document.getElementById(focus)?.focus({preventScroll:true});}updateTimer();
 }
 const visibility=()=>{session.setVisible(document.visibilityState==='visible');if(document.visibilityState!=='visible')roleOpen=false;};
 document.addEventListener('visibilitychange',visibility);unsubscribe=session.subscribe(render);await session.start(matchId);
 return {session,get game(){return game;},dispose(){disposed=true;unsubscribe?.();document.removeEventListener('visibilitychange',visibility);renderer?.dispose();game?.dispose();session.dispose();void connection.dispose?.();root.replaceChildren();}};
}

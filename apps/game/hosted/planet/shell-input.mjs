// The match's frame on a phone is Designer's phone shell (design/phone-ui/components/phone-shell): the
// owner's plan of 16 November 2026, release 2. These pure functions map this phone's presentation model
// to the shell's input, and the shell's intents to the calls the game already makes. They use only what
// the model gives this viewer: enabled states come from the model's offers (and, for an eliminated player's
// Actions, the public board, as the presentation offers that seat nothing); where it gives none the shell
// keeps its default. Nothing here works out who may act from the rules; the controller checks the current
// offer before it sends anything.
import {LOCATION_OF} from '../board-v2-drawing/slots-four.mjs';
import {PHASE_BAR_PHASES,loadingBar,phaseBar,reconnectingBar} from '../../../../design/phone-ui/components/phone-shell/phase-bars.mjs';

/**
 * Today's names (render.mjs before the shell) for the phases whose bar is still the game's own: the votes, the
 * private talk, Food Supply and a turn with no one active. Every other phase's words are Designer's, in
 * phase-bars.mjs (shell 0.2.10), which shellBar() calls: Before turns, the Officer's appointment, the Blackout,
 * Ship synchronized and Setting course.
 */
export const SHELL_PHASE_NAMES=Object.freeze({FOOD_SUPPLY:'Food Supply',ORDINARY_TURN:'Turn',CAPTAIN_ELECTION:'Captain vote',JAIL_VOTE:'Jail vote',VOTE_RESULT:'Vote result',HACK:'Private talk',HACK_DECLARE:'Declare side',HACK_RESULT:'Private claim'});
/** Those bars' icons, as the pack's bars draw them (ui.mjs topBar on sheets 07, 35, 38 and 44). */
export const SHELL_PHASE_ICONS=Object.freeze({FOOD_SUPPLY:'supply',ORDINARY_TURN:'turn',CAPTAIN_ELECTION:'captain',JAIL_VOTE:'vote',VOTE_RESULT:'jail',HACK:'talk',HACK_DECLARE:'declare',HACK_RESULT:'talk',FINISHED:'flag'});
/** The target bar's icon for each action, from the phone's icon family. */
export const SHELL_ACTION_ICONS=Object.freeze({PASS_TURN:'pass',MOVE:'move',REGISTER_SHOT:'shoot',PROTECT:'protect',RESCUE:'rescue',SUPPLY:'supply',SCAN:'scan',SUBMIT_CODE:'code',ACTIVATE_SHIP_HACK:'shipHack',ENGINEER_SUPPRESS:'suppress',ACTIVATE_BLACKHOLE:'blackhole',ACTIVATE_CLONE:'clone',REQUEST_BLACKOUT:'blackout',SELECT_BLACKOUT_SLOT:'position',CAPTAIN_RELEASE:'release',CAPTAIN_EJECT:'eject',APPOINT_OFFICER:'appoint',BLOCK_MOVE:'block',CHOOSE_NAV_DIRECTION:'direction',CONFIRM_NAVIGATION:'acknowledge',VOTE:'vote',REQUEST_HACK:'talk',DECLARE_HACK_SIDE:'declare',PANEL_CODE:'panel',OFFER_PROMISE:'promise',ACCEPT_PROMISE:'check',DECLINE_PROMISE:'close',SHOW_WINDOW:'show'});
/** The two fixed presentations: a ring for the clock, and no Promises (sheet 07). */
export const SHELL_RING_PHASES=Object.freeze(['VOTE_RESULT','BLACKHOLE_PRESENTATION']);
const BALLOTS=['JAIL_VOTE','CAPTAIN_ELECTION'],TALK=['HACK_DECLARE','HACK_RESULT','HACK'];
/** The tab each panel belongs to: Panels' own pages keep the Panels tab open (sheet 27.5). */
const PANEL_TAB=Object.freeze({actions:'actions',card:'card',panels:'panels',windows:'panels',navigation:'panels',hospital:'panels',players:'panels','round-order':'panels'});
/** The pages reached from Panels, whose sheet has Back to Panels (sheet 27.5: "‹ returns to Panels"). */
const PANEL_PAGES=Object.freeze(['windows','navigation','hospital','players','round-order']);

const isSeat=value=>/^seat-[1-9]$/.test(value);
/** A public person for the bar: the seat, the display name (or "Player n") and the crew character. */
function person(model,seatId){
 const who=model.identities?.find(identity=>identity.seatId===seatId);
 return {seat:seatId,name:who?.displayName||`Player ${String(seatId).slice(5)}`,character:who?.characterId??null};
}

/** live, stale (connecting, reconnecting or an error) or concealed. The Food surface over the chrome conceals the shell. */
export function shellStatus(model,{food=null}={}){
 if(model.concealed||food?.active||food?.exclusive)return 'concealed';
 return model.connection==='live'?'live':'stale';
}

/** This viewer's own seat is Eliminated on the public board. */
export const ownOut=model=>model.surface==='player'&&!!model.ownSeatId&&model.board?.seats?.find(seat=>seat.seatId===model.ownSeatId)?.health==='Eliminated';
/** Why Actions is unavailable to an eliminated player (sheet 44): the presentation offers them no action. */
export const OUT_ACTIONS_REASON='You’re out. You can still watch.';

/** This phone is one of the two in a private talk (the pair is public). */
export const ownTalk=model=>model.surface==='player'&&!model.dark&&TALK.includes(model.phase?.kind)&&!!model.ownSeatId&&!!model.talk&&[model.talk.actorSeatId,model.talk.targetSeatId].includes(model.ownSeatId);
/**
 * The talk's own two buttons (Promises, My card) take the tabs' place during the 60 s talk only. While the
 * target declares and the claim shows, the declaration is offered in Actions, which the tabs keep in reach:
 * the capsule that would hold it (sheet 25) is a later component.
 */
export const talkButtons=model=>ownTalk(model)&&model.phase.kind==='HACK';

/** Today's rule for choosing on the scene or the board, where the target bar replaces the sheet. */
export function shellPicking(action){
 if(!action)return false;
 return !['PANEL_CODE','SUBMIT_CODE','VOTE'].includes(action.type)&&action.choices.some(choice=>isSeat(choice.value))
  ||action.type==='MOVE'&&['targets','slots'].includes(action.step)||action.type==='SELECT_BLACKOUT_SLOT'&&action.step==='slots';
}

/** The clock while the server time is trusted: amber in the last 10 s, a ring for the two fixed presentations. */
export function shellTimer(model){
 const phase=model.phase;
 if(!phase?.trusted||!Number.isFinite(phase.remainingMs))return null;
 const span=phase.endsAt-phase.startedAt;
 if(!SHELL_RING_PHASES.includes(phase.kind)||!(span>0))return {remainingMs:phase.remainingMs,urgentAtMs:10000,ring:null};
 // Sheet 07 draws the ring without the amber (urgentAt -1): the whole stage is shorter than 10 s.
 return {remainingMs:phase.remainingMs,urgentAtMs:-1,ring:Math.min(1,Math.max(0,1-phase.remainingMs/span))};
}

/** The deciding player's own choice in a phase: the action the controller drafts for it, which the shell shows as its target bar. */
const OWN_ACTION=Object.freeze({OFFICER_APPOINTMENT:'APPOINT_OFFICER',PRE_TURN:'BLOCK_MOVE'});
/** The Navigation sheet's two actions: the Officer's choice on a tie, and each office's acknowledgement. */
const NAVIGATION_ACTIONS=Object.freeze(['CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION']);
/**
 * What phase-bars.mjs is told for a phase it draws. Each fact is one the model already holds; nothing is worked
 * out from the rules, and no offer is read:
 *   own                  this phone has the deciding player's own choice open: the controller's draft of the
 *                        appointment or of the block (begun from Actions), on a player's phone
 *   chooser              the Captain's public name, as the turn bar names a player
 *   hasOfficer, blocked  the public offices name an Officer; a block is shown
 *   dark, lightsOutMs    the model's dark, which also darkens the room; while lit, the Blackout's preview end less
 *                        the trusted time (the presentation holds both)
 *   office               the office this viewer holds, from the public offices, while its Navigation is open: the
 *                        Navigation page, or one of its two actions
 */
export function shellPhaseFacts(model){
 const kind=model.phase?.kind??null,player=model.surface==='player',offices=model.offices??null,action=model.action?.type??null;
 const held=player&&model.ownSeatId?offices?.captainSeatId===model.ownSeatId?'captain':offices?.officerSeatId===model.ownSeatId?'officer':null:null;
 const blackout=model.presentation?.blackout??null;
 return {
  own:player&&!!OWN_ACTION[kind]&&action===OWN_ACTION[kind],
  chooser:offices?.captainSeatId?{name:person(model,offices.captainSeatId).name}:null,
  hasOfficer:!!offices?.officerSeatId,blocked:!!offices?.blockedSeatId,
  dark:!!model.dark,lightsOutMs:!model.dark&&blackout&&Number.isFinite(model.presentation.nowMs)?blackout.previewEndsAt-model.presentation.nowMs:null,
  office:held&&(model.panel==='navigation'||NAVIGATION_ACTIONS.includes(action))?held:null,
 };
}

/**
 * The top bar. A turn when not dark, in an ordinary turn with an active seat; the pair on the two talking
 * phones; otherwise the phase. Promises on a player's phone outside the fixed presentations. ⋮ on every phone,
 * a shared display's included: Settings is the one panel the controller opens on a display, for its preferences
 * and, when the display hosts, the host's controls, as today's header gave it. `lastRound` is the round this
 * phone last saw live, which the reconnecting bar names (sheet 45).
 * The words of a phase with no active player are Designer's (phase-bars.mjs): phaseBar() for the phases it draws,
 * reconnectingBar() while this phone is not live, and loadingBar() for the first connect, before it has seen a
 * round: the pack's Loading bar has no round, Promises or ⋮, and the model holds no count of pictures, so it is
 * the title alone.
 */
export function shellBar(model,{lastRound=null}={}){
 const player=model.surface==='player',kind=model.phase?.kind??null;
 const menu={open:model.panel==='settings'};
 if(model.connection!=='live'){
  if(model.connection==='connecting'&&!Number.isSafeInteger(lastRound))return loadingBar();
  return reconnectingBar({round:lastRound,promises:player?{count:model.promiseOfferCount??0,open:false}:null,menu});
 }
 const promises=player&&!SHELL_RING_PHASES.includes(kind)?{count:model.promiseOfferCount??0,open:model.panel==='promises'}:null;
 const base={round:model.round??null,timer:shellTimer(model),promises,menu};
 if(!model.dark&&kind==='ORDINARY_TURN'&&model.activeSeatId)return {kind:'turn',who:person(model,model.activeSeatId),self:player&&model.activeSeatId===model.ownSeatId,...base};
 if(ownTalk(model))return {kind:'pair',pair:[person(model,model.talk.actorSeatId),person(model,model.talk.targetSeatId)],sub:SHELL_PHASE_NAMES[kind],...base};
 if(PHASE_BAR_PHASES.includes(kind)){
  // The pack's words, the clock's amber and ring and the dark tone are the function's; Promises is given on every
  // player's phone, and the function drops it where the pack's bar has none.
  const span=model.phase.endsAt-model.phase.startedAt;
  return phaseBar({phase:kind,round:model.round??null,remainingMs:base.timer?.remainingMs??null,durationMs:span>0?span:null,...shellPhaseFacts(model),
   promises:player?{count:model.promiseOfferCount??0,open:model.panel==='promises'}:null,menu});
 }
 // The game's own bars, until their components connect: the board's label is the line under the name, as today's header said.
 const icon=kind==='VOTE_RESULT'?model.lastTally?.kind==='CAPTAIN_ELECTION'?'captain':'jail':SHELL_PHASE_ICONS[kind]??'hourglass';
 return {kind:'phase',icon,title:SHELL_PHASE_NAMES[kind]??(kind?kind.replaceAll('_',' '):'Connecting'),sub:model.boardLabel??null,tone:model.dark?'dark':null,...base};
}

/**
 * The raised round button: Vote or Voted while a ballot is open (Voted once this phone's ballot is the phase's);
 * Vote, unavailable, through the 5 s result, as the pack draws it (sheet 38; the shell's agreement case
 * `phase-result`); otherwise Pass. Usable as the model offers it; busy while its command is sending.
 */
export function shellHero(model){
 const action=model.action,sending=type=>action?.type===type&&action.step==='sending';
 if(model.phase?.kind==='VOTE_RESULT')return {mode:'vote',enabled:false};
 if(BALLOTS.includes(model.phase?.kind)){
  if(model.ownBallot&&model.ownBallot.phaseId===model.phase.id)return {mode:'voted',enabled:true};
  return {mode:'vote',enabled:!!model.canVote||sending('VOTE'),busy:sending('VOTE')};
 }
 return {mode:'pass',enabled:!!model.canPass||sending('PASS_TURN'),busy:sending('PASS_TURN')};
}

/**
 * A player's tabs (none on a shared display): the view, the open tab and the round button; the talk's two buttons
 * in the 60 s talk. An eliminated player keeps the Board, Card and Panels; Actions is unavailable (sheet 44), as
 * the presentation offers them nothing to act on.
 */
export function shellTabs(model,{view='room'}={}){
 if(model.surface!=='player')return null;
 if(talkButtons(model))return {variant:'talk',open:model.panel==='promises'?'promises':model.panel==='card'?'my-card':null};
 const tabs={variant:'game',view:view==='board'?'board':'room',open:PANEL_TAB[model.panel]??null,hero:shellHero(model)};
 return ownOut(model)?{...tabs,enabled:{actions:false},reasons:{actions:OUT_ACTIONS_REASON}}:tabs;
}

/** The target bar while this viewer chooses on the scene or the board: the action's name and its prompt, with Cancel. */
export function shellTarget(model){
 if(model.surface!=='player'||model.concealed||!shellPicking(model.action))return null;
 const action=model.action;
 return {icon:SHELL_ACTION_ICONS[action.type]??'actions',title:action.label,sub:action.prompt||null};
}

/**
 * The floating chip while choosing (sheet 29): in the room view, "Other rooms · n" when people this viewer's
 * action offers stand in other rooms, or the way to a move's other rooms; on the board, "List", the same choice
 * as text. It counts the offers on the public board; it decides nothing.
 */
export function shellChip(model,{view='room',room=null}={}){
 const action=model.action;
 if(model.surface!=='player'||model.concealed||!shellPicking(action)||action.type==='SELECT_BLACKOUT_SLOT')return null;
 if(action.type==='MOVE')return view==='room'?{id:'board',label:'Other rooms on the Board',icon:'board',tone:'paper'}:null;
 const seats=action.choices.map(choice=>choice.value).filter(isSeat);
 if(!seats.length)return null;
 if(view==='board')return {id:'list',label:'List',icon:'players',tone:'paper'};
 const here=LOCATION_OF[room]??null;
 const elsewhere=seats.filter(id=>{const seat=model.board?.seats?.find(s=>s.seatId===id);return !!seat?.location&&seat.location!==here;}).length;
 return elsewhere?{id:'board',label:`Other rooms · ${elsewhere}`,icon:'board',tone:'paper'}:null;
}

/** Reconnecting (the phone's) while the match is not current; otherwise an eliminated player's own banner (public on the board). */
export function shellBanner(model){
 if(model.connection!=='live')return {kind:'reconnecting',busy:model.recovery?.status==='checking'};
 if(model.surface!=='player'||model.concealed)return null;
 return ownOut(model)?{kind:'out'}:null;
}

/**
 * A pass the server accepted: a toast once, with the pack's icon (sheet 27.3, `toast('Turn passed', 'info')`) and the
 * model's own registration words.
 */
export function shellToast(model){
 const action=model.action;
 if(model.surface!=='player'||model.concealed||action?.type!=='PASS_TURN'||action.step!=='accepted'||!action.prompt)return null;
 return {id:`pass:${model.phase?.id??''}`,text:action.prompt,icon:'info'};
}

const frame=(id,kind,title,more={})=>({id,kind,title,sub:null,back:false,close:true,detent:'auto',actions:[],...more});
/**
 * The docked sheet's frame for what the model has open, or null: its id (a new id is a new sheet), the kind of
 * body the game draws in it, its title and line, Back, Close, its height and its footer's actions. The body is
 * the game's own until its components come (release 3). `listOpen`: the board's List is showing.
 */
export function shellSheet(model,{listOpen=false}={}){
 if(model.concealed)return null;
 // A shared display opens Settings only (the controller's rule): its preferences, and the host's controls when it hosts.
 if(model.surface!=='player')return model.panel==='settings'?frame('settings','settings','Settings'):null;
 if(model.recovery)return frame('recovery','recovery','Outcome unknown');
 const action=model.action;
 if(action){
  if(shellPicking(action))return listOpen?frame('target-list','target-list',action.label,{sub:action.prompt||null}):null;
  if(action.type==='PASS_TURN'){
   if(action.step==='accepted')return null;
   if(['confirm','sending'].includes(action.step)){
    const sending=action.step==='sending';
    // Sheet 27.3: "Pass your turn?", asked once, with Cancel (this phone's own) and Pass, which sends PASS_TURN.
    return frame('pass','pass','Pass your turn?',{close:false,actions:[{id:'cancel',label:'Cancel',kind:'secondary',local:true},
     {id:'confirm',label:'Pass',kind:'primary',icon:'pass',enabled:action.canConfirm||sending,busy:sending}]});
   }
  }
  // The ballot is titled by its vote, as the pack's (sheet 35).
  const title=action.type==='VOTE'?SHELL_PHASE_NAMES[model.phase?.kind]??action.label:action.label;
  return frame(`action:${action.type}`,'action',title,{detent:action.type==='VOTE'&&action.step==='targets'?'large':'auto',
   actions:action.canConfirm?[{id:'confirm',label:action.type==='VOTE'?'Vote':action.type==='PASS_TURN'?'Pass':'Register',kind:'primary'}]:[]});
 }
 const panel=model.panel;
 if(panel==='settings')return frame('settings','settings','Settings');
 if(panel==='board')return null;
 if(model.dark)return frame(`dark:${panel}`,'dark','Blackout');
 if(model.phase?.expired)return frame('expired','expired','Waiting for the server');
 const back=PANEL_PAGES.includes(panel);
 const titles={panels:'Panels',players:'Players','round-order':'Round order',promises:'Promises',windows:'Windows',navigation:'Navigation',hospital:'Hospital panel',actions:'Actions'};
 if(panel==='card')return frame('card','card','Your role',{sub:'Only on this phone',detent:'large'});
 if(panel==='windows')return frame('windows','windows','Windows',{back,detent:'large',sub:model.round===null?null:`Unverified claims · Expires after Round ${model.round}`});
 return titles[panel]?frame(panel,panel,titles[panel],{back}):null;
}

/**
 * Every input of the shell for this phone. `view` is what the renderer holds: the scene mode (`view`), the room
 * view's room, the Food surface ({ active, exclusive }), Reduce motion, the round last seen live and whether the
 * board's List is open. Concealed, the shell drops this viewer's inputs itself; the tabs are still given so the
 * bars keep their shape and the stage its size. A shared display takes taps: it has no tabs, Promises, target bar
 * or chip, so its only controls are ⋮, the Settings sheet's Close and Retry.
 */
export function shellInput(model,{view='room',room=null,food=null,reducedMotion=false,lastRound=null,listOpen=false}={}){
 const display=model.surface!=='player',status=shellStatus(model,{food}),hidden=status==='concealed';
 return {
  status,interactive:true,reducedMotion:!!reducedMotion,viewer:display?null:model.ownSeatId??null,versions:model.versions??null,
  bar:shellBar(model,{lastRound}),tabs:display?null:shellTabs(model,{view}),
  target:hidden?null:shellTarget(model),chip:hidden?null:shellChip(model,{view,room}),banner:hidden?null:shellBanner(model),
  toast:hidden?null:shellToast(model),sheet:hidden?null:shellSheet(model,{listOpen}),
 };
}

/**
 * The shell's intents, each to a call the game already makes: openPanel, begin, confirm, dismiss, its local view
 * switch and the session's refresh. `opened` hears which of the shell's controls opened something, so the focus can
 * go back to it. `live()` is false once the renderer is disposed: then nothing is called.
 */
export function shellHandlers({openPanel,begin,confirm,dismiss,toggleView,showBoard,openList,closeList,reconnect=null,layout=null,focusReturn=null,opened=null,live=()=>true}){
 const when=run=>(...args)=>{if(live())run(...args);};
 const from=(intent,value=null)=>opened?.({intent,value});
 return {
  onTab:when(key=>{from('tab',key);if(key==='switch')toggleView();else if(key==='my-card')openPanel('card');else if(['actions','card','panels','promises'].includes(key))openPanel(key);}),
  // Pass opens "Pass your turn?" (the controller's own PASS_TURN draft); Vote opens the ballot; Voted shows Actions, where the registered ballot is.
  onHero:when(mode=>{from('hero',mode);if(mode==='pass')begin('PASS_TURN');else if(mode==='vote')begin('VOTE');else if(mode==='voted')openPanel('actions');}),
  onPromises:when(()=>{from('promises');openPanel('promises');}),
  onMenu:when(()=>{from('menu');openPanel('settings');}),
  onCancelTarget:when(()=>dismiss()),
  onChip:when(id=>{from('chip',id);if(id==='list')openList();else if(id==='board')showBoard();}),
  onRetry:when(()=>reconnect?.()),
  onSheetAction:when(id=>{if(id==='confirm')confirm();else if(id==='cancel')dismiss();}),
  onSheetBack:when(()=>openPanel('panels')),
  onSheetClose:when(sheetId=>{if(sheetId==='target-list')closeList();else dismiss();}),
  onLayout:when(next=>layout?.(next)),
  onFocusReturn:when(detail=>focusReturn?.(detail)),
 };
}

/**
 * Where the focus goes when the shell hands it back (onFocusReturn: the focused control ended, as a sheet closed):
 * Cancel while choosing on the scene; else the control that opened it, as a dialog returns the focus to its opener;
 * else the first tab, as today's Escape did. Each is a selector inside the shell, tried in order.
 */
export function shellFocusOrder(opener,{choosing=false}={}){
 const order=choosing?['[data-intent="cancel-target"]']:[];
 if(opener?.intent==='tab'&&opener.value)order.push(`[data-intent="tab"][data-value="${opener.value}"]`);
 else if(['hero','promises','menu','chip'].includes(opener?.intent))order.push(`[data-intent="${opener.intent}"]`);
 order.push('[data-intent="tab"][data-value="switch"]');
 return order;
}

/** Whether the shell's own motion runs: the page is shown and the window has the focus. */
export const shellRuns=({visible,blurred})=>!!visible&&!blurred;

/**
 * The renderer's page and window listeners, registered at once and removed together: visibility, Reduce motion,
 * art, preferences, resize, blur and focus. `on` maps each to its handler. Returns the dispose.
 */
export function connectShellLifecycle({doc,win,media,root},on){
 const pairs=[[root,'click',on.click],[root,'keydown',on.keydown],[doc,'visibilitychange',on.visibility],[doc,'mothership:art-ready',on.art],[doc,'mothership:preferences-change',on.preferences],
  [media,'change',on.motion],[win,'resize',on.resize],[win,'blur',on.blur],[win,'focus',on.focus]].filter(([target,,handler])=>target&&handler);
 for(const [target,type,handler]of pairs)target.addEventListener(type,handler);
 let done=false;
 return ()=>{if(done)return;done=true;for(const [target,type,handler]of pairs)target.removeEventListener(type,handler);};
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {connectShellLifecycle,ownOut,ownTalk,shellFocusOrder,shellBanner,shellBar,shellChip,shellHandlers,shellHero,shellInput,shellPhaseFacts,shellPicking,shellRuns,shellSheet,shellStatus,shellTabs,shellTarget,shellTimer,shellToast,talkButtons,
 SHELL_PHASE_ICONS,SHELL_PHASE_NAMES} from '../hosted/planet/shell-input.mjs';
import {checkBar,checkTabs,clockText,nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';
import {PHASE_BAR_PHASES,PHASE_BAR_REFUSED,loadingBar,phaseBar,reconnectingBar} from '../../../design/phone-ui/components/phone-shell/phase-bars.mjs';

// The match's frame on a phone is Designer's phone shell (the owner's plan of 16 November 2026, release 2).
// These cover the game's side: what it gives the shell for each state, whose data reaches it, the intents'
// calls and the lifecycle's listeners. The shell's own checkers (checkBar, checkTabs, nextPhoneShellInput)
// accept every input built here.
const seat=(n,location,slotId,more={})=>({seatId:`seat-${n}`,location,slotId,health:'Healthy',jailed:false,...more});
const seats=[seat(1,'Room A','A1'),seat(2,'Room A','A2'),seat(3,'Room A','A3'),seat(4,'Room B','B1'),seat(5,'Room B','B2'),seat(6,'Room B','B3'),
 seat(7,'Hospital','H1',{health:'Injured'}),seat(8,'Jail','J1',{jailed:true}),seat(9,null,null,{health:'Eliminated'})];
const identities=seats.map((s,i)=>({seatId:s.seatId,characterId:`c${i+1}`,displayName:`Crew ${i+1}`}));
const turn={id:'turn-1',kind:'ORDINARY_TURN',startedAt:0,endsAt:60000,nowMs:18000,remainingMs:42000,trusted:true,expired:false};
function model(over={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions:{assetManifestVersion:'design-0.8.0'},playerCount:9,connection:'live',message:null,concealed:false,dark:false,round:3,boardLabel:null,
  phase:turn,activeSeatId:'seat-5',offices:{captainSeatId:'seat-5',officerSeatId:null,blockedSeatId:null},board:{seats},identities,talk:null,lastTally:null,
  panel:'board',action:null,canPass:false,canMove:false,canVote:false,ownBallot:null,promiseOfferCount:0,privateArea:null,recovery:null,food:null,...over};
}
const phase=(kind,more={})=>({...turn,id:`p-${kind}`,kind,...more});
const action=(type,step,values,more={})=>({type,label:more.label??type,step,choices:values.map(value=>({value,label:value})),selected:[],prompt:more.prompt??'Choose an offered character on the board.',confirmation:null,canConfirm:false,...more});
/** What the shell keeps of an input (its own checks), from its defaults. */
const kept=input=>nextPhoneShellInput(PHONE_SHELL_DEFAULTS,input);

test('the bar: another player\'s turn, your turn, a phase, the pair, the Blackout\'s dark and reconnecting',()=>{
 const other=shellBar(model());
 assert.deepEqual(other,{kind:'turn',who:{seat:'seat-5',name:'Crew 5',character:'c5'},self:false,round:3,timer:{remainingMs:42000,urgentAtMs:10000,ring:null},promises:{count:0,open:false},menu:{open:false}});
 assert.equal(checkBar(other).who.name,'Crew 5');
 const own=shellBar(model({activeSeatId:'seat-4',canPass:true}));
 assert.equal(own.kind,'turn');assert.equal(own.self,true);assert.deepEqual(own.who,{seat:'seat-4',name:'Crew 4',character:'c4'});
 // A seat without a display name keeps the bar's "Player n", as the header did; no character, no portrait.
 assert.deepEqual(shellBar(model({identities:[]})).who,{seat:'seat-5',name:'Player 5',character:null});
 // The game's own phase bars (the votes, Food Supply, the talk for those not in it): today's names, the pack's
 // icons, the board's label as the line under the name.
 const vote=shellBar(model({phase:phase('JAIL_VOTE'),activeSeatId:null,boardLabel:'After Blackout · Round 3'}));
 assert.deepEqual({kind:vote.kind,title:vote.title,icon:vote.icon,sub:vote.sub,tone:vote.tone},{kind:'phase',title:'Jail vote',icon:'vote',sub:'After Blackout · Round 3',tone:null});
 for(const [kind,name]of Object.entries(SHELL_PHASE_NAMES))assert.equal(checkBar(shellBar(model({phase:phase(kind),activeSeatId:kind==='ORDINARY_TURN'?null:'seat-5'}))).title,name,kind);
 // The Blackout: lit, then the dark bar (tone dark, the moon), with the pack's lines and never the board's label.
 assert.deepEqual((({icon,tone,title})=>({icon,tone,title}))(shellBar(model({phase:phase('BLACKOUT'),activeSeatId:null,boardLabel:'Before Blackout · Round 3'}))),{icon:'lit',tone:undefined,title:'Blackout'});
 const dark=shellBar(model({phase:phase('BLACKOUT'),dark:true,board:null,identities:[],activeSeatId:null,boardLabel:'Before Blackout · Round 3'}));
 assert.deepEqual((({kind,icon,tone,title,sub})=>({kind,icon,tone,title,sub}))(dark),{kind:'phase',icon:'dark',tone:'dark',title:'Blackout',sub:'Dark · positions fixed'});
 assert.equal(checkBar(dark).tone,'dark');
 // An ordinary turn in the dark is never a turn bar: no stale portrait.
 assert.equal(shellBar(model({dark:true})).kind,'phase');
 // The pair on the two talking phones only; others see the phase.
 const talk={id:'talk-1',actorSeatId:'seat-4',targetSeatId:'seat-1'};
 const pair=shellBar(model({phase:phase('HACK'),activeSeatId:null,talk}));
 assert.equal(pair.kind,'pair');assert.deepEqual(pair.pair.map(p=>p.name),['Crew 4','Crew 1']);assert.equal(pair.sub,'Private talk');assert.equal(checkBar(pair).pair.length,2);
 assert.equal(shellBar(model({phase:phase('HACK_DECLARE'),activeSeatId:null,talk})).sub,'Declare side');
 assert.equal(shellBar(model({phase:phase('HACK'),activeSeatId:null,talk,ownSeatId:'seat-6'})).kind,'phase');
 // Reconnecting: the phase bar the pack draws (sheet 45), naming the round this phone last saw.
 const stale=shellBar(model({connection:'stale',phase:null,round:null,board:null,identities:[]}),{lastRound:3});
 assert.deepEqual(stale,{kind:'phase',icon:'retry',title:'Reconnecting…',sub:'Showing Round 3 as last seen',round:3,promises:{count:0,open:false},menu:{open:false}});
 assert.deepEqual(stale,reconnectingBar({round:3,promises:{count:0,open:false},menu:{open:false}}),'the words are phase-bars.mjs\'s');
 assert.equal(checkBar(stale).timer,null);
 // With no round seen yet, the title alone; an error reads the same as any reconnecting.
 assert.deepEqual(shellBar(model({connection:'error',phase:null,round:null})),{kind:'phase',icon:'retry',title:'Reconnecting…',promises:{count:0,open:false},menu:{open:false}});
 // Connecting again after a round was seen is reconnecting; a shared display's bar has no Promises.
 assert.equal(shellBar(model({connection:'connecting',phase:null,round:null}),{lastRound:3}).title,'Reconnecting…');
 assert.deepEqual(shellBar(model({connection:'stale',surface:'display',ownSeatId:null,phase:null,round:null}),{lastRound:3}),reconnectingBar({round:3,menu:{open:false}}));
 // The first connect, before this phone has seen a round: the pack's Loading bar (sheet 45), with no round, clock,
 // Promises or ⋮. The model holds no count of pictures, so it is the title alone.
 const first=shellBar(model({connection:'connecting',phase:null,round:null}));
 assert.deepEqual(first,{kind:'phase',icon:'hourglass',title:'Loading the ship'});
 assert.deepEqual(first,loadingBar());
 assert.deepEqual((({round,timer,promises,menu})=>({round,timer,promises,menu}))(checkBar(first)),{round:null,timer:null,promises:null,menu:null});
});

test('a phase with no active player: Designer\'s words (phase-bars.mjs), from facts the model already holds',()=>{
 const player={promises:{count:0,open:false},menu:{open:false}};
 const bar=(over={})=>shellBar(model({activeSeatId:null,...over}));
 const words=b=>[b.icon,b.title,b.sub??null];
 // Before turns: an Officer and no block; a block shown; no Officer (Round 1); and the Officer's own choice open.
 const officers={captainSeatId:'seat-5',officerSeatId:'seat-4',blockedSeatId:null};
 assert.deepEqual(bar({phase:phase('PRE_TURN',{endsAt:15000,remainingMs:12000}),offices:officers}),
  {kind:'phase',icon:'hourglass',title:'Before turns',sub:'Officer block · Blackhole',round:3,timer:{remainingMs:12000},...player});
 assert.deepEqual(words(bar({phase:phase('PRE_TURN'),offices:{...officers,blockedSeatId:'seat-2'}})),['hourglass','Before turns','Turns start at 0:00']);
 assert.deepEqual(words(bar({phase:phase('PRE_TURN'),offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null}})),['hourglass','Before turns','Turns start at 0:00']);
 assert.deepEqual(words(bar({phase:phase('PRE_TURN'),offices:null})),['hourglass','Before turns','Turns start at 0:00']);
 const block=action('BLOCK_MOVE','targets',['seat-1','seat-2','seat-3'],{label:'Block movement'});
 assert.deepEqual(words(bar({phase:phase('PRE_TURN'),offices:officers,action:block})),['officer','Block a move','Before turns · Officer']);
 // The board's label is no longer a phase's line here: the pack's line is.
 assert.equal(bar({phase:phase('PRE_TURN'),offices:officers,boardLabel:'Round 2 complete'}).sub,'Officer block · Blackhole');
 // The Officer's appointment: everyone else's names the Captain and is never amber; the Captain's own, with the
 // appointment open, keeps the amber.
 const others=bar({phase:phase('OFFICER_APPOINTMENT',{endsAt:30000,remainingMs:9000})});
 assert.deepEqual(others,{kind:'phase',icon:'officer',title:'New Officer',sub:'Crew 5 chooses',round:3,timer:{remainingMs:9000,urgentAtMs:-1},...player});
 assert.equal(bar({phase:phase('OFFICER_APPOINTMENT'),identities:[]}).sub,'Player 5 chooses');
 assert.equal(bar({phase:phase('OFFICER_APPOINTMENT'),offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null}}).sub,undefined,'no Captain named, the title alone');
 const appoint=action('APPOINT_OFFICER','targets',['seat-1','seat-2'],{label:'Appoint Officer'});
 const captain=bar({phase:phase('OFFICER_APPOINTMENT',{endsAt:30000,remainingMs:9000}),ownSeatId:'seat-5',action:appoint});
 assert.deepEqual(words(captain),['officer','Appoint Officer','Random if time runs out']);assert.deepEqual(captain.timer,{remainingMs:9000});
 // The Captain's phone before the appointment is opened shows everyone's bar: the bar follows what is open.
 assert.deepEqual(words(bar({phase:phase('OFFICER_APPOINTMENT'),ownSeatId:'seat-5'})),['officer','New Officer','Crew 5 chooses']);
 // The Blackout: lit, the time to lights-out from the preview's end and the trusted time; then dark.
 const blackout=phase('BLACKOUT',{startedAt:0,endsAt:15000,nowMs:2000,remainingMs:13000});
 const presentation={nowMs:2000,startedAt:0,endsAt:15000,events:[],blackout:{windowId:'p-BLACKOUT',previewEndsAt:5000,endsAt:15000},clone:null};
 assert.deepEqual(bar({phase:blackout,presentation}),{kind:'phase',icon:'lit',title:'Blackout',sub:'Lights out in 0:03',round:3,timer:{remainingMs:13000},...player});
 assert.equal(bar({phase:blackout,presentation:{...presentation,nowMs:3001}}).sub,'Lights out in 0:02');
 assert.equal(bar({phase:blackout,presentation:null}).sub,undefined,'no trusted time: the title alone');
 assert.deepEqual(bar({phase:{...blackout,nowMs:7000,remainingMs:8000},presentation:{...presentation,nowMs:7000},dark:true}),
  {kind:'phase',icon:'dark',title:'Blackout',sub:'Dark · positions fixed',tone:'dark',round:3,timer:{remainingMs:8000},...player});
 // Ship synchronized: the ring of the share gone, never amber, ⋮ and no Promises.
 assert.deepEqual(bar({phase:phase('BLACKHOLE_PRESENTATION',{startedAt:0,endsAt:6000,remainingMs:4000})}),
  {kind:'phase',icon:'blackhole',title:'Ship synchronized',round:3,timer:{remainingMs:4000,urgentAtMs:-1,ring:1/3},menu:{open:false}});
 // Setting course, in all four navigation phases: neutral and never amber for everyone; an office's own while its
 // Navigation is open, the page or one of its two actions.
 for(const kind of ['NAV_SETTING','NAV_TIE','NAV_CAPTAIN_CONFIRM','NAV_OFFICER_CONFIRM']){
  const everyone=bar({phase:phase(kind,{endsAt:15000,remainingMs:9000}),boardLabel:'Round 3 complete'});
  assert.deepEqual(words(everyone),['course','Setting course','The offices are setting it'],kind);assert.equal(everyone.timer.urgentAtMs,-1,kind);
 }
 const captainSeat={ownSeatId:'seat-5'},officerSeat={ownSeatId:'seat-4',offices:officers};
 assert.equal(bar({phase:phase('NAV_SETTING'),...captainSeat}).sub,'The offices are setting it','an office with nothing of Navigation open shows everyone\'s bar');
 assert.equal(bar({phase:phase('NAV_SETTING'),...captainSeat,panel:'navigation'}).sub,'Captain · private');
 assert.equal(bar({phase:phase('NAV_SETTING'),...officerSeat,panel:'navigation'}).sub,'Officer · private');
 assert.equal(bar({phase:phase('NAV_SETTING'),...officerSeat,action:action('CHOOSE_NAV_DIRECTION','targets',['Blue','Red'])}).sub,'Officer · private');
 assert.equal(bar({phase:phase('NAV_CAPTAIN_CONFIRM'),...captainSeat,action:action('CONFIRM_NAVIGATION','confirm',[])}).sub,'Captain · private');
 assert.deepEqual(bar({phase:phase('NAV_SETTING',{endsAt:15000,remainingMs:9000}),...captainSeat,panel:'navigation'}).timer,{remainingMs:9000},'an office\'s own keeps the amber');
 // Someone who holds no office sees everyone's bar, whatever they have open.
 assert.equal(bar({phase:phase('NAV_SETTING'),panel:'navigation'}).sub,'The offices are setting it');
 // A shared display: the same words, no Promises, and never an own bar.
 const display=shellBar(model({surface:'display',ownSeatId:null,activeSeatId:null,phase:phase('PRE_TURN'),offices:officers,action:block}));
 assert.deepEqual(words(display),['hourglass','Before turns','Officer block · Blackhole']);assert.equal(display.promises,undefined);assert.deepEqual(display.menu,{open:false});
 // Untrusted time is no clock, as on every bar; the shell takes each of these bars.
 assert.equal(bar({phase:phase('PRE_TURN',{trusted:false,remainingMs:null})}).timer,undefined);
 for(const kind of PHASE_BAR_PHASES)assert.equal(checkBar(bar({phase:phase(kind)})).kind,'phase',kind);
});

test('the facts for a phase bar: each read from the model, none from an offer, a role or a rule',()=>{
 const base={own:false,chooser:{name:'Crew 5'},hasOfficer:false,blocked:false,dark:false,lightsOutMs:null,office:null};
 assert.deepEqual(shellPhaseFacts(model({phase:phase('PRE_TURN')})),base);
 assert.deepEqual(shellPhaseFacts(model({phase:phase('PRE_TURN'),offices:null})),{...base,chooser:null});
 assert.deepEqual(shellPhaseFacts(model({phase:null,offices:null})),{...base,chooser:null});
 // Only what is open on this phone makes a bar its own: an offer alone, or the private area, changes nothing.
 const private_={privateArea:{offers:[{type:'BLOCK_MOVE'},{type:'APPOINT_OFFICER'},{type:'ACTIVATE_BLACKHOLE'},{type:'CONFIRM_NAVIGATION'}],navigation:{position:'B2',direction:'Red',tieChoice:true,confirmation:'CAPTAIN'},
  role:{name:'Alien',faction:'Alien'},blackoutTargeting:{selectable:true}}};
 for(const kind of PHASE_BAR_PHASES){
  const plain=model({phase:phase(kind),activeSeatId:null,ownSeatId:'seat-5'});
  assert.deepEqual(shellPhaseFacts({...plain,...private_}),shellPhaseFacts(plain),kind);
  assert.deepEqual(shellBar({...plain,...private_}),shellBar(plain),kind);
 }
 // The action that makes a phase's bar its own is that phase's: another phase's draft does not.
 assert.equal(shellPhaseFacts(model({phase:phase('PRE_TURN'),action:action('APPOINT_OFFICER','targets',['seat-1'])})).own,false);
 assert.equal(shellPhaseFacts(model({phase:phase('OFFICER_APPOINTMENT'),action:action('BLOCK_MOVE','targets',['seat-1'])})).own,false);
 assert.equal(shellPhaseFacts(model({phase:phase('BLACKOUT'),action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])})).own,false,'a Disabler\'s position never changes the public Blackout bar');
 assert.equal(shellPhaseFacts(model({phase:phase('PRE_TURN'),action:action('ACTIVATE_BLACKHOLE','confirm',[])})).own,false,'nor the Alien\'s Blackhole the bar before turns');
 // The lights-out time needs the presentation's trusted time and the Blackout's own preview end; dark, it is not given.
 const presentation={nowMs:4200,startedAt:0,endsAt:15000,events:[],blackout:{windowId:'w',previewEndsAt:5000,endsAt:15000},clone:null};
 assert.equal(shellPhaseFacts(model({phase:phase('BLACKOUT'),presentation})).lightsOutMs,800);
 assert.equal(shellPhaseFacts(model({phase:phase('BLACKOUT'),presentation,dark:true})).lightsOutMs,null);
 assert.equal(shellPhaseFacts(model({phase:phase('BLACKOUT'),presentation:{...presentation,blackout:null}})).lightsOutMs,null);
 // Every phase of the contract's is drawn by phase-bars.mjs or is one of the game's own bars here, and none is both.
 for(const kind of PHASE_BAR_PHASES){assert.ok(!Object.hasOwn(SHELL_PHASE_NAMES,kind),`${kind}: its name is Designer's`);assert.ok(!Object.hasOwn(SHELL_PHASE_ICONS,kind),`${kind}: its icon too`);}
 for(const kind of Object.keys(SHELL_PHASE_NAMES))assert.ok(Object.hasOwn(PHASE_BAR_REFUSED,kind),`${kind}: phase-bars.mjs leaves it to the game`);
 assert.throws(()=>phaseBar({phase:'JAIL_VOTE'}),TypeError);
});

test('your turn and the clock: the time as given, amber from 10 s, a ring with no amber for the two fixed presentations',()=>{
 assert.deepEqual(shellTimer(model()),{remainingMs:42000,urgentAtMs:10000,ring:null});
 const last=shellTimer(model({phase:{...turn,remainingMs:8000}}));
 assert.ok(last.remainingMs<=last.urgentAtMs);assert.equal(clockText(last.remainingMs),'0:08');
 assert.ok(shellTimer(model({phase:{...turn,remainingMs:10001}})).remainingMs>10000);
 // Untrusted time is no clock at all; the shell never counts one down.
 assert.equal(shellTimer(model({phase:{...turn,trusted:false,remainingMs:null}})),null);
 assert.equal(shellBar(model({phase:{...turn,trusted:false,remainingMs:null}})).timer,null);
 // The 5 s result: a ring of the elapsed share, never amber (sheet 07), and no Promises.
 const result=model({phase:{...phase('VOTE_RESULT'),startedAt:0,endsAt:5000,remainingMs:2000},activeSeatId:null,lastTally:{kind:'JAIL_VOTE'}});
 assert.deepEqual(shellTimer(result),{remainingMs:2000,urgentAtMs:-1,ring:0.6});
 assert.equal(shellBar(result).icon,'jail');assert.equal(shellBar(result).promises,null);
 const sync=model({phase:{...phase('BLACKHOLE_PRESENTATION'),startedAt:0,endsAt:6000,remainingMs:6000},activeSeatId:null});
 assert.deepEqual(shellBar(sync).timer,{remainingMs:6000,urgentAtMs:-1,ring:0});assert.equal(shellBar(sync).promises,undefined);assert.equal(checkBar(shellBar(sync)).promises,null);assert.equal(shellBar(sync).icon,'blackhole');
 assert.equal(shellBar(model({phase:{...phase('VOTE_RESULT'),startedAt:0,endsAt:5000,remainingMs:1000},lastTally:{kind:'CAPTAIN_ELECTION'}})).icon,'captain');
});

test('Promises: the count of promises offered to this viewer, open with its sheet; none on a display',()=>{
 assert.deepEqual(shellBar(model({promiseOfferCount:2})).promises,{count:2,open:false});
 assert.deepEqual(shellBar(model({promiseOfferCount:2,panel:'promises'})).promises,{count:2,open:true});
 assert.equal(checkBar(shellBar(model({promiseOfferCount:2}))).promises.count,2);
 assert.equal(shellBar(model({surface:'display',ownSeatId:null})).promises,null);
 // ⋮ stays on a display: Settings is the one panel the controller opens there.
 assert.deepEqual(shellBar(model({surface:'display',ownSeatId:null})).menu,{open:false});
 assert.deepEqual(shellBar(model({surface:'display',ownSeatId:null,panel:'settings'})).menu,{open:true});
 assert.deepEqual(shellBar(model({panel:'settings'})).menu,{open:true});
});

test('the tabs: the view, the open tab and the round button\'s modes, usable only as the model offers',()=>{
 const tabs=shellTabs(model(),{view:'room'});
 assert.deepEqual(tabs,{variant:'game',view:'room',open:null,hero:{mode:'pass',enabled:false,busy:false}});
 // No availability or reason is given beside the offers, so every tab keeps the shell's default.
 const checked=checkTabs(tabs);
 assert.deepEqual(checked.enabled,{switch:true,actions:true,card:true,panels:true});assert.deepEqual(checked.reasons,{switch:null,actions:null,card:null,panels:null});
 assert.equal(checked.hero.enabled,false);
 assert.equal(shellTabs(model(),{view:'board'}).view,'board');
 for(const [panel,open]of [['actions','actions'],['card','card'],['panels','panels'],['windows','panels'],['players','panels'],['round-order','panels'],['navigation','panels'],['hospital','panels'],['promises',null],['settings',null],['board',null]])
  assert.equal(shellTabs(model({panel})).open,open,panel);
 // Pass: usable on this viewer's offered turn, busy while its command is sending.
 assert.deepEqual(shellHero(model({activeSeatId:'seat-4',canPass:true})),{mode:'pass',enabled:true,busy:false});
 assert.deepEqual(shellHero(model({action:action('PASS_TURN','sending',[])})),{mode:'pass',enabled:true,busy:true});
 // A ballot: Vote, usable as offered; Voted once this viewer's ballot is the phase's.
 const ballot=phase('JAIL_VOTE');
 assert.deepEqual(shellHero(model({phase:ballot,canVote:true})),{mode:'vote',enabled:true,busy:false});
 assert.deepEqual(shellHero(model({phase:ballot,canVote:false})),{mode:'vote',enabled:false,busy:false});
 assert.deepEqual(shellHero(model({phase:ballot,ownBallot:{phaseId:ballot.id,targetSeatId:'seat-2'}})),{mode:'voted',enabled:true});
 assert.equal(shellHero(model({phase:ballot,ownBallot:{phaseId:'earlier',targetSeatId:'seat-2'},canVote:true})).mode,'vote');
 assert.equal(shellHero(model({phase:phase('CAPTAIN_ELECTION'),canVote:true})).mode,'vote');
 assert.equal(checkTabs(shellTabs(model({phase:ballot,ownBallot:{phaseId:ballot.id}}))).hero.mode,'voted');
 // The 5 s result keeps the ballot's button, unavailable, as the pack draws it (sheet 38), whatever the model offers.
 assert.deepEqual(shellHero(model({phase:phase('VOTE_RESULT'),canPass:true,canVote:true})),{mode:'vote',enabled:false});
 assert.deepEqual(checkTabs(shellTabs(model({phase:phase('VOTE_RESULT')}))).hero,checkTabs({variant:'game',hero:{mode:'vote',enabled:false}}).hero);
 // The private talk's own two buttons during the 60 s talk; while the side is declared, Actions stays in reach.
 const talk={id:'talk-1',actorSeatId:'seat-4',targetSeatId:'seat-1'};
 assert.deepEqual(shellTabs(model({phase:phase('HACK'),talk,panel:'promises'})),{variant:'talk',open:'promises'});
 assert.equal(shellTabs(model({phase:phase('HACK'),talk,panel:'card'})).open,'my-card');
 assert.equal(shellTabs(model({phase:phase('HACK_DECLARE'),talk})).variant,'game');
 assert.ok(ownTalk(model({phase:phase('HACK_DECLARE'),talk})));assert.ok(!talkButtons(model({phase:phase('HACK_DECLARE'),talk})));
 assert.equal(checkTabs(shellTabs(model({phase:phase('HACK'),talk}))).variant,'talk');
});

test('the target bar and the chip, from this viewer\'s own action only',()=>{
 assert.equal(shellTarget(model()),null);
 const block=action('BLOCK_MOVE','targets',['seat-1','seat-5'],{label:'Block movement'});
 assert.ok(shellPicking(block));
 assert.deepEqual(shellTarget(model({action:block})),{icon:'block',title:'Block movement',sub:'Choose an offered character on the board.'});
 // A move's room or position, and the Blackout's fixed position in the dark (sheet 30), are chosen on the scene too.
 assert.deepEqual(shellTarget(model({action:action('MOVE','slots',['B5'],{label:'Move',prompt:'Choose an empty position in Room B.'})})),{icon:'move',title:'Move',sub:'Choose an empty position in Room B.'});
 assert.equal(shellTarget(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1'],{label:'Choose fixed slot'})})).icon,'position');
 // A ballot, a code and the panel's number are chosen in a sheet, not on the scene.
 for(const type of ['VOTE','SUBMIT_CODE','PANEL_CODE'])assert.equal(shellTarget(model({action:action(type,'targets',['seat-1'])})),null,type);
 // At the check, the target bar gives way to the sheet.
 assert.equal(shellTarget(model({action:action('BLOCK_MOVE','confirm',[])})),null);
 // The chip: people offered in other rooms, counted on the public board; on the board, the same choice as a list.
 assert.deepEqual(shellChip(model({action:block}),{view:'room',room:'room-b'}),{id:'board',label:'Other rooms · 1',icon:'board',tone:'paper'});
 assert.equal(shellChip(model({action:action('BLOCK_MOVE','targets',['seat-5','seat-6'])}),{view:'room',room:'room-b'}),null);
 assert.deepEqual(shellChip(model({action:block}),{view:'board',room:'room-b'}),{id:'list',label:'List',icon:'players',tone:'paper'});
 assert.equal(shellChip(model({action:action('MOVE','slots',['B5'])}),{view:'room',room:'room-b'}).label,'Other rooms on the Board');
 assert.equal(shellChip(model({action:action('MOVE','slots',['B5'])}),{view:'board'}),null);
 assert.equal(shellChip(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])}),{view:'room',room:'room-a'}),null);
 // Someone off the board is offered in the stage's own list (Off board), not counted in another room.
 assert.equal(shellChip(model({action:action('BLOCK_MOVE','targets',['seat-5','seat-9'])}),{view:'room',room:'room-b'}),null);
});

test('banners: reconnecting, the phone\'s (busy while a receipt is checked); an eliminated player\'s own',()=>{
 assert.equal(shellBanner(model()),null);
 assert.deepEqual(shellBanner(model({connection:'stale'})),{kind:'reconnecting',busy:false});
 assert.deepEqual(shellBanner(model({connection:'error',recovery:{status:'checking',canCheck:false,canRetry:false}})),{kind:'reconnecting',busy:true});
 const out=model({board:{seats:seats.map(s=>s.seatId==='seat-4'?{...s,health:'Eliminated'}:s)}});
 assert.deepEqual(shellBanner(out),{kind:'out'});assert.ok(ownOut(out));assert.ok(!ownOut({...out,surface:'display',ownSeatId:null}));
 // Reconnecting takes its place, since Retry is the way back.
 assert.deepEqual(shellBanner({...out,connection:'stale'}),{kind:'reconnecting',busy:false});
 // Another player's elimination is not this viewer's banner; nor is the display's.
 assert.equal(shellBanner(model({ownSeatId:'seat-1',board:out.board})),null);
 assert.equal(shellBanner(model({surface:'display',ownSeatId:null,board:out.board})),null);
 assert.equal(kept({viewer:'seat-4',banner:shellBanner(out)}).banner.kind,'out');
 // An eliminated player keeps the Board, Card and Panels; Actions is unavailable with its reason, and Pass (sheet 44).
 const input=shellInput(out,{view:'room',room:'room-b'});
 assert.equal(input.banner.kind,'out');assert.equal(input.tabs.hero.enabled,false);
 const tabs=checkTabs(input.tabs);
 assert.deepEqual(tabs.enabled,{switch:true,actions:false,card:true,panels:true});
 assert.equal(tabs.reasons.actions,'You’re out. You can still watch.');
 // Another player's elimination changes none of this viewer's tabs.
 assert.deepEqual(checkTabs(shellInput(model({ownSeatId:'seat-1',board:out.board})).tabs).enabled,{switch:true,actions:true,card:true,panels:true});
});

test('a pass: "Pass your turn?" with Cancel and Pass, then the registration once, as a toast',()=>{
 const confirm=model({activeSeatId:'seat-4',action:action('PASS_TURN','confirm',[],{label:'Pass',confirmation:'Pass?',canConfirm:true,prompt:'Pass'})});
 const sheet=shellSheet(confirm);
 assert.deepEqual(sheet,{id:'pass',kind:'pass',title:'Pass your turn?',sub:null,back:false,close:false,detent:'auto',
  actions:[{id:'cancel',label:'Cancel',kind:'secondary',local:true},{id:'confirm',label:'Pass',kind:'primary',icon:'pass',enabled:true,busy:false}]});
 assert.equal(kept({viewer:'seat-4',sheet}).sheet.actions[0].local,true);
 const sending=shellSheet(model({action:action('PASS_TURN','sending',[],{prompt:'Registering…'})}));
 assert.deepEqual(sending.actions[1],{id:'confirm',label:'Pass',kind:'primary',icon:'pass',enabled:true,busy:true});
 const accepted=model({action:action('PASS_TURN','accepted',[],{prompt:'Registered. Waiting for the authoritative view.'})});
 assert.equal(shellSheet(accepted),null);
 assert.deepEqual(shellToast(accepted),{id:'pass:turn-1',text:'Registered. Waiting for the authoritative view.',icon:'info'});
 assert.equal(shellToast(confirm),null);assert.equal(shellToast({...accepted,surface:'display'}),null);
});

test('the sheet\'s frame for each open panel and action; the body stays the game\'s',()=>{
 assert.equal(shellSheet(model()),null);
 const titles={actions:'Actions',card:'Your role',panels:'Panels',promises:'Promises',windows:'Windows',navigation:'Navigation',hospital:'Hospital panel',players:'Players','round-order':'Round order',settings:'Settings'};
 for(const [panel,title]of Object.entries(titles)){const f=shellSheet(model({panel}));assert.equal(f.title,title,panel);assert.equal(f.id,panel);assert.equal(f.close,true);assert.ok(kept({viewer:'seat-4',sheet:f}).sheet);}
 // Panels' own pages go back to Panels (sheet 27.5).
 for(const panel of ['windows','navigation','hospital','players','round-order'])assert.equal(shellSheet(model({panel})).back,true,panel);
 for(const panel of ['actions','card','panels','promises','settings'])assert.equal(shellSheet(model({panel})).back,false,panel);
 assert.equal(shellSheet(model({panel:'card'})).sub,'Only on this phone');assert.equal(shellSheet(model({panel:'card'})).detent,'large');
 assert.equal(shellSheet(model({panel:'windows'})).sub,'Unverified claims · Expires after Round 3');
 // The dark, a closed phase and an unknown outcome, as today's sheet titled them.
 assert.equal(shellSheet(model({panel:'actions',dark:true})).title,'Blackout');
 assert.equal(shellSheet(model({panel:'card',phase:{...turn,expired:true}})).title,'Waiting for the server');
 assert.equal(shellSheet(model({recovery:{status:'unknown',canCheck:true,canRetry:false}})).title,'Outcome unknown');
 // An action at its check: its name, and the controller's own confirmation as the footer's Register.
 const check=shellSheet(model({panel:'actions',action:action('RESCUE','confirm',[],{label:'Rescue',canConfirm:true})}));
 assert.deepEqual([check.id,check.title,check.actions],['action:RESCUE','Rescue',[{id:'confirm',label:'Register',kind:'primary'}]]);
 assert.deepEqual(shellSheet(model({action:action('RESCUE','confirm',[],{label:'Rescue',canConfirm:false})})).actions,[]);
 const ballotSheet=shellSheet(model({phase:phase('JAIL_VOTE'),action:action('VOTE','targets',['seat-1','abstain'],{label:'Vote'})}));
 // The ballot is titled by its vote (sheet 35), large; its choices are the game's own body until the ballot's component.
 assert.deepEqual([ballotSheet.title,ballotSheet.detent,ballotSheet.actions],['Jail vote','large',[]]);
 assert.equal(shellSheet(model({phase:phase('CAPTAIN_ELECTION'),action:action('VOTE','targets',['seat-1'],{label:'Vote'})})).title,'Captain vote');
 assert.equal(shellSheet(model({action:action('VOTE','confirm',[],{label:'Vote',canConfirm:true})})).actions[0].label,'Vote');
 // Choosing on the scene shows no sheet, unless the board's List is open.
 const block=action('BLOCK_MOVE','targets',['seat-1'],{label:'Block movement'});
 assert.equal(shellSheet(model({action:block})),null);
 assert.deepEqual((({id,kind,title})=>({id,kind,title}))(shellSheet(model({action:block}),{listOpen:true})),{id:'target-list',kind:'target-list',title:'Block movement'});
});

test('concealed, and under the Food surface: the shell keeps its shape and drops this viewer\'s inputs',()=>{
 assert.equal(shellStatus(model()),'live');
 for(const connection of ['connecting','stale','error'])assert.equal(shellStatus(model({connection})),'stale');
 assert.equal(shellStatus(model({concealed:true,connection:'stale'})),'concealed');
 assert.equal(shellStatus(model(),{food:{active:true,exclusive:false}}),'concealed');
 assert.equal(shellStatus(model(),{food:{active:false,exclusive:true}}),'concealed');
 const open=model({activeSeatId:'seat-4',canPass:true,promiseOfferCount:2,panel:'actions',action:action('BLOCK_MOVE','targets',['seat-1'])});
 const live=shellInput(open,{view:'room',room:'room-b'});
 assert.ok(live.target&&live.tabs&&live.bar.promises.count===2);
 for(const food of [null,{active:true,exclusive:false},{active:true,exclusive:true}]){
  const subject=food?open:{...open,concealed:true};
  const input=shellInput(subject,{view:'room',room:'room-b',food});
  assert.equal(input.status,'concealed');
  for(const key of ['target','chip','banner','toast','sheet'])assert.equal(input[key],null,key);
  // The tabs are given, so the bar keeps its shape; the shell drops them and the count itself.
  assert.equal(input.tabs.variant,'game');
  const shown=kept(input);
  assert.equal(shown.tabs,null);assert.equal(shown.shape,'game');assert.equal(shown.bar.promises,null);
 }
});

test('a shared display: no tabs, no viewer, ⋮ and Settings only, and nothing private',()=>{
 const display=model({surface:'display',ownSeatId:null,panel:'board',activeSeatId:'seat-5',promiseOfferCount:3,canPass:true,
  action:action('BLOCK_MOVE','targets',['seat-1']),privateArea:{offers:[{type:'PASS_TURN'}]},board:{seats:seats.map(s=>s.seatId==='seat-4'?{...s,health:'Eliminated'}:s)}});
 const input=shellInput(display,{view:'board',room:'room-b'});
 assert.equal(input.viewer,null);assert.equal(input.tabs,null);
 for(const key of ['target','chip','toast','sheet'])assert.equal(input[key],null,key);
 assert.equal(input.banner,null);
 assert.equal(input.bar.kind,'turn');assert.equal(input.bar.self,false);assert.equal(input.bar.promises,null);assert.deepEqual(input.bar.menu,{open:false});
 assert.ok(!JSON.stringify(input).includes('PASS_TURN'));
 // It takes taps, for its only controls: ⋮, the Settings sheet and Retry.
 assert.equal(input.interactive,true);assert.equal(kept(input).interactive,true);
 const settings=shellInput({...display,panel:'settings'},{view:'board'});
 assert.deepEqual((({id,title,back,close,actions})=>({id,title,back,close,actions}))(settings.sheet),{id:'settings',title:'Settings',back:false,close:true,actions:[]});
 for(const panel of ['actions','card','panels','promises','windows','players'])assert.equal(shellSheet({...display,panel}),null,panel);
 assert.equal(shellSheet({...display,panel:'settings',concealed:true}),null);
 // Its reconnecting banner is the phone's, and the display's too.
 assert.equal(shellInput({...display,connection:'stale'},{view:'board'}).banner.kind,'reconnecting');
});

test('every intent reaches the call the game already makes, and nothing after dispose',()=>{
 const calls=[],openers=[];let live=true;
 const handlers=shellHandlers({live:()=>live,opened:o=>openers.push(o),
  openPanel:p=>calls.push(['openPanel',p]),begin:t=>calls.push(['begin',t]),confirm:()=>calls.push(['confirm']),dismiss:()=>calls.push(['dismiss']),
  toggleView:()=>calls.push(['toggleView']),showBoard:()=>calls.push(['showBoard']),openList:()=>calls.push(['openList']),closeList:()=>calls.push(['closeList']),
  reconnect:()=>calls.push(['reconnect']),layout:l=>calls.push(['layout',l.stage.height]),focusReturn:d=>calls.push(['focusReturn',d.intent])});
 handlers.onTab('switch');handlers.onTab('actions');handlers.onTab('card');handlers.onTab('panels');handlers.onTab('promises');handlers.onTab('my-card');handlers.onTab('elsewhere');
 handlers.onHero('pass');handlers.onHero('vote');handlers.onHero('voted');
 handlers.onPromises();handlers.onMenu();handlers.onCancelTarget();handlers.onChip('board');handlers.onChip('list');handlers.onRetry();
 handlers.onSheetAction('confirm','pass');handlers.onSheetAction('cancel','pass');handlers.onSheetAction('elsewhere','pass');
 handlers.onSheetBack('windows');handlers.onSheetClose('actions');handlers.onSheetClose('target-list');
 handlers.onLayout({stage:{width:390,height:653}});handlers.onFocusReturn({intent:'sheet-close',value:null});
 assert.deepEqual(calls,[['toggleView'],['openPanel','actions'],['openPanel','card'],['openPanel','panels'],['openPanel','promises'],['openPanel','card'],
  ['begin','PASS_TURN'],['begin','VOTE'],['openPanel','actions'],
  ['openPanel','promises'],['openPanel','settings'],['dismiss'],['showBoard'],['openList'],['reconnect'],
  ['confirm'],['dismiss'],['openPanel','panels'],['dismiss'],['closeList'],['layout',653],['focusReturn','sheet-close']]);
 // No intent sends a command by itself: Pass and Vote open the controller's own draft, which checks the offer.
 assert.ok(!calls.some(([name])=>name==='send'));
 // The controls that open something are heard, so the focus can go back to them.
 assert.deepEqual(openers.map(o=>`${o.intent}:${o.value}`),['tab:switch','tab:actions','tab:card','tab:panels','tab:promises','tab:my-card','tab:elsewhere','hero:pass','hero:vote','hero:voted','promises:null','menu:null','chip:board','chip:list']);
 live=false;calls.length=0;
 for(const [name,fn]of Object.entries(handlers))fn(name==='onLayout'?{stage:{height:1}}:name==='onFocusReturn'?{intent:'x'}:'actions');
 assert.deepEqual(calls,[]);
 // Without a reconnect, Retry does nothing.
 assert.doesNotThrow(()=>shellHandlers({}).onRetry());
});

test('the focus handed back: Cancel while choosing, else the control that opened it, else the first tab',()=>{
 const first='[data-intent="tab"][data-value="switch"]';
 assert.deepEqual(shellFocusOrder(null),[first]);
 assert.deepEqual(shellFocusOrder({intent:'tab',value:'actions'}),['[data-intent="tab"][data-value="actions"]',first]);
 assert.deepEqual(shellFocusOrder({intent:'hero',value:'pass'}),['[data-intent="hero"]',first]);
 for(const intent of ['promises','menu','chip'])assert.deepEqual(shellFocusOrder({intent,value:null}),[`[data-intent="${intent}"]`,first]);
 assert.deepEqual(shellFocusOrder({intent:'tab',value:'card'},{choosing:true}),['[data-intent="cancel-target"]','[data-intent="tab"][data-value="card"]',first]);
 // An intent the shell never reports opens nothing to return to.
 assert.deepEqual(shellFocusOrder({intent:'sheet-close',value:null}),[first]);
});

test('lifecycle: the renderer\'s listeners are added together and dispose leaves none; the shell\'s motion runs only when shown and focused',()=>{
 const counting=()=>{const target=new EventTarget(),live=new Set(),add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
  target.addEventListener=(type,fn,options)=>{live.add(`${type}`);add(type,fn,options);};
  target.removeEventListener=(type,fn,options)=>{live.delete(`${type}`);remove(type,fn,options);};
  target.live=live;return target;};
 const doc=counting(),win=counting(),media=counting(),root=counting(),seen=[];
 const on=Object.fromEntries(['click','keydown','visibility','art','preferences','motion','resize','blur','focus'].map(name=>[name,()=>seen.push(name)]));
 const dispose=connectShellLifecycle({doc,win,media,root},on);
 assert.deepEqual([...doc.live].sort(),['mothership:art-ready','mothership:preferences-change','visibilitychange']);
 assert.deepEqual([...win.live].sort(),['blur','focus','resize']);
 assert.deepEqual([...media.live],['change']);assert.deepEqual([...root.live].sort(),['click','keydown']);
 for(const [target,type]of [[doc,'visibilitychange'],[win,'blur'],[win,'focus'],[media,'change'],[root,'click']])target.dispatchEvent(new Event(type));
 assert.deepEqual(seen,['visibility','blur','focus','motion','click']);
 dispose();dispose();
 for(const target of [doc,win,media,root])assert.equal(target.live.size,0);
 seen.length=0;
 for(const [target,type]of [[doc,'visibilitychange'],[win,'resize'],[media,'change'],[root,'keydown']])target.dispatchEvent(new Event(type));
 assert.deepEqual(seen,[]);
 assert.equal(shellRuns({visible:true,blurred:false}),true);
 assert.equal(shellRuns({visible:false,blurred:false}),false);
 assert.equal(shellRuns({visible:true,blurred:true}),false);
});

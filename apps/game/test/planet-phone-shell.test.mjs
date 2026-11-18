import assert from 'node:assert/strict';
import test from 'node:test';
import {connectShellLifecycle,createServerClock,ownOut,ownTalk,phaseClosed,roundStart,shellFocusOrder,shellBanner,shellBar,shellChip,shellHandlers,shellHostSheet,shellHero,shellInput,shellPhaseFacts,shellPicking,shellRuns,shellSheet,shellStatus,shellTabs,shellTarget,shellTimer,shellToast,talkButtons,
 SHELL_CHOOSING,SHELL_CLOSES_ITSELF,SHELL_PHASE_ICONS,SHELL_PHASE_NAMES} from '../hosted/planet/shell-input.mjs';
import {checkBar,checkTabs,clockText,nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';
import {PHASE_BAR_PHASES,PHASE_BAR_REFUSED,PHASE_WORDS,loadingBar,phaseBar,phaseClosedToast,reconnectingBar} from '../../../design/phone-ui/components/phone-shell/phase-bars.mjs';
import {planetView,rig} from './planet-support.mjs';

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
 // Shell 0.3.0: the viewer's own public person, for the Card tab's portrait, as the bar's who is built.
 assert.deepEqual(tabs,{variant:'game',view:'room',open:null,hero:{mode:'pass',enabled:false,busy:false},me:{seat:'seat-4',name:'Crew 4',character:'c4'}});
 assert.deepEqual(checkTabs(tabs).me,{seat:'seat-4',number:null,name:'Crew 4',character:'c4'});
 // Before a character is chosen the person has none, and the shell keeps the card icon; with no seat, no person.
 assert.deepEqual(shellTabs(model({identities:identities.map(i=>i.seatId==='seat-4'?{...i,characterId:null}:i)})).me,{seat:'seat-4',name:'Crew 4',character:null});
 assert.deepEqual(shellTabs(model({identities:[]})).me,{seat:'seat-4',name:'Player 4',character:null});
 assert.equal(shellTabs(model({ownSeatId:null})).me,null);
 // It is the viewer's own, never the active player's: here seat 5 has the turn.
 assert.equal(shellTabs(model({activeSeatId:'seat-5'})).me.seat,'seat-4');
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
 // A move's room or position, and the Blackout's fixed position in the dark (sheet 30), are chosen on the scene too:
 // their bars are Actions' (release 3; planet-actions.test.mjs), from the viewer's room and the model's moveRooms.
 assert.deepEqual(shellTarget(model({moveRooms:['Room B'],action:action('MOVE','slots',['B5'],{label:'Move',prompt:'Choose an empty position in Room B.'})})),{icon:'move',title:'Move within Room B',sub:'Choose an empty position'});
 assert.equal(shellTarget(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1'],{label:'Choose fixed slot'})})).icon,'position');
 assert.deepEqual(shellTarget(model({dark:true,panel:'actions',privateArea:{blackoutTargeting:{windowId:'w',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1']}},action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])})),
  {icon:'position',title:'Choose a position',sub:'Room A · any position, even empty'});
 // A ballot, a code and the panel's number are chosen in a sheet, not on the scene.
 for(const type of ['VOTE','SUBMIT_CODE','PANEL_CODE'])assert.equal(shellTarget(model({action:action(type,'targets',['seat-1'])})),null,type);
 // At the check, the target bar gives way to the sheet.
 assert.equal(shellTarget(model({action:action('BLOCK_MOVE','confirm',[])})),null);
 // The chip: people offered in other rooms, counted on the public board; on the board, the same choice as a list.
 assert.deepEqual(shellChip(model({action:block}),{view:'room',room:'room-b'}),{id:'board',label:'Other rooms · 1',icon:'board',tone:'paper'});
 assert.equal(shellChip(model({action:action('BLOCK_MOVE','targets',['seat-5','seat-6'])}),{view:'room',room:'room-b'}),null);
 assert.deepEqual(shellChip(model({action:block}),{view:'board',room:'room-b'}),{id:'list',label:'List',icon:'players',tone:'paper'});
 assert.deepEqual(shellChip(model({moveRooms:['Room A','Room B'],action:action('MOVE','slots',['B5'])}),{view:'room',room:'room-b'}),{id:'move-board',label:'Other rooms on the Board',icon:'board',tone:'paper'});
 assert.equal(shellChip(model({moveRooms:['Room B'],action:action('MOVE','slots',['B5'])}),{view:'room',room:'room-b'}),null);
 assert.equal(shellChip(model({moveRooms:['Room A','Room B'],action:action('MOVE','slots',['B5'])}),{view:'board'}),null);
 assert.equal(shellChip(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])}),{view:'room',room:'room-a'}),null);
 // Someone off the board is offered in the stage's own list (Off board), not counted in another room.
 assert.equal(shellChip(model({action:action('BLOCK_MOVE','targets',['seat-5','seat-9'])}),{view:'room',room:'room-b'}),null);
});

test('banners: reconnecting, the phone\'s (busy while a receipt is checked); an eliminated player\'s own',()=>{
 assert.equal(shellBanner(model()),null);
 assert.deepEqual(shellBanner(model({connection:'stale'})),{kind:'reconnecting',busy:false});
 // The first connect, before a round was seen, is the Loading frame, with no banner; connecting again after one was
 // seen, or a first connect that failed, gets the banner and its Retry.
 assert.equal(shellBanner(model({connection:'connecting',phase:null,round:null})),null);
 assert.deepEqual(shellBanner(model({connection:'connecting',phase:null,round:null}),{lastRound:3}),{kind:'reconnecting',busy:false});
 assert.deepEqual(shellBanner(model({connection:'error',phase:null,round:null})),{kind:'reconnecting',busy:false});
 assert.equal(shellInput(model({connection:'connecting',phase:null,round:null})).banner,null);
 assert.equal(shellInput(model({connection:'connecting',phase:null,round:null}),{lastRound:3}).banner.kind,'reconnecting');
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

test('a pass: "Pass your turn?" with Cancel and Pass, then "Turn passed" once, as a toast (Actions\' passSheet and passedToast)',()=>{
 const confirm=model({activeSeatId:'seat-4',action:action('PASS_TURN','confirm',[],{label:'Pass',confirmation:'Pass?',canConfirm:true,prompt:'Pass'})});
 const sheet=shellSheet(confirm);
 assert.deepEqual(sheet,{id:'pass',kind:'pass',title:'Pass your turn?',sub:null,back:false,close:false,detent:'auto',
  actions:[{id:'cancel',label:'Cancel',kind:'secondary',local:true,enabled:true},{id:'pass',label:'Pass',kind:'primary',icon:'pass',enabled:true,busy:false}]});
 assert.equal(kept({viewer:'seat-4',sheet}).sheet.actions[0].local,true);
 // Usable only as the controller can confirm it.
 assert.equal(shellSheet(model({action:action('PASS_TURN','confirm',[],{canConfirm:false})})).actions[1].enabled,false);
 const sending=shellSheet(model({action:action('PASS_TURN','sending',[],{prompt:'Registering…'})}));
 assert.deepEqual(sending.actions[1],{id:'pass',label:'Pass',kind:'primary',icon:'pass',enabled:true,busy:true});
 assert.equal(sending.actions[0].enabled,false);
 const accepted=model({action:action('PASS_TURN','accepted',[],{prompt:'Registered. Waiting for the authoritative view.'})});
 assert.equal(shellSheet(accepted),null);
 // "Turn passed" comes with the view that shows the turn has moved on, through this phone's own pass (actions-input.mjs
 // actionsFlow; planet-actions.test.mjs holds its orderings), not at the accepted step alone.
 assert.equal(shellToast(accepted),null);
 const passFlow={match:accepted.matchId,viewer:'seat-4',type:'PASS_TURN',phase:'turn-1',seats:[],slot:null,room:null,stage:'passed',seen:'turn-2'};
 const nextTurn=model({phase:{...turn,id:'turn-2'},activeSeatId:'seat-5'});
 assert.deepEqual(shellToast(nextTurn,{flow:passFlow}),{id:'pass:turn-1',text:'Turn passed',icon:'info'});
 assert.equal(shellToast(confirm),null);assert.equal(shellToast({...nextTurn,surface:'display'},{flow:passFlow}),null);
});

test('the sheet\'s frame for each open panel and action; the body stays the game\'s',()=>{
 assert.equal(shellSheet(model()),null);
 const titles={actions:'Actions',card:'Your role',panels:'Panels',promises:'Promises',windows:'Windows',navigation:'Navigation',hospital:'Hospital panel',players:'Players','round-order':'Round order',settings:'Settings'};
 // The Panels tab's three views are one sheet, the panels component's (release 3; planet-panels.test.mjs).
 const sheetId=panel=>['players','round-order'].includes(panel)?'panels':panel;
 for(const [panel,title]of Object.entries(titles)){const f=shellSheet(model({panel}));assert.equal(f.title,title,panel);assert.equal(f.id,sheetId(panel));assert.equal(f.close,true);assert.ok(kept({viewer:'seat-4',sheet:f}).sheet);}
 // Panels' own pages go back to Panels (sheet 27.5).
 for(const panel of ['windows','navigation','hospital','players','round-order'])assert.equal(shellSheet(model({panel})).back,true,panel);
 for(const panel of ['actions','card','panels','promises','settings'])assert.equal(shellSheet(model({panel})).back,false,panel);
 assert.equal(shellSheet(model({panel:'card'})).sub,'Only on this phone');assert.equal(shellSheet(model({panel:'card'})).detent,'large');
 assert.equal(shellSheet(model({panel:'windows'})).sub,'Unverified claims · Expires after Round 3');
 // The dark, a closed phase and an unknown outcome, as today's sheet titled them.
 assert.equal(shellSheet(model({panel:'actions',dark:true})).title,'Blackout');
 assert.equal(shellSheet(model({panel:'card',phase:{...turn,expired:true}})).title,'Waiting for the server');
 assert.equal(shellSheet(model({recovery:{status:'unknown',canCheck:true,canRetry:false}})).title,'Outcome unknown');
 // Actions' check (release 3; planet-actions.test.mjs): "Check and register", Cancel (this phone's own) and Register.
 const check=shellSheet(model({panel:'actions',action:action('RESCUE','confirm',[],{label:'Rescue',canConfirm:true})}));
 assert.deepEqual([check.id,check.title,check.actions.map(a=>[a.id,a.label,a.enabled!==false])],['action-check','Check and register',[['cancel','Cancel',true],['register','Register Rescue',true]]]);
 assert.equal(shellSheet(model({action:action('RESCUE','confirm',[],{label:'Rescue',canConfirm:false})})).actions[1].enabled,false);
 // The other actions' checks stay the game's: the controller's confirmation as the footer's Register.
 const block=shellSheet(model({action:action('BLOCK_MOVE','confirm',[],{label:'Block movement',canConfirm:true})}));
 assert.deepEqual([block.id,block.title,block.actions],['action:BLOCK_MOVE','Block movement',[{id:'confirm',label:'Register',kind:'primary'}]]);
 const ballotSheet=shellSheet(model({phase:phase('JAIL_VOTE'),action:action('VOTE','targets',['seat-1','abstain'],{label:'Vote'})}));
 // The ballot is titled by its vote (sheet 35), large; its choices are the game's own body until the ballot's component.
 assert.deepEqual([ballotSheet.title,ballotSheet.detent,ballotSheet.actions],['Jail vote','large',[]]);
 assert.equal(shellSheet(model({phase:phase('CAPTAIN_ELECTION'),action:action('VOTE','targets',['seat-1'],{label:'Vote'})})).title,'Captain vote');
 assert.equal(shellSheet(model({action:action('VOTE','confirm',[],{label:'Vote',canConfirm:true})})).actions[0].label,'Vote');
 // Choosing on the scene shows no sheet, unless the board's List is open.
 const blocking=action('BLOCK_MOVE','targets',['seat-1'],{label:'Block movement'});
 assert.equal(shellSheet(model({action:blocking})),null);
 assert.deepEqual((({id,kind,title})=>({id,kind,title}))(shellSheet(model({action:blocking}),{listOpen:true})),{id:'target-list',kind:'target-list',title:'Block movement'});
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

test('a host sheet (the pre-game connection\'s Host controls) takes the Settings sheet\'s place, with its own footer, Back and Close',()=>{
 const settings={id:'settings',kind:'settings',title:'Settings',sub:null,back:false,close:true,detent:'auto',actions:[]};
 const host={id:'host-controls',title:'Host controls',back:true,close:true,detent:'large',actions:[{id:'abort',label:'Abort match',kind:'warn'}]};
 assert.deepEqual(shellHostSheet(settings,host),{...host,kind:'host'});
 assert.equal(shellHostSheet(settings,null),settings,'no host frame: Settings stays');
 const actions={id:'action:VOTE',kind:'action',title:'Vote'};
 assert.equal(shellHostSheet(actions,host),actions,'only in Settings\' place');
 assert.equal(shellHostSheet(null,host),null,'nothing open: nothing');
 // While it is open, the sheet's intents are the host sheet's; Close also closes Settings. Otherwise, as before.
 const calls=[];let open=true;
 const handlers=shellHandlers({openPanel:p=>calls.push(['openPanel',p]),confirm:()=>calls.push(['confirm']),dismiss:()=>calls.push(['dismiss']),closeList:()=>calls.push(['closeList']),
  host:{open:()=>open,action:id=>calls.push(['host.action',id]),back:()=>calls.push(['host.back']),close:()=>calls.push(['host.close'])}});
 handlers.onSheetAction('abort','host-controls');handlers.onSheetAction('confirm','host-controls');handlers.onSheetBack('host-controls');handlers.onSheetClose('host-controls');
 open=false;
 handlers.onSheetAction('confirm','pass');handlers.onSheetBack('windows');handlers.onSheetClose('settings');
 assert.deepEqual(calls,[['host.action','abort'],['host.action','confirm'],['host.back'],['host.close'],['dismiss'],['confirm'],['openPanel','panels'],['dismiss']]);
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

test('the round stamp\'s moment and clock (G18): Round 1\'s Before turns, and the trusted server time while it is trusted',()=>{
 // Round 1's first phase is Before turns: its window, from public facts only. Any other round or phase: none.
 const first=model({round:1,phase:phase('PRE_TURN',{id:'p-1',startedAt:5000,endsAt:20000,nowMs:5200}),activeSeatId:null,offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null}});
 assert.deepEqual(roundStart(first),{round:1,window:{id:'p-1',startedAt:5000}});
 assert.equal(roundStart({...first,round:2}),null);
 assert.equal(roundStart({...first,phase:phase('ORDINARY_TURN',{id:'p-2'})}),null);
 assert.equal(roundStart({...first,phase:null}),null);
 assert.equal(roundStart({...first,phase:{...first.phase,id:''}}),null);
 // A late phone gets the same window: the stamp's own clock decides it is past. Private fields change nothing.
 assert.deepEqual(roundStart({...first,phase:{...first.phase,nowMs:60000,remainingMs:0}}),roundStart(first));
 assert.deepEqual(roundStart({...first,privateArea:{role:{name:'Alien'}},ownSeatId:'seat-7'}),roundStart(first));
 // The clock: the phase's server time plus the time since it arrived, by this phone's monotonic clock.
 let t=100;const clock=createServerClock({monotonic:()=>t});
 assert.equal(clock.current(),null,'nothing observed: no clock');
 clock.observe(first);
 t=350;assert.equal(clock.current().now(),5200+250);
 // The same model shown again keeps its first arrival; a new one starts from its own time.
 clock.observe(first);t=400;assert.equal(clock.current().now(),5200+300);
 clock.observe({...first,phase:{...first.phase,nowMs:5500}});t=450;assert.equal(clock.current().now(),5500+50);
 // Untrusted, run out or not live: no clock, and a part given none draws nothing.
 for(const over of [{phase:{...first.phase,trusted:false,nowMs:null}},{phase:{...first.phase,expired:true}},{connection:'stale'},{connection:'connecting'},{phase:null}]){
  clock.observe({...first,...over});assert.equal(clock.current(),null,JSON.stringify(over));
  clock.observe(first);assert.ok(clock.current());
 }
 // It never reads anything private.
 const plain=createServerClock({monotonic:()=>0}),busy=createServerClock({monotonic:()=>0});
 plain.observe(first);busy.observe({...first,privateArea:{role:{name:'Alien'}},action:action('BLOCK_MOVE','targets',['seat-1'])});
 assert.equal(plain.current().now(),busy.current().now());
});

test('a phase that closed under an open choice: the pack\'s toast once, told from the model painted before and this one',()=>{
 const open=model({activeSeatId:'seat-4',action:action('MOVE','targets',['Room A'])});
 const expired=model({activeSeatId:'seat-4',phase:{...turn,nowMs:60000,remainingMs:0,expired:true}});
 const next=model({phase:phase('JAIL_VOTE'),activeSeatId:null});
 // The time is up: at 0:00, under the old bar, as sheet 45 draws it. Or another phase is on before 0:00.
 assert.deepEqual(phaseClosed(open,expired),{id:'turn-1'});
 assert.deepEqual(phaseClosed(open,next),{id:'turn-1'});
 // Not again when the next phase follows the expired model: nothing was open in that one.
 assert.equal(phaseClosed(expired,next),null);
 // Every step of a choice in progress; never one being sent, registered or refused.
 assert.deepEqual(SHELL_CHOOSING,['targets','slots','faction','direction','number','promise','confirm']);
 for(const step of SHELL_CHOOSING)assert.deepEqual(phaseClosed(model({action:action('MOVE',step,[])}),expired),{id:'turn-1'},step);
 for(const step of ['sending','accepted','rejected','unknown'])assert.equal(phaseClosed(model({action:action('PASS_TURN',step,[])}),next),null,step);
 // The same phase still running (the player cancelled, or the offer went away), and a sheet with no choice in it.
 assert.equal(phaseClosed(open,model({activeSeatId:'seat-4'})),null);
 assert.equal(phaseClosed(model({panel:'card'}),expired),null);
 // Time that is not trusted cannot say the phase closed.
 assert.equal(phaseClosed(open,model({phase:{...turn,trusted:false,expired:true,nowMs:null,remainingMs:null}})),null);
 // Both models are live and this player's, in one match.
 for(const other of [{connection:'stale'},{connection:'connecting'},{connection:'error'},{concealed:true},{surface:'display',ownSeatId:null},{phase:null}]){
  assert.equal(phaseClosed({...open,...other},next),null,JSON.stringify(other));
  assert.equal(phaseClosed(open,{...next,...other}),null,JSON.stringify(other));
 }
 assert.equal(phaseClosed({...open,matchId:'match-2'},next),null);assert.equal(phaseClosed({...open,ownSeatId:'seat-1'},next),null);
 assert.equal(phaseClosed(null,next),null);assert.equal(phaseClosed(open,null),null);assert.equal(phaseClosed(open,open),null);
 // One rule for every phase, the votes and the Blackout too. No phase says it closed by itself yet: #267's ballot will.
 assert.deepEqual(SHELL_CLOSES_ITSELF,[]);
 for(const kind of ['CAPTAIN_ELECTION','JAIL_VOTE','BLACKOUT','OFFICER_APPOINTMENT','NAV_OFFICER_CONFIRM','PRE_TURN']){
  assert.deepEqual(phaseClosed(model({phase:phase(kind),action:action('VOTE','targets',['seat-1'])}),model({phase:phase('ORDINARY_TURN')})),{id:`p-${kind}`},kind);
 }
 // The toast: Designer's words and icon (phase-bars.mjs), under an id of its own, once for the phase.
 const closed=phaseClosed(open,expired);
 assert.deepEqual(shellToast(expired,{closed}),{id:'closed:turn-1',text:'That phase closed · choices cleared',icon:'info'});
 assert.deepEqual(shellToast(expired,{closed}),phaseClosedToast({id:'closed:turn-1'}));assert.equal(PHASE_WORDS.closed,'That phase closed · choices cleared');
 assert.equal(shellToast(expired),null);
 assert.equal(shellToast({...expired,surface:'display'},{closed}),null);assert.equal(shellToast({...expired,concealed:true},{closed}),null);
 // Through the whole input: given once, kept by the shell's own checks, and dropped with the shell under the Food surface.
 const input=shellInput(expired,{view:'room',room:'room-b',closed});
 assert.deepEqual(input.toast,{id:'closed:turn-1',text:'That phase closed · choices cleared',icon:'info'});
 assert.deepEqual(kept({viewer:'seat-4',toast:input.toast}).toast,input.toast);
 assert.equal(shellInput(expired,{view:'room',room:'room-b'}).toast,null);
 assert.equal(shellInput(expired,{view:'room',room:'room-b',closed,food:{active:true,exclusive:false}}).toast,null);
 // It reads nothing private: every private field filled changes nothing.
 const loud=m=>({...m,privateArea:{role:{name:'Alien'},offers:[{type:'ACTIVATE_BLACKHOLE'}],navigation:{position:'B1',direction:'Red'}},offices:{captainSeatId:'seat-4',officerSeatId:'seat-1',blockedSeatId:null}});
 assert.deepEqual(phaseClosed(loud(open),loud(expired)),phaseClosed(open,expired));
});

test('the game\'s own controller clears an open choice without a word; its models give the toast once, and never for a cancel, a lost connection or a phone put away',async()=>{
 // The controller's own test rig (planet-support.mjs): every model it emits, and the toast between each two.
 async function watch(){
  const view=planetView('Hacker'),r=rig(view),models=[];
  r.controller.subscribe(m=>models.push(m));await r.controller.start();await r.advance(0);
  const toasts=()=>{const out=[];for(let i=1;i<models.length;i++){const closed=phaseClosed(models[i-1],models[i]);if(closed)out.push(shellToast(models[i],{closed}));}return out;};
  const vote=()=>{r.push({...structuredClone(view),viewRevision:2,phase:{id:'phase-6-jail',kind:'JAIL_VOTE',startedAt:61000,endsAt:121000},activeSeatId:null});};
  return {...r,models,toasts,vote,last:()=>models.at(-1)};
 }
 const toast={id:'closed:phase-6-turn',text:'That phase closed · choices cleared',icon:'info'};
 // The turn's time runs out under an open Move: at 0:00, and not again when the vote arrives.
 let w=await watch();w.controller.begin('MOVE');assert.equal(w.last().action.step,'targets');
 await w.advance(59_000);assert.equal(w.last().action.step,'targets');assert.deepEqual(w.toasts(),[]);
 await w.advance(1_000);
 assert.equal(w.last().action,null);assert.equal(w.last().connection,'live');assert.equal(w.last().phase.id,'phase-6-turn');
 assert.equal(w.last().phase.expired,true);assert.equal(w.last().phase.trusted,true);assert.equal(w.last().phase.remainingMs,0);assert.equal(w.last().panel,'board');
 assert.deepEqual(w.toasts(),[toast]);
 w.vote();await w.advance(0);await w.advance(500);assert.equal(w.last().phase.id,'phase-6-jail');assert.deepEqual(w.toasts(),[toast]);
 // Another phase arrives before 0:00.
 w=await watch();w.controller.begin('MOVE');await w.advance(10_000);w.vote();await w.advance(0);await w.advance(500);
 assert.equal(w.last().phase.id,'phase-6-jail');assert.deepEqual(w.toasts(),[toast]);
 // "Pass your turn?" still open at the end is a choice; a pass the server accepted is not.
 w=await watch();w.controller.begin('PASS_TURN');assert.equal(w.last().action.step,'confirm');await w.advance(60_000);assert.deepEqual(w.toasts(),[toast]);
 w=await watch();w.controller.begin('PASS_TURN');await w.controller.confirm();await w.advance(0);assert.equal(w.last().action.step,'accepted');
 w.vote();await w.advance(0);await w.advance(500);assert.equal(w.last().phase.id,'phase-6-jail');assert.deepEqual(w.toasts(),[]);
 // The player cancels: nothing then, and nothing at the end.
 w=await watch();w.controller.begin('MOVE');await w.advance(1_000);w.controller.dismiss();await w.advance(60_000);
 assert.equal(w.last().phase.expired,true);assert.deepEqual(w.toasts(),[]);
 // The connection goes stale under the choice, then the vote arrives: the banner said it.
 w=await watch();w.controller.begin('MOVE');await w.advance(1_000);w.push(planetView('Hacker'),false);await w.advance(0);
 assert.equal(w.last().connection,'stale');assert.equal(w.last().action,null);
 w.vote();await w.advance(0);await w.advance(500);assert.equal(w.last().connection,'live');assert.deepEqual(w.toasts(),[]);
 // The phone is put away under the choice and comes back in the vote.
 w=await watch();w.controller.begin('MOVE');await w.advance(1_000);w.controller.setVisible(false);await w.advance(0);
 assert.equal(w.last().concealed,true);assert.notEqual(w.last().connection,'live');
 w.controller.setVisible(true);await w.advance(0);w.vote();await w.advance(0);await w.advance(500);
 assert.equal(w.last().phase.id,'phase-6-jail');assert.equal(w.last().connection,'live');assert.deepEqual(w.toasts(),[]);
 // Only a sheet open: the controller closes it at 0:00 too, and no toast says a choice was cleared.
 w=await watch();w.controller.openPanel('card');assert.equal(w.last().panel,'card');await w.advance(60_000);
 assert.equal(w.last().panel,'board');assert.deepEqual(w.toasts(),[]);
});

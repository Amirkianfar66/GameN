import assert from 'node:assert/strict';
import test from 'node:test';
import {roomArtFor,roomSceneArtReady,roomSceneHandlers,roomSceneInput,roomSceneInputKey,roomSceneKey,roomSceneLifecycle,roomSceneRemount,
 roomSceneStatus,roomSceneTargets,trustedClock,wantsRoomScene,ROOM_SCENE_ROOMS} from '../hosted/planet/room-scene-input.mjs';

// The room view on a player's phone is drawn by the room scene (the owner, 15 November 2026). These cover
// the renderer's side: what it gives the scene, whose offers reach it, its callbacks and its lifecycle.
const seat=(n,location,slotId,more={})=>({seatId:`seat-${n}`,location,slotId,health:'Healthy',jailed:false,...more});
const seats=[seat(1,'Room A','A1'),seat(2,'Room A','A2'),seat(3,'Room A','A3'),seat(4,'Room B','B1'),seat(5,'Room B','B2'),seat(6,'Room B','B3',{health:'Injured'}),
 seat(7,'Hospital','H1',{health:'Injured'}),seat(8,'Jail','J1',{jailed:true}),seat(9,null,null,{health:'Eliminated'})];
const identities=seats.map((s,i)=>({seatId:s.seatId,characterId:`c${i+1}`,displayName:`Crew ${i+1}`}));
function model(over={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions:{assetManifestVersion:'design-0.8.0'},playerCount:9,connection:'live',concealed:false,dark:false,
  phase:{id:'turn-1',kind:'ORDINARY_TURN',trusted:true,expired:false},activeSeatId:'seat-5',offices:{captainSeatId:'seat-5',officerSeatId:'seat-6',blockedSeatId:null},
  board:{seats},identities,action:null,presentation:{nowMs:1_000_000,blackout:null},food:null,...over};
}
const view={room:'room-b',size:{width:390,height:715}};
const action=(type,step,values,selected=[])=>({type,step,choices:values.map(value=>({value,label:value})),selected,prompt:'',confirmation:null,canConfirm:false});

test('the scene is given this room\'s public board, its offices, the turn and this phone\'s seat',()=>{
 const input=roomSceneInput(model(),view);
 assert.equal(input.room,'room-b');assert.equal(input.roster,9);assert.deepEqual(input.size,{width:390,height:715});
 assert.deepEqual(input.people,[
  {seat:'seat-4',slot:'B1',character:'c4',name:'You',health:'Healthy',office:null},
  {seat:'seat-5',slot:'B2',character:'c5',name:'Crew 5',health:'Healthy',office:'captain'},
  {seat:'seat-6',slot:'B3',character:'c6',name:'Crew 6',health:'Injured',office:'officer'},
 ]);
 assert.equal(input.active,'seat-5');assert.equal(input.self,'seat-4');assert.equal(input.lighting,'lit');assert.equal(input.hold,null);
 assert.equal(input.status,'live');assert.equal(input.interactive,true);assert.deepEqual(input.versions,model().versions);
 // Today's pictures until Integration registers room-drawing-1.0.0 for a match's art version.
 assert.equal(input.roomArt,null);assert.equal(roomArtFor(model().versions),null);
 for(const room of ROOM_SCENE_ROOMS)assert.ok(roomSceneInput(model(),{...view,room}).people.every(p=>seats.find(s=>s.seatId===p.seat).location!==null));
 assert.deepEqual(roomSceneInput(model(),{...view,room:'jail'}).people.map(p=>p.seat),['seat-8']);
 // The turn mark is the ordinary turn's only.
 assert.equal(roomSceneInput(model({phase:{id:'v',kind:'JAIL_VOTE',trusted:true,expired:false}}),view).active,null);
});

test('people away on the Food Supply Task are not drawn; the model keeps every seat',()=>{
 const away=model({food:{step:{kind:'AWAY',awaySeatIds:['seat-5']}}});
 assert.deepEqual(roomSceneInput(away,view).people.map(p=>p.seat),['seat-4','seat-6']);
 assert.equal(away.board.seats.length,9);
});

test('offers come from this viewer\'s own action only: people, a move\'s positions or the Blackout\'s fixed positions',()=>{
 assert.equal(roomSceneTargets(model(),'room-b'),null);
 assert.deepEqual(roomSceneTargets(model({action:action('BLOCK_MOVE','targets',['seat-1','seat-5'],['seat-5'])}),'room-b'),{seats:['seat-1','seat-5'],picked:['seat-5']});
 // A move offers its destination's empty positions in that room only; choosing the room offers none here.
 assert.deepEqual(roomSceneTargets(model({action:action('MOVE','slots',['B4','B5'])}),'room-b'),{slots:['B4','B5'],picked:[],icon:'move'});
 assert.equal(roomSceneTargets(model({action:action('MOVE','slots',['B4','B5'])}),'room-a'),null);
 assert.equal(roomSceneTargets(model({action:action('MOVE','targets',['Room B'])}),'room-b'),null);
 assert.deepEqual(roomSceneTargets(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1','A2'],['A2'])}),'room-a'),{slots:['A1','A2'],picked:['A2'],icon:'position'});
});

test('privacy: a shared display and a hidden phone get no viewer, offers or control; the dark passes nobody',()=>{
 const offered={action:action('BLOCK_MOVE','targets',['seat-5'])};
 const display=roomSceneInput(model({surface:'display',ownSeatId:null,...offered}),view);
 assert.equal(display.self,null);assert.equal(display.targets,null);assert.equal(display.control,null);assert.equal(display.interactive,false);
 const hidden=roomSceneInput(model({concealed:true,...offered}),view);
 assert.equal(hidden.status,'concealed');assert.deepEqual(hidden.people,[]);assert.equal(hidden.targets,null);assert.equal(hidden.control,null);
 // In the authoritative dark the model has no board: nobody is passed, and no name.
 const dark=roomSceneInput(model({dark:true,board:null,identities:[]}),view);
 assert.equal(dark.lighting,'dark');assert.deepEqual(dark.people,[]);assert.ok(!JSON.stringify(dark).includes('Crew '));
});

test('lights out and the Blackout hold: the window\'s id for its lit and dark seconds, and only then',()=>{
 assert.equal(roomSceneInput(model(),{...view,dark:true}).lighting,'dark');
 const blackout={id:'w-1',kind:'BLACKOUT',trusted:true,expired:false};
 assert.equal(roomSceneInput(model({phase:blackout,presentation:{nowMs:1,blackout:{windowId:'w-1'}}}),view).hold,'w-1');
 assert.equal(roomSceneInput(model({phase:blackout,dark:true,board:null,presentation:{nowMs:1,blackout:{windowId:'w-1'}}}),view).hold,'w-1');
 // A window the model does not name (no trusted presentation) is still held.
 assert.equal(roomSceneInput(model({phase:blackout,presentation:null}),view).hold,true);
 assert.equal(roomSceneInput(model({presentation:{nowMs:1,blackout:{windowId:'w-1'}}}),view).hold,null);
});

test('status and the voyage clock: live only while current; the clock only while trusted and live',()=>{
 assert.equal(roomSceneStatus(model()),'live');
 assert.equal(roomSceneStatus(model({connection:'stale'})),'stale');
 assert.equal(roomSceneStatus(model({phase:{id:'t',kind:'ORDINARY_TURN',trusted:true,expired:true}})),'stale');
 assert.equal(roomSceneStatus(model({concealed:true,connection:'stale'})),'concealed');
 let t=500;const clock=trustedClock(model(),()=>t);
 assert.equal(clock.now(),1_000_000);t+=250;assert.equal(clock.now(),1_000_250);
 assert.equal(trustedClock(model({phase:{id:'t',kind:'ORDINARY_TURN',trusted:false,expired:false}}),()=>t),null);
 assert.equal(trustedClock(model({connection:'stale'}),()=>t),null);
 assert.equal(trustedClock(model({presentation:null}),()=>t),null);
 // The scene is updated when what it shows changes, not for every new clock object.
 const a=roomSceneInput(model(),{...view,monotonic:()=>1}),b=roomSceneInput(model(),{...view,monotonic:()=>2});
 assert.notEqual(a.clock,b.clock);assert.equal(roomSceneInputKey(a),roomSceneInputKey(b));
 assert.notEqual(roomSceneInputKey(a),roomSceneInputKey(roomSceneInput(model({presentation:null}),view)));
});

test('Room B\'s control opens the Windows panel for its own occupant, lit, live and with no action open',()=>{
 assert.deepEqual(roomSceneInput(model(),view).control,{id:'windows',label:'Windows',icon:'window',enabled:true,kind:'button'});
 assert.equal(roomSceneInput(model(),{...view,room:'room-a'}).control,null);
 assert.equal(roomSceneInput(model({ownSeatId:'seat-1'}),view).control,null);
 assert.equal(roomSceneInput(model({action:action('BLOCK_MOVE','targets',['seat-5'])}),view).control,null);
 assert.equal(roomSceneInput(model(),{...view,dark:true}).control,null);
 assert.equal(roomSceneInput(model({connection:'stale'}),view).control,null);
 // The label carries no number: the windows the panel lists are not in the model while it is closed.
 assert.ok(!/\d/.test(roomSceneInput(model(),view).control.label));
});

test('the room pictures are unavailable only once the art has settled without the scene\'s bundles',()=>{
 assert.equal(roomSceneArtReady({artSettled:'false',art:''}),true);
 assert.equal(roomSceneArtReady({artSettled:'true',art:'public-board scene-art board-v2-motion-art board-v2-films-art'}),true);
 assert.equal(roomSceneArtReady({artSettled:'true',art:'public-board board-v2-motion-art board-v2-films-art'}),false);
});

test('callbacks report intent only, to the controller\'s own checks',()=>{
 const sent=[];const handlers=roomSceneHandlers({choose:value=>sent.push(['choose',value]),openPanel:panel=>sent.push(['panel',panel]),focusNext:()=>sent.push(['focus'])});
 handlers.onSeat('seat-4');handlers.onSeat(7);handlers.onSlot('B5');handlers.onControl('windows');handlers.onControl('elsewhere');handlers.onFocusReturn({intent:'seat',value:'seat-4'});
 assert.deepEqual(sent,[['choose','seat-4'],['choose','7'],['choose','B5'],['panel','windows'],['focus']]);
});

test('lifecycle: a player\'s room view in the five rooms; kept through a hidden or reconnecting model; a new match, seat or art version remounts',()=>{
 const place={view:'room',room:'room-b',fits:true},none={mounted:false,key:null},key=roomSceneKey(model()),mounted={mounted:true,key};
 assert.ok(wantsRoomScene({surface:'player',view:'room',room:'hospital'}));
 assert.equal(roomSceneLifecycle(none,model(),place),'paint');
 assert.equal(roomSceneLifecycle(mounted,model(),place),'paint');
 for(const [m,p] of [[model(),{...place,view:'board'}],[model(),{...place,room:'capsule'}],[model({surface:'display'}),place],[model(),{...place,fits:false}]]){
  assert.equal(roomSceneLifecycle(mounted,m,p),'dispose');assert.equal(roomSceneLifecycle(none,m,p),'none');
 }
 // Hidden or reconnecting, the model has no room, no roster and no versions: the scene keeps its frame.
 const viewless=model({playerCount:null,versions:null,board:null,identities:[],connection:'stale',concealed:true});
 assert.equal(roomSceneLifecycle(mounted,viewless,{...place,fits:false}),'status');
 assert.equal(roomSceneLifecycle(none,viewless,{...place,fits:false}),'none');
 assert.equal(roomSceneRemount(key,viewless),false);
 for(const changed of [model({matchId:'match-2'}),model({ownSeatId:'seat-5'}),model({versions:{assetManifestVersion:'design-0.9.0'}})])assert.equal(roomSceneLifecycle(mounted,changed,place),'remount');
 assert.equal(roomSceneLifecycle(mounted,model({matchId:'match-2',playerCount:null,versions:null}),{...place,fits:false}),'remount');
});

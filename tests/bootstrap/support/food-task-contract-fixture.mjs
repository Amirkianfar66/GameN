// Synthetic contract-only packets. No real match or runtime authority hash.
const copy = v => structuredClone(v);
export const versions = { protocolVersion:3,engineVersion:'planet-game-1.4.0',rulesetVersion:'in-person-planet-food-task-2026-11-12',
  rulesetHash:'a'.repeat(64),assetManifestVersion:'food-contract-fixture' };
export const request = (command, n=7) => ({schemaVersion:1,protocolVersion:3,matchId:`food-fixture-${n}`,commandId:'command-1',
  phaseId:'food-phase-2',foodStepId:'food-step-2',round:2,command});
export const down = {type:'TASK_PRESS',taskId:'task-2',controlSessionId:'winch-session-2',expectedControlRevision:0,
  input:{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:'crate-0'}};
export const publicView = n => ({schemaVersion:1,versions:copy(versions),matchId:`food-fixture-${n}`,round:2,
  viewRevision:2,phaseId:'food-phase-2',serverNowMs:6000,playerCount:n,rosterSeatIds:Array.from({length:n},(_,i)=>`seat-${i+1}`),turnEnds:[],
  audience:'public',step:{kind:'AWAY',stepId:'food-step-2',startedAt:1000,returnsAt:33500,awaySeatIds:['seat-1','seat-2']},
  stock:{doses:10,publicationRound:1,basis:'FINALIZED'}});
export const task = () => ({foodStepId:'food-step-2',round:2,taskId:'task-2',revision:0,controlRevision:0,participantSeatIds:['seat-1','seat-2'],
  winchSeatId:'seat-1',panelSeatId:'seat-2',selfControl:'WINCH',controlSessionId:'winch-session-2',
  startedAt:1000,runningAt:5000,deadlineAt:31000,returnsAt:33500,stage:'ACTIVE',
  people:[{seatId:'seat-1',alive:true,online:true,keyTurned:false,death:null},{seatId:'seat-2',alive:true,online:true,keyTurned:false,death:null}],
  panel:{locked:true,stop:0,direction:1,anchorAt:1000,blade:{state:'RAISED',stop:0,changedAt:1000},warning:null,swing:null},
  crate:{id:'crate-0',generation:0,state:'INTAKE',holder:null,x:0,height:0,anchorAt:1000,motion:null},
  ownGesture:{controlSessionId:'winch-session-2',highestSequence:0,recoveryRevision:0,currentHolder:null,pendingIntent:null},broken:[],events:{cursor:0,events:[]},outcome:null});
export const playerView = n => ({...publicView(n),audience:'player',seatId:'seat-1',stock:{doses:10,publicationRound:2,basis:'PLAYER_CURRENT'},
  ownAvailability:{canAsk:false,reason:'TASK_ALREADY_STARTED'},invitation:null,participantTask:task(),
  offers:[{type:'TASK_PRESS',taskId:'task-2',controlSessionId:'winch-session-2',controlRevision:0,inputs:['HOLD'],crateId:'crate-0'}],
  partnerChoices:Array.from({length:n-1},(_,i)=>({seatId:`seat-${i+2}`,available:false,reason:'NOT_AVAILABLE_NOW'})),requestClosures:[],privateCursor:0,ownMeals:[]});

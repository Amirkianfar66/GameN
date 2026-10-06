import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FullCommandRequestSchema,FullReceiptSchema,FullPhaseSchema,FullEventSchema,FULL_PROTOCOL_VERSION,PROTOCOL_VERSION,FullAssetManifestVersionSchema,FullCreateMatchRequestSchema,FullAdmissionRequestSchema,FullApproveAdmissionRequestSchema,FullIssueSeatRecoveryRequestSchema,FullRedeemSeatRecoveryRequestSchema,FullOperationResponseSchema,FullLobbyViewSchema,FullLookupResponseSchema,FullAdvanceResponseSchema,FullPublicViewSchema,FullHostSessionSchema,FullAdmissionDocumentSchema} from '../../packages/contracts/dist/index.js';
const base={protocolVersion:2,matchId:'match-v1',phaseId:'neutral-phase-1',commandId:'cmd-1'};
test('full-game commands use strict protocol 2 envelopes and reject forged authority',()=>{
  assert.equal(PROTOCOL_VERSION,1);assert.equal(FULL_PROTOCOL_VERSION,2);
  const payload={...base,command:{type:'REGISTER_SHOT',targetSeatId:'seat-1'}};
  assert.equal(FullCommandRequestSchema.safeParse(payload).success,true);
  for(const extra of [{actorSeatId:'seat-2'},{now:1},{winner:'Red'},{protocolVersion:1}])assert.equal(FullCommandRequestSchema.safeParse({...payload,...extra}).success,false);
  assert.equal(FullCommandRequestSchema.safeParse({...payload,command:{...payload.command,damage:2}}).success,false);
});
test('full-game Code and Supplier payloads require distinct fixed sets',()=>{
  assert.equal(FullCommandRequestSchema.safeParse({...base,command:{type:'SUPPLY',targetSeatIds:['seat-1','seat-1']}}).success,false);
  assert.equal(FullCommandRequestSchema.safeParse({...base,command:{type:'SUBMIT_CODE',seatIds:['seat-1','seat-2','seat-3','seat-3']}}).success,false);
  assert.equal(FullCommandRequestSchema.safeParse({...base,command:{type:'SUBMIT_CODE',seatIds:['seat-4','seat-3','seat-2','seat-1']}}).success,true);
});
test('all live V1 windows are 60 seconds and terminal phases have no deadline',()=>{
  for(const kind of ['ORDINARY_TURN','HACK','CAPTAIN_ELECTION','RELEASE_CHOICE','RELEASE_VOTE','JAIL_VOTE','SHOWDOWN']){
    assert.equal(FullPhaseSchema.safeParse({id:'phase-x',kind,startedAt:5000,endsAt:65000}).success,true);
    assert.equal(FullPhaseSchema.safeParse({id:'phase-x',kind,startedAt:5000,endsAt:64000}).success,false);
  }
  assert.equal(FullPhaseSchema.safeParse({id:'ended',kind:'FINISHED',startedAt:1,endsAt:null}).success,true);
});
test('receipts and public events exclude blocked causes and secret command IDs',()=>{
  assert.equal(FullReceiptSchema.safeParse({...base,status:'accepted',code:'REGISTERED'}).success,true);
  assert.equal(FullReceiptSchema.safeParse({...base,status:'accepted',code:'REGISTERED',blocked:true}).success,false);
  const event={protocolVersion:2,matchId:'match-v1',eventId:'event-1',viewRevision:1,audience:{kind:'public'},fact:{type:'COMMAND_REGISTERED',commandId:'private-command'}};
  assert.equal(FullEventSchema.safeParse(event).success,false);
  assert.equal(FullEventSchema.safeParse({...event,audience:{kind:'player',seatId:'seat-1'}}).success,true);
});

test('V1 lobby, admission and recovery requests expose no caller authority',()=>{
  const cases=[
    [FullCreateMatchRequestSchema,{protocolVersion:2,requestId:'create-1',playerCount:7}],
    [FullAdmissionRequestSchema,{protocolVersion:2,requestId:'admit-1',roomCode:'0123456789AB',initialRoom:'Room A'}],
    [FullApproveAdmissionRequestSchema,{protocolVersion:2,matchId:'m1',requestId:'approve-1',admissionId:'a1',seatId:'seat-1'}],
    [FullIssueSeatRecoveryRequestSchema,{protocolVersion:2,matchId:'m1',requestId:'recover-1',seatId:'seat-1'}],
    [FullRedeemSeatRecoveryRequestSchema,{protocolVersion:2,matchId:'m1',requestId:'redeem-1',recoveryToken:'A'.repeat(43)}],
  ];
  for(const [schema,value] of cases){
    assert.equal(schema.safeParse(value).success,true);
    for(const extra of [{uid:'forged-uid'},{host:true},{role:'Officer'},{now:10}])assert.equal(schema.safeParse({...value,...extra}).success,false);
  }
  assert.equal(FullAdmissionRequestSchema.safeParse({...cases[1][1],roomCode:'known'}).success,false);
  assert.equal(FullRedeemSeatRecoveryRequestSchema.safeParse({...cases[4][1],recoveryToken:'short'}).success,false);
});
test('V1 lobby schema binds dense canonical seats to the configured player count',()=>{
  const lobby={protocolVersion:2,matchId:'m1',playerCount:7,status:'lobby',seats:[{seatId:'seat-1',initialRoom:'Room A'}]};
  assert.equal(FullLobbyViewSchema.safeParse(lobby).success,true);
  assert.equal(FullLobbyViewSchema.safeParse({...lobby,seats:[...lobby.seats,...lobby.seats]}).success,false);
  assert.equal(FullLobbyViewSchema.safeParse({...lobby,seats:[{seatId:'seat-8',initialRoom:'Room A'}]}).success,false);
  assert.equal(FullLobbyViewSchema.safeParse({...lobby,status:'running'}).success,false);
  assert.equal(FullLobbyViewSchema.safeParse({...lobby,roomCode:'0123456789AB'}).success,false);
});
test('V1 service responses preserve terminal receipt semantics and one-time recovery replay',()=>{
  for(const recoveryToken of ['A'.repeat(43),null])assert.equal(FullOperationResponseSchema.safeParse({ok:true,serverTimeMs:10,result:{issued:true,seatId:'seat-1',recoveryToken,expiresAt:100}}).success,true);
  assert.equal(FullLookupResponseSchema.safeParse({status:'unknown',serverTimeMs:10}).success,true);
  assert.equal(FullLookupResponseSchema.safeParse({status:'found',serverTimeMs:10,receipt:{...base,status:'accepted',code:'REGISTERED'}}).success,true);
  assert.equal(FullAdvanceResponseSchema.safeParse({protocolVersion:2,matchId:'m1',phaseId:'p1',serverTimeMs:10,result:'unchanged'}).success,true);
  assert.equal(FullOperationResponseSchema.safeParse({ok:true,serverTimeMs:10,result:{issued:true,seatId:'seat-1',recoveryToken:'A'.repeat(43),expiresAt:100,role:'Officer'}}).success,false);
});
test('asset pins accept dotted versions and reject ambiguous configuration values',()=>{
  for(const value of ['0.0.0-no-assets','comic.1.2','manifest_2026-10-06'])assert.equal(FullAssetManifestVersionSchema.safeParse(value).success,true);
  for(const value of ['', ' ', 'contains/slash', 'leading space', 'a'.repeat(129)])assert.equal(FullAssetManifestVersionSchema.safeParse(value).success,false);
});

test('terminal reveals require the canonical role permutation and Alien-in, Undercover-out Code',()=>{
  const roles=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien'];
  const view={versions:{protocolVersion:2,rulesetVersion:'in-person-v1-2026-10-06',rulesetHash:'a'.repeat(64),engineVersion:'full-game-1.0.0',assetManifestVersion:'comic.1.0'},
    matchId:'m1',viewRevision:1,playerCount:7,round:5,phase:{id:'finished',kind:'FINISHED',startedAt:10,endsAt:null},activeSeatId:null,audience:{kind:'public'},
    seats:roles.map((_,i)=>({seatId:`seat-${i+1}`,health:'Healthy',location:'Room A',jailed:false,captain:false,revealedFaction:null})),
    ballot:{eligibleVoters:[],eligibleTargets:[],releaseTargetSeatId:null},lastTally:null,result:{winner:'Draw',alienCoWinner:false},
    endReveal:{roles:roles.map((role,i)=>({seatId:`seat-${i+1}`,role})),code:['seat-7','seat-1','seat-2','seat-3']}};
  assert.equal(FullPublicViewSchema.safeParse(view).success,true);
  const broken=structuredClone(view);broken.endReveal.roles.forEach(s=>s.role='Officer');assert.equal(FullPublicViewSchema.safeParse(broken).success,false);
  assert.equal(FullPublicViewSchema.safeParse({...view,endReveal:{...view.endReveal,code:['seat-1','seat-2','seat-3','seat-5']}}).success,false);
  const wrongFaction=structuredClone(view);wrongFaction.seats[4].health='Eliminated';wrongFaction.seats[4].revealedFaction='Blue';assert.equal(FullPublicViewSchema.safeParse(wrongFaction).success,false);
});

const hostDocument={protocolVersion:2,hostUid:'synthetic-host',playerCount:7,status:'lobby',roomCode:'0123456789AB',createdAt:0};
const pendingAdmission={uid:'synthetic-player',initialRoom:'Room A',requestedAt:0,status:'pending'};
const approvedAdmission={...pendingAdmission,status:'approved',seatId:'seat-1'};

test('shared host document schema preserves the existing six-field body in every mode and lifecycle status',()=>{
  for(const playerCount of [7,8,9])for(const status of ['lobby','running','complete','aborted']){
    const document={...hostDocument,playerCount,status};
    assert.deepEqual(FullHostSessionSchema.parse(document),document);
    assert.deepEqual(Object.keys(document).sort(),['protocolVersion','hostUid','playerCount','status','roomCode','createdAt'].sort());
  }
  for(const createdAt of [0,Number.MAX_SAFE_INTEGER])assert.equal(FullHostSessionSchema.safeParse({...hostDocument,createdAt}).success,true);
});

test('shared admission document schema preserves pending and approved bodies without adding path identifiers or a protocol field',()=>{
  for(const initialRoom of ['Room A','Room B']){
    const pending={...pendingAdmission,initialRoom};
    assert.deepEqual(FullAdmissionDocumentSchema.parse(pending),pending);
    for(let n=1;n<=9;n++){
      const approved={...pending,status:'approved',seatId:`seat-${n}`};
      assert.deepEqual(FullAdmissionDocumentSchema.parse(approved),approved);
    }
  }
  assert.equal(FullAdmissionDocumentSchema.safeParse({...pendingAdmission,seatId:'seat-1'}).success,false);
  assert.equal(FullAdmissionDocumentSchema.safeParse({...pendingAdmission,seatId:undefined}).success,false);
  for(const seatId of [undefined,null,'seat-0','seat-10','seat-1/child'])assert.equal(FullAdmissionDocumentSchema.safeParse({...approvedAdmission,seatId}).success,false);
});

test('host and admission documents reject missing fields, unsafe identities, timestamps and unsupported states',()=>{
  const cases=[[FullHostSessionSchema,hostDocument,'hostUid','createdAt'],[FullAdmissionDocumentSchema,pendingAdmission,'uid','requestedAt'],[FullAdmissionDocumentSchema,approvedAdmission,'uid','requestedAt']];
  for(const [schema,document,uidKey,timeKey] of cases){
    for(const key of Object.keys(document)){const missing={...document};delete missing[key];assert.equal(schema.safeParse(missing).success,false,key);}
    for(const value of ['',null,123,'unsafe/child','space identity','a'.repeat(129)])assert.equal(schema.safeParse({...document,[uidKey]:value}).success,false);
    for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'0',null])assert.equal(schema.safeParse({...document,[timeKey]:value}).success,false);
    for(const status of ['finished','denied',null])assert.equal(schema.safeParse({...document,status}).success,false);
  }
  for(const protocolVersion of [1,3,'2',null])assert.equal(FullHostSessionSchema.safeParse({...hostDocument,protocolVersion}).success,false);
  for(const playerCount of [6,10,'7',null])assert.equal(FullHostSessionSchema.safeParse({...hostDocument,playerCount}).success,false);
  for(const roomCode of ['0123456789ab','short','0123456789AB/child',null])assert.equal(FullHostSessionSchema.safeParse({...hostDocument,roomCode}).success,false);
  for(const initialRoom of ['Command Room','Hospital','Jail',null])assert.equal(FullAdmissionDocumentSchema.safeParse({...pendingAdmission,initialRoom}).success,false);
});

test('host and admission document schemas reject engine secrets and invented metadata instead of stripping fields',()=>{
  for(const [schema,document] of [[FullHostSessionSchema,hostDocument],[FullAdmissionDocumentSchema,pendingAdmission],[FullAdmissionDocumentSchema,approvedAdmission]]){
    for(const key of ['role','roles','code','protections','targetSeatId','recoveryToken','engine','matchId','admissionId','viewRevision']){
      assert.equal(schema.safeParse({...document,[key]:'synthetic-private'}).success,false,key);
    }
  }
  assert.equal(FullAdmissionDocumentSchema.safeParse({...pendingAdmission,protocolVersion:2}).success,false);
  assert.equal(FullHostSessionSchema.safeParse({...hostDocument,seats:[]}).success,false);
});

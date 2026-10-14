// mothership:dev-only
// Isolated native service journal + Rules browser acceptance. Setup choices/role draw are
// a legal synthetic history; phase deadlines below use real elapsed time in a local worker.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {CLONE_VERSION_PINS,CREW_CATALOG_VERSION,FullLobbyIdentityDocumentSchema} from '@mothership/contracts';
import {boardMedicalFixture,deadlinePayload} from '../../../../services/game-api/test-emulator/board-medical-helper.mjs';
const app=initializeApp({projectId:'demo-mothership'}),db=getFirestore(app),count=Number(process.env.BOARD_NATIVE_ROSTER??9);
const h=await boardMedicalFixture(db,count,{pins:CLONE_VERSION_PINS});
await h.until(s=>s.phase.kind==='CAPTAIN_ELECTION');for(const id of h.ids)await h.accept(id,{type:'VOTE',targetSeatId:'seat-1'});
await h.turn('seat-3',4);await h.accept('seat-3',{type:'REQUEST_BLACKOUT'});
await h.until(s=>s.round===4&&s.phase.kind==='BLACKOUT');let state=await h.current();h.setTime(state.blackout.darkStartsAt);
const target=state.seats.find(s=>s.seatId==='seat-4');await h.accept('seat-3',{type:'SELECT_BLACKOUT_SLOT',snapshotId:state.blackout.snapshotId,room:'Room A',slotId:target.slotId});
await h.turn('seat-6',5);await h.accept('seat-6',{type:'REQUEST_HACK',targetSeatId:'seat-7'});await h.accept('seat-6',{type:'PASS_TURN'});state=await h.current();assert.equal(state.phase.kind,'HACK_DECLARE');
await h.base.collection('identities').doc('public').set(FullLobbyIdentityDocumentSchema.parse({schemaVersion:1,protocolVersion:2,catalogVersion:CREW_CATALOG_VERSION,locked:true,matchId:state.matchId,revision:1,seats:h.ids.map((seatId,i)=>({seatId,displayName:`Native ${i+1}`,characterId:`c${i+1}`}))}));
const start=performance.now(),origin=h.now(),sync=()=>h.setTime(Math.max(h.now(),origin+Math.floor(performance.now()-start)));
const decisions=[],requests=[];let busy=false,drop=true,closed=false;
const worker=setInterval(async()=>{if(busy||closed)return;busy=true;try{sync();const current=await h.current();if(current.phase.endsAt!==null&&h.now()>=current.phase.endsAt){await h.service.runDeadline(deadlinePayload(current));decisions.push({phase:current.phase.kind,elapsedMs:Math.round(performance.now()-start)});}}finally{busy=false;}},80);
const headers={'access-control-allow-origin':'http://127.0.0.1:5197','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json','cache-control':'no-store'};
const server=createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}const url=new URL(req.url,'http://127.0.0.1:19291');
 try{if(url.pathname==='/context'){const seat=url.searchParams.get('seat'),identity=seat==='display'?h.display:h.players[Number(seat?.slice(5))-1];assert.ok(identity);res.writeHead(200,headers);res.end(JSON.stringify({matchId:state.matchId,identity}));return;}
 if(url.pathname==='/status'){const current=await h.current();const journal=(await h.base.collection('events').get()).docs.map(d=>d.data());const declarationDecisions=journal.filter(e=>e.kind==='COMMAND'&&e.request?.command?.type==='DECLARE_HACK_SIDE').length;res.writeHead(200,headers);res.end(JSON.stringify({phase:current.phase,declarationDecisions,publicSeats:current.seats.map(s=>({seatId:s.seatId,slotId:s.slotId,location:s.location,health:s.health})),decisions,requests:requests.map(r=>({operation:r.operation,phaseId:r.request.phaseId,commandId:r.request.commandId,type:r.request.command?.type}))}));return;}
 const token=req.headers.authorization?.replace(/^Bearer /,''),verified=await getAuth(app).verifyIdToken(token),chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString());sync();let response;
 if(url.pathname==='/v1Command'){response=await h.service.submit(verified.uid,body);requests.push({operation:'command',request:body});if(drop&&body.command.type==='DECLARE_HACK_SIDE'){drop=false;res.writeHead(200,headers);res.end('{');return;}}
 else if(url.pathname==='/v1Receipt'){response=await h.service.lookup(verified.uid,body);requests.push({operation:'receipt',request:body});}
 else if(url.pathname==='/v1ServerTime')response=await h.service.serverTime(verified.uid,body);
 else if(url.pathname==='/v1Advance')response=await h.service.advance(verified.uid,body);
 else throw Error('Not a documented native fixture operation');res.writeHead(200,headers);res.end(JSON.stringify(response));
 }catch(e){res.writeHead(500,headers);res.end(JSON.stringify({fixtureError:String(e.message)}));}});
await new Promise(resolve=>server.listen(19291,'127.0.0.1',resolve));await writeFile('/private/tmp/gamen-bv2-native/context.json',JSON.stringify({scope:'Real service decisions from legal synthetic SETUP journal; Auth tokens and Firestore Rules; real elapsed local deadline worker. Not native role randomness, production HTTP SDK, Cloud Tasks or physical-device acceptance.',matchId:state.matchId,count,phase:state.phase})+'\n');console.log('Native browser acceptance ready: '+state.matchId+'; R5 HACK_DECLARE');
async function close(){closed=true;clearInterval(worker);await writeFile('/private/tmp/gamen-bv2-native/service-evidence.json',JSON.stringify({matchId:state.matchId,count,decisions,requests:requests.map(r=>({operation:r.operation,type:r.request.command?.type,commandId:r.request.commandId,phaseId:r.request.phaseId}))},null,2)+'\n');server.close();await deleteApp(app);process.exit(0);}process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());

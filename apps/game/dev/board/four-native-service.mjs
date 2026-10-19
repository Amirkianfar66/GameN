// mothership:dev-only
// Isolated real Auth/Rules/service browser harness. One legal synthetic SETUP per history;
// all subsequent mutations use real commands/deadlines. No production Tasks/default activation.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {HOSPITAL_FOUR_VERSION_PINS,CREW_CATALOG_VERSION,FullLobbyIdentityDocumentSchema} from '@mothership/contracts';
import {boardMedicalFixture,deadlinePayload,assertBoardJournal} from '../../../../services/game-api/test-emulator/board-medical-helper.mjs';
const workers=new Set();
const app=initializeApp({projectId:'demo-mothership'},'frontend-four-browser'),db=getFirestore(app),histories=new Map(),requests=[],out='/private/tmp/gamen-four-native';await mkdir(out,{recursive:true});
async function prepare(count,kind){
 const h=await boardMedicalFixture(db,count,{pins:HOSPITAL_FOUR_VERSION_PINS,assetManifestVersion:'design-0.5.0'});
 async function vote(round,phase,target){const s=await h.until(s=>s.round===round&&s.phase.kind===phase);for(const id of s.eligibleVoters)await h.accept(id,{type:'VOTE',targetSeatId:target});await h.expire();await h.expire();}
 if(kind==='talk'){await vote(1,'JAIL_VOTE','seat-4');await vote(2,'CAPTAIN_ELECTION','seat-1');await h.turn('seat-6',5);await h.accept('seat-6',{type:'REQUEST_HACK',targetSeatId:'seat-7'});await h.accept('seat-6',{type:'PASS_TURN'});assert.equal((await h.current()).phase.kind,'HACK_DECLARE');}
 else{await vote(1,'JAIL_VOTE','seat-4');await vote(2,'CAPTAIN_ELECTION','seat-1');await h.turn(kind==='clone'?'seat-7':'seat-1',2);}
 await h.base.collection('identities').doc('public').set(FullLobbyIdentityDocumentSchema.parse({schemaVersion:1,protocolVersion:2,catalogVersion:CREW_CATALOG_VERSION,locked:true,matchId:h.base.id,revision:1,seats:h.ids.map((seatId,i)=>({seatId,displayName:`Native ${i+1}`,characterId:`c${i+1}`}))}));
 const start=performance.now(),origin=h.now();h.sync=()=>h.setTime(Math.max(h.now(),origin+Math.floor(performance.now()-start)));h.drop=kind==='release';h.kind=kind;
 if(kind==='talk'){let busy=false;const worker=setInterval(async()=>{if(busy)return;busy=true;try{h.sync();const s=await h.current();if(s.phase.endsAt!==null&&h.now()>=s.phase.endsAt)await h.service.runDeadline(deadlinePayload(s));}catch(e){console.error(e.stack);}finally{busy=false;}},80);workers.add(worker);}
 return h;
}
const headers={'access-control-allow-origin':'http://127.0.0.1:5297','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json','cache-control':'no-store'};
const server=createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}const url=new URL(req.url,'http://127.0.0.1:19391');try{
 if(url.pathname==='/context'){const count=Number(url.searchParams.get('roster')??7),kind=url.searchParams.get('kind')??'release';assert.ok([7,8,9].includes(count)&&['release','eject','clone','talk'].includes(kind));const key=`${count}-${kind}`;if(!histories.has(key))histories.set(key,prepare(count,kind));const h=await histories.get(key),seat=url.searchParams.get('seat'),identity=seat==='display'?h.display:h.players[Number(seat.slice(5))-1];h.sync();res.writeHead(200,headers);res.end(JSON.stringify({matchId:h.base.id,identity}));return;}
 if(url.pathname==='/status'){const status=[];for(const [key,p]of histories){const h=await p;status.push({key,matchId:h.base.id,state:await h.current(),requests:requests.filter(r=>r.matchId===h.base.id)});}res.writeHead(200,headers);res.end(JSON.stringify(status));return;}
 const verified=await getAuth(app).verifyIdToken(req.headers.authorization?.replace(/^Bearer /,'')),chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString());let h;for(const p of histories.values()){const candidate=await p;if(candidate.base.id===body.matchId){h=candidate;break;}}assert.ok(h);h.sync();let result;
 if(url.pathname==='/v1Command'){result=await h.service.submit(verified.uid,body);requests.push({matchId:h.base.id,operation:'command',commandId:body.commandId,type:body.command.type,response:result});if(h.drop&&body.command.type==='CAPTAIN_RELEASE'){h.drop=false;res.writeHead(200,headers);res.end('{');return;}}
 else if(url.pathname==='/v1Receipt'){result=await h.service.lookup(verified.uid,body);requests.push({matchId:h.base.id,operation:'receipt',commandId:body.commandId,response:result});}
 else if(url.pathname==='/v1ServerTime')result=await h.service.serverTime(verified.uid,body);
 else if(url.pathname==='/v1Advance')result=await h.service.advance(verified.uid,body);
 else throw Error('Unknown documented service operation');res.writeHead(200,headers);res.end(JSON.stringify(result));
 }catch(e){res.writeHead(500,headers);res.end(JSON.stringify({fixtureError:String(e.stack)}));}});
await new Promise(resolve=>server.listen(19391,'127.0.0.1',resolve));console.log('Frontend four-bed native browser service ready on 19391.');
let closing=false;async function close(){if(closing)return;closing=true;for(const worker of workers)clearInterval(worker);const evidence=[];for(const[key,p]of histories){const h=await p;await assertBoardJournal(h);evidence.push({key,matchId:h.base.id,state:await h.current(),requests:requests.filter(r=>r.matchId===h.base.id)});}await writeFile(out+'/service.json',JSON.stringify({scope:'Real service, Auth and Firestore Rules after a legal synthetic initial SETUP. Browser HTTP adapter validates Auth tokens; not production Functions/Tasks/native random setup.',evidence},null,2)+'\n');server.close();await db.terminate();await deleteApp(app);process.exit(0);}process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());

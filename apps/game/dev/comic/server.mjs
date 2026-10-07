// mothership:dev-only — same service and HTTP boundary, isolated demo Auth/Firestore.
import { createServer } from 'node:http';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createV1Service } from '@mothership/game-api';
import { createV1HttpHandler } from '../../../../infra/firebase/dist/v1.js';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8380' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9399' || process.env.GCLOUD_PROJECT !== 'demo-mothership') throw new Error('Isolated loopback emulators required');
const app=initializeApp({projectId:'demo-mothership'}), db=getFirestore(app);
const service=createV1Service({db,assetManifestVersion:'design-0.2.0'});
const names={v1CreateMatch:'createMatch',v1RequestAdmission:'requestAdmission',v1ApproveAdmission:'approveAdmission',v1AdmitDisplay:'admitDisplay',v1StartMatch:'startMatch',v1AbortMatch:'abortMatch',v1IssueSeatRecovery:'issueSeatRecovery',v1RedeemSeatRecovery:'redeemSeatRecovery',v1Command:'submit',v1Receipt:'lookup',v1Advance:'advance',v1ServerTime:'serverTime',v1SetLobbyIdentity:'setLobbyIdentity'};
const configuration={projectId:'demo-mothership',emulator:true,assetManifestVersion:'design-0.2.0',allowedOrigins:['http://127.0.0.1:5174','http://localhost:5174']};
const server=createServer(async(req,res)=>{
  const name=req.url?.split('/').at(-1); const operation=names[name];
  if(!operation){res.writeHead(404).end();return;}
  const chunks=[]; let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>4096){res.writeHead(413).end();return;}chunks.push(chunk);}
  const rawBody=Buffer.concat(chunks); let body;
  try{body=rawBody.length?JSON.parse(rawBody):null;}catch{res.writeHead(400).end();return;}
  await createV1HttpHandler(operation,{service,configuration,verifyIdToken:token=>getAuth(app).verifyIdToken(token,true),verifyAppCheckToken:async()=>{throw Error('No cloud tokens in local harness');}})({method:req.method,headers:req.headers,body,rawBody},{set:(k,v)=>res.setHeader(k,v),status(code){res.statusCode=code;return this;},json(value){res.setHeader('content-type','application/json');res.end(JSON.stringify(value));}});
});
server.listen(5204,'127.0.0.1',()=>console.log('Comic QA HTTP service on 127.0.0.1:5204; local emulators only.'));

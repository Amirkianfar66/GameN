import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { onInit } from 'firebase-functions/v2/core';
import { createGameService, createV1Service } from '@mothership/game-api';
import { createHttpHandler } from './http.js';
import { createTrustedDeadlineHandler } from './tasks.js';
import { assertRuntimeEnvironment } from './runtime.js';
import { createV1Entrypoints } from './v1.js';

// Discovery registers metadata only. Validate the real worker environment before
// any Admin SDK initialization or unsigned emulator-token trust can occur.
function initializeRuntime() {
  const configuration=assertRuntimeEnvironment(process.env);
  const app=getApps().find(candidate=>candidate.name==='[DEFAULT]') ?? initializeApp({projectId:configuration.projectId});
  if(app.options.projectId!==configuration.projectId) throw new Error('Firebase app project does not match the validated runtime');
  const db=getFirestore(app),legacy=createGameService({db});
  const full=createV1Service({db,assetManifestVersion:configuration.assetManifestVersion});
  const dependencies={service:legacy,
    verifyIdToken:(token:string)=>getAuth(app).verifyIdToken(token,true),
    verifyAppCheckToken:(token:string)=>getAppCheck(app).verifyToken(token),
    environment:{projectId:configuration.projectId,
      ...(configuration.functionsEmulator===undefined?{}:{functionsEmulator:configuration.functionsEmulator}),
      ...(configuration.authEmulatorHost===undefined?{}:{authEmulatorHost:configuration.authEmulatorHost}),
      ...(configuration.firestoreEmulatorHost===undefined?{}:{firestoreEmulatorHost:configuration.firestoreEmulatorHost})}};
  return {app,configuration,legacy,full,dependencies};
}
let runtime:ReturnType<typeof initializeRuntime>|undefined;
const getRuntime=()=>runtime ??= initializeRuntime();
onInit(()=>{getRuntime();});

const options={region:'us-central1',timeoutSeconds:30,cors:false} as const;
export const command=onRequest(options,async(req,res)=>createHttpHandler('command',getRuntime().dependencies)(req,res));
export const receipt=onRequest(options,async(req,res)=>createHttpHandler('receipt',getRuntime().dependencies)(req,res));
export const advance=onRequest(options,async(req,res)=>createHttpHandler('advance',getRuntime().dependencies)(req,res));
export const serverTime=onRequest(options,async(req,res)=>createHttpHandler('serverTime',getRuntime().dependencies)(req,res));
export const deadlineTask=onTaskDispatched({region:'us-central1',invoker:'private',timeoutSeconds:30,
  retryConfig:{maxAttempts:5,minBackoffSeconds:1,maxBackoffSeconds:30},rateLimits:{maxConcurrentDispatches:10}},
  async request=>createTrustedDeadlineHandler(getRuntime().legacy)(request.data));

const v1=createV1Entrypoints(()=>{const current=getRuntime();return {app:current.app,service:current.full,configuration:current.configuration};});
export const v1CreateMatch=v1.createMatch;
export const v1RequestAdmission=v1.requestAdmission;
export const v1ApproveAdmission=v1.approveAdmission;
export const v1AdmitDisplay=v1.admitDisplay;
export const v1StartMatch=v1.startMatch;
export const v1Command=v1.submit;
export const v1Receipt=v1.lookup;
export const v1Advance=v1.advance;
export const v1ServerTime=v1.serverTime;
export const v1AbortMatch=v1.abortMatch;
export const v1IssueSeatRecovery=v1.issueSeatRecovery;
export const v1RedeemSeatRecovery=v1.redeemSeatRecovery;
export const v1DeadlineTask=v1.deadlineTask;
export const v1DispatchDeadline=v1.dispatchDeadline;
export const v1RepairDeadlines=v1.repairDeadlines;
export const firebaseDirection={status:'in-person-v1-pending-review',authentication:'Firebase Auth',
  commands:'Cloud Functions for Firebase, second generation',persistence:'Firestore',deadlines:'Cloud Tasks with a durable outbox',productionDeliveryVerified:false} as const;

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onInit } from 'firebase-functions/v2/core';
import { createV1Service } from '@mothership/game-api';
import { assertRuntimeEnvironment } from './runtime.js';
import { createV1Entrypoints } from './v1.js';

// Standalone V1 artifact: development-only protocol-1 handlers are not exported.
function initializeRuntime() {
  const configuration=assertRuntimeEnvironment(process.env);
  const app=getApps().find(candidate=>candidate.name==='[DEFAULT]') ?? initializeApp({projectId:configuration.projectId});
  if(app.options.projectId!==configuration.projectId)throw new Error('Firebase app project does not match the validated runtime');
  return {app,configuration,service:createV1Service({db:getFirestore(app),assetManifestVersion:configuration.assetManifestVersion})};
}
let runtime:ReturnType<typeof initializeRuntime>|undefined;
const getRuntime=()=>runtime ??= initializeRuntime();
onInit(()=>{getRuntime();});
const v1=createV1Entrypoints(getRuntime);
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

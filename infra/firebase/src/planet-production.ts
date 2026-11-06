import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onInit } from 'firebase-functions/v2/core';
import { createFirestorePlanetStore, createProductionPlanetService } from '@mothership/game-api';
import { assertPlanetRuntimeEnvironment } from './planet-runtime.js';
import { createPlanetEntrypoints } from './planet.js';

function initializeRuntime() {
  const configuration = assertPlanetRuntimeEnvironment(process.env);
  const app = getApps().find(candidate => candidate.name === '[DEFAULT]') ?? initializeApp({projectId: configuration.projectId});
  if (app.options.projectId !== configuration.projectId) throw new Error('Firebase app project does not match the validated Planet runtime');
  return {app, configuration, service: createProductionPlanetService({store: createFirestorePlanetStore(getFirestore(app)),
    assetManifestVersion: configuration.assetManifestVersion, enabled: configuration.creationEnabled})};
}
let runtime: ReturnType<typeof initializeRuntime> | undefined;
const getRuntime = () => runtime ??= initializeRuntime();
onInit(() => { getRuntime(); });
const planet = createPlanetEntrypoints(getRuntime);
export const planetApi = planet.api;
export const planetDeadlineTask = planet.deadlineTask;
export const planetDispatchDeadline = planet.dispatchDeadline;
export const planetRepairDeadlines = planet.repairDeadlines;
export const planetRunBots = planet.runBots;

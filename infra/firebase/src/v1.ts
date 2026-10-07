import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFunctions } from 'firebase-admin/functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  FullSetPracticeBotsRequestSchema, FullSetPracticeBotsResponseSchema,
  FullBeginSetupRequestSchema, FullBeginSetupResponseSchema,
  FullConfirmSetupChoiceRequestSchema, FullConfirmSetupChoiceResponseSchema,
  FullReadyForMatchRequestSchema, FullReadyForMatchResponseSchema,
} from '@mothership/contracts';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { RuntimeConfiguration } from './runtime.js';
export interface V1HttpRequest { method: string; body: unknown; headers: Record<string, string | string[] | undefined>; rawBody?: Uint8Array }
export interface V1HttpResponse { set(field: string, value: string): unknown; status(code: number): V1HttpResponse; json(body: unknown): unknown }

export const V1_OPERATIONS = ['createMatch', 'requestAdmission', 'approveAdmission', 'admitDisplay', 'startMatch', 'submit', 'lookup', 'advance', 'serverTime', 'abortMatch', 'issueSeatRecovery', 'redeemSeatRecovery', 'setLobbyIdentity', 'setPracticeBots', 'beginSetup', 'confirmSetupChoice', 'readyForMatch'] as const;
export type V1Operation = typeof V1_OPERATIONS[number];
export type V1Deadline = { matchId: string; phaseId: string; deadlineToken: string };
export type V1DeadlineIntent = V1Deadline & { taskId: string; endsAt: number };
export type V1Enqueue = (intent: V1DeadlineIntent) => Promise<void>;
export type V1SetupDeadline = { matchId: string; setupId: string; stage: 'choosing' | 'awaiting-ready'; deadlineToken: string };
export type V1SetupDeadlineIntent = V1SetupDeadline & { taskId: string; dueAt: number };
export type V1SetupEnqueue = (intent: V1SetupDeadlineIntent) => Promise<void>;
export type V1SetupDeadlineResult = { status: 'advanced' | 'unchanged' | 'too-early' | 'failed' | 'blocked'; retryAfterMs?: number };
export type V1HttpService = { [Operation in V1Operation]: (uid: string, payload: unknown) => Promise<unknown> };
export type V1PracticeBotsResult = { status: 'advanced' | 'unchanged' | 'failed' | 'blocked'; processed: number };
export type V1Service = V1HttpService & {
  runPracticeBots(matchId: string, options: { limit: number }): Promise<V1PracticeBotsResult>;
  runDeadline(payload: V1Deadline): Promise<unknown>;
  runSetupDeadline(payload: V1SetupDeadline): Promise<V1SetupDeadlineResult>;
  dispatchSetupDeadlineIntent(path: string, enqueue: V1SetupEnqueue): Promise<unknown>;
  repairSetupOutbox(enqueue: V1SetupEnqueue, options: { limit: number; cursor?: string }): Promise<unknown>;
  dispatchDeadlineIntent(path: string, enqueue: V1Enqueue): Promise<unknown>;
  repairOutbox(enqueue: V1Enqueue, options: { limit: number; cursor?: string }): Promise<unknown>;
};
export interface V1HttpDependencies {
  service: V1HttpService;
  verifyIdToken(token: string): Promise<{ uid: string }>;
  verifyAppCheckToken(token: string): Promise<unknown>;
  configuration: RuntimeConfiguration;
  clock?: () => number;
}
const deadlineTaskId = (matchId: string, phaseId: string, deadlineToken: string): string => createHash('sha256').update(JSON.stringify([matchId, phaseId, deadlineToken])).digest('hex');
const setupDeadlineTaskId = (intent: V1SetupDeadline): string => createHash('sha256').update(JSON.stringify(['setup', intent.matchId, intent.setupId, intent.stage, intent.deadlineToken])).digest('hex');
const strictOperations = {
  setPracticeBots: { request: FullSetPracticeBotsRequestSchema, response: FullSetPracticeBotsResponseSchema },
  beginSetup: { request: FullBeginSetupRequestSchema, response: FullBeginSetupResponseSchema },
  confirmSetupChoice: { request: FullConfirmSetupChoiceRequestSchema, response: FullConfirmSetupChoiceResponseSchema },
  readyForMatch: { request: FullReadyForMatchRequestSchema, response: FullReadyForMatchResponseSchema },
} as const;
const allowedHeaders = ['authorization', 'content-type', 'x-firebase-appcheck'];
const identity = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
function header(request: V1HttpRequest, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === 'string' ? value : undefined;
}
function length(request: V1HttpRequest): number {
  if (request.rawBody !== undefined) return request.rawBody.byteLength;
  try { return Buffer.byteLength(JSON.stringify(request.body) ?? '', 'utf8'); } catch { return Infinity; }
}
const statusFor = (code: unknown): number => code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403
  : code === 'UNAVAILABLE' ? 503 : code === 'COMMAND_ID_CONFLICT' || code === 'REQUEST_ID_CONFLICT' ? 409
  : ['CHARACTER_TAKEN', 'IDENTITY_LOCKED', 'LOBBY_LOCKED', 'CAPACITY_EXCEEDED', 'ROSTER_INCOMPLETE', 'NAME_TAKEN', 'SETUP_LOCKED', 'STALE_DEAL', 'STALE_BINDING'].includes(code as string) ? 409
  : code === 'RATE_LIMITED' ? 429 : code === 'INVALID_REQUEST' || code === 'UNSUPPORTED_PROTOCOL' || code === 'UNSUPPORTED_SCHEMA' ? 400 : 200;

export function createV1HttpHandler(operation: V1Operation, dependencies: V1HttpDependencies) {
  const clock = dependencies.clock ?? Date.now;
  return async (request: V1HttpRequest, response: V1HttpResponse): Promise<void> => {
    response.set('Cache-Control', 'no-store, private');
    response.set('Pragma', 'no-cache');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Vary', 'Origin');
    const fail = (status: number, code: string) => { response.status(status).json({ ...((operation === 'setLobbyIdentity' || operation in strictOperations) ? { schemaVersion: 1, protocolVersion: 2 } : {}), ok: false, serverTimeMs: clock(), error: { code } }); };
    const origin = header(request, 'origin');
    if (request.headers['origin'] !== undefined && (origin === undefined || !dependencies.configuration.allowedOrigins.includes(origin))) {
      fail(403, 'FORBIDDEN'); return;
    }
    if (origin !== undefined) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const requested = (header(request, 'access-control-request-headers') ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (origin === undefined || header(request, 'access-control-request-method') !== 'POST'
        || requested.length > 8 || requested.some(value => !allowedHeaders.includes(value))) {
        fail(400, 'INVALID_REQUEST'); return;
      }
      response.set('Access-Control-Allow-Methods', 'POST');
      response.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      response.set('Access-Control-Max-Age', '300');
      response.status(204).json(null); return;
    }
    if (request.method !== 'POST') { response.set('Allow', 'POST, OPTIONS'); fail(405, 'INVALID_REQUEST'); return; }
    if (!/^application\/json(?:\s*;.*)?$/i.test(header(request, 'content-type') ?? '')) { fail(415, 'INVALID_REQUEST'); return; }
    if (length(request) > 4096) { fail(413, 'INVALID_REQUEST'); return; }
    const authorization = header(request, 'authorization');
    const token = authorization !== undefined && authorization.length <= 8192 ? authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1] : undefined;
    if (token === undefined) { fail(401, 'UNAUTHENTICATED'); return; }
    let uid: string;
    try {
      uid = (await dependencies.verifyIdToken(token)).uid;
      if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128 || uid.includes('/')) throw new Error('Invalid verified subject');
    } catch { fail(401, 'UNAUTHENTICATED'); return; }
    if (!dependencies.configuration.emulator) {
      const appToken = header(request, 'x-firebase-appcheck');
      if (appToken === undefined || appToken.length === 0 || appToken.length > 8192) { fail(403, 'FORBIDDEN'); return; }
      try { await dependencies.verifyAppCheckToken(appToken); } catch { fail(403, 'FORBIDDEN'); return; }
    }
    try {
      let payload = request.body;
      const schemas = operation in strictOperations ? strictOperations[operation as keyof typeof strictOperations] : undefined;
      if (schemas !== undefined) {
        if (payload !== null && typeof payload === 'object') {
          if ('protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) { fail(400, 'UNSUPPORTED_PROTOCOL'); return; }
          if ('schemaVersion' in payload && typeof payload.schemaVersion === 'number' && payload.schemaVersion !== 1) { fail(400, 'UNSUPPORTED_SCHEMA'); return; }
        }
        const parsed = schemas.request.safeParse(payload);
        if (!parsed.success) { fail(400, 'INVALID_REQUEST'); return; }
        payload = parsed.data;
      }
      const given = await dependencies.service[operation](uid, payload);
      let result = given;
      if (schemas !== undefined) {
        const parsed = schemas.response.parse(given);
        if (operation !== 'setPracticeBots' && parsed.ok) {
          const expected = payload as { matchId: string; requestId: string };
          if (parsed.matchId !== expected.matchId || parsed.requestId !== expected.requestId) throw new Error('Setup response context does not match');
        }
        result = parsed;
      }
      const code = result !== null && typeof result === 'object' && 'ok' in result && result.ok === false
        && 'error' in result && result.error !== null && typeof result.error === 'object' && 'code' in result.error ? result.error.code : undefined;
      response.status(statusFor(code)).json(result);
    } catch { fail(503, 'UNAVAILABLE'); }
  };
}

function taskExists(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error
    && ['functions/task-already-exists', 'ALREADY_EXISTS', 6].includes(error.code as string | number);
}
export function createV1Enqueuer(queue: { enqueue(payload: V1Deadline, options: { id: string; scheduleTime: Date }): Promise<void> }): V1Enqueue {
  return async intent => {
    if (![intent.matchId, intent.phaseId, intent.deadlineToken, intent.taskId].every(value => typeof value === 'string' && identity.test(value))
      || intent.taskId !== deadlineTaskId(intent.matchId, intent.phaseId, intent.deadlineToken)
      || !Number.isSafeInteger(intent.endsAt) || intent.endsAt < 0 || !Number.isFinite(new Date(intent.endsAt).getTime())) throw new Error('Invalid deadline intent');
    try { await queue.enqueue({ matchId: intent.matchId, phaseId: intent.phaseId, deadlineToken: intent.deadlineToken }, { id: intent.taskId, scheduleTime: new Date(intent.endsAt) }); }
    catch (error) { if (!taskExists(error)) throw error; }
  };
}
function validSetupDeadline(payload: unknown): payload is V1SetupDeadline {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    && Object.keys(payload).length === 4 && Object.keys(payload).every(key => ['matchId', 'setupId', 'stage', 'deadlineToken'].includes(key))
    && ['matchId', 'setupId', 'deadlineToken'].every(key => typeof (payload as Record<string, unknown>)[key] === 'string' && identity.test((payload as Record<string, string>)[key]!))
    && 'stage' in payload && (payload.stage === 'choosing' || payload.stage === 'awaiting-ready');
}
export function createV1SetupEnqueuer(queue: { enqueue(payload: V1SetupDeadline, options: { id: string; scheduleTime: Date }): Promise<void> }): V1SetupEnqueue {
  return async intent => {
    const payload: V1SetupDeadline = { matchId: intent.matchId, setupId: intent.setupId, stage: intent.stage, deadlineToken: intent.deadlineToken };
    if (!validSetupDeadline(payload) || intent.taskId !== setupDeadlineTaskId(payload)
      || !Number.isSafeInteger(intent.dueAt) || intent.dueAt < 0 || !Number.isFinite(new Date(intent.dueAt).getTime())) throw new Error('Invalid setup deadline intent');
    try { await queue.enqueue(payload, { id: intent.taskId, scheduleTime: new Date(intent.dueAt) }); }
    catch (error) { if (!taskExists(error)) throw error; }
  };
}
export function createV1SetupDeadlineHandler(service: Pick<V1Service, 'runSetupDeadline'>) {
  return async (payload: unknown): Promise<void> => {
    if (!validSetupDeadline(payload)) throw new Error('Invalid setup deadline task');
    let result: V1SetupDeadlineResult;
    try { result = await service.runSetupDeadline(payload); }
    catch { throw new Error('Setup deadline evaluation unavailable'); }
    if (result === null || typeof result !== 'object'
      || !Object.keys(result).every(key => ['status', 'retryAfterMs'].includes(key))
      || !['advanced', 'unchanged', 'too-early', 'failed', 'blocked'].includes(result.status)
      || (result.status === 'too-early'
        ? !Number.isSafeInteger(result.retryAfterMs) || result.retryAfterMs! <= 0
        : result.retryAfterMs !== undefined)) throw new Error('Setup deadline evaluation unavailable');
    // An early delivery is not completion. Cloud Tasks must retain and retry it.
    if (result.status === 'too-early') throw new Error('Setup deadline has not elapsed');
    if (result.status === 'failed') throw new Error('Setup deadline evaluation unavailable');
    // The engine write at actual launch owns gameplay timers and the bot trigger.
  };
}
export function createV1SetupRepairHandler(service: Pick<V1Service, 'repairSetupOutbox'>, enqueue: V1SetupEnqueue) {
  return async (): Promise<void> => {
    let result: unknown;
    try { result = await service.repairSetupOutbox(enqueue, { limit: 100 }); }
    catch { throw new Error('Setup deadline repair unavailable'); }
    if (result === null || typeof result !== 'object'
      || !['dispatched', 'unchanged', 'failed', 'blocked'].every(key => key in result && Number.isSafeInteger((result as Record<string, unknown>)[key]) && ((result as Record<string, number>)[key] ?? -1) >= 0)
      || !('failed' in result) || result.failed !== 0) throw new Error('Setup deadline repair unavailable');
  };
}
export function createV1PracticeBotsHandler(service: Pick<V1Service, 'runPracticeBots'>) {
  return async (matchId: unknown): Promise<void> => {
    if (typeof matchId !== 'string' || !identity.test(matchId)) throw new Error('Invalid practice bot match');
    let result: V1PracticeBotsResult;
    try { result = await service.runPracticeBots(matchId, { limit: 18 }); }
    catch { throw new Error('Practice bot evaluation unavailable'); }
    if (result === null || typeof result !== 'object'
      || !['advanced', 'unchanged', 'blocked'].includes(result.status)
      || !Number.isSafeInteger(result.processed) || result.processed < 0 || result.processed > 18) {
      throw new Error('Practice bot evaluation unavailable');
    }
  };
}
export function createV1DeadlineHandler(service: Pick<V1Service, 'runDeadline' | 'runPracticeBots'>) {
  return async (payload: unknown): Promise<void> => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 3
      || !Object.keys(payload).every(key => ['matchId', 'phaseId', 'deadlineToken'].includes(key))
      || !['matchId', 'phaseId', 'deadlineToken'].every(key => typeof (payload as Record<string, unknown>)[key] === 'string' && identity.test((payload as Record<string, string>)[key]!))) throw new Error('Invalid deadline task');
    let result: unknown;
    try { result = await service.runDeadline(payload as V1Deadline); } catch { throw new Error('Deadline evaluation unavailable'); }
    if (result !== null && typeof result === 'object' && 'ok' in result && result.ok === false) throw new Error('Deadline evaluation unavailable');
    await createV1PracticeBotsHandler(service)((payload as V1Deadline).matchId);
  };
}

export interface V1RuntimeContext { app: App; service: V1Service; configuration: RuntimeConfiguration }

/** Register without SDK initialization; resolve only after the runtime's guarded onInit callback. */
export function createV1Entrypoints(resolveContext: () => V1RuntimeContext) {
  const endpoints = Object.fromEntries(V1_OPERATIONS.map(operation => [operation, onRequest({ region: 'us-central1', timeoutSeconds: 30, cors: false,
    ...(['setPracticeBots', 'beginSetup', 'confirmSetupChoice', 'readyForMatch'].includes(operation) ? { maxInstances: 12, minInstances: 0 } : {}),
  }, async (request, response) => {
    const { app, service, configuration } = resolveContext();
    await createV1HttpHandler(operation, {
      service, configuration,
      verifyIdToken: token => getAuth(app).verifyIdToken(token, true),
      verifyAppCheckToken: token => getAppCheck(app).verifyToken(token),
    })(request, response);
  })])) as Record<V1Operation, ReturnType<typeof onRequest>>;
  const enqueue: V1Enqueue = async intent => {
    const {app,configuration}=resolveContext();
    if(configuration.emulator && configuration.tasksEmulatorHost===undefined) throw new Error('The local Cloud Tasks emulator is required for enqueue');
    const queue = getFunctions(app).taskQueue<V1Deadline>('locations/us-central1/functions/v1DeadlineTask');
    await createV1Enqueuer(queue)(intent);
  };
  const enqueueSetup: V1SetupEnqueue = async intent => {
    const { app, configuration } = resolveContext();
    if (configuration.emulator && configuration.tasksEmulatorHost === undefined) throw new Error('The local Cloud Tasks emulator is required for setup enqueue');
    const queue = getFunctions(app).taskQueue<V1SetupDeadline>('locations/us-central1/functions/v1SetupDeadlineTask');
    await createV1SetupEnqueuer(queue)(intent);
  };
  const setupDeadlineTask = onTaskDispatched({ region: 'us-central1', invoker: 'private', timeoutSeconds: 30, maxInstances: 12, minInstances: 0,
    retryConfig: { maxAttempts: 10, minBackoffSeconds: 1, maxBackoffSeconds: 60 }, rateLimits: { maxConcurrentDispatches: 10 } }, request => createV1SetupDeadlineHandler(resolveContext().service)(request.data));
  const dispatchSetupDeadline = onDocumentCreated({ document: 'matches/{matchId}/setupOutbox/{intentId}', region: 'us-central1', retry: true, timeoutSeconds: 30, maxInstances: 12, minInstances: 0 }, async event => {
    if (event.data === undefined || event.data.get('protocolVersion') !== 2) return;
    let result: unknown;
    try { result = await resolveContext().service.dispatchSetupDeadlineIntent(event.data.ref.path, enqueueSetup); }
    catch { throw new Error('Setup deadline dispatch unavailable'); }
    if (result === null || typeof result !== 'object' || !('status' in result)
      || !['dispatched', 'unchanged', 'blocked'].includes(result.status as string)) throw new Error('Setup deadline dispatch unavailable');
  });
  const repairSetupDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'us-central1', timeoutSeconds: 60, maxInstances: 12, minInstances: 0 },
    () => createV1SetupRepairHandler(resolveContext().service, enqueueSetup)());
  const deadlineTask = onTaskDispatched({ region: 'us-central1', invoker: 'private', timeoutSeconds: 30,
    retryConfig: { maxAttempts: 10, minBackoffSeconds: 1, maxBackoffSeconds: 60 }, rateLimits: { maxConcurrentDispatches: 10 } }, request => createV1DeadlineHandler(resolveContext().service)(request.data));
  const dispatchDeadline = onDocumentCreated({ document: 'matches/{matchId}/outbox/{intentId}', region: 'us-central1', retry: true }, async event => {
    if (event.data === undefined || event.data.get('protocolVersion') !== 2) return;
    const result = await resolveContext().service.dispatchDeadlineIntent(event.data.ref.path, enqueue);
    if (result !== null && typeof result === 'object' && 'status' in result && result.status === 'failed') throw new Error('Deadline dispatch unavailable');
  });
  const runPracticeBots = onDocumentWritten({ document: 'matches/{matchId}/engine/current', region: 'us-central1', retry: true, timeoutSeconds: 60, maxInstances: 12, minInstances: 0 }, async event => {
    const after = event.data?.after;
    if (after?.exists !== true || after.get('versions.protocolVersion') !== 2) return;
    await createV1PracticeBotsHandler(resolveContext().service)(event.params.matchId);
  });
  // One bounded page per invocation; pending intents outside the page remain eligible next minute.
  const repairDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'us-central1', timeoutSeconds: 60 }, async () => {
    await resolveContext().service.repairOutbox(enqueue, { limit: 100 });
  });
  return { ...endpoints, deadlineTask, dispatchDeadline, repairDeadlines, runPracticeBots, setupDeadlineTask, dispatchSetupDeadline, repairSetupDeadlines };
}

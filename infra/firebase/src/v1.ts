import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFunctions } from 'firebase-admin/functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { RuntimeConfiguration } from './runtime.js';
export interface V1HttpRequest { method: string; body: unknown; headers: Record<string, string | string[] | undefined>; rawBody?: Uint8Array }
export interface V1HttpResponse { set(field: string, value: string): unknown; status(code: number): V1HttpResponse; json(body: unknown): unknown }

export const V1_OPERATIONS = ['createMatch', 'requestAdmission', 'approveAdmission', 'admitDisplay', 'startMatch', 'submit', 'lookup', 'advance', 'serverTime', 'abortMatch', 'issueSeatRecovery', 'redeemSeatRecovery'] as const;
export type V1Operation = typeof V1_OPERATIONS[number];
export type V1Deadline = { matchId: string; phaseId: string; deadlineToken: string };
export type V1DeadlineIntent = V1Deadline & { taskId: string; endsAt: number };
export type V1Enqueue = (intent: V1DeadlineIntent) => Promise<void>;
export type V1HttpService = { [Operation in V1Operation]: (uid: string, payload: unknown) => Promise<unknown> };
export type V1Service = V1HttpService & {
  runDeadline(payload: V1Deadline): Promise<unknown>;
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
  : code === 'RATE_LIMITED' ? 429 : code === 'INVALID_REQUEST' || code === 'UNSUPPORTED_PROTOCOL' ? 400 : 200;

export function createV1HttpHandler(operation: V1Operation, dependencies: V1HttpDependencies) {
  const clock = dependencies.clock ?? Date.now;
  return async (request: V1HttpRequest, response: V1HttpResponse): Promise<void> => {
    response.set('Cache-Control', 'no-store, private');
    response.set('Pragma', 'no-cache');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Vary', 'Origin');
    const fail = (status: number, code: string) => { response.status(status).json({ ok: false, serverTimeMs: clock(), error: { code } }); };
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
      const result = await dependencies.service[operation](uid, request.body);
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
export function createV1DeadlineHandler(service: Pick<V1Service, 'runDeadline'>) {
  return async (payload: unknown): Promise<void> => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 3
      || !Object.keys(payload).every(key => ['matchId', 'phaseId', 'deadlineToken'].includes(key))
      || !['matchId', 'phaseId', 'deadlineToken'].every(key => typeof (payload as Record<string, unknown>)[key] === 'string' && identity.test((payload as Record<string, string>)[key]!))) throw new Error('Invalid deadline task');
    let result: unknown;
    try { result = await service.runDeadline(payload as V1Deadline); } catch { throw new Error('Deadline evaluation unavailable'); }
    if (result !== null && typeof result === 'object' && 'ok' in result && result.ok === false) throw new Error('Deadline evaluation unavailable');
  };
}

export interface V1RuntimeContext { app: App; service: V1Service; configuration: RuntimeConfiguration }

/** Register without SDK initialization; resolve only after the runtime's guarded onInit callback. */
export function createV1Entrypoints(resolveContext: () => V1RuntimeContext) {
  const endpoints = Object.fromEntries(V1_OPERATIONS.map(operation => [operation, onRequest({ region: 'us-central1', timeoutSeconds: 30, cors: false }, async (request, response) => {
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
  const deadlineTask = onTaskDispatched({ region: 'us-central1', invoker: 'private', timeoutSeconds: 30,
    retryConfig: { maxAttempts: 10, minBackoffSeconds: 1, maxBackoffSeconds: 60 }, rateLimits: { maxConcurrentDispatches: 10 } }, request => createV1DeadlineHandler(resolveContext().service)(request.data));
  const dispatchDeadline = onDocumentCreated({ document: 'matches/{matchId}/outbox/{intentId}', region: 'us-central1', retry: true }, async event => {
    if (event.data === undefined || event.data.get('protocolVersion') !== 2) return;
    const result = await resolveContext().service.dispatchDeadlineIntent(event.data.ref.path, enqueue);
    if (result !== null && typeof result === 'object' && 'status' in result && result.status === 'failed') throw new Error('Deadline dispatch unavailable');
  });
  // One bounded page per invocation; pending intents outside the page remain eligible next minute.
  const repairDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'us-central1', timeoutSeconds: 60 }, async () => {
    await resolveContext().service.repairOutbox(enqueue, { limit: 100 });
  });
  return { ...endpoints, deadlineTask, dispatchDeadline, repairDeadlines };
}

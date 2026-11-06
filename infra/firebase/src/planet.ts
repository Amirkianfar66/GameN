import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFunctions } from 'firebase-admin/functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { IdentifierSchema, PlanetServiceRequestSchema } from '@mothership/contracts';
import type { PlanetServiceResponse } from '@mothership/contracts';
import type { PlanetDeadlineJob } from '@mothership/game-api';
import type { PlanetRuntimeConfiguration } from './planet-runtime.js';

export interface PlanetDeadlinePayload { matchId: string; phaseId: string; deadlineToken: string; kind: 'setup' | 'game' }
export type PlanetEnqueue = (job: PlanetDeadlineJob) => Promise<void>;
export interface PlanetHttpService { handle(uid: string, request: unknown): Promise<PlanetServiceResponse> }
export interface PlanetService extends PlanetHttpService {
  runDeadline(job: PlanetDeadlinePayload): Promise<{status: 'advanced' | 'unchanged' | 'too-early'; retryAfterMs?: number}>;
  dispatchDeadline(taskId: string, enqueue: PlanetEnqueue): Promise<void>;
  repairDeadlines(enqueue: PlanetEnqueue): Promise<{dispatched: number; advanced: number; failed: number}>;
  runBots(matchId: string): Promise<unknown>;
}
interface HttpRequest { method: string; body: unknown; headers: Record<string, string | string[] | undefined>; rawBody?: Uint8Array }
interface HttpResponse { set(field: string, value: string): unknown; status(code: number): HttpResponse; json(body: unknown): unknown }
export interface PlanetHttpDependencies {
  service: PlanetHttpService; configuration: Pick<PlanetRuntimeConfiguration, 'allowedOrigins' | 'emulator'>;
  verifyIdToken(token: string): Promise<{uid: string}>; verifyAppCheckToken(token: string): Promise<unknown>; clock?: () => number;
}
const allowedHeaders = ['authorization', 'content-type', 'x-firebase-appcheck'];
const header = (request: HttpRequest, name: string): string | undefined => typeof request.headers[name] === 'string' ? request.headers[name] : undefined;
const statusFor = (code: unknown): number => code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403
  : code === 'UNAVAILABLE' ? 503 : code === 'RATE_LIMITED' ? 429 : code === 'INVALID_REQUEST' ? 400
  : code === 'REQUEST_ID_CONFLICT' || code === 'COMMAND_ID_CONFLICT' ? 409 : 200;

/** One authenticated, strictly typed protocol-3 endpoint. Identity is never read from JSON. */
export function createPlanetHttpHandler(dependencies: PlanetHttpDependencies) {
  const clock = dependencies.clock ?? Date.now;
  return async (request: HttpRequest, response: HttpResponse): Promise<void> => {
    response.set('Cache-Control', 'no-store, private'); response.set('Pragma', 'no-cache');
    response.set('X-Content-Type-Options', 'nosniff'); response.set('Vary', 'Origin');
    const fail = (status: number, code: string) => response.status(status).json({ok: false, serverTimeMs: clock(), error: {code}});
    const origin = header(request, 'origin');
    if (request.headers['origin'] !== undefined && (origin === undefined || !dependencies.configuration.allowedOrigins.includes(origin))) { fail(403, 'FORBIDDEN'); return; }
    if (origin !== undefined) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const requested = (header(request, 'access-control-request-headers') ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (origin === undefined || header(request, 'access-control-request-method') !== 'POST'
        || requested.length > 8 || requested.some(value => !allowedHeaders.includes(value))) { fail(400, 'INVALID_REQUEST'); return; }
      response.set('Access-Control-Allow-Methods', 'POST'); response.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      response.set('Access-Control-Max-Age', '300'); response.status(204).json(null); return;
    }
    if (request.method !== 'POST') { response.set('Allow', 'POST, OPTIONS'); fail(405, 'INVALID_REQUEST'); return; }
    if (!/^application\/json(?:\s*;.*)?$/i.test(header(request, 'content-type') ?? '')) { fail(415, 'INVALID_REQUEST'); return; }
    let bytes = Infinity;
    try { bytes = request.rawBody?.byteLength ?? Buffer.byteLength(JSON.stringify(request.body) ?? '', 'utf8'); } catch { /* fail closed */ }
    if (bytes > 16_384) { fail(413, 'INVALID_REQUEST'); return; }
    const authorization = header(request, 'authorization');
    const token = authorization !== undefined && authorization.length <= 8192 ? authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1] : undefined;
    if (token === undefined) { fail(401, 'UNAUTHENTICATED'); return; }
    let uid: string;
    try {
      uid = (await dependencies.verifyIdToken(token)).uid;
      if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('Invalid verified subject');
    } catch { fail(401, 'UNAUTHENTICATED'); return; }
    if (!dependencies.configuration.emulator) {
      const appToken = header(request, 'x-firebase-appcheck');
      if (appToken === undefined || appToken.length === 0 || appToken.length > 8192) { fail(403, 'FORBIDDEN'); return; }
      try { await dependencies.verifyAppCheckToken(appToken); } catch { fail(403, 'FORBIDDEN'); return; }
    }
    const parsed = PlanetServiceRequestSchema.safeParse(request.body);
    if (!parsed.success) { fail(400, 'INVALID_REQUEST'); return; }
    try {
      const result = await dependencies.service.handle(uid, parsed.data);
      response.status(statusFor(result.ok ? undefined : result.error.code)).json(result);
    } catch { fail(503, 'UNAVAILABLE'); }
  };
}

function validDeadline(payload: unknown): payload is PlanetDeadlinePayload {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    && Object.keys(payload).length === 4 && Object.keys(payload).every(key => ['matchId', 'phaseId', 'deadlineToken', 'kind'].includes(key))
    && ['matchId', 'phaseId', 'deadlineToken'].every(key => IdentifierSchema.safeParse((payload as Record<string, unknown>)[key]).success)
    && 'kind' in payload && (payload.kind === 'setup' || payload.kind === 'game');
}
const taskId = (payload: PlanetDeadlinePayload): string => createHash('sha256').update(JSON.stringify([payload.matchId, payload.phaseId, payload.deadlineToken])).digest('hex');
export function createPlanetEnqueuer(queue: {enqueue(payload: PlanetDeadlinePayload, options: {id: string; scheduleTime: Date}): Promise<void>}): PlanetEnqueue {
  return async job => {
    const payload: PlanetDeadlinePayload = {matchId: job.matchId, phaseId: job.phaseId, deadlineToken: job.deadlineToken, kind: job.kind};
    if (!validDeadline(payload) || job.taskId !== taskId(payload) || !Number.isSafeInteger(job.endsAt) || job.endsAt < 0
      || !Number.isFinite(new Date(job.endsAt).getTime())) throw new Error('Invalid Planet deadline intent');
    try { await queue.enqueue(payload, {id: job.taskId, scheduleTime: new Date(job.endsAt)}); }
    catch (error) {
      if (error === null || typeof error !== 'object' || !('code' in error)
        || !['functions/task-already-exists', 'ALREADY_EXISTS', 6].includes(error.code as string | number)) throw error;
    }
  };
}
export function createPlanetDeadlineHandler(service: Pick<PlanetService, 'runDeadline'>) {
  return async (payload: unknown): Promise<void> => {
    if (!validDeadline(payload)) throw new Error('Invalid Planet deadline payload');
    let result: Awaited<ReturnType<PlanetService['runDeadline']>>;
    try { result = await service.runDeadline(payload); } catch { throw new Error('Planet deadline evaluation unavailable'); }
    if (result === null || typeof result !== 'object' || !['advanced', 'unchanged', 'too-early'].includes(result.status)
      || Object.keys(result).some(key => !['status', 'retryAfterMs'].includes(key))
      || (result.status === 'too-early' ? !Number.isSafeInteger(result.retryAfterMs) || result.retryAfterMs! <= 0 : result.retryAfterMs !== undefined)) {
      throw new Error('Planet deadline evaluation unavailable');
    }
    if (result.status === 'too-early') throw new Error('Planet deadline has not elapsed');
  };
}
export function createPlanetRepairHandler(service: Pick<PlanetService, 'repairDeadlines'>, enqueue: PlanetEnqueue) {
  return async (): Promise<void> => {
    let result: Awaited<ReturnType<PlanetService['repairDeadlines']>>;
    try { result = await service.repairDeadlines(enqueue); } catch { throw new Error('Planet deadline repair unavailable'); }
    if (result === null || typeof result !== 'object'
      || !['dispatched', 'advanced', 'failed'].every(key => Number.isSafeInteger((result as Record<string, number>)[key]) && (result as Record<string, number>)[key]! >= 0)
      || result.failed !== 0) throw new Error('Planet deadline repair unavailable');
  };
}
export interface PlanetRuntimeContext {app: App; service: PlanetService; configuration: PlanetRuntimeConfiguration}
/** All private payloads originate from the server-only outbox. Never register a public timer route. */
export function createPlanetEntrypoints(resolveContext: () => PlanetRuntimeContext) {
  const api = onRequest({region: 'us-central1', timeoutSeconds: 60, cors: false, maxInstances: 12, minInstances: 0}, async (request, response) => {
    const {app, service, configuration} = resolveContext();
    await createPlanetHttpHandler({service, configuration,
      verifyIdToken: token => getAuth(app).verifyIdToken(token, true), verifyAppCheckToken: token => getAppCheck(app).verifyToken(token),
    })(request, response);
  });
  const enqueue: PlanetEnqueue = async job => {
    const {app, configuration} = resolveContext();
    if (configuration.emulator && configuration.tasksEmulatorHost === undefined) throw new Error('The local Cloud Tasks emulator is required for Planet enqueue');
    await createPlanetEnqueuer(getFunctions(app).taskQueue<PlanetDeadlinePayload>('locations/us-central1/functions/planetDeadlineTask'))(job);
  };
  const deadlineTask = onTaskDispatched({region: 'us-central1', invoker: 'private', timeoutSeconds: 60, maxInstances: 12, minInstances: 0,
    retryConfig: {maxAttempts: 10, minBackoffSeconds: 1, maxBackoffSeconds: 60}, rateLimits: {maxConcurrentDispatches: 10}},
    request => createPlanetDeadlineHandler(resolveContext().service)(request.data));
  const dispatchDeadline = onDocumentCreated({document: 'planetDocuments/{documentId}', region: 'us-central1', retry: true, timeoutSeconds: 60, maxInstances: 12, minInstances: 0}, async event => {
    const value = event.data;
    if (value === undefined || value.get('namespace') !== 'deadline') return;
    const path: unknown = value.get('key');
    if (typeof path !== 'string' || !/^deadline\/[a-f0-9]{64}$/.test(path)) throw new Error('Invalid private Planet deadline reference');
    try { await resolveContext().service.dispatchDeadline(path.slice(9), enqueue); } catch { throw new Error('Planet deadline dispatch unavailable'); }
  });
  const runBots = onDocumentWritten({document: 'planetDocuments/{documentId}', region: 'us-central1', retry: true, timeoutSeconds: 60, maxInstances: 12, minInstances: 0}, async event => {
    const after = event.data?.after;
    if (after?.exists !== true || after.get('namespace') !== 'session') return;
    const path: unknown = after.get('key');
    if (typeof path !== 'string' || !path.startsWith('session/') || !IdentifierSchema.safeParse(path.slice(8)).success) throw new Error('Invalid private Planet session reference');
    try { await resolveContext().service.runBots(path.slice(8)); } catch { throw new Error('Planet bot evaluation unavailable'); }
  });
  const repairDeadlines = onSchedule({schedule: 'every 1 minutes', region: 'us-central1', timeoutSeconds: 60, maxInstances: 1, minInstances: 0},
    () => createPlanetRepairHandler(resolveContext().service, enqueue)());
  return {api, deadlineTask, dispatchDeadline, repairDeadlines, runBots};
}

import { Buffer } from 'node:buffer';
import { IdentifierSchema, PROTOCOL_VERSION } from '@mothership/contracts';

export interface HttpRequest {
  method: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Uint8Array;
}

export interface HttpResponse {
  set(field: string, value: string): unknown;
  status(code: number): HttpResponse;
  json(body: unknown): unknown;
}

export interface HttpGameService {
  submit(uid: string, payload: unknown): Promise<unknown>;
  lookup(uid: string, payload: unknown): Promise<unknown>;
  advance(uid: string, payload: unknown): Promise<unknown>;
  serverTime(uid: string, matchId: string): Promise<unknown>;
}

export interface HttpEnvironment {
  functionsEmulator?: string;
  projectId: string;
  authEmulatorHost?: string;
  firestoreEmulatorHost?: string;
}

export interface HttpDependencies {
  service: HttpGameService;
  verifyIdToken(token: string): Promise<{ uid: string }>;
  verifyAppCheckToken(token: string): Promise<unknown>;
  environment: HttpEnvironment;
  clock?: () => number;
}

export type HttpOperation = 'command' | 'receipt' | 'advance' | 'serverTime';

const BODY_LIMIT_BYTES = 2_048;
const AUTH_HEADER_LIMIT = 8_192;
const loopbackHost = /^(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/;

function isLoopbackHost(value: string | undefined): boolean {
  const match = value?.match(loopbackHost);
  return match !== undefined && match !== null && Number(match[1]) > 0 && Number(match[1]) <= 65_535;
}

// No configurable production bypass. Every condition must identify the local demo suite.
export function mayBypassAppCheck(environment: HttpEnvironment): boolean {
  return environment.functionsEmulator === 'true'
    && /^demo-[a-z0-9-]+$/.test(environment.projectId)
    && isLoopbackHost(environment.authEmulatorHost)
    && isLoopbackHost(environment.firestoreEmulatorHost);
}

function singleHeader(request: HttpRequest, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === 'string' ? value : undefined;
}

function requestLength(request: HttpRequest): number {
  if (request.rawBody !== undefined) return request.rawBody.byteLength;
  try {
    return Buffer.byteLength(JSON.stringify(request.body) ?? '', 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

type FailureCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_REQUEST' | 'UNSUPPORTED_PROTOCOL' | 'UNAVAILABLE';

export function createHttpHandler(operation: HttpOperation, dependencies: HttpDependencies) {
  const clock = dependencies.clock ?? Date.now;
  return async (request: HttpRequest, response: HttpResponse): Promise<void> => {
    response.set('Cache-Control', 'no-store, private');
    response.set('Pragma', 'no-cache');
    response.set('X-Content-Type-Options', 'nosniff');
    const fail = (status: number, code: FailureCode): void => {
      response.status(status).json({ ok: false, serverTimeMs: clock(), error: { code } });
    };

    if (request.method !== 'POST') {
      response.set('Allow', 'POST');
      fail(405, 'INVALID_REQUEST');
      return;
    }
    if (!/^application\/json(?:\s*;.*)?$/i.test(singleHeader(request, 'content-type') ?? '')) {
      fail(415, 'INVALID_REQUEST');
      return;
    }
    if (requestLength(request) > BODY_LIMIT_BYTES) {
      fail(413, 'INVALID_REQUEST');
      return;
    }

    const authorization = singleHeader(request, 'authorization');
    const bearer = authorization !== undefined && authorization.length <= AUTH_HEADER_LIMIT
      ? authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/) : null;
    if (bearer === null || bearer[1] === undefined) {
      fail(401, 'UNAUTHENTICATED');
      return;
    }
    let uid: string;
    try {
      uid = (await dependencies.verifyIdToken(bearer[1])).uid;
      if (uid.length === 0) throw new Error('Missing verified subject');
    } catch {
      fail(401, 'UNAUTHENTICATED');
      return;
    }

    if (!mayBypassAppCheck(dependencies.environment)) {
      const appCheckToken = singleHeader(request, 'x-firebase-appcheck');
      if (appCheckToken === undefined || appCheckToken.length === 0 || appCheckToken.length > AUTH_HEADER_LIMIT) {
        fail(403, 'FORBIDDEN');
        return;
      }
      try {
        await dependencies.verifyAppCheckToken(appCheckToken);
      } catch {
        fail(403, 'FORBIDDEN');
        return;
      }
    }

    try {
      let result: unknown;
      if (operation === 'serverTime') {
        // This endpoint accepts only the same version/match envelope, never client time or identity.
        const body = request.body;
        if (body !== null && typeof body === 'object' && !Array.isArray(body)
          && 'protocolVersion' in body && typeof body.protocolVersion === 'number'
          && body.protocolVersion !== PROTOCOL_VERSION) {
          fail(400, 'UNSUPPORTED_PROTOCOL');
          return;
        }
        if (body === null || typeof body !== 'object' || Array.isArray(body)
          || Object.keys(body).length !== 2
          || !('protocolVersion' in body) || body.protocolVersion !== PROTOCOL_VERSION
          || !('matchId' in body) || !IdentifierSchema.safeParse(body.matchId).success) {
          fail(400, 'INVALID_REQUEST');
          return;
        }
        result = await dependencies.service.serverTime(uid, body.matchId as string);
      } else if (operation === 'command') {
        result = await dependencies.service.submit(uid, request.body);
      } else if (operation === 'receipt') {
        result = await dependencies.service.lookup(uid, request.body);
      } else {
        result = await dependencies.service.advance(uid, request.body);
      }
      // Safe API failures have their contract's body; registered/rejected game receipts remain HTTP 200.
      const code = result !== null && typeof result === 'object' && 'ok' in result && result.ok === false
        && 'error' in result && result.error !== null && typeof result.error === 'object' && 'code' in result.error
        ? result.error.code : undefined;
      const status = code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403
        : code === 'UNAVAILABLE' ? 503 : code === 'COMMAND_ID_CONFLICT' ? 409
        : code === 'INVALID_REQUEST' || code === 'UNSUPPORTED_PROTOCOL' ? 400 : 200;
      response.status(status).json(result);
    } catch {
      // Never serialize exceptions, headers, token values or private state.
      fail(503, 'UNAVAILABLE');
    }
  };
}

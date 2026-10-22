import {
  AdvanceIfExpiredRequestSchema, AdvanceIfExpiredResponseSchema, ApiFailureSchema, CommandResponseSchema,
  ReceiptLookupRequestSchema, ReceiptLookupResponseSchema, RegisterShotSchema, ServerTimeResponseSchema,
} from '@mothership/contracts';
import type { AdvanceIfExpiredRequest, ApiFailure, Receipt, ReceiptLookupRequest, RegisterShot } from '@mothership/contracts';
import type { ClockSample } from '../clock/server-clock.js';
import type { ClientPorts } from '../ports.js';
import type { PlayerTransport, PublicTransport } from './transport.js';

export type ApiErrorCode = ApiFailure['error']['code'];

/** Every answer from the server carries its time, usable to calibrate the countdown. */
interface Answered {
  readonly sample: ClockSample;
}
/** The server answered with a safe error. Whether anything was committed depends on the code. */
export interface ApiCallFailure extends Answered {
  readonly kind: 'api-failure';
  readonly code: ApiErrorCode;
}
/**
 * No usable answer arrived. For a command this means its outcome is unknown, not that it
 * failed: the caller must look the receipt up or retry the identical command.
 */
export interface NoResponse {
  readonly kind: 'no-response';
  readonly reason: 'transport-error' | 'timeout' | 'unreadable-response' | 'cancelled';
}

export type ServerTimeResult = ({ readonly kind: 'time' } & Answered) | ApiCallFailure | NoResponse;
export type AdvanceResult = ({ readonly kind: 'advanced' | 'unchanged' } & Answered) | ApiCallFailure | NoResponse;
export type SubmitResult = ({ readonly kind: 'receipt'; readonly receipt: Receipt } & Answered) | ApiCallFailure | NoResponse;
export type LookupResult =
  | ({ readonly kind: 'found'; readonly receipt: Receipt } & Answered)
  | ({ readonly kind: 'unknown' } & Answered)
  | ApiCallFailure
  | NoResponse;

export interface PublicApiClient {
  serverTime(): Promise<ServerTimeResult>;
  advanceIfExpired(request: AdvanceIfExpiredRequest): Promise<AdvanceResult>;
  /** Settles every pending call as cancelled and releases its timer. */
  cancelPending(): void;
}
export interface PlayerApiClient extends PublicApiClient {
  submit(command: RegisterShot): Promise<SubmitResult>;
  lookupReceipt(request: ReceiptLookupRequest): Promise<LookupResult>;
}

export const DEFAULT_API_TIMEOUT_MS = 8_000;

export type Settled =
  | { readonly kind: 'response'; readonly payload: unknown; readonly requestedAt: number; readonly receivedAt: number }
  | NoResponse;

const unreadable: NoResponse = { kind: 'no-response', reason: 'unreadable-response' };

/** Runs calls under one timeout policy. Shared by the clients of both wire protocols. */
export function createCaller(ports: ClientPorts, timeoutMs: number) {
  const pending = new Set<(result: Settled) => void>();
  function call(invoke: () => Promise<unknown>): Promise<Settled> {
    return new Promise(resolve => {
      const requestedAt = ports.clock.now();
      const finish = (result: Settled): void => {
        if (!pending.delete(finish)) return;
        ports.scheduler.clearTimeout(timer);
        resolve(result);
      };
      pending.add(finish);
      // A late answer after this point is ignored; the caller already treats the outcome as unknown.
      const timer = ports.scheduler.setTimeout(() => finish({ kind: 'no-response', reason: 'timeout' }), timeoutMs);
      let response: Promise<unknown>;
      try {
        // A transport that answers with a plain value, or with nothing, is still answered here:
        // the value simply fails validation instead of breaking the call.
        response = Promise.resolve(invoke());
      } catch {
        finish({ kind: 'no-response', reason: 'transport-error' });
        return;
      }
      response.then(
        payload => finish({ kind: 'response', payload, requestedAt, receivedAt: ports.clock.now() }),
        () => finish({ kind: 'no-response', reason: 'transport-error' }),
      );
    });
  }
  function cancelPending(): void {
    for (const finish of [...pending]) finish({ kind: 'no-response', reason: 'cancelled' });
  }
  return { call, cancelPending };
}

type Response = Extract<Settled, { kind: 'response' }>;

function sampleOf(response: Response, serverTimeMs: number): ClockSample {
  return { requestedAt: response.requestedAt, receivedAt: response.receivedAt, serverTimeMs };
}

function failureOf(response: Response): ApiCallFailure | NoResponse {
  const failure = ApiFailureSchema.safeParse(response.payload);
  if (!failure.success) return unreadable;
  return { kind: 'api-failure', code: failure.data.error.code, sample: sampleOf(response, failure.data.serverTimeMs) };
}

// Requests are built by this client, so an invalid one is a defect here, not bad input.
function assertRequest(valid: boolean, name: string): void {
  if (!valid) throw new TypeError(`Refusing to send a ${name} that does not satisfy the shared contract`);
}

function publicEndpoints(transport: PublicTransport | PlayerTransport, ports: ClientPorts, timeoutMs: number) {
  const { call, cancelPending } = createCaller(ports, timeoutMs);
  const client: PublicApiClient = {
    async serverTime() {
      const response = await call(() => transport.serverTime());
      if (response.kind !== 'response') return response;
      const time = ServerTimeResponseSchema.safeParse(response.payload);
      return time.success ? { kind: 'time', sample: sampleOf(response, time.data.serverTimeMs) } : failureOf(response);
    },
    async advanceIfExpired(request) {
      assertRequest(AdvanceIfExpiredRequestSchema.safeParse(request).success, 'phase catch-up request');
      const response = await call(() => transport.advanceIfExpired(request));
      if (response.kind !== 'response') return response;
      const advance = AdvanceIfExpiredResponseSchema.safeParse(response.payload);
      if (!advance.success) return failureOf(response);
      // An answer about some other match or phase says nothing about this request.
      if (advance.data.matchId !== request.matchId || advance.data.phaseId !== request.phaseId) return unreadable;
      return { kind: advance.data.result, sample: sampleOf(response, advance.data.serverTimeMs) };
    },
    cancelPending,
  };
  return { client, call };
}

export function createPublicApiClient(transport: PublicTransport | PlayerTransport, ports: ClientPorts, timeoutMs = DEFAULT_API_TIMEOUT_MS): PublicApiClient {
  return publicEndpoints(transport, ports, timeoutMs).client;
}

export function createPlayerApiClient(transport: PlayerTransport, ports: ClientPorts, timeoutMs = DEFAULT_API_TIMEOUT_MS): PlayerApiClient {
  const { client, call } = publicEndpoints(transport, ports, timeoutMs);
  return {
    ...client,
    async submit(command) {
      assertRequest(RegisterShotSchema.safeParse(command).success, 'command');
      const response = await call(() => transport.submitCommand(command));
      if (response.kind !== 'response') return response;
      const parsed = CommandResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      if (!parsed.data.ok) return { kind: 'api-failure', code: parsed.data.error.code, sample: sampleOf(response, parsed.data.serverTimeMs) };
      const { receipt } = parsed.data;
      // A receipt is only evidence for the command it names. Anything else is not trusted.
      if (receipt.matchId !== command.matchId || receipt.phaseId !== command.phaseId || receipt.commandId !== command.commandId) return unreadable;
      return { kind: 'receipt', receipt, sample: sampleOf(response, parsed.data.serverTimeMs) };
    },
    async lookupReceipt(request) {
      assertRequest(ReceiptLookupRequestSchema.safeParse(request).success, 'receipt lookup');
      const response = await call(() => transport.lookupReceipt(request));
      if (response.kind !== 'response') return response;
      const lookup = ReceiptLookupResponseSchema.safeParse(response.payload);
      if (!lookup.success) return failureOf(response);
      const sample = sampleOf(response, lookup.data.serverTimeMs);
      if (lookup.data.status === 'unknown') return { kind: 'unknown', sample };
      const { receipt } = lookup.data;
      if (receipt.matchId !== request.matchId || receipt.commandId !== request.commandId) return unreadable;
      return { kind: 'found', receipt, sample };
    },
  };
}

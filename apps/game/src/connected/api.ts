import {
  FullAbortMatchRequestSchema, FullAdmissionRequestSchema, FullAdmitDisplayRequestSchema, FullAdvanceRequestSchema, FullAdvanceResponseSchema, FullApproveAdmissionRequestSchema,
  FullCommandRequestSchema, FullCommandResponseSchema, FullCreateMatchRequestSchema, FullIssueSeatRecoveryRequestSchema, FullLookupRequestSchema,
  FullLookupResponseSchema, FullOperationResponseSchema, FullRedeemSeatRecoveryRequestSchema, FullServerTimeRequestSchema, FullServerTimeResponseSchema,
  FullStartMatchRequestSchema, FullSetLobbyIdentityRequestSchema, FullSetLobbyIdentityResponseSchema,
  FullSetPracticeBotsRequestSchema, FullSetPracticeBotsResponseSchema,
  FullBeginSetupRequestSchema, FullBeginSetupResponseSchema, FullConfirmSetupChoiceRequestSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchRequestSchema, FullReadyForMatchResponseSchema,
} from '@mothership/contracts';
import type {
  FullAbortMatchRequest, FullAdmissionRequest, FullAdmitDisplayRequest, FullApproveAdmissionRequest, FullCommandRequest, FullCreateMatchRequest, FullFailure,
  FullIssueSeatRecoveryRequest, FullLookupRequest, FullOperationResponse, FullReceipt, FullRedeemSeatRecoveryRequest, FullStartMatchRequest, SeatId, FullSetLobbyIdentityRequest, FullSetLobbyIdentityResponse,
  FullSetPracticeBotsRequest, FullSetPracticeBotsResponse,
  FullBeginSetupRequest, FullBeginSetupResponse, FullConfirmSetupChoiceRequest, FullConfirmSetupChoiceResponse, FullReadyForMatchRequest, FullReadyForMatchResponse, FullSetupErrorCode,
} from '@mothership/contracts';
import type { ClockSample } from '../clock/server-clock.js';
import type { ClientPorts } from '../ports.js';
import { createCaller, DEFAULT_API_TIMEOUT_MS } from '../transport/api-client.js';
import type { NoResponse, Settled } from '../transport/api-client.js';
import type { ConnectedTransport, V1Operation } from './transport.js';

// The one place an answer from a protocol-2 operation enters client state. Every body is
// parsed with the shared strict schema before anything is concluded from it, whatever the
// HTTP status was, and an answer is believed only about the request it names.

export type SetupFailureCode = FullSetupErrorCode;
export type ConnectedFailureCode = FullFailure['error']['code'];
export type LobbyIdentityFailureCode = Extract<FullSetLobbyIdentityResponse, { ok: false }>['error']['code'];
export type PracticeBotsFailureCode = Extract<FullSetPracticeBotsResponse, { ok: false }>['error']['code'];

/** Every answer from the server carries its time, usable to calibrate the countdown. */
interface Answered {
  readonly sample: ClockSample;
}

/**
 * The server answered with a safe failure. It settles only the invocation it answered: an
 * earlier unanswered attempt at the same thing is still unaccounted for.
 */
export interface ConnectedFailure extends Answered {
  readonly kind: 'api-failure';
  readonly code: ConnectedFailureCode;
  /** The least time to wait before sending the same request again, when the server named one. A minimum, never a promise. */
  readonly retryAfterMs: number | null;
}

export type ConnectedTimeResult = ({ readonly kind: 'time' } & Answered) | ConnectedFailure | NoResponse;
export type ConnectedAdvanceResult = ({ readonly kind: 'advanced' | 'unchanged' } & Answered) | ConnectedFailure | NoResponse;
/** A readable receipt is the server's final decision on the command, accepted or rejected. */
export type ConnectedCommandResult = ({ readonly kind: 'receipt'; readonly receipt: FullReceipt } & Answered) | ConnectedFailure | NoResponse;
export type ConnectedLookupResult =
  | ({ readonly kind: 'found'; readonly receipt: FullReceipt } & Answered)
  /** No receipt was committed when the server looked. An attempt still on its way can commit later. */
  | ({ readonly kind: 'unknown' } & Answered)
  | ConnectedFailure
  | NoResponse;
export type OperationResult<Result, Code extends string = ConnectedFailureCode> = ({ readonly kind: 'done'; readonly result: Result } & Answered) | (Omit<ConnectedFailure, 'code'> & { readonly code: Code }) | NoResponse;

export interface CreatedMatch { readonly matchId: string; readonly roomCode: string; readonly playerCount: 7 | 8 | 9 }
export interface RequestedAdmission { readonly matchId: string; readonly admissionId: string }
export interface ApprovedAdmission { readonly admissionId: string; readonly seatId: SeatId }
/**
 * A one-time code that moves a seat to another device. recoveryToken is null when the
 * answer is the replay of an earlier one: the service gives a code out once. expiresAt is
 * the server's time, in milliseconds.
 */
export interface IssuedRecovery { readonly seatId: SeatId; readonly recoveryToken: string | null; readonly expiresAt: number }
export interface RecoveredSeat { readonly seatId: SeatId }

export interface ConnectedApi {
  beginSetup(request: FullBeginSetupRequest): Promise<OperationResult<Extract<FullBeginSetupResponse, { ok: true }>, SetupFailureCode>>;
  confirmSetupChoice(request: FullConfirmSetupChoiceRequest): Promise<OperationResult<Extract<FullConfirmSetupChoiceResponse, { ok: true }>, SetupFailureCode>>;
  readyForMatch(request: FullReadyForMatchRequest): Promise<OperationResult<Extract<FullReadyForMatchResponse, { ok: true }>, SetupFailureCode>>;
  setPracticeBots(request: FullSetPracticeBotsRequest): Promise<OperationResult<{ readonly revision: number; readonly botSeatIds: readonly SeatId[] }, PracticeBotsFailureCode>>;
  setLobbyIdentity(request: FullSetLobbyIdentityRequest): Promise<OperationResult<{ readonly revision: number }, LobbyIdentityFailureCode>>;
  serverTime(matchId: string): Promise<ConnectedTimeResult>;
  advance(matchId: string, phaseId: string): Promise<ConnectedAdvanceResult>;
  command(request: FullCommandRequest): Promise<ConnectedCommandResult>;
  receipt(request: FullLookupRequest): Promise<ConnectedLookupResult>;
  createMatch(request: FullCreateMatchRequest): Promise<OperationResult<CreatedMatch>>;
  requestAdmission(request: FullAdmissionRequest): Promise<OperationResult<RequestedAdmission>>;
  approveAdmission(request: FullApproveAdmissionRequest): Promise<OperationResult<ApprovedAdmission>>;
  admitDisplay(request: FullAdmitDisplayRequest): Promise<OperationResult<true>>;
  startMatch(request: FullStartMatchRequest): Promise<OperationResult<true>>;
  /** The host ends the match for everyone. It is recorded as ended by the host, without a winner. */
  abortMatch(request: FullAbortMatchRequest): Promise<OperationResult<true>>;
  /** The host asks for a one-time code that moves an occupied seat to another device. */
  issueSeatRecovery(request: FullIssueSeatRecoveryRequest): Promise<OperationResult<IssuedRecovery>>;
  /** This device takes over the seat a one-time code was issued for. The device that held it loses access. */
  redeemSeatRecovery(request: FullRedeemSeatRecoveryRequest): Promise<OperationResult<RecoveredSeat>>;
  /** Settles every pending call as cancelled and releases its timer. */
  cancelPending(): void;
}

type Response = Extract<Settled, { kind: 'response' }>;
type OperationOutcome = Extract<FullOperationResponse, { ok: true }>['result'];

const unreadable: NoResponse = { kind: 'no-response', reason: 'unreadable-response' };

function sampleOf(response: Response, serverTimeMs: number): ClockSample {
  return { requestedAt: response.requestedAt, receivedAt: response.receivedAt, serverTimeMs };
}

function failure(response: Response, body: FullFailure): ConnectedFailure {
  return { kind: 'api-failure', code: body.error.code, retryAfterMs: body.error.retryAfterMs ?? null, sample: sampleOf(response, body.serverTimeMs) };
}

// Requests are built by this client, so an invalid one is a defect here, not bad input.
function assertRequest(valid: boolean, name: string): void {
  if (!valid) throw new TypeError(`Refusing to send a ${name} that does not satisfy the shared contract`);
}

export function createConnectedApi(transport: Pick<ConnectedTransport, 'post'>, ports: ClientPorts, timeoutMs = DEFAULT_API_TIMEOUT_MS): ConnectedApi {
  const { call, cancelPending } = createCaller(ports, timeoutMs);

  // A lifecycle operation: one request, and the one result shape that operation can have.
  async function operate<Result>(operation: V1Operation, request: unknown, pick: (result: OperationOutcome) => Result | null): Promise<OperationResult<Result>> {
    const response = await call(() => transport.post(operation, request));
    if (response.kind !== 'response') return response;
    const parsed = FullOperationResponseSchema.safeParse(response.payload);
    if (!parsed.success) return unreadable;
    if (!parsed.data.ok) return failure(response, parsed.data);
    const result = pick(parsed.data.result);
    // A well-formed success that belongs to some other operation or request says nothing about this one.
    return result === null ? unreadable : { kind: 'done', result, sample: sampleOf(response, parsed.data.serverTimeMs) };
  }

  return {
    async beginSetup(request) {
      const outgoing = FullBeginSetupRequestSchema.safeParse(request);
      if (!outgoing.success) throw new TypeError('Refusing to send a setup request that does not satisfy the shared contract');
      const pinned = outgoing.data;
      const response = await call(() => transport.post('v1BeginSetup', pinned));
      if (response.kind !== 'response') return response;
      const parsed = FullBeginSetupResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      if (!parsed.data.ok) return { kind: 'api-failure', code: parsed.data.error.code, retryAfterMs: parsed.data.error.retryAfterMs ?? null, sample };
      if (parsed.data.matchId !== pinned.matchId || parsed.data.requestId !== pinned.requestId) return unreadable;
      return { kind: 'done', result: parsed.data, sample };
    },
    async confirmSetupChoice(request) {
      const outgoing = FullConfirmSetupChoiceRequestSchema.safeParse(request);
      if (!outgoing.success) throw new TypeError('Refusing to send a setup request that does not satisfy the shared contract');
      const pinned = outgoing.data;
      const response = await call(() => transport.post('v1ConfirmSetupChoice', pinned));
      if (response.kind !== 'response') return response;
      const parsed = FullConfirmSetupChoiceResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      if (!parsed.data.ok) return { kind: 'api-failure', code: parsed.data.error.code, retryAfterMs: parsed.data.error.retryAfterMs ?? null, sample };
      if (parsed.data.matchId !== pinned.matchId || parsed.data.requestId !== pinned.requestId
        || parsed.data.bindingRevision !== pinned.bindingRevision) return unreadable;
      return { kind: 'done', result: parsed.data, sample };
    },
    async readyForMatch(request) {
      const outgoing = FullReadyForMatchRequestSchema.safeParse(request);
      if (!outgoing.success) throw new TypeError('Refusing to send a setup request that does not satisfy the shared contract');
      const pinned = outgoing.data;
      const response = await call(() => transport.post('v1ReadyForMatch', pinned));
      if (response.kind !== 'response') return response;
      const parsed = FullReadyForMatchResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      if (!parsed.data.ok) return { kind: 'api-failure', code: parsed.data.error.code, retryAfterMs: parsed.data.error.retryAfterMs ?? null, sample };
      if (parsed.data.matchId !== pinned.matchId || parsed.data.requestId !== pinned.requestId
        || parsed.data.bindingRevision !== pinned.bindingRevision || parsed.data.dealId !== pinned.dealId) return unreadable;
      return { kind: 'done', result: parsed.data, sample };
    },
    async setPracticeBots(request) {
      const outgoing = FullSetPracticeBotsRequestSchema.safeParse(request);
      if (!outgoing.success) throw new TypeError('Refusing to send a practice bot setup that does not satisfy the shared contract');
      // Keep the validated snapshot independent of a caller-owned mutable object.
      const pinned = outgoing.data;
      const response = await call(() => transport.post('v1SetPracticeBots', pinned));
      if (response.kind !== 'response') return response;
      const parsed = FullSetPracticeBotsResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      if (!parsed.data.ok) return { kind: 'api-failure', code: parsed.data.error.code, retryAfterMs: parsed.data.error.retryAfterMs ?? null, sample };
      if (parsed.data.matchId !== pinned.matchId || parsed.data.requestId !== pinned.requestId
        || parsed.data.botSeatIds.length !== pinned.botCount) return unreadable;
      return { kind: 'done', result: { revision: parsed.data.revision, botSeatIds: parsed.data.botSeatIds }, sample };
    },
    async setLobbyIdentity(request) {
      assertRequest(FullSetLobbyIdentityRequestSchema.safeParse(request).success, 'lobby identity');
      const response = await call(() => transport.post('v1SetLobbyIdentity', request));
      if (response.kind !== 'response') return response;
      const parsed = FullSetLobbyIdentityResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      return parsed.data.ok ? { kind: 'done', result: { revision: parsed.data.revision }, sample }
        : { kind: 'api-failure', code: parsed.data.error.code, retryAfterMs: parsed.data.error.retryAfterMs ?? null, sample };
    },
    async serverTime(matchId) {
      const request = { protocolVersion: 2 as const, matchId };
      assertRequest(FullServerTimeRequestSchema.safeParse(request).success, 'server-time request');
      const response = await call(() => transport.post('v1ServerTime', request));
      if (response.kind !== 'response') return response;
      const parsed = FullServerTimeResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      return 'ok' in parsed.data ? failure(response, parsed.data) : { kind: 'time', sample: sampleOf(response, parsed.data.serverTimeMs) };
    },
    async advance(matchId, phaseId) {
      const request = { protocolVersion: 2 as const, matchId, phaseId };
      assertRequest(FullAdvanceRequestSchema.safeParse(request).success, 'phase catch-up request');
      const response = await call(() => transport.post('v1Advance', request));
      if (response.kind !== 'response') return response;
      const parsed = FullAdvanceResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      if ('ok' in parsed.data) return failure(response, parsed.data);
      // An answer about some other match or phase says nothing about this request.
      if (parsed.data.matchId !== matchId || parsed.data.phaseId !== phaseId) return unreadable;
      return { kind: parsed.data.result, sample: sampleOf(response, parsed.data.serverTimeMs) };
    },
    async command(request) {
      assertRequest(FullCommandRequestSchema.safeParse(request).success, 'command');
      const response = await call(() => transport.post('v1Command', request));
      if (response.kind !== 'response') return response;
      const parsed = FullCommandResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      if (!parsed.data.ok) return failure(response, parsed.data);
      const { receipt } = parsed.data;
      // A receipt is only evidence for the command it names. Anything else is not trusted.
      if (receipt.matchId !== request.matchId || receipt.phaseId !== request.phaseId || receipt.commandId !== request.commandId) return unreadable;
      return { kind: 'receipt', receipt, sample: sampleOf(response, parsed.data.serverTimeMs) };
    },
    async receipt(request) {
      assertRequest(FullLookupRequestSchema.safeParse(request).success, 'receipt lookup');
      const response = await call(() => transport.post('v1Receipt', request));
      if (response.kind !== 'response') return response;
      const parsed = FullLookupResponseSchema.safeParse(response.payload);
      if (!parsed.success) return unreadable;
      if ('ok' in parsed.data) return failure(response, parsed.data);
      const sample = sampleOf(response, parsed.data.serverTimeMs);
      if (parsed.data.status === 'unknown') return { kind: 'unknown', sample };
      const { receipt } = parsed.data;
      if (receipt.matchId !== request.matchId || receipt.commandId !== request.commandId) return unreadable;
      return { kind: 'found', receipt, sample };
    },
    async createMatch(request) {
      assertRequest(FullCreateMatchRequestSchema.safeParse(request).success, 'match creation');
      return operate('v1CreateMatch', request, result => ('roomCode' in result && result.playerCount === request.playerCount
        ? { matchId: result.matchId, roomCode: result.roomCode, playerCount: result.playerCount } : null));
    },
    async requestAdmission(request) {
      assertRequest(FullAdmissionRequestSchema.safeParse(request).success, 'admission request');
      return operate('v1RequestAdmission', request, result => ('status' in result && result.status === 'pending' ? { matchId: result.matchId, admissionId: result.admissionId } : null));
    },
    async approveAdmission(request) {
      assertRequest(FullApproveAdmissionRequestSchema.safeParse(request).success, 'admission approval');
      return operate('v1ApproveAdmission', request, result => ('status' in result && result.status === 'approved' && result.admissionId === request.admissionId && result.seatId === request.seatId
        ? { admissionId: result.admissionId, seatId: result.seatId } : null));
    },
    async admitDisplay(request) {
      assertRequest(FullAdmitDisplayRequestSchema.safeParse(request).success, 'display admission');
      return operate('v1AdmitDisplay', request, result => ('admitted' in result ? true : null));
    },
    async startMatch(request) {
      assertRequest(FullStartMatchRequestSchema.safeParse(request).success, 'match start');
      return operate('v1StartMatch', request, result => ('started' in result && result.matchId === request.matchId ? true : null));
    },
    async abortMatch(request) {
      assertRequest(FullAbortMatchRequestSchema.safeParse(request).success, 'match abort');
      return operate('v1AbortMatch', request, result => ('aborted' in result ? true : null));
    },
    async issueSeatRecovery(request) {
      assertRequest(FullIssueSeatRecoveryRequestSchema.safeParse(request).success, 'seat recovery request');
      // A code for some other seat says nothing about the one that was asked for.
      return operate('v1IssueSeatRecovery', request, result => ('issued' in result && result.seatId === request.seatId
        ? { seatId: result.seatId, recoveryToken: result.recoveryToken, expiresAt: result.expiresAt } : null));
    },
    async redeemSeatRecovery(request) {
      assertRequest(FullRedeemSeatRecoveryRequestSchema.safeParse(request).success, 'seat recovery');
      return operate('v1RedeemSeatRecovery', request, result => ('recovered' in result ? { seatId: result.seatId } : null));
    },
    cancelPending,
  };
}

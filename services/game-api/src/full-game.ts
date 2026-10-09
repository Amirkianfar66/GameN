import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import type { DocumentReference, DocumentSnapshot, Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import {
  FullBeginSetupRequestSchema, FullConfirmSetupChoiceRequestSchema, FullReadyForMatchRequestSchema,
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
  FullSetupDocumentSchema, FullSetupPlayerViewSchema, FullVersionsSchema, SETUP_LIFECYCLE_VERSION,
  FullCommandRequestSchema, FullReceiptSchema, FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema, IdentifierSchema, SeatIdSchema,
  FullCreateMatchRequestSchema, FullAdmissionRequestSchema, FullApproveAdmissionRequestSchema, FullAdmitDisplayRequestSchema,
  FullStartMatchRequestSchema, FullAbortMatchRequestSchema, FullIssueSeatRecoveryRequestSchema, FullRedeemSeatRecoveryRequestSchema,
  FullLookupRequestSchema, FullAdvanceRequestSchema, FullServerTimeRequestSchema, FullOperationResponseSchema, FullLobbyViewSchema,
  CrewCharacterIdSchema, FullPracticeBotsDocumentSchema, FullSetPracticeBotsRequestSchema, FullSetPracticeBotsResponseSchema, PRACTICE_BOT_POLICY_VERSION,
  FullAssetManifestVersionSchema, FullLobbyIdentityDocumentSchema, FullSetLobbyIdentityRequestSchema, FullSetLobbyIdentityResponseSchema, OwnAcknowledgmentsSchema, SeatSessionSchema,
} from '@mothership/contracts';
import type { FullSetupDocument, FullSetupPlayerView, FullSetupErrorCode, FullBeginSetupResponse, FullConfirmSetupChoiceResponse, FullReadyForMatchResponse, FullCommandRequest, FullFailure, FullPlayerView, FullReceipt, FullOperationResponse, SeatId, FullLobbyIdentityDocument, FullSetLobbyIdentityResponse, FullSetPracticeBotsResponse, FullPracticeBotsDocument } from '@mothership/contracts';
import { createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame, projectOwnAcknowledgments, buildRoster, FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS, isSupportedFullGameVersions } from '@mothership/engine';

import { choosePracticeBotActions } from './practice-bot-policy.js';
import type { FullGameSetup, FullGameState, FullGameplayVersions } from '@mothership/engine';

type FailureCode = FullFailure['error']['code'];
type Success = Extract<FullOperationResponse, { ok: true }>;
type OperationResult = FullOperationResponse;
type Body = Record<string, unknown>;
type EnvelopeSchema = { safeParse(value: unknown): { success: true; data: Body } | { success: false } };
type Role = FullPlayerView['self']['role'];
type FullVersions = FullPlayerView['versions'];
type Room = 'Room A' | 'Room B';
type Control = { protocolVersion: 2; hostUid: string; playerCount: 7 | 8 | 9; status: 'lobby' | 'choosing' | 'awaiting-ready' | 'running' | 'complete' | 'aborted'; lifecycleVersion?: string; gameStarted?: boolean; roomCode: string; createdAt: number };
type SeatBinding = { uid: string; bindingRevision: number; initialRoom: Room; controller?: 'human' };
const humanBinding = (value: unknown): value is SeatBinding => value !== null && typeof value === 'object'
  && (!('controller' in value) || value.controller === 'human') && 'uid' in value && uidSafe(value.uid);
const botBinding = (entry: QueryDocumentSnapshot): boolean => entry.get('controller') === 'bot' && !Object.hasOwn(entry.data(), 'uid')
  && Number.isSafeInteger(entry.get('bindingRevision')) && entry.get('bindingRevision') >= 1;
type ActivePlayer = { seatId: SeatId; binding: SeatBinding };
type Shuffler = <T>(items: readonly T[]) => T[];
type RoomRandomizer = () => Room;
export interface V1DeadlineIntent {
  protocolVersion: 2; matchId: string; phaseId: string; deadlineToken: string;
  endsAt: number; taskId: string; status: 'pending';
}
export type EnqueueV1Deadline = (intent: V1DeadlineIntent) => Promise<void>;
export type V1SetupDeadline = { matchId: string; setupId: string; stage: 'choosing' | 'awaiting-ready'; deadlineToken: string };
export type V1SetupDeadlineIntent = V1SetupDeadline & { protocolVersion: 2; kind: 'SETUP_DEADLINE'; dueAt: number; taskId: string; status: 'pending' };
export type EnqueueV1SetupDeadline = (intent: V1SetupDeadlineIntent) => Promise<void>;
type SetupOutboxRecord = Omit<V1SetupDeadlineIntent, 'status'> & {
  status: 'pending' | 'leased' | 'dispatched' | 'completed' | 'blocked'; attempts: number;
  nextAttemptAt: number; leaseUntil: number | null; leaseToken: string | null;
};
type SetupDeadlineResult = { status: 'advanced' | 'unchanged' | 'too-early' | 'failed' | 'blocked'; retryAfterMs?: number };

export type StoredV1Setup = Omit<FullGameSetup, 'roundOrders'> & { storageCodecVersion: 1; roundOrders: Array<{ seatIds: SeatId[] }> };
export type StoredV1State = Omit<FullGameState, 'setup'> & { storageCodecVersion: 1; setup: StoredV1Setup };

// Firestore forbids arrays directly inside arrays. Preserve all recorded random orders
// using an explicit map layer; the deterministic engine continues to receive SeatId[][].
export function encodeV1Setup(setup: FullGameSetup): StoredV1Setup {
  return { ...setup, storageCodecVersion: 1, roundOrders: setup.roundOrders.map(seatIds => ({ seatIds: [...seatIds] })) };
}
export function decodeV1Setup(value: unknown): FullGameSetup {
  if (value === null || typeof value !== 'object' || !('storageCodecVersion' in value) || value.storageCodecVersion !== 1
    || !('roundOrders' in value) || !Array.isArray(value.roundOrders)
    || value.roundOrders.length !== 5 || value.roundOrders.some(entry => !safeBody(entry, ['seatIds']) || !Array.isArray(entry['seatIds'])
      || !entry['seatIds'].every(seat))) throw new Error('Invalid stored V1 setup');
  const { storageCodecVersion: _codec, ...setup } = value as StoredV1Setup;
  return { ...setup, roundOrders: setup.roundOrders.map(entry => [...entry.seatIds]) };
}
export function encodeV1State(state: FullGameState): StoredV1State { return { ...state, storageCodecVersion: 1, setup: encodeV1Setup(state.setup) }; }
export function decodeV1State(value: unknown): FullGameState {
  if (value === null || typeof value !== 'object' || !('storageCodecVersion' in value) || value.storageCodecVersion !== 1
    || !('setup' in value)) throw new Error('Invalid stored V1 state');
  const { storageCodecVersion: _codec, ...state } = value as StoredV1State;
  return { ...state, setup: decodeV1Setup(state.setup) };
}
type OutboxRecord = Omit<V1DeadlineIntent, 'status'> & {
  status: 'pending' | 'leased' | 'dispatched' | 'completed' | 'blocked'; attempts: number;
  nextAttemptAt: number; leaseUntil: number | null; leaseToken: string | null;
};
type Plan = { response: Success; replayResponse?: Success; write: () => void };
type Limit = { allowed: boolean; retryAfterMs: number; ref: DocumentReference; data: { windowStartedAt: number; count: number } };

const uidSafe = (uid: unknown): uid is string => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = (value: unknown) => hash(canonical(value));
const safeBody = (value: unknown, keys: readonly string[]): value is Body => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const id = (value: unknown): value is string => IdentifierSchema.safeParse(value).success;
const seat = (value: unknown): value is SeatId => SeatIdSchema.safeParse(value).success;
const memberPlayer = (value: unknown): value is { kind: 'player'; seatId: SeatId; bindingRevision: number } => value !== null && typeof value === 'object'
  && 'kind' in value && value.kind === 'player' && 'seatId' in value && seat(value.seatId)
  && 'bindingRevision' in value && Number.isSafeInteger(value.bindingRevision);
const supported = (state: FullGameState) => isSupportedFullGameVersions(state.versions);
const taskIdFor = (matchId: string, phaseId: string, token: string) => hash([matchId, phaseId, token]);
const setupTaskIdFor = (payload: V1SetupDeadline) => hash(['setup', payload.matchId, payload.setupId, payload.stage, payload.deadlineToken]);
const validSetupOutboxPath = (path: string) => /^matches\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\/setupOutbox\/[a-f0-9]{64}$/.test(path);
const validOutboxPath = (path: string) => /^matches\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\/outbox\/[a-f0-9]{64}$/.test(path);

// Queue acknowledgment is not proof of delivery. Completed is private outbox
// bookkeeping; gameplay outcomes still come exclusively from the pure engine.
const validDeadlineIntent = (value: OutboxRecord, path: string): boolean => validOutboxPath(path)
  && value.protocolVersion === 2 && [value.matchId, value.phaseId, value.deadlineToken].every(id)
  && value.matchId === path.split('/')[1]
  && value.taskId === taskIdFor(value.matchId, value.phaseId, value.deadlineToken) && path.split('/')[3] === value.taskId
  && Number.isSafeInteger(value.endsAt) && value.endsAt >= 0 && Number.isFinite(new Date(value.endsAt).getTime())
  && Number.isSafeInteger(value.attempts) && value.attempts >= 0 && value.attempts < Number.MAX_SAFE_INTEGER
  && Number.isSafeInteger(value.nextAttemptAt) && value.nextAttemptAt >= 0
  && (value.leaseToken === null || id(value.leaseToken))
  && (value.leaseUntil === null || (Number.isSafeInteger(value.leaseUntil) && value.leaseUntil >= 0))
  && (value.status !== 'leased' || (value.leaseToken !== null && value.leaseUntil !== null));

function secureShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j]!, result[i]!]; }
  return result;
}

// A separate cryptographic draw: no role shuffling, seat parity or room quota.
function secureInitialRoom(): Room { return randomInt(2) === 0 ? 'Room A' : 'Room B'; }

function randomSetup(playerCount: 7 | 8 | 9, shuffle: Shuffler): Omit<FullGameSetup, 'initialRooms'> {
  const roles: Role[] = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
  if (playerCount >= 8) roles.push('Red Disabler');
  if (playerCount === 9) roles.push('Officer');
  const roleOrder = shuffle(roles);
  const ids = roles.map((_, index) => `seat-${index + 1}` as SeatId);
  const excluded = ['Alien', 'Undercover'].map(role => ids[roleOrder.indexOf(role as Role)]);
  return { playerCount, roleOrder, codeExtraSeatIds: shuffle(ids.filter(s => !excluded.includes(s))).slice(0, 3),
    roundOrders: Array.from({ length: 5 }, () => shuffle(ids)) };
}

export function createV1Service({ db, clock = Date.now, newId = randomUUID, shuffle = secureShuffle, randomInitialRoom = secureInitialRoom, assetManifestVersion = '0.0.0-no-assets' }: {
  db: Firestore; clock?: () => number; newId?: () => string; shuffle?: Shuffler; randomInitialRoom?: RoomRandomizer; assetManifestVersion?: string;
}) {
  if (!FullAssetManifestVersionSchema.safeParse(assetManifestVersion).success) throw new Error('Invalid asset manifest version');
  function drawInitialRoom(): Room {
    const room = randomInitialRoom();
    if (room !== 'Room A' && room !== 'Room B') throw new Error('Invalid initial room draw');
    return room;
  }
  const failure = (code: FailureCode, retryAfterMs?: number): FullFailure => ({ ok: false, serverTimeMs: clock(), error: {
    code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  } });
  const success = (now: number, result: Success['result']): Success => FullOperationResponseSchema.parse({ ok: true, serverTimeMs: now, result }) as Success;
  function envelope(uid: string, payload: unknown, schema: EnvelopeSchema): Body | FullFailure {
    if (!uidSafe(uid)) return failure('UNAUTHENTICATED');
    if (payload !== null && typeof payload === 'object' && 'protocolVersion' in payload
      && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) return failure('UNSUPPORTED_PROTOCOL');
    const parsed = schema.safeParse(payload);
    return parsed.success ? parsed.data : failure('INVALID_REQUEST');
  }
  const isFailure = (body: Body | FullFailure): body is FullFailure => 'ok' in body && body.ok === false;
  async function limit(tx: Transaction, uid: string, operation: string, now: number): Promise<Limit> {
    // Individual identity buckets cannot make another player's hidden action observable through throttling.
    const ref = db.collection('requestLimits').doc(hash([uid, operation]));
    const stored = await tx.get(ref);
    const cap = operation === 'createMatch' ? 5 : operation === 'requestAdmission' ? 20 : 120;
    const duration = operation === 'createMatch' ? 600_000 : 60_000;
    const start = stored.exists ? stored.get('windowStartedAt') as number : now;
    const count = stored.exists ? stored.get('count') as number : 0;
    const reset = !Number.isSafeInteger(start) || now < start || now - start >= duration;
    const current = reset ? 0 : count;
    return { allowed: current < cap, retryAfterMs: reset ? 0 : Math.max(0, start + duration - now), ref,
      data: { windowStartedAt: reset ? now : start, count: current + 1 } };
  }
  async function activePlayer(tx: Transaction, base: DocumentReference, uid: string): Promise<ActivePlayer | null> {
    const membership = await tx.get(base.collection('members').doc(uid));
    const data = membership.data();
    if (!memberPlayer(data)) return null;
    const binding = await tx.get(base.collection('seats').doc(data.seatId));
    const value = binding.data() as SeatBinding | undefined;
    return humanBinding(value) && value.uid === uid && value.bindingRevision === data.bindingRevision ? { seatId: data.seatId, binding: value } : null;
  }
  async function admitted(tx: Transaction, base: DocumentReference, uid: string): Promise<boolean> {
    const membership = await tx.get(base.collection('members').doc(uid));
    const data = membership.data();
    if (data?.kind === 'display') return true;
    if (!memberPlayer(data)) return false;
    const binding = await tx.get(base.collection('seats').doc(data.seatId));
    return humanBinding(binding.data()) && binding.get('uid') === uid && binding.get('bindingRevision') === data.bindingRevision;
  }
  async function operation(uid: string, body: Body, name: string,
    prepare: (tx: Transaction, now: number) => Promise<Plan | FullFailure>): Promise<OperationResult> {
    const requestId = body['requestId'] as string, fingerprint = digest([name, body]);
    const receiptRef = db.collection('identityOperations').doc(hash([uid, requestId]));
    try {
      return await db.runTransaction(async tx => {
        const stored = await tx.get(receiptRef);
        if (stored.exists) {
          if (stored.get('digest') !== fingerprint) return failure('COMMAND_ID_CONFLICT');
          const previous = FullOperationResponseSchema.parse(stored.get('response'));
          if (!previous.ok) throw new Error('Invalid stored operation receipt');
          return { ...previous, serverTimeMs: clock() };
        }
        const now = clock(), budget = await limit(tx, uid, name, now);
        if (!budget.allowed) return failure('RATE_LIMITED', budget.retryAfterMs);
        const plan = await prepare(tx, now);
        tx.set(budget.ref, budget.data);
        if ('ok' in plan) return plan;
        plan.write();
        tx.create(receiptRef, { uid, operation: name, digest: fingerprint, response: plan.replayResponse ?? plan.response, evaluatedAt: now });
        return plan.response;
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  function lobby(base: DocumentReference, control: Control, bindings: QueryDocumentSnapshot[]) {
    return FullLobbyViewSchema.parse({ protocolVersion: 2, matchId: base.id, playerCount: control.playerCount, status: ['choosing', 'awaiting-ready'].includes(control.status) ? 'lobby' : control.status,
      seats: bindings.map(doc => ({ seatId: doc.id, initialRoom: doc.get('initialRoom') as Room })).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
  }
  function identityDocument(matchId: string, bindings: QueryDocumentSnapshot[] = []): FullLobbyIdentityDocument {
    return FullLobbyIdentityDocumentSchema.parse({ schemaVersion: 1, protocolVersion: 2, catalogVersion: 'crew-0.1.0',
      matchId, revision: 0, locked: false,
      seats: bindings.map(binding => ({ seatId: binding.id, displayName: null, characterId: null })).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
  }
  function deadline(state: FullGameState): OutboxRecord | null {
    if (state.phase.endsAt === null || state.deadlineToken === null) return null;
    return { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken,
      endsAt: state.phase.endsAt, taskId: taskIdFor(state.matchId, state.phase.id, state.deadlineToken), status: 'pending',
      attempts: 0, nextAttemptAt: clock(), leaseUntil: null, leaseToken: null };
  }
  function writeGame(tx: Transaction, before: FullGameState | null, after: FullGameState,
    bindings: QueryDocumentSnapshot[], eventId: string, command?: { actorSeatId: SeatId; commandId: string }) {
    const base = db.collection('matches').doc(after.matchId), next = projectFullGame(after), prev = before === null ? null : projectFullGame(before);
    tx.set(base.collection('engine').doc('current'), encodeV1State(after));
    const audiences: Array<{ path: string; key: string; old: unknown; view: typeof next.public | FullPlayerView }> = [
      { path: 'views/public', key: 'public', old: prev?.public, view: next.public },
    ];
    for (const binding of bindings) {
      const viewer = next.players[binding.id as SeatId], uid = binding.get('uid') as unknown;
      if (viewer !== undefined && humanBinding(binding.data()) && uidSafe(uid)) {
        audiences.push({ path: `playerViews/${uid}`, key: `p-${binding.id}`, old: prev?.players[binding.id as SeatId], view: viewer });
        const bindingRevision = binding.get('bindingRevision') as number;
        const acknowledgment = OwnAcknowledgmentsSchema.parse(projectOwnAcknowledgments(after, binding.id as SeatId, bindingRevision));
        const previousAcknowledgment = before === null ? null : projectOwnAcknowledgments(before, binding.id as SeatId, bindingRevision);
        // No timestamps/global revisions: another seat's private fact cannot update this document.
        if (digest(previousAcknowledgment) !== digest(acknowledgment)) {
          tx.set(base.collection('ownAcknowledgments').doc(uid), acknowledgment);
        }
      }
    }
    for (const audience of audiences) {
      if (digest(audience.old ?? null) === digest(audience.view)) continue;
      const view = audience.view;
      if (view.audience.kind === 'public') FullPublicViewSchema.parse(view); else FullPlayerViewSchema.parse(view);
      tx.set(db.doc(`${base.path}/${audience.path}`), view);
      const facts: Array<Record<string, unknown>> = [];
      if (before?.phase.id !== after.phase.id) facts.push({ type: 'PHASE_CHANGED', phaseId: after.phase.id });
      if (before !== null) for (const current of after.seats) {
        const previous = before.seats.find(s => s.seatId === current.seatId);
        if (previous?.health !== current.health) facts.push({ type: 'PUBLIC_HEALTH_CHANGED', seatId: current.seatId, health: current.health });
        if (previous?.location !== current.location) facts.push({ type: 'PUBLIC_MOVE', seatId: current.seatId, location: current.location });
      }
      if (command && view.audience.kind === 'player' && view.audience.seatId === command.actorSeatId) facts.push({ type: 'COMMAND_REGISTERED', commandId: command.commandId });
      facts.forEach((fact, ordinal) => {
        const event = FullEventSchema.parse({ protocolVersion: 2, matchId: after.matchId, eventId: `${eventId}-${ordinal}`,
          viewRevision: view.viewRevision, audience: view.audience, fact });
        tx.create(base.collection('audienceEvents').doc(audience.key).collection('items').doc(`${view.viewRevision}-${ordinal}`), event);
      });
    }
    if (before?.phase.id !== after.phase.id) {
      const intent = deadline(after);
      if (intent !== null) tx.create(base.collection('outbox').doc(intent.taskId), intent);
    }
    if (after.phase.kind === 'FINISHED' || after.phase.kind === 'ABORTED') {
      tx.update(base.collection('control').doc('session'), { status: after.phase.kind === 'FINISHED' ? 'complete' : 'aborted' });
      tx.update(base.collection('lobby').doc('public'), { status: after.phase.kind === 'FINISHED' ? 'complete' : 'aborted' });
    }
  }

  async function createMatch(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullCreateMatchRequestSchema);
    if (isFailure(body)) return body;
    const matchId = newId(), roomCode = randomBytes(6).toString('hex').toUpperCase();
    if (!id(matchId)) return failure('UNAVAILABLE');
    const base = db.collection('matches').doc(matchId), codeRef = db.collection('roomCodes').doc(roomCode);
    return operation(uid, body, 'createMatch', async (tx, now) => {
      const collision = await tx.get(codeRef);
      if (collision.exists) return failure('UNAVAILABLE');
      const control: Control = { protocolVersion: 2, hostUid: uid, playerCount: body['playerCount'] as 7 | 8 | 9, status: 'lobby', lifecycleVersion: SETUP_LIFECYCLE_VERSION, gameStarted: false, roomCode, createdAt: now };
      return { response: success(now, { matchId, roomCode, playerCount: control.playerCount, status: 'lobby' }), write: () => {
        tx.create(codeRef, { matchId }); tx.create(base.collection('control').doc('session'), control);
        tx.create(base.collection('engine').doc('gameplayPins'), FULL_GAME_VERSION_PINS);
        tx.create(base.collection('members').doc(uid), { kind: 'display' });
        tx.create(base.collection('lobby').doc('public'), lobby(base, control, []));
        tx.create(base.collection('identities').doc('public'), identityDocument(base.id));
        tx.create(base.collection('practice').doc('public'), practiceDocument(base.id));
        tx.create(base.collection('setup').doc('public'), setupDocument(base.id, control.playerCount));
      } };
    });
  }
  async function requestAdmission(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullAdmissionRequestSchema);
    if (isFailure(body)) return body;
    const admissionId = hash([uid, body['requestId']]);
    // Draw only for a new admission, and reuse the candidate across transaction retries.
    // Keep the original body (including deprecated initialRoom) in receipt fingerprints.
    let initialRoom: Room | undefined;
    return operation(uid, body, 'requestAdmission', async (tx, now) => {
      const code = await tx.get(db.collection('roomCodes').doc(body['roomCode'] as string));
      if (!code.exists || !id(code.get('matchId'))) return failure('FORBIDDEN');
      const base = db.collection('matches').doc(code.get('matchId') as string);
      const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
      const member = await tx.get(base.collection('members').doc(uid));
      if (control?.protocolVersion !== 2 || control.status !== 'lobby' || member.get('kind') === 'player') return failure('FORBIDDEN');
      initialRoom ??= drawInitialRoom();
      return { response: success(now, { matchId: base.id, admissionId, status: 'pending' }), write: () => {
        tx.create(base.collection('admissions').doc(admissionId), { uid, initialRoom, requestedAt: now, status: 'pending' });
      } };
    });
  }
  async function approveAdmission(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullApproveAdmissionRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string), seatId = body['seatId'] as SeatId;
    return operation(uid, body, 'approveAdmission', async (tx, now) => {
      const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
      if (control?.hostUid !== uid || control.status !== 'lobby' || Number(seatId.slice(5)) > control.playerCount) return failure('FORBIDDEN');
      const admissionRef = base.collection('admissions').doc(body['admissionId'] as string), admission = await tx.get(admissionRef);
      const targetUid = admission.get('uid') as unknown;
      if (!uidSafe(targetUid) || admission.get('status') !== 'pending') return failure('FORBIDDEN');
      const memberRef = base.collection('members').doc(targetUid), existing = await tx.get(memberRef);
      const bindingRef = base.collection('seats').doc(seatId), binding = await tx.get(bindingRef);
      const bindings = await tx.get(base.collection('seats'));
      if (binding.exists || existing.get('kind') === 'player') return failure('FORBIDDEN');
      const identityRef = base.collection('identities').doc('public'), identitySnapshot = await tx.get(identityRef);
      const currentIdentity = identitySnapshot.exists ? FullLobbyIdentityDocumentSchema.parse(identitySnapshot.data()) : identityDocument(base.id, bindings.docs);
      if (currentIdentity.matchId !== base.id || currentIdentity.locked || currentIdentity.seats.length !== bindings.size) return failure('UNAVAILABLE');
      const nextIdentity = FullLobbyIdentityDocumentSchema.parse({ ...currentIdentity, revision: currentIdentity.revision + 1,
        seats: [...currentIdentity.seats, { seatId, displayName: null, characterId: null }].sort((a, b) => a.seatId.localeCompare(b.seatId)) });
      const setupRef = base.collection('setup').doc('public'), setupSnapshot = await tx.get(setupRef);
      const currentSetup = setupSnapshot.exists ? FullSetupDocumentSchema.parse(setupSnapshot.data()) : setupDocument(base.id, control.playerCount, bindings.docs);
      if (currentSetup.stage !== 'lobby' || currentSetup.matchId !== base.id) return failure('FORBIDDEN');
      const nextSetup = FullSetupDocumentSchema.parse({ ...currentSetup, revision: currentSetup.revision + 1,
        seats: [...bindings.docs.map(binding => ({ seatId: binding.id, confirmed: false, ready: false })), { seatId, confirmed: false, ready: false }]
          .sort((a, b) => a.seatId.localeCompare(b.seatId)) });
      const initialRoom = admission.get('initialRoom') as Room;
      const nextLobby = lobby(base, control, bindings.docs); nextLobby.seats.push({ seatId, initialRoom });
      FullLobbyViewSchema.parse(nextLobby);
      return { response: success(now, { admissionId: admission.id, seatId, status: 'approved' }), write: () => {
        tx.create(bindingRef, { uid: targetUid, bindingRevision: 1, initialRoom });
        tx.create(base.collection('seatSessions').doc(targetUid), SeatSessionSchema.parse({ schemaVersion: 1, protocolVersion: 2, matchId: base.id, seatId, bindingRevision: 1 }));
        tx.set(memberRef, { kind: 'player', seatId, bindingRevision: 1 });
        tx.update(admissionRef, { status: 'approved', seatId });
        tx.set(base.collection('lobby').doc('public'), nextLobby);
        tx.set(identityRef, nextIdentity); tx.set(setupRef, nextSetup);
      } };
    });
  }

  function practiceDocument(matchId: string): FullPracticeBotsDocument {
    return FullPracticeBotsDocumentSchema.parse({ schemaVersion: 1, protocolVersion: 2, matchId,
      revision: 0, policyVersion: PRACTICE_BOT_POLICY_VERSION, botSeatIds: [] });
  }
  type SetupOperation = 'beginSetup' | 'confirmSetupChoice' | 'readyForMatch';
  type SetupResponse = FullBeginSetupResponse | FullConfirmSetupChoiceResponse | FullReadyForMatchResponse;
  type PreparedDeal = { schemaVersion: 1; protocolVersion: 2; lifecycleVersion: typeof SETUP_LIFECYCLE_VERSION;
    dealId: string; setupId: string; readingStartedAt: number; readingEndsAt: number; readingDeadlineToken: string;
    versions: FullVersions; preparedAt: number; setup: StoredV1Setup };
  const normalizedName = (name: string) => name.normalize('NFKC').trim().toLowerCase();
  function setupDocument(matchId: string, playerCount: 7 | 8 | 9, bindings: QueryDocumentSnapshot[] = [], revision = 0): FullSetupDocument {
    return FullSetupDocumentSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: SETUP_LIFECYCLE_VERSION,
      matchId, playerCount, revision, stage: 'lobby', dealId: null, setupId: null,
      choosingStartedAt: null, choosingEndsAt: null, readingStartedAt: null, readingEndsAt: null,
      seats: bindings.map(binding => ({ seatId: binding.id, confirmed: false, ready: false })).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
  }
  function setupWindowEnd(startedAt: number): number {
    const end = startedAt + 30_000;
    if (!Number.isSafeInteger(startedAt) || startedAt < 0 || !Number.isSafeInteger(end)
      || !Number.isFinite(new Date(end).getTime())) throw new Error('Invalid setup clock');
    return end;
  }
  function setupIntent(payload: V1SetupDeadline, dueAt: number, now: number): SetupOutboxRecord {
    return { ...payload, protocolVersion: 2, kind: 'SETUP_DEADLINE', taskId: setupTaskIdFor(payload), dueAt,
      status: 'pending', attempts: 0, nextAttemptAt: now, leaseToken: null, leaseUntil: null };
  }
  function validSetupIntent(value: SetupOutboxRecord, path: string): boolean {
    return value?.protocolVersion === 2 && value.kind === 'SETUP_DEADLINE'
      && [value.matchId, value.setupId, value.deadlineToken].every(id) && ['choosing', 'awaiting-ready'].includes(value.stage)
      && value.matchId === path.split('/')[1] && value.taskId === path.split('/')[3] && value.taskId === setupTaskIdFor(value)
      && Number.isSafeInteger(value.dueAt) && value.dueAt >= 0 && Number.isFinite(new Date(value.dueAt).getTime())
      && Number.isSafeInteger(value.attempts) && value.attempts >= 0 && Number.isSafeInteger(value.nextAttemptAt)
      && ['pending', 'leased', 'dispatched', 'completed', 'blocked'].includes(value.status)
      && (value.leaseUntil === null || Number.isSafeInteger(value.leaseUntil)) && (value.leaseToken === null || id(value.leaseToken));
  }
  function automaticIdentities(current: FullLobbyIdentityDocument, progress: FullSetupDocument): FullLobbyIdentityDocument {
    const usedCharacters = new Set<string>(), usedNames = new Set<string>();
    const confirmed = progress.seats.filter(seat => seat.confirmed);
    for (const seat of confirmed) {
      const identity = current.seats.find(identity => identity.seatId === seat.seatId);
      if (identity?.characterId == null || identity.displayName === null || usedCharacters.has(identity.characterId)
        || usedNames.has(normalizedName(identity.displayName))) throw new Error('Invalid confirmed identity');
      usedCharacters.add(identity.characterId); usedNames.add(normalizedName(identity.displayName));
    }
    const seats = current.seats.map(identity => {
      if (confirmed.some(seat => seat.seatId === identity.seatId)) return identity;
      const chosen = identity.characterId !== null && !usedCharacters.has(identity.characterId) ? identity.characterId
        : Array.from({ length: 9 }, (_, index) => `c${index + 1}`).find(character => !usedCharacters.has(character));
      const characterId = CrewCharacterIdSchema.parse(chosen);
      let displayName = identity.displayName;
      if (displayName === null || usedNames.has(normalizedName(displayName))) {
        const baseName = `Player ${identity.seatId.slice(5)}`;
        displayName = baseName;
        for (let suffix = 1; usedNames.has(normalizedName(displayName)); suffix++) displayName = `${baseName}-${suffix}`;
      }
      usedCharacters.add(characterId); usedNames.add(normalizedName(displayName));
      return { seatId: identity.seatId, characterId, displayName };
    });
    return FullLobbyIdentityDocumentSchema.parse({ ...current, locked: true, revision: current.revision + 1, seats });
  }
  function parseDeal(value: unknown, match: FullSetupDocument): PreparedDeal {
    if (value === null || typeof value !== 'object') throw new Error('Missing prepared deal');
    const deal = value as PreparedDeal;
    if (deal.schemaVersion !== 1 || deal.protocolVersion !== 2 || deal.lifecycleVersion !== SETUP_LIFECYCLE_VERSION
      || deal.dealId !== match.dealId || !id(deal.dealId) || deal.setupId !== match.setupId || !id(deal.setupId)
      || deal.readingStartedAt !== match.readingStartedAt || deal.readingEndsAt !== match.readingEndsAt
      || deal.preparedAt !== deal.readingStartedAt || !id(deal.readingDeadlineToken)) throw new Error('Invalid prepared deal');
    FullVersionsSchema.parse(deal.versions);
    if (!isSupportedFullGameVersions(deal.versions)) throw new Error('Unsupported prepared deal');
    const decoded = decodeV1Setup(deal.setup);
    if (decoded.playerCount !== match.playerCount) throw new Error('Invalid prepared roster');
    buildRoster(decoded);
    return deal;
  }
  function setupPreview(matchId: string, deal: PreparedDeal, binding: DocumentSnapshot, bindingRevision?: number): FullSetupPlayerView {
    const setup = decodeV1Setup(deal.setup), seatId = binding.id as SeatId;
    return FullSetupPlayerViewSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: SETUP_LIFECYCLE_VERSION,
      versions: deal.versions, matchId, playerCount: setup.playerCount, dealId: deal.dealId,
      bindingRevision: bindingRevision ?? binding.get('bindingRevision'), audience: { kind: 'player', seatId },
      self: { seatId, role: setup.roleOrder[Number(seatId.slice(5)) - 1] } });
  }
  function launchPrepared(tx: Transaction, base: DocumentReference, control: Control, progress: FullSetupDocument,
    deal: PreparedDeal, bindings: QueryDocumentSnapshot[], now: number, context: { eventId: string; phaseId: string; token: string }) {
    if (now < deal.readingEndsAt || !progress.seats.every(seat => seat.ready)) throw new Error('Setup minimum and readiness required');
    const state = { ...createFullGame({ matchId: base.id, setup: decodeV1Setup(deal.setup), now,
      phaseId: context.phaseId, deadlineToken: context.token, assetManifestVersion: deal.versions.assetManifestVersion, versions: deal.versions }), journalSequence: 1 };
    tx.update(base.collection('setupOutbox').doc(setupTaskIdFor({ matchId: base.id, setupId: deal.setupId, stage: 'awaiting-ready', deadlineToken: deal.readingDeadlineToken })),
      { status: 'completed', leaseToken: null, leaseUntil: null });
    tx.update(base.collection('control').doc('session'), { status: 'running', lifecycleVersion: SETUP_LIFECYCLE_VERSION, gameStarted: true });
    tx.set(base.collection('setup').doc('public'), FullSetupDocumentSchema.parse({ ...progress, stage: 'running' }));
    tx.set(base.collection('lobby').doc('public'), lobby(base, { ...control, status: 'running' }, bindings));
    for (const binding of bindings.filter(binding => humanBinding(binding.data()))) tx.delete(base.collection('setupPlayerViews').doc(binding.get('uid') as string));
    writeGame(tx, null, state, bindings, context.eventId);
    tx.create(base.collection('events').doc(context.eventId), { journalVersion: 1, sequence: 1, kind: 'SETUP', now,
      phaseId: context.phaseId, deadlineToken: context.token, matchId: base.id, assetManifestVersion: state.versions.assetManifestVersion,
      setup: deal.setup, verifiedUid: control.hostUid, versions: state.versions, dealId: deal.dealId,
      seatBindings: bindings.map(binding => ({ seatId: binding.id, ...binding.data() })) });
  }
  async function setupOperation(uid: string, payload: unknown, name: SetupOperation): Promise<SetupResponse> {
    const requestSchema = name === 'beginSetup' ? FullBeginSetupRequestSchema : name === 'confirmSetupChoice' ? FullConfirmSetupChoiceRequestSchema : FullReadyForMatchRequestSchema;
    const responseSchema = name === 'beginSetup' ? FullBeginSetupResponseSchema : name === 'confirmSetupChoice' ? FullConfirmSetupChoiceResponseSchema : FullReadyForMatchResponseSchema;
    const fail = (code: FullSetupErrorCode, retryAfterMs?: number): SetupResponse => responseSchema.parse({ schemaVersion: 1, protocolVersion: 2,
      ok: false, serverTimeMs: clock(), error: { code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) } });
    if (!uidSafe(uid)) return fail('UNAUTHENTICATED');
    if (payload !== null && typeof payload === 'object') {
      if ('protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) return fail('UNSUPPORTED_PROTOCOL');
      if ('schemaVersion' in payload && typeof payload.schemaVersion === 'number' && payload.schemaVersion !== 1) return fail('UNSUPPORTED_SCHEMA');
    }
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) return fail('INVALID_REQUEST');
    const body = parsed.data as Body, base = db.collection('matches').doc(body['matchId'] as string);
    const receiptRef = db.collection('setupOperations').doc(hash([uid, body['requestId']])), fingerprint = digest([name, body]);
    const context = { eventId: newId(), phaseId: newId(), token: newId() }, setupId = newId(), selectionToken = newId();
    try {
      return await db.runTransaction(async tx => {
        const controlRef = base.collection('control').doc('session'), control = (await tx.get(controlRef)).data() as Control | undefined;
        const actor = name === 'beginSetup' ? null : await activePlayer(tx, base, uid);
        if (control?.protocolVersion !== 2 || (name === 'beginSetup' ? control.hostUid !== uid : actor === null)) return fail('FORBIDDEN');
        if (control.lifecycleVersion !== undefined && control.lifecycleVersion !== SETUP_LIFECYCLE_VERSION) return fail('UNSUPPORTED_SCHEMA');
        if (actor !== null && body['bindingRevision'] !== actor.binding.bindingRevision) return fail('STALE_BINDING');
        const publicRef = base.collection('setup').doc('public'), publicSnapshot = await tx.get(publicRef);
        const current = publicSnapshot.exists ? FullSetupDocumentSchema.parse(publicSnapshot.data()) : setupDocument(base.id, control.playerCount);
        if (current.matchId !== base.id || current.playerCount !== control.playerCount) throw new Error('Invalid setup context');
        if (control.status === 'aborted' || current.stage === 'aborted') return fail('SETUP_LOCKED');
        if (name === 'readyForMatch' && body['dealId'] !== current.dealId) return fail('STALE_DEAL');
        // Fresh identity/binding/deal authority always precedes replay, including after recovery.
        const receipt = await tx.get(receiptRef);
        if (receipt.exists) return receipt.get('digest') === fingerprint ? responseSchema.parse({ ...receipt.get('response'), serverTimeMs: clock() }) : fail('REQUEST_ID_CONFLICT');
        const budget = await limit(tx, uid, name, clock());
        if (!budget.allowed) return fail('RATE_LIMITED', budget.retryAfterMs);
        const bindings = (await tx.get(base.collection('seats'))).docs;
        const identityRef = base.collection('identities').doc('public'), identitySnapshot = await tx.get(identityRef);
        const identities = identitySnapshot.exists ? FullLobbyIdentityDocumentSchema.parse(identitySnapshot.data()) : identityDocument(base.id, bindings);
        const dealRef = base.collection('setup').doc('deal'), dealSnapshot = await tx.get(dealRef);
        const engineSnapshot = await tx.get(base.collection('engine').doc('current'));
        const practiceSnapshot = await tx.get(base.collection('practice').doc('public'));
        const practice = practiceSnapshot.exists ? FullPracticeBotsDocumentSchema.parse(practiceSnapshot.data()) : practiceDocument(base.id);
        const humans = bindings.filter(binding => humanBinding(binding.data())), bots = bindings.filter(botBinding);
        let now = clock();
        let response: SetupResponse, mutate: (() => void) | undefined;
        const acknowledge = (progress: FullSetupDocument): SetupResponse => responseSchema.parse({ schemaVersion: 1, protocolVersion: 2,
          ok: true, serverTimeMs: now, matchId: base.id, requestId: body['requestId'], revision: progress.revision, stage: progress.stage, dealId: progress.dealId,
          ...(actor === null ? {} : { seatId: actor.seatId, bindingRevision: actor.binding.bindingRevision }) });
        if (name === 'beginSetup') {
          const memberships = humans.length === 0 ? [] : await tx.getAll(...humans.map(binding => base.collection('members').doc(binding.get('uid') as string)));
          now = clock();
          const validRoster = bindings.length === control.playerCount && humans.length + bots.length === bindings.length
            && new Set(humans.map(binding => binding.get('uid'))).size === humans.length
            && bindings.every(binding => seat(binding.id) && Number(binding.id.slice(5)) <= control.playerCount)
            && memberships.every((membership, index) => { const member = membership.data(), binding = humans[index]!;
              return memberPlayer(member) && member.seatId === binding.id && member.bindingRevision === binding.get('bindingRevision'); });
          if (control.status !== 'lobby' || current.stage !== 'lobby') response = fail('SETUP_LOCKED');
          else if (engineSnapshot.exists || dealSnapshot.exists || control.gameStarted === true) response = fail('UNAVAILABLE');
          else if (!validRoster) response = fail('ROSTER_INCOMPLETE');
          else if (identities.matchId !== base.id || identities.locked || identities.seats.length !== bindings.length
            || !bindings.every(binding => identities.seats.some(identity => identity.seatId === binding.id))
            || practice.matchId !== base.id || digest(practice.botSeatIds) !== digest(bots.map(binding => binding.id).sort())
            || bots.some(binding => { const identity = identities.seats.find(identity => identity.seatId === binding.id); return identity?.displayName == null || identity.characterId === null; })) response = fail('UNAVAILABLE');
          else {
            const progress = FullSetupDocumentSchema.parse({ ...current, stage: 'choosing', revision: current.revision + 1,
              setupId, choosingStartedAt: now, choosingEndsAt: setupWindowEnd(now), readingStartedAt: null, readingEndsAt: null,
              seats: bindings.map(binding => ({ seatId: binding.id, confirmed: botBinding(binding), ready: false })).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
            const intent = setupIntent({ matchId: base.id, setupId, stage: 'choosing', deadlineToken: selectionToken }, progress.choosingEndsAt!, now);
            response = acknowledge(progress);
            mutate = () => {
              tx.update(controlRef, { status: 'choosing', lifecycleVersion: SETUP_LIFECYCLE_VERSION, gameStarted: false });
              tx.set(publicRef, progress); tx.create(base.collection('setupOutbox').doc(intent.taskId), intent);
              if (!identitySnapshot.exists) tx.set(identityRef, identities);
            };
          }
        } else if (name === 'confirmSetupChoice') {
          if (control.status !== 'choosing' || control.lifecycleVersion !== SETUP_LIFECYCLE_VERSION || current.stage !== 'choosing' || identities.locked || now >= current.choosingEndsAt!) response = fail('SETUP_LOCKED');
          else if (control.gameStarted !== false || engineSnapshot.exists) response = fail('UNAVAILABLE');
          else if (identities.seats.some(identity => identity.seatId !== actor!.seatId && identity.characterId === body['characterId'])) response = fail('CHARACTER_TAKEN');
          else if (identities.seats.some(identity => identity.seatId !== actor!.seatId && identity.displayName !== null
            && normalizedName(identity.displayName) === normalizedName(body['displayName'] as string))) response = fail('NAME_TAKEN');
          else {
            const previous = identities.seats.find(identity => identity.seatId === actor!.seatId);
            if (previous === undefined || identities.matchId !== base.id || identities.seats.length !== bindings.length
              || !current.seats.some(seat => seat.seatId === actor!.seatId) || dealSnapshot.exists) throw new Error('Invalid choosing roster');
            const changed = previous.displayName !== body['displayName'] || previous.characterId !== body['characterId'];
            const nextIdentities = FullLobbyIdentityDocumentSchema.parse({ ...identities, revision: identities.revision + (changed ? 1 : 0),
              seats: identities.seats.map(identity => identity.seatId === actor!.seatId ? { seatId: identity.seatId,
                displayName: body['displayName'], characterId: body['characterId'] } : identity) });
            const changedProgress = changed || !current.seats.find(seat => seat.seatId === actor!.seatId)!.confirmed;
            const progress = FullSetupDocumentSchema.parse({ ...current, revision: current.revision + (changedProgress ? 1 : 0),
              seats: current.seats.map(seat => seat.seatId === actor!.seatId ? { ...seat, confirmed: true } : seat) });
            response = acknowledge(progress);
            mutate = () => {
              if (changed) tx.set(identityRef, nextIdentities);
              if (changedProgress) tx.set(publicRef, progress);
            };
          }
        } else {
          if (control.lifecycleVersion !== SETUP_LIFECYCLE_VERSION || !['awaiting-ready', 'running'].includes(control.status)
            || !['awaiting-ready', 'running'].includes(current.stage)) response = fail('SETUP_LOCKED');
          else if (control.status !== current.stage || (current.stage === 'awaiting-ready'
            ? control.gameStarted !== false || engineSnapshot.exists
            : control.gameStarted !== true || !engineSnapshot.exists)) response = fail('UNAVAILABLE');
          else {
            const deal = parseDeal(dealSnapshot.data(), current), own = current.seats.find(seat => seat.seatId === actor!.seatId);
            if (own === undefined || !own.confirmed || identities.matchId !== base.id || !identities.locked) throw new Error('Invalid ready roster');
            if (current.stage === 'running') response = acknowledge(current);
            else {
              let progress = FullSetupDocumentSchema.parse({ ...current, revision: current.revision + (own.ready ? 0 : 1),
                seats: current.seats.map(seat => seat.seatId === actor!.seatId ? { ...seat, ready: true } : seat) });
              const launch = progress.seats.every(seat => seat.ready) && now >= progress.readingEndsAt!;
              if (launch) progress = FullSetupDocumentSchema.parse({ ...progress, stage: 'running' });
              response = acknowledge(progress);
              mutate = () => {
                if (!own.ready) tx.set(publicRef, progress);
                if (launch) launchPrepared(tx, base, control, progress, deal, bindings, now, context);
              };
            }
          }
        }
        tx.set(budget.ref, budget.data); mutate?.();
        tx.create(receiptRef, { verifiedUid: uid, matchId: base.id, operation: name, digest: fingerprint, response,
          ...(actor === null ? {} : { seatId: actor.seatId, bindingRevision: actor.binding.bindingRevision }), evaluatedAt: now });
        return response;
      });
    } catch { return fail('UNAVAILABLE'); }
  }
  const beginSetup = (uid: string, payload: unknown) => setupOperation(uid, payload, 'beginSetup') as Promise<FullBeginSetupResponse>;
  const confirmSetupChoice = (uid: string, payload: unknown) => setupOperation(uid, payload, 'confirmSetupChoice') as Promise<FullConfirmSetupChoiceResponse>;
  const readyForMatch = (uid: string, payload: unknown) => setupOperation(uid, payload, 'readyForMatch') as Promise<FullReadyForMatchResponse>;

  /** Private setup timer only. Its timestamps never create a gameplay phase early. */
  async function runSetupDeadline(payload: V1SetupDeadline): Promise<SetupDeadlineResult> {
    if (!safeBody(payload, ['matchId', 'setupId', 'stage', 'deadlineToken'])
      || ![payload.matchId, payload.setupId, payload.deadlineToken].every(id)
      || !['choosing', 'awaiting-ready'].includes(payload.stage)) return { status: 'blocked' };
    const base = db.collection('matches').doc(payload.matchId), intentRef = base.collection('setupOutbox').doc(setupTaskIdFor(payload));
    const context = { eventId: newId(), phaseId: newId(), token: newId() }, dealId = newId(), readingToken = newId();
    let recordedSetup: StoredV1Setup | undefined;
    try {
      return await db.runTransaction(async tx => {
        const controlRef = base.collection('control').doc('session'), control = (await tx.get(controlRef)).data() as Control | undefined;
        const publicRef = base.collection('setup').doc('public'), publicSnapshot = await tx.get(publicRef), intentSnapshot = await tx.get(intentRef);
        if (control?.protocolVersion !== 2 || control.lifecycleVersion !== SETUP_LIFECYCLE_VERSION || !publicSnapshot.exists) return { status: 'blocked' as const };
        const current = FullSetupDocumentSchema.parse(publicSnapshot.data()), intent = intentSnapshot.data() as SetupOutboxRecord | undefined;
        if (intent === undefined || !validSetupIntent(intent, intentRef.path)) return { status: 'blocked' as const };
        if (intent.status === 'blocked') return { status: 'blocked' as const };
        if (intent.status === 'completed') return { status: 'unchanged' as const };
        if (current.setupId !== payload.setupId || current.stage !== payload.stage || ['running', 'complete', 'aborted'].includes(control.status)) {
          tx.update(intentRef, { status: 'completed', leaseToken: null, leaseUntil: null }); return { status: 'unchanged' as const };
        }
        if (current.matchId !== base.id || current.playerCount !== control.playerCount || control.status !== current.stage || control.gameStarted !== false
          || intent.dueAt !== (payload.stage === 'choosing' ? current.choosingEndsAt : current.readingEndsAt)) return { status: 'blocked' as const };
        const checkedAt = clock();
        if (checkedAt < intent.dueAt) return { status: 'too-early' as const, retryAfterMs: intent.dueAt - checkedAt };
        const engineSnapshot = await tx.get(base.collection('engine').doc('current'));
        if (engineSnapshot.exists) return { status: 'blocked' as const };
        const bindings = (await tx.get(base.collection('seats'))).docs;
        const humans = bindings.filter(binding => humanBinding(binding.data())), bots = bindings.filter(botBinding);
        const memberships = humans.length === 0 ? [] : await tx.getAll(...humans.map(binding => base.collection('members').doc(binding.get('uid') as string)));
        if (bindings.length !== control.playerCount || humans.length + bots.length !== bindings.length
          || new Set(humans.map(binding => binding.get('uid'))).size !== humans.length
          || digest(bindings.map(binding => binding.id).sort()) !== digest(current.seats.map(seat => seat.seatId))
          || !memberships.every((membership, index) => { const member = membership.data(), binding = humans[index]!;
            return memberPlayer(member) && member.seatId === binding.id && member.bindingRevision === binding.get('bindingRevision'); })) return { status: 'blocked' as const };
        const identityRef = base.collection('identities').doc('public'), identitySnapshot = await tx.get(identityRef);
        const identities = FullLobbyIdentityDocumentSchema.parse(identitySnapshot.data());
        const dealRef = base.collection('setup').doc('deal'), dealSnapshot = await tx.get(dealRef);
        const creationPins = payload.stage === 'choosing'
          ? (await tx.get(base.collection('engine').doc('gameplayPins'))).data() as FullGameplayVersions | undefined : undefined;
        if (identities.matchId !== base.id || digest(identities.seats.map(seat => seat.seatId)) !== digest(current.seats.map(seat => seat.seatId))) return { status: 'blocked' as const };
        // Start the next full window after loading its transactional inputs.
        const now = clock();
        if (payload.stage === 'choosing') {
          if (identities.locked || dealSnapshot.exists) return { status: 'blocked' as const };
          // Missing pins identify a lobby created by the deployed legacy service.
          const gameplayVersions = creationPins ?? LEGACY_FULL_GAME_VERSION_PINS;
          if (!isSupportedFullGameVersions(gameplayVersions)) throw new Error('Unsupported match gameplay pins');
          const nextIdentities = automaticIdentities(identities, current), readingEndsAt = setupWindowEnd(now);
          recordedSetup ??= encodeV1Setup({ ...randomSetup(control.playerCount, shuffle),
            initialRooms: Object.fromEntries(bindings.map(binding => [binding.id, binding.get('initialRoom') as Room])) });
          buildRoster(decodeV1Setup(recordedSetup));
          const deal: PreparedDeal = { schemaVersion: 1, protocolVersion: 2, lifecycleVersion: SETUP_LIFECYCLE_VERSION, dealId,
            setupId: payload.setupId, readingStartedAt: now, readingEndsAt, readingDeadlineToken: readingToken, preparedAt: now,
            versions: { ...gameplayVersions, assetManifestVersion },
            setup: recordedSetup };
          const progress = FullSetupDocumentSchema.parse({ ...current, revision: current.revision + 1,
            stage: 'awaiting-ready', dealId, readingStartedAt: now, readingEndsAt,
            seats: current.seats.map(seat => ({ ...seat, confirmed: true, ready: bots.some(binding => binding.id === seat.seatId) })) });
          const readingIntent = setupIntent({ matchId: base.id, setupId: payload.setupId, stage: 'awaiting-ready', deadlineToken: readingToken }, readingEndsAt, now);
          tx.set(identityRef, nextIdentities); tx.create(dealRef, deal); tx.set(publicRef, progress);
          tx.update(controlRef, { status: 'awaiting-ready' });
          for (const binding of humans) tx.set(base.collection('setupPlayerViews').doc(binding.get('uid') as string), setupPreview(base.id, deal, binding));
          tx.create(base.collection('setupOutbox').doc(readingIntent.taskId), readingIntent);
          tx.update(intentRef, { status: 'completed', leaseToken: null, leaseUntil: null });
          return { status: 'advanced' as const };
        }
        const deal = parseDeal(dealSnapshot.data(), current);
        if (!identities.locked || deal.readingDeadlineToken !== payload.deadlineToken) return { status: 'blocked' as const };
        if (current.seats.every(seat => seat.ready)) {
          const progress = FullSetupDocumentSchema.parse({ ...current, stage: 'running', revision: current.revision + 1 });
          launchPrepared(tx, base, control, progress, deal, bindings, now, context);
          return { status: 'advanced' as const };
        }
        // Minimum elapsed; missing human Ready remains the only gate. A later Ready can launch.
        tx.update(intentRef, { status: 'completed', leaseToken: null, leaseUntil: null });
        return { status: 'unchanged' as const };
      });
    } catch { return { status: 'failed' }; }
  }

  async function setPracticeBots(uid: string, payload: unknown): Promise<FullSetPracticeBotsResponse> {
    const fail = (code: Extract<FullSetPracticeBotsResponse, { ok: false }>['error']['code'], retryAfterMs?: number): FullSetPracticeBotsResponse =>
      FullSetPracticeBotsResponseSchema.parse({ schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: clock(),
        error: { code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) } });
    if (!uidSafe(uid)) return fail('UNAUTHENTICATED');
    if (payload !== null && typeof payload === 'object') {
      if ('protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) return fail('UNSUPPORTED_PROTOCOL');
      if ('schemaVersion' in payload && typeof payload.schemaVersion === 'number' && payload.schemaVersion !== 1) return fail('UNSUPPORTED_SCHEMA');
    }
    const parsed = FullSetPracticeBotsRequestSchema.safeParse(payload);
    if (!parsed.success) return fail('INVALID_REQUEST');
    const body = parsed.data, base = db.collection('matches').doc(body.matchId);
    const receiptRef = db.collection('practiceBotOperations').doc(hash([uid, body.requestId])), fingerprint = digest(body);
    // Memoize each new binding's draw for this invocation, even if Firestore retries.
    // Retained bots are read from storage and never use the randomizer.
    const newBotRooms = new Map<string, Room>();
    try {
      return await db.runTransaction(async tx => {
        // Recheck the current host before any cached acknowledgment, including after start.
        const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
        if (control?.protocolVersion !== 2 || control.hostUid !== uid) return fail('FORBIDDEN');
        const receipt = await tx.get(receiptRef);
        if (receipt.exists) return receipt.get('digest') === fingerprint
          ? FullSetPracticeBotsResponseSchema.parse({ ...receipt.get('response'), serverTimeMs: clock() }) : fail('REQUEST_ID_CONFLICT');
        const now = clock(), budget = await limit(tx, uid, 'setPracticeBots', now);
        if (!budget.allowed) return fail('RATE_LIMITED', budget.retryAfterMs);
        const bindings = await tx.get(base.collection('seats'));
        const identityRef = base.collection('identities').doc('public'), identitySnapshot = await tx.get(identityRef);
        const practiceRef = base.collection('practice').doc('public'), practiceSnapshot = await tx.get(practiceRef);
        const epochRef = base.collection('practice').doc('bindingEpochs'), epochSnapshot = await tx.get(epochRef);
        const current = practiceSnapshot.exists ? FullPracticeBotsDocumentSchema.parse(practiceSnapshot.data()) : practiceDocument(base.id);
        const setupRef = base.collection('setup').doc('public'), setupSnapshot = await tx.get(setupRef);
        const setupProgress = setupSnapshot.exists ? FullSetupDocumentSchema.parse(setupSnapshot.data()) : setupDocument(base.id, control.playerCount, bindings.docs);
        const identities = identitySnapshot.exists ? FullLobbyIdentityDocumentSchema.parse(identitySnapshot.data()) : identityDocument(base.id, bindings.docs);
        const oldBots = bindings.docs.filter(botBinding).sort((a, b) => a.id.localeCompare(b.id));
        const humans = bindings.docs.filter(doc => humanBinding(doc.data()));
        if (current.matchId !== base.id || identities.matchId !== base.id || oldBots.length + humans.length !== bindings.size
          || digest(current.botSeatIds) !== digest(oldBots.map(doc => doc.id)) || identities.seats.length !== bindings.size
          || !bindings.docs.every(doc => identities.seats.some(entry => entry.seatId === doc.id))) throw new Error('Invalid practice roster');
        let response: FullSetPracticeBotsResponse;
        let mutate: (() => void) | undefined;
        if (control.status !== 'lobby' || identities.locked) response = fail('LOBBY_LOCKED');
        else if (body.botCount + humans.length > control.playerCount) response = fail('CAPACITY_EXCEEDED');
        else {
          const kept = oldBots.slice(0, body.botCount), removed = oldBots.slice(body.botCount);
          const occupied = new Set([...humans, ...kept].map(doc => doc.id));
          const added: Array<{ seatId: SeatId; bindingRevision: number; initialRoom: Room }> = [];
          const epochs = { ...(epochSnapshot.get('revisions') as Record<string, number> | undefined ?? {}) };
          for (let n = 1; kept.length + added.length < body.botCount && n <= control.playerCount; n++) {
            const seatId = `seat-${n}` as SeatId;
            if (occupied.has(seatId)) continue;
            const previous = epochs[seatId] ?? 0;
            if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid binding epoch');
            epochs[seatId] = previous + 1;
            const bindingRevision = previous + 1, roomKey = `${seatId}:${bindingRevision}`;
            if (!newBotRooms.has(roomKey)) newBotRooms.set(roomKey, drawInitialRoom());
            added.push({ seatId, bindingRevision, initialRoom: newBotRooms.get(roomKey)! });
          }
          const botSeatIds = [...kept.map(doc => doc.id as SeatId), ...added.map(entry => entry.seatId)].sort();
          const changed = digest(botSeatIds) !== digest(current.botSeatIds);
          const next = FullPracticeBotsDocumentSchema.parse({ ...current, revision: current.revision + (changed ? 1 : 0), botSeatIds });
          const removedIds = new Set(removed.map(doc => doc.id));
          const identitySeats = identities.seats.filter(entry => !removedIds.has(entry.seatId));
          const usedCharacters = new Set(identitySeats.map(entry => entry.characterId));
          const usedNames = new Set(identitySeats.map(entry => entry.displayName));
          for (const entry of added) {
            const characterId = Array.from({ length: 9 }, (_, i) => `c${i + 1}`).find(candidate => !usedCharacters.has(CrewCharacterIdSchema.parse(candidate)));
            if (characterId === undefined) throw new Error('No free public character');
            let displayName = `Bot ${entry.seatId.slice(5)}`, suffix = 1;
            while (usedNames.has(displayName)) displayName = `Bot ${entry.seatId.slice(5)}-${++suffix}`;
            usedNames.add(displayName); usedCharacters.add(CrewCharacterIdSchema.parse(characterId));
            identitySeats.push({ seatId: entry.seatId, displayName, characterId: CrewCharacterIdSchema.parse(characterId) });
          }
          const nextIdentity = FullLobbyIdentityDocumentSchema.parse({ ...identities, revision: identities.revision + (changed ? 1 : 0),
            seats: identitySeats.sort((a, b) => a.seatId.localeCompare(b.seatId)) });
          const nextLobby = FullLobbyViewSchema.parse({ ...lobby(base, control, [...humans, ...kept]),
            seats: [...humans, ...kept].map(doc => ({ seatId: doc.id, initialRoom: doc.get('initialRoom') }))
              .concat(added.map(entry => ({ seatId: entry.seatId, initialRoom: entry.initialRoom }))).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
          response = FullSetPracticeBotsResponseSchema.parse({ schemaVersion: 1, protocolVersion: 2, ok: true,
            serverTimeMs: now, matchId: body.matchId, requestId: body.requestId, revision: next.revision, botSeatIds });
          mutate = () => {
            for (const doc of removed) { tx.delete(doc.ref); tx.delete(base.collection('recovery').doc(doc.id)); }
            for (const entry of added) tx.create(base.collection('seats').doc(entry.seatId), {
              controller: 'bot', bindingRevision: entry.bindingRevision, initialRoom: entry.initialRoom });
            if (changed || !practiceSnapshot.exists) tx.set(practiceRef, next);
            if (changed || !identitySnapshot.exists) tx.set(identityRef, nextIdentity);
            if (changed || !setupSnapshot.exists) tx.set(setupRef, FullSetupDocumentSchema.parse({ ...setupProgress,
              stage: 'lobby', dealId: null, revision: setupProgress.revision + (changed ? 1 : 0),
              seats: nextLobby.seats.map(seat => ({ seatId: seat.seatId, confirmed: false, ready: false })) }));
            if (changed) { tx.set(epochRef, { revisions: epochs }); tx.set(base.collection('lobby').doc('public'), nextLobby); }
          };
        }
        tx.set(budget.ref, budget.data); mutate?.();
        tx.create(receiptRef, { verifiedUid: uid, matchId: body.matchId, digest: fingerprint, response, evaluatedAt: now });
        return response;
      });
    } catch { return fail('UNAVAILABLE'); }
  }
  /** Bounded, durable commands. Policy receives one strict authorized player projection only. */
  async function runPracticeBots(matchId: string, options: { limit: number }): Promise<{ status: 'advanced' | 'unchanged' | 'failed' | 'blocked'; processed: number }> {
    if (!id(matchId) || !Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 18) return { status: 'blocked', processed: 0 };
    let processed = 0;
    for (; processed < options.limit; processed++) {
      const base = db.collection('matches').doc(matchId), eventId = newId(), nextPhaseId = newId(), nextDeadlineToken = newId();
      try {
        const result = await db.runTransaction(async tx => {
          const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
          if (control?.protocolVersion !== 2 || control.status !== 'running') return 'unchanged' as const;
          const practiceSnapshot = await tx.get(base.collection('practice').doc('public'));
          if (!practiceSnapshot.exists) return 'unchanged' as const;
          const practice = FullPracticeBotsDocumentSchema.parse(practiceSnapshot.data());
          if (practice.matchId !== matchId) return 'blocked' as const;
          if (practice.botSeatIds.length === 0) return 'unchanged' as const;
          const snapshot = await tx.get(base.collection('engine').doc('current'));
          if (!snapshot.exists) return 'blocked' as const;
          const state = decodeV1State(snapshot.data());
          if (!supported(state)) return 'blocked' as const;
          const now = clock();
          if (state.phase.endsAt === null || now < state.phase.startedAt || now >= state.phase.endsAt) return 'unchanged' as const;
          const bindings = await tx.get(base.collection('seats'));
          const bots = bindings.docs.filter(botBinding).sort((a, b) => a.id.localeCompare(b.id));
          if (digest(practice.botSeatIds) !== digest(bots.map(doc => doc.id))) return 'blocked' as const;
          for (const binding of bots) {
            const actorSeatId = binding.id as SeatId;
            const view = FullPlayerViewSchema.parse(projectFullGame(state).players[actorSeatId]);
            for (const command of choosePracticeBotActions(view)) {
              // One deterministic slot per command type and phase; changing observations cannot create a retry with new intent.
              const commandId = hash([PRACTICE_BOT_POLICY_VERSION, matchId, state.phase.id, actorSeatId, command.type]);
              const receiptRef = base.collection('receipts').doc(hash([actorSeatId, commandId]));
              if ((await tx.get(receiptRef)).exists) continue;
              const request = FullCommandRequestSchema.parse({ protocolVersion: 2, matchId, phaseId: state.phase.id, commandId, command });
              const evaluated = executeFullGame(state, actorSeatId, request, { now, nextPhaseId, nextDeadlineToken });
              const receipt = FullReceiptSchema.parse(evaluated.receipt), after = { ...evaluated.state, journalSequence: state.journalSequence + 1 };
              tx.create(receiptRef, { actorSeatId, controller: 'bot', policyVersion: PRACTICE_BOT_POLICY_VERSION, digest: digest(request), receipt, evaluatedAt: now });
              tx.create(base.collection('events').doc(eventId), { journalVersion: 1, sequence: after.journalSequence, kind: 'COMMAND', request,
                actorSeatId, controller: 'bot', policyVersion: PRACTICE_BOT_POLICY_VERSION, now, nextPhaseId, nextDeadlineToken, receipt });
              if (receipt.status === 'accepted') writeGame(tx, state, after, bindings.docs, eventId, { actorSeatId, commandId });
              else tx.set(base.collection('engine').doc('current'), encodeV1State(after));
              return 'advanced' as const;
            }
          }
          return 'unchanged' as const;
        });
        if (result !== 'advanced') return { status: result === 'unchanged' && processed > 0 ? 'advanced' : result, processed };
      } catch { return { status: 'failed', processed }; }
    }
    return { status: 'advanced', processed };
  }

  async function setLobbyIdentity(uid: string, payload: unknown): Promise<FullSetLobbyIdentityResponse> {
    const fail = (code: Extract<FullSetLobbyIdentityResponse, { ok: false }>['error']['code'], retryAfterMs?: number): FullSetLobbyIdentityResponse =>
      FullSetLobbyIdentityResponseSchema.parse({ schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: clock(),
        error: { code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) } });
    if (!uidSafe(uid)) return fail('UNAUTHENTICATED');
    if (payload !== null && typeof payload === 'object') {
      if ('protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) return fail('UNSUPPORTED_PROTOCOL');
      if ('schemaVersion' in payload && typeof payload.schemaVersion === 'number' && payload.schemaVersion !== 1) return fail('UNSUPPORTED_SCHEMA');
    }
    const parsed = FullSetLobbyIdentityRequestSchema.safeParse(payload);
    if (!parsed.success) return fail('INVALID_REQUEST');
    const body = parsed.data, base = db.collection('matches').doc(body.matchId);
    const receiptRef = db.collection('lobbyIdentityOperations').doc(hash([uid, body.requestId]));
    const fingerprint = digest(body);
    try {
      return await db.runTransaction(async tx => {
        // Authorization precedes receipt replay: a displaced identity cannot recover an old acknowledgment.
        const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
        const actor = await activePlayer(tx, base, uid);
        if (control?.protocolVersion !== 2 || actor === null) return fail('FORBIDDEN');
        const receipt = await tx.get(receiptRef);
        if (receipt.exists) {
          if (receipt.get('digest') !== fingerprint || receipt.get('seatId') !== actor.seatId) return fail('REQUEST_ID_CONFLICT');
          return FullSetLobbyIdentityResponseSchema.parse({ ...receipt.get('response'), serverTimeMs: clock() });
        }
        const now = clock(), budget = await limit(tx, uid, 'setLobbyIdentity', now);
        if (!budget.allowed) return fail('RATE_LIMITED', budget.retryAfterMs);
        const identityRef = base.collection('identities').doc('public');
        const snapshot = await tx.get(identityRef);
        const bindings = await tx.get(base.collection('seats'));
        const current = snapshot.exists ? FullLobbyIdentityDocumentSchema.parse(snapshot.data())
          : identityDocument(base.id, bindings.docs);
        if (current.matchId !== base.id) throw new Error('Invalid identity context');
        const setupRef = base.collection('setup').doc('public'), setupSnapshot = await tx.get(setupRef);
        const progress = setupSnapshot.exists ? FullSetupDocumentSchema.parse(setupSnapshot.data()) : null;
        const identity = current.seats.find(entry => entry.seatId === actor.seatId);
        if (identity === undefined || current.seats.length !== bindings.size) throw new Error('Invalid identity roster');
        let response: FullSetLobbyIdentityResponse;
        let next: FullLobbyIdentityDocument | undefined;
        if (control.status !== 'choosing' || control.lifecycleVersion !== SETUP_LIFECYCLE_VERSION || progress?.stage !== 'choosing' || current.locked || now >= progress.choosingEndsAt!) response = fail('IDENTITY_LOCKED');
        else if (current.seats.some(entry => entry.seatId !== actor.seatId && entry.characterId === body.characterId)) response = fail('CHARACTER_TAKEN');
        else {
          const changed = identity.displayName !== body.displayName || identity.characterId !== body.characterId;
          next = changed ? FullLobbyIdentityDocumentSchema.parse({ ...current, revision: current.revision + 1,
            seats: current.seats.map(entry => entry.seatId === actor.seatId ? { seatId: entry.seatId, displayName: body.displayName, characterId: body.characterId } : entry) }) : current;
          response = FullSetLobbyIdentityResponseSchema.parse({ schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: now, revision: next.revision });
        }
        tx.set(budget.ref, budget.data);
        if (next !== undefined && (!snapshot.exists || next !== current)) {
          tx.set(identityRef, next);
          if (progress !== null) tx.set(setupRef, FullSetupDocumentSchema.parse({ ...progress, revision: progress.revision + 1,
            seats: progress.seats.map(seat => seat.seatId === actor.seatId ? { ...seat, confirmed: false } : seat) }));
        }
        // Authorized taken/locked outcomes are durable, too. A new intent needs a new request ID.
        tx.create(receiptRef, { verifiedUid: uid, seatId: actor.seatId, matchId: base.id, digest: fingerprint, response, evaluatedAt: now });
        return response;
      });
    } catch { return fail('UNAVAILABLE'); }
  }

  async function admitDisplay(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullAdmitDisplayRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string);
    return operation(uid, body, 'admitDisplay', async (tx, now) => {
      const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
      const memberRef = base.collection('members').doc(body['displayUid'] as string), member = await tx.get(memberRef);
      if (control?.hostUid !== uid || ['complete', 'aborted'].includes(control.status) || member.get('kind') === 'player') return failure('FORBIDDEN');
      return { response: success(now, { admitted: true }), write: () => { tx.set(memberRef, { kind: 'display' }); } };
    });
  }
  async function startMatch(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullStartMatchRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string);
    try {
      return await db.runTransaction(async tx => {
        const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
        if (control?.protocolVersion !== 2 || control.hostUid !== uid) return failure('FORBIDDEN');
        const receipt = await tx.get(db.collection('identityOperations').doc(hash([uid, body['requestId']])));
        if (!receipt.exists) return failure('FORBIDDEN');
        if (receipt.get('digest') !== digest(['startMatch', body])) return failure('COMMAND_ID_CONFLICT');
        return FullOperationResponseSchema.parse({ ...receipt.get('response'), serverTimeMs: clock() });
      });
    } catch { return failure('UNAVAILABLE'); }
  }

  async function submit(uid: string, payload: unknown) {
    if (!uidSafe(uid)) return failure('UNAUTHENTICATED');
    if (payload !== null && typeof payload === 'object' && 'protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 2) return failure('UNSUPPORTED_PROTOCOL');
    const parsed = FullCommandRequestSchema.safeParse(payload);
    if (!parsed.success) return failure('INVALID_REQUEST');
    const request: FullCommandRequest = parsed.data, fingerprint = digest(request), eventId = newId(), nextPhaseId = newId(), nextDeadlineToken = newId();
    const base = db.collection('matches').doc(request.matchId);
    try {
      return await db.runTransaction(async tx => {
        const actor = await activePlayer(tx, base, uid);
        if (actor === null) return failure('FORBIDDEN');
        const receiptRef = base.collection('receipts').doc(hash([actor.seatId, request.commandId])), stored = await tx.get(receiptRef);
        if (stored.exists) return stored.get('digest') === fingerprint
          ? { ok: true as const, serverTimeMs: clock(), receipt: FullReceiptSchema.parse(stored.get('receipt')) } : failure('COMMAND_ID_CONFLICT');
        const budget = await limit(tx, uid, 'submit', clock());
        if (!budget.allowed) return failure('RATE_LIMITED', budget.retryAfterMs);
        const snapshot = await tx.get(base.collection('engine').doc('current'));
        if (!snapshot.exists) return failure('FORBIDDEN');
        const state = decodeV1State(snapshot.data());
        if (!supported(state)) return failure('UNSUPPORTED_PROTOCOL');
        const bindings = await tx.get(base.collection('seats'));
        const now = clock(), evaluated = executeFullGame(state, actor.seatId, request, { now, nextPhaseId, nextDeadlineToken });
        const receipt: FullReceipt = FullReceiptSchema.parse(evaluated.receipt), after = { ...evaluated.state, journalSequence: state.journalSequence + 1 };
        tx.set(budget.ref, budget.data);
        tx.create(receiptRef, { actorSeatId: actor.seatId, verifiedUid: uid, digest: fingerprint, receipt, evaluatedAt: now });
        tx.create(base.collection('events').doc(eventId), { journalVersion: 1, sequence: after.journalSequence, kind: 'COMMAND', request,
          actorSeatId: actor.seatId, verifiedUid: uid, now, nextPhaseId, nextDeadlineToken, receipt });
        if (receipt.status === 'accepted') writeGame(tx, state, after, bindings.docs, eventId, { actorSeatId: actor.seatId, commandId: request.commandId });
        else tx.set(base.collection('engine').doc('current'), encodeV1State(after));
        return { ok: true as const, serverTimeMs: now, receipt };
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  async function lookup(uid: string, payload: unknown) {
    const body = envelope(uid, payload, FullLookupRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string);
    try {
      return await db.runTransaction(async tx => {
        const actor = await activePlayer(tx, base, uid);
        if (actor === null) return failure('FORBIDDEN');
        const budget = await limit(tx, uid, 'lookup', clock());
        if (!budget.allowed) return failure('RATE_LIMITED', budget.retryAfterMs);
        const receipt = await tx.get(base.collection('receipts').doc(hash([actor.seatId, body['commandId']])));
        tx.set(budget.ref, budget.data);
        return receipt.exists ? { status: 'found' as const, serverTimeMs: clock(), receipt: FullReceiptSchema.parse(receipt.get('receipt')) }
          : { status: 'unknown' as const, serverTimeMs: clock() };
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  async function transition(matchId: string, phaseId: string, deadlineToken: string | null, uid: string | null) {
    const base = db.collection('matches').doc(matchId), nextPhaseId = newId(), nextDeadlineToken = newId(), eventId = newId();
    try {
      return await db.runTransaction(async tx => {
        if (uid !== null && !await admitted(tx, base, uid)) return failure('FORBIDDEN');
        const budget = uid === null ? null : await limit(tx, uid, 'advance', clock());
        if (budget !== null && !budget.allowed) return failure('RATE_LIMITED', budget.retryAfterMs);
        const snapshot = await tx.get(base.collection('engine').doc('current'));
        if (!snapshot.exists) return uid === null ? { protocolVersion: 2 as const, matchId, phaseId, serverTimeMs: clock(), result: 'unchanged' as const } : failure('FORBIDDEN');
        const state = decodeV1State(snapshot.data());
        if (!supported(state)) return failure('UNSUPPORTED_PROTOCOL');
        const bindings = await tx.get(base.collection('seats'));
        const now = clock(), context = { now, phaseId, deadlineToken: deadlineToken ?? state.deadlineToken ?? '', nextPhaseId, nextDeadlineToken };
        const evaluated = advanceFullGame(state, context);
        if (budget !== null) tx.set(budget.ref, budget.data);
        if (evaluated.advanced) {
          const after = { ...evaluated.state, journalSequence: state.journalSequence + 1 };
          writeGame(tx, state, after, bindings.docs, eventId);
          tx.create(base.collection('events').doc(eventId), { journalVersion: 1, sequence: after.journalSequence, kind: 'DEADLINE', ...context });
        }
        return { protocolVersion: 2 as const, matchId, phaseId, serverTimeMs: now, result: evaluated.advanced ? 'advanced' as const : 'unchanged' as const };
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  async function advance(uid: string, payload: unknown) {
    const body = envelope(uid, payload, FullAdvanceRequestSchema);
    return isFailure(body) ? body : transition(body['matchId'] as string, body['phaseId'] as string, null, uid);
  }
  async function runDeadline(payload: { matchId: string; phaseId: string; deadlineToken: string }) {
    return safeBody(payload, ['matchId', 'phaseId', 'deadlineToken']) && [payload.matchId, payload.phaseId, payload.deadlineToken].every(id)
      ? transition(payload.matchId, payload.phaseId, payload.deadlineToken, null) : failure('INVALID_REQUEST');
  }
  async function serverTime(uid: string, payload: unknown) {
    const body = envelope(uid, payload, FullServerTimeRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string);
    try {
      return await db.runTransaction(async tx => {
        if (!await admitted(tx, base, uid)) return failure('FORBIDDEN');
        const now = clock(), budget = await limit(tx, uid, 'serverTime', now);
        if (!budget.allowed) return failure('RATE_LIMITED', budget.retryAfterMs);
        tx.set(budget.ref, budget.data);
        return { protocolVersion: 2 as const, serverTimeMs: now };
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  async function abortMatch(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullAbortMatchRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string), eventId = newId(), nextPhaseId = newId(), nextDeadlineToken = newId();
    return operation(uid, body, 'abortMatch', async (tx, now) => {
      const controlRef = base.collection('control').doc('session'), control = (await tx.get(controlRef)).data() as Control | undefined;
      if (control?.hostUid !== uid || ['complete', 'aborted'].includes(control.status)) return failure('FORBIDDEN');
      const snapshot = await tx.get(base.collection('engine').doc('current')), bindings = await tx.get(base.collection('seats'));
      const identityRef = base.collection('identities').doc('public'), identitySnapshot = await tx.get(identityRef);
      const currentIdentity = identitySnapshot.exists ? FullLobbyIdentityDocumentSchema.parse(identitySnapshot.data()) : null;
      if (currentIdentity !== null && currentIdentity.matchId !== base.id) return failure('UNAVAILABLE');
      const setupRef = base.collection('setup').doc('public'), setupSnapshot = await tx.get(setupRef);
      const setupProgress = setupSnapshot.exists ? FullSetupDocumentSchema.parse(setupSnapshot.data()) : null;
      const before = snapshot.exists ? decodeV1State(snapshot.data()) : null;
      if (before !== null && !supported(before)) return failure('UNSUPPORTED_PROTOCOL');
      const after = before === null ? null : { ...abortFullGame(before, { now, nextPhaseId, nextDeadlineToken }), journalSequence: before.journalSequence + 1 };
      return { response: success(now, { aborted: true }), write: () => {
        tx.update(controlRef, { status: 'aborted' });
        if (setupProgress !== null) tx.set(setupRef, FullSetupDocumentSchema.parse({ ...setupProgress, stage: 'aborted', revision: setupProgress.revision + 1 }));
        for (const binding of bindings.docs.filter(binding => humanBinding(binding.data()))) tx.delete(base.collection('setupPlayerViews').doc(binding.get('uid') as string));
        if (currentIdentity !== null && !currentIdentity.locked) tx.set(identityRef, FullLobbyIdentityDocumentSchema.parse({ ...currentIdentity, locked: true, revision: currentIdentity.revision + 1 }));
        tx.set(base.collection('lobby').doc('public'), lobby(base, { ...control, status: 'aborted' }, bindings.docs));
        if (after !== null) {
          writeGame(tx, before, after, bindings.docs, eventId);
          tx.create(base.collection('events').doc(eventId), { journalVersion: 1, sequence: after.journalSequence, kind: 'ABORT', verifiedUid: uid, now, nextPhaseId, nextDeadlineToken });
        }
      } };
    });
  }
  async function issueSeatRecovery(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullIssueSeatRecoveryRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string), seatId = body['seatId'] as SeatId;
    const recoveryToken = randomBytes(32).toString('base64url');
    return operation(uid, body, 'issueSeatRecovery', async (tx, now) => {
      const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
      const binding = await tx.get(base.collection('seats').doc(seatId));
      if (control?.hostUid !== uid || !binding.exists || !humanBinding(binding.data()) || control.status === 'aborted') return failure('FORBIDDEN');
      const expiresAt = now + 600_000, safeResult = { issued: true as const, seatId, recoveryToken: null, expiresAt };
      return { response: success(now, { ...safeResult, recoveryToken }), replayResponse: success(now, safeResult), write: () => {
        tx.set(base.collection('recovery').doc(seatId), { tokenDigest: hash([base.id, seatId, recoveryToken]), expiresAt,
          bindingRevision: binding.get('bindingRevision'), issuedByUid: uid, consumed: false });
      } };
    });
  }
  async function redeemSeatRecovery(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullRedeemSeatRecoveryRequestSchema);
    if (isFailure(body)) return body;
    const base = db.collection('matches').doc(body['matchId'] as string), auditId = newId();
    // Fingerprint is hashed; no raw token is stored in operation receipts or journals.
    return operation(uid, body, 'redeemSeatRecovery', async (tx, now) => {
      const controlRef = base.collection('control').doc('session'), control = (await tx.get(controlRef)).data() as Control | undefined;
      const membershipRef = base.collection('members').doc(uid), existing = await tx.get(membershipRef);
      const grants = await tx.get(base.collection('recovery'));
      const grant = grants.docs.find(doc => doc.get('tokenDigest') === hash([base.id, doc.id, body['recoveryToken']]));
      if (control?.protocolVersion !== 2 || control.status === 'aborted' || existing.get('kind') === 'player' || grant === undefined
        || grant.get('consumed') !== false || now >= (grant.get('expiresAt') as number) || !seat(grant.id)) return failure('FORBIDDEN');
      const bindingRef = base.collection('seats').doc(grant.id), binding = await tx.get(bindingRef), oldUid = binding.get('uid') as unknown;
      if (!humanBinding(binding.data()) || !uidSafe(oldUid) || binding.get('bindingRevision') !== grant.get('bindingRevision') || oldUid === uid) return failure('FORBIDDEN');
      const snapshot = await tx.get(base.collection('engine').doc('current'));
      const state = snapshot.exists ? decodeV1State(snapshot.data()) : null;
      if (state !== null && !supported(state)) return failure('UNSUPPORTED_PROTOCOL');
      const view = state === null ? null : projectFullGame(state).players[grant.id];
      const setupRef = base.collection('setup').doc('public'), setupSnapshot = await tx.get(setupRef);
      const progress = setupSnapshot.exists ? FullSetupDocumentSchema.parse(setupSnapshot.data()) : null;
      const dealSnapshot = await tx.get(base.collection('setup').doc('deal'));
      const prepared = state === null && progress?.stage === 'awaiting-ready' ? parseDeal(dealSnapshot.data(), progress) : null;
      const ownProgress = progress?.seats.find(seat => seat.seatId === grant.id);
      if (prepared !== null && (control.status !== 'awaiting-ready' || ownProgress === undefined || !ownProgress.confirmed)) return failure('FORBIDDEN');
      const bindingRevision = (binding.get('bindingRevision') as number) + 1;
      return { response: success(now, { recovered: true, seatId: grant.id }), write: () => {
        tx.update(bindingRef, { uid, bindingRevision });
        tx.set(membershipRef, { kind: 'player', seatId: grant.id, bindingRevision });
        tx.delete(base.collection('members').doc(oldUid)); tx.delete(base.collection('playerViews').doc(oldUid));
        tx.delete(base.collection('ownAcknowledgments').doc(oldUid)); tx.delete(base.collection('seatSessions').doc(oldUid));
        tx.delete(base.collection('setupPlayerViews').doc(oldUid));
        if (prepared !== null) {
          tx.set(base.collection('setupPlayerViews').doc(uid), setupPreview(base.id, prepared, binding, bindingRevision));
          if (ownProgress!.ready) tx.set(setupRef, FullSetupDocumentSchema.parse({ ...progress!, revision: progress!.revision + 1,
            seats: progress!.seats.map(seat => seat.seatId === grant.id ? { ...seat, ready: false } : seat) }));
        }
        tx.set(base.collection('seatSessions').doc(uid), SeatSessionSchema.parse({ schemaVersion: 1, protocolVersion: 2, matchId: base.id, seatId: grant.id, bindingRevision }));
        if (state !== null) tx.set(base.collection('ownAcknowledgments').doc(uid), OwnAcknowledgmentsSchema.parse(projectOwnAcknowledgments(state, grant.id as SeatId, bindingRevision)));
        if (view !== null && view !== undefined) { FullPlayerViewSchema.parse(view); tx.set(base.collection('playerViews').doc(uid), view); }
        tx.update(grant.ref, { consumed: true, redeemedByUid: uid, redeemedAt: now });
        tx.create(base.collection('identityAudit').doc(auditId), { kind: 'SEAT_RECOVERY', seatId: grant.id, previousUid: oldUid, currentUid: uid, bindingRevision, evaluatedAt: now });
        if (control.hostUid === oldUid) tx.update(controlRef, { hostUid: uid });
      } };
    });
  }

  async function dispatchSetupDeadlineIntent(path: string, enqueue: EnqueueV1SetupDeadline): Promise<{ status: 'dispatched' | 'unchanged' | 'failed' | 'blocked' }> {
    if (!validSetupOutboxPath(path)) return { status: 'blocked' };
    const ref = db.doc(path), leaseToken = newId();
    let claimed: SetupOutboxRecord | 'blocked' | null;
    try {
      claimed = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return null;
        const value = snapshot.data() as SetupOutboxRecord, now = clock();
        if (!validSetupIntent(value, path)) {
          tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null }); return 'blocked' as const;
        }
        if (!['pending', 'leased'].includes(value.status) || value.nextAttemptAt > now
          || (value.status === 'leased' && (value.leaseUntil ?? 0) > now)) return null;
        const next: SetupOutboxRecord = { ...value, status: 'leased', attempts: value.attempts + 1,
          nextAttemptAt: now + 30_000, leaseUntil: now + 30_000, leaseToken };
        tx.set(ref, next); return next;
      });
    } catch { return { status: 'failed' }; }
    if (claimed === 'blocked') return { status: 'blocked' };
    if (claimed === null) return { status: 'unchanged' };
    try {
      await enqueue({ protocolVersion: 2, kind: 'SETUP_DEADLINE', matchId: claimed.matchId, setupId: claimed.setupId,
        stage: claimed.stage, deadlineToken: claimed.deadlineToken, dueAt: claimed.dueAt, taskId: claimed.taskId, status: 'pending' });
      const acknowledged = await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (current.get('status') !== 'leased' || current.get('leaseToken') !== leaseToken) return false;
        tx.update(ref, { status: 'dispatched', nextAttemptAt: claimed!.dueAt, leaseToken: null, leaseUntil: null }); return true;
      });
      return { status: acknowledged ? 'dispatched' : 'unchanged' };
    } catch {
      try {
        await db.runTransaction(async tx => {
          const current = await tx.get(ref);
          if (current.get('status') === 'leased' && current.get('leaseToken') === leaseToken) tx.update(ref,
            { status: 'pending', leaseToken: null, leaseUntil: null,
              nextAttemptAt: clock() + Math.min(60_000, 1_000 * 2 ** Math.min(claimed!.attempts, 6)) });
        });
      } catch { /* The durable lease expires and remains eligible for bounded repair. */ }
      return { status: 'failed' };
    }
  }
  async function repairSetupOutbox(enqueue: EnqueueV1SetupDeadline, options: { limit: number; cursor?: string }) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error('Repair page limit must be 1..100');
    let query = db.collectionGroup('setupOutbox').where('protocolVersion', '==', 2).where('status', 'in', ['pending', 'leased', 'dispatched'])
      .where('nextAttemptAt', '<=', clock()).orderBy('nextAttemptAt').orderBy(FieldPath.documentId()).limit(options.limit);
    if (options.cursor !== undefined) {
      let cursor: { time: number; path: string };
      try { cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { time: number; path: string }; }
      catch { throw new Error('Invalid setup repair cursor'); }
      if (!Number.isSafeInteger(cursor.time) || !validSetupOutboxPath(cursor.path)) throw new Error('Invalid setup repair cursor');
      query = query.startAfter(cursor.time, db.doc(cursor.path));
    }
    const pending = await query.get(), counts = { dispatched: 0, failed: 0, unchanged: 0, blocked: 0 };
    for (const entry of pending.docs) {
      const value = entry.data() as SetupOutboxRecord;
      if (validSetupIntent(value, entry.ref.path) && value.dueAt <= clock()) {
        // Repair already-dispatched-but-lost tasks too; queue tombstones cannot suppress a due transition.
        const result = await runSetupDeadline({ matchId: value.matchId, setupId: value.setupId, stage: value.stage, deadlineToken: value.deadlineToken });
        if (result.status === 'failed') counts.failed++;
        else if (result.status === 'blocked') {
          await db.runTransaction(async tx => {
            const latest = await tx.get(entry.ref);
            if (['pending', 'leased', 'dispatched'].includes(latest.get('status'))) tx.update(entry.ref, { status: 'blocked', leaseToken: null, leaseUntil: null });
          }); counts.blocked++;
        } else counts.unchanged++;
      } else counts[(await dispatchSetupDeadlineIntent(entry.ref.path, enqueue)).status]++;
    }
    const last = pending.docs.at(-1);
    return { ...counts, nextCursor: pending.size === options.limit && last !== undefined
      ? Buffer.from(JSON.stringify({ time: last.get('nextAttemptAt'), path: last.ref.path })).toString('base64url') : null };
  }

  async function dispatchDeadlineIntent(path: string, enqueue: EnqueueV1Deadline): Promise<{ status: 'dispatched' | 'unchanged' | 'failed' | 'blocked' }> {
    if (!validOutboxPath(path)) return { status: 'blocked' };
    const ref = db.doc(path), leaseToken = newId();
    let claimed: OutboxRecord | 'blocked' | null;
    try {
      claimed = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return null;
        const value = snapshot.data() as OutboxRecord;
        const now = clock();
        if (!validDeadlineIntent(value, path)) {
          tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null }); return 'blocked' as const;
        }
        if (!['pending', 'leased'].includes(value.status) || value.nextAttemptAt > now || (value.status === 'leased' && (value.leaseUntil ?? 0) > now)) return null;
        const next: OutboxRecord = { ...value, status: 'leased', attempts: value.attempts + 1, leaseToken,
          leaseUntil: now + 30_000, nextAttemptAt: now + 30_000 };
        tx.set(ref, next); return next;
      });
    } catch { return { status: 'failed' }; }
    if (claimed === 'blocked') return { status: 'blocked' };
    if (claimed === null) return { status: 'unchanged' };
    try {
      await enqueue({ protocolVersion: 2, matchId: claimed.matchId, phaseId: claimed.phaseId, deadlineToken: claimed.deadlineToken,
        endsAt: claimed.endsAt, taskId: claimed.taskId, status: 'pending' });
      const acknowledged = await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (current.get('status') !== 'leased' || current.get('leaseToken') !== leaseToken) return false;
        tx.update(ref, { status: 'dispatched', nextAttemptAt: claimed!.endsAt, leaseToken: null, leaseUntil: null }); return true;
      });
      return { status: acknowledged ? 'dispatched' : 'unchanged' };
    } catch {
      try {
        await db.runTransaction(async tx => {
          const current = await tx.get(ref);
          if (current.get('status') === 'leased' && current.get('leaseToken') === leaseToken) tx.update(ref, { status: 'pending', leaseToken: null, leaseUntil: null,
            nextAttemptAt: clock() + Math.min(60_000, 1_000 * 2 ** Math.min(claimed!.attempts, 6)) });
        });
      } catch { /* An unacknowledged lease is durable and repairable after its expiry. */ }
      return { status: 'failed' };
    }
  }
  async function repairDispatchedDeadline(path: string): Promise<{ status: 'unchanged' | 'failed' | 'blocked' }> {
    const ref = db.doc(path);
    // Failed bot work must retain the old intent even after its deadline committed.
    // A later stale evaluation can then reconcile the current phase's bot receipts.
    async function defer(status: 'failed' | 'blocked') {
      try {
        await db.runTransaction(async tx => {
          const latest = await tx.get(ref);
          if (latest.get('status') !== 'dispatched') return;
          if (status === 'blocked') tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null });
          else {
            const recorded = latest.get('attempts') as unknown;
            const attempts = typeof recorded === 'number' && Number.isSafeInteger(recorded) && recorded >= 0 && recorded < Number.MAX_SAFE_INTEGER
              ? recorded + 1 : 1;
            tx.update(ref, { attempts, nextAttemptAt: clock() + Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6)) });
          }
        });
      } catch { /* An unacknowledged repair remains eligible for the next bounded page. */ }
      return { status };
    }
    try {
      const candidate = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists || snapshot.get('status') !== 'dispatched') return null;
        const value = snapshot.data() as OutboxRecord, now = clock();
        if (!validDeadlineIntent(value, path)) {
          tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null }); return 'blocked' as const;
        }
        if (value.nextAttemptAt > now) return null;
        const engine = await tx.get(db.collection('matches').doc(value.matchId).collection('engine').doc('current'));
        if (engine.exists) {
          const state = decodeV1State(engine.data());
          if (state.matchId !== value.matchId || !supported(state)
            || (state.phase.id === value.phaseId && state.deadlineToken === value.deadlineToken && state.phase.endsAt !== value.endsAt)) {
            tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null }); return 'blocked' as const;
          }
        }
        // Saved pre-fix dispatcher acknowledgments used the lease timestamp.
        // Move those early records out of first pages without advancing or bots.
        if (now < value.endsAt) { tx.update(ref, { nextAttemptAt: value.endsAt }); return null; }
        return value;
      });
      if (candidate === 'blocked') return { status: 'blocked' };
      if (candidate === null) return { status: 'unchanged' };
      const result = await runDeadline({ matchId: candidate.matchId, phaseId: candidate.phaseId, deadlineToken: candidate.deadlineToken });
      if (isFailure(result)) return defer(result.error.code === 'UNAVAILABLE' ? 'failed' : 'blocked');
      // A nine-bot election can have 19 real slots (movement, votes and Code).
      // Drain at most two bounded batches, retaining a durable continuation if
      // concurrency exposes more work. No engine-write trigger is assumed here.
      let saturated = true;
      for (let batch = 0; batch < 2; batch++) {
        const bots = await runPracticeBots(candidate.matchId, { limit: 18 });
        if (bots.status === 'failed') return defer('failed');
        if (bots.status === 'blocked') return defer('blocked');
        if (bots.processed < 18) { saturated = false; break; }
      }
      if (saturated) return defer('failed');
      const retired = await db.runTransaction(async tx => {
        const latest = await tx.get(ref);
        if (latest.get('status') !== 'dispatched') return 'unchanged' as const;
        const value = latest.data() as OutboxRecord;
        const engine = await tx.get(db.collection('matches').doc(candidate.matchId).collection('engine').doc('current'));
        const state = engine.exists ? decodeV1State(engine.data()) : null;
        if (!validDeadlineIntent(value, path) || (state !== null && (state.matchId !== candidate.matchId || !supported(state)))) {
          tx.update(ref, { status: 'blocked', leaseToken: null, leaseUntil: null }); return 'blocked' as const;
        }
        // A duplicate/PASS/task winner may already have installed a fresh phase.
        // Never complete a still-current deadline (for example a regressed clock).
        if (state !== null && state.phase.id === value.phaseId && state.deadlineToken === value.deadlineToken) {
          tx.update(ref, { nextAttemptAt: state.phase.endsAt ?? clock() + 60_000 }); return 'unchanged' as const;
        }
        tx.update(ref, { status: 'completed', leaseToken: null, leaseUntil: null }); return 'unchanged' as const;
      });
      // Existing repair counters describe enqueue attempts; direct evaluation
      // does not enqueue a task and preserves that result shape.
      return { status: retired };
    } catch { return defer('failed'); }
  }
  async function repairOutbox(enqueue: EnqueueV1Deadline, options: { limit: number; cursor?: string }) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error('Repair page limit must be 1..100');
    let query = db.collectionGroup('outbox').where('protocolVersion', '==', 2).where('status', 'in', ['pending', 'leased', 'dispatched'])
      .where('nextAttemptAt', '<=', clock()).orderBy('nextAttemptAt').orderBy(FieldPath.documentId()).limit(options.limit);
    if (options.cursor !== undefined) {
      let cursor: { time: number; path: string };
      try { cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { time: number; path: string }; }
      catch { throw new Error('Invalid repair cursor'); }
      if (!Number.isSafeInteger(cursor.time) || !validOutboxPath(cursor.path)) throw new Error('Invalid repair cursor');
      query = query.startAfter(cursor.time, db.doc(cursor.path));
    }
    const pending = await query.get(), counts = { dispatched: 0, failed: 0, unchanged: 0, blocked: 0 };
    for (const entry of pending.docs) counts[(await (entry.get('status') === 'dispatched'
      ? repairDispatchedDeadline(entry.ref.path) : dispatchDeadlineIntent(entry.ref.path, enqueue))).status]++;
    const last = pending.docs.at(-1);
    return { ...counts, nextCursor: pending.size === options.limit && last !== undefined
      ? Buffer.from(JSON.stringify({ time: last.get('nextAttemptAt'), path: last.ref.path })).toString('base64url') : null };
  }
  return { createMatch, requestAdmission, approveAdmission, admitDisplay, startMatch, submit, lookup, advance, serverTime,
    abortMatch, issueSeatRecovery, redeemSeatRecovery, beginSetup, confirmSetupChoice, readyForMatch, runSetupDeadline, dispatchSetupDeadlineIntent, repairSetupOutbox, setLobbyIdentity, setPracticeBots, runPracticeBots, runDeadline, dispatchDeadlineIntent, repairOutbox };
}

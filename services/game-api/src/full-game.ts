import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import type { DocumentReference, Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import {
  FullCommandRequestSchema, FullReceiptSchema, FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema, IdentifierSchema, SeatIdSchema,
  FullCreateMatchRequestSchema, FullAdmissionRequestSchema, FullApproveAdmissionRequestSchema, FullAdmitDisplayRequestSchema,
  FullStartMatchRequestSchema, FullAbortMatchRequestSchema, FullIssueSeatRecoveryRequestSchema, FullRedeemSeatRecoveryRequestSchema,
  FullLookupRequestSchema, FullAdvanceRequestSchema, FullServerTimeRequestSchema, FullOperationResponseSchema, FullLobbyViewSchema,
  FullAssetManifestVersionSchema,
} from '@mothership/contracts';
import type { FullCommandRequest, FullFailure, FullPlayerView, FullReceipt, FullOperationResponse, SeatId } from '@mothership/contracts';
import { createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame, FULL_ENGINE_VERSION, FULL_RULESET_VERSION, FULL_RULESET_HASH } from '@mothership/engine';
import type { FullGameSetup, FullGameState } from '@mothership/engine';

type FailureCode = FullFailure['error']['code'];
type Success = Extract<FullOperationResponse, { ok: true }>;
type OperationResult = FullOperationResponse;
type Body = Record<string, unknown>;
type EnvelopeSchema = { safeParse(value: unknown): { success: true; data: Body } | { success: false } };
type Role = FullPlayerView['self']['role'];
type Room = 'Room A' | 'Room B';
type Control = { protocolVersion: 2; hostUid: string; playerCount: 7 | 8 | 9; status: 'lobby' | 'running' | 'complete' | 'aborted'; roomCode: string; createdAt: number };
type SeatBinding = { uid: string; bindingRevision: number; initialRoom: Room };
type ActivePlayer = { seatId: SeatId; binding: SeatBinding };
type Shuffler = <T>(items: readonly T[]) => T[];
export interface V1DeadlineIntent {
  protocolVersion: 2; matchId: string; phaseId: string; deadlineToken: string;
  endsAt: number; taskId: string; status: 'pending';
}
export type EnqueueV1Deadline = (intent: V1DeadlineIntent) => Promise<void>;
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
  status: 'pending' | 'leased' | 'dispatched' | 'blocked'; attempts: number;
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
const supported = (state: FullGameState) => state.versions.protocolVersion === 2 && state.versions.engineVersion === FULL_ENGINE_VERSION
  && state.versions.rulesetVersion === FULL_RULESET_VERSION && state.versions.rulesetHash === FULL_RULESET_HASH;
const taskIdFor = (matchId: string, phaseId: string, token: string) => hash([matchId, phaseId, token]);
const validOutboxPath = (path: string) => /^matches\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\/outbox\/[a-f0-9]{64}$/.test(path);

function secureShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j]!, result[i]!]; }
  return result;
}

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

export function createV1Service({ db, clock = Date.now, newId = randomUUID, shuffle = secureShuffle, assetManifestVersion = '0.0.0-no-assets' }: {
  db: Firestore; clock?: () => number; newId?: () => string; shuffle?: Shuffler; assetManifestVersion?: string;
}) {
  if (!FullAssetManifestVersionSchema.safeParse(assetManifestVersion).success) throw new Error('Invalid asset manifest version');
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
    return value?.uid === uid && value.bindingRevision === data.bindingRevision ? { seatId: data.seatId, binding: value } : null;
  }
  async function admitted(tx: Transaction, base: DocumentReference, uid: string): Promise<boolean> {
    const membership = await tx.get(base.collection('members').doc(uid));
    const data = membership.data();
    if (data?.kind === 'display') return true;
    if (!memberPlayer(data)) return false;
    const binding = await tx.get(base.collection('seats').doc(data.seatId));
    return binding.get('uid') === uid && binding.get('bindingRevision') === data.bindingRevision;
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
    return FullLobbyViewSchema.parse({ protocolVersion: 2, matchId: base.id, playerCount: control.playerCount, status: control.status,
      seats: bindings.map(doc => ({ seatId: doc.id, initialRoom: doc.get('initialRoom') as Room })).sort((a, b) => a.seatId.localeCompare(b.seatId)) });
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
      if (viewer !== undefined && uidSafe(uid)) audiences.push({ path: `playerViews/${uid}`, key: `p-${binding.id}`, old: prev?.players[binding.id as SeatId], view: viewer });
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
      const control: Control = { protocolVersion: 2, hostUid: uid, playerCount: body['playerCount'] as 7 | 8 | 9, status: 'lobby', roomCode, createdAt: now };
      return { response: success(now, { matchId, roomCode, playerCount: control.playerCount, status: 'lobby' }), write: () => {
        tx.create(codeRef, { matchId }); tx.create(base.collection('control').doc('session'), control);
        tx.create(base.collection('members').doc(uid), { kind: 'display' });
        tx.create(base.collection('lobby').doc('public'), lobby(base, control, []));
      } };
    });
  }
  async function requestAdmission(uid: string, payload: unknown): Promise<OperationResult> {
    const body = envelope(uid, payload, FullAdmissionRequestSchema);
    if (isFailure(body)) return body;
    const admissionId = hash([uid, body['requestId']]);
    return operation(uid, body, 'requestAdmission', async (tx, now) => {
      const code = await tx.get(db.collection('roomCodes').doc(body['roomCode'] as string));
      if (!code.exists || !id(code.get('matchId'))) return failure('FORBIDDEN');
      const base = db.collection('matches').doc(code.get('matchId') as string);
      const control = (await tx.get(base.collection('control').doc('session'))).data() as Control | undefined;
      const member = await tx.get(base.collection('members').doc(uid));
      if (control?.protocolVersion !== 2 || control.status !== 'lobby' || member.get('kind') === 'player') return failure('FORBIDDEN');
      return { response: success(now, { matchId: base.id, admissionId, status: 'pending' }), write: () => {
        tx.create(base.collection('admissions').doc(admissionId), { uid, initialRoom: body['initialRoom'], requestedAt: now, status: 'pending' });
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
      const initialRoom = admission.get('initialRoom') as Room;
      const nextLobby = lobby(base, control, bindings.docs); nextLobby.seats.push({ seatId, initialRoom });
      FullLobbyViewSchema.parse(nextLobby);
      return { response: success(now, { admissionId: admission.id, seatId, status: 'approved' }), write: () => {
        tx.create(bindingRef, { uid: targetUid, bindingRevision: 1, initialRoom });
        tx.set(memberRef, { kind: 'player', seatId, bindingRevision: 1 });
        tx.update(admissionRef, { status: 'approved', seatId });
        tx.set(base.collection('lobby').doc('public'), nextLobby);
      } };
    });
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
    let preflight: Control | undefined;
    try { preflight = (await base.collection('control').doc('session').get()).data() as Control | undefined; }
    catch { return failure('UNAVAILABLE'); }
    if (preflight?.hostUid !== uid || ![7, 8, 9].includes(preflight.playerCount)) return failure('FORBIDDEN');
    // Candidate random facts and IDs are fixed for the invocation, including every transaction retry.
    const setupFacts = randomSetup(preflight.playerCount, shuffle), phaseId = newId(), token = newId(), eventId = newId();
    return operation(uid, body, 'startMatch', async (tx, now) => {
      const controlRef = base.collection('control').doc('session'), control = (await tx.get(controlRef)).data() as Control | undefined;
      if (control?.hostUid !== uid || control.status !== 'lobby' || control.playerCount !== setupFacts.playerCount) return failure('FORBIDDEN');
      const bindings = await tx.get(base.collection('seats'));
      if (bindings.size !== control.playerCount || new Set(bindings.docs.map(doc => doc.get('uid'))).size !== control.playerCount) return failure('FORBIDDEN');
      if (bindings.docs.some(doc => !seat(doc.id) || Number(doc.id.slice(5)) > control.playerCount || !uidSafe(doc.get('uid')))) return failure('FORBIDDEN');
      const memberships = await tx.getAll(...bindings.docs.map(doc => base.collection('members').doc(doc.get('uid') as string)));
      if (memberships.some((entry, index) => {
        const member = entry.data(), binding = bindings.docs[index]!;
        return !memberPlayer(member) || member.seatId !== binding.id || member.bindingRevision !== binding.get('bindingRevision');
      })) return failure('FORBIDDEN');
      const initialRooms: Record<string, Room> = Object.fromEntries(bindings.docs.map(doc => [doc.id, doc.get('initialRoom') as Room]));
      const setup: FullGameSetup = { ...setupFacts, initialRooms };
      const state = { ...createFullGame({ matchId: base.id, setup, now, phaseId, deadlineToken: token, assetManifestVersion }), journalSequence: 1 };
      return { response: success(now, { started: true, matchId: base.id }), write: () => {
        tx.update(controlRef, { status: 'running' });
        tx.set(base.collection('lobby').doc('public'), lobby(base, { ...control, status: 'running' }, bindings.docs));
        writeGame(tx, null, state, bindings.docs, eventId);
        tx.create(base.collection('events').doc(eventId), { journalVersion: 1, sequence: 1, kind: 'SETUP', now, phaseId, deadlineToken: token,
          matchId: base.id, assetManifestVersion: state.versions.assetManifestVersion, setup: encodeV1Setup(setup), verifiedUid: uid, versions: state.versions,
          seatBindings: bindings.docs.map(entry => ({ seatId: entry.id, ...entry.data() })) });
      } };
    });
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
      const before = snapshot.exists ? decodeV1State(snapshot.data()) : null;
      if (before !== null && !supported(before)) return failure('UNSUPPORTED_PROTOCOL');
      const after = before === null ? null : { ...abortFullGame(before, { now, nextPhaseId, nextDeadlineToken }), journalSequence: before.journalSequence + 1 };
      return { response: success(now, { aborted: true }), write: () => {
        tx.update(controlRef, { status: 'aborted' });
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
      if (control?.hostUid !== uid || !binding.exists || control.status === 'aborted') return failure('FORBIDDEN');
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
      if (!uidSafe(oldUid) || binding.get('bindingRevision') !== grant.get('bindingRevision') || oldUid === uid) return failure('FORBIDDEN');
      const snapshot = await tx.get(base.collection('engine').doc('current'));
      const state = snapshot.exists ? decodeV1State(snapshot.data()) : null;
      if (state !== null && !supported(state)) return failure('UNSUPPORTED_PROTOCOL');
      const view = state === null ? null : projectFullGame(state).players[grant.id];
      const bindingRevision = (binding.get('bindingRevision') as number) + 1;
      return { response: success(now, { recovered: true, seatId: grant.id }), write: () => {
        tx.update(bindingRef, { uid, bindingRevision });
        tx.set(membershipRef, { kind: 'player', seatId: grant.id, bindingRevision });
        tx.delete(base.collection('members').doc(oldUid)); tx.delete(base.collection('playerViews').doc(oldUid));
        if (view !== null && view !== undefined) { FullPlayerViewSchema.parse(view); tx.set(base.collection('playerViews').doc(uid), view); }
        tx.update(grant.ref, { consumed: true, redeemedByUid: uid, redeemedAt: now });
        tx.create(base.collection('identityAudit').doc(auditId), { kind: 'SEAT_RECOVERY', seatId: grant.id, previousUid: oldUid, currentUid: uid, bindingRevision, evaluatedAt: now });
        if (control.hostUid === oldUid) tx.update(controlRef, { hostUid: uid });
      } };
    });
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
        if (value.protocolVersion !== 2 || ![value.matchId, value.phaseId, value.deadlineToken].every(id)
          || value.matchId !== path.split('/')[1]
          || value.taskId !== taskIdFor(value.matchId, value.phaseId, value.deadlineToken) || ref.id !== value.taskId
          || !Number.isSafeInteger(value.endsAt) || value.endsAt < 0 || !Number.isFinite(new Date(value.endsAt).getTime())
          || !Number.isSafeInteger(value.attempts) || value.attempts < 0 || !Number.isSafeInteger(value.nextAttemptAt)) {
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
        tx.update(ref, { status: 'dispatched', leaseToken: null, leaseUntil: null }); return true;
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
  async function repairOutbox(enqueue: EnqueueV1Deadline, options: { limit: number; cursor?: string }) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error('Repair page limit must be 1..100');
    let query = db.collectionGroup('outbox').where('protocolVersion', '==', 2).where('status', 'in', ['pending', 'leased'])
      .where('nextAttemptAt', '<=', clock()).orderBy('nextAttemptAt').orderBy(FieldPath.documentId()).limit(options.limit);
    if (options.cursor !== undefined) {
      let cursor: { time: number; path: string };
      try { cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { time: number; path: string }; }
      catch { throw new Error('Invalid repair cursor'); }
      if (!Number.isSafeInteger(cursor.time) || !validOutboxPath(cursor.path)) throw new Error('Invalid repair cursor');
      query = query.startAfter(cursor.time, db.doc(cursor.path));
    }
    const pending = await query.get(), counts = { dispatched: 0, failed: 0, unchanged: 0, blocked: 0 };
    for (const entry of pending.docs) counts[(await dispatchDeadlineIntent(entry.ref.path, enqueue)).status]++;
    const last = pending.docs.at(-1);
    return { ...counts, nextCursor: pending.size === options.limit && last !== undefined
      ? Buffer.from(JSON.stringify({ time: last.get('nextAttemptAt'), path: last.ref.path })).toString('base64url') : null };
  }
  return { createMatch, requestAdmission, approveAdmission, admitDisplay, startMatch, submit, lookup, advance, serverTime,
    abortMatch, issueSeatRecovery, redeemSeatRecovery, runDeadline, dispatchDeadlineIntent, repairOutbox };
}

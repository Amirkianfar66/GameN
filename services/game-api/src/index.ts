import { createHash, randomUUID } from 'node:crypto';
import type { Firestore, Transaction, QuerySnapshot } from 'firebase-admin/firestore';
import { RegisterShotSchema, ReceiptLookupRequestSchema, AdvanceIfExpiredRequestSchema, IdentifierSchema, SeatIdSchema, PublicViewSchema, PlayerViewSchema, PublicPresentationEventSchema, PlayerPresentationEventSchema } from '@mothership/contracts';
import type { ApiFailure, CommandResponse, Receipt, RegisterShot, ReceiptLookupResponse, AdvanceIfExpiredResponse, ServerTimeResponse, SeatId } from '@mothership/contracts';
import { project, registerShot, advanceDeadline, resolveSlice, ENGINE_VERSION, SOURCE_MANIFEST_SHA256 } from '@mothership/engine';
import type { EngineState, EvaluationContext } from '@mothership/engine';

export interface AuthorizedCommandContext extends EvaluationContext { readonly verifiedUid: string }
export type Member = { kind: 'player'; seatId: SeatId } | { kind: 'display' };
export interface DeadlineIntent { matchId: string; phaseId: string; deadlineToken: string; endsAt: number; taskId: string; status: 'pending' | 'dispatched' }
export type EnqueueDeadline = (intent: DeadlineIntent) => Promise<void>;
export const digestCommand = (request: RegisterShot): string => createHash('sha256').update(JSON.stringify([request.protocolVersion, request.matchId, request.phaseId, request.commandId, request.command.type, request.command.targetSeatId])).digest('hex');
export const receiptKey = (uid: string, commandId: string): string => createHash('sha256').update(JSON.stringify([uid, commandId])).digest('hex');
export const deadlineTaskId = (matchId: string, phaseId: string, token: string): string => createHash('sha256').update(JSON.stringify([matchId, phaseId, token])).digest('hex');
export function deadlineIntent(state: EngineState): DeadlineIntent | null {
  if (state.phase.endsAt === null || state.deadlineToken === null) return null;
  return { matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken, endsAt: state.phase.endsAt, taskId: deadlineTaskId(state.matchId, state.phase.id, state.deadlineToken), status: 'pending' };
}
const supportsState = (state: EngineState) => state.versions.protocolVersion === 1 && state.versions.engineVersion === ENGINE_VERSION && state.versions.rulesetHash === SOURCE_MANIFEST_SHA256 && state.versions.rulesetVersion === 'fixture-source-2026-09-26';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function member(data: unknown): Member | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.kind === 'display') return { kind: 'display' };
  const seat = SeatIdSchema.safeParse(record.seatId);
  return record.kind === 'player' && seat.success ? { kind: 'player', seatId: seat.data } : null;
}
function unsupported(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && 'protocolVersion' in payload && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 1;
}

export function createGameService({ db, clock = Date.now, newId = randomUUID }: { db: Firestore; clock?: () => number; newId?: () => string }) {
  const failure = (code: ApiFailure['error']['code']): ApiFailure => ({ ok: false, serverTimeMs: clock(), error: { code } });
  // IDs are sampled once per invocation, never inside a transaction retry.
  function writeTransition(tx: Transaction, before: EngineState, after: EngineState, members: QuerySnapshot, eventId: string, commandId?: string) {
    const prev = project(before), next = project(after);
    const base = db.collection('matches').doc(after.matchId);
    tx.set(base.collection('engine').doc('current'), after);
    const audiences: Array<{ path: string; key: string; oldView: typeof prev.public | typeof prev.players[SeatId]; newView: typeof next.public | typeof next.players[SeatId] }> = [
      { path: 'views/public', key: 'public', oldView: prev.public, newView: next.public },
    ];
    for (const entry of members.docs) {
      const binding = member(entry.data());
      if (binding?.kind === 'player') audiences.push({ path: `playerViews/${entry.id}`, key: entry.id, oldView: prev.players[binding.seatId], newView: next.players[binding.seatId] });
    }
    for (const audience of audiences) {
      if (equal(audience.oldView, audience.newView)) continue;
      const view = audience.newView;
      if (view.audience.kind === 'public') PublicViewSchema.parse(view); else PlayerViewSchema.parse(view);
      tx.set(db.doc(`${base.path}/${audience.path}`), view);
      const facts: Array<Record<string, unknown>> = [];
      if (before.phase.id !== after.phase.id) facts.push({ type: 'PHASE_CHANGED', phaseId: after.phase.id });
      for (const seat of after.seats) if (before.seats.find(s => s.seatId === seat.seatId)?.health !== seat.health) facts.push({ type: 'PUBLIC_HEALTH_CHANGED', seatId: seat.seatId, health: seat.health });
      if (commandId && view.audience.kind === 'player') facts.push({ type: 'COMMAND_REGISTERED', commandId });
      facts.forEach((fact, ordinal) => {
        const event = { protocolVersion: 1, matchId: after.matchId, eventId: `${eventId}-${ordinal}`, viewRevision: view.viewRevision, audience: view.audience, fact };
        if (view.audience.kind === 'public') PublicPresentationEventSchema.parse(event); else PlayerPresentationEventSchema.parse(event);
        tx.set(base.collection('audienceEvents').doc(audience.key).collection('items').doc(`${view.viewRevision}-${ordinal}`), event);
      });
    }
    if (before.phase.id !== after.phase.id) {
      const intent = deadlineIntent(after);
      if (intent) tx.create(base.collection('outbox').doc(intent.taskId), intent);
    }
  }

  async function submit(uid: string, payload: unknown): Promise<CommandResponse> {
    if (!uid) return failure('UNAUTHENTICATED');
    if (unsupported(payload)) return failure('UNSUPPORTED_PROTOCOL');
    const parsed = RegisterShotSchema.safeParse(payload);
    if (!parsed.success) return failure('INVALID_REQUEST');
    const request = parsed.data, digest = digestCommand(request), eventId = newId();
    const base = db.collection('matches').doc(request.matchId);
    try {
      return await db.runTransaction(async tx => {
        const membership = await tx.get(base.collection('members').doc(uid));
        const binding = member(membership.data());
        if (binding?.kind !== 'player') return failure('FORBIDDEN');
        const receiptRef = base.collection('receipts').doc(receiptKey(uid, request.commandId));
        const stored = await tx.get(receiptRef);
        // Accepted AND rejected receipts are terminal. Check before any phase/time test.
        if (stored.exists) {
          if (stored.get('digest') !== digest) return failure('COMMAND_ID_CONFLICT');
          return { ok: true, serverTimeMs: clock(), receipt: stored.get('receipt') as Receipt };
        }
        const snapshot = await tx.get(base.collection('engine').doc('current'));
        if (!snapshot.exists) return failure('FORBIDDEN');
        const state = snapshot.data() as EngineState;
        if (!supportsState(state) || state.versions.protocolVersion !== request.protocolVersion) return failure('UNSUPPORTED_PROTOCOL');
        const members = await tx.get(base.collection('members'));
        // Trusted successful-attempt time; no client send/commit-time guarantee.
        const evaluatedAt = clock();
        const result = registerShot(state, request, { actorSeatId: binding.seatId, evaluatedAt, recordedRandomFacts: [] });
        const sequence = state.journalSequence + 1;
        const after = { ...result.state, journalSequence: sequence };
        tx.create(receiptRef, { uid, digest, receipt: result.receipt, evaluatedAt });
        tx.create(base.collection('events').doc(eventId), { sequence, kind: 'COMMAND', request, actorSeatId: binding.seatId, evaluatedAt, recordedRandomFacts: [], receipt: result.receipt });
        if (result.receipt.status === 'accepted') writeTransition(tx, state, after, members, eventId, request.commandId);
        else tx.set(base.collection('engine').doc('current'), after);
        return { ok: true, serverTimeMs: evaluatedAt, receipt: result.receipt };
      });
    } catch { return failure('UNAVAILABLE'); }
  }

  async function lookup(uid: string, payload: unknown): Promise<ReceiptLookupResponse | ApiFailure> {
    if (!uid) return failure('UNAUTHENTICATED');
    if (unsupported(payload)) return failure('UNSUPPORTED_PROTOCOL');
    const parsed = ReceiptLookupRequestSchema.safeParse(payload);
    if (!parsed.success) return failure('INVALID_REQUEST');
    const { matchId, commandId } = parsed.data, base = db.collection('matches').doc(matchId);
    try {
      return await db.runTransaction(async tx => {
        const membership = await tx.get(base.collection('members').doc(uid));
        if (member(membership.data())?.kind !== 'player') return failure('FORBIDDEN');
        const receipt = await tx.get(base.collection('receipts').doc(receiptKey(uid, commandId)));
        return receipt.exists ? { status: 'found', serverTimeMs: clock(), receipt: receipt.get('receipt') as Receipt } : { status: 'unknown', serverTimeMs: clock() };
      });
    } catch { return failure('UNAVAILABLE'); }
  }

  async function transition(matchId: string, phaseId: string, token: string | null, uid: string | null): Promise<AdvanceIfExpiredResponse | ApiFailure> {
    const base = db.collection('matches').doc(matchId), nextPhaseId = newId(), nextDeadlineToken = newId(), eventId = newId();
    try {
      return await db.runTransaction(async tx => {
        if (uid !== null) {
          const membership = await tx.get(base.collection('members').doc(uid));
          if (!member(membership.data())) return failure('FORBIDDEN');
        }
        const snapshot = await tx.get(base.collection('engine').doc('current'));
        if (!snapshot.exists) return uid !== null ? failure('FORBIDDEN') : { protocolVersion: 1, matchId, phaseId, serverTimeMs: clock(), result: 'unchanged' };
        const state = snapshot.data() as EngineState;
        if (!supportsState(state)) return failure('UNSUPPORTED_PROTOCOL');
        const members = await tx.get(base.collection('members'));
        const now = clock();
        const result = advanceDeadline(state, { phaseId, deadlineToken: token ?? state.deadlineToken ?? '', now, nextPhaseId, nextDeadlineToken });
        if (result.advanced) {
          const sequence = state.journalSequence + 1;
          writeTransition(tx, state, { ...result.state, journalSequence: sequence }, members, eventId);
          tx.create(base.collection('events').doc(eventId), { sequence, kind: 'DEADLINE', phaseId, deadlineToken: token ?? state.deadlineToken, now, nextPhaseId, nextDeadlineToken });
        }
        return { protocolVersion: 1, matchId, phaseId, serverTimeMs: now, result: result.advanced ? 'advanced' : 'unchanged' };
      });
    } catch { return failure('UNAVAILABLE'); }
  }
  async function advance(uid: string, payload: unknown): Promise<AdvanceIfExpiredResponse | ApiFailure> {
    if (!uid) return failure('UNAUTHENTICATED');
    if (unsupported(payload)) return failure('UNSUPPORTED_PROTOCOL');
    const parsed = AdvanceIfExpiredRequestSchema.safeParse(payload);
    return parsed.success ? transition(parsed.data.matchId, parsed.data.phaseId, null, uid) : failure('INVALID_REQUEST');
  }
  // Internal scheduler adapter only: callers must authenticate tasks outside this core.
  async function runDeadline(payload: { matchId: string; phaseId: string; deadlineToken: string }) {
    if (![payload.matchId, payload.phaseId, payload.deadlineToken].every(v => IdentifierSchema.safeParse(v).success)) return failure('INVALID_REQUEST');
    return transition(payload.matchId, payload.phaseId, payload.deadlineToken, null);
  }
  async function serverTime(uid: string, matchId: string): Promise<ServerTimeResponse | ApiFailure> {
    if (!uid) return failure('UNAUTHENTICATED');
    if (!IdentifierSchema.safeParse(matchId).success) return failure('INVALID_REQUEST');
    try {
      const membership = await db.collection('matches').doc(matchId).collection('members').doc(uid).get();
      return member(membership.data()) ? { protocolVersion: 1, serverTimeMs: clock() } : failure('FORBIDDEN');
    } catch { return failure('UNAVAILABLE'); }
  }
  async function repairOutbox(enqueue: EnqueueDeadline): Promise<{ dispatched: number; failed: number }> {
    const pending = await db.collectionGroup('outbox').where('status', '==', 'pending').get();
    let dispatched = 0, failed = 0;
    for (const entry of pending.docs) {
      const intent = entry.data() as DeadlineIntent & {protocolVersion?:number};
      // The retained protocol-1 harness must not consume newer handlers' outboxes.
      if (intent.protocolVersion !== undefined && intent.protocolVersion !== 1) continue;
      try {
        // Stable taskId means a retry after enqueue/ack failure must be treated as already enqueued.
        await enqueue(intent);
        await entry.ref.update({ status: 'dispatched' });
        dispatched++;
      } catch { failed++; }
    }
    return { dispatched, failed };
  }
  // Dev/test prerequisite only; no HTTP export, public vote shortcut or production round completion.
  async function resolveFixtureAfterVote(matchId: string): Promise<void> {
    if (!IdentifierSchema.safeParse(matchId).success) throw new Error('Invalid match identifier');
    const base = db.collection('matches').doc(matchId), resolutionPhaseId = newId(), eventId = newId();
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(base.collection('engine').doc('current'));
      if (!snapshot.exists) throw new Error('Missing internal fixture');
      const state = snapshot.data() as EngineState;
      if (!supportsState(state)) throw new Error('Unsupported pinned fixture version');
      const members = await tx.get(base.collection('members'));
      if (state.resolved) return;
      const now = clock(), next = resolveSlice(state, { now, resolutionPhaseId, completedNoJailVote: true });
      const sequence = state.journalSequence + 1;
      writeTransition(tx, state, { ...next, journalSequence: sequence }, members, eventId);
      tx.create(base.collection('events').doc(eventId), { sequence, kind: 'FIXTURE_VOTE_COMPLETED_AND_ATTACK_STAGE', now, resolutionPhaseId, completedNoJailVote: true });
    });
  }
  return { submit, lookup, advance, serverTime, runDeadline, repairOutbox, resolveFixtureAfterVote };
}

export { createV1Service, encodeV1Setup, decodeV1Setup, encodeV1State, decodeV1State } from './full-game.js';
export type { V1DeadlineIntent, EnqueueV1Deadline, StoredV1State, StoredV1Setup } from './full-game.js';

export { choosePracticeBotActions } from './practice-bot-policy.js';

import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, TimestampSchema, RevisionSchema } from './protocol.js';
import { PlanetLocationSchema, PlanetSlotIdSchema, PlanetRoundSchema } from './planet-game.js';
import type { HoldInput, HoldRecoveryInput } from './food-task-hold.js';

/** Contract-first candidate. Exporting these schemas does not register a runtime tuple. */
export const FOOD_TASK_CONTRACT_VERSION = 1 as const;
export const FOOD_TASK_TARGET = Object.freeze({ protocolVersion: 3 as const,
  engineVersion: 'planet-game-1.4.0' as const, rulesetVersion: 'in-person-planet-food-task-2026-11-12' as const });
export const FOOD_TASK_PARAMETERS = Object.freeze({ askingMs: 30_000, answerMs: 15_000,
  taskMs: 30_000, briefingMs: 4_000, returnMs: 32_500, presenceGraceMs: 8_000,
  snapMs: 50, restMs: 200, warningMs: 150, liftMs: 450, fallMs: 300,
  swingPeriodMs: 1_300, swingSettleMs: 2_200, lockAmplitude: 0.9, leastAmplitude: 0.38,
  liftAmplitude: 0.25, platformHalfWidth: 0.3, consoleHalfWidth: 0.42, intakeHalfWidth: 0.42,
  catchProbability: 0.25, initialDoses: 10, deliveryDoses: 10, mealDoses: 1, warningDoses: 2 });
const sequence = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const finite = z.number().finite();
/** Rail coordinates: intake=0, console=4, platform=5, Winch=6; swing remains inside [-1,7]. */
const railX = finite.min(-1).max(7);
const ids = z.array(SeatIdSchema).max(9).refine(v => new Set(v).size === v.length, 'Distinct seats required');
const pair = z.tuple([SeatIdSchema, SeatIdSchema]).refine(v => v[0] !== v[1], 'Two distinct participants required');
const orderedPair = pair.refine(v => Number(v[0].slice(5)) < Number(v[1].slice(5)), 'Public absence uses original seat order');
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
/** Shared visual axis, independent of destination: design Y = 658 - 250 * height. */
export const FOOD_TASK_VERTICAL = Object.freeze({ intake: 0, deck: 0.04, console: 0.472,
  platform: 0.36, raised: 1, min: -0.25, max: 1.5 });
const height = finite.min(FOOD_TASK_VERTICAL.min).max(FOOD_TASK_VERTICAL.max);
/** Candidate transport policy, separate from Task physics and all predecessor limits. */
export const FOOD_TASK_TRANSPORT = Object.freeze({ snapshotMs: 500, heartbeatMs: 1_000, presenceLeaseMs: 2_000,
  requestsPerMinute: Object.freeze({ snapshot: 180, presence: 90, input: 120, closure: 120, control: 30 }) });
export const FoodTaskVersionsSchema = z.strictObject({
  protocolVersion: z.literal(3), engineVersion: z.literal(FOOD_TASK_TARGET.engineVersion),
  rulesetVersion: z.literal(FOOD_TASK_TARGET.rulesetVersion), rulesetHash: sha256,
  assetManifestVersion: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/),
});
export type FoodTaskVersions = z.infer<typeof FoodTaskVersionsSchema>;
export const FoodTaskControlSchema = z.enum(['WINCH', 'PANEL']);
export const FoodTaskHoldInputSchema = z.strictObject({
  kind: z.literal('HOLD'), edge: z.enum(['DOWN', 'UP']), gestureSequence: sequence,
  crateId: IdentifierSchema.nullable(),
});
export type FoodTaskHoldInput = z.infer<typeof FoodTaskHoldInputSchema>;
export const FoodTaskHoldRecoveryInputSchema = z.strictObject({ kind: z.literal('HOLD_RECOVER_OFF'),
  recoveryRevision: RevisionSchema, throughSequence: RevisionSchema });
export const FoodTaskInputSchema = z.union([FoodTaskHoldInputSchema, FoodTaskHoldRecoveryInputSchema,
  z.strictObject({ kind: z.enum(['PANEL_RELEASE', 'PANEL_LOCK', 'KEY']) })]);
export const FoodTaskCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('TASK_ASK'), partnerSeatId: SeatIdSchema }),
  z.strictObject({ type: z.literal('TASK_ANSWER'), requestId: IdentifierSchema,
    requestRevision: RevisionSchema, answer: z.enum(['JOIN', 'DECLINE']) }),
  z.strictObject({ type: z.literal('TASK_ASK_WITHDRAW'), requestId: IdentifierSchema, requestRevision: RevisionSchema }),
  z.strictObject({ type: z.literal('TASK_PRESS'), taskId: IdentifierSchema, controlSessionId: IdentifierSchema,
    expectedControlRevision: RevisionSchema, input: FoodTaskInputSchema }),
]);
export type FoodTaskCommand = z.infer<typeof FoodTaskCommandSchema>;
const context = { schemaVersion: z.literal(1), protocolVersion: z.literal(3), matchId: IdentifierSchema,
  commandId: IdentifierSchema, phaseId: IdentifierSchema, foodStepId: IdentifierSchema, round: PlanetRoundSchema };
export const FoodTaskCommandRequestSchema = z.strictObject({ ...context, command: FoodTaskCommandSchema });
export type FoodTaskCommandRequest = z.infer<typeof FoodTaskCommandRequestSchema>;
/** UP uses the original contact's authority context, without waiting for any acknowledgement. */
export function foodTaskHoldRelease(originalDown: unknown, commandId: string): FoodTaskCommandRequest {
  const q = FoodTaskCommandRequestSchema.parse(originalDown), c = q.command;
  IdentifierSchema.parse(commandId);
  if (commandId === q.commandId || c.type !== 'TASK_PRESS' || c.input.kind !== 'HOLD' || c.input.edge !== 'DOWN')
    throw Error('A release needs its original DOWN and a distinct command ID');
  return FoodTaskCommandRequestSchema.parse({ ...q, commandId,
    command: { ...c, input: { ...c.input, edge: 'UP', crateId: null } } });
}
export const FoodTaskRequestClosureSchema = z.strictObject({ foodStepId: IdentifierSchema, round: PlanetRoundSchema,
  requestId: IdentifierSchema, requestRevision: RevisionSchema, volunteerSeatId: SeatIdSchema, partnerSeatId: SeatIdSchema,
  askedAt: TimestampSchema, answerEndsAt: TimestampSchema, closedAt: TimestampSchema,
  state: z.enum(['JOINED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'])
}).refine(v => v.volunteerSeatId !== v.partnerSeatId && v.answerEndsAt - v.askedAt === FOOD_TASK_PARAMETERS.answerMs
  && v.closedAt >= v.askedAt && (v.state === 'EXPIRED' ? v.closedAt === v.answerEndsAt : v.closedAt < v.answerEndsAt),
  'Original private request closes once within its authoritative interval');
/** Parse the wire before entering the server-only admission ledger; never accept caller authority. */
export function foodTaskHoldInput(request: unknown): HoldInput {
  const value = FoodTaskCommandRequestSchema.parse(request), c = value.command;
  if (c.type !== 'TASK_PRESS' || c.input.kind !== 'HOLD') throw Error('Hold request required');
  return { commandId: value.commandId, taskId: c.taskId, controlSessionId: c.controlSessionId,
    expectedRevision: c.expectedControlRevision, gestureSequence: c.input.gestureSequence,
    edge: c.input.edge, crateId: c.input.crateId };
}
/** Explicit local contact-off reconciliation from a freshly recovered own gesture view. */
export function foodTaskHoldRecoveryInput(request: unknown): HoldRecoveryInput {
  const value = FoodTaskCommandRequestSchema.parse(request), c = value.command;
  if (c.type !== 'TASK_PRESS' || c.input.kind !== 'HOLD_RECOVER_OFF') throw Error('Hold recovery request required');
  return { kind: c.input.kind, commandId: value.commandId, taskId: c.taskId, controlSessionId: c.controlSessionId,
    expectedRevision: c.expectedControlRevision, recoveryRevision: c.input.recoveryRevision,
    throughSequence: c.input.throughSequence };
}
export const FoodTaskReceiptSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...context, status: z.literal('accepted'), receivedAt: TimestampSchema,
    result: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('REQUEST'), requestId: IdentifierSchema, requestRevision: RevisionSchema,
        state: z.enum(['PENDING', 'JOINED', 'DECLINED', 'WITHDRAWN']) }),
      z.strictObject({ kind: z.literal('INPUT'), taskId: IdentifierSchema, controlSessionId: IdentifierSchema,
        effect: z.enum(['APPLIED', 'GESTURE_CLOSED', 'NO_CHANGE', 'RECOVERED_CLOSED']),
        gestureSequence: sequence.nullable(), crateId: IdentifierSchema.nullable(),
        closedThroughSequence: RevisionSchema.optional() }).refine(v => v.effect === 'RECOVERED_CLOSED'
          ? v.gestureSequence === null && v.closedThroughSequence !== undefined
          : v.closedThroughSequence === undefined, 'Only recovery acknowledges an atomic closure high-water'),
    ]) }),
  z.strictObject({ ...context, status: z.literal('rejected'), receivedAt: TimestampSchema,
    code: z.enum(['NOT_ALLOWED', 'PHASE_CLOSED', 'STALE_CONTEXT', 'FUTURE_REVISION', 'REQUEST_CLOSED',
      'WRONG_CONTROL', 'GESTURE_CLOSED', 'CRATE_CHANGED', 'HOLD_ACTIVE', 'STALE_RECOVERY']),
    requestClosure: FoodTaskRequestClosureSchema.nullable() }),
]).refine(v => v.status !== 'rejected' || (v.code === 'REQUEST_CLOSED') === (v.requestClosure !== null),
  'Request-closed receipt retains its original pair-private closure');
export type FoodTaskReceipt = z.infer<typeof FoodTaskReceiptSchema>;
/** Original request correlation is also required on lookup/recovery; null means still unknown. */
export function parseFoodTaskReceipt(payload: unknown, original: unknown, expectedSeatId: z.infer<typeof SeatIdSchema>): FoodTaskReceipt | null {
  const q = FoodTaskCommandRequestSchema.parse(original);
  SeatIdSchema.parse(expectedSeatId);
  if (payload === null) return null;
  const r = FoodTaskReceiptSchema.parse(payload);
  for (const k of ['schemaVersion', 'protocolVersion', 'matchId', 'commandId', 'phaseId', 'foodStepId', 'round'] as const)
    if (r[k] !== q[k]) throw Error('Food Task receipt context mismatch');
  if (r.status === 'accepted') {
    const c = q.command, result = r.result;
    if (c.type === 'TASK_PRESS') {
      if (result.kind !== 'INPUT' || result.taskId !== c.taskId || result.controlSessionId !== c.controlSessionId
        || (c.input.kind === 'HOLD' ? result.gestureSequence !== c.input.gestureSequence
          || c.input.crateId !== null && result.crateId !== null && result.crateId !== c.input.crateId
          : c.input.kind === 'HOLD_RECOVER_OFF' ? result.gestureSequence !== null
            || result.effect !== 'RECOVERED_CLOSED' || result.closedThroughSequence !== c.input.throughSequence
          : result.gestureSequence !== null || result.crateId !== null || !['APPLIED', 'NO_CHANGE'].includes(result.effect))) throw Error('Food Task input receipt mismatch');
    } else {
      const state = c.type === 'TASK_ASK' ? 'PENDING' : c.type === 'TASK_ASK_WITHDRAW' ? 'WITHDRAWN'
        : c.answer === 'JOIN' ? 'JOINED' : 'DECLINED';
      if (result.kind !== 'REQUEST' || result.state !== state || (c.type === 'TASK_ASK' ? result.requestRevision !== 0
        : result.requestId !== c.requestId || result.requestRevision !== c.requestRevision + 1)) throw Error('Food Task request receipt mismatch');
    }
  } else if (r.requestClosure) {
    const c = q.command, closure = r.requestClosure;
    if ((c.type !== 'TASK_ANSWER' && c.type !== 'TASK_ASK_WITHDRAW') || closure.requestId !== c.requestId
      || closure.foodStepId !== q.foodStepId || closure.round !== q.round
      || (c.type === 'TASK_ANSWER' ? closure.partnerSeatId : closure.volunteerSeatId) !== expectedSeatId
      || closure.closedAt > r.receivedAt) throw Error('Food Task private closure receipt mismatch');
  }
  return r;
}
/** Server-only durable receipt slot; save atomically with the command's first transition. */
export const FoodTaskStoredReceiptSchema = z.strictObject({ actorSeatId: SeatIdSchema,
  requestHash: sha256, response: FoodTaskReceiptSchema });

export const FoodTaskRequestViewSchema = z.strictObject({ foodStepId: IdentifierSchema, round: PlanetRoundSchema,
  requestId: IdentifierSchema, revision: RevisionSchema,
  volunteerSeatId: SeatIdSchema, partnerSeatId: SeatIdSchema, askedAt: TimestampSchema, answerEndsAt: TimestampSchema,
  state: z.enum(['PENDING', 'JOINED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'])
}).refine(v => v.volunteerSeatId !== v.partnerSeatId && v.answerEndsAt - v.askedAt === FOOD_TASK_PARAMETERS.answerMs,
  'Request retains its full answer interval');
const asking = z.strictObject({ kind: z.literal('ASKING'), stepId: IdentifierSchema,
  startedAt: TimestampSchema, askingEndsAt: TimestampSchema, someoneAsking: z.boolean()
}).refine(v => v.askingEndsAt - v.startedAt === FOOD_TASK_PARAMETERS.askingMs, 'Original asking interval required');
const away = z.strictObject({ kind: z.literal('AWAY'), stepId: IdentifierSchema,
  startedAt: TimestampSchema, returnsAt: TimestampSchema, awaySeatIds: orderedPair
}).refine(v => v.returnsAt - v.startedAt === FOOD_TASK_PARAMETERS.returnMs, 'Fixed common return required');
export const FoodTaskPublicStepSchema = z.union([asking, away]);
export const FoodTaskStockSchema = z.strictObject({ doses: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 10),
  publicationRound: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 2),
  basis: z.enum(['FINALIZED', 'PLAYER_CURRENT']) });
const placement = z.strictObject({ location: PlanetLocationSchema, slotId: PlanetSlotIdSchema }).refine(v => {
  const prefix = ({ 'Room A': 'A', 'Room B': 'B', 'Command Room': 'C', Hospital: 'H', Jail: 'J' } as const)[v.location];
  return v.slotId.startsWith(prefix);
}, 'Location and slot must agree');
export const FoodTaskMealSchema = z.strictObject({ id: IdentifierSchema, round: PlanetRoundSchema,
  seatId: SeatIdSchema, sourcePhaseId: IdentifierSchema, order: sequence, endedAt: TimestampSchema,
  result: z.enum(['ATE', 'NO_DOSE', 'IN_HOSPITAL']), dosesConsumed: z.union([z.literal(0), z.literal(1)]),
  placement: placement.nullable()
}).refine(v => v.dosesConsumed === (v.result === 'ATE' ? 1 : 0), 'Exactly one dose only for a retained meal');
export const FoodTaskTurnEndSchema = z.strictObject({ id: IdentifierSchema, round: PlanetRoundSchema,
  seatId: SeatIdSchema, sourcePhaseId: IdentifierSchema, order: sequence, endedAt: TimestampSchema,
  placement: placement.nullable() });
export const FoodTaskOfferSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('TASK_ASK'), partnerSeatIds: ids.refine(v => v.length > 0) }),
  z.strictObject({ type: z.literal('TASK_ANSWER'), requestId: IdentifierSchema, requestRevision: RevisionSchema }),
  z.strictObject({ type: z.literal('TASK_ASK_WITHDRAW'), requestId: IdentifierSchema, requestRevision: RevisionSchema }),
  z.strictObject({ type: z.literal('TASK_PRESS'), taskId: IdentifierSchema, controlSessionId: IdentifierSchema,
    controlRevision: RevisionSchema, inputs: z.array(z.enum(['HOLD', 'PANEL_RELEASE', 'PANEL_LOCK', 'KEY'])).min(1).max(4)
      .refine(v => new Set(v).size === v.length), crateId: IdentifierSchema.nullable() }),
]);
export const FoodTaskAvailabilitySchema = z.strictObject({ canAsk: z.boolean(), reason: z.enum([
  'NOT_IN_STEP', 'WENT_LAST_ROUND', 'REFUSED_THIS_ROUND', 'REQUEST_PENDING', 'TASK_ALREADY_STARTED', 'NOT_AVAILABLE_NOW'
]).nullable() }).refine(v => v.canAsk === (v.reason === null), 'Availability and reason agree');
const partnerChoice = z.strictObject({ seatId: SeatIdSchema, available: z.boolean(),
  reason: z.enum(['WENT_LAST_ROUND', 'IN_HOSPITAL', 'JAILED', 'ELIMINATED', 'NOT_AVAILABLE_NOW']).nullable()
}).refine(v => v.available === (v.reason === null), 'Partner availability is supplied by the server');

export const FoodTaskGestureViewSchema = z.strictObject({ controlSessionId: IdentifierSchema,
  highestSequence: RevisionSchema, recoveryRevision: RevisionSchema,
  currentHolder: z.strictObject({ sequence, crateId: IdentifierSchema }).nullable(),
  pendingIntent: z.strictObject({ sequence, crateId: IdentifierSchema.nullable() }).nullable()
}).refine(v => (v.currentHolder === null || v.currentHolder.sequence <= v.highestSequence)
  && (v.pendingIntent === null || v.pendingIntent.sequence === v.highestSequence
    && (v.currentHolder === null || v.pendingIntent.sequence > v.currentHolder.sequence)),
  'Actual owner and newest pending contact are independent causal bindings');
const motion = z.strictObject({ fromX: railX, toX: railX, fromHeight: height, toHeight: height,
  easing: z.enum(['QUADRATIC_IN_OUT', 'CUBIC_IN', 'CUBIC_OUT']), startedAt: TimestampSchema, endsAt: TimestampSchema })
  .refine(v => v.endsAt >= v.startedAt, 'Finite forward motion interval required');
const panel = z.strictObject({ locked: z.boolean(), stop: z.number().int().min(0).max(6),
  direction: z.union([z.literal(-1), z.literal(1)]), anchorAt: TimestampSchema,
  blade: z.strictObject({ state: z.enum(['RAISED', 'LOWERED', 'BUFFERED']), stop: z.number().int().min(0).max(6), changedAt: TimestampSchema }),
  warning: z.strictObject({ mechanism: z.enum(['CUT', 'DROP']), actorSeatId: SeatIdSchema, victimSeatId: SeatIdSchema,
    startsAt: TimestampSchema, endsAt: TimestampSchema }).nullable(),
  swing: z.strictObject({ startedAt: TimestampSchema, amplitude: finite.min(0).max(0.9), direction: z.union([z.literal(-1), z.literal(1)]) }).nullable() });
const crate = z.strictObject({ id: IdentifierSchema, generation: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  state: z.enum(['INTAKE', 'LIFTING', 'HELD', 'BRAKED', 'FALLING', 'LANDED', 'SENT']),
  holder: z.enum(['WINCH', 'BRAKE']).nullable(), x: railX, height, anchorAt: TimestampSchema,
  motion: motion.nullable()
}).refine(v => v.holder === (v.state === 'HELD' || v.state === 'LIFTING' ? 'WINCH' : v.state === 'BRAKED' ? 'BRAKE' : null),
  'Crate custody matches its state').refine(v => v.motion !== null
    || v.state !== 'INTAKE' && v.state !== 'LANDED' || v.height === (v.state === 'INTAKE'
      ? FOOD_TASK_VERTICAL.intake : FOOD_TASK_VERTICAL.platform), 'Rest pose uses the shared vertical axis')
  .refine(v => v.state !== 'LIFTING' || v.motion !== null && v.motion.toHeight === FOOD_TASK_VERTICAL.raised
    && v.motion.easing === 'QUADRATIC_IN_OUT', 'Lift trajectory reaches the raised anchor')
  .refine(v => v.state !== 'FALLING' || v.motion !== null && v.motion.easing === 'CUBIC_IN'
    && new Set<number>([FOOD_TASK_VERTICAL.intake, FOOD_TASK_VERTICAL.deck, FOOD_TASK_VERTICAL.console, FOOD_TASK_VERTICAL.platform]).has(v.motion.toHeight),
    'Fall names its destination coordinate, never inferred from x')
  .refine(v => v.state !== 'SENT' || v.motion !== null && v.motion.fromHeight === FOOD_TASK_VERTICAL.platform
    && v.motion.toHeight === -0.12 && v.motion.easing === 'QUADRATIC_IN_OUT'
    && v.motion.endsAt - v.motion.startedAt === 1_100, 'Sent descent is complete without a cosmetic event');
const cue = { id: IdentifierSchema, cursor: sequence, at: TimestampSchema };
const taskEvent = z.discriminatedUnion('kind', [
  z.strictObject({ ...cue, kind: z.enum(['LIFTED', 'RELEASED', 'LANDED', 'RETURNED_TO_INTAKE', 'BROKEN', 'TAKEN']),
    actorSeatId: SeatIdSchema, crateId: IdentifierSchema, x: railX }),
  z.strictObject({ ...cue, kind: z.enum(['STOPPED', 'ELIMINATED']), mechanism: z.enum(['CUT', 'DROP']),
    actorSeatId: SeatIdSchema, victimSeatId: SeatIdSchema, crateId: IdentifierSchema, x: railX }),
  z.strictObject({ ...cue, kind: z.enum(['KEY_TURNED', 'ONLINE', 'OFFLINE']), seatId: SeatIdSchema }),
  z.strictObject({ ...cue, kind: z.enum(['DELIVERED', 'CANCELLED']) }),
]);
const eventWindow = z.strictObject({ cursor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  events: z.array(taskEvent).max(64) }).refine(v => v.events.every((e, i) => e.cursor <= v.cursor
    && (i === 0 || e.cursor === v.events[i - 1]!.cursor + 1 && e.at >= v.events[i - 1]!.at))
    && new Set(v.events.map(e => e.id)).size === v.events.length
    && (v.events.length === 0 || v.events.at(-1)!.cursor === v.cursor), 'Audience-local suffix ends at its published cursor');
/** Participant-only terminal facts. Never derive these reasons from a sampled drawing or clock. */
export const FoodTaskOutcomeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('DELIVERED'), at: TimestampSchema,
    dosesAdded: z.literal(FOOD_TASK_PARAMETERS.deliveryDoses) }),
  z.strictObject({ kind: z.literal('LOST'), at: TimestampSchema,
    reason: z.enum(['TIME', 'CRATE_BROKEN_NO_FETCHER', 'NOT_OVER_PLATFORM']) }),
  z.strictObject({ kind: z.literal('CANCELLED'), at: TimestampSchema,
    reason: z.literal('DISCONNECT'), disconnectedSeatId: SeatIdSchema }),
]);
export type FoodTaskOutcome = z.infer<typeof FoodTaskOutcomeSchema>;
export const FoodTaskParticipantSchema = z.strictObject({ foodStepId: IdentifierSchema, round: PlanetRoundSchema,
  taskId: IdentifierSchema, revision: RevisionSchema,
  controlRevision: RevisionSchema, participantSeatIds: pair, winchSeatId: SeatIdSchema, panelSeatId: SeatIdSchema,
  selfControl: FoodTaskControlSchema, controlSessionId: IdentifierSchema,
  startedAt: TimestampSchema, runningAt: TimestampSchema, deadlineAt: TimestampSchema, returnsAt: TimestampSchema,
  stage: z.enum(['BRIEFING', 'ACTIVE', 'ENDED']),
  people: z.array(z.strictObject({ seatId: SeatIdSchema, alive: z.boolean(), online: z.boolean(), keyTurned: z.boolean(),
    death: z.strictObject({ at: TimestampSchema, mechanism: z.enum(['CUT', 'DROP']), actorSeatId: SeatIdSchema }).nullable()
  }).refine(v => v.alive === (v.death === null), 'Persistent death accompanies an eliminated participant')).length(2),
  panel, crate, ownGesture: FoodTaskGestureViewSchema.nullable(),
  ownReturnPlacement: placement.refine(v => ['Room A','Room B','Command Room'].includes(v.location), 'Task return stays outside Hospital/Jail').optional(),
  broken: z.array(z.strictObject({ crateId: IdentifierSchema, at: TimestampSchema, x: railX,
    landing: z.enum(['DECK', 'CONSOLE', 'PLATFORM']), motion }).refine(v => v.motion.easing === 'CUBIC_IN'
      && v.motion.toHeight === FOOD_TASK_VERTICAL[v.landing.toLowerCase() as 'deck' | 'console' | 'platform'],
      'Broken crate fall ends at its named surface on the shared axis')).max(64),
  events: eventWindow,
  outcome: FoodTaskOutcomeSchema.nullable(),
}).superRefine((v, ctx) => {
  const issue = (ok: boolean, message: string) => { if (!ok) ctx.addIssue({ code: 'custom', message }); };
  issue(v.runningAt - v.startedAt === FOOD_TASK_PARAMETERS.briefingMs
    && v.deadlineAt - v.startedAt === FOOD_TASK_PARAMETERS.taskMs
    && v.returnsAt - v.startedAt === FOOD_TASK_PARAMETERS.returnMs, 'Exact authoritative Task clock required');
  issue(v.winchSeatId !== v.panelSeatId && v.participantSeatIds.includes(v.winchSeatId)
    && v.participantSeatIds.includes(v.panelSeatId), 'Assignments are the exact pair');
  issue(new Set(v.people.map(p => p.seatId)).size === 2 && v.people.every(p => v.participantSeatIds.includes(p.seatId)), 'Exact participant status pair required');
  issue(v.people.every(p => !p.death || p.death.at >= v.runningAt && p.death.at <= v.deadlineAt
    && p.seatId === (p.death.mechanism === 'CUT' ? v.winchSeatId : v.panelSeatId)
    && p.death.actorSeatId === (p.death.mechanism === 'CUT' ? v.panelSeatId : v.winchSeatId)
    && p.death.at <= (v.outcome?.at ?? v.deadlineAt)),
    'Persistent death records its original pair-bound mechanism and time');
  issue((v.stage === 'ENDED') === (v.outcome !== null), 'Private terminal status must have one outcome');
  issue(v.outcome === null || v.outcome.at >= v.startedAt && v.outcome.at <= v.deadlineAt, 'Outcome belongs to Task interval');
  if (v.outcome?.kind === 'LOST' && v.outcome.reason === 'TIME')
    issue(v.outcome.at === v.deadlineAt, 'Timeout is the original Task deadline');
  if (v.outcome?.kind === 'CANCELLED') {
    const disconnected = v.outcome.disconnectedSeatId;
    issue(v.participantSeatIds.includes(disconnected) && v.people.some(p => p.seatId === disconnected && p.alive),
      'Cancellation names a living participant whose absence expired');
    issue(v.outcome.at >= v.startedAt + FOOD_TASK_PARAMETERS.presenceGraceMs,
      'Cancellation cannot precede the full presence grace');
  }
  issue(v.selfControl === 'WINCH' ? v.ownGesture !== null && v.ownGesture.controlSessionId === v.controlSessionId
    : v.ownGesture === null, 'Own Winch recovery state is complete; Panel has none');
  if (v.ownGesture) issue((v.crate.holder === 'WINCH') === (v.ownGesture.currentHolder !== null)
    && (v.ownGesture.currentHolder === null || v.ownGesture.currentHolder.crateId === v.crate.id),
    'Recovered owner matches actual current crate custody');
  issue(v.events.events.every(e => (!('seatId' in e) || v.participantSeatIds.includes(e.seatId))
    && (!('actorSeatId' in e) || v.participantSeatIds.includes(e.actorSeatId))
    && (!('victimSeatId' in e) || e.actorSeatId !== e.victimSeatId && e.actorSeatId === (e.mechanism === 'CUT' ? v.panelSeatId : v.winchSeatId)
      && e.victimSeatId === (e.mechanism === 'CUT' ? v.winchSeatId : v.panelSeatId))
    && e.at >= v.startedAt && e.at <= v.returnsAt), 'Task events belong to the pair and its interval');
  issue(v.events.events.every(e => e.kind !== 'ELIMINATED' || v.people.some(p => p.seatId === e.victimSeatId
    && p.death?.at === e.at && p.death.mechanism === e.mechanism && p.death.actorSeatId === e.actorSeatId)),
    'Retained elimination cues agree with persistent death facts');
  if (v.outcome?.kind === 'DELIVERED') issue(v.crate.state === 'SENT' && v.crate.motion?.startedAt === v.outcome.at,
    'Delivery and its persisted descent share the original terminal time');
  const w = v.panel.warning;
  issue(!w || w.startsAt < w.endsAt && w.actorSeatId === (w.mechanism === 'CUT' ? v.panelSeatId : v.winchSeatId)
    && w.victimSeatId === (w.mechanism === 'CUT' ? v.winchSeatId : v.panelSeatId), 'Warning describes its visible mechanism, never a defense cause');
});
export type FoodTaskParticipant = z.infer<typeof FoodTaskParticipantSchema>;
const viewContext = { schemaVersion: z.literal(1), versions: FoodTaskVersionsSchema, matchId: IdentifierSchema,
  round: PlanetRoundSchema, phaseId: IdentifierSchema, viewRevision: RevisionSchema, serverNowMs: TimestampSchema,
  playerCount: z.union([z.literal(7), z.literal(8), z.literal(9)]), rosterSeatIds: ids,
  turnEnds: z.array(FoodTaskTurnEndSchema).max(18) };
function validRoster(v: { playerCount: number; rosterSeatIds: string[] }): boolean {
  return v.rosterSeatIds.length === v.playerCount
    && v.rosterSeatIds.every((id, i) => id === `seat-${i + 1}`);
}
function validTurnEnds(v: { round: number; serverNowMs: number; rosterSeatIds: string[]; turnEnds: z.infer<typeof FoodTaskTurnEndSchema>[] }): boolean {
  return new Set(v.turnEnds.map(t => t.id)).size === v.turnEnds.length
    && new Set(v.turnEnds.map(t => `${t.round}:${t.seatId}`)).size === v.turnEnds.length
    && v.turnEnds.every((t, i) => t.round <= v.round && t.endedAt <= v.serverNowMs && v.rosterSeatIds.includes(t.seatId)
      && (i === 0 || t.order > v.turnEnds[i - 1]!.order && t.endedAt >= v.turnEnds[i - 1]!.endedAt));
}
export const FoodTaskPublicViewSchema = z.strictObject({ ...viewContext, audience: z.literal('public'),
  step: FoodTaskPublicStepSchema.nullable(), stock: FoodTaskStockSchema,
}).refine(v => v.stock.basis === 'FINALIZED' && v.stock.publicationRound <= v.round,
  'Shared food is finalized, never speculative').refine(validRoster, 'Canonical roster includes away participants')
  .refine(validTurnEnds, 'Ordered once-only ordinary completions required')
  .refine(v => v.step === null || v.step.startedAt <= v.serverNowMs, 'Step has actually started')
  .refine(v => v.turnEnds.every(t => t.placement === null), 'Neutral public turn timing carries no speculative placement')
  .refine(v => v.step?.kind !== 'AWAY' || v.step.awaySeatIds.every(id => v.rosterSeatIds.includes(id)), 'Away seats remain in the canonical roster');
export const FoodTaskPlayerViewSchema = z.strictObject({ ...viewContext, audience: z.literal('player'), seatId: SeatIdSchema,
  step: FoodTaskPublicStepSchema.nullable(), stock: FoodTaskStockSchema, ownAvailability: FoodTaskAvailabilitySchema,
  partnerChoices: z.array(partnerChoice).min(6).max(8), requestClosures: z.array(FoodTaskRequestClosureSchema).max(9),
  invitation: FoodTaskRequestViewSchema.nullable(), participantTask: FoodTaskParticipantSchema.nullable(),
  offers: z.array(FoodTaskOfferSchema).max(4),
  privateCursor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  ownMeals: z.array(FoodTaskMealSchema).max(9),
}).superRefine((v, ctx) => {
  const issue = (ok: boolean, message: string) => { if (!ok) ctx.addIssue({ code: 'custom', message }); };
  issue(validRoster(v) && v.rosterSeatIds.includes(v.seatId), 'Own seat and away players remain in the canonical roster');
  issue(validTurnEnds(v), 'Ordered once-only ordinary completions required');
  issue(v.stock.basis === 'PLAYER_CURRENT' && v.stock.publicationRound <= v.round, 'Player food belongs to the authorized current reality');
  issue(v.step?.kind !== 'AWAY' || v.step.awaySeatIds.every(id => v.rosterSeatIds.includes(id)), 'Away seats belong to the roster');
  issue(v.step === null || v.step.startedAt <= v.serverNowMs, 'Step has actually started');
  if (v.step?.kind === 'AWAY')
    issue(v.partnerChoices.every(p => !p.available && p.reason === 'NOT_AVAILABLE_NOW'),
      'Partner choices stay uniformly unavailable through common return');
  if (v.step?.kind === 'AWAY') issue(!v.ownAvailability.canAsk && v.ownAvailability.reason === 'TASK_ALREADY_STARTED',
    'AWAY availability cannot reveal private Task changes');
  issue(v.partnerChoices.length === v.playerCount - 1 && v.partnerChoices.every((p, i) => p.seatId === v.rosterSeatIds.filter(id => id !== v.seatId)[i]),
    'Every other original seat has a server-authored Partner state');
  issue(new Set(v.requestClosures.map(c => c.requestId)).size === v.requestClosures.length
    && v.requestClosures.every(c => [c.volunteerSeatId, c.partnerSeatId].includes(v.seatId)
      && [c.volunteerSeatId, c.partnerSeatId].every(id => v.rosterSeatIds.includes(id))
      && c.round <= v.round && c.closedAt <= v.serverNowMs), 'Original request closures stay pair-private and occurred');
  issue(!v.invitation || [v.invitation.volunteerSeatId, v.invitation.partnerSeatId].includes(v.seatId), 'Invitation is pair-private');
  issue(!v.invitation || [v.invitation.volunteerSeatId, v.invitation.partnerSeatId].every(id => v.rosterSeatIds.includes(id)), 'Invitation uses original seats');
  issue(!v.invitation || v.invitation.askedAt <= v.serverNowMs && v.invitation.foodStepId === v.step?.stepId
    && v.invitation.round === v.round, 'Invitation belongs to this original step and round');
  const t = v.participantTask;
  issue(!t || t.participantSeatIds.includes(v.seatId), 'Task scene is participant-only');
  if (t) {
    issue(t.selfControl === (t.winchSeatId === v.seatId ? 'WINCH' : 'PANEL'), 'Own assigned control required');
    issue(v.step?.kind === 'AWAY' && v.step.startedAt === t.startedAt && v.step.returnsAt === t.returnsAt
      && t.foodStepId === v.step.stepId && t.round === v.round
      && v.step.awaySeatIds.every(id => t.participantSeatIds.includes(id)), 'Task and common absence interval agree');
    issue(t.events.events.every(e => e.at <= v.serverNowMs) && (!t.outcome || t.outcome.at <= v.serverNowMs), 'Task occurrences are not future predictions');
    issue(t.people.every(p => !p.death || p.death.at <= v.serverNowMs), 'Death detail has already occurred');
    issue(t.panel.anchorAt <= v.serverNowMs && t.panel.blade.changedAt <= v.serverNowMs && t.crate.anchorAt <= v.serverNowMs,
      'Current motion/blade anchors are not future occurrences');
    issue(new Set(t.broken.map(b => b.crateId)).size === t.broken.length
      && t.broken.every(b => b.at >= t.startedAt && b.at <= v.serverNowMs), 'Broken crate evidence is once-only and already occurred');
  }
  issue(v.ownMeals.every(m => m.seatId === v.seatId && m.round <= v.round && m.endedAt <= v.serverNowMs), 'Only own occurred meal evidence');
  issue(new Set(v.ownMeals.map(m => m.id)).size === v.ownMeals.length, 'Meal IDs are distinct');
  issue(new Set(v.ownMeals.map(m => m.round)).size === v.ownMeals.length, 'Own ordinary meal is at most once per round');
  for (const o of v.offers) {
    if (o.type === 'TASK_ASK') issue(v.step?.kind === 'ASKING' && v.serverNowMs < v.step.askingEndsAt
      && !v.step.someoneAsking && !o.partnerSeatIds.includes(v.seatId) && o.partnerSeatIds.every(id => v.rosterSeatIds.includes(id))
      && v.ownAvailability.canAsk, 'Ask is own eligible offer');
    if (o.type === 'TASK_ASK') issue(JSON.stringify(o.partnerSeatIds) === JSON.stringify(v.partnerChoices.filter(p => p.available).map(p => p.seatId)),
      'Enabled Partner choices exactly match the server offer');
    if (o.type === 'TASK_ANSWER' || o.type === 'TASK_ASK_WITHDRAW') {
      const r = v.invitation;
      issue(r !== null && r.state === 'PENDING' && r.requestId === o.requestId && r.revision === o.requestRevision
        && v.step?.kind === 'ASKING' && v.serverNowMs >= r.askedAt && v.serverNowMs < r.answerEndsAt
        && (o.type === 'TASK_ANSWER' ? r.partnerSeatId : r.volunteerSeatId) === v.seatId, 'Request offer is actor-bound');
    }
    if (o.type === 'TASK_PRESS') issue(t !== null && t.taskId === o.taskId && t.controlSessionId === o.controlSessionId
      && t.stage !== 'ENDED' && t.people.some(p => p.seatId === v.seatId && p.alive)
      && v.serverNowMs < t.deadlineAt && t.controlRevision === o.controlRevision
      && o.crateId === t.crate.id
      && o.inputs.every(k => (k === 'HOLD' || v.serverNowMs >= t.runningAt)
        && (k === 'KEY' || (k === 'HOLD') === (t.selfControl === 'WINCH'))),
      'Press offer belongs to own Task control');
  }
  issue(v.ownAvailability.canAsk === v.offers.some(o => o.type === 'TASK_ASK'), 'Ask availability matches its offer');
});
export type FoodTaskPublicView = z.infer<typeof FoodTaskPublicViewSchema>;
export type FoodTaskPlayerView = z.infer<typeof FoodTaskPlayerViewSchema>;

/** Hash/art binding is supplied by the reviewed match, never accepted from a client claim. */
export function parseFoodTaskView(payload: unknown, expected: { matchId: string; seatId: z.infer<typeof SeatIdSchema> | null;
  versions: FoodTaskVersions; phaseId: string; round: number; serverNowMs: number }): FoodTaskPublicView | FoodTaskPlayerView {
  const value = expected.seatId === null ? FoodTaskPublicViewSchema.parse(payload) : FoodTaskPlayerViewSchema.parse(payload);
  if (value.matchId !== expected.matchId || JSON.stringify(value.versions) !== JSON.stringify(FoodTaskVersionsSchema.parse(expected.versions))
    || value.phaseId !== expected.phaseId || value.round !== expected.round || value.serverNowMs !== expected.serverNowMs
    || value.audience === 'player' && value.seatId !== expected.seatId) throw Error('Food Task match, version, phase, clock or audience mismatch');
  return value;
}
/** Transport time changes every poll and is excluded from the audience revision body only. */
export function foodTaskRevisionBody(view: FoodTaskPublicView | FoodTaskPlayerView): Omit<FoodTaskPublicView | FoodTaskPlayerView, 'serverNowMs'> {
  const { serverNowMs: _clock, ...body } = view;
  return body;
}

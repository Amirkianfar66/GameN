import { FoodTaskPlayerViewSchema, FOOD_TASK_PARAMETERS as P } from '@mothership/contracts';
import type { FoodTaskCommand, FoodTaskParticipant, FoodTaskPlayerView } from '@mothership/contracts';

/** Candidate-only cooperation heuristic, never an engine transition or balance model. */
export interface FoodBotDecision {
  readonly command: FoodTaskCommand | null;
  /** A request to reproject at/after this server time, not permission to backdate a later input. */
  readonly nextWakeAt: number | null;
}
const idle = (nextWakeAt: number | null = null): FoodBotDecision => ({ command: null, nextWakeAt });
const suggest = (command: FoodTaskCommand): FoodBotDecision => ({ command, nextWakeAt: null });
const fold = (u: number): number => {
  const k = ((u % 12) + 12) % 12;
  return k <= 6 ? k : 12 - k;
};
const clickMs = P.snapMs + P.restMs;

/** The approved panel anchor's current LOCK destination, not a server eligibility calculation. */
function panelClick(t: FoodTaskParticipant, at: number): { stop: number; beganAt: number } {
  const p = t.panel;
  const n = Math.floor(Math.max(0, at - p.anchorAt) / clickMs);
  const start = p.direction === 1 ? p.stop : 12 - p.stop;
  return { stop: fold(start + n + 1), beganAt: p.anchorAt + n * clickMs };
}
function nextPanelWindow(t: FoodTaskParticipant, at: number, goal: number): number {
  const current = panelClick(t, at);
  // A full warning margin remains at the start of a click. If missed, wait for the next pass.
  for (let n = 0; n <= 12; n++) {
    const wake = current.beganAt + n * clickMs;
    if (wake > at && panelClick(t, wake).stop === goal) return wake;
  }
  return t.deadlineAt;
}
function crateX(t: FoodTaskParticipant, at: number): number {
  const s = t.panel.swing;
  if (!s) return t.panel.stop;
  const dt = Math.max(0, at - s.startedAt);
  const amplitude = P.leastAmplitude + (s.amplitude - P.leastAmplitude) * Math.exp(-dt / P.swingSettleMs);
  return t.panel.stop + s.direction * amplitude * Math.sin(2 * Math.PI * dt / P.swingPeriodMs);
}
/** Advisory margin copied from the reviewed hint policy. The engine still decides on admission. */
function safeReleaseWindow(t: FoodTaskParticipant, at: number): boolean {
  if (!t.panel.locked || t.panel.stop !== 5) return false;
  for (let dt = 0; dt <= P.warningMs; dt += 10)
    if (Math.abs(crateX(t, at + dt) - 5) > P.platformHalfWidth - 0.01) return false;
  return true;
}
function nextReleaseWindow(t: FoodTaskParticipant, now: number): number {
  for (let dt = 10; dt <= 2 * P.swingPeriodMs; dt += 10)
    if (safeReleaseWindow(t, now + dt)) return now + dt;
  return t.deadlineAt;
}

/**
 * Uses exactly one authorized candidate Food view. No role, RNG, full state, pooled knowledge,
 * wall clock, actor identity or command IDs are accepted. The caller validates exact reviewed
 * versions/hash/art, persists a stable command and reconciles its receipt before proposing again.
 * A suggested command is revalidated by the authoritative adapter at durable admission time.
 */
export function chooseFoodBotInput(input: FoodTaskPlayerView): FoodBotDecision {
  if (arguments.length !== 1) throw new TypeError('Food bot requires exactly one authorized view');
  const v = FoodTaskPlayerViewSchema.parse(input);
  const now = v.serverNowMs;
  const answer = v.offers.find(o => o.type === 'TASK_ANSWER');
  if (answer) return suggest({ type: 'TASK_ANSWER', requestId: answer.requestId,
    requestRevision: answer.requestRevision, answer: 'JOIN' });
  const ask = v.offers.find(o => o.type === 'TASK_ASK');
  if (ask) {
    // Rotate through the offered canonical roster. The service may prioritize an
    // eligible human using its existing public member-controller metadata.
    const own = v.rosterSeatIds.indexOf(v.seatId);
    const ordered = [...v.rosterSeatIds.slice(own + 1), ...v.rosterSeatIds.slice(0, own)];
    return suggest({ type: 'TASK_ASK', partnerSeatId: ordered.find(id => ask.partnerSeatIds.includes(id))! });
  }

  const t = v.participantTask;
  if (!t) return idle(v.invitation?.state === 'PENDING' && v.invitation.answerEndsAt > now
    ? v.invitation.answerEndsAt : null);
  const me = t.people.find(p => p.seatId === v.seatId)!;
  if (t.stage === 'ENDED' || now >= t.deadlineAt || !me.alive || !me.online) return idle();
  const offer = v.offers.find(o => o.type === 'TASK_PRESS');
  const can = (kind: 'HOLD' | 'PANEL_RELEASE' | 'PANEL_LOCK' | 'KEY'): boolean => offer?.inputs.includes(kind) === true;
  const wake = (at: number): FoodBotDecision => idle(Math.min(t.deadlineAt, Math.max(now + 1, at)));
  const press = (input: Extract<FoodTaskCommand, { type: 'TASK_PRESS' }>['input']): FoodBotDecision => suggest({
    type: 'TASK_PRESS', taskId: t.taskId, controlSessionId: t.controlSessionId,
    expectedControlRevision: t.controlRevision, input,
  });
  const g = t.ownGesture;

  // A later pending contact must be closed independently before the actual holder's UP.
  // UP uses that exact contact's binding. Never replace it with highestSequence or the new crate.
  if (g?.pendingIntent && (g.currentHolder || g.pendingIntent.crateId !== null && g.pendingIntent.crateId !== t.crate.id))
    return press({ kind: 'HOLD', edge: 'UP', gestureSequence: g.pendingIntent.sequence, crateId: null });
  if (t.stage === 'BRIEFING') return wake(t.runningAt);
  if (t.crate.state === 'LANDED') return !me.keyTurned && can('KEY') ? press({ kind: 'KEY' }) : idle(t.deadlineAt);
  if (t.crate.state === 'SENT') return idle();
  if (t.crate.motion && now < t.crate.motion.endsAt) return wake(t.crate.motion.endsAt);

  if (t.selfControl === 'WINCH') {
    if (!g) throw new TypeError('Winch projection lacks own gesture');
    if (g.currentHolder) {
      if (t.crate.state !== 'HELD' || !t.panel.locked || t.panel.stop !== 5)
        return idle(t.panel.locked ? t.deadlineAt : Math.min(t.deadlineAt, panelClick(t, now).beganAt + clickMs));
      if (!safeReleaseWindow(t, now)) return wake(nextReleaseWindow(t, now));
      // Release/recovery never depend on a still-visible DOWN offer.
      return press({ kind: 'HOLD', edge: 'UP', gestureSequence: g.currentHolder.sequence, crateId: g.currentHolder.crateId });
    }
    // An admitted held contact auto-acquires at a future eligible boundary. Do not add another DOWN.
    if (g.pendingIntent) return idle(t.deadlineAt);
    const take = t.crate.state === 'BRAKED' || t.crate.state === 'INTAKE' && t.panel.locked && t.panel.stop === 0;
    if (take && can('HOLD') && g.highestSequence < Number.MAX_SAFE_INTEGER)
      return press({ kind: 'HOLD', edge: 'DOWN', gestureSequence: g.highestSequence + 1, crateId: t.crate.id });
    return idle(t.deadlineAt);
  }

  if (t.crate.state !== 'INTAKE' && t.crate.holder !== 'WINCH') return idle(t.deadlineAt);
  const goal = t.crate.state === 'INTAKE' ? 0 : 5;
  if (t.panel.locked) return t.panel.stop !== goal && can('PANEL_RELEASE') ? press({ kind: 'PANEL_RELEASE' }) : idle(t.deadlineAt);
  const click = panelClick(t, now);
  if (click.stop === goal && now - click.beganAt <= clickMs - P.warningMs && can('PANEL_LOCK'))
    return press({ kind: 'PANEL_LOCK' });
  return wake(nextPanelWindow(t, now, goal));
}

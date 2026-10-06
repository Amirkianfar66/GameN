// mothership:dev-only
//
// A scripted stand-in for the backend, for development and tests only. It is NOT an
// engine and decides nothing: it replays the authored contract fixture and a few
// frontend-authored variations of it in a fixed order. Nothing here is a claim about
// how the real server sequences a match.
//
// Its command desk follows the command contract as the integration owner has stated it
// for wire protocol 1 (docs/backend/contract-review-response.md on the backend branch,
// items FE-C01 to FE-C03): receipts are durable for accepted and rejected commands alike,
// the identical command gets its original receipt back before phase or time is looked at,
// the same identifier with another payload conflicts, and a command for a phase that is
// not open is rejected. Beyond that it applies no game rule. It never judges a target.
//
// Presentation events follow what the integration owner has proposed for delivering them
// (the same document, FE-C04 and FE-C11): each audience has a stream of its own, an event
// is written together with the view it belongs to, and the stream is kept, so whoever
// subscribes later is handed all of it again. Whether an event or its view arrives first is
// not promised, and the operator can arrange either order.
//
// The whole authored fixture, including its server-only truth, stays inside this module.
// Only audience views and events leave it, and only to the audience they were made for.

import { ReceiptLookupRequestSchema, RegisterShotSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

export const AUDIENCES = ['public', 'seat-1', 'seat-2'];
const AUTHORED = { public: 'public', 'seat-1': 'officer', 'seat-2': 'target' };

/**
 * officer-turn and registered are the authored contract fixture, unmodified apart from
 * the clock. next-turn and resolution are frontend-authored so the shells can be seen
 * in a phase other than the Officer's turn; they show no outcome of any kind. Each of the
 * two comes with a frontend-authored phase-change event for every audience.
 */
export const STEPS = [
  { id: 'officer-turn', source: 'authored contract fixture: before', label: 'Player 1’s ordinary turn' },
  { id: 'registered', source: 'authored contract fixture: afterRegistration', label: 'A hidden registration (only Player 1’s own view changes)' },
  { id: 'next-turn', source: 'frontend-authored synthetic view', label: 'Player 2’s ordinary turn' },
  { id: 'resolution', source: 'frontend-authored synthetic view', label: 'Round resolution (no outcome shown: recipients undecided, RULE-003)' },
];

/**
 * What the operator can arrange for the next command request. Each is used once.
 *   scripted             the desk's own answer (see decide below)
 *   reject-not-allowed   a stored rejection receipt
 *   reject-phase-closed  a stored rejection receipt
 *   lose-acknowledgment  decided and stored as scripted, but the answer never arrives
 *   drop-request         lost on the way: the desk never sees it and nothing is stored
 *   unavailable          the contract's "try again later" error; this double then stores
 *                        nothing, though a real server giving that answer may have
 *   slow                 the request takes a while to arrive; nothing is decided until it
 *                        does, and it is then answered as scripted
 */
export const COMMAND_PLANS = ['scripted', 'reject-not-allowed', 'reject-phase-closed', 'lose-acknowledgment', 'drop-request', 'unavailable', 'slow'];
export const SLOW_ANSWER_MS = 2_500;

/**
 * Public facts the operator can ask for at any point of the script, so that a public move
 * and a public status change can be seen on the screens. Frontend-authored and synthetic:
 * the seats, the places and the status are fixed here, follow no rule and are the outcome
 * of nothing. Two bystanders are used, never the scripted shot's actor or target.
 *   move    Player 8 goes to the other of Room A and Room B
 *   status  Player 9's public health goes to the other of Healthy and Injured
 */
export const SYNTHETIC_FACTS = ['move', 'status'];
const MOVING_SEAT = 'seat-8';
const STATUS_SEAT = 'seat-9';
/** Which of a view and the events written with it a feed delivers first. */
export const EVENT_ORDERS = ['view-first', 'event-first'];
export const EVENT_INJECTIONS = ['incompatible-protocol', 'unreadable', 'other-audience'];

const clone = value => JSON.parse(JSON.stringify(value));
const isPlayerAudience = audience => audience === 'seat-1' || audience === 'seat-2';

/**
 * @param {object} [options]
 * @param {() => number} [options.now] Real elapsed-time source in milliseconds.
 * @param {'protected' | 'unprotected'} [options.variant] Differs only in server-only truth.
 * @param {number} [options.slowAnswerMs] How long a deliberately slow command request is on its way.
 */
export function createScenario({ now = Date.now, variant = 'protected', slowAnswerMs = SLOW_ANSWER_MS } = {}) {
  const subscribers = new Map(AUDIENCES.map(audience => [audience, new Set()]));
  const connected = new Map(AUDIENCES.map(audience => [audience, true]));
  let fixture;
  let views;
  let stepIndex;
  let realStart;
  let virtualStart;
  let skippedMs;
  // The command desk. Receipts are kept per seat and command identifier.
  let receipts;
  let commandPlan;
  let commandService;
  let lastReceipt;
  // Each audience's stream of presentation events, kept for the life of the script.
  let events;
  let injectedCount;
  let eventOrder;

  // The fixture's timestamps are fixed far from today's date. Server time here starts at
  // the authored phase start and then runs in real time, so a client that used its own
  // clock instead of the server's would show nonsense.
  const serverTimeMs = () => virtualStart + (now() - realStart) + skippedMs;

  function load(nextVariant) {
    fixture = createOfficerFixture(nextVariant);
    variant = nextVariant;
    stepIndex = 0;
    realStart = now();
    virtualStart = fixture.before.public.phase.startedAt;
    skippedMs = 0;
    views = Object.fromEntries(AUDIENCES.map(audience => [audience, clone(fixture.before[AUTHORED[audience]])]));
    receipts = new Map();
    commandPlan = 'scripted';
    commandService = 'answering';
    lastReceipt = null;
    events = new Map(AUDIENCES.map(audience => [audience, []]));
    injectedCount = 0;
    eventOrder = 'view-first';
  }

  // An event is numbered within its own audience's stream and by nothing else. A count
  // shared between streams would show every audience, as a gap in its own numbers, that
  // something had been written for somebody else.
  function record(audience, fact) {
    const view = views[audience];
    const stream = events.get(audience);
    const event = { protocolVersion: 1, matchId: view.matchId, eventId: `fixture-event-${stream.length + 1}`, audience: clone(view.audience), viewRevision: view.viewRevision, fact: clone(fact) };
    stream.push(event);
    return event;
  }

  // factsFor names the facts to put on an audience's stream with its new view.
  function publish(next, factsFor = () => []) {
    for (const audience of AUDIENCES) {
      const changed = JSON.stringify(next[audience]) !== JSON.stringify(views[audience]);
      views[audience] = next[audience];
      // Like the real backend, write only the documents that changed. An untouched
      // audience hears nothing, which is what makes a hidden action hidden.
      if (!changed) continue;
      const written = factsFor(audience).map(fact => record(audience, fact));
      if (!connected.get(audience)) continue;
      for (const subscriber of [...subscribers.get(audience)]) send(subscriber, views[audience], written);
    }
  }

  // A view and events for one subscriber, in the order the operator arranged.
  function send(subscriber, view, stream) {
    const sendView = () => subscriber.onPayload(clone(view));
    const sendEvents = () => {
      for (const event of stream) subscriber.onEventPayload?.(clone(event));
    };
    if (eventOrder === 'event-first') {
      sendEvents();
      sendView();
    } else {
      sendView();
      sendEvents();
    }
  }

  // What a feed delivers as it comes up: the current view, and all its stream still holds.
  function greet(audience, subscriber) {
    subscriber.onConnectionChange('connected');
    send(subscriber, views[audience], events.get(audience));
  }

  function deliver(audience, payload) {
    for (const subscriber of [...subscribers.get(audience)]) subscriber.onPayload(clone(payload));
  }
  function deliverEvent(audience, payload) {
    for (const subscriber of [...subscribers.get(audience)]) subscriber.onEventPayload?.(clone(payload));
  }

  function derive(change) {
    return Object.fromEntries(AUDIENCES.map(audience => {
      const view = clone(views[audience]);
      view.viewRevision += 1;
      change(view);
      return [audience, view];
    }));
  }

  // Moves the script to a step: every audience's new view, and the facts for its stream.
  function enter(step) {
    if (step.id === 'registered') {
      // The authored events of this step: one for the Officer, none for anyone else. The
      // fact is the authored one; the envelope is numbered by this script.
      publish(
        Object.fromEntries(AUDIENCES.map(audience => [audience, clone(fixture.afterRegistration[AUTHORED[audience]])])),
        audience => fixture.afterRegistration[`${AUTHORED[audience]}Events`].map(event => event.fact),
      );
      return;
    }
    // A turn's minute starts when the phase actually opens, not when the last one was due.
    const startedAt = Math.round(serverTimeMs());
    const phase = step.id === 'next-turn'
      ? { id: 'phase-b', kind: 'ORDINARY_TURN', startedAt, endsAt: startedAt + 60_000 }
      : { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt, endsAt: null };
    publish(
      derive(view => {
        view.phase = phase;
        view.activeSeatId = step.id === 'next-turn' ? 'seat-2' : null;
      }),
      // Frontend-authored, like the views of these two steps.
      () => [{ type: 'PHASE_CHANGED', phaseId: phase.id }],
    );
  }

  const answer = body => ({ answered: true, body });
  const failure = code => ({ ok: false, serverTimeMs: Math.round(serverTimeMs()), error: { code } });

  // The checks a request passes before anything about the match is read.
  function admit(audience, payload, schema) {
    if (typeof payload === 'object' && payload !== null && typeof payload.protocolVersion === 'number' && payload.protocolVersion !== 1) return { refused: failure('UNSUPPORTED_PROTOCOL') };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return { refused: failure('INVALID_REQUEST') };
    // The table display has no command and no receipt; neither has a seat of another match.
    if (!isPlayerAudience(audience) || parsed.data.matchId !== views.public.matchId) return { refused: failure('FORBIDDEN') };
    return { request: parsed.data };
  }

  function decide(audience, request, plan) {
    const base = { protocolVersion: 1, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId };
    const reject = code => ({ ...base, status: 'rejected', code });
    const phase = views.public.phase;
    // Stated contract behavior, not a rule judgement: a command belongs to the phase that is open now.
    if (plan === 'reject-phase-closed' || request.phaseId !== phase.id || phase.endsAt === null || serverTimeMs() >= phase.endsAt) return reject('PHASE_CLOSED');
    if (plan === 'reject-not-allowed') return reject('NOT_ALLOWED');
    // The script holds one registration: by the seat whose own authored view calls a shot
    // available, on its own ordinary turn. The target is not judged. This is not an engine.
    const view = views[audience];
    const scripted = view.self.shotAvailable && view.phase.kind === 'ORDINARY_TURN' && view.activeSeatId === view.self.seatId;
    return scripted ? { ...base, status: 'accepted', code: 'REGISTERED' } : reject('NOT_ALLOWED');
  }

  // A command request reaching the desk.
  function arrive(audience, payload, plan) {
    const admitted = admit(audience, payload, RegisterShotSchema);
    if (admitted.refused) return answer(admitted.refused);
    if (plan === 'unavailable') return answer(failure('UNAVAILABLE'));
    const { request } = admitted;
    const key = `${audience} ${request.commandId}`;
    const digest = JSON.stringify([request.protocolVersion, request.matchId, request.phaseId, request.commandId, request.command.type, request.command.targetSeatId]);
    const stored = receipts.get(key);
    let receipt;
    if (stored !== undefined) {
      // The same identifier again. Another payload conflicts and leaves the original alone;
      // the identical command gets its original receipt, before any look at phase or time.
      if (stored.digest !== digest) return answer(failure('COMMAND_ID_CONFLICT'));
      receipt = stored.receipt;
    } else {
      receipt = decide(audience, request, plan);
      receipts.set(key, { digest, receipt });
      lastReceipt = { audience, status: receipt.status, code: receipt.code };
      if (receipt.status === 'accepted') register(audience, request.commandId);
    }
    if (plan === 'lose-acknowledgment') return { answered: false };
    return answer({ ok: true, serverTimeMs: Math.round(serverTimeMs()), receipt: clone(receipt) });
  }

  // Applies the authored registration to the actor's own view and to no other. For the
  // Officer on the first step this yields the authored afterRegistration view and the
  // authored registration fact, with the client's command identifier in place of the
  // authored one. Nothing is put on any other audience's stream.
  function register(audience, commandId) {
    const view = clone(views[audience]);
    view.viewRevision += 1;
    view.self.shotAvailable = false;
    view.ownPendingCommandIds = [commandId];
    if (stepIndex === 0) stepIndex = 1;
    publish({ ...views, [audience]: view }, () => [{ type: 'COMMAND_REGISTERED', commandId }]);
  }

  load(variant);

  const scenario = {
    serverTimeMs,
    step: () => STEPS[stepIndex],
    viewFor(audience) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      return clone(views[audience]);
    },
    isConnected: audience => connected.get(audience) === true,

    /**
     * Starts a feed. Reports the connection, then delivers the current view and every
     * event the audience's stream holds, as the transport contract allows.
     */
    subscribe(audience, subscriber) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      subscribers.get(audience).add(subscriber);
      if (connected.get(audience)) greet(audience, subscriber);
      return () => {
        subscribers.get(audience).delete(subscriber);
      };
    },

    /**
     * A command request from one seat. Returns { answered: true, body }; or
     * { answered: false } when the operator arranged for no answer to arrive; or
     * { answered: 'later', delayMs, resume } for a request that is slow to arrive, where
     * calling resume() after the delay gives one of the other two.
     */
    submitCommand(audience, payload) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      if (commandService === 'silent') return { answered: false };
      const plan = commandPlan;
      commandPlan = 'scripted';
      if (plan === 'drop-request') return { answered: false };
      // Still on its way. The desk has not seen it, so nothing is decided and no view changes.
      // When it arrives it is answered as scripted, whatever was arranged in the meantime
      // for a later request.
      if (plan === 'slow') return { answered: 'later', delayMs: slowAnswerMs, resume: () => (commandService === 'silent' ? { answered: false } : arrive(audience, payload, 'scripted')) };
      return arrive(audience, payload, plan);
    },
    /** A receipt lookup from one seat. It reads what is stored and changes nothing. */
    lookupReceipt(audience, payload) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      if (commandService === 'silent') return { answered: false };
      const admitted = admit(audience, payload, ReceiptLookupRequestSchema);
      if (admitted.refused) return answer(admitted.refused);
      const stored = receipts.get(`${audience} ${admitted.request.commandId}`);
      const serverTime = Math.round(serverTimeMs());
      return answer(stored === undefined ? { status: 'unknown', serverTimeMs: serverTime } : { status: 'found', serverTimeMs: serverTime, receipt: clone(stored.receipt) });
    },

    // Operator controls. They exist only in the development harness.
    /** Arranges what happens to the next command request. Used once, then back to scripted. */
    planNextCommand(plan) {
      if (!COMMAND_PLANS.includes(plan)) throw new RangeError(`Unknown command plan: ${plan}`);
      commandPlan = plan;
    },
    /** silent: command and receipt requests get no answer at all until switched back. Feeds are unaffected. */
    setCommandService(next) {
      if (next !== 'answering' && next !== 'silent') throw new RangeError(`Unknown command service state: ${next}`);
      commandService = next;
    },
    /**
     * Starts the script again as a new match session. A client rightly refuses to move
     * back to an older revision, so subscribers that can start over are told to; any
     * other subscriber must be recreated by its owner.
     */
    restart(nextVariant = variant) {
      load(nextVariant);
      for (const audience of AUDIENCES) {
        for (const subscriber of [...subscribers.get(audience)]) subscriber.onRestart?.();
      }
    },
    /** Moves to the next scripted step. Returns false at the end of the script. */
    advance() {
      if (stepIndex >= STEPS.length - 1) return false;
      stepIndex += 1;
      enter(STEPS[stepIndex]);
      return true;
    },
    /**
     * Ends the first turn without the scripted registration, going straight to the next
     * turn. Used to see what a phone does when the turn it acted in is over. Returns false
     * once the script is past that point.
     */
    endFirstTurn() {
      const next = STEPS.findIndex(step => step.id === 'next-turn');
      if (stepIndex >= next) return false;
      stepIndex = next;
      enter(STEPS[stepIndex]);
      return true;
    },
    /** One synthetic public fact, in every audience's view and on every audience's stream. See SYNTHETIC_FACTS. */
    synthetic(kind) {
      if (kind === 'move') {
        const from = views.public.seats.find(seat => seat.seatId === MOVING_SEAT).location;
        const to = from === 'Room B' ? 'Room A' : 'Room B';
        publish(derive(view => {
          view.seats.find(seat => seat.seatId === MOVING_SEAT).location = to;
        }), () => [{ type: 'PUBLIC_MOVE', seatId: MOVING_SEAT, from, to }]);
      } else if (kind === 'status') {
        const health = views.public.seats.find(seat => seat.seatId === STATUS_SEAT).health === 'Healthy' ? 'Injured' : 'Healthy';
        publish(derive(view => {
          view.seats.find(seat => seat.seatId === STATUS_SEAT).health = health;
        }), () => [{ type: 'PUBLIC_HEALTH_CHANGED', seatId: STATUS_SEAT, health }]);
      } else {
        throw new RangeError(`Unknown synthetic fact: ${kind}`);
      }
    },
    /** Arranges whether a feed delivers a view or the events written with it first. */
    setEventOrder(next) {
      if (!EVENT_ORDERS.includes(next)) throw new RangeError(`Unknown event order: ${next}`);
      eventOrder = next;
    },
    /** Lets server time pass at once, e.g. to the end of the current phase. Views are untouched. */
    skipTime(ms) {
      skippedMs += Math.max(0, ms);
    },
    skipToDeadline() {
      const { endsAt } = views.public.phase;
      if (endsAt !== null) scenario.skipTime(endsAt - serverTimeMs());
    },
    setConnected(audience, next) {
      if (connected.get(audience) === next) return;
      connected.set(audience, next);
      for (const subscriber of [...subscribers.get(audience)]) {
        if (next) greet(audience, subscriber);
        else subscriber.onConnectionChange('disconnected');
      }
    },
    /** Sends the current view again, unchanged. */
    redeliver(audience) {
      if (connected.get(audience)) deliver(audience, views[audience]);
    },
    /** Sends every event the audience's stream holds again, unchanged, as a listener that started over would get them. */
    redeliverEvents(audience) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      if (connected.get(audience)) for (const event of events.get(audience)) deliverEvent(audience, event);
    },
    /**
     * Sends something a correct backend never would, to exercise the client's defences.
     * One seat's view can be misdelivered to the other seat. It is never put on the public
     * feed, not even as a test: nothing private goes there under any control.
     */
    inject(audience, kind) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      if (kind === 'other-audience' && audience === 'public') throw new RangeError('A private view is never sent on the public feed');
      const payload = kind === 'incompatible-protocol' ? { ...clone(views[audience]), versions: { ...views[audience].versions, protocolVersion: 2 } }
        : kind === 'unreadable' ? { note: 'not an audience view' }
        : kind === 'other-audience' ? clone(views[audience === 'seat-1' ? 'seat-2' : 'seat-1'])
        : null;
      if (payload === null) throw new RangeError(`Unknown injection: ${kind}`);
      if (connected.get(audience)) deliver(audience, payload);
    },
    /**
     * The same for the event stream. Each is addressed to the view the audience has now,
     * so only the client's own checks keep it off the screen. An event shaped like the
     * other seat's registration can be misdelivered to a seat. It is never put on the
     * public stream, not even as a test.
     */
    injectEvent(audience, kind) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      if (kind === 'other-audience' && audience === 'public') throw new RangeError('A private event is never sent on the public stream');
      const view = views[audience];
      injectedCount += 1;
      const envelope = { protocolVersion: 1, matchId: view.matchId, eventId: `fixture-injected-${injectedCount}`, audience: clone(view.audience), viewRevision: view.viewRevision };
      const payload = kind === 'incompatible-protocol' ? { ...envelope, protocolVersion: 2, fact: { type: 'PHASE_CHANGED', phaseId: view.phase.id } }
        : kind === 'unreadable' ? { note: 'not a presentation event' }
        : kind === 'other-audience' ? { ...envelope, audience: { kind: 'player', seatId: audience === 'seat-1' ? 'seat-2' : 'seat-1' }, fact: { type: 'COMMAND_REGISTERED', commandId: 'fixture-misdelivered-command' } }
        : null;
      if (payload === null) throw new RangeError(`Unknown event injection: ${kind}`);
      if (connected.get(audience)) deliverEvent(audience, payload);
    },
    /** What the operator console may show. Deliberately excludes every server-only fact. */
    status() {
      return {
        fixtureOnly: true,
        variant,
        step: STEPS[stepIndex],
        stepNumber: stepIndex + 1,
        stepCount: STEPS.length,
        serverTimeMs: Math.round(serverTimeMs()),
        phase: clone(views.public.phase),
        connected: Object.fromEntries(connected),
        subscribers: Object.fromEntries(AUDIENCES.map(audience => [audience, subscribers.get(audience).size])),
        revisions: Object.fromEntries(AUDIENCES.map(audience => [audience, views[audience].viewRevision])),
        // No target and no command identifier: the console shows that the desk answered, not what a seat chose.
        commands: { service: commandService, next: commandPlan, receipts: receipts.size, last: lastReceipt === null ? null : { ...lastReceipt } },
        // How many events each stream holds, never what they say.
        events: { order: eventOrder, stored: Object.fromEntries(AUDIENCES.map(audience => [audience, events.get(audience).length])) },
      };
    },
  };
  return scenario;
}

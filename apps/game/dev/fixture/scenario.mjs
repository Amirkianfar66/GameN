// mothership:dev-only
//
// A scripted stand-in for the backend, for development and tests only. It is NOT an
// engine and decides nothing: it replays the authored contract fixture and a few
// frontend-authored variations of it in a fixed order. Nothing here is a claim about
// how the real server sequences a match.
//
// The whole authored fixture, including its server-only truth, stays inside this module.
// Only audience views leave it, and only to the audience they were authored for.

import { createOfficerFixture } from '@mothership/contracts/fixtures';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

export const AUDIENCES = ['public', 'seat-1', 'seat-2'];
const AUTHORED = { public: 'public', 'seat-1': 'officer', 'seat-2': 'target' };

/**
 * officer-turn and registered are the authored contract fixture, unmodified apart from
 * the clock. next-turn and resolution are frontend-authored so the shells can be seen
 * in a phase other than the Officer's turn; they show no outcome of any kind.
 */
export const STEPS = [
  { id: 'officer-turn', source: 'authored contract fixture: before', label: 'Player 1’s ordinary turn' },
  { id: 'registered', source: 'authored contract fixture: afterRegistration', label: 'A hidden registration (only Player 1’s own view changes)' },
  { id: 'next-turn', source: 'frontend-authored synthetic view', label: 'Player 2’s ordinary turn' },
  { id: 'resolution', source: 'frontend-authored synthetic view', label: 'Round resolution (no outcome shown: recipients undecided, RULE-003)' },
];

const clone = value => JSON.parse(JSON.stringify(value));

/**
 * @param {object} [options]
 * @param {() => number} [options.now] Real elapsed-time source in milliseconds.
 * @param {'protected' | 'unprotected'} [options.variant] Differs only in server-only truth.
 */
export function createScenario({ now = Date.now, variant = 'protected' } = {}) {
  const subscribers = new Map(AUDIENCES.map(audience => [audience, new Set()]));
  const connected = new Map(AUDIENCES.map(audience => [audience, true]));
  let fixture;
  let views;
  let stepIndex;
  let realStart;
  let virtualStart;
  let skippedMs;

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
  }

  function publish(next) {
    for (const audience of AUDIENCES) {
      const changed = JSON.stringify(next[audience]) !== JSON.stringify(views[audience]);
      views[audience] = next[audience];
      // Like the real backend, write only the documents that changed. An untouched
      // audience hears nothing, which is what makes a hidden action hidden.
      if (changed && connected.get(audience)) deliver(audience, views[audience]);
    }
  }

  function deliver(audience, payload) {
    for (const subscriber of [...subscribers.get(audience)]) subscriber.onPayload(clone(payload));
  }

  function derive(change) {
    return Object.fromEntries(AUDIENCES.map(audience => {
      const view = clone(views[audience]);
      view.viewRevision += 1;
      change(view);
      return [audience, view];
    }));
  }

  function enter(step) {
    if (step.id === 'officer-turn') return Object.fromEntries(AUDIENCES.map(audience => [audience, clone(fixture.before[AUTHORED[audience]])]));
    if (step.id === 'registered') return Object.fromEntries(AUDIENCES.map(audience => [audience, clone(fixture.afterRegistration[AUTHORED[audience]])]));
    if (step.id === 'next-turn') {
      // A turn's minute starts when the phase actually opens, not when the last one was due.
      const startedAt = Math.round(serverTimeMs());
      return derive(view => {
        view.phase = { id: 'phase-b', kind: 'ORDINARY_TURN', startedAt, endsAt: startedAt + 60_000 };
        view.activeSeatId = 'seat-2';
      });
    }
    const startedAt = Math.round(serverTimeMs());
    return derive(view => {
      view.phase = { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt, endsAt: null };
      view.activeSeatId = null;
    });
  }

  load(variant);

  return {
    serverTimeMs,
    step: () => STEPS[stepIndex],
    viewFor(audience) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      return clone(views[audience]);
    },
    isConnected: audience => connected.get(audience) === true,

    /** Starts a feed. Reports the connection, then the current view, as the transport contract requires. */
    subscribe(audience, subscriber) {
      if (!AUDIENCES.includes(audience)) throw new RangeError(`Unknown fixture audience: ${audience}`);
      subscribers.get(audience).add(subscriber);
      if (connected.get(audience)) {
        subscriber.onConnectionChange('connected');
        subscriber.onPayload(clone(views[audience]));
      }
      return () => {
        subscribers.get(audience).delete(subscriber);
      };
    },

    // Operator controls. They exist only in the development harness.
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
      publish(enter(STEPS[stepIndex]));
      return true;
    },
    /** Lets server time pass at once, e.g. to the end of the current phase. Views are untouched. */
    skipTime(ms) {
      skippedMs += Math.max(0, ms);
    },
    skipToDeadline() {
      const { endsAt } = views.public.phase;
      if (endsAt !== null) this.skipTime(endsAt - serverTimeMs());
    },
    setConnected(audience, next) {
      if (connected.get(audience) === next) return;
      connected.set(audience, next);
      for (const subscriber of [...subscribers.get(audience)]) {
        subscriber.onConnectionChange(next ? 'connected' : 'disconnected');
        if (next) subscriber.onPayload(clone(views[audience]));
      }
    },
    /** Sends the current view again, unchanged. */
    redeliver(audience) {
      if (connected.get(audience)) deliver(audience, views[audience]);
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
      };
    },
  };
}

import { FullLobbyIdentityDocumentSchema, FullPracticeBotsDocumentSchema, OwnAcknowledgmentsSchema, SeatSessionSchema } from '@mothership/contracts';
import type { FullLobbyIdentityDocument, FullPracticeBotsDocument, OwnAcknowledgments, SeatId, SeatSession } from '@mothership/contracts';
import type { ClientPorts } from '../ports.js';
import type { ConnectedTransport, DocumentTarget } from './transport.js';

/** Independently versioned documents; none is ever merged into a game view. */
export function createComicFeeds(options: {
  readonly transport: ConnectedTransport; readonly ports: ClientPorts; readonly matchId: string; readonly seatId?: SeatId;
}) {
  const { transport, ports, matchId, seatId } = options;
  const listeners = new Set<() => void>();
  const stops: (() => void)[] = [];
  const seen = new Map<string, { high: number; bytes: string | null; failed: boolean }>();
  let identities: FullLobbyIdentityDocument | null = null;
  let practice: FullPracticeBotsDocument | null = null;
  let practiceRead = false;
  let session: SeatSession | null = null;
  let acknowledgments: OwnAcknowledgments | null = null;
  let disposed = false;
  let started = false;
  let activeUid: string | null = null;
  const publish = () => { for (const listener of listeners) listener(); };

  function watch<T>(target: DocumentTarget, parse: (value: unknown) => T | null, set: (value: T | null, unavailable?: boolean) => void, revisionOf?: (value: T) => number) {
    let stop = () => {};
    let timer: unknown = null;
    let generation = 0;
    const context = seen.get(target.kind) ?? { high: -1, bytes: null, failed: false };
    seen.set(target.kind, context);
    let wait = 1500;

    const clear = () => { set(null, true); publish(); };
    const attach = () => {
      if (disposed || context.failed) return;
      const thisGeneration = ++generation;
      const expectedUid = transport.currentUid();
      stop = transport.listenDocument(target, {
        onSnapshot(snapshot) {
          if (disposed || context.failed || thisGeneration !== generation) return;
          if (!snapshot.fresh || transport.currentUid() !== expectedUid) return clear();
          let value: T | null;
          try { value = snapshot.value === null ? null : parse(snapshot.value); }
          catch { context.failed = true; return clear(); }
          if (value !== null && revisionOf) {
            const revision = revisionOf(value);
            const encoded = JSON.stringify(value);
            if (revision < context.high || (revision === context.high && context.bytes !== encoded)) { context.failed = true; return clear(); }
            context.high = revision; context.bytes = encoded;
          } else if (value === null && context.high >= 0) { context.failed = true; return clear(); }
          wait = 1500;
          set(value); publish();
        },
        onError() {
          if (disposed || context.failed || thisGeneration !== generation) return;
          clear();
          timer = ports.scheduler.setTimeout(() => { timer = null; stop(); attach(); }, wait);
          wait = Math.min(6000, Math.round(wait * 1.5));
        },
      });
    };
    attach();
    stops.push(() => { generation++; stop(); if (timer !== null) ports.scheduler.clearTimeout(timer); });
  }
  return {
    start() {
      if (started || disposed) return;
      started = true; activeUid = transport.currentUid();
      watch({ kind: 'identities', matchId }, value => {
        const result = FullLobbyIdentityDocumentSchema.parse(value);
        if (result.matchId !== matchId) throw new Error('Wrong identity match');
        return result;
      }, value => { identities = value; }, value => value.revision);
      watch({ kind: 'practice-bots', matchId }, value => {
        const result = FullPracticeBotsDocumentSchema.parse(value);
        if (result.matchId !== matchId) throw new Error('Wrong practice match');
        return result;
      }, (value, unavailable = false) => { practice = value; practiceRead = !unavailable; }, value => value.revision);
      if (!seatId) return;
      watch({ kind: 'seat-session', matchId }, value => {
        const result = SeatSessionSchema.parse(value);
        if (result.matchId !== matchId || result.seatId !== seatId) throw new Error('Wrong seat binding');
        return result;
      }, value => { session = value; }, value => value.bindingRevision);
      watch({ kind: 'own-acknowledgments', matchId }, value => {
        const result = OwnAcknowledgmentsSchema.parse(value);
        if (result.matchId !== matchId || result.seatId !== seatId) throw new Error('Wrong acknowledgment audience');
        return result;
      }, value => { acknowledgments = value; }, value => value.revision);
    },
    quarantine() {
      for (const stop of stops.splice(0)) stop();
      started = false; activeUid = null; identities = null; practice = null; practiceRead = false; session = null; acknowledgments = null; publish();
    },
    identities: () => activeUid !== null && transport.currentUid() === activeUid ? identities : null,
    practice: () => activeUid !== null && transport.currentUid() === activeUid ? practice : null,
    // A server-confirmed missing legacy document is different from a denied or stale read.
    practiceStatus: (): 'unavailable' | 'absent' | 'current' => activeUid === null || transport.currentUid() !== activeUid || !practiceRead
      ? 'unavailable' : practice === null ? 'absent' : 'current',
    // Both streams must have independently fresh, matching binding revisions. Null is
    // absence/unknown, never an invented empty successful result.
    acknowledgments: () => activeUid !== null && transport.currentUid() === activeUid && session !== null && acknowledgments !== null
      && session.bindingRevision === acknowledgments.bindingRevision ? acknowledgments : null,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { disposed = true; activeUid = null; for (const stop of stops.splice(0)) stop(); identities = null; practice = null; practiceRead = false; session = null; acknowledgments = null; listeners.clear(); },
  };
}

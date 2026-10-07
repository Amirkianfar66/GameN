import { FullSetupDocumentSchema, FullSetupPlayerViewSchema, SeatSessionSchema } from '@mothership/contracts';
import type { FullSetupDocument, FullSetupPlayerView, SeatId, SeatSession } from '@mothership/contracts';
import type { ClientPorts } from '../ports.js';
import type { ConnectedTransport, DocumentTarget } from './transport.js';

/** Pregame sidecars never become gameplay views or enter persistent storage. */
export function createSetupFeed({ transport, ports, matchId, seatId }: {
  readonly transport: ConnectedTransport; readonly ports: ClientPorts; readonly matchId: string; readonly seatId?: SeatId;
}) {
  const listeners = new Set<() => void>();
  let publicValue: FullSetupDocument | null = null, binding: SeatSession | null = null, privateValue: FullSetupPlayerView | null = null;
  let readPublic = false, disposed = false, started = false, uid: string | null = null;
  let stops: (() => void)[] = [], stopPrivate: (() => void) | null = null;
  const history = new Map<string, { revision: number; bytes: string }>();
  const poisoned = new Set<string>();
  const current = () => started && uid !== null && transport.currentUid() === uid;
  const publish = () => { syncPrivate(); for (const listener of listeners) listener(); };

  function watch<T>(kind: DocumentTarget['kind'], parse: (raw: unknown) => T, set: (value: T | null, available: boolean) => void, order?: (value: T) => number) {
    let stop = () => {}, timer: unknown = null, generation = 0, closed = false, wait = 1500;
    function attach() {
      if (closed || disposed || poisoned.has(kind)) return;
      const token = ++generation;
      stop = transport.listenDocument({ kind, matchId } as DocumentTarget, {
        onSnapshot(snapshot) {
          if (closed || disposed || poisoned.has(kind) || token !== generation) return;
          if (!snapshot.fresh || !current()) { set(null, false); publish(); return; }
          try {
            const value = snapshot.value === null ? null : parse(snapshot.value);
            const previous = history.get(kind);
            if (value !== null && order) {
              const revision = order(value), bytes = JSON.stringify(value);
              if (previous && (revision < previous.revision || (revision === previous.revision && bytes !== previous.bytes))) throw new Error('Conflicting setup revision');
              history.set(kind, { revision, bytes });
            } else if (value === null && previous) throw new Error('Setup document disappeared');
            wait = 1500; set(value, true); publish();
          } catch {
            poisoned.add(kind); set(null, false); publish();
          }
        },
        onError() {
          if (closed || disposed || poisoned.has(kind) || token !== generation) return;
          set(null, false); publish();
          if (closed || poisoned.has(kind)) return;
          if (timer !== null) ports.scheduler.clearTimeout(timer);
          timer = ports.scheduler.setTimeout(() => { timer = null; stop(); attach(); }, wait);
          wait = Math.min(6000, Math.round(wait * 1.5));
        },
      });
    }
    attach();
    return () => { closed = true; generation++; stop(); if (timer !== null) ports.scheduler.clearTimeout(timer); };
  }
  function syncPrivate() {
    const mayListen = current() && seatId !== undefined && publicValue?.stage === 'awaiting-ready' && binding !== null
      && publicValue.seats.some(seat => seat.seatId === seatId && !seat.ready);
    if (!mayListen) { stopPrivate?.(); stopPrivate = null; privateValue = null; return; }
    if (stopPrivate !== null) return;
    // Reserve the slot before attaching: transports may deliver synchronously.
    stopPrivate = () => {};
    stopPrivate = watch('setup-player-view', raw => {
      const value = FullSetupPlayerViewSchema.parse(raw);
      if (value.matchId !== matchId || value.audience.seatId !== seatId) throw new Error('Wrong setup audience');
      return value;
    }, value => { privateValue = value; }, value => value.bindingRevision);
  }
  return {
    start() {
      if (disposed || started) return;
      started = true; uid = transport.currentUid();
      stops.push(watch('setup', raw => {
        const value = FullSetupDocumentSchema.parse(raw);
        if (value.matchId !== matchId) throw new Error('Wrong setup match');
        return value;
      }, (value, available) => { publicValue = value; readPublic = available; }, value => value.revision));
      if (seatId) stops.push(watch('seat-session', raw => {
        const value = SeatSessionSchema.parse(raw);
        if (value.matchId !== matchId || value.seatId !== seatId) throw new Error('Wrong seat binding');
        return value;
      }, value => { binding = value; }, value => value.bindingRevision));
    },
    public: () => current() ? publicValue : null,
    status: (): 'unavailable' | 'absent' | 'current' => !current() || !readPublic ? 'unavailable' : publicValue === null ? 'absent' : 'current',
    binding: () => current() ? binding : null,
    own: () => current() && publicValue?.stage === 'awaiting-ready' && binding !== null && privateValue !== null
      && privateValue.dealId === publicValue.dealId && privateValue.playerCount === publicValue.playerCount
      && privateValue.bindingRevision === binding.bindingRevision ? privateValue : null,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    quarantine() {
      started = false; uid = null; stops.splice(0).forEach(stop => stop()); stopPrivate?.(); stopPrivate = null;
      publicValue = null; readPublic = false; binding = null; privateValue = null; publish();
    },
    dispose() {
      this.quarantine(); disposed = true; listeners.clear();
    },
  };
}

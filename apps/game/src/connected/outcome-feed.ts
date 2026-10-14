import { FullOutcomeEventSchema, sameFullGameplayPins, supportsCaptainCommands, validClinicalAnchorForPlayerCount } from '@mothership/contracts';
import type { FullPlayerView, FullPublicView } from '@mothership/contracts';
import type { OutcomePresentationModel } from '@mothership/presentation';
import type { ConnectedTransport } from './transport.js';

/** Live audience occurrences only. Initial/cache/reconnect snapshots establish a baseline;
 * they cannot replay a film or an announcement. Events never advance a view or phase. */
export function createOutcomeFeed(transport: ConnectedTransport, matchId: string, seatId?: string) {
  const listeners = new Set<() => void>(), seen = new Set<string>();
  const pending = new Map<string, { event: OutcomePresentationModel; ordinal: number }>();
  let stop: (() => void) | null = null, baseline = true, uid: string | null = null, disposed = false;
  let context: { view: FullPlayerView | FullPublicView; nowMs: number; foreground: boolean } | null = null;
  let resumeAfterMs = -1;
  const clear = () => { pending.clear(); baseline = true; };
  function attach() {
    const target = seatId ? { kind: 'player-events' as const, matchId, seatId } : { kind: 'public-events' as const, matchId };
    const expectedUid = uid;
    stop = transport.listenCollection(target, {
      onSnapshot(snapshot) {
        if (disposed || transport.currentUid() !== expectedUid || !context) return clear();
        if (!snapshot.fresh) { clear(); for (const listener of listeners) listener(); return; }
        const wasBaseline = baseline; baseline = false;
        for (const item of snapshot.value) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          if (wasBaseline || !context.foreground) continue;
          const result = FullOutcomeEventSchema.safeParse(item.data);
          if (!result.success) continue;
          const event = result.data, view = context.view;
          if (event.matchId !== matchId || !sameFullGameplayPins(event.versions, view.versions)
            || (seatId ? event.audience.kind !== 'player' || event.audience.seatId !== seatId : event.audience.kind !== 'public')
            || event.expiresAt <= context.nowMs || event.publishedAt <= resumeAfterMs || event.publishedAt > context.nowMs + 1000) continue;
          const identity = /^(\d+)-(\d+)$/.exec(item.id);
          if (!identity || Number(identity[1]) !== event.viewRevision) continue;
          if (event.fact.type === 'MEDICAL_OUTCOME' && !validClinicalAnchorForPlayerCount(event.fact.presentationAnchor, view.playerCount)) continue;
          pending.set(event.eventId, { ordinal: Number(identity[2]), event: {
            eventId: event.eventId, viewRevision: event.viewRevision, publishedAt: event.publishedAt, expiresAt: event.expiresAt, fact: event.fact,
            ...(event.fact.type === 'MEDICAL_OUTCOME' ? { presentationAnchor: event.fact.presentationAnchor } : {}),
          } });
        }
        for (const listener of listeners) listener();
      },
      onError() { clear(); stop = null; for (const listener of listeners) listener(); },
    });
  }
  return {
    observe(view: FullPlayerView | FullPublicView | null, nowMs: number | null, current: boolean, foreground: boolean) {
      if (disposed) return;
      const nextUid = transport.currentUid();
      if (!view || !current || nowMs === null || !nextUid || !supportsCaptainCommands(view.versions)
        || view.matchId !== matchId || (seatId ? view.audience.kind !== 'player' || view.audience.seatId !== seatId : view.audience.kind !== 'public')) {
        stop?.(); stop = null; context = null; clear(); return;
      }
      if (uid !== nextUid) { stop?.(); stop = null; seen.clear(); clear(); uid = nextUid; }
      if (context && !context.foreground && foreground) resumeAfterMs = nowMs;
      context = { view, nowMs, foreground };
      if (!foreground) pending.clear();
      if (!stop) attach();
    },
    read(): readonly OutcomePresentationModel[] {
      if (!context?.foreground) return [];
      for (const [id, item] of pending) if (item.event.expiresAt <= context.nowMs) pending.delete(id);
      return [...pending.values()].filter(item => item.event.viewRevision <= context!.view.viewRevision && item.event.publishedAt <= context!.nowMs)
        .sort((a, b) => a.event.viewRevision - b.event.viewRevision || a.ordinal - b.ordinal).map(item => item.event);
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { disposed = true; stop?.(); stop = null; context = null; clear(); seen.clear(); listeners.clear(); },
  };
}

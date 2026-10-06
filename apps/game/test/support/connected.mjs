// Synthetic protocol-2 data and a scriptable connected transport. Test-only. Every view
// here is hand-built and checked against the shared strict schema where it is made; none
// is the result of an engine, and none is the service's own example file.
import { FullLobbyViewSchema, FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';
import { flush } from './fakes.mjs';

export const MATCH = 'connected-test-match';
export const EPOCH = 1_900_000_000_000;
const VERSIONS = {
  protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90',
  engineVersion: 'full-game-1.0.0', assetManifestVersion: '0.0.0-no-assets',
};

function facts(playerCount = 7) {
  return {
    versions: VERSIONS, matchId: MATCH, viewRevision: 3, playerCount, round: 1,
    phase: { id: 'phase-one', kind: 'ORDINARY_TURN', startedAt: EPOCH, endsAt: EPOCH + 60_000 },
    activeSeatId: 'seat-1',
    seats: Array.from({ length: playerCount }, (unused, index) => ({
      seatId: `seat-${index + 1}`, health: 'Healthy', location: index % 2 === 0 ? 'Room A' : 'Room B', jailed: false, captain: false, revealedFaction: null,
    })),
    ballot: { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null },
    lastTally: null, result: null, endReveal: null,
  };
}

/** A public view of a running match. `change` may alter the copy before it is checked. */
export function publicView(change = () => {}, playerCount = 7) {
  const view = { ...facts(playerCount), audience: { kind: 'public' } };
  change(view);
  return FullPublicViewSchema.parse(view);
}

/**
 * One seat's own view. The role is one with no role-specific knowledge, so the view is
 * valid without inventing any.
 */
export function playerView(seatId = 'seat-1', change = () => {}, playerCount = 7) {
  const view = {
    ...facts(playerCount), viewRevision: 5, audience: { kind: 'player', seatId },
    self: {
      seatId, role: 'Cracker', movementDestinations: ['Room B'], releaseVoteAvailable: false, ordinaryWeapons: 0, shotAvailable: false,
      rescuesRemaining: 1, disablerAvailable: false, hackAvailable: false, scanAvailable: false, codeAttemptAvailable: false,
    },
    knowledge: { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] },
    legalTargets: {}, ownPendingCommandIds: [], ownBallot: null, hasVoted: false, hackPartnerSeatId: null,
  };
  change(view);
  return FullPlayerViewSchema.parse(view);
}

export function lobbyView(change = () => {}) {
  const view = { protocolVersion: 2, matchId: MATCH, playerCount: 7, status: 'lobby', seats: [{ seatId: 'seat-1', initialRoom: 'Room A' }] };
  change(view);
  return FullLobbyViewSchema.parse(view);
}

/**
 * A scriptable connected transport. `respond` holds one function per operation; replace any
 * of them in a test. By default every operation answers "try again later".
 */
export function createFakeConnectedTransport(host, { uid = 'test-uid-1', mode = 'emulator' } = {}) {
  const documents = new Map();
  const collections = new Map();
  const calls = [];
  const unavailable = () => ({ ok: false, serverTimeMs: host.serverNow(), error: { code: 'UNAVAILABLE' } });
  const respond = {};
  const keyOf = target => JSON.stringify(target);
  let signedIn = null;
  const transport = {
    mode,
    currentUid: () => signedIn,
    async signIn() {
      signedIn = uid;
      return uid;
    },
    post(operation, body) {
      calls.push({ operation, body: structuredClone(body) });
      return (respond[operation] ?? (async () => unavailable()))(body);
    },
    listenDocument(target, listener) {
      const key = keyOf(target);
      if (!documents.has(key)) documents.set(key, new Set());
      documents.get(key).add(listener);
      return () => documents.get(key).delete(listener);
    },
    listenCollection(target, listener) {
      const key = keyOf(target);
      if (!collections.has(key)) collections.set(key, new Set());
      collections.get(key).add(listener);
      return () => collections.get(key).delete(listener);
    },
  };
  return {
    transport,
    calls,
    respond,
    /** Every call made to one operation, oldest first. */
    callsTo: operation => calls.filter(call => call.operation === operation).map(call => call.body),
    listeners: target => documents.get(keyOf(target))?.size ?? 0,
    /** Delivers a document snapshot. Fresh unless said otherwise. */
    async deliver(target, value, fresh = true) {
      for (const listener of [...(documents.get(keyOf(target)) ?? [])]) listener.onSnapshot({ value: value === null ? null : structuredClone(value), fresh });
      await flush();
    },
    async deliverCollection(target, items, fresh = true) {
      for (const listener of [...(collections.get(keyOf(target)) ?? [])]) listener.onSnapshot({ value: structuredClone(items), fresh });
      await flush();
    },
    async fail(target) {
      for (const listener of [...(documents.get(keyOf(target)) ?? [])]) listener.onError();
      await flush();
    },
  };
}

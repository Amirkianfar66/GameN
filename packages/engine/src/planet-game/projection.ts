import { PlanetPublicViewSchema, PlanetPlayerViewSchema, PlanetEventSchema, validClinicalAnchorForPlayerCount } from '@mothership/contracts';
import type { PlanetEvent, PlanetPlayerView, PlanetPublicView, SeatId } from '@mothership/contracts';
import { copyPlanet, freeHealthy, planetFaction, planetSeat, planetSeatView, planetWorld, planetHasPrivateFeedback } from './model.js';
import type { PlanetGameState, PlanetStoredEvent, PlanetWorld } from './model.js';
import { planetOffers } from './offers.js';
import { planetBlackoutRequest, planetSlotIds } from './physical.js';
import { planetWindows } from './social.js';

const orderedIds = (state: PlanetGameState): SeatId[] =>
  (Object.keys(state.roles) as SeatId[]).sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));

/** Storage ordinals contain private occurrences. Number only the authorized audience's sequence. */
function factDigest(value: string): string {
  // FNV-1a is a deterministic occurrence label, not an authentication primitive.
  let hash = 14695981039346656037n;
  for (let i = 0; i < value.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(value.charCodeAt(i))) * 1099511628211n);
  return hash.toString(16).padStart(16, '0');
}
function visibleSources(state: PlanetGameState, seatId?: SeatId): PlanetStoredEvent[] {
  const records = seatId === undefined ? state.finalized.events
    : [...state.finalized.events, ...planetWorld(state, seatId).events].filter(r => r.event.round === state.round);
  const seen = new Set<string>();
  return records.filter(stored => {
    if (stored.event.kind === 'ATTACK_BLOCKED' && stored.recipients === null) throw Error('Room defense requires frozen player recipients');
    if (seatId === undefined ? stored.recipients !== null || stored.event.kind === 'ATTACK_BLOCKED'
      : stored.recipients !== null && !stored.recipients.includes(seatId)) return false;
    if (seen.has(stored.event.id)) return false;
    seen.add(stored.event.id);
    return true;
  });
}
const audienceKey = (seatId?: SeatId): string => seatId === undefined ? 'public' : `player:${seatId}`;

/** Called by the transition after audience revisions advance. Getters never write publication state. */
export function stampPlanetEventPublications(state: PlanetGameState): void {
  for (const seatId of [undefined, ...orderedIds(state)]) {
    const key = audienceKey(seatId), ledger = state.eventPublications[key] ?? (state.eventPublications[key] = {});
    for (const stored of visibleSources(state, seatId)) if (!Object.hasOwn(ledger, stored.event.id)) {
      ledger[stored.event.id] = { viewRevision: seatId === undefined ? state.revisions.public : state.revisions.players[seatId]!,
        publishedAt: state.evaluatedAt };
    }
  }
}

function audienceEvents(state: PlanetGameState, seatId?: SeatId): PlanetEvent[] {
  const key = audienceKey(seatId), visible = visibleSources(state, seatId).map(stored => {
    const event = PlanetEventSchema.parse(stored.event);
    if ((['INJURED', 'RESCUED', 'ELIMINATED'].includes(event.kind) && event.clinicalAnchor === null)
      || (event.kind === 'HOSPITAL_OVERFLOW_REMOVED' && event.clinicalAnchor !== null)
      || (event.clinicalAnchor !== null && !validClinicalAnchorForPlayerCount(event.clinicalAnchor, state.playerCount))) {
      throw Error('Invalid roster-sized clinical anchor');
    }
    const publication = state.eventPublications[key]?.[event.id] ?? event;
    return { ...event, id: '', seatIds: [...event.seatIds].sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))),
      viewRevision: publication.viewRevision, publishedAt: publication.publishedAt, expiresAt: publication.publishedAt + 30_000,
      audience: seatId === undefined ? { kind: 'public' as const } : { kind: 'player' as const, seatId } };
  });
  // Publication metadata is deliberately excluded from occurrence identity and ordering.
  const factKey = (event: PlanetEvent): string => JSON.stringify([event.round, event.kind, event.seatIds,
    event.location, event.actorSeatId, event.slotId, event.clinicalAnchor]);
  const clinicalRank = (event: PlanetEvent): number => ({ INJURED: 0, RESCUED: 1, ELIMINATED: 2 })[event.kind as 'INJURED'] ?? 3;
  const subjects = (a: PlanetEvent, b: PlanetEvent): number => {
    for (let i = 0; i < Math.min(a.seatIds.length, b.seatIds.length); i++) {
      const difference = Number(a.seatIds[i]!.slice(5)) - Number(b.seatIds[i]!.slice(5));
      if (difference) return difference;
    }
    return a.seatIds.length - b.seatIds.length;
  };
  visible.sort((a, b) => a.round - b.round || subjects(a, b) || clinicalRank(a) - clinicalRank(b)
    || (factKey(a) < factKey(b) ? -1 : factKey(a) > factKey(b) ? 1 : 0));
  const ordinals = new Map<string, number>();
  return visible.map(event => {
    const fact = factKey(event), ordinal = ordinals.get(fact) ?? 0;
    ordinals.set(fact, ordinal + 1);
    return { ...event, id: `planet-${event.round}-${factDigest(fact)}-${ordinal}` };
  });
}

function common(state: PlanetGameState, world: PlanetWorld, player?: SeatId) {
  // Before Sync the public offices, like the board, cannot reveal a speculative EJECT.
  const offices = player !== undefined || !state.panelOpen
    ? { captainSeatId: world.captainSeatId, officerSeatId: world.officerSeatId }
    : { captainSeatId: state.finalized.seats.find(s => s.captain)?.seatId ?? null,
      officerSeatId: state.finalized.seats.find(s => s.officer)?.seatId ?? null };
  const blackout = state.phase.kind === 'BLACKOUT' ? {
    windowId: state.phase.id, previewEndsAt: state.phase.startedAt + 5_000, endsAt: state.phase.endsAt,
  } : null;
  const hackSession = state.hack && ['HACK_DECLARE', 'HACK_RESULT', 'HACK'].includes(state.phase.kind)
    ? { id: state.hack.id, actorSeatId: state.hack.actorSeatId, targetSeatId: state.hack.targetSeatId } : null;
  return {
    versions: copyPlanet(state.versions), matchId: state.matchId,
    viewRevision: player === undefined ? state.revisions.public : state.revisions.players[player],
    round: state.round, playerCount: state.playerCount, phase: copyPlanet(state.phase), activeSeatId: state.activeSeatId,
    offices: { ...offices, blockedSeatId: state.global.blockedSeatId }, hackSession, blackout,
    ballot: { eligibleVoters: [...(state.ballot?.eligibleVoters ?? [])], eligibleTargets: [...(state.ballot?.eligibleTargets ?? [])] },
    lastTally: copyPlanet(state.lastTally),
    navigation: { lastMovedRound: state.navigation.lastMovedRound, arrivedAt: state.navigation.arrivedAt },
    result: copyPlanet(state.result),
    endReveal: state.phase.kind === 'FINISHED'
      ? { roles: orderedIds(state).map(seatId => ({ seatId, role: state.roles[seatId] })), code: [...state.code] } : null,
  };
}

/** The shared screen never receives an unfinalized world, physical cost or private occurrence. */
export function projectPlanetPublic(state: PlanetGameState): PlanetPublicView {
  return PlanetPublicViewSchema.parse({ ...common(state, planetWorld(state)),
    board: { kind: 'FINALIZED', finalizedRound: state.finalized.round, seats: copyPlanet(state.finalized.seats) },
    events: audienceEvents(state),
  });
}

function blackoutTargeting(state: PlanetGameState, world: PlanetWorld, id: SeatId): PlanetPlayerView['blackoutTargeting'] {
  if (state.phase.kind !== 'BLACKOUT' || !['Blue Disabler', 'Red Disabler'].includes(state.roles[id]!)) return null;
  const request = planetBlackoutRequest(world, id);
  if (!request?.boundRoom) return null;
  const boundRoom = request.boundRoom, slotIds = planetSlotIds(boundRoom);
  return { windowId: state.phase.id, boundRoom, selectable: request.selectedSlotId == null && state.evaluatedAt >= state.phase.startedAt + 5_000
      && state.phase.endsAt !== null && state.evaluatedAt < state.phase.endsAt,
    selectedSlotId: request.selectedSlotId ?? null, slotIds };
}

/** Copy each permitted field explicitly; an assigned reality is an authority boundary, never a wire label. */
export function projectPlanetPlayer(state: PlanetGameState, id: SeatId): PlanetPlayerView {
  if (!Object.hasOwn(state.roles, id)) throw Error('Unknown planet player');
  const world = planetWorld(state, id), self = planetSeat(world, id), role = state.roles[id]!;
  const hacker = role === 'Hacker', alien = role === 'Alien';
  const office = world.captainSeatId === id || world.officerSeatId === id;
  const available = freeHealthy(self), privateFeedback = planetHasPrivateFeedback(state.versions);
  const privateNavigation = office ? {
    position: state.navigation.position,
    direction: privateFeedback && state.phase.kind === 'NAV_SETTING' ? null : state.navigation.direction,
    tieChoice: available && world.officerSeatId === id && (privateFeedback
      ? state.phase.kind === 'NAV_SETTING' && state.navigation.settingTie === true && state.navigation.settingDirection === null
      : state.phase.kind === 'NAV_TIE'),
    confirmation: available && world.captainSeatId === id && state.phase.kind === 'NAV_CAPTAIN_CONFIRM' ? 'CAPTAIN'
      : available && world.officerSeatId === id && state.phase.kind === 'NAV_OFFICER_CONFIRM' ? 'OFFICER' : null,
  } : null;
  const hackFeedback = state.hack && ['HACK_RESULT', 'HACK'].includes(state.phase.kind)
    && [state.hack.actorSeatId, state.hack.targetSeatId].includes(id)
    ? { id: state.hack.id, status: state.hack.status, declaredSide: state.hack.declaredSide } : null;
  return PlanetPlayerViewSchema.parse({ ...common(state, world, id),
    board: { kind: 'PLAYER_CURRENT', finalizedRound: state.finalized.round,
      seats: orderedIds(state).map(seatId => planetSeatView(world, planetSeat(world, seatId))) },
    events: audienceEvents(state, id),
    self: { seatId: id, role, faction: planetFaction(role), ordinaryWeapons: self.ordinaryWeapons,
      movementSpent: state.global.movementSpent.includes(id),
      roleActionSpent: self.roleActionSpent || alien && state.global.blackholeRound === state.round
        || hacker && state.global.scanUsedRound === state.round,
      shotSpent: self.shotSpent, standardHackSpent: state.global.hackSpent.includes(id) },
    abilities: { codeAttempted: hacker && state.global.codeAttempted, shipHackUnlocked: hacker && state.global.shipHackUnlocked,
      shipHackSpent: hacker && world.shipHackSpent, scanBlockedThroughRound: hacker ? state.global.scanBlockedThroughRound : null,
      blackholeSpent: alien && state.global.blackholeSpent,
      blackoutSpent: ['Blue Disabler', 'Red Disabler'].includes(role) && self.blackoutSpent,
      engineerSpent: role === 'Engineer' && self.engineerSpent, clone: alien ? copyPlanet(self.clone) : null,
      injectionsRemaining: role === 'Doctor' ? world.injectionsRemaining : null,
      panelAttemptSpent: state.global.panelAttempts.includes(id),
      ...(privateFeedback ? {
        engineerCapture: role === 'Engineer' ? copyPlanet(self.engineerCapture ?? null) : null,
        panelRequest: copyPlanet(state.global.panelRequests?.[id] ?? null),
      } : {}),
      captainCommands: world.captainSeatId === id ? { releaseUsed: world.releaseUsed, ejectUsed: world.ejectUsed } : null,
      protectionGrants: role === 'Undercover' ? orderedIds(state).flatMap(targetSeatId => {
        const p = planetSeat(world, targetSeatId).protection;
        return p?.donorSeatId === id ? [{ targetSeatId, activeFromRound: p.activeFromRound, consumed: p.consumed }] : [];
      }) : [] },
    knowledge: {
      insiderSeatIds: role === 'Insider' ? orderedIds(state).filter(seatId => state.code.includes(seatId) && seatId !== id) : [],
      knownUndercoverSeatId: ['Hacker', 'Red Disabler'].includes(role)
        ? orderedIds(state).find(seatId => state.roles[seatId] === 'Undercover') ?? null : null,
      scanResults: hacker ? copyPlanet(state.global.scanResults) : [],
    },
    offers: planetOffers(state, id), privateNavigation, hackFeedback, blackoutTargeting: blackoutTargeting(state, world, id),
    promises: copyPlanet(state.global.promises.filter(p => p.giverSeatId === id || p.recipientSeatId === id)),
    promiseQuota: { given: state.global.promiseGiven.includes(id), received: state.global.promiseReceived.includes(id) },
    ownBallot: state.ballot && state.ballot.kind === state.phase.kind && Object.hasOwn(state.ballot.votes, id)
      ? { phaseId: state.phase.id, targetSeatId: state.ballot.votes[id] ?? null } : null,
    windows: planetWindows(state, id),
  });
}

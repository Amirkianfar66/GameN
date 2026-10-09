// mothership:dev-only
//
// Synthetic protocol-2 views for the board simulation (issue #87). Every view is hand-built
// here and checked against the shared strict schema before it is shown; none comes from an
// engine. What each one offers follows the engine's gates for its actor, round, phase and the
// targets' public state (packages/engine/src/full-game/lifecycle.ts at 94a49ce), and
// apps/game/test/board-scenarios.test.mjs restates those gates and checks every scenario
// against them. A scenario marked "unreachable" is a public state no real match gets to (nine
// in the Command Room, for one); it is drawn because the board has no capacity, and its offers
// still follow the gates for that state. Nothing here is imported by the release.

import { FullLobbyIdentityDocumentSchema, FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';

globalThis[Symbol.for('mothership:dev-only')] = true;

export const MATCH = 'board-simulation';
export const PASS_VERSIONS = { protocolVersion: 2, rulesetVersion: 'in-person-v1-pass-2026-10-08', rulesetHash: 'a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183', engineVersion: 'full-game-1.1.0', assetManifestVersion: 'design-0.2.0' };
export const LEGACY_VERSIONS = { protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90', engineVersion: 'full-game-1.0.1', assetManifestVersion: 'design-0.2.0' };

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const LONG_NAMES = ['WWWWWWWWWWWW', 'Maximiliana', 'Bartholomew!', 'Konstantinos', 'Wilhelmina R', 'Oluwaseun A.', 'Anastasiaaaa', 'Christophers', 'Guinevere II'];
const CHARACTER = ['c4', 'c7', 'c1', 'c9', 'c2', 'c6', 'c3', 'c8', 'c5'];
/** Where the nine stand when nothing says otherwise. Seat 7 is Captain. */
const SPREAD = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room B', 'Jail'];
const BUSY_A = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Command Room', 'Room A', 'Jail'];
/** Before the first Captain is elected nobody is in the Command Room: only the elected Captain is placed there. */
const NO_CAPTAIN_YET = ['Room A', 'Room B', 'Room A', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'];
const ALL = room => Array(9).fill(room);
const HOSPITAL_8 = Array.from({ length: 9 }, (_, index) => (index === 2 ? 'Room A' : 'Hospital'));
const CROWD_HOSPITAL = ['Hospital', 'Hospital', 'Room A', 'Hospital', 'Hospital', 'Hospital', 'Command Room', 'Hospital', 'Room B'];
const seat = n => `seat-${n}`;
const seats = list => list.map(seat);
const EVERYONE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OTHERS = EVERYONE.filter(n => n !== 3);
/** Healthy and free in NO_CAPTAIN_YET and SPREAD: seat 6 is Injured, seat 9 Jailed. */
const READY = [1, 2, 3, 4, 5, 7, 8];
const FREE = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * One scenario: the public facts, the viewer's own facts and what the view offers. offers
 * keys are the presentation's action kinds; a list names seats by number.
 */
export const SCENARIOS = {
  spread: { title: 'Nine players spread over the board; your turn', offers: { move: ['Room B'], pass: true } },
  'other-turn': { title: 'Someone else’s turn', active: 5, offers: { move: [] } },
  seven: { title: 'Seven players', count: 7, role: 'Cracker', offers: { move: ['Room B'], pass: true } },
  crowded: { title: 'Seven in Room A', locations: ['Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Room A', 'Hospital', 'Jail'], captain: null, offers: { move: ['Room B'], pass: true } },
  'long-names': { title: 'Twelve-character names', names: LONG_NAMES, offers: { move: ['Room B'], pass: true } },
  legacy: { title: 'A match on the legacy ruleset: no Pass', versions: LEGACY_VERSIONS, offers: { move: ['Room B'] } },
  tray: { title: 'Actions tray: what the view opens', locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: ['Room B'], shot: [1, 5, 8], hack: [1, 5, 8], scan: [1, 3, 5, 8], code: true, pass: true } },
  'tray-empty': { title: 'Actions tray: nothing open', active: 5, role: 'Insider', offers: {} },
  shot: { title: 'Shot: three in the same room', locations: BUSY_A, offers: { move: ['Room B'], shot: [1, 5, 8], pass: true } },
  disable: { title: 'Disable', locations: BUSY_A, role: 'Red Disabler', offers: { move: ['Room B'], disable: [1, 5, 8], pass: true } },
  protect: { title: 'Protection, yourself included', locations: BUSY_A, role: 'Undercover', offers: { move: ['Room B'], protect: [1, 3, 5, 8], pass: true } },
  // A Rescue may name anyone living in the Cracker's room, the Cracker included, and from Room A or B anyone in the Hospital.
  rescue: { title: 'Rescue: a character in the Hospital', locations: BUSY_A, role: 'Cracker', offers: { move: ['Room B'], rescue: [1, 3, 5, 6, 8], pass: true } },
  hack: { title: 'Hack request', locations: BUSY_A, role: 'Hacker', offers: { move: ['Room B'], hack: [1, 5, 8], pass: true } },
  scan: { title: 'Scan: a character, then a faction', locations: BUSY_A, role: 'Hacker', offers: { move: ['Room B'], scan: [1, 3, 5, 8], pass: true } },
  supply: { title: 'Supply: two characters', locations: BUSY_A, role: 'Supplier', round: 3, offers: { move: ['Room B'], supply: [1, 3, 5, 8], pass: true } },
  code: { title: 'Code attempt: four characters', locations: BUSY_A, role: 'Hacker', round: 5, offers: { move: ['Room B'], code: true, pass: true } },
  // The eliminated stay where they fell; only the living stand in the Final Zone.
  showdown: { title: 'Showdown shot in the Final Zone', locations: ['Final Zone', 'Final Zone', 'Final Zone', 'Hospital', 'Final Zone', 'Final Zone', 'Final Zone', 'Final Zone', 'Final Zone'], phase: 'SHOWDOWN', round: 5, active: null,
    seats: s => { s[3].health = 'Eliminated'; s[3].revealedFaction = 'Red'; }, offers: { 'showdown-shot': [1, 2, 5, 6, 7, 8, 9] } },
  // The first election opens round 2. Every living character votes; only the Healthy and free are candidates.
  // It opens the round, so nobody has moved yet and the room tags stay open.
  election: { title: 'Captain election: tap a candidate, or abstain', phase: 'CAPTAIN_ELECTION', round: 2, active: null, captain: null, locations: NO_CAPTAIN_YET,
    ballot: { voters: EVERYONE, targets: READY }, offers: { vote: READY, move: ['Room B'] } },
  // Every living character votes, the Injured and the Jailed included; anyone living and free can be jailed, the voter included.
  jail: { title: 'Jail vote: tap a player, or abstain', phase: 'JAIL_VOTE', active: null, ballot: { voters: EVERYONE, targets: FREE }, offers: { vote: FREE } },
  'release-choice': { title: 'The Captain’s release request: a jailed character', phase: 'RELEASE_CHOICE',
    active: 3, ballot: { voters: [], targets: [9] }, locations: ['Room A', 'Room B', 'Command Room', 'Room B', 'Room A', 'Hospital', 'Room A', 'Room B', 'Jail'], captain: 3, offers: { 'release-choice': [9] } },
  'release-vote': { title: 'Release vote: Yes, No or Abstain', phase: 'RELEASE_VOTE', active: null, ballot: { voters: EVERYONE, targets: [], release: 9 }, offers: { 'release-vote': true } },
  'crowd-shot': { title: 'All nine in Room A: a Shot at any of eight', locations: ALL('Room A'), captain: null, offers: { move: ['Room B'], shot: OTHERS, pass: true } },
  'crowd-protect': { title: 'All nine in Room A: Protection for any of nine', locations: ALL('Room A'), captain: null, role: 'Undercover', offers: { move: ['Room B'], protect: EVERYONE, pass: true } },
  'crowd-vote': { title: 'All nine in Room A: nine candidates', locations: ALL('Room A'), captain: null, phase: 'CAPTAIN_ELECTION', round: 2, active: null, ballot: { voters: EVERYONE, targets: EVERYONE }, offers: { vote: EVERYONE, move: ['Room B'] } },
  'crowd-command': { title: 'All nine in the Command Room', unreachable: 'Only an elected Captain is placed in the Command Room, and nobody else can enter it.',
    locations: ALL('Command Room'), captain: null, phase: 'CAPTAIN_ELECTION', round: 2, active: null, ballot: { voters: EVERYONE, targets: EVERYONE }, offers: { vote: EVERYONE, move: ['Room A', 'Room B'] } },
  'crowd-jail': { title: 'All nine in Jail: a Code attempt naming any of them', unreachable: 'A Jail vote jails at most one character a round.',
    locations: ALL('Jail'), captain: null, role: 'Hacker', round: 5, offers: { code: true, pass: true } },
  // Anyone in the Hospital, and the Cracker in its own room.
  'crowd-hospital': { title: 'Eight in the Hospital: a Rescue for any of them', unreachable: 'Eight Injured at once: by round 2 at most three attacks (the Officer\'s shot and two Disables) have landed.',
    locations: HOSPITAL_8, role: 'Cracker', captain: null, offers: { rescue: EVERYONE, pass: true } },
  // Six Injured at once can only happen late: it takes the attacks of rounds 1 to 4.
  'crowd-hospital-6': { title: 'Six in the Hospital', locations: CROWD_HOSPITAL, round: 5, active: 7, offers: {} },
  'crowd-room-b-supply': { title: 'All nine in Room B: Supply', locations: ALL('Room B'), role: 'Supplier', round: 3, captain: null, offers: { move: ['Room A'], supply: EVERYONE, pass: true } },
};

/** The roster of a scenario: who stands where, with their public status. */
function roster(definition) {
  const count = definition.count ?? 9;
  const locations = definition.locations ?? SPREAD;
  const captain = definition.captain === undefined ? 7 : definition.captain;
  const list = Array.from({ length: count }, (_, index) => ({
    seatId: seat(index + 1), location: locations[index],
    health: locations[index] === 'Hospital' ? 'Injured' : 'Healthy', jailed: locations[index] === 'Jail', captain: captain === index + 1, revealedFaction: null,
  }));
  definition.seats?.(list);
  return list;
}

function publicFacts(definition, now, revision) {
  const self = definition.self ?? 3;
  const active = definition.active === undefined ? self : definition.active;
  return {
    versions: definition.versions ?? PASS_VERSIONS, matchId: MATCH, viewRevision: revision, playerCount: definition.count ?? 9, round: definition.round ?? 2,
    phase: { id: `phase-${definition.phase ?? 'ORDINARY_TURN'}-${definition.phaseIndex ?? 1}`, kind: definition.phase ?? 'ORDINARY_TURN', startedAt: now - 18_000, endsAt: now + 42_000 },
    activeSeatId: active === null ? null : seat(active),
    seats: roster(definition),
    ballot: { eligibleVoters: seats(definition.ballot?.voters ?? []), eligibleTargets: seats(definition.ballot?.targets ?? []), releaseTargetSeatId: definition.ballot?.release ? seat(definition.ballot.release) : null },
    lastTally: null, result: null, endReveal: null,
  };
}

/** What a role knows by itself, and nothing more: just enough for the schema. */
function knowledge(role, self) {
  const empty = { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] };
  if (role === 'Hacker') return { ...empty, undercoverSeatId: seat(self === 5 ? 1 : 5) };
  if (role === 'Insider') return { ...empty, insiderCandidates: seats([1, 2, 4].map(n => (n === self ? 6 : n))) };
  if (role === 'Alien') return { ...empty, code: seats([self, ...[1, 2, 4, 6].filter(n => n !== self)].slice(0, 4)) };
  return empty;
}

export function playerView(definition, now, revision = 1, move = null) {
  const self = definition.self ?? 3;
  const offers = definition.offers ?? {};
  // The Officer is a role of nine-player matches only.
  const role = definition.role ?? ((definition.count ?? 9) === 9 ? 'Officer' : 'Cracker');
  const view = {
    ...publicFacts(definition, now, revision), audience: { kind: 'player', seatId: seat(self) },
    self: {
      seatId: seat(self), role, movementDestinations: offers.move ?? [], releaseVoteAvailable: offers['release-vote'] === true,
      ordinaryWeapons: offers.shot ? 1 : 0, shotAvailable: Boolean(offers.shot), rescuesRemaining: 1, disablerAvailable: Boolean(offers.disable),
      hackAvailable: Boolean(offers.hack), scanAvailable: Boolean(offers.scan), codeAttemptAvailable: offers.code === true,
    },
    knowledge: knowledge(role, self),
    legalTargets: Object.fromEntries([
      ['REGISTER_SHOT', offers.shot], ['DISABLE', offers.disable], ['PROTECT', offers.protect], ['RESCUE', offers.rescue], ['REQUEST_HACK', offers.hack],
      ['SHOWDOWN_SHOT', offers['showdown-shot']], ['SCAN', offers.scan], ['SUPPLY', offers.supply], ['VOTE', offers.vote], ['RELEASE_CHOICE', offers['release-choice']],
      ['PASS_TURN', offers.pass ? [self] : undefined],
    ].filter(([, list]) => Array.isArray(list)).map(([key, list]) => [key, seats(list)])),
    ownPendingCommandIds: [], ownBallot: null, hasVoted: false, hackPartnerSeatId: null,
  };
  if (move) {
    const own = view.seats.find(item => item.seatId === seat(self));
    own.location = move;
    view.self.movementDestinations = [];
  }
  return FullPlayerViewSchema.parse(view);
}

export function publicView(definition, now, revision = 1, move = null) {
  const view = { ...publicFacts(definition, now, revision), audience: { kind: 'public' } };
  if (move) view.seats.find(item => item.seatId === seat(definition.self ?? 3)).location = move;
  return FullPublicViewSchema.parse(view);
}

export function identities(definition) {
  const names = definition.names ?? NAMES;
  return FullLobbyIdentityDocumentSchema.parse({
    schemaVersion: 1, protocolVersion: 2, catalogVersion: 'crew-0.1.0', matchId: MATCH, revision: 1, locked: true,
    seats: Array.from({ length: definition.count ?? 9 }, (_, index) => ({ seatId: seat(index + 1), displayName: names[index], characterId: CHARACTER[index] })),
  });
}

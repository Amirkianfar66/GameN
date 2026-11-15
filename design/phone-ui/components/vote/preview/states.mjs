// mothership:dev-only
//
// The ballot's and the result window's preview states: one per state the phone pack draws (sheets 35–38
// and 56), on the pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented names,
// seats and results, as the review sheets use). Each state gives the shell's bar and tabs, and the
// component's own input as proposed in docs/design/components/vote.md. What the server decides (who may
// be chosen, the counts, the outcome, the threshold) is written out here as fixture data, standing in
// for the projection; the component never works any of it out.

import { ROSTER, SELF, seatOf } from '../../../prototype/fixtures.mjs';

// The pack's vote fixture has 5 in Hospital, 6 in Jail and 9 out (screens-vote.mjs). Their public status is
// not drawn under the cells that can't be chosen (the owner's T3, the Lead's review of #267): the server's
// reason or "Not available now". The projection gives no reasons today, so the fixture gives none.
const roster = (count = 9, extra = {}) => ROSTER.filter(p => p.seat <= count)
  .map(p => ({ seat: p.seat, name: p.name, character: p.character, candidate: false, reason: null, ...(extra[p.seat] ?? {}) }));

/** Who may be chosen, as the server's public `ballot.eligibleTargets` would say (the fixture's stand-in). */
const TARGETS = Object.freeze({
  jail: Object.freeze([1, 2, 3, 4, 5, 7, 8]),
  captain: Object.freeze([1, 2, 3, 4, 7, 8]),
  runoff: Object.freeze([1, 2]),
});
const withCandidates = (seats, count) => roster(count, Object.fromEntries(seats.map(s => [s, { candidate: true }])));

const seconds = s => ({ remainingMs: s * 1000 });
const voteBar = (kind, { runoff = false, timer = seconds(37) } = {}) => ({
  kind: 'phase', icon: kind === 'captain' ? 'captain' : 'jail',
  title: runoff ? 'Captain runoff' : kind === 'captain' ? 'Captain election' : 'Jail vote',
  sub: runoff ? 'Ava and Ben tied' : 'Your ballot is private',
  round: kind === 'captain' ? 2 : 3, timer, promises: { count: 0 }, menu: {},
});
const resultBar = kind => ({
  kind: 'phase', icon: kind === 'captain' ? 'captain' : 'jail',
  title: kind === 'captain' ? 'Election · result' : 'Jail vote · result', short: 'Vote result',
  round: kind === 'captain' ? 2 : 3, timer: { remainingMs: 4000, ring: 0.2, urgentAtMs: -1 }, menu: {},
});
const tabs = hero => ({ variant: 'game', view: 'room', hero });

/** A ballot state: the shell's bar and round button, and the ballot's own input. */
function ballot(kind, { count = 9, runoff = false, selected = null, own = null, mode = 'open', timer, reason = null } = {}) {
  const hero = mode === 'cannot' ? { mode: 'vote', enabled: false, reason: 'Eliminated players don’t vote' }
    : own !== null ? { mode: 'voted' } : { mode: 'vote', enabled: mode === 'open' };
  return {
    shell: { viewer: SELF, bar: voteBar(kind, { runoff, timer: mode === 'closed' ? seconds(0) : timer }), tabs: tabs(hero) },
    ballot: {
      viewer: SELF, kind, runoff: runoff ? { tied: [...TARGETS.runoff] } : null,
      roster: withCandidates(runoff ? TARGETS.runoff : TARGETS[kind].filter(s => s <= count), count),
      selected, own, mode, busy: null, reason,
    },
  };
}

/** The pack's result fixtures (screens-vote.mjs RESULTS), as `lastTally` would carry them. */
const id = n => `seat-${n}`;
const counts = map => Object.fromEntries(Object.entries(map).map(([s, n]) => [id(s), n]));
const TALLIES = Object.freeze({
  CAPTAIN_ELECTED: { kind: 'CAPTAIN_ELECTION', counts: counts({ 1: 2, 2: 4, 3: 1, 4: 0, 7: 0, 8: 1 }), selectedSeatId: id(2), tiedSeatIds: [] },
  RUNOFF_REQUIRED: { kind: 'CAPTAIN_ELECTION', counts: counts({ 1: 3, 2: 3, 3: 1, 4: 0, 7: 1, 8: 0 }), selectedSeatId: null, tiedSeatIds: [id(1), id(2)] },
  NO_CAPTAIN_ELECTED: { kind: 'CAPTAIN_ELECTION', counts: counts({ 1: 0, 2: 0, 3: 0, 4: 0, 7: 0, 8: 0 }), selectedSeatId: null, tiedSeatIds: [] },
  PLAYER_JAILED: { kind: 'JAIL_VOTE', counts: counts({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 0, 7: 5, 8: 0 }), selectedSeatId: id(7), tiedSeatIds: [] },
  JAIL_FULL: { kind: 'JAIL_VOTE', counts: counts({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 0, 7: 5, 8: 0 }), selectedSeatId: id(7), tiedSeatIds: [] },
  NO_JAIL_SELECTION: { kind: 'JAIL_VOTE', counts: counts({ 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 7: 3, 8: 1 }), selectedSeatId: null, tiedSeatIds: [] },
});

/** A result state: the shell's bar (the 5 s ring) and the window's public input. */
function result(outcome, { count = 9 } = {}) {
  const t = TALLIES[outcome], kind = t.kind === 'CAPTAIN_ELECTION' ? 'captain' : 'jail';
  // The pack counts everyone not out as able to vote: 8 of 9 (Ike, seat 9, is out), and 8 of 8.
  const eligibleVoterCount = roster(count).filter(p => p.seat !== 9).length;
  return {
    shell: { viewer: SELF, bar: resultBar(kind), tabs: tabs({ mode: 'vote', enabled: false }) },
    result: {
      viewer: SELF, round: kind === 'captain' ? 2 : 3, needed: kind === 'jail' ? 4 : null,
      tally: { ...t, phaseId: `fixture-${kind}-vote`, outcome, eligibleVoterCount },
      roster: withCandidates(TARGETS[kind].filter(s => s <= count), count),
    },
  };
}

const large = state => ({ ...state, sizes: ['320x568'], text: 200 });

/** Every state, by key: its caption, the sheet it comes from, and its inputs. */
export const VOTE_STATES = Object.freeze({
  // Sheet 35: the Jail vote.
  'jail-open': { sheet: '35', caption: 'Jail vote · open', ...ballot('jail') },
  'jail-selected': { sheet: '35', caption: 'Jail vote · Ava selected', ...ballot('jail', { selected: 1 }) },
  'jail-submitted': { sheet: '35', caption: 'Jail vote · ballot registered', ...ballot('jail', { own: { seat: 1 } }) },
  'jail-abstained': { sheet: '35', caption: 'Jail vote · abstained', ...ballot('jail', { own: { abstained: true } }) },
  'jail-closed': { sheet: '35', caption: 'Jail vote · closed, result next', ...ballot('jail', { mode: 'closed' }) },
  // Sheet 36: the Captain election and stable placement.
  'captain-open': { sheet: '36', caption: 'Captain election · 9 players', ...ballot('captain') },
  'captain-runoff': { sheet: '36', caption: 'Captain runoff · Ava and Ben tied', ...ballot('captain', { runoff: true, timer: seconds(52) }) },
  'captain-8-selected': { sheet: '36', caption: 'Captain election · 8 players · Ava selected', ...ballot('captain', { count: 8, selected: 1 }) },
  'jail-7': { sheet: '36', caption: 'Jail vote · 7 players', ...ballot('jail', { count: 7 }) },
  // The reason is this viewer's, from the projection (the pack's words for an eliminated player).
  'jail-cannot': { sheet: '36', caption: 'Jail vote · you can’t vote', ...ballot('jail', { mode: 'cannot', reason: 'Eliminated players don’t vote.' }) },
  // Sheet 37: the Captain election's results.
  'result-elected': { sheet: '37', caption: 'Result · Ben is Captain', ...result('CAPTAIN_ELECTED') },
  'result-runoff': { sheet: '37', caption: 'Result · tie, runoff', ...result('RUNOFF_REQUIRED') },
  'result-no-captain': { sheet: '37', caption: 'Result · no Captain', ...result('NO_CAPTAIN_ELECTED') },
  // Sheet 38: the Jail vote's results.
  'result-jailed': { sheet: '38', caption: 'Result · Gus goes to Jail', ...result('PLAYER_JAILED') },
  'result-jail-full': { sheet: '38', caption: 'Result · Gus chosen, Jail full', ...result('JAIL_FULL') },
  'result-no-one': { sheet: '38', caption: 'Result · no one goes to Jail', ...result('NO_JAIL_SELECTION') },
  'result-jailed-8': { sheet: '38', caption: 'Result · Gus goes to Jail · 8 players', ...result('PLAYER_JAILED', { count: 8 }) },
  // Sheet 56: 320 × 568 at the Largest text (200%).
  'large-result-jailed': { sheet: '56', caption: 'Largest text · Jail result', ...large(result('PLAYER_JAILED')) },
  'large-result-elected': { sheet: '56', caption: 'Largest text · Captain result', ...large(result('CAPTAIN_ELECTED')) },
  'large-result-runoff': { sheet: '56', caption: 'Largest text · runoff result', ...large(result('RUNOFF_REQUIRED')) },
  'large-jail-selected': { sheet: '56', caption: 'Largest text · Jail ballot, Ava selected', ...large(ballot('jail', { selected: 1 })) },
  'large-captain': { sheet: '56', caption: 'Largest text · Captain ballot', ...large(ballot('captain')) },
  'large-runoff': { sheet: '56', caption: 'Largest text · runoff ballot', ...large(ballot('captain', { runoff: true, timer: seconds(52) })) },
  // Not drawn by the pack as its own frame; the shell's and the component's policies.
  'jail-stale': { sheet: '45', caption: 'Jail vote · reconnecting, cells refused', ...ballot('jail', { selected: 1 }), status: 'stale' },
  'jail-concealed': { sheet: '—', caption: 'Jail vote · concealed: nothing private', ...ballot('jail', { selected: 1 }), status: 'concealed' },
  'result-concealed': { sheet: '—', caption: 'Result · concealed: nothing drawn', ...result('PLAYER_JAILED'), status: 'concealed' },
});

/** The pack's frame (sheet, state query) each state is compared with, where the pack draws it. */
export const PACK_FRAMES = Object.freeze({
  'jail-open': 'vote&kind=jail', 'jail-selected': 'vote&kind=jail&state=selected', 'jail-submitted': 'vote&kind=jail&state=submitted',
  'jail-abstained': 'vote&kind=jail&state=abstained', 'jail-closed': 'vote&kind=jail&state=closed',
  'captain-open': 'vote&kind=captain', 'captain-runoff': 'vote&kind=captain&state=runoff',
  'captain-8-selected': 'vote&kind=captain&roster=8&state=selected', 'jail-7': 'vote&kind=jail&roster=7', 'jail-cannot': 'vote&kind=jail&state=cannot',
  'result-elected': 'result&outcome=CAPTAIN_ELECTED', 'result-runoff': 'result&outcome=RUNOFF_REQUIRED', 'result-no-captain': 'result&outcome=NO_CAPTAIN_ELECTED',
  'result-jailed': 'result&outcome=PLAYER_JAILED', 'result-jail-full': 'result&outcome=JAIL_FULL', 'result-no-one': 'result&outcome=NO_JAIL_SELECTION',
  'result-jailed-8': 'result&outcome=PLAYER_JAILED&roster=8',
});

export { seatOf };

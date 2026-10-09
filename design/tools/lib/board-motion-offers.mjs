// mothership:dev-only
// Static eligibility predicates for synthetic offers, read from the accepted overlays and
// packages/engine/src/full-game/lifecycle.ts at 94a49ce0c5220b814ec56333b028fbe6180b257e.
// This checks actor/round/phase/status and target gates, not resources, prior commands,
// recorded runoff history or reachability of a complete match. Production uses projections.

export function offerProblems(state, viewer) {
  const problems = [];
  const { round, phase, active, seats, ballot } = state.public;
  const { role, offers } = state.private;
  const self = seats.find(seat => seat.n === viewer);
  if (!self) return ['the viewer is not in the match'];
  const alive = seat => Boolean(seat) && seat.health !== 'Eliminated';
  const ready = seat => seat?.health === 'Healthy' && !seat.jailed;
  const ownTurn = phase.kind === 'ORDINARY_TURN' && active === viewer;
  const beforeVoting = ['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION'].includes(phase.kind);
  const fail = (condition, message) => { if (!condition) problems.push(message); };
  const present = value => Array.isArray(value) ? value.length > 0 : Boolean(value);
  const seatById = n => seats.find(seat => seat.n === n);

  for (const [kind, offer] of Object.entries(offers)) {
    if (!present(offer)) continue;
    if (['shot', 'disable', 'protect', 'rescue', 'hack', 'scan', 'supply'].includes(kind)) {
      fail(ownTurn && alive(self), `${kind} requires the living actor's own ordinary turn`);
      if (!['rescue', 'hack'].includes(kind)) fail(ready(self), `${kind} requires a Healthy, unjailed actor`);
      if (kind === 'shot') fail(role === 'Officer' ? seats.length === 9 : round >= 4, 'shot requires the nine-player Officer or Round 4 or later');
      if (kind === 'disable') fail(['Blue Disabler', 'Red Disabler'].includes(role), 'disable requires a Disabler');
      if (kind === 'protect') fail(role === 'Undercover', 'protect requires Undercover');
      if (kind === 'scan') fail(role === 'Hacker', 'scan requires Hacker');
      if (kind === 'supply') fail(role === 'Supplier' && round === 3, 'supply requires Supplier in Round 3');
      if (kind === 'rescue') fail(role === 'Cracker' && !self.jailed, 'rescue requires a living, unjailed Cracker');
      for (const n of offer) {
        const target = seatById(n);
        if (!target) continue; // Roster membership has its own checker diagnostic.
        fail(alive(target), `${kind} offers Eliminated Player ${n}`);
        if (kind === 'rescue') {
          fail(target.location !== 'Command Room' && (target.location === self.location || (['Room A', 'Room B'].includes(self.location) && target.location === 'Hospital')),
            `rescue offers Player ${n} outside its local/Hospital exception`);
          fail(ready(self) || n === viewer, `injured rescue offers another player (${n})`);
        }
      }
    }
    if (kind === 'move') {
      fail(beforeVoting && ready(self) && ['Room A', 'Room B', 'Command Room'].includes(self.location), 'move requires a Healthy, unjailed actor in A/B/Command before voting');
      for (const room of offer) {
        fail(['Room A', 'Room B', 'Command Room'].includes(room) && room !== self.location, `move offers invalid/current room ${room}`);
        fail(room !== 'Command Room' || self.captain, 'move offers Command Room to a non-Captain');
      }
    }
    if (kind === 'code') fail(role === 'Hacker' && alive(self) && round === 5 && !['SHOWDOWN', 'FINISHED', 'ABORTED'].includes(phase.kind), 'code requires a living Hacker in Round 5 before normal resolution closes');
    if (kind === 'pass') fail(ownTurn && alive(self) && !state.legacy, 'pass requires a living actor on their own ordinary turn in the Pass tuple');
    if (kind === 'showdown-shot') {
      fail(phase.kind === 'SHOWDOWN' && round === 5 && alive(self), 'showdown-shot requires a living actor in Round 5 Showdown');
      for (const n of offer) fail(n !== viewer && alive(seatById(n)), `showdown-shot offers self or Eliminated Player ${n}`);
    }
    if (kind === 'vote') {
      fail(['CAPTAIN_ELECTION', 'JAIL_VOTE'].includes(phase.kind) && offer.on === phase.kind, 'vote requires its current election/Jail phase');
      fail(alive(self) && ballot?.voters.includes(viewer), 'vote requires a living eligible voter');
      fail(JSON.stringify(offer.targets) === JSON.stringify(ballot?.targets), 'vote targets differ from the public ballot');
    }
    if (kind === 'release-choice') {
      fail(phase.kind === 'RELEASE_CHOICE' && active === viewer && self.captain, 'release-choice requires the active Captain in Release choice');
      for (const n of offer) fail(alive(seatById(n)) && seatById(n)?.jailed, `release-choice offers a free or Eliminated Player ${n}`);
    }
    if (kind === 'release-vote') fail(phase.kind === 'RELEASE_VOTE' && alive(self) && ballot?.voters.includes(viewer), 'release-vote requires a living eligible voter in Release vote');
  }
  if (['CAPTAIN_ELECTION', 'JAIL_VOTE', 'RELEASE_VOTE'].includes(phase.kind)) {
    const voters = seats.filter(alive).map(seat => seat.n);
    fail(JSON.stringify(ballot?.voters) === JSON.stringify(voters), 'ballot voters must include all living players, including Injured/Jailed');
    if (phase.kind === 'CAPTAIN_ELECTION') fail(round >= 2, 'Captain election starts at a round boundary after Round 1');
    for (const n of ballot?.targets ?? []) {
      const target = seatById(n);
      fail(Boolean(target) && (phase.kind === 'CAPTAIN_ELECTION' ? ready(target) : alive(target) && !target.jailed),
        `${phase.kind} offers ineligible candidate Player ${n}`);
    }
  }
  return problems;
}

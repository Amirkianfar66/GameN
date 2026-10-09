// mothership:dev-only
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCENARIOS, VIEWER } from '../../../design/board-motion/js/fixtures.js';
import { offerProblems } from '../../../design/tools/lib/board-motion-offers.mjs';

const fixture = id => structuredClone(SCENARIOS.find(entry => entry.id === id).s());
test('all synthetic board offers satisfy the checked predicates; crowd cases remain layout stress', () => {
  for (const entry of SCENARIOS) {
    assert.deepEqual(offerProblems(entry.s(), VIEWER), [], entry.id);
    if (entry.group === 'Crowded rooms') assert.equal(entry.status, 'layout-stress', entry.id);
  }
});

const cases = [
  ['Code in Round 2', 'code.two', s => { s.public.round = 2; }, /code requires a living Hacker in Round 5/],
  ['Code from a non-Hacker', 'code.two', s => { s.private.role = 'Insider'; }, /code requires a living Hacker/],
  ['Code in Showdown', 'code.two', s => { s.public.phase.kind = 'SHOWDOWN'; }, /before normal resolution closes/],
  ['Supply in Round 2', 'crowd.supply', s => { s.public.round = 2; }, /supply requires Supplier in Round 3/],
  ['Supply by the wrong role', 'supply.first', s => { s.private.role = 'Officer'; }, /supply requires Supplier/],
  ['Command movement by a non-Captain', 'move.tags', s => { s.public.seats[2].captain = false; }, /move offers Command Room to a non-Captain/],
  ['movement during a vote', 'move.tags', s => { s.public.phase.kind = 'JAIL_VOTE'; }, /before voting/],
  ['movement by an Injured actor', 'move.tags', s => { s.public.seats[2].health = 'Injured'; }, /move requires a Healthy/],
  ['ordinary action during another turn', 'shot.choose', s => { s.public.active = 1; }, /shot requires.*own ordinary turn/],
  ['ordinary shot from a non-Officer before Round 4', 'shot.choose', s => { s.private.role = 'Hacker'; }, /shot requires the nine-player Officer or Round 4/],
  ['Protection by the wrong role', 'protect.choose', s => { s.private.role = 'Hacker'; }, /protect requires Undercover/],
  ['Protection by a Jailed actor', 'protect.choose', s => { s.public.seats[2].jailed = true; }, /protect requires a Healthy, unjailed/],
  ['Captain election in Round 1', 'vote.election', s => { s.public.round = 1; }, /after Round 1/],
  ['an Injured Captain candidate', 'vote.election', s => { s.public.ballot.targets.push(6); s.private.offers.vote.targets.push(6); }, /ineligible candidate Player 6/],
  ['a Jailed Captain candidate', 'vote.election', s => { s.public.ballot.targets.push(9); s.private.offers.vote.targets.push(9); }, /ineligible candidate Player 9/],
  ['a mismatched ballot phase', 'vote.election', s => { s.private.offers.vote.on = 'JAIL_VOTE'; }, /vote requires its current/],
  ['excluding Injured/Jailed voters', 'vote.election', s => { s.public.ballot.voters = [1, 2, 3, 4, 5, 7, 8]; }, /include all living players/],
  ['an Injured Cracker rescuing another player', 'rescue.self', s => { s.private.offers.rescue = [6]; }, /injured rescue offers another player/],
];
for (const [name, id, change, diagnostic] of cases) test(`the offer guard refuses ${name}`, () => {
  const state = fixture(id); change(state);
  assert.match(offerProblems(state, VIEWER).join('\n'), diagnostic);
});

test('the guard preserves the canon exceptions for Code, Hack, injured self-Rescue and voters', () => {
  const code = fixture('code.two');
  code.public.active = 1; code.private.offers.pass = false; code.private.offers.move = [];
  code.public.seats[2].health = 'Injured'; code.public.seats[2].jailed = true;
  assert.deepEqual(offerProblems(code, VIEWER), []); // Code is not an own-turn/Healthy-only action.
  const hack = fixture('hack.choose');
  hack.public.seats[2].health = 'Injured'; hack.private.offers.move = [];
  assert.deepEqual(offerProblems(hack, VIEWER), []); // Hack needs a living actor, not a ready actor.
  assert.deepEqual(offerProblems(fixture('rescue.self'), VIEWER), []);
  assert.deepEqual(offerProblems(fixture('vote.election'), VIEWER), []); // Injured/Jailed still vote.
});

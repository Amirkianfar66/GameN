import type { Mode } from './model.js';

// Exact information bound for the Hacker's Code deduction from Scans alone.
//
// This is combinatorics over the rules, not a simulation and not a win rate. Assumptions:
//   1. Hacker knows only their own role and who Undercover is (R-SETUP-09).
//   2. Roles are dealt uniformly, so Alien is equally likely to be any other candidate.
//   3. The three Code extras are a uniform 3-subset of the non-Alien, non-Undercover players.
//      No rule source states this distribution (decision D21).
//   4. Every counted Scan succeeds: the faction guess is right and the app returns membership
//      (R-ROLE-13). Failed Scans, conversation, Hack answers and behaviour are ignored.
// Under these assumptions the value is the best probability of submitting the exact Code that
// any adaptive choice of Scan targets can reach with the stated number of successful Scans.

interface HiddenState {
  alien: number;
  mask: number;
}

export interface CodeInfoRow {
  mode: Mode;
  successfulScans: number;
  hiddenStates: number;
  correctStates: number;
  probability: number;
}

function hiddenStates(candidates: number): HiddenState[] {
  // Index 0 is the Hacker; indices 1..candidates-1 are the other non-Undercover players.
  const states: HiddenState[] = [];
  for (let alien = 1; alien < candidates; alien += 1) {
    const others = Array.from({ length: candidates }, (_, index) => index).filter(index => index !== alien);
    for (let a = 0; a < others.length; a += 1) {
      for (let b = a + 1; b < others.length; b += 1) {
        for (let c = b + 1; c < others.length; c += 1) {
          states.push({ alien, mask: (1 << alien) | (1 << (others[a] as number)) | (1 << (others[b] as number)) | (1 << (others[c] as number)) });
        }
      }
    }
  }
  return states;
}

function bestGuess(states: readonly HiddenState[]): number {
  const counts = new Map<number, number>();
  let best = 0;
  for (const state of states) {
    const next = (counts.get(state.mask) ?? 0) + 1;
    counts.set(state.mask, next);
    if (next > best) best = next;
  }
  return best;
}

function bestCorrect(states: readonly HiddenState[], scanned: number, remaining: number, candidates: number): number {
  if (remaining === 0 || states.length === 0) return bestGuess(states);
  // Unscanned players other than the Hacker are exchangeable given any history, so scanning
  // the lowest-numbered one represents scanning any of them.
  const actions: number[] = [];
  if ((scanned & 1) === 0) actions.push(0);
  for (let index = 1; index < candidates; index += 1) {
    if ((scanned & (1 << index)) === 0) { actions.push(index); break; }
  }
  if (actions.length === 0) return bestGuess(states);
  let best = 0;
  for (const target of actions) {
    const alien: HiddenState[] = [];
    const inside: HiddenState[] = [];
    const outside: HiddenState[] = [];
    for (const state of states) {
      if (state.alien === target) alien.push(state);
      else if ((state.mask & (1 << target)) !== 0) inside.push(state);
      else outside.push(state);
    }
    const nextScanned = scanned | (1 << target);
    const value = bestCorrect(alien, nextScanned, remaining - 1, candidates)
      + bestCorrect(inside, nextScanned, remaining - 1, candidates)
      + bestCorrect(outside, nextScanned, remaining - 1, candidates);
    if (value > best) best = value;
  }
  return best;
}

export function scanInformationBound(mode: Mode, maxScans = 5): CodeInfoRow[] {
  const candidates = mode - 1;
  const states = hiddenStates(candidates);
  return Array.from({ length: maxScans + 1 }, (_, successfulScans) => {
    const correctStates = bestCorrect(states, 0, successfulScans, candidates);
    return { mode, successfulScans, hiddenStates: states.length, correctStates, probability: correctStates / states.length };
  });
}

export interface DamageBudget {
  mode: Mode;
  attacksBeforeShowdown: number;
  maxEliminationsBeforeShowdown: number;
  hitPointsOfNonAlienPlayers: number;
  maxTotalDamageIncludingShowdown: number;
  alienSoloReachable: boolean;
  redEliminationWinBeforeShowdown: 'impossible' | 'possible';
  blueEliminationWinBeforeShowdown: 'impossible' | 'needs-red-held-attacks' | 'possible';
}

/**
 * Damage arithmetic that follows from the resource rules with optional powers off
 * (R-SETUP-10, R-ROLE-*, R-SHOW-02). Every attack deals one damage; elimination needs two.
 */
export function damageBudget(mode: Mode): DamageBudget {
  const reds = mode === 7 ? 2 : 3;
  const blues = mode === 9 ? 5 : 4;
  // Undercover weapon + two Supplier weapons + Blue Disabler, plus Red Disabler (8, 9) and Officer (9).
  const attacks = 4 + (mode >= 8 ? 1 : 0) + (mode === 9 ? 1 : 0);
  // Undercover's weapon and Red Disabler's use are held by Red players from the start.
  const redHeld = 1 + (mode >= 8 ? 1 : 0);
  const nonAlien = mode - 1;
  // Each showdown participant fires at most one special shot, so the showdown adds at most `mode` damage.
  const maxTotal = attacks + mode;
  return {
    mode,
    attacksBeforeShowdown: attacks,
    maxEliminationsBeforeShowdown: Math.floor(attacks / 2),
    hitPointsOfNonAlienPlayers: nonAlien * 2,
    maxTotalDamageIncludingShowdown: maxTotal,
    alienSoloReachable: maxTotal >= nonAlien * 2,
    redEliminationWinBeforeShowdown: attacks >= blues * 2 ? 'possible' : 'impossible',
    blueEliminationWinBeforeShowdown: attacks < reds * 2 ? 'impossible' : attacks - redHeld < reds * 2 ? 'needs-red-held-attacks' : 'possible',
  };
}

export interface DurationBound {
  mode: Mode;
  minimumSeconds: number;
  typicalUpperSeconds: number;
}

/**
 * Arithmetic from the fixed 60-second windows (R-FLOW-05..07) with nobody eliminated. It is
 * not a measured duration: teaching, adjudication, pauses and table handling are excluded.
 */
export function durationBound(mode: Mode): DurationBound {
  const round = mode * 60 + 60;
  const minimum = 5 * round + 60;
  // One Hack per player, a Captain election before each of Rounds 2-5, a release choice in four
  // rounds, one release vote and the showdown window. Runoffs would add more.
  const upper = 5 * round + 4 * 60 + mode * 60 + 4 * 60 + 60 + 60;
  return { mode, minimumSeconds: minimum, typicalUpperSeconds: upper };
}

// mothership:dev-only
//
// Pilot 3: two characters walking into the Private Talk capsule, conversing and returning, as a
// comic page on the shared display, over the approved S2 film (design/board-v2/films/capsule.mjs:
// capsuleFrame(), capsulePerson(), homePerson(), unchanged). The page has three panels: each
// participant's own room, framed on its place (P1 above, P2 below: the lower player number first,
// as S2 orders them), and the capsule's interior. S2's beats play inside the panels; this module
// adds only the page's own beats: its panels assembling and leaving, and the comic accents.
//
//   entrance  the result stage (5 s, HACK_RESULT): the page assembles over the board, the pair stand
//             and step out of their rooms toward the capsule, the door opens, they walk in by their
//             paths, sit, the door closes, the busy light comes on; the page leaves before the
//             stage ends, uncovering the board with the pair seated in its capsule panel. The
//             conversation's minute starts at its own authoritative start: nothing here takes from it.
//   talk      the conversation (60 s, HACK): the capsule panel's seated variations (S2's seeded,
//             speaker-neutral loop): no mouth, speaker, gesture-to-speech or sound. A review render
//             shows a 6 s excerpt of the panel enlarged; the runtime keeps it in the board's panel.
//   exit      from the conversation's end: the door opens, they stand, walk out by their paths and
//             step back into their rooms at their latest places; it plays over whatever stage comes
//             next and blocks nothing (a proposal for the owner: the page form on the display, or
//             S2's board-only exit; see the motion bible).
//   reduced   S2's reduced variants (one cross-faded swap, the door's two states), in the same page,
//             which appears and leaves by an 80 ms fade.
//
// Inputs: S2's (the stage, ms from its authoritative start, the public pair as two seat ids ordered
// by player number, each participant's public place, health and detention, the exchange's public
// id, reduced). Never the declared side, the claim, a role, who asked, who speaks or any audio of
// the conversation. Movement sounds (steps, the door) are public, like the pair.

import { CAPSULE_FILM, capsuleEnd } from '../../../board-v2/films/capsule.mjs';
import { beat, clamp01, easeInCubic, easeOutBack, easeOutCubic, r2 } from '../../lib/ease.mjs';

export const PRIVATE_TALK_VERSION = 'cinematic-private-talk-0.1.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);
export const CASES = Object.freeze(['entrance', 'talk', 'exit']);

/** The page's beats per case, in ms from the stage's authoritative start; S2's own beats run inside. */
export const PAGE = Object.freeze({
  entrance: Object.freeze({ end: 4900, in: Object.freeze([[0, 300], [80, 380], [160, 460]]), out: Object.freeze([4300, 4800]), s2: 'result', s2End: capsuleEnd('result') }),
  talk: Object.freeze({ end: 6000, excerpt: Object.freeze([0, 6000]), s2: 'talk' }),
  exit: Object.freeze({ end: 2800, in: Object.freeze([[0, 200], [40, 240], [0, 160]]), out: Object.freeze([2300, 2750]), s2: 'exit', s2End: capsuleEnd('exit') }),
  reduced: Object.freeze({ fade: 80, entrance: Object.freeze({ end: 2000, out: 1700 }), exit: Object.freeze({ end: 1100, out: 800 }), talk: Object.freeze({ end: 3000 }) }),
});

/** The display's page layout, 1920 x 1080: the two rooms stacked on the left, the capsule on the right. */
export const LAYOUT = Object.freeze({
  width: 1920, height: 1080,
  P1: Object.freeze({ x: 40, y: 60, w: 880, h: 465 }),
  P2: Object.freeze({ x: 40, y: 555, w: 880, h: 465 }),
  capsule: Object.freeze({ x: 950, y: 60, w: 930, h: 960 }),
});

export const pageEnd = (caseName, variant) => (variant === 'reduced' ? PAGE.reduced[caseName].end : PAGE[caseName].end);

/**
 * The page at t for a case: each panel's presence (0..1) and slam (its scale over 1), the backdrop's
 * dim, and the S2 stage and t to draw inside. done: the page is gone (the board alone).
 */
export function pageFrame(caseName, t, { reduced = false } = {}) {
  const P = PAGE[caseName];
  const end = pageEnd(caseName, reduced ? 'reduced' : 'full');
  const out = { case: caseName, t, done: t >= end || t < 0, panels: { P1: 0, P2: 0, capsule: 0 }, slam: { P1: 0, P2: 0, capsule: 0 }, dim: 0, s2: { stage: P.s2, t: Math.max(0, t) } };
  if (out.done) return out;
  if (caseName === 'talk') {
    out.panels = { P1: 0, P2: 0, capsule: 1 };
    out.dim = 0.6;
    return out;
  }
  if (reduced) {
    const R = PAGE.reduced;
    const v = Math.min(clamp01(t / R.fade), 1 - clamp01((t - R[caseName].out) / R.fade));
    out.panels = { P1: v, P2: v, capsule: v };
    out.dim = r2(0.7 * v);
    return out;
  }
  const keysIn = P.in;
  ['P1', 'P2', 'capsule'].forEach((id, i) => {
    const v = easeOutCubic(beat(t, keysIn[i]));
    const leaving = easeInCubic(beat(t, [P.out[0] + i * 60, P.out[1]]));
    out.panels[id] = r2(Math.min(v, 1 - leaving));
    out.slam[id] = r2(t < keysIn[i][1] ? 0.08 * (1 - easeOutBack(beat(t, keysIn[i]), 2)) : -0.04 * leaving);
  });
  out.dim = r2(0.72 * Math.min(easeOutCubic(beat(t, [0, 300])), 1 - easeInCubic(beat(t, P.out))));
  return out;
}

/** S2's exit beats, for the comic accents' timing (the door, each participant's return). */
export const S2 = CAPSULE_FILM;

/** The public cue sheets: steps and the door, the busy chime. No sound of the conversation exists here. */
export const AUDIO = Object.freeze({
  entrance: Object.freeze([
    { at: 0, cue: 'ink-cut', gain: 0.5 },
    ...[880, 1180].map(at => ({ at, cue: 'footstep', gain: 0.7 })),
    { at: 1250, cue: 'door-slide' },
    ...[1700, 1990, 2280, 2150, 2450, 2750].map(at => ({ at, cue: 'footstep', gain: 0.6 })),
    { at: 2650, cue: 'seat-settle' }, { at: 2950, cue: 'seat-settle' },
    { at: 3300, cue: 'door-slide' }, { at: 3560, cue: 'door-seal' }, { at: 3600, cue: 'busy-chime' },
  ]),
  exit: Object.freeze([
    { at: 0, cue: 'door-slide' }, { at: 320, cue: 'seat-settle' },
    ...[600, 880, 1160, 520, 800, 1080].map(at => ({ at, cue: 'footstep', gain: 0.6 })),
    { at: 1300, cue: 'door-slide' }, { at: 1560, cue: 'door-seal' },
    ...[1420, 1720, 1900].map(at => ({ at, cue: 'footstep', gain: 0.5 })),
  ]),
  reduced: Object.freeze([{ at: 700, cue: 'door-seal', gain: 0.6 }]),
  talk: Object.freeze([]),
});

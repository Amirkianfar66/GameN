// mothership:dev-only
//
// Pilot 2: the Blackhole reveal and the ship's passage, for a public BLACKHOLE_SYNCED occurrence
// (protocol 3 candidate, packages/contracts/src/planet-game.ts at 79418e7): played only after the
// authorized Sync checkpoint, once the server has published the selected world's state. It shows
// that a Blackhole's realities were resolved, never which, how many, who, or what was discarded.
//
//   full      the default, phones and the display alike: 2.4 s from the Sync, inside the Jail vote's
//             first seconds and without extending anything. The Blackhole plays behind the crew:
//             each room's back wall gives way to one shared field of space, the blackhole forming
//             at the board's centre, the ship streaking across behind the rooms into it, the flare,
//             and the walls returning. It is drawn only in the rooms' art layers, under every
//             figure, name tag, room label, press area, timer and bar, so nothing a player selects
//             or reads during the vote is covered, moved or dimmed (the owner's review of
//             6 November 2026; the brief: "keep selectable characters, room labels, slots, cards
//             and timers as interactive layers"). The event's name is the client's live words;
//             the lettered title stays with the stage cut and the inserts.
//   stage     the 5.2 s display cut (the board pulled into an ink bloom, space, the blackhole
//             forming, the luminous title, the passage, the ink-wipe cut and the settled board).
//             It covers the board, so it plays only if the owner approves a separate presentation
//             stage before the vote (request R1); until then it is never the default.
//   reduced   the walls show the still blackhole for 1.2 s, cross-faded in and out over 120 ms:
//             no zoom, pull, spin, streak or wipe; the same layers, the same nothing covered.
//   insert    the space shot alone (identity-free, textless or titled), for a runtime that prefers
//             a prerendered movie; its poster and a lightweight animated alternative go with it.
//
// Inputs: the occurrence (kind BLACKHOLE_SYNCED, public, actorSeatId null), its presentation start,
// the device's reduced-motion setting. Not an input: any world, branch, actor, Alien, population or
// pre-Sync state. Visual completion selects nothing and finalizes nothing: the board drawn at the end
// is the snapshot the server already published, and the film is skipped on a late load (motion bible).

import { bell, beat, clamp01, easeInCubic, easeInExpo, easeInOutCubic, easeOutBack, easeOutCubic, easeOutExpo, inBeat, lerp, noise, r2, ramp } from '../../lib/ease.mjs';

export const BLACKHOLE_VERSION = 'cinematic-blackhole-0.1.0';
export const VARIANTS = Object.freeze(['full', 'stage', 'reduced']);

export const BEATS = Object.freeze({
  display: Object.freeze({
    end: 5200,
    dim: Object.freeze([0, 420]),
    pull: Object.freeze([0, 700]),
    bloom: Object.freeze([240, 760]),
    form: Object.freeze([620, 1900]),
    title: Object.freeze([1050, 1450]),
    titleHold: Object.freeze([1450, 2900]),
    titleOut: Object.freeze([2900, 3250]),
    shipIn: Object.freeze([1700, 3250]),
    horizon: 3250,
    flare: Object.freeze([3250, 3650]),
    emerge: Object.freeze([3350, 3900]),
    wipe: Object.freeze([3800, 4450]),
    settle: Object.freeze([4400, 5200]),
  }),
  /** The default on every surface: behind the crew, 2.4 s from the Sync, in the rooms' art layers only. */
  board: Object.freeze({
    end: 2400,
    wallIn: Object.freeze([0, 420]),
    form: Object.freeze([120, 980]),
    ship: Object.freeze([620, 1350]),
    flare: Object.freeze([1350, 1680]),
    wallOut: Object.freeze([1880, 2400]),
    /** The walls' space at its fullest: the rooms' own art still faintly there, never black. */
    peak: 0.88,
  }),
  reduced: Object.freeze({ end: 1440, fade: 120, hold: 1200 }),
  insert: Object.freeze({ end: 3600 }),
});

/** When a surface's variant is over: behind the crew (the default), the stage cut (display, if approved), the still or the insert. */
export const filmEnd = (surface, variant) => (surface === 'insert' ? BEATS.insert.end
  : variant === 'reduced' ? BEATS.reduced.end
    : variant === 'stage' && surface !== 'phone' ? BEATS.display.end : BEATS.board.end);

/**
 * Behind the crew at t (the default, and the reduced still): the walls' share of space (0 the room's
 * own art, BEATS.board.peak at most), the hole { r: its radius as a share of the rooms' shorter
 * side, spin, glow, flare } and the ship's share of its streak toward the hole (null outside it).
 * Nothing in it covers anything: the composition draws it in the art layers alone.
 */
export function boardFrame(t, { reduced = false } = {}) {
  const B = BEATS.board;
  const frame = { t, done: false, space: 0, hole: null, ship: null };
  if (reduced) {
    const R = BEATS.reduced;
    if (t < 0 || t >= R.end) return { ...frame, done: t >= R.end };
    const v = Math.min(ramp(t, 0, R.fade), 1 - ramp(t, R.fade + R.hold, R.end));
    return { ...frame, space: r2(B.peak * v), hole: { r: 0.17, spin: 0.6, glow: 1, flare: 0 } };
  }
  if (t < 0 || t >= B.end) return { ...frame, done: t >= B.end };
  frame.space = r2(B.peak * Math.min(easeOutCubic(beat(t, B.wallIn)), 1 - easeInOutCubic(beat(t, B.wallOut))));
  const form = easeOutExpo(beat(t, B.form));
  frame.hole = { r: r2(lerp(0.01, 0.17, form) * (inBeat(t, B.flare) ? 1 + 0.08 * bell(beat(t, B.flare)) : 1)), spin: r2(t / 420), glow: r2(clamp01(form * 1.2)), flare: inBeat(t, B.flare) ? r2(beat(t, B.flare)) : 0 };
  if (inBeat(t, B.ship)) frame.ship = { v: r2(easeInExpo(beat(t, B.ship)) * 0.8 + beat(t, B.ship) * 0.2) };
  return frame;
}

/**
 * The display's frame at t:
 *   dim (0..1), pull (the board's scale), bloom (the ink bloom's radius share), space (whether
 *   space is drawn), hole { r, spin, glow, flare }, title { scale, opacity, split, glow },
 *   ship { at [x, y] px, scale, angle, stretch, echoes, opacity, engine } or null,
 *   wipe (0..1, null outside), board { scale } (the board's settle), settle (0..1), cam { zoom, shake }
 */
export function displayFrame(t, { width = 1920, height = 1080 } = {}) {
  const B = BEATS.display;
  const cx = width / 2, cy = height * 0.46;
  const frame = { t, done: t >= B.end, dim: 0, pull: 1, bloom: 0, space: false, hole: null, title: { opacity: 0 }, ship: null, wipe: null, board: { scale: 1 }, settle: 0, cam: { zoom: 1, shake: [0, 0] }, center: [cx, cy] };
  if (t < 0 || t >= B.end) return frame;
  frame.dim = r2(0.75 * easeOutCubic(beat(t, B.dim)));
  frame.pull = r2(1 - 0.05 * easeInCubic(beat(t, B.pull)));
  frame.bloom = r2(easeInExpo(beat(t, B.bloom)));
  frame.space = t >= B.bloom[0];
  // The hole forms from a point, spins, and flares as the ship crosses its horizon.
  const form = easeOutExpo(beat(t, B.form));
  const r = lerp(2, 132, form) * (t >= B.horizon ? 1 + 0.06 * bell(beat(t, B.flare)) : 1);
  frame.hole = { r: r2(r), spin: r2(t / 520), glow: r2(clamp01(form * 1.2)), flare: inBeat(t, B.flare) ? r2(beat(t, B.flare)) : 0 };
  // The camera drifts in on the hole and shakes as the ship crosses.
  frame.cam = { zoom: r2(1 + 0.07 * easeInOutCubic(beat(t, [700, 3600]))), shake: inBeat(t, [3250, 3700]) ? [r2(noise(7, t / 24) * 9 * (1 - beat(t, [3250, 3700]))), r2(noise(9, t / 27) * 9 * (1 - beat(t, [3250, 3700])))] : [0, 0] };
  // The title stamps in, holds with its glow breathing, and lifts away before the passage.
  if (t >= B.title[0] && t < B.titleOut[1]) {
    const v = beat(t, B.title);
    frame.title = {
      scale: r2(t < B.title[1] ? lerp(1.7, 1, easeOutBack(v, 1.4)) : 1 + 0.03 * beat(t, B.titleHold) + 0.08 * easeInCubic(beat(t, B.titleOut))),
      opacity: r2(Math.min(1, v * 3) * (1 - easeInCubic(beat(t, B.titleOut)))),
      split: r2(26 * (1 - easeOutCubic(v)) + 5 * easeInCubic(beat(t, B.titleOut))),
      glow: r2(0.75 + 0.25 * Math.sin(t / 210)),
      y: r2(height * 0.8 - 30 * easeInCubic(beat(t, B.titleOut))),
    };
  }
  // The ship: in from the right, down toward the shadow, faster, stretched, its echoes behind it;
  // gone at the horizon; then out of the shadow toward the camera, filling the frame for the cut.
  if (inBeat(t, B.shipIn)) {
    const v = beat(t, B.shipIn);
    const e = easeInExpo(v) * 0.85 + v * 0.15;
    const from = [width * 1.1, height * 0.2], to = [cx, cy];
    frame.ship = { at: [r2(lerp(from[0], to[0], e)), r2(lerp(from[1], to[1], e))], scale: r2(lerp(0.55, 0.06, easeInCubic(v))), angle: r2(lerp(-8, -24, v)), stretch: r2(1 + 1.6 * easeInExpo(v)), echoes: Math.round(lerp(0, 5, v)), opacity: 1, engine: r2(0.6 + 0.4 * v), phase: 'in' };
  } else if (inBeat(t, B.emerge)) {
    const v = beat(t, B.emerge);
    frame.ship = { at: [r2(cx), r2(lerp(cy, cy + height * 0.12, easeInCubic(v)))], scale: r2(lerp(0.04, 4.2, easeInExpo(v))), angle: r2(lerp(180 + 18, 180 + 6, v)), stretch: r2(1 + 0.4 * bell(v)), echoes: 3, opacity: r2(Math.min(1, v * 4)), engine: 1, phase: 'out' };
  }
  if (inBeat(t, B.wipe)) frame.wipe = r2(easeInOutCubic(beat(t, B.wipe)));
  if (t >= B.wipe[1]) frame.wipe = 1;
  frame.board = { scale: r2(t < B.wipe[0] ? frame.pull : 1 + 0.035 * (1 - easeOutCubic(beat(t, [B.wipe[0], B.settle[1]])))) };
  frame.settle = inBeat(t, B.settle) ? r2(beat(t, B.settle)) : 0;
  return frame;
}

/** The public cue sheets. Sync is public, so is its sound; nothing in it varies with the selected world. */
export const AUDIO = Object.freeze({
  full: Object.freeze([{ at: 120, cue: 'reveal-sting', gain: 0.7 }, { at: 620, cue: 'pass-whoosh', gain: 0.6 }, { at: 1350, cue: 'void-rumble', until: 2350, gain: 0.5 }]),
  stage: Object.freeze([{ at: 0, cue: 'void-rumble', until: 4300 }, { at: 1050, cue: 'reveal-sting' }, { at: 2300, cue: 'pass-whoosh' }, { at: 3250, cue: 'revival-thump', gain: 0.7 }, { at: 3800, cue: 'ink-cut' }]),
  reduced: Object.freeze([{ at: 0, cue: 'reveal-sting', gain: 0.6 }]),
});

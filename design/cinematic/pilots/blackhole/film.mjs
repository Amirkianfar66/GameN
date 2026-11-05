// mothership:dev-only
//
// Pilot 2: the Blackhole reveal and the ship's passage, for a public BLACKHOLE_SYNCED occurrence
// (protocol 3 candidate, packages/contracts/src/planet-game.ts at 79418e7): played only after the
// authorized Sync checkpoint, once the server has published the selected world's state. It shows
// that a Blackhole's realities were resolved, never which, how many, who, or what was discarded.
//
//   display   5.2 s over the shared board: the board pulled into an ink bloom, space, the blackhole
//             forming, the luminous BLACKHOLE title, the ship's passage through the shadow, a comic
//             ink-wipe cut, and the board in its synced checkpoint with a settling ripple.
//   phone     2.4 s, nonblocking: a title band over the board (never over controls), a small ship
//             streaking into a small blackhole, the band closing, the board's ripple.
//   reduced   a still title card (display 1.4 s, phone 1.2 s), cross-faded in and out over 120 ms,
//             then the board: no zoom, pull, spin, streak, wipe or ripple.
//   insert    the space shot alone (identity-free, textless or titled), for a runtime that prefers
//             a prerendered movie; its poster and a lightweight animated alternative go with it.
//
// Inputs: the occurrence (kind BLACKHOLE_SYNCED, public, actorSeatId null), its presentation start,
// the device's reduced-motion setting. Not an input: any world, branch, actor, Alien, population or
// pre-Sync state. Visual completion selects nothing and finalizes nothing: the board drawn at the end
// is the snapshot the server already published, and the film is skipped on a late load (motion bible).

import { bell, beat, clamp01, easeInCubic, easeInExpo, easeInOutCubic, easeOutBack, easeOutCubic, easeOutExpo, inBeat, lerp, noise, r2, ramp } from '../../lib/ease.mjs';

export const BLACKHOLE_VERSION = 'cinematic-blackhole-0.1.0';
export const VARIANTS = Object.freeze(['full', 'short', 'reduced']);

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
  phone: Object.freeze({
    end: 2400,
    bandIn: Object.freeze([0, 260]),
    spin: Object.freeze([0, 1750]),
    title: Object.freeze([120, 420]),
    ship: Object.freeze([700, 1350]),
    flare: Object.freeze([1350, 1600]),
    bandOut: Object.freeze([1500, 1800]),
    settle: Object.freeze([1750, 2400]),
  }),
  reduced: Object.freeze({ display: Object.freeze({ end: 1640, fade: 120, hold: 1400 }), phone: Object.freeze({ end: 1440, fade: 120, hold: 1200 }) }),
  insert: Object.freeze({ end: 3600 }),
});

/** When a surface's variant is over: the band (phones always, and the display's short variant), the full cut, the still card or the insert. */
export const filmEnd = (surface, variant) => (variant === 'reduced' ? BEATS.reduced[surface === 'phone' ? 'phone' : 'display'].end
  : surface === 'insert' ? BEATS.insert.end
    : surface === 'phone' || variant === 'short' ? BEATS.phone.end : BEATS.display.end);

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

/** The phone band's frame at t: band { open 0..1 }, hole { spin, flare }, title { opacity, scale }, ship { v }, settle. */
export function phoneFrame(t) {
  const P = BEATS.phone;
  const frame = { t, done: t >= P.end, band: { open: 0 }, hole: null, title: { opacity: 0 }, ship: null, settle: 0 };
  if (t < 0 || t >= P.end) return frame;
  const open = t < P.bandOut[0] ? easeOutCubic(beat(t, P.bandIn)) : 1 - easeInCubic(beat(t, P.bandOut));
  frame.band = { open: r2(open) };
  frame.hole = { spin: r2(t / 420), flare: inBeat(t, P.flare) ? r2(beat(t, P.flare)) : 0 };
  frame.title = { opacity: r2(Math.min(1, beat(t, P.title) * 2.5)), scale: r2(lerp(1.35, 1, easeOutBack(beat(t, P.title), 1.3))) };
  if (inBeat(t, P.ship)) frame.ship = { v: r2(easeInExpo(beat(t, P.ship)) * 0.8 + beat(t, P.ship) * 0.2) };
  frame.settle = inBeat(t, P.settle) ? r2(beat(t, P.settle)) : 0;
  return frame;
}

/** The reduced variant: the still card's opacity at t (in, hold, out), the same on both surfaces. */
export function reducedFrame(t, surface) {
  const R = BEATS.reduced[surface === 'phone' ? 'phone' : 'display'];
  if (t < 0 || t >= R.end) return { t, done: t >= R.end, card: 0 };
  return { t, done: false, card: r2(Math.min(ramp(t, 0, R.fade), 1 - ramp(t, R.fade + R.hold, R.end))) };
}

/** The public cue sheets. Sync is public, so is its sound; nothing in it varies with the selected world. */
export const AUDIO = Object.freeze({
  full: Object.freeze([{ at: 0, cue: 'void-rumble', until: 4300 }, { at: 1050, cue: 'reveal-sting' }, { at: 2300, cue: 'pass-whoosh' }, { at: 3250, cue: 'revival-thump', gain: 0.7 }, { at: 3800, cue: 'ink-cut' }]),
  short: Object.freeze([{ at: 120, cue: 'reveal-sting', gain: 0.7 }, { at: 700, cue: 'pass-whoosh', gain: 0.6 }, { at: 1500, cue: 'ink-cut', gain: 0.6 }]),
  reduced: Object.freeze([{ at: 0, cue: 'reveal-sting', gain: 0.6 }]),
});

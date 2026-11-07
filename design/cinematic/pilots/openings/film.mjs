// mothership:dev-only
//
// The two opening films' clocks (issue #188; docs/design/cinematic/openings.md): one visual identity,
// two separate deliverables.
//   brand     the app's brand intro: exactly 2,000 ms on first entry, before login and the lobby.
//             "Game N" is drawn on, "by Plan B" is stamped under it, the mark holds to be read, and
//             an ink wipe hands over to the app.
//   boarding  the match's boarding: exactly 10,000 ms after everyone is Ready and before Round 1. A
//             ship waits on a planet with its entrance open and light spilling onto the ground; the
//             crew (the match's public roster, 7, 8 or 9) walks to it and boards; the entrance
//             closes; the lights and systems inside wake; a brief Game N mark, then the game.
// Pure: t and the variant in, the frame out. Neither clock takes a role, a faction or any private
// state: the boarding's only input is the public roster (roster.mjs).

import { beat, clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../../lib/ease.mjs';

export const OPENINGS_VERSION = 'cinematic-openings-0.1.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);

// ---------- the brand intro: 2,000 ms ----------

export const BRAND_END = 2000;
/** The brand intro's beats (the brief suggests 0-0.4 s Game N, 0.4-1.6 s by Plan B and the read, 1.6-2 s the hand-over). */
export const BRAND_BEATS = Object.freeze({
  slam: Object.freeze([0, 160]),
  draw: Object.freeze([60, 420]),
  fill: Object.freeze([260, 460]),
  credit: Object.freeze([420, 700]),
  sweep: Object.freeze([880, 1380]),
  handover: Object.freeze([1600, 1960]),
});

/** The brand intro at t (clamped): every part 0..1. Reduced motion: the mark fades in, holds and fades out. */
export function brandFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No opening variant ${variant}`);
  const time = Math.max(0, Math.min(BRAND_END, t));
  const done = t >= BRAND_END;
  if (variant === 'reduced') {
    const fade = clamp01(time / 200) * (1 - clamp01((time - 1700) / 260));
    return { t: time, variant, done, slam: 1, draw: 1, fill: 1, credit: 1, sweep: 0, handover: 0, fade };
  }
  return {
    t: time, variant, done,
    slam: easeOutBack(beat(time, BRAND_BEATS.slam), 1.5),
    draw: easeInOutCubic(beat(time, BRAND_BEATS.draw)),
    fill: easeOutCubic(beat(time, BRAND_BEATS.fill)),
    credit: easeOutBack(beat(time, BRAND_BEATS.credit), 1.8),
    sweep: beat(time, BRAND_BEATS.sweep),
    handover: easeInOutCubic(beat(time, BRAND_BEATS.handover)),
    fade: 1,
  };
}

// ---------- the boarding: 10,000 ms ----------

export const BOARDING_END = 10000;
/**
 * The boarding's beats. The brief's suggested beats (0-2 s planet, ship and entrance; 2-5 s the
 * approach and boarding; 5-7 s the last aboard and the door; 7-9 s the interior waking; 9-10 s the
 * title) are kept, with the cut inside on the dark after the door closes.
 */
export const BOARDING_BEATS = Object.freeze({
  planet: Object.freeze([0, 2000]),
  approach: Object.freeze([2000, 4800]),
  door: Object.freeze([4800, 6900]),
  interior: Object.freeze([6900, 9000]),
  title: Object.freeze([9000, 10000]),
});

/** The world's ground line (world units, 1600 x 900). */
export const GROUND = 652;
/** The ship's place in the world (its 620 x 210 profile, Pilot 2's, at SHIP_AT.scale): low on short legs. */
export const SHIP_AT = Object.freeze({ x: 520, y: 311, scale: 1.7 });
/** The entrance in the hull: an 86 x 122 doorway whose sill is the ramp's top. */
export const HATCH = Object.freeze({ x: 970, y: 458, w: 86, h: 122 });
/**
 * The ramp along the hull, seen from the side: its far edge from the foot on the ground up to the
 * doorway's sill; its walking surface shows `depth` units below that edge, toward us.
 */
export const RAMP = Object.freeze({ foot: Object.freeze([845, GROUND]), sill: Object.freeze([970, 580]), depth: 14 });
/** The crew's pace on the ground and on the ramp (world units a millisecond), the walk's stride and cycle. */
export const PACE = 0.09;
export const STRIDE = 26;
export const WALK_CYCLE_MS = 640;
/** The climb from the ramp's foot to the sill (ms), and the step from the sill into the doorway. */
export const CLIMB_MS = Math.round(Math.hypot(RAMP.sill[0] - RAMP.foot[0], RAMP.sill[1] - RAMP.foot[1]) / PACE);
export const STEP_IN_MS = 300;
/**
 * The crew walks in pairs, in seat order (seats 1 and 2 first): the first pair reaches the ramp's
 * foot at PAIRS_AT[0], the last at PAIRS_AT[1], whatever the match's size; an odd last member
 * walks alone. The last steps aboard at PAIRS_AT[1] + CLIMB_MS + STEP_IN_MS.
 */
export const PAIRS_AT = Object.freeze([2000, 4500]);
export const pairAt = (p, pairs) => (pairs <= 1 ? PAIRS_AT[0] : lerp(PAIRS_AT[0], PAIRS_AT[1], p / (pairs - 1)));

/** The entrance after the last aboard: the ramp slides up into the hull, the door comes down, the light goes out. */
export const ENTRANCE = Object.freeze({ ramp: Object.freeze([6150, 6550]), door: Object.freeze([6380, 6720]), lightOut: Object.freeze([6450, 6720]) });
/** The hull wakes once the door is shut: its portholes light along it and the engines glow. */
export const HULL_WAKE = Object.freeze({ portholes: Object.freeze([6500, 6900]), engines: Object.freeze([6550, 6900]) });
/** Inside: the door's seal fades, the ceiling lights wake far to near, then the systems. */
export const INSIDE = Object.freeze({ seal: Object.freeze([6900, 7400]), lights: Object.freeze([7050, 8150]), systems: Object.freeze([7600, 8700]) });
/** The brief Game N mark (stamped, then written in) and the hand-over to the game's first view. */
export const TITLE = Object.freeze({ stamp: Object.freeze([9000, 9280]), draw: Object.freeze([9060, 9360]), fill: Object.freeze([9220, 9420]), handover: Object.freeze([9600, 9960]) });

/**
 * The camera, in world units: the view's centre (cx, cy) and its height (vh); its width follows the
 * surface's aspect. Two tracks: a narrow one for phones (portrait), a wide one for the shared
 * display. The narrow track cuts from the ship to the crew at 2,000 ms; the wide one is one move.
 * The interior has its own world, entered on a cut in the dark at 6,900 ms.
 */
export const CAMERA = Object.freeze({
  wide: Object.freeze([
    Object.freeze({ t: 0, cx: 800, cy: 452, vh: 900 }),
    Object.freeze({ t: 2000, cx: 820, cy: 480, vh: 820 }),
    Object.freeze({ t: 4500, cx: 900, cy: 530, vh: 620 }),
    Object.freeze({ t: 6900, cx: 1000, cy: 515, vh: 440 }),
  ]),
  narrow: Object.freeze([
    Object.freeze({ t: 0, cx: 1013, cy: 330, vh: 900 }),
    Object.freeze({ t: 1999, cx: 1013, cy: 430, vh: 900 }),
    Object.freeze({ t: 2000, cx: 700, cy: 570, vh: 640, cut: true }),
    Object.freeze({ t: 4500, cx: 900, cy: 560, vh: 620 }),
    Object.freeze({ t: 6900, cx: 1013, cy: 515, vh: 430 }),
  ]),
  inside: Object.freeze({
    wide: Object.freeze([Object.freeze({ t: 6900, cx: 800, cy: 466, vh: 790 }), Object.freeze({ t: 10000, cx: 800, cy: 478, vh: 700 })]),
    narrow: Object.freeze([Object.freeze({ t: 6900, cx: 800, cy: 470, vh: 1000 }), Object.freeze({ t: 10000, cx: 800, cy: 480, vh: 960 })]),
  }),
});

/** The camera at t on a track: eased between keyframes, held before the first and after the last; a cut is not eased into. */
export function cameraAt(track, t) {
  if (t <= track[0].t) return { cx: track[0].cx, cy: track[0].cy, vh: track[0].vh };
  for (let i = 1; i < track.length; i += 1) {
    const a = track[i - 1], b = track[i];
    if (t < b.t) {
      if (b.cut) return { cx: a.cx, cy: a.cy, vh: a.vh };
      const v = easeInOutCubic(clamp01((t - a.t) / (b.t - a.t)));
      return { cx: lerp(a.cx, b.cx, v), cy: lerp(a.cy, b.cy, v), vh: lerp(a.vh, b.vh, v) };
    }
  }
  const last = track[track.length - 1];
  return { cx: last.cx, cy: last.cy, vh: last.vh };
}

/**
 * Reduced motion's stills: the story told in five held pictures, each fading in from the night over
 * 160 ms (no flash, no camera move, nothing animated): the ship waiting with the crew walking to it,
 * the crew boarding, the entrance closed, the interior awake, the Game N mark.
 */
export const BOARDING_STILLS = Object.freeze([
  Object.freeze({ at: 0, moment: 1400 }),
  Object.freeze({ at: 2400, moment: 4300 }),
  Object.freeze({ at: 5200, moment: 6860 }),
  Object.freeze({ at: 6900, moment: 8800 }),
  Object.freeze({ at: 8900, moment: 9500 }),
]);
export const STILL_FADE_MS = 160;
/** Reduced motion's last fade, to the night the game's first view opens on. */
export const STILL_OUT = Object.freeze([9700, 9960]);

/**
 * The boarding at t (clamped): which world (outside or inside), the moment its pictures are drawn at
 * (reduced motion holds a still's moment), and the entrance, interior and title parts 0..1.
 */
export function boardingFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No opening variant ${variant}`);
  const time = Math.max(0, Math.min(BOARDING_END, t));
  const done = t >= BOARDING_END;
  const reduced = variant === 'reduced';
  const still = reduced ? BOARDING_STILLS.filter(s => time >= s.at).at(-1) : null;
  const at = reduced ? still.moment : time;
  const on = (beatOf, ease = v => v) => (reduced ? (at >= beatOf[1] ? 1 : at <= beatOf[0] ? 0 : ease(beat(at, beatOf))) : ease(beat(at, beatOf)));
  return {
    t: time, variant, done, at,
    world: at < BOARDING_BEATS.interior[0] ? 'outside' : 'inside',
    ramp: beat(at, ENTRANCE.ramp),
    door: easeInOutCubic(beat(at, ENTRANCE.door)),
    light: 1 - beat(at, ENTRANCE.lightOut),
    portholes: beat(at, HULL_WAKE.portholes),
    engines: beat(at, HULL_WAKE.engines),
    seal: 1 - beat(at, INSIDE.seal),
    lights: beat(at, INSIDE.lights),
    systems: beat(at, INSIDE.systems),
    stamp: reduced ? (at >= TITLE.stamp[0] ? 1 : 0) : easeOutBack(beat(at, TITLE.stamp), 1.6),
    draw: on(TITLE.draw, easeInOutCubic),
    fill: on(TITLE.fill, easeOutCubic),
    handover: reduced ? 0 : easeInOutCubic(beat(at, TITLE.handover)),
    ...(reduced ? { still: BOARDING_STILLS.indexOf(still), fade: clamp01((time - still.at) / STILL_FADE_MS) * (1 - beat(time, STILL_OUT)) } : {}),
  };
}

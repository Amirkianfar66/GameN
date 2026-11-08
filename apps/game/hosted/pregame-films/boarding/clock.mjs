//
// The boarding's clock: exactly 10,000 ms after everyone is Ready and before Round 1 (issue #188).
// The beats the owner has seen are kept (`claude/designer-openings` 27083865
// `design/cinematic/pilots/openings/film.mjs`): 0-2 s the planet, the ship and its open entrance;
// 2-6.1 s the crew walks to it in pairs and climbs into the light; 6.1-6.9 s the ramp comes up, the
// door seals and the hull wakes; 6.9-8.7 s inside, the lights wake far to near over the crew; then a
// brief Game N mark and the ink to the night by 9,960 ms. Redrawn for the owner's "AAA" review as
// four shots joined by cuts, the crew in the approved crew drawing. The only input is the public
// roster (./roster.mjs).

import { clamp01, ease, lerp, progress } from '../kit/math.mjs';

export const BOARDING_VERSION = 'pregame-boarding-1.0.0';
export const BOARDING_MS = 10000;
export const VARIANTS = Object.freeze(['full', 'reduced']);

export const SHOTS = Object.freeze({
  dusk: Object.freeze([0, 2000]),
  ramp: Object.freeze([2000, 6900]),
  inside: Object.freeze([6900, 10000]),
});
/** Pairs reach the ramp's foot from PAIRS_AT[0] to PAIRS_AT[1], whatever the crew's size. */
export const PAIRS_AT = Object.freeze([2050, 3820]);
export const CLIMB_MS = 1800;
export const STEP_IN_MS = 320;
export const ENTRANCE = Object.freeze({ ramp: Object.freeze([6150, 6550]), door: Object.freeze([6380, 6720]), lightOut: Object.freeze([6450, 6720]) });
export const HULL_WAKE = Object.freeze({ ports: Object.freeze([6500, 6900]), engines: Object.freeze([6550, 6900]) });
export const INSIDE = Object.freeze({ seal: Object.freeze([6900, 7400]), lights: Object.freeze([7050, 8150]), systems: Object.freeze([7600, 8700]) });
export const TITLE = Object.freeze({ stamp: Object.freeze([9000, 9280]), hit: 9280, sheen: Object.freeze([9320, 9620]), tide: Object.freeze([9600, 9950]), night: 9960 });

/** Reduced motion: five held pictures, each fading in from the night over 160 ms, then a fade to the night. */
export const STILLS = Object.freeze([
  Object.freeze({ at: 0, moment: 1400 }),
  Object.freeze({ at: 2400, moment: 4300 }),
  Object.freeze({ at: 5200, moment: 6860 }),
  Object.freeze({ at: 6900, moment: 8800 }),
  Object.freeze({ at: 8900, moment: 9500 }),
]);
export const STILL_FADE_MS = 160;
export const STILL_OUT = Object.freeze([9700, 9960]);

export const pairAt = (p, pairs) => (pairs <= 1 ? PAIRS_AT[0] : lerp(PAIRS_AT[0], PAIRS_AT[1], p / (pairs - 1)));

/** The frame at t: which shot, the moment drawn, and (reduced) the still's fade. */
export function boardingFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No boarding variant ${variant}`);
  const time = Math.max(0, Math.min(BOARDING_MS, t));
  const reduced = variant === 'reduced';
  if (reduced) {
    const still = STILLS.filter(s => time >= s.at).at(-1);
    const fade = clamp01((time - still.at) / STILL_FADE_MS) * (1 - clamp01((time - STILL_OUT[0]) / (STILL_OUT[1] - STILL_OUT[0])));
    return { t: time, at: still.moment, reduced, fade, shot: shotOf(still.moment) };
  }
  return { t: time, at: time, reduced, fade: 1, shot: shotOf(time) };
}
export const shotOf = t => (t < SHOTS.dusk[1] ? 'dusk' : t < SHOTS.inside[0] ? 'ramp' : 'inside');

export { ease, progress };

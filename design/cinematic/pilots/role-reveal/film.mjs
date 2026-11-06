// mothership:dev-only
//
// The role reveal films: one seven-second film per role, on the player's own phone, after their role
// card is revealed and inside the role-reading stage (the owner, 6 November 2026; storyboards in
// docs/design/cinematic/role-reveal.md). This module is the films' shared clock. Every role keeps the
// same length and the same beats, full and reduced, so a neighbour who sees a phone change, or times
// it, learns nothing. Pure: t in, a frame out. A role's own pictures are drawn by its module from the
// panel's local time (./doctor.mjs).
//
//   opener   0-1500     starlight through a viewport's slats; a hand rises into the light holding the
//                       role's device (the role card's own)
//   panels   1500-5500  a comic tier of three panels slams in at 1500, 2800 and 4100: what the role
//                       does, in the ship's own rooms
//   title    5500-6600  the page darkens around a paper plate; the role's name stamps on it
//   hold     6600-7000  everything settles; the page then gives way to the role card
//
// Reduced motion: three stills (the opener, the full page, the title), each cross-faded in over 80 ms
// at the same moments (0, 1500, 5500), within the same 7000 ms. No travel, zoom, sparks or particles.
// The films are silent and never vibrate.

import { beat, clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';

export const ROLE_REVEAL_VERSION = 'cinematic-role-reveal-0.1.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);

/** Every film's length, ms: the same for every role and both variants. */
export const REVEAL_END = 7000;

/** The beats, ms, the same for every role and both variants. */
export const BEATS = Object.freeze({
  opener: Object.freeze([0, 1500]),
  panel1: Object.freeze([1500, 2800]),
  panel2: Object.freeze([2800, 4100]),
  panel3: Object.freeze([4100, 5500]),
  title: Object.freeze([5500, 6600]),
  hold: Object.freeze([6600, REVEAL_END]),
});

/** The moments the picture changes beat: what a neighbour could time. The same for every role. */
export const CHANGES = Object.freeze([1500, 2800, 4100, 5500, 6600]);

/** When each of the three panels slams in. */
export const PANEL_STARTS = Object.freeze([BEATS.panel1[0], BEATS.panel2[0], BEATS.panel3[0]]);

/** A panel's slam-in, ms. */
export const SLAM_MS = 260;

/** Reduced motion's cross-fade, ms (the motion direction's "at most the existing 80 ms fade"). */
export const FADE_MS = 80;

/** Reduced motion: three stills, each cross-faded in at its moment. */
export const STILLS = Object.freeze([
  Object.freeze({ at: 0, still: 'opener' }),
  Object.freeze({ at: BEATS.panel1[0], still: 'page' }),
  Object.freeze({ at: BEATS.title[0], still: 'title' }),
]);

/** The two caption lines (page text): the role's purpose during the panels, how it plays under the title. */
export const CAPTION_TIMES = Object.freeze({ purpose: Object.freeze([1700, 5500]), play: Object.freeze([5900, REVEAL_END]) });

const fadeIn = (t, [from, to], ms = 200) => (t < from || t >= to ? 0 : clamp01((t - from) / ms));

/** The opener's light, hand and rim (0..1 each), at rest when `still` is true. */
function opener(t, still) {
  if (still) return { slats: 1, hand: 1, rim: 1 };
  return {
    slats: easeInOutCubic(beat(t, [80, 1100])),
    hand: easeOutCubic(beat(t, [320, 1250])),
    rim: easeOutCubic(beat(t, [850, 1400])),
  };
}

/** One panel: visible from its start; enter 0..1 (a slam with a small overshoot); local ms since its start. */
function panel(t, start, still) {
  if (t < start) return { visible: false, enter: 0, local: 0 };
  if (still) return { visible: true, enter: 1, local: PANEL_LOCAL_REST };
  const v = clamp01((t - start) / SLAM_MS);
  return { visible: true, enter: v >= 1 ? 1 : easeOutBack(v, 1.4), slam: v, local: t - start };
}

/** The local time at which a panel's pictures rest: what reduced motion's page still shows. */
export const PANEL_LOCAL_REST = 1300;

/**
 * The frame at t (clamped to the film), for every role:
 *   opener   { slats, hand, rim } 0..1; the opener stays as the page's background under the panels
 *   panels   three { visible, enter, slam, local }
 *   dim      0..1, the page darkening around the title
 *   title    { visible, stamp 0..1 (the slam), settle 0..1 }
 *   captions { purpose, play } 0..1 (opacity of each page-text line)
 *   still    reduced motion only: 'opener' | 'page' | 'title', and fade 0..1 (the cross-fade in)
 */
export function revealFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No role reveal variant ${variant}`);
  const time = Math.max(0, Math.min(REVEAL_END, t));
  const done = t >= REVEAL_END;
  const reduced = variant === 'reduced';
  const still = reduced ? STILLS.filter(s => time >= s.at).at(-1) : null;
  // In reduced motion the clock only says which still shows; every moving part is at rest, and the
  // page still holds all three panels.
  const at = reduced ? still.at : time;
  const rest = reduced;
  const titleOn = at >= BEATS.title[0];
  const pageOn = reduced && still.still !== 'opener';
  const frame = {
    t: time, variant, done,
    opener: opener(at, rest),
    panels: PANEL_STARTS.map(start => (reduced ? (pageOn ? { visible: true, enter: 1, slam: 1, local: PANEL_LOCAL_REST } : { visible: false, enter: 0, local: 0 }) : panel(time, start, false))),
    dim: reduced ? (titleOn ? 1 : 0) : easeOutCubic(beat(time, [BEATS.title[0], BEATS.title[0] + 380])),
    title: {
      visible: titleOn,
      stamp: !titleOn ? 0 : rest ? 1 : easeOutBack(beat(time, [BEATS.title[0] + 120, BEATS.title[0] + 420]), 1.6),
      settle: !titleOn ? 0 : rest ? 1 : easeOutCubic(beat(time, [BEATS.title[0] + 420, BEATS.title[1]])),
    },
    captions: {
      purpose: reduced ? (time >= BEATS.panel1[0] && time < BEATS.title[0] ? 1 : 0) : fadeIn(time, CAPTION_TIMES.purpose),
      play: reduced ? (time >= BEATS.title[0] ? 1 : 0) : fadeIn(time, CAPTION_TIMES.play),
    },
  };
  if (reduced) Object.assign(frame, { still: still.still, fade: clamp01((time - still.at) / FADE_MS) });
  return frame;
}

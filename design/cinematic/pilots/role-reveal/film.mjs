// mothership:dev-only
//
// The role reveal films: one nine-second film per role, on the player's own phone, after their role
// card is revealed and inside the role-reading stage (the owner, 6 November 2026; storyboards in
// docs/design/cinematic/role-reveal.md). This module is the films' shared clock. Every role keeps the
// same length and the same beats, full and reduced, so a neighbour who sees a phone change, or times
// it, learns nothing. Pure: t in, a frame out. A role's own pictures are drawn by its module from the
// panel's local time (./doctor.mjs).
//
//   opener   0-3000     the briefing room at the dock, before boarding (./briefing.mjs): the player's
//                       own character takes the role's gadget from the desk where the role card lies
//                       and raises it into the light (the owner's feedback on the pilot)
//   panels   3000-7000  a comic tier of three panels slams in at 3000, 4300 and 5600: what the role
//                       does, in the ship's own rooms
//   title    7000-8400  the page darkens around a paper plate; the role's name stamps on it
//   hold     8400-9000  everything settles; the page then gives way to the role card
//
// Reduced motion: three stills (the gadget raised, the full page, the title), each cross-faded in over
// 80 ms at the same moments (0, 3000, 7000), within the same 9000 ms. No travel, zoom, sparks or
// particles. The films are silent and never vibrate.

import { beat, bell, clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';

export const ROLE_REVEAL_VERSION = 'cinematic-role-reveal-0.3.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);

/** Every film's length, ms: the same for every role and both variants. */
export const REVEAL_END = 9000;

/** The beats, ms, the same for every role and both variants. */
export const BEATS = Object.freeze({
  opener: Object.freeze([0, 3000]),
  panel1: Object.freeze([3000, 4300]),
  panel2: Object.freeze([4300, 5600]),
  panel3: Object.freeze([5600, 7000]),
  title: Object.freeze([7000, 8400]),
  hold: Object.freeze([8400, REVEAL_END]),
});

/** The moments the picture changes beat: what a neighbour could time. The same for every role. */
export const CHANGES = Object.freeze([3000, 4300, 5600, 7000, 8400]);

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
export const CAPTION_TIMES = Object.freeze({ purpose: Object.freeze([3200, BEATS.title[0]]), play: Object.freeze([7400, REVEAL_END]) });

const fadeIn = (t, [from, to], ms = 200) => (t < from || t >= to ? 0 : clamp01((t - from) / ms));

/**
 * The opener (./briefing.mjs): fade, slats and lamp (the room's light coming up), reach (the hand to
 * the desk), grip (the gadget taken), raise (into the light), glint (it catches the light), push (a
 * slow camera push), each 0..1. At rest (reduced motion's still) the gadget is raised, without a glint.
 */
function opener(t, still) {
  if (still) return { fade: 1, slats: 1, lamp: 1, reach: 1, grip: true, raise: 1, glint: 0, push: 0 };
  return {
    fade: easeOutCubic(beat(t, [0, 450])),
    slats: easeInOutCubic(beat(t, [100, 1200])),
    lamp: easeOutCubic(beat(t, [200, 700])),
    reach: easeInOutCubic(beat(t, [500, 1250])),
    grip: t >= 1300,
    raise: easeInOutCubic(beat(t, [1400, 2250])),
    glint: bell(beat(t, [2050, 2650])),
    push: easeInOutCubic(beat(t, [0, BEATS.opener[1]])),
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
 *   opener   { fade, slats, lamp, reach, grip, raise, glint, push }; it stays, dimmed, under the panels
 *   panels   three { visible, enter, slam, local }
 *   dim      0..1, the page darkening around the title
 *   title    { visible, stamp 0..1 (the slam), settle 0..1, sweep 0..1 (the sheen, full only) }
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
      // A sheen crosses the plate once it has landed (full motion only).
      sweep: !titleOn || rest ? 0 : beat(time, [BEATS.title[0] + 520, BEATS.title[0] + 1120]),
    },
    captions: {
      purpose: reduced ? (time >= BEATS.panel1[0] && time < BEATS.title[0] ? 1 : 0) : fadeIn(time, CAPTION_TIMES.purpose),
      play: reduced ? (time >= BEATS.title[0] ? 1 : 0) : fadeIn(time, CAPTION_TIMES.play),
    },
  };
  if (reduced) Object.assign(frame, { still: still.still, fade: clamp01((time - still.at) / FADE_MS) });
  return frame;
}

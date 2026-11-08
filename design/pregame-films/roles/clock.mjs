// mothership:dev-only
//
// The role films' shared clock: one ten-second film per role, on the player's own phone, after their
// role card is revealed and inside the role-reading stage (the owner, 6 November 2026). The beats are
// the approved pilot's, kept exactly (ported from `claude/designer-role-films` bbc7bf24
// `design/cinematic/pilots/role-reveal/film.mjs`): every role keeps the same length and the same
// beats, full and reduced, so a neighbour who sees a phone change, or times it, learns nothing.
// The owner, 8 November 2026, asked for these films again "like AAA animation, improve the quality":
// what changes is how each beat is drawn and lit, never when it happens.
//
//   opener   0-3000     the briefing room at the dock, before boarding: the player's own character
//                       takes the role's gadget from the desk where their role card stands and raises
//                       it into the light
//   panels   3000-7800  a comic tier of three panels slams in at 3000, 4500 and 6000: two of memory
//                       (sepia, a few words each), then one aboard (pictures only)
//   title    7800-9300  the page darkens around a paper plate; the role's name stamps on it
//   hold     9300-10000 everything settles; the page then gives way to the role card
//
// Reduced motion: three stills (the gadget raised, the full page, the title), each cross-faded in over
// 80 ms at 0, 3000 and 7800 ms, within the same 10,000 ms. Silent, never vibrating.

import { clamp01, ease, progress } from '../kit/math.mjs';

export const ROLE_FILM_VERSION = 'pregame-role-films-1.0.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);
export const ROLE_MS = 10000;

export const BEATS = Object.freeze({
  opener: Object.freeze([0, 3000]),
  panel1: Object.freeze([3000, 4500]),
  panel2: Object.freeze([4500, 6000]),
  panel3: Object.freeze([6000, 7800]),
  title: Object.freeze([7800, 9300]),
  hold: Object.freeze([9300, ROLE_MS]),
});
/** The moments the picture changes beat: what a neighbour could time. The same for every role. */
export const CHANGES = Object.freeze([3000, 4500, 6000, 7800, 9300]);
export const PANEL_STARTS = Object.freeze([BEATS.panel1[0], BEATS.panel2[0], BEATS.panel3[0]]);
export const PANEL_TONES = Object.freeze(['past', 'past', 'present']);
export const SLAM_MS = 260;
export const FADE_MS = 80;
export const STILLS = Object.freeze([
  Object.freeze({ at: 0, still: 'opener' }),
  Object.freeze({ at: BEATS.panel1[0], still: 'page' }),
  Object.freeze({ at: BEATS.title[0], still: 'title' }),
]);
export const NARRATED = Object.freeze([0, 1]);
export const CAPTION_TIMES = Object.freeze([
  Object.freeze([PANEL_STARTS[0] + 250, PANEL_STARTS[2] + 100]),
  Object.freeze([PANEL_STARTS[1] + 250, BEATS.title[0]]),
]);
export const CAPTION_FADE = Object.freeze({ in: 200, out: 200 });
export const PANEL_LOCAL_REST = 1300;
export const CAMERA = Object.freeze({ zoom: 1.08, move: 450, pullBack: Object.freeze([7300, 7800]) });
export const FLASH = Object.freeze([2650, 2950, 3300]);

const bell = v => Math.sin(Math.PI * clamp01(v));
const caption = (t, [from, to]) => (t < from || t >= to ? 0
  : Math.min(clamp01((t - from) / CAPTION_FADE.in), to < BEATS.title[0] ? clamp01((to - t) / CAPTION_FADE.out) : 1));

/**
 * The opener's moves, each 0..1. New in this cut: the character's weight shifts before the reach
 * (`anticipate`), the hand settles on the gadget (`settle`) and the head turns to it and back up.
 */
function opener(t, still) {
  if (still) return { fade: 1, slats: 1, lamp: 1, anticipate: 0, reach: 1, grip: true, settle: 1, raise: 1, look: 1, glint: 0, push: 0, t: 2400 };
  return {
    fade: ease.outCubic(progress(t, 0, 450)),
    slats: ease.inOutCubic(progress(t, 100, 1200)),
    lamp: ease.outCubic(progress(t, 200, 700)),
    anticipate: bell(progress(t, 320, 640)),
    reach: ease.inOutCubic(progress(t, 500, 1250)),
    grip: t >= 1300,
    settle: ease.outBack(progress(t, 1250, 1420), 2.2),
    raise: ease.inOutCubic(progress(t, 1400, 2250)),
    look: ease.inOutSine(progress(t, 1650, 2150)),
    glint: bell(progress(t, 2050, 2650)),
    push: ease.inOutCubic(progress(t, 0, BEATS.opener[1])),
    t,
  };
}

function panel(t, start) {
  if (t < start) return { visible: false, enter: 0, slam: 0, local: 0 };
  const v = clamp01((t - start) / SLAM_MS);
  return { visible: true, enter: v >= 1 ? 1 : ease.outBack(v, 1.4), slam: v, local: t - start };
}

function camera(t) {
  const steps = [...PANEL_STARTS.map((start, i) => [start, i - 1, i]), [CAMERA.pullBack[0], PANEL_STARTS.length - 1, -1]];
  const step = steps.filter(([start]) => t >= start).at(-1);
  if (!step) return { from: -1, to: -1, v: 1 };
  const [start, from, to] = step;
  const span = to === -1 ? CAMERA.pullBack[1] - CAMERA.pullBack[0] : CAMERA.move;
  return { from, to, v: ease.inOutCubic(progress(t, start, start + span)) };
}

/** The frame at t for every role (see the module comment); `still` and `fade` in reduced motion. */
export function roleFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No role film variant ${variant}`);
  const time = Math.max(0, Math.min(ROLE_MS, t));
  const reduced = variant === 'reduced';
  const still = reduced ? STILLS.filter(s => time >= s.at).at(-1) : null;
  const at = reduced ? still.at : time;
  const titleOn = at >= BEATS.title[0];
  const pageOn = reduced && still.still !== 'opener';
  const frame = {
    t: time, variant, reduced,
    opener: opener(at, reduced),
    panels: PANEL_STARTS.map(start => (reduced
      ? (pageOn ? { visible: true, enter: 1, slam: 1, local: PANEL_LOCAL_REST } : { visible: false, enter: 0, slam: 0, local: 0 })
      : panel(time, start))),
    dim: reduced ? (titleOn ? 1 : 0) : ease.outCubic(progress(time, BEATS.title[0], BEATS.title[0] + 380)),
    flash: reduced ? 0 : (time < FLASH[1] ? ease.inOutCubic(progress(time, FLASH[0], FLASH[1])) : 1 - ease.outCubic(progress(time, FLASH[1], FLASH[2]))),
    camera: reduced ? { from: -1, to: -1, v: 1 } : camera(time),
    focus: PANEL_STARTS.map((start, i) => {
      if (reduced) return 1;
      const next = PANEL_STARTS[i + 1];
      const back = next === undefined ? 0 : ease.outCubic(progress(time, next, next + 400));
      const lift = ease.inOutCubic(progress(time, ...CAMERA.pullBack));
      return 1 - 0.38 * back * (1 - lift);
    }),
    title: {
      visible: titleOn,
      stamp: !titleOn ? 0 : reduced ? 1 : ease.outBack(progress(time, BEATS.title[0] + 120, BEATS.title[0] + 420), 1.6),
      hit: BEATS.title[0] + 420,
      settle: !titleOn ? 0 : reduced ? 1 : ease.outCubic(progress(time, BEATS.title[0] + 420, BEATS.title[1])),
      sweep: !titleOn || reduced ? 0 : progress(time, BEATS.title[0] + 520, BEATS.title[0] + 1120),
    },
    captions: CAPTION_TIMES.map(times => (reduced ? (pageOn && !titleOn ? 1 : 0) : caption(time, times))),
    drops: CAPTION_TIMES.map(([from]) => (reduced ? 1 : clamp01((time - from) / CAPTION_FADE.in))),
  };
  if (reduced) Object.assign(frame, { still: still.still, fade: clamp01((time - still.at) / FADE_MS) });
  return frame;
}

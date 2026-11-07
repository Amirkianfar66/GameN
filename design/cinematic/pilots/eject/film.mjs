// mothership:dev-only
//
// The Captain's EJECT as a cinematic cut on the shared display, over the approved S7 film
// (design/board-v2/films/captain.mjs: EJECT_FILM, ejectFrame(), ejectPerson(), pullToHatch(),
// unchanged; docs/design/captain-films.md). The phones keep S7 on the board. This module adds only
// the cut's own beats: which set each moment is seen on, the camera's path through it, the
// letterbox, and the moment the client's words may appear. Every picture inside a shot is S7's art
// at S7's beat.
//
//   console   0-1500     a close-up on the Captain's console: the cover lifts, the glove presses
//                        EJECT, the hard click; the emergency light comes on at 900
//   lockdown  1500-2700  the Jail's wall: the door locks (its wheel turns back, the keypad stripes),
//                        the hatch is revealed in the wall, the prisoners start and brace, the clamps
//                        release
//   airlock   2700-4400  closer on the hatch: the iris opens onto space, the air rushes out, the
//                        living are taken one after another as tumbling silhouettes, bodies leave as
//                        grey cut-outs; the client's words may appear from 3300 (S7's announce)
//   exterior  4400-5800  the hull from outside, the hatch open, the silhouettes drifting away
//   closure   5800-7200  the wall again: the iris shuts, the clamps engage, the hatch is gone, the
//                        light returns to normal, the memorial plaque; the console's EJECT used
//
// A review study, never mounted in the game: no covering EJECT stage is approved (the owner,
// 6 November 2026: "Do not add an unapproved covering EJECT stage"), so S7 on the board is the only
// runtime EJECT, on every surface, and design/cinematic/lib/visibility.mjs presentationIn() answers
// 'board' for it in every phase. The insert (exports/eject/review/) is the exterior alone with nothing
// of a person in it: the hatch's light and the loose things the air takes; a study for the same cut.
//
// Inputs are S7's: the time since the outcome's presentation start, the outcome's subjects in slot
// order (each { body }), and the device's reduced-motion setting. Nothing here reads a role, a side
// or a cause, and nothing names the actor.

import { EJECT_FILM, ejectEnd, ejectFrame } from '../../../board-v2/films/captain.mjs';
import { easeInOutCubic, easeOutCubic, lerp, lerp2, r2, ramp } from '../../lib/ease.mjs';

export const EJECT_CUT_VERSION = 'cinematic-eject-0.1.0';
export const VARIANTS = Object.freeze(['full', 'reduced']);

/** The sets a shot is seen on, each in its own units: the console close-up, the Jail's scene, the exterior picture. */
export const SETS = Object.freeze({
  console: Object.freeze({ width: 1920, height: 1080 }),
  wall: Object.freeze({ width: 1024, height: 768 }),
  exterior: Object.freeze({ width: 400, height: 400 }),
});

const cam = (center, k) => Object.freeze({ center: Object.freeze(center), k });
/**
 * The cut's shots over S7's beats: each a set and the camera's eased path through it (its centre in
 * the set's units, k display pixels per unit). A cut between shots is hard: no flash, no shake.
 */
export const SHOTS = Object.freeze([
  Object.freeze({ id: 'console', set: 'console', from: 0, to: 1500, camera: Object.freeze({ from: cam([960, 540], 1.01), to: cam([930, 520], 1.08) }) }),
  Object.freeze({ id: 'lockdown', set: 'wall', from: 1500, to: 2700, camera: Object.freeze({ from: cam([470, 300], 2.5), to: cam([420, 290], 2.7) }) }),
  Object.freeze({ id: 'airlock', set: 'wall', from: 2700, to: 4400, camera: Object.freeze({ from: cam([330, 280], 3), to: cam([300, 262], 3.5) }) }),
  Object.freeze({ id: 'exterior', set: 'exterior', from: 4400, to: 5800, camera: Object.freeze({ from: cam([200, 228], 4.85), to: cam([208, 214], 5.1) }) }),
  Object.freeze({ id: 'closure', set: 'wall', from: 5800, to: EJECT_FILM.end, camera: Object.freeze({ from: cam([360, 290], 3), to: cam([420, 300], 2.6) }) }),
]);

/** The reduced variant: S7's four stills, each on its set with a fixed camera. */
// The three wall stills share one camera, so a cross-fade between them is a dissolve in place.
export const STILLS = Object.freeze({
  console: Object.freeze({ set: 'console', camera: cam([960, 540], 1) }),
  open: Object.freeze({ set: 'wall', camera: cam([400, 290], 2.7) }),
  empty: Object.freeze({ set: 'wall', camera: cam([400, 290], 2.7) }),
  memorial: Object.freeze({ set: 'wall', camera: cam([400, 290], 2.7) }),
});

/** The letterbox's share of the display's height, in and out (ms), and the insert's beats. */
export const LETTERBOX = Object.freeze({ share: 0.1, in: Object.freeze([0, 300]), out: 300 });
export const INSERT = Object.freeze({
  end: 2400,
  fade: Object.freeze([Object.freeze([0, 200]), Object.freeze([2200, 2400])]),
  glow: Object.freeze([200, 700]),
  debris: Object.freeze([500, 1900]),
  camera: Object.freeze({ from: cam([200, 228], 4.85), to: cam([208, 216], 5.05) }),
});

export const cutEnd = variant => (variant === 'reduced' ? ejectEnd(true) : ejectEnd(false));
export const insertEnd = () => INSERT.end;

const along = (path, v) => ({ center: lerp2(path.from.center, path.to.center, v).map(r2), k: r2(lerp(path.from.k, path.to.k, v)) });

/**
 * The cut at t: the shot, its set and camera, S7's frame (everything a shot draws), the letterbox's
 * share and whether the client's words may show (S7's announce). Pure: the same frame every time.
 */
export function cutFrame(t, { reduced = false, subjects = [] } = {}) {
  const variant = reduced ? 'reduced' : 'full';
  const end = cutEnd(variant);
  const s7 = ejectFrame(t, { reduced, subjects });
  if (t < 0 || t >= end) return { t, variant, shot: null, set: null, camera: null, s7, letterbox: 0, words: false, opacity: 0, done: t >= end };
  if (reduced) {
    const still = STILLS[s7.stage];
    // A still's fade is S7's (80 ms); the letterbox stands for the whole variant, no slide.
    return { t, variant, shot: s7.stage, set: still.set, camera: { center: [...still.camera.center], k: still.camera.k }, s7, letterbox: LETTERBOX.share, words: s7.announce, opacity: s7.opacity ?? 1, done: false };
  }
  const shot = SHOTS.find(s => t >= s.from && t < s.to);
  const v = easeInOutCubic(ramp(t, shot.from, shot.to));
  const letterbox = r2(LETTERBOX.share * Math.min(easeOutCubic(ramp(t, ...LETTERBOX.in)), 1 - easeInOutCubic(ramp(t, end - LETTERBOX.out, end))));
  return { t, variant, shot: shot.id, set: shot.set, camera: along(shot.camera, v), s7, letterbox, words: s7.announce, opacity: 1, done: false };
}

/** The insert at t: its opacity, the hatch's light, the loose things' share of their way, the camera. */
export function insertFrame(t) {
  const I = INSERT;
  if (t < 0 || t >= I.end) return { t, opacity: 0, glow: 0, debris: 0, camera: along(I.camera, t < 0 ? 0 : 1), done: t >= I.end };
  const opacity = r2(Math.min(easeOutCubic(ramp(t, ...I.fade[0])), 1 - ramp(t, ...I.fade[1])));
  return { t, opacity, glow: r2(easeOutCubic(ramp(t, ...I.glow))), debris: r2(ramp(t, ...I.debris)), camera: along(I.camera, easeInOutCubic(ramp(t, 0, I.end))), done: false };
}

/** Where a set's camera shows, in the set's units, for a display of width x height. */
export function cameraView(camera, { width = 1920, height = 1080 } = {}) {
  const w = width / camera.k, h = height / camera.k;
  return { x: r2(camera.center[0] - w / 2), y: r2(camera.center[1] - h / 2), w: r2(w), h: r2(h) };
}

/**
 * The public cue sheets. The alarm's blip under 2 Hz (S7's emergency period, 625 ms) while the Jail
 * is locked down, silence outside the hull, nothing at the memorial. The insert has no sound of its
 * own: a client plays the sheet.
 */
const blips = Array.from({ length: 6 }, (_, i) => ({ at: EJECT_FILM.emergency.from + i * EJECT_FILM.emergency.periodMs, cue: 'alert-blip', gain: 0.35 }));
export const AUDIO = Object.freeze({
  full: Object.freeze([
    { at: 0, cue: 'ink-cut', gain: 0.4 },
    { at: EJECT_FILM.click[0], cue: 'switch-click' },
    ...blips,
    ...EJECT_FILM.wheel.slice(1).map(([at]) => ({ at, cue: 'door-seal', gain: 0.45 })),
    ...EJECT_FILM.clamps.map(([at]) => ({ at, cue: 'door-seal', gain: 0.35 })),
    { at: EJECT_FILM.iris[0], cue: 'hatch-open' },
    { at: EJECT_FILM.suction.in[0], cue: 'air-rush', until: EJECT_FILM.suction.out[1] },
    { at: EJECT_FILM.irisClose[0], cue: 'hatch-close' },
    { at: EJECT_FILM.clampsBack[0], cue: 'door-seal', gain: 0.4 },
  ]),
  reduced: Object.freeze([
    { at: 0, cue: 'switch-click', gain: 0.6 },
    { at: 680, cue: 'hatch-open', gain: 0.5 },
    { at: 1280, cue: 'hatch-close', gain: 0.5 },
  ]),
  insert: Object.freeze([]),
});

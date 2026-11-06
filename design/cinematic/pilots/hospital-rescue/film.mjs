// mothership:dev-only
//
// Pilot 1: the Hospital's medical drone and recovery, as a cinematic treatment of the approved
// S5 rescue (design/board-v2/films/medical.mjs RESCUE, on the four-berth ward of #160). The S5
// film is untouched: this module layers a cinematic pass on its beats, in the Hospital scene's own
// units (1024 x 768), so the same frame draws on a phone's Hospital panel and, framed by a camera,
// on the shared display.
//
//   full     6.2 s: S5's beats (alert, the ceiling hatch, the drone's descent under its searchlight,
//            the scan fan, the charge, the revival pulse with rings, burst, sparks and THUMP, the
//            stabilized monitor's BEEP, the patient sitting up, the drone's exit, the hatch closing),
//            then the release: the patient stands and walks out of the ward, the berth is left
//            empty, and the display's last panel shows the patient at the place the snapshot gives.
//   short    1.6 s, nonblocking: the drone drops in, one pulse, the monitor steadies, the patient
//            sits up, stands and leaves the berth, the drone leaves. For a screen whose next
//            decision should not wait on a film.
//   reduced  S5's own reduced variant (two still states cross-faded over 80 ms) and a third: the
//            berth empty. No travel, flash, shake, ring, particle or lettering.
//
// The film ends on the authoritative state (the owner's review of 6 November 2026): a healed patient
// who is free is in Room A or B, one still detained is in the Jail, wherever the published snapshot
// places them. The release follows that placement; nothing leaves the patient apparently in a
// Hospital bed, and the patient's playable figure at its snapshot place stays drawn throughout
// (greyed as away while the film shows the rescue, back in colour as the walker leaves the ward).
// Only if the snapshot itself still had the patient at this berth would the film end at the berth.
//
// Inputs, all authorized and public (protocol 3 candidate, packages/contracts/src/planet-game.ts at
// 79418e7): a RESCUED occurrence's seat, its Hospital slot and its clinical anchor; the published
// snapshot's seats (whether another seat or a body holds the anchor's bed, fourFilmBerth()); the
// milliseconds since the occurrence's presentation start; the device's reduced-motion setting.
// Not an input: who registered the Rescue, the Doctor, a panel code, a role, a side or a cause.
// No line, glow or sound points from anyone to the patient. Nothing here changes health, place,
// phase or time: the server's outcome is already in the snapshot, and the film only draws it.

import { RESCUE, rescueEnd } from '../../../board-v2/films/medical.mjs';
import { DOCK, DRONE_SCENE, hoverAt } from '../../../board-v2/fx/medical.mjs';
import { fourBerthKit, fourRescueFrame } from '../../../board-v2/fx/medical-four.mjs';
import { bell, beat, clamp01, easeInCubic, easeInOutCubic, easeOutBack, easeOutCubic, easeOutExpo, inBeat, keys, lerp, lerp2, noise, r2, ramp } from '../../lib/ease.mjs';

export const HOSPITAL_RESCUE_VERSION = 'cinematic-hospital-rescue-0.1.0';
export const VARIANTS = Object.freeze(['full', 'short', 'reduced']);

/** The cinematic pass's beats, in ms from the occurrence's presentation start, on S5's own beats. */
export const PILOT = Object.freeze({
  id: 'cine-hospital-rescue',
  storyboard: 'P1 (on S5)',
  full: Object.freeze({
    end: 6200,
    /** S5's own length: S5's frame runs to here, the release after it (and under it from 4800). */
    s5End: rescueEnd(false),
    gradeAlert: Object.freeze([0, RESCUE.alert[1]]),
    hatchOpen: Object.freeze([620, 880]),
    hatchClose: Object.freeze([5420, 5600]),
    searchlight: Object.freeze([RESCUE.arrive[0] + 100, RESCUE.charge[0]]),
    searchlightLate: Object.freeze([4400, RESCUE.depart[0] + 200]),
    scanFan: RESCUE.scan,
    charge: RESCUE.charge,
    ringA: Object.freeze([RESCUE.pulse[0], RESCUE.pulse[0] + 460]),
    ringB: Object.freeze([RESCUE.pulse[0] + 110, RESCUE.pulse[0] + 640]),
    burst: Object.freeze([RESCUE.pulse[0], RESCUE.pulse[0] + 230]),
    speed: Object.freeze([RESCUE.pulse[0], RESCUE.pulse[0] + 190]),
    sparks: Object.freeze([RESCUE.pulse[0], RESCUE.pulse[0] + 720]),
    thump: Object.freeze([RESCUE.pulse[0] + 20, RESCUE.pulse[0] + 700]),
    gradeCalm: Object.freeze([RESCUE.stabilize[0], 4900]),
    beeps: Object.freeze([3900, 4300, 4700, 5100]),
    recover: Object.freeze([RESCUE.recover[0], 4500]),
    settle: Object.freeze([4500, 4900]),
    trail: Object.freeze([RESCUE.depart[0] + 100, RESCUE.depart[1]]),
    /** The drone's rise off the patient as they sit up, in scene units at the berth's scale. */
    lift: 46,
    liftUp: Object.freeze([3900, 4400]),
    /**
     * The release, once the snapshot places the patient outside the Hospital: stand beside the bed
     * (the drone already lifted clear), walk out of the ward toward the nearer side, fading at the
     * panel's edge; the berth is empty from the moment the patient is off it. On the board the
     * patient's playable figure returns to colour as the walker leaves (arrive); on the display the
     * closing panel shows the destination with the patient at its place.
     */
    release: Object.freeze({ stand: Object.freeze([4800, 5120]), walk: Object.freeze([5120, 5800]), fade: Object.freeze([5620, 5800]), arrive: Object.freeze([5800, 6050]), panel: Object.freeze([5560, 5880]), cycleMs: 620 }),
  }),
  short: Object.freeze({
    end: 1600,
    blink: Object.freeze([0, 150]),
    drop: Object.freeze([100, 430]),
    open: 360,
    charge: Object.freeze([380, 450]),
    pulse: Object.freeze([450, 650]),
    ring: Object.freeze([450, 820]),
    stable: 650,
    recover: Object.freeze([650, 1080]),
    rise: Object.freeze([1120, 1460]),
    fade: Object.freeze([1460, 1600]),
    /** The release, short: stand beside the bed, then fade out toward the exit; the playable figure returns to colour. */
    release: Object.freeze({ stand: Object.freeze([1080, 1300]), leave: Object.freeze([1300, 1460]), arrive: Object.freeze([1460, 1600]) }),
  }),
  /** S5's two stills, then a third: the berth empty and the playable figure back in colour (80 ms cross-fade). */
  reduced: Object.freeze({ end: rescueEnd(true), switchAt: RESCUE.reduced.switchAt, releaseAt: 1300, fade: 80 }),
  /** The display's camera, in scene units (centre) and pixels per scene unit at 1080 rows (zoom). */
  camera: Object.freeze({ shots: 'per berth, cameraShots()', shakePx: 10, shake: Object.freeze([RESCUE.pulse[0], RESCUE.pulse[0] + 300]) }),
  letterbox: Object.freeze({ inOut: Object.freeze([[0, 420], [5900, 6200]]), share: 0.085 }),
  ecgPanel: Object.freeze([3560, 4760]),
  /** The close-up's first appearance: the unstable trace while the alert sounds, before the drone. */
  ecgAlert: Object.freeze([90, 1000]),
  /** The berth lamp's alarm glow, with S5's two blinks. */
  alarmGlow: 0.55,
});

export const pilotEnd = (variant = 'full') => PILOT[variant].end;

/** The berth's geometry the pass needs, from the four-berth ward's kit. */
export function berthPlaces(berthId, fit = 1) {
  const kit = fourBerthKit(berthId);
  return { kit, hover: hoverAt(kit, fit), chest: kit.chest, scale: kit.scale, bed: kit.bed, monitor: kit.monitor, lamp: kit.lamp, dock: DOCK };
}

/**
 * The release's path for a berth, in scene units: the side the patient leaves by (the nearer edge
 * of the ward: left of H1 and H3, right of H2 and H4), where they stand beside the bed (feet), the
 * point past the panel's edge they walk to, the drawn scale and the depth they walk at (in front of
 * the berths' own layers on the same row). mirror: the rig faces left; a walk to the right is mirrored.
 */
export function releasePath(berthId) {
  const kit = fourBerthKit(berthId);
  const { bed, scale } = kit;
  const left = bed.x + bed.w / 2 < 512;
  const feet = Math.min(752, bed.y + bed.h - 30 * scale);
  const stand = [r2(left ? bed.x - 34 * scale : bed.x + bed.w + 34 * scale), r2(feet)];
  const exit = [left ? -110 : 1134, r2(feet)];
  return { side: left ? 'left' : 'right', mirror: !left, stand, exit, scale, depth: r2(Math.max(feet, bed.y + bed.h) + 12) };
}

/**
 * The drone's drawn size along its path, as a share of its size at the berth: small in the ceiling
 * dock's iris (its own width there is about the iris's), full at the hover point, so that it comes
 * down out of the far ceiling toward the bed. clip: while it is in or near the iris, its parts
 * above the ceiling's plane are hidden.
 */
export function dronePerspective(at, hover) {
  if (!at) return { scale: 1, clip: false };
  const p = clamp01((at[1] - DOCK[1]) / Math.max(1, hover[1] - DOCK[1]));
  return { scale: r2(lerp(0.32, 1, easeOutCubic(p))), clip: at[1] < DOCK[1] + 80 };
}

/**
 * The display camera's shots for a berth, each with keys in scene units (centre) and display
 * pixels per scene unit at 1080 rows (zoom; 1.875 fills 1920 columns, and cameraFrame() clamps
 * every key to the scene). Between shots the camera cuts:
 *   ward      wide on the ward while the alert sounds, a slow push
 *   ceiling   cut to the ceiling dock: the iris opens and the drone drops out of it, past the lens
 *   follow    cut back to the ward: down with the drone to the berth, in for the scan and the pulse,
 *             back with the patient left of centre for the close-up panel, and out to the ward again
 */
export function cameraShots(berthId) {
  const { chest, hover } = berthPlaces(berthId);
  const path = releasePath(berthId);
  return [
    { name: 'ward', from: 0, to: 600, keys: [{ t: 0, center: [512, 420], zoom: 1.9 }, { t: 600, center: [512, 404], zoom: 2.02, ease: easeInOutCubic }] },
    { name: 'ceiling', from: 600, to: 1150, keys: [{ t: 600, center: [512, 112], zoom: 4.3 }, { t: 1150, center: [512, 150], zoom: 4.6, ease: easeInOutCubic }] },
    {
      name: 'follow', from: 1150, to: Infinity, keys: [
        { t: 1150, center: [lerp(512, chest[0], 0.35), 300], zoom: 2.25 },
        { t: 1800, center: [lerp(512, chest[0], 0.8), hover[1] + 40], zoom: 2.5, ease: easeInOutCubic },
        { t: 3100, center: [chest[0], chest[1] - 40], zoom: 3, ease: easeInOutCubic },
        { t: 3500, center: [chest[0], chest[1] - 34], zoom: 3.35, ease: easeOutCubic },
        { t: 3800, center: [chest[0] + 60, chest[1] - 40], zoom: 3.2, ease: easeOutCubic },
        { t: 4700, center: [chest[0] + 90, chest[1] - 66], zoom: 2.6, ease: easeInOutCubic },
        // The release: onto the patient standing, along the walk out, then wide on the empty berth.
        { t: 5120, center: [path.stand[0], path.stand[1] - 150 * path.scale], zoom: 2.35, ease: easeInOutCubic },
        { t: 5800, center: [lerp(path.stand[0], path.exit[0], 0.55), path.stand[1] - 140 * path.scale], zoom: 2.1, ease: easeInOutCubic },
        { t: 6200, center: [512, 410], zoom: 1.9, ease: easeInOutCubic },
      ],
    },
  ];
}

/** The camera at t: its shot's name, centre and zoom, and whether t is the shot's first frame (a cut). */
export function cameraAt(t, berthId) {
  const shots = cameraShots(berthId);
  const shot = shots.find(entry => t >= entry.from && t < entry.to) ?? shots[shots.length - 1];
  const key = keys(shot.keys, t);
  return { shot: shot.name, center: key.center, zoom: key.zoom };
}

/** The scene's display viewport: zoom at least 1.875 and the centre kept inside the scene, so no frame shows past its art. */
export function cameraFrame({ center, zoom }, { width = 1920, height = 1080 } = {}) {
  const k = Math.max(zoom, width / 1024, height / 768);
  const hx = width / 2 / k, hy = height / 2 / k;
  return { k, center: [Math.min(1024 - hx, Math.max(hx, center[0])), Math.min(768 - hy, Math.max(hy, center[1]))] };
}

// ---------- the berth after the patient has left it ----------

/** A base frame's berth once the patient is off it: no screen, no lamp of its own (the board's empty berth). */
function emptyBerth(base) {
  return { ...base, inset: { ...base.inset, kind: 'off', opacity: 0 }, lamp: { state: 'none', opacity: 1 } };
}

/** S5's shape after its own end: the drone gone, the berth at rest (emptied by the release, if any). */
function restingBerth(fit) {
  return {
    stage: 'release', inset: { opacity: 0, scale: 1, kind: 'stable', sweep: 1 }, lamp: { state: 'calm', opacity: 1 },
    drone: { at: null, frame: 'folded', opacity: 0, fit }, scan: { y: 0, opacity: 0 }, hologram: { opacity: 0 },
    pulse: { frame: 0, scale: 1, opacity: 0 }, patient: { pose: 'healthy', jolt: [0, 0], offset: [0, 0] }, announce: true, done: false,
  };
}

// ---------- the short, nonblocking variant's own S5-shaped frame ----------

function shortBase(t, berthId, fit) {
  const S = PILOT.short;
  const { hover } = berthPlaces(berthId, fit);
  const top = [hover[0], DOCK[1]];
  let at = null;
  if (t >= S.drop[0] && t < S.rise[1]) {
    if (t < S.drop[1]) at = lerp2(top, hover, easeOutCubic(beat(t, S.drop)));
    else if (t < S.rise[0]) at = [hover[0], r2(hover[1] + DRONE_SCENE.bob * Math.sin((2 * Math.PI * (t - S.drop[1])) / 700))];
    else at = lerp2(hover, top, easeInCubic(beat(t, S.rise)));
  }
  const stable = t >= S.stable;
  const pulsing = inBeat(t, S.pulse);
  return {
    stage: t < S.drop[0] ? 'alert' : t < S.pulse[0] ? 'arrive' : t < S.stable ? 'pulse' : t < S.rise[0] ? 'recover' : 'depart',
    inset: { opacity: 0, scale: 1, kind: stable ? 'stable' : 'unstable', sweep: 1 },
    lamp: stable ? { state: 'calm', opacity: 1 } : inBeat(t, S.blink) ? { state: 'dark', opacity: 1 } : { state: 'amber', opacity: 1 },
    drone: { at, frame: pulsing ? 'pulse' : inBeat(t, S.charge) ? 'charge' : t >= S.open && t < S.rise[0] ? 'open' : 'folded', opacity: 1 - beat(t, S.fade), fit },
    scan: { y: 0, opacity: 0 }, hologram: { opacity: 0 },
    pulse: pulsing ? { frame: beat(t, S.pulse) < 0.5 ? 1 : 2, scale: lerp(0.8, 1.15, easeOutCubic(beat(t, S.pulse))), opacity: 1 - beat(t, S.pulse) * 0.7 } : { frame: 0, scale: 1, opacity: 0 },
    patient: { pose: t >= (S.recover[0] + S.recover[1]) / 2 ? 'healthy' : 'injured', jolt: inBeat(t, [S.pulse[0], S.pulse[0] + 240]) ? [0, r2(-2.5 * bell(beat(t, [S.pulse[0], S.pulse[0] + 240])))] : [0, 0], offset: [0, 0] },
    announce: stable,
    done: false,
  };
}

/**
 * The cinematic frame at t for an occurrence at `berthId` (H1 to H4: fourFilmBerth() has already
 * said a film plays there). `variant` full | short | reduced; `surface` board (a phone's or the
 * display's Hospital panel, no camera) | display (the shared display's cinematic, with camera,
 * letterbox and close-up panel); `fit` the drone's fit in its panel (droneFit(), 1 on the display).
 *
 *   base       S5's own frame (fourRescueFrame()) or the short variant's frame of the same shape
 *   patient    { blend: 0 injured .. 1 sitting up, settle: the relieved settle 0..1, jolt [dx, dy] }
 *   hatch      the ceiling hatch's opening, 0..1         searchlight / scanFan { opacity, ... }
 *   charge     the motes' progress into the lens, 0..1    rings [{ r, opacity }] in scene units
 *   burst, speed, sparks, sfx   the pulse's comic accents        beep: the latest monitor beep's 0..1 glow
 *   grade      { alert, calm } tint amounts               trail: the lens's exit streak { v, opacity }
 *   camera     (display) { center, zoom, shake [dx, dy] }  letterbox (display) its share of the height
 *   ecg        (display) the close-up panel { opacity, slide, kind: unstable | stable, sweep }
 *   release    null (the patient stays at the berth) or { phase: bed | stand | walk | gone, stand 0..1,
 *              walk 0..1, cycle 0..1 (the walk's two-step cycle), opacity, offBed }
 *   arrive     0..1: the playable figure's return to colour at its snapshot place (the board's settle)
 *   panel      (display) 0..1: the closing panel with the patient at the snapshot's place
 *   done       nothing left to draw: the board shows the snapshot alone
 *
 * leaves: the published snapshot places the patient outside the Hospital (a free patient in Room A
 * or B, a detained one in the Jail), so the film releases them; false only if the snapshot still
 * has them at this berth.
 */
export function rescueCinematicFrame(t, berthId, { variant = 'full', surface = 'board', fit = 1, leaves = true } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No variant ${variant}`);
  const end = pilotEnd(variant);
  const { chest, hover, scale } = berthPlaces(berthId, fit);
  const empty = {
    variant, surface, t, patient: { blend: 0, settle: 0, jolt: [0, 0] }, hatch: 0, searchlight: { opacity: 0 }, scanFan: { opacity: 0 }, charge: 0,
    rings: [], burst: { opacity: 0 }, speed: { opacity: 0 }, sparks: 0, sfx: { opacity: 0 }, beep: 0, grade: { alert: 0, calm: 0 }, trail: { opacity: 0, v: 0 },
    camera: null, letterbox: 0, ecg: { opacity: 0 }, drone: { scale: 1, clip: false }, alarm: 0, release: null, arrive: 0, panel: 0, done: false,
  };
  if (t >= end) return { ...empty, base: { done: true }, patient: { blend: 1, settle: 1, jolt: [0, 0] }, release: leaves ? { phase: 'gone', stand: 1, walk: 1, cycle: 0, opacity: 0, offBed: true } : null, arrive: leaves ? 1 : 0, done: true };
  if (t < 0) return { ...empty, base: fourRescueFrame(-1, berthId, { fit }) };

  if (variant === 'reduced') {
    const R = PILOT.reduced;
    const base = fourRescueFrame(t, berthId, { reduced: true, fit });
    // Three still states: the drone over the patient, the patient sitting up, the berth empty (when the
    // snapshot places the patient elsewhere). An 80 ms cross-fade between them; no motion.
    const out = { ...empty, base, patient: { blend: t >= R.switchAt ? 1 : 0, settle: 0, jolt: [0, 0] } };
    if (leaves && t >= R.releaseAt) {
      const v = r2(beat(t, [R.releaseAt, R.releaseAt + R.fade]));
      out.release = { phase: v < 1 ? 'stand' : 'gone', stand: 0, walk: 0, cycle: 0, opacity: r2(1 - v), offBed: true };
      out.base = emptyBerth(base);
      out.arrive = 1;
    }
    return out;
  }

  if (variant === 'short') {
    const S = PILOT.short;
    const shortB = shortBase(t, berthId, fit);
    const L = S.release;
    let release = null;
    if (leaves && t >= L.stand[0]) {
      const stand = easeInOutCubic(beat(t, L.stand));
      const leave = beat(t, L.leave);
      release = { phase: t < L.stand[1] ? 'stand' : t < L.leave[1] ? 'walk' : 'gone', stand: r2(stand), walk: r2(0.18 * easeInCubic(leave)), cycle: r2((Math.max(0, t - L.stand[1]) / 620) % 1), opacity: r2(1 - easeInCubic(leave)), offBed: t >= L.stand[1] };
    }
    const base = release?.offBed ? emptyBerth(shortB) : shortB;
    const rv = beat(t, S.ring);
    return {
      ...empty, base, release, arrive: leaves ? r2(beat(t, L.arrive)) : 0,
      drone: dronePerspective(base.drone.at, berthPlaces(berthId, fit).hover),
      alarm: inBeat(t, S.blink) ? 0.4 : t < S.stable ? 0.14 : 0,
      patient: { blend: easeInOutCubic(beat(t, S.recover)), settle: beat(t, [S.recover[1], S.rise[0]]), jolt: base.patient.jolt },
      rings: inBeat(t, S.ring) ? [{ r: r2(lerp(12, 74, easeOutExpo(rv)) * scale), opacity: r2(1 - rv), width: 5 * scale }] : [],
      burst: inBeat(t, S.pulse) ? { r: r2(lerp(16, 34, easeOutBack(beat(t, S.pulse))) * scale), opacity: r2(1 - beat(t, S.pulse) ** 2), at: chest } : { opacity: 0 },
      beep: t >= S.stable ? r2(1 - beat(t, [S.stable, S.stable + 300])) : 0,
      grade: { alert: inBeat(t, S.blink) ? 0.12 : 0, calm: r2(0.12 * bell(beat(t, [S.stable, S.fade[1]]))) },
      searchlight: base.drone.at && t < S.rise[0]
        ? { opacity: r2(0.7 * Math.min(beat(t, [S.drop[0], S.drop[1]]), 1 - beat(t, [S.rise[0] - 120, S.rise[0]]))), from: base.drone.at, to: [chest[0], chest[1] + 26 * scale], spread: 50 * scale }
        : { opacity: 0 },
    };
  }

  const F = PILOT.full;
  const R = F.release;
  // After S5's own end, the ward is at rest: no drone, the berth's devices as the release leaves them.
  const s5 = t < F.s5End ? fourRescueFrame(t, berthId, { fit }) : restingBerth(fit);
  // The drone rises as the patient sits up, so that it never covers the recovered face; it
  // converges back on S5's path as it climbs to the dock. S5's own positions are unchanged.
  const lift = s5.drone.at ? F.lift * scale * fit * easeInOutCubic(beat(t, F.liftUp)) * (1 - easeInOutCubic(beat(t, [RESCUE.depart[0] + 100, RESCUE.depart[1]]))) : 0;
  const base = lift ? { ...s5, drone: { ...s5.drone, at: [s5.drone.at[0], r2(s5.drone.at[1] - lift)] } } : s5;
  const lens = base.drone.at;
  const frame = { ...empty, base };
  // The release: stand, walk out, the berth empty once the patient is off it, the playable figure back in colour.
  if (leaves && t >= R.stand[0]) {
    const walk = beat(t, R.walk);
    frame.release = {
      phase: t < R.stand[1] ? 'stand' : t < R.walk[1] ? 'walk' : 'gone',
      stand: r2(easeInOutCubic(beat(t, R.stand))),
      walk: r2(walk),
      cycle: r2((Math.max(0, t - R.walk[0]) / R.cycleMs) % 1),
      opacity: r2(1 - easeInCubic(beat(t, R.fade))),
      offBed: t >= R.stand[1],
    };
    if (frame.release.offBed) frame.base = emptyBerth(frame.base);
    frame.arrive = r2(easeOutCubic(beat(t, R.arrive)));
    if (surface === 'display') frame.panel = r2(beat(t, R.panel));
  }
  frame.drone = dronePerspective(lens, hover);
  // The berth lamp's alarm glow: bright on S5's blinks, a low pulse until the rhythm steadies.
  const blinkOn = RESCUE.blinks.some(([a, b]) => t >= a && t < b);
  frame.alarm = r2(t < RESCUE.alert[1] ? (blinkOn ? PILOT.alarmGlow : 0.12) : t < RESCUE.stabilize[0] ? 0.14 + 0.06 * Math.sin(t / 160) : 0);
  // The patient sits up from the injured pose on S5's recover beat, then settles with a breath.
  frame.patient = { blend: easeInOutCubic(beat(t, F.recover)), settle: easeOutCubic(beat(t, F.settle)), jolt: base.patient.jolt };
  // The hatch opens ahead of the drone (a pneumatic snap with a small overshoot) and shuts after it.
  frame.hatch = t < F.hatchClose[0] ? clamp01(easeOutBack(beat(t, F.hatchOpen), 2.2)) : 1 - easeInCubic(beat(t, F.hatchClose));
  if (t < F.hatchOpen[0]) frame.hatch = 0;
  // The searchlight: from the lens to the bed while the drone comes down and scans, then softer as it lifts.
  const lightIn = Math.min(beat(t, [F.searchlight[0], F.searchlight[0] + 320]), 1 - beat(t, [F.searchlight[1] - 160, F.searchlight[1]]));
  const lightLate = Math.min(beat(t, [F.searchlightLate[0], F.searchlightLate[0] + 300]), 1 - beat(t, [F.searchlightLate[1] - 300, F.searchlightLate[1]])) * 0.55;
  const flicker = 0.92 + 0.08 * noise(17, t / 70);
  frame.searchlight = lens ? { opacity: r2(Math.max(inBeat(t, F.searchlight) ? lightIn : 0, inBeat(t, F.searchlightLate) ? lightLate : 0) * flicker), from: lens, to: [chest[0], chest[1] + 26 * scale], spread: 58 * scale } : { opacity: 0 };
  // The scan fan: a sheet of light from the scanner arm to the scan line's height.
  if (lens && inBeat(t, F.scanFan) && base.scan.opacity > 0) {
    const y = lerp(chest[1] - 38 * scale, chest[1] + 70 * scale, base.scan.y);
    frame.scanFan = { opacity: r2(Math.min(beat(t, [F.scanFan[0], F.scanFan[0] + 150]), 1 - beat(t, [F.scanFan[1] - 150, F.scanFan[1]]))), from: [lens[0], lens[1] + 48 * scale * fit], y, half: 64 * scale };
  }
  frame.charge = inBeat(t, F.charge) ? r2(beat(t, F.charge)) : 0;
  // The revival pulse's comic accents, at the chest.
  const ring = ([a, b], from, to, width) => (inBeat(t, [a, b]) ? { r: r2(lerp(from, to, easeOutExpo(beat(t, [a, b]))) * scale), opacity: r2(1 - beat(t, [a, b]) ** 1.4), width: width * scale } : null);
  frame.rings = [ring(F.ringA, 14, 120, 7), ring(F.ringB, 10, 170, 4)].filter(Boolean);
  frame.burst = inBeat(t, F.burst) ? { r: r2(lerp(20, 54, easeOutBack(beat(t, F.burst), 2.4)) * scale), opacity: r2(1 - beat(t, F.burst) ** 3), at: chest } : { opacity: 0 };
  frame.speed = inBeat(t, F.speed) ? { opacity: r2(0.85 * (1 - beat(t, F.speed))), inner: 62 * scale, outer: 150 * scale, at: chest } : { opacity: 0 };
  frame.sparks = inBeat(t, F.sparks) ? r2(beat(t, F.sparks)) : 0;
  if (inBeat(t, F.thump)) {
    const v = beat(t, F.thump);
    frame.sfx = { text: 'THUMP!', opacity: r2(Math.min(1, v * 8) * (1 - beat(t, [F.thump[1] - 180, F.thump[1]]))), scale: r2(lerp(0.6, 1, easeOutBack(Math.min(1, v * 3.2), 3))), at: [chest[0] + 96 * scale, chest[1] - 64 * scale], size: 40 * scale, rotate: -8 };
  }
  // The monitor's beeps as the rhythm steadies: a glow on the screen, and on the display a BEEP.
  const lastBeep = [...F.beeps].reverse().find(at => t >= at);
  frame.beep = lastBeep === undefined ? 0 : r2(1 - beat(t, [lastBeep, lastBeep + 280]));
  frame.grade = {
    alert: r2(0.16 * (inBeat(t, F.gradeAlert) ? (base.lamp.state === 'dark' ? 0.4 : 1) : t < RESCUE.stabilize[0] ? 0.45 : 0)),
    calm: r2(0.16 * Math.min(beat(t, [F.gradeCalm[0], F.gradeCalm[0] + 400]), 1 - beat(t, [F.gradeCalm[1] - 300, F.gradeCalm[1]]))),
  };
  if (inBeat(t, F.trail) && lens) frame.trail = { v: r2(beat(t, F.trail)), opacity: r2(0.75 * bell(beat(t, F.trail))), to: lens, from: [lens[0], lens[1] + 60] };

  if (surface === 'display') {
    const cam = cameraAt(t, berthId);
    const shake = inBeat(t, PILOT.camera.shake) ? (1 - beat(t, PILOT.camera.shake)) * PILOT.camera.shakePx : 0;
    frame.camera = { shot: cam.shot, center: cam.center, zoom: cam.zoom, shake: [r2(noise(3, t / 28) * shake), r2(noise(5, t / 31) * shake)] };
    const [[a0, a1], [b0, b1]] = PILOT.letterbox.inOut;
    frame.letterbox = r2(PILOT.letterbox.share * Math.min(easeOutCubic(ramp(t, a0, a1)), 1 - easeInCubic(ramp(t, b0, b1))));
    if (inBeat(t, PILOT.ecgAlert)) {
      const [e0, e1] = PILOT.ecgAlert;
      frame.ecg = { opacity: r2(Math.min(beat(t, [e0, e0 + 160]), 1 - beat(t, [e1 - 200, e1]))), slide: r2(1 - easeOutCubic(beat(t, [e0, e0 + 300]))), kind: 'unstable', sweep: 1 };
    }
    if (inBeat(t, PILOT.ecgPanel)) {
      const [e0, e1] = PILOT.ecgPanel;
      frame.ecg = { opacity: r2(Math.min(beat(t, [e0, e0 + 200]), 1 - beat(t, [e1 - 220, e1]))), slide: r2(1 - easeOutCubic(beat(t, [e0, e0 + 320]))), kind: t >= RESCUE.stabilize[0] ? 'stable' : 'unstable', sweep: r2(clamp01((t - RESCUE.stabilize[0]) / 1100)) };
    }
  }
  return frame;
}

/** The audio cues, in ms from the presentation start: what plays when, for the cue sheet and the mix. */
export const AUDIO = Object.freeze({
  full: Object.freeze([
    { at: 0, cue: 'alert-blip' }, { at: 400, cue: 'alert-blip' },
    { at: 620, cue: 'hatch-open' }, { at: 800, cue: 'drone-hum', until: 5600 },
    { at: 1800, cue: 'servo-unfold' }, { at: RESCUE.scan[0], cue: 'scan-sweep', until: RESCUE.scan[1] },
    { at: RESCUE.charge[0], cue: 'charge-whine', until: RESCUE.pulse[0] }, { at: RESCUE.pulse[0], cue: 'revival-thump' },
    ...PILOT.full.beeps.map(at => ({ at, cue: 'monitor-beep' })), { at: 5420, cue: 'hatch-close' },
    // The release: off the bed, then the steps out of the ward (public movement sounds).
    { at: 4880, cue: 'seat-settle', gain: 0.6 }, ...[5160, 5400, 5640].map(at => ({ at, cue: 'footstep', gain: 0.55 })),
  ]),
  short: Object.freeze([
    { at: 0, cue: 'alert-blip' }, { at: 100, cue: 'drone-whoosh' }, { at: 450, cue: 'revival-thump' }, { at: 800, cue: 'monitor-beep' }, { at: 1120, cue: 'drone-whoosh' },
  ]),
  reduced: Object.freeze([{ at: 0, cue: 'alert-blip' }, { at: 800, cue: 'monitor-beep' }]),
});

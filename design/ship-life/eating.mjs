// mothership:dev-only
//
// Ship life: the automatic visit to the room's food capsule, once a round, after a character
// outside the Hospital finishes their turn. Cosmetic only: the walk stays in the room, the place
// the game holds for the character never changes, no move is spent, and nothing here decides or
// records food. Food comes from a future approved gameplay contract; until then the preview uses
// labelled fixtures (stocked, empty, unknown).
//
// stocked: the place's activity stops; the character gets up, walks to the capsule, opens the
//   hatch, takes the portion, turns to the room and eats (two bites, one after a long walk), turns
//   back, puts the wrapper back in the compartment, closes the hatch, walks back, settles, and the
//   place's activity resumes.
// empty: the same walk; the hatch opened, a look in, a restrained reaction (a small shake of the
//   head, the shoulders a little lower), the hatch closed, back. No penalty, no alarm, no word.
// unknown: no visit at all; the capsule shows its neutral closed state (capsule.mjs).
//
// The visitor stands beside the capsule (positions.mjs) and reaches it with the arm on its side,
// so the body never hides the hatch. Every pose of the visit is built from the capsule's own
// geometry (the hatch, its handle, the tray, as the figure's frame sees them), so one visit serves
// every room and every one of the nine.
//
// Mirroring: a figure faces left; mirrored, right. Where two poses of a blend face different ways
// (a walk to the right and the capsule's pose), the figure turns at the blend's middle, where the
// rig already switches what cannot blend (the head's view, the drawing order).

import { GESTURES, skeletonOf } from '../board-motion/figures/gestures.mjs';
import { EASE, blend, walkPose } from '../board-motion/figures/motion.mjs';
import { pose, nudge } from './activities.mjs';

/**
 * The walk across a room's floor: speed in room units a ms, its time between min and max ms
 * whatever the distance (a long walk hurries), and a step every stepMs (the rig's stride is short
 * for a room, so a step covers more floor than the foot does: a little slide, as the board's move).
 */
export const WALK = Object.freeze({ speed: 0.32, min: 400, max: 1200, stepMs: 200 });

/** How long each beat of a visit takes, in ms. */
export const BEATS = Object.freeze({
  stop: 220, rise: 400, up: 280, arrive: 300, settle: 360,
  grip: 280, open: 320, reachIn: 220, take: 240, toChest: 200, turn: 320,
  bite: 240, chew: 400, put: 280, closeGrip: 240, close: 320, down: 220,
  peek: 300, look: 520, shake: 190, breathe: 260, sigh: 340,
});

/** The scale of a figure whose feet are at room height y, from a room's depth line [y0, scale at y0, change per unit]. */
export const depthScale = (y, [y0, s0, k]) => s0 + (y - y0) * k;

/** A room point as the frame of a figure standing at spot with scale s sees it (unmirrored). */
export const toFigure = ([x, y], spot, s) => [62 + (x - spot[0]) / s, 233 - (spot[1] - y) / s];

/** A frame point of an unmirrored figure as the same figure mirrored sees it, and back. */
const flipX = ([x, y]) => [124 - x, y];

/**
 * An arm reaching a wrist point: the elbow for the shoulder and the wrist (two bones, up and fore
 * long), bent toward bend (a direction: the elbow goes that side of the line). A wrist out of
 * reach is brought in along the line. Returns { e, w }.
 */
export function armTo(shoulder, wrist, { up = 33, fore = 27, bend = [0, 1] } = {}) {
  const dx = wrist[0] - shoulder[0], dy = wrist[1] - shoulder[1];
  const dist = Math.hypot(dx, dy) || 1;
  const d = Math.max(Math.abs(up - fore) + 0.5, Math.min(dist, up + fore - 0.5));
  const ux = dx / dist, uy = dy / dist;
  const w = [shoulder[0] + ux * d, shoulder[1] + uy * d];
  const a = (up * up - fore * fore + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, up * up - a * a));
  const m = [shoulder[0] + ux * a, shoulder[1] + uy * a];
  const e1 = [m[0] - uy * h, m[1] + ux * h], e2 = [m[0] + uy * h, m[1] - ux * h];
  const side = e => (e[0] - m[0]) * bend[0] + (e[1] - m[1]) * bend[1];
  return { e: side(e1) >= side(e2) ? e1 : e2, w };
}

const DOOR = GESTURES.doorBack;
/** At the capsule, back to us, the arms down: the door's stance. */
const AT = Object.freeze(pose(DOOR, {
  head: [60, 38], tilt: 0,
  eF: [33, 104], wF: [35, 132], handF: { angle: 92, type: 'open' },
  eN: [90, 104], wN: [89, 132], handN: { angle: 88, type: 'open' },
  order: ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'],
}));
/** Turned to the room, standing, the arms down. */
const FRONT = Object.freeze(pose(GESTURES.stand, {
  eF: [32, 104], wF: [36, 131], handF: { angle: 95, type: 'open' },
  eN: [96, 102], wN: [94, 130], handN: { angle: 88, type: 'open' },
}));

/**
 * The poses of a visit at one capsule, in the frame of the visitor standing at its spot, facing
 * the capsule's side: { mirror, side, ...poses }. The visitor reaches with the arm nearer the
 * capsule: unmirrored, a capsule to the left is reached with the far arm (F), to the right with
 * the near (N); mirrored, the other way round.
 */
export function capsulePoses(capsule) {
  const { spot, scale: s, hatch } = capsule;
  const centre = hatch[0] + hatch[2] / 2;
  // The capsule to the visitor's left: unmirrored, the far arm reaches it.
  const left = centre < spot[0];
  const side = left ? 'F' : 'N';
  const mirror = false;
  const p = point => toFigure(point, spot, s);
  const hx = centre, top = hatch[1], bottom = hatch[1] + hatch[3];
  const handleShut = p([hx, bottom - 3]);
  const handleOpen = p([hx, top + 2]);
  const tray = p([hx, bottom - 6]);
  const out = p([hx + (left ? 6 : -6), bottom + 2]);
  const S = side === 'F' ? AT.sF : AT.sN;
  const bend = left ? [0.2, 1] : [-0.2, 1];
  // The upper arm is foreshortened as the hand goes to the wall in front of the visitor.
  const reach = (base, wrist, { up = 30, fore = 20, hand = {}, extra = {} } = {}) => {
    const { e, w } = armTo(S, wrist, { up, fore, bend });
    return pose(base, { [`e${side}`]: e, [`w${side}`]: w, [`hand${side}`]: { angle: left ? -118 : -62, type: 'fist', ...hand }, ...extra });
  };
  // The head turned a little to the capsule's side, from behind.
  const look = { head: [left ? 57 : 63, 39], tilt: left ? -5 : 5 };
  const grip = reach(AT, handleShut, { up: 30, fore: 20, extra: look });
  const open = reach(AT, handleOpen, { up: 24, fore: 16, extra: look });
  const reachIn = reach(AT, tray, { up: 28, fore: 14, hand: { type: 'open' }, extra: look });
  const take = reach(AT, out, { up: 28, fore: 16, extra: look });
  // From behind, the hand brought to the chest: hidden by the body (the portion goes with it).
  const chest = pose(AT, side === 'F' ? { eF: [36, 106], wF: [52, 100], handF: { angle: 10, type: 'fist' } } : { eN: [88, 106], wN: [72, 100], handN: { angle: 170, type: 'fist' } });
  // Turned to the room, the portion held at the chest in the same hand, then to the mouth.
  const hold = pose(FRONT, side === 'F'
    ? { eF: [30, 104], wF: [48, 100], handF: { angle: -40, type: 'fist' }, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'armF', 'head'] }
    : { eN: [98, 104], wN: [80, 100], handN: { angle: -140, type: 'fist' } });
  const bite = pose(hold, side === 'F'
    ? { eF: [32, 92], wF: [46, 60], handF: { angle: -40, type: 'fist' }, head: [57, 37], tilt: -4, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'] }
    : { eN: [94, 90], wN: [72, 60], handN: { angle: -140, type: 'fist' }, head: [59, 37], tilt: 4, order: ['legF', 'legN', 'neck', 'torso', 'armF', 'head', 'armN'] });
  const chew = nudge(hold, { head: [0, 1.4] });
  // The empty capsule: the hand let go (the hatch stays up on its catch, so the bare compartment
  // shows), a lean to look in, then the small reaction: a shake of the head, a breath in and out.
  const peek = pose(AT, { neck: [left ? 59 : 63, 67], head: [left ? 54 : 66, 41], tilt: left ? -12 : 12 });
  const shake = dir => pose(peek, { tilt: (left ? -12 : 12) + dir * 7 });
  const breathe = nudge(peek, { sF: [0, -2.5], sN: [0, -2.5], neck: [0, -1.5], head: [0, -1.5] });
  const sigh = nudge(peek, { sF: [0, 2.5], sN: [0, 2.5], neck: [0, 1.5], head: [0, 2.5], eF: [0, 1.5], eN: [0, 1.5] });
  return { mirror, side, left, at: AT, front: FRONT, grip, open, reachIn, take, chest, hold, bite, chew, peek, shake, breathe, sigh, closeGrip: open, close: grip };
}

/**
 * Along a path of points ([x, y], or [x, y, depth] where the board layers a figure at another depth
 * than its feet: behind Room B's bench, behind the Command Room's table): its length, and the
 * point, the depth and the segment's direction at a distance d.
 */
function along(points) {
  const legs = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    legs.push({ from: points[i - 1], to: points[i], len, start: total });
    total += len;
  }
  return {
    total,
    at(d) {
      const x = Math.max(0, Math.min(total, d));
      const leg = legs.find(l => x <= l.start + l.len) ?? legs[legs.length - 1];
      const u = leg.len ? (x - leg.start) / leg.len : 1;
      const d0 = leg.from[2] ?? leg.from[1], d1 = leg.to[2] ?? leg.to[1];
      return { pos: [leg.from[0] + (leg.to[0] - leg.from[0]) * u, leg.from[1] + (leg.to[1] - leg.from[1]) * u], depth: d0 + (d1 - d0) * u, right: leg.to[0] > leg.from[0] };
    },
  };
}

const SEATED = /^(consoleBack|laptopStool|benchHunched|floorSit|cotLying|captainTable|slump)/;

/**
 * The kinds of visit: stocked (the full visit: two bites, one after a long walk), brief (one quick
 * bite: for a visitor who waited for the capsule, or the last player of a phase), empty (the
 * capsule found empty). Unknown availability plays no visit.
 */
export const KINDS = Object.freeze(['stocked', 'brief', 'empty']);

/**
 * A visit's whole timeline. place: the scene's slot ({ id, at, scale, gesture, mirror }).
 * capsule: CAPSULES[room]. kind: stocked | empty. start: when it begins (ms). from, fromProps:
 * the skeleton and props the place shows then (its activity's), let go of in the first beat.
 * Returns { start, end, kind, keys, walks, hatch, tray, props }: keys of skeletons with each one's
 * mirror; walks, the stretches where the rig's walk is drawn instead; hatch: how open (0 to 1) at
 * key times; tray: whether a portion is on it; props: what the hands hold from a time on.
 */
export function visitTimeline(place, capsule, { kind = 'stocked', start = 0, from = null, fromProps = null } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`A visit is ${KINDS.join(', ')}, not ${kind}`);
  const rest = skeletonOf(place.gesture);
  const restMirror = Boolean(place.mirror);
  const P = capsulePoses(capsule);
  const home = [place.at[0], place.at[1], place.depth ?? place.at[1]];
  const route = [home, ...(capsule.paths?.[place.id] ?? []), capsule.spot];
  const there = along(route), back = along([...route].reverse());
  const seated = SEATED.test(place.gesture);

  const keys = [], walks = [], hatch = [], tray = [], props = [];
  let t = start;
  const key = (ms, sk, mirror, ease = 'standard', label = null) => { t += ms; keys.push({ at: t, sk, mirror, ease, ...(label ? { label } : {}) }); };
  const lid = open => hatch.push({ at: t, open });
  const hold = what => props.push({ at: t, props: what });
  keys.push({ at: t, sk: from ?? rest, mirror: restMirror });
  hatch.push({ at: t, open: 0 });
  tray.push({ at: t, portion: kind !== 'empty' });
  props.push({ at: t, props: fromProps });
  // What the activity held is let go of at the middle of the first beat, as the rig switches a hand's item.
  props.push({ at: t + BEATS.stop / 2, props: null });

  const walk = (path, getUp, scales) => {
    const ms = Math.max(WALK.min, Math.min(WALK.max, path.total / WALK.speed));
    const halves = Math.max(2, Math.round(ms / WALK.stepMs));
    const first = path.at(0).right, last = path.at(path.total).right;
    key(getUp, walkPose(0), first, 'snap');
    const t0 = t;
    walks.push({ from: t0, to: t0 + ms, path, halves, scales, line: capsule.depth ?? null });
    t += ms;
    keys.push({ at: t, sk: walkPose(halves * 0.5), mirror: last, ease: 'linear', walk: true });
  };

  // Stop, get up, walk to the capsule.
  key(BEATS.stop, rest, restMirror, 'settle', 'The turn ends: the work stops');
  walk(there, seated ? BEATS.rise : BEATS.up, [place.scale, capsule.scale]);
  key(BEATS.arrive, P.at, P.mirror, 'settle', 'At the capsule');

  // Open the hatch: the hand to its handle, then up with it.
  key(BEATS.grip, P.grip, P.mirror);
  lid(0);
  key(BEATS.open, P.open, P.mirror, 'standard', 'The hatch up');
  lid(1);

  let bites = 0;
  if (kind === 'empty') {
    key(BEATS.peek, P.peek, P.mirror);
    key(BEATS.look, P.peek, P.mirror, 'linear', 'Empty');
    key(BEATS.shake, P.shake(-1), P.mirror);
    key(BEATS.shake, P.shake(1), P.mirror, 'standard', 'A shake of the head');
    key(BEATS.shake, P.peek, P.mirror);
    key(BEATS.breathe, P.breathe, P.mirror);
    key(BEATS.sigh, P.sigh, P.mirror, 'settle', 'A breath out');
    key(BEATS.closeGrip, P.closeGrip, P.mirror);
    lid(1);
    key(BEATS.close, P.close, P.mirror);
    lid(0);
    key(BEATS.down, P.at, P.mirror);
  } else if (kind === 'brief') {
    // Brief: the portion taken and the hatch shut at once, one bite turned to the room, and away
    // (the wrapper goes in a pocket): about half the time at the capsule.
    key(BEATS.reachIn, P.reachIn, P.mirror);
    tray.push({ at: t, portion: false });
    hold({ portion: P.side });
    key(BEATS.take, P.take, P.mirror, 'standard', 'A portion taken');
    key(BEATS.closeGrip, P.closeGrip, P.mirror);
    lid(1);
    key(BEATS.close, P.close, P.mirror);
    lid(0);
    key(BEATS.toChest, P.chest, P.mirror);
    hold(null);
    key(BEATS.turn, P.hold, false);
    props.push({ at: t - BEATS.turn / 2, props: { portion: P.side } });
    bites = 1;
    key(BEATS.bite, P.bite, false, 'standard', 'One bite');
    key(BEATS.chew * 0.35, P.chew, false);
    hold(null);
  } else {
    key(BEATS.reachIn, P.reachIn, P.mirror);
    tray.push({ at: t, portion: false });
    hold({ portion: P.side });
    key(BEATS.take, P.take, P.mirror, 'standard', 'A portion taken');
    key(BEATS.toChest, P.chest, P.mirror);
    // From behind the hand at the chest is hidden, and the portion with it, until the turn's middle.
    hold(null);
    key(BEATS.turn, P.hold, false);
    props.push({ at: t - BEATS.turn / 2, props: { portion: P.side } });
    bites = there.total > 300 ? 1 : 2;
    for (let i = 0; i < bites; i += 1) {
      key(BEATS.bite, P.bite, false, 'standard', i === 0 ? 'Turned to the room, a bite' : 'Another bite');
      key(BEATS.chew * 0.45, P.chew, false);
      key(BEATS.chew * 0.55, P.hold, false, 'linear');
    }
    // The last of it: the wrapper in the hand, turned back (hidden from the turn's middle), put in
    // the compartment (seen again as the hand comes out from behind the body) and left there.
    hold({ wrapper: P.side });
    key(BEATS.turn, P.chest, P.mirror);
    props.push({ at: t - BEATS.turn / 2, props: null });
    key(BEATS.put, P.reachIn, P.mirror, 'standard', 'The wrapper back in the tray');
    props.push({ at: t - BEATS.put * 0.6, props: { wrapper: P.side } });
    props.push({ at: t + 60, props: null });
    key(BEATS.closeGrip, P.closeGrip, P.mirror);
    lid(1);
    key(BEATS.close, P.close, P.mirror, 'standard', 'The hatch shut');
    lid(0);
    key(BEATS.down, P.at, P.mirror);
  }

  // Back to the place, and settle into its resting pose; the activity resumes from there.
  walk(back, BEATS.up, [capsule.scale, place.scale]);
  key(seated ? BEATS.settle + 120 : BEATS.settle, rest, restMirror, 'settle', 'Home: the work starts again');
  props.sort((a, b) => a.at - b.at);
  // At the capsule: from the end of the walk there to the start of the walk back (its getting up).
  const atCapsule = [walks[0].to, walks[1].from - BEATS.up];
  return { start, end: t, kind, bites, keys, walks, hatch, tray, props, atCapsule, place: place.id, home: { at: place.at, scale: place.scale, depth: place.depth ?? place.at[1] } };
}

/** A visit's storyboard: its labelled beats and the middle of each walk, in time order: [{ at, label }]. */
export function storyboard(visit) {
  const beats = visit.keys.filter(k => k.label).map(k => ({ at: k.at, label: k.label }));
  const [there, back] = visit.walks;
  beats.push({ at: (there.from + there.to) / 2, label: 'Across the room (the place is still theirs)' });
  beats.push({ at: (back.from + back.to) / 2, label: 'Back across' });
  return beats.sort((a, b) => a.at - b.at);
}

const lastAt = (list, t) => { let v = list[0]; for (const item of list) { if (item.at > t) break; v = item; } return v; };

/**
 * A visit at time t: { sk, pos, scale, mirror, open, portion, props }. pos and scale: where the
 * figure stands in the room and how big; open: the hatch, 0 to 1; portion: whether the tray holds
 * one; props: what the hands hold.
 */
export function visitAt(visit, t) {
  const walking = visit.walks.find(w => t >= w.from && t < w.to);
  let sk, mirror, pos, scale, depth;
  if (walking) {
    const u = (t - walking.from) / (walking.to - walking.from);
    const here = walking.path.at(u * walking.path.total);
    sk = walkPose(u * walking.halves * 0.5);
    mirror = here.right;
    pos = here.pos;
    depth = here.depth;
    // The room's depth line between, the place's and the spot's own scales kept exactly at the ends.
    const [s0, s1] = walking.scales;
    if (walking.line) {
      const line = y => depthScale(y, walking.line);
      const a = walking.path.at(0).pos[1], b = walking.path.at(walking.path.total).pos[1];
      scale = line(pos[1]) + (s0 - line(a)) * (1 - u) + (s1 - line(b)) * u;
    } else {
      scale = s0 + (s1 - s0) * u;
    }
  } else {
    const keys = visit.keys;
    let i = keys.findIndex(k => k.at >= t);
    if (i <= 0) {
      const k = i === 0 ? keys[0] : keys[keys.length - 1];
      sk = k.sk; mirror = k.mirror;
    } else {
      const a = keys[i - 1], b = keys[i];
      const u = (EASE[b.ease ?? 'standard'])((t - a.at) / Math.max(1, b.at - a.at));
      sk = blend(a.sk, b.sk, u);
      mirror = u < 0.5 ? a.mirror : b.mirror;
    }
    const done = visit.walks.filter(w => t >= w.to).length;
    const atCapsule = done === 1;
    const end = visit.walks[0].path.at(visit.walks[0].path.total);
    pos = atCapsule ? end.pos : visit.home.at;
    depth = atCapsule ? end.depth : visit.home.depth;
    scale = atCapsule ? visit.walks[0].scales[1] : visit.home.scale;
  }
  // The hatch follows the hand: eased as the hand is.
  let open = visit.hatch[0].open;
  for (let i = 1; i < visit.hatch.length; i += 1) {
    const a = visit.hatch[i - 1], b = visit.hatch[i];
    if (t >= b.at) { open = b.open; continue; }
    if (t > a.at && a.open !== b.open) open = a.open + (b.open - a.open) * EASE.standard((t - a.at) / Math.max(1, b.at - a.at));
    break;
  }
  return { sk, pos, scale, mirror, depth, open, portion: lastAt(visit.tray, t).portion, props: lastAt(visit.props, t).props ?? {} };
}

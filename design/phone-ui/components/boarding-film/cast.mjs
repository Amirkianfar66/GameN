// The boarding film's cast: runtime source, Designer's. The approved crew drawing (crew-drawing-1.0.0), unchanged:
// every figure here is drawn by the crew's own drawing from a skeleton, as the rooms' figures are. What is new is the
// acting (the skeletons a film asks for) and how a figure reaches the screen: its body is drawn once for each pose and
// its head once for each look, as pictures in memory, already lit, and a frame only places them.
//
// A head is its own picture because it is the heaviest part of the drawing and the part that acts: it bobs a beat
// behind the body, turns, lifts to a light and blinks, without the body being drawn again. Light is the films' own
// recipe (the hosted kit's cast.mjs: the dark a figure stands in, a light that lands on it, an edge of light), put on
// when a picture is drawn, never while the film runs: a figure whose light changes is two pictures, one over the other.

import { CREW, crewMember } from '../../../../apps/game/hosted/crew-drawing/crew.mjs';
import { CREW_HEAD_SCALE, drawCrewFigure } from '../../../../apps/game/hosted/crew-drawing/figure.mjs';
import { crewHead } from '../../../../apps/game/hosted/crew-drawing/head.mjs';
import { inkCanvas } from '../../../../apps/game/hosted/crew-drawing/ink.mjs';
import { clamp01, f, f3, lerp } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { FRAME } from '../../../../apps/game/hosted/scene-drawing/body.mjs';
import { STAND, skeletonOf } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { sprite } from './engine.mjs';

export const ANCHOR = FRAME.anchor; // a figure's place on the floor, in its own frame: [62, 233]
const THIGH = 49, SHIN = 39, FLOOR = 215; // an ankle's height when its boot is on the floor
const TAU = Math.PI * 2;
const wrap = v => ((v % 1) + 1) % 1;

/** A knee for a hip and an ankle, bent toward `dir` (−1 left, 1 right): the rig's two-bone leg. */
function knee(hip, ankle, dir) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], full = Math.hypot(dx, dy) || 1;
  const d = Math.min(full, THIGH + SHIN - 0.5);
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d), h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  const ux = dx / full, uy = dy / full, mx = hip[0] + ux * a, my = hip[1] + uy * a;
  const k1 = [mx - uy * h, my + ux * h], k2 = [mx + uy * h, my - ux * h];
  return (k1[0] - k2[0]) * dir > 0 ? k1 : k2;
}

/**
 * A walk to the left at `phase` 0..1 of two steps, with weight: a stride a figure this size takes, the body lowest as
 * both feet are down and highest as a leg passes, the arms opposite the legs and a little late, the shoulders turning
 * against the hips. `slope` tilts the ground (0.5: the ship's ramp, rising to the left): the leading foot lands higher
 * and the body leans into the climb.
 */
export function stridePose(phase, { reach = 25, lift = 12, slope = 0, lean = 4, swing = 22, bob = 3.4 } = {}) {
  const p = wrap(phase);
  const ground = x => FLOOR + (x - 62) * slope;
  const foot = q => {
    const u = wrap(q);
    if (u < 0.5) { // on the ground, carried back under the body; the heel leaves it at the end
      const x = 62 - reach + (u / 0.5) * 2 * reach, off = clamp01((u - 0.36) / 0.14);
      return { at: [x, ground(x) - 7 * off * off], pitch: -24 * off };
    }
    const s = (u - 0.5) / 0.5, x = 62 + reach - s * 2 * reach; // through the air, forward
    return { at: [x, ground(x) - lift * Math.sin(Math.PI * s) - 2 * (1 - s)], pitch: lerp(-24, 12, s) };
  };
  // The pelvis sits where the leading leg can reach its foot, and rises as a leg passes under it.
  const lead = ground(62 - reach), low = lead - Math.sqrt(Math.max(1, (THIGH + SHIN - 2) ** 2 - reach * reach)) - 2;
  const pelvis = [62 - slope * 3, low - bob * (1 - Math.cos(2 * TAU * p)) / 2];
  const tip = lean + slope * 7;
  const neck = [pelvis[0] - tip, pelvis[1] - 59 + slope * 2];
  const far = foot(p), near = foot(p + 0.5);
  const hipF = [pelvis[0] - 8, pelvis[1] + 2], hipN = [pelvis[0] + 8, pelvis[1] + 2];
  const beat = Math.cos(TAU * (p - 0.045)); // 1: the far leg leads, so the far arm is back
  const twist = 2.2 * beat;
  const sF = [neck[0] - 21 + twist, neck[1] + 9], sN = [neck[0] + 23 + twist * 0.6, neck[1] + 8];
  const arm = (s, a, bend) => {
    const e = [s[0] + Math.sin(a) * 31, s[1] + Math.cos(a) * 31];
    return [e, [e[0] + Math.sin(a + bend) * 27, e[1] + Math.cos(a + bend) * 27]];
  };
  const rad = swing * Math.PI / 180;
  // An arm swings back straighter and comes forward bent.
  const [eF, wF] = arm(sF, rad * beat, -0.22 - 0.42 * clamp01(-beat));
  const [eN, wN] = arm(sN, -rad * beat, -0.22 - 0.42 * clamp01(beat));
  return {
    head: [neck[0] - 4, neck[1] - 28], tilt: 0, view: 'front',
    neck, pelvis, sF, eF, wF, sN, eN, wN,
    handF: { angle: 96 }, handN: { angle: 96 },
    hipF, kF: knee(hipF, far.at, -1), aF: far.at, footF: { dir: -1, angle: far.pitch },
    hipN, kN: knee(hipN, near.at, -1), aN: near.at, footN: { dir: -1, angle: near.pitch },
    order: ['legF', 'armF', 'legN', 'neck', 'torso', 'armN', 'head'],
  };
}

/**
 * A climb away from us, seen from behind, at `phase` 0..1 of two steps: the weight goes over the standing leg, the
 * other knee comes up (a leg coming toward the far side is drawn shorter), the hips and shoulders tip against each
 * other and the arms swing a little.
 */
export function climbPose(phase, { lift = 13, sway = 3.2 } = {}) {
  const p = wrap(phase);
  // Each leg: on the ground for half the cycle, lifted for the other half.
  const up = q => { const u = wrap(q); return u < 0.5 ? 0 : Math.sin(Math.PI * (u - 0.5) / 0.5); };
  const liftF = up(p), liftN = up(p + 0.5);
  const side = Math.sin(TAU * p); // 1: the weight over the far (left) leg
  const rise = 2.4 * Math.abs(Math.sin(TAU * p));
  const pelvis = [62 - sway * side, 124 - rise];
  const neck = [61 - sway * 0.45 * side, pelvis[1] - 60];
  const tipS = 1.6 * side; // the shoulders dip toward the standing leg; the hips the other way
  const sF = [neck[0] - 22, neck[1] + 9 + tipS], sN = [neck[0] + 23, neck[1] + 8 - tipS];
  const hipF = [pelvis[0] - 9, pelvis[1] + 2 - tipS * 0.8], hipN = [pelvis[0] + 9, pelvis[1] + 2 + tipS * 0.8];
  const leg = (hip, x, l, out) => {
    const a = [x + out * 2 * l, FLOOR - lift * l], k = [lerp(hip[0], a[0], 0.52) + out * (1.5 + 5 * l), lerp(hip[1], a[1], 0.56) - 5 * l];
    return [k, a];
  };
  const [kF, aF] = leg(hipF, 47, liftF, -1), [kN, aN] = leg(hipN, 78, liftN, 1);
  // An arm swinging toward the far side shortens; coming back it hangs long.
  const arm = (s, out, f) => [[s[0] + out * 7, s[1] + 31 - 3 * f], [s[0] + out * (6 + 2 * f), s[1] + 58 - 9 * f]];
  const [eF, wF] = arm(sF, -1, liftN), [eN, wN] = arm(sN, 1, liftF);
  return {
    back: true, view: 'back', head: [neck[0] - 2, neck[1] - 28], tilt: -1.5 * side,
    neck, pelvis, sF, eF, wF, sN, eN, wN,
    handF: { angle: 95 }, handN: { angle: 85 },
    hipF, kF, aF, footF: { dir: -1, angle: liftF > 0.05 ? 24 * liftF : 0 },
    hipN, kN, aN, footN: { dir: 1, angle: liftN > 0.05 ? 24 * liftN : 0 },
    order: ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'],
  };
}

/** Standing, seen from behind, the arms down. `turn` −1..1 shifts the weight to one leg. */
export function backPose(turn = 0) {
  return {
    back: true, view: 'back', head: [59 - turn, 36], tilt: 2 * turn,
    neck: [61, 64], pelvis: [62 + turn, 124],
    sF: [39, 73 + turn], eF: [32, 104], wF: [31, 131], handF: { angle: 95 },
    sN: [84, 72 - turn], eN: [91, 103], wN: [92, 130], handN: { angle: 85 },
    hipF: [53, 126], kF: [49, 175], aF: [46, 214], footF: { dir: -1 },
    hipN: [71, 126], kN: [76, 175], aN: [79, 215], footN: { dir: 1 },
    order: ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'],
  };
}

/** The approved standing poses a film may hold: the head is always drawn last, so it can act. */
export const HELD = Object.freeze({
  stand: Object.freeze({ ...STAND }),
  folded: Object.freeze({ ...skeletonOf('standFolded') }),
  ease: Object.freeze({ ...STAND, eN: [92, 103], wN: [93, 130], handN: { angle: 85 }, order: ['armF', 'legF', 'legN', 'neck', 'torso', 'armN', 'head'] }),
});

// ── Pictures ─────────────────────────────────────────────────────────

const BODY_JOINTS = ['neck', 'pelvis', 'sF', 'eF', 'wF', 'sN', 'eN', 'wN', 'hipF', 'kF', 'aF', 'hipN', 'kN', 'aN'];
const PART_JOINTS = Object.freeze({ armF: ['sF', 'eF', 'wF'], armN: ['sN', 'eN', 'wN'], trunk: ['neck', 'pelvis', 'sF', 'sN', 'hipF', 'hipN'] });
const PART_NAMES = ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'prop'];

/**
 * How far the crew's ink reaches past a drawing's joints, in the figure's units: measured over the nine and every
 * pose the film asks for, with a margin. The film's check holds every picture to its box (no ink on a picture's edge).
 */
const REACH = Object.freeze({
  body: { left: 19, right: 20, up: 26, down: 27 },
  arm: { left: 13, right: 20, up: 16, down: 19 },
  trunk: { left: 15, right: 17, up: 26, down: 14 },
});
function boxOf(sk, joints, { left, right, up, down }) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const name of joints) { const [x, y] = sk[name]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [Math.floor(x0 - left), Math.floor(y0 - up), Math.ceil(x1 - x0 + left + right), Math.ceil(y1 - y0 + up + down)];
}
/** A whole body's box (without its head), in the figure's frame. */
export const bodyBox = sk => boxOf(sk, BODY_JOINTS, REACH.body);
/** The box of one part: an arm (`armF`, `armN`), or the trunk (the torso and neck, without arms or legs). */
export const partBox = (sk, part) => (part === 'trunk' ? boxOf(sk, PART_JOINTS.trunk, REACH.trunk) : boxOf(sk, PART_JOINTS[part], REACH.arm));

// ── Light, put on when a picture is drawn ────────────────────────────

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);

/**
 * A look: the light a figure's picture is drawn in. `ambient` { color, strength 0..1 }: the dark it stands in.
 * `key` { at: [x, y] in the figure's frame, z, color, gain, relief }: a light landing on it. `rims`: each { dx, dy
 * (toward the light), color, width, gain }: an edge of light. `back` { color, width, gain, side, under, reach, fade:
 * [y0, y1] }: a light behind the figure (backFilter), whole to y0 and gone by y1. `flood`: one colour, the figure's
 * shape alone.
 */
export const LOOKS = Object.freeze({
  // Walking in at dusk: the doorway ahead on the left, the sunset behind on the right (version 1's light).
  dusk: { ambient: { color: '#3A2D52', strength: 0.74 }, key: { at: [-420, -150], z: 150, color: '#FFD49A', gain: 2.1 }, rims: [{ dx: 0.85, dy: -0.4, color: '#FFB37A', width: 2.6, gain: 0.85 }] },
  // Seen from behind against the doorway: a dark shape, the light round its edges.
  backlit: { ambient: { color: '#1C1838', strength: 0.92 }, key: { at: [62, -260], z: 90, color: '#FFD9A0', gain: 0.9 }, rims: [{ dx: 0.9, dy: -0.45, color: '#FFD49A', width: 2.8, gain: 0.95 }, { dx: -0.9, dy: -0.45, color: '#FFD49A', width: 2.8, gain: 0.95 }] },
  // Looking back from the sill: the doorway behind the head, the dusk on the face.
  lookback: { ambient: { color: '#3A2D52', strength: 0.6 }, key: { at: [-260, 60], z: 160, color: '#F2A86A', gain: 1.5 }, rims: [{ dx: 0.9, dy: -0.45, color: '#FFD49A', width: 2.8, gain: 0.95 }, { dx: -0.9, dy: -0.45, color: '#FFD49A', width: 2.8, gain: 0.95 }] },
  // Climbing beside the lens: far from the entrance, then in its light.
  climbFar: { ambient: { color: '#3E2F4E', strength: 0.6 }, key: { at: [-520, -40], z: 200, color: '#FFD49A', gain: 0.8 }, rims: [{ dx: 0.9, dy: -0.35, color: '#FF9E5E', width: 2.6, gain: 0.9 }] },
  climbNear: { ambient: { color: '#5A3E4E', strength: 0.4 }, key: { at: [-300, 10], z: 170, color: '#FFDDB4', gain: 1.0 }, rims: [{ dx: 0.9, dy: -0.35, color: '#FF9E5E', width: 2.6, gain: 0.9 }] },
  // Inside, in the dark: the entrance behind the crew is the only light. It catches the tops of the heads, the
  // shoulders and the outer edges of the arms, thinly, and is gone by the knees. Then under the ceiling lights.
  dark: { ambient: { color: '#141B33', strength: 0.9 }, back: { color: '#FFB257', width: 1.15, gain: 1, side: 0.8, under: 2.5, reach: [3, 6, 10, 14, 19, 24, 30], fade: [70, 166] } },
  lit: { ambient: { color: '#1E2740', strength: 0.4 }, key: { at: [62, -240], z: 210, color: '#E6F0FF', gain: 1.25 }, rims: [{ dx: 0, dy: -1, color: '#FFB257', width: 2.2, gain: 0.5 }] },
});

/**
 * A look as an SVG filter over `box` (the units of what it lights): the kit's recipe. `scale` is the drawing's units
 * for one of the figure's (a head is drawn in its own frame, CREW_HEAD_SCALE smaller), and `origin` where the figure's
 * frame begins in it.
 */
function lookFilter(id, look, box, { scale = 1, origin = [0, 0] } = {}) {
  const [x, y, w, h] = box;
  let fx = '', current = 'SourceGraphic';
  if (look.flood) {
    fx += `<feFlood flood-color="${look.flood}" result="sil"/><feComposite in="sil" in2="SourceAlpha" operator="in" result="base"/>`;
    current = 'base';
  } else if (look.ambient) {
    const [r, g, b] = hex(look.ambient.color), s = look.ambient.strength ?? 0.6, k = c => f3(1 - s + s * c);
    fx += `<feColorMatrix in="SourceGraphic" type="matrix" values="${k(r)} 0 0 0 0  0 ${k(g)} 0 0 0  0 0 ${k(b)} 0 0  0 0 0 1 0" result="base"/>`;
    current = 'base';
  }
  if (look.key && !look.flood) {
    const { at, z = 120, color, gain = 1.4, relief = 1.1 } = look.key;
    fx += `<feDiffuseLighting in="SourceAlpha" surfaceScale="${f3(relief / scale)}" diffuseConstant="1" lighting-color="${color}" result="keyL"><fePointLight x="${f((at[0] - origin[0]) / scale)}" y="${f((at[1] - origin[1]) / scale)}" z="${f(z / scale)}"/></feDiffuseLighting>`
      + '<feComposite in="keyL" in2="SourceAlpha" operator="in" result="keyIn"/>'
      + `<feComposite in="${current}" in2="keyIn" operator="arithmetic" k1="${f3(gain)}" k2="1" k3="0" k4="0" result="lit"/>`;
    current = 'lit';
  }
  (look.rims ?? []).forEach((rim, i) => {
    const wpx = (rim.width ?? 2.4) / scale;
    fx += `<feOffset in="SourceAlpha" dx="${f(-rim.dx * wpx)}" dy="${f(-rim.dy * wpx)}" result="away${i}"/>`
      + `<feComposite in="SourceAlpha" in2="away${i}" operator="out" result="edge${i}"/>`
      + `<feGaussianBlur in="edge${i}" stdDeviation="${f(Math.max(0.3, wpx * 0.2))}" result="soft${i}"/>`
      + `<feFlood flood-color="${rim.color}"/><feComposite in2="soft${i}" operator="in" result="rimC${i}"/>`
      + `<feComposite in="rimC${i}" in2="${current}" operator="arithmetic" k1="0" k2="${f3(rim.gain ?? 0.9)}" k3="1" k4="0" result="rimmed${i}"/>`
      // An edge of light never widens the figure: it is cut to the figure's own shape.
      + `<feComposite in="rimmed${i}" in2="SourceAlpha" operator="in" result="cut${i}"/>`;
    current = `cut${i}`;
  });
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB">${fx}</filter>`;
}

/**
 * A light behind a figure, as an SVG filter that gives the light alone: a thin edge on the figure's outline where it
 * faces up, left or right with nothing of the figure beyond it.
 * - `reach` is how far "beyond" is looked for, in the figure's units: an edge that faces another part of the figure
 *   (the inside of a leg, a side behind an arm) is not an outline and takes no light.
 * - An edge to the side takes `side` of the light an edge on top takes, and none where the figure ends within `under`
 *   below it: the light comes from above, so the underside of a sleeve, a chin or a boot stays dark.
 * - The light never widens the figure.
 */
function backFilter(id, back, box, { scale = 1 } = {}) {
  const [x, y, w, h] = box, width = back.width / scale;
  const beyond = [back.width, ...back.reach].map(d => d / scale);
  let fx = '';
  // Each side: the figure moved away from the light by each distance; where none of those covers it, it is an outer edge.
  for (const [name, ux, uy] of [['l', 1, 0], ['r', -1, 0], ['t', 0, 1]]) {
    beyond.forEach((d, i) => { fx += `<feOffset in="SourceAlpha" dx="${f(ux * d)}" dy="${f(uy * d)}" result="${name}${i}"/>`; });
    fx += `<feMerge result="${name}s">${beyond.map((_, i) => `<feMergeNode in="${name}${i}"/>`).join('')}</feMerge>`
      + `<feComposite in="SourceAlpha" in2="${name}s" operator="out" result="${name}"/>`;
  }
  fx += `<feOffset in="SourceAlpha" dy="${f(-(back.under ?? 2.5) / scale)}" result="on"/>`
    + '<feMerge result="lr"><feMergeNode in="l"/><feMergeNode in="r"/></feMerge><feComposite in="lr" in2="on" operator="in" result="sides"/>'
    + `<feComposite in="sides" in2="sides" operator="arithmetic" k1="0" k2="${f3(back.side ?? 1)}" k3="0" k4="0" result="dim"/>`
    + '<feMerge result="edges"><feMergeNode in="dim"/><feMergeNode in="t"/></feMerge>'
    + `<feGaussianBlur in="edges" stdDeviation="${f(Math.max(0.25, width * 0.22))}" result="soft"/>`
    + `<feFlood flood-color="${back.color}" flood-opacity="${f3(back.gain ?? 1)}"/><feComposite in2="soft" operator="in" result="light"/>`
    + '<feComposite in="light" in2="SourceAlpha" operator="in"/>';
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB">${fx}</filter>`;
}

/** A drawing in a look. A light behind it is its own layer over the lit figure, falling away down the body. */
function lit(inner, look, box, frame = {}) {
  if (!look) return inner;
  const base = lookFilter('bf-look', look, box, frame);
  if (!look.back) return `${base}<g filter="url(#bf-look)">${inner}</g>`;
  const [x, y, w, h] = box, rect = `x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"`;
  const [y0, y1] = look.back.fade.map(v => (v - (frame.origin?.[1] ?? 0)) / (frame.scale ?? 1));
  return base + backFilter('bf-back', look.back, box, frame)
    + `<linearGradient id="bf-fall" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y0)}" x2="0" y2="${f(y1)}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`
    + `<mask id="bf-fade" maskUnits="userSpaceOnUse" ${rect}><rect ${rect} fill="url(#bf-fall)"/></mask>`
    + `<g filter="url(#bf-look)"><g id="bf-figure">${inner}</g></g>`
    + '<g mask="url(#bf-fade)"><g filter="url(#bf-back)"><use href="#bf-figure"/></g></g>';
}

/**
 * A crew member's body in a pose, without its head: SVG markup in the figure's frame, in `box`. `only` draws some
 * parts alone: `['armF']`, `['armN']`, or `['neck', 'torso']` (so an arm can swing, and legs out of the frame are not
 * drawn). `look`: its light (LOOKS).
 */
export function bodyArt(character, sk, { only = null, look = null, box = null } = {}) {
  const cv = inkCanvas('bf-b');
  const parts = { head: () => {} };
  if (only) for (const name of PART_NAMES) if (!only.includes(name)) parts[name] = () => {};
  drawCrewFigure(cv, crewMember(CREW[character] ?? character), sk, {}, { parts, shadow: false });
  return `<defs>${cv.defs()}</defs>${lit(cv.layer('body'), look, box ?? bodyBox(sk))}`;
}

/** Where a head sits in a standing figure's frame: the frame a head's light is given in. */
const HEAD_AT = Object.freeze([58, 36]);

/** A crew member's head in its own frame (its joint at the origin): `view` front, down or back; `blink` 0..1. */
export function headArt(character, view = 'front', blink = 0, { look = null, box = null } = {}) {
  const cv = inkCanvas('bf-h');
  crewHead(cv, crewMember(CREW[character] ?? character), view, { blink, sway: 0, lift: 0 });
  return `<defs>${cv.defs()}</defs>${lit(cv.layer('body'), look, box ?? headBox(character, view), { scale: CREW_HEAD_SCALE, origin: HEAD_AT })}`;
}

/**
 * The box each head's ink lies in, in the head's own frame: [x0, y0, x1, y1], measured from the approved drawing
 * (front covers its blink; looking down is the front's). The film's check holds every head to its box.
 */
const HEAD_INK = Object.freeze({
  c1: { front: [-16.75, -34.5, 42.5, 18], back: [-22.75, -34.75, 23.5, 13.25] },
  c2: { front: [-15.5, -27.5, 35, 25], back: [-19, -28.75, 20.25, 16.25] },
  c3: { front: [-17.75, -35.5, 37, 17.5], back: [-16.25, -35, 17, 16.25] },
  c4: { front: [-12.75, -25.5, 34.5, 18], back: [-16.25, -27.25, 17, 17] },
  c5: { front: [-17.5, -21, 35.75, 23.75], back: [-25.75, -21.5, 27, 13.75] },
  c6: { front: [-16.75, -29, 41.5, 17.75], back: [-19.75, -30, 21.25, 19] },
  c7: { front: [-15.75, -26.5, 33.5, 18], back: [-19, -27, 21, 16.25] },
  c8: { front: [-19.5, -29.25, 43.25, 36], back: [-20.25, -29.5, 26.5, 37.5] },
  c9: { front: [-12.5, -22.25, 41, 24.5], back: [-16.5, -23.25, 17.5, 32.25] },
});
/** A head's box, with a little room: [x, y, w, h] in the head's frame. */
export function headBox(character, view) {
  const id = crewMember(CREW[character] ?? character).id, [x0, y0, x1, y1] = HEAD_INK[id][view === 'back' ? 'back' : 'front'];
  return [Math.floor(x0 - 2), Math.floor(y0 - 2), Math.ceil(x1 - x0 + 4), Math.ceil(y1 - y0 + 4)];
}

/** A body's picture in a look: `px` pixels a unit of the figure's frame. */
export function bodySprite(doc, character, sk, px, look = null) {
  const rect = bodyBox(sk);
  return sprite(doc, { rect, px, inner: bodyArt(character, sk, { look, box: rect }) });
}

/** One part's picture: `armF`, `armN` or `trunk`. */
export function partSprite(doc, character, sk, part, px, look = null) {
  const rect = partBox(sk, part);
  return sprite(doc, { rect, px, inner: bodyArt(character, sk, { only: part === 'trunk' ? ['neck', 'torso'] : [part], look, box: rect }) });
}

/** A head's picture in a look: `px` pixels a unit of the figure's frame (a head is drawn CREW_HEAD_SCALE larger than its own). */
export function headSprite(doc, character, view, blink, px, look = null) {
  const rect = headBox(character, view);
  return sprite(doc, { rect, px: px * CREW_HEAD_SCALE, inner: headArt(character, view, blink, { look, box: rect }) });
}

// ── A figure on the screen ───────────────────────────────────────────

/**
 * Places figures. A figure is layers drawn in order: each { s: picture, to: the same picture in another light, origin:
 * where the picture's own (0, 0) lies in the figure's frame, pivot: the joint it turns about, rotate: degrees, scale,
 * dx, dy }. `mix` 0..1 is how far the light has gone from each layer's `s` to its `to`.
 */
export function createCaster(doc) {
  const work = doc.createElement('canvas'), rx = work.getContext('2d');
  let size = [0, 0];
  const fit = (w, h) => { if (w > size[0] || h > size[1]) { size = [Math.max(size[0], w), Math.max(size[1], h)]; work.width = size[0]; work.height = size[1]; } };

  /** The layers of a plain figure: its body, then its head with whatever the head is doing. */
  const layersOf = ({ body, bodyTo = null, head, headTo = null, sk }, act) => [
    { s: body, to: bodyTo },
    head && { s: head, to: headTo, origin: sk.head, pivot: sk.head, rotate: (sk.tilt ?? 0) + (act?.tilt ?? 0), scale: CREW_HEAD_SCALE, dx: act?.dx ?? 0, dy: act?.dy ?? 0 },
  ].filter(Boolean);

  /**
   * `figure`: { body, head, sk } (and `bodyTo`, `headTo` for a second light), or { layers }. `at`: where the figure's
   * floor anchor stands on the screen, px. `k`: px a unit of the figure's frame. `flip`: turned to face right. `head`:
   * { dx, dy, tilt } more on a plain figure's head, in the figure's units and degrees. `mix`, `alpha`.
   */
  function figure(ctx, given, { at, k, flip = false, head: act = null, mix = 0, alpha = 1 }) {
    const layers = given.layers ?? (given.body || given.bodyTo ? layersOf(given, act) : []);
    if (!layers.length || alpha <= 0) return;
    const dir = flip ? -1 : 1, tx = at[0] - dir * ANCHOR[0] * k, ty = at[1] - ANCHOR[1] * k;
    for (const layer of layers) {
      const from = layer.s ?? layer.to;
      if (!from) continue;
      const [ox, oy] = layer.origin ?? [0, 0], [px, py] = layer.pivot ?? [ox, oy], r = (layer.rotate ?? 0) * Math.PI / 180, sc = layer.scale ?? 1;
      const cos = Math.cos(r) * sc, sin = Math.sin(r) * sc, mx = px + (layer.dx ?? 0), my = py + (layer.dy ?? 0), lx = ox - px, ly = oy - py;
      ctx.setTransform(dir * k * cos, k * sin, -dir * k * sin, k * cos, tx + dir * k * (mx + cos * lx - sin * ly), ty + k * (my + sin * lx + cos * ly));
      const both = layer.s && layer.to && mix > 0.002;
      if (!both || mix < 0.998) { ctx.globalAlpha = alpha; ctx.drawImage(from.canvas, from.x, from.y, from.w, from.h); }
      if (both) { ctx.globalAlpha = alpha * (mix >= 0.998 ? 1 : mix); ctx.drawImage(layer.to.canvas, layer.to.x, layer.to.y, layer.to.w, layer.to.h); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  /**
   * A figure's shadow thrown along the ground: its shape, dark, laid down from its feet. `skew` leans it (px a px of
   * height) and `length` is its height as a share of the figure's: more than 0 it falls toward the lens (the light is
   * beyond the figure), less than 0 away from it. Drawn small: a shadow's edge is soft.
   */
  function shadow(ctx, { body, head, sk }, { at, k, flip = false, skew = 0, length = 0.5, color = '#05040A', alpha = 0.5 }) {
    if (!body || alpha <= 0) return;
    const low = Math.min(k, Math.max(0.2, 0.28 * k));
    const bx0 = body.x - 10, by0 = Math.min(body.y, sk.head[1] - 60), bw = body.w + 20, bh = ANCHOR[1] - by0;
    const w = Math.ceil(bw * low) + 2, h = Math.ceil(bh * low) + 2;
    fit(w, h);
    rx.globalCompositeOperation = 'source-over'; rx.globalAlpha = 1;
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.clearRect(0, 0, w, h);
    rx.setTransform(low, 0, 0, low, -bx0 * low + 1, -by0 * low + 1);
    rx.drawImage(body.canvas, body.x, body.y, body.w, body.h);
    if (head) { rx.translate(sk.head[0], sk.head[1]); rx.scale(CREW_HEAD_SCALE, CREW_HEAD_SCALE); rx.drawImage(head.canvas, head.x, head.y, head.w, head.h); }
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.globalCompositeOperation = 'source-in';
    rx.fillStyle = color; rx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = alpha;
    // The figure's foot stays where it stands; its height is laid down and leaned.
    const dir = flip ? -1 : 1, s = k / low;
    ctx.transform(dir * s, 0, skew * s, -length * s, at[0], at[1]);
    ctx.drawImage(work, 0, 0, w, h, -(ANCHOR[0] - bx0) * low - 1, -(bh * low) - 1, w, h);
    ctx.restore();
  }

  return { figure, shadow, dispose() { work.width = 0; work.height = 0; } };
}

export { CREW_HEAD_SCALE };

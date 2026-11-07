// mothership:dev-only
//
// The boarding's character layer (issue #188: "environment animation plus composited character
// layers"): where each member of the public roster is, in what pose and light, at a moment of the
// film, and the figures drawn by the approved rig (design/board-motion/figures). The environment
// (world.mjs) never draws a figure and this layer never draws the world.
// A member is placed by its index in seat order alone (roster.mjs): every match of a size shares
// one schedule, whoever holds which role. Everyone walks the same way, looks up at the ship at the
// same place, stands in the same family of poses and takes the light of the place they stand in;
// nobody is lit, framed, posed or ordered apart.

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { walkPose } from '../../../board-motion/figures/motion.mjs';
import { clamp01, easeInCubic, easeInOutCubic, lerp, rand } from '../../lib/ease.mjs';
import { figureItems } from '../../lib/scene.mjs';
import { CLIMB_MS, GROUND, PACE, RAMP, STEP_IN_MS, STRIDE, WALK_CYCLE_MS, pairAt } from './film.mjs';
import { figureHeightAt, floorDepth, lightAt } from './world.mjs';

const f = v => Number((+v).toFixed(2));
/** A standing figure's height in its own frame (the rig's head top to its floor). */
export const FIGURE_HEIGHT = 216;

/**
 * The two lanes a pair walks in: far (index 0, nearer the ship) and near. On the ground a lane is a
 * line at `ground` (y) and the figure's scale there; on the ramp, an offset below its far edge.
 * The near member walks a step ahead of the far one.
 */
export const LANES = Object.freeze([
  Object.freeze({ ground: 664, groundScale: 0.53, ramp: 3, rampScale: 0.515, lead: 0 }),
  Object.freeze({ ground: 686, groundScale: 0.57, ramp: 11, rampScale: 0.535, lead: 110 }),
]);
/** How far before the ramp's foot a pair begins to close on it, and to look up at the ship (world units). */
const CONVERGE = 140, LOOK = 110;

/** When member i of n reaches the ramp's foot: its pair's time, the near member a step ahead, and a small fixed variation. */
export function footAt(i, n) {
  const pairs = Math.ceil(n / 2);
  return pairAt(Math.floor(i / 2), pairs) - LANES[i % 2].lead + (rand(173, n, i) - 0.5) * 80;
}

/** The rig's leg lengths (board-motion/figures/motion.mjs), for re-solving a knee. */
const THIGH = 49, SHIN = 39, BOARD_STRIDE = 17;
/** A knee for a hip and an ankle, bent toward dir: the rig's own solution (motion.mjs knee()). */
function knee(hip, ankle, dir) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.5);
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const mx = hip[0] + ux * a, my = hip[1] + uy * a;
  const k1 = [mx - uy * h, my + ux * h], k2 = [mx + uy * h, my - ux * h];
  return (k1[0] - k2[0]) * dir > 0 ? k1 : k2;
}

/**
 * The boarding's walk at phase 0..1: the rig's walk (walkPose, unchanged) with a longer stride,
 * STRIDE for the board's 17, for a crew covering ground. A foot's reach either side of the hips is
 * in proportion to the stride and nothing else in the pose depends on it, so the feet are carried
 * out in that proportion and the knees solved again; the lift, bob and arm swing are the rig's.
 */
export function boardingWalk(phase) {
  const sk = walkPose(phase);
  const out = (ankle) => [62 + ((ankle[0] - 62) * STRIDE) / BOARD_STRIDE, ankle[1]];
  const aF = out(sk.aF), aN = out(sk.aN);
  return { ...sk, aF, aN, kF: knee(sk.hipF, aF, -1), kN: knee(sk.hipN, aN, -1) };
}

/**
 * Member i of n outside at moment `at`: { i, state: ground | ramp | door, x, y (its feet, world),
 * scale, sk, mirror, light 0..1, opacity, z } or null once aboard. Walking right: the rig walks
 * left, so every walker is mirrored.
 */
export function memberOutside(i, n, at) {
  const lane = LANES[i % 2], T = footAt(i, n);
  const cycle = (at / WALK_CYCLE_MS + rand(179, n, i)) % 1;
  let sk = boardingWalk(cycle);
  let state, x, y, scale, light, opacity = 1, look = 1;
  if (at < T) {
    const d = (T - at) * PACE;
    const v = easeInOutCubic(clamp01(1 - d / CONVERGE));
    state = 'ground'; x = RAMP.foot[0] - d;
    y = lerp(lane.ground, GROUND + lane.ramp, v); scale = lerp(lane.groundScale, lane.rampScale, v);
    light = 0.8 + 0.1 * v; look = clamp01(1 - d / LOOK);
  } else if (at < T + CLIMB_MS) {
    const u = (at - T) / CLIMB_MS;
    state = 'ramp'; x = lerp(RAMP.foot[0], RAMP.sill[0], u); y = lerp(RAMP.foot[1], RAMP.sill[1], u) + lane.ramp; scale = lane.rampScale;
    light = 0.9 + 0.1 * u;
  } else if (at < T + CLIMB_MS + STEP_IN_MS) {
    const v = (at - T - CLIMB_MS) / STEP_IN_MS;
    state = 'door'; x = RAMP.sill[0] + 46 * v; y = RAMP.sill[1] + lane.ramp * (1 - v); scale = lane.rampScale;
    // Into the doorway's light: seen against it, then gone inside.
    light = lerp(1, 0.25, v); opacity = 1 - easeInCubic(v);
  } else return null;
  if (look > 0) sk = { ...sk, tilt: (sk.tilt ?? 0) - 7 * look, head: [sk.head[0] - 1.5 * look, sk.head[1] - 1 * look] };
  return { i, state, x, y, scale, sk, mirror: true, light, opacity, z: y + (state === 'ground' ? 1000 : 0) };
}

/** The crew outside at `at`, in drawing order (the ramp's far lane first, the ground's near lane last). */
export function crewOutside(n, at) {
  const out = [];
  for (let i = 0; i < n; i += 1) { const m = memberOutside(i, n, at); if (m) out.push(m); }
  return out.sort((a, b) => a.z - b.z || a.i - b.i);
}

/**
 * The group inside, standing in the corridor in loose rows, seat order from the back row's left:
 * two rows on the display, three on a phone. Every row stands between the places of the row in
 * front of it, so every face shows; the places are drawn, not computed (x by row, world units),
 * then loosened a little, as people stand.
 */
export const GROUP = Object.freeze({
  wide: Object.freeze({
    y: Object.freeze([650, 790]),
    rows: Object.freeze({
      7: Object.freeze([Object.freeze([590, 730, 870, 1010]), Object.freeze([660, 800, 940])]),
      8: Object.freeze([Object.freeze([612, 762, 912, 1062]), Object.freeze([537, 687, 837, 987])]),
      9: Object.freeze([Object.freeze([540, 670, 800, 930, 1060]), Object.freeze([605, 735, 865, 995])]),
    }),
  }),
  narrow: Object.freeze({
    y: Object.freeze([612, 702, 802]),
    rows: Object.freeze({
      7: Object.freeze([Object.freeze([745, 855]), Object.freeze([690, 800, 910]), Object.freeze([745, 855])]),
      8: Object.freeze([Object.freeze([690, 800, 910]), Object.freeze([745, 855]), Object.freeze([690, 800, 910])]),
      9: Object.freeze([Object.freeze([690, 800, 910]), Object.freeze([650, 750, 850, 950]), Object.freeze([690, 910])]),
    }),
  }),
});
const POSES = Object.freeze(['stand', 'standFolded', 'standBack']);

/** The standing places inside for a group of n: { x, y, scale, depth, gesture, mirror, phase }, in seat order. */
export function groupSpots(n, { narrow = false } = {}) {
  const g = narrow ? GROUP.narrow : GROUP.wide;
  const rows = g.rows[n];
  if (!rows) throw new Error(`boarding: no group for ${n}`);
  const spots = [];
  rows.forEach((row, r) => {
    for (const x0 of row) {
      const s = spots.length;
      const x = x0 + (rand(191, n, s) - 0.5) * 18;
      const y = g.y[r] + (rand(193, n, s) - 0.5) * 12;
      spots.push(Object.freeze({
        x, y, depth: floorDepth(y), scale: figureHeightAt(y) / FIGURE_HEIGHT,
        gesture: POSES[s % POSES.length], mirror: x < 799, phase: rand(197, n, s) * 6.28,
      }));
    }
  });
  return Object.freeze(spots);
}

/** The crew inside at `at`: every member at its place, lit as the strips above it wake (`lights` 0..1). */
export function crewInside(n, { lights = 0, narrow = false } = {}) {
  return groupSpots(n, { narrow }).map((spot, i) => ({
    i, state: 'aboard', x: spot.x, y: spot.y, scale: spot.scale, sk: skeletonOf(spot.gesture), gesture: spot.gesture,
    mirror: spot.mirror, phase: spot.phase, light: 0.1 + 0.9 * lightAt(spot.depth, lights), opacity: 1, z: spot.y,
  }));
}

/** The lighting levels each figure is drawn at: a fixed set of filters (LEVELS steps), from the dark to the noir light. */
export const LEVELS = 16;
const DARK = Object.freeze([0.07, 0.08, 0.12]), LIT = Object.freeze([0.84, 0.82, 0.86]);

/** The crew layer's defs under `root`: the light levels and a warm and an amber rim. */
export function crewDefs(root) {
  let defs = '<defs>';
  for (let k = 0; k < LEVELS; k += 1) {
    const v = k / (LEVELS - 1);
    const [r, g, b] = DARK.map((d, c) => f(lerp(d, LIT[c], v)));
    defs += `<filter id="${root}-lit${k}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${r}"/><feFuncG type="linear" slope="${g}"/><feFuncB type="linear" slope="${b}"/></feComponentTransfer></filter>`;
  }
  for (const [name, colour] of [['warm', '#FFF3C4'], ['amber', '#F2C14E']]) {
    defs += `<filter id="${root}-rim-${name}" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="${colour}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="1.2"/></filter>`;
  }
  return `${defs}</defs>`;
}

/**
 * One member drawn: a rim of light behind it (offset toward the light), then the figure at its
 * light level, inked with the films' bold outline (art.mjs revealDefs under the same root).
 */
export function memberSvg(root, member, character, { rim = 'warm', rimOffset = [4, -3], rimOpacity = 0.85, breath = '' } = {}) {
  const id = `${root}-p${member.i}${member.state[0]}`;
  const draw = tag => figureItems({ character, sk: member.sk, at: [member.x, member.y], scale: member.scale, depth: 2, prefix: `${id}${tag}`, mirror: member.mirror }).map(item => item.svg).join('');
  const level = Math.round(clamp01(member.light) * (LEVELS - 1));
  const body = (rimOpacity > 0 ? `<g filter="url(#${root}-rim-${rim})" opacity="${f(rimOpacity)}" transform="translate(${f(rimOffset[0])} ${f(rimOffset[1])})">${draw('r')}</g>` : '')
    + `<g filter="url(#${root}-outline)"><g filter="url(#${root}-lit${level})">${draw('d')}</g></g>`;
  const wrapped = breath ? `<g transform="${breath}">${body}</g>` : body;
  return member.opacity < 1 ? `<g opacity="${f(member.opacity)}">${wrapped}</g>` : wrapped;
}

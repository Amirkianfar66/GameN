// mothership:dev-only
//
// The boarding's two worlds, each drawn in world units (1600 x 900) and in layers for the camera's
// parallax (boarding.mjs). No figure is drawn here: the crew is its own layer (crew.mjs), so the
// environment can play as one animation and the match's roster be composited over it (issue #188).
//   outside  a planet at dusk: a banded, ringed giant, a small moon, the mesas and the landing field
//            with its beacons, and the Mothership (Pilot 2's profile) low on its landing legs, its
//            entrance open in the hull, the ramp down and warm light spilling out over the ground;
//            then the ramp slides up, the door comes down, the light goes out and the hull wakes
//   inside   the ship's spine corridor in one-point perspective, seen from a little above head
//            height: ribs, grating, pipes, the entrance shut at its far end; the ceiling lights wake
//            far to near and the wall consoles power up
// The palette is the role films' night (ink, paper, steel and amber light): no team colour anywhere.

import { INK, lightPool, stars, streaks } from '../../lib/comic.mjs';
import { clamp01, lerp, rand } from '../../lib/ease.mjs';
import { shipSvg } from '../blackhole/art.mjs';
import { NIGHT, motes } from '../role-reveal/art.mjs';
import { GROUND, HATCH, RAMP, SHIP_AT } from './film.mjs';

const f = v => Number((+v).toFixed(2));
const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const WORLD = Object.freeze([1600, 900]);
/** The worlds' own fills (the palette test holds every one clear of the faction accents). */
export const LAND = Object.freeze({
  skyTop: '#090D17', skyLow: '#1C2539', haze: '#463F45', giant: '#B7A27C', giantBand: '#8E7C5C', ring: '#E2D3AE', moon: '#E9E1CC',
  mesaFar: '#262F45', mesaMid: '#161E2F', ground: '#111723', pad: '#F2C14E', strut: '#3A4659', light: '#FFE7A3', lightCore: '#FFF3C4',
  screen: '#D6E9B8',
});
const HULL = Object.freeze({ door: '#4A586E', doorLit: '#7D8BA0', dark: '#1D232D', ramp: '#56657E', rampTop: '#8794A8', rampSide: '#2E3A4E' });

// ---------- outside ----------

/** The giant's place in the sky: low over the mesas behind the crew on the display, over the ship on a phone. */
export const GIANT = Object.freeze({ wide: Object.freeze({ x: 330, y: 250, r: 190 }), narrow: Object.freeze({ x: 905, y: 92, r: 118 }) });
const MOON = Object.freeze({ wide: Object.freeze([1362, 118, 24]), narrow: Object.freeze([720, 230, 15]) });

/** The far layer: the sky, its stars, the banded giant and its ring, the moon and the far mesas. */
export function skyLayer(prefix, { t = 0, reduced = false, narrow = false }) {
  const id = `${prefix}-sky`;
  const g = narrow ? GIANT.narrow : GIANT.wide;
  const [mx, my, mr] = narrow ? MOON.narrow : MOON.wide;
  const R = g.r * 1.74, r = g.r * 0.29, turn = `rotate(-14 ${f(g.x)} ${f(g.y)})`;
  const arc = sweep => `<path d="M${f(g.x - R)} ${f(g.y)}A${f(R)} ${f(r)} 0 0 ${sweep} ${f(g.x + R)} ${f(g.y)}" fill="none" stroke="${LAND.ring}" stroke-width="${f(g.r * 0.055)}" transform="${turn}"/>`;
  let mesas = 'M-600 640 ';
  for (let x = -600; x <= 2200; x += 60) mesas += `L${x} ${f(596 - 24 * Math.sin(x / 210) - 16 * rand(91, Math.floor(x / 60)) + (((x % 420) + 420) % 420 < 120 ? -40 : 0))} `;
  mesas += 'L2200 720 L-600 720 Z';
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LAND.skyTop}"/><stop offset="0.7" stop-color="${LAND.skyLow}"/><stop offset="1" stop-color="${LAND.haze}"/></linearGradient>`
    + `<clipPath id="${prefix}-giant"><circle cx="${f(g.x)}" cy="${f(g.y)}" r="${f(g.r)}"/></clipPath></defs>`
    + `<rect x="-700" y="-700" width="3000" height="1400" fill="url(#${id})"/>`
    + stars({ x: -500, y: -500, w: 2600, h: 1000, count: 190, seed: 207, t: reduced ? 0 : t })
    + lightPool(prefix, 'giant', { cx: g.x, cy: g.y, rx: g.r * 2.3, ry: g.r * 1.7, color: LAND.ring, opacity: 0.1 })
    + `<g opacity="0.55">${arc(1)}</g>`
    + `<circle cx="${f(g.x)}" cy="${f(g.y)}" r="${f(g.r)}" fill="${LAND.giant}" stroke="${INK}" stroke-width="5"/>`
    + `<g clip-path="url(#${prefix}-giant)">`
    + [-0.5, -0.24, 0, 0.24, 0.5].map((v, i) => `<path d="M${f(g.x - g.r * 1.2)} ${f(g.y + v * g.r)}Q${f(g.x)} ${f(g.y + v * g.r - g.r * 0.1)} ${f(g.x + g.r * 1.2)} ${f(g.y + v * g.r + g.r * 0.05)}" fill="none" stroke="${LAND.giantBand}" stroke-width="${f(g.r * (0.05 + (i % 2) * 0.04))}" opacity="0.65"/>`).join('')
    + `<rect x="${f(g.x - g.r)}" y="${f(g.y - g.r)}" width="${f(2 * g.r)}" height="${f(2 * g.r)}" fill="url(#${prefix.split('-')[0]}-dots)" opacity="0.22"/>`
    + `<circle cx="${f(g.x + g.r * 0.42)}" cy="${f(g.y + g.r * 0.42)}" r="${f(g.r * 1.1)}" fill="${NIGHT.deep}" opacity="0.5"/></g>`
    + arc(0)
    + `<circle cx="${mx}" cy="${my}" r="${mr}" fill="${LAND.moon}" stroke="${INK}" stroke-width="3"/><circle cx="${f(mx + mr * 0.3)}" cy="${f(my + mr * 0.25)}" r="${f(mr * 0.85)}" fill="${NIGHT.deep}" opacity="0.4"/>`
    + `<path d="${mesas}" fill="${LAND.mesaFar}" stroke="${INK}" stroke-width="3"/>`
    + `<path d="${mesas}" fill="none" stroke="${LAND.ring}" stroke-width="2" opacity="0.2" transform="translate(0 2)"/>`;
}

/** The landing field: the near ridge, the ground with its halftone and pad marks, and the beacons. */
function fieldSvg(prefix, { t, reduced }) {
  const root = prefix.split('-')[0];
  let ridge = 'M-700 666 ';
  for (let x = -700; x <= 2300; x += 80) ridge += `L${x} ${f(646 - 12 * rand(97, Math.floor(x / 80)) - (((x % 640) + 640) % 640 < 160 ? 20 : 0))} `;
  ridge += 'L2300 690 L-700 690 Z';
  let beacons = '';
  [[330, 724], [610, 706], [1210, 708], [1470, 722], [160, 770], [1700, 780]].forEach(([bx, by], i) => {
    const on = reduced ? 1 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 520 + i * 1.7)) ** 6;
    beacons += `<rect x="${bx - 7}" y="${by - 6}" width="14" height="8" rx="2" fill="${LAND.strut}" stroke="${INK}" stroke-width="2.5"/>`
      + `<circle cx="${bx}" cy="${by - 8}" r="4.5" fill="${LAND.pad}" opacity="${f(on)}"/>`
      + lightPool(prefix, `beacon-${i}`, { cx: bx, cy: by - 6, rx: 34, ry: 16, color: LAND.pad, opacity: 0.4 * on });
  });
  return `<path d="${ridge}" fill="${LAND.mesaMid}" stroke="${INK}" stroke-width="3"/>`
    + `<rect x="-700" y="${GROUND - 12}" width="3000" height="1000" fill="${LAND.ground}"/>`
    + `<rect x="-700" y="${GROUND - 12}" width="3000" height="1000" fill="url(#${root}-dots)" opacity="0.3"/>`
    + `<path d="M-700 ${GROUND - 11}H2300" stroke="${LAND.ring}" stroke-width="2" opacity="0.22"/>`
    // The pad: worn amber marks on the ground under and before the ship.
    + `<path d="M600 700H1520M520 780H1620" stroke="${LAND.pad}" stroke-width="4" stroke-dasharray="40 26" opacity="0.3"/>`
    + `<path d="M690 700L600 960M1440 700L1530 960" stroke="${LAND.pad}" stroke-width="3" opacity="0.18"/>`
    + beacons;
}

/** A landing leg from the hull to its foot on the ground. */
const leg = (x, top) => `<path d="M${x} ${top}L${x - 22} ${GROUND - 6}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x} ${top}L${x - 22} ${GROUND - 6}" stroke="${LAND.strut}" stroke-width="9" stroke-linecap="round"/>`
  + `<rect x="${x - 48}" y="${GROUND - 12}" width="52" height="12" rx="4" fill="${LAND.strut}" stroke="${INK}" stroke-width="4"/>`
  + `<ellipse cx="${x - 22}" cy="${GROUND + 1}" rx="44" ry="7" fill="${NIGHT.deep}" opacity="0.6"/>`;

/** The portholes along the hull (Pilot 2's, in world units), the one behind the doorway left out. */
export const PORTHOLES = Object.freeze([170, 214, 258, 346, 390].map(x => Object.freeze([SHIP_AT.x + x * SHIP_AT.scale, SHIP_AT.y + 104 * SHIP_AT.scale])));
const PORTHOLE_R = 5.5 * SHIP_AT.scale;

/** The ramp's visible far edge at its foot (sliding up toward the sill as `ramp` goes 0..1). */
export const rampFoot = ramp => [lerp(RAMP.foot[0], RAMP.sill[0], ramp), lerp(RAMP.foot[1], RAMP.sill[1], ramp)];

/**
 * The ship on the field: its legs, the hull (Pilot 2's profile at SHIP_AT), the portholes lighting
 * along it (`portholes` 0..1), the doorway and its door coming down (`door` 0..1), the light from
 * the doorway (`light` 0..1) and the ramp's slab, retracting (`ramp` 0..1). The ramp's rail is its
 * own layer (railLayer), in front of the crew on the ramp.
 */
export function shipLayer(prefix, { t = 0, door = 0, ramp = 0, light = 1, portholes = 0, engines = 0, reduced = false }) {
  const { x: sx, y: sy, scale } = SHIP_AT;
  const lit = light * (1 - door);
  const flicker = reduced ? 1 : 0.94 + 0.06 * Math.sin(t / 90) * Math.sin(t / 37);
  const ship = `<g transform="translate(${sx} ${sy}) scale(${scale})">${shipSvg(`${prefix}-hull`, { engine: 0.1 + 0.6 * engines, lights: 0 })}</g>`;
  // The portholes light one after another from the doorway outward, once the door is shut.
  const glow = PORTHOLES.map(([px, py], i) => {
    const order = Math.abs(px - (HATCH.x + HATCH.w / 2)) / 260;
    const on = clamp01(portholes * 2.2 - order);
    return on > 0 ? `<circle cx="${f(px)}" cy="${f(py)}" r="${f(PORTHOLE_R)}" fill="${LAND.light}" stroke="${INK}" stroke-width="3.5" opacity="${f(on)}"/>`
      + lightPool(prefix, `port-${i}`, { cx: px, cy: py, rx: 34, ry: 30, color: LAND.light, opacity: 0.5 * on }) : '';
  }).join('');
  // The doorway: lit from within, its door coming down over it, an amber seam once it is shut.
  const { x: hx, y: hy, w: hw, h: hh } = HATCH;
  const doorH = hh * door;
  const doorway = `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="10" fill="${lit > 0.02 ? `url(#${prefix}-doorway)` : HULL.dark}" stroke="${INK}" stroke-width="6"/>`
    + (lit > 0.02 ? `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="10" fill="${HULL.dark}" opacity="${f(1 - lit)}"/>` : '')
    + (door > 0 ? `<rect x="${hx + 3}" y="${hy + 3}" width="${hw - 6}" height="${f(Math.max(0, doorH - 3))}" rx="8" fill="${HULL.door}" stroke="${INK}" stroke-width="4"/>`
      + `<path d="M${hx + 10} ${f(hy + Math.max(10, doorH - 12))}H${hx + hw - 10}" stroke="${HULL.doorLit}" stroke-width="3" opacity="0.8"/>`
      + `<path d="M${hx + 10} ${f(hy + Math.max(10, doorH - 30))}H${hx + hw - 10}" stroke="${INK}" stroke-width="2" opacity="0.5"/>` : '')
    + `<rect x="${hx - 8}" y="${hy - 8}" width="${hw + 16}" height="${hh + 14}" rx="14" fill="none" stroke="${HULL.doorLit}" stroke-width="5"/>`
    + (door >= 1 ? `<rect x="${hx - 2}" y="${hy - 2}" width="${hw + 4}" height="${hh + 2}" rx="11" fill="none" stroke="${LAND.pad}" stroke-width="2.5" opacity="${f(0.4 + 0.5 * portholes)}"/>` : '');
  // The light spilling out of the doorway over the ramp and the ground before it.
  const spill = lit > 0.01
    ? `<polygon points="${pts([[hx - 4, hy + 40], [hx + hw + 4, hy + 40], [hx + hw + 150, GROUND + 130], [RAMP.foot[0] - 260, GROUND + 120]])}" fill="url(#${prefix}-spill)" style="mix-blend-mode:screen" opacity="${f(lit * flicker)}"/>`
      + lightPool(prefix, 'spill-pool', { cx: RAMP.foot[0] + 40, cy: GROUND + 40, rx: 330, ry: 64, color: LAND.light, opacity: 0.4 * lit * flicker })
      + lightPool(prefix, 'door-glow', { cx: hx + hw / 2, cy: hy + hh / 2, rx: 170, ry: 150, color: LAND.light, opacity: 0.55 * lit * flicker })
    : '';
  // The ramp's slab: its walking surface (a band below the far edge), its side face and its treads.
  const foot = rampFoot(ramp), [tx, ty] = RAMP.sill, d = RAMP.depth;
  let slab = '';
  if (ramp < 1) {
    const len = Math.hypot(tx - foot[0], ty - foot[1]);
    let treads = '';
    for (let s = 14; s < len - 6; s += 16) {
      const u = s / len, px = lerp(foot[0], tx, u), py = lerp(foot[1], ty, u);
      treads += `<path d="M${f(px)} ${f(py + 1)}l-4 ${d - 2}" stroke="${INK}" stroke-width="2.4" opacity="0.55"/>`;
    }
    slab = `<polygon points="${pts([foot, [tx, ty], [tx, ty + d + 12], [foot[0], foot[1] + d + 12]])}" fill="${HULL.rampSide}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
      + `<polygon points="${pts([foot, [tx, ty], [tx, ty + d], [foot[0], foot[1] + d]])}" fill="${HULL.ramp}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
      + treads
      + `<path d="M${f(foot[0])} ${f(foot[1] + 1)}L${tx} ${ty + 1}" stroke="${HULL.rampTop}" stroke-width="3"/>`
      + (lit > 0.01 ? `<polygon points="${pts([foot, [tx, ty], [tx, ty + d], [foot[0], foot[1] + d]])}" fill="${LAND.light}" opacity="${f(0.3 * lit)}" style="mix-blend-mode:screen"/>` : '');
  }
  const defs = `<defs><linearGradient id="${prefix}-spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LAND.lightCore}" stop-opacity="0.5"/><stop offset="0.55" stop-color="${LAND.light}" stop-opacity="0.16"/><stop offset="1" stop-color="${LAND.light}" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="${prefix}-doorway" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.7" stop-color="${LAND.lightCore}"/><stop offset="1" stop-color="${LAND.light}"/></linearGradient></defs>`;
  return defs + leg(700, 592) + leg(1250, 598) + leg(1480, 548) + ship + glow + spill + doorway + slab;
}

/** The ramp's rail on its near side, in front of the crew climbing it (nothing once the ramp is in). */
export function railLayer(prefix, { ramp = 0, light = 1 }) {
  if (ramp >= 1) return '';
  const foot = rampFoot(ramp), [tx, ty] = RAMP.sill, d = RAMP.depth, rise = 46;
  const len = Math.hypot(tx - foot[0], ty - foot[1]);
  let posts = '';
  for (let s = 6; s < len; s += 42) {
    const u = s / len, px = lerp(foot[0], tx, u), py = lerp(foot[1], ty, u) + d;
    posts += `<path d="M${f(px)} ${f(py)}V${f(py - rise)}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${f(px)} ${f(py)}V${f(py - rise)}" stroke="${HULL.rampTop}" stroke-width="2.4"/>`;
  }
  const a = [foot[0], foot[1] + d - rise], b = [tx, ty + d - rise];
  return posts
    + `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${light > 0.05 ? LAND.lightCore : HULL.rampTop}" stroke-width="2.6" opacity="${f(0.5 + 0.4 * light)}"/>`;
}

/** The outside's middle layer: the field and the ship. */
export const fieldLayer = (prefix, opts) => fieldSvg(prefix, opts) + shipLayer(prefix, opts);

/** The outside's near layer: dust carried by the wind across the field (full motion only). */
export function dustLayer(prefix, { t = 0, reduced = false }) {
  if (reduced) return '';
  return streaks({ x: -400, y: GROUND - 30, w: 2400, h: 280, angle: 4, count: 28, seed: 211, color: LAND.ring, width: 2, length: 0.16, opacity: 0.26, phase: t / 1100 })
    + motes({ x: 760, y: 420, w: 560, h: 260, t, count: 22, seed: 223, color: LAND.light, opacity: 0.5, reduced });
}

// ---------- inside ----------

/**
 * The corridor's perspective: the near frame (the screen's edge at depth 1), the far wall at depth
 * 1 / farScale and the vanishing point at eye level, a little above head height. A point (X, Y) of
 * the near frame lies at VP + ((X, Y) - VP) / z at depth z.
 */
export const CORRIDOR = Object.freeze({ near: Object.freeze([120, -20, 1480, 900]), vp: Object.freeze([800, 320]), farScale: 0.176 });
const Z_FAR = 1 / CORRIDOR.farScale;
/** The corridor is drawn from this depth (nearer than the near frame) so that it fills any surface's view. */
const Z_NEAR = 0.5;
export const RIBS = 7;
const [VX, VY] = CORRIDOR.vp;
const at = (X, Y, z) => [VX + (X - VX) / z, VY + (Y - VY) / z];
const rect = z => { const [x0, y0, x1, y1] = CORRIDOR.near; const [a, b] = at(x0, y0, z), [c, d] = at(x1, y1, z); return [a, b, c, d]; };
const ribZ = k => 1 + (k * (Z_FAR - 1)) / RIBS;
const stripZ = k => 1 + ((k + 0.5) * (Z_FAR - 1)) / RIBS;

/** The depth of a point on the floor at screen y, and a standing figure's height there (0.6 of the eye's height). */
export const floorDepth = y => (CORRIDOR.near[3] - VY) / Math.max(1, y - VY);
export const figureHeightAt = y => 0.6 * (y - VY);

/** The light at depth z as the strips wake far to near (`lights` 0..1): 0 dark, 1 lit. */
export function lightAt(z, lights) {
  const k = Math.max(0, Math.min(RIBS - 1, ((z - 1) / (Z_FAR - 1)) * RIBS - 0.5));
  return clamp01(lights * RIBS - (RIBS - 1 - k));
}

/**
 * The spine corridor: walls, ceiling and grated floor, the ribs, pipes, the shut entrance at its far
 * end, the wall consoles (`systems` 0..1) and the ceiling strips (`lights` 0..1, far to near), with
 * the dark lifting slice by slice as each strip wakes. `seal` 0..1: the entrance's seam still glowing.
 */
export function corridorLayer(prefix, { t = 0, lights = 0, systems = 0, seal = 0, reduced = false }) {
  const root = prefix.split('-')[0];
  const [nx0, ny0, nx1, ny1] = rect(Z_NEAR), [fx0, fy0, fx1, fy1] = rect(Z_FAR);
  const quad = (list, attrs) => `<polygon points="${pts(list)}" ${attrs}/>`;
  let shell = quad([[nx0, ny0], [fx0, fy0], [fx0, fy1], [nx0, ny1]], `fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"`)
    + quad([[nx1, ny0], [fx1, fy0], [fx1, fy1], [nx1, ny1]], `fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"`)
    + quad([[nx0, ny0], [nx1, ny0], [fx1, fy0], [fx0, fy0]], `fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="4"`)
    + quad([[nx0, ny1], [nx1, ny1], [fx1, fy1], [fx0, fy1]], `fill="${NIGHT.wallLit}" stroke="${INK}" stroke-width="4"`)
    + `<rect x="${f(fx0)}" y="${f(fy0)}" width="${f(fx1 - fx0)}" height="${f(fy1 - fy0)}" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="3"/>`
    + `<path d="M${f(fx0 + 8)} ${f(fy0 + 26)}H${f(fx1 - 8)}M${f(fx0 + 8)} ${f(fy1 - 40)}H${f(fx1 - 8)}M${f(lerp(fx0, fx1, 0.25))} ${f(fy0)}V${f(fy1)}M${f(lerp(fx0, fx1, 0.75))} ${f(fy0)}V${f(fy1)}" stroke="${INK}" stroke-width="2" opacity="0.45"/>`
    + `<rect x="${f(fx0)}" y="${f(fy0)}" width="${f(fx1 - fx0)}" height="${f(fy1 - fy0)}" fill="url(#${root}-dots)" opacity="0.18"/>`;
  // The floor's grating converging on the far wall, and its halftone.
  for (let i = 1; i < 12; i += 1) {
    const u = i / 12;
    shell += `<path d="M${f(lerp(nx0, nx1, u))} ${f(ny1)}L${f(lerp(fx0, fx1, u))} ${f(fy1)}" stroke="${INK}" stroke-width="2" opacity="0.4"/>`;
  }
  shell += quad([[nx0, ny1], [nx1, ny1], [fx1, fy1], [fx0, fy1]], `fill="url(#${root}-dots)" opacity="0.22"`);
  // Pipes along both walls and the ceiling, converging on the vanishing point.
  const [x0n, y0n, x1n] = CORRIDOR.near;
  for (const [X, Y, w] of [[x0n, 120, 10], [x0n, 170, 6], [x1n, 120, 10], [x1n, 170, 6], [560, y0n, 8], [1040, y0n, 8]]) {
    const [sx, sy] = at(X, Y, Z_NEAR), [ex, ey] = at(X, Y, Z_FAR);
    shell += `<path d="M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}" stroke="${NIGHT.steelLit}" stroke-width="${w}" stroke-linecap="round" opacity="0.8"/>`;
  }
  // The ribs, each a frame at its depth.
  let ribs = '';
  for (let k = 0; k <= RIBS; k += 1) {
    const [x0, y0, x1, y1] = rect(ribZ(k));
    const w = 30 / ribZ(k);
    ribs += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="none" stroke="${INK}" stroke-width="${f(w + 5)}"/>`
      + `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="none" stroke="${NIGHT.steelLit}" stroke-width="${f(w)}"/>`;
  }
  // The entrance at the far end, shut: a door the size of the one outside, at the far wall.
  const floorY = CORRIDOR.near[3];
  const [ex0, ey0] = at(800 - 43 * 1.9, floorY - 122 * 1.9, Z_FAR), [ex1, ey1] = at(800 + 43 * 1.9, floorY, Z_FAR);
  const entrance = `<rect x="${f(ex0 - 6)}" y="${f(ey0 - 6)}" width="${f(ex1 - ex0 + 12)}" height="${f(ey1 - ey0 + 6)}" rx="5" fill="${NIGHT.steelDark}" stroke="${HULL.doorLit}" stroke-width="2.5"/>`
    + `<rect x="${f(ex0)}" y="${f(ey0)}" width="${f(ex1 - ex0)}" height="${f(ey1 - ey0)}" rx="3" fill="${HULL.door}" stroke="${INK}" stroke-width="3"/>`
    + `<path d="M${f(ex0 + 4)} ${f(lerp(ey0, ey1, 0.5))}H${f(ex1 - 4)}" stroke="${INK}" stroke-width="2" opacity="0.6"/>`;
  // The dark, slice by slice: each slice between two ribs lifts as its strip wakes.
  const lit = z => (reduced ? Math.round(lightAt(z, lights)) : lightAt(z, lights));
  let dark = '';
  {
    const [a0, b0, a1, b1] = rect(Z_NEAR), [c0, d0, c1, d1] = rect(1);
    dark += `<path d="M${f(a0)} ${f(b0)}H${f(a1)}V${f(b1)}H${f(a0)}ZM${f(c0)} ${f(d0)}V${f(d1)}H${f(c1)}V${f(d0)}Z" fill="${NIGHT.deep}" fill-rule="evenodd" opacity="${f(0.82 * (1 - lit(stripZ(0))) + 0.1)}"/>`;
  }
  for (let k = 0; k < RIBS; k += 1) {
    const [a0, b0, a1, b1] = rect(ribZ(k)), [c0, d0, c1, d1] = rect(ribZ(k + 1));
    const shade = 0.82 * (1 - lit(stripZ(k))) + 0.1;
    dark += `<path d="M${f(a0)} ${f(b0)}H${f(a1)}V${f(b1)}H${f(a0)}ZM${f(c0)} ${f(d0)}V${f(d1)}H${f(c1)}V${f(d0)}Z" fill="${NIGHT.deep}" fill-rule="evenodd" opacity="${f(shade)}"/>`;
  }
  dark += `<rect x="${f(fx0)}" y="${f(fy0)}" width="${f(fx1 - fx0)}" height="${f(fy1 - fy0)}" fill="${NIGHT.deep}" opacity="${f(0.82 * (1 - lit(Z_FAR)) + 0.1)}"/>`;
  // What glows: the entrance's seam, its lock lamp, the consoles and the ceiling strips.
  const lamp = 0.25 + 0.75 * systems;
  let glow = `<rect x="${f(ex0 - 2)}" y="${f(ey0 - 2)}" width="${f(ex1 - ex0 + 4)}" height="${f(ey1 - ey0 + 2)}" rx="4" fill="none" stroke="${LAND.pad}" stroke-width="2.5" opacity="${f(0.25 + 0.7 * seal)}"/>`
    + lightPool(prefix, 'seal', { cx: 800, cy: lerp(ey0, ey1, 0.5), rx: 70, ry: 60, color: LAND.pad, opacity: 0.18 + 0.4 * seal })
    + `<circle cx="800" cy="${f(ey0 - 9)}" r="4" fill="${LAND.pad}" opacity="${f(lamp)}"/>`
    + lightPool(prefix, 'lock', { cx: 800, cy: ey0 - 9, rx: 26, ry: 20, color: LAND.pad, opacity: 0.5 * lamp });
  [[1.35, -1], [1.35, 1], [2.3, -1], [2.3, 1], [3.4, -1], [3.4, 1]].forEach(([z, side], i) => {
    const X = side < 0 ? x0n : x1n;
    const corners = [at(X, 330, z), at(X, 330, z + 0.42), at(X, 470, z + 0.42), at(X, 470, z)].map(([px, py]) => [px - (side * 4) / z, py]);
    const p = reduced ? (systems >= 1 ? 1 : 0) : clamp01(systems * 3.2 - i * 0.44);
    // Powering up, a screen pulses gently (under 1.5 Hz: nothing flashes), then holds.
    const blink = reduced || p >= 1 || p <= 0 ? 1 : 0.75 + 0.25 * Math.sin(t / 110 + i);
    glow += `<polygon points="${pts(corners)}" fill="${p > 0 ? LAND.screen : '#141A22'}" opacity="${f(p > 0 ? 0.3 + 0.6 * p * blink : 0.9)}" stroke="${INK}" stroke-width="${f(5 / z)}"/>`;
    if (p > 0) glow += lightPool(prefix, `console-${i}`, { cx: (corners[0][0] + corners[1][0]) / 2, cy: (corners[0][1] + corners[3][1]) / 2, rx: 120 / z, ry: 100 / z, color: LAND.screen, opacity: 0.32 * p });
  });
  for (let k = 0; k < RIBS; k += 1) {
    const z = stripZ(k), on = lit(z);
    const [sx0, sy0] = at(800 - 190, y0n + 26, z), [sx1, sy1] = at(800 + 190, y0n + 44, z);
    glow += `<rect x="${f(sx0)}" y="${f(sy0)}" width="${f(sx1 - sx0)}" height="${f(sy1 - sy0)}" rx="${f(4 / z)}" fill="${on > 0.5 ? LAND.lightCore : NIGHT.steelDark}" stroke="${INK}" stroke-width="${f(4 / z)}"/>`;
    if (on > 0) glow += lightPool(prefix, `strip-${k}`, { cx: 800, cy: sy1 + 90 / z, rx: 420 / z, ry: 260 / z, color: LAND.light, opacity: 0.3 * on });
  }
  return shell + ribs + entrance + dark + glow;
}

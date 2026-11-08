// mothership:dev-only
//
// The boarding (./clock.mjs for its beats), drawn as four shots in the crew's own ink and light:
//   dusk     0-2 s     a ringed giant over the mesas at dusk; the Mothership low on its legs, its
//                      entrance open and warm light spilling down the ramp; the camera tilts down to it
//   ramp     2-6.9 s   the crew (the public roster, in seat order, in pairs) walks in from the right and
//                      climbs the ramp into the light, faces lit by the doorway, backs in the dusk; the
//                      last aboard, the ramp slides up, the door comes down and seals amber, the ports
//                      light along the hull and the engines glow; the camera pushes in on the door
//   inside   6.9-10 s  the dark spine corridor: the crew stands together, rimmed by the shut entrance's
//                      amber seam behind them; the ceiling lights wake far to near over them, the
//                      consoles power up; the Game N mark is stamped; ink to the night by 9,960 ms
// Nothing private reaches a picture: places follow seat order alone (./roster.mjs).

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { walkPose } from '../../board-motion/figures/motion.mjs';
import { inkCanvas } from '../../crew-drawing/source/ink.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, blurFilter, defs, dust, finish, glow, halftone, impactLines, inBeam, inkTide, linear, pool, puff, radial, streak } from '../kit/fx.mjs';
import { AMBER_FACE, inkWord } from '../kit/letters.mjs';
import { clamp01, ease, f, f3, hash, lerp, noise, progress, rng, shake } from '../kit/math.mjs';
import { BOARDING_MS, CLIMB_MS, ENTRANCE, HULL_WAKE, INSIDE, STEP_IN_MS, TITLE, boardingFrame, pairAt } from './clock.mjs';
import { publicRoster } from './roster.mjs';

export { BOARDING_MS };
const INK = '#0B0E15';
const NIGHT = '#07090F';

// ---------- the world outside (world units: 1600 x 900) ----------

export const GROUND = 650;
export const DOOR = Object.freeze({ x: 498, y: 384, w: 92, h: 126 });
export const RAMP = Object.freeze({ sill: Object.freeze([590, 510]), foot: Object.freeze([870, GROUND]) });
const SUN = Object.freeze([1480, 610]);

/** The camera on each shot: tall phones (narrow) and the display (wide), keyframes of centre and view height. */
const TRACKS = Object.freeze({
  narrow: { dusk: [[0, 640, 330, 920], [2000, 650, 430, 860]], ramp: [[2000, 730, 520, 600], [6900, 640, 490, 470]], inside: [[6900, 500, 560, 800], [10000, 500, 570, 720]] },
  wide: { dusk: [[0, 800, 440, 900], [2000, 820, 470, 820]], ramp: [[2000, 760, 520, 620], [6900, 650, 480, 470]], inside: [[6900, 500, 560, 720], [10000, 500, 565, 650]] },
});
function cameraOf(W, H, shot, t) {
  const track = TRACKS[W > H ? 'wide' : 'narrow'][shot];
  const [a, b] = track;
  const v = ease.inOutSine(progress(t, a[0], b[0]));
  const cx = lerp(a[1], b[1], v), cy = lerp(a[2], b[2], v), vh = lerp(a[3], b[3], v);
  const s = H / vh;
  return { s, x: W / 2 - cx * s, y: H / 2 - cy * s, cx, cy, vh };
}
const camT = c => `translate(${f(c.x)} ${f(c.y)}) scale(${f3(c.s)})`;
function skySvg(D, t) {
  let out = `<rect x="-800" y="-600" width="3200" height="1400" fill="${linear(D, 'bd-sky', [[0, '#0A1028'], [0.42, '#26264A'], [0.66, '#6A4058'], [0.82, '#C26B4C'], [0.92, '#E9A15E'], [1, '#F2C27A']], { x1: 0, y1: -600, x2: 0, y2: 660, units: 'userSpaceOnUse' })}"/>`;
  const r = rng(91);
  for (let i = 0; i < 160; i += 1) {
    const x = -600 + r() * 2800, y = -600 + r() * 760, b = r() ** 3;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + b * 1.8)}" fill="#F4F0FF" opacity="${f3((0.2 + 0.8 * b) * (0.65 + 0.35 * noise(t * 0.003 + i, 4)) * clamp01((300 - y) / 600 + 0.3))}"/>`;
  }
  // The ringed giant: banded, lit from the low sun on the right, its ring passing in front.
  const [gx, gy, gr] = [690, 150, 260];
  out += `<ellipse cx="${gx}" cy="${gy}" rx="${gr * 1.95}" ry="${gr * 0.42}" fill="none" stroke="#D9B48C" stroke-width="22" opacity="0.32" transform="rotate(-14 ${gx} ${gy})"/>`;
  out += `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${radial(D, 'bd-giant', [[0, '#E8B27E'], [0.55, '#B07253'], [1, '#4A2C3A']], { cx: 0.68, cy: 0.42, r: 0.75 })}"/>`;
  D.use('bd-giant-clip', `<clipPath id="bd-giant-clip"><circle cx="${gx}" cy="${gy}" r="${gr}"/></clipPath>`);
  let bands = '';
  for (let i = 0; i < 9; i += 1) { const y = gy - gr + 40 + i * 52 + noise(i, 3) * 10; bands += `<path d="M${gx - gr} ${f(y)}Q${gx} ${f(y + 26 + noise(i, 8) * 10)} ${gx + gr} ${f(y + 4)}" stroke="${i % 2 ? '#7C4A3E' : '#F0C796'}" stroke-width="${f(10 + (i % 3) * 6)}" fill="none" opacity="0.35"/>`; }
  out += `<g clip-path="url(#bd-giant-clip)">${bands}<circle cx="${gx - 120}" cy="${gy + 40}" r="${gr * 1.05}" fill="#1A1028" opacity="0.55"/></g>`;
  out += `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="none" stroke="#F7D2A2" stroke-width="5" opacity="0.6"/>`;
  out += `<path d="M${gx - gr * 1.9} ${f(gy + 70)}A${gr * 1.95} ${gr * 0.42} -14 0 0 ${gx + gr * 1.9} ${f(gy - 90)}" fill="none" stroke="#F0CFA4" stroke-width="16" opacity="0.6" transform="rotate(-14 ${gx} ${gy}) rotate(14 ${gx} ${gy})"/>`;
  // The low sun's glow on the horizon.
  out += pool(D, 'bd-sun', { cx: SUN[0], cy: SUN[1], rx: 520, ry: 210, color: '#FFD08A', opacity: 0.75, core: 0.08 });
  return out;
}

function mesasSvg(D) {
  const layer = (seed, base, amp, color, edge) => {
    const r = rng(seed);
    const pts = [[-700, 900]];
    let x = -700;
    while (x < 2400) { const w = 60 + r() * 220, h = base - amp * (0.3 + r() * 0.7); pts.push([x, base], [x + w * 0.12, h], [x + w * 0.88, h - r() * 12], [x + w, base]); x += w + r() * 80; }
    pts.push([2400, 900]);
    return `<path d="M${pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L')}Z" fill="${color}" stroke="${edge}" stroke-width="2.4" stroke-linejoin="round"/>`;
  };
  return layer(11, 620, 120, '#5A3F55', '#3B2A3E') + `<rect x="-800" y="560" width="3200" height="120" fill="${linear(D, 'bd-haze', [[0, '#F2B27A', 0], [0.6, '#E79C6A', 0.35], [1, '#E79C6A', 0]])}"/>` + layer(12, 640, 70, '#3A2638', '#24162A');
}

function groundSvg(D) {
  let out = `<rect x="-800" y="${GROUND}" width="3200" height="700" fill="${linear(D, 'bd-ground', [[0, '#3A2630'], [0.3, '#24161F'], [1, '#0C080C']], { x1: 0, y1: GROUND, x2: 0, y2: 1200, units: 'userSpaceOnUse' })}"/>`;
  out += `<rect x="-800" y="${GROUND}" width="3200" height="700" fill="${halftone(D, 'bd-ground-dots', { size: 7, r: 1.4, color: '#000000', angle: 20 })}" opacity="0.35"/>`;
  out += `<path d="M-800 ${GROUND}H2400" stroke="#E7A46E" stroke-width="2" opacity="0.6"/>`;
  const r = rng(33);
  for (let i = 0; i < 40; i += 1) { const x = -600 + r() * 2600, y = GROUND + 8 + r() ** 2 * 300; out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(10 + r() * 30)}" ry="${f(2 + r() * 3)}" fill="#120A10" opacity="0.6"/>`; }
  return out;
}

/** The Mothership landed: hull, bridge, fins, legs; drawn once in the crew's ink. */
let shipCache = null;
function shipBody() {
  if (shipCache) return shipCache;
  const cv = inkCanvas('bd-ship');
  const hull = '#363E55', hullLit = '#4A5470', belly = '#1E2434';
  for (const [x, a] of [[300, -8], [760, 0], [1060, 8]]) {
    cv.form([[x - 10, 500], [x + 10, 500], [x + 18 + a, GROUND - 6], [x - 18 + a, GROUND - 6]], '#2C3346', { weight: 3, depth: 4, seed: 5 + x, tension: 0.2 });
    cv.form([[x - 34 + a, GROUND - 12], [x + 34 + a, GROUND - 12], [x + 40 + a, GROUND], [x - 40 + a, GROUND]], '#1C2130', { weight: 2.6, depth: 2, seed: 6 + x, tension: 0.2 });
  }
  cv.form([[180, 420], [210, 340], [420, 300], [900, 290], [1110, 330], [1190, 400], [1170, 470], [1020, 515], [380, 522], [210, 495]], hull, { weight: 4, depth: 14, seed: 21, tension: 0.7 });
  cv.form([[420, 302], [520, 236], [820, 228], [960, 262], [980, 296], [430, 304]], hullLit, { weight: 3.4, depth: 7, seed: 22, tension: 0.6 });
  cv.form([[860, 236], [900, 196], [990, 196], [1020, 238], [1010, 268], [870, 266]], hullLit, { weight: 3, depth: 6, seed: 23, tension: 0.5 });
  cv.form([[200, 470], [1100, 478], [1060, 516], [380, 524], [220, 500]], belly, { weight: 3, depth: 5, seed: 24, tension: 0.5 });
  cv.form([[240, 330], [180, 230], [230, 228], [330, 312]], '#3A4360', { weight: 3, depth: 6, seed: 25, tension: 0.5 });
  for (const y of [360, 410, 450]) cv.form([[186, y - 18], [130, y - 24], [118, y], [130, y + 24], [186, y + 18]], '#1C2131', { weight: 2.6, depth: 4, seed: 26 + y, tension: 0.6 });
  for (const x of [330, 470, 640, 820, 960, 1080]) cv.line([[x, 306], [x + 6, 516]], { weight: 1.6, color: '#151A26', taper: 'none' });
  cv.line([[230, 400], [1160, 404]], { weight: 2.6, color: '#9AA6C2', taper: 'both' });
  cv.form([[912, 204], [990, 204], [1004, 228], [902, 228]], '#2A3044', { weight: 2, depth: 0, rim: false, hatch: false, grain: false, seed: 27 });
  // Hull detail: plating seams, vents, a mast and its beacon arm, rivet rows.
  for (const [x0, x1, y] of [[260, 1120, 340], [240, 1150, 450], [300, 1060, 492]]) cv.line([[x0, y], [x1, y + 4]], { weight: 1.2, color: '#141823', taper: 'none' });
  for (const x of [400, 560, 720, 880, 1000]) cv.form([[x, 455], [x + 46, 455], [x + 46, 468], [x, 468]], '#1C2131', { weight: 1.4, depth: 1, seed: 40 + x, tension: 0.1, rim: false });
  cv.form([[700, 230], [708, 160], [716, 160], [722, 230]], '#2C3348', { weight: 1.8, depth: 1, seed: 47, tension: 0.2 });
  cv.line([[712, 162], [760, 150]], { weight: 2, color: '#151A26', taper: 'end' });
  // The sunset along the hull's top: a warm rim on the edges the low sun finds.
  const rim = `<path d="M210 340Q420 296 900 288Q1110 326 1192 398" fill="none" stroke="#F2A86A" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`
    + `<path d="M520 236Q680 226 820 228Q930 246 962 262" fill="none" stroke="#F7C08A" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`
    + `<path d="M900 196H990L1020 238" fill="none" stroke="#F7C08A" stroke-width="3.4" stroke-linecap="round" opacity="0.8"/>`;
  shipCache = cv.svg({ viewBox: '0 0 1600 900' }).replace(/^<svg[^>]*>/, '<g>').replace(/<\/svg>$/, `${rim}</g>`);
  return shipCache;
}

/** The ship's lights and its entrance at moment t: the doorway's light, the ramp, the door, the ports, the engines. */
function shipLive(D, t, reduced) {
  const rampUp = ease.inOutCubic(progress(t, ...ENTRANCE.ramp));
  const doorDown = ease.inOutCubic(progress(t, ...ENTRANCE.door));
  const lightOut = progress(t, ...ENTRANCE.lightOut);
  const ports = progress(t, ...HULL_WAKE.ports), engines = ease.outCubic(progress(t, ...HULL_WAKE.engines));
  const { x, y, w, h } = DOOR;
  const light = 1 - lightOut;
  let out = '';
  // The doorway: warm light inside, its frame inked.
  out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${linear(D, 'bd-door-light', [[0, '#FFF6DE'], [0.6, '#FFD48A'], [1, '#F2A85A']])}" opacity="${f3(0.15 + 0.85 * light)}"/>`;
  out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#151A26" opacity="${f3(lightOut * 0.85)}"/>`;
  // The door coming down from the top of the frame and sealing amber.
  if (doorDown > 0) {
    const dh = h * doorDown;
    out += `<rect x="${x}" y="${y}" width="${w}" height="${f(dh)}" fill="${linear(D, 'bd-door', [[0, '#5B6683'], [1, '#3A4360']])}" stroke="${INK}" stroke-width="3"/>`;
    out += `<path d="M${x + 10} ${f(y + dh * 0.3)}H${x + w - 10}M${x + 10} ${f(y + dh * 0.62)}H${x + w - 10}" stroke="#1E2434" stroke-width="2.4"/>`;
    if (doorDown >= 1) out += `<path d="M${x - 2} ${y + h}H${x + w + 2}M${x} ${y}V${y + h}M${x + w} ${y}V${y + h}" stroke="#FFB257" stroke-width="3.4" opacity="${f3(0.95)}"/>` + glow(D, 'bd-seal', { cx: x + w / 2, cy: y + h, r: 70, color: '#FFB257', opacity: 0.7 });
  }
  out += `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="none" stroke="${INK}" stroke-width="6"/>`;
  // The ramp: from the sill down to the ground, sliding up into the hull.
  const [sx, sy] = RAMP.sill, [fx0, fy0] = RAMP.foot;
  const fx = lerp(fx0, sx, rampUp), fy = lerp(fy0, sy, rampUp);
  if (rampUp < 0.999) {
    out += `<path d="M${sx} ${sy}L${f(fx)} ${f(fy)}L${f(fx)} ${f(fy + 14)}L${sx} ${sy + 14}Z" fill="#2A3144" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    out += `<path d="M${sx} ${sy}L${f(fx)} ${f(fy)}" stroke="#E7C394" stroke-width="2.4" opacity="${f3(0.4 + 0.5 * light)}"/>`;
    out += `<path d="M${sx} ${sy - 46}L${f(fx)} ${f(fy - 46)}M${f(lerp(sx, fx, 0.33))} ${f(lerp(sy, fy, 0.33) - 46)}V${f(lerp(sy, fy, 0.33))}M${f(lerp(sx, fx, 0.66))} ${f(lerp(sy, fy, 0.66) - 46)}V${f(lerp(sy, fy, 0.66))}M${f(fx)} ${f(fy - 46)}V${f(fy)}" stroke="#1A1F2C" stroke-width="3"/>`;
  }
  // The light spilling out of the doorway: down the ramp and over the ground, and a glow round it.
  if (light > 0.01) {
    out += beam(D, 'bd-spill', { from: [x + w / 2, y + h * 0.55], to: [fx0 + 120, GROUND + 70], w0: w * 0.9, w1: 420, color: '#FFD9A0', opacity: 0.42 * light, soft: 12 });
    out += pool(D, 'bd-spill-pool', { cx: fx0 + 40, cy: GROUND + 24, rx: 260, ry: 44, color: '#FFC983', opacity: 0.55 * light });
    out += glow(D, 'bd-door-glow', { cx: x + w / 2, cy: y + h / 2, r: 170, color: '#FFE2B0', opacity: 0.7 * light });
    out += streak(D, 'bd-door-streak', { cx: x + w / 2, cy: y + h * 0.4, len: 360, thick: 4, color: '#FFE9C8', opacity: 0.45 * light });
  }
  // The ports along the hull, lighting front to back once the door has sealed; the engines.
  for (let i = 0; i < 16; i += 1) {
    const px = 1080 - i * 52, py = 372 + (i % 2) * 4;
    const on = reduced ? (ports > 0 ? 1 : 0) : clamp01(ports * 16 - i * 0.7);
    out += `<circle cx="${px}" cy="${py}" r="7" fill="#1A2030" stroke="${INK}" stroke-width="2"/>`;
    if (on > 0) out += `<circle cx="${px}" cy="${py}" r="5" fill="#FFD48A" opacity="${f3(on)}"/>` + glow(D, `bd-port${i}`, { cx: px, cy: py, r: 22, color: '#FFD48A', opacity: 0.5 * on });
  }
  for (const ey of [360, 410, 450]) out += glow(D, `bd-engine${ey}`, { cx: 118, cy: ey, r: 60, color: '#BFD8FF', opacity: 0.15 + 0.75 * engines }) + `<ellipse cx="114" cy="${ey}" rx="${f(6 + 6 * engines)}" ry="${f(10 + 6 * engines)}" fill="#E9F2FF" opacity="${f3(0.3 + 0.7 * engines)}"/>`;
  // Floodlights under the hull, on the ground.
  out += pool(D, 'bd-flood1', { cx: 380, cy: GROUND + 10, rx: 160, ry: 26, color: '#CFE0FF', opacity: 0.25 });
  out += pool(D, 'bd-flood2', { cx: 980, cy: GROUND + 10, rx: 160, ry: 26, color: '#CFE0FF', opacity: 0.25 });
  return out;
}

// ---------- the crew outside ----------

const WALK_MS = 520;
const SPEED = 0.17;
const LANES = Object.freeze([{ dy: 10, scale: 0.53 }, { dy: -8, scale: 0.47 }]);

/** Member i of the roster outside at moment t: its place, scale, pose and how far it has gone into the light; or null. */
export function memberOutside(i, n, t) {
  const pairs = Math.ceil(n / 2), p = Math.floor(i / 2), lane = LANES[i % 2];
  const T = pairAt(p, pairs) + (i % 2) * 180;
  const phase = (t + hash(i, 5) * WALK_MS) / WALK_MS;
  const [sx, sy] = RAMP.sill, [fx, fy] = RAMP.foot;
  let x, y, inLight = 0, state;
  if (t < T) {
    state = 'ground'; x = fx + (T - t) * SPEED; y = fy + lane.dy;
  } else if (t < T + CLIMB_MS) {
    state = 'ramp'; const u = (t - T) / CLIMB_MS; x = lerp(fx, sx, u); y = lerp(fy, sy, u) + lane.dy * (1 - u);
  } else if (t < T + CLIMB_MS + STEP_IN_MS) {
    state = 'door'; const u = (t - T - CLIMB_MS) / STEP_IN_MS; x = lerp(sx, DOOR.x + DOOR.w * 0.45, u); y = sy; inLight = u;
  } else return null;
  return { i, state, x, y, scale: lane.scale * (state === 'ground' ? 1 : lerp(1, 0.94, clamp01((fx - x) / (fx - sx)))), sk: walkPose(phase), inLight, lane: i % 2 };
}

function crewOutside(D, roster, t, reduced) {
  const n = roster.length;
  const list = roster.map((m, i) => ({ m, s: memberOutside(i, n, t) })).filter(e => e.s);
  // The far lane first, and those further up the ramp (further in) before those behind them.
  list.sort((a, b) => a.s.lane === b.s.lane ? a.s.x - b.s.x : b.s.lane - a.s.lane);
  return list.map(({ m, s }) => {
    const shadow = `<ellipse cx="${f(s.x + 34)}" cy="${f(s.y + 2)}" rx="${f(48 * s.scale)}" ry="${f(6 * s.scale)}" fill="#000" opacity="${f3(0.45 * (1 - s.inLight))}" filter="${blurFilter(D, 'bd-shadow', 3)}"/>`;
    const fig = litFigure(D, `bd-m${m.seat}`, {
      c: m.character, sk: s.sk, at: [s.x, s.y], scale: s.scale, t, reduced, seat: m.seat,
      ambient: { color: '#3A2D52', strength: 0.74 },
      key: { at: [DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h * 0.4], z: 60, color: '#FFD49A', gain: 2.3 },
      rim: { dx: 0.85, dy: -0.4, color: '#FFB37A', width: 2.6, gain: 0.85 },
      opacity: 1 - ease.inCubic(s.inLight),
    });
    return shadow + fig;
  }).join('');
}

// ---------- inside: the spine corridor (world units: 1000 x 1000) ----------

const VP = Object.freeze([500, 430]);
/** Rows by crew size on tall phones (back to front) and on the display (back, front). */
const ROWS = Object.freeze({ narrow: { 7: [2, 3, 2], 8: [3, 2, 3], 9: [3, 4, 2] }, wide: { 7: [4, 3], 8: [4, 4], 9: [5, 4] } });
const POSES = Object.freeze(['stand', 'standFolded', 'think']);

function corridorSvg(D, t, reduced) {
  const lights = INSIDE.lights, systems = progress(t, ...INSIDE.systems);
  // Depth of each ceiling light (1 far .. 6 near), and how far it has woken (far first).
  const lamps = [1, 2, 3, 4, 5, 6].map(d => {
    const at = lerp(lights[0], lights[1], (d - 1) / 5);
    let on = clamp01((t - at) / 160);
    if (!reduced && on > 0 && on < 1) on *= 0.4 + 0.6 * (hash(Math.floor(t / 40), d) > 0.35 ? 1 : 0);
    return { d, on };
  });
  const lit = lamps.reduce((s, l) => s + l.on, 0) / 6;
  const wall = lerp(0.12, 1, lit);
  const shade = c => `rgb(${c.map(v => Math.round(v * wall)).join(',')})`;
  let out = `<rect x="-600" y="-200" width="2200" height="1500" fill="#05070C"/>`;
  // The corridor in one-point perspective: ceiling, walls and floor converge on the far door.
  const frame = d => { const k = 1 / (1 + d * 0.55); return { x0: VP[0] - 820 * k, x1: VP[0] + 820 * k, y0: VP[1] - 430 * k, y1: VP[1] + 420 * k }; };
  const near = frame(0), far = frame(6);
  out += `<path d="M${f(near.x0)} ${f(near.y0)}L${f(far.x0)} ${f(far.y0)}L${f(far.x1)} ${f(far.y0)}L${f(near.x1)} ${f(near.y0)}Z" fill="${shade([28, 34, 48])}"/>`;
  out += `<path d="M${f(near.x0)} ${f(near.y1)}L${f(far.x0)} ${f(far.y1)}L${f(far.x1)} ${f(far.y1)}L${f(near.x1)} ${f(near.y1)}Z" fill="${shade([22, 26, 36])}"/>`;
  out += `<path d="M${f(near.x0)} ${f(near.y0)}L${f(far.x0)} ${f(far.y0)}L${f(far.x0)} ${f(far.y1)}L${f(near.x0)} ${f(near.y1)}Z" fill="${shade([34, 41, 58])}"/>`;
  out += `<path d="M${f(near.x1)} ${f(near.y0)}L${f(far.x1)} ${f(far.y0)}L${f(far.x1)} ${f(far.y1)}L${f(near.x1)} ${f(near.y1)}Z" fill="${shade([30, 36, 52])}"/>`;
  for (let d = 0; d <= 6; d += 1) { const q = frame(d); out += `<path d="M${f(q.x0)} ${f(q.y0)}H${f(q.x1)}V${f(q.y1)}H${f(q.x0)}Z" fill="none" stroke="#0A0D15" stroke-width="${f(4 / (1 + d * 0.55))}"/>`; }
  // The shut entrance at the far end: the door, its amber seam.
  const seal = 1 - 0.5 * progress(t, ...INSIDE.seal);
  out += `<rect x="${f(far.x0 + 20)}" y="${f(far.y0 + 10)}" width="${f(far.x1 - far.x0 - 40)}" height="${f(far.y1 - far.y0 - 10)}" fill="#3A4360" stroke="${INK}" stroke-width="2"/>`;
  out += `<rect x="${f(far.x0 + 18)}" y="${f(far.y0 + 8)}" width="${f(far.x1 - far.x0 - 36)}" height="${f(far.y1 - far.y0 - 6)}" fill="none" stroke="#FFB257" stroke-width="2.4" opacity="${f3(seal)}"/>`;
  out += glow(D, 'bd-in-seal', { cx: VP[0], cy: VP[1], r: 260, color: '#FFB257', opacity: 0.55 * seal });
  // Consoles on the walls powering up.
  for (let d = 1; d <= 5; d += 1) {
    const q = frame(d), k = 1 / (1 + d * 0.55), on = clamp01(systems * 6 - (5 - d));
    for (const side of [-1, 1]) {
      const x = side < 0 ? q.x0 + 14 * k : q.x1 - 34 * k, y = VP[1] - 40 * k;
      out += `<rect x="${f(x)}" y="${f(y)}" width="${f(20 * k)}" height="${f(30 * k)}" fill="${on > 0 ? '#9FE0FF' : '#141A26'}" opacity="${f3(0.3 + 0.6 * on)}" stroke="${INK}" stroke-width="${f(1.5 * k)}"/>`;
    }
  }
  // The ceiling lights, waking far to near, each throwing a cone down.
  let cones = '';
  for (const { d, on } of lamps) {
    const q = frame(d - 0.5), k = 1 / (1 + (d - 0.5) * 0.55);
    out += `<rect x="${f(VP[0] - 70 * k)}" y="${f(q.y0 + 4 * k)}" width="${f(140 * k)}" height="${f(9 * k)}" rx="${f(3 * k)}" fill="${on > 0 ? '#F4FBFF' : '#1E2433'}" opacity="${f3(0.4 + 0.6 * on)}"/>`;
    if (on > 0) cones += beam(D, `bd-in-cone${d}`, { from: [VP[0], q.y0 + 10 * k], to: [VP[0], q.y1], w0: 150 * k, w1: 520 * k, color: '#DCEBFF', opacity: 0.16 * on, soft: 8 * k }) + glow(D, `bd-in-lamp${d}`, { cx: VP[0], cy: q.y0 + 8 * k, r: 120 * k, color: '#E8F4FF', opacity: 0.6 * on });
  }
  return { back: out, air: cones, lit };
}

function crewInside(D, roster, t, W, H, reduced, lit) {
  const rows = ROWS[W > H ? 'wide' : 'narrow'][roster.length];
  const n = rows.length;
  let out = '', i = 0;
  rows.forEach((count, r) => {
    // Back rows stand further down the corridor (smaller, higher); each stands between the places in front.
    const depth = n === 3 ? [2.4, 1.6, 0.9][r] : [2, 1.1][r];
    const k = 1 / (1 + depth * 0.55);
    const floor = VP[1] + 420 * k;
    const spread = (W > H ? 230 : 170) * k;
    for (let c = 0; c < count; c += 1) {
      const m = roster[i]; i += 1;
      const x = VP[0] + (c - (count - 1) / 2) * spread + ((r % 2) ? spread * 0.12 : 0);
      const pose = { ...skeletonOf(POSES[(m.seat + r) % POSES.length]), view: 'front' };
      out += litFigure(D, `bd-in${m.seat}`, {
        c: m.character, sk: pose, at: [x, floor], scale: 1.65 * k, t, reduced, seat: m.seat,
        ambient: { color: '#1E2740', strength: lerp(0.9, 0.45, lit) },
        key: { at: [VP[0], VP[1] - 420 * k], z: 160 * k, color: '#E6F0FF', gain: 1.6 * lit },
        rim: { dx: 0, dy: -1, color: '#FFB257', width: 3 * k * 1.6, gain: 0.9 },
      });
    }
  });
  return out;
}

// ---------- the title ----------

function titleSvg(D, W, H, t, reduced) {
  const k = reduced ? 1 : progress(t, ...TITLE.stamp);
  if (k <= 0) return '';
  const size = Math.min(W * 0.16, H * 0.095);
  const cy = H * 0.2, cx = W / 2;
  const s = lerp(1.7, 1, ease.outCubic(k));
  const word = inkWord(D, 'bd-mark', 'Game N', { x: 0, y: 0, size, skew: -8, face: AMBER_FACE, extrude: [0.5, 0.62], steps: 8, depth: reduced ? 1 : ease.outBack(progress(t, TITLE.hit - 40, TITLE.hit + 260), 1.6), sheen: reduced ? 0 : progress(t, ...TITLE.sheen), hot: false });
  let out = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(-2.5) scale(${f3(s)})" opacity="${f3(clamp01(k * 4))}">${word.svg}</g>`;
  if (!reduced) {
    out += impactLines({ seed: 5, n: 22, k: progress(t, TITLE.hit, TITLE.hit + 360), at: [cx, cy], r0: word.width * 0.55, r1: word.width * 0.9, color: '#F4EBDD', width: 5, opacity: 0.45, aspect: 2.2 });
    out += puff(D, 'bd-mark-puff', { t, t0: TITLE.hit, at: [cx, cy + size * 0.6], r: word.width * 0.4, ms: 560, color: '#D9C8A8', opacity: 0.3, seed: 6 });
  }
  return out;
}

// ---------- the film ----------

export function boardingSvg(t, { width: W = 390, height: H = 844, variant = 'full', roster: given } = {}) {
  const roster = publicRoster(given);
  const D = defs();
  const frame = boardingFrame(t, { variant });
  const { at, reduced } = frame;
  let picture = '';
  if (frame.shot === 'inside') {
    const cam = cameraOf(W, H, 'inside', at);
    const room = corridorSvg(D, at, reduced);
    picture += `<g transform="${camT(cam)}">${room.back}${crewInside(D, roster, at, W, H, reduced, room.lit)}${room.air}</g>`;
    if (!reduced) picture += dust({ seed: 71, n: 60, t: at, box: [0, 0, W, H], size: [0.6, 1.6], color: '#EAF3FF', opacity: 0.6 * room.lit, lightAt: () => 0.5 });
  } else {
    const cam = cameraOf(W, H, frame.shot, at);
    const far = `<g transform="${camT({ ...cam, s: cam.s * 0.92, x: W / 2 - cam.cx * cam.s * 0.92, y: H / 2 - cam.cy * cam.s * 0.92 })}">${skySvg(D, at)}</g>`;
    const mid = `<g transform="${camT({ ...cam, s: cam.s * 0.97, x: W / 2 - cam.cx * cam.s * 0.97, y: H / 2 - cam.cy * cam.s * 0.97 })}">${mesasSvg(D)}</g>`;
    const [jx, jy] = reduced ? [0, 0] : shake(at, ENTRANCE.door[1], { amp: 3, ms: 260, seed: 4 });
    const near = `<g transform="translate(${f(jx)} ${f(jy)}) ${camT(cam)}">${groundSvg(D)}${shipBody()}${shipLive(D, at, reduced)}${crewOutside(D, roster, at, reduced)}</g>`;
    picture += far + mid + near;
    if (!reduced) {
      const spill = { from: [DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h * 0.55], to: [RAMP.foot[0] + 120, GROUND + 70], w0: DOOR.w * 0.9, w1: 420 };
      picture += `<g transform="${camT(cam)}">${dust({ seed: 81, n: 90, t: at, box: [300, 300, 900, 420], size: [0.8, 2.2], color: '#FFEBC8', opacity: 0.9 * (1 - progress(at, ...ENTRANCE.lightOut)), lightAt: (x, y) => inBeam([x, y], spill) * 2 })}</g>`;
    }
  }
  // The cut inside is from the dark: the outside's last moments go down to black.
  if (!reduced && frame.shot === 'ramp') picture += `<rect width="${W}" height="${H}" fill="#000" opacity="${f3(ease.inCubic(progress(at, 6720, 6900)) * 0.9)}"/>`;
  if (!reduced && frame.shot === 'inside') picture += `<rect width="${W}" height="${H}" fill="#000" opacity="${f3(1 - ease.outCubic(progress(at, 6900, 7150)))}"/>`;
  picture += titleSvg(D, W, H, at, reduced);
  const tide = reduced ? 0 : ease.inCubic(progress(t, ...TITLE.tide));
  let out = `<rect width="${W}" height="${H}" fill="${NIGHT}"/><g opacity="${f3(frame.fade)}">${picture}${finish(D, 'bd-fin', { width: W, height: H, t: reduced ? 0 : t, grain: 0.08 * (1 - tide), vignette: 0.6 * (1 - tide), grade: '#2A2848', gradeOpacity: 0.14 })}</g>`;
  if (!reduced) out += inkTide({ width: W, height: H, v: tide, seed: 21, color: NIGHT });
  if (t >= TITLE.night) out += `<rect width="${W}" height="${H}" fill="${NIGHT}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${D.markup()}${out}</svg>`;
}

export const BOARDING_TEXT = 'The crew boards the ship.';

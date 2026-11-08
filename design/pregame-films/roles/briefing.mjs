// mothership:dev-only
//
// The role films' opener: the briefing room at the dock, the night before the voyage (the owner,
// 6 November 2026: "the character, before boarding the spaceship, picks up the gadget from a table
// with the card on it"). Redrawn for the owner's "AAA animation" (8 November 2026) in the crew's own
// ink (design/crew-drawing/source/ink.mjs), lit as a noir shot:
//   - through a tall viewport, the Mothership waits at its dock: its hull in the dock's floodlights,
//     rows of lit ports, running lights blinking, the gantry over it, a planet's limb below, stars;
//   - venetian blinds half-closed over the top of the glass; the dock's cold light comes through
//     their gaps in beams, with dust turning in them, and lies in stripes across the room;
//   - a gooseneck desk lamp pools warm light on the player's role card in its holder, drawn as the
//     phone draws the card; the role's gadget stands beside it; a mug steams in the foreground, out
//     of focus;
//   - the player's own character (the approved crew drawing) stands behind the desk against the
//     glass, rimmed by the dock light and lit warm from below by the lamp. Their weight shifts, they
//     lean in, take the gadget and raise it into the light, and look at it; it glints;
//   - the camera pushes in over the three seconds, the near layers more than the far.
// Every role shares this scene and its timing; only the card and the gadget are the role's.

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { blend } from '../../board-motion/figures/motion.mjs';
import { crewCardSvg } from '../../crew-drawing/source/portrait.mjs';
import { CREW } from '../../crew-drawing/source/crew.mjs';
import { inkCanvas } from '../../crew-drawing/source/ink.mjs';
import { litFigure, onPage } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glint, glow, halftone, inBeam, linear, pool, radial, streak } from '../kit/fx.mjs';
import { inkWord } from '../kit/letters.mjs';
import { clamp01, f, f3, hash, lerp, nest, noise, rng, smooth } from '../kit/math.mjs';

export const NIGHT = Object.freeze({
  ink: '#0B0E15', deep: '#070A11', navy: '#0F1626', wall: '#141C2E', wallLit: '#24304A', steel: '#2B3549', steelLit: '#4A5875', steelPale: '#8E9BB3',
  dock: '#CFE0FF', lamp: '#FFC66E', lampHot: '#FFE7B5', paper: '#F1E6D2', paperShade: '#DCCDB2',
});

// ---------- the pickup's poses ----------

const STAND = skeletonOf('stand');
// The crew's heads look three-quarter left (design/crew-drawing/source/head.mjs), so the character
// takes the gadget with the arm on the left of the picture (the rig's far arm, F) and raises it on
// the side they look to.
const withFarArm = (base, { eF, wF, handF }, { head, neck, tilt, view } = {}) => ({
  ...base, eF, wF, handF,
  ...(head ? { head } : {}), ...(neck ? { neck } : {}), ...(tilt === undefined ? {} : { tilt }), ...(view ? { view } : {}),
  order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'],
});
const LEAN = { head: [STAND.head[0] - 7, STAND.head[1] + 9], neck: [STAND.neck[0] - 4, STAND.neck[1] + 4], tilt: -12, view: 'front' };

/** The pickup's key poses (the approved pilot's moves, on the far arm). */
export const POSES = Object.freeze({
  stand: { ...STAND, view: 'front', tilt: -5, head: [STAND.head[0] - 2, STAND.head[1] + 3] },
  set: { ...STAND, view: 'front', tilt: 3, head: [STAND.head[0] + 1, STAND.head[1] - 2], neck: [STAND.neck[0] + 1, STAND.neck[1] - 1] },
  reach: withFarArm(STAND, { eF: [12, 108], wF: [14, 146], handF: { angle: 85, type: 'open' } }, LEAN),
  grip: withFarArm(STAND, { eF: [12, 108], wF: [14, 146], handF: { angle: 85, type: 'fist' } }, LEAN),
  raise: withFarArm(STAND, { eF: [4, 100], wF: [10, 66], handF: { angle: -100, type: 'fist' } }, { head: [STAND.head[0] - 1, STAND.head[1] - 1], tilt: 6, view: 'front' }),
});

/** The pose at the opener's moment (clock.mjs opener()). */
export function pickupPose(o) {
  if (o.raise > 0) {
    const p = blend(POSES.grip, POSES.raise, o.raise);
    return { ...p, view: 'front', order: POSES.raise.order };
  }
  const base = o.anticipate > 0 && o.reach < 0.3 ? blend(POSES.stand, POSES.set, o.anticipate) : POSES.stand;
  const to = o.grip ? POSES.grip : POSES.reach;
  const p = blend(base, to, o.reach);
  return { ...p, view: 'front', order: to.order };
}

// ---------- layout ----------

/** Where the room is on a W x H phone (the design is drawn at 844 px tall and scaled by height). */
export function layout(W, H) {
  const u = H / 844;
  const cx = W / 2;
  const win = { x: Math.max(14 * u, cx - 172 * u), y: 30 * u, w: Math.min(W - 28 * u, 344 * u), h: 458 * u };
  const deskBack = 548 * u, deskFront = 604 * u;
  const scale = 1.94 * u;
  const at = [cx + 22 * u, deskBack + 189 * u];
  const card = { x: cx + 70 * u, y: deskBack - 82 * u, w: 80 * u, h: 109 * u };
  // The gadget stands where the reaching hand closes on it (POSES.grip's wrist).
  const grip = [at[0] + (14 - 62) * scale, at[1] + (146 - 233) * scale];
  const gadget = { x: grip[0] - 2 * u, y: grip[1] + 6 * u, s: 0.95 * u };
  // The lamp stands on the right, behind the card, bending over it (drawn mirrored).
  return { u, cx, win, deskBack, deskFront, scale, at, card, gadget, lamp: { base: [cx + 168 * u, deskBack + 14 * u], head: [cx + 108 * u, 392 * u] }, mug: { x: cx - 150 * u, y: deskFront + 4 * u, s: 1.2 * u } };
}

// ---------- the view: space, the planet and the Mothership ----------

function starsSvg(L, t, seed = 41) {
  const { win, u } = L;
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < 170; i += 1) {
    const x = win.x + r() * win.w, y = win.y + r() * win.h * 0.92, b = r() ** 3, s = (0.35 + b * 1.2) * u;
    const tw = 0.6 + 0.4 * noise(t * 0.003 + i * 7.3, seed);
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#E8EEFA" opacity="${f3((0.25 + 0.75 * b) * tw)}"/>`;
  }
  return out;
}

/** The Mothership at its dock, in profile: drawn once (per size) in the crew's ink. */
const shipCache = new Map();
export function mothershipSvg(prefix) {
  if (shipCache.has(prefix)) return shipCache.get(prefix);
  const cv = inkCanvas(prefix);
  const hull = '#3A4560', hullLit = '#56637F', belly = '#232B3D', trim = '#7D8AA6';
  // The engine block (back, left), the long hull, the dorsal ridge and the bridge (front, right).
  cv.form([[-150, -6], [-138, -22], [-96, -26], [-90, 18], [-136, 20], [-152, 8]], belly, { weight: 2, depth: 4, seed: 61 });
  cv.form([[-112, -24], [40, -30], [118, -20], [150, -4], [152, 6], [118, 18], [-20, 24], [-112, 20]], hull, { weight: 2.2, depth: 6, seed: 62, tension: 0.6 });
  cv.form([[-60, -27], [-40, -42], [30, -44], [70, -32], [76, -26], [-50, -26]], hullLit, { weight: 1.8, depth: 3, seed: 63, tension: 0.7 });
  cv.form([[60, -40], [74, -56], [98, -56], [106, -40], [104, -30], [64, -30]], hullLit, { weight: 1.8, depth: 3, seed: 64, tension: 0.5 });
  cv.form([[-30, 22], [70, 18], [96, 26], [-20, 32]], belly, { weight: 1.6, depth: 2, seed: 65, tension: 0.5 });
  // Engine bells.
  for (const [y, s] of [[-14, 1], [2, 1.1], [16, 0.9]]) cv.form([[-150, y - 6 * s], [-162, y - 8 * s], [-166, y], [-162, y + 8 * s], [-150, y + 6 * s]], '#1A2131', { weight: 1.6, depth: 2, seed: 66 + y, tension: 0.6 });
  // Panel lines and a trim stripe.
  for (const x of [-80, -40, 0, 40, 80]) cv.line([[x, -26], [x + 2, 20]], { weight: 0.9, color: '#151A26', taper: 'none' });
  cv.line([[-110, -4], [140, -2]], { weight: 1.6, color: trim, taper: 'both' });
  cv.line([[-100, 10], [110, 12]], { weight: 0.8, color: '#151A26', taper: 'none' });
  // The bridge's glass.
  cv.form([[82, -52], [100, -52], [103, -44], [80, -44]], '#2B3247', { weight: 1.2, depth: 0, rim: false, hatch: false, grain: false, seed: 67 });
  const svg = cv.svg({ viewBox: '-175 -70 340 110' });
  const out = { svg, box: [-175, -70, 340, 110] };
  shipCache.set(prefix, out);
  return out;
}

/** The ship's ports and running lights at time t (in the ship's own units). */
function shipLights(t, reduced) {
  let out = '';
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 22; i += 1) {
      const x = -96 + i * 10 + row * 5, y = -14 + row * 14;
      if (hash(i * 7 + row, 3) < 0.28) continue;
      const on = reduced ? 1 : 0.75 + 0.25 * Math.sin(t / 900 + i);
      out += `<rect x="${f(x)}" y="${f(y)}" width="3.6" height="2.2" rx="0.6" fill="#FFD48A" opacity="${f3(on)}"/>`;
    }
  }
  out += `<rect x="84" y="-50.5" width="16" height="3" rx="1" fill="#FFE9B8" opacity="0.9"/>`;
  const blink = reduced ? 1 : (Math.floor(t / 600) % 2 === 0 ? 1 : 0.25);
  out += `<circle cx="150" cy="0" r="2.2" fill="#FFFFFF" opacity="${f3(blink)}"/><circle cx="-60" cy="-42" r="1.8" fill="#FFE2A0" opacity="${f3(1.25 - blink)}"/>`;
  out += `<g opacity="0.95">${[-14, 2, 16].map(y => `<ellipse cx="-170" cy="${y}" rx="9" ry="5" fill="#BFD3F5" opacity="0.5"/><ellipse cx="-167" cy="${y}" rx="4.5" ry="3.2" fill="#F4F8FF"/>`).join('')}</g>`;
  return out;
}

function viewSvg(D, L, t, o, reduced) {
  const { win, u } = L;
  const sky = linear(D, 'bf-sky', [[0, '#05070D'], [0.55, '#0A1020'], [1, '#121C33']]);
  let out = `<rect x="${f(win.x)}" y="${f(win.y)}" width="${f(win.w)}" height="${f(win.h)}" fill="${sky}"/>`;
  out += pool(D, 'bf-neb1', { cx: win.x + win.w * 0.72, cy: win.y + win.h * 0.22, rx: 170 * u, ry: 90 * u, color: '#3A4E7A', opacity: 0.35, core: 0.05 });
  out += pool(D, 'bf-neb2', { cx: win.x + win.w * 0.2, cy: win.y + win.h * 0.4, rx: 120 * u, ry: 70 * u, color: '#5B4A6E', opacity: 0.22, core: 0.05 });
  out += starsSvg(L, reduced ? 0 : t);
  // The planet's limb, low in the glass, lit from the right.
  const pcx = win.x - 40 * u, pcy = win.y + win.h + 150 * u, pr = 300 * u;
  const planet = radial(D, 'bf-planet', [[0, '#3B4A63'], [0.7, '#28324A'], [1, '#141B2B']], { cx: 0.62, cy: 0.35, r: 0.7 });
  out += `<circle cx="${f(pcx)}" cy="${f(pcy)}" r="${f(pr)}" fill="${planet}"/>`;
  out += `<circle cx="${f(pcx)}" cy="${f(pcy)}" r="${f(pr)}" fill="none" stroke="#B4BCCB" stroke-width="${f(2.4 * u)}" opacity="0.55"/>`;
  out += `<circle cx="${f(pcx)}" cy="${f(pcy)}" r="${f(pr + 6 * u)}" fill="none" stroke="#7D8698" stroke-width="${f(10 * u)}" opacity="0.18" filter="${blurFilter(D, 'bf-atmo', 5 * u)}"/>`;
  for (let i = 0; i < 4; i += 1) out += `<path d="M${f(pcx - pr)} ${f(pcy - pr * (0.2 + i * 0.16))}Q${f(pcx)} ${f(pcy - pr * (0.32 + i * 0.16))} ${f(pcx + pr)} ${f(pcy - pr * (0.18 + i * 0.16))}" stroke="#4A5A78" stroke-width="${f(1.4 * u)}" fill="none" opacity="0.4"/>`;
  // The dock's gantry and its floodlights, then the ship.
  const ship = mothershipSvg('bf-ship');
  const sw = win.w * 1.12, sk = sw / 340, sx = win.x + win.w * 0.5 + (reduced ? 0 : Math.sin(t / 2600) * 1.4 * u), sy = win.y + win.h * 0.44;
  const gantry = `<path d="M${f(sx - 70 * sk)} ${f(win.y)}L${f(sx - 52 * sk)} ${f(sy - 34 * sk)}M${f(sx + 30 * sk)} ${f(win.y)}L${f(sx + 18 * sk)} ${f(sy - 40 * sk)}" stroke="#1B2232" stroke-width="${f(5 * u)}"/>`
    + `<path d="M${f(sx - 66 * sk)} ${f(win.y + 30 * u)}L${f(sx + 28 * sk)} ${f(win.y + 30 * u)}M${f(sx - 62 * sk)} ${f(win.y + 70 * u)}L${f(sx + 25 * sk)} ${f(win.y + 70 * u)}" stroke="#1B2232" stroke-width="${f(3 * u)}"/>`;
  out += gantry;
  out += `<g transform="translate(${f(sx)} ${f(sy)}) scale(${f3(sk)})">${ship.svg.replace(/^<svg[^>]*>/, '<g>').replace(/<\/svg>$/, '</g>')}${shipLights(t, reduced)}</g>`;
  // Floodlight cones from the gantry onto the hull.
  for (const [gx, k] of [[sx - 56 * sk, 0], [sx + 20 * sk, 1]]) {
    out += beam(D, `bf-flood${k}`, { from: [gx, win.y + 76 * u], to: [gx + (k ? 30 : -24) * u, sy - 20 * sk], w0: 8 * u, w1: 90 * u, color: '#DCE8FF', opacity: 0.22, soft: 6 * u });
    out += glow(D, `bf-floodlamp${k}`, { cx: gx, cy: win.y + 76 * u, r: 18 * u, color: '#EAF2FF', opacity: 0.9 });
  }
  return `<g filter="${blurFilter(D, 'bf-dof-far', 1.3 * u)}">${out}</g>`;
}

// ---------- the room ----------

/** The blinds' slats over the top of the glass, half-closed: [y, thickness] in px. */
function slatsOf(L) {
  const { win, u } = L;
  const out = [];
  for (let y = win.y + 6 * u; y < win.y + win.h * 0.3; y += 14 * u) out.push([y, 8.5 * u]);
  return out;
}

function roomSvg(D, L, t, o, reduced) {
  const { win, u, deskBack } = L;
  const W = L.cx * 2;
  const wall = linear(D, 'bf-wall', [[0, '#0C1322'], [0.6, '#090E1A'], [1, '#05080F']]);
  let out = `<rect x="${f(-W)}" y="${f(-200 * u)}" width="${f(W * 3)}" height="${f(1400 * u)}" fill="${wall}"/>`;
  out += `<rect x="${f(-W)}" y="${f(-200 * u)}" width="${f(W * 3)}" height="${f(1400 * u)}" fill="${halftone(D, 'bf-wall-dots', { size: 5 * u, r: 1.05 * u, color: '#1B2438', angle: 30 })}" opacity="0.6"/>`;
  // Wall panels either side of the glass.
  for (const x of [win.x - 4 * u, win.x + win.w + 4 * u]) out += `<path d="M${f(x)} ${f(-50 * u)}V${f(deskBack)}" stroke="#060910" stroke-width="${f(3 * u)}"/>`;
  // The glass, then the blinds over its top.
  out += viewSvg(D, L, t, o, reduced);
  const slats = slatsOf(L);
  const slatGrad = linear(D, 'bf-slat', [[0, '#3C475E'], [0.5, '#232B3C'], [1, '#141A27']]);
  out += slats.map(([y, h]) => `<rect x="${f(win.x)}" y="${f(y)}" width="${f(win.w)}" height="${f(h)}" fill="${slatGrad}"/><path d="M${f(win.x)} ${f(y + 0.6 * u)}H${f(win.x + win.w)}" stroke="#7F8CA6" stroke-width="${f(0.9 * u)}" opacity="0.7"/><path d="M${f(win.x)} ${f(y + h)}H${f(win.x + win.w)}" stroke="#05070B" stroke-width="${f(1.2 * u)}"/>`).join('');
  out += `<path d="M${f(win.x + win.w * 0.12)} ${f(win.y)}V${f(slats.at(-1)[0] + 30 * u)}M${f(win.x + win.w * 0.88)} ${f(win.y)}V${f(slats.at(-1)[0] + 22 * u)}" stroke="#0A0D14" stroke-width="${f(1.2 * u)}"/>`;
  out += `<circle cx="${f(win.x + win.w * 0.12)}" cy="${f(slats.at(-1)[0] + 32 * u)}" r="${f(3 * u)}" fill="#1B2232"/>`;
  // The frame round the glass: thick steel, inked, bolted, catching the dock's light on its inside edge.
  const frameW = 13 * u;
  const steel = linear(D, 'bf-frame', [[0, '#3A4459'], [0.5, '#232B3B'], [1, '#161C29']]);
  out += `<path d="M${f(win.x - frameW)} ${f(win.y - frameW)}H${f(win.x + win.w + frameW)}V${f(win.y + win.h + frameW)}H${f(win.x - frameW)}Z M${f(win.x)} ${f(win.y)}V${f(win.y + win.h)}H${f(win.x + win.w)}V${f(win.y)}Z" fill="${steel}" fill-rule="evenodd" stroke="${NIGHT.ink}" stroke-width="${f(2.6 * u)}"/>`;
  out += `<path d="M${f(win.x)} ${f(win.y + win.h)}H${f(win.x + win.w)}V${f(win.y)}" fill="none" stroke="#B9C9E6" stroke-width="${f(1.3 * u)}" opacity="0.55"/>`;
  for (const [bx, by] of [[win.x - frameW / 2, win.y - frameW / 2], [win.x + win.w + frameW / 2, win.y - frameW / 2], [win.x - frameW / 2, win.y + win.h + frameW / 2], [win.x + win.w + frameW / 2, win.y + win.h + frameW / 2], [win.x - frameW / 2, win.y + win.h / 2], [win.x + win.w + frameW / 2, win.y + win.h / 2]]) {
    out += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(3.2 * u)}" fill="#0B0F17"/><circle cx="${f(bx - 0.8 * u)}" cy="${f(by - 0.8 * u)}" r="${f(1.2 * u)}" fill="#6E7B95"/>`;
  }
  return out;
}

/** The dock's cold light through the blinds' gaps: beams into the room, each gap's own. */
function slatBeams(L, k) {
  const { win, u, deskBack } = L;
  const slats = slatsOf(L);
  const out = [];
  for (let i = 0; i < slats.length - 1; i += 1) {
    const y0 = slats[i][0] + slats[i][1], y1 = slats[i + 1][0];
    const gy = (y0 + y1) / 2;
    const from = [win.x + win.w * 0.62, gy];
    const to = [win.x + win.w * 0.62 - 210 * u, gy + 470 * u];
    out.push({ from, to, w0: (y1 - y0) * 0.9 + 2 * u, w1: (y1 - y0) * 2.2 + 30 * u, k: k * (0.55 + 0.45 * hash(i, 9)) });
  }
  return out.filter(b => b.to[1] > deskBack - 200 * u);
}

function deskSvg(D, L) {
  const { u, deskBack, deskFront } = L;
  const W = L.cx * 2;
  const top = linear(D, 'bf-desk-top', [[0, '#1E2636'], [1, '#121824']]);
  const face = linear(D, 'bf-desk-face', [[0, '#121826'], [0.2, '#0A0E17'], [1, '#04060B']]);
  let out = `<path d="M${f(-20 * u)} ${f(deskBack)}H${f(W + 20 * u)}L${f(W + 40 * u)} ${f(deskFront)}H${f(-40 * u)}Z" fill="${top}" stroke="${NIGHT.ink}" stroke-width="${f(2.4 * u)}"/>`;
  out += `<path d="M${f(-40 * u)} ${f(deskFront)}H${f(W + 40 * u)}V${f(deskFront + 400 * u)}H${f(-40 * u)}Z" fill="${face}" stroke="${NIGHT.ink}" stroke-width="${f(2.4 * u)}"/>`;
  out += `<path d="M${f(-40 * u)} ${f(deskFront + 1.5 * u)}H${f(W + 40 * u)}" stroke="#7D8AA6" stroke-width="${f(1.6 * u)}" opacity="0.65"/>`;
  out += `<path d="M${f(-20 * u)} ${f(deskBack + 1 * u)}H${f(W + 20 * u)}" stroke="#56627C" stroke-width="${f(1 * u)}" opacity="0.6"/>`;
  // The face's lip and rivets.
  out += `<path d="M${f(-40 * u)} ${f(deskFront + 14 * u)}H${f(W + 40 * u)}" stroke="#05070B" stroke-width="${f(2 * u)}"/>`;
  for (let x = 14 * u; x < W; x += 46 * u) out += `<circle cx="${f(x)}" cy="${f(deskFront + 7 * u)}" r="${f(1.7 * u)}" fill="#05070B"/><circle cx="${f(x - 0.5 * u)}" cy="${f(deskFront + 6.4 * u)}" r="${f(0.7 * u)}" fill="#59657E"/>`;
  out += `<rect x="${f(-40 * u)}" y="${f(deskFront)}" width="${f(W + 80 * u)}" height="${f(400 * u)}" fill="${halftone(D, 'bf-face-dots', { size: 4.5 * u, r: 1.1 * u, color: '#000000', angle: 45 })}" opacity="0.35"/>`;
  return out;
}

// ---------- props ----------

/** The Doctor's injector, drawn in the crew's ink at the device's shapes, without its team colour. */
const gadgetCache = new Map();
export function injectorSvg(prefix) {
  if (gadgetCache.has(prefix)) return gadgetCache.get(prefix);
  const cv = inkCanvas(prefix);
  const steel = '#AEB9CB', steelDark = '#5A667E', glass = '#CFDAE6';
  cv.form([[66, 56], [78, 56], [79, 114], [72, 118], [65, 114]], '#3A465E', { weight: 2.6, depth: 3, seed: 81, tension: 0.4 });
  cv.form([[46, 44], [57, 44], [57, 53], [46, 53]], steelDark, { weight: 2.2, depth: 2, seed: 82, tension: 0.3 });
  cv.form([[100, 42], [115, 46.5], [115, 51.5], [100, 56]], steelDark, { weight: 2.2, depth: 2, seed: 83, tension: 0.2 });
  cv.line([[115, 49], [123, 49]], { weight: 2, color: NIGHT.ink, taper: 'end' });
  cv.form([[57, 38], [99, 38], [102, 42], [102, 56], [99, 60], [57, 60], [54, 56], [54, 42]], steel, { weight: 2.8, depth: 5, seed: 84, tension: 0.35 });
  cv.flat([[60, 41], [94, 41], [94, 44], [60, 44]], '#E8EEF6', { opacity: 0.8, tension: 0.2 });
  for (const x of [60, 81]) {
    cv.form([[x, 19], [x + 13, 19], [x + 13, 40], [x, 40]], glass, { weight: 2.4, depth: 2, seed: 85 + x, tension: 0.35, hatch: false });
    cv.flat([[x + 2.5, 27], [x + 10.5, 27], [x + 10.5, 38], [x + 2.5, 38]], '#F4F8FF', { opacity: 0.95, tension: 0.4 });
    cv.line([[x + 3.6, 22], [x + 3.6, 34]], { weight: 1.6, color: '#FFFFFF', taper: 'both' });
    cv.form([[x + 2, 14.5], [x + 11, 14.5], [x + 11, 20.5], [x + 2, 20.5]], '#2E374A', { weight: 1.8, depth: 1, seed: 87 + x, tension: 0.3 });
  }
  cv.form([[61, 49], [68, 42], [75, 49], [68, 56]], '#1C2333', { weight: 1.8, depth: 0, seed: 89, rim: false, hatch: false, grain: false, tension: 1 });
  cv.flat([[66, 44.5], [70, 44.5], [70, 47], [72.5, 47], [72.5, 51], [70, 51], [70, 53.5], [66, 53.5], [66, 51], [63.5, 51], [63.5, 47], [66, 47]], '#F4EBDD', { tension: 0 });
  const out = { svg: cv.svg({ viewBox: '40 8 90 116' }), grip: [72, 92], vials: [[66.5, 29], [87.5, 29]], box: [40, 8, 90, 116] };
  gadgetCache.set(prefix, out);
  return out;
}

/** A role's gadget on the page: its grip at (x, y), turned `angle`, `s` px per device unit. */
function placeGadget(g, [x, y], angle, s) {
  const [bx, by, bw, bh] = g.box;
  const inner = g.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f3(angle)}) scale(${f3(s)}) translate(${f(-g.grip[0])} ${f(-g.grip[1])})"><svg x="${bx}" y="${by}" width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="visible">${inner}</svg></g>`;
}
/** A device point on the page, under placeGadget's placement. */
function gadgetPoint(g, [x, y], angle, s, [px, py]) {
  const a = (angle * Math.PI) / 180, dx = (px - g.grip[0]) * s, dy = (py - g.grip[1]) * s;
  return [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** The role card in its holder, drawn as the phone draws it: the character's card art with the role's device, the name plate and the team line. */
function roleCardSvg(D, L, { character, role, assets }) {
  const { card, u } = L;
  const art = { x: card.x + 5 * u, y: card.y + 5 * u, w: card.w - 10 * u, h: (card.w - 10 * u) * 0.9 };
  const person = crewCardSvg(CREW[character], { prefix: `bf-card-${character}` });
  const device = assets?.devices?.[role.device] ?? '';
  const plateY = art.y + art.h;
  const teamColor = { blue: '#70AFFF', red: '#FF8C8C', alien: '#C4A4FF' }[role.team];
  const name = inkWord(D, 'bf-card-name', role.name.toUpperCase(), { x: card.x + 9 * u + 0.5 * (role.name.length * 5.6 * u), y: plateY + 13 * u, size: 9.5 * u, skew: 0, weight: 1.3, inkWeight: 0.35, face: { top: NIGHT.ink, mid: NIGHT.ink, bottom: NIGHT.ink, side: NIGHT.ink, sideDeep: NIGHT.ink, ink: NIGHT.ink, highlight: NIGHT.ink }, depth: 0, shadow: 0, rough: false, hot: false, tracking: 1.1 });
  const team = inkWord(D, 'bf-card-team', `${role.team.toUpperCase()} TEAM`, { x: card.x + 19 * u + 0.5 * ((role.team.length + 5) * 3.3 * u), y: plateY + 26 * u, size: 5 * u, skew: 0, weight: 1.1, inkWeight: 0.2, face: { top: '#3A3A3A', mid: '#3A3A3A', bottom: '#3A3A3A', side: '#000', sideDeep: '#000', ink: '#3A3A3A', highlight: '#3A3A3A' }, depth: 0, shadow: 0, rough: false, hot: false, tracking: 1.2 });
  return `<g>`
    + `<rect x="${f(card.x + 4 * u)}" y="${f(card.y + 6 * u)}" width="${f(card.w)}" height="${f(card.h)}" rx="${f(5 * u)}" fill="#000" opacity="0.55" filter="${blurFilter(D, 'bf-card-shadow', 4 * u)}"/>`
    + `<rect x="${f(card.x)}" y="${f(card.y)}" width="${f(card.w)}" height="${f(card.h)}" rx="${f(5 * u)}" fill="${NIGHT.paper}" stroke="${NIGHT.ink}" stroke-width="${f(2.2 * u)}"/>`
    + `<rect x="${f(art.x)}" y="${f(art.y)}" width="${f(art.w)}" height="${f(art.h)}" fill="#E4D6BE"/>`
    + `<rect x="${f(art.x)}" y="${f(art.y)}" width="${f(art.w)}" height="${f(art.h)}" fill="${halftone(D, 'bf-card-dots', { size: 3 * u, r: 0.55 * u, color: '#B8A688' })}"/>`
    + nest(person, { x: art.x - 2 * u, y: art.y + 2 * u, width: art.w * 0.82, height: art.h })
    + (device ? nest(device, { x: art.x + art.w * 0.38, y: art.y, width: art.w * 0.66, height: art.h * 1.02 }) : '')
    + `<path d="M${f(art.x)} ${f(plateY)}H${f(art.x + art.w)}" stroke="${NIGHT.ink}" stroke-width="${f(1.8 * u)}"/>`
    + name.svg
    + `<rect x="${f(card.x + 9 * u)}" y="${f(plateY + 22.5 * u)}" width="${f(6 * u)}" height="${f(6 * u)}" fill="${teamColor}" stroke="${NIGHT.ink}" stroke-width="${f(0.8 * u)}"/>`
    + team.svg
    // The holder: a steel clip and foot.
    + `<path d="M${f(card.x + card.w * 0.2)} ${f(card.y + card.h - 4 * u)}h${f(card.w * 0.6)}l${f(10 * u)} ${f(18 * u)}h${f(-card.w * 0.6 - 20 * u)}Z" fill="#2B3446" stroke="${NIGHT.ink}" stroke-width="${f(2 * u)}" stroke-linejoin="round"/>`
    + `</g>`;
}

/** The gooseneck desk lamp, its head over the card, lit inside. */
function deskLampSvg(D, L, lamp) {
  const { u, cx } = L;
  // Drawn as a lamp standing on the left, then mirrored about the page's middle onto the right.
  const [bx, by] = [2 * cx - L.lamp.base[0], L.lamp.base[1]], [hx, hy] = [2 * cx - L.lamp.head[0], L.lamp.head[1]];
  return `<g transform="translate(${f(2 * cx)} 0) scale(-1 1)">${lampDrawing(D, { u, bx, by, hx, hy, lamp })}</g>`;
}
function lampDrawing(D, { u, bx, by, hx, hy, lamp }) {
  const neck = `M${f(bx)} ${f(by - 6 * u)}C${f(bx - 2 * u)} ${f(by - 80 * u)} ${f(bx - 30 * u)} ${f(hy - 30 * u)} ${f(hx - 30 * u)} ${f(hy - 40 * u)}S${f(hx - 8 * u)} ${f(hy - 26 * u)} ${f(hx - 4 * u)} ${f(hy - 18 * u)}`;
  return `<path d="${neck}" fill="none" stroke="${NIGHT.ink}" stroke-width="${f(7 * u)}" stroke-linecap="round"/>`
    + `<path d="${neck}" fill="none" stroke="#3B465C" stroke-width="${f(3.6 * u)}" stroke-linecap="round"/>`
    + `<path d="${neck}" fill="none" stroke="#8C9AB4" stroke-width="${f(1 * u)}" stroke-linecap="round" opacity="0.6" transform="translate(${f(-1 * u)} 0)"/>`
    + `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="${f(26 * u)}" ry="${f(7 * u)}" fill="#1E2535" stroke="${NIGHT.ink}" stroke-width="${f(2.2 * u)}"/>`
    + `<g transform="translate(${f(hx)} ${f(hy)}) rotate(28)">`
    + `<path d="M${f(-34 * u)} 0C${f(-30 * u)} ${f(-22 * u)} ${f(-10 * u)} ${f(-30 * u)} ${f(4 * u)} ${f(-28 * u)}C${f(18 * u)} ${f(-26 * u)} ${f(30 * u)} ${f(-14 * u)} ${f(32 * u)} 0Z" fill="#2E3849" stroke="${NIGHT.ink}" stroke-width="${f(2.4 * u)}" stroke-linejoin="round"/>`
    + `<path d="M${f(-22 * u)} ${f(-18 * u)}C${f(-14 * u)} ${f(-24 * u)} ${f(-2 * u)} ${f(-26 * u)} ${f(8 * u)} ${f(-24 * u)}" stroke="#8C9AB4" stroke-width="${f(1.4 * u)}" fill="none" opacity="0.7"/>`
    + `<ellipse cx="${f(-1 * u)}" cy="0" rx="${f(31 * u)}" ry="${f(6 * u)}" fill="${NIGHT.lampHot}" opacity="${f3(0.2 + 0.8 * lamp)}"/>`
    + `</g>`
    + glow(D, 'bf-lamp-bulb', { cx: hx + 2 * u, cy: hy + 6 * u, r: 46 * u, color: NIGHT.lampHot, opacity: 0.85 * lamp });
}

/** The mug in the foreground, out of focus, with its steam curling up through the lamp's light. */
function mugSvg(D, L, t, reduced) {
  const { mug, u } = L;
  const s = mug.s;
  let steam = '';
  if (!reduced) {
    for (let i = 0; i < 3; i += 1) {
      const pts = [];
      for (let k = 0; k <= 12; k += 1) {
        const y = -k * 9;
        const x = Math.sin(k * 0.55 + t / 520 + i * 2.1) * (3 + k * 1.1) + noise(t / 700 + k * 0.3, i + 3) * 4 + (i - 1) * 8;
        pts.push([x, y]);
      }
      steam += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="#F3EAD9" stroke-width="${f(5 - i)}" stroke-linecap="round" opacity="${f3(0.16 + 0.05 * i)}"/>`;
    }
  }
  return `<g transform="translate(${f(mug.x)} ${f(mug.y)}) scale(${f3(s)})">`
    + `<g filter="${blurFilter(D, 'bf-steam', 3)}" transform="translate(0 -70)">${steam}</g>`
    + `<g filter="${blurFilter(D, 'bf-mug-dof', 3.2)}">`
    + `<path d="M-30 -66H30L26 0Q24 8 14 8H-14Q-24 8 -26 0Z" fill="#26304A" stroke="${NIGHT.ink}" stroke-width="3"/>`
    + `<path d="M28 -50Q50 -48 48 -30Q46 -12 26 -14" fill="none" stroke="${NIGHT.ink}" stroke-width="9"/><path d="M28 -50Q50 -48 48 -30Q46 -12 26 -14" fill="none" stroke="#26304A" stroke-width="5"/>`
    + `<ellipse cx="0" cy="-66" rx="30" ry="6" fill="#141A28" stroke="${NIGHT.ink}" stroke-width="2.4"/>`
    + `<path d="M-22 -58V-6" stroke="#8E9BB3" stroke-width="3" opacity="0.6"/>`
    + `</g></g>`;
}

/** The opener's framing: a medium close shot of the character over the desk. */
export const ZOOM = 1.32;

/** The lamp's colour as it warms up (a cold filament first). */
const mixWarm = k => (k > 0.6 ? '#FFC27A' : k > 0.3 ? '#F2C391' : '#C9C2B6');

// ---------- the shot ----------

/**
 * The opener at its moment: `o` is clock.mjs's opener(), `role` the role's look ({ name, team,
 * device, gadget }), `character` the player's own crew id. Returns its picture and the glint's point
 * (px), where the memory flash grows from.
 */
export function briefingSvg(D, { W, H, t, o, role, character, assets, reduced }) {
  const L = layout(W, H);
  const { u, at, scale, deskBack } = L;
  const sk = pickupPose(o);
  const g = role.gadget ?? injectorSvg('bf-gadget');
  // The gadget: on the desk, then in the hand, then raised by the face.
  const restAt = [L.gadget.x, L.gadget.y];
  const hand = onPage(at, scale, sk.wF);
  const inHand = o.grip;
  const gripAt = inHand ? [hand[0] - 2 * u, hand[1] + 6 * u] : restAt;
  const gAngle = inHand ? lerp(-4, 12, o.raise) : 0;
  const gScale = L.gadget.s * (inHand ? lerp(1, 1.08, o.raise) : 1);
  const vial = gadgetPoint(g, gripAt, gAngle, gScale, g.vials[1]);

  // The camera: a medium close shot (ZOOM) pushing in over the three seconds, far layers 2.5%, near
  // ones 6.5%, centred on where the gadget is raised.
  const focus = [L.cx + 20 * u, 354 * u];
  const cam = k => `translate(${f(focus[0])} ${f(focus[1])}) scale(${f3(ZOOM * (1 + o.push * k))}) translate(${f(-focus[0])} ${f(-focus[1])})`;
  const lampOn = o.lamp, slats = o.slats;

  let far = roomSvg(D, L, t, o, reduced);
  // The dock light lying in stripes on the back wall below the glass and on the desk.
  const beams = slatBeams(L, slats);
  let air = beams.map((b, i) => beam(D, `bf-slatbeam${i}`, { from: b.from, to: b.to, w0: b.w0, w1: b.w1, color: NIGHT.dock, opacity: 0.11 * b.k, soft: 2.5 * u })).join('');
  if (!reduced) air += dust({ seed: 52, n: 140, t, box: [0, L.win.y, W, deskBack], size: [0.5 * u, 1.6 * u], color: '#EEF3FF', opacity: 0.9 * slats, lightAt: (x, y) => beams.reduce((m, b) => Math.max(m, inBeam([x, y], b) * b.k * 2.2), 0) });

  // The character, lit: rimmed by the dock behind them, warm from the lamp below left, the stripes across them.
  const figure = litFigure(D, 'bf-hero', {
    c: character, sk, at, scale, t, reduced,
    clip: null,
    ambient: { color: '#34456E', strength: 0.82 },
    key: { at: [L.lamp.head[0] - 20 * u, L.lamp.head[1] + 30 * u], z: 85 * u, color: mixWarm(lampOn), gain: 2.1 * lampOn + 0.15 },
    rim: { dx: -0.62, dy: -0.78, color: '#DCE8FF', width: 3.4 * u, gain: 0.25 + 0.75 * slats },
  });
  // Only what stands above the desk's back edge is seen, and the near arm where it reaches over the desk.
  const clipId = 'bf-hero-clip';
  D.use(clipId, `<clipPath id="${clipId}"><rect x="${f(-W)}" y="${f(-H)}" width="${f(W * 3)}" height="${f(H + deskBack + 1 * u)}"/><path d="M${f(L.cx - 28 * u)} ${f(deskBack - 2 * u)}H${f(-W)}V${f(L.deskFront)}H${f(L.cx - 40 * u)}Z"/></clipPath>`);

  // Near: the desk, the lamp, the card, the gadget, the character's arm over the desk, the mug.
  const lampPool = pool(D, 'bf-lamp-pool', { cx: L.card.x + L.card.w * 0.6, cy: deskBack + 26 * u, rx: 150 * u, ry: 46 * u, color: NIGHT.lamp, opacity: 0.55 * lampOn, core: 0.15 });
  const cardLight = pool(D, 'bf-card-light', { cx: L.card.x + L.card.w * 0.55, cy: L.card.y + L.card.h * 0.45, rx: 120 * u, ry: 130 * u, color: NIGHT.lampHot, opacity: 0.35 * lampOn, core: 0.1 });
  const stripes = beams.map((b, i) => `<path d="M${f(b.to[0] - b.w1 * 0.6)} ${f(deskBack)}L${f(b.to[0] + b.w1 * 0.6 + 40 * u)} ${f(deskBack)}L${f(b.to[0] + b.w1 * 0.6 + 10 * u)} ${f(L.deskFront)}L${f(b.to[0] - b.w1 * 0.6 - 30 * u)} ${f(L.deskFront)}Z" fill="${NIGHT.dock}" opacity="${f3(0.07 * b.k)}"/>`).join('');
  const gadgetShadow = `<ellipse cx="${f(restAt[0] + 4 * u)}" cy="${f(restAt[1] + 22 * u)}" rx="${f(26 * u)}" ry="${f(5 * u)}" fill="#000" opacity="${f3(inHand ? 0.15 : 0.6)}" filter="${blurFilter(D, 'bf-gadget-shadow', 2.5 * u)}"/>`;
  // The gadget is drawn over the figure, except where the fist closes round its handle.
  const fistHole = inHand ? `<mask id="bf-fist-hole" maskUnits="userSpaceOnUse" x="${f(-W)}" y="${f(-H)}" width="${f(W * 3)}" height="${f(H * 3)}"><rect x="${f(-W)}" y="${f(-H)}" width="${f(W * 3)}" height="${f(H * 3)}" fill="#fff"/><circle cx="${f(hand[0])}" cy="${f(hand[1])}" r="${f(13 * u)}" fill="#000"/></mask>` : '';
  if (fistHole) D.use('bf-fist-hole', fistHole);
  const gadget = placeGadget(g, gripAt, gAngle, gScale);
  const gadgetLight = `<g style="mix-blend-mode:screen" opacity="${f3(0.35 * lampOn)}">${glow(D, 'bf-gadget-lamp', { cx: gripAt[0] + 10 * u, cy: gripAt[1] - 40 * u, r: 60 * u, color: NIGHT.lampHot, opacity: 0.6 })}</g>`;

  const near = deskSvg(D, L)
    + lampPool + stripes
    + deskLampSvg(D, L, lampOn)
    + gadgetShadow
    + (inHand ? '' : gadget);
  // The card stands on the desk in front of the character.
  const hero = `<g clip-path="url(#${clipId})">${figure}</g>` + (inHand ? `<g${fistHole ? ' mask="url(#bf-fist-hole)"' : ''}>${gadget}</g>${gadgetLight}` : '')
    + roleCardSvg(D, L, { character, role, assets }) + cardLight;

  // The glint, where it catches the light by the face.
  const shine = o.glint > 0 ? glint(D, 'bf-glint', { cx: vial[0], cy: vial[1], r: 34 * u * o.glint, opacity: o.glint, rotate: 12 }) + streak(D, 'bf-glint-streak', { cx: vial[0], cy: vial[1], len: 140 * u * o.glint, thick: 2 * u, color: '#DCE8FF', opacity: 0.8 * o.glint }) : '';

  const body = `<g transform="${cam(0.025)}">${far}</g>`
    + `<g transform="${cam(0.04)}">${air}</g>`
    + `<g transform="${cam(0.065)}">${near}${hero}${shine}</g>`
    + `<g transform="${cam(0.09)}">${mugSvg(D, L, t, reduced)}</g>`;
  // The glint's point under the near layer's push (the flash grows from it).
  const k = ZOOM * (1 + o.push * 0.065);
  const flashAt = [focus[0] + (vial[0] - focus[0]) * k, focus[1] + (vial[1] - focus[1]) * k];
  return { svg: body, flashAt, layout: L };
}

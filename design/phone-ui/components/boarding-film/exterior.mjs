// The boarding film's world outside: runtime source, Designer's. The place of the approved boarding
// (pregame-boarding-1.0.0): a ringed giant over the mesas at dusk, the Mothership low on its legs, its entrance open
// and warm light down the ramp. The same geography, colours and ink; here in planes of depth, so a camera can move
// through it. World units: the approved drawing's 1600 × 900.
//
// Only the ship is a picture drawn once (the crew's ink: hatching, grain, a brush line). Everything else is laid on
// the canvas each frame from shapes kept ready: sharp at any size, and no memory.

import { inkCanvas } from '../../../../apps/game/hosted/crew-drawing/ink.mjs';
import { clamp01, ease, hash, lerp, noise, rng } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { beam, glow, rgba, streak } from './engine.mjs';

export const GROUND = 650;
export const DOOR = Object.freeze({ x: 498, y: 384, w: 92, h: 126 });
export const RAMP = Object.freeze({ sill: Object.freeze([590, 510]), foot: Object.freeze([870, GROUND]) });
export const SUN = Object.freeze([1480, 610]);
export const GIANT = Object.freeze({ x: 690, y: 150, r: 260 });
const INK = '#0B0E15';

/** How deep each plane lies (engine.mjs plane()): 0 at infinity, 1 the ship, more than 1 in front of it. */
export const DEPTH = Object.freeze({ sky: 0.015, giant: 0.045, far: 0.2, near: 0.38, ship: 1, front: 1.9 });

const SKY = [[0, '#0A1028'], [0.42, '#26264A'], [0.66, '#6A4058'], [0.82, '#C26B4C'], [0.92, '#E9A15E'], [1, '#F2C27A']];

/** The stars of the approved sky, in its order of chance: [x, y, brightness]. */
const STARS = (() => {
  const r = rng(91), out = [];
  for (let i = 0; i < 160; i += 1) { const x = -600 + r() * 2800, y = -600 + r() * 760, b = r() ** 3; out.push([x, y, b]); }
  return out;
})();

/** The sky: the dusk's gradient from the night overhead to the low sun's gold, and its stars. */
export function paintSky(ctx, view, T, t) {
  const g = ctx.createLinearGradient(0, T.oy - 600 * T.s, 0, T.oy + 660 * T.s);
  for (const [at, color] of SKY) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.W, view.H);
  ctx.fillStyle = '#F4F0FF';
  STARS.forEach(([x, y, b], i) => {
    const sx = T.ox + x * T.s, sy = T.oy + y * T.s;
    if (sx < -4 || sx > view.W + 4 || sy < -4 || sy > view.H + 4) return;
    const a = (0.2 + 0.8 * b) * (0.65 + 0.35 * noise(t * 0.003 + i, 4)) * clamp01((300 - y) / 600 + 0.3);
    if (a <= 0.02) return;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.5, (0.6 + b * 1.8) * T.s), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/**
 * The ringed giant: banded, lit from the low sun on the right, its ring passing in front. `t` turns its bands,
 * slowly: a world that is alive, not a backdrop.
 */
export function paintGiant(ctx, T, t) {
  const { x: gx, y: gy, r: gr } = GIANT;
  ctx.save();
  ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
  ctx.lineCap = 'butt';
  // The far side of the ring.
  ctx.save();
  ctx.translate(gx, gy); ctx.rotate(-14 * Math.PI / 180);
  ctx.strokeStyle = rgba('#D9B48C', 0.32); ctx.lineWidth = 22;
  ctx.beginPath(); ctx.ellipse(0, 0, gr * 1.95, gr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // The globe.
  const body = ctx.createRadialGradient(gx + gr * 0.36, gy - gr * 0.16, 0, gx + gr * 0.36, gy - gr * 0.16, gr * 1.5);
  body.addColorStop(0, '#E8B27E'); body.addColorStop(0.55, '#B07253'); body.addColorStop(1, '#4A2C3A');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.clip();
  const turn = t * 0.004;
  for (let i = 0; i < 9; i += 1) {
    const y = gy - gr + 40 + i * 52 + noise(i, 3) * 10, drift = Math.sin(turn * (0.6 + 0.1 * i) + i) * 7;
    ctx.strokeStyle = rgba(i % 2 ? '#7C4A3E' : '#F0C796', 0.35);
    ctx.lineWidth = 10 + (i % 3) * 6;
    ctx.beginPath();
    ctx.moveTo(gx - gr, y);
    ctx.quadraticCurveTo(gx + drift * 6, y + 26 + noise(i, 8) * 10, gx + gr, y + 4);
    ctx.stroke();
  }
  // Storms carried round by the bands: small, slow, enough to say the giant turns.
  for (let i = 0; i < 5; i += 1) {
    const lane = gy - gr * 0.62 + i * gr * 0.31, u = ((hash(i, 21) + t * 0.0000085 * (1 + 0.3 * i)) % 1 + 1) % 1;
    const sx = gx - gr + u * gr * 2, edge = Math.sin(u * Math.PI);
    ctx.fillStyle = rgba(i % 2 ? '#F6D6A8' : '#6B3F38', 0.3 * edge);
    ctx.beginPath(); ctx.ellipse(sx, lane + 12, 26 * edge + 2, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  // The night side.
  ctx.fillStyle = rgba('#1A1028', 0.55);
  ctx.beginPath(); ctx.arc(gx - 120, gy + 40, gr * 1.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = rgba('#F7D2A2', 0.6); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
  // The near side of the ring, in front of the globe.
  ctx.strokeStyle = rgba('#F0CFA4', 0.6); ctx.lineWidth = 16;
  ctx.stroke(RING_FRONT);
  ctx.restore();
  // The lit limb's air: a warm bloom where the sun catches it.
  glow(ctx, T.ox + (gx + gr * 0.78) * T.s, T.oy + (gy - gr * 0.3) * T.s, gr * 0.9 * T.s, '#FFC58A', 0.2);
}
const RING_FRONT = typeof Path2D === 'undefined' ? null : new Path2D(`M${GIANT.x - GIANT.r * 1.9} ${GIANT.y + 70}A${GIANT.r * 1.95} ${GIANT.r * 0.42} -14 0 0 ${GIANT.x + GIANT.r * 1.9} ${GIANT.y - 90}`);

/** A mesa range's outline, as the approved drawing made it: flat tops at seeded heights along a base line. */
function mesaPoints(seed, base, amp) {
  const r = rng(seed), pts = [[-700, 900]];
  let x = -700;
  while (x < 2400) { const w = 60 + r() * 220, h = base - amp * (0.3 + r() * 0.7); pts.push([x, base], [x + w * 0.12, h], [x + w * 0.88, h - r() * 12], [x + w, base]); x += w + r() * 80; }
  pts.push([2400, 900]);
  return pts;
}
const MESAS = Object.freeze({
  far: { points: mesaPoints(11, 620, 120), fill: '#5A3F55', edge: '#3B2A3E', lit: '#C98A6E' },
  near: { points: mesaPoints(12, 640, 70), fill: '#3A2638', edge: '#24162A', lit: '#A9685A' },
});

/** A mesa range on its plane; the low sun catches each right-hand wall. */
export function paintMesas(ctx, T, which) {
  const { points, fill, edge, lit } = MESAS[which];
  ctx.save();
  ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = edge; ctx.stroke();
  // Each mesa is four points after the first: base, top left, top right, base. Its right wall faces the sun.
  ctx.strokeStyle = rgba(lit, 0.55); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 1; i + 3 < points.length; i += 4) { const a = points[i + 2], b = points[i + 3]; ctx.moveTo(a[0] - 1, a[1] + 3); ctx.lineTo(b[0] - 2, b[1] - 6); }
  ctx.stroke();
  ctx.restore();
}

/** The dusk's haze lying between the two ranges. */
export function paintHaze(ctx, view, T, alpha = 1) {
  const y0 = T.oy + 548 * T.s, y1 = T.oy + 690 * T.s;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba('#F2B27A', 0)); g.addColorStop(0.6, rgba('#E79C6A', 0.38 * alpha)); g.addColorStop(1, rgba('#E79C6A', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, view.W, y1 - y0);
}

/** The ground's marks: dark hollows, each at its own depth (nearer the lens the lower it lies). */
const HOLLOWS = (() => {
  const r = rng(33), out = [];
  for (let i = 0; i < 40; i += 1) { const x = -600 + r() * 2600, y = GROUND + 8 + r() ** 2 * 300, rx = 10 + r() * 30, ry = 2 + r() * 3; out.push([x, y, rx, ry]); }
  return out;
})();
/** The depth of a point of the ground `y` units below the ship's line. */
export const groundDepth = y => 1 + Math.max(0, y - GROUND) / 260;

/** The ground's long marks, seen low across it: drifts and old tracks, each a streak at its own depth. */
const STREAKS = (() => {
  const r = rng(57), out = [];
  for (let i = 0; i < 26; i += 1) out.push([-500 + r() * 2400, r() ** 1.6, 60 + r() * 260, r() > 0.45]);
  return out;
})();

/**
 * The ground: from the far range's foot to the bottom of the frame. `horizon` is the screen line it starts at (the near
 * range's plane) and `plane(p)` gives a plane of depth: a hollow near the lens moves more than one by the ship. The
 * dusk lies along its far edge; toward the lens it goes to the dark.
 */
export function paintGround(ctx, view, horizon, plane, dots) {
  const T = plane(1), top = Math.min(horizon, T.oy + GROUND * T.s), deep = Math.max(view.H, top + 1);
  const g = ctx.createLinearGradient(0, top, 0, Math.max(top + 420 * T.s, top + (deep - top) * 0.9));
  g.addColorStop(0, '#4A2F36'); g.addColorStop(0.16, '#33212B'); g.addColorStop(0.5, '#1E141D'); g.addColorStop(1, '#0D090F');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, view.W, view.H - top);
  if (dots) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    const pattern = ctx.createPattern(dots, 'repeat');
    pattern.setTransform(new view.Matrix().translate(T.ox, T.oy).scale(T.s * 7 / dots.width).rotate(20));
    ctx.fillStyle = pattern;
    ctx.fillRect(0, top, view.W, view.H - top);
    ctx.restore();
  }
  // Streaks: each lies at a depth between the far range and the lens, the nearer the longer and lower.
  for (const [x, depth, length, lit] of STREAKS) {
    const p = lerp(0.42, 2.6, depth), P = plane(p), y = lerp(GROUND + 4, GROUND + 330, depth);
    const sx = P.ox + x * P.s, sy = Math.max(top + 2, P.oy + y * P.s), w = length * P.s;
    if (sy > view.H + 4 || sx > view.W + w || sx + w < -w) continue;
    ctx.fillStyle = lit ? rgba('#C98A6E', 0.16 + 0.1 * (1 - depth)) : rgba('#07050A', 0.42);
    ctx.beginPath(); ctx.ellipse(sx, sy, w, Math.max(0.8, (1.2 + 3.4 * depth) * P.s), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = rgba('#120A10', 0.6);
  for (const [x, y, rx, ry] of HOLLOWS) {
    const P = plane(groundDepth(y)), sx = P.ox + x * P.s, sy = P.oy + y * P.s;
    if (sx < -80 || sx > view.W + 80 || sy > view.H + 20) continue;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx * P.s, ry * P.s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // The dusk's light lying along the ground's far edge.
  const haze = ctx.createLinearGradient(0, top, 0, top + 70 * T.s);
  haze.addColorStop(0, rgba('#F2A86A', 0.3)); haze.addColorStop(1, rgba('#F2A86A', 0));
  ctx.fillStyle = haze; ctx.fillRect(0, top, view.W, 70 * T.s);
  ctx.strokeStyle = rgba('#E7A46E', 0.6); ctx.lineWidth = Math.max(1, 2 * T.s);
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(view.W, top); ctx.stroke();
}

/** A tile of the ground's printed dots (one dot; the pattern repeats and turns it). */
export function dotTile(doc, size = 28) {
  const canvas = doc.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2); ctx.fill();
  return canvas;
}

/** The ship's own box in the world: what its picture covers. */
export const SHIP_BOX = Object.freeze([96, 136, 1116, 528]);
const PORTS = Object.freeze(Array.from({ length: 16 }, (_, i) => [1080 - i * 52, 372 + (i % 2) * 4]));
const ENGINES = Object.freeze([360, 410, 450]);

/**
 * The Mothership landed, as the approved drawing inks it: hull, bridge, fins, legs, its plating and mast, the sunset
 * along its top, the housings of its ports and the frame of its entrance. SVG markup for SHIP_BOX; drawn once.
 */
export function shipArt() {
  const cv = inkCanvas('bf-ship');
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
  for (const y of ENGINES) cv.form([[186, y - 18], [130, y - 24], [118, y], [130, y + 24], [186, y + 18]], '#1C2131', { weight: 2.6, depth: 4, seed: 26 + y, tension: 0.6 });
  for (const x of [330, 470, 640, 820, 960, 1080]) cv.line([[x, 306], [x + 6, 516]], { weight: 1.6, color: '#151A26', taper: 'none' });
  cv.line([[230, 400], [1160, 404]], { weight: 2.6, color: '#9AA6C2', taper: 'both' });
  cv.form([[912, 204], [990, 204], [1004, 228], [902, 228]], '#2A3044', { weight: 2, depth: 0, rim: false, hatch: false, grain: false, seed: 27 });
  for (const [x0, x1, y] of [[260, 1120, 340], [240, 1150, 450], [300, 1060, 492]]) cv.line([[x0, y], [x1, y + 4]], { weight: 1.2, color: '#141823', taper: 'none' });
  for (const x of [400, 560, 720, 880, 1000]) cv.form([[x, 455], [x + 46, 455], [x + 46, 468], [x, 468]], '#1C2131', { weight: 1.4, depth: 1, seed: 40 + x, tension: 0.1, rim: false });
  cv.form([[700, 230], [708, 160], [716, 160], [722, 230]], '#2C3348', { weight: 1.8, depth: 1, seed: 47, tension: 0.2 });
  cv.line([[712, 162], [760, 150]], { weight: 2, color: '#151A26', taper: 'end' });
  const { x, y, w, h } = DOOR;
  let extra = `<path d="M210 340Q420 296 900 288Q1110 326 1192 398" fill="none" stroke="#F2A86A" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`
    + `<path d="M520 236Q680 226 820 228Q930 246 962 262" fill="none" stroke="#F7C08A" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`
    + `<path d="M900 196H990L1020 238" fill="none" stroke="#F7C08A" stroke-width="3.4" stroke-linecap="round" opacity="0.8"/>`;
  for (const [px, py] of PORTS) extra += `<circle cx="${px}" cy="${py}" r="7" fill="#1A2030" stroke="${INK}" stroke-width="2"/>`;
  // The entrance: its opening is left clear (the light, the door and the crew are laid in it each frame).
  extra += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#151A26"/><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="none" stroke="${INK}" stroke-width="6"/>`;
  return `<defs>${cv.defs()}</defs>${cv.layer('body')}${extra}`;
}

/**
 * The ship's entrance, live, behind the crew: the warm light inside the doorway. `light` 1 open and lit, 0 dark.
 */
export function paintDoorway(ctx, T, light) {
  const { x, y, w, h } = DOOR;
  const X = T.ox + x * T.s, Y = T.oy + y * T.s, Wd = w * T.s, Hd = h * T.s;
  const g = ctx.createLinearGradient(0, Y, 0, Y + Hd);
  g.addColorStop(0, '#FFF6DE'); g.addColorStop(0.6, '#FFD48A'); g.addColorStop(1, '#F2A85A');
  ctx.globalAlpha = 0.12 + 0.88 * light;
  ctx.fillStyle = g;
  ctx.fillRect(X, Y, Wd, Hd);
  ctx.globalAlpha = 1;
}

/**
 * The entrance's door, live, over the crew: the slab coming down (`down` 0..1) and, shut, its amber seal (`seal`
 * 0..1 running round the frame from the sill).
 */
export function paintDoor(ctx, T, down, seal = 0) {
  if (down <= 0) return;
  const { x, y, w, h } = DOOR;
  const X = T.ox + x * T.s, Y = T.oy + y * T.s, Wd = w * T.s, Hd = h * T.s * Math.min(1, down);
  const g = ctx.createLinearGradient(0, Y, 0, Y + h * T.s);
  g.addColorStop(0, '#5B6683'); g.addColorStop(1, '#3A4360');
  ctx.fillStyle = g;
  ctx.fillRect(X, Y, Wd, Hd);
  ctx.strokeStyle = INK; ctx.lineWidth = 3 * T.s;
  ctx.strokeRect(X, Y, Wd, Hd);
  ctx.strokeStyle = '#1E2434'; ctx.lineWidth = 2.4 * T.s;
  ctx.beginPath();
  for (const k of [0.3, 0.62]) { ctx.moveTo(X + 10 * T.s, Y + Hd * k); ctx.lineTo(X + Wd - 10 * T.s, Y + Hd * k); }
  ctx.stroke();
  if (seal > 0) {
    // The seal runs from the middle of the sill out to both corners and up both sides.
    const half = w / 2 + h, run = half * seal;
    ctx.strokeStyle = rgba('#FFB257', 0.95); ctx.lineWidth = 3.4 * T.s; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const along = Math.min(run, w / 2), up = Math.max(0, run - w / 2);
      ctx.moveTo(X + Wd / 2, Y + h * T.s);
      ctx.lineTo(X + Wd / 2 + side * along * T.s, Y + h * T.s);
      if (up > 0) ctx.lineTo(X + Wd / 2 + side * (w / 2) * T.s, Y + (h - up) * T.s);
    }
    ctx.stroke();
    glow(ctx, X + Wd / 2, Y + h * T.s, 70 * T.s, '#FFB257', 0.55 * seal);
  }
}

/** The ramp: from the sill down to the ground, sliding up into the hull (`up` 0..1), its rail and treads. */
export function paintRamp(ctx, T, up, light = 1) {
  if (up >= 0.999) return;
  const [sx, sy] = RAMP.sill, [fx0, fy0] = RAMP.foot;
  const fx = lerp(fx0, sx, up), fy = lerp(fy0, sy, up);
  const P = (x, y) => [T.ox + x * T.s, T.oy + y * T.s];
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [i, [x, y]] of [[sx, sy], [fx, fy], [fx, fy + 14], [sx, sy + 14]].entries()) { const [a, b] = P(x, y); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); }
  ctx.closePath();
  ctx.fillStyle = '#2A3144'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3 * T.s; ctx.stroke();
  // Treads, and the deck's lit edge.
  ctx.strokeStyle = rgba('#0E121B', 0.7); ctx.lineWidth = 1.4 * T.s;
  ctx.beginPath();
  for (let i = 1; i < 12; i += 1) { const u = i / 12; if (lerp(sx, fx0, u) > fx) break; const [a, b] = P(lerp(sx, fx0, u), lerp(sy, fy0, u)); ctx.moveTo(a, b + 2 * T.s); ctx.lineTo(a - 3 * T.s, b + 12 * T.s); }
  ctx.stroke();
  ctx.strokeStyle = rgba('#E7C394', 0.4 + 0.5 * light); ctx.lineWidth = 2.4 * T.s;
  ctx.beginPath(); ctx.moveTo(...P(sx, sy)); ctx.lineTo(...P(fx, fy)); ctx.stroke();
  // The rail and its posts.
  ctx.strokeStyle = '#1A1F2C'; ctx.lineWidth = 3 * T.s;
  ctx.beginPath();
  ctx.moveTo(...P(sx, sy - 46)); ctx.lineTo(...P(fx, fy - 46));
  for (const u of [0.33, 0.66, 1]) { const x = lerp(sx, fx, u), y = lerp(sy, fy, u); ctx.moveTo(...P(x, y - 46)); ctx.lineTo(...P(x, y)); }
  ctx.stroke();
  ctx.strokeStyle = rgba('#F2B27A', 0.5); ctx.lineWidth = 1.2 * T.s;
  ctx.beginPath(); ctx.moveTo(...P(sx, sy - 48)); ctx.lineTo(...P(fx, fy - 48)); ctx.stroke();
  ctx.restore();
}

/** The light spilling from the doorway: down the ramp and over the ground, the glow round the entrance, a streak. */
export function paintSpill(ctx, T, light) {
  if (light <= 0.01) return;
  const { x, y, w, h } = DOOR, [fx0] = RAMP.foot;
  const P = (px, py) => [T.ox + px * T.s, T.oy + py * T.s];
  beam(ctx, P(x + w / 2, y + h * 0.55), P(fx0 + 120, GROUND + 70), w * 0.9 * T.s, 420 * T.s, '#FFD9A0', 0.5 * light, { layers: 4 });
  const [px, py] = P(fx0 + 40, GROUND + 24);
  glow(ctx, px, py, 260 * T.s, '#FFC983', 0.5 * light, { sy: 44 / 260, core: 0.2 });
  const [dx, dy] = P(x + w / 2, y + h / 2);
  glow(ctx, dx, dy, 170 * T.s, '#FFE2B0', 0.62 * light);
  streak(ctx, dx, T.oy + (y + h * 0.4) * T.s, 720 * T.s, 8 * T.s, '#FFE9C8', 0.4 * light);
}
/** The doorway's beam, for the dust in it: `[from, to, w0, w1]` in world units. */
export const SPILL = Object.freeze({ from: [DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h * 0.55], to: [RAMP.foot[0] + 120, GROUND + 70], w0: DOOR.w * 0.9, w1: 420 });

/**
 * The hull waking: the ports lighting front to back (`ports` 0..1), the engines (`engines` 0..1), and the floodlights
 * under the hull on the ground. `L` is where soft light is drawn (engine.mjs createLight).
 */
export function paintHullLights(ctx, L, T, { ports = 0, engines = 0, t = 0 }) {
  const P = (px, py) => [T.ox + px * T.s, T.oy + py * T.s];
  PORTS.forEach(([px, py], i) => {
    const on = clamp01(ports * 16 - i * 0.7);
    if (on <= 0) return;
    const [sx, sy] = P(px, py), flick = on < 1 ? 0.55 + 0.45 * (hash(Math.floor(t / 34), i) > 0.4 ? 1 : 0) : 1;
    ctx.fillStyle = rgba('#FFD48A', on * flick);
    ctx.beginPath(); ctx.arc(sx, sy, 5 * T.s, 0, Math.PI * 2); ctx.fill();
    glow(L, sx, sy, 24 * T.s, '#FFD48A', 0.55 * on * flick);
  });
  for (const ey of ENGINES) {
    const [sx, sy] = P(118, ey), k = ease.outCubic(engines);
    glow(L, sx, sy, (60 + 80 * k) * T.s, '#BFD8FF', 0.15 + 0.75 * k, { sx: 1.4 });
    ctx.fillStyle = rgba('#E9F2FF', 0.3 + 0.7 * k);
    ctx.beginPath(); ctx.ellipse(sx - 4 * T.s, sy, (6 + 6 * k) * T.s, (10 + 6 * k) * T.s, 0, 0, Math.PI * 2); ctx.fill();
    if (k > 0.05) streak(L, sx - 30 * T.s * k, sy, 300 * T.s * k, 6 * T.s, '#CFE3FF', 0.5 * k);
  }
  for (const fx of [380, 980]) { const [sx, sy] = P(fx, GROUND + 12); glow(L, sx, sy, 190 * T.s, '#CFE0FF', 0.26, { sy: 30 / 190, core: 0.2 }); }
}

/**
 * The hull close behind two of the crew, out of focus: its plating, the light strip along it, its ports above and the
 * running lights along its belly, all soft. Laid on the canvas (no picture): `T` is the ship's plane, `warm` 0..1 the
 * entrance's light on the plates as they near it.
 */
export function paintHullClose(ctx, view, T, warm = 0, L = ctx) {
  const X = x => T.ox + x * T.s, Y = y => T.oy + y * T.s;
  // The hull's side: lit above, its belly dark, and under it the dusk.
  const g = ctx.createLinearGradient(0, Y(300), 0, Y(540));
  g.addColorStop(0, '#465070'); g.addColorStop(0.42, '#343C56'); g.addColorStop(0.7, '#262C42'); g.addColorStop(0.86, '#171B2A'); g.addColorStop(0.93, rgba('#171B2A', 0.9)); g.addColorStop(1, rgba('#171B2A', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(0, Y(300)), view.W, Y(540) - Math.min(0, Y(300)));
  // The entrance's light raking along the plates from the left.
  const rake = L.createLinearGradient(X(DOOR.x + DOOR.w), 0, X(DOOR.x + DOOR.w + 240), 0);
  rake.addColorStop(0, rgba('#FFD49A', 0.5 * warm)); rake.addColorStop(1, rgba('#FFD49A', 0));
  L.fillStyle = rake;
  L.fillRect(0, 0, view.W, Y(520));
  // Plating: wide soft seams, as a lens out of focus draws them.
  const soft = (x0, y0, x1, y1, w, color) => { ctx.strokeStyle = color; ctx.lineWidth = w * T.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke(); };
  for (const x of [470, 556, 640, 728, 820, 904]) { soft(x, 300, x + 4, 512, 5, rgba('#10141E', 0.2)); soft(x + 2.2, 300, x + 6.2, 512, 1.6, rgba('#9AA6C2', 0.1)); }
  for (const y of [340, 450, 492]) soft(380, y, 1100, y + 3, 4.4, rgba('#10141E', 0.22));
  soft(380, 401, 1100, 404, 5.5, rgba('#9AA6C2', 0.34));
  // Vents.
  ctx.fillStyle = rgba('#10141E', 0.4);
  for (const x of [560, 720, 880]) ctx.fillRect(X(x), Y(455), 46 * T.s, 13 * T.s);
  // The ports, dark glass with the dusk in it.
  for (let i = 0; i < 16; i += 1) {
    const px = 1080 - i * 52, py = 372 + (i % 2) * 4;
    if (X(px) < -80 || X(px) > view.W + 80) continue;
    glow(ctx, X(px), Y(py), 13 * T.s, '#0B0E16', 0.85, { mode: 'source-over', core: 0.5 });
    glow(ctx, X(px + 2.4), Y(py - 2.6), 4.2 * T.s, '#C98A6E', 0.5);
  }
  // Running lights along the belly: soft discs, as lights are out of focus.
  for (let x = 420; x < 1100; x += 43) {
    if (X(x) < -80 || X(x) > view.W + 80) continue;
    glow(ctx, X(x), Y(497), 9 * T.s, '#FFB257', 0.62, { core: 0.55 });
    glow(ctx, X(x), Y(497), 3.4 * T.s, '#FFE7C0', 0.7);
  }
}

/**
 * What stands close to the lens, in ink: rocks and a cargo case on the near ground. Black shapes, as a comic frames
 * a panel; they pass fastest when the camera moves. `[points, depth]` in world units at the reference camera.
 */
const FRONT = Object.freeze([
  { depth: 1.9, points: [[330, 905], [352, 846], [398, 822], [452, 836], [470, 872], [520, 880], [548, 905]] },
  { depth: 2.4, points: [[760, 960], [790, 880], [838, 842], [900, 850], [948, 820], [1010, 834], [1040, 900], [1080, 960]] },
  { depth: 1.6, points: [[610, 842], [612, 800], [668, 794], [674, 838], [690, 846], [600, 848]] },
]);
export function paintForeground(ctx, plane, alpha = 1) {
  if (alpha <= 0) return;
  for (const { depth, points } of FRONT) {
    const T = plane(depth);
    ctx.beginPath();
    points.forEach(([x, y], i) => { const a = T.ox + x * T.s, b = T.oy + y * T.s; if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
    ctx.closePath();
    ctx.fillStyle = rgba('#07060A', alpha);
    ctx.fill();
    ctx.strokeStyle = rgba('#C97F5A', 0.5 * alpha); ctx.lineWidth = Math.max(1, 1.6 * T.s);
    ctx.stroke();
  }
}

// The boarding film's inside: runtime source, Designer's. The spine corridor the crew stands in once the entrance has
// shut behind them: dark, the entrance's amber seam at its far end, then its ceiling lights waking far to near and its
// consoles powering up. A set in three dimensions (x across, y up from the deck, z away from the lens, in the crew's
// own units), laid on the canvas each frame: sharp at any size, no memory, and the camera can push in through it.

import { clamp01, hash, lerp } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { beam, glow, rgba } from './engine.mjs';

/** The corridor: its half width and height, its ribs (frames across it), the far wall with the entrance. */
export const HALL = Object.freeze({ half: 250, high: 430, near: 120, far: 1560, ribs: Object.freeze([300, 480, 660, 840, 1020, 1200, 1380]) });
/** The ceiling lights, near to far: each hangs between two ribs. They wake far to near. */
export const LAMPS = Object.freeze([390, 570, 750, 930, 1110, 1290]);

const shadeOf = ([r, g, b], k) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
const CEILING = [26, 31, 48], DECK = [22, 27, 41], WALL_L = [36, 43, 66], WALL_R = [30, 37, 58];

/** How bright a place along the corridor is: the dark, and each woken lamp by how near it hangs. */
export const brightAt = (z, lit) => 0.16 + 0.84 * clamp01(LAMPS.reduce((sum, lamp, i) => sum + lit[i] * clamp01(1 - Math.abs(lamp - z) / 230), 0));

/**
 * The corridor itself. `lit[i]` is how far lamp i has woken (0..1); `systems` 0..1 the consoles powering up, far to
 * near; `seal` 0..1 the seam's glow; `t` for what flickers. `at(x, y, z)` is the lens (engine.mjs lens()). `L` is where
 * soft light is drawn (engine.mjs createLight).
 */
export function paintHall(ctx, view, at, cam, { lit, systems = 0, seal = 1, t = 0 }, L = ctx) {
  const { half, high, far, ribs } = HALL;
  ctx.fillStyle = '#04050A';
  ctx.fillRect(0, 0, view.W, view.H);
  const near = Math.max(cam.z + 40, HALL.near - 200);
  const edges = [near, ...ribs.filter(z => z > near + 20), far];
  const quad = (pts, fill) => { ctx.beginPath(); pts.forEach(([x, y, z], j) => { const [X, Y] = at(x, y, z); if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  const line = (a, b, w, color) => { const [ax, ay, sa] = at(...a), [bx, by, sb] = at(...b); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, w * (sa + sb) / 2); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  // The far wall: the shut entrance and its amber seam.
  {
    const [x0, y0, s] = at(-half, high, far), [x1, y1] = at(half, 0, far);
    ctx.fillStyle = shadeOf([24, 29, 44], brightAt(far, lit));
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const dw = 172 * s, dh = 300 * s, cx = (x0 + x1) / 2;
    ctx.fillStyle = '#2C3550';
    ctx.fillRect(cx - dw / 2, y1 - dh, dw, dh);
    ctx.strokeStyle = '#0B0E15'; ctx.lineWidth = Math.max(1, 6 * s);
    ctx.strokeRect(cx - dw / 2, y1 - dh, dw, dh);
    ctx.strokeStyle = rgba('#FF9A2E', 0.3 * seal); ctx.lineWidth = Math.max(3, 20 * s);
    ctx.strokeRect(cx - dw / 2 - 3 * s, y1 - dh - 3 * s, dw + 6 * s, dh + 3 * s);
    ctx.strokeStyle = rgba('#FFB257', 0.55 + 0.45 * seal); ctx.lineWidth = Math.max(1.2, 6 * s);
    ctx.strokeRect(cx - dw / 2 - 3 * s, y1 - dh - 3 * s, dw + 6 * s, dh + 3 * s);
    glow(ctx, cx, y1 - dh / 2, 620 * s, '#FFB257', 0.6 * seal);
    glow(ctx, cx, y1 - dh / 2, 210 * s, '#FFDDA6', 0.45 * seal);
  }
  // From the far end to the lens: each stretch's deck, ceiling and walls, then the rib that ends it.
  for (let i = edges.length - 2; i >= 0; i -= 1) {
    const z0 = edges[i], z1 = edges[i + 1], zc = (z0 + z1) / 2, k = brightAt(zc, lit);
    quad([[-half, high, z0], [half, high, z0], [half, high, z1], [-half, high, z1]], shadeOf(CEILING, k));
    quad([[-half, 0, z0], [half, 0, z0], [half, 0, z1], [-half, 0, z1]], shadeOf(DECK, k));
    for (const side of [-1, 1]) {
      const wall = side < 0 ? WALL_L : WALL_R;
      // A wall in two bands: the lit upper wall, the dado below it darker.
      quad([[side * half, 104, z0], [side * half, high, z0], [side * half, high, z1], [side * half, 104, z1]], shadeOf(wall, k));
      quad([[side * half, 0, z0], [side * half, 104, z0], [side * half, 104, z1], [side * half, 0, z1]], shadeOf(wall, k * 0.62));
      line([side * half, 104, z0], [side * half, 104, z1], 3.4, rgba('#07090F', 0.85));
      line([side * half, 108, z0], [side * half, 108, z1], 1.2, rgba('#9FB2DC', 0.28 * k));
      // Pipes up high, their undersides catching the light.
      for (const [y, w] of [[352, 9], [378, 6]]) { line([side * (half - 4), y, z0], [side * (half - 4), y, z1], w, '#0A0D15'); line([side * (half - 4), y + 3, z0], [side * (half - 4), y + 3, z1], 1.4, rgba('#9FB2DC', 0.34 * k)); }
      if (z1 - z0 > 120 && zc > 330) {
        // A recessed panel between the ribs, and a console in it: waking far to near, flickering as it starts.
        const p0 = zc - 62, p1 = zc + 62;
        quad([[side * half, 128, p0], [side * half, 330, p0], [side * half, 330, p1], [side * half, 128, p1]], shadeOf(wall, k * 0.8));
        const order = (far - zc) / (far - 330), on = clamp01(systems * 2.7 - order * 1.7), flick = on > 0 && on < 1 ? (hash(Math.floor(t / 46), Math.round(zc) + side) > 0.42 ? 1 : 0.25) : 1;
        const a = at(side * half, 262, zc - 46), b = at(side * half, 262, zc + 46), c = at(side * half, 176, zc + 46), d = at(side * half, 176, zc - 46);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.fillStyle = on > 0 ? rgba('#8FD6FF', (0.28 + 0.6 * on) * flick) : '#0E131E';
        ctx.fill();
        ctx.strokeStyle = '#0B0E15'; ctx.lineWidth = Math.max(1, 3 * a[2]); ctx.stroke();
        if (on > 0) {
          // Lines of a readout writing themselves, and the screen's light on the wall beside it.
          ctx.strokeStyle = rgba('#EAF8FF', 0.75 * on * flick); ctx.lineWidth = Math.max(1, 1.8 * a[2]);
          ctx.beginPath();
          for (let r = 0; r < 4; r += 1) { const y = 250 - r * 19, len = 0.35 + 0.5 * hash(r, Math.round(zc) + side * 7); const p = at(side * half, y, zc - 38), q = at(side * half, y, zc - 38 + 76 * len * clamp01(on * 1.4)); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
          ctx.stroke();
          const m = at(side * (half - 34), 216, zc);
          glow(L, m[0], m[1], 170 * m[2], '#8FD6FF', 0.3 * on * flick);
        }
        // Two small lamps under the console: amber in the dark, steady.
        for (const dz of [-30, 30]) { const m = at(side * half, 152, zc + dz); ctx.fillStyle = rgba('#FFB257', 0.85); ctx.beginPath(); ctx.arc(m[0], m[1], Math.max(1, 3 * m[2]), 0, Math.PI * 2); ctx.fill(); glow(L, m[0], m[1], 22 * m[2], '#FFA030', 0.4); }
      }
    }
    // The deck's lane: two lines running away, plates across it; the lamps' light lying on it.
    for (const x of [-104, 104]) line([x, 0, z0], [x, 0, z1], 3.2, rgba('#06080D', 0.8));
    for (let z = Math.ceil(z0 / 60) * 60; z < z1; z += 60) line([-104, 0, z], [104, 0, z], 1.6, rgba('#06080D', 0.7));
    // The rib at the near end of this stretch.
    if (i > 0) {
      const [x0, y0, s] = at(-half, high, z0), [x1, y1] = at(half, 0, z0);
      ctx.strokeStyle = '#06080D'; ctx.lineWidth = Math.max(2, 18 * s);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = rgba('#8FA0C8', 0.12 + 0.36 * brightAt(z0 + 60, lit)); ctx.lineWidth = Math.max(1, 2.4 * s);
      ctx.strokeRect(x0 + 9 * s, y0 + 9 * s, x1 - x0 - 18 * s, y1 - y0 - 18 * s);
    }
  }
}

/** A ceiling light's fitting: dark, or lit with its glow. */
export function paintLamp(ctx, at, z, on, L = ctx) {
  const [x, y, s] = at(0, HALL.high - 6, z);
  ctx.fillStyle = on > 0 ? rgba('#F4FBFF', 0.45 + 0.55 * on) : '#161B28';
  ctx.fillRect(x - 78 * s, y, 156 * s, 11 * s);
  ctx.strokeStyle = '#0B0E15'; ctx.lineWidth = Math.max(1, 2 * s);
  ctx.strokeRect(x - 78 * s, y, 156 * s, 11 * s);
  // A far lamp is a small light, not a white wall: its glow thins with distance.
  const reach = clamp01(s / (at(0, 0, 390)[2] || 1)) ** 1.4;
  if (on > 0) { glow(L, x, y + 5 * s, 130 * s, '#E8F4FF', 0.55 * on * reach); glow(L, x, y + 5 * s, 380 * s, '#BFD8FF', 0.1 * on * reach); }
}

/** A woken lamp's cone coming down through the air to the deck, and its pool there. */
export function paintCone(ctx, at, z, on) {
  if (on <= 0) return;
  const [x, y, s] = at(0, HALL.high - 10, z), [, fy] = at(0, 0, z);
  beam(ctx, [x, y], [x, fy], 150 * s, 500 * s, '#DCEBFF', 0.07 * on, { layers: 3, fade: 0.62 });
  // Its pool on the deck, and the deck's shine under it.
  glow(ctx, x, fy, 330 * s, '#CFE2FF', 0.3 * on, { sy: 0.34, core: 0.22 });
  glow(ctx, x, fy + 30 * s, 110 * s, '#E8F4FF', 0.12 * on, { sy: 1.8, core: 0.2 });
}

/** How woken lamp `i` is at `t` (0..1), for lamps waking over `[from, to]` far to near, each catching with a flicker. */
export function lampAt(i, t, [from, to], reduced = false) {
  const order = (LAMPS.length - 1 - i) / (LAMPS.length - 1), start = lerp(from, to, order);
  if (reduced) return t >= start ? 1 : 0;
  const k = clamp01((t - start) / 190);
  if (k <= 0 || k >= 1) return k;
  return k * (0.35 + 0.65 * (hash(Math.floor(t / 38), i) > 0.36 ? 1 : 0));
}
/** The lamp nearest a place along the corridor. */
export const lampOver = z => LAMPS.reduce((best, lamp, i) => (Math.abs(lamp - z) < Math.abs(LAMPS[best] - z) ? i : best), 0);

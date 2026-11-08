// mothership:dev-only
//
// The pre-game films' clock arithmetic: easing, windows, springs and seeded noise. Every film is a
// pure function of time, so a frame drawn twice is drawn the same, a renderer can seek, and a phone
// that joins late draws the moment it joins at. Nothing here reads a clock or Math.random.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const clamp01 = v => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
/** Where `v` lies between `a` and `b`, 0..1, clamped. */
export const progress = (v, a, b) => (b === a ? (v >= b ? 1 : 0) : clamp01((v - a) / (b - a)));
/** `v` mapped from a..b onto c..d, clamped. */
export const remap = (v, a, b, c, d) => lerp(c, d, progress(v, a, b));
export const smooth = t => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const smoother = t => { const x = clamp01(t); return x * x * x * (x * (x * 6 - 15) + 10); };

export const ease = Object.freeze({
  linear: t => clamp01(t),
  inQuad: t => clamp01(t) ** 2,
  outQuad: t => 1 - (1 - clamp01(t)) ** 2,
  inCubic: t => clamp01(t) ** 3,
  outCubic: t => 1 - (1 - clamp01(t)) ** 3,
  inOutCubic: t => { const x = clamp01(t); return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; },
  inOutSine: t => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2,
  outExpo: t => { const x = clamp01(t); return x >= 1 ? 1 : 1 - 2 ** (-10 * x); },
  inExpo: t => { const x = clamp01(t); return x <= 0 ? 0 : 2 ** (10 * x - 10); },
  inOutExpo: t => { const x = clamp01(t); if (x <= 0 || x >= 1) return x; return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2; },
  /** Overshoots by about 10% (s = 1.70158) and settles: a thing that lands with weight. */
  outBack: (t, s = 1.70158) => { const x = clamp01(t) - 1; return 1 + (s + 1) * x ** 3 + s * x ** 2; },
});

/**
 * A damped spring from 0 to 1 over `t` 0..1 of its settle time: `bounce` is how far it overshoots
 * (0 none, 0.3 a lively landing), `cycles` how many times it swings before it rests.
 */
export function spring(t, { bounce = 0.25, cycles = 2.2 } = {}) {
  const x = clamp01(t);
  if (x >= 1) return 1;
  const decay = Math.log(1 / Math.max(1e-3, bounce)) * 1.15;
  return 1 - Math.exp(-decay * x * 3) * Math.cos(cycles * Math.PI * x);
}

/** 0 before a, rising over a..b, 1 until c, falling over c..d, 0 after: a beat's envelope. */
export function envelope(t, a, b, c, d, curve = smooth) {
  if (t <= a || t >= d) return 0;
  if (t < b) return curve(progress(t, a, b));
  if (t <= c) return 1;
  return 1 - curve(progress(t, c, d));
}

/** A decaying shake: offsets in px for an impact at `at`, lasting `ms`, of `amp` px. */
export function shake(t, at, { amp = 6, ms = 260, seed = 1, freq = 38 } = {}) {
  const dt = t - at;
  if (dt < 0 || dt > ms) return [0, 0, 0];
  const k = (1 - dt / ms) ** 2;
  const s = dt / 1000;
  return [
    amp * k * Math.sin(s * freq * 2 * Math.PI + seed),
    amp * 0.8 * k * Math.sin(s * freq * 1.7 * 2 * Math.PI + seed * 2.3),
    amp * 0.08 * k * Math.sin(s * freq * 1.3 * 2 * Math.PI + seed * 4.1),
  ];
}

/** A seeded generator (mulberry32): the same seed gives the same sequence on every machine. */
export function rng(seed) {
  let a = (seed >>> 0) || 0x9E3779B9;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0..1 hash of an integer and a seed. */
export function hash(n, seed = 0) {
  let h = Math.imul((n | 0) ^ Math.imul(seed | 0, 0x27D4EB2D), 0x85EBCA6B);
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in one dimension, -1..1. */
export function noise(x, seed = 0) {
  const i = Math.floor(x), fr = x - i;
  const u = fr * fr * (3 - 2 * fr);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}

/** Noise of several octaves, -1..1 (roughly). */
export function fbm(x, seed = 0, octaves = 3) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o += 1) { sum += amp * noise(x * freq, seed + o * 101); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}

/** Noise that wraps around `period` (for closed outlines). */
export function loopNoise(x, period, seed = 0, octaves = 3) {
  const u = ((x % period) + period) % period / period;
  return lerp(fbm(u * period, seed, octaves), fbm((u - 1) * period, seed, octaves), smooth(u));
}

/** A number for SVG: two decimals, no trailing zeros. */
export const f = v => Number((+v).toFixed(2));
export const f3 = v => Number((+v).toFixed(3));
export const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const dOf = (list, closed = true) => `M${list.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}${closed ? 'Z' : ''}`;

/** A closed smooth path through `list` (Catmull-Rom as cubic Béziers). */
export function smoothPath(list, closed = true, tension = 1) {
  const n = list.length;
  if (n < 3) return dOf(list, closed);
  const at = i => list[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${f(list[0][0])} ${f(list[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** An SVG document placed inside another at (x, y), `width` x `height` px: its own size dropped, its viewBox kept. */
export function nest(svg, { x, y, width, height, extra = '' }) {
  const open = svg.match(/^<svg[^>]*>/)[0];
  const cleaned = open.replace(/\s(width|height|x|y)="[^"]*"/g, '');
  return cleaned.replace('<svg', `<svg x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(height)}"${extra}`) + svg.slice(open.length);
}

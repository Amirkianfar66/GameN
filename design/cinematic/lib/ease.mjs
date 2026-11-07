// mothership:dev-only
//
// Timing primitives shared by the cinematic library's films (design/cinematic/). Pure functions
// of numbers: no clock, no randomness of the page's own. Every "random" value here is a hash of
// its inputs, so a frame at a given moment is the same on every screen and every render.

export const clamp01 = v => Math.max(0, Math.min(1, v));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, v) => a + (b - a) * v;
export const lerp2 = (a, b, v) => [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
/** Progress through [from, to], 0 before and 1 after. */
export const ramp = (t, from, to) => clamp01((t - from) / Math.max(1e-9, to - from));
/** Progress through a beat given as [from, to]. */
export const beat = (t, [from, to]) => ramp(t, from, to);
export const inBeat = (t, [from, to]) => t >= from && t < to;
export const r2 = v => Math.round(v * 100) / 100 || 0;
export const r3 = v => Math.round(v * 1000) / 1000 || 0;

export const easeInQuad = v => v * v;
export const easeOutQuad = v => 1 - (1 - v) ** 2;
export const easeInOutQuad = v => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
export const easeInCubic = v => v ** 3;
export const easeOutCubic = v => 1 - (1 - v) ** 3;
export const easeInOutCubic = v => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);
export const easeOutExpo = v => (v >= 1 ? 1 : 1 - 2 ** (-10 * v));
export const easeInExpo = v => (v <= 0 ? 0 : 2 ** (10 * v - 10));
export const smoothstep = v => v * v * (3 - 2 * v);
/** Overshoots by `overshoot` before settling: an ink stamp's punch. */
export const easeOutBack = (v, overshoot = 1.70158) => 1 + (overshoot + 1) * (v - 1) ** 3 + overshoot * (v - 1) ** 2;
/** A damped spring from 0 to 1: `freq` oscillations a unit, decaying by `damping`. */
export const spring = (v, { freq = 2.2, damping = 5 } = {}) => (v <= 0 ? 0 : 1 - Math.exp(-damping * v) * Math.cos(2 * Math.PI * freq * v));
/** 0 → 1 → 0 across a beat, sine-shaped. */
export const bell = v => Math.sin(Math.PI * clamp01(v));

/** A deterministic 32-bit hash of any number of numbers and strings. */
export function hash(...parts) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x9e3779b9; h = Math.imul(h, 2246822519) >>> 0;
  }
  return h >>> 0;
}
/** A deterministic number in [0, 1) for its inputs. */
export const rand = (...parts) => hash(...parts) / 4294967296;
/** Smooth value noise in [-1, 1] along x, for a seed: a camera's handheld drift, a light's flicker. */
export function noise(seed, x) {
  const i = Math.floor(x), f = x - i;
  const a = rand(seed, i) * 2 - 1, b = rand(seed, i + 1) * 2 - 1;
  return lerp(a, b, smoothstep(f));
}

/**
 * Samples keyframes [{ t, ...values }] at t, each value eased with the following key's `ease`
 * (a function of 0..1; linear when absent). Numbers and [x, y] pairs interpolate; anything else
 * holds until the next key.
 */
export function keys(frames, t) {
  if (t <= frames[0].t) return { ...frames[0] };
  const last = frames[frames.length - 1];
  if (t >= last.t) return { ...last };
  const i = frames.findIndex(frame => frame.t > t);
  const a = frames[i - 1], b = frames[i];
  const v = (b.ease ?? (x => x))(ramp(t, a.t, b.t));
  const out = { t };
  for (const name of Object.keys(b)) {
    if (name === 't' || name === 'ease') continue;
    const from = a[name], to = b[name];
    if (typeof from === 'number' && typeof to === 'number') out[name] = lerp(from, to, v);
    else if (Array.isArray(from) && Array.isArray(to)) out[name] = from.map((x, j) => lerp(x, to[j], v));
    else out[name] = v < 1 ? from : to;
  }
  return out;
}

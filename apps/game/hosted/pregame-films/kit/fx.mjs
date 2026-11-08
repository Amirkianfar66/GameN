//
// The films' light, particles and finish, as SVG markup. The look is the redrawn rooms' noir
// (PR #197): hard light falling in beams with dust in them, pools on what it lands on,
// glow and bloom round what is lit, and over every frame a film's grain, a vignette and a grade.
// Every function is pure: the same arguments give the same markup.
//
// Defs (gradients, filters) are collected by id with `defs()`, so a frame declares each one once.

import { clamp01, dOf, ease, f, f3, hash, lerp, loopNoise, noise, rng, smooth, smoothPath } from './math.mjs';

/** A collector of <defs> entries by id; `use(id, markup)` adds one once and returns `url(#id)`. */
export function defs() {
  const map = new Map();
  return {
    use(id, markup) { if (!map.has(id)) map.set(id, markup); return `url(#${id})`; },
    has: id => map.has(id),
    markup: () => (map.size ? `<defs>${[...map.values()].join('')}</defs>` : ''),
  };
}

// ---------- filters ----------

export const blurFilter = (D, id, sd, { x = -0.3, y = -0.3, w = 1.6, h = 1.6 } = {}) => D.use(id,
  `<filter id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${typeof sd === 'number' ? f(sd) : sd}"/></filter>`);

/** Ink's rough edge: the outline pushed about by a fixed noise (scale in px). */
export const roughFilter = (D, id, { scale = 2.4, freq = 0.06, seed = 7, octaves = 2 } = {}) => D.use(id,
  `<filter id="${id}" x="-0.05" y="-0.05" width="1.1" height="1.1"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f(scale)}" xChannelSelector="R" yChannelSelector="G"/></filter>`);

/** Paper's grain on what it is applied to: fine fibres multiplied in. */
export const paperFilter = (D, id, { seed = 3, strength = 0.22, freq = 0.9 } = {}) => D.use(id,
  `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.22  0 0 0 ${f3(strength * 2.2)} 0" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/><feBlend in="gi" in2="SourceGraphic" mode="multiply"/></filter>`);

// ---------- gradients ----------

export function radial(D, id, stops, { cx = 0.5, cy = 0.5, r = 0.5, fx = null, fy = null, units = 'objectBoundingBox' } = {}) {
  const focus = fx === null ? '' : ` fx="${f3(fx)}" fy="${f3(fy)}"`;
  return D.use(id, `<radialGradient id="${id}" cx="${f3(cx)}" cy="${f3(cy)}" r="${f3(r)}"${focus} gradientUnits="${units}">${stopsOf(stops)}</radialGradient>`);
}
export function linear(D, id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = 'objectBoundingBox' } = {}) {
  return D.use(id, `<linearGradient id="${id}" x1="${f3(x1)}" y1="${f3(y1)}" x2="${f3(x2)}" y2="${f3(y2)}" gradientUnits="${units}">${stopsOf(stops)}</linearGradient>`);
}
const stopsOf = stops => stops.map(([o, c, a = 1]) => `<stop offset="${f3(o)}" stop-color="${c}"${a === 1 ? '' : ` stop-opacity="${f3(a)}"`}/>`).join('');

// ---------- light ----------

/**
 * A volumetric beam: light entering at `from` (its width `w0`) and spreading to `to` (`w1`), bright
 * where it enters and gone where it lands, its edges soft. `opacity` is the brightest part.
 */
export function beam(D, id, { from, to, w0, w1, color = '#FFE7B0', opacity = 0.35, soft = 10, fade = [0, 0.55, 1] }) {
  const [x0, y0] = from, [x1, y1] = to;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const poly = [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]];
  const g = linear(D, `${id}-g`, [[fade[0], color, 1], [fade[1], color, 0.45], [fade[2], color, 0]], { x1: x0, y1: y0, x2: x1, y2: y1, units: 'userSpaceOnUse' });
  const blur = soft > 0 ? ` filter="${blurFilter(D, `${id}-soft`, soft)}"` : '';
  return `<path d="${dOf(poly)}" fill="${g}" opacity="${f3(opacity)}"${blur} style="mix-blend-mode:screen"/>`;
}

/** A soft pool of light (an ellipse fading out from its centre). */
export function pool(D, id, { cx, cy, rx, ry, color = '#FFD98A', opacity = 0.5, core = 0.2 }) {
  const g = radial(D, `${id}-g`, [[0, color, 1], [core, color, 0.75], [1, color, 0]]);
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${g}" opacity="${f3(opacity)}" style="mix-blend-mode:screen"/>`;
}

/** A glow round a light source: bloom drawn as a sprite. */
export const glow = (D, id, { cx, cy, r, color = '#FFE2A0', opacity = 0.8 }) => pool(D, id, { cx, cy, rx: r, ry: r, color, opacity, core: 0.08 });

/** An anamorphic streak across a bright point, as a lens draws one. */
export function streak(D, id, { cx, cy, len, thick = 3, color = '#BFD8FF', opacity = 0.6 }) {
  const g = radial(D, `${id}-g`, [[0, '#FFFFFF', 1], [0.12, color, 0.8], [1, color, 0]]);
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(len)}" ry="${f(thick)}" fill="${g}" opacity="${f3(opacity)}" style="mix-blend-mode:screen"/>`;
}

/** A four-point glint (a star of two thin diamonds) with a halo. */
export function glint(D, id, { cx, cy, r, opacity = 1, color = '#FFFFFF', rotate = 0 }) {
  if (opacity <= 0.001 || r <= 0.1) return '';
  const a = r, b = r * 0.09;
  const star = `M${f(cx)} ${f(cy - a)}L${f(cx + b)} ${f(cy - b)}L${f(cx + a)} ${f(cy)}L${f(cx + b)} ${f(cy + b)}L${f(cx)} ${f(cy + a)}L${f(cx - b)} ${f(cy + b)}L${f(cx - a)} ${f(cy)}L${f(cx - b)} ${f(cy - b)}Z`;
  return `<g opacity="${f3(opacity)}">${glow(D, `${id}-h`, { cx, cy, r: r * 0.7, color: '#FFF1C8', opacity: 0.85 })}<path d="${star}" fill="${color}" transform="rotate(${f(rotate)} ${f(cx)} ${f(cy)})" style="mix-blend-mode:screen"/></g>`;
}

/**
 * Dust turning in light: `n` motes in the box, drifting slowly, each lit by `lightAt(x, y)` (0..1;
 * a mote outside every beam is dark and is not drawn).
 */
export function dust({ seed = 1, n = 60, t, box: [bx, by, bw, bh], size = [0.6, 1.8], color = '#FFF4D6', opacity = 0.8, lightAt = () => 1, speed = 1 }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const u = r(), v = r(), s = lerp(size[0], size[1], r() ** 2), ph = r() * 1000, sp = lerp(0.4, 1.2, r()) * speed;
    const x = bx + (((u * bw + noise(t * 0.00023 * sp + ph, seed + i) * 40 + t * 0.006 * sp) % bw) + bw) % bw;
    const y = by + (((v * bh + noise(t * 0.00019 * sp + ph * 1.7, seed + i * 3) * 30 - t * 0.004 * sp) % bh) + bh) % bh;
    const lit = clamp01(lightAt(x, y));
    const tw = 0.55 + 0.45 * noise(t * 0.004 + ph, seed + 7 * i);
    const a = lit * tw * opacity;
    if (a < 0.03) continue;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${color}" opacity="${f3(a)}"/>`;
  }
  return out ? `<g style="mix-blend-mode:screen">${out}</g>` : '';
}

/** How lit a point is inside a beam (0 outside, 1 on its axis near where it enters). */
export function inBeam([x, y], { from, to, w0, w1 }) {
  const [x0, y0] = from, [x1, y1] = to;
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
  const s = ((x - x0) * dx + (y - y0) * dy) / len2;
  if (s < 0 || s > 1) return 0;
  const px = x0 + dx * s, py = y0 + dy * s;
  const half = lerp(w0, w1, s) / 2;
  const off = Math.hypot(x - px, y - py) / half;
  return off >= 1 ? 0 : (1 - off ** 2) * (1 - s * 0.7);
}

// ---------- particles ----------

/** Sparks thrown from `at` at `t0`: streaks along their flight, falling, fading. */
export function sparks({ seed = 1, n = 14, t, t0, at: [ox, oy], speed = [0.25, 0.7], angle = -Math.PI / 2, spread = Math.PI, gravity = 0.0011, life = [180, 420], color = '#FFD27A', width = 1.6 }) {
  const dt = t - t0;
  if (dt < 0) return '';
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const a = angle + (r() - 0.5) * spread, v = lerp(speed[0], speed[1], r()), L = lerp(life[0], life[1], r());
    if (dt > L) { r(); continue; }
    const k = dt / L;
    const x = ox + Math.cos(a) * v * dt, y = oy + Math.sin(a) * v * dt + 0.5 * gravity * dt * dt;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v + gravity * dt;
    const tail = 14 * (1 - k * 0.5);
    const w = width * lerp(0.6, 1.3, r());
    out += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - vx * tail)}" y2="${f(y - vy * tail)}" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" opacity="${f3((1 - k) ** 1.5)}"/>`;
  }
  return out ? `<g style="mix-blend-mode:screen">${out}</g>` : '';
}

/** Ink thrown off an impact: drops flying out from `at` and landing, with a few small satellites. */
export function splatter({ seed = 1, n = 18, t, t0, at: [ox, oy], reach = 120, size = [1.5, 6], color = '#0B0E15', fly = 140, opacity = 1, angle = 0, spread = Math.PI * 2, from = [0, 0] }) {
  const dt = t - t0;
  if (dt < 0) return '';
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const a = angle + (r() - 0.5) * spread, d = reach * lerp(0.35, 1, r() ** 0.7), s = lerp(size[0], size[1], r() ** 2);
    const k = smooth(Math.min(1, dt / (fly * lerp(0.6, 1.2, r()))));
    // Drops leave from the thing's edge (an ellipse of radii `from`), never from over its face.
    const x = ox + Math.cos(a) * (from[0] + d * k), y = oy + Math.sin(a) * (from[1] + d * k);
    const stretch = 1 + (1 - k) * 2.2;
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * stretch)}" ry="${f(s / Math.sqrt(stretch))}" transform="rotate(${f((a * 180) / Math.PI)} ${f(x)} ${f(y)})" fill="${color}"/>`;
  }
  return `<g opacity="${f3(opacity)}">${out}</g>`;
}

/** A puff of dust from an impact: soft rings expanding and thinning out. */
export function puff(D, id, { t, t0, at: [ox, oy], r = 60, ms = 520, color = '#D8C9AE', opacity = 0.45, n = 6, seed = 3 }) {
  const dt = t - t0;
  if (dt < 0 || dt > ms) return '';
  const k = dt / ms;
  const g = radial(D, `${id}-g`, [[0, color, 0.9], [0.6, color, 0.35], [1, color, 0]]);
  const R = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const a = R() * Math.PI * 2, d = r * lerp(0.2, 0.8, R()) * smooth(k), s = r * lerp(0.35, 0.7, R()) * lerp(0.6, 1.5, smooth(k));
    out += `<circle cx="${f(ox + Math.cos(a) * d)}" cy="${f(oy + Math.sin(a) * d * 0.6)}" r="${f(s)}" fill="${g}"/>`;
  }
  return `<g opacity="${f3(opacity * (1 - k) ** 1.4)}">${out}</g>`;
}

/** Falling rain: thin streaks in the box. */
export function rain({ seed = 5, n = 70, t, box: [bx, by, bw, bh], len = 16, speed = 1.1, slant = 0.18, color = '#C9D6E8', opacity = 0.35, width = 1 }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const u = r(), ph = r(), sp = speed * lerp(0.8, 1.25, r());
    const y = by + ((ph * bh + t * sp) % (bh + len)) - len;
    const x = bx + ((u * bw + (y - by) * slant) % bw);
    out += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - slant * len)}" y2="${f(y + len)}" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" opacity="${f3(opacity * lerp(0.5, 1, r()))}"/>`;
  }
  return `<g>${out}</g>`;
}

/**
 * Speed lines bursting out from behind an edge, as a comic draws an impact (`k` 0..1 of their life):
 * tapered wedges, thick where they leave the edge and sharp at their tips, flying out and thinning.
 * `aspect` squashes the ring (a wide plate throws a wide burst).
 */
export function impactLines({ seed = 2, n = 22, k, at: [cx, cy], r0, r1, color = '#F4EAD8', width = 2.4, opacity = 0.9, aspect = 1 }) {
  if (k <= 0 || k >= 1) return '';
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.22;
    const a0 = r0 * lerp(0.96, 1.1, r()), len = (r1 - r0) * lerp(0.45, 1, r()), w = width * lerp(0.7, 1.6, r());
    const grow = ease.outExpo(Math.min(1, k * 2.4)), gone = ease.inCubic(Math.max(0, (k - 0.25) / 0.75));
    const s0 = a0 + len * gone, s1 = a0 + len * grow;
    if (s1 - s0 < 1) continue;
    const ux = Math.cos(a) * aspect, uy = Math.sin(a), nx = -uy, ny = ux;
    const base = [cx + ux * s0, cy + uy * s0], tip = [cx + ux * s1, cy + uy * s1];
    const hw = (w / 2) * (1 - gone * 0.6);
    out += `<path d="M${f(base[0] + nx * hw)} ${f(base[1] + ny * hw)}L${f(tip[0])} ${f(tip[1])}L${f(base[0] - nx * hw)} ${f(base[1] - ny * hw)}Z" fill="${color}"/>`;
  }
  return `<g opacity="${f3(opacity * (1 - k) ** 0.7)}">${out}</g>`;
}

// ---------- ink ----------

/** A blot of ink: a circle of radius `r` whose edge is torn by noise (`rough` 0..1 of r). */
export function blotPath({ cx, cy, r, seed = 1, rough = 0.18, points = 72, wobble = 0 }) {
  const list = [];
  for (let i = 0; i < points; i += 1) {
    const u = i / points;
    const n = loopNoise(u * 9 + wobble, 9, seed, 4);
    const rr = r * (1 + rough * n);
    list.push([cx + Math.cos(u * Math.PI * 2) * rr, cy + Math.sin(u * Math.PI * 2) * rr]);
  }
  return smoothPath(list, true, 0.9);
}

/**
 * The ink tide the openings end on, `v` 0..1: blots of ink bloom from the frame's edges and corners,
 * with drops thrown ahead of them, and meet over the middle. At 1 the frame is ink alone.
 */
export function inkTide({ width: W, height: H, v, seed = 11, color = '#07090F', edge = '#000000' }) {
  if (v <= 0) return '';
  const R = rng(seed);
  const diag = Math.hypot(W, H);
  const sources = [[0, 0], [W, 0], [W, H], [0, H], [W * 0.5, -H * 0.04], [W * 1.04, H * 0.55], [W * 0.45, H * 1.04], [-W * 0.04, H * 0.45]];
  // Each blot: a soft dark bleed running ahead of its edge, the ink itself, and drops thrown ahead.
  // Every bleed is drawn before any ink, so where blots meet no edge is drawn over another's ink.
  let bleed = '', ink = '', drops = '';
  sources.forEach(([sx, sy], i) => {
    const delay = R() * 0.22;
    const k = clamp01((v - delay) / (1 - delay));
    const toward = Math.atan2(H / 2 - sy, W / 2 - sx);
    const thrown = Array.from({ length: 6 }, () => [toward + (R() - 0.5) * 1.7, lerp(1.04, 1.32, R()), lerp(0.003, 0.012, R())]);
    if (k <= 0) return;
    const r = diag * (0.04 + 0.8 * (k ** 1.55));
    const wobble = v * 2.2;
    bleed += `<path d="${blotPath({ cx: sx, cy: sy, r: r * 1.07, seed: seed + i * 13, rough: 0.2, wobble, points: 96 })}" fill="${edge}" opacity="0.38"/>`;
    ink += `<path d="${blotPath({ cx: sx, cy: sy, r, seed: seed + i * 13, rough: 0.17, wobble, points: 96 })}" fill="${color}"/>`;
    for (const [a, reach, size] of thrown) {
      const d = r * reach, s = diag * size * (0.35 + k);
      drops += `<circle cx="${f(sx + Math.cos(a) * d)}" cy="${f(sy + Math.sin(a) * d)}" r="${f(s)}" fill="${color}"/>`;
    }
  });
  const full = v >= 0.985 ? `<rect width="${W}" height="${H}" fill="${color}"/>` : '';
  return `<g>${bleed}${ink}${drops}${full}</g>`;
}

// ---------- finish ----------

/**
 * The film's finish over a frame: a grade (a colour laid over with a blend), a vignette and grain
 * (changing 24 times a second, as film's does, whatever the frame rate).
 */
export function finish(D, id, { width: W, height: H, t, grain = 0.09, vignette = 0.55, grade = null, gradeOpacity = 0.12, gradeBlend = 'soft-light', seed = 17 }) {
  let out = '';
  if (grade) out += `<rect width="${W}" height="${H}" fill="${grade}" opacity="${f3(gradeOpacity)}" style="mix-blend-mode:${gradeBlend}"/>`;
  if (vignette > 0) {
    const g = radial(D, `${id}-vig`, [[0, '#000000', 0], [0.55, '#000000', 0], [0.82, '#000000', 0.45], [1, '#000000', 0.95]], { r: 0.75 });
    out += `<rect width="${W}" height="${H}" fill="${g}" opacity="${f3(vignette)}"/>`;
  }
  if (grain > 0) {
    const frame = Math.floor(Math.max(0, t) / (1000 / 24));
    const gid = `${id}-grain-${frame % 12}`;
    D.use(gid, `<filter id="${gid}" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="2" seed="${seed + (frame % 12) * 7}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer></filter>`);
    out += `<rect width="${W}" height="${H}" filter="url(#${gid})" opacity="${f3(grain)}" style="mix-blend-mode:overlay"/>`;
  }
  return out;
}

/** A light leak: warm light bleeding in from one side of the frame (memory, a flash). */
export function leak(D, id, { width: W, height: H, k, color = '#FFB86A', side = 'left' }) {
  if (k <= 0.001) return '';
  const g = side === 'left'
    ? linear(D, `${id}-g`, [[0, color, 0.9], [0.45, color, 0.25], [1, color, 0]], { x1: 0, y1: 0, x2: 1, y2: 0.3 })
    : linear(D, `${id}-g`, [[0, color, 0], [0.55, color, 0.25], [1, color, 0.9]], { x1: 0, y1: 0.3, x2: 1, y2: 0 });
  return `<rect width="${W}" height="${H}" fill="${g}" opacity="${f3(k)}" style="mix-blend-mode:screen"/>`;
}

/** A halftone dot pattern (ink dots on a 45° grid), for printed shading. */
export function halftone(D, id, { size = 5, r = 1.1, color = '#151923', angle = 45 }) {
  return D.use(id, `<pattern id="${id}" width="${f(size)}" height="${f(size)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${f(size / 2)}" cy="${f(size / 2)}" r="${f(r)}" fill="${color}"/></pattern>`);
}

/** A stable per-element random in -1..1, for jitter that must not change between frames. */
export const jitter = (i, seed = 0) => hash(i, seed) * 2 - 1;

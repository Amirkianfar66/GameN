// mothership:dev-only
//
// The character pilot's ink (the owner's decisions of 7 November 2026, docs/design/character-pilot.md):
// noir light, comic-book inking and a hand-drawn line. A proposal drawn beside the approved rig
// (design/board-motion/figures/), which it reads and never changes.
//
// What makes the look:
// - Every form is inked with a brush ribbon, not a hairline: heavy on the side away from the light,
//   thin on the lit side, with a slight hand-drawn waver that is part of the shape (it does not
//   boil from frame to frame).
// - Light comes from the upper left, as in the rig. The shadow side of every form is a hard noir
//   cel shadow, hatched with ink, and a cool rim light catches its edge.
// - Fills carry a faint scratched texture, as if inked on paper.
// Each form's geometry is defined once and reused (<use>), so a drawing stays compact.

export const INK = '#151923';
/** The light: from the upper left. AWAY is the side a form's shadow falls on. */
const LIGHT = unit([-1, -0.78]);
const AWAY = [-LIGHT[0], -LIGHT[1]];
const RIM = '#D8E0E8';

const r1 = n => Math.round(n * 10) / 10;
export const add = ([x, y], [u, v], k = 1) => [x + u * k, y + v * k];
export const sub = ([x, y], [u, v]) => [x - u, y - v];
export const mul = ([x, y], k) => [x * k, y * k];
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function unit([x, y]) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
export const perp = ([x, y]) => [-y, x];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/** A deterministic hash in 0..1 for integer inputs. */
function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) { h ^= Math.floor(x) + 0x9E3779B9; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return ((h >>> 0) % 100000) / 100000;
}
/** Smooth value noise along a line, -1..1. */
export function noise(seed, x) {
  const i = Math.floor(x), t = x - i;
  const a = hash(seed, i) * 2 - 1, b = hash(seed, i + 1) * 2 - 1;
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}

/** A Catmull-Rom point (tension 1: the rig's blob() curves). */
function catmull(p0, p1, p2, p3, t, k) {
  const m1 = mul(sub(p2, p0), 0.5 * k), m2 = mul(sub(p3, p1), 0.5 * k);
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  return [h00 * p1[0] + h10 * m1[0] + h01 * p2[0] + h11 * m2[0], h00 * p1[1] + h10 * m1[1] + h01 * p2[1] + h11 * m2[1]];
}

/** A smooth curve through control points, sampled every `step` units. */
export function spline(points, { closed = true, step = 2, tension = 1 } = {}) {
  const n = points.length;
  if (n < 2) return points.slice();
  const out = [];
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i += 1) {
    const p0 = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = points[i];
    const p2 = points[(i + 1) % n], p3 = points[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    const k = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let j = 0; j < k; j += 1) out.push(catmull(p0, p1, p2, p3, j / k, tension));
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

/** Outward normals of a closed polyline (either winding). */
function normals(poly, closed = true) {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i += 1) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sign = closed && area < 0 ? -1 : 1;
  return poly.map((p, i) => {
    const prev = poly[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = poly[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const [tx, ty] = unit(sub(next, prev));
    return [ty * sign, -tx * sign];
  });
}

/** The hand-drawn waver: each point pushed along its normal by smooth noise of its distance along the outline. */
export function waver(poly, seed, amp, wavelength = 14, closed = true) {
  if (!amp) return poly;
  const nn = normals(poly, closed);
  let s = 0;
  return poly.map((p, i) => {
    if (i) s += dist(p, poly[i - 1]);
    return add(p, nn[i], amp * noise(seed, s / wavelength));
  });
}

const pathOf = (poly, closed = true) => `M${poly.map(p => `${r1(p[0])} ${r1(p[1])}`).join('L')}${closed ? 'Z' : ''}`;

/**
 * The ink ribbon round a closed outline: heavier where the outline faces away from the light,
 * mostly outside the fill so a form keeps its size. Returns an evenodd path (outer and inner rings).
 */
function ribbon(poly, weight, seed) {
  const nn = normals(poly);
  let s = 0;
  const outer = [], inner = [];
  poly.forEach((p, i) => {
    if (i) s += dist(p, poly[i - 1]);
    const facing = smooth((dot(nn[i], AWAY) + 0.35) / 1.2);
    const w = weight * (0.5 + 0.95 * facing) * (1 + 0.22 * noise(seed + 7, s / 9));
    outer.push(add(p, nn[i], w * 0.7));
    inner.push(add(p, nn[i], -w * 0.3));
  });
  return `${pathOf(outer)}${pathOf(inner.reverse())}`;
}

/** A tapered brush stroke along an open polyline: thin at both ends (or one), full in the middle. */
function brush(poly, weight, { taper = 'both', seed = 3 } = {}) {
  const nn = normals(poly, false);
  const total = poly.reduce((acc, p, i) => acc + (i ? dist(p, poly[i - 1]) : 0), 0) || 1;
  let s = 0;
  const left = [], right = [];
  poly.forEach((p, i) => {
    if (i) s += dist(p, poly[i - 1]);
    const u = s / total;
    const head = taper === 'end' ? 1 : smooth(u / 0.3), tail = taper === 'start' ? 1 : smooth((1 - u) / 0.3);
    const w = weight * (0.28 + 0.72 * Math.min(head, tail)) * (1 + 0.18 * noise(seed, s / 7));
    left.push(add(p, nn[i], w / 2));
    right.push(add(p, nn[i], -w / 2));
  });
  return pathOf([...left, ...right.reverse()]);
}

/** A colour mixed toward ink (k 0..1): a noir shadow tone of a fill. */
export function shade(hex, k = 0.45) {
  const c = hex.replace('#', ''), ink = INK.replace('#', '');
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const mix = i => Math.round(ch(c, i) + (ch(ink, i) - ch(c, i)) * k).toString(16).padStart(2, '0');
  return `#${mix(0)}${mix(2)}${mix(4)}`.toUpperCase();
}
/** A colour mixed toward white (k 0..1): a highlight. */
export function tint(hex, k = 0.3) {
  const c = hex.replace('#', '');
  const mix = i => Math.round(parseInt(c.slice(i, i + 2), 16) + (255 - parseInt(c.slice(i, i + 2), 16)) * k).toString(16).padStart(2, '0');
  return `#${mix(0)}${mix(2)}${mix(4)}`.toUpperCase();
}

/**
 * A drawing in progress (the rig's canvas, in the pilot's ink). What is drawn inside front() goes
 * to a second layer, laid over a place's prop, as in the rig.
 */
export function inkCanvas(prefix) {
  const defs = [
    `<pattern id="${prefix}-hatch" width="2.8" height="2.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0V2.8" stroke="${INK}" stroke-width="0.62" opacity="0.42"/></pattern>`,
    `<pattern id="${prefix}-grain" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M1 3l3 -1.3M6.2 8.4l2.6 -1M3 9.6l1.7 -0.7M8 2.4l1.6 -0.8" stroke="${INK}" stroke-width="0.4" stroke-linecap="round" opacity="0.2"/></pattern>`,
  ];
  const layers = { body: [], front: [] };
  let body = layers.body;
  let count = 0;
  const id = kind => `${prefix}-${kind}${(count += 1)}`;
  const api = {
    prefix,
    /**
     * A closed form through control points: its fill, a noir cel shadow on the side away from
     * the light (depth: how far the shadow reaches in, in units; 0 for none), hatching and a
     * rim light in the shadow, a scratched texture, and the brush ink round it.
     */
    form(points, fill, { weight = 2.4, depth = null, tension = 1, wobble = 0.35, seed = 1, rim = true, hatch = true, grain = true, shadowTone = null, step = 2, clip = null } = {}) {
      const poly = waver(spline(points, { tension, step }), seed, wobble);
      return api.polyForm(poly, fill, { weight, depth, rim, hatch, grain, shadowTone, seed, clip });
    },
    /**
     * A closed form already sampled into a polygon. clip: another form's clip id, to keep this one
     * inside it (a panel of a sleeve). Returns this form's own clip id.
     */
    polyForm(poly, fill, { weight = 2.4, depth = null, rim = true, hatch = true, grain = true, shadowTone = null, seed = 1, clip = null } = {}) {
      const pid = id('p'), cid = id('c');
      defs.push(`<path id="${pid}" d="${pathOf(poly)}"/>`, `<clipPath id="${cid}"><use href="#${pid}"/></clipPath>`);
      const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
      const size = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const d = depth ?? Math.max(1.2, Math.min(7, size * 0.2));
      const parts = [`<use href="#${pid}" fill="${fill}"/>`];
      const inner = [];
      if (d > 0) {
        inner.push(`<use href="#${pid}" fill="${shadowTone ?? shade(fill)}"/>`);
        if (hatch) inner.push(`<use href="#${pid}" fill="url(#${prefix}-hatch)"/>`);
        if (rim) inner.push(`<use href="#${pid}" fill="none" stroke="${RIM}" stroke-width="${r1(Math.min(3.4, d * 0.9))}" opacity="0.55"/>`);
        inner.push(`<use href="#${pid}" fill="${fill}" transform="translate(${r1(LIGHT[0] * d)} ${r1(LIGHT[1] * d)})"/>`);
      }
      if (grain) inner.push(`<use href="#${pid}" fill="url(#${prefix}-grain)"/>`);
      if (inner.length) parts.push(`<g clip-path="url(#${cid})">${inner.join('')}</g>`);
      if (weight > 0) parts.push(`<path d="${ribbon(poly, weight, seed)}" fill="${INK}" fill-rule="evenodd"/>`);
      body.push(clip ? `<g clip-path="url(#${clip})">${parts.join('')}</g>` : parts.join(''));
      return cid;
    },
    /** A limb from joint to joint as one form: an outline round the bones, its radius at each joint. Returns its clip id. */
    limb(joints, radii, fill, opts = {}) {
      return api.polyForm(waver(limbOutline(joints, radii), opts.seed ?? 5, opts.wobble ?? 0.3), fill, { depth: Math.max(...radii) * 0.62, ...opts });
    },
    /** The ink round a polygon again, over what was drawn inside it (a panel's edge kept crisp). */
    outline(poly, weight = 2.4, seed = 1) {
      body.push(`<path d="${ribbon(poly, weight, seed)}" fill="${INK}" fill-rule="evenodd"/>`);
    },
    /** A tapered brush line through points. */
    line(points, { weight = 1.4, color = INK, taper = 'both', tension = 1, seed = 3, opacity = null } = {}) {
      const poly = points.length > 2 ? spline(points, { closed: false, step: 1.6, tension }) : spline(points, { closed: false, step: 1.6 });
      body.push(`<path d="${brush(poly, weight, { taper, seed })}" fill="${color}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
    },
    /** A plain filled shape: no ink, no shadow (eyes' whites, highlights, a contact shadow). */
    flat(points, color, { opacity = null, tension = 1, closed = true } = {}) {
      body.push(`<path d="${pathOf(spline(points, { tension, closed }), closed)}" fill="${color}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
    },
    raw(svg) { body.push(svg); },
    /** A fresh id under this canvas's prefix, and a definition added to its defs. */
    uid: kind => id(kind),
    def(svg) { defs.push(svg); },
    group(transform, draw) { body.push(`<g transform="${transform}">`); draw(); body.push('</g>'); },
    front(draw) { const keep = body; body = layers.front; draw(); body = keep; },
    hasFront: () => layers.front.length > 0,
    defs: () => defs.join(''),
    layer: (name = 'body') => layers[name].join(''),
    /** The drawing as an inline SVG element sized by its viewBox. */
    svg({ viewBox, layer = 'body', width = null, height = null }) {
      const size = width ? ` width="${width}" height="${height}"` : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size} preserveAspectRatio="xMidYMid meet"><defs>${defs.join('')}</defs>${layers[layer].join('')}</svg>`;
    },
  };
  return api;
}

/**
 * The outline of a limb round its bones (shoulder, elbow, wrist; hip, knee, ankle): each side
 * offset by the radius at each joint, the ends rounded. A bent limb stays one form.
 */
export function limbOutline(joints, radii) {
  const n = joints.length;
  const nn = joints.map((p, i) => perp(unit(sub(joints[Math.min(i + 1, n - 1)], joints[Math.max(i - 1, 0)]))));
  const a = joints.map((p, i) => add(p, nn[i], radii[i]));
  const b = joints.map((p, i) => add(p, nn[i], -radii[i]));
  const cap = (centre, from, to, r, dir) => {
    const out = [];
    const a0 = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    let a1 = Math.atan2(to[1] - centre[1], to[0] - centre[0]);
    let sweep = a1 - a0;
    if (dir > 0 && sweep < 0) sweep += Math.PI * 2;
    if (dir < 0 && sweep > 0) sweep -= Math.PI * 2;
    for (let k = 1; k < 8; k += 1) { const t = a0 + (sweep * k) / 8; out.push([centre[0] + Math.cos(t) * r, centre[1] + Math.sin(t) * r]); }
    return out;
  };
  const along = unit(sub(joints[n - 1], joints[n - 2]));
  // Which way round the end caps go: through the point beyond each end joint, so the ends are round
  // (the hips of a seated figure, the neck under a raised chin).
  const endDir = Math.sign((a[n - 1][0] - joints[n - 1][0]) * along[1] - (a[n - 1][1] - joints[n - 1][1]) * along[0]) || 1;
  const sideA = spline(a, { closed: false, step: 2 });
  const sideB = spline(b, { closed: false, step: 2 }).reverse();
  return [
    ...sideA,
    ...cap(joints[n - 1], a[n - 1], b[n - 1], radii[n - 1], endDir),
    ...sideB,
    ...cap(joints[0], b[0], a[0], radii[0], endDir),
  ].filter((p, i, arr) => !i || dist(p, arr[i - 1]) > 0.05);
}

/**
 * The continuous-corner rounded square of an iOS app icon (a superellipse, n = 5), centred at
 * cx, cy with a half-size of r: the owner's "icon border like iOS style".
 */
export function squircle(cx, cy, r, n = 5, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([cx + r * Math.sign(c) * Math.abs(c) ** (2 / n), cy + r * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return pts;
}
export const pathOfPoly = pathOf;

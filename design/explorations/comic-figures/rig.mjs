// mothership:dev-only
//
// A pilot for the owner's question of 9 October 2026: can the crew look more like a comic
// book, as in the reference page? This draws a full-body comic figure (ink outline, a cel
// shadow with halftone, hatching inside the shadow) from a pose skeleton, so that each
// character's face and colors combine with shared poses instead of being drawn once per pose.
// Development only: nothing here is an asset, and nothing reviewed reads it. Every drawing
// stays inside the repository's drawing vocabulary (paths, shapes, patterns, clip paths).

export const INK = '#151923';
export const PAPER = '#F4EBDD';

const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
const toHex = rgb => `#${rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
export const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
export const shade = (color, t = 0.34) => mix(color, INK, t);

const f = n => Number(n.toFixed(2));
export const pt = ([x, y]) => `${f(x)} ${f(y)}`;
export const add = ([x, y], [u, v], k = 1) => [x + u * k, y + v * k];
export const sub = ([x, y], [u, v]) => [x - u, y - v];
const len = ([x, y]) => Math.hypot(x, y) || 1;
export const unit = v => { const l = len(v); return [v[0] / l, v[1] / l]; };
const normal = ([x, y]) => [-y, x];
// Light comes from the upper left: the shadow side of a form faces right and down.
const AWAY = unit([1, 0.75]);

/** The cubic segments of a smooth open curve through points, without the opening move. */
function through(p, tension = 1) {
  let d = '';
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += ` C${pt(add(p1, sub(p2, p0), tension / 6))} ${pt(add(p2, sub(p3, p1), -tension / 6))} ${pt(p2)}`;
  }
  return d;
}

/** A smooth closed shape through points. */
export function blob(points, tension = 1) {
  const p = points, n = p.length;
  let d = `M${pt(p[0])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    d += ` C${pt(add(p1, sub(p2, p0), tension / 6))} ${pt(add(p2, sub(p3, p1), -tension / 6))} ${pt(p2)}`;
  }
  return `${d} Z`;
}

/** An open smooth stroke through points. */
export const curve = (points, tension = 1) => `M${pt(points[0])}${through(points, tension)}`;

/** The normals of a chain of joints: at a bend, the mean of the two segments'. */
function normals(points) {
  return points.map((p, i) => {
    const a = unit(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]));
    return normal(a);
  });
}

/**
 * One limb from joint to joint (shoulder, elbow, wrist; hip, knee, ankle) as one outline, so
 * that a bent arm reads as one arm and not as two pieces.
 */
export function chain(points, radii) {
  const n = normals(points);
  const A = points.map((p, i) => add(p, n[i], radii[i]));
  const B = points.map((p, i) => add(p, n[i], -radii[i])).reverse();
  const last = radii.length - 1;
  return `M${pt(A[0])}${through(A)} A${f(radii[last])} ${f(radii[last])} 0 0 0 ${pt(B[0])}${through(B)} A${f(radii[0])} ${f(radii[0])} 0 0 0 ${pt(A[0])} Z`;
}

/** The shadow side of a chain: the same limb, narrower and pushed away from the light. */
export function chainShadow(points, radii, depth = 0.86) {
  const n = normals(points);
  const side = n.reduce((s, v) => s + v[0] * AWAY[0] + v[1] * AWAY[1], 0) >= 0 ? 1 : -1;
  return chain(points.map((p, i) => add(p, n[i], side * radii[i] * depth)), radii.map(r => r * 0.56));
}

/** A cloud of curls (an afro, a bun, a beard's edge): bumps around an ellipse. */
export function cloud([cx, cy], rx, ry, bumps = 14, from = 0, to = Math.PI * 2, bulge = 0.62) {
  const closed = Math.abs(to - from - Math.PI * 2) < 1e-6;
  const count = closed ? bumps : bumps + 1;
  const p = Array.from({ length: count }, (_, i) => {
    const a = from + ((to - from) * i) / bumps;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  let d = `M${pt(p[0])}`;
  for (let i = 1; i <= (closed ? bumps : bumps); i += 1) {
    const q = p[i % p.length], prev = p[i - 1];
    const r = len(sub(q, prev)) * bulge;
    d += ` A${f(r)} ${f(r)} 0 0 1 ${pt(q)}`;
  }
  return closed ? `${d} Z` : d;
}

/** Diagonal hatching across a box, to be clipped to a shadow. */
export function hatchLines([x0, y0, x1, y1], spacing = 3.6, slope = 1) {
  const lines = [];
  for (let c = x0 - (y1 - y0) * slope; c < x1; c += spacing) lines.push(`M${f(c)} ${f(y1)} L${f(c + (y1 - y0) * slope)} ${f(y0)}`);
  return lines.join(' ');
}

/**
 * A drawing in progress. Every shape is inked; a form can carry a cel shadow on its shadow
 * side, clipped to itself, with halftone and hatching inside that shadow only. What is drawn
 * inside front() goes to a second layer of the same size, laid over the room's prop: the
 * hands on the chart table, the arms on the Hospital blanket.
 */
export function canvas(prefix) {
  const defs = [];
  const layers = { body: [], front: [] };
  let body = layers.body;
  let clips = 0;
  defs.push(`<pattern id="${prefix}-dots" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="1.5" cy="1.5" r="0.7" fill="${INK}"/></pattern>`);
  const clip = d => { const id = `${prefix}-clip-${(clips += 1)}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };
  const api = {
    prefix,
    raw: markup => body.push(markup),
    /**
     * A filled, inked form. shadow: the dark side of it, in the form's color darkened, with
     * halftone dots (dots) and diagonal hatching (hatch: the box to hatch) inside the shadow.
     */
    form(d, fill, { stroke = 2.4, shadow = null, hatch = null, dots = true, depth = 0.34 } = {}) {
      const parts = [`<path d="${d}" fill="${fill}"/>`];
      if (shadow) {
        const outer = clip(d);
        const inner = [`<path d="${shadow}" fill="${shade(fill, depth)}"/>`];
        if (dots) inner.push(`<path d="${shadow}" fill="url(#${prefix}-dots)" opacity="0.32"/>`);
        if (hatch) {
          const inShadow = clip(shadow);
          inner.push(`<g clip-path="url(#${inShadow})"><path d="${hatchLines(hatch)}" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.42"/></g>`);
        }
        parts.push(`<g clip-path="url(#${outer})">${inner.join('')}</g>`);
      }
      parts.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`);
      body.push(parts.join(''));
    },
    /** A limb as one inked outline with its cel shadow. */
    limb(points, radii, fill, { stroke = 2.4, hatch = true } = {}) {
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]), r = Math.max(...radii);
      api.form(chain(points, radii), fill, { stroke, shadow: chainShadow(points, radii), hatch: hatch ? [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r] : null });
    },
    line(d, { width = 1.4, color = INK, cap = 'round', opacity = null } = {}) {
      body.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
    },
    fill(d, color, opacity = null) { body.push(`<path d="${d}" fill="${color}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`); },
    group(transform, draw) { body.push(`<g transform="${transform}">`); draw(); body.push('</g>'); },
    /** Draws over the prop: the part of the figure in front of the table, counter or blanket. */
    front(draw) { const keep = body; body = layers.front; draw(); body = keep; },
    hasFront: () => layers.front.length > 0,
    svg({ viewBox, width, height, comment, layer = 'body' }) {
      const drawn = layers[layer];
      return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · ${comment}
  Generated by design/explorations/comic-figures/build.mjs from rig.mjs. A pilot, not an asset.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>${defs.join('')}</defs>
  ${drawn.join('\n  ')}
</svg>
`;
    },
  };
  return api;
}

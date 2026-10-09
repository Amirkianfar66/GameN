// mothership:dev-only
//
// The comic drawing rig of the board-motion figures (owner's decision of 9 October 2026:
// "lets try full body comic"). A figure is drawn from a pose skeleton, so that each
// character's head and colors combine with shared poses instead of being drawn once per pose.
//
// Every shape is inked. A form can carry a cel shadow on the side away from the light (upper
// left), with halftone dots and diagonal hatching inside the shadow only. The shadow is the
// next darker tone of the public palette where the form is in it (suit, boots, paper), and an
// ink tint over anything else (skin, hair, a character's colors), so that a figure holds no
// color outside the palette a crew picture is allowed. Every drawing stays inside the
// repository's drawing vocabulary: paths, shapes, patterns and clip paths.

export const INK = '#151923';
export const PAPER = '#F4EBDD';
export const PAPER_SHADE = '#E3D6C2';
export const PAPER_DEEP = '#CBBBA2';
export const SUIT = '#C6CDD4';
export const STEEL = { deep: '#222B3A', shadow: '#34415A', mid: '#55657E', light: '#8696AE', pale: '#B9C4D3' };

/** The tone a form's shadow takes, where the form is a public tone; anything else is tinted with ink. */
const TONE_DOWN = {
  [SUIT]: STEEL.light, [STEEL.pale]: STEEL.light, [STEEL.light]: STEEL.mid, [STEEL.mid]: STEEL.shadow,
  [STEEL.shadow]: STEEL.deep, [STEEL.deep]: INK, [PAPER]: PAPER_SHADE, [PAPER_SHADE]: PAPER_DEEP,
};

const f = n => Number(n.toFixed(1));
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
  return points.map((p, i) => normal(unit(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]))));
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

/** A cloud of curls (an afro, a bun): bumps around an ellipse, or an arc of them. */
export function cloud([cx, cy], rx, ry, bumps = 14, from = 0, to = Math.PI * 2, bulge = 0.62) {
  const closed = Math.abs(to - from - Math.PI * 2) < 1e-6;
  const count = closed ? bumps : bumps + 1;
  const p = Array.from({ length: count }, (_, i) => {
    const a = from + ((to - from) * i) / bumps;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  let d = `M${pt(p[0])}`;
  for (let i = 1; i <= bumps; i += 1) {
    const q = p[i % p.length], prev = p[i - 1];
    const r = len(sub(q, prev)) * bulge;
    d += ` A${f(r)} ${f(r)} 0 0 1 ${pt(q)}`;
  }
  return closed ? `${d} Z` : d;
}

/**
 * A drawing in progress. What is drawn inside front() goes to a second layer of the same size,
 * laid over the room's prop: the hands on the chart table, the arms on the Hospital blanket.
 */
export function canvas(prefix) {
  // Halftone dots; and dots with diagonal hatching, in one pattern so a shadow needs one path for both.
  const defs = [
    `<pattern id="${prefix}-dots" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="1.5" cy="1.5" r="0.7" fill="${INK}" opacity="0.3"/></pattern>`,
    `<pattern id="${prefix}-hatch" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V3.6" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.4"/><circle cx="1.8" cy="1.8" r="0.7" fill="${INK}" opacity="0.3"/></pattern>`,
  ];
  const layers = { body: [], front: [] };
  let body = layers.body;
  let clips = 0;
  const clip = d => { const id = `${prefix}-clip-${(clips += 1)}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };
  const api = {
    prefix,
    /**
     * A filled, inked form. shadow: the dark side of it (the next darker public tone, or an ink
     * tint of depth), with halftone dots (dots) and diagonal hatching (hatch) inside it only.
     */
    form(d, fill, { stroke = 2.4, shadow = null, hatch = false, dots = true, depth = 0.24 } = {}) {
      const parts = [`<path d="${d}" fill="${fill}"/>`];
      if (shadow) {
        const tone = TONE_DOWN[fill.toUpperCase()];
        const inner = [tone ? `<path d="${shadow}" fill="${tone}"/>` : `<path d="${shadow}" fill="${INK}" opacity="${depth}"/>`];
        if (hatch) inner.push(`<path d="${shadow}" fill="url(#${prefix}-hatch)"/>`);
        else if (dots) inner.push(`<path d="${shadow}" fill="url(#${prefix}-dots)"/>`);
        parts.push(`<g clip-path="url(#${clip(d)})">${inner.join('')}</g>`);
      }
      parts.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`);
      body.push(parts.join(''));
    },
    /** A limb as one inked outline with its cel shadow. */
    limb(points, radii, fill, { stroke = 2.4, hatch = true } = {}) {
      api.form(chain(points, radii), fill, { stroke, shadow: chainShadow(points, radii), hatch });
    },
    line(d, { width = 1.4, color = INK, cap = 'round', opacity = null } = {}) {
      body.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
    },
    fill(d, color, opacity = null) { body.push(`<path d="${d}" fill="${color}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`); },
    group(transform, draw) { body.push(`<g transform="${transform}">`); draw(); body.push('</g>'); },
    /** Draws over the prop: the part of the figure in front of the table, counter or blanket. */
    front(draw) { const keep = body; body = layers.front; draw(); body = keep; },
    hasFront: () => layers.front.length > 0,
    /** The drawing as an SVG document; header is its comment, layer 'body' or 'front'. */
    svg({ viewBox, width, height, header, layer = 'body' }) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<!--
${header}
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>${defs.join('')}</defs>
  ${layers[layer].join('\n  ')}
</svg>
`;
    },
  };
  return api;
}

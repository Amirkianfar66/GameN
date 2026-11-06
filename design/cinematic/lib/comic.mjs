// mothership:dev-only
//
// The cinematic library's comic effects as SVG markup: light cones and pools, shockwave rings,
// impact bursts, speed lines, deterministic particles, halftone screens, panel frames, letterbox
// and the filters they use (bloom, grain, directional blur, gravitational lensing). Pure string
// builders of the Comic Noir vocabulary: ink contours, halftone, paper highlights, deliberate
// light. Nothing here reads a game fact; a film passes in what to draw and where.

import { lerp, rand } from './ease.mjs';

export const INK = '#151923';
export const PAPER = '#F4EBDD';
export const AMBER = '#F2C14E';
const f = v => Number((+v).toFixed(2));

/**
 * The filters and patterns the effects reference, under `prefix` so two films on one page never
 * share an id. Bloom (two blur radii), grain, a horizontal motion blur, a halftone dot screen and
 * a gravitational-lens displacement driven by `lens` (0 for none).
 */
export function fxDefs(prefix, { lens = 0, seed = 7 } = {}) {
  return `<defs>`
    + `<filter id="${prefix}-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`
    + `<filter id="${prefix}-bloom-wide" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18"/></filter>`
    + `<filter id="${prefix}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `<filter id="${prefix}-mblur" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="9 0.6"/></filter>`
    + `<filter id="${prefix}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0.09 0"/></filter>`
    + `<filter id="${prefix}-lens" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f(lens)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    + `<pattern id="${prefix}-dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="3.5" cy="3.5" r="1.45" fill="${INK}"/></pattern>`
    + `<pattern id="${prefix}-dots-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="3.5" cy="3.5" r="1.3" fill="${PAPER}"/></pattern>`
    + `</defs>`;
}

/** A cone of light from `from` toward `to`, `spread` wide at its far end, fading along its length. */
export function lightCone(prefix, id, { from, to, spread, color = '#BFF4FF', opacity = 0.5, near = 10 }) {
  const [x0, y0] = from, [x1, y1] = to;
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const p = [[x0 + nx * near, y0 + ny * near], [x1 + nx * spread, y1 + ny * spread], [x1 - nx * spread, y1 - ny * spread], [x0 - nx * near, y0 - ny * near]];
  const g = `${prefix}-cone-${id}`;
  return `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}">`
    + `<stop offset="0" stop-color="${color}" stop-opacity="${f(opacity)}"/><stop offset="0.7" stop-color="${color}" stop-opacity="${f(opacity * 0.35)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
    + `<polygon points="${p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
}

/** A soft pool of light (an ellipse fading to nothing). */
export function lightPool(prefix, id, { cx, cy, rx, ry = rx, color = '#BFF4FF', opacity = 0.5 }) {
  const g = `${prefix}-pool-${id}`;
  return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${f(opacity)}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${f(opacity * 0.4)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`
    + `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
}

/** A shockwave: an inked ring with a bright core line, `r` its radius, fading with `opacity`. */
export function ring({ cx, cy, r, width = 6, color = '#BFF4FF', opacity = 1, squash = 1 }) {
  if (opacity <= 0 || r <= 0) return '';
  return `<g opacity="${f(opacity)}" transform="translate(${f(cx)} ${f(cy)}) scale(1 ${f(squash)})">`
    + `<circle r="${f(r)}" fill="none" stroke="${INK}" stroke-width="${f(width + 4)}" opacity="0.55"/>`
    + `<circle r="${f(r)}" fill="none" stroke="${color}" stroke-width="${f(width)}"/>`
    + `<circle r="${f(r)}" fill="none" stroke="#FFFFFF" stroke-width="${f(width * 0.3)}" opacity="0.9"/></g>`;
}

/** A comic impact burst: a jagged star of `points` points, inked, filled and highlighted. */
export function burst({ cx, cy, r, points = 12, inner = 0.55, seed = 1, fill = AMBER, ink = INK, opacity = 1, rotate = 0 }) {
  if (opacity <= 0 || r <= 0) return '';
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const a = (Math.PI * i) / points + (rotate * Math.PI) / 180;
    const k = i % 2 === 0 ? 1 - rand(seed, i) * 0.22 : inner + rand(seed, i, 'in') * 0.12;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  const poly = pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return `<g opacity="${f(opacity)}"><polygon points="${poly}" fill="${ink}" transform="translate(3 4)"/><polygon points="${poly}" fill="${fill}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/></g>`;
}

/** Radial speed lines around (cx, cy) between `inner` and `outer`, `count` of them, deterministic. */
export function speedLines({ cx, cy, inner, outer, count = 28, seed = 3, color = INK, width = 3, opacity = 0.8 }) {
  if (opacity <= 0) return '';
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rand(seed, i) * 0.18;
    const r0 = inner * (1 + rand(seed, i, 'a') * 0.25), r1 = outer * (0.8 + rand(seed, i, 'b') * 0.2);
    d += `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" opacity="${f(opacity)}"/>`;
}

/** Parallel motion streaks along `angle` (degrees) over a box: a passage's rush. */
export function streaks({ x, y, w, h, angle = 0, count = 24, seed = 5, color = '#FFFFFF', width = 2, length = 0.4, opacity = 0.6, phase = 0 }) {
  if (opacity <= 0) return '';
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const yy = y + rand(seed, i) * h;
    const len = w * length * (0.4 + rand(seed, i, 'l') * 0.6);
    const xx = x + (((rand(seed, i, 'x') + phase) % 1) * (w + len)) - len;
    d += `M${f(xx)} ${f(yy)}h${f(len)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" opacity="${f(opacity)}" transform="rotate(${f(angle)} ${f(x + w / 2)} ${f(y + h / 2)})"/>`;
}

/**
 * Deterministic particles from `origin`: each leaves at its own angle and speed within `spread`
 * degrees of `direction`, falls with `gravity`, and lives `life` of the beat. `v` is the beat's
 * progress (0..1). Sparks, dust or motes; drawn as short streaks along their velocity.
 */
export function particles({ origin, v, count = 24, seed = 9, direction = -90, spread = 180, speed = 120, gravity = 60, life = 1, color = '#FFE7A3', ink = null, size = 3, streak = 0.06 }) {
  if (v <= 0 || v >= 1) return '';
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const own = life * (0.55 + rand(seed, i, 'life') * 0.45);
    const u = v / own;
    if (u >= 1) continue;
    const a = ((direction + (rand(seed, i, 'a') - 0.5) * spread) * Math.PI) / 180;
    const s = speed * (0.45 + rand(seed, i, 's') * 0.55);
    const px = origin[0] + Math.cos(a) * s * u, py = origin[1] + Math.sin(a) * s * u + gravity * u * u;
    const vx = Math.cos(a) * s, vy = Math.sin(a) * s + 2 * gravity * u;
    const tail = streak;
    const alpha = 1 - u;
    if (ink) out += `<line x1="${f(px)}" y1="${f(py)}" x2="${f(px - vx * tail)}" y2="${f(py - vy * tail)}" stroke="${ink}" stroke-width="${f(size + 2)}" stroke-linecap="round" opacity="${f(alpha * 0.6)}"/>`;
    out += `<line x1="${f(px)}" y1="${f(py)}" x2="${f(px - vx * tail)}" y2="${f(py - vy * tail)}" stroke="${color}" stroke-width="${f(size)}" stroke-linecap="round" opacity="${f(alpha)}"/>`;
  }
  return out;
}

/** A comic panel border: ink frame with a paper keyline, optionally with a drop shadow. */
export function panelFrame({ x, y, w, h, ink = INK, paper = PAPER, border = 8, shadow = true, radius = 0 }) {
  const rect = (dx, dy, fill, stroke, sw) => `<rect x="${f(x + dx)}" y="${f(y + dy)}" width="${f(w)}" height="${f(h)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${f(sw)}"/>`;
  return (shadow ? rect(8, 10, ink, 'none', 0) : '') + rect(0, 0, 'none', paper, border + 4) + rect(0, 0, 'none', ink, border);
}

/** Letterbox bars of `h` px at the top and bottom of a `width` x `height` frame. */
export const letterbox = ({ width, height, h, color = '#05070B' }) => (h > 0
  ? `<rect x="0" y="0" width="${width}" height="${f(h)}" fill="${color}"/><rect x="0" y="${f(height - h)}" width="${width}" height="${f(h)}" fill="${color}"/>` : '');

/** A darkening vignette over a frame. */
export function vignette(prefix, { width, height, strength = 0.6, color = '#05070B' }) {
  const g = `${prefix}-vignette`;
  return `<defs><radialGradient id="${g}" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="${f(strength)}"/></radialGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#${g})"/>`;
}

/** A colour grade over art below it: a tint multiplied in (amber alert, teal calm), `amount` 0..1. */
export const grade = ({ width, height, color, amount, mode = 'multiply' }) => (amount > 0
  ? `<rect width="${width}" height="${height}" fill="${color}" opacity="${f(amount)}" style="mix-blend-mode:${mode}"/>` : '');

/** A deterministic starfield in a box: `count` stars of a few sizes, twinkling with t. */
export function stars({ x = 0, y = 0, w, h, count = 140, seed = 11, t = 0, drift = [0, 0] }) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const sx = x + (((rand(seed, i, 'x') * w + drift[0] * (0.3 + rand(seed, i, 'z'))) % w) + w) % w;
    const sy = y + (((rand(seed, i, 'y') * h + drift[1] * (0.3 + rand(seed, i, 'z'))) % h) + h) % h;
    const r = rand(seed, i, 'r') < 0.85 ? 1 : rand(seed, i, 'r') < 0.97 ? 1.8 : 2.8;
    const tw = 0.55 + 0.45 * Math.sin(t / (300 + rand(seed, i, 'p') * 900) + rand(seed, i) * 6.28);
    out += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${r}" fill="${r > 2 ? '#FFF3C4' : '#E9F4FF'}" opacity="${f(tw)}"/>`;
  }
  return out;
}

/** Linear interpolation of colours given as #RRGGBB. */
export function mix(a, b, v) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((c, i) => Math.round(lerp(c, y[i], v)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

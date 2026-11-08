//
// The films' lettering: the Game N wordmark and the role titles, drawn as inked block letters with
// depth, the way a comic's cover logo is drawn. The letterforms are Ink Block's (the stroke alphabet
// on a 4 x 6 grid the earlier openings and role films used, ported here from
// `claude/designer-openings` 27083865 `design/cinematic/lib/lettering.mjs` and
// `pilots/openings/wordmark.mjs`, so the brand keeps the shapes the owner has seen). What is new is
// how they are finished: an extruded side in shadow, an ink outline roughened like a brush's, a
// face lit from above, a highlight, a cast shadow, and a sheen that can be swept across the face.
// Words are drawn strokes, never text: no font file, licence or fallback. A page that shows them
// also carries them as text for screen readers.

import { clamp01, f, f3, lerp } from './math.mjs';
import { blurFilter, linear, roughFilter } from './fx.mjs';

/** Ink Block: each glyph's advance in grid units and its strokes, polylines on the 4 x 6 grid (y down). */
export const GLYPHS = Object.freeze({
  A: [4, [[[0, 6], [0, 1.5], [1, 0], [3, 0], [4, 1.5], [4, 6]], [[0, 3.4], [4, 3.4]]]],
  B: [4, [[[0, 3], [3, 3], [4, 2], [4, 1], [3, 0], [0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3]]]],
  C: [4, [[[4, 0.7], [3.3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3.3, 6], [4, 5.3]]]],
  D: [4, [[[0, 0], [3, 0], [4, 1], [4, 5], [3, 6], [0, 6], [0, 0]]]],
  E: [4, [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]]],
  F: [4, [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]]],
  G: [4, [[[4, 0.7], [3.3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.3], [2.3, 3.3]]]],
  H: [4, [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]]],
  I: [1.2, [[[0.6, 0], [0.6, 6]]]],
  K: [4, [[[0, 0], [0, 6]], [[4, 0], [1.2, 3], [4, 6]], [[0, 3], [1.2, 3]]]],
  L: [4, [[[0, 0], [0, 6], [4, 6]]]],
  M: [4.6, [[[0, 6], [0, 0], [2.3, 2.8], [4.6, 0], [4.6, 6]]]],
  N: [4, [[[0, 6], [0, 0], [4, 6], [4, 0]]]],
  O: [4, [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]]],
  P: [4, [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]]]],
  R: [4, [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]], [[2.2, 3.4], [4, 6]]]],
  S: [4, [[[4, 0.8], [3.2, 0], [0.8, 0], [0, 0.8], [0, 2.2], [0.8, 3], [3.2, 3], [4, 3.8], [4, 5.2], [3.2, 6], [0.8, 6], [0, 5.2]]]],
  T: [4, [[[0, 0], [4, 0]], [[2, 0], [2, 6]]]],
  U: [4, [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]]],
  V: [4, [[[0, 0], [2, 6], [4, 0]]]],
  W: [5, [[[0, 0], [1, 6], [2.5, 2.6], [4, 6], [5, 0]]]],
  X: [4, [[[0, 0], [4, 6]], [[4, 0], [0, 6]]]],
  Y: [4, [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]]],
  Z: [4, [[[0, 0], [4, 0], [0, 6], [4, 6]]]],
  // The wordmark's lower case, drawn for it on the same grid (x-height 4 of the cap height's 6).
  a: [3.4, [[[3.4, 2], [3.4, 6]], [[3.4, 3], [2.5, 2], [1, 2], [0, 3], [0, 5], [1, 6], [2.5, 6], [3.4, 5]]]],
  m: [5.2, [[[0, 6], [0, 2]], [[0, 2.9], [0.9, 2], [1.8, 2], [2.6, 2.8], [2.6, 6]], [[2.6, 2.8], [3.4, 2], [4.3, 2], [5.2, 2.9], [5.2, 6]]]],
  e: [3.4, [[[0.1, 4.1], [3.4, 4.1], [3.4, 3], [2.4, 2], [1, 2], [0, 3], [0, 5], [1, 6], [2.6, 6], [3.4, 5.4]]]],
  b: [3.4, [[[0, 0], [0, 6]], [[0, 3], [1, 2], [2.4, 2], [3.4, 3], [3.4, 5], [2.4, 6], [1, 6], [0, 5]]]],
  y: [3.4, [[[0, 2], [0, 4.6], [1, 5.6], [2.4, 5.6], [3.4, 4.6]], [[3.4, 2], [3.4, 7], [2.6, 7.8], [0.8, 7.8], [0.2, 7.2]]]],
  l: [1.8, [[[0.6, 0], [0.6, 5.2], [1.4, 6]]]],
  n: [3.4, [[[0, 6], [0, 2]], [[0, 3], [1, 2], [2.4, 2], [3.4, 3], [3.4, 6]]]],
  '!': [1.2, [[[0.6, 0], [0.6, 4.1]], [[0.6, 5.6], [0.6, 6]]]],
  '.': [1.2, [[[0.6, 5.6], [0.6, 6]]]],
  '-': [3, [[[0, 3], [3, 3]]]],
  ' ': [2.2, []],
});

const glyph = ch => GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];

/** The width of `text` in grid units. */
export function measure(text, tracking = 1.3) {
  const chars = [...text];
  return chars.reduce((sum, ch, i) => sum + glyph(ch)[0] + (i < chars.length - 1 ? tracking : 0), 0);
}

/** Every stroke of `text` in writing order, as point lists in grid units from the word's top-left. */
export function strokeLists(text, tracking = 1.3) {
  let x = 0;
  const out = [];
  for (const ch of text) {
    const [advance, lines] = glyph(ch);
    for (const line of lines) out.push(line.map(([u, v]) => [x + u, v]));
    x += advance + tracking;
  }
  return out;
}

const lengthOf = line => line.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);
/** The part of a polyline drawn by `k` 0..1 of its length, and the point it has reached. */
function partOf(line, k) {
  const total = lengthOf(line);
  let left = total * clamp01(k);
  const out = [line[0]];
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1], b = line[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left >= seg) { out.push(b); left -= seg; continue; }
    const u = seg ? left / seg : 0;
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    return { points: out, head: out[out.length - 1], done: false };
  }
  return { points: out, head: out[out.length - 1], done: true };
}
const dLine = pts => `M${pts.map(([x, y]) => `${f3(x)} ${f3(y)}`).join('L')}`;

/** How far each stroke of a word is drawn when the word as a whole is drawn `draw` 0..1 (strokes overlap). */
const SPAN = 0.42;
const strokeProgress = (draw, j, n) => (draw >= 1 ? 1 : clamp01((draw - (j / Math.max(1, n)) * (1 - SPAN)) / SPAN));

/** The point (px) a word's pen has reached at `draw`, under the same placement inkWord uses, or null when no stroke is being drawn. */
export function nibOf(text, { x = 0, y = 0, size = 100, tracking = 1.3, skew = -8, rotate = 0, draw = 1 } = {}) {
  if (draw <= 0 || draw >= 1) return null;
  const lists = strokeLists(text, tracking);
  const n = lists.length;
  const j = lists.findIndex((line, i) => { const p = strokeProgress(draw, i, n); return p > 0 && p < 1; });
  if (j < 0) return null;
  const head = partOf(lists[j], strokeProgress(draw, j, n)).head;
  return placeOf(head, { x, y, size, width: measure(text, tracking), skew, rotate });
}

/** A grid point of a word placed at (x, y), in px. */
function placeOf([u, v], { x, y, size, width, skew, rotate }) {
  const k = size / 6;
  const gx = (u - width / 2) * k, gy = (v - 3) * k;
  const sx = gx + Math.tan((skew * Math.PI) / 180) * gy, sy = gy;
  const c = Math.cos((rotate * Math.PI) / 180), s = Math.sin((rotate * Math.PI) / 180);
  return [x + sx * c - sy * s, y + sx * s + sy * c];
}

/** The default finish: an amber face lit from above, a burnt side, ink. */
export const AMBER_FACE = Object.freeze({ top: '#FFE7A1', mid: '#F5C04A', bottom: '#D98A1C', side: '#7A4A12', sideDeep: '#3E2508', ink: '#0B0E15', highlight: '#FFF8DE' });
export const PAPER_FACE = Object.freeze({ top: '#FFFBF0', mid: '#F1E6D2', bottom: '#D9C9AC', side: '#6B5A43', sideDeep: '#2B2219', ink: '#0B0E15', highlight: '#FFFFFF' });

/**
 * `text` lettered as a comic logo, centred on (x, y), `size` its cap height in px.
 *   draw   0..1  the ink written on stroke by stroke in writing order (1: all of it)
 *   fill   0..1  the face's colour coming in over the ink
 *   depth  0..1  the extruded side growing out behind the face
 *   sheen  0..1  a bright band crossing the face once (0 or 1: none)
 * Returns { svg, nib } where nib is the point (in px) the pen has reached while drawing, or null.
 */
export function inkWord(D, id, text, {
  x = 0, y = 0, size = 100, tracking = 1.3, skew = -8, rotate = 0, weight = 1.25, inkWeight = 0.62,
  draw = 1, fill = 1, depth = 1, sheen = 0, face = AMBER_FACE, extrude = [0.55, 0.7], steps = 7,
  shadow = 0.55, rough = true, opacity = 1, hot = true,
} = {}) {
  if (opacity <= 0.001) return { svg: '', nib: null };
  const k = size / 6;
  const width = measure(text, tracking);
  const lists = strokeLists(text, tracking);
  const n = lists.length;
  const progressOf = j => strokeProgress(draw, j, n);
  const parts = lists.map((line, j) => partOf(line, progressOf(j)));
  const drawn = parts.filter((p, j) => progressOf(j) > 0).map(p => dLine(p.points));
  const all = lists.map(dLine);
  const at = `translate(${f(x)} ${f(y)}) rotate(${f(rotate)}) skewX(${f(skew)}) scale(${f3(k)}) translate(${f3(-width / 2)} -3)`;
  const stroke = (paths, color, w, extra = '') => paths.map(d => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f3(w)}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`).join('');
  const inkW = weight + inkWeight * 2;
  const faceGrad = linear(D, `${id}-face`, [[0, face.top], [0.45, face.mid], [1, face.bottom]], { x1: 0, y1: -0.6, x2: 0, y2: 6.4, units: 'userSpaceOnUse' });
  const edge = rough ? ` filter="${roughFilter(D, `${id}-rough`, { scale: 0.16, freq: 2.2, seed: 5 })}"` : '';
  let body = '';
  // The cast shadow on what the word stands on.
  if (shadow > 0 && fill > 0) {
    body += `<g transform="translate(${f3(extrude[0] * 2.2)} ${f3(extrude[1] * 2.4)})" opacity="${f3(shadow * clamp01(fill))}" filter="${blurFilter(D, `${id}-cast`, 0.35)}">${stroke(all, '#000000', inkW)}</g>`;
  }
  // The extruded side: the word stepped back, ink first, then the side's colour, nearest last.
  const d = clamp01(depth);
  if (d > 0) {
    const m = Math.max(1, Math.round(steps * d));
    let side = '';
    for (let i = m; i >= 1; i -= 1) {
      const u = (i / steps) * d;
      side += `<g transform="translate(${f3(extrude[0] * u)} ${f3(extrude[1] * u)})">${stroke(all, face.ink, inkW)}</g>`;
    }
    for (let i = m; i >= 1; i -= 1) {
      const u = (i / steps) * d;
      const c = i === m ? face.sideDeep : face.side;
      side += `<g transform="translate(${f3(extrude[0] * u)} ${f3(extrude[1] * u)})">${stroke(all, c, weight * 0.92)}</g>`;
    }
    body += `<g${edge}>${side}</g>`;
  }
  // The face as it is written: the ink's outline and the colour together, hot while it is fresh (a
  // bright core and a bloom round it) and cooling, as `fill` comes in, to the lit face and its highlight.
  const heat = hot ? 1 - clamp01(fill) : 0;
  const lines = draw >= 1 ? all : drawn;
  body += `<g${edge}>${stroke(lines, face.ink, inkW)}</g>`;
  body += stroke(lines, faceGrad, weight);
  if (heat > 0.001) {
    body += `<g style="mix-blend-mode:screen" opacity="${f3(heat)}" filter="${blurFilter(D, `${id}-bloom`, 0.42)}">${stroke(lines, '#FFB938', weight * 2.3)}</g>`;
    body += `<g opacity="${f3(heat * 0.9)}">${stroke(lines, '#FFF4C8', weight * 0.55)}</g>`;
  }
  if (fill > 0) {
    const fa = clamp01(fill);
    body += `<g transform="translate(-0.13 -0.15)" opacity="${f3(0.9 * fa)}">${stroke(lines, face.highlight, weight * 0.22)}</g>`;
    if (sheen > 0 && sheen < 1) {
      const mid = lerp(-6, width + 6, sheen);
      const band = linear(D, `${id}-sheen`, [[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]], { x1: mid - 2.4, y1: 0, x2: mid + 2.4, y2: 0, units: 'userSpaceOnUse' });
      body += `<g style="mix-blend-mode:screen" opacity="${f3(fa)}">${stroke(all, band, weight)}</g>`;
    }
  }
  const nib = nibOf(text, { x, y, size, tracking, skew, rotate, draw });
  return { svg: `<g transform="${at}" opacity="${f3(opacity)}">${body}</g>`, nib, width: width * k };
}

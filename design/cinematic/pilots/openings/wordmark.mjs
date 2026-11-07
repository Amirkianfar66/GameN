// mothership:dev-only
//
// The Game N wordmark (issue #188: no approved wordmark or logo existed, so the brand intro draws its
// own): "Game N" in the cinematic library's Ink Block lettering (../../lib/lettering.mjs), its capitals
// Ink Block's own and its lower case drawn for it on the same grid (x-height 4 of the cap height's 6,
// a descender to 7.8), inked as the library inks a word: an offset ink shadow, a wide ink stroke, the
// amber stroke and a thin highlight. The words are drawn strokes, never text: no font file, licence or
// fallback, the same on every machine. The page sets the same words as text for screen readers.
// The mark: a paper plate with an ink border, "Game N" across it and "by Plan B" stamped in paper on
// an ink tab under its right half.
// The cut both openings end on: Pilot 2's ink band, carried until it has left the frame.

import { INK, PAPER } from '../../lib/comic.mjs';
import { clamp01, lerp } from '../../lib/ease.mjs';
import { GLYPHS as INK_BLOCK } from '../../lib/lettering.mjs';
import { inkWipe } from '../blackhole/art.mjs';
import { NIGHT } from '../role-reveal/art.mjs';

const f = v => Number((+v).toFixed(3));

/** The brand's words, exactly (issue #188). */
export const BRAND = Object.freeze({ name: 'Game N', credit: 'by Plan B' });
export const AMBER = '#F2C14E';

/**
 * The wordmark's glyphs: [advance, strokes], polylines on Ink Block's grid (cap height 6, y down). The
 * capitals are Ink Block's; the lower case is drawn for the wordmark on the same grid.
 */
export const GLYPHS = Object.freeze({
  G: INK_BLOCK.G, N: INK_BLOCK.N, P: INK_BLOCK.P, B: INK_BLOCK.B,
  a: [3.4, [[[3.4, 2], [3.4, 6]], [[3.4, 3], [2.5, 2], [1, 2], [0, 3], [0, 5], [1, 6], [2.5, 6], [3.4, 5]]]],
  m: [5.2, [[[0, 6], [0, 2]], [[0, 2.9], [0.9, 2], [1.8, 2], [2.6, 2.8], [2.6, 6]], [[2.6, 2.8], [3.4, 2], [4.3, 2], [5.2, 2.9], [5.2, 6]]]],
  e: [3.4, [[[0.1, 4.1], [3.4, 4.1], [3.4, 3], [2.4, 2], [1, 2], [0, 3], [0, 5], [1, 6], [2.6, 6], [3.4, 5.4]]]],
  b: [3.4, [[[0, 0], [0, 6]], [[0, 3], [1, 2], [2.4, 2], [3.4, 3], [3.4, 5], [2.4, 6], [1, 6], [0, 5]]]],
  y: [3.4, [[[0, 2], [0, 4.6], [1, 5.6], [2.4, 5.6], [3.4, 4.6]], [[3.4, 2], [3.4, 7], [2.6, 7.8], [0.8, 7.8], [0.2, 7.2]]]],
  l: [1.8, [[[0.6, 0], [0.6, 5.2], [1.4, 6]]]],
  n: [3.4, [[[0, 6], [0, 2]], [[0, 3], [1, 2], [2.4, 2], [3.4, 3], [3.4, 6]]]],
  ' ': [2.2, []],
});

const glyph = ch => {
  const g = GLYPHS[ch];
  if (!g) throw new Error(`wordmark: no glyph for "${ch}"`);
  return g;
};

/** The width of `text` in grid units, `tracking` units between glyphs (case kept: the wordmark is mixed case). */
export function measure(text, tracking = 1.3) {
  const chars = [...text];
  return chars.reduce((sum, ch, i) => sum + glyph(ch)[0] + (i < chars.length - 1 ? tracking : 0), 0);
}

/** Every stroke of `text` in writing order, each as SVG path data in grid units from the word's top-left. */
export function strokesOf(text, tracking = 1.3) {
  let x = 0;
  const out = [];
  for (const ch of text) {
    const [advance, lines] = glyph(ch);
    for (const line of lines) out.push(`M${line.map(([u, v]) => `${f(x + u)} ${f(v)}`).join('L')}`);
    x += advance + tracking;
  }
  return out;
}

/** How long each stroke takes to draw, as a share of the whole line's `draw` (the strokes overlap). */
const SPAN = 0.42;

/**
 * `text` as an inked line centred on (x, y), `size` its cap height in px, written on stroke by stroke
 * as `draw` goes 0..1 (each stroke its own path, drawn along its length in writing order), its colour
 * coming in with `fill` 0..1 over the ink already laid. At 1 and 1 it is the finished word.
 */
export function lineSvg(text, { x, y, size, draw = 1, fill = 1, colour = AMBER, ink = INK, highlight = '#FFF3C4', weight = 1.2, inkWeight = 0.8, skew = -8, rotate = 0, tracking = 1.3, shadow = true }) {
  const k = size / 6;
  const width = measure(text, tracking);
  const list = strokesOf(text, tracking);
  const n = list.length;
  const at = `translate(${f(x)} ${f(y)}) rotate(${f(rotate)}) skewX(${f(skew)}) scale(${f(k)}) translate(${f(-width / 2)} -3)`;
  const progress = j => (draw >= 1 ? 1 : clamp01((draw - (j / Math.max(1, n)) * (1 - SPAN)) / SPAN));
  const layer = (stroke, w, extra = '') => list.map((d, j) => {
    const p = progress(j);
    if (p <= 0) return '';
    const dash = p < 1 ? ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - p)}"` : '';
    return `<path d="${d}"${dash} fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linejoin="miter" stroke-miterlimit="3" stroke-linecap="square"${extra}/>`;
  }).join('');
  const inkWidth = weight + inkWeight * 2;
  let body = '';
  if (shadow) body += `<g transform="translate(0.55 0.65)">${layer(ink, inkWidth)}</g>`;
  body += layer(ink, inkWidth);
  if (fill > 0) {
    body += `<g opacity="${f(clamp01(fill))}">${layer(colour, weight)}<g transform="translate(-0.12 -0.14)">${layer(highlight, weight * 0.28, ' opacity="0.85"')}</g></g>`;
  }
  return `<g transform="${at}">${body}</g>`;
}

/** The mark's parts in its own px: the paper plate, the name's cap height, the credit's and its ink tab. */
export const MARK = Object.freeze({ plate: Object.freeze([860, 330]), name: 150, credit: 46, tab: Object.freeze([372, 82]) });

/**
 * The mark at (cx, cy), `scale` x its own size: the plate slams in from a little larger (`slam` 0..1),
 * "Game N" is written on it (`draw`, `fill`), "by Plan B" is stamped on its tab (`credit` 0..1; 0
 * leaves the tab off), and a sheen crosses it once (`sweep` 0..1).
 */
export function markSvg(prefix, { cx, cy, scale = 1, slam = 1, draw = 1, fill = 1, credit = 1, sweep = 0, rotate = -2 }) {
  if (slam <= 1e-6) return '';
  const [pw, ph] = MARK.plate;
  const x = -pw / 2, y = -ph / 2;
  const s = lerp(1.14, 1, Math.min(1, slam));
  const plate = `<rect x="${f(x + 14)}" y="${f(y + 16)}" width="${pw}" height="${ph}" fill="${NIGHT.deep}" opacity="0.85"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${pw}" height="${ph}" fill="${PAPER}" stroke="${INK}" stroke-width="8"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${pw}" height="${ph}" fill="url(#${prefix}-dots)" opacity="0.12"/>`
    + `<path d="M${f(x + 30)} ${f(y + 34)}H${f(x + pw - 30)}M${f(x + 30)} ${f(y + ph - 34)}H${f(x + pw - 30)}" stroke="${INK}" stroke-width="3" opacity="0.5"/>`;
  const name = lineSvg(BRAND.name, { x: 0, y: -8, size: MARK.name, draw, fill });
  const sheen = sweep > 0 && sweep < 1
    ? `<defs><clipPath id="${prefix}-mark-clip"><rect x="${f(x)}" y="${f(y)}" width="${pw}" height="${ph}"/></clipPath>`
      + `<linearGradient id="${prefix}-mark-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>`
      + `<g clip-path="url(#${prefix}-mark-clip)"><rect x="${f(lerp(x - 300, x + pw + 80, sweep))}" y="${f(y - 40)}" width="220" height="${f(ph + 80)}" fill="url(#${prefix}-mark-sheen)" transform="skewX(-24)" style="mix-blend-mode:screen"/></g>`
    : '';
  const [tw, th] = MARK.tab;
  const tabS = lerp(1.3, 1, Math.min(1, credit));
  const tab = credit > 0
    ? `<g transform="translate(${f(pw * 0.16)} ${f(ph / 2 + th * 0.36)}) rotate(3) scale(${f(tabS)})" opacity="${f(clamp01(credit * 3))}">`
      + `<rect x="${f(-tw / 2 + 8)}" y="${f(-th / 2 + 10)}" width="${tw}" height="${th}" fill="${NIGHT.deep}" opacity="0.8"/>`
      + `<rect x="${f(-tw / 2)}" y="${f(-th / 2)}" width="${tw}" height="${th}" fill="${INK}" stroke="${PAPER}" stroke-width="4"/>`
      + lineSvg(BRAND.credit, { x: 0, y: -6, size: MARK.credit, colour: PAPER, ink: NIGHT.deep, highlight: '#FFFFFF', weight: 1.05, inkWeight: 0.55, skew: -6, shadow: false })
      + `</g>`
    : '';
  return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(scale)}) rotate(${f(rotate)}) scale(${f(s)})" opacity="${f(clamp01(slam * 3))}">${plate}${name}${sheen}${tab}</g>`;
}

/**
 * The cut both openings end on, `v` 0..1: Pilot 2's ink band (blackhole/art.mjs inkWipe), a third
 * of the frame wide (160 px at least), sweeping left to right with the game's night behind it. inkWipe's own travel
 * ends as its leading edge leaves the frame, which on a wide frame leaves the band's tail across
 * the right of the last picture; this carries it on until the tail's lowest, most ragged point
 * (30 px of tear) has left too, so the last picture is the night alone on any surface.
 */
export function handoverWipe(prefix, { width, height, v }) {
  const band = Math.max(160, width * 0.32), slant = 0.32;
  const travel = width + band + slant * height + 60;
  const reach = Math.max(travel, width + 2 * band + (slant * height) / 2 + 40);
  return inkWipe(prefix, { width, height, v: (v * reach) / travel, band, slant });
}

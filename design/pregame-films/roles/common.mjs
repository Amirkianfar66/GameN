// mothership:dev-only
//
// What the role films' modules share (./doctor.mjs and the eight films after it): the mark on the
// role card on the desk, the gadget inked once, the comic sound word, an ink canvas placed in a
// panel, and "nobody", the one body every figure but the player's own is drawn as.

import { inkCanvas } from '../../crew-drawing/source/ink.mjs';
import { litFigure, onPage } from '../kit/cast.mjs';
import { halftone, linear } from '../kit/fx.mjs';
import { inkWord } from '../kit/letters.mjs';
import { clamp01, ease, f, lerp } from '../kit/math.mjs';

export const INK = '#0B0E15';

/** The gadgets' steel, the same for every role: no team's accent (the art direction's palette rule). */
export const STEEL = Object.freeze({ body: '#AEB9CB', dark: '#5A667E', grip: '#3A465E', deep: '#2E374A', glass: '#CFDAE6', glassLit: '#F4F8FF', shine: '#E8EEF6', lamp: '#F4EBDD' });

/** A comic sound word in the brand's alphabet, popping in as `k` goes from 0 to 1. */
export const soundWord = (D, id, text, { x, y, size, k = 1, rotate = -8, face }) => (k <= 0 ? '' : inkWord(D, id, text, {
  x, y, size: size * lerp(1.5, 1, ease.outBack(clamp01(k), 2)), rotate, skew: -10, weight: 1.35, inkWeight: 0.55, extrude: [0.35, 0.42], steps: 4, shadow: 0.35, hot: false, opacity: clamp01(k * 3),
  face: face ?? { top: '#FFF2C9', mid: '#F7D37A', bottom: '#E3A33C', side: '#6B4314', sideDeep: '#2E1C07', ink: INK, highlight: '#FFFFFF' },
}).svg);

/** An ink canvas's drawing, laid over a panel of w x h px. */
export const inked = (cv, w, h) => cv.svg({ viewBox: `0 0 ${f(w)} ${f(h)}` }).replace('<svg ', `<svg x="0" y="0" width="${f(w)}" height="${f(h)}" `);

/**
 * Nobody: a figure in any pose, one flat colour with a rim of light. Every figure but the player's
 * own is drawn so, all on one body and with a plain oval head: no hair, beard or outline says who, and
 * no face, number or name. (A crew member's own head in silhouette could be read as that player.)
 */
export function nobody(D, id, { sk, at, scale, t = 0, reduced = false, color = '#0B1119', rim = null, flip = false, opacity = 1 }) {
  const body = litFigure(D, id, { c: 'c5', sk, at, scale, t, reduced, silhouette: color, rim, flip });
  const [hx, hy] = onPage(at, scale, sk.head, flip);
  const s = scale;
  const mask = D.use(`${id}-nohead`, `<mask id="${id}-nohead" maskUnits="userSpaceOnUse" x="${f(hx - 400 * s)}" y="${f(hy - 400 * s)}" width="${f(800 * s)}" height="${f(800 * s)}"><rect x="${f(hx - 400 * s)}" y="${f(hy - 400 * s)}" width="${f(800 * s)}" height="${f(800 * s)}" fill="#fff"/><ellipse cx="${f(hx)}" cy="${f(hy - 4 * s)}" rx="${f(54 * s)}" ry="${f(33 * s)}" fill="#000"/></mask>`);
  const tilt = (sk.tilt ?? 0) * (flip ? -1 : 1);
  const lit = rim ? `<ellipse cx="${f(hx + rim.dx * rim.width * 0.9)}" cy="${f(hy + rim.dy * rim.width * 0.9)}" rx="${f(18 * s)}" ry="${f(22 * s)}" fill="${rim.color}" opacity="${f(Math.min(1, rim.gain ?? 1))}"/>` : '';
  const head = `<g transform="rotate(${f(tilt)} ${f(hx)} ${f(hy + 20 * s)})">${lit}<rect x="${f(hx - 7 * s)}" y="${f(hy + 8 * s)}" width="${f(14 * s)}" height="${f(30 * s)}" fill="${color}"/><ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(18 * s)}" ry="${f(22 * s)}" fill="${color}"/></g>`;
  return `<g opacity="${f(opacity)}"><g mask="${mask}">${body}</g>${head}</g>`;
}

const gadgets = new Map();
/**
 * A role's gadget, inked once by `draw(cv)`: `box` is its viewBox in device units (about 90 x 116,
 * held at the bottom), `grip` where the hand closes on it and `glint` where the light catches it.
 */
export function gadgetOf(prefix, { box, grip, glint }, draw) {
  if (gadgets.has(prefix)) return gadgets.get(prefix);
  const cv = inkCanvas(prefix);
  draw(cv);
  const out = Object.freeze({ svg: cv.svg({ viewBox: box.join(' ') }), box, grip, glint });
  gadgets.set(prefix, out);
  return out;
}

/**
 * The mark on the role card on the desk (the owner, 8 November 2026, for the Doctor: "make it the
 * medical cross"): the role's symbol, paper on a dark plate, as the board's Hospital draws its cross.
 * No word, portrait or team colour. In the face's own px: `solid` paper shapes, `holes` cut back to
 * the plate, `strokes` paper lines ({ d, width }) and `over` paper glints drawn last.
 */
export function markOf(D, id, { x, y, w, h }, u, { solid = [], holes = [], strokes = [], over = [] }) {
  const ow = 1.6 * u;
  const plate = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(3.5 * u)}" fill="${linear(D, `${id}-plate`, [[0, '#26334D'], [1, '#121A2B']])}" stroke="${INK}" stroke-width="${f(ow)}"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(3.5 * u)}" fill="${halftone(D, `${id}-dots`, { size: 3 * u, r: 0.6 * u, color: INK })}" opacity="0.35"/>`;
  const paper = linear(D, `${id}-paper`, [[0, '#FFF7E6'], [1, '#E3D3B5']]);
  const line = (d, width, color) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shadow = `<g transform="translate(${f(1.4 * u)} ${f(1.8 * u)})" opacity="0.6">${solid.map(d => `<path d="${d}" fill="${INK}"/>`).join('')}${strokes.map(s => line(s.d, s.width + ow * 2, INK)).join('')}</g>`;
  const body = solid.map(d => `<path d="${d}" fill="${paper}" stroke="${INK}" stroke-width="${f(ow)}" stroke-linejoin="round"/>`).join('')
    + strokes.map(s => line(s.d, s.width + ow * 2, INK) + line(s.d, s.width, '#F3E9D6')).join('')
    + holes.map(d => `<path d="${d}" fill="#1A2438" stroke="${INK}" stroke-width="${f(ow * 0.8)}" stroke-linejoin="round"/>`).join('')
    + over.map(d => `<path d="${d}" fill="#FFF7E6"/>`).join('');
  return plate + shadow + body;
}

/** A circle's path. */
export const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** A closed polygon's path from points. */
export const poly = pts => `M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z`;

// Pure drawing helpers from the pinned #231 room/ink sources. Existing admitted
// crew ink equals that source byte-for-byte after its dev-only marker is removed.
import {INK, pathOfPoly, spline, waver} from '../crew-drawing/ink.mjs';
export {INK, inkCanvas, shade, tint} from '../crew-drawing/ink.mjs';
export const PAPER = Object.freeze({ plain: '#F4EBDD', shade: '#E3D6C2', deep: '#CBBBA2' });
export const FAMILY = Object.freeze({ deep: '#2B1A10', shadow: '#4C2D17', mid: '#82512A', light: '#BC8448', pale: '#E6C590' });
const r2 = v => Math.round(v * 100) / 100;

export function glow(cv, cx, cy, rx, ry, color, opacity) {
 const id = cv.uid('glow');
 cv.def(`<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${r2(opacity * 0.55)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
 cv.raw(`<g data-light="glow"><ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="url(#${id})"/></g>`);
}
export function handLine(cv, points, { closed = false, color = INK, width = 2, opacity = null, seed = 3, wobble = 0.5, cap = 'round', tension = 0 } = {}) {
 const line = waver(spline(points, { closed, step: 4, tension }), seed, wobble, 14, closed);
 cv.raw(`<path d="${pathOfPoly(line, closed)}" fill="none" stroke="${color}" stroke-width="${r2(width)}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${r2(opacity)}"`}/>`);
}
export function clipToBox(poly, [x, y, w, h]) {
 const edges = [[p => p[0] >= x, (a, b) => { const t = (x - a[0]) / (b[0] - a[0]); return [x, a[1] + t * (b[1] - a[1])]; }],
  [p => p[0] <= x + w, (a, b) => { const t = (x + w - a[0]) / (b[0] - a[0]); return [x + w, a[1] + t * (b[1] - a[1])]; }],
  [p => p[1] >= y, (a, b) => { const t = (y - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y]; }],
  [p => p[1] <= y + h, (a, b) => { const t = (y + h - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y + h]; }]];
 let out = poly;
 for (const [inside, cut] of edges) {
  const input = out; out = [];
  input.forEach((cur, i) => {
   const prev = input[(i + input.length - 1) % input.length];
   if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
   else if (inside(prev)) out.push(cut(prev, cur));
  });
  if (!out.length) return [];
 }
 return out;
}

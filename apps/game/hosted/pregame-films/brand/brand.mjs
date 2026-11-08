//
// The Game N brand intro: exactly 2,000 ms on the app's first entry. The owner, 8 November 2026:
// "For the app start 2 sec can we just have black background and then the texts with Game N by Plan B
// something simple with typing motion graphic effect".
//   - black;
//   - a cursor blinks, then "Game N" is typed a letter at a time, each letter landing with a small
//     lift, at an uneven, hand-typed pace;
//   - the cursor drops to the line below and "by Plan B" is typed there, quicker and smaller;
//   - the cursor blinks while the name is read, then everything fades to black by 1,960 ms.
// The letters are the brand's own (Ink Block, kit/letters.mjs), drawn as strokes: no font file. The
// page carries the words as text for screen readers. Silent. Reduced motion: both lines fade in
// whole over 200 ms, hold, and fade out by 1,960 ms, with no typing and no cursor.
// A pure function of t: brandSvg(t, { width, height, variant }).

import { GLYPHS } from '../kit/letters.mjs';
import { defs } from '../kit/fx.mjs';
import { clamp01, ease, envelope, f, f3, progress } from '../kit/math.mjs';

export const BRAND = Object.freeze({ name: 'Game N', credit: 'by Plan B', text: 'Game N, by Plan B' });
export const BRAND_MS = 2000;
/** The black the intro is played on, and ends on. */
export const NIGHT = '#000000';

const TRACKING = 1.25;
const COLORS = Object.freeze({ name: '#F4F1EA', credit: '#B9B2A5', cursor: '#F2C14E' });

/** When each character is typed (ms): uneven, as a hand types; the credit quicker than the name. */
export const TYPING = Object.freeze({
  name: Object.freeze([220, 300, 372, 452, 545, 610]),
  credit: Object.freeze([900, 946, 990, 1046, 1090, 1132, 1178, 1232, 1275]),
});
export const BEATS = Object.freeze({ cursorOn: 60, lineBreak: 860, fade: Object.freeze([1700, 1960]), night: 1960 });
const BLINK_MS = 530;

const glyphOf = ch => GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];

/** A line's characters: each one's grid x (from the line's left), its advance and its strokes. */
function lineOf(text) {
  let x = 0;
  return [...text].map(ch => {
    const [advance, lines] = glyphOf(ch);
    const out = { ch, x, advance, lines };
    x += advance + TRACKING;
    return out;
  });
}
const widthOf = chars => chars.length ? chars.at(-1).x + chars.at(-1).advance : 0;

/** The two lines' sizes and places on a W x H surface: one block, left-aligned, centred. */
export function layout(W, H) {
  const name = lineOf(BRAND.name), credit = lineOf(BRAND.credit);
  const cap = Math.min((W * 0.62) / (widthOf(name) / 6), H * 0.12);
  const k1 = cap / 6, k2 = (cap * 0.4) / 6;
  const w = Math.max(widthOf(name) * k1, widthOf(credit) * k2);
  const x0 = W / 2 - w / 2;
  const blockH = cap + cap * 0.55 + cap * 0.4;
  const y1 = H / 2 - blockH / 2;
  return { name, credit, k1, k2, x0, y1, y2: y1 + cap + cap * 0.55, cap };
}

function strokesSvg(chars, { x0, y0, k, color, weight, upTo, t, times, reduced }) {
  let out = '';
  chars.forEach((c, i) => {
    if (i >= upTo || !c.lines.length) return;
    const age = reduced ? 1000 : t - times[i];
    const lift = reduced ? 0 : (1 - ease.outCubic(clamp01(age / 90))) * k * 0.9;
    const on = reduced ? 1 : clamp01(age / 35);
    const d = c.lines.map(line => `M${line.map(([u, v]) => `${f(x0 + (c.x + u) * k)} ${f(y0 + v * k + lift)}`).join('L')}`).join('');
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(weight * k)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f3(on)}"/>`;
  });
  return out;
}

/** One frame of the brand intro, as an SVG document of `width` x `height` px. */
export function brandSvg(t, { width: W = 390, height: H = 844, variant = 'full' } = {}) {
  const D = defs();
  const reduced = variant === 'reduced';
  const L = layout(W, H);
  const typedName = reduced ? L.name.length : TYPING.name.filter(at => t >= at).length;
  const typedCredit = reduced ? L.credit.length : TYPING.credit.filter(at => t >= at).length;
  const fade = reduced ? envelope(t, 0, 200, BEATS.fade[0], BEATS.fade[1]) : 1 - ease.inOutCubic(progress(t, ...BEATS.fade));
  let text = strokesSvg(L.name, { x0: L.x0, y0: L.y1, k: L.k1, color: COLORS.name, weight: 0.78, upTo: typedName, t, times: TYPING.name, reduced })
    + strokesSvg(L.credit, { x0: L.x0, y0: L.y2, k: L.k2, color: COLORS.credit, weight: 0.95, upTo: typedCredit, t, times: TYPING.credit, reduced });
  // The cursor: solid while typing, blinking while it waits; on the line being typed.
  if (!reduced && t >= BEATS.cursorOn && t < BEATS.fade[1]) {
    const onCredit = t >= BEATS.lineBreak;
    const chars = onCredit ? L.credit : L.name, typed = onCredit ? typedCredit : typedName, times = onCredit ? TYPING.credit : TYPING.name;
    const k = onCredit ? L.k2 : L.k1, y0 = onCredit ? L.y2 : L.y1;
    const x = L.x0 + (typed ? chars[typed - 1].x + chars[typed - 1].advance + TRACKING * 0.55 : -TRACKING * 0.2) * k;
    const lastKey = typed ? times[typed - 1] : (onCredit ? BEATS.lineBreak : BEATS.cursorOn);
    const typing = typed < chars.length && t - lastKey < 160;
    const idle = t - Math.max(lastKey, onCredit ? BEATS.lineBreak : BEATS.cursorOn);
    const visible = typing || Math.floor(idle / (BLINK_MS / 2)) % 2 === 0;
    if (visible) text += `<rect x="${f(x)}" y="${f(y0 - 0.5 * k)}" width="${f(0.95 * k)}" height="${f(7 * k)}" fill="${COLORS.cursor}"/>`;
  }
  const glow = D.use('br-glow', `<filter id="br-glow" x="-0.2" y="-0.5" width="1.4" height="2" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f(L.cap * 0.09)}"/></filter>`);
  let out = `<rect width="${W}" height="${H}" fill="${NIGHT}"/>`;
  out += `<g opacity="${f3(fade)}"><g opacity="0.35" filter="${glow}">${text}</g>${text}</g>`;
  if (t >= BEATS.night) out += `<rect width="${W}" height="${H}" fill="${NIGHT}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${D.markup()}${out}</svg>`;
}

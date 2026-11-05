// mothership:dev-only
//
// "Ink Block": the cinematic library's original display lettering, drawn as strokes on a 4 x 6
// grid with chamfered corners, inked like the board's art. It sets titles (BLACKHOLE) and comic
// sound effects (THUMP, WHIRR) as vector art, so no font file, licence or font fallback is
// involved and a render is the same on every machine. Decorative only: a word drawn here is never
// the only place its meaning appears (the client's own words and live region say the outcome).

/** Each glyph: its advance in grid units and its strokes, polylines on the 4 x 6 grid (y down). */
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
  '!': [1.2, [[[0.6, 0], [0.6, 4.1]], [[0.6, 5.6], [0.6, 6]]]],
  '.': [1.2, [[[0.6, 5.6], [0.6, 6]]]],
  '-': [3, [[[0, 3], [3, 3]]]],
  ' ': [2.2, []],
});

const f = v => Number(v.toFixed(2));

/** The width of `text` in grid units at `tracking` units between glyphs. */
export function measure(text, tracking = 1.5) {
  const chars = [...text.toUpperCase()];
  return chars.reduce((sum, ch, i) => sum + (GLYPHS[ch] ?? GLYPHS[' '])[0] + (i < chars.length - 1 ? tracking : 0), 0);
}

/** The strokes of `text` as SVG path data, in grid units from its top-left. */
export function strokes(text, tracking = 1.5) {
  let x = 0;
  const parts = [];
  for (const ch of text.toUpperCase()) {
    const [advance, lines] = GLYPHS[ch] ?? GLYPHS[' '];
    for (const line of lines) parts.push(`M${line.map(([u, v]) => `${f(x + u)} ${f(v)}`).join('L')}`);
    x += advance + tracking;
  }
  return parts.join('');
}

/**
 * `text` set as an inked word: an offset shadow, a wide ink stroke, the colour stroke and a thin
 * highlight, optionally with a soft glow (a filter id the caller defines). `size` is the cap height
 * in px, (x, y) the word's centre, `weight` the colour stroke in grid units, `skew` in degrees,
 * `scale` a punch on top of `size`, `opacity` for the whole word.
 */
export function lettering(text, {
  x = 0, y = 0, size = 48, weight = 1.15, ink = '#151923', inkWeight = 0.75, fill = '#F2C14E', highlight = '#FFF3C4',
  shadow = [0.55, 0.65], shadowColor = '#151923', skew = -8, rotate = 0, scale = 1, opacity = 1, tracking = 1.5, glow = null, glowColor = null,
} = {}) {
  const k = (size / 6) * scale;
  const width = measure(text, tracking);
  const d = strokes(text, tracking);
  const at = `translate(${f(x)} ${f(y)}) rotate(${f(rotate)}) skewX(${f(skew)}) scale(${f(k)}) translate(${f(-width / 2)} -3)`;
  const line = (stroke, w, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linejoin="miter" stroke-miterlimit="3" stroke-linecap="square"${extra}/>`;
  return `<g opacity="${f(opacity)}" transform="${at}">`
    + (glow ? `<g filter="url(#${glow})">${line(glowColor ?? fill, weight + inkWeight * 2.2, ' opacity="0.9"')}</g>` : '')
    + (shadow ? `<g transform="translate(${f(shadow[0])} ${f(shadow[1])})">${line(shadowColor, weight + inkWeight * 2)}</g>` : '')
    + line(ink, weight + inkWeight * 2)
    + line(fill, weight)
    + `<g transform="translate(-0.12 -0.14)">${line(highlight, weight * 0.28, ' opacity="0.85"')}</g>`
    + '</g>';
}

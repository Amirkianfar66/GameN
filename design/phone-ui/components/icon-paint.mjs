// The painted form of the phone interface's icons (phone-ui-icons-1.1.0). The owner, 18 November 2026, with a
// picture of the bottom bar: "This is what i am thinking of bottom bar"; and on its draft: "I am ok with this
// new bar". Every tab's icon is a small painted tile like the character's portrait, and the round button's icon
// is painted too. Runtime source, Designer's, beside the family it paints.
//
// Two shapes, both from the family's own drawings (icons.mjs), so an icon keeps one silhouette:
// - iconTileSvg: the icon as a tile in the crew portrait's frame (the continuous-corner square, the white rim,
//   the soft shadow, a warm ground under a vignette), its drawing in cream over a brown line;
// - iconPaintedSvg: the drawing alone, painted, for a coloured ground (the round button).
// No icon is drawn in this file: the shapes are the family's parts, or its ICON_PAINTED.
//
// Like the icons they are drawn from, these say no role, team or faction and no hidden fact. The tile's
// ground is one fixed colour: it does not follow a player, a seat or a character.

import { ICONS, ICON_PAINTED } from './icons.mjs';

const num = n => Number(n.toFixed(2));
const d1 = n => Number(n.toFixed(1));

/**
 * The crew portrait's frame, by its own numbers (design/crew-drawing/source/portrait.mjs and ink.mjs):
 * a superellipse, n = 5, of half-size 54 in a box of -64 -64 128 128, a white rim of 7 and a shadow.
 */
export const TILE = Object.freeze({ box: Object.freeze([-64, -64, 128, 128]), half: 54, rim: 7 });
const FRAME = (() => {
  let d = 'M';
  for (let i = 0; i < 96; i += 1) {
    const t = (i / 96) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    d += `${i ? 'L' : ''}${d1(TILE.half * Math.sign(c) * Math.abs(c) ** 0.4)} ${d1(TILE.half * Math.sign(s) * Math.abs(s) ** 0.4)}`;
  }
  return `${d}Z`;
})();
/** The frame's path, for a check that it is the portrait's. */
export const TILE_FRAME_PATH = FRAME;

/** The tile's ground: a warm orange, lit from the upper left, as a portrait's ground is. */
const GROUND = Object.freeze({ light: '#F19E5A', main: '#EE8B3A', deep: '#82522F', band: '#AD6933' });
/**
 * DRAFT (the panels' style, not approved): a tile's ground says one thing. `warm`, the bar's own, is something
 * the player can press now. `steel` is something that cannot be pressed now, or only tells.
 */
const GROUNDS = Object.freeze({ warm: GROUND, steel: Object.freeze({ light: '#8C9BB8', main: '#66769A', deep: '#2E3850', band: '#4A587A' }) });
export const ICON_GROUNDS = Object.freeze(Object.keys(GROUNDS));
const INK = '#151923';

/** A paint: three tones of one colour, light to deep, and the line around them. */
const PAINTS = Object.freeze({
  cream: Object.freeze({ light: '#FFF6E0', main: '#F8DFAE', deep: '#E6AE66', line: '#4A2913' }),
  ember: Object.freeze({ light: '#F9BE6C', main: '#EC8A36', deep: '#C5601B', line: '#52290F' }),
});
export const ICON_PAINTS = Object.freeze(Object.keys(PAINTS));

/**
 * An icon painted by hand rather than from its line drawing: the same silhouette, as stacked shapes (`d`, a tone,
 * drawn in order, each with its own line). Their shapes are the family's own (icons.mjs, ICON_PAINTED): no icon is
 * drawn in this file. The rest are painted from the family's parts.
 */
const STACKED = ICON_PAINTED;

const LINE = 2.2; // how much wider the brown line is than the paint it goes round, on the 24 grid

const shape = (part, attrs) => part.c
  ? `<circle cx="${num(part.c[0])}" cy="${num(part.c[1])}" r="${num(part.c[2])}" ${attrs}/>`
  : `<path d="${part.d}" ${attrs} stroke-linecap="round" stroke-linejoin="round"/>`;

/** The drawing on the 24 grid: a soft shadow, the brown line, the paint, the inner lines. `fill` maps a tone to a paint. */
function drawing(name, paint, fill, open = false) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`No icon ${JSON.stringify(name)}`);
  const line = paint.line;
  const stacked = !open && STACKED[name];
  if (stacked) {
    const under = stacked.map(part => shape(part, `fill="${line}" stroke="${line}" stroke-width="${num(1.8 + LINE)}"`)).join('');
    const sheets = stacked.map(part => shape(part, `fill="${line}" stroke="${line}" stroke-width="${num(1.8 + LINE)}"`) + shape(part, `fill="${fill(part.tone)}" stroke="${fill(part.tone)}" stroke-width="1.8"`)).join('');
    return `<g transform="translate(0.5 0.9)" opacity="0.3">${under}</g>${sheets}`;
  }
  // `open`: the line drawing itself is painted. Nothing is filled but a dot, so no icon is a plate with marks on it.
  const outer = icon.parts.filter(part => open || !part.knock), inner = icon.parts.filter(part => !open && part.knock);
  const closed = part => part.dot || (!open && part.fill);
  const dash = part => (part.dash ? ' stroke-dasharray="2.2 2.2"' : '');
  const under = outer.map(part => shape(part, `fill="${closed(part) ? line : 'none'}" stroke="${line}" stroke-width="${num((part.dot ? 0 : part.width ?? 1.8) + LINE)}"${dash(part)}`)).join('');
  const over = outer.map(part => shape(part, `fill="${closed(part) ? fill('main') : 'none'}" stroke="${fill('main')}" stroke-width="${part.dot ? 0 : part.width ?? 1.8}"${dash(part)}`)).join('');
  const lines = inner.map(part => shape(part, part.dot ? `fill="${line}"` : `fill="none" stroke="${line}" stroke-width="${num((part.width ?? 1.8) - 0.3)}"`)).join('');
  return `<g transform="translate(0.5 0.9)" opacity="0.3">${under}</g>${under}${over}${lines}`;
}

/** The paint's own gradient, light at the upper left, in the 24 grid's units (a line has no box of its own to fill). */
const gradient = (id, paint) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="5" y1="3" x2="19" y2="21"><stop offset="0" stop-color="${paint.light}"/><stop offset="0.55" stop-color="${paint.main}"/><stop offset="1" stop-color="${paint.deep}"/></linearGradient>`;
const fills = (id, paint, stacked) => (stacked ? tone => paint[tone] : () => `url(#${id})`);

let serial = 0;
/** An id for one drawing's own gradients and clip: every drawing carries its own, so none depends on another being shown. */
const nextId = () => `ms-icp-${(serial += 1)}`;

/**
 * An icon as a painted tile, an inline SVG that fills its container. Decorative (`aria-hidden`): the
 * control it is in names itself with its words. `id`: a prefix for its own ids, for a repeatable string.
 */
export function iconTileSvg(name, { className = 'ic-tile', id = nextId(), paint = 'cream', ground = 'warm' } = {}) {
  const p = PAINTS[paint];
  if (!p) throw new Error(`No paint ${JSON.stringify(paint)}`);
  const GROUND = GROUNDS[ground];
  if (!GROUND) throw new Error(`No ground ${JSON.stringify(ground)}`);
  const g = `${id}-ground`, clip = `${id}-frame`, f = `${id}-paint`;
  const [x, y, w, h] = TILE.box;
  let bands = '';
  for (let i = 0; i < 9; i += 1) {
    const by = -50 + i * 12.4, bx = -54 + ((i * 37) % 11);
    bands += `<path d="M${d1(bx)} ${d1(by + 6)}L${d1(bx + 34)} ${d1(by - 4)}L${d1(bx + 70)} ${d1(by + 2)}L${d1(bx + 108)} ${d1(by - 6)}" fill="none" stroke="${GROUND.band}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.22"/>`;
  }
  return `<svg class="${className}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">`
    + `<defs><radialGradient id="${g}" cx="0.38" cy="0.32" r="0.86"><stop offset="0" stop-color="${GROUND.light}"/><stop offset="0.62" stop-color="${GROUND.main}"/><stop offset="1" stop-color="${GROUND.deep}"/></radialGradient>`
    + `<clipPath id="${clip}"><path d="${FRAME}"/></clipPath>${gradient(f, p)}</defs>`
    + `<path d="${FRAME}" transform="translate(1.6 3.2) scale(1.02)" fill="${INK}" opacity="0.2"/>`
    + `<path d="${FRAME}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${TILE.rim}" stroke-linejoin="round"/>`
    + `<g clip-path="url(#${clip})"><path d="${FRAME}" fill="url(#${g})"/>${bands}`
    + `<path d="${FRAME}" fill="none" stroke="${INK}" stroke-width="20" opacity="0.14"/>`
    + `<g transform="translate(-48 -48) scale(4)">${drawing(name, p, fills(f, p, !!STACKED[name]))}</g></g>`
    + `<path d="${FRAME}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.65"/></svg>`;
}

/** An icon's drawing alone, painted, as an inline SVG on the icons' own 24 grid with room for its line. Decorative. */
export function iconPaintedSvg(name, { className = 'ic-paint', id = nextId(), paint = 'ember', open = false } = {}) {
  const p = PAINTS[paint];
  if (!p) throw new Error(`No paint ${JSON.stringify(paint)}`);
  const f = `${id}-paint`;
  return `<svg class="${className}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 27 27">`
    + `<defs>${gradient(f, p)}</defs>${drawing(name, p, fills(f, p, !open && !!STACKED[name]), open)}</svg>`;
}

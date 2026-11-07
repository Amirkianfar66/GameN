// mothership:dev-only
//
// The crew's heads (crew.mjs), drawn in the rig's head frame (the rig's body.mjs): the
// middle of the face at 0,0, the chin near 16, the top of the skull near -16. 'front' is the
// three-quarter view facing left, 'down' looks down (the lids lowered) and 'back' is turned away.
// The faces are the owner's own art, traced (heads/, from design/tools/character-pilot-trace.py)
// and approved as drawn on 7 November 2026; heads/ is byte for byte the approved character pilot's.
//
// What the drawing adds to the art, and only this:
// - lids that close over the drawn eyes (a blink, or looking down); Echo's eyes are behind the
//   visor, so Echo has no lids;
// - the hair that hangs below the jaw (Mira's hair, Echo's locs) swings and lifts with the motion
//   given (motion.mjs), the drawing above the jaw holding still;
// - a bandage, where the public view says Injured (the skeleton's bandage, gestures.mjs's +injured);
// - from behind, the head in the traced colours, at the traced size.
//
// Two ways to carry the art (a head is 30 to 62 KB): inline, in the figure's own defs (the default:
// a figure is one self-contained SVG, as the rig's is, and text effects that rewrite colours or ids
// keep working), or by reference to art placed once on the page (mount.mjs crewArtDefs). With
// live, the parts that move carry data-crew-* hooks, so a frame updates attributes instead of
// rebuilding the figure (mount.mjs).

import { ATLAS_HEAD } from './heads/atlas.mjs';
import { ECHO_HEAD } from './heads/echo.mjs';
import { JUNO_HEAD } from './heads/juno.mjs';
import { LYRA_HEAD } from './heads/lyra.mjs';
import { MIRA_HEAD } from './heads/mira.mjs';
import { NOVA_HEAD } from './heads/nova.mjs';
import { ORION_HEAD } from './heads/orion.mjs';
import { RIGEL_HEAD } from './heads/rigel.mjs';
import { VEGA_HEAD } from './heads/vega.mjs';
import { INK, inkCanvas, shade, tint } from './ink.mjs';

/** Each character's traced head: { id, eyes, neck, skin, hair, sway, paths }. */
export const HEADS = Object.freeze({
  c1: VEGA_HEAD, c2: RIGEL_HEAD, c3: LYRA_HEAD, c4: ATLAS_HEAD, c5: ORION_HEAD,
  c6: NOVA_HEAD, c7: JUNO_HEAD, c8: MIRA_HEAD, c9: ECHO_HEAD,
});

/** The bandage's paper, its fold and the light on it: the rig's public paper tones (no red cross: red is a team's colour). */
const BANDAGE = Object.freeze({ paper: '#F4EBDD', fold: '#CBBBA2' });

const f2 = n => n.toFixed(2);

/** Points along the free end of a lock of hair, moved by the hair's follow-through (more toward the tip). */
const trail = (points, { sway = 0, lift = 0 }, from = 0.35) => points.map(([x, y]) => {
  const k = Math.max(0, (y - from * 30) / 40);
  return [x + sway * k, y + lift * k];
});

// ---------- The traced art ----------

/** A head's art as one group with the given id: the filled paths, painted in order. No ids inside, so it can be shared. */
export function headArt(id, artId) {
  const head = HEADS[id];
  return `<g id="${artId}">${head.paths.map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')}</g>`;
}

/**
 * The art's id: shared on the page (art.ref, from mount.mjs crewArtDefs), or the figure's own.
 * A live figure's own art is marked (data-crew-art), so a pose frame passes over it; art.shell
 * draws that mark alone, for a pose frame, which never redraws the art (mount.mjs crewPoseFrame).
 */
function artId(cv, id, art, live = false) {
  if (art?.ref) return `${art.ref}-${id}`;
  const own = cv.uid('head');
  if (art?.shell) cv.def(`<g data-crew-art="" id="${own}"/>`);
  else cv.def(live ? headArt(id, own).replace('<g id=', '<g data-crew-art="" id=') : headArt(id, own));
  return own;
}

// ---------- What moves ----------

/** How far the hanging hair's ends hang below the line it hangs from; they trail by sway and lift over this. */
const HANG = 24;

/** The transform of the hanging hair below its line (head.sway) for a sway and a lift, or null for a head whose hair does not hang. */
export function hangTransform(id, sway = 0, lift = 0) {
  const y = HEADS[id].sway;
  if (y == null) return null;
  const skew = Math.atan(sway / HANG) * (180 / Math.PI), stretch = 1 + lift / HANG;
  return `translate(0 ${f2(y)}) skewX(${f2(skew)}) scale(1 ${stretch.toFixed(3)}) translate(0 ${f2(-y)})`;
}

/**
 * The hair hanging below its line swings and lifts: the art above the line is drawn as it is;
 * below it, the same art is skewed about the line, so the two meet without a seam.
 */
function hangingHair(cv, id, art, { sway, lift }, live) {
  const y = HEADS[id].sway;
  const above = cv.uid('hang'), below = cv.uid('hang');
  cv.def(`<clipPath id="${above}"><rect x="-80" y="-80" width="160" height="${f2(80 + y + 0.4)}"/></clipPath>`);
  cv.def(`<clipPath id="${below}"><rect x="-80" y="${f2(y)}" width="160" height="80"/></clipPath>`);
  cv.raw(`<use href="#${art}" clip-path="url(#${above})"/>`);
  cv.raw(`<g clip-path="url(#${below})"><g${live ? ' data-crew-hang=""' : ''} transform="${hangTransform(id, sway, lift)}"><use href="#${art}"/></g></g>`);
}

/**
 * The lids of a head closed 0..1, as path data: each comes down over a drawn eye (an ellipse)
 * from above, its edge curving down; shut, the edge lies along the eye's lower lid. [] for Echo.
 */
export function lidPaths(id, closed) {
  const k = Math.max(0, Math.min(1, closed));
  return HEADS[id].eyes.map(([cx, cy, rx, ry]) => {
    const sag = ry * 0.32, edge = cy - ry - sag + 2 * ry * k;
    const left = cx - rx - 0.4, right = cx + rx + 0.4, low = edge + 2 * sag;
    const curve = `Q${f2(cx)} ${f2(low)}`;
    return {
      lid: `M${f2(left)} ${f2(cy - ry - 1)}H${f2(right)}V${f2(edge)}${curve} ${f2(left)} ${f2(edge)}Z`,
      lash: `M${f2(left)} ${f2(edge)}${curve} ${f2(right)} ${f2(edge)}`,
    };
  });
}

/** The lids, drawn in the head's skin and clipped to the drawn eyes; with live, drawn open too, so a frame can close them. */
function lids(cv, id, closed, live) {
  if (closed <= 0 && !live) return;
  const head = HEADS[id];
  lidPaths(id, closed).forEach(({ lid, lash }, i) => {
    const [cx, cy, rx, ry] = head.eyes[i];
    const clip = cv.uid('lid');
    cv.def(`<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`);
    const hook = name => (live ? ` data-crew-${name}="${i}"` : '');
    cv.raw(`<g clip-path="url(#${clip})"><path${hook('lid')} d="${lid}" fill="${head.skin}"/>`
      + `<path${hook('lash')} d="${lash}" fill="none" stroke="${INK}" stroke-width="${f2(Math.max(0.7, ry * 0.3))}" stroke-linecap="round"/></g>`);
  });
}

/** Where a bandage sits on each head's forehead: how far above the eyes' line, in the head frame. */
const BANDAGE_LIFT = Object.freeze({ c1: 10.5, c2: 9.5, c3: 10.5, c4: 9.6, c5: 9.6, c6: 10, c7: 10.4, c8: 10.6, c9: 9.6 });

/** A bandage round the forehead, from the face's edge back over the ear: paper, inked, a fold along it. */
function bandage(cv, id) {
  const head = HEADS[id];
  const eyes = head.eyes.length ? head.eyes.reduce((s, e) => s + e[1], 0) / head.eyes.length : -1.6;
  const y = eyes - BANDAGE_LIFT[id];
  const band = `M-14.6 ${f2(y + 0.4)} Q0 ${f2(y - 5.4)} 14.6 ${f2(y - 0.2)} L14.4 ${f2(y + 5)} Q0 ${f2(y)} -14.2 ${f2(y + 5.4)} Z`;
  cv.raw(`<path d="${band}" fill="${BANDAGE.paper}"/><path d="M4 ${f2(y - 2.4)} Q10 ${f2(y - 1.8)} 14.6 ${f2(y - 0.2)} L14.4 ${f2(y + 5)} Q9 ${f2(y + 3)} 3.6 ${f2(y + 2.6)} Z" fill="${INK}" opacity="0.16"/>`
    + `<path d="${band}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M-11 ${f2(y + 1.4)} Q0 ${f2(y - 2.6)} 11 ${f2(y + 1.6)}" fill="none" stroke="${BANDAGE.fold}" stroke-width="0.9" stroke-linecap="round"/>`);
}

/** The bandage from behind, round the back of the head (in the back view's own frame). */
function bandageBack(cv) {
  const band = 'M-13.6 -9.4 Q0 -15 13.6 -9.4 L13.6 -4.4 Q0 -9.8 -13.6 -4.4 Z';
  cv.raw(`<path d="${band}" fill="${BANDAGE.paper}"/><path d="${band}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<path d="M-6 -7.6 l3 2.6 M-6 -7.6 l3.4 -1.6" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`);
}

function tracedFront(cv, c, motion, down, { art, live, bandaged }) {
  const id = c.id;
  const ref = artId(cv, id, art, live);
  if (HEADS[id].sway == null) cv.raw(`<use href="#${ref}"/>`);
  else hangingHair(cv, id, ref, motion, live);
  if (bandaged) bandage(cv, id);
  lids(cv, id, down ? 1 : motion.blink, live);
}

// ---------- From behind ----------

/**
 * The back view fitted to the size of the traced head: [x scale, y scale, y shift]. Mira's hair from
 * behind is as full and long as her front's; Nova's bob and headphones and Atlas's crop as tall;
 * Orion's bald head as large. The other heads are drawn at their traced size.
 */
const BACK_FIT = Object.freeze({ long: [1.2, 1, -7.5], bob: [1.08, 1.23, -0.8], quiff: [1, 1.12, -1.2], bald: [1.1, 1.1, -4] });

/** A rounded mass with a bumpy edge (curls, a bun), as points for a form. */
const bumpy = (cx, cy, rx, ry, n, bump) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2, k = 1 + (i % 2 ? -bump : bump);
  return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
});

function headBack(cv, c, motion, live = false) {
  const [sx, sy, dy] = BACK_FIT[c.hairStyle] ?? [1, 1, 0];
  // Live, the back of hanging hair (it trails the head) is numbered, so a frame can move it (backHairPaths).
  const hangs = live && HEADS[c.id].sway != null;
  cv.group(`translate(0 ${dy}) scale(${sx} ${sy})`, () => (hangs ? cv.mark('back-hair', () => backShapes(cv, c, motion)) : backShapes(cv, c, motion)));
}

/**
 * The back of Mira's hair or Echo's locs for a sway and a lift: each numbered path's geometry, in
 * the order a live figure numbers them (data-crew-back-hair), for a frame (mount.mjs crewFrame).
 * [] for a head whose hair does not hang.
 */
export function backHairPaths(c, motion = {}) {
  if (HEADS[c.id].sway == null) return [];
  const cv = inkCanvas('bh');
  cv.mark('back-hair', () => backShapes(cv, c, { blink: 0, sway: motion.sway ?? 0, lift: motion.lift ?? 0 }));
  const out = [];
  for (const m of `${cv.defs()}${cv.layer('body')}`.matchAll(/data-crew-back-hair="(\d+)" d="([^"]*)"/g)) out[Number(m[1])] = m[2];
  return out;
}

function backShapes(cv, c, motion) {
  if (c.hairStyle === 'long') {
    cv.form(trail([[-14, -8], [-10, -18.4], [0, -21], [10, -18.4], [15.4, -6], [16.4, 8], [19, 20], [17.6, 31.6], [20, 39.6], [11, 42.6], [4, 37.6], [-4, 42.4], [-12.6, 38], [-12.4, 28], [-16, 18], [-15.6, 6]], motion), c.hair, { weight: 2.2, depth: 4.4, seed: 73, wobble: 0.5 });
    for (const lock of [[[-6, -14], [-8, 4], [-6, 20], [-8, 34]], [[2, -15], [4, 4], [2, 22], [4, 36]], [[9, -12], [12, 4], [11, 20], [14, 33]]]) cv.line(trail(lock, motion), { weight: 0.9, color: c.hairLight, opacity: 0.85 });
    return;
  }
  if (c.hairStyle === 'afro') {
    // Vega: a full cloud of curls hiding the ears, the headband across its top.
    cv.form(bumpy(0, -11, 21, 21.5, 22, 0.05), c.hair, { weight: 2.2, depth: 4.4, seed: 131, wobble: 0.6 });
    for (const [x, y] of [[-12, -18], [-4, -24], [6, -21], [13, -12], [-15, -6], [-6, -10], [5, -6], [12, 0], [-9, 1], [1, 4]]) {
      cv.line([[x - 2, y + 1], [x, y - 1.4], [x + 2.2, y + 0.6]], { weight: 0.9, color: c.hairLight, opacity: 0.85, seed: 133 });
    }
    cv.line([[-18.6, -14], [-11, -25.6], [0, -28.8], [11, -25.6], [18.6, -14]], { weight: 2.6, color: c.band, taper: 'none' });
    return;
  }
  if (c.hairStyle === 'locs') {
    // Echo: locs from the crown, hanging down the back past the neck, over the visor's strap.
    cv.form([[-14, -3], [-14.8, -12], [-9.4, -20], [0, -22.4], [9.4, -20], [14.8, -12], [14, -3], [7, 2], [0, 0.6], [-7, 2]], c.hair, { weight: 2.1, depth: 3, seed: 137 });
    cv.line([[-15, -4], [-7, -5.4], [0, -5.8], [7, -5.4], [15, -4]], { weight: 2.4, color: c.gear, taper: 'none' });
    for (const [i, x] of [-12, -8, -4, 0, 4, 8, 12].entries()) {
      const end = 22 + (i % 3) * 3.4;
      cv.limb(trail([[x * 0.9, -16], [x * 1.08, 4], [x * 1.18, end]], motion), [2.4, 2.2, 1.9], c.hair, { weight: 1.4, seed: 139 + i, rim: false });
      cv.line(trail([[x * 1.02, -2], [x * 1.12, 10]], motion), { weight: 0.8, color: c.hairLight, opacity: 0.8, seed: 141 + i });
    }
    return;
  }
  for (const side of [-1, 1]) cv.form([[11 * side, -4], [14.6 * side, -4.6], [15.2 * side, 1.6], [12.4 * side, 5.6], [10.6 * side, 2]], c.skin, { weight: 1.5, depth: 1, rim: false, grain: false, seed: 79 + side });
  cv.form([[-11.6, -11], [-13, -2], [-11.6, 6.6], [-6, 13], [0, 14.4], [6, 13], [11.6, 6.6], [13, -2], [11.6, -11], [0, -15.4]], c.skin, { weight: 2, depth: 3, seed: 83 });
  if (c.hairStyle === 'beanie') {
    // Rigel: ginger hair at the back below the beanie, and the beanie with its rolled cuff.
    cv.form([[-13.6, -8], [-14, 0], [-12.4, 7], [-6.4, 11.8], [0, 12.6], [6.4, 11.8], [12.4, 7], [14, 0], [13.6, -8]], c.hair, { weight: 2, depth: 2.8, seed: 143 });
    cv.form([[-15.4, -6], [-15.8, -14.6], [-12, -22.4], [-4.4, -27.2], [4.4, -27.2], [12, -22.4], [15.8, -14.6], [15.4, -6]], c.band, { weight: 2.2, depth: 3.4, seed: 145 });
    cv.form([[-16.4, -10.6], [16.4, -10.6], [16.6, -4], [-16.6, -4]], shade(c.band, 0.18), { weight: 1.8, depth: 1.6, seed: 147, tension: 0.4 });
    for (let x = -13; x <= 13; x += 3.25) cv.line([[x, -9.6], [x * 1.01, -5]], { weight: 0.55, color: shade(c.band, 0.45), taper: 'none', seed: 149 });
    return;
  }
  if (c.hairStyle === 'bun') {
    // Lyra: hair drawn up to a bun on the crown, its tie, and loose strands at the nape.
    cv.form([[-14, 0], [-14.6, -10], [-9, -19], [0, -22], [9, -19], [14.6, -10], [14, 0], [9, 5], [0, 3.6], [-9, 5]], c.hair, { weight: 2.1, depth: 3, seed: 151 });
    cv.form(bumpy(1, -27, 8, 7.4, 12, 0.06), c.hair, { weight: 2, depth: 3, seed: 153, wobble: 0.5 });
    cv.line([[-3, -29], [1, -32], [5, -28.6]], { weight: 0.9, color: c.hairLight, opacity: 0.85 });
    cv.line([[-5.4, -21.4], [1, -20.2], [7, -21.4]], { weight: 2.2, color: c.band, taper: 'none' });
    for (const [x, d] of [[-10, -1], [9, 1], [-4, -1]]) cv.line([[x, 3], [x + d * 1.4, 8], [x + d * 0.6, 12]], { weight: 1, color: c.hair, taper: 'end' });
    for (const lock of [[[-8, -16], [-6, -6]], [[3, -19], [4, -8]], [[10, -14], [9, -4]]]) cv.line(lock, { weight: 0.8, color: c.hairLight, opacity: 0.8 });
    return;
  }
  if (c.hairStyle === 'bald') {
    // Orion: the bald crown catching the light, and wild white hair round the back and sides.
    cv.flat([[-6, -12.4], [-1, -14], [2, -11], [-3, -9.6]], tint(c.skin, 0.35), { opacity: 0.7 });
    cv.form([[-14, -9], [-16.4, -3], [-15, 4], [-10, 10.4], [0, 12.4], [10, 10.4], [15, 4], [16.4, -3], [14, -9], [11, -3], [6, 3], [0, 4.6], [-6, 3], [-11, -3]], c.hair, { weight: 1.9, depth: 2.6, seed: 157, wobble: 0.5 });
    for (const side of [-1, 1]) {
      cv.form([[13 * side, -10], [20 * side, -14.6], [17.6 * side, -8], [23 * side, -6.6], [17 * side, -3], [21 * side, 1], [15 * side, 1.6]], c.hair, { weight: 1.7, depth: 2, seed: 159 + side, tension: 0.4 });
      cv.line([[14 * side, -8.6], [19 * side, -11.6]], { weight: 0.7, color: c.hairLight, opacity: 0.9 });
    }
    for (const lock of [[[-8, 4], [-4, 8]], [[3, 6], [7, 4]]]) cv.line(lock, { weight: 0.7, color: c.hairLight, opacity: 0.9 });
    return;
  }
  if (c.hairStyle === 'messy') {
    // Juno: messy hair with tufts sticking up and out, and the goggles' strap round the back.
    cv.form([[-14.4, 4], [-15, -6], [-18.4, -9], [-14.6, -12], [-17.4, -17], [-11, -18], [-10, -24], [-4, -21], [0, -26.4], [4, -21.6], [10, -24.6], [10.6, -18.6], [17, -18], [14.6, -12], [18.4, -8], [15, -5], [14.4, 4], [9, 10.4], [3, 12], [-3, 12], [-9, 10.4]], c.hair, { weight: 2, depth: 3, seed: 163, tension: 0.35 });
    for (const lock of [[[-9, -14], [-12, -20]], [[1, -16], [0, -23]], [[7, -14], [10, -20]], [[-4, -6], [-6, 0]], [[6, -6], [8, 1]]]) cv.line(lock, { weight: 0.8, color: c.hairLight, opacity: 0.9 });
    cv.line([[-15.4, -11.4], [-8, -14], [0, -14.6], [8, -14], [15.4, -11.4]], { weight: 2.4, color: c.gear, taper: 'none' });
    return;
  }
  if (c.hairStyle === 'bob') {
    cv.form([[-15.6, 9.6], [-16.4, -6], [-11, -17.6], [0, -20.6], [11, -17.6], [16.4, -6], [15.6, 9.6], [6, 10.4], [0, 9.6], [-6, 10.4]], c.hair, { weight: 2.2, depth: 3.4, seed: 89, tension: 0.8 });
  } else {
    cv.form([[-13.6, 0], [-14, -10.6], [-7, -20.6], [2, -21.6], [10.6, -19.6], [14.6, -9.6], [13.6, 0.6], [8, 4.6], [0, 3.4], [-8, 4.6]], c.hair, { weight: 2.1, depth: 3, seed: 97, wobble: 0.5 });
  }
  if (c.headphones) {
    cv.line([[-14.6, -4], [-10, -18.6], [0, -22.4], [10, -18.6], [14.6, -4]], { weight: 2.6, color: c.gear, taper: 'none' });
    for (const side of [-1, 1]) cv.form([[13 * side, -5.6], [17 * side, -4.6], [17.6 * side, 3], [13.6 * side, 5.4], [12 * side, 0]], c.gear, { weight: 1.6, depth: 1.4, seed: 101 + side });
  }
}

/**
 * The head, in its own frame. view: 'front', 'down' or 'back'. motion: { blink, sway, lift }.
 * options: { bandage, art: { ref }, live }.
 */
export function crewHead(cv, c, view = 'front', motion = {}, { bandage: bandaged = false, art = null, live = false } = {}) {
  const m = { blink: motion.blink ?? 0, sway: motion.sway ?? 0, lift: motion.lift ?? 0 };
  if (view === 'back') {
    headBack(cv, c, m, live);
    if (bandaged) bandageBack(cv);
    return;
  }
  tracedFront(cv, c, m, view === 'down', { art, live, bandaged });
}

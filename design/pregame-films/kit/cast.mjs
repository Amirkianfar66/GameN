// mothership:dev-only
//
// The crew in the films: the approved crew drawing (design/crew-drawing/source/, imported unchanged)
// on the approved rig's skeletons (design/board-motion/figures/), placed, lit and graded for a
// cinematic shot. Each figure is lit by one SVG filter, as a renderer lights a sprite:
//   - ambient: the scene's dark laid over the whole figure (its colours multiplied by the night);
//   - key: a point light (the desk lamp, a doorway) whose light falls off across the figure, brighter
//     on the side and the parts nearer it, multiplying the figure's own colours back up (so the light
//     shows what is lit, never a flat wash over it);
//   - rim: the edge facing a light behind the figure, picked out in that light's colour.
// A silhouette (`silhouette: '#colour'`) is the same figure filled with one colour and rimmed: a
// person with no face, number or name, for the films' other people.

import { CREW } from '../../crew-drawing/source/crew.mjs';
import { dressedFigureSvg } from '../../crew-drawing/source/wardrobe.mjs';
import { crewMotion } from '../../crew-drawing/source/motion.mjs';
import { f, f3, nest } from './math.mjs';

/** The rig's frame: its box and the anchor (between the feet, on the floor). */
export const RIG = Object.freeze({ box: [-90, -40, 300, 300], anchor: [62, 233] });

/** A rig point (skeleton units) placed on the page for a figure anchored at `at`, `scale` px per unit. */
export const onPage = ([ax, ay], scale, [x, y], flip = false) => [ax + (flip ? -1 : 1) * (x - RIG.anchor[0]) * scale, ay + (y - RIG.anchor[1]) * scale];

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);

/**
 * The light filter for one figure. `ambient` { color, strength 0..1 }, `key` { at: [x, y] px, z (px
 * above the page), color, gain }, `rim` { dx, dy (toward the light), color, width px, gain },
 * `silhouette` a colour.
 */
function lightFilter(D, id, { ambient, key, rim, silhouette, box }) {
  const [x, y, w, h] = box;
  let fx = '';
  let current = 'SourceGraphic';
  if (silhouette) {
    fx += `<feFlood flood-color="${silhouette}" result="sil"/><feComposite in="sil" in2="SourceAlpha" operator="in" result="base"/>`;
    current = 'base';
  } else if (ambient) {
    const [r, g, b] = hex(ambient.color);
    const s = ambient.strength ?? 0.6;
    const k = c => f3(1 - s + s * c);
    fx += `<feColorMatrix in="SourceGraphic" type="matrix" values="${k(r)} 0 0 0 0  0 ${k(g)} 0 0 0  0 0 ${k(b)} 0 0  0 0 0 1 0" result="base"/>`;
    current = 'base';
  }
  if (key && !silhouette) {
    fx += `<feDiffuseLighting in="SourceAlpha" surfaceScale="${f3(key.relief ?? 1.5)}" diffuseConstant="1" lighting-color="${key.color}" result="keyL"><fePointLight x="${f(key.at[0])}" y="${f(key.at[1])}" z="${f(key.z ?? 120)}"/></feDiffuseLighting>`;
    fx += `<feComposite in="keyL" in2="SourceAlpha" operator="in" result="keyIn"/>`;
    fx += `<feComposite in="${current}" in2="keyIn" operator="arithmetic" k1="${f3(key.gain ?? 1.4)}" k2="1" k3="0" k4="0" result="lit"/>`;
    current = 'lit';
  }
  if (rim) {
    const wpx = rim.width ?? 2.4;
    fx += `<feOffset in="SourceAlpha" dx="${f(-rim.dx * wpx)}" dy="${f(-rim.dy * wpx)}" result="away"/>`
      + `<feComposite in="SourceAlpha" in2="away" operator="out" result="edge"/>`
      + `<feGaussianBlur in="edge" stdDeviation="${f(Math.max(0.35, wpx * 0.22))}" result="soft"/>`
      + `<feFlood flood-color="${rim.color}"/><feComposite in2="soft" operator="in" result="rimC"/>`
      + `<feComposite in="rimC" in2="${current}" operator="arithmetic" k1="0" k2="${f3(rim.gain ?? 0.9)}" k3="1" k4="0" result="rimmed"/>`;
    current = 'rimmed';
  }
  if (!fx) return null;
  const fid = `${id}-light`;
  D.use(fid, `<filter id="${fid}" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB">${fx}</filter>`);
  return fid;
}

/**
 * One figure of the crew, lit. `c` a crew id (c1..c9) or a crew member; `sk` a rig skeleton; `at` the
 * anchor on the page (px); `scale` px per rig unit; `t` ms, for the crew's own life (blinks, a
 * breath's drift, hanging hair). `clip` y (px): nothing of the figure below it is drawn. `reduced`:
 * the films' reduced motion is held pictures, so the eyes stay open (the crew renderer's own option
 * for a frozen frame, `blink: false`); its general reduced motion, which keeps the blinks, is unchanged.
 */
export function litFigure(D, id, { c, sk, at, scale, t = 0, motion = null, flip = false, ambient = null, key = null, rim = null, silhouette = null, clip = null, reduced = false, seat = 0, opacity = 1, outfit = 'crew' }) {
  const member = typeof c === 'string' ? CREW[c] : c;
  const life = motion ?? crewMotion(t, member.id, { reduced, seat, blink: !reduced });
  const inner = dressedFigureSvg(member, sk, { outfit, prefix: `${id}-f`, inline: true, motion: life });
  const [bx, by, bw, bh] = RIG.box;
  const w = bw * scale, h = bh * scale;
  const x = at[0] - (RIG.anchor[0] - bx) * scale, y = at[1] - (RIG.anchor[1] - by) * scale;
  let figure = nest(inner, { x, y, width: w, height: h });
  if (flip) figure = `<g transform="translate(${f(at[0] * 2)} 0) scale(-1 1)">${figure}</g>`;
  const filter = lightFilter(D, id, { ambient, key, rim, silhouette, box: [x - 10, y - 10, w + 20, h + 20] });
  const clipAttr = clip === null ? '' : ` clip-path="${D.use(`${id}-clip`, `<clipPath id="${id}-clip"><rect x="${f(x - 50)}" y="${f(y - 50)}" width="${f(w + 100)}" height="${f(clip - y + 50)}"/></clipPath>`)}"`;
  return `<g opacity="${f3(opacity)}"${clipAttr}><g${filter ? ` filter="url(#${filter})"` : ''}>${figure}</g></g>`;
}

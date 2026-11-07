// mothership:dev-only
//
// Composing the approved scene art and figure rig into one SVG, in a scene's own units (1024 x
// 768): the scene's back picture, its depth layers, the crew figures drawn by the approved rig
// (design/board-motion/figures, wardrobe and gestures, unchanged) and the films' own layers, all
// sorted by the board's depth rule (page.js: a figure's body at depth x 2, a scene layer at
// depth x 2 + 1, a figure's front parts at 1500 + depth). Pure string builders: nothing here reads
// a clock, a server or a secret; a film passes in who is drawn where, all of it public.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { blend } from '../../board-motion/figures/motion.mjs';
import { dressedFigureSvg } from '../../board-motion/figures/wardrobe.mjs';
import { pressPoint } from '../../board-motion/scenes/frame.mjs';
import { lerp2 } from './ease.mjs';

const [BX, BY, BOX] = FRAME.box;
const [AX, AY] = FRAME.anchor;
const f = v => Number((+v).toFixed(2));

/**
 * An SVG document string re-placed as a nested <svg> at (x, y), width x height, keeping its own
 * viewBox: the approved fx pictures (drone, pulse, inset) drawn inline in a composition.
 */
export function placeSvg(svg, { x, y, width, height, opacity = 1, transform = '', scope = '' }) {
  const view = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!view) throw new Error('placeSvg: no viewBox');
  const inner = scopeIds(svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), scope);
  const body = `<svg x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(height)}" viewBox="${view}" overflow="visible">${inner}</svg>`;
  if (opacity >= 1 && !transform) return body;
  return `<g${opacity < 1 ? ` opacity="${f(opacity)}"` : ''}${transform ? ` transform="${transform}"` : ''}>${body}</g>`;
}

/**
 * An SVG fragment's ids, and every reference to them, prefixed with `scope`: two copies of one
 * approved picture (two amber lamps, two drones) in one composition never share an id.
 */
export function scopeIds(svg, scope) {
  if (!scope) return svg;
  return svg.replace(/\bid="([^"]+)"/g, (whole, id) => `id="${scope}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (whole, id) => `url(#${scope}-${id})`)
    .replace(/href="#([^"]+)"/g, (whole, id) => `href="#${scope}-${id}"`);
}

/**
 * Where a place's figure box is for a gesture, keeping the place's press point fixed (the board's
 * poseSlot()): its anchor in scene units. slot: { pressAt, scale, mirror }.
 */
export function poseAt(slot, sk) {
  const [px0, py0] = pressPoint(sk);
  const [cx, cy] = slot.pressAt;
  const x = slot.mirror ? cx - (AX - px0) * slot.scale : cx - (px0 - AX) * slot.scale;
  return [x, cy - (py0 - AY) * slot.scale];
}

/**
 * A pose between two gestures at a place: the skeleton blended by the approved rig's blend(), its
 * anchor moving evenly between the two gestures' press-preserving anchors (so the press point
 * stays put and nothing jumps where the rig switches a non-blendable part at the middle).
 */
export function blendedPose(slot, fromGesture, toGesture, v) {
  const a = skeletonOf(fromGesture), b = skeletonOf(toGesture);
  if (v <= 0) return { sk: a, at: poseAt(slot, a) };
  if (v >= 1) return { sk: b, at: poseAt(slot, b) };
  return { sk: blend(a, b, v), at: lerp2(poseAt(slot, a), poseAt(slot, b), v) };
}

/**
 * One crew figure as composition items: its body and, where the skeleton has them, its front
 * parts, each { z, svg } in scene units. character: c1..c9; outfit: crew | gown | prison;
 * at: the figure's anchor; scale and mirror: the place's; offset: [dx, dy] of its art only.
 */
export function figureItems({ character, sk, outfit = 'crew', at, scale, mirror = false, depth, prefix, offset = [0, 0], opacity = 1 }) {
  const c = CREW[character];
  if (!c) throw new Error(`No crew character ${character}`);
  const left = at[0] - (AX - BX) * scale + offset[0];
  const top = at[1] - (AY - BY) * scale + offset[1];
  const ox = (AX - BX) * scale;
  const transform = `translate(${f(left)} ${f(top)})${mirror ? ` translate(${f(ox)} 0) scale(-1 1) translate(${f(-ox)} 0)` : ''}`;
  const wrap = (layer, id) => `<g transform="${transform}"${opacity < 1 ? ` opacity="${f(opacity)}"` : ''}>${placeSvg(dressedFigureSvg(c, sk, { outfit, prefix: `${prefix}${id}`, layer }), { x: 0, y: 0, width: BOX * scale, height: BOX * scale })}</g>`;
  const items = [{ z: Math.round(depth) * 2, svg: wrap('body', 'b'), kind: 'figure' }];
  if ((sk.front ?? []).length) items.push({ z: 1500 + Math.round(depth), svg: wrap('front', 'f'), kind: 'figure-front' });
  return items;
}

/** A scene picture (an approved exported SVG) as an <image> over the whole scene. */
export const scenePicture = (href, z) => ({ z, svg: `<image href="${href}" x="0" y="0" width="1024" height="768" preserveAspectRatio="none"/>`, kind: 'scene' });

/** Items sorted by z (stable), joined. */
export const compose = items => [...items].map((item, i) => ({ ...item, i })).sort((a, b) => a.z - b.z || a.i - b.i).map(item => item.svg).join('');

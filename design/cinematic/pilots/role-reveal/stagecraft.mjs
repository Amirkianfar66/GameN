// mothership:dev-only
//
// The role films' stagecraft, shared by every film's panels (docs/design/cinematic/role-reveal.md,
// "The look"): the 2.5D shot, the floor and its contact shadows, a hanging lamp, a desk lamp,
// breathing, figures lit from behind as navy silhouettes, and the player's own character, the one
// figure in colour, inked with a bold outline. Every panel is drawn for a nominal 828 x 480 panel and
// scaled to its height by shot(); keep what matters between x 80 and 748, which every phone shows.

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, lightCone, lightPool } from '../../lib/comic.mjs';
import { clamp01, easeInOutCubic } from '../../lib/ease.mjs';
import { figureItems } from '../../lib/scene.mjs';
import { NIGHT, rimLit } from './art.mjs';

const f = v => Number((+v).toFixed(2));

/** The panel's nominal drawing size: content is drawn in these units and scaled to the panel. */
export const NOMINAL = Object.freeze([828, 480]);

/**
 * The panel's content scaled from the nominal 828 x 480 to its height and centred, shot as an
 * animated comic: three layers under a slow push toward `focus`, the far one moving least (2.5D).
 * The push follows the panel's local time, so reduced motion's still holds it at rest.
 */
export function shot(w, h, { far = '', middle = '', near = '' }, { local, focus = [414, 300], push = 0.05 }) {
  const k = h / NOMINAL[1];
  const p = easeInOutCubic(clamp01(local / 5200));
  const layer = (depth, body) => {
    const s = 1 + push * depth * p;
    return `<g transform="translate(${f(focus[0])} ${f(focus[1])}) scale(${f(s)}) translate(${f(-focus[0])} ${f(-focus[1])})">${body}</g>`;
  };
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)}) scale(${f(k)}) translate(${f(-NOMINAL[0] / 2)} ${f(-NOMINAL[1] / 2)})">${layer(0.4, far)}${layer(1, middle)}${layer(1.5, near)}</g>`;
}

/** A soft contact shadow under a thing standing on the floor (at y). */
export const contact = (cx, w, y = 446) => `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w / 2)}" ry="9" fill="${NIGHT.deep}" opacity="0.65"/>`;

/** The floor from y down: a lit edge where the wall meets it, halftone in the dark. */
export function floor(prefix, { y = 438, color = '#0B1019' } = {}) {
  const root = prefix.split('-p')[0];
  return `<rect x="0" y="${f(y)}" width="${NOMINAL[0]}" height="${f(NOMINAL[1] - y)}" fill="${color}"/>`
    + `<rect x="0" y="${f(y)}" width="${NOMINAL[0]}" height="${f(NOMINAL[1] - y)}" fill="url(#${root}-dots)" opacity="0.3"/>`
    + `<path d="M0 ${f(y + 1)}H${NOMINAL[0]}" stroke="${NIGHT.steelLit}" stroke-width="2.5" opacity="0.7"/>`;
}

/** Breathing, for a figure lying, sitting or standing still: a slow swell of its body about `pivot` (full motion only). */
export const breathe = (t, pivot, phase = 0, amount = 0.025) => `translate(${f(pivot[0])} ${f(pivot[1])}) scale(1 ${f(1 + amount * Math.sin(t / 620 + phase))}) translate(${f(-pivot[0])} ${f(-pivot[1])})`;

/** A hanging lamp on its cord, its cone of light down to `floor`, swaying `swing` degrees from the ceiling. */
export function hangingLamp(prefix, { x, y, floor: to, on = 1, swing = 0 }) {
  return `<g transform="rotate(${f(swing)} ${f(x)} 0)">`
    + lightCone(prefix, 'hang', { from: [x, y + 22], to: [x, to], spread: 210, color: '#FFE7A3', opacity: 0.3 * on, near: 34 })
    + `<path d="M${f(x)} 0V${f(y)}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${f(x - 46)} ${f(y + 26)}L${f(x - 18)} ${f(y)}H${f(x + 18)}L${f(x + 46)} ${f(y + 26)}Z" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y + 27)}" rx="30" ry="7" fill="#FFF3C4" opacity="${f(0.5 + 0.5 * on)}"/>`
    + lightPool(prefix, 'hang-bulb', { cx: x, cy: y + 30, rx: 90, ry: 50, color: '#FFE7A3', opacity: 0.5 * on })
    + `</g>`;
}

/**
 * A desk lamp standing at (x, y) (its foot), its shade at the end of a jointed arm leaning toward
 * `toward` (-1 left, 1 right), throwing a cone of light down to `floor` and a pool where it lands.
 */
export function deskLamp(prefix, { x, y, toward = 1, floor: to, on = 1, reach = 90, spread = 230 }) {
  const id = `desk-${Math.round(x)}`;
  const elbow = [x - 18 * toward, y - 96], head = [x + reach * toward, y - 132];
  const mouth = [head[0] + 16 * toward, head[1] + 22];
  return lightCone(prefix, id, { from: mouth, to: [mouth[0] + 36 * toward, to], spread, color: '#FFE7A3', opacity: 0.34 * on, near: 26 })
    + lightPool(prefix, `${id}-land`, { cx: mouth[0] + 40 * toward, cy: to, rx: spread * 0.62, ry: 34, color: '#FFE7A3', opacity: 0.28 * on })
    + `<ellipse cx="${f(x)}" cy="${f(y)}" rx="34" ry="9" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${f(x)} ${f(y - 4)}L${f(elbow[0])} ${f(elbow[1])}L${f(head[0])} ${f(head[1])}" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M${f(x)} ${f(y - 4)}L${f(elbow[0])} ${f(elbow[1])}L${f(head[0])} ${f(head[1])}" fill="none" stroke="${NIGHT.steelLit}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<g transform="rotate(${f(28 * toward)} ${f(head[0])} ${f(head[1])})"><path d="M${f(head[0] - 26)} ${f(head[1] + 26)}L${f(head[0] - 12)} ${f(head[1] - 6)}H${f(head[0] + 12)}L${f(head[0] + 26)} ${f(head[1] + 26)}Z" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<ellipse cx="${f(head[0])}" cy="${f(head[1] + 27)}" rx="20" ry="5" fill="#FFF3C4" opacity="${f(0.5 + 0.5 * on)}"/></g>`
    + lightPool(prefix, `${id}-bulb`, { cx: mouth[0], cy: mouth[1], rx: 70, ry: 44, color: '#FFE7A3', opacity: 0.45 * on });
}

/**
 * A crew figure in any pose (a gesture name or a skeleton) as a navy silhouette with a paper rim
 * light toward the light (any character: the silhouette shows none), optionally mirrored and
 * rotated about its feet. Every figure but the player's own is drawn so: no face, number or name.
 */
export function silhouette(prefix, { gesture, sk, at, scale, rotate = 0, rim = [-4, -4], mirror = false }) {
  const root = prefix.split('-p')[0];
  const skeleton = sk ?? skeletonOf(gesture);
  const draw = id => {
    const svg = figureItems({ character: 'c1', sk: skeleton, at, scale, depth: 1, prefix: `${prefix}-${id}`, ...(mirror ? { mirror: true } : {}) }).map(item => item.svg).join('');
    return rotate ? `<g transform="rotate(${f(rotate)} ${f(at[0])} ${f(at[1])})">${svg}</g>` : svg;
  };
  return rimLit(root, { figure: draw('f'), rimFigure: draw('r'), offset: rim });
}

/**
 * The player's own crew character, the one figure in colour: a paper rim light behind it, then the
 * figure itself under the noir light, inked with a bold outline (art.mjs revealDefs).
 */
export function hero(prefix, { character, sk, at, scale, mirror = false, rim = [-5, -4] }) {
  const root = prefix.split('-p')[0];
  const drawn = id => figureItems({ character, sk, at, scale, depth: 2, prefix: `${prefix}-${id}`, ...(mirror ? { mirror: true } : {}) }).map(item => item.svg).join('');
  return `<g filter="url(#${root}-rim)" opacity="0.9" transform="translate(${f(rim[0])} ${f(rim[1])})">${drawn('rim')}</g>`
    + `<g filter="url(#${root}-outline)"><g filter="url(#${root}-noir)">${drawn('dr')}</g></g>`;
}

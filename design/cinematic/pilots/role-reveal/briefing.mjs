// mothership:dev-only
//
// The role films' opener (the owner, 6 November 2026: "a first part that shows the person became the
// Doctor: the character, before boarding the spaceship, picks up the Hospital gadget from a table
// where the Doctor card lies"). The briefing room at the dock, at night, before boarding:
//   - through a tall viewport, the Mothership waits at its dock under the stars (Pilot 2's ship);
//   - the slats' light falls across a steel desk, a desk lamp pools on the role card lying face up,
//     and the role's own gadget lies beside it (the role card's device, without the hand);
//   - the player's own character reaches, takes the gadget and raises it into the light: the moment
//     they become the role. The lamp and a glint catch it.
// Every role shares this scene and its timing (./film.mjs); only the card's name, its picture and the
// gadget are the role's. The character is the player's own (public in the lobby, drawn on their own
// phone only); nobody else appears. Pure string builders.

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { blend } from '../../../board-motion/figures/motion.mjs';
import { INK, PAPER, AMBER, lightCone, lightPool, stars } from '../../lib/comic.mjs';
import { lerp } from '../../lib/ease.mjs';
import { lettering } from '../../lib/lettering.mjs';
import { figureItems, scopeIds } from '../../lib/scene.mjs';
import { shipSvg } from '../blackhole/art.mjs';
import { NIGHT, unaccented } from './art.mjs';

const f = v => Number((+v).toFixed(2));
const [AX, AY] = [62, 233]; // the rig's anchor (design/board-motion/figures/body.mjs FRAME.anchor)
/** The character's size on the page: the head at 42% of the page, the desk's top at about 65%. */
const scaleFor = height => (height * 0.235) / 102;

/** A copy of the standing skeleton with the near arm moved: the rig blends between such poses. */
const withNearArm = (base, { eN, wN, handN }) => ({ ...base, eN, wN, handN, order: ['legF', 'legN', 'neck', 'torso', 'armF', 'head', 'armN'] });

/** The three poses of the pickup: standing, reaching to the desk, the gadget raised into the light. */
export const POSES = Object.freeze({
  stand: skeletonOf('stand'),
  reach: withNearArm(skeletonOf('stand'), { eN: [108, 100], wN: [128, 126], handN: { angle: 70 } }),
  grip: withNearArm(skeletonOf('stand'), { eN: [108, 100], wN: [128, 126], handN: { angle: 70, type: 'fist' } }),
  raise: withNearArm(skeletonOf('stand'), { eN: [110, 92], wN: [104, 58], handN: { angle: -80, type: 'fist' } }),
});

/** The pose at the opener's progress: reach 0..1, grip (boolean), raise 0..1. */
export function pickupPose({ reach, grip, raise }) {
  if (raise > 0) return blend(POSES.grip, POSES.raise, raise);
  return blend(POSES.stand, grip ? POSES.grip : POSES.reach, reach);
}

/** Where the page puts the room: the viewport, the desk, the character, the card and the gadget's spot. */
export function briefingLayout(width, height) {
  const scale = scaleFor(height);
  const ay = height * 0.42 + 197 * scale; // the character's feet (behind the desk)
  const deskTop = ay - 95 * scale;
  const at = [width / 2 - 30, ay];
  return {
    scale,
    window: { x: 54, y: height * 0.05, w: width - 108, h: height * 0.52 },
    deskTop,
    deskFront: Math.min(height * 0.9, deskTop + height * 0.22),
    at,
    card: { x: width * 0.17, y: deskTop + 12, w: 220, h: 138 },
    // The gadget stands on its handle where the reaching hand meets it.
    rest: onPage(at, scale, [128, 130]),
  };
}

/** A rig point (the skeleton's own units) on the page. */
export const onPage = (at, scale, [x, y]) => [at[0] + (x - AX) * scale, at[1] + (y - AY) * scale];

/** The viewport and the Mothership at its dock, under the stars, the blinds half open. */
function viewportSvg(prefix, { x, y, w, h, t }) {
  const id = `${prefix}-bvp`;
  const ship = 1.08;
  const sx = x + w * 0.12, sy = y + h * 0.36;
  let blinds = '';
  for (let by = y + 18; by < y + h * 0.32; by += 30) blinds += `<rect x="${f(x + 10)}" y="${f(by)}" width="${f(w - 20)}" height="16" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="2.5"/>`;
  return `<defs><clipPath id="${id}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="34"/></clipPath></defs>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="34" fill="#04050A"/>`
    + `<g clip-path="url(#${id})">${stars({ x, y, w, h, count: 120, seed: 91, t })}`
    // The dock: a gantry and the boarding tube reaching to the ship's hull.
    + `<rect x="${f(x)}" y="${f(sy + 210 * ship * 0.62)}" width="${f(w)}" height="${f(h)}" fill="#0B0F18"/>`
    + `<path d="M${f(x)} ${f(sy + 120)}H${f(sx + 60)}" stroke="${NIGHT.steel}" stroke-width="26"/><path d="M${f(x)} ${f(sy + 120)}H${f(sx + 60)}" stroke="${INK}" stroke-width="4" stroke-dasharray="3 22"/>`
    + `<g transform="translate(${f(sx)} ${f(sy)}) scale(${ship})">${shipSvg(`${prefix}-ship`, { engine: 0.15, lights: 0.6 + 0.4 * Math.sin(t / 420) ** 2 })}</g>`
    + `${blinds}</g>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="34" fill="none" stroke="${NIGHT.steel}" stroke-width="16"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="34" fill="none" stroke="${INK}" stroke-width="6"/>`;
}

/** The role card lying face up on the desk: the role's device picture and its name, under the lamp. */
function cardSvg(prefix, { x, y, w, h, name, deviceHref }) {
  const size = Math.min(26, (w - 30) / (name.length * 0.82));
  return `<g data-part="card" transform="translate(${f(x)} ${f(y)}) skewX(-16) rotate(-4)">`
    + `<rect x="6" y="8" width="${w}" height="${h}" rx="8" fill="${NIGHT.deep}" opacity="0.6"/>`
    + `<rect width="${w}" height="${h}" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="10" y="10" width="${f(h - 20)}" height="${f(h - 20)}" rx="6" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="3"/>`
    + `<image href="${deviceHref}" x="16" y="12" width="${f((h - 26) * 120 / 140)}" height="${f(h - 26)}" preserveAspectRatio="none"/>`
    + lettering(name, { x: f(h + (w - h) / 2 - 4), y: f(h / 2), size, skew: 0, fill: AMBER, tracking: 1.2 })
    + `</g>`;
}

/** The desk lamp: a gooseneck with a warm cone on the card. */
function lampSvg(prefix, { x, y, card, on }) {
  const head = [x + 70, y - 168];
  return `<path d="M${f(x)} ${f(y)}V${f(y - 120)}Q${f(x)} ${f(y - 172)} ${f(head[0] - 14)} ${f(head[1] + 6)}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y)}" rx="44" ry="12" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(head[0] - 34)} ${f(head[1] - 14)}L${f(head[0] + 30)} ${f(head[1] - 20)}L${f(head[0] + 22)} ${f(head[1] + 20)}L${f(head[0] - 26)} ${f(head[1] + 16)}Z" fill="#2B3A2E" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + lightCone(prefix, 'lamp', { from: [head[0], head[1] + 18], to: [card.x + card.w * 0.55, card.y + card.h * 0.6], spread: 150, color: '#FFE7A3', opacity: 0.42 * on, near: 20 })
    + lightPool(prefix, 'lamp-pool', { cx: card.x + card.w * 0.5, cy: card.y + card.h * 0.55, rx: 190, ry: 70, color: '#FFE7A3', opacity: 0.36 * on });
}

/** The desk: a steel top in perspective and its front panel, which hides the character's legs. */
function deskSvg(prefix, { width, top, front }) {
  return `<path d="M30 ${f(top)}L${f(width - 30)} ${f(top)}L${f(width)} ${f(top + 70)}L0 ${f(top + 70)}Z" fill="#3A4A6B" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M30 ${f(top)}L${f(width - 30)} ${f(top)}L${f(width)} ${f(top + 70)}L0 ${f(top + 70)}Z" fill="url(#${prefix}-dots)" opacity="0.18"/>`
    + `<rect x="0" y="${f(top + 70)}" width="${width}" height="${f(front - top - 70)}" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="0" y="${f(top + 70)}" width="${width}" height="${f(front - top - 70)}" fill="url(#${prefix}-dots)" opacity="0.32"/>`
    + `<path d="M0 ${f(top + 70)}H${width}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.4"/>`
    // Two drawers with their pulls, and a kick plate: a briefing-room desk, not a slab.
    + [0.08, 0.56].map(x => `<rect x="${f(width * x)}" y="${f(top + 104)}" width="${f(width * 0.36)}" height="${f((front - top - 140) * 0.42)}" rx="8" fill="none" stroke="${INK}" stroke-width="4" opacity="0.8"/>`
      + `<rect x="${f(width * (x + 0.14))}" y="${f(top + 104 + (front - top - 140) * 0.18)}" width="${f(width * 0.08)}" height="12" rx="6" fill="${NIGHT.steel}" stroke="${INK}" stroke-width="3"/>`).join('')
    + `<rect x="0" y="${f(front - 26)}" width="${width}" height="26" fill="${INK}" opacity="0.6"/>`;
}

/**
 * The gadget (the device alone, 120 x 140, its grip at `grip`) at a point, turned by `rotate`, with a
 * glint. Its team accent is taken out (art.mjs unaccented()): every role's gadget catches the room's light.
 */
function gadgetSvg(prefix, { svg, grip, at, scale, rotate, glint }) {
  const view = 'viewBox="0 0 120 140"';
  const inner = scopeIds(unaccented(svg).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), `${prefix}-gadget`);
  const body = `<svg x="${f(-grip[0] * scale)}" y="${f(-grip[1] * scale)}" width="${f(120 * scale)}" height="${f(140 * scale)}" ${view} overflow="visible">${inner}</svg>`;
  return `<g data-part="gadget" transform="translate(${f(at[0])} ${f(at[1])}) rotate(${f(rotate)})">${body}</g>`
    + (glint > 0 ? lightPool(prefix, 'glint', { cx: at[0], cy: at[1] - 40 * scale, rx: 90, ry: 90, color: '#FFF3C4', opacity: 0.5 * glint })
      + `<path d="M${f(at[0])} ${f(at[1] - 40 * scale - 46 * glint)}L${f(at[0] + 6)} ${f(at[1] - 40 * scale - 6)}L${f(at[0] + 46 * glint)} ${f(at[1] - 40 * scale)}L${f(at[0] + 6)} ${f(at[1] - 40 * scale + 6)}L${f(at[0])} ${f(at[1] - 40 * scale + 46 * glint)}L${f(at[0] - 6)} ${f(at[1] - 40 * scale + 6)}L${f(at[0] - 46 * glint)} ${f(at[1] - 40 * scale)}L${f(at[0] - 6)} ${f(at[1] - 40 * scale - 6)}Z" fill="#FFFFFF" opacity="${f(0.9 * glint)}"/>` : '');
}

/**
 * The opener at its frame (./film.mjs opener: fade, reach, grip, raise, glint, push, lamp): the room,
 * the player's own character and the role's gadget. character: c1..c9; gadget: the role's device
 * alone (art.mjs deviceOnly()), grip its hold point; deviceHref the held picture for the card.
 */
export function briefingSvg(prefix, { width, height, opener, name, character, gadget, grip, deviceHref, t = 0 }) {
  const L = briefingLayout(width, height);
  const pose = pickupPose(opener);
  const wrist = onPage(L.at, L.scale, pose.wN);
  const gadgetAt = opener.grip ? [wrist[0], wrist[1] + 4] : L.rest;
  const drawn = id => figureItems({ character, sk: pose, at: L.at, scale: L.scale, depth: 2, prefix: `${prefix}-${id}` }).map(item => item.svg).join('');
  const room = `<rect width="${width}" height="${f(height)}" fill="${NIGHT.wall}"/>`
    + viewportSvg(prefix, { ...L.window, t })
    // The slats' light falls from the viewport across the room and the desk.
    + [0, 1, 2, 3].map(i => `<polygon points="${f(120 + i * 150)},${f(L.window.y + L.window.h)} ${f(190 + i * 150)},${f(L.window.y + L.window.h)} ${f(520 + i * 150)},${f(height)} ${f(400 + i * 150)},${f(height)}" fill="${NIGHT.slat}" opacity="${f(0.07 * opener.slats)}" style="mix-blend-mode:screen"/>`).join('');
  // The character in noir light: a paper rim behind, the figure darkened, the lamp and the slats on it.
  const who = `<g filter="url(#${prefix}-rim)" opacity="${f(0.75 * opener.slats)}" transform="translate(-5 -4)">${drawn('rimwho')}</g>`
    + `<g filter="url(#${prefix}-noir)">${drawn('who')}</g>`
    // The slats' light falls across the character too: noir bands, faint.
    + [0, 1, 2].map(i => `<polygon points="${f(250 + i * 130)},${f(L.window.y + L.window.h * 0.55)} ${f(300 + i * 130)},${f(L.window.y + L.window.h * 0.55)} ${f(420 + i * 130)},${f(L.deskTop)} ${f(360 + i * 130)},${f(L.deskTop)}" fill="${NIGHT.slat}" opacity="${f(0.06 * opener.slats)}" style="mix-blend-mode:screen"/>`).join('');
  const scene = room + who
    + deskSvg(prefix, { width, top: L.deskTop, front: L.deskFront })
    + lampSvg(prefix, { x: L.card.x - 54, y: L.deskTop + 28, card: L.card, on: opener.lamp })
    + cardSvg(prefix, { ...L.card, name, deviceHref })
    + gadgetSvg(prefix, { svg: gadget, grip, at: gadgetAt, scale: L.scale * 0.5, rotate: 0, glint: opener.glint })
    + `<rect x="0" y="${f(L.deskFront)}" width="${width}" height="${f(height - L.deskFront)}" fill="${NIGHT.deep}"/>`;
  const push = lerp(1, 1.05, opener.push);
  const focus = [width / 2, L.deskTop - 160];
  return `<g opacity="${f(opener.fade)}" transform="translate(${f(focus[0])} ${f(focus[1])}) scale(${f(push)}) translate(${f(-focus[0])} ${f(-focus[1])})">${scene}</g>`;
}

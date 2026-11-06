// mothership:dev-only
//
// The role films' opener (the owner, 6 November 2026: "a first part that shows the person became the
// Doctor: the character, before boarding the spaceship, picks up the Hospital gadget from a table
// where the Doctor card lies"). The briefing room at the dock, at night, before boarding:
//   - through a tall viewport, the Mothership waits at its dock under the stars (Pilot 2's ship);
//   - the player's own role card stands on the desk in its holder, drawn as the phone draws it (the
//     owner's review: it must match the card, and nothing on it is turned but what the card turns):
//     their portrait, the role's held device, the role's name and team line. A desk lamp pools on it,
//     and the role's gadget stands beside it on the desk;
//   - the player's own character leans in, takes the gadget and raises it into the light: the moment
//     they become the role. The lamp and a glint catch it.
// Drawn as an animated comic: the room in two layers for the camera's push (the wall and viewport far,
// the character and desk near), light falling in beams through the air, and dust turning in it (full
// motion only). Every role shares this scene and its timing (./film.mjs); only the card's name, team
// and device and the gadget are the role's. The character is the player's own (public in the lobby,
// drawn on their own phone only); nobody else appears. Pure string builders.

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { blend } from '../../../board-motion/figures/motion.mjs';
import { INK, PAPER, lightCone, lightPool, stars } from '../../lib/comic.mjs';
import { lerp } from '../../lib/ease.mjs';
import { lettering, measure } from '../../lib/lettering.mjs';
import { figureItems, scopeIds } from '../../lib/scene.mjs';
import { shipSvg } from '../blackhole/art.mjs';
import { NIGHT, beamSvg, motes, unaccented } from './art.mjs';

const f = v => Number((+v).toFixed(2));
const [AX, AY] = [62, 233]; // the rig's anchor (design/board-motion/figures/body.mjs FRAME.anchor)
/** The character's size on the page: the head at 42% of the page, the desk's top at about 65%. */
const scaleFor = height => (height * 0.235) / 102;

/** The role card's proportions (the phone's .j-rolecard): the art 5 : 4.6, then the plate. */
export const CARD = Object.freeze({ art: 4.6 / 5, plate: 0.46 });
/** The card's paper (design tokens 0.4.0: paperShade, paperDeep). */
const PAPER_SHADE = '#E3D6C2', PAPER_DEEP = '#CBBBA2';

const STAND = skeletonOf('stand');
/** A copy of the standing skeleton with the near arm moved, and the head and neck leaning with it. */
const withNearArm = (base, { eN, wN, handN }, { head, neck, tilt } = {}) => ({
  ...base, eN, wN, handN,
  ...(head ? { head } : {}), ...(neck ? { neck } : {}), ...(tilt === undefined ? {} : { tilt }),
  order: ['legF', 'legN', 'neck', 'torso', 'armF', 'head', 'armN'],
});
/** Leaning to the desk: the head forward over the gadget and turned to it. */
const LEAN = { head: [STAND.head[0] + 6, STAND.head[1] + 5], neck: [STAND.neck[0] + 3, STAND.neck[1] + 2], tilt: 10 };

/** The three poses of the pickup: standing, reaching to the desk (leaning in), the gadget raised and looked at. */
export const POSES = Object.freeze({
  stand: STAND,
  reach: withNearArm(STAND, { eN: [108, 100], wN: [128, 126], handN: { angle: 70 } }, LEAN),
  grip: withNearArm(STAND, { eN: [108, 100], wN: [128, 126], handN: { angle: 70, type: 'fist' } }, LEAN),
  raise: withNearArm(STAND, { eN: [110, 92], wN: [104, 58], handN: { angle: -80, type: 'fist' } }, { head: [STAND.head[0] + 3, STAND.head[1] - 1], tilt: -6 }),
});

/** The pose at the opener's progress: reach 0..1, grip (boolean), raise 0..1. */
export function pickupPose({ reach, grip, raise }) {
  if (raise > 0) return blend(POSES.grip, POSES.raise, raise);
  return blend(POSES.stand, grip ? POSES.grip : POSES.reach, reach);
}

/** A rig point (the skeleton's own units) on the page. */
export const onPage = (at, scale, [x, y]) => [at[0] + (x - AX) * scale, at[1] + (y - AY) * scale];

/** Where the page puts the room: the viewport, the desk, the character, the card, the lamp and the gadget's spot. */
export function briefingLayout(width, height) {
  const scale = scaleFor(height);
  const ay = height * 0.42 + 197 * scale; // the character's feet (behind the desk)
  const deskTop = ay - 95 * scale;
  const at = [width / 2 - 30, ay];
  const cardW = 47 * scale, cardH = cardW * (CARD.art + CARD.plate);
  const base = deskTop + 44; // where the card's holder stands on the desk's top
  return {
    scale,
    window: { x: 54, y: height * 0.05, w: width - 108, h: height * 0.52 },
    deskTop,
    deskFront: Math.min(height * 0.9, deskTop + height * 0.22),
    at,
    card: { x: 24, y: base - 4 * scale - cardH, w: cardW, h: cardH, base },
    // The lamp stands behind the card, its neck rising past the card's shoulder and bending over it.
    lamp: { x: 24 + cardW * 0.84, y: base - 8 },
    // The gadget stands on its handle where the reaching hand meets it.
    rest: onPage(at, scale, [128, 130]),
  };
}

/**
 * Where the raised gadget's glint sits on the page at the opener's camera push (0..1): the memory
 * flash swells out of it (compose.mjs).
 */
export function glintOnPage(width, height, push = 1) {
  const L = briefingLayout(width, height);
  const wrist = onPage(L.at, L.scale, POSES.raise.wN);
  const point = [wrist[0], wrist[1] + 4 - 40 * L.scale * 0.5];
  const focus = [width / 2, L.deskTop - 160], k = lerp(1, 1.065, push);
  return [focus[0] + (point[0] - focus[0]) * k, focus[1] + (point[1] - focus[1]) * k];
}

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

/**
 * The player's own role card, as the phone draws it (the v1 phone's .j-rolecard front): the art, its
 * paper with halftone, their portrait turned -2.5° as the card turns it, the role's held device off the
 * lower right; the plate with the role's name and the team line (the swatch is the team's own colour,
 * small, as on the card). Upright and straight. lamp 0..1: the lamp's warm light on it.
 */
function cardSvg(prefix, { x, y, w, name, team, teamColour, deviceHref, portraitHref, lamp }) {
  const id = `${prefix}-card`;
  const artH = w * CARD.art, plateH = w * CARD.plate, h = artH + plateH;
  const r = w * 0.05, b = Math.max(3, w * 0.022);
  const pw = w * 0.62, ph = (pw * 96) / 84, px = w * 0.09, py = artH * 0.07;
  const dw = w * 0.66, dh = (dw * 140) / 120, dx = w * 1.06 - dw, dy = artH * 1.1 - dh;
  const pad = w * 0.075;
  const nameSize = Math.min(w * 0.12, ((w - 2 * pad) * 6) / measure(name, 1.1));
  const nameW = (measure(name, 1.1) * nameSize) / 6;
  const teamLine = team === 'Alien' ? 'ALIEN' : `${team.toUpperCase()} TEAM`;
  const teamSize = w * 0.05, sw = teamSize * 1.3;
  const teamW = (measure(teamLine, 1.3) * teamSize) / 6;
  const ink = (text, cx, cy, size, tracking) => lettering(text, { x: cx, y: cy, size, fill: INK, ink: INK, inkWeight: 0.05, highlight: INK, shadow: null, skew: 0, tracking, weight: 1.2 });
  return `<g data-part="card" transform="translate(${f(x)} ${f(y)})">`
    + `<defs><clipPath id="${id}-art"><path d="M${f(b / 2)} ${f(artH)}V${f(r)}Q${f(b / 2)} ${f(b / 2)} ${f(r)} ${f(b / 2)}H${f(w - r)}Q${f(w - b / 2)} ${f(b / 2)} ${f(w - b / 2)} ${f(r)}V${f(artH)}Z"/></clipPath>`
    + `<pattern id="${id}-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${PAPER_DEEP}"/></pattern>`
    + `<linearGradient id="${id}-lit" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFE7A3" stop-opacity="${f(0.26 * lamp)}"/><stop offset="0.55" stop-color="#FFE7A3" stop-opacity="0"/><stop offset="1" stop-color="${NIGHT.deep}" stop-opacity="0.3"/></linearGradient></defs>`
    // The card's hard comic shadow, then the card.
    + `<rect x="${f(w * 0.035)}" y="${f(w * 0.04)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${NIGHT.steelShadow}"/>`
    + `<rect width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${PAPER}"/>`
    + `<g clip-path="url(#${id}-art)"><rect width="${f(w)}" height="${f(artH)}" fill="${PAPER_SHADE}"/><rect width="${f(w)}" height="${f(artH)}" fill="url(#${id}-dots)"/>`
    + `<g transform="rotate(-2.5 ${f(px + pw / 2)} ${f(py + ph / 2)})"><image href="${portraitHref}" x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" preserveAspectRatio="none"/></g>`
    + `<image href="${deviceHref}" x="${f(dx)}" y="${f(dy)}" width="${f(dw)}" height="${f(dh)}" preserveAspectRatio="none"/></g>`
    + `<path d="M0 ${f(artH)}H${f(w)}" stroke="${INK}" stroke-width="${f(b)}"/>`
    + ink(name, pad + nameW / 2, artH + plateH * 0.36, nameSize, 1.1)
    + `<rect data-part="team-swatch" x="${f(pad)}" y="${f(artH + plateH * 0.7 - sw / 2)}" width="${f(sw)}" height="${f(sw)}" fill="${teamColour}" stroke="${INK}" stroke-width="${f(b * 0.6)}"/>`
    + ink(teamLine, pad + sw * 1.5 + teamW / 2, artH + plateH * 0.7, teamSize, 1.3)
    + `<rect width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="url(#${id}-lit)"/>`
    + `<rect width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="none" stroke="${INK}" stroke-width="${f(b)}"/>`
    + `</g>`;
}

/** The card's holder: a steel foot on the desk and a clip over the card's lower edge, with its shadow. */
function holderSvg({ x, w, y, h, base }, front) {
  const cx = x + w / 2;
  if (front) return `<rect x="${f(cx - w * 0.12)}" y="${f(y + h - w * 0.05)}" width="${f(w * 0.24)}" height="${f(w * 0.09)}" rx="4" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${f(cx - w * 0.1)} ${f(y + h - w * 0.035)}H${f(cx + w * 0.1)}" stroke="${NIGHT.steelPale}" stroke-width="2" opacity="0.8"/>`;
  return `<ellipse cx="${f(cx + 6)}" cy="${f(base + 2)}" rx="${f(w * 0.46)}" ry="9" fill="${NIGHT.deep}" opacity="0.55"/>`
    + `<path d="M${f(cx - w * 0.3)} ${f(base)}L${f(cx - w * 0.2)} ${f(y + h - 4)}H${f(cx + w * 0.2)}L${f(cx + w * 0.3)} ${f(base)}Z" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
}

/**
 * The desk lamp: a gooseneck from behind the card, bent over it, its warm cone on the card's face.
 * part 'back' (the foot and the neck, behind the card) or 'front' (the shade, the bulb and its light).
 */
function lampSvg(prefix, { x, y, card, on, scale, t, reduced }, part) {
  const k = scale / 4.49; // proportions drawn at the 390 x 844 page
  const top = card.y - 40 * k;
  const head = [card.x + card.w * 0.52, card.y - 46 * k];
  const shade = [[head[0] - 34 * k, head[1] - 12 * k], [head[0] + 30 * k, head[1] - 22 * k], [head[0] + 24 * k, head[1] + 16 * k], [head[0] - 28 * k, head[1] + 18 * k]];
  const bulb = [head[0] - 4 * k, head[1] + 16 * k];
  const target = [card.x + card.w * 0.5, card.y + card.h * 0.42];
  const neck = `M${f(x)} ${f(y)}V${f(top)}Q${f(x)} ${f(top - 70 * k)} ${f(head[0] + 26 * k)} ${f(head[1] - 16 * k)}`;
  if (part === 'back') return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(30 * k)}" ry="${f(9 * k)}" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="${neck}" fill="none" stroke="${INK}" stroke-width="${f(10 * k)}" stroke-linecap="round"/>`
    + `<path d="${neck}" fill="none" stroke="${NIGHT.steelLit}" stroke-width="${f(3 * k)}" stroke-linecap="round" opacity="0.7" transform="translate(-2 -2)"/>`;
  return lightCone(prefix, 'lamp', { from: bulb, to: target, spread: card.w * 0.72, color: '#FFE7A3', opacity: 0.34 * on, near: 16 * k })
    + motes({ x: card.x, y: card.y - 30 * k, w: card.w, h: card.h * 0.7, t, count: 12, seed: 47, color: '#FFE7A3', opacity: 0.55 * on, reduced })
    + `<path d="M${shade.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z" fill="#2B3A2E" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M${f(shade[0][0])} ${f(shade[0][1])}L${f(shade[1][0])} ${f(shade[1][1])}" stroke="${NIGHT.steelPale}" stroke-width="2.5" opacity="0.55"/>`
    + `<ellipse cx="${f(bulb[0])}" cy="${f(bulb[1])}" rx="${f(18 * k)}" ry="${f(6 * k)}" fill="#FFF3C4" opacity="${f(0.4 + 0.6 * on)}"/>`
    + lightPool(prefix, 'lamp-bulb', { cx: bulb[0], cy: bulb[1], rx: 60 * k, ry: 34 * k, color: '#FFE7A3', opacity: 0.55 * on });
}

/** The desk: a steel top in perspective and its front panel, which hides the character's legs. */
function deskSvg(prefix, { width, top, front }) {
  return `<path d="M30 ${f(top)}L${f(width - 30)} ${f(top)}L${f(width)} ${f(top + 70)}L0 ${f(top + 70)}Z" fill="#3A4A6B" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M30 ${f(top)}L${f(width - 30)} ${f(top)}L${f(width)} ${f(top + 70)}L0 ${f(top + 70)}Z" fill="url(#${prefix}-dots)" opacity="0.18"/>`
    + `<path d="M30 ${f(top + 2)}H${f(width - 30)}" stroke="${NIGHT.steelPale}" stroke-width="2.5" opacity="0.45"/>`
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
 * the player's own character, their role card and the role's gadget. character: c1..c9; gadget: the
 * role's device alone (art.mjs deviceOnly()), grip its hold point; deviceHref the held picture and
 * portraitHref the character's portrait for the card; team (Blue, Red or Alien) and teamColour its
 * swatch; reduced: no dust (reduced motion).
 */
export function briefingSvg(prefix, { width, height, opener, name, team, teamColour, character, gadget, grip, deviceHref, portraitHref, t = 0, reduced = false }) {
  const L = briefingLayout(width, height);
  const pose = pickupPose(opener);
  const wrist = onPage(L.at, L.scale, pose.wN);
  const gadgetAt = opener.grip ? [wrist[0], wrist[1] + 4] : L.rest;
  const drawn = id => figureItems({ character, sk: pose, at: L.at, scale: L.scale, depth: 2, prefix: `${prefix}-${id}` }).map(item => item.svg).join('');
  const sill = L.window.y + L.window.h;
  // Far: the wall, the viewport and the starlight falling from it through the air, dust turning in it.
  const far = `<rect width="${width}" height="${f(height)}" fill="${NIGHT.wall}"/>`
    + viewportSvg(prefix, { ...L.window, t })
    + [0, 1, 2, 3].map(i => beamSvg(prefix, `slat-${i}`, { points: [[120 + i * 150, sill], [190 + i * 150, sill], [520 + i * 150, height], [400 + i * 150, height]], from: [160 + i * 150, sill], to: [460 + i * 150, height], opacity: 0.16 * opener.slats })).join('')
    + motes({ x: 140, y: sill, w: 560, h: height - sill, t, count: 22, seed: 31, color: NIGHT.slat, opacity: 0.45 * opener.slats, reduced });
  // Near: the character in noir light (a paper rim behind, the figure darkened, the slats across it),
  // the desk, the card in its holder under the lamp, and the gadget.
  const who = `<g filter="url(#${prefix}-rim)" opacity="${f(0.75 * opener.slats)}" transform="translate(-5 -4)">${drawn('rimwho')}</g>`
    + `<g filter="url(#${prefix}-outline)"><g filter="url(#${prefix}-noir)">${drawn('who')}</g></g>`
    + [0, 1, 2].map(i => `<polygon points="${f(250 + i * 130)},${f(L.window.y + L.window.h * 0.55)} ${f(300 + i * 130)},${f(L.window.y + L.window.h * 0.55)} ${f(420 + i * 130)},${f(L.deskTop)} ${f(360 + i * 130)},${f(L.deskTop)}" fill="${NIGHT.slat}" opacity="${f(0.06 * opener.slats)}" style="mix-blend-mode:screen"/>`).join('');
  const near = who
    + deskSvg(prefix, { width, top: L.deskTop, front: L.deskFront })
    + lampSvg(prefix, { ...L.lamp, card: L.card, on: opener.lamp, scale: L.scale, t, reduced }, 'back')
    + holderSvg(L.card, false)
    + cardSvg(prefix, { ...L.card, name, team, teamColour, deviceHref, portraitHref, lamp: opener.lamp })
    + holderSvg(L.card, true)
    + lampSvg(prefix, { ...L.lamp, card: L.card, on: opener.lamp, scale: L.scale, t, reduced }, 'front')
    + gadgetSvg(prefix, { svg: gadget, grip, at: gadgetAt, scale: L.scale * 0.5, rotate: 0, glint: opener.glint })
    + `<rect x="0" y="${f(L.deskFront)}" width="${width}" height="${f(height - L.deskFront)}" fill="${NIGHT.deep}"/>`;
  // The camera's push in depth: the far layer moves less than the near one (2.5D).
  const focus = [width / 2, L.deskTop - 160];
  const cam = (k, body) => `<g transform="translate(${f(focus[0])} ${f(focus[1])}) scale(${f(k)}) translate(${f(-focus[0])} ${f(-focus[1])})">${body}</g>`;
  return `<g opacity="${f(opener.fade)}">${cam(lerp(1, 1.025, opener.push), far)}${cam(lerp(1, 1.065, opener.push), near)}</g>`;
}

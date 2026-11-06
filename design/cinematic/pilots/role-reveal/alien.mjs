// mothership:dev-only
//
// The Alien's three panels (docs/design/cinematic/role-reveal.md, "Alien"): the stowaway from the
// sailors' stories, told around the player's own character:
//   1  a sailors' story (memory, in sepia): old spacers round a lantern, the player's character among
//      them; on the wall behind, their shadows, and the player's shadow is not a human's
//   2  a crew face (memory): the player's character in a lamp's light, their shadow on the wall
//      splitting in two (the Phantom Clone)
//   3  aboard, now: the Blackhole; the cabin's walls give way to space, a blackhole forms and the
//      stars bend toward it (WHOOM), in Pilot 2's art
// What the pictures show: the Alien among the crew, its Clone and its Blackhole; the role card says
// the rules. The light is lantern amber, paper and starlight, never a team colour.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, lightPool, stars } from '../../lib/comic.mjs';
import { beat, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { figureItems } from '../../lib/scene.mjs';
import { blackholeSvg, lensedStars } from '../blackhole/art.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, contact, floor, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The mess's and the cabin's own fills (held clear of the faction accents by the palette test). */
const MESS = Object.freeze({ wall: '#3A3530', wallLit: '#5A5248', crate: '#5E4A34', lantern: '#FFE7A3', shadow: '#15120F', bench: '#4A3B2C' });

/** A figure's shadow cast on the wall: the figure's own shape, flattened dark, stretched up from its feet. */
function castShadow(prefix, { gesture, sk, at, scale, stretch = 1.5, skew = 0, opacity = 0.75 }) {
  const shape = figureItems({ character: 'c1', sk: sk ?? skeletonOf(gesture), at, scale, depth: 1, prefix }).map(item => item.svg).join('');
  return `<g opacity="${f(opacity)}" transform="translate(${f(at[0])} ${f(at[1])}) skewX(${f(skew)}) scale(1 ${f(stretch)}) translate(${f(-at[0])} ${f(-at[1])})"><g filter="url(#${prefix.split('-p')[0]}-sil)">${shape}</g></g>`;
}

/**
 * The shadow that is not a human's, cast where the player's character sits: a long narrow head with
 * a swept crest, a long neck, long thin arms and fingers. `turn` -1..1 tilts the head.
 */
function strangeShadow({ x, y, h, turn = 0, opacity = 0.8 }) {
  const k = h / 300;
  return `<g opacity="${f(opacity)}" transform="translate(${f(x)} ${f(y)}) scale(${f(k)})"><g fill="${MESS.shadow}">`
    + `<path d="M-60 0Q-70 -120 -40 -160Q-20 -186 0 -190Q20 -186 40 -160Q70 -120 60 0Z"/>`
    + `<path d="M-14 -186Q-10 -214 -4 -232H4Q10 -214 14 -186Z"/>`
    + `<g transform="rotate(${f(12 * turn)} 0 -232)"><path d="M0 -232Q-44 -236 -52 -270Q-48 -300 -10 -306Q34 -312 70 -330Q50 -296 40 -270Q30 -238 0 -232Z"/></g>`
    + `<path d="M-56 -150Q-110 -110 -120 -40L-140 -10M-120 -40L-128 -4M-120 -40L-112 -6"  fill="none" stroke="${MESS.shadow}" stroke-width="12" stroke-linecap="round"/>`
    + `<path d="M56 -150Q110 -110 120 -40L140 -10M120 -40L128 -4M120 -40L112 -6" fill="none" stroke="${MESS.shadow}" stroke-width="12" stroke-linecap="round"/>`
    + `</g></g>`;
}

/**
 * Panel 1 (memory): a sailors' story. A ship's mess at night; old spacers sit round a lantern on a
 * crate, the player's character among them. On the wall behind, the lantern throws everyone's
 * shadow, and the player's is not a human's.
 */
export function panelStory(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const on = reduced ? 1 : lampFlicker(t, 19) * 0.3 + 0.7;
  const lantern = [414, 330];
  // The wall, lit from below by the lantern, with a porthole on the stars.
  const far = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${MESS.wall}"/>`
    + `<defs><clipPath id="${prefix}-port"><circle cx="170" cy="96" r="48"/></clipPath></defs>`
    + `<circle cx="170" cy="96" r="48" fill="#060812"/><g clip-path="url(#${prefix}-port)">${stars({ x: 120, y: 46, w: 100, h: 100, count: 16, seed: 163, t })}</g>`
    + `<circle cx="170" cy="96" r="48" fill="none" stroke="${NIGHT.steelLit}" stroke-width="9"/><circle cx="170" cy="96" r="48" fill="none" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'wall', { cx: lantern[0], cy: 260, rx: 420, ry: 260, color: MESS.lantern, opacity: 0.3 * on });
  // The shadows on the wall: the spacers' as their own shapes, the player's as something else.
  // The spacers sit together on the lantern's left; the player's character sits alone on its right.
  const sitters = [{ x: 150, gesture: 'benchHunched' }, { x: 245, gesture: 'floorSit' }, { x: 330, gesture: 'benchHunched' }];
  const me = { x: 560 };
  const turn = reduced ? 0.5 : Math.sin(t / 700);
  const shadows = sitters.map((s, i) => castShadow(`${prefix}-sh${i}`, { gesture: s.gesture, at: [lantern[0] + (s.x - lantern[0]) * 1.4, 300], scale: 1.3, stretch: 1.25, skew: (s.x - lantern[0]) * 0.04, opacity: 0.55 * on })).join('')
    + strangeShadow({ x: lantern[0] + (me.x - lantern[0]) * 1.6, y: 300, h: 270, turn, opacity: 0.72 * on });
  // The spacers, silhouettes, and the player's character, on benches round the crate and its lantern.
  const figures = sitters.map((s, i) => silhouette(`${prefix}-sp${i}`, { gesture: s.gesture, at: [s.x, 470], scale: 1.18, rim: [s.x < lantern[0] ? 4 : -4, -4], mirror: s.x > lantern[0] })).join('');
  const self = hero(prefix, { character, sk: skeletonOf('benchHunched'), at: [me.x, 470], scale: 1.2, mirror: true });
  const crate = contact(lantern[0], 140, 446) + `<rect x="${lantern[0] - 60}" y="360" width="120" height="86" rx="4" fill="${MESS.crate}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${lantern[0] - 56} 364H${lantern[0] + 56}" stroke="${NIGHT.rim}" stroke-width="3" opacity="0.8"/>`;
  const lamp = `<rect x="${lantern[0] - 18}" y="${lantern[1] - 10}" width="36" height="40" rx="6" fill="#FFF3C4" opacity="${f(0.6 + 0.4 * on)}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${lantern[0] - 22} ${lantern[1] - 10}H${lantern[0] + 22}M${lantern[0] - 22} ${lantern[1] + 30}H${lantern[0] + 22}M${lantern[0]} ${lantern[1] - 22}V${lantern[1] - 10}" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'lantern', { cx: lantern[0], cy: lantern[1] + 10, rx: 160, ry: 120, color: MESS.lantern, opacity: 0.55 * on });
  const middle = floor(prefix, { color: '#141210' }) + shadows + figures + crate + lamp
    + (reduced ? self : `<g transform="${breathe(t, [me.x, 470], 0.5, 0.01)}">${self}</g>`);
  const near = motes({ x: 300, y: 160, w: 240, h: 200, t, count: 12, seed: 167, color: MESS.lantern, opacity: 0.5, reduced });
  return shot(w, h, { far, middle, near }, { local: t, focus: [430, 300] });
}

/**
 * Panel 2 (memory): a crew face. The player's character stands in a lamp's light against a wall;
 * their shadow on the wall splits in two, and the second slides away.
 */
export function panelSecond(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const at = [330, 470];
  const far = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${MESS.wallLit}"/>`
    + `<path d="M0 120H${NOMINAL[0]}M0 260H${NOMINAL[0]}" stroke="${INK}" stroke-width="3" opacity="0.4"/>`
    + lightPool(prefix, 'key', { cx: 300, cy: 240, rx: 360, ry: 260, color: MESS.lantern, opacity: 0.32 });
  // The two shadows: one stays at the figure's side; the second slides away from it and stops.
  const split = reduced ? 1 : easeInOutCubic(beat(t, [180, 860]));
  const sk = skeletonOf('stand');
  const shadowAt = dx => castShadow(`${prefix}-cl${dx > 0 ? 'b' : 'a'}`, { sk, at: [at[0] + 90 + dx, at[1] - 8], scale: 1.62, stretch: 1.04, skew: -10, opacity: 0.7 });
  const shadows = shadowAt(0) + (split > 0.02 ? shadowAt(250 * split) : '');
  const self = hero(prefix, { character, sk, at, scale: 1.62 });
  const middle = floor(prefix, { color: '#141210' }) + shadows
    + (reduced ? self : `<g transform="${breathe(t, at, 0.5, 0.008)}">${self}</g>`);
  return shot(w, h, { far, middle, near: '' }, { local: t, focus: [420, 260], push: 0.06 });
}

/** The Blackhole's beats in the panel's own time: the walls part, the hole forms. */
const PART = Object.freeze([60, 520]);
const FORM = Object.freeze([240, 900]);

/**
 * Panel 3 (now, aboard): the Blackhole. The cabin's walls part to space; a blackhole forms at the
 * centre and the stars bend toward it (WHOOM).
 */
export function panelBlackhole(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const cx = 414, cy = 230;
  const form = reduced ? 1 : easeOutCubic(beat(t, FORM));
  const part = reduced ? 1 : easeInOutCubic(beat(t, PART));
  const r = 62 * form;
  const far = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="#05060C"/>`
    + lensedStars({ width: NOMINAL[0], height: NOMINAL[1], cx, cy, rE: 70 * form, count: 160, seed: 171, t: reduced ? 0 : t })
    + blackholeSvg(prefix, { cx, cy, r, spin: reduced ? 0 : t / 900, tilt: 0.24, glow: form });
  // The cabin's walls, sliding apart to either side and away.
  let wallL = '', wallR = '';
  for (let rx = 0; rx < 420; rx += 104) wallL += `<rect x="${rx}" y="0" width="10" height="480" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  for (let rx = 414; rx < NOMINAL[0] + 10; rx += 104) wallR += `<rect x="${rx}" y="0" width="10" height="480" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  const panel = (body, x0, w0, dir) => `<g transform="translate(${f(dir * 470 * part)} 0)" opacity="${f(1 - 0.6 * part)}"><rect x="${x0}" y="0" width="${w0}" height="480" fill="${NIGHT.wall}" stroke="${INK}" stroke-width="5"/>${body}</g>`;
  const walls = part < 1 ? panel(wallL, 0, 414, -1) + panel(wallR, 414, 414, 1) : '';
  const near = walls
    + sfxSvg('WHOOM', { x: 414, y: 420, size: 48, rotate: -4, pop: reduced ? 1 : easeOutBack(beat(t, [FORM[0], FORM[0] + 200]), 1.6), opacity: reduced ? 1 : 1 - beat(t, [FORM[0] + 900, FORM[0] + 1200]) });
  return shot(w, h, { far, middle: '', near }, { local: t, focus: [cx, cy], push: 0.08 });
}

/** The Alien's panels, in order. */
export const ALIEN_PANELS = Object.freeze([panelStory, panelSecond, panelBlackhole]);

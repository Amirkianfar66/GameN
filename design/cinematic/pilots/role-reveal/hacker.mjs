// mothership:dev-only
//
// The Hacker's three panels (docs/design/cinematic/role-reveal.md, "Hacker"): the lock-breaker the
// Red Planet paid in advance, told around the player's own character:
//   1  the data dens of Phobos (memory, in sepia): a den lit by its screens, cables hanging like
//      vines, the player's character on a stool at a laptop; on the big screen, locks open one by one
//   2  paid in advance (memory): a credit chip slides across the table under a wax seal
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): the Code; a scanner sweeps four silhouettes, one already marked (the Undercover
//      the Hacker knows), and the punch card's four windows click shut (KA-CHUNK)
// What the pictures show: the scan, the known ally and the four-player Code; the role card says the
// rules. The four are silhouettes with no face, number or name, in no order but their places.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { AMBER, INK, lightPool } from '../../lib/comic.mjs';
import { beat, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { NIGHT, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, floor, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The den's, the table's and the scan's own fills (held clear of the faction accents by the palette test). */
const DEN = Object.freeze({ case: '#3A3D44', caseLit: '#5E636D', screen: '#0E1410', glow: '#CFE8B4', glowDim: '#7E9A6C', cable: '#2A2E35', felt: '#3B3128', chip: '#C9B78A', chipDark: '#8F7D52', contact: '#E8C36A', wax: '#8C3B2E', card: '#E9E1CC', cardShade: '#BFB49A', glass: '#9FB0C4', scan: '#FFF3C4' });

/** A padlock at (x, y), `open` 0..1 (its shackle lifting and turning). */
function padlock({ x, y, open, color }) {
  const lift = 14 * open;
  return `<path d="M${f(x - 12)} ${f(y - lift)}V${f(y - 18 - lift)}A12 12 0 0 1 ${f(x + 12)} ${f(y - 18 - lift)}V${f(y - lift + (open > 0.5 ? -8 : 0))}" fill="none" stroke="${color}" stroke-width="5"/>`
    + `<rect x="${f(x - 18)}" y="${f(y)}" width="36" height="28" rx="5" fill="${color}"/>`
    + `<circle cx="${f(x)}" cy="${f(y + 12)}" r="4" fill="${DEN.screen}"/>`;
}

/** A screen in its case at (x, y), w x h, glowing: scan lines and a few glyph bars. */
function monitorBox(prefix, { x, y, w, h, id, glow = 1, bars = 3 }) {
  let rows = '';
  for (let i = 0; i < bars; i += 1) rows += `<rect x="${f(x + 14)}" y="${f(y + 16 + i * 14)}" width="${f((w - 28) * (0.4 + ((i * 37 + id * 11) % 50) / 100))}" height="6" fill="${DEN.glowDim}" opacity="${f(0.8 * glow)}"/>`;
  return `<rect x="${f(x - 6)}" y="${f(y - 6)}" width="${f(w + 12)}" height="${f(h + 12)}" rx="8" fill="${DEN.case}" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" fill="${DEN.screen}"/>`
    + rows
    + lightPool(prefix, `mon-${id}`, { cx: x + w / 2, cy: y + h / 2, rx: w * 0.8, ry: h * 0.8, color: DEN.glow, opacity: 0.16 * glow });
}

/**
 * Panel 1 (memory): the data dens of Phobos. A wall of screens, cables hanging like vines, the
 * player's character on a stool at a laptop; on the big screen four locks open one by one.
 */
export function panelDen(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  // The wall of screens around the big one.
  let wall = '';
  [[30, 40, 150, 100], [30, 160, 150, 100], [610, 50, 180, 110], [640, 180, 150, 96], [200, 30, 120, 80]].forEach(([mx, my, mw, mh], i) => {
    wall += monitorBox(prefix, { x: mx, y: my, w: mw, h: mh, id: i, glow: 0.8 + 0.2 * Math.sin((t + i * 300) / 380) });
  });
  // The cables like vines, hanging from the ceiling in slow sway.
  let vines = '';
  for (let i = 0; i < 7; i += 1) {
    const vx = 60 + i * 120, sway = reduced ? 0 : 8 * Math.sin(t / 1100 + i);
    vines += `<path d="M${vx} -10C${vx + 30 + sway} 60 ${vx - 30 + sway} 120 ${vx + 10 + sway} ${150 + (i % 3) * 30}" fill="none" stroke="${DEN.cable}" stroke-width="7" stroke-linecap="round"/>`;
  }
  // The big screen: four locks opening one after another.
  const big = { x: 300, y: 120, w: 300, h: 170 };
  let locks = '';
  for (let i = 0; i < 4; i += 1) {
    const open = reduced ? 1 : easeOutBack(beat(t, [220 + i * 200, 380 + i * 200]), 1.5);
    locks += padlock({ x: big.x + 48 + i * 68, y: big.y + 74, open, color: open > 0.5 ? DEN.glow : DEN.glowDim });
  }
  const far = wall + monitorBox(prefix, { ...big, id: 9, glow: 1, bars: 0 }) + locks + vines
    + lightPool(prefix, 'den', { cx: 450, cy: 260, rx: 380, ry: 220, color: DEN.glow, opacity: 0.12 });
  // The player's character on a stool, the laptop on the knees, its light on their face.
  const at = [560, 520];
  const coder = hero(prefix, { character, sk: skeletonOf('laptopStool'), at, scale: 1.6 });
  const middle = floor(prefix, { y: 440, color: '#0E0F12' })
    + `<path d="M520 520V420M600 520V420" stroke="${INK}" stroke-width="8"/><ellipse cx="560" cy="420" rx="54" ry="10" fill="${DEN.caseLit}" stroke="${INK}" stroke-width="4"/>`
    + (reduced ? coder : `<g transform="${breathe(t, at, 0.7, 0.008)}">${coder}</g>`)
    + lightPool(prefix, 'laptop', { cx: 500, cy: 300, rx: 120, ry: 90, color: DEN.glow, opacity: 0.25 });
  const near = motes({ x: 280, y: 100, w: 360, h: 260, t, count: 12, seed: 151, color: DEN.glow, opacity: 0.4, reduced });
  return shot(w, h, { far, middle, near }, { local: t, focus: [450, 240] });
}

/**
 * Panel 2 (memory): paid in advance. A table under a lamp; a credit chip slides in, turning, and
 * stops, sealed with a wax seal pressed with a planet's ring.
 */
export function panelChip(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const far = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${DEN.felt}"/>`
    + `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="url(#${root}-dots)" opacity="0.25"/>`
    + lightPool(prefix, 'lamp', { cx: 414, cy: 250, rx: 400, ry: 230, color: '#FFE7A3', opacity: 0.3 });
  const v = reduced ? 1 : easeOutCubic(beat(t, [80, 640]));
  const cx = 414 + 480 * (1 - v), cy = 250 - 40 * (1 - v), turn = -8 + 70 * (1 - v);
  const chip = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(turn)})">`
    + `<rect x="-150" y="-92" width="300" height="184" rx="18" fill="${NIGHT.deep}" opacity="0.5" transform="translate(8 10)"/>`
    + `<rect x="-150" y="-92" width="300" height="184" rx="18" fill="${DEN.chip}" stroke="${INK}" stroke-width="6"/>`
    + `<path d="M-140 -82H140" stroke="${NIGHT.rim}" stroke-width="3" opacity="0.7"/>`
    + `<rect x="-118" y="-46" width="70" height="56" rx="8" fill="${DEN.contact}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M-118 -28H-48M-118 -8H-48M-94 -46V10M-72 -46V10" stroke="${DEN.chipDark}" stroke-width="3"/>`
    + `<rect x="-118" y="40" width="160" height="10" rx="3" fill="${DEN.chipDark}" opacity="0.8"/>`
    // The wax seal, pressed with a planet and its ring.
    + `<circle cx="78" cy="10" r="44" fill="${DEN.wax}" stroke="${INK}" stroke-width="5"/>`
    + `<circle cx="78" cy="10" r="18" fill="none" stroke="${INK}" stroke-width="4" opacity="0.6"/>`
    + `<ellipse cx="78" cy="10" rx="32" ry="9" fill="none" stroke="${INK}" stroke-width="3.5" opacity="0.6" transform="rotate(-18 78 10)"/>`
    + `<path d="M50 -16Q78 -34 106 -16" fill="none" stroke="${NIGHT.rim}" stroke-width="3" opacity="0.5"/>`
    + `</g>`;
  // The gloved fingertips that pushed it, drawing back.
  const back = reduced ? 1 : beat(t, [560, 900]);
  const glove = `<g transform="translate(${f(cx + 160 + 120 * back)} ${f(cy + 20)})" opacity="${f(1 - back)}"><path d="M0 -26Q-30 -24 -40 -6Q-46 12 -24 22Q20 30 200 26V-30Q60 -32 0 -26Z" fill="#20242C" stroke="${NIGHT.rim}" stroke-width="2.5"/></g>`;
  return shot(w, h, { far, middle: chip, near: glove }, { local: t, focus: [414, 250], push: 0.07 });
}

/** The Code's beats in the panel's own time: the scan, then the punch card's four windows. */
const SCAN = Object.freeze([60, 560]);
const PUNCH = Object.freeze([580, 860]);

/**
 * Panel 3 (now, aboard): the Code. Through a glass partition, four silhouettes; a scanner sweeps
 * them, one already marked; in front, the punch card's four windows click shut (KA-CHUNK).
 */
export function panelCode(local, { w, h, prefix, reduced = false }) {
  const t = local;
  let ribs = '';
  for (let rx = 0; rx <= NOMINAL[0]; rx += 104) ribs += `<rect x="${rx}" y="0" width="10" height="440" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  const far = ribs + lightPool(prefix, 'room', { cx: 414, cy: 220, rx: 420, ry: 240, color: NIGHT.slat, opacity: 0.18 });
  // Four silhouettes in a row behind the glass; the second is marked from the start (the ally known).
  const spots = [140, 300, 460, 620];
  let four = '';
  spots.forEach((sx, i) => {
    four += silhouette(`${prefix}-s${i}`, { gesture: i % 2 ? 'standBack' : 'standFolded', at: [sx, 400], scale: 1.05, rim: [-3, -3] });
  });
  const mark = `<g transform="translate(${spots[1]} 140)"><path d="M0 -16L14 0L0 16L-14 0Z" fill="${AMBER}" stroke="${INK}" stroke-width="4"/></g>`
    + lightPool(prefix, 'mark', { cx: spots[1], cy: 140, rx: 40, ry: 40, color: AMBER, opacity: 0.5 });
  // The scanner's band of light sweeping left to right across them.
  const s = reduced ? 1 : easeInOutCubic(beat(t, SCAN));
  const bx = -60 + (NOMINAL[0] + 120) * s;
  const band = s > 0 && s < 1
    ? `<rect x="${f(bx - 40)}" y="60" width="80" height="360" fill="${DEN.scan}" opacity="0.16"/><path d="M${f(bx)} 60V420" stroke="${DEN.scan}" stroke-width="4" opacity="0.85"/>`
    : '';
  const glass = `<rect x="20" y="60" width="788" height="360" fill="${DEN.glass}" opacity="0.08" stroke="${NIGHT.steelLit}" stroke-width="8"/>`
    + `<path d="M60 80L140 60M200 420L320 60" stroke="#FFFFFF" stroke-width="3" opacity="0.12"/>`;
  // The punch card in front, its four windows clicking shut one by one.
  const card = `<g transform="translate(560 330) rotate(-6)"><rect x="4" y="6" width="230" height="130" rx="8" fill="${NIGHT.deep}" opacity="0.5"/>`
    + `<rect x="0" y="0" width="230" height="130" rx="8" fill="${DEN.card}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M0 22H230" stroke="${DEN.cardShade}" stroke-width="3"/>`
    + [0, 1, 2, 3].map(i => {
      const shut = reduced ? 1 : easeOutBack(beat(t, [PUNCH[0] + i * 70, PUNCH[0] + i * 70 + 110]), 1.6);
      const wx = 18 + i * 52;
      return `<rect x="${wx}" y="42" width="40" height="60" rx="4" fill="#20232A" stroke="${INK}" stroke-width="3"/>`
        + (shut > 0 ? `<rect x="${wx}" y="42" width="40" height="${f(60 * Math.min(1, shut))}" rx="4" fill="${AMBER}" stroke="${INK}" stroke-width="3"/>` : '');
    }).join('')
    + `</g>`;
  const middle = floor(prefix, { color: '#10151F' }) + four + mark + band + glass;
  const near = card
    + sfxSvg('KA-CHUNK', { x: 590, y: 292, size: 38, rotate: -6, pop: reduced ? 1 : easeOutBack(beat(t, [PUNCH[1], PUNCH[1] + 170]), 1.8), opacity: reduced ? 1 : 1 - beat(t, [PUNCH[1] + 800, PUNCH[1] + 1100]) });
  return shot(w, h, { far, middle, near }, { local: t, focus: [414, 260] });
}

/** The Hacker's panels, in order. */
export const HACKER_PANELS = Object.freeze([panelDen, panelChip, panelCode]);

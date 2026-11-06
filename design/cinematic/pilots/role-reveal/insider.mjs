// mothership:dev-only
//
// The Insider's three panels (docs/design/cinematic/role-reveal.md, "Insider"): the clerk who read
// the files nobody read, told around the player's own character:
//   1  Vesta Station's archive (memory, in sepia): cabinets to the ceiling, one desk lamp, and the
//      player's character behind a wall of reports, reading
//   2  three files (memory): three folders slide across the desk, each with a faceless photograph
//      clipped to it (THUD)
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): the player's character at a cork board in their cabin; three faceless photos
//      pinned up and a string drawn between them
// What the pictures show: the Insider is given three players, and who they are; the role card says
// what they hold (one each). No face, number or name is drawn on any photograph.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { AMBER, INK, lightPool, particles } from '../../lib/comic.mjs';
import { beat, clamp01, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, contact, deskLamp, hero, shot } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The archive's and the cabin's own fills (held clear of the faction accents by the palette test). */
// Toned so the Insider's page keeps the films' one brightness (the paper and the cork kept a step down).
const FILE = Object.freeze({ print: '#8C877A', cabinet: '#33322F', drawer: '#433F39', paper: '#D6CDB6', paperShade: '#AAA087', folder: '#A08348', folderShade: '#7C653A', cork: '#634830', corkDark: '#5C4229', photo: '#CFC6B2', string: '#E8C36A', desk: '#4A3B2C', deskTop: '#6B5640' });

/** A faceless photograph: a white-bordered print with a head-and-shoulders silhouette and no features. */
function photo({ x, y, w, rotate = 0, tone = 1 }) {
  const h = w * 1.18;
  const cx = x + w / 2;
  return `<g transform="rotate(${f(rotate)} ${f(cx)} ${f(y + h / 2)})">`
    + `<rect x="${f(x + 3)}" y="${f(y + 4)}" width="${f(w)}" height="${f(h)}" fill="${NIGHT.deep}" opacity="0.45"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${FILE.photo}" stroke="${INK}" stroke-width="3"/>`
    + `<rect x="${f(x + w * 0.1)}" y="${f(y + w * 0.1)}" width="${f(w * 0.8)}" height="${f(h * 0.7)}" fill="${FILE.print}"/>`
    + `<circle cx="${f(cx)}" cy="${f(y + h * 0.33)}" r="${f(w * 0.17)}" fill="${NIGHT.figure}" opacity="${f(tone)}"/>`
    + `<path d="M${f(cx - w * 0.33)} ${f(y + w * 0.1 + h * 0.7)}Q${f(cx - w * 0.3)} ${f(y + h * 0.5)} ${f(cx)} ${f(y + h * 0.5)}Q${f(cx + w * 0.3)} ${f(y + h * 0.5)} ${f(cx + w * 0.33)} ${f(y + w * 0.1 + h * 0.7)}Z" fill="${NIGHT.figure}" opacity="${f(tone)}"/>`
    + `</g>`;
}

/** A manila folder lying on the desk, a tab and a few typed lines, a faceless photo clipped to it. */
function folder({ x, y, rotate, seed }) {
  const w = 230, h = 150;
  let lines = '';
  for (let i = 0; i < 4; i += 1) lines += `<rect x="${f(x + 112)}" y="${f(y + 34 + i * 20)}" width="${f(70 + ((seed * 13 + i * 29) % 40))}" height="6" rx="2" fill="${FILE.folderShade}" opacity="0.8"/>`;
  return `<g transform="rotate(${f(rotate)} ${f(x + w / 2)} ${f(y + h / 2)})">`
    + `<rect x="${f(x + 6)}" y="${f(y + 8)}" width="${w}" height="${h}" rx="6" fill="${NIGHT.deep}" opacity="0.5"/>`
    + `<path d="M${f(x)} ${f(y + 8)}H${f(x + 70)}L${f(x + 82)} ${f(y - 8)}H${f(x + 150)}L${f(x + 160)} ${f(y + 8)}H${f(x + w)}V${f(y + h)}H${f(x)}Z" fill="${FILE.folder}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M${f(x + 8)} ${f(y + 14)}H${f(x + w - 8)}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.7"/>`
    + lines
    + photo({ x: x + 18, y: y + 26, w: 78, rotate: -4 })
    + `<path d="M${f(x + 40)} ${f(y + 18)}V${f(y + 42)}Q${f(x + 40)} ${f(y + 48)} ${f(x + 46)} ${f(y + 48)}Q${f(x + 52)} ${f(y + 48)} ${f(x + 52)} ${f(y + 42)}V${f(y + 22)}" fill="none" stroke="${NIGHT.steelPale}" stroke-width="3"/>`
    + `</g>`;
}

/**
 * Panel 1 (memory): Vesta Station's archive. Cabinets to the ceiling, one desk lamp on a desk piled
 * with reports, and the player's own character behind them, reading, then looking up.
 */
export function panelArchive(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  // The cabinets: drawers to the ceiling, each with a handle and a blank label.
  let cabinets = '';
  for (let cx = -20; cx < NOMINAL[0]; cx += 118) {
    cabinets += `<rect x="${f(cx)}" y="0" width="112" height="330" fill="${FILE.cabinet}" stroke="${INK}" stroke-width="4"/>`;
    for (let dy = 8; dy < 320; dy += 64) {
      cabinets += `<rect x="${f(cx + 8)}" y="${f(dy)}" width="96" height="56" rx="3" fill="${FILE.drawer}" stroke="${INK}" stroke-width="3"/>`
        + `<rect x="${f(cx + 40)}" y="${f(dy + 10)}" width="32" height="12" fill="${FILE.paper}" opacity="0.4"/>`
        + `<rect x="${f(cx + 44)}" y="${f(dy + 32)}" width="24" height="8" rx="3" fill="${NIGHT.steelPale}" opacity="0.6"/>`;
    }
  }
  const on = reduced ? 1 : lampFlicker(t, 9) * 0.25 + 0.75;
  const far = cabinets
    + `<rect x="0" y="0" width="${NOMINAL[0]}" height="330" fill="${NIGHT.deep}" opacity="0.5"/>`
    + lightPool(prefix, 'back', { cx: 330, cy: 250, rx: 340, ry: 170, color: '#FFE7A3', opacity: 0.1 * on });
  // The player's own character behind the desk, reading a report, then looking up from it.
  const at = [560, 560];
  const look = reduced ? 0.35 : 0.5 - 0.5 * Math.cos(t / 950);
  const sk = { ...skeletonOf('tablet'), tilt: -4 + 12 * look };
  const reader = hero(prefix, { character, sk, at, scale: 1.78 });
  const middle = reduced ? reader : `<g transform="${breathe(t, at, 0.6, 0.008)}">${reader}</g>`;
  // The desk across the front, piled with reports, the lamp on it.
  let stacks = '';
  [[96, 70, 12], [172, 58, 8], [250, 64, 5], [716, 64, 9]].forEach(([sx, sw, n], i) => {
    for (let k = 0; k < n; k += 1) {
      const sy = 384 - k * 9, jog = ((i * 7 + k * 5) % 9) - 4;
      stacks += `<rect x="${f(sx + jog)}" y="${f(sy)}" width="${sw}" height="9" fill="${k % 2 ? FILE.paper : FILE.paperShade}" stroke="${INK}" stroke-width="2"/>`;
    }
  });
  const desk = `<rect x="50" y="390" width="730" height="100" fill="${FILE.desk}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="38" y="378" width="754" height="18" rx="4" fill="${FILE.deskTop}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M44 381H786" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.7"/>`
    + `<rect x="50" y="396" width="730" height="84" fill="url(#${prefix.split('-p')[0]}-dots)" opacity="0.22"/>`
    + `<path d="M415 400V480" stroke="${INK}" stroke-width="4" opacity="0.6"/>`;
  const near = desk + stacks
    + deskLamp(prefix, { x: 380, y: 380, toward: 1, floor: 385, on, reach: 80, spread: 130 })
    + motes({ x: 380, y: 250, w: 220, h: 130, t, count: 14, seed: 23, color: '#FFE7A3', opacity: 0.55, reduced });
  return shot(w, h, { far, middle, near }, { local: t, focus: [440, 300] });
}

/** Where each folder comes to rest on the desk, and when it lands (ms after the panel slams in). */
const FOLDERS = Object.freeze([
  Object.freeze({ x: 120, y: 250, rotate: -7, land: 260 }),
  Object.freeze({ x: 330, y: 230, rotate: 3, land: 420 }),
  Object.freeze({ x: 530, y: 262, rotate: 8, land: 580 }),
]);

/**
 * Panel 2 (memory): three files. The desk top under the lamp; three folders slide in across it one
 * after another and land, each with a faceless photograph clipped to it.
 */
export function panelFiles(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const far = `<rect x="0" y="0" width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${FILE.desk}"/>`
    + `<rect x="0" y="0" width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="url(#${root}-dots)" opacity="0.25"/>`
    + `<path d="M0 120H828M0 250H828M0 380H828" stroke="${INK}" stroke-width="2" opacity="0.35"/>`
    + lightPool(prefix, 'lamp', { cx: 420, cy: 300, rx: 420, ry: 230, color: '#FFE7A3', opacity: 0.2 });
  let files = '';
  FOLDERS.forEach((spot, i) => {
    const v = reduced ? 1 : easeOutCubic(clamp01(t / spot.land));
    const x = spot.x + (1 - v) * (760 - spot.x + 120 * i);
    files += contact(x + 120, 200, spot.y + 158) + folder({ x, y: spot.y, rotate: spot.rotate * v + 12 * (1 - v), seed: i + 1 });
  });
  const land = FOLDERS.at(-1).land;
  const puff = reduced ? '' : particles({ origin: [640, 410], v: beat(t, [land, land + 600]), count: 14, seed: 31, direction: -90, spread: 150, speed: 70, gravity: 10, color: FILE.paper, size: 3, streak: 0.02 });
  const thud = sfxSvg('THUD', { x: 640, y: 120, size: 44, rotate: 6, pop: reduced ? 1 : easeOutBack(beat(t, [land, land + 180]), 1.8), opacity: reduced ? 1 : 1 - beat(t, [land + 700, land + 1000]) });
  return shot(w, h, { far, middle: files, near: puff + thud }, { local: t, focus: [420, 300], push: 0.06 });
}

/** The three photos' places on the cork board, in the order they are pinned (and joined by the string). */
const PINNED = Object.freeze([
  Object.freeze({ x: 380, y: 92, rotate: -5 }),
  Object.freeze({ x: 610, y: 120, rotate: 4 }),
  Object.freeze({ x: 498, y: 268, rotate: -2 }),
]);

/**
 * Panel 3 (now, aboard): the player's character at the cork board in their cabin. Three faceless
 * photos pinned up, and a string drawn from pin to pin between them.
 */
export function panelBoard(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  // The cabin wall: ribbed steel and a strip light along the top.
  let ribs = '';
  for (let rx = 0; rx <= NOMINAL[0]; rx += 104) ribs += `<rect x="${f(rx)}" y="0" width="10" height="440" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  const far = ribs
    + `<rect x="300" y="10" width="420" height="14" rx="6" fill="#FFF3C4" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'strip', { cx: 510, cy: 200, rx: 330, ry: 220, color: NIGHT.slat, opacity: 0.13 });
  // The cork board, its frame lit by the strip light.
  const board = `<rect x="330" y="50" width="420" height="380" fill="${FILE.cork}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="330" y="50" width="420" height="380" fill="url(#${root}-dots)" opacity="0.35"/>`
    + `<rect x="322" y="42" width="436" height="396" fill="none" stroke="${NIGHT.steelLit}" stroke-width="10"/>`
    + `<rect x="316" y="36" width="448" height="408" fill="none" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M330 54H750" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.6"/>`;
  // The photos land one after another and their pins go in; then the string runs from pin to pin.
  let photos = '', pins = [];
  PINNED.forEach((spot, i) => {
    const v = reduced ? 1 : easeOutBack(beat(t, [80 + i * 150, 260 + i * 150]), 1.4);
    if (v <= 0) return;
    const pin = [spot.x + 46, spot.y + 8];
    pins.push(pin);
    photos += `<g transform="translate(${f(pin[0])} ${f(pin[1])}) scale(${f(0.7 + 0.3 * v)}) translate(${f(-pin[0])} ${f(-pin[1])})" opacity="${f(clamp01(v * 2))}">${photo({ x: spot.x, y: spot.y, w: 92, rotate: spot.rotate })}</g>`;
  });
  const run = reduced ? 1 : easeOutCubic(beat(t, [560, 1100]));
  let string = '';
  if (pins.length === 3 && run > 0) {
    const path = [pins[0], pins[1], pins[2], pins[0]];
    const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    const d = path.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join('');
    string = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="${f(total)}" stroke-dashoffset="${f(total * (1 - run))}" stroke-linejoin="round" opacity="0.6"/>`
      + `<path d="${d}" fill="none" stroke="${FILE.string}" stroke-width="3" stroke-dasharray="${f(total)}" stroke-dashoffset="${f(total * (1 - run))}" stroke-linejoin="round"/>`;
  }
  const heads = pins.map(([px, py]) => `<circle cx="${f(px)}" cy="${f(py)}" r="8" fill="${AMBER}" stroke="${INK}" stroke-width="3"/><circle cx="${f(px - 2)}" cy="${f(py - 2)}" r="2.5" fill="#FFFFFF" opacity="0.8"/>`).join('');
  const middle = board + photos + string + heads;
  // The player's own character in the foreground, facing the board, a fist at the chin.
  const at = [160, 600];
  const thinker = hero(prefix, { character, sk: skeletonOf('think'), at, scale: 2.05 });
  const near = lightPool(prefix, 'rim', { cx: 160, cy: 280, rx: 180, ry: 240, color: NIGHT.slat, opacity: 0.12 })
    + (reduced ? thinker : `<g transform="${breathe(t, at, 0.2, 0.008)}">${thinker}</g>`);
  return shot(w, h, { far, middle, near }, { local: t, focus: [480, 260] });
}

/** The Insider's panels, in order. */
export const INSIDER_PANELS = Object.freeze([panelArchive, panelFiles, panelBoard]);

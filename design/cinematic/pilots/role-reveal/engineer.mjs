// mothership:dev-only
//
// The Engineer's three panels (docs/design/cinematic/role-reveal.md, "Engineer"): the shipwright who
// knows where every wire runs, told around the player's own character:
//   1  the Titan yards (memory, in sepia): a ship's ribs on the slip under Saturn, welding sparks in
//      the scaffolds, and the player's character on a gantry with the plans
//   2  every wire (memory): a gloved hand traces a cable bundle into a bulkhead, and the signal clamp
//      clicks on (CLICK)
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): the photograph; viewfinder brackets close on the room opposite, the shutter
//      blinks dark (ink, never a flash of light), and the print slides out and develops
// What the pictures show: the Engineer's one capture of the opposite room, the whole room and never
// one target (library group 1's capture: brackets, dark shutter, print). The people in it are
// silhouettes; the role card says what the capture does.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, PAPER, lightPool, particles, stars } from '../../lib/comic.mjs';
import { beat, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { NIGHT, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, floor, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The yards' and the ship's own fills (held clear of the faction accents by the palette test). */
const YARD = Object.freeze({ sky: '#151A22', planet: '#C9B48A', planetDark: '#8C7A58', ring: '#E8D8B0', rib: '#59616E', ribLit: '#9AA3B0', scaffold: '#3C434F', gantry: '#4B5260', cable: ['#5E6B55', '#7A6A55', '#4F5D72', '#6E6E64', '#83786A'], conduit: '#4A5263', plate: '#3A4150', room: '#C7B98F', print: '#EDE6D6' });

/** Cut a skeleton's head tilt by `amount` degrees (a figure looking up or down). */
const tilted = (gesture, amount) => ({ ...skeletonOf(gesture), tilt: (skeletonOf(gesture).tilt ?? 0) + amount });

/**
 * Panel 1 (memory): the Titan yards. A ship's ribs rise on the slip under Saturn's rings; sparks
 * shower from the welders in the scaffolds; the player's character on the gantry with the plans.
 */
export function panelYards(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  // The sky over the yards: stars, and Saturn with its rings low over the horizon.
  const far = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${YARD.sky}"/>`
    + stars({ x: 0, y: 0, w: NOMINAL[0], h: 260, count: 60, seed: 101, t: reduced ? 0 : t })
    + `<ellipse cx="640" cy="120" rx="150" ry="28" fill="none" stroke="${YARD.ring}" stroke-width="7" opacity="0.8" transform="rotate(-12 640 120)"/>`
    + `<circle cx="640" cy="120" r="70" fill="${YARD.planet}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M576 98Q640 90 704 104M572 128Q640 120 708 134" stroke="${YARD.planetDark}" stroke-width="6" opacity="0.7" fill="none"/>`
    + `<path d="M490 120A150 28 0 0 0 790 120" fill="none" stroke="${YARD.ring}" stroke-width="7" opacity="0.9" transform="rotate(-12 640 120)"/>`
    + lightPool(prefix, 'planet', { cx: 640, cy: 120, rx: 220, ry: 160, color: YARD.ring, opacity: 0.14 });
  // The ship's ribs on the slip, receding, with the scaffold lattice around them.
  let ribs = '';
  [[120, 330, 1], [250, 300, 0.86], [370, 276, 0.74], [478, 258, 0.64], [574, 244, 0.56]].forEach(([cx, base, k]) => {
    const rw = 210 * k, rh = 250 * k;
    ribs += `<path d="M${f(cx - rw / 2)} ${f(base)}Q${f(cx - rw / 2)} ${f(base - rh)} ${f(cx)} ${f(base - rh)}Q${f(cx + rw / 2)} ${f(base - rh)} ${f(cx + rw / 2)} ${f(base)}" fill="none" stroke="${INK}" stroke-width="${f(18 * k)}"/>`
      + `<path d="M${f(cx - rw / 2)} ${f(base)}Q${f(cx - rw / 2)} ${f(base - rh)} ${f(cx)} ${f(base - rh)}Q${f(cx + rw / 2)} ${f(base - rh)} ${f(cx + rw / 2)} ${f(base)}" fill="none" stroke="${YARD.rib}" stroke-width="${f(11 * k)}"/>`
      + `<path d="M${f(cx - rw / 2 + 3)} ${f(base)}Q${f(cx - rw / 2 + 3)} ${f(base - rh + 4)} ${f(cx)} ${f(base - rh + 4)}" fill="none" stroke="${YARD.ribLit}" stroke-width="${f(3 * k)}" opacity="0.8"/>`;
  });
  let lattice = '';
  for (let lx = 40; lx < 700; lx += 70) lattice += `<path d="M${lx} 340V150" stroke="${YARD.scaffold}" stroke-width="4"/>`;
  for (let ly = 170; ly < 340; ly += 56) lattice += `<path d="M30 ${ly}H690" stroke="${YARD.scaffold}" stroke-width="3"/>`;
  // Welding at three points, each throwing a shower of sparks in its own rhythm.
  const welds = [[250, 190, 0], [478, 210, 400], [370, 160, 800]];
  let sparks = '';
  welds.forEach(([wx, wy, phase], i) => {
    const cycle = reduced ? 0.3 : ((t + phase) % 1200) / 1200;
    sparks += lightPool(prefix, `weld-${i}`, { cx: wx, cy: wy, rx: 46, ry: 40, color: '#FFF3C4', opacity: reduced ? 0.4 : 0.25 + 0.35 * Math.abs(Math.sin(t / 60 + i)) })
      + (reduced ? '' : particles({ origin: [wx, wy], v: cycle, count: 14, seed: 113 + i, direction: 90, spread: 120, speed: 90, gravity: 160, color: '#FFE7A3', size: 2.4, streak: 0.05 }));
  });
  const middle = lattice + ribs + `<path d="M0 340H${NOMINAL[0]}V480H0Z" fill="${YARD.scaffold}" opacity="0.6"/>` + sparks;
  // The gantry's rail across the front, and the player's character on it with the plans.
  const at = [230, 560];
  const look = reduced ? 0.4 : 0.5 - 0.5 * Math.cos(t / 1000);
  const reader = hero(prefix, { character, sk: tilted('tablet', -6 + 12 * look), at, scale: 1.75 });
  const rail = `<path d="M0 392H${NOMINAL[0]}" stroke="${INK}" stroke-width="12"/><path d="M0 392H${NOMINAL[0]}" stroke="${YARD.gantry}" stroke-width="6"/>`
    + `<path d="M0 446H${NOMINAL[0]}" stroke="${INK}" stroke-width="10"/><path d="M0 446H${NOMINAL[0]}" stroke="${YARD.gantry}" stroke-width="5"/>`
    + Array.from({ length: 9 }, (_, i) => `<path d="M${40 + i * 96} 392V480" stroke="${INK}" stroke-width="8"/>`).join('')
    + `<path d="M0 389H${NOMINAL[0]}" stroke="${YARD.ribLit}" stroke-width="2" opacity="0.7"/>`;
  const near = (reduced ? reader : `<g transform="${breathe(t, at, 0.5, 0.008)}">${reader}</g>`) + rail
    + motes({ x: 120, y: 80, w: 500, h: 240, t, count: 10, seed: 127, color: '#FFE7A3', opacity: 0.4, reduced });
  return shot(w, h, { far, middle, near }, { local: t, focus: [380, 260] });
}

/**
 * Panel 2 (memory): every wire. A bulkhead; cable bundles run into its conduit; a gloved hand
 * traces one bundle along, and the signal clamp clicks on it (CLICK).
 */
export function panelWires(local, { w, h, prefix, reduced = false }) {
  const t = local;
  let plates = '';
  for (let px = 0; px < NOMINAL[0]; px += 138) {
    for (let py = 0; py < NOMINAL[1]; py += 120) {
      plates += `<rect x="${px + 3}" y="${py + 3}" width="132" height="114" fill="${YARD.plate}" stroke="${INK}" stroke-width="3"/>`;
      plates += [[px + 12, py + 12], [px + 124, py + 12], [px + 12, py + 106], [px + 124, py + 106]].map(([rx, ry]) => `<circle cx="${rx}" cy="${ry}" r="3.5" fill="${NIGHT.steelPale}" opacity="0.6"/>`).join('');
    }
  }
  const far = plates + lightPool(prefix, 'work', { cx: 400, cy: 250, rx: 400, ry: 230, color: '#FFE7A3', opacity: 0.22 });
  // The bundle of cables sweeping in from the left and into the conduit box on the right.
  let cables = '';
  YARD.cable.forEach((c, i) => {
    const y = 210 + i * 18;
    const d = `M-20 ${y + 60}C200 ${y + 70} 360 ${y - 20} 560 ${y - 10}H640`;
    cables += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round"/>`
      + `<path d="M-20 ${y + 56}C200 ${y + 66} 360 ${y - 24} 560 ${y - 14}H640" fill="none" stroke="${NIGHT.rim}" stroke-width="2" opacity="0.45"/>`;
  });
  const conduit = `<rect x="620" y="170" width="150" height="160" rx="10" fill="${YARD.conduit}" stroke="${INK}" stroke-width="6"/>`
    + `<path d="M628 178H762" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.7"/>`
    + `<rect x="604" y="190" width="24" height="120" rx="4" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"/>`;
  // The signal clamp: a ring clamp with a small round gauge, closing on the bundle at 600 ms.
  const clickAt = 620;
  const shut = reduced ? 1 : easeOutBack(beat(t, [clickAt - 140, clickAt]), 2);
  const blink = reduced ? 1 : (t > clickAt ? 0.5 + 0.5 * Math.sign(Math.sin((t - clickAt) / 90)) : 0);
  const cx = 470, cy = 238;
  const clamp = `<g transform="translate(${cx} ${f(cy - 90 * (1 - shut))})">`
    + `<path d="M-46 -6A48 56 0 0 1 46 -6" fill="none" stroke="${INK}" stroke-width="16"/><path d="M-46 -6A48 56 0 0 1 46 -6" fill="none" stroke="${NIGHT.steelPale}" stroke-width="9"/>`
    + `<path d="M-46 -6A48 56 0 0 0 46 -6" fill="none" stroke="${INK}" stroke-width="16"/><path d="M-46 -6A48 56 0 0 0 46 -6" fill="none" stroke="${NIGHT.steelLit}" stroke-width="9"/>`
    + `<circle cx="0" cy="-74" r="26" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/><circle cx="0" cy="-74" r="17" fill="${YARD.print}"/>`
    + `<path d="M-12 -74Q-6 -84 0 -74T12 -74" fill="none" stroke="${INK}" stroke-width="3"/>`
    + `<circle cx="20" cy="-96" r="6" fill="#FFF3C4" opacity="${f(0.3 + 0.7 * blink)}" stroke="${INK}" stroke-width="2.5"/>`
    + `</g>` + (blink > 0.5 ? lightPool(prefix, 'clamp', { cx: cx + 20, cy: cy - 96, rx: 44, ry: 40, color: '#FFF3C4', opacity: 0.5 }) : '');
  // The gloved hand tracing the bundle, left to right, then resting.
  const trace = reduced ? 1 : easeInOutCubic(beat(t, [40, 560]));
  const hx = 70 + 300 * trace, hy = 282 - 70 * trace;
  const hand = `<g transform="translate(${f(hx)} ${f(hy)}) rotate(-14)">`
    + `<path d="M-150 30Q-80 10 -20 8Q10 6 26 -6Q44 -12 46 4Q48 18 30 24Q10 32 -20 40Q-80 56 -150 60Z" fill="#20242C" stroke="${NIGHT.rim}" stroke-width="2.5"/>`
    + `<path d="M-14 12Q14 4 30 -4M-14 26Q14 22 34 16" fill="none" stroke="${INK}" stroke-width="2.4"/></g>`;
  const near = hand
    + sfxSvg('CLICK', { x: 560, y: 110, size: 42, rotate: 7, pop: reduced ? 1 : easeOutBack(beat(t, [clickAt, clickAt + 170]), 1.8), opacity: reduced ? 1 : 1 - beat(t, [clickAt + 800, clickAt + 1100]) })
    + motes({ x: 200, y: 80, w: 400, h: 260, t, count: 10, seed: 131, color: '#FFE7A3', opacity: 0.4, reduced });
  return shot(w, h, { far, middle: conduit + cables + clamp, near }, { local: t, focus: [430, 250], push: 0.06 });
}

/** The capture's beats in the panel's own time (library group 1's: brackets, dark shutter, print, develop). */
const CAPTURE = Object.freeze({ brackets: [60, 300], shutter: [300, 380], print: [380, 780], develop: [700, 1160] });

/** The room opposite as the viewfinder and the print see it: its back wall lit, two silhouettes in it. */
function roomOpposite(prefix, { x, y, w, h, scale = 1 }) {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${YARD.room}"/>`
    + lightPool(prefix, `room-${Math.round(x)}`, { cx: x + w / 2, cy: y + h * 0.45, rx: w * 0.6, ry: h * 0.6, color: '#FFF3C4', opacity: 0.5 })
    + `<rect x="${f(x)}" y="${f(y + h * 0.78)}" width="${f(w)}" height="${f(h * 0.22)}" fill="${YARD.planetDark}"/>`
    + silhouette(`${prefix}-o1-${Math.round(x)}`, { gesture: 'standFolded', at: [x + w * 0.34, y + h * 0.98], scale: 0.62 * scale, rim: [-2, -2] })
    + silhouette(`${prefix}-o2-${Math.round(x)}`, { gesture: 'think', at: [x + w * 0.68, y + h * 0.98], scale: 0.6 * scale, rim: [2, -2] });
}

/**
 * Panel 3 (now, aboard): the photograph. Across the corridor, the room opposite through its
 * window; viewfinder brackets close on it, the shutter blinks dark, and the print slides out
 * and develops the room.
 */
export function panelCapture(local, { w, h, prefix, reduced = false }) {
  const t = local;
  // The corridor wall and the window into the room opposite.
  const win = { x: 250, y: 70, w: 330, h: 230 };
  let ribs = '';
  for (let rx = 0; rx <= NOMINAL[0]; rx += 104) ribs += `<rect x="${rx}" y="0" width="10" height="440" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  const far = ribs
    + `<defs><clipPath id="${prefix}-win"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}"/></clipPath></defs>`
    + `<g clip-path="url(#${prefix}-win)">${roomOpposite(prefix, { ...win, scale: 1.5 })}</g>`
    + `<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="none" stroke="${NIGHT.steelLit}" stroke-width="12"/>`
    + `<rect x="${win.x - 6}" y="${win.y - 6}" width="${win.w + 12}" height="${win.h + 12}" fill="none" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'window', { cx: win.x + win.w / 2, cy: win.y + win.h / 2, rx: 300, ry: 220, color: '#FFF3C4', opacity: 0.16 });
  // The viewfinder's brackets close from the panel's corners onto the window's.
  const b = reduced ? 1 : easeOutCubic(beat(t, CAPTURE.brackets));
  // An L at each corner (sx, sy: the corner's outward direction), its arms pointing back along the edges.
  const corner = (cx, cy, sx, sy) => {
    const x = cx + sx * 220 * (1 - b), y = cy + sy * 140 * (1 - b);
    const d = `M${f(x)} ${f(y - sy * 44)}V${f(y)}H${f(x - sx * 44)}`;
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="square"/><path d="${d}" fill="none" stroke="${PAPER}" stroke-width="6" stroke-linecap="square"/>`;
  };
  const brackets = corner(win.x - 16, win.y - 16, -1, -1)
    + corner(win.x + win.w + 16, win.y - 16, 1, -1)
    + corner(win.x - 16, win.y + win.h + 16, -1, 1)
    + corner(win.x + win.w + 16, win.y + win.h + 16, 1, 1);
  // The shutter: a dark blink (ink, never a flash of light).
  const sh = reduced ? 0 : Math.sin(Math.PI * beat(t, CAPTURE.shutter));
  const shutter = sh > 0 ? `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${INK}" opacity="${f(0.85 * sh)}"/>` : '';
  // The print slides out below and develops the room.
  const slide = reduced ? 1 : easeOutCubic(beat(t, CAPTURE.print));
  const dev = reduced ? 1 : easeInOutCubic(beat(t, CAPTURE.develop));
  const px = 560, py = 470 - 200 * slide;
  const print = slide > 0
    ? `<g transform="rotate(4 ${px + 80} ${f(py + 96)})"><rect x="${px + 4}" y="${f(py + 6)}" width="160" height="190" fill="${NIGHT.deep}" opacity="0.5"/>`
      + `<rect x="${px}" y="${f(py)}" width="160" height="190" fill="${YARD.print}" stroke="${INK}" stroke-width="4"/>`
      + `<defs><clipPath id="${prefix}-print"><rect x="${px + 14}" y="${f(py + 14)}" width="132" height="132"/></clipPath></defs>`
      + `<rect x="${px + 14}" y="${f(py + 14)}" width="132" height="132" fill="#2A2C31"/>`
      + `<g clip-path="url(#${prefix}-print)" opacity="${f(dev)}">${roomOpposite(`${prefix}-pr`, { x: px + 14, y: py + 14, w: 132, h: 132, scale: 0.9 })}</g></g>`
    : '';
  const middle = floor(prefix, { color: '#10151F' }) + brackets;
  const near = print + shutter;
  return shot(w, h, { far, middle, near }, { local: t, focus: [414, 220] });
}

/** The Engineer's panels, in order. */
export const ENGINEER_PANELS = Object.freeze([panelYards, panelWires, panelCapture]);

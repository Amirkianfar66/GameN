// mothership:dev-only
//
// The Doctor's three panels (docs/design/cinematic/role-reveal.md, "Doctor"): a small back story, as a
// comic book gives its characters one (the owner, 6 November 2026), told around the player's own
// character:
//   1  Colony Nine, the fever years (memory, in sepia): a field ward at night, its cots full under one
//      hanging lamp, and the player's character at the foot of a cot with a chart
//   2  the last two doses (memory): an open medicine case under a desk lamp, every slot empty but two,
//      their vials still glowing, rain on the window
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): the Mothership's Hospital at night; the trace steadies, and the Hospital panel's
//      keypad lights one number, the player's own (the panel's code is the Doctor's player number,
//      P21 and P22)
// The rules it teaches: two doses for the whole voyage, and the panel's code. The medical palette is
// the Hospital films' own (board-v2/fx/medical.mjs). The player's character is the only figure in
// colour; every other figure is a silhouette with no face, number or name.
//
// Lit as noir (the owner's review: the patient and the equipment must not sink into the dark once
// three panels share the screen): the patient is a navy silhouette with a paper rim light and a pool
// of light on the wall behind; the steel is the lit token steel with bevel highlights; screens and
// lamps glow and cast their light; things stand on contact shadows. Each panel is shot as an animated
// comic: three layers (far, middle, near) under a slow push, the near layer moving most.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup in the panel's own units, drawn for a nominal 828 x 480 panel and scaled to its height.

import { MEDICAL } from '../../../board-v2/fx/medical.mjs';
import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, AMBER, lightPool, stars, streaks } from '../../lib/comic.mjs';
import { beat, easeOutBack, easeOutCubic, rand } from '../../lib/ease.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, contact, floor, hangingLamp, hero, shot, silhouette as patient } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** Lit fills for the ward's furniture (all held clear of the faction accents by the palette test). */
const WARD = Object.freeze({ mattress: '#2E3B58', blanket: '#3E4F72', pillow: '#DDE4EC', floor: '#0B1019', key: '#34415A' });

/** A viewport on the ward wall: stars behind slatted blinds, its glow spilling on the wall around it. */
function viewport(prefix, { x, y, w, h, t }) {
  const id = `${prefix}-vp`;
  let slats = '';
  for (let sy = y + 14; sy < y + h - 8; sy += 26) slats += `<rect x="${f(x + 8)}" y="${f(sy)}" width="${f(w - 16)}" height="12" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="2"/>`;
  return lightPool(prefix, 'vp-spill', { cx: x + w / 2, cy: y + h / 2, rx: w * 0.9, ry: h * 1.1, color: NIGHT.slat, opacity: 0.1 })
    + `<defs><clipPath id="${id}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22"/></clipPath></defs>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="#060812"/>`
    + `<g clip-path="url(#${id})">${stars({ x, y, w, h, count: 46, seed: 53, t })}${slats}</g>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="none" stroke="${NIGHT.steelLit}" stroke-width="10"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="none" stroke="${INK}" stroke-width="4"/>`;
}

/** A berth in side view: headboard, frame, mattress, pillow, lit edges. Returns { svg, top } (the mattress top). */
function berth({ x, y, w }) {
  const top = y;
  const svg = contact(x + w / 2, w + 40)
    + `<rect x="${f(x - 18)}" y="${f(y - 70)}" width="20" height="120" rx="6" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(x - 14)} ${f(y - 64)}V${f(y + 40)}" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.7"/>`
    + `<path d="M${f(x + 12)} ${f(y + 48)}V${f(y + 120)}M${f(x + w - 24)} ${f(y + 48)}V${f(y + 120)}" stroke="${INK}" stroke-width="9"/>`
    + `<rect x="${f(x)}" y="${f(y + 26)}" width="${f(w)}" height="24" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(x + 4)} ${f(y + 30)}H${f(x + w - 4)}" stroke="${NIGHT.steelLit}" stroke-width="2.5" opacity="0.9"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="30" rx="8" fill="${WARD.mattress}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(x + 8)} ${f(y + 4)}H${f(x + w - 8)}" stroke="${NIGHT.steelPale}" stroke-width="2.5" opacity="0.6"/>`
    + `<ellipse cx="${f(x + 50)}" cy="${f(y - 4)}" rx="46" ry="16" fill="${WARD.pillow}" stroke="${INK}" stroke-width="4"/>`;
  return { svg, top };
}

/** The blanket over a patient from `from` to `to` along the mattress, its top edge caught by the light. */
function blanket(prefix, { from, to, top, height }) {
  const edge = `M${f(from)} ${f(top - height)}Q${f((from + to) / 2)} ${f(top - height - 14)} ${f(to)} ${f(top - height * 0.55)}`;
  return `<path d="${edge}L${f(to + 8)} ${f(top + 4)}L${f(from - 6)} ${f(top + 4)}Z" fill="${WARD.blanket}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="${edge}L${f(to + 8)} ${f(top + 4)}L${f(from - 6)} ${f(top + 4)}Z" fill="url(#${prefix.split('-p')[0]}-dots)" opacity="0.25"/>`
    + `<path d="${edge}" fill="none" stroke="${NIGHT.rim}" stroke-width="3.5" opacity="0.9"/>`;
}

/**
 * An ECG trace across [x0, x1] at baseline y: `stable` regular beats, else stuttering ones (uneven
 * spacing and height, with flat stretches). A sweep head at `head` (0..1 of the width) with the
 * monitor's dark gap ahead of it. The trace glows (a blurred copy under it).
 */
function ecgSvg({ x0, x1, y, stable, head, color, glow, seed = 61 }) {
  const pts = [[x0, y]];
  let x = x0 + 10, i = 0;
  while (x < x1 - 30) {
    const gap = stable ? 52 : 34 + rand(seed, i, 'g') * 46;
    const amp = stable ? 1 : (rand(seed, i, 'a') < 0.25 ? 0.15 : 0.45 + rand(seed, i, 'b') * 0.9);
    pts.push([x + 6, y - 5 * amp], [x + 10, y], [x + 14, y + 6 * amp], [x + 18, y - 34 * amp], [x + 22, y + 12 * amp], [x + 27, y], [x + 34, y - 7 * amp], [x + 40, y]);
    x += gap; i += 1;
  }
  pts.push([x1, y]);
  const hx = x0 + (x1 - x0) * head;
  const line = pts.map(([px, py], k) => `${k ? 'L' : 'M'}${f(Math.min(px, x1))} ${f(py)}`).join('');
  return (glow ? `<path d="${line}" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round" opacity="0.75" filter="url(#${glow})"/>` : '')
    + `<path d="${line}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linejoin="round"/>`
    + `<rect x="${f(hx + 4)}" y="${f(y - 44)}" width="22" height="70" fill="${MEDICAL.screen}"/>`
    + `<circle cx="${f(hx)}" cy="${f(y)}" r="5" fill="#FFFFFF"/>`;
}

/** The heart monitor on its stand: lit steel box with a bevel, the screen glowing and casting its light. */
function monitor(prefix, { x, y, local, stable, lamp }) {
  const root = prefix.split('-p')[0];
  const w = 210, h = 130;
  let grid = '';
  for (let gx = x + 20; gx < x + w - 14; gx += 22) grid += `M${f(gx)} ${f(y + 14)}V${f(y + h - 14)}`;
  for (let gy = y + 24; gy < y + h - 14; gy += 22) grid += `M${f(x + 14)} ${f(gy)}H${f(x + w - 14)}`;
  const head = ((local / 1600) % 1);
  const color = stable ? MEDICAL.stable : MEDICAL.amber;
  return lightPool(prefix, 'screen-cast', { cx: x + w / 2, cy: y + h / 2 + 20, rx: w * 0.95, ry: h * 1.2, color, opacity: 0.16 })
    + contact(x + w / 2, 110)
    + `<path d="M${f(x + w / 2)} ${f(y + h)}V${f(y + h + 170)}M${f(x + w / 2 - 40)} ${f(y + h + 170)}H${f(x + w / 2 + 40)}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`
    + `<path d="M${f(x + w / 2 - 3)} ${f(y + h + 4)}V${f(y + h + 164)}" stroke="${NIGHT.steelLit}" stroke-width="2.5" opacity="0.8"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="12" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="6"/>`
    + `<path d="M${f(x + 10)} ${f(y + 5)}H${f(x + w - 10)}M${f(x + 5)} ${f(y + 10)}V${f(y + h - 10)}" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.75"/>`
    + `<rect x="${f(x + 12)}" y="${f(y + 12)}" width="${w - 24}" height="${h - 24}" rx="6" fill="${MEDICAL.screen}"/>`
    + `<path d="${grid}" stroke="${MEDICAL.grid}" stroke-width="1.2" opacity="0.8"/>`
    + ecgSvg({ x0: x + 16, x1: x + w - 16, y: y + h / 2 + 10, stable, head, color, glow: `${root}-glow` })
    + lightPool(prefix, 'screen-glow', { cx: x + w / 2, cy: y + h / 2, rx: w * 0.55, ry: h * 0.6, color, opacity: 0.18 })
    + `<circle cx="${f(x + w - 22)}" cy="${f(y - 10)}" r="11" fill="${stable ? MEDICAL.cyan : MEDICAL.amber}" stroke="${INK}" stroke-width="4" opacity="${f(lamp)}"/>`
    + (lamp > 0.8 && !stable ? lightPool(prefix, 'lamp', { cx: x + w - 22, cy: y - 10, rx: 44, color: MEDICAL.amber, opacity: 0.35 * lamp }) : '');
}

/** One seven-segment digit (the Hospital panel's readout): `on` lit segments in amber, the rest dim. */
const SEGMENTS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export function sevenSegment(digit, { x, y, h, lit = 1 }) {
  const w = h * 0.56, t = h * 0.12;
  const seg = {
    a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t],
    f: [x, y + t, t, h / 2 - 1.5 * t], b: [x + w - t, y + t, t, h / 2 - 1.5 * t],
    e: [x, y + h / 2 + t / 2, t, h / 2 - 1.5 * t], c: [x + w - t, y + h / 2 + t / 2, t, h / 2 - 1.5 * t],
  };
  const on = SEGMENTS[digit] ?? '';
  return Object.entries(seg).map(([name, [sx, sy, sw, sh]]) => `<rect x="${f(sx)}" y="${f(sy)}" width="${f(sw)}" height="${f(sh)}" rx="${f(t * 0.4)}" fill="${on.includes(name) ? AMBER : '#2A2418'}" opacity="${f(on.includes(name) ? 0.25 + 0.75 * lit : 0.6)}"/>`).join('');
}

// ---------- the three panels ----------

/** A cot in three-quarter view: a frame, legs and a thin mattress, with a rim of lamp light. Returns { svg, top }. */
function cot({ x, y, w, depth = 1 }) {
  const svg = contact(x + w / 2, w + 30 * depth).replace('cy="446"', `cy="${f(y + 74 * depth)}"`)
    + `<path d="M${f(x + 10)} ${f(y + 18)}V${f(y + 72 * depth)}M${f(x + w - 10)} ${f(y + 18)}V${f(y + 72 * depth)}" stroke="${INK}" stroke-width="${f(7 * depth)}"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(22 * depth)}" rx="5" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="${f(4 * depth)}"/>`
    + `<rect x="${f(x + 4)}" y="${f(y - 10 * depth)}" width="${f(w - 8)}" height="${f(14 * depth)}" rx="5" fill="${WARD.mattress}" stroke="${INK}" stroke-width="${f(3.5 * depth)}"/>`
    + `<path d="M${f(x + 10)} ${f(y - 8 * depth)}H${f(x + w - 10)}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.7"/>`;
  return { svg, top: y - 10 * depth };
}

/**
 * Panel 1 (memory): Colony Nine, the fever years. A field ward at night: cots full of patients under
 * one hanging lamp, dust beating on the porthole, and the player's own character at the foot of the
 * nearest cot with a chart. Drawn in colour here; the panel's sepia makes it memory.
 */
export function panelColony(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  let seams = '';
  for (let sx = 0; sx <= NOMINAL[0]; sx += 92) seams += `M${f(sx)} 0V438`;
  // The prefab's wall: ribbed panels, and a porthole on the storm outside.
  const far = `<path d="${seams}" stroke="${INK}" stroke-width="3" opacity="0.55"/>`
    + `<path d="M0 214H${NOMINAL[0]}" stroke="${NIGHT.steelLit}" stroke-width="2" opacity="0.4"/>`
    + `<defs><clipPath id="${prefix}-port"><circle cx="640" cy="150" r="64"/></clipPath></defs>`
    + `<circle cx="640" cy="150" r="64" fill="#2A2216"/>`
    + `<g clip-path="url(#${prefix}-port)">${streaks({ x: 560, y: 80, w: 160, h: 140, angle: -18, count: 22, seed: 13, color: '#E9D9B8', width: 2.5, length: 0.5, opacity: 0.55, phase: reduced ? 0 : t / 900 })}</g>`
    + `<circle cx="640" cy="150" r="64" fill="none" stroke="${NIGHT.steelLit}" stroke-width="10"/><circle cx="640" cy="150" r="64" fill="none" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'back', { cx: 380, cy: 300, rx: 330, ry: 150, color: '#FFE7A3', opacity: 0.14 });
  // The ward: three cots receding, each with a patient under a sheet.
  const cots = [{ x: 60, y: 300, w: 200, depth: 0.72 }, { x: 250, y: 336, w: 240, depth: 0.86 }, { x: 430, y: 384, w: 300, depth: 1 }];
  let ward = floor(prefix);
  cots.forEach((c, i) => {
    const bed = cot(c);
    ward += bed.svg + `<g transform="${reduced ? '' : breathe(t, [c.x + c.w * 0.6, bed.top + 2], i * 1.7)}">`
      + patient(`${prefix}-pt${i}`, { gesture: 'cotLying', at: [c.x + c.w * 0.62, bed.top + 4], scale: 0.9 * c.depth, rim: [-3, -4] })
      + `<path d="M${f(c.x + c.w * 0.3)} ${f(bed.top - 18 * c.depth)}Q${f(c.x + c.w * 0.62)} ${f(bed.top - 30 * c.depth)} ${f(c.x + c.w - 8)} ${f(bed.top - 10 * c.depth)}L${f(c.x + c.w - 6)} ${f(bed.top + 2)}H${f(c.x + c.w * 0.28)}Z" fill="${WARD.blanket}" stroke="${INK}" stroke-width="${f(4 * c.depth)}" stroke-linejoin="round"/>`
      + `<path d="M${f(c.x + c.w * 0.3)} ${f(bed.top - 18 * c.depth)}Q${f(c.x + c.w * 0.62)} ${f(bed.top - 30 * c.depth)} ${f(c.x + c.w - 8)} ${f(bed.top - 10 * c.depth)}" fill="none" stroke="${NIGHT.rim}" stroke-width="3" opacity="0.85"/></g>`;
  });
  const middle = hangingLamp(prefix, { x: 360, y: 40, floor: 440, on: lampFlicker(t, 5) * 0.3 + 0.7, swing: reduced ? 0 : 2.4 * Math.sin(t / 1100) })
    + ward
    + motes({ x: 230, y: 90, w: 260, h: 320, t, count: 16, seed: 19, color: '#FFE7A3', opacity: 0.55, reduced });
  // The player's own character at the foot of the nearest cot, the chart in hand, lit by the lamp behind.
  const at = [676, 480];
  // Reading the chart, then looking up at the ward: the head's tilt eases between the two.
  const look = reduced ? 0.5 : 0.5 - 0.5 * Math.cos(t / 900);
  const sk = { ...skeletonOf('tablet'), tilt: -6 + 14 * look };
  const body = hero(prefix, { character, sk, at, scale: 1.36, mirror: true });
  const near = reduced ? body : `<g transform="${breathe(t, at, 0.4, 0.008)}">${body}</g>`;
  return shot(w, h, { far, middle, near }, { local: t, focus: [520, 320] });
}

/**
 * Panel 2 (memory): the last two doses. An open medicine case under a desk lamp, every slot empty
 * but two, their vials still glowing; spent vials on the table; rain running down the window.
 */
export function panelDoses(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const pulse = reduced ? 1 : 0.8 + 0.2 * Math.sin(t / 260);
  const far = `<rect x="40" y="40" width="260" height="210" rx="10" fill="#14110C" stroke="${NIGHT.steelLit}" stroke-width="10"/>`
    + `<defs><clipPath id="${prefix}-win"><rect x="40" y="40" width="260" height="210" rx="10"/></clipPath></defs>`
    + `<g clip-path="url(#${prefix}-win)">${streaks({ x: 30, y: 30, w: 280, h: 230, angle: 78, count: 34, seed: 41, color: '#E9D9B8', width: 2, length: 0.35, opacity: 0.5, phase: reduced ? 0 : t / 700 })}`
    + `<path d="M40 214Q170 196 300 222V250H40Z" fill="#3A2E1E"/></g>`
    + `<rect x="40" y="40" width="260" height="210" rx="10" fill="none" stroke="${INK}" stroke-width="4"/><path d="M170 40V250M40 145H300" stroke="${INK}" stroke-width="6"/>`
    + lightPool(prefix, 'desk', { cx: 470, cy: 330, rx: 360, ry: 170, color: '#FFE7A3', opacity: 0.22 });
  // The table, the case and its slots.
  const table = `<path d="M0 352H${NOMINAL[0]}V480H0Z" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M0 354H${NOMINAL[0]}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.6"/>`
    + `<rect x="0" y="352" width="${NOMINAL[0]}" height="128" fill="url(#${root}-dots)" opacity="0.25"/>`;
  const caseX = 230, caseY = 290, caseW = 380, caseH = 96;
  let slots = '';
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 6; c += 1) {
      const sx = caseX + 26 + c * 56, sy = caseY + 14 + r * 40;
      const full = r === 0 && (c === 2 || c === 3);
      slots += `<rect x="${f(sx)}" y="${f(sy)}" width="44" height="30" rx="7" fill="#0B0D12" stroke="${INK}" stroke-width="3"/>`
        + (full ? `<rect x="${f(sx + 4)}" y="${f(sy + 4)}" width="36" height="22" rx="5" fill="${MEDICAL.cyan}" opacity="${f(0.75 + 0.25 * pulse)}"/>`
          + `<path d="M${f(sx + 8)} ${f(sy + 8)}H${f(sx + 32)}" stroke="#FFFFFF" stroke-width="2.5" opacity="0.8"/>`
          + lightPool(prefix, `dose-${c}`, { cx: sx + 22, cy: sy + 15, rx: 70, ry: 54, color: MEDICAL.cyan, opacity: 0.35 * pulse }) : '');
    }
  }
  const medicineCase = `<path d="M${f(caseX + 10)} ${f(caseY)}L${f(caseX + 40)} ${f(caseY - 150)}H${f(caseX + caseW - 40)}L${f(caseX + caseW - 10)} ${f(caseY)}Z" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M${f(caseX + 50)} ${f(caseY - 136)}H${f(caseX + caseW - 50)}" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.7"/>`
    + `<rect x="${f(caseX + caseW / 2 - 40)}" y="${f(caseY - 104)}" width="80" height="44" rx="6" fill="${WARD.pillow}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${f(caseX + caseW / 2)} ${f(caseY - 96)}V${f(caseY - 68)}M${f(caseX + caseW / 2 - 14)} ${f(caseY - 82)}H${f(caseX + caseW / 2 + 14)}" stroke="${INK}" stroke-width="6"/>`
    + contact(caseX + caseW / 2, caseW + 60).replace('cy="446"', `cy="${f(caseY + caseH + 6)}"`)
    + `<rect x="${f(caseX)}" y="${f(caseY)}" width="${caseW}" height="${caseH}" rx="12" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="6"/>`
    + slots;
  // The spent vials, tipped over on the table.
  const spent = [[110, 404, -70], [160, 420, 20], [700, 410, 64], [752, 432, -12]].map(([vx, vy, a]) => `<g transform="rotate(${a} ${vx} ${vy})"><rect x="${vx - 9}" y="${vy - 22}" width="18" height="44" rx="6" fill="${WARD.pillow}" stroke="${INK}" stroke-width="3" opacity="0.85"/><rect x="${vx - 5}" y="${vy - 26}" width="10" height="8" rx="2" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="2"/></g>`).join('');
  const drip = sfxSvg('DRIP', { x: 170, y: 290, size: 40, rotate: -6, pop: reduced ? 1 : easeOutBack(beat(t % 1100, [0, 200]), 1.8), opacity: reduced ? 1 : 1 - beat(t % 1100, [600, 900]) });
  return shot(w, h, { far, middle: table + medicineCase, near: spent + drip }, { local: t, focus: [420, 330], push: 0.06 });
}

/** Panel 3 (now, aboard): the trace steadies, the patient sits up, and the panel's keypad lights the player's number. */
export function panelSteady(local, { w, h, prefix, seat, reduced = false }) {
  const t = local;
  const bed = berth({ x: 60, y: 330, w: 300 });
  const lit = easeOutCubic(beat(t, [380, 760]));
  const key = Number.isInteger(seat) && seat >= 1 && seat <= 9 ? seat : null;
  const pulse = beat(t, [120, 640]);
  const console = (() => {
    const x = 600, y = 70, w2 = 196, h2 = 330;
    let keys = '';
    for (let n = 1; n <= 9; n += 1) {
      const kx = x + 22 + ((n - 1) % 3) * 54, ky = y + 128 + Math.floor((n - 1) / 3) * 62;
      const on = n === key;
      keys += `<rect x="${f(kx)}" y="${f(ky)}" width="44" height="50" rx="9" fill="${on ? AMBER : WARD.key}" stroke="${INK}" stroke-width="4" opacity="${f(on ? 0.35 + 0.65 * lit : 1)}"/>`
        + `<rect x="${f(kx + 6)}" y="${f(ky + 6)}" width="32" height="8" rx="3" fill="#FFFFFF" opacity="${f(on ? 0.5 * lit : 0.22)}"/>`
        + (on && lit > 0 ? lightPool(prefix, `key-${n}`, { cx: kx + 22, cy: ky + 25, rx: 54, ry: 50, color: AMBER, opacity: 0.4 * lit }) : '');
    }
    return contact(x + w2 / 2, w2 + 20)
      + `<rect x="${f(x)}" y="${f(y)}" width="${w2}" height="${h2}" rx="16" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="6"/>`
      + `<path d="M${f(x + 14)} ${f(y + 6)}H${f(x + w2 - 14)}M${f(x + 6)} ${f(y + 14)}V${f(y + h2 - 14)}" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.75"/>`
      + `<rect x="${f(x + 18)}" y="${f(y + 18)}" width="${w2 - 36}" height="88" rx="8" fill="#0B0D12" stroke="${INK}" stroke-width="4"/>`
      + (key ? sevenSegment(key, { x: x + w2 / 2 - 24, y: y + 30, h: 64, lit }) : '')
      + keys
      + (lit > 0 && key ? lightPool(prefix, 'readout', { cx: x + w2 / 2, cy: y + 62, rx: 100, ry: 60, color: AMBER, opacity: 0.38 * lit }) : '');
  })();
  const far = viewport(prefix, { x: 40, y: 104, w: 220, h: 110, t: t + 2000 })
    + lightPool(prefix, 'backlight', { cx: 200, cy: 250, rx: 220, ry: 170, color: NIGHT.slat, opacity: 0.17 })
    + lightPool(prefix, 'cure', { cx: 200, cy: 260, rx: 160, ry: 140, color: MEDICAL.stable, opacity: 0.12 * lit });
  const middle = floor(prefix)
    + bed.svg
    + `<g transform="${reduced ? '' : breathe(t, [176, 352], 0.9, 0.012)}">${patient(`${prefix}-pt`, { gesture: 'bedSitting', at: [176, 352], scale: 1.18, rim: [-4, -3] })}</g>`
    // The berth's side skirt in front of the patient: they sit up in bed, legs under the blanket.
    + `<rect x="58" y="${bed.top + 22}" width="306" height="64" rx="6" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M64 ${bed.top + 27}H358" stroke="${NIGHT.steelLit}" stroke-width="2.5" opacity="0.9"/>`
    + blanket(prefix, { from: 112, to: 352, top: bed.top + 4, height: 40 })
    + (pulse > 0 && pulse < 1 ? `<ellipse cx="160" cy="250" rx="${f(40 + 70 * pulse)}" ry="${f(40 + 70 * pulse)}" fill="none" stroke="${MEDICAL.cyan}" stroke-width="5" opacity="${f(0.7 * (1 - pulse))}"/>` : '');
  const near = monitor(prefix, { x: 370, y: 96, local: t, stable: true, lamp: 1 })
    + console
    + (key ? sfxSvg('BEEP', { x: 520, y: 300, size: 40, rotate: -8, pop: easeOutBack(beat(t, [380, 560]), 1.8), opacity: 1 }) : '');
  return shot(w, h, { far, middle, near }, { local: t, focus: [300, 300] });
}

/** The Doctor's panels, in order. */
export const DOCTOR_PANELS = Object.freeze([panelColony, panelDoses, panelSteady]);

// mothership:dev-only
//
// The Doctor's three panels (docs/design/cinematic/role-reveal.md, "Doctor"): the medic who holds the
// ship's last two doses.
//   1  the Hospital at night: a patient's silhouette on a berth, the monitor's trace stuttering, its
//      amber lamp blinking in a slow, safe rhythm (BEEP)
//   2  the ceiling opens: the ward's iris dilates, the medical drone descends on its searchlight, and
//      one of the injector's two vials empties toward it (WHIRR)
//   3  the trace steadies, the patient sits up, and the Hospital panel's keypad lights one number:
//      the player's own (the panel's code is the Doctor's player number, P21 and P22)
// The rules they teach: two shared injections, the Doctor's Rescue, the panel's code. The drone and
// the medical palette are the Hospital films' own (board-v2/fx/medical.mjs), so the player meets
// them here before the game. Every figure is an ink silhouette: no face, number or name.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat }) -> SVG
// markup in the panel's own units, drawn for a nominal 828 x 480 panel and scaled to its height.

import { DRONE, MEDICAL, droneSvg } from '../../../board-v2/fx/medical.mjs';
import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, AMBER, lightCone, lightPool, stars } from '../../lib/comic.mjs';
import { beat, bell, clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp, rand } from '../../lib/ease.mjs';
import { figureItems, placeSvg } from '../../lib/scene.mjs';
import { NIGHT, lampFlicker, sfxSvg } from './art.mjs';

const f = v => Number((+v).toFixed(2));
const NOMINAL = Object.freeze([828, 480]);

/** The panel's content scaled from the nominal 828 x 480 to its height, centred. */
const fit = (w, h, body) => {
  const k = h / NOMINAL[1];
  return `<g transform="translate(${f(w / 2)} ${f(h / 2)}) scale(${f(k)}) translate(${f(-NOMINAL[0] / 2)} ${f(-NOMINAL[1] / 2)})">${body}</g>`;
};

/** An ink silhouette of a crew figure (any character: the silhouette shows none), optionally rotated about its feet. */
function silhouette(prefix, { gesture, at, scale, rotate = 0, mirror = false }) {
  const items = figureItems({ character: 'c1', sk: skeletonOf(gesture), at, scale, mirror, depth: 1, prefix });
  return `<g filter="url(#${prefix.split('-p')[0]}-sil)"${rotate ? ` transform="rotate(${f(rotate)} ${f(at[0])} ${f(at[1])})"` : ''}>${items.map(item => item.svg).join('')}</g>`;
}

/** A viewport on the ward wall: stars behind slatted blinds, the slats' light the page's own. */
function viewport(prefix, { x, y, w, h, t }) {
  const id = `${prefix}-vp`;
  let slats = '';
  for (let sy = y + 14; sy < y + h - 8; sy += 26) slats += `<rect x="${f(x + 8)}" y="${f(sy)}" width="${f(w - 16)}" height="12" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="2"/>`;
  return `<defs><clipPath id="${id}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22"/></clipPath></defs>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="#04050A"/>`
    + `<g clip-path="url(#${id})">${stars({ x, y, w, h, count: 40, seed: 53, t })}${slats}</g>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="none" stroke="${NIGHT.steel}" stroke-width="10"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="22" fill="none" stroke="${INK}" stroke-width="4"/>`;
}

/** Bars of slat light falling across the panel from the viewport, low and pale. */
function slatLight(prefix, { from, w, h, opacity = 0.12 }) {
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    const x0 = from[0] + i * 70;
    out += `<polygon points="${f(x0)},${f(from[1])} ${f(x0 + 40)},${f(from[1])} ${f(x0 + 260)},${f(h)} ${f(x0 + 170)},${f(h)}" fill="${NIGHT.slat}" opacity="${f(opacity)}" style="mix-blend-mode:screen"/>`;
  }
  return out;
}

/** A berth in side view: headboard, frame, mattress, pillow. Returns { svg, top } (the mattress top). */
function berth({ x, y, w }) {
  const top = y;
  const svg = `<rect x="${f(x - 18)}" y="${f(y - 70)}" width="20" height="120" rx="6" fill="${NIGHT.steel}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(x + 12)} ${f(y + 48)}V${f(y + 120)}M${f(x + w - 24)} ${f(y + 48)}V${f(y + 120)}" stroke="${INK}" stroke-width="9"/>`
    + `<rect x="${f(x)}" y="${f(y + 26)}" width="${f(w)}" height="24" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="5"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="30" rx="8" fill="#1B2747" stroke="${INK}" stroke-width="5"/>`
    + `<ellipse cx="${f(x + 50)}" cy="${f(y - 4)}" rx="46" ry="16" fill="#C9D2DC" stroke="${INK}" stroke-width="4"/>`;
  return { svg, top };
}

/** The blanket over a patient from `from` to `to` along the mattress, its top edge caught by the light. */
function blanket(prefix, { from, to, top, height }) {
  return `<path d="M${f(from)} ${f(top - height)}Q${f((from + to) / 2)} ${f(top - height - 14)} ${f(to)} ${f(top - height * 0.55)}L${f(to + 8)} ${f(top + 4)}L${f(from - 6)} ${f(top + 4)}Z" fill="#2A3550" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M${f(from)} ${f(top - height)}Q${f((from + to) / 2)} ${f(top - height - 14)} ${f(to)} ${f(top - height * 0.55)}" fill="none" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.6"/>`
    + `<path d="M${f(from)} ${f(top - height)}Q${f((from + to) / 2)} ${f(top - height - 14)} ${f(to)} ${f(top - height * 0.55)}L${f(to + 8)} ${f(top + 4)}L${f(from - 6)} ${f(top + 4)}Z" fill="url(#${prefix.split('-p')[0]}-dots)" opacity="0.35"/>`;
}

/**
 * An ECG trace across [x0, x1] at baseline y: `stable` regular beats, else stuttering ones (uneven
 * spacing and height, with flat stretches). A sweep head at `head` (0..1 of the width) with the
 * monitor's dark gap ahead of it.
 */
function ecgSvg({ x0, x1, y, stable, head, color, seed = 61 }) {
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
  return `<path d="${line}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round" opacity="0.9"/>`
    + `<rect x="${f(hx + 4)}" y="${f(y - 44)}" width="22" height="70" fill="${MEDICAL.screen}"/>`
    + `<circle cx="${f(hx)}" cy="${f(y)}" r="4.5" fill="#FFFFFF"/>`;
}

/** The heart monitor on its stand: steel box, screen with its grid, trace and lamp. */
function monitor(prefix, { x, y, local, stable, lamp }) {
  const w = 210, h = 130;
  let grid = '';
  for (let gx = x + 20; gx < x + w - 14; gx += 22) grid += `M${f(gx)} ${f(y + 14)}V${f(y + h - 14)}`;
  for (let gy = y + 24; gy < y + h - 14; gy += 22) grid += `M${f(x + 14)} ${f(gy)}H${f(x + w - 14)}`;
  const head = ((local / 1600) % 1);
  const color = stable ? MEDICAL.stable : MEDICAL.amber;
  return `<path d="M${f(x + w / 2)} ${f(y + h)}V${f(y + h + 170)}M${f(x + w / 2 - 40)} ${f(y + h + 170)}H${f(x + w / 2 + 40)}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="12" fill="${NIGHT.steel}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="${f(x + 12)}" y="${f(y + 12)}" width="${w - 24}" height="${h - 24}" rx="6" fill="${MEDICAL.screen}"/>`
    + `<path d="${grid}" stroke="${MEDICAL.grid}" stroke-width="1.2" opacity="0.7"/>`
    + ecgSvg({ x0: x + 16, x1: x + w - 16, y: y + h / 2 + 10, stable, head, color })
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

/** Panel 1: the Hospital at night. */
export function panelNight(local, { w, h, prefix }) {
  const t = local;
  const bed = berth({ x: 120, y: 318, w: 380 });
  const body = viewport(prefix, { x: 40, y: 34, w: 280, h: 150, t })
    + slatLight(prefix, { from: [80, 184], w: NOMINAL[0], h: NOMINAL[1] })
    + `<rect x="0" y="438" width="${NOMINAL[0]}" height="42" fill="${NIGHT.deep}"/><rect x="0" y="438" width="${NOMINAL[0]}" height="42" fill="url(#${prefix.split('-p')[0]}-dots)" opacity="0.35"/>`
    + bed.svg
    + silhouette(`${prefix}-pt`, { gesture: 'stand', at: [452, 296], scale: 1.18, rotate: -90 })
    + blanket(prefix, { from: 260, to: 498, top: bed.top, height: 30 })
    + monitor(prefix, { x: 570, y: 96, local: t, stable: false, lamp: lampFlicker(t, 3) })
    + sfxSvg('BEEP', { x: 650, y: 78, size: 44, rotate: -8, pop: easeOutBack(beat(t % 900, [0, 180]), 1.8), opacity: 1 - beat(t % 900, [480, 760]) });
  return fit(w, h, body);
}

/** Panel 2: the ceiling opens and the drone descends; one vial empties toward it. */
export function panelCeiling(local, { w, h, prefix }) {
  const t = local;
  const open = easeOutCubic(beat(t, [60, 520]));
  const descend = easeInOutCubic(beat(t, [260, 1050]));
  const ds = 1.1;
  const dw = DRONE.w * ds, dh = DRONE.h * ds;
  const dx = 414 - dw / 2, dy = lerp(-dh * 0.55, 150, descend) + Math.sin(t / 260) * 3 * descend;
  const frame = t < 700 ? 'folded' : t < 1050 ? 'open' : 'charge';
  const lens = [dx + DRONE.lens[0] * ds, dy + DRONE.lens[1] * ds];
  const searching = clamp01((t - 620) / 300);
  const drain = easeInOutCubic(beat(t, [650, 1150]));
  // The ceiling: plates in perspective, the iris in the middle.
  let seams = '';
  for (let i = -6; i <= 6; i += 1) seams += `M${f(414 + i * 40)} 0L${f(414 + i * 120)} 150`;
  const iris = (() => {
    const rx = 120, ry = 36, cx = 414, cy = 74;
    let blades = '';
    for (let i = 0; i < 8; i += 1) {
      const a = (i * 45 + open * 60) * Math.PI / 180;
      const r0 = 1 - open * 0.75;
      blades += `<path d="M${f(cx + Math.cos(a) * rx)} ${f(cy + Math.sin(a) * ry)}Q${f(cx + Math.cos(a + 0.6) * rx * 0.6)} ${f(cy + Math.sin(a + 0.6) * ry * 0.6)} ${f(cx + Math.cos(a + 1.1) * rx * r0 * 0.4)} ${f(cy + Math.sin(a + 1.1) * ry * r0 * 0.4)}" fill="none" stroke="${NIGHT.steel}" stroke-width="4" opacity="${f(1 - open * 0.6)}"/>`;
    }
    return `<ellipse cx="${cx}" cy="${cy + 3}" rx="${rx + 10}" ry="${ry + 8}" fill="${INK}"/>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * Math.max(0.08, open))}" ry="${f(ry * Math.max(0.08, open))}" fill="${MEDICAL.lens}" opacity="${f(0.25 + 0.75 * open)}"/>`
      + blades;
  })();
  const injector = (() => {
    const x = 500, y = 366;
    const vial = (vx, level, lit) => `<rect x="${f(vx)}" y="${f(y - 18)}" width="54" height="36" rx="8" fill="${MEDICAL.screen}" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="${f(vx + 5)}" y="${f(y - 13 + 26 * (1 - level))}" width="44" height="${f(26 * level)}" rx="5" fill="${MEDICAL.cyan}" opacity="${f(0.55 + 0.45 * lit)}"/>`;
    return `<g transform="rotate(-14 ${x + 120} ${y})">`
      + `<rect x="${f(x - 40)}" y="${f(y - 9)}" width="60" height="18" rx="6" fill="${NIGHT.steel}" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="${f(x + 10)}" y="${f(y - 30)}" width="240" height="60" rx="18" fill="#C6CDD4" stroke="${INK}" stroke-width="6"/>`
      + `<rect x="${f(x + 10)}" y="${f(y - 30)}" width="240" height="60" rx="18" fill="url(#${prefix.split('-p')[0]}-dots)" opacity="0.3"/>`
      + vial(x + 44, 1 - drain, 1 - drain) + vial(x + 136, 1, 1)
      + `<rect x="${f(x + 250)}" y="${f(y - 14)}" width="40" height="28" rx="6" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="4"/></g>`;
  })();
  const nozzle = [478, 402];
  const stream = drain > 0 && drain < 1
    ? `<path d="M${f(nozzle[0])} ${f(nozzle[1])}Q${f(470)} ${f(260)} ${f(lens[0])} ${f(lens[1] + 20)}" fill="none" stroke="${MEDICAL.cyan}" stroke-width="5" stroke-dasharray="4 14" stroke-dashoffset="${f(-t / 12)}" stroke-linecap="round" opacity="${f(bell(drain))}"/>` : '';
  const body = `<rect x="0" y="0" width="${NOMINAL[0]}" height="150" fill="${NIGHT.steelDark}"/><path d="${seams}" stroke="${INK}" stroke-width="3" opacity="0.7"/>`
    + `<rect x="0" y="146" width="${NOMINAL[0]}" height="8" fill="${INK}"/>`
    + iris
    + (open > 0 ? lightCone(prefix, 'iris', { from: [414, 80], to: [414, 300], spread: 140, color: MEDICAL.lens, opacity: 0.18 * open, near: 90 }) : '')
    + (searching > 0 ? lightCone(prefix, 'search', { from: [lens[0], lens[1] + 8], to: [414, 480], spread: 180, color: MEDICAL.lens, opacity: 0.38 * searching, near: 10 })
      + lightPool(prefix, 'search-pool', { cx: 414, cy: 470, rx: 210, ry: 40, color: MEDICAL.glow, opacity: 0.45 * searching }) : '')
    + placeSvg(droneSvg(frame), { x: dx, y: dy, width: dw, height: dh, scope: `${prefix}-drone` })
    + stream + injector
    + sfxSvg('WHIRR', { x: 640, y: 128, size: 48, rotate: -10, pop: easeOutBack(beat(t, [320, 520]), 1.8), opacity: 1 - beat(t, [1000, 1250]) });
  return fit(w, h, body);
}

/** Panel 3: the trace steadies, the patient sits up, and the panel's keypad lights the player's number. */
export function panelSteady(local, { w, h, prefix, seat }) {
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
      keys += `<rect x="${f(kx)}" y="${f(ky)}" width="44" height="50" rx="9" fill="${on ? AMBER : '#2A3550'}" stroke="${INK}" stroke-width="4" opacity="${f(on ? 0.35 + 0.65 * lit : 1)}"/>`
        + `<rect x="${f(kx + 6)}" y="${f(ky + 6)}" width="32" height="8" rx="3" fill="#FFFFFF" opacity="${f(on ? 0.5 * lit : 0.12)}"/>`;
    }
    return `<rect x="${f(x)}" y="${f(y)}" width="${w2}" height="${h2}" rx="16" fill="${NIGHT.steel}" stroke="${INK}" stroke-width="6"/>`
      + `<rect x="${f(x + 18)}" y="${f(y + 18)}" width="${w2 - 36}" height="88" rx="8" fill="#0B0D12" stroke="${INK}" stroke-width="4"/>`
      + (key ? sevenSegment(key, { x: x + w2 / 2 - 24, y: y + 30, h: 64, lit }) : '')
      + keys
      + (lit > 0 && key ? lightPool(prefix, 'readout', { cx: x + w2 / 2, cy: y + 62, rx: 90, ry: 50, color: AMBER, opacity: 0.3 * lit }) : '');
  })();
  const body = viewport(prefix, { x: 40, y: 34, w: 220, h: 120, t: t + 2000 })
    + `<rect x="0" y="438" width="${NOMINAL[0]}" height="42" fill="${NIGHT.deep}"/>`
    + bed.svg
    + silhouette(`${prefix}-pt`, { gesture: 'bedSitting', at: [176, 352], scale: 1.18 })
    // The berth's side skirt in front of the patient: they sit up in bed, legs under the blanket.
    + `<rect x="58" y="${bed.top + 22}" width="306" height="64" rx="6" fill="${NIGHT.steelDark}" stroke="${INK}" stroke-width="5"/>`
    + blanket(prefix, { from: 112, to: 352, top: bed.top + 4, height: 40 })
    + (pulse > 0 && pulse < 1 ? `<ellipse cx="160" cy="250" rx="${f(40 + 70 * pulse)}" ry="${f(40 + 70 * pulse)}" fill="none" stroke="${MEDICAL.cyan}" stroke-width="5" opacity="${f(0.7 * (1 - pulse))}"/>` : '')
    + monitor(prefix, { x: 370, y: 96, local: t, stable: true, lamp: 1 })
    + console;
  return fit(w, h, body);
}

/** The Doctor's panels, in order. */
export const DOCTOR_PANELS = Object.freeze([panelNight, panelCeiling, panelSteady]);

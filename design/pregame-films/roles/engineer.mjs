// mothership:dev-only
//
// The Engineer's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The shipwright who knows where every wire runs."
//   1 · memory · The Titan yards. A ship's ribs rise on the slip under Saturn's rings, sparks shower
//       from the welders in the scaffolds, and the player's own character stands on the gantry with
//       the plans. Narration: "The Titan yards."
//   2 · memory · Every wire. A gloved hand traces a cable bundle into a bulkhead, and the signal
//       clamp clicks on, its light blinking: CLICK. Narration: "You know every wire."
//   3 · aboard · The photograph. Across the corridor, the room opposite through its window, two
//       silhouettes in it. Viewfinder brackets close on it, the shutter blinks dark (ink, never a
//       flash of light), and the print slides out and develops the room.
// The capture is of the whole room, never one target (library group 1's brackets, dark shutter and
// print). Nobody is anybody: the two in the room are silhouettes.

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { inkCanvas } from '../../crew-drawing/source/ink.mjs';
import { litFigure } from '../kit/cast.mjs';
import { glow, halftone, linear, pool, radial, sparks } from '../kit/fx.mjs';
import { ease, f, f3, lerp, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, circle, gadgetOf, inked, markOf, nobody, poly, soundWord } from './common.mjs';

export const ENGINEER_CAPTIONS = Object.freeze([['The Titan yards.'], ['You know', 'every wire.']]);

// ---------- the card's mark and the gadget ----------

/** The Engineer's mark on the card on the desk: a spanner, paper on the dark plate. */
export function engineerMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.42, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const a = -Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
  const at = (x, y) => [cx + (x * ca - y * sa) * s, cy + (x * sa + y * ca) * s];
  const handle = poly([at(-0.95, -0.13), at(0.45, -0.13), at(0.45, 0.13), at(-0.95, 0.13)]);
  const [hx, hy] = at(0.62, 0), [ex, ey] = at(-0.95, 0);
  const jaw = poly([at(0.6, -0.1), at(1.02, -0.1), at(1.02, 0.1), at(0.6, 0.1)]);
  return markOf(D, 'en-mark', face, u, { solid: [handle, circle(hx, hy, s * 0.36), circle(ex, ey, s * 0.2)], holes: [jaw, circle(ex, ey, s * 0.08)] });
}

/** The signal clamp the role card's device draws, without the hand or its team accent: its lamp catches the light. */
export function engineerGadget() {
  return gadgetOf('bf-gadget-en', { box: [40, 8, 90, 116], grip: [72, 92], glint: [72, 17] }, cv => {
    cv.form([[66, 66], [78, 66], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 141, tension: 0.4 });
    // The C of the clamp, its screw and pad.
    cv.form([[50, 22], [94, 22], [98, 28], [98, 62], [86, 62], [86, 34], [62, 34], [62, 62], [50, 62], [46, 56], [46, 28]], STEEL.body, { weight: 2.8, depth: 5, seed: 142, tension: 0.2 });
    cv.form([[88, 62], [96, 62], [96, 70], [88, 70]], STEEL.dark, { weight: 2, depth: 2, seed: 143, tension: 0.3 });
    cv.form([[52, 62], [60, 62], [60, 70], [52, 70]], STEEL.dark, { weight: 2, depth: 2, seed: 144, tension: 0.3 });
    cv.form([[62, 58], [82, 58], [82, 70], [62, 70]], STEEL.deep, { weight: 2, depth: 2, seed: 145, tension: 0.2 });
    // The signal lamp on its top.
    cv.form([[66, 12], [78, 12], [80, 22], [64, 22]], STEEL.glass, { weight: 2.2, depth: 1, seed: 146, tension: 0.4, hatch: false });
    cv.flat([[68, 14], [76, 14], [77, 20], [67, 20]], STEEL.lamp, { opacity: 0.95, tension: 0.5 });
    cv.flat([[52, 25], [92, 25], [92, 28], [52, 28]], STEEL.shine, { opacity: 0.75, tension: 0.2 });
  });
}

// ---------- panel 1: the Titan yards ----------

function titanYards(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('en1');
  // The sky over the yards, and Saturn low with its rings.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'en1-sky', [[0, '#191512'], [0.6, '#2A221C'], [1, '#3A2E24']])}"/>`;
  const rs = rng(61);
  for (let i = 0; i < 40; i += 1) back += `<circle cx="${f(rs() * w)}" cy="${f(rs() * h * 0.5)}" r="${f((0.4 + rs() * 0.7) * k)}" fill="#F4ECDA" opacity="${f3(0.3 + 0.6 * rs())}"/>`;
  const [sx, sy, sr] = [w * 0.6, h * 0.17, 30 * k];
  const ring = (front) => `<path d="M${f(sx - sr * 2.1)} ${f(sy)}A${f(sr * 2.1)} ${f(sr * 0.5)} -12 0 ${front ? 0 : 1} ${f(sx + sr * 2.1)} ${f(sy - sr * 0.1)}" fill="none" stroke="#CDB894" stroke-width="${f(5 * k)}" opacity="0.85" transform="rotate(-12 ${f(sx)} ${f(sy)})"/>`;
  back += ring(false) + `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${radial(D, 'en1-saturn', [[0, '#E6D4AE'], [0.7, '#B39A70'], [1, '#6E5C44']], { cx: 0.38, cy: 0.35 })}" stroke="${INK}" stroke-width="${f(1.6 * k)}"/>`;
  for (const [dy, op] of [[-0.3, 0.25], [0.05, 0.2], [0.35, 0.18]]) back += `<path d="M${f(sx - sr * 0.95)} ${f(sy + sr * dy)}Q${f(sx)} ${f(sy + sr * (dy + 0.12))} ${f(sx + sr * 0.95)} ${f(sy + sr * dy)}" stroke="#6E5C44" stroke-width="${f(3 * k)}" fill="none" opacity="${op}"/>`;
  back += ring(true);
  // The slip and the ship's ribs rising on it.
  back += `<path d="M0 ${f(h * 0.78)}H${f(w)}V${f(h)}H0Z" fill="#1A1410"/>`;
  for (let i = 0; i < 8; i += 1) {
    const x = w * (0.42 + i * 0.075), top = h * (0.18 + Math.abs(i - 3.5) * 0.04);
    cv.line([[x - 20 * k, h * 0.78], [x - 26 * k, (top + h * 0.78) / 2], [x, top], [x + 26 * k, (top + h * 0.78) / 2], [x + 20 * k, h * 0.78]], { weight: 3 * k, color: '#6E5C48', taper: 'none', tension: 0.9 });
  }
  cv.line([[w * 0.36, h * 0.78], [w * 1.02, h * 0.74]], { weight: 4 * k, color: '#5A4A3A', taper: 'none' });
  // The scaffolds, and the welders' sparks showering from them.
  let scaffold = '';
  for (const x of [w * 0.47, w * 0.78]) {
    scaffold += `<path d="M${f(x)} ${f(h * 0.78)}V${f(h * 0.3)}M${f(x + 30 * k)} ${f(h * 0.78)}V${f(h * 0.3)}" stroke="#2A221B" stroke-width="${f(2.4 * k)}"/>`;
    for (let y = h * 0.34; y < h * 0.78; y += 22 * k) scaffold += `<path d="M${f(x)} ${f(y)}H${f(x + 30 * k)}M${f(x)} ${f(y)}L${f(x + 30 * k)} ${f(y + 22 * k)}" stroke="#2A221B" stroke-width="${f(1.4 * k)}"/>`;
  }
  let weld = '';
  for (const [i, [x, y]] of [[w * 0.52, h * 0.38], [w * 0.83, h * 0.52], [w * 0.66, h * 0.28]].entries()) {
    const flick = reduced ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(t / (70 + i * 23) + i));
    weld += glow(D, `en1-arc${i}`, { cx: x, cy: y, r: 22 * k, color: '#FFF4D8', opacity: flick });
    if (!reduced) for (const t0 of [0, 260, 520, 780, 1040]) weld += sparks({ seed: 71 + i * 7 + t0, n: 7, t, t0: t0 + i * 90, at: [x, y], speed: [0.08, 0.2], angle: Math.PI / 2, spread: Math.PI * 0.8, gravity: 0.0004, life: [400, 800], color: '#FFE3A0', width: 1.2 * k });
  }
  // The gantry rail in front, and the character on it with the plans.
  const scale = (h * 0.95) / 233;
  const hero = litFigure(D, 'en1-hero', {
    c: character, sk: skeletonOf('tablet'), at: [w * 0.17, h * 1.14], scale, t, reduced,
    ambient: { color: '#4A3A2A', strength: 0.5 },
    key: { at: [w * 0.55, h * 0.4], z: 60 * k, color: '#FFE1B0', gain: 1.5 },
    rim: { dx: 0.8, dy: -0.6, color: '#F2DDB4', width: 2.6 * k, gain: 0.85 },
  });
  const rail = `<path d="M${f(-4 * k)} ${f(h * 0.84)}H${f(w * 0.46)}" stroke="${INK}" stroke-width="${f(6 * k)}"/><path d="M${f(-4 * k)} ${f(h * 0.84)}H${f(w * 0.46)}" stroke="#5A4A3A" stroke-width="${f(3 * k)}"/>`
    + [0.06, 0.18, 0.3, 0.42].map(x => `<path d="M${f(w * x)} ${f(h * 0.84)}V${f(h)}" stroke="${INK}" stroke-width="${f(4 * k)}"/>`).join('');
  return back + inked(cv, w, h) + scaffold + weld + pool(D, 'en1-yardglow', { cx: w * 0.66, cy: h * 0.5, rx: w * 0.4, ry: h * 0.4, color: '#FFD58E', opacity: 0.25 }) + hero + rail;
}

// ---------- panel 2: every wire ----------

function everyWire(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  // The bulkhead, its panel open, a cable bundle running into it.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'en2-wall', [[0, '#2E2721'], [0.6, '#3A3129'], [1, '#1C1712']])}"/>`;
  back += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'en2-dots', { size: 4 * k, r: 0.8 * k, color: '#14100C' })}" opacity="0.3"/>`;
  for (const [x, y] of [[w * 0.06, h * 0.08], [w * 0.94, h * 0.08], [w * 0.06, h * 0.92], [w * 0.94, h * 0.92]]) back += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3 * k)}" fill="#5A4C3E" stroke="${INK}" stroke-width="${f(1 * k)}"/>`;
  back += `<rect x="${f(w * 0.62)}" y="${f(h * 0.18)}" width="${f(w * 0.3)}" height="${f(h * 0.64)}" fill="#120E0B" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`;
  back += pool(D, 'en2-pool', { cx: w * 0.45, cy: h * 0.5, rx: w * 0.5, ry: h * 0.6, color: '#FFD58E', opacity: 0.35, core: 0.25 });
  // The bundle: six cables, side by side, curving into the panel.
  let cables = '';
  const tones = ['#7A6A58', '#9A8A70', '#5E5042', '#B3A27F', '#6E5E4C', '#8C7B62'];
  for (let i = 0; i < 6; i += 1) {
    const y = h * 0.4 + i * 6 * k;
    cables += `<path d="M${f(-10 * k)} ${f(y + 30 * k)}C${f(w * 0.3)} ${f(y + 26 * k)} ${f(w * 0.45)} ${f(y)} ${f(w * 0.66)} ${f(y - 4 * k)}" fill="none" stroke="${INK}" stroke-width="${f(7 * k)}"/><path d="M${f(-10 * k)} ${f(y + 30 * k)}C${f(w * 0.3)} ${f(y + 26 * k)} ${f(w * 0.45)} ${f(y)} ${f(w * 0.66)} ${f(y - 4 * k)}" fill="none" stroke="${tones[i]}" stroke-width="${f(4.4 * k)}"/>`;
  }
  // The gloved hand tracing along the bundle, then the clamp clicking on.
  const trace = reduced ? 1 : ease.inOutCubic(progress(t, 60, 560));
  const hx = lerp(w * 0.12, w * 0.5, trace), hy = h * 0.42 + lerp(24, 6, trace) * k;
  const hand = `<g transform="translate(${f(hx)} ${f(hy)}) rotate(-8)">`
    + `<path d="M${f(-150 * k)} ${f(-30 * k)}L${f(-10 * k)} ${f(-14 * k)}L${f(-4 * k)} ${f(10 * k)}L${f(-150 * k)} ${f(0)}Z" fill="#26201B" stroke="${INK}" stroke-width="${f(2 * k)}"/>`
    + `<path d="M${f(-12 * k)} ${f(-16 * k)}C${f(4 * k)} ${f(-22 * k)} ${f(26 * k)} ${f(-16 * k)} ${f(34 * k)} ${f(-6 * k)}C${f(38 * k)} ${f(2 * k)} ${f(28 * k)} ${f(10 * k)} ${f(-6 * k)} ${f(12 * k)}Z" fill="#3A302A" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(14 * k)} ${f(-6 * k)}L${f(38 * k)} ${f(-2 * k)}" stroke="${INK}" stroke-width="${f(7 * k)}" stroke-linecap="round"/><path d="M${f(14 * k)} ${f(-6 * k)}L${f(38 * k)} ${f(-2 * k)}" stroke="#3A302A" stroke-width="${f(4.4 * k)}" stroke-linecap="round"/>`
    + `</g>`;
  const on = reduced ? 1 : progress(t, 600, 680);
  const [cx, cy] = [w * 0.56, h * 0.5];
  const blink = reduced ? 1 : on > 0 && Math.floor((t - 600) / 220) % 2 === 0 ? 1 : 0.25;
  const clamp = on <= 0 ? '' : `<g transform="translate(${f(cx)} ${f(cy + (1 - on) * -14 * k)})">`
    + `<path d="M${f(-16 * k)} ${f(-26 * k)}H${f(16 * k)}V${f(26 * k)}H${f(8 * k)}V${f(-16 * k)}H${f(-8 * k)}V${f(26 * k)}H${f(-16 * k)}Z" fill="#9AA5AE" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
    + `<rect x="${f(-6 * k)}" y="${f(-36 * k)}" width="${f(12 * k)}" height="${f(10 * k)}" rx="${f(2 * k)}" fill="${blink > 0.5 ? '#FFD27A' : '#6B5A3A'}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `</g>` + (blink > 0.5 ? glow(D, 'en2-lamp', { cx, cy: cy - 31 * k, r: 26 * k, color: '#FFD27A', opacity: 0.85 * on }) : '');
  const click = soundWord(D, 'en2-click', 'CLICK', { x: w * 0.78, y: h * 0.14, size: 19 * k, k: reduced ? 1 : progress(t, 620, 820), rotate: 6 });
  return back + cables + clamp + hand + click;
}

// ---------- panel 3: the photograph ----------

function photograph(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1600 : local;
  // The corridor's far wall, and the room opposite through its window, two silhouettes in it.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'en3-wall', [[0, '#121A2A'], [0.7, '#182134'], [1, '#0A0F1A']])}"/>`;
  back += `<path d="M0 ${f(h * 0.82)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'en3-floor', [[0, '#111827'], [1, '#04070D']])}"/>`;
  const [rx, ry, rw, rh] = [w * 0.22, h * 0.16, w * 0.56, h * 0.56];
  const room = (id, scale = 1) => {
    let r = `<rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" fill="${linear(D, `${id}-in`, [[0, '#3A4A5A'], [1, '#1E2836']])}"/>`;
    r += pool(D, `${id}-light`, { cx: rx + rw / 2, cy: ry + rh * 0.3, rx: rw * 0.5, ry: rh * 0.6, color: '#E6ECF5', opacity: 0.35 });
    const s = (rh * 0.95) / 233;
    r += nobody(D, `${id}-a`, { sk: skeletonOf('standFolded'), at: [rx + rw * 0.32, ry + rh * 1.08], scale: s, t, reduced, color: '#0B1119', rim: { dx: -0.7, dy: -0.7, color: '#C9D4E6', width: 2 * k * scale, gain: 0.5 } });
    r += nobody(D, `${id}-b`, { sk: skeletonOf('standBack'), at: [rx + rw * 0.7, ry + rh * 1.08], scale: s, t, reduced, flip: true, color: '#0B1119', rim: { dx: 0.7, dy: -0.7, color: '#C9D4E6', width: 2 * k * scale, gain: 0.5 } });
    return r;
  };
  D.use('en3-window', `<clipPath id="en3-window"><rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}"/></clipPath>`);
  back += `<g clip-path="url(#en3-window)">${room('en3-room')}</g>`;
  back += `<rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" fill="none" stroke="#2B3549" stroke-width="${f(8 * k)}"/><rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" fill="none" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`;
  back += `<path d="M${f(rx + 10 * k)} ${f(ry + 8 * k)}L${f(rx + rw * 0.35)} ${f(ry + rh * 0.5)}" stroke="#DDE5F0" stroke-width="${f(2 * k)}" opacity="0.18"/>`;
  // The viewfinder's brackets closing on the whole window.
  const close = reduced ? 1 : ease.outCubic(progress(t, 120, 520));
  const pad = lerp(w * 0.2, 6 * k, close), arm = 22 * k;
  let brackets = '';
  for (const [x, y, dx, dy] of [[rx - pad, ry - pad, 1, 1], [rx + rw + pad, ry - pad, -1, 1], [rx - pad, ry + rh + pad, 1, -1], [rx + rw + pad, ry + rh + pad, -1, -1]]) {
    brackets += `<path d="M${f(x)} ${f(y + dy * arm)}V${f(y)}H${f(x + dx * arm)}" fill="none" stroke="${INK}" stroke-width="${f(5 * k)}" opacity="${f3(close)}"/><path d="M${f(x)} ${f(y + dy * arm)}V${f(y)}H${f(x + dx * arm)}" fill="none" stroke="#F3E9D6" stroke-width="${f(2.4 * k)}" opacity="${f3(close)}"/>`;
  }
  // The shutter blinks dark: ink, never a flash of light.
  const shut = reduced ? 0 : progress(t, 620, 680) - progress(t, 700, 780);
  const shutter = shut > 0 ? `<rect width="${f(w)}" height="${f(h)}" fill="${INK}" opacity="${f3(Math.min(1, shut * 1.1))}"/>` : '';
  // The print slides out and the room develops on it.
  const slide = reduced ? 1 : ease.outCubic(progress(t, 820, 1220));
  const develop = reduced ? 1 : progress(t, 1000, 1700);
  let print = '';
  if (slide > 0) {
    const pw = w * 0.36, ph = h * 0.5, px = w * 0.62, py = lerp(h * 1.05, h * 0.46, slide);
    const sc = pw / (rw + 20 * k);
    D.use('en3-print', `<clipPath id="en3-print"><rect x="${f(px + 6 * k)}" y="${f(py + 6 * k)}" width="${f(pw - 12 * k)}" height="${f(ph * 0.72)}"/></clipPath>`);
    print = `<g transform="rotate(4 ${f(px + pw / 2)} ${f(py + ph / 2)})">`
      + `<rect x="${f(px + 6 * k)}" y="${f(py + 8 * k)}" width="${f(pw)}" height="${f(ph)}" fill="#000" opacity="0.5"/>`
      + `<rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" fill="#EFE7D6" stroke="${INK}" stroke-width="${f(2 * k)}"/>`
      + `<g clip-path="url(#en3-print)"><rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" fill="#2A3242"/><g opacity="${f3(develop)}" transform="translate(${f(px + 6 * k - (rx - 10 * k) * sc)} ${f(py + 6 * k - (ry - 10 * k) * sc)}) scale(${f3(sc)})">${room('en3-dev', 1 / sc)}</g><rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" fill="#F5EFE2" opacity="${f3(0.85 * (1 - develop))}"/></g>`
      + `</g>`;
  }
  return back + brackets + shutter + print;
}

/** The Engineer's panels, as functions of each panel's size and local time. */
export function engineerPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => titanYards(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => everyWire(D, { w, h, local, reduced }),
    ({ w, h, local }) => photograph(D, { w, h, local, reduced }),
  ];
}

/** The Engineer's film: the card's mark, the gadget, the three panels and the narration. */
export const ENGINEER = Object.freeze({ mark: engineerMark, gadget: engineerGadget, panels: engineerPanels, captions: ENGINEER_CAPTIONS });

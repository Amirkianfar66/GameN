// mothership:dev-only
//
// The Hacker's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The lock-breaker the Red Planet paid in advance."
//   1 · memory · The data dens of Phobos. A den lit by its screens, cables hanging like vines, and
//       the player's own character on a stool at a laptop; on the big screen four padlocks open one
//       by one. Narration: "The data dens of Phobos."
//   2 · memory · Paid in advance. A credit chip slides across the table under a lamp and stops,
//       sealed in wax pressed with a planet and its ring. Narration: "Paid in advance."
//   3 · aboard · The Code. Through a glass partition, four silhouettes; one is already marked, the
//       ally the Hacker knows. A scanner sweeps them, and in front the punch card's four windows
//       click shut: KA-CHUNK.
// The four are nobody and stand in their places, in no other order: the marked one is always the
// second, in every Hacker's film, so it says nothing of who. The punch card is library group 1's.

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glow, halftone, inBeam, linear, pool } from '../kit/fx.mjs';
import { ease, f, f3, lerp, noise, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, gadgetOf, markOf, nobody, poly, soundWord } from './common.mjs';

export const HACKER_CAPTIONS = Object.freeze([['The data dens', 'of Phobos.'], ['Paid in advance.']]);

// ---------- the card's mark and the gadget ----------

/** The Hacker's mark on the card on the desk: a terminal's prompt, paper on the dark plate. */
export function hackerMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.4, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const at = (x, y) => [cx + x * s, cy + y * s];
  const frame = poly([at(-1, -0.72), at(1, -0.72), at(1, 0.72), at(-1, 0.72)]);
  const screen = poly([at(-0.8, -0.52), at(0.8, -0.52), at(0.8, 0.52), at(-0.8, 0.52)]);
  const chevron = poly([at(-0.56, -0.3), at(-0.08, 0), at(-0.56, 0.3), at(-0.56, 0.14), at(-0.3, 0), at(-0.56, -0.14)]);
  const cursor = poly([at(0.02, 0.18), at(0.5, 0.18), at(0.5, 0.3), at(0.02, 0.3)]);
  return markOf(D, 'hk-mark', face, u, { solid: [frame], holes: [screen], over: [chevron, cursor] });
}

/** The hacking box the role card's device draws, without the hand or its team accent: its antenna's tip catches the light. */
export function hackerGadget() {
  return gadgetOf('bf-gadget-hk', { box: [40, 8, 90, 116], grip: [72, 92], glint: [97, 11] }, cv => {
    cv.form([[66, 68], [78, 68], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 181, tension: 0.4 });
    cv.form([[48, 30], [96, 30], [100, 34], [100, 68], [96, 72], [48, 72], [44, 68], [44, 34]], STEEL.body, { weight: 2.8, depth: 5, seed: 182, tension: 0.3 });
    cv.form([[51, 36], [80, 36], [80, 54], [51, 54]], '#1C2333', { weight: 2, depth: 0, seed: 183, rim: false, hatch: false, grain: false, tension: 0.15 });
    for (const [i, y] of [40, 44, 48].entries()) cv.line([[54, y], [54 + 18 - i * 5, y]], { weight: 1.3, color: '#C9D3C8', taper: 'none' });
    for (const x of [86, 92]) cv.flat([[x - 2, 38], [x + 2, 38], [x + 2, 42], [x - 2, 42]], STEEL.lamp, { tension: 0.5 });
    for (const x of [54, 62, 70, 78, 86, 94]) cv.flat([[x - 2.5, 60], [x + 2.5, 60], [x + 2.5, 66], [x - 2.5, 66]], STEEL.dark, { tension: 0.3 });
    cv.line([[94, 30], [96, 18], [97, 11]], { weight: 2, color: INK, taper: 'end' });
    cv.flat([[95, 9], [99, 9], [99, 13], [95, 13]], STEEL.lamp, { tension: 1 });
    cv.flat([[47, 32], [97, 32], [97, 34], [47, 34]], STEEL.shine, { opacity: 0.75, tension: 0.2 });
  });
}

/** A padlock at (x, y), its shackle lifting and turning as `open` goes 0 to 1. */
function padlock({ x, y, s, open, body = '#CFE8B4', ink = INK }) {
  const lift = 9 * s * open;
  const shackle = `<path d="M${f(x - 8 * s)} ${f(y - lift)}V${f(y - 12 * s - lift)}A${f(8 * s)} ${f(8 * s)} 0 0 1 ${f(x + 8 * s)} ${f(y - 12 * s - lift)}V${f(y - lift + (open > 0.5 ? -6 * s : 0))}" fill="none" stroke="${body}" stroke-width="${f(3.4 * s)}"/>`;
  return `<g transform="rotate(${f3(open * -14)} ${f(x - 8 * s)} ${f(y)})">${shackle}</g><rect x="${f(x - 12 * s)}" y="${f(y)}" width="${f(24 * s)}" height="${f(19 * s)}" rx="${f(3 * s)}" fill="${body}" stroke="${ink}" stroke-width="${f(1 * s)}"/><circle cx="${f(x)}" cy="${f(y + 8 * s)}" r="${f(2.6 * s)}" fill="${ink}"/>`;
}

// ---------- panel 1: the data dens of Phobos ----------

function dataDens(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'hk1-den', [[0, '#141210'], [0.7, '#1E1A16'], [1, '#0C0A08']])}"/>`;
  // The screens on the back wall, and the big one with its four padlocks.
  const [bx, by, bw, bh] = [w * 0.42, h * 0.08, w * 0.5, h * 0.4];
  for (const [x, y, sw, sh] of [[w * 0.04, h * 0.12, w * 0.16, h * 0.18], [w * 0.22, h * 0.06, w * 0.16, h * 0.16], [w * 0.06, h * 0.34, w * 0.14, h * 0.14], [w * 0.24, h * 0.26, w * 0.14, h * 0.15]]) {
    back += `<rect x="${f(x)}" y="${f(y)}" width="${f(sw)}" height="${f(sh)}" rx="${f(2 * k)}" fill="#0E1410" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`;
    const rr = rng(Math.floor(x));
    for (let i = 0; i < 5; i += 1) back += `<rect x="${f(x + 4 * k)}" y="${f(y + (4 + i * 5) * k)}" width="${f((sw - 8 * k) * (0.3 + rr() * 0.6))}" height="${f(2 * k)}" fill="#7E9A6C" opacity="${f3(0.5 + 0.4 * rr())}"/>`;
    back += glow(D, `hk1-scr${Math.floor(x)}`, { cx: x + sw / 2, cy: y + sh / 2, r: sw * 0.9, color: '#CFE8B4', opacity: 0.18 });
  }
  back += `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" rx="${f(3 * k)}" fill="#0E1410" stroke="${INK}" stroke-width="${f(2.6 * k)}"/>`;
  let locks = '';
  for (let i = 0; i < 4; i += 1) {
    const open = reduced ? 1 : ease.outBack(progress(t, 200 + i * 220, 380 + i * 220), 1.6);
    locks += padlock({ x: bx + bw * (0.16 + i * 0.227), y: by + bh * 0.42, s: 1.15 * k, open, body: open > 0.5 ? '#CFE8B4' : '#7E9A6C', ink: '#0E1410' });
  }
  const bigGlow = glow(D, 'hk1-big', { cx: bx + bw / 2, cy: by + bh / 2, r: bw * 0.75, color: '#CFE8B4', opacity: 0.3 });
  back += `<path d="M0 ${f(h * 0.78)}H${f(w)}V${f(h)}H0Z" fill="#0A0807"/>`;
  // Cables hanging like vines from the deckhead, swaying a little.
  let vines = '';
  const rv = rng(91);
  for (let i = 0; i < 9; i += 1) {
    const x = rv() * w, drop = h * (0.12 + rv() * 0.3), sway = reduced ? 0 : noise(t / 600 + i, i) * 6 * k;
    vines += `<path d="M${f(x)} 0C${f(x + 10 * k)} ${f(drop * 0.4)} ${f(x - 10 * k + sway)} ${f(drop * 0.8)} ${f(x + sway)} ${f(drop)}" fill="none" stroke="#2A2E35" stroke-width="${f((1.6 + rv() * 1.6) * k)}"/>`;
  }
  const den = pool(D, 'hk1-pool', { cx: w * 0.4, cy: h * 0.6, rx: w * 0.55, ry: h * 0.5, color: '#CFE8B4', opacity: 0.22, core: 0.2 });
  // The character on a stool at a laptop, lit by the screens.
  const scale = (h * 0.95) / 233;
  const hero = litFigure(D, 'hk1-hero', {
    c: character, sk: skeletonOf('laptopStool'), at: [w * 0.3, h * 1.04], scale, t, reduced,
    ambient: { color: '#2E3426', strength: 0.55 },
    key: { at: [bx + bw * 0.2, by + bh], z: 70 * k, color: '#E2F2D2', gain: 1.5 },
    rim: { dx: 0.7, dy: -0.7, color: '#E2F2D2', width: 2.4 * k, gain: 0.7 },
  });
  return back + locks + bigGlow + den + vines + hero;
}

// ---------- panel 2: paid in advance ----------

function paidInAdvance(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'hk2-table', [[0, '#2E261F'], [0.5, '#443829'], [1, '#1E1812']])}"/>`;
  back += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'hk2-dots', { size: 4 * k, r: 0.8 * k, color: '#140F0B' })}" opacity="0.35"/>`;
  // The lamp over the table, its cone down onto where the chip stops.
  const lamp = [w * 0.6, -4 * k];
  const cone = { from: [lamp[0], lamp[1] + 10 * k], to: [w * 0.6, h * 0.8], w0: 24 * k, w1: w * 0.5 };
  let air = beam(D, 'hk2-cone', { ...cone, color: '#FFE2A8', opacity: 0.3, soft: 5 * k }) + pool(D, 'hk2-pool', { cx: w * 0.6, cy: h * 0.62, rx: w * 0.34, ry: h * 0.34, color: '#FFD58E', opacity: 0.55, core: 0.2 });
  if (!reduced) air += dust({ seed: 93, n: 26, t, box: [w * 0.3, 0, w * 0.6, h], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', opacity: 0.7, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  const shade = `<path d="M${f(lamp[0] - 26 * k)} ${f(lamp[1] + 12 * k)}L${f(lamp[0] - 12 * k)} ${f(lamp[1] - 4 * k)}H${f(lamp[0] + 12 * k)}L${f(lamp[0] + 26 * k)} ${f(lamp[1] + 12 * k)}Z" fill="#3E342B" stroke="${INK}" stroke-width="${f(1.8 * k)}"/><ellipse cx="${f(lamp[0])}" cy="${f(lamp[1] + 12 * k)}" rx="${f(25 * k)}" ry="${f(4 * k)}" fill="#FFF0C8"/>` + glow(D, 'hk2-bulb', { cx: lamp[0], cy: lamp[1] + 14 * k, r: 34 * k, color: '#FFE6B0', opacity: 0.9 });
  // The credit chip sliding across and stopping, sealed in wax with a planet and its ring.
  const p = reduced ? 1 : ease.outCubic(progress(t, 80, 700));
  const x = lerp(-w * 0.2, w * 0.6, p), y = h * 0.6, a = lerp(-20, -6, p);
  const cw = 92 * k, ch = 56 * k;
  const chip = `<g transform="rotate(${f3(a)} ${f(x)} ${f(y)})">`
    + `<rect x="${f(x - cw / 2 + 5 * k)}" y="${f(y - ch / 2 + 7 * k)}" width="${f(cw)}" height="${f(ch)}" rx="${f(6 * k)}" fill="#000" opacity="0.45" filter="${blurFilter(D, 'hk2-shadow', 3 * k)}"/>`
    + `<rect x="${f(x - cw / 2)}" y="${f(y - ch / 2)}" width="${f(cw)}" height="${f(ch)}" rx="${f(6 * k)}" fill="#C9B78A" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`
    + `<rect x="${f(x - cw * 0.36)}" y="${f(y - ch * 0.22)}" width="${f(cw * 0.2)}" height="${f(ch * 0.4)}" rx="${f(2 * k)}" fill="#E8C36A" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `<path d="M${f(x - cw * 0.32)} ${f(y - ch * 0.22)}V${f(y + ch * 0.18)}M${f(x - cw * 0.26)} ${f(y - ch * 0.22)}V${f(y + ch * 0.18)}M${f(x - cw * 0.36)} ${f(y - ch * 0.02)}H${f(x - cw * 0.16)}" stroke="${INK}" stroke-width="${f(0.9 * k)}"/>`
    + [0, 1, 2].map(i => `<path d="M${f(x - cw * 0.06)} ${f(y - ch * 0.22 + i * 9 * k)}h${f(cw * (0.36 - i * 0.08))}" stroke="#8F7D52" stroke-width="${f(2 * k)}"/>`).join('')
    // The wax seal over its edge, pressed with a planet and its ring.
    + `<path d="M${f(x + cw * 0.38)} ${f(y + ch * 0.08)}m${f(-15 * k)} 0c0 ${f(-9 * k)} ${f(7 * k)} ${f(-15 * k)} ${f(15 * k)} ${f(-15 * k)}c${f(9 * k)} 0 ${f(16 * k)} ${f(5 * k)} ${f(16 * k)} ${f(14 * k)}c0 ${f(9 * k)} ${f(-7 * k)} ${f(17 * k)} ${f(-16 * k)} ${f(17 * k)}c${f(-9 * k)} 0 ${f(-15 * k)} ${f(-7 * k)} ${f(-15 * k)} ${f(-16 * k)}Z" fill="#6E4524" stroke="${INK}" stroke-width="${f(1.6 * k)}"/>`
    + `<circle cx="${f(x + cw * 0.38)}" cy="${f(y + ch * 0.08)}" r="${f(5 * k)}" fill="none" stroke="#3E2612" stroke-width="${f(1.6 * k)}"/><ellipse cx="${f(x + cw * 0.38)}" cy="${f(y + ch * 0.08)}" rx="${f(10 * k)}" ry="${f(3 * k)}" fill="none" stroke="#3E2612" stroke-width="${f(1.4 * k)}" transform="rotate(-18 ${f(x + cw * 0.38)} ${f(y + ch * 0.08)})"/>`
    + `</g>`;
  const settle = reduced || p < 1 ? '' : glow(D, 'hk2-gleam', { cx: x - cw * 0.26, cy: y - ch * 0.06, r: 18 * k, color: '#FFF4D8', opacity: 0.6 * (1 - progress(t, 700, 1000)) });
  return back + air + chip + settle + shade;
}

// ---------- panel 3: the Code ----------

function theCode(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1600 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'hk3-wall', [[0, '#121A2A'], [0.7, '#182134'], [1, '#0A0F1A']])}"/>`;
  // Beyond the glass: four silhouettes in their places, the second marked.
  const scale = (h * 0.62) / 233;
  const xs = [0.2, 0.4, 0.6, 0.8].map(x => w * x);
  const feet = h * 0.72;
  const sweep = reduced ? -1 : progress(t, 150, 850);
  const scanX = lerp(-w * 0.05, w * 1.05, sweep);
  let who = '';
  xs.forEach((x, i) => {
    const lit = sweep > 0 && sweep < 1 ? Math.max(0, 1 - Math.abs(scanX - x) / (w * 0.08)) : 0;
    who += nobody(D, `hk3-nobody${i}`, { sk: skeletonOf(i % 2 ? 'standBack' : 'standFolded'), at: [x, feet], scale, t, reduced, flip: i > 1, color: '#0B1119', rim: { dx: -0.7, dy: -0.7, color: '#FFE3A0', width: 2 * k, gain: 0.25 + 0.75 * lit } });
  });
  // The ally's mark: brackets round the second, there before the scan.
  const [ax, top] = [xs[1], feet - 233 * scale];
  const arm = 9 * k, pad = 20 * k;
  let mark = '';
  for (const [x, y, dx, dy] of [[ax - pad - 18 * k, top - 8 * k, 1, 1], [ax + pad + 10 * k, top - 8 * k, -1, 1], [ax - pad - 18 * k, feet + 4 * k, 1, -1], [ax + pad + 10 * k, feet + 4 * k, -1, -1]]) mark += `<path d="M${f(x)} ${f(y + dy * arm)}V${f(y)}H${f(x + dx * arm)}" fill="none" stroke="#F3E9D6" stroke-width="${f(2.2 * k)}"/>`;
  // The scanner's line sweeping across them.
  const scan = sweep > 0 && sweep < 1 ? `<rect x="${f(scanX - 2 * k)}" y="${f(h * 0.08)}" width="${f(4 * k)}" height="${f(h * 0.66)}" fill="#FFE3A0" opacity="0.8"/>` + beam(D, 'hk3-scan', { from: [scanX, h * 0.06], to: [scanX, feet], w0: 6 * k, w1: 30 * k, color: '#FFE3A0', opacity: 0.25, soft: 3 * k }) : '';
  // The glass partition: its frame, reflections.
  const glass = `<rect x="${f(w * 0.04)}" y="${f(h * 0.06)}" width="${f(w * 0.92)}" height="${f(h * 0.7)}" fill="#AFC0D6" opacity="0.06"/>`
    + `<path d="M${f(w * 0.12)} ${f(h * 0.1)}L${f(w * 0.3)} ${f(h * 0.7)}M${f(w * 0.16)} ${f(h * 0.1)}L${f(w * 0.32)} ${f(h * 0.62)}M${f(w * 0.7)} ${f(h * 0.1)}L${f(w * 0.84)} ${f(h * 0.56)}" stroke="#DDE5F0" stroke-width="${f(2 * k)}" opacity="0.12"/>`
    + `<rect x="${f(w * 0.04)}" y="${f(h * 0.06)}" width="${f(w * 0.92)}" height="${f(h * 0.7)}" fill="none" stroke="#2B3549" stroke-width="${f(7 * k)}"/><rect x="${f(w * 0.04)}" y="${f(h * 0.06)}" width="${f(w * 0.92)}" height="${f(h * 0.7)}" fill="none" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`;
  // In front, the punch card: its four windows clicking shut, one after another.
  const [cx, cy, cw, ch] = [w * 0.5, h * 0.88, w * 0.62, h * 0.2];
  let card = `<rect x="${f(cx - cw / 2 + 4 * k)}" y="${f(cy - ch / 2 + 5 * k)}" width="${f(cw)}" height="${f(ch)}" fill="#000" opacity="0.45"/>`
    + `<path d="M${f(cx - cw / 2)} ${f(cy - ch / 2)}H${f(cx + cw / 2 - 12 * k)}L${f(cx + cw / 2)} ${f(cy - ch / 2 + 12 * k)}V${f(cy + ch / 2)}H${f(cx - cw / 2)}Z" fill="#E9E1CC" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`;
  for (let i = 0; i < 4; i += 1) {
    const x = cx - cw * 0.36 + i * cw * 0.24, y = cy - ch * 0.08, s = ch * 0.5;
    const shut = reduced ? 1 : ease.outCubic(progress(t, 900 + i * 90, 990 + i * 90));
    card += `<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" fill="#0E1420" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
      + (shut > 0 ? `<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s * shut)}" fill="#BFB49A" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>` : '');
  }
  const ka = soundWord(D, 'hk3-ka', 'KA-CHUNK', { x: w * 0.68, y: h * 0.62, size: 17 * k, k: reduced ? 1 : progress(t, 1170, 1370), rotate: -6 });
  return back + who + mark + scan + glass + card + ka;
}

/** The Hacker's panels, as functions of each panel's size and local time. */
export function hackerPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => dataDens(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => paidInAdvance(D, { w, h, local, reduced }),
    ({ w, h, local }) => theCode(D, { w, h, local, reduced }),
  ];
}

/** The Hacker's film: the card's mark, the gadget, the three panels and the narration. */
export const HACKER = Object.freeze({ mark: hackerMark, gadget: hackerGadget, panels: hackerPanels, captions: HACKER_CAPTIONS });

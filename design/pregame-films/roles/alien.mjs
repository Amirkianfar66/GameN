// mothership:dev-only
//
// The Alien's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The stowaway from the sailors' stories."
//   1 · memory · A sailors' story. In a ship's mess, old spacers sit round a lantern on a crate,
//       and the player's own character sits apart on its other side. On the wall the lantern throws
//       everyone's shadow, and the player's is not a human's. Narration: "A story sailors told."
//   2 · memory · A crew face. The player's character stands in a lamp's light against a wall; the
//       shadow splits in two, and the second slides away: the Phantom Clone. Narration: "Then, a
//       second shadow."
//   3 · aboard · The Blackhole. The cabin's walls part to space; a blackhole forms and the stars
//       bend toward it: WHOOM.
// The spacers are nobody. The crystal, the blackhole's light and everything else stay clear of the
// Alien's own colour, as of every team's.

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { litFigure } from '../kit/cast.mjs';
import { blurFilter, glow, halftone, linear, pool } from '../kit/fx.mjs';
import { ease, f, f3, lerp, noise, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, gadgetOf, markOf, nobody, soundWord } from './common.mjs';

export const ALIEN_CAPTIONS = Object.freeze([['A story', 'sailors told.'], ['Then, a second', 'shadow.']]);

// ---------- the card's mark and the gadget ----------

/** The Alien's mark on the card on the desk: a spiral, paper on the dark plate. */
export function alienMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.4, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const pts = [];
  for (let i = 0; i <= 64; i += 1) {
    const a = (i / 64) * Math.PI * 5.2, r = s * (0.08 + 0.92 * (i / 64));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return markOf(D, 'al-mark', face, u, { strokes: [{ d: `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`, width: s * 0.17 }] });
}

/** The crystal the role card's device draws, without the hand or its team colour: pale as ice, motes round it. */
export function alienGadget() {
  return gadgetOf('bf-gadget-al', { box: [40, 8, 90, 116], grip: [72, 92], glint: [72, 13] }, cv => {
    cv.form([[66, 70], [78, 70], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 201, tension: 0.4 });
    cv.form([[58, 62], [86, 62], [84, 72], [60, 72]], STEEL.dark, { weight: 2.4, depth: 2, seed: 202, tension: 0.2 });
    // The crystal: a long point of pale ice.
    cv.form([[72, 10], [82, 26], [82, 56], [72, 66], [62, 56], [62, 26]], '#DDE6EE', { weight: 2.6, depth: 4, seed: 203, tension: 0.05, hatch: false });
    cv.flat([[72, 14], [76, 26], [76, 54], [72, 60]], '#F6FAFF', { opacity: 0.9, tension: 0.05 });
    cv.line([[66, 30], [66, 52]], { weight: 1.2, color: '#9FB0C0', taper: 'both' });
    // The claws of the mount, holding it.
    for (const [x0, x1, seed] of [[60, 56, 204], [84, 88, 205]]) cv.form([[x0, 64], [x1, 48], [x1 + (x1 < 72 ? 3 : -3), 46], [x0 + (x0 < 72 ? 4 : -4), 62]], STEEL.body, { weight: 2, depth: 2, seed, tension: 0.3 });
    // The motes in orbit.
    for (const [x, y, r] of [[52, 24, 2.2], [94, 34, 2.6], [56, 50, 1.6], [90, 16, 1.6]]) cv.flat([[x - r, y], [x, y - r], [x + r, y], [x, y + r]], STEEL.lamp, { tension: 1 });
  });
}

// ---------- the shadow that is not a human's ----------

/** A creature's shadow standing on (x, y), `s` px per unit: a long head swept back, long arms, long fingers. */
function creatureShadow(x, y, s, sway) {
  const p = (u, v) => `${f(x + (u + sway * (v / -200)) * s)} ${f(y + v * s)}`;
  return `M${p(-30, 0)}C${p(-34, -40)} ${p(-30, -80)} ${p(-36, -110)}C${p(-60, -120)} ${p(-74, -96)} ${p(-92, -70)}L${p(-98, -58)}L${p(-84, -66)}L${p(-90, -50)}L${p(-74, -64)}C${p(-60, -88)} ${p(-46, -118)} ${p(-30, -132)}`
    + `C${p(-26, -150)} ${p(-30, -168)} ${p(-20, -178)}C${p(-6, -192)} ${p(30, -214)} ${p(70, -226)}C${p(46, -206)} ${p(26, -184)} ${p(20, -168)}C${p(28, -152)} ${p(26, -140)} ${p(30, -132)}`
    + `C${p(46, -118)} ${p(60, -88)} ${p(74, -64)}L${p(90, -50)}L${p(84, -66)}L${p(98, -58)}L${p(92, -70)}C${p(74, -96)} ${p(60, -120)} ${p(36, -110)}C${p(30, -80)} ${p(34, -40)} ${p(30, 0)}Z`;
}

// ---------- panel 1: a sailors' story ----------

function sailorsStory(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const flicker = reduced ? 1 : 0.85 + 0.15 * noise(t / 90, 3);
  // The mess's wall, where the shadows fall, and its deck.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'al1-wall', [[0, '#1C1714'], [0.7, '#2A231D'], [1, '#14100D']])}"/>`;
  for (let x = w * 0.05; x < w; x += w * 0.16) back += `<path d="M${f(x)} 0V${f(h * 0.7)}" stroke="#110D0A" stroke-width="${f(1.6 * k)}"/>`;
  back += `<path d="M0 ${f(h * 0.7)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'al1-deck', [[0, '#2A221B'], [1, '#100C09']])}"/>`;
  const lantern = [w * 0.47, h * 0.66];
  back += pool(D, 'al1-glow', { cx: lantern[0], cy: h * 0.5, rx: w * 0.5, ry: h * 0.6, color: '#FFD58E', opacity: 0.5 * flicker, core: 0.15 });
  // The shadows on the wall, thrown up and out from the lantern: the spacers' human, the player's not.
  const scale = (h * 0.62) / 233;
  const spacers = [[w * 0.2, true, 'benchHunched'], [w * 0.32, true, 'benchHunched']];
  let shadows = '';
  spacers.forEach(([x, flip, g], i) => {
    const sx = lantern[0] + (x - lantern[0]) * 1.7;
    shadows += `<g opacity="0.55">${nobody(D, `al1-shade${i}`, { sk: skeletonOf(g), at: [sx, h * 0.72], scale: scale * 1.9, t, reduced, flip, color: '#0A0807' })}</g>`;
  });
  const heroX = w * 0.8;
  const sway = reduced ? 0 : noise(t / 300, 7) * 6;
  shadows += `<path d="${creatureShadow(lantern[0] + (heroX - lantern[0]) * 1.12, h * 0.72, scale * 1.32, sway)}" fill="#0A0807" opacity="0.74"/>`;
  const shadowLayer = `<g filter="${blurFilter(D, 'al1-soft', 1.6 * k)}">${shadows}</g>`;
  // The spacers round the lantern, and the player's character apart on the other side.
  let people = '';
  spacers.forEach(([x, flip, g], i) => {
    people += nobody(D, `al1-spacer${i}`, { sk: skeletonOf(g), at: [x, h * 1.0], scale, t, reduced, flip, color: '#120E0B', rim: { dx: 0.7, dy: -0.6, color: '#F2C98A', width: 2.2 * k, gain: 0.8 * flicker } });
  });
  const hero = litFigure(D, 'al1-hero', {
    c: character, sk: skeletonOf('benchHunched'), at: [heroX, h * 1.0], scale, t, reduced,
    ambient: { color: '#3A2E22', strength: 0.5 },
    key: { at: lantern, z: 50 * k, color: '#FFD9A0', gain: 1.5 * flicker },
    rim: { dx: -0.7, dy: -0.6, color: '#F2C98A', width: 2.2 * k, gain: 0.8 },
  });
  // The crate and the lantern on it.
  const crate = `<rect x="${f(lantern[0] - 22 * k)}" y="${f(h * 0.74)}" width="${f(44 * k)}" height="${f(h * 0.3)}" fill="#4A3B2E" stroke="${INK}" stroke-width="${f(2 * k)}"/><path d="M${f(lantern[0] - 22 * k)} ${f(h * 0.82)}H${f(lantern[0] + 22 * k)}" stroke="#2A2018" stroke-width="${f(1.4 * k)}"/>`;
  const lamp = `<rect x="${f(lantern[0] - 7 * k)}" y="${f(lantern[1] - 4 * k)}" width="${f(14 * k)}" height="${f(16 * k)}" rx="${f(3 * k)}" fill="#FFF0C8" stroke="${INK}" stroke-width="${f(1.6 * k)}"/><path d="M${f(lantern[0] - 8 * k)} ${f(lantern[1] - 4 * k)}h${f(16 * k)}M${f(lantern[0] - 8 * k)} ${f(lantern[1] + 12 * k)}h${f(16 * k)}M${f(lantern[0])} ${f(lantern[1] - 4 * k)}v${f(-6 * k)}" stroke="${INK}" stroke-width="${f(2 * k)}"/>`
    + glow(D, 'al1-flame', { cx: lantern[0], cy: lantern[1] + 4 * k, r: 34 * k, color: '#FFE6B0', opacity: 0.95 * flicker });
  return back + shadowLayer + people + hero + crate + lamp;
}

// ---------- panel 2: a second shadow ----------

function secondShadow(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'al2-wall', [[0, '#2A231E'], [0.7, '#352C25'], [1, '#1A1511']])}"/>`;
  back += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'al2-dots', { size: 4 * k, r: 0.8 * k, color: '#14100C' })}" opacity="0.25"/>`;
  back += `<path d="M0 ${f(h * 0.84)}H${f(w)}V${f(h)}H0Z" fill="#17120E"/>`;
  // The lamp's light from the front right, pooled on the wall behind.
  back += pool(D, 'al2-light', { cx: w * 0.52, cy: h * 0.45, rx: w * 0.42, ry: h * 0.6, color: '#FFD58E', opacity: 0.5, core: 0.2 });
  // The shadow on the wall: the character's own, then a second sliding out of it.
  const scale = (h * 0.86) / 233;
  const at = [w * 0.6, h * 0.98];
  const sk = skeletonOf('stand');
  const split = reduced ? 1 : ease.inOutCubic(progress(t, 250, 1100));
  const shadowAt = [at[0] - 40 * k, at[1] - 6 * k];
  const own = litFigure(D, 'al2-own', { c: character, sk, at: shadowAt, scale: scale * 1.08, t: 0, reduced: true, silhouette: '#0A0807' });
  const clone = litFigure(D, 'al2-clone', { c: character, sk, at: [shadowAt[0] - split * w * 0.34, shadowAt[1]], scale: scale * 1.08, t: 0, reduced: true, silhouette: '#0A0807', flip: split > 0.5 });
  const shadows = `<g filter="${blurFilter(D, 'al2-soft', 1.4 * k)}"><g opacity="0.6">${own}</g><g opacity="${f3(0.6 * (1 - 0.35 * split))}">${clone}</g></g>`;
  const hero = litFigure(D, 'al2-hero', {
    c: character, sk, at, scale, t, reduced,
    ambient: { color: '#3E3226', strength: 0.5 },
    key: { at: [w * 0.95, h * 0.3], z: 70 * k, color: '#FFD9A0', gain: 1.6 },
    rim: { dx: -0.7, dy: -0.6, color: '#F2DDB4', width: 2.4 * k, gain: 0.6 },
  });
  return back + shadows + hero;
}

// ---------- panel 3: the Blackhole ----------

function blackhole(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1600 : local;
  const part = reduced ? 1 : ease.inOutCubic(progress(t, 80, 600));
  const form = reduced ? 1 : ease.outCubic(progress(t, 450, 1300));
  const [cx, cy] = [w * 0.5, h * 0.46];
  // Space beyond the walls: stars bending toward the hole as it forms.
  let space = `<rect width="${f(w)}" height="${f(h)}" fill="#03050A"/>`;
  const r = rng(111);
  for (let i = 0; i < 90; i += 1) {
    const a = r() * Math.PI * 2, d0 = (0.12 + r() * 0.9) * w * 0.6;
    const pull = form * (0.35 * Math.exp(-d0 / (w * 0.25)));
    const d = d0 * (1 - pull), a2 = a + form * 0.6 * Math.exp(-d0 / (w * 0.2));
    const x = cx + Math.cos(a2) * d, y = cy + Math.sin(a2) * d * 0.62;
    const tail = form * 14 * k * Math.exp(-d0 / (w * 0.3));
    const op = 0.4 + 0.6 * r();
    space += tail > 1
      ? `<path d="M${f(x)} ${f(y)}A${f(d)} ${f(d * 0.62)} 0 0 0 ${f(cx + Math.cos(a2 - tail / d) * d)} ${f(cy + Math.sin(a2 - tail / d) * d * 0.62)}" fill="none" stroke="#F4F1E8" stroke-width="${f((0.6 + r()) * k)}" opacity="${f3(op)}" stroke-linecap="round"/>`
      : `<circle cx="${f(x)}" cy="${f(y)}" r="${f((0.4 + r() * 0.9) * k)}" fill="#F4F1E8" opacity="${f3(op)}"/>`;
  }
  // The hole: its ring of light, the dark disc, the light bent over its top.
  if (form > 0) {
    const R = 34 * k * form;
    space += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(R * 2.6)}" ry="${f(R * 0.55)}" fill="none" stroke="${linear(D, 'al3-disk', [[0, '#FFB86A', 0.2], [0.5, '#FFF1D2', 1], [1, '#FFB86A', 0.2]], { x1: 0, y1: 0, x2: 1, y2: 0 })}" stroke-width="${f(R * 0.32)}" opacity="${f3(form)}" filter="${blurFilter(D, 'al3-disk-blur', 1.5 * k)}"/>`
      + glow(D, 'al3-halo', { cx, cy, r: R * 2.4, color: '#FFD9A0', opacity: 0.45 * form })
      + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="#000000"/>`
      + `<path d="M${f(cx - R * 1.25)} ${f(cy)}A${f(R * 1.25)} ${f(R * 1.15)} 0 0 1 ${f(cx + R * 1.25)} ${f(cy)}" fill="none" stroke="#FFF1D2" stroke-width="${f(R * 0.12)}" opacity="${f3(0.85 * form)}"/>`
      + `<path d="M${f(cx - R * 2.6)} ${f(cy)}A${f(R * 2.6)} ${f(R * 0.55)} 0 0 0 ${f(cx + R * 2.6)} ${f(cy)}" fill="none" stroke="#FFF1D2" stroke-width="${f(R * 0.2)}" opacity="${f3(0.9 * form)}"/>`;
  }
  // The cabin's walls parting to either side.
  const wall = side => {
    const x = side < 0 ? lerp(0, -w * 0.48, part) : lerp(w * 0.5, w * 0.98, part);
    return `<rect x="${f(x)}" y="0" width="${f(w * 0.5)}" height="${f(h)}" fill="${linear(D, `al3-wall${side}`, [[0, '#141C2E'], [1, '#0B111D']])}" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`
      + [0.2, 0.5, 0.8].map(u => `<path d="M${f(x + w * 0.5 * u)} 0V${f(h)}" stroke="#070B14" stroke-width="${f(2 * k)}"/>`).join('')
      + `<rect x="${f(side < 0 ? x + w * 0.5 - 6 * k : x)}" y="0" width="${f(6 * k)}" height="${f(h)}" fill="#FFE3A0" opacity="${f3(0.5 * Math.sin(part * Math.PI))}"/>`;
  };
  const whoom = soundWord(D, 'al3-whoom', 'WHOOM', { x: w * 0.5, y: h * 0.86, size: 22 * k, k: reduced ? 1 : progress(t, 600, 860), rotate: -4, face: { top: '#FFFFFF', mid: '#F3E9D6', bottom: '#CBBFA6', side: '#4A4438', sideDeep: '#1E1B16', ink: INK, highlight: '#FFFFFF' } });
  return space + wall(-1) + wall(1) + whoom;
}

/** The Alien's panels, as functions of each panel's size and local time. */
export function alienPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => sailorsStory(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => secondShadow(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => blackhole(D, { w, h, local, reduced }),
  ];
}

/** The Alien's film: the card's mark, the gadget, the three panels and the narration. */
export const ALIEN = Object.freeze({ mark: alienMark, gadget: alienGadget, panels: alienPanels, captions: ALIEN_CAPTIONS });

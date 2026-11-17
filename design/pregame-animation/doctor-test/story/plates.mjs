// Three illustrations of the Doctor in the owner's style (17 November 2026, with three reference pictures: the crew
// redrawn in a deep ship's room, a hand-inked city street in one-point perspective, a hatched ship among rocks):
//   1  The Hospital, aboard: the Doctor holds the injector to the surgical light; a patient (nobody) sits up behind.
//   2  Colony Nine: the street between the stacks in the dust, the ward's cross sign lit; she walks toward us with
//      her case; far down the street two shapes carry a stretcher.
//   3  The climb: the shuttle that took her off climbs through the debris, engines burning, the colony a ring of fire
//      below, the sky's orbits and swirls above.
// The crew are redrawn taller (the rig's skeletons stretched, the head drawn smaller), in the new finish and kit.
// Built in metres in perspective (./persp.mjs), drawn once at 2 pixels a point, 390 x 844.

import { glow, motes, rgba, sprite } from '../../../phone-ui/components/boarding-film/engine.mjs';
import { stridePose } from '../../../phone-ui/components/boarding-film/cast.mjs';
import { GESTURES, STAND } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { smoke } from '../world/live.mjs';
import { beamCone, mira, nobody, vignette } from './panels.mjs';
import { DEFS, caseClosed } from './sets.mjs';
import { PERSP_DEFS, camera, f, grain, mixHex, rng, scene, v3 } from './persp.mjs';

const W = 390, H = 844;
const TAU = Math.PI * 2;

/** The crew taller: a rig skeleton stretched up from the floor (`k`), its head to be drawn smaller (headScale 1). */
export function tall(sk, k = 1.2) {
  const out = { ...sk };
  for (const [name, v] of Object.entries(sk)) if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && name !== 'shadow') out[name] = [v[0], 233 - (233 - v[1]) * k];
  return out;
}
/** Rig units per metre for a tall figure of `height` metres (the stretched rig stands about 255 units). */
const unitsPerMetre = height => 255 / height;

function context(doc) {
  const canvas = doc.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  return { canvas, ctx };
}
const bakeSvg = (doc, inner, defs = '') => sprite(doc, { rect: [0, 0, W, H], px: 2, inner: `<defs>${PERSP_DEFS}${defs}</defs>${inner}` });
const put = (ctx, s) => ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
/** Where a figure standing at a world point lands, and its px per rig unit. */
const stand = (C, p, height) => { const q = C.P(p); return { at: [q[0], q[1]], scale: q[2] / unitsPerMetre(height) }; };

// ── 1 · The Hospital, aboard ─────────────────────────────────────────

async function hospital(doc) {
  const { canvas, ctx } = context(doc);
  const C = camera({ W, H, eye: [0.5, 1.45, -2.0], look: [0.15, 1.05, 10], fov: 1.22 });
  const S = scene(C, { haze: '#3A4A50', fog: 30, light: [0.45, 0.8, -0.4], weight: 1.35, ambient: 0.62 });
  const ENG = { n: 110, slant: 0, always: true, opacity: 0.16, w: 0.5 };
  const wall = '#55646A', floor = '#3A464C', ceil = '#2C353B';
  const Z0 = -2.2, Z1 = 13;
  S.face([[-2.6, 0, Z0], [2.6, 0, Z0], [2.6, 0, Z1], [-2.6, 0, Z1]], floor, { twoSided: true, panels: { cols: 5, rows: 18, vents: 0.08, dark: 0.3 }, seed: 3, hatch: { ...ENG, n: 70, opacity: 0.12 } });
  S.face([[-2.6, 0, Z0], [-2.6, 0, Z1], [-2.6, 3, Z1], [-2.6, 3, Z0]], wall, { twoSided: true, panels: { cols: 16, rows: 4, vents: 0.25, dark: 0.28 }, seed: 5, hatch: ENG });
  S.face([[2.6, 0, Z0], [2.6, 0, Z1], [2.6, 3, Z1], [2.6, 3, Z0]], wall, { twoSided: true, panels: { cols: 16, rows: 4, vents: 0.25, dark: 0.28 }, seed: 7, hatch: ENG });
  S.face([[-2.6, 3, Z0], [-2.6, 3, Z1], [2.6, 3, Z1], [2.6, 3, Z0]], ceil, { twoSided: true, panels: { cols: 4, rows: 16, vents: 0.35, dark: 0.35 }, seed: 9, hatch: { ...ENG, opacity: 0.3 } });
  S.face([[-2.6, 0, Z1], [2.6, 0, Z1], [2.6, 3, Z1], [-2.6, 3, Z1]], wall, { twoSided: true, panels: { cols: 5, rows: 3, vents: 0.2, dark: 0.2 }, seed: 11 });
  // The port in the far wall: the planet and the swirl beyond, a heavy ring round it.
  const pc = C.P([0, 1.62, 12.98]), pr = 0.92 * pc[2];
  let port = `<clipPath id="h-port"><circle cx="${f(pc[0])}" cy="${f(pc[1])}" r="${f(pr)}"/></clipPath><g clip-path="url(#h-port)"><rect x="${f(pc[0] - pr)}" y="${f(pc[1] - pr)}" width="${f(pr * 2)}" height="${f(pr * 2)}" fill="#0A0818"/>`;
  for (let i = 0; i < 3; i += 1) port += `<ellipse cx="${f(pc[0] - pr * 0.2)}" cy="${f(pc[1] - pr * 0.3)}" rx="${f(pr * (0.9 - i * 0.2))}" ry="${f(pr * (0.45 - i * 0.1))}" fill="${['#5E2A84', '#C83C9A', '#19C7B4'][i]}" opacity="0.4" filter="url(#px-soft)" transform="rotate(${-18 + i * 25} ${f(pc[0])} ${f(pc[1])})"/>`;
  const r = rng(5);
  for (let i = 0; i < 40; i += 1) port += `<circle cx="${f(pc[0] + (r() - 0.5) * pr * 2)}" cy="${f(pc[1] + (r() - 0.5) * pr * 2)}" r="${f(0.3 + r() * 0.8)}" fill="#F4F0FF"/>`;
  port += `<circle cx="${f(pc[0] + pr * 0.55)}" cy="${f(pc[1] + pr * 1.05)}" r="${f(pr * 0.95)}" fill="#3E5A6A"/><circle cx="${f(pc[0] + pr * 0.55)}" cy="${f(pc[1] + pr * 1.05)}" r="${f(pr * 0.95)}" fill="none" stroke="#BFE8F0" stroke-width="1.4"/></g>`;
  port += `<circle cx="${f(pc[0])}" cy="${f(pc[1])}" r="${f(pr + 5)}" fill="none" stroke="#56646A" stroke-width="9"/><circle cx="${f(pc[0])}" cy="${f(pc[1])}" r="${f(pr + 10)}" fill="none" stroke="#07080C" stroke-width="1.6"/><circle cx="${f(pc[0])}" cy="${f(pc[1])}" r="${f(pr)}" fill="none" stroke="#07080C" stroke-width="1.6"/>`;
  for (let i = 0; i < 12; i += 1) { const a = (i / 12) * TAU; port += `<circle cx="${f(pc[0] + Math.cos(a) * (pr + 5))}" cy="${f(pc[1] + Math.sin(a) * (pr + 5))}" r="1.1" fill="#07080C"/>`; }
  for (const a of [0.2, 1.75, 3.3, 4.85]) port += `<rect x="${f(pc[0] + Math.cos(a) * (pr + 5) - 2)}" y="${f(pc[1] + Math.sin(a) * (pr + 5) - 4)}" width="4" height="8" fill="#FFB347" opacity="0.9"/>`;
  S.raw(12.9, port);
  // Ribs across the ceiling and down the walls: the room's frame, every two metres.
  for (let z = -1; z < 13; z += 2) {
    S.box([-2.6, 2.84, z], [2.6, 3, z + 0.18], '#232B30', { w: 1.6, seed: z + 60 });
    for (const x of [-2.6, 2.44]) S.box([x, 0, z], [x + 0.16, 3, z + 0.18], '#2E383E', { w: 1.6, seed: z + 70 });
  }
  // A guide light along each wall at hand height, and conduits beside it.
  for (const x of [-2.58, 2.58]) {
    S.face([[x, 1.02, Z0], [x, 1.02, 12.9], [x, 1.06, 12.9], [x, 1.06, Z0]], '#7CF2C8', { twoSided: true, glow: true, noInk: true });
    S.pipe([[x * 0.985, 1.18, Z0], [x * 0.985, 1.18, 12.9]], 0.035, '#6E7A80');
    S.pipe([[x * 0.985, 2.35, Z0], [x * 0.985, 2.35, 12.9]], 0.05, x < 0 ? '#7A5236' : '#5A6A70', { light: '#E0C0A0' });
  }
  // The ceiling: surgical lamps in their housings, pipes along the corners, cables slung, a vent.
  for (const z of [2.6, 6.2, 9.8]) {
    S.box([-0.95, 2.7, z - 0.55], [0.95, 2.98, z + 0.55], '#2E363C', { twoSided: false, w: 1.6, seed: z * 7 });
    S.face([[-0.85, 2.695, z - 0.45], [0.85, 2.695, z - 0.45], [0.85, 2.695, z + 0.45], [-0.85, 2.695, z + 0.45]], '#FFE6B8', { twoSided: true, glow: true, panels: { cols: 4, rows: 2, vents: 0, dark: 0, rivets: false }, seed: 2 });
  }
  S.pipe([[-2.42, 2.82, Z0], [-2.42, 2.82, 12.95]], 0.11, '#5A6A70');
  S.pipe([[-2.15, 2.88, Z0], [-2.15, 2.88, 8], [-2.15, 2.4, 8], [-2.15, 2.4, 12.95]], 0.07, '#7A5236', { light: '#E0B080' });
  S.pipe([[2.38, 2.8, Z0], [2.38, 2.8, 7.5], [2.38, 2.25, 7.5], [2.38, 2.25, 12.95]], 0.09, '#4E6258', { light: '#A9CBB8' });
  S.pipe([[2.5, 0, 4.7], [2.5, 2.9, 4.7]], 0.07, '#5A6A70');
  S.pipe([[-1.3, 2.9, Z0], [-1.3, 2.9, 12.95]], 0.08, '#4E6258', { light: '#A9CBB8' });
  S.pipe([[1.4, 2.92, Z0], [1.4, 2.92, 5], [1.1, 2.92, 5.4], [1.1, 2.92, 12.95]], 0.06, '#7A5236', { light: '#E0B080' });
  S.box([0.9, 2.86, Z0], [1.25, 2.98, 12.9], '#2A3238', { w: 1.4, panels: { cols: 1, rows: 18, vents: 0.6, dark: 0, rivets: false }, seed: 81 });
  for (const z of [0.4, 4.4, 8.0, 11.6]) S.box([-0.55, 2.82, z], [0.55, 3, z + 0.5], '#323C42', { w: 1.4, panels: { cols: 4, rows: 1, vents: 0.9, dark: 0, rivets: false }, seed: z + 90 });
  for (const [x, z0, z1, sag] of [[-0.7, 0.2, 1.8, 0.5], [0.5, 4.2, 5.6, 0.45], [-1.8, 7.4, 9.0, 0.5], [1.7, 10.4, 12.2, 0.55], [-2.0, 1.2, 2.4, 0.35]]) S.cable([x, 2.95, z0], [x + 0.3, 2.95, z1], sag, { r: 0.022 });
  for (const [a, b, sag] of [[[-1.6, 3, 1], [0.8, 3, 3.5], 0.45], [[0.6, 3, 4], [2.2, 3, 7.5], 0.55], [[-2.1, 3, 8.5], [1.4, 3, 11.5], 0.6], [[-1.0, 3, -1], [1.8, 3, 1.2], 0.35]]) S.cable(a, b, sag, { r: 0.03 });
  // The beds along the left wall, heads to the wall: the near one empty, the middle one with somebody sitting up,
  // the far one with the sheet drawn up.
  for (const [c, kind] of [[3.2, 'empty'], [6.8, 'sitting'], [10.2, 'covered']]) {
    S.box([-2.58, 0.5, c - 0.58], [-2.48, 1.35, c + 0.58], '#3A464C', { w: 1.4, panels: { cols: 1, rows: 2, vents: 0.5, dark: 0 }, seed: c });
    S.box([-2.5, 0.48, c - 0.55], [-0.72, 0.6, c + 0.55], '#5E686E', { w: 1.6, seed: c + 1 });
    for (const [x, z] of [[-2.45, c - 0.5], [-0.78, c - 0.5], [-2.45, c + 0.5], [-0.78, c + 0.5]]) S.box([x - 0.03, 0, z - 0.03], [x + 0.03, 0.48, z + 0.03], '#2A3036', { w: 1 });
    S.box([-2.46, 0.6, c - 0.5], [-0.76, 0.74, c + 0.5], '#BDB6A6', { w: 1.6, hatch: { n: 14, slant: 0.3, below: 0.7 }, seed: c + 2 });
    S.box([-2.44, 0.74, c - 0.32], [-2.06, 0.86, c + 0.32], '#DAD4C4', { w: 1.4, seed: c + 3 });
    if (kind === 'covered') S.box([-2.3, 0.74, c - 0.28], [-0.95, 0.9, c + 0.28], '#C8C1B0', { w: 1.6, hatch: { n: 12, slant: 0.3, below: 0.8 }, seed: c + 4 });
    S.pipe([[-0.55, 0, c + 0.75], [-0.55, 1.95, c + 0.75], [-0.75, 1.95, c + 0.75]], 0.018, '#8C969C');
    S.box([-0.82, 1.62, c + 0.68], [-0.66, 1.9, c + 0.82], '#D4E8DA', { w: 1, alpha: 0.85 });
  }
  // The right wall: lockers, the monitor bank, the Hospital's keypad panel, a doorway out.
  S.box([1.98, 0, 0.3], [2.6, 2.35, 3.4], '#4E5C62', { w: 1.8, panels: { cols: 3, rows: 2, vents: 0.45, dark: 0.1 }, seed: 21 });
  S.box([2.05, 0.9, 5.0], [2.6, 0.98, 7.6], '#3A464C', { w: 1.4 });
  for (const [z0, z1] of [[5.15, 6.25], [6.4, 7.45]]) {
    S.box([2.32, 1.05, z0], [2.6, 1.85, z1], '#1E262A', { w: 1.6, seed: z0 });
    S.face([[2.31, 1.12, z0 + 0.08], [2.31, 1.12, z1 - 0.08], [2.31, 1.78, z1 - 0.08], [2.31, 1.78, z0 + 0.08]], '#0C3A34', { twoSided: true, glow: true, noInk: true });
    // The traces on the screens, drawn in the screen's own plane.
    let tr = '';
    for (let row = 0; row < 3; row += 1) {
      const pts = [];
      for (let k = 0; k <= 20; k += 1) { const u = k / 20, beat = (u * 3 + row * 0.3) % 1 < 0.08 ? 0.12 : 0; pts.push(C.P([2.3, 1.3 + row * 0.18 + beat, z0 + 0.12 + u * (z1 - z0 - 0.24)])); }
      tr += `<path d="M${pts.map(P => `${f(P[0])} ${f(P[1])}`).join('L')}" stroke="#3FE0D0" stroke-width="0.9" fill="none"/>`;
    }
    S.raw(C.depth([2.3, 1.4, (z0 + z1) / 2]) - 0.05, tr);
  }
  S.box([2.22, 0.95, 8.3], [2.6, 1.95, 9.2], '#38444A', { w: 1.6, seed: 31 });
  let keys = '';
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) {
    const z = 8.45 + col * 0.24, y = 1.7 - row * 0.18, lit = row === 1 && col === 0;
    const q = [[2.21, y, z], [2.21, y, z + 0.16], [2.21, y - 0.12, z + 0.16], [2.21, y - 0.12, z]].map(p => C.P(p));
    keys += `<path d="M${q.map(P => `${f(P[0])} ${f(P[1])}`).join('L')}Z" fill="${lit ? '#FFC566' : '#55646A'}" stroke="#07080C" stroke-width="0.6"/>`;
  }
  S.raw(C.depth([2.21, 1.4, 8.7]) - 0.05, keys);
  S.face([[2.59, 0, 10.4], [2.59, 0, 12.2], [2.59, 2.3, 12.2], [2.59, 2.3, 10.4]], '#0A1418', { twoSided: true, glow: true });
  S.face([[2.585, 0.1, 11.6], [2.585, 0.1, 12.1], [2.585, 2.1, 12.1], [2.585, 2.1, 11.6]], '#1E5A56', { twoSided: true, glow: true, noInk: true, alpha: 0.6 });
  S.box([2.45, 2.3, 10.25], [2.6, 2.5, 12.35], '#3A464C', { w: 1.6 });
  // The instrument cart in the left foreground: its tray, the tools laid out, a bowl, a lamp clamped to it.
  S.box([-1.25, 0.86, 1.0], [-0.15, 0.92, 1.9], '#7C868A', { w: 1.8, seed: 41 });
  S.box([-1.2, 0.3, 1.05], [-0.2, 0.34, 1.85], '#5E686E', { w: 1.4 });
  for (const [x, z] of [[-1.2, 1.05], [-0.2, 1.05], [-1.2, 1.85], [-0.2, 1.85]]) S.box([x - 0.02, 0, z - 0.02], [x + 0.02, 0.86, z + 0.02], '#2A3036', { w: 1 });
  const rt = rng(9);
  for (let i = 0; i < 7; i += 1) { const x = -1.15 + rt() * 0.85, z = 1.1 + rt() * 0.7; S.box([x, 0.92, z], [x + 0.18, 0.94, z + 0.02], '#C8D0D4', { w: 0.8 }); }
  S.box([-0.55, 0.92, 1.5], [-0.3, 0.98, 1.75], '#AEB8BC', { w: 1.2 });
  // Drawn in two layers, the far room and the near one, so the patient sits in the middle bed between them.
  const split = C.depth([-1.6, 0.7, 5.4]);
  put(ctx, await bakeSvg(doc, S.svg(split)));
  const pt = stand(C, [-1.95, 0.7, 6.8], 1.7);
  await nobody(doc, ctx, { sk: tall({ ...GESTURES.bedSitting, footF: { type: 'none' }, footN: { type: 'none' } }), at: [pt.at[0], pt.at[1] + 4], scale: pt.scale, color: '#151B1F', rim: { dx: 0.3, dy: -1, color: '#FFE6B8', alpha: 0.85 } });
  put(ctx, await bakeSvg(doc, S.svg(-Infinity, split) + grain(W, H, 0.45)));
  // Light: cones from the lamps, blooms, the monitors' glow, a wisp from the sterilizer, dust.
  for (const z of [2.6, 6.2, 9.8]) { const a = C.P([0, 2.68, z]), b = C.P([0, 0, z + 0.3]); beamCone(ctx, [a[0], a[1]], [b[0], b[1]], 0.9 * a[2], 1.6 * b[2], '#FFE6B8', 0.16); }
  for (const z of [2.6, 6.2, 9.8]) { const p = C.P([0, 0.02, z + 0.4]); glow(ctx, p[0], p[1], 1.4 * p[2], '#FFE6B8', 0.22, { sy: 0.35 }); }
  for (const z of [5.7, 6.9]) { const p = C.P([2.3, 1.45, z]); glow(ctx, p[0], p[1], 0.9 * p[2], '#3FE0D0', 0.35); }
  const kp = C.P([2.2, 1.46, 8.53]); glow(ctx, kp[0], kp[1], 0.4 * kp[2], '#FFC566', 0.9);
  const st = C.P([-0.42, 0.98, 1.62]); smoke(ctx, 1400, { at: [st[0], st[1]], n: 9, life: 2400, rise: 0.06, drift: 0.01, r0: 3, r1: 26, color: '#E6ECEE', alpha: 0.22, seed: 6 });
  motes(ctx, { seed: 3, n: 80, t: 900, box: [60, 160, 270, 420], size: [0.5, 1.4], color: '#FFF0CC', alpha: 0.7, speed: 0.3 });
  // Her, in the right foreground, holding the injector up to the light.
  const sk = tall({ ...STAND, view: 'front', head: [57, 37], tilt: 7, neck: [61, 64], sF: [39, 73], eF: [20, 70], wF: [24, 44], handF: { type: 'none' }, sN: [85, 72], eN: [104, 99], wN: [84, 121], handN: { angle: 200 }, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'] });
  const me = stand(C, [0.98, 0, 0.95], 1.72);
  const lampAt = C.P([0, 2.68, 2.6]);
  const fig = await mira(doc, ctx, {
    sk, hand: 'fist', holds: -8, headScale: 1.0, face: { look: 'injector', lids: 0.1, brow: 'knit', mouth: 'pressed', sway: 1, lift: 0 }, at: me.at, scale: me.scale,
    light: { ambient: { color: '#25313A', strength: 0.78 }, key: { at: [lampAt[0], lampAt[1]], z: 160, color: '#FFE2B0', gain: 1.9 }, rim: { dx: -0.5, dy: -0.86, color: '#BFE8F0', width: 3.2, gain: 1 } },
  });
  fig.draw();
  // The vials catching the light by her face.
  const vial = [me.at[0] + (24 - 62) * me.scale, me.at[1] + (233 - (233 - 44) * 1.2 - 233) * me.scale - 34];
  glow(ctx, vial[0] + 6, vial[1] - 8, 26, '#FFF6DF', 0.75);
  vignette(ctx, '#05080A', 0.75, 0.5, 0.42);
  return canvas;
}

// ── 2 · Colony Nine, the street ──────────────────────────────────────

async function street(doc) {
  const { canvas, ctx } = context(doc);
  const C = camera({ W, H, eye: [0.6, 1.2, -1.5], look: [-0.2, 4.2, 30], fov: 1.38 });
  const S = scene(C, { haze: '#C9A57E', fog: 34, light: [0.5, 0.75, -0.3], weight: 1.35, ambient: 0.55 });
  const ENG = { n: 160, slant: 0, always: true, opacity: 0.2, w: 0.5 };
  const rust = '#4A3428', rust2 = '#5C4232', dark = '#2A1E18', pale = '#8A6A50';
  // The sky: dust, pale at the gap between the stacks.
  let sky = `<defs><linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D2B0"/><stop offset="0.6" stop-color="#C99A6A"/><stop offset="1" stop-color="#7A5034"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#st-sky)"/>`;
  S.raw(999, sky);
  // The far stacks, fading into the dust.
  const r = rng(13);
  for (let i = 0; i < 9; i += 1) {
    const z = 40 + i * 9, x = (i % 2 ? 1 : -1) * (4 + r() * 6), w = 3 + r() * 5, h = 14 + r() * 30;
    S.box([x - w / 2, 0, z], [x + w / 2, h, z + 4], pale, { w: 1, panels: { cols: 3, rows: 8, vents: 0.3, dark: 0.15, rivets: false }, seed: 50 + i });
  }
  // The street's floor: plates, a guide line, a gutter.
  S.face([[-4, 0, -1.4], [4, 0, -1.4], [4, 0, 60], [-4, 0, 60]], '#3A2C24', { twoSided: true, panels: { cols: 5, rows: 30, vents: 0.04, dark: 0.3 }, seed: 61 });
  for (const x of [-1.2, 1.6]) { const pts = [C.P([x, 0.01, -1]), C.P([x, 0.01, 50])]; S.raw(55, `<path d="M${f(pts[0][0])} ${f(pts[0][1])}L${f(pts[1][0])} ${f(pts[1][1])}" stroke="#FFB347" stroke-width="2" opacity="0.8"/>`); }
  // Left: the ward's stack, its lower floors a wall of plates, a great block overhanging the street, the cross sign.
  S.face([[-4, 0, -1.4], [-4, 0, 40], [-4, 22, 40], [-4, 22, -1.4]], rust, { twoSided: true, panels: { cols: 24, rows: 10, vents: 0.3, dark: 0.3 }, seed: 71, hatch: ENG });
  S.box([-4, 5.2, 2], [-1.8, 9.5, 16], rust2, { w: 2.2, panels: { cols: 8, rows: 3, vents: 0.25, dark: 0.2 }, seed: 73, hatch: { n: 40, slant: 0.1, below: 0.5 } });
  S.box([-3.8, 9.5, 4], [-2.4, 12, 12], dark, { w: 2, panels: { cols: 4, rows: 2, vents: 0.4, dark: 0.1 }, seed: 75 });
  for (const z of [4, 8, 12]) S.box([-3.0, 0, z - 0.4], [-2.4, 5.2, z + 0.4], dark, { w: 2, panels: { cols: 1, rows: 3, vents: 0.3, dark: 0.1 }, seed: z });
  // The sign under the block: a lit panel with the medical cross (no words), its frame and brackets.
  S.box([-1.9, 3.6, 5.0], [-1.75, 5.0, 9.0], '#1E1612', { w: 2 });
  S.face([[-1.74, 3.75, 5.2], [-1.74, 3.75, 8.8], [-1.74, 4.85, 8.8], [-1.74, 4.85, 5.2]], '#7CF2C8', { twoSided: true, glow: true });
  const crossAt = (dz, dy) => C.P([-1.73, 4.3 + dy, 7.0 + dz]);
  const cr = [[-0.25, 0.42], [0.25, 0.42], [0.25, 0.14], [0.75, 0.14], [0.75, -0.14], [0.25, -0.14], [0.25, -0.42], [-0.25, -0.42], [-0.25, -0.14], [-0.75, -0.14], [-0.75, 0.14], [-0.25, 0.14]].map(([z, y]) => crossAt(z, y));
  S.raw(C.depth([-1.73, 4.3, 7]) - 0.05, `<path d="M${cr.map(P => `${f(P[0])} ${f(P[1])}`).join('L')}Z" fill="#F4FFFB" stroke="#0A0806" stroke-width="1.2"/>`);
  S.face([[-1.74, 3.75, 5.2], [-1.74, 3.75, 6.0], [-1.74, 4.85, 6.0], [-1.74, 4.85, 5.2]], '#0E3A34', { twoSided: true, glow: true, noInk: true, alpha: 0.6 });
  S.pipe([[-3.9, 1.0, -1.4], [-3.9, 1.0, 30]], 0.22, '#6B4630', { light: '#D9A06A' });
  S.pipe([[-3.6, 2.2, -1.4], [-3.6, 2.2, 3], [-3.6, 4.6, 3], [-3.6, 4.6, 30]], 0.14, '#4F5A4A', { light: '#A9BFA0' });
  S.box([-4, 0, 18], [-2.2, 1.2, 22], dark, { w: 1.8, panels: { cols: 3, rows: 1, vents: 0.3, dark: 0 }, seed: 81 });
  // The ward's door at street level, lit amber.
  S.face([[-3.99, 0, 1.0], [-3.99, 0, 2.4], [-3.99, 2.4, 2.4], [-3.99, 2.4, 1.0]], '#FFB860', { twoSided: true, glow: true });
  // Right: an industrial stack, ducts, a turbine housing, tanks, the beacons.
  S.face([[4, 0, -1.4], [4, 0, 40], [4, 24, 40], [4, 24, -1.4]], '#3A2C26', { twoSided: true, panels: { cols: 22, rows: 12, vents: 0.35, dark: 0.3 }, seed: 91, hatch: ENG });
  S.box([1.8, 6.5, 0], [4, 10.5, 9], rust2, { w: 2.2, panels: { cols: 6, rows: 3, vents: 0.3, dark: 0.2 }, seed: 93, hatch: { n: 40, slant: 0.1, below: 0.5 } });
  S.box([2.4, 0, 10], [4, 3.2, 14], '#3E3A34', { w: 2, panels: { cols: 3, rows: 2, vents: 0.4, dark: 0.1 }, seed: 95 });
  for (const z of [16, 18.4]) { S.box([2.9, 0, z], [3.9, 6, z + 1.6], '#4F5A4A', { w: 1.8, hatch: { n: 16, slant: 0.0, below: 0.8 }, seed: z }); }
  S.pipe([[3.8, 3.2, -1.4], [3.8, 3.2, 10], [2.6, 3.2, 10], [2.6, 6.5, 10]], 0.3, '#5A4636', { light: '#C9926A' });
  S.pipe([[3.5, 11, -1.4], [3.5, 11, 25]], 0.25, '#4D5F64');
  // The turbine: a ring on the block's face, its blades (drawn turning, as still).
  const tc = C.P([1.79, 8.5, 4.5]), tr = 1.4 * tc[2];
  let turb = `<ellipse cx="${f(tc[0])}" cy="${f(tc[1])}" rx="${f(tr * 0.32)}" ry="${f(tr)}" fill="#1A1410" stroke="#0A0806" stroke-width="2"/>`;
  for (let i = 0; i < 8; i += 1) { const a = (i / 8) * TAU + 0.3; turb += `<path d="M${f(tc[0])} ${f(tc[1])}L${f(tc[0] + Math.cos(a) * tr * 0.3)} ${f(tc[1] + Math.sin(a) * tr * 0.95)}" stroke="#8A7050" stroke-width="2.4"/>`; }
  turb += `<ellipse cx="${f(tc[0])}" cy="${f(tc[1])}" rx="${f(tr * 0.32)}" ry="${f(tr)}" fill="none" stroke="#FFB347" stroke-width="2.4"/>`;
  S.raw(C.depth([1.8, 8.5, 4.5]) - 0.1, turb);
  // Cables slung across the street, beacons on their brackets.
  for (const [z, y, sag] of [[3, 12, 1.4], [7, 10.8, 1.8], [13, 13, 2.2], [20, 11, 2], [27, 14, 2.6]]) S.cable([-4, y, z], [4, y + 0.6, z + 1], sag, { r: 0.05, color: '#140E0A' });
  for (const [x, y, z] of [[-1.8, 9.5, 2.2], [1.8, 10.5, 0.4], [-1.8, 9.5, 15.6], [2.4, 3.2, 13.8]]) S.lamp([x, y, z], 0.12, '#FFB347', { bloom: 6 });
  // More of the stacks: blocks stepping out over the street, light strips, vents, abstract signs (no words).
  for (const [x0, x1, y0, y1, z0, z1, c, sd] of [[-4, -2.6, 13, 16, 0, 9, rust2, 111], [-4, -3.0, 9.5, 12.5, 18, 30, '#3E2E26', 113], [2.4, 4, 13, 17, 3, 15, rust2, 115], [3.0, 4, 3.5, 6, 18, 28, '#3E3A34', 117], [-4, -3.2, 2.5, 4.5, 24, 34, '#4A3428', 119]]) S.box([x0, y0, z0], [x1, y1, z1], c, { w: 2, panels: { cols: 6, rows: 3, vents: 0.35, dark: 0.25 }, seed: sd, hatch: { ...ENG, n: 60 } });
  for (const z of [1, 9.5, 15, 21]) S.face([[3.99, 0.3, z], [3.99, 0.3, z + 0.08], [3.99, 6.4, z + 0.08], [3.99, 6.4, z]], '#7CF2C8', { twoSided: true, glow: true, noInk: true });
  for (const [z, y, c] of [[11, 3.6, '#FFB347'], [26, 5, '#7CF2C8'], [16.5, 10, '#FFB347']]) {
    S.box([-3.95, y, z], [-3.7, y + 1.4, z + 0.5], '#1E1612', { w: 1.6 });
    S.face([[-3.69, y + 0.15, z + 0.08], [-3.69, y + 0.15, z + 0.42], [-3.69, y + 1.25, z + 0.42], [-3.69, y + 1.25, z + 0.08]], c, { twoSided: true, glow: true, panels: { cols: 1, rows: 5, vents: 0, dark: 0.4, rivets: false }, seed: z });
  }
  S.cable([-4, 6, 1], [-1.8, 5.2, 4], 0.8, { r: 0.04, color: '#140E0A' });
  S.cable([4, 7, 2], [1.8, 6.5, 6], 0.6, { r: 0.04, color: '#140E0A' });
  S.cable([-4, 17, 6], [4, 15, 11], 3.4, { r: 0.08, color: '#140E0A' });
  // The foreground: a railing along the left kerb, a pipe run low on the right, a grate in the street.
  for (let z = -0.6; z < 12; z += 1.6) S.box([-2.6, 0, z], [-2.52, 1.05, z + 0.08], '#2A1E18', { w: 1.4 });
  S.pipe([[-2.56, 1.05, -1.2], [-2.56, 1.05, 12]], 0.04, '#8A6A4E', { light: '#E9D2B0' });
  S.pipe([[-2.56, 0.6, -1.2], [-2.56, 0.6, 12]], 0.03, '#6B4630', { light: '#D9A06A' });
  S.pipe([[2.2, 0.35, -1.3], [2.2, 0.35, 8], [3.2, 0.35, 8]], 0.18, '#4D5F64', { light: '#B9C8C4' });
  S.box([2.6, 0, -1.2], [3.6, 1.6, 0.4], '#3E2E26', { w: 2.2, panels: { cols: 2, rows: 2, vents: 0.5, dark: 0.2 }, seed: 131, hatch: { ...ENG, n: 30 } });
  S.face([[-0.6, 0.012, 1.2], [0.6, 0.012, 1.2], [0.6, 0.012, 2.0], [-0.6, 0.012, 2.0]], '#1E1612', { twoSided: true, panels: { cols: 8, rows: 1, vents: 0.9, dark: 0, rivets: false }, seed: 133 });
  // A crate and a barrel at the kerb, a hand cart with its handle up: used, left where they were.
  S.box([1.9, 0, 2.2], [2.9, 0.9, 3.4], '#6E5236', { w: 2, hatch: { n: 10, slant: 0.4, below: 0.7 }, seed: 101 });
  S.box([2.0, 0.9, 2.4], [2.6, 1.4, 3.0], '#4F5A4A', { w: 1.6, seed: 103 });
  S.box([-3.3, 0, 0.2], [-2.6, 1.1, 0.9], '#5A3A26', { w: 1.8, seed: 105 });
  const svg = S.svg() + grain(W, H, 0.5);
  put(ctx, await bakeSvg(doc, svg));
  // The dust in the air, the sign's light on the street, the beacons, the door's spill.
  const sg = C.P([-1.74, 4.3, 7]); glow(ctx, sg[0], sg[1], 2.4 * sg[2], '#7CF2C8', 0.45, { sx: 0.6 });
  const dr = C.P([-3.9, 1.2, 1.7]); glow(ctx, dr[0], dr[1], 2.6 * dr[2], '#FFB860', 0.4);
  for (const [x, y, z] of [[-1.8, 9.5, 2.2], [1.8, 10.5, 0.4], [-1.8, 9.5, 15.6], [2.4, 3.2, 13.8]]) { const p = C.P([x, y, z]); glow(ctx, p[0], p[1], 1.2 * p[2], '#FFB347', 0.7); }
  smoke(ctx, 2600, { at: [330, 640], n: 10, life: 5000, rise: 0.015, drift: -0.07, r0: 40, r1: 180, color: '#D9B48A', alpha: 0.16, seed: 21 });
  smoke(ctx, 900, { at: [60, 520], n: 8, life: 5000, rise: 0.02, drift: 0.05, r0: 30, r1: 140, color: '#C99A6A', alpha: 0.14, seed: 22 });
  // Far down the street, two shapes carrying a stretcher: nobody.
  for (const [x, z, ph] of [[1.4, 10.5, 0.1], [1.4, 12.7, 0.6]]) { const p = stand(C, [x, 0, z], 1.75); await nobody(doc, ctx, { sk: tall(stridePose(ph)), at: p.at, scale: p.scale, color: '#3A2A20', rim: { dx: 0.5, dy: -0.8, color: '#E9D2B0', alpha: 0.7 } }); }
  const s1 = C.P([1.2, 0.9, 10.6]), s2 = C.P([1.2, 0.9, 12.6]);
  ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = Math.max(2, 0.2 * s1[2]); ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.stroke();
  // Her, walking toward us down the street with her case, the dust behind her.
  const me = stand(C, [-0.35, 0, 2.6], 1.72);
  const sk = tall({ ...stridePose(0.18), view: 'front', tilt: 3 });
  const fig = await mira(doc, ctx, {
    sk, headScale: 1.0, face: { look: 'desk', lids: 0.2, brow: 'knit', mouth: 'pressed', sway: 2, lift: 0 }, at: me.at, scale: me.scale,
    light: { ambient: { color: '#3A2A20', strength: 0.75 }, key: { at: [sg[0], sg[1]], z: 120, color: '#BFF4E4', gain: 1.4 }, rim: { dx: 0.6, dy: -0.8, color: '#F2D6A4', width: 3, gain: 1.1 } },
  });
  fig.draw();
  // Her case, from the near hand.
  const cs = await sprite(doc, { rect: [-60, -50, 120, 90], px: 4, inner: `<defs>${DEFS()}</defs>${caseClosed()}` });
  const hx = me.at[0] + (sk.wN[0] - 62) * me.scale, hy = me.at[1] + (sk.wN[1] - 233) * me.scale;
  ctx.save(); ctx.translate(hx + 2, hy + 18 * me.scale / 0.9); ctx.rotate(-0.06); ctx.scale(me.scale * 0.42, me.scale * 0.42); put(ctx, cs); ctx.restore();
  vignette(ctx, '#140C08', 0.7, 0.5, 0.5);
  return canvas;
}

// ── 3 · The climb ────────────────────────────────────────────────────

async function climb(doc) {
  const { canvas, ctx } = context(doc);
  const C = camera({ W, H, eye: [-7.5, 1.0, -11], look: [0.6, 0.4, 0], fov: 1.05 });
  const S = scene(C, { haze: '#140E22', fog: 400, light: [0.55, 0.75, -0.35], weight: 1.6, ambient: 0.32 });
  const ENG = { n: 90, slant: 0, always: true, opacity: 0.3, w: 0.5 };
  // Space: the swirl above, orbits, a far ringed giant; the planet's limb below with the colony a ring of fire.
  let sky = `<rect width="${W}" height="${H}" fill="#07060F"/>`;
  for (let i = 0; i < 4; i += 1) {
    const pts = [];
    for (let k = 0; k <= 40; k += 1) { const a = k * 0.17 + i * 1.6, rr = 14 + k * 6; pts.push([250 + Math.cos(a) * rr, 190 + Math.sin(a) * rr * 0.5]); }
    sky += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${['#C83C9A', '#19C7B4', '#FFB347', '#5E2A84'][i]}" stroke-width="${30 - i * 5}" stroke-linecap="round" opacity="0.45" filter="url(#px-bloom)"/>`;
  }
  const r = rng(31);
  for (let i = 0; i < 220; i += 1) sky += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(0.3 + r() ** 3 * 1.4)}" fill="#F4F0FF" opacity="${f(0.4 + r() * 0.6)}"/>`;
  for (const [rx, ry, rot, col] of [[260, 70, -14, '#7CF2C8'], [330, 96, -14, '#FFB347'], [190, 46, 10, '#E86FA8']]) sky += `<ellipse cx="250" cy="200" rx="${rx}" ry="${ry}" fill="none" stroke="${col}" stroke-width="0.9" stroke-dasharray="3 7" opacity="0.7" transform="rotate(${rot} 250 200)"/>`;
  sky += `<circle cx="96" cy="120" r="30" fill="#3A2A55"/><circle cx="96" cy="120" r="30" fill="none" stroke="#E86FA8" stroke-width="1.4"/><ellipse cx="96" cy="120" rx="62" ry="12" fill="none" stroke="#FFD58A" stroke-width="2" opacity="0.8" transform="rotate(-20 96 120)"/>`;
  sky += `<defs><radialGradient id="cl-pl" cx="0.5" cy="0.1" r="0.8"><stop offset="0" stop-color="#C77A3E"/><stop offset="0.5" stop-color="#5A2E18"/><stop offset="1" stop-color="#120804"/></radialGradient></defs>`;
  sky += `<circle cx="150" cy="1420" r="720" fill="url(#cl-pl)"/><circle cx="150" cy="1420" r="720" fill="none" stroke="#FFC27A" stroke-width="3" opacity="0.7"/><circle cx="150" cy="1420" r="736" fill="none" stroke="#FFC27A" stroke-width="16" opacity="0.12"/>`;
  sky += `<ellipse cx="170" cy="770" rx="110" ry="22" fill="none" stroke="#FFA64D" stroke-width="7" opacity="0.85" filter="url(#px-soft)"/>`;
  S.raw(9999, sky);
  // Rocks: far ones small and sharp, near ones big; each shaded on its night side and stippled.
  const rocks = [];
  const rr = rng(17);
  for (let i = 0; i < 26; i += 1) rocks.push([-14 + rr() * 30, -6 + rr() * 14, -4 + rr() * 30, 0.2 + rr() ** 2 * 1.4, rr() * 100]);
  rocks.push([-6.2, -3.1, -7.4, 0.9, 7], [-4.6, 2.8, -7.8, 0.6, 9], [-1.5, -3.8, -5.5, 1.1, 11]);
  for (const [x, y, z, rad, seed] of rocks) {
    const P = C.P([x, y, z]), R = rad * P[2], q = rng(Math.floor(seed * 13) + 1);
    if (P[3] < 0.5) continue;
    const pts = []; for (let k = 0; k < 11; k += 1) { const a = (k / 11) * TAU, w = 0.75 + q() * 0.45; pts.push([P[0] + Math.cos(a) * R * w, P[1] + Math.sin(a) * R * w * 0.85]); }
    const d = `M${pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L')}Z`, near = P[3] < 7;
    let s = `<g${near ? ' filter="url(#px-soft)"' : ''}><path d="${d}" fill="#7A5550"/><path d="${d}" fill="#3A2428" transform="translate(${f(R * 0.25)} ${f(R * 0.2)})" clip-path="url(#none)" opacity="0.001"/>`;
    s += `<clipPath id="rk${Math.floor(seed * 100)}"><path d="${d}"/></clipPath><g clip-path="url(#rk${Math.floor(seed * 100)})"><circle cx="${f(P[0] + R * 0.45)}" cy="${f(P[1] + R * 0.4)}" r="${f(R * 0.95)}" fill="#3A2428"/>`;
    for (let k = 0; k < 18; k += 1) s += `<circle cx="${f(P[0] + (q() - 0.5) * R * 1.6)}" cy="${f(P[1] + (q() - 0.5) * R * 1.6)}" r="${f(Math.max(0.4, R * 0.04))}" fill="#1A0F12"/>`;
    s += `</g><path d="${d}" fill="none" stroke="#07080C" stroke-width="${f(Math.max(0.6, R * 0.04))}"/></g>`;
    S.raw(P[3] + (near ? -100 : 0), s);
  }
  // The shuttle: a long hull of overlapping blocks, pods, greebles; three engines burning back toward us.
  const F = v3.norm([0.85, 0.42, 0.32]), Sd = v3.norm(v3.cross(F, [0, 1, 0])), U = v3.cross(Sd, F);
  const B = { f: F, u: U, s: Sd };
  const at = (a, b, c) => v3.add(v3.add(v3.mul(F, a), v3.mul(U, b)), v3.mul(Sd, c));
  const hull = '#9C9AAE', plate = '#B9B6C6', warm = '#C8783C', sage = '#86A28A';
  S.obox(at(0, 0, 0), [3.4, 0.55, 0.8], B, hull, { w: 2.2, panels: { cols: 22, rows: 5, vents: 0.3, dark: 0.3 }, seed: 1, hatch: ENG });
  S.obox(at(0.6, 0.62, 0), [2.2, 0.18, 0.55], B, plate, { w: 2, panels: { cols: 14, rows: 3, vents: 0.35, dark: 0.25 }, seed: 11, hatch: { ...ENG, n: 60 } });
  S.obox(at(2.4, 0.78, 0), [0.55, 0.16, 0.38], B, '#3A4458', { w: 1.6, seed: 21 });
  S.obox(at(-0.6, 0.66, 0.3), [0.8, 0.12, 0.25], B, warm, { w: 1.6, panels: { cols: 3, rows: 1, vents: 0.5, dark: 0 }, seed: 23 });
  S.obox(at(1.2, 0.66, -0.3), [0.5, 0.1, 0.2], B, sage, { w: 1.4, seed: 25 });
  // The nose: a wedge, narrowing forward.
  {
    const nb = (a, b, c) => at(a, b, c);
    S.solid([nb(3.4, -0.5, -0.75), nb(5.2, -0.25, -0.3), nb(5.2, 0.15, -0.3), nb(3.4, 0.55, -0.75), nb(3.4, -0.5, 0.75), nb(5.2, -0.25, 0.3), nb(5.2, 0.15, 0.3), nb(3.4, 0.55, 0.75)], plate, { w: 2, panels: { cols: 6, rows: 2, vents: 0.25, dark: 0.3 }, seed: 27, hatch: { ...ENG, n: 40 } });
    S.solid([nb(3.6, 0.5, -0.4), nb(4.6, 0.2, -0.25), nb(4.6, 0.3, -0.25), nb(3.6, 0.7, -0.4), nb(3.6, 0.5, 0.4), nb(4.6, 0.2, 0.25), nb(4.6, 0.3, 0.25), nb(3.6, 0.7, 0.4)], '#2A3448', { w: 1.6, seed: 29 });
  }
  for (const side of [-1, 1]) {
    S.obox(at(-1.8, 0.1, side * 1.25), [1.6, 0.32, 0.42], B, hull, { w: 2, panels: { cols: 10, rows: 3, vents: 0.35, dark: 0.3 }, seed: 31 + side, hatch: { ...ENG, n: 50 } });
    S.obox(at(-1.0, 0.1, side * 0.95), [0.5, 0.12, 0.3], B, warm, { w: 1.4, seed: 35 + side });
    S.obox(at(-3.35, 0.1, side * 1.25), [0.22, 0.3, 0.3], B, '#3A3440', { w: 1.6, seed: 37 + side });
  }
  S.obox(at(-3.6, 0, 0), [0.28, 0.42, 0.5], B, '#3A3440', { w: 1.8, seed: 41 });
  const gq = rng(43);
  for (const [a0, side, c] of [[-0.2, 0.3, warm], [1.6, -0.35, sage], [-1.6, 0.2, sage], [2.6, 0.1, warm]]) S.obox(at(a0, 0.57, side), [0.45, 0.025, 0.28], B, c, { w: 1.2, panels: { cols: 3, rows: 2, vents: 0.5, dark: 0.2 }, seed: a0 * 10 + 90 });
  for (let i = 0; i < 46; i += 1) S.obox(at(-2.8 + gq() * 5.6, 0.56 + gq() * 0.12, (gq() - 0.5) * 1.3), [0.08 + gq() * 0.18, 0.04 + gq() * 0.06, 0.06 + gq() * 0.12], B, gq() < 0.2 ? warm : plate, { w: 1, seed: 50 + i });
  // Ports along the hull, lit.
  for (let i = 0; i < 9; i += 1) { const p = C.P(at(-1.6 + i * 0.42, 0.25, -0.81)); S.raw(C.depth(at(0, 0, -0.81)) - 0.5, `<rect x="${f(p[0] - 1.6)}" y="${f(p[1] - 1)}" width="3.2" height="2" fill="#FFE6B0"/>`); }
  // The engines' trails, just behind the hull: long, cyan, white at the core.
  let trails = '';
  for (const c of [at(-3.65, 0.1, 1.25), at(-3.85, 0, 0), at(-3.65, 0.1, -1.25)]) {
    const a = C.P(c), b = C.P(v3.add(c, v3.mul(F, -26)));
    trails += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="#19C7B4" stroke-width="${f(0.7 * a[2])}" stroke-linecap="round" opacity="0.5" filter="url(#px-soft)"/><path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="#7CF2C8" stroke-width="${f(0.32 * a[2])}" stroke-linecap="round" opacity="0.9"/><path d="M${f(a[0])} ${f(a[1])}L${f((a[0] * 2 + b[0]) / 3)} ${f((a[1] * 2 + b[1]) / 3)}" stroke="#F4FFFB" stroke-width="${f(0.12 * a[2])}" stroke-linecap="round"/>`;
  }
  S.raw(C.depth(at(-3.6, 0, 0)) + 2, trails);
  const svg = S.svg() + grain(W, H, 0.5);
  put(ctx, await bakeSvg(doc, svg));
  for (const c of [at(-3.65, 0.1, 1.25), at(-3.85, 0, 0), at(-3.65, 0.1, -1.25)]) { const p = C.P(c); glow(ctx, p[0], p[1], 0.9 * p[2], '#7CF2C8', 0.9); glow(ctx, p[0], p[1], 0.25 * p[2], '#FFFFFF', 1); }
  for (const c of [at(3.8, 0.2, 0.5), at(3.8, 0.2, -0.5)]) { const p = C.P(c); glow(ctx, p[0], p[1], 10, '#FFE0A3', 0.9); }
  for (let i = 0; i < 6; i += 1) { const x = 90 + i * 30 + Math.sin(i) * 10, y = 770 + Math.cos(i * 1.7) * 14; glow(ctx, x, y, 14, '#FFA64D', 0.9); smoke(ctx, 1000 + i * 300, { at: [x, y], n: 5, life: 3000, rise: 0.02, drift: 0.005, r0: 3, r1: 18, color: '#1A0D08', alpha: 0.5, seed: i + 3 }); }
  vignette(ctx, '#05040A', 0.7);
  return canvas;
}

export const PLATES = Object.freeze([
  { id: 'hospital', title: 'The Hospital, aboard', line: 'The Doctor holds the last injector up to the surgical light. Behind her, somebody sits up in the middle bed. Beyond the port, the swirl.' },
  { id: 'street', title: 'Colony Nine', line: 'The street between the stacks, in the dust. The ward\'s cross is the only sign still lit. She walks toward us with her case. Far behind her, two shapes carry a stretcher.' },
  { id: 'climb', title: 'The climb', line: 'The shuttle that took her off climbs through the debris on three cyan engines. Below, the colony is a ring of fire. Above, the sky turns.' },
]);

export async function renderPlates(doc) {
  return [await hospital(doc), await street(doc), await climb(doc)];
}

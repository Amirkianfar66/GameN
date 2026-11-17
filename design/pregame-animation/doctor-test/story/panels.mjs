// "The Last Two Doses": the Doctor's dark story as eight still panels, composed on a canvas in the new world (the
// owner, 16 November 2026: "Before creating the animation let's create some images as story telling of Doctor role
// imagine a dark story"). Mira plays the Doctor, posed on the approved rig with the new finish and kit; everyone else is
// nobody. Each panel is a phone held upright (390 x 844 points), drawn at 2 pixels a point. Development pictures only.

import { glow, motes, rgba, sprite } from '../../../phone-ui/components/boarding-film/engine.mjs';
import { stridePose } from '../../../phone-ui/components/boarding-film/cast.mjs';
import { STAND } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { GESTURES } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { KEYS_B } from '../acting.mjs';
import { HAND_BOX, HEAD_BOX, bodyBox, bodySvg, handPlace, handSvg, headLook, headSvg, injector } from '../drawings.mjs';
import { smoke, wardBackLive, monitorLive, wardLight, lampAt } from '../world/live.mjs';
import { wardPlanes } from '../world/ward.mjs';
import { DEFS, P1, P3, P4, P5, P6, P7, caseClosed, climb, colony, cots, doses, hatchView, sealed, sheetOver, twoBeds, vials } from './sets.mjs';

export const SIZE = Object.freeze([390, 844]);
const FINISH = Object.freeze({ outline: 1.25, hatch: 2.1, wear: 0.25 });
const TAU = Math.PI * 2;

/** The story: each panel's title and the line it carries (for the storyboard page; the pictures have no words). */
export const STORY = Object.freeze([
  { title: 'Colony Nine', line: 'The fever came in with the dust. By the second winter there was a quarantine beacon on every mast, and one door in the colony still lit.' },
  { title: 'The ward', line: 'She learned the sound of every cot: the breathing, and the silences between. The sheets were drawn up one at a time.' },
  { title: 'The relief ship', line: 'The relief ship came down through the storm, circled the ward once, and climbed away. Nobody aboard would land.' },
  { title: 'Two doses left', line: 'Twelve wells in the case. Ten empty. She counted them every night, as if the number might change.' },
  { title: 'Two beds', line: 'Two beds. Two doses, and each of them needed both. She never told anyone what she did that night.' },
  { title: 'The seal', line: 'At dawn the order came to seal the ward. She was on the outside of the door.' },
  { title: 'Burning clean', line: 'From the climb, she watched the colony burn clean. She kept the case on her knees the whole way up.' },
  { title: 'Aboard', line: 'Years later, aboard the Mothership, she still carries it. Whatever this voyage asks of her, she has chosen before.' },
]);

// ── Drawing helpers ──────────────────────────────────────────────────

function context(doc, dpr = 2) {
  const canvas = doc.createElement('canvas');
  canvas.width = SIZE[0] * dpr; canvas.height = SIZE[1] * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx, dpr };
}
const bake = (doc, inner, rect, px) => sprite(doc, { rect, px, inner: `<defs>${DEFS()}</defs>${inner}` });
const put = (ctx, s) => ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);

/** The figure's frame for a figure standing at `at` (px) drawn `scale` px a unit, facing left (or right, `flip`). */
const frameOf = (at, scale, flip) => ({
  toFig: ([x, y]) => [62 + (flip ? -1 : 1) * (x - at[0]) / scale, 233 + (y - at[1]) / scale],
  apply: ctx => { ctx.translate(at[0], at[1]); ctx.scale(flip ? -scale : scale, scale); ctx.translate(-62, -233); },
});

/**
 * Mira, the Doctor: her body in `sk` with the new kit and finish, her acting head (`face`), and if asked her far hand
 * apart (`hand`: open, closing, fist) holding the injector (`injector`: an angle). `light` in the panel's px.
 */
async function mira(doc, ctx, { sk, face, light, at, scale, flip = false, hand = null, holds = null, legs = true, dpr = 2 }) {
  const F = frameOf(at, scale, flip);
  const look = {
    ambient: light.ambient,
    key: light.key && { ...light.key, at: F.toFig(light.key.at), z: light.key.z / scale },
    rim: light.rim && { ...light.rim, dx: flip ? -light.rim.dx : light.rim.dx, width: light.rim.width / scale },
    novel: FINISH,
  };
  const skBody = hand ? { ...sk, handF: { type: 'none' } } : sk;
  const box = bodyBox(skBody, { legs, item: true });
  const px = scale * dpr * 1.1;
  const [body, head] = await Promise.all([
    sprite(doc, { rect: box, px, inner: bodySvg(skBody, { look, legs, box, kit: true }) }),
    sprite(doc, { rect: HEAD_BOX, px: px * 1.2, inner: headSvg(face, { look: headLook(look, sk) }) }),
  ]);
  const handS = hand ? await sprite(doc, { rect: HAND_BOX, px: px * 1.3, inner: handSvg(hand, { look: { ...look, key: null, rim: null, novel: { outline: 0.9, wear: 0 } } }) }) : null;
  const inj = holds != null ? injector() : null;
  const injS = inj ? await sprite(doc, { rect: inj.box, px: px * 0.6, inner: inj.svg }) : null;
  return {
    body, head,
    draw(c = ctx, { shadowOnly = false } = {}) {
      c.save();
      F.apply(c);
      put(c, body);
      c.save(); c.translate(sk.head[0], sk.head[1]); c.rotate(((sk.tilt ?? 0) * Math.PI) / 180); c.scale(1.2, 1.2); put(c, head); c.restore();
      if (handS) {
        const { at: w, angle } = handPlace(sk);
        if (injS) {
          c.save(); c.translate(w[0], w[1]); c.rotate((holds * Math.PI) / 180); c.scale(0.5, 0.5); c.translate(-inj.grip[0], -inj.grip[1] + 4); put(c, injS); c.restore();
        }
        c.save(); c.translate(w[0], w[1]); c.rotate((angle * Math.PI) / 180); put(c, handS); c.restore();
      }
      c.restore();
      void shadowOnly;
    },
  };
}

/** Nobody: a figure in one flat colour with a plain oval head (no face, no hair, nothing that says who), rimmed. */
async function nobody(doc, ctx, { sk, at, scale, color = '#120B07', rim = null, flip = false, dpr = 2 }) {
  const box = bodyBox(sk, { legs: true, item: true });
  const flat = c => `<defs><filter id="nb" filterUnits="userSpaceOnUse" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"><feFlood flood-color="${c}"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>`
    + `<g filter="url(#nb)">${bodySvg({ ...sk, handF: { type: 'none' }, handN: { type: 'none' } }, { look: null, legs: true, box, character: 'c5' })}<rect x="${sk.head[0] - 6}" y="${sk.head[1]}" width="12" height="${sk.neck[1] - sk.head[1]}"/><ellipse cx="${sk.head[0]}" cy="${sk.head[1] - 3}" rx="14" ry="17"/></g>`;
  const s = await sprite(doc, { rect: box, px: scale * dpr, inner: flat(color) });
  const r = rim ? await sprite(doc, { rect: box, px: scale * dpr, inner: flat(rim.color) }) : null;
  const F = frameOf(at, scale, flip);
  ctx.save(); F.apply(ctx);
  if (r) { ctx.save(); ctx.translate(rim.dx * 1.6, rim.dy * 1.6); ctx.globalAlpha = rim.alpha ?? 0.9; put(ctx, r); ctx.restore(); }
  put(ctx, s);
  ctx.restore();
}

function vignette(ctx, color, k, cx = 0.5, cy = 0.45) {
  const [W, H] = SIZE;
  const g = ctx.createRadialGradient(W * cx, H * cy, W * 0.3, W * cx, H * cy, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function beamCone(ctx, from, to, w0, w1, color, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
  const dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(from[0] + nx * w0, from[1] + ny * w0); ctx.lineTo(to[0] + nx * w1, to[1] + ny * w1); ctx.lineTo(to[0] - nx * w1, to[1] - ny * w1); ctx.lineTo(from[0] - nx * w0, from[1] - ny * w0);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** A figure's shadow thrown along the floor from its feet, toward the lens, by a light behind it. */
function castShadow(ctx, fig, { feet, length = 0.7, skew = 0, alpha = 0.6 }) {
  const c = ctx.canvas.ownerDocument.createElement('canvas'), [W, H] = SIZE;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  fig.draw(x);
  ctx.save();
  ctx.filter = 'brightness(0) blur(3px)'; ctx.globalAlpha = alpha;
  ctx.translate(feet[0], feet[1]); ctx.transform(1, 0, skew, -length, 0, 0); ctx.translate(-feet[0], -feet[1]);
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
  c.width = 0; c.height = 0;
}

// ── The panels ───────────────────────────────────────────────────────

async function p1(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, colony(), [0, 0, 390, 844], 2));
  for (const [x, y] of P1.beacons) glow(ctx, x, y - 5, 26, '#FFB347', 0.9);
  glow(ctx, P1.door[0], P1.door[1] - 12, 90, '#FFB860', 0.55);
  glow(ctx, P1.sun[0], P1.sun[1], 120, '#F2C38A', 0.25);
  const sk = { ...stridePose(0.18), view: 'front', tilt: 4 };
  const fig = await mira(doc, ctx, {
    sk, face: { look: 'desk', lids: 0.25, brow: 'knit', mouth: 'pressed', sway: 3, lift: 0 }, at: [214, 612], scale: 0.62,
    light: { ambient: { color: '#3A2414', strength: 0.82 }, key: { at: [112, 470], z: 50, color: '#FFB860', gain: 1.8 }, rim: { dx: 0.8, dy: -0.55, color: '#F2C38A', width: 2.2, gain: 1 } },
  });
  fig.draw();
  // Her case, swinging from the near hand.
  const cs = await bake(doc, caseClosed(), [-60, -50, 120, 90], 2);
  const [hx, hy] = [214 + (sk.wN[0] - 62) * 0.62, 612 + (sk.wN[1] - 233) * 0.62];
  ctx.save(); ctx.translate(hx + 2, hy + 14); ctx.rotate(-0.08); ctx.scale(0.36, 0.36); put(ctx, cs); ctx.restore();
  smoke(ctx, 1800, { at: [380, 760], n: 10, life: 4000, rise: 0.02, drift: -0.08, r0: 30, r1: 140, color: '#C9915A', alpha: 0.2, seed: 3 });
  vignette(ctx, '#0E0604', 0.8);
  return canvas;
}

async function p2(doc) {
  const { canvas, ctx } = context(doc);
  const Wd = wardPlanes(), s = 844 / 700, ox = -70;
  const t = 1250;
  ctx.save(); ctx.translate(ox, 0); ctx.scale(s, s);
  const back = await sprite(doc, { rect: [-40, -20, 600, 760], px: 2 * s, inner: `<defs>${Wd.defs}</defs>${Wd.back}` });
  put(ctx, back); wardBackLive(ctx, t);
  const room = await sprite(doc, { rect: [-10, 280, 540, 440], px: 2 * s, inner: `<defs>${Wd.defs}${DEFS()}</defs>${Wd.room}${sheetOver()}` });
  put(ctx, room); monitorLive(ctx, t);
  wardLight(ctx, t, { before: true });
  ctx.restore();
  const [lx, ly] = lampAt(t);
  const fig = await mira(doc, ctx, {
    sk: KEYS_B.read, face: { look: 'readM', lids: 0.5, brow: 'knit', mouth: 'pressed', sway: 0, lift: 0 }, at: [128, 838], scale: 2.524 * s * 0.74,
    light: { ambient: { color: '#3A2416', strength: 0.74 }, key: { at: [ox + lx * s, ly * s + 20], z: 70, color: '#FFC27A', gain: 1.8 }, rim: { dx: 0.7, dy: -0.7, color: '#FFD9A0', width: 3, gain: 0.9 } },
  });
  fig.draw();
  ctx.save(); ctx.translate(ox, 0); ctx.scale(s, s); wardLight(ctx, t, { before: false }); ctx.restore();
  vignette(ctx, '#0E0804', 0.85);
  return canvas;
}

async function p3(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, hatchView(), [0, 0, 390, 844], 2));
  const [cx, cy, r] = P3.port, [sx, sy] = P3.ship;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  // Its searchlight sweeping the storm, its engines burning as it climbs, its lights.
  beamCone(ctx, [sx + 10, sy + 10], [sx + 120, sy + 260], 4, 70, '#D8F0FF', 0.35);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i += 1) { ctx.strokeStyle = rgba('#7CF2C8', 0.5 - i * 0.12); ctx.lineWidth = 6 - i * 1.5; ctx.beginPath(); ctx.moveTo(sx - 40, sy + 22 + i * 3); ctx.quadraticCurveTo(sx - 120, sy + 110, sx - 170, sy + 250); ctx.stroke(); }
  ctx.restore();
  glow(ctx, sx - 38, sy + 18, 40, '#7CF2C8', 0.9); glow(ctx, sx - 38, sy + 18, 12, '#FFFFFF', 1);
  glow(ctx, sx + 42, sy - 16, 10, '#FFE0A3', 1); glow(ctx, sx - 2, sy - 2, 8, '#FFFFFF', 0.9);
  ctx.restore();
  // The ward's warmth spilling from the right.
  glow(ctx, 420, 520, 260, '#FFB860', 0.35, { sy: 1.6 });
  const sk = { ...STAND, view: 'front', head: [51, 39], tilt: -7, neck: [59, 65], sF: [38, 73], eF: [22, 60], wF: [21, 33], handF: { type: 'none' }, sN: [83, 72], eN: [91, 104], wN: [86, 132], handN: { angle: 95 }, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'] };
  const fig = await mira(doc, ctx, {
    sk, hand: 'open', face: { look: 'out', lids: 0.1, brow: 'soft', mouth: 'parted', sway: 1, lift: 0 }, at: [340, 806], scale: 2.4,
    light: { ambient: { color: '#1E2A36', strength: 0.85 }, key: { at: [160, 260], z: 120, color: '#D8F0FF', gain: 1.7 }, rim: { dx: 0.9, dy: -0.3, color: '#FFB860', width: 3.4, gain: 1 } },
  });
  fig.draw();
  vignette(ctx, '#05070A', 0.8, 0.45, 0.42);
  return canvas;
}

async function p4(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, doses(), [0, 0, 390, 844], 2));
  beamCone(ctx, [P4.lamp[0] + 10, P4.lamp[1] + 10], [200, 560], 24, 190, '#FFE2A8', 0.32);
  glow(ctx, 200, 500, 200, '#FFD58E', 0.35, { sy: 0.6 });
  // The two vials, glowing in their wells.
  for (const [x, y] of P4.vials) glow(ctx, x, y - 26, 60, '#FFE9B8', 0.8);
  put(ctx, await bake(doc, vials(), [140, 400, 110, 90], 3));
  for (const [x, y] of P4.vials) glow(ctx, x, y - 22, 16, '#FFFFFF', 0.7);
  glow(ctx, P4.lamp[0] + 3, P4.lamp[1] + 3, 50, '#FFE6B0', 0.9);
  motes(ctx, { seed: 7, n: 60, t: 1500, box: [60, 220, 260, 360], size: [0.6, 1.6], color: '#FFF0CC', alpha: 0.8, speed: 0.4 });
  // Her hand coming into the light from the right, its shadow on the case.
  const look = { ambient: { color: '#2A1E16', strength: 0.78 }, key: { at: [-40, -30], z: 30, color: '#FFD58E', gain: 1.1 }, rim: { dx: -0.7, dy: -0.7, color: '#FFE6B0', width: 0.8, gain: 0.9 }, novel: { outline: 0.6, hatch: 1.0, wear: 0 } };
  const hs = await sprite(doc, { rect: HAND_BOX, px: 14, inner: handSvg('open', { look }) });
  const at = [318, 352], ang = (152 * Math.PI) / 180, k = 4.6;
  const place = c => { c.save(); c.translate(at[0], at[1]); c.rotate(ang); c.scale(k, k); put(c, hs); c.restore(); };
  ctx.save(); ctx.filter = 'brightness(0) blur(5px)'; ctx.globalAlpha = 0.5; ctx.translate(26, 64); place(ctx); ctx.restore();
  // The forearm in its sleeve, the cuff in her colour, coming in from the right out of the dark.
  const arm = new Path2D(); arm.moveTo(at[0] + 2, at[1] - 2); arm.lineTo(at[0] + 160, at[1] - 90);
  ctx.save(); ctx.lineCap = 'butt';
  ctx.strokeStyle = '#08070A'; ctx.lineWidth = 46; ctx.stroke(arm);
  ctx.strokeStyle = '#4A4543'; ctx.lineWidth = 40; ctx.stroke(arm);
  ctx.strokeStyle = '#8E8270'; ctx.lineWidth = 14; ctx.translate(-4, -8); ctx.stroke(arm); ctx.restore();
  ctx.save(); ctx.translate(at[0] + 18, at[1] - 10); ctx.rotate(Math.atan2(-90, 158));
  ctx.fillStyle = '#9C7A50'; ctx.strokeStyle = '#08070A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(-8, -23, 18, 46); ctx.fill(); ctx.stroke(); ctx.restore();
  place(ctx);
  vignette(ctx, '#080503', 0.85);
  return canvas;
}

async function p5(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, twoBeds(), [0, 0, 390, 844], 2));
  const [dx, dy, dw, dh] = P5.door;
  glow(ctx, dx, dy + dh / 2, 160, '#CFE8F0', 0.4, { sy: 1.3 });
  beamCone(ctx, [dx, dy + dh * 0.6], [dx, 900], dw * 0.45, 230, '#CFE8F0', 0.18);
  motes(ctx, { seed: 9, n: 70, t: 2000, box: [90, 260, 210, 500], size: [0.5, 1.5], color: '#E6F6FF', alpha: 0.7, speed: 0.3 });
  // The two in the beds: one sitting up, one lying still; nobody, both.
  put(ctx, await bake(doc, cots(), [0, 480, 390, 364], 2));
  await nobody(doc, ctx, { sk: GESTURES.bedSitting, at: [106, 606], scale: 0.66, color: '#0B0705', rim: { dx: 0, dy: -1, color: '#9FC4D0', alpha: 0.9 } });
  ctx.fillStyle = '#0B0705'; ctx.beginPath(); ctx.ellipse(288, 590, 12, 10, 0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#9FC4D0', 0.75); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(288, 589, 12, 10, 0.3, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  // Her, between them, the door behind: a dark shape rimmed in its light, the injector low at her side, glowing faintly.
  const sk = { ...STAND, view: 'front', head: [58, 40], tilt: 7, neck: [61, 65], sF: [39, 74], eF: [33, 105], wF: [31, 135], handF: { type: 'none' }, sN: [84, 73], eN: [92, 104], wN: [87, 133], handN: { angle: 95 }, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'] };
  const fig = await mira(doc, ctx, {
    sk, hand: 'fist', holds: 180, face: { look: 'desk', lids: 0.55, brow: 'knit', mouth: 'pressed', sway: 0, lift: 0 }, at: [200, 836], scale: 1.95,
    light: { ambient: { color: '#120C08', strength: 0.9 }, key: { at: [150, 640], z: 60, color: '#FFB860', gain: 0.9 }, rim: { dx: 0, dy: -1, color: '#CFE8F0', width: 4, gain: 1.3 } },
  });
  castShadow(ctx, fig, { feet: [200, 836], length: 0.5, skew: 0.15, alpha: 0.55 });
  fig.draw();
  glow(ctx, 200 + (31 - 62) * 1.95 - 4, 836 + (135 - 233) * 1.95 + 36, 24, '#FFE9B8', 0.6);
  vignette(ctx, '#060403', 0.9, 0.5, 0.4);
  return canvas;
}

async function p6(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, sealed(), [0, 0, 390, 844], 2));
  // The beacons turning, amber; steam from the pipe; on the porthole's glass, from inside, the print of a hand.
  for (const [bx, by] of P6.beacons) { glow(ctx, bx, by, 70, '#FFB347', 0.8); beamCone(ctx, [bx, by], [bx - 160, by + 420], 6, 90, '#FFB347', 0.2); }
  smoke(ctx, 2200, { at: [44, 300], n: 9, life: 3000, rise: 0.04, drift: 0.03, r0: 6, r1: 50, color: '#AEB9C8', alpha: 0.18, seed: 4 });
  const [px, py, pr] = P6.port;
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
  ctx.fillStyle = rgba('#3A4552', 0.5); ctx.beginPath(); ctx.ellipse(px + 6, py + 10, 14, 18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#C9D2DE', 0.28);
  ctx.beginPath(); ctx.ellipse(px - 6, py + 4, 8, 10, 0.2, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.ellipse(px - 16 + i * 6, py - 10 - (i === 0 || i === 3 ? 0 : 4), 2.2, 6, -0.2 + i * 0.12, 0, TAU); ctx.fill(); }
  ctx.restore();
  const sk = { ...STAND, view: 'front', head: [49, 43], tilt: -13, neck: [57, 67], sF: [37, 75], eF: [20, 64], wF: [21, 38], handF: { type: 'none' }, sN: [82, 74], eN: [90, 105], wN: [85, 133], handN: { angle: 95 }, order: ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'] };
  const fig = await mira(doc, ctx, {
    sk, hand: 'open', flip: true, face: { look: 'ahead', lids: 1, brow: 'soft', mouth: 'closed', sway: -1, lift: 0 }, at: [72, 830], scale: 2.3,
    light: { ambient: { color: '#1A2028', strength: 0.86 }, key: { at: [140, 120], z: 120, color: '#FFB347', gain: 1.5 }, rim: { dx: 0.6, dy: -0.8, color: '#FFD08A', width: 3, gain: 0.9 } },
  });
  fig.draw();
  vignette(ctx, '#05070A', 0.85, 0.4, 0.45);
  return canvas;
}

async function p7(doc) {
  const { canvas, ctx } = context(doc);
  put(ctx, await bake(doc, climb(), [0, 0, 390, 844], 2));
  const [wx, wy, ww, wh] = P7.window;
  ctx.save(); ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 40); ctx.clip();
  // The fires in a ring on the planet's limb, their smoke going up black into the dust; the swirl turning above.
  for (const [x, y] of P7.fires) { glow(ctx, x, y, 34, '#FFA64D', 0.85); glow(ctx, x, y, 10, '#FFE0A3', 1); smoke(ctx, 1500 + x * 10, { at: [x, y], n: 6, life: 3000, rise: 0.03, drift: 0.01, r0: 4, r1: 26, color: '#1A0D08', alpha: 0.5, seed: x }); }
  glow(ctx, 150, 480, 150, '#FFA64D', 0.3, { sy: 0.4 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i += 1) { ctx.strokeStyle = rgba(['#E86FA8', '#3FE0D0', '#FFB347'][i % 3], 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(170, 210, 40 + i * 24, (40 + i * 24) * 0.55, 0.1, i, i + 2.2); ctx.stroke(); }
  ctx.restore();
  for (const [x, y, c] of [[380, 286, '#7CF2C8'], [40, 330, '#FFB347'], [120, 284, '#E86FA8']]) glow(ctx, x, y, 8, c, 0.9);
  ctx.restore();
  glow(ctx, 330, 650, 20, '#FFB347', 0.8);
  const base = GESTURES.laptopStool;
  const sk = { ...base, head: [56, 92], tilt: -8, view: 'front', sF: [50, 128], eF: [46, 154], wF: [36, 167], handF: { angle: 180, type: 'fist' }, sN: [78, 126], eN: [72, 154], wN: [54, 168], handN: { angle: 180, type: 'fist' }, prop: null, order: ['legF', 'legN', 'neck', 'torso', 'armF', 'armN', 'head'] };
  const fig = await mira(doc, ctx, {
    sk, face: { look: 'out', lids: 0.2, brow: 'soft', mouth: 'closed', sway: 0, lift: 0 }, at: [300, 878], scale: 2.6,
    light: { ambient: { color: '#1A2030', strength: 0.86 }, key: { at: [150, 430], z: 110, color: '#FFB070', gain: 1.9 }, rim: { dx: -0.8, dy: -0.5, color: '#7CF2C8', width: 3, gain: 1 } },
  });
  fig.draw();
  const cs = await bake(doc, caseClosed(), [-60, -50, 120, 90], 4);
  ctx.save(); ctx.translate(300 + (44 - 62) * 2.6, 878 + (166 - 233) * 2.6); ctx.rotate(-0.05); ctx.scale(1.15, 1.15); put(ctx, cs); ctx.restore();
  vignette(ctx, '#05060A', 0.8, 0.45, 0.45);
  return canvas;
}

/** The panels, in order. Panel 8 is the film's own frame (the test's scene), passed in as `aboard`. */
export async function renderStory(doc, { aboard }) {
  const out = [];
  for (const make of [p1, p2, p3, p4, p5, p6, p7]) out.push(await make(doc));
  out.push(await aboard());
  return out;
}

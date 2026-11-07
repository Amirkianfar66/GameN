// mothership:dev-only
//
// The pilot's figures: the redesign's crew suit and the pilot's heads (head.mjs), drawn on the
// approved rig's skeletons (design/board-motion/figures/: gestures.mjs, motion.mjs). It reads the
// rig's frame, joints and drawing order and never changes them, so every gesture, the walk and
// every animation the rig plays can be drawn in the new style. Who a character is (cast.mjs)
// changes the head, the colours and the build; a gesture never says anything about who it is.
//
// The suit, as the owner's sheet draws it: canvas fronts with charcoal side panels, loose cargo
// trousers with dark knee pads and a thigh pocket, tall lace-up boots, and the character's colour
// on the shoulder pads, collar, cuffs, buckle and boot bands.

import { FRAME, ORDER } from '../board-motion/figures/body.mjs';
import { BUILDS, SUIT } from './cast.mjs';
import { TRACED_HEADS, pilotHead } from './head.mjs';
import { INK, add, inkCanvas, lerp, limbOutline, mul, perp, shade, spline, sub, unit, waver } from './ink.mjs';

/** Limb radii at the joints (the rig's ARM, and LEG cut looser for cargo trousers), scaled by a build. */
const ARM = [8.2, 6.8, 5.4];
const LEG = [12.4, 10.6, 8.8];
/** The head frame's scale: Mira's head against her body as the owner's example draws it (the rig's own is 1.32). */
export const PILOT_HEAD_SCALE = 1.2;
/** Light from the upper left (ink.mjs): the side a panel's shadow falls on. */
const AWAY = unit([1, 0.78]);

const deg = v => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const fx = v => v.map(n => n.toFixed(2)).join(' ');
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** The normal of a direction that points away from the light. */
const awaySide = dir => { const n = perp(dir); return dot(n, AWAY) >= 0 ? n : mul(n, -1); };

function torsoPoints(sk, build) {
  const { sN, sF, neck, pelvis, hipN, hipF } = sk;
  const up = unit(sub(neck, pelvis));
  const down = mul(up, -1);
  const mid = lerp(sF, sN, 0.5);
  const wide = (p, k) => add(mid, sub(p, mid), k);
  const sFw = wide(sF, build.torso), sNw = wide(sN, build.torso);
  const outF = unit(sub(sF, mid)), outN = unit(sub(sN, mid));
  const hipMid = lerp(hipF, hipN, 0.5);
  const hk = 0.5 + build.torso * 0.5;
  const hipFw = add(hipMid, sub(hipF, hipMid), hk), hipNw = add(hipMid, sub(hipN, hipMid), hk);
  const legR = LEG[0] * build.leg;
  const hipOut = (hip, k) => add(add(hip, unit(sub(hip, pelvis)), k), down, 1);
  const hipOutF = hipOut(hipFw, legR - 2), hipOutN = hipOut(hipNw, legR - 2.6);
  // A belly pushes the front of the waist out: the far side, the way the figure faces.
  const belly = build.belly ?? 0;
  return {
    up, down, outF, outN,
    p: {
      collarF: add(lerp(neck, sFw, 0.42), up, 4.4),
      shoulderF: add(add(sFw, outF, 3), up, 2),
      sideF: add(lerp(sFw, hipOutF, 0.3), outF, 1 + belly * 3),
      bellyF: add(lerp(sFw, hipOutF, 0.62), outF, -1.6 + belly * 9),
      waistF: add(lerp(sFw, hipOutF, 0.84), outF, -1.4 + belly * 6),
      hipOutF,
      crotch: add(pelvis, down, 9),
      hipOutN,
      waistN: add(lerp(sNw, hipOutN, 0.72), outN, -1.8 + belly * 2.4),
      sideN: add(lerp(sNw, hipOutN, 0.3), outN, 1 + belly * 1.4),
      shoulderN: add(add(sNw, outN, 3), up, 2),
      collarN: add(lerp(neck, sNw, 0.42), up, 4.4),
    },
  };
}

function drawTorso(cv, c, sk, build) {
  const { p, up, down } = torsoPoints(sk, build);
  const outline = [p.collarF, p.shoulderF, p.sideF, p.bellyF, p.waistF, p.hipOutF, p.crotch, p.hipOutN, p.waistN, p.sideN, p.shoulderN, p.collarN];
  const poly = waver(spline(outline, { tension: 0.9, step: 2 }), 13, 0.3);
  const clip = cv.polyForm(poly, SUIT.dark, { weight: 0, depth: 6, seed: 13 });
  // The canvas front (or back): most of the torso, the charcoal showing down both sides.
  const k = sk.back ? [0.16, 0.84] : [0.07, 0.8];
  const panel = [
    lerp(p.collarF, p.collarN, 0.05), lerp(p.shoulderF, p.shoulderN, k[0]), lerp(p.sideF, p.sideN, k[0] + 0.02), lerp(p.bellyF, p.waistN, k[0] + 0.02), lerp(p.waistF, p.waistN, k[0] + 0.04),
    lerp(p.hipOutF, p.hipOutN, k[0] + 0.06), lerp(p.hipOutF, p.hipOutN, k[1] - 0.04),
    lerp(p.waistF, p.waistN, k[1]), lerp(p.sideF, p.sideN, k[1] + 0.02), lerp(p.shoulderF, p.shoulderN, k[1] + 0.06), lerp(p.collarF, p.collarN, 0.95),
  ];
  cv.form(panel, SUIT.light, { weight: 1.3, depth: 4.4, tension: 0.85, seed: 17, clip, rim: false });
  const center = lerp(p.collarF, p.collarN, 0.5);
  const beltF = add(p.hipOutF, up, 12), beltN = add(p.hipOutN, up, 12);
  const yokeF = lerp(p.shoulderF, p.sideF, 0.42), yokeN = lerp(p.shoulderN, p.sideN, 0.42);
  if (!sk.back) {
    // The chest yoke seam, the zip, two small chest pockets, and a fold.
    cv.line([lerp(yokeF, yokeN, 0.08), lerp(yokeF, yokeN, 0.5), lerp(yokeF, yokeN, 0.92)], { weight: 0.9, taper: 'none' });
    cv.line([add(center, down, 3), lerp(add(center, down, 3), lerp(beltF, beltN, 0.42), 0.5), lerp(beltF, beltN, 0.42)], { weight: 1.1, taper: 'none' });
    for (const t of [0.22, 0.7]) {
      const pk = add(lerp(yokeF, yokeN, t), down, 6);
      cv.line([add(pk, [-4, -1.6]), add(pk, [4, -1.8])], { weight: 0.8, taper: 'none' });
    }
    if ((build.belly ?? 0) > 0) {
      // The belly's curve above the belt, on the side the figure faces.
      const inward = unit(sub(p.waistN, p.waistF));
      cv.line([add(lerp(p.sideF, p.bellyF, 0.6), inward, 3), add(add(lerp(p.bellyF, p.waistN, 0.16), down, 3), inward, 2), add(lerp(beltF, beltN, 0.32), up, 2)], { weight: 1, color: shade(SUIT.light, 0.5) });
    }
    else cv.line([add(lerp(p.sideF, center, 0.3), up, 2), add(lerp(p.waistF, center, 0.34), up, 1)], { weight: 0.8 });
  } else {
    cv.line([lerp(yokeF, yokeN, 0.08), lerp(yokeF, yokeN, 0.92)], { weight: 0.9, taper: 'none' });
    cv.line([add(center, down, 2), lerp(beltF, beltN, 0.5)], { weight: 1 });
  }
  cv.outline(poly, 2.8, 13);
  // The collar, standing, in the character's accent.
  const neckBase = add(sk.neck, down, 2);
  cv.form([add(p.collarF, up, -1), add(lerp(p.collarF, neckBase, 0.5), up, 3.6), add(neckBase, up, 4.4), add(lerp(p.collarN, neckBase, 0.5), up, 3.6), add(p.collarN, up, -1), add(neckBase, down, 2.6)], c.accent, { weight: 1.5, depth: 1.6, rim: false, seed: 21, tension: 0.8 });
  // The belt, sagging a little, and its buckle in the accent.
  const sag = add(lerp(beltF, beltN, 0.5), down, 3 + (build.belly ?? 0) * 2);
  const lowF = add(p.hipOutF, up, 4.4), lowN = add(p.hipOutN, up, 4.4);
  cv.form([beltF, lerp(beltF, sag, 0.5), sag, lerp(sag, beltN, 0.5), beltN, lowN, add(sag, down, 7.6), lowF], SUIT.belt, { weight: 1.7, depth: 2, tension: 0.6, seed: 23, rim: false });
  if (!sk.back) {
    const buckle = add(lerp(lerp(beltF, lowF, 0.5), lerp(beltN, lowN, 0.5), 0.46), down, 2.6);
    cv.group(`translate(${fx(buckle)}) rotate(${deg(sub(beltN, beltF)).toFixed(1)})`, () => {
      cv.form([[-4.6, -4.2], [4.6, -4.2], [4.6, 4.2], [-4.6, 4.2]], c.accent, { weight: 1.3, depth: 1.4, tension: 0.2, rim: false, seed: 25 });
      cv.raw(`<rect x="-2.1" y="-1.9" width="4.2" height="3.8" fill="none" stroke="${INK}" stroke-width="0.8"/>`);
    });
  }
}

function hand(cv, c, at, angle, { size = 1.2, type = 'open' } = {}) {
  cv.group(`translate(${fx(at)}) rotate(${angle.toFixed(1)}) scale(${size})`, () => {
    if (type === 'fist') {
      cv.form([[-4.4, -3.8], [2.8, -4.8], [6, -1.4], [5.4, 3.6], [0.4, 5.2], [-4.6, 3.6]], c.skin, { weight: 1.4, depth: 1.6, rim: false, grain: false, seed: 27 });
      cv.line([[1.4, -3.6], [2.8, -0.6], [1.4, 2.8]], { weight: 0.6 });
      cv.line([[3.8, -3], [5, -0.4], [3.8, 2.4]], { weight: 0.6 });
      return;
    }
    if (type === 'flat') {
      cv.form([[-4.6, -2.6], [4.4, -3.4], [9.2, -1.4], [9.2, 1.8], [4, 3.2], [-4.4, 3]], c.skin, { weight: 1.3, depth: 1.2, rim: false, grain: false, seed: 29 });
      cv.line([[3, -0.6], [8.4, -0.6]], { weight: 0.5 });
      cv.line([[3, 1.2], [8, 1.2]], { weight: 0.5 });
      return;
    }
    // Open: a broad palm, the thumb apart, finger lines.
    cv.form([[-4.6, -3.4], [3.8, -4.2], [7.4, -1.6], [7.6, 2.6], [4.4, 4.8], [-3.2, 4.4], [-5.2, 0.6]], c.skin, { weight: 1.4, depth: 1.6, rim: false, grain: false, seed: 31 });
    cv.line([[-1.6, -3.4], [-4.2, -0.4], [-2, 2.4]], { weight: 0.7 });
    for (const y of [-1.2, 1, 3]) cv.line([[3.4, y - 0.6], [7, y]], { weight: 0.45 });
  });
}

/** A charcoal panel down the shadow side of a limb, kept inside it. */
function sidePanel(cv, joints, radii, clip, seed, k = 0.58) {
  const dirs = joints.map((p, i) => unit(sub(joints[Math.min(i + 1, joints.length - 1)], joints[Math.max(i - 1, 0)])));
  const shifted = joints.map((p, i) => add(p, awaySide(dirs[i]), radii[i] * k));
  cv.polyForm(waver(limbOutline(shifted, radii.map(r => r * 0.62)), seed, 0.25), SUIT.dark, { weight: 1.1, depth: 2, rim: false, seed, clip });
}

function drawArm(cv, c, sk, side, build) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  const spec = sk[`hand${side}`] ?? {};
  const radii = ARM.map(r => r * build.arm);
  const poly = waver(limbOutline([s, e, w], radii), side === 'N' ? 33 : 35, 0.3);
  const clip = cv.polyForm(poly, SUIT.light, { weight: 0, depth: radii[0] * 0.62, seed: 33 });
  sidePanel(cv, [s, e, w], radii, clip, side === 'N' ? 34 : 36, 0.62);
  cv.outline(poly, 2.4, 33);
  // The cuff, broad, in the accent.
  const along = unit(sub(w, e)), across = perp(along);
  const cuff = lerp(e, w, 0.8);
  const cr = radii[2] + 1.4;
  cv.form([add(add(cuff, across, cr), along, -3), add(add(cuff, across, cr), along, 3), add(add(cuff, across, -cr), along, 3), add(add(cuff, across, -cr), along, -3)], c.accent, { weight: 1.4, depth: 1.4, rim: false, tension: 0.3, seed: 39 });
  // The shoulder pad, over the top of the shoulder along the shoulder's line, following the arm a little.
  const line = unit(sub(s, sk.neck)), arm = unit(sub(e, s));
  const lie = unit(add(mul(line, 0.75), mul(arm, 0.25)));
  const normal = perp(lie);
  const up = dot(normal, unit(sub(sk.neck, sk.pelvis))) > 0 ? normal : mul(normal, -1);
  const pad = add(add(s, up, 1.6), lie, 1.2);
  const half = radii[0] + 2.6, thick = 4.6;
  cv.form([add(add(pad, lie, -half), up, thick), add(add(pad, lie, half + 1), up, thick - 0.6), add(add(pad, lie, half + 2), up, -thick), add(add(pad, lie, -half), up, -thick + 1)], c.accent, { weight: 1.6, depth: 2.2, tension: 0.5, seed: 41 });
  if (spec.type === 'none') return;
  const angle = spec.angle ?? deg(along);
  const at = add(w, along, 4.4);
  if (spec.item) item(cv, spec.item, add(at, spec.itemAt ?? [0, 0]), spec.itemAngle ?? 0);
  hand(cv, c, at, angle, { size: (spec.size ?? 1.2) * (0.9 + build.arm * 0.1), type: spec.type ?? 'open' });
}

function boot(cv, c, a, dir = -1, angle = 0, { view = 'side' } = {}) {
  cv.group(`translate(${fx(a)}) rotate(${angle.toFixed(1)})`, () => {
    if (view === 'back') {
      cv.form([[-7.6, -13], [7.6, -13], [8.6, 8], [8, 15.6], [-8, 15.6], [-8.6, 8]], SUIT.boot, { weight: 2, depth: 3, tension: 0.5, seed: 43 });
      cv.form([[-8.6, 11.6], [8.6, 11.6], [8.6, 16.4], [-8.6, 16.4]], SUIT.sole, { weight: 1.6, depth: 0, tension: 0.2, rim: false, grain: false, seed: 45 });
      cv.form([[-8, -15], [8, -15], [8, -10.4], [-8, -10.4]], c.accent, { weight: 1.2, depth: 1, tension: 0.2, rim: false, seed: 47 });
      return;
    }
    // The toe points the way the foot goes (dir -1: left).
    const m = pts => pts.map(([x, y]) => [x * -dir, y]);
    cv.form(m([[-8, -13], [-8, 3], [-11.6, 7], [-18.6, 9], [-19.4, 13.4], [8, 13.6], [8.4, -13]]), SUIT.boot, { weight: 2.1, depth: 3.2, tension: 0.55, seed: 49 });
    cv.form(m([[-19.8, 12], [-19.8, 16.8], [8.6, 16.8], [8.6, 12]]), SUIT.sole, { weight: 1.6, depth: 0, tension: 0.2, rim: false, grain: false, seed: 51 });
    cv.form(m([[-8.6, -15.2], [-8.6, -10.2], [8.8, -10.2], [8.8, -15.2]]), c.accent, { weight: 1.3, depth: 1.2, tension: 0.2, rim: false, seed: 53 });
    // Laces.
    for (const y of [-6.6, -2.6, 1.4]) cv.line(m([[-7.4, y], [-3.6, y + 1.6]]), { weight: 0.7, taper: 'none' });
  });
}

function drawLeg(cv, c, sk, side, build) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  const radii = LEG.map(r => r * build.leg);
  const poly = waver(limbOutline([hip, k, a], radii), side === 'N' ? 55 : 57, 0.3);
  const clip = cv.polyForm(poly, SUIT.light, { weight: 0, depth: radii[0] * 0.5, seed: 55 });
  sidePanel(cv, [hip, k, a], radii, clip, side === 'N' ? 56 : 58, 0.66);
  // A cargo pocket on the far thigh's outer side, its flap stitched.
  const thigh = unit(sub(k, hip));
  if (side === 'F' && !sk.back) {
    const outward = mul(awaySide(thigh), -1);
    const pc = add(lerp(hip, k, 0.5), outward, radii[0] * 0.28);
    const along = thigh, across = perp(thigh);
    const s = radii[0] * 0.5;
    cv.form([add(add(pc, across, s), along, -6.6), add(add(pc, across, s), along, 6.8), add(add(pc, across, -s), along, 6.8), add(add(pc, across, -s), along, -6.6)], shade(SUIT.light, 0.06), { weight: 1.2, depth: 1.8, tension: 0.35, rim: false, seed: 61, clip });
    cv.line([add(add(pc, across, s), along, -2.6), add(add(pc, across, -s), along, -2.6)], { weight: 0.8, taper: 'none' });
  }
  cv.outline(poly, 2.6, 55);
  // The knee pad.
  const shin = unit(sub(a, k));
  const bend = unit(add(thigh, shin));
  const kAcross = perp(bend);
  const kp = add(k, bend, 1.4);
  const kr = radii[1] * 0.8;
  cv.form([add(add(kp, kAcross, kr), bend, -6.4), add(add(kp, kAcross, kr), bend, 6.4), add(add(kp, kAcross, -kr), bend, 6.4), add(add(kp, kAcross, -kr), bend, -6.4)], SUIT.pad, { weight: 1.5, depth: 2.4, tension: 0.55, seed: 63 });
  if (foot.type === 'none') return;
  boot(cv, c, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

/** A point of the head's own frame in the figure's frame, where drawHead puts it. */
function headPoint(sk, [x, y]) {
  const a = ((sk.tilt ?? 0) * Math.PI) / 180, s = PILOT_HEAD_SCALE;
  return [sk.head[0] + s * (x * Math.cos(a) - y * Math.sin(a)), sk.head[1] + s * (x * Math.sin(a) + y * Math.cos(a))];
}

function drawNeck(cv, c, sk, build) {
  const toward = unit(sub(sk.neck, sk.head));
  const base = add(sk.neck, toward, -1);
  const traced = (sk.view ?? 'front') === 'back' ? null : TRACED_HEADS[c.id]?.neck;
  if (traced) {
    // Facing us, the neck leaves the jaw where the owner's drawing has it: behind the chin.
    const [x, y, r] = traced;
    cv.limb([headPoint(sk, [x, y - r]), base], [r * PILOT_HEAD_SCALE, 6.4 * build.neck], c.skin, { weight: 2, seed: 65, rim: false });
    return;
  }
  const chin = add(sk.head, toward, 15);
  cv.limb([chin, base], [6.4 * build.neck, 7.4 * build.neck], c.skin, { weight: 2, seed: 65, rim: false });
}

function drawHead(cv, c, sk, motion) {
  const [x, y] = sk.head;
  cv.group(`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(sk.tilt ?? 0).toFixed(2)}) scale(${PILOT_HEAD_SCALE})`, () => pilotHead(cv, c, sk.view ?? 'front', motion));
}

/** Something held, in public tones only: a simple panel or tool (the rig's items, redrawn plainly). */
function item(cv, kind, at, angle = 0) {
  cv.group(`translate(${fx(at)}) rotate(${angle})`, () => {
    if (kind === 'wrench') {
      cv.form([[-2, -2.4], [20, -2.4], [20, 2.4], [-2, 2.4]], '#8696AE', { weight: 1.3, depth: 1, tension: 0.2, rim: false, seed: 67 });
      cv.form([[18, -6], [26.6, -5], [26.6, 5], [18, 6], [20.6, 2], [20.6, -2]], '#8696AE', { weight: 1.3, depth: 1, tension: 0.4, rim: false, seed: 69 });
    } else if (kind === 'mug' || kind === 'flask') {
      cv.form([[-6, -8], [6, -8], [6, 8], [-6, 8]], '#B9C4D3', { weight: 1.4, depth: 2, tension: 0.4, seed: 71 });
    } else {
      // A tablet, a clipboard, a laptop: a plain panel; nothing is written on it.
      cv.form([[-12, -15], [12, -15], [12, 15], [-12, 15]], '#222B3A', { weight: 1.6, depth: 2, tension: 0.25, seed: 73 });
      cv.flat([[-9.4, -11.6], [9.4, -11.6], [9.4, 11.6], [-9.4, 11.6]], '#8696AE', { tension: 0.2 });
    }
  });
}

const PARTS = {
  armF: (cv, c, sk, b) => drawArm(cv, c, sk, 'F', b),
  armN: (cv, c, sk, b) => drawArm(cv, c, sk, 'N', b),
  legF: (cv, c, sk, b) => drawLeg(cv, c, sk, 'F', b),
  legN: (cv, c, sk, b) => drawLeg(cv, c, sk, 'N', b),
  neck: (cv, c, sk, b) => drawNeck(cv, c, sk, b),
  torso: (cv, c, sk, b) => drawTorso(cv, c, sk, b),
  head: (cv, c, sk, b, motion) => drawHead(cv, c, sk, motion),
  prop: (cv, c, sk) => { if (sk.prop) item(cv, sk.prop.item, sk.prop.at, sk.prop.angle ?? 0); },
};

/**
 * Draws a skeleton for a pilot character on an ink canvas. motion: the head's { blink, sway, lift }.
 * sk.shadow is the contact shadow on the floor, [x, half-width].
 */
export function drawPilotFigure(cv, c, sk, motion = {}) {
  const build = BUILDS[c.build] ?? BUILDS.regular;
  if (sk.shadow) {
    const [x, rx] = sk.shadow, y = sk.floorY ?? FRAME.floor;
    const w = rx * (0.92 + build.torso * 0.08);
    cv.raw(`<ellipse cx="${x}" cy="${y + 2}" rx="${w.toFixed(1)}" ry="6.6" fill="${INK}" opacity="0.42"/>`);
  }
  const front = new Set(sk.front ?? []);
  for (const part of sk.order ?? ORDER) {
    if (!PARTS[part]) continue;
    if (front.has(part)) cv.front(() => PARTS[part](cv, c, sk, build, motion));
    else PARTS[part](cv, c, sk, build, motion);
  }
}

/** A skeleton for a pilot character as an inline SVG element in the rig's frame. */
export function pilotFigureSvg(c, sk, { prefix = 'pf', layer = 'body', motion = {}, box = FRAME.box } = {}) {
  const cv = inkCanvas(prefix);
  drawPilotFigure(cv, c, sk, motion);
  return cv.svg({ viewBox: box.join(' '), layer });
}

//
// The drop-in for the rig's wardrobe.mjs (the module every
// runtime figure is drawn through): what a figure wears, by the room it is in, in the new style.
// The same rule and the same call: the crew suit everywhere, a patient's gown in the Hospital, a
// prisoner's banded suit in the Jail, by the figure's PUBLIC location and nothing else (outfitFor is
// the rig's own, re-exported). dressedFigureSvg(c, sk, { outfit, prefix, layer, inline, header })
// takes the rig's arguments and returns what the rig's returns: one SVG in the rig's frame (inline,
// or a file with its header), the 'body' or 'front' layer. It adds options the rig has not:
// - motion: the head's { blink, sway, lift, drift } (motion.mjs; the default draws eyes open and
//   hair still);
// - art: { ref }, to draw the head by reference to art placed once on the page (mount.mjs);
// - live: data-crew-* hooks on the parts that move, for frame updates without a rebuild (mount.mjs).
//
// The person never changes with the clothes: the head, the face, the hair, the skin, the hands and
// a gesture's prop are figure.mjs's. Neither the gown nor the prisoner's suit shows a character's
// field or accent, as the rig's do not. Nothing here draws a role, a team or an ability.

import { FRAME } from '../scene-drawing/body.mjs';
import { OUTFITS, outfitFor } from '../scene-drawing/wardrobe.mjs';
import { CREW_DRAWING_VERSION, SUIT, crewMember } from './crew.mjs';
import { ARM, CREW_PARTS, LEG, boot, drawCrewFigure, hand, item, sling } from './figure.mjs';
import { INK, add, dist, inkCanvas, lerp, limbOutline, mul, perp, spline, sub, unit, waver } from './ink.mjs';

export { OUTFITS, outfitFor };
/** This release's version (crew.mjs), for the rig's WARDROBE_VERSION's place. */
export const WARDROBE_VERSION = CREW_DRAWING_VERSION;

/** The gown's paper and its print; the prisoner's suit, paper banded in deep steel: the rig's public tones. */
const PAPER = '#F4EBDD';
const PAPER_SHADE = '#E3D6C2';
const PRINT = '#8696AE';
const STRIPE = '#222B3A';
/** A prisoner's band and the gap between two bands, in figure units: bold enough to read at a phone's scale. */
const STRIPE_PERIOD = 15;

const fx = v => v.map(n => n.toFixed(2)).join(' ');
const deg = v => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

/** The gown's print, defined once on a canvas. */
const prints = new WeakSet();
function printOf(cv) {
  if (!prints.has(cv)) {
    prints.add(cv);
    cv.def(`<pattern id="${cv.prefix}-print" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.75" cy="2.75" r="1.7" fill="${PRINT}"/><circle cx="8.25" cy="8.25" r="1.7" fill="${PRINT}"/></pattern>`);
  }
  return `url(#${cv.prefix}-print)`;
}

/** Drawing kept inside a form already drawn (its clip id). */
const within = (cv, clip, svg) => cv.raw(`<g clip-path="url(#${clip})">${svg}</g>`);

/**
 * A length of cloth round a limb's bones: filled and shaded, then what is printed on it (overlay,
 * given the limb's points and radii, returning SVG), then inked, so the print never covers the line.
 */
function garment(cv, joints, radii, fill, { seed, weight = 2.4, depth = null, overlay = null, hatch = true }) {
  const poly = waver(limbOutline(joints, radii), seed, 0.3);
  const clip = cv.polyForm(poly, fill, { weight: 0, depth: depth ?? Math.max(...radii) * 0.62, seed, hatch });
  if (overlay) within(cv, clip, overlay(joints, radii));
  cv.outline(poly, weight, seed);
}

// ---------- bands ----------

/** Bands across a stretch from a to b, at right angles to it, run on from one stretch to the next (the rig's). */
function bands(a, b, halfWidth, phase = 0) {
  const length = dist(a, b);
  if (length < 0.5) return { d: '', phase };
  const along = unit(sub(b, a)), across = perp(along);
  let d = '';
  for (let s = -phase; s < length; s += STRIPE_PERIOD) {
    const from = Math.max(0, s), to = Math.min(length, s + STRIPE_PERIOD / 2);
    if (to > from) {
      const p = add(a, along, from), q = add(a, along, to);
      d += `M${fx(add(p, across, halfWidth))} L${fx(add(q, across, halfWidth))} L${fx(add(q, across, -halfWidth))} L${fx(add(p, across, -halfWidth))} Z `;
    }
  }
  return { d, phase: (phase + length) % STRIPE_PERIOD };
}

/** The bands of a limb from joint to joint, run on across its bend. */
function limbBands(points, radii) {
  let phase = 0, d = '';
  for (let i = 0; i < points.length - 1; i += 1) {
    const reach = Math.max(radii[i], radii[i + 1]) + 3;
    const along = unit(sub(points[i + 1], points[i]));
    const from = i === 0 ? points[i] : add(points[i], along, -radii[i]);
    const r = bands(from, points[i + 1], reach, phase);
    d += r.d;
    phase = r.phase;
  }
  return d.trim();
}

// ---------- the body of a garment ----------

/**
 * The trunk of a garment on a skeleton (the rig's cut, widened by the build): its outline, from
 * collar to hem, and the points a garment hangs its details on.
 */
function trunk(sk, build, { hem = 0, flare = 0, dress = false } = {}) {
  const { sN, sF, neck, pelvis, hipN, hipF } = sk;
  const up = unit(sub(neck, pelvis)), down = mul(up, -1);
  const mid = lerp(sF, sN, 0.5);
  const wide = p => add(mid, sub(p, mid), build.torso);
  const sFw = wide(sF), sNw = wide(sN);
  const outF = unit(sub(sF, mid)), outN = unit(sub(sN, mid));
  const legR = LEG[0] * build.leg;
  const hipOut = (hip, k) => add(add(hip, unit(sub(hip, pelvis)), k), down, 1);
  const hipOutF = add(add(hipOut(hipF, legR - 1), down, hem), outF, flare);
  const hipOutN = add(add(hipOut(hipN, legR - 1.6), down, hem), outN, flare);
  const belly = build.belly ?? 0;
  const p = {
    collarF: add(lerp(neck, sFw, 0.45), up, 4),
    shoulderF: add(add(sFw, outF, 2.5), up, 1.5),
    sideF: add(lerp(sFw, hipOutF, 0.28), outF, 1 + belly * 3),
    waistF: add(lerp(sFw, hipOutF, 0.66), outF, -2.4 + flare * 0.4 + belly * 6),
    hipOutF,
    crotch: add(pelvis, down, dress ? hem + 2 : 9 + hem),
    hipOutN,
    waistN: add(lerp(sNw, hipOutN, 0.66), outN, -2.4 + flare * 0.4 + belly * 2),
    sideN: add(lerp(sNw, hipOutN, 0.28), outN, 1 + belly * 1.4),
    shoulderN: add(add(sNw, outN, 2.5), up, 1.5),
    collarN: add(lerp(neck, sNw, 0.45), up, 4),
  };
  const spine = t => lerp(neck, pelvis, t);
  const poly = waver(spline([p.collarF, p.shoulderF, p.sideF, p.waistF, p.hipOutF, p.crotch, p.hipOutN, p.waistN, p.sideN, p.shoulderN, p.collarN], { tension: 0.85, step: 2 }), 101, 0.3);
  return { p, up, down, spine, poly };
}

/**
 * How far the thighs hang along the body (1 standing or lying straight, 0 seated), as the rig
 * measures it: a gown hangs to the middle of the thighs on a figure standing, and lies over the
 * lap of one seated.
 */
function hang(sk) {
  const down = unit(sub(sk.pelvis, sk.neck));
  const along = side => { const t = unit(sub(sk[`k${side}`], sk[`hip${side}`])); return Math.max(0, t[0] * down[0] + t[1] * down[1]); };
  return Math.min(1, (along('F') + along('N')) / 2);
}

// ---------- the gown ----------

/** A patient's gown: loose, to the middle of the thighs, a round neck and its tie, printed with dots; from behind, the open back's two ties. */
function gownTorso(cv, c, sk, build) {
  const length = hang(sk);
  const { p, down, spine, poly } = trunk(sk, build, { hem: 4 + 26 * length, flare: 2 + 5 * length, dress: length > 0.35 });
  const clip = cv.polyForm(poly, PAPER, { weight: 0, depth: 5, seed: 103 });
  within(cv, clip, `<path d="M${poly.map(fx).join('L')}Z" fill="${printOf(cv)}" opacity="0.85"/>`);
  cv.outline(poly, 2.8, 103);
  const center = lerp(p.collarF, p.collarN, 0.5);
  if (sk.back) {
    cv.line([add(center, down, 1), spine(0.5), add(spine(1), down, 5)], { weight: 1.4, taper: 'none' });
    const across = unit(sub(p.sideN, p.sideF));
    for (const t of [0.28, 0.62]) {
      const knot = spine(t);
      cv.line([add(knot, across, -5.5), add(knot, down, 2), add(knot, across, 5.5)], { weight: 1.3, taper: 'none' });
      cv.line([knot, add(add(knot, down, 6), across, -2)], { weight: 1.1 });
      cv.line([knot, add(add(knot, down, 6), across, 2.5)], { weight: 1.1 });
    }
    return;
  }
  cv.line([p.collarF, add(sk.neck, down, 6), p.collarN], { weight: 1.9, taper: 'none' });
  const knot = add(lerp(sk.neck, p.collarN, 0.55), down, 4);
  cv.line([knot, add(knot, [-3, 6])], { weight: 1.1 });
  cv.line([knot, add(knot, [3.4, 5.4])], { weight: 1.1 });
  const hemMid = add(spine(1), down, 7);
  for (const [shoulder, collar, waist, hip] of [[p.shoulderF, p.collarF, p.waistF, p.hipOutF], [p.shoulderN, p.collarN, p.waistN, p.hipOutN]]) {
    cv.line([add(lerp(shoulder, collar, 0.5), down, 6), lerp(lerp(waist, spine(0.6), 0.4), hemMid, 0.15), lerp(hip, hemMid, 0.35)], { weight: 0.9, opacity: 0.7 });
  }
}

/** A patient's arm: a short loose sleeve over the shoulder, the bare arm, a paper wristband, the hand. */
function gownArm(cv, c, sk, side, build) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  const radii = ARM.map(r => r * build.arm * 0.86);
  cv.limb([s, e, w], radii, c.skin, { weight: 2.2, seed: side === 'N' ? 105 : 107, rim: false, hatch: false, grain: false });
  const along = unit(sub(w, e)), across = perp(along);
  const band = lerp(e, w, 0.78);
  cv.line([add(band, across, radii[2] + 0.6), add(band, across, -radii[2] - 0.6)], { weight: 3, taper: 'none' });
  cv.line([add(band, across, radii[2] - 0.6), add(band, across, -radii[2] + 0.6)], { weight: 1.5, color: PAPER, taper: 'none' });
  const hem = lerp(s, e, 0.42);
  const print = () => `<rect x="-200" y="-200" width="600" height="600" fill="${printOf(cv)}" opacity="0.85"/>`;
  garment(cv, [add(s, unit(sub(s, e)), 2), hem], [ARM[0] * build.arm + 3.2, ARM[0] * build.arm + 3.6], PAPER, { seed: side === 'N' ? 109 : 111, weight: 2.2, depth: 2.4, overlay: print, hatch: false });
  const up = unit(sub(e, s)), side2 = perp(up);
  cv.line([add(hem, side2, ARM[0] * build.arm + 3), add(hem, side2, -ARM[0] * build.arm - 3)], { weight: 1.3, taper: 'none' });
  handOf(cv, c, sk, side, build, add(w, along, 4.4), along);
}

/** A paper slipper: the ankle at a point, the toe to the left (dir -1) or the right (dir 1). */
function slipper(cv, [x, y], dir = -1, angle = 0, { view = 'side' } = {}) {
  cv.group(`translate(${fx([x, y])}) rotate(${angle})`, () => {
    if (view === 'back') {
      cv.form([[-6.6, 4], [6.6, 4], [7, 11], [6, 14.6], [-6, 14.6], [-7, 11]], PAPER_SHADE, { weight: 1.9, depth: 2, tension: 0.5, rim: false, seed: 113 });
      return;
    }
    const m = pts => pts.map(([px, py]) => [px * -dir, py]);
    cv.form(m([[-5.4, 3], [-11, 6.4], [-15.4, 10.4], [-14, 14.6], [5.6, 14.6], [6.6, 9], [5.4, 3]]), PAPER_SHADE, { weight: 1.9, depth: 2, tension: 0.5, rim: false, seed: 115 });
    cv.line(m([[-3, 5.6], [-8, 6.4], [-12, 9.6]]), { weight: 1 });
  });
}

/** A patient's leg: the bare leg, a slipper; seated, the gown lies over the thigh. */
function gownLeg(cv, c, sk, side, build) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  cv.limb([hip, k, a], LEG.map(r => r * build.leg * 0.8), c.skin, { weight: 2.2, seed: side === 'N' ? 117 : 119, rim: false, hatch: false, grain: false });
  if (hang(sk) <= 0.62) {
    const hem = lerp(hip, k, 0.62);
    const r = LEG[0] * build.leg;
    const print = () => `<rect x="-200" y="-200" width="600" height="600" fill="${printOf(cv)}" opacity="0.85"/>`;
    garment(cv, [add(hip, unit(sub(hip, k)), 3), hem], [r + 3.4, r + 4.2], PAPER, { seed: side === 'N' ? 121 : 123, weight: 2.3, depth: 2.6, overlay: print, hatch: false });
    const across = perp(unit(sub(k, hip)));
    cv.line([add(hem, across, r + 3.8), add(hem, across, -r - 3.8)], { weight: 1.2, taper: 'none' });
  }
  if (foot.type === 'none') return;
  slipper(cv, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

// ---------- the prisoner's suit ----------

/** A prisoner's suit: the crew suit's cut, banded, buttoned down the front, a blank number patch on the chest. */
function prisonTorso(cv, c, sk, build) {
  const { p, up, down, spine, poly } = trunk(sk, build);
  const clip = cv.polyForm(poly, PAPER, { weight: 0, depth: 5, seed: 125 });
  const halfWidth = Math.max(dist(p.shoulderF, p.shoulderN), dist(p.hipOutF, p.hipOutN)) / 2 + 8;
  within(cv, clip, `<path d="${bands(add(sk.neck, up, 10), add(sk.pelvis, down, 14), halfWidth, 4).d.trim()}" fill="${STRIPE}" opacity="0.9"/>`);
  cv.outline(poly, 2.8, 125);
  const center = lerp(p.collarF, p.collarN, 0.5);
  if (sk.back) {
    cv.line([add(center, down, 2), spine(0.5), add(spine(1), down, 4)], { weight: 1.2, taper: 'none' });
    return;
  }
  cv.line([p.collarF, add(sk.neck, down, 7), p.collarN], { weight: 1.9, taper: 'none' });
  const top = add(sk.neck, down, 7), bottom = lerp(spine(1), add(spine(1), down, 6), 0.5);
  cv.line([top, bottom], { weight: 1.4, taper: 'none' });
  for (const t of [0.25, 0.5, 0.75]) cv.raw(`<circle cx="${lerp(top, bottom, t)[0].toFixed(2)}" cy="${lerp(top, bottom, t)[1].toFixed(2)}" r="1.5" fill="${INK}"/>`);
  const across = unit(sub(p.sideN, p.sideF));
  const at = add(lerp(lerp(p.sideF, p.sideN, 0.73), spine(0.32), 0.25), down, 2);
  cv.group(`translate(${fx(at)}) rotate(${deg(across).toFixed(1)})`, () => {
    cv.form([[-6.6, -4.6], [6.6, -4.6], [6.6, 4.6], [-6.6, 4.6]], PAPER, { weight: 1.4, depth: 1, tension: 0.15, rim: false, seed: 127 });
    cv.line([[-4.4, -1.4], [4.4, -1.4]], { weight: 1, taper: 'none' });
    cv.line([[-4.4, 1.6], [2, 1.6]], { weight: 1, taper: 'none' });
  });
}

/** A prisoner's arm: a long banded sleeve, an ink cuff, the hand. */
function prisonArm(cv, c, sk, side, build) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  const radii = ARM.map(r => r * build.arm);
  const banded = (joints, r) => `<path d="${limbBands(joints, r)}" fill="${STRIPE}" opacity="0.9"/>`;
  garment(cv, [s, e, w], radii, PAPER, { seed: side === 'N' ? 129 : 131, overlay: banded });
  const along = unit(sub(w, e)), across = perp(along);
  const cuff = lerp(e, w, 0.8);
  cv.line([add(cuff, across, radii[2] + 0.4), add(cuff, across, -radii[2] - 0.4)], { weight: 3.2, taper: 'none' });
  handOf(cv, c, sk, side, build, add(w, along, 4.4), along);
}

/** A prisoner's leg: a banded trouser leg to the ankle, and the crew's boot without a character's band. */
function prisonLeg(cv, c, sk, side, build) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  const radii = LEG.map(r => r * build.leg);
  const banded = (joints, r) => `<path d="${limbBands(joints, r)}" fill="${STRIPE}" opacity="0.9"/>`;
  garment(cv, [hip, k, a], radii, PAPER, { seed: side === 'N' ? 133 : 135, overlay: banded });
  if (foot.type === 'none') return;
  boot(cv, { ...c, accent: SUIT.dark }, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

/** A hand at the end of an outfit's arm, and what it holds, as figure.mjs draws them. */
function handOf(cv, c, sk, side, build, at, along) {
  const spec = sk[`hand${side}`] ?? {};
  if (spec.type === 'none') return;
  const angle = spec.angle ?? deg(along);
  if (spec.item) item(cv, spec.item, add(at, spec.itemAt ?? [0, 0]), spec.itemAngle ?? 0);
  hand(cv, c, at, angle, { size: (spec.size ?? 1.2) * (0.9 + build.arm * 0.1), type: spec.type ?? 'open' });
}

const CLOTHES = {
  gown: { torso: gownTorso, arm: gownArm, leg: gownLeg },
  prison: { torso: prisonTorso, arm: prisonArm, leg: prisonLeg },
};

/** The parts of an outfit, by name, in figure.mjs's form: the outfit's torso, arms and legs. */
function outfitParts(outfit) {
  const clothes = CLOTHES[outfit];
  return {
    torso: (cv, c, sk, build) => clothes.torso(cv, c, sk, build),
    armF: (cv, c, sk, build) => clothes.arm(cv, c, sk, 'F', build),
    armN: (cv, c, sk, build) => { clothes.arm(cv, c, sk, 'N', build); if (sk.sling) sling(cv, sk); },
    legF: (cv, c, sk, build) => clothes.leg(cv, c, sk, 'F', build),
    legN: (cv, c, sk, build) => clothes.leg(cv, c, sk, 'N', build),
    neck: CREW_PARTS.neck,
    head: CREW_PARTS.head,
    prop: CREW_PARTS.prop,
  };
}

/**
 * Draws a skeleton for a crew member in an outfit on a canvas: the crew suit, or the outfit's
 * torso, arms and legs with the person's own neck, head and prop. c: an entry of this release's
 * CREW, or of the rig's (matched by call sign).
 */
export function drawDressed(cv, c, sk, outfit = 'crew', motion = {}, { art = null, live = false } = {}) {
  if (!OUTFITS.includes(outfit)) throw new Error(`Unknown outfit: ${outfit}`);
  const who = crewMember(c);
  drawCrewFigure(cv, who, sk, motion, { art, live, parts: outfit === 'crew' ? null : outfitParts(outfit) });
}

/**
 * A skeleton for a crew member in an outfit as an SVG in the rig's frame, as the rig's
 * dressedFigureSvg gives it: inline (the element alone) or as a file with its header; layer
 * 'front' is what lies over the place's prop. Every id in it starts with prefix: give each mounted
 * figure its own.
 */
export function dressedFigureSvg(c, sk, { outfit = 'crew', prefix = 'f', layer = 'body', inline = true, header = '', motion = {}, art = null, live = false } = {}) {
  if (!OUTFITS.includes(outfit)) throw new Error(`Unknown outfit: ${outfit}`);
  const cv = inkCanvas(prefix);
  drawDressed(cv, c, sk, outfit, motion, { art, live });
  const [minX, minY, w, h] = FRAME.box;
  return cv.svg({ viewBox: `${minX} ${minY} ${w} ${h}`, width: w, height: h, layer, inline, header });
}

/** The crew suit's drawing, as the rig's body.mjs figureSvg: dressedFigureSvg in the crew outfit. */
export function figureSvg(c, sk, { prefix = 'f', layer = 'body', inline = true, header = '', motion = {}, art = null, live = false } = {}) {
  return dressedFigureSvg(c, sk, { outfit: 'crew', prefix, layer, inline, header, motion, art, live });
}

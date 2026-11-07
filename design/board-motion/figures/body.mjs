// mothership:dev-only
//
// A figure drawn from a skeleton (owner's decision of 9 October 2026: five fixed places in
// each room, each with its own gesture, and every gesture animated). A gesture is only joint
// positions; this draws any of them for any of the nine characters by the same rules, so a
// gesture never says anything about who the character is, and an animation is a sequence of
// skeletons (motion.mjs).
//
// Every figure shares one frame (FRAME): the floor is y 233 and a place's anchor is x 62 on
// it, so a figure can stand up from a console, walk off and fall without leaving its box.

import { INK, PAPER, add, blob, canvas, chain, curve, sub, unit } from './rig.mjs';
import { BELT, SUIT, head } from './crew.mjs';
import { boot, hand, item, patch } from './parts.mjs';

/** The shared frame of every figure (viewBox), the floor's line in it and a place's anchor on it. */
export const FRAME = { box: [-90, -40, 300, 300], floor: 233, anchor: [62, 233] };
export const ARM = [8.4, 6.8, 5.2];
export const LEG = [11.8, 8.6, 6.4];
export const HEAD_SCALE = 1.32;

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mul = (v, k) => [v[0] * k, v[1] * k];
const deg = v => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const perp = ([x, y]) => [-y, x];

/** The joints of a skeleton that are points. */
export const POINTS = ['pelvis', 'neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF'];

/**
 * The parts of a figure in the order they are drawn when nothing else is said: the far arm
 * behind the body, the legs, the neck, the torso, the near arm, the head. N is the near side
 * (the picture's right for a figure turned to the left), F the far side.
 */
/** The board-motion proposal these figures and scenes belong to: a later export revision's candidate. */
export const FIGURE_VERSION = 'board-motion-0.3.0';
export const ORDER = ['armF', 'legF', 'legN', 'neck', 'torso', 'armN', 'head'];

function torsoPoints(sk) {
  const { sN, sF, neck, pelvis, hipN, hipF } = sk;
  const up = unit(sub(neck, pelvis));
  const down = mul(up, -1);
  const mid = lerp(sF, sN, 0.5);
  const outF = unit(sub(sF, mid)), outN = unit(sub(sN, mid));
  const hipOut = (hip, k) => add(add(hip, unit(sub(hip, pelvis)), k), down, 1);
  const hipOutF = hipOut(hipF, LEG[0] - 1), hipOutN = hipOut(hipN, LEG[0] - 1.6);
  const p = {
    collarF: add(lerp(neck, sF, 0.45), up, 4),
    shoulderF: add(add(sF, outF, 2.5), up, 1.5),
    sideF: add(lerp(sF, hipOutF, 0.28), outF, 1),
    waistF: add(lerp(sF, hipOutF, 0.66), outF, -2.4),
    hipOutF,
    crotch: add(pelvis, down, 9),
    hipOutN,
    waistN: add(lerp(sN, hipOutN, 0.66), outN, -2.4),
    sideN: add(lerp(sN, hipOutN, 0.28), outN, 1),
    shoulderN: add(add(sN, outN, 2.5), up, 1.5),
    collarN: add(lerp(neck, sN, 0.45), up, 4),
  };
  return { p, up, down, outF, outN };
}

function drawTorso(cv, c, sk) {
  const { p, up, down } = torsoPoints(sk);
  const outline = blob([p.collarF, p.shoulderF, p.sideF, p.waistF, p.hipOutF, p.crotch, p.hipOutN, p.waistN, p.sideN, p.shoulderN, p.collarN], 0.85);
  const spine = t => lerp(sk.neck, sk.pelvis, t);
  const shadow = blob([
    lerp(sk.neck, p.collarN, 0.7), p.shoulderN, p.sideN, p.waistN, p.hipOutN, lerp(p.crotch, p.hipOutN, 0.45),
    lerp(spine(0.66), p.waistN, 0.55), lerp(spine(0.3), p.sideN, 0.62),
  ], 0.85);
  cv.form(outline, SUIT, { stroke: 2.8, shadow, hatch: true });
  const center = lerp(p.collarF, p.collarN, 0.5);
  const beltF = add(p.hipOutF, up, 11), beltN = add(p.hipOutN, up, 11);
  if (sk.back) {
    // The back of the suit: a seam down the spine and the shoulder blades.
    cv.line(curve([add(center, down, 2), spine(0.5), add(lerp(beltF, beltN, 0.5), down, 1)]), { width: 1.3 });
    cv.line(curve([lerp(p.shoulderF, center, 0.3), add(lerp(p.sideF, spine(0.3), 0.4), down, 6), lerp(p.waistF, spine(0.55), 0.3)]), { width: 1.1 });
    cv.line(curve([lerp(p.shoulderN, center, 0.3), add(lerp(p.sideN, spine(0.3), 0.4), down, 6), lerp(p.waistN, spine(0.55), 0.3)]), { width: 1.1 });
  } else {
    // The zip, the collar, two folds of the chest and the light on the lit side.
    cv.line(`M${center[0].toFixed(1)} ${(center[1] + 1.5).toFixed(1)} L${lerp(beltF, beltN, 0.52).map(v => v.toFixed(1)).join(' ')}`, { width: 1.6 });
    const vee = add(sk.neck, down, 10);
    cv.line(`M${p.collarF.map(v => v.toFixed(1)).join(' ')} L${vee.map(v => v.toFixed(1)).join(' ')} L${p.collarN.map(v => v.toFixed(1)).join(' ')}`, { width: 2 });
    const foldF = lerp(spine(0.35), p.sideF, 0.55), foldN = lerp(spine(0.35), p.sideN, 0.55);
    cv.line(curve([add(foldF, up, 3), add(lerp(foldF, spine(0.35), 0.15), down, 2), add(foldF, down, 10)]), { width: 1.2 });
    cv.line(curve([add(foldN, up, 3), add(lerp(foldN, spine(0.35), 0.15), down, 2), add(foldN, down, 10)]), { width: 1.2 });
    cv.line(curve([add(lerp(p.shoulderF, p.sideF, 0.2), sub(sk.neck, sk.sF).map(v => v * 0.08), 1), lerp(p.sideF, spine(0.3), 0.12), lerp(p.waistF, spine(0.55), 0.1)]), { width: 1.2, color: PAPER, opacity: 0.7 });
  }
  // The belt: a band round the hips, sagging a little in the middle, and its buckle.
  const sag = add(lerp(beltF, beltN, 0.5), down, 5);
  const lowF = add(p.hipOutF, up, 2), lowN = add(p.hipOutN, up, 2);
  const f = v => v.map(n => n.toFixed(1)).join(' ');
  cv.form(`M${f(beltF)} Q${f(sag)} ${f(beltN)} L${f(lowN)} Q${f(add(sag, down, 9))} ${f(lowF)} Z`, BELT, { stroke: 2 });
  if (!sk.back) {
    const buckle = add(lerp(lerp(beltF, lowF, 0.5), lerp(beltN, lowN, 0.5), 0.52), down, 3);
    cv.group(`translate(${f(buckle)}) rotate(${deg(sub(beltN, beltF)).toFixed(1)})`, () => cv.form('M-4.5 -4.7 H4.5 V4.7 H-4.5 Z', c.accent, { stroke: 1.6 }));
  }
}

function drawArm(cv, c, sk, side) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  const spec = sk[`hand${side}`] ?? {};
  cv.limb([s, e, w], ARM, SUIT);
  // The patch on the sleeve below the shoulder, across the arm: seen from the front or behind.
  patch(cv, c, lerp(s, e, 0.24), deg(sub(e, s)) - 90);
  // The crease inside the elbow, toward the bend.
  const inside = unit(sub(lerp(s, w, 0.5), e));
  if (Math.hypot(...sub(lerp(s, w, 0.5), e)) > 3) cv.line(curve([add(lerp(s, e, 0.82), inside, 3), add(e, inside, 4.6), add(lerp(e, w, 0.18), inside, 3)]), { width: 1.2 });
  // The cuff of the sleeve, in the character's accent.
  const along = unit(sub(w, e)), across = perp(along);
  const cuff = lerp(e, w, 0.74);
  cv.line(`M${add(cuff, across, ARM[2] + 0.4).map(v => v.toFixed(1)).join(' ')} L${add(cuff, across, -ARM[2] - 0.4).map(v => v.toFixed(1)).join(' ')}`, { width: 2.6, color: c.accent });
  if (spec.type === 'none') return;
  const angle = spec.angle ?? deg(along);
  const at = add(w, along, 4.4);
  // A held thing lies under the fingers that grip it: drawn first, the hand over it.
  if (spec.item) item(cv, spec.item, add(at, spec.itemAt ?? [0, 0]), spec.itemAngle ?? 0);
  hand(cv, c, at, angle, { size: spec.size ?? 1.2, type: spec.type ?? 'open' });
}

function drawLeg(cv, c, sk, side) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  cv.limb([hip, k, a], LEG, SUIT);
  // The crease across the knee, on the side the shin turns from.
  const thigh = unit(sub(k, hip)), shin = unit(sub(a, k));
  const across = unit(perp(add(thigh, shin)));
  const front = unit(sub(lerp(hip, a, 0.5), k));
  const cross = Math.abs(thigh[0] * shin[1] - thigh[1] * shin[0]);
  const bend = cross > 0.12 ? mul(front, -1) : add(thigh, shin, 0).map(v => v * 0.5);
  cv.line(curve([add(add(k, across, -6.4), bend, -1.6), add(k, bend, cross > 0.12 ? -3 : 1), add(add(k, across, 6.4), bend, -1.6)]), { width: 1.2 });
  if (foot.type === 'none') return;
  boot(cv, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

function drawNeck(cv, c, sk) {
  const toward = unit(sub(sk.neck, sk.head));
  const chin = add(sk.head, toward, 14);
  const base = add(sk.neck, toward, -1);
  cv.form(chain([chin, base], [6.8, 7.6]), c.skin, { stroke: 2.3, shadow: chain([add(chin, [4.4, 0]), add(base, [4.4, 0])], [4, 4.6]) });
}

function drawHead(cv, c, sk) {
  const [x, y] = sk.head;
  cv.group(`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(sk.tilt ?? 0).toFixed(1)}) scale(${HEAD_SCALE})`, () => head(cv, c, sk.view ?? 'front', { bandage: Boolean(sk.bandage) }));
}

/** A sling: a cloth cradling the near forearm, its strap round the neck to the far shoulder. */
function drawSling(cv, c, sk) {
  const { eN, wN, neck, sF } = sk;
  const across = perp(unit(sub(wN, eN)));
  const down = across[1] < 0 ? mul(across, -1) : across;
  cv.line(curve([add(eN, [0, -4]), add(lerp(sk.sN, neck, 0.4), [0, 2]), add(neck, [-2, 4]), add(lerp(neck, sF, 0.4), [0, 6])]), { width: 5.5, color: INK });
  cv.line(curve([add(eN, [0, -4]), add(lerp(sk.sN, neck, 0.4), [0, 2]), add(neck, [-2, 4]), add(lerp(neck, sF, 0.4), [0, 6])]), { width: 3, color: PAPER });
  cv.form(blob([add(eN, down, -3), add(eN, down, 10), add(lerp(eN, wN, 0.5), down, 13), add(wN, down, 9), add(wN, down, -4), add(lerp(eN, wN, 0.5), down, -5)], 0.8), PAPER, { stroke: 2.2, shadow: blob([add(lerp(eN, wN, 0.2), down, 4), add(lerp(eN, wN, 0.5), down, 13), add(wN, down, 9), add(lerp(eN, wN, 0.7), down, 3)], 0.8), dots: false });
}

const PARTS = {
  armF: (cv, c, sk) => drawArm(cv, c, sk, 'F'),
  armN: (cv, c, sk) => { drawArm(cv, c, sk, 'N'); if (sk.sling) drawSling(cv, c, sk); },
  legF: (cv, c, sk) => drawLeg(cv, c, sk, 'F'),
  legN: (cv, c, sk) => drawLeg(cv, c, sk, 'N'),
  neck: drawNeck,
  torso: drawTorso,
  head: drawHead,
  // A gesture's own prop, where its order puts it (a laptop on the knees, under the near hand).
  prop: (cv, c, sk) => { if (sk.prop) item(cv, sk.prop.item, sk.prop.at, sk.prop.angle ?? 0); },
};

/**
 * A skeleton for a character as an SVG: inline (the element alone, for a page that draws it)
 * or as a file with its header. layer 'front' is what lies over the place's prop.
 */
export function figureSvg(c, sk, { prefix = 'f', layer = 'body', inline = true, header = '' } = {}) {
  const cv = canvas(prefix);
  drawFigure(cv, c, sk);
  const [minX, minY, w, h] = FRAME.box;
  return cv.svg({ viewBox: `${minX} ${minY} ${w} ${h}`, width: w, height: h, header, layer, inline });
}

/** Whether a skeleton draws anything on the front layer. */
export const hasFront = sk => (sk.front ?? []).length > 0;

/**
 * Draws a skeleton for a character on a canvas (rig.mjs). The parts named in sk.front go to
 * the canvas's front layer, laid over the prop of the figure's place (the hands on a desk).
 * sk.shadow is the figure's contact shadow on the floor, [x, half-width], or none.
 */
export function drawFigure(cv, c, sk) {
  if (sk.shadow) {
    const [x, rx] = sk.shadow, y = sk.floorY ?? FRAME.floor;
    cv.fill(`M${x - rx} ${y} A${rx} 6.5 0 1 0 ${x + rx} ${y} A${rx} 6.5 0 1 0 ${x - rx} ${y} Z`, INK, 0.3);
  }
  const front = new Set(sk.front ?? []);
  for (const part of sk.order ?? ORDER) {
    if (front.has(part)) cv.front(() => PARTS[part](cv, c, sk));
    else PARTS[part](cv, c, sk);
  }
}

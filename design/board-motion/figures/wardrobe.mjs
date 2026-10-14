// mothership:dev-only
//
// What a figure wears, by the room it is in (the owner's request of 12 October 2026, issue
// #121): the crew suit everywhere, a patient's gown in the Hospital, a prisoner's striped suit
// in the Jail. The clothes follow the figure's PUBLIC location and nothing else: not its
// health (an Injured character wears its bandage in any clothes), not Jailed (a released,
// Injured character still waiting in the Jail because the Hospital is full is jailed=false and
// still wears the striped suit), not Captain, not Eliminated, and never anything of a role, a
// side, an ability or a cause. Everyone in a room wears the same clothes.
//
// The person never changes: the head, the face, the hair, the skin and the hands are drawn by
// body.mjs itself (its head, neck and prop parts), and the clothes are drawn on the same
// skeleton, in the same frame and in the same order of parts, so that every gesture, every
// place's front layer and every frame of every animation (motion.mjs) can be drawn in every
// outfit. In the crew suit a figure is exactly body.mjs's: figureSvg, byte for byte.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude
// Code), in the drawing vocabulary of rig.mjs: paths, patterns and clip paths, in the public
// palette (ink, paper and steel) and each character's own skin and colors.

import { INK, PAPER, PAPER_DEEP, PAPER_SHADE, STEEL, add, blob, chain, chainShadow, curve, pt, sub, unit } from './rig.mjs';
import { ARM, FRAME, LEG, ORDER, drawFigure, figureSvg } from './body.mjs';
import { boot, hand, item } from './parts.mjs';

/** This proposal's version: a later export revision's candidate, beside board-motion-0.3.0. */
export const WARDROBE_VERSION = 'wardrobe-0.1.0';
/** The three outfits, by public location. */
export const OUTFITS = Object.freeze(['crew', 'gown', 'prison']);
/** The clothes a public location dresses a figure in: the Hospital a gown, the Jail a prisoner's suit, anywhere else the crew suit. */
export const outfitFor = location => (location === 'Hospital' ? 'gown' : location === 'Jail' ? 'prison' : 'crew');

/** The gown's cloth: paper, printed with small steel dots; the prisoner's suit: paper with ink bands. */
export const GOWN = PAPER;
const GOWN_PRINT = STEEL.light;
const PRISON = PAPER;
const STRIPE = STEEL.deep;
/** A prisoner's band and the gap between two bands, in figure units: bold enough to read at a phone's scale. */
const STRIPE_PERIOD = 15;

// Light comes from the upper left, as in rig.mjs: a shadow faces right and down.
const TONE_DOWN = {
  [STEEL.pale]: STEEL.light, [STEEL.light]: STEEL.mid, [STEEL.mid]: STEEL.shadow,
  [STEEL.shadow]: STEEL.deep, [STEEL.deep]: INK, [PAPER]: PAPER_SHADE, [PAPER_SHADE]: PAPER_DEEP,
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mul = (v, k) => [v[0] * k, v[1] * k];
const perp = ([x, y]) => [-y, x];
const deg = v => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * A drawing canvas with rig.mjs's output (the same patterns, forms, lines and front layer), and
 * two more things the clothes need: a print of the gown, and drawing clipped to a shape (a
 * prisoner's bands inside a sleeve). body.mjs draws the head, neck and props on it unchanged.
 */
function dressCanvas(prefix) {
  const defs = [
    `<pattern id="${prefix}-dots" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="1.5" cy="1.5" r="0.7" fill="${INK}" opacity="0.3"/></pattern>`,
    `<pattern id="${prefix}-hatch" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V3.6" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.4"/><circle cx="1.8" cy="1.8" r="0.7" fill="${INK}" opacity="0.3"/></pattern>`,
    `<pattern id="${prefix}-print" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.75" cy="2.75" r="1.7" fill="${GOWN_PRINT}"/><circle cx="8.25" cy="8.25" r="1.7" fill="${GOWN_PRINT}"/></pattern>`,
  ];
  const layers = { body: [], front: [] };
  let body = layers.body;
  let clips = 0;
  const clip = d => { const id = `${prefix}-clip-${(clips += 1)}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };
  const shadowOf = (d, fill, shadow, { hatch, dots, depth }) => {
    const tone = TONE_DOWN[String(fill).toUpperCase()];
    const inner = [tone ? `<path d="${shadow}" fill="${tone}"/>` : `<path d="${shadow}" fill="${INK}" opacity="${depth}"/>`];
    if (hatch) inner.push(`<path d="${shadow}" fill="url(#${prefix}-hatch)"/>`);
    else if (dots) inner.push(`<path d="${shadow}" fill="url(#${prefix}-dots)"/>`);
    return `<g clip-path="url(#${clip(d)})">${inner.join('')}</g>`;
  };
  const api = {
    prefix,
    form(d, fill, { stroke = 2.4, shadow = null, hatch = false, dots = true, depth = 0.24 } = {}) {
      const parts = [`<path d="${d}" fill="${fill}"/>`];
      if (shadow) parts.push(shadowOf(d, fill, shadow, { hatch, dots, depth }));
      parts.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`);
      body.push(parts.join(''));
    },
    limb(points, radii, fill, { stroke = 2.4, hatch = true } = {}) {
      api.form(chain(points, radii), fill, { stroke, shadow: chainShadow(points, radii), hatch });
    },
    line(d, { width = 1.4, color = INK, cap = 'round', opacity = null } = {}) {
      body.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
    },
    fill(d, color, opacity = null) { body.push(`<path d="${d}" fill="${color}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`); },
    group(transform, draw) { body.push(`<g transform="${transform}">`); draw(); body.push('</g>'); },
    front(draw) { const keep = body; body = layers.front; draw(); body = keep; },
    hasFront: () => layers.front.length > 0,
    /** Draws inside a shape only (a prisoner's bands inside its sleeve). */
    within(d, draw) { body.push(`<g clip-path="url(#${clip(d)})">`); draw(); body.push('</g>'); },
    /** A cloth's cel shadow over what is already drawn in its shape: the tone of the cloth's shadow, or an ink tint. */
    shade(d, shadow, fill, { hatch = true, dots = true, depth = 0.22 } = {}) { body.push(shadowOf(d, fill, shadow, { hatch, dots, depth })); },
    svg({ viewBox, width, height, header, layer = 'body', inline = false }) {
      if (inline) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"><defs>${defs.join('')}</defs>${layers[layer].join('')}</svg>`;
      return `<?xml version="1.0" encoding="UTF-8"?>
<!--
${header}
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>${defs.join('')}</defs>
  ${layers[layer].join('\n  ')}
</svg>
`;
    },
  };
  return api;
}

// ---------- the bands of a prisoner's suit ----------

/**
 * Bands across a stretch from a to b (a sleeve, a trouser leg, the body): quadrilaterals at
 * right angles to it, half as wide as their period, wide enough to cross the stretch's width,
 * starting at a phase so that bands run on from one stretch to the next.
 */
function bands(a, b, halfWidth, phase = 0) {
  const length = dist(a, b);
  if (length < 0.5) return { d: '', phase };
  const along = unit(sub(b, a)), across = perp(along);
  let d = '';
  let s = -phase;
  while (s < length) {
    const from = Math.max(0, s), to = Math.min(length, s + STRIPE_PERIOD / 2);
    if (to > from) {
      const p = add(a, along, from), q = add(a, along, to);
      d += `M${pt(add(p, across, halfWidth))} L${pt(add(q, across, halfWidth))} L${pt(add(q, across, -halfWidth))} L${pt(add(p, across, -halfWidth))} Z `;
    }
    s += STRIPE_PERIOD;
  }
  return { d, phase: (phase + length) % STRIPE_PERIOD };
}

/** The bands of a limb from joint to joint, run on across its bend. */
function limbBands(points, radii) {
  let phase = 0, d = '';
  for (let i = 0; i < points.length - 1; i += 1) {
    const reach = Math.max(radii[i], radii[i + 1]) + 3;
    // Each stretch overlaps the next by its own radius, so a bent elbow or knee has no gap in it.
    const along = unit(sub(points[i + 1], points[i]));
    const a = i === 0 ? add(points[i], along, -reach) : points[i];
    const b = i === points.length - 2 ? add(points[i + 1], along, reach) : points[i + 1];
    const run = bands(a, b, reach, phase);
    d += run.d;
    phase = run.phase;
  }
  return d.trim();
}

// ---------- the body of the clothes ----------

/** The outline of the trunk of a suit (a crew suit's, a prisoner's), as body.mjs draws it. */
function trunk(sk, { hem = 0, flare = 0, dress = false } = {}) {
  const { sN, sF, neck, pelvis, hipN, hipF } = sk;
  const up = unit(sub(neck, pelvis));
  const down = mul(up, -1);
  const mid = lerp(sF, sN, 0.5);
  const outF = unit(sub(sF, mid)), outN = unit(sub(sN, mid));
  const hipOut = (hip, k) => add(add(hip, unit(sub(hip, pelvis)), k), down, 1);
  const hipOutF = add(add(hipOut(hipF, LEG[0] - 1), down, hem), outF, flare), hipOutN = add(add(hipOut(hipN, LEG[0] - 1.6), down, hem), outN, flare);
  const p = {
    collarF: add(lerp(neck, sF, 0.45), up, 4),
    shoulderF: add(add(sF, outF, 2.5), up, 1.5),
    sideF: add(lerp(sF, hipOutF, 0.28), outF, 1),
    waistF: add(lerp(sF, hipOutF, 0.66), outF, -2.4 + flare * 0.4),
    hipOutF,
    crotch: add(pelvis, down, dress ? hem + 2 : 9 + hem),
    hipOutN,
    waistN: add(lerp(sN, hipOutN, 0.66), outN, -2.4 + flare * 0.4),
    sideN: add(lerp(sN, hipOutN, 0.28), outN, 1),
    shoulderN: add(add(sN, outN, 2.5), up, 1.5),
    collarN: add(lerp(neck, sN, 0.45), up, 4),
  };
  const spine = t => lerp(neck, pelvis, t);
  const outline = blob([p.collarF, p.shoulderF, p.sideF, p.waistF, p.hipOutF, p.crotch, p.hipOutN, p.waistN, p.sideN, p.shoulderN, p.collarN], 0.85);
  const shadow = blob([
    lerp(neck, p.collarN, 0.7), p.shoulderN, p.sideN, p.waistN, p.hipOutN, lerp(p.crotch, p.hipOutN, 0.45),
    lerp(spine(0.66), p.waistN, 0.55), lerp(spine(0.3), p.sideN, 0.62),
  ], 0.85);
  return { p, up, down, outline, shadow, spine };
}

/** A prisoner's suit: the crew suit's cut, in bands, buttoned down the front, a blank number patch on the chest. */
function prisonTorso(cv, c, sk) {
  const { p, up, down, outline, shadow, spine } = trunk(sk);
  cv.fill(outline, PRISON);
  const halfWidth = Math.max(dist(p.shoulderF, p.shoulderN), dist(p.hipOutF, p.hipOutN)) / 2 + 6;
  const top = add(sk.neck, up, 10), bottom = add(sk.pelvis, down, 14);
  cv.within(outline, () => cv.fill(bands(top, bottom, halfWidth, 4).d.trim(), STRIPE));
  cv.shade(outline, shadow, PRISON, { hatch: true });
  cv.line(outline, { width: 2.8 });
  const center = lerp(p.collarF, p.collarN, 0.5);
  if (sk.back) {
    cv.line(curve([add(center, down, 2), spine(0.5), add(spine(1), down, 4)]), { width: 1.3 });
  } else {
    // A round neck, the placket down the front and its buttons, and the blank number patch.
    cv.line(curve([p.collarF, add(sk.neck, down, 7), p.collarN]), { width: 2 });
    const placketTop = add(sk.neck, down, 7), placketBottom = lerp(spine(1), add(spine(1), down, 6), 0.5);
    cv.line(`M${pt(placketTop)} L${pt(placketBottom)}`, { width: 1.5 });
    for (const t of [0.25, 0.5, 0.75]) cv.fill(blobDot(lerp(placketTop, placketBottom, t), 1.5), INK);
    const across = unit(sub(p.sideN, p.sideF));
    const at = add(lerp(lerp(p.sideF, p.sideN, 0.73), spine(0.32), 0.25), down, 2);
    cv.group(`translate(${pt(at)}) rotate(${deg(across).toFixed(1)})`, () => {
      cv.form('M-6.6 -4.6 H6.6 V4.6 H-6.6 Z', PAPER, { stroke: 1.5 });
      cv.line('M-4.4 -1.4 H4.4 M-4.4 1.6 H2', { width: 1.1 });
    });
  }
}

/**
 * How far the thighs hang along the body (1 standing or lying straight, 0 seated): a gown hangs
 * to the middle of the thighs on a figure standing, and lies over the lap of one seated.
 */
function hang(sk) {
  const down = unit(sub(sk.pelvis, sk.neck));
  const along = side => { const t = unit(sub(sk[`k${side}`], sk[`hip${side}`])); return Math.max(0, t[0] * down[0] + t[1] * down[1]); };
  return Math.min(1, (along('F') + along('N')) / 2);
}

const blobDot = ([x, y], r) => `M${(x - r).toFixed(1)} ${y.toFixed(1)} a${r} ${r} 0 1 0 ${(2 * r).toFixed(1)} 0 a${r} ${r} 0 1 0 ${(-2 * r).toFixed(1)} 0 Z`;

/**
 * A patient's gown: loose, down to the middle of the thighs, a round neck with its tie, printed
 * with small dots. From behind, the open back's two ties. The thighs' share of the gown is drawn
 * with the legs (gownSkirt), so that it lies on the lap of a seated figure.
 */
function gownTorso(cv, c, sk) {
  const length = hang(sk);
  const { p, up, down, outline, shadow, spine } = trunk(sk, { hem: 4 + 26 * length, flare: 2 + 5 * length, dress: length > 0.35 });
  cv.form(outline, GOWN, { stroke: 2.8, shadow, hatch: false, dots: false });
  cv.within(outline, () => cv.fill(outline, `url(#${cv.prefix}-print)`));
  cv.shade(outline, shadow, GOWN, { hatch: true });
  cv.line(outline, { width: 2.8 });
  const center = lerp(p.collarF, p.collarN, 0.5);
  if (sk.back) {
    // The open back: its edges down the spine, tied at two places.
    cv.line(curve([add(center, down, 1), spine(0.5), add(spine(1), down, 5)]), { width: 1.5 });
    for (const t of [0.28, 0.62]) {
      const knot = spine(t);
      const across = unit(sub(p.sideN, p.sideF));
      cv.line(`M${pt(add(knot, across, -5.5))} Q${pt(add(knot, down, 3))} ${pt(add(knot, across, 5.5))}`, { width: 1.5 });
      cv.line(`M${pt(knot)} L${pt(add(add(knot, down, 6), across, -2))} M${pt(knot)} L${pt(add(add(knot, down, 6), across, 2.5))}`, { width: 1.2 });
    }
  } else {
    // A round neck with its tie, and the loose folds from the shoulders.
    cv.line(curve([p.collarF, add(sk.neck, down, 6), p.collarN]), { width: 2.1 });
    const knot = add(lerp(sk.neck, p.collarN, 0.55), down, 4);
    cv.line(`M${pt(knot)} l-3 6 M${pt(knot)} l3.4 5.4`, { width: 1.3 });
    const hemMid = add(spine(1), down, 7);
    cv.line(curve([add(lerp(p.shoulderF, p.collarF, 0.5), down, 6), lerp(lerp(p.waistF, spine(0.6), 0.4), hemMid, 0.15), lerp(p.hipOutF, hemMid, 0.35)]), { width: 1.1, opacity: 0.7 });
    cv.line(curve([add(lerp(p.shoulderN, p.collarN, 0.5), down, 6), lerp(lerp(p.waistN, spine(0.6), 0.4), hemMid, 0.15), lerp(p.hipOutN, hemMid, 0.35)]), { width: 1.1, opacity: 0.7 });
  }
}

// ---------- arms ----------

function handOf(cv, c, sk, side, at, along) {
  const spec = sk[`hand${side}`] ?? {};
  if (spec.type === 'none') return;
  const angle = spec.angle ?? deg(along);
  if (spec.item) item(cv, spec.item, add(at, spec.itemAt ?? [0, 0]), spec.itemAngle ?? 0);
  hand(cv, c, at, angle, { size: spec.size ?? 1.2, type: spec.type ?? 'open' });
}

/** A prisoner's arm: a long banded sleeve, an ink cuff, the hand. */
function prisonArm(cv, c, sk, side) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  const points = [s, e, w], radii = ARM;
  const d = chain(points, radii);
  cv.fill(d, PRISON);
  cv.within(d, () => cv.fill(limbBands(points, radii), STRIPE));
  cv.shade(d, chainShadow(points, radii), PRISON, { hatch: true });
  cv.line(d, { width: 2.4 });
  const along = unit(sub(w, e)), across = perp(along);
  const cuff = lerp(e, w, 0.8);
  cv.line(`M${pt(add(cuff, across, ARM[2] + 0.4))} L${pt(add(cuff, across, -ARM[2] - 0.4))}`, { width: 3.2, color: INK });
  handOf(cv, c, sk, side, add(w, along, 4.4), along);
}

/** A patient's arm: a short loose sleeve over the shoulder, the bare arm, an ID band at the wrist. */
function gownArm(cv, c, sk, side) {
  const s = sk[`s${side}`], e = sk[`e${side}`], w = sk[`w${side}`];
  // The bare arm, a little slimmer than a sleeve.
  cv.limb([s, e, w], ARM.map(r => r * 0.86), c.skin, { hatch: false });
  const along = unit(sub(w, e)), across = perp(along);
  // The wristband: paper, with a dot of the character's own color (the ID tag of a patient).
  const band = lerp(e, w, 0.78);
  cv.line(`M${pt(add(band, across, ARM[2] * 0.86 + 0.6))} L${pt(add(band, across, -ARM[2] * 0.86 - 0.6))}`, { width: 3, color: INK });
  cv.line(`M${pt(add(band, across, ARM[2] * 0.86 - 0.6))} L${pt(add(band, across, -ARM[2] * 0.86 + 0.6))}`, { width: 1.6, color: PAPER });
  // The sleeve: from the shoulder to a third of the upper arm, loose, with a hem.
  const hem = lerp(s, e, 0.42);
  const sleeve = chain([add(s, unit(sub(s, e)), 2), hem], [ARM[0] + 3.2, ARM[0] + 3.6]);
  cv.form(sleeve, GOWN, { stroke: 2.2, shadow: chainShadow([s, hem], [ARM[0] + 3.2, ARM[0] + 3.6]), hatch: false, dots: false });
  cv.within(sleeve, () => cv.fill(sleeve, `url(#${cv.prefix}-print)`));
  cv.line(sleeve, { width: 2.2 });
  const up = unit(sub(e, s)), side2 = perp(up);
  cv.line(`M${pt(add(hem, side2, ARM[0] + 3))} L${pt(add(hem, side2, -ARM[0] - 3))}`, { width: 1.4 });
  handOf(cv, c, sk, side, add(w, along, 4.4), along);
}

// ---------- legs ----------

/** A prisoner's leg: a banded trouser leg to the ankle, and the crew's boot. */
function prisonLeg(cv, c, sk, side) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  const points = [hip, k, a], radii = LEG;
  const d = chain(points, radii);
  cv.fill(d, PRISON);
  cv.within(d, () => cv.fill(limbBands(points, radii), STRIPE));
  cv.shade(d, chainShadow(points, radii), PRISON, { hatch: true });
  cv.line(d, { width: 2.4 });
  if (foot.type === 'none') return;
  boot(cv, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

/** A paper slipper: the ankle at a point, the toe to the left (dir -1) or the right (dir 1). */
function slipper(cv, [x, y], dir = -1, angle = 0, { view = 'side' } = {}) {
  cv.group(`translate(${pt([x, y])}) rotate(${angle})`, () => {
    if (view === 'back') {
      cv.form(blob([[-6.6, 4], [6.6, 4], [7, 11], [6, 14.6], [-6, 14.6], [-7, 11]], 0.5), PAPER_SHADE, { stroke: 2.1, shadow: blob([[1.6, 4], [6.6, 4], [7, 11], [6, 14.6], [1.6, 14.6]], 0.5) });
      return;
    }
    const m = points => points.map(([px, py]) => [px * -dir, py]);
    cv.form(blob(m([[-5.4, 3], [-11, 6.4], [-15.4, 10.4], [-14, 14.6], [5.6, 14.6], [6.6, 9], [5.4, 3]]), 0.5), PAPER_SHADE, { stroke: 2.1, shadow: blob(m([[1, 4], [5.4, 3], [6.6, 9], [5.6, 14.6], [0, 14.6]]), 0.5) });
    cv.line(`M${(-3 * -dir).toFixed(1)} 5.6 Q${(-8 * -dir).toFixed(1)} 6.4 ${(-12 * -dir).toFixed(1)} 9.6`, { width: 1.2 });
  });
}

/** A patient's leg: the gown over the thigh (gownSkirt draws it), the bare shin, a slipper. */
function gownLeg(cv, c, sk, side) {
  const hip = sk[`hip${side}`], k = sk[`k${side}`], a = sk[`a${side}`];
  const foot = sk[`foot${side}`] ?? {};
  cv.limb([hip, k, a], LEG.map(r => r * 0.8), c.skin, { hatch: false });
  if (hang(sk) > 0.62) {
    if (foot.type !== 'none') slipper(cv, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
    return;
  }
  // Seated, the gown lies over the lap: from the hip to just above the knee.
  const hem = lerp(hip, k, 0.62);
  const skirt = chain([add(hip, unit(sub(hip, k)), 3), hem], [LEG[0] + 3.4, LEG[0] + 4.2]);
  cv.form(skirt, GOWN, { stroke: 2.3, shadow: chainShadow([hip, hem], [LEG[0] + 3.4, LEG[0] + 4.2]), hatch: false, dots: false });
  cv.within(skirt, () => cv.fill(skirt, `url(#${cv.prefix}-print)`));
  cv.line(skirt, { width: 2.3 });
  const up = unit(sub(k, hip)), across = perp(up);
  cv.line(`M${pt(add(hem, across, LEG[0] + 3.8))} L${pt(add(hem, across, -LEG[0] - 3.8))}`, { width: 1.3 });
  if (foot.type === 'none') return;
  slipper(cv, a, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
}

/** A sling, as body.mjs draws it for the Injured at the Hospital's bench: a cloth under the near forearm, its strap round the neck. */
function sling(cv, sk) {
  const { eN, wN, neck, sF } = sk;
  const across = perp(unit(sub(wN, eN)));
  const down = across[1] < 0 ? mul(across, -1) : across;
  const strap = curve([add(eN, [0, -4]), add(lerp(sk.sN, neck, 0.4), [0, 2]), add(neck, [-2, 4]), add(lerp(neck, sF, 0.4), [0, 6])]);
  cv.line(strap, { width: 5.5, color: INK });
  cv.line(strap, { width: 3, color: PAPER });
  cv.form(blob([add(eN, down, -3), add(eN, down, 10), add(lerp(eN, wN, 0.5), down, 13), add(wN, down, 9), add(wN, down, -4), add(lerp(eN, wN, 0.5), down, -5)], 0.8), PAPER, { stroke: 2.2, shadow: blob([add(lerp(eN, wN, 0.2), down, 4), add(lerp(eN, wN, 0.5), down, 13), add(wN, down, 9), add(lerp(eN, wN, 0.7), down, 3)], 0.8), dots: false });
}

const CLOTHES = {
  gown: { torso: gownTorso, arm: gownArm, leg: gownLeg },
  prison: { torso: prisonTorso, arm: prisonArm, leg: prisonLeg },
};

/**
 * Draws a skeleton for a character in an outfit on a canvas: body.mjs's drawFigure in the crew
 * suit; otherwise the outfit's torso, arms and legs, and body.mjs's own neck, head and prop.
 */
export function drawDressed(cv, c, sk, outfit = 'crew') {
  if (!OUTFITS.includes(outfit)) throw new Error(`Unknown outfit: ${outfit}`);
  if (outfit === 'crew') { drawFigure(cv, c, sk); return; }
  const clothes = CLOTHES[outfit];
  if (sk.shadow) {
    const [x, rx] = sk.shadow, y = sk.floorY ?? FRAME.floor;
    cv.fill(`M${x - rx} ${y} A${rx} 6.5 0 1 0 ${x + rx} ${y} A${rx} 6.5 0 1 0 ${x - rx} ${y} Z`, INK, 0.3);
  }
  const part = name => {
    if (name === 'torso') clothes.torso(cv, c, sk);
    else if (name === 'armF') clothes.arm(cv, c, sk, 'F');
    else if (name === 'armN') { clothes.arm(cv, c, sk, 'N'); if (sk.sling) sling(cv, sk); }
    else if (name === 'legF') clothes.leg(cv, c, sk, 'F');
    else if (name === 'legN') clothes.leg(cv, c, sk, 'N');
    // The neck, the head (and its bandage) and a gesture's prop are the person's, as body.mjs draws them.
    else drawFigure(cv, c, { ...sk, shadow: null, front: [], order: [name] });
  };
  const front = new Set(sk.front ?? []);
  for (const name of sk.order ?? ORDER) {
    if (front.has(name)) cv.front(() => part(name));
    else part(name);
  }
}

/**
 * A skeleton for a character in an outfit as an SVG, as figureSvg draws it: inline (the element
 * alone) or as a file with its header; layer 'front' is what lies over the place's prop. In the
 * crew suit it IS figureSvg's drawing.
 */
export function dressedFigureSvg(c, sk, { outfit = 'crew', prefix = 'f', layer = 'body', inline = true, header = '' } = {}) {
  if (!OUTFITS.includes(outfit)) throw new Error(`Unknown outfit: ${outfit}`);
  if (outfit === 'crew') return figureSvg(c, sk, { prefix, layer, inline, header });
  const cv = dressCanvas(prefix);
  drawDressed(cv, c, sk, outfit);
  const [minX, minY, w, h] = FRAME.box;
  return cv.svg({ viewBox: `${minX} ${minY} ${w} ${h}`, width: w, height: h, header, layer, inline });
}

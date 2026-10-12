// Pure proposed drawing derivative. Clothing reads public location only.
// Original body, faces, gestures, room scenes and draw order remain unchanged.
import { FRAME, ARM, LEG, ORDER, drawFigure, figureSvg } from './body.mjs';
import { canvas, INK, PAPER, STEEL, add, sub, unit, blob, curve, pt } from './rig.mjs';
import { hand, item, boot } from './parts.mjs';

export const WARDROBE_VERSION = 'phone-room-clothes-0.1.0';
export const OUTFITS = ['crew', 'patient', 'prisoner'];
export const outfitFor = location => location === 'Hospital' ? 'patient' : location === 'Jail' ? 'prisoner' : 'crew';
const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
const angle = v => Math.atan2(v[1], v[0]) * 180 / Math.PI;
const perp = ([x, y]) => [-y, x];

function arm(cv, c, sk, side, outfit, fabric) {
  const s = sk['s' + side], e = sk['e' + side], w = sk['w' + side];
  const spec = sk['hand' + side] ?? {};
  if (outfit === 'patient') {
    cv.limb([s, e, w], ARM.map(n => n * 0.78), c.skin, { hatch: false });
    const hem = mix(s, e, 0.46);
    cv.limb([s, hem], [10.8, 10.1], fabric, { hatch: false });
    const across = perp(unit(sub(e, s)));
    cv.line(`M${pt(add(hem, across, 9.6))} L${pt(add(hem, across, -9.6))}`, { width: 1.2 });
  } else cv.limb([s, e, w], ARM.map(n => n + 1), fabric);
  if (spec.type === 'none') return;
  const along = unit(sub(w, e)), at = add(w, along, 4.4);
  if (spec.item) item(cv, spec.item, add(at, spec.itemAt ?? [0, 0]), spec.itemAngle ?? 0);
  hand(cv, c, at, spec.angle ?? angle(along), { size: spec.size ?? 1.2, type: spec.type ?? 'open' });
  if (side === 'N' && sk.sling) {
    // Admit only the original sling paths after its first 5.5-unit strap.
    let inSling = false;
    const proxy = { ...cv, limb() {}, line() {}, form() {}, group(_t, draw) { draw(); } };
    proxy.line = (d, opts = {}) => { if (opts.width === 5.5) inSling = true; if (inSling) cv.line(d, opts); };
    proxy.form = (d, fill, opts) => { if (inSling) cv.form(d, fill, opts); };
    drawFigure(proxy, c, { ...sk, shadow: null, front: [], order: ['armN'] });
  }
}
function leg(cv, c, sk, side, outfit, fabric) {
  const hip = sk['hip' + side], knee = sk['k' + side], ankle = sk['a' + side], foot = sk['foot' + side] ?? {};
  cv.limb([hip, knee, ankle], LEG.map(n => outfit === 'patient' ? n * 0.72 : n + 0.8), outfit === 'patient' ? c.skin : fabric);
  if (foot.type === 'none') return;
  if (outfit === 'prisoner') boot(cv, ankle, foot.dir ?? -1, foot.angle ?? 0, { view: foot.view ?? (sk.back ? 'back' : 'side') });
  else {
    const dir = foot.dir ?? -1;
    cv.group(`translate(${pt(ankle)}) rotate(${foot.angle ?? 0})`, () => {
      cv.form(`M-6 -3 Q0 -6 7 -2 L${dir * 16} 7 Q${dir * 17} 12 1 11 L-7 9 Z`, STEEL.pale, { stroke: 2, dots: false });
      cv.line(`M-6 8 L${dir * 14} 9`, { width: 1.2 });
    });
  }
}
function torso(cv, sk, outfit, fabric) {
  const up = unit(sub(sk.neck, sk.pelvis)), down = up.map(n => -n);
  const hem = outfit === 'patient' ? mix(sk.pelvis, mix(sk.kF, sk.kN, 0.5), 0.66) : add(sk.pelvis, down, 12);
  const across = unit(sub(sk.sN, sk.sF));
  const lowerF = add(hem, across, -29), lowerN = add(hem, across, 29);
  const collarF = mix(sk.neck, sk.sF, 0.48), collarN = mix(sk.neck, sk.sN, 0.48);
  const path = blob([collarF, add(sk.sF, across, -3), mix(sk.sF, lowerF, 0.56), lowerF, add(hem, down, 3), lowerN, mix(sk.sN, lowerN, 0.56), add(sk.sN, across, 3), collarN], 0.65);
  cv.form(path, fabric, { stroke: 2.8, shadow: blob([mix(sk.neck, sk.sN, 0.65), sk.sN, lowerN, mix(hem, lowerN, 0.6), mix(sk.pelvis, sk.sN, 0.55)], 0.6), hatch: outfit === 'prisoner' });
  const vee = add(sk.neck, down, 13);
  cv.line(`M${pt(collarF)} L${pt(vee)} L${pt(collarN)}`, { width: 2 });
  if (sk.back && outfit === 'patient') {
    cv.line(curve([vee, mix(vee, hem, 0.5), hem]), { width: 1.2 });
    for (const t of [0.34, 0.68]) {
      const knot = mix(vee, hem, t);
      cv.line(`M${pt(add(knot, across, -7))} L${pt(add(knot, down, 3))} L${pt(add(knot, across, 7))}`, { width: 1.6 });
    }
  } else for (const t of [0.3, 0.62]) cv.line(curve([mix(sk.sF, sk.sN, t), mix(mix(sk.neck, hem, 0.5), lowerF, 0.25), mix(lowerF, lowerN, t)]), { width: 1.1, opacity: 0.6 });
}

/** Original FRAME, skeletons and two-layer contract, including arbitrary motion frames. */
export function wardrobeSvg(character, sk, { outfit = 'crew', prefix = 'wardrobe', layer = 'body', inline = true, header = '' } = {}) {
  if (!OUTFITS.includes(outfit)) throw new Error('Unknown public-room outfit');
  if (outfit === 'crew') return figureSvg(character, sk, { prefix, layer, inline, header });
  const cv = canvas(prefix), fabric = outfit === 'patient' ? STEEL.pale : `url(#${prefix}-prison-lines)`;
  const front = new Set(sk.front ?? []);
  if (sk.shadow) cv.fill(`M${sk.shadow[0] - sk.shadow[1]} ${sk.floorY ?? FRAME.floor} a${sk.shadow[1]} 6.5 0 1 0 ${sk.shadow[1] * 2} 0 a${sk.shadow[1]} 6.5 0 1 0 ${-sk.shadow[1] * 2} 0 Z`, INK, 0.3);
  const draw = part => {
    if (part === 'torso') torso(cv, sk, outfit, fabric);
    else if (part.startsWith('arm')) arm(cv, character, sk, part.slice(-1), outfit, fabric);
    else if (part.startsWith('leg')) leg(cv, character, sk, part.slice(-1), outfit, fabric);
    else drawFigure(cv, character, { ...sk, shadow: null, front: [], order: [part] });
  };
  for (const part of sk.order ?? ORDER) if (front.has(part)) cv.front(() => draw(part)); else draw(part);
  const [x, y, w, h] = FRAME.box;
  let svg = cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h, layer, inline, header });
  if (outfit === 'prisoner') svg = svg.replace('<defs>', `<defs><pattern id="${prefix}-prison-lines" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H24V12H0Z" fill="${PAPER}"/><path d="M0 6H24V12H0Z" fill="${STEEL.mid}"/></pattern>`);
  return svg;
}

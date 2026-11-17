// The test's drawings as SVG, before they are made into pictures: the body in a pose, the acting head, the new
// hands and the injector, each in the crew's ink (crew-drawing-1.0.0, unchanged) and lit as today's film lights
// its character (an ambient dark, a key light, an edge of light: the films' recipe, kit/cast.mjs), put on as each
// drawing is made, never while the film plays.

import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import { CREW_HEAD_SCALE, CREW_PARTS, drawCrewFigure } from '../../../apps/game/hosted/crew-drawing/figure.mjs';
import { inkCanvas } from '../../../apps/game/hosted/crew-drawing/ink.mjs';
import { ROLES } from '../../../apps/game/hosted/pregame-films/roles/roles.mjs';
import { f, f3 } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { HEADS, headArt } from '../../../apps/game/hosted/crew-drawing/head.mjs';
import { FACE_CHARACTER, PIECE_BOX, actingHead, browPiece, eyesPiece, mouthPiece, stripFace } from './face.mjs';

export const CHARACTER = FACE_CHARACTER;
export { CREW_HEAD_SCALE };

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const SEPIA = '0.393 0.769 0.189 0 0.02  0.349 0.686 0.168 0 0.01  0.272 0.534 0.131 0 -0.02  0 0 0 1 0';

/**
 * A look as an SVG filter over `box` (the drawing's own units): `ambient` { color, strength }, `key` { at, z, color,
 * gain }, `rim` { dx, dy, color, width, gain }, and `sepia` for a memory. Positions and widths in the drawing's units.
 */
export function lookFilter(id, look, [x, y, w, h]) {
  let fx = '', cur = 'SourceGraphic';
  if (look.ambient) {
    const [r, g, b] = hex(look.ambient.color), s = look.ambient.strength, k = v => f3(1 - s + s * v);
    fx += `<feColorMatrix in="SourceGraphic" type="matrix" values="${k(r)} 0 0 0 0  0 ${k(g)} 0 0 0  0 0 ${k(b)} 0 0  0 0 0 1 0" result="base"/>`;
    cur = 'base';
  }
  if (look.key) {
    const { at, z, color, gain, relief = 1.5 } = look.key;
    fx += `<feDiffuseLighting in="SourceAlpha" surfaceScale="${f3(relief)}" diffuseConstant="1" lighting-color="${color}" result="keyL"><fePointLight x="${f(at[0])}" y="${f(at[1])}" z="${f(z)}"/></feDiffuseLighting>`
      + '<feComposite in="keyL" in2="SourceAlpha" operator="in" result="keyIn"/>'
      + `<feComposite in="${cur}" in2="keyIn" operator="arithmetic" k1="${f3(gain)}" k2="1" k3="0" k4="0" result="lit"/>`;
    cur = 'lit';
  }
  if (look.rim) {
    const { dx, dy, color, width, gain } = look.rim;
    fx += `<feOffset in="SourceAlpha" dx="${f(-dx * width)}" dy="${f(-dy * width)}" result="away"/>`
      + '<feComposite in="SourceAlpha" in2="away" operator="out" result="edge"/>'
      + `<feGaussianBlur in="edge" stdDeviation="${f(Math.max(0.3, width * 0.22))}" result="soft"/>`
      + `<feFlood flood-color="${color}"/><feComposite in2="soft" operator="in" result="rimC"/>`
      + `<feComposite in="rimC" in2="${cur}" operator="arithmetic" k1="0" k2="${f3(gain)}" k3="1" k4="0" result="rimmed"/>`
      + '<feComposite in="rimmed" in2="SourceAlpha" operator="in" result="cut"/>';
    cur = 'cut';
  }
  if (look.sepia) fx += `<feColorMatrix in="${cur}" type="matrix" values="${SEPIA}"/>`;
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB">${fx}</filter>`;
}

const lit = (defsMarkup, body, look, box, id) => {
  if (!look) return `<defs>${defsMarkup}</defs>${body}`;
  if (!look.novel) return `<defs>${defsMarkup}${lookFilter(id, look, box)}</defs><g filter="url(#${id})">${body}</g>`;
  return novel(defsMarkup, body, look, box, id);
};

/**
 * The new world's finish on a drawing of the crew (the owner, 16 November 2026: "strong silhouettes, expressive
 * outlines, textured shadows, and worn materials"): the drawing lit as before; behind it a heavy ink silhouette that
 * swells and thins; in its shadow, hatching (the key light's own shadow, cut to the drawing); on its cloth, wear.
 * `look.novel` { outline (units), hatch (units between lines), wear 0..1 }.
 */
function novel(defsMarkup, body, look, box, id) {
  const [x, y, w, h] = box, n = look.novel, R = n.outline ?? 1.4;
  const region = `filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB"`;
  const key = look.key;
  const outline = `<filter id="${id}-ol" ${region}><feMorphology in="SourceAlpha" operator="dilate" radius="${f3(R)}" result="fat"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="${f3(0.09 / Math.max(0.3, R))}" numOctaves="2" seed="4" result="wob"/>`
    + `<feDisplacementMap in="fat" in2="wob" scale="${f3(R * 1.6)}" xChannelSelector="R" yChannelSelector="G" result="fw"/>`
    + `<feFlood flood-color="#06070B"/><feComposite in2="fw" operator="in"/></filter>`;
  // The shadow's mask: where the key light falls away, white; cut to the drawing.
  const shadowF = key ? `<filter id="${id}-sh" ${region}><feDiffuseLighting in="SourceAlpha" surfaceScale="${f3(key.relief ?? 1.5)}" diffuseConstant="1" lighting-color="#fff" result="l"><fePointLight x="${f(key.at[0])}" y="${f(key.at[1])}" z="${f(key.z)}"/></feDiffuseLighting>`
    + '<feColorMatrix in="l" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.6 0 0 0 1.35" result="m"/>'
    + '<feComposite in="m" in2="SourceAlpha" operator="in"/></filter>' : '';
  const gap = n.hatch ?? 2.2;
  const hatch = `<pattern id="${id}-hp" width="${f3(gap)}" height="${f3(gap)}" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V${f3(gap)}" stroke="#0A0C12" stroke-width="${f3(gap * 0.3)}"/></pattern>`
    + `<pattern id="${id}-hp2" width="${f3(gap * 1.3)}" height="${f3(gap * 1.3)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-48)"><path d="M0 0V${f3(gap * 1.3)}" stroke="#0A0C12" stroke-width="${f3(gap * 0.22)}"/></pattern>`;
  const wear = `<filter id="${id}-wr" ${region}><feTurbulence type="fractalNoise" baseFrequency="${f3(1.6 / gap)} ${f3(0.5 / gap)}" numOctaves="2" seed="13" result="t"/>`
    + '<feColorMatrix in="t" type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.88  0 0 0 0 0.8  0 0 0 16 -11.2" result="spk"/>'
    + '<feComposite in="spk" in2="SourceAlpha" operator="in"/></filter>';
  const mask = shadowF ? `<mask id="${id}-mk" maskUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"><use href="#${id}-fig" filter="url(#${id}-sh)"/></mask>` : '';
  const defs = `<defs>${defsMarkup}${lookFilter(id, look, box)}${outline}${shadowF}${hatch}${wear}${mask}</defs>`;
  let out = `<g filter="url(#${id}-ol)"><use href="#${id}-fig"/></g>`
    + `<g filter="url(#${id})"><g id="${id}-fig">${body}</g></g>`;
  if (mask) out += `<g mask="url(#${id}-mk)" opacity="0.5"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}-hp)"/></g>`
    + `<g mask="url(#${id}-mk)" opacity="0.28"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}-hp2)"/></g>`;
  if ((n.wear ?? 0) > 0) out += `<g filter="url(#${id}-wr)" opacity="${f3(n.wear)}"><use href="#${id}-fig"/></g>`;
  return defs + out;
}

/** A look given in the figure's frame, moved into the head's own frame (the head drawn at its joint, CREW_HEAD_SCALE larger). */
export function headLook(look, sk) {
  if (!look) return null;
  const s = CREW_HEAD_SCALE;
  return {
    ...look,
    novel: look.novel && { ...look.novel, wear: 0, outline: look.novel.outline / s, hatch: look.novel.hatch / s },
    key: look.key && { ...look.key, at: [(look.key.at[0] - sk.head[0]) / s, (look.key.at[1] - sk.head[1]) / s], z: look.key.z / s, relief: (look.key.relief ?? 1.5) / s },
    rim: look.rim && { ...look.rim, width: look.rim.width / s },
  };
}

// ── The body ─────────────────────────────────────────────────────────

const BODY_JOINTS = ['neck', 'pelvis', 'sF', 'eF', 'wF', 'sN', 'eN', 'wN', 'hipF', 'kF', 'aF', 'hipN', 'kN', 'aN'];
/** A body's box in the figure's frame: round its joints, with the ink's reach (`legs`: false leaves the legs out). */
export function bodyBox(sk, { legs = true, item = false } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const name of BODY_JOINTS) {
    if (!legs && /^(hip|k|a)/.test(name)) continue;
    const [x, y] = sk[name]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const pad = item ? 26 : 0;
  return [Math.floor(x0 - 22 - pad), Math.floor(y0 - 28 - pad), Math.ceil(x1 - x0 + 46 + 2 * pad), Math.ceil(y1 - y0 + (legs ? 56 : 42) + 2 * pad)];
}

/** The body without its head: SVG markup in the figure's frame for `box`. The far hand is drawn apart (hands below). */
export function bodySvg(sk, { look = null, legs = true, box, character = CHARACTER, kit = false }) {
  const c = CREW[character];
  const cv = inkCanvas('pa-b');
  const parts = { head: () => {} };
  if (kit) {
    parts.torso = (cv2, c2, sk2, b, m, o) => { CREW_PARTS.torso(cv2, c2, sk2, b, m, o); harness(cv2, sk2); };
    parts.armF = (cv2, c2, sk2, b, m, o) => { CREW_PARTS.armF(cv2, c2, sk2, b, m, o); wrap(cv2, sk2.eF, sk2.wF, 0.4); };
  }
  if (!legs) { parts.legF = () => {}; parts.legN = () => {}; }
  drawCrewFigure(cv, c, sk, {}, { parts, shadow: false });
  return lit(cv.defs(), cv.layer('body'), look, box, 'pa-look');
}

// ── The kit: the same crew, in gear worn by use (new drawings) ──────

const mixP = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
/**
 * A utility harness over the suit: a strap from the near shoulder across the chest to the far hip, its buckle and a
 * clipped work-light; a pouch on the belt at the near hip, its flap worn pale. Drawn over the rig's torso, on its joints.
 */
function harness(cv, sk) {
  if (sk.back) return;
  const from = mixP(sk.sN, sk.neck, 0.25), to = mixP(sk.hipF ?? [53, 126], sk.pelvis, 0.15);
  const mid = mixP(from, to, 0.45);
  cv.line([from, mixP(from, to, 0.5), to], { weight: 5.2, color: '#2B231D', taper: 'none' });
  cv.line([mixP(from, to, 0.05), mixP(from, to, 0.95)], { weight: 0.5, color: '#9C8A70', taper: 'none' });
  cv.form([[mid[0] - 3.2, mid[1] - 3.6], [mid[0] + 3.2, mid[1] - 3.6], [mid[0] + 3.2, mid[1] + 3.6], [mid[0] - 3.2, mid[1] + 3.6]], '#8E9BB0', { weight: 1.2, depth: 0.8, rim: false, grain: false, seed: 201, tension: 0.2 });
  const lamp = mixP(from, to, 0.22);
  cv.form([[lamp[0] - 2.4, lamp[1] - 4], [lamp[0] + 2.4, lamp[1] - 4], [lamp[0] + 2.6, lamp[1] + 3.4], [lamp[0] - 2.6, lamp[1] + 3.4]], '#3A4558', { weight: 1.1, depth: 0.6, rim: false, grain: false, seed: 203, tension: 0.3 });
  cv.raw(`<circle cx="${f(lamp[0])}" cy="${f(lamp[1] - 2.2)}" r="1.3" fill="#FFE0A3"/>`);
  const hip = mixP(sk.hipN ?? [71, 126], sk.pelvis, -0.2);
  cv.form([[hip[0] - 5, hip[1] - 4], [hip[0] + 6, hip[1] - 4], [hip[0] + 6.4, hip[1] + 7], [hip[0] - 5.2, hip[1] + 7]], '#5B4A3A', { weight: 1.5, depth: 1.4, rim: false, seed: 205, tension: 0.4 });
  cv.form([[hip[0] - 5.4, hip[1] - 4.6], [hip[0] + 6.6, hip[1] - 4.6], [hip[0] + 5.4, hip[1] + 1.4], [hip[0] - 4.6, hip[1] + 1.4]], '#7A6650', { weight: 1.3, depth: 0.6, rim: false, seed: 207, tension: 0.4 });
}

/** Repair tape wound round a forearm, `at` of the way from elbow to wrist. */
function wrap(cv, e, w, at) {
  const [dx, dy] = [w[0] - e[0], w[1] - e[1]], l = Math.hypot(dx, dy) || 1, n = [-dy / l * 6.4, dx / l * 6.4], u = [dx / l, dy / l];
  for (const k of [at, at + 0.09]) {
    const c = mixP(e, w, k);
    cv.form([[c[0] + n[0] - u[0] * 1.6, c[1] + n[1] - u[1] * 1.6], [c[0] + n[0] + u[0] * 1.6, c[1] + n[1] + u[1] * 1.6], [c[0] - n[0] + u[0] * 1.6, c[1] - n[1] + u[1] * 1.6], [c[0] - n[0] - u[0] * 1.6, c[1] - n[1] - u[1] * 1.6]], '#BFAE8E', { weight: 1, depth: 0.5, rim: false, grain: false, seed: 211, tension: 0.3 });
  }
}

// ── The head ─────────────────────────────────────────────────────────

/** The acting head's box, in its own frame (Mira's traced ink, with room for the hair's swing). */
export const HEAD_BOX = Object.freeze([-28, -34, 80, 80]);

/** The acting head: SVG markup in the head's own frame. */
export function headSvg(face, { look = null } = {}) {
  const cv = inkCanvas('pa-h');
  actingHead(cv, face);
  return lit(stripFace(cv.defs()), cv.layer('body'), look, HEAD_BOX, 'pa-hlook');
}

// ── The hands (new drawings) ─────────────────────────────────────────

/** A hand's box in its own frame: the wrist at 0, 0, the fingers toward +x. */
export const HAND_BOX = Object.freeze([-10, -14, 30, 26]);
const handSize = c => 1.2 * (0.9 + ({ slim: 0.86, regular: 0.94, heavy: 1.2 }[c.build] ?? 0.94) * 0.1);

/**
 * The hands the rig does not have, drawn in its ink at its size: `open` (reaching, the fingers spread and a little
 * curled, the thumb apart), `closing` (the fingers curling in) and the rig's own `fist` (holding). In the hand's own
 * frame, the wrist's end at the origin.
 */
export function handSvg(type, { look = null, character = CHARACTER } = {}) {
  const c = CREW[character];
  const cv = inkCanvas('pa-hand');
  cv.group(`translate(4.4 0) scale(${f3(handSize(c))})`, () => {
    const skin = c.skin;
    if (type === 'open') {
      // Four fingers fanned and reaching, the thumb out below; the palm broad.
      for (const [y0, y1, len, s] of [[-3.2, -6.2, 8.6, 41], [-1.1, -2.6, 9.6, 42], [1.1, 1.1, 9.2, 43], [3.1, 4.6, 7.6, 44]]) {
        cv.form([[4.6, y0 - 1.1], [4.6 + len * 0.6, y1 - 1.2], [4.6 + len, y1 - 0.2], [4.6 + len * 0.98, y1 + 1], [4.6 + len * 0.55, y1 + 1.1], [4.6, y0 + 1.1]], skin, { weight: 1.05, depth: 0.8, rim: false, grain: false, hatch: false, seed: s, tension: 0.6 });
      }
      cv.form([[-1, 3.2], [2.4, 6.6], [5.8, 9.6], [6.6, 8.2], [4, 4.6], [1.6, 2]], skin, { weight: 1.1, depth: 0.8, rim: false, grain: false, hatch: false, seed: 45, tension: 0.7 });
      cv.form([[-4.6, -3.4], [3.6, -4.4], [5.8, -1.6], [5.6, 3.6], [3, 4.8], [-3.4, 4.4], [-5.2, 0.6]], skin, { weight: 1.4, depth: 1.6, rim: false, grain: false, seed: 46 });
      return;
    }
    if (type === 'closing') {
      // The fingers curling round toward the palm, their tips turned back: a hand about to close.
      for (const [y, s] of [[-3, 51], [-1, 52], [1, 53], [3, 54]]) {
        cv.form([[4.4, y - 1.2], [8.4, y - 1.4], [10.4, y + 0.4], [9.6, y + 2.2], [7.6, y + 1.6], [4.4, y + 1]], skin, { weight: 1.05, depth: 0.8, rim: false, grain: false, hatch: false, seed: s, tension: 0.7 });
      }
      cv.form([[-1, 3.2], [2.6, 6], [6, 7.2], [6.4, 5.8], [3.8, 4.2], [1.6, 2]], skin, { weight: 1.1, depth: 0.8, rim: false, grain: false, hatch: false, seed: 55, tension: 0.7 });
      cv.form([[-4.6, -3.4], [3.6, -4.4], [5.8, -1.6], [5.6, 3.6], [3, 4.8], [-3.4, 4.4], [-5.2, 0.6]], skin, { weight: 1.4, depth: 1.6, rim: false, grain: false, seed: 56 });
      return;
    }
    // The rig's fist, closed round the injector's grip.
    cv.form([[-4.4, -3.8], [2.8, -4.8], [6, -1.4], [5.4, 3.6], [0.4, 5.2], [-4.6, 3.6]], skin, { weight: 1.4, depth: 1.6, rim: false, grain: false, seed: 27 });
    cv.line([[1.4, -3.6], [2.8, -0.6], [1.4, 2.8]], { weight: 0.6 });
    cv.line([[3.8, -3], [5, -0.4], [3.8, 2.4]], { weight: 0.6 });
  });
  return lit(cv.defs(), cv.layer('body'), look, HAND_BOX, 'pa-handlook');
}

/** Where the far hand is, in the figure's frame, and its angle (degrees): at the wrist, along the forearm. */
export function handPlace(sk) {
  const [ex, ey] = sk.eF, [wx, wy] = sk.wF, a = Math.atan2(wy - ey, wx - ex);
  return { at: [wx, wy], angle: (a * 180) / Math.PI };
}

// ── The injector ─────────────────────────────────────────────────────

/** The Doctor's injector, as today's film draws it (doctor.mjs, no team colour): its box, grip and glint, in its units. */
export function injector() {
  const g = ROLES.doctor.gadget();
  return { svg: g.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''), box: g.box, grip: g.grip, glint: g.glint };
}

// ── The head in pieces ───────────────────────────────────────────────

/** Where a head's hanging hair hangs from (head.mjs), or null. */
export const hangOf = id => HEADS[id].sway ?? null;

/**
 * The head's traced art, lit: `part` 'upper' (above the hanging hair's line, or the whole head when its hair does not
 * hang) or 'lower' (the hair below the line, which the film swings and lifts as head.mjs does). Mira's is drawn
 * without the brow and mouth the face acting draws. Returns { svg, box } in the head's frame.
 */
export function headPartSvg(id, part, { look = null } = {}) {
  const art = id === FACE_CHARACTER ? stripFace(headArt(id, 'pa-art')) : headArt(id, 'pa-art');
  const y = hangOf(id);
  const [x0, y0, w, h] = HEAD_BOX;
  const box = y == null ? HEAD_BOX : part === 'upper' ? [x0, y0, w, y - y0 + 0.4] : [x0 - 8, y, w + 16, y0 + h - y + 6];
  const clip = `<clipPath id="pa-part"><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"/></clipPath>`;
  // Lit whole, then cut: the cut is not an edge of the head, so it takes no edge light.
  const whole = lit(art, '<use href="#pa-art"/>', look, [x0 - 8, y0, w + 16, h + 6], 'pa-plook');
  return { svg: `<defs>${clip}</defs><g clip-path="url(#pa-part)">${whole}</g>`, box };
}

/** One piece of the face acting, lit (no edge light: a piece's edge is not the head's). */
export function pieceSvg(kind, value, { look = null, id = FACE_CHARACTER } = {}) {
  const cv = inkCanvas(`pa-${kind}`);
  if (kind === 'eyes') eyesPiece(cv, value, id);
  else if (kind === 'brow') browPiece(cv, value);
  else mouthPiece(cv, value);
  const box = PIECE_BOX[kind];
  return { svg: lit(cv.defs(), cv.layer('body'), look && { ...look, rim: null }, box, 'pa-klook'), box };
}

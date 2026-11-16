// The test's drawings as SVG, before they are made into pictures: the body in a pose, the acting head, the new
// hands and the injector, each in the crew's ink (crew-drawing-1.0.0, unchanged) and lit as today's film lights
// its character (an ambient dark, a key light, an edge of light: the films' recipe, kit/cast.mjs), put on as each
// drawing is made, never while the film plays.

import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import { CREW_HEAD_SCALE, CREW_PARTS, drawCrewFigure } from '../../../apps/game/hosted/crew-drawing/figure.mjs';
import { inkCanvas } from '../../../apps/game/hosted/crew-drawing/ink.mjs';
import { ROLES } from '../../../apps/game/hosted/pregame-films/roles/roles.mjs';
import { f, f3 } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { FACE_CHARACTER, actingHead, stripFace } from './face.mjs';

export const CHARACTER = FACE_CHARACTER;
export { CREW_HEAD_SCALE };
const c = CREW[CHARACTER];
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

const lit = (defsMarkup, body, look, box, id) => (look
  ? `<defs>${defsMarkup}${lookFilter(id, look, box)}</defs><g filter="url(#${id})">${body}</g>`
  : `<defs>${defsMarkup}</defs>${body}`);

/** A look given in the figure's frame, moved into the head's own frame (the head drawn at its joint, CREW_HEAD_SCALE larger). */
export function headLook(look, sk) {
  if (!look) return null;
  const s = CREW_HEAD_SCALE;
  return {
    ...look,
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
export function bodySvg(sk, { look = null, legs = true, box }) {
  const cv = inkCanvas('pa-b');
  const parts = { head: () => {} };
  if (!legs) { parts.legF = () => {}; parts.legN = () => {}; }
  drawCrewFigure(cv, c, sk, {}, { parts, shadow: false });
  return lit(cv.defs(), cv.layer('body'), look, box, 'pa-look');
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
const HAND_SIZE = 1.2 * (0.9 + 0.94 * 0.1);

/**
 * The hands the rig does not have, drawn in its ink at its size: `open` (reaching, the fingers spread and a little
 * curled, the thumb apart), `closing` (the fingers curling in) and the rig's own `fist` (holding). In the hand's own
 * frame, the wrist's end at the origin.
 */
export function handSvg(type, { look = null } = {}) {
  const cv = inkCanvas('pa-hand');
  cv.group(`translate(4.4 0) scale(${f3(HAND_SIZE)})`, () => {
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

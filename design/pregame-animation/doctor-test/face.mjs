// The face acting: new drawings in the crew's ink on the approved traced head (crew-drawing-1.0.0, Mira, c8),
// for the pre-game animation test. The traced art is used as it is, except that its near brow and its mouth are
// lifted off so they can act: the brow is the traced brow itself, moved; the mouths are new drawings in the art's
// own ink. The eyes keep the traced whites and lash lines; a look is the traced eye with its pupil drawn again
// where the look puts it, inside the traced opening, under the traced lashes. The lids are the rig's (lidPaths).
//
// New drawings (each listed on the test page):
//   brows   rest (the traced brow), lifted, knit, soft (lifted at the inner end)
//   mouths  closed (the traced mouth), parted, pressed, breath (a small open "o")
//   eyes    the pupils, drawn again for each look: ahead (the traced look), down to the desk, at the injector,
//           up and out, reading (three positions along a line)
//   lids    the rig's lids at any closure, over the new pupils

import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';
import { HEADS, crewHead, lidPaths } from '../../../apps/game/hosted/crew-drawing/head.mjs';
import { INK } from '../../../apps/game/hosted/crew-drawing/ink.mjs';

const f2 = n => (+n).toFixed(2);

/** Mira's traced paths, by their place in heads/mira.mjs, that the face acting uses. */
const MIRA = Object.freeze({
  brow: [16, 124, 153, 84],
  mouth: [45, 105],
  near: { outline: 10, white: [12], lashes: [83, 59, 60, 113, 53], pupil: [1.2, -1.8, 2.0, 3.25], travel: [1.5, 1.35] },
  far: { outline: null, white: [42, 146], lashes: [52, 156, 63], pupil: [-8.45, -2.4, 0.95, 2.85], travel: [0.55, 1.2] },
  browPivot: [4.2, -10.6],
  mouthAt: [-4.75, 9.1],
});

export const FACE_CHARACTER = 'c8';

/** The brows: a transform of the traced brow about its middle (degrees, units). */
export const BROWS = Object.freeze({
  rest: { dx: 0, dy: 0, rotate: 0, sy: 1 },
  lifted: { dx: 0.1, dy: -1.6, rotate: -3, sy: 1.05 },
  knit: { dx: -0.5, dy: 0.9, rotate: 7, sy: 1.08 },
  soft: { dx: -0.2, dy: -0.9, rotate: -8, sy: 1 },
});

/** The mouths: new drawings in the head's frame, about the traced mouth's place. */
export const MOUTHS = Object.freeze(['closed', 'parted', 'pressed', 'breath']);

/** The looks: where each pupil sits, as a share of its travel (-1..1 each way). */
export const LOOKS = Object.freeze({
  ahead: [0, 0],
  desk: [-0.35, 0.9],
  injector: [-0.75, -0.15],
  out: [-0.6, -0.75],
  readL: [-0.75, 0.85],
  readM: [-0.2, 0.9],
  readR: [0.35, 0.85],
  up: [-0.3, -0.55],
});

function pathTag(i) { const [fill, d] = HEADS[FACE_CHARACTER].paths[i]; return `<path fill="${fill}" d="${d}"/>`; }

/** The traced art's markup without the paths the face acting draws itself. */
export function stripFace(defs) {
  let out = defs;
  for (const i of [...MIRA.brow, ...MIRA.mouth]) out = out.split(pathTag(i)).join('');
  return out;
}

function eye(cv, eyeSpec, [lx, ly]) {
  const head = HEADS[FACE_CHARACTER];
  const [cx, cy, rx, ry] = eyeSpec.pupil, [tx, ty] = eyeSpec.travel;
  const open = cv.uid('open');
  const whites = eyeSpec.white.map(i => `<path d="${head.paths[i][1]}"/>`).join('');
  cv.def(`<clipPath id="${open}">${whites}<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx + 0.15)}" ry="${f2(ry + 0.1)}"/></clipPath>`);
  let inner = `<rect x="${f2(cx - 12)}" y="${f2(cy - 12)}" width="24" height="24" fill="${head.paths[eyeSpec.white[0]][0]}"/>`;
  const px = cx + lx * tx, py = cy + ly * ty;
  inner += `<ellipse cx="${f2(px)}" cy="${f2(py)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="#141217"/>`;
  inner += `<ellipse cx="${f2(px + rx * 0.35)}" cy="${f2(py - ry * 0.45)}" rx="${f2(rx * 0.28)}" ry="${f2(ry * 0.16)}" fill="#F9F1DF" opacity="0.9"/>`;
  let out = `<g clip-path="url(#${open})">${inner}</g>`;
  if (eyeSpec.outline != null) {
    const outline = cv.uid('outline');
    cv.def(`<clipPath id="${outline}"><path d="${head.paths[eyeSpec.outline][1]}"/></clipPath>`);
    out = `<g clip-path="url(#${outline})">${out}</g>`;
  }
  cv.raw(out + eyeSpec.lashes.map(pathTag).join(''));
}

function lids(cv, closed, id = FACE_CHARACTER) {
  if (closed <= 0.001) return;
  const head = HEADS[id];
  lidPaths(id, closed).forEach(({ lid, lash }, i) => {
    const [cx, cy, rx, ry] = head.eyes[i];
    const clip = cv.uid('lid');
    cv.def(`<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`);
    cv.raw(`<g clip-path="url(#${clip})"><path d="${lid}" fill="${head.skin}"/><path d="${lash}" fill="none" stroke="${INK}" stroke-width="${f2(Math.max(0.7, ry * 0.3))}" stroke-linecap="round"/></g>`);
  });
}

function brow(cv, name) {
  const b = BROWS[name] ?? BROWS.rest;
  const [px, py] = MIRA.browPivot;
  cv.raw(`<g transform="translate(${f2(px + b.dx)} ${f2(py + b.dy)}) rotate(${f2(b.rotate)}) scale(1 ${f2(b.sy)}) translate(${f2(-px)} ${f2(-py)})">${MIRA.brow.map(pathTag).join('')}</g>`);
}

function mouth(cv, name) {
  const [mx, my] = MIRA.mouthAt;
  const g = inner => cv.raw(`<g transform="translate(${f2(mx)} ${f2(my)})">${inner}</g>`);
  if (name === 'closed' || !name) { cv.raw(MIRA.mouth.map(pathTag).join('')); return; }
  if (name === 'parted') {
    // The lips apart a little: a dark opening, the upper lip's line heavy, a lip below catching the light.
    g(`<path d="M-2.9 -0.3Q-0.6 -0.9 2.6 -0.5Q0.9 1.25 -1.4 1.0Q-2.6 0.7 -2.9 -0.3Z" fill="#2A1514"/>`
      + `<path d="M-3.2 -0.25Q-0.6 -1.05 2.9 -0.45" fill="none" stroke="#0F0E12" stroke-width="0.75" stroke-linecap="round"/>`
      + `<path d="M-1.3 1.55Q0.4 1.85 1.6 1.35" fill="none" stroke="#B97A52" stroke-width="0.55" stroke-linecap="round"/>`);
    return;
  }
  if (name === 'pressed') {
    // Pressed shut: a shorter, straighter line, its corner dug in.
    g(`<path d="M-2.5 0.05Q-0.4 -0.35 2.2 -0.15" fill="none" stroke="#0F0E12" stroke-width="0.85" stroke-linecap="round"/>`
      + `<path d="M2.0 -0.55L2.55 0.15" stroke="#0F0E12" stroke-width="0.5" stroke-linecap="round"/>`
      + `<path d="M-1.2 1.05Q0.3 1.3 1.3 0.95" fill="none" stroke="#C48C5F" stroke-width="0.5" stroke-linecap="round"/>`);
    return;
  }
  if (name === 'breath') {
    // A breath drawn in: a small open "o".
    g(`<ellipse cx="-0.2" cy="0.35" rx="1.25" ry="1.35" fill="#2A1514"/>`
      + `<path d="M-1.45 0.2Q-1.4 -1.05 -0.2 -1.0Q1.0 -1.05 1.05 0.2" fill="none" stroke="#0F0E12" stroke-width="0.7" stroke-linecap="round"/>`
      + `<path d="M-0.9 1.95Q-0.2 2.2 0.6 1.9" fill="none" stroke="#B97A52" stroke-width="0.5" stroke-linecap="round"/>`);
  }
}

/**
 * Mira's head acting, in the head's own frame: `face` { look: LOOKS key or [x, y], lids 0..1, brow: BROWS key,
 * mouth: MOUTHS entry, sway, lift } (sway and lift: the hanging hair's follow-through, head.mjs). Returns the
 * markup for an ink canvas's body and the defs to keep (the traced art without its brow and mouth).
 */
export function actingHead(cv, face = {}) {
  const c = CREW[FACE_CHARACTER];
  crewHead(cv, c, 'front', { blink: 0, sway: face.sway ?? 0, lift: face.lift ?? 0 });
  const look = Array.isArray(face.look) ? face.look : LOOKS[face.look ?? 'ahead'];
  if (face.look && face.look !== 'ahead') { eye(cv, MIRA.far, look); eye(cv, MIRA.near, look); }
  lids(cv, face.lids ?? 0);
  brow(cv, face.brow ?? 'rest');
  mouth(cv, face.mouth ?? 'closed');
}

/** A stable key for a face: the same face is drawn once. */
export const faceKey = face => [face.look ?? 'ahead', (face.lids ?? 0).toFixed(2), face.brow ?? 'rest', face.mouth ?? 'closed', (face.sway ?? 0).toFixed(1), (face.lift ?? 0).toFixed(1)].join('|');

// ── The face in pieces: each its own small picture, laid over the head's traced art as the film plays ──

/** The eyes: the look (pupils drawn again) and the lids. For a character without face drawings, the lids alone. */
export function eyesPiece(cv, { look = 'ahead', lids: closed = 0 } = {}, id = FACE_CHARACTER) {
  if (id === FACE_CHARACTER && look !== 'ahead') {
    const at = Array.isArray(look) ? look : LOOKS[look];
    eye(cv, MIRA.far, at); eye(cv, MIRA.near, at);
  }
  lids(cv, closed, id);
}
export const browPiece = (cv, name) => brow(cv, name);
export const mouthPiece = (cv, name) => mouth(cv, name);
/** Each piece's box in the head's frame. */
export const PIECE_BOX = Object.freeze({ eyes: [-14, -10, 28, 15], brow: [-5, -17, 20, 12], mouth: [-11, 5, 11, 9] });

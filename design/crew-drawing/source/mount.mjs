// mothership:dev-only
//
// Mounting the crew's figures cheaply (DSN-REQ-17, docs/design/crew-drawing-release.md). A figure is
// 93 to 124 KB of SVG, 30 to 62 KB of it the traced head; rebuilding every figure every frame is
// too slow for a phone. Three things make it cheap, none of them changing the drawing:
// 1. The art once per page: crewArtDefs() places the traced heads once, in a hidden SVG; figures
//    drawn with art: { ref } use them by reference (<use href>), so each figure is 30 to 62 KB less.
//    A page with several documents (shadow roots, iframes, images) needs it in each document; a
//    figure whose SVG text is rewritten afterwards (the films' memorial, halftone and outline
//    effects) keeps its art inline, the default.
// 2. A pose once: poseKey() names a figure's drawing (character, outfit, layer, the skeleton and
//    the options that change markup). Figures with the same key draw the same markup but for their
//    ids' prefix, so a pose (a gesture held in a place, or one of a walk's phases) is drawn once,
//    with its own prefix per mounted instance.
// 3. What moves, by attributes: a figure drawn with live: true carries data-crew-head,
//    data-crew-lid, data-crew-lash and data-crew-hang hooks; crewFrame() gives their values for a
//    frame (the head's place and drift, the lids, the hanging hair) and applyCrewFrame() sets them.
//    Blinks, the idle drift and the hair's follow-through then never rebuild the figure.

import { CREW, CREW_ORDER, crewMember } from './crew.mjs';
import { headTransform } from './figure.mjs';
import { hangTransform, headArt, lidPaths } from './head.mjs';

/**
 * The traced heads, placed once in a document: a hidden SVG with each head's art in its defs, as
 * `${ref}-${id}`. Draw figures with art: { ref } to use it. ids: the characters on the page.
 */
export function crewArtDefs({ ref = 'crew-art', ids = CREW_ORDER } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${ids.map(id => headArt(id, `${ref}-${id}`)).join('')}</defs></svg>`;
}

/** A skeleton's own text, numbers rounded to a hundredth, keys in order: two skeletons that draw alike read alike. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${k}:${canonical(value[k])}`).join(',')}}`;
  if (typeof value === 'number') return (Math.round(value * 100) / 100).toString();
  return JSON.stringify(value ?? null);
}

/** A short, stable digest of a text (FNV-1a, 32 bits, twice): a cache key, not a security hash. */
function digest(text) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

/**
 * The key of a figure's drawing: equal keys, equal markup but for the prefix. options: the
 * dressedFigureSvg options that change markup (outfit, layer, inline, art, live). The head's motion
 * is not in it: with live, a frame changes attributes, not markup.
 */
export function poseKey(c, sk, { outfit = 'crew', layer = 'body', inline = true, art = null, live = false } = {}) {
  const who = crewMember(c);
  return `${who.id}|${outfit}|${layer}|${inline ? 'i' : 'f'}|${art?.ref ?? '-'}|${live ? 'l' : 's'}|${digest(canonical(sk))}`;
}

/**
 * The values of one frame for a live figure: { head, lids, hang }. head: the head group's
 * transform (the skeleton's head, its tilt, the drift); lids: each eye's lid and lash path (none
 * for Echo); hang: the hanging hair's transform, or null. motion: crewMotion()'s { blink, sway,
 * lift, drift }. A skeleton looking down keeps its lids shut.
 */
export function crewFrame(c, sk, motion = {}) {
  const { id } = crewMember(c);
  const view = sk.view ?? 'front';
  const closed = view === 'down' ? 1 : (motion.blink ?? 0);
  return {
    head: headTransform(sk, motion.drift),
    lids: view === 'back' ? [] : lidPaths(id, closed),
    hang: view === 'back' ? null : hangTransform(id, motion.sway ?? 0, motion.lift ?? 0),
  };
}

/**
 * Sets a frame on a mounted live figure: root is its SVG element (or anything with querySelector
 * and setAttribute). Each mounted layer (body, front) is its own root; a hook it lacks is skipped.
 * Returns how many attributes were set.
 */
export function applyCrewFrame(root, frame) {
  let set = 0;
  const put = (selector, name, value) => {
    const el = root.querySelector(selector);
    if (el && value != null) { el.setAttribute(name, value); set += 1; }
  };
  put('[data-crew-head]', 'transform', frame.head);
  frame.lids.forEach(({ lid, lash }, i) => {
    put(`[data-crew-lid="${i}"]`, 'd', lid);
    put(`[data-crew-lash="${i}"]`, 'd', lash);
  });
  put('[data-crew-hang]', 'transform', frame.hang);
  return set;
}

/** Every character's id, for a page's crewArtDefs. */
export const CREW_IDS = Object.freeze(Object.keys(CREW));

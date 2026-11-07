// mothership:dev-only
//
// Mounting the crew's figures (DSN-REQ-17, docs/design/crew-drawing-release.md). A figure is 60 to
// 125 KB of SVG, 30 to 62 KB of it the traced head. A figure is mounted once and then changed in
// place, and nothing here changes the drawing:
// 1. The art once per document: crewArtDefs() places the traced heads once, in a hidden SVG;
//    figures drawn with art: { ref } use them by reference (<use href>). A document with several
//    roots (shadow roots, iframes) needs it in each; a figure whose SVG text is rewritten
//    afterwards (the films' memorial, halftone and outline effects) keeps its art inline.
// 2. Mount: a figure's markup, drawn with its own prefix (or a template drawn once under
//    CANONICAL_PREFIX and given its prefix by withPrefix). poseKey() names a drawing exactly (equal
//    keys, equal markup), for a bounded template cache of placed poses; a continuously sampled
//    skeleton is never cached.
// 3. Every frame, attributes only, on the mounted elements:
//    - the same skeleton (a figure in its place): crewFrame() and applyCrewFrame() set the head's
//      place and drift, the lids, the hanging hair and, from behind, the back of Mira's hair and
//      Echo's locs;
//    - a moving skeleton (the rig's walk, an exit or an arrival, sampled continuously):
//      crewPoseFrame() draws the pose and applyCrewPose() sets, on the same elements, every
//      attribute that differs (limbs, torso, clothes, shading, head). The traced art is never
//      redrawn, ids never change, and no element is made. When the pose's structure changes
//      (once, at a blend's middle, where the rig switches what cannot be blended), applyCrewPose
//      returns -1 and the figure is mounted again.
// The result of either equals a fresh draw of the same pose and motion (tested).

import { CREW, CREW_ORDER, crewMember } from './crew.mjs';
import { headTransform } from './figure.mjs';
import { backHairPaths, hangTransform, headArt, lidPaths } from './head.mjs';
import { dressedFigureSvg } from './wardrobe.mjs';

/**
 * The traced heads, placed once in a document: a hidden SVG with each head's art in its defs, as
 * `${ref}-${id}`. Draw figures with art: { ref } to use it. ids: the characters on the page.
 */
export function crewArtDefs({ ref = 'crew-art', ids = CREW_ORDER } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${ids.map(id => headArt(id, `${ref}-${id}`)).join('')}</defs></svg>`;
}

// ---------- Prefixes: one per mounted instance and layer ----------

/** The prefix a template is drawn under, to be given each mounted instance's own by withPrefix. */
export const CANONICAL_PREFIX = 'crew-pose';
const PREFIX = /^[A-Za-z][\w-]*$/;

/**
 * A figure's markup under another prefix: every id it defines and every reference to one
 * (url(#…), href="#…") together. Shared art (art.ref) is not renamed. A template drawn once under
 * CANONICAL_PREFIX becomes each instance's own; the result equals drawing it under that prefix.
 */
export function withPrefix(markup, prefix, from = CANONICAL_PREFIX) {
  if (!PREFIX.test(prefix) || !PREFIX.test(from)) throw new Error(`Not an id prefix: ${prefix}`);
  return markup.split(`id="${from}-`).join(`id="${prefix}-`).split(`#${from}-`).join(`#${prefix}-`);
}

// ---------- Pose keys: for a bounded cache of placed poses ----------

/** A value's own text, keys in order and numbers exact: two values that read alike are alike, so they draw alike. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${k}:${canonical(value[k])}`).join(',')}}`;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value ?? null);
}

/** The head's motion as the drawing reads it, absent parts as their neutral values. */
const motionOf = (motion = {}) => {
  const drift = motion.drift ?? {};
  return { blink: motion.blink ?? 0, sway: motion.sway ?? 0, lift: motion.lift ?? 0, drift: { dx: drift.dx ?? 0, dy: drift.dy ?? 0, tilt: drift.tilt ?? 0 } };
};

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
 * The key of a drawing: equal keys, equal markup but for the prefix. options: every
 * dressedFigureSvg option that changes markup, the head's motion included (a still drawing bakes
 * its blink, sway, lift and drift in). For a cache of templates of the poses a board holds (a
 * gesture in a place), bounded and cleared with the board; never for a continuously sampled
 * skeleton (a walk, a blend), which crewPoseFrame updates in place. A live template is drawn with
 * no motion and keyed so; once mounted, its frames (crewFrame, crewPoseFrame) set the motion.
 */
export function poseKey(c, sk, { outfit = 'crew', layer = 'body', inline = true, header = '', art = null, live = false, motion = {} } = {}) {
  const who = crewMember(c);
  const file = inline ? 'i' : `f${digest(header)}`;
  return `${who.id}|${outfit}|${layer}|${file}|${art?.ref ?? '-'}|${live ? 'l' : 's'}|${digest(canonical(sk))}|${digest(canonical(motionOf(motion)))}`;
}

// ---------- The same skeleton: the head's own motion ----------

/**
 * The values of one frame for a live figure in its place: { head, lids, hang, backHair }. head:
 * the head group's transform (the skeleton's head, its tilt, the drift); lids: each eye's lid and
 * lash path (none for Echo, none from behind); hang: the hanging hair's transform, or null;
 * backHair: from behind, the back of Mira's hair or Echo's locs, path by path. motion:
 * crewMotion()'s { blink, sway, lift, drift }. A skeleton looking down keeps its lids lowered.
 */
export function crewFrame(c, sk, motion = {}) {
  const who = crewMember(c);
  const view = sk.view ?? 'front';
  const back = view === 'back';
  const closed = view === 'down' ? 1 : (motion.blink ?? 0);
  return {
    head: headTransform(sk, motion.drift),
    lids: back ? [] : lidPaths(who.id, closed),
    hang: back ? null : hangTransform(who.id, motion.sway ?? 0, motion.lift ?? 0),
    backHair: back ? backHairPaths(who, motion) : [],
  };
}

/**
 * Sets a frame on a mounted live drawing: root is its SVG element (or anything with querySelector
 * and setAttribute). Each mounted layer (body, front) is its own root; a hook it lacks is skipped.
 * A figure's frame (crewFrame) sets a figure's head; a portrait's (portrait.mjs crewPortraitFrame)
 * sets a portrait's, so neither moves the other's. Returns how many attributes were set.
 */
export function applyCrewFrame(root, frame) {
  let set = 0;
  const put = (selector, name, value) => {
    if (value == null) return;
    const el = root.querySelector(selector);
    if (el) { el.setAttribute(name, value); set += 1; }
  };
  put('[data-crew-head]', 'transform', frame.head);
  put('[data-crew-portrait-head]', 'transform', frame.portraitHead);
  (frame.lids ?? []).forEach(({ lid, lash }, i) => {
    put(`[data-crew-lid="${i}"]`, 'd', lid);
    put(`[data-crew-lash="${i}"]`, 'd', lash);
  });
  put('[data-crew-hang]', 'transform', frame.hang);
  (frame.backHair ?? []).forEach((d, i) => put(`[data-crew-back-hair="${i}"]`, 'd', d));
  return set;
}

// ---------- A moving skeleton: the pose itself, in place ----------

const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
const ATTR = /([\w:-]+)="([^"]*)"/g;

/** The elements below a figure's root in its SVG text, in document order, as [tag, [[name, value], ...]], passing over its own traced art. */
function elementsOf(svg) {
  const out = [];
  let depth = 0, skip = -1, root = true;
  for (const [, close, tag, attrs, self] of svg.matchAll(TAG)) {
    if (close) { depth -= 1; if (skip === depth) skip = -1; continue; }
    if (root) { root = false; depth += 1; continue; }
    if (skip === -1) {
      const list = [];
      for (const [, name, value] of attrs.matchAll(ATTR)) list.push([name, value]);
      out.push([tag, list]);
      if (!self && list.some(([name]) => name === 'data-crew-art')) skip = depth;
    }
    if (!self) depth += 1;
  }
  return out;
}

const shapeOf = elements => elements.map(([tag, list]) => `${tag} ${list.map(([name]) => name).join(' ')}`).join('|');

/**
 * A pose for a mounted live figure: every element's attributes as a fresh draw of the skeleton
 * gives them, below the root and past the traced art, in document order, with the pose's shape
 * (its elements' names and attribute names). Draw it with the mounted figure's own prefix,
 * outfit, layer and art; the traced art itself is never drawn again (an inline head is drawn as
 * its mark alone). sk: any skeleton, sampled continuously (the rig's walkPose, sample of an exit
 * or an arrival). motion: crewMotion()'s, as for crewFrame.
 */
export function crewPoseFrame(c, sk, { outfit = 'crew', layer = 'body', prefix, art = null, motion = {} } = {}) {
  if (!prefix) throw new Error('crewPoseFrame needs the mounted figure\'s prefix');
  const drawn = dressedFigureSvg(c, sk, { outfit, layer, prefix, art: art?.ref ? art : { shell: true }, live: true, motion });
  const elements = elementsOf(drawn);
  return { shape: shapeOf(elements), elements };
}

/** Each mounted root's elements (past the traced art) and their shape, read once. Weak: a root no longer mounted is forgotten with it. */
const MOUNTED = new WeakMap();
function mountedElements(root) {
  let entry = MOUNTED.get(root);
  if (!entry) {
    const els = [];
    let art = null;
    for (const el of root.getElementsByTagName('*')) {
      if (art && art.contains(el)) continue;
      els.push(el);
      if (el.hasAttribute('data-crew-art')) art = el;
    }
    entry = { els, shape: els.map(el => `${el.tagName} ${[...el.attributes].map(a => a.name).join(' ')}`).join('|') };
    MOUNTED.set(root, entry);
  }
  return entry;
}

/**
 * Sets a pose (crewPoseFrame) on a mounted live figure, root being its SVG element: on the same
 * elements, each attribute that differs. Returns how many were set, or -1 when the mounted
 * figure's shape is not the pose's (the rig switched what cannot be blended): mount it again.
 */
export function applyCrewPose(root, pose) {
  const { els, shape } = mountedElements(root);
  if (shape !== pose.shape) return -1;
  let set = 0;
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i];
    for (const [name, value] of pose.elements[i][1]) {
      if (el.getAttribute(name) !== value) { el.setAttribute(name, value); set += 1; }
    }
  }
  return set;
}

/** Every character's id, for a page's crewArtDefs. */
export const CREW_IDS = Object.freeze(Object.keys(CREW));

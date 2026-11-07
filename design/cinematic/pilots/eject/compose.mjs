// mothership:dev-only
//
// The EJECT cut's composition: film.mjs's frame at t drawn as one 1920 x 1080 SVG, every picture
// S7's own (design/board-v2/fx/captain.mjs, unchanged) on one of three sets:
//   console   the Captain's console close up (the console, the EJECT plate, its cover, the glove,
//             the click), in the display's own units
//   wall      the Jail's scene (the approved back picture, design/board-motion/assets/scenes), with
//             S7's door and hatch over it and the prisoners drawn by the approved rig in their
//             prison clothes; the living taken as ink silhouettes with a paper rim, bodies as grey
//             cut-outs (S7's rule: nothing graphic, nothing of a side)
//   exterior  S7's hull picture, the silhouettes drifting away from its hatch
// The words (the plate's EJECT, the USED stamp, the client's captainWords) are never drawn here:
// words() says where a stage puts them as page text, so they stay the client's and translatable.
// The insert is the exterior with the hatch's light and the loose things alone: no person, no word.

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { AIRLOCK, CAPTAIN, CONSOLE, COVER, EXTERIOR, GLOVE, PLATE, airlockSvg, clickSvg, consoleSvg, coverSvg, debrisSvg, exteriorSvg, gloveSvg, jailDoorSvg, plaqueSvg, plateSvg, suctionSvg } from '../../../board-v2/fx/captain.mjs';
import { BODY_MIDDLE, EJECT_FILM, pullToHatch } from '../../../board-v2/films/captain.mjs';
import { ejectPose } from '../../../board-v2/figures/captain.mjs';
import { slotsOf } from '../../../board-v2/scenes/slots.mjs';
import { fxDefs, letterbox, vignette } from '../../lib/comic.mjs';
import { compose, figureItems, placeSvg, scenePicture, scopeIds } from '../../lib/scene.mjs';
import { SETS, cameraView, cutFrame, insertFrame } from './film.mjs';

const f = v => Number((+v).toFixed(2));
const INK = '#151923', PAPER = '#F4EBDD';

/** The console set's layout (display units): the console at 6x, its EJECT plate and the plate's button. */
export const CONSOLE_SET = (() => {
  const s = 6;
  const box = [960 - (CONSOLE.w * s) / 2, 300, CONSOLE.w * s, CONSOLE.h * s];
  const plate = [box[0] + CONSOLE.plate[0] * s, box[1] + CONSOLE.plate[1] * s];
  return Object.freeze({ s, box: Object.freeze(box), plate: Object.freeze(plate), button: Object.freeze([plate[0] + PLATE.button[0] * s, plate[1] + PLATE.button[1] * s]), label: Object.freeze([plate[0] + PLATE.label.x * s, plate[1] + PLATE.label.y * s, PLATE.label.w * s, PLATE.label.h * s]) });
})();

/** A picture stretched over a box (its own viewBox, no aspect kept), its ids scoped so two copies never share one. */
const stretch = (svg, [x, y, w, h], opacity = 1, scope = '') => {
  const view = /viewBox="([^"]+)"/.exec(svg)[1];
  const inner = scopeIds(svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), scope);
  return `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="${view}" preserveAspectRatio="none"${opacity < 1 ? ` opacity="${f(opacity)}"` : ''}>${inner}</svg>`;
};

/** The cut's own defs: the silhouette (ink with a paper rim) and the grey cut-out, and the emergency light's wash. */
function cutDefs(p) {
  return `<defs><filter id="${p}-sil" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">`
    + `<feMorphology in="SourceAlpha" operator="dilate" radius="0.6" result="grow"/><feFlood flood-color="${PAPER}"/><feComposite in2="grow" operator="in" result="rim"/>`
    + `<feFlood flood-color="${INK}"/><feComposite in2="SourceAlpha" operator="in" result="body"/><feMerge><feMergeNode in="rim"/><feMergeNode in="body"/></feMerge></filter>`
    + `<filter id="${p}-cut" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="0.45" intercept="0.45"/><feFuncG type="linear" slope="0.45" intercept="0.47"/><feFuncB type="linear" slope="0.45" intercept="0.52"/></feComponentTransfer></filter>`
    + `<radialGradient id="${p}-alarm" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${CAPTAIN.redGlow}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${CAPTAIN.red}" stop-opacity="0.8"/><stop offset="1" stop-color="${CAPTAIN.redDeep}"/></radialGradient>`
    + `<linearGradient id="${p}-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CAPTAIN.dark}"/><stop offset="1" stop-color="${CAPTAIN.navy}"/></linearGradient></defs>`;
}

/** S7's emergency light: its wash multiplied over the set at S7's opacity (a slow pulse under 2 Hz between low values), as the board draws it. */
const wash = (p, [w, h], opacity) => (opacity > 0 ? `<rect width="${w}" height="${h}" fill="url(#${p}-alarm)" opacity="${f(opacity)}" style="mix-blend-mode:multiply"/>` : '');

// ---------- the console ----------

/** The console close up, in display units: S7's inset parts at its beat, at 6x. */
export function consoleSet(inset, { prefix, emergency = 0 }) {
  const { s, box, plate, button } = CONSOLE_SET;
  const parts = [`<rect width="1920" height="1080" fill="url(#${prefix}-steel)"/>`, stretch(consoleSvg(), box, 1, `${prefix}-console`)];
  parts.push(stretch(plateSvg('eject', inset.plate), [plate[0], plate[1], PLATE.w * s, PLATE.h * s], 1, `${prefix}-plate`));
  if (inset.cover) parts.push(stretch(coverSvg(inset.cover), [plate[0] + COVER.at[0] * s, plate[1] + COVER.at[1] * s, COVER.w * s, COVER.h * s], 1, `${prefix}-cover`));
  if (inset.click) {
    const side = 80 * s * inset.click.scale;
    parts.push(stretch(clickSvg(), [button[0] - side / 2, button[1] - side / 2, side, side], inset.click.opacity, `${prefix}-click`));
  }
  if (inset.glove) {
    const tip = [button[0] + inset.glove.lift * 14 * s, button[1] + inset.glove.lift * 30 * s];
    parts.push(stretch(gloveSvg(), [tip[0] - GLOVE.tip[0] * s, tip[1] - GLOVE.tip[1] * s, GLOVE.w * s, GLOVE.h * s], inset.glove.opacity, `${prefix}-glove`));
  }
  parts.push(wash(prefix, [1920, 1080], emergency));
  return parts.join('');
}

// ---------- the wall: the Jail with S7's door and hatch ----------

const DEBRIS_PATHS = Object.freeze([{ kind: 'paper', from: [700, 600], spin: 540, delay: 0 }, { kind: 'cup', from: [600, 660], spin: -420, delay: 0.15 }, { kind: 'paper', from: [430, 560], spin: 720, delay: 0.3 }]);

/** A subject's figure items at its state (S7's ejectPerson()), in the Jail's scene units. */
function subjectItems(subject, person, index, { prefix }) {
  const { slot, character } = subject;
  if (!slot || person.state === 'gone') return [];
  const base = skeletonOf(subject.body ? slot.down : slot.gesture);
  const own = { character, outfit: 'prison', at: slot.at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix: `${prefix}${subject.seat}` };
  if (subject.body) {
    const items = figureItems({ ...own, sk: base, opacity: person.state === 'dissolve' ? 1 - person.v : 1 });
    if (person.state !== 'dissolve') return items;
    return items.map(item => ({ ...item, svg: `<g filter="url(#${prefix}-cut)" transform="translate(0 ${f(-person.v * 40)})">${item.svg}</g>` }));
  }
  if (person.state === 'jail') return figureItems({ ...own, sk: base });
  if (person.state === 'startle') return figureItems({ ...own, sk: ejectPose(base, { startled: person.v }) });
  if (person.state === 'brace') {
    const toward = AIRLOCK.c[0] > slot.at[0];
    const lean = (toward ? 1 : -1) * (person.lean ?? 0) * 10;
    return figureItems({ ...own, sk: ejectPose(base, { braced: person.v }), mirror: toward })
      .map(item => ({ ...item, svg: lean ? `<g transform="rotate(${f(lean)} ${f(slot.at[0])} ${f(slot.at[1])})">${item.svg}</g>` : item.svg }));
  }
  // Pulled: a tumbling ink silhouette with a paper rim, shrinking into the hatch.
  const pull = pullToHatch(slot, person.v, index);
  const middle = [pull.at[0], pull.at[1] - BODY_MIDDLE * pull.scale];
  return figureItems({ ...own, sk: ejectPose(base, { tumbling: Math.min(1, person.v * 3) }), at: pull.at, scale: pull.scale, mirror: false, depth: 700 })
    .map(item => ({ ...item, z: 1400 + item.z / 1000, svg: `<g filter="url(#${prefix}-sil)" opacity="${f(pull.opacity)}" transform="rotate(${pull.turn} ${f(middle[0])} ${f(middle[1])})">${item.svg}</g>` }));
}

/** The Jail at S7's frame, in its scene units: the back, the door, the hatch, the people, the air, the plaque. */
export function wallSet(s7, { subjects, assets, prefix, still = false }) {
  const items = [scenePicture(`${assets}/jail.back.svg`, 0)];
  items.push({ z: 1, svg: placeSvg(jailDoorSvg({ ...s7.door, prefix: `${prefix}d` }), { x: 340, y: 60, width: 480, height: 330 }) });
  if (s7.airlock.reveal > 0) items.push({ z: 2, svg: placeSvg(airlockSvg({ ...s7.airlock, prefix: `${prefix}a` }), { x: AIRLOCK.box[0], y: AIRLOCK.box[1], width: AIRLOCK.box[2], height: AIRLOCK.box[3], opacity: s7.airlock.reveal }) });
  let living = 0;
  subjects.forEach((subject, i) => {
    items.push(...subjectItems(subject, s7.people[i], subject.body ? 0 : living, { prefix }));
    if (!subject.body) living += 1;
  });
  if (!still && s7.suction.opacity > 0) items.push({ z: 1450, svg: stretch(suctionSvg(s7.suction.frame), [0, 0, 1024, 768], s7.suction.opacity, `${prefix}-suction`) });
  if (!still && s7.debris.opacity > 0) {
    for (const [i, item] of DEBRIS_PATHS.entries()) {
      const v = Math.max(0, Math.min(1, (s7.debris.v - item.delay) / (1 - item.delay)));
      if (v <= 0 || v >= 1) continue;
      const u = v * v;
      const [x, y] = [item.from[0] + (AIRLOCK.c[0] - item.from[0]) * u, item.from[1] + (AIRLOCK.c[1] - item.from[1]) * u - Math.sin(Math.PI * u) * 60];
      const side = 34 * (1 - 0.6 * u);
      items.push({ z: 1495 + i / 10, svg: `<g transform="rotate(${Math.round(item.spin * u)} ${f(x)} ${f(y)})">${stretch(debrisSvg(item.kind), [x - side / 2, y - side / 2, side, side], s7.debris.opacity, `${prefix}-debris${i}`)}</g>` });
    }
  }
  if (s7.plaque > 0) items.push({ z: 1600, svg: stretch(plaqueSvg(), [AIRLOCK.c[0] - 30, AIRLOCK.c[1] - 30, 60, 60], s7.plaque, `${prefix}-plaque`) });
  items.push({ z: 2990, svg: wash(prefix, [1024, 768], s7.emergency) });
  return compose(items);
}

// ---------- the exterior ----------

/** The hull from outside, in its units: the picture, and the living drifting away from the hatch as silhouettes. */
export function exteriorSet(s7, { subjects, prefix }) {
  const parts = [scopeIds(exteriorSvg().replace(/^[\s\S]*?<svg[^>]*>/, '<g>').replace(/<\/svg>\s*$/, '</g>'), `${prefix}-ext`)];
  const drifting = subjects.filter(s => !s.body);
  const [hx, hy] = EXTERIOR.hatch;
  drifting.forEach((subject, i) => {
    const v = Math.max(0, Math.min(1, s7.exterior.drift * 1.15 - i * 0.08));
    const angle = -1.45 + (drifting.length > 1 ? (i * 1.3) / (drifting.length - 1) : 0.65);
    const reach = 24 + (110 + 18 * (i % 2)) * v;
    const unit = 0.24 * (1 - 0.4 * v);
    const at = [hx + Math.cos(angle) * reach, hy + Math.sin(angle) * reach + BODY_MIDDLE * unit];
    const middle = [at[0], at[1] - BODY_MIDDLE * unit];
    const turn = Math.round((i % 2 ? -1 : 1) * (40 + 160 * v));
    const items = figureItems({ character: subject.character, sk: ejectPose(skeletonOf('stand'), { tumbling: 1 }), outfit: 'prison', at, scale: unit, mirror: i % 2 === 1, depth: 0, prefix: `${prefix}x${subject.seat}` });
    parts.push(`<g filter="url(#${prefix}-sil)" transform="rotate(${turn} ${f(middle[0])} ${f(middle[1])})">${items.map(item => item.svg).join('')}</g>`);
  });
  return parts.join('');
}

/** The insert's exterior: the hull, the hatch's light rising, the loose things leaving it. Nothing of a person. */
export function insertSet(frame, { prefix }) {
  const [hx, hy] = EXTERIOR.hatch;
  const parts = [scopeIds(exteriorSvg().replace(/^[\s\S]*?<svg[^>]*>/, '<g>').replace(/<\/svg>\s*$/, '</g>'), `${prefix}-ext`)];
  if (frame.glow > 0) parts.push(`<circle cx="${hx}" cy="${hy}" r="${f(EXTERIOR.r * (1 + 0.5 * frame.glow))}" fill="${CAPTAIN.redGlow}" opacity="${f(0.22 * frame.glow)}"/>`);
  const loose = [{ kind: 'paper', angle: -1.2, reach: 150, spin: 500 }, { kind: 'cup', angle: -0.55, reach: 130, spin: -380 }, { kind: 'paper', angle: -1.75, reach: 120, spin: 640 }];
  loose.forEach((item, i) => {
    const v = Math.max(0, Math.min(1, frame.debris * 1.2 - i * 0.1));
    if (v <= 0 || v >= 1) return;
    const [x, y] = [hx + Math.cos(item.angle) * item.reach * v, hy + Math.sin(item.angle) * item.reach * v];
    const side = 18 * (1 - 0.5 * v);
    parts.push(`<g transform="rotate(${Math.round(item.spin * v)} ${f(x)} ${f(y)})">${stretch(debrisSvg(item.kind), [x - side / 2, y - side / 2, side, side], 1 - v * v, `${prefix}-loose${i}`)}</g>`);
  });
  return parts.join('');
}

// ---------- the cut ----------

/** A set's content under its camera, for a display of width x height. */
const shoot = (content, camera, { width, height }) => `<g transform="translate(${f(width / 2)} ${f(height / 2)}) scale(${f(camera.k)}) translate(${f(-camera.center[0])} ${f(-camera.center[1])})">${content}</g>`;

/**
 * The subjects of a review fixture for the composition: each subject's slot (the Jail's table for
 * the roster) and character (from the snapshot before), in S7's slot order.
 */
export function castOf(outcome, roster) {
  const slots = new Map(slotsOf('jail', roster).map(slot => [slot.id, slot]));
  const seats = new Map(outcome.before.map(seat => [seat.seat, seat]));
  return outcome.subjects.map(subject => ({ seat: subject.seat, body: subject.body, slot: slots.get(subject.from), character: seats.get(subject.seat).character }));
}

/** The set a frame shows, as SVG content in that set's units. */
function setContent(set, s7, { cast, assets, prefix, still }) {
  if (set === 'console') return consoleSet(s7.inset.opacity > 0 ? s7.inset : { plate: 'pressed', cover: 'open', click: null, glove: null }, { prefix, emergency: s7.emergency });
  if (set === 'wall') return wallSet(s7, { subjects: cast, assets, prefix, still });
  return exteriorSet(s7, { subjects: cast, prefix });
}

/**
 * The cut at t: { svg, frame, words }. words: where a stage puts the page text, in display pixels:
 * the plate's word (EJECT) on the console shots, the USED stamp on the closing inset, and whether the
 * client's captainWords may show (in the lower letterbox, from S7's announce).
 */
export function cutSvg(t, { cast, assets, variant = 'full', width = 1920, height = 1080 }) {
  const prefix = 'ej';
  const frame = cutFrame(t, { reduced: variant === 'reduced', subjects: cast });
  const bars = f(frame.letterbox * height);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="eject-cut" data-shot="${frame.shot ?? 'none'}" data-t="${t}">`;
  if (!frame.set) return { svg: `${head}<rect width="${width}" height="${height}" fill="#05070B"/></svg>`, frame, words: null };
  const still = variant === 'reduced';
  let body = shoot(setContent(frame.set, frame.s7, { cast, assets, prefix, still }), frame.camera, { width, height });
  // A reduced still fades in over the one before it (S7's 80 ms), never moving.
  if (still && frame.s7.fade < 1) {
    const stages = EJECT_FILM.reduced.stages;
    const index = stages.indexOf(frame.shot);
    if (index > 0) {
      const before = cutFrame(EJECT_FILM.reduced.fadeMs + index * EJECT_FILM.reduced.holdMs - 1, { reduced: true, subjects: cast });
      body = shoot(setContent(before.set, before.s7, { cast, assets, prefix: `${prefix}b`, still }), before.camera, { width, height }) + `<g opacity="${f(frame.s7.fade)}">${body}</g>`;
    }
  }
  // The closing inset: the console's final panel (EJECT used, cover shut) over the wall's last beats.
  let inset = '';
  const words = { plate: null, stamp: null, caption: frame.words, bars };
  if (frame.set === 'console') {
    const [lx, ly, lw, lh] = CONSOLE_SET.label;
    const k = frame.camera.k, [cx, cy] = frame.camera.center;
    words.plate = { word: 'EJECT', box: [f(width / 2 + (lx - cx) * k), f(height / 2 + (ly - cy) * k), f(lw * k), f(lh * k)], lit: frame.s7.inset.plate !== 'used' };
  } else if (!still && frame.s7.inset.opacity > 0) {
    const box = [width - 560, height - bars - 330, 480, 270];
    const k = (box[2] / 1920) * frame.s7.inset.scale;
    inset = `<g opacity="${f(frame.s7.inset.opacity)}"><rect x="${box[0] - 6}" y="${box[1] - 6}" width="${box[2] + 12}" height="${box[3] + 12}" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>`
      + `<svg x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" viewBox="0 0 1920 1080" overflow="hidden">${consoleSet(frame.s7.inset, { prefix: `${prefix}i`, emergency: 0 })}</svg></g>`;
    const [lx, ly, lw, lh] = CONSOLE_SET.label;
    words.plate = { word: 'EJECT', box: [f(box[0] + lx * k), f(box[1] + ly * k), f(lw * k), f(lh * k)], lit: false };
    if (frame.s7.inset.stamp > 0) words.stamp = { word: 'Used', box: [f(box[0] + (CONSOLE_SET.plate[0] + 40) * k), f(box[1] + CONSOLE_SET.plate[1] * k), f(PLATE.w * CONSOLE_SET.s * k * 0.8), f(PLATE.h * CONSOLE_SET.s * k)], opacity: frame.s7.inset.stamp };
  }
  const svg = head + fxDefs(prefix) + cutDefs(prefix)
    + `<rect width="${width}" height="${height}" fill="#05070B"/>`
    + `<g opacity="${f(frame.opacity)}">${body}</g>`
    + vignette(prefix, { width, height, strength: 0.5 })
    + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.45"/>`
    + inset
    + letterbox({ width, height, h: bars })
    + '</svg>';
  return { svg, frame, words };
}

/** The insert at t: one width x height SVG, the same for every EJECT (no person, no word, no count). */
export function insertSvg(t, { width = 1920, height = 1080 } = {}) {
  const prefix = 'ei';
  const frame = insertFrame(t);
  const body = frame.opacity > 0 ? shoot(insertSet(frame, { prefix }), frame.camera, { width, height }) : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="eject-insert" data-t="${t}">`
    + fxDefs(prefix) + `<rect width="${width}" height="${height}" fill="${CAPTAIN.space}"/>`
    + `<g opacity="${f(frame.opacity)}">${body}</g>`
    + vignette(prefix, { width, height, strength: 0.45 })
    + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.4"/></svg>`;
  return { svg, frame };
}

/** Every set's bounds, for a test that the camera never shows past a set's edge. */
export const SET_BOUNDS = SETS;
export { cameraView };

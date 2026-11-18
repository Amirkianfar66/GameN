// The prompts of sheets PV6-B to PV6-E, version 2: version 1's (prompts7.mjs) word for word, but step 2's PLACE text names the
// food capsule units where a view shows one (units8.mjs): a counter unit standing on the end of Atlas's bench, or a wall unit on
// its bracket. The room paints each unit's body with its hatch closed, flat and plain, and its light unlit; code draws the open
// hatch, the compartment, the tray, the light's state and the shutter over it (the Lead, 18 November). Exports prompts(view).
import { readFileSync } from 'fs';
import { STYLE6, COLOUR6, ROOM6, LENS6, OUT, what6 } from '../pv6/prompts6.mjs';
import { LINE7, REF1, REF2 } from '../pv7/prompts7.mjs';
const DIR = new URL('./', import.meta.url).pathname, W = 1024, H = 1536;
const OPEN = 'This is a correction of the attached picture. Repaint only the masked shapes, and leave everything outside them exactly as it is.';
const BODY = 'its front a flat, plain hatch of warm paper-white, closed, with a small dark handle along its bottom edge, two thin vent slots under the hatch, and a small round lens above it, unlit and dark; nothing written, printed or lit on it';
export const CAPSULE_WORDS = {
  counter: `a small food dispenser standing on that end of the bench: a steel housing with a rounded top on a short foot, about a quarter of a metre wide and twice as tall, ${BODY}`,
  wall: `a small food dispenser mounted on the wall on a bracket in the wall's own colours, at about waist height: a narrow steel housing about a fifth of a metre wide and three times as tall, ${BODY}`,
};
export const REF2_CAPSULE = 'The food dispenser is not in that picture: paint it in the same metal, paint and wear as the furniture that is.';
const where = s => s.cutByEdge ? (s.bbox[0] === 0 ? 'at the left edge' : 'at the right edge') : s.visibleCentreX < W / 3 ? 'on the left' : s.visibleCentreX > (2 * W) / 3 ? 'on the right' : 'ahead';
// a piece's words: the capsule's own, or PV6-A's what6 for the furniture
const what8 = p => (p.name === 'food capsule' ? CAPSULE_WORDS[p.kind] : what6(p));
// PV6-A's placeText, with a bench and the counter unit on it read as one piece of furniture and a wall unit as a piece on the wall
export function placeText8(shapes, pieces, { clear = null } = {}) {   // clear: { bench, end } of version 4, the bench end its capsule stands on in step 3
  const items = shapes.map((s, i) => { const w = where(s), place = i && where(shapes[i - 1]) === w ? 'just right of it' : w, mem = s.pieces.map(k => pieces[k]);
    const unit = mem.find(p => p.name === 'food capsule'), rest = mem.filter(p => p !== unit), size = s.px < 0.005 * W * H ? 'small ' : s.tall > 2.5 ? 'tall ' : '';
    if (unit && unit.kind === 'counter' && rest.length === 1 && rest[0].name === 'bench') { const b = rest[0], end = b.partsX && unit.partsX ? (unit.partsX[unit.name] < b.partsX[b.name] ? 'left' : 'right') : 'far';
      return `the ${size}shape ${place} is ${what6(b)}, with ${CAPSULE_WORDS.counter.replace('on that end of the bench', `on its ${end} end`)}`; }
    if (unit && rest.length === 0) return `the ${size}shape ${place}, on the wall, is ${CAPSULE_WORDS[unit.kind]}`;
    if (mem.length === 1) return `the ${size}shape ${place} is ${what8(mem[0])}${clear && mem[0] === clear.bench ? `, its top clear at its ${clear.end} end` : ''}`;
    const [near, far] = [...mem].sort((a, b) => a.dist - b.dist); return `the ${size}shape ${place} holds two pieces, ${what8(near)} and, behind it on the ${far.partsX[far.name] < near.partsX[near.name] ? 'left' : 'right'}, ${what8(far)}`; });
  const lead = shapes.every(s => s.pieces.length === 1) ? 'Each masked shape holds one piece of furniture that fills that shape exactly' : 'Each masked shape holds the furniture named for it, filling that shape exactly';
  return `${OPEN} ${lead}, standing on the deck or fixed to the wall, painted in full detail in the picture's style and light: ${items.join('; ')}.`;
}
// version 4 (the Lead and the owner, 18 November): where the counter unit is in the picture it is painted alone, in a step 3 after the
// furniture. Which end of its bench it stands on, in the picture: left or right as the pieces' centres lie, far or near by their depth.
export function capsuleEnd(pieces) {
  const unit = pieces.find(p => p.name === 'food capsule' && p.kind === 'counter'); if (!unit) return null;
  const bench = pieces.find(p => p.place === unit.place && p.name === 'bench'); if (!bench) return null;
  return { bench, unit, end: unit.partsX[unit.name] < bench.partsX[bench.name] ? 'left' : 'right', depth: unit.partsDist[unit.name] > bench.partsDist[bench.name] ? 'far' : 'near' };   // the unit's own depth (its 'dist' is its drawing order, set just before its bench)
}
export const S3_OPEN = 'This is a correction of the attached picture. Repaint only the masked shape, and leave everything outside it exactly as it is.';
export function step3Text(c) {
  return `${S3_OPEN} The masked shape holds one small food dispenser that fills the shape exactly, with nothing of it outside the shape, painted in full detail in the picture's style and light. It stands on the ${c.depth} end of the workbench's top, the ${c.end} end in this picture, its foot on the bench's top: a steel housing with a rounded top on a short foot, about 0.24 m wide, 0.40 m tall and 0.22 m deep, ${BODY}. Paint it in the same metal, paint and wear as the furniture around it.`;
}
// C's version 5 and E's version 3 (the Lead and the owner, 18 November): Juno's stool is painted in step 3 as well, behind its cart.
// Where it stands against the cart, in the picture: by its centre against the thirds of the cart's visible width (or past its ends);
// and how much of its height shows (its visible box against its whole projected box), since the cart may hide most of it.
export function stoolEnd(pieces) {
  const stool = pieces.find(p => p.name === 'stool' && p.step === 3); if (!stool) return null;
  const cart = pieces.find(p => p.place === stool.place && p.name === 'laptop cart'); if (!cart) return null;
  const [c0, , c1] = cart.bbox, x = stool.partsX[stool.name], third = (c1 - c0) / 3;
  const at = x < c0 + third ? 'left end' : x > c1 - third ? 'right end' : 'middle', seen = (stool.bbox[3] - stool.bbox[1]) / (stool.fullBox[3] - stool.fullBox[1]);
  return { stool, cart, at, seen: +seen.toFixed(2) };
}
// the stool's words in step 3: whole where little of it is hidden, or only its seat where the cart hides its post and feet
const stoolWords = s => s.seen < 0.5 ? `the top of a round stool that stands on the deck behind the low wheeled cart: only its round seat shows above the cart, which hides its single post and its ring of feet` : `${what6(s.stool)}, standing on the deck behind the low wheeled cart`;
// the capsule as PV6-B-4 painted it (the Lead, 18 November), so that it matches between the two views
const CAPSULE_B4 = 'a steel housing with a rounded top, about 0.24 m wide, 0.40 m tall and 0.22 m deep; a small round lens high on its front, unlit and dark; below it, a large closed hatch of warm paper-white filling most of the front, with a small dark handle along its bottom edge; no vent slots; nothing written, printed or lit on it';
export const S3_OPEN2 = 'This is a correction of the attached picture. Repaint only the two masked shapes, and leave everything outside them exactly as it is.';
export function step3TwoText(c, s) {
  return `${S3_OPEN2} Each shape holds one object that fills it exactly, with nothing of it outside its shape, painted in full detail in the picture's style and light. The small shape on the bench's ${c.depth} end, the ${c.end} end in this picture, holds one small food dispenser standing on the workbench's top: ${CAPSULE_B4}. The shape behind the cart, ${s.at === 'middle' ? 'over its middle' : `at its ${s.at}`}, holds ${stoolWords(s)}. Paint both in the same metal, paint and wear as the furniture around them.`;
}
export function step3StoolText(s) {
  return `${S3_OPEN} The masked shape holds ${s.seen < 0.5 ? stoolWords(s) : `${what6(s.stool)}, which fills the shape exactly`}, with nothing of it outside the shape, painted in full detail in the picture's style and light. ${s.seen < 0.5 ? `It stands behind the cart's ${s.at}.` : s.seen < 0.9 ? `It stands on the deck behind the cart's ${s.at}, partly hidden by the cart.` : `It stands on its own on the deck, just behind the cart's ${s.at}.`} Paint it in the same metal, paint and wear as the furniture around it.`;
}
export function prompts(V) {
  const K = JSON.parse(readFileSync(DIR + `kit8-${V}.json`, 'utf8')), step3 = !!K.shapes3, cap = step3 && K.pieces.some(p => p.step === 3 && p.name === 'food capsule') ? capsuleEnd(K.pieces) : null, stool = step3 ? stoolEnd(K.pieces) : null;
  const place = placeText8(K.shapes, K.pieces, { clear: cap }), unit = !step3 && K.pieces.some(p => p.name === 'food capsule'), ref2 = unit ? `${REF2} ${REF2_CAPSULE}` : REF2;
  if (step3 && !cap && !stool) throw new Error(`${V}: a step 3 with neither a counter unit on a bench nor a stool behind its cart`);
  const t3 = step3 ? (cap && stool ? step3TwoText(cap, stool) : stool ? step3StoolText(stool) : step3Text(cap)) : null;
  return {
    s1: [STYLE6, COLOUR6, ROOM6, REF1, LENS6, LINE7[V], OUT].join('\n\n'),
    's1-one': [STYLE6, COLOUR6, ROOM6, LENS6, LINE7[V], OUT].join('\n\n'),
    s2: [STYLE6, COLOUR6, place, ref2, OUT].join('\n\n'),
    's2-one': [STYLE6, COLOUR6, place, OUT].join('\n\n'),
    // step 3 has no second picture: PV6-A-3 holds no dispenser to match, and the step-2 picture already shows the bench and the room
    // around the shape, so s3 and s3-one are the same text
    ...(step3 ? { s3: [STYLE6, COLOUR6, t3, OUT].join('\n\n'), 's3-one': [STYLE6, COLOUR6, t3, OUT].join('\n\n') } : {}),
  };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const V of process.argv.slice(2)) { const p = prompts(V); console.log(`\n=== ${V}: s1 ${p.s1.length} chars, s2 ${p.s2.length}, s2-one ${p['s2-one'].length}\n--- PLACE: ${placeText8(...(k => [k.shapes, k.pieces])(JSON.parse(readFileSync(DIR + `kit8-${V}.json`, 'utf8'))))}`); }
}

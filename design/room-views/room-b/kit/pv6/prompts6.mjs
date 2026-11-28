// PV6-A's prompts: step 1 paints the empty room over the empty-room guide; step 2 is one PLACE edit inside the pieces' outlines grown
// 6 px, built as PV5-A-3's step 2. The style block is the owner's text (pv1-shared version 2) with two phrases moved toward the
// owner's references, brighter and warm against cool, and no artist named; the Room B block is new for this plan (its colours
// measured from the references); the keep-out block is version 2's, word for word. Exports the blocks and both prompts.
import { readFileSync } from 'fs';
const DIR = new URL('./', import.meta.url).pathname, V2 = JSON.parse(readFileSync(DIR + '../ring/room-b-pv1p.json', 'utf8')), KIT = JSON.parse(readFileSync(DIR + 'kit6.json', 'utf8'));
// the owner's style text, with two phrases changed (each must be found once)
export const STYLE_CHANGES = [
  ['Use controlled colour palettes with selective luminous accents, giving each location its own atmosphere.', 'Use controlled colour palettes with warm luminous accents against cool shadow, giving each location its own atmosphere.'],
  ['Overall: dark, cyber, noir, illustrated science fiction.', 'Overall: lived-in, cyber, illustrated science fiction, lit and readable: warm lamplight against cool purple shadow, dark only in the corners.'],
];
export const STYLE6 = STYLE_CHANGES.reduce((t, [a, b]) => { if (t.split(a).length !== 2) throw new Error('not in the owner\'s style text: ' + a); return t.replace(a, b); }, V2.blocks.style);
export const COLOUR6 = 'Room B, the laboratory, in the same illustrated world: purple, lit warm. The whole room is one purple family, the colours of the attached guide: deep violet in the shadows and corners (#2A1446, #4B2079), turning to plum where the warm light falls (#582D59, #684166, #774B70), warmest closest to the lamps (#8C5675). The lamps\' light is warm: cream at their cores (#FCE3A0) and an orange glow (#EC793C) on the walls, the ceiling and the deck around them. Walls, panels, pipes, cables and deck plates take their colour from that family; worn edges, rivets and plate seams show a little rust (#75402E); nothing is neutral grey, and nothing is tan, beige or olive. The shadows are deep violet, never black-brown or grey. Pale specimen glass; labels and paper are blank, in a warm paper white. Small indicator lights are blue-green (#3A9497); no other coloured light, and no green or blue light. Clinical and worn, quiet but lived in. The guide is the room\'s colour plan: paint over it in full detail and texture, but keep its colours and where its light falls.';
export const ROOM6 = 'The room: Room B, a 4 m square laboratory with a 3 m ceiling, here with no furniture in it. In the middle of the ceiling, a round skylight about 2.2 m across in a heavy round frame with a lit inner edge, divided into four panes by a thin cross of two mullions; its glass is flat black and empty, with no stars, planets, reflections or other bars across it. Around it, a ring of sixteen small round lights set in the solid ceiling, lit warm cream with an orange glow. On the walls, caged lamps a little above head height, two on each wall, glowing warm cream behind their bars, each throwing an orange glow on the wall around it and a warm reflection on the deck below. The walls are panels, pipes, conduits and shelves, worn and repaired; the deck is metal plates with seams, scuffs and a little rust, lit plum under the ring of lights and warm under the lamps, darker toward the corners. No beams, rays or shafts of light in the air.';
export const LENS6 = 'View: a straight-lined view at standing eye height, exactly as the attached guide shows: 80 degrees across and level, every vertical line perfectly straight and upright, every straight line in the room straight in the picture. The horizon, at eye level, is a straight line 714 px from the top, a little above the middle. Match the guide\'s layout, perspective, horizon and proportions exactly, line for line, as its floor seams, wall bases, corners and ceiling edges show. Do not curve the lines, tilt the view, zoom in or out, or move the horizon.';
export const LINE6 = 'This picture: from a place by the north wall, a little west of its middle, at standing eye height, looking diagonally across the open room toward its south-east corner. Ahead, the east wall with two caged lamps; on the right, past the corner, the south wall\'s east end with a caged lamp, and a second at the right edge. Above, the ceiling, with the round skylight in its upper middle and right, its near edge cut off by the top of the picture, and the ring of warm lights around it. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and shelves.';
export const OUT = V2.blocks.out;
// PLACE: each shape of the mask left to right; a piece more than 0.6 m from every wall stands free on the deck
const W = 1024, H = 1536, OPEN = 'This is a correction of the attached picture. Repaint only the masked shapes, and leave everything outside them exactly as it is.';
export function what6(p) {
  const turned = p.longSideToSightDeg < 20 ? 'seen end-on' : p.longSideToSightDeg > 60 ? 'seen along its length' : 'seen at an angle';   // end-on: within 20° of the line of sight (sheet version 4)
  const cut = p.cutByEdge ? ', cut off by the edge' : '', free = p.wallGapM > 0.6;
  switch (p.name) {
    case 'tablet console': case 'console': return `a waist-high ${p.name} with a slanted top whose display is plain and dark, with no readouts, bars or keys on it${free ? ', standing free on the deck' : ''}${cut}`;
    case 'stool': return `a round stool on a single post with a ring of feet${cut}`;
    case 'laptop cart': return `a low wheeled cart with shelves${cut}`;
    case 'bench': { const end = p.cutByEdge || turned === 'seen end-on' ? 'the end of ' : '', a = p.longSideToWallDeg;
      const by = free ? 'standing free on the deck' : a > 65 ? `that stands out from the ${p.wall} wall` : `by the ${p.wall} wall, ${a < 25 ? 'running nearly along it' : 'set diagonally to it'}`;
      const scope = p.parts.includes('microscope') && p.partsInPicture.microscope ? `, with a microscope on its ${turned === 'seen end-on' ? (p.partsDist.microscope < p.partsDist.bench ? 'near' : 'far') : p.partsX.microscope < p.partsX.bench ? 'left' : 'right'} end` : '';
      return `${end}a low workbench ${by}, ${turned}, its top lit warm${scope}${cut}`; }
    default: throw new Error('no words for ' + p.name);
  }
}
export function placeText(shapes = KIT.shapes, pieces = KIT.pieces) {
  const where = s => s.cutByEdge ? (s.bbox[0] === 0 ? 'at the left edge' : 'at the right edge') : s.visibleCentreX < W / 3 ? 'on the left' : s.visibleCentreX > (2 * W) / 3 ? 'on the right' : 'ahead';
  const items = shapes.map((s, i) => { const size = s.px < 0.005 * W * H ? 'small ' : s.tall > 2.5 ? 'tall ' : '', w = where(s), place = i && where(shapes[i - 1]) === w ? 'just right of it' : w, mem = s.pieces.map(k => pieces[k]);
    if (mem.length === 1) return `the ${size}shape ${place} is ${what6(mem[0])}`;
    const [near, far] = [...mem].sort((a, b) => a.dist - b.dist); return `the ${size}shape ${place} holds two pieces, ${what6(near)} and, behind it on the ${far.partsX[far.name] < near.partsX[near.name] ? 'left' : 'right'}, ${what6(far)}`; });
  const lead = shapes.every(s => s.pieces.length === 1) ? 'Each masked shape holds one piece of furniture that fills that shape exactly' : 'Each masked shape holds the furniture named for it, filling that shape exactly';
  return `${OPEN} ${lead}, standing on the deck, painted in full detail in the picture's style and light: ${items.join('; ')}.`;
}
export const STEP1 = [STYLE6, COLOUR6, ROOM6, LENS6, LINE6, OUT].join('\n\n');
export const STEP2 = [STYLE6, COLOUR6, placeText(), OUT].join('\n\n');
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { console.log('STEP 1 chars', STEP1.length, '\n--- PLACE:', placeText()); }

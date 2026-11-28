// The prompts of sheets PV6-B to PV6-E. PV6-A's blocks word for word (prompts6.mjs: the style, the Room B colour plan, the room,
// the lens and the keep-out), so every view asks for the same room; only the view's own paragraph is new (from guide7.mjs and
// marks7.mjs: the walls, lamps, skylight, window and screen in its painting). Each step has two prompts: one for an image tool that
// takes a second picture as a reference (PV6-A-2 at step 1, the empty room; PV6-A-3 at step 2, the furnished room), and one for a
// tool that takes only the picture to paint. Step 2's PLACE text is PV6-A's placeText(), from the view's kit (kit7-<view>.json).
// Exports the blocks and prompts(view). Generates nothing.
import { readFileSync } from 'fs';
import { STYLE6, COLOUR6, ROOM6, LENS6, OUT, placeText } from '../pv6/prompts6.mjs';
const DIR = new URL('./', import.meta.url).pathname;
const DECK = 'The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and shelves.';
const SKY = (where = 'upper middle and right') => `Above, the ceiling, with the round skylight in its ${where}, its near edge cut off by the top of the picture, and the ring of warm lights around it.`;
const WINDOW = 'a wide exterior window in a heavy riveted frame; its opening is flat black and empty, with no panes, bars or reflections across it';
const SCREEN = 'a small flat black, empty screen in a metal housing';
export const LINE7 = {
  B: `This picture: from a place by the south wall, in its middle, at standing eye height, looking across the open room toward the north wall, a little west of its middle. On the left, the west wall with a caged lamp, and further along it, toward the far corner, ${SCREEN}. Ahead, past the corner, the north wall, with a caged lamp just right of the middle and a second toward the right edge. ${SKY()} ${DECK}`,
  C: `This picture: from a place by the east wall, a little south of its middle, at standing eye height, looking straight across the open room at the west wall. On the left, close, the south wall, with ${WINDOW}, near the left edge. Ahead, the west wall, with a caged lamp left of the middle and a second right of it, and further right on that wall ${SCREEN}. On the right, past the corner, the west end of the north wall. ${SKY()} ${DECK}`,
  D: `This picture: from a place by the west wall, a little south of its middle, at standing eye height, looking diagonally across the open room toward its north-east corner, a little right of the middle. On the left and ahead, the north wall, with a caged lamp close at the left edge and a second just left of the middle; on the right, past the corner, the east wall, with a caged lamp right of the middle. ${SKY()} ${DECK}`,
  E: `This picture: from a place by the north wall, a little east of its middle, at standing eye height, looking across the open room at the south wall, a little west of its middle. On the left, the south end of the east wall, with a caged lamp at the left edge. Ahead, the south wall, with two caged lamps left of the middle and, just right of the middle, ${WINDOW}. On the right, past the corner, the west wall, with a caged lamp. ${SKY()} ${DECK}`,
};
// the second picture, where the tool takes one: the same room (step 1) and the same furniture (step 2)
export const REF1 = 'The second attached picture is this same room, Room B, painted from another place for the same game. Paint the same room: the same caged lamps, pipes, conduits, panels, shelves, deck plates, materials, wear and colours, so that the two pictures read as one room seen from two places. Take only the room\'s look from it: this picture\'s view, layout and light come from the guide.';
export const REF2 = 'The second attached picture shows Room B\'s furniture painted from another place. Paint each piece as the same furniture, with the same materials, colours, wear and warm light; a piece that is not in it is painted to match the pieces that are, a tablet console like the console and every workbench like the workbench.';
export function prompts(V) {
  const K = JSON.parse(readFileSync(DIR + `kit7-${V}.json`, 'utf8')), place = placeText(K.shapes, K.pieces);
  return {
    s1: [STYLE6, COLOUR6, ROOM6, REF1, LENS6, LINE7[V], OUT].join('\n\n'),
    's1-one': [STYLE6, COLOUR6, ROOM6, LENS6, LINE7[V], OUT].join('\n\n'),
    s2: [STYLE6, COLOUR6, place, REF2, OUT].join('\n\n'),
    's2-one': [STYLE6, COLOUR6, place, OUT].join('\n\n'),
  };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const V of process.argv.slice(2)) { const p = prompts(V); console.log(`\n=== ${V}: s1 ${p.s1.length} chars, s1-one ${p['s1-one'].length}, s2 ${p.s2.length}, s2-one ${p['s2-one'].length}\n--- PLACE: ${placeText(...(k => [k.shapes, k.pieces])(JSON.parse(readFileSync(DIR + `kit7-${V}.json`, 'utf8'))))}`); }
}

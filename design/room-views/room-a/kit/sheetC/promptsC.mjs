// Sheet RA-C's prompts (Room A, view C: Echo's place), version 1.1: two steps, as sheet RA-B's (promptsB.mjs, version 1) for view B.
// Step 1 paints the empty room over the empty-room guide; step 2 is one masked PLACE edit of that picture inside the furniture's
// outlines grown 6 px. The style, room, lens and keep-out blocks are sheet RA-A's, word for word (the colour block too, but for version 1.1's one sentence), and the whole-piece
// sentence is sheet RA-B's (all imported, so they cannot drift). The room block has no window sentence: the round window is out of
// view C. The view and PLACE blocks are view C's, checked against kit-C.json. The Lead's line of 19 November keeps the upper crate's
// top clear wherever Atlas works (sharedV.mjs). The monitor's screen is flat black, for the game. No second picture. Exports the
// prompts. Version 1.1 (the Lead, 27 November, after RA-B-1): the colour block is sharedV.mjs's, with one sentence for the
// indicators. Nothing else changes: view C's west wall is square on, so no slant sentence.
import { readFileSync } from 'fs';
import { GW } from './guideC.mjs';
import { STYLE_A, ROOM_A, LENS_A, OUT, open2 } from '../sheet/promptsA.mjs';
import { WHOLE } from '../sheetB/promptsB.mjs';
import { CRATE_TOP, COUNT, thirdOf, pieceOf, COLOUR_V, INDICATOR, INDICATOR_AFTER } from '../sheetV/sharedV.mjs';
export const ADDED = [{ block: 'colour', steps: ['s1', 's2'], after: INDICATOR_AFTER, text: INDICATOR }];
const DIR = new URL('./', import.meta.url).pathname, KIT = JSON.parse(readFileSync(DIR + 'kit-C.json', 'utf8')), by = pieceOf(KIT), third = thirdOf(GW);
export const ROOM_C = ROOM_A;
export const LINE_C = 'This picture: from a place by the east wall, a little south of its middle, at standing eye height, looking straight across the room toward the west wall. Ahead, the west wall, square to the view, from its corner with the south wall left of the middle to its corner with the north wall near the right edge; on the left, the south wall; on the right, a narrow strip of the north wall. Above, the solid ceiling, with the two light bars running from near the far wall toward you and out of the picture, the left one almost upright to the top edge and the right one out at the right edge near the top. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and conduits.';
export function placeTextC() {
  const crates = by('crates'), desk = by('PC workstation'), box = by('toolbox'), hatch = by('floor hatch'), n = KIT.shapes.length;
  if (KIT.pieces.length !== 4 || n !== 4) throw new Error('step 2 expects four pieces in four masked areas');
  if (third(crates) !== 'ahead' || crates.cutByEdge) throw new Error('the crates are not whole and ahead');
  if (third(desk) !== 'on the right' || !desk.cutByEdge || desk.bbox[2] !== GW) throw new Error('the desk does not run out at the right edge');
  if (![box, hatch].every(p => third(p) === 'on the right' && p.cutByEdge && p.bbox[2] === GW)) throw new Error('the toolbox and the hatch are not cut by the right edge');
  if (!(desk.visibleCentreY < box.visibleCentreY && box.visibleCentreY < hatch.visibleCentreY)) throw new Error('the desk, the toolbox and the hatch are not in that order down the right edge');
  if (!KIT.inView.screens || KIT.inView.window || KIT.inView.capsule) throw new Error('view C has the screens, and neither the window nor the capsule');
  return `${open2(n)} The ${COUNT[n]} masked areas hold four pieces of furniture, each filling its own area exactly, painted in full detail in the picture's style and light. ${WHOLE} Ahead, against the middle of the far wall: two closed steel crates, a long low one about 1 m long with a smaller one on top, held by straps. ${CRATE_TOP} On the right, against the right-hand wall and running out of the picture at its right edge: a long steel desk about 0.74 m high, seen along its length, with a flat monitor standing toward its far end; the monitor's screen is flat black and empty, for the game to fill. No chair stands at the desk. Lower on the right, on the deck and cut off by the picture's right edge: a closed steel toolbox, and nearer, below it, the end of an open hatch in the deck with a raised steel rim, showing a dark space beneath.`;
}
export function prompts() {
  return { s1: [STYLE_A, COLOUR_V, ROOM_C, LENS_A, LINE_C, OUT].join('\n\n'), s2: [STYLE_A, COLOUR_V, placeTextC(), OUT].join('\n\n') };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { const p = prompts(); for (const [k, t] of Object.entries(p)) console.log(`\n===== ${k}: ${t.length} characters\n${t}`); }

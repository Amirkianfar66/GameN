// Sheet RA-E's prompts (Room A, view E: Lyra's place), version 1.1: two steps, as sheet RA-B's (promptsB.mjs, version 1) for view B.
// Step 1 paints the empty room over the empty-room guide; step 2 is one masked PLACE edit of that picture inside the furniture's
// outlines grown 6 px. The style, room, lens and keep-out blocks are sheet RA-A's, word for word (the colour block too, but for version 1.1's one sentence), and the whole-piece
// sentence is sheet RA-B's (all imported, so they cannot drift). The room block has no window sentence: the round window is out of
// view E. The view and PLACE blocks are view E's, checked against kit-E.json. The Lead's line of 19 November keeps the upper crate's
// top clear wherever Atlas works (sharedV.mjs). Lyra's own hatch, lid and toolbox are left out, as the approved plan leaves the
// viewer's own station out (kit-E.json measures where they would show). No second picture. Exports the prompts.
// Version 1.1 (the Lead, 27 November, after RA-B-1): the colour block is sharedV.mjs's, with one sentence for the indicators, and,
// as view E's south wall is seen at view B's angle (17.7 degrees off square), the view block gains one sentence naming its slant
// (SLANT_E). Nothing else changes.
import { readFileSync } from 'fs';
import { GW, room } from './guideE.mjs';
import { STYLE_A, ROOM_A, LENS_A, OUT, open2 } from '../sheet/promptsA.mjs';
import { WHOLE } from '../sheetB/promptsB.mjs';
import { CRATE_TOP, COUNT, thirdOf, pieceOf, COLOUR_V, INDICATOR, INDICATOR_AFTER } from '../sheetV/sharedV.mjs';
const DIR = new URL('./', import.meta.url).pathname, KIT = JSON.parse(readFileSync(DIR + 'kit-E.json', 'utf8')), by = pieceOf(KIT), third = thirdOf(GW);
const PANEL = room.objects.find(o => o.name === 'electrical panel'), m1 = v => String(+v.toFixed(2)), tall = String(+(PANEL.h - PANEL.y0 + 1e-9).toFixed(2));
if (room.objects.some(o => o.name === 'panel door')) throw new Error('the PLACE text says the cabinet has no door');
export const ROOM_E = ROOM_A;
const LINE_E_V1 = 'This picture: from a place by the north wall, east of its middle, at standing eye height, looking across the room toward the south wall, turned a little to the right. Ahead, the south wall, from its corner with the east wall near the left edge to its corner with the west wall right of the middle; on the left, a narrow strip of the east wall; on the right, the west wall. Above, the solid ceiling: the farther light bar runs across it from left to right, high in the picture and a little lower at its right end, and the nearer one crosses the top right corner. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and conduits.';
export const SLANT_E = 'The south wall is seen at a slant, not square on: its foot and the deck seams along it run down from the far corner, right of the middle, to its corner with the east wall near the left edge, as the guide shows.';
const SLANT_AFTER = 'on the right, the west wall.';
if (LINE_E_V1.split(SLANT_AFTER).length !== 2) throw new Error('the view block changed');
export const LINE_E = LINE_E_V1.replace(SLANT_AFTER, `${SLANT_AFTER} ${SLANT_E}`);
export const ADDED = [{ block: 'colour', steps: ['s1', 's2'], after: INDICATOR_AFTER, text: INDICATOR }, { block: 'view', steps: ['s1'], after: SLANT_AFTER, text: SLANT_E }];
export function placeTextE() {
  const cab = by('electrical cabinet'), crates = by('crates'), n = KIT.shapes.length;
  if (KIT.pieces.length !== 2 || n !== 2) throw new Error('step 2 expects two pieces in two masked areas');
  if (third(cab) !== 'on the left' || !cab.cutByEdge || cab.bbox[0] !== 0) throw new Error('the cabinet does not run out at the left edge');
  if (third(crates) !== 'on the right' || !crates.cutByEdge || crates.bbox[2] !== GW) throw new Error('the crates do not run out at the right edge');
  if (KIT.inView.screens || KIT.inView.window || KIT.inView.capsule) throw new Error('view E has no window, no screens and no capsule');
  return `${open2(n)} The ${COUNT[n]} masked areas hold two pieces of furniture, each filling its own area exactly, painted in full detail in the picture's style and light. ${WHOLE} On the left, mounted on the left-hand wall about ${m1(PANEL.y0)} m above the deck and cut off by the picture's left edge: a steel electrical cabinet about ${tall} m tall, with no door, its front, seen at a slant, open on rows of breakers and neatly bundled cables, every cable in its place and none hanging loose. On the right, against the right-hand wall and cut off by the picture's right edge: two closed steel crates, a long low one with a smaller one on top, held by straps. ${CRATE_TOP}`;
}
export function prompts() {
  return { s1: [STYLE_A, COLOUR_V, ROOM_E, LENS_A, LINE_E, OUT].join('\n\n'), s2: [STYLE_A, COLOUR_V, placeTextE(), OUT].join('\n\n') };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { const p = prompts(); for (const [k, t] of Object.entries(p)) console.log(`\n===== ${k}: ${t.length} characters\n${t}`); }

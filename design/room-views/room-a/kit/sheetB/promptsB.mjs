// Sheet RA-B's prompts (Room A, view B: Mira's place), version 2: two steps, as sheet RA-A's (promptsA.mjs, version 4) for view A.
// Step 1 paints the empty room over the empty-room guide; step 2 is one masked PLACE edit of that picture inside the furniture's
// outlines grown 6 px. The style, lens and keep-out blocks are sheet RA-A's, word for word, as is the colour block but for version 1.1's one sentence (imported, so they cannot drift).
// The room block is RA-A's with one sentence for the round window, which view B sees and view A did not. The view and PLACE blocks
// are view B's; the hatch's lid is part of the hatch's area, as it stands at the painting's right edge. View A's lessons: every piece is painted whole, its outline and frame closed on every side, nothing fading into the
// wall or the deck at a mask's edge (RA-A-2 and RA-A-3 left the cabinet's right side open); screens stay flat black, for the game.
// No second picture. Exports the prompts.
// Version 1.1 (the Lead, 27 November, after RA-B-1): the colour block is sharedV.mjs's, sheet RA-A's with one sentence for the
// indicators (INDICATOR), and the view block gains one sentence naming the north wall's slant (SLANT_B). Nothing else changes.
// Version 2 (the Lead, 27 November, on RA-B-2): step 2's PLACE block gains the Lead's crate-top line of 19 November (CRATE_TOP,
// sharedV.mjs, as views C and E have it), after the crates; step 1's prompt is version 1.1's, as RA-B-2 was made with it.
import { readFileSync } from 'fs';
import { GW, GH } from './guideB.mjs';
import { STYLE_A, ROOM_A, LENS_A, OUT, open2 } from '../sheet/promptsA.mjs';
import { COLOUR_V, INDICATOR, INDICATOR_AFTER, CRATE_TOP } from '../sheetV/sharedV.mjs';
const DIR = new URL('./', import.meta.url).pathname;
export const WINDOW_B = 'In the middle of the north wall, about 1.95 m above the deck, a round window about 1 m across sits in a heavy steel frame; its glass is flat black and empty, with nothing seen through it.';
const ROOM_SPLIT = 'The walls are steel panels';
if (ROOM_A.split(ROOM_SPLIT).length !== 2) throw new Error('the room block changed');
export const ROOM_B = ROOM_A.replace(ROOM_SPLIT, `${WINDOW_B} ${ROOM_SPLIT}`);
const LINE_B_V1 = 'This picture: from a place by the south wall, at its middle, at standing eye height, looking across the room toward the north wall. Ahead, the north wall, from its corner with the west wall a little left of the middle out to the right edge, with the round window right of the middle; on the left, the west wall. Above, the solid ceiling, with the two light bars running across it from left to right, the nearer one high at the top of the picture and the farther one lower, nearer the far wall. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and conduits.';
export const SLANT_B = 'The north wall is seen at a slant, not square on: its foot and the deck seams along it run down from the far corner to the right edge, as the guide shows.';
const SLANT_AFTER = 'on the left, the west wall.';
if (LINE_B_V1.split(SLANT_AFTER).length !== 2) throw new Error('the view block changed');
export const LINE_B = LINE_B_V1.replace(SLANT_AFTER, `${SLANT_AFTER} ${SLANT_B}`);
// version 1.1's additions, word for word, for the manifest's note
export const ADDED = [{ block: 'colour', steps: ['s1', 's2'], after: INDICATOR_AFTER, text: INDICATOR }, { block: 'view', steps: ['s1'], after: SLANT_AFTER, text: SLANT_B }];
// version 2's addition, word for word: the crate-top line after the crates in step 2's PLACE block
export const CRATES_AFTER = 'two closed steel crates, a long low one with a smaller one on top, held by straps.';
export const ADDED_V2 = [{ block: 'PLACE', steps: ['s2'], after: CRATES_AFTER, text: CRATE_TOP }];
const KIT = JSON.parse(readFileSync(DIR + 'kit-B.json', 'utf8'));
const by = n => { const p = KIT.pieces.find(p => p.name === n); if (!p) throw new Error('kit-B.json: no ' + n); return p; };
const COUNT = ['no', 'one', 'two', 'three', 'four'];
const third = p => (p.visibleCentreX < GW / 3 ? 'on the left' : p.visibleCentreX > (2 * GW) / 3 ? 'on the right' : 'ahead');
export const WHOLE = 'Paint each piece whole, with a crisp drawn outline all round it and its frame closed on every side: nothing fades softly into the wall or the deck at an area\'s edge.';
export function placeTextB() {
  const desk = by('PC workstation'), crates = by('crates'), hatch = by('floor hatch'), box = by('toolbox'), n = KIT.shapes.length;
  if (KIT.pieces.length !== 4 || n !== 3) throw new Error('step 2 expects four pieces in three masked areas');
  if (!hatch.parts.includes('hatch lid') || !hatch.cutByEdge || hatch.bbox[2] !== GW) throw new Error('the hatch, with its lid, does not run out at the right edge');
  if (third(desk) !== 'ahead' || third(crates) !== 'on the left' || third(hatch) !== 'on the right') throw new Error('the pieces are not where the text puts them');
  if (!(box.visibleCentreX < hatch.visibleCentreX)) throw new Error('the toolbox is not at the hatch\'s left end');
  if (!crates.cutByEdge) throw new Error('the crates are not cut by the picture\'s edge');
  return `${open2(n)} The ${COUNT[n]} masked areas hold four pieces of furniture, each filling its own part exactly, painted in full detail in the picture's style and light. ${WHOLE} Ahead, against the far wall left of the round window: a long steel desk about 1.3 m wide and 0.74 m high, with two flat monitors standing side by side on it; their screens are flat black and empty, for the game to fill. No chair stands at the desk. On the left, nearest, against the left wall and cut off by the picture's left edge: two closed steel crates, a long low one with a smaller one on top, held by straps. ${CRATE_TOP} On the right, in the deck: an open hatch, a long rectangular opening about 1 m by 0.5 m with a raised steel rim all round, its near edge crisp and lit, showing a dark space beneath with pipes and cables, running out of the picture at its right edge, where the foot of its heavy steel lid, raised almost upright along the hatch's far right end, just shows; at its left end, a closed steel toolbox standing on the deck.`;
}
export function prompts() {
  return { s1: [STYLE_A, COLOUR_V, ROOM_B, LENS_A, LINE_B, OUT].join('\n\n'), s2: [STYLE_A, COLOUR_V, placeTextB(), OUT].join('\n\n') };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { const p = prompts(); for (const [k, t] of Object.entries(p)) console.log(`\n===== ${k}: ${t.length} characters\n${t}`); }

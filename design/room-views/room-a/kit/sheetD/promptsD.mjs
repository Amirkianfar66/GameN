// Sheet RA-D's prompts (Room A, view D: Atlas's place), version 1.1: three steps, as sheet RA-A's (promptsA.mjs, version 4) for view
// A. Step 1 paints the empty room over the empty-room guide; step 2 is one masked PLACE edit of that picture inside the furniture's
// outlines grown 6 px; step 3 is one masked edit of the kept step-2 picture inside the food capsule's outline grown 2 px. The style,
// lens and keep-out blocks are sheet RA-A's, word for word (the colour block too, but for version 1.1's one sentence); the room block is sheet RA-B's, with its sentence for the round
// window, which view D sees too; the whole-piece sentence is sheet RA-B's; step 3's opening and the capsule's front are sheet RA-A's
// (all imported, so they cannot drift). The view, PLACE and step-3 blocks are view D's, checked against kit-D.json and the guide's
// camera. The cabinet's size is read from the layout, as view A's is. Atlas's own crates are out of view D, so the crate-top line
// is not needed here. The window and the screens are flat black, for the game. No second picture. Exports the prompts.
// Version 1.1 (the Lead, 27 November, after RA-B-1): the colour block is sharedV.mjs's, with one sentence for the indicators, in
// all three steps. Nothing else changes: view D is a corner view, as view A, so no slant sentence.
import { readFileSync } from 'fs';
import { GW, room, cam } from './guideD.mjs';
import { STYLE_A, LENS_A, OUT, open2, OPEN3, CAPSULE_FRONT } from '../sheet/promptsA.mjs';
import { ROOM_B, WHOLE } from '../sheetB/promptsB.mjs';
import { COUNT, thirdOf, pieceOf, areaOf, COLOUR_V, INDICATOR, INDICATOR_AFTER } from '../sheetV/sharedV.mjs';
export const ADDED = [{ block: 'colour', steps: ['s1', 's2', 's3'], after: INDICATOR_AFTER, text: INDICATOR }];
const DIR = new URL('./', import.meta.url).pathname, KIT = JSON.parse(readFileSync(DIR + 'kit-D.json', 'utf8')), by = pieceOf(KIT), third = thirdOf(GW), area = areaOf(KIT);
const PANEL = room.objects.find(o => o.name === 'electrical panel'), m1 = v => String(+v.toFixed(2)), tall = String(+(PANEL.h - PANEL.y0 + 1e-9).toFixed(2)), wide = String(+PANEL.w.toFixed(1));
if (room.objects.some(o => o.name === 'panel door')) throw new Error('the PLACE text says the cabinet has no door');
const xAt = p => cam.proj(cam.view(p))[0], CORNER_NE = xAt([2, 1.6, 2]);   // the far corner (north-east), in the painting
export const ROOM_D = ROOM_B;
export const LINE_D = 'This picture: from a place by the west wall, a little south of its middle, at standing eye height, looking diagonally across the room toward its north-east corner, which stands a little right of the middle. Ahead and on the left, the north wall, with the round window left of the middle; on the right, past the corner, the east wall. Above, the solid ceiling: one light bar runs from the top edge, left of the middle, down to the right toward the far corner, and the other lies just out of the picture at the top right, its glow at that corner. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and conduits.';
export function placeTextD() {
  const desk = by('PC workstation'), box = by('toolbox'), hatch = by('floor hatch'), lid = by('hatch lid'), cab = by('electrical cabinet'), n = KIT.shapes.length;
  if (KIT.pieces.length !== 5 || n !== 3) throw new Error('step 2 expects five pieces in three masked areas');
  if (third(desk) !== 'on the left' || !desk.cutByEdge || desk.bbox[0] !== 0) throw new Error('the desk does not run out at the left edge');
  if (area('floor hatch') !== 'floor hatch + hatch lid + toolbox' || third(hatch) !== 'ahead') throw new Error('the middle area does not hold the hatch, its lid and the toolbox');
  if (!(box.visibleCentreX < hatch.visibleCentreX && hatch.visibleCentreX < lid.visibleCentreX)) throw new Error('the toolbox, the hatch and its lid are not in that order from left to right');
  if (third(cab) !== 'on the right' || cab.bbox[0] <= CORNER_NE) throw new Error('the cabinet is not on the right-hand wall');
  if (!KIT.inView.screens || !KIT.inView.window || !KIT.inView.capsule) throw new Error('view D has the window, the screens and the capsule');
  return `${open2(n)} The ${COUNT[n]} masked areas hold five pieces of furniture, each filling its own part exactly, painted in full detail in the picture's style and light. ${WHOLE} On the left, nearest, against the far wall and cut off by the picture's left edge: a long steel desk about 1.3 m wide and 0.74 m high, with two flat monitors standing side by side on it; their screens are flat black and empty, for the game to fill. No chair stands at the desk. Ahead, in the deck: an open hatch, a long rectangular opening about 1 m by 0.5 m with a raised steel rim all round, its near edge crisp and lit, showing a dark space beneath with pipes and cables; at its far end, on the right, its heavy steel lid, hinged along that edge and raised almost upright; at its near end, on the left, a closed steel toolbox standing on the deck. On the right, mounted on the right-hand wall about ${m1(PANEL.y0)} m above the deck: a steel electrical cabinet, about ${wide} m wide and ${tall} m tall, with no door, its front open on rows of breakers and neatly bundled cables, every cable in its place and none hanging loose, with two small warm orange indicator lights near its top.`;
}
// step 3: the food capsule alone, as in view A: the room paints it closed and unlit; code draws its open hatch, compartment, tray,
// light and shutter over it
export function step3TextD() {
  const cap = KIT.pieces3.find(p => p.name === 'food capsule'); if (!cap || KIT.shapes3.length !== 1) throw new Error('step 3 expects the capsule alone');
  if (!(cap.bbox[0] > CORNER_NE && cap.bbox[2] < by('electrical cabinet').bbox[0])) throw new Error('the capsule is not on the right-hand wall, between the far corner and the cabinet');
  return `${OPEN3} The masked shape holds one small food dispenser that fills the shape exactly, with nothing of it outside the shape, painted in full detail in the picture's style and light. It is mounted on the right-hand wall, a little right of the far corner and left of the electrical cabinet, on a bracket in the wall's own colours, at waist to chest height: a narrow upright steel housing about 0.32 m wide, 0.55 m tall and 0.22 m deep; ${CAPSULE_FRONT}. Paint it in the same metal, paint and wear as the furniture in the picture.`;
}
export function prompts() {
  return { s1: [STYLE_A, COLOUR_V, ROOM_D, LENS_A, LINE_D, OUT].join('\n\n'), s2: [STYLE_A, COLOUR_V, placeTextD(), OUT].join('\n\n'), s3: [STYLE_A, COLOUR_V, step3TextD(), OUT].join('\n\n') };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { const p = prompts(); for (const [k, t] of Object.entries(p)) console.log(`\n===== ${k}: ${t.length} characters\n${t}`); }
// Version 2.1 (the Lead, 27 November, 21:03): step 2b, the hatch, its lid and the toolbox alone, one masked edit on RA-D-3x (RA-D-1
// with RA-D-3's desk and cabinet, completed in code). Step 2's two runs painted the hatch bigger and nearer than its area, across the
// toolbox's part of it, and put the toolbox outside its area. Step 2b's PLACE block keeps step 2's hatch, lid and toolbox sentence
// word for word and step 2's opening and whole-piece sentences; it drops the desk's and the cabinet's sentences (not masked), says
// what each of the two areas holds, and adds two lines to hold the size and the place: the hatch is small, one deck plate long and
// half a plate wide, its ends just past the two painted seams it runs between (kit-D2b.json measures both on RA-D-1's deck: 30 to
// 37 px past the seam under the toolbox, 12 px past the next); and the toolbox stands in its own area over the painted crossing of
// two seams (inside its outline, kit-D2b.json), no larger and no nearer. The style, colour and keep-out blocks are step 2's.
export const S2_HATCH = 'Ahead, in the deck: an open hatch, a long rectangular opening about 1 m by 0.5 m with a raised steel rim all round, its near edge crisp and lit, showing a dark space beneath with pipes and cables; at its far end, on the right, its heavy steel lid, hinged along that edge and raised almost upright; at its near end, on the left, a closed steel toolbox standing on the deck.';
export const S2B_AREAS = 'The two masked areas hold three small pieces: the larger area, ahead, the hatch and its lid together; the smaller area, on the left, the toolbox alone. Each fills its own area exactly, with nothing of it outside, painted in full detail in the picture\'s style and light.';
export const S2B_SIZE = 'The hatch is small in the picture, one deck plate long and half a plate wide: its near end lies just past the painted seam that runs under the toolbox, and its far end, where the lid is hinged, just past the next seam over.';
export const S2B_BOX = 'The toolbox stands inside its own area at the hatch\'s near end, over the crossing of two painted deck seams: no larger and no nearer the viewer than its area.';
export function placeTextD2b() {
  const K2 = JSON.parse(readFileSync(DIR + 'kit-D2b.json', 'utf8'));
  if (!placeTextD().includes(S2_HATCH)) throw new Error("step 2's hatch, lid and toolbox sentence is not step 2's");
  if (K2.areas.length !== 2 || K2.areas[0].pieces.join() !== 'toolbox' || K2.areas[1].pieces.join() !== 'floor hatch,hatch lid') throw new Error('step 2b expects the toolbox alone and the hatch with its lid');
  if (K2.areas[0].bbox[0] >= K2.areas[1].bbox[0]) throw new Error("the toolbox's area is not on the left");
  if (!K2.crossing.insideToolboxOutline || Math.min(...K2.seams.nearEndPastSeamX0Px, ...K2.seams.farEndPastSeamX1Px) <= 0) throw new Error('the seams do not hold as the text says');
  return `${open2(2)} ${S2B_AREAS} ${WHOLE} ${S2_HATCH} ${S2B_SIZE} ${S2B_BOX}`;
}
export const prompt2b = () => [STYLE_A, COLOUR_V, placeTextD2b(), OUT].join('\n\n');

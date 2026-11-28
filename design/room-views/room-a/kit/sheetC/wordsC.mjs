// Sheet RA-C's own words (Room A, view C: Echo's place), version 1: the manifest's about, blocks and lessons, and the page's view
// texts, read by buildC.mjs and sheetC.mjs. Every number in them comes from the kit or the manifest.
import { LESSONS_B, LESSON_CRATE, CARRY_WHOLE, carry15, CARRY_CRATE } from '../sheetV/sharedV.mjs';
const gap = (K, a, b) => K.gaps[`${a} / ${b}`] ?? K.gaps[`${b} / ${a}`];
export const WORDS = {
  about: "Room A's third view, painted as views A and B were: two pictures, the empty room and the furniture. The food capsule and the round window are out of view C, so there is no step 3. No people are painted: code draws them.",
  blocks: "sheet RA-A's style, room, lens and keep-out blocks, word for word, and its colour block with one sentence for the indicators (version 1.1); sheet RA-B's whole-piece sentence; view C's own view and PLACE blocks, with the Lead's crate-top line",
  lessons: [...LESSONS_B, LESSON_CRATE],
  lede: 'Room A’s third view, from Echo’s place by the east wall, painted the way views A and B were: two pictures, the empty room and then its furniture. The food capsule and the round window are out of this view, so there is no third step. No people are painted, because code draws them. Every picture made from this sheet is AI-generated and recorded as such. The only inputs are the code-drawn guides and masks on this page, and the picture its own step 1 keeps.',
  where: X => `The camera is at Echo’s place by the east wall, a little south of its middle, at eye height (${X.M.camera.eyeM} m), facing ${X.M.camera.yawCompass}°, due west. The west wall is the back wall, square to the view, with the south wall on the left and a strip of the north wall on the right.`,
  carries: X => [CARRY_WHOLE, carry15('C', false), ['Openings', 'The one monitor in this view (the other of Vega’s two is outside the painting) has its screen painted flat black and empty, for the game to fill; in step 2 the colour check holds it to it. The round window is out of view C.'], CARRY_CRATE],
  pieces: { crates: 'Atlas’s two crates against the west wall, ahead. The upper crate’s top stays clear for the parcel code adds.',
    'PC workstation': 'Vega’s desk along the north wall, seen along its length and cut by the right edge, with the one monitor in view; its screen is an opening, painted flat black. Vega’s chair is drawn with Vega, so none is painted.',
    toolbox: 'The toolbox at the hatch’s far end, cut by the right edge. Most of it is outside the phones’ slices.',
    'floor hatch': 'The end of Lyra’s hatch and its rim, cut by the right edge; its lid is outside the painting. Almost all of it is outside the phones’ slices.' },
  step1Check: X => `The colour check with the empty room’s map, and the lines against the annotated guide: the horizon at ${X.M.camera.horizonY}, every vertical upright, the corners and floor seams where the guide puts them`,
  step3: () => '',
  gaps: X => { const tb = gap(X.KIT, 'toolbox', 'floor hatch'), dt = gap(X.KIT, 'PC workstation', 'toolbox');
    return `The clear space between each two pieces, tight and with the masks’ 6 px growth. Each piece has its own area. The toolbox and the hatch, both cut by the right edge and almost wholly outside the phones’ slices, are ${tb.tightPx} px apart, ${tb.grownPx} px once grown; the desk and the toolbox ${dt.tightPx} px (${dt.grownPx} grown). The monitor’s screen lies inside the desk’s piece. The round window is out of view.`; },
  own: () => '',
  colour: () => 'Here the round window is out of view, so in step 1 the openings gate has nothing to hold; in step 2 it holds the monitor’s screen to flat black.',
  alts: { empty: "Step 1's guide: Room A's empty room from Echo's place, the west wall ahead, the two light bars running up out of the picture",
    guide: "The guide with the furniture: Atlas's crates ahead, Vega's desk with a black-screened monitor on the right, the toolbox and the hatch at the right edge" },
};

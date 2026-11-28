// Sheet RA-E's own words (Room A, view E: Lyra's place), version 1: the manifest's about, blocks and lessons, and the page's view
// texts, read by buildE.mjs and sheetE.mjs. Every number in them comes from the kit or the manifest.
import { LESSONS_B, LESSON_CRATE, LESSON_OWN, CARRY_WHOLE, carry15, CARRY_CRATE } from '../sheetV/sharedV.mjs';
const PH = ['390x844', '430x932', '402x742'], num = n => n.toLocaleString('en-GB');
// Lyra's own station, from the kit: per phone, the painting's pixels of it inside the phone's slice, that many on the phone's screen
// (divided by the slice's scale squared), and the rows it would reach up from the stage's foot
function ownOnPhones(X) {
  const objs = Object.values(X.KIT.ownStation.objects), sl = X.M.camera.phones.slices;
  return Object.fromEntries(PH.map(k => { const px = objs.reduce((s, o) => s + o.slicePx[k], 0), s = sl[k], top = Math.min(...objs.filter(o => o.slicePx[k] > 0).map(o => o.bbox[1]));
    return [k, { px, screenPx: Math.round(px / (s.scale * s.scale)), rows: px ? Math.round((s.paintingRect[3] - top) / s.scale) : 0 }]; }));
}
export const WORDS = {
  about: "Room A's fifth view, painted as views A and B were: two pictures, the empty room and the furniture. The food capsule and the round window are out of view E, so there is no step 3. Lyra's own hatch, its lid and the toolbox are left out, as the approved plan leaves the viewer's own station out. No people are painted: code draws them.",
  blocks: "sheet RA-A's style, room, lens and keep-out blocks, word for word, and its colour block with one sentence for the indicators (version 1.1); sheet RA-B's whole-piece sentence; view E's own view and PLACE blocks, with the Lead's crate-top line and, since version 1.1, a sentence naming the south wall's slant",
  lessons: [...LESSONS_B, LESSON_CRATE, LESSON_OWN],
  lede: 'Room A’s fifth view, from Lyra’s place by the north wall, painted the way views A and B were: two pictures, the empty room and then its furniture, which here is Echo’s cabinet at the left edge and Atlas’s crates on the right. The food capsule and the round window are out of this view, so there is no third step. No people are painted, because code draws them. Every picture made from this sheet is AI-generated and recorded as such. The only inputs are the code-drawn guides and masks on this page, and the picture its own step 1 keeps.',
  where: X => `The camera is at Lyra’s place by the north wall, east of its middle, at eye height (${X.M.camera.eyeM} m), facing ${X.M.camera.yawCompass}°, a little west of south. The south wall is the back wall, with a strip of the east wall on the left and the west wall on the right.`,
  carries: X => { const o = ownOnPhones(X);
    return [CARRY_WHOLE, carry15('E', false), ['Openings', 'Neither the round window nor a monitor is in view E, so this view has no opening to hold flat black.'], CARRY_CRATE,
      ['Lyra’s own station', `Left out, as the approved plan leaves each viewer’s own station out of their own view. Slivers of Lyra’s hatch, its lid and the toolbox would show at the foot of the 390 × 844 and 430 × 932 phones (up to ${o['430x932'].rows} px from the stage’s foot), and nothing on yours, 402 × 742. They are measured below for the Lead’s decision.`]]; },
  pieces: { 'electrical cabinet': 'Echo’s cabinet on the east wall, open, with no door, its front seen at a slant and cut by the left edge. Almost all of it is outside the phones’ slices.',
    crates: 'Atlas’s two crates against the west wall, cut by the right edge. The upper crate’s top stays clear for the parcel code adds.' },
  step1Check: X => `The colour check with the empty room’s map, and the lines against the annotated guide: the horizon at ${X.M.camera.horizonY}, every vertical upright, the corners and floor seams where the guide puts them`,
  step3: () => '',
  gaps: X => { const g = Object.values(X.KIT.gaps)[0];
    return `The clear space between the two pieces, tight and with the masks’ 6 px growth: each is in its own area, at opposite edges of the picture, ${g.tightPx >= 199 ? 'more than 198' : g.tightPx} px apart. No opening is in view.`; },
  own: X => { const o = ownOnPhones(X);
    return `The approved plan leaves each viewer’s own station out of their own view, and so does this sheet: Lyra’s hatch, its lid and the toolbox are not painted. Measured on the painting, slivers of them would show at its foot. On the 390 × 844 phone that is the lid and the toolbox, ${num(o['390x844'].px)} px of the painting (about ${num(o['390x844'].screenPx)} px on the screen), up to ${o['390x844'].rows} px from the stage’s foot. On the 430 × 932 phone the hatch’s rim joins them: ${num(o['430x932'].px)} px (about ${num(o['430x932'].screenPx)} on the screen), up to ${o['430x932'].rows} px. On yours, 402 × 742, nothing shows. Painting them would add small pieces cut by the bottom edge to step 2’s mask. Recommended: leave them out, as the plan does. The Lead decides.`; },
  colour: () => 'Here neither the round window nor a monitor is in view, so the openings gate has nothing to hold.',
  alts: { empty: "Step 1's guide: Room A's empty room from Lyra's place, the south wall ahead, a light bar across the ceiling",
    guide: "The guide with the furniture: Echo's open cabinet at the left edge and Atlas's crates on the right" },
};

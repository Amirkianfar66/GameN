// Sheet RA-A's prompts (Room A, view A): three steps as Room B's PV6 sheets have them. Step 1 paints the empty room over the
// empty-room guide; step 2 is one masked PLACE edit of that picture inside the furniture's outlines grown 6 px; step 3 is one masked
// edit of the kept step-2 picture inside the food capsule's outline grown 2 px. The style block is the owner's text (pv1-shared
// version 2) with PV6-A's two changes, the second written for Room A's blue in place of Room B's purple; the keep-out block is
// version 2's, word for word. The colour, room, view, PLACE and capsule blocks are new for Room A, from the approved plan (version
// 7) and the tokens. No second picture: this is Room A's first view, and no picture of Room A exists yet. Version 3 (the Lead, 19
// November): step 2's upper area also holds the plain-wall area (plainA.json), which the PLACE text names in one sentence; the
// cabinet's height is read from the layout. Version 4: the cabinet has no door, and its size is read from the layout too. Exports
// the prompts.
import { readFileSync } from 'fs';
import { GW, GH, room } from './guideA.mjs';
const DIR = new URL('./', import.meta.url).pathname, V2 = JSON.parse(readFileSync(DIR + '../../roomb/ring/room-b-pv1p.json', 'utf8'));
export const STYLE_CHANGES_A = [
  ['Use controlled colour palettes with selective luminous accents, giving each location its own atmosphere.', 'Use controlled colour palettes with warm luminous accents against cool shadow, giving each location its own atmosphere.'],
  ['Overall: dark, cyber, noir, illustrated science fiction.', 'Overall: lived-in, cyber, illustrated science fiction, lit and readable: warm lamplight against cool blue-steel shadow, dark only in the corners.'],
];
export const STYLE_A = STYLE_CHANGES_A.reduce((t, [a, b]) => { if (t.split(a).length !== 2) throw new Error('not in the owner\'s style text: ' + a); return t.replace(a, b); }, V2.blocks.style);
export const COLOUR_A = 'Room A, the crew bay, in the same illustrated world: blue steel, lit warm. The whole room is one blue-steel family, the colours of the attached guide: deep navy in the shadows and corners (#14243F, #1D3D6B), steel blue on the walls and the deck (#2D609E), turning paler where the light falls (#5C92CC, #A9CAEB). The light is warm: the two light bars glow cream along their length (#FCE3A0), with a warm paper-white glow (#F4EBDD) on the ceiling around them and soft pools of pale light on the deck below. Walls, panels, pipes, cables and deck plates take their colour from that family; worn edges, rivets and plate seams show a little rust (#75402E); nothing is neutral grey, and nothing is tan, beige, olive, purple or violet. The shadows are deep navy, never black-brown or grey. Labels and paper are blank, in a warm paper white (#F4EBDD). Small indicator lights are warm orange (#EC793C); no other coloured light, and no green, purple or red light. Practical and worn, a working bay, quiet but lived in. The guide is the room\'s colour plan: paint over it in full detail and texture, but keep its colours and where its light falls.';
export const ROOM_A = 'The room: Room A, the crew bay, a 4 m square room with a 3 m ceiling, here with no furniture in it. The ceiling is solid steel panels, with no skylight and no opening in it: two long light bars set into it run across the room about 1.4 m apart, each glowing warm cream along its whole length behind a plain diffuser, lighting the ceiling around it and throwing soft pools of light on the deck below. The walls are steel panels, pipes, conduits, cable runs and small lockers, worn and repaired, darker toward the deck, with a narrow rust-brown kick strip along their foot; the deck is metal plates with seams, scuffs and a little rust, lit pale under the light bars and darker toward the corners. No beams, rays or shafts of light in the air.';
export const LENS_A = 'View: a straight-lined view at standing eye height, exactly as the attached guide shows: 80 degrees across and level, every vertical line perfectly straight and upright, every straight line in the room straight in the picture. The horizon, at eye level, is a straight line 714 px from the top, a little above the middle. Match the guide\'s layout, perspective, horizon and proportions exactly, line for line, as its floor seams, wall bases, corners and ceiling edges show. Do not curve the lines, tilt the view, zoom in or out, or move the horizon.';
export const LINE_A = 'This picture: from a place by the north wall, west of its middle, at standing eye height, looking diagonally across the room toward its south-east corner, which stands right of the middle. Ahead and on the left, the east wall; on the right, past the corner, the south wall. Above, the solid ceiling, with the two light bars running from its middle up to the right and out of the picture at its top and right edges, the nearer one higher. The deck is open and clear, with nothing standing on it, while the walls keep their pipes, panels and conduits.';
export const OUT = V2.blocks.out;
// step 2, PLACE: the furniture of view A, where the kit's pieces fall in the picture (kit-A.json)
export const open2 = n => `This is a correction of the attached picture. Repaint only the masked ${n === 1 ? 'area' : 'areas'}, and leave everything outside ${n === 1 ? 'it' : 'them'} exactly as it is.`;
const COUNT = ['no', 'one', 'two', 'three', 'four'];
const KIT = JSON.parse(readFileSync(DIR + 'kit-A.json', 'utf8'));
const by = n => { const p = KIT.pieces.find(p => p.name === n); if (!p) throw new Error('kit-A.json: no ' + n); return p; };
const PANEL = room.objects.find(o => o.name === 'electrical panel'), m1 = v => String(+v.toFixed(2)), tall = String(+(PANEL.h - PANEL.y0 + 1e-9).toFixed(2)), wide = String(+PANEL.w.toFixed(1));
if (room.objects.some(o => o.name === 'panel door')) throw new Error('the PLACE text says the cabinet has no door');
const third = p => (p.visibleCentreX < GW / 3 ? 'on the left' : p.visibleCentreX > (2 * GW) / 3 ? 'on the right' : 'ahead');
export function placeTextA() {
  const cab = by('electrical cabinet'), hatch = by('floor hatch'), lid = by('hatch lid'), box = by('toolbox');
  const n = KIT.shapes.length, furniture = KIT.pieces.filter(p => p.kind !== 'background'); if (furniture.length !== 4 || n !== 2) throw new Error('step 2 expects the four pieces of furniture and the plain wall in two masked areas');
  const upper = KIT.shapes.find(sh => sh.pieces.some(i => KIT.pieces[i].name === 'electrical cabinet')), names = upper.pieces.map(i => KIT.pieces[i].name).sort().join(' + ');
  if (names !== 'electrical cabinet + plain wall' || by('plain wall').kind !== 'background') throw new Error('the upper area holds ' + names);
  if (lid.visibleCentreX >= hatch.visibleCentreX) throw new Error('the lid is not left of the hatch');
  const boxAt = box.cutByEdge && box.bbox[3] === GH ? 'At the bottom edge, nearest, cut off by it' : `${third(box)[0].toUpperCase()}${third(box).slice(1)}, nearest`;
  return `${open2(n)} ${n === 1 ? 'The masked area holds' : `The ${COUNT[n]} masked areas hold`} four pieces of furniture, each filling its own part ${n === 1 ? 'of the area ' : ''}exactly, painted in full detail in the picture's style and light. ${third(cab)[0].toUpperCase()}${third(cab).slice(1)}, in the upper area, mounted on the back wall about ${m1(PANEL.y0)} m above the deck: a steel electrical cabinet, about ${wide} m wide and ${tall} m tall, with no door, its front open on rows of breakers and neatly bundled cables, every cable in its place and none hanging loose, with two small warm orange indicator lights near its top. The rest of the upper area, mostly to the cabinet's left, is plain wall: paint it as the same steel wall panels as the wall around it, with their seams, rivets and wear, and with nothing on them: no lockers, doors, vents, papers, boxes or panels. Lower, ${third(hatch) === 'ahead' ? 'ahead and to the left' : third(hatch)}, in the deck: an open hatch, a long rectangular opening about 1 m by 0.5 m with a raised steel rim all round, its near edge crisp and lit, showing a dark space beneath with pipes and cables; at its far end, on the left, its heavy steel lid, hinged along that edge and raised almost upright. ${boxAt}: a closed steel toolbox standing on the deck beside the hatch's near end.`;
}
// step 3: the food capsule alone, a wall unit on its bracket (Room A's kind in ship life), its front as PV6-B-4 painted Room B's
// unit, so the ship's dispensers match; the room paints it closed and unlit, and code draws its open hatch, compartment, tray, light
// and shutter over it, as in Room B
export const OPEN3 = 'This is a correction of the attached picture. Repaint only the masked shape, and leave everything outside it exactly as it is.';
export const CAPSULE_FRONT = 'a small round lens high on its front, unlit and dark; below it, a large closed hatch of warm paper-white filling most of the front, with a small dark handle along its bottom edge; no vent slots; nothing written, printed or lit on it';
export function step3TextA() {
  const cap = KIT.pieces3.find(p => p.name === 'food capsule'); if (!cap || KIT.shapes3.length !== 1) throw new Error('step 3 expects the capsule alone');
  return `${OPEN3} The masked shape holds one small food dispenser that fills the shape exactly, with nothing of it outside the shape, painted in full detail in the picture's style and light. It is mounted on the back wall, ${third(cap)}, on a bracket in the wall's own colours, at waist to chest height: a narrow upright steel housing about 0.32 m wide, 0.55 m tall and 0.22 m deep; ${CAPSULE_FRONT}. Paint it in the same metal, paint and wear as the furniture in the picture.`;
}
export function prompts() {
  return { s1: [STYLE_A, COLOUR_A, ROOM_A, LENS_A, LINE_A, OUT].join('\n\n'), s2: [STYLE_A, COLOUR_A, placeTextA(), OUT].join('\n\n'), s3: [STYLE_A, COLOUR_A, step3TextA(), OUT].join('\n\n') };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { const p = prompts(); for (const [k, t] of Object.entries(p)) console.log(`\n===== ${k}: ${t.length} characters\n${t}`); }
// Version 6 (the Lead, 13:07 and 13:24 on 19 November): step 4, a fix over RA-A-4, the cabinet's right side, one masked edit of the
// picture itself, with no guide in it. The text is the opening sentence and the Lead's words (fix4A.json), with the style and the
// keep-out blocks; the colour block is left out, as it speaks of a guide and step 4's input has none: the picture carries its own
// colours. Steps 1 to 3's prompts are version 4's, unchanged.
export const OPEN4 = 'This is a correction of the attached picture. Repaint only the masked area, and leave everything outside it exactly as it is.';
export function step4TextA() { const F = JSON.parse(readFileSync(DIR + 'fix4A.json', 'utf8')); return [OPEN4, ...F.fixText].join(' '); }
export function prompt4() { return [STYLE_A, step4TextA(), OUT].join('\n\n'); }

// Room A's stand-ins for the layout test: the approved crew drawing (crew-drawing-1.0.0, as the game draws it) of each person
// in the place's own Room A gesture, the one the Board and ship life use for that work (design/board-motion/scenes/room-a.mjs,
// design/ship-life/activities.mjs): the electrical panel (wallPanelBack), the PC workstation (consoleBack), the floor hatch
// (crouchHatch), the open deck (think) and the crates (leanCrates). Each picture shows the person named, never another
// person's face. Writes <place>.svg (900 x 900, the framing of Room B's stand-ins: the feet at 152, 273 of the 300 box).
// Generates nothing.
import { writeFileSync } from 'fs';
import { CREW } from '../../pr284/apps/game/hosted/crew-drawing/crew.mjs';
import { dressedFigureSvg } from '../../pr284/apps/game/hosted/crew-drawing/wardrobe.mjs';
import { skeletonOf } from '../../pr284/apps/game/hosted/scene-drawing/gestures.mjs';
import { CAST } from './cast.mjs';
for (const [place, c] of Object.entries(CAST)) {
  const inner = dressedFigureSvg(CREW[c.crew], skeletonOf(c.gesture), { outfit: 'crew', prefix: `sA${place}`, inline: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="-90 -40 300 300">${inner.startsWith('<svg') ? inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : inner}</svg>`;
  writeFileSync(new URL(`./${place}.svg`, import.meta.url), svg); console.log(place, c.name, c.gesture, svg.length);
}

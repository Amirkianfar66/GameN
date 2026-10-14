// mothership:dev-only
//
// The room clothes on the prototype's boards (figures/wardrobe.mjs, issue #121). board.js is a
// frozen, reviewed drawing source (design/tools/lib/reviewed-drawing-ports.json), so the
// prototype dresses its pieces after each update instead of changing it: a piece in the
// Hospital is drawn in the gown, one in the Jail in the striped suit, from the seat's public
// location only. The production board does the same by calling wardrobe.mjs's
// dressedFigureSvg where it calls body.mjs's figureSvg today (docs/design/phone-kit-handoff.md).

import { skeletonOf } from '../figures/gestures.mjs';
import { CREW as FIGURES } from '../figures/crew.mjs';
import { dressedFigureSvg, outfitFor } from '../figures/wardrobe.mjs';
import { drawFigure } from './board.js';
import { LOCATION_OF } from './layout.js';

/** The clothes of a board room (a panel's data-room): the location's. */
export const outfitOfRoom = room => outfitFor(LOCATION_OF[room]);

/** What this module last drew into a figure element: the drawing itself, so that a later redraw by board.js is told apart. */
const dressed = new WeakMap();

/**
 * Draws a gesture of a character into a figure element in an outfit, as board.js's drawFigure
 * does in the crew suit: redrawn only when the character, the gesture or the clothes changed.
 * data-drawn keeps board.js's meaning (character|gesture), whatever the clothes.
 */
export function drawDressedFigure(body, front, character, gesture, prefix, sk = skeletonOf(gesture), outfit = 'crew') {
  const key = `${character}|${gesture}`;
  const was = dressed.get(body);
  const current = was && was.svg === body.firstElementChild;
  if (outfit === 'crew') {
    // Back in the crew suit: board.js draws it, from scratch while the drawing is still another outfit's.
    if (current) delete body.dataset.drawn;
    dressed.delete(body);
    drawFigure(body, front, character, gesture, prefix, sk);
    return;
  }
  if (gesture !== '*' && current && was.key === key && was.outfit === outfit && body.dataset.drawn === key) return;
  body.dataset.drawn = key;
  body.innerHTML = dressedFigureSvg(FIGURES[character], sk, { outfit, prefix: `${prefix}b` });
  if (front) front.innerHTML = (sk.front ?? []).length ? dressedFigureSvg(FIGURES[character], sk, { outfit, prefix: `${prefix}f`, layer: 'front' }) : '';
  dressed.set(body, { svg: body.firstElementChild, key, outfit });
}

/**
 * Dresses every piece of a board after board.update: the clothes of the seat's public location.
 * A piece the motion director is moving is left to it (it changes clothes as it lands).
 */
export function dressBoard(board, seats) {
  for (const seat of seats) {
    const piece = board.pieces.get(seat.n);
    if (!piece) continue;
    const outfit = outfitFor(seat.location);
    piece.dataset.outfit = outfit;
    if (outfit === 'crew' || piece.dataset.moving !== undefined) continue;
    drawDressedFigure(piece.querySelector('.bm-piece__body'), piece.querySelector('.bm-piece__front'), seat.character, piece.dataset.gesture, `${board.prefix}${seat.n}`, undefined, outfit);
  }
}

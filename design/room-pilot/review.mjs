// mothership:dev-only
//
// The room pilot's review page (design/room-pilot/review.html), for the owner: Room A as the board
// shows it today (design-0.7.0's scene picture) and redrawn (room-a.mjs). In both, the approved
// crew (the release's figures, design/crew-drawing/source/) stand in the room's five places, each
// at its slot's own point, scale and facing. They are drawn as the board draws them: every body
// under every front layer, the farther places first.
//   ?view=compare (the default): the two rooms side by side, then the part every panel shows whole
//                                (the scene's focus) and the redrawn room empty;
//   ?view=room:                  the redrawn room with the crew, 1024 x 768;
//   ?view=empty:                 the redrawn room alone.

import { FRAME, hasFront } from '../board-motion/figures/body.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { dressedFigureSvg } from '../crew-drawing/source/wardrobe.mjs';
import { roomAPilotSvg, SCENE } from './room-a.mjs';

window.__designReady = false;

const TODAY = '../board-motion/assets/scenes/room-a.back.svg';
const FULL = [0, 0, 1024, 768];

/** Who stands where in the review: every build, both facings, a back, a crouch and a lean. */
export const CAST = Object.freeze({ A1: 'c1', A2: 'c8', A3: 'c3', A4: 'c4', A5: 'c9' });

/** The crew in the scene's places, as the board composes them: bodies far to near, then the front layers. */
function crew(prefix) {
  const [ax, ay] = FRAME.anchor, [bx, by, bw] = FRAME.box;
  const bodies = [], fronts = [];
  for (const slot of [...SCENE.slots].sort((a, b) => a.at[1] - b.at[1])) {
    const sk = skeletonOf(slot.gesture), s = slot.scale, ox = (ax - bx) * s, oy = (ay - by) * s;
    const style = `left:${slot.at[0] - ox}px;top:${slot.at[1] - oy}px;width:${bw * s}px;height:${bw * s}px;transform-origin:${ox}px ${oy}px`;
    const piece = layer => `<div class="piece" data-slot="${slot.id}" data-mirror="${Boolean(slot.mirror)}" style="${style}">${dressedFigureSvg(CREW[CAST[slot.id]], sk, { prefix: `${prefix}-${slot.id}-${layer}`, layer })}</div>`;
    bodies.push(piece('body'));
    if (hasFront(sk)) fronts.push(piece('front'));
  }
  return bodies.join('') + fronts.join('');
}

/** A room as the board shows it, cropped to part of the picture and scaled. */
function room(which, prefix, { cast = true, crop = FULL, scale = 1 } = {}) {
  const [x0, y0, x1, y1] = crop;
  const picture = which === 'today'
    ? `<img src="${TODAY}" alt="" width="1024" height="768">`
    : `<div class="room">${roomAPilotSvg({ prefix: `${prefix}-room` })}</div>`;
  return `<div class="frame" data-room="${which}" style="width:${(x1 - x0) * scale}px;height:${(y1 - y0) * scale}px">`
    + `<div class="scene" style="transform:scale(${scale}) translate(${-x0}px,${-y0}px)">${picture}${cast ? crew(prefix) : ''}</div></div>`;
}

const cell = (title, note, body) => `<div class="cell"><h2>${title} <small>${note}</small></h2>${body}</div>`;
const names = SCENE.slots.map(slot => `${slot.id} ${CREW[CAST[slot.id]].sign}`).join(', ');

function compare() {
  return `<header><h1>Room A, redrawn to match the crew</h1>`
    + `<p>A pilot for the owner. The same room, camera, places, props and colour family as today's; only the drawing changes: the crew's own ink, cel shadows and hatching, noir light from the two ceiling bars, Room A's blues. The approved crew stand in the five places (${names}).</p></header>`
    + `<div class="row">${cell('Today', 'design-0.7.0', room('today', 't', { scale: 0.75 }))}${cell('Redrawn', 'the pilot, in no release', room('pilot', 'p', { scale: 0.75 }))}</div>`
    + `<div class="row">${cell('Today', 'the focus, which every panel shows whole', room('today', 'tf', { crop: SCENE.focus }))}`
    + `${cell('Redrawn', 'the focus', room('pilot', 'pf', { crop: SCENE.focus }))}`
    + `${cell('Redrawn, empty', 'the room alone', room('pilot', 'pe', { cast: false, scale: 0.75 }))}</div>`
    + `<footer>A design review page in desktop Chrome: it shows the drawing, not how a phone shows or runs it. Nothing here changes a place, a slot, the camera, the focus or a press area.</footer>`;
}

const view = new URLSearchParams(location.search).get('view') ?? 'compare';
document.documentElement.dataset.view = view;
document.getElementById('root').innerHTML = view === 'room' ? room('pilot', 'r')
  : view === 'empty' ? room('pilot', 'e', { cast: false })
    : compare();
await Promise.all([...document.images].map(image => image.decode()));
window.__designReady = true;

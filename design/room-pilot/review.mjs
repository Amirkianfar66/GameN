// mothership:dev-only
//
// The room pilot's review page (design/room-pilot/review.html), for the owner: each room as the
// board shows it today and redrawn (./rooms.mjs), with the approved crew (the release's figures,
// design/crew-drawing/source/) in its places, dressed as the board dresses them there (a gown in
// the Hospital, a prisoner's suit in the Jail). Each stands at its slot's own point, scale and
// facing, and the board's layering is kept: the back picture, then each figure's body and each
// layer of the room (a bench, a table, a berth) by depth, every figure's front layer over them.
// Today's pictures and the redrawn ones are files (the redrawn written by
// design/tools/room-pilot-render.mjs), shown as images.
//   ?view=compare&room=<id> (the default, Room A): today's room and the redrawn one, side by side;
//   ?view=board:                                   the five redrawn rooms together;
//   ?view=room&room=<id>:                          one redrawn room with the crew, 1024 x 768.

import { FRAME, hasFront } from '../board-motion/figures/body.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { dressedFigureSvg, outfitFor } from '../crew-drawing/source/wardrobe.mjs';
import { ROOMS, roomOf } from './rooms.mjs';

window.__designReady = false;

// A repository path as this page (design/room-pilot/review.html) reaches it.
const url = path => `../${path.replace(/^design\//, '')}`;

/** A room as the board composes it, cropped to part of the picture and scaled. */
function panel(r, which, prefix, { scale = 1, cast = true } = {}) {
  const art = r[which];
  const [ax, ay] = FRAME.anchor, [bx, by, bw] = FRAME.box;
  const parts = [`<img src="${url(art.back)}" alt="" width="1024" height="768" style="z-index:0">`];
  for (const [id, layer] of Object.entries(r.scene.layers ?? {})) {
    parts.push(`<img src="${url(art.layers[id])}" alt="" width="1024" height="768" data-layer="${id}" style="z-index:${Math.round(layer.depth) * 2 + 1}">`);
  }
  if (cast) {
    for (const slot of r.scene.slots) {
      const who = CREW[r.cast[slot.id]], sk = skeletonOf(slot.gesture), s = slot.scale;
      const depth = Math.round(slot.depth ?? slot.at[1]), ox = (ax - bx) * s, oy = (ay - by) * s;
      const box = `left:${slot.at[0] - ox}px;top:${slot.at[1] - oy}px;width:${bw * s}px;height:${bw * s}px;transform-origin:${ox}px ${oy}px`;
      const piece = (layer, z) => `<div class="piece" data-slot="${slot.id}" data-mirror="${Boolean(slot.mirror)}" style="${box};z-index:${z}">${dressedFigureSvg(who, sk, { outfit: outfitFor(r.name), prefix: `${prefix}-${slot.id}-${layer}`, layer })}</div>`;
      parts.push(piece('body', depth * 2));
      if (hasFront(sk)) parts.push(piece('front', 1500 + depth));
    }
  }
  return `<div class="frame" data-room="${r.id}" data-art="${which}" style="width:${1024 * scale}px;height:${768 * scale}px">`
    + `<div class="scene" style="transform:scale(${scale})">${parts.join('')}</div></div>`;
}

const cell = (title, note, body) => `<div class="cell"><h2>${title} <small>${note}</small></h2>${body}</div>`;
const names = r => r.scene.slots.map(slot => `${slot.id} ${CREW[r.cast[slot.id]].sign}`).join(', ');

function compare(r) {
  const how = r.id === 'room-a'
    ? 'Drawn by hand and approved by the owner on 8 November 2026; the frame line no longer crosses the props in front of it.'
    : "Redrawn shape for shape from today's picture in the same hand as Room A, and as dark.";
  return `<header><h1>${r.name}, redrawn to match the crew</h1>`
    + `<p>The same room, camera, places, props and colour family as today's; only the drawing changes: the crew's own ink, cel shadows and hatching, noir light. ${how} The crew stand in its places (${names(r)}).</p></header>`
    + `<div class="row">${cell('Today', 'design-0.7.0', panel(r, 'today', 't', { scale: 0.75 }))}${cell('Redrawn', 'the pilot, in no release', panel(r, 'redrawn', 'p', { scale: 0.75 }))}</div>`
    + '<footer>A design review page in desktop Chrome: it shows the drawing, not how a phone shows or runs it. Nothing here changes a place, a slot, the camera, the focus or a press area.</footer>';
}

function board() {
  return '<header><h1>The five rooms, redrawn to match the crew</h1><p>In the board\'s reading order: the Command Room, Room A, Room B, the Hospital and the Jail, each with the crew in its places.</p></header>'
    + `<div class="grid">${ROOMS.map(r => cell(r.name, '', panel(r, 'redrawn', `b-${r.prefix}`, { scale: 0.5 }))).join('')}</div>`
    + '<footer>A design review page in desktop Chrome: the board arranges these panels its own way on each screen.</footer>';
}

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'compare';
const chosen = roomOf(params.get('room') ?? 'room-a');
if (!chosen) throw new Error(`No room ${params.get('room')}`);
document.documentElement.dataset.view = view;
document.getElementById('root').innerHTML = view === 'room' ? panel(chosen, 'redrawn', 'r') : view === 'board' ? board() : compare(chosen);
await Promise.all([...document.images].map(image => image.decode()));
window.__designReady = true;

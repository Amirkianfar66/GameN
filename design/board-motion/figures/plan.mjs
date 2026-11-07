// mothership:dev-only
//
// Plans the board-motion figures: for every gesture, a sheet of the nine characters side by side
// as one editable SVG. The board draws its figures live from the rig (body.mjs) and public facts
// and loads no figure art, so the sheets are not kept in the repository: the manifest records
// each one's colors and hash, and design/tools/board-motion-assets.mjs --sheets <dir> writes them
// for an illustrator or a reviewer.

import { createHash } from 'node:crypto';
import { canvas } from './rig.mjs';
import { CREW } from './crew.mjs';
import { FIGURE_VERSION, FRAME, drawFigure } from './body.mjs';
import { ABOUT, GESTURES, skeletonOf } from './gestures.mjs';

export { FIGURE_VERSION };
const sha = content => createHash('sha256').update(content).digest('hex');
export const colorsOf = svg => [...new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map(match => match[1].toUpperCase()))].sort();

/** One character in one gesture (a name of GESTURES, marked +injured or not): its body and its front layer, as SVG markup without the outer element. */
export function figureDocument(id, gesture) {
  const cv = canvas(`${id}-${gesture.replace('+', '-')}`);
  drawFigure(cv, CREW[id], skeletonOf(gesture));
  const [x, y, w, h] = FRAME.box;
  const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const body = inner(cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h, header: '', layer: 'body', inline: true }));
  const front = inner(cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h, header: '', layer: 'front', inline: true })).replace(/^<defs>[\s\S]*?<\/defs>/, '');
  return { body, front, hasFront: (skeletonOf(gesture).front ?? []).length > 0 };
}

export function planFigures() {
  const files = new Map();
  const entries = [];
  const [x, y, w, h] = FRAME.box;
  const ids = Object.keys(CREW);
  for (const gesture of Object.keys(GESTURES)) {
    const cells = ids.map((id, index) => {
      const { body, front } = figureDocument(id, gesture);
      // Each character in its own group, side by side, its front layer last: what lies over the place's prop.
      return `  <g id="${id}" transform="translate(${index * w} 0)">${body}<g id="${id}-front">${front}</g></g>`;
    });
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · board-motion proposal ${FIGURE_VERSION} · figure sheet · ${gesture} · generated, do not edit by hand
  ${ABOUT[gesture]}
  The nine characters, left to right ${ids.join(', ')}, each in the shared figure frame (${FRAME.box.join(' ')}: the floor at
  y ${FRAME.floor}, a place's anchor at x ${FRAME.anchor[0]}). Drawn by design/board-motion/figures/ (rig.mjs, crew.mjs, parts.mjs,
  body.mjs, gestures.mjs) by design/tools/board-motion-assets.mjs; the prototype draws the same live. Each character's
  group "<id>-front" is what lies over the prop of its place. Not in the reviewed manifest design-0.2.0.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w * ids.length} ${h}" width="${w * ids.length}" height="${h}">
${cells.join('\n')}
</svg>
`;
    const file = `${gesture}.svg`;
    files.set(file, svg);
    entries.push({
      id: `figure.${gesture}`, sheet: file, gesture, about: ABOUT[gesture], characters: ids, frame: FRAME.box.join(' '), anchor: FRAME.anchor,
      front: (GESTURES[gesture].front ?? []).length > 0, colors: colorsOf(svg), bytes: Buffer.byteLength(svg), sha256: sha(svg), audience: 'public', drawnLive: true,
    });
  }
  return { files, entries };
}

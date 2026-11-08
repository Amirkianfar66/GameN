// mothership:dev-only
//
// A redrawn room with its lights out: the Blackout's picture of the room (room-drawing-1.0.0,
// docs/design/room-drawing-release.md), drawn from the redrawn pictures themselves, so that the
// room keeps its shapes when the lights fail. The night rule is the reviewed one
// (design/board-v2/scenes/lighting.mjs: nightFill, nightSpace and the faint steel line), read and
// not changed, applied to the crew's ink:
//  - the room's light is taken away: every group marked data-light (shafts, pools, glows, the
//    side walls' and the panel's dark, which the night has already);
//  - every fill goes almost to ink (nightFill), with a trace of its room's hue;
//  - the ink's outlines and hand-drawn lines go to faint steel, so the room still reads as a room;
//    the ink's hatching and grain and the crew's rim light go dark with the fills;
//  - the view through a window (data-space) is dimmed more gently (nightSpace).
// The back picture and the layers in front of the places are drawn together, as today's
// lights-out pictures are.

import { NIGHT, nightFill, nightSpace } from '../board-v2/scenes/lighting.mjs';
import { INK } from '../crew-drawing/source/ink.mjs';
import { parseSvg } from './ink-room.mjs';

const RIM = '#D8E0E8';
const HEX = /^#[0-9A-Fa-f]{6}$/;

function recolour(node, { space, pattern }) {
  const a = { ...node.attrs };
  const fill = a.fill?.toUpperCase(), stroke = a.stroke?.toUpperCase(), stop = a['stop-color']?.toUpperCase();
  if (space) {
    if (HEX.test(fill ?? '')) a.fill = nightSpace(fill);
    if (HEX.test(stroke ?? '')) a.stroke = nightSpace(stroke);
    if (HEX.test(stop ?? '')) a['stop-color'] = nightSpace(stop);
    return a;
  }
  // An outline the ink drew (a ribbon round a form) is a line: faint steel.
  if (HEX.test(fill ?? '')) a.fill = node.tag === 'path' && fill === INK && a['fill-rule'] === 'evenodd' ? NIGHT.line : nightFill(fill);
  if (HEX.test(stroke ?? '')) a.stroke = pattern || stroke === RIM ? nightFill(stroke) : NIGHT.line;
  if (HEX.test(stop ?? '')) a['stop-color'] = nightFill(stop);
  return a;
}

function write(node, context) {
  if (node.attrs['data-light'] !== undefined) return '';
  const inner = {
    space: context.space || node.attrs['data-space'] !== undefined,
    pattern: context.pattern || node.tag === 'pattern',
  };
  const attrs = Object.entries(recolour(node, inner)).filter(([name]) => name !== 'data-space').map(([name, value]) => ` ${name}="${value}"`).join('');
  const children = node.children.map(child => write(child, inner)).join('');
  return children ? `<${node.tag}${attrs}>${children}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

const refsOf = text => new Set([...text.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]));

/**
 * The lights-out picture of a room: pictures, its redrawn back and then its layers by depth (SVG
 * text, each with its own ids). Definitions nothing in the night picture uses (the light's
 * gradients) are left out.
 */
export function nightRoomSvg(pictures) {
  const defs = new Map();
  let body = '';
  for (const text of pictures) {
    const svg = parseSvg(text);
    for (const child of svg.children) {
      if (child.tag === 'defs') {
        for (const def of child.children) defs.set(def.attrs.id, write(def, { space: false, pattern: false }));
      } else body += write(child, { space: false, pattern: false });
    }
  }
  // The definitions the picture uses, and those they use in turn.
  const used = new Set();
  const queue = [...refsOf(body)];
  while (queue.length) {
    const id = queue.pop();
    if (used.has(id) || !defs.has(id)) continue;
    used.add(id);
    queue.push(...refsOf(defs.get(id)));
  }
  const kept = [...defs].filter(([id]) => used.has(id)).map(([, def]) => def).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768"><defs>${kept}</defs>${body}</svg>`;
}

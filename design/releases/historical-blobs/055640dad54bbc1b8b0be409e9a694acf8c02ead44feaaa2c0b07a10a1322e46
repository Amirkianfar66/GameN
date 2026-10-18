//
// The drawing kit of the board-motion room scenes (owner's decision of 9 October 2026: each
// room a scene with five fixed places). A scene is drawn as the approved room sources are:
// in the neutral steel palette, ink and paper, then printed in its room's own color family
// by the recolor map of the reviewed export recipe. Every shape stays inside the drawing
// vocabulary (paths, shapes, patterns, clip paths); nothing is written, and nothing in a
// scene says which rooms connect.

export const INK = '#151923';
export const CANVAS = '#10141C';
export const PAPER = '#F4EBDD';
export const PAPER_SHADE = '#E3D6C2';
export const PAPER_DEEP = '#CBBBA2';
/** The neutral family a scene is drawn in; the export recipe swaps it for the room's. */
export const S = { deep: '#222B3A', shadow: '#34415A', mid: '#55657E', light: '#8696AE', pale: '#B9C4D3' };

const f = n => Number(n.toFixed(1));
export const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

/** A filled, inked polygon. */
export const poly = (points, fill, { stroke = 3, opacity = null } = {}) =>
  `<polygon points="${pts(points)}" fill="${fill}"${stroke ? ` stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
/** A filled path, inked unless stroke is 0. */
export const path = (d, fill, { stroke = 3, opacity = null, rule = null } = {}) =>
  `<path d="${d}" fill="${fill}"${rule ? ` fill-rule="${rule}"` : ''}${stroke ? ` stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
/** An open stroke. */
export const line = (d, { color = INK, width = 3, opacity = null, cap = 'round' } = {}) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
export const rect = (x, y, w, h, fill, { stroke = 3, rx = 0, opacity = null } = {}) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"${stroke ? ` stroke="${INK}" stroke-width="${stroke}"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
export const circle = (cx, cy, r, fill, { stroke = 3, opacity = null } = {}) =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${stroke ? ` stroke="${INK}" stroke-width="${stroke}"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
export const ellipse = (cx, cy, rx, ry, fill, { stroke = 0, opacity = null } = {}) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${stroke ? ` stroke="${INK}" stroke-width="${stroke}"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
/**
 * The halftone patterns of every scene: the approved rooms' dots (ink s, m, l; paper s, m),
 * under the scene's own ids so a scene never depends on how a source named its own.
 */
export const SCENE_DEFS = [['ink', 's', 1.5], ['ink', 'm', 2.5], ['ink', 'l', 3.5], ['paper', 's', 1.5], ['paper', 'm', 2.6]]
  .map(([tone, size, r]) => `<pattern id="bm-ht-${tone}-${size}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="${r}" fill="${tone === 'ink' ? INK : PAPER}"/></pattern>`).join('');
const dots = (size, paper) => `url(#bm-ht-${paper ? 'paper' : 'ink'}-${size})`;

/** Halftone over a region: s, m or l ink dots, or s or m paper dots. */
export const halftone = (points, size = 's', { paper = false, opacity = null } = {}) =>
  `<polygon points="${pts(points)}" fill="${dots(size, paper)}"${opacity === null ? '' : ` opacity="${opacity}"`}/>`;
export const group = (inner, { transform = null, clip = null, opacity = null } = {}) =>
  `<g${transform ? ` transform="${transform}"` : ''}${clip ? ` clip-path="url(#${clip})"` : ''}${opacity === null ? '' : ` opacity="${opacity}"`}>${inner.join('')}</g>`;

/**
 * A box in the room's oblique camera: its front face, its top and its right side, so that it
 * reads as a solid. x, y: the front face's lower left corner on the floor; w, h its size; d
 * the depth of the top and side (they recede up and to the right).
 */
export function box(x, y, w, h, d, { front = S.light, top = S.pale, side = S.mid, stroke = 3, shade = true } = {}) {
  const dx = d * 0.55, dy = d * 0.45;
  const out = [
    poly([[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]], side, { stroke }),
    poly([[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]], top, { stroke }),
    poly([[x, y], [x + w, y], [x + w, y - h], [x, y - h]], front, { stroke }),
  ];
  if (shade) out.push(halftone([[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]], 's'));
  return out.join('');
}

/** A soft pool of light on the floor: a pale ellipse with a halftone rim. */
export const lightPool = (cx, cy, rx, ry, { tone = S.pale } = {}) => [
  `<path fill-rule="evenodd" fill="${dots('s', true)}" d="M${cx - rx * 1.14} ${cy} A${rx * 1.14} ${ry * 1.16} 0 1 0 ${cx + rx * 1.14} ${cy} A${rx * 1.14} ${ry * 1.16} 0 1 0 ${cx - rx * 1.14} ${cy} Z M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z"/>`,
  ellipse(cx, cy, rx, ry, tone),
].join('');

/** A cone of light from a ceiling fixture to the floor, as a pale translucent wedge. */
export const lightCone = (top, bottom, { opacity = 0.12, tone = PAPER } = {}) => poly([...top, ...bottom.slice().reverse()], tone, { stroke: 0, opacity });

/** A monitor on a stand: its frame, a glowing screen with marks (no words) and its glow. */
export function monitor(x, y, w, h, { tilt = 0, glow = true } = {}) {
  const out = [];
  if (glow) out.push(ellipse(x + w / 2, y + h / 2, w * 0.95, h * 0.9, PAPER, { opacity: 0.1 }));
  out.push(rect(x + w / 2 - 6, y + h, 12, 16, S.shadow, { stroke: 2.5 }));
  out.push(rect(x + w / 2 - 20, y + h + 14, 40, 7, S.shadow, { stroke: 2.5, rx: 2 }));
  out.push(rect(x, y, w, h, S.deep, { stroke: 3.5, rx: 4 }));
  out.push(rect(x + 6, y + 6, w - 12, h - 12, S.pale, { stroke: 0, rx: 2 }));
  out.push(line(`M${x + 12} ${y + 16} H${x + w * 0.62} M${x + 12} ${y + 26} H${x + w * 0.78} M${x + 12} ${y + 36} H${x + w * 0.45}`, { color: S.mid, width: 3 }));
  out.push(line(`M${x + w * 0.62} ${y + h - 12} L${x + w * 0.7} ${y + h - 22} L${x + w * 0.78} ${y + h - 16} L${x + w - 12} ${y + h - 28}`, { color: S.light, width: 2.5 }));
  out.push(path(`M${x + 6} ${y + 6} H${x + w * 0.42} L${x + 6} ${y + h * 0.6} Z`, PAPER, { stroke: 0, opacity: 0.45 }));
  return tilt ? group(out, { transform: `rotate(${tilt} ${x + w / 2} ${y + h})` }) : out.join('');
}

/**
 * The deck every room stands on, in the approved camera (back edge y 372, front edge y 748),
 * without the approved token pool: plates, shade under the back wall and the dark left side,
 * pools of light where the ceiling lights fall, rivets. clip: the source's floor clip id.
 */
export function deck(clip, { pools = [], extra = '' } = {}) {
  return [
    poly([[120, 372], [904, 372], [1004, 748], [20, 748]], S.light, { stroke: 0 }),
    `<g clip-path="url(#${clip})">`,
    poly([[113, 398], [911, 398], [904, 372], [120, 372]], S.mid, { stroke: 0 }),
    poly([[120, 372], [196, 372], [132, 748], [20, 748]], S.mid, { stroke: 0 }),
    halftone([[196, 372], [250, 372], [210, 748], [132, 748]], 'm'),
    halftone([[250, 372], [296, 372], [272, 748], [210, 748]], 's'),
    halftone([[110, 398], [914, 398], [918, 416], [106, 416]], 's'),
    ...pools.map(([cx, cy, rx, ry]) => lightPool(cx, cy, rx, ry)),
    line('M250.7 372 L184 748 M381.3 372 L348 748 M512 372 V748 M642.7 372 L676 748 M773.3 372 L840 748', { width: 2.5, opacity: 0.24 }),
    line('M104.6 430 H919.4 M82.8 512 H941.2 M54.6 618 H969.4', { width: 2.5, opacity: 0.24 }),
    `<g fill="${INK}" opacity="0.4">`,
    ...[[262, 440], [370, 440], [524, 440], [654, 440], [762, 440], [240, 630], [362, 630], [526, 630], [662, 630], [784, 630]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`),
    '</g>',
    // A darker band along the front edge: the panel's foreground falls into shadow.
    halftone([[20, 748], [1004, 748], [990, 700], [34, 700]], 's', { opacity: 0.7 }),
    extra,
    '</g>',
  ].join('');
}

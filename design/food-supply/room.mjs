// mothership:dev-only
//
// The Supply Room's picture: its still parts, drawn flat in the board's cutaway frame and then
// inked by the rooms' own hand (design/room-pilot/ink-room.mjs), so that it sits with the five
// rooms the owner approved on 8 November 2026. The crane's moving parts (the locking panel and its
// blade, the cab, the crate, the platform, the console, the keys, the lamps and the painted stop
// numbers) are drawn over it by ./machine.mjs.
//
// The room is a cargo bay: a rail across the top for the locking panel, an intake hatch in the deck
// at the left where the resupply crate rises from the pod docked under the hull (seen through the
// porthole), open deck, the Panel operator's console, the galley lift's landing platform, and the
// Winch operator's cab hung under the rail's right end. Its colour family is a rusted copper, new
// to the ship (PROPOSED; a token comes with adoption): not the Command Room's amber, which is
// focus, nor the Jail's red, nor a team's colour.

import { INK } from '../crew-drawing/source/ink.mjs';
import { PAPER, SPACE, inkRoomSvg } from '../room-pilot/ink-room.mjs';
import { BOXES, DECK, RAIL, stopX } from './layout.mjs';

/** The Supply Room's colour family, dark to light. PROPOSED. */
export const FAMILY = Object.freeze({ deep: '#2B1A10', shadow: '#4C2D17', mid: '#82512A', light: '#BC8448', pale: '#E6C590' });

const F = FAMILY;
const r2 = v => Math.round(v * 100) / 100;
const pts = list => list.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ');
const ink = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
const rivets = (list, fill = F.pale) => `<g fill="${fill}">${list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`;

/** A convex polygon clipped to a box (Sutherland-Hodgman, edge by edge). */
export function clipToBox(poly, [x, y, w, h]) {
  const edges = [[p => p[0] >= x, (a, b) => { const t = (x - a[0]) / (b[0] - a[0]); return [x, a[1] + t * (b[1] - a[1])]; }],
    [p => p[0] <= x + w, (a, b) => { const t = (x + w - a[0]) / (b[0] - a[0]); return [x + w, a[1] + t * (b[1] - a[1])]; }],
    [p => p[1] >= y, (a, b) => { const t = (y - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y]; }],
    [p => p[1] <= y + h, (a, b) => { const t = (y + h - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y + h]; }]];
  let out = poly;
  for (const [inside, cut] of edges) {
    const input = out; out = [];
    input.forEach((cur, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    });
    if (!out.length) return [];
  }
  return out;
}

/** Diagonal hazard stripes in a box, ink on paper: the room's own painted warnings. */
export function stripes([x, y, w, h], { step = 18, outline = true } = {}) {
  const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER.shade}"${outline ? ` ${ink(2.5)}` : ''}/>`];
  for (let k = -h - step; k < w + step; k += step) {
    const band = clipToBox([[x + k, y + h], [x + k + h, y], [x + k + h + step / 2, y], [x + k + step / 2, y + h]], [x, y, w, h]);
    if (band.length >= 3) out.push(`<polygon points="${pts(band)}" fill="${INK}"/>`);
  }
  return out.join('');
}

/** The view out of the porthole: the voyage's dark, a few stars, and the supply pod docked under the hull. */
function space() {
  const [x, y, w] = BOXES.porthole; const cx = x + w / 2, cy = y + w / 2, r = w / 2 - 4;
  return `<g id="supply-space" clip-path="url(#clip-supply-porthole)">
    <rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${SPACE}"/>
    <g fill="${PAPER.plain}"><circle cx="${cx - 34}" cy="${cy - 30}" r="1.6"/><circle cx="${cx + 22}" cy="${cy - 40}" r="1.2"/><circle cx="${cx + 40}" cy="${cy - 6}" r="1.8"/><circle cx="${cx - 44}" cy="${cy + 8}" r="1.1"/><circle cx="${cx + 8}" cy="${cy - 18}" r="1"/></g>
    <path d="M${cx - 52} ${cy + 28} Q${cx - 4} ${cy + 6} ${cx + 30} ${cy + 18} L${cx + 46} ${cy + 46} L${cx - 52} ${cy + 46} Z" fill="${F.mid}" ${ink(2.5)}/>
    <path d="M${cx - 36} ${cy + 26} H${cx + 14} M${cx - 20} ${cy + 18} V${cx - cx + cy + 44}" fill="none" stroke="${INK}" stroke-width="2"/>
    <circle cx="${cx + 18}" cy="${cy + 30}" r="${r2(r * 0.12)}" fill="${F.pale}" ${ink(2)}/>
  </g>`;
}

function backwall() {
  const [px, py, pw] = BOXES.porthole; const cx = px + pw / 2, cy = py + pw / 2, r = pw / 2;
  const hole = `M${cx} ${cy - r} A${r} ${r} 0 1 0 ${cx} ${cy + r} A${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
  const [sx, sy, sw, sh] = BOXES.sign;
  return `<g id="supply-backwall">
    <path fill-rule="evenodd" fill="${F.mid}" d="M120 70 H904 V372 H120 Z ${hole}"/>
    <path fill-rule="evenodd" fill="${F.light}" d="M430 112 H760 V336 H430 Z"/>
    <path d="M430 112 H520 L430 232 Z" fill="${F.pale}"/>
    <rect x="120" y="70" width="784" height="34" fill="${F.shadow}"/>
    <rect x="120" y="336" width="784" height="36" fill="${F.shadow}"/>
    <path d="M120 104 H904 M120 336 H904" fill="none" stroke="${INK}" stroke-width="3.5"/>
    ${rivets([170, 250, 380, 470, 554, 644, 770, 860].map(x => [x, 354]))}
    <path d="M134 104 H190 L150 336 H134 Z" fill="url(#halftone-ink-m)"/>
    <path d="M760 104 H890 V336 H812 Z" fill="url(#halftone-ink-s)"/>
    <path d="M430 104 V336 M760 104 V336 M596 104 V122 M430 226 H760" fill="none" stroke="${INK}" stroke-width="2.5" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="none" stroke="${INK}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${F.pale}" stroke-width="3"/>
    ${rivets([0, 1, 2, 3, 4, 5, 6, 7].map(k => [cx + Math.cos(k * Math.PI / 4) * (r + 15), cy + Math.sin(k * Math.PI / 4) * (r + 15)]), F.deep)}
    <!-- The intake's feed: from the docked pod, down the wall and under the deck to the hatch. -->
    <path d="M${cx} ${cy + r + 10} V300 Q${cx} 326 ${cx - 30} 326 H${stopX(0) + 14} V372" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M${cx} ${cy + r + 10} V300 Q${cx} 326 ${cx - 30} 326 H${stopX(0) + 14} V372" fill="none" stroke="${F.light}" stroke-width="10" stroke-linecap="round"/>
    <!-- A cargo net on the bright bay, sacks behind it: the room's stores, calm behind the crane. -->
    <path d="M560 140 Q594 150 616 196 Q600 230 566 236 Z M622 150 Q660 140 690 170 Q700 214 664 238 Q630 236 624 200 Z" fill="${F.mid}" opacity="0.8"/>
    <path d="M548 132 H704 M548 132 L536 244 M704 132 L716 244 M536 244 H716" fill="none" stroke="${F.deep}" stroke-width="4" stroke-linecap="round"/>
    <path d="M574 132 L560 244 M600 132 L594 244 M626 132 L626 244 M652 132 L658 244 M678 132 L690 244 M545 160 H707 M542 188 H710 M539 216 H713" fill="none" stroke="${F.deep}" stroke-width="2" opacity="0.8"/>
    <!-- Gauges between the porthole and the bay. -->
    <circle cx="376" cy="170" r="22" fill="${PAPER.shade}" ${ink(3)}/>
    <path d="M376 170 L388 158" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="376" cy="232" r="16" fill="${PAPER.shade}" ${ink(3)}/>
    <path d="M376 232 L366 224" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <!-- The galley's sign over the lift: a bowl and a spoon, and the way down. -->
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="6" fill="${PAPER.shade}" ${ink(3)}/>
    <path d="M${sx + 12} ${sy + 14} Q${sx + 26} ${sy + 32} ${sx + 40} ${sy + 14} Z" fill="${F.deep}"/>
    <path d="M${sx + 34} ${sy + 9} L${sx + 46} ${sy + 3}" stroke="${F.deep}" stroke-width="3" stroke-linecap="round"/>
    <path d="M${sx + 50} ${sy + 12} V${sy + 30} M${sx + 45} ${sy + 25} L${sx + 50} ${sy + 31} L${sx + 55} ${sy + 25}" fill="none" stroke="${F.deep}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function shell() {
  return `<g id="supply-shell">
    <polygon points="20,20 1004,20 904,70 120,70" fill="${INK}"/>
    <path d="M286 31 H476 L466 58 H308 Z" fill="${PAPER.plain}" stroke="${F.mid}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M548 31 H738 L716 58 H558 Z" fill="${PAPER.plain}" stroke="${F.mid}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M320 44 H452 M572 44 H704" fill="none" stroke="${PAPER.shade}" stroke-width="3" stroke-linecap="round"/>
    <polygon points="20,20 120,70 120,372 20,748" fill="${F.deep}"/>
    <path d="M20 260.2 L120 169.7 M20 456.8 L120 251.2" fill="none" stroke="${F.shadow}" stroke-width="3"/>
    <polygon points="20,560 120,294 120,372 20,748" fill="url(#halftone-ink-m)" opacity="0.7"/>
    <polygon points="1004,20 904,70 904,372 1004,748" fill="${F.shadow}"/>
    <path d="M1004 260.2 L904 169.7 M1004 456.8 L904 251.2" fill="none" stroke="${F.deep}" stroke-width="3"/>
    <polygon points="1004,20 904,70 904,150 1004,216" fill="${F.mid}"/>
    <path d="M1004 216 L904 150" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <polygon points="300,58 480,58 600,560 200,560" fill="${PAPER.plain}" opacity="0.1"/>
    <polygon points="548,58 738,58 860,560 470,560" fill="${PAPER.plain}" opacity="0.1"/>
  </g>`;
}

function floor() {
  return `<g id="supply-scene-floor">
    <polygon points="120,372 904,372 1004,748 20,748" fill="${F.light}"/>
    <g clip-path="url(#clip-supply-floor)">
      <polygon points="113,398 911,398 904,372 120,372" fill="${F.mid}"/>
      <polygon points="120,372 196,372 132,748 20,748" fill="${F.mid}"/>
      <polygon points="196,372 250,372 210,748 132,748" fill="url(#halftone-ink-m)"/>
      <ellipse cx="360" cy="612" rx="190" ry="60" fill="${F.pale}"/>
      <ellipse cx="700" cy="630" rx="170" ry="58" fill="${F.pale}"/>
      <path d="M250.7 372 L184 748 M381.3 372 L348 748 M512 372 V748 M642.7 372 L676 748 M773.3 372 L840 748" fill="none" stroke="${INK}" stroke-width="2.5" opacity="0.24"/>
      <path d="M104.6 430 H919.4 M82.8 512 H941.2 M54.6 618 H969.4" fill="none" stroke="${INK}" stroke-width="2.5" opacity="0.24"/>
    </g>
  </g>`;
}

/** The fixed machinery: the rail and its hangers, the intake hatch, the lift's well and guides, the cab's wall bracket. */
function props() {
  const [ix, iy, iw] = BOXES.intake;
  const [wx, wy, ww, wh] = BOXES.liftWell;
  const [bx, by, bw, bh] = BOXES.cabBracket;
  const hangers = [150, 400, 650, 880].map(x => `<rect x="${x - 5}" y="20" width="10" height="${RAIL.top - 20}" fill="${F.shadow}" ${ink(2.5)}/>`).join('');
  return `<g id="supply-props-back">
    <!-- The rail: an I-beam the locking panel runs on, hung from the ceiling. -->
    ${hangers}
    <rect x="${RAIL.left}" y="${RAIL.top}" width="${RAIL.right - RAIL.left}" height="9" fill="${F.light}" ${ink(3)}/>
    <rect x="${RAIL.left + 6}" y="${RAIL.top + 9}" width="${RAIL.right - RAIL.left - 12}" height="${RAIL.bottom - RAIL.top - 18}" fill="${F.shadow}" ${ink(2.5)}/>
    <rect x="${RAIL.left}" y="${RAIL.bottom - 9}" width="${RAIL.right - RAIL.left}" height="9" fill="${F.mid}" ${ink(3)}/>
    ${rivets(Array.from({ length: 24 }, (_, k) => [RAIL.left + 20 + k * 40, RAIL.top + 18]).filter(([x]) => [0, 1, 2, 3, 4, 5, 6].every(s => Math.abs(x - stopX(s)) > 18)), F.pale)}
    <!-- The galley lift's well: the opening in the deck, its striped lip, and the two guides the platform runs in. -->
    <rect x="${wx}" y="${DECK - 10}" width="${ww}" height="18" rx="5" fill="${F.deep}" ${ink(3.5)}/>
    ${stripes([wx, DECK + 8, ww, 8], { step: 12 })}
    <rect x="${wx}" y="${wy - 80}" width="10" height="${DECK - wy + 80}" fill="${F.shadow}" ${ink(3)}/>
    <rect x="${wx + ww - 10}" y="${wy - 80}" width="10" height="${DECK - wy + 80}" fill="${F.shadow}" ${ink(3)}/>
    <rect x="${wx - 6}" y="${wy - 92}" width="22" height="14" fill="${F.mid}" ${ink(2.5)}/>
    <rect x="${wx + ww - 16}" y="${wy - 92}" width="22" height="14" fill="${F.mid}" ${ink(2.5)}/>
    <!-- The cab's bracket: a riveted knee from the rail's end down to the cab's side. -->
    <path d="M${bx} ${by} H${bx + bw} V${by + bh} L${bx} ${by + bh - 30} Z" fill="${F.mid}" ${ink(3)}/>
    ${rivets([[bx + 12, by + 16], [bx + 12, by + 50], [bx + 12, by + 82]], F.pale)}
    <!-- The intake hatch in the deck, and its lift plate. -->
    <rect x="${ix - 8}" y="${iy - 4}" width="${iw + 16}" height="22" rx="6" fill="${F.deep}" ${ink(3.5)}/>
    <rect x="${ix + 4}" y="${iy}" width="${iw - 8}" height="10" fill="${F.pale}" ${ink(2.5)}/>
    ${stripes([ix - 8, iy + 18, iw + 16, 8], { step: 12 })}
  </g>`;
}

/** The Supply Room's still picture, flat, in the board's conventions (the ink pass reads it as it reads a room). */
export function supplyRoomSource() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768">
  <defs>
    <pattern id="halftone-ink-s" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="1.5" fill="${INK}"/></pattern>
    <pattern id="halftone-ink-m" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="2.5" fill="${INK}"/></pattern>
    <clipPath id="clip-supply-floor"><polygon points="120,372 904,372 1004,748 20,748"/></clipPath>
    <clipPath id="clip-supply-porthole"><circle cx="${BOXES.porthole[0] + BOXES.porthole[2] / 2}" cy="${BOXES.porthole[1] + BOXES.porthole[2] / 2}" r="${BOXES.porthole[2] / 2}"/></clipPath>
  </defs>
  ${space()}
  ${backwall()}
  ${shell()}
  ${floor()}
  ${props()}
</svg>
`;
}

/** The still picture inked in the crew's hand: the file design/food-supply/art/supply-room.back.svg is this, written by the export tool. */
export function supplyRoomSvg({ header = null } = {}) {
  return inkRoomSvg(supplyRoomSource(), FAMILY, { prefix: 'fs', header });
}

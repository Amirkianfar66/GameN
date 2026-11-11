// mothership:dev-only
//
// Ship life: more of each room above and below its approved picture (room-drawing-1.0.0), for the
// wider room views. A room's picture ends in its hand-drawn border; a view zoomed out far enough to
// show more height than the picture has would show nothing past it. The extension continues the
// ceiling above and the deck below: each band starts in the picture's own colours along its edge
// (sampled from the picture in a browser by design/tools/ship-life-render.mjs --extend, column by
// column), feathered over the picture's last rows so no seam shows, and falls away into the room's
// own shadow (its colour family's deep tone, then the ink), as the noir light falls off toward the
// camera. Faint plate seams carry the deck's and the ceiling's lines on; a hatch darkens the far
// edge as the crew's cel shading does. Nothing in it is a thing the game uses: no place, no prop, no
// light that means anything.
//
// The picture keeps its own geometry: the bands lie outside 0..768 (above 0 and below 768) but for
// the feather, which overlaps the picture's border by a few units. Drawn over the picture.

import { FAMILIES } from '../room-pilot/rooms.mjs';

/** How far each band reaches past the picture, in scene units: enough for a view a fifth wider than the phone's filled view on any phone the pack reviews. */
export const REACH = 160;
/** Where each band starts inside the picture (its feather), and where its sampled colours were read. */
export const SEAM = Object.freeze({ top: { feather: [14, 30], sample: 22 }, bottom: { feather: [730, 750], sample: 736 } });

const INK = '#151923';
const hex = rgb => `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** Colour stops along a row: sampled colours [[r, g, b], ...] evenly across 0..1024, smoothed over a few neighbours. */
function stops(row, prefix) {
  const n = row.length;
  return row.map((_, i) => {
    let r = 0, g = 0, b = 0, w = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j += 1) { const k = 3 - Math.abs(i - j); r += row[j][0] * k; g += row[j][1] * k; b += row[j][2] * k; w += k; }
    return `<stop offset="${(i / (n - 1)).toFixed(4)}" stop-color="${hex([r / w, g / w, b / w])}"/>`;
  }).join('');
}

/**
 * The extension of one room, as an SVG in the room's own coordinates (viewBox 0 -REACH 1024
 * 768 + 2 × REACH: lay it over the picture with the picture's box offset by REACH). sampled: { top,
 * bottom }: each a row of [r, g, b] colours across the picture, read along SEAM.*.sample.
 * header: the file's comment.
 */
export function extensionSvg(room, sampled, { header = '' } = {}) {
  // An XML comment cannot hold two hyphens in a row.
  if (header.includes('--')) throw new Error('A file header cannot hold "--"');
  const family = FAMILIES[room];
  if (!family) throw new Error(`No colour family for ${room}`);
  const p = `ext-${room}`;
  const H = 768, R = REACH;
  const [tf0, tf1] = SEAM.top.feather, [bf0, bf1] = SEAM.bottom.feather;
  // The deck's seams run toward the room's far wall as the picture's do; the ceiling's toward its back.
  const seams = (y0, y1, dir) => [96, 224, 352, 512, 672, 800, 928].map((x, i) => {
    const lean = (x - 512) * 0.34 * dir;
    return `<path d="M${x} ${y0} L${(x + lean).toFixed(1)} ${y1}" stroke="${family.deep}" stroke-width="${i === 3 ? 2.6 : 2.2}" opacity="0.38" fill="none"/>`;
  }).join('');
  const rows = (ys, color) => ys.map(y => `<path d="M0 ${y} H1024" stroke="${color}" stroke-width="2.2" opacity="0.32" fill="none"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-R} 1024 ${H + 2 * R}" width="1024" height="${H + 2 * R}">${header ? `\n<!--\n${header}\n-->` : ''}
<defs>
  <linearGradient id="${p}-top" x1="0" x2="1024" y1="0" y2="0" gradientUnits="userSpaceOnUse">${stops(sampled.top, p)}</linearGradient>
  <linearGradient id="${p}-bottom" x1="0" x2="1024" y1="0" y2="0" gradientUnits="userSpaceOnUse">${stops(sampled.bottom, p)}</linearGradient>
  <linearGradient id="${p}-top-in" x1="0" x2="0" y1="${tf1}" y2="${tf0}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <linearGradient id="${p}-bottom-in" x1="0" x2="0" y1="${bf0}" y2="${bf1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <mask id="${p}-top-mask" maskUnits="userSpaceOnUse" x="0" y="${-R}" width="1024" height="${R + tf1}"><rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="#fff"/><rect x="0" y="${tf0}" width="1024" height="${tf1 - tf0}" fill="url(#${p}-top-in)"/></mask>
  <mask id="${p}-bottom-mask" maskUnits="userSpaceOnUse" x="0" y="${bf0}" width="1024" height="${H + R - bf0}"><rect x="0" y="${bf0}" width="1024" height="${bf1 - bf0}" fill="url(#${p}-bottom-in)"/><rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="#fff"/></mask>
  <linearGradient id="${p}-top-fall" x1="0" x2="0" y1="${tf1}" y2="${-R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${family.deep}" stop-opacity="0"/><stop offset="0.45" stop-color="${family.deep}" stop-opacity="0.55"/><stop offset="1" stop-color="${INK}" stop-opacity="0.96"/></linearGradient>
  <linearGradient id="${p}-bottom-fall" x1="0" x2="0" y1="${bf0}" y2="${H + R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${family.deep}" stop-opacity="0"/><stop offset="0.4" stop-color="${family.deep}" stop-opacity="0.5"/><stop offset="1" stop-color="${INK}" stop-opacity="0.94"/></linearGradient>
  <pattern id="${p}-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 4.5 H9" stroke="${INK}" stroke-width="1.6"/></pattern>
  <linearGradient id="${p}-hatch-top" x1="0" x2="0" y1="${tf0}" y2="${-R}" gradientUnits="userSpaceOnUse"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.7"/></linearGradient>
  <linearGradient id="${p}-hatch-bottom" x1="0" x2="0" y1="${bf1}" y2="${H + R}" gradientUnits="userSpaceOnUse"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.7"/></linearGradient>
  <mask id="${p}-hatch-top-mask" maskUnits="userSpaceOnUse" x="0" y="${-R}" width="1024" height="${R + tf0}"><rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="url(#${p}-hatch-top)"/></mask>
  <mask id="${p}-hatch-bottom-mask" maskUnits="userSpaceOnUse" x="0" y="${bf1}" width="1024" height="${H + R - bf1}"><rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="url(#${p}-hatch-bottom)"/></mask>
</defs>
<g data-band="top" mask="url(#${p}-top-mask)">
  <rect x="0" y="${-R}" width="1024" height="${R + tf1}" fill="url(#${p}-top)"/>
  ${seams(tf1, -R, -1)}${rows([-28, -96], family.deep)}
  <rect x="0" y="${-R}" width="1024" height="${R + tf1}" fill="url(#${p}-top-fall)"/>
  <rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="url(#${p}-hatch)" mask="url(#${p}-hatch-top-mask)" opacity="0.5"/>
</g>
<g data-band="bottom" mask="url(#${p}-bottom-mask)">
  <rect x="0" y="${bf0}" width="1024" height="${H + R - bf0}" fill="url(#${p}-bottom)"/>
  ${seams(bf0, H + R, 1)}${rows([806, 884], family.deep)}
  <rect x="0" y="${bf0}" width="1024" height="${H + R - bf0}" fill="url(#${p}-bottom-fall)"/>
  <rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="url(#${p}-hatch)" mask="url(#${p}-hatch-bottom-mask)" opacity="0.5"/>
</g>
</svg>
`;
}

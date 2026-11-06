// mothership:dev-only
//
// The role reveal films' shared art, in the Comic Noir kit (design/cinematic/lib/comic.mjs): a page of
// the ship's crew file at night, drawn as an animated noir comic. The light falls through a viewport's
// slats as it would through a detective's blinds, in beams with dust turning in them; the crew are
// navy silhouettes with a paper rim light; the panels have hard borders and a gutter and land with
// impact lines; and the role's name is stamped in Ink Block lettering. Pure string builders: nothing
// here reads a game fact; the film passes in what to draw and where. Every role shares these parts,
// so every film keeps one palette and one brightness (docs/design/cinematic/role-reveal.md, section 1).

import { FACTION_ACCENTS } from '../../../board-v2/fx/blocked.mjs';
import { INK, PAPER, AMBER, fxDefs, panelFrame, speedLines, stars, vignette } from '../../lib/comic.mjs';
import { clamp01, lerp, rand } from '../../lib/ease.mjs';
import { lettering } from '../../lib/lettering.mjs';

/** The page's palette: night ink, ship steel, paper light and the amber of focus. No team colour. */
export const NIGHT = Object.freeze({
  deep: '#07090F', wall: '#0E1420', steel: '#3A4A6B', steelDark: '#232E44', slat: '#E9F1FF',
  paper: PAPER, ink: INK, amber: AMBER, caption: '#F3E3A6', rim: '#FFF3C4',
  // Lit equipment and figures (the owner's review: nothing sinks into the dark): the token steels,
  // a lifted wall and a navy silhouette that a rim light can separate from it.
  steelLit: '#55657E', steelPale: '#B9C4D3', steelShadow: '#34415A', wallLit: '#1A2438', figure: '#1B2436',
  // The back story's narration boxes: aged paper, as a comic sets its flashback captions.
  memory: '#E6D3AE',
});

const f = v => Number((+v).toFixed(2));

/** The paper grain's tile: specks of ink and paper at fixed places (print texture, the same every frame). */
const GRAIN = Array.from({ length: 70 }, (_, i) => `<circle cx="${f(rand(71, i, 'x') * 96)}" cy="${f(rand(71, i, 'y') * 96)}" r="${f(0.5 + rand(71, i, 'r') * 0.9)}" fill="${i % 3 ? INK : PAPER}" opacity="${f(0.25 + rand(71, i, 'o') * 0.45)}"/>`).join('');

/** The flashback's colour matrix (rows R, G, B, A of an feColorMatrix): warm sepia, a little darker than the classic one. */
export const SEPIA = Object.freeze([
  Object.freeze([0.36, 0.7, 0.17, 0, 0]),
  Object.freeze([0.31, 0.62, 0.15, 0, 0]),
  Object.freeze([0.24, 0.47, 0.12, 0, 0]),
  Object.freeze([0, 0, 0, 1, 0]),
]);
/** A colour as the flashback's filter draws it (#RRGGBB in and out): what the palette test checks. */
export function sepiaOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const out = SEPIA.slice(0, 3).map(([kr, kg, kb]) => Math.round(Math.min(1, kr * r + kg * g + kb * b) * 255));
  return `#${out.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** The defs every film uses, under `prefix`: the comic effects, an ink silhouette and a paper rim light. */
export function revealDefs(prefix) {
  return fxDefs(prefix)
    + `<defs><filter id="${prefix}-sil" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="${NIGHT.deep}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`
    + `<filter id="${prefix}-rim" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="${NIGHT.rim}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="1.4"/></filter>`
    // Noir light on the player's own character: the colours kept, the light taken down.
    + `<filter id="${prefix}-noir" x="-10%" y="-10%" width="120%" height="120%"><feComponentTransfer><feFuncR type="linear" slope="0.72"/><feFuncG type="linear" slope="0.72"/><feFuncB type="linear" slope="0.8"/></feComponentTransfer></filter>`
    // A silhouette in night navy rather than black, so its rim light and the wall behind both read.
    + `<filter id="${prefix}-sil-lit" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="${NIGHT.figure}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`
    + `<filter id="${prefix}-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>`
    // Memory: the back story's panels in sepia (SEPIA, above), the comic's flashback.
    + `<filter id="${prefix}-sepia" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${SEPIA.map(row => row.join(' ')).join('  ')}"/></filter>`
    // The comic's inking: a bold ink contour around a figure, as a penciller's outline is inked heavier.
    + `<filter id="${prefix}-outline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="grown"/><feFlood flood-color="${INK}"/><feComposite in2="grown" operator="in" result="ink"/><feMerge><feMergeNode in="ink"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    // Print: the page's paper grain, a fixed scatter of specks (no noise filter, nothing that moves).
    + `<pattern id="${prefix}-paper" width="96" height="96" patternUnits="userSpaceOnUse">${GRAIN}</pattern></defs>`;
}

/**
 * Starlight through a viewport's slats: bars of pale light across the dark page, the stars showing
 * inside them only. v 0..1 sweeps the bars in from the left; `dim` 0..1 darkens them (under the panels).
 */
export function slatsSvg(prefix, { width, height, v, dim = 0, t = 0 }) {
  const id = `${prefix}-slats`;
  const angle = -24, gap = 132, bar = 46;
  const reach = Math.hypot(width, height) * 1.2;
  const count = Math.ceil(reach / gap) + 2;
  // A clipPath takes shapes, not groups: each bar carries the slant itself.
  const turn = `rotate(${angle} ${f(width / 2)} ${f(height / 2)})`;
  let bars = '';
  for (let i = -2; i < count; i += 1) {
    const y = i * gap - reach * 0.2;
    bars += `<rect x="${f(-reach * 0.2)}" y="${f(y)}" width="${f(reach * clamp01(v) * 1.4)}" height="${bar}" transform="${turn}"/>`;
  }
  const field = `<rect width="${width}" height="${height}" fill="${NIGHT.deep}"/>`;
  const light = 0.26 * (1 - 0.7 * dim);
  return field
    + `<defs><clipPath id="${id}">${bars}</clipPath>`
    // The light falls from the viewport at the upper left and dies away across the page.
    + `<radialGradient id="${id}-g" gradientUnits="userSpaceOnUse" cx="${f(width * 0.18)}" cy="${f(height * 0.12)}" r="${f(Math.hypot(width, height) * 0.95)}"><stop offset="0" stop-color="${NIGHT.slat}" stop-opacity="${f(light * 1.5)}"/><stop offset="0.45" stop-color="${NIGHT.slat}" stop-opacity="${f(light * 0.75)}"/><stop offset="1" stop-color="${NIGHT.slat}" stop-opacity="${f(light * 0.12)}"/></radialGradient></defs>`
    + `<g clip-path="url(#${id})"><rect width="${width}" height="${height}" fill="url(#${id}-g)"/>`
    + `<g opacity="${f(0.9 * (1 - 0.6 * dim))}">${stars({ w: width, h: height, count: 160, seed: 37, t })}</g></g>`
    + `<rect width="${width}" height="${height}" fill="url(#${prefix}-dots)" opacity="${f(0.16 + 0.24 * dim)}"/>`;
}

/**
 * The device alone from a held-device picture (design/exports/roles/device-*.held.*.svg, 120 x 140):
 * the same approved art the role card draws, its arm and fist removed. Pure: SVG text in and out.
 */
export function deviceOnly(svg) {
  let out = svg;
  for (const part of ['arm', 'fist']) {
    const open = new RegExp(`<g [^>]*id="[^"]*-${part}"[^>]*>`).exec(out);
    if (!open) continue;
    const tags = /<g\b[^>]*?(\/?)>|<\/g>/g;
    tags.lastIndex = open.index;
    let depth = 0, m;
    while ((m = tags.exec(out))) {
      if (m[0].startsWith('</g')) depth -= 1;
      else if (m[1] !== '/') depth += 1;
      if (depth === 0) { out = out.slice(0, open.index) + out.slice(tags.lastIndex); break; }
    }
  }
  return out;
}

/**
 * A device picture with its team's accent taken out: each faction accent becomes the room's starlight
 * (NIGHT.slat). The role card lights each device in its team's colour; drawn large in a film, that
 * colour would show across the table, so every role's gadget catches the same light. Pure.
 */
export function unaccented(svg) {
  return Object.values(FACTION_ACCENTS).reduce((out, accent) => out.replace(new RegExp(accent, 'gi'), NIGHT.slat), svg);
}

/** Where every held device's fist holds it, in its 120 x 140 picture (the reviewed devices share one grip). */
export const GRIP = Object.freeze([71, 86]);

/**
 * Dust in a beam of light: motes drifting slowly up and across a box, twinkling as they turn (full
 * motion only: reduced motion draws none). Deterministic in t.
 */
export function motes({ x, y, w, h, t, count = 18, seed = 29, color = NIGHT.rim, opacity = 0.6, reduced = false }) {
  if (reduced || opacity <= 0) return '';
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const speed = 0.006 + rand(seed, i, 's') * 0.012;
    const my = y + ((((rand(seed, i, 'y') * h - t * speed) % h) + h) % h);
    const mx = x + rand(seed, i, 'x') * w + Math.sin(t / (900 + rand(seed, i, 'p') * 700) + i) * 10;
    const r = 1.2 + rand(seed, i, 'r') * 1.6;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / (380 + rand(seed, i, 'q') * 500) + i * 2.1));
    out += `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(r)}" fill="${color}" opacity="${f(opacity * tw)}"/>`;
  }
  return out;
}

/**
 * A volumetric beam: a quadrilateral of light, bright where it enters (`from`, a 0..1 point along
 * the gradient's axis) and gone where it lands, so it reads as light in air rather than paint.
 */
export function beamSvg(prefix, id, { points, from, to, color = NIGHT.slat, opacity = 0.16 }) {
  const g = `${prefix}-beam-${id}`;
  return `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(from[0])}" y1="${f(from[1])}" x2="${f(to[0])}" y2="${f(to[1])}"><stop offset="0" stop-color="${color}" stop-opacity="${f(opacity)}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${f(opacity * 0.45)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
    + `<polygon points="${points.map(([px, py]) => `${f(px)},${f(py)}`).join(' ')}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
}

/**
 * A figure lit from behind (noir): a pale rim copy offset toward the light, then the figure as a
 * navy silhouette. `figure` is the figure's markup and `rimFigure` the same figure under other ids
 * (the rig scopes its ids by prefix, so the caller draws it twice).
 */
export function rimLit(prefix, { figure, rimFigure, offset = [-4, -4], rim = 0.95 }) {
  return `<g filter="url(#${prefix}-rim)" opacity="${f(rim)}" transform="translate(${f(offset[0])} ${f(offset[1])})">${rimFigure}</g>`
    + `<g filter="url(#${prefix}-sil-lit)">${figure}</g>`;
}

/** The page's paper grain over everything, faint: the film reads as a printed comic. */
export const grainSvg = (prefix, { width, height, opacity = 0.18 }) => `<rect width="${f(width)}" height="${f(height)}" fill="url(#${prefix}-paper)" opacity="${f(opacity)}" style="mix-blend-mode:multiply"/>`;

/**
 * The memory flash: warm light swells out of the gadget's glint at (cx, cy) and washes the page, then
 * clears on the back story's first panel. v 0..1 (film.mjs FLASH; full motion only).
 */
export function flashSvg(prefix, { width, height, cx, cy, v }) {
  if (v <= 0) return '';
  const g = `${prefix}-flash`;
  const r = Math.hypot(width, height) * (0.12 + 0.95 * v);
  return `<defs><radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${f(0.95 * v)}"/><stop offset="0.35" stop-color="${NIGHT.rim}" stop-opacity="${f(0.9 * v)}"/><stop offset="1" stop-color="${NIGHT.memory}" stop-opacity="${f(0.75 * v)}"/></radialGradient></defs>`
    + `<rect width="${f(width)}" height="${f(height)}" fill="url(#${g})"/>`;
}

/**
 * One comic panel at (x, y, w, h), its content drawn in local units (0..w, 0..h) and clipped to it.
 * enter 0..1: the slam (scale from 1.16 and a side slide to rest, with an overshoot already in the
 * value), tilt: the panel's rest angle. A shadow, an ink border with a paper keyline.
 */
export function panelSvg(prefix, { i, x, y, w, h, enter, slam = 1, tilt = 0, side = 1, content, tone = 'present', focus = 1, reduced = false }) {
  if (enter <= 0) return '';
  const id = `${prefix}-panel-${i}`;
  const s = lerp(1.16, 1, enter);
  const dx = (1 - Math.min(1, enter)) * 70 * side;
  const cx = x + w / 2, cy = y + h / 2;
  const opacity = clamp01(slam / 0.35);
  // The slam's impact: pale lines burst from behind the panel's edges and fade as it lands (full only).
  const impact = !reduced && slam < 1
    ? speedLines({ cx: w / 2, cy: h / 2, inner: Math.max(w, h) * 0.5, outer: Math.max(w, h) * (0.62 + 0.12 * slam), count: 34, seed: 17 + i, color: NIGHT.slat, width: 4, opacity: 0.55 * (1 - slam) })
    : '';
  return `<g opacity="${f(opacity)}" transform="translate(${f(cx + dx)} ${f(cy)}) rotate(${f(tilt)}) scale(${f(s)}) translate(${f(-w / 2)} ${f(-h / 2)})">`
    + impact
    + `<defs><clipPath id="${id}"><rect x="0" y="0" width="${f(w)}" height="${f(h)}"/></clipPath>`
    + `<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT.wallLit}"/><stop offset="1" stop-color="${NIGHT.wall}"/></linearGradient></defs>`
    + `<rect x="10" y="12" width="${f(w)}" height="${f(h)}" fill="${NIGHT.deep}" opacity="0.85"/>`
    + `<g clip-path="url(#${id})">`
    // The back story's panels are memory: drawn in sepia, a heavier vignette closing in at the edges.
    + (tone === 'past' ? `<g filter="url(#${prefix}-sepia)"><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}-bg)"/>${content}</g>` : `<rect width="${f(w)}" height="${f(h)}" fill="url(#${id}-bg)"/>${content}`)
    + vignette(`${id}-v`, { width: w, height: h, strength: tone === 'past' ? 0.6 : 0.42 })
    // Ink hatching closes in at the panel's corners, as a comic shades its edges.
    + `<defs><pattern id="${id}-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V9" stroke="${INK}" stroke-width="1.8"/></pattern>`
    + `<radialGradient id="${id}-hatch-g" cx="50%" cy="50%" r="75%"><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.9"/></radialGradient>`
    + `<mask id="${id}-hatch-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(w)}" height="${f(h)}"><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}-hatch-g)"/></mask></defs>`
    + `<rect width="${f(w)}" height="${f(h)}" fill="url(#${id}-hatch)" mask="url(#${id}-hatch-m)" opacity="0.55"/>`
    // An earlier panel steps back in light while a later one has the stage.
    + (focus < 1 ? `<rect width="${f(w)}" height="${f(h)}" fill="${NIGHT.deep}" opacity="${f(1 - focus)}"/>` : '')
    + `</g>${panelFrame({ x: 0, y: 0, w, h, border: 7, shadow: false })}</g>`;
}

/** A comic sound word in Ink Block lettering (decorative: a word drawn here is never its only meaning). */
export function sfxSvg(text, { x, y, size = 56, rotate = -6, pop = 1, opacity = 1, fill = AMBER }) {
  // A pop eased from 0 can come out a rounding error above it (easeOutBack(0) is 2e-16): the word
  // waits for its beat rather than showing early at its smallest size.
  if (opacity <= 0 || pop <= 1e-6) return '';
  return lettering(text, { x, y, size, rotate, scale: lerp(0.6, 1, Math.min(1, pop)), opacity, fill, skew: -10 });
}

/**
 * The title plate: a paper file tab, the role's name stamped on it in Ink Block lettering and the
 * team's emblem (library group 7's) small in its corner. stamp 0..1 (with its overshoot), settle 0..1.
 * Returns { svg, box } (box: the plate's rectangle, for the page text under it).
 */
export function titlePlateSvg(prefix, { name, emblemHref, cx, cy, width, stamp, settle, sweep = 0 }) {
  if (stamp <= 0) return { svg: '', box: null };
  const size = Math.min(118, (width - 120) / (name.length * 0.82));
  const h = size * 1.75 + 70;
  const s = lerp(1.32, 1, Math.min(1, stamp));
  const rot = lerp(-7, -3, clamp01(stamp));
  const x = -width / 2, y = -h / 2;
  const plate = `<rect x="${f(x + 12)}" y="${f(y + 14)}" width="${f(width)}" height="${f(h)}" fill="${NIGHT.deep}" opacity="0.8"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(h)}" fill="${NIGHT.paper}" stroke="${INK}" stroke-width="7"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(h)}" fill="url(#${prefix}-dots)" opacity="0.12"/>`
    + `<path d="M${f(x + 26)} ${f(y + 30)}H${f(x + width - 26)}M${f(x + 26)} ${f(y + h - 30)}H${f(x + width - 26)}" stroke="${INK}" stroke-width="3" opacity="0.55"/>`;
  const word = lettering(name, { x: 0, y: 6, size, skew: -6, fill: AMBER, highlight: '#FFF3C4', tracking: 1.4 });
  const emblem = emblemHref ? `<g transform="translate(${f(x + width - 78)} ${f(y - 34)}) rotate(8)"><circle cx="34" cy="34" r="38" fill="${NIGHT.paper}" stroke="${INK}" stroke-width="6"/><image href="${emblemHref}" x="6" y="6" width="56" height="56"/></g>` : '';
  // A sheen crosses the plate once it has landed, as light across a laminated file (full only).
  const sheen = sweep > 0 && sweep < 1
    ? `<defs><clipPath id="${prefix}-plate-clip"><rect x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(h)}"/></clipPath>`
      + `<linearGradient id="${prefix}-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>`
      + `<g clip-path="url(#${prefix}-plate-clip)"><rect x="${f(lerp(x - 260, x + width + 60, sweep))}" y="${f(y - 40)}" width="200" height="${f(h + 80)}" fill="url(#${prefix}-sheen)" transform="skewX(-24)" style="mix-blend-mode:screen"/></g>`
    : '';
  const svg = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(${f(s)})" opacity="${f(clamp01(stamp * 3))}">${plate}${word}${sheen}${emblem}</g>`;
  return { svg, box: [cx - width / 2, cy - h / 2, width, h] };
}

/** A caption box (the comic's yellow narration box); its words are page text set over it by the stage. */
export function captionBoxSvg({ x, y, w, h, opacity, tone = 'present' }) {
  if (opacity <= 0) return '';
  return `<g opacity="${f(opacity)}"><rect x="${f(x + 7)}" y="${f(y + 8)}" width="${f(w)}" height="${f(h)}" fill="${NIGHT.deep}" opacity="0.8"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${tone === 'past' ? NIGHT.memory : NIGHT.caption}" stroke="${INK}" stroke-width="5"/></g>`;
}

/** A deterministic flicker 0..1 for a lamp: slow (under 2 Hz) and never a full-contrast flash. */
export const lampFlicker = (t, seed = 1) => 0.62 + 0.38 * (0.5 + 0.5 * Math.sin((t / 1000) * Math.PI * 2 * 1.2 + rand(seed, 0) * 6.28));

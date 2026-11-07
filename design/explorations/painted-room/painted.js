// mothership:dev-only
//
// The painted room test, an exploration for the game owner (11 October 2026: "lets repaint just
// 1 art work as a draft test to compare. it can be just 1 room test").
//
// One room of the board-motion prototype drawn twice, from the same scene, the same places and
// the same figures: once as the prototype draws it (the comic look: flat color, ink outline,
// halftone) and once repainted by code in a painted, lit look (soft gradients for flat color,
// thin soft edges for ink, light from the lamps, glow from what shines, atmosphere and grain).
// Nothing here is painted by hand and no raster image is generated or fetched: it is a stand-in
// for the direction an illustrator would take, to compare the two. The repaint needs gradients,
// blend modes and filters, which the approved drawing vocabulary of design sources refuses
// (design/tools/lib/svg.mjs), so it is drawn live on this page and kept only as review pictures.
//
//   ?view=compare (default) | comic | painted
//   ?panel=180x330   a phone panel's framing of the room, as the board frames it
//   ?crop=x,y,w,h    a detail of the room, in its 1024 x 768 units
//   ?scale=0.75      the size of each picture on the page

import { SCENES } from '../../board-motion/scenes/index.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { FRAME, figureSvg } from '../../board-motion/figures/body.mjs';
import { INK } from '../../board-motion/figures/rig.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';

window.__designReady = false;
const NS = 'http://www.w3.org/2000/svg';
const params = new URLSearchParams(location.search);
const ROOM = 'room-b';
const scene = SCENES[ROOM];
const view = params.get('view') ?? 'compare';
const scale = Number(params.get('scale') ?? (view === 'compare' ? 0.75 : 1));
const [panelW, panelH] = (params.get('panel') ?? '').split('x').map(Number);
const crop = (params.get('crop') ?? '').split(',').map(Number).filter(Number.isFinite);
const [BOX_X, BOX_Y, BOX] = FRAME.box;
const [ANCHOR_X, ANCHOR_Y] = FRAME.anchor;
const kebab = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) if (value != null) node.setAttribute(name, String(value));
  return node;
};

// ---------- the scene as the prototype draws it ----------

const layerText = {};
for (const id of ['back', ...Object.keys(scene.layers ?? {})]) {
  layerText[id] = await (await fetch(new URL(`../../board-motion/assets/scenes/${ROOM}.${kebab(id)}.svg`, import.meta.url))).text();
}

/** An SVG file's drawing, without its header and outer element, as a group. */
function layerGroup(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const group = svgEl('g');
  for (const child of [...doc.documentElement.childNodes]) group.append(document.importNode(child, true));
  return group;
}

/** A place's figure (its body, or what lies over its prop), placed and mirrored as on the board. */
function placedFigure(slot, index, mode, layer) {
  const id = Object.keys(CREW)[index % Object.keys(CREW).length];
  const s = slot.scale;
  const mirrored = svgEl('g', slot.mirror ? { transform: `translate(${2 * slot.at[0]} 0) scale(-1 1)` } : {});
  mirrored.innerHTML = figureSvg(CREW[id], skeletonOf(slot.gesture), { prefix: `${mode}-${slot.id}-${layer}`, layer });
  const figure = mirrored.firstElementChild;
  for (const [name, value] of Object.entries({ x: slot.at[0] - (ANCHOR_X - BOX_X) * s, y: slot.at[1] - (ANCHOR_Y - BOX_Y) * s, width: BOX * s, height: BOX * s })) figure.setAttribute(name, String(value));
  if (mode === 'painted') paintFigure(figure, slot);
  const wrap = svgEl('g', { class: 'pr-figure', 'data-place': slot.id });
  wrap.append(mirrored);
  return wrap;
}

/** The room with every place taken, drawn in its depth order: the scene, the figures, the layers in front. */
function compose(mode) {
  const items = [{ z: -2, node: layerGroup(layerText.back) }];
  if (mode === 'painted') items.push({ z: -1, node: inScene() });
  scene.slots.forEach((slot, index) => {
    const depth = Math.round(slot.depth ?? slot.at[1]);
    items.push({ z: depth * 2, node: placedFigure(slot, index, mode, 'body') });
    if (mode === 'painted' && slot.depth == null) items.push({ z: depth * 2 - 1, node: reflection(placedFigure(slot, index, 'mirror', 'body'), slot) });
    if ((skeletonOf(slot.gesture).front ?? []).length) items.push({ z: 1500 + depth, node: placedFigure(slot, index, mode, 'front') });
  });
  for (const [id, layer] of Object.entries(scene.layers ?? {})) items.push({ z: Math.round(layer.depth) * 2 + 1, node: layerGroup(layerText[id]) });
  const world = svgEl('g', { id: `${mode}-world` });
  for (const item of items.sort((a, b) => a.z - b.z)) world.append(item.node);
  return world;
}

// ---------- the repaint ----------

const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
const toHex = rgb => `#${rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const CANVAS = '#10141C';

/** The light of Room B, in its 1024 x 768 units (design/board-motion/assets/scenes/room-b.back.svg). */
const LIGHT = {
  warm: '#ffdcae', // the two ceiling lamps
  core: '#fff8ec', // the lamps' own face, and the dust in their light
  cool: '#1b0e33', // the room's shadow: a deep violet, never black
  edge: '#1d1030', // what is left of the ink: a thin, soft edge
  ink: '#22143a', // the room's ink fills, in its violet
  glow: '#c9a2ff', // the screen and the flask
  teal: '#5ff2d8', // the specimen tank: the room's one cool accent
  lamps: ['286,31 476,31 466,58 308,58', '548,31 738,31 716,58 558,58'],
  beams: ['316,58 458,58 572,650 262,650', '566,58 708,58 812,656 498,656'],
  pools: [[430, 644, 240, 86], [652, 648, 222, 84], [512, 392, 380, 46], [512, 120, 380, 96]],
  screen: [372, 118, 280, 144],
  window: [742, 126, 130, 46],
  tank: [726, 430, 92, 182],
  flask: [625, 356, 52, 30],
  tubes: [487, 350, 56, 20],
};
/** Which way each place's rim light comes from: the lamps above, or the tank behind B3. */
const RIM = { B3: 'teal' };

/** The figure takes light: soft edges between its light and shade, a rim, a soft contact shadow. */
function paintFigure(figure, slot) {
  const drawing = [...figure.childNodes].filter(node => node.nodeName !== 'defs');
  const [shadow] = drawing;
  if (shadow?.getAttribute?.('fill') === INK && shadow.getAttribute('opacity')) {
    shadow.setAttribute('filter', 'url(#pp-contact)');
    shadow.setAttribute('opacity', '0.5');
    drawing.shift();
  }
  const lit = svgEl('g', { filter: `url(#pp-rim-${RIM[slot.id] ?? 'warm'})` });
  for (const node of drawing) lit.append(node);
  figure.append(lit);
  // The comic's hard-edged shade shapes, clipped to a limb, soften into it.
  for (const shade of figure.querySelectorAll('g[clip-path] > path')) {
    if (/^#/.test(shade.getAttribute('fill') ?? '')) shade.setAttribute('filter', 'url(#pp-soften)');
  }
}

/** A figure's faint reflection in the polished deck, fading away from its feet. */
function reflection(figure, slot) {
  const [x, y] = slot.at;
  const id = `pp-reflect-${slot.id}`;
  const g = svgEl('g', { mask: `url(#${id})`, opacity: 0.16 });
  g.innerHTML = `<mask id="${id}" maskUnits="userSpaceOnUse" x="${x - 200}" y="${y - 4}" width="400" height="200"><rect x="${x - 200}" y="${y - 4}" width="400" height="${110 * slot.scale}" fill="url(#pp-fade)"/></mask>`;
  const flipped = svgEl('g', { transform: `translate(0 ${2 * y}) scale(1 -1)`, filter: 'url(#pp-blur-2)' });
  flipped.append(figure);
  g.append(flipped);
  return g;
}

/** What is painted into the room behind the figures: haze and brushwork, the screen's glass, the window's nebula, the tank's light, shadows on the deck. */
function inScene() {
  const g = svgEl('g', { id: 'pp-in-scene' });
  g.append(svgEl('rect', { x: 120, y: 70, width: 784, height: 302, fill: '#d9c4ff', opacity: 0.06 }));
  // Brushwork: long strokes across the deck, upright ones on the walls.
  g.append(svgEl('rect', { x: 20, y: 372, width: 984, height: 376, filter: 'url(#pp-streak-h)', 'clip-path': 'url(#pp-clip-floor)', opacity: 0.4, style: 'mix-blend-mode: soft-light' }));
  g.append(svgEl('rect', { x: 20, y: 20, width: 984, height: 352, filter: 'url(#pp-streak-v)', 'clip-path': 'url(#pp-clip-walls)', opacity: 0.3, style: 'mix-blend-mode: soft-light' }));
  const [sx, sy, sw, sh] = LIGHT.screen;
  g.append(svgEl('rect', { x: sx + 3, y: sy + 3, width: sw - 6, height: sh - 6, rx: 6, fill: 'url(#pp-screen)', opacity: 0.9, style: 'mix-blend-mode: screen' }));
  const [wx, wy, ww, wh] = LIGHT.window;
  g.append(svgEl('rect', { x: wx, y: wy, width: ww, height: wh, fill: 'url(#pp-nebula)', style: 'mix-blend-mode: screen' }));
  const [tx, ty, tw, th] = LIGHT.tank;
  g.append(svgEl('rect', { x: tx, y: ty, width: tw, height: th, fill: LIGHT.teal, opacity: 0.75, style: 'mix-blend-mode: color' }));
  g.append(svgEl('rect', { x: tx, y: ty, width: tw, height: th, fill: 'url(#pp-tank)', opacity: 0.8, style: 'mix-blend-mode: screen' }));
  g.append(svgEl('ellipse', { cx: tx + tw / 2, cy: 654, rx: 150, ry: 34, fill: 'url(#pp-teal-spill)', opacity: 0.55, style: 'mix-blend-mode: screen' }));
  // The bench's shadow on the deck, and the shade where the wall meets the floor.
  g.append(svgEl('rect', { x: 176, y: 490, width: 692, height: 60, fill: 'url(#pp-under)', opacity: 0.6, filter: 'url(#pp-blur-6)', style: 'mix-blend-mode: multiply' }));
  g.append(svgEl('rect', { x: 120, y: 372, width: 784, height: 40, fill: 'url(#pp-under)', opacity: 0.7, style: 'mix-blend-mode: multiply' }));
  return g;
}

function paint(svg, world) {
  const defs = svgEl('defs');
  svg.prepend(defs, svgEl('rect', { x: -2000, y: -2000, width: 5000, height: 5000, fill: CANVAS }));
  // The comic's hard-edged pools of light on the deck soften (they are the deck's two pale ellipses).
  for (const pool of world.querySelectorAll('#room-b-scene-floor ellipse')) if (Number(pool.getAttribute('rx')) > 150) pool.setAttribute('filter', 'url(#pp-blur-14)');
  const add = markup => { defs.insertAdjacentHTML('beforeend', markup); };
  // Volume for flat color: each flat fill becomes a gradient, lamplight above, the room's violet below.
  const gradients = new Map();
  const gradient = (color, figure) => {
    const key = `${figure ? 'f' : 'r'}${color.slice(1).toUpperCase()}`;
    if (!gradients.has(key)) {
      add(`<linearGradient id="pp-g-${key}" x1="0.3" y1="0" x2="0.55" y2="1"><stop offset="0" stop-color="${mix(color, LIGHT.warm, figure ? 0.12 : 0.1)}"/><stop offset="0.5" stop-color="${figure ? color : mix(color, LIGHT.cool, 0.14)}"/><stop offset="1" stop-color="${mix(color, LIGHT.cool, figure ? 0.3 : 0.5)}"/></linearGradient>`);
      gradients.set(key, `url(#pp-g-${key})`);
    }
    return gradients.get(key);
  };
  for (const node of world.querySelectorAll('[fill]')) {
    const fill = node.getAttribute('fill');
    const figure = Boolean(node.closest('.pr-figure'));
    if (/^#[0-9a-f]{6}$/i.test(fill)) {
      if (![INK, CANVAS].includes(fill.toUpperCase())) node.setAttribute('fill', gradient(fill, figure));
      // The room's ink fills (the ceiling, the bench's kick plate, the shadows) take the room's violet.
      else if (!figure && fill.toUpperCase() === INK) node.setAttribute('fill', LIGHT.ink);
    } else if (svg.querySelector(`pattern[id="${fill.slice(5, -1)}"]`)) {
      // Halftone and hatching are the comic's shading: a breath of them stays, as texture.
      node.setAttribute('opacity', String(Number(node.getAttribute('opacity') ?? 1) * 0.12));
    }
  }
  // The ink outline becomes a thin, soft edge: thinner still on the room than on the figures.
  const inked = [...world.querySelectorAll('[stroke], [stroke-width]')].filter(node => (node.closest('[stroke]')?.getAttribute('stroke') ?? '').toUpperCase() === INK);
  for (const node of inked) {
    const figure = Boolean(node.closest('.pr-figure'));
    // A heavy ink line drawn on its own (a cable, a leg) is a thing, not an outline: it stays, a little lighter.
    const thing = !figure && !node.closest('#room-b-backwall, #room-b-shell, #room-b-edges') && node.closest('[fill]')?.getAttribute('fill') === 'none' && Number(node.closest('[stroke-width]')?.getAttribute('stroke-width') ?? 0) >= 5;
    if (node.hasAttribute('stroke-width')) node.setAttribute('stroke-width', String(Math.max(figure ? 0.7 : 0.6, Number(node.getAttribute('stroke-width')) * (thing ? 0.9 : figure ? 0.62 : 0.42))));
    if (node.hasAttribute('stroke')) {
      node.setAttribute('stroke', LIGHT.edge);
      node.setAttribute('stroke-opacity', thing ? '0.95' : figure ? '0.85' : '0.5');
    }
  }
  const [tx, ty, tw, th] = LIGHT.tank;
  add(`<filter id="pp-soften" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="pp-contact" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="pp-blur-2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="pp-blur-6" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="pp-blur-14" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="pp-blur-30" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="pp-fore" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.6"/><feColorMatrix type="matrix" values="0.55 0 0 0 0.02  0 0.5 0 0 0.01  0 0 0.62 0 0.04  0 0 0 1 0"/></filter>
    ${[['warm', LIGHT.warm, 0, 2.6, 0.9], ['teal', LIGHT.teal, -3.2, 0.8, 1]].map(([name, color, dx, dy, strength]) => `<filter id="pp-rim-${name}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feOffset in="SourceAlpha" dx="${dx}" dy="${dy}" result="shifted"/>
      <feComposite in="SourceAlpha" in2="shifted" operator="out" result="edge"/>
      <feGaussianBlur in="edge" stdDeviation="0.7" result="soft"/>
      <feFlood flood-color="${color}" flood-opacity="${strength}"/>
      <feComposite in2="soft" operator="in" result="rim"/>
      <feOffset in="SourceAlpha" dx="0" dy="-4" result="raised"/>
      <feComposite in="SourceAlpha" in2="raised" operator="out" result="under"/>
      <feGaussianBlur in="under" stdDeviation="3" result="underSoft"/>
      <feFlood flood-color="${LIGHT.cool}" flood-opacity="0.5"/>
      <feComposite in2="underSoft" operator="in" result="shade"/>
      <feComposite in="shade" in2="SourceAlpha" operator="in" result="shadeIn"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shadeIn"/><feMergeNode in="rim"/></feMerge>
    </filter>`).join('')}
    <clipPath id="pp-clip-floor"><polygon points="120,372 904,372 1004,748 20,748"/></clipPath>
    <clipPath id="pp-clip-walls"><polygon points="20,20 1004,20 1004,748 904,372 120,372 20,748"/></clipPath>
    <filter id="pp-streak-h" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.08" numOctaves="3" seed="9"/><feColorMatrix type="saturate" values="0"/></filter>
    <filter id="pp-streak-v" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.07 0.005" numOctaves="3" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>
    <linearGradient id="pp-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="pp-mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="4" seed="3"/><feColorMatrix type="saturate" values="0"/></filter>
    <filter id="pp-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="5"/><feColorMatrix type="saturate" values="0"/></filter>
    <radialGradient id="pp-shadowmap" cx="0.5" cy="0.6" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#f4eefc"/><stop offset="0.7" stop-color="#7d62ad"/><stop offset="1" stop-color="#22143f"/></radialGradient>
    <linearGradient id="pp-ceiling" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1a52"/><stop offset="0.14" stop-color="#ffffff"/></linearGradient>
    <linearGradient id="pp-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIGHT.warm}" stop-opacity="0.8"/><stop offset="0.6" stop-color="${LIGHT.warm}" stop-opacity="0.22"/><stop offset="1" stop-color="${LIGHT.warm}" stop-opacity="0"/></linearGradient>
    <radialGradient id="pp-pool"><stop offset="0" stop-color="${LIGHT.warm}" stop-opacity="1"/><stop offset="0.55" stop-color="${LIGHT.warm}" stop-opacity="0.5"/><stop offset="1" stop-color="${LIGHT.warm}" stop-opacity="0"/></radialGradient>
    <radialGradient id="pp-glow"><stop offset="0" stop-color="${LIGHT.glow}" stop-opacity="1"/><stop offset="0.5" stop-color="${LIGHT.glow}" stop-opacity="0.35"/><stop offset="1" stop-color="${LIGHT.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="pp-under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIGHT.cool}" stop-opacity="0.7"/><stop offset="1" stop-color="${LIGHT.cool}" stop-opacity="0"/></linearGradient>
    <radialGradient id="pp-teal-spill"><stop offset="0" stop-color="${LIGHT.teal}" stop-opacity="1"/><stop offset="1" stop-color="${LIGHT.teal}" stop-opacity="0"/></radialGradient>
    <linearGradient id="pp-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3aa8" stop-opacity="0.75"/><stop offset="0.5" stop-color="#2a1c5c" stop-opacity="0.4"/><stop offset="1" stop-color="#0d0920" stop-opacity="0"/></linearGradient>
    <radialGradient id="pp-nebula" cx="0.62" cy="0.45" r="0.7"><stop offset="0" stop-color="#8f5be8" stop-opacity="0.75"/><stop offset="1" stop-color="#2a1250" stop-opacity="0"/></radialGradient>
    <linearGradient id="pp-tank" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${LIGHT.teal}" stop-opacity="0.15"/><stop offset="0.35" stop-color="${LIGHT.teal}" stop-opacity="0.6"/><stop offset="1" stop-color="${LIGHT.teal}" stop-opacity="0.05"/></linearGradient>`);
  // Depth: the far wall takes a little haze (inScene); the stool nearest us goes soft and dark.
  world.querySelector('#room-b-props-front')?.setAttribute('filter', 'url(#pp-fore)');
  // The light of the room, over everything.
  const light = svgEl('g', { id: 'pp-light' });
  const layer = (blend, opacity = 1) => { const g = svgEl('g', { style: `mix-blend-mode: ${blend}`, opacity }); light.append(g); return g; };
  // Shadow first: the corners and the ceiling fall into the room's violet.
  const shadow = layer('multiply', 0.85);
  shadow.append(svgEl('rect', { width: 1024, height: 768, fill: 'url(#pp-shadowmap)' }));
  shadow.append(svgEl('rect', { width: 1024, height: 768, fill: 'url(#pp-ceiling)' }));
  // Lamplight: the beams, the dust in them, the pools on the deck, the bench and the wall.
  const beams = layer('screen', 0.34);
  for (const points of LIGHT.beams) beams.append(svgEl('polygon', { points, fill: 'url(#pp-beam)', filter: 'url(#pp-blur-14)' }));
  const dust = layer('screen', 0.9);
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 46; i += 1) {
    const lamp = i % 2, t = random(), y = 80 + t * 520, [l, r] = lamp ? [566 + (498 - 566) * t, 708 + (812 - 708) * t] : [316 + (262 - 316) * t, 458 + (572 - 458) * t];
    dust.append(svgEl('circle', { cx: (l + (r - l) * (0.15 + random() * 0.7)).toFixed(1), cy: y.toFixed(1), r: (0.7 + random() * 1.6).toFixed(2), fill: LIGHT.core, opacity: (0.18 + random() * 0.45 * (1 - t)).toFixed(2), filter: random() > 0.6 ? 'url(#pp-blur-2)' : null }));
  }
  const pools = layer('soft-light', 0.95);
  for (const [cx, cy, rx, ry] of LIGHT.pools) pools.append(svgEl('ellipse', { cx, cy, rx, ry, fill: 'url(#pp-pool)' }));
  const lift = layer('screen', 0.08);
  for (const [cx, cy, rx, ry] of LIGHT.pools.slice(0, 3)) lift.append(svgEl('ellipse', { cx, cy, rx, ry, fill: 'url(#pp-pool)' }));
  // What shines: the lamps themselves, the screen, the stars, the console, the flask and the tubes, the tank.
  const shine = layer('screen', 1);
  for (const points of LIGHT.lamps) {
    shine.append(svgEl('polygon', { points, fill: LIGHT.warm, filter: 'url(#pp-blur-30)', opacity: 0.55 }));
    shine.append(svgEl('polygon', { points, fill: LIGHT.warm, filter: 'url(#pp-blur-6)', opacity: 0.9 }));
    shine.append(svgEl('polygon', { points, fill: LIGHT.core, opacity: 0.85 }));
  }
  const bloom = (selector, filter, opacity, clip) => {
    const source = world.querySelector(selector);
    if (!source) return;
    const copy = source.cloneNode(true);
    copy.removeAttribute('id');
    for (const node of copy.querySelectorAll('[id]')) node.removeAttribute('id');
    const g = svgEl('g', { filter, opacity, ...(clip ? { 'clip-path': clip } : {}) });
    g.append(copy);
    shine.append(g);
  };
  bloom('#room-b-diagram', 'url(#pp-blur-2)', 1);
  bloom('#room-b-diagram', 'url(#pp-blur-6)', 0.8);
  bloom('#room-b-stars', 'url(#pp-blur-2)', 1, 'url(#clip-room-b-glass)');
  bloom('#room-b-lamps', 'url(#pp-blur-6)', 1);
  const [sx, sy, sw, sh] = LIGHT.screen;
  shine.append(svgEl('ellipse', { cx: sx + sw / 2, cy: sy + sh / 2, rx: sw * 0.85, ry: sh * 0.95, fill: 'url(#pp-glow)', opacity: 0.32 }));
  for (const [cx, cy, rx, ry] of [LIGHT.flask, LIGHT.tubes]) shine.append(svgEl('ellipse', { cx, cy, rx, ry, fill: 'url(#pp-glow)', opacity: 0.7 }));
  shine.append(svgEl('rect', { x: tx - 6, y: ty - 10, width: tw + 12, height: th + 20, rx: 30, fill: LIGHT.teal, filter: 'url(#pp-blur-30)', opacity: 0.42 }));
  shine.append(svgEl('rect', { x: tx + 6, y: ty + 6, width: tw - 12, height: th - 12, rx: 20, fill: LIGHT.teal, filter: 'url(#pp-blur-14)', opacity: 0.3 }));
  // Paint: a slow mottling of value, as a brush leaves it, and a fine grain.
  layer('soft-light', 0.24).append(svgEl('rect', { width: 1024, height: 768, filter: 'url(#pp-mottle)' }));
  layer('overlay', 0.07).append(svgEl('rect', { width: 1024, height: 768, filter: 'url(#pp-grain)' }));
  svg.append(light);
  svg.style.filter = 'saturate(1.16) contrast(1.1)';
}

// ---------- the page ----------

function picture(mode) {
  const svg = svgEl('svg', { viewBox: '0 0 1024 768' });
  const world = compose(mode);
  svg.append(world);
  if (mode === 'painted') paint(svg, world);
  let width = 1024, height = 768;
  if (crop.length === 4) {
    svg.setAttribute('viewBox', crop.join(' '));
    [width, height] = crop.slice(2);
  } else if (panelW) {
    // A phone panel's framing of the same scene (scenes/frame.mjs), as on the board.
    const { k, tx, ty } = frameScene(scene, { width: panelW, height: panelH, cap: 44 });
    svg.setAttribute('viewBox', `${-tx / k} ${-ty / k} ${panelW / k} ${panelH / k}`);
    width = panelW; height = panelH;
  }
  svg.setAttribute('width', String(width * scale));
  svg.setAttribute('height', String(height * scale));
  return svg;
}

const page = document.getElementById('page');
const card = (mode, title, note) => {
  const frame = document.createElement('div');
  frame.className = 'pr-frame';
  frame.append(picture(mode));
  const flag = document.createElement('span');
  flag.className = 'pr-flag';
  flag.textContent = mode === 'painted' ? 'Painted · code draft' : 'Comic · today';
  frame.append(flag);
  const figure = document.createElement('figure');
  figure.className = 'pr-card';
  const caption = document.createElement('figcaption');
  caption.append(title, ' ');
  const sub = document.createElement('span');
  sub.textContent = note;
  caption.append(sub);
  figure.append(caption, frame);
  return figure;
};
const head = document.createElement('header');
head.className = 'pr-head';
head.innerHTML = '<h1>Room B, repainted: a draft test</h1><p>One room drawn twice from the same scene, places and figures. <b>Comic</b>: the look the board-motion prototype draws today (flat color, ink outline, halftone). <b>Painted</b>: the same drawing repainted by code in a painted, lit look (soft gradients for flat color, thin soft edges for ink, lamplight and shadow, glow from what shines, a reflection in the deck, brushwork and grain). Nothing is painted by hand and no image is generated: a code stand-in for the direction an illustrator would take, to compare. The game owner\'s request of 11 October 2026; an exploration, not an asset.</p>';
const row = document.createElement('div');
row.className = 'pr-row';
if (view !== 'painted') row.append(card('comic', 'Comic', 'the board-motion prototype today'));
if (view !== 'comic') row.append(card('painted', 'Painted', 'draft test, by code'));
page.append(head, row);
window.__designReady = true;

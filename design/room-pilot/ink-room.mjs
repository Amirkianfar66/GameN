// mothership:dev-only
//
// The rooms' ink (the room pilot, docs/design/room-pilot.md): a room scene's pictures as the board
// shows them today, redrawn shape for shape in the approved crew's hand, as Room A was redrawn by
// hand (./room-a.mjs, which the owner approved on 8 November 2026). Every shape keeps its place,
// its size and its order; only how it is drawn changes:
//  - A filled shape is drawn with the crew's own ink canvas (design/crew-drawing/source/ink.mjs):
//    a hand-drawn, wavering outline where today's has one, a cel shadow on the side away from the
//    light (from the upper left, as on the crew), hatched, with a rim light, and a scratched grain.
//  - A line is drawn by hand, wavering a little. Today's halftone dots become the crew's hatching.
//  - The room's walls and deck are printed one step darker in its own colour family (noir), as
//    Room A's are; its fittings and props keep their tones, so they stand out.
//  - The room's light: today's cones become shafts that fade toward the deck, with dust in them;
//    its pools a hard-edged step of light with a soft heart and a dotted fringe; the ceiling bars
//    glow, the side walls fall into the dark toward us, and a vignette gathers the dark at the
//    panel's edges.
// It reads SVG text and writes SVG text, in Node and in a browser alike. Nothing here changes a
// scene, a slot, a place, a focus or a press area, and nothing in it is written.

import { INK, inkCanvas, pathOfPoly, spline, waver } from '../crew-drawing/source/ink.mjs';

export const PAPER = Object.freeze({ plain: '#F4EBDD', shade: '#E3D6C2', deep: '#CBBBA2' });
export const SPACE = '#10141C';
/** A colour family's tones, dark to light (tokens 0.5.0 color.room.*). */
export const TONES = Object.freeze(['deep', 'shadow', 'mid', 'light', 'pale']);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = n => Math.round(n * 100) / 100;

/** Room A's family (tokens 0.5.0 color.room.roomA): the darkness every room is matched to. */
export const REFERENCE = Object.freeze({ deep: '#14243F', shadow: '#1D3D6B', mid: '#2D609E', light: '#5C92CC', pale: '#A9CAEB' });
/** A colour's relative luminance (WCAG). */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/**
 * The tone of a family that Room A's approved drawing would use: Room A's tone `name`, or one
 * step darker, whichever of the family's two is nearer Room A's in lightness. The gold and teal
 * families are lighter than the blue at every step, so their walls and deck go one step further
 * down to be as dark as Room A's; the others keep the step.
 */
export function matchedTone(family, name) {
  const i = TONES.indexOf(name), target = luminance(REFERENCE[name]);
  const [a, b] = [TONES[i], TONES[Math.max(0, i - 1)]];
  return Math.abs(luminance(family[b]) - target) < Math.abs(luminance(family[a]) - target) ? family[b] : family[a];
}

// ---------- Reading today's picture ----------

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;

/** The elements of an SVG text as a tree: { tag, attrs, children }. Comments, declarations and text are left out. */
export function parseSvg(text) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  for (const [, close, tag, attrs, self] of text.matchAll(TOKEN)) {
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    if (!tag) continue;
    const node = { tag, attrs: {}, children: [] };
    for (const [, name, value] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) node.attrs[name] = value;
    stack.at(-1).children.push(node);
    if (!self) stack.push(node);
  }
  const svg = root.children.find(node => node.tag === 'svg');
  if (!svg) throw new Error('Not an SVG picture');
  return svg;
}

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const numbers = text => (String(text).match(NUMBER) ?? []).map(Number);

/** An elliptical arc from p to q (SVG's endpoint form), sampled: the points after p. */
function arcPoints([x1, y1], rx, ry, deg, large, sweep, [x2, y2]) {
  if (!rx || !ry) return [[x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (deg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry, vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  const start = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  const n = clamp(Math.ceil((Math.abs(delta) * Math.max(rx, ry)) / 5), 4, 96);
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    const t = start + (delta * i) / n;
    out.push([cx + rx * cos * Math.cos(t) - ry * sin * Math.sin(t), cy + rx * sin * Math.cos(t) + ry * cos * Math.sin(t)]);
  }
  out[n - 1] = [x2, y2];
  return out;
}

/** A Bézier curve of any order, sampled: the points after its start. */
function bezierPoints(points) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const n = clamp(Math.ceil(length / 5), 3, 48);
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    let ps = points;
    while (ps.length > 1) ps = ps.slice(1).map((p, j) => [ps[j][0] + (p[0] - ps[j][0]) * t, ps[j][1] + (p[1] - ps[j][1]) * t]);
    out.push(ps[0]);
  }
  return out;
}

const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** A path's data as its subpaths, sampled into points: [{ points, closed }]. */
export function pathShapes(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const shapes = [];
  let shape = null, cur = [0, 0], start = [0, 0], lastControl = null, command = null, i = 0;
  const take = n => { const out = tokens.slice(i, i + n).map(Number); i += n; return out; };
  const push = (...ps) => { for (const p of ps) shape.points.push(p); };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) { command = tokens[i]; i += 1; }
    const upper = command.toUpperCase(), rel = command !== upper && upper !== 'Z';
    const at = ([x, y]) => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    if (upper === 'Z') {
      if (shape) { shape.closed = true; cur = start; }
      lastControl = null;
      continue;
    }
    const args = take(ARGS[upper]);
    if (args.length < ARGS[upper]) break;
    if (upper === 'M') {
      cur = at(args);
      start = cur;
      shape = { points: [cur], closed: false };
      shapes.push(shape);
      command = rel ? 'l' : 'L';
      lastControl = null;
      continue;
    }
    if (!shape) { shape = { points: [cur], closed: false }; shapes.push(shape); }
    let next;
    if (upper === 'L' || upper === 'T') {
      next = at(args);
      if (upper === 'T') {
        const control = lastControl ? [2 * cur[0] - lastControl[0], 2 * cur[1] - lastControl[1]] : cur;
        push(...bezierPoints([cur, control, next]));
        lastControl = control;
      } else { push(next); lastControl = null; }
    } else if (upper === 'H') {
      next = [rel ? cur[0] + args[0] : args[0], cur[1]]; push(next); lastControl = null;
    } else if (upper === 'V') {
      next = [cur[0], rel ? cur[1] + args[0] : args[0]]; push(next); lastControl = null;
    } else if (upper === 'C') {
      const c1 = at(args.slice(0, 2)), c2 = at(args.slice(2, 4));
      next = at(args.slice(4, 6));
      push(...bezierPoints([cur, c1, c2, next]));
      lastControl = c2;
    } else if (upper === 'S') {
      const c1 = lastControl ? [2 * cur[0] - lastControl[0], 2 * cur[1] - lastControl[1]] : cur;
      const c2 = at(args.slice(0, 2));
      next = at(args.slice(2, 4));
      push(...bezierPoints([cur, c1, c2, next]));
      lastControl = c2;
    } else if (upper === 'Q') {
      const c = at(args.slice(0, 2));
      next = at(args.slice(2, 4));
      push(...bezierPoints([cur, c, next]));
      lastControl = c;
    } else if (upper === 'A') {
      next = at(args.slice(5, 7));
      push(...arcPoints(cur, args[0], args[1], args[2], args[3] ? 1 : 0, args[4] ? 1 : 0, next));
      lastControl = null;
    }
    cur = next;
  }
  return shapes.map(s => ({ ...s, points: s.points.filter((p, k, all) => !k || Math.hypot(p[0] - all[k - 1][0], p[1] - all[k - 1][1]) > 0.01) }))
    .map(s => (s.closed && s.points.length > 2 && Math.hypot(s.points[0][0] - s.points.at(-1)[0], s.points[0][1] - s.points.at(-1)[1]) < 0.01 ? { ...s, points: s.points.slice(0, -1) } : s))
    .filter(s => s.points.length > 1);
}

const ellipsePoints = (cx, cy, rx, ry, n) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});

function roundRectPoints(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const corner = (cx, cy, from) => Array.from({ length: 4 }, (_, i) => {
    const a = from + (i / 3) * (Math.PI / 2);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  return [...corner(x + w - r, y + r, -Math.PI / 2), ...corner(x + w - r, y + h - r, 0), ...corner(x + r, y + h - r, Math.PI / 2), ...corner(x + r, y + r, Math.PI)];
}

/** An element's geometry as closed or open point lists. */
export function shapesOf(node) {
  const a = node.attrs, n = key => Number(a[key] ?? 0);
  switch (node.tag) {
    case 'polygon': case 'polyline': {
      const v = numbers(a.points);
      const points = [];
      for (let i = 0; i + 1 < v.length; i += 2) points.push([v[i], v[i + 1]]);
      return [{ points, closed: node.tag === 'polygon' }];
    }
    case 'rect': {
      const [x, y, w, h, rx] = [n('x'), n('y'), n('width'), n('height'), n('rx') || n('ry')];
      return [{ points: rx ? roundRectPoints(x, y, w, h, rx) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }];
    }
    case 'circle': case 'ellipse': {
      const rx = node.tag === 'circle' ? n('r') : n('rx'), ry = node.tag === 'circle' ? n('r') : n('ry');
      return [{ points: ellipsePoints(n('cx'), n('cy'), rx, ry, clamp(Math.round(Math.max(rx, ry) / 3), 10, 48)), closed: true }];
    }
    case 'line': return [{ points: [[n('x1'), n('y1')], [n('x2'), n('y2')]], closed: false }];
    case 'path': return pathShapes(a.d ?? '');
    default: return [];
  }
}

function boundsOf(shapes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { points } of shapes) for (const [x, y] of points) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const OMIT = new Set(['id', 'clip-path', 'transform']);
/** An element written again, its attributes changed or dropped by `change` (null drops one). */
function serialize(node, change = {}, omit = OMIT) {
  const attrs = { ...node.attrs, ...change };
  const text = Object.entries(attrs).filter(([name, value]) => !omit.has(name) && value !== null && value !== undefined).map(([name, value]) => ` ${name}="${value}"`).join('');
  return node.children.length ? `<${node.tag}${text}>${node.children.map(child => serialize(child, {}, omit)).join('')}</${node.tag}>` : `<${node.tag}${text}/>`;
}

// ---------- The room's light, as Room A's ----------

/** A soft glow: an ellipse of light fading to nothing at its edge. */
export function glow(cv, cx, cy, rx, ry, color, opacity) {
  const id = cv.uid('glow');
  cv.def(`<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${r2(opacity * 0.55)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
  cv.raw(`<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="url(#${id})"/>`);
}

/** A line drawn by hand, even, wavering a little (a seam, a cable, an edge). */
export function handLine(cv, points, { closed = false, color = INK, width = 2, opacity = null, seed = 3, wobble = 0.5, cap = 'round' } = {}) {
  const line = waver(spline(points, { closed, step: 4, tension: 0 }), seed, wobble, 14, closed);
  cv.raw(`<path d="${pathOfPoly(line, closed)}" fill="none" stroke="${color}" stroke-width="${r2(width)}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${r2(opacity)}"`}/>`);
}

/** A shaft of light from a ceiling bar to the deck: brightest at the top, dust in it. */
export function shaft(cv, [t0, t1], [b0, b1], seed) {
  const beam = cv.uid('beam');
  // A broad cone (a whole bridge lit at once) is fainter, so the window behind it stays dark.
  const k = clamp(180 / Math.abs(t1[0] - t0[0]), 0.5, 1);
  cv.def(`<linearGradient id="${beam}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAPER.plain}" stop-opacity="${r2(0.4 * k)}"/><stop offset="0.5" stop-color="${PAPER.plain}" stop-opacity="${r2(0.16 * k)}"/><stop offset="1" stop-color="${PAPER.plain}" stop-opacity="${r2(0.07 * k)}"/></linearGradient>`);
  cv.raw(`<polygon points="${[t0, t1, b1, b0].map(p => p.map(r2).join(',')).join(' ')}" fill="url(#${beam})"/>`);
  handLine(cv, [t0, b0], { color: PAPER.plain, width: 1.2, opacity: 0.22, seed });
  handLine(cv, [t1, b1], { color: PAPER.plain, width: 1.2, opacity: 0.22, seed: seed + 5 });
  for (let i = 0; i < 9; i += 1) {
    const t = ((i * 37 + seed * 11) % 97) / 97, u = ((i * 61 + seed * 7) % 89) / 89;
    const y = t0[1] + 32 + t * (b0[1] - t0[1]) * 0.78, k = (y - t0[1]) / (b0[1] - t0[1]);
    const x0 = t0[0] + (b0[0] - t0[0]) * k, x1 = t1[0] + (b1[0] - t1[0]) * k;
    cv.raw(`<circle cx="${(x0 + (x1 - x0) * (0.15 + u * 0.7)).toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + (i % 3) * 0.45).toFixed(2)}" fill="${PAPER.plain}" opacity="${(0.35 + (i % 4) * 0.1).toFixed(2)}"/>`);
  }
}

/** A pool of light on the deck: one hard-edged step of light, as the crew's cel shading, a soft heart, a dotted fringe. */
export function pool(cv, family, [cx, cy, rx, ry], seed) {
  const step = matchedTone(family, 'light'), fringe = family[TONES[TONES.findIndex(tone => family[tone] === step) + 1]];
  glow(cv, cx, cy, rx * 1.4, ry * 1.5, fringe, 0.3);
  cv.raw(`<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx * 1.13)}" ry="${r2(ry * 1.17)}" fill="url(#${cv.prefix}-dots-fringe)" opacity="0.55"/>`);
  cv.form(ellipsePoints(cx, cy, rx, ry, 36), step, { weight: 0, depth: 0, tension: 1, wobble: 1.6, step: 8, seed, rim: false, hatch: false, grain: true });
  glow(cv, cx - rx * 0.08, cy - ry * 0.06, rx * 0.78, ry * 0.74, PAPER.plain, 0.55);
}

/** The side walls fall into the dark toward us, as Room A's: a few seams, darker toward the front. */
function sideWalls(cv, family) {
  const dark = cv.uid('side');
  cv.def(`<linearGradient id="${dark}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.42"/></linearGradient>`);
  for (const [x, s] of [[54, 16], [88, 17]]) handLine(cv, [[x, 26 + (x - 20) * 0.5], [x, 748 - (x - 20) * 3.76]], { color: SPACE, width: 1.6, opacity: 0.6, seed: s });
  for (const [x, s] of [[970, 18], [936, 19]]) handLine(cv, [[x, 220 - (1004 - x) * 0.66], [x, 748 - (1004 - x) * 3.76]], { color: family.deep, width: 1.6, opacity: 0.7, seed: s });
  cv.raw(`<polygon points="20,20 120,70 120,372 20,748" fill="url(#${dark})"/><polygon points="1004,20 904,70 904,372 1004,748" fill="url(#${dark})"/>`);
}

/** The dark gathering at the panel's edges, and the front of the deck falling into shadow, hatched. */
export function finish(cv) {
  const vignette = cv.uid('dark');
  cv.def(`<radialGradient id="${vignette}" cx="0.5" cy="0.56" r="0.7"><stop offset="0.5" stop-color="${INK}" stop-opacity="0"/><stop offset="0.82" stop-color="${INK}" stop-opacity="0.4"/><stop offset="1" stop-color="${INK}" stop-opacity="0.7"/></radialGradient>`);
  cv.raw(`<rect x="0" y="0" width="1024" height="768" fill="url(#${vignette})"/>`);
  cv.raw(`<polygon points="20,748 1004,748 990,700 34,700" fill="${INK}" opacity="0.18"/><polygon points="20,748 1004,748 990,700 34,700" fill="url(#${cv.prefix}-hatch)" opacity="0.6"/>`);
}

/** The patterns the room's light uses: a paper dot screen, and the pools' fringe, a tone above their light. */
export function lightPatterns(cv, family) {
  cv.def(`<pattern id="${cv.prefix}-dots-paper" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="2.2" fill="${PAPER.plain}"/></pattern>`);
  const fringe = family[TONES[TONES.findIndex(tone => family[tone] === matchedTone(family, 'light')) + 1]];
  cv.def(`<pattern id="${cv.prefix}-dots-fringe" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="2.2" fill="${fringe}"/></pattern>`);
}

// ---------- Redrawing a picture ----------

/** Which part of a room a named group of today's picture is. */
function partOf(id = '') {
  if (/-scene-floor$/.test(id)) return 'floor';
  if (/-scene-props$|-props-back$|-props-front$/.test(id)) return 'props';
  if (/-scene-[\w-]+$/.test(id)) return 'layer';
  const match = id.match(/-(space|backwall|shell|edges)$/);
  return match ? match[1] : null;
}

/**
 * Noir: a wall's or the deck's tone, printed as dark as Room A's. steps: how far the part goes
 * down in Room A (the back wall and the deck one step, the side walls none). Ink, paper and other
 * colours are kept.
 */
function noir(family, fill, steps) {
  const i = TONES.findIndex(tone => family[tone] === fill);
  return i < 0 ? fill : matchedTone(family, TONES[Math.max(0, i - steps)]);
}

/** Draws one of today's shapes again; says what it drew: a shape, a pool, a shaft, or a pool's rim left out. */
function drawShape(cv, node, style, ctx) {
  const shapes = shapesOf(node);
  if (!shapes.length) return 'empty';
  const seed = ctx.next();
  const fill = !style.fill || style.fill === 'none' ? null : style.fill.startsWith('url(') ? style.fill : style.fill.toUpperCase();
  const stroke = style.stroke && style.stroke !== 'none' && style.strokeWidth > 0 ? style.stroke.toUpperCase() : null;
  const opacity = Number(node.attrs.opacity ?? 1);
  const box = boundsOf(shapes);
  const size = Math.min(box.w, box.h), span = Math.max(box.w, box.h);
  const rule = style.rule === 'evenodd' ? ' fill-rule="evenodd"' : '';
  const d = () => shapes.map(s => pathOfPoly(s.points, s.closed)).join('');

  // Today's halftone: ink dots become the crew's hatching; paper dots a paper dot screen. A
  // pool's dotted rim is left out: the pool is drawn again.
  if (fill && fill.startsWith('url(')) {
    const id = fill.slice(5, -1);
    if (/paper/i.test(id)) {
      if (ctx.part === 'floor' && style.rule === 'evenodd') return 'rim';
      cv.raw(`<path d="${d()}"${rule} fill="url(#${cv.prefix}-dots-paper)" opacity="${r2(opacity * 0.5)}"/>`);
    } else {
      const density = /-l(?:-|$)/.test(id) ? 1 : /-m(?:-|$)/.test(id) ? 0.85 : 0.65;
      cv.raw(`<path d="${d()}"${rule} fill="url(#${cv.prefix}-hatch)" opacity="${r2(opacity * density)}"/>`);
    }
    return 'shape';
  }

  if (fill && opacity < 1) {
    // A cone of light from a ceiling bar: a shaft.
    const pts = shapes[0].points;
    if (!ctx.layer && fill === PAPER.plain && opacity <= 0.14 && node.tag === 'polygon' && pts.length === 4 && pts[0][1] <= 72 && pts[2][1] >= 480) {
      shaft(cv, [pts[0], pts[1]], [pts[3], pts[2]], seed);
      return 'shaft';
    }
    // A glint, a contact shadow, the light off a screen: as it is.
    cv.raw(serialize(node, { fill, stroke: stroke ?? null, 'stroke-width': stroke ? style.strokeWidth : null, opacity }));
    return 'shape';
  }

  if (fill) {
    // A pool of light on the deck.
    if (!ctx.layer && ctx.part === 'floor' && node.tag === 'ellipse' && fill === ctx.family.pale && Number(node.attrs.rx) >= 80) {
      pool(cv, ctx.family, [Number(node.attrs.cx), Number(node.attrs.cy), Number(node.attrs.rx), Number(node.attrs.ry)], seed);
      return 'pool';
    }
    // Noir: the back wall and the deck one step darker, the side walls as they are, each as dark
    // as Room A's; fittings (inked, and smaller than a pillar) keep their tone and stand out.
    const structure = !ctx.layer && (ctx.part === 'backwall' || ctx.part === 'floor' || ctx.part === 'shell') && (!stroke || box.h >= 280);
    const tone = structure ? noir(ctx.family, fill, ctx.part === 'shell' ? 0 : 1) : fill;
    // The ceiling bars glow.
    if (!ctx.layer && ctx.part === 'shell' && fill === PAPER.plain && box.y >= 25 && box.y + box.h <= 62 && box.w >= 120) glow(cv, box.x + box.w / 2, 46, box.w * 0.66, 30, PAPER.plain, 0.42);
    // A shape with holes (a wall round a window): its fill, grained, and each outline inked.
    if (shapes.length > 1) {
      cv.raw(`<path d="${d()}"${rule} fill="${tone}"/><path d="${d()}"${rule} fill="url(#${cv.prefix}-grain)"/>`);
      if (stroke) shapes.forEach((s, k) => (s.closed ? cv.outline(waver(spline(s.points, { step: 6, tension: 0 }), seed + k, 0.6), clamp(style.strokeWidth * 0.72, 1.3, 3.6), seed + k) : handLine(cv, s.points, { width: style.strokeWidth * 0.92, seed: seed + k })));
      return 'shape';
    }
    const [shape] = shapes;
    // A rivet, a star, a bolt head: as it is.
    if (span < 8 && !stroke) { cv.raw(serialize(node, { fill: tone })); return 'shape'; }
    const round = node.tag === 'circle' || node.tag === 'ellipse';
    const look = {
      tension: round ? 1 : 0,
      wobble: clamp(size / 60, 0.2, 0.75) * (round ? 0.8 : 1),
      step: round ? clamp(size / 10, 2, 4) : clamp(size / 10, 2.5, 6),
      seed,
    };
    if (stroke && shape.closed) {
      const weight = Math.min(clamp(style.strokeWidth * 0.72, 1.3, 3.6), size * 0.35 + 1);
      // A ceiling bar is a light: it casts no shadow on itself.
      const lamp = ctx.part === 'shell' && fill === PAPER.plain;
      const depth = lamp ? 2 : size >= 150 ? 12 : size >= 80 ? 9 : null;
      cv.form(shape.points, tone, { ...look, weight, depth, hatch: !lamp && size >= 10, rim: !lamp && size >= 14, grain: true, shadowTone: lamp ? PAPER.shade : null });
    } else {
      cv.form(shape.points, tone, { ...look, weight: 0, depth: 0, hatch: false, rim: false, grain: span >= 30 });
      if (stroke) handLine(cv, shape.points, { closed: false, color: stroke === INK ? INK : stroke, width: style.strokeWidth * 0.92, seed, cap: style.cap ?? 'round' });
    }
    return 'shape';
  }

  // A line: a seam, a cable, an edge, a mark.
  if (!stroke) return 'empty';
  shapes.forEach((s, k) => handLine(cv, s.points, {
    closed: s.closed, color: stroke, width: style.strokeWidth * (stroke === INK ? 0.92 : 1), opacity: opacity < 1 ? opacity : null,
    seed: seed + k, wobble: clamp(style.strokeWidth * 0.12, 0.3, 0.6), cap: style.cap ?? 'round',
  }));
  return 'shape';
}

const SHAPES = new Set(['polygon', 'polyline', 'rect', 'circle', 'ellipse', 'line', 'path']);

function draw(cv, node, inherited, ctx) {
  const a = node.attrs;
  if (node.tag === 'defs' || node.tag === 'clipPath' || node.tag === 'pattern' || node.tag === 'mask') return;
  const style = {
    fill: a.fill ?? inherited.fill,
    stroke: a.stroke ?? inherited.stroke,
    strokeWidth: Number(a['stroke-width'] ?? inherited.strokeWidth ?? 1),
    rule: a['fill-rule'] ?? inherited.rule,
    cap: a['stroke-linecap'] ?? inherited.cap,
  };
  const wrap = [
    a.transform ? ` transform="${a.transform}"` : '',
    a['clip-path'] ? ` clip-path="${a['clip-path'].replace(/url\(#([^)]+)\)/, (_, id) => `url(#${cv.prefix}-${id})`)}"` : '',
    node.tag === 'g' && a.opacity ? ` opacity="${a.opacity}"` : '',
  ].join('');
  if (wrap) cv.raw(`<g${wrap}>`);
  if (node.tag === 'g' || node.tag === 'svg') {
    const part = partOf(a.id) ?? ctx.part;
    const inner = { ...ctx, part };
    for (const child of node.children) draw(cv, child, style, inner);
    if (!ctx.layer && part === 'shell' && ctx.part !== 'shell') sideWalls(cv, ctx.family);
  } else if (SHAPES.has(node.tag)) {
    ctx.stats.source += 1;
    ctx.stats[drawShape(cv, node, style, ctx)] += 1;
  }
  if (wrap) cv.raw('</g>');
}

/**
 * A picture of a room redrawn in the crew's ink: today's picture (its SVG text), the room's
 * colour family (tokens 0.5.0), and prefix, its ids'. layer: a layer drawn in front of the
 * places (a bench, a table, a berth), which takes no room light, vignette or darker walls.
 * header: given, the picture as a file, with its XML declaration and this comment. stats: an
 * object given the count of today's shapes (source) and of what each became: a shape drawn again,
 * a pool, a shaft, a pool's dotted rim left out (the pool is drawn whole), or empty (no geometry).
 */
export function inkRoomSvg(text, family, { prefix, layer = false, header = null, stats = {} } = {}) {
  if (!prefix) throw new Error('inkRoomSvg needs a prefix');
  const svg = parseSvg(text);
  const cv = inkCanvas(prefix);
  lightPatterns(cv, family);
  // Today's clip paths, under this picture's ids.
  const defs = svg.children.find(node => node.tag === 'defs');
  for (const clip of defs?.children.filter(node => node.tag === 'clipPath') ?? []) {
    cv.def(`<clipPath id="${prefix}-${clip.attrs.id}">${clip.children.map(child => serialize(child, {}, new Set(['id']))).join('')}</clipPath>`);
  }
  let count = 0;
  Object.assign(stats, { source: 0, shape: 0, pool: 0, shaft: 0, rim: 0, empty: 0 });
  const ctx = { family, layer, part: null, stats, next: () => (count += 1) * 7 };
  for (const child of svg.children) draw(cv, child, { fill: '#000000', stroke: 'none', strokeWidth: 1 }, ctx);
  if (!layer) finish(cv);
  return cv.svg({ viewBox: '0 0 1024 768', width: 1024, height: 768, inline: header === null, header: header ?? '' });
}

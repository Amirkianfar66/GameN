// Pure machinery drawing from #231 (machine.mjs); no simulator or clock.
import {INK, inkCanvas, shade, tint, PAPER, handLine, glow, FAMILY, clipToBox} from './food-ink.mjs';
import {BLADE, BOXES, CARRIAGE, CRATE, DECK, RAIL, STEP, X0, stopX, STOPS} from './food-geometry.mjs';

const F = FAMILY;
/** Amber: focus, the colour of a control that asks for a press, and of where the crate should go (tokens: the interface's accent). */
export const AMBER = '#F1B84B';
const STEEL = '#8A93A3';
const r1 = v => Math.round(v * 10) / 10;
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const rot = ([x, y], [cx, cy], a) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const plate = (cv, points, fill, seed, opts = {}) => cv.form(points, fill, { tension: 0, step: 3, wobble: 0.25, seed, weight: 2.6, ...opts });

/** A lamp: its glass, lit (a glow and a white heart) or dark. tone: the lit colour. */
function lamp(cv, [x, y], r, lit, { tone = PAPER.plain, seed = 7 } = {}) {
  if (lit) glow(cv, x, y, r * 3.2, r * 3.2, tone, 0.55);
  cv.form([[x - r, y], [x, y - r], [x + r, y], [x, y + r]], lit ? tone : shade(F.mid, 0.5), { tension: 1, seed, weight: 2.2, depth: lit ? 0 : 3, hatch: !lit, rim: false, grain: false });
  if (lit) cv.flat([[x - r * 0.35, y - r * 0.35], [x, y - r * 0.55], [x + r * 0.2, y - r * 0.2], [x - r * 0.2, y]], '#FFFFFF', { opacity: 0.8 });
}

/** Hazard stripes, ink on paper, inside a polygon's box: the room's own painted warnings. */
function hazardStripes(cv, [x, y, w, h], { step = 16, opacity = 0.85 } = {}) {
  for (let k = -h; k < w + h; k += step) {
    const band = clipToBox([[x + k, y + h], [x + k + h, y], [x + k + h + step / 2, y], [x + k + step / 2, y + h]], [x, y, w, h]);
    if (band.length >= 3) cv.raw(`<polygon points="${band.map(([a, b]) => `${r1(a)},${r1(b)}`).join(' ')}" fill="${INK}" opacity="${opacity}"/>`);
  }
}

/**
 * The numbers painted on the rail at each stop, 1 to 7: paper plates in ink; 6, over the platform,
 * in amber (where the crate should go); 7, over the cab, striped (where a lock cuts). lit: the stop
 * the panel is at or passing, its plate ringed.
 */
export function stopPlates(cv, { lit = null } = {}) {
  for (let s = 0; s < STOPS; s += 1) {
    const x = stopX(s), y = RAIL.top + 3, w = 26, h = 24;
    const fill = s === 5 ? AMBER : PAPER.plain;
    cv.raw(`<g><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${INK}" stroke-width="${s === lit ? 4 : 2.5}"/></g>`);
    if (s === 6) hazardStripes(cv, [x - w / 2 + 1.5, y + 1.5, w - 3, h - 3], { step: 9, opacity: 0.75 });
    if (s === 6) cv.raw(`<rect x="${x - 8}" y="${y + 4}" width="16" height="16" rx="3" fill="${PAPER.plain}"/>`);
    cv.raw(`<text x="${x}" y="${y + 18}" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="800" font-size="16" fill="${INK}">${s + 1}</text>`);
  }
}

/** The festoon: the panel's power cable, hung in loops under the rail from its left end to the carriage. */
export function festoon(cv, carriageX) {
  const from = RAIL.left + 6, to = carriageX - CARRIAGE.half - 4;
  if (to <= from + 6) return;
  const n = Math.max(1, Math.round((to - from) / 72));
  const span = (to - from) / n;
  for (let k = 0; k < n; k += 1) {
    const a = from + k * span, b = a + span, sag = Math.min(30, 8 + span * 0.3);
    cv.line([[a, RAIL.bottom + 4], [a + span * 0.18, RAIL.bottom + sag * 0.8], [a + span / 2, RAIL.bottom + sag], [b - span * 0.18, RAIL.bottom + sag * 0.8], [b, RAIL.bottom + 4]], { weight: 3, taper: 'none', seed: 60 + k, tension: 0.8 });
    cv.form([[b - 4, RAIL.bottom - 2], [b + 4, RAIL.bottom - 2], [b + 4, RAIL.bottom + 8], [b - 4, RAIL.bottom + 8]], STEEL, { tension: 0, seed: 70 + k, weight: 1.6, depth: 0 });
  }
}

/**
 * The locking panel's carriage at x: its wheels on the rail (turned by its travel), its body under
 * the rail with the hoist drum (turned by the cable), and the panel itself: a hazard-striped shutter
 * blade that the lock slams down. blade: the shutter's bottom edge, a y (BLADE.up raised and running,
 * BLADE.locked locked, deeper into the cab for the cut or onto its buffer when stopped).
 */
export function carriage(cv, x, { blade = BLADE.locked, wheel = 0, drum = 0 } = {}) {
  // The shutter, behind the body: only what hangs below it shows.
  const sx = x - BLADE.half - 10, sw = (BLADE.half + 10) * 2;
  const top = Math.max(CARRIAGE.top + 4, blade - 96);
  if (blade > CARRIAGE.bottom - 2) {
    const shutter = box(sx, top, sw, blade - top);
    plate(cv, shutter, PAPER.shade, 90, { depth: 0, hatch: false });
    hazardStripes(cv, [sx, top, sw, blade - top]);
    cv.outline(shutter.map(p => [...p]), 2.8, 91);
    plate(cv, box(sx - 4, blade - 6, sw + 8, 8), STEEL, 93, { depth: 0, weight: 2.2 });
  }
  for (const [k, wx] of [x - 38, x + 38].entries()) {
    const c = [wx, RAIL.top - 12];
    cv.form([[c[0] - 13, c[1]], [c[0], c[1] - 13], [c[0] + 13, c[1]], [c[0], c[1] + 13]], STEEL, { seed: 80 + k, weight: 2.4, depth: 4 });
    cv.line([rot([c[0] - 9, c[1]], c, wheel), rot([c[0] + 9, c[1]], c, wheel)], { weight: 2.2, taper: 'none', seed: 82 + k });
    plate(cv, box(wx - 5, RAIL.top - 12, 10, RAIL.bottom - RAIL.top + 22), F.shadow, 84 + k, { depth: 0 });
  }
  plate(cv, box(x - CARRIAGE.half, CARRIAGE.top + 2, CARRIAGE.half * 2, CARRIAGE.bottom - CARRIAGE.top - 2), F.light, 86, { depth: 9 });
  cv.raw(`<g fill="${F.pale}">${[x - 50, x + 50].map(a => `<circle cx="${a}" cy="${CARRIAGE.top + 12}" r="3"/><circle cx="${a}" cy="${CARRIAGE.bottom - 10}" r="3"/>`).join('')}</g>`);
  // The drum, its windings sliding as it turns.
  plate(cv, box(x - 30, CARRIAGE.top + 8, 60, 22), F.mid, 87, { depth: 5 });
  for (let k = 0; k < 6; k += 1) {
    const u = ((k / 6 + drum / (2 * Math.PI)) % 1 + 1) % 1;
    cv.line([[x - 26 + u * 52, CARRIAGE.top + 10], [x - 24 + u * 52, CARRIAGE.top + 28]], { weight: 1.5, taper: 'none', seed: 88 + k, opacity: 0.8 });
  }
  // The sheave the cable leaves from.
  cv.form([[x - 9, CARRIAGE.pivot - 3], [x, CARRIAGE.pivot - 12], [x + 9, CARRIAGE.pivot - 3], [x, CARRIAGE.pivot + 6]], STEEL, { seed: 89, weight: 2, depth: 0 });
}

/** The cab's inside, behind the operator: its dark back and the seat. */
export function cabBack(cv) {
  const [x, y, w, h] = BOXES.cabWindow;
  plate(cv, box(x - 4, y - 4, w + 8, h + 66), shade(F.deep, 0.35), 31, { depth: 0, hatch: false, rim: false });
  cv.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h + 60}" fill="url(#${cv.prefix}-hatch)" opacity="0.5"/>`);
  plate(cv, box(x + 30, y + 74, 68, 12), F.shadow, 32);
  plate(cv, box(x + 92, y + 30, 10, 56), F.deep, 33, { depth: 0 });
}

/**
 * The cab's shell round its window, over the operator: the roof with the slot the panel's shutter
 * comes through at this stop, the posts, the panel below with the winch's two levers and the key,
 * the warning lamp on the roof, and the roof buffer the safety catch throws across the slot.
 * cut: after the cut, the roof split at the slot and the glass cracked. lampLit: the panel is
 * passing this stop. key: the Winch's key turned. buffer: 0..1, the roof buffer thrown across.
 */
export function cabFront(cv, { cut = false, lampLit = false, key = false, buffer = 0 } = {}) {
  const [x, y, w, h] = BOXES.cab;
  const [wx, wy, ww, wh] = BOXES.cabWindow;
  // The roof: two plates either side of the slot, striped at its lips.
  const slot = [stopX(6) - BLADE.half - 14, stopX(6) + BLADE.half + 14];
  const sag = cut ? 8 : 0;
  plate(cv, [[x - 6, y + 18], [x + 10, y], [slot[0], y], [slot[0], wy], [x - 6, wy]], F.mid, 41, { depth: 8 });
  plate(cv, [[slot[1], y], [x + w - 10, y], [x + w + 6, y + 18], [x + w + 6, wy], [slot[1], wy]], F.mid, 42, { depth: 8 });
  plate(cv, box(slot[0], y + 10 + sag, slot[1] - slot[0], wy - y - 10 - sag), shade(F.deep, 0.3), 45, { depth: 0, hatch: false });
  for (const sx of slot) hazardStripes(cv, [sx - (sx === slot[0] ? 10 : 0), y + 2, 10, wy - y - 4], { step: 8 });
  // The posts and the panel under the window.
  plate(cv, box(x - 6, wy, wx - x + 6, wh), F.mid, 43, { depth: 6 });
  plate(cv, box(wx + ww, wy, x + w + 6 - wx - ww, wh), F.mid, 44, { depth: 6 });
  plate(cv, [[x - 6, wy + wh], [x + w + 6, wy + wh], [x + w + 6, y + h - 12], [x + w - 8, y + h], [x + 8, y + h], [x - 6, y + h - 12]], F.light, 46, { depth: 12 });
  cv.raw(`<g fill="${F.pale}">${[[x + 4, y + 30], [x + w - 4, y + 30], [x + 4, wy + wh + 16], [x + w - 4, wy + wh + 16]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3"/>`).join('')}</g>`);
  cv.raw(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${tint(F.pale, 0.4)}" opacity="0.14"/>`);
  if (cut) {
    const hit = [stopX(6), wy + 18];
    for (const [k, [dx, dy]] of [[-44, 30], [-26, 54], [30, 50], [46, 20], [8, 62]].entries()) cv.line([hit, [hit[0] + dx * 0.5, hit[1] + dy * 0.5 + 3], [hit[0] + dx, hit[1] + dy]], { weight: 1.6, taper: 'end', tension: 0.3, seed: 50 + k });
  } else {
    cv.line([[wx + 10, wy + wh - 14], [wx + 34, wy + 8]], { weight: 2.6, color: '#FFFFFF', opacity: 0.35, seed: 47 });
    cv.line([[wx + 26, wy + wh - 6], [wx + 48, wy + 18]], { weight: 1.4, color: '#FFFFFF', opacity: 0.3, seed: 48 });
  }
  // The key on the panel under the window: across, or turned along it, and its lamp.
  const kc = [x + 26, y + h - 28];
  cv.form([[kc[0] - 12, kc[1]], [kc[0], kc[1] - 12], [kc[0] + 12, kc[1]], [kc[0], kc[1] + 12]], STEEL, { seed: 49, weight: 2.2, depth: 3 });
  const a = key ? 0 : -Math.PI / 2;
  cv.line([rot([kc[0] - 8, kc[1]], kc, a), rot([kc[0] + 8, kc[1]], kc, a)], { weight: 4.5, taper: 'none', seed: 51 });
  lamp(cv, [kc[0] + 22, kc[1]], 5, key, { tone: AMBER, seed: 52 });
  // The winch's two levers' slots, where the operator's hands rest.
  for (const [k, lx] of [[0, stopX(6) - 29], [1, stopX(6) + 28]].values()) plate(cv, box(lx - 5, wy + wh - 4, 10, 16), INK, 53 + k, { depth: 0, weight: 1.6 });
  // The warning lamp on the roof's left corner: white, flashing while the panel passes this stop.
  lamp(cv, [x + 4, y + 4], 11, lampLit, { seed: 55 });
  // The roof buffer: a steel plate thrown across the slot from the cab's right, on a spring.
  if (buffer > 0) {
    const reach = (slot[1] - slot[0] + 8) * buffer;
    plate(cv, box(slot[1] + 4 - reach, wy - 14, reach, 12), STEEL, 56, { depth: 0 });
    for (let k = 0; k < 4; k += 1) cv.line([[slot[1] + 6 + k * 6, wy - 18], [slot[1] + 9 + k * 6, wy - 2]], { weight: 1.8, seed: 57 + k, taper: 'none' });
  }
}

/**
 * The console, drawn over the Panel operator: its desk with the stop lights (the lit one is the
 * stop the panel is at or passing), the lock lever (up: released, the panel running; down: locked),
 * the key and its lamp, and the overhead warning lamp on its post, flashing while the crate's swing
 * is over the operator.
 */
export function consoleFront(cv, { lampLit = false, key = false, locked = true, near = 0 } = {}) {
  const [x, y, w, h] = BOXES.console;
  plate(cv, [[x - 4, y + 14], [x + 8, y], [x + w - 8, y], [x + w + 4, y + 14], [x + w + 2, y + h], [x - 2, y + h]], F.mid, 140, { depth: 10 });
  plate(cv, box(x + 8, y + 20, w - 16, 16), shade(F.deep, 0.3), 141, { depth: 0, hatch: false });
  for (let s = 0; s < STOPS; s += 1) {
    const cx = x + 16 + s * ((w - 32) / (STOPS - 1));
    cv.raw(`<rect x="${r1(cx - 4.5)}" y="${y + 23.5}" width="9" height="9" rx="2" fill="${s === near ? (s === 6 ? PAPER.plain : AMBER) : shade(F.deep, 0.1)}" opacity="${s === near ? 1 : 0.8}"/>`);
  }
  // The lock lever on the desk's left: its knob up (released) or down (locked).
  const pivot = [x + 26, y + 66];
  const tip = rot([pivot[0], pivot[1] - 28], pivot, locked ? 1.15 : -0.35);
  plate(cv, box(x + 12, y + 58, 30, 18), shade(F.deep, 0.2), 143, { depth: 0 });
  cv.line([pivot, tip], { weight: 6, taper: 'none', seed: 144 });
  cv.form([[tip[0] - 9, tip[1]], [tip[0], tip[1] - 9], [tip[0] + 9, tip[1]], [tip[0], tip[1] + 9]], locked ? STEEL : PAPER.plain, { seed: 145, weight: 2.2, depth: 0 });
  // The key on the desk's right, and its lamp.
  const kc = [x + w - 28, y + 70];
  cv.form([[kc[0] - 12, kc[1]], [kc[0], kc[1] - 12], [kc[0] + 12, kc[1]], [kc[0], kc[1] + 12]], STEEL, { seed: 146, weight: 2.2, depth: 3 });
  const a = key ? 0 : -Math.PI / 2;
  cv.line([rot([kc[0] - 8, kc[1]], kc, a), rot([kc[0] + 8, kc[1]], kc, a)], { weight: 4.5, taper: 'none', seed: 147 });
  lamp(cv, [kc[0], kc[1] - 26], 5, key, { tone: AMBER, seed: 148 });
  // The overhead warning lamp on its post.
  plate(cv, box(x - 10, y - 60, 8, 62), F.shadow, 149, { depth: 0 });
  lamp(cv, [x - 6, y - 66], 12, lampLit, { seed: 150 });
}

/**
 * The galley lift's landing platform: its deck plate and striped edge, its lamp, and the two jaws
 * that clamp a landed crate (part 'jaws', drawn over the crate). drop: 0 in place, 1 gone down
 * through the well to the galley. clamp: the jaws shut on a landed crate. lampLit: landed.
 */
export function platform(cv, { drop = 0, clamp = false, lampLit = false, part = 'base' } = {}) {
  const [x, y, w, h] = BOXES.platform;
  const dy = drop * (h + 40);
  const go = () => {
    if (part === 'base') {
      plate(cv, box(x, y + dy, w, h), F.light, 130, { depth: 6 });
      plate(cv, box(x - 4, y + dy - 8, w + 8, 12), F.pale, 131, { depth: 3 });
      hazardStripes(cv, [x + 2, y + dy + 6, w - 4, 10], { step: 12, opacity: 0.8 });
      plate(cv, box(x + 18, y + dy + 26, w - 36, h - 34), F.mid, 132, { depth: 0 });
      lamp(cv, [x + w - 14, y + dy + 40], 7, lampLit, { tone: AMBER, seed: 136 });
      if (!clamp) for (const [k, side] of [-1, 1].entries()) jaw(cv, side < 0 ? x + 8 : x + w - 8, y + dy - 6, side, 2, 134 + k);
      return;
    }
    for (const [k, side] of [-1, 1].entries()) jaw(cv, side < 0 ? x + 2 : x + w - 2, y + dy - 6, side, clamp ? 14 : 2, 134 + k);
  };
  if (drop > 0) {
    // Going down, the platform is cut off at the well's lip.
    const id = `${cv.prefix}-lift-${part}`;
    cv.def(`<clipPath id="${id}"><rect x="${x - 24}" y="0" width="${w + 48}" height="${DECK + 8}"/></clipPath>`);
    cv.raw(`<g clip-path="url(#${id})">`); go(); cv.raw('</g>');
  } else go();
}

/** One of the platform's jaws at jx, swung in by reach. */
function jaw(cv, jx, fy, side, reach, seed) {
  const pts = [[jx, fy], [jx - side * reach, fy - 26], [jx - side * reach, fy - 50], [jx, fy - 60], [jx + side * 6, fy - 60], [jx + side * 6, fy]];
  plate(cv, pts, STEEL, seed, { depth: 0, weight: 2.2 });
}

/** The cable from the sheave at `from` to the hook block's top at `to`, two strands; slack: a fall or a crate lying slack, the strands loose. */
export function cable(cv, from, to, { slack = 0 } = {}) {
  const [x0, y0] = from, [x1, y1] = to;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 6) return;
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  for (const [k, d] of [-4, 4].entries()) {
    const a = [x0 + nx * d, y0 + ny * d], b = [x1 + nx * d, y1 + ny * d];
    const pts = slack > 0
      ? [a, [a[0] + (b[0] - a[0]) / 3 + 12 * slack, a[1] + (b[1] - a[1]) / 3], [a[0] + (b[0] - a[0]) * 2 / 3 - 12 * slack, a[1] + (b[1] - a[1]) * 2 / 3], b]
      : [a, b];
    cv.line(pts, { weight: 2, taper: 'none', seed: 100 + k, tension: 1 });
  }
}

/** The hook block at x, y (its hook's eye), tilted with the cable: a pulley in a cheek plate, and the hook, engaged or empty. */
export function hook(cv, x, y, { engaged = true, tilt = 0 } = {}) {
  const at = p => rot(p, [x, y], tilt);
  plate(cv, [[x - 15, y - 34], [x + 15, y - 34], [x + 13, y - 15], [x - 13, y - 15]].map(at), STEEL, 110, { depth: 4 });
  cv.form([[x - 6, y - 25], [x, y - 31], [x + 6, y - 25], [x, y - 19]].map(at), F.deep, { seed: 111, weight: 1.8, depth: 0 });
  cv.line([[x, y - 15], [x, y - 6], [x - 8, y + (engaged ? 2 : 4)], [x - 12, y - 6]].map(at), { weight: 4, taper: 'end', tension: 1, seed: 112 });
}

/** The ration crate, centred at x, y, tilted by tilt radians: planks, iron corners, the lifting eye and the galley's mark. */
export function crate(cv, x, y, { tilt = 0, seed = 120 } = {}) {
  const s = CRATE / 2;
  const at = p => rot(p, [x, y], tilt);
  plate(cv, box(x - s, y - s, CRATE, CRATE).map(at), PAPER.shade, seed, { depth: 12 });
  for (let k = 1; k < 4; k += 1) cv.line([at([x - s + 4, y - s + k * CRATE / 4]), at([x + s - 4, y - s + k * CRATE / 4])], { weight: 1.4, taper: 'none', seed: seed + k, opacity: 0.55 });
  for (const [k, [cx, cy]] of [[x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s]].entries()) {
    const dx = cx < x ? 1 : -1, dy = cy < y ? 1 : -1;
    plate(cv, [[cx, cy], [cx + dx * 22, cy], [cx, cy + dy * 22]].map(at), F.mid, seed + 10 + k, { depth: 0, weight: 2 });
  }
  // The lifting eye, and the galley's mark: a bowl and a spoon, stencilled.
  cv.line([at([x - 8, y - s]), at([x - 8, y - s - 10]), at([x + 8, y - s - 10]), at([x + 8, y - s])], { weight: 3, taper: 'none', tension: 1, seed: seed + 20 });
  cv.raw(`<g transform="rotate(${r1(tilt * 180 / Math.PI)} ${r1(x)} ${r1(y)})"><path d="M${x - 22} ${y - 2} Q${x} ${y + 26} ${x + 22} ${y - 2} Z" fill="${shade(F.deep, 0.2)}" opacity="0.85"/><path d="M${x + 12} ${y - 10} L${x + 26} ${y - 26}" stroke="${shade(F.deep, 0.2)}" stroke-width="5" stroke-linecap="round" opacity="0.85"/></g>`);
}

/**
 * A broken crate where it fell (the owner, 13 November 2026: let go anywhere but over the platform, it
 * breaks): its body burst open with a torn top, two planks sprung off onto the floor and two ration packs
 * spilled. x: its centre; y: the floor under it. compact: on the console's top, the planks and packs kept
 * on it. seed and flip vary each wreck, so that two never look the same.
 */
export function wreck(cv, x, y, { seed = 300, flip = false, compact = false } = {}) {
  const s = CRATE / 2, d = flip ? -1 : 1;
  const X = v => x + d * v;
  const plank = (cx, cy, w, h, a, k) => plate(cv, box(cx - w / 2, cy - h / 2, w, h).map(q => rot(q, [cx, cy], a)), PAPER.shade, seed + k, { depth: 4, weight: 2.2 });
  const pack = (cx, cy, a, k) => {
    plate(cv, box(cx - 14, cy - 10, 28, 20).map(q => rot(q, [cx, cy], a)), PAPER.plain, seed + k, { depth: 3, weight: 2 });
    cv.line([rot([cx - 9, cy], [cx, cy], a), rot([cx + 9, cy], [cx, cy], a)], { weight: 3, taper: 'none', seed: seed + k + 1, opacity: 0.7 });
  };
  // The planks sprung off, behind the body: on the floor either side, or across the console's top.
  if (compact) plank(X(-8), y - 6, 92, 12, d * 0.06, 1);
  else { plank(X(-s - 20), y - 8, 70, 16, d * -0.3, 1); plank(X(s + 24), y - 7, 62, 14, d * 0.16, 2); }
  // The body: the crate's bottom half splayed open, its top torn into splinters.
  const h = compact ? 0.8 : 1;
  plate(cv, [[X(-s - 4), y], [X(-s + 2), y - 36 * h], [X(-s + 18), y - 52 * h], [X(-14), y - 40 * h], [X(0), y - 58 * h], [X(14), y - 42 * h], [X(s - 16), y - 50 * h], [X(s - 2), y - 30 * h], [X(s + 6), y]], PAPER.shade, seed + 3, { depth: 10 });
  for (let k = 1; k < 3; k += 1) cv.line([[X(-s + 2), y - k * 13 * h], [X(s - 2), y - k * 12 * h]], { weight: 1.4, taper: 'none', seed: seed + 4 + k, opacity: 0.55 });
  // A corner plate still on, and one lying loose.
  plate(cv, [[X(-s - 4), y], [X(-s + 18), y], [X(-s - 1), y - 20]], F.mid, seed + 7, { depth: 0, weight: 2 });
  plate(cv, [[X(s - 4), y - 4], [X(s + 16), y - 10], [X(s + 2), y - 24]], F.mid, seed + 8, { depth: 0, weight: 2 });
  // The galley's mark, cracked across, on the burst body.
  cv.raw(`<path d="M${r1(X(-18))} ${r1(y - 26 * h)} Q${r1(X(0))} ${r1(y - 4 * h)} ${r1(X(18))} ${r1(y - 26 * h)} Z" fill="${shade(F.deep, 0.2)}" opacity="0.7"/>`);
  cv.line([[X(-6), y - 34 * h], [X(2), y - 22 * h], [X(-2), y - 14 * h], [X(6), y - 6 * h]], { weight: 1.8, taper: 'none', tension: 0, seed: seed + 9 });
  // Two ration packs spilled out.
  if (compact) pack(X(s - 6), y - 12, d * 0.4, 10);
  else { pack(X(s + 10), y - 11, d * 0.5, 10); pack(X(-s - 34), y - 10, d * -0.25, 12); }
}

/** Comic lettering: paper letters in an ink outline, a little tilted. */
export function letters(cv, text, [x, y], { size = 56, angle = -8, fill = PAPER.plain, opacity = 1 } = {}) {
  cv.raw(`<g transform="translate(${r1(x)} ${r1(y)}) rotate(${angle})" opacity="${opacity}"><text x="0" y="0" text-anchor="middle" font-family="'Arial Black','Helvetica Neue',Impact,sans-serif" font-weight="900" font-size="${size}" fill="${fill}" stroke="${INK}" stroke-width="${r1(size / 7)}" stroke-linejoin="round" paint-order="stroke">${text}</text></g>`);
}

/** An ink burst: a spiked star of paper in ink, scaled by t (0..1). */
export function burst(cv, [x, y], r, t = 1, { seed = 160, fill = PAPER.plain } = {}) {
  if (t <= 0) return;
  const n = 11, pts = [];
  for (let k = 0; k < n * 2; k += 1) {
    const a = (k / (n * 2)) * Math.PI * 2 + seed;
    const rr = (k % 2 ? r * 0.5 : r * (0.9 + 0.2 * Math.sin(seed + k))) * t;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]);
  }
  cv.form(pts, fill, { tension: 0, seed, weight: 3, depth: 0, hatch: false, rim: false });
}

/** Speed lines: short ink strokes behind a moving part, along dir. */
export function speed(cv, [x, y], dir, { n = 5, len = 40, spread = 40, seed = 170, opacity = 0.8 } = {}) {
  const [dx, dy] = dir;
  for (let k = 0; k < n; k += 1) {
    const off = (k / (n - 1) - 0.5) * spread;
    const ox = x - dy * off, oy = y + dx * off;
    cv.line([[ox, oy], [ox - dx * len, oy - dy * len]], { weight: 2.4, taper: 'end', seed: seed + k, opacity });
  }
}

/** The cable's safety catch: two jaws clamped on the cable under the drum, and their flash. */
export function brake(cv, [x, y]) {
  for (const [k, side] of [-1, 1].entries()) plate(cv, [[x + side * 4, y - 12], [x + side * 22, y - 16], [x + side * 22, y + 16], [x + side * 4, y + 12]], STEEL, 196 + k, { depth: 0, weight: 2.4 });
  for (const [k, a] of [-2.4, -1.6, -0.8, 0.8, 1.6, 2.4].entries()) cv.line([[x + Math.cos(a) * 30, y + Math.sin(a) * 22], [x + Math.cos(a) * 46, y + Math.sin(a) * 34]], { weight: 2.4, taper: 'end', seed: 198 + k });
}

/** A bump: two short clunk strokes where a part met something it cannot pass. */
export function clunk(cv, [x, y], dir, t = 1) {
  if (t <= 0) return;
  const [dx, dy] = dir;
  for (const [k, a] of [-0.6, 0, 0.6].entries()) {
    const ux = dx * Math.cos(a) - dy * Math.sin(a), uy = dx * Math.sin(a) + dy * Math.cos(a);
    cv.line([[x + ux * 10, y + uy * 10], [x + ux * (10 + 18 * t), y + uy * (10 + 18 * t)]], { weight: 2.6, taper: 'end', seed: 180 + k, opacity: 1 - t * 0.4 });
  }
}

/**
 * The drop line: from the crate's underside straight down to where it would fall now, while it can be
 * let go. tone 'platform': amber dots onto the platform (a let-go now lands it); 'console': paper
 * dashes onto the Panel operator's head with a warning mark (a let-go now drops it on them); 'deck' or
 * 'intake': faint dots (a let-go now breaks it, or drops it back into the hatch).
 */
export function dropLine(cv, [x, y0], y1, { tone = 'deck', t = 1 } = {}) {
  if (y1 - y0 < 8) return;
  if (tone === 'console') {
    handLine(cv, [[x, y0], [x, y1]], { color: PAPER.plain, width: 3, opacity: 0.8 * t, seed: 195 });
    cv.raw(`<line x1="${r1(x)}" y1="${r1(y0)}" x2="${r1(x)}" y2="${r1(y1)}" stroke="${INK}" stroke-width="3" stroke-dasharray="8 8" opacity="${0.9 * t}"/>`);
    warnMark(cv, [x + 34, (y0 + y1) / 2], t);
    return;
  }
  const amber = tone === 'platform';
  const n = Math.max(2, Math.round((y1 - y0) / 18));
  const dots = Array.from({ length: n }, (_, k) => [x, y0 + ((k + 0.5) * (y1 - y0)) / n]);
  cv.raw(`<g opacity="${(amber ? 0.95 : 0.45) * t}">${dots.map(([a, b]) => `<circle cx="${r1(a)}" cy="${r1(b)}" r="${amber ? 5 : 3.4}" fill="${amber ? AMBER : PAPER.plain}" stroke="${INK}" stroke-width="1.6"/>`).join('')}</g>`);
}

/** A warning mark: a paper triangle in ink with an exclamation mark (not a faction's colour). */
export function warnMark(cv, [x, y], t = 1, size = 22) {
  cv.raw(`<g opacity="${t}"><path d="M${x} ${y - size} L${x + size} ${y + size * 0.8} L${x - size} ${y + size * 0.8} Z" fill="${PAPER.plain}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M${x} ${y - size * 0.4} V${y + size * 0.2}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="${x}" cy="${y + size * 0.5}" r="2.6" fill="${INK}"/></g>`);
}

export { inkCanvas };

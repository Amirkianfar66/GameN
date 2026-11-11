// mothership:dev-only
//
// The Supply Room's machine, drawn in the crew's ink over the still room (./room.mjs): the Hoist
// operator's cab, the gantry with its bumper plate and hoist drum, the festoon cable between them,
// the hook and the crate, the galley lift's cradle, the pulpit's console with the drive wheel, the
// two keys, the lamps and the comic effects. Everything is drawn from a pose: where each part is
// at one moment (./stage.mjs makes poses from the Task's states and its timing), so a still, a
// storyboard frame and a film frame are drawn the same way.
//
// Machinarium was the owner's reference for expressive machinery and visible cause and effect:
// every press turns something you can see. The Hoist's press turns the drum on the gantry and runs
// the cable; the Boom's press turns the console's drive wheel and rolls the gantry; a key lights;
// the cradle's jaws close. The look stays the ship's: ink, paper, the room's rusted copper, amber
// only where a control asks for a press.

import { INK, inkCanvas, shade, tint } from '../crew-drawing/source/ink.mjs';
import { PAPER, handLine, glow } from '../room-pilot/ink-room.mjs';
import { FAMILY, clipToBox } from './room.mjs';
import { BOXES, RAIL, CRATE } from './layout.mjs';

const F = FAMILY;
/** Amber: focus, the colour of a control that asks for a press (tokens: the interface's accent). */
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

/** The cab's inside, behind the operator: its dark back and the seat. */
export function cabBack(cv, { crushed = false } = {}) {
  const [x, y, w, h] = BOXES.cabWindow;
  const go = () => {
    plate(cv, box(x - 4, y - 4, w + 8, h + 60), shade(F.deep, 0.35), 31, { depth: 0, hatch: false, rim: false });
    cv.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h + 52}" fill="url(#${cv.prefix}-hatch)" opacity="0.5"/>`);
    plate(cv, box(x + 18, y + 88, 64, 14), F.shadow, 32);
    plate(cv, box(x + 22, y + 102, 10, 52), F.deep, 33, { depth: 0 });
  };
  crushed ? cv.group('rotate(-3 118 108)', go) : go();
}

/**
 * The cab's shell round its window, over the operator: the roof and its link to the rail, the
 * posts, the panel below with the Hoist's two levers' slots and key, the lamp at its door, and
 * the spring buffer the safety catch throws out. crushed: after the ram, the door post bent in and
 * the glass cracked. lampLit: the gantry is at the cab's door. key: the Hoist's key turned.
 * caught: 0..1, the buffer thrown out (the safety catch).
 */
export function cabFront(cv, { crushed = false, lampLit = false, key = false, caught = 0 } = {}) {
  const [x, y, w, h] = BOXES.cab;
  const [wx, wy, ww, wh] = BOXES.cabWindow;
  const go = () => {
    // The link to the rail, and the roof.
    plate(cv, box(x + w / 2 - 10, RAIL.bottom - 6, 20, y - RAIL.bottom + 14), F.shadow, 40, { depth: 0 });
    plate(cv, [[x - 6, y + 16], [x + 14, y], [x + w - 14, y], [x + w + 6, y + 16], [x + w + 6, wy], [x - 6, wy]], F.mid, 41, { depth: 10 });
    // The posts and the panel under the window.
    plate(cv, box(x - 6, wy, wx - x + 6, wh), F.mid, 42, { depth: 6 });
    const post = crushed
      ? [[wx + ww, wy], [x + w + 6, wy], [x + w - 22, wy + 50], [x + w + 2, wy + 92], [x + w + 6, wy + wh], [wx + ww - 14, wy + wh], [wx + ww - 30, wy + 70]]
      : box(wx + ww, wy, x + w + 6 - wx - ww, wh);
    plate(cv, post, F.mid, 43, { depth: 6 });
    plate(cv, [[x - 6, wy + wh], [x + w + 6, wy + wh], [x + w + 6, y + h - 14], [x + w - 10, y + h], [x + 10, y + h], [x - 6, y + h - 14]], F.light, 44, { depth: 12 });
    // Rivets, the window's glass and its glare (or its cracks).
    cv.raw(`<g fill="${F.pale}">${[[x + 6, y + 30], [x + w - 6, y + 30], [x + 6, wy + wh + 20], [x + w - 6, wy + wh + 20], [x + 6, y + h - 22], [x + w - 6, y + h - 22]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3"/>`).join('')}</g>`);
    cv.raw(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${tint(F.pale, 0.4)}" opacity="0.14"/>`);
    if (crushed) {
      const hit = [wx + ww - 12, wy + 46];
      for (const [k, [dx, dy]] of [[-60, -40], [-80, 10], [-50, 60], [-20, -50], [-70, 40]].entries()) cv.line([hit, [hit[0] + dx * 0.5, hit[1] + dy * 0.5 + 4], [hit[0] + dx, hit[1] + dy]], { weight: 1.6, taper: 'end', tension: 0.3, seed: 50 + k });
    } else {
      cv.line([[wx + 14, wy + wh - 20], [wx + 44, wy + 10]], { weight: 2.6, color: '#FFFFFF', opacity: 0.35, seed: 46 });
      cv.line([[wx + 34, wy + wh - 10], [wx + 62, wy + 22]], { weight: 1.4, color: '#FFFFFF', opacity: 0.3, seed: 47 });
    }
    // The key: a round plate on the panel, the key across it or turned along it, and its lamp.
    const kc = [x + w - 34, y + h - 50];
    cv.form([[kc[0] - 14, kc[1]], [kc[0], kc[1] - 14], [kc[0] + 14, kc[1]], [kc[0], kc[1] + 14]], STEEL, { seed: 48, weight: 2.2, depth: 3 });
    const a = key ? 0 : -Math.PI / 2;
    cv.line([rot([kc[0] - 9, kc[1]], kc, a), rot([kc[0] + 9, kc[1]], kc, a)], { weight: 4.5, taper: 'none', seed: 49 });
    lamp(cv, [kc[0] - 30, kc[1]], 6, key, { tone: AMBER, seed: 51 });
    // The two lever slots the operator's hands rest on.
    for (const [k, lx] of [[0, wx + 22], [1, wx + ww - 22]].values()) plate(cv, box(lx - 5, wy + wh - 4, 10, 18), INK, 52 + k, { depth: 0, weight: 1.6 });
  };
  crushed ? cv.group('rotate(-3 118 108)', go) : go();
  // The lamp at the cab's door, on its roof's right corner: white, flashing when the gantry is at the door.
  lamp(cv, [x + w - 6, y + 4], 12, lampLit, { seed: 53 });
  // The spring buffer the safety catch throws out of the cab's side, at the bumper plate's height.
  if (caught > 0) {
    const out = 40 * caught;
    plate(cv, box(x + w + 4, RAIL.bottom + 22, out, 18), STEEL, 54, { depth: 0 });
    for (let k = 0; k < 5; k += 1) cv.line([[x + w + 8 + k * out / 5, RAIL.bottom + 16], [x + w + 8 + (k + 0.5) * out / 5, RAIL.bottom + 46]], { weight: 2, seed: 55 + k, taper: 'none' });
    plate(cv, box(x + w + 4 + out, RAIL.bottom + 8, 16, 46), PAPER.shade, 59, { depth: 0 });
    cv.raw(`<rect x="${x + w + 4 + out}" y="${RAIL.bottom + 8}" width="16" height="46" fill="url(#${cv.prefix}-hatch)" opacity="0.6"/>`);
  }
}

/** The festoon: the cab's power and control cable, hung in loops under the rail to the gantry. */
export function festoon(cv, gantryX) {
  const from = BOXES.cab[0] + BOXES.cab[2] + 2, to = gantryX - 74;
  if (to <= from + 6) return;
  const n = Math.max(1, Math.round((to - from) / 72));
  const span = (to - from) / n;
  for (let k = 0; k < n; k += 1) {
    const a = from + k * span, b = a + span, sag = Math.min(34, 10 + span * 0.32);
    cv.line([[a, RAIL.bottom + 4], [a + span * 0.18, RAIL.bottom + sag * 0.8], [a + span / 2, RAIL.bottom + sag], [b - span * 0.18, RAIL.bottom + sag * 0.8], [b, RAIL.bottom + 4]], { weight: 3, taper: 'none', seed: 60 + k, tension: 0.8 });
    cv.form([[b - 4, RAIL.bottom - 2], [b + 4, RAIL.bottom - 2], [b + 4, RAIL.bottom + 8], [b - 4, RAIL.bottom + 8]], STEEL, { tension: 0, seed: 70 + k, weight: 1.6, depth: 0 });
  }
}

/**
 * The gantry at x: its wheels on the rail (turned by its travel), its body under the rail, the
 * hoist drum (turned by the cable's travel) and the bumper plate on its left, hazard-striped.
 * dented: after the ram. lift: the cable's drop below the drum, for the drum's turns.
 */
export function gantry(cv, x, { wheel = 0, drum = 0, dented = false, nudge = 0 } = {}) {
  const gx = x + nudge;
  for (const [k, wx] of [gx - 38, gx + 38].entries()) {
    const c = [wx, RAIL.top - 12];
    cv.form([[c[0] - 13, c[1]], [c[0], c[1] - 13], [c[0] + 13, c[1]], [c[0], c[1] + 13]], STEEL, { seed: 80 + k, weight: 2.4, depth: 4 });
    cv.line([rot([c[0] - 9, c[1]], c, wheel), rot([c[0] + 9, c[1]], c, wheel)], { weight: 2.2, taper: 'none', seed: 82 + k });
    plate(cv, box(wx - 5, RAIL.top - 12, 10, RAIL.bottom - RAIL.top + 22), F.shadow, 84 + k, { depth: 0 });
  }
  plate(cv, box(gx - 56, RAIL.bottom + 4, 112, 52), F.light, 86, { depth: 9 });
  cv.raw(`<g fill="${F.pale}">${[gx - 48, gx + 48].map(a => `<circle cx="${a}" cy="${RAIL.bottom + 14}" r="3"/><circle cx="${a}" cy="${RAIL.bottom + 46}" r="3"/>`).join('')}</g>`);
  // The drum, its windings sliding as it turns.
  plate(cv, box(gx - 32, RAIL.bottom + 14, 64, 30), F.mid, 87, { depth: 5 });
  for (let k = 0; k < 6; k += 1) {
    const u = ((k / 6 + drum / (2 * Math.PI)) % 1 + 1) % 1;
    cv.line([[gx - 28 + u * 56, RAIL.bottom + 16], [gx - 26 + u * 56, RAIL.bottom + 42]], { weight: 1.5, taper: 'none', seed: 88 + k, opacity: 0.8 });
  }
  // The bumper plate: a riveted slab, striped, on the gantry's left; crumpled after the ram.
  const px = gx - 76, py = RAIL.bottom - 10, pw = 20, ph = 82;
  const outline = dented ? [[px + 6, py], [px + pw, py], [px + pw, py + ph], [px + 4, py + ph], [px + 12, py + 58], [px, py + 44], [px + 10, py + 26]] : box(px, py, pw, ph);
  plate(cv, outline, PAPER.shade, 90, { depth: 0, hatch: false });
  for (let k = -ph; k < pw + ph; k += 16) {
    const band = clipToBox([[px + k, py + ph], [px + k + ph, py], [px + k + ph + 8, py], [px + k + 8, py + ph]], [px, py, pw, ph]);
    if (band.length >= 3) cv.raw(`<polygon points="${band.map(([a, b]) => `${r1(a)},${r1(b)}`).join(' ')}" fill="${INK}" opacity="0.85"/>`);
  }
  cv.outline(outline.concat([outline[0]]).slice(0, -1).map(p => [...p]), 2.8, 91);
  plate(cv, box(px + pw, py + 26, 20, 16), F.shadow, 92, { depth: 0 });
}

/** The cable from the drum to the hook block, two strands; slack: a fall, the strands loose; fromX: the drum, when the crate swings away from under it. */
export function cable(cv, x, hookY, { slack = 0, fromX = x } = {}) {
  const top = RAIL.bottom + 44, bottom = hookY - 30;
  if (bottom <= top) return;
  for (const [k, dx] of [-5, 5].entries()) {
    const pts = slack > 0
      ? [[fromX + dx, top], [x + dx + 10 * slack, (top * 2 + bottom) / 3], [x + dx - 10 * slack, (top + bottom * 2) / 3], [x + dx, bottom]]
      : [[fromX + dx, top], [x + dx, bottom]];
    cv.line(pts, { weight: 2, taper: 'none', seed: 100 + k, tension: 1 });
  }
}

/** The hook block over the crate: a pulley in a cheek plate, and the hook, engaged or empty. */
export function hook(cv, x, y, { engaged = true } = {}) {
  plate(cv, [[x - 16, y - 36], [x + 16, y - 36], [x + 14, y - 16], [x - 14, y - 16]], STEEL, 110, { depth: 4 });
  cv.form([[x - 7, y - 26], [x, y - 33], [x + 7, y - 26], [x, y - 19]], F.deep, { seed: 111, weight: 1.8, depth: 0 });
  cv.line([[x, y - 16], [x, y - 6], [x - 8, y + (engaged ? 2 : 4)], [x - 12, y - 6]], { weight: 4, taper: 'end', tension: 1, seed: 112 });
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
 * The galley lift's cradle: its floor, side bars and lamp (part 'back', drawn behind the crate),
 * or the jaws that clamp the crate (part 'jaws', drawn over it). rise: 0 in place, 1 gone up
 * through the hatch. closed: the jaws shut on a docked crate.
 */
export function cradle(cv, { rise = 0, closed = false, lampLit = false, part = 'back' } = {}) {
  const [x, y, w, h] = BOXES.cradle;
  const dy = -rise * (y + h + 20);
  const fy = y + h - 6 + dy;
  if (part === 'back') {
    plate(cv, box(x + 4, fy, w - 8, 14), F.light, 130, { depth: 4 });
    for (const [k, bx] of [x + 10, x + w - 18].entries()) plate(cv, box(bx, fy - 116, 8, 116), F.shadow, 131 + k, { depth: 0 });
    plate(cv, box(x + 10, fy - 120, w - 20, 8), F.shadow, 133, { depth: 0 });
    lamp(cv, [x + w - 14, fy - 128], 7, lampLit, { tone: AMBER, seed: 136 });
    if (!closed) for (const [k, side] of [-1, 1].entries()) jaw(cv, side < 0 ? x + 14 : x + w - 14, fy, side, 2, 134 + k);
    return;
  }
  for (const [k, side] of [-1, 1].entries()) jaw(cv, side < 0 ? x + 4 : x + w - 4, fy, side, closed ? 12 : 2, 134 + k);
}

/** One of the cradle's jaws at jx, swung in by reach. */
function jaw(cv, jx, fy, side, reach, seed) {
  const pts = [[jx, fy - 4], [jx - side * reach, fy - 30], [jx - side * reach, fy - 54], [jx, fy - 66], [jx + side * 6, fy - 66], [jx + side * 6, fy - 4]];
  plate(cv, pts, STEEL, seed, { depth: 0, weight: 2.2 });
}

/**
 * The pulpit's console, drawn over the Boom operator: its desk, the drive wheel on its side
 * (turned by the gantry's travel), and the overhead lamp on its post, flashing while the crate
 * hangs over the operator.
 */
export function consoleFront(cv, { wheel = 0, lampLit = false } = {}) {
  const [x, y, w, h] = BOXES.console;
  plate(cv, [[x - 4, y + 14], [x + 6, y], [x + w - 6, y], [x + w + 4, y + 14], [x + w + 2, y + h], [x - 2, y + h]], F.mid, 140, { depth: 10 });
  plate(cv, box(x + 10, y + 26, w - 20, 20), shade(F.deep, 0.3), 141, { depth: 0, hatch: false });
  cv.raw(`<g fill="${AMBER}" opacity="0.65"><rect x="${x + 16}" y="${y + 32}" width="10" height="6"/><rect x="${x + 32}" y="${y + 32}" width="16" height="6"/></g>`);
  const c = [x + w + 14, y + 48];
  cv.form([[c[0] - 30, c[1]], [c[0], c[1] - 30], [c[0] + 30, c[1]], [c[0], c[1] + 30]], F.light, { seed: 142, weight: 3, depth: 6 });
  cv.form([[c[0] - 21, c[1]], [c[0], c[1] - 21], [c[0] + 21, c[1]], [c[0], c[1] + 21]], shade(F.deep, 0.2), { seed: 143, weight: 2, depth: 0 });
  for (let k = 0; k < 3; k += 1) {
    const a = wheel + k * Math.PI / 3;
    cv.line([rot([c[0] - 26, c[1]], c, a), rot([c[0] + 26, c[1]], c, a)], { weight: 3.4, taper: 'none', seed: 144 + k, color: F.light });
  }
  cv.form([[c[0] - 7, c[1]], [c[0], c[1] - 7], [c[0] + 7, c[1]], [c[0], c[1] + 7]], STEEL, { seed: 147, weight: 2, depth: 0 });
  plate(cv, box(x - 2, y - 58, 8, 58), F.shadow, 148, { depth: 0 });
  lamp(cv, [x + 2, y - 64], 12, lampLit, { seed: 149 });
}

/** The Boom's key: the lever on the box under the rail's end stop, thrown by the gantry, and its lamp. */
export function boomKey(cv, { turned = false } = {}) {
  const [x, y, w, h] = BOXES.stop;
  const pivot = [x + w / 2 - 3, y + 40];
  const tip = rot([pivot[0], pivot[1] + 34], pivot, turned ? -0.75 : 0.55);
  cv.line([pivot, tip], { weight: 6, taper: 'none', seed: 150 });
  cv.form([[tip[0] - 7, tip[1]], [tip[0], tip[1] - 7], [tip[0] + 7, tip[1]], [tip[0], tip[1] + 7]], STEEL, { seed: 151, weight: 2, depth: 0 });
  lamp(cv, [x + w / 2 - 3, y + h - 4], 6, turned, { tone: AMBER, seed: 152 });
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
 * The route the cooperative press sequence takes from the crate's place to the cradle, dotted,
 * with the next leg in amber and an arrow: the coordination the two phones share without words.
 * path: the cells' centres in order; next: how many of its legs are the next press's.
 */
export function guide(cv, path, { next = 1, color = AMBER } = {}) {
  if (path.length < 2) return;
  const dots = [];
  for (let i = 1; i < path.length; i += 1) {
    const [a, b] = [path[i - 1], path[i]];
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 18));
    for (let k = 1; k <= n; k += 1) dots.push({ p: [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], leg: i });
  }
  cv.raw(`<g opacity="0.85">${dots.map(({ p, leg }) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${leg <= next ? 5 : 3.6}" fill="${leg <= next ? color : PAPER.plain}" stroke="${INK}" stroke-width="1.6"/>`).join('')}</g>`);
  const [a, b] = [path[0], path[Math.min(next, path.length - 1)]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const tip = [a[0] + u[0] * Math.min(len, 92), a[1] + u[1] * Math.min(len, 92)];
  const left = [tip[0] - u[0] * 22 - u[1] * 14, tip[1] - u[1] * 22 + u[0] * 14], right = [tip[0] - u[0] * 22 + u[1] * 14, tip[1] - u[1] * 22 - u[0] * 14];
  cv.form([tip, left, right], color, { tension: 0, seed: 190, weight: 2.4, depth: 0, hatch: false, rim: false });
}

/** The drop line: dashed, from the crate's underside to the Boom operator's head, with a warning mark. */
export function dropLine(cv, [x, y0], y1, { t = 1 } = {}) {
  handLine(cv, [[x, y0], [x, y1]], { color: PAPER.plain, width: 3, opacity: 0.8 * t, seed: 195 });
  cv.raw(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${INK}" stroke-width="3" stroke-dasharray="8 8" opacity="${0.9 * t}"/>`);
  warnMark(cv, [x + 34, (y0 + y1) / 2], t);
}

/** A warning mark: a paper triangle in ink with an exclamation mark (not a faction's colour). */
export function warnMark(cv, [x, y], t = 1, size = 22) {
  cv.raw(`<g opacity="${t}"><path d="M${x} ${y - size} L${x + size} ${y + size * 0.8} L${x - size} ${y + size * 0.8} Z" fill="${PAPER.plain}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M${x} ${y - size * 0.4} V${y + size * 0.2}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="${x}" cy="${y + size * 0.5}" r="2.6" fill="${INK}"/></g>`);
}

/** A name tag: the seat number on ink and the name on paper, centred at x over y. */
export function tag(cv, [x, y], number, name, { down = false, anchor = 'middle' } = {}) {
  const label = down ? `${name} · Out` : name;
  const w = Math.round(48 + label.length * 9.6);
  const left = anchor === 'start' ? x : x - w / 2;
  cv.raw(`<g transform="translate(${r1(left)} ${r1(y - 18)})" opacity="${down ? 0.8 : 1}"><rect width="${w}" height="34" rx="17" fill="${PAPER.plain}" stroke="${INK}" stroke-width="3"/><circle cx="17" cy="17" r="13" fill="${INK}"/><text x="17" y="23" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="800" font-size="16" fill="${PAPER.plain}">${number}</text><text x="${r1(38 + (w - 44) / 2)}" y="23" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="700" font-size="17" fill="${INK}">${label}</text></g>`);
}

export { inkCanvas };

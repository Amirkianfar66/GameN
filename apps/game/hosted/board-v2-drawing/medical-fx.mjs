// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/fx/medical.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The Hospital's medical art (storyboards S9, S5 and S10 of the Designer's review of the owner's
// motion specification of 13 October 2026; docs/design/hospital-films.md): what the ward's berths
// show of a patient's condition, the medical drone that revives a patient, and the monitor that
// fails when one dies.
//
// The ward (../scenes/hospital-ward.mjs) draws every berth with a dark monitor, a status lamp and a
// blank plate, and a closed drone dock in the ceiling: "a patient's state is the board's to draw,
// from public facts". This module draws those states, and says where they go in the Hospital's
// panel (tagBox(), insetBox(), droneFit(): pure geometry a client can port, keeping the room's
// caption, the name tags and every press area another seat holds clear). It reads no role, side,
// attacker, healer or cause: the drone comes from the Hospital's own dock whoever registered the
// Rescue, and a death is the same film whatever caused it. The ward itself is unchanged.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude
// Code), in the comic vocabulary of the board: ink outlines, halftone, a limited palette. Nothing
// is written in the art; the words a screen shows are the page's own text. Pure functions that
// return SVG text or numbers, for Node and the browser alike.

import { INK, PAPER } from './scene-kit.mjs';
import { WARD_BERTHS, WARD_COLUMNS, WARD_ROWS, wardBerths } from './hospital-ward.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from './blocked-fx.mjs';
import { LABEL_MARGIN } from './label-box.mjs';

export const MEDICAL_VERSION = 'board-v2-medical-0.1.0';

/**
 * The medical palette: the drone's navy and steel, its cyan lights and lens, caption yellow for
 * its warning lights, and the monitors' traces: amber unstable, green-cyan stable, a deep red
 * failing. Every color keeps MIN_ACCENT_DISTANCE (CIE76) from the faction accents
 * (medicalColorDistances()), so that nothing medical reads as one side's.
 */
export const MEDICAL = Object.freeze({
  navy: '#1B2747', steel: '#3A4A6B', cyan: '#5FE0E8', lens: '#BFF7FA', glow: '#E8FBFF',
  yellow: '#F7C52B', amber: '#F2A33A', warn: '#C7372B', stable: '#6FE3B0', screen: '#0D1A22', grid: '#2E5A5E',
});

/** Each medical color's distance to the nearest faction accent, rounded, with the accent's name. */
export function medicalColorDistances() {
  return Object.fromEntries(Object.entries(MEDICAL).map(([name, hex]) => {
    const [faction, distance] = Object.entries(FACTION_ACCENTS).map(([id, accent]) => [id, cie76(hex, accent)]).sort((a, b) => a[1] - b[1])[0];
    return [name, { nearest: faction, distance: Math.round(distance) }];
  }));
}
export { MIN_ACCENT_DISTANCE };

const f = n => Number(n.toFixed(2));
const svg = (w, h, layer, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}<g data-layer="${layer}">${body}</g></svg>`;
const dotsPattern = (id, color, r = 1.4) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="${r}" fill="${color}"/></pattern>`;

// ---------- where a berth's furniture is ----------

/** The ceiling dock the drone leaves and returns to, in scene units: the ward's dock (hospital-ward.mjs). */
export const DOCK = Object.freeze([512, 45]);

/**
 * The drone's width in scene units at a berth of scale 1 (it is drawn at the berth's scale, so
 * smaller over the back rows), how far below its lens its probes reach, in the same units (hung
 * from its hover point, the probes touch the patient's chest), and how far it bobs while it hovers.
 */
export const DRONE_SCENE = Object.freeze({ width: 120, reach: 51, bob: 1.5 });

/**
 * Where a berth's furniture is, in the ward's scene units: its monitor, status lamp, plate, bed
 * light and bed, as the ward draws them (scenes/hospital-ward.mjs, headboardKit(), upperBack() and
 * floorBack(); the test holds these numbers to the ward's own drawing). chest: where the patient's
 * press point is; hover: where the drone's lens hangs to treat the patient, its probes on the chest.
 */
export function berthKit(id) {
  const berth = WARD_BERTHS.find(entry => entry.id === id);
  if (!berth) throw new Error(`No berth ${id}`);
  const c = WARD_COLUMNS[berth.column];
  // The headboard (or, for an upper berth, its bezel): left and right edges, top, and scale.
  const [x0, x1, y, k] = berth.row === 'upper' ? [c - 70, c + 70, 134, 0.9] : berth.row === 'middle' ? [c - 64, c + 64, 352, 0.9] : [c - 72, c + 72, 556, 1];
  const w = 40 * k, h = 24 * k;
  const bed = berth.row === 'upper'
    ? { x: c - 52, y: 228, w: 104, h: 76 }
    : berth.row === 'middle' ? { x: c - 56 * 0.9, y: 404, w: 112 * 0.9, h: 132 } : { x: c - 56, y: 596, w: 112, h: 150 };
  return Object.freeze({
    id: berth.id, row: berth.row, column: berth.column, c, k,
    monitor: Object.freeze({ x: f(x1 - 8 * k - w), y: f(y + 4 * k), w: f(w), h: f(h) }),
    lamp: Object.freeze({ cx: f(x0 + 47 * k), cy: f(y + 13.5 * k), r: f(5 * k) }),
    plate: Object.freeze({ x: f(x0 + 8 * k), y: f(y + 6 * k), w: f(28 * k), h: f(15 * k) }),
    bedLight: Object.freeze(berth.row === 'upper' ? { cx: c, cy: 216, rx: 52, ry: 30 } : { cx: c, cy: f(y + 40 * k), rx: f(46 * k), ry: f(22 * k) }),
    bed: Object.freeze(Object.fromEntries(Object.entries(bed).map(([key, value]) => [key, f(value)]))),
    // The patient's chest: the berth's press point row (WARD_ROWS), where the pulse lands.
    chest: Object.freeze([c, WARD_ROWS[berth.row]]),
    scale: berth.scale,
    // The drone's lens over the chest, so that its probes reach it; it is drawn at the berth's scale.
    hover: Object.freeze([c, f(WARD_ROWS[berth.row] - DRONE_SCENE.reach * berth.scale)]),
  });
}

/** Every berth's kit for a roster. */
export const berthKits = roster => wardBerths(roster).map(berth => berthKit(berth.id));

// ---------- the berth's monitor, lamp and the vitals inset ----------

/** The traces a monitor shows: off, booting, unstable (Injured), stable (healthy), slowing (failing), flat. */
export const TRACE_KINDS = Object.freeze(['off', 'boot', 'unstable', 'stable', 'slowing', 'flat']);
export const TRACE_COLOR = Object.freeze({ off: MEDICAL.grid, boot: MEDICAL.glow, unstable: MEDICAL.amber, stable: MEDICAL.stable, slowing: MEDICAL.warn, flat: MEDICAL.warn });

/**
 * One heartbeat as points from x0 over width w, amplitude a, on a baseline b (y grows downward):
 * a small P wave, the QRS spike and a T wave, then the baseline.
 */
function beat(x0, w, a, b) {
  const p = [[0, 0], [0.1, 0], [0.18, -0.12], [0.26, 0], [0.34, 0], [0.38, 0.1], [0.42, -1], [0.46, 0.25], [0.5, 0], [0.62, 0], [0.72, -0.22], [0.82, 0], [1, 0]];
  return p.map(([u, v]) => [x0 + u * w, b + v * a]);
}

/**
 * A trace across a screen of width W and height H, as polyline points. Seeded and fixed: an
 * unstable trace's beats vary in spacing and height and one is missing; a stable one is even; a
 * slowing one thins and spreads out; a flat one is the baseline.
 */
export function tracePoints(kind, W, H) {
  const b = H * 0.62, A = H * 0.46;
  if (kind === 'off') return [];
  if (kind === 'flat' || kind === 'boot') return [[0, b], [W, b]];
  const out = [];
  const add = list => { for (const point of list) out.push(point); };
  if (kind === 'stable') {
    const w = W / 3;
    for (let i = 0; i < 3; i += 1) add(beat(i * w, w, A, b));
  } else if (kind === 'unstable') {
    // Uneven beats, one dropped (a flat stretch), and a low one.
    const plan = [[0.28, 0.95], [0.2, 0.55], [0.18, 0], [0.34, 1]];
    let x = 0;
    for (const [share, height] of plan) {
      const w = share * W;
      add(height ? beat(x, w, A * height, b) : [[x, b], [x + w, b]]);
      x += w;
    }
  } else if (kind === 'slowing') {
    // Two weak beats far apart, then the baseline.
    add(beat(0, W * 0.3, A * 0.6, b));
    add([[W * 0.3, b], [W * 0.5, b]]);
    add(beat(W * 0.5, W * 0.26, A * 0.32, b));
    add([[W * 0.76, b], [W, b]]);
  } else {
    throw new Error(`No trace ${kind}`);
  }
  return out;
}

/** The vitals inset's box: a comic panel that shows a berth's monitor large while a film plays. */
export const INSET = Object.freeze({ w: 168, h: 72, screen: Object.freeze({ x: 10, y: 9, w: 148, h: 54 }) });

/**
 * The vitals inset at a moment: a framed screen with its grid and the trace of kind, drawn up to
 * sweep (0 to 1) with a bright head where the sweep is; off, the screen dark with a fading dot
 * (dot: its opacity). A comic panel for review and for export, never words.
 */
export function vitalsInsetSvg(kind, { sweep = 1, dot = 0 } = {}) {
  if (!TRACE_KINDS.includes(kind)) throw new Error(`No trace ${kind}`);
  const { w, h, screen: s } = INSET;
  const defs = dotsPattern('vitals-dots', INK, 1.2);
  const grid = [1, 2, 3, 4].map(i => `<path d="M${f(s.x + (s.w * i) / 5)} ${s.y} V${s.y + s.h}" stroke="${MEDICAL.grid}" stroke-width="1"/>`).join('')
    + [1, 2].map(i => `<path d="M${s.x} ${f(s.y + (s.h * i) / 3)} H${s.x + s.w}" stroke="${MEDICAL.grid}" stroke-width="1"/>`).join('');
  const frame = `<rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="9" fill="${MEDICAL.steel}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${w - 30} 4 H${w - 6} V${h - 6} H${w - 54} Z" fill="url(#vitals-dots)" opacity="0.35"/>`
    + `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="4" fill="${MEDICAL.screen}" stroke="${INK}" stroke-width="2.5"/>`;
  let trace = '';
  const points = tracePoints(kind, s.w, s.h).map(([x, y]) => [s.x + x, s.y + y]);
  if (points.length) {
    const reach = s.x + s.w * Math.max(0, Math.min(1, sweep));
    // The drawn part up to the sweep, cut at its x.
    const shown = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x, y] = points[i];
      if (x <= reach) { shown.push([x, y]); continue; }
      const [px, py] = points[i - 1] ?? points[0];
      if (px < reach) shown.push([reach, py + ((y - py) * (reach - px)) / (x - px || 1)]);
      break;
    }
    const color = TRACE_COLOR[kind];
    if (shown.length > 1) {
      const d = shown.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
      trace = `<path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" opacity="0.35"/>`
        + `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      const [hx, hy] = shown[shown.length - 1];
      if (sweep < 1) trace += `<circle cx="${f(hx)}" cy="${f(hy)}" r="3.4" fill="${MEDICAL.glow}"/>`;
    }
  } else if (dot > 0) {
    // Powered down: the trace collapsed to a dot in the middle, fading.
    trace = `<circle cx="${f(s.x + s.w / 2)}" cy="${f(s.y + s.h * 0.62)}" r="3" fill="${MEDICAL.glow}" opacity="${f(dot)}"/>`;
  }
  return svg(w, h, `fx-vitals-${kind}`, frame + grid + trace, defs);
}

/** A berth's own small monitor, lit: the trace's color on its screen, 40 x 24 (the ward's monitor at k = 1). */
export function berthScreenSvg(kind) {
  if (!TRACE_KINDS.includes(kind)) throw new Error(`No trace ${kind}`);
  const W = 40, H = 24;
  const points = tracePoints(kind === 'boot' ? 'flat' : kind, W - 8, H - 8).map(([x, y]) => [x + 4, y + 4]);
  const glow = kind === 'off' ? '' : `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="${TRACE_COLOR[kind]}" opacity="0.18"/>`;
  const line = points.length ? `<path d="${points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="${TRACE_COLOR[kind]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  return svg(W, H, `fx-berth-screen-${kind}`, `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="${MEDICAL.screen}" stroke="${INK}" stroke-width="2"/>${glow}${line}`);
}

/** A status lamp's states: off, the warning amber, the critical red, and the calm cyan of a stable patient. */
export const LAMP_STATES = Object.freeze(['off', 'amber', 'red', 'calm']);
const LAMP_COLOR = Object.freeze({ off: MEDICAL.grid, amber: MEDICAL.amber, red: MEDICAL.warn, calm: MEDICAL.cyan });

/** A lamp's glow, 40 x 40, centred on the berth's lamp: a soft halo round a lit core, or a dark core. */
export function lampSvg(state) {
  if (!LAMP_STATES.includes(state)) throw new Error(`No lamp state ${state}`);
  const color = LAMP_COLOR[state];
  const defs = `<radialGradient id="lamp-${state}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${color}" stop-opacity="${state === 'off' ? 0 : 0.85}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  const body = `<circle cx="20" cy="20" r="19" fill="url(#lamp-${state})"/><circle cx="20" cy="20" r="6.5" fill="${state === 'off' ? MEDICAL.screen : color}" stroke="${INK}" stroke-width="2.5"/>`
    + (state === 'off' ? '' : '<circle cx="18" cy="18" r="2" fill="#FFFFFF" opacity="0.8"/>');
  return svg(40, 40, `fx-lamp-${state}`, body, defs);
}

// ---------- the status tags on a berth's plate ----------

/** The rescue tag's tones: the next round, the due round now, and no round left. */
export const RESCUE_TONES = Object.freeze(['next', 'current', 'none']);
const TONE_FILL = Object.freeze({ next: MEDICAL.cyan, current: MEDICAL.amber, none: '#8D97A8' });

/** The rescue tag's cross, 16 x 16: a medical cross on a round plate in the tone's color. The round number is the page's text beside it. */
export function rescueCrossSvg(tone) {
  if (!RESCUE_TONES.includes(tone)) throw new Error(`No rescue tone ${tone}`);
  const cross = 'M6.4 3.2 H9.6 V6.4 H12.8 V9.6 H9.6 V12.8 H6.4 V9.6 H3.2 V6.4 H6.4 Z';
  const strike = tone === 'none' ? `<path d="M3.5 12.5 L12.5 3.5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` : '';
  return svg(16, 16, `fx-rescue-${tone}`, `<circle cx="8" cy="8" r="7" fill="${TONE_FILL[tone]}" stroke="${INK}" stroke-width="1.6"/><path d="${cross}" fill="${PAPER}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>${strike}`);
}

/**
 * The neutral detention tag, 16 x 16: a slate wristband with the Jail's stripes on it, for a
 * detained patient, who keeps the gown (G-05). No faction color, no padlock: a status, not an outfit.
 */
export function detentionTagSvg() {
  return svg(16, 16, 'fx-detention', `<rect x="1" y="3" width="14" height="10" rx="3" fill="#4A5366" stroke="${INK}" stroke-width="1.6"/>`
    + `<path d="M4.5 3.5 V12.5 M8 3.5 V12.5 M11.5 3.5 V12.5" stroke="${PAPER}" stroke-width="1.6"/>`
    + `<circle cx="13.2" cy="8" r="1.6" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`);
}

// ---------- where a berth's tags and the vitals inset go ----------

const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const grow = (box, m) => ({ left: box.left - m, top: box.top - m, width: box.width + 2 * m, height: box.height + 2 * m });

/**
 * Where a berth's tag group goes in the Hospital's panel, in px from its top left: centred on the
 * berth's plate (fit.mjs slotRects() badge), whole inside the panel by LABEL_MARGIN, and never in
 * the band at its top where the caption is (above panel.cap, where no press area is): on a phone
 * the upper berths' plates are in that band, so their tags go just below it. Where it meets a box in
 * keepClear (the name tags of the row above, whose feet reach the plates below them), just below
 * that box. size is the group's laid-out [width, height]. Returns { left, top }, its top left.
 */
export function tagBox({ plate: [x, y], size: [width, height], panel, keepClear = [] }) {
  const m = LABEL_MARGIN;
  const left = Math.max(m, Math.min(panel.width - width - m, x - width / 2));
  let top = Math.max(panel.cap, Math.min(panel.height - height - m, y - height / 2));
  for (let moved = true; moved;) {
    moved = false;
    for (const box of keepClear) {
      if (!meets({ left, top, width, height }, box) || box.top + box.height + m + height > panel.height - m) continue;
      top = box.top + box.height + m;
      moved = true;
    }
  }
  return { left, top };
}

/** The smallest vitals inset worth drawing, in px wide: its screen is then about 35 x 13 px. */
export const INSET_MIN_WIDTH = 40;

/**
 * Where the vitals inset goes for a film at a berth, in the Hospital's panel: whole inside it by
 * LABEL_MARGIN, off the room's caption, off the berth's own press area and off every box in
 * keepClear: the press areas of the slots other seats hold in the snapshot (a living one may be a
 * real target while the film plays, and a vignette never covers one, Backend's CLINICAL_VIGNETTE
 * rule; nor does it hide a body) and any other film's inset. Above the berth's press area; else
 * below its name tag; else in the band beside the caption, where no press area is, as large as the
 * band allows; else nowhere, and the berth's own monitor shows the trace alone.
 *   rect     the berth's slot rect (fit.mjs slotRects())
 *   panel    { width, height, cap }
 *   width    the inset's width beside its berth; its height keeps INSET's proportions
 *   caption  the caption's box in the panel, or null
 * Returns { left, top, width, height, place } with place 'above', 'below' or 'band', or null.
 */
export function insetBox({ rect, panel, width, caption = null, keepClear = [] }) {
  const m = LABEL_MARGIN;
  const ratio = INSET.h / INSET.w;
  const guard = caption ? grow(caption, m) : null;
  const clear = [{ left: rect.left, top: rect.top, width: rect.side, height: rect.side }, ...keepClear];
  const fits = box => box.left >= m - 0.01 && box.top >= m - 0.01 && box.left + box.width <= panel.width - m + 0.01 && box.top + box.height <= panel.height - m + 0.01
    && !(guard && meets(box, guard)) && !clear.some(other => meets(box, other));
  const height = width * ratio;
  const left = Math.max(m, Math.min(panel.width - width - m, rect.press[0] - width / 2));
  // The name tag's bottom, as the board draws it (labelBox()'s rule).
  const tagBottom = Math.min(panel.height - 16, rect.top + rect.side - 14) + 16;
  for (const [place, top] of [['above', rect.top - height - m], ['below', tagBottom + m]]) {
    const box = { left, top, width, height };
    if (fits(box)) return { ...box, place };
  }
  // The band beside the caption: every press area starts below it (at panel.cap).
  const bandLeft = (guard ? guard.left + guard.width : 0) + m;
  const bandWidth = Math.min(panel.width - m - bandLeft, (panel.cap - 2 * m) / ratio);
  if (bandWidth >= INSET_MIN_WIDTH) {
    const box = { left: panel.width - m - bandWidth, top: m, width: bandWidth, height: bandWidth * ratio };
    if (fits(box)) return { ...box, place: 'band' };
  }
  return null;
}

// ---------- the medical drone ----------

/** The drone's box, its lens's centre in it, and its frames. */
export const DRONE = Object.freeze({ w: 160, h: 132, lens: Object.freeze([80, 56]), frames: Object.freeze(['folded', 'open', 'charge', 'pulse']) });

/** The smallest share of its size the drone is drawn at (droneFit()). */
export const DRONE_MIN_FIT = 0.5;

/**
 * How large the drone is drawn over a berth, as a share of its size (1 at most, DRONE_MIN_FIT at
 * least): the largest at which, hanging with its probes on the patient's chest, its top stays below
 * every box in keepClear above the chest that it would otherwise meet (the room's caption, and the
 * press areas other seats hold: a crowded ward, or an upper berth under the caption's band) and
 * below the panel's top. kit is berthKit(); frame the Hospital's scene frame in its panel
 * (frameScene(): { k, tx, ty }); keepClear boxes in the panel ({ left, top, width, height }).
 */
export function droneFit({ kit, frame: { k, tx, ty }, keepClear = [] }) {
  const half = (DRONE_SCENE.width * kit.scale * k) / 2;
  const cx = tx + kit.c * k;
  const chest = ty + kit.chest[1] * k;
  // How far above the chest the drone reaches at its full size: its probes' reach and its body above the lens.
  const rise = (DRONE_SCENE.reach + (DRONE.lens[1] / DRONE.w) * DRONE_SCENE.width) * kit.scale * k;
  let ceiling = 0;
  for (const box of keepClear) if (box.left < cx + half && cx - half < box.left + box.width && box.top + box.height <= chest) ceiling = Math.max(ceiling, box.top + box.height);
  // Its bob lifts it by DRONE_SCENE.bob scene units whatever its size.
  return Math.max(DRONE_MIN_FIT, Math.min(1, Math.floor((1000 * (chest - ceiling - DRONE_SCENE.bob * k)) / rise) / 1000));
}

/** Where the drone's lens hangs over a berth at a fit, in scene units: its probes on the chest. */
export const hoverAt = (kit, fit = 1) => [kit.c, f(kit.chest[1] - DRONE_SCENE.reach * kit.scale * fit)];

/** An arm from the body: its segments as joints, its tool at the end (a probe or the scanner). */
function arm(joints, { tool = 'probe', lit = false } = {}) {
  const d = joints.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
  const [ex, ey] = joints[joints.length - 1];
  const tip = tool === 'scanner'
    ? `<rect x="${f(ex - 9)}" y="${f(ey - 3)}" width="18" height="9" rx="3" fill="${MEDICAL.steel}" stroke="${INK}" stroke-width="3"/><path d="M${f(ex - 6)} ${f(ey + 6)} H${f(ex + 6)}" stroke="${lit ? MEDICAL.glow : MEDICAL.cyan}" stroke-width="2.5" stroke-linecap="round"/>`
    : `<path d="M${f(ex - 5)} ${f(ey)} L${f(ex)} ${f(ey + 8)} L${f(ex + 5)} ${f(ey)}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${f(ex)}" cy="${f(ey + 8)}" r="2.6" fill="${lit ? MEDICAL.glow : MEDICAL.cyan}" stroke="${INK}" stroke-width="1.4"/>`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${MEDICAL.steel}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>`
    + joints.slice(1, -1).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="${MEDICAL.navy}" stroke="${INK}" stroke-width="2"/>`).join('') + tip;
}

/**
 * The medical drone, frame folded (arriving or leaving, arms tucked under), open (arms unfolded
 * over the bed), charge (the probes and the lens charging) or pulse (the revival pulse leaving
 * the probes). A compact navy body with two rotor pods, cyan running lights and a yellow warning
 * light, a central lens, three small arms; thick ink and halftone. Symmetric: it points at no one.
 * 160 x 132, its lens at DRONE.lens.
 */
export function droneSvg(frame) {
  if (!DRONE.frames.includes(frame)) throw new Error(`No drone frame ${frame}`);
  const [lx, ly] = DRONE.lens;
  const lit = frame === 'charge' || frame === 'pulse';
  const defs = dotsPattern('drone-dots', INK, 1.3)
    + `<radialGradient id="drone-lens" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="${lit ? '#FFFFFF' : MEDICAL.lens}"/><stop offset="0.55" stop-color="${MEDICAL.cyan}"/><stop offset="1" stop-color="${MEDICAL.steel}"/></radialGradient>`;
  const arms = frame === 'folded'
    ? arm([[58, 74], [50, 86], [62, 92]]) + arm([[80, 78], [80, 90]], { tool: 'scanner' }) + arm([[102, 74], [110, 86], [98, 92]])
    : arm([[58, 74], [40, 96], [46, 116]], { lit }) + arm([[80, 78], [80, 104]], { tool: 'scanner', lit }) + arm([[102, 74], [120, 96], [114, 116]], { lit });
  const pods = [[30, 34], [130, 34]].map(([x, y]) => `<path d="M${x} ${y + 6} L${x} ${y + 16}" stroke="${INK}" stroke-width="5"/>`
    + `<ellipse cx="${x}" cy="${y}" rx="22" ry="5.5" fill="${MEDICAL.steel}" stroke="${INK}" stroke-width="3.5"/>`
    + `<ellipse cx="${x}" cy="${y}" rx="15" ry="2.6" fill="${MEDICAL.lens}" opacity="0.55"/>`).join('');
  const body = `<path d="M44 46 Q44 30 62 28 H98 Q116 30 116 46 L112 70 Q108 80 96 80 H64 Q52 80 48 70 Z" fill="${MEDICAL.navy}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M84 34 H98 Q110 36 110 48 L107 66 Q105 74 96 76 H86 Z" fill="url(#drone-dots)" opacity="0.5"/>`
    + `<path d="M52 44 Q54 36 64 35 H96" fill="none" stroke="${MEDICAL.steel}" stroke-width="3.5" stroke-linecap="round"/>`
    + `<path d="M30 46 H44 M116 46 H130" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  const lens = `<circle cx="${lx}" cy="${ly}" r="15" fill="${MEDICAL.steel}" stroke="${INK}" stroke-width="4"/><circle cx="${lx}" cy="${ly}" r="10" fill="url(#drone-lens)" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${lx - 3.5}" cy="${ly - 3.5}" r="2.6" fill="#FFFFFF" opacity="0.9"/>`
    + (lit ? `<circle cx="${lx}" cy="${ly}" r="${frame === 'pulse' ? 19 : 16}" fill="none" stroke="${MEDICAL.glow}" stroke-width="2.5" opacity="0.8"/>` : '');
  const lights = `<circle cx="58" cy="62" r="3.2" fill="${MEDICAL.cyan}" stroke="${INK}" stroke-width="1.6"/><circle cx="102" cy="62" r="3.2" fill="${MEDICAL.cyan}" stroke="${INK}" stroke-width="1.6"/>`
    + `<rect x="74" y="20" width="12" height="9" rx="3" fill="${MEDICAL.yellow}" stroke="${INK}" stroke-width="2.4"/>`;
  return svg(DRONE.w, DRONE.h, `fx-drone-${frame}`, pods + arms + body + lights + lens, defs);
}

/** The scan line that sweeps over the patient: a bright cyan bar with a soft glow, 140 x 16. */
export function scanLineSvg() {
  const defs = `<linearGradient id="scan-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MEDICAL.cyan}" stop-opacity="0"/><stop offset="0.5" stop-color="${MEDICAL.cyan}" stop-opacity="0.55"/><stop offset="1" stop-color="${MEDICAL.cyan}" stop-opacity="0"/></linearGradient>`;
  return svg(140, 16, 'fx-scan-line', `<rect x="0" y="0" width="140" height="16" fill="url(#scan-glow)"/><path d="M6 8 H134" stroke="${MEDICAL.glow}" stroke-width="2.4" stroke-linecap="round"/><path d="M2 8 H8 M132 8 H138" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`, defs);
}

/** The diagnostic hologram over the patient: a faint cyan outline of a torso, a cross and three ticks. 64 x 64. Subtle; no words. */
export function hologramSvg() {
  const torso = 'M32 10 Q40 10 40 18 Q40 24 35 26 L44 30 Q50 33 50 40 V54 H14 V40 Q14 33 20 30 L29 26 Q24 24 24 18 Q24 10 32 10 Z';
  return svg(64, 64, 'fx-hologram', `<path d="${torso}" fill="${MEDICAL.cyan}" fill-opacity="0.16" stroke="${MEDICAL.lens}" stroke-width="2" stroke-dasharray="4 2.5"/>`
    + `<path d="M29.5 34 H34.5 M32 31.5 V36.5" stroke="${MEDICAL.glow}" stroke-width="2.4" stroke-linecap="round"/>`
    + [0, 1, 2].map(i => `<path d="M54 ${16 + i * 8} H${60 - i * 2}" stroke="${MEDICAL.lens}" stroke-width="2" stroke-linecap="round"/>`).join(''));
}

/** The revival pulse's box and the radius, in it, of its white-hot core: the only part bright enough to count as a flash. */
export const PULSE_BOX = 120;
export const PULSE_FLASH_RADIUS = 14;

/**
 * The revival pulse at the patient's chest, frame 1 (a white-hot core and four short arcs) or 2
 * (a ring and the arcs fading out). Controlled and small: one flash, never a full-room flash.
 * 120 x 120.
 */
export function pulseSvg(frame) {
  const c = PULSE_BOX / 2;
  const arcs = r => [0, 90, 180, 270].map(angle => {
    const a = ((angle - 35) * Math.PI) / 180, b = ((angle + 35) * Math.PI) / 180;
    const p = t => [f(c + r * Math.cos(t)), f(c + r * Math.sin(t))];
    const mid = ((angle) * Math.PI) / 180;
    const [mx, my] = [f(c + (r + 7) * Math.cos(mid)), f(c + (r + 7) * Math.sin(mid))];
    return `<path d="M${p(a).join(' ')} L${mx} ${my} L${p(b).join(' ')}" fill="none" stroke="${MEDICAL.glow}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const defs = `<radialGradient id="pulse-core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="${MEDICAL.glow}"/><stop offset="1" stop-color="${MEDICAL.cyan}" stop-opacity="0"/></radialGradient>`;
  if (frame === 1) return svg(PULSE_BOX, PULSE_BOX, 'fx-pulse-1', `<circle cx="${c}" cy="${c}" r="${PULSE_FLASH_RADIUS}" fill="url(#pulse-core)"/>${arcs(24)}`, defs);
  if (frame === 2) return svg(PULSE_BOX, PULSE_BOX, 'fx-pulse-2', `<circle cx="${c}" cy="${c}" r="34" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${c}" cy="${c}" r="34" fill="none" stroke="${MEDICAL.cyan}" stroke-width="2.6"/>${arcs(40)}`, defs);
  throw new Error(`No pulse frame ${frame}`);
}

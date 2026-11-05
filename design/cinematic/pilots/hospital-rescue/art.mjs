// mothership:dev-only
//
// Pilot 1's cinematic layers as SVG, in the Hospital scene's units (1024 x 768) unless a function
// says it draws in screen pixels. Comic Noir over the approved S5 art: the ceiling dock's iris
// opening (the ward's own dock, scenes/hospital-ward-four.mjs, at DOCK), the searchlight and the
// scan fan from the drone's lens, the charge drawn into the lens, the revival pulse's rings, burst,
// speed lines and sparks, the THUMP and BEEP lettering, the monitor's beep glow, the lens's exit
// streak and the display's close-up of the monitor. Every function draws only what a frame of
// film.mjs passes in: no fact of the game is read here, and nothing points from a person to the
// patient (the light comes from the drone, which comes from the ceiling).

import { DOCK, DRONE, MEDICAL, TRACE_COLOR, berthScreenSvg, droneSvg, hologramSvg, lampSvg, pulseSvg, scanLineSvg, tracePoints, vitalsInsetSvg, INSET } from '../../../board-v2/fx/medical.mjs';
import { DRONE_SCENE } from '../../../board-v2/fx/medical.mjs';
import { INK, PAPER, burst, lightCone, lightPool, panelFrame, particles, ring, speedLines } from '../../lib/comic.mjs';
import { clamp01, easeInQuad, lerp, rand } from '../../lib/ease.mjs';
import { lettering } from '../../lib/lettering.mjs';
import { placeSvg } from '../../lib/scene.mjs';

const f = v => Number((+v).toFixed(2));

/** The ceiling dock's iris opening (0 shut, the ward's own dock showing; 1 open) and the light inside it. */
export function irisSvg(prefix, open, glow = open) {
  if (open <= 0.001) return '';
  const [x, y] = DOCK;
  const rx = 26 * Math.min(open, 1.12), ry = 8.6 * Math.min(open, 1.12);
  const g = `${prefix}-iris`;
  let blades = '';
  for (let i = 0; i < 6; i += 1) {
    const a = ((i * 60 + open * 46) * Math.PI) / 180, b = a + 0.95;
    const [x0, y0] = [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
    const [x1, y1] = [x + Math.cos(b) * rx * 0.42 * (1 - open * 0.5), y + Math.sin(b) * ry * 0.42 * (1 - open * 0.5)];
    blades += `M${f(x0)} ${f(y0)}Q${f(x + Math.cos(a + 0.5) * rx * 0.7)} ${f(y + Math.sin(a + 0.5) * ry * 0.7)} ${f(x1)} ${f(y1)}`;
  }
  return `<defs><radialGradient id="${g}" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${f(0.95 * glow)}"/><stop offset="0.45" stop-color="${MEDICAL.cyan}" stop-opacity="${f(0.85 * glow)}"/><stop offset="1" stop-color="${MEDICAL.navy}"/></radialGradient></defs>`
    + lightCone(prefix, 'iris', { from: [x, y + 3], to: [x, y + 170], spread: 46, color: MEDICAL.lens, opacity: 0.32 * glow, near: rx * 0.8 })
    + `<ellipse cx="${x}" cy="${f(y + 1.2)}" rx="${f(rx + 3.4)}" ry="${f(ry + 2)}" fill="${INK}"/>`
    + `<ellipse cx="${x}" cy="${y}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${g})"/>`
    + `<path d="${blades}" fill="none" stroke="${MEDICAL.steel}" stroke-width="1.6" stroke-linecap="round" opacity="${f(1 - open * 0.55)}"/>`
    + `<path d="M${f(x - rx)} ${y}A${f(rx)} ${f(ry)} 0 0 0 ${f(x + rx)} ${y}" fill="none" stroke="${MEDICAL.lens}" stroke-width="1.4" opacity="${f(0.8 * glow)}"/>`;
}

/** The searchlight from the drone's lens to the bed: a cone, a pool on the blanket and a hot lens. */
export function searchlightSvg(prefix, { from, to, spread, opacity }) {
  if (!(opacity > 0) || !from) return '';
  return lightCone(prefix, 'search', { from: [from[0], from[1] + 4], to, spread, color: MEDICAL.lens, opacity: 0.42 * opacity, near: 6 })
    + lightPool(prefix, 'search-pool', { cx: to[0], cy: to[1], rx: spread * 1.15, ry: spread * 0.36, color: MEDICAL.glow, opacity: 0.5 * opacity })
    + lightPool(prefix, 'search-lens', { cx: from[0], cy: from[1], rx: 16, ry: 16, color: '#FFFFFF', opacity: 0.55 * opacity });
}

/** The scan fan: a sheet of light from the scanner arm down to the scan line's height. */
export function scanFanSvg(prefix, { from, y, half, cx, opacity }) {
  if (!(opacity > 0) || !from) return '';
  const g = `${prefix}-fan`;
  const pts = [[from[0] - 3, from[1]], [from[0] + 3, from[1]], [cx + half, y], [cx - half, y]];
  return `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(from[0])}" y1="${f(from[1])}" x2="${f(from[0])}" y2="${f(y)}"><stop offset="0" stop-color="${MEDICAL.cyan}" stop-opacity="0.05"/><stop offset="1" stop-color="${MEDICAL.cyan}" stop-opacity="0.42"/></linearGradient></defs>`
    + `<g opacity="${f(opacity)}" style="mix-blend-mode:screen"><polygon points="${pts.map(([px, py]) => `${f(px)},${f(py)}`).join(' ')}" fill="url(#${g})"/>`
    + `<path d="M${f(from[0])} ${f(from[1])}L${f(cx - half)} ${f(y)}M${f(from[0])} ${f(from[1])}L${f(cx + half)} ${f(y)}" stroke="${MEDICAL.lens}" stroke-width="1.1" opacity="0.55"/></g>`;
}

/** The charge: motes spiralling into the lens, crackle at the probes, the lens filling with light. v 0..1. */
export function chargeSvg(prefix, { lens, v, scale }) {
  if (!(v > 0) || !lens) return '';
  let motes = '';
  for (let i = 0; i < 22; i += 1) {
    const delay = rand(41, i) * 0.45;
    const u = clamp01((v - delay) / 0.55);
    if (u <= 0 || u >= 1) continue;
    const a = rand(41, i, 'a') * Math.PI * 2 + (1 - u) * 1.1;
    const r = (34 + rand(41, i, 'r') * 46) * scale * (1 - easeInQuad(u));
    const [mx, my] = [lens[0] + Math.cos(a) * r, lens[1] + Math.sin(a) * r * 0.8];
    const [tx, ty] = [lens[0] + Math.cos(a - 0.25) * r * 1.18, lens[1] + Math.sin(a - 0.25) * r * 0.94];
    motes += `<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(mx)}" y2="${f(my)}" stroke="${MEDICAL.lens}" stroke-width="${f(1.6 * scale)}" stroke-linecap="round" opacity="${f(Math.sin(Math.PI * u))}"/>`;
  }
  // The probes' tips (droneSvg's arms end at x 46 and 114, y 116 in its 160-wide box).
  const unit = (DRONE_SCENE.width * scale) / DRONE.w;
  const crackle = [-34, 34].map((dx, side) => {
    const [px, py] = [lens[0] + dx * unit, lens[1] + 68 * unit];
    let d = `M${f(px)} ${f(py)}`;
    for (let j = 1; j <= 4; j += 1) d += `L${f(px + (rand(43, side, j, Math.floor(v * 9)) - 0.5) * 9 * scale)} ${f(py + j * 3.2 * scale)}`;
    return `<path d="${d}" fill="none" stroke="${MEDICAL.glow}" stroke-width="${f(1.3 * scale)}" stroke-linejoin="round" opacity="${f(0.35 + 0.65 * v)}"/>`;
  }).join('');
  return `<g style="mix-blend-mode:screen">${motes}${crackle}</g>`
    + lightPool(prefix, 'charge-lens', { cx: lens[0], cy: lens[1], rx: (8 + 16 * v) * scale, color: '#FFFFFF', opacity: 0.4 + 0.5 * v });
}

/** The revival pulse's comic accents at the chest: rings, the burst, focus lines, sparks and the THUMP. */
export function pulseAccentsSvg(prefix, frame, { chest, scale, surface }) {
  let out = '';
  const [cx, cy] = chest;
  if (frame.speed.opacity > 0 && surface === 'display') out += speedLines({ cx, cy, inner: frame.speed.inner, outer: frame.speed.outer, count: 40, seed: 7, color: INK, width: 2.6 * scale, opacity: frame.speed.opacity });
  for (const r of frame.rings) out += ring({ cx, cy, r: r.r, width: r.width, color: MEDICAL.lens, opacity: r.opacity, squash: 0.62 });
  if (frame.burst.opacity > 0) {
    out += burst({ cx, cy, r: frame.burst.r, points: 14, inner: 0.48, seed: 21, fill: MEDICAL.glow, opacity: frame.burst.opacity })
      + burst({ cx, cy, r: frame.burst.r * 0.55, points: 10, inner: 0.5, seed: 22, fill: MEDICAL.cyan, opacity: frame.burst.opacity, rotate: 9 })
      + lightPool(prefix, 'burst', { cx, cy, rx: frame.burst.r * 1.6, color: '#FFFFFF', opacity: 0.55 * frame.burst.opacity });
  }
  if (frame.sparks > 0) out += particles({ origin: [cx, cy - 4 * scale], v: frame.sparks, count: surface === 'display' ? 26 : 14, seed: 31, direction: -90, spread: 210, speed: 120 * scale, gravity: 80 * scale, color: MEDICAL.glow, ink: INK, size: 2.1 * scale, streak: 0.07 });
  if (frame.sfx.opacity > 0) out += lettering(frame.sfx.text, { x: frame.sfx.at[0], y: frame.sfx.at[1], size: frame.sfx.size, fill: MEDICAL.yellow, highlight: '#FFF6CF', rotate: frame.sfx.rotate, scale: frame.sfx.scale, opacity: frame.sfx.opacity, skew: -10 });
  return out;
}

/** The monitor's beep: a glow on the berth's screen and, on the display, a small BEEP. */
export function beepSvg(prefix, beep, { monitor, scale, surface }) {
  if (!(beep > 0)) return '';
  const [mx, my] = [monitor.x + monitor.w / 2, monitor.y + monitor.h / 2];
  return lightPool(prefix, 'beep', { cx: mx, cy: my, rx: monitor.w * 0.9, ry: monitor.h * 1.1, color: MEDICAL.stable, opacity: 0.6 * beep })
    + (surface === 'display' ? lettering('BEEP', { x: mx + 4 * scale, y: monitor.y - 13 * scale - (1 - beep) * 6 * scale, size: 10 * scale, fill: MEDICAL.stable, highlight: '#E9FFF5', opacity: Math.min(1, beep * 1.6), skew: -8, weight: 1.05, inkWeight: 0.7 }) : '');
}

/** The berth lamp's alarm glow: an amber pool round the lamp and over the headboard. */
export function alarmSvg(prefix, alarm, { lamp, scale }) {
  if (!(alarm > 0)) return '';
  return lightPool(prefix, 'alarm', { cx: lamp.cx, cy: lamp.cy, rx: 70 * scale, ry: 46 * scale, color: MEDICAL.amber, opacity: alarm })
    + lightPool(prefix, 'alarm-core', { cx: lamp.cx, cy: lamp.cy, rx: 14 * scale, color: '#FFE2A8', opacity: Math.min(1, alarm * 1.4) });
}

/** The lens's exit streak: vertical speed lines under the rising drone. */
export function trailSvg({ trail, scale }) {
  if (!(trail.opacity > 0) || !trail.to) return '';
  const [x, y] = trail.to;
  let d = '';
  for (let i = 0; i < 6; i += 1) {
    const dx = (i - 2.5) * 9 * scale + (rand(51, i) - 0.5) * 4 * scale;
    const len = (40 + rand(51, i, 'l') * 50) * scale * (0.6 + trail.v);
    const top = y + (18 + rand(51, i, 't') * 10) * scale;
    d += `M${f(x + dx)} ${f(top)}v${f(len)}`;
  }
  return `<path d="${d}" stroke="${MEDICAL.lens}" stroke-width="${f(2 * scale)}" stroke-linecap="round" opacity="${f(trail.opacity)}"/>`
    + `<path d="${d}" stroke="${INK}" stroke-width="${f(0.8 * scale)}" stroke-linecap="round" opacity="${f(trail.opacity * 0.6)}" transform="translate(${f(1.5 * scale)} 0)"/>`;
}

// ---------- the approved S5 layers, drawn inline (their geometry is medical-view.mjs's) ----------

/** S5's base frame for a berth's kit, as composition items, in scene units: the screen, the lamp, the drone, scan, hologram and pulse. */
export function baseItems(base, kit, { fit = 1, inset = null, drone: perspective = { scale: 1, clip: false }, prefix = 'b' } = {}) {
  const items = [];
  const k = kit.k;
  const screenKind = base.inset.kind === 'off' ? null : base.inset.kind;
  if (screenKind) items.push({ z: 3, svg: placeSvg(berthScreenSvg(screenKind), { x: kit.monitor.x, y: kit.monitor.y, width: kit.monitor.w, height: kit.monitor.h, scope: `${prefix}-${kit.id}-screen` }), kind: 's5-screen' });
  const lampState = base.lamp.state === 'dark' ? 'off' : base.lamp.state;
  const side = 8 * kit.lamp.r;
  items.push({ z: 3, svg: placeSvg(lampSvg(lampState), { x: kit.lamp.cx - side / 2, y: kit.lamp.cy - side / 2, width: side, height: side, opacity: lampState === 'off' ? 1 : base.lamp.opacity, scope: `${prefix}-${kit.id}-lamp` }), kind: 's5-lamp' });
  const droneWidth = DRONE_SCENE.width * kit.scale * fit;
  const droneHeight = (droneWidth * DRONE.h) / DRONE.w;
  if (base.drone.at) {
    const [ax, ay] = base.drone.at;
    // In perspective: drawn smaller near the ceiling dock, its lens where S5 puts it.
    const w = droneWidth * perspective.scale, h = droneHeight * perspective.scale;
    const drawn = placeSvg(droneSvg(base.drone.frame), { x: ax - (DRONE.lens[0] / DRONE.w) * w, y: ay - (DRONE.lens[1] / DRONE.h) * h, width: w, height: h, opacity: base.drone.opacity, scope: `${prefix}-${kit.id}-drone` });
    const clip = `${prefix}-ceiling-${kit.id}`;
    items.push({ z: 3660, svg: perspective.clip ? `<defs><clipPath id="${clip}"><rect x="0" y="${DOCK[1] - 1.5}" width="1024" height="768"/></clipPath></defs><g clip-path="url(#${clip})">${drawn}</g>` : drawn, kind: 's5-drone' });
  }
  if (base.scan.opacity > 0) {
    const w = kit.bed.w * 1.15, h = (w * 16) / 140;
    const sy = kit.bed.y + kit.bed.h * 0.7 * base.scan.y;
    items.push({ z: 3645, svg: placeSvg(scanLineSvg(), { x: kit.c - w / 2, y: sy - h / 2, width: w, height: h, scope: `${prefix}-${kit.id}-scan` }), kind: 's5-scan' });
  }
  if (base.hologram.opacity > 0) {
    const s = droneWidth * 0.55;
    items.push({ z: 3646, svg: placeSvg(hologramSvg(), { x: kit.chest[0] - s / 2, y: kit.chest[1] - s * 0.75, width: s, height: s, opacity: base.hologram.opacity, scope: `${prefix}-${kit.id}-hologram` }), kind: 's5-hologram' });
  }
  if (base.pulse.frame > 0) {
    const s = droneWidth * 0.9;
    const [cx, cy] = kit.chest;
    items.push({ z: 3665, svg: placeSvg(pulseSvg(base.pulse.frame), { x: cx - s / 2, y: cy - s / 2, width: s, height: s, opacity: base.pulse.opacity, scope: `${prefix}-${kit.id}-pulse`, transform: `translate(${f(cx)} ${f(cy)}) scale(${f(base.pulse.scale)}) translate(${f(-cx)} ${f(-cy)})` }), kind: 's5-pulse' });
  }
  if (inset && base.inset.opacity > 0) {
    const { x, y, width } = inset;
    const height = (width * INSET.h) / INSET.w;
    const s = base.inset.scale;
    items.push({ z: 3640, svg: placeSvg(vitalsInsetSvg(base.inset.kind, { sweep: base.inset.sweep, dot: base.inset.dot ?? 0 }), { x, y, width, height, opacity: base.inset.opacity, scope: `${prefix}-${kit.id}-inset`, transform: `translate(${f(x + width / 2)} ${f(y + height)}) scale(${f(s)}) translate(${f(-(x + width / 2))} ${f(-(y + height))})` }), kind: 's5-inset' });
  }
  return items;
}

/** A berth's state between films (films/medical.mjs berthState()): its screen and lamp, and a dark bed light for a body. */
export function berthStateItems(state, kit) {
  const items = [];
  if (state.monitor === 'unstable') items.push({ z: 3, svg: placeSvg(berthScreenSvg('unstable'), { x: kit.monitor.x, y: kit.monitor.y, width: kit.monitor.w, height: kit.monitor.h, scope: `bs-${kit.id}-screen` }), kind: 'berth-screen' });
  if (state.lamp) {
    const side = 8 * kit.lamp.r;
    items.push({ z: 3, svg: placeSvg(lampSvg(state.lamp), { x: kit.lamp.cx - side / 2, y: kit.lamp.cy - side / 2, width: side, height: side, scope: `bs-${kit.id}-lamp` }), kind: 'berth-lamp' });
  }
  if (state.bedLight === 'off') {
    const { cx, cy, rx, ry } = kit.bedLight;
    items.push({ z: 2, svg: `<defs><radialGradient id="bedlight-${kit.id}"><stop offset="0" stop-color="#080C14" stop-opacity="0.88"/><stop offset="1" stop-color="#080C14" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#bedlight-${kit.id})"/>`, kind: 'berth-bedlight' });
  }
  return items;
}

// ---------- the display's close-up panel, in screen pixels ----------

/**
 * The close-up of the berth's monitor (the display only): a comic panel, slid in from the right,
 * its screen's grid and the trace, unstable until the stabilize beat and then the steady rhythm
 * drawn on by its sweep. Words none: the trace's shape and colour carry it.
 */
export function ecgPanelSvg(prefix, ecg, { x = 1300, y = 700, w = 520, h = 250 } = {}) {
  if (!(ecg.opacity > 0)) return '';
  const dx = ecg.slide * 140;
  const sx = x + 22, sy = y + 20, sw = w - 44, sh = h - 40;
  let grid = '';
  for (let i = 1; i < 10; i += 1) grid += `M${f(sx + (sw * i) / 10)} ${sy}V${sy + sh}`;
  for (let i = 1; i < 5; i += 1) grid += `M${sx} ${f(sy + (sh * i) / 5)}H${sx + sw}`;
  const kind = ecg.kind;
  const pts = tracePoints(kind, sw, sh).map(([px, py]) => [sx + px, sy + py]);
  // The unstable trace scrolls; the stable one draws on from the left with its sweep.
  const reach = kind === 'stable' ? sx + sw * Math.max(0.02, ecg.sweep) : sx + sw;
  const shown = [];
  for (let i = 0; i < pts.length; i += 1) {
    const [px, py] = pts[i];
    if (px <= reach) { shown.push([px, py]); continue; }
    const [qx, qy] = pts[i - 1] ?? pts[0];
    if (qx < reach) shown.push([reach, qy + ((py - qy) * (reach - qx)) / (px - qx || 1)]);
    break;
  }
  const color = TRACE_COLOR[kind];
  const d = shown.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join('');
  const head = shown[shown.length - 1];
  return `<g opacity="${f(ecg.opacity)}" transform="translate(${f(dx)} 0)">`
    + panelFrame({ x, y, w, h, border: 8 })
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${MEDICAL.steel}"/>`
    + `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="10" fill="${MEDICAL.screen}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="${grid}" stroke="${MEDICAL.grid}" stroke-width="1.4" opacity="0.9"/>`
    + (d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" opacity="0.22" filter="url(#${prefix}-bloom)"/>`
      + `<path d="${d}" fill="none" stroke="${color}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round" opacity="0.6"/>` : '')
    + (head && kind === 'stable' && ecg.sweep < 1 ? `<circle cx="${f(head[0])}" cy="${f(head[1])}" r="9" fill="${MEDICAL.glow}" filter="url(#${prefix}-soft)"/><circle cx="${f(head[0])}" cy="${f(head[1])}" r="4.5" fill="#FFFFFF"/>` : '')
    + `<rect x="${x + w - 92}" y="${y + 6}" width="80" height="10" rx="5" fill="${INK}" opacity="0.5"/>`
    + `<circle cx="${x + w - 22}" cy="${y + h - 14}" r="5" fill="${kind === 'stable' ? MEDICAL.stable : MEDICAL.amber}" stroke="${INK}" stroke-width="2"/>`
    + `</g>`;
}

export { PAPER };

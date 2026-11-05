// mothership:dev-only
//
// Pilot 2's composition: the frame at t as one overlay SVG over a board, in the board's pixels.
// layout: { width, height, board: { x, y, w, h } (the rooms' area, between the bars), rooms:
// [{ x, y, w, h }] (each room panel, for the settle ripple) } — measured from whatever board is
// under the overlay. Nothing here reads a game fact: the same overlay plays for every Sync.

import { fxDefs, grade, letterbox, lightPool, ring, speedLines, vignette } from '../../lib/comic.mjs';
import { bell, clamp01, easeInCubic, easeOutCubic, lerp, r2, rand } from '../../lib/ease.mjs';
import { SHIP, VOID, blackholeSvg, inkWipe, lensedStars, settleRipple, shipSvg, titleSvg, titleWidth } from './art.mjs';
import { displayFrame, phoneFrame, reducedFrame } from './film.mjs';

const f = v => Number((+v).toFixed(2));

/** The ship at a frame: its echoes (time slices) behind it, stretched along its heading. */
function shipLayer(prefix, ship, { unit = 1 } = {}) {
  if (!ship) return '';
  const s = ship.scale * unit;
  const place = (dx, opacity, extra = '') => `<g opacity="${f(opacity)}" transform="translate(${f(ship.at[0] + dx)} ${f(ship.at[1])}) rotate(${f(ship.angle)}) scale(${f(s * ship.stretch)} ${f(s)}) translate(${f(-SHIP.nose[0] * 0.55)} ${f(-SHIP.h / 2)})"${extra}>${shipSvg(`${prefix}${dx}`, { engine: ship.engine })}</g>`;
  let out = '';
  for (let i = ship.echoes; i >= 1; i -= 1) {
    const back = ship.phase === 'out' ? 0 : i * 70 * s * ship.stretch;
    const dx = Math.cos((ship.angle * Math.PI) / 180) * back;
    out += place(dx, 0.12 + 0.05 * (ship.echoes - i), ` style="mix-blend-mode:screen"`);
  }
  return out + place(0, ship.opacity);
}

/** The full display cinematic over a board. */
function fullOverlay(t, layout, prefix) {
  const { width, height } = layout;
  const F = displayFrame(t, { width, height });
  if (F.done || t < 0) return { svg: '', frame: F };
  const [cx, cy] = F.center;
  const space = [];
  const zoom = F.cam.zoom;
  const cam = `translate(${f(cx + F.cam.shake[0])} ${f(cy + F.cam.shake[1])}) scale(${f(zoom)}) translate(${f(-cx)} ${f(-cy)})`;
  space.push(`<rect width="${width}" height="${height}" fill="${VOID.space}"/>`);
  space.push(`<g transform="${cam}">`);
  space.push(lensedStars({ width, height, cx, cy, rE: F.hole.r * 1.6, t, drift: [-t * 0.02, t * 0.008] }));
  space.push(blackholeSvg(prefix, { cx, cy, r: F.hole.r, spin: F.hole.spin, glow: F.hole.glow, flare: F.hole.flare, tilt: 0.21 }));
  if (F.hole.flare > 0) space.push(ring({ cx, cy, r: F.hole.r * (1.3 + 3.2 * easeOutCubic(F.hole.flare)), width: 10, color: VOID.disk[1], opacity: 1 - F.hole.flare, squash: 0.6 }));
  if (F.ship) space.push(shipLayer(`${prefix}s`, F.ship));
  space.push('</g>');
  if (F.ship?.phase === 'in' && F.ship.stretch > 1.6) space.push(speedLines({ cx, cy, inner: 260, outer: 1300, count: 46, seed: 13, color: '#E9F4FF', width: 2, opacity: 0.35 * clamp01((F.ship.stretch - 1.6) / 1) }));
  if (F.title.opacity > 0) space.push(titleSvg(prefix, { x: width / 2, y: F.title.y, size: 132, scale: F.title.scale, opacity: F.title.opacity, split: F.title.split, glow: F.title.glow }));
  space.push(vignette(prefix, { width, height, strength: 0.7 }));
  space.push(`<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.5"/>`);
  space.push(letterbox({ width, height, h: 0.085 * height * clamp01(F.bloom * 1.4) }));
  // The ink bloom: space shows inside a growing torn circle, the dimmed board outside it.
  const R = Math.hypot(width, height) * 0.62 * F.bloom;
  let bloomClip = '';
  if (F.bloom < 1) {
    const pts = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; const rr = R * (0.9 + rand(91, i) * 0.2); return `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`; }).join(' ');
    bloomClip = `<clipPath id="${prefix}-bloom-clip"><polygon points="${pts}"/></clipPath>`;
  }
  const wipe = F.wipe === null ? null : inkWipe(prefix, { width, height, v: F.wipe });
  const spaceGroup = F.space ? `<g${bloomClip ? ` clip-path="url(#${prefix}-bloom-clip)"` : ''}>${wipe ? `<g clip-path="url(#${wipe.clipId})">${space.join('')}</g>` : space.join('')}</g>` : '';
  // Before the bloom covers it, the board is dimmed and pulled toward the centre by inward speed lines.
  const pull = F.bloom < 1 ? `<rect width="${width}" height="${height}" fill="#05060C" opacity="${f(F.dim)}"/>`
    + speedLines({ cx, cy, inner: lerp(900, 140, easeInCubic(clamp01(t / 700))), outer: 1500, count: 54, seed: 17, color: '#0B0D14', width: 5, opacity: 0.7 * clamp01(t / 250) }) : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="blackhole">`
    + fxDefs(prefix) + `<defs>${bloomClip}${wipe ? wipe.clip : ''}</defs>`
    + (F.wipe === 1 ? '' : pull + spaceGroup)
    + (wipe && F.wipe < 1 ? wipe.band : '')
    + (F.settle > 0 ? settleRipple(layout.rooms, F.settle) : '')
    + `</svg>`;
  return { svg, frame: F };
}

/** The phone's band (and the display's nonblocking short variant): over the board's rooms, never over the bars. */
function bandOverlay(t, layout, prefix) {
  const { width, height, board } = layout;
  const F = phoneFrame(t);
  if (F.done || t < 0) return { svg: '', frame: F };
  const bandH = Math.min(board.h * 0.3, board.w * 0.42);
  const cy = board.y + board.h * 0.42;
  const h = bandH * F.band.open;
  const top = cy - h / 2;
  let inner = '';
  if (h > 1) {
    const holeR = bandH * 0.17;
    const hx = board.x + bandH * 0.62, hy = cy;
    const size = Math.min(bandH * 0.3, (board.w - bandH * 1.3) / (titleWidth(1) * 1.08));
    const tx = board.x + bandH * 1.2 + (titleWidth(size) * F.title.scale) / 2;
    const clip = `<clipPath id="${prefix}-band"><rect x="${board.x}" y="${f(top)}" width="${board.w}" height="${f(h)}"/></clipPath>`;
    inner = `<defs>${clip}</defs><g clip-path="url(#${prefix}-band)">`
      + `<rect x="${board.x}" y="${f(top)}" width="${board.w}" height="${f(h)}" fill="${VOID.space}"/>`
      + `<g transform="translate(${board.x} ${f(cy - bandH / 2)})">${lensedStars({ width: board.w, height: bandH, cx: hx - board.x, cy: bandH / 2, rE: holeR * 1.5, count: 90, seed: 73, t })}</g>`
      + blackholeSvg(prefix, { cx: hx, cy: hy, r: holeR, spin: F.hole.spin, glow: 1, flare: F.hole.flare, tilt: 0.22 })
      + (F.hole.flare > 0 ? ring({ cx: hx, cy: hy, r: holeR * (1.3 + 2.2 * F.hole.flare), width: 4, color: VOID.disk[1], opacity: 1 - F.hole.flare, squash: 0.6 }) : '')
      + (F.ship ? shipLayer(`${prefix}s`, { at: [lerp(board.x + board.w + 40, hx, F.ship.v), lerp(cy - bandH * 0.3, hy, F.ship.v)], scale: lerp(0.12, 0.012, F.ship.v), angle: -12, stretch: 1 + 1.4 * F.ship.v, echoes: Math.round(3 * F.ship.v), opacity: 1, engine: 1, phase: 'in' }, { unit: bandH / 110 }) : '')
      + titleSvg(prefix, { x: tx, y: cy, size, scale: F.title.scale, opacity: F.title.opacity, split: 0, glow: 0.8 + 0.2 * Math.sin(t / 200) })
      + `</g>`
      + `<path d="M${board.x} ${f(top)}H${board.x + board.w}M${board.x} ${f(top + h)}H${board.x + board.w}" stroke="#F2C14E" stroke-width="3"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="blackhole-band">`
    + fxDefs(prefix) + inner + (F.settle > 0 ? settleRipple(layout.rooms, F.settle) : '') + `</svg>`;
  return { svg, frame: F };
}

/** The reduced card: the title and a still blackhole on a dark card over the rooms, cross-faded. */
function cardOverlay(t, layout, prefix, surface) {
  const { width, height, board } = layout;
  const F = reducedFrame(t, surface);
  if (F.done || F.card <= 0) return { svg: '', frame: F };
  const display = surface !== 'phone';
  const h = display ? height : Math.min(board.h * 0.3, board.w * 0.42);
  const y = display ? 0 : board.y + board.h * 0.42 - h / 2;
  const x = display ? 0 : board.x, w = display ? width : board.w;
  const holeR = display ? 120 : h * 0.17;
  const hx = display ? width / 2 : x + h * 0.62, hy = display ? height * 0.42 : y + h / 2;
  const size = display ? 120 : Math.min(h * 0.3, (w - h * 1.3) / (titleWidth(1) * 1.08));
  const tx = display ? width / 2 : x + h * 1.2 + titleWidth(size) / 2;
  const ty = display ? height * 0.8 : y + h / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="blackhole-card">`
    + fxDefs(prefix) + `<g opacity="${f(F.card)}"><rect x="${x}" y="${f(y)}" width="${w}" height="${f(h)}" fill="${VOID.space}"/>`
    + blackholeSvg(prefix, { cx: hx, cy: hy, r: holeR, spin: 0.6, glow: 1, tilt: 0.21 })
    + titleSvg(prefix, { x: tx, y: ty, size, opacity: 1, glow: 0.85 })
    + (display ? '' : `<path d="M${x} ${f(y)}H${x + w}M${x} ${f(y + h)}H${x + w}" stroke="#F2C14E" stroke-width="3"/>`)
    + `</g></svg>`;
  return { svg, frame: F };
}

/** The overlay at t for a surface (display | phone) and variant (full | short | reduced). */
export function overlaySvg(t, layout, { surface = 'display', variant = 'full' } = {}) {
  const prefix = surface === 'phone' ? 'bp' : 'bd';
  if (variant === 'reduced') return cardOverlay(t, layout, prefix, surface);
  if (surface === 'phone' || variant === 'short') return bandOverlay(t, layout, prefix);
  return fullOverlay(t, layout, prefix);
}

/** The identity-free insert: the space shot alone (no board under it), with or without the title. */
export function insertSvg(t, { width = 1920, height = 1080, titled = true } = {}) {
  const prefix = 'bi';
  // The insert plays the display's space beats from the bloom's end to the passage's flare.
  const T = t + 620;
  const layout = { width, height, board: { x: 0, y: 0, w: width, h: height }, rooms: [] };
  const F = displayFrame(T, { width, height });
  const [cx, cy] = F.center;
  const cam = `translate(${f(cx + F.cam.shake[0])} ${f(cy + F.cam.shake[1])}) scale(${f(F.cam.zoom)}) translate(${f(-cx)} ${f(-cy)})`;
  const fadeOut = clamp01((T - 3950) / 260);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="blackhole-insert">`
    + fxDefs(prefix) + `<rect width="${width}" height="${height}" fill="${VOID.space}"/>`
    + `<g transform="${cam}">${lensedStars({ width, height, cx, cy, rE: F.hole.r * 1.6, t: T, drift: [-T * 0.02, T * 0.008] })}`
    + blackholeSvg(prefix, { cx, cy, r: F.hole.r, spin: F.hole.spin, glow: F.hole.glow, flare: F.hole.flare, tilt: 0.21 })
    + (F.hole.flare > 0 ? ring({ cx, cy, r: F.hole.r * (1.3 + 3.2 * easeOutCubic(F.hole.flare)), width: 10, color: VOID.disk[1], opacity: 1 - F.hole.flare, squash: 0.6 }) : '')
    + (F.ship ? shipLayer(`${prefix}s`, F.ship) : '') + `</g>`
    + (titled && F.title.opacity > 0 ? titleSvg(prefix, { x: width / 2, y: F.title.y, size: 132, scale: F.title.scale, opacity: F.title.opacity, split: F.title.split, glow: F.title.glow }) : '')
    + vignette(prefix, { width, height, strength: 0.7 }) + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.5"/>`
    + letterbox({ width, height, h: 0.085 * height })
    + (fadeOut > 0 ? `<rect width="${width}" height="${height}" fill="${VOID.space}" opacity="${f(fadeOut)}"/>` : '')
    + `</svg>`;
  return { svg, frame: F, layout };
}

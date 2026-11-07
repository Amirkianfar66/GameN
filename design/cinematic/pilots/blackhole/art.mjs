// mothership:dev-only
//
// Pilot 2's art, in screen pixels: the mothership in profile, the blackhole (shadow, accretion
// disk, its lensed far side, the photon ring and Doppler-bright side), a starfield bent by the
// lens (a point lens's two images per star), the luminous BLACKHOLE title in Ink Block, the
// comic ink-wipe cut and the settled board's ripple. Comic Noir: ink contours, halftone, a few
// deliberate lights. Nothing here is a fact of the game: no branch, count, population, role, side,
// actor or world is drawn; the same pictures play for every Sync that reports a Blackhole.
// The palette keeps off the faction accents: the hull is the ship's steel, its lights amber and
// the medical cyan (fx/medical.mjs, checked against the faction accents there).

import { CAPTAIN } from '../../../board-v2/fx/captain.mjs';
import { MEDICAL } from '../../../board-v2/fx/medical.mjs';
import { INK, PAPER } from '../../lib/comic.mjs';
import { clamp01, lerp, rand } from '../../lib/ease.mjs';
import { lettering, measure } from '../../lib/lettering.mjs';

const f = v => Number((+v).toFixed(2));

export const VOID = Object.freeze({ space: '#05060C', disk: Object.freeze(['#FFF8E8', '#FFE29A', '#F2C14E', '#E0892E', '#7A3A1C']), rim: '#BFF7FA', hot: '#FFFFFF' });

/** The ship's box, its nose and its engines' exhaust centre, in its own units (it faces +x). */
export const SHIP = Object.freeze({ w: 620, h: 210, nose: Object.freeze([606, 112]), exhaust: Object.freeze([28, 118]) });

/**
 * The mothership in profile, facing right, 620 x 210: a long steel hull, the command bridge's
 * window band at the bow (the Command Room's window, lit amber), a dorsal fin, two engine
 * nacelles with cyan exhaust (engine 0..1), panel lines, halftone shade and running lights.
 */
export function shipSvg(prefix, { engine = 1, lights = 1 } = {}) {
  const hull = 'M40 92 Q60 70 120 64 L410 58 Q470 56 520 70 Q585 88 606 112 Q585 134 520 146 Q470 158 410 158 L130 160 Q70 160 46 140 Q34 118 40 92 Z';
  const belly = 'M70 140 Q120 154 250 156 L410 156 Q480 154 540 138 Q500 168 410 172 L190 174 Q110 172 70 140 Z';
  const fin = 'M150 64 L196 14 Q206 6 222 8 L262 10 Q270 12 264 22 L238 62 Z';
  const nacelle = (y, s) => `<g transform="translate(0 ${y})">`
    + `<path d="M18 0 Q14 -16 34 -20 L150 -22 Q176 -20 182 0 Q176 20 150 22 L34 20 Q14 16 18 0 Z" fill="${CAPTAIN.hull}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M40 -12 L150 -14 Q164 -12 168 -2" fill="none" stroke="${CAPTAIN.hullLight}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`
    + `<ellipse cx="18" cy="0" rx="${f(7 + 3 * s)}" ry="14" fill="${MEDICAL.cyan}" stroke="${INK}" stroke-width="3.5"/>`
    + `<ellipse cx="16" cy="0" rx="4" ry="8" fill="#FFFFFF" opacity="${f(0.6 + 0.4 * s)}"/></g>`;
  const exhaust = engine > 0 ? [92, 146].map((y, i) => `<path d="M14 ${y - 13} Q${f(-80 - 160 * engine)} ${y} 14 ${y + 13} Z" fill="url(#${prefix}-flame)" opacity="${f(0.85 * engine)}"/>`
    + `<path d="M14 ${y - 5} Q${f(-30 - 90 * engine)} ${y} 14 ${y + 5} Z" fill="#FFFFFF" opacity="${f(0.8 * engine)}"/>`).join('') : '';
  const windows = Array.from({ length: 6 }, (_, i) => `<path d="M${470 + i * 16} 82 L${482 + i * 16} 82 L${484 + i * 16} 96 L${470 + i * 16} 96 Z" fill="${i === 5 ? '#FFE7A3' : '#F2C14E'}" stroke="${INK}" stroke-width="2"/>`).join('');
  const portholes = [170, 214, 258, 302, 346, 390].map(x => `<circle cx="${x}" cy="104" r="5.5" fill="${lights > 0.5 ? '#FFE7A3' : CAPTAIN.hull}" stroke="${INK}" stroke-width="2.4"/>`).join('');
  const defs = `<defs><pattern id="${prefix}-ship-dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.4" fill="${INK}"/></pattern>`
    + `<linearGradient id="${prefix}-flame" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#E8FBFF"/><stop offset="0.35" stop-color="${MEDICAL.cyan}"/><stop offset="1" stop-color="${MEDICAL.cyan}" stop-opacity="0"/></linearGradient>`
    + `<clipPath id="${prefix}-ship-hull"><path d="${hull}"/></clipPath></defs>`;
  return defs + exhaust + nacelle(92, engine) + `<path d="${fin}" fill="${CAPTAIN.hull}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M204 20 L254 18" stroke="${CAPTAIN.hullLight}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="${belly}" fill="#2E3A4E" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="${hull}" fill="${CAPTAIN.hull}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<g clip-path="url(#${prefix}-ship-hull)">`
    + `<path d="M40 128 Q300 150 606 112 L606 170 L40 170 Z" fill="url(#${prefix}-ship-dots)" opacity="0.5"/>`
    + `<path d="M120 64 L120 158 M230 60 L232 158 M340 58 L342 158 M430 58 Q446 108 430 158" fill="none" stroke="${INK}" stroke-width="2.6" opacity="0.55"/>`
    + `<path d="M60 84 Q120 70 410 64 Q480 62 530 76" fill="none" stroke="${CAPTAIN.hullLight}" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`
    + `<path d="M140 124 H400" stroke="${INK}" stroke-width="2.4" opacity="0.5"/>`
    + `</g>`
    + windows + portholes
    + `<path d="M520 70 Q585 88 606 112" fill="none" stroke="#DCE6F2" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`
    + nacelle(146, engine)
    + `<circle cx="604" cy="112" r="4" fill="${lights > 0.5 ? '#FFFFFF' : CAPTAIN.hullLight}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="236" cy="12" r="4.5" fill="${lights > 0.5 ? MEDICAL.yellow : CAPTAIN.hull}" stroke="${INK}" stroke-width="2"/>`;
}

/**
 * The blackhole at (cx, cy), its shadow's radius r, its disk spinning with `spin` (radians): the
 * glow, the disk's far side behind the shadow, the far side's lensed image bent over and under
 * the shadow, the shadow, the photon ring, the disk's near side in front, Doppler-bright on the
 * left, swirl streaks and an ink contour. `tilt`: the disk's ellipse ratio. `glow`: 0..1.
 */
export function blackholeSvg(prefix, { cx, cy, r, spin = 0, tilt = 0.2, glow = 1, flare = 0 }) {
  if (r <= 0.5) return '';
  const R0 = r * 1.5, R1 = r * 3.3;
  const g = id => `${prefix}-bh-${id}`;
  const disk = VOID.disk;
  const defs = `<defs>`
    + `<radialGradient id="${g('halo')}" cx="50%" cy="50%" r="50%"><stop offset="0.18" stop-color="${disk[2]}" stop-opacity="${f(0.55 * glow)}"/><stop offset="0.5" stop-color="${disk[3]}" stop-opacity="${f(0.18 * glow)}"/><stop offset="1" stop-color="${disk[4]}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${g('disk')}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(R1)}" gradientTransform="translate(${f(cx)} ${f(cy)}) scale(1 ${f(tilt)}) translate(${f(-cx)} ${f(-cy)})">`
    + `<stop offset="${f(R0 / R1 - 0.02)}" stop-color="${disk[0]}"/><stop offset="${f(R0 / R1 + 0.08)}" stop-color="${disk[1]}"/><stop offset="0.62" stop-color="${disk[2]}"/><stop offset="0.85" stop-color="${disk[3]}" stop-opacity="0.85"/><stop offset="1" stop-color="${disk[4]}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${g('doppler')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.45"/></linearGradient>`
    + `<radialGradient id="${g('lensed')}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.62)}"><stop offset="0.6" stop-color="${disk[0]}" stop-opacity="0"/><stop offset="0.64" stop-color="${disk[0]}"/><stop offset="0.76" stop-color="${disk[1]}"/><stop offset="0.9" stop-color="${disk[2]}" stop-opacity="0.8"/><stop offset="1" stop-color="${disk[3]}" stop-opacity="0"/></radialGradient>`
    + `<clipPath id="${g('front')}"><rect x="${f(cx - R1 - 4)}" y="${f(cy)}" width="${f(2 * R1 + 8)}" height="${f(R1)}"/></clipPath>`
    + `<clipPath id="${g('back')}"><rect x="${f(cx - R1 - 4)}" y="${f(cy - R1)}" width="${f(2 * R1 + 8)}" height="${f(R1)}"/></clipPath>`
    + `<pattern id="${g('dots')}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="4.5" cy="4.5" r="1.6" fill="${disk[3]}"/></pattern>`
    + `</defs>`;
  const ring = (rr0, rr1) => `M${f(cx - rr1)} ${f(cy)}A${f(rr1)} ${f(rr1 * tilt)} 0 1 0 ${f(cx + rr1)} ${f(cy)}A${f(rr1)} ${f(rr1 * tilt)} 0 1 0 ${f(cx - rr1)} ${f(cy)}Z`
    + `M${f(cx - rr0)} ${f(cy)}A${f(rr0)} ${f(rr0 * tilt)} 0 1 1 ${f(cx + rr0)} ${f(cy)}A${f(rr0)} ${f(rr0 * tilt)} 0 1 1 ${f(cx - rr0)} ${f(cy)}Z`;
  const diskPath = ring(R0, R1);
  // Swirl streaks: arcs of the disk's ellipse at a few radii, turning with spin, faster inside.
  let streaks = '';
  for (let i = 0; i < 22; i += 1) {
    const rr = lerp(R0 * 1.05, R1 * 0.92, rand(61, i));
    const speed = (R0 / rr) ** 1.5;
    const a0 = rand(61, i, 'a') * Math.PI * 2 + spin * speed * 2.2;
    const len = 0.35 + rand(61, i, 'l') * 0.6;
    const p = a => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * tilt];
    const [x0, y0] = p(a0), [x1, y1] = p(a0 + len);
    streaks += `<path d="M${f(x0)} ${f(y0)}A${f(rr)} ${f(rr * tilt)} 0 0 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${i % 3 ? '#FFF6DA' : '#FFFFFF'}" stroke-width="${f(1.4 + rand(61, i, 'w') * 2.4)}" stroke-linecap="round" opacity="${f(0.25 + rand(61, i, 'o') * 0.45)}"/>`;
  }
  const diskLayer = clip => `<g clip-path="url(#${g(clip)})"><path d="${diskPath}" fill="url(#${g('disk')})" fill-rule="evenodd"/>`
    + `<path d="${diskPath}" fill="url(#${g('doppler')})" fill-rule="evenodd" style="mix-blend-mode:overlay"/>`
    + `<path d="${diskPath}" fill="url(#${g('dots')})" fill-rule="evenodd" opacity="0.28"/>`
    + `<g style="mix-blend-mode:screen">${streaks}</g>`
    + `<path d="${diskPath}" fill="none" stroke="${INK}" stroke-width="3" opacity="0.7" fill-rule="evenodd"/></g>`;
  // The far side's lensed image: a ring round the shadow, brighter above (the disk seen over the top).
  const lensed = `<ellipse cx="${f(cx)}" cy="${f(cy - r * 0.04)}" rx="${f(r * 1.62)}" ry="${f(r * 1.58)}" fill="url(#${g('lensed')})"/>`;
  const shadow = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#000000"/>`;
  const photon = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.035)}" fill="none" stroke="${VOID.hot}" stroke-width="${f(Math.max(1.5, r * 0.035))}" opacity="${f(0.9)}"/>`
    + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.08)}" fill="none" stroke="${disk[1]}" stroke-width="${f(Math.max(1, r * 0.02))}" opacity="0.6"/>`
    + (flare > 0 ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * (1.1 + flare * 0.5))}" fill="none" stroke="#FFFFFF" stroke-width="${f(r * 0.12 * (1 - flare))}" opacity="${f(1 - flare)}"/>` : '');
  return defs
    + `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(R1 * 1.45)}" ry="${f(R1 * 0.9)}" fill="url(#${g('halo')})"/>`
    + diskLayer('back') + lensed + shadow + photon + diskLayer('front');
}

/**
 * A starfield bent by a point lens at (cx, cy) with Einstein radius rE: each star's two images
 * (the lens equation for a point mass), stretched along the ring near it, the inner image dim.
 * Stars drift with `drift` (px); twinkle with t.
 */
export function lensedStars({ width, height, cx, cy, rE, count = 340, seed = 71, t = 0, drift = [0, 0] }) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const sx = ((rand(seed, i, 'x') * width + drift[0] * (0.3 + rand(seed, i, 'z'))) % width + width) % width;
    const sy = ((rand(seed, i, 'y') * height + drift[1] * (0.3 + rand(seed, i, 'z'))) % height + height) % height;
    const size = rand(seed, i, 's') < 0.86 ? 1.1 : rand(seed, i, 's') < 0.97 ? 1.9 : 2.8;
    const tw = 0.55 + 0.45 * Math.sin(t / (280 + rand(seed, i, 'p') * 800) + rand(seed, i) * 6.28);
    const dx = sx - cx, dy = sy - cy;
    const beta = Math.hypot(dx, dy) || 0.001;
    const ux = dx / beta, uy = dy / beta;
    const images = rE > 0 ? [[(beta + Math.sqrt(beta * beta + 4 * rE * rE)) / 2, 1], [(beta - Math.sqrt(beta * beta + 4 * rE * rE)) / 2, 0.45]] : [[beta, 1]];
    for (const [theta, k] of images) {
      const px = cx + ux * theta, py = cy + uy * theta;
      if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;
      // Magnification grows near the ring; the image stretches tangentially.
      const mu = rE > 0 ? Math.min(6, Math.abs(1 / (1 - (rE / theta) ** 4))) : 1;
      const stretch = Math.min(26, size * Math.sqrt(mu) * 1.6);
      const opacity = clamp01(tw * k * Math.min(1, 0.6 + mu * 0.2));
      if (stretch > size * 2.2) {
        const ang = Math.atan2(py - cy, px - cx) + Math.PI / 2;
        out += `<line x1="${f(px - Math.cos(ang) * stretch / 2)}" y1="${f(py - Math.sin(ang) * stretch / 2)}" x2="${f(px + Math.cos(ang) * stretch / 2)}" y2="${f(py + Math.sin(ang) * stretch / 2)}" stroke="#F4F8FF" stroke-width="${f(size * 0.9)}" stroke-linecap="round" opacity="${f(opacity)}"/>`;
      } else {
        out += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(size)}" fill="${size > 2 ? '#FFF3C4' : '#E9F4FF'}" opacity="${f(opacity)}"/>`;
      }
    }
  }
  return out;
}

/** The luminous BLACKHOLE title: white-hot Ink Block with an amber bloom and a cyan/amber split that converges (split px). */
export function titleSvg(prefix, { x, y, size, scale = 1, opacity = 1, split = 0, glow = 1, text = 'BLACKHOLE' }) {
  if (!(opacity > 0)) return '';
  const base = { x, y, size, scale, skew: -9, tracking: 1.6, weight: 1.2, inkWeight: 0.72 };
  return `<g opacity="${f(opacity)}">`
    + (split > 0.2 ? `<g style="mix-blend-mode:screen" opacity="0.8">${lettering(text, { ...base, x: x - split, fill: MEDICAL.cyan, highlight: MEDICAL.cyan, ink: 'none', shadow: null, inkWeight: 0 })}${lettering(text, { ...base, x: x + split, fill: VOID.disk[3], highlight: VOID.disk[3], ink: 'none', shadow: null, inkWeight: 0 })}</g>` : '')
    // The glow's blur is in the glyph grid's units (the lettering is scaled by size / 6), so it has its own filter.
    + (glow > 0 ? `<defs><filter id="${prefix}-title-glow" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="0.5"/></filter><filter id="${prefix}-title-halo" x="-15%" y="-120%" width="130%" height="340%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
      + `<g opacity="${f(0.55 * glow)}" style="mix-blend-mode:screen">${lettering(text, { ...base, fill: VOID.disk[3], highlight: VOID.disk[3], ink: 'none', inkWeight: 0, shadow: null, glow: `${prefix}-title-halo`, glowColor: VOID.disk[2] })}</g>`
      + `<g opacity="${f(glow)}" style="mix-blend-mode:screen">${lettering(text, { ...base, fill: VOID.disk[1], highlight: VOID.disk[1], ink: 'none', inkWeight: 0, shadow: null, glow: `${prefix}-title-glow`, glowColor: VOID.disk[1] })}</g>` : '')
    + lettering(text, { ...base, fill: VOID.disk[0], highlight: '#FFFFFF', shadow: [0.5, 0.6] })
    + `</g>`;
}

/** The title's width in px at a cap height. */
export const titleWidth = (size, text = 'BLACKHOLE') => (measure(text, 1.6) * size) / 6;

/**
 * The comic cut: an inked band with a torn leading edge sweeping across the frame, left to right,
 * `v` 0..1. Returns { clip (a clip-path for the layer it wipes away: everything right of the
 * band), band (the ink band's markup) }; the layer under it shows left of the band.
 */
export function inkWipe(prefix, { width, height, v, band = 240, slant = 0.32 }) {
  const travel = width + band + slant * height + 60;
  const lead = -band + v * travel;
  const edge = (y, x0) => x0 - slant * (y - height / 2) + (rand(81, Math.floor(y / 36)) - 0.5) * 34;
  const steps = 30;
  const pts = Array.from({ length: steps + 1 }, (_, i) => (i * height) / steps);
  const leadEdge = pts.map(y => [edge(y, lead), y]);
  const tailEdge = pts.map(y => [edge(y, lead - band) + (rand(83, Math.floor(y / 52)) - 0.5) * 26, y]);
  const poly = list => list.map(([px, py]) => `${f(px)},${f(py)}`).join(' ');
  const clipId = `${prefix}-wipe`;
  const clip = `<clipPath id="${clipId}"><polygon points="${poly([...leadEdge, [width + 2000, height], [width + 2000, 0]])}"/></clipPath>`;
  const bandPoly = poly([...leadEdge, ...tailEdge.reverse()]);
  const markup = `<polygon points="${bandPoly}" fill="${INK}"/>`
    + `<polygon points="${bandPoly}" fill="url(#${prefix}-dots-light)" opacity="0.18"/>`
    + `<polyline points="${poly(leadEdge)}" fill="none" stroke="${VOID.disk[2]}" stroke-width="5" opacity="0.85"/>`;
  return { clipId, clip, band: markup };
}

/** The settled board's ripple: a gold outline round each room panel, inflating and fading in turn. rooms: [{ x, y, w, h }]. */
export function settleRipple(rooms, v, { stagger = 0.08, color = '#F2C14E' } = {}) {
  return rooms.map((room, i) => {
    const u = clamp01((v - i * stagger) / (1 - stagger * (rooms.length - 1)));
    if (u <= 0 || u >= 1) return '';
    const grow = 3 + 12 * u;
    return `<rect x="${f(room.x - grow)}" y="${f(room.y - grow)}" width="${f(room.w + 2 * grow)}" height="${f(room.h + 2 * grow)}" rx="6" fill="none" stroke="${color}" stroke-width="${f(6 * (1 - u) + 1)}" opacity="${f(1 - u)}"/>`;
  }).join('');
}

export { INK, PAPER };

// The end scene's arrival: runtime source, Designer's. The approved arrival's drawing, ported unchanged (the Lead
// Designer's review of #271, 15 November 2026), so the scene can draw any moment of its arrival.
//
// Provenance:
// - Ported from claude/designer-library-navigation at 6b63560d990c50dd1d16e44e6f40f5b7b77b6b68. Its files below are
//   byte-identical (the same git blobs) to PR #184's head 0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878, the head whose
//   named assets Integration approved: docs/integration/planet-library-art-approval-2026-11-06.json, the Blue and Red
//   arrival (arrival-blue.mp4 5a905ac7…, arrival-blue.poster.webp 4ca9e339…, arrival-red.mp4 11cc9788…,
//   arrival-red.poster.webp 32f9127d…), "optional underlays only after the matching authoritative terminal arrival".
// - design/library/navigation/films.mjs (blob 55f600b6556d): PLANETS, planetSvg, arrivalFrame and arrivalSvg.
// - design/cinematic/lib/comic.mjs (blob 934244497920): lightCone.
// - design/cinematic/lib/ease.mjs (blob c587a203dc18): easeInOutCubic.
// - Everything else they use (the ship, the stars, the effects, FILM) is ../ship-travel/ship-art.mjs's, ported from
//   the same commit.
// Each function is its source's text, character for character. packages/design-tokens/test/end-scene.test.mjs checks
// each one's SHA-256 against its source's and that arrivalSvg() at 4100 ms writes the approved posters' frames byte for
// byte; design/tools/end-scene-check.mjs compares the scene's still with the approved posters' pixels.
//
// The sources are development code, marked so. This file is their runtime derivative, new with the end scene; the
// drawing-port fence scans only apps/ and packages/presentation, so Integration reviews it when it admits the
// component's module graph. The planets' hues are here, and only here: the scene draws an arrival only once the
// server has published it (result.reason 'ARRIVAL'), when the destination is public. ship-art.mjs stays planet-free.

import { FILM, INK, VOID, clamp01, easeOutCubic, f, filmEnd, fxDefs, lerp, letterbox, rand, ship, stars, vignette } from '../ship-travel/ship-art.mjs';

// ── Ported unchanged: design/cinematic/lib/ease.mjs ───────────────

export const easeInOutCubic = v => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);

// ── Ported unchanged: design/cinematic/lib/comic.mjs ──────────────

/** A cone of light from `from` toward `to`, `spread` wide at its far end, fading along its length. */
export function lightCone(prefix, id, { from, to, spread, color = '#BFF4FF', opacity = 0.5, near = 10 }) {
  const [x0, y0] = from, [x1, y1] = to;
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const p = [[x0 + nx * near, y0 + ny * near], [x1 + nx * spread, y1 + ny * spread], [x1 - nx * spread, y1 - ny * spread], [x0 - nx * near, y0 - ny * near]];
  const g = `${prefix}-cone-${id}`;
  return `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}">`
    + `<stop offset="0" stop-color="${color}" stop-opacity="${f(opacity)}"/><stop offset="0.7" stop-color="${color}" stop-opacity="${f(opacity * 0.35)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
    + `<polygon points="${p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
}

// ── Ported unchanged: design/library/navigation/films.mjs (the arrival) ──

/** The planets' hues: public at arrival only. */
export const PLANETS = Object.freeze({
  Blue: Object.freeze({ lit: '#8FD0FF', mid: '#2F6FD6', dark: '#0B1F4A', rim: '#A8E4FF', cloud: '#F4FAFF', ring: '#D6ECFF', land: '#2C9C8A' }),
  Red: Object.freeze({ lit: '#FFB07A', mid: '#C8452B', dark: '#3A0E0A', rim: '#FFC08A', cloud: '#FFE2C4', ring: null, land: '#8E2A1A' }),
});

/** A planet at (cx, cy), radius r: its side's hues, a halftone shade, its landmark (ring, or craters and a moon). */
export function planetSvg(prefix, side, { cx, cy, r, turn = 0, glow = 1 }) {
  const P = PLANETS[side];
  const id = `${prefix}-${side.toLowerCase()}`;
  const defs = `<defs><radialGradient id="${id}-body" cx="0.34" cy="0.3" r="0.85"><stop offset="0" stop-color="${P.lit}"/><stop offset="0.48" stop-color="${P.mid}"/><stop offset="1" stop-color="${P.dark}"/></radialGradient>`
    + `<radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0.82" stop-color="${P.rim}" stop-opacity="0"/><stop offset="0.9" stop-color="${P.rim}" stop-opacity="${f(0.55 * glow)}"/><stop offset="1" stop-color="${P.rim}" stop-opacity="0"/></radialGradient>`
    + `<pattern id="${id}-dots" width="${f(Math.max(6, r / 22))}" height="${f(Math.max(6, r / 22))}" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="${f(Math.max(3, r / 44))}" cy="${f(Math.max(3, r / 44))}" r="${f(Math.max(1.2, r / 120))}" fill="${INK}"/></pattern>`
    + `<clipPath id="${id}-clip"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath></defs>`;
  const halo = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.22)}" fill="url(#${id}-glow)"/>`;
  const body = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id}-body)"/>`;
  let surface = '';
  if (side === 'Blue') {
    // Ocean, two islands, cloud bands that drift with the turn.
    surface += [[-0.28, 0.12, 0.2, 0.09], [0.3, -0.18, 0.14, 0.07]].map(([dx, dy, rx, ry], i) => `<ellipse cx="${f(cx + dx * r + turn * r * 0.12)}" cy="${f(cy + dy * r)}" rx="${f(rx * r)}" ry="${f(ry * r)}" fill="${P.land}" stroke="${INK}" stroke-width="${f(Math.max(2, r / 90))}" transform="rotate(${-12 + i * 20} ${f(cx + dx * r)} ${f(cy + dy * r)})"/>`).join('');
    for (let i = 0; i < 7; i += 1) {
      const yy = cy + (-0.7 + i * 0.22) * r;
      const span = Math.sqrt(Math.max(0, 1 - ((yy - cy) / r) ** 2)) * r;
      const off = ((turn * 0.6 + rand(51, i)) % 1) * span * 0.6;
      surface += `<path d="M${f(cx - span + off)} ${f(yy)} q${f(span * 0.35)} ${f(-r * 0.05)} ${f(span * 0.7)} ${f(r * 0.01)} t${f(span * 0.6)} ${f(r * 0.02)}" fill="none" stroke="${P.cloud}" stroke-width="${f(r * (0.03 + rand(52, i) * 0.03))}" stroke-linecap="round" opacity="${f(0.45 + rand(53, i) * 0.3)}"/>`;
    }
  } else {
    // Rust plains, a canyon, craters with lit rims, a dust band.
    surface += `<path d="M${f(cx - r * 0.9)} ${f(cy + r * 0.1)} C${f(cx - r * 0.4)} ${f(cy - r * 0.12)} ${f(cx - r * 0.1)} ${f(cy + r * 0.32)} ${f(cx + r * 0.5)} ${f(cy + r * 0.12)} S${f(cx + r * 0.9)} ${f(cy + r * 0.3)} ${f(cx + r)} ${f(cy + r * 0.22)}" fill="none" stroke="${P.land}" stroke-width="${f(r * 0.05)}" stroke-linecap="round"/>`;
    surface += [[-0.38, -0.32, 0.17], [0.3, -0.4, 0.11], [0.12, 0.42, 0.13], [-0.55, 0.38, 0.08], [0.55, 0.05, 0.09]].map(([dx, dy, cr]) => {
      const x = cx + (dx + turn * 0.05) * r; const y = cy + dy * r;
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(cr * r)}" fill="${P.land}" opacity="0.85"/><path d="M${f(x - cr * r * 0.8)} ${f(y - cr * r * 0.45)} A${f(cr * r)} ${f(cr * r)} 0 0 1 ${f(x + cr * r * 0.85)} ${f(y - cr * r * 0.2)}" fill="none" stroke="${P.cloud}" stroke-width="${f(Math.max(1.5, r * 0.012))}" opacity="0.7"/>`;
    }).join('');
    surface += `<path d="M${f(cx - r)} ${f(cy - r * 0.05)} Q${f(cx)} ${f(cy - r * 0.2)} ${f(cx + r)} ${f(cy - r * 0.02)}" fill="none" stroke="${P.cloud}" stroke-width="${f(r * 0.06)}" stroke-linecap="round" opacity="0.22"/>`;
  }
  // Close range: detail along the upper limb, foreshortened (cloud arcs; craters squashed toward the edge).
  for (let i = 0; i < 9; i += 1) {
    const a = (-160 + i * 17.5 + rand(57, i) * 8) * (Math.PI / 180);
    const rr = r * (0.84 + rand(58, i) * 0.12);
    const px = cx + Math.cos(a) * rr; const py = cy + Math.sin(a) * rr;
    const deg = (a * 180) / Math.PI + 90;
    if (side === 'Blue') {
      surface += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r * (0.05 + rand(59, i) * 0.06))}" ry="${f(r * 0.012)}" fill="${P.cloud}" opacity="${f(0.35 + rand(60, i) * 0.3)}" transform="rotate(${f(deg)} ${f(px)} ${f(py)})"/>`;
    } else {
      const cr = r * (0.012 + rand(59, i) * 0.026);
      surface += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(cr)}" ry="${f(cr * 0.42)}" fill="${P.land}" opacity="0.85" transform="rotate(${f(deg)} ${f(px)} ${f(py)})"/>`;
    }
  }
  const shade = `<rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(2 * r)}" height="${f(2 * r)}" fill="url(#${id}-dots)" opacity="0.35" mask="none" clip-path="url(#${id}-clip)" style="mix-blend-mode:multiply" transform="translate(${f(r * 0.38)} ${f(r * 0.32)})"/>`;
  const outline = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${INK}" stroke-width="${f(Math.max(3, r / 40))}"/>`;
  const ringBack = P.ring ? `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r * 1.78)}" ry="${f(r * 0.42)}" fill="none" stroke="${P.ring}" stroke-width="${f(r * 0.07)}" opacity="0.8" transform="rotate(-14 ${f(cx)} ${f(cy)})"/>` : '';
  const ringFront = P.ring ? `<path d="M${f(cx - r * 1.72)} ${f(cy + r * 0.41)} A${f(r * 1.78)} ${f(r * 0.42)} -14 0 0 ${f(cx + r * 1.72)} ${f(cy - r * 0.41)}" fill="none" stroke="${P.ring}" stroke-width="${f(r * 0.07)}" stroke-linecap="round"/>`
    + `<path d="M${f(cx - r * 1.72)} ${f(cy + r * 0.41)} A${f(r * 1.78)} ${f(r * 0.42)} -14 0 0 ${f(cx + r * 1.72)} ${f(cy - r * 0.41)}" fill="none" stroke="${INK}" stroke-width="${f(Math.max(2, r / 70))}" stroke-linecap="round" opacity="0.6"/>` : '';
  const moon = side === 'Red' ? `<circle cx="${f(cx + r * 1.32)}" cy="${f(cy - r * 0.9)}" r="${f(r * 0.16)}" fill="#8A5A4E" stroke="${INK}" stroke-width="${f(Math.max(2, r / 70))}"/><circle cx="${f(cx + r * 1.27)}" cy="${f(cy - r * 0.95)}" r="${f(r * 0.05)}" fill="#5E3A32"/>` : '';
  return defs + halo + ringBack + body + `<g clip-path="url(#${id}-clip)">${surface}</g>` + shade + outline + ringFront + moon;
}

/** The arrival's frame values at t on a surface: the planet, the ship, the beam and the fades. */
export function arrivalFrame(t, { surface = 'display', width = 1920, height = 1080 } = {}) {
  const end = FILM.arrival[surface] ?? FILM.arrival.display;
  const k = end / FILM.arrival.display;
  const T = t / k;
  const portrait = height > width;
  const approach = easeInOutCubic(clamp01((T - 250) / 2700));
  const planet = portrait
    ? { cx: lerp(width * 0.66, width * 0.5, approach), cy: lerp(height * 0.62, height * 1.32, approach), r: lerp(width * 0.2, height * 0.62, approach) }
    : { cx: lerp(width * 0.66, width * 0.5, approach), cy: lerp(height * 0.58, height * 1.62, approach), r: lerp(height * 0.15, height * 1.05, approach) };
  const glide = easeOutCubic(clamp01((T - 300) / 2300));
  const descend = easeInOutCubic(clamp01((T - 2400) / 1400));
  const shipH = (portrait ? width * 0.3 : height * 0.2) * lerp(1, 0.62, descend);
  const shipAt = portrait
    ? [lerp(-width * 0.4, width * 0.48, glide), lerp(height * 0.26, height * 0.5, descend)]
    : [lerp(-width * 0.2, width * 0.44, glide), lerp(height * 0.33, height * 0.47, descend)];
  return {
    end,
    fadeIn: clamp01(T / 300),
    planet,
    turn: T / 4000,
    ship: { at: shipAt, height: shipH, engine: lerp(1, 0.3, glide), tilt: lerp(0, 9, descend) },
    beam: clamp01((T - 3000) / 500),
  };
}

/** The arrival at a planet ('Blue' | 'Red') as a full frame; reduced: the final still with a fade. */
export function arrivalSvg(t, side, { surface = 'display', width = 1920, height = 1080, variant = 'full', letterboxed = true } = {}) {
  const prefix = `na${side[0].toLowerCase()}${surface[0]}`;
  const end = filmEnd(`arrival-${side.toLowerCase()}`, surface, variant);
  const F = arrivalFrame(variant === 'reduced' ? FILM.arrival[surface] ?? FILM.arrival.display : t, { surface, width, height });
  // The arrival is the match's last picture: it fades in and holds (reduced: the final still, 160 ms in).
  const opacity = variant === 'reduced' ? clamp01(t / FILM.arrival.fade) : F.fadeIn;
  const P = PLANETS[side];
  const [sx, sy] = F.ship.at;
  const ground = [F.planet.cx, F.planet.cy - F.planet.r];
  const beam = F.beam > 0 ? lightCone(prefix, 'beam', { from: [sx + F.ship.height * 0.2, sy + F.ship.height * 0.3], to: [sx + F.ship.height * 0.6, Math.max(ground[1], sy + F.ship.height * 1.6)], spread: F.ship.height * 0.9, color: P.rim, opacity: 0.62 * F.beam }) : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="navigation-arrival-${side.toLowerCase()}">`
    + fxDefs(prefix) + `<rect width="${width}" height="${height}" fill="${VOID.space}"/>`
    + `<g opacity="${f(opacity)}">`
    + stars({ w: width, h: height, count: Math.round((width * height) / 9000), seed: 61, t, drift: [-t * 0.02, -t * 0.006] })
    + planetSvg(prefix, side, { cx: F.planet.cx, cy: F.planet.cy, r: F.planet.r, turn: F.turn, glow: 1 })
    + beam
    + ship(`${prefix}s`, { x: sx, y: sy, height: F.ship.height, engine: F.ship.engine, tilt: F.ship.tilt })
    + `</g>`
    + vignette(prefix, { width, height, strength: 0.55 }) + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.4"/>`
    + (letterboxed && !(height > width) ? letterbox({ width, height, h: 0.085 * height }) : '')
    + `</svg>`;
  return { svg, frame: F, end };
}

// ── Not ported: the approved posters' frames ───────────────────────

/**
 * The frames of the approved arrival posters, apps/game/candidates/planet-library/arrival-{red,blue}.poster.webp
 * (Integration's approval of 6 November 2026): the runtime insert's posters, rendered by the cinematic stage from
 * arrivalSvg() at 4100 ms of 4200 ms, full variant, on its display surface at 1920 × 1080
 * (design/library/navigation/stage.mjs and design/cinematic/exports/navigation/runtime/arrival-*-insert.render.json
 * on the source branch). The end scene's still is this frame.
 */
export const ARRIVAL_POSTERS = Object.freeze({
  Red: Object.freeze({ t: 4100, surface: 'display', width: 1920, height: 1080, variant: 'full', file: 'arrival-red.poster.webp', sha256: '32f9127d58c31f727d17d9cc57c9d160d40dff4c933145e131a9ce5b0a6ad938' }),
  Blue: Object.freeze({ t: 4100, surface: 'display', width: 1920, height: 1080, variant: 'full', file: 'arrival-blue.poster.webp', sha256: '4ca9e33913cb798ecc8f58345d85f04830c8ac1afb1d5c5ab26114237a2aaf88' }),
});

// mothership:dev-only
//
// Library group 2's public films, as pure functions of t (ms): the neutral transit and the arrival
// at either planet. Built from the cinematic library (design/cinematic/lib/) and the Blackhole
// pilot's ship in profile; registered with the cinematic stage for review renders and exports.
//
// The transit is the same film for every movement: the ship crosses a field of space from left to
// right, never turning, never tinted, the same length whether it advanced, switched arm or left
// Start. It says that the ship moved, not where (P13). It plays as the next round's decisions open,
// so it is drawn behind the crew (design/cinematic/lib/visibility.mjs; the owner's review of
// 6 November 2026): each room's back wall gives way to one shared field of space and the ship passes
// behind every figure, name tag, room label, press area, timer and bar, covering nothing. The
// full-frame insert covers the board: it is for a stage where nobody decides, never over a decision.
//
// The arrival reveals the destination, which is public from that moment (navigation.arrivedAt):
// the camera closes on the planet, the ship slows and descends on its landing beam. The planets
// carry their sides' hues here, and only here; the office panel's glyphs keep the same shapes (the
// Blue Planet ringed, the Red Planet cratered with a moon) in neutral steel.

import { fxDefs, letterbox, lightCone, stars, streaks, vignette } from '../../cinematic/lib/comic.mjs';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, rand } from '../../cinematic/lib/ease.mjs';
import { SHIP, VOID, shipSvg } from '../../cinematic/pilots/blackhole/art.mjs';

export const NAV_FILMS_VERSION = 'library-navigation-films-0.1.0';
export const FILM_CASES = Object.freeze(['transit', 'arrival-blue', 'arrival-red']);
export const VARIANTS = Object.freeze(['full', 'reduced']);

/** Lengths (ms) by case and surface. Reduced: a still, 160 ms in (the transit also 160 ms out; the arrival holds). */
export const FILM = Object.freeze({
  transit: Object.freeze({ display: 2400, phone: 1800, insert: 2400, open: 240, reduced: 1200, fade: 160 }),
  arrival: Object.freeze({ display: 4200, phone: 3400, insert: 4200, reduced: 1200, fade: 160 }),
});
const kindOf = name => (name === 'transit' ? 'transit' : 'arrival');
export const filmEnd = (name, surface, variant = 'full') => (variant === 'reduced' ? FILM[kindOf(name)].reduced : FILM[kindOf(name)][surface]);

const f = v => Number((+v).toFixed(2));
const INK = '#151923';

/** The planets' hues: public at arrival only. */
export const PLANETS = Object.freeze({
  Blue: Object.freeze({ lit: '#8FD0FF', mid: '#2F6FD6', dark: '#0B1F4A', rim: '#A8E4FF', cloud: '#F4FAFF', ring: '#D6ECFF', land: '#2C9C8A' }),
  Red: Object.freeze({ lit: '#FFB07A', mid: '#C8452B', dark: '#3A0E0A', rim: '#FFC08A', cloud: '#FFE2C4', ring: null, land: '#8E2A1A' }),
});

// ---------- the ship ----------

/** The ship in profile at (x, y) (its centre), `height` px tall, nose to the right. */
function ship(prefix, { x, y, height, engine = 1, lights = 1, tilt = 0, opacity = 1 }) {
  const s = height / SHIP.h;
  return `<g opacity="${f(opacity)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(tilt)}) scale(${f(s)}) translate(${f(-SHIP.w / 2)} ${f(-SHIP.h / 2)})">${shipSvg(prefix, { engine, lights })}</g>`;
}

// ---------- the transit ----------

/** Behind the crew: the walls' space in and out (ms), its peak (the rooms' own art always faintly there), the ship's lane (share of the board's height) and the ship's height in it. */
export const TRANSIT_BOARD = Object.freeze({ wallIn: 300, wallOut: 420, peak: 0.85, lane: Object.freeze({ display: 0.3, phone: 0.17 }), ship: 0.56 });

/** The ship's place across its lane at progress v: fast in, a readable slow pass at the middle, fast out. */
const transitX = (v, width) => width * (-0.3 + 1.6 * v + 0.12 * Math.sin(2 * Math.PI * v));

/** The insert's content (space, stars, streaks, the ship) for a box, at t over a film of `end` ms. */
function transitContent(prefix, t, { x, y, w, h, end, still = false, shipRatio = 0.58 }) {
  const v = still ? 0.5 : clamp01(t / end);
  const cy = y + h / 2;
  const height = h * shipRatio;
  const sx = x + transitX(v, w);
  const tail = sx - height * (SHIP.w / SHIP.h) * 0.5;
  const drift = still ? 0 : t;
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${VOID.space}"/>`
    + stars({ x, y, w, h, count: Math.round((w * h) / 5200), seed: 31, t, drift: [-drift * 0.08, 0] })
    + stars({ x, y, w, h, count: Math.round((w * h) / 16000), seed: 37, t, drift: [-drift * 0.34, 0] })
    + (still ? '' : streaks({ x, y: y + h * 0.1, w, h: h * 0.8, count: 22, seed: 41, color: '#CFE2FF', width: 1.6, length: 0.22, opacity: 0.22, phase: (t / 700) % 1 }))
    + (still ? '' : streaks({ x: tail - w * 0.55, y: cy - height * 0.32, w: w * 0.55, h: height * 0.64, count: 16, seed: 43, color: '#E8F4FF', width: 2.6, length: 0.42, opacity: 0.5, phase: (t / 260) % 1 }))
    + ship(`${prefix}s`, { x: sx, y: cy + Math.sin(t / 320) * h * 0.012, height, engine: still ? 0.6 : 1 });
}

/**
 * The transit behind the crew (the default on every surface): one field of space in the board's
 * pixels for the rooms' art layers (layout.board: the rooms' area). The stage puts a copy in each
 * room's art layer at z-index 1 (design/cinematic/lib/stage-kit.mjs artHolders()), each clipped by
 * its room, so the ship is seen crossing the board's middle through every back wall at once, behind
 * every figure, name tag, label, press area and bar. The walls never go fully dark
 * (TRANSIT_BOARD.peak). Reduced: the still field with the ship at the middle, 160 ms in and out.
 * Returns { art, frame }; art is '' while nothing shows.
 */
export function transitBoardArt(t, layout, { surface = 'display', variant = 'full', prefix = 'ntb' } = {}) {
  const board = layout.board ?? { x: 0, y: 0, w: layout.width, h: layout.height };
  const end = filmEnd('transit', surface, variant);
  const still = variant === 'reduced';
  const B = TRANSIT_BOARD;
  const frame = { t, done: t >= end, space: 0, ship: null };
  if (t < 0 || t >= end) return { art: '', frame };
  frame.space = f(B.peak * (still
    ? Math.min(clamp01(t / FILM.transit.fade), clamp01((end - t) / FILM.transit.fade))
    : Math.min(easeOutCubic(clamp01(t / B.wallIn)), easeOutCubic(clamp01((end - t) / B.wallOut)))));
  if (frame.space <= 0) return { art: '', frame };
  const laneH = board.h * (surface === 'phone' ? B.lane.phone : B.lane.display);
  const lane = { x: board.x, y: board.y + board.h / 2 - laneH / 2, w: board.w, h: laneH };
  const v = still ? 0.5 : clamp01(t / end);
  frame.ship = { v: f(v), x: f(lane.x + transitX(v, lane.w)), y: f(lane.y + lane.h / 2), height: f(lane.h * B.ship) };
  const drift = still ? 0 : t;
  const tail = frame.ship.x - frame.ship.height * (SHIP.w / SHIP.h) * 0.5;
  const phone = surface === 'phone';
  const art = `<g opacity="${frame.space}">`
    + `<rect x="${f(board.x)}" y="${f(board.y)}" width="${f(board.w)}" height="${f(board.h)}" fill="${VOID.space}"/>`
    + stars({ x: board.x, y: board.y, w: board.w, h: board.h, count: Math.round((board.w * board.h) / (phone ? 2600 : 5200)), seed: 31, t, drift: [-drift * 0.08, 0] })
    + stars({ x: board.x, y: board.y, w: board.w, h: board.h, count: Math.round((board.w * board.h) / (phone ? 8000 : 16000)), seed: 37, t, drift: [-drift * 0.34, 0] })
    + (still ? '' : streaks({ x: lane.x, y: lane.y - lane.h * 0.4, w: lane.w, h: lane.h * 1.8, count: 26, seed: 41, color: '#CFE2FF', width: phone ? 1.2 : 1.6, length: 0.22, opacity: 0.22, phase: (t / 700) % 1 }))
    + (still ? '' : streaks({ x: tail - lane.w * 0.55, y: frame.ship.y - frame.ship.height * 0.32, w: lane.w * 0.55, h: frame.ship.height * 0.64, count: 16, seed: 43, color: '#E8F4FF', width: phone ? 1.6 : 2.6, length: 0.42, opacity: 0.5, phase: (t / 260) % 1 }))
    + ship(`${prefix}s`, { x: frame.ship.x, y: frame.ship.y + Math.sin(t / 320) * lane.h * 0.012, height: frame.ship.height, engine: still ? 0.6 : 1 })
    + `</g>`;
  return { art, frame };
}

/** The transit as a full-frame insert (no board): the field of space letterboxed, for a video; it covers, so never over a decision. */
export function transitInsert(t, { width = 1920, height = 1080, variant = 'full' } = {}) {
  const prefix = 'nti';
  const end = filmEnd('transit', 'insert', variant);
  const fade = variant === 'reduced' ? Math.min(clamp01(t / FILM.transit.fade), clamp01((end - t) / FILM.transit.fade)) : Math.min(clamp01(t / 200), clamp01((end - t) / 200));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="navigation-transit-insert">`
    + fxDefs(prefix) + `<rect width="${width}" height="${height}" fill="${VOID.space}"/>`
    + transitContent(prefix, t, { x: 0, y: 0, w: width, h: height, end, still: variant === 'reduced', shipRatio: 0.24 })
    + vignette(prefix, { width, height, strength: 0.55 }) + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.4"/>`
    + letterbox({ width, height, h: 0.085 * height })
    + `<rect width="${width}" height="${height}" fill="${VOID.space}" opacity="${f(1 - fade)}"/>`
    + `</svg>`;
  return { svg, end };
}

// ---------- the planets ----------

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

// ---------- the arrival ----------

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

/**
 * The public cue sheets (procedural cues from design/cinematic/lib/audio.mjs, rendered by
 * cinematic-audio.mjs): an engine hum and a pass for the transit, the same every movement; a swell,
 * a pass and one sting for the arrival, the same at either planet. Public screens only.
 */
export const AUDIO = Object.freeze({
  transit: Object.freeze([{ at: 0, cue: 'drone-hum', until: FILM.transit.display, gain: 0.7 }, { at: 650, cue: 'pass-whoosh', gain: 0.6 }]),
  'transit-short': Object.freeze([{ at: 0, cue: 'drone-hum', until: FILM.transit.phone, gain: 0.7 }, { at: 450, cue: 'pass-whoosh', gain: 0.6 }]),
  arrival: Object.freeze([{ at: 0, cue: 'void-rumble', until: FILM.arrival.display, gain: 0.5 }, { at: 500, cue: 'pass-whoosh', gain: 0.45 }, { at: 2500, cue: 'reveal-sting' }]),
  'arrival-short': Object.freeze([{ at: 0, cue: 'void-rumble', until: FILM.arrival.phone, gain: 0.5 }, { at: 400, cue: 'pass-whoosh', gain: 0.45 }, { at: 2000, cue: 'reveal-sting' }]),
  reduced: Object.freeze([{ at: 0, cue: 'reveal-sting', gain: 0.5 }]),
});

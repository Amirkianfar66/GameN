// The ship travel's drawing: runtime source, Designer's. The approved transit's drawing, ported unchanged
// (the Lead Designer's review of #269, 15 November 2026), so the film can draw any moment of its 15 s.
//
// Provenance:
// - Ported from claude/designer-library-navigation at 6b63560d990c50dd1d16e44e6f40f5b7b77b6b68. Its files below are
//   byte-identical (the same git blobs) to PR #184's head 0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878, the head whose
//   named assets Integration approved: docs/integration/planet-library-art-approval-2026-11-06.json, the neutral
//   transit (transit.mp4 6e338df5…, transit.poster.webp cd2ee842…).
// - design/cinematic/pilots/blackhole/art.mjs (blob 9708f4f2fcdf): VOID, SHIP and shipSvg, the ship in profile.
// - design/library/navigation/films.mjs (blob 55f600b6556d): FILM, kindOf, filmEnd, ship, transitX, transitContent
//   and transitInsert, the transit's composition. Its planets, their hues and the arrival are not ported.
// - design/cinematic/lib/comic.mjs (blob 934244497920): INK, PAPER, f, fxDefs, streaks, letterbox, vignette and stars.
// - design/cinematic/lib/ease.mjs (blob c587a203dc18): clamp01, lerp, easeOutCubic, hash and rand.
// - design/board-v2/fx/captain.mjs (blob 4822f0eaed41) and medical.mjs (blob 306841d488af): the four colours
//   shipSvg reads, with the same values.
// Each function is its source's text, character for character; only `export` is added to the module-private ones.
// packages/design-tokens/test/ship-travel.test.mjs checks each function's SHA-256 against its source's and that
// transitInsert(1200) writes the approved poster's frame byte for byte; design/tools/ship-travel-check.mjs compares
// the component's still with the approved poster's pixels.
//
// The sources are development code, marked so. This file is their runtime derivative, new with the ship travel. The
// drawing-port fence scans only apps/ and packages/presentation, so Integration reviews this file when it admits the
// component's module graph. Nothing here draws a game fact: no planet, route, arm, side or destination.

// ── Ported unchanged: design/cinematic/lib/ease.mjs ───────────────

export const clamp01 = v => Math.max(0, Math.min(1, v));
export const lerp = (a, b, v) => a + (b - a) * v;
export const easeOutCubic = v => 1 - (1 - v) ** 3;

/** A deterministic 32-bit hash of any number of numbers and strings. */
export function hash(...parts) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x9e3779b9; h = Math.imul(h, 2246822519) >>> 0;
  }
  return h >>> 0;
}
/** A deterministic number in [0, 1) for its inputs. */
export const rand = (...parts) => hash(...parts) / 4294967296;

// ── Ported unchanged: design/cinematic/lib/comic.mjs ──────────────

export const INK = '#151923';
export const PAPER = '#F4EBDD';
export const f = v => Number((+v).toFixed(2));

/**
 * The filters and patterns the effects reference, under `prefix` so two films on one page never
 * share an id. Bloom (two blur radii), grain, a horizontal motion blur, a halftone dot screen and
 * a gravitational-lens displacement driven by `lens` (0 for none).
 */
export function fxDefs(prefix, { lens = 0, seed = 7 } = {}) {
  return `<defs>`
    + `<filter id="${prefix}-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`
    + `<filter id="${prefix}-bloom-wide" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18"/></filter>`
    + `<filter id="${prefix}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `<filter id="${prefix}-mblur" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="9 0.6"/></filter>`
    + `<filter id="${prefix}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0.09 0"/></filter>`
    + `<filter id="${prefix}-lens" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f(lens)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    + `<pattern id="${prefix}-dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="3.5" cy="3.5" r="1.45" fill="${INK}"/></pattern>`
    + `<pattern id="${prefix}-dots-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><circle cx="3.5" cy="3.5" r="1.3" fill="${PAPER}"/></pattern>`
    + `</defs>`;
}

/** Parallel motion streaks along `angle` (degrees) over a box: a passage's rush. */
export function streaks({ x, y, w, h, angle = 0, count = 24, seed = 5, color = '#FFFFFF', width = 2, length = 0.4, opacity = 0.6, phase = 0 }) {
  if (opacity <= 0) return '';
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const yy = y + rand(seed, i) * h;
    const len = w * length * (0.4 + rand(seed, i, 'l') * 0.6);
    const xx = x + (((rand(seed, i, 'x') + phase) % 1) * (w + len)) - len;
    d += `M${f(xx)} ${f(yy)}h${f(len)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" opacity="${f(opacity)}" transform="rotate(${f(angle)} ${f(x + w / 2)} ${f(y + h / 2)})"/>`;
}

/** Letterbox bars of `h` px at the top and bottom of a `width` x `height` frame. */
export const letterbox = ({ width, height, h, color = '#05070B' }) => (h > 0
  ? `<rect x="0" y="0" width="${width}" height="${f(h)}" fill="${color}"/><rect x="0" y="${f(height - h)}" width="${width}" height="${f(h)}" fill="${color}"/>` : '');

/** A darkening vignette over a frame. */
export function vignette(prefix, { width, height, strength = 0.6, color = '#05070B' }) {
  const g = `${prefix}-vignette`;
  return `<defs><radialGradient id="${g}" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="${f(strength)}"/></radialGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#${g})"/>`;
}

/** A deterministic starfield in a box: `count` stars of a few sizes, twinkling with t. */
export function stars({ x = 0, y = 0, w, h, count = 140, seed = 11, t = 0, drift = [0, 0] }) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const sx = x + (((rand(seed, i, 'x') * w + drift[0] * (0.3 + rand(seed, i, 'z'))) % w) + w) % w;
    const sy = y + (((rand(seed, i, 'y') * h + drift[1] * (0.3 + rand(seed, i, 'z'))) % h) + h) % h;
    const r = rand(seed, i, 'r') < 0.85 ? 1 : rand(seed, i, 'r') < 0.97 ? 1.8 : 2.8;
    const tw = 0.55 + 0.45 * Math.sin(t / (300 + rand(seed, i, 'p') * 900) + rand(seed, i) * 6.28);
    out += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${r}" fill="${r > 2 ? '#FFF3C4' : '#E9F4FF'}" opacity="${f(tw)}"/>`;
  }
  return out;
}

// ── The four colours shipSvg reads, the same values as design/board-v2/fx/captain.mjs and medical.mjs ──

const CAPTAIN = Object.freeze({ hull: '#4A5568', hullLight: '#8A97AB' });
const MEDICAL = Object.freeze({ cyan: '#5FE0E8', yellow: '#F7C52B' });

// ── Ported unchanged: design/cinematic/pilots/blackhole/art.mjs ───

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

// ── Ported unchanged: design/library/navigation/films.mjs (the transit only) ──

/** Lengths (ms) by case and surface. Reduced: a still, 160 ms in (the transit also 160 ms out; the arrival holds). */
export const FILM = Object.freeze({
  transit: Object.freeze({ display: 2400, phone: 1800, insert: 2400, open: 240, reduced: 1200, fade: 160 }),
  arrival: Object.freeze({ display: 4200, phone: 3400, insert: 4200, reduced: 1200, fade: 160 }),
});
export const kindOf = name => (name === 'transit' ? 'transit' : 'arrival');
export const filmEnd = (name, surface, variant = 'full') => (variant === 'reduced' ? FILM[kindOf(name)].reduced : FILM[kindOf(name)][surface]);

/** The ship in profile at (x, y) (its centre), `height` px tall, nose to the right. */
export function ship(prefix, { x, y, height, engine = 1, lights = 1, tilt = 0, opacity = 1 }) {
  const s = height / SHIP.h;
  return `<g opacity="${f(opacity)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(tilt)}) scale(${f(s)}) translate(${f(-SHIP.w / 2)} ${f(-SHIP.h / 2)})">${shipSvg(prefix, { engine, lights })}</g>`;
}

/** The ship's place across its lane at progress v: fast in, a readable slow pass at the middle, fast out. */
export const transitX = (v, width) => width * (-0.3 + 1.6 * v + 0.12 * Math.sin(2 * Math.PI * v));

/** The insert's content (space, stars, streaks, the ship) for a box, at t over a film of `end` ms. */
export function transitContent(prefix, t, { x, y, w, h, end, still = false, shipRatio = 0.58 }) {
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

// ── Not ported: the approved poster's frame ─────────────────────────

/**
 * The frame of the approved transit poster, apps/game/candidates/planet-library/transit.poster.webp (Integration's
 * approval of 6 November 2026, sha256 cd2ee842…): the runtime insert's poster, rendered from transitInsert() at
 * 1200 ms of its 2400 ms, full variant, 1920 × 1080 (design/cinematic/exports/navigation/runtime/
 * transit-insert.render.json on the source branch). The ship travel's still is this frame.
 */
export const TRANSIT_POSTER = Object.freeze({ t: 1200, width: 1920, height: 1080, variant: 'full', sha256: 'cd2ee84274ed955176005b4ed0bb44c353e26cf3f5585b5ff1ce515c8903daa2' });

// The brand intro, version 2: runtime source, Designer's. The two seconds a player sees on the app's first entry:
// black, a cursor, "Game N" typed, then "by Plan B" (the owner, 8 November 2026: "something simple with typing motion
// graphic effect"), made again for the owner's word of 15 November 2026 ("more like AAA animation cinematic").
// Every time of today's film (pregame-films/brand/brand.mjs) is kept, and its layout and its black. What is new is
// how a key lands and how the film ends:
//
//   0-60 ms        black
//   60             the cursor appears: solid for a moment after it arrives and after each key, blinking while it waits
//   220-610        "Game N": six keys at today's uneven, hand-typed times. Each letter comes down to the page and
//                  lands: a jolt of a pixel through the frame, a moment of light on the letter, a fleck of its ink
//                  thrown from each side of its foot, and its shade parting from it as it settles
//   860            the cursor drops a line
//   900-1,275      "by Plan B": nine keys at today's times, struck lighter (less jolt and light, no flecks)
//   1,330-1,590    one sheen crosses the finished name: a light passing, not a flash
//   1,700-1,950    the boarding film's ink closes over the name (mark.mjs paintTide, blot for blot)
//   1,960-2,000    black
//
// Reduce motion (the game's or the device's) is today's: both lines whole, in over 200 ms, held, out from 1,700 to
// 1,960 ms. No typing, cursor, jolt, fleck, sheen or ink.
//
// `paint(t)` draws the film at `t` ms; the player's own clock gives it, as today. Nothing here advances anything, and
// the film's end means nothing. Between two paints the scene keeps the picture moving from the last time it was
// given, at the screen's rate; it stops by itself when the paints stop. It has no input but the time, the size and
// the variant: it reads no match, player, role or roster.
//
// How it plays: each letter is drawn once from its own strokes, straight onto a canvas, inside the first paint (no
// SVG is made into a picture, so nothing is waited for), and a frame places those pictures. The film's canvas is only
// as large as the two lines and the room their light needs; the black round it is the element's own.

import { GLYPHS } from '../../../../apps/game/hosted/pregame-films/kit/letters.mjs';
import { clamp, clamp01, ease, envelope, hash, lerp, progress, shake } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { createLight, drawn, glow, rgba, silhouette } from '../boarding-film/engine.mjs';
import { paintTide } from '../boarding-film/mark.mjs';

export const BRAND_FILM_VERSION = 'pregame-brand-2.0.0';
export const BRAND_MS = 2000;
export const BRAND = Object.freeze({ name: 'Game N', credit: 'by Plan B' });
/** The film's words for a screen reader: the player says them, as today. */
export const BRAND_TEXT = 'Game N, by Plan B';
export const VARIANTS = Object.freeze(['full', 'reduced']);
/** The black the intro is played on, and ends on: today's, as the owner asked. */
export const NIGHT = '#000000';

/** When each character is typed (ms): today's times, uneven as a hand types; the credit quicker than the name. */
export const TYPING = Object.freeze({
  name: Object.freeze([220, 300, 372, 452, 545, 610]),
  credit: Object.freeze([900, 946, 990, 1046, 1090, 1132, 1178, 1232, 1275]),
});
/** The film's beats. `cursorOn`, `lineBreak` and `night` are today's; the sheen and the ink are new. */
export const BEATS = Object.freeze({ cursorOn: 60, lineBreak: 860, sheen: Object.freeze([1330, 1590]), ink: Object.freeze([1700, 1950]), night: 1960 });
/** Reduce motion: the held picture comes in and goes out on today's fades. */
export const STILL = Object.freeze({ in: Object.freeze([0, 200]), out: Object.freeze([1700, 1960]) });
/** The cursor: a blink's length, and how long after a key it stays solid. Today's. */
export const BLINK_MS = 530;
export const TYPING_HOLD_MS = 160;
/**
 * A key's strike, in ms from its key: the letter comes down to the page over `fall` and has settled by `settle`; its
 * shade parts from it over `shade`; the light on it dies over `hot`; its flecks live between the two times of `fleck`.
 */
export const STRIKE = Object.freeze({ fall: 64, settle: 150, jolt: 110, shade: Object.freeze([40, 190]), hot: Object.freeze([64, 180]), light: 260, fleck: Object.freeze([150, 260]) });
/** With no paint for this long the scene stops asking for frames (the player has stopped, the page is hidden). */
export const COAST_MS = 500;

const TRACKING = 1.25;
// What each line is drawn in: its face from a letter's top to its foot (a light from above), the shade it shows once
// it has landed, how hard its keys strike and how many flecks one throws.
const LINES = Object.freeze({
  name: Object.freeze({ weight: 0.78, face: Object.freeze(['#FFFFFF', '#F4F1EA', '#D9D4C9']), shade: '#474138', strike: 1, flecks: 2 }),
  credit: Object.freeze({ weight: 0.95, face: Object.freeze(['#D4CEC2', '#B9B2A5', '#9E988C']), shade: '#37322C', strike: 0.45, flecks: 0 }),
});
const CURSOR = '#F2C14E';
const SHADE = 0.15;   // how far a landed letter's shade lies from it, in its own grid's units, down and to the right
const GLOW = 0.36;    // how strong a letter's own glow is at rest
const MARGIN = 1.4;   // the room round the two lines for light and flecks, in cap heights
const LOW = 7.8;      // how far below a line's top its lowest stroke goes, in grid units (the y's tail)

const glyphOf = ch => GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];

/** A line's characters: each one's grid x (from the line's left), its advance and its strokes. */
function lineOf(text) {
  let x = 0;
  return [...text].map(ch => {
    const [advance, lines] = glyphOf(ch);
    const out = { ch, x, advance, lines };
    x += advance + TRACKING;
    return out;
  });
}
const widthOf = chars => (chars.length ? chars.at(-1).x + chars.at(-1).advance : 0);

/** The two lines' sizes and places on a W x H surface, as today's film lays them: one block, left-aligned, centred. */
export function layout(W, H) {
  const name = lineOf(BRAND.name), credit = lineOf(BRAND.credit);
  const cap = Math.min((W * 0.62) / (widthOf(name) / 6), H * 0.12);
  const k1 = cap / 6, k2 = (cap * 0.4) / 6;
  const w = Math.max(widthOf(name) * k1, widthOf(credit) * k2);
  const x0 = W / 2 - w / 2;
  const blockH = cap + cap * 0.55 + cap * 0.4;
  const y1 = H / 2 - blockH / 2;
  return { name, credit, k1, k2, x0, y1, y2: y1 + cap + cap * 0.55, cap, w, blockH };
}

/**
 * The moment `t` of the film: how much of each line is typed, where the cursor is and whether it shows, how far the
 * sheen and the ink have gone. A pure function of the time it is given.
 */
export function brandFrame(t, { variant = 'full' } = {}) {
  const time = clamp(Number.isFinite(t) ? t : 0, 0, BRAND_MS), reduced = variant === 'reduced', night = time >= BEATS.night;
  if (reduced) return { t: time, reduced, night, name: BRAND.name.length, credit: BRAND.credit.length, cursor: null, sheen: 0, ink: 0, fade: envelope(time, STILL.in[0], STILL.in[1], STILL.out[0], STILL.out[1]) };
  const name = TYPING.name.filter(at => time >= at).length, credit = TYPING.credit.filter(at => time >= at).length;
  let cursor = null;
  if (time >= BEATS.cursorOn && !night) {
    // Solid for a moment after it arrives on a line and after each key, blinking while it waits; on the line being typed.
    const onCredit = time >= BEATS.lineBreak, typed = onCredit ? credit : name, times = onCredit ? TYPING.credit : TYPING.name;
    const length = (onCredit ? BRAND.credit : BRAND.name).length, arrived = onCredit ? BEATS.lineBreak : BEATS.cursorOn;
    const lastKey = typed ? times[typed - 1] : arrived;
    const solid = typed < length && time - lastKey < TYPING_HOLD_MS;
    cursor = { line: onCredit ? 'credit' : 'name', after: typed, solid, visible: solid || Math.floor((time - Math.max(lastKey, arrived)) / (BLINK_MS / 2)) % 2 === 0 };
  }
  return { t: time, reduced, night, name, credit, cursor, sheen: progress(time, ...BEATS.sheen), ink: progress(time, ...BEATS.ink), fade: 1 };
}

/** Where the cursor stands on a W x H surface at a moment of the film: `[x, y, width, height]` in px. Today's place. */
export function cursorBox(film, L) {
  if (!film.cursor) return null;
  const onCredit = film.cursor.line === 'credit', chars = onCredit ? L.credit : L.name, k = onCredit ? L.k2 : L.k1, y0 = onCredit ? L.y2 : L.y1, typed = film.cursor.after;
  const x = L.x0 + (typed ? chars[typed - 1].x + chars[typed - 1].advance + TRACKING * 0.55 : -TRACKING * 0.2) * k;
  return [x, y0 - 0.5 * k, 0.95 * k, 7 * k];
}

// ── The pictures: drawn once ────────────────────────────────────────

const trace = (ctx, lines) => { ctx.beginPath(); for (const line of lines) line.forEach(([u, v], i) => (i ? ctx.lineTo(u, v) : ctx.moveTo(u, v))); };

/**
 * One letter's pictures, made on the spot from its strokes: its face, its shade, itself in white (the light on it)
 * and its glow. `unit` is the frame's px to one unit of the letter's grid; (`restX`, `restY`) where its grid's origin
 * rests in the frame. The first three lie on the frame's own pixels, so a letter at rest is laid without resampling.
 */
function letterPictures(doc, c, line, unit, restX, restY) {
  const pad = line.weight / 2 + 0.3;
  const left = restX - pad * unit, top = restY - pad * unit, X = Math.floor(left), Y = Math.floor(top);
  const width = Math.ceil((c.advance + pad * 2) * unit + (left - X)) + 1, height = Math.ceil((LOW + pad * 2) * unit + (top - Y)) + 1;
  const face = drawn(doc, [-pad - (left - X) / unit, -pad - (top - Y) / unit, width / unit, height / unit], unit, ctx => {
    const light = ctx.createLinearGradient(0, 0, 0, 6);
    line.face.forEach((color, i) => light.addColorStop(i / (line.face.length - 1), color));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = light; ctx.lineWidth = line.weight;
    trace(ctx, c.lines); ctx.stroke();
    // The light's edge: a thin line of it along each stroke's upper left.
    ctx.translate(-line.weight * 0.13, -line.weight * 0.13);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = line.weight * 0.26;
    trace(ctx, c.lines); ctx.stroke();
  });
  // Its glow: the strokes again, wider and fainter each time, drawn small. The light's layer stretches it soft.
  const room = pad + 3.4, gx = restX - room * unit, gy = restY - room * unit, gw = (c.advance + room * 2) * unit, gh = (LOW + room * 2) * unit;
  const halo = drawn(doc, [-room, -room, c.advance + room * 2, LOW + room * 2], Math.max(0.5, unit / 4), ctx => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = line.face[1];
    for (const [extra, alpha] of [[5.4, 0.022], [4.4, 0.028], [3.5, 0.036], [2.7, 0.048], [2, 0.064], [1.4, 0.085], [0.9, 0.11], [0.45, 0.14], [0.1, 0.17]]) {
      ctx.globalAlpha = alpha; ctx.lineWidth = line.weight + extra;
      trace(ctx, c.lines); ctx.stroke();
    }
  });
  return {
    face: face.canvas, shade: silhouette(doc, face, line.shade).canvas, hot: silhouette(doc, face, '#FFFFFF').canvas, halo: halo.canvas,
    X, Y, width, height, glow: [gx, gy, gw, gh],
    // What it turns about as it comes down, and where its foot is.
    cx: restX + c.advance * unit / 2, cy: restY + 3 * unit, foot: [restX, restY + 6 * unit, c.advance * unit],
  };
}

const INK_STEPS = 5;

/**
 * Where the ink's tide stands when it first touches a box of the frame, and when it has covered it: the tide itself
 * is asked, drawn small. Black ink on black shows nothing until it reaches the name, so the film plays only that part.
 * Asking takes ten small drawings of the tide, so it is done a `step()` at a time, on frames where nothing moves but
 * the cursor; `window()` gives the answer, finishing the search first if the film has reached the ink without it.
 */
function inkSearch(doc, full, [bx, by, bw, bh]) {
  const scale = Math.min(1, 240 / Math.max(full.W, full.H));
  const canvas = doc.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(full.W * scale)); canvas.height = Math.max(1, Math.ceil(full.H * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const x = Math.max(0, Math.floor(bx * scale)), y = Math.max(0, Math.floor(by * scale));
  const w = Math.max(1, Math.min(canvas.width - x, Math.ceil(bw * scale))), h = Math.max(1, Math.min(canvas.height - y, Math.ceil(bh * scale)));
  /** The least and the most ink in the box with the tide at `v`. */
  const read = v => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paintTide(ctx, full, v);
    const data = ctx.getImageData(x, y, w, h).data;
    let least = 255, most = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < least) least = data[i]; if (data[i] > most) most = data[i]; }
    return { least, most };
  };
  // Halving, five times each: `from` is a tide that still leaves the box untouched, `to` one that has covered it.
  let from = 0, touched = 1, short = 0, to = 1, left = INK_STEPS * 2;
  const step = () => {
    if (!left) return;
    if (left > INK_STEPS) { const mid = (from + touched) / 2; if (read(mid).most > 0) touched = mid; else from = mid; if (left === INK_STEPS + 1) short = from; }
    else { const mid = (short + to) / 2; if (read(mid).least >= 255) to = mid; else short = mid; }
    left -= 1;
    if (!left) { canvas.width = 0; canvas.height = 0; }
  };
  return { step, done: () => left === 0, window() { while (left) step(); return [from, to]; }, dispose() { left = 0; canvas.width = 0; canvas.height = 0; } };
}

/** Whether a letter is landing at `t`, the sheen is passing or the ink has begun: a frame that must not be kept waiting. */
const moving = t => t >= BEATS.ink[0] || (t > BEATS.sheen[0] - 20 && t < BEATS.sheen[1]) || [...TYPING.name, ...TYPING.credit].some(key => t > key - 20 && t < key + STRIKE.settle);

// ── The scene ────────────────────────────────────────────────────────

/**
 * The brand intro in `holder`, as the pre-game player's scene: `paint(t, { width, height, variant })` draws the film
 * at `t` ms, and `dispose()` ends it. Nothing is read from `options`. `live: false` draws only when painted (a
 * recording, a test): the scene then never asks for a frame of its own.
 */
export function createBrandScene(holder, { options = {}, live = true } = {}) {
  void options;
  const doc = holder.ownerDocument, win = doc.defaultView;
  const root = doc.createElement('div'), canvas = doc.createElement('canvas'), work = doc.createElement('canvas'), light = createLight(doc);
  root.className = 'ms-brand-film'; root.setAttribute('aria-hidden', 'true');
  canvas.className = 'ms-brf-ink'; light.canvas.className = 'ms-brf-light';
  root.append(canvas, light.canvas);
  holder.append(root);
  const ctx = canvas.getContext('2d'), wx = work.getContext('2d');
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  // `quality` is always 1: the frame is drawn at the screen's own pixels (three a point at most), and `scale` says how many.
  const stats = { version: BRAND_FILM_VERSION, paints: 0, frames: 0, ownFrames: 0, drawMs: 0, worstMs: 0, pictures: 0, bytes: 0, bakeMs: 0, scale: 1, quality: 1 };
  let made = null, box = null, variant = 'full', disposed = false, suspended = false, raf = null;
  let anchor = null; // { t, at }: the last time given, and when (the page's clock)
  let shown = { variant: null, box: [0, 0] };

  const free = () => { made?.ink.dispose(); for (const l of made?.letters ?? []) for (const picture of [l.face, l.shade, l.hot, l.halo]) { picture.width = 0; picture.height = 0; } made = null; };

  /** Everything drawn once for the holder's size: the film's own box of it, and the letters. */
  function make() {
    const started = win.performance.now();
    const [width, height] = box, px = Math.min(3, Math.max(1, win.devicePixelRatio || 1));
    const L = layout(width, height), margin = L.cap * MARGIN;
    // The film's box of the surface: the two lines and the room their light needs, on the frame's own pixels.
    const bx = Math.floor((L.x0 - margin) * px) / px, by = Math.floor((L.y1 - margin) * px) / px;
    const W = Math.ceil((L.w + margin * 2) * px) + 1, H = Math.ceil((L.blockH + margin * 2) * px) + 1;
    canvas.width = W; canvas.height = H;
    for (const layer of [canvas, light.canvas]) { layer.style.left = `${bx}px`; layer.style.top = `${by}px`; layer.style.width = `${W / px}px`; layer.style.height = `${H / px}px`; }
    const letters = [];
    for (const [id, chars, k, y0] of [['name', L.name, L.k1, L.y1], ['credit', L.credit, L.k2, L.y2]]) {
      chars.forEach((c, i) => {
        if (!c.lines.length) return;
        letters.push({ id, key: TYPING[id][i], line: LINES[id], unit: k * px, ...letterPictures(doc, c, LINES[id], k * px, (L.x0 + c.x * k - bx) * px, (y0 - by) * px) });
      });
    }
    // The name's own box of the frame (the sheen is made in it), and the box the ink has to reach and cover.
    const names = letters.filter(l => l.id === 'name');
    const nx = Math.min(...names.map(l => l.X)), ny = Math.min(...names.map(l => l.Y));
    const name = [nx, ny, Math.max(...names.map(l => l.X + l.width)) - nx, Math.max(...names.map(l => l.Y + l.height)) - ny];
    work.width = W; work.height = H;
    // The whole surface, for the ink: its blots are laid from the surface's own edges.
    const full = { W: Math.round(width * px), H: Math.round(height * px), Path: win.Path2D };
    const reach = L.cap * 0.3 * px, ox = bx * px, oy = by * px;
    const tide = inkSearch(doc, full, [L.x0 * px - reach, L.y1 * px - reach, L.w * px + reach * 2, (L.blockH + L.cap * 0.13) * px + reach * 2]);
    stats.scale = px;
    stats.pictures = letters.length * 4;
    stats.bytes = letters.reduce((sum, l) => sum + (l.width * l.height * 3 + l.halo.width * l.halo.height) * 4, 0);
    stats.bakeMs = win.performance.now() - started;
    return { L, px, W, H, bx, by, ox, oy, letters, names, name, full, ink: tide, view: { W, H } };
  }

  function size(width, height) {
    if (box && box[0] === width && box[1] === height && made) return;
    box = [width, height];
    root.style.width = `${width}px`; root.style.height = `${height}px`;
    free();
    made = make();
  }

  /** A landed letter, at rest: its shade, then its face, each on the frame's own pixels. */
  function rest(l, alpha) {
    const d = Math.round(SHADE * l.unit);
    ctx.globalAlpha = alpha;
    ctx.drawImage(l.shade, l.X + d, l.Y + d);
    ctx.drawImage(l.face, l.X, l.Y);
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    const started = win.performance.now();
    const film = brandFrame(t, { variant }), m = made, L = light.ctx;
    // A frame leaves nothing behind it on either canvas: the next is drawn from a clean state.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, m.W, m.H);
    light.begin(m.view);
    L.save();
    if (!film.night && film.reduced) {
      // Reduce motion: both lines whole and at rest, with their glow; the picture comes and goes as one.
      for (const l of m.letters) rest(l, film.fade);
      L.globalAlpha = GLOW * film.fade;
      for (const l of m.letters) L.drawImage(l.halo, ...l.glow);
    } else if (!film.night) {
      // A key's jolt through the frame: a pixel for the name's keys, under half of one for the credit's.
      let jx = 0, jy = 0;
      for (const id of ['name', 'credit']) for (const key of TYPING[id]) {
        const [sx, sy] = shake(t, key + STRIKE.fall, { amp: LINES[id].strike * m.px, ms: STRIKE.jolt, seed: key });
        jx += sx; jy += sy;
      }
      ctx.translate(jx, jy); L.translate(jx, jy);
      for (const l of m.letters) {
        const age = t - l.key;
        if (age < 0) continue;
        const power = l.line.strike, on = clamp01(age / 24);
        if (age >= STRIKE.light) { rest(l, 1); L.globalAlpha = GLOW; L.drawImage(l.halo, ...l.glow); L.globalAlpha = 1; continue; }
        // It comes down to the page (larger: from above the lens), lands at `fall`, and gives a little before it rests.
        const fall = progress(age, 0, STRIKE.fall), settle = progress(age, STRIKE.fall, STRIKE.settle);
        const give = settle > 0 && settle < 1 ? Math.sin(Math.PI * settle) * (1 - settle) : 0;
        const s = 1 + 0.2 * power * (1 - fall * fall) - 0.035 * power * give;
        const part = SHADE * l.unit * ease.outCubic(progress(age, ...STRIKE.shade));
        const hot = age < STRIKE.hot[0] ? 0.3 * fall : 0.85 * power * (1 - ease.outCubic(progress(age, ...STRIKE.hot)));
        const lay = (picture, d, alpha) => {
          if (alpha <= 0) return;
          ctx.globalAlpha = alpha;
          if (s === 1) ctx.drawImage(picture, l.X + Math.round(d), l.Y + Math.round(d));
          else ctx.drawImage(picture, l.cx - (l.cx - l.X) * s + d, l.cy - (l.cy - l.Y) * s + d, l.width * s, l.height * s);
        };
        lay(l.shade, part, on * progress(age, STRIKE.shade[0], STRIKE.shade[0] + 40));
        lay(l.face, 0, on);
        lay(l.hot, 0, hot * on);
        ctx.globalAlpha = 1;
        // Its own glow, brighter while the strike's light is on it; and that light on the page round it.
        const [gx, gy, gw, gh] = l.glow;
        L.globalAlpha = Math.min(1, (GLOW + 0.5 * hot) * on);
        L.drawImage(l.halo, l.cx - (l.cx - gx) * s, l.cy - (l.cy - gy) * s, gw * s, gh * s);
        L.globalAlpha = 1;
        if (age >= STRIKE.fall) glow(L, l.cx, l.cy + 1.5 * l.unit, 7.5 * l.unit * (0.7 + 0.3 * power), '#FFE7BF', 0.4 * power * (1 - ease.outCubic(progress(age, STRIKE.fall, STRIKE.light))), { sy: 0.8 });
        // Flecks of its ink, one thrown out from each side of its foot as it lands, and falling.
        const since = age - STRIKE.fall;
        for (let j = 0; j < l.line.flecks && since >= 0; j += 1) {
          const life = lerp(STRIKE.fleck[0], STRIKE.fleck[1], hash(j, l.key));
          if (since > life) continue;
          const [fx, fy, fw] = l.foot, side = j % 2 ? 1 : -1;
          const lean = side * lerp(0.6, 1.1, hash(j, l.key + 2)), speed = lerp(0.014, 0.024, hash(j, l.key + 3)) * l.unit;
          const x = fx + fw / 2 + side * (fw / 2 + 0.5 * l.unit) + Math.sin(lean) * speed * since;
          const y = fy - 0.3 * l.unit - Math.cos(lean) * speed * since + 0.5 * 0.00022 * l.unit * since * since;
          ctx.fillStyle = rgba(l.line.face[0], (1 - since / life) ** 1.1);
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, lerp(0.09, 0.16, hash(j, l.key + 5)) * l.unit * (1 - 0.4 * since / life)), 0, Math.PI * 2); ctx.fill();
        }
      }
      // The cursor, with its own light round it.
      const cursor = film.cursor?.visible ? cursorBox(film, m.L) : null;
      if (cursor) {
        const x = (cursor[0] - m.bx) * m.px, y = (cursor[1] - m.by) * m.px, w = cursor[2] * m.px, h = cursor[3] * m.px;
        ctx.fillStyle = CURSOR;
        ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.round(h));
        glow(L, x + w / 2, y + h / 2, h * 1.5, CURSOR, 0.28, { sx: 0.6 });
      }
      // One sheen across the finished name: a band of light passing over the letters' faces, low, and its light round them.
      if (film.sheen > 0 && film.sheen < 1) {
        const [nx, ny, nw, nh] = m.name, band = nw * 0.3, at = nx + lerp(-band, nw + band, ease.inOutCubic(film.sheen)), slant = -0.42;
        wx.save();
        wx.setTransform(1, 0, 0, 1, 0, 0);
        wx.globalCompositeOperation = 'source-over'; wx.globalAlpha = 1;
        wx.beginPath(); wx.rect(nx, ny, nw, nh); wx.clip();
        wx.clearRect(nx, ny, nw, nh);
        for (const l of m.names) wx.drawImage(l.hot, l.X, l.Y);
        // Only what the band covers of them is kept: a band that leans, soft at both its sides.
        wx.globalCompositeOperation = 'destination-in';
        wx.setTransform(1, 0, slant, 1, -slant * (ny + nh / 2), 0);
        const across = wx.createLinearGradient(at - band / 2, 0, at + band / 2, 0);
        across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(0.5, 'rgba(255,255,255,1)'); across.addColorStop(1, 'rgba(255,255,255,0)');
        wx.fillStyle = across;
        wx.fillRect(nx - nw, ny - nh, nw * 3, nh * 3);
        wx.restore();
        const strength = Math.sin(Math.PI * film.sheen) ** 0.6;
        ctx.globalAlpha = 0.7 * strength; ctx.drawImage(work, nx, ny, nw, nh, nx, ny, nw, nh); ctx.globalAlpha = 1;
        L.globalAlpha = 0.5 * strength; L.drawImage(work, nx, ny, nw, nh, nx, ny, nw, nh); L.globalAlpha = 1;
        glow(L, clamp(at, nx, nx + nw), ny + nh * 0.42, m.L.cap * m.px * 0.95, '#FFF6E0', 0.16 * strength, { sx: 0.7 });
      }
      // The ink takes the name to the night: the boarding's tide, laid from the surface's own edges, drawn once and
      // cut out of the picture and of its light. Only the part of it that reaches the name is played.
      if (film.ink > 0) {
        const [from, to] = m.ink.window();
        wx.setTransform(1, 0, 0, 1, 0, 0);
        wx.globalCompositeOperation = 'source-over'; wx.globalAlpha = 1;
        wx.clearRect(0, 0, m.W, m.H);
        wx.setTransform(1, 0, 0, 1, -m.ox, -m.oy);
        paintTide(wx, m.full, lerp(from, to, film.ink));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(work, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        L.translate(-jx, -jy);
        L.globalAlpha = 1; L.globalCompositeOperation = 'destination-out';
        L.drawImage(work, 0, 0, m.W, m.H);
      }
    }
    L.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const took = win.performance.now() - started;
    stats.frames += 1; stats.drawMs = took; stats.worstMs = Math.max(stats.worstMs, took);
  }

  function tick() {
    raf = null;
    if (disposed || suspended || !anchor || !made) return;
    const now = win.performance.now(), since = now - anchor.at;
    if (since > COAST_MS || anchor.t + since > BRAND_MS) return; // no paint for a while, or the film is over: the picture stops
    stats.ownFrames += 1;
    draw(anchor.t + since);
    // Where the ink will have to begin and end is worked out here, a step a frame, while nothing moves but the cursor.
    if (!made.ink.done() && !moving(anchor.t + since)) made.ink.step();
    raf = win.requestAnimationFrame(tick);
  }

  return {
    stats,
    canvas,
    element: root,
    /** Resolves when the film's pictures are drawn. They are drawn inside the first paint, so nothing is waited for. */
    ready: () => Promise.resolve(),
    paint(t, { width, height, variant: next = 'full' } = {}) {
      if (disposed) return;
      if (!VARIANTS.includes(next)) throw new Error(`No brand variant ${next}`);
      const time = clamp(Number.isFinite(t) ? t : 0, 0, BRAND_MS);
      size(width, height);
      // Reduce motion is the game's (the variant asked for) or the device's: either gives the held picture.
      variant = next === 'reduced' || media?.matches ? 'reduced' : 'full';
      const changed = variant !== shown.variant || box[0] !== shown.box[0] || box[1] !== shown.box[1];
      anchor = { t: time, at: win.performance.now() };
      stats.paints += 1;
      const running = live && !suspended && variant === 'full' && time < BRAND_MS;
      // One drawing a frame: when the scene's own frame is already due, this paint only gives it the time.
      if (!running || raf === null || changed) draw(time);
      shown = { variant, box: [...box] };
      if (running && raf === null) raf = win.requestAnimationFrame(tick);
      if (!running && raf !== null) { win.cancelAnimationFrame(raf); raf = null; }
    },
    /** Stops the scene's own frames (the page is hidden, the stage is covered). After resume(), the next paint restarts them. */
    suspend() { suspended = true; if (raf !== null) win.cancelAnimationFrame(raf); raf = null; },
    resume() { suspended = false; },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf !== null) win.cancelAnimationFrame(raf);
      raf = null;
      free();
      light.dispose();
      canvas.width = 0; canvas.height = 0; work.width = 0; work.height = 0;
      root.remove();
    },
  };
}

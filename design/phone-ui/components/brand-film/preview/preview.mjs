// mothership:dev-only
//
// The brand intro's preview: the runtime component (../brand-film.mjs, the same files the game imports) in a
// phone-sized frame, on a labelled synthetic clock.
//   ?size=390x844|430x932   the frame (the page's own size by default)
//   ?t=<ms>                 hold the film at a moment (no clock runs)
//   ?state=<name>           a named moment (STATES below)
//   ?motion=reduced         the game's Reduce motion (the device's is the browser's own setting)
//   ?bar=0                  no controls (a capture)
// Without ?t or ?state the film plays on the page's clock, as the pre-game player drives it: a paint at most thirty
// times a second, the scene moving between them.

import { BEATS, BRAND_MS, STILL, STRIKE, TYPING, brandFrame, createBrandScene, cursorBox, layout } from '../brand-film.mjs';

/** Named moments: each beat of the film, and the held picture of Reduce motion as it comes, holds and goes. */
export const STATES = Object.freeze({
  black: { t: 30 }, cursor: { t: 120 },
  falling: { t: TYPING.name[0] + 30 }, landed: { t: TYPING.name[0] + STRIKE.fall + 8 }, settled: { t: TYPING.name[1] - 4 },
  name: { t: 740 }, 'line-break': { t: BEATS.lineBreak + 20 }, credit: { t: 1310 },
  sheen: { t: 1460 }, rest: { t: 1650 }, ink: { t: 1800 }, 'ink-late': { t: 1900 }, night: { t: 1980 },
  'still-in': { t: 100, motion: 'reduced' }, still: { t: 1000, motion: 'reduced' }, 'still-out': { t: 1830, motion: 'reduced' }, 'still-night': { t: 1980, motion: 'reduced' },
});

const query = new URLSearchParams(location.search);
const state = STATES[query.get('state')] ?? null;
const [width, height] = (query.get('size') ?? `${window.innerWidth}x${window.innerHeight}`).split('x').map(Number);
const reduced = (query.get('motion') ?? state?.motion) === 'reduced';
const held = query.has('t') ? Number(query.get('t')) : state ? state.t : null;

const phone = document.createElement('div');
phone.className = 'pv-phone';
phone.style.width = `${width}px`; phone.style.height = `${height}px`;
document.body.append(phone);
const scene = createBrandScene(phone, { options: {}, live: held === null });
const variant = () => (reduced ? 'reduced' : 'full');
let t = held ?? 0, playing = held === null, started = performance.now(), last = -Infinity;
const paint = () => scene.paint(t, { width, height, variant: variant() });

const bar = document.createElement('div');
bar.className = 'pv-bar'; bar.hidden = query.get('bar') === '0';
bar.innerHTML = '<button type="button" data-do="play"></button><input type="range" min="0" max="2000" step="2" aria-label="Film time, ms"><output></output>';
const note = document.createElement('p');
note.className = 'pv-note'; note.hidden = bar.hidden;
note.textContent = `Preview: a synthetic clock. ${reduced ? 'Reduce motion (the game\'s).' : 'Full motion.'} Not the game.`;
document.body.append(bar, note);
const [button, slider, output] = bar.children;
const show = () => { button.textContent = playing ? 'Pause' : t >= BRAND_MS ? 'Play again' : 'Play'; slider.value = String(Math.round(t)); output.textContent = `${Math.round(t)} ms`; };
button.addEventListener('click', () => { playing = !playing; if (t >= BRAND_MS) t = 0; started = performance.now() - t; show(); if (playing) requestAnimationFrame(frame); });
slider.addEventListener('input', () => { playing = false; t = Number(slider.value); paint(); show(); });

function frame(now) {
  if (playing) {
    t = Math.min(BRAND_MS, now - started);
    // As the pre-game player: a paint at most every 1000/30 ms.
    if (now - last >= 1000 / 30) { paint(); last = now; show(); }
    if (t >= BRAND_MS) { playing = false; show(); }
  }
  // Held, the page asks for no frame: only the film's own are counted by its probe.
  if (playing) requestAnimationFrame(frame);
}

/** A canvas's lit pixels: how many, how bright the brightest, and the box they lie in (in the canvas's own px). */
function lit(canvas) {
  if (!canvas.width || !canvas.height) return { pixels: 0, brightest: 0, box: null };
  const copy = document.createElement('canvas');
  copy.width = canvas.width; copy.height = canvas.height;
  const ctx = copy.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0);
  const data = ctx.getImageData(0, 0, copy.width, copy.height).data;
  let pixels = 0, brightest = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let i = 0; i < data.length; i += 4) {
    const level = Math.max(data[i], data[i + 1], data[i + 2]) * data[i + 3] / 255;
    if (level < 24) continue;
    const x = (i / 4) % copy.width, y = Math.floor(i / 4 / copy.width);
    pixels += 1; if (level > brightest) brightest = level;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { pixels, brightest: Math.round(brightest), box: pixels ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null };
}

/** What a capture reads: the moment drawn, the scene's own numbers, what is on the page. */
function seen() {
  const root = phone.querySelector('.ms-brand-film'), layers = root ? [...root.children] : [];
  const box = root?.getBoundingClientRect(), film = brandFrame(t, { variant: variant() }), L = layout(width, height);
  const place = node => { const r = node.getBoundingClientRect(), p = phone.getBoundingClientRect(); return [r.left - p.left, r.top - p.top, r.width, r.height].map(v => Math.round(v * 1000) / 1000); };
  return {
    frame: film, stats: { ...scene.stats },
    root: root ? { hidden: root.getAttribute('aria-hidden'), width: box.width, height: box.height, pointer: getComputedStyle(root).pointerEvents, background: getComputedStyle(root).backgroundColor } : null,
    layers: layers.map(node => `${node.localName}${node.className ? `.${node.className}` : ''}`),
    canvas: { width: scene.canvas.width, height: scene.canvas.height, box: root ? place(scene.canvas) : null },
    layout: { x0: L.x0, y1: L.y1, y2: L.y2, cap: L.cap, w: L.w, blockH: L.blockH }, cursor: cursorBox(film, L),
    tappable: root ? root.querySelectorAll('a, button, input, [tabindex], [role="button"]').length : null,
    ink: lit(scene.canvas),
  };
}

/**
 * Plays the film in real time as the pre-game player drives it and reports how it went: pictures a second, the gaps
 * between the page's frames, what drawing a frame took, and what the first paint took (it makes the film's pictures).
 */
async function measure() {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;z-index:5`;
  document.body.append(holder);
  const film = createBrandScene(holder, { options: {} });
  const frames = [], drawn = [], own = []; let lastPaint = -Infinity, lastFrames = 0, firstPaintMs = null; const start = performance.now();
  await new Promise(done => {
    const step = () => {
      const now = performance.now(), at = now - start; frames.push(now);
      if (film.stats.frames !== lastFrames) { drawn.push(at); own.push(film.stats.drawMs); lastFrames = film.stats.frames; }
      if (at >= BRAND_MS) { done(); return; }
      if (now - lastPaint >= 1000 / 30) {
        const before = performance.now();
        film.paint(at, { width, height, variant: 'full' });
        if (firstPaintMs === null) firstPaintMs = performance.now() - before;
        lastPaint = now;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const gaps = frames.slice(1).map((f, i) => f - frames[i]).sort((a, b) => a - b), q = p => +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(1);
  const ownOf = list => { const sorted = [...list].sort((x, y) => x - y), at = p => +(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0).toFixed(2); return { median: at(0.5), p90: at(0.9), max: +(sorted.at(-1) ?? 0).toFixed(2) }; };
  const stats = { ...film.stats };
  film.dispose(); holder.remove();
  return { film: stats.version, drawnAt: drawn.map(Math.round), picturesASecond: +(stats.frames / (BRAND_MS / 1000)).toFixed(1), frameGapMs: { median: q(0.5), p90: q(0.9), p99: q(0.99), max: +gaps.at(-1).toFixed(1) }, framesOver34ms: gaps.filter(g => g > 34).length, ownDrawMs: ownOf(own), firstPaintMs: +firstPaintMs.toFixed(2), bakeMs: +stats.bakeMs.toFixed(2), pictures: stats.pictures, bytes: stats.bytes, scale: stats.scale, canvas: `${scene.canvas.width}x${scene.canvas.height}` };
}

paint();
show();
if (playing) requestAnimationFrame(frame);
window.__brandFilm = {
  mounted: [{ scene, phone }],
  ready: scene.ready().then(() => true),
  seek(ms) { playing = false; t = ms; paint(); show(); return true; },
  seen, measure, states: STATES, size: [width, height],
};

// mothership:dev-only
//
// The boarding film's preview: the runtime component (../boarding-film.mjs, the same files the game imports) in a
// phone-sized frame, on a labelled synthetic clock, with a synthetic public roster (seats 1..n, characters c1..cn).
//   ?size=390x844|430x932   the frame (the page's own size by default)
//   ?n=7|8|9                the crew's size
//   ?t=<ms>                 hold the film at a moment (no clock runs)
//   ?state=<name>           a named moment (STATES below)
//   ?motion=reduced         the game's Reduce motion (the device's is the browser's own setting)
//   ?bar=0                  no controls (a capture)
// Without ?t or ?state the film plays on the page's clock, as the pre-game player drives it: a paint at most thirty
// times a second, the scene moving between them.

import { BOARDING_MS, SHOTS, STILLS, STILL_FADE_MS, boardingFrame, createBoardingScene, prepareBoardingScene } from '../boarding-film.mjs';
import { runProbe } from './probe.mjs';

/** Named moments: one for each shot and beat, and the five held pictures of Reduce motion. */
export const STATES = Object.freeze({
  dusk: { t: 1200 }, arrive: { t: 1950 }, foot: { t: 2800 }, faces: { t: 4600 }, glare: { t: 5320 }, look: { t: 6040 }, sealed: { t: 6520 }, wake: { t: 6760 },
  dark: { t: 7300 }, lit: { t: 8600 }, mark: { t: 9450 }, tide: { t: 9800 }, night: { t: 9980 },
  seven: { t: 8600, n: 7 }, nine: { t: 6040, n: 9 },
  ...Object.fromEntries(STILLS.map((still, i) => [`still${i + 1}`, { t: still.at + STILL_FADE_MS + 40, motion: 'reduced' }])),
});

const query = new URLSearchParams(location.search);
const state = STATES[query.get('state')] ?? null;
const [width, height] = (query.get('size') ?? `${window.innerWidth}x${window.innerHeight}`).split('x').map(Number);
const n = Number(query.get('n') ?? state?.n ?? 8);
const reduced = (query.get('motion') ?? state?.motion) === 'reduced';
const held = query.has('t') ? Number(query.get('t')) : state ? state.t : null;
export const rosterOf = count => Array.from({ length: count }, (_, i) => ({ seat: i + 1, character: `c${i + 1}` }));

const phone = document.createElement('div');
phone.className = 'pv-phone';
phone.style.width = `${width}px`; phone.style.height = `${height}px`;
document.body.append(phone);
const scene = createBoardingScene(phone, { options: { roster: rosterOf(n) }, live: held === null });
const variant = () => (reduced ? 'reduced' : 'full');
let t = held ?? 0, playing = held === null, started = performance.now(), last = -Infinity;
const paint = () => scene.paint(t, { width, height, variant: variant() });

const bar = document.createElement('div');
bar.className = 'pv-bar'; bar.hidden = query.get('bar') === '0';
bar.innerHTML = '<button type="button" data-do="play"></button><input type="range" min="0" max="10000" step="10" aria-label="Film time, ms"><output></output>';
const note = document.createElement('p');
note.className = 'pv-note'; note.hidden = bar.hidden;
note.textContent = `Preview: a synthetic clock and a synthetic roster of ${n}. ${reduced ? 'Reduce motion (the game\'s).' : 'Full motion.'} Not the game.`;
document.body.append(bar, note);
const [button, slider, output] = bar.children;
const show = () => { button.textContent = playing ? 'Pause' : 'Play'; slider.value = String(Math.round(t)); output.textContent = `${Math.round(t)} ms · ${boardingFrame(t, { variant: variant() }).shot}`; };
button.addEventListener('click', () => { playing = !playing; started = performance.now() - t; if (t >= BOARDING_MS) { t = 0; started = performance.now(); } show(); if (playing) requestAnimationFrame(frame); });
slider.addEventListener('input', () => { playing = false; t = Number(slider.value); paint(); show(); });

function frame(now) {
  if (playing) {
    t = Math.min(BOARDING_MS, now - started);
    // As the pre-game player: a paint at most every 1000/30 ms.
    if (now - last >= 1000 / 30) { paint(); last = now; show(); }
    if (t >= BOARDING_MS) playing = false;
  }
  // Held, the page asks for no frame: only the film's own are counted by its probe.
  if (playing) requestAnimationFrame(frame);
}

/** How bright the picture is, 0..255 (a small copy of the canvas, read). */
function brightness() {
  const small = document.createElement('canvas');
  small.width = 39; small.height = 84;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(scene.canvas, 0, 0, small.width, small.height);
  const data = ctx.getImageData(0, 0, small.width, small.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
  return Math.round(sum / (data.length / 4 * 3) * 10) / 10;
}

/** What a capture reads: the frame drawn, the scene's own numbers, what is on the page. */
function seen() {
  const root = phone.querySelector('.ms-boarding-film'), layers = root ? [...root.children] : [];
  const box = root?.getBoundingClientRect();
  return {
    frame: boardingFrame(t, { variant: scene.held().variant ?? variant() }), stats: { ...scene.stats }, held: scene.held(),
    root: root ? { hidden: root.getAttribute('aria-hidden'), width: box.width, height: box.height, pointer: getComputedStyle(root).pointerEvents } : null,
    layers: layers.map(node => `${node.localName}${node.className ? `.${node.className}` : ''}`),
    canvas: { width: scene.canvas.width, height: scene.canvas.height },
    tappable: root ? root.querySelectorAll('a, button, input, [tabindex], [role="button"]').length : null,
    brightness: brightness(),
  };
}

/**
 * Plays the film in real time as the pre-game player drives it and reports how it went: frames a second, the gaps
 * between them, how sharp the frame ended. `prepare`: draw the pictures first, as a game that calls
 * prepareBoardingScene() would.
 */
async function measure({ prepare = true, count = 8 } = {}) {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;z-index:5`;
  document.body.append(holder);
  let prepared = null, prepareMs = 0;
  if (prepare) { const a = performance.now(); prepared = prepareBoardingScene(document, { roster: rosterOf(count), width, height }); await prepared.ready; prepareMs = performance.now() - a; }
  const film = createBoardingScene(holder, { options: { roster: rosterOf(count), prepared } });
  const frames = [], drawn = [], own = []; let lastPaint = -Infinity, lastFrames = 0; const start = performance.now();
  await new Promise(done => {
    const step = () => {
      const now = performance.now(), at = now - start; frames.push(now);
      if (film.stats.frames !== lastFrames) { drawn.push(at); own.push(film.stats.drawMs); lastFrames = film.stats.frames; }
      if (at >= BOARDING_MS) { done(); return; }
      if (now - lastPaint >= 1000 / 30) { film.paint(at, { width, height, variant: 'full' }); lastPaint = now; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const gaps = frames.slice(1).map((f, i) => f - frames[i]).sort((a, b) => a - b), q = p => +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(1);
  const byShot = Object.fromEntries(Object.entries(SHOTS).map(([shot, [a, b]]) => [shot, +(drawn.filter(at => at >= a && at < b).length / ((b - a) / 1000)).toFixed(1)]));
  const stats = { ...film.stats };
  // What drawing a frame itself took (the film's own measure), apart from the gaps between frames.
  const ownOf = list => { const sorted = [...list].sort((x, y) => x - y), at = p => +(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0).toFixed(1); return { median: at(0.5), p90: at(0.9), max: +(sorted.at(-1) ?? 0).toFixed(1) }; };
  film.dispose(); holder.remove();
  return { drawnAt: drawn.map(Math.round), film: stats.version, prepared: prepare, prepareMs: Math.round(prepareMs), picturesASecond: +(stats.frames / (BOARDING_MS / 1000)).toFixed(1), byShot, frameGapMs: { median: q(0.5), p90: q(0.9), p99: q(0.99), max: +gaps.at(-1).toFixed(1) }, framesOver34ms: gaps.filter(g => g > 34).length, ownDrawMs: ownOf(own), quality: stats.quality, sharp: stats.sharp, pixels: `${Math.round(width * stats.scale)}x${Math.round(height * stats.scale)}`, peakBytes: stats.peakBytes, plannedBytes: stats.planned, bakeMs: Math.round(stats.bakeMs), longestBakeMs: Math.round(stats.longestBakeMs) };
}

/** What the film's pictures hold for this frame's size and the screen's sharpness, all drawn at once. */
async function memory(count = 8) {
  const prepared = prepareBoardingScene(document, { roster: rosterOf(count), width, height });
  const started = performance.now();
  await prepared.ready;
  const groups = {};
  for (const job of prepared.jobs) {
    const made = prepared.assets.get(job.key); if (!made) continue;
    const bytes = (Array.isArray(made) ? made : [made]).reduce((sum, m) => sum + (m.canvas ? m.canvas.width * m.canvas.height * 4 : m.width * m.height * 4), 0), group = job.key.split(':')[0];
    groups[group] = (groups[group] ?? 0) + bytes;
  }
  const out = { size: `${width}x${height}`, devicePixelRatio: window.devicePixelRatio, pictures: prepared.assets.stats.pictures, bytes: prepared.assets.stats.bytes, plannedBytes: prepared.bytes, sharp: prepared.sharp, drawMs: Math.round(performance.now() - started), longestMs: Math.round(prepared.assets.stats.longestMs), failed: prepared.assets.stats.failed, groups };
  prepared.dispose();
  return out;
}

paint();
show();
if (playing) requestAnimationFrame(frame);
window.__boardingFilm = {
  mounted: [{ scene, phone }],
  ready: scene.ready().then(() => { paint(); return true; }),
  seek(ms) { playing = false; t = ms; paint(); show(); return scene.ready().then(() => { paint(); return true; }); },
  seen, measure, memory, probe: () => runProbe({ width, height }), states: STATES,
};

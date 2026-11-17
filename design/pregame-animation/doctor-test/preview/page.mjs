import { createDoctorTest, TEST_MS } from '../scene.mjs';
import { roleSvg, roleCaptions } from '../../../../apps/game/hosted/pregame-films/roles/film.mjs';

// If this frame refuses blob: pictures, make them from data: URLs instead (the same SVG text).
async function blobImagesWork() {
  return new Promise(done => {
    const url = URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'], { type: 'image/svg+xml' }));
    const img = new Image(); img.onload = () => done(true); img.onerror = () => done(false); img.src = url;
    setTimeout(() => done(false), 1500);
  });
}
function useDataUrls() {
  const RealBlob = window.Blob, texts = new WeakMap();
  window.Blob = function (parts, opts) { const b = new RealBlob(parts, opts); if (opts?.type === 'image/svg+xml') texts.set(b, parts.join('')); return b; };
  const real = URL.createObjectURL.bind(URL);
  URL.createObjectURL = b => (texts.has(b) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texts.get(b))}` : real(b));
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = u => (String(u).startsWith('data:') ? undefined : revoke(u));
}

const $ = id => document.getElementById(id);
const state = { size: [390, 844], character: 'c8', variant: 'full', speed: 1, playing: false, t: 0, show: 'both', world: 'novel' };
let mine = null, last = null, clockStart = 0, tAtStart = 0;
const gaps = [];

function fit() {
  const avail = $('stages').clientWidth;
  const both = state.show === 'both';
  const n = both ? 2 : 1, gap = 20;
  const scale = Math.min(1, (avail - gap * (n - 1)) / (state.size[0] * n), (window.innerHeight * 0.78) / state.size[1]);
  for (const el of document.querySelectorAll('.phone')) {
    el.style.width = `${state.size[0] * scale}px`; el.style.height = `${state.size[1] * scale}px`;
    el.firstElementChild.style.transform = `scale(${scale})`;
  }
  $('today').closest('figure').hidden = state.show === 'mine';
  $('mine').closest('figure').hidden = state.show === 'today';
}

async function build() {
  mine?.dispose();
  const [W, H] = state.size;
  for (const id of ['today', 'mine']) { const s = $(id); s.style.width = `${W}px`; s.style.height = `${H}px`; }
  $('status').textContent = 'Drawing the pictures…';
  const t0 = performance.now();
  mine = createDoctorTest($('mine'), { width: W, height: H, character: state.character, world: state.world, pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)) });
  fit();
  paint(state.t);
  const first = await mine.firstReady();
  paint(state.t);
  await mine.ready();
  const all = Math.round(performance.now() - t0);
  const mb = (mine.bakery.bytes / 1048576).toFixed(1);
  $('status').textContent = `Ready. First frame after ${first} ms; all ${mine.plannedPictures} pictures after ${all} ms; ${mb} MB of pictures held, on this device.`;
  paint(state.t);
}

function paint(t) {
  const [W, H] = state.size;
  mine?.paint(t, { variant: state.variant });
  if (state.show !== 'mine') {
    $('today').innerHTML = roleSvg(t, { width: W, height: H, role: 'doctor', character: state.character, seat: 4, variant: state.variant })
      + roleCaptions(t, { width: W, height: H, role: 'doctor', variant: state.variant }).map(c => `<div class="cap" style="left:${c.x}px;top:${c.y}px;opacity:${c.opacity}">${c.lines.join('<br>')}</div>`).join('');
  }
  $('scrub').value = String(Math.round(t));
  $('clock').textContent = `${(t / 1000).toFixed(2)} s`;
}

function frame(now) {
  if (!state.playing) return;
  if (last != null) { gaps.push(now - last); if (gaps.length > 60) gaps.shift(); }
  last = now;
  let t = tAtStart + (now - clockStart) * state.speed;
  if (t >= TEST_MS) { t = TEST_MS; state.playing = false; $('play').textContent = 'Play'; }
  state.t = t;
  paint(t);
  if (gaps.length > 5) {
    const sorted = [...gaps].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    $('fps').textContent = `${(1000 / med).toFixed(0)} fps · paint ${(mine.stats.drawMs / Math.max(1, mine.stats.frames)).toFixed(1)} ms`;
  }
  if (state.playing) requestAnimationFrame(frame);
}
function play(from = state.t >= TEST_MS ? 0 : state.t) {
  state.playing = true; tAtStart = from; clockStart = performance.now(); last = null; gaps.length = 0;
  $('play').textContent = 'Pause';
  requestAnimationFrame(frame);
}

function wire() {
  $('play').onclick = () => { if (state.playing) { state.playing = false; $('play').textContent = 'Play'; } else play(); };
  $('replay').onclick = () => play(0);
  $('scrub').oninput = e => { state.playing = false; $('play').textContent = 'Play'; state.t = +e.target.value; paint(state.t); };
  for (const el of document.querySelectorAll('[data-speed]')) el.onclick = () => { state.speed = +el.dataset.speed; mark('[data-speed]', el); if (state.playing) play(state.t); };
  for (const el of document.querySelectorAll('[data-size]')) el.onclick = () => { state.size = el.dataset.size.split('x').map(Number); mark('[data-size]', el); build(); };
  for (const el of document.querySelectorAll('[data-char]')) el.onclick = () => { state.character = el.dataset.char; mark('[data-char]', el); build(); };
  for (const el of document.querySelectorAll('[data-world]')) el.onclick = () => { state.world = el.dataset.world; mark('[data-world]', el); $('minecap').textContent = el.dataset.world === 'novel' ? 'New world' : 'Rough pass, today\'s look'; build(); };
  for (const el of document.querySelectorAll('[data-show]')) el.onclick = () => { state.show = el.dataset.show; mark('[data-show]', el); fit(); paint(state.t); };
  $('reduce').onchange = e => { state.variant = e.target.checked ? 'reduced' : 'full'; paint(state.t); };
  window.addEventListener('resize', fit);
}
const mark = (sel, on) => { for (const el of document.querySelectorAll(sel)) el.setAttribute('aria-pressed', String(el === on)); };

window.__doc = { get mine() { return mine; }, play, state, gaps, build };
(async () => {
  if (!(await blobImagesWork())) useDataUrls();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { $('reduce').checked = true; state.variant = 'reduced'; }
  if (window.innerWidth < 640) { state.show = 'mine'; mark('[data-show]', document.querySelector('[data-show="mine"]')); }
  wire();
  await build();
})();

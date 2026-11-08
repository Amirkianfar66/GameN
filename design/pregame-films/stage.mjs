// mothership:dev-only
//
// The review stage: one film on one surface, seekable. `stage.html?film=brand|role|boarding
// &variant=full|reduced[&role=doctor&character=c3][&roster=8]&t=<ms>&play=1`. The surface is the
// window's size. `window.__films.seek(t)` draws the frame at t (ms); the renderer drives it frame by
// frame. A review page on synthetic fixtures, never imported by the game.

import { FILMS } from './films.mjs';

const query = new URLSearchParams(location.search);
const film = FILMS[query.get('film') ?? 'brand'];
if (!film) throw new Error(`No film ${query.get('film')}`);
const options = film.options(query);
// Art every phone already holds (the crew release's bundles), fetched before the first frame.
if (film.assets) {
  const wanted = film.assets();
  const loaded = {};
  for (const [group, files] of Object.entries(wanted)) {
    loaded[group] = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([id, path]) => [id, await (await fetch(`../${path}`)).text()])));
  }
  options.assets = loaded;
}
const holder = document.getElementById('film');
const caption = document.getElementById('caption');

// The narration boxes: page text over the picture, lettered as a comic's captions.
const boxes = document.createElement('div');
boxes.className = 'boxes';
document.body.append(boxes);
function drawBoxes(t, size) {
  const list = film.boxes ? film.boxes(t, { ...options, ...size }) : [];
  boxes.replaceChildren(...list.map(b => {
    const box = document.createElement('p');
    box.className = 'box';
    box.style.left = `${b.x}px`;
    box.style.top = `${b.y - (1 - b.drop) * 10}px`;
    box.style.opacity = String(b.opacity);
    box.style.transform = `rotate(${b.tilt}deg)`;
    for (const line of b.lines) { const span = document.createElement('span'); span.textContent = line; box.append(span); }
    return box;
  }));
}

let shown = -1;
function seek(t) {
  const width = window.innerWidth, height = window.innerHeight;
  holder.innerHTML = film.svg(t, { ...options, width, height });
  drawBoxes(t, { width, height });
  const words = film.caption?.(t, options) ?? '';
  if (caption.textContent !== words) caption.textContent = words;
  shown = t;
  return t;
}

const duration = film.duration;
window.__films = { ready: true, seek, duration, shown: () => shown };
seek(Number(query.get('t') ?? 0));

if (query.get('play') === '1') {
  const start = performance.now();
  const tick = now => { seek(Math.min(duration, now - start)); if (now - start < duration) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

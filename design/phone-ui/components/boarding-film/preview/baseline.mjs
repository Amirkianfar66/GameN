// mothership:dev-only
//
// Today's boarding film (pregame-boarding-1.0.0), drawn by the live game's own scene
// (apps/game/hosted/planet/pregame-scene.mjs) and driven as its player drives it, so the check can measure both films
// the same way: a paint at most thirty times a second on real time. The live player draws nothing between paints.

import { createPregameScene } from '../../../../../apps/game/hosted/planet/pregame-scene.mjs';

const MS = 10000;
const query = new URLSearchParams(location.search);
const [width, height] = (query.get('size') ?? `${window.innerWidth}x${window.innerHeight}`).split('x').map(Number);
const rosterOf = count => Array.from({ length: count }, (_, i) => ({ seat: i + 1, character: `c${i + 1}` }));
const holder = document.createElement('div');
holder.className = 'pv-phone';
holder.style.cssText = `width:${width}px;height:${height}px`;
document.body.append(holder);
let scene = createPregameScene(holder, { kind: 'boarding', options: { roster: rosterOf(8) } });

async function measure({ count = 8 } = {}) {
  scene.dispose();
  scene = createPregameScene(holder, { kind: 'boarding', options: { roster: rosterOf(count) } });
  const frames = [], drawn = []; let lastPaint = -Infinity; const start = performance.now();
  await new Promise(done => {
    const step = () => {
      const now = performance.now(), at = now - start; frames.push(now);
      if (at >= MS) { done(); return; }
      if (now - lastPaint >= 1000 / 30) { scene.paint(at, { width, height, variant: 'full' }); drawn.push(at); lastPaint = now; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const gaps = frames.slice(1).map((f, i) => f - frames[i]).sort((a, b) => a - b), q = p => +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(1);
  const shots = { dusk: [0, 2000], ramp: [2000, 6900], inside: [6900, 10000] };
  const byShot = Object.fromEntries(Object.entries(shots).map(([shot, [a, b]]) => [shot, +(drawn.filter(at => at >= a && at < b).length / ((b - a) / 1000)).toFixed(1)]));
  return { drawnAt: drawn.map(Math.round), film: 'pregame-boarding-1.0.0', picturesASecond: +(drawn.length / (MS / 1000)).toFixed(1), byShot, frameGapMs: { median: q(0.5), p90: q(0.9), p99: q(0.99), max: +gaps.at(-1).toFixed(1) }, framesOver34ms: gaps.filter(g => g > 34).length, nodes: holder.querySelectorAll('*').length, pixels: `${Math.round(width * devicePixelRatio)}x${Math.round(height * devicePixelRatio)}` };
}

/** Draws the film at a moment (for a picture of it beside the pilot). */
function seek(ms, variant = 'full') { scene.paint(ms, { width, height, variant }); return true; }

scene.paint(0, { width, height, variant: 'full' });
window.__baseline = { ready: true, measure, seek };

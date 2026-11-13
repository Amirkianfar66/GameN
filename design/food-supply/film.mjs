// mothership:dev-only
//
// The film stage: one storyboard played in time over the still room, with its caption under it.
// The render tool steps window.__fs.set(t) frame by frame and records a silent film.
//   film.html?board=<id>              the storyboard as it plays
//   film.html?board=<id>&reduced=1    the same with Reduce motion
// Cuts (a long wait skipped) jump the film's clock; a card says so. A design proposal on synthetic fixtures.

import { boardOf, CAST } from './boards.mjs';
import { run, poseAt } from './stage.mjs';
import { sceneSvg, roomBack } from './scene.mjs';

const p = Object.fromEntries(new URLSearchParams(location.search));
const board = boardOf(p.board ?? 'cooperation');
const reduced = p.reduced === '1';
const frames = run(board);
const last = board.captions[board.captions.length - 1][1];
const segments = board.cuts ?? [[0, last]];
const duration = segments.reduce((sum, [a, z]) => sum + (z - a), 0);
const tags = { winch: { number: CAST.winch.seat, name: CAST.winch.name }, panel: { number: CAST.panel.seat, name: CAST.panel.name } };
const chars = { winch: CAST.winch.character, panel: CAST.panel.character };

document.getElementById('back').innerHTML = roomBack();
document.getElementById('title').textContent = `${board.title}${reduced ? ' · Reduce motion' : ''}`;
const live = document.getElementById('live');
const caption = document.getElementById('caption');
const cut = document.getElementById('cut');

/** The board's own time at film time ft, across the cuts. */
function boardTime(ft) {
  let rest = ft;
  for (const [a, z] of segments) { if (rest <= z - a) return { t: a + rest }; rest -= z - a; }
  return { t: segments[segments.length - 1][1] };
}

function set(ft) {
  const { t } = boardTime(ft);
  live.innerHTML = sceneSvg(poseAt(frames, t, { reduced, tags }), { characters: chars, prefix: 'f', back: false });
  const c = board.captions.find(([a, z]) => t >= a && t < z) ?? board.captions[board.captions.length - 1];
  caption.textContent = c[2];
  const jumped = segments.length > 1 && segments.slice(1).some(([a]) => t >= a && t < a + 1400);
  cut.hidden = !jumped;
  if (jumped) cut.textContent = `${Math.round((segments[1][0] - segments[0][1]) / 1000)} seconds later`;
}

window.__fs = { duration, set };
set(0);
document.fonts.ready.then(() => { window.__designReady = true; });

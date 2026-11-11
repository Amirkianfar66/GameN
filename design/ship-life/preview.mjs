// mothership:dev-only
//
// Ship life's design preview (design/ship-life/preview.html): Room A with its five places alive and
// one visit to its food capsule, in takes the owner can watch one by one. A design preview with
// labelled fixtures: it is not the game, reads no game fact, and decides nothing about food.
//   ?take=stocked   A1 ends the turn and eats (the capsule fixture: stocked)
//   ?take=empty     A4 ends the turn, opens the capsule and finds it empty (fixture: empty)
//   ?take=unknown   the capsule's neutral closed state; no visit is played (fixture: unknown)
//   ?take=reduced   Reduce motion: every place at rest, no visit
//   &t=<ms>         hold one moment (the render tool sets the clock itself through window.__ship)
//   &live=1         run in real time

import { roomStage } from './stage.mjs';

window.__designReady = false;

/** Who stands where in the pilot: the room pilot's cast, Mira and Vega swapped so Mira's hair walks. */
export const CAST = Object.freeze({ A1: 'c8', A2: 'c1', A3: 'c3', A4: 'c4', A5: 'c9' });

/** The takes: what the capsule's fixture is, who ends a turn when, and what the bar says over time. */
export const TAKES = Object.freeze({
  stocked: {
    title: 'Room A: work at each place, then a meal after a turn',
    capsule: 'stocked', visits: [{ place: 'A1', at: 2200, kind: 'stocked' }], tail: 2600,
    captions: [
      [0, 'A1 types at the PC, A4 sorts the crates, A5 works the panel. A2 and A3 rest in this pilot.'],
      [2200, 'A1 (Mira) ends the turn and eats while play goes on: a portion, two bites, and back.'],
      ['end', 'Back at the PC, the work starts again. In the game, A1 never left the place.'],
    ],
  },
  empty: {
    title: 'Room A: the capsule is empty',
    capsule: 'empty', visits: [{ place: 'A4', at: 1800, kind: 'empty' }], tail: 2200,
    captions: [
      [0, 'The capsule\'s light is dark glass: empty in this fixture.'],
      [1800, 'A4 (Atlas) ends the turn and finds the capsule empty: a small reaction, no alarm.'],
      ['end', 'Back at the crates. Nothing else happens: no penalty, no message.'],
    ],
  },
  unknown: {
    title: 'Room A: availability unknown',
    capsule: 'unknown', visits: [], length: 4200,
    captions: [[0, 'Not known: a steel shutter covers the light (never shown as empty). No visit plays.']],
  },
  reduced: {
    title: 'Room A with Reduce motion',
    capsule: 'stocked', visits: [], reduced: true, length: 2600,
    captions: [[0, 'Reduce motion: resting poses, a still room, and no visit.']],
  },
});

const params = new URLSearchParams(location.search);
const name = params.get('take') ?? 'stocked';
const take = TAKES[name];
if (!take) throw new Error(`No take ${name}`);
const stage = roomStage({ room: 'room-a', cast: CAST, capsule: take.capsule, visits: take.visits, reduced: Boolean(take.reduced) });
document.getElementById('root').append(stage.root);
const end = stage.visits.reduce((m, v) => Math.max(m, v.end), 0);
const duration = take.length ?? end + take.tail;
const captions = take.captions.map(([at, text]) => [at === 'end' ? end : at, text]);

document.getElementById('title').textContent = take.title;
document.getElementById('tags').innerHTML = [
  `<span class="tag fixture">Preview fixture: ${take.capsule}</span>`,
  take.reduced ? '<span class="tag note">Reduce motion</span>' : '',
  '<span class="tag note">Design preview, not in the game</span>',
].join('');

function set(t) {
  stage.set(t);
  const caption = [...captions].reverse().find(([at]) => t >= at);
  document.getElementById('caption').textContent = caption ? caption[1] : '';
  document.getElementById('clock').textContent = `${(t / 1000).toFixed(1)} s of ${(duration / 1000).toFixed(1)} s · silent`;
}

window.__ship = { set, duration, take: name, visits: stage.visits.map(v => ({ place: v.place, kind: v.kind, start: v.start, end: v.end, bites: v.bites })) };
set(Number(params.get('t') ?? 0));
await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
window.__designReady = true;

if (params.get('live') === '1') {
  const t0 = performance.now();
  const tick = now => { set((now - t0) % duration); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

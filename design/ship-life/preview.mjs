// mothership:dev-only
//
// Ship life's design preview (design/ship-life/preview.html): a room with its places alive and a
// visit to its food capsule, in takes the owner can watch one by one. A design preview with
// labelled fixtures: it is not the game, reads no game fact, and decides nothing about food.
//   ?room=<id>      room-a (the default), room-b, command-room, jail or hospital
//   &take=stocked   a place ends its turn and its occupant eats (the capsule fixture: stocked)
//   &take=empty     another opens the capsule and finds it empty (fixture: empty)
//   &take=unknown   the capsule's neutral closed state; no visit is played (fixture: unknown)
//   &take=reduced   Reduce motion: every place at rest, no visit
//   &take=life      every place at work, no visit (the Hospital's only take: no capsule there)
//   &t=<ms>         hold one moment (the render tool sets the clock itself through window.__ship)
//   &live=1         run in real time

import { CREW } from '../crew-drawing/source/crew.mjs';
import { roomOf } from '../room-pilot/rooms.mjs';
import { CAPSULES } from './positions.mjs';
import { planRoom } from './schedule.mjs';
import { roomStage } from './stage.mjs';

window.__designReady = false;

const CREW_SIGN = Object.fromEntries(Object.entries(CREW).map(([id, c]) => [id, c.sign]));

/** Who stands where in Room A: the room pilot's cast, Mira and Vega swapped so Mira's hair walks. */
export const CAST = Object.freeze({ A1: 'c8', A2: 'c1', A3: 'c3', A4: 'c4', A5: 'c9' });

/** Who visits the capsule in each room's takes: one from a seat, one from farther off or another pose. */
const VISITORS = Object.freeze({
  'room-a': { stocked: 'A1', empty: 'A4' },
  'room-b': { stocked: 'B2', empty: 'B4' },
  'command-room': { stocked: 'C1', empty: 'C1' },
  jail: { stocked: 'J1', empty: 'J5' },
});

/** A room's takes: a meal, an empty capsule, unknown availability, Reduce motion, and every place at work. */
export function takesFor(r) {
  const who = VISITORS[r.id];
  const sign = id => CREW_SIGN[(r.id === 'room-a' ? CAST : r.cast)[id]];
  const life = {
    title: `${r.name}: each place at work`,
    capsule: CAPSULES[r.id] ? 'stocked' : 'unknown', visits: [], length: 14000,
    captions: [[0, r.id === 'hospital' ? 'The patients rest: quiet breaths and small moves. No capsule and no visit here.' : 'Every place does its own work, out of step; nothing here is a game action.']],
  };
  if (!who) return { life };
  const extra = {};
  if (r.id === 'room-a') {
    // Three turns end close together: the order is the order turns end; one visitor at the capsule at a time.
    extra.order = {
      title: 'Room A: three turns end close together',
      capsule: 'stocked', length: 16000,
      plan: { turns: [{ seat: 1, place: 'A1', at: 1000 }, { seat: 4, place: 'A4', at: 2400 }, { seat: 2, place: 'A2', at: 3600 }], stops: [{ at: 14400, seat: null }] },
      captions: [
        [0, 'A1, A4 and A2 end their turns in that order. Play goes on; nobody waits for a meal.'],
        [1000, 'A1 (Mira) sets off first. A4 and A2 keep working until the capsule is nearly free.'],
        [6200, 'A4 (Atlas) arrives as A1 leaves: a quick visit, one bite, as A4 waited.'],
        [8200, 'A2 (Vega) sets off as A4 finishes: a quick visit too. Never two at the capsule.'],
        [14400, 'The next phase begins: whatever still plays stops at once; everyone is at their place.'],
      ],
    };
  }
  if (r.id === 'room-b') {
    extra.stop = {
      title: 'Room B: a real event stops a visit',
      capsule: 'stocked', length: 9000,
      plan: { turns: [{ seat: 7, place: 'B2', at: 1200 }], stops: [{ at: 5600, seat: 7 }] },
      captions: [
        [0, 'B2 (Juno) ends the turn and goes to the capsule.'],
        [5600, 'A real move (or an injury, a conversation, the lights out) stops the visit: back at the place in 0.3 s.'],
        [6200, 'The game\'s own animation would play from the place now. The work starts again.'],
      ],
    };
  }
  return {
    life,
    ...extra,
    stocked: {
      title: `${r.name}: work at each place, then a meal after a turn`,
      capsule: 'stocked', visits: [{ place: who.stocked, at: 2200, kind: 'stocked' }], tail: 2600,
      captions: [
        [0, 'Every place does its own work, out of step.'],
        [2200, `${who.stocked} (${sign(who.stocked)}) ends the turn and eats while play goes on.`],
        ['end', `Back at the place, the work starts again. In the game, ${who.stocked} never left it.`],
      ],
    },
    empty: {
      title: `${r.name}: the capsule is empty`,
      capsule: 'empty', visits: [{ place: who.empty, at: 1800, kind: 'empty' }], tail: 2200,
      captions: [
        [0, 'The capsule\'s light is dark glass: empty in this fixture.'],
        [1800, `${who.empty} (${sign(who.empty)}) ends the turn and finds the capsule empty: a small reaction.`],
        ['end', 'Back at the place. Nothing else happens: no penalty, no message.'],
      ],
    },
    unknown: {
      title: `${r.name}: availability unknown`,
      capsule: 'unknown', visits: [], length: 4200,
      captions: [[0, 'Not known: a steel shutter covers the light (never shown as empty). No visit plays.']],
    },
    reduced: {
      title: `${r.name} with Reduce motion`,
      capsule: 'stocked', visits: [], reduced: true, length: 2600,
      captions: [[0, 'Reduce motion: resting poses, a still room, and no visit.']],
    },
  };
}

const params = new URLSearchParams(location.search);
const roomId = params.get('room') ?? 'room-a';
const room = roomOf(roomId);
if (!room) throw new Error(`No room ${roomId}`);
const name = params.get('take') ?? (CAPSULES[roomId] ? 'stocked' : 'life');
const take = takesFor(room)[name];
if (!take) throw new Error(`No take ${name} for ${roomId}`);
const cast = roomId === 'room-a' ? CAST : room.cast;
let visits = take.visits ?? [];
if (take.plan) {
  const slot = id => room.scene.slots.find(x => x.id === id);
  const planned = planRoom(take.plan.turns.map(turn => ({ ...turn, place: slot(turn.place) })), { capsule: CAPSULES[roomId], availability: take.capsule, stops: take.plan.stops ?? [] });
  visits = planned.visits.map(v => ({ place: v.place, start: v.start, kind: v.kind, cancelAt: v.cancelAt }));
  window.__plan = planned.visits.map(v => ({ place: v.place, start: Math.round(v.start), kind: v.kind, waited: Math.round(v.waited), cancelAt: v.cancelAt })).concat(planned.none);
}
const stage = roomStage({ room: roomId, cast, capsule: take.capsule, visits, reduced: Boolean(take.reduced) });
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

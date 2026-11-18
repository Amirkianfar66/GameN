// mothership:dev-only
//
// Ship life's storyboards (design/ship-life/boards.html), each a strip of moments drawn by the live
// stage (./stage.mjs) at their times:
//   ?view=visit&room=<id>&place=<id>&kind=stocked|brief|empty   a visit to the capsule, beat by beat
//   ?view=activities&room=<id>                                 each place's activity: rest, then its moves
//   ?view=devices                                              the four capsules, closed and open, in each state
// A design sheet in desktop Chrome, with labelled fixtures: nothing here is in the game.

import { FRAME } from '../board-motion/figures/body.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { ROOMS, roomOf } from '../room-pilot/rooms.mjs';
import { activityTimeline } from './activities.mjs';
import { storyboard, visitTimeline } from './eating.mjs';
import { ACTIVITIES, CAPSULES } from './positions.mjs';
import { roomStage } from './stage.mjs';

window.__designReady = false;

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
const castOf = r => (r.id === 'room-a' ? { A1: 'c8', A2: 'c1', A3: 'c3', A4: 'c4', A5: 'c9' } : r.cast);

/** A stage brought to time t (stepping its clock so a following hair has followed), shown through a crop [x, y, w, h] at width px. */
function moment(options, t, crop, width, { step = 80 } = {}) {
  const stage = roomStage(options);
  for (let u = 0; u < t; u += step) stage.set(u);
  stage.set(t);
  const [x, y, w, h] = crop, k = width / w;
  const box = el('div', 'crop');
  Object.assign(box.style, { width: `${width}px`, height: `${Math.round(h * k)}px` });
  Object.assign(stage.scene.style, { transform: `translate(${-x * k}px, ${-y * k}px) scale(${k})` });
  box.append(stage.root);
  return box;
}

/** A crop round a place and the room's capsule, wide enough for the walk between. */
function visitCrop(r, slot) {
  const device = CAPSULES[r.id];
  const xs = [slot.at[0] - 120 * slot.scale, slot.at[0] + 120 * slot.scale, device.box[0] - 40, device.box[0] + device.box[2] + 40, device.spot[0] - 70, device.spot[0] + 70];
  const ys = [slot.at[1] - 250 * slot.scale, slot.at[1] + 30, device.box[1] - 40, device.spot[1] + 30];
  const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(1024, Math.max(...xs));
  const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(768, Math.max(...ys));
  return [x0, y0, x1 - x0, y1 - y0];
}

function visitBoard(r, placeId, kind) {
  const slot = r.scene.slots.find(s => s.id === placeId);
  if (!slot || !CAPSULES[r.id]) throw new Error(`No visit from ${placeId} in ${r.name}`);
  const capsule = kind === 'empty' ? 'empty' : 'stocked';
  const visit = visitTimeline(slot, CAPSULES[r.id], { kind, start: 600 });
  const beats = storyboard(visit);
  const crop = visitCrop(r, slot);
  const who = CREW[castOf(r)[placeId]].sign;
  const sheet = el('section', 'board');
  sheet.append(el('h1', null, `${r.name}: ${placeId} (${who}) visits the capsule, ${kind === 'empty' ? 'which is empty' : kind === 'brief' ? 'briefly' : 'and eats'}`));
  sheet.append(el('p', 'lede', `${((visit.end - visit.start) / 1000).toFixed(1)} s from the end of the turn to the work starting again. The fixture is ${capsule}. ${kind === 'brief' ? 'A brief visit is for a visitor who waited for the capsule, or the last player before a phase changes.' : ''} The place stays ${placeId}'s throughout: nothing in the game moves.`));
  const strip = el('div', 'strip');
  beats.forEach((beat, i) => {
    const cell = el('figure', 'cell');
    cell.append(moment({ room: r.id, cast: castOf(r), capsule, visits: [{ place: placeId, at: 600, kind }] }, beat.at, crop, 300));
    const cap = el('figcaption');
    cap.append(el('b', null, `${i + 1}. `), document.createTextNode(beat.label), el('span', 'time', ` ${((beat.at - 600) / 1000).toFixed(2)} s`));
    cell.append(cap);
    strip.append(cell);
  });
  sheet.append(strip);
  return sheet;
}

function activitiesBoard(r) {
  const sheet = el('section', 'board');
  sheet.append(el('h1', null, `${r.name}: what each place does`));
  sheet.append(el('p', 'lede', r.id === 'hospital'
    ? 'The patients rest: quiet breaths, a blink, a small move. No capsule here and no visit; a character who comes in plays none.'
    : 'Each place\'s activity belongs to the place, not to the character: any of the nine does it there. The first frame is the resting pose (also the still pose under Reduce motion); the rest are moments of one cycle.'));
  const cast = castOf(r);
  for (const slot of r.scene.slots.filter(s => cast[s.id])) {
    const row = el('div', 'row');
    const what = ACTIVITIES[slot.id];
    const text = el('div', 'what');
    text.append(el('b', null, `${slot.id} · ${what.name}`), el('span', null, what.does), el('i', null, `Shown by ${CREW[cast[slot.id]].sign}${what.never ? `. Never: ${what.never.toLowerCase()}.` : '.'}`));
    row.append(text);
    const tl = activityTimeline(slot.id, slot.gesture, { seat: 0, until: 30000 });
    const first = tl.keys[1]?.at ?? 0;
    const cycleEnd = tl.keys.find((k, i) => i > 1 && k.sk === tl.rest && k.at > first + 1500)?.at ?? first + 4000;
    const times = [0, ...[0.15, 0.4, 0.62, 0.85].map(f => first + (cycleEnd - first) * f)];
    const s = slot.scale, [ax, ay] = FRAME.anchor, [bx, by] = FRAME.box;
    const crop = [slot.at[0] - (ax - bx + 10) * s, slot.at[1] - (ay - by + 5) * s, 240 * s, 290 * s];
    for (const t of times) {
      const cell = el('figure', 'cell small');
      cell.append(moment({ room: r.id, cast, capsule: 'stocked' }, t, crop, 150), el('figcaption', null, t === 0 ? 'Rest' : `${(t / 1000).toFixed(1)} s`));
      row.append(cell);
    }
    sheet.append(row);
  }
  return sheet;
}

function devicesBoard() {
  const sheet = el('section', 'board');
  sheet.append(el('h1', null, 'The food capsules, in each state'));
  sheet.append(el('p', 'lede', 'One family of devices in the ship\'s comic language, mounted to suit each room: a wall unit (Room A), a counter unit (Room B\'s bench, the Command Room\'s console), the Jail\'s ration hatch, flush in the wall. The Hospital has none. The light says the state without a word or a colour code: a warm glow when stocked, dark glass when empty, a steel shutter over it when not known. Unknown never looks like empty.'));
  const states = [['stocked', 0, 'Stocked, closed'], ['stocked', 1, 'Stocked, open: a portion on the tray'], ['empty', 1, 'Empty, open: a bare tray'], ['empty', 0, 'Empty, closed'], ['unknown', 0, 'Not known: no visit plays']];
  for (const r of ROOMS.filter(x => CAPSULES[x.id])) {
    const row = el('div', 'row');
    const d = CAPSULES[r.id];
    const what = el('div', 'what');
    what.append(el('b', null, `${r.name}: ${d.kind === 'wall' ? 'wall unit' : d.kind === 'counter' ? 'counter unit' : 'ration hatch'}`));
    row.append(what);
    const [x, y, w, h] = d.box;
    const crop = [x - w * 0.9, y - h * 0.35, w * 2.8, h * 1.7];
    for (const [state, open, label] of states) {
      const cell = el('figure', 'cell small');
      cell.append(moment({ room: r.id, cast: {}, capsule: state, capsuleOpen: open }, 0, crop, 150), el('figcaption', null, label));
      row.append(cell);
    }
    sheet.append(row);
  }
  return sheet;
}

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'visit';
const root = document.getElementById('root');
if (view === 'devices') root.append(devicesBoard());
else {
  const r = roomOf(params.get('room') ?? 'room-a');
  if (!r) throw new Error(`No room ${params.get('room')}`);
  root.append(view === 'activities' ? activitiesBoard(r) : visitBoard(r, params.get('place') ?? r.scene.slots[0].id, params.get('kind') ?? 'stocked'));
}
root.append(el('p', 'foot', 'A design sheet in desktop Chrome, drawn by the live stage at each moment. Labelled preview fixtures; nothing here is in the game.'));
await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
window.__designReady = true;

// mothership:dev-only
//
// Ship life's framing sheets (design/ship-life/framings.html): each room in the phone's room view,
// today's framing beside a tenth and a fifth wider (./framing.mjs), on a narrow, a middle and a
// larger phone, with every place's position id, its 44-pixel press area as the pack lays it, the
// food capsule and where its visitor stands. The bars are drawn as the space they take, not as the
// pack draws them: the pack's own screens are the specification for those.
//   ?room=<id>        one room (room-a by default), three phones by three framings
//   ?view=board       the whole-board overview at the pack's panel sizes, with the capsules
// A design sheet in desktop Chrome: it shows framings and art, not how a phone runs them.

import { frameScene } from '../board-motion/scenes/frame.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { ROOMS, roomOf } from '../room-pilot/rooms.mjs';
import { REACH } from './extend.mjs';
import { ZOOMS, frameReport, overlaps, pressRects, roomFrame } from './framing.mjs';
import { CAPSULES } from './positions.mjs';
import { roomStage } from './stage.mjs';

window.__designReady = false;

/** The phones the pack reviews (design/phone-ui): CSS size and safe areas; the bars' heights are the pack's (kit.css). */
export const PHONES = Object.freeze([
  Object.freeze({ id: '320x568', width: 320, height: 568, safeTop: 20, safeBottom: 0, name: 'Narrow phone, 320 × 568' }),
  Object.freeze({ id: '390x844', width: 390, height: 844, safeTop: 47, safeBottom: 34, name: 'Phone, 390 × 844' }),
  Object.freeze({ id: '430x932', width: 430, height: 932, safeTop: 47, safeBottom: 34, name: 'Larger phone, 430 × 932' }),
]);
const BAR = 52, TABS = 58;

/** Who stands where on the sheets: the room pilot's cast; the Jail full; Room A as in the previews. */
const castOf = r => (r.id === 'room-a' ? { A1: 'c8', A2: 'c1', A3: 'c3', A4: 'c4', A5: 'c9' } : r.cast);

const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };

/** One phone: the bars' space, and the room view between them in one framing, with its overlays. */
function phone(r, spec, z) {
  const top = spec.safeTop + BAR, bottom = spec.safeBottom + TABS;
  const panel = { width: spec.width, height: spec.height - top - bottom, cap: 46, pad: 8 };
  const cast = castOf(r);
  const slots = r.scene.slots.filter(slot => cast[slot.id]);
  const frame = roomFrame(r.scene, panel, slots, { zoom: z.zoom, room: r.id });
  const box = el('div', 'phone');
  Object.assign(box.style, { width: `${spec.width}px`, height: `${spec.height}px` });
  const bar = el('div', 'bar top', 'Top bar'); Object.assign(bar.style, { height: `${top}px` });
  const tabs = el('div', 'bar tabs', 'Tabs'); Object.assign(tabs.style, { height: `${bottom}px` });
  const view = el('div', 'view');
  Object.assign(view.style, { top: `${top}px`, width: `${panel.width}px`, height: `${panel.height}px` });
  // The room, still (everyone in the resting pose), its ambient held still, the capsule stocked.
  const stage = roomStage({ room: r.id, cast, capsule: CAPSULES[r.id] ? 'stocked' : 'unknown', reduced: true, extend: z.zoom < 1 });
  stage.set(0);
  Object.assign(stage.scene.style, { transform: `translate(${frame.tx}px, ${frame.ty}px) scale(${frame.k})` });
  view.append(stage.root);
  // The overlays, in the view's own pixels: press areas, tags, the capsule and the visitor's spot.
  const rects = pressRects(slots, panel, frame);
  for (const rect of rects) {
    const ring = el('span', 'press');
    Object.assign(ring.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` });
    view.append(ring);
    const tag = el('span', 'tag');
    tag.append(el('b', 'num', rect.id), el('span', null, CREW[cast[rect.id]].sign));
    const tagTop = Math.min(panel.height - panel.pad - 26, rect.top + rect.side - 2);
    Object.assign(tag.style, { left: `${Math.min(panel.width - 40, Math.max(40, rect.left + rect.side / 2))}px`, top: `${tagTop}px` });
    view.append(tag);
  }
  const device = CAPSULES[r.id];
  let deviceIn = null;
  if (device) {
    const [x, y, w, h] = device.box;
    const mark = el('span', 'device');
    const left = frame.tx + x * frame.k, topPx = frame.ty + y * frame.k;
    Object.assign(mark.style, { left: `${left - 3}px`, top: `${topPx - 3}px`, width: `${w * frame.k + 6}px`, height: `${h * frame.k + 6}px` });
    view.append(mark);
    const spot = el('span', 'spot');
    Object.assign(spot.style, { left: `${frame.tx + device.spot[0] * frame.k}px`, top: `${frame.ty + device.spot[1] * frame.k}px` });
    view.append(spot);
    deviceIn = left >= 0 && left + w * frame.k <= panel.width;
  }
  view.append(el('div', 'room-name', r.name));
  box.append(view, bar, tabs);
  const report = frameReport(frame, panel);
  const shared = overlaps(rects);
  const facts = [
    `${Math.round(report.across)} × ${Math.round(report.down)} units seen (${(frame.k * 100).toFixed(1)}%)`,
    device ? (deviceIn ? 'Capsule in view' : 'Capsule outside the view') : 'No capsule (the Hospital)',
    shared.length ? `Press areas overlap: ${shared.map(([a, b]) => `${a}/${b}`).join(', ')}` : 'No press areas overlap',
  ];
  const cell = el('figure', 'cell');
  cell.append(el('figcaption', 'what', z.chosen ? `${z.name} · the owner's choice` : z.name), box);
  const ul = el('ul', 'facts');
  for (const f of facts) ul.append(el('li', null, f));
  cell.append(ul);
  return { cell, stage, report, deviceIn, overlaps: shared, frame };
}

/** The board overview: each room in the pack's board panel, the game's own framing, the capsules drawn, everyone at rest. */
function board() {
  const spec = PHONES[1];
  const top = spec.safeTop + BAR, bottom = spec.safeBottom + TABS;
  const gap = 6, x0 = 6, y0 = 6, w = spec.width - 12, hAvail = spec.height - top - bottom - 12;
  const rowH = [0.25, 0.41, 0.34].map(f => Math.floor((hAvail - 2 * gap) * f));
  const half = Math.floor((w - gap) / 2), commandW = Math.floor((w - gap) * 0.64);
  const boxes = {
    'command-room': [x0, y0, commandW, rowH[0]],
    'room-a': [x0, y0 + rowH[0] + gap, half, rowH[1]], 'room-b': [x0 + half + gap, y0 + rowH[0] + gap, w - half - gap, rowH[1]],
    hospital: [x0, y0 + rowH[0] + rowH[1] + 2 * gap, half, rowH[2]], jail: [x0 + half + gap, y0 + rowH[0] + rowH[1] + 2 * gap, w - half - gap, rowH[2]],
  };
  const box = el('div', 'phone');
  Object.assign(box.style, { width: `${spec.width}px`, height: `${spec.height}px` });
  const view = el('div', 'view');
  Object.assign(view.style, { top: `${top}px`, width: `${spec.width}px`, height: `${spec.height - top - bottom}px` });
  for (const r of ROOMS) {
    const [left, topPx, width, height] = boxes[r.id];
    const panelBox = el('section', 'board-panel');
    Object.assign(panelBox.style, { left: `${left}px`, top: `${topPx}px`, width: `${width}px`, height: `${height}px` });
    const frame = frameScene(r.scene, { width, height, cap: 30, pad: 4 });
    const stage = roomStage({ room: r.id, cast: castOf(r), capsule: CAPSULES[r.id] ? 'stocked' : 'unknown', reduced: true });
    stage.set(0);
    Object.assign(stage.scene.style, { transform: `translate(${frame.tx}px, ${frame.ty}px) scale(${frame.k})` });
    panelBox.append(stage.root, el('div', 'room-name small', r.name));
    view.append(panelBox);
  }
  const capBox = el('section', 'board-panel talk', 'Talk');
  Object.assign(capBox.style, { left: `${x0 + commandW + gap}px`, top: `${y0}px`, width: `${w - commandW - gap}px`, height: `${rowH[0]}px` });
  view.append(capBox);
  box.append(view, Object.assign(el('div', 'bar top', 'Top bar'), { style: `height:${top}px` }), Object.assign(el('div', 'bar tabs', 'Tabs'), { style: `height:${bottom}px` }));
  return box;
}

const params = new URLSearchParams(location.search);
const root = document.getElementById('root');
const report = {};
if (params.get('view') === 'board') {
  document.documentElement.dataset.view = 'board';
  root.append(el('h1', null, 'The whole board, with the food capsules'));
  root.append(el('p', 'lede', 'The board overview keeps the game\'s own framing in each panel. At this size the capsules are drawn and their lights show the fixture (stocked here), everyone holds the resting pose, and no activity or visit plays: the overview is a map, and its figures are too small to read a gesture.'));
  root.append(board());
} else {
  const r = roomOf(params.get('room') ?? 'room-a');
  if (!r) throw new Error(`No room ${params.get('room')}`);
  root.append(el('h1', null, `${r.name}: today's framing and two wider ones`));
  root.append(el('p', 'lede', `The room is drawn smaller; the interface is not: the bars, the tags and the 44-pixel press areas (dashed rings) keep their size. A wider framing keeps the people clear of the sides and, where they fit, the food capsule (dashed box) and the spot its visitor stands on (dot); the ceiling and deck past the approved picture are its extension, ${REACH} units each way. Position ids are the game's; names are the preview cast.`));
  for (const spec of PHONES) {
    const row = el('section', 'row');
    row.append(el('h2', null, spec.name));
    const cells = el('div', 'cells');
    for (const z of ZOOMS) {
      const made = phone(r, spec, z);
      cells.append(made.cell);
      report[`${spec.id}:${z.id}`] = { k: Number(made.frame.k.toFixed(4)), across: Math.round(made.report.across), down: Math.round(made.report.down), capsuleInView: made.deviceIn, overlaps: made.overlaps };
    }
    row.append(cells);
    root.append(row);
  }
  root.append(el('p', 'foot', 'A design sheet in desktop Chrome. The extension, the capsule and the activities are design proposals, in no release and not in the game.'));
}
window.__framings = report;
await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
window.__designReady = true;

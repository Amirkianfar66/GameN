// mothership:dev-only
//
// The Room ↔ Board zoom's preview: one stage (the space between the bars at a development phone size) holding the
// two views the game switches between: the room view, the room scene (../../room-scene/room-scene.mjs), and the
// board, the pack's own paintBoard (design/phone-ui/prototype/screens.mjs) standing in for Frontend's Board V2, on
// the pack's synthetic fixtures. The runtime component (../view-zoom.mjs) switches them. Not the game, not a release.
//   ?single=1&size=<390x844|430x932>&to=<board|room>&t=<ms>[&panel=none]: one stage, its switch held at t, for a capture
//   ?probe=1: the probe (probe.mjs)

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { ZOOM_TIMING, VIEW_ZOOM_VERSION, zoomRoomBoard } from '../view-zoom.mjs';
import { mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { paintScene } from '../../../prototype/screens.mjs';
import { ROOM_FIXTURES, board as boardOf } from '../../../prototype/fixtures.mjs';

// The release's room pictures and the room scene's extension, on the CSS properties the game's bundles define.
const style = document.documentElement.style;
for (const art of Object.values(ROOM_ART)) {
  for (const { property, file } of [art.back, ...art.layers, art.dark]) style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/${file}`, import.meta.url).href}")`);
}
for (const ext of Object.values(ROOM_EXTENSION)) {
  for (const { property, file } of [ext.lit, ext.dark]) style.setProperty(property, `url("${new URL(`../../room-scene/assets/${file}`, import.meta.url).href}")`);
}

/** The stage, the space between the shell's bars, at each development size (the shell's: 99 px above, 92 below). */
export const STAGES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844 - 99 - 92 }),
  '430x932': Object.freeze({ width: 430, height: 932 - 99 - 92 }),
});
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
const fixture = ROOM_FIXTURES['room-a'];
const seats = boardOf({ place: fixture.place });
const people = seats.filter(p => p.location === 'Room A').map(p => ({ seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null }));

let packLoaded = null;
/** The pack's own stylesheets, and the rooms' pictures its index page loads: the board stand-in is the pack's drawing. */
export function loadPack() {
  // Literal URLs, so the bundler carries each file (a computed one would be left for run time).
  packLoaded ??= Promise.all([new URL('../../../prototype/kit.css', import.meta.url), new URL('../../../prototype/screens.css', import.meta.url),
    new URL('../../../../board-motion/assets/board-motion.scenes.css', import.meta.url)].map(url => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error(`${url.pathname} did not load`)); });
    document.head.prepend(link);
    return loaded;
  }));
  return packLoaded;
}

/**
 * One stage with both views, each filling it: the room view (the room scene, Room A, as the viewer, Dev, sees it)
 * and the board (the pack's own, the viewer's room Room A). Returns { stage, room, board, panel(), dispose() }:
 * panel() is the viewer's room's panel in the stage's coordinates, as Frontend reads it from Board V2's layout.
 */
export function mountStage(parent, sizeKey, { view = 'room' } = {}) {
  const { width, height } = STAGES[sizeKey];
  const stage = document.createElement('div');
  stage.className = 'pv-stage';
  Object.assign(stage.style, { width: `${width}px`, height: `${height}px` });
  parent.append(stage);
  const room = document.createElement('div');
  room.className = 'pv-view pv-room';
  const board = document.createElement('div');
  board.className = 'ph pv-view pv-board';
  stage.append(board, room);
  const scene = mountRoomScene(room, { room: 'room-a', roster: 9, people, active: 7, versions, clock, control: null, roomArt: ROOM_ART_RELEASE, self: 4, size: { width, height } });
  paintScene(board, { width, height, top: 0, bottom: 0 }, { kind: 'board', room: 'room-a', active: 7 });
  (view === 'room' ? board : room).hidden = true;
  // The panel's layout box in the board, which fills the stage: a transform (the zoom's own) does not change it.
  // Read while the board is shown, as Frontend reads it from Board V2's layout.
  const panel = () => {
    const p = board.querySelector('.board-panel[aria-label="Room A"]');
    return { left: p.offsetLeft, top: p.offsetTop, width: p.offsetWidth, height: p.offsetHeight };
  };
  return { stage, room, board, scene, panel, dispose() { scene.dispose(); stage.remove(); } };
}

/** Frontend's part around the zoom: show the incoming view, zoom, and hide the outgoing one when it settles. */
export function switchTo(s, to, options = {}) {
  const incoming = to === 'board' ? s.board : s.room, outgoing = to === 'board' ? s.room : s.board;
  incoming.hidden = false;
  outgoing.hidden = false;
  const z = zoomRoomBoard({ room: s.room, board: s.board, panel: options.panel === undefined ? s.panel() : options.panel, to,
    reducedMotion: options.reducedMotion ?? false, hold: options.hold ?? null });
  z.finished.then(outcome => { if (outcome !== 'cancelled') outgoing.hidden = true; });
  return z;
}

const params = new URLSearchParams(location.search);
async function main() {
  await loadPack();
  const single = params.has('single');
  document.body.classList.toggle('pv-single', single);
  if (params.has('probe')) return true;
  if (single) {
    // One switch held at a moment of it, for a capture.
    const sizeKey = params.get('size') ?? '390x844', to = params.get('to') ?? 'board', t = Number(params.get('t') ?? 0);
    const s = mountStage(document.body, sizeKey, { view: to === 'board' ? 'room' : 'board' });
    await document.fonts.ready;
    const z = switchTo(s, to, { panel: params.get('panel') === 'none' ? null : undefined });
    for (const a of [...s.room.getAnimations(), ...s.board.getAnimations()]) { a.pause(); a.currentTime = t; }
    window.__stage = { s, z };
    return true;
  }
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Room ↔ Board zoom · preview</h1><p>${VIEW_ZOOM_VERSION}: ${ZOOM_TIMING.zoom} ms from the viewer's room's panel; ${ZOOM_TIMING.crossfade} ms crossfade with no room; direct with Reduce motion or a held Blackout window. The room scene and the pack's board, on synthetic fixtures.</p>`;
  document.body.append(head);
  const s = mountStage(document.body, '390x844');
  await document.fonts.ready;
  const bar = document.createElement('div');
  bar.className = 'pv-bar';
  let view = 'room';
  for (const [label, options] of [['Switch', {}], ['Switch, no room', { panel: null }], ['Switch, Reduce motion', { reducedMotion: true }], ['Switch, Blackout held', { hold: true }]]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => { view = view === 'room' ? 'board' : 'room'; switchTo(s, view, options); });
    bar.append(b);
  }
  document.body.append(bar);
  return true;
}

const ready = main();
window.__viewZoom = {
  ready: ready.then(() => true),
  // Started only when the page asks; the check reads it as a promise. A literal import, so the bundler carries it.
  probe: params.has('probe') ? ready.then(() => import('./probe.mjs')).then(m => m.runViewZoomProbe())
    .catch(error => ({ mode: 'full', ok: false, error: String(error?.stack ?? error), checks: [] })) : null,
};

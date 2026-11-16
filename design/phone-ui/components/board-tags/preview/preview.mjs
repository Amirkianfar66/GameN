// mothership:dev-only
//
// The board tags' preview: the pack's own board (design/phone-ui/prototype/screens.mjs paintBoard, with art.mjs,
// kit.css and screens.css), standing in for Frontend's Board V2, with the runtime component (../board-tags.mjs) in
// each of its panels in place of the pack's tags, on the pack's synthetic fixtures. The people's anchors come from
// the game's own slot rectangles (apps/game/hosted/board-v2-drawing/fit-four.mjs slotRects, as Board V2 and the
// pack use), so the component is given what Board V2 gives it. Not the game, not a release.
//   ?single=1&state=<state>&size=<390x844|430x932|320x568>&text=<100|150|200>[&mode=pack]: one phone, for a capture
//   ?probe=1 / ?agree=1: the lifecycle probe (probe.mjs), or the agreement with sheet 26 (agree.mjs)

import { mountBoardTags, BOARD_TAGS_VERSION } from '../board-tags.mjs';
import { game, turnBar, seatsFor } from '../../../prototype/screens.mjs';
import { GAME_SCREENS } from '../../../prototype/screens-game.mjs';
import { BOARD_ROOMS, ROOM_NAMES, ROOM_OF, LOCATION_OF, paintCapsule, paintRoom } from '../../../prototype/art.mjs';
import { caption, h, pill } from '../../../prototype/ui.mjs';
import { ROOM_FIXTURES, SELF } from '../../../prototype/fixtures.mjs';
import { slotRects } from '../../../../../apps/game/hosted/board-v2-drawing/fit-four.mjs';
import { capsuleTargets } from '../../../../../apps/game/hosted/board-v2-drawing/capsule-scene.mjs';
import { turnsLayout } from '../../../../../apps/game/hosted/board-v2-drawing/turns.mjs';
import { BOARD_STATES, CAPTURES } from './states.mjs';

export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '320x568': Object.freeze({ width: 320, height: 568, insets: Object.freeze({ top: 20, bottom: 0 }) }),
});
/** The pack's board panels (screens.mjs paintBoard): a 30 px caption band and a 4 px inset. */
const PANEL = Object.freeze({ cap: 30, pad: 4 });
/**
 * The safe areas Board V2's layout is given. 390 and 430 keep the review frames' (47 and 34 px), the smaller panels.
 * 320 × 568 has none, as in a browser tab: with the pack's 20 px status bar Board V2 does not fit the board there
 * at any text size and shows its too-short message, so its 141 px panels exist only without it.
 */
export const GAME_INSETS = Object.freeze({ '390x844': { top: 47, bottom: 34 }, '430x932': { top: 47, bottom: 34 }, '320x568': { top: 0, bottom: 0 } });

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

/** A phone of the pack's (kit.css .ph) at a development size, with the review frames' safe areas. */
export function phone(sizeKey, { left = 0, top = 0, parent = document.body } = {}) {
  const { width, height, insets } = PREVIEW_SIZES[sizeKey];
  const frame = document.createElement('div');
  frame.className = 'ph pv-phone';
  Object.assign(frame.style, { position: 'relative', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  frame.style.setProperty('--safe-t', `${insets.top}px`);
  frame.style.setProperty('--safe-b', `${insets.bottom}px`);
  parent.append(frame);
  return frame;
}

/** The seats, offices and turn a state's board shows: what the pack's paintScene draws from the same scene. */
export function boardOf(stateKey) {
  const s = BOARD_STATES[stateKey].scene;
  const fixture = ROOM_FIXTURES[s.room ?? 'room-a'];
  return { scene: s, seats: s.seats ?? seatsFor(fixture, { roster: 9 }), offices: s.offices ?? fixture.offices, active: s.active ?? fixture.active };
}

/** The pack draws the state's board into the phone: sheet 26's own frames through its board screen, the rest through game(). */
export function drawBoard(frame, stateKey) {
  const st = BOARD_STATES[stateKey];
  if (st.frame) {
    const [screen, ...rest] = st.frame.split('&');
    GAME_SCREENS[screen](frame, Object.fromEntries(rest.map(kv => kv.split('=').map(decodeURIComponent))));
  } else {
    game(frame, { top: turnBar({ active: st.scene.active }), scene: st.scene, tabs: { hero: 'pass-off' } });
  }
}

/**
 * The board as Board V2 lays it out (turnsLayout, as apps/game/hosted/board-v2-host.mjs calls it: the safe areas,
 * the bars it reserves at the larger text, the actions row), each panel drawn by the pack's own paintRoom and
 * paintCapsule, with the pack's caption and "You" pill. The tags are measured in the game's own panels. Where the
 * board does not fit, Board V2 says so, and so does this. The bars' space is left empty: they are the shell's.
 */
export function drawGameBoard(frame, stateKey, sizeKey, text = 100) {
  const { width, height } = PREVIEW_SIZES[sizeKey], insets = GAME_INSETS[sizeKey];
  const { scene, seats, offices, active } = boardOf(stateKey);
  const ratio = text / 100;
  const layout = turnsLayout({ width, height }, 9, { insets: { top: insets.top, right: 0, bottom: insets.bottom, left: 0 },
    bars: ratio > 1 ? { top: Math.ceil(36 + 88 * (ratio - 1)) } : undefined, actions: ratio >= 2 ? 64 : 44 });
  frame.dataset.fits = String(layout.fits);
  if (!layout.fits) {
    frame.append(h('p.pv-too-short', 'This screen is too short to show the board. Use a taller view or reduce the text size.'));
    return { fits: false };
  }
  const own = seats.find(s => s.seat === SELF);
  const common = { roster: 9, seats, self: SELF, active, offices, targets: scene.targets ?? null, picked: [], dimOthers: scene.dimOthers ?? !!scene.targets };
  for (const room of [...BOARD_ROOMS, 'capsule']) {
    const box = layout.board.boxes[room], spec = layout.board.panels[room];
    const label = room === 'capsule' ? CAPSULE : ROOM_NAMES[room];
    const panel = h('section.board-panel', { 'aria-label': label, 'data-current': room !== 'capsule' && own?.location === ROOM_NAMES[room] ? '' : null,
      'data-cap': String(spec.cap ?? PANEL.cap), 'data-pad': String(spec.pad ?? PANEL.pad),
      style: { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` } });
    const inner = h('div', { style: { position: 'absolute', inset: '0' } });
    panel.append(inner);
    frame.append(panel);
    if (room === 'capsule') paintCapsule(inner, { width: box.width, height: box.height, pair: scene.talk ?? [], seats, busy: !!scene.talk, self: SELF });
    else paintRoom(inner, { ...common, room, width: box.width, height: box.height, cap: spec.cap ?? PANEL.cap, pad: spec.pad ?? PANEL.pad, compact: true, slots: scene.slotsByRoom?.[room] ?? null });
    panel.append(h('div.room-label', caption(room === 'capsule' ? 'Talk' : ROOM_NAMES[room])));
    if (room !== 'capsule' && own?.location === ROOM_NAMES[room]) panel.append(h('span.here', pill('You', { icon: 'self', tone: 'accent' })));
  }
  return { fits: true, layout };
}

const CAPSULE = 'Private talk';
const boxIn = (panel, node) => {
  if (!node) return null;
  const p = panel.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height };
};

/**
 * Each panel's input, as Frontend gives it from Board V2: the panel's size, what is drawn over it (the caption and
 * the "You" pill), and its people with their press points and the feet of their press areas.
 */
export function panelInputs(frame, stateKey, { viewer = SELF, status = 'live' } = {}) {
  const { scene, seats, offices, active } = boardOf(stateKey);
  const dimOf = room => (scene.dimOthers && scene.targets ? room.filter(s => !scene.targets.includes(s.seat)).map(s => s.seat) : []);
  const officeOf = seat => (offices?.captain === seat ? 'captain' : offices?.officer === seat ? 'officer' : null);
  return [...frame.querySelectorAll('.board-panel')].map(panel => {
    const size = { width: parseFloat(panel.style.width), height: parseFloat(panel.style.height) };
    const geometry = { cap: Number(panel.dataset.cap ?? PANEL.cap), pad: Number(panel.dataset.pad ?? PANEL.pad) };
    const keepClear = [panel.querySelector(':scope > .room-label'), panel.querySelector(':scope > .here')].map(n => boxIn(panel, n)).filter(Boolean);
    const label = panel.getAttribute('aria-label');
    let people;
    if (label === CAPSULE) {
      // The capsule seats the two (capsule-scene.mjs capsuleTargets); sheet 26 sets each tag 2 px under its seat.
      const targets = capsuleTargets(size);
      people = (scene.talk ?? []).map((seatNo, i) => {
        const s = seats.find(x => x.seat === seatNo), t = targets[i];
        return { seat: s.seat, name: s.name, health: 'Healthy', office: null, at: { x: t.left + t.side / 2, bottom: t.top + t.side + 8 } };
      });
    } else {
      const room = ROOM_OF[label];
      const rects = new Map(slotRects(room, 9, { ...size, ...geometry }).map(r => [r.id, r]));
      const here = seats.filter(s => s.location === LOCATION_OF[room] && rects.has(s.slot));
      people = here.map(s => {
        const r = rects.get(s.slot);
        return { seat: s.seat, name: s.name, health: s.health, office: officeOf(s.seat), at: { x: r.left + r.side / 2, bottom: r.top + r.side } };
      });
      return { panel, input: { status, versions: null, size, keepClear, people, active, viewer, dim: dimOf(here) } };
    }
    return { panel, input: { status, versions: null, size, keepClear, people, active, viewer, dim: [] } };
  });
}

/** The component in each panel, in place of the pack's tags. */
export function mountLayers(frame, stateKey, options = {}) {
  for (const tag of frame.querySelectorAll('.board-panel .tag')) tag.remove();
  return panelInputs(frame, stateKey, options).map(({ panel, input }) => ({ panel, input, layer: mountBoardTags(panel, input) }));
}

const params = new URLSearchParams(location.search);
async function main() {
  await loadPack();
  const single = params.has('single');
  document.body.classList.toggle('pv-single', single);
  if (params.has('probe') || params.has('agree')) return { layers: [] };
  if (single) {
    const stateKey = params.get('state') ?? 'board', sizeKey = params.get('size') ?? '390x844', text = Number(params.get('text') ?? 100);
    document.documentElement.style.fontSize = text === 100 ? '' : `${text}%`;
    const frame = phone(sizeKey);
    // The game's panels (Board V2's arrangement); ?mode=pack: the pack's own frame, with its own tags.
    if (params.get('mode') === 'pack') { drawBoard(frame, stateKey); return { layers: [] }; }
    const drawn = drawGameBoard(frame, stateKey, sizeKey, text);
    await document.fonts.ready;
    return { layers: drawn.fits ? mountLayers(frame, stateKey, { status: BOARD_STATES[stateKey].status ?? 'live' }) : [] };
  }
  // The gallery, at the Standard text: the larger text is captured one phone at a time (the root's size is the page's).
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Board tags · preview</h1><p>${BOARD_TAGS_VERSION}: sheet 26's tag in each panel of the pack's own board, whole and apart (#222 item 34). Synthetic fixtures. The larger text is in the check's captures.</p>`;
  document.body.append(head);
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(grid);
  const drawn = [];
  for (const c of CAPTURES.filter(x => x.text === 100)) {
    const cell = document.createElement('figure');
    cell.className = 'pv-cell';
    cell.innerHTML = `<figcaption>${BOARD_STATES[c.state].caption}<small>${c.size} · ${c.state} · Board V2's panels</small></figcaption>`;
    grid.append(cell);
    const frame = phone(c.size, { parent: cell });
    drawGameBoard(frame, c.state, c.size);
    drawn.push({ frame, state: c.state });
  }
  await document.fonts.ready;
  return { layers: drawn.map(d => mountLayers(d.frame, d.state, { status: BOARD_STATES[d.state].status ?? 'live' })) };
}

const ready = main();
// Literal imports, so the bundler carries both modules (a computed one would be left for run time).
const run = (load, name) => ready.then(load).then(m => m[name]({ sizes: PREVIEW_SIZES }))
  .catch(error => ({ mode: name, ok: false, error: String(error?.stack ?? error), checks: [] }));
window.__boardTags = {
  ready: ready.then(() => true),
  // Started only when the page asks for them; the check reads each as a promise.
  probe: params.has('probe') ? run(() => import('./probe.mjs'), 'runBoardTagsProbe') : null,
  agree: params.has('agree') ? run(() => import('./agree.mjs'), 'runBoardTagsAgreement') : null,
};

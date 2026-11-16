// The Room ↔ Board zoom: Designer's runtime component (sheet 26; the handoff's motion table).
//
//   | Room ↔ Board        | 450 ms zoom from the current room's panel | Reduce motion: Direct |
//   | Tab or state change | 220 ms crossfade                          | Reduce motion: Direct |
// "None of these sets a deadline, and a missed animation never blocks a control." Switching views is Frontend's
// local navigation and never sends MOVE.
//
// zoomRoomBoard() animates the two views Frontend already shows: the room view (the room scene, or the capsule
// while talking) and Board V2's board, each filling the stage. Room → Board: the board grows out of the viewer's
// room's panel, from the panel covering the stage to the board's own layout, in 450 ms on the kit's ease; the room
// view shrinks into the panel with it, fading out in the first 180 ms. Board → Room: the reverse, the room view
// fading in over the last 180 ms. With no room, the 220 ms crossfade. Direct with Reduce motion (the game's or the
// device's) and while a Blackout window is held (the handoff's Blackout rule: nothing re-centres, zooms or moves a
// press area while a Disabler may be choosing).
// The outgoing view takes no taps from the start of the switch; the incoming view takes taps throughout, wherever
// it is drawn. A switch partway through cancels the running zoom and starts from where the views are. It animates
// only transform and opacity, with the Web Animations API, and sets the outgoing view's pointer-events and the
// room view's stacking for the switch; when finished settles, or on cancel(), all of it is removed.

export const VIEW_ZOOM_VERSION = 'view-zoom-0.1.0';

/** The handoff's timings and the kit's ease (--ms-k-ease). */
export const ZOOM_TIMING = Object.freeze({ zoom: 450, fade: 180, crossfade: 220, ease: 'cubic-bezier(0.2, 0, 0, 1)' });

const running = new WeakMap();
const finite = v => typeof v === 'number' && Number.isFinite(v);
const IDENTITY = 'translate(0px, 0px) scale(1)';

/** Whether a Blackout window holds the views: the room scene's hold (true, or the window's id). */
const held = hold => hold === true || (typeof hold === 'string' && hold.length > 0);

function check({ room, board, panel, to, reducedMotion, hold }) {
  const element = n => n && n.nodeType === 1 && typeof n.ownerDocument === 'object';
  if (!element(room) || !element(board)) throw new TypeError('zoomRoomBoard needs the room view and the board, as elements');
  if (room === board) throw new TypeError('The room view and the board are two elements');
  if (!['board', 'room'].includes(to)) throw new TypeError(`to is 'board' or 'room', not ${JSON.stringify(to)}`);
  if (panel !== null && (typeof panel !== 'object' || !['left', 'top', 'width', 'height'].every(k => finite(panel[k])) || panel.width <= 0 || panel.height <= 0)) {
    throw new TypeError('panel is the viewer\'s room\'s panel, { left, top, width, height } in the stage, or null');
  }
  if (typeof reducedMotion !== 'boolean') throw new TypeError('reducedMotion is true or false');
  if (!(hold === null || hold === false || hold === true || (typeof hold === 'string' && hold.length > 0))) throw new TypeError('hold is null, false, true, or a Blackout window\'s id');
}

/**
 * The transforms of a zoom from `panel`: T scales the board about the panel so that the panel covers the stage,
 * centred; its inverse sets the room view (the stage's size) into the panel. Both with their origin at the stage's
 * top left.
 */
export function zoomGeometry(stage, panel) {
  const s = Math.max(stage.width / panel.width, stage.height / panel.height);
  const tx = stage.width / 2 - s * (panel.left + panel.width / 2), ty = stage.height / 2 - s * (panel.top + panel.height / 2);
  return { scale: s, tx, ty, cover: `translate(${tx}px, ${ty}px) scale(${s})`, into: `translate(${-tx / s}px, ${-ty / s}px) scale(${1 / s})` };
}

/**
 * Switches the views. `room` and `board` are the two view elements; `panel` the viewer's own room's panel on the
 * board in the stage's coordinates (null with no room); `to` 'board' or 'room'; `reducedMotion` the game's Reduce
 * motion (the device's is read too); `hold` a held Blackout window. Returns { finished, cancel() }: finished resolves
 * 'done', 'direct' or 'cancelled'. Frontend shows the incoming view before the call and hides the outgoing one when
 * finished settles (its callback runs before the next frame).
 */
export function zoomRoomBoard({ room, board, panel = null, to, reducedMotion = false, hold = null } = {}) {
  check({ room, board, panel, to, reducedMotion, hold });
  const view = room.ownerDocument.defaultView;
  const deviceReduced = !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // A switch partway through: take over from where the views are, then cancel the running one.
  const previous = running.get(room) ?? running.get(board);
  const from = previous ? { room: snapshot(room), board: snapshot(board) } : null;
  previous?.cancel();
  if (reducedMotion || deviceReduced || held(hold) || typeof board.animate !== 'function') {
    return { finished: Promise.resolve('direct'), cancel() {} };
  }

  const outgoing = to === 'board' ? room : board;
  const kept = { outgoing: outgoing.style.pointerEvents, roomZ: room.style.zIndex };
  // The outgoing view takes no taps from the start; the room view is drawn over the board for the switch.
  outgoing.style.pointerEvents = 'none';
  room.style.zIndex = String((parseInt(view.getComputedStyle(board).zIndex, 10) || 0) + 1);

  const { zoom, fade, crossfade, ease } = ZOOM_TIMING;
  const timing = (duration, extra = {}) => ({ duration, easing: ease, fill: 'both', ...extra });
  const animations = [];
  const run = (el, frames, t) => { const a = el.animate(frames, t); animations.push(a); return a; };
  if (panel === null) {
    // No room: the tab change's crossfade.
    const incoming = to === 'board' ? board : room;
    run(incoming, [{ opacity: from?.[incoming === room ? 'room' : 'board'].opacity ?? 0 }, { opacity: 1 }], timing(crossfade));
    run(outgoing, [{ opacity: from?.[outgoing === room ? 'room' : 'board'].opacity ?? 1 }, { opacity: 0 }], timing(crossfade));
  } else {
    const g = zoomGeometry({ width: board.offsetWidth, height: board.offsetHeight }, panel);
    const tf = (transform, origin = true) => ({ transform, ...(origin ? { transformOrigin: '0 0' } : {}) });
    if (to === 'board') {
      run(board, [tf(from?.board.transform ?? g.cover), tf(IDENTITY)], timing(zoom));
      run(room, [tf(from?.room.transform ?? IDENTITY), tf(g.into)], timing(zoom));
      run(room, [{ opacity: from?.room.opacity ?? 1 }, { opacity: 0 }], timing(fade));
    } else {
      run(board, [tf(from?.board.transform ?? IDENTITY), tf(g.cover)], timing(zoom));
      run(room, [tf(from?.room.transform ?? g.into), tf(IDENTITY)], timing(zoom));
      run(room, [{ opacity: from?.room.opacity ?? 0 }, { opacity: 1 }], timing(fade, { delay: zoom - fade }));
    }
  }

  let settle;
  const finished = new Promise(done => { settle = done; });
  let settled = false;
  const end = outcome => {
    if (settled) return;
    settled = true;
    for (const a of animations) a.cancel();
    outgoing.style.pointerEvents = kept.outgoing;
    room.style.zIndex = kept.roomZ;
    if (running.get(room) === handle) running.delete(room);
    if (running.get(board) === handle) running.delete(board);
    settle(outcome);
  };
  const handle = { cancel: () => end('cancelled') };
  running.set(room, handle);
  running.set(board, handle);
  Promise.all(animations.map(a => a.finished)).then(() => end('done'), () => end('cancelled'));
  return { finished, cancel: handle.cancel };
}

/** Where a view is now: its computed transform and opacity, mid-animation included. */
function snapshot(el) {
  const style = el.ownerDocument.defaultView.getComputedStyle(el);
  return { transform: style.transform === 'none' ? IDENTITY : style.transform, opacity: Number(style.opacity) };
}

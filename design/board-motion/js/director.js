// mothership:dev-only
//
// The prototype's cue director for public facts. It compares the public facts drawn before
// with the public facts drawn now, and plays a cue for what changed; nothing else can start a
// public cue. Its rules are the motion contract's (design/contract/motion-cues.json) and the
// runtime's (apps/game/hosted/comic-motion.mjs), extended for issue #87:
//
//   - A cue adds no fact: every change it marks is already in the drawn view, in words.
//   - It changes nothing and nothing waits for it. It is never queued: a newer change to the
//     same seat withdraws the cue in flight and the latest authoritative state is shown.
//   - A replayed snapshot (same revision) plays nothing. A reconnect, a fresh snapshot after a
//     gap, or a page that was in the background plays nothing and settles at once.
//   - More than four moves in one update is a reshuffle, not a move: no flights (the runtime's
//     limit, maxSeatDropsPerView 4).
//   - No cue exists for a registration on a public surface, a shot, a shooter, a weapon, a
//     block, Protection, a Rescue giver, a Supply giver or any cause.
//   - Reduced motion: no flight, trail, shake or zoom. Arrival and status changes use the 80 ms
//     fade. The facts and the controls are the same.

import { h } from './h.js';
import { CREW } from './fixtures.js';

const MOVE = { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)' };
const STATUS_MS = 220;
const ROUND_MS = 700;

export function createDirector({ board, status, fx, reduced, onCue = () => {}, hold = false }) {
  const running = new Map(); // seat -> { animations, timers }
  let statusTimer = null;
  let lastRevision = null;

  function cancelSeat(seat) {
    const entry = running.get(seat);
    if (!entry) return;
    for (const animation of entry.animations) animation.cancel();
    for (const timer of entry.timers) clearTimeout(timer);
    for (const node of entry.nodes) node.remove();
    const piece = board.pieces.get(seat);
    if (piece) { piece.querySelector('.bm-piece__body').style.visibility = ''; delete piece.dataset.moving; delete piece.dataset.cue; delete piece.dataset.arrived; }
    running.delete(seat);
  }
  function cancelAll() { for (const seat of [...running.keys()]) cancelSeat(seat); clearTimeout(statusTimer); delete status.dataset.cue; }
  const entryFor = seat => { if (!running.has(seat)) running.set(seat, { animations: [], timers: [], nodes: [] }); return running.get(seat); };
  // A storyboard hold keeps every cue on screen: nothing is taken away by a timer.
  const later = (seat, ms, fn) => { if (!hold) entryFor(seat).timers.push(setTimeout(fn, ms)); };

  function mark(seat, cue, ms) {
    const piece = board.pieces.get(seat);
    if (!piece) return;
    piece.dataset.cue = cue;
    later(seat, ms, () => { if (piece.dataset.cue === cue) delete piece.dataset.cue; });
  }

  function fly(seat, from, to) {
    const piece = board.pieces.get(seat);
    const body = piece?.querySelector('.bm-piece__body');
    if (!piece || !body || !from || !to || typeof body.animate !== 'function') return;
    const box = fx.getBoundingClientRect();
    const crew = CREW.find(entry => entry.id === piece.dataset.character);
    const art = piece.querySelector('.bm-piece__art');
    const flyer = h('span', { class: 'bm-flyer', 'data-character': piece.dataset.character, 'data-piece': piece.dataset.piece, 'aria-hidden': 'true' },
      h('span', { class: 'bm-piece__art', style: { transform: getComputedStyle(art).transform === 'none' ? '' : getComputedStyle(art).transform } }));
    Object.assign(flyer.style, { left: `${to.left - box.left}px`, top: `${to.top - box.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    fx.append(flyer);
    const dx = from.left - to.left, dy = from.top - to.top;
    const lift = 22 + (crew?.hop ?? 5);
    const animation = flyer.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${from.width / Math.max(1, to.width)})`, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.12) rotate(${(crew?.settle ?? 0) * -2}deg)`, offset: 0.5 },
      { transform: `translate(0, 0) scale(1.05) rotate(${crew?.settle ?? 0}deg)`, offset: 0.86 },
      { transform: 'none', offset: 1 },
    ], MOVE);
    // The ink trail: from where the piece was drawn to where it is now. Decorative: it says
    // nothing about a path, a door or which rooms connect.
    const x1 = from.left + from.width / 2 - box.left, y1 = from.top + from.height * 0.8 - box.top;
    const x2 = to.left + to.width / 2 - box.left, y2 = to.top + to.height * 0.8 - box.top;
    const trail = h('span', { class: 'bm-trail', 'aria-hidden': 'true' });
    Object.assign(trail.style, { left: `${x1}px`, top: `${y1}px`, width: `${Math.hypot(x2 - x1, y2 - y1)}px`, transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` });
    const puff = h('span', { class: 'bm-puff', 'aria-hidden': 'true' });
    Object.assign(puff.style, { left: `${x2}px`, top: `${y2 + to.height * 0.18}px` });
    fx.append(trail, puff);
    body.style.visibility = 'hidden';
    piece.dataset.moving = '';
    const entry = entryFor(seat);
    entry.animations.push(animation);
    entry.nodes.push(flyer, trail, puff);
    animation.finished.then(() => {
      body.style.visibility = '';
      delete piece.dataset.moving;
      flyer.remove();
      later(seat, 340, () => { trail.remove(); puff.remove(); });
    }).catch(() => {});
  }

  /**
   * Play what changed between two public states. kind: 'update' | 'replay' | 'reconnect'.
   * before: the drawn rectangles of every piece, taken before the board was redrawn.
   */
  function after(previous, next, before, { kind = 'update', revision = null } = {}) {
    if (kind === 'reconnect' || previous === null) { cancelAll(); lastRevision = revision; return []; }
    if (kind === 'replay' || (revision !== null && revision === lastRevision)) return [];
    lastRevision = revision;
    if (document.visibilityState !== 'visible') { cancelAll(); return []; }
    const played = [];
    const prior = new Map(previous.seats.map(seat => [seat.n, seat]));
    const moved = next.seats.filter(seat => prior.has(seat.n) && prior.get(seat.n).location !== seat.location).map(seat => seat.n);
    const isReduced = reduced();
    const after = board.rects();
    for (const seat of next.seats) {
      const was = prior.get(seat.n);
      if (!was) continue;
      const changedMove = moved.includes(seat.n);
      const changedStatus = was.health !== seat.health || was.jailed !== seat.jailed || was.captain !== seat.captain || was.revealedFaction !== seat.revealedFaction;
      if (changedMove || changedStatus) cancelSeat(seat.n); // the latest authoritative state wins
      if (changedMove) {
        if (isReduced || moved.length > 4) {
          const piece = board.pieces.get(seat.n);
          if (piece) { piece.dataset.arrived = ''; later(seat.n, 80, () => delete piece.dataset.arrived); }
          played.push({ cue: 'cue-public-move', seat: seat.n, variant: isReduced ? 'reduced' : 'settled' });
        } else {
          fly(seat.n, before.get(seat.n), after.get(seat.n));
          played.push({ cue: 'cue-public-move', seat: seat.n, variant: 'flight' });
        }
      }
      if (changedStatus) { mark(seat.n, 'status', isReduced ? 80 : STATUS_MS); played.push({ cue: 'cue-status-change', seat: seat.n }); }
    }
    // Others in a room a piece entered or left take their new places with a short slide. It is
    // layout, not a cue: it marks no fact, and with reduced motion it does not happen.
    if (!isReduced && moved.length && moved.length <= 4) {
      for (const seat of next.seats) {
        if (moved.includes(seat.n) || !before.has(seat.n) || !after.has(seat.n)) continue;
        const from = before.get(seat.n), to = after.get(seat.n);
        const dx = from.left - to.left, dy = from.top - to.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        const body = board.pieces.get(seat.n)?.querySelector('.bm-piece__body');
        if (!body || typeof body.animate !== 'function') continue;
        cancelSeat(seat.n);
        const animation = body.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: STATUS_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
        entryFor(seat.n).animations.push(animation);
        played.push({ cue: 'layout-reflow', seat: seat.n });
      }
    }
    if (previous.active !== next.active && next.active !== null) {
      mark(next.active, 'turn', isReduced ? 80 : STATUS_MS);
      played.push({ cue: 'cue-turn-accent', seat: next.active });
    }
    const roundChanged = previous.round !== next.round;
    const phaseChanged = roundChanged || previous.phase.kind !== next.phase.kind || previous.active !== next.active;
    if (phaseChanged) {
      clearTimeout(statusTimer);
      status.dataset.cue = roundChanged ? 'round' : 'phase';
      if (!hold) statusTimer = setTimeout(() => delete status.dataset.cue, isReduced ? 80 : roundChanged ? ROUND_MS : STATUS_MS);
      played.push({ cue: roundChanged ? 'cue-round-transition' : 'cue-phase-change' });
    }
    for (const entry of played) onCue(entry);
    return played;
  }

  return { before: () => board.rects(), after, cancelAll, dispose: cancelAll };
}

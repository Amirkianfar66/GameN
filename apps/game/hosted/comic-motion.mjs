// Local presentation of public changes on the comic board. It reads only the public facts of
// the drawn model (where each seat is, its health, Jail, Captain and revealed faction, the
// active seat, the round and the phase) and never a role, an action, a receipt or an
// acknowledgment. A cue adds no fact: every change it marks is already drawn, in words. It
// changes nothing and nothing waits for it, it is never queued, and a newer change to the same
// seat withdraws the cue in flight: the latest authoritative state is what is drawn.

/** How high each character is lifted in a move and how it settles: its public flourish, never a role. */
const FLOURISH = Object.freeze({
  c1: [6, -3], c2: [4, 2], c3: [8, -2], c4: [3, 1], c5: [4, -1], c6: [7, 3], c7: [5, -2], c8: [6, 2], c9: [4, -3],
});
// Durations are the reviewed motion tokens (0.4.0): pieceMove, cardTransition, roundTransition and reducedMotionFade.
const MOVE_MS = 900;
const STATUS_MS = 220;
const ROUND_MS = 700;
const REDUCED_MS = 80;
const TRAIL_LINGER_MS = 340;
const MOVE_EASING = 'cubic-bezier(.2,.7,.2,1)';
const REFLOW_EASING = 'cubic-bezier(.2,0,0,1)';
/** More than this many moves in one update is a reshuffle, not a move: nothing flies. */
const MOST_MOVES = 4;
/** An update drawn more than this long after the one before it was taken plays nothing old. */
const LATE_MS = 1000;

/** Seats whose location changed, when few enough changed to draw as moves. Maps are seat -> location. */
export function movedPublicSeats(previous, next) {
  if (previous === null || next === null) return [];
  const moves = [...next].filter(([seat, room]) => previous.has(seat) && previous.get(seat) !== room).map(([seat]) => seat);
  return moves.length <= MOST_MOVES ? moves : [];
}

/** The public facts of a drawn live match, or null when none is drawn. */
export function publicFacts(model) {
  if (model.screen !== 'match' || model.connection !== 'live' || !model.match) return null;
  const seats = new Map();
  for (const zone of model.match.board?.zones ?? model.match.roster?.zones ?? []) {
    for (const seat of zone.seats) {
      const faction = seat.markers?.find(marker => marker.kind === 'faction')?.variant ?? null;
      seats.set(seat.seatId, { room: zone.id, status: `${seat.health}/${seat.jailed}/${seat.captain}/${faction}`, active: seat.isActive === true });
    }
  }
  return { seats, round: model.match.phase?.roundLabel ?? null, phase: model.match.phase?.phaseLabel ?? null };
}

/** What changed between two drawn public states, as cues to play. Pure, so it can be tested without a page. */
export function publicChanges(previous, next) {
  if (previous === null || next === null) return { moved: [], flights: false, status: [], active: null, phase: null };
  const locations = facts => new Map([...facts.seats].map(([seat, fact]) => [seat, fact.room]));
  const moved = [...next.seats].filter(([seat, fact]) => previous.seats.has(seat) && previous.seats.get(seat).room !== fact.room).map(([seat]) => seat);
  const status = [...next.seats].filter(([seat, fact]) => previous.seats.has(seat) && previous.seats.get(seat).status !== fact.status).map(([seat]) => seat);
  const activeNow = [...next.seats].find(([, fact]) => fact.active)?.[0] ?? null;
  const activeBefore = [...previous.seats].find(([, fact]) => fact.active)?.[0] ?? null;
  const roundChanged = previous.round !== next.round;
  const phaseChanged = roundChanged || previous.phase !== next.phase;
  return {
    moved,
    flights: movedPublicSeats(locations(previous), locations(next)).length > 0,
    status,
    active: activeNow !== null && activeNow !== activeBefore ? activeNow : null,
    phase: phaseChanged ? (roundChanged ? 'round' : 'phase') : null,
  };
}

/**
 * @param {HTMLElement} root The mounted shell.
 * @param {{ fx?: HTMLElement | null, now?: () => number }} [options] fx: a layer over the page that takes no pointer events.
 */
export function createComicMotion(root, { fx = null, now = () => performance.now() } = {}) {
  let previous = null;
  /** seat -> what a running cue owns: animations, timers and fx nodes. */
  const running = new Map();
  let phaseTimer = null;
  const pieceOf = seat => root.querySelector(`.ms-board .ms-seat[data-seat="${CSS.escape(seat)}"]`);
  const rects = () => new Map([...root.querySelectorAll('.ms-board .ms-seat[data-seat]')].map(seat => {
    const rect = seat.querySelector('.ms-token')?.getBoundingClientRect() ?? null;
    // A piece that is not drawn (a room hidden during a showdown) has no place to fly from or to.
    return [seat.dataset.seat, rect && rect.width > 0 && rect.height > 0 ? rect : null];
  }));
  const reducedMotion = model => model.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entry = seat => {
    if (!running.has(seat)) running.set(seat, { animations: [], timers: [], nodes: [], moving: false });
    return running.get(seat);
  };

  function cancelSeat(seat) {
    const owned = running.get(seat);
    if (!owned) return;
    running.delete(seat);
    for (const animation of owned.animations) animation.cancel();
    for (const timer of owned.timers) clearTimeout(timer);
    for (const node of owned.nodes) node.remove();
    const piece = pieceOf(seat);
    if (piece) { delete piece.dataset.moving; delete piece.dataset.cue; }
  }
  function cancelAll() {
    for (const seat of [...running.keys()]) cancelSeat(seat);
    clearTimeout(phaseTimer);
    phaseTimer = null;
    const status = root.querySelector('.ms-phase');
    if (status) delete status.dataset.cue;
  }
  function later(seat, ms, fn) { entry(seat).timers.push(setTimeout(fn, ms)); }
  function mark(seat, cue, ms) {
    const piece = pieceOf(seat);
    if (!piece) return;
    piece.dataset.cue = cue;
    later(seat, ms, () => { const current = pieceOf(seat); if (current?.dataset.cue === cue) delete current.dataset.cue; });
  }

  // The moving character is carried in the layer over the page, as a copy of its own drawn
  // picture, from where it stood to where the view now has it. The piece waits hidden until it lands.
  function fly(seat, from, to) {
    const piece = pieceOf(seat);
    if (!fx || !piece || !from || !to || typeof fx.animate !== 'function') return false;
    const [hop, settle] = FLOURISH[piece.dataset.character] ?? [5, 0];
    const flyer = document.createElement('span');
    flyer.className = 'phone-fx__flyer';
    const token = piece.querySelector('.ms-token');
    if (token) {
      const art = getComputedStyle(token);
      Object.assign(flyer.style, { backgroundImage: art.backgroundImage, backgroundSize: art.backgroundSize, backgroundPosition: art.backgroundPosition, backgroundRepeat: art.backgroundRepeat });
    }
    Object.assign(flyer.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const lift = 22 + hop;
    // Decorative: the ink trail says nothing about a path, a door or which rooms connect.
    const x1 = from.left + from.width / 2;
    const y1 = from.top + from.height * 0.8;
    const x2 = to.left + to.width / 2;
    const y2 = to.top + to.height * 0.8;
    const trail = document.createElement('span');
    trail.className = 'phone-fx__trail';
    Object.assign(trail.style, { left: `${x1}px`, top: `${y1}px`, width: `${Math.hypot(x2 - x1, y2 - y1)}px`, transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` });
    const puff = document.createElement('span');
    puff.className = 'phone-fx__puff';
    Object.assign(puff.style, { left: `${x2}px`, top: `${y2 + to.height * 0.18}px` });
    fx.append(trail, flyer, puff);
    const animation = flyer.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${from.width / Math.max(1, to.width)})`, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.12) rotate(${settle * -2}deg)`, offset: 0.5 },
      { transform: `translate(0, 0) scale(1.05) rotate(${settle}deg)`, offset: 0.86 },
      { transform: 'none', offset: 1 },
    ], { duration: MOVE_MS, easing: MOVE_EASING });
    const owned = entry(seat);
    owned.animations.push(animation);
    owned.nodes.push(flyer, trail, puff);
    owned.moving = true;
    piece.dataset.moving = '';
    animation.finished.then(() => {
      owned.moving = false;
      const current = pieceOf(seat);
      if (current) delete current.dataset.moving;
      flyer.remove();
      later(seat, TRAIL_LINGER_MS, () => { trail.remove(); puff.remove(); });
    }).catch(() => {});
    return true;
  }

  return {
    /** Taken before a redraw: where every piece is drawn now, and when. */
    before() { return { rects: rects(), at: now() }; },
    /** After a redraw: play what changed in the public facts, and keep pieces in flight hidden. Returns what was played. */
    after(model, before) {
      const next = publicFacts(model);
      // Not live, a reconnect, or a page in the background: settle at once and play nothing.
      if (next === null || document.visibilityState !== 'visible') { previous = null; cancelAll(); return []; }
      const changes = publicChanges(previous, next);
      previous = next;
      const reduced = reducedMotion(model);
      // A preference switch must settle owned flights, trails and reflow even when the
      // public facts did not change. CSS suppression alone leaves the real piece hidden.
      if (reduced) cancelAll();
      // A redraw that replaced a piece in flight keeps the new element hidden until the flight ends.
      for (const [seat, owned] of running) if (owned.moving) { const piece = pieceOf(seat); if (piece) piece.dataset.moving = ''; }
      const played = [];
      if (changes.moved.length === 0 && changes.status.length === 0 && changes.active === null && changes.phase === null) return played;
      // A main thread busy for more than a second plays no old visual: the authoritative piece is already in place.
      const late = now() - before.at > LATE_MS;
      const after = rects();
      for (const seat of new Set([...changes.moved, ...changes.status])) cancelSeat(seat);
      for (const seat of changes.moved) {
        if (!reduced && !late && changes.flights && fly(seat, before.rects.get(seat), after.get(seat))) played.push({ cue: 'public-move', seat, variant: 'flight' });
        else { mark(seat, 'arrived', REDUCED_MS); played.push({ cue: 'public-move', seat, variant: 'settled' }); }
      }
      // Others in a room a piece entered or left slide to their new places. Layout, not a cue.
      if (!reduced && !late && changes.flights) {
        for (const [seat, from] of before.rects) {
          if (changes.moved.includes(seat) || !from) continue;
          const to = after.get(seat);
          const piece = pieceOf(seat);
          if (!to || !piece || typeof piece.animate !== 'function') continue;
          const dx = from.left - to.left;
          const dy = from.top - to.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
          cancelSeat(seat);
          entry(seat).animations.push(piece.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: STATUS_MS, easing: REFLOW_EASING }));
        }
      }
      for (const seat of changes.status) { mark(seat, 'status', reduced ? REDUCED_MS : STATUS_MS); played.push({ cue: 'status-change', seat }); }
      if (changes.active !== null && !changes.moved.includes(changes.active)) { mark(changes.active, 'turn', reduced ? REDUCED_MS : STATUS_MS); played.push({ cue: 'turn-accent', seat: changes.active }); }
      if (changes.phase !== null) {
        const status = root.querySelector('.ms-phase');
        if (status) {
          clearTimeout(phaseTimer);
          status.dataset.cue = changes.phase;
          phaseTimer = setTimeout(() => { delete status.dataset.cue; phaseTimer = null; }, reduced ? REDUCED_MS : changes.phase === 'round' ? ROUND_MS : STATUS_MS);
        }
        played.push({ cue: changes.phase === 'round' ? 'round-transition' : 'phase-change' });
      }
      return played;
    },
    dispose() { previous = null; cancelAll(); },
  };
}

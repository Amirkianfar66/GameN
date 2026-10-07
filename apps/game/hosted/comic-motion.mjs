/** Local presentation of changed public locations. Never reads a role/action/acknowledgment. */
export function movedPublicSeats(previous, next) {
  if (previous === null || next === null) return [];
  const moves = [...next].filter(([seat, room]) => previous.has(seat) && previous.get(seat) !== room).map(([seat]) => seat);
  return moves.length <= 4 ? moves : [];
}

export function createComicMotion(root, { now = () => performance.now() } = {}) {
  let previous = null;
  const running = new Set();
  const positions = () => new Map([...root.querySelectorAll('.ms-board .ms-seat[data-seat]')].map(seat => {
    const token = seat.querySelector('.ms-token');
    return [seat.dataset.seat, token?.getBoundingClientRect()];
  }));
  const facts = model => model.screen === 'match' && model.connection === 'live'
    ? new Map((model.match?.board?.zones ?? model.match?.roster?.zones ?? []).flatMap(zone => zone.seats.map(seat => [seat.seatId, zone.id]))) : null;
  function cancel() { for (const animation of running) animation.cancel(); running.clear(); }
  return {
    before() { return { positions: positions(), at: now() }; },
    after(model, before) {
      const next = facts(model);
      if (next === null || document.visibilityState !== 'visible') { previous = null; cancel(); return; }
      const changed = movedPublicSeats(previous, next);
      previous = next;
      if (model.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches) { cancel(); return; }
      // Never play an old queued visual after a busy main thread; the authoritative piece
      // is already in its new room. Initial/reconnected snapshots never produce a move.
      if (now() - before.at > 1000) return;
      for (const seat of changed) {
        const origin = before.positions.get(seat);
        const token = root.querySelector(`.ms-board [data-seat="${CSS.escape(seat)}"] .ms-token`);
        if (!origin || !token || typeof token.animate !== 'function') continue;
        const target = token.getBoundingClientRect();
        const x = origin.left - target.left; const y = origin.top - target.top;
        const animation = token.animate([
          { transform: `translate(${x}px,${y}px) scale(1)`, offset: 0 },
          { transform: `translate(${x * .5}px,${y * .5 - 22}px) scale(1.12)`, offset: .5 },
          { transform: 'translate(0,0) scale(1.05)', offset: .86 },
          { transform: 'none', offset: 1 },
        ], { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)' });
        running.add(animation);
        animation.finished.catch(() => {}).finally(() => running.delete(animation));
      }
    },
    dispose: cancel,
  };
}

// Host controls consume public practice metadata only. Bot roles, policy inputs and
// actions remain in the server runtime; this module never impersonates a bot.
export function createPracticeControls({ matchId, api, lifecycle, operate, feed, el, onChange = () => {} }) {
  const key = `practice ${matchId}`;
  const node = el('section', undefined, { class: 'connected-practice', 'aria-labelledby': 'connected-practice-heading' });
  const count = el('select', undefined, { id: 'connected-bot-count' });
  const label = el('label', 'Number of bots'); label.append(count);
  const save = el('button', 'Add bots', { type: 'button', id: 'connected-bots-save' });
  const abandon = el('button', 'Give this request up', { type: 'button', id: 'connected-bots-abandon', class: 'connected-quiet' });
  const summary = el('p', 'Loading bot settings…', { id: 'connected-bots-summary', role: 'status' });
  const roster = el('ul', undefined, { id: 'connected-bots-roster' });
  const note = el('p', 'For a solo test, leave one seat for yourself and join from a Player tab. Bots make simple legal choices; they do not chat or bluff.');
  const playerLink = el('a', 'Open a Player tab', { href: '?as=player', target: '_blank', rel: 'noopener noreferrer' });
  node.append(el('h2', 'Practice bots', { id: 'connected-practice-heading' }), note, playerLink, summary, roster, label, save, abandon);
  let lobby = { playerCount: null, status: null, seats: [] };
  let busy = false, disposed = false, initialized = false, waitingRevision = null, notice = '';

  const botSeats = () => feed.practice()?.botSeatIds ?? [];
  const pending = () => busy || lifecycle.unsettled(key) !== null || waitingRevision !== null;
  const known = () => feed.practiceStatus() !== 'unavailable';
  function draw() {
    if (disposed) return;
    const bots = botSeats(), doc = feed.practice();
    if (waitingRevision !== null && doc !== null && doc.revision >= waitingRevision) waitingRevision = null;
    const humanCount = lobby.seats.filter(seat => !bots.includes(seat.seatId)).length;
    const maximum = lobby.playerCount === null ? 0 : Math.max(0, lobby.playerCount - humanCount);
    const open = lobby.status === 'lobby';
    const kept = lifecycle.unsettled(key);
    const frozen = !known() || !open || pending();
    let chosen = Number(count.value || 0);
    if (!initialized && known() && lobby.playerCount !== null) {
      chosen = bots.length || Math.max(0, maximum - (humanCount === 0 ? 1 : 0));
      initialized = true;
    }
    // Preserve a kept request even when a human admission changes the remaining space.
    const selected = kept?.request?.botCount ?? chosen;
    const choices = Array.from({ length: maximum + 1 }, (_, index) => index);
    if (kept && !choices.includes(selected)) choices.push(selected);
    if ([...count.options].map(option => option.value).join() !== choices.join()) {
      count.replaceChildren(...choices.map(value => el('option', `${value} ${value === 1 ? 'bot' : 'bots'}`, { value: String(value) })));
    }
    count.value = String(kept ? selected : Math.min(selected, maximum));
    count.disabled = frozen;
    save.disabled = busy || !known() || waitingRevision !== null || !open || (!kept && Number(count.value) === bots.length);
    save.textContent = kept ? 'Send the same bot request again' : Number(count.value) === 0 ? 'Remove bots' : bots.length === 0 ? 'Add bots' : 'Update bots';
    abandon.hidden = kept === null; abandon.disabled = busy;
    label.hidden = !open; save.hidden = !open && kept === null;
    const description = !known() ? 'Bot settings are unavailable. Waiting for a fresh server update.'
      : bots.length === 0 ? 'No bots in this match.'
      : `Practice match · ${bots.length} ${bots.length === 1 ? 'bot' : 'bots'}. ${open ? 'Bots join when you start the match.' : lobby.status === 'running' ? 'Bots keep playing if the host tab closes.' : ['complete', 'aborted'].includes(lobby.status) ? 'Bot play has ended.' : 'Waiting for match status.'}`;
    summary.textContent = `${description}${waitingRevision !== null ? ' Waiting for the updated roster.' : ''}${notice ? ` ${notice}` : ''}`;
    roster.replaceChildren(...bots.map(seatId => {
      const name = feed.identities()?.seats.find(seat => seat.seatId === seatId)?.displayName;
      const room = lobby.seats.find(seat => seat.seatId === seatId)?.initialRoom;
      return el('li', `Player ${seatId.slice(5)} · ${name ?? 'Bot'}${room ? ` · starts in ${room}` : ''}`, { 'data-bot-seat': seatId });
    }));
    roster.hidden = bots.length === 0;
  }
  count.addEventListener('change', () => { notice = ''; draw(); });
  save.addEventListener('click', async () => {
    if (save.disabled) return;
    const desired = Number(count.value);
    busy = true; notice = ''; draw(); onChange();
    const outcome = await operate(key, requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId, requestId, botCount: desired }),
      request => api.setPracticeBots(request), 'Updating practice bots');
    busy = false;
    if (outcome.kind === 'done') waitingRevision = outcome.result.revision;
    else if (outcome.kind === 'unsettled') notice = 'The answer is uncertain. Send the same request again; the count stays fixed until it is settled.';
    else if (outcome.kind === 'refused') notice = 'The server did not change the bots. Check the available seats and try again.';
    else if (outcome.kind === 'invalid') notice = 'Choose a whole number of bots that fits this lobby.';
    draw(); onChange();
  });
  abandon.addEventListener('click', () => {
    if (busy || !lifecycle.abandon(key)) return;
    notice = 'The earlier request may still arrive. Check the roster before starting.';
    draw(); onChange();
  });
  const stop = feed.subscribe(() => { draw(); onChange(); });
  return {
    node,
    update(value) { lobby = value; draw(); },
    pending,
    readyToStart() { return known() && !pending(); },
    // Unknown or still-updating metadata must not offer a bot seat for human recovery.
    canRecover(seatId) { return known() && !pending() && !botSeats().includes(seatId); },
    dispose() { disposed = true; stop(); },
  };
}

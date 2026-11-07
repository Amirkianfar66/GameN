import { createRoleConfirmation } from './role-confirmation.js';

export function createSetupProgress({ el, compact = false }) {
  const node = el('section', undefined, { class: `connected-setup-progress${compact ? ' phone-setup-compact' : ''}`, 'aria-labelledby': 'setup-progress-heading' });
  const title = el('h2', 'Match setup', { id: 'setup-progress-heading' });
  const status = el('p', '', { id: 'setup-progress-status', role: 'status' });
  const countdown = el('p', '', { id: 'setup-countdown', role: 'timer', 'aria-live': 'off', class: 'setup-countdown' });
  const seats = el('ul', undefined, { id: 'setup-progress-seats' });
  const head = el('div', undefined, { class: 'phone-setup-head' }); head.append(title, countdown);
  const details = el('details', undefined, { class: 'phone-more phone-progress' });
  const summary = el('summary', 'Crew progress'); details.append(summary, seats);
  node.append(head, status, details);
  let seatsKey = '';
  return { node, update(value, reading = { status: 'unsynced' }, identities = []) {
    const stage = value?.stage;
    const timed = ['choosing', 'awaiting-ready'].includes(stage);
    const endsAt = stage === 'choosing' ? value?.choosingEndsAt : value?.readingEndsAt;
    const seconds = reading.status === 'synced' && Number.isSafeInteger(endsAt) ? Math.max(0, Math.min(30, Math.ceil((endsAt - reading.serverNowMs) / 1000))) : null;
    node.setAttribute('data-stage', stage ?? 'connecting');
    countdown.setAttribute('data-state', seconds === null ? 'syncing' : seconds <= 0 ? 'expired' : seconds <= 10 ? 'final' : 'running');
    countdown.hidden = !timed;
    countdown.textContent = !timed ? '' : seconds === null ? 'Synchronizing countdown…' : seconds > 0
      ? `${stage === 'choosing' ? 'Character selection' : 'Role reading'} · ${seconds} s`
      : stage === 'choosing' ? 'Selection time has ended. Waiting for the server…' : 'Reading time has ended. Waiting for everyone to be Ready.';
    title.textContent = stage === 'choosing' ? 'Choose characters' : stage === 'awaiting-ready' ? 'Read your role card' : 'Match setup';
    status.textContent = !value ? 'Waiting for current setup progress…'
      : stage === 'lobby' ? 'Waiting for the host to start setup.'
      : stage === 'choosing' ? `${value.seats.filter(seat => seat.confirmed).length} of ${value.playerCount} characters confirmed. Unconfirmed characters are assigned when the 30-second timer ends.`
      : stage === 'awaiting-ready' ? `${value.seats.filter(seat => seat.ready).length} of ${value.playerCount} ready. The first turn waits for 30 seconds of reading and everyone’s Ready.`
      : stage === 'running' ? 'Everyone is ready. The match has started.' : 'The host ended this match.';
    details.hidden = !['choosing', 'awaiting-ready'].includes(stage);
    if (compact) {
      title.textContent = stage === 'choosing' ? 'Choose your character' : stage === 'awaiting-ready' ? 'Your role' : 'Waiting';
      status.hidden = true; details.hidden = true;
      countdown.setAttribute('aria-label', countdown.textContent);
      countdown.textContent = !timed ? '' : seconds === null ? '…' : `0:${String(seconds).padStart(2, '0')}`;
    }
    const count = value?.seats.filter(seat => stage === 'choosing' ? seat.confirmed : seat.ready).length ?? 0;
    summary.textContent = `${count} of ${value?.playerCount ?? '…'} ${stage === 'choosing' ? 'confirmed' : 'Ready'} · Crew progress`;
    const key = JSON.stringify([stage, value?.seats, identities]);
    if (key === seatsKey) return;
    seatsKey = key;
    seats.replaceChildren(...(value?.seats ?? []).map(seat => {
      const row = el('li', undefined, { 'data-setup-seat': seat.seatId });
      const identity = identities.find(item => item.seatId === seat.seatId);
      row.append(el('span', `Player ${seat.seatId.slice(5)}${identity?.displayName ? ` · ${identity.displayName}` : ''}`), el('span', stage === 'choosing'
        ? seat.confirmed ? 'Character confirmed' : 'Choosing character'
        : seat.ready ? 'Ready' : 'Waiting for Ready', { class: 'setup-seat-state' }));
      return row;
    }));
  } };
}

/** A tile tap confirms only this seat's public character through the existing API. */
export function createPlayerSetup({ matchId, seatId, feed, identities, api, lifecycle, operate, el, clock, onStageChange = () => {} }) {
  const node = el('section', undefined, { class: 'connected-player-setup' });
  const progress = createSetupProgress({ el, compact: true });
  const picker = el('section', undefined, { class: 'connected-identity', 'aria-label': 'Choose your character' });
  const grid = el('div', undefined, { class: 'crew-picker', role: 'group', 'aria-label': 'Choose your character' });
  const status = el('p', '', { id: 'crew-status', role: 'status' });
  const retry = el('button', 'Retry selection', { type: 'button', id: 'crew-save' });
  const readyNote = el('div', '✓', { id: 'setup-ready-waiting', class: 'phone-role-back', role: 'status', 'aria-label': 'Ready. Waiting for the timer and other players.', tabindex: '-1' });
  const choiceKey = `setup-choice ${matchId} ${seatId}`, readyKey = `setup-ready ${matchId} ${seatId}`;
  let selected = null, busy = false, closed = false, notice = '', choiceRevision = null, readyAccepted = null, previousStage = null;
  const roleKey = own => own ? `${own.dealId}/${seatId}/${own.bindingRevision}` : null;
  const role = createRoleConfirmation({ el, onReady: async key => {
    const own = feed.own();
    if (closed || own === null || roleKey(own) !== key) return draw();
    const outcome = await operate(readyKey, requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId, requestId,
      dealId: own.dealId, bindingRevision: own.bindingRevision }), request => api.readyForMatch(request), 'Confirming your readiness');
    if (outcome.kind === 'done') readyAccepted = key;
    draw();
    if (outcome.kind === 'done') readyNote.focus?.({ preventScroll: true });
    return outcome;
  } });
  const buttons = ['Vega', 'Rigel', 'Lyra', 'Atlas', 'Orion', 'Nova', 'Juno', 'Mira', 'Echo'].map((callSign, index) => {
    const id = `c${index + 1}`;
    const button = el('button', callSign, { type: 'button', class: 'crew-option', 'data-character': id, 'aria-pressed': 'false' });
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      selected = id; notice = '';
      await confirm();
    });
    grid.append(button); return { id, callSign, button };
  });
  function draw() {
    if (closed) return;
    const setup = feed.public(), binding = feed.binding(), doc = identities.identities();
    const ownSeat = setup?.seats.find(seat => seat.seatId === seatId);
    const identity = doc?.seats.find(seat => seat.seatId === seatId);
    clock?.setActive(['choosing', 'awaiting-ready'].includes(setup?.stage));
    const reading = clock?.read() ?? { status: 'unsynced' };
    progress.update(setup, reading, doc?.seats ?? []);
    node.setAttribute('data-stage', setup?.stage ?? 'connecting');
    if (previousStage !== setup?.stage) { previousStage = setup?.stage; role.conceal(); onStageChange(); }
    const expired = setup?.stage === 'choosing' && reading.status === 'synced' && reading.serverNowMs >= setup.choosingEndsAt;
    picker.hidden = setup?.stage !== 'choosing';
    const currentKey = setup?.dealId && binding ? `${setup.dealId}/${seatId}/${binding.bindingRevision}` : null;
    const confirmedReady = setup?.stage === 'awaiting-ready' && binding !== null && (ownSeat?.ready === true || readyAccepted === currentKey && currentKey !== null);
    readyNote.hidden = !confirmedReady;
    role.node.hidden = setup?.stage !== 'awaiting-ready' || confirmedReady;
    if (choiceRevision !== null && setup !== null && setup.revision >= choiceRevision) choiceRevision = null;
    if (ownSeat?.confirmed) { lifecycle.abandon(choiceKey); selected = identity?.characterId ?? selected; }
    const kept = lifecycle.unsettled(choiceKey);
    const frozen = expired || busy || kept !== null || choiceRevision !== null || doc === null || binding === null
      || setup?.stage !== 'choosing' || ownSeat?.confirmed === true;
    for (const entry of buttons) {
      const holder = doc?.seats.find(seat => seat.characterId === entry.id && seat.seatId !== seatId);
      entry.button.disabled = frozen || holder !== undefined;
      entry.button.setAttribute('aria-disabled', String(entry.button.disabled));
      entry.button.setAttribute('aria-pressed', String(selected === entry.id));
      entry.button.setAttribute('data-taken', String(holder !== undefined));
      entry.button.setAttribute('data-confirmed', String(ownSeat?.confirmed === true && selected === entry.id));
      entry.button.setAttribute('aria-label', holder ? `${entry.callSign}, taken by Player ${holder.seatId.slice(5)}` : entry.callSign);
    }
    retry.hidden = kept === null || ownSeat?.confirmed === true || expired;
    retry.disabled = busy || expired || binding === null || setup?.stage !== 'choosing';
    status.textContent = notice || (kept && !busy ? 'Connection interrupted. Retry your selection.' : '');
    status.hidden = status.textContent === '';
    const own = feed.own(), key = roleKey(own);
    if (key !== null && ownSeat?.ready) lifecycle.abandon(readyKey);
    role.update(own === null || confirmedReady ? null : { key, role: own.self.role, characterId: identity?.characterId ?? null,
      playerCount: setup?.playerCount, ready: ownSeat?.ready === true || readyAccepted === key, canConfirm: true, retry: lifecycle.unsettled(readyKey) !== null });
  }
  async function confirm() {
    const binding = feed.binding(), setup = feed.public();
    if (closed || busy || binding === null || setup?.stage !== 'choosing' || setup.seats.find(s => s.seatId === seatId)?.confirmed) return;
    const identity = identities.identities()?.seats.find(s => s.seatId === seatId);
    // Preserve an existing public name. A new player uses the chosen call sign;
    // neither value participates in the random role deal.
    const displayName = identity?.displayName || buttons.find(item => item.id === selected)?.callSign;
    busy = true; draw();
    const outcome = await operate(choiceKey, requestId => ({ schemaVersion: 1, protocolVersion: 2, requestId, matchId,
      bindingRevision: binding.bindingRevision, displayName, characterId: selected }), request => api.confirmSetupChoice(request), 'Selecting character');
    busy = false;
    if (outcome.kind === 'done') choiceRevision = outcome.result.revision;
    if (outcome.kind === 'refused') notice = outcome.code === 'CHARACTER_TAKEN' ? 'Taken. Choose another character.' : 'Selection unavailable. Try again.';
    draw();
  }
  retry.addEventListener('click', confirm);
  picker.append(grid, status, retry);
  node.append(progress.node, picker, readyNote, role.node);
  const stops = [feed.subscribe(draw), identities.subscribe(draw)];
  draw();
  return { node, refresh: draw, conceal() { role.conceal(); },
    dispose() { closed = true; stops.forEach(stop => stop()); role.dispose(); node.replaceChildren(); },
  };
}

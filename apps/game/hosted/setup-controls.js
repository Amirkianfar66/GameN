import { createRoleConfirmation } from './role-confirmation.js';

export function createSetupProgress({ el }) {
  const node = el('section', undefined, { class: 'connected-setup-progress', 'aria-labelledby': 'setup-progress-heading' });
  const title = el('h2', 'Match setup', { id: 'setup-progress-heading' });
  const status = el('p', '', { id: 'setup-progress-status', role: 'status' });
  const countdown = el('p', '', { id: 'setup-countdown', role: 'timer', 'aria-live': 'off', class: 'setup-countdown' });
  const seats = el('ul', undefined, { id: 'setup-progress-seats' });
  node.append(title, status, countdown, seats);
  return { node, update(value, reading = { status: 'unsynced' }) {
    const stage = value?.stage;
    const timed = ['choosing', 'awaiting-ready'].includes(stage);
    const endsAt = stage === 'choosing' ? value?.choosingEndsAt : value?.readingEndsAt;
    const seconds = reading.status === 'synced' && Number.isSafeInteger(endsAt) ? Math.max(0, Math.min(30, Math.ceil((endsAt - reading.serverNowMs) / 1000))) : null;
    countdown.hidden = !timed;
    countdown.textContent = !timed ? '' : seconds === null ? 'Synchronizing countdown…' : seconds > 0
      ? `${stage === 'choosing' ? 'Character selection' : 'Role reading'} · ${seconds} s`
      : stage === 'choosing' ? 'Selection time has ended. Waiting for the server…' : 'Reading time has ended. Waiting for everyone to be Ready.';
    title.textContent = stage === 'choosing' ? 'Choose characters' : stage === 'awaiting-ready' ? 'Confirm your private roles' : 'Match setup';
    status.textContent = !value ? 'Waiting for current setup progress…'
      : stage === 'lobby' ? 'Waiting for the host to start setup.'
      : stage === 'choosing' ? `${value.seats.filter(seat => seat.confirmed).length} of ${value.playerCount} characters confirmed. Unconfirmed characters are assigned when the 30-second timer ends.`
      : stage === 'awaiting-ready' ? `${value.seats.filter(seat => seat.ready).length} of ${value.playerCount} ready. The first turn waits for 30 seconds of reading and everyone’s Ready.`
      : stage === 'running' ? 'Everyone is ready. The match has started.' : 'The host ended this match.';
    seats.hidden = !['choosing', 'awaiting-ready'].includes(stage);
    seats.replaceChildren(...(value?.seats ?? []).map(seat => {
      const row = el('li', undefined, { 'data-setup-seat': seat.seatId });
      row.append(el('span', `Player ${seat.seatId.slice(5)}`), el('span', stage === 'choosing'
        ? seat.confirmed ? 'Character confirmed' : 'Choosing character'
        : seat.ready ? 'Ready' : 'Waiting for Ready', { class: 'setup-seat-state' }));
      return row;
    }));
  } };
}

/** Uses public progress plus this binding's private preview; never deals or starts locally. */
export function createPlayerSetup({ matchId, seatId, feed, identities, api, lifecycle, operate, el, clock }) {
  const node = el('section', undefined, { class: 'connected-player-setup' });
  const progress = createSetupProgress({ el });
  const picker = el('section', undefined, { class: 'connected-identity', 'aria-labelledby': 'crew-heading' });
  const name = el('input', undefined, { type: 'text', id: 'crew-name', maxlength: '24', autocomplete: 'off', spellcheck: 'false' });
  const label = el('label', 'Your public name'); label.append(name);
  const grid = el('div', undefined, { class: 'crew-picker', role: 'group', 'aria-label': 'Choose your character' });
  const status = el('p', '', { id: 'crew-status', role: 'status' });
  const save = el('button', 'Confirm character', { type: 'button', id: 'crew-save' });
  const readyNote = el('p', 'You are ready. The match starts after the reading timer and everyone’s confirmation.', { id: 'setup-ready-waiting', role: 'status' });
  const practiceNote = el('p', '', { class: 'connected-practice-notice', id: 'crew-practice-notice' });
  const choiceKey = `setup-choice ${matchId} ${seatId}`, readyKey = `setup-ready ${matchId} ${seatId}`;
  let selected = null, edited = false, initialized = false, busy = false, closed = false, notice = '';
  let choiceRevision = null, readyAccepted = null;
  const roleKey = own => own ? `${own.dealId}/${seatId}/${own.bindingRevision}` : null;
  const role = createRoleConfirmation({ el, onReady: async key => {
    const own = feed.own();
    if (closed || own === null || roleKey(own) !== key) return draw();
    const outcome = await operate(readyKey, requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId, requestId,
      dealId: own.dealId, bindingRevision: own.bindingRevision }), request => api.readyForMatch(request), 'Confirming your readiness');
    if (outcome.kind === 'done') readyAccepted = key;
    draw();
  } });
  const buttons = ['Vega', 'Rigel', 'Lyra', 'Atlas', 'Orion', 'Nova', 'Juno', 'Mira', 'Echo'].map((callSign, index) => {
    const id = `c${index + 1}`;
    const button = el('button', callSign, { type: 'button', class: 'crew-option', 'data-character': id, 'aria-pressed': 'false' });
    button.addEventListener('click', () => {
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
      selected = id; edited = true; notice = ''; draw();
    });
    grid.append(button); return { id, callSign, button };
  });
  function draw() {
    if (closed) return;
    const setup = feed.public(), binding = feed.binding(), doc = identities.identities();
    const ownSeat = setup?.seats.find(seat => seat.seatId === seatId);
    const identity = doc?.seats.find(seat => seat.seatId === seatId);
    const bots = identities.practice()?.botSeatIds.length ?? 0;
    clock?.setActive(['choosing', 'awaiting-ready'].includes(setup?.stage));
    const reading = clock?.read() ?? { status: 'unsynced' };
    progress.update(setup, reading);
    const selectionExpired = setup?.stage === 'choosing' && reading.status === 'synced' && reading.serverNowMs >= setup.choosingEndsAt;
    practiceNote.hidden = bots === 0;
    practiceNote.textContent = bots ? `Practice match with ${bots} ${bots === 1 ? 'bot' : 'bots'}. Bots choose and confirm automatically.` : '';
    picker.hidden = setup?.stage !== 'choosing';
    const currentKey = setup?.dealId && binding ? `${setup.dealId}/${seatId}/${binding.bindingRevision}` : null;
    const confirmedReady = setup?.stage === 'awaiting-ready' && binding !== null && (ownSeat?.ready === true || readyAccepted === currentKey && currentKey !== null);
    readyNote.hidden = !confirmedReady;
    role.node.hidden = setup?.stage !== 'awaiting-ready' || confirmedReady;
    if (!initialized && identity && !edited) { initialized = true; name.value = identity.displayName ?? ''; selected = identity.characterId; }
    if (choiceRevision !== null && setup !== null && setup.revision >= choiceRevision) choiceRevision = null;
    if (ownSeat?.confirmed) lifecycle.abandon(choiceKey);
    const kept = lifecycle.unsettled(choiceKey);
    const frozen = selectionExpired || busy || kept !== null || choiceRevision !== null || doc === null || binding === null
      || setup?.stage !== 'choosing' || ownSeat?.confirmed === true;
    name.disabled = frozen;
    for (const entry of buttons) {
      const holder = doc?.seats.find(seat => seat.characterId === entry.id && seat.seatId !== seatId);
      entry.button.disabled = frozen || holder !== undefined;
      entry.button.setAttribute('aria-disabled', String(entry.button.disabled));
      entry.button.setAttribute('aria-pressed', String(selected === entry.id));
      entry.button.textContent = holder ? `${entry.callSign} · Player ${holder.seatId.slice(5)}` : entry.callSign;
    }
    save.hidden = ownSeat?.confirmed === true;
    save.disabled = selectionExpired || busy || choiceRevision !== null || doc === null || binding === null || setup?.stage !== 'choosing'
      || ownSeat?.confirmed === true || (!kept && (selected === null || name.value.trim().length === 0 || [...name.value].length > 12));
    save.textContent = kept ? 'Send the same choice again' : 'Confirm character';
    status.textContent = ownSeat?.confirmed ? 'Character confirmed. Roles are dealt when the selection timer ends.'
      : selectionExpired ? 'Selection has ended. The server is assigning any remaining characters.'
      : kept ? 'The answer is uncertain. Send the same choice again while selection is open.'
      : choiceRevision !== null ? 'Waiting for the confirmed character…'
      : notice || 'Choose a character and a public name, up to 12 characters. Your secret role is dealt separately.';
    const own = feed.own(), key = roleKey(own);
    if (key !== null && ownSeat?.ready) lifecycle.abandon(readyKey);
    role.update(own === null || confirmedReady ? null : { key, role: own.self.role, characterId: identity?.characterId ?? null,
      ready: ownSeat?.ready === true || readyAccepted === key, canConfirm: true, retry: lifecycle.unsettled(readyKey) !== null });
  }
  name.addEventListener('input', () => { edited = true; notice = ''; draw(); });
  save.addEventListener('click', async () => {
    const binding = feed.binding();
    if (save.disabled || binding === null) return;
    busy = true; draw();
    const outcome = await operate(choiceKey, requestId => ({ schemaVersion: 1, protocolVersion: 2, requestId, matchId,
      bindingRevision: binding.bindingRevision, displayName: name.value, characterId: selected }),
    request => api.confirmSetupChoice(request), 'Confirming your character', { invalid: 'Use a name of 1 to 12 characters and select one character.' });
    busy = false;
    if (outcome.kind === 'done') choiceRevision = outcome.result.revision;
    if (outcome.kind === 'refused') notice = outcome.code === 'CHARACTER_TAKEN' ? 'That character was taken. Choose another.'
      : outcome.code === 'NAME_TAKEN' ? 'That name was taken. Choose another.' : 'Your choice was not confirmed. Check the current setup and try again.';
    draw();
  });
  picker.append(el('h2', 'Choose your character', { id: 'crew-heading' }), label, grid, status, save);
  node.append(practiceNote, progress.node, picker, readyNote, role.node);
  const stops = [feed.subscribe(draw), identities.subscribe(draw)];
  draw();
  return { node, refresh: draw,
    conceal() { role.conceal(); },
    dispose() { closed = true; stops.forEach(stop => stop()); role.dispose(); node.replaceChildren(); },
  };
}

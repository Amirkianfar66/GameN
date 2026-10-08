import { createRoleConfirmation } from './role-confirmation.js';
import { dock } from './phone-ui.js';

export function createSetupProgress({ el }) {
  const node = el('section', undefined, { class: 'connected-setup-progress', 'aria-labelledby': 'setup-progress-heading' });
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

/** Uses public progress plus this binding's private preview; never deals or starts locally. */
export function createPlayerSetup({ matchId, seatId, feed, identities, api, lifecycle, operate, el, clock }) {
  const node = el('section', undefined, { class: 'connected-player-setup' });
  const progress = createSetupProgress({ el });
  const picker = el('section', undefined, { class: 'connected-identity', 'aria-labelledby': 'crew-heading' });
  const name = el('input', undefined, { type: 'text', id: 'crew-name', maxlength: '24', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'go', 'aria-describedby': 'crew-name-help' });
  const label = el('label', 'Your public name'); label.append(name);
  const nameHelp = el('p', '0 / 12 characters', { id: 'crew-name-help', class: 'phone-field-help' });
  const confirmed = el('div', undefined, { class: 'phone-crew-confirmed', id: 'crew-confirmed', tabindex: '-1' });
  const assignment = el('p', '', { id: 'crew-assignment', class: 'phone-notice', role: 'status' });
  const grid = el('div', undefined, { class: 'crew-picker', role: 'group', 'aria-label': 'Choose your character' });
  const status = el('p', '', { id: 'crew-status', role: 'status' });
  const save = el('button', 'Confirm character', { type: 'button', id: 'crew-save' });
  const readyNote = el('p', 'You are ready. The match starts after the reading timer and everyone’s confirmation.', { id: 'setup-ready-waiting', role: 'status', tabindex: '-1' });
  const practiceNote = el('p', '', { class: 'connected-practice-notice', id: 'crew-practice-notice' });
  const choiceKey = `setup-choice ${matchId} ${seatId}`, readyKey = `setup-ready ${matchId} ${seatId}`;
  let selected = null, edited = false, initialized = false, busy = false, closed = false, notice = '';
  let choiceRevision = null, readyAccepted = null, previousStage = null, confirmedBeforeReading = false, sawChoosing = false, ownConfirmSucceeded = false;
  const roleKey = own => own ? `${own.dealId}/${seatId}/${own.bindingRevision}` : null;
  const role = createRoleConfirmation({ el, onReady: async key => {
    const own = feed.own();
    if (closed || own === null || roleKey(own) !== key) return draw();
    const outcome = await operate(readyKey, requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId, requestId,
      dealId: own.dealId, bindingRevision: own.bindingRevision }), request => api.readyForMatch(request), 'Confirming your readiness');
    if (outcome.kind === 'done') readyAccepted = key;
    draw();
    if (outcome.kind === 'done') readyNote.focus?.();
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
    progress.update(setup, reading, doc?.seats ?? []);
    node.setAttribute('data-stage', setup?.stage ?? 'connecting');
    if (setup?.stage === 'choosing') { sawChoosing = true; if (ownSeat?.confirmed) confirmedBeforeReading = true; }
    const changedStage = previousStage !== setup?.stage;
    previousStage = setup?.stage;
    assignment.hidden = setup?.stage !== 'awaiting-ready' || !sawChoosing || confirmedBeforeReading || ownConfirmSucceeded;
    assignment.textContent = assignment.hidden ? '' : `Character selection ended. Your confirmed character and name are ${identity?.characterId ? buttons.find(item => item.id === identity.characterId)?.callSign ?? 'assigned by the server' : 'being assigned'}, ${identity?.displayName ?? 'waiting for the server'}.`;
    if (changedStage && setup?.stage === 'awaiting-ready') { role.conceal(); }
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
    const length = [...name.value].length;
    nameHelp.textContent = `${length} / 12 characters${length > 12 ? ' · Shorten your name to continue.' : ''}`;
    name.setAttribute('aria-invalid', String(length > 12));
    label.hidden = ownSeat?.confirmed === true; nameHelp.hidden = label.hidden; grid.hidden = label.hidden;
    confirmed.hidden = ownSeat?.confirmed !== true;
    confirmed.setAttribute('data-character', identity?.characterId ?? '');
    confirmed.textContent = confirmed.hidden ? '' : `${buttons.find(item => item.id === identity?.characterId)?.callSign ?? 'Character'} · ${identity?.displayName ?? `Player ${seatId.slice(5)}`} · Confirmed`;
    for (const entry of buttons) {
      const holder = doc?.seats.find(seat => seat.characterId === entry.id && seat.seatId !== seatId);
      entry.button.disabled = frozen || holder !== undefined;
      entry.button.setAttribute('aria-disabled', String(entry.button.disabled));
      entry.button.setAttribute('aria-pressed', String(selected === entry.id));
      entry.button.textContent = holder ? `${entry.callSign} · Player ${holder.seatId.slice(5)}` : entry.callSign;
    }
    save.hidden = ownSeat?.confirmed === true;
    const takenChoice = doc?.seats.some(seat => seat.characterId === selected && seat.seatId !== seatId) ?? false;
    save.disabled = selectionExpired || busy || choiceRevision !== null || doc === null || binding === null || setup?.stage !== 'choosing'
      || ownSeat?.confirmed === true || (!kept && (selected === null || takenChoice || name.value.trim().length === 0 || [...name.value].length > 12));
    save.textContent = kept ? 'Send the same choice again' : 'Confirm character';
    status.textContent = ownSeat?.confirmed ? 'Character confirmed. Roles are dealt when the selection timer ends.'
      : selectionExpired ? 'Selection has ended. The server is assigning any remaining characters.'
      : kept ? 'The answer is uncertain. Send the same choice again while selection is open.'
      : choiceRevision !== null ? 'Waiting for the confirmed character…'
      : notice || (takenChoice ? 'That character was taken. Choose another.' : '') || 'Choose a character and a public name, up to 12 characters. Your secret role is dealt separately.';
    const own = feed.own(), key = roleKey(own);
    if (key !== null && ownSeat?.ready) lifecycle.abandon(readyKey);
    role.update(own === null || confirmedReady ? null : { key, role: own.self.role, characterId: identity?.characterId ?? null,
      playerCount: setup?.playerCount, ready: ownSeat?.ready === true || readyAccepted === key, canConfirm: true, retry: lifecycle.unsettled(readyKey) !== null });
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
    if (outcome.kind === 'done') { choiceRevision = outcome.result.revision; ownConfirmSucceeded = true; }
    if (outcome.kind === 'refused') notice = outcome.code === 'CHARACTER_TAKEN' ? 'That character was taken. Choose another.'
      : outcome.code === 'NAME_TAKEN' ? 'That name was taken. Choose another.' : 'Your choice was not confirmed. Check the current setup and try again.';
    draw();
    if (outcome.kind === 'done') { status.setAttribute('tabindex', '-1'); status.focus?.(); }
  });
  name.addEventListener('keydown', event => { if (event.key === 'Enter' && !save.disabled) { event.preventDefault(); save.click?.(); } });
  picker.append(el('h2', 'Choose your character', { id: 'crew-heading' }), grid, label, nameHelp, confirmed, status, dock(el, save));
  node.append(progress.node, assignment, picker, readyNote, role.node, practiceNote);
  const stops = [feed.subscribe(draw), identities.subscribe(draw)];
  draw();
  return { node, refresh: draw,
    conceal() { role.conceal(); },
    dispose() { closed = true; stops.forEach(stop => stop()); role.dispose(); node.replaceChildren(); },
  };
}

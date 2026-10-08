// Phone journey components. All values here are public lobby/identity facts.
// Lifecycle requests and game authority stay in their existing controllers.
export function disclosure(el, title, ...content) {
  const node = el('details', undefined, { class: 'phone-more' });
  node.append(el('summary', title), ...content);
  return node;
}

export function dock(el, ...content) {
  const node = el('div', undefined, { class: 'phone-dock' });
  node.append(...content);
  return node;
}

export function copyControl(el, label, getValue, say) {
  const button = el('button', label, { type: 'button', class: 'connected-quiet' });
  button.addEventListener('click', async () => {
    const value = getValue();
    if (!value) return;
    try { await navigator.clipboard.writeText(value); say('Copied.'); }
    catch { say('Copy is unavailable. Select the text and copy it from this page.', 'problem'); }
  });
  return button;
}

/** Native radios mirror the existing select; its disabled state still freezes retries. */
export function choiceTiles(el, select, title, kind) {
  const node = el('fieldset', undefined, { class: `phone-tiles phone-tiles--${kind}` });
  node.append(el('legend', title));
  select.hidden = true;
  const radios = [...select.options].map(option => {
    const label = el('label', undefined, { class: 'phone-tile', 'data-value': option.value });
    const input = el('input', undefined, { type: 'radio', name: `${select.id}-tiles`, value: option.value });
    label.append(input, el('span', option.textContent));
    input.addEventListener('change', () => {
      if (select.disabled) return;
      select.value = input.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    node.append(label);
    return input;
  });
  const refresh = () => radios.forEach(input => { input.checked = input.value === select.value; input.disabled = select.disabled; });
  select.addEventListener('change', refresh);
  const observer = new MutationObserver(refresh);
  observer.observe(select, { attributes: true, attributeFilter: ['disabled'] });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  node.append(select);
  refresh();
  return node;
}

/** Public identities may include untrusted names: create text nodes, never markup. */
export function publicSlots(el, count, seats, identities = [], bots = []) {
  return Array.from({ length: count }, (_, index) => {
    const seatId = `seat-${index + 1}`, seat = seats.find(item => item.seatId === seatId);
    const identity = identities.find(item => item.seatId === seatId);
    const row = el('li', undefined, { class: 'phone-slot', 'data-filled': String(Boolean(seat)) });
    const face = el('span', String(index + 1), { class: 'phone-slot__face', 'aria-hidden': 'true' });
    if (/^c[1-9]$/.test(identity?.characterId ?? '')) face.setAttribute('data-character', identity.characterId);
    const words = el('span');
    words.append(el('strong', identity?.displayName ?? `Player ${index + 1}`),
      el('small', seat ? `${bots.includes(seatId) ? 'Bot · ' : ''}${seat.initialRoom}` : 'Open seat'));
    row.append(face, words);
    return row;
  });
}

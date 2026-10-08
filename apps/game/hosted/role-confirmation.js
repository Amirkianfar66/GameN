import { renderComicRoleCard, toHtml } from '@mothership/presentation';

// Receives only a currently authorized own role from the setup feed. Public setup
// screens never construct this control. No role is stored outside this instance.
export function createRoleConfirmation({ el, onReady }) {
  const node = el('section', undefined, { class: 'connected-role-confirmation ms-shell', 'aria-labelledby': 'setup-role-heading', 'data-motion': 'full' });
  const status = el('p', 'Waiting for your private role.', { id: 'setup-role-status', role: 'status', class: 'ms-visually-hidden' });
  const toggle = el('button', 'Reveal my role', { type: 'button', id: 'setup-role-toggle', class: 'phone-role-toggle', 'aria-label': 'Reveal my role', 'aria-expanded': 'false', 'aria-controls': 'setup-role-card' });
  const card = el('div', undefined, { class: 'ms-private__panel', id: 'setup-role-card' });
  const ready = el('button', 'Ready', { type: 'button', id: 'setup-role-ready' });
  const back = el('div', 'Tap to reveal', { class: 'phone-role-back', 'aria-hidden': 'true' });
  toggle.textContent = '';
  const surface = el('div', undefined, { class: 'phone-role-surface' }); surface.append(back, card, toggle);
  node.append(el('h2', 'Your private role', { id: 'setup-role-heading', class: 'ms-visually-hidden' }), status, surface, ready);
  let value = null, visible = false, seenKey = null, busy = false, disposed = false, drawnCard = '', failure = '';

  function draw() {
    if (disposed) return;
    toggle.disabled = value === null || busy;
    toggle.hidden = value?.ready === true;
    toggle.setAttribute('aria-label', visible ? 'Hide my role' : 'Reveal my role');
    toggle.setAttribute('aria-expanded', String(visible));
    ready.hidden = value === null || value.ready || seenKey !== value.key;
    ready.disabled = value === null || seenKey !== value.key || busy || !value.canConfirm;
    ready.textContent = busy ? 'Confirming…' : value?.retry ? 'Retry Ready' : 'Ready';
    status.setAttribute('class', failure ? 'phone-role-error' : 'ms-visually-hidden');
    status.textContent = failure || (value === null ? 'Waiting for a fresh, authorized role.'
      : value.ready ? 'You are ready. Waiting for everyone else.'
      : busy ? 'Confirming your readiness…'
      : value.retry ? 'Your Ready answer is uncertain. Send the same request again.'
      : seenKey === value.key ? 'Press Ready when you understand your role.' : 'Reveal your role, then press Ready.');
    const next = visible && value !== null && !value.ready ? toHtml(renderComicRoleCard(value.role, value.characterId)) : '';
    if (next !== drawnCard) {
      if (next === '') card.replaceChildren();
      else {
        card.innerHTML = next; // Shared renderer escapes all text and attributes.

      }
      drawnCard = next;
    }
    card.hidden = next === '';
    back.hidden = next !== '';
  }
  toggle.addEventListener('click', () => {
    if (disposed || toggle.disabled || value === null || value.ready) return;
    visible = !visible;
    if (visible) seenKey = value.key;
    draw();
  });
  ready.addEventListener('click', async () => {
    if (disposed || ready.disabled || value === null) return;
    const key = value.key;
    busy = true; visible = false; failure = ''; draw();
    try { const result = await onReady(key); if (result?.kind === 'refused' || result?.kind === 'invalid') failure = 'Ready not confirmed. Try again.'; }
    finally { busy = false; draw(); }
  });
  draw();
  return {
    node,
    update(next) {
      if (disposed) return;
      if (next === null || next.key !== value?.key) { visible = false; seenKey = null; }
      if (next?.ready) visible = false;
      value = next === null ? null : { ...next };
      draw();
    },
    conceal() { visible = false; draw(); },
    dispose() { value = null; visible = false; seenKey = null; card.replaceChildren(); drawnCard = ''; disposed = true; node.replaceChildren(); },
  };
}

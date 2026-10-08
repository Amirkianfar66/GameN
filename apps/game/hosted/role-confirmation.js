import { renderComicRoleCard, toHtml } from '@mothership/presentation';
import { ROLE_GUIDE } from './role-guide.js';
import { dock } from './phone-ui.js';

// Receives only a currently authorized own role from the setup feed. Public setup
// screens never construct this control. No role is stored outside this instance.
export function createRoleConfirmation({ el, onReady }) {
  const node = el('section', undefined, { class: 'connected-role-confirmation ms-shell', 'aria-labelledby': 'setup-role-heading', 'data-motion': 'full' });
  const status = el('p', 'Waiting for your private role.', { id: 'setup-role-status', role: 'status' });
  const toggle = el('button', 'Reveal my role', { type: 'button', id: 'setup-role-toggle', 'aria-expanded': 'false', 'aria-controls': 'setup-role-card' });
  const card = el('div', undefined, { class: 'ms-private__panel', id: 'setup-role-card' });
  const ready = el('button', 'Ready', { type: 'button', id: 'setup-role-ready' });
  const back = el('div', 'PRIVATE', { class: 'phone-role-back', 'aria-hidden': 'true' });
  node.append(el('h2', 'Your private role', { id: 'setup-role-heading' }),
    el('p', 'Only reveal this where other players cannot see your screen.'), status, back, card, dock(el, toggle, ready));
  let value = null, visible = false, seenKey = null, busy = false, disposed = false, drawnCard = '';

  function draw() {
    if (disposed) return;
    toggle.disabled = value === null || busy;
    toggle.hidden = value?.ready === true;
    toggle.textContent = visible ? 'Hide my role' : 'Reveal my role';
    toggle.setAttribute('aria-expanded', String(visible));
    ready.hidden = value === null || value.ready;
    ready.disabled = value === null || seenKey !== value.key || busy || !value.canConfirm;
    ready.textContent = busy ? 'Confirming…' : value?.retry ? 'Send the same Ready again' : 'Ready';
    status.textContent = value === null ? 'Waiting for a fresh, authorized role.'
      : value.ready ? 'You are ready. Waiting for everyone else.'
      : busy ? 'Confirming your readiness…'
      : value.retry ? 'Your Ready answer is uncertain. Send the same request again.'
      : seenKey === value.key ? 'Press Ready when you understand your role.' : 'Reveal your role, then press Ready.';
    const next = visible && value !== null && !value.ready ? toHtml(renderComicRoleCard(value.role, value.characterId)) : '';
    if (next !== drawnCard) {
      if (next === '') card.replaceChildren();
      else {
        card.innerHTML = next; // Shared renderer escapes all text and attributes.
        if (ROLE_GUIDE[value.role]) {
          const guide = value.role === 'Supplier' && value.playerCount !== undefined && value.playerCount < 9
            ? ROLE_GUIDE.Supplier.replace('; the Officer still has only one ordinary shot per match.', '.') : ROLE_GUIDE[value.role];
          card.append(el('p', guide, { class: 'setup-role-guide' }));
        }
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
    busy = true; visible = false; draw();
    try { await onReady(key); }
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

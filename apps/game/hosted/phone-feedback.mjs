// Presentation wrapper for the exact reviewed Designer token/icon bytes. Uniform static
// imports for every audience; no URL or asset is selected from a role or private claim.
import tokens from './phone-feedback-tokens.json' with { type: 'json' };
import { iconSvg } from './scene-drawing/icons.mjs';

export function applyPhoneFrame(root) {
  root.dataset.phoneFrame = tokens.version;
  for (const [name, value] of Object.entries(tokens.color)) root.style.setProperty(`--pf-${name}`, value);
  for (const node of root.querySelectorAll('.phone-nav__icon')) {
    const kind = ['board', 'actions', 'pass', 'role', 'more'].find(name => node.classList.contains(`phone-nav__icon--${name}`));
    const icon = kind === 'role' ? 'card' : kind === 'more' ? 'menu' : kind;
    if (icon && node.dataset.pfIcon !== icon) { node.dataset.pfIcon = icon; node.innerHTML = iconSvg(icon); }
  }
  const timer = root.querySelector('.ms-phase .ms-timer');
  if (timer && !timer.querySelector('.phone-clock-icon')) {
    const icon = document.createElement('span'); icon.className = 'phone-clock-icon'; icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconSvg('clock'); timer.prepend(icon);
  }
}

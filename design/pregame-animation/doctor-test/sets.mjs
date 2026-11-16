// The two places of the test, taken from today's approved film exactly as it draws them (room-drawing's ink and
// light, the briefing room and the Colony Nine ward), with the player's character and the injector lifted out, so
// that the animation's own drawings of them can act there. Nothing is redrawn: each place is today's picture at
// rest (its reduced-motion moment), split into its planes of depth for the camera. What moves in the light (dust,
// the lamp's breath) is the film engine's, drawn over it while it plays.

import { briefingSvg, layout } from '../../../apps/game/hosted/pregame-films/roles/briefing.mjs';
import { doctorPanels } from '../../../apps/game/hosted/pregame-films/roles/doctor.mjs';
import { ROLES } from '../../../apps/game/hosted/pregame-films/roles/roles.mjs';
import { defs } from '../../../apps/game/hosted/pregame-films/kit/fx.mjs';
import { f } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';

/** The opener's moment the room is taken from: lamp on, the light through the blinds, nothing pushed in. */
const REST = Object.freeze({ fade: 1, slats: 1, lamp: 1, anticipate: 0, reach: 1, grip: true, settle: 1, raise: 0, look: 0, glint: 0, push: 0, t: 1300 });

/**
 * The briefing room on a W x H phone, as today's film draws it, in four planes: `far` (the wall and the window on the
 * dock), `air` (the light through the blinds), `desk` (the desk, the lamp, the light on them), `card` (the card on the
 * desk, in front of the character) and `mug` (out of focus in the foreground). Each is SVG markup in the room's own
 * px, with the definitions it needs (`defs`). `L` is the room's layout.
 */
export function briefingRoom(W, H) {
  const D = defs();
  const role = ROLES.doctor;
  const look = { ...role, gadget: role.gadget() };
  const L = layout(W, H);
  const { svg } = briefingSvg(D, { W, H, t: REST.t, o: REST, role: look, character: 'c8', reduced: true });
  // The camera's wrapper is the same for each plane when nothing is pushed in: split on it.
  const focus = [L.cx + 20 * L.u, 354 * L.u];
  const cam = `<g transform="translate(${f(focus[0])} ${f(focus[1])}) scale(1.32) translate(${f(-focus[0])} ${f(-focus[1])})">`;
  const planes = svg.split(cam).slice(1).map(p => p.replace(/<\/g>$/, ''));
  if (planes.length !== 4) throw new Error(`The room did not split into its planes (${planes.length})`);
  const [far, air, near, mug] = planes;
  // In the near plane: the desk, then the character (lifted out), the injector in the hand (lifted out), the card.
  const heroAt = near.indexOf('<g clip-path="url(#bf-hero-clip)">');
  const cardAt = near.indexOf(`<g><rect x="${f(L.card.x + 4 * L.u)}" y="${f(L.card.y + 6 * L.u)}"`);
  if (heroAt < 0 || cardAt < heroAt) throw new Error('The room\'s character could not be lifted out');
  // The injector's shadow on the desk is drawn by the animation (it lies there until the injector is taken).
  const desk = near.slice(0, heroAt).replace(/<ellipse[^>]*filter="url\(#bf-gadget-shadow\)"\/>/, '');
  return { L, defs: D.markup(), far, air, desk, card: near.slice(cardAt), mug, focus, zoom: 1.32 };
}

/**
 * The Colony Nine ward, as today's first panel draws it at rest, on a `w` x `h` picture, without the character:
 * one plane, in the ward's own px (sepia is put on by the test when it is drawn).
 */
export function colonyWard(w, h) {
  const D = defs();
  const [panel] = doctorPanels(D, { character: 'c8', seat: 4, reduced: true });
  const svg = panel({ w, h, local: 1300 });
  // The character is the panel's last drawing (doctor.mjs colonyWard): everything from its first mark on.
  const start = svg.indexOf('<g opacity="1"><g filter="url(#dc1-hero-light)">');
  if (start < 0) throw new Error('The ward\'s character could not be lifted out');
  return { defs: D.markup(), ward: svg.slice(0, start), k: h / 252 };
}

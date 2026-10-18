// mothership:dev-only
//
// ATTACK BLOCKED drawn on the board-v2 review page (storyboard S4; docs/design/attack-blocked.md).
// A picture for review, not a client: no command, server or private state exists here, and every
// input is a synthetic fixture.
//
// The film is room-visible: it is mounted only on the screens of the room's occupants. Anyone
// else's page, and the display, get nothing at all from it: not a node, a class or a word. And
// it is the same whichever defense blocked the attack.
//
//   ?film=blocked           the film on its own, on the mixed board (page.js)
//   &t=<ms>                 the moment, from the checkpoint (default 760)
//   &play=1                 play it again and again
//   &targets=B2[,B4]        the blocked targets' slots (default B2)
//   &viewer=occupant|outsider|display|art   a player in the targets' room (default), a player in
//                           another room, the shared display, or the art review: every target's room
//                           at once, which no screen ever receives
//   &cause=clone|protection the defense: changes nothing, which is the point
//   &injured=1              the already-Injured example: without &targets, the target is the
//                           fixture's first Injured patient in the Hospital (on the mixed board, Rigel
//                           at H1, in the gown); with &targets, every target must already be one. The
//                           page never changes anyone's health, room or slot: it draws the fixture
//   &motion=reduced         the device's reduced-motion setting

import { CREW } from '../../board-motion/figures/crew.mjs';
import { STAR_SIZE, blockedEnd, blockedFrame } from '../films/blocked.mjs';
import { SHIELD_SIZE } from '../fx/blocked.mjs';
import { LABEL_MARGIN, labelBox } from '../fx/label-box.mjs';
import { slotRects, slotsOf } from './layout.mjs';

const FX = '../board-v2/assets/fx';
const LIGHTING = '../board-v2/assets/lighting';

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}

/**
 * One blocked attack on one target, in its room's panel: returns apply(t), which draws the film
 * at t ms from the checkpoint, removes every node it added once the film is over, and returns the
 * frame with its sentence for the live region ('' when there is none).
 */
export function mountBlocked({ section, rect, panel, figures, name, reduced }) {
  const [px, py] = rect.press;
  const shieldSide = SHIELD_SIZE * rect.side;
  const box = side => ({ left: `${px - side / 2}px`, top: `${py - side / 2}px`, width: `${side}px`, height: `${side}px` });
  const star = el('img', { class: 'v2-block v2-block__star', alt: '', src: `${LIGHTING}/fx-impact-2.svg`, style: box(STAR_SIZE * rect.side) });
  const shield = el('img', { class: 'v2-block v2-block__shield', alt: '', style: box(shieldSide) });
  const ring = el('img', { class: 'v2-block v2-block__ring', alt: '', src: `${FX}/fx-block-ring.svg`, style: box(shieldSide) });
  const particles = el('img', { class: 'v2-block v2-block__particles', alt: '', style: box(shieldSide) });
  // Two words, so that a panel too narrow for one line can stack them.
  const label = el('span', { class: 'v2-block v2-block__label', 'aria-hidden': 'true' }, el('span', {}, 'Attack'), ' ', el('span', {}, 'blocked'));
  let placed = false;
  const show = (node, on) => { if (on) { if (!node.isConnected) section.append(node); } else node.remove(); };
  return function apply(t) {
    const frame = blockedFrame(t, { reduced });
    show(star, frame.star.on);
    star.style.transform = `scale(${frame.star.scale})`;
    show(shield, frame.shield.frame > 0);
    if (frame.shield.frame) { shield.src = `${FX}/fx-shield-${frame.shield.frame}.svg`; shield.style.transform = `scale(${frame.shield.scale})`; shield.style.opacity = String(frame.shield.opacity); }
    show(ring, frame.ring.opacity > 0);
    ring.style.transform = `scale(${frame.ring.scale})`;
    ring.style.opacity = String(frame.ring.opacity);
    show(particles, frame.particles.frame > 0);
    if (frame.particles.frame) { particles.src = `${FX}/fx-block-particles-${frame.particles.frame}.svg`; particles.style.opacity = String(frame.particles.opacity); }
    show(label, frame.label.opacity > 0);
    if (label.isConnected) {
      label.style.opacity = String(frame.label.opacity);
      label.style.transform = `skewX(-8deg) scale(${frame.label.scale})`;
      if (!placed) {
        placed = true;
        // One line where the panel has room for it, else the two words stacked.
        label.classList.toggle('v2-block__label--stack', label.offsetWidth > panel.width - 2 * LABEL_MARGIN);
        const caption = section.querySelector('.v2-cap');
        const box = labelBox({ rect, panel, size: [label.offsetWidth, label.offsetHeight], caption: caption ? { left: caption.offsetLeft, top: caption.offsetTop, width: caption.offsetWidth, height: caption.offsetHeight } : null });
        Object.assign(label.style, { left: `${box.left}px`, top: `${box.top}px` });
        label.dataset.place = box.place;
      }
    }
    // The brace moves the figure's art only, never its press area.
    for (const figure of figures()) figure.style.translate = frame.brace[0] || frame.brace[1] ? `${frame.brace[0]}px ${frame.brace[1]}px` : '';
    return { ...frame, sentence: frame.announce ? `Attack blocked on ${name}.` : '' };
  };
}

/**
 * The polite live region for room-visible facts: on every screen, recipient or not, and empty but
 * while a block's label is up on a recipient's. Its existence says nothing; only its words do.
 */
export function roomLive(app) {
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite', 'data-live': 'room' });
  app.append(live);
  return frames => {
    const text = frames.map(frame => frame.sentence).filter(Boolean).join(' ');
    if (live.textContent !== text) live.textContent = text;
  };
}

/**
 * The blocked targets, as the review address names them: the fixture's occupants at &targets
 * (default B2), or, for &injured=1 without &targets, the fixture's first Injured patient in the
 * Hospital. Each is the fixture's own seat, in the room, slot and health the fixture gives: an
 * Injured character is a Hospital patient (G-05), so a target named with &injured=1 must already
 * be one. Nothing here moves anyone or changes a health.
 */
export function blockedTargets(params, seats) {
  const injured = params.get('injured') === '1';
  const patients = seats.filter(seat => seat.room === 'hospital' && seat.health === 'Injured');
  if (injured && !params.has('targets') && !patients.length) throw new Error('injured=1 needs an Injured patient in the Hospital, and this fixture has none');
  const ids = params.has('targets') ? params.get('targets').split(',').filter(Boolean) : injured ? [patients[0].slot] : ['B2'];
  return ids.map(id => {
    const seat = seats.find(entry => entry.slot === id);
    if (!seat) throw new Error(`Nobody at ${id} in the fixture`);
    if (injured && !patients.includes(seat)) throw new Error(`injured=1 shows an already-Injured target, who is a patient in the Hospital; ${id} is ${seat.health} in ${seat.room}`);
    return seat;
  });
}

/** The ?film=blocked review page: one checkpoint's blocks, on the screen the viewer gives. */
export function mountBlockedPage({ app, board, roster, seats, params }) {
  const reduced = params.get('motion') === 'reduced';
  const viewer = params.get('viewer') ?? 'occupant';
  const targets = blockedTargets(params, seats);
  document.documentElement.dataset.film = 'blocked';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const top = app.querySelector('.v2-top');
  top.querySelector('.v2-top__label').replaceWith(el('span', { class: 'v2-top__phase' }, 'Round 3: attacks'));
  // The blocks this screen receives: the targets' room's occupants only.
  const say = roomLive(app);
  const rooms = new Set(targets.map(seat => seat.room));
  if (viewer === 'occupant' && rooms.size > 1) throw new Error('An occupant is in one room: give targets in one room, or viewer=art');
  const blocks = [];
  for (const seat of targets) {
    // The target as page.js drew it from the fixture: its room, its slot, its health and clothes. The film adds to it and changes none of them.
    const room = seat.room;
    const section = app.querySelector(`.v2-room[data-room="${room}"]`);
    const panel = board.panels[room];
    const index = slotsOf(room, roster).findIndex(slot => slot.id === seat.slot);
    if (viewer !== 'occupant' && viewer !== 'art') continue;
    blocks.push(mountBlocked({ section, rect: slotRects(room, roster, panel)[index], panel, figures: () => [...section.querySelectorAll(`.v2-fig[data-seat="${seat.seat}"]`)], name: CREW[seat.character].sign, reduced }));
  }
  const apply = t => {
    const frames = blocks.map(block => block(t));
    say(frames);
    // The film's stage where this screen draws it, for the captures to check; 'none' where it does not.
    const frame = blockedFrame(t, { reduced });
    document.documentElement.dataset.stage = blocks.length ? frame.stage : 'none';
    return frame;
  };
  if (params.get('play') === '1') {
    const start = performance.now();
    const length = blockedEnd(reduced) + 900;
    const tick = now => { apply((now - start) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__blockedFrame = apply(Number(params.get('t') ?? 760));
  }
}

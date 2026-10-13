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
//   &injured=1              the target was already Injured: it stays Injured
//   &motion=reduced         the device's reduced-motion setting

import { CREW } from '../../board-motion/figures/crew.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { STAR_SIZE, blockedEnd, blockedFrame } from '../films/blocked.mjs';
import { SHIELD_SIZE } from '../fx/blocked.mjs';
import { sceneOf, slotsOf } from '../scenes/slots.mjs';
import { slotRects } from './fit.mjs';

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

/** The label's margin from the panel's edges and from the room's caption, in px. */
export const LABEL_MARGIN = 2;

const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

/**
 * Where ATTACK BLOCKED goes for a target: centred on its press point, LABEL_MARGIN inside the
 * panel, and never over the room's caption. Above the target's press area; where that leaves the
 * panel or meets the caption, below its name tag; where neither fits, as high as the caption
 * allows. `size` is the label's [width, height]; `caption` the caption's box in the panel, or null.
 * Returns { left, top, place } with place 'above', 'below' or 'clamped'.
 */
export function labelBox({ rect, panel, size: [width, height], caption = null }) {
  const m = LABEL_MARGIN;
  const left = Math.max(m, Math.min(panel.width - width - m, rect.press[0] - width / 2));
  const guard = caption ? { left: caption.left - m, top: caption.top - m, width: caption.width + 2 * m, height: caption.height + 2 * m } : null;
  const fits = top => top >= m && top + height <= panel.height - m && !(guard && overlaps({ left, top, width, height }, guard));
  // The name tag's bottom, as page.js draws it: at the foot of the press area, kept inside the panel.
  const tagBottom = Math.min(panel.height - 16, rect.top + rect.side - 14) + 16;
  const above = rect.top - height - m;
  if (fits(above)) return { left, top: above, place: 'above' };
  const below = tagBottom + m;
  if (fits(below)) return { left, top: below, place: 'below' };
  const floor = guard && guard.left < left + width && left < guard.left + guard.width ? guard.top + guard.height : m;
  return { left, top: Math.max(floor, Math.min(panel.height - height - m, above)), place: 'clamped' };
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

/** The ?film=blocked review page: one checkpoint's blocks, on the screen the viewer gives. */
export function mountBlockedPage({ app, board, roster, seats, params, drawFigure }) {
  const reduced = params.get('motion') === 'reduced';
  const viewer = params.get('viewer') ?? 'occupant';
  const targets = (params.get('targets') ?? 'B2').split(',').filter(Boolean);
  document.documentElement.dataset.film = 'blocked';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const top = app.querySelector('.v2-top');
  top.querySelector('.v2-top__label').replaceWith(el('span', { class: 'v2-top__phase' }, 'Round 3: attacks'));
  // The blocks this screen receives: the targets' room's occupants only.
  const say = roomLive(app);
  const rooms = new Set(targets.map(id => seats.find(entry => entry.slot === id)?.room));
  if (viewer === 'occupant' && rooms.size > 1) throw new Error('An occupant is in one room: give targets in one room, or viewer=art');
  const blocks = [];
  for (const id of targets) {
    const seat = seats.find(entry => entry.slot === id);
    if (!seat) throw new Error(`Nobody at ${id} in the fixture`);
    const room = seat.room;
    const section = app.querySelector(`.v2-room[data-room="${room}"]`);
    const panel = board.panels[room];
    const { k, tx, ty } = frameScene(sceneOf(room, roster), panel);
    const index = slotsOf(room, roster).findIndex(slot => slot.id === id);
    const slot = slotsOf(room, roster)[index];
    // An Injured target is drawn Injured, and stays so.
    if (params.get('injured') === '1') {
      for (const node of section.querySelectorAll(`.v2-fig[data-seat="${seat.seat}"]`)) node.remove();
      section.querySelector('.v2-art').append(...drawFigure(room, slot, { ...seat, health: 'Injured' }, { k, tx, ty }));
    }
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

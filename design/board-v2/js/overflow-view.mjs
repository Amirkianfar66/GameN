// mothership:dev-only
//
// The overflow victim's beat on the board-v2 review page (films/overflow.mjs), on the successor's
// four-berth board: ?film=overflow&beds=4. A picture for review, not a client: no command, server,
// clock or private state exists here, and every input is a synthetic fixture
// (overflow-fixtures.mjs). A review page's controller: not to be ported.
//
//   ?film=overflow&beds=4   the beat over the snapshot published with the occurrence
//     &t=<ms>               the moment, from the occurrence's presentation start (default 700)
//     &play=1               play it again and again
//   &motion=reduced         the device's reduced-motion setting
//
// Also drawSpinePlaque(): the successor board's off-board count in the spine between the Hospital
// and the Jail (fx/overflow.mjs spinePlaqueBox()), which captain-view.mjs uses under &beds=4.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { frameScene, pressPoint } from '../../board-motion/scenes/frame.mjs';
import { memorialSvg } from '../fx/captain.mjs';
import { fullStampBox, overflowWay, spinePlaqueBox } from '../fx/overflow.mjs';
import { overflowEnd, overflowFrame } from '../films/overflow.mjs';
import { FOUR, LOCATION_OF, sceneOf, slotRects, slotsOf } from './layout.mjs';
import { overflowOutcome, overflowWords } from './overflow-fixtures.mjs';

const ART = '../board-v2/assets/captain';
const [BX, BY, BOX] = FRAME.box;
const [AX, AY] = FRAME.anchor;

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}
const px = v => `${Number(v.toFixed(2))}px`;

export const isOverflowFilm = film => film === 'overflow';

/**
 * The successor board's plaque, in the spine between the Hospital and the Jail: count characters
 * off the board (the page's text), drawn into the board's surface. attrs mark it the film's or the
 * board's state. Returns the node, or null where nobody is off the board or the spine is too narrow.
 */
export function drawSpinePlaque(app, board, count, attrs = {}) {
  if (count <= 0) return null;
  const surface = app.querySelector('.v2-board');
  const plaque = el('span', { class: 'v2-plaque v2-plaque--spine', role: 'img', 'aria-label': `${count} off the board`, ...attrs }, el('img', { src: `${ART}/plaque.svg`, alt: '' }), el('b', { 'aria-hidden': 'true' }, String(count)));
  surface.append(plaque);
  const at = spinePlaqueBox({ hospital: board.boxes.hospital, jail: board.boxes.jail, border: board.shell.border, cap: board.panels.hospital.cap, size: [plaque.offsetWidth, plaque.offsetHeight] });
  if (!at) { plaque.remove(); return null; }
  Object.assign(plaque.style, { left: px(at.left - board.boardLeft), top: px(at.top - board.boardTop) });
  return plaque;
}

/** The review page's ?film=overflow&beds=4, over the board page.js has drawn from the snapshot published with the occurrence. */
export function mountOverflow({ app, board, roster, params }) {
  if (!FOUR) throw new Error('The overflow beat is drawn on the successor board: add &beds=4');
  const reduced = params.get('motion') === 'reduced';
  const { subject, after } = overflowOutcome(roster);
  document.documentElement.dataset.film = 'overflow';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite', 'data-live': 'public' });
  app.append(live);
  app.querySelector('.v2-top__label').replaceWith(el('span', { class: 'v2-top__phase' }, 'Round 3: results'));
  const section = room => app.querySelector(`.v2-room[data-room="${room}"]`);
  const border = board.shell.border;
  const end = overflowEnd(reduced);

  // Where the victim was: its room and slot in the snapshot before, framed as page.js frames them.
  const room = subject.room;
  const panel = board.panels[room];
  const frame = frameScene(sceneOf(room, roster), panel);
  const slot = slotsOf(room, roster).find(entry => entry.id === subject.slot);
  const sk = skeletonOf(slot.gesture);
  const unit = slot.scale * frame.k;
  const outfit = outfitFor(LOCATION_OF[room]);
  const box = { left: frame.tx + slot.at[0] * frame.k - (AX - BX) * unit, top: frame.ty + slot.at[1] * frame.k - (AY - BY) * unit, side: BOX * unit };
  const [pxF, pyF] = pressPoint(sk);
  // The figure's press point inside its box (a mirrored figure turns about its anchor), then on the phone.
  const pressIn = [slot.mirror ? (2 * (AX - BX) - (pxF - BX)) * unit : (pxF - BX) * unit, (pyF - BY) * unit];
  const roomBox = board.boxes[room];
  const pressOnPhone = [roomBox.left + border + box.left + pressIn[0], roomBox.top + border + box.top + pressIn[1]];
  const figureSvg = prefix => dressedFigureSvg(CREW[subject.character], sk, { outfit, prefix });
  const art = section(room).querySelector('.v2-art');
  const hospital = section('hospital');
  const hospitalCaption = hospital.querySelector('.v2-cap');
  const offAfter = after.filter(seat => seat.room === null).length;

  let added = [];
  const add = (parent, node) => { parent.append(node); added.push(node); return node; };
  const atPlace = (inner, z) => {
    const node = el('div', { class: 'v2-fig v2-fig--film', 'data-seat': String(subject.seat), 'data-mirror': String(slot.mirror), 'data-film': 'overflow', style: { left: px(box.left), top: px(box.top), width: px(box.side), height: px(box.side), '--origin': `${((AX - BX) / BOX) * 100}%`, zIndex: String(z) } });
    node.innerHTML = inner;
    return node;
  };

  const apply = t => {
    for (const node of added) node.remove();
    added = [];
    const isLive = t >= 0 && t < end;
    const f = overflowFrame(t, { reduced });
    if (isLive) {
      // The FULL stamp beside the Hospital's caption (the page's text).
      if (f.full.opacity > 0) {
        const stamp = add(hospital, el('span', { class: 'v2-ovf__stamp', 'aria-hidden': 'true', 'data-film': 'overflow' }, 'Full'));
        // Clear of the caption and of every bed's press area; where there is no room for it, the words say it alone.
        const keepClear = slotRects('hospital', roster, board.panels.hospital).map(rect => ({ left: rect.left, top: rect.top, width: rect.side, height: rect.side }));
        const at = fullStampBox({ caption: { left: hospitalCaption.offsetLeft, top: hospitalCaption.offsetTop, width: hospitalCaption.offsetWidth, height: hospitalCaption.offsetHeight }, size: [stamp.offsetWidth, stamp.offsetHeight], panel: board.panels.hospital, keepClear });
        if (!at) stamp.remove();
        else Object.assign(stamp.style, { left: px(at.left), top: px(at.top), opacity: String(Number(f.full.opacity.toFixed(2))), ...(f.full.scale !== 1 ? { transform: `scale(${f.full.scale})` } : {}) });
      }
      // The victim at its place, turning into its grey cut-out.
      const z = Math.round(slot.depth) * 2;
      if (f.figure.opacity > 0) add(art, atPlace(figureSvg(`ovf${subject.seat}b`), z)).style.opacity = String(f.figure.opacity);
      if (f.figure.grey > 0) {
        const grey = add(art, atPlace(memorialSvg(figureSvg(`ovf${subject.seat}g`)), z + 1));
        grey.classList.add('v2-fig--memorial');
        grey.style.opacity = String(f.figure.grey);
      }
    }
    // The plaque: the board's state outside the beat (the snapshot's count); during it, the earlier count until the plaque takes the victim.
    const count = !isLive || f.plaque.counted ? offAfter : offAfter - 1;
    const plaque = drawSpinePlaque(app, board, count, isLive ? { 'data-film': 'overflow' } : { 'data-state': 'plaque' });
    if (plaque) {
      added.push(plaque);
      if (isLive && f.plaque.scale !== 1) plaque.style.transform = `scale(${f.plaque.scale})`;
    }
    if (isLive && f.flyer) {
      // The cut-out leaving the board, on its arc to the plaque, over every room.
      // Its target is the plaque's centre; before the plaque has counted it (and while nobody else is off the board, so
      // that no plaque is drawn yet), where the plaque will appear, from a plaque laid out for the count and taken away.
      const centre = node => [node.offsetLeft + node.offsetWidth / 2 + board.boardLeft, node.offsetTop + node.offsetHeight / 2 + board.boardTop];
      let target = plaque ? centre(plaque) : null;
      if (!target) {
        const probe = drawSpinePlaque(app, board, offAfter);
        target = probe ? centre(probe) : pressOnPhone;
        probe?.remove();
      }
      const [x, y] = overflowWay(pressOnPhone, target, f.flyer.v);
      const surface = app.querySelector('.v2-board');
      // The flyer scales about the figure's press point; the figure inside it keeps page.js's mirroring.
      const flyer = el('div', { class: 'v2-ovf__flyer', 'data-seat': String(subject.seat), 'data-film': 'overflow', 'data-to': target.map(v => v.toFixed(2)).join(','), style: { left: px(x - board.boardLeft - pressIn[0]), top: px(y - board.boardTop - pressIn[1]), width: px(box.side), height: px(box.side), opacity: String(f.flyer.opacity), transform: `scale(${f.flyer.scale})`, transformOrigin: `${px(pressIn[0])} ${px(pressIn[1])}` } });
      const cutOut = el('div', { class: 'v2-fig v2-fig--film v2-fig--memorial', 'data-seat': String(subject.seat), 'data-mirror': String(slot.mirror), 'data-film': 'overflow', style: { left: '0px', top: '0px', width: px(box.side), height: px(box.side), '--origin': `${((AX - BX) / BOX) * 100}%` } });
      cutOut.innerHTML = memorialSvg(figureSvg(`ovf${subject.seat}f`));
      flyer.append(cutOut);
      add(surface, flyer);
    }
    const sentence = isLive && f.announce ? overflowWords(subject.seat) : '';
    if (live.textContent !== sentence) live.textContent = sentence;
    document.documentElement.dataset.stage = f.stage;
    return { ...f, press: pressOnPhone, sentence };
  };
  if (params.get('play') === '1') {
    const startAt = performance.now();
    const length = end + 900;
    const tick = now => { apply((now - startAt) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__overflowFrame = apply(Number(params.get('t') ?? 700));
  }
}

// mothership:dev-only
//
// The review page's private-talk capsule (?capsule=1 and &film=capsule; docs/design/private-capsule.md):
// the capsule's panel beside the Command Room, and the Hack's public pair going there, sitting there and
// coming back, drawn from films/capsule.mjs on the page's synthetic board. A review page's controller:
// not to be ported. A client draws the pair the public projection names, from the server's stages and
// deadlines and the board's latest authoritative places; this page draws a fixture.
//
//   &stage=declare|result|talk|exit|idle   the stage (default result)
//   &t=<ms>                ms from the stage's authoritative start (default 2300)
//   &play=1                plays result, talk (its first 12 s) and exit in turn from a local clock (review only)
//   &pair=1,5              the two participants' seat numbers on the fixture (default 1,5)
//   &known=0|1|2           how many of the pair the public projection names so far (default 2; 1: the lower number)
//   &late=1                the second participant named after its part began: drawn settled
//   &settled=1             a reconnect: drawn at the stage's settled state
//   &moved=<seat>:<slot>   a voluntary move accepted meanwhile: that seat's latest place (its away marker and its return use it)
//   &viewer=player|display|participant   the screen; participant adds a stand-in for the participants'
//                          own claim panel (never its content), to show the film never covers it; with
//                          &ui=sheet, the sheet over the Hospital and the Jail instead (js/turns-view.mjs)
//   &exchange=<id>         the exchange's public id: the seed of the seated variations (default x-review)
//   &motion=reduced        the device's reduced-motion setting
//   &hit=1                 every target as a button, as for the board's slots: here each seated
//                          participant's own target (capsuleTargets()), for pointer tests
//
// ?sheet=capsule draws the capsule's art on one sheet for the art review (drawCapsuleSheet): no board.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { INJURED, skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { CAPSULE_FILM, capsuleEnd, capsuleFrame, capsulePerson, homePerson } from '../films/capsule.mjs';
import { POSE_NAMES, sittingPose, statusOf, walkingPose } from '../figures/capsule.mjs';
import { BADGE_SIZE, CAPSULE_SEATS, CAPSULE_SIZE, CAPSULE_VIEW, DOOR, DOOR_FRAMES, DOORWAY, PATHS, TAG_STRIP, capsuleTargets, frameCapsule } from '../scenes/capsule.mjs';
import { LOCATION_OF, sceneOf, slotsOf } from '../scenes/slots.mjs';
import { SHELL, CAPSULE, slotRects } from './fit.mjs';

const ART = '../board-v2/assets/capsule';
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

/** A figure drawn at an anchor (scene units) of a panel framed by { k, tx, ty }, as page.js draws a slot's. */
function figure(character, sk, { at, scale, mirror }, { k, tx, ty }, { outfit, prefix, z, seat }) {
  const unit = scale * k;
  const style = { left: `${tx + at[0] * k - (AX - BX) * unit}px`, top: `${ty + at[1] * k - (AY - BY) * unit}px`, width: `${BOX * unit}px`, height: `${BOX * unit}px`, '--origin': `${((AX - BX) / BOX) * 100}%`, zIndex: String(z) };
  const node = el('div', { class: 'v2-fig v2-fig--film', 'data-seat': String(seat), 'data-mirror': String(mirror), 'data-outfit': outfit, style });
  node.innerHTML = dressedFigureSvg(CREW[character], sk, { outfit, prefix });
  return node;
}

const CAPTION_WORDS = ['Private', 'talk'];

/**
 * The capsule's panel on the board: its cabin framed in the panel (frameCapsule), its door shut,
 * and its caption, the fixed kind, its two words stacked where one line would not fit. No slots
 * and no tag; its only targets are its seated participants' own, which mountCapsule() adds.
 */
export function drawCapsulePanel(box, panel) {
  const { k, tx, ty } = frameCapsule(panel);
  const section = el('section', { class: 'v2-room v2-capsule', 'data-room': CAPSULE.id, 'aria-label': 'Private talk', style: { left: `${box.left}px`, top: `${box.top}px`, width: `${panel.width + 2 * SHELL.border}px`, height: `${panel.height + 2 * SHELL.border}px` } });
  const art = el('div', { class: 'v2-art' });
  const layer = (name, z) => el('img', { class: `v2-capsule__${name.split('-')[0]}`, src: `${ART}/${name}.svg`, alt: '', 'data-layer': name, style: { left: `${tx}px`, top: `${ty}px`, width: `${512 * k}px`, height: `${768 * k}px`, zIndex: String(z) } });
  art.append(layer('back', 0), layer('door-0', 1));
  const caption = el('h2', { class: 'v2-cap v2-cap--capsule' }, ...CAPTION_WORDS.flatMap((word, i) => [i ? ' ' : null, el('span', {}, word)]));
  section.append(art, caption);
  return section;
}

/** The two words stacked where the caption, on one line, would be wider than the panel allows. */
export function fitCapsuleCaption(section, panel) {
  const caption = section.querySelector('.v2-cap--capsule');
  caption.classList.remove('v2-cap--stack');
  if (caption.offsetWidth > panel.width - 6) caption.classList.add('v2-cap--stack');
}

const minutes = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** The review page's &film=capsule. */
export function mountCapsule({ app, board, roster, seats, params, drawFigure, drawTag }) {
  const reduced = params.get('motion') === 'reduced';
  const viewer = params.get('viewer') ?? 'player';
  const exchangeId = params.get('exchange') ?? 'x-review';
  document.documentElement.dataset.film = 'capsule';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const capsule = app.querySelector('.v2-capsule');
  const capsulePanel = board.panels[CAPSULE.id];
  const capsuleFrameIn = frameCapsule(capsulePanel);
  const targets = capsuleTargets(capsulePanel);

  // A voluntary move accepted meanwhile: the seat's latest place, redrawn there as the board would.
  const moved = params.get('moved');
  if (moved) {
    const [seatNumber, slotId] = moved.split(':');
    const seat = seats.find(entry => entry.seat === Number(seatNumber));
    const room = { A: 'room-a', B: 'room-b', J: 'jail', H: 'hospital', C: 'command-room' }[slotId[0]];
    if (!seat || !room || seats.some(entry => entry.slot === slotId)) throw new Error(`moved=${moved}: no such seat, or ${slotId} is taken`);
    for (const node of app.querySelectorAll(`.v2-fig[data-seat="${seat.seat}"], .v2-tag[data-seat="${seat.seat}"]`)) node.remove();
    Object.assign(seat, { room, slot: slotId });
    const section = app.querySelector(`.v2-room[data-room="${room}"]`);
    const panel = board.panels[room];
    const slot = slotsOf(room, roster).find(entry => entry.id === slotId);
    const rect = slotRects(room, roster, panel).find(entry => entry.id === slotId);
    section.querySelector('.v2-art').append(...drawFigure(room, slot, seat, frameScene(sceneOf(room, roster), panel)));
    section.append(drawTag(seat, rect, panel));
  }

  // The pair, in player-number order: P1 the lower. Only the seats the projection names are drawn.
  const pair = (params.get('pair') ?? '1,5').split(',').map(Number).sort((a, b) => a - b);
  const count = Math.min(2, Math.max(0, Number(params.get('known') ?? 2)));
  const participants = pair.slice(0, count).map((number, index) => {
    const seat = seats.find(entry => entry.seat === number);
    if (!seat) throw new Error(`pair=${pair}: nobody is seat ${number} on this fixture`);
    if (seat.health === 'Eliminated') throw new Error(`pair=${pair}: seat ${number} is Eliminated`);
    return { id: CAPSULE_SEATS[index].id, seat, status: statusOf(seat) };
  });
  const known = Object.fromEntries(participants.map((p, index) => [p.id, params.get('settled') === '1' || (params.get('late') === '1' && index === 1) ? 'settled' : 'live']));

  // The top bar: the stage's own words and the server's countdown, in the bar's one row.
  const top = app.querySelector('.v2-top');
  const phase = el('span', { class: 'v2-top__phase' });
  const timer = el('span', { class: 'v2-top__timer', 'data-timer': 'stage' });
  top.querySelector('.v2-top__label').replaceWith(phase, timer);
  // The participants' own claim panel, as a stand-in on a participant's screen: where the phone puts it, never its content.
  const standin = viewer === 'participant' && !params.has('ui') ? el('div', { class: 'v2-private-standin', 'aria-hidden': 'true' }, el('b', {}, 'Private claim panel'), ' (stand-in: the two participants only)') : null;
  if (standin) { standin.style.bottom = `${board.shell.nav + board.insets.bottom + 6}px`; app.append(standin); }

  let added = [];
  const apply = (stage, t) => {
    for (const node of added) node.remove();
    added = [];
    const frame = capsuleFrame(stage, t, { known, reduced });
    document.documentElement.dataset.stage = stage;
    phase.textContent = { idle: 'Round 3: turns', declare: 'Hack: declaring', result: 'Hack: result', talk: 'Private talk', exit: 'Round 3: turns' }[stage];
    timer.textContent = { declare: minutes(CAPSULE_FILM.server.declareMaxMs - t), result: minutes(CAPSULE_FILM.server.resultMs - t), talk: minutes(CAPSULE_FILM.server.talkMs - t) }[stage] ?? '';
    if (standin) standin.hidden = !['declare', 'result', 'talk'].includes(stage);

    // The capsule: its door, the participants in it, the light, their tags.
    const door = capsule.querySelector('[data-layer^="door-"]');
    const doorName = `door-${Math.max(0, Math.min(DOOR_FRAMES - 1, frame.door))}`;
    if (door.dataset.layer !== doorName) { door.dataset.layer = doorName; door.src = `${ART}/${doorName}.svg`; }
    const art = capsule.querySelector('.v2-art');
    if (frame.busy) {
      const { k, tx, ty } = capsuleFrameIn;
      const busy = el('img', { class: 'v2-capsule__busy', src: `${ART}/busy.svg`, alt: '', 'data-layer': 'busy', style: { left: `${tx}px`, top: `${ty}px`, width: `${512 * k}px`, height: `${768 * k}px`, zIndex: '50' } });
      art.append(busy);
      added.push(busy);
    }
    const names = [];
    const tags = [];
    for (const p of participants) {
      const person = frame.people[p.id];
      if (!person) continue;
      const outfit = outfitFor(LOCATION_OF[p.seat.room]);
      // In the capsule.
      if (person.capsule.state !== 'empty' && person.capsule.opacity > 0) {
        const drawn = capsulePerson(p.id, person.capsule, p.status, { exchangeId, talkMs: stage === 'talk' ? t : 0, reduced });
        const node = figure(p.seat.character, drawn.sk, drawn, capsuleFrameIn, { outfit, prefix: `cap${p.seat.seat}`, z: 10 + Math.round(drawn.at[1] / 10), seat: p.seat.seat });
        node.dataset.capsule = p.id;
        node.dataset.state = person.capsule.state;
        node.style.opacity = String(person.capsule.opacity);
        art.append(node);
        added.push(node);
        if (person.capsule.state === 'seated' || (person.capsule.state === 'sitting' && person.capsule.progress >= 0.5) || (person.capsule.state === 'standing' && person.capsule.progress < 0.5)) {
          const { k, tx, ty } = capsuleFrameIn;
          const seatSpot = CAPSULE_SEATS.find(entry => entry.id === p.id);
          // Along the capsule's foot, under its chair: compact, so that two fit side by side on the smallest phone.
          const tag = el('span', { class: 'v2-tag v2-tag--capsule', 'data-seat': String(p.seat.seat), 'data-capsule': p.id, style: { left: `${tx + (seatSpot.at[0] + (seatSpot.mirror ? 8 : -8) * seatSpot.scale) * k}px`, top: `${Math.min(capsulePanel.height - TAG_STRIP, ty + seatSpot.at[1] * k - 4)}px` } }, el('b', {}, String(p.seat.seat)), CREW[p.seat.character].sign);
          capsule.append(tag);
          added.push(tag);
          tags.push(tag);
        }
        // Seated, it is a target for its own seat too (&hit=1 draws it, as the slots' are drawn).
        if (person.capsule.state === 'seated' && params.get('hit') === '1') {
          const rect = targets.find(entry => entry.id === p.id);
          const button = el('button', { class: 'v2-slot-hit', type: 'button', 'data-slot': `capsule-${p.id}`, 'data-capsule-target': p.id, 'data-seat': String(p.seat.seat), 'aria-label': `${CREW[p.seat.character].sign}, in the private talk`, style: { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` } });
          capsule.append(button);
          added.push(button);
        }
        names.push(`${p.seat.seat} ${CREW[p.seat.character].sign}`);
      }
      // At its place: the away marker, the badge, the outline, and the figure on its way.
      const room = p.seat.room;
      const section = app.querySelector(`.v2-room[data-room="${room}"]`);
      const panel = board.panels[room];
      const slot = slotsOf(room, roster).find(entry => entry.id === p.seat.slot);
      const rect = slotRects(room, roster, panel).find(entry => entry.id === p.seat.slot);
      const own = [...section.querySelectorAll(`.v2-fig[data-seat="${p.seat.seat}"]:not(.v2-fig--film)`)];
      const ghost = person.home.ghost;
      const rest = person.home.state === 'present';
      for (const node of own) {
        node.classList.toggle('v2-fig--away', !rest && ghost > 0);
        node.classList.toggle('v2-fig--pair', frame.highlight > 0 && rest);
        if (frame.highlight > 0) node.style.setProperty('--pair', String(frame.highlight));
        else node.style.removeProperty('--pair');
        node.style.opacity = rest ? '' : String(CAPSULE_FILM.away.opacity * ghost);
        node.style.visibility = rest || ghost > 0 ? '' : 'hidden';
      }
      if (!rest && person.home.figure > 0) {
        const gesture = p.seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
        const drawn = homePerson(slot, person.home, skeletonOf(gesture), p.status);
        const node = figure(p.seat.character, drawn.sk, drawn, frameScene(sceneOf(room, roster), panel), { outfit, prefix: `home${p.seat.seat}`, z: Math.round(slot.depth) * 2, seat: p.seat.seat });
        node.dataset.home = person.home.state;
        node.style.opacity = String(person.home.figure);
        section.querySelector('.v2-art').append(node);
        added.push(node);
      }
      const badge = Math.max(frame.highlight, ghost);
      if (badge > 0) {
        const node = el('img', { class: 'v2-capsule-badge', src: `${ART}/badge.svg`, alt: '', 'data-seat': String(p.seat.seat), style: { left: `${rect.badge[0]}px`, top: `${rect.badge[1]}px`, opacity: String(badge) } });
        section.append(node);
        added.push(node);
      }
    }
    // The tags stay whole inside the capsule's panel and apart: each moved in from the panel's edge,
    // and where the two would still touch, apart from each other's middle; never over the caption.
    const inside = capsule.getBoundingClientRect();
    for (const tag of tags) {
      const box = tag.getBoundingClientRect();
      const shift = Math.max(0, inside.left + SHELL.border + 1 - box.left) - Math.max(0, box.right - (inside.right - SHELL.border - 1));
      if (shift) tag.style.left = `${parseFloat(tag.style.left) + shift}px`;
    }
    if (tags.length === 2) {
      const [a, b] = tags.map(tag => tag.getBoundingClientRect());
      const overlap = a.right + 2 - b.left;
      if (overlap > 0) {
        tags[0].style.left = `${parseFloat(tags[0].style.left) - overlap / 2}px`;
        tags[1].style.left = `${parseFloat(tags[1].style.left) + overlap / 2}px`;
      }
    }
    capsule.setAttribute('aria-label', names.length ? `Private talk: ${names.join(' and ')}` : 'Private talk');
    capsule.dataset.state = frame.busy ? 'busy' : names.length ? 'occupied' : 'empty';
    return frame;
  };

  if (params.get('play') === '1') {
    const reel = [['result', CAPSULE_FILM.server.resultMs], ['talk', 12000], ['exit', capsuleEnd('exit', { reduced }) + 1500]];
    const total = reel.reduce((sum, [, ms]) => sum + ms, 0);
    const start = performance.now();
    const tick = now => {
      let t = (now - start) % total;
      for (const [stage, ms] of reel) { if (t < ms) { apply(stage, t); break; } t -= ms; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    window.__capsuleFrame = apply(params.get('stage') ?? 'result', Number(params.get('t') ?? 2300));
  }
}

// ---------- the art review's sheet ----------

/** The sheet's people: a participant of each public status, as the board dresses it. */
const SHEET_ROWS = [
  { label: 'Healthy', character: 'c1', outfit: 'crew', status: {} },
  { label: 'Injured: a patient, in the gown', character: 'c2', outfit: 'gown', status: { injured: true } },
  { label: 'Jailed: a prisoner', character: 'c4', outfit: 'prison', status: { jailed: true } },
  { label: 'Injured and detained, in the gown', character: 'c8', outfit: 'gown', status: { injured: true, jailed: true } },
];
const SHEET_COLUMNS = [
  ...POSE_NAMES.map(name => ({ label: { sit: 'sit', lean: 'lean in', back: 'sit back', open: 'open hand', chin: 'hand at chin', nod: 'nod' }[name], pose: status => sittingPose(name, status), chair: true })),
  { label: 'walk', pose: status => walkingPose(0, status), chair: false },
  { label: 'walk, mid-step', pose: status => walkingPose(0.5, status), chair: false },
];

/**
 * The capsule's art on one sheet (index.html?sheet=capsule), for the art review only, never a
 * screen's: the cabin's layers (empty, the door's four positions, occupied with its light lit, and
 * dark for the Blackout) and the badge; the two seats' anchors, the doorway's and the paths in and
 * out, with the part of the cabin a panel always shows; and every pose a participant takes there,
 * by the public status it is drawn in.
 */
export function drawCapsuleSheet(app) {
  const [W, H] = CAPSULE_SIZE;
  const sheet = el('div', { class: 'v2-sheet' });
  const text = (tag, className, content, left, top, width) => el(tag, { class: className, style: { left: `${left}px`, top: `${top}px`, ...(width ? { width: `${width}px` } : {}) } }, content);
  const cabin = (left, top, k, layers, people = []) => {
    const tile = el('div', { class: 'v2-sheet__cabin', style: { left: `${left}px`, top: `${top}px`, width: `${W * k}px`, height: `${H * k}px` } });
    layers.forEach(([name, z]) => tile.append(el('img', { src: `${ART}/${name}.svg`, alt: '', 'data-layer': name, style: { left: '0', top: '0', width: '100%', height: '100%', zIndex: String(z) } })));
    for (const person of people) tile.append(figure(person.character, person.sk, person, { k, tx: 0, ty: 0 }, { outfit: person.outfit ?? 'crew', prefix: person.prefix, z: 75, seat: 0 }));
    return tile;
  };
  const seated = (index, character, prefix) => ({ ...CAPSULE_SEATS[index], character, prefix, sk: sittingPose('sit', {}) });
  sheet.append(text('h1', 'v2-sheet__head', 'The private-talk capsule: art review sheet (synthetic, review only; never a screen\'s)', 16, 10));

  // The layers, back to front, as a screen stacks them; the dark for the Blackout; the badge.
  const k = 0.3;
  const tiles = [
    ['Empty: back + door-0', [['back', 0], ['door-0', 1]]],
    ['door-1', [['back', 0], ['door-1', 1]]],
    ['door-2', [['back', 0], ['door-2', 1]]],
    ['door-3: open', [['back', 0], ['door-3', 1]]],
    ['Occupied: + busy', [['back', 0], ['door-0', 1], ['busy', 50]], [seated(0, 'c1', 'sheetP1'), seated(1, 'c5', 'sheetP2')]],
    ['Blackout: dark', [['dark', 0]]],
  ];
  sheet.append(text('h2', 'v2-sheet__title', 'Layers (assets/capsule/*.svg)', 16, 40));
  tiles.forEach(([label, layers, people], index) => {
    const left = 16 + index * (W * k + 12);
    sheet.append(cabin(left, 64, k, layers, people), text('p', 'v2-sheet__note', label, left, 64 + H * k + 4, W * k));
  });
  const badgeLeft = 16 + tiles.length * (W * k + 12);
  sheet.append(el('img', { class: 'v2-sheet__badge', src: `${ART}/badge.svg`, alt: '', style: { left: `${badgeLeft}px`, top: '64px', width: `${BADGE_SIZE}px`, height: `${BADGE_SIZE}px` } }),
    el('img', { class: 'v2-sheet__badge', src: `${ART}/badge.svg`, alt: '', style: { left: `${badgeLeft + BADGE_SIZE + 12}px`, top: `${64 + (BADGE_SIZE - 22) / 2}px`, width: '22px', height: '22px' } }),
    text('p', 'v2-sheet__note', 'Badge: 48 and 22 px (its size on a phone)', badgeLeft, 64 + BADGE_SIZE + 6, 110));

  // The anchors and the paths, in scene units over the open cabin.
  const top2 = 64 + H * k + 52;
  const ka = 0.58;
  sheet.append(text('h2', 'v2-sheet__title', 'Seats and paths (scene units)', 16, top2 - 24));
  const walker = (at, scale, character, prefix, phase, mirror) => ({ at, scale, mirror, character, prefix, sk: walkingPose(phase, {}) });
  const anchors = cabin(16, top2, ka, [['back', 0], ['door-3', 1]], [seated(0, 'c1', 'anchorP1'), seated(1, 'c5', 'anchorP2'), walker(DOORWAY.at, DOORWAY.scale, 'c6', 'anchorDoor', 0.25, false)]);
  const label = (x, y, words, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="21" font-weight="700" fill="#F4EBDD" stroke="#10141C" stroke-width="6" paint-order="stroke">${words}</text>`;
  const cross = ([x, y]) => `<path d="M${x - 12} ${y}h24M${x} ${y - 12}v24" stroke="#F7C52B" stroke-width="5"/>`;
  const ring = ([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#F7C52B" stroke-width="4"/>`;
  const route = seat => `<polyline points="${[...PATHS[seat.id], seat.at].map(point => point.join(',')).join(' ')}" fill="none" stroke="#F7C52B" stroke-width="4" stroke-dasharray="14 8" marker-start="url(#sheet-arrow)" marker-end="url(#sheet-arrow)"/>`;
  anchors.insertAdjacentHTML('beforeend', `<svg class="v2-sheet__overlay" viewBox="0 0 ${W} ${H}" style="z-index: 90">
    <defs><marker id="sheet-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#F7C52B"/></marker></defs>
    <rect x="${CAPSULE_VIEW.left}" y="${CAPSULE_VIEW.top}" width="${CAPSULE_VIEW.right - CAPSULE_VIEW.left}" height="${CAPSULE_VIEW.bottom - CAPSULE_VIEW.top}" fill="none" stroke="#F4EBDD" stroke-width="3" stroke-dasharray="6 6"/>
    <rect x="${DOOR.x0}" y="${DOOR.top}" width="${DOOR.x1 - DOOR.x0}" height="${DOOR.sill - DOOR.top}" fill="none" stroke="#9C9CD9" stroke-width="3"/>
    ${CAPSULE_SEATS.map(route).join('')}
    ${[DOORWAY.at, ...PATHS.P1.slice(1), ...PATHS.P2.slice(1)].map(ring).join('')}${cross(CAPSULE_SEATS[0].at)}${cross(CAPSULE_SEATS[1].at)}
    ${label(DOORWAY.at[0], DOOR.top - 10, 'doorway')}
    ${label(CAPSULE_SEATS[0].at[0], 700, 'P1 seat')}${label(CAPSULE_SEATS[1].at[0], 700, 'P2 seat')}
    ${label(CAPSULE_SEATS[0].at[0], 728, 'lower number', 'middle')}
    ${label(CAPSULE_VIEW.left + 8, CAPSULE_VIEW.top + 26, 'the view', 'start')}
  </svg>`);
  sheet.append(anchors, text('p', 'v2-sheet__note', `Dashed yellow: each participant's path (PATHS), from the doorway to its stop beside its chair and out the same way, never across the table. Rings: the doorway (scale ${DOORWAY.scale}), P1's turn, the stops; crosses: the seats (scale ${CAPSULE_SEATS[0].scale}). White: the view a panel is framed on (frameCapsule); a shorter panel keeps the pair's heads and the light and crops the floor. Violet: the door's opening.`, 16, top2 + H * ka + 6, W * ka));

  // Every pose, by public status.
  const gridLeft = 16 + W * ka + 34;
  // Each cell shows the part of the figure frame a figure takes, so that the figures are drawn large.
  const cell = 92;
  const crop = [-28, 30, 190, 210];
  const cellHeight = Math.round((cell * crop[3]) / crop[2]);
  const rowLabel = 150;
  sheet.append(text('h2', 'v2-sheet__title', 'Poses (figures/capsule.mjs), by the public status the board draws', gridLeft, top2 - 24));
  SHEET_COLUMNS.forEach((column, index) => sheet.append(text('p', 'v2-sheet__col', column.label, gridLeft + rowLabel + index * cell, top2, cell)));
  SHEET_ROWS.forEach((row, r) => {
    const top = top2 + 22 + r * (cellHeight + 14);
    sheet.append(text('p', 'v2-sheet__row', `${row.label} (${CREW[row.character].sign})`, gridLeft, top + cellHeight / 2 - 16, rowLabel - 10));
    SHEET_COLUMNS.forEach((column, c) => {
      const box = el('div', { class: 'v2-sheet__cell', style: { left: `${gridLeft + rowLabel + c * cell}px`, top: `${top}px`, width: `${cell}px`, height: `${cellHeight}px` } });
      if (column.chair) box.insertAdjacentHTML('beforeend', `<svg viewBox="${crop.join(' ')}"><rect x="50" y="180" width="50" height="8" rx="3" fill="#5763A9" stroke="#151923" stroke-width="3"/><path d="M88 188V231M72 233h34" stroke="#151923" stroke-width="5" fill="none"/></svg>`);
      box.insertAdjacentHTML('beforeend', dressedFigureSvg(CREW[row.character], column.pose(row.status), { outfit: row.outfit, prefix: `sheet${r}${c}` }).replace(/viewBox="[^"]*"/, `viewBox="${crop.join(' ')}"`));
      sheet.append(box);
    });
  });
  sheet.append(text('p', 'v2-sheet__note', 'Facing left, as the rig draws them; the seat on the right is drawn mirrored. A prisoner\'s hands stay together, so its open hand and hand at the chin are held as sit. Injured: the bandage and a hunch, walking with the approved stagger. Nothing heals, frees or changes clothes. No pose follows a side, a claim, a role, who speaks or any sound.', gridLeft, top2 + 22 + SHEET_ROWS.length * (cellHeight + 14), SHEET_COLUMNS.length * cell + rowLabel));
  app.replaceChildren(sheet);
}

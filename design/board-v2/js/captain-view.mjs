// mothership:dev-only
//
// The Captain's films on the board-v2 review page (storyboards S6 and S7; docs/design/captain-films.md),
// and the Captain's art on one sheet (?sheet=captain, with S8's plates). A picture for review, not a
// client: no command, server, clock or private state exists here, and every input is a synthetic
// fixture (captain-fixtures.mjs). A review page's controller: not to be ported.
//
// The films are public: every phone and the display draw the same. A film plays over the snapshot
// published with its outcome (the released already at their new places, the ejected off the board),
// drawing its subjects where the snapshot before had them until they leave.
//
//   ?film=release|eject     one outcome's film (page.js draws the board, with the capsule where &capsule=1)
//     &outcome=<name>       captain-fixtures.mjs CAPTAIN_OUTCOMES (default: release or eject)
//     &t=<ms>               the moment, from the outcome's presentation start (default 2600; 3700 for eject)
//     &play=1               play it again and again
//   &motion=reduced         the device's reduced-motion setting
//   &ui=choosing&offboard=1 after an EJECT (t past its end): a character choice that offers the characters off
//                           the board; their cards in the sheet over the Hospital and the Jail, opened from the
//                           choosing row's tab (js/turns-view.mjs draws the row; &offered= and &chosen= as there)

import { FRAME } from '../../board-motion/figures/body.mjs';
import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { TIMELINES, blend, sample } from '../../board-motion/figures/motion.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { AIRLOCK, CONSOLE, COVER, EXTERIOR, GLOVE, JAIL_DOOR, PLATE, airlockSvg, conduitAt, conduitPoints, conduitSegment, consoleBox, jailDoorSvg, memorialSvg, offBoardCards, plaqueBox } from '../fx/captain.mjs';
import { BODY_MIDDLE, DOOR_STEP, RELEASE_FILM, captainWords, ejectEnd, ejectFrame, pullToHatch, releaseEnd, releaseFrame, walkToDoor } from '../films/captain.mjs';
import { CAPSULE_FILM } from '../films/capsule.mjs';
import { CAPTAIN_POSES, ejectPose } from '../figures/captain.mjs';
import { walkingPose } from '../figures/capsule.mjs';
import { CAPSULE, FOUR, LOCATION_OF, sceneOf, slotRects, slotsOf, turnsLayout } from './layout.mjs';
import { drawSpinePlaque } from './overflow-view.mjs';
import { captainOutcome } from './captain-fixtures.mjs';
import { turnsOptions } from './turns-view.mjs';

const ART = '../board-v2/assets/captain';
const PUBLIC = '../exports/public-board';
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

export const isCaptainFilm = film => film === 'release' || film === 'eject';
export const captainOutcomeName = params => params.get('outcome') ?? params.get('film');

/** A figure of a character in a skeleton, its feet at `at` (scene units) of a panel framed by { k, tx, ty }, as page.js draws a slot's. */
function figure(character, sk, { at, scale, mirror = false }, { k, tx, ty }, { outfit, prefix, z, seat, layer = 'body' }) {
  const unit = scale * k;
  const style = { left: px(tx + at[0] * k - (AX - BX) * unit), top: px(ty + at[1] * k - (AY - BY) * unit), width: px(BOX * unit), height: px(BOX * unit), '--origin': `${((AX - BX) / BOX) * 100}%`, zIndex: String(z) };
  const node = el('div', { class: 'v2-fig v2-fig--film', 'data-seat': String(seat), 'data-mirror': String(mirror), 'data-outfit': outfit, 'data-film': 'captain', style });
  node.innerHTML = dressedFigureSvg(CREW[character], sk, { outfit, prefix, layer });
  return node;
}

/** Where page.js draws a slot's name tag, whoever holds it: under its press area's foot, 60 px wide (medical-view.mjs nameTagBand()). */
const nameTagBand = (rect, panel) => ({ left: rect.press[0] - 30, top: Math.min(panel.height - 16, rect.top + rect.side - 14), width: 60, height: 17 });

/** The review page's ?film=release|eject, over the board page.js has drawn. */
export function mountCaptain({ app, board, roster, seats, params }) {
  const film = params.get('film');
  const kind = film === 'release' ? 'RELEASE' : 'EJECT';
  const reduced = params.get('motion') === 'reduced';
  const outcome = captainOutcome(captainOutcomeName(params), roster);
  if (outcome.kind !== kind) throw new Error(`${outcome.name} is a ${outcome.kind}, not a ${kind}`);
  document.documentElement.dataset.film = film;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite', 'data-live': 'public' });
  app.append(live);
  app.querySelector('.v2-top__label').replaceWith(el('span', { class: 'v2-top__phase' }, 'Round 3: turns'));
  const surface = app.querySelector('.v2-board');
  const border = board.shell.border;
  const section = room => app.querySelector(`.v2-room[data-room="${room}"]`);
  const frameOf = Object.fromEntries(['command-room', 'room-a', 'room-b', 'jail'].map(room => [room, frameScene(sceneOf(room, roster), board.panels[room])]));
  const toSurface = ([x, y]) => [x - board.boardLeft, y - board.boardTop];
  // A room's scene point in board (viewport) pixels.
  const boardPoint = (room, [x, y]) => {
    const { k, tx, ty } = frameOf[room];
    const box = board.boxes[room];
    return [box.left + border + tx + x * k, box.top + border + ty + y * k];
  };
  const words = captainWords(kind, outcome.seatIds);
  const end = kind === 'RELEASE' ? releaseEnd(reduced) : ejectEnd(reduced);

  // ---------- the Captain at C1 and the console inset ----------
  const commandPanel = board.panels['command-room'];
  const c1Slot = slotsOf('command-room', roster)[0];
  const c1Rect = slotRects('command-room', roster, commandPanel)[0];
  const captainSeat = seats.find(seat => seat.room === 'command-room' && seat.slot === c1Slot.id && seat.captain) ?? null;
  const command = board.boxes['command-room'];
  const bandRight = board.capsule ? board.boxes[CAPSULE.id].left + board.boxes[CAPSULE.id].width - border : command.left + command.width - border;
  const band = { left: command.left + border, top: command.top + border, width: bandRight - command.left - border, height: commandPanel.height };
  const shift = box => ({ ...box, left: box.left + band.left, top: box.top + band.top });
  const tagBand = shift(nameTagBand(c1Rect, commandPanel));
  const consolePlace = consoleBox({ band, cap: commandPanel.cap, captain: shift({ left: c1Rect.left, top: c1Rect.top, width: c1Rect.side, height: c1Rect.side }), tag: tagBand });
  const pressPoint = [band.left + c1Rect.press[0], band.top + c1Rect.press[1]];
  const start = consolePlace ? [consolePlace.left + consolePlace.width / 2, consolePlace.top + consolePlace.height] : pressPoint;
  const conduit = conduitPoints({ boxes: board.boxes, border, jail: frameOf.jail, start }).map(toSurface);
  const commandArt = section('command-room').querySelector('.v2-art');
  const snapshotCaptain = captainSeat ? [...section('command-room').querySelectorAll(`.v2-fig[data-seat="${captainSeat.seat}"]:not([data-film])`)] : [];

  // ---------- the subjects ----------
  const jailSlots = Object.fromEntries(slotsOf('jail', roster).map(slot => [slot.id, slot]));
  const before = new Map(outcome.before.map(seat => [seat.seat, seat]));
  const subjects = outcome.subjects.map(subject => ({ ...subject, seatInfo: before.get(subject.seat), slot: jailSlots[subject.from] }));
  // Released: their new places' figures (the snapshot's) and where those places are.
  const destinations = new Map(subjects.filter(s => s.to).map(s => {
    const slot = slotsOf(s.to.room, roster).find(entry => entry.id === s.to.slot);
    return [s.seat, { slot, room: s.to.room, figures: [...section(s.to.room).querySelectorAll(`.v2-fig[data-seat="${s.seat}"]:not([data-film])`)] }];
  }));
  const jail = section('jail');
  const jailArt = jail.querySelector('.v2-art');
  const jailPanel = board.panels.jail;
  const jailCaption = jail.querySelector('.v2-cap');

  let added = [];
  const add = (parent, node) => { parent.append(node); added.push(node); return node; };
  const sceneBox = (room, [x, y, w, h], node, z) => {
    const { k, tx, ty } = frameOf[room];
    Object.assign(node.style, { left: px(tx + x * k), top: px(ty + y * k), width: px(w * k), height: px(h * k), zIndex: String(z) });
    return node;
  };

  /** The console inset at a frame: the frame, the plate, the cover, the glove, an accent, the word and the stamp. */
  const drawInset = (inset, multiply) => {
    if (!consolePlace || inset.opacity <= 0) return;
    const s = consolePlace.scale;
    const node = el('div', { class: 'v2-cpt v2-cpt__console', 'aria-hidden': 'true', 'data-film': 'captain', 'data-plate': inset.plate, ...(inset.cover ? { 'data-cover': inset.cover } : {}) });
    const [l, t] = toSurface([consolePlace.left, consolePlace.top]);
    Object.assign(node.style, { left: px(l), top: px(t), width: px(consolePlace.width), height: px(consolePlace.height), opacity: String(inset.opacity * multiply), transform: inset.scale === 1 ? '' : `scale(${inset.scale})` });
    const layer = (src, x, y, w, h, extra = {}) => el('img', { src, alt: '', style: { left: px(x * s), top: px(y * s), width: px(w * s), height: px(h * s), ...extra } });
    const [plateX, plateY] = CONSOLE.plate;
    const button = [plateX + PLATE.button[0], plateY + PLATE.button[1]];
    const which = kind === 'RELEASE' ? 'release' : 'eject';
    node.append(layer(`${ART}/console.svg`, 0, 0, CONSOLE.w, CONSOLE.h), layer(`${ART}/plate-${which}-${inset.plate}.svg`, plateX, plateY, PLATE.w, PLATE.h));
    const label = PLATE.label;
    node.append(el('span', { class: `v2-cpt__word v2-cpt__word--${which}`, 'data-lit': String(inset.plate !== 'used'), style: { left: px((plateX + label.x) * s), top: px((plateY + label.y) * s), width: px(label.w * s), height: px(label.h * s), fontSize: px(18 * s), lineHeight: px(label.h * s) } }, kind));
    if (inset.cover) node.append(layer(`${ART}/cover-${inset.cover}.svg`, plateX + COVER.at[0], plateY + COVER.at[1], COVER.w, COVER.h));
    if (inset.ring) node.append(layer(`${ART}/ring.svg`, button[0] - 40, button[1] - 40, 80, 80, { opacity: String(inset.ring.opacity), transform: `scale(${inset.ring.scale})` }));
    if (inset.click) node.append(layer(`${ART}/click.svg`, button[0] - 40, button[1] - 40, 80, 80, { opacity: String(inset.click.opacity), transform: `scale(${inset.click.scale})` }));
    if (inset.glove) {
      // The tip on the button at lift 0; lifted, it comes up from below and right.
      const tip = [button[0] + inset.glove.lift * 14, button[1] + inset.glove.lift * 30];
      node.append(layer(`${ART}/glove.svg`, tip[0] - GLOVE.tip[0], tip[1] - GLOVE.tip[1], GLOVE.w, GLOVE.h, { opacity: String(inset.glove.opacity) }));
    }
    if (inset.stamp > 0) node.append(el('span', { class: 'v2-cpt__stamp', style: { left: px((plateX + PLATE.w / 2) * s), top: px((plateY + PLATE.h / 2) * s), fontSize: px(22 * s), opacity: String(inset.stamp) } }, 'Used'));
    add(surface, node);
  };

  /** C1 in its film pose (the snapshot's figure hidden meanwhile), body and front layers as page.js draws them. */
  const drawCaptain = (pose, live) => {
    for (const node of snapshotCaptain) node.style.visibility = live ? 'hidden' : '';
    if (!live || !captainSeat) return;
    const sk = blend(CAPTAIN_POSES[pose.from], CAPTAIN_POSES[pose.to], pose.v);
    const common = { outfit: outfitFor('Command Room'), seat: captainSeat.seat };
    add(commandArt, figure(captainSeat.character, sk, c1Slot, frameOf['command-room'], { ...common, prefix: 'cptC1b', z: Math.round(c1Slot.depth) * 2 }));
    if ((sk.front ?? []).length) add(commandArt, figure(captainSeat.character, sk, c1Slot, frameOf['command-room'], { ...common, prefix: 'cptC1f', z: 1500 + Math.round(c1Slot.depth), layer: 'front' }));
  };

  /** The command pulse: its dotted tail and its glowing head, along the gutters. */
  const drawPulse = pulse => {
    if (!pulse || pulse.opacity <= 0) return;
    const color = kind === 'RELEASE' ? '#A6F0C2' : '#FF5A3C';
    const tail = conduitSegment(conduit, Math.max(0, pulse.v - pulse.tail), pulse.v);
    const points = tail.map(p => p.join(',')).join(' ');
    const svg = el('div', { class: 'v2-cpt v2-cpt__conduit', 'aria-hidden': 'true', 'data-film': 'captain', style: { left: '0', top: '0', width: px(board.boardWidth), height: px(board.boardHeight), opacity: String(pulse.opacity) } });
    svg.innerHTML = `<svg viewBox="0 0 ${board.boardWidth} ${board.boardHeight}" width="${board.boardWidth}" height="${board.boardHeight}"><polyline points="${points}" fill="none" stroke="#151923" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 6"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 6"/></svg>`;
    add(surface, svg);
    const [hx, hy] = conduitAt(conduit, pulse.v).head;
    add(surface, el('img', { class: 'v2-cpt v2-cpt__head', alt: '', 'data-film': 'captain', src: `${ART}/pulse-head-${kind === 'RELEASE' ? 'release' : 'eject'}.svg`, style: { left: px(hx - 12), top: px(hy - 12), opacity: String(pulse.opacity) } }));
  };

  /** The Jail's door, lamp and keypad over its art (z 1: over the room, under everyone in it). */
  const drawDoor = (door, opacity) => {
    const node = sceneBox('jail', JAIL_DOOR.box, el('div', { class: 'v2-cpt v2-cpt__door', 'aria-hidden': 'true', 'data-film': 'captain', 'data-open': String(door.open), 'data-wheel': String(door.wheel), 'data-lamp': door.lamp, 'data-keypad': door.keypad }), 1);
    node.innerHTML = jailDoorSvg({ ...door, prefix: 'cpt-door' });
    node.style.opacity = String(opacity);
    add(jailArt, node);
  };

  /** A subject at its Jail slot in a skeleton (its place's gesture, or a moment of the film's). */
  const atSlot = (subject, sk, extra = {}) => figure(subject.seatInfo.character, sk, { at: extra.at ?? subject.slot.at, scale: extra.scale ?? subject.slot.scale, mirror: extra.mirror ?? subject.slot.mirror }, frameOf.jail, { outfit: 'prison', prefix: `cpt${subject.seat}${extra.tag ?? 'j'}`, z: extra.z ?? Math.round(subject.slot.depth) * 2, seat: subject.seat });
  const placeSk = subject => skeletonOf(subject.body ? subject.slot.down : subject.slot.gesture);

  // ---------- RELEASE ----------
  const drawReleased = (subject, person, fade) => {
    const destination = destinations.get(subject.seat);
    // The new place: the away marker until the prisoner lands, hidden while it settles, then the snapshot's own figure.
    for (const node of destination?.figures ?? []) {
      const away = person.state !== 'land' && person.state !== 'settled';
      node.classList.toggle('v2-fig--away', away);
      node.style.opacity = away ? String(CAPSULE_FILM.away.opacity) : '';
      node.style.visibility = person.state === 'land' ? 'hidden' : '';
    }
    if (!subject.slot) return;
    const jailed = { jailed: true };
    if (person.state === 'jail') {
      const node = add(jailArt, atSlot(subject, placeSk(subject)));
      node.style.opacity = String(fade);
    } else if (person.state === 'up') {
      add(jailArt, atSlot(subject, blend(placeSk(subject), walkingPose(0, jailed), person.v), { mirror: walkToDoor(subject.slot, 0.01).mirror }));
    } else if (person.state === 'door') {
      const step = walkToDoor(subject.slot, person.v);
      add(jailArt, atSlot(subject, walkingPose(person.v * 2, jailed), { ...step, z: Math.round(step.at[1]) * 2 }));
    } else if (person.state === 'through') {
      // Through the doorway: a few steps on, smaller, fading into the corridor.
      const at = [DOOR_STEP.at[0], DOOR_STEP.at[1] + (DOOR_STEP.through[1] - DOOR_STEP.at[1]) * person.v];
      const node = add(jailArt, atSlot(subject, walkingPose(2 + person.v, jailed), { at, scale: DOOR_STEP.scale * (1 - 0.08 * person.v), mirror: false, z: 2 }));
      node.style.opacity = String(Number((1 - person.v).toFixed(2)));
    } else if (person.state === 'across' && destination) {
      // The reviewed public move: a flyer over the board, from the doorway to the new place, in the prison suit.
      const fromPoint = toSurface(boardPoint('jail', DOOR_STEP.through));
      const toPoint = toSurface(boardPoint(destination.room, destination.slot.at));
      const u = person.v < 0.5 ? 2 * person.v * person.v : 1 - ((-2 * person.v + 2) ** 2) / 2;
      const distance = Math.hypot(toPoint[0] - fromPoint[0], toPoint[1] - fromPoint[1]);
      const at = [fromPoint[0] + (toPoint[0] - fromPoint[0]) * u, fromPoint[1] + (toPoint[1] - fromPoint[1]) * u - Math.sin(Math.PI * u) * 0.06 * distance];
      const unit = DOOR_STEP.scale * frameOf.jail.k + (destination.slot.scale * frameOf[destination.room].k - DOOR_STEP.scale * frameOf.jail.k) * u;
      const node = add(surface, figure(subject.seatInfo.character, walkingPose(person.v * 1.5, jailed), { at, scale: unit, mirror: toPoint[0] > fromPoint[0] }, { k: 1, tx: 0, ty: 0 }, { outfit: 'prison', prefix: `cpt${subject.seat}x`, z: 3700, seat: subject.seat }));
      node.classList.add('v2-cpt__flyer');
      const trailOpacity = person.v < 0.15 ? person.v / 0.15 * 0.85 : person.v < 0.7 ? 0.85 - (person.v - 0.15) / 0.55 * 0.25 : 0.6 * (1 - (person.v - 0.7) / 0.3);
      add(surface, el('img', { class: 'v2-cpt v2-cpt__trail', alt: '', 'data-film': 'captain', src: `${PUBLIC}/fx-ink-trail.paper.fdbb7f4fce.svg`, style: { left: px(fromPoint[0]), top: px(fromPoint[1] - 7), width: px(distance), height: '14px', transform: `rotate(${Math.atan2(toPoint[1] - fromPoint[1], toPoint[0] - fromPoint[0])}rad)`, opacity: String(Number(trailOpacity.toFixed(2))) } }));
    } else if (person.state === 'land' && destination) {
      // Settling at the new place in the room's clothes; the puff hides the change.
      const ms = RELEASE_FILM.walk.land;
      const slotSk = skeletonOf(destination.slot.gesture);
      const sk = sample(TIMELINES.arrive(slotSk, ms, walkingPose(1.5, {})), person.v * ms);
      const art = section(destination.room).querySelector('.v2-art');
      add(art, figure(subject.seatInfo.character, sk, destination.slot, frameOf[destination.room], { outfit: outfitFor(LOCATION_OF[destination.room]), prefix: `cpt${subject.seat}l`, z: Math.round(destination.slot.depth) * 2, seat: subject.seat }));
      const [fx, fy] = toSurface(boardPoint(destination.room, destination.slot.at));
      const puff = Math.min(1, person.v / 0.6);
      add(surface, el('img', { class: 'v2-cpt v2-cpt__puff', alt: '', 'data-film': 'captain', src: `${PUBLIC}/fx-landing-puff.paper.8d5f3998bd.svg`, style: { left: px(fx - 23), top: px(fy - 14), opacity: String(Number((0.9 * (1 - puff)).toFixed(2))), transform: `scale(${Number((0.5 + 0.8 * puff).toFixed(2))})` } }));
    }
  };

  // ---------- EJECT ----------
  const emergency = () => el('img', { class: 'v2-cpt v2-cpt__emergency', alt: '', 'data-film': 'captain', src: `${ART}/emergency.svg` });
  const drawEjected = (subject, person, index, fade) => {
    if (!subject.slot || person.state === 'gone') return;
    if (subject.body) {
      const node = add(jailArt, atSlot(subject, placeSk(subject)));
      if (person.state === 'dissolve') {
        // A grey paper cut-out, rising and fading: nothing graphic, nothing of a side.
        node.classList.add('v2-fig--memorial');
        node.style.translate = `0 ${px(-person.v * 40 * frameOf.jail.k)}`;
        node.style.opacity = String(Number((1 - person.v).toFixed(2)));
      } else node.style.opacity = String(fade);
      return;
    }
    const sk = placeSk(subject);
    if (person.state === 'jail') { add(jailArt, atSlot(subject, sk)).style.opacity = String(fade); return; }
    if (person.state === 'startle') { add(jailArt, atSlot(subject, ejectPose(sk, { startled: person.v }))); return; }
    if (person.state === 'brace') {
      const node = add(jailArt, atSlot(subject, ejectPose(sk, { braced: person.v }), { mirror: AIRLOCK.c[0] > subject.slot.at[0] }));
      // Leaning toward the hatch on its feet, just before the air takes it.
      if (person.lean) {
        node.style.transformOrigin = `${((AX - BX) / BOX) * 100}% ${((AY - BY) / BOX) * 100}%`;
        node.style.rotate = `${(AIRLOCK.c[0] < subject.slot.at[0] ? -1 : 1) * person.lean * 10}deg`;
      }
      return;
    }
    // Pulled: a tumbling silhouette with a paper rim, shrinking into the hatch.
    const pull = pullToHatch(subject.slot, person.v, index);
    const node = add(jailArt, atSlot(subject, ejectPose(sk, { tumbling: Math.min(1, person.v * 3) }), { at: pull.at, scale: pull.scale, mirror: false, z: 1400 }));
    node.classList.add('v2-fig--silhouette');
    node.style.transformOrigin = `${((AX - BX) / BOX) * 100}% ${((AY - BODY_MIDDLE - BY) / BOX) * 100}%`;
    node.style.rotate = `${pull.turn}deg`;
    node.style.opacity = String(pull.opacity);
  };
  const debrisPaths = [{ kind: 'paper', from: [700, 600], spin: 540, delay: 0 }, { kind: 'cup', from: [600, 660], spin: -420, delay: 0.15 }, { kind: 'paper', from: [430, 560], spin: 720, delay: 0.3 }];
  const drawDebris = debris => {
    if (debris.opacity <= 0) return;
    for (const item of debrisPaths) {
      const v = Math.max(0, Math.min(1, (debris.v - item.delay) / (1 - item.delay)));
      if (v <= 0 || v >= 1) continue;
      const u = v * v;
      const [x, y] = [item.from[0] + (AIRLOCK.c[0] - item.from[0]) * u, item.from[1] + (AIRLOCK.c[1] - item.from[1]) * u - Math.sin(Math.PI * u) * 60];
      const side = 34 * (1 - 0.6 * u);
      const node = sceneBox('jail', [x - side / 2, y - side / 2, side, side], el('img', { class: 'v2-cpt v2-cpt__debris', alt: '', 'data-film': 'captain', src: `${ART}/debris-${item.kind}.svg` }), 1495);
      node.style.rotate = `${Math.round(item.spin * u)}deg`;
      node.style.opacity = String(debris.opacity);
      add(jailArt, node);
    }
  };
  const drawExterior = exterior => {
    if (exterior.opacity <= 0) return;
    const node = el('div', { class: 'v2-cpt v2-cpt__exterior', 'aria-hidden': 'true', 'data-film': 'captain', style: { opacity: String(exterior.opacity) } });
    node.append(el('img', { src: `${ART}/exterior.svg`, alt: '' }));
    // The exterior covers the panel (sliced): the hatch's place in panel pixels.
    const cover = Math.max(jailPanel.width / EXTERIOR.w, jailPanel.height / EXTERIOR.h);
    const ox = (jailPanel.width - EXTERIOR.w * cover) / 2, oy = (jailPanel.height - EXTERIOR.h * cover) / 2;
    const [hx, hy] = [ox + EXTERIOR.hatch[0] * cover, oy + EXTERIOR.hatch[1] * cover];
    const drifting = subjects.filter(s => !s.body);
    drifting.forEach((subject, i) => {
      const v = Math.max(0, Math.min(1, exterior.drift * 1.15 - i * 0.08));
      // Fanned out over open space, up and to the right of the hatch, away from the hull.
      const angle = -1.45 + (drifting.length > 1 ? (i * 1.3) / (drifting.length - 1) : 0.65);
      const reach = (24 + (110 + 18 * (i % 2)) * v) * cover;
      const unit = 0.075 * cover * 3.2 * (1 - 0.4 * v);
      const at = [hx + Math.cos(angle) * reach, hy + Math.sin(angle) * reach + BODY_MIDDLE * unit];
      const drifter = figure(subject.seatInfo.character, ejectPose(skeletonOf('stand'), { tumbling: 1 }), { at, scale: unit, mirror: i % 2 === 1 }, { k: 1, tx: 0, ty: 0 }, { outfit: 'prison', prefix: `cpt${subject.seat}e`, z: 2, seat: subject.seat });
      drifter.classList.add('v2-fig--silhouette');
      drifter.style.transformOrigin = `${((AX - BX) / BOX) * 100}% ${((AY - BODY_MIDDLE - BY) / BOX) * 100}%`;
      drifter.style.rotate = `${Math.round((i % 2 ? -1 : 1) * (40 + 160 * v))}deg`;
      node.append(drifter);
    });
    add(jail, node);
  };

  const apply = t => {
    for (const node of added) node.remove();
    added = [];
    const isLive = t >= 0 && t < end;
    let frame;
    if (!isLive) {
      // Outside the film: the snapshot alone, as the board draws it; nothing of the film left.
      frame = kind === 'RELEASE' ? releaseFrame(t, { reduced, count: subjects.length }) : ejectFrame(t, { reduced, subjects });
      drawCaptain(frame.captain, false);
      commandArt.style.transform = '';
      for (const d of destinations.values()) for (const node of d.figures) { node.classList.remove('v2-fig--away'); node.style.opacity = ''; node.style.visibility = ''; }
    } else if (kind === 'RELEASE') {
      frame = releaseFrame(t, { reduced, count: subjects.length });
      const fade = reduced ? frame.opacity : 1;
      const doorFade = reduced && frame.stage !== 'console' ? frame.fade : 1;
      drawInset(frame.inset, 1);
      drawCaptain(frame.captain, true);
      drawPulse(frame.pulse);
      drawDoor(frame.door, Math.min(fade, doorFade));
      subjects.forEach((subject, i) => drawReleased(subject, frame.people[i], fade));
    } else {
      frame = ejectFrame(t, { reduced, subjects });
      const fade = reduced ? frame.opacity : 1;
      const stageFade = reduced && frame.stage !== 'console' ? frame.fade : 1;
      drawInset(frame.inset, 1);
      drawCaptain(frame.captain, true);
      commandArt.style.transformOrigin = frame.push !== 1 ? `${px(c1Rect.press[0])} ${px(c1Rect.press[1])}` : '';
      commandArt.style.transform = frame.push !== 1 ? `scale(${frame.push})` : '';
      for (const room of ['command-room', 'jail']) {
        if (frame.emergency > 0) {
          const node = add(section(room), emergency());
          node.style.opacity = String(Number((frame.emergency * (reduced ? fade : 1)).toFixed(3)));
        }
      }
      drawPulse(frame.pulse);
      drawDoor(frame.door, Math.min(fade, stageFade));
      if (frame.airlock.reveal > 0) {
        const node = sceneBox('jail', AIRLOCK.box, el('div', { class: 'v2-cpt v2-cpt__airlock', 'aria-hidden': 'true', 'data-film': 'captain', 'data-open': String(frame.airlock.open), 'data-clamps': String(frame.airlock.clamps), 'data-glow': String(frame.airlock.glow) }), 1);
        node.innerHTML = airlockSvg({ ...frame.airlock, prefix: 'cpt-air' });
        node.style.opacity = String(Number((frame.airlock.reveal * (reduced ? Math.min(fade, stageFade) : 1)).toFixed(2)));
        add(jailArt, node);
      }
      if (frame.suction.opacity > 0) add(jailArt, sceneBox('jail', [0, 0, 1024, 768], el('img', { class: 'v2-cpt v2-cpt__suction', alt: '', 'data-film': 'captain', src: `${ART}/suction-${frame.suction.frame}.svg`, style: { opacity: String(frame.suction.opacity) } }), 1490));
      drawDebris(frame.debris);
      let living = 0;
      subjects.forEach((subject, i) => { drawEjected(subject, frame.people[i], subject.body ? 0 : living, fade); if (!subject.body) living += 1; });
      if (frame.label.opacity > 0) {
        const label = add(jail, el('span', { class: 'v2-cpt__label', 'aria-hidden': 'true', 'data-film': 'captain' }, 'Ejected'));
        label.style.opacity = String(Number((frame.label.opacity * (reduced ? Math.min(fade, stageFade) : 1)).toFixed(2)));
        label.style.left = px(Math.max(4, (jailPanel.width - label.offsetWidth) / 2));
        label.style.top = px(Math.round(jailPanel.height * 0.62));
        if (frame.label.scale !== 1) label.style.transform = `scale(${frame.label.scale})`;
      }
      drawExterior(frame.exterior);
    }
    // The memorial plaque: the seats off the board, counted (the page's text), beside the Jail's caption.
    const off = seats.filter(seat => seat.room === null).length;
    // Outside the film (before it starts or after it ends) the plaque is the board's state, from the snapshot alone.
    const plaqueOpacity = !isLive ? 1 : (frame.plaque ?? 0) * (reduced && frame.stage === 'memorial' ? frame.fade : 1);
    if (off > 0 && plaqueOpacity > 0 && FOUR) {
      // On the successor board (&beds=4) the plaque is in the spine between the Hospital and the Jail (fx/overflow.mjs).
      const plaque = drawSpinePlaque(app, board, off, isLive ? { 'data-film': 'captain' } : { 'data-state': 'plaque' });
      if (plaque) { added.push(plaque); plaque.style.opacity = String(plaqueOpacity); }
    } else if (off > 0 && plaqueOpacity > 0) {
      // While the film plays it is the film's; after it, the board's state (drawn from the snapshot alone).
      const plaque = add(jail, el('span', { class: 'v2-plaque', role: 'img', 'aria-label': `${off} off the board`, ...(isLive ? { 'data-film': 'captain' } : { 'data-state': 'plaque' }) }, el('img', { src: `${ART}/plaque.svg`, alt: '' }), el('b', { 'aria-hidden': 'true' }, String(off))));
      const at = plaqueBox({ caption: { left: jailCaption.offsetLeft, top: jailCaption.offsetTop, width: jailCaption.offsetWidth, height: jailCaption.offsetHeight }, size: [plaque.offsetWidth, plaque.offsetHeight], panel: jailPanel });
      Object.assign(plaque.style, { left: px(at.left), top: px(at.top), opacity: String(plaqueOpacity) });
    }
    const sentence = isLive && frame.announce ? words : '';
    if (live.textContent !== sentence) live.textContent = sentence;
    document.documentElement.dataset.stage = frame.stage;
    return { ...frame, console: consolePlace, conduit, sentence };
  };
  if (params.get('play') === '1') {
    const startAt = performance.now();
    const length = end + 900;
    const tick = now => { apply((now - startAt) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__captainFrame = apply(Number(params.get('t') ?? (kind === 'RELEASE' ? 2600 : 3700)));
  }
}

// ---------- the characters off the board, as targets ----------

/**
 * The review page's &ui=choosing&offboard=1, after page.js has mounted the choosing row: the tab at
 * the row's start (the plaque's mark and the count; shown pressed), and the sheet over the Hospital
 * and the Jail holding a card for every character off the board, each a target, ringed when the
 * server offers it and marked when chosen, as the board's rings are. While the sheet shows, the
 * Hospital's and the Jail's characters cannot be chosen; the tab closes it. Synthetic, like every
 * offer on this page: production offers exactly what Backend sends.
 */
export function mountOffBoard({ app, board, roster, seats, params }) {
  if (params.get('offboard') !== '1' || params.get('ui') !== 'choosing') return;
  const off = seats.filter(seat => seat.room === null).sort((a, b) => a.seat - b.seat);
  if (!off.length) throw new Error('offboard=1: nobody is off the board');
  const options = turnsOptions(params);
  const { sheet } = turnsLayout({ width: innerWidth, height: innerHeight }, roster, { insets: board.insets, bars: options.bars, actions: options.actions });
  const list = name => (params.get(name) ? params.get(name).split(',').filter(Boolean).map(Number) : []);
  const offered = list('offered');
  const chosen = list('chosen');
  const cards = offBoardCards({ left: sheet.body.left - sheet.left, top: sheet.body.top - sheet.top, width: sheet.body.width, height: sheet.body.height }, off.length);
  if (!cards) throw new Error(`${off.length} cards do not fit the sheet`);
  const row = app.querySelector('.v2-choosing');
  row.prepend(el('button', { class: 'v2-ui-button v2-ui-button--tab v2-offboard__tab', type: 'button', 'aria-expanded': 'true', 'aria-label': `Off the board: ${off.length}` }, el('img', { src: `${ART}/plaque.svg`, alt: '' }), el('b', { 'aria-hidden': 'true' }, String(off.length))));
  const node = el('section', { class: 'v2-sheet-ui v2-offboard', 'aria-label': 'Off the board', 'data-ui': 'offboard', style: { left: px(sheet.left), top: px(sheet.top), width: px(sheet.width), height: px(sheet.height) } });
  off.forEach((seat, i) => {
    const card = cards[i];
    const isOffered = offered.includes(seat.seat);
    const isChosen = chosen.includes(seat.seat);
    const art = el('span', { class: 'v2-offboard__art', 'aria-hidden': 'true' });
    art.innerHTML = memorialSvg(dressedFigureSvg(CREW[seat.character], skeletonOf('stand'), { outfit: 'crew', prefix: `off${seat.seat}` })).replace(/viewBox="[^"]*"/, 'viewBox="-8 -4 140 140"');
    const button = el('button', { class: 'v2-offboard__card', type: 'button', 'data-seat': String(seat.seat), 'data-offered': String(isOffered), 'aria-label': `${CREW[seat.character].sign}, seat ${seat.seat}, off the board`, ...(isOffered ? {} : { disabled: '' }), style: { left: px(card.left - 2), top: px(card.top - 2), width: px(card.width), height: px(card.height) } },
      art, el('span', { class: 'v2-offboard__name' }, el('b', {}, String(seat.seat)), CREW[seat.character].sign));
    if (isOffered) button.append(el('span', { class: `v2-ring${isChosen ? ' v2-ring--chosen' : ''}`, 'data-seat': String(seat.seat), 'data-target': `offboard:${seat.seat}` }, isChosen ? el('span', { class: 'v2-ring__check', 'aria-hidden': 'true' }, '✓') : null));
    node.append(button);
  });
  app.querySelector('.v2-turns').append(node);
}

// ---------- the art review's sheet ----------

/**
 * The Captain's art on one sheet (index.html?sheet=captain), for the art review only, never a
 * screen's: S8's plates in every state at a phone's size and the cover's frames; the console inset
 * at each of its moments; the Jail's door, lamp and keypad, the airlock, the suction and the
 * debris over the Jail; the exterior; the memorial plaque and the history's grey cut-outs; and the
 * poses (the Captain at the console, a prisoner's start, brace and tumble, as a silhouette).
 */
export function drawCaptainSheet(app) {
  const sheet = el('div', { class: 'v2-sheet v2-sheet--captain' });
  const text = (tag, className, content, left, top, width) => el(tag, { class: className, style: { left: `${left}px`, top: `${top}px`, ...(width ? { width: `${width}px` } : {}) } }, content);
  const img = (src, left, top, width, height, extra = {}) => el('img', { src, alt: '', class: 'v2-sheet__art', style: { left: px(left), top: px(top), width: px(width), height: px(height), ...extra } });
  sheet.append(text('h1', 'v2-sheet__head', 'The Captain\'s films: art review sheet (synthetic, review only; never a screen\'s)', 16, 10));

  // S8: the plates at a phone's size (44 px tall), the page's word on each; sending is drawn pressed.
  sheet.append(text('h2', 'v2-sheet__title', 'S8: the Captain\'s plates (44 px tall, as on a phone), the cover\'s frames', 16, 40));
  const s8 = 44 / PLATE.h;
  const states = [['available', 'Available'], ['unavailable', 'Unavailable: no reason in 1.8'], ['pressed', 'Sending (Activated)'], ['used', 'Used']];
  ['release', 'eject'].forEach((which, row) => {
    states.forEach(([state, label], col) => {
      const left = 16 + col * 160, top = 64 + row * 74;
      sheet.append(img(`${ART}/plate-${which}-${state}.svg`, left, top, PLATE.w * s8, PLATE.h * s8));
      sheet.append(el('span', { class: `v2-cpt__word v2-cpt__word--${which}`, 'data-lit': String(state === 'available' || state === 'pressed'), style: { left: px(left + PLATE.label.x * s8), top: px(top + PLATE.label.y * s8), width: px(PLATE.label.w * s8), height: px(PLATE.label.h * s8), fontSize: '12px', lineHeight: px(PLATE.label.h * s8) } }, which === 'release' ? 'Release' : 'Eject'));
      if (state === 'used') sheet.append(el('span', { class: 'v2-cpt__stamp', style: { left: px(left + (PLATE.w * s8) / 2), top: px(top + 22), fontSize: '15px' } }, 'Used'));
      if (which === 'eject' && state !== 'used') sheet.append(img(`${ART}/cover-${state === 'pressed' ? 'open' : 'closed'}.svg`, left + COVER.at[0] * s8, top + COVER.at[1] * s8, COVER.w * s8, COVER.h * s8));
      sheet.append(text('p', 'v2-sheet__note', label, left, top + 47, 150));
    });
  });
  COVER.frames.forEach((frameName, i) => {
    const left = 680 + i * 120, top = 64;
    sheet.append(img(`${ART}/plate-eject-available.svg`, left, top + 34, PLATE.w * 0.5, PLATE.h * 0.5));
    sheet.append(img(`${ART}/cover-${frameName}.svg`, left + COVER.at[0] * 0.5, top + 34 + COVER.at[1] * 0.5, COVER.w * 0.5, COVER.h * 0.5));
    sheet.append(text('p', 'v2-sheet__note', `cover ${frameName}`, left, top + 72, 110));
  });
  sheet.append(img(`${ART}/glove.svg`, 1050, 52, GLOVE.w, GLOVE.h), img(`${ART}/click.svg`, 1112, 48, 56, 56), img(`${ART}/ring.svg`, 1170, 48, 56, 56),
    text('p', 'v2-sheet__note', 'glove · click (EJECT) · ring (RELEASE)', 1050, 128, 180));

  // The console inset at its moments, at its full size.
  sheet.append(text('h2', 'v2-sheet__title', 'The console inset (224 x 96 at most; consoleBox() places it)', 16, 230));
  const insets = [
    ['release', 'available', null, null, 'RELEASE: the console'], ['release', 'pressed', null, 'ring', 'RELEASE: the press'], ['release', 'used', null, null, 'RELEASE: used'],
    ['eject', 'available', 'closed', null, 'EJECT: under its cover'], ['eject', 'pressed', 'open', 'click', 'EJECT: the press'], ['eject', 'used', 'closed', null, 'EJECT: used, the final panel'],
  ];
  insets.forEach(([which, plate, cover, accent, label], i) => {
    const left = 16 + (i % 3) * 250, top = 256 + Math.floor(i / 3) * 130;
    const box = el('div', { class: 'v2-sheet__inset', style: { left: px(left), top: px(top), width: px(CONSOLE.w), height: px(CONSOLE.h) } });
    const [x, y] = CONSOLE.plate;
    box.append(img(`${ART}/console.svg`, 0, 0, CONSOLE.w, CONSOLE.h), img(`${ART}/plate-${which}-${plate}.svg`, x, y, PLATE.w, PLATE.h));
    box.append(el('span', { class: `v2-cpt__word v2-cpt__word--${which}`, 'data-lit': String(plate !== 'used'), style: { left: px(x + PLATE.label.x), top: px(y + PLATE.label.y), width: px(PLATE.label.w), height: px(PLATE.label.h), fontSize: '18px', lineHeight: px(PLATE.label.h) } }, which));
    if (cover) box.append(img(`${ART}/cover-${cover}.svg`, x + COVER.at[0], y + COVER.at[1], COVER.w, COVER.h));
    const button = [x + PLATE.button[0], y + PLATE.button[1]];
    if (accent) box.append(img(`${ART}/${accent}.svg`, button[0] - 40, button[1] - 40, 80, 80, { opacity: '0.85' }));
    if (plate === 'pressed') box.append(img(`${ART}/glove.svg`, button[0] - GLOVE.tip[0], button[1] - GLOVE.tip[1], GLOVE.w, GLOVE.h));
    if (plate === 'used') box.append(el('span', { class: 'v2-cpt__stamp', style: { left: px(x + PLATE.w / 2), top: px(y + PLATE.h / 2), fontSize: '22px' } }, 'Used'));
    sheet.append(box, text('p', 'v2-sheet__note', label, left, top + CONSOLE.h + 4, CONSOLE.w));
  });
  sheet.append(img(`${ART}/pulse-head-release.svg`, 790, 262, 24, 24), img(`${ART}/pulse-head-eject.svg`, 820, 262, 24, 24), text('p', 'v2-sheet__note', 'the pulse\'s heads', 852, 266, 120));

  // The Jail: the door's moments, the airlock's, the suction, the debris, over the room's own art.
  sheet.append(text('h2', 'v2-sheet__title', 'Over the Jail (its own scene, cropped): the door, lamp and keypad; the airlock; the suction and debris', 16, 530));
  const crop = (left, top, [cx, cy, cw, ch], k, layers, label) => {
    const tile = el('div', { class: 'v2-sheet__cabin', style: { left: px(left), top: px(top), width: px(cw * k), height: px(ch * k) } });
    tile.append(img('../board-motion/assets/scenes/jail.back.svg', -cx * k, -cy * k, 1024 * k, 768 * k));
    for (const [box, html, z = 1] of layers) {
      const node = el('div', { class: 'v2-sheet__layer', style: { left: px((box[0] - cx) * k), top: px((box[1] - cy) * k), width: px(box[2] * k), height: px(box[3] * k), zIndex: String(z) } });
      node.innerHTML = html;
      tile.append(node);
    }
    sheet.append(tile, text('p', 'v2-sheet__note', label, left, top + ch * k + 4, cw * k));
  };
  const doorCrop = [350, 64, 470, 320];
  [[{}, 'door at rest: the room itself'], [{ wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: unlocked, green'], [{ open: 0.5, wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: opening'],
    [{ open: 1, wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: open'], [{ wheel: -90, lamp: 'red', keypad: 'amber' }, 'EJECT: locked down']]
    .forEach(([door, label], i) => crop(16 + i * 244, 556, doorCrop, 0.5, [[JAIL_DOOR.box, jailDoorSvg({ ...door, prefix: `sheet-door-${i}` })]], label));
  const hatchCrop = [190, 140, 170, 170];
  [[{ glow: 1 }, 'airlock: revealed'], [{ clamps: 1, glow: 1 }, 'clamps released'], [{ clamps: 1, open: 0.5, glow: 1 }, 'iris opening'], [{ clamps: 1, open: 1, glow: 1 }, 'open onto space']]
    .forEach(([hatch, label], i) => crop(16 + i * 150, 750, hatchCrop, 0.8, [[AIRLOCK.box, airlockSvg({ ...hatch, prefix: `sheet-air-${i}` })]], label));
  [1, 2, 3].forEach(frameName => crop(632 + (frameName - 1) * 196, 750, [120, 60, 800, 700], 0.23,
    [[AIRLOCK.box, airlockSvg({ clamps: 1, open: 1, glow: 1, prefix: `sheet-suck-${frameName}` })], [[0, 0, 1024, 768], `<img src="${ART}/suction-${frameName}.svg" alt="" style="width:100%;height:100%">`, 2]], `suction ${frameName}`));
  sheet.append(img(`${ART}/debris-paper.svg`, 820, 962, 28, 28), img(`${ART}/debris-cup.svg`, 852, 962, 28, 28), text('p', 'v2-sheet__note', 'debris: a sheet of paper, a cup', 886, 968, 200));

  // The exterior, the memorial, the poses.
  sheet.append(text('h2', 'v2-sheet__title', 'The exterior; the memorial plaque and the history\'s cut-outs; the poses', 16, 934));
  sheet.append(img(`${ART}/exterior.svg`, 16, 958, 200, 200));
  const plaque = el('span', { class: 'v2-plaque', role: 'img', 'aria-label': '3 off the board', style: { left: '236px', top: '962px', position: 'absolute' } }, el('img', { src: `${ART}/plaque.svg`, alt: '' }), el('b', { 'aria-hidden': 'true' }, '3'));
  sheet.append(plaque, text('p', 'v2-sheet__note', 'plaque: the count of seats off the board, beside the Jail\'s caption', 270, 962, 200));
  Object.keys(CREW).forEach((id, i) => {
    const left = 236 + i * 64, top = 1000;
    const cell = el('div', { class: 'v2-sheet__cell', style: { left: px(left), top: px(top), width: '60px', height: '86px' } });
    cell.innerHTML = memorialSvg(dressedFigureSvg(CREW[id], skeletonOf('stand'), { outfit: 'crew', prefix: `sheetMem${i}` })).replace(/viewBox="[^"]*"/, 'viewBox="-20 20 170 220"');
    sheet.append(cell, text('p', 'v2-sheet__note', `${i + 1} ${CREW[id].sign}`, left, top + 88, 60));
  });
  const poses = [
    ['C1: at the table', CAPTAIN_POSES.table, 'c7', 'crew', ''], ['C1: reach', CAPTAIN_POSES.reach, 'c7', 'crew', ''], ['C1: press', CAPTAIN_POSES.press, 'c7', 'crew', ''],
    ['startle', ejectPose(skeletonOf('wallLean'), { startled: 1 }), 'c4', 'prison', ''], ['brace', ejectPose(skeletonOf('wallLean'), { braced: 1 }), 'c4', 'prison', ''],
    ['tumble, as drawn', ejectPose(skeletonOf('wallLean'), { tumbling: 1 }), 'c4', 'prison', 'silhouette'], ['body leaving', skeletonOf('down'), 'c9', 'prison', 'memorial'],
  ];
  poses.forEach(([label, sk, character, outfit, treatment], i) => {
    const left = 236 + i * 92, top = 1118;
    const cell = el('div', { class: 'v2-sheet__cell', ...(treatment ? { 'data-treatment': treatment } : {}), style: { left: px(left), top: px(top), width: '88px', height: '100px' } });
    // The body and, where the pose has them (the Captain's arms over the table), its front parts.
    cell.innerHTML = [dressedFigureSvg(CREW[character], sk, { outfit, prefix: `sheetPose${i}` }), ...((sk.front ?? []).length ? [dressedFigureSvg(CREW[character], sk, { outfit, prefix: `sheetPose${i}f`, layer: 'front' })] : [])]
      .map(art => art.replace(/viewBox="[^"]*"/, 'viewBox="-40 10 210 240"')).join('');
    sheet.append(cell, text('p', 'v2-sheet__note', label, left, top + 102, 88));
  });
  sheet.append(text('p', 'v2-sheet__note', 'The words on the plates, RELEASE, EJECT, USED, EJECTED and the count are the page\'s text, never the art\'s. The Captain\'s and a prisoner\'s poses face left, as the rig draws them. Nobody is hurt: a character taken by the air is a silhouette with a paper rim, a body a grey cut-out; nothing says a side.', 900, 1118, 320));
  app.replaceChildren(sheet);
}

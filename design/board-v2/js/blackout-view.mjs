// mothership:dev-only
//
// The Blackout's lighting window drawn on the board-v2 review page (storyboard S1;
// docs/design/blackout-window.md). page.js draws the board; this adds each room's dark drawing,
// its light's sparks, the impacts and the markers, puts the window's clock and line in the top
// bar, and shows the film at one moment (&t=) or plays it (&play=1). A picture for review, not a
// client: no command, server, clock authority or private state exists here, and every input is a
// synthetic fixture.
//
//   &t=<ms>                 the moment, from the window's opening (default 8000)
//   &play=1                 play the window from 0, again and again
//   &outcome=hit|double|miss|none|blocked   the round's outcome (default hit): one hit, two, a
//                           strike that missed, no strike at all, a strike that was blocked. A miss and
//                           no strike draw the same, and so does a block, but for its room's occupants
//   &in=<room>              the viewer's room, for its room-visible facts (default none, as on the
//                           display): a block plays ATTACK BLOCKED (S4) there once the lights are back
//   &r=<ms>                 when the outcome is published (default 15400)
//   &window=<id>            the window's public id (default w-demo-r3): which light sparks in each room
//   &motion=reduced         the device's reduced-motion setting
//   &viewer=observer|disabler|display   whose screen (default observer): any player, the eligible
//                           Disabler (the top bar's line is their own selection), or the shared display
//   &side=blue|red          the Disabler's side: changes nothing, which is the point
//   &bound=<room>           the Disabler's bound room (default room-b)
//   &step=choose|confirm|sent   the Disabler's own selection (default choose): nothing chosen; a
//                           position chosen on the phone and not sent; a position sent, as one command
//   &pick=<n>               the position chosen (default 2)
//   &sentAt=<ms>            when it was sent (default 9000)
//   &reply=accepted|rejected   the server's answer to that one command (default accepted)
//   &replyAt=<ms>           when the answer arrives (default 400 ms after the send)
//   &lost=1                 the answer is lost on its way: the phone hears nothing until
//   &recoverAt=<ms>         it recovers the receipt with the same command id (default never)
//
// The public picture is blackoutFrame(t, { outcomeAt, hits, reduced, windowId }): nothing a
// request, a side or a viewer could change. The top bar's line is the same box on every screen;
// only its words, the chosen marker and the press areas belong to the viewer, and only on the
// eligible Disabler's own screen; and a block's film to its room's occupants (js/blocked-view.mjs).
//
// The selection: a tap on a position chooses it on the phone, and nothing is sent; a tap on
// another position chooses that one instead; a second tap on the chosen position sends it, once,
// as one command with one id, and the press areas go. A sent position is never sent again. After
// the deadline its line says what the server answered, or that the answer has not come: never a
// rejection the server did not give.
//
// The people: until the outcome, everyone at the window's frozen snapshot; once it is resolved,
// everyone where its after-state puts them (fixtures.mjs). The impact stays at the frozen position
// it hit, and the hit patient comes back with the lights in the Hospital, at the slot the
// after-state names, in the gown. This page allocates nothing and infers no placement.

import { CREW } from '../../board-motion/figures/crew.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { BLACKOUT, blackoutFrame, lightsBackAt } from '../films/blackout.mjs';
import { blockedEnd, blockedStartInBlackout } from '../films/blocked.mjs';
import { SPARK_BOX, SPARK_ORIGIN } from '../scenes/lighting.mjs';
import { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } from '../scenes/slots.mjs';
import { slotRects } from './fit.mjs';
import { BLACKOUT_OUTCOMES } from './fixtures.mjs';
import { mountBlocked, roomLive } from './blocked-view.mjs';

const LIGHTING = '../board-v2/assets/lighting';
const clockText = ms => `0:${String(Math.ceil(ms / 1000)).padStart(2, '0')}`;
/** A room as the line names it. */
const IN_ROOM = Object.freeze({ 'room-a': 'Room A', 'room-b': 'Room B', jail: 'the Jail', hospital: 'the Hospital', 'command-room': 'the Command Room' });
/** How long this page's own sends wait for their answer, unless &replyAt says otherwise. */
const REPLY_MS = 400;

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}

/** The Disabler's selection as a review address describes it: &step, &pick, &sentAt, &reply, &replyAt, &lost and &recoverAt. */
export function addressSelection(params) {
  const number = (name, fallback) => (params.has(name) ? Number(params.get(name)) : fallback);
  const sentAt = number('sentAt', 9000);
  const step = params.get('step') ?? 'choose';
  if (!['choose', 'confirm', 'sent'].includes(step)) throw new Error(`No step ${step}`);
  return { step, pick: number('pick', 2), sentAt, reply: params.get('reply') ?? 'accepted', replyAt: number('replyAt', sentAt + REPLY_MS), lost: params.get('lost') === '1', recoverAt: number('recoverAt', null), commandId: step === 'sent' ? `blackout-${params.get('window') ?? 'w-demo-r3'}-1` : null };
}

/** The receipt of the Disabler's one sent position at t: null (nothing sent), 'pending', 'accepted' or 'rejected'. */
export function receiptAt(selection, t) {
  if (selection.step !== 'sent') return null;
  const heard = selection.lost ? selection.recoverAt : selection.replyAt;
  return heard !== null && heard !== undefined && t >= heard ? selection.reply : 'pending';
}

/** The window's line in the top bar at t: the same words on every screen but the eligible Disabler's. */
export function lineText(frame, t, { viewer, bound, selection }) {
  const preview = t < BLACKOUT.previewMs;
  if (viewer !== 'disabler') return preview ? 'Remember who is where.' : 'Wait for the lights.';
  if (preview) return `Remember ${IN_ROOM[bound]}: you choose there.`;
  const n = selection.pick;
  if (selection.step === 'sent') {
    const receipt = receiptAt(selection, t);
    if (receipt === 'accepted') return `Registered: position ${n}.`;
    if (receipt === 'rejected') return `Position ${n} was not registered.`;
    // No answer yet, before the deadline and after it alike.
    return frame.selection ? `Sending position ${n}…` : `Position ${n} sent. Waiting for the answer.`;
  }
  if (!frame.selection) return 'Time is up: no position was sent.';
  if (selection.step === 'confirm') return `Position ${n}: tap it again to strike.`;
  return `Tap a position in ${IN_ROOM[bound]}.`;
}

export function mountBlackout({ app, board, roster, seats, params, drawFigure, drawTag }) {
  const reduced = params.get('motion') === 'reduced';
  const windowId = params.get('window') ?? 'w-demo-r3';
  const outcome = BLACKOUT_OUTCOMES[params.get('outcome') ?? 'hit'];
  if (!outcome) throw new Error(`No outcome ${params.get('outcome')}`);
  const outcomeAt = Number(params.get('r') ?? 15400);
  const viewer = params.get('viewer') ?? 'observer';
  const bound = params.get('bound') ?? 'room-b';
  // The Disabler's selection as the address describes it: where a review picture starts.
  const initial = () => addressSelection(params);
  let selection = initial();
  let sends = 0;
  const hits = outcome.hits;
  // The lights come back on the resolved board: from then, everyone is where the after-state puts them.
  const settleAt = Math.max(outcomeAt, lightsBackAt(outcomeAt));
  document.documentElement.dataset.film = 'blackout';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';

  // ---------- what each room adds ----------
  const rooms = {};
  for (const room of BOARD_ROOMS) {
    const section = app.querySelector(`.v2-room[data-room="${room}"]`);
    const panel = board.panels[room];
    const scene = sceneOf(room, roster);
    const { k, tx, ty } = frameScene(scene, panel);
    const art = section.querySelector('.v2-art');
    const picture = { left: `${tx}px`, top: `${ty}px`, width: `${1024 * k}px`, height: `${768 * k}px` };
    const dark = el('img', { class: 'v2-dark', alt: '', src: room === 'hospital' ? `${LIGHTING}/hospital-ward-${roster}.dark.svg` : `${LIGHTING}/${room}.dark.svg`, style: { ...picture, zIndex: '3000' } });
    art.append(dark);
    const rects = slotRects(room, roster, panel);
    // The position markers: every fixed slot, empty or not; named by their number alone.
    for (const old of section.querySelectorAll('.v2-marker')) old.remove();
    const markers = slotsOf(room, roster).map((slot, index) => {
      const rect = rects[index];
      const marker = el('span', { class: 'v2-marker v2-marker--film', role: 'img', 'data-slot': slot.id, 'aria-label': `Position ${index + 1}`, style: { left: `${rect.marker[0]}px`, top: `${rect.marker[1]}px` } }, String(index + 1));
      section.append(marker);
      return marker;
    });
    // The eligible Disabler's press areas: each slot's whole press area in the bound room, on their screen only.
    const hitAreas = viewer === 'disabler' && room === bound ? slotsOf(room, roster).map((slot, index) => {
      const rect = rects[index];
      return el('button', { class: 'v2-hit', type: 'button', 'data-slot': slot.id, 'data-position': String(index + 1), 'aria-label': `Position ${index + 1}`, style: { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` } });
    }) : [];
    // The light that sparks in this room, from the window's id.
    const spark = el('img', { class: 'v2-spark', alt: '', style: { width: `${SPARK_BOX * k}px`, height: `${SPARK_BOX * k}px`, zIndex: '3550' } });
    // An impact at each hit position of this room, centred on its press point: the frozen snapshot's slot.
    const impacts = slotsOf(room, roster).flatMap((slot, index) => (hits.includes(slot.id) ? [{ slot, rect: rects[index] }] : [])).map(({ slot, rect }) => {
      const size = 1.6 * rect.side;
      return { slot: slot.id, node: el('img', { class: 'v2-impact', alt: '', 'data-slot': slot.id, style: { left: `${rect.press[0] - size / 2}px`, top: `${rect.press[1] - size / 2}px`, width: `${size}px`, height: `${size}px`, zIndex: '3560' } }), burst: el('img', { class: 'v2-burst', alt: '', src: `${LIGHTING}/fx-impact-2.svg`, style: { left: `${rect.left + 2}px`, top: `${rect.top + 2}px` } }) };
    });
    const caption = section.querySelector('.v2-cap');
    const icon = el('img', { class: 'v2-cap-icon', alt: '', src: `${LIGHTING}/fx-bolt.svg` });
    // The positions summary, from public facts, while the lights are on.
    const summary = el('p', { class: 'v2-sr' }, `${LOCATION_OF[room]}: ${slotsOf(room, roster).map((slot, index) => {
      const seat = seats.find(entry => entry.room === room && entry.slot === slot.id);
      return `${index + 1} ${seat ? CREW[seat.character].sign : 'empty'}`;
    }).join(', ')}`);
    rooms[room] = { section, art, dark, markers, hitAreas, spark, impacts, caption, icon, summary, k, tx, ty, rects, panel };
  }

  // ---------- the people, before the outcome and after it ----------
  // Everyone page.js drew stays where they are, but a seat the outcome moves: its figure and tag at
  // the frozen slot until the board settles, and, drawn here ahead, at the room and slot its
  // after-state names, in its health (a patient in the gown) from then on.
  const moved = new Map(outcome.after[roster].map(entry => [entry.seat, entry]));
  const placements = [];
  for (const room of BOARD_ROOMS) {
    for (const node of rooms[room].section.querySelectorAll('.v2-fig, .v2-tag')) placements.push({ room, node, when: moved.has(Number(node.dataset.seat)) ? 'before' : 'always' });
  }
  for (const entry of moved.values()) {
    const seat = seats.find(candidate => candidate.seat === entry.seat);
    if (!seat) throw new Error(`The outcome moves seat ${entry.seat}, who is not on this board`);
    const r = rooms[entry.room];
    const index = slotsOf(entry.room, roster).findIndex(slot => slot.id === entry.slot);
    if (index < 0) throw new Error(`No slot ${entry.slot} in ${entry.room} for ${roster} players`);
    const now = { ...seat, room: entry.room, slot: entry.slot, health: entry.health };
    for (const node of drawFigure(entry.room, slotsOf(entry.room, roster)[index], now, { k: r.k, tx: r.tx, ty: r.ty })) placements.push({ room: entry.room, node, when: 'after' });
    placements.push({ room: entry.room, node: drawTag(now, r.rects[index], r.panel), when: 'after' });
  }
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite' });
  app.append(live);

  // ---------- ATTACK BLOCKED: room-visible, on the screens of the target's room's occupants ----------
  // Not in the published batch: a room fact for the occupants alone. Every other screen draws a miss.
  const inRoom = viewer === 'display' ? null : params.get('in');
  const blockedFrom = blockedStartInBlackout(outcomeAt, { reduced });
  const say = roomLive(app);
  const blocks = (outcome.blocks ?? []).flatMap(id => {
    const seat = seats.find(entry => entry.slot === id);
    if (!seat || seat.room !== inRoom) return [];
    const r = rooms[seat.room];
    const index = slotsOf(seat.room, roster).findIndex(slot => slot.id === id);
    const figures = () => [...r.section.querySelectorAll(`.v2-fig[data-seat="${seat.seat}"]`)];
    return [mountBlocked({ section: r.section, rect: r.rects[index], panel: r.panel, figures, name: CREW[seat.character].sign, reduced })];
  });

  // ---------- the top bar: the window's clock, and its line in a second row ----------
  // The same box on every screen: above the board, so it covers no position.
  const top = app.querySelector('.v2-top');
  const phase = el('span', { class: 'v2-top__phase' });
  const timer = el('span', { class: 'v2-top__timer' });
  const line = el('p', { class: 'v2-top__line', role: 'status' });
  top.replaceChildren(el('div', { class: 'v2-top__row' }, phase, timer, top.querySelector('.v2-top__meta')), line);

  // ---------- one moment ----------
  let lastT = 0;
  let lastFrame = null;
  function apply(t) {
    lastT = t;
    const frame = blackoutFrame(t, { outcomeAt, hits, reduced, windowId });
    lastFrame = frame;
    document.documentElement.dataset.stage = frame.stage;
    const receipt = receiptAt(selection, t);
    for (const room of BOARD_ROOMS) {
      const r = rooms[room];
      r.dark.style.opacity = String(frame.darkness);
      r.art.style.transform = r.impacts.length && (frame.shake[0] || frame.shake[1]) ? `translate(${frame.shake[0]}px, ${frame.shake[1]}px)` : '';
      // The positions summary, with its names, only while the lights are still on before the dark.
      if (['markers-in', 'preview', 'flicker'].includes(frame.stage)) { if (!r.summary.isConnected) r.section.append(r.summary); } else r.summary.remove();
      for (const [index, marker] of r.markers.entries()) {
        // The Disabler's chosen position, gold on their screen only: while it is chosen and the selection
        // is open, or once sent, until the server says it was not registered.
        const mine = viewer === 'disabler' && room === bound && index + 1 === selection.pick;
        const chosen = mine && frame.markers.style === 'dark' && ((selection.step === 'confirm' && frame.selection) || (selection.step === 'sent' && receipt !== 'rejected'));
        marker.dataset.style = chosen ? 'chosen' : frame.markers.style;
        marker.style.opacity = String(frame.markers.opacity);
        marker.hidden = frame.markers.opacity === 0;
      }
      // Pressable only for the eligible Disabler, in their bound room, while the selection is open and
      // nothing is sent: the slot's whole press area, not its 22 px number; its marker is then only a picture.
      const pressable = frame.selection && r.hitAreas.length > 0 && selection.step !== 'sent';
      for (const [index, hit] of r.hitAreas.entries()) {
        if (pressable) {
          if (!hit.isConnected) r.section.append(hit);
          hit.setAttribute('aria-pressed', String(selection.step === 'confirm' && selection.pick === index + 1));
          r.markers[index].setAttribute('aria-hidden', 'true');
        } else {
          hit.remove();
          r.markers[index].removeAttribute('aria-hidden');
        }
      }
      // The light's sparks.
      const plan = frame.sparks.plan[room];
      if (frame.sparks.frame) {
        const [fx, fy] = plan.at;
        r.spark.src = `${LIGHTING}/fx-spark-${frame.sparks.frame}.svg`;
        // From the light's lower edge, or from the panel's top edge where the light is above it.
        const originY = Math.max(2, r.ty + fy * r.k);
        Object.assign(r.spark.style, { left: `${r.tx + fx * r.k - SPARK_ORIGIN[0] * r.k}px`, top: `${originY - SPARK_ORIGIN[1] * r.k}px`, transformOrigin: `${(SPARK_ORIGIN[0] / SPARK_BOX) * 100}% ${(SPARK_ORIGIN[1] / SPARK_BOX) * 100}%`, transform: `${plan.mirror ? 'scaleX(-1) ' : ''}rotate(${plan.tilt}deg)` });
        if (!r.spark.isConnected) r.section.append(r.spark);
      } else r.spark.remove();
      // The impacts, and the still burst for reduced motion.
      for (const impact of r.impacts) {
        if (frame.impact.frame) { impact.node.src = `${LIGHTING}/fx-impact-${frame.impact.frame}.svg`; if (!impact.node.isConnected) r.section.append(impact.node); } else impact.node.remove();
        if (frame.impact.burst) { if (!impact.burst.isConnected) r.section.append(impact.burst); } else impact.burst.remove();
      }
      if (r.caption) {
        r.caption.style.opacity = String(frame.captions);
        if (frame.darkIcon) { if (!r.icon.isConnected) r.caption.append(r.icon); } else r.icon.remove();
      }
    }
    // The people: on the page while there is light to see them by, off it in the dark; on the resolved
    // board once the outcome settles.
    const settled = t >= settleAt;
    for (const { room, node, when } of placements) {
      if (frame.people === 'gone' || (when === 'before' && settled) || (when === 'after' && !settled)) { node.remove(); continue; }
      if (!node.isConnected) (node.classList.contains('v2-tag') ? rooms[room].section : rooms[room].art).append(node);
      node.style.opacity = String(frame.peopleOpacity);
    }
    const back = t >= BLACKOUT.windowMs && frame.people !== 'gone';
    const said = back ? `The lights are back.${settled ? [...moved.values()].map(entry => ` ${CREW[seats.find(seat => seat.seat === entry.seat).character].sign} is ${entry.health}, in ${IN_ROOM[entry.room]}.`).join('') : ''}` : '';
    if (live.textContent !== said) live.textContent = said;
    // The top bar: the window's clock, and its line while the window lasts.
    top.classList.toggle('v2-top--window', frame.line);
    line.hidden = !frame.line;
    const words = frame.line ? lineText(frame, t, { viewer, bound, selection }) : '';
    if (line.textContent !== words) line.textContent = words;
    phase.textContent = frame.clock ? frame.clock.label : 'Round 3';
    timer.textContent = frame.clock ? clockText(frame.clock.remainingMs) : '';
    say(blocks.map(block => block(t - blockedFrom)));
    return frame;
  }

  // The Disabler's own selection, on their screen only: tap a position in the bound room, then tap it again.
  const playing = params.get('play') === '1';
  app.addEventListener('click', event => {
    const hit = event.target.closest('.v2-hit');
    if (!hit || !lastFrame?.selection || selection.step === 'sent') return;
    const n = Number(hit.dataset.position);
    if (selection.step === 'confirm' && selection.pick === n) {
      // The second tap on the chosen position sends it: one command, one id, never sent again.
      sends += 1;
      selection = { ...selection, step: 'sent', sentAt: lastT, replyAt: params.has('replyAt') ? Number(params.get('replyAt')) : lastT + REPLY_MS, commandId: `blackout-${windowId}-1` };
    } else selection = { ...selection, step: 'confirm', pick: n };
    // A held moment draws the change at once; a playing film draws it on its next frame.
    if (!playing) apply(lastT);
  });

  // What the capture's interaction tests read: the selection, how many commands this page sent, and the line.
  window.__blackoutState = () => ({ ...selection, sends, receipt: receiptAt(selection, lastT), line: line.hidden ? null : line.textContent });
  if (playing) {
    const start = performance.now();
    // Long enough for a block's film, where this screen has one.
    const length = Math.max(outcomeAt + BLACKOUT.markersOut[1] + 1200, blocks.length ? blockedFrom + blockedEnd(reduced) + 600 : 0);
    let lap = -1;
    const tick = now => {
      // Every lap is a new window: the selection starts again.
      const elapsed = now - start;
      if (Math.floor(elapsed / length) !== lap) { lap = Math.floor(elapsed / length); selection = initial(); sends = 0; }
      apply(elapsed % length);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    window.__blackoutFrame = apply(Number(params.get('t') ?? 8000));
    // The same page at another moment, its selection kept: a held film the tests move through time.
    window.__blackoutAt = t => { window.__blackoutFrame = apply(t); return window.__blackoutState(); };
  }
}

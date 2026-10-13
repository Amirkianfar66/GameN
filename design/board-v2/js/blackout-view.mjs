// mothership:dev-only
//
// The Blackout's lighting window drawn on the board-v2 review page (storyboard S1;
// docs/design/blackout-window.md). page.js draws the board; this adds each room's dark drawing,
// its light's sparks, the impacts, the markers, the shared strip and the top bar's clock, and
// shows the film at one moment (&t=) or plays it (&play=1). A picture for review, not a client:
// no command, server, clock authority or private state exists here, and every input is a
// synthetic fixture.
//
//   &t=<ms>                 the moment, from the window's opening (default 8000)
//   &play=1                 play the window from 0, again and again
//   &outcome=hit|double|miss|none   the round's published outcome (default hit): one hit, two,
//                           a strike that missed, no strike at all. A miss and no strike draw the same
//   &r=<ms>                 when the outcome is published (default 15400)
//   &window=<id>            the window's public id (default w-demo-r3): which light sparks in each room
//   &motion=reduced         the device's reduced-motion setting
//   &viewer=observer|disabler|display   whose screen (default observer): any player, the eligible
//                           Disabler (their strip holds the selection line), or the shared display (no strip)
//   &side=blue|red          the Disabler's side: changes nothing, which is the point
//   &bound=<room>           the Disabler's bound room (default room-b)
//   &step=choose|confirm|sending|registered|timeout   the Disabler's own selection (default choose)
//   &pick=<n>               the position chosen (default 2)
//
// The public picture is blackoutFrame(t, { outcomeAt, hits, reduced, windowId }): nothing a
// request, a side or a viewer could change. Only the strip's second line and the chosen marker
// belong to the viewer, and only on the Disabler's own screen.

import { CREW } from '../../board-motion/figures/crew.mjs';
import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { BLACKOUT, blackoutFrame } from '../films/blackout.mjs';
import { IMPACT_BOX, SPARK_BOX, SPARK_ORIGIN } from '../scenes/lighting.mjs';
import { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } from '../scenes/slots.mjs';
import { slotRects } from './fit.mjs';
import { BLACKOUT_OUTCOMES } from './fixtures.mjs';

const LIGHTING = '../board-v2/assets/lighting';
const clockText = ms => `0:${String(Math.ceil(ms / 1000)).padStart(2, '0')}`;

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}

/** The strip's second line on a screen: the same for every player but the eligible Disabler. */
function stripLine(viewer, step, bound, pick, frame) {
  if (viewer !== 'disabler') return el('p', { class: 'v2-strip__note' }, 'Wait for the lights.');
  if (!frame.selection && step !== 'registered') return el('p', { class: 'v2-strip__note' }, 'Time is up: no position was registered.');
  if (step === 'confirm') {
    return el('div', { class: 'v2-strip__buttons' },
      el('button', { class: 'v2-btn v2-btn--strike', type: 'button', 'data-act': 'strike' }, `Strike position ${pick}`),
      el('button', { class: 'v2-btn', type: 'button', 'data-act': 'again' }, 'Choose again'));
  }
  if (step === 'sending') return el('p', { class: 'v2-strip__note' }, 'Sending…');
  if (step === 'registered') return el('p', { class: 'v2-strip__note' }, `Registered: position ${pick}.`);
  if (step === 'timeout') return el('p', { class: 'v2-strip__note' }, 'Time is up: no position was registered.');
  return el('p', { class: 'v2-strip__note' }, `Tap a position in ${LOCATION_OF[bound]}.`);
}

export function mountBlackout({ app, board, roster, seats, params, drawFigure }) {
  const reduced = params.get('motion') === 'reduced';
  const windowId = params.get('window') ?? 'w-demo-r3';
  const outcome = BLACKOUT_OUTCOMES[params.get('outcome') ?? 'hit'];
  if (!outcome) throw new Error(`No outcome ${params.get('outcome')}`);
  const outcomeAt = Number(params.get('r') ?? 15400);
  const viewer = params.get('viewer') ?? 'observer';
  const bound = params.get('bound') ?? 'room-b';
  const selection = { step: params.get('step') ?? 'choose', pick: Number(params.get('pick') ?? 2) };
  const hits = outcome.hits;
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
    // An impact at each hit position of this room, centred on its press point.
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
    rooms[room] = { section, art, dark, markers, hitAreas, spark, impacts, caption, icon, summary, k, tx, ty, rects, people: [...section.querySelectorAll('.v2-fig, .v2-tag')] };
  }

  // ---------- the shared strip, over the Command band ----------
  const box = board.boxes['command-room'];
  const strip = viewer === 'display' ? null : el('div', { class: 'v2-strip', role: 'status', style: { left: `${box.left}px`, top: `${box.top - board.shell.top}px`, width: `${box.width}px`, height: `${box.height}px` } });
  if (strip) app.querySelector('.v2-board').append(strip);
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite' });
  app.append(live);

  // The top bar: the window's clock, as the phone's top bar shows a phase and its timer.
  const top = app.querySelector('.v2-top');
  const phase = el('span', { class: 'v2-top__phase' });
  const timer = el('span', { class: 'v2-top__timer' });
  top.querySelector('.v2-top__label').replaceWith(phase);
  top.append(timer);

  // ---------- one moment ----------
  let after = false;
  let lastT = 0;
  const stripTime = el('span', { class: 'v2-strip__time' });
  const stripBody = el('div', { class: 'v2-strip__body' });
  let stripKey = null;
  if (strip) strip.append(el('div', { class: 'v2-strip__row' }, el('span', { class: 'v2-strip__kind' }, 'Lights out'), stripTime), stripBody);
  function apply(t) {
    lastT = t;
    const frame = blackoutFrame(t, { outcomeAt, hits, reduced, windowId });
    document.documentElement.dataset.stage = frame.stage;
    for (const room of BOARD_ROOMS) {
      const r = rooms[room];
      r.dark.style.opacity = String(frame.darkness);
      r.art.style.transform = hits.some(id => r.impacts.some(impact => impact.slot === id)) && (frame.shake[0] || frame.shake[1]) ? `translate(${frame.shake[0]}px, ${frame.shake[1]}px)` : '';
      // The people: on the page while there is light to see them by, off it in the dark.
      const gone = frame.people === 'gone';
      for (const node of r.people) {
        if (gone) node.remove();
        else {
          if (!node.isConnected) (node.classList.contains('v2-tag') ? r.section : r.art).append(node);
          node.style.opacity = String(frame.peopleOpacity);
        }
      }
      // The positions summary, with its names, only while the lights are still on before the dark.
      if (['markers-in', 'preview', 'flicker'].includes(frame.stage)) { if (!r.summary.isConnected) r.section.append(r.summary); } else r.summary.remove();
      for (const marker of r.markers) {
        const chosen = viewer === 'disabler' && room === bound && ['confirm', 'sending', 'registered'].includes(selection.step) && marker.textContent === String(selection.pick) && frame.markers.style === 'dark';
        marker.dataset.style = chosen ? 'chosen' : frame.markers.style;
        marker.style.opacity = String(frame.markers.opacity);
        marker.hidden = frame.markers.opacity === 0;
      }
      // Pressable only for the eligible Disabler, in their bound room, while the selection is open:
      // the slot's whole press area, not its 22 px number; its marker is then only a picture.
      const pressable = frame.selection && r.hitAreas.length > 0;
      for (const [index, hit] of r.hitAreas.entries()) {
        if (pressable) { if (!hit.isConnected) r.section.append(hit); } else hit.remove();
        if (pressable) r.markers[index].setAttribute('aria-hidden', 'true'); else r.markers[index].removeAttribute('aria-hidden');
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
    // The published outcome: once the lights are back, the people as it left them.
    const nowAfter = t >= outcomeAt && frame.people !== 'gone' && t >= outcomeAt + (reduced ? 0 : BLACKOUT.lightsReturn[0]);
    if (nowAfter !== after) {
      after = nowAfter;
      for (const [seatNumber, health] of Object.entries(outcome.after)) {
        const seat = seats.find(entry => entry.seat === Number(seatNumber));
        if (!seat) continue;
        const r = rooms[seat.room];
        const slot = slotsOf(seat.room, roster).find(entry => entry.id === seat.slot);
        const was = r.people.filter(node => node.classList.contains('v2-fig') && node.dataset.seat === seatNumber);
        const now = drawFigure(seat.room, slot, after ? { ...seat, health } : seat, { k: r.k, tx: r.tx, ty: r.ty });
        for (const node of was) node.remove();
        r.people = [...r.people.filter(node => !was.includes(node)), ...now];
        for (const node of now) { node.style.opacity = String(frame.peopleOpacity); if (frame.people !== 'gone') r.art.append(node); }
      }
      live.textContent = after ? `The lights are back.${Object.entries(outcome.after).map(([n, health]) => ` ${CREW[seats.find(entry => entry.seat === Number(n)).character].sign} is ${health}.`).join('')}` : '';
    }
    // The strip: the same box on every player's screen; its second line is the Disabler's own.
    // Its line is drawn again only when it changes, so its buttons stay pressable while the film plays.
    if (strip) {
      strip.style.opacity = String(frame.strip);
      strip.hidden = frame.strip === 0;
      stripTime.textContent = frame.clock ? clockText(frame.clock.remainingMs) : '';
      const key = `${selection.step}|${selection.pick}|${frame.selection}`;
      if (key !== stripKey) {
        stripKey = key;
        stripBody.replaceChildren(stripLine(viewer, selection.step, bound, selection.pick, frame));
      }
    }
    phase.textContent = frame.clock ? frame.clock.label : 'Round 3';
    timer.textContent = frame.clock ? clockText(frame.clock.remainingMs) : '';
    return frame;
  }

  // The Disabler's own selection, on their screen only: tap a marker in the bound room, then confirm.
  app.addEventListener('click', event => {
    const hit = event.target.closest('.v2-hit');
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (hit) { selection.pick = Number(hit.dataset.position); selection.step = 'confirm'; }
    else if (act === 'again') selection.step = 'choose';
    else if (act === 'strike') { selection.step = 'sending'; setTimeout(() => { selection.step = 'registered'; apply(lastT); }, 400); }
    else return;
    // A held moment draws the change at once; a playing film draws it on its next frame.
    if (params.get('play') !== '1') apply(lastT);
  });

  if (params.get('play') === '1') {
    const start = performance.now();
    const length = outcomeAt + BLACKOUT.markersOut[1] + 1200;
    const tick = now => { apply((now - start) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__blackoutFrame = apply(Number(params.get('t') ?? 8000));
  }
}

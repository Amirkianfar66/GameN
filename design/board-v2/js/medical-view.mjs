// mothership:dev-only
//
// The Hospital's medical films on the board-v2 review page (storyboards S9, S5 and S10;
// docs/design/hospital-films.md). A picture for review, not a client: no command, server, clock or
// private state exists here, and every input is a synthetic fixture (medical-fixtures.mjs). A
// review page's controller: not to be ported.
//
// The films are public: every phone and the display draw the same. A berth's state comes from
// its occupant's public facts alone; a film plays over the snapshot published with its outcome
// (the subject already where the server put it), at the berth its anchor names, unless another
// seat holds that berth in the snapshot (films/medical.mjs filmBerth()).
//
//   ?film=critical         the critical state on the mixed board's patients (page.js draws the board)
//     &fixture=ward        every seat Injured instead: a tag at every berth
//     &round=3|5           the match's round (default 3; 5: every patient a new round-5 injury)
//     &entry=<seat>        that patient's admission entry, played at &t
//     &t=<ms>              the moment (default 1200): the loops' and the entry's
//   ?film=rescue|flatline  one outcome's film over the snapshot published with it
//     &outcome=<name>      medical-fixtures.mjs MEDICAL_OUTCOMES (default: rescue for film=rescue, death for flatline)
//     &t=<ms>              the moment, from the outcome's presentation start (default 2600; 2000 for flatline)
//     &play=1              play it again and again
//   &motion=reduced        the device's reduced-motion setting

import { FRAME } from '../../board-motion/figures/body.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { frameScene, pressPoint } from '../../board-motion/scenes/frame.mjs';
import { LABEL_MARGIN } from '../fx/label-box.mjs';
import { DRONE, DRONE_SCENE, droneFit, insetBox, tagBox, vitalsInsetSvg } from '../fx/medical.mjs';
import { berthState, criticalFrame, flatlineEnd, flatlineFrame, rescueEnd } from '../films/medical.mjs';
import { MEDICAL_BERTHS, sceneOf, slotRects, slotsOf } from './layout.mjs';
import { medicalOutcome, medicalSeats } from './medical-fixtures.mjs';

/** The berths' geometry and the films that depend on it: the roster-sized ward's, or with &beds=4 the four-berth ward's (./layout.mjs). */
const { berthKit, filmBerth, rescueFrame } = MEDICAL_BERTHS;

const ART = '../board-v2/assets/medical';
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

/** The outcome a medical film page plays: &outcome=, or the film's own example. */
export const outcomeName = params => params.get('outcome') ?? (params.get('film') === 'flatline' ? 'death' : 'rescue');
export const isMedicalFilm = film => film === 'critical' || film === 'rescue' || film === 'flatline';

/**
 * The words a client says for an authoritative MEDICAL_OUTCOME: Frontend's, as the hosted board says
 * them today (#154, board-v2-host.mjs paintOutcomes()). A film adds no words of its own; the review
 * page puts these in its live region at the film's announce beat.
 */
export const outcomeWords = (seat, kind) => `Player ${seat}: ${kind === 'INJURY' ? 'Injured' : kind === 'HEALED' ? 'Healed' : 'Eliminated'}.`;

/** The Hospital panel's frame and a berth's geometry in its pixels. */
function berthPixels(roster, panel, berthId) {
  const frame = frameScene(sceneOf('hospital', roster), panel);
  const at = ([x, y]) => [frame.tx + x * frame.k, frame.ty + y * frame.k];
  const kit = berthKit(berthId);
  const [mx, my] = at([kit.monitor.x, kit.monitor.y]);
  return {
    frame, kit, at,
    monitor: { left: mx, top: my, width: kit.monitor.w * frame.k, height: kit.monitor.h * frame.k },
    lamp: at([kit.lamp.cx, kit.lamp.cy]), lampSide: Math.max(10, 8 * kit.lamp.r * frame.k),
    bedLight: { center: at([kit.bedLight.cx, kit.bedLight.cy]), rx: kit.bedLight.rx * frame.k, ry: kit.bedLight.ry * frame.k },
    chest: at(kit.chest), droneWidth: DRONE_SCENE.width * kit.scale * frame.k,
  };
}

/** The room's caption's box in its panel, or null. */
function captionBox(section) {
  const caption = section.querySelector('.v2-cap');
  return caption ? { left: caption.offsetLeft, top: caption.offsetTop, width: caption.offsetWidth, height: caption.offsetHeight } : null;
}

/** A berth's tags: the rescue tag with its round, then the neutral detention tag. */
function tagGroup(state) {
  const group = el('span', { class: 'v2-medtag' });
  if (state.tag) {
    group.append(el('span', { class: `v2-medtag__rescue v2-medtag__rescue--${state.tag.tone}` },
      el('img', { src: `${ART}/rescue-${state.tag.tone}.svg`, alt: '' }), state.tag.text ? el('b', { 'aria-hidden': 'true' }, state.tag.text) : null),
    el('span', { class: 'v2-sr' }, `${state.tag.label}.`));
  }
  if (state.detention) group.append(el('img', { class: 'v2-medtag__detention', src: `${ART}/detention.svg`, alt: '' }), el('span', { class: 'v2-sr' }, 'Detained.'));
  return group;
}

/**
 * Where page.js draws a slot's name tag, whoever holds it: under its press area's foot, 17 px tall,
 * and as wide as the longest name tag (60 px), so that a berth's tags keep clear of every name tag
 * a board can show, a film's included.
 */
const nameTagBand = (rect, panel) => ({ left: rect.press[0] - 30, top: Math.min(panel.height - 16, rect.top + rect.side - 14), width: 60, height: 17 });

/** Puts a laid-out tag group where tagBox() says: on its berth's plate, below the caption's band, clear of the name tags. */
function placeTag(group, rect, panel, roster) {
  const keepClear = slotRects('hospital', roster, panel).filter(other => other.id !== rect.id).map(other => nameTagBand(other, panel));
  const { left, top } = tagBox({ plate: rect.badge, size: [group.offsetWidth, group.offsetHeight], panel, keepClear });
  Object.assign(group.style, { left: px(left), top: px(top) });
}

/**
 * A berth's state between films: its monitor, lamp, bed light and tags, drawn from its occupant's
 * public facts. The monitor, lamp and bed light are part of the room's art (under its patients,
 * dimmed with it); the tags are labels, over it.
 */
function drawBerthState({ section, roster, panel, seat, rect }) {
  const art = section.querySelector('.v2-art');
  const state = berthState(seat);
  const pix = berthPixels(roster, panel, seat.slotId);
  const nodes = [];
  if (state.monitor === 'unstable') nodes.push(el('img', { class: 'v2-med v2-med__screen', alt: '', src: `${ART}/berth-screen-unstable.svg`, style: { left: px(pix.monitor.left), top: px(pix.monitor.top), width: px(pix.monitor.width), height: px(pix.monitor.height) } }));
  if (state.lamp) nodes.push(el('img', { class: 'v2-med v2-med__lamp', alt: '', 'data-lamp': state.lamp, src: `${ART}/lamp-${state.lamp}.svg`, style: { left: px(pix.lamp[0] - pix.lampSide / 2), top: px(pix.lamp[1] - pix.lampSide / 2), width: px(pix.lampSide), height: px(pix.lampSide) } }));
  if (state.bedLight === 'off') nodes.push(el('span', { class: 'v2-med v2-med__bedlight', style: { left: px(pix.bedLight.center[0] - pix.bedLight.rx), top: px(pix.bedLight.center[1] - pix.bedLight.ry), width: px(2 * pix.bedLight.rx), height: px(2 * pix.bedLight.ry) } }));
  if (state.tag || state.detention) nodes.push(tagGroup(state));
  for (const node of nodes) { node.dataset.berth = seat.slotId; (node.classList.contains('v2-medtag') ? section : art).append(node); }
  for (const node of nodes) if (node.classList.contains('v2-medtag')) placeTag(node, rect, panel, roster);
  return { state, nodes };
}

/** The anchor for a pose at a berth: where the figure stands so that its press point is the berth's (as the ward places its gesture). */
function poseSlot(slot, gesture) {
  const [px0, py0] = pressPoint(skeletonOf(gesture));
  const [cx, cy] = slot.pressAt;
  const x = slot.mirror ? cx - (AX - px0) * slot.scale : cx - (px0 - AX) * slot.scale;
  return { ...slot, gesture, at: [x, cy - (py0 - AY) * slot.scale] };
}

/**
 * One outcome's film at its berth: returns apply(t), which draws the film at t, removes every node
 * it added once it is over, and returns the frame with its words for the live region. Where another
 * seat holds the berth in the snapshot, nothing is drawn and the words stand alone.
 */
function mountClinicalFilm({ app, section, roster, panel, outcome, film, reduced, drawFigure, drawTag }) {
  const subject = outcome.subject;
  const words = outcomeWords(subject.seat, film === 'rescue' ? 'HEALED' : 'DEATH');
  const end = film === 'rescue' ? rescueEnd(reduced) : flatlineEnd(reduced);
  const { berth: berthId, plays } = filmBerth(outcome.anchor, roster, outcome.after.map(seat => ({ seat: seat.seat, slotId: seat.room === 'hospital' ? seat.slot : null })), subject.seat);
  if (!plays) return t => ({ stage: 'none', plays: false, sentence: t >= 0 && t < end ? words : '' });
  const slot = slotsOf('hospital', roster).find(entry => entry.id === berthId);
  const rects = slotRects('hospital', roster, panel);
  const rect = rects.find(entry => entry.id === berthId);
  const pix = berthPixels(roster, panel, berthId);
  const art = section.querySelector('.v2-art');
  const caption = captionBox(section);
  // The subject where the snapshot has it: hidden while the film draws it at its own berth, or
  // marked away while the film draws it at the anchor's berth (never drawn in two places).
  const snapshot = [...app.querySelectorAll(`.v2-fig[data-seat="${subject.seat}"]`)];
  const after = outcome.after.find(seat => seat.seat === subject.seat);
  const ownBerth = after.room === 'hospital' && after.slot === berthId;
  // The berth's furniture is the room's art; the inset, the drone and its light are over the board.
  const furniture = new Set();
  const show = (node, on) => { if (on) { if (!node.isConnected) (furniture.has(node) ? art : section).append(node); } else node.remove(); };
  const box = (node, left, top, width, height) => Object.assign(node.style, { left: px(left), top: px(top), width: px(width), height: px(height) });
  const screen = el('img', { class: 'v2-med v2-med__screen', alt: '' });
  box(screen, pix.monitor.left, pix.monitor.top, pix.monitor.width, pix.monitor.height);
  const lamp = el('img', { class: 'v2-med v2-med__lamp', alt: '' });
  box(lamp, pix.lamp[0] - pix.lampSide / 2, pix.lamp[1] - pix.lampSide / 2, pix.lampSide, pix.lampSide);
  const bedLight = el('span', { class: 'v2-med v2-med__bedlight' });
  box(bedLight, pix.bedLight.center[0] - pix.bedLight.rx, pix.bedLight.center[1] - pix.bedLight.ry, 2 * pix.bedLight.rx, 2 * pix.bedLight.ry);
  for (const node of [screen, lamp, bedLight]) furniture.add(node);
  // A subject drawn away from its snapshot place carries its name tag to the berth for the film; a
  // detained subject keeps the neutral detention tag on the berth's plate (both public, from the snapshot).
  const nameTag = ownBerth ? null : drawTag(subject, rect, panel);
  const detention = after.jailed ? tagGroup({ tag: null, detention: true }) : null;
  // The vitals inset and the drone: never over a press area another seat holds in the snapshot,
  // nor over the caption (insetBox(), droneFit()).
  const held = outcome.after.filter(seat => seat.room === 'hospital' && seat.slot !== berthId).map(seat => rects.find(entry => entry.id === seat.slot)).map(r => ({ left: r.left, top: r.top, width: r.side, height: r.side }));
  const place = insetBox({ rect, panel, width: Math.max(60, Math.min(84, Math.round(panel.width * 0.42))), caption, keepClear: held });
  const inset = place ? el('div', { class: 'v2-med v2-med__inset', 'data-place': place.place }) : null;
  if (inset) box(inset, place.left, place.top, place.width, place.height);
  const fit = droneFit({ kit: pix.kit, frame: pix.frame, keepClear: [...(caption ? [{ left: caption.left - LABEL_MARGIN, top: caption.top - LABEL_MARGIN, width: caption.width + 2 * LABEL_MARGIN, height: caption.height + 2 * LABEL_MARGIN }] : []), ...held] });
  const droneWidth = pix.droneWidth * fit;
  const droneHeight = (droneWidth * DRONE.h) / DRONE.w;
  const drone = el('img', { class: 'v2-med v2-med__drone', alt: '' });
  const scan = el('img', { class: 'v2-med v2-med__scan', alt: '', src: `${ART}/scan-line.svg` });
  const scanWidth = pix.kit.bed.w * pix.frame.k * 1.15;
  const hologram = el('img', { class: 'v2-med v2-med__hologram', alt: '', src: `${ART}/hologram.svg` });
  const pulse = el('img', { class: 'v2-med v2-med__pulse', alt: '' });
  const pulseSide = droneWidth * 0.9;
  // Every node the film adds says so, so that nothing it drew outlives it.
  const parts = [screen, lamp, bedLight, inset, drone, scan, hologram, pulse, nameTag, detention].filter(Boolean);
  for (const node of parts) node.dataset.film = film;
  let figures = [];
  let pose = null;
  const drawPose = next => {
    if (pose === next) return;
    for (const node of figures) node.remove();
    const gesture = next === 'healthy' ? 'bedSitting' : slot.gesture;
    const health = next === 'still' ? 'Eliminated' : next === 'injured' ? 'Injured' : 'Healthy';
    figures = drawFigure('hospital', poseSlot(slot, gesture), { ...subject, room: 'hospital', slot: berthId, health }, pix.frame);
    for (const node of figures) { node.dataset.film = film; art.append(node); }
    pose = next;
  };
  return function apply(t) {
    const frame = film === 'rescue' ? rescueFrame(t, berthId, { reduced, fit }) : flatlineFrame(t, { reduced });
    const live = t >= 0 && t < end;
    for (const node of snapshot) {
      node.classList.toggle('v2-fig--away', live && !ownBerth);
      node.style.visibility = live && ownBerth ? 'hidden' : '';
    }
    for (const tag of [nameTag, detention].filter(Boolean)) {
      show(tag, live);
      if (live && tag === detention) placeTag(tag, rect, panel, roster);
    }
    if (!live) {
      for (const node of [...figures, ...parts]) node.remove();
      figures = []; pose = null;
      art.style.filter = '';
      return { ...frame, plays: true, sentence: '' };
    }
    drawPose(frame.patient.pose);
    const [dx, dy] = frame.patient.offset;
    for (const node of figures) node.style.translate = dx || dy ? `${dx}px ${dy}px` : '';
    // The berth's own monitor and lamp, and its bed light.
    const screenKind = frame.inset.kind === 'off' ? null : frame.inset.kind;
    show(screen, Boolean(screenKind));
    if (screenKind) screen.src = `${ART}/berth-screen-${screenKind}.svg`;
    const lampState = frame.lamp.state === 'dark' ? 'off' : frame.lamp.state;
    show(lamp, true);
    lamp.src = `${ART}/lamp-${lampState}.svg`;
    lamp.style.opacity = String(lampState === 'off' ? 1 : frame.lamp.opacity);
    show(bedLight, (frame.bedLight ?? 0) > 0);
    bedLight.style.opacity = String(frame.bedLight ?? 0);
    // The vitals inset: the berth's monitor large, for the film's length, where insetBox() found room.
    if (inset) {
      show(inset, frame.inset.opacity > 0);
      if (frame.inset.opacity > 0) {
        inset.innerHTML = vitalsInsetSvg(frame.inset.kind, { sweep: frame.inset.sweep, dot: frame.inset.dot ?? 0 });
        inset.style.opacity = String(frame.inset.opacity);
        inset.style.transform = `scale(${frame.inset.scale})`;
      }
    }
    if (film === 'rescue') {
      const at = frame.drone.at ? pix.at(frame.drone.at) : null;
      show(drone, Boolean(at));
      if (at) {
        drone.src = `${ART}/drone-${frame.drone.frame}.svg`;
        box(drone, at[0] - (DRONE.lens[0] / DRONE.w) * droneWidth, at[1] - (DRONE.lens[1] / DRONE.h) * droneHeight, droneWidth, droneHeight);
        drone.style.opacity = String(frame.drone.opacity);
      }
      show(scan, frame.scan.opacity > 0);
      if (frame.scan.opacity > 0) {
        const [sx, sy] = pix.at([pix.kit.c, pix.kit.bed.y + pix.kit.bed.h * 0.7 * frame.scan.y]);
        box(scan, sx - scanWidth / 2, sy - (scanWidth * 16) / 140 / 2, scanWidth, (scanWidth * 16) / 140);
      }
      show(hologram, frame.hologram.opacity > 0);
      if (frame.hologram.opacity > 0) {
        const side = droneWidth * 0.55;
        box(hologram, pix.chest[0] - side / 2, pix.chest[1] - side * 0.75, side, side);
        hologram.style.opacity = String(frame.hologram.opacity);
      }
      show(pulse, frame.pulse.frame > 0);
      if (frame.pulse.frame) {
        pulse.src = `${ART}/pulse-${frame.pulse.frame}.svg`;
        box(pulse, pix.chest[0] - pulseSide / 2, pix.chest[1] - pulseSide / 2, pulseSide, pulseSide);
        Object.assign(pulse.style, { transform: `scale(${frame.pulse.scale})`, opacity: String(frame.pulse.opacity) });
      }
    } else {
      // The Hospital's light dips, its art only: never its press areas, tags or caption.
      art.style.filter = frame.room < 1 ? `brightness(${frame.room})` : '';
    }
    return { ...frame, plays: true, sentence: frame.announce ? words : '' };
  };
}

/** The ?film=critical|rescue|flatline review page, over the board page.js has drawn. */
export function mountMedical({ app, board, roster, seats, params, drawFigure, drawTag }) {
  const film = params.get('film');
  const reduced = params.get('motion') === 'reduced';
  const round = Number(params.get('round') ?? 3);
  document.documentElement.dataset.film = film;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const section = app.querySelector('.v2-room[data-room="hospital"]');
  const panel = board.panels.hospital;
  const rects = new Map(slotRects('hospital', roster, panel).map(rect => [rect.id, rect]));
  const live = el('p', { class: 'v2-sr', 'aria-live': 'polite', 'data-live': 'public' });
  app.append(live);
  const top = app.querySelector('.v2-top');
  top.querySelector('.v2-top__label').replaceWith(el('span', { class: 'v2-top__phase' }, film === 'critical' ? `Round ${round}` : `Round ${round}: results`));
  const outcome = film === 'critical' ? null : medicalOutcome(outcomeName(params), roster);
  // Every Hospital occupant's berth state, from the snapshot's public facts.
  const withMedical = medicalSeats(seats, { round });
  const patients = withMedical.filter(seat => seat.location === 'Hospital');
  const berths = patients.map(seat => ({ seat, ...drawBerthState({ section, roster, panel, seat, rect: rects.get(seat.slotId) }) }));
  const entrySeat = params.has('entry') ? Number(params.get('entry')) : null;
  if (entrySeat !== null && !patients.some(seat => seat.seat === entrySeat && seat.health === 'Injured')) throw new Error(`entry=${entrySeat}: no Injured patient in the Hospital`);
  const filmApply = outcome ? mountClinicalFilm({ app, section, roster, panel, outcome, film, reduced, drawFigure, drawTag }) : null;
  const filmEnd = film === 'rescue' ? rescueEnd(reduced) : film === 'flatline' ? flatlineEnd(reduced) : 0;
  const plays = outcome ? filmBerth(outcome.anchor, roster, outcome.after.map(seat => ({ seat: seat.seat, slotId: seat.room === 'hospital' ? seat.slot : null })), outcome.subject.seat) : null;
  const apply = t => {
    let frame = null;
    for (const berth of berths) {
      // A film's own berth is the film's while it plays.
      const owned = plays?.plays && plays.berth === berth.seat.slotId && t >= 0 && t < filmEnd;
      for (const node of berth.nodes) node.style.visibility = owned ? 'hidden' : '';
      if (berth.state.monitor !== 'unstable') continue;
      const entryT = berth.seat.seat === entrySeat ? t : null;
      const critical = criticalFrame(t, { reduced, entryT });
      for (const node of berth.nodes) {
        if (node.classList.contains('v2-med__lamp')) node.style.opacity = String(critical.lamp.on ? critical.lamp.opacity : 0);
        if (node.classList.contains('v2-med__screen')) node.src = `${ART}/berth-screen-${critical.monitor.kind === 'boot' ? 'boot' : 'unstable'}.svg`;
        if (node.classList.contains('v2-medtag')) Object.assign(node.style, { opacity: String(critical.tag.opacity), transform: critical.tag.scale === 1 ? '' : `scale(${critical.tag.scale})` });
      }
      for (const figure of app.querySelectorAll(`.v2-fig[data-seat="${berth.seat.seat}"]:not([data-film])`)) {
        figure.style.translate = critical.breath ? `0 ${critical.breath}px` : '';
        figure.style.opacity = critical.figure.opacity < 1 ? String(critical.figure.opacity) : '';
      }
      if (berth.seat.seat === entrySeat) frame = critical;
    }
    if (filmApply) frame = filmApply(t);
    const sentence = frame?.sentence ?? '';
    if (live.textContent !== sentence) live.textContent = sentence;
    document.documentElement.dataset.stage = frame?.stage ?? (film === 'critical' ? 'critical' : 'none');
    return frame;
  };
  if (params.get('play') === '1') {
    const start = performance.now();
    const length = film === 'critical' ? 4800 : filmEnd + 900;
    const tick = now => { apply((now - start) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__medicalFrame = apply(Number(params.get('t') ?? (film === 'critical' ? 1200 : film === 'flatline' ? 2000 : 2600)));
  }
}

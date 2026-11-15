// The room scene: the room surface of the phone's room view, as the phone pack draws it (sheets 20–24
// the rooms, 30 the Blackout, 45 the room art unavailable, 55 the ambient motion). Runtime source,
// Designer's (the owner, 14 and 15 November 2026: Designer builds each visual component once, in
// design/; the game and the preview use it as it is). Frontend mounts it in the space between the app's
// bars, gives it the public view of the room, and connects its intents to the game.
//
// What it draws: the room's approved pictures (room-art.mjs), the ambient layer over the back picture
// (ambient.mjs), the people present as the game's own crew figures (crew-runtime.mjs, with their idle
// motion and the match's art pins), their name tags, the turn mark, the offered targets and empty
// positions, the room's name, its own control ("Windows · 2") and the stale veil or concealing cover.
// How it frames: framing.mjs's phoneFrame, the owner's T1 decision of 11 November 2026 as corrected in
// #229: the room fills the space, nobody present is cut off, and the frame is held through the Blackout.
//
// What it never does: decide who may act, spend anything, resolve anything or advance the game. Its
// callbacks report a tap; Frontend checks the current offer and sends the command. It reads no role,
// team or private fact, and nothing it loads depends on one: every picture is the same for every phone.

import { sceneOf, slotsOf, LOCATION_OF } from '../../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { FRAME } from '../../../../apps/game/hosted/scene-drawing/body.mjs';
import { INJURED, skeletonOf } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { crewFigureSvg, crewPortraitVariable, disposeCrewMounts, outfitFor, paintCrewFigure, releaseCrewFigure,
  setCrewMountActivity, setCrewMountMotion } from '../../../../apps/game/hosted/crew-runtime.mjs';
import { iconSvg } from '../icons.mjs';
import { SKY_EPOCH, ambientLayer } from './ambient.mjs';
import { clamp, phoneFrame, pressRects } from './framing.mjs';
import { roomLayers } from './room-art.mjs';

export const ROOM_SCENE_VERSION = 'room-scene-0.1.0';
export const ROOM_NAMES = Object.freeze({ 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' });
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const [bx, by, box] = FRAME.box;
const [ax, ay] = FRAME.anchor;

/** Every input, with its default. `size` is the measured space between the app's bars, in CSS pixels. */
export const ROOM_SCENE_DEFAULTS = Object.freeze({
  room: 'room-a', roster: 9,
  size: Object.freeze({ width: 390, height: 640 }),
  // The room's name sits in the top inset; the bottom one keeps the last press area off the tab bar.
  insets: Object.freeze({ top: 46, bottom: 8 }),
  people: Object.freeze([]), self: null, active: null,
  lighting: 'lit', hold: false,
  targets: null, control: null,
  status: 'live', artReady: true,
  clock: null, reducedMotion: false, interactive: true,
  versions: null, label: true,
});

const sameSeat = (a, b) => a !== null && a !== undefined && String(a) === String(b);
/** The number on a person's tag: `number`, or the digits at the end of the seat's id ("seat-4" → 4). */
export const seatNumber = person => person.number ?? (typeof person.seat === 'number' ? person.seat : Number(String(person.seat).match(/\d+$/)?.[0] ?? NaN));

function normalise(previous, input) {
  const next = { ...previous, ...input };
  if (!ROOM_NAMES[next.room]) throw new TypeError(`Unknown room ${JSON.stringify(next.room)}`);
  if (![7, 8, 9].includes(next.roster)) throw new TypeError(`A roster is 7, 8 or 9 players, not ${JSON.stringify(next.roster)}`);
  const { width, height } = next.size ?? {};
  if (!(width > 0 && height > 0)) throw new TypeError('A room scene needs a positive size');
  if (!['lit', 'dark'].includes(next.lighting)) throw new TypeError(`Lighting is lit or dark, not ${JSON.stringify(next.lighting)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('A clock is null or has now()');
  next.size = { width, height };
  next.insets = { ...ROOM_SCENE_DEFAULTS.insets, ...(next.insets ?? {}) };
  next.people = [...(next.people ?? [])];
  return next;
}

/** The place each person stands in, from the room's own table; a person at an unknown place is not drawn. */
function placed(state) {
  const places = new Map(slotsOf(state.room, state.roster).map(slot => [slot.id, slot]));
  return state.people.map(person => ({ person, slot: places.get(person.slot) })).filter(p => p.slot);
}

/**
 * The scene's frame ({ k, tx, ty }): the room's picture scaled by k and moved by (tx, ty) in the panel.
 * Lit, phoneFrame frames who the lit room shows. Held (Blackout, `hold` or lights out), it keeps the
 * previous frame of the same room, roster and size, so no press area moves. Entered in the dark with no
 * frame to keep, it frames the people given (Frontend's public pre-Blackout board) or, without them,
 * every place as if occupied: the opened-in-the-dark fallback, which depends only on the room and the phone.
 */
export function roomSceneFrame(state, previous = null) {
  const panel = { width: state.size.width, height: state.size.height, cap: state.insets.top, pad: state.insets.bottom };
  const key = JSON.stringify([state.room, state.roster, panel]);
  const holding = state.hold || state.lighting === 'dark';
  if (holding && previous?.key === key) return { ...previous, held: true };
  const scene = sceneOf(state.room, state.roster);
  const people = placed(state).map(({ person, slot }) => ({ ...slot, eliminated: person.health === 'Eliminated' }));
  const cold = state.lighting === 'dark' && !people.length;
  const shown = cold ? slotsOf(state.room, state.roster).map(slot => ({ ...slot, eliminated: false })) : people;
  return { ...phoneFrame(scene, panel, shown), key, panel, held: false, cold };
}

/** The press square of each place in a frame: what a tap on a person or a position uses. */
export function roomScenePlaces(state, frame) {
  return pressRects(state.room, state.roster, frame.panel, frame);
}

export function mountRoomScene(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A room scene needs a host element');
  const doc = host.ownerDocument;
  const el = (tag, className, attrs = {}) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const root = el('div', 'ms-room-scene', { role: 'group' });
  const layers = el('div', 'ms-rs-layers', { 'aria-hidden': 'true' });
  const crowd = el('div', 'ms-rs-people');
  const over = el('div', 'ms-rs-over');
  root.append(layers, crowd, over);
  host.append(root);

  let state = normalise(ROOM_SCENE_DEFAULTS, input);
  let frame = null, layersKey = null, suspended = false, disposed = false, seq = 0;
  const people = new Map();
  const on = { onSeat: handlers.onSeat ?? null, onSlot: handlers.onSlot ?? null, onControl: handlers.onControl ?? null };

  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || target.disabled || !accepting()) return;
    const { intent, value } = target.dataset;
    if (intent === 'seat') on.onSeat?.(state.people.find(p => String(p.seat) === value)?.seat ?? value);
    else if (intent === 'slot') on.onSlot?.(value);
    else if (intent === 'control') on.onControl?.(value);
  };
  root.addEventListener('click', onClick);
  const accepting = () => !disposed && state.interactive && state.status === 'live';

  function release(entry) {
    for (const node of [entry.body, entry.front]) if (node) releaseCrewFigure(root, node);
    entry.group.remove();
  }
  function clearPeople() {
    for (const entry of people.values()) release(entry);
    people.clear();
  }

  function paintLayers() {
    const key = JSON.stringify([state.room, state.lighting, frame.k, frame.tx, frame.ty, state.artReady]);
    if (key === layersKey) return;
    layersKey = key;
    layers.replaceChildren();
    if (!state.artReady) return;
    const dark = state.lighting === 'dark';
    for (const layer of roomLayers(state.room, { dark })) {
      const art = el('span', 'ms-rs-art');
      art.dataset.layer = layer.id;
      Object.assign(art.style, { left: `${frame.tx}px`, top: `${frame.ty}px`, width: `${1024 * frame.k}px`, height: `${768 * frame.k}px`,
        backgroundImage: `var(${layer.property})`, zIndex: String(2 * Math.round(layer.depth) + 1) });
      layers.append(art);
    }
    const ambient = ambientLayer(state.room, frame, { dark });
    if (ambient) layers.append(ambient);
  }

  /** The ambient layer runs on the ship's one clock; held still when it should not move. */
  function settle() {
    const live = !suspended && state.status === 'live' && !state.reducedMotion && state.clock !== null;
    const ms = state.clock ? state.clock.now() - SKY_EPOCH : 0;
    for (const svg of layers.querySelectorAll('svg.amb')) {
      for (const animation of svg.getAnimations?.({ subtree: true }) ?? []) {
        animation.currentTime = ms;
        if (live) animation.play(); else animation.pause();
      }
    }
    setCrewMountMotion(root, state.reducedMotion);
    setCrewMountActivity(root, !suspended && state.status === 'live');
  }

  function figure(entry, person, slot) {
    const dead = person.health === 'Eliminated';
    const gesture = dead ? slot.down : person.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
    const sk = skeletonOf(gesture);
    const outfit = outfitFor(LOCATION_OF[state.room]);
    const unit = slot.scale * frame.k;
    const place = { left: `${frame.tx + slot.at[0] * frame.k - (ax - bx) * unit}px`, top: `${frame.ty + slot.at[1] * frame.k - (ay - by) * unit}px`,
      width: `${box * unit}px`, height: `${box * unit}px` };
    for (const layer of ['body', 'front']) {
      let node = entry[layer];
      if (layer === 'front' && !sk.front?.length) {
        if (node) { releaseCrewFigure(root, node); node.remove(); entry.front = null; }
        continue;
      }
      if (!node) {
        node = el('span', 'ms-rs-fig', { 'aria-hidden': 'true' });
        node.dataset.part = layer;
        entry.group.append(node);
        entry[layer] = node;
      }
      const drawn = paintCrewFigure(root, node, state.versions, person.character, sk, { outfit, layer, gesture, still: dead,
        seat: seatNumber(person), point: [sk.head[0] + slot.at[0] / slot.scale, sk.head[1] + slot.at[1] / slot.scale],
        mirror: slot.mirror, cacheTemplate: gesture === slot.gesture });
      if (!drawn) {
        // A match pinned before the crew release: the crew it was drawn with, still.
        const key = JSON.stringify([person.character, outfit, gesture, layer]);
        if (node.dataset.figure !== key) {
          node.innerHTML = crewFigureSvg(person.character, sk, { versions: state.versions, outfit, layer, prefix: `rs${++seq}-${layer}` }) ?? '';
          node.dataset.figure = key;
        }
      }
      Object.assign(node.style, place, { zIndex: String(layer === 'body' ? 2 * Math.round(slot.depth) : 1500 + Math.round(slot.depth)),
        transform: slot.mirror ? 'scaleX(-1)' : '', transformOrigin: `${((ax - bx) / box) * 100}% 0` });
      node.toggleAttribute('data-elim', dead);
    }
  }

  function tag(entry, person, rect, dim) {
    const { width, height } = state.size, pad = state.insets.bottom;
    let node = entry.tag;
    if (!node) { node = el('span', 'ms-rs-tag'); entry.group.append(node); entry.tag = node; }
    const self = sameSeat(state.self, person.seat);
    const status = person.health === 'Injured' ? '· Injured' : person.health === 'Eliminated' ? '· Out' : '';
    const office = person.office === 'captain' || person.office === 'officer' ? person.office : null;
    const content = JSON.stringify([seatNumber(person), self ? 'You' : person.name, status, office]);
    if (node.dataset.content !== content) {
      node.replaceChildren();
      const num = el('b', 'ms-rs-tag__num');
      num.textContent = String(seatNumber(person));
      node.append(num);
      if (office) {
        const badge = el('i', 'ms-rs-tag__office', { title: office === 'captain' ? 'Captain' : 'Officer' });
        badge.innerHTML = iconSvg(office, { filled: true, className: 'ms-rs-ic' });
        node.append(badge);
      }
      const name = el('span', 'ms-rs-tag__name');
      name.textContent = self ? 'You' : person.name;
      node.append(name);
      if (status) { const s = el('span', 'ms-rs-tag__status'); s.textContent = status; node.append(s); }
      node.dataset.content = content;
    }
    node.toggleAttribute('data-self', self);
    node.toggleAttribute('data-active', sameSeat(state.active, person.seat));
    node.toggleAttribute('data-dim', dim);
    // A tag stays whole on screen: its centre moves inward by half its own width (4 px clear).
    const cx = rect.left + rect.side / 2, reach = node.offsetWidth ? node.offsetWidth / 2 + 4 : 36;
    Object.assign(node.style, { left: `${clamp(cx, reach, width - reach)}px`, top: `${Math.min(height - pad - 26, rect.top + rect.side - 2)}px` });
  }

  function marks(entry, person, slot, rect) {
    const active = sameSeat(state.active, person.seat);
    if (active) {
      if (!entry.turn) { entry.turn = el('span', 'ms-rs-turn', { 'aria-hidden': 'true' }); entry.turn.innerHTML = iconSvg('turn', { filled: true, className: 'ms-rs-ic' }); entry.group.append(entry.turn); }
      const headTop = frame.ty + (slot.at[1] - 250 * slot.scale) * frame.k;
      Object.assign(entry.turn.style, { left: `${rect.left + rect.side / 2}px`, top: `${Math.max(state.insets.top + 2, Math.min(rect.top - 30, headTop))}px` });
    } else if (entry.turn) { entry.turn.remove(); entry.turn = null; }
    const seats = state.targets?.seats ?? null;
    const target = !!seats?.some(seat => sameSeat(seat, person.seat));
    if (target) {
      if (!entry.press) {
        entry.press = el('button', 'ms-rs-press', { type: 'button' });
        entry.press.dataset.intent = 'seat';
        entry.group.append(entry.press);
      }
      const p = entry.press;
      p.dataset.value = String(person.seat);
      p.setAttribute('aria-label', `${sameSeat(state.self, person.seat) ? 'You' : person.name}, player ${seatNumber(person)}`);
      p.toggleAttribute('data-picked', !!state.targets?.picked?.some(seat => sameSeat(seat, person.seat)));
      p.disabled = !accepting();
      Object.assign(p.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` });
    } else if (entry.press) { entry.press.remove(); entry.press = null; }
  }

  function paintPeople(rects) {
    const shown = state.status === 'concealed' || state.lighting === 'dark' || !state.artReady ? [] : placed(state);
    const keep = new Set(shown.map(({ person }) => String(person.seat)));
    for (const [seat, entry] of people) if (!keep.has(seat)) { release(entry); people.delete(seat); }
    const seats = state.targets?.seats ?? null;
    for (const { person, slot } of shown) {
      const id = String(person.seat);
      let entry = people.get(id);
      if (!entry) {
        entry = { group: el('div', 'ms-rs-person'), body: null, front: null, tag: null, turn: null, press: null };
        crowd.append(entry.group);
        people.set(id, entry);
      }
      entry.group.dataset.seat = id;
      const rect = rects.get(slot.id);
      const dim = !!seats?.length && !seats.some(seat => sameSeat(seat, person.seat));
      figure(entry, person, slot);
      for (const node of [entry.body, entry.front]) node?.toggleAttribute('data-dim', dim);
      tag(entry, person, rect, dim);
      marks(entry, person, slot, rect);
    }
  }

  function paintOver(rects) {
    over.replaceChildren();
    if (state.status === 'concealed') {
      over.append(el('div', 'ms-rs-cover'));
      return;
    }
    if (state.label !== false) {
      const label = el('div', 'ms-rs-label');
      const text = el('span', 'ms-rs-label__text');
      text.textContent = ROOM_NAMES[state.room];
      label.append(text);
      over.append(label);
    }
    if (!state.artReady) paintUnavailable();
    for (const id of state.targets?.slots ?? []) {
      const r = rects.get(id);
      if (!r) continue;
      const mark = el('button', 'ms-rs-slot', { type: 'button', 'aria-label': `Position ${id}` });
      mark.dataset.intent = 'slot';
      mark.dataset.value = id;
      const picked = state.targets.picked === id || (Array.isArray(state.targets.picked) && state.targets.picked.includes(id));
      mark.toggleAttribute('data-picked', picked);
      if (state.targets.icon !== false) mark.innerHTML = iconSvg(state.targets.icon ?? 'position', { filled: picked, className: 'ms-rs-ic' });
      mark.disabled = !accepting();
      Object.assign(mark.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.side}px`, height: `${r.side}px` });
      over.append(mark);
    }
    // The room's own control, lit and current only: a button ("Windows · 2"), or a status pill (the Jail's
    // "Detained · you can still vote"). While reconnecting the pack shows none.
    if (state.control && state.lighting === 'lit' && state.status === 'live') {
      const c = state.control, status = c.kind === 'status';
      const control = el(status ? 'span' : 'button', 'ms-rs-control', status ? {} : { type: 'button' });
      control.dataset.kind = status ? 'status' : 'button';
      if (!status) { control.dataset.intent = 'control'; control.dataset.value = String(c.id ?? ''); }
      control.innerHTML = c.icon ? iconSvg(c.icon, { filled: true, className: 'ms-rs-ic' }) : '';
      const label = el('span');
      label.textContent = c.label;
      control.append(label);
      if (!status) control.disabled = c.enabled === false || !accepting();
      over.append(control);
    }
    if (state.status === 'stale') over.append(el('div', 'ms-rs-veil'));
  }

  /** Sheet 45, the room picture unavailable: who is here and where, as portraits; positions and controls still work. */
  function paintUnavailable() {
    const notice = el('div', 'ms-rs-notice', { role: 'status' });
    notice.innerHTML = iconSvg('warning', { filled: true, className: 'ms-rs-ic' });
    const words = el('span');
    const title = el('b');
    title.textContent = 'Room picture unavailable';
    const sub = el('small');
    sub.textContent = 'Positions and controls still work';
    words.append(title, sub);
    notice.append(words);
    over.append(notice);
    if (state.lighting === 'dark') return;
    const grid = el('div', 'ms-rs-cards');
    const seats = state.targets?.seats ?? null;
    for (const { person, slot } of placed(state)) {
      const target = !!seats?.some(seat => sameSeat(seat, person.seat));
      const card = el(target ? 'button' : 'div', 'ms-rs-card');
      if (target) {
        card.type = 'button';
        card.dataset.intent = 'seat';
        card.dataset.value = String(person.seat);
        card.disabled = !accepting();
        card.toggleAttribute('data-picked', !!state.targets?.picked?.some(seat => sameSeat(seat, person.seat)));
      }
      const face = el('span', 'ms-rs-card__face', { 'aria-hidden': 'true' });
      face.style.backgroundImage = crewPortraitVariable(person.character, state.versions);
      const name = el('span', 'ms-rs-card__name');
      const num = el('b', 'ms-rs-tag__num');
      num.textContent = String(seatNumber(person));
      const text = el('span');
      text.textContent = `${sameSeat(state.self, person.seat) ? 'You' : person.name}${person.health === 'Injured' ? ' · Injured' : person.health === 'Eliminated' ? ' · Out' : ''}`;
      name.append(num, text);
      const where = el('small', 'ms-rs-card__place');
      where.textContent = slot.id;
      card.append(face, name, where);
      grid.append(card);
    }
    over.append(grid);
  }

  function render() {
    if (disposed) return;
    const { width, height } = state.size;
    Object.assign(root.style, { width: `${width}px`, height: `${height}px` });
    root.dataset.room = state.room;
    root.dataset.lighting = state.lighting;
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    root.setAttribute('aria-label', ROOM_NAMES[state.room]);
    root.toggleAttribute('data-unavailable', !state.artReady);
    crowd.toggleAttribute('inert', state.status === 'concealed');
    frame = roomSceneFrame(state, frame);
    if (state.status === 'concealed') {
      layers.replaceChildren();
      layersKey = null;
      clearPeople();
      paintOver(new Map());
      settle();
      return;
    }
    const rects = new Map(roomScenePlaces(state, frame).map(r => [r.id, r]));
    paintLayers();
    paintPeople(rects);
    paintOver(rects);
    settle();
  }

  function update(next = {}) {
    if (disposed) return;
    state = normalise(state, next);
    render();
  }
  function suspend() { if (disposed) return; suspended = true; settle(); }
  function resume() { if (disposed) return; suspended = false; settle(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    clearPeople();
    disposeCrewMounts(root);
    root.remove();
  }
  /** Where the scene is: its frame and each place's and person's press square, in the host's CSS pixels. */
  function layout() {
    const places = roomScenePlaces(state, frame).map(({ id, left, top, side }) => ({ slot: id, left, top, side }));
    const bySlot = new Map(places.map(p => [p.slot, p]));
    return {
      frame: { k: frame.k, tx: frame.tx, ty: frame.ty, held: frame.held, cold: frame.cold },
      places,
      people: placed(state).map(({ person, slot }) => ({ seat: person.seat, ...bySlot.get(slot.id) })),
    };
  }

  render();
  return Object.freeze({ update, suspend, resume, dispose, layout, element: root });
}

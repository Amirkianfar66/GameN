// The room scene: the room surface of the phone's room view, as the phone pack draws it (sheets 20–24
// the rooms, 30 the Blackout, 45 the room art unavailable, 55 the ambient motion). Runtime source,
// Designer's (the owner, 14 and 15 November 2026: Designer builds each visual component once, in
// design/; the game and the preview use it as it is). Frontend mounts it in the space between the app's
// bars, gives it the room's view for this phone, and connects its intents to the game.
//
// What it draws: the room's approved pictures (room-art.mjs), the ambient layer over the back picture
// (ambient.mjs), the people present as the game's own crew figures (crew-runtime.mjs, with their idle
// motion and the match's art pins), their name tags, the turn mark, the offered targets and empty
// positions, the room's name, its own control ("Windows · 2") and the stale veil or concealing cover.
// The tags are whole and apart at every text size (#222 item 34): each pill grows with its words, and
// tag-layout.mjs places them as the board's tags are placed, clear of the room's name and control.
// How it frames: framing.mjs's phoneFrame, the owner's T1 decision of 11 November 2026 as corrected in
// #229: the room fills the space, nobody present is cut off, and the frame is held through the Blackout.
//
// What it never does: decide who may act, spend anything, resolve anything or advance the game. Its
// callbacks report a tap; Frontend checks the current offer and sends the command. The room, its art and
// who is in it are the public board. The offers (`targets`) and the room's control are this viewer's
// own: the component drops them when it is concealed or its viewer changes, and nothing it loads ever
// depends on them, or on a role or team: every picture is the same for every phone.

import { sceneOf, slotsOf, LOCATION_OF } from '../../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { FRAME } from '../../../../apps/game/hosted/scene-drawing/body.mjs';
import { INJURED, skeletonOf } from '../../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { crewFigureSvg, crewPortraitVariable, disposeCrewMounts, outfitFor, paintCrewFigure, releaseCrewFigure,
  setCrewMountActivity, setCrewMountMotion } from '../../../../apps/game/hosted/crew-runtime.mjs';
import { iconSvg } from '../icons.mjs';
import { layoutTags } from '../tag-layout.mjs';
import { SKY_EPOCH, ambientLayer } from './ambient.mjs';
import { phoneFrame, pressRects } from './framing.mjs';
import { roomLayers } from './room-art.mjs';
import { REACH, extensionLayer, zoomFor } from './room-extension.mjs';

export const ROOM_SCENE_VERSION = 'room-scene-0.5.0';
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
  lighting: 'lit', hold: null,
  targets: null, control: null,
  status: 'live', artReady: true,
  clock: null, reducedMotion: false, interactive: true,
  versions: null, label: true,
  // The room-art release the match's bundles carry: room-drawing-1.0.0 frames a fifth wider, with the
  // room's extension (room-extension.mjs); anything else, or null, keeps the pack's framing (#229).
  roomArt: null,
  // The game's films that draw a person themselves (a patient, a walk, a release): those people keep
  // their tag, turn mark and press square here, and their figure is not drawn. Seats, as in `people`.
  standIns: Object.freeze([]),
  // A person's recoil ("ATTACK BLOCKED"): { seat, dx, dy } moves that figure by dx, dy CSS pixels; its
  // tag and press square stay. null for none.
  brace: null,
});

const sameSeat = (a, b) => a !== null && a !== undefined && String(a) === String(b);
/** The number on a person's tag: `number`, or the digits at the end of the seat's id ("seat-4" → 4). */
export const seatNumber = person => person.number ?? (typeof person.seat === 'number' ? person.seat : Number(String(person.seat).match(/\d+$/)?.[0] ?? NaN));

/**
 * The next input from the previous one and an update. The offers and the room's control belong to this
 * viewer: they are dropped while the scene is concealed (never kept for when it shows again), and when
 * the viewer (`self`) changes, unless the same update gives the new viewer's own.
 */
export function nextRoomSceneInput(previous, input) {
  const next = { ...previous, ...input };
  if (!ROOM_NAMES[next.room]) throw new TypeError(`Unknown room ${JSON.stringify(next.room)}`);
  if (![7, 8, 9].includes(next.roster)) throw new TypeError(`A roster is 7, 8 or 9 players, not ${JSON.stringify(next.roster)}`);
  const { width, height } = next.size ?? {};
  if (!(width > 0 && height > 0)) throw new TypeError('A room scene needs a positive size');
  if (!['lit', 'dark'].includes(next.lighting)) throw new TypeError(`Lighting is lit or dark, not ${JSON.stringify(next.lighting)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('A clock is null or has now()');
  if (next.hold !== null && next.hold !== false && next.hold !== true && typeof next.hold !== 'string') throw new TypeError('hold is a Blackout window\'s id, true, or null');
  if (next.roomArt !== null && typeof next.roomArt !== 'string') throw new TypeError('roomArt is a room-art release, or null');
  const standIns = next.standIns ?? [];
  if (!Array.isArray(standIns)) throw new TypeError('standIns is a list of seats');
  const brace = next.brace ?? null;
  if (brace !== null && !(brace.seat !== null && brace.seat !== undefined && Number.isFinite(brace.dx) && Number.isFinite(brace.dy))) {
    throw new TypeError('brace is { seat, dx, dy } in CSS pixels, or null');
  }
  next.standIns = [...standIns];
  next.brace = brace === null ? null : { seat: brace.seat, dx: brace.dx, dy: brace.dy };
  next.size = { width, height };
  next.insets = { ...ROOM_SCENE_DEFAULTS.insets, ...(next.insets ?? {}) };
  next.people = [...(next.people ?? [])];
  const viewerChanged = 'self' in input && !(previous.self === input.self || sameSeat(previous.self, input.self));
  if (next.status === 'concealed') { next.targets = null; next.control = null; }
  else if (viewerChanged) {
    if (!('targets' in input)) next.targets = null;
    if (!('control' in input)) next.control = null;
  }
  return next;
}

/** The place each person stands in, from the room's own table; a person at an unknown place is not drawn. */
function placed(state) {
  const places = new Map(slotsOf(state.room, state.roster).map(slot => [slot.id, slot]));
  return state.people.map(person => ({ person, slot: places.get(person.slot) })).filter(p => p.slot);
}

/** The hold's window: a Blackout window's id, `true` for one Frontend does not name, or null for none. */
const holdWindow = hold => (hold === true ? true : typeof hold === 'string' && hold ? hold : null);
/** Two holds are different windows only when both are named and the names differ. */
const sameWindow = (a, b) => a === null || b === null || a === true || b === true || a === b;

/**
 * The scene's frame: the room's picture scaled by k and moved by (tx, ty) in its panel, with that panel.
 * Lit and not held, phoneFrame frames who the lit room shows in the current size.
 * A hold (a Blackout window in `hold`, or the lights out) keeps one frame, and the panel it was made for,
 * whatever the size, the insets, the people or the lights do, so no press square moves for the whole
 * window: its lit seconds and its dark ones. A hold that begins lit frames the room as it is then; one
 * that begins in the dark keeps the last lit frame. The hold ends, and the room is framed again in the
 * current size, when the window ends (`hold` cleared with the lights on) or a differently named window
 * begins; a different room or roster frames afresh. Entered in the dark with no frame to keep, it frames
 * the people given (Frontend's public pre-Blackout board) or, without them, every place as if occupied:
 * the opened-in-the-dark fallback, which depends only on the room and the phone.
 */
export function roomSceneFrame(state, previous = null) {
  const panel = { width: state.size.width, height: state.size.height, cap: state.insets.top, pad: state.insets.bottom };
  // The owner's "a fifth wider" with the approved room pictures; the pack's framing with older art.
  const zoom = zoomFor(state.roomArt);
  const context = JSON.stringify([state.room, state.roster, zoom]);
  const window = holdWindow(state.hold);
  const dark = state.lighting === 'dark';
  const holding = window !== null || dark;
  const prev = previous?.context === context ? previous : null;
  if (holding && prev && (prev.holding ? sameWindow(prev.window, window) : dark)) {
    return { ...prev, holding: true, held: true, window: typeof window === 'string' ? window : prev.window ?? window };
  }
  const scene = sceneOf(state.room, state.roster);
  const people = placed(state).map(({ person, slot }) => ({ ...slot, eliminated: person.health === 'Eliminated' }));
  const cold = dark && !people.length;
  const shown = cold ? slotsOf(state.room, state.roster).map(slot => ({ ...slot, eliminated: false })) : people;
  return { ...phoneFrame(scene, panel, shown, { zoom, reach: zoom < 1 ? REACH : 0 }), panel, context, zoom, holding, window, held: false, cold };
}

/** The press square of each place in a frame, in the frame's own panel: what a tap on a person or a position uses. */
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
  const root = el('div', 'ms-room-scene', { role: 'group', tabindex: '-1' });
  const layers = el('div', 'ms-rs-layers', { 'aria-hidden': 'true' });
  const crowd = el('div', 'ms-rs-people');
  const over = el('div', 'ms-rs-over');
  // The game's films (0.4.0): a container in the scene's own stacking context, like the others, so what
  // the game puts in it interleaves with the pictures and the people by z-index. See films below.
  const films = el('div', 'ms-rs-films', { 'aria-hidden': 'true' });
  root.append(layers, films, crowd, over);
  host.append(root);

  let state = nextRoomSceneInput(ROOM_SCENE_DEFAULTS, input);
  let frame = null, layersKey = null, suspended = false, disposed = false, seq = 0;
  // The ambient layer's time: running on the ship's clock, or held still at one sampled moment.
  let ambientLive = false, heldMs = null;
  const people = new Map();
  // The overlay's controls, kept by identity so a focused one survives every ordinary update.
  const overlay = { cover: null, label: null, notice: null, cards: null, cardsBySeat: new Map(), slots: new Map(), control: null, veil: null };
  const on = { onSeat: handlers.onSeat ?? null, onSlot: handlers.onSlot ?? null, onControl: handlers.onControl ?? null,
    onFocusReturn: handlers.onFocusReturn ?? null };

  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || target.getAttribute('aria-disabled') === 'true' || !accepting()) return;
    const { intent, value } = target.dataset;
    if (intent === 'seat') on.onSeat?.(state.people.find(p => String(p.seat) === value)?.seat ?? value);
    else if (intent === 'slot') on.onSlot?.(value);
    else if (intent === 'control') on.onControl?.(value);
  };
  root.addEventListener('click', onClick);
  const accepting = () => !disposed && state.interactive && state.status === 'live';
  // Not taking taps now (reconnecting, not interactive, a control turned off): announced as unavailable
  // and ignored, but still focusable, so an update never drops the focus from under the player.
  const unavailable = (node, off) => (off ? node.setAttribute('aria-disabled', 'true') : node.removeAttribute('aria-disabled'));

  /**
   * Removes a node. If it held the focus (an offer or control that ended), the focus moves to the scene
   * itself, and then onFocusReturn({ intent, value }) tells Frontend which one ended, so it can move the
   * focus on. That is the only time the component moves the focus.
   */
  function remove(node) {
    if (!node) return;
    const active = doc.activeElement;
    const focused = !!active && node.contains(active);
    const ended = focused ? active.closest?.('[data-intent]') : null;
    node.remove();
    if (!focused || disposed) return;
    root.focus({ preventScroll: true });
    const detail = ended ? { intent: ended.dataset.intent, value: ended.dataset.value } : null;
    // After the update has finished, and only if the focus is still on the scene.
    queueMicrotask(() => { if (!disposed && doc.activeElement === root) on.onFocusReturn?.(detail); });
  }
  function release(entry) {
    for (const node of [entry.body, entry.front]) if (node) releaseCrewFigure(root, node);
    remove(entry.group);
  }
  function clearPeople() {
    for (const entry of people.values()) release(entry);
    people.clear();
  }

  /** Builds the room's pictures and ambient layer when the room, the lights or the frame change; true if rebuilt. */
  function paintLayers() {
    const key = JSON.stringify([state.room, state.lighting, frame.k, frame.tx, frame.ty, frame.zoom, state.artReady]);
    if (key === layersKey) return false;
    layersKey = key;
    layers.replaceChildren();
    if (!state.artReady) return true;
    const dark = state.lighting === 'dark';
    for (const layer of roomLayers(state.room, { dark })) {
      const art = el('span', 'ms-rs-art');
      art.dataset.layer = layer.id;
      Object.assign(art.style, { left: `${frame.tx}px`, top: `${frame.ty}px`, width: `${1024 * frame.k}px`, height: `${768 * frame.k}px`,
        backgroundImage: `var(${layer.property})`, zIndex: String(2 * Math.round(layer.depth) + 1) });
      layers.append(art);
    }
    // A wider view shows past the picture: the room's extension continues its ceiling and deck there.
    if (frame.zoom < 1) {
      const ext = extensionLayer(state.room, { dark });
      const art = el('span', 'ms-rs-art');
      art.dataset.layer = ext.id;
      Object.assign(art.style, { left: `${frame.tx}px`, top: `${frame.ty - ext.reach * frame.k}px`, width: `${1024 * frame.k}px`,
        height: `${(768 + 2 * ext.reach) * frame.k}px`, backgroundImage: `var(${ext.property})`, zIndex: String(2 * ext.depth + 1) });
      layers.append(art);
    }
    const ambient = ambientLayer(state.room, frame, { dark });
    if (ambient) layers.append(ambient);
    return true;
  }

  const ambientAnimations = () => [...layers.querySelectorAll('svg.amb')].flatMap(svg => svg.getAnimations?.({ subtree: true }) ?? []);
  /**
   * Where the running voyage stands now (NaN when it is not running). Read before an update changes
   * anything, so the moment survives an update that also rebuilds the pictures (a new size, the lights).
   */
  const standingNow = () => (ambientLive ? Number(ambientAnimations()[0]?.currentTime) : NaN);

  /**
   * The ambient layer runs on the ship's one clock while the scene is current, in motion and has a trusted
   * clock: it is set to the clock when it starts running and when its pictures are rebuilt, and then left
   * to run. Otherwise it stands still at one moment, sampled once when it stops: where it stood (`standing`,
   * read before the update, so a rebuild in the same update cannot lose it), or, if it was not running,
   * the clock's moment; with no trusted clock ever given, 0 s. While it stands still no update moves it,
   * whatever the clock does or the pictures do; it goes back on the clock when it runs again.
   */
  function settle(rebuilt, standing = NaN) {
    // The device's Reduce motion counts as well as the game's: a play() here would override the CSS pause.
    const deviceReduced = !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const live = !suspended && state.status === 'live' && !state.reducedMotion && !deviceReduced && state.clock !== null;
    const animations = ambientAnimations();
    if (live) {
      if (!ambientLive || rebuilt) {
        const ms = state.clock.now() - SKY_EPOCH;
        for (const animation of animations) { animation.currentTime = ms; animation.play(); }
      }
      heldMs = null;
    } else {
      const stopping = ambientLive || heldMs === null;
      if (heldMs === null) {
        heldMs = Number.isFinite(standing) ? standing : state.clock ? state.clock.now() - SKY_EPOCH : 0;
      }
      if (stopping || rebuilt || animations.some(a => a.currentTime !== heldMs || a.playState !== 'paused')) {
        for (const animation of animations) { animation.currentTime = heldMs; animation.pause(); }
      }
    }
    ambientLive = live;
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
        entry.group.prepend(node);
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

  /** Stand-ins and the recoil, on each drawn figure: cheap enough for every frame of a film. */
  function figureMarks() {
    for (const [seat, entry] of people) {
      const standIn = state.standIns.some(s => sameSeat(s, seat));
      const braced = state.brace && sameSeat(state.brace.seat, seat) ? state.brace : null;
      for (const node of [entry.body, entry.front]) {
        if (!node) continue;
        node.toggleAttribute('data-stand-in', standIn);
        node.style.translate = braced ? `${braced.dx}px ${braced.dy}px` : '';
      }
    }
  }

  function tag(entry, person, rect, dim) {
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
    // Where it goes is placeTags()'s, once every tag, the room's name and its control are drawn.
    entry.at = { x: rect.left + rect.side / 2, bottom: rect.top + rect.side };
    entry.self = self;
  }

  /**
   * The tags whole on screen and apart (#222 item 34), by tag-layout.mjs's rules with the pack's room
   * numbers: centred on the press square and 2 px above its foot, 4 px inside the scene and no lower
   * than the bottom inset and a standard tag's height above its foot, clear of the room's name and its
   * control; where two would meet, one moves up, or else down, no further than it needs ("You" first).
   * At the standard text, where none meet, each is where the pack puts it. Offsets, not boxes on screen,
   * so a transform around the scene (the board's zoom) never moves a tag.
   */
  function placeTags() {
    const { width, height, pad: bottom } = frame.panel;
    const shown = [...people.values()].filter(entry => entry.tag && entry.at);
    if (!shown.length) return;
    const measured = shown.map(entry => ({ seat: entry.group.dataset.seat, at: entry.at, self: entry.self,
      width: entry.tag.offsetWidth || 72, height: entry.tag.offsetHeight || 26 }));
    const keepClear = [];
    const label = overlay.label;
    if (label?.offsetWidth) keepClear.push({ left: label.offsetLeft, top: label.offsetTop, width: label.offsetWidth, height: label.offsetHeight });
    const control = overlay.control;
    // The control is centred by a translateX(-50%): its box starts half its width left of its offset.
    if (control?.offsetWidth) keepClear.push({ left: control.offsetLeft - control.offsetWidth / 2, top: control.offsetTop, width: control.offsetWidth, height: control.offsetHeight });
    const { places } = layoutTags({ panel: { width, height }, pad: 4, gap: 2, lift: 2, footClear: bottom + 26, keepClear, tags: measured });
    const at = new Map(places.map(p => [String(p.seat), p]));
    shown.forEach((entry, i) => {
      const place = at.get(measured[i].seat);
      // The tag is centred on its left by a translateX(-50%), as the pack's.
      Object.assign(entry.tag.style, { left: `${place.left + measured[i].width / 2}px`, top: `${place.top}px` });
    });
  }

  function marks(entry, person, slot, rect) {
    const active = sameSeat(state.active, person.seat);
    if (active) {
      if (!entry.turn) { entry.turn = el('span', 'ms-rs-turn', { 'aria-hidden': 'true' }); entry.turn.innerHTML = iconSvg('turn', { filled: true, className: 'ms-rs-ic' }); entry.group.append(entry.turn); }
      const headTop = frame.ty + (slot.at[1] - 250 * slot.scale) * frame.k;
      Object.assign(entry.turn.style, { left: `${rect.left + rect.side / 2}px`, top: `${Math.max(frame.panel.cap + 2, Math.min(rect.top - 30, headTop))}px` });
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
      unavailable(p, !accepting());
      Object.assign(p.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.side}px`, height: `${rect.side}px` });
    } else if (entry.press) { remove(entry.press); entry.press = null; }
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

  /** One overlay node by name: made once, kept while wanted, removed (focus to the scene) when not. */
  function keep(name, wanted, make) {
    if (!wanted) { remove(overlay[name]); overlay[name] = null; return null; }
    if (!overlay[name]) { overlay[name] = make(); over.append(overlay[name]); }
    return overlay[name];
  }

  function paintOver(rects) {
    const concealed = state.status === 'concealed';
    keep('cover', concealed, () => el('div', 'ms-rs-cover'));
    const label = keep('label', !concealed && state.label !== false, () => {
      const node = el('div', 'ms-rs-label');
      node.append(el('span', 'ms-rs-label__text'));
      return node;
    });
    if (label) label.firstChild.textContent = ROOM_NAMES[state.room];
    paintUnavailable(!concealed && !state.artReady);
    // Offered empty positions, kept by their place.
    const wanted = concealed ? [] : (state.targets?.slots ?? []).filter(id => rects.has(id));
    for (const [id, node] of overlay.slots) if (!wanted.includes(id)) { remove(node); overlay.slots.delete(id); }
    for (const id of wanted) {
      let mark = overlay.slots.get(id);
      if (!mark) {
        mark = el('button', 'ms-rs-slot', { type: 'button', 'aria-label': `Position ${id}` });
        mark.dataset.intent = 'slot';
        mark.dataset.value = id;
        over.append(mark);
        overlay.slots.set(id, mark);
      }
      const picked = state.targets.picked === id || (Array.isArray(state.targets.picked) && state.targets.picked.includes(id));
      const iconKey = state.targets.icon === false ? '' : `${state.targets.icon ?? 'position'}${picked ? ':filled' : ''}`;
      if (mark.dataset.icon !== iconKey) {
        mark.innerHTML = iconKey ? iconSvg(state.targets.icon ?? 'position', { filled: picked, className: 'ms-rs-ic' }) : '';
        mark.dataset.icon = iconKey;
      }
      mark.toggleAttribute('data-picked', picked);
      unavailable(mark, !accepting());
      const r = rects.get(id);
      Object.assign(mark.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.side}px`, height: `${r.side}px` });
    }
    // The room's own control, lit and current only: a button ("Windows · 2"), or a status pill (the Jail's
    // "Detained · you can still vote"). While reconnecting the pack shows none. Kept while its kind stays.
    const c = state.control, status = c?.kind === 'status';
    const showControl = !!c && !concealed && state.lighting === 'lit' && state.status === 'live';
    if (overlay.control && (!showControl || overlay.control.dataset.kind !== (status ? 'status' : 'button'))) { remove(overlay.control); overlay.control = null; }
    if (showControl) {
      if (!overlay.control) {
        overlay.control = el(status ? 'span' : 'button', 'ms-rs-control', status ? {} : { type: 'button' });
        overlay.control.dataset.kind = status ? 'status' : 'button';
        overlay.control.append(el('span', 'ms-rs-control__icon'), el('span', 'ms-rs-control__label'));
        if (!status) overlay.control.dataset.intent = 'control';
        over.append(overlay.control);
      }
      const node = overlay.control;
      if (node.firstChild.dataset.icon !== (c.icon ?? '')) {
        node.firstChild.innerHTML = c.icon ? iconSvg(c.icon, { filled: true, className: 'ms-rs-ic' }) : '';
        node.firstChild.dataset.icon = c.icon ?? '';
      }
      node.lastChild.textContent = c.label;
      if (!status) { node.dataset.value = String(c.id ?? ''); unavailable(node, c.enabled === false || !accepting()); }
    }
    keep('veil', !concealed && state.status === 'stale', () => el('div', 'ms-rs-veil'));
  }

  /** Sheet 45, the room picture unavailable: who is here and where, as portraits; positions and controls still work. */
  function paintUnavailable(shown) {
    const notice = keep('notice', shown, () => {
      const node = el('div', 'ms-rs-notice', { role: 'status' });
      node.innerHTML = iconSvg('warning', { filled: true, className: 'ms-rs-ic' });
      const words = el('span'), title = el('b'), sub = el('small');
      title.textContent = 'Room picture unavailable';
      sub.textContent = 'Positions and controls still work';
      words.append(title, sub);
      node.append(words);
      return node;
    });
    const grid = keep('cards', !!notice && state.lighting === 'lit', () => el('div', 'ms-rs-cards'));
    const shownPeople = grid ? placed(state) : [];
    const keepSeats = new Set(shownPeople.map(({ person }) => String(person.seat)));
    for (const [seat, card] of overlay.cardsBySeat) if (!grid || !keepSeats.has(seat)) { remove(card); overlay.cardsBySeat.delete(seat); }
    if (!grid) return;
    const seats = state.targets?.seats ?? null;
    for (const { person, slot } of shownPeople) {
      const id = String(person.seat);
      const target = !!seats?.some(seat => sameSeat(seat, person.seat));
      let card = overlay.cardsBySeat.get(id);
      if (card && (card.tagName === 'BUTTON') !== target) { remove(card); overlay.cardsBySeat.delete(id); card = null; }
      if (!card) {
        card = el(target ? 'button' : 'div', 'ms-rs-card', target ? { type: 'button' } : {});
        if (target) card.dataset.intent = 'seat';
        const face = el('span', 'ms-rs-card__face', { 'aria-hidden': 'true' });
        const name = el('span', 'ms-rs-card__name');
        name.append(el('b', 'ms-rs-tag__num'), el('span'));
        card.append(face, name, el('small', 'ms-rs-card__place'));
        grid.append(card);
        overlay.cardsBySeat.set(id, card);
      }
      card.dataset.value = id;
      card.children[0].style.backgroundImage = crewPortraitVariable(person.character, state.versions);
      card.children[1].children[0].textContent = String(seatNumber(person));
      card.children[1].children[1].textContent = `${sameSeat(state.self, person.seat) ? 'You' : person.name}${person.health === 'Injured' ? ' · Injured' : person.health === 'Eliminated' ? ' · Out' : ''}`;
      card.children[2].textContent = slot.id;
      if (target) {
        unavailable(card, !accepting());
        card.toggleAttribute('data-picked', !!state.targets?.picked?.some(seat => sameSeat(seat, person.seat)));
      }
    }
  }

  function render() {
    if (disposed) return;
    // Where the voyage stands, before this update replaces any picture.
    const standing = standingNow();
    const { width, height } = state.size;
    const concealed = state.status === 'concealed';
    Object.assign(root.style, { width: `${width}px`, height: `${height}px` });
    // Concealed, not even the room's name is left on the scene for a screen reader to read out.
    if (concealed) delete root.dataset.room; else root.dataset.room = state.room;
    root.dataset.lighting = state.lighting;
    root.dataset.status = state.status;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    root.setAttribute('aria-label', concealed ? 'Room hidden' : ROOM_NAMES[state.room]);
    root.toggleAttribute('data-unavailable', !state.artReady);
    crowd.toggleAttribute('inert', concealed);
    // Concealed, the game's films are hidden with everything else of the room.
    films.hidden = concealed;
    frame = roomSceneFrame(state, frame);
    if (concealed) {
      layers.replaceChildren();
      layersKey = null;
      clearPeople();
      paintOver(new Map());
      settle(true, standing);
      return;
    }
    const rects = new Map(roomScenePlaces(state, frame).map(r => [r.id, r]));
    const rebuilt = paintLayers();
    paintPeople(rects);
    figureMarks();
    paintOver(rects);
    placeTags();
    settle(rebuilt, standing);
  }

  function update(next = {}) {
    if (disposed) return;
    state = nextRoomSceneInput(state, next);
    // A film's every frame changes only its stand-ins or recoil: nothing else is drawn again.
    const keys = Object.keys(next);
    if (keys.length && keys.every(key => key === 'brace' || key === 'standIns')) { figureMarks(); return; }
    render();
  }
  function suspend() { if (disposed) return; const standing = standingNow(); suspended = true; settle(false, standing); }
  function resume() { if (disposed) return; suspended = false; settle(false, standingNow()); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    clearPeople();
    disposeCrewMounts(root);
    root.remove();
  }
  /**
   * Where the scene is: its frame (and the size it was made for, which a hold keeps), each place's press
   * square and, only while the lit room shows them, who is where, in the scene's CSS pixels from its top
   * left. In the dark or concealed it is geometry alone: no seat, no person. After dispose(), null.
   */
  function layout() {
    if (disposed) return null;
    const places = roomScenePlaces(state, frame).map(({ id, left, top, side }) => ({ slot: id, left, top, side }));
    const bySlot = new Map(places.map(p => [p.slot, p]));
    const showsPeople = state.status !== 'concealed' && state.lighting === 'lit';
    return {
      frame: { k: frame.k, tx: frame.tx, ty: frame.ty, zoom: frame.zoom, panel: { width: frame.panel.width, height: frame.panel.height },
        held: frame.held, window: frame.window, cold: frame.cold },
      places,
      people: showsPeople ? placed(state).map(({ person, slot }) => ({ seat: person.seat, ...bySlot.get(slot.id) })) : [],
    };
  }

  render();
  return Object.freeze({
    update, suspend, resume, dispose, layout, element: root,
    /**
     * The container for the game's films (0.4.0), or null after dispose(). It is in the scene's stacking
     * context and makes none of its own, so its children interleave with the scene by z-index, on the
     * scene's scale: a picture at 2 x depth + 1, a person's body at 2 x depth and front parts at 1500 + depth,
     * the turn mark 3001, positions 3050, press squares 3100, tags 3150, the room's name and control 3200.
     * Coordinates are CSS pixels from the scene's top left, as in layout(). Hidden while concealed; the
     * scene never touches what the game puts in it.
     */
    get films() { return disposed ? null : films; },
  });
}

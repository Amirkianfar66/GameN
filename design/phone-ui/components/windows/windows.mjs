// Windows: the drawings at this player's windows, and a drawing to show at a window's station, as the phone pack
// draws them (sheet 34; the pack's windows screen with its view, draw, shown and none states; #222 item 32's Windows
// half). Runtime source, Designer's (the owner, 14, 15 and 16 November 2026: Designer builds each visual component
// once, in design/; the game and the preview use it as it is). It opens from the Panels tab's Windows row (#296).
//
// The split (the Lead's review of #299):
//   mountWindows   the body of the phone shell's sheet: each window of this room with its drawings; at a station,
//                  that window only (decision 2), its drawing box, the four inks, Undo and Clear, and the drawings
//                  shown there this round; after a Show, the drawing just shown, stamped; or Frontend's "No window
//                  here" block
//   windowsSheet   the shell's sheet for the view: "Windows", Back, ✕, the large detent, and the footer: Show (the
//                  command, with Frontend's state) at a station, Done (this phone's own, `local`) after a Show
// The view is Frontend's, from the taps and the projection.
//
// What it never does: send a command, decide where this player can draw or when the windows are open, or keep a
// drawing. Which windows this player sees, the station, every drawing with its author and order, and why there is no
// window are Frontend's, from the projection (decision 3). The drawing being made is reported on each change
// (onDraft) and given back by Frontend, which keeps it (decision 4).
//
// The strokes: only the contract's bounded vectors (PlanetDrawingSchema), drawn as SVG elements made one by one
// with checked numbers and colours: never markup, never a URL. The limits are kept here, with no runtime import of
// the contracts; the test checks them against the contract's source.
//
// Private: the drawing being made is this phone's own until it is shown. The windows, the draft and the shown
// drawing leave the page when the viewer changes (unless the same update gives the new viewer's) and when concealed.

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const WINDOWS_VERSION = 'windows-0.1.0';
const VIEWS = Object.freeze(['windows', 'shown']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for every view, so the shell keeps its body (and this content) through them. */
export const WINDOWS_SHEET_ID = 'windows';

/** The pack's four inks, Gold first (screens-more.mjs windows; decision 5). */
export const INKS = Object.freeze([
  Object.freeze({ name: 'Gold', color: '#F7D886' }),
  Object.freeze({ name: 'Paper', color: '#F4EBDD' }),
  Object.freeze({ name: 'Teal', color: '#57BBA8' }),
  Object.freeze({ name: 'Pink', color: '#C2408F' }),
]);
/** The pack's pen: 6 in the drawing's 512 (decision 5). */
export const PEN_WIDTH = 6;
/** The drawing's box, in the pack's units (its sketches' viewBox). */
export const DRAWING_BOX = Object.freeze({ width: 512, height: 280 });
/** The contract's limits (PlanetDrawingSchema), kept here; the test reads the contract's source and fails if they differ. */
export const DRAWING_LIMITS = Object.freeze({ strokes: 128, points: 512, total: 4096, widthMin: 1, widthMax: 24 });
/** How far the keyboard's pen moves for each arrow, as today's game: 4 % of the box. */
const KEY_STEP = 0.04;

/** The pack's fixed words (screens-more.mjs windows; sheet 34). Why there is no window is Frontend's. */
export const WINDOWS_WORDS = Object.freeze({
  title: 'Windows',
  head: rooms => rooms.join(' ↔ '),
  ends: 'Ends with the round', station: place => `Your station · ${place}`,
  meta: (order, name, round) => `${order + 1} · ${name} · Round ${round}`,
  unverified: 'Unverified', fixed: 'Can’t be changed',
  shownThisRound: 'Shown this round', shownStamp: 'SHOWN',
  ink: 'Ink', undo: 'Undo stroke', clear: 'Clear drawing', show: 'Show', done: 'Done',
  box: rooms => `Drawing for ${rooms.join(' ↔ ')}`,
  keys: 'Arrow keys move the pen. Shift with an arrow draws. Space makes a dot.',
});

const OFF = Object.freeze({ enabled: false, busy: false, reason: null });
/** Every input, with its default: no window, nothing to show, no draft, until Frontend gives them. */
export const WINDOWS_DEFAULTS = Object.freeze({
  view: 'windows', status: 'live', interactive: true, reducedMotion: false, viewer: null,
  windows: Object.freeze([]), none: null, draft: null, show: OFF, shown: null,
});
/** What belongs to this viewer, dropped when the viewer changes or the sheet is concealed. */
const VIEWERS_OWN = Object.freeze(['windows', 'draft', 'shown']);

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const unit = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

function checkCommand(name, value) {
  if (value === null || value === undefined) return OFF;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
/**
 * A drawing's strokes within the contract (PlanetDrawingSchema): 1 to 128 strokes (none, for a draft), each a colour
 * as #rrggbb, a width from 1 to 24 and 1 to 512 points from 0 to 1, and 4096 points in all. A checked copy.
 */
export function checkStrokes(strokes, { draft = false } = {}) {
  const L = DRAWING_LIMITS;
  if (!Array.isArray(strokes)) throw new TypeError('A drawing\'s strokes are [{ color, width, points }]');
  if ((!draft && strokes.length < 1) || strokes.length > L.strokes) throw new TypeError(`A drawing has ${draft ? 0 : 1} to ${L.strokes} strokes`);
  let total = 0;
  const out = strokes.map(s => {
    if (!s || typeof s !== 'object' || typeof s.color !== 'string' || !COLOR.test(s.color)) throw new TypeError('A stroke\'s colour is #rrggbb');
    if (typeof s.width !== 'number' || !(s.width >= L.widthMin && s.width <= L.widthMax)) throw new TypeError(`A stroke's width is ${L.widthMin} to ${L.widthMax}`);
    if (!Array.isArray(s.points) || s.points.length < 1 || s.points.length > L.points) throw new TypeError(`A stroke has 1 to ${L.points} points`);
    total += s.points.length;
    const points = s.points.map(p => {
      if (!Array.isArray(p) || p.length !== 2 || !unit(p[0]) || !unit(p[1])) throw new TypeError('A point is [x, y], each from 0 to 1');
      return Object.freeze([p[0], p[1]]);
    });
    return Object.freeze({ color: s.color, width: s.width, points: Object.freeze(points) });
  });
  if (total > L.total) throw new TypeError(`A drawing has at most ${L.total} points in all`);
  return Object.freeze(out);
}
function checkWindows(list, viewer) {
  if (!Array.isArray(list)) throw new TypeError('windows are [{ windowId, rooms, station, drawings }]');
  const ids = new Set();
  let stations = 0;
  return Object.freeze(list.map(w => {
    if (!w || typeof w !== 'object' || !isText(w.windowId)) throw new TypeError('Each window needs its windowId');
    if (ids.has(w.windowId)) throw new TypeError(`Window ${w.windowId} is given twice`);
    ids.add(w.windowId);
    if (!Array.isArray(w.rooms) || w.rooms.length !== 2 || !w.rooms.every(isText)) throw new TypeError('A window\'s rooms are its two rooms\' names');
    const station = w.station ?? null;
    if (station !== null && !isText(station)) throw new TypeError('A window\'s station is this player\'s place there, or null');
    if (station !== null) stations += 1;
    if (stations > 1) throw new TypeError('This player is at one station at most');
    if (!Array.isArray(w.drawings)) throw new TypeError('A window\'s drawings are [{ id, order, round, author, drawing }]');
    const seen = new Set();
    const drawings = w.drawings.map(d => {
      if (!d || typeof d !== 'object' || !isText(d.id)) throw new TypeError('Each drawing needs its id');
      if (seen.has(d.id)) throw new TypeError(`Drawing ${d.id} is given twice`);
      seen.add(d.id);
      if (!Number.isSafeInteger(d.order) || d.order < 0) throw new TypeError('A drawing\'s order is 0 or more');
      if (!Number.isSafeInteger(d.round) || d.round < 1) throw new TypeError('A drawing\'s round is 1 or more');
      if (!d.author || typeof d.author !== 'object' || !isSeat(d.author.seat) || !isText(d.author.name)) throw new TypeError('A drawing\'s author is { seat, name }');
      if (!d.drawing || typeof d.drawing !== 'object') throw new TypeError('A drawing\'s drawing is { strokes }');
      // The checked copy keeps the input's form, so an update that doesn't give the windows checks them again as they are.
      return Object.freeze({ id: d.id, order: d.order, round: d.round, author: Object.freeze({ seat: d.author.seat, name: d.author.name }),
        own: viewer !== null && d.author.seat === viewer, drawing: Object.freeze({ strokes: checkStrokes(d.drawing.strokes) }) });
    }).sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return Object.freeze({ windowId: w.windowId, rooms: Object.freeze([...w.rooms]), station, drawings: Object.freeze(drawings) });
  }));
}
function checkNone(none) {
  if (none === null || none === undefined) return null;
  if (typeof none !== 'object' || !isText(none.title) || (none.line !== null && none.line !== undefined && typeof none.line !== 'string')) throw new TypeError('none is { title, line }, both Frontend\'s');
  return Object.freeze({ title: none.title, line: isText(none.line) ? none.line : null });
}
const inkOf = color => INKS.find(i => i.color.toLowerCase() === String(color).toLowerCase()) ?? null;
function checkDraft(draft) {
  if (draft === null || draft === undefined) return null;
  if (typeof draft !== 'object' || !isText(draft.windowId)) throw new TypeError('draft is { windowId, ink, strokes }');
  const ink = draft.ink === undefined || draft.ink === null ? INKS[0] : inkOf(draft.ink);
  if (!ink) throw new TypeError(`The draft's ink is one of ${INKS.map(i => i.color).join(', ')}`);
  return Object.freeze({ windowId: draft.windowId, ink: ink.color, strokes: checkStrokes(draft.strokes ?? [], { draft: true }) });
}

/** The window at this player's station, if any. */
const stationOf = s => s.windows.find(w => w.station !== null) ?? null;
/** The draft for the station's window: Frontend's, or a blank one in Gold. */
const draftFor = (s, w) => (s.draft && w && s.draft.windowId === w.windowId ? s.draft : Object.freeze({ windowId: w?.windowId ?? null, ink: INKS[0].color, strokes: Object.freeze([]) }));

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest
 * stay. What is this viewer's (the windows, the draft and the shown drawing) is dropped while concealed and when the
 * viewer changes, unless the same update gives the new viewer's; the shown view goes with it.
 */
export function nextWindowsInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is this phone\'s seat number, or null');
  next.viewer = next.viewer ?? null;
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  const viewerChanged = 'viewer' in input && previous.viewer !== next.viewer;
  const concealed = next.status === 'concealed';
  if (concealed || viewerChanged) {
    for (const key of VIEWERS_OWN) if (concealed || !(key in input)) next[key] = WINDOWS_DEFAULTS[key];
    // The shown view goes with its drawing; any other view is kept, and checked as given.
    if (next.view === 'shown' && next.shown === null) next.view = 'windows';
  }
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  next.windows = checkWindows(next.windows ?? [], next.viewer);
  next.none = checkNone(next.none);
  next.draft = checkDraft(next.draft);
  next.show = checkCommand('show', next.show);
  next.shown = next.shown ?? null;
  if (next.shown !== null && !isText(next.shown)) throw new TypeError('shown is the id of the drawing just shown, or null');
  if (next.view === 'shown') {
    const w = stationOf(next);
    if (!w) throw new TypeError('The shown view is at a station: one window has this player\'s station');
    const d = w.drawings.find(x => x.id === next.shown);
    if (!d) throw new TypeError('shown is one of the station window\'s drawings');
    if (!d.own) throw new TypeError('The drawing just shown is this player\'s own');
  }
  return next;
}

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): "Windows", Back (to Panels), ✕, the large detent,
 * and the footer. At a station, Show is the command, with Frontend's state, and off while the draft is empty (the
 * form's own state); after a Show, Done is this phone's own (`local`: it works while reconnecting and stands for no
 * command). Their taps come back through the shell's onSheetAction(id): show, done.
 */
export function windowsSheet(input) {
  const s = nextWindowsInput(WINDOWS_DEFAULTS, input);
  const W = WINDOWS_WORDS;
  const frame = { id: WINDOWS_SHEET_ID, title: W.title, back: true, close: true, detent: 'large' };
  const w = s.status === 'concealed' ? null : stationOf(s);
  if (s.view === 'shown') return { ...frame, actions: [{ id: 'done', label: W.done, kind: 'secondary', local: true }] };
  if (!w) return { ...frame, actions: [] };
  const drawn = draftFor(s, w).strokes.length > 0;
  return { ...frame, actions: [{ id: 'show', label: W.show, kind: 'primary', icon: 'show', enabled: s.show.enabled && drawn, busy: s.show.busy, reason: s.show.reason }] };
}

// ── The strokes, as SVG elements ──────────────────────────────────────
const SVG = 'http://www.w3.org/2000/svg';
const at = (v, size) => String(Math.round(v * size * 10) / 10);
/** One stroke: a path in its colour and width with round ends and joins, or a dot for a single point (the pack's sketch). */
function strokeNode(doc, stroke) {
  const { width: X, height: Y } = DRAWING_BOX;
  let node;
  if (stroke.points.length === 1) {
    node = doc.createElementNS(SVG, 'circle');
    node.setAttribute('cx', at(stroke.points[0][0], X));
    node.setAttribute('cy', at(stroke.points[0][1], Y));
    node.setAttribute('r', String(stroke.width / 2));
    node.setAttribute('fill', stroke.color);
  } else {
    node = doc.createElementNS(SVG, 'path');
    node.setAttribute('d', stroke.points.map(([x, y], i) => `${i ? 'L' : 'M'}${at(x, X)} ${at(y, Y)}`).join(' '));
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', stroke.color);
    node.setAttribute('stroke-width', String(stroke.width));
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
  }
  node.setAttribute('class', 'ms-wn-stroke');
  return node;
}
function paintStrokes(group, strokes) {
  const doc = group.ownerDocument;
  group.replaceChildren(...strokes.map(s => strokeNode(doc, s)));
}
function emptySvg(doc) {
  const svg = doc.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${DRAWING_BOX.width} ${DRAWING_BOX.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}
/** A drawing (the contract's `{ strokes }`, checked) as the pack's SVG in its 512 × 280 box. */
export function drawingSvg(doc, drawing) {
  const strokes = checkStrokes(drawing?.strokes);
  const svg = emptySvg(doc);
  const group = doc.createElementNS(SVG, 'g');
  svg.append(group);
  paintStrokes(group, strokes);
  return svg;
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountWindows(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Windows need a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = WINDOWS_WORDS;
  let state = nextWindowsInput(WINDOWS_DEFAULTS, input);
  let disposed = false, mode = null;
  const on = Object.fromEntries(['onDraft', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-windows ms-kit', { tabindex: '-1', role: 'group', 'aria-label': W.title });
  host.append(root);
  // Drawing, the inks, Undo and Clear are this phone's own, so they work while reconnecting (decision 8); Show and
  // Done are the shell's footer, which makes Show wait with the banner's words.
  const accepts = () => !disposed && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => null,
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });
  let uid = 0;
  const idFor = () => `ms-wn-${(mountWindows.count = (mountWindows.count ?? 0) + 1)}-${(uid += 1)}`;

  // ── A window's head: the kit's section head (0.7.0, the pack's .section-head; decision 1) ──
  const head = () => kit.sectionHead({ title: '' });
  const setHead = (node, title, aside) => kit.setSectionHead(node, { title, aside });

  // ── A drawing shown at a window: its dark box, and its line ─────────
  function drawingItem() {
    const item = kit.h('div', 'ms-wn-drawing');
    const frame = kit.h('div', 'ms-wn-frame');
    const box = kit.h('div', 'ms-wn-box', { role: 'img' });
    const svg = emptySvg(doc), group = doc.createElementNS(SVG, 'g');
    svg.append(group);
    box.append(svg);
    frame.append(box);
    const meta = kit.h('div', 'ms-wn-meta', { id: idFor() });
    meta.append(kit.h('span'), kit.h('span'));
    box.setAttribute('aria-labelledby', meta.id);
    item.append(frame, meta);
    Object.assign(item, { frame, box, group, meta, stamp: null, sig: null });
    return item;
  }
  function setDrawing(item, d, stamped) {
    // A drawing can't be changed once shown: its strokes are drawn once, again only if Frontend gives others.
    const strokes = d.drawing.strokes, sig = `${strokes.length}:${strokes.map(s => s.points.length).join(',')}`;
    if (item.sig !== sig || item.id !== d.id) { paintStrokes(item.group, strokes); item.sig = sig; item.id = d.id; }
    kit.text(item.meta.firstChild, W.meta(d.order, d.author.name, d.round));
    kit.text(item.meta.lastChild, d.own ? W.fixed : W.unverified);
    if (stamped && !item.stamp) {
      item.stamp = kit.h('span', 'ms-wn-stamp');
      item.stamp.append(kit.stamp({ text: W.shownStamp, tone: 'amber' }));
      item.frame.append(item.stamp);
    }
    if (!stamped && item.stamp) { item.stamp.remove(); item.stamp = null; }
  }
  /** Keeps a list's drawings in order, each with its element. */
  function syncDrawings(list, items, drawings, stamped = null) {
    const wanted = new Set(drawings.map(d => d.id));
    for (const [id, item] of items) if (!wanted.has(id)) { policy.remove(item); items.delete(id); }
    drawings.forEach((d, i) => {
      let item = items.get(d.id);
      if (!item) { item = drawingItem(); items.set(d.id, item); }
      setDrawing(item, d, d.id === stamped);
      if (list.children[i] !== item) list.insertBefore(item, list.children[i] ?? null);
    });
  }

  // ── The modes' parts, made as a mode is shown ───────────────────────
  let parts = {};
  function buildNone() {
    parts = { wait: null };
  }
  /** The pack's small waiting block with the window icon, and Frontend's words (decision 3); nothing until they're given. */
  function paintNone() {
    const p = parts;
    if (!state.none) { if (p.wait) { policy.remove(p.wait); p.wait = null; } return; }
    const props = { icon: 'window', title: state.none.title, line: state.none.line, size: 'small' };
    if (!p.wait) { p.wait = kit.wait(props); root.append(p.wait); } else kit.setWait(p.wait, props);
  }
  function buildView() {
    parts = { list: kit.h('div', 'ms-wn-windows'), sections: new Map() };
    root.append(parts.list);
  }
  function paintView() {
    const p = parts;
    const wanted = new Set(state.windows.map(w => w.windowId));
    for (const [id, section] of p.sections) if (!wanted.has(id)) { policy.remove(section); p.sections.delete(id); }
    state.windows.forEach((w, i) => {
      let section = p.sections.get(w.windowId);
      if (!section) {
        section = kit.h('section', 'ms-wn-window');
        section.head = head();
        section.list = kit.h('div', 'ms-wn-drawings');
        section.items = new Map();
        section.append(section.head, section.list);
        p.sections.set(w.windowId, section);
      }
      setHead(section.head, W.head(w.rooms), W.ends);
      syncDrawings(section.list, section.items, w.drawings);
      if (p.list.children[i] !== section) p.list.insertBefore(section, p.list.children[i] ?? null);
    });
  }
  function buildStation(shown) {
    const section = kit.h('section', 'ms-wn-window ms-wn-station');
    const h3 = head();
    section.append(h3);
    const extra = {};
    if (!shown) {
      const pad = kit.h('div', 'ms-wn-box ms-wn-pad', { tabindex: '0', role: 'application' });
      const keys = kit.h('span', 'ms-k-vh', { id: idFor() });
      kit.text(keys, W.keys);
      pad.setAttribute('aria-describedby', keys.id);
      const svg = emptySvg(doc), group = doc.createElementNS(SVG, 'g'), live = doc.createElementNS(SVG, 'g');
      const pen = doc.createElementNS(SVG, 'circle');
      pen.setAttribute('class', 'ms-wn-pen');
      pen.setAttribute('r', '9');
      pen.setAttribute('fill', 'none');
      pen.setAttribute('stroke-width', '3');
      svg.append(group, live, pen);
      pad.append(svg, keys);
      const tools = kit.h('div', 'ms-wn-tools');
      const inks = kit.h('div', 'ms-wn-inks', { role: 'radiogroup', 'aria-label': W.ink });
      const swatches = INKS.map(ink => kit.h('button', 'ms-wn-swatch', { type: 'button', role: 'radio', 'aria-label': ink.name, 'data-intent': 'ink', 'data-value': ink.color, 'data-ink': ink.name.toLowerCase() }));
      inks.append(...swatches);
      const undo = kit.iconButton({ icon: 'retry', label: W.undo, intent: 'undo' });
      const clear = kit.iconButton({ icon: 'close', label: W.clear, intent: 'clear' });
      tools.append(inks, kit.h('span', 'ms-wn-spacer', { 'aria-hidden': 'true' }), undo, clear);
      section.append(pad, tools);
      Object.assign(extra, { pad, group, live, pen, swatches, undo, clear });
      wirePad(pad);
    }
    const label = kit.groupLabel(W.shownThisRound);
    const list = kit.h('div', 'ms-wn-drawings');
    const stamped = shown ? kit.h('div', 'ms-wn-drawings ms-wn-just-shown') : null;
    if (stamped) section.append(stamped);
    section.append(label, list);
    root.append(section);
    parts = { section, head: h3, label, list, items: new Map(), stamped, stampedItems: new Map(), ...extra };
  }
  function paintStation() {
    const p = parts, s = state, w = stationOf(s);
    setHead(p.head, W.head(w.rooms), W.station(w.station));
    let others = w.drawings;
    if (s.view === 'shown') {
      const d = w.drawings.find(x => x.id === s.shown);
      syncDrawings(p.stamped, p.stampedItems, [d], d.id);
      others = w.drawings.filter(x => x.id !== s.shown);
    } else paintPad(w);
    syncDrawings(p.list, p.items, others);
    p.label.hidden = p.list.hidden = others.length === 0;
  }

  // ── The drawing box: a finger, a pen, or the keyboard ───────────────
  let live = null, pointer = null, cursor = [0.5, 0.5], penOn = false;
  const draft = () => draftFor(state, stationOf(state));
  const total = strokes => strokes.reduce((n, s) => n + s.points.length, 0);
  function paintPad(w) {
    const p = parts, d = draftFor(state, w);
    if (p.sig !== d.strokes) { paintStrokes(p.group, d.strokes); p.sig = d.strokes; }
    kit.attr(p.pad, 'aria-label', W.box(w.rooms));
    paintLive();
    p.swatches.forEach(b => {
      const chosen = b.dataset.value === d.ink;
      b.setAttribute('aria-checked', String(chosen));
      b.tabIndex = chosen ? 0 : -1;
      policy.control(b, {});
    });
    // Undo and Clear do nothing on an empty draft: the form's own state, dimmed without words.
    const empty = d.strokes.length === 0;
    policy.control(p.undo, { off: empty });
    policy.control(p.clear, { off: empty });
    kit.attr(p.pad, 'aria-disabled', accepts() ? null : 'true');
  }
  function paintLive() {
    const p = parts;
    if (!p.live) return;
    paintStrokes(p.live, live ? [live] : []);
    p.pen.setAttribute('stroke', draft().ink);
    p.pen.setAttribute('cx', at(cursor[0], DRAWING_BOX.width));
    p.pen.setAttribute('cy', at(cursor[1], DRAWING_BOX.height));
    // The pen's mark only while the keyboard draws, so the box looks as drawn otherwise (decision 6).
    kit.attr(p.pad, 'data-pen', penOn ? '' : null);
  }
  /** Reports the whole draft, as the contract's drawing takes it, and draws it at once. */
  function report(next) {
    state = { ...state, draft: next };
    paintPad(stationOf(state));
    on.onDraft?.({ windowId: next.windowId, ink: next.ink, strokes: next.strokes.map(s => ({ color: s.color, width: s.width, points: s.points.map(pt => [pt[0], pt[1]]) })) });
  }
  const freeze = (d, strokes, ink = d.ink) => Object.freeze({ windowId: d.windowId, ink, strokes: Object.freeze(strokes) });
  function begin(point) {
    const d = draft();
    if (d.strokes.length >= DRAWING_LIMITS.strokes || total(d.strokes) >= DRAWING_LIMITS.total) return false;
    live = { color: d.ink, width: PEN_WIDTH, points: [point] };
    paintLive();
    return true;
  }
  function extend(point, { always = false } = {}) {
    if (!live) return;
    const last = live.points[live.points.length - 1];
    // Points closer than a unit of the drawing's 512 are dropped as they're drawn.
    if (!always && Math.hypot((point[0] - last[0]) * DRAWING_BOX.width, (point[1] - last[1]) * DRAWING_BOX.height) < 1) return;
    // A stroke past the limits ends.
    if (live.points.length >= DRAWING_LIMITS.points || total(draft().strokes) + live.points.length >= DRAWING_LIMITS.total) { finish(); return; }
    live.points.push(point);
    paintLive();
  }
  function finish() {
    if (!live) return;
    const d = draft(), stroke = Object.freeze({ color: live.color, width: live.width, points: Object.freeze(live.points.map(p => Object.freeze(p))) });
    live = null;
    report(freeze(d, [...d.strokes, stroke]));
  }
  /** A stroke being drawn ends without a report: the draw view left, the viewer changed, concealed or disposed. */
  function drop() { live = null; pointer = null; if (parts.live) paintLive(); }
  const round4 = v => Math.round(v * 10000) / 10000;
  const pointOf = (pad, e) => {
    const r = pad.getBoundingClientRect();
    return [round4(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))), round4(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)))];
  };
  function wirePad(pad) {
    pad.addEventListener('pointerdown', e => {
      if (!accepts() || pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      pad.focus({ preventScroll: true });
      penOn = false;
      if (!begin(pointOf(pad, e))) { paintLive(); return; }
      pointer = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has none */ }
    });
    pad.addEventListener('pointermove', e => {
      if (e.pointerId !== pointer || !live) return;
      // The moves the browser joined into this one, in order; the event itself when it gives none.
      const joined = e.getCoalescedEvents?.() ?? [];
      for (const ev of joined.length ? joined : [e]) extend(pointOf(pad, ev));
    });
    const end = e => { if (e.pointerId !== pointer) return; pointer = null; if (accepts()) finish(); else drop(); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(type, end);
    pad.addEventListener('keydown', e => {
      if (!accepts()) return;
      const dx = e.key === 'ArrowRight' ? KEY_STEP : e.key === 'ArrowLeft' ? -KEY_STEP : 0;
      const dy = e.key === 'ArrowDown' ? KEY_STEP : e.key === 'ArrowUp' ? -KEY_STEP : 0;
      if (dx || dy) {
        e.preventDefault();
        penOn = true;
        const from = cursor;
        cursor = [round4(Math.min(1, Math.max(0, from[0] + dx))), round4(Math.min(1, Math.max(0, from[1] + dy)))];
        if (e.shiftKey) { if (live || begin(from)) extend(cursor, { always: true }); } else finish();
        paintLive();
      } else if (e.key === ' ') {
        e.preventDefault();
        penOn = true;
        finish();
        if (begin(cursor)) finish();
        paintLive();
      }
    });
    pad.addEventListener('keyup', e => { if (e.key === 'Shift' && pointer === null) finish(); });
    pad.addEventListener('blur', () => { if (pointer === null) finish(); penOn = false; paintLive(); });
  }

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent, d = draft();
    if (intent === 'ink') { if (d.ink !== target.dataset.value) report(freeze(d, d.strokes, target.dataset.value)); }
    else if (intent === 'undo') report(freeze(d, d.strokes.slice(0, -1)));
    else if (intent === 'clear') report(freeze(d, []));
  };
  // The inks are a radio group: the arrows move the choice, as the platform's radios do.
  const onKey = event => {
    const target = event.target.closest?.('.ms-wn-swatch');
    if (!target || !accepts()) return;
    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const i = parts.swatches.indexOf(target), next = parts.swatches[(i + step + INKS.length) % INKS.length];
    next.focus();
    next.click();
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);

  const modeOf = s => (s.status === 'concealed' ? 'empty' : s.view === 'shown' ? 'shown' : stationOf(s) ? 'draw' : s.windows.length ? 'view' : 'none');
  function build(next) {
    // The mode's parts leave with it; a focus in them returns to the content, reported once.
    drop();
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    parts = {};
    if (next === 'none') buildNone();
    else if (next === 'view') buildView();
    else if (next === 'draw' || next === 'shown') buildStation(next === 'shown');
    mode = next;
  }
  let stationKey = null;
  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    const next = modeOf(state), w = stationOf(state);
    // A new station (or none) starts its own box: a stroke in progress there ends without a report.
    const key = w ? `${w.windowId}:${w.station}` : null;
    if (mode !== next || (next === 'draw' && key !== stationKey)) build(next);
    stationKey = key;
    if (!accepts()) drop();
    root.dataset.view = next;
    if (next === 'none') paintNone();
    else if (next === 'view') paintView();
    else if (next === 'draw' || next === 'shown') paintStation();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextWindowsInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    drop();
    disposed = true;
    // The drawings and the draft leave the page with the content.
    for (const node of [...root.children]) node.remove();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKey);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}

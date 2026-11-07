// mothership:dev-only
//
// Library group 5's review page: the windows a seat sees from each place, the drawing pad of a
// station, the feed of shown drawings, the Blackout's shade and the board's station markers, each
// computed by states.mjs from a synthetic player view (protocol 3 candidate shape) and drawn with
// this group's art (assets/windows.art.css) and the dossier's parts. Motion players run
// motion.mjs. A review page: synthetic fixtures, no server, never a client. The frame is
// ../review.mjs.

import { INKS, LINTEL_FILES, PAD, WIDTHS, drawingPaths } from './art.mjs';
import { WINDOW_COPY as C, bothRooms } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { ENDPOINTS, LIMITS, PAD_STATES, STATIONS, isDark, padState, windowsFor } from './states.mjs';
import { card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';

// ---------- the synthetic match (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const who = n => `Player ${n}, ${NAMES[n - 1]}`;
const PLACES = { 1: ['Room A', 'A3'], 2: ['Room A', 'A1'], 3: ['Room A', 'A2'], 4: ['Room B', 'B4'], 5: ['Room B', 'B2'], 6: ['Room B', 'B1'], 7: ['Command Room', 'C1'], 8: ['Hospital', 'H2'], 9: ['Jail', 'J1'] };

// Synthetic drawings: claims a player might draw (no words: the pad has no text tool).
const line = (pts, color = INKS[0], width = 7) => ({ color, width, points: pts });
const ring = (cx, cy, r, n = 18) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * 1.33 * Math.sin((i / n) * 2 * Math.PI)]);
const DRAW = {
  arrow: { strokes: [line([[0.14, 0.5], [0.82, 0.5]]), line([[0.68, 0.36], [0.82, 0.5], [0.68, 0.64]])] },
  figure: { strokes: [line(ring(0.5, 0.24, 0.07)), line([[0.5, 0.34], [0.5, 0.62]]), line([[0.36, 0.45], [0.64, 0.45]]), line([[0.4, 0.84], [0.5, 0.62], [0.6, 0.84]])] },
  cross: { strokes: [line([[0.28, 0.24], [0.72, 0.76]], INKS[2], 14), line([[0.72, 0.24], [0.28, 0.76]], INKS[2], 14)] },
  wave: { strokes: [line(Array.from({ length: 24 }, (_, i) => [0.1 + (i / 23) * 0.8, 0.5 + 0.18 * Math.sin(i * 0.9)]), INKS[3], 7)] },
  dots: { strokes: [[0.35, 0.5], [0.5, 0.5], [0.65, 0.5]].map(p => line([p], INKS[0], 14)) },
  ring: { strokes: [line(ring(0.5, 0.5, 0.22, 28), INKS[4], 7), line([[0.5, 0.34], [0.5, 0.56]]), line([[0.5, 0.66]], INKS[0], 10)] },
};
const shown = (id, windowId, author, order, drawing, round = 4) => ({ id, windowId, authorSeatId: author, round, order, drawing });
const FEEDS = {
  A_B: [shown('d1', 'A_B', 2, 1, DRAW.arrow), shown('d2', 'A_B', 6, 2, DRAW.figure), shown('d3', 'A_B', 2, 3, DRAW.dots)],
  A_HOSPITAL: [shown('d4', 'A_HOSPITAL', 3, 1, DRAW.ring)],
  B_JAIL: [shown('d5', 'B_JAIL', 5, 1, DRAW.cross), shown('d6', 'B_JAIL', 5, 2, DRAW.wave)],
};

/** A view with only what the state map reads, every field named as the contract names it. */
/** The Blackout's synthetic clock: it opens at T0, its preview deadline is five seconds in, it ends at fifteen (contract: BLACKOUT 15 s). */
const T0 = 400_000;
const BLACKOUT = Object.freeze({ windowId: 'blackout-r4', previewEndsAt: T0 + 5000, endsAt: T0 + 15_000 });
function view({ seat = 2, round = 4, phase = 'ORDINARY_TURN', show = true, feeds = FEEDS, place = PLACES[seat], blackout = phase === 'BLACKOUT' ? BLACKOUT : null }) {
  const [location, slotId] = place;
  const seats = Array.from({ length: 9 }, (_, i) => i + 1).map(n => ({ seatId: n, location: n === seat ? location : PLACES[n][0], slotId: n === seat ? slotId : PLACES[n][1], health: 'Healthy' }));
  const windows = Object.keys(ENDPOINTS).filter(id => ENDPOINTS[id].includes(location)).map(id => ({ windowId: id, canDraw: STATIONS[slotId] === id, drawings: (feeds[id] ?? []).filter(d => d.round === round) }));
  const showable = windows.filter(w => w.canDraw).map(w => w.windowId);
  return {
    round, phase: { id: `r${round}-${phase}`, kind: phase, ...(phase === 'BLACKOUT' ? { startedAt: T0, endsAt: T0 + 15_000 } : {}) }, blackout, self: { seatId: seat }, board: { kind: 'PLAYER_CURRENT', seats }, windows,
    offers: show && showable.length && phase !== 'BLACKOUT' ? [{ type: 'SHOW_WINDOW', targetSeatIds: [], slotIds: [], windowIds: showable, promiseTargetSeatIds: [] }] : [],
  };
}
const fieldText = (v, extra = '') => {
  const s = v.board.seats.find(x => x.seatId === v.self.seatId);
  return `round ${v.round} · ${v.phase.kind} · seat ${v.self.seatId} (${NAMES[v.self.seatId - 1]}) at ${s.location} ${s.slotId} · windows [${v.windows.map(w => `${w.windowId}${w.canDraw ? ' canDraw' : ''} ${w.drawings.length} shown`).join('; ')}] · offers [${v.offers.map(o => `${o.type} ${o.windowIds.join(',')}`).join('; ')}]${v.phase.kind === 'BLACKOUT' ? (v.blackout ? ` · blackout {previewEndsAt +${(v.blackout.previewEndsAt - v.phase.startedAt) / 1000} s, endsAt +${(v.blackout.endsAt - v.phase.startedAt) / 1000} s}` : ' · blackout null') : ''}${extra}`;
};

// ---------- drawings, panes, pads ----------

const NS = 'http://www.w3.org/2000/svg';
/** A drawing as SVG elements built from drawingPaths() (numbers and a checked colour only). */
function drawingNode(drawing, cls = 'wn-drawing') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${PAD.w} ${PAD.h}`);
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  for (const p of drawingPaths(drawing)) {
    const path = document.createElementNS(NS, 'path');
    for (const [k, v] of Object.entries({ d: p.d, stroke: p.color, 'stroke-width': p.width, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(k, v);
    svg.append(path);
  }
  return svg;
}
const art = (cls, file) => el('span', { class: cls, 'aria-hidden': 'true', style: `--wn-art: var(--wn-asset-${file})` });

function feed(w, round, { dark = false } = {}) {
  const pane = el('div', { class: 'wn-pane' },
    w.drawings.length
      ? el('ol', { class: 'wn-feed', 'aria-label': `${C.title(w.facing)}: shown this round` }, w.drawings.map(d => el('li', { class: 'wn-shown' },
        el('span', { class: 'wn-tape', 'aria-hidden': 'true' }), drawingNode(d.drawing), el('span', { class: 'wn-caption' }, C.caption(d.order, who(d.authorSeatId))))))
      : el('p', { class: 'wn-empty' }, C.empty));
  if (dark) pane.append(el('div', { class: 'wn-shade' }, el('p', {}, C.dark)));
  return pane;
}
function windowView(w, v, { pad = null, dark = false } = {}) {
  const here = v.board.seats.find(s => s.seatId === v.self.seatId).location;
  return el('section', { class: 'wn-window', 'data-window': w.windowId, 'aria-label': C.title(w.facing) },
    el('header', { class: 'wn-lintel', style: `--wn-art: var(--wn-asset-${LINTEL_FILES[w.windowId]})` }, el('h3', {}, C.title(w.facing))),
    feed(w, v.round, { dark }),
    el('p', { class: 'wn-note' }, `${C.claims} ${C.expiry(v.round)}`),
    !w.station && !dark ? el('p', { class: 'wn-note' }, here === 'Hospital' || here === 'Jail' ? C.noStation : C.viewOnly) : null,
    pad);
}

const swatches = active => el('div', { class: 'wn-swatches', role: 'group', 'aria-label': 'Ink' }, INKS.map(ink => el('button', { type: 'button', class: 'wn-swatch', 'aria-pressed': ink === active ? 'true' : 'false', 'aria-label': C.colours[ink], style: `--ink: ${ink}` })));
const widths = active => el('div', { class: 'wn-widths', role: 'group', 'aria-label': 'Line' }, WIDTHS.map(wd => el('button', { type: 'button', class: 'wn-width', 'aria-pressed': wd === active ? 'true' : 'false' }, el('span', { class: 'wn-width__line', style: `--w: ${wd}px`, 'aria-hidden': 'true' }), C.widths[wd])));

/** The station's pad for a state from padState(). */
function padView(s, local, round) {
  const canvas = el('div', { class: 'wn-pad', role: 'img', 'aria-label': local?.strokes?.length ? `Your drawing: ${local.strokes.length} lines` : 'Your drawing pad, empty' }, local?.strokes?.length ? drawingNode(local, 'wn-drawing wn-drawing--pad') : null);
  const meter = s.budget ? el('div', { class: 'wn-meter' }, el('span', { class: 'wn-meter__bar', style: `--used: ${(s.budget.points / LIMITS.points).toFixed(3)}`, 'aria-hidden': 'true' }), el('span', {}, C.budget(s.budget.points.toLocaleString('en'), LIMITS.points.toLocaleString('en')))) : null;
  const tools = (canShow = true) => el('div', { class: 'lib-buttons' }, canShow ? el('button', { type: 'button', class: 'ab-button' }, C.show) : null, el('button', { type: 'button', class: 'ab-button wn-quiet' }, C.undo), el('button', { type: 'button', class: 'ab-button wn-quiet' }, C.clear));
  const kit = (...extra) => el('div', { class: 'wn-station' }, el('p', { class: 'wn-station__words' }, C.station(s.facing)), canvas, swatches(INKS[0]), widths(7), meter, ...extra);
  switch (s.state) {
    case 'blank': return kit(words(C.blank, 'lib-note'));
    case 'drawing': return kit(words(C.drawing, 'lib-note'), tools());
    case 'full': return kit(words(C.full, 'lib-note'), tools());
    case 'closed': return kit(words(C.closed, 'lib-note'), tools(false));
    case 'review': return el('div', { class: 'wn-station' }, canvas, words(C.review(s.facing, bothRooms(ENDPOINTS[s.windowId]))), el('div', { class: 'lib-buttons' }, el('button', { type: 'button', class: 'ab-button' }, C.show), el('button', { type: 'button', class: 'ab-button' }, C.back)));
    case 'sending': return el('div', { class: 'wn-station' }, el('div', { class: 'lib-strip__top' }, el('span', {}), el('span', { class: 'lib-stamp-slot' }, stamp(C.stampSending))), canvas, words(C.sending));
    case 'shown': return el('div', { class: 'wn-station' }, el('div', { class: 'lib-strip__top' }, el('span', {}), el('span', { class: 'lib-stamp-slot' }, stamp(C.stampShown))), words(C.shown(round)), canvas, tools(false));
    case 'refused': return kit(words(C.refused, 'lib-note'), tools());
    default: return null;
  }
}

/** Every window a seat sees, with the pad under its station's window. */
function seatStrip(v, opts = {}) {
  const ws = windowsFor(v);
  if (!ws.length) return el('p', { class: 'wn-none' }, 'Nothing is drawn: there is no window from here.');
  const dark = isDark(v, opts.now ?? null);
  return strip(C.tapeWindows, dark ? C.stampDark : null, ...ws.map(w => {
    const s = padState(v, w.windowId, opts);
    const pad = s.state === 'view-only' || s.state === 'dark' ? null : padView(s, opts.local, v.round);
    return windowView(w, v, { pad, dark });
  }), el('p', { class: 'wn-privacy' }, C.privacy));
}

// ---------- cases ----------

const LOCAL = { strokes: [line([[0.2, 0.7], [0.35, 0.3], [0.5, 0.7], [0.65, 0.3], [0.8, 0.7]], INKS[0], 7), line(ring(0.5, 0.5, 0.06, 10), INKS[2], 7)] };
const FULL = { strokes: Array.from({ length: 8 }, (_, k) => line(Array.from({ length: 512 }, (_, i) => [0.06 + (i / 511) * 0.88, 0.1 + k * 0.11 + 0.035 * Math.sin(i / 9)]), INKS[k % 5 === 1 ? 0 : k % 5], 3)) };

function stationCases() {
  return [2, 3, 6, 5].map(seat => {
    const v = view({ seat });
    const slot = PLACES[seat][1];
    return card(`station ${slot}: ${STATIONS[slot]}`, fieldText(v), seatStrip(v, { local: null }));
  });
}
function padCases() {
  const v = view({ seat: 2 });
  const add = (label, opts, vv = v) => {
    const s = padState(vv, 'A_B', opts);
    return card(`pad: ${s.state}${label ? ` (${label})` : ''}`, fieldText(vv, opts.local ? ` · local ${opts.local.strokes.length} lines` : ''), strip(C.tapeWindows, null, windowView(windowsFor(vv).find(w => w.windowId === 'A_B'), vv, { pad: padView(s, opts.local, vv.round) })));
  };
  return [
    add('', {}),
    add('', { local: LOCAL }),
    add('the contract\'s 4,096 points', { local: FULL }),
    add('', { local: LOCAL, reviewing: true }),
    add('', { local: LOCAL, pending: 'SHOW_WINDOW:A_B' }),
    add('the pad is blank again', { accepted: { A_B: 'r4-ORDINARY_TURN' } }),
    add('NOT_ALLOWED', { local: LOCAL, rejected: { A_B: { phaseId: 'r4-ORDINARY_TURN', code: 'NOT_ALLOWED' } } }),
    add('Show not offered now', { local: LOCAL }, view({ seat: 2, show: false })),
  ];
}
function viewerCases() {
  const at = (seat, opts = {}) => view({ seat, ...opts });
  return [
    card('viewer: Room A, no station (A3)', fieldText(at(1)), seatStrip(at(1))),
    card('viewer: Room B, no station (B4)', fieldText(at(4)), seatStrip(at(4))),
    card('viewer: Hospital (view only)', fieldText(at(8)), seatStrip(at(8))),
    card('viewer: Jail (view only)', fieldText(at(9)), seatStrip(at(9))),
    card('viewer: Command Room (no window)', fieldText(at(7)), seatStrip(at(7))),
    card('viewer: the Blackout\'s first five seconds (lit)', fieldText(at(2, { phase: 'BLACKOUT' }), ` · now +2.0 s (before blackout.previewEndsAt)`), seatStrip(at(2, { phase: 'BLACKOUT' }), { now: T0 + 2000 })),
    card('viewer: the Blackout from its preview deadline (dark)', fieldText(at(2, { phase: 'BLACKOUT' }), ` · now +6.0 s (after blackout.previewEndsAt)`), seatStrip(at(2, { phase: 'BLACKOUT' }), { now: T0 + 6000 })),
    card('viewer: the Blackout without a preview deadline (missing field: dark from its start)', fieldText(at(2, { phase: 'BLACKOUT', blackout: null }), ` · now +2.0 s, no blackout in the view`), seatStrip(at(2, { phase: 'BLACKOUT', blackout: null }), { now: T0 + 2000 })),
    card('viewer: the next round (expired)', fieldText(at(4, { round: 5 })), seatStrip(at(4, { round: 5 }))),
  ];
}
function boardCards() {
  const room = (name, ids) => el('div', { class: 'wn-room' }, el('h4', {}, name), el('ol', { class: 'wn-slots' }, ids.map(id => el('li', { class: STATIONS[id] ? 'wn-slot wn-slot--station' : 'wn-slot' },
    STATIONS[id] ? el('span', { class: 'wn-marker', 'aria-hidden': 'true' }) : null, el('b', {}, id),
    STATIONS[id] ? el('span', {}, C.stationMarker(id.startsWith('A') ? (STATIONS[id] === 'A_B' ? 'Room B' : 'Hospital') : (STATIONS[id] === 'A_B' ? 'Room A' : 'Jail'))) : null))));
  const tray = el('div', { class: 'wn-tray' }, el('span', { class: 'wn-icon', 'aria-hidden': 'true' }), el('div', {}, el('strong', {}, 'Windows'), el('span', {}, 'Draw and show to the next room')));
  return [
    card('board: the four drawing stations', 'the floor plate at the slot\'s feet anchor, A1 and B1 (A_B), A2 (A_HOSPITAL), B2 (B_JAIL); shown even when the slot is empty', el('div', { class: 'wn-board' }, room('Room A', ['A1', 'A2', 'A3', 'A4', 'A5']), room('Room B', ['B1', 'B2', 'B3', 'B4', 'B5']))),
    card('tray: Windows', 'the Actions tray entry of a seat that sees at least one window', tray),
  ];
}

// ---------- motion players ----------

function motionPlayer(kind) {
  const caption = { show: 'on the artist\'s accepted SHOW_WINDOW receipt', arrive: 'when a drawing is first seen in a window (R7: first sight only)', dark: 'when the clock reaches the Blackout\'s preview deadline (blackout.previewEndsAt), five seconds in', light: 'when the Blackout ends' }[kind];
  return {
    caption: `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · ${caption}`,
    end: reduced => motionEnd(kind, reduced),
    build: stage => {
      const v = view({ seat: 2, feeds: kind === 'show' || kind === 'arrive' ? { ...FEEDS, A_B: FEEDS.A_B.slice(0, 2) } : FEEDS });
      const w = windowsFor(v).find(x => x.windowId === 'A_B');
      const node = windowView(w, v);
      const pane = node.querySelector('.wn-pane');
      const list = pane.querySelector('.wn-feed');
      const incoming = el('li', { class: 'wn-shown' }, el('span', { class: 'wn-tape', 'aria-hidden': 'true' }), drawingNode(DRAW.dots), el('span', { class: 'wn-caption' }, C.caption(3, who(kind === 'arrive' ? 6 : 2))));
      const shade = el('div', { class: 'wn-shade wn-shade--motion' }, el('p', {}, C.dark));
      const ghost = el('div', { class: 'wn-ghost' }, drawingNode(DRAW.dots, 'wn-drawing wn-drawing--pad'));
      const mark = stamp(kind === 'show' ? C.stampShown : kind === 'dark' ? C.stampDark : '');
      if (kind === 'show' || kind === 'arrive') list.append(incoming);
      if (kind === 'dark' || kind === 'light') pane.append(shade);
      const top = el('div', { class: 'lib-strip__top' }, el('span', { class: 'lib-tape' }, C.tapeWindows), el('span', { class: 'lib-stamp-slot' }, mark));
      stage.append(el('div', { class: 'ab-kit lib-strip wn-motion' }, top, node, kind === 'show' ? ghost : null));
      const tape = incoming.querySelector('.wn-tape');
      return {
        seek: (t, reduced) => {
          const F = FRAMES[kind](t, { reduced });
          if (kind === 'show') {
            Object.assign(ghost.style, { opacity: String(F.ghost.opacity), transform: `translateY(${-110 * F.ghost.lift}%) scale(${F.ghost.scale})` });
            Object.assign(incoming.style, { opacity: String(F.landed.opacity), transform: `translateY(${-12 * (1 - F.landed.drop)}px)` });
            Object.assign(mark.style, { opacity: String(F.stamp.opacity), transform: `rotate(${F.stamp.rotate}deg) scale(${F.stamp.scale})` });
          } else if (kind === 'arrive') {
            Object.assign(incoming.style, { opacity: String(F.image.opacity), transform: `translateY(${-12 * (1 - F.image.drop)}px)` });
            tape.style.transform = `translateX(-50%) rotate(-3deg) scaleY(${0.4 + 0.6 * F.tape.press})`;
            mark.style.opacity = '0';
          } else {
            Object.assign(shade.style, { opacity: String(F.shade.opacity), clipPath: `inset(0 0 ${(1 - F.shade.cover) * 100}% 0)` });
            shade.firstChild.style.opacity = String(F.label.opacity);
            mark.style.opacity = kind === 'dark' ? String(F.label.opacity) : '0';
          }
        },
      };
    },
  };
}

// ---------- the page ----------

async function main() {
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [new URL('./assets/windows.art.css', import.meta.url).href, 'windows'],
  ]);
  mountPage({
    title: 'Library group 5: windows and drawing',
    intro: `Every state is computed by states.mjs from a synthetic player view (protocol 3 candidate fields). Three windows (Room A to Room B, Room A to the Hospital, Room B to the Jail); four drawing stations (A1, B1, A2, B2). Ben (2) sits at A1, Cleo (3) at A2, Fay (6) at B1, Eli (5) at B2; Ada (1) and Dev (4) have no station; Hana (8) is in the Hospital, Ivo (9) in the Jail, Gus (7) in the Command Room. The drawings are synthetic claims. Pad states: ${PAD_STATES.join(', ')}. Words are proposals for Frontend.`,
    groups: [
      ['stations', 'At a drawing station: its window with the pad, and the other window', stationCases],
      ['pad', 'The pad (Ben at A1, the window to Room B)', padCases],
      ['viewers', 'Seeing without a station, the Blackout and the next round', viewerCases],
      ['board', 'The board\'s station markers, and the tray', boardCards],
      ['motion', 'Motion (once, on its cause)', () => ['show', 'arrive', 'dark', 'light'].map(kind => player(kind, kind, motionPlayer(kind)))],
    ],
  });
}

main().catch(failed);

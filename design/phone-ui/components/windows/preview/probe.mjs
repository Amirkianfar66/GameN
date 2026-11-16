// mothership:dev-only
//
// Windows' lifecycle probe: it drives the real component (../windows.mjs) in the real phone shell's sheet, in the
// browser, under whatever headers serve the page (design/tools/windows-check.mjs serves the production ones), and
// reports what it saw. Each check is one behaviour Frontend relies on (the Lead's decisions on #299):
//   draw      a finger or a pen draws a stroke; the whole draft is reported once, when it ends, in the chosen ink at the
//             pack's width; points closer than a unit are dropped; a single point is a dot
//   inks      the four inks are a radio group; a tap or the arrows choose one, reported with the draft
//   undo      Undo and Clear report the draft without its last stroke, or empty; on an empty draft they're dimmed
//   keyboard  the arrows move the pen, Shift with an arrow draws, Space makes a dot; the pen's mark only while the
//             keyboard draws; the box named for its window and described by its keys
//   limits    128 strokes, 512 points a stroke and 4096 in all: a stroke past them ends, none starts beyond them, and a
//             drawing beyond them, or with anything but the contract's numbers and colours, is refused
//   footer    Show is the command, off for an empty draft, busy and refused with Frontend's state; Done is this
//             phone's own; the sheet's frame and footer from windowsSheet() for each view
//   views     each window of the room with its drawings; at a station, that window only (decision 2); after a Show,
//             the drawing stamped SHOWN with the others under "Shown this round"; Frontend's "No window here"
//   privacy   the windows, the draft and the shown drawing leave the page when the viewer changes and when concealed,
//             and nothing comes back by itself; the drawn SVG holds only the strokes' own shapes
//   stroke    a stroke being drawn survives an update and ends with one report; leaving the station ends it unreported
//   reconnect drawing, the inks, Undo, Clear and Done still work; Show waits with the banner's words
//   focus     the box keeps its element and the focus; a focus in what ends returns to the content, once
//   layout    the content 16 px in at both sizes, the box at 512 × 280; at the Largest text every word whole, the last
//             part reached by scrolling and the footer in view
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own, with or without Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { DRAWING_LIMITS, INKS, PEN_WIDTH, WINDOWS_WORDS, checkStrokes, drawingSvg, windowsSheet } from '../windows.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runWindowsProbe({ sizes, mountState, disposeState, inputOf, windowsOf, DRAFT, NONE, FACE, ARROW, NUMBER, DEV }) {
  const W = WINDOWS_WORDS;
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  document.body.append(frame);
  const sizeTo = key => { const s = sizes[key]; Object.assign(frame.style, { width: `${s.width}px`, height: `${s.height}px` }); return s; };
  let size = sizeTo('390x844');
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const ON = { enabled: true };
  const at = (station = 'A2') => windowsOf({ station });
  const drawing = (extra = {}) => inputOf({ windows: at(), draft: DRAFT, show: ON, ...extra });
  /** A sheet with every callback recorded; update() moves the component and the shell's frame together, as Frontend does. */
  const mount = (input = drawing(), shellExtra = {}) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const m = mountState(frame, 'draw', size.insets, Object.fromEntries(['onDraft', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    m.shell.update({ sheet: windowsSheet(input), ...shellExtra });
    const root = m.host.element;
    const q = s => root.querySelector(s);
    // As Frontend does: a new viewer's sheet holds nothing of the last viewer's, unless the same update gives the new one's.
    const OWN = ['windows', 'draft', 'shown'];
    const update = (next, extra = {}) => {
      if ('viewer' in next && next.viewer !== current.viewer) current = Object.fromEntries(Object.entries(current).filter(([k]) => !OWN.includes(k) || k in next));
      current = { ...current, ...next };
      m.host.update(next);
      m.shell.update({ sheet: windowsSheet(current), ...extra });
    };
    /** As Frontend does with onDraft: keeps the draft and gives it back. */
    const keep = () => { const d = named(calls, 'onDraft').pop()?.[1]; if (d) update({ draft: d }); return d; };
    return { m, calls, root, q, update, keep, pad: () => q('.ms-wn-pad'), footer: () => [...m.shell.element.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')],
      swatch: name => q(`.ms-wn-swatch[data-ink="${name}"]`), undo: () => q('[data-intent="undo"]'), clear: () => q('[data-intent="clear"]') };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const drafts = calls => named(calls, 'onDraft').map(c => c[1]);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const refused = node => node?.getAttribute('aria-disabled') === 'true';
  const busy = node => node?.getAttribute('aria-busy') === 'true';
  const dimmed = node => node?.hasAttribute('data-off');
  const shown = node => !!node && !node.hidden && node.getClientRects().length > 0 && !node.closest('[hidden]');
  const inPage = text => document.documentElement.outerHTML.includes(text);
  const pageText = () => document.body.innerText;
  /** A finger on the drawing box: down at a point (0 to 1 across and down), through each point, and up. */
  const pointer = (pad, points, { id = 7, up = true } = {}) => {
    const r = pad.getBoundingClientRect();
    const at = ([x, y]) => ({ clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerId: id, pointerType: 'touch', button: 0, isPrimary: true, bubbles: true, cancelable: true });
    pad.dispatchEvent(new PointerEvent('pointerdown', at(points[0])));
    for (const p of points.slice(1)) pad.dispatchEvent(new PointerEvent('pointermove', at(p)));
    if (up) pad.dispatchEvent(new PointerEvent('pointerup', at(points[points.length - 1])));
    return () => pad.dispatchEvent(new PointerEvent('pointerup', at(points[points.length - 1])));
  };
  const line = (from, to, n) => Array.from({ length: n + 1 }, (_, i) => [from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n]);
  const key = (node, k, shift = false, type = 'keydown') => node.dispatchEvent(new KeyboardEvent(type, { key: k, shiftKey: shift, bubbles: true, cancelable: true }));
  const strokesIn = node => [...node.querySelectorAll('.ms-wn-stroke')];
  const gold = INKS[0].color, teal = INKS[2].color;
  const sheetOf = input => windowsSheet(input);
  const strokesOf = (n, points) => Array.from({ length: n }, (_, i) => ({ color: gold, width: PEN_WIDTH, points: Array.from({ length: points }, (_, k) => [(k % 100) / 100, (i % 10) / 10]) }));

  if (!deviceReduced) {
    await check('draw: a finger draws a stroke, reported once with the whole draft, in the ink at the pack\'s width; a point alone is a dot', async () => {
      const s = mount();
      const pad = s.pad();
      const before = strokesIn(pad).length;
      pointer(pad, line([0.1, 0.2], [0.6, 0.7], 10), { up: false });
      const during = { reports: drafts(s.calls).length, live: strokesIn(pad).length };
      pad.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }));
      const d = drafts(s.calls);
      const stroke = d[0]?.strokes[2];
      const whole = d.length === 1 && d[0].windowId === 'A_HOSPITAL' && d[0].ink === gold && d[0].strokes.length === 3
        && JSON.stringify(d[0].strokes.slice(0, 2)) === JSON.stringify(DRAFT.strokes) && stroke.color === gold && stroke.width === 6 && stroke.points.length === 11
        && stroke.points.every(p => p.every(v => v >= 0 && v <= 1)) && Math.abs(stroke.points[0][0] - 0.1) < 0.005 && Math.abs(stroke.points[10][1] - 0.7) < 0.005;
      s.keep();
      // Moves closer than a unit of the 512 are dropped: a still finger leaves a dot.
      pointer(pad, [[0.3, 0.3], [0.3005, 0.3005], [0.3008, 0.301]]);
      const dot = drafts(s.calls)[1]?.strokes[3];
      s.keep();
      const circle = pad.querySelector('circle.ms-wn-stroke');
      const drawn = strokesIn(pad).length;
      disposeState(s.m);
      return { ok: before === 2 && during.reports === 0 && during.live === 3 && whole && dot?.points.length === 1 && circle?.getAttribute('r') === '3' && drawn === 4, before, during, whole, dot, drawn };
    });
    await check('inks: a radio group of the four, Gold first; a tap or the arrows choose one, reported with the draft; the next stroke in it', async () => {
      const s = mount();
      const group = s.q('.ms-wn-inks');
      const names = [...group.querySelectorAll('[role="radio"]')].map(n => n.getAttribute('aria-label'));
      const first = [...group.querySelectorAll('[role="radio"]')].map(n => [n.getAttribute('aria-checked'), n.tabIndex]);
      tap(s.swatch('teal'));
      const chose = drafts(s.calls)[0];
      s.keep();
      const checked = s.swatch('teal').getAttribute('aria-checked') === 'true' && s.swatch('gold').getAttribute('aria-checked') === 'false' && s.swatch('teal').tabIndex === 0 && s.swatch('gold').tabIndex === -1;
      pointer(s.pad(), line([0.2, 0.2], [0.4, 0.4], 4));
      const inTeal = drafts(s.calls)[1]?.strokes.at(-1).color === teal;
      s.keep();
      s.swatch('teal').focus();
      key(s.swatch('teal'), 'ArrowRight'); s.keep();
      key(s.swatch('pink'), 'ArrowRight'); s.keep();
      const arrows = drafts(s.calls).slice(2).map(d => d.ink);
      const focus = document.activeElement === s.swatch('gold');
      // Tapping the chosen ink again reports nothing.
      const count = drafts(s.calls).length;
      tap(s.swatch('gold'));
      const again = drafts(s.calls).length === count;
      disposeState(s.m);
      return { ok: names.join() === 'Gold,Paper,Teal,Pink' && group.getAttribute('aria-label') === W.ink && first[0].join() === 'true,0' && first.slice(1).every(f => f.join() === 'false,-1')
        && chose?.ink === teal && chose.strokes.length === 2 && checked && inTeal && arrows.join() === [INKS[3].color, gold].join() && focus && again, names, first, chose: chose?.ink, checked, inTeal, arrows, focus, again };
    });
    await check('undo: Undo takes the last stroke, Clear them all, each reported; on an empty draft both dimmed, refused and without words', async () => {
      const s = mount();
      tap(s.undo());
      const undone = drafts(s.calls)[0];
      s.keep();
      const drawn = strokesIn(s.pad()).length;
      tap(s.clear());
      const cleared = drafts(s.calls)[1];
      s.keep();
      const empty = { undo: [refused(s.undo()), dimmed(s.undo()), describedBy(s.undo())], clear: [refused(s.clear()), dimmed(s.clear()), describedBy(s.clear())], drawn: strokesIn(s.pad()).length };
      tap(s.undo()); tap(s.clear());
      const none = drafts(s.calls).length === 2;
      disposeState(s.m);
      return { ok: undone?.strokes.length === 1 && JSON.stringify(undone.strokes[0]) === JSON.stringify(DRAFT.strokes[0]) && drawn === 1 && cleared?.strokes.length === 0
        && empty.undo.join() === 'true,true,' && empty.clear.join() === 'true,true,' && empty.drawn === 0 && none, undone: undone?.strokes.length, drawn, cleared: cleared?.strokes.length, empty, none };
    });
    await check('keyboard: the arrows move the pen, Shift with an arrow draws, Space makes a dot; the pen\'s mark only while the keyboard draws', async () => {
      const s = mount(drawing({ draft: null }));
      const pad = s.pad();
      const named = { role: pad.getAttribute('role'), name: pad.getAttribute('aria-label'), keys: describedBy(pad), tab: pad.tabIndex };
      const pen = () => getComputedStyle(pad.querySelector('.ms-wn-pen')).display !== 'none';
      const unseen = pen();
      pad.focus();
      key(pad, 'ArrowRight'); key(pad, 'ArrowDown');
      const moved = { reports: drafts(s.calls).length, pen: pen(), at: [pad.querySelector('.ms-wn-pen').getAttribute('cx'), pad.querySelector('.ms-wn-pen').getAttribute('cy')] };
      key(pad, 'ArrowRight', true); key(pad, 'ArrowRight', true);
      const mid = drafts(s.calls).length;
      key(pad, 'Shift', false, 'keyup');
      const drew = drafts(s.calls)[0]?.strokes[0];
      s.keep();
      key(pad, ' ');
      const dot = drafts(s.calls)[1]?.strokes[1];
      s.keep();
      // A plain arrow after Shift's ends the line too.
      key(pad, 'ArrowUp', true); key(pad, 'ArrowLeft');
      const ended = drafts(s.calls)[2]?.strokes.length === 3;
      s.keep();
      // The finger hides the mark; so does leaving the box.
      pointer(pad, [[0.8, 0.8]]);
      const afterFinger = pen();
      s.keep();
      key(pad, 'ArrowLeft');
      const back = pen();
      pad.blur();
      const afterBlur = pen();
      disposeState(s.m);
      const r = (v, n) => Math.abs(v - n) < 0.0001;
      return { ok: named.role === 'application' && named.name === W.box(['Room A', 'Hospital']) && named.keys === W.keys && named.tab === 0 && !unseen
        && moved.reports === 0 && moved.pen && moved.at.join() === '276.5,151.2' && mid === 0 && drew?.points.length === 3 && r(drew.points[0][0], 0.54) && r(drew.points[2][0], 0.62) && r(drew.points[2][1], 0.54)
        && dot?.points.length === 1 && r(dot.points[0][0], 0.62) && ended && !afterFinger && back && !afterBlur, named, unseen, moved, mid, drew: drew?.points, dot: dot?.points, ended, afterFinger, back, afterBlur };
    });
    await check('limits: a stroke past 512 points or the 4096 ends; none starts past 128 strokes or 4096 points; a drawing beyond them, or not the contract\'s, is refused', async () => {
      const s = mount(drawing({ draft: { windowId: 'A_HOSPITAL', ink: gold, strokes: [] } }));
      const path = Array.from({ length: 600 }, (_, i) => [((i * 7) % 500) / 500, (Math.floor((i * 7) / 500) * 37 % 280) / 280]);
      pointer(s.pad(), path);
      const long = drafts(s.calls);
      s.keep();
      const ended = long.length === 1 && long[0].strokes[0].points.length === DRAWING_LIMITS.points;
      // 4084 points drawn: the next stroke ends at 12, so 4096 in all.
      s.update({ draft: { windowId: 'A_HOSPITAL', ink: gold, strokes: [...strokesOf(7, 512), ...strokesOf(1, 500)] } });
      pointer(s.pad(), path.slice(0, 40));
      const budget = drafts(s.calls)[1]?.strokes;
      s.keep();
      const total = budget?.reduce((n, x) => n + x.points.length, 0);
      const count = drafts(s.calls).length;
      pointer(s.pad(), path.slice(0, 5));
      const noneAtTotal = drafts(s.calls).length === count;
      s.update({ draft: { windowId: 'A_HOSPITAL', ink: gold, strokes: strokesOf(128, 2) } });
      pointer(s.pad(), path.slice(0, 5)); key(s.pad(), ' ');
      const noneAtStrokes = drafts(s.calls).length === count;
      disposeState(s.m);
      const refusedOf = strokes => { try { checkStrokes(strokes); return false; } catch { return true; } };
      const pt = [[0.5, 0.5]];
      const refusals = {
        strokes129: refusedOf(strokesOf(129, 1)), points513: refusedOf(strokesOf(1, 513)), total4097: refusedOf([...strokesOf(8, 512), ...strokesOf(1, 1)]), none: refusedOf([]),
        colour: refusedOf([{ color: 'red', width: 6, points: pt }]), markup: refusedOf([{ color: '#fff"/><script>', width: 6, points: pt }]), width: refusedOf([{ color: gold, width: 30, points: pt }]),
        outside: refusedOf([{ color: gold, width: 6, points: [[1.2, 0.5]]}]), notNumber: refusedOf([{ color: gold, width: 6, points: [['0.5', 0.5]] }]),
        projection: (() => { try { windowsSheet(inputOf({ windows: [{ windowId: 'A_B', rooms: ['Room A', 'Room B'], station: null, drawings: [{ ...FACE, drawing: { strokes: [{ color: 'url(#x)', width: 6, points: pt }] } }] }] })); return false; } catch { return true; } })(),
      };
      const fine = !refusedOf(strokesOf(128, 32)) && !refusedOf([...strokesOf(7, 512), ...strokesOf(1, 512)]);
      return { ok: ended && budget?.at(-1).points.length === 12 && total === DRAWING_LIMITS.total && noneAtTotal && noneAtStrokes && Object.values(refusals).every(Boolean) && fine,
        ended, last: budget?.at(-1).points.length, total, noneAtTotal, noneAtStrokes, refusals, fine };
    });
    await check('footer: Show the command, off for an empty draft, busy and refused with Frontend\'s state; Done this phone\'s own; each view\'s frame', async () => {
      const sheets = {
        draw: sheetOf(drawing()), blank: sheetOf(drawing({ draft: null })), refusedShow: sheetOf(drawing({ show: { enabled: false, reason: 'Not available now' } })),
        busy: sheetOf(drawing({ show: { enabled: true, busy: true } })), shown: sheetOf(inputOf({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id })),
        view: sheetOf(inputOf()), none: sheetOf(inputOf({ windows: [], none: NONE })), otherWindow: sheetOf(drawing({ draft: { ...DRAFT, windowId: 'A_B' } })),
      };
      const sameFrame = Object.values(sheets).every(f => f.id === 'windows' && f.title === W.title && f.back === true && f.close === true && f.detent === 'large');
      const show = sheets.draw.actions[0];
      const s = mount(drawing({ show: { enabled: false, reason: 'Not available now' } }));
      const [offShow] = s.footer();
      const off = { refused: refused(offShow), dimmed: dimmed(offShow), why: describedBy(offShow) };
      s.update({ show: ON });
      tap(s.footer()[0]);
      s.update({ show: { enabled: true, busy: true } });
      const sending = busy(s.footer()[0]);
      tap(s.footer()[0]);
      s.update({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id, show: ON });
      tap(s.footer()[0]);
      const got = named(s.calls, 'onSheetAction').map(c => c[1]).join('|');
      disposeState(s.m);
      return { ok: sameFrame && sheets.draw.actions.length === 1 && show.id === 'show' && show.label === W.show && show.kind === 'primary' && show.icon === 'show' && !show.local && show.enabled
        && sheets.blank.actions[0].enabled === false && sheets.otherWindow.actions[0].enabled === false && sheets.refusedShow.actions[0].enabled === false && sheets.refusedShow.actions[0].reason === 'Not available now'
        && sheets.busy.actions[0].busy === true && sheets.shown.actions.length === 1 && sheets.shown.actions[0].id === 'done' && sheets.shown.actions[0].local === true && sheets.shown.actions[0].kind === 'secondary'
        && sheets.view.actions.length === 0 && sheets.none.actions.length === 0 && off.refused && off.dimmed && off.why === 'Not available now' && sending && got === 'show|done',
        sameFrame, show, off, sending, got };
    });
    await check('views: each window with its drawings; at a station that window only; after a Show, the drawing stamped with the others below; Frontend\'s words for none', async () => {
      const s = mount(inputOf());
      const heads = () => [...s.root.querySelectorAll('.ms-wn-head')].filter(shown).map(h => `${h.firstChild.textContent}|${h.lastChild.textContent}`);
      const metas = () => [...s.root.querySelectorAll('.ms-wn-meta')].filter(shown).map(m => [...m.children].map(c => c.textContent).join('|'));
      const labels = () => [...s.root.querySelectorAll('.ms-k-group-label')].filter(shown).map(n => n.textContent);
      const view = { heads: heads(), metas: metas(), labels: labels(), pad: !!s.pad() };
      s.update({ windows: at() });
      const station = { heads: heads(), metas: metas(), labels: labels(), pad: !!s.pad(), otherGone: !pageText().includes('Hana') };
      s.update({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id });
      const stamp = s.q('.ms-wn-stamp .ms-k-stamp');
      const stamped = { heads: heads(), metas: metas(), labels: labels(), stamp: stamp?.textContent, on: stamp?.closest('.ms-wn-drawing')?.querySelector('.ms-wn-meta')?.textContent, pad: !!s.pad() };
      s.update({ view: 'windows', shown: null, windows: [{ windowId: 'A_HOSPITAL', rooms: ['Room A', 'Hospital'], station: 'A2', drawings: [] }], draft: null });
      const alone = { labels: labels(), metas: metas() };
      s.update({ windows: [], none: NONE });
      const wait = s.q('.ms-k-wait');
      const none = [wait?.querySelector('.ms-k-wait-title').textContent, wait?.querySelector('.ms-k-wait-line').textContent, wait?.querySelector('.ms-k-wait-tile svg') !== null];
      s.update({ none: { title: 'No window here', line: 'The windows close until the ship stops' } });
      const closed = s.q('.ms-k-wait-line').textContent;
      s.update({ none: null });
      const nothing = s.root.querySelectorAll('.ms-k-wait, .ms-wn-window').length;
      s.update({ windows: [{ windowId: 'A_B', rooms: ['Room A', 'Room B'], station: null, drawings: [FACE, { ...NUMBER, windowId: 'A_B', order: 1 }] }] });
      const own = metas();
      disposeState(s.m);
      return { ok: view.heads.join() === 'Room A ↔ Room B|Ends with the round,Room A ↔ Hospital|Ends with the round' && view.metas.join() === '1 · Hana · Round 3|Unverified,1 · Eli · Round 3|Unverified' && view.labels.length === 0 && !view.pad
        && station.heads.join() === 'Room A ↔ Hospital|Your station · A2' && station.metas.join() === '1 · Eli · Round 3|Unverified' && station.labels.join() === W.shownThisRound && station.pad && station.otherGone
        && stamped.heads.join() === station.heads.join() && stamped.metas.join() === '2 · Dev · Round 3|Can’t be changed,1 · Eli · Round 3|Unverified' && stamped.stamp === 'SHOWN' && stamped.on === '2 · Dev · Round 3Can’t be changed' && !stamped.pad && stamped.labels.join() === W.shownThisRound
        && alone.labels.length === 0 && alone.metas.length === 0 && none.join() === 'No window here,The Command Room has no window,true' && closed === 'The windows close until the ship stops' && nothing === 0
        && own.join() === '1 · Hana · Round 3|Unverified,2 · Dev · Round 3|Can’t be changed', view, station, stamped, alone, none, closed, nothing, own };
    });
    await check('privacy: the windows, the draft and the shown drawing leave the page when the viewer changes and when concealed; nothing comes back by itself; only the strokes\' shapes are drawn', async () => {
      const s = mount();
      const before = strokesIn(s.root).length;
      s.update({ viewer: 5 });
      const viewerGone = { strokes: strokesIn(s.root).length, eli: inPage('1 · Eli · Round 3'), pad: !!s.pad() };
      s.update({ status: 'live' });
      const stillGone = strokesIn(s.root).length === 0 && !inPage('1 · Eli · Round 3');
      s.update({ viewer: 4, windows: at(), draft: DRAFT });
      const given = strokesIn(s.root).length;
      s.update({ status: 'concealed' });
      const concealed = { strokes: strokesIn(s.root).length, words: s.root.innerText.trim(), foot: s.footer().length };
      s.update({ status: 'live' });
      const back = { strokes: strokesIn(s.root).length, eli: inPage('1 · Eli · Round 3') };
      s.update({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id });
      s.update({ viewer: 5 });
      const shownGone = { view: s.root.dataset.view, stamp: !!s.q('.ms-wn-stamp') };
      disposeState(s.m);
      const throws = fn => { try { fn(); return false; } catch { return true; } };
      const notOwn = throws(() => windowsSheet(inputOf({ view: 'shown', viewer: 5, windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id })));
      const missing = throws(() => windowsSheet(inputOf({ view: 'shown', windows: windowsOf({ station: 'A2' }), shown: NUMBER.id })));
      const noStation = throws(() => windowsSheet(inputOf({ view: 'shown', windows: windowsOf({ shown: true }), shown: NUMBER.id })));
      const twoStations = throws(() => windowsSheet(inputOf({ windows: windowsOf({ station: 'A2' }).map(w => ({ ...w, station: 'A2' })) })));
      // The drawn SVG: only svg, g, path and circle, with only the strokes' own attributes.
      const svg = drawingSvg(document, FACE.drawing);
      const tags = new Set([svg, ...svg.querySelectorAll('*')].map(n => n.tagName));
      const attrs = new Set([...svg.querySelectorAll('*')].flatMap(n => [...n.attributes].map(a => a.name)));
      const allowed = ['class', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'cx', 'cy', 'r'];
      return { ok: before === 4 && viewerGone.strokes === 0 && !viewerGone.eli && !viewerGone.pad && stillGone && given === 4 && concealed.strokes === 0 && concealed.words === '' && concealed.foot === 0
        && back.strokes === 0 && !back.eli && shownGone.view !== 'shown' && !shownGone.stamp && notOwn && missing && noStation && twoStations
        && [...tags].every(t => ['svg', 'g', 'path', 'circle'].includes(t)) && [...attrs].every(a => allowed.includes(a)),
        before, viewerGone, stillGone, given, concealed, back, shownGone, notOwn, missing, noStation, twoStations, tags: [...tags], attrs: [...attrs] };
    });
    await check('stroke: a stroke being drawn survives an update and ends with one report; leaving the station, or concealed, ends it unreported', async () => {
      const s = mount();
      const pad = s.pad();
      const up = pointer(pad, line([0.1, 0.1], [0.3, 0.3], 4), { up: false });
      s.update({ show: { enabled: true, busy: true } });
      s.update({ show: ON, draft: DRAFT });
      const survived = { pad: s.pad() === pad, live: strokesIn(pad).length };
      up();
      const one = drafts(s.calls);
      s.keep();
      const up2 = pointer(pad, line([0.5, 0.5], [0.7, 0.6], 3), { up: false });
      s.update({ windows: windowsOf() });
      up2();
      const left = drafts(s.calls).length === 1 && !s.pad();
      s.update({ windows: at() });
      const up3 = pointer(s.pad(), line([0.5, 0.5], [0.7, 0.6], 3), { up: false });
      s.update({ status: 'concealed' });
      s.update({ status: 'live', windows: at(), draft: DRAFT });
      up3();
      const hidden = drafts(s.calls).length === 1;
      disposeState(s.m);
      return { ok: survived.pad && survived.live === 3 && one.length === 1 && one[0].strokes.length === 3 && one[0].strokes[2].points.length === 5 && left && hidden, survived, one: one.length, left, hidden };
    });
    await check('reconnect: drawing, the inks, Undo, Clear and Done still work; Show waits with the banner\'s words', async () => {
      const stale = { status: 'stale', banner: { kind: 'reconnecting' } };
      const s = mount(drawing({ status: 'stale' }), stale);
      pointer(s.pad(), line([0.2, 0.2], [0.5, 0.3], 3)); s.keep();
      tap(s.swatch('pink')); s.keep();
      const [show] = s.footer();
      tap(show);
      const wait = { refused: refused(show), dimmed: dimmed(show), why: describedBy(show) };
      tap(s.undo()); s.keep();
      tap(s.clear()); s.keep();
      s.update({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id }, stale);
      tap(s.footer()[0]);
      const got = [...drafts(s.calls).map(d => `${d.ink}:${d.strokes.length}`), ...named(s.calls, 'onSheetAction').map(c => c[1])];
      disposeState(s.m);
      const waits = 'Controls return when the match is current';
      // While not interactive, nothing is taken.
      const t = mount(drawing({ interactive: false }));
      pointer(t.pad(), line([0.2, 0.2], [0.5, 0.3], 3)); tap(t.swatch('pink')); tap(t.undo()); key(t.pad(), ' ');
      const still = drafts(t.calls).length === 0 && refused(t.swatch('pink')) && t.pad().getAttribute('aria-disabled') === 'true';
      disposeState(t.m);
      return { ok: got.join('|') === `${gold}:3|${INKS[3].color}:3|${INKS[3].color}:2|${INKS[3].color}:0|done` && wait.refused && !wait.dimmed && wait.why === waits && still, got, wait, still };
    });
    await check('focus: the box keeps its element and the focus through updates; a focused Undo that leaves returns the focus once', async () => {
      const s = mount();
      const pad = s.pad();
      pad.focus();
      s.update({ draft: { ...DRAFT, strokes: DRAFT.strokes.slice(0, 1) } });
      s.update({ show: { enabled: true, busy: true } });
      const kept = s.pad() === pad && document.activeElement === pad && strokesIn(pad).length === 1;
      s.undo().focus();
      s.update({ windows: windowsOf() });
      await Promise.resolve(); await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      disposeState(s.m);
      return { ok: kept && active && returns.length === 1 && returns[0][1]?.intent === 'undo', kept, active, returns };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the content 16 px in, the drawing box at 512 × 280, the inks 34 px`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        await frames();
        const r = () => frame.getBoundingClientRect();
        const inset = n => { const b = n.getBoundingClientRect(); return [b.left - r().left, r().right - b.right]; };
        const pad = s.pad().getBoundingClientRect();
        const ratio = pad.width / pad.height;
        const padIn = inset(s.pad()), metaIn = inset(s.q('.ms-wn-meta'));
        const inks = [...s.root.querySelectorAll('.ms-wn-swatch')].map(n => n.getBoundingClientRect().width);
        s.update({ windows: windowsOf() });
        await frames();
        const boxes = [...s.root.querySelectorAll('.ms-wn-box')].map(inset);
        disposeState(s.m);
        const sixteen = v => v.every(x => Math.abs(x - 16) < 0.5);
        return { ok: sixteen(padIn) && boxes.length === 2 && boxes.every(sixteen) && Math.abs(ratio - 512 / 280) < 0.01 && metaIn.every(x => Math.abs(x - 18) < 0.5) && inks.every(w => Math.abs(w - 34) < 0.5),
          padIn, metaIn, boxes, ratio, inks };
      });
    }
    size = sizeTo('390x844');
    for (const [which, input] of [['drawing at the station', drawing()], ['the shown drawing', inputOf({ view: 'shown', windows: windowsOf({ station: 'A2', shown: true }), shown: NUMBER.id })], ['the room\'s windows', inputOf()]]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling, the footer in view`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input);
        await frames();
        const parts = [...s.root.querySelectorAll('.ms-wn-head-title, .ms-wn-head-aside, .ms-wn-meta > span, .ms-k-group-label, .ms-k-stamp')].filter(shown);
        const cut = parts.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const overlap = [...s.root.querySelectorAll('.ms-wn-meta, .ms-wn-head')].filter(shown).filter(m => { const [a, b] = [...m.children].map(c => c.getBoundingClientRect()); return a.right > b.left + 0.5 && a.bottom > b.top + 0.5; }).map(m => m.textContent);
        const body = s.m.shell.sheetBody, last = [...s.root.querySelectorAll('.ms-wn-drawing, .ms-wn-tools')].filter(shown).pop();
        last.scrollIntoView({ block: 'end' });
        await frames();
        const reachable = last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5;
        const foot = s.footer().every(b => b.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom + 0.5);
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: parts.length > 0 && cut.length === 0 && overlap.length === 0 && reachable && foot, parts: parts.length, cut, overlap, reachable, foot };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount();
      const body = s.m.shell.sheetBody;
      const pad = s.pad(), swatch = s.swatch('teal');
      s.m.host.dispose(); s.m.host.dispose();
      pointer(pad, line([0.1, 0.1], [0.3, 0.3], 3)); tap(swatch); key(pad, ' ');
      s.m.host.update({ windows: windowsOf() });
      const seen = { body: body.children.length, calls: drafts(s.calls).length, connected: s.root.isConnected, eli: !!document.querySelector('.ms-wn-meta') };
      disposeState(s.m);
      const left = [...frame.children].map(n => n.className || n.tagName);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && !seen.eli && left.length === 0, seen, left };
    });
  }
  await check(`motion: none of its own${deviceReduced ? ', with the device\'s Reduce motion' : ', with or without the game\'s Reduce motion'}`, async () => {
    const s = mount();
    await frames();
    const own = () => s.root.getAnimations({ subtree: true }).length;
    const first = own();
    tap(s.swatch('teal')); s.keep();
    pointer(s.pad(), line([0.2, 0.2], [0.5, 0.3], 3)); s.keep();
    const drawn = own();
    s.m.host.update({ reducedMotion: true });
    const reduced = { own: own(), mode: s.root.dataset.motion };
    disposeState(s.m);
    return { ok: first === 0 && drawn === 0 && reduced.own === 0 && reduced.mode === 'reduced', first, drawn, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

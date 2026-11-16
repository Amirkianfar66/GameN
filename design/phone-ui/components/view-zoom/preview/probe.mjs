// mothership:dev-only
//
// The Room ↔ Board zoom's probe: it drives the real component (../view-zoom.mjs) between the room scene and the pack's
// board, in the browser, under whatever headers serve the page (design/tools/view-zoom-check.mjs serves the
// production ones), and reports what it saw. Each check is one thing Frontend or the Lead relies on:
//   frames     Room → Board starts with the viewer's room's panel covering the stage, centred, and ends at the
//              board's own layout; the room view starts whole and ends set into the panel. Board → Room is the reverse.
//   timing     450 ms on the kit's ease; the room view's 180 ms fade, first going to the board and last coming back
//   crossfade  with no room, both views fade over 220 ms and nothing scales
//   direct     with the game's Reduce motion, with the device's (emulated), and with a held Blackout window (true, or
//              the window's id): no animation, nothing set, finished says 'direct'
//   taps       the outgoing view takes no tap from the start; the incoming view takes them throughout
//   partway    cancel() says 'cancelled'; a new switch partway takes over from where the views are
//   clean      when it settles, or on cancel, no animation and no style of the zoom's is left on either view
//   inputs     a bad direction, panel, hold, Reduce motion, or the same element twice is an error

import { ZOOM_TIMING, zoomGeometry, zoomRoomBoard } from '../view-zoom.mjs';
import { STAGES, mountStage, switchTo } from './preview.mjs';

const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
/** A computed transform as { s, tx, ty } (a scale and a translation, as the zoom sets them). */
function matrix(el) {
  const t = getComputedStyle(el).transform;
  if (t === 'none') return { s: 1, tx: 0, ty: 0 };
  const m = t.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number);
  return m ? { s: m[0], tx: m[4], ty: m[5] } : null;
}
/** Holds every animation on both views at t ms. */
function at(s, t) { for (const a of [...s.room.getAnimations(), ...s.board.getAnimations()]) { a.pause(); a.currentTime = t; } }
const own = el => ({ transform: el.style.transform, opacity: el.style.opacity, pointerEvents: el.style.pointerEvents, zIndex: el.style.zIndex, transformOrigin: el.style.transformOrigin });

export async function runViewZoomProbe() {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const stage = async (view = 'room', sizeKey = '390x844') => { const s = mountStage(document.body, sizeKey, { view }); await document.fonts.ready; await frames(); return s; };

  if (deviceReduced) {
    // With the device's Reduce motion, only the direct check runs (the page's mode says which).
    await check('direct', async () => {
      const s = await stage();
      const before = [own(s.room), own(s.board)];
      const z = switchTo(s, 'board');
      const animations = s.room.getAnimations().length + s.board.getAnimations().length;
      const outcome = await z.finished;
      const after = [own(s.room), own(s.board)];
      s.dispose();
      return { ok: outcome === 'direct' && animations === 0 && JSON.stringify(before) === JSON.stringify(after), outcome, animations };
    });
    return { mode: 'device-reduced', ok: checks.every(c => c.ok), checks };
  }

  await check('frames', async () => {
    const results = {};
    for (const sizeKey of Object.keys(STAGES)) {
      const s = await stage('room', sizeKey);
      const there = switchTo(s, 'board');
      const panel = s.panel(), stageBox = { width: s.board.offsetWidth, height: s.board.offsetHeight };
      const g = zoomGeometry(stageBox, panel);
      at(s, 0);
      const start = { board: matrix(s.board), room: matrix(s.room), roomOpacity: Number(getComputedStyle(s.room).opacity) };
      // At the start the panel covers the stage, centred: its box, scaled, holds the stage.
      const covered = { left: start.board.tx + panel.left * start.board.s, top: start.board.ty + panel.top * start.board.s, width: panel.width * start.board.s, height: panel.height * start.board.s };
      at(s, ZOOM_TIMING.zoom);
      const end = { board: matrix(s.board), room: matrix(s.room), roomOpacity: Number(getComputedStyle(s.room).opacity) };
      there.cancel();
      await there.finished;
      // And back.
      s.room.hidden = true;
      const back = switchTo(s, 'room');
      at(s, 0);
      const backStart = { board: matrix(s.board), room: matrix(s.room), roomOpacity: Number(getComputedStyle(s.room).opacity) };
      at(s, ZOOM_TIMING.zoom);
      const backEnd = { board: matrix(s.board), room: matrix(s.room), roomOpacity: Number(getComputedStyle(s.room).opacity) };
      back.cancel();
      await back.finished;
      s.dispose();
      const holds = covered.left <= 0.5 && covered.top <= 0.5 && covered.left + covered.width >= stageBox.width - 0.5 && covered.top + covered.height >= stageBox.height - 0.5;
      const centred = near(covered.left + covered.width / 2, stageBox.width / 2) && near(covered.top + covered.height / 2, stageBox.height / 2);
      const ok = near(start.board.s, g.scale, 0.001) && holds && centred && near(start.room.s, 1, 0.001) && start.roomOpacity === 1
        && near(end.board.s, 1, 0.001) && near(end.board.tx, 0) && near(end.board.ty, 0) && near(end.room.s, 1 / g.scale, 0.001) && end.roomOpacity === 0
        && near(backStart.board.s, 1, 0.001) && near(backStart.room.s, 1 / g.scale, 0.001) && backStart.roomOpacity === 0
        && near(backEnd.board.s, g.scale, 0.001) && near(backEnd.room.s, 1, 0.001) && near(backEnd.room.tx, 0) && backEnd.roomOpacity === 1;
      results[sizeKey] = { ok, panel, scale: g.scale, covered, holds, centred, start, end, backStart, backEnd };
    }
    return { ok: Object.values(results).every(r => r.ok), ...results };
  });

  await check('timing', async () => {
    const s = await stage();
    const toBoard = switchTo(s, 'board');
    const timings = el => el.getAnimations().map(a => { const t = a.effect.getTiming(); return { duration: t.duration, delay: t.delay, easing: t.easing, props: Object.keys(a.effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',') }; });
    const board = timings(s.board), room = timings(s.room);
    toBoard.cancel();
    await toBoard.finished;
    s.room.hidden = true;
    const toRoom = switchTo(s, 'room');
    const back = timings(s.room);
    toRoom.cancel();
    s.dispose();
    const ease = ZOOM_TIMING.ease;
    const ok = board.length === 1 && board[0].duration === 450 && board[0].easing === ease && board[0].props.includes('transform')
      && room.some(t => t.duration === 450 && t.props.includes('transform')) && room.some(t => t.duration === 180 && t.delay === 0 && t.props === 'opacity')
      && back.some(t => t.duration === 180 && t.delay === 270 && t.props === 'opacity') && [...board, ...room, ...back].every(t => t.easing === ease);
    return { ok, board, room, back };
  });

  await check('crossfade', async () => {
    const s = await stage();
    switchTo(s, 'board', { panel: null });
    const all = [...s.room.getAnimations(), ...s.board.getAnimations()];
    const shape = all.map(a => ({ duration: a.effect.getTiming().duration, props: Object.keys(a.effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',') }));
    at(s, 110);
    const mid = { room: Number(getComputedStyle(s.room).opacity), board: Number(getComputedStyle(s.board).opacity), scaled: matrix(s.board).s !== 1 || matrix(s.room).s !== 1 };
    for (const a of all) a.cancel();
    s.dispose();
    return { ok: shape.length === 2 && shape.every(x => x.duration === 220 && x.props === 'opacity') && mid.room > 0 && mid.room < 1 && mid.board > 0 && mid.board < 1 && !mid.scaled, shape, mid };
  });

  await check('direct', async () => {
    const results = {};
    for (const [name, options] of [['game Reduce motion', { reducedMotion: true }], ['held window', { hold: true }], ['held window id', { hold: 'blackout-r3' }]]) {
      const s = await stage();
      const before = [own(s.room), own(s.board)];
      const z = switchTo(s, 'board', options);
      const animations = s.room.getAnimations().length + s.board.getAnimations().length;
      const outcome = await z.finished;
      results[name] = { outcome, animations, untouched: JSON.stringify(before) === JSON.stringify([own(s.room), own(s.board)]) };
      s.dispose();
    }
    return { ok: Object.values(results).every(r => r.outcome === 'direct' && r.animations === 0 && r.untouched), ...results };
  });

  await check('taps', async () => {
    const s = await stage();
    const rect = s.stage.getBoundingClientRect();
    const hitAt = (x, y) => { const n = document.elementFromPoint(rect.left + x, rect.top + y); return n?.closest('.pv-room') ? 'room' : n?.closest('.pv-board') ? 'board' : null; };
    const z = switchTo(s, 'board');
    const panel = s.panel(), cx = panel.left + panel.width / 2, cy = panel.top + panel.height / 2;
    at(s, 0);
    // At once the room view (outgoing) takes none, though it still covers the stage; the board takes them.
    const toBoard = { roomEvents: getComputedStyle(s.room).pointerEvents, start: hitAt(cx, cy) };
    at(s, 300);
    toBoard.later = hitAt(cx, cy);
    z.cancel();
    await z.finished;
    s.room.hidden = true;
    const back = switchTo(s, 'room');
    at(s, 0);
    const toRoom = { boardEvents: getComputedStyle(s.board).pointerEvents, start: hitAt(cx, cy) };
    at(s, 300);
    toRoom.later = hitAt(cx, cy);
    back.cancel();
    s.dispose();
    return { ok: toBoard.roomEvents === 'none' && toBoard.start === 'board' && toBoard.later === 'board' && toRoom.boardEvents === 'none' && toRoom.start === 'room' && toRoom.later === 'room', toBoard, toRoom };
  });

  await check('partway', async () => {
    const s = await stage();
    const first = switchTo(s, 'board');
    at(s, 225);
    const mid = { board: matrix(s.board), room: matrix(s.room) };
    // The player taps Room again halfway: the new switch starts from where the views are.
    s.room.hidden = false;
    const second = switchTo(s, 'room');
    const firstOutcome = await first.finished;
    at(s, 0);
    const resumed = { board: matrix(s.board), room: matrix(s.room) };
    second.cancel();
    const secondOutcome = await second.finished;
    s.dispose();
    const same = (a, b) => near(a.s, b.s, 0.002) && near(a.tx, b.tx, 1) && near(a.ty, b.ty, 1);
    return { ok: firstOutcome === 'cancelled' && secondOutcome === 'cancelled' && same(mid.board, resumed.board) && same(mid.room, resumed.room), firstOutcome, secondOutcome, mid, resumed };
  });

  await check('clean', async () => {
    const s = await stage();
    s.room.style.zIndex = '2';
    const before = [own(s.room), own(s.board)];
    const z = switchTo(s, 'board');
    const during = [own(s.room), own(s.board)];
    for (const a of [...s.room.getAnimations(), ...s.board.getAnimations()]) a.finish();
    const outcome = await z.finished;
    const after = { styles: [own(s.room), own(s.board)], animations: s.room.getAnimations().length + s.board.getAnimations().length };
    // And after a cancel.
    s.room.hidden = false;
    const again = switchTo(s, 'room');
    again.cancel();
    const cancelled = await again.finished;
    const afterCancel = { styles: [own(s.room), own(s.board)], animations: s.room.getAnimations().length + s.board.getAnimations().length };
    s.dispose();
    const ok = outcome === 'done' && cancelled === 'cancelled' && during[0].pointerEvents === 'none' && during[0].zIndex !== '2'
      && JSON.stringify(after.styles) === JSON.stringify(before) && after.animations === 0 && JSON.stringify(afterCancel.styles) === JSON.stringify(before) && afterCancel.animations === 0;
    return { ok, outcome, cancelled, before, during, after, afterCancel };
  });

  await check('inputs', async () => {
    const a = document.createElement('div'), b = document.createElement('div');
    const errors = [];
    const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
    const base = { room: a, board: b, panel: { left: 0, top: 0, width: 100, height: 100 }, to: 'board' };
    expectError('a bad direction', () => zoomRoomBoard({ ...base, to: 'up' }));
    expectError('a bad panel', () => zoomRoomBoard({ ...base, panel: { left: 0, top: 0, width: 0, height: 10 } }));
    expectError('a bad hold', () => zoomRoomBoard({ ...base, hold: 3 }));
    expectError('a bad Reduce motion', () => zoomRoomBoard({ ...base, reducedMotion: 'yes' }));
    expectError('the same element twice', () => zoomRoomBoard({ ...base, board: a }));
    expectError('no element', () => zoomRoomBoard({ ...base, room: {} }));
    return { ok: errors.every(([, thrown]) => thrown), errors };
  });

  return { mode: 'full', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

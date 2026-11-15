// mothership:dev-only
//
// The ship travel's lifecycle probe (index.html?probe=1): the runtime component itself (../ship-travel.mjs,
// unchanged), mounted on a synthetic window with a clock the probe moves, in the real DOM with the real styles. It
// checks what the agreed interface promises (#269):
//   time      every moment shows the clock's frame; a late phone shows the clock's moment and replays nothing; two
//             phones on one clock draw the same picture; the film follows the clock frame by frame, holds its last
//             picture at the end, and never reports anything; a new window is a new film; a short window's beats fit
//   still     "moved", Reduce motion, no clock and no window show the still, the approved poster's pose
//   reduced   the game's setting (data-motion="reduced") and the device's: the still, one 80 ms fade, no frames
//   lifecycle suspend and resume, stale and live, concealed and shown, dispose twice; one frame loop at most
//   privacy   any input the film does not know is refused, and nothing it draws names a course
// With the device's Reduce motion (the check emulates it), it checks that setting too.
// design/tools/ship-travel-check.mjs runs it under the production headers and records each result.
// Desktop Chromium: not a phone, not Safari, not a screen reader.

import { CAPTIONS, LABELS, REDUCED_FADE_MS, STILL, mountShipTravel, shipTravelFrame } from '../ship-travel.mjs';
import { f } from '../ship-art.mjs';

// The page's own frame functions: the probe waits on these, and counts only what the films ask for.
const nativeRaf = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);
const frames = n => new Promise(done => { const step = k => (k ? nativeRaf(() => step(k - 1)) : done()); step(n); });
const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
const windowAt = (id, start = EPOCH, length = 15000) => ({ id, startedAt: start, endsAt: start + length });

/** What a film shows, read from its DOM: the depths' drift, the ship's move, the streaks, the opening cover. */
function drawn(film) {
  const root = film.element;
  return {
    depths: [...root.querySelectorAll('.ms-st-depth')].map(g => g.getAttribute('transform')),
    ship: root.querySelector('.ms-st-ship').style.transform,
    streaks: root.querySelector('.ms-st-streaks').innerHTML.length,
    streakPaths: root.querySelector('.ms-st-streaks').querySelectorAll('path').length,
    open: root.querySelector('.ms-st-open').style.opacity,
  };
}
/** The DOM a frame should give: each depth's drift, rounded as the film writes it. */
const depthsOf = frame => frame.drift.map(d => `translate(${f(d)} 0)`);

export async function runShipTravelProbe() {
  const checks = [];
  const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, detail }); };
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'relative', width: '390px', height: '711px', overflow: 'hidden' });
  document.body.append(host);
  // Count the frames the films ask for (a still film asks for none), and how many are waiting at once.
  let requested = 0;
  const waiting = new Set();
  const original = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame };
  window.requestAnimationFrame = callback => {
    requested += 1;
    const id = nativeRaf(time => { waiting.delete(id); callback(time); });
    waiting.add(id);
    return id;
  };
  window.cancelAnimationFrame = id => { waiting.delete(id); nativeCancel(id); };
  const restore = () => { window.requestAnimationFrame = original.request; window.cancelAnimationFrame = original.cancel; };
  let now = EPOCH;
  const clock = { now: () => now };
  const base = { window: windowAt('w1'), clock, size: { width: 390, height: 711 }, insets: { top: 99, bottom: 34 } };
  const mount = (input = {}) => mountShipTravel(host, { ...base, ...input });
  const guarded = async (group, run) => {
    try { await run(); } catch (error) { check(`${group}: ran without an exception`, false, { error: String(error?.stack ?? error) }); }
    host.replaceChildren();
  };

  if (deviceReduced) {
    await guarded('device', async () => {
      now = EPOCH + 4000;
      const film = mount();
      await frames(3);
      const before = requested;
      now += 2000;
      await frames(4);
      const fr = film.frame(), d = drawn(film);
      check('device Reduce motion: the still, with the game\'s setting off', fr.still && fr.reduced && !fr.running && d.ship === '' && d.depths.every(v => v === 'translate(0 0)'), { frame: fr, drawn: d });
      check('device Reduce motion: no frames are asked for', requested === before, { requested: requested - before });
      check('device Reduce motion: the still comes in with one 80 ms fade', film.element.hasAttribute('data-fade') && !film.element.dataset.motion
        && film.element.getAnimations().some(a => a.effect?.getTiming().duration === REDUCED_FADE_MS), { motion: film.element.dataset.motion ?? null });
      film.update({ state: 'moved' });
      check('device Reduce motion: "moved" is the still with its caption', film.frame().still && film.element.querySelector('.ms-k-pill').textContent === CAPTIONS.moved);
      film.dispose();
    });
    restore();
    host.remove();
    return { mode: 'device-reduced', ok: checks.every(c => c.ok), checks };
  }

  await guarded('time', async () => {
    // Each moment: the clock's frame, clamped to the window.
    const moments = [[-500, 0, 'enter'], [0, 0, 'enter'], [600, 600, 'enter'], [1200, 1200, 'cruise'], [4000, 4000, 'cruise'], [13800, 13800, 'settle'], [14400, 14400, 'settle'], [15000, 15000, 'still'], [21000, 15000, 'still']];
    const seen = [];
    for (const [at, t, beat] of moments) {
      now = EPOCH + at;
      const film = mount();
      film.suspend();
      const fr = film.frame(), d = drawn(film), want = shipTravelFrame(t);
      seen.push({ at, t: fr.t, beat: fr.beat, ok: fr.t === t && fr.beat === beat && JSON.stringify(d.depths) === JSON.stringify(depthsOf(want)) });
      film.dispose();
    }
    check('time: each moment shows the clock\'s frame, clamped to the window', seen.every(s => s.ok), { seen });

    // A late phone: the clock's moment at once, no entry replayed.
    now = EPOCH + 9000;
    const late = mount();
    const fr = late.frame(), d = drawn(late);
    const dy = shipTravelFrame(9000).y - STILL.y;
    const moved = (d.ship.match(/-?[\d.]+(?=px)/g) ?? ['0', '0']).map(Number);
    check('time: a phone that opens at 9 s shows 9 s at once, and the ship is already there', fr.t === 9000 && fr.beat === 'cruise' && d.open === '0'
      && moved[0] === 0 && Math.abs(dy) > 0 && moved[1] !== 0, { frame: fr, ship: d.ship });
    late.dispose();

    // Two phones on one clock draw the same picture.
    now = EPOCH + 6200;
    const a = mount(), b = mount();
    const same = JSON.stringify(drawn(a)) === JSON.stringify(drawn(b)) && a.frame().t === b.frame().t;
    check('time: two phones on the same clock draw the same picture', same, { a: drawn(a).depths, b: drawn(b).depths });
    a.dispose(); b.dispose();

    // It follows the clock frame by frame, then holds the last picture.
    now = EPOCH + 2000;
    const film = mount();
    const ts = [];
    for (let i = 0; i < 6; i += 1) { now += 400; await frames(1); ts.push(film.frame().t); }
    check('time: it follows the trusted clock, frame by frame', film.frame().running && ts.every((t, i) => t === 2400 + i * 400), { ts });
    now = EPOCH + 17000;
    await frames(2);
    const end = film.frame();
    const before = requested;
    await frames(4);
    check('time: at the end it holds the last picture, the still, and asks for no more frames', end.beat === 'still' && end.still && !end.running && requested === before,
      { frame: end, requested: requested - before });
    check('time: the film\'s last picture is the poster\'s pose', drawn(film).ship === '' && drawn(film).depths.every(v => v === 'translate(0 0)') && drawn(film).open === '0', { drawn: drawn(film) });

    // A new window is a new film, from its own start.
    film.update({ window: windowAt('w2', EPOCH + 16000) });
    await frames(1);
    check('time: a new window is a new film, from its own start', film.frame().window === 'w2' && film.frame().t === 1000 && film.frame().running, { frame: film.frame() });
    film.dispose();

    // A short window: enter and settle scale to fit.
    now = EPOCH + 999;
    const short = mount({ window: windowAt('w-short', EPOCH, 2000) });
    short.suspend();
    const s1 = short.frame().beat;
    short.dispose();
    now = EPOCH + 1000;
    const short2 = mount({ window: windowAt('w-short', EPOCH, 2000) });
    short2.suspend();
    const s2 = short2.frame().beat;
    short2.dispose();
    check('time: a 2 s window enters for 1 s and settles for 1 s', s1 === 'enter' && s2 === 'settle', { at999: s1, at1000: s2 });
  });

  await guarded('still', async () => {
    now = EPOCH + 4000;
    const moved = mount({ state: 'moved' });
    const m = moved.frame(), md = drawn(moved);
    check('still: "moved" shows the still, the poster\'s pose, with its caption and name', m.still && !m.running && md.ship === '' && md.depths.every(v => v === 'translate(0 0)')
      && moved.element.querySelector('.ms-k-pill').textContent === CAPTIONS.moved && moved.element.getAttribute('aria-label') === LABELS.moved, { frame: m, drawn: md });
    moved.dispose();
    const noClock = mount({ clock: null }), noWindow = mount({ window: null });
    check('still: with no trusted clock, or no window, the still, the same on every phone', noClock.frame().still && noWindow.frame().still && !noClock.frame().running
      && JSON.stringify(drawn(noClock)) === JSON.stringify(drawn(noWindow)), { noClock: noClock.frame(), noWindow: noWindow.frame() });
    noClock.dispose(); noWindow.dispose();
  });

  await guarded('reduced', async () => {
    now = EPOCH + 5000;
    const film = mount();
    await frames(2);
    film.update({ reducedMotion: true });
    const before = requested;
    now += 1500;
    await frames(4);
    const fr = film.frame();
    check('reduced: the game\'s Reduce motion shows the still, marked data-motion="reduced", and asks for no frames', fr.still && !fr.running && film.element.dataset.motion === 'reduced'
      && requested === before && drawn(film).ship === '', { frame: fr, requested: requested - before });
    check('reduced: the still comes in with one 80 ms fade, and nothing else moves', film.element.getAnimations({ subtree: true }).every(a => a.effect?.getTiming().duration === REDUCED_FADE_MS)
      && film.element.getAnimations().length === 1, { animations: film.element.getAnimations({ subtree: true }).map(a => a.effect?.getTiming().duration) });
    film.update({ reducedMotion: false });
    await frames(1);
    check('reduced: turned off mid-window, it seeks to the clock', film.frame().t === 6500 && film.frame().running && !film.element.dataset.motion, { frame: film.frame() });
    film.dispose();
  });

  await guarded('lifecycle', async () => {
    now = EPOCH + 3000;
    const film = mount();
    await frames(2);
    film.suspend();
    const held = film.frame().t, before = requested;
    now += 2000;
    await frames(4);
    check('lifecycle: suspended, it stands still and asks for no frames', film.frame().t === held && !film.frame().running && requested === before, { held, frame: film.frame() });
    film.resume();
    await frames(1);
    check('lifecycle: resumed, it seeks to the clock, replaying nothing', film.frame().t === 5000 && film.frame().running, { frame: film.frame() });

    film.update({ status: 'stale' });
    const staleAt = film.frame().t;
    now += 2000;
    await frames(3);
    check('lifecycle: reconnecting (stale), it stands still where it was', film.frame().t === staleAt && !film.frame().running && film.frame().status === 'stale', { frame: film.frame() });
    film.update({ status: 'live' });
    await frames(1);
    check('lifecycle: live again, it seeks to the clock', film.frame().t === 7000 && film.frame().running, { frame: film.frame() });

    film.update({ status: 'concealed' });
    const hiddenLayers = [...film.element.querySelectorAll('.ms-st-layer, .ms-st-open, .ms-st-caption')].every(n => getComputedStyle(n).display === 'none');
    check('lifecycle: concealed, nothing of the film is drawn or named, and no frames run', hiddenLayers && film.element.getAttribute('aria-label') === LABELS.concealed
      && !film.frame().running && !film.frame().shown, { frame: film.frame() });
    now += 1000;
    film.update({ status: 'live' });
    await frames(1);
    check('lifecycle: shown again, it seeks to the clock', film.frame().t === 8000 && film.frame().running
      && [...film.element.querySelectorAll('.ms-st-layer')].every(n => getComputedStyle(n).display !== 'none'), { frame: film.frame() });

    // One frame loop at most, however many updates arrive.
    const most = [];
    for (let i = 0; i < 5; i += 1) { film.update({ caption: i % 2 === 0 }); most.push(waiting.size); }
    await frames(3);
    most.push(waiting.size);
    check('lifecycle: one frame loop at most, whatever the updates', most.every(n => n <= 1) && film.frame().running, { waiting: most });

    film.dispose();
    let threw = null;
    try { film.dispose(); film.update({ state: 'moved' }); film.suspend(); film.resume(); } catch (error) { threw = String(error); }
    const afterDispose = requested;
    now += 1000;
    await frames(3);
    check('lifecycle: dispose() twice is safe; after it nothing runs and frame() is null', threw === null && film.frame() === null && !film.element.isConnected
      && requested === afterDispose && host.childElementCount === 0, { threw, requested: requested - afterDispose });
  });

  await guarded('privacy', async () => {
    const refused = [];
    for (const input of [{ direction: 'Blue' }, { position: 'B1' }, { route: ['B1', 'B2'] }, { tie: true }, { offices: { captain: 4 } }, { destination: 'Red Planet' }, { window: { ...windowAt('w'), direction: 'Blue' } }]) {
      try { mount(input); refused.push({ input: Object.keys(input), refused: false }); } catch (error) { refused.push({ input: Object.keys(input), refused: error instanceof TypeError }); }
      host.replaceChildren();
    }
    const film = mount();
    let updateRefused = false;
    try { film.update({ choice: 'Blue', choiceAt: 3 }); } catch (error) { updateRefused = error instanceof TypeError; }
    check('privacy: every input the film does not know is refused, a course\'s above all', refused.every(r => r.refused) && updateRefused, { refused, updateRefused });
    const text = `${film.element.textContent} ${film.element.getAttribute('aria-label')} ${film.element.innerHTML}`;
    const named = /Blue|Red Planet|Blue Planet|planet|Junction|\bB[12]\b|\bR[12]\b|Captain|Officer|#2F6FD6|#C8452B|#2979FF|#E8423F/i.exec(text);
    check('privacy: nothing the film draws or says names a course, a side or an office', !named, { found: named?.[0] ?? null });
    film.dispose();
  });

  restore();
  host.remove();
  return { mode: 'full', ok: checks.every(c => c.ok), checks };
}

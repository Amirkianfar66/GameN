// mothership:dev-only
//
// The boarding stage's lifecycle probe: it drives the real component (../boarding-stage.mjs) in the browser,
// under whatever headers serve the page (design/tools/boarding-stage-check.mjs serves the production ones),
// and reports what it saw. Each check is one behaviour Frontend relies on:
//   focus     Skip keeps its element and the focus through clock ticks; Skip ending with the film moves the
//             focus to the stage and reports it once (onFocusReturn)
//   refused   Skip unavailable, reconnecting, concealed or not interactive takes no tap and says why; the
//             shared display (skip: null) has none
//   time      the countdown shows what it is given, rounded up, and never counts by itself; no trusted
//             clock, no countdown; waiting, the spinner and its status line
//   conceal   a plain cover: nothing drawn or named, Skip refused; shown again, the current view
//   film      the film's element stays for the stage's life, edge to edge, with Skip 14 px above the safe area
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    the crossfade is 220 ms, or 80 ms with Reduce motion (the game's, or the device's); the spinner
//             stands still with Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { mountBoardingStage, BOARDING_WORDS, CROSSFADE_MS, CROSSFADE_REDUCED_MS } from '../boarding-stage.mjs';

const wait = ms => new Promise(done => setTimeout(done, ms));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runBoardingStageProbe({ sizes, drawFilm }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const size = sizes['390x844'];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  document.body.append(frame);
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const clock = t => ({ elapsedMs: t, endsAtMs: 10000 });
  const filming = (t = 2000, extra = {}) => ({ insets: size.insets, clock: clock(t), view: 'film', skip: { enabled: true }, ...extra });
  /** A stage with every callback recorded. */
  const mount = (input = filming()) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const stage = mountBoardingStage(frame, input, Object.fromEntries(['onSkip', 'onRetry', 'onFocusReturn', 'onLayout'].map(n => [n, record(n)])));
    return { stage, calls, root: stage.element, q: s => stage.element.querySelector(s) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const shown = node => !!node && !node.hidden && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  const line = s => s.q('.ms-k-wait-line');

  if (mode === 'full') {
    await check('focus: Skip keeps its element and the focus through eight clock ticks; one tap, one onSkip', async () => {
      const s = mount();
      const skip = s.q('.ms-bst-skip');
      skip.focus();
      for (let i = 0; i < 8; i += 1) s.stage.update({ clock: clock(2000 + i * 250) });
      const same = s.q('.ms-bst-skip') === skip, focused = document.activeElement === skip;
      tap(skip);
      s.stage.dispose();
      return { ok: same && focused && named(s.calls, 'onSkip').length === 1, same, focused, skips: named(s.calls, 'onSkip').length };
    });

    await check('focus: Skip ending with the film moves the focus to the stage, then onFocusReturn once', async () => {
      const s = mount();
      s.q('.ms-bst-skip').focus();
      s.stage.update({ view: 'holding' });
      await Promise.resolve(); await Promise.resolve();
      const returned = named(s.calls, 'onFocusReturn');
      const onStage = document.activeElement === s.root;
      s.stage.dispose();
      return { ok: onStage && returned.length === 1 && returned[0][1]?.intent === 'skip', onStage, returned };
    });

    await check('refused: Skip unavailable, reconnecting, concealed or not interactive takes no tap and says why; the display has none', async () => {
      const s = mount(filming(2000, { skip: { enabled: false, reason: 'Not available now' } }));
      const skip = s.q('.ms-bst-skip');
      const seen = [];
      const look = label => seen.push({ label, disabled: skip.getAttribute('aria-disabled'), off: skip.hasAttribute('data-off'), why: describedBy(skip) });
      tap(skip); look('unavailable');
      s.stage.update({ skip: { enabled: true }, status: 'stale' }); tap(skip); look('stale');
      s.stage.update({ status: 'concealed' }); tap(skip); look('concealed');
      s.stage.update({ status: 'live', interactive: false }); tap(skip); look('not interactive');
      s.stage.update({ interactive: true }); look('offered');
      const banner = (() => { s.stage.update({ status: 'stale' }); return s.q('.ms-ps-banner b')?.textContent ?? null; })();
      s.stage.update({ status: 'live', skip: null });
      const display = !shown(s.q('.ms-bst-skip'));
      const taps = named(s.calls, 'onSkip').length;
      s.stage.dispose();
      const [unavailable, stale, concealed, inert, offered] = seen;
      return {
        ok: taps === 0 && unavailable.disabled === 'true' && unavailable.off && unavailable.why === 'Not available now'
          && stale.disabled === 'true' && stale.why === 'Controls return when the match is current' && concealed.disabled === 'true'
          && inert.disabled === 'true' && offered.disabled === null && banner === 'Connection lost' && display,
        taps, seen, banner, display,
      };
    });

    await check('time: the countdown shows what it is given and does not count by itself; no trusted clock, no countdown; waiting, the spinner and its status', async () => {
      const s = mount({ insets: size.insets, clock: clock(6000), view: 'holding', skip: null });
      const read = () => ({ title: s.q('.ms-k-wait-title').textContent, line: shown(line(s)) ? line(s).textContent.trim() : null, role: line(s).getAttribute('role'), spinner: !!line(s).querySelector('.ms-k-spinner') });
      const first = read();
      await wait(1300);
      const later = read();
      s.stage.update({ clock: clock(6001) });
      const rounded = read();
      s.stage.update({ clock: null });
      const untrusted = read();
      s.stage.update({ clock: clock(10000), view: 'waiting' });
      const waiting = { ...read(), live: line(s).getAttribute('aria-live') };
      s.stage.dispose();
      return {
        ok: first.title === 'Boarding' && first.line === 'Round 1 in 0:04' && first.role === 'timer' && JSON.stringify(first) === JSON.stringify(later)
          && rounded.line === 'Round 1 in 0:04' && untrusted.line === null
          && waiting.title === 'Starting Round 1' && waiting.line === 'Waiting for the ship' && waiting.spinner && waiting.role === 'status' && waiting.live === 'polite',
        first, later, rounded, untrusted, waiting,
      };
    });

    await check('conceal: a plain cover, nothing drawn or named, Skip refused; shown again, the current view', async () => {
      const s = mount();
      drawFilm(s.stage.film, 2000);
      s.stage.update({ status: 'concealed' });
      const cover = s.q('.ms-bst-cover');
      const r = cover.getBoundingClientRect(), f = frame.getBoundingClientRect();
      const top = document.elementFromPoint(f.left + 195, f.top + 400);
      const hidden = { name: s.root.getAttribute('aria-label'), covered: cover.contains(top) || top === cover, full: Math.round(r.width) === 390 && Math.round(r.height) === 844,
        filmHidden: s.q('.ms-bst-film').getAttribute('aria-hidden') === 'true', holdHidden: s.q('.ms-bst-hold').getAttribute('aria-hidden') === 'true' };
      s.stage.update({ status: 'live', view: 'holding', clock: clock(7000) });
      const again = { name: s.root.getAttribute('aria-label'), cover: shown(cover), line: line(s).textContent.trim() };
      s.stage.dispose();
      return { ok: hidden.name === BOARDING_WORDS.hidden && hidden.covered && hidden.full && hidden.filmHidden && hidden.holdHidden
        && again.name === 'Boarding' && !again.cover && again.line === 'Round 1 in 0:03', hidden, again };
    });

    await check('film: its element stays for the stage\'s life, edge to edge, with Skip 14 px above the bottom safe area', async () => {
      const s = mount();
      await frames();
      const film = s.stage.film, marker = document.createElement('i');
      film.append(marker);
      const f = frame.getBoundingClientRect(), p = film.getBoundingClientRect(), k = s.q('.ms-bst-skip').getBoundingClientRect();
      const box = { top: p.top - f.top, height: p.height, width: p.width, skipBottom: Math.round((f.bottom - k.bottom) * 100) / 100, skipRight: Math.round((f.right - k.right) * 100) / 100 };
      s.stage.update({ view: 'holding' });
      s.stage.update({ view: 'film' });
      const kept = s.stage.film === film && marker.isConnected;
      const layout = s.stage.layout();
      s.stage.dispose();
      return { ok: box.top === 0 && box.height === 844 && box.width === 390 && box.skipBottom === 48 && box.skipRight === 14 && kept
        && layout.film.height === 844 && layout.safe.top === 47 && layout.safe.bottom === 34, box, kept, layout };
    });

    await check('dispose: nothing is left, nothing fires, and every method is safe after it', async () => {
      const s = mount();
      const skip = s.q('.ms-bst-skip');
      s.stage.dispose(); s.stage.dispose();
      s.stage.update({ clock: clock(3000) }); s.stage.suspend(); s.stage.resume();
      tap(skip);
      return { ok: frame.children.length === 0 && s.stage.layout() === null && named(s.calls, 'onSkip').length === 0, left: frame.children.length };
    });
  }

  await check(`motion: the crossfade is ${deviceReduced ? 80 : 220} ms${deviceReduced ? ' (the device\'s Reduce motion, emulated)' : ', and 80 ms with the game\'s Reduce motion'}; the spinner stands still with Reduce motion`, async () => {
    const results = [];
    for (const reducedMotion of deviceReduced ? [false] : [false, true]) {
      const s = mount({ insets: size.insets, clock: clock(2000), view: 'film', skip: { enabled: true }, reducedMotion });
      await frames();
      s.stage.update({ view: 'holding' });
      const duration = getComputedStyle(s.q('.ms-bst-film')).transitionDuration.split(',')[0].trim();
      s.stage.update({ view: 'waiting', clock: clock(10000) });
      const spin = getComputedStyle(s.q('.ms-k-spinner')).animationName;
      results.push({ reducedMotion, duration, spin });
      s.stage.dispose();
    }
    const want = ms => `${ms / 1000}s`;
    const ok = deviceReduced
      ? results[0].duration === want(CROSSFADE_REDUCED_MS) && results[0].spin === 'none'
      : results[0].duration === want(CROSSFADE_MS) && results[0].spin !== 'none' && results[1].duration === want(CROSSFADE_REDUCED_MS) && results[1].spin === 'none';
    return { ok, results };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

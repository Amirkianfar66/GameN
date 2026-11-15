// mothership:dev-only
//
// The role stage's lifecycle probe: it drives the real components (../role-stage.mjs, ../role-card.mjs)
// in the browser, under whatever headers serve the page (design/tools/role-stage-check.mjs serves the
// production ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   focus     Ready keeps its element and the focus through clock ticks; Skip film and Show role ending
//             move the focus to the stage and report it once (onFocusReturn)
//   refused   Ready unavailable, busy, spent, reconnecting or not interactive takes no tap, and says why
//   private   concealed, no role, team or line in the page or for a screen reader; Ready refused; Show
//             role reported; this viewer's inputs dropped, also when the viewer changes
//   time      the clock and the strip show what they are given, and never count by themselves; the strip
//             follows the server's split (an 18/12 case), never a fixed 20/10
//   film      the film's element stays for the stage's life; Skip film works only in the film's view; the
//             shell's bar leaves only under an opaque film and comes back before it fades, the card still
//   layout    the card's space and the film's are measured, and a change reported
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    the crossfade is 700 ms, or 80 ms with Reduce motion (the game's, or the device's)
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { mountRoleStage, STAGE_WORDS, CROSSFADE_MS, CROSSFADE_REDUCED_MS } from '../role-stage.mjs';

const wait = ms => new Promise(done => setTimeout(done, ms));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runRoleStageProbe({ sizes, cardOf }) {
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
  const SELF = 4;
  const clock = t => ({ elapsedMs: t, filmAtMs: 20000, endsAtMs: 30000 });
  const own = (t = 12000, extra = {}) => ({ viewer: SELF, insets: size.insets, clock: clock(t), view: 'card', film: 'pending', card: cardOf('Doctor'),
    ready: { mode: 'ready', enabled: false, reason: 'Opens when your film ends' }, roster: { ready: 2, total: 9 }, ...extra });
  /** A stage with every callback recorded. */
  const mount = (input = own(), extra = {}) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const handlers = Object.fromEntries(['onReady', 'onSkipFilm', 'onShowRole', 'onRetry', 'onFocusReturn', 'onLayout'].map(n => [n, record(n)]));
    const stage = mountRoleStage(frame, input, { ...handlers, ...extra });
    return { stage, calls, root: stage.element, q: s => stage.element.querySelector(s) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  if (mode === 'full') {
    await check('focus: Ready keeps its element and the focus through eight clock ticks and its offer opening', async () => {
      const s = mount(own(29000));
      const ready = s.q('.ms-rst-ready');
      ready.focus();
      for (let i = 0; i < 8; i += 1) s.stage.update({ clock: clock(29000 + i * 250), roster: { ready: 2 + (i % 3), total: 9 } });
      s.stage.update({ view: 'after', clock: clock(30000), ready: { mode: 'ready', enabled: true } });
      const same = s.q('.ms-rst-ready') === ready, focused = document.activeElement === ready;
      tap(ready);
      s.stage.dispose();
      return { ok: same && focused && named(s.calls, 'onReady').length === 1, same, focused, ready: named(s.calls, 'onReady').length };
    });

    await check('focus: Skip film ending with the film moves the focus to the stage, then onFocusReturn once', async () => {
      const s = mount(own(24000, { view: 'film', film: 'playing' }));
      const skip = s.q('.ms-rst-skip');
      skip.focus();
      const before = document.activeElement === skip;
      tap(skip);
      const skipped = named(s.calls, 'onSkipFilm').length;
      s.stage.update({ view: 'card', film: 'skipped' });
      await Promise.resolve(); await Promise.resolve();
      const returned = named(s.calls, 'onFocusReturn');
      const onStage = document.activeElement === s.root;
      s.stage.dispose();
      return { ok: before && skipped === 1 && onStage && returned.length === 1 && returned[0][1]?.intent === 'skip-film', before, skipped, onStage, returned };
    });

    await check('focus: Show role ending as the card turns face up moves the focus to the card, then onFocusReturn once', async () => {
      const s = mount(own(9000, { status: 'concealed' }));
      const show = s.q('[data-intent="show-role"]');
      show.focus();
      tap(show);
      const shown = named(s.calls, 'onShowRole').length;
      s.stage.update({ status: 'live', card: cardOf('Doctor') });
      await Promise.resolve(); await Promise.resolve();
      const returned = named(s.calls, 'onFocusReturn');
      const onCard = document.activeElement === s.q('.ms-own-card');
      s.stage.dispose();
      return { ok: shown === 1 && onCard && returned.length === 1 && returned[0][1]?.intent === 'show-role', shown, onCard, returned };
    });

    await check('refused: Ready unavailable, busy, spent, reconnecting or not interactive takes no tap, keeps its focus and says why', async () => {
      const s = mount(own(12000));
      const ready = s.q('.ms-rst-ready');
      ready.focus();
      const seen = [];
      const look = label => seen.push({ label, disabled: ready.getAttribute('aria-disabled'), busy: ready.getAttribute('aria-busy'), off: ready.hasAttribute('data-off'), why: describedBy(ready), focused: document.activeElement === ready });
      tap(ready); look('unavailable');
      s.stage.update({ view: 'after', clock: clock(30000), ready: { mode: 'ready', enabled: true, busy: true } }); tap(ready); look('busy');
      s.stage.update({ ready: { mode: 'done' } }); tap(ready); look('spent');
      s.stage.update({ ready: { mode: 'ready', enabled: true }, status: 'stale' }); tap(ready); look('stale');
      s.stage.update({ status: 'live', interactive: false }); tap(ready); look('not interactive');
      s.stage.update({ interactive: true }); tap(ready); look('offered');
      const taps = named(s.calls, 'onReady').length;
      s.stage.dispose();
      const [unavailable, busy, spent, stale, inert, offered] = seen;
      return {
        ok: taps === 1 && seen.every(x => x.focused) && unavailable.disabled === 'true' && unavailable.off && unavailable.why === 'Opens when your film ends'
          && busy.busy === 'true' && spent.disabled === 'true' && spent.off && stale.disabled === 'true' && stale.why === 'Controls return when the match is current'
          && inert.disabled === 'true' && offered.disabled === null && !offered.off,
        taps, seen,
      };
    });

    await check('refused: reconnecting, the shell\'s banner and Retry work; Ready does not', async () => {
      const s = mount(own(30000, { view: 'after', status: 'stale', ready: { mode: 'ready', enabled: true } }));
      const banner = s.q('.ms-ps-banner b')?.textContent ?? null;
      const retry = s.q('.ms-ps-banner [data-intent="retry"]');
      tap(retry); tap(s.q('.ms-rst-ready'));
      s.stage.dispose();
      return { ok: banner === 'Connection lost' && named(s.calls, 'onRetry').length === 1 && named(s.calls, 'onReady').length === 0, banner, calls: s.calls.filter(c => c[0] !== 'onLayout') };
    });

    await check('private: concealed, no role, team or line in the page or for a screen reader; the card back with Show role; the clock runs', async () => {
      const s = mount(own(24000, { view: 'film', film: 'playing', toast: { id: 'r', text: STAGE_WORDS.rejoined } }));
      s.stage.update({ status: 'concealed' });
      const words = s.root.textContent;
      const leaks = ['Doctor', 'DOCTOR', 'Blue team', 'Two shared injections', 'Rescue a player', STAGE_WORDS.rejoined, STAGE_WORDS.skipped].filter(w => words.includes(w));
      const labels = [...s.root.querySelectorAll('[aria-label]')].map(n => n.getAttribute('aria-label')).filter(l => /Doctor|Blue/.test(l));
      const art = [...s.root.querySelectorAll('[style]')].map(n => n.getAttribute('style')).filter(st => /crew-card|device/.test(st));
      const back = s.q('.ms-rc-back p')?.textContent ?? null;
      const film = s.root.dataset.view;
      const chip = s.q('.ms-ps-timer')?.lastChild?.textContent ?? null;
      tap(s.q('.ms-rst-ready'));
      tap(s.q('[data-intent="show-role"]'));
      s.stage.update({ status: 'live' });
      const after = s.root.textContent.includes('Blue team');
      s.stage.dispose();
      return { ok: leaks.length === 0 && labels.length === 0 && art.length === 0 && back === 'Role hidden' && film === 'card' && chip === '0:06'
        && named(s.calls, 'onReady').length === 0 && named(s.calls, 'onShowRole').length === 1 && !after, leaks, labels, art, back, film, chip, after };
    });

    await check('private: a new viewer drops the last viewer\'s card unless the update gives the new one\'s', async () => {
      const s = mount(own(12000));
      s.stage.update({ viewer: 7 });
      const dropped = !s.root.textContent.includes('Blue team') && s.q('.ms-rc-back') !== null;
      s.stage.update({ viewer: 8, card: cardOf('Hacker') });
      const given = s.root.textContent.includes('Red team') && !s.root.textContent.includes('Blue team');
      s.stage.dispose();
      return { ok: dropped && given, dropped, given };
    });

    await check('time: the clock, the strip and the line show what they are given, and do not count by themselves', async () => {
      const s = mount(own(1000));
      const read = () => ({ clock: s.q('.ms-ps-timer')?.lastChild?.textContent ?? null, note: s.q('.ms-rst-note').textContent,
        card: s.q('.ms-rst-seg:first-child i').style.width, film: s.q('.ms-rst-seg:last-child i').style.width, now: s.q('.ms-rst-strip').getAttribute('aria-valuenow'),
        urgent: !!s.q('.ms-ps-timer[data-urgent]') });
      const first = read();
      await wait(1300);
      const later = read();
      s.stage.update({ clock: clock(25000), view: 'film', film: 'playing' });
      const film = { ...read(), chip: s.q('.ms-rst-chip').lastChild.textContent };
      s.stage.update({ clock: null, view: 'card' });
      const untrusted = { strip: s.q('.ms-rst-strip').hidden, clock: s.q('.ms-ps-timer'), note: s.q('.ms-rst-note').hidden };
      s.stage.update({ clock: clock(30000), view: 'after', ready: { mode: 'ready', enabled: true } });
      const ended = { strip: s.q('.ms-rst-strip').hidden, clock: s.q('.ms-ps-timer'), note: s.q('.ms-rst-note').textContent };
      s.stage.dispose();
      return {
        ok: first.clock === '0:29' && first.note === 'Your film starts in 0:19' && first.card === '5%' && first.film === '0%' && !first.urgent
          && JSON.stringify(first) === JSON.stringify(later) && film.chip === '0:05' && film.card === '100%' && film.film === '50%' && !film.urgent
          && untrusted.strip && untrusted.clock === null && untrusted.note && ended.strip && ended.clock === null && ended.note === STAGE_WORDS.hide,
        first, later, film, untrusted: { ...untrusted, clock: !!untrusted.clock }, ended: { ...ended, clock: !!ended.clock },
      };
    });

    await check('time: the strip follows the server\'s split, never a fixed 20/10 (here 18/12)', async () => {
      const split = t => ({ elapsedMs: t, filmAtMs: 18000, endsAtMs: 30000 });
      const s = mount(own(9000, { clock: split(9000) }));
      await frames();
      const width = sel => s.q(sel).getBoundingClientRect().width;
      const cardSeg = width('.ms-rst-seg:first-child'), filmSeg = width('.ms-rst-seg:last-child');
      const first = { note: s.q('.ms-rst-note').textContent, card: s.q('.ms-rst-seg:first-child i').style.width, clock: s.q('.ms-ps-timer')?.lastChild?.textContent ?? null };
      s.stage.update({ clock: split(24000), view: 'film', film: 'playing' });
      const film = { card: s.q('.ms-rst-seg:first-child i').style.width, film: s.q('.ms-rst-seg:last-child i').style.width, chip: s.q('.ms-rst-chip').lastChild.textContent };
      s.stage.dispose();
      const ratio = cardSeg / filmSeg;
      return { ok: Math.abs(ratio - 18 / 12) < 0.02 && first.note === 'Your film starts in 0:09' && first.card === '50%' && first.clock === '0:21'
        && film.card === '100%' && film.film === '50%' && film.chip === '0:06', ratio, cardSeg, filmSeg, first, film };
    });

    await check('film: its element stays for the stage\'s life, shown only in the film\'s view; Skip film works only there', async () => {
      const s = mount(own(12000));
      const film = s.stage.film;
      const marker = document.createElement('i');
      film.append(marker);
      const hidden = s.q('.ms-rst-film').getAttribute('aria-hidden') === 'true' && s.q('.ms-rst-film').inert;
      tap(s.q('.ms-rst-skip'));
      s.stage.update({ view: 'film', film: 'playing', clock: clock(21000) });
      const shown = s.q('.ms-rst-film').getAttribute('aria-hidden') === null && !s.q('.ms-rst-film').inert;
      tap(s.q('.ms-rst-skip'));
      s.stage.update({ status: 'concealed' });
      const concealed = s.q('.ms-rst-film').getAttribute('aria-hidden') === 'true';
      s.stage.update({ status: 'live', view: 'after', clock: clock(30000) });
      const kept = s.stage.film === film && marker.isConnected;
      s.stage.dispose();
      return { ok: hidden && shown && concealed && kept && named(s.calls, 'onSkipFilm').length === 1, hidden, shown, concealed, kept, skips: named(s.calls, 'onSkipFilm').length };
    });

    await check('layout: the card\'s space and the film\'s are measured, a change of size or insets reported, and the film runs from the top edge with the card held still', async () => {
      const s = mount(own(12000));
      await frames();
      const first = s.stage.layout();
      frame.style.height = '700px';
      await frames(); await frames();
      const smaller = s.stage.layout();
      s.stage.update({ insets: { top: 20, bottom: 0 } });
      await frames(); await frames();
      const insets = s.stage.layout();
      const reports = named(s.calls, 'onLayout').length;
      // In the film's view the shell's bar is away: the film runs from the top edge to the stage's foot,
      // and the card holds where it was under the film.
      s.stage.update({ insets: size.insets, view: 'film', film: 'playing', clock: clock(21000) });
      frame.style.height = `${size.height}px`;
      await wait(800); await frames();
      const film = s.stage.layout();
      s.stage.dispose();
      return {
        ok: first.size.width === 390 && first.film.height === 844 - first.bars.top - first.bars.bottom && first.card.height > 500 && smaller.card.height < first.card.height
          && insets.bars.top < first.bars.top && reports >= 2
          && film.bars.top === 0 && film.film.height === 844 - film.bars.bottom && film.card.height === first.card.height,
        first, smaller, insets, film, reports,
      };
    });

    await check('dispose: nothing is left, nothing fires, and every method is safe after it', async () => {
      const s = mount(own(30000, { view: 'after', ready: { mode: 'ready', enabled: true } }));
      const ready = s.q('.ms-rst-ready');
      s.stage.dispose();
      s.stage.dispose();
      s.stage.update({ clock: clock(30000) }); s.stage.suspend(); s.stage.resume();
      tap(ready);
      return { ok: frame.children.length === 0 && s.stage.layout() === null && named(s.calls, 'onReady').length === 0, left: frame.children.length };
    });
  }

  await check('film: the shell\'s bar leaves only once the film is opaque, comes back before it fades out, and the card never moves', async () => {
    const ms = deviceReduced ? CROSSFADE_REDUCED_MS : CROSSFADE_MS;
    const s = mount(own(19900));
    await frames();
    const bar = () => { const n = s.q('.ms-ps-tb'); return !!n && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0; };
    const cardTop = () => Math.round(s.q('.ms-rc-card').getBoundingClientRect().top * 100) / 100;
    const before = { bar: bar(), card: cardTop() };
    s.stage.update({ view: 'film', film: 'playing', clock: clock(20000) });
    await frames();
    const fading = { bar: bar(), card: cardTop() };
    await wait(ms + 150); await frames();
    const shown = { bar: bar(), card: cardTop() };
    s.stage.update({ view: 'after', clock: clock(30000), ready: { mode: 'ready', enabled: true } });
    await frames();
    const leaving = { bar: bar(), card: cardTop() };
    s.stage.dispose();
    return { ok: before.bar && fading.bar && !shown.bar && leaving.bar && [fading, shown, leaving].every(x => x.card === before.card), ms, before, fading, shown, leaving };
  });

  await check(`motion: the film crossfades in ${deviceReduced ? 80 : 700} ms${deviceReduced ? ' (the device\'s Reduce motion, emulated)' : ', and 80 ms with the game\'s Reduce motion'}`, async () => {
    const results = [];
    for (const reducedMotion of deviceReduced ? [false] : [false, true]) {
      const s = mount(own(19900, { reducedMotion }));
      const film = s.q('.ms-rst-film');
      s.stage.update({ view: 'film', film: 'playing', clock: clock(20000) });
      const style = getComputedStyle(film);
      results.push({ reducedMotion, duration: style.transitionDuration.split(',')[0].trim(), shown: film.dataset.shown });
      s.stage.dispose();
    }
    const want = ms => `${ms / 1000}s`;
    const ok = deviceReduced
      ? results[0].duration === want(CROSSFADE_REDUCED_MS)
      : results[0].duration === want(CROSSFADE_MS) && results[1].duration === want(CROSSFADE_REDUCED_MS);
    return { ok: ok && results.every(r => r.shown === ''), results };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

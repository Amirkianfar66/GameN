// mothership:dev-only
//
// The results reveal's lifecycle probe: it drives the real component (../results-reveal.mjs) in the real phone
// shell's cover, with the vote's real result window in its host, in the browser, under whatever headers serve the
// page (design/tools/results-reveal-check.mjs serves the production ones), and reports what it saw. Each check is
// one behaviour Frontend relies on:
//   seek       the rise's time is the trusted clock's: a phone at 120 ms shows the 120 ms frame, and an update
//              seeks to the clock again
//   late       from 320 ms the window is at rest the moment it mounts: no animation, nothing set on the host,
//              and the window lying exactly where it lies in the cover
//   runs       on a running clock the browser carries the rise to its end and nothing is left; the reveal asks
//              the page for no frame
//   behind     a long frame while the window is built does not leave the rise behind the clock: as the browser
//              starts it, it is at the clock's moment
//   suspend    suspended, the rise holds; resumed, it seeks to the clock (past the rise: at rest at once)
//   stale      reconnecting, it stands where it is and does not follow the clock; live again, it seeks to it
//   concealed  the host is hidden and nothing runs; shown again, it seeks to the clock
//   reduced    Reduce motion (the game's): at rest at once, with one 80 ms fade when the window first shows for a
//              phase, none for the same phase again, none for a phone standing still
//   phase      a new phase id is a new arrival, from the clock's moment
//   one        one animation at most, whatever is asked in whatever order
//   taps       the host takes no tap; the window takes those over it, and the room beside it keeps its own
//   quiet      the host has no role, name or focus; the window in it is in the page from the first moment
//   refused    an input the reveal does not know is refused, in `window` too, and changes nothing
//   dispose    dispose() removes the host and anything left in it, twice safely, and nothing runs after
// With the device's Reduce motion emulated only `reduced` runs, with the game's setting off (the page's mode says
// which).
// Counting: the probe counts the frames and animations the reveal starts synchronously, around a mount or an
// update. The page's other parts (the shell, the room scene, the check's own waits) ask for frames of their own.

import { REDUCED_FADE_MS, REVEAL_BEATS, REVEAL_EASING, mountResultsReveal, revealFrame } from '../results-reveal.mjs';
import { mountVoteResult } from '../../vote/vote.mjs';
import { PHASE_MS, STARTED } from './preview.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const sleep = ms => new Promise(done => setTimeout(done, ms));
const RISE = REVEAL_BEATS.rise[1];
/** How far the browser's own solving of the curve may leave the host from the component's arithmetic, in px. */
export const CURVE_SLACK_PX = 0.05;

export async function runRevealProbe({ sizes, phone, inputsFor }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };

  let phases = 0;
  const phaseAt = startedAt => ({ id: `probe-phase-${phases += 1}`, startedAt, endsAt: startedAt + PHASE_MS });
  /** Runs `fn` and counts the frames and animations asked for while it runs. */
  function counted(fn) {
    const raf = window.requestAnimationFrame, animate = Element.prototype.animate;
    let asked = 0, started = 0;
    window.requestAnimationFrame = callback => { asked += 1; return raf.call(window, callback); };
    Element.prototype.animate = function counting(...args) { started += 1; return animate.apply(this, args); };
    try { return { value: fn(), frames: asked, animations: started }; }
    finally { window.requestAnimationFrame = raf; Element.prototype.animate = animate; }
  }
  /**
   * A phone with the reveal in its cover and the result window in the reveal's host, both mounted here: on a clock
   * the probe sets (`at`, ms of reveal time), or on the page's own (`real`).
   */
  function stand({ size = '390x844', state = 'result-jailed', at = 0, real = false, input = {}, hold = false } = {}) {
    const p = phone(size, state, { direct: true });
    document.body.append(p.frame);
    const m = p.mount();
    m.result.dispose(); // the cover is empty: the reveal and the window are mounted in it by hand
    const startedAt = real ? Date.now() : STARTED;
    let now = startedAt + at;
    const clock = real ? { now: () => Date.now() } : { now: () => now };
    const window0 = phaseAt(startedAt);
    const mounting = counted(() => mountResultsReveal(m.cover, { window: window0, clock, ...input }));
    const reveal = mounting.value;
    const result = mountVoteResult(reveal.host, { ...inputsFor(state, sizes[size]).component, status: input.status ?? 'live', reducedMotion: !!input.reducedMotion });
    if (hold) reveal.suspend();
    const host = reveal.host, cover = m.cover;
    return {
      m, reveal, result, host, cover, window: window0, startedAt, mounting,
      set: t => { now = startedAt + t; },
      height: () => cover.getBoundingClientRect().height,
      /** The host's distance below its place, px. */
      below: () => host.getBoundingClientRect().top - cover.getBoundingClientRect().top,
      box: () => { const w = host.querySelector('.ms-vote-result').getBoundingClientRect(), c = cover.getBoundingClientRect(); return { left: w.left - c.left, top: w.top - c.top, width: w.width, height: w.height }; },
      animations: () => host.getAnimations().map(a => ({ state: a.playState, time: a.currentTime, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing, fill: a.effect.getTiming().fill, properties: [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))] })),
      atRest: () => host.getAnimations().length === 0 && getComputedStyle(host).transform === 'none' && getComputedStyle(host).opacity === '1' && !host.hasAttribute('style'),
      dispose() { result.dispose(); reveal.dispose(); m.dispose(); },
    };
  }
  const near = (a, b, slack) => Math.abs(a - b) <= slack;
  /** Waits until `test` holds, looking every 10 ms, for at most `ms`. */
  const until = async (test, ms = 1500) => { const from = performance.now(); while (!test() && performance.now() - from < ms) await sleep(10); return test(); };
  /** The window's place in a cover of this size, as vote.css lays it: 10 px from each side, 8 above, 10 below. */
  const restBox = s => ({ left: 10, top: 8, width: s.cover.getBoundingClientRect().width - 20, height: s.height() - 18 });
  const sameBox = (a, b) => ['left', 'top', 'width', 'height'].every(k => near(a[k], b[k], 0.01));

  if (mode === 'full') {
    await check('seek', async () => {
      const seen = [];
      for (const t of [0, 40, 120, 240, 319]) {
        const s = stand({ at: t, hold: true });
        await frames();
        const [a] = s.animations(), want = revealFrame(t).offset * s.height(), f = s.reveal.frame();
        seen.push({ t, animations: s.animations().length, state: a?.state, time: a?.time, easing: a?.easing, duration: a?.duration, fill: a?.fill, properties: a?.properties,
          below: s.below(), want, frame: f, asked: { frames: s.mounting.frames, animations: s.mounting.animations } });
        s.dispose();
      }
      const moved = (() => {
        const s = stand({ at: 80, hold: true });
        s.set(200);
        const updating = counted(() => s.reveal.update({}));
        const out = { time: s.animations()[0]?.time, frame: s.reveal.frame(), asked: { frames: updating.frames, animations: updating.animations } };
        s.dispose();
        return out;
      })();
      const ok = seen.every(e => e.animations === 1 && e.state === 'paused' && e.time === e.t && e.easing === REVEAL_EASING.css && e.duration === RISE && e.fill === 'none'
          && e.properties.join() === 'transform' && near(e.below, e.want, CURVE_SLACK_PX)
          && e.frame.t === e.t && e.frame.beat === 'rise' && !e.frame.still && !e.frame.running && near(e.frame.offset, revealFrame(e.t).offset, 0.001)
          && e.asked.frames === 0 && e.asked.animations === 1)
        && moved.time === 200 && moved.frame.t === 200 && moved.asked.frames === 0 && moved.asked.animations === 0;
      return { ok, seen, moved };
    });

    await check('late', async () => {
      const seen = [];
      for (const size of Object.keys(sizes)) for (const t of [RISE, RISE + 1, 2000, PHASE_MS, PHASE_MS + 4000]) {
        const s = stand({ size, at: t });
        await frames();
        seen.push({ size, t, rest: s.atRest(), frame: s.reveal.frame(), box: s.box(), want: restBox(s), asked: { frames: s.mounting.frames, animations: s.mounting.animations } });
        s.dispose();
      }
      const ok = seen.every(e => e.rest && e.frame.beat === 'rest' && e.frame.still && !e.frame.running && e.frame.offset === 0 && e.frame.t === Math.min(e.t, PHASE_MS)
        && sameBox(e.box, e.want) && e.asked.frames === 0 && e.asked.animations === 0);
      return { ok, seen };
    });

    await check('runs', async () => {
      const s = stand({ real: true });
      const first = { animations: s.animations(), frame: s.reveal.frame(), below: s.below(), height: s.height(), asked: { frames: s.mounting.frames, animations: s.mounting.animations } };
      await sleep(140);
      const mid = { animations: s.animations(), below: s.below(), frame: s.reveal.frame() };
      await sleep(RISE + 120);
      await frames();
      const last = { rest: s.atRest(), frame: s.reveal.frame(), box: s.box(), want: restBox(s) };
      s.dispose();
      const ok = first.animations.length === 1 && first.animations[0].state === 'running' && first.frame.running && first.frame.beat === 'rise' && first.asked.frames === 0 && first.asked.animations === 1
        && mid.animations.length === 1 && mid.below > 0 && mid.below < first.height * 0.6
        && last.rest && last.frame.beat === 'rest' && !last.frame.running && sameBox(last.box, last.want);
      return { ok, first, mid, last };
    });

    await check('behind', async () => {
      const s = stand({ real: true });
      const [rising] = s.host.getAnimations();
      // The page is busy for 130 ms before it draws its next frame, as a slow phone building the window might be.
      const busyFrom = performance.now();
      while (performance.now() - busyFrom < 130) { /* busy */ }
      // The browser starts the animation with its next frame; the reveal's own seek runs first, then this.
      await rising.ready.catch(() => {});
      const clock = Date.now() - s.startedAt, time = Number(rising.currentTime);
      const out = { animations: s.animations().length, time, clock, behindMs: clock - time, state: rising.playState, frame: s.reveal.frame() };
      s.dispose();
      // Without the second seek the rise would be about 130 ms behind the clock here.
      const ok = out.animations === 1 && out.state === 'running' && out.time >= 130 && near(out.time, out.clock, 40);
      return { ok, ...out };
    });

    await check('suspend', async () => {
      const s = stand({ real: true });
      await sleep(60);
      s.reveal.suspend();
      const held = { animations: s.animations(), below: s.below(), frame: s.reveal.frame() };
      await sleep(90);
      const still = { animations: s.animations(), below: s.below() };
      const resuming = counted(() => s.reveal.resume());
      const clockNow = Date.now() - s.startedAt;
      const back = { animations: s.animations(), frame: s.reveal.frame(), clock: clockNow, asked: { frames: resuming.frames, animations: resuming.animations } };
      s.dispose();
      // Suspended past the rise: resumed, the window is at rest at once.
      const late = stand({ real: true });
      await sleep(40);
      late.reveal.suspend();
      await sleep(RISE + 60);
      const waiting = { animations: late.animations().length, below: late.below() };
      late.reveal.resume();
      const after = { rest: late.atRest(), frame: late.reveal.frame() };
      late.dispose();
      const ok = held.animations.length === 1 && held.animations[0].state === 'paused' && !held.frame.running && held.below > 0
        && still.animations[0].time === held.animations[0].time && still.below === held.below
        && back.animations.length === 1 && back.animations[0].state === 'running' && back.frame.running && near(back.animations[0].time, back.clock, 30) && back.animations[0].time > held.animations[0].time + 60
        && back.asked.frames === 0 && back.asked.animations === 0
        && waiting.animations === 1 && waiting.below > 0 && after.rest && after.frame.beat === 'rest';
      return { ok, held, still, back, waiting, after };
    });

    await check('stale', async () => {
      const s = stand({ at: 100 });
      s.reveal.update({ status: 'stale' });
      const stood = { animations: s.animations(), frame: s.reveal.frame() };
      s.set(180);
      s.reveal.update({});
      const stays = { animations: s.animations(), frame: s.reveal.frame() };
      s.reveal.update({ status: 'live' });
      const live = { animations: s.animations(), frame: s.reveal.frame() };
      s.set(400);
      s.reveal.update({ status: 'stale' });
      const past = { rest: s.atRest(), frame: s.reveal.frame() };
      s.dispose();
      // A phone that is reconnecting when the window first shows: the clock's moment, once, held.
      const first = stand({ at: 120, input: { status: 'stale' } });
      const shown = { animations: first.animations(), frame: first.reveal.frame(), below: first.below(), want: revealFrame(120).offset * first.height() };
      first.dispose();
      const ok = stood.animations.length === 1 && stood.animations[0].state === 'paused' && stood.animations[0].time >= 100 && stood.animations[0].time < 140 && stood.frame.status === 'stale' && !stood.frame.running
        && stays.animations[0].time === stood.animations[0].time
        && live.animations.length === 1 && live.animations[0].time === 180 && live.animations[0].state === 'running' && live.frame.status === 'live'
        && past.rest && past.frame.beat === 'rest'
        && shown.animations.length === 1 && shown.animations[0].state === 'paused' && shown.animations[0].time === 120 && near(shown.below, shown.want, CURVE_SLACK_PX);
      return { ok, stood, stays, live, past, shown };
    });

    await check('concealed', async () => {
      const s = stand({ at: 100, hold: true });
      s.reveal.update({ status: 'concealed' });
      const hidden = { hidden: s.host.hidden, display: getComputedStyle(s.host).display, animations: s.animations().length, frame: s.reveal.frame(), status: s.host.dataset.status };
      s.set(150);
      s.reveal.update({ status: 'live' });
      const shown = { hidden: s.host.hidden, animations: s.animations(), frame: s.reveal.frame() };
      s.reveal.update({ status: 'concealed' });
      s.set(900);
      s.reveal.update({ status: 'live' });
      const later = { hidden: s.host.hidden, rest: s.atRest(), frame: s.reveal.frame() };
      s.dispose();
      const ok = hidden.hidden && hidden.display === 'none' && hidden.animations === 0 && hidden.frame.shown === false && !hidden.frame.running && hidden.status === 'concealed'
        && !shown.hidden && shown.animations.length === 1 && shown.animations[0].time === 150 && shown.frame.shown
        && !later.hidden && later.rest && later.frame.beat === 'rest';
      return { ok, hidden, shown, later };
    });

    await check('phase', async () => {
      const s = stand({ at: 2000 });
      const before = { rest: s.atRest() };
      s.set(60);
      const arriving = counted(() => s.reveal.update({ window: phaseAt(s.startedAt) }));
      const arrived = { animations: s.animations(), frame: s.reveal.frame(), asked: { frames: arriving.frames, animations: arriving.animations } };
      s.dispose();
      const ok = before.rest && arrived.animations.length === 1 && arrived.animations[0].time === 60 && arrived.frame.beat === 'rise' && arrived.frame.window !== s.window.id
        && arrived.asked.frames === 0 && arrived.asked.animations === 1;
      return { ok, before, arrived };
    });

    await check('one', async () => {
      const s = stand({ at: 0 });
      const started = { count: s.mounting.animations };
      const most = [];
      const step = (name, fn) => { const c = counted(fn); started.count += c.animations; most.push({ name, animations: s.host.getAnimations().length, asked: c.frames }); };
      step('mount', () => {});
      for (const t of [20, 60, 90]) step(`update at ${t}`, () => { s.set(t); s.reveal.update({}); });
      step('suspend', () => s.reveal.suspend());
      step('resume', () => s.reveal.resume());
      step('stale', () => s.reveal.update({ status: 'stale' }));
      step('live', () => s.reveal.update({ status: 'live' }));
      step('reduced', () => s.reveal.update({ reducedMotion: true }));
      step('full', () => s.reveal.update({ reducedMotion: false }));
      step('new phase', () => { s.set(30); s.reveal.update({ window: phaseAt(s.startedAt) }); });
      step('concealed', () => s.reveal.update({ status: 'concealed' }));
      step('shown', () => s.reveal.update({ status: 'live' }));
      const everywhere = document.getAnimations().filter(a => a.effect?.target === s.host).length;
      s.dispose();
      // The rise is started once for the first phase, again after Reduce motion let it go, and again after it was hidden.
      const ok = most.every(e => e.animations <= 1 && e.asked === 0) && everywhere <= 1 && started.count <= 4;
      return { ok, most, everywhere, started: started.count };
    });

    await check('taps', async () => {
      const s = stand({ at: 2000 });
      await frames();
      const c = s.cover.getBoundingClientRect(), w = s.host.querySelector('.ms-vote-result').getBoundingClientRect();
      const over = document.elementFromPoint(w.left + w.width / 2, w.top + w.height / 2);
      const beside = document.elementFromPoint(c.left + 4, c.top + c.height / 2);
      const out = { host: getComputedStyle(s.host).pointerEvents, window: getComputedStyle(s.host.querySelector('.ms-vote-result')).pointerEvents,
        over: !!over && s.host.querySelector('.ms-vote-result').contains(over), beside: beside ? beside.className || beside.localName : null, besideInCover: !!beside && s.cover.contains(beside),
        position: getComputedStyle(s.host).position, inset: ['top', 'right', 'bottom', 'left'].map(k => getComputedStyle(s.host)[k]),
        hostBox: (() => { const h = s.host.getBoundingClientRect(); return { left: h.left - c.left, top: h.top - c.top, width: h.width, height: h.height }; })(), cover: { width: c.width, height: c.height } };
      s.dispose();
      const ok = out.host === 'none' && out.window === 'auto' && out.over && !out.besideInCover && out.position === 'absolute' && out.inset.every(v => v === '0px')
        && near(out.hostBox.left, 0, 0.01) && near(out.hostBox.top, 0, 0.01) && near(out.hostBox.width, out.cover.width, 0.01) && near(out.hostBox.height, out.cover.height, 0.01);
      return { ok, ...out };
    });

    await check('quiet', async () => {
      const s = stand({ at: 0, hold: true });
      const attributes = [...s.host.attributes].map(a => a.name).sort();
      const out = { attributes, role: s.host.getAttribute('role'), tabindex: s.host.getAttribute('tabindex'), aria: attributes.filter(n => n.startsWith('aria-')),
        children: [...s.host.children].map(n => n.className), ownText: [...s.host.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).length,
        title: s.host.querySelector('.ms-result-title')?.textContent ?? null, label: s.host.querySelector('.ms-vote-result')?.getAttribute('aria-label') ?? null,
        focusable: s.host.matches('a, button, input, [tabindex]') };
      s.dispose();
      const ok = out.role === null && out.tabindex === null && out.aria.length === 0 && out.ownText === 0 && !out.focusable
        && out.children.length === 1 && /ms-vote-result/.test(out.children[0]) && out.title === 'Gus goes to Jail' && out.label === 'Jail vote result'
        && out.attributes.every(n => ['class', 'data-status', 'data-motion', 'hidden'].includes(n));
      return { ok, ...out };
    });

    await check('refused', async () => {
      const s = stand({ at: 100, hold: true });
      const before = JSON.stringify(s.reveal.frame());
      const refusals = {};
      const refuse = (name, fn) => { try { fn(); refusals[name] = null; } catch (error) { refusals[name] = `${error.name}: ${error.message}`; } };
      const phaseNow = { id: 'p', startedAt: STARTED, endsAt: STARTED + PHASE_MS };
      refuse('tally', () => s.reveal.update({ tally: { outcome: 'PLAYER_JAILED' } }));
      refuse('viewer', () => s.reveal.update({ viewer: 4 }));
      refuse('roster', () => s.reveal.update({ roster: [] }));
      refuse('size', () => s.reveal.update({ size: { width: 390, height: 600 } }));
      refuse('window.outcome', () => s.reveal.update({ window: { ...phaseNow, outcome: 'PLAYER_JAILED' } }));
      refuse('window.selectedSeatId', () => s.reveal.update({ window: { ...phaseNow, selectedSeatId: 'seat-7' } }));
      refuse('window no end', () => s.reveal.update({ window: { id: 'p', startedAt: STARTED } }));
      refuse('window ends before it starts', () => s.reveal.update({ window: { id: 'p', startedAt: STARTED, endsAt: STARTED } }));
      refuse('window no id', () => s.reveal.update({ window: { id: '', startedAt: STARTED, endsAt: STARTED + 1 } }));
      refuse('clock', () => s.reveal.update({ clock: {} }));
      refuse('status', () => s.reveal.update({ status: 'paused' }));
      refuse('reducedMotion', () => s.reveal.update({ reducedMotion: 'yes' }));
      refuse('not an object', () => s.reveal.update('rest'));
      refuse('no element', () => mountResultsReveal(null, {}));
      refuse('mount with a result', () => mountResultsReveal(s.cover, { result: {} }));
      const after = JSON.stringify(s.reveal.frame());
      const hosts = s.cover.querySelectorAll('.ms-results-reveal').length;
      s.dispose();
      const ok = Object.values(refusals).every(r => typeof r === 'string' && r.startsWith('TypeError')) && before === after && hosts === 1;
      return { ok, refusals, unchanged: before === after, hosts };
    });

    await check('dispose', async () => {
      const s = stand({ at: 60 });
      // The window is left in the host: the reveal's dispose() takes it with the host.
      const stray = document.createElement('span');
      s.host.append(stray);
      const cover = s.cover, host = s.host;
      s.reveal.dispose();
      const once = { connected: host.isConnected, stray: stray.isConnected, window: !!cover.querySelector('.ms-vote-result'), children: cover.children.length, frame: s.reveal.frame(), animations: document.getAnimations().filter(a => a.effect?.target === host).length };
      let threw = null;
      const asked = counted(() => { try { s.reveal.dispose(); s.reveal.update({ status: 'stale' }); s.reveal.suspend(); s.reveal.resume(); } catch (error) { threw = String(error); } });
      const twice = { threw, frame: s.reveal.frame(), frames: asked.frames, animations: asked.animations, children: cover.children.length };
      s.result.dispose();
      s.m.dispose();
      const ok = !once.connected && !once.stray && !once.window && once.children === 0 && once.frame === null && once.animations === 0
        && twice.threw === null && twice.frame === null && twice.frames === 0 && twice.animations === 0 && twice.children === 0;
      return { ok, once, twice };
    });
  }

  await check('reduced', async () => {
    // The game's setting in the full run; the device's alone when it is emulated.
    const input = deviceReduced ? {} : { reducedMotion: true };
    const s = stand({ at: 0, input });
    const first = { animations: s.animations(), motion: s.host.dataset.motion ?? null, frame: s.reveal.frame(), below: s.below(), box: s.box(), want: restBox(s), asked: { frames: s.mounting.frames, animations: s.mounting.animations } };
    const again = counted(() => s.reveal.update({}));
    const same = { animations: s.animations().length, asked: again.animations };
    // The fade begins with the page's next frame and is gone 80 ms later.
    await until(() => s.atRest());
    const after = { rest: s.atRest(), frame: s.reveal.frame() };
    const samePhase = counted(() => { s.set(900); s.reveal.update({}); });
    const next = counted(() => { s.set(40); s.reveal.update({ window: phaseAt(s.startedAt) }); });
    const second = { animations: s.animations(), samePhase: samePhase.animations, asked: next.animations };
    s.dispose();
    // A phone standing still when the window first shows does not fade: held, and reconnecting.
    const held = stand({ at: 0, input, hold: true });
    const heldSeen = { animations: held.animations().length, rest: held.atRest() };
    held.dispose();
    const stale = stand({ at: 0, input: { ...input, status: 'stale' } });
    const staleSeen = { animations: stale.animations().length, rest: stale.atRest() };
    stale.dispose();
    const fade = a => a && a.properties.join() === 'opacity' && a.duration === REDUCED_FADE_MS && a.easing === 'linear' && a.fill === 'none';
    const ok = first.animations.length === 1 && fade(first.animations[0]) && first.motion === (deviceReduced ? null : 'reduced') && first.frame.reduced && first.frame.beat === 'rest' && first.frame.still
      && first.below === 0 && sameBox(first.box, first.want) && first.asked.frames === 0 && first.asked.animations === 1
      && same.animations === 1 && same.asked === 0
      && after.rest && !after.frame.running
      && second.samePhase === 0 && second.asked === 1 && second.animations.length === 1 && fade(second.animations[0])
      && heldSeen.animations === 0 && heldSeen.rest && staleSeen.animations === 0 && staleSeen.rest;
    return { ok, deviceReduced, first, same, after, second, held: heldSeen, stale: staleSeen };
  });

  return { mode, ok: checks.every(c => c.ok), checks };
}

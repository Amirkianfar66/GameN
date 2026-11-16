// mothership:dev-only
//
// The round stamp's lifecycle probe: it drives the real component (../round-stamp.mjs) in the real phone shell's
// cover, over the real room scene, in the browser, under whatever headers serve the page
// (design/tools/round-stamp-check.mjs serves the production ones), and reports what it saw. Each check is one
// behaviour Frontend relies on:
//   seek       the stamp's time is the trusted clock's: a phone at 80 ms shows the 80 ms frame, and an update seeks
//              to the clock again
//   late       from 1,400 ms nothing is drawn and nothing is started: a late phone sees no stamp
//   runs       on a running clock the browser carries the stamp to its end and nothing is left; the stamp asks the
//              page for no frame and sets no timer
//   behind     a long first frame does not leave the stamp behind the clock: as the browser starts it, it is at the
//              clock's moment
//   suspend    suspended, it holds the clock's moment; resumed, it seeks to the clock (past its length: gone)
//   stale      reconnecting, it stands still where it is and does not follow the clock; live again, it seeks to it.
//              A stamp that had not begun on this phone does not begin while it is reconnecting
//   concealed  hidden, and nothing runs; shown again, it seeks to the clock
//   reduced    Reduce motion (the game's): an 80 ms fade in, standing, an 80 ms fade out, with no change of size;
//              turned on part-way, the stamp goes on from the clock's moment
//   phase      a new phase id is a new stamp, from the clock's moment; a new round names itself
//   one        one animation at most, whatever is asked in whatever order
//   taps       the stamp takes no tap: the room under it keeps its own
//   quiet      to assistive technology the stamp is nothing: hidden, with no role and nothing to focus
//   refused    an input the stamp does not know is refused, in `window` too, and changes nothing
//   dispose    dispose() removes the stamp, twice safely, and nothing runs after
// With the device's Reduce motion emulated only `reduced` runs, with the game's setting off (the page's mode says
// which).
// Counting: the probe counts the frames, timers and animations the stamp starts synchronously, around a mount or an
// update. The page's other parts (the shell, the room scene, the check's own waits) ask for frames of their own.

import { ROUND_STAMP_BEATS, ROUND_STAMP_FROM, ROUND_STAMP_REDUCED, mountRoundStamp, roundStampFrame } from '../round-stamp.mjs';
import { STARTED } from './preview.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const sleep = ms => new Promise(done => setTimeout(done, ms));
const LENGTH = ROUND_STAMP_BEATS.gone;
/** How far the browser's own solving of a curve may leave the stamp from the component's arithmetic: its size and its strength, as shares. */
export const CURVE_SLACK = 0.003;

export async function runRoundStampProbe({ sizes, phone, intents }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };

  let phases = 0;
  const phaseAt = startedAt => ({ id: `probe-phase-${phases += 1}`, startedAt });
  /** Runs `fn` and counts the frames, timers and animations asked for while it runs. */
  function counted(fn) {
    const raf = window.requestAnimationFrame, timeout = window.setTimeout, interval = window.setInterval, animate = Element.prototype.animate;
    let asked = 0, timers = 0, started = 0;
    window.requestAnimationFrame = callback => { asked += 1; return raf.call(window, callback); };
    window.setTimeout = (...args) => { timers += 1; return timeout.apply(window, args); };
    window.setInterval = (...args) => { timers += 1; return interval.apply(window, args); };
    Element.prototype.animate = function counting(...args) { started += 1; return animate.apply(this, args); };
    try { return { value: fn(), frames: asked, timers, animations: started }; }
    finally { window.requestAnimationFrame = raf; window.setTimeout = timeout; window.setInterval = interval; Element.prototype.animate = animate; }
  }
  /** A phone with the room under it and the stamp mounted here in its cover: on a clock the probe sets (`at`, ms of stamp time), or on the page's own (`real`). */
  function stand({ size = '390x844', at = 0, real = false, input = {}, hold = false } = {}) {
    const p = phone(size, { bare: true });
    document.body.append(p.frame);
    const m = p.mount();
    const startedAt = real ? Date.now() : STARTED;
    let now = startedAt + at;
    const clock = real ? { now: () => Date.now() } : { now: () => now };
    const window0 = phaseAt(startedAt);
    const mounting = counted(() => mountRoundStamp(m.cover, { round: 1, window: window0, clock, ...input }));
    const stamp = mounting.value;
    if (hold) stamp.suspend();
    const root = m.cover.querySelector('.ms-round-stamp'), mark = root.querySelector('.ms-rs-mark'), label = root.querySelector('.ms-k-stamp');
    return {
      m, stamp, root, mark, label, window: window0, startedAt, mounting, clock,
      set: t => { now = startedAt + t; },
      /** How solid the stamp is drawn, and its size as a share of its own. */
      opacity: () => Number(getComputedStyle(mark).opacity),
      scale: () => { const t = getComputedStyle(mark).transform; return t === 'none' ? 1 : Number(/matrix\(([^,]+)/.exec(t)[1]); },
      animations: () => mark.getAnimations().map(a => ({ state: a.playState, time: a.currentTime, duration: a.effect.getTiming().duration, fill: a.effect.getTiming().fill,
        properties: [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))].sort() })),
      /** Nothing drawn, nothing running, nothing set by hand. */
      gone: () => mark.getAnimations().length === 0 && Number(getComputedStyle(mark).opacity) === 0 && !mark.hasAttribute('style'),
      dispose() { stamp.dispose(); m.dispose(); },
    };
  }
  const near = (a, b, slack) => Math.abs(a - b) <= slack;
  /** Waits until `test` holds, looking every 10 ms, for at most `ms`. */
  const until = async (test, ms = 2500) => { const from = performance.now(); while (!test() && performance.now() - from < ms) await sleep(10); return test(); };
  const quietly = asked => asked.frames === 0 && asked.timers === 0;

  if (mode === 'full') {
    await check('seek', async () => {
      const seen = [];
      for (const t of [0, 30, 80, 119, 120, 600, 1180, 1250, 1330, 1399]) {
        const s = stand({ at: t, hold: true });
        await frames();
        const [a] = s.animations(), want = roundStampFrame(t), f = s.stamp.frame();
        seen.push({ t, animations: s.animations().length, state: a?.state, time: a?.time, duration: a?.duration, fill: a?.fill, properties: a?.properties,
          scale: s.scale(), opacity: s.opacity(), want: { beat: want.beat, scale: want.scale, opacity: want.opacity }, frame: f, asked: { frames: s.mounting.frames, timers: s.mounting.timers, animations: s.mounting.animations } });
        s.dispose();
      }
      const moved = (() => {
        const s = stand({ at: 30, hold: true });
        s.set(900);
        const updating = counted(() => s.stamp.update({}));
        const out = { time: s.animations()[0]?.time, frame: s.stamp.frame(), asked: { frames: updating.frames, timers: updating.timers, animations: updating.animations } };
        s.dispose();
        return out;
      })();
      const ok = seen.every(e => e.animations === 1 && e.state === 'paused' && e.time === e.t && e.duration === LENGTH && e.fill === 'none' && e.properties.join() === 'opacity,transform'
          && near(e.scale, e.want.scale, CURVE_SLACK) && near(e.opacity, e.want.opacity, CURVE_SLACK)
          && e.frame.t === e.t && e.frame.beat === e.want.beat && e.frame.round === 1 && !e.frame.running && near(e.frame.scale, e.want.scale, 0.001) && near(e.frame.opacity, e.want.opacity, 0.001)
          && quietly(e.asked) && e.asked.animations === 1)
        // It begins large and clear, goes a little past its size as it lands, stands whole, and leaves without moving.
        && seen[0].scale === ROUND_STAMP_FROM && seen[0].opacity === 0 && seen.find(e => e.t === 80).scale < 1 && seen.find(e => e.t === 600).scale === 1 && seen.find(e => e.t === 600).opacity === 1
        && seen.find(e => e.t === 1330).scale === 1 && seen.find(e => e.t === 1330).opacity < 0.2
        && moved.time === 900 && moved.frame.t === 900 && moved.frame.beat === 'hold' && quietly(moved.asked) && moved.asked.animations === 0;
      return { ok, seen, moved };
    });

    await check('late', async () => {
      const seen = [];
      for (const size of Object.keys(sizes)) for (const t of [LENGTH, LENGTH + 1, 5000, 60000, 3_600_000]) {
        const s = stand({ size, at: t });
        await frames();
        seen.push({ size, t, gone: s.gone(), frame: s.stamp.frame(), asked: { frames: s.mounting.frames, timers: s.mounting.timers, animations: s.mounting.animations } });
        s.dispose();
      }
      const ok = seen.every(e => e.gone && e.frame.beat === 'gone' && !e.frame.running && e.frame.opacity === 0 && e.frame.t === e.t && quietly(e.asked) && e.asked.animations === 0);
      return { ok, seen };
    });

    await check('runs', async () => {
      const s = stand({ real: true });
      const first = { animations: s.animations(), frame: s.stamp.frame(), asked: { frames: s.mounting.frames, timers: s.mounting.timers, animations: s.mounting.animations } };
      await sleep(500);
      const mid = { animations: s.animations(), scale: s.scale(), opacity: s.opacity(), frame: s.stamp.frame() };
      const ended = await until(() => s.gone(), LENGTH + 800);
      await frames();
      const last = { gone: s.gone(), frame: s.stamp.frame(), ended };
      s.dispose();
      const ok = first.animations.length === 1 && first.animations[0].state === 'running' && first.frame.running && quietly(first.asked) && first.asked.animations === 1
        && mid.animations.length === 1 && mid.scale === 1 && mid.opacity === 1 && mid.frame.beat === 'hold' && mid.frame.running
        && last.gone && last.frame.beat === 'gone' && !last.frame.running;
      return { ok, first, mid, last };
    });

    await check('behind', async () => {
      // The page is busy for a long first frame; when the browser starts the stamp, it must be at the clock's moment.
      const s = stand({ real: true });
      const made = s.mark.getAnimations()[0];
      const busyFrom = performance.now();
      while (performance.now() - busyFrom < 130) { /* a long frame */ }
      await made.ready;
      await Promise.resolve();
      const behind = (Date.now() - s.startedAt) - Number(made.currentTime);
      const out = { busyMs: Math.round(performance.now() - busyFrom), clock: Date.now() - s.startedAt, time: made.currentTime, behindMs: Math.round(behind * 10) / 10, state: made.playState };
      s.dispose();
      return { ok: out.busyMs >= 130 && Math.abs(out.behindMs) <= 12 && out.state === 'running', ...out };
    });

    await check('suspend', async () => {
      const s = stand({ real: true });
      await sleep(60);
      s.stamp.suspend();
      const held = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, frame: s.stamp.frame(), clock: Date.now() - s.startedAt };
      await sleep(160);
      const later = { time: s.animations()[0]?.time, state: s.animations()[0]?.state };
      const resuming = counted(() => s.stamp.resume());
      const resumed = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, clock: Date.now() - s.startedAt, asked: { frames: resuming.frames, timers: resuming.timers, animations: resuming.animations } };
      // Suspended across its end: resumed, it is gone at once.
      s.stamp.suspend();
      await sleep(LENGTH);
      const across = { time: s.animations()[0]?.time, state: s.animations()[0]?.state };
      s.stamp.resume();
      const after = { gone: s.gone(), frame: s.stamp.frame() };
      s.dispose();
      const ok = held.state === 'paused' && near(held.time, held.clock, 4) && !held.frame.running && later.state === 'paused' && later.time === held.time
        && resumed.state === 'running' && near(resumed.time, resumed.clock, 4) && resumed.time > held.time + 100 && quietly(resumed.asked) && resumed.asked.animations === 0
        && across.state === 'paused' && after.gone && after.frame.beat === 'gone';
      return { ok, held, later, resumed, across, after };
    });

    await check('stale', async () => {
      const s = stand({ at: 60 });
      s.stamp.update({ status: 'stale' });
      const stood = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, status: s.root.dataset.status, frame: s.stamp.frame() };
      s.set(700);
      s.stamp.update({});
      await frames();
      const still = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, scale: s.scale() };
      const living = counted(() => s.stamp.update({ status: 'live' }));
      const live = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, asked: { frames: living.frames, timers: living.timers, animations: living.animations } };
      // Live again after its length: gone.
      s.stamp.update({ status: 'stale' });
      s.set(LENGTH + 500);
      s.stamp.update({ status: 'live' });
      const past = { gone: s.gone(), frame: s.stamp.frame() };
      s.dispose();
      // A stamp that had not begun on this phone does not begin while it is reconnecting; live, it shows the clock's moment.
      const fresh = stand({ at: 60, input: { status: 'stale' } });
      await frames();
      const never = { gone: fresh.gone(), asked: fresh.mounting.animations, frame: fresh.stamp.frame() };
      fresh.set(200);
      fresh.stamp.update({ status: 'live' });
      const then = { time: fresh.animations()[0]?.time, state: fresh.animations()[0]?.state };
      fresh.dispose();
      const ok = stood.state === 'paused' && stood.time === 60 && stood.status === 'stale' && stood.frame.t === 60 && !stood.frame.running
        && still.state === 'paused' && still.time === 60 && near(still.scale, roundStampFrame(60).scale, CURVE_SLACK)
        && live.state === 'running' && live.time === 700 && quietly(live.asked) && live.asked.animations === 0
        && past.gone && past.frame.beat === 'gone'
        && never.gone && never.asked === 0 && never.frame.beat === 'gone' && then.state === 'running' && then.time === 200;
      return { ok, stood, still, live, past, never, then };
    });

    await check('concealed', async () => {
      const s = stand({ at: 300 });
      s.stamp.update({ status: 'concealed' });
      const hidden = { hidden: s.root.hidden, animations: s.animations().length, frame: s.stamp.frame(), display: getComputedStyle(s.root).display };
      s.set(700);
      const showing = counted(() => s.stamp.update({ status: 'live' }));
      const back = { hidden: s.root.hidden, time: s.animations()[0]?.time, state: s.animations()[0]?.state, asked: showing.animations };
      s.dispose();
      const from = stand({ at: 300, input: { status: 'concealed' } });
      const mounted = { hidden: from.root.hidden, animations: from.animations().length, asked: from.mounting.animations };
      from.dispose();
      const ok = hidden.hidden && hidden.animations === 0 && hidden.display === 'none' && !hidden.frame.shown && !hidden.frame.running && hidden.frame.beat === 'gone'
        && !back.hidden && back.state === 'running' && back.time === 700 && back.asked === 1
        && mounted.hidden && mounted.animations === 0 && mounted.asked === 0;
      return { ok, hidden, back, mounted };
    });

    await check('phase', async () => {
      const s = stand({ at: LENGTH + 2000 });
      const before = { gone: s.gone() };
      // The next round's first phase: a new id, a new start, a new stamp from the clock's moment.
      const next = { id: 'probe-next-phase', startedAt: s.startedAt + 90_000 };
      s.set(90_000 + 40);
      const arriving = counted(() => s.stamp.update({ window: next, round: 2 }));
      const arrived = { time: s.animations()[0]?.time, state: s.animations()[0]?.state, frame: s.stamp.frame(), words: s.label.innerText, asked: arriving.animations };
      // The same phase again is the same stamp: nothing begins anew.
      const again = counted(() => s.stamp.update({ window: { ...next } }));
      const same = { animations: s.animations().length, asked: again.animations };
      // No round: nothing is drawn.
      s.stamp.update({ round: null });
      const none = { gone: s.gone(), frame: s.stamp.frame() };
      s.dispose();
      const ok = before.gone && arrived.state === 'running' && arrived.time === 40 && arrived.frame.window === 'probe-next-phase' && arrived.frame.round === 2 && arrived.words === 'ROUND 2' && arrived.asked === 1
        && same.animations === 1 && same.asked === 0 && none.gone && none.frame.round === null && none.frame.beat === 'gone';
      return { ok, before, arrived, same, none };
    });

    await check('one', async () => {
      const s = stand({ at: 40 });
      const most = [];
      const note = () => most.push(s.mark.getAnimations().length);
      note();
      for (const step of [
        () => s.stamp.update({}), () => s.stamp.suspend(), () => s.stamp.suspend(), () => s.stamp.resume(), () => s.stamp.update({ status: 'stale' }), () => s.stamp.update({ status: 'live' }),
        () => s.stamp.update({ reducedMotion: true }), () => s.stamp.update({ reducedMotion: false }), () => s.stamp.update({ status: 'concealed' }), () => s.stamp.update({ status: 'live' }),
        () => s.stamp.update({ window: { id: 'probe-one-more', startedAt: s.startedAt } }), () => s.stamp.resume(),
      ]) { step(); note(); }
      const everywhere = document.getAnimations().filter(a => a.effect?.target && s.root.contains(a.effect.target)).length;
      s.dispose();
      return { ok: Math.max(...most) === 1 && everywhere === 1, most, everywhere };
    });

    await check('taps', async () => {
      const s = stand({ at: 600, hold: true });
      await frames();
      const r = s.label.getBoundingClientRect(), centre = [r.left + r.width / 2, r.top + r.height / 2];
      const under = document.elementFromPoint(...centre);
      const control = s.m.shell.stage.querySelector('[data-intent="control"]');
      const c = control?.getBoundingClientRect();
      const before = intents.length;
      control?.click();
      const out = { drawn: s.opacity() === 1, pointer: [getComputedStyle(s.root).pointerEvents, getComputedStyle(s.mark).pointerEvents, getComputedStyle(s.label).pointerEvents],
        under: under ? `${under.localName}.${String(under.className?.baseVal ?? under.className).split(' ')[0]}` : null, inStamp: !!under && s.root.contains(under), inRoom: !!under && s.m.shell.stage.contains(under),
        control: control ? { atPoint: c ? (document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2) === control || control.contains(document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2))) : false, intents: intents.slice(before) } : null };
      s.dispose();
      const ok = out.drawn && out.pointer.every(p => p === 'none') && !out.inStamp && out.inRoom && !!out.control && out.control.atPoint && out.control.intents.length === 1 && out.control.intents[0][0] === 'onControl';
      return { ok, ...out };
    });

    await check('quiet', async () => {
      const s = stand({ at: 600, hold: true });
      const out = { ariaHidden: s.root.getAttribute('aria-hidden'), role: s.root.getAttribute('role'), label: s.root.getAttribute('aria-label'), tabindex: s.root.getAttribute('tabindex'),
        focusable: s.root.querySelectorAll('a, button, input, select, textarea, [tabindex], [contenteditable]').length, live: s.root.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
        elements: s.m.cover.querySelectorAll('.ms-round-stamp').length, children: s.root.children.length, words: s.label.innerText, tone: s.label.dataset.tone };
      s.dispose();
      const ok = out.ariaHidden === 'true' && out.role === null && out.label === null && out.tabindex === null && out.focusable === 0 && out.live === 0 && out.elements === 1 && out.children === 1 && out.words === 'ROUND 1' && out.tone === 'gold';
      return { ok, ...out };
    });

    await check('refused', async () => {
      const s = stand({ at: 600, hold: true });
      const before = JSON.stringify(s.stamp.frame());
      const refusals = [
        ['an unknown input', { seat: 4 }], ['a role', { role: 'Doctor' }], ['a turn', { active: 7 }], ['a callback', { onDone: () => {} }],
        ['window.endsAt', { window: { id: 'x', startedAt: STARTED, endsAt: STARTED + 5000 } }], ['a window with no id', { window: { startedAt: STARTED } }], ['a window with no start', { window: { id: 'x' } }],
        ['round 0', { round: 0 }], ['round 1.5', { round: 1.5 }], ['round as text', { round: '1' }], ['a clock with no now()', { clock: {} }], ['an unknown status', { status: 'paused' }], ['reducedMotion as text', { reducedMotion: 'yes' }],
      ].map(([name, changes]) => { try { s.stamp.update(changes); return { name, refused: false }; } catch (error) { return { name, refused: error instanceof TypeError, message: error.message }; } });
      let notAnObject = false;
      try { s.stamp.update('round 2'); } catch (error) { notAnObject = error instanceof TypeError; }
      let noTarget = false;
      try { mountRoundStamp(null, {}); } catch (error) { noTarget = error instanceof TypeError; }
      const after = JSON.stringify(s.stamp.frame());
      s.dispose();
      return { ok: refusals.every(r => r.refused) && notAnObject && noTarget && before === after, refusals, notAnObject, noTarget, unchanged: before === after };
    });

    await check('dispose', async () => {
      const s = stand({ at: 40 });
      const cover = s.m.cover, made = s.mark.getAnimations()[0];
      s.stamp.dispose();
      const first = { left: cover.querySelectorAll('.ms-round-stamp').length, frame: s.stamp.frame(), state: made.playState };
      s.stamp.dispose();
      const after = counted(() => { s.stamp.update({ status: 'live' }); s.stamp.suspend(); s.stamp.resume(); });
      const out = { ...first, again: cover.querySelectorAll('.ms-round-stamp').length, asked: { frames: after.frames, timers: after.timers, animations: after.animations }, frameAfter: s.stamp.frame(), connected: s.root.isConnected };
      s.m.dispose();
      const ok = out.left === 0 && out.frame === null && out.state === 'idle' && out.again === 0 && quietly(out.asked) && out.asked.animations === 0 && out.frameAfter === null && !out.connected;
      return { ok, ...out };
    });
  }

  await check('reduced', async () => {
    // The game's setting in full mode; the device's alone when it is emulated.
    const input = deviceReduced ? {} : { reducedMotion: true };
    const { in: [, shown], leave: [leaving] } = ROUND_STAMP_REDUCED;
    const seen = [];
    for (const t of [0, shown / 2, shown, 600, leaving, leaving + 40, LENGTH - 1]) {
      const s = stand({ at: t, hold: true, input });
      await frames();
      const [a] = s.animations(), want = roundStampFrame(t, { reduced: true });
      seen.push({ t, animations: s.animations().length, properties: a?.properties, duration: a?.duration, time: a?.time, scale: s.scale(), opacity: s.opacity(), want: { beat: want.beat, opacity: want.opacity }, frame: s.stamp.frame(), motion: s.root.dataset.motion ?? null });
      s.dispose();
    }
    const late = stand({ at: LENGTH + 10, input });
    const gone = { gone: late.gone(), asked: late.mounting.animations };
    late.dispose();
    // Turned on part-way (the game's setting): the stamp goes on from the clock's moment, without its landing.
    let turned = null;
    if (!deviceReduced) {
      const s = stand({ at: 60 });
      const before = s.animations()[0]?.properties;
      const turning = counted(() => s.stamp.update({ reducedMotion: true }));
      turned = { before, after: s.animations()[0]?.properties, time: s.animations()[0]?.time, animations: s.animations().length, frame: s.stamp.frame(), asked: turning.animations };
      s.dispose();
    }
    const ok = seen.every(e => e.animations === 1 && e.properties.join() === 'opacity' && e.duration === LENGTH && e.time === e.t && e.scale === 1 && near(e.opacity, e.want.opacity, CURVE_SLACK)
        && e.frame.reduced && e.frame.beat === e.want.beat && e.frame.scale === 1 && e.motion === (deviceReduced ? null : 'reduced'))
      && seen[0].opacity === 0 && near(seen[1].opacity, 0.5, CURVE_SLACK) && seen[2].opacity === 1 && seen[3].opacity === 1 && near(seen[5].opacity, 0.5, CURVE_SLACK)
      && gone.gone && gone.asked === 0
      && (deviceReduced || (turned.before.join() === 'opacity,transform' && turned.after.join() === 'opacity' && turned.time === 60 && turned.animations === 1 && turned.frame.reduced && turned.frame.beat === 'in' && turned.asked === 1));
    return { ok, seen, gone, turned };
  });

  return { mode, ok: checks.every(c => c.ok), checks };
}

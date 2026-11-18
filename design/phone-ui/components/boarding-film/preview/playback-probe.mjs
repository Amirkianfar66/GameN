// mothership:dev-only
// Real canvas scenes under production headers; deterministic scheduling below is a regression test,
// not a measurement of a device's refresh rate or drawing speed.
import { createBoardingScene, prepareBoardingScene, COAST_MS } from '../boarding-film.mjs';

const rosterOf = n => Array.from({ length: n }, (_, i) => ({ seat: i + 1, character: `c${i + 1}` }));
const holder = () => { const node = document.createElement('div'); document.body.append(node); return node; };
const pixels = canvas => { const small = document.createElement('canvas'); small.width = 96; small.height = 208; const ctx = small.getContext('2d'); ctx.drawImage(canvas, 0, 0, 96, 208); return ctx.getImageData(0, 0, 96, 208).data; };
const apart = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
// Repeated GPU-backed raster draws can differ below one channel level. Compare the displayed
// image at the historical probe's 96x208 sample size, allowing 0.05 of a 0..255 channel on average.
const samePicture = (a, b) => apart(a, b) <= 0.05;

async function playbackProbe({ width, height }) {
  const size = { width, height }, checks = [], scenes = [], sets = [], hosts = [];
  const check = (name, ok, detail = {}) => checks.push({ name, ok: !!ok, detail });
  const prepare = async (n = 8) => { const set = prepareBoardingScene(document, { roster: rosterOf(n), ...size }); sets.push(set); await set.ready; return set; };
  const mount = (options, live = false) => { const host = holder(); hosts.push(host); const scene = createBoardingScene(host, { options, live }); scenes.push(scene); return scene; };
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    // Cancelled preparation must never become a stopped bakery inside a new scene.
    const cancelled = await prepare(); cancelled.dispose();
    const recovered = mount({ roster: rosterOf(8), prepared: cancelled });
    recovered.paint(7400, size);
    // The old source adopts the stopped queue, whose ready promise cannot settle after new work is added.
    // Detect that state without hanging this regression run.
    if (!cancelled.adopted) await recovered.ready();
    recovered.paint(7400, size);
    check('cancelled preparation falls back to fresh late-mount pictures', recovered.held().keys.length > 10 && !cancelled.adopted,
      { held: recovered.held().keys.length, adopted: !!cancelled.adopted });
    recovered.dispose();

    // A preparation handle may be discarded after ownership has moved to its scene.
    const transferred = await prepare();
    const owner = mount({ roster: rosterOf(8), prepared: transferred });
    owner.paint(2800, size); const before = pixels(owner.canvas); transferred.dispose(); owner.paint(2800, size);
    check('disposing a transferred preparation does not erase the mounted scene', owner.held().keys.length > 0 && samePicture(pixels(owner.canvas), before),
      { held: owner.held().keys.length, pixelDifference: apart(pixels(owner.canvas), before) });
    owner.dispose();
    check('scene disposal frees the transferred pictures', transferred.assets.stats.bytes === 0 && transferred.assets.stats.pictures === 0);

    for (const n of [7, 8, 9]) {
      const film = mount({ roster: rosterOf(n).reverse().map(m => ({ ...m, role: 'synthetic-private', name: 'ignored' })) });
      film.paint(7400, size); await film.ready(); film.paint(7400, size);
      check(`late mount uses only public seats and characters for ${n} crew`, film.roster.length === n && film.roster.every((m, i) => m.seat === i + 1 && Object.keys(m).join(',') === 'seat,character') && film.held().keys.every(k => /^(in|inhead|mark)/.test(k)));
      const latePixels = pixels(film.canvas), lateKeys = film.held().keys;
      film.paint(1500, size); await film.ready(); film.paint(1500, size);
      film.paint(7400, size); await film.ready(); film.paint(7400, size);
      check(`seeking back then recovering returns to the same picture for ${n} crew`, samePicture(pixels(film.canvas), latePixels),
        { pixelDifference: apart(latePixels, pixels(film.canvas)), heldBefore: lateKeys.length, heldAfter: film.held().keys.length });
      film.dispose(); film.dispose(); film.paint(0, size);
      check(`cleanup is idempotent for ${n} crew`, film.canvas.width === 0 && film.canvas.height === 0 && film.held().keys.length === 0);
    }

    // Measure the film's reaction to a chosen cadence and a chosen drawing cost independently.
    // Canvas rendering still runs; the synthetic cost advances the test clock once per outer save.
    const prepared = await prepare();
    const raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
    const nowDescriptor = Object.getOwnPropertyDescriptor(performance, 'now');
    const due = new Map(); let nextId = 0, now = 1000, cost = 0;
    try {
      window.requestAnimationFrame = callback => { const id = ++nextId; due.set(id, callback); return id; };
      window.cancelAnimationFrame = id => due.delete(id);
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      const film = mount({ roster: rosterOf(8), prepared }, true);
      const ctx = film.canvas.getContext('2d'), save = ctx.save.bind(ctx), restore = ctx.restore.bind(ctx); let depth = 0;
      ctx.save = () => { if (depth++ === 0) now += cost; return save(); };
      ctx.restore = () => { depth--; return restore(); };
      let t = 2200;
      const drive = (gap, count, paint = true) => { for (let i = 0; i < count; i++) { now += gap; t += gap; if (paint) film.paint(t, size); const callbacks = [...due.values()]; due.clear(); for (const callback of callbacks) callback(now); } };
      film.paint(t, size); drive(1000 / 60, 2);
      for (const hz of [60, 30, 120]) {
        drive(1000 / hz, 32);
        check(`cheap prepared frames at ${hz} Hz retain full sharpness`, film.stats.quality === 1, { quality: film.stats.quality, drawMs: film.stats.drawMs });
      }
      if (!deviceReduced) {
        cost = 30; drive(40, 12);
        check('sustained expensive prepared drawing still reduces sharpness', film.stats.quality < 1, { quality: film.stats.quality, drawMs: film.stats.drawMs });
      }
      cost = 0;
      film.paint(5000, { ...size, variant: 'reduced' });
      check('reduced motion cancels the outstanding animation frame', due.size === 0);
      film.paint(5200, size); film.suspend();
      const count = film.stats.ownFrames; drive(40, 4);
      check('suspend stops own frames even when explicit paints continue', due.size === 0 && film.stats.ownFrames === count);
      film.resume(); film.paint(7400, size); drive(16, 3, false);
      check('resume needs a fresh paint and uses its new elapsed time', deviceReduced ? due.size === 0 : film.stats.ownFrames > count);
      now += COAST_MS + 1; drive(1, 1, false);
      check('the film stops after the last authoritative paint becomes stale', due.size === 0);
      film.paint(10000, size);
      check('the exact end queues no animation frame', due.size === 0);
      film.dispose(); film.paint(2000, size);
      check('dispose removes the canvas and all scheduled frames', due.size === 0 && !film.element.isConnected && film.canvas.width === 0);

      if (!deviceReduced) {
        const cold = mount({ roster: rosterOf(8) }, true);
        cold.paint(2200, size);
        const initial = cold.stats.quality, planned = cold.stats.planned;
        for (let i = 0; i < 7; i++) {
          now += 120; cold.paint(2200 + i * 120, size);
          const callbacks = [...due.values()]; due.clear(); for (const callback of callbacks) callback(now);
        }
        check('late unprepared playback still reduces pending artwork cost', cold.stats.quality < initial && cold.stats.lateSteps > 0 && cold.stats.planned < planned,
          { initial, quality: cold.stats.quality, lateSteps: cold.stats.lateSteps, plannedBefore: planned, plannedAfter: cold.stats.planned });
        cold.dispose();
        const next = mount({ roster: rosterOf(8) }, true);
        check('unprepared lateness is not remembered by the next scene', next.stats.quality === initial, { initial, next: next.stats.quality });
        next.dispose();
      }
    } finally {
      window.requestAnimationFrame = raf; window.cancelAnimationFrame = caf;
      if (nowDescriptor) Object.defineProperty(performance, 'now', nowDescriptor); else delete performance.now;
    }
  } finally {
    for (const scene of scenes) scene.dispose();
    for (const set of sets) set.dispose();
    for (const host of hosts) host.remove();
  }
  return { deviceReduced, checks };
}

window.__boardingPlaybackProbe = playbackProbe;

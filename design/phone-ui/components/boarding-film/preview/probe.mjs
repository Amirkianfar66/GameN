// mothership:dev-only
//
// The boarding film's probe: what its picture, its clock and its lifecycle must hold, checked in a page on the
// runtime component itself (../boarding-film.mjs). design/tools/boarding-film-check.mjs runs it under the production
// headers, once as the page comes and once with the device's Reduce motion.
//   time       a frame is a function of the time it is given: the same time, the same picture; seeking back is a
//              fresh film's picture; a phone that joins late draws only what is left; the end is the night and nothing more
//   motion     between paints the scene moves by itself, and stops when the paints stop
//   reduced    Reduce motion (the game's or the device's) is five held pictures: no frame of its own, no jolt, no flash
//   lifecycle  suspend() stops its frames, resume() lets the next paint restart them, dispose() gives everything back
//   pictures   every picture's ink lies inside its box; the memory planned is within the budget, and what is held is
//              what was planned
//   roster     public only: 7 to 9 members, and nothing but a seat and a character changes the picture

import { BOARDING_MS, COAST_MS, DOOR_BEATS, MEMORY_BUDGET, SHOTS, STILLS, STILL_FADE_MS, STILL_OUT, TITLE, boardingFrame, createBoardingScene, prepareBoardingScene, shotOf } from '../boarding-film.mjs';

const rosterOf = count => Array.from({ length: count }, (_, i) => ({ seat: i + 1, character: `c${i + 1}` }));
const wait = ms => new Promise(done => setTimeout(done, ms));

/** A canvas's picture as a number: a hash of its pixels, read small. */
function pictureOf(canvas) {
  const small = document.createElement('canvas');
  small.width = 96; small.height = 208;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, 0, 0, small.width, small.height);
  const data = ctx.getImageData(0, 0, small.width, small.height).data;
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 1) { h ^= data[i]; h = Math.imul(h, 16777619); }
  return { hash: (h >>> 0).toString(16), data };
}
/** How far two pictures are apart: the mean difference of their small copies, in levels. */
function apart(a, b) {
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 1) sum += Math.abs(a.data[i] - b.data[i]);
  return sum / a.data.length;
}
/** How bright a picture is, 0..255. */
const brightness = p => { let sum = 0; for (let i = 0; i < p.data.length; i += 4) sum += p.data[i] + p.data[i + 1] + p.data[i + 2]; return sum / (p.data.length / 4 * 3); };

export async function runProbe({ width, height }) {
  const checks = [];
  const check = (name, ok, detail = null) => checks.push({ name, ok: Boolean(ok), detail });
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const holder = () => { const node = document.createElement('div'); node.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;z-index:9`; document.body.append(node); return node; };
  const size = { width, height };
  // Counts the frames a scene asks the page for (the page itself asks for none while the film is held: preview.mjs).
  const real = window.requestAnimationFrame.bind(window);
  const frames = n => new Promise(done => { const step = k => (k ? real(() => step(k - 1)) : done()); step(n); });
  let asked = 0;
  window.requestAnimationFrame = callback => { asked += 1; return real(callback); };
  const prepared = prepareBoardingScene(document, { roster: rosterOf(8), ...size });
  await prepared.ready;
  try {
    // ── pictures ──
    {
      const cut = [];
      let crew = 0;
      for (const job of prepared.jobs) {
        const made = prepared.assets.get(job.key);
        if (!made || !/^(walk|climb|bust|last|ahead|in)/.test(job.key)) continue;
        crew += 1;
        const { canvas } = made, ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        ctx.canvas.width = canvas.width; ctx.canvas.height = canvas.height;
        ctx.drawImage(canvas, 0, 0);
        const edges = [ctx.getImageData(0, 0, canvas.width, 1).data, ctx.getImageData(0, canvas.height - 1, canvas.width, 1).data, ctx.getImageData(0, 0, 1, canvas.height).data, ctx.getImageData(canvas.width - 1, 0, 1, canvas.height).data];
        const inked = edges.map(edge => { let max = 0; for (let i = 3; i < edge.length; i += 4) max = Math.max(max, edge[i]); return max; });
        if (inked.some(a => a > 24)) cut.push(`${job.key} ${inked.join('/')}`);
        ctx.canvas.width = 0; ctx.canvas.height = 0;
      }
      check('pictures: every picture of the crew is whole (no ink on its box\'s edge)', crew > 60 && cut.length === 0, { crew, cut: cut.slice(0, 6) });
      check('pictures: none failed to draw', prepared.assets.stats.failed === 0, { failed: prepared.assets.stats.failed, pictures: prepared.assets.stats.pictures });
      check('memory: what is planned is within the budget', prepared.bytes <= MEMORY_BUDGET, { plannedBytes: prepared.bytes, budget: MEMORY_BUDGET, sharp: prepared.sharp });
      check('memory: what is held, all drawn at once, is what was planned', Math.abs(prepared.assets.stats.bytes - prepared.bytes) <= prepared.bytes * 0.06, { heldBytes: prepared.assets.stats.bytes, plannedBytes: prepared.bytes });
    }

    // ── time ──
    const stage = holder();
    const scene = createBoardingScene(stage, { options: { roster: rosterOf(8), prepared }, live: false });
    const at = t => { scene.paint(t, size); return pictureOf(scene.canvas); };
    {
      const shots = Object.entries(SHOTS);
      check('time: the shots run end to end over exactly 10,000 ms', shots[0][1][0] === 0 && shots.at(-1)[1][1] === BOARDING_MS && shots.every(([, [a, b]], i) => b > a && (i === 0 || shots[i - 1][1][1] === a)) && BOARDING_MS === 10000);
      check('time: each moment belongs to its shot', shots.every(([id, [a, b]]) => shotOf(a) === id && shotOf(b - 1) === id) && boardingFrame(-50).t === 0 && boardingFrame(12000).t === BOARDING_MS);
      asked = 0;
      const first = at(2800), again = at(2800);
      check('time: the same time gives the same picture', first.hash === again.hash, { hash: first.hash });
      check('time: a scene told to draw only when painted asks the page for no frame', asked === 0, { asked });
      const before = scene.stats.frames; at(4000);
      check('time: one paint is one drawing', scene.stats.frames === before + 1);
      // Seeking back: the picture of a film that had never gone forward.
      if (!deviceReduced) {
        at(8600); at(9500);
        scene.paint(1500, size); await scene.ready();
        const back = at(1500);
        const fresh = createBoardingScene(holder(), { options: { roster: rosterOf(8) }, live: false });
        fresh.paint(1500, size); await fresh.ready(); fresh.paint(1500, size);
        const clean = pictureOf(fresh.canvas);
        check('time: seeking back draws what a film just begun draws there', back.hash === clean.hash, { apart: +apart(back, clean).toFixed(3) });
        fresh.element.parentNode.remove(); fresh.dispose();
        check('time: the shots differ (a cut changes the picture)', apart(at(1900), at(2100)) > 6 && apart(at(6500), at(6600)) > 6 && apart(at(6850), at(7300)) > 3);
      }
      const end = at(TITLE.night + 5), after = at(BOARDING_MS + 4000);
      check('time: from 9,960 ms the frame is the night, and past the end it stays the night', brightness(end) < 14 && end.hash === after.hash, { brightness: +brightness(end).toFixed(2) });
      // A phone that joins late draws only what is left of the film.
      const late = createBoardingScene(holder(), { options: { roster: rosterOf(8) }, live: false });
      late.paint(7400, size); await late.ready(); late.paint(7400, size);
      const keys = late.held().keys;
      check('time: a phone that joins late draws only what is left', keys.length > 10 && keys.every(key => /^(in|inhead|mark)/.test(key)), { keys: keys.length, other: keys.filter(key => !/^(in|inhead|mark)/.test(key)).slice(0, 5) });
      const joined = pictureOf(late.canvas);
      scene.paint(7400, size); await scene.ready();
      const there = at(7400);
      check('time: and its picture is the film\'s at that moment', joined.hash === there.hash, { apart: +apart(joined, there).toFixed(3) });
      late.element.parentNode.remove(); late.dispose();
    }

    // ── reduced ──
    {
      asked = 0;
      const still = i => { scene.paint(STILLS[i].at + STILL_FADE_MS + 20, { ...size, variant: 'reduced' }); return pictureOf(scene.canvas); };
      const held = STILLS.map((_, i) => still(i));
      const later = STILLS.map((s, i) => { const until = i + 1 < STILLS.length ? STILLS[i + 1].at : STILL_OUT[0]; scene.paint(until - 10, { ...size, variant: 'reduced' }); return pictureOf(scene.canvas); });
      check('reduced: five held pictures, each the same from its fade to the next', held.every((p, i) => p.hash === later[i].hash) && new Set(held.map(p => p.hash)).size === STILLS.length, { stills: held.map(p => p.hash) });
      check('reduced: the scene asks the page for no frame of its own', asked === 0, { asked });
      const fades = STILLS.map(s => [boardingFrame(s.at, { variant: 'reduced' }).fade, boardingFrame(s.at + STILL_FADE_MS / 2, { variant: 'reduced' }).fade, boardingFrame(s.at + STILL_FADE_MS, { variant: 'reduced' }).fade]);
      check('reduced: each comes in from the night over 160 ms', STILL_FADE_MS === 160 && fades.every(([a, b, c]) => a === 0 && Math.abs(b - 0.5) < 1e-9 && c === 1));
      // The door's slam and the entrance's glare are not held; the mark is held at rest (its landing is not drawn).
      const jolts = [[DOOR_BEATS.slam - 20, DOOR_BEATS.slam + 240], [5150, 5400]];
      scene.paint(STILLS.at(-1).at + STILL_FADE_MS + 20, { ...size, variant: 'reduced' });
      const rest = pictureOf(scene.canvas);
      scene.paint(STILLS.at(-1).at + STILL_FADE_MS + 420, { ...size, variant: 'reduced' });
      check('reduced: no held picture is a jolt, a flash or a glare', STILLS.every(s => jolts.every(([a, b]) => s.moment < a || s.moment > b)) && rest.hash === pictureOf(scene.canvas).hash && STILLS.at(-1).moment > TITLE.hit + 200, { moments: STILLS.map(s => s.moment) });
      scene.paint(TITLE.night + 5, { ...size, variant: 'reduced' });
      check('reduced: it ends on the night as the film does', brightness(pictureOf(scene.canvas)) < 14 && boardingFrame(STILL_OUT[1], { variant: 'reduced' }).fade === 0);
      scene.paint(2800, size);
      check('reduced: the device\'s Reduce motion gives the held pictures whatever is asked', scene.held().variant === (deviceReduced ? 'reduced' : 'full'), { device: deviceReduced, variant: scene.held().variant });
    }
    stage.remove(); scene.dispose();

    // ── motion and lifecycle (a scene that moves by itself) ──
    {
      const stage2 = holder();
      const moving = createBoardingScene(stage2, { options: { roster: rosterOf(8) } });
      const start = performance.now();
      asked = 0;
      // Painted thirty times a second for a while, as the player paints.
      for (let i = 0; i < 12; i += 1) { moving.paint(2200 + (performance.now() - start), size); await frames(2); }
      const own = moving.stats.ownFrames;
      check('motion: between two paints the scene draws frames of its own', deviceReduced ? own === 0 : own >= 8, { ownFrames: own, paints: moving.stats.paints });
      check('motion: one drawing a frame (a paint while its own frame is due only gives the time)', deviceReduced || moving.stats.frames <= moving.stats.ownFrames + 2, { frames: moving.stats.frames, ownFrames: moving.stats.ownFrames, paints: moving.stats.paints });
      // The paints stop: the picture coasts, then stops.
      await wait(COAST_MS + 260);
      const coasted = moving.stats.ownFrames; asked = 0;
      await wait(260);
      check('motion: when the paints stop, the scene stops by itself', moving.stats.ownFrames === coasted && asked === 0, { ownFrames: [own, coasted, moving.stats.ownFrames], asked });
      // suspend(): a paint still draws, and asks for no frame.
      moving.suspend(); asked = 0;
      const frozen = moving.stats.ownFrames;
      moving.paint(3000, size); await wait(140);
      check('lifecycle: suspended, a paint draws its frame and the scene asks for none', moving.stats.ownFrames === frozen && asked === 0, { asked });
      moving.resume(); moving.paint(3100, size); await frames(6);
      check('lifecycle: resumed, the next paint restarts its frames', deviceReduced ? moving.stats.ownFrames === frozen : moving.stats.ownFrames > frozen, { ownFrames: moving.stats.ownFrames - frozen });
      // The film's end: nothing after it.
      moving.paint(BOARDING_MS, size); await frames(3); asked = 0; await wait(120);
      check('time: at the end the scene asks for no more frames, and tells no one', asked === 0, { asked });
      const canvases = [...stage2.querySelectorAll('canvas')];
      moving.dispose(); asked = 0;
      const before = moving.stats.frames;
      moving.paint(3000, size); await wait(120);
      check('lifecycle: dispose() removes the film and gives its memory back', stage2.children.length === 0 && canvases.every(c => c.width === 0 && c.height === 0) && moving.held().keys.length === 0);
      check('lifecycle: after dispose() a paint does nothing', moving.stats.frames === before && asked === 0);
      stage2.remove();
    }

    // ── roster ──
    {
      const refuses = count => { try { createBoardingScene(document.createElement('div'), { options: { roster: rosterOf(count) }, live: false }).dispose(); return false; } catch { return true; } };
      check('roster: 7, 8 and 9 members; fewer or more is refused', refuses(6) && refuses(10) && !refuses(7) && !refuses(9));
      const draw = roster => { const node = holder(), film = createBoardingScene(node, { options: { roster }, live: false }); return film.ready().then(async () => { film.paint(8700, size); await film.ready(); film.paint(8700, size); const picture = pictureOf(film.canvas); film.dispose(); node.remove(); return picture; }); };
      const plain = await draw(rosterOf(8));
      const dressed = await draw(rosterOf(8).map((member, i) => ({ ...member, role: i ? 'Doctor' : 'Alien', team: 'Red', name: `Player ${i}`, alive: false, health: 'Injured' })).reverse());
      check('roster: only a seat and a character reach the picture (anything else given is ignored), in seat order', deviceReduced ? true : plain.hash === dressed.hash, { apart: +apart(plain, dressed).toFixed(3) });
    }
  } finally {
    window.requestAnimationFrame = real;
    prepared.dispose();
    for (const node of [...document.body.children]) if (node.style?.zIndex === '9') node.remove();
  }
  return { deviceReduced, checks };
}

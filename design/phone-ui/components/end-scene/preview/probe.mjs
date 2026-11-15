// mothership:dev-only
//
// The end scene's lifecycle probe (index.html?probe=1): the runtime component itself (../end-scene.mjs, unchanged),
// mounted on a synthetic end phase with a clock the probe moves, in the real DOM with the real styles. It checks what
// the agreed interface promises (#271):
//   time      every moment shows the clock's frame, the arrival exactly as arrivalSvg() draws it; a late phone shows
//             the clock's moment and replays nothing; two phones on one clock draw the same picture; the scene follows
//             the clock frame by frame, holds its still at the end, and never reports anything; a new end phase is a
//             new scene; no winner has its own beats
//   still     the approved poster's frame with the stamp and the words, laid as the pack lays them; no clock and no
//             phase show it; no result shows the dark field and no words
//   words     each result's stamp, tone, title, line and text alternative, as the pack's end screen writes them
//   reduced   the game's setting (data-motion="reduced") and the device's: the still, one 80 ms fade, no frames
//   lifecycle suspend and resume, stale and live, concealed and shown, dispose twice; one frame loop at most
//   layout    the hero is the top half; the title block sits at the shell's top safe area + 34 %
//   privacy   any input the scene does not know is refused, a result the contract refuses too, and it draws no seat,
//             name, role or code, and no planet without an arrival
// With the device's Reduce motion (the check emulates it), it checks that setting too.
// design/tools/end-scene-check.mjs runs it under the production headers and records each result.
// Desktop Chromium: not a phone, not Safari, not a screen reader.

import { END_BEATS, END_WORDS, REDUCED_FADE_MS, arrivalLayers, endSceneFrame, endWords, mountEndScene } from '../end-scene.mjs';
import { PLANETS } from '../arrival-art.mjs';

// The page's own frame functions: the probe waits on these, and counts only what the scenes ask for.
const nativeRaf = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);
const frames = n => new Promise(done => { const step = k => (k ? nativeRaf(() => step(k - 1)) : done()); step(n); });
const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
const windowAt = (id, start = EPOCH) => ({ id, startedAt: start });
const RED = Object.freeze({ winner: 'Red', reason: 'ARRIVAL', alienCoWinner: false });
const BLUE = Object.freeze({ winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false });
const NONE = Object.freeze({ winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false });
const ABORTED = Object.freeze({ winner: null, reason: 'ABORTED', alienCoWinner: false });
const SVG = 'http://www.w3.org/2000/svg';

/** What a scene shows, read from its DOM. */
function drawn(scene) {
  const root = scene.element;
  const part = selector => root.querySelector(selector);
  const shown = node => getComputedStyle(node).display !== 'none';
  return {
    field: part('.ms-es-hero').dataset.field ?? null,
    hero: shown(part('.ms-es-hero')),
    body: shown(part('.ms-es-body')),
    front: shown(part('.ms-es-front')),
    bodyNodes: part('.ms-es-body').childNodes.length,
    title: shown(part('.ms-es-title')),
    stamp: { opacity: part('.ms-es-stamp').style.opacity, transform: part('.ms-es-stamp').style.transform },
    words: [part('.ms-es-heading'), part('.ms-es-line')].map(n => ({ opacity: n.style.opacity, transform: n.style.transform })),
    text: { stamp: part('.ms-k-stamp').textContent, tone: part('.ms-k-stamp').dataset.tone ?? null, title: part('.ms-es-heading').textContent, line: shown(part('.ms-es-line')) ? part('.ms-es-line').textContent : null },
    label: root.getAttribute('aria-label'),
  };
}
/** Whether the scene's body layer is exactly arrivalSvg()'s body at tau, parsed the same way, with the scene's ids. */
function bodyIs(scene, side, tau) {
  const body = scene.element.querySelector('.ms-es-body');
  const prefix = /id="(mses\d+)-/.exec(body.innerHTML)?.[1] ?? null;
  if (!prefix) return false;
  const want = document.createElementNS(SVG, 'svg');
  want.innerHTML = arrivalLayers(side, tau, prefix).body;
  return want.childNodes.length === body.childNodes.length && [...want.childNodes].every((n, i) => n.isEqualNode(body.childNodes[i]));
}
/** Whether the title block's inline styles are what a frame gives (none at rest). */
function stylesAre(scene, fr) {
  const d = drawn(scene);
  const o = v => (v === 1 ? '' : String(v));
  return d.stamp.opacity === o(fr.stamp.opacity) && d.stamp.transform === (fr.stamp.scale === 1 ? '' : `scale(${fr.stamp.scale})`)
    && d.words.every(w => w.opacity === o(fr.words.opacity) && w.transform === (fr.words.rise === 0 ? '' : `translateY(${fr.words.rise}px)`));
}

export async function runEndSceneProbe() {
  const checks = [];
  const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, detail }); };
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'relative', width: '390px', height: '844px', overflow: 'hidden' });
  document.body.append(host);
  // Count the frames the scenes ask for (a still scene asks for none), and how many are waiting at once.
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
  const base = { window: windowAt('w1'), clock, result: RED, round: 6, size: { width: 390, height: 844 }, safe: { top: 47 } };
  const mount = (input = {}) => mountEndScene(host, { ...base, ...input });
  const guarded = async (group, run) => {
    try { await run(); } catch (error) { check(`${group}: ran without an exception`, false, { error: String(error?.stack ?? error) }); }
    host.replaceChildren();
  };

  if (deviceReduced) {
    await guarded('device', async () => {
      now = EPOCH + 1500;
      const scene = mount();
      await frames(3);
      const before = requested;
      now += 1000;
      await frames(4);
      const fr = scene.frame();
      check('device Reduce motion: the still, the poster\'s frame, with the game\'s setting off', fr.still && fr.reduced && !fr.running && fr.tau === 4100 && bodyIs(scene, 'Red', 4100)
        && stylesAre(scene, endSceneFrame(Infinity, RED)), { frame: fr });
      check('device Reduce motion: no frames are asked for', requested === before, { requested: requested - before });
      check('device Reduce motion: the still comes in with one 80 ms fade', scene.element.hasAttribute('data-fade') && !scene.element.dataset.motion
        && scene.element.getAnimations().some(a => a.effect?.getTiming().duration === REDUCED_FADE_MS), { motion: scene.element.dataset.motion ?? null });
      scene.update({ result: NONE });
      check('device Reduce motion: no winner is the still too, the dark field and its words', scene.frame().still && drawn(scene).field === 'none' && !drawn(scene).body
        && drawn(scene).text.stamp === END_WORDS.stamp.none, { frame: scene.frame(), drawn: drawn(scene) });
      scene.dispose();
    });
    restore();
    host.remove();
    return { mode: 'device-reduced', ok: checks.every(c => c.ok), checks };
  }

  await guarded('time', async () => {
    // Each moment: the clock's frame, clamped to the scene, the arrival exactly as arrivalSvg() draws it.
    const moments = [[-500, 0, 'film'], [0, 0, 'film'], [1500, 1500, 'film'], [3650, 3650, 'film'], [3700, 3700, 'settle'], [3760, 3760, 'settle'], [4000, 4000, 'settle'], [4500, 4500, 'still'], [12000, 4500, 'still']];
    const seen = [];
    for (const [at, t, beat] of moments) {
      now = EPOCH + at;
      const scene = mount();
      scene.suspend();
      const fr = scene.frame(), want = endSceneFrame(t, RED);
      seen.push({ at, t: fr.t, beat: fr.beat, tau: fr.tau, ok: fr.t === t && fr.beat === beat && fr.tau === Math.round(want.tau * 1000) / 1000 && bodyIs(scene, 'Red', want.tau) && stylesAre(scene, want) });
      scene.dispose();
    }
    check('time: each moment shows the clock\'s frame, the arrival as arrivalSvg() draws it', seen.every(s => s.ok), { seen });

    // A late phone: the still at once, nothing replayed, no frames (counted as it mounts, so nothing else on the page is).
    now = EPOCH + 9000;
    const before = requested;
    const late = mount();
    const asked = requested - before;
    await frames(3);
    check('time: a phone that opens after the end shows the still at once and asks for no frames', late.frame().still && !late.frame().running && asked === 0 && bodyIs(late, 'Red', 4100),
      { frame: late.frame(), asked });
    late.dispose();
    now = EPOCH + 2000;
    const mid = mount();
    check('time: a phone that opens at 2 s shows 2 s at once', mid.frame().t === 2000 && mid.frame().beat === 'film' && mid.frame().running && bodyIs(mid, 'Red', 2000), { frame: mid.frame() });
    mid.dispose();

    // Two phones on one clock draw the same picture.
    now = EPOCH + 3100;
    const a = mount(), b = mount();
    check('time: two phones on the same clock draw the same picture', a.frame().tau === b.frame().tau && bodyIs(a, 'Red', 3100) && bodyIs(b, 'Red', 3100)
      && JSON.stringify(drawn(a)) === JSON.stringify(drawn(b)), { a: a.frame(), b: b.frame() });
    a.dispose(); b.dispose();

    // It follows the clock frame by frame, then holds the still: the poster's frame.
    now = EPOCH + 3300;
    const scene = mount();
    const ts = [];
    for (let i = 0; i < 6; i += 1) { now += 200; await frames(1); ts.push([scene.frame().t, scene.frame().tau]); }
    const wantTs = [3500, 3700, 3900, 4100, 4300, 4500].map(t => [t, Math.round(endSceneFrame(t, RED).tau * 1000) / 1000]);
    check('time: it follows the trusted clock frame by frame, its clock slowing onto the poster\'s 4.1 s', JSON.stringify(ts) === JSON.stringify(wantTs), { ts, want: wantTs });
    await frames(2);
    const end = scene.frame(), held = requested;
    await frames(4);
    check('time: at the end it holds the still and asks for no more frames', end.beat === 'still' && end.still && !end.running && requested === held, { frame: end, requested: requested - held });
    check('time: the still is the approved poster\'s frame, and the title block lies as the pack lays it (nothing inline)', bodyIs(scene, 'Red', 4100) && stylesAre(scene, endSceneFrame(Infinity, RED))
      && drawn(scene).stamp.transform === '' && drawn(scene).words.every(w => w.transform === '' && w.opacity === ''), { drawn: drawn(scene) });

    // A new end phase is a new scene, from its own start.
    scene.update({ window: windowAt('w2', EPOCH + 3500) });
    await frames(1);
    check('time: a new end phase is a new scene, from its own start', scene.frame().window === 'w2' && scene.frame().t === 1000 && scene.frame().running, { frame: scene.frame() });
    scene.dispose();

    // No winner: the dark field; the stamp at 0.3 s, the words at 0.6 s, the still at 1 s.
    const none = [];
    for (const [at, beat] of [[0, 'field'], [300, 'field'], [460, 'field'], [800, 'field'], [1000, 'still']]) {
      now = EPOCH + at;
      const s = mount({ result: NONE });
      s.suspend();
      const d = drawn(s);
      none.push({ at, beat: s.frame().beat, ok: s.frame().beat === beat && d.field === 'none' && !d.body && !d.front && d.bodyNodes === 0 && stylesAre(s, endSceneFrame(at, NONE)) });
      s.dispose();
    }
    check('time: no winner has its own beats on the dark field, with nothing drawn of an arrival', none.every(n => n.ok), { none, beats: END_BEATS.none });
  });

  await guarded('still', async () => {
    now = EPOCH + 1500;
    const noClock = mount({ clock: null }), noWindow = mount({ window: null });
    check('still: with no trusted clock, or no end phase, the still, the same on every phone', noClock.frame().still && noWindow.frame().still && !noClock.frame().running
      && bodyIs(noClock, 'Red', 4100) && bodyIs(noWindow, 'Red', 4100) && JSON.stringify(drawn(noClock)) === JSON.stringify(drawn(noWindow)), { noClock: noClock.frame(), noWindow: noWindow.frame() });
    noClock.dispose(); noWindow.dispose();
    const blue = mount({ result: BLUE, clock: null });
    check('still: Blue\'s still is the Blue poster\'s frame', blue.frame().side === 'Blue' && bodyIs(blue, 'Blue', 4100), { frame: blue.frame() });
    blue.dispose();
    now = EPOCH + 6000;
    const empty = mount({ result: null });
    const d = drawn(empty);
    check('still: no result is the dark field with no words', empty.frame().kind === 'empty' && empty.frame().still && !empty.frame().running && d.field === 'none' && !d.body && !d.title
      && d.label === `${END_WORDS.label.over}.`, { frame: empty.frame(), drawn: d });
    empty.update({ result: RED });
    await frames(1);
    check('still: a result that arrives late shows the clock\'s moment, here the still', empty.frame().still && empty.frame().kind === 'arrival' && bodyIs(empty, 'Red', 4100) && drawn(empty).title, { frame: empty.frame() });
    empty.dispose();
  });

  await guarded('words', async () => {
    now = EPOCH + 6000;
    const results = [RED, BLUE, { ...RED, alienCoWinner: true }, { ...BLUE, alienCoWinner: true }, NONE, ABORTED];
    const seen = [];
    for (const result of results) {
      const scene = mount({ result });
      const d = drawn(scene), want = endWords(result, 6);
      seen.push({ result, text: d.text, label: d.label, ok: d.text.stamp === want.stamp && d.text.tone === want.tone && d.text.title === want.title && d.text.line === want.line && d.label === want.label });
      scene.dispose();
    }
    const pack = [['RED WINS', 'gold', 'Red reached Red Planet', 'Round 6'], ['BLUE WINS', 'gold', 'Blue reached Blue Planet', 'Round 6'],
      ['RED WINS · ALIEN TOO', 'gold', 'Red reached Red Planet', 'The Alien survived and used Blackhole'], ['BLUE WINS · ALIEN TOO', 'gold', 'Blue reached Blue Planet', 'The Alien survived and used Blackhole'],
      ['NO WINNER', null, 'No survivors', 'Round 6'], ['NO WINNER', null, 'Match aborted', 'The host ended the match']];
    check('words: each result\'s stamp, tone, title and line, as the pack\'s end screen writes them', seen.every((s, i) => s.ok && JSON.stringify([s.text.stamp, s.text.tone, s.text.title, s.text.line]) === JSON.stringify(pack[i])), { seen });
    const noRound = mount({ result: RED, round: null });
    check('words: without a round, no line', drawn(noRound).text.line === null && drawn(noRound).label === 'Red wins. Red reached Red Planet.', { drawn: drawn(noRound) });
    noRound.update({ round: 7 });
    check('words: a round that arrives shows "Round 7"', drawn(noRound).text.line === 'Round 7', { drawn: drawn(noRound) });
    noRound.dispose();
  });

  await guarded('reduced', async () => {
    now = EPOCH + 1000;
    const scene = mount();
    await frames(2);
    scene.update({ reducedMotion: true });
    const before = requested;
    now += 1500;
    await frames(4);
    const fr = scene.frame();
    check('reduced: the game\'s Reduce motion shows the still, marked data-motion="reduced", and asks for no frames', fr.still && !fr.running && scene.element.dataset.motion === 'reduced'
      && requested === before && bodyIs(scene, 'Red', 4100), { frame: fr, requested: requested - before });
    check('reduced: the still comes in with one 80 ms fade, and nothing else moves', scene.element.getAnimations({ subtree: true }).every(a => a.effect?.getTiming().duration === REDUCED_FADE_MS)
      && scene.element.getAnimations().length === 1, { animations: scene.element.getAnimations({ subtree: true }).map(a => a.effect?.getTiming().duration) });
    scene.update({ reducedMotion: false });
    await frames(1);
    check('reduced: turned off mid-scene, it seeks to the clock', scene.frame().t === 2500 && scene.frame().running && !scene.element.dataset.motion && bodyIs(scene, 'Red', 2500), { frame: scene.frame() });
    scene.dispose();
  });

  await guarded('lifecycle', async () => {
    now = EPOCH + 500;
    const scene = mount();
    await frames(2);
    scene.suspend();
    const held = scene.frame().t, before = requested;
    now += 500;
    await frames(4);
    check('lifecycle: suspended, it stands still and asks for no frames', scene.frame().t === held && !scene.frame().running && requested === before, { held, frame: scene.frame() });
    scene.resume();
    await frames(1);
    check('lifecycle: resumed, it seeks to the clock, replaying nothing', scene.frame().t === 1000 && scene.frame().running, { frame: scene.frame() });

    scene.update({ status: 'stale' });
    const staleAt = scene.frame().t;
    now += 500;
    await frames(3);
    check('lifecycle: reconnecting (stale), it stands still where it was', scene.frame().t === staleAt && !scene.frame().running && scene.frame().status === 'stale', { frame: scene.frame() });
    scene.update({ status: 'live' });
    await frames(1);
    check('lifecycle: live again, it seeks to the clock', scene.frame().t === 1500 && scene.frame().running, { frame: scene.frame() });

    scene.update({ status: 'concealed' });
    const d = drawn(scene);
    check('lifecycle: concealed, nothing of the scene is drawn or named, and no frames run', !d.hero && !d.title && d.label === END_WORDS.label.concealed
      && !scene.frame().running && !scene.frame().shown, { frame: scene.frame(), drawn: d });
    now += 500;
    scene.update({ status: 'live' });
    await frames(1);
    check('lifecycle: shown again, it seeks to the clock', scene.frame().t === 2000 && scene.frame().running && drawn(scene).hero && drawn(scene).title, { frame: scene.frame() });

    // One frame loop at most, however many updates arrive.
    const most = [];
    for (let i = 0; i < 5; i += 1) { scene.update({ round: 6 + (i % 2) }); most.push(waiting.size); }
    await frames(3);
    most.push(waiting.size);
    check('lifecycle: one frame loop at most, whatever the updates', most.every(n => n <= 1) && scene.frame().running, { waiting: most });

    scene.dispose();
    let threw = null;
    try { scene.dispose(); scene.update({ result: NONE }); scene.suspend(); scene.resume(); } catch (error) { threw = String(error); }
    const afterDispose = requested;
    now += 1000;
    await frames(3);
    check('lifecycle: dispose() twice is safe; after it nothing runs and frame() is null', threw === null && scene.frame() === null && !scene.element.isConnected
      && requested === afterDispose && host.childElementCount === 0, { threw, requested: requested - afterDispose });
  });

  await guarded('layout', async () => {
    now = EPOCH + 6000;
    const scene = mount();
    const box = node => node.getBoundingClientRect();
    const top = () => box(scene.element.querySelector('.ms-es-title')).top - box(host).top;
    const heroBox = box(scene.element.querySelector('.ms-es-hero'));
    const a = top();
    scene.update({ safe: { top: 0 } });
    const b = top();
    check('layout: the title block sits at the top safe area + 34 %, and follows a change', Math.abs(a - (47 + 0.34 * 844)) < 0.5 && Math.abs(b - 0.34 * 844) < 0.5, { safe47: a, safe0: b });
    check('layout: the hero is the top half of the phone, the scene the whole phone', Math.abs(heroBox.height - 422) < 0.5 && Math.abs(heroBox.width - 390) < 0.5
      && Math.abs(box(scene.element).height - 844) < 0.5, { hero: [heroBox.width, heroBox.height] });
    scene.dispose();
  });

  await guarded('privacy', async () => {
    const refused = [];
    const inputs = [{ seat: 'seat-4' }, { role: 'Alien' }, { team: 'Red' }, { code: [2, 5, 6, 9] }, { endReveal: { roles: [] } }, { names: ['Ava'] }, { viewer: 'seat-4' },
      { window: { ...windowAt('w'), endsAt: EPOCH } }, { window: { ...windowAt('w'), kind: 'FINISHED' } }, { result: { ...RED, roles: [] } }, { size: { width: 390, height: 844, scale: 3 } },
      { safe: { top: 47, bottom: 34 } }, { insets: { top: 47, bottom: 34 } }, { skip: true }, { onEnded: () => {} }];
    for (const input of inputs) {
      try { mount(input); refused.push({ input: JSON.stringify(input), refused: false }); } catch (error) { refused.push({ input: JSON.stringify(input), refused: error instanceof TypeError }); }
      host.replaceChildren();
    }
    check('privacy: every input the scene does not know is refused, at every level', refused.every(r => r.refused), { refused });
    const contract = [];
    for (const result of [{ winner: 'Red', reason: 'NO_SURVIVORS', alienCoWinner: false }, { winner: 'Blue', reason: 'ABORTED', alienCoWinner: false }, { winner: null, reason: 'ARRIVAL', alienCoWinner: false },
      { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: true }, { winner: 'Alien', reason: 'ARRIVAL', alienCoWinner: false }, { winner: 'Red', reason: 'BLACKHOLE', alienCoWinner: false }, { winner: 'Red', reason: 'ARRIVAL' }, { reason: 'ABORTED', alienCoWinner: false }]) {
      try { mount({ result }); contract.push({ result, refused: false }); } catch (error) { contract.push({ result, refused: error instanceof TypeError }); }
      host.replaceChildren();
    }
    check('privacy: a result the contract refuses is refused (a winner without an arrival, the Alien without a winner)', contract.every(r => r.refused), { contract });
    now = EPOCH + 6000;
    const scene = mount();
    let updateRefused = false;
    try { scene.update({ roles: [{ seatId: 'seat-6', role: 'Undercover' }] }); } catch (error) { updateRefused = error instanceof TypeError; }
    check('privacy: an update with the reveal is refused', updateRefused);
    const said = `${scene.element.textContent} ${scene.element.getAttribute('aria-label')}`;
    const named = /seat|Player|Doctor|Insider|Disabler|Supplier|Engineer|Undercover|Hacker|Original Code|\(you\)/i.exec(said);
    check('privacy: it says only its words, and no seat, name, role or code', !named && scene.element.textContent === `${END_WORDS.stamp.Red}${END_WORDS.title.Red}Round 6`, { said, found: named?.[0] ?? null });
    scene.update({ result: NONE });
    const hues = Object.values(PLANETS).flatMap(p => Object.values(p)).filter(Boolean);
    const markup = scene.element.innerHTML;
    check('privacy: without an arrival it keeps no planet, even hidden', drawn(scene).bodyNodes === 0 && hues.every(hue => !markup.includes(hue)), { bodyNodes: drawn(scene).bodyNodes });
    scene.dispose();
  });

  restore();
  host.remove();
  return { mode: 'full', ok: checks.every(c => c.ok), checks };
}

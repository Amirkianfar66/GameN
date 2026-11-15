// mothership:dev-only
//
// The room scene's lifecycle probe (index.html?single=1&probe=1): the runtime component itself
// (../room-scene.mjs, unchanged), mounted on the phone pack's synthetic fixtures with a clock the probe
// moves, and driven through the updates the game makes (Frontend's model sends one every 250 ms). It
// checks, in the real DOM with the real CSS animations and the real focus, the four things Frontend's
// review of 03029b34 asked for (#261):
//   held      a Blackout window keeps the frame and every press square through a resize, lit and dark
//   private   layout() and the scene show no one in the dark or concealed; offers and the control are
//             dropped when concealed and when the viewer changes; nothing is left after dispose()
//   time      a still voyage stays still whatever the clock does, and goes back on the clock when it runs
//   focus     the control, the positions and the press squares are kept across updates, and the focus
//             with them; it moves to the scene only when its offer ends, and onFocusReturn says which
// With the device's Reduce motion (the check emulates it), it checks that setting instead.
// design/tools/room-scene-check.mjs runs it under the production headers and records each result.
// Desktop Chromium: not a phone, not Safari, not a screen reader.

import { mountRoomScene } from '../room-scene.mjs';
import { SKY_EPOCH } from '../ambient.mjs';

const frames = n => new Promise(done => { const step = k => (k ? requestAnimationFrame(() => step(k - 1)) : done()); step(n); });
const settled = () => new Promise(done => setTimeout(done, 0));
const near = (a, b, within) => Number.isFinite(a) && Math.abs(a - b) <= within;

/** Every ambient animation of a scene: its time and whether it runs. */
function voyage(scene) {
  const all = [...scene.element.querySelectorAll('svg.amb')].flatMap(svg => svg.getAnimations({ subtree: true }));
  const times = all.map(a => Number(a.currentTime));
  return { count: all.length, time: times[0], same: times.every(t => t === times[0]), paused: all.every(a => a.playState === 'paused'),
    running: all.every(a => a.playState === 'running') };
}
const geometry = scene => { const { frame, places } = scene.layout(); return JSON.stringify([frame.k, frame.tx, frame.ty, frame.panel, places]); };
const boxOf = node => node && JSON.stringify([node.style.left, node.style.top, node.style.width, node.style.height]);

export async function runRoomSceneProbe({ host, base, size, large }) {
  const checks = [];
  const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, detail }); };
  const intents = [], returns = [];
  const handlers = {
    onSeat: seat => intents.push(['seat', seat]), onSlot: slot => intents.push(['slot', slot]), onControl: id => intents.push(['control', id]),
    onFocusReturn: ended => returns.push(ended),
  };
  let t = 1000;
  const clock = { now: () => SKY_EPOCH + t };
  const mount = input => mountRoomScene(host, { ...base, clock, size, ...input }, handlers);
  const tick = (scene, n) => { for (let i = 0; i < n; i += 1) { t += 250; scene.update({ active: i % 2 ? base.active : base.self }); } };
  // A group that throws fails, and the others still run; whatever it mounted is cleared away.
  const guarded = async (group, run) => {
    try { await run(); } catch (error) { check(`${group}: ran without an exception`, false, { error: String(error?.stack ?? error) }); }
    host.replaceChildren();
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // The device's Reduce motion, with the game's own setting off and a trusted clock: still, at the clock's moment.
    t = 5000;
    const scene = mount({ reducedMotion: false });
    const first = voyage(scene);
    t = 8000;
    tick(scene, 4);
    scene.update({ status: 'live' });
    const later = voyage(scene);
    check('device-reduced: the voyage stands still at the clock\'s moment and stays there', first.count > 0 && first.paused && first.time === 5000 && later.paused && later.time === 5000,
      { animations: first.count, first: first.time, afterUpdates: later.time });
    scene.dispose();
    return { mode: 'device-reduced', ok: checks.every(c => c.ok), checks };
  }

  // 1 · held: one Blackout window, 390 × 653 → 430 × 741, lit preview then dark, new insets.
  await guarded('held', async () => {
    const scene = mount({ hold: null, control: null, targets: null });
    const lit = geometry(scene);
    scene.update({ hold: 'blackout-1', targets: { slots: ['B5'], picked: null, icon: 'move' } });
    const slot = scene.element.querySelector('.ms-rs-slot');
    const box = boxOf(slot);
    const steps = [];
    for (const change of [{ size: large }, { lighting: 'dark' }, { insets: { top: 70, bottom: 20 } }, { size }, { size: large, hold: true }]) {
      scene.update(change);
      const now = scene.element.querySelector('.ms-rs-slot');
      steps.push({ change: Object.keys(change).join('+'), same: geometry(scene) === lit, held: scene.layout().frame.held, slotKept: now === slot, slotBox: boxOf(now) === box });
    }
    check('held: one window keeps the frame and every press square through a resize, lit and dark', steps.every(s => s.same && s.held && s.slotKept && s.slotBox)
      && scene.element.style.width === `${large.width}px`, { steps, sceneWidth: scene.element.style.width });
    scene.update({ hold: null, lighting: 'lit', targets: null, insets: { top: 46, bottom: 8 } });
    const after = scene.layout().frame;
    check('held: the window ends and the room is framed again in the current size', !after.held && after.panel.width === large.width && geometry(scene) !== lit,
      { panel: after.panel, held: after.held });
    scene.dispose();
  });

  // 2 · private: who is where only while the lit room shows them; this viewer's offers and control only.
  await guarded('private', async () => {
    const scene = mount({ targets: { seats: [3, 6, 8], picked: [6] } });
    const q = selector => scene.element.querySelectorAll(selector).length;
    const lit = scene.layout();
    check('private: lit, layout() gives who is where', lit.people.length === 4 && lit.people.every(p => p.slot && p.side > 0), { people: lit.people.map(p => [p.seat, p.slot]) });
    scene.update({ lighting: 'dark', hold: 'blackout-2', targets: null, control: null });
    const dark = scene.layout();
    check('private: dark, layout() is geometry alone and nobody is drawn', dark.people.length === 0 && dark.places.length === 5 && q('.ms-rs-fig') + q('.ms-rs-tag') + q('.ms-rs-press') === 0,
      { people: dark.people.length, places: dark.places.length, drawn: q('.ms-rs-fig') + q('.ms-rs-tag') });
    scene.update({ lighting: 'lit', hold: null, control: base.control, targets: { seats: [3, 6], picked: [] } });
    scene.update({ status: 'concealed' });
    const hidden = scene.layout();
    const nothing = q('.ms-rs-fig') + q('.ms-rs-tag') + q('.ms-rs-press') + q('.ms-rs-slot') + q('.ms-rs-control') + q('.ms-rs-art') + q('.ms-rs-label');
    check('private: concealed, nothing of the room, not even its name', hidden.people.length === 0 && nothing === 0 && scene.element.getAttribute('aria-label') === 'Room hidden'
      && !('room' in scene.element.dataset), { people: hidden.people.length, drawn: nothing, label: scene.element.getAttribute('aria-label') });
    scene.update({ targets: { seats: [3] } });
    const offeredConcealed = q('.ms-rs-press');
    scene.update({ status: 'live' });
    check('private: offers and the control are dropped when concealed, not kept for when it shows', offeredConcealed === 0 && q('.ms-rs-press') === 0 && q('.ms-rs-control') === 0,
      { pressesWhileConcealed: offeredConcealed, presses: q('.ms-rs-press'), controls: q('.ms-rs-control') });
    scene.update({ targets: { seats: [3, 6], picked: [] }, control: base.control });
    const before = [q('.ms-rs-press'), q('.ms-rs-control')];
    scene.update({ self: 5 });
    const another = [q('.ms-rs-press'), q('.ms-rs-control')];
    scene.update({ self: null });
    check('private: a new viewer, or a shared display, never gets the last viewer\'s offers or control', before.join() === '2,1' && another.join() === '0,0' && q('.ms-rs-press') + q('.ms-rs-control') === 0,
      { before, afterViewerChange: another });
    const element = scene.element;
    scene.dispose();
    check('private: after dispose(), no layout and no element', scene.layout() === null && !element.isConnected && !host.querySelector('.ms-room-scene'), {});
  });

  // 3 · time: still while reduced, reconnecting or suspended, whatever the clock does; back on the clock when live.
  await guarded('time', async () => {
    t = 1000;
    const scene = mount({ reducedMotion: true });
    const a = voyage(scene);
    t = 9000;
    scene.update({ active: base.self });
    const b = voyage(scene);
    check('time: Reduce motion, the clock 1 s → 9 s and an update: still at 1 s', a.count > 0 && a.paused && a.same && a.time === 1000 && b.paused && b.time === 1000,
      { animations: a.count, mounted: a.time, afterUpdate: b.time });
    tick(scene, 8);
    scene.update({ status: 'stale' });
    t = 12000;
    tick(scene, 4);
    const c = voyage(scene);
    check('time: eight 250 ms model updates, then reconnecting: still at 1 s', c.paused && c.time === 1000, { time: c.time, clock: t });
    const live = t;
    scene.update({ status: 'live', reducedMotion: false });
    const d = voyage(scene);
    await frames(4);
    const e = voyage(scene);
    check('time: back in motion, on the clock again', d.running && near(d.time, live, 1) && e.running && e.time > d.time, { resumedAt: d.time, clock: live, afterFrames: e.time });
    scene.suspend();
    const f = voyage(scene);
    t = 30000;
    tick(scene, 6);
    const g = voyage(scene);
    check('time: suspended, it stands where it was, through clock and updates', f.paused && f.time >= e.time && f.time < live + 5000 && g.paused && g.time === f.time,
      { suspendedAt: f.time, afterUpdates: g.time, clock: t });
    scene.resume();
    const h = voyage(scene);
    check('time: resumed, on the clock again', h.running && near(h.time, t, 1) && t > f.time + 10000, { resumedAt: h.time, clock: t });
    await frames(2);
    scene.update({ clock: null });
    const i = voyage(scene);
    t = 45000;
    tick(scene, 2);
    check('time: the clock withdrawn while running, it stands where it was (no jump to 0 s)', i.paused && i.time >= 30000 && voyage(scene).time === i.time, { time: i.time });
    scene.dispose();
    const none = mountRoomScene(host, { ...base, size, clock: null }, handlers);
    const j = voyage(none);
    none.update({ active: base.self });
    none.update({ reducedMotion: true });
    none.update({ reducedMotion: false });
    const k = voyage(none);
    check('time: no trusted clock ever given, still at 0 s', j.count > 0 && j.paused && j.time === 0 && k.paused && k.time === 0, { mounted: j.time, afterUpdates: k.time });
    none.dispose();
  });

  // 4 · focus: kept across ordinary updates; moved to the scene, and reported, only when its offer ends.
  await guarded('focus', async () => {
    const scene = mount({ targets: null });
    const root = scene.element;
    const control = root.querySelector('.ms-rs-control');
    control.focus();
    tick(scene, 8);
    scene.update({ control: { ...base.control, label: 'Windows · 3' } });
    const kept = root.querySelector('.ms-rs-control') === control && document.activeElement === control && control.querySelector('.ms-rs-control__label').textContent === 'Windows · 3';
    scene.update({ control: { ...base.control, enabled: false } });
    control.click();
    const off = control.getAttribute('aria-disabled') === 'true' && document.activeElement === control && intents.length === 0;
    scene.update({ control: base.control });
    control.click();
    const on = control.getAttribute('aria-disabled') === null && JSON.stringify(intents) === '[["control","windows"]]';
    scene.update({ status: 'stale' });
    await settled();
    const moved = document.activeElement === root && !control.isConnected && JSON.stringify(returns) === '[{"intent":"control","value":"windows"}]';
    check('focus: the control is kept through updates, a new label and turning off and on; when it ends the focus moves to the scene', kept && off && on && moved,
      { kept, off, on, moved, returns: [...returns] });

    // Offered positions in the dark: kept by place; reconnecting makes them unavailable but keeps the focus.
    scene.update({ status: 'live', lighting: 'dark', hold: 'blackout-3', targets: { slots: ['B5'], picked: null, icon: 'move' } });
    const slot = root.querySelector('.ms-rs-slot[data-value="B5"]');
    slot.focus();
    tick(scene, 8);
    scene.update({ targets: { slots: ['B5', 'B1'], picked: 'B5', icon: 'move' } });
    const slotKept = root.querySelector('.ms-rs-slot[data-value="B5"]') === slot && document.activeElement === slot && slot.hasAttribute('data-picked');
    scene.update({ status: 'stale' });
    slot.click();
    const slotOff = slot.isConnected && slot.getAttribute('aria-disabled') === 'true' && document.activeElement === slot && intents.length === 1;
    scene.update({ status: 'live' });
    slot.click();
    const slotOn = JSON.stringify(intents.at(-1)) === '["slot","B5"]';
    scene.update({ targets: null });
    await settled();
    const slotMoved = document.activeElement === root && JSON.stringify(returns.at(-1)) === '{"intent":"slot","value":"B5"}';
    check('focus: an offered position is kept through updates and reconnecting; when the offer ends the focus moves to the scene', slotKept && slotOff && slotOn && slotMoved,
      { slotKept, slotOff, slotOn, slotMoved });

    // A person's press square: kept through ticks and a pick; removed with its offer.
    scene.update({ lighting: 'lit', hold: null, targets: { seats: [3, 6, 8], picked: [] } });
    const press = root.querySelector('.ms-rs-person[data-seat="6"] .ms-rs-press');
    press.focus();
    tick(scene, 8);
    scene.update({ targets: { seats: [3, 6, 8], picked: [6] } });
    const pressKept = root.querySelector('.ms-rs-person[data-seat="6"] .ms-rs-press') === press && document.activeElement === press && press.hasAttribute('data-picked');
    const before = returns.length;
    scene.update({ targets: { seats: [6, 8], picked: [6] } });
    await settled();
    const quiet = returns.length === before && document.activeElement === press;
    scene.update({ targets: { seats: [8], picked: [] } });
    await settled();
    const pressMoved = document.activeElement === root && JSON.stringify(returns.at(-1)) === '{"intent":"seat","value":"6"}' && returns.length === before + 1;
    check('focus: a press square is kept through updates and a pick; only the focused one ending moves the focus', pressKept && quiet && pressMoved,
      { pressKept, quiet, pressMoved });
    scene.dispose();
  });
  return { mode: 'full', ok: checks.every(c => c.ok), checks };
}

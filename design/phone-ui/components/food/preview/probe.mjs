// mothership:dev-only
//
// The Food component's lifecycle probe (index.html?probe=1): the runtime component itself (../food.mjs, unchanged),
// mounted on the preview's synthetic states in the real DOM with the real styles and pictures. It checks what the
// agreed interface promises (#213; Frontend's four answers on #4, relayed by Integration):
//   contacts   a pointer, a key or an assistive activation on Hold is reported, never matched here; every pointer and
//              key that comes up anywhere is reported; one set of window listeners per mount, alive through redraws
//              and through the control being disabled; a disabled Hold reports nothing unless a contact is still held
//              or owed, and then it still reports, so that it can be let go
//   presses    RELEASE, LOCK and the key report once per press; a disabled control and a stale screen report nothing
//   offers     each of the controller's seven offers alone enables its own control and no other
//   requests   Ask, Join, Decline and Cancel report; the surface sends nothing itself
//   stale      gameplay intents stop; the tabs, Settings and Close go on working
//   focus      the same control stays focused across redraws; a new card or sheet takes focus; Escape closes the
//              surface's own sheet and goes no further, is held during a Task, and is left alone otherwise
//   lifecycle  one frame loop per mount; suspend lets everything go and stops it; resume draws the current state at
//              the current time, as a new mount would; with no trusted time no Task is drawn; leaving the Task, losing
//              the view, being concealed and dispose each let everything go; dispose is safe twice; nothing is listened
//              to afterwards
//   quiet      mounted, pressed, redrawn and disposed, the surface makes no request, sets no timer and stores nothing
//   ownership  what Food covers and what its bars measure are reported apart, each when it changes, and cleared on
//              exit and on dispose; another open panel hides Food
//   privacy    concealed, nothing of the viewer is left in the page or remembered; a key the inputs do not know is
//              refused, on the phone and on the shared display's notice
//   motion     the game's Reduce motion and the device's
//   pictures   the pictures may come after the mount; the loader's signal is listened to once and let go
//   adapter    Frontend's own controller and contact adapter, wired as the adapter will wire them: a hold goes down
//              and up through them, survives the redraws in between, and is let go by suspend; the surface shows the
//              press on its way, never a hold the ship has not confirmed
// design/tools/food-component-check.mjs runs it under the production headers, once as the page comes and once with the
// device's Reduce motion emulated, and records each result. Desktop Chromium: not a phone, not Safari, not a screen
// reader, and no server.

import { createFoodHoldInput } from '@mothership/game';
import { FOOD_HANDLERS, FOOD_VERSION, foodGauge, mountFood, mountFoodNotice } from '../food.mjs';
import { VERSIONS, describe, inputsFromModel, phone, pictures, situation } from './stage.mjs';

/** Every listener added to the window or the document while the probe runs, and not yet removed. */
function watchListeners(win) {
  const live = [], undo = [];
  for (const [target, name] of [[win, 'window'], [win.document, 'document']]) {
    const add = target.addEventListener, remove = target.removeEventListener, flag = options => options === true || !!options?.capture;
    target.addEventListener = function (type, listener, options) { live.push({ target: name, type, listener, capture: flag(options) }); return add.call(this, type, listener, options); };
    target.removeEventListener = function (type, listener, options) {
      const at = live.findIndex(e => e.target === name && e.type === type && e.listener === listener && e.capture === flag(options));
      if (at >= 0) live.splice(at, 1);
      return remove.call(this, type, listener, options);
    };
    undo.push(() => { delete target.addEventListener; delete target.removeEventListener; });
  }
  return { list: () => live.map(e => `${e.target}:${e.type}${e.capture ? ':capture' : ''}`).sort(), restore: () => undo.forEach(f => f()) };
}
/** The frames asked of the page and not yet run or cancelled. */
function watchFrames(win) {
  const raf = win.requestAnimationFrame.bind(win), cancel = win.cancelAnimationFrame.bind(win), pending = new Set();
  let asked = 0;
  win.requestAnimationFrame = fn => { asked++; const id = raf(stamp => { pending.delete(id); fn(stamp); }); pending.add(id); return id; };
  win.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  const frames = n => new Promise(done => { const step = k => (k ? raf(() => step(k - 1)) : done()); step(n); });
  return { pending: () => pending.size, asked: () => asked, frames, restore() { delete win.requestAnimationFrame; delete win.cancelAnimationFrame; } };
}

export async function runProbe(document) {
  const win = document.defaultView, stage = document.querySelector('#stage'), checks = [];
  const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, detail }); };
  const deviceReduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scratch = phone(document, '390x844');
  stage.append(scratch.el);
  const assets = await pictures(document, document.body, VERSIONS);
  scratch.el.remove();
  const listeners = watchListeners(win), frames = watchFrames(win);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /** One mount of the component on a preview state, with every report written down. */
  function open(stateId, changes = {}, wire = null) {
    const sit = situation(stateId), device = phone(document, '390x844'), calls = [];
    stage.append(device.el);
    const before = listeners.list();
    const handlers = Object.fromEntries(FOOD_HANDLERS.map(name => [name, (...args) => { calls.push([name, ...structuredClone(args)]); wire?.[name]?.(...args); }]));
    const input = { ...sit.input, assets, bars: device.bars(), ...changes };
    const food = mountFood(device.host, input, handlers);
    const added = () => { const rest = [...before]; return listeners.list().filter(entry => { const at = rest.indexOf(entry); if (at < 0) return true; rest.splice(at, 1); return false; }); };
    return {
      sit, device, calls, food, input, host: device.host, added,
      frame: () => device.host.querySelector('.planet-food.ph'),
      find: selector => device.host.querySelector(selector),
      named: name => calls.filter(call => call[0] === name).map(call => call.slice(1)),
      forget: () => { calls.length = 0; },
      seen: () => describe(device.host, assets),
      close() { food.dispose(); device.el.remove(); },
    };
  }
  const pointer = (node, type, options = {}) => node.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, button: 0, isPrimary: true, pointerId: 7, ...options }));
  const key = (node, type, value, options = {}) => node.dispatchEvent(new win.KeyboardEvent(type, { bubbles: true, cancelable: true, key: value, ...options }));
  const click = (node, detail = 0) => node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, detail }));
  const step = async (name, run) => { try { await run(); } catch (error) { check(`${name}: ran`, false, { error: String(error?.stack ?? error) }); } };

  // ── Contacts ────────────────────────────────────────────────────────────────────────────────────────────────
  await step('contacts', async () => {
    const m = open('case-food-winch-02'), hold = m.find('#food-control-hold');
    check('contacts: Hold is offered on this state', !!hold && hold.getAttribute('aria-disabled') !== 'true', { found: !!hold });
    m.forget();
    pointer(hold, 'pointerdown');
    check('contacts: a pointer down on Hold reports onHold with its pointer', same(m.named('onHold'), [[{ pointerId: 7 }]]), { calls: m.calls });
    pointer(win, 'pointerup');
    pointer(win, 'pointercancel', { pointerId: 9 });
    check('contacts: every pointer that comes up or is cancelled anywhere is reported, matched or not', same(m.named('onLetGo'), [[{ pointerId: 7 }], [{ pointerId: 9 }]]), { calls: m.calls });
    m.forget();
    key(hold, 'keydown', ' ');
    key(hold, 'keydown', ' ', { repeat: true });
    key(win, 'keyup', ' ');
    check('contacts: Space on Hold reports the key down, its repeat as a repeat, and the key up', same(m.calls, [['onHold', { key: ' ', repeat: false }], ['onHold', { key: ' ', repeat: true }], ['onLetGo', { key: ' ' }]]), { calls: m.calls });
    m.forget();
    key(hold, 'keydown', 'Enter');
    key(win, 'keyup', 'Enter');
    key(hold, 'keydown', 'a');
    check('contacts: Enter does the same, and no other key goes down', same(m.calls, [['onHold', { key: 'Enter', repeat: false }], ['onLetGo', { key: 'Enter' }]]), { calls: m.calls });
    m.forget();
    click(hold, 0);
    click(hold, 1);
    check('contacts: an assistive activation reports onHold({ assistive }), and a pointer\'s own click reports nothing more', same(m.calls, [['onHold', { assistive: true }]]), { calls: m.calls });
    m.forget();
    pointer(hold, 'pointerdown', { button: 2 });
    pointer(hold, 'pointerdown', { isPrimary: false });
    check('contacts: another button or a second finger reports nothing', m.calls.length === 0, { calls: m.calls });
    check('contacts: the surface sent nothing itself', m.sit.live.sent.length === 0, { sent: m.sit.live.sent.length });

    const mine = m.added();
    check('listeners: one set on the window per mount (pointerup, pointercancel, keyup), and none of the app\'s (blur, focus, visibility, preferences)',
      same(mine, ['window:keyup:capture', 'window:pointercancel:capture', 'window:pointerup:capture']), { added: mine });
    for (let i = 0; i < 40; i++) m.food.update({ can: { hold: i % 2 === 0 }, status: i % 5 === 4 ? 'stale' : 'live', board: { ...m.input.board, phase: { kind: 'FOOD_SUPPLY', remainingMs: 20000 - i * 100 } } });
    await frames.frames(3);
    check('listeners: the same set after forty redraws, through the control being disabled and the screen going stale', same(m.added(), mine), { added: m.added() });
    m.close();
    check('listeners: none left after dispose', m.added().length === 0, { added: m.added() });
  });

  await step('contacts while disabled', async () => {
    // Frontend's packet again, with nothing held and nothing owed: Hold is there, and disabled.
    const off = open('food-winch-03', { sending: { feedback: null, pendingCount: 0, physicalHolding: false, needsContactOff: false } }), idle = off.find('#food-control-hold');
    off.forget();
    pointer(idle, 'pointerdown'); key(idle, 'keydown', ' '); click(idle, 0);
    check('contacts: with no offer and nothing held, Hold is disabled and reports no contact', idle?.getAttribute('aria-disabled') === 'true' && off.named('onHold').length === 0, { disabled: idle?.getAttribute('aria-disabled') ?? null, calls: off.calls });
    off.close();

    // Frontend's packet: the let-go's answer is unknown, a contact-off is owed, and no hold is offered.
    const owed = open('food-winch-03'), node = owed.find('#food-control-hold');
    check('contacts: a contact-off is owed and no hold is offered on this state', owed.input.can.hold === false && owed.input.sending.needsContactOff === true && !!node, { can: owed.input.can, sending: owed.input.sending });
    owed.forget();
    pointer(node, 'pointerdown');
    pointer(win, 'pointerup');
    check('contacts: Hold still reports the contact then, so that it can be let go', same(owed.calls, [['onHold', { pointerId: 7 }], ['onLetGo', { pointerId: 7 }]]), { calls: owed.calls });
    // What Frontend's own contact adapter makes of the same reports: with a contact owed, an assistive activation is the let-go.
    const acts = [], adapter = createFoodHoldInput({ down: () => { acts.push('down'); return false; }, up: () => { acts.push('up'); }, held: () => true });
    owed.forget();
    click(node, 0);
    for (const [name, contact] of owed.calls) if (name === 'onHold' && contact.assistive) adapter.assistiveClick();
    check('contacts: through Frontend\'s createFoodHoldInput, that assistive activation is an up and never a down', same(acts, ['up']), { acts });
    owed.close();
  });

  // ── Presses ─────────────────────────────────────────────────────────────────────────────────────────────────
  await step('presses', async () => {
    const m = open('food-panel-04'), lock = m.find('#food-panel-main');
    check('presses: LOCK is offered on this state', lock?.dataset.act === 'lock' && lock.getAttribute('aria-disabled') !== 'true', { act: lock?.dataset.act ?? null });
    m.forget();
    pointer(lock, 'pointerdown');
    check('presses: a pointer down on LOCK reports onPress("PANEL_LOCK") once', same(m.calls, [['onPress', 'PANEL_LOCK']]), { calls: m.calls });
    m.forget();
    key(lock, 'keydown', 'Enter');
    key(lock, 'keydown', 'Enter', { repeat: true });
    key(lock, 'keydown', 'Enter');
    check('presses: Enter reports once until the key comes up', same(m.named('onPress'), [['PANEL_LOCK']]), { calls: m.calls });
    key(win, 'keyup', 'Enter');
    key(lock, 'keydown', ' ');
    check('presses: after the key comes up, Space reports again', same(m.named('onPress'), [['PANEL_LOCK'], ['PANEL_LOCK']]), { calls: m.calls });
    key(win, 'keyup', ' ');
    m.forget();
    click(lock, 0);
    click(lock, 1);
    check('presses: an assistive activation reports once, and a pointer\'s own click nothing more', same(m.named('onPress'), [['PANEL_LOCK']]), { calls: m.calls });
    m.food.update({ status: 'stale' });
    m.forget();
    pointer(lock, 'pointerdown'); key(lock, 'keydown', 'Enter'); key(win, 'keyup', 'Enter'); click(lock, 0);
    check('presses: stale, the control is disabled and reports nothing', lock.getAttribute('aria-disabled') === 'true' && m.named('onPress').length === 0, { disabled: lock.getAttribute('aria-disabled'), calls: m.calls });
    m.close();

    const sending = open('food-panel-03'), release = sending.find('#food-panel-main');
    sending.forget();
    pointer(release, 'pointerdown'); click(release, 0);
    check('presses: while a press is on its way, the control is busy and reports nothing', release.getAttribute('aria-busy') === 'true' && sending.named('onPress').length === 0, { busy: release.getAttribute('aria-busy'), calls: sending.calls });
    sending.close();

    const landed = open('food-winch-12'), turn = landed.find('#food-control-key');
    landed.forget();
    pointer(turn, 'pointerdown');
    check('presses: the key reports onPress("KEY")', same(landed.calls, [['onPress', 'KEY']]), { calls: landed.calls });
    landed.close();
  });

  // ── Offers: each alone enables its own control ─────────────────────────────────────────────────────────────
  await step('offers', async () => {
    const nothing = { feedback: null, pendingCount: 0, physicalHolding: false, needsContactOff: false };
    const offered = [
      ['panelLock', 'food-panel-04', {}, m => m.find('#food-panel-main')],
      ['panelRelease', 'food-panel-03', { sending: nothing }, m => m.find('#food-panel-main')],
      ['key', 'food-winch-12', {}, m => m.find('#food-control-key')],
      ['hold', 'food-winch-03', { sending: nothing }, m => m.find('#food-control-hold')],
      ['ask', 'case-food-flow-01', {}, m => { m.food.openTasks(); return m.find('[data-go="partners"]'); }],
      ['answer', 'case-food-flow-04', {}, m => m.find('#food-action-join')],
      ['withdraw', 'case-food-flow-03', {}, m => m.find('#food-action-withdraw')],
    ];
    const table = {};
    for (const [own, stateId, changes, control] of offered) {
      const m = open(stateId, changes);
      table[own] = [];
      for (const offer of ['ask', 'answer', 'withdraw', 'hold', 'panelRelease', 'panelLock', 'key']) {
        m.food.update({ can: { [offer]: true } });
        await frames.frames(2);
        const node = control(m);
        if (node && node.getAttribute('aria-disabled') !== 'true') table[own].push(offer);
      }
      m.food.update({ can: {} });
      await frames.frames(2);
      if (control(m)?.getAttribute('aria-disabled') !== 'true') table[own].push('none');
      m.close();
    }
    check('offers: each of the seven offers alone enables its own control, no other offer does, and none enables nothing', Object.entries(table).every(([own, on]) => same(on, [own])), { table });
  });

  // ── Requests ────────────────────────────────────────────────────────────────────────────────────────────────
  await step('requests', async () => {
    const ask = open('case-food-flow-02');
    ask.food.openTasks();
    check('requests: openTasks() opens "Start a Task"', ask.frame().dataset.screen === 'food-tasks' && !!ask.find('.sheet'), { screen: ask.frame().dataset.screen });
    click(ask.find('[data-go="partners"]'));
    click(ask.find('[data-partner="seat-3"]'));
    ask.forget();
    click(ask.find('#food-action-ask'));
    check('requests: choosing a Partner and Ask reports onAsk with that seat', same(ask.calls, [['onAsk', 'seat-3']]), { calls: ask.calls });
    click(ask.find('[data-go="back"]'));
    check('requests: Back returns to "Start a Task"', ask.frame().dataset.screen === 'food-tasks', { screen: ask.frame().dataset.screen });
    ask.food.close();
    check('requests: close() closes the sheet', ask.frame().dataset.screen === 'food-room' && !ask.find('.sheet'), { screen: ask.frame().dataset.screen });
    check('requests: the surface sent nothing itself', ask.sit.live.sent.length === 0, { sent: ask.sit.live.sent.length });
    ask.close();

    const called = open('case-food-flow-04');
    called.forget();
    click(called.find('#food-action-join'));
    click(called.find('#food-action-decline'));
    check('requests: Join and Decline report onAnswer', same(called.calls, [['onAnswer', 'JOIN'], ['onAnswer', 'DECLINE']]), { calls: called.calls });
    called.food.update({ status: 'stale' });
    await frames.frames(2);
    called.forget();
    click(called.find('#food-action-join'));
    check('requests: stale, Join is disabled and reports nothing', called.find('#food-action-join')?.getAttribute('aria-disabled') === 'true' && called.calls.length === 0, { calls: called.calls });
    called.close();

    const waiting = open('case-food-flow-03');
    waiting.forget();
    click(waiting.find('#food-action-withdraw'));
    check('requests: Cancel reports onWithdraw', same(waiting.calls, [['onWithdraw']]), { calls: waiting.calls });
    waiting.close();
  });

  // ── Stale: navigation and Close go on ───────────────────────────────────────────────────────────────────────
  await step('stale', async () => {
    const m = open('case-food-flow-09', { status: 'stale' });
    m.forget();
    click(m.find('[data-go="food:card"]'));
    click(m.find('[data-go="food:panels"]'));
    click(m.find('[data-go="food:switch"]'));
    click(m.find('[data-go="food:promises"]'));
    click(m.find('[data-go="food:settings"]'));
    check('stale: the tabs, Promises and Settings still report onNavigate', same(m.named('onNavigate'), [['card'], ['panels'], ['switch'], ['promises'], ['settings']]), { calls: m.calls });
    click(m.find('[data-go="food:tasks"]'));
    const opened = m.frame().dataset.screen;
    click(m.find('.sheet [data-go="close"]'));
    check('stale: Actions still opens "Start a Task", and Close closes it', opened === 'food-tasks' && m.frame().dataset.screen === 'food-room', { opened, after: m.frame().dataset.screen });
    m.close();
  });

  // ── Focus ───────────────────────────────────────────────────────────────────────────────────────────────────
  await step('focus', async () => {
    let now = 106650;
    const m = open('food-panel-04', { clock: { now: () => now } }), lock = m.find('#food-panel-main');
    lock.focus();
    for (let i = 0; i < 30; i++) { now += 16; m.food.update({ view: structuredClone(m.sit.input.view), can: { panelLock: i % 3 !== 0 } }); }
    await frames.frames(3);
    check('focus: the same control stays focused across redraws, new views and being disabled', document.activeElement === lock && lock.isConnected, { active: document.activeElement?.id ?? null });
    const menu = m.find('#food-settings');
    menu.focus();
    now += 1000;
    await frames.frames(3);
    check('focus: the top bar\'s Settings keeps focus when the bar is redrawn for a new second', document.activeElement?.id === 'food-settings' && document.activeElement.isConnected, { active: document.activeElement?.id ?? null, same: document.activeElement === menu });
    const escape = [];
    const onKey = event => { if (event.key === 'Escape') escape.push(event.defaultPrevented); };
    document.addEventListener('keydown', onKey);
    const taskEscape = key(lock, 'keydown', 'Escape');
    check('focus: during a Task, Escape is held by the surface and closes nothing', taskEscape === false && escape.length === 0 && m.frame().dataset.screen === 'food-task', { reached: escape.length, prevented: !taskEscape });
    m.close();

    const briefing = open('case-food-panel-01');
    await frames.frames(2);
    check('focus: a new card takes focus (the briefing)', document.activeElement?.classList.contains('fs-card') && briefing.host.contains(document.activeElement), { active: document.activeElement?.className ?? null });
    briefing.close();

    const flow = open('case-food-flow-09');
    const outside = key(flow.find('.tabs') ?? flow.frame(), 'keydown', 'Escape');
    check('focus: with no sheet, Task or request, Escape is left to the app', outside === true && escape.length === 1, { reached: escape.length, prevented: !outside });
    flow.food.openTasks();
    const sheet = flow.find('.sheet');
    check('focus: a new sheet takes focus', document.activeElement === sheet, { active: document.activeElement?.className ?? null });
    const closing = key(document.activeElement, 'keydown', 'Escape');
    check('focus: Escape closes the surface\'s own sheet and goes no further', closing === false && escape.length === 1 && flow.frame().dataset.screen === 'food-room' && !flow.find('.sheet'), { reached: escape.length, screen: flow.frame().dataset.screen });
    flow.forget();
    const space = key(flow.find('[data-go="food:card"]'), 'keydown', ' ');
    check('focus: Space and Enter are taken on the surface\'s controls only, not on its other buttons', space === true && flow.calls.length === 0, { prevented: !space, calls: flow.calls });
    // A request arriving takes focus.
    const invited = situation('case-food-flow-04');
    flow.food.update({ ...invited.input, assets, bars: flow.device.bars() });
    await frames.frames(2);
    check('focus: a request arriving takes focus on its card', document.activeElement?.classList.contains('fs-card') && flow.host.contains(document.activeElement), { active: document.activeElement?.className ?? null });
    const held = key(document.activeElement, 'keydown', 'Escape');
    check('focus: Escape does not dismiss a pending request', held === false && escape.length === 1 && !!flow.find('#food-action-join'), { reached: escape.length });
    document.removeEventListener('keydown', onKey);
    flow.close();
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────────────────────────────────────
  await step('lifecycle', async () => {
    await frames.frames(2);
    const idle = frames.pending();
    let now = 105300;
    const m = open('food-panel-03', { clock: { now: () => now } });
    await frames.frames(3);
    check('lifecycle: mounted, one frame loop runs', frames.pending() - idle === 1, { pending: frames.pending() - idle });
    check('lifecycle: the mount marks its host, as the port does', m.host.classList.contains('planet-food-host'), { classes: m.host.className });
    m.forget();
    m.food.suspend();
    m.food.suspend();
    const asked = frames.asked();
    await frames.frames(4);
    check('lifecycle: suspend lets everything go, once, and stops the frames', same(m.calls, [['onReleaseAll']]) && frames.pending() - idle === 0 && frames.asked() === asked, { calls: m.calls, pending: frames.pending() - idle, askedSince: frames.asked() - asked });
    const before = m.seen().html, later = situation('food-panel-04');
    now = 106650;
    m.food.update({ ...later.input, clock: { now: () => now }, assets, bars: m.device.bars() });
    await frames.frames(3);
    check('lifecycle: suspended, nothing is drawn', m.seen().html === before && frames.asked() === asked, { changed: m.seen().html !== before });
    m.food.resume();
    m.food.resume();
    await frames.frames(3);
    const resumed = m.seen();
    check('lifecycle: resume starts one frame loop again', frames.pending() - idle === 1, { pending: frames.pending() - idle });
    m.forget();
    m.close();
    check('lifecycle: dispose lets everything go and gives up what Food covered and its bars', same(m.calls, [['onReleaseAll'], ['onSurface', { active: false, exclusive: false }], ['onBars', { top: null, bottom: null }]]), { calls: m.calls });
    await frames.frames(3);
    check('lifecycle: dispose stops the frames, removes the surface and unmarks the host', frames.pending() - idle === 0 && !m.frame() && !m.host.classList.contains('planet-food-host'), { pending: frames.pending() - idle, present: !!m.frame() });
    let threw = null;
    try { m.food.dispose(); m.food.update({ status: 'stale' }); m.food.suspend(); m.food.resume(); m.food.openTasks(); m.food.close(); } catch (error) { threw = String(error); }
    check('lifecycle: dispose is safe twice, and every method is quiet afterwards', threw === null && m.calls.length === 3, { threw, calls: m.calls.length });

    const fresh = open('food-panel-04', { clock: { now: () => now } });
    await frames.frames(3);
    check('lifecycle: resume drew the current state at the current time, exactly as a new mount draws it', resumed.html === fresh.seen().html && /LOCK/.test(resumed.text), { equal: resumed.html === fresh.seen().html, length: resumed.html.length });
    fresh.close();

    const blind = open('food-panel-04', { clock: null });
    await frames.frames(2);
    const hidden = blind.frame().hidden, said = blind.named('onSurface');
    blind.food.update({ clock: { now: () => now } });
    await frames.frames(2);
    check('lifecycle: with no trusted time no Task is drawn, though it holds the screen; with the time, it is', hidden && same(said, [[{ active: false, exclusive: true }]]) && !blind.frame().hidden && !!blind.find('#food-panel-main'), { hidden, said, after: blind.frame().hidden });
    blind.close();
  });

  // ── Quiet: no request, no timer, no storage ─────────────────────────────────────────────────────────────────
  await step('quiet', async () => {
    const seen = [], undo = [];
    const spy = (target, name, label) => {
      if (!target || typeof target[name] !== 'function') return;
      const original = target[name];
      target[name] = function (...args) { seen.push(label); return original.apply(this, args); };
      undo.push(() => { target[name] = original; });
    };
    spy(win, 'fetch', 'fetch'); spy(win.XMLHttpRequest?.prototype, 'open', 'XMLHttpRequest'); spy(win.navigator, 'sendBeacon', 'sendBeacon');
    spy(win, 'setTimeout', 'setTimeout'); spy(win, 'setInterval', 'setInterval');
    spy(win.Storage?.prototype, 'setItem', 'storage'); spy(win.Storage?.prototype, 'getItem', 'storage'); spy(win.Storage?.prototype, 'removeItem', 'storage');
    const m = open('food-panel-04'), lock = m.find('#food-panel-main');
    pointer(lock, 'pointerdown'); key(lock, 'keydown', 'Enter'); key(win, 'keyup', 'Enter');
    m.food.update({ status: 'stale' }); m.food.update({ status: 'live' });
    m.food.openTasks(); m.food.close();
    m.food.suspend(); m.food.resume();
    await frames.frames(3);
    m.food.update({ status: 'concealed' }); m.food.update({ status: 'live' });
    await frames.frames(2);
    m.close();
    const quiet = [...seen];
    // The control: a timer set here, on purpose, is seen.
    win.clearTimeout(win.setTimeout(() => {}, 0));
    const told = same(seen.slice(quiet.length), ['setTimeout']);
    undo.forEach(restore => restore());
    check('quiet: mounted, pressed, redrawn, suspended, concealed and disposed, the surface made no request, set no timer and stored nothing', quiet.length === 0 && told, { seen: quiet, controlSeen: told });
  });

  await step('exits', async () => {
    const m = open('food-panel-04');
    await frames.frames(2);
    const away = situation('case-food-flow-09');
    m.forget();
    m.food.update({ ...away.input, assets, bars: m.device.bars() });
    await frames.frames(2);
    check('exits: leaving the Task lets everything go and takes the Task off the screen', m.named('onReleaseAll').length === 1 && !m.find('.fs-screen') && m.frame().dataset.screen === 'food-room', { calls: m.calls, screen: m.frame().dataset.screen });
    check('exits: Food then covers its bars only, and says so once', same(m.named('onSurface'), [[{ active: true, exclusive: false }]]) && same(m.named('onBars'), [[{ top: 99, bottom: 92 }]]), { calls: m.calls });
    m.forget();
    m.food.update({ navigation: { openPanel: 'card', boardMode: 'room' } });
    await frames.frames(2);
    check('exits: another open panel hides Food, which gives up its bars', m.frame().hidden && same(m.named('onSurface'), [[{ active: false, exclusive: false }]]) && same(m.named('onBars'), [[{ top: null, bottom: null }]]), { hidden: m.frame().hidden, calls: m.calls });
    m.food.update({ navigation: { openPanel: 'board', boardMode: 'room' } });
    await frames.frames(2);
    m.forget();
    m.food.update({ view: null });
    await frames.frames(2);
    check('exits: losing the view lets everything go, empties the surface and gives up what it covered', m.named('onReleaseAll').length === 1 && m.frame().hidden && m.frame().childNodes.length === 0 && same(m.named('onSurface'), [[{ active: false, exclusive: false }]]), { calls: m.calls, nodes: m.frame().childNodes.length });
    m.close();

    const task = open('food-winch-03');
    await frames.frames(2);
    task.forget();
    task.food.update({ navigation: { openPanel: 'card', boardMode: 'room' } });
    await frames.frames(2);
    check('exits: during a Task another panel hides Food, and the Task still holds the screen', task.frame().hidden && same(task.named('onSurface'), [[{ active: false, exclusive: true }]]), { calls: task.calls });
    task.close();
  });

  await step('ownership', async () => {
    const m = open('food-panel-04');
    await frames.frames(4);
    check('ownership: a Task covers the whole screen, said once: what it covers, and what its bars measure, apart', same(m.named('onSurface'), [[{ active: true, exclusive: true }]]) && same(m.named('onBars'), [[{ top: 99, bottom: 0 }]]), { calls: m.calls.filter(c => c[0] !== 'onReleaseAll') });
    for (let i = 0; i < 20; i++) m.food.update({ can: { panelLock: i % 2 === 0 } });
    await frames.frames(3);
    check('ownership: redraws repeat neither', m.named('onSurface').length === 1 && m.named('onBars').length === 1, { surface: m.named('onSurface').length, bars: m.named('onBars').length });
    m.close();
  });

  // ── Privacy ─────────────────────────────────────────────────────────────────────────────────────────────────
  await step('privacy', async () => {
    await frames.frames(2);
    const idle = frames.pending();
    const m = open('case-food-flow-02');
    m.food.openTasks();
    click(m.find('[data-go="partners"]'));
    click(m.find('[data-partner="seat-3"]'));
    const chosen = m.find('#food-partner-seat-3')?.getAttribute('aria-pressed');
    const mine = m.added();
    m.forget();
    m.food.update({ status: 'concealed' });
    await frames.frames(3);
    check('privacy: concealed, everything is let go and Food gives up what it covered', same(m.calls, [['onReleaseAll'], ['onSurface', { active: false, exclusive: false }], ['onBars', { top: null, bottom: null }]]), { calls: m.calls });
    check('privacy: concealed, nothing of the surface is left in the page: no node, no word, no listener, no frame', !m.host.querySelector('.planet-food') && m.host.textContent === '' && m.added().length === 0 && frames.pending() - idle === 0,
      { nodes: m.host.childNodes.length, text: m.host.textContent.length, listeners: m.added(), pending: frames.pending() - idle });
    m.forget();
    pointer(win, 'pointerup');
    key(win, 'keyup', ' ');
    check('privacy: concealed, nothing is reported', m.calls.length === 0, { calls: m.calls });
    m.food.update({ status: 'live' });
    await frames.frames(3);
    check('privacy: shown again, it starts anew: the sheet is closed and the Partner it had chosen is forgotten', chosen === 'true' && m.frame().dataset.screen === 'food-room' && !m.find('.sheet') && same(m.added(), mine), { chosen, screen: m.frame()?.dataset.screen });
    m.food.openTasks();
    click(m.find('[data-go="partners"]'));
    check('privacy: no Partner is chosen on the new sheet', m.find('#food-partner-seat-3')?.getAttribute('aria-pressed') === 'false' && m.find('#food-action-ask')?.getAttribute('aria-disabled') === 'true', { pressed: m.find('#food-partner-seat-3')?.getAttribute('aria-pressed') });

    const html = m.seen().html, refused = [];
    const refuse = (name, run) => { try { run(); refused.push([name, null]); } catch (error) { refused.push([name, error instanceof TypeError ? error.message : `not a TypeError: ${error}`]); } };
    refuse('a private cursor in the view', () => m.food.update({ view: { ...m.sit.input.view, privateCursor: 'x' } }));
    refuse('the viewer\'s Promises count in the public board', () => m.food.update({ board: { ...m.sit.input.board, promiseOfferCount: 2 } }));
    refuse('a role', () => m.food.update({ role: 'ALIEN' }));
    refuse('a receipt in the press\'s feedback', () => m.food.update({ sending: { feedback: { key: 'k', name: 'LOCK', status: 'accepted', recovered: false, receipt: {} }, pendingCount: 0, physicalHolding: false, needsContactOff: false } }));
    refuse('a handler it does not report', () => mountFood(m.host, {}, { onDeliver() {} }));
    await frames.frames(2);
    check('privacy: an input the surface does not know is refused, and changes nothing', refused.every(([, message]) => typeof message === 'string' && message.startsWith('Food: ')) && m.seen().html === html, { refused });
    m.close();

    const display = phone(document, '390x844', { display: true });
    stage.append(display.el);
    const refusedNotice = [];
    for (const [name, input] of [['a view', { view: {} }], ['a seat', { seatId: 'seat-1' }], ['the viewer', { viewer: { promiseOfferCount: 1 } }], ['more than the doses', { stock: { doses: 2, ownMeals: 1 } }]]) {
      try { mountFoodNotice(display.host, input).dispose(); refusedNotice.push([name, null]); } catch (error) { refusedNotice.push([name, error instanceof TypeError ? error.message : String(error)]); }
    }
    check('privacy: the shared display\'s notice takes no view, seat or viewer', refusedNotice.every(([, message]) => typeof message === 'string' && message.startsWith('Food: ')) && !display.host.querySelector('.planet-food'), { refused: refusedNotice });
    const notice = mountFoodNotice(display.host, { step: { kind: 'AWAY' }, stock: { doses: 2 }, bars: { top: display.bars().top } });
    const awayText = display.host.textContent;
    notice.update({ step: null });
    const quiet = display.host.textContent;
    notice.update({ stock: { doses: 12 } });
    const rose = display.host.textContent;
    notice.update({ status: 'stale' });
    const stale = display.host.querySelector('.planet-food.ph').hidden;
    notice.update({ status: 'concealed' });
    const concealed = display.host.querySelector('.planet-food.ph').hidden;
    notice.dispose();
    notice.dispose();
    check('notice: it says who is away, then the stock\'s rise, hides when stale or concealed, and goes on dispose', /^Two players are away on the Food Supply Task/.test(awayText) && quiet === '' && rose === 'Food stock: 6 packages (+5)' && stale && concealed && !display.host.querySelector('.planet-food') && !display.host.classList.contains('planet-food-host'),
      { awayText, quiet, rose, stale, concealed });
    display.el.remove();

    const gauge = foodGauge(document, 2), half = foodGauge(document, 1);
    check('gauge: foodGauge(document, doses) is the header\'s gauge as a node, and null where there is nothing to show', gauge?.classList.contains('fs-food') && gauge.getAttribute('role') === 'img' && !!gauge.getAttribute('aria-label') && !!half?.querySelector('[data-half]') && foodGauge(document, -1) === null && foodGauge(document, 1.5) === null,
      { label: gauge?.getAttribute('aria-label') ?? null, halfLabel: half?.getAttribute('aria-label') ?? null });
  });

  // ── Motion ──────────────────────────────────────────────────────────────────────────────────────────────────
  await step('motion', async () => {
    const m = open('food-panel-03', { reducedMotion: false });
    await frames.frames(2);
    const first = m.frame().dataset.motion;
    m.food.update({ reducedMotion: true });
    await frames.frames(2);
    const reduced = m.frame().dataset.motion, spinner = win.getComputedStyle(m.find('#food-panel-main .fs-face'), '::after').animationName;
    m.food.update({ reducedMotion: false });
    await frames.frames(2);
    check(deviceReduced ? 'motion: with the device\'s Reduce motion, the surface is reduced whatever the game\'s setting says' : 'motion: the game\'s Reduce motion turns the surface\'s motion off, and back on',
      deviceReduced ? first === 'reduced' && reduced === 'reduced' && m.frame().dataset.motion === 'reduced' : first === 'normal' && reduced === 'reduced' && spinner === 'none' && m.frame().dataset.motion === 'normal',
      { first, reduced, after: m.frame().dataset.motion, spinner, deviceReduced });
    m.close();
  });

  // ── Pictures ────────────────────────────────────────────────────────────────────────────────────────────────
  await step('pictures', async () => {
    const m = open('food-panel-03', { assets: null });
    await frames.frames(2);
    const without = m.seen().pictures.length;
    let subscribed = 0, unsubscribed = 0, tell = null;
    const loader = { get back() { return assets.back; }, operator: (...args) => assets.operator(...args), subscribe(listener) { subscribed++; tell = listener; return () => { unsubscribed++; tell = null; }; } };
    m.food.update({ assets: loader });
    await frames.frames(2);
    const withPictures = m.seen().pictures;
    check('pictures: they may come after the mount, and are drawn when they do', without === 0 && same(withPictures, ['picture:operators/c2-winch-alive.svg', 'picture:operators/c6-panel-alive.svg', 'picture:supply-room.back.svg']), { without, withPictures });
    let quiet = true;
    try { tell(); } catch { quiet = false; }
    m.close();
    check('pictures: the loader\'s signal is listened to once and let go on dispose', subscribed === 1 && unsubscribed === 1 && quiet, { subscribed, unsubscribed });
  });

  // ── A handler's own failure ─────────────────────────────────────────────────────────────────────────────────
  await step('handlers', async () => {
    const errors = [], onError = event => { errors.push(String(event.error?.message ?? event.message)); event.preventDefault(); };
    win.addEventListener('error', onError);
    const sit = situation('food-panel-04'), device = phone(document, '390x844');
    stage.append(device.el);
    const food = mountFood(device.host, { ...sit.input, assets, bars: device.bars() }, { onPress() { throw new Error('the app failed'); } });
    pointer(device.host.querySelector('#food-panel-main'), 'pointerdown');
    await new Promise(done => win.setTimeout(done, 0));
    await frames.frames(2);
    check('handlers: a handler that throws is the app\'s to see, and the surface goes on drawing', same(errors, ['the app failed']) && !!device.host.querySelector('#food-panel-main'), { errors });
    food.dispose();
    device.el.remove();
    win.removeEventListener('error', onError);
  });

  // ── Frontend's controller and contact adapter, wired as the adapter will wire them ─────────────────────────
  await step('adapter', async () => {
    const sit = situation('case-food-winch-02'), { controller, context, sent } = sit.live, device = phone(document, '390x844');
    stage.append(device.el);
    const hold = createFoodHoldInput({ down: () => controller.holdDown(), up: () => controller.holdUp(), held: () => controller.getModel().physicalHolding || controller.getModel().needsContactOff });
    let food = null;
    controller.subscribe(() => food?.update(inputsFromModel(controller.getModel(), context)));
    food = mountFood(device.host, { ...sit.input, assets, bars: device.bars() }, {
      onHold(contact) { if ('pointerId' in contact) hold.pointerDown(contact.pointerId); else if ('key' in contact) hold.keyDown(contact.key, contact.repeat); else hold.assistiveClick(); },
      onLetGo(contact) { if ('pointerId' in contact) hold.pointerUp(contact.pointerId); else hold.keyUp(contact.key); },
      onReleaseAll() { hold.releaseAll(); },
    });
    await frames.frames(2);
    const node = device.host.querySelector('#food-control-hold');
    pointer(node, 'pointerdown');
    await frames.frames(2);
    const down = sent.map(request => request.command?.input).filter(input => input?.kind === 'HOLD').map(input => input.edge);
    const holding = controller.getModel().physicalHolding, pressed = node.getAttribute('aria-pressed'), busy = node.getAttribute('aria-busy');
    for (let i = 0; i < 40; i++) food.update(inputsFromModel(controller.getModel(), context));
    await frames.frames(3);
    const afterRedraws = controller.getModel().physicalHolding && device.host.querySelector('#food-control-hold') === node && sent.length === 1;
    pointer(win, 'pointerup', { pointerId: 3 });
    const stillHeld = controller.getModel().physicalHolding;
    pointer(win, 'pointerup');
    await frames.frames(2);
    const edges = sent.map(request => request.command?.input).filter(input => input?.kind === 'HOLD').map(input => input.edge);
    check('adapter: with Frontend\'s controller and createFoodHoldInput, a pointer down on Hold sends one DOWN, and the surface shows it on its way, not a hold the ship has not confirmed',
      same(down, ['DOWN']) && holding === true && busy === 'true' && pressed === 'false', { down, holding, busy, pressed });
    check('adapter: the hold survives forty redraws, on the same control, with nothing more sent', afterRedraws === true, { afterRedraws, sent: sent.length });
    check('adapter: another pointer coming up changes nothing, and the same pointer sends the UP', stillHeld === true && same(edges, ['DOWN', 'UP']) && controller.getModel().physicalHolding === false, { stillHeld, edges });
    food.dispose();
    controller.dispose();
    device.el.remove();

    // A hold that is down when the screen is suspended is let go by the surface's onReleaseAll.
    const again = situation('case-food-winch-02'), device2 = phone(document, '390x844');
    stage.append(device2.el);
    const hold2 = createFoodHoldInput({ down: () => again.live.controller.holdDown(), up: () => again.live.controller.holdUp(), held: () => again.live.controller.getModel().physicalHolding || again.live.controller.getModel().needsContactOff });
    const food2 = mountFood(device2.host, { ...again.input, assets, bars: device2.bars() }, {
      onHold(contact) { if ('pointerId' in contact) hold2.pointerDown(contact.pointerId); }, onLetGo(contact) { if ('pointerId' in contact) hold2.pointerUp(contact.pointerId); }, onReleaseAll() { hold2.releaseAll(); },
    });
    await frames.frames(2);
    pointer(device2.host.querySelector('#food-control-hold'), 'pointerdown');
    const heldBefore = again.live.controller.getModel().physicalHolding;
    food2.suspend();
    const edges2 = again.live.sent.map(request => request.command?.input).filter(input => input?.kind === 'HOLD').map(input => input.edge);
    check('adapter: suspend lets a hold go: the UP is sent while Frontend\'s controller is still there', heldBefore === true && same(edges2, ['DOWN', 'UP']) && again.live.controller.getModel().physicalHolding === false, { heldBefore, edges: edges2 });
    food2.dispose();
    again.live.controller.dispose();
    device2.el.remove();
  });

  listeners.restore();
  frames.restore();
  return { version: FOOD_VERSION, mode: deviceReduced ? 'device-reduced' : 'full', ok: checks.every(c => c.ok), checks };
}

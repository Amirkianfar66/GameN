// mothership:dev-only
//
// The Food component's lifecycle probe (index.html?probe=1): the runtime component itself (../food.mjs, unchanged),
// mounted on the preview's synthetic states in the real DOM with the real styles and pictures. It checks what the
// agreed interface promises (the interface posted on #4 for #274's adoption dependency; Frontend's four answers on
// #4, relayed by Integration):
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
//   privacy    concealed, nothing of the viewer is left in the page or remembered: a change of status alone shows
//              nothing again, on a surface that was concealed and on one mounted concealed; fresh authorized inputs
//              restore it and bring back only what they give; stale keeps its view; a key the inputs do not know is
//              refused, on the phone and on the shared display's notice
//   host       outside the game's crew picture surface a view is refused, at mount and by update, and nothing is
//              drawn; with no view, or concealed, nothing is asked of the host
//   motion     the game's Reduce motion and the device's
//   layout     update({ reducedMotion }) changes motion and lays nothing out; relayout() lays the surface out again
//              after a text-size change, as a new mount would; suspended, it waits for resume
//   corrections  the seven corrections to the port (sources.json): the top bar's portraits are the kit's 32 px; with no
//              instrument the dock has no slot; at the Large text the Partner's label is whole pieces and at the
//              Largest the role row is dropped; an outcome card stays inside the view and a request card clear of the
//              Pass button and the tab bar, each with its words scrolling inside it to their last line; no card is
//              faded as a whole, and words that scroll take a place in the Tab order; a request card's stamp and Too
//              late to join's are whole in their scroller; and a sheet, a card or the top bar that is built again
//              gives the focus back, never taking it from outside the surface
//   pictures   the pictures may come after the mount; the loader's signal is listened to once and let go
//   adapter    Frontend's own controller and contact adapter, wired as the adapter will wire them: a hold goes down
//              and up through them, survives the redraws in between, and is let go by suspend; the surface shows the
//              press on its way, never a hold the ship has not confirmed; with a contact-off owed and no hold offered,
//              Hold stays pressable, a press sends no DOWN, and its let-go sends the contact-off
// design/tools/food-component-check.mjs runs it under the production headers, once as the page comes and once with the
// device's Reduce motion emulated, and records each result. Desktop Chromium: not a phone, not Safari, not a screen
// reader, and no server.

import { createFoodHoldInput } from '@mothership/game';
import { FOOD_HANDLERS, FOOD_VERSION, foodGauge, mountFood, mountFoodNotice } from '../food.mjs';
import { VERSIONS, describe, fixtureSituation, inputsFromModel, phone, pictures, situation } from './stage.mjs';

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
  function open(stateId, changes = {}, wire = null, sizeKey = '390x844') {
    const sit = situation(stateId), device = phone(document, sizeKey), calls = [], raw = [];
    stage.append(device.el);
    const before = listeners.list();
    const handlers = Object.fromEntries(FOOD_HANDLERS.map(name => [name, (...args) => { raw.push([name, args]); calls.push([name, ...structuredClone(args)]); wire?.[name]?.(...args); }]));
    const input = { ...sit.input, assets, bars: device.bars(), ...changes };
    const food = mountFood(device.host, input, handlers);
    const added = () => { const rest = [...before]; return listeners.list().filter(entry => { const at = rest.indexOf(entry); if (at < 0) return true; rest.splice(at, 1); return false; }); };
    return {
      sit, device, calls, raw, food, input, host: device.host, added,
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
    const SHAPES = { onHold: ['pointerId', 'key,repeat', 'assistive'], onLetGo: ['pointerId', 'key'] }, contacts = m.raw.filter(([name]) => name in SHAPES);
    check('contacts: a contact is plain data and nothing else: { pointerId }, { key, repeat } or { assistive } going down, { pointerId } or { key } coming up; never the event, its target or where it was',
      contacts.length === 9 && contacts.every(([name, args]) => args.length === 1 && Object.getPrototypeOf(args[0]) === Object.prototype && SHAPES[name].includes(Object.keys(args[0]).join())
        && Object.values(args[0]).every(value => ['number', 'string', 'boolean'].includes(typeof value))), { contacts: contacts.map(([name, args]) => [name, Object.keys(args[0] ?? {}).join()]) });

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
    // Woken by a change of status alone: no fresh view, offers or presses are given. Nothing it held may come back.
    const drawnParts = t => t.host.querySelectorAll('.tb, .tabs, .sheet, .fs-card, .fs-ctl, .fs-banner, .fs-view').length;
    const promises = t => t.find('[data-go="food:promises"]')?.getAttribute('aria-label') ?? null;
    const controls = t => ({ enabled: [...t.host.querySelectorAll('.fs-ctl')].filter(node => node.getAttribute('aria-disabled') !== 'true').map(node => node.dataset.act), busy: [...t.host.querySelectorAll('.fs-ctl[aria-busy="true"]')].map(node => node.dataset.act) });
    const empty = t => ({ text: t.host.textContent, hidden: t.frame()?.hidden ?? null, parts: drawnParts(t), calls: t.calls.length });
    const isEmpty = e => e.text === '' && e.hidden === true && e.parts === 0 && e.calls === 0;
    const fresh = t => ({ view: t.input.view, can: t.input.can, sending: t.input.sending, viewer: t.input.viewer, status: 'live' });
    m.food.update({ status: 'live' });
    await frames.frames(3);
    const woken = empty(m);
    check('privacy: concealed, then woken by status alone, the surface stays empty: the view it held is not shown again, and nothing is reported', isEmpty(woken), { woken });
    // Given fresh authorized inputs, it is a new surface: what the player had opened and chosen is not remembered.
    m.food.update(fresh(m));
    await frames.frames(3);
    check('privacy: given fresh authorized inputs it starts anew: the sheet is closed and the Partner it had chosen is forgotten', chosen === 'true' && m.frame().dataset.screen === 'food-room' && !m.find('.sheet') && same(m.added(), mine), { chosen, screen: m.frame()?.dataset.screen });
    m.food.openTasks();
    click(m.find('[data-go="partners"]'));
    check('privacy: no Partner is chosen on the new sheet', m.find('#food-partner-seat-3')?.getAttribute('aria-pressed') === 'false' && m.find('#food-action-ask')?.getAttribute('aria-disabled') === 'true', { pressed: m.find('#food-partner-seat-3')?.getAttribute('aria-pressed') });

    // The viewer's Promises count, on a room's top bar.
    const room = open('case-food-flow-02', { viewer: { promiseOfferCount: 3 } });
    await frames.frames(3);
    const counted = promises(room);
    room.food.update({ status: 'concealed' });
    room.food.update({ status: 'live' });
    await frames.frames(3);
    const roomWoken = empty({ ...room, calls: [] });
    room.food.update({ view: room.input.view, status: 'live' });
    await frames.frames(3);
    const viewOnly = promises(room);
    // The port builds its top bar again once a second of the clock, and so the badge follows a new count at the next second.
    const nextSecond = room.input.clock.now() + 1000;
    room.food.update({ ...fresh(room), clock: { now: () => nextSecond } });
    await frames.frames(3);
    check('privacy: the viewer\'s Promises count is not shown again by a status-only wake, nor by a fresh view alone; it comes back only when it is given again', counted === 'Promises, 3 new' && roomWoken.text === '' && roomWoken.parts === 0 && viewOnly === 'Promises' && promises(room) === 'Promises, 3 new',
      { counted, wokenText: roomWoken.text.length, viewOnly, given: promises(room) });
    room.close();

    // An offer, on a Task: the controller offered LOCK.
    const t = open('food-panel-04');
    await frames.frames(3);
    const offered = controls(t);
    t.food.update({ status: 'concealed' });
    t.food.update({ status: 'live' });
    await frames.frames(3);
    const taskWoken = { ...controls(t), hidden: t.frame()?.hidden ?? null, words: t.host.textContent.length };
    t.food.update({ view: t.input.view, status: 'live' });
    await frames.frames(3);
    const unoffered = { ...controls(t), words: t.host.textContent.length, lock: t.find('#food-panel-main')?.getAttribute('aria-disabled') ?? null };
    check('privacy: an offer is not brought back or inferred: after a status-only wake nothing is drawn, and a fresh view alone is drawn with every control disabled', offered.enabled.includes('lock') && taskWoken.hidden === true && taskWoken.words === 0 && taskWoken.enabled.length === 0
      && unoffered.words > 0 && unoffered.enabled.length === 0 && unoffered.lock === 'true', { offered, taskWoken, unoffered });
    t.food.update(fresh(t));
    await frames.frames(3);
    const restored = { ...controls(t), html: t.seen().html };
    const again = open('food-panel-04');
    await frames.frames(3);
    const newMount = again.seen().html;
    again.close();
    check('privacy: the whole of a fresh authorized input restores it, as a new mount draws it', restored.enabled.includes('lock') && restored.html === newMount, { enabled: restored.enabled, same: restored.html === newMount });
    // Stale is not concealed: the viewer is still authorized, and the view stays through a change of status alone.
    t.food.update({ status: 'stale' });
    await frames.frames(2);
    const staleWords = t.host.textContent.length;
    t.food.update({ status: 'live' });
    await frames.frames(3);
    check('privacy: stale is not concealed: the view stays, and live again by status alone it is as it was', staleWords > 0 && t.seen().html === newMount, { staleWords });
    t.close();

    // This phone's press on its way: RELEASE, sending.
    const p = open('food-panel-03');
    await frames.frames(3);
    const pressed = controls(p);
    p.food.update({ status: 'concealed' });
    p.food.update({ view: p.input.view, can: p.input.can, status: 'live' });
    await frames.frames(3);
    const unpressed = controls(p);
    check('privacy: a press that was on its way is not shown again unless it is given again', pressed.busy.includes('release') && unpressed.busy.length === 0, { pressed, unpressed });
    p.close();

    // Mounted concealed with a view: none of it is kept, so a status-only wake has nothing to show, and opening Tasks shows nothing.
    const c = open('case-food-flow-02', { status: 'concealed', viewer: { promiseOfferCount: 3 } });
    await frames.frames(2);
    const mountedEmpty = !c.host.querySelector('.planet-food') && c.host.textContent === '' && c.calls.length === 0;
    c.food.update({ status: 'live' });
    await frames.frames(3);
    const cWoken = empty(c);
    c.food.openTasks();
    await frames.frames(2);
    const cAsked = empty(c);
    c.food.close();
    check('privacy: mounted concealed with a view, then woken by status alone, it stays empty, and opening Tasks shows nothing', mountedEmpty && isEmpty(cWoken) && isEmpty(cAsked), { mountedEmpty, cWoken, cAsked });
    c.food.update(fresh(c));
    await frames.frames(3);
    check('privacy: and given fresh authorized inputs, it draws them', promises(c) === 'Promises, 3 new' && c.frame()?.dataset.screen === 'food-room', { promises: promises(c), screen: c.frame()?.dataset.screen });
    c.close();

    const html = m.seen().html, refused = [];
    const refuse = (name, run) => { try { run(); refused.push([name, null]); } catch (error) { refused.push([name, error instanceof TypeError ? error.message : `not a TypeError: ${error}`]); } };
    // Of the contract's Food player view the surface takes twelve keys. The other ten are refused by name.
    const NOT_TAKEN = ['schemaVersion', 'audience', 'matchId', 'phaseId', 'serverNowMs', 'playerCount', 'rosterSeatIds', 'turnEnds', 'privateCursor', 'ownMeals'], notTaken = [];
    for (const name of NOT_TAKEN) { try { m.food.update({ view: { ...m.sit.input.view, [name]: ['rosterSeatIds', 'turnEnds', 'ownMeals'].includes(name) ? [] : 1 } }); notTaken.push([name, null]); } catch (error) { notTaken.push([name, error instanceof TypeError ? error.message : `not a TypeError: ${error}`]); } }
    check('privacy: of the contract\'s view the surface takes twelve keys and refuses the other ten by name: the binding and envelope, the roster, turnEnds, privateCursor and ownMeals',
      Object.keys(m.sit.input.view).length === 12 && notTaken.every(([name, message]) => message === `Food: view takes no "${name}"`), { taken: Object.keys(m.sit.input.view), notTaken });
    const feedback = more => ({ sending: { feedback: { key: 'k', name: 'request', recovered: false, ...more }, pendingCount: 0, physicalHolding: false, needsContactOff: false } });
    refuse('a seventh field in a refused press\'s closure', () => m.food.update(feedback({ status: 'rejected', closure: { requestId: 'r', state: 'EXPIRED', round: 1, foodStepId: 's', volunteerSeatId: 'seat-1', partnerSeatId: 'seat-2', closedAt: 1 } })));
    refuse('a command id in an accepted press\'s request', () => m.food.update(feedback({ status: 'accepted', request: { requestId: 'r', state: 'PENDING', commandId: 'c' } })));
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

  // ── The host ────────────────────────────────────────────────────────────────────────────────────────────────
  await step('host', async () => {
    const sit = situation('food-panel-03'), device = phone(document, '390x844');
    stage.append(device.el);
    const input = { ...sit.input, assets, bars: device.bars() }, marked = document.body.dataset.crewArt;
    const message = run => { try { run(); return null; } catch (error) { return error instanceof TypeError ? error.message : `not a TypeError: ${error}`; } };
    const REFUSED = /^Food: the host must be inside the game's crew picture surface/;
    // The app has not marked its root: there is no crew picture surface around the host.
    delete document.body.dataset.crewArt;
    const atMount = message(() => mountFood(device.host, input).dispose());
    const untouched = !device.host.classList.contains('planet-food-host') && device.host.childElementCount === 0;
    // With no view, and concealed, nothing is drawn, so nothing is asked of the host. The view is refused when it comes.
    const empty = mountFood(device.host, { ...input, view: null });
    await frames.frames(2);
    const emptyHtml = device.host.innerHTML, later = message(() => empty.update({ view: input.view }));
    await frames.frames(2);
    const stillEmpty = device.host.innerHTML === emptyHtml && !device.host.querySelector('.tb');
    empty.dispose();
    const hidden = mountFood(device.host, { ...input, status: 'concealed' }), shown = message(() => hidden.update({ status: 'live', view: input.view }));
    await frames.frames(2);
    const stillHidden = !device.host.querySelector('.planet-food');
    hidden.dispose();
    // Marked as the app marks it, the same input mounts, and its portraits are the game's pictures.
    document.body.dataset.crewArt = marked;
    const food = mountFood(device.host, input);
    await frames.frames(2);
    const portrait = device.host.querySelector('.tb .food-portrait'), picture = portrait ? win.getComputedStyle(portrait).backgroundImage : '';
    food.dispose();
    device.el.remove();
    check('host: outside the game\'s crew picture surface a view is refused at mount with a TypeError, and the host is left untouched', REFUSED.test(atMount ?? '') && untouched, { atMount, untouched });
    check('host: with no view, or concealed, nothing is asked of the host; the view is then refused by update, which changes nothing', REFUSED.test(later ?? '') && stillEmpty && REFUSED.test(shown ?? '') && stillHidden, { later, stillEmpty, shown, stillHidden });
    check('host: inside the surface the app marked, the same input mounts and its portraits are the game\'s pictures', marked === 'crew-drawing-1.0.0' && /^url\(/.test(picture), { marked, picture: picture.slice(0, 32) });
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

  // ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────
  // The surface lays most of itself out on its own frames. What it measured when a part was built stays until that
  // part is built again: the "away" banner's place under the top bar is one. So a change of text size needs
  // relayout(), as the port needed the app's preferences event.
  await step('layout', async () => {
    const root = document.documentElement, was = root.style.fontSize, STATE = 'case-food-flow-09';
    const banner = m => m.find('.fs-banner')?.style.top ?? null, bar = m => m.find('.planet-food .tb')?.offsetHeight ?? null;
    const fresh = async size => { root.style.fontSize = size; const m = open(STATE); await frames.frames(3); const seen = { banner: banner(m), bar: bar(m), html: m.seen().html }; m.close(); return seen; };
    const standard = await fresh('100%'), large = await fresh('150%');
    root.style.fontSize = '100%';
    const m = open(STATE, { reducedMotion: false });
    await frames.frames(3);
    root.style.fontSize = '150%';
    await frames.frames(12);   // with Reduce motion the kit lets the old bar take 80 ms to grow
    const untold = { banner: banner(m), bar: bar(m) };
    m.food.update({ reducedMotion: true });
    await frames.frames(3);
    const afterMotion = { banner: banner(m), motion: m.frame().dataset.motion };
    m.food.update({ reducedMotion: false });
    m.food.relayout();
    await frames.frames(3);
    const afterRelayout = { banner: banner(m), same: m.seen().html === large.html };
    root.style.fontSize = '100%';
    m.food.suspend();
    m.food.relayout();
    await frames.frames(3);
    const whileSuspended = banner(m);
    m.food.resume();
    await frames.frames(3);
    const afterResume = { banner: banner(m), same: m.seen().html === standard.html };
    m.food.update({ status: 'concealed' });
    let quiet = true;
    try { m.food.relayout(); m.food.dispose(); m.food.relayout(); } catch { quiet = false; }
    m.device.el.remove();
    root.style.fontSize = was;
    check('layout: a new mount puts the "away" banner under its top bar, lower at the Large text', !!standard.banner && !!large.banner && parseFloat(large.banner) - parseFloat(standard.banner) === large.bar - standard.bar && large.bar > standard.bar, { standard: [standard.bar, standard.banner], large: [large.bar, large.banner] });
    check('layout: when the text size changes, the frames alone grow the bar and leave the banner where it was built', untold.bar === large.bar && untold.banner === standard.banner, { untold });
    check('layout: update({ reducedMotion }) changes motion and lays nothing out', afterMotion.banner === standard.banner && afterMotion.motion === 'reduced', { afterMotion });
    check('layout: relayout() lays the surface out again: it is what a new mount draws at that text size', afterRelayout.banner === large.banner && afterRelayout.same, afterRelayout);
    check('layout: suspended, relayout() waits, and resume draws the new layout', whileSuspended === large.banner && afterResume.banner === standard.banner && afterResume.same, { whileSuspended, afterResume });
    check('layout: concealed or disposed, relayout() is quiet', quiet, {});
  });

  // ── The corrections to the port (sources.json, kind "correction") ─────────────────────────────────────────
  // Seven places where the component is meant to differ from the frozen port. Each is checked here on the mounted
  // surface: at the Standard, the Large and the Largest text and in both phone sizes where the text size matters.
  await step('corrections', async () => {
    const root = document.documentElement, was = root.style.fontSize, PHONES = ['390x844', '430x932'];
    // The phone is brought to the top of the page's window, so that what is asked of a point in it (which element is topmost there) has an answer.
    const at = async (stateId, text, sizeKey = '390x844', changes = {}) => { root.style.fontSize = `${text * 100}%`; const m = open(stateId, changes, null, sizeKey); m.device.el.scrollIntoView({ block: 'start' }); await frames.frames(4); return m; };
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const within = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
    const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    const longNames = stateId => ({ people: situation(stateId).input.people.map(person => ({ ...person, name: 'WWWWWWWWWWWW' })) });
    /** Whether an element is faded by a mask, which fades its own background and edge with what it holds. */
    const masked = node => { const style = getComputedStyle(node), mask = style.maskImage || style.webkitMaskImage; return !!mask && mask !== 'none'; };
    /** A card as it stands over what lies behind it: never faded as a whole, drawn on one opaque colour, and the topmost thing just inside its lower edge. */
    const standing = (m, card) => {
      const box = rect(card), style = getComputedStyle(card), words = card.querySelector('.fs-card-body');
      const under = [0.25, 0.5, 0.75].map(share => document.elementFromPoint(box.left + (box.right - box.left) * share, box.bottom - 3));
      return { whole: !masked(card) && Number(style.opacity) === 1, colour: style.backgroundColor, opaque: /^rgb\(/.test(style.backgroundColor), fades: masked(card) ? 'card' : words && masked(words) ? 'words' : null,
        atFoot: under.every(node => !!node && card.contains(node)), wordsScroll: !!words && words.scrollHeight > words.clientHeight + 1, tab: words ? words.getAttribute('tabindex') : null };
    };
    const stood = [];

    // 1. The top bar's portraits.
    {
      const pair = await at('food-panel-04', 1), turn = await at('case-food-states-14', 1);
      turn.food.openTasks();
      await frames.frames(3);
      const sizes = m => [...m.frame().querySelectorAll('.tb-who .pt')].map(node => { const r = node.getBoundingClientRect(); return [r.width, r.height, node.style.width, node.style.height]; });
      const two = sizes(pair), one = sizes(turn), kinds = [pair, turn].map(m => m.find('.planet-food .tb')?.dataset.kind);
      check('corrections: the top bar\'s portraits take the kit\'s 32 px, beside two names and beside one, with no size of their own', same(kinds, ['pair', 'turn']) && two.length === 2 && one.length === 1 && [...two, ...one].every(size => same(size, [32, 32, '', ''])), { kinds, two, one });
      pair.close(); turn.close();
    }

    // 2. The dock with no instrument.
    {
      const m = await at('food-winch-12', 1);
      const dock = () => ({ hidden: m.find('.food-instrument').hidden, holds: m.find('.food-instrument').childElementCount, dock: rect(m.find('.fs-dock')), controls: rect(m.find('.fs-controls')) });
      const landed = dock();
      m.food.update({ ...situation('food-winch-03').input, assets, bars: m.device.bars() });
      await frames.frames(3);
      const hanging = dock();
      check('corrections: with no instrument the dock has no slot and no gap for one, and when there is one again the slot holds it above the controls',
        landed.hidden === true && landed.holds === 0 && same(landed.dock, landed.controls) && hanging.hidden === false && hanging.holds === 1 && hanging.dock.top < hanging.controls.top && hanging.dock.bottom === hanging.controls.bottom, { landed, hanging });
      m.close();
    }

    // 3. The role row.
    {
      const rows = [], dropped = [], range = document.createRange();
      for (const sizeKey of PHONES) for (const text of [1, 1.5, 2]) {
        for (const [stateId, changes] of [['food-panel-04', {}], ['food-winch-03', {}], ['case-food-panel-16', {}], ['case-food-winch-17', {}], ['food-panel-04', longNames('food-panel-04')], ['food-winch-03', longNames('food-winch-03')]]) {
          const m = await at(stateId, text, sizeKey, changes), row = m.find('.fs-role'), who = m.find('.fs-who'), shown = row.getClientRects().length > 0;
          if (text === 2) dropped.push({ sizeKey, stateId, shown });
          else {
            const box = rect(row);
            const pieces = [...who.childNodes].map(node => { range.selectNodeContents(node); const lines = [...range.getClientRects()].filter(r => r.width > 0.5); return { text: node.textContent.trim(), lines: new Set(lines.map(r => Math.round(r.top))).size, inside: lines.every(r => r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 2 && r.bottom <= box.bottom + 2) }; });
            rows.push({ sizeKey, text, stateId, longNames: !!changes.people, shown, pieces, pill: within(rect(m.find('.fs-role .pill')), box), cut: who.scrollWidth > who.clientWidth + 1 || row.scrollWidth > row.clientWidth + 1 });
          }
          m.close();
        }
      }
      check('corrections: at the Standard and the Large text, on both phones and with the longest names, the Partner\'s label is two whole pieces: no word is broken, the seat number stays with its name, and nothing is cut',
        rows.length === 24 && rows.every(r => r.shown && r.pill && !r.cut && r.pieces.length === 2 && r.pieces.every(piece => piece.lines === 1 && piece.inside) && /^\d+ \S+$/.test(r.pieces[0].text) && /^· /.test(r.pieces[1].text)), { rows });
      check('corrections: at the Largest text the role row is dropped, as in the port', dropped.length === 12 && dropped.every(r => !r.shown), { dropped });
    }

    // 4. An outcome card.
    {
      const cards = [];
      for (const sizeKey of PHONES) for (const text of [1, 1.5, 2]) {
        for (const stateId of ['case-food-panel-16', 'case-food-panel-17', 'case-food-winch-14', 'case-food-winch-17']) {
          const m = await at(stateId, text, sizeKey), card = m.find('.fs-card'), box = rect(card), view = rect(m.find('.fs-view')), words = card.querySelector('.fs-card-body');
          const under = [...m.frame().querySelectorAll('.fs-role, .fs-hint, .fs-strip, .fs-meter-wrap, .fs-ctl')].filter(node => node.getClientRects().length && !node.closest('[hidden]')).map(rect);
          // The words' scroller is the card's whole inside; the tilted stamp, drawn past its line box and with a shadow 4 px further, is whole in it.
          const inside = !!words && same(rect(words), box), stamp = rect(card.querySelector('.fs-stamp')), stampWhole = stamp.left >= box.left && stamp.top >= box.top && stamp.right + 4 <= box.right && stamp.bottom + 4 <= box.bottom;
          const scrolls = !!words && words.scrollHeight > words.clientHeight + 1, cardScrolls = card.scrollHeight > card.clientHeight + 1;
          stood.push({ sizeKey, text, stateId, kind: 'outcome', ...standing(m, card) });
          if (words) words.scrollTop = words.scrollHeight;
          await frames.frames(1);
          // At the end of its scroll the last line stands the card's 16 px of padding above its edge, where the fade has all but ended.
          cards.push({ sizeKey, text, stateId, outcome: !card.classList.contains('fs-brief'), clear: Math.round((view.bottom - box.bottom) * 100) / 100, covers: under.filter(part => overlap(box, part)).length, parts: under.length,
            inside, stampWhole, scrolls, cardScrolls, marked: !!words?.hasAttribute('data-scrolls'), cardMarked: card.hasAttribute('data-scrolls'), lastLineClear: words ? Math.round((box.bottom - rect(words.lastElementChild).bottom) * 100) / 100 : null });
          m.close();
        }
      }
      check('corrections: at every text size, on both phones, an outcome card ends 12 px above the view\'s lower edge or higher, over no row and no control',
        cards.length === 24 && cards.every(c => c.outcome && c.clear >= 11.5 && c.covers === 0 && c.parts >= 2), { cards });
      check('corrections: an outcome card\'s words are in a scroller that is the card\'s whole inside, with its stamp whole; with more words than room they scroll there to their last line, 16 px clear of the card\'s edge, and the card itself never scrolls; at the Standard text none needs to',
        cards.every(c => c.inside && c.stampWhole && !c.cardScrolls && !c.cardMarked && c.scrolls === c.marked && c.lastLineClear >= 15.5) && cards.filter(c => c.text === 1).every(c => !c.scrolls)
          && [1.5, 2].every(text => PHONES.every(sizeKey => cards.some(c => c.text === text && c.sizeKey === sizeKey && c.scrolls))), { cards });
    }

    // 5 and 7. A request card, and the other card with an answer under its words: Too late to join.
    {
      const cards = [];
      for (const sizeKey of PHONES) for (const text of [1, 1.5, 2]) for (const stateId of ['case-food-flow-04', 'case-food-states-08']) {
        const m = await at(stateId, text, sizeKey);
        // Too late to join is the fixture's second packet, given after the first as the app would be given it.
        if (m.sit.advance) { m.sit.advance(); m.food.update({ ...m.sit.inputNow(), assets, bars: m.device.bars() }); await frames.frames(4); }
        const card = m.find('.fs-card'), box = rect(card), words = m.find('.fs-card-body'), scroller = rect(words), tabs = rect(m.find('.planet-food .tabs')), pass = rect(m.find('.planet-food .hero'));
        const answers = [...card.querySelectorAll('.fs-card-foot .btn, .fs-card-foot .fs-timer')].map(rect), inner = { left: box.left + 16, top: box.top + 16, right: box.right - 16, bottom: box.bottom - 16 };
        const scrolls = words.scrollHeight > words.clientHeight + 1, stampNode = card.querySelector('.fs-stamp'), stamp = stampNode.getClientRects().length ? rect(stampNode) : null;
        stood.push({ sizeKey, text, stateId, kind: 'request', ...standing(m, card) });
        // Correction 7: the scroller takes the card's inside at its top and its sides, and ends above the answers; the
        // tilted stamp, drawn past its line box and with a shadow 4 px further, is whole in it. A tight card shows none.
        const room = { label: card.getAttribute('aria-label'), tight: card.hasAttribute('data-tight'), atTop: Math.abs(scroller.top - box.top) <= 0.5, atSides: Math.abs(scroller.left - box.left) <= 0.5 && Math.abs(scroller.right - box.right) <= 0.5,
          aboveAnswers: Math.round((Math.min(...answers.map(a => a.top)) - scroller.bottom) * 100) / 100, ring: getComputedStyle(words).outlineOffset,
          stamp: stamp && { above: Math.round((stamp.top - scroller.top) * 100) / 100, whole: stamp.left >= scroller.left && stamp.top >= scroller.top && stamp.right + 4 <= scroller.right && stamp.bottom + 4 <= scroller.bottom } };
        words.scrollTop = words.scrollHeight;
        await frames.frames(1);
        cards.push({ sizeKey, text, stateId, abovePass: Math.round((pass.top - box.bottom) * 100) / 100, aboveTabs: Math.round((tabs.top - box.bottom) * 100) / 100, answers: answers.length, whole: answers.every(part => within(part, inner)),
          scrolls, marked: words.hasAttribute('data-scrolls'), lastLine: rect(words.lastElementChild).bottom <= rect(words).bottom + 0.5, wordsShown: words.clientHeight, room });
        m.close();
      }
      const asked = cards.filter(c => c.stateId === 'case-food-flow-04'), late = cards.filter(c => c.stateId === 'case-food-states-08');
      check('corrections: at every text size, on both phones, the request card ends 8 px above the Pass button or higher, clear of the tab bar, with Decline, Join and the time to answer whole inside it',
        asked.length === 6 && asked.every(c => c.room.label === 'Asked to join a Task' && c.abovePass >= 7.5 && c.aboveTabs >= 27.5 && c.answers === 3 && c.whole), { cards: asked });
      check('corrections: where the request\'s words need more room they scroll above the answers to their last line, with the port\'s fade, and keep room to be read',
        asked.every(c => c.scrolls === c.marked && c.lastLine && c.wordsShown >= 200) && asked.filter(c => c.scrolls).length >= 3 && asked.filter(c => c.text === 1).every(c => !c.scrolls), { cards: asked });
      check('corrections: Too late to join, the other card with an answer under its words, ends above the Pass button and the tab bar at every text size on both phones, with OK whole inside it and its words in sight',
        late.length === 6 && late.every(c => c.room.label === 'Too late to join' && c.abovePass >= 7.5 && c.aboveTabs >= 27.5 && c.answers === 1 && c.whole && c.scrolls === c.marked && c.lastLine), { cards: late });
      check('corrections: on a request card and on Too late to join the words\' scroller takes the card\'s inside at its top and its sides, ends 10 px above the answers, and draws its focus ring inside itself',
        cards.length === 12 && cards.every(c => c.room.atTop && c.room.atSides && Math.abs(c.room.aboveAnswers - 10) <= 0.5 && c.room.ring === '-5px'), { rooms: cards.map(c => ({ sizeKey: c.sizeKey, text: c.text, stateId: c.stateId, ...c.room })) });
      check('corrections: the stamp of a request card and of Too late to join is whole at the Standard and the Large text on both phones, drawn below its scroller\'s upper edge; at the Largest text the tight card shows none, as in the port',
        cards.filter(c => c.text !== 2).every(c => !c.room.tight && c.room.stamp?.whole && c.room.stamp.above > 0) && cards.filter(c => c.text === 2).every(c => c.room.tight && c.room.stamp === null),
        { stamps: cards.map(c => ({ sizeKey: c.sizeKey, text: c.text, stateId: c.stateId, tight: c.room.tight, stamp: c.room.stamp })) });
    }

    // 4 and 5, every card: opaque to its edge, and its words within reach of the keys. The briefing too, which no correction touches.
    {
      for (const sizeKey of PHONES) for (const text of [1, 1.5, 2]) for (const stateId of ['case-food-winch-01', 'case-food-panel-01']) {
        const m = await at(stateId, text, sizeKey);
        stood.push({ sizeKey, text, stateId, kind: 'briefing', ...standing(m, m.find('.fs-card')) });
        m.close();
      }
      check('corrections: no card is faded as a whole, at any text size on either phone: an outcome card, a request card, Too late to join and the briefing are each drawn on one opaque colour, and each is the topmost thing just inside its own lower edge; only words that scroll fade, inside their card',
        stood.length === 48 && stood.every(c => c.whole && c.opaque && c.atFoot && c.fades === (c.wordsScroll ? 'words' : null)) && new Set(stood.map(c => c.colour)).size === 1, { stood });
      // The one card that can still scroll as a whole: the briefing at the Largest text in a phone 320 px by 568 px, by
      // 4 px of its own padding. The preview's phones are the two development sizes, so this one is set by hand. The
      // port fades such a card as a whole; here it stays opaque.
      {
        const m = await at('case-food-winch-01', 2), card = () => m.find('.fs-card');
        Object.assign(m.device.el.style, { width: '320px', height: '568px' });
        m.food.relayout();
        await frames.frames(8);
        const small = { scrollsWhole: card().scrollHeight > card().clientHeight + 1, marked: card().hasAttribute('data-scrolls'), ...standing(m, card()) };
        check('corrections: where a card does scroll as a whole (the briefing at the Largest text, in a phone 320 px by 568 px) it is still not faded: its background stays to its edge',
          small.scrollsWhole && small.marked && small.whole && small.opaque && small.atFoot && small.fades === null, { small });
        m.close();
      }
      check('corrections: a card\'s words that scroll take a place in the Tab order, so that the keys can scroll them, and words that fit take none',
        stood.filter(c => c.kind !== 'briefing').every(c => c.tab === (c.wordsScroll ? '0' : null)) && stood.filter(c => c.kind === 'briefing').every(c => c.tab === null && !c.wordsScroll) && stood.filter(c => c.wordsScroll).length >= 12, { tabs: stood.map(c => ({ sizeKey: c.sizeKey, text: c.text, stateId: c.stateId, wordsScroll: c.wordsScroll, tab: c.tab })) });
    }

    // 6. The focus, when a sheet, a card or the top bar is built again.
    {
      const name = node => (node ? node.id || node.dataset.go || node.dataset.tab || node.dataset.tb || String(node.className) : null);
      /** Focus one thing at the Standard text, change the text size, and say what holds the focus afterwards. Told, the surface is laid out again at the Large text; not told, it builds its sheet or card again by itself at the Largest. */
      const survives = async (m, pick, told = true) => {
        root.style.fontSize = '100%';
        m.food.relayout();
        await frames.frames(3);
        const before = pick();
        before.focus({ preventScroll: true });
        const held = document.activeElement === before;
        root.style.fontSize = told ? '150%' : '200%';
        if (told) m.food.relayout();
        await frames.frames(6);
        const after = document.activeElement;
        return { focused: name(before), held, builtAgain: !before.isConnected, after: m.frame().contains(after) ? name(after) : null, same: after === pick() };
      };
      const kept = results => results.every(r => r.held && r.builtAgain && r.same);

      const sheet = await at('case-food-flow-01', 1);
      sheet.food.openTasks();
      await frames.frames(3);
      const onSheet = [];
      for (const selector of ['.sheet', '.sheet [data-go="close"]', '.sheet [data-go="howto"]', '.tabs [data-tab="actions"]', '.tb [data-tb="promises"]', '#food-settings']) onSheet.push({ selector, ...await survives(sheet, () => sheet.find(`.planet-food ${selector}`)) });
      check('corrections: with a sheet open, the focus survives relayout(): on the sheet itself, on Close, on a row, on a tab, on Promises and on Settings, each built again', onSheet.length === 6 && kept(onSheet), { onSheet });
      const sheetAlone = { selector: '.sheet [data-go="close"]', ...await survives(sheet, () => sheet.find('.planet-food .sheet [data-go="close"]'), false) };
      sheet.close();

      const card = await at('case-food-flow-04', 1);
      const onCard = [];
      for (const selector of ['.fs-card', '#food-action-join', '#food-action-decline']) onCard.push({ selector, ...await survives(card, () => card.find(`.planet-food ${selector}`)) });
      check('corrections: with a request card open, the focus survives relayout(): on the card itself, on Join and on Decline, each built again', onCard.length === 3 && kept(onCard), { onCard });
      const cardAlone = { selector: '#food-action-join', ...await survives(card, () => card.find('.planet-food #food-action-join'), false) };
      check('corrections: at the Largest text, where a sheet or a card is built again by itself, the focus stays too', kept([sheetAlone, cardAlone]), { sheetAlone, cardAlone });

      // Focus that is outside the surface is left where it is.
      const elsewhere = document.createElement('button');
      elsewhere.type = 'button';
      stage.append(elsewhere);
      root.style.fontSize = '100%';
      card.food.relayout();
      await frames.frames(3);
      const old = card.find('.planet-food .fs-card');
      elsewhere.focus();
      root.style.fontSize = '150%';
      card.food.relayout();
      await frames.frames(6);
      check('corrections: a card built again does not take the focus from outside the surface', !old.isConnected && document.activeElement === elsewhere, { builtAgain: !old.isConnected, focus: name(document.activeElement) });
      elsewhere.remove();
      card.close();

      // The top bar is drawn again once a second of the clock.
      root.style.fontSize = '100%';
      let now = situation('case-food-flow-01').input.clock.now();
      const ticking = open('case-food-flow-01', { clock: { now: () => now } });
      await frames.frames(3);
      const seconds = [];
      for (const selector of ['.tb [data-tb="promises"]', '#food-settings']) {
        const before = ticking.find(`.planet-food ${selector}`);
        before.focus({ preventScroll: true });
        now += 1000;
        await frames.frames(3);
        seconds.push({ selector, held: true, builtAgain: !before.isConnected, same: document.activeElement === ticking.find(`.planet-food ${selector}`) });
      }
      check('corrections: the top bar is drawn again a second later, and Promises keeps the focus, as Settings does', seconds.length === 2 && kept(seconds), { seconds });
      ticking.close();
    }
    root.style.fontSize = was;
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
    const bare = open('food-panel-03', { assets: { get back() { return assets.back; }, operator: (...args) => assets.operator(...args), subscribe() {} } });
    await frames.frames(2);
    let closed = true;
    try { bare.close(); } catch { closed = false; }
    check('pictures: a loader whose subscribe gives nothing back is still let go quietly', closed, {});
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

    // A contact-off is owed and no hold is offered, on Frontend's own controller: its fixture where the ship holds
    // the crate for the Winch and this phone holds nothing.
    const owed = fixtureSituation('food-winch-03'), device3 = phone(document, '390x844'), c3 = owed.live.controller, before = c3.getModel();
    stage.append(device3.el);
    const hold3 = createFoodHoldInput({ down: () => c3.holdDown(), up: () => c3.holdUp(), held: () => c3.getModel().physicalHolding || c3.getModel().needsContactOff });
    let food3 = null;
    c3.subscribe(() => food3?.update(inputsFromModel(c3.getModel(), owed.live.context)));
    food3 = mountFood(device3.host, { ...owed.input, assets, bars: device3.bars() }, {
      onHold(contact) { if ('pointerId' in contact) hold3.pointerDown(contact.pointerId); }, onLetGo(contact) { if ('pointerId' in contact) hold3.pointerUp(contact.pointerId); }, onReleaseAll() { hold3.releaseAll(); },
    });
    await frames.frames(2);
    const node3 = device3.host.querySelector('#food-control-hold'), pressable = !!node3 && node3.getAttribute('aria-disabled') !== 'true';
    pointer(node3, 'pointerdown');
    await frames.frames(2);
    const kinds = () => owed.live.sent.map(request => request.command?.input).map(input => (input?.kind === 'HOLD' ? `HOLD ${input.edge}` : input?.kind ?? 'other'));
    const afterDown = kinds();
    pointer(win, 'pointerup');
    await frames.frames(3);
    await new Promise(done => { const channel = new win.MessageChannel(); channel.port1.onmessage = () => done(); channel.port2.postMessage(0); });
    const afterUp = kinds();
    check('adapter: with a contact-off owed and no hold offered, on Frontend\'s own controller, Hold stays pressable, a press sends no DOWN, and its let-go sends the contact-off',
      before.canHold === false && before.needsContactOff === true && pressable && afterDown.length === 0 && same(afterUp, ['HOLD_RECOVER_OFF']), { canHold: before.canHold, needsContactOff: before.needsContactOff, pressable, afterDown, afterUp });
    food3.dispose();
    c3.dispose();
    device3.el.remove();
  });

  listeners.restore();
  frames.restore();
  return { version: FOOD_VERSION, mode: deviceReduced ? 'device-reduced' : 'full', ok: checks.every(c => c.ok), checks };
}

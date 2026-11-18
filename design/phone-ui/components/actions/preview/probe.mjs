// mothership:dev-only
//
// The Actions lifecycle probe: it drives the real component (../actions.mjs, with ../../play-parts) inside the
// real phone shell, in the browser, under whatever headers serve the page (design/tools/actions-check.mjs serves
// the production ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   tiles     an available or chosen tile reports its type; the state is Frontend's (nothing changes until it
//             is given back); each tile is kept by its type, so a focused tile keeps its element and the focus
//             as its state, line and order change
//   refused   an unavailable, sending or registered tile takes no tap and keeps the focus, says why (its line),
//             and is aria-disabled (sending: aria-busy too); not interactive or reconnecting, no tile takes a
//             tap, and reconnecting says the shell's words
//   t3        a tile not offered without the server's reason says "Not available now"; with one, says it
//   list      a row reports its seat as Frontend gave it; each row is kept by its seat; Supply's first pick
//             is marked; "Dev (you)"; a focused row keeps the focus when the groups change
//   check     the person, both people (Supply) or the action's icon; "yourself" for this viewer; the facts;
//             the inline error when not accepted, as an alert, and gone when cleared; "Player" with its number
//             and the seat with its "·" (no-break spaces, 0.2.5); a refusal (0.2.5, R2): the check kept open with
//             Register off, the words last in the part and brought into view
//   after     the stamp, its words and tone for each kind; the headline, the detail, the people, the steps;
//             no time line after a reload; nothing drawn outside the sheet (nothing on the target)
//   words     the frames and the shell's words: the sheets' ids, titles, subs and buttons; the target bar
//             (Supply's second pick, the board; the Disabler's position bar, sheet 30, and its refusals); the chip;
//             the toast; Pass without a next player
//   footer    the sheets' buttons in the real shell: live, each is taken; reconnecting, Cancel (the check's and
//             Pass's) and Done are taken, being this phone's own (local), and Register, Pass, Retry the same and
//             Check receipt, which stand for commands, are refused, described by the banner's words
//   unknown   "Outcome unknown" names the action and its people, or the action alone; the Hospital panel's request
//             with no number, and one given is refused (the Lead's Q3); Pass, and the Disabler's position (A13)
//   move      Move's bar in each of the Lead's Q3 cases and on the board, none once picked or with no position;
//             the chip to the Board; no person's bar, list, After Register or toast for Move; in the real shell,
//             the bar's Cancel and the chip report, and reconnecting only Cancel does; the "Moved to A5" toast;
//             the check: the Move icon, "Move to A5" over "Room A", the facts, the board's "Move to B4" in the
//             same element, the inline note, Register move; "Outcome unknown" names the position
//   inputs    an unknown key, a type twice, an unknown type or state, too many people: each an error; a
//             checked input checks to itself
//   private   concealed, every part empties itself and drops this viewer's inputs; a new viewer's phone
//             shows none of the last viewer's tiles, rows, check or After Register
//   focus     a focused tile removed returns the focus to the root and reports which ended
//   text      at Large (150 %) on 390 the tiles are three to a row; at the Largest (200 %) on 320, one per
//             row as a list row, every word whole and each row at least 44 px; in a middle width, two
//   dispose   after dispose(), nothing is left and nothing fires; update() does nothing
//   motion    After Register's stamp snaps in over 120 ms, or with Reduce motion (the game's or the
//             device's) is there at once; the sending spinner stands still with Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { ACTION_WORDS, actionsSheet, afterSheet, blackoutBar, checkActions, checkAfterRegister, checkSheet, mountActionCheck, mountActions, mountAfterRegister, mountOutcomeUnknown,
  mountTargetList, moveBar, moveChip, movedToast, passSheet, passedToast, registeredToast, targetBar, targetChip, targetListSheet, unknownSheet } from '../actions.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ACTIONS_STATES } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));
const MOUNTS = { tiles: mountActions, list: mountTargetList, check: mountActionCheck, after: mountAfterRegister, unknown: mountOutcomeUnknown };

export async function runActionsProbe({ sizes, versions }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const inputOf = (key, extra = {}) => ({ viewer: 'seat-4', versions, ...ACTIONS_STATES[key].part.input, ...extra });

  /** A phone with the shell and a part in its sheet body (no room behind: the part is what is probed). */
  function phone(key, extra = {}, sizeKey = '390x844') {
    const size = sizes[sizeKey], state = ACTIONS_STATES[key];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    const shell = mountPhoneShell(frame, { ...state.shell, viewer: 'seat-4', versions, insets: size.insets }, { onSheetAction: record('onSheetAction') });
    const part = MOUNTS[state.part.kind](shell.sheetBody, inputOf(key, extra), { onTile: record('onTile'), onPick: record('onPick'), onFocusReturn: record('onFocusReturn') });
    return { frame, shell, part, intents, root: part.element, dispose: () => { part.dispose(); shell.dispose(); frame.remove(); } };
  }
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const tile = (root, type) => root.querySelector(`.ms-k-tile[data-value="${type}"]`);
  const text = root => root.textContent.replace(/\s+/g, ' ').trim();
  const reported = (p, name) => p.intents.filter(i => i[0] === name).map(i => i[1]);

  if (mode === 'full') {
    await check('tiles', async () => {
      const p = phone('tiles-doctor');
      const rescue = tile(p.root, 'RESCUE');
      rescue.focus();
      tap(rescue);
      tap(tile(p.root, 'MOVE'));
      const taps = reported(p, 'onTile');
      const unchanged = rescue.dataset.state === 'available';
      // Frontend chooses Rescue, sends it, and the server accepts it: the same element all through, focused.
      p.part.update({ tiles: [{ type: 'RESCUE', state: 'selected', note: '2 injections', badge: 2 }, { type: 'MOVE', state: 'available', note: 'Once a round' }] });
      const selected = rescue.dataset.state;
      tap(rescue);
      // Rescue moves to the end; it keeps the focus.
      p.part.update({ tiles: [{ type: 'MOVE', state: 'available', note: 'Once a round' }, { type: 'RESCUE', state: 'sending', note: '2 injections', badge: 2 }] });
      await frames();
      const moved = p.root.querySelectorAll('.ms-k-tile')[1] === rescue && document.activeElement === rescue;
      p.part.update({ tiles: [{ type: 'RESCUE', state: 'registered', note: 'Eli · end of round', badge: 2 }, { type: 'MOVE', state: 'available', note: 'Once a round' }] });
      const detail = { taps, unchanged, selected, selectedTap: reported(p, 'onTile').length === 3, moved, kept: tile(p.root, 'RESCUE') === rescue && document.activeElement === rescue,
        registered: rescue.dataset.state, mark: rescue.querySelector('.ms-k-tile-stamp')?.textContent, label: rescue.getAttribute('aria-label') };
      p.dispose();
      return { ok: JSON.stringify(taps) === '["RESCUE","MOVE"]' && unchanged && selected === 'selected' && detail.selectedTap && moved && detail.kept
        && detail.registered === 'registered' && detail.mark === 'REGISTERED' && detail.label === 'Rescue, Eli · end of round, registered', ...detail };
    });

    await check('refused', async () => {
      const p = phone('tiles-spent');
      const shoot = tile(p.root, 'REGISTER_SHOT'), rescue = tile(p.root, 'RESCUE'), talk = tile(p.root, 'REQUEST_HACK');
      shoot.focus();
      for (const n of [shoot, rescue, talk]) tap(n);
      const blocked = reported(p, 'onTile').length === 0 && document.activeElement === shoot;
      const attrs = [shoot, rescue, talk].map(n => [n.dataset.value, n.getAttribute('aria-disabled'), n.tagName]);
      p.part.update({ tiles: [{ type: 'RESCUE', state: 'sending', note: '2 injections', badge: 2 }] });
      const busy = tile(p.root, 'RESCUE').getAttribute('aria-busy');
      tap(tile(p.root, 'RESCUE'));
      // Not interactive, and reconnecting: an available tile takes no tap either.
      const q = phone('tiles-doctor', { interactive: false });
      tap(tile(q.root, 'RESCUE'));
      const r = phone('tiles-doctor', { status: 'stale' });
      const move = tile(r.root, 'MOVE');
      tap(move);
      const why = move.getAttribute('aria-describedby') ? r.root.querySelector(`#${move.getAttribute('aria-describedby')}`)?.textContent : null;
      const detail = { blocked, attrs, busy, sendingTaps: reported(p, 'onTile').length, offTaps: reported(q, 'onTile').length, staleTaps: reported(r, 'onTile').length, why,
        offDisabled: tile(q.root, 'RESCUE').getAttribute('aria-disabled'), shootLabel: shoot.getAttribute('aria-label') };
      for (const x of [p, q, r]) x.dispose();
      return { ok: blocked && attrs.every(([, d, tag]) => d === 'true' && tag === 'BUTTON') && busy === 'true' && detail.sendingTaps === 0 && detail.offTaps === 0
        && detail.staleTaps === 0 && why === ACTION_WORDS.stale && detail.offDisabled === 'true' && detail.shootLabel === 'Shoot, From Round 4', ...detail };
    });

    await check('t3', async () => {
      const p = phone('tiles-t3');
      const lines = [...p.root.querySelectorAll('.ms-k-tile')].map(n => [n.dataset.value, n.dataset.state, n.querySelector('.ms-k-tile-note:not([hidden])')?.textContent ?? null]);
      // A used-up tile (spent, kit 0.7.1) says the server's reason too.
      p.part.update({ tiles: [{ type: 'REQUEST_HACK', state: 'spent', reason: 'Used' }] });
      const reason = tile(p.root, 'REQUEST_HACK').querySelector('.ms-k-tile-note').textContent, spent = tile(p.root, 'REQUEST_HACK').dataset.state;
      p.dispose();
      return { ok: JSON.stringify(lines) === JSON.stringify([['RESCUE', 'available', '2 injections'], ['MOVE', 'available', 'Once a round'], ['REQUEST_HACK', 'unavailable', 'Not available now'], ['REGISTER_SHOT', 'unavailable', 'Not available now']])
        && reason === 'Used' && spent === 'spent', lines, reason, spent };
    });

    await check('list', async () => {
      const p = phone('list-supply');
      const rows = () => [...p.root.querySelectorAll('.ms-ac-list .ms-k-row')];
      const ava = rows()[0];
      ava.focus();
      tap(ava);
      tap(rows()[1]);
      const picks = reported(p, 'onPick');
      const titles = rows().map(r => r.querySelector('.ms-k-row-title').textContent);
      const marked = rows().map(r => r.hasAttribute('data-picked'));
      const picked = rows()[0].querySelector('.ms-k-row-value').textContent;
      // The offer changes: Hospital first, Ike gone. Ava keeps her element and the focus.
      const groups = inputOf('list-supply').groups;
      p.part.update({ groups: [groups[1], { room: groups[0].room, people: groups[0].people.filter(x => x.seat !== 'seat-9') }] });
      const detail = { picks, titles, marked, picked, kept: rows().includes(ava) && document.activeElement === ava, labels: [...p.root.querySelectorAll('.ms-k-group-label')].map(n => n.textContent), count: rows().length };
      p.dispose();
      return { ok: JSON.stringify(picks) === '["seat-1","seat-4"]' && JSON.stringify(titles) === '["Ava","Dev (you)","Gus","Ike","Eli"]' && marked[0] && !marked[1] && picked === ACTION_WORDS.picked
        && detail.kept && JSON.stringify(detail.labels) === '["Hospital","Room A"]' && detail.count === 4, ...detail };
    });

    await check('check', async () => {
      const p = phone('check');
      // The words compared with a no-break space as a space; the joins themselves are checked on their own (0.2.5).
      const read = () => ({ title: p.root.querySelector('.ms-k-who-title').textContent, sub: p.root.querySelector('.ms-k-who-sub').textContent.replace(/\u00a0/g, ' '),
        subRaw: p.root.querySelector('.ms-k-who-sub').textContent, form: p.root.querySelector('.ms-k-who-lead').dataset.form,
        portraits: p.root.querySelectorAll('.ms-k-who-lead .ms-k-pt').length, facts: [...p.root.querySelectorAll('.ms-k-facts li')].map(n => n.textContent), error: p.root.querySelector('.ms-k-error')?.textContent ?? null,
        alert: p.root.querySelector('.ms-k-error')?.getAttribute('role') ?? null });
      const one = read();
      p.part.update({ targets: [{ seat: 'seat-4', name: 'Dev', character: 'c1', room: 'Room A' }] });
      const self = read();
      p.part.update({ type: 'SUPPLY', targets: [{ seat: 'seat-1', name: 'Ava', character: 'c8', room: 'Room A' }, { seat: 'seat-7', name: 'Gus', character: 'c5', room: 'Room A' }], facts: ['Choose two players'] });
      const two = read();
      p.part.update({ type: 'REQUEST_BLACKOUT', targets: [], facts: [] });
      const none = read();
      p.part.update({ type: 'RESCUE', targets: [{ seat: 'seat-5', name: 'Eli', character: 'c3', room: 'Hospital' }], error: { text: 'The server did not accept Rescue.', detail: 'Register again.' } });
      const error = read();
      p.part.update({ error: null });
      const cleared = read();
      p.dispose();
      const joins = { one: one.subRaw === 'Player\u00a05\u00a0· Hospital', two: two.subRaw === 'Players\u00a01 and\u00a07' };
      // A refusal (0.2.5, R2): Frontend's words; the check stays open with Register off (canRegister: false), the
      // words last in the part and brought into view above the footer.
      const r = phone('check-refused');
      const note = r.root.querySelector('.ms-k-error'), register = r.frame.querySelector('.ms-ps-sheet-foot [data-value="register"]');
      const body = r.frame.querySelector('.ms-ps-sheet-body').getBoundingClientRect(), box = note?.getBoundingClientRect();
      const following = []; for (let n = note?.nextElementSibling; n; n = n.nextElementSibling) following.push([...n.classList].join('.'));
      // Last of what is drawn: only the control policy's visually hidden descriptions (.ms-k-vh) may follow it.
      const held = { words: note?.textContent ?? null, alert: note?.getAttribute('role') ?? null, last: !!note && following.every(c => c.split('.').includes('ms-k-vh')), following,
        registerOff: !!register && (register.disabled || register.getAttribute('aria-disabled') === 'true'), cancel: !!r.frame.querySelector('.ms-ps-sheet-foot [data-value="cancel"]'),
        inView: !!box && box.top >= body.top - 0.5 && box.top < body.bottom };
      r.dispose();
      return { ok: one.title === 'Rescue Eli' && one.sub === 'Player 5 · Hospital' && one.form === 'person' && one.portraits === 1 && one.facts.length === 3
        && self.title === 'Rescue yourself' && two.title === 'Supply Ava and Gus' && two.sub === 'Players 1 and 7' && two.form === 'pair' && two.portraits === 2
        && none.title === 'Request Blackout' && none.sub === 'Only you see this' && none.form === 'icon' && none.portraits === 0 && none.facts.length === 0
        && error.error === 'The server did not accept Rescue. Register again.' && error.alert === 'alert' && cleared.error === null
        && joins.one && joins.two && held.words === 'The server did not allow that command.' && held.alert === 'alert' && held.last && held.registerOff && held.cancel && held.inView,
        one: { ...one, subRaw: one.subRaw.replace(/\u00a0/g, '~') }, self, two: { ...two, subRaw: two.subRaw.replace(/\u00a0/g, '~') }, none, error, cleared, joins, held };
    });

    await check('after', async () => {
      const p = phone('after-suppress');
      const read = () => ({ kind: p.root.querySelector('.ms-ac-after').dataset.kind, stamp: p.root.querySelector('.ms-ac-after-head .ms-k-stamp').textContent,
        tone: p.root.querySelector('.ms-ac-after-head .ms-k-stamp').dataset.tone ?? null, status: p.root.querySelector('.ms-ac-after-head').getAttribute('role'),
        people: p.root.querySelectorAll('.ms-ac-after-people .ms-k-row').length, steps: [...p.root.querySelectorAll('.ms-pp-steps li')].map(n => n.dataset.step),
        stepsShown: !!p.root.querySelector('.ms-pp-steps:not([hidden])') });
      const captured = read();
      const kinds = {};
      for (const kind of ['registered', 'accepted', 'active', 'captured']) { p.part.update({ kind }); const r = read(); kinds[kind] = [r.stamp, r.tone, r.kind]; }
      p.part.update({ type: 'RESCUE', kind: 'registered', title: 'The server accepted your action.', people: null, steps: [] });
      const reload = read();
      // Nothing is drawn on the target: the component draws only in the sheet.
      const outside = [...document.querySelectorAll('.ms-ac-after, .ms-k-tile-stamp')].filter(n => !n.closest('.ms-ps-sheet')).length;
      p.dispose();
      return { ok: captured.kind === 'now' && captured.stamp === 'CAPTURED' && captured.tone === 'steel' && captured.status === 'status' && captured.people === 3 && captured.steps.join() === 'done,next'
        && JSON.stringify(kinds) === JSON.stringify({ registered: ['REGISTERED', 'pending', 'waits'], accepted: ['ACCEPTED', 'pending', 'waits'], active: ['ACTIVE', 'amber', 'now'], captured: ['CAPTURED', 'steel', 'now'] })
        && reload.steps.length === 0 && !reload.stepsShown && reload.people === 0 && outside === 0, captured, kinds, reload, outside };
    });

    await check('words', async () => {
      const sheets = [actionsSheet({ role: 'Doctor', room: 'Room A' }), targetListSheet({ type: 'RESCUE' }), checkSheet({ type: 'RESCUE' }), checkSheet({ type: 'REQUEST_HACK', phase: 'sending' }),
        afterSheet({ type: 'PROTECT' }), unknownSheet({ type: 'RESCUE' }), passSheet({ next: { seat: 'seat-5', name: 'Eli' } }), passSheet({})];
      // The words compared with a no-break space as a space; the Pass line's joins are checked on their own (0.2.5).
      const said = sheets.map(s => [s.id, s.title, s.sub?.replace(/\u00a0/g, ' ') ?? null, (s.actions ?? []).map(a => `${a.id}:${a.label}${a.busy ? ':busy' : ''}${a.local ? ':local' : ''}`).join('|') || null]);
      const joined = { pass: passSheet({ next: { seat: 'seat-5', name: 'Eli' } }).sub === 'The turn goes to Eli\u00a0· Player\u00a05', player: ACTION_WORDS.player(5) === 'Player\u00a05',
        players: ACTION_WORDS.players(1, 7) === 'Players\u00a01 and\u00a07' };
      const bars = [targetBar({ type: 'RESCUE' }), targetBar({ type: 'SUPPLY' }), targetBar({ type: 'SUPPLY', picked: ['seat-1'] }), targetBar({ type: 'RESCUE', where: 'board' }),
        blackoutBar({ room: 'Room A' }), blackoutBar({ room: 'Room A', fixed: 'A3' })].map(b => `${b.icon}|${b.title}|${b.sub}`);
      // The Disabler's bar (sheet 30) names its room while choosing, and needs one; "fixed" is a position.
      const refusals = [() => blackoutBar(), () => blackoutBar({ room: 'Room A', fixed: '' })].map(fn => { try { fn(); return null; } catch (e) { return e.message; } });
      const chips = [targetChip({ kind: 'other-rooms', count: 1 }), targetChip({ kind: 'list' })].map(c => `${c.id}|${c.label}|${c.icon}`);
      const toasts = [registeredToast({ type: 'RESCUE', id: 'c-1' }), registeredToast({ type: 'REQUEST_HACK', kind: 'accepted', id: 'c-2' }), registeredToast({ type: 'ACTIVATE_CLONE', kind: 'active', id: 'c-3' }),
        registeredToast({ type: 'ENGINEER_SUPPRESS', kind: 'captured', id: 'c-4' })].map(t => t.text);
      const want = [['actions', 'Actions', 'Doctor · Room A', null], ['action-list', 'Choose from a list', 'Rescue · everyone you can reach', null], ['action-check', 'Check and register', null, 'cancel:Cancel:local|register:Register Rescue'],
        ['action-check', 'Check and register', null, 'cancel:Cancel:local|register:Requesting…:busy'], ['action-after', 'Grant Protection', null, 'done:Done:local'], ['action-unknown', 'Outcome unknown', null, 'retry:Retry the same|check:Check receipt'],
        ['pass', 'Pass your turn?', 'The turn goes to Eli · Player 5', 'cancel:Cancel:local|pass:Pass'], ['pass', 'Pass your turn?', null, 'cancel:Cancel:local|pass:Pass']];
      return { ok: JSON.stringify(said) === JSON.stringify(want)
        && JSON.stringify(bars) === JSON.stringify(['rescue|Rescue|Choose a player', 'supply|Supply|Choose two players', 'supply|Supply|Choose the second player', 'rescue|Rescue|Choose a player · every room',
          'position|Choose a position|Room A · any position, even empty', 'position|Position A3 fixed|Resolves after the window · no effect shown now'])
        && refusals.every(r => typeof r === 'string')
        && JSON.stringify(chips) === JSON.stringify(['other-rooms|Other rooms · 1|board', 'list|List|players'])
        && JSON.stringify(toasts) === JSON.stringify(['Rescue registered', 'Private talk accepted', 'Clone active', 'Navigation suppressed'])
        && Object.values(joined).every(Boolean), said, bars, chips, toasts, refusals, joined };
    });

    await check('footer', async () => {
      // Each sheet with buttons, in the real shell, live and reconnecting; every button tapped once.
      const sheets = { check: checkSheet({ type: 'RESCUE' }), after: afterSheet({ type: 'RESCUE' }), unknown: unknownSheet({ type: 'RESCUE' }), pass: passSheet({ next: { seat: 'seat-5', name: 'Eli' } }) };
      const size = sizes['390x844'];
      const run = status => Object.fromEntries(Object.entries(sheets).map(([key, sheet]) => {
        const frame = document.createElement('div');
        frame.className = 'pv-phone';
        Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
        document.body.append(frame);
        const taken = [];
        const shell = mountPhoneShell(frame, { ...ACTIONS_STATES.check.shell, sheet, status, viewer: 'seat-4', versions, insets: size.insets, ...(status === 'stale' ? { banner: { kind: 'reconnecting' } } : {}) },
          { onSheetAction: (id, sheetId) => taken.push(`${sheetId}:${id}`) });
        const buttons = [...frame.querySelectorAll('.ms-ps-sheet-foot > button')];
        for (const b of buttons) tap(b);
        const why = Object.fromEntries(buttons.map(b => [b.dataset.value, b.getAttribute('aria-describedby') ? document.getElementById(b.getAttribute('aria-describedby'))?.textContent ?? null : null]));
        shell.dispose();
        frame.remove();
        return [key, { taken, why }];
      }));
      const live = run('live'), stale = run('stale');
      const refusedWhy = { register: ACTION_WORDS.stale, retry: ACTION_WORDS.stale, check: ACTION_WORDS.stale, pass: ACTION_WORDS.stale };
      return { ok: JSON.stringify(Object.values(live).map(r => r.taken)) === JSON.stringify([['action-check:cancel', 'action-check:register'], ['action-after:done'], ['action-unknown:retry', 'action-unknown:check'], ['pass:cancel', 'pass:pass']])
        && Object.values(live).every(r => Object.values(r.why).every(w => w === null))
        && JSON.stringify(Object.values(stale).map(r => r.taken)) === JSON.stringify([['action-check:cancel'], ['action-after:done'], [], ['pass:cancel']])
        && Object.values(stale).every(r => Object.entries(r.why).every(([id, w]) => w === (refusedWhy[id] ?? null)))
        && stale.check.why.cancel === null && stale.after.why.done === null && stale.pass.why.cancel === null, live, stale };
    });

    await check('unknown', async () => {
      const p = phone('unknown');
      const lines = () => [...p.root.querySelectorAll('.ms-k-notice p')].map(n => n.textContent);
      const one = lines();
      p.part.update({ type: 'REQUEST_BLACKOUT', targets: [] });
      const none = lines();
      // The Hospital panel's request (the Lead's Q3): no one, so no number; one given is refused, and nothing changes.
      p.part.update({ type: 'PANEL_CODE', targets: [] });
      const panel = lines();
      let refused = null;
      try { p.part.update({ targets: [{ seat: 'seat-3', name: 'Cleo' }] }); } catch (error) { refused = error.message; }
      const after = lines();
      const status = p.root.querySelector('.ms-k-notice').getAttribute('role');
      // Pass and the Disabler's position (0.2.3, A13): Pass alone, and the position as Move's is named.
      p.part.update({ type: 'PASS_TURN', targets: [] });
      const pass = lines();
      p.part.update({ type: 'SELECT_BLACKOUT_SLOT', position: { slot: 'A3', room: 'Room A' } });
      const position = lines();
      p.dispose();
      const said = what => JSON.stringify([`${what} was sent, but no answer came back.`, 'Check before doing anything else.']);
      return { ok: JSON.stringify(one) === said('Rescue Eli') && JSON.stringify(none) === said('Request Blackout') && JSON.stringify(panel) === said('Panel request')
        && typeof refused === 'string' && !/3|Cleo/.test(refused) && JSON.stringify(after) === JSON.stringify(panel) && status === 'status'
        && JSON.stringify(pass) === said('Pass') && JSON.stringify(position) === said('Position A3'), one, none, panel, refused, after, status, pass, position };
    });

    await check('move', async () => {
      // The bar in each of the Lead's Q3 cases, on the board, once a position is picked (the check then), and with none.
      const said = b => (b ? `${b.icon}|${b.title}|${b.sub}` : null);
      const bars = [moveBar({ where: 'room', room: 'Room A', here: true, elsewhere: true }), moveBar({ where: 'room', room: 'Room A', here: true, elsewhere: false }),
        moveBar({ where: 'room', room: 'Room A', here: false, elsewhere: true }), moveBar({ where: 'room', room: 'Room A' }),
        moveBar({ where: 'board', here: false, elsewhere: true }), moveBar({ where: 'room', room: 'Room A', here: true, elsewhere: true, picked: 'A5' })].map(said);
      const chips = [moveChip({ elsewhere: true }), moveChip({ elsewhere: false })].map(c => (c ? `${c.id}|${c.label}|${c.icon}|${c.tone}` : null));
      // Move has no person's bar, list, After Register or "registered" toast: each refuses, naming Move's own.
      const refused = [() => targetBar({ type: 'MOVE' }), () => targetListSheet({ type: 'MOVE' }), () => afterSheet({ type: 'MOVE' }), () => registeredToast({ type: 'MOVE', id: 'm' })]
        .map(f => { try { f(); return false; } catch (error) { return error instanceof TypeError; } });
      const toasts = [movedToast({ slot: 'A5', id: 'm-1' }), passedToast({ id: 'p-1' })].map(t => `${t.id}|${t.text}|${t.icon}`);
      // In the real shell: the bar's Cancel and the chip report their intents; reconnecting, Cancel still does (it is
      // this phone's own, shell 0.2.7) and the chip, like every other, waits.
      const size = sizes['390x844'];
      const frame = document.createElement('div');
      frame.className = 'pv-phone';
      Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
      document.body.append(frame);
      const intents = [];
      const record = name => (...args) => intents.push([name, ...args]);
      const shell = mountPhoneShell(frame, { ...ACTIONS_STATES['move-room'].shell, viewer: 'seat-4', versions, insets: size.insets }, { onCancelTarget: record('onCancelTarget'), onChip: record('onChip') });
      await frames();
      const bar = frame.querySelector('.ms-ps-target'), chip = frame.querySelector('.ms-ps-chip-btn');
      const shown = [bar?.querySelector('.ms-ps-text b')?.textContent ?? null, bar?.querySelector('.ms-ps-text span')?.textContent ?? null, chip?.textContent.trim() ?? null];
      tap(bar.querySelector('button'));
      tap(chip);
      const live = intents.map(i => i.join(':'));
      shell.update({ status: 'stale', banner: { kind: 'reconnecting' } });
      await frames();
      intents.length = 0;
      tap(frame.querySelector('.ms-ps-target button'));
      tap(frame.querySelector('.ms-ps-chip-btn'));
      const stale = intents.map(i => i.join(':'));
      // The toast once moved: the shell's info toast, its words and its icon.
      shell.update({ status: 'live', banner: null, target: null, chip: null, toast: movedToast({ slot: 'A5', id: 'm-1' }) });
      await frames();
      const toast = frame.querySelector('.ms-k-toast');
      const toastSaid = [toast?.querySelector('.ms-k-toast-text')?.textContent ?? null, toast?.querySelector('.ms-k-toast-icon')?.dataset.icon ?? null];
      shell.dispose();
      frame.remove();
      // The check (Q1 and Q4): the Move icon, "Move to A5" with the room under it, Frontend's facts; the same element
      // for the board's "Move to B4"; the inline note when not accepted; and "Outcome unknown" names the position.
      const p = phone('move-check');
      const read = () => ({ form: p.root.querySelector('.ms-k-who-lead')?.dataset.form ?? null, icon: p.root.querySelector('.ms-k-who-lead')?.dataset.icon ?? null,
        title: p.root.querySelector('.ms-k-who-title')?.textContent ?? null, sub: p.root.querySelector('.ms-k-who-sub:not([hidden])')?.textContent ?? null,
        facts: [...p.root.querySelectorAll('.ms-k-facts li')].map(n => n.textContent), error: p.root.querySelector('.ms-k-error')?.textContent ?? null });
      const room = read();
      const who = p.root.querySelector('.ms-k-who');
      p.part.update({ position: { slot: 'B4', room: 'Room B' } });
      const board = read();
      const kept = p.root.querySelector('.ms-k-who') === who;
      p.part.update({ error: { text: 'The server did not accept the move.', detail: 'Choose a position again.' } });
      const error = read();
      const footer = [checkSheet({ type: 'MOVE' }), checkSheet({ type: 'MOVE', phase: 'sending' })].map(s => s.actions.map(a => `${a.id}:${a.label}${a.busy ? ':busy' : ''}${a.local ? ':local' : ''}`).join('|'));
      p.dispose();
      const u = phone('move-unknown');
      const unknown = [...u.root.querySelectorAll('.ms-k-notice p')].map(n => n.textContent);
      u.dispose();
      const detail = { bars, chips, refused, toasts, shown, live, stale, toastSaid, room, board, kept, error, footer, unknown };
      return { ok: JSON.stringify(bars) === JSON.stringify(['move|Move within Room A|Choose an empty position · or another room on the Board', 'move|Move within Room A|Choose an empty position',
          'move|Move|No empty position in Room A · choose one on the Board', null, 'move|Move|Choose an empty position · uses this round’s move', null])
        && JSON.stringify(chips) === JSON.stringify(['move-board|Other rooms on the Board|board|paper', null]) && refused.every(Boolean)
        && JSON.stringify(toasts) === JSON.stringify(['m-1|Moved to A5|info', 'p-1|Turn passed|info'])
        && JSON.stringify(shown) === JSON.stringify(['Move within Room A', 'Choose an empty position · or another room on the Board', 'Other rooms on the Board'])
        && JSON.stringify(live) === JSON.stringify(['onCancelTarget', 'onChip:move-board']) && JSON.stringify(stale) === JSON.stringify(['onCancelTarget'])
        && JSON.stringify(toastSaid) === JSON.stringify(['Moved to A5', 'info:filled'])
        && room.form === 'icon' && room.icon === 'move:filled' && room.title === 'Move to A5' && room.sub === 'Room A' && JSON.stringify(room.facts) === JSON.stringify(['Uses this round’s move']) && room.error === null
        && board.title === 'Move to B4' && board.sub === 'Room B' && kept && error.error === 'The server did not accept the move. Choose a position again.'
        && JSON.stringify(footer) === JSON.stringify(['cancel:Cancel:local|register:Register move', 'cancel:Cancel:local|register:Registering…:busy'])
        && JSON.stringify(unknown) === JSON.stringify(['Move to A5 was sent, but no answer came back.', 'Check before doing anything else.']), ...detail };
    });

    await check('inputs', async () => {
      const errors = [];
      const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
      expectError('an unknown key', () => checkActions({ tiles: [], colour: 'red' }));
      expectError('a type twice', () => checkActions({ tiles: [{ type: 'MOVE' }, { type: 'MOVE' }] }));
      expectError('an unknown type', () => checkActions({ tiles: [{ type: 'FLY' }] }));
      expectError('an unknown state', () => checkActions({ tiles: [{ type: 'MOVE', state: 'done' }] }));
      expectError('a check for Scan, which is the Hacker component\'s', () => checkSheet({ type: 'SCAN' }));
      const p = phone('check');
      expectError('two people for Rescue', () => p.part.update({ targets: [{ seat: 'seat-1', name: 'Ava' }, { seat: 'seat-7', name: 'Gus' }] }));
      expectError('an unknown key in an update', () => p.part.update({ colour: 'red' }));
      // Move's check takes a position and no person; a position is Move's alone.
      expectError('Move without its position', () => p.part.update({ type: 'MOVE', targets: [], position: null }));
      expectError('a person for Move', () => p.part.update({ type: 'MOVE', position: { slot: 'A5', room: 'Room A' } }));
      expectError('a position for Rescue', () => p.part.update({ position: { slot: 'A5', room: 'Room A' } }));
      p.dispose();
      expectError('After Register for Move', () => checkAfterRegister({ type: 'MOVE' }));
      const once = checkActions(inputOf('tiles-doctor')), twice = checkActions(once);
      return { ok: errors.every(([, thrown]) => thrown) && JSON.stringify(once) === JSON.stringify(twice), errors, idempotent: JSON.stringify(once) === JSON.stringify(twice) };
    });

    await check('private', async () => {
      const results = {};
      const PRIVATE = ['Rescue', 'injections', 'Eli', 'Ava', 'Gus', 'REGISTERED', 'CAPTURED', 'Uses 1 of 2', 'Navigation', 'Doctor', 'Move to', 'A5', 'round’s move'];
      for (const key of ['tiles-doctor', 'list', 'check', 'after-suppress', 'unknown', 'move-check', 'move-unknown']) {
        const p = phone(key);
        p.part.update({ status: 'concealed' });
        const concealed = text(p.root);
        // Shown again: nothing comes back until given again.
        p.part.update({ status: 'live' });
        const back = text(p.root);
        p.dispose();
        // A new viewer: none of the last viewer's inputs.
        const q = phone(key);
        q.part.update({ viewer: 'seat-7' });
        const other = text(q.root);
        q.dispose();
        results[key] = { concealed, back, other, leaked: PRIVATE.filter(w => concealed.includes(w) || back.includes(w) || other.includes(w)) };
      }
      return { ok: Object.values(results).every(r => r.leaked.length === 0 && r.concealed === ''), results };
    });

    await check('focus', async () => {
      const p = phone('tiles-doctor');
      const move = tile(p.root, 'MOVE');
      move.focus();
      p.part.update({ tiles: [{ type: 'RESCUE', state: 'available', note: '2 injections', badge: 2 }] });
      await microtasks();
      const detail = { onRoot: document.activeElement === p.root, returned: p.intents.filter(i => i[0] === 'onFocusReturn').map(i => i[1]) };
      p.dispose();
      return { ok: detail.onRoot && detail.returned.length === 1 && detail.returned[0]?.intent === 'tile' && detail.returned[0]?.value === 'MOVE', ...detail };
    });

    await check('text', async () => {
      const layout = (key, sizeKey, percent, width = null) => {
        document.documentElement.style.fontSize = `${percent}%`;
        const p = phone(key, {}, sizeKey);
        if (width) p.root.style.width = `${width}px`;
        const tiles = [...p.root.querySelectorAll('.ms-k-tile')];
        const top = n => Math.round(n.getBoundingClientRect().top);
        const perRow = tiles.filter(n => top(n) === top(tiles[0])).length;
        // Every word whole: nothing in a tile runs past it.
        const whole = tiles.every(n => n.scrollWidth <= n.clientWidth + 1 && [...n.querySelectorAll('.ms-k-tile-name, .ms-k-tile-note:not([hidden])')].every(w => w.getBoundingClientRect().right <= n.getBoundingClientRect().right + 0.5));
        const listForm = getComputedStyle(tiles[0]).display === 'grid';
        const tall = tiles.every(n => n.getBoundingClientRect().height >= 44);
        p.dispose();
        document.documentElement.style.fontSize = '';
        return { perRow, whole, listForm, tall };
      };
      const large = layout('tiles-doctor', '390x844', 150), largest = layout('tiles-spent', '320x568', 200), middle = layout('tiles-doctor', '390x844', 150, 330), base = layout('tiles-hacker', '320x568', 100);
      return { ok: large.perRow === 3 && !large.listForm && large.whole && largest.perRow === 1 && largest.listForm && largest.whole && largest.tall && middle.perRow === 2 && middle.whole
        && base.perRow === 3 && base.whole, large, largest, middle, base };
    });

    await check('dispose', async () => {
      const p = phone('tiles-doctor');
      const root = p.root, rescue = tile(root, 'RESCUE');
      p.part.dispose();
      tap(rescue);
      p.part.update({ tiles: [] });
      const detail = { left: root.isConnected, taps: reported(p, 'onTile').length, body: p.shell.sheetBody?.querySelectorAll('.ms-actions').length ?? 0 };
      p.shell.dispose();
      p.frame.remove();
      return { ok: !detail.left && detail.taps === 0 && detail.body === 0, ...detail };
    });
  }

  await check('motion', async () => {
    const p = phone('after-rescue');
    await frames();
    const stamp = p.root.querySelector('.ms-ac-after-head .ms-k-stamp');
    const anim = stamp.getAnimations().map(a => ({ name: a.animationName, duration: a.effect.getTiming().duration }));
    const q = phone('after-rescue', { reducedMotion: true });
    await frames();
    const reduced = q.root.querySelector('.ms-ac-after-head .ms-k-stamp').getAnimations().length;
    const r = phone('tiles-sending', { reducedMotion: true });
    const spinner = getComputedStyle(tile(r.root, 'RESCUE').querySelector('.ms-k-tile-icon'), '::after').animationName;
    const s = phone('tiles-sending');
    const spinning = getComputedStyle(tile(s.root, 'RESCUE').querySelector('.ms-k-tile-icon'), '::after').animationName;
    for (const x of [p, q, r, s]) x.dispose();
    const detail = { anim, reduced, spinner, spinning };
    // With the device's Reduce motion, nothing animates even without the game's setting.
    if (deviceReduced) return { ok: anim.length === 0 && reduced === 0 && spinner === 'none' && spinning === 'none', ...detail };
    return { ok: anim.length === 1 && anim[0].duration === 120 && reduced === 0 && spinner === 'none' && spinning === 'ms-k-spin', ...detail };
  });

  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

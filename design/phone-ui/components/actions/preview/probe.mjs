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
//             the inline error when not accepted, as an alert, and gone when cleared
//   after     the stamp, its words and tone for each kind; the headline, the detail, the people, the steps;
//             no time line after a reload; nothing drawn outside the sheet (nothing on the target)
//   words     the frames and the shell's words: the sheets' ids, titles, subs and buttons; the target bar
//             (Supply's second pick, the board); the chip; the toast; Pass without a next player
//   footer    the sheets' buttons in the real shell: live, each is taken; reconnecting, Cancel (the check's and
//             Pass's) and Done are taken, being this phone's own (local), and Register, Pass, Retry the same and
//             Check receipt, which stand for commands, are refused, described by the banner's words
//   unknown   "Outcome unknown" names the action and its people, or the action alone
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

import { ACTION_WORDS, actionsSheet, afterSheet, checkActions, checkSheet, mountActionCheck, mountActions, mountAfterRegister, mountOutcomeUnknown,
  mountTargetList, passSheet, registeredToast, targetBar, targetChip, targetListSheet, unknownSheet } from '../actions.mjs';
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
      const read = () => ({ title: p.root.querySelector('.ms-k-who-title').textContent, sub: p.root.querySelector('.ms-k-who-sub').textContent, form: p.root.querySelector('.ms-k-who-lead').dataset.form,
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
      return { ok: one.title === 'Rescue Eli' && one.sub === 'Player 5 · Hospital' && one.form === 'person' && one.portraits === 1 && one.facts.length === 3
        && self.title === 'Rescue yourself' && two.title === 'Supply Ava and Gus' && two.sub === 'Players 1 and 7' && two.form === 'pair' && two.portraits === 2
        && none.title === 'Request Blackout' && none.sub === 'Only you see this' && none.form === 'icon' && none.portraits === 0 && none.facts.length === 0
        && error.error === 'The server did not accept Rescue. Register again.' && error.alert === 'alert' && cleared.error === null, one, self, two, none, error, cleared };
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
      const said = sheets.map(s => [s.id, s.title, s.sub ?? null, (s.actions ?? []).map(a => `${a.id}:${a.label}${a.busy ? ':busy' : ''}${a.local ? ':local' : ''}`).join('|') || null]);
      const bars = [targetBar({ type: 'RESCUE' }), targetBar({ type: 'SUPPLY' }), targetBar({ type: 'SUPPLY', picked: ['seat-1'] }), targetBar({ type: 'RESCUE', where: 'board' })].map(b => `${b.icon}|${b.title}|${b.sub}`);
      const chips = [targetChip({ kind: 'other-rooms', count: 1 }), targetChip({ kind: 'list' })].map(c => `${c.id}|${c.label}|${c.icon}`);
      const toasts = [registeredToast({ type: 'RESCUE', id: 'c-1' }), registeredToast({ type: 'REQUEST_HACK', kind: 'accepted', id: 'c-2' }), registeredToast({ type: 'ACTIVATE_CLONE', kind: 'active', id: 'c-3' }),
        registeredToast({ type: 'ENGINEER_SUPPRESS', kind: 'captured', id: 'c-4' })].map(t => t.text);
      const want = [['actions', 'Actions', 'Doctor · Room A', null], ['action-list', 'Choose from a list', 'Rescue · everyone you can reach', null], ['action-check', 'Check and register', null, 'cancel:Cancel:local|register:Register Rescue'],
        ['action-check', 'Check and register', null, 'cancel:Cancel:local|register:Requesting…:busy'], ['action-after', 'Grant Protection', null, 'done:Done:local'], ['action-unknown', 'Outcome unknown', null, 'retry:Retry the same|check:Check receipt'],
        ['pass', 'Pass your turn?', 'The turn goes to Eli · Player 5', 'cancel:Cancel:local|pass:Pass'], ['pass', 'Pass your turn?', null, 'cancel:Cancel:local|pass:Pass']];
      return { ok: JSON.stringify(said) === JSON.stringify(want)
        && JSON.stringify(bars) === JSON.stringify(['rescue|Rescue|Choose a player', 'supply|Supply|Choose two players', 'supply|Supply|Choose the second player', 'rescue|Rescue|Choose a player · every room'])
        && JSON.stringify(chips) === JSON.stringify(['other-rooms|Other rooms · 1|board', 'list|List|players'])
        && JSON.stringify(toasts) === JSON.stringify(['Rescue registered', 'Private talk accepted', 'Clone active', 'Navigation suppressed']), said, bars, chips, toasts };
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
      const status = p.root.querySelector('.ms-k-notice').getAttribute('role');
      p.dispose();
      return { ok: JSON.stringify(one) === JSON.stringify(['Rescue Eli was sent, but no answer came back.', 'Check before doing anything else.'])
        && JSON.stringify(none) === JSON.stringify(['Request Blackout was sent, but no answer came back.', 'Check before doing anything else.']) && status === 'status', one, none, status };
    });

    await check('inputs', async () => {
      const errors = [];
      const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
      expectError('an unknown key', () => checkActions({ tiles: [], colour: 'red' }));
      expectError('a type twice', () => checkActions({ tiles: [{ type: 'MOVE' }, { type: 'MOVE' }] }));
      expectError('an unknown type', () => checkActions({ tiles: [{ type: 'FLY' }] }));
      expectError('an unknown state', () => checkActions({ tiles: [{ type: 'MOVE', state: 'done' }] }));
      expectError('a check for Move, which is not this component\'s', () => checkSheet({ type: 'MOVE' }));
      const p = phone('check');
      expectError('two people for Rescue', () => p.part.update({ targets: [{ seat: 'seat-1', name: 'Ava' }, { seat: 'seat-7', name: 'Gus' }] }));
      expectError('an unknown key in an update', () => p.part.update({ colour: 'red' }));
      p.dispose();
      const once = checkActions(inputOf('tiles-doctor')), twice = checkActions(once);
      return { ok: errors.every(([, thrown]) => thrown) && JSON.stringify(once) === JSON.stringify(twice), errors, idempotent: JSON.stringify(once) === JSON.stringify(twice) };
    });

    await check('private', async () => {
      const results = {};
      const PRIVATE = ['Rescue', 'injections', 'Eli', 'Ava', 'Gus', 'REGISTERED', 'CAPTURED', 'Uses 1 of 2', 'Navigation', 'Doctor'];
      for (const key of ['tiles-doctor', 'list', 'check', 'after-suppress', 'unknown']) {
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

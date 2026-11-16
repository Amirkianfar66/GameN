// mothership:dev-only
//
// The Hospital panel lifecycle probe: it drives the real component (../hospital-panel.mjs, on the kit) inside the
// real phone shell, in the browser, under whatever headers serve the page (design/tools/hospital-panel-check.mjs
// serves the production ones), and reports what it saw. Each check is one behaviour Frontend relies on; audience,
// leaks and private are sheet 43's ("Patient-private") and the Lead's privacy note:
//   keys      a tap on each key reports its seat as Frontend gave it, the picked one too; the pick is Frontend's
//             (nothing changes until it is given back); the picked key is pressed and the display says its number,
//             "_" before; the keys are one group, named by the line under them, each key by its number; every number
//             keeps its place, and at 8 and 7 players the missing places are empty, not keys (Q5); a focused key
//             keeps its element and the focus as the pick changes
//   refused   while Submit sends, no key takes a tap (Q1); not interactive or reconnecting, none does, and
//             reconnecting says the shell's words
//   status    REGISTERED (amber) with its two lines; WRONG NUMBER; TREATED (amber), NO EFFECT and DISCARDED, each
//             with its line and "Your attempt is used" (Q4); the lock and "Your attempt is used"; the panel icon and
//             "The panel is unavailable right now"; each a status, which reads as it opens; no result, nothing
//   words     panelSheet() for each step: the id, title, sub, ✕, large detent and buttons ("Submit 3",
//             "Submitting…"); its errors
//   footer    the sheet in the real shell: live, Submit and ✕ are taken; reconnecting, ✕ (this phone's own) still
//             is, and Submit is refused with the banner's words; while Submit sends, ✕ only closes (Q1)
//   audience  the shared display (no viewer) draws neither part; a part handed to another viewer empties itself
//   leaks     the picked number reaches no attribute's value (the only attribute that changes with it is the
//             pressed state), the console, the shell's onLayout, or a callback but onPick; an input's error never
//             names the pick
//   inputs    an unknown key, a key twice, a number out of 1–9, more than nine keys, a pick not among the keys,
//             sending with no pick, a phase or a result that is not one: each an error; a checked input checks to
//             itself
//   private   concealed, each part empties itself and drops this viewer's inputs; shown again, nothing comes back
//             until given; a new viewer's phone shows none of the last viewer's
//   focus     a focused key removed returns the focus to the root and reports which key, as the control policy does
//   text      at the Largest text (200 %) on 320 × 568 the 3 × 3 stays three to a row, each key at least 44 px,
//             the display grows with its number, and every word is whole; at Large (150 %) on 390 × 844, the same
//   dispose   after dispose(), nothing is left and nothing fires; update() does nothing
//   motion    each result's stamp snaps in over 120 ms, as REGISTERED (the handoff's motion table), and with
//             Reduce motion (the game's or the device's) is there at once; the icons, the display and the keys
//             don't move
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { PANEL_RESULTS, PANEL_WORDS, checkPanelKeypad, checkPanelStatus, mountPanelKeypad, mountPanelStatus, panelSheet } from '../hospital-panel.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { PANEL_STATES, keysFor } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));
const MOUNTS = { keypad: mountPanelKeypad, status: mountPanelStatus };
/** The record's words: none may reach an attribute, the console or the layout. */
const SECRET = /REGISTERED|WRONG NUMBER|TREATED|NO EFFECT|DISCARDED|queued for Rescue|attempt is used|unavailable right now|You were treated|had no effect|was discarded/i;
const STATUS_STATES = ['queued', 'wrong', 'treated', 'no-effect', 'discarded', 'spent', 'unavailable'];

export async function runPanelProbe({ sizes, versions }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const inputOf = (key, extra = {}) => ({ viewer: 'seat-4', versions, ...PANEL_STATES[key].part.input, ...extra });

  /** A phone with the shell and a part in its sheet body (no room behind: the part is what is probed). */
  function phone(key, extra = {}, sizeKey = '390x844', { shellExtra = {}, onLayout = null } = {}) {
    const size = sizes[sizeKey], state = PANEL_STATES[key];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    const shell = mountPhoneShell(frame, { ...state.shell, viewer: 'seat-4', versions, insets: size.insets, ...shellExtra },
      { onSheetAction: record('onSheetAction'), onSheetClose: record('onSheetClose'), ...(onLayout ? { onLayout } : {}) });
    const part = MOUNTS[state.part.kind](shell.sheetBody, inputOf(key, extra), { onPick: record('onPick'), onFocusReturn: record('onFocusReturn') });
    return { frame, shell, part, intents, root: part.element, dispose: () => { part.dispose(); shell.dispose(); frame.remove(); } };
  }
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const keys = root => [...root.querySelectorAll('.ms-hp-key')];
  const key = (root, n) => root.querySelector(`.ms-hp-key[data-value="${n}"]`);
  const text = root => (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const reported = (p, name) => p.intents.filter(i => i[0] === name).map(i => i[1]);
  const describedBy = node => (node.getAttribute('aria-describedby') ? document.getElementById(node.getAttribute('aria-describedby'))?.textContent ?? null : null);
  const display = root => text(root.querySelector('.ms-hp-display'));
  const pressed = root => keys(root).filter(k => k.getAttribute('aria-pressed') === 'true').map(k => k.dataset.value);
  /** Every attribute in a part, as [path, name, value]. */
  const attributes = root => [...root.querySelectorAll('*'), root].flatMap((n, i) => [...n.attributes].map(a => [`${n.tagName}#${i}`, a.name, a.value]));

  if (mode === 'full') {
    await check('keys', async () => {
      const p = phone('enter');
      const first = keys(p.root);
      const before = { display: display(p.root), pressed: pressed(p.root) };
      first[4].focus();
      for (const k of first) tap(k);
      const told = reported(p, 'onPick');
      // The pick is Frontend's: nothing changes until it is given.
      const unchanged = pressed(p.root);
      p.part.update({ picked: 'seat-3' });
      const three = { display: display(p.root), pressed: pressed(p.root) };
      tap(key(p.root, 3));
      const again = reported(p, 'onPick').at(-1);
      p.part.update({ picked: 'seat-6' });
      const six = { display: display(p.root), pressed: pressed(p.root) };
      const kept = keys(p.root).every((k, i) => k === first[i]) && document.activeElement === first[4];
      const pad = p.root.querySelector('.ms-hp-keypad'), note = p.root.querySelector('.ms-k-group-note');
      const named = pad.getAttribute('role') === 'group' && document.getElementById(pad.getAttribute('aria-labelledby')) === note && text(note) === PANEL_WORDS.note;
      const names = keys(p.root).map(k => [k.textContent, k.getAttribute('aria-label'), k.type]);
      const live = p.root.querySelector('.ms-hp-display').getAttribute('aria-live');
      const places9 = keys(p.root).map(k => { const r = k.getBoundingClientRect(); return [k.dataset.value, Math.round(r.left), Math.round(r.top)]; });
      p.dispose();
      // Fewer players: the missing numbers' places are empty, the others where they were.
      const places = n => {
        const q = phone(n === 8 ? 'eight' : 'seven');
        const cells = [...q.root.querySelector('.ms-hp-keypad').children];
        const out = { keys: keys(q.root).map(k => k.dataset.value), gaps: cells.filter(c => c.classList.contains('ms-hp-gap')).length,
          gapPlaces: cells.map((c, i) => (c.classList.contains('ms-hp-gap') ? i + 1 : null)).filter(Boolean),
          at: keys(q.root).map(k => { const r = k.getBoundingClientRect(); return [k.dataset.value, Math.round(r.left), Math.round(r.top)]; }),
          gapsHidden: cells.filter(c => c.classList.contains('ms-hp-gap')).every(c => c.getAttribute('aria-hidden') === 'true' && c.tagName === 'SPAN') };
        q.dispose();
        return out;
      };
      const eight = places(8), seven = places(7);
      const samePlaces = list => list.at.every(([v, x, y]) => { const m = places9.find(q => q[0] === v); return m && m[1] === x && m[2] === y; });
      const detail = { before, told, unchanged, three, again, six, kept, named, names, live, eight, seven };
      return { ok: before.display === '_' && before.pressed.length === 0 && JSON.stringify(told) === JSON.stringify(keysFor(9).map(k => k.seat)) && unchanged.length === 0
        && three.display === '3' && three.pressed.join() === '3' && again === 'seat-3' && six.display === '6' && six.pressed.join() === '6' && kept && named
        && names.every(([t, label, type], i) => t === String(i + 1) && label === null && type === 'button') && live === 'polite'
        && eight.keys.join() === '1,2,3,4,5,6,7,8' && eight.gaps === 1 && eight.gapPlaces.join() === '9' && eight.gapsHidden && samePlaces(eight)
        && seven.keys.join() === '1,2,3,4,5,6,7' && seven.gaps === 2 && seven.gapPlaces.join() === '8,9' && seven.gapsHidden && samePlaces(seven), ...detail };
    });

    await check('refused', async () => {
      const p = phone('sending');
      const sendingOff = keys(p.root).every(k => k.getAttribute('aria-disabled') === 'true');
      tap(key(p.root, 5));
      const whileSending = reported(p, 'onPick').length;
      const keepsNumber = display(p.root) === '3';
      p.part.update({ phase: 'ready' });
      const back = keys(p.root).every(k => k.getAttribute('aria-disabled') !== 'true');
      p.part.update({ interactive: false });
      const notInteractive = keys(p.root).every(k => k.getAttribute('aria-disabled') === 'true');
      tap(key(p.root, 5));
      p.part.update({ interactive: true, status: 'stale' });
      const stale = keys(p.root).every(k => k.getAttribute('aria-disabled') === 'true');
      const why = describedBy(key(p.root, 5));
      tap(key(p.root, 5));
      const after = reported(p, 'onPick').length;
      p.dispose();
      const detail = { sendingOff, whileSending, keepsNumber, back, notInteractive, stale, why, after };
      return { ok: sendingOff && whileSending === 0 && keepsNumber && back && notInteractive && stale && why === PANEL_WORDS.stale && after === 0, ...detail };
    });

    await check('status', async () => {
      const want = {
        queued: ['REGISTERED', 'amber', null, 'Your request is queued for Rescue|Nothing happens until then'],
        wrong: ['WRONG NUMBER', null, null, 'Your attempt is used'],
        treated: ['TREATED', 'amber', null, 'You were treated|Your attempt is used'],
        'no-effect': ['NO EFFECT', null, null, 'Your request had no effect|Your attempt is used'],
        discarded: ['DISCARDED', null, null, 'Your request was discarded|Your attempt is used'],
        spent: [null, null, 'lock', 'Your attempt is used'],
        unavailable: [null, null, 'panel', 'The panel is unavailable right now'],
      };
      const seen = {};
      for (const k of STATUS_STATES) {
        const p = phone(k);
        const n = p.root.querySelector('.ms-k-notice'), s = n?.querySelector('.ms-k-stamp'), icon = n?.querySelector('.ms-k-notice-icon');
        seen[k] = [s ? text(s) : null, s?.dataset.tone ?? null, icon ? icon.dataset.icon?.split(':')[0] ?? 'drawn' : null, [...(n?.querySelectorAll(':scope > p') ?? [])].map(text).join('|'), n?.getAttribute('role') ?? null];
        p.dispose();
      }
      const q = phone('queued');
      const first = q.root.querySelector('.ms-k-notice');
      q.part.update({ result: 'TREATED' });
      const replaced = q.root.querySelector('.ms-k-notice') !== first && q.root.querySelectorAll('.ms-k-notice').length === 1;
      q.part.update({ result: null });
      const none = q.root.querySelector('.ms-k-notice') === null && text(q.root) === '';
      q.dispose();
      const detail = { seen, replaced, none };
      return { ok: Object.entries(want).every(([k, [stamp, tone, icon, lines]]) => seen[k][0] === stamp && seen[k][1] === tone && seen[k][2] === icon && seen[k][3] === lines && seen[k][4] === 'status')
        && replaced && none && PANEL_RESULTS.length === 7, ...detail };
    });

    await check('words', async () => {
      const keypad = panelSheet({ step: 'keypad' }), picked = panelSheet({ step: 'keypad', picked: 3 }), sending = panelSheet({ step: 'keypad', picked: 3, phase: 'sending' }), status = panelSheet({ step: 'status' });
      const frame = s => [s.id, s.title, s.sub, s.close, s.detent];
      const errors = [() => panelSheet({ step: 'confirm' }), () => panelSheet({ picked: 0 }), () => panelSheet({ picked: 10 }), () => panelSheet({ phase: 'sending' }), () => panelSheet({ picked: 3, phase: 'sent' })].map(f => { try { f(); return null; } catch (e) { return e.message; } });
      const detail = { keypad, picked, sending, status, errors };
      return { ok: [keypad, picked, sending, status].every(s => JSON.stringify(frame(s)) === JSON.stringify(['hospital-panel', 'Hospital panel', 'Only on this phone', true, 'large']))
        && keypad.actions.length === 0 && status.actions.length === 0
        && JSON.stringify(picked.actions) === JSON.stringify([{ id: 'submit', label: 'Submit 3', kind: 'primary', icon: 'panel', busy: false }])
        && JSON.stringify(sending.actions) === JSON.stringify([{ id: 'submit', label: 'Submitting…', kind: 'primary', icon: 'panel', busy: true }])
        && errors.every(e => typeof e === 'string' && !/[0-9]/.test(e.replace(/1 to 9/, ''))), ...detail };
    });

    await check('footer', async () => {
      const p = phone('entered');
      const submit = () => p.frame.querySelector('.ms-ps-sheet-foot .ms-k-btn');
      const close = () => p.frame.querySelector('[data-intent="sheet-close"]');
      const live = { words: text(submit()), icon: !!submit().querySelector('svg') };
      tap(submit()); tap(close());
      const liveIntents = p.intents.map(i => `${i[0]}:${i[1]}`);
      p.intents.length = 0;
      p.shell.update({ status: 'stale', banner: { kind: 'reconnecting' } });
      p.part.update({ status: 'stale' });
      await frames();
      tap(submit()); tap(close());
      const staleIntents = p.intents.map(i => `${i[0]}:${i[1]}`);
      const reason = describedBy(submit());
      p.intents.length = 0;
      p.shell.update({ status: 'live', banner: null, sheet: panelSheet({ step: 'keypad', picked: 3, phase: 'sending' }) });
      p.part.update({ status: 'live', phase: 'sending' });
      await frames();
      const busy = submit().getAttribute('aria-busy') === 'true' && text(submit()) === 'Submitting…';
      tap(submit()); tap(close());
      const sendingIntents = p.intents.map(i => `${i[0]}:${i[1]}`);
      p.dispose();
      const detail = { live, liveIntents, staleIntents, reason, busy, sendingIntents };
      return { ok: live.words === 'Submit 3' && live.icon && liveIntents.join() === 'onSheetAction:submit,onSheetClose:hospital-panel'
        && staleIntents.join() === 'onSheetClose:hospital-panel' && typeof reason === 'string' && reason.length > 0
        && busy && sendingIntents.join() === 'onSheetClose:hospital-panel', ...detail };
    });

    await check('audience', async () => {
      const shared = phone('entered', { viewer: null });
      const a = text(shared.root) === '' && shared.root.querySelectorAll('.ms-hp-key').length === 0;
      shared.dispose();
      const sharedStatus = phone('queued', { viewer: null });
      const b = text(sharedStatus.root) === '' && !sharedStatus.root.querySelector('.ms-k-notice');
      sharedStatus.dispose();
      const handed = phone('entered');
      handed.part.update({ viewer: 'seat-8' });
      const c = text(handed.root) === '' && handed.root.querySelectorAll('.ms-hp-key').length === 0;
      handed.dispose();
      const handedStatus = phone('wrong');
      handedStatus.part.update({ viewer: 'seat-8' });
      const d = !handedStatus.root.querySelector('.ms-k-notice');
      handedStatus.dispose();
      return { ok: a && b && c && d, a, b, c, d };
    });

    await check('leaks', async () => {
      const logs = [];
      const original = {};
      for (const m of ['log', 'info', 'warn', 'error', 'debug']) { original[m] = console[m]; console[m] = (...args) => { logs.push(args.map(String).join(' ')); original[m](...args); }; }
      const layouts = [];
      try {
        const p = phone('enter', {}, '390x844', { onLayout: l => layouts.push(JSON.stringify(l)) });
        p.part.update({ picked: 'seat-3' });
        const three = attributes(p.root);
        p.part.update({ picked: 'seat-5' });
        const five = attributes(p.root);
        const changed = three.filter(([path, name, value]) => !five.some(([q, n, v]) => q === path && n === name && v === value)).map(([path, name, value]) => `${path} ${name}=${value}`);
        const secret = attributes(p.root).filter(([, , value]) => SECRET.test(value));
        p.part.update({ phase: 'sending' });
        p.part.update({ error: { text: 'The server did not accept it.', detail: 'Check it, then submit again.' }, phase: 'ready' });
        const callbacks = p.intents.filter(i => i[0] !== 'onPick' && i[0] !== 'onSheetAction' && i[0] !== 'onSheetClose');
        p.dispose();
        const s = phone('treated');
        const statusSecret = attributes(s.root).filter(([, , value]) => SECRET.test(value));
        s.dispose();
        let pickError = null;
        try { checkPanelKeypad({ viewer: 'seat-4', keys: keysFor(8), picked: 'seat-9' }); } catch (e) { pickError = e.message; }
        const detail = { changed, secret, statusSecret, callbacks, layouts: layouts.filter(l => /\bseat-|"picked"|Submit/.test(l)), logs, pickError };
        return { ok: changed.length === 2 && changed.every(c => / aria-pressed=(?:true|false)$/.test(c)) && secret.length === 0 && statusSecret.length === 0 && callbacks.length === 0
          && detail.layouts.length === 0 && logs.length === 0 && typeof pickError === 'string' && !/9/.test(pickError), ...detail };
      } finally {
        for (const m of Object.keys(original)) console[m] = original[m];
      }
    });

    await check('inputs', async () => {
      const base = { viewer: 'seat-4', versions, keys: keysFor(9) };
      const bad = [
        { ...base, colour: 'red' },
        { ...base, keys: [{ seat: 'seat-1', number: 1 }, { seat: 'seat-2', number: 1 }] },
        { ...base, keys: [{ seat: 'seat-1', number: 1 }, { seat: 'seat-1', number: 2 }] },
        { ...base, keys: [{ seat: 'seat-1', number: 0 }] },
        { ...base, keys: [{ seat: 'seat-1', number: 10 }] },
        { ...base, keys: [...keysFor(9), { seat: 'seat-9', number: 9 }] },
        { ...base, keys: keysFor(7), picked: 'seat-8' },
        { ...base, picked: 'Gus' },
        { ...base, phase: 'sending' },
        { ...base, picked: 'seat-3', phase: 'sent' },
        { ...base, error: { detail: 'only a detail' } },
        { ...base, status: 'gone' },
      ].map(input => { try { checkPanelKeypad(input); return null; } catch (e) { return e.message; } });
      const badStatus = [{ viewer: 'seat-4', result: 'HEALED' }, { viewer: 'seat-4', result: 'queued' }, { viewer: 'seat-4', note: 'x' }]
        .map(input => { try { checkPanelStatus(input); return null; } catch (e) { return e.message; } });
      const good = checkPanelKeypad({ ...base, picked: 3, phase: 'sending' });
      const again = checkPanelKeypad(good);
      const goodStatus = checkPanelStatus({ viewer: 'seat-4', result: 'DISCARDED' });
      const detail = { bad, badStatus, good, again, goodStatus };
      return { ok: bad.every(e => typeof e === 'string') && badStatus.every(e => typeof e === 'string') && JSON.stringify(good) === JSON.stringify(again)
        && good.picked === 'seat-3' && JSON.stringify(checkPanelStatus(goodStatus)) === JSON.stringify(goodStatus), ...detail };
    });

    await check('private', async () => {
      const p = phone('rejected');
      const before = { display: display(p.root), error: text(p.root.querySelector('.ms-k-error')) };
      p.part.update({ status: 'concealed' });
      const concealed = { text: text(p.root), keys: keys(p.root).length, hidden: p.root.getAttribute('aria-hidden') };
      p.part.update({ status: 'live' });
      const shownAgain = { text: text(p.root), keys: keys(p.root).length };
      p.part.update({ keys: keysFor(9) });
      const given = { display: display(p.root), pressed: pressed(p.root), error: p.root.querySelector('.ms-k-error') };
      p.dispose();
      const s = phone('treated');
      s.part.update({ status: 'concealed' });
      const statusConcealed = !s.root.querySelector('.ms-k-notice') && text(s.root) === '';
      s.part.update({ status: 'live' });
      const statusBack = !s.root.querySelector('.ms-k-notice');
      s.dispose();
      const v = phone('entered');
      v.part.update({ viewer: 'seat-8', keys: keysFor(9) });
      const newViewer = { display: display(v.root), pressed: pressed(v.root) };
      v.dispose();
      const detail = { before, concealed, shownAgain, given, statusConcealed, statusBack, newViewer };
      return { ok: before.display === '3' && before.error.length > 0 && concealed.text === '' && concealed.keys === 0 && concealed.hidden === 'true'
        && shownAgain.text === '' && shownAgain.keys === 0 && given.display === '_' && given.pressed.length === 0 && given.error === null
        && statusConcealed && statusBack && newViewer.display === '_' && newViewer.pressed.length === 0, ...detail };
    });

    await check('focus', async () => {
      const p = phone('entered');
      key(p.root, 3).focus();
      p.part.update({ keys: [], picked: null });
      await microtasks();
      const onRoot = document.activeElement === p.root;
      const told = reported(p, 'onFocusReturn');
      p.dispose();
      return { ok: onRoot && told.length === 1 && told[0]?.intent === 'key' && told[0]?.value === '3', onRoot, told };
    });

    await check('text', async () => {
      const measure = (key, sizeKey, percent) => {
        document.documentElement.style.fontSize = `${percent}%`;
        const p = phone(key, {}, sizeKey);
        const ks = keys(p.root);
        const top0 = Math.round(ks[0].getBoundingClientRect().top);
        const perRow = ks.filter(k => Math.round(k.getBoundingClientRect().top) === top0).length;
        const smallest = Math.min(...ks.map(k => Math.min(k.getBoundingClientRect().width, k.getBoundingClientRect().height)));
        const d = p.root.querySelector('.ms-hp-display');
        const grew = d.getBoundingClientRect().height >= d.scrollHeight - 0.5;
        const whole = [...p.root.querySelectorAll('.ms-k-group-note, .ms-hp-key, .ms-hp-display')].every(n => n.scrollWidth <= n.clientWidth + 1);
        const out = { perRow, smallest: Math.round(smallest), displayHeight: Math.round(d.getBoundingClientRect().height), grew, whole };
        p.dispose();
        return out;
      };
      const largest = measure('entered', '320x568', 200), large = measure('entered', '390x844', 150), standard = measure('entered', '390x844', 100);
      document.documentElement.style.fontSize = '200%';
      const s = phone('queued', {}, '320x568');
      const lines = [...s.root.querySelectorAll('.ms-k-notice > p, .ms-k-stamp')].every(n => n.scrollWidth <= n.clientWidth + 1);
      s.dispose();
      document.documentElement.style.fontSize = '';
      const detail = { largest, large, standard, lines };
      return { ok: [largest, large, standard].every(m => m.perRow === 3 && m.smallest >= 44 && m.grew && m.whole) && standard.displayHeight === 74
        && largest.displayHeight > standard.displayHeight && lines, ...detail };
    });

    await check('dispose', async () => {
      const p = phone('entered');
      const root = p.root;
      p.part.dispose();
      const gone = !root.isConnected;
      tap(key(root, 4) ?? root);
      p.part.update({ picked: 'seat-4' });
      const quiet = reported(p, 'onPick').length === 0;
      p.part.dispose();
      p.shell.dispose();
      p.frame.remove();
      const s = phone('wrong');
      const sroot = s.root;
      s.part.dispose();
      s.part.update({ result: 'QUEUED' });
      const sGone = !sroot.isConnected && !text(sroot).includes('REGISTERED');
      s.shell.dispose();
      s.frame.remove();
      return { ok: gone && quiet && sGone, gone, quiet, sGone };
    });
  }

  await check('motion', async () => {
    const stampAnimations = (extra = {}) => {
      const out = {};
      for (const k of ['queued', 'wrong', 'treated', 'no-effect', 'discarded']) {
        const p = phone(k, extra);
        out[k] = p.root.getAnimations({ subtree: true }).map(a => [a.animationName ?? null, a.effect?.getTiming?.().duration ?? null, a.effect?.target?.classList?.contains('ms-k-stamp') ?? false]);
        p.dispose();
      }
      return out;
    };
    const still = (extra = {}) => ['spent', 'unavailable', 'enter', 'entered', 'sending'].map(k => { const p = phone(k, extra); const n = p.root.getAnimations({ subtree: true }).length; p.dispose(); return n; });
    if (deviceReduced) {
      const stamps = stampAnimations(), others = still();
      return { ok: Object.values(stamps).every(a => a.length === 0) && others.every(n => n === 0), mode, stamps, others };
    }
    const stamps = stampAnimations(), reduced = stampAnimations({ reducedMotion: true }), others = still();
    const detail = { mode, stamps, reduced, others };
    return { ok: Object.values(stamps).every(a => a.length === 1 && a[0][0] === 'ms-hp-stamp-in' && a[0][1] === 120 && a[0][2]) && Object.values(reduced).every(a => a.length === 0)
      && others.every(n => n === 0), ...detail };
  });

  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

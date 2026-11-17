// mothership:dev-only
//
// Join and waiting's lifecycle probe: it drives the real components (../join-form.mjs, ../join-wait.mjs) in the
// browser, under whatever headers serve the page (design/tools/join-room-check.mjs serves the production ones),
// and reports what it saw. Each check is one behaviour Frontend relies on:
//   form      the pack's words; the six boxes hidden from screen readers, one labelled text box over them;
//             Back, a device and Ask report their taps; the chosen device reports nothing
//   typing    each keystroke reports what the box holds; Frontend's value replaces it, the caret at its end;
//             Return asks when Ask is available, and not when it is refused
//   ring      the next empty box is ringed amber while the code has the focus, and only then
//   errors    the code's under the boxes, the name's under the field, the general one over the foot; each box
//             says it is invalid and which note describes it; each leaves when Frontend clears it
//   ask       refused with Frontend's reason; busy reads "Sending…" and is refused
//   views     waiting, admitted, started without you and declined: the words, the nav bar's label and intent
//             each, and each tap reported; the nav bar keeps its element and the focus through a change of view;
//             a focused Check again that leaves returns the focus to the screen, and onFocusReturn says which
//   offline   the words over the form's foot or under the waiting line; with every control enabled they
//             refuse nothing; Frontend's refusals refuse with the reason; Back and Cancel stay usable
//   refused   not interactive: every control refused, nothing dimmed, the boxes read-only, typing unreported
//   insets    Frontend's safe areas, or the browser's
//   text      with the Largest text the form scrolls, and both screens' feet are reached; the device choice
//             stacks there, and not at the Standard text
//   input     malformed input is refused
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    only the spinners turn; with Reduce motion (the game's or the device's) they stand still
// With the device's Reduce motion emulated, only the motion check runs.

import { mountJoinForm, nextJoinFormInput, JOIN_FORM_DEFAULTS, JOIN_WORDS } from '../join-form.mjs';
import { mountJoinWait, nextJoinWaitInput, JOIN_WAIT_DEFAULTS, WAIT_WORDS } from '../join-wait.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runJoinRoomProbe({ sizes, formOf, waitOf }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const size = sizes['390x844'];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  document.body.append(frame);
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const recorder = () => { const calls = []; const record = name => (...args) => calls.push([name, ...args]); return { calls, record }; };
  const mountForm = input => {
    const { calls, record } = recorder();
    const s = mountJoinForm(frame, { insets: size.insets, ...input }, Object.fromEntries(['onBack', 'onCode', 'onName', 'onDevice', 'onAsk', 'onLayout', 'onFocusReturn'].map(n => [n, record(n)])));
    const q = sel => s.element.querySelector(sel);
    return { s, calls, root: s.element, q, qa: sel => [...s.element.querySelectorAll(sel)], code: q('.ms-jf-code-input'), name: q('.ms-k-input-text'), ask: q('.ms-jf-ask') };
  };
  const mountWait = input => {
    const { calls, record } = recorder();
    const s = mountJoinWait(frame, { insets: size.insets, ...input }, Object.fromEntries(['onCancel', 'onCheck', 'onLeave', 'onBack', 'onLayout', 'onFocusReturn'].map(n => [n, record(n)])));
    const q = sel => s.element.querySelector(sel);
    return { s, calls, root: s.element, q, qa: sel => [...s.element.querySelectorAll(sel)] };
  };
  const taps = calls => calls.filter(c => !['onLayout', 'onFocusReturn'].includes(c[0]));
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const type = (box, value) => { box.value = value; box.dispatchEvent(new InputEvent('input', { bubbles: true })); };
  const enter = box => box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const words = node => node?.innerText.replace(/\s+/g, ' ').trim() ?? null;
  const ringAt = m => m.qa('.ms-k-code-box').findIndex(b => b.hasAttribute('data-focus'));

  if (mode === 'full') {
    await check('form: the pack’s words; the six boxes hidden from screen readers under one labelled text box; Back, a device and Ask report their taps; the chosen device reports nothing', async () => {
      const m = mountForm(formOf());
      const label = m.q(`label[for="${m.code.id}"]`);
      const seen = {
        title: m.q('.ms-ep-nav-title').textContent, back: m.q('.ms-ep-back .ms-k-btn-label').textContent, heading: m.q('.ms-ep-large-title').textContent,
        codeLabel: label?.textContent ?? null, boxesHidden: m.q('.ms-k-code').getAttribute('aria-hidden'), boxes: m.qa('.ms-k-code-box').map(b => b.textContent).join(''),
        codeBox: { maxlength: m.code.getAttribute('maxlength'), autocapitalize: m.code.getAttribute('autocapitalize'), autocomplete: m.code.getAttribute('autocomplete'), value: m.code.value },
        name: { label: words(m.q('label.ms-k-field:not(.ms-jf-code-field) .ms-k-field-label')), value: m.name.value, count: m.q('.ms-k-input-count').textContent, autocomplete: m.name.getAttribute('autocomplete') },
        device: { label: m.q('.ms-k-group-label').textContent, options: m.qa('.ms-k-seg-btn').map(words), checked: m.qa('.ms-k-seg-btn').map(b => b.getAttribute('aria-checked')), stack: m.q('.ms-k-seg').hasAttribute('data-stack') },
        ask: words(m.ask),
      };
      tap(m.q('.ms-ep-back')); tap(m.q('.ms-k-seg-btn[data-value="player"]')); tap(m.q('.ms-k-seg-btn[data-value="display"]')); tap(m.ask); tap(m.q('.ms-ep-large-title'));
      seen.taps = taps(m.calls);
      m.s.dispose();
      return { ok: seen.title === 'Join' && seen.back === 'Menu' && seen.heading === 'Join a room' && seen.codeLabel === 'Room code' && seen.boxesHidden === 'true' && seen.boxes === 'K7Q2XM'
        && seen.codeBox.maxlength === '6' && seen.codeBox.autocapitalize === 'characters' && seen.codeBox.autocomplete === 'off' && seen.codeBox.value === 'K7Q2XM'
        && seen.name.label === 'Your name' && seen.name.value === 'Dev' && seen.name.count === '3/12' && seen.name.autocomplete === 'nickname'
        && seen.device.label === 'This device' && JSON.stringify(seen.device.options) === '["Player phone","Shared display"]' && JSON.stringify(seen.device.checked) === '["true","false"]' && seen.device.stack
        && seen.ask === 'Ask to join' && JSON.stringify(seen.taps) === '[["onBack"],["onDevice","display"],["onAsk"]]', seen };
    });

    await check('typing: each keystroke reports what the box holds; Frontend’s value replaces it, the caret at its end; Return asks when Ask is available, and not when it is refused', async () => {
      const m = mountForm(formOf({ code: '', name: '' }));
      m.code.focus();
      type(m.code, 'k7q');
      m.s.update({ code: 'K7Q' });
      const given = { value: m.code.value, caret: [m.code.selectionStart, m.code.selectionEnd], boxes: m.qa('.ms-k-code-box').map(b => b.textContent).join('') };
      type(m.name, 'Dev');
      m.s.update({ name: 'Dev', nameCount: 3 });
      enter(m.name);
      const refusedAsk = refused(m.ask);
      m.s.update({ code: 'K7Q2XM', ask: { enabled: true } });
      enter(m.code);
      const seen = { given, refusedAsk, reports: taps(m.calls), count: m.q('.ms-k-input-count').textContent };
      m.s.dispose();
      return { ok: given.value === 'K7Q' && JSON.stringify(given.caret) === '[3,3]' && given.boxes === 'K7Q' && refusedAsk && seen.count === '3/12'
        && JSON.stringify(seen.reports) === '[["onCode","k7q"],["onName","Dev"],["onAsk"]]', seen };
    });

    await check('ring: the next empty box is ringed amber while the code has the focus, and only then', async () => {
      const m = mountForm(formOf({ code: 'K7', name: '' }));
      const before = ringAt(m);
      m.s.focus('code');
      const focused = ringAt(m), amber = getComputedStyle(m.qa('.ms-k-code-box')[2]).boxShadow;
      m.s.focus('name');
      await new Promise(done => setTimeout(done, 20));
      const away = ringAt(m);
      m.s.focus('code');
      m.s.update({ code: 'K7Q2XM' });
      const full = ringAt(m);
      m.s.dispose();
      const seen = { before, focused, amber, away, full };
      return { ok: before === -1 && focused === 2 && amber.includes('241, 184, 75') && away === -1 && full === -1, seen };
    });

    await check('errors: the code’s under the boxes, the name’s under the field, the general one over the foot; each box says it is invalid and which note describes it; each leaves when Frontend clears it', async () => {
      const m = mountForm(formOf({ codeError: JOIN_WORDS.noRoom, name: 'Devendra Kumar', nameError: JOIN_WORDS.nameRule(12), error: JOIN_WORDS.busy }));
      const notes = m.qa('.ms-k-error');
      const seen = {
        words: notes.map(n => n.querySelector('.ms-k-error-text').textContent),
        codeNote: m.q('.ms-jf-code').nextElementSibling === notes[0] && m.q('.ms-jf-code-field').contains(notes[0]), nameNote: m.q('label.ms-k-field:not(.ms-jf-code-field)').nextElementSibling === notes[1],
        generalNote: m.q('.ms-k-seg').nextElementSibling === notes[2],
        invalid: [m.q('.ms-k-code').hasAttribute('data-invalid'), m.code.getAttribute('aria-invalid'), m.q('.ms-k-input').hasAttribute('data-invalid'), m.name.getAttribute('aria-invalid')],
        described: [describedBy(m.code), describedBy(m.name)], count: m.q('.ms-k-input-count').textContent,
      };
      m.s.update({ codeError: null, nameError: null, error: null, name: 'Dev', nameCount: 3 });
      seen.after = { notes: m.qa('.ms-k-error').length, invalid: [m.q('.ms-k-code').hasAttribute('data-invalid'), m.code.getAttribute('aria-invalid'), m.name.getAttribute('aria-invalid')], described: [m.code.getAttribute('aria-describedby'), m.name.getAttribute('aria-describedby')] };
      m.s.dispose();
      return { ok: JSON.stringify(seen.words) === JSON.stringify([JOIN_WORDS.noRoom, 'Use 1–12 characters.', JOIN_WORDS.busy]) && seen.codeNote && seen.nameNote && seen.generalNote
        && JSON.stringify(seen.invalid) === '[true,"true",true,"true"]' && seen.described[0] === JOIN_WORDS.noRoom && seen.described[1] === 'Use 1–12 characters.' && seen.count === '14/12'
        && seen.after.notes === 0 && JSON.stringify(seen.after.invalid) === '[false,null,null]' && JSON.stringify(seen.after.described) === '[null,null]', seen };
    });

    await check('ask: refused with Frontend’s reason, and dimmed; busy reads “Sending…”, is refused and shows the spinner', async () => {
      const m = mountForm(formOf({ code: 'K7', name: '', ask: { enabled: false, reason: 'Enter the room code' } }));
      const off = { refused: refused(m.ask), why: describedBy(m.ask), look: getComputedStyle(m.ask).opacity };
      tap(m.ask);
      m.s.update(formOf({ ask: { enabled: true, busy: true } }));
      const busy = { busy: m.ask.getAttribute('aria-busy'), label: m.ask.querySelector('.ms-k-btn-label')?.textContent, spinner: getComputedStyle(m.ask, '::after').animationName };
      tap(m.ask);
      const seen = { off, busy, taps: taps(m.calls).length };
      m.s.dispose();
      return { ok: off.refused && off.why === 'Enter the room code' && off.look === '0.4' && busy.busy === 'true' && busy.label === 'Sending…' && seen.taps === 0, seen };
    });

    await check('views: waiting, admitted, started without you and declined, each with its words and its nav bar; each tap reported; the nav bar keeps its element and the focus; a focused Check again that leaves returns the focus to the screen', async () => {
      const m = mountWait(waitOf());
      const back = m.q('.ms-ep-back');
      const pending = { nav: [m.q('.ms-ep-nav-title').textContent, words(back), back.dataset.intent], title: words(m.q('.ms-k-wait-title')), line: words(m.q('.ms-k-wait-line')), check: words(m.q('.ms-jw-check')), tile: m.q('.ms-k-wait-tile svg') !== null };
      tap(m.q('.ms-jw-check')); tap(back);
      m.q('.ms-jw-check').focus();
      m.s.update(waitOf({ view: 'admitted' }));
      await Promise.resolve();
      const admitted = { nav: [m.q('.ms-ep-nav-title').textContent, words(m.q('.ms-ep-back')), m.q('.ms-ep-back').dataset.intent], same: m.q('.ms-ep-back') === back, focus: document.activeElement === m.root,
        badge: words(m.q('.ms-ep-seat-badge')), line: words(m.q('.ms-k-wait-line')), players: m.q('.ms-k-group-label').textContent, rows: m.qa('.ms-k-row').map(words), foot: words(m.q('.ms-ep-foot .ms-k-group-note')), spinner: m.q('.ms-ep-foot .ms-k-spinner') !== null };
      tap(m.q('.ms-ep-back'));
      back.focus();
      m.s.update(waitOf({ view: 'closed' }));
      const closed = { nav: [m.q('.ms-ep-nav-title').textContent, words(m.q('.ms-ep-back'))], focusKept: document.activeElement === back, title: words(m.q('.ms-k-wait-title')), line: words(m.q('.ms-k-wait-line')), button: words(m.q('.ms-jw-back')) };
      tap(m.q('.ms-jw-back')); tap(m.q('.ms-ep-back'));
      m.s.update(waitOf({ view: 'declined' }));
      const declined = { title: words(m.q('.ms-k-wait-title')), line: words(m.q('.ms-k-wait-line')), button: words(m.q('.ms-jw-back')) };
      const seen = { pending, admitted, closed, declined, taps: taps(m.calls), returned: m.calls.filter(c => c[0] === 'onFocusReturn').map(c => c[1]) };
      m.s.dispose();
      return { ok: JSON.stringify(pending.nav) === '["Join","Cancel","cancel"]' && pending.title === 'Waiting for the host' && pending.line === 'Room K7Q2XM · as Dev' && pending.check === 'Check again' && pending.tile
        && JSON.stringify(admitted.nav) === '["Lobby","Leave","leave"]' && admitted.same && admitted.focus && admitted.badge === '4 You’re in · Seat 4' && admitted.line === 'Room K7Q2XM · waiting for the host'
        && admitted.players === 'Players · 5 of 9' && JSON.stringify(admitted.rows) === JSON.stringify(['1 Ava', '2 Ben', '3 Cleo', '4 Dev (you)', '5 Eli']) && admitted.foot === WAIT_WORDS.starts && admitted.spinner
        && JSON.stringify(closed.nav) === '["Join","Menu"]' && closed.focusKept && closed.title === 'This room started without you' && closed.line === 'Room K7Q2XM' && closed.button === 'Back to menu'
        && declined.title === 'The host didn’t admit you' && declined.line === 'Room K7Q2XM' && declined.button === 'Back to menu'
        && JSON.stringify(seen.taps) === '[["onCheck"],["onCancel"],["onLeave"],["onBack"],["onBack"]]' && JSON.stringify(seen.returned) === '[{"intent":"check","value":null}]', seen };
    });

    await check('the game\u2019s gap: Cancel, Leave and Back to menu unavailable are dimmed and refused, with Frontend\u2019s reason, and report nothing (G6)', async () => {
      const off = { enabled: false, reason: 'Not available in this test' }, all = { cancel: off, leave: off, back: off };
      const seen = {};
      for (const view of ['pending', 'admitted', 'declined']) {
        const m = mountWait({ ...waitOf({ view }), ...all });
        const nav = m.q('.ms-ep-back'), foot = m.q('.ms-jw-back');
        tap(nav); if (foot) tap(foot);
        seen[view] = { nav: words(nav), refused: refused(nav), dimmed: nav.hasAttribute('data-off'), reason: describedBy(nav),
          foot: foot ? { refused: refused(foot), dimmed: foot.hasAttribute('data-off'), reason: describedBy(foot) } : null, taps: taps(m.calls) };
        m.s.update({ cancel: { enabled: true }, leave: { enabled: true }, back: { enabled: true } });
        tap(m.q('.ms-ep-back'));
        seen[view].after = taps(m.calls);
        m.s.dispose();
      }
      const off3 = v => seen[v].refused && seen[v].dimmed && seen[v].reason === 'Not available in this test' && seen[v].taps.length === 0;
      return { ok: off3('pending') && off3('admitted') && off3('declined') && seen.pending.nav === 'Cancel' && seen.admitted.nav === 'Leave' && seen.declined.nav === 'Menu'
        && seen.declined.foot?.refused && seen.declined.foot.dimmed && seen.declined.foot.reason === 'Not available in this test'
        && JSON.stringify(seen.pending.after) === '[["onCancel"]]' && JSON.stringify(seen.admitted.after) === '[["onLeave"]]' && JSON.stringify(seen.declined.after) === '[["onBack"]]', seen };
    });

    await check('offline: the words over the form’s foot or under the waiting line; with every control enabled they refuse nothing; Frontend’s refusals refuse with the reason; Back and Cancel stay usable', async () => {
      const f = mountForm(formOf({ error: JOIN_WORDS.offline }));
      const alone = { words: words(f.q('.ms-k-error')), refused: [f.ask, ...f.qa('.ms-k-seg-btn')].map(refused) };
      f.s.update({ ask: { enabled: false, reason: JOIN_WORDS.offline } });
      tap(f.ask); tap(f.q('.ms-ep-back'));
      const given = { refused: refused(f.ask), why: describedBy(f.ask), taps: taps(f.calls) };
      f.s.dispose();
      const w = mountWait(waitOf({ error: WAIT_WORDS.offline }));
      const note = w.q('.ms-k-error');
      const waiting = { words: words(note), underLine: w.q('.ms-k-wait-line').nextElementSibling === note, beforeCheck: note.nextElementSibling === w.q('.ms-jw-check'), refused: refused(w.q('.ms-jw-check')) };
      w.s.update({ check: { enabled: false, reason: WAIT_WORDS.offline } });
      tap(w.q('.ms-jw-check')); tap(w.q('.ms-ep-back'));
      waiting.given = { refused: refused(w.q('.ms-jw-check')), why: describedBy(w.q('.ms-jw-check')), taps: taps(w.calls) };
      w.s.update({ error: null });
      waiting.gone = !w.q('.ms-k-error');
      w.s.dispose();
      const seen = { alone, given, waiting };
      return { ok: alone.words === JOIN_WORDS.offline && alone.refused.every(v => !v) && given.refused && given.why === JOIN_WORDS.offline && JSON.stringify(given.taps) === '[["onBack"]]'
        && waiting.words === WAIT_WORDS.offline && waiting.underLine && waiting.beforeCheck && !waiting.refused && waiting.given.refused && waiting.given.why === WAIT_WORDS.offline
        && JSON.stringify(waiting.given.taps) === '[["onCancel"]]' && waiting.gone, seen };
    });

    await check('not interactive: every control refused, nothing dimmed, the boxes read-only, typing unreported', async () => {
      const f = mountForm({ ...formOf(), interactive: false });
      const buttons = f.qa('button');
      for (const b of buttons) tap(b);
      type(f.code, 'X'); type(f.name, 'X'); enter(f.name);
      const form = { refused: buttons.map(refused), dimmed: buttons.filter(b => b.hasAttribute('data-off')).length, readOnly: [f.code.readOnly, f.name.readOnly], taps: taps(f.calls).length };
      f.s.dispose();
      const w = mountWait({ ...waitOf(), interactive: false });
      const wb = w.qa('button');
      for (const b of wb) tap(b);
      const wait = { refused: wb.map(refused), dimmed: wb.filter(b => b.hasAttribute('data-off')).length, taps: taps(w.calls).length };
      w.s.dispose();
      const seen = { form, wait };
      return { ok: form.refused.every(Boolean) && form.dimmed === 0 && form.readOnly.every(Boolean) && form.taps === 0 && wait.refused.every(Boolean) && wait.dimmed === 0 && wait.taps === 0, seen };
    });

    await check('insets: Frontend’s safe areas place the screen 8 px under the top one and 16 px over the bottom one; null gives the browser’s', async () => {
      const f = mountForm(formOf());
      const given = f.s.layout().safe;
      f.s.update({ insets: null });
      const browser = f.s.layout().safe;
      f.s.dispose();
      const w = mountWait({ ...waitOf(), insets: { top: 20, bottom: 10 } });
      const other = w.s.layout().safe;
      w.s.dispose();
      const seen = { given, browser, other };
      return { ok: given.top === 47 && given.bottom === 34 && browser.top === 0 && browser.bottom === 0 && other.top === 20 && other.bottom === 10, seen };
    });

    await check('text: with the Largest text (200 %) the form scrolls, and both screens’ feet are reached; the device choice stacks there, and not at the Standard text', async () => {
      const seg = m => { const [a, b] = m.qa('.ms-k-seg-btn'); return b.getBoundingClientRect().top >= a.getBoundingClientRect().bottom - 0.05; };
      const f0 = mountForm(formOf());
      await frames();
      const standard = seg(f0);
      f0.s.dispose();
      document.documentElement.style.fontSize = '200%';
      const f = mountForm(formOf({ codeError: JOIN_WORDS.noRoom }));
      await frames();
      const fs = f.q('.ms-ep-screen'), form = { stacked: seg(f), scrolls: fs.scrollHeight > fs.clientHeight };
      fs.scrollTop = fs.scrollHeight;
      await frames();
      const ab = f.ask.getBoundingClientRect(), fb = f.root.getBoundingClientRect();
      form.footInView = ab.bottom <= fb.bottom - 34 && ab.top >= fb.top;
      f.s.dispose();
      const w = mountWait(waitOf({ view: 'admitted' }));
      await frames();
      const ws = w.q('.ms-ep-screen'), wait = { scrolls: ws.scrollHeight > ws.clientHeight };
      ws.scrollTop = ws.scrollHeight;
      await frames();
      const nb = w.q('.ms-ep-foot .ms-k-group-note').getBoundingClientRect(), wb = w.root.getBoundingClientRect();
      wait.footInView = nb.bottom <= wb.bottom - 34 && nb.top >= wb.top;
      w.s.dispose();
      document.documentElement.style.fontSize = '';
      const seen = { standard, form, wait };
      // The lobby of five fits the 390 × 844 screen even then; whether it scrolls or not, its foot is in view.
      return { ok: !standard && form.stacked && form.scrolls && form.footInView && wait.footInView, seen };
    });

    await check('input: malformed input is refused', async () => {
      const formBad = [{ code: 'K7Q2XMZ' }, { code: 7 }, { name: null }, { nameCount: -1 }, { nameMax: 0 }, { device: 'tablet' }, { codeError: 3 }, { ask: null }, { insets: { top: '47px' } }];
      const waitBad = [{ view: 'waiting' }, { roomCode: '' }, { seat: 0 }, { members: [{ seat: 1 }] }, { members: [{ seat: 1, name: 'A' }, { seat: 1, name: 'B' }] }, { seats: { filled: 1, total: 0 } }, { check: null }, { error: 3 }, { view: 'admitted' }];
      const refusedAll = [...formBad.map(i => { try { nextJoinFormInput(JOIN_FORM_DEFAULTS, i); return false; } catch { return true; } }),
        ...waitBad.map(i => { try { nextJoinWaitInput(JOIN_WAIT_DEFAULTS, i); return false; } catch { return true; } })];
      return { ok: refusedAll.every(Boolean), seen: refusedAll };
    });

    await check('dispose: safe twice; afterwards nothing fires, layout() is null and nothing is left', async () => {
      const f = mountForm(formOf());
      const { code, ask } = f;
      f.s.dispose(); f.s.dispose();
      type(code, 'X'); tap(ask); f.s.update({ code: 'AB' });
      const w = mountWait(waitOf());
      const check = w.q('.ms-jw-check');
      w.s.dispose(); w.s.dispose();
      tap(check); w.s.update({ view: 'closed' });
      const seen = { left: frame.childElementCount, layouts: [f.s.layout(), w.s.layout()], taps: taps(f.calls).length + taps(w.calls).length };
      return { ok: seen.left === 0 && seen.layouts.every(l => l === null) && seen.taps === 0, seen };
    });
  }

  await check(`motion: only the spinners turn${mode === 'device-reduced' ? '; with the device’s Reduce motion they stand still' : ', and with the game’s Reduce motion they stand still'}`, async () => {
    const turning = root => root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName ?? a.constructor.name);
    const f = mountForm({ ...formOf({ ask: { enabled: true, busy: true } }), reducedMotion: false });
    await frames();
    const formFull = turning(f.root);
    f.s.update({ reducedMotion: true });
    await frames();
    const formReduced = turning(f.root);
    f.s.dispose();
    const w = mountWait(waitOf({ view: 'admitted' }));
    await frames();
    const waitFull = turning(w.root);
    w.s.dispose();
    const seen = { formFull, formReduced, waitFull };
    const onlySpinners = list => list.every(n => /spin/.test(n));
    if (mode === 'device-reduced') return { ok: formFull.length === 0 && waitFull.length === 0, seen };
    return { ok: formFull.length > 0 && onlySpinners(formFull) && formReduced.length === 0 && waitFull.length === 1 && onlySpinners(waitFull), seen };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

// mothership:dev-only
//
// Recover's lifecycle probe: it drives the real component (../recover.mjs) in the browser, under whatever headers
// serve the page (design/tools/recover-check.mjs serves the production ones), and reports what it saw. Each check
// is one behaviour Frontend relies on:
//   form      the pack's words and note; the Match ID's mono box; the code's box a secret field (a password box,
//             no autocomplete, autocapitalize or spellcheck); the hint from Frontend's length, none without it
//   secret    the code stays in its box: each keystroke reports only its length; onRecover hands it over once,
//             with the Match ID; no other report, no attribute and no layout carries it; Frontend can't give it
//             back; it leaves the box once recovered, at clearCode() and on dispose
//   typing    the Match ID's keystrokes report what the box holds; Frontend's value replaces it; Return recovers
//             when Recover seat is available, and not when it is refused
//   refused   the words under the code's box, which is ringed in paper and described by them; gone when cleared
//   recover   refused with Frontend's reason; busy reads "Checking…" and is refused
//   recovered the check, "Seat 4 is yours again", the line and Continue; a focused Recover seat that leaves
//             returns the focus to the screen, and onFocusReturn says which
//   offline   the words over the foot refuse nothing; Frontend's refusal refuses with the reason; Back stays usable
//   refused   not interactive: every control refused, nothing dimmed, the boxes read-only, typing unreported
//   insets    Frontend's safe areas, or the browser's
//   text      with the Largest text the screen scrolls and its foot is reached
//   text later  mounted at the Standard text, then the Largest and a part opened: laid out as one mounted at
//             the Largest (the kit's followTextSize, 0.8.1)
//   input     malformed input is refused
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    only the spinner turns; with Reduce motion (the game's or the device's) it stands still
// With the device's Reduce motion emulated, only the motion check runs.

import { mountRecover, nextRecoverInput, RECOVER_DEFAULTS, RECOVER_WORDS } from '../recover.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runRecoverProbe({ sizes, typeCode, MATCH_ID, CODE_LENGTH }) {
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
  const mount = input => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const s = mountRecover(frame, { insets: size.insets, matchId: MATCH_ID, codeLength: CODE_LENGTH, ...input }, Object.fromEntries(['onBack', 'onMatchId', 'onCode', 'onRecover', 'onContinue', 'onLayout', 'onFocusReturn'].map(n => [n, record(n)])));
    const q = sel => s.element.querySelector(sel);
    const boxes = [...s.element.querySelectorAll('.ms-k-input-text')];
    return { s, calls, root: s.element, q, qa: sel => [...s.element.querySelectorAll(sel)], id: boxes[0], code: boxes[1], action: () => q('.ms-ep-foot .ms-k-btn') };
  };
  const taps = calls => calls.filter(c => !['onLayout', 'onFocusReturn'].includes(c[0]));
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const type = (box, value) => { box.value = value; box.dispatchEvent(new InputEvent('input', { bubbles: true })); };
  const enter = box => box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const words = node => node?.innerText.replace(/\s+/g, ' ').trim() ?? null;
  // A code no other part of the page could contain by chance.
  const SECRET = 'Zq7RKm2VwXy9Lp4TbN8cHs3DfGj5MaE6';

  if (mode === 'full') {
    await check('form: the pack’s words and note; the Match ID’s mono box; the code’s box a secret field; the hint from Frontend’s length, none without it; Back reports its tap', async () => {
      const m = mount({});
      const seen = {
        title: m.q('.ms-ep-nav-title').textContent, back: m.q('.ms-ep-back .ms-k-btn-label').textContent, heading: m.q('.ms-ep-large-title').textContent,
        labels: m.qa('.ms-k-field-label').map(n => n.textContent), note: m.q('.ms-k-group-note').textContent,
        id: { mono: m.q('.ms-k-input').hasAttribute('data-mono'), placeholder: m.id.placeholder, value: m.id.value },
        code: { type: m.code.type, autocomplete: m.code.getAttribute('autocomplete'), autocapitalize: m.code.getAttribute('autocapitalize'), spellcheck: m.code.getAttribute('spellcheck'), placeholder: m.code.placeholder },
        action: words(m.action()), key: !!m.action().querySelector('svg'),
      };
      m.s.update({ codeLength: null });
      seen.noHint = m.code.getAttribute('placeholder');
      tap(m.q('.ms-ep-back'));
      seen.taps = taps(m.calls);
      m.s.dispose();
      return { ok: seen.title === 'Recover' && seen.back === 'Menu' && seen.heading === 'Recover your seat' && JSON.stringify(seen.labels) === '["Match ID","Recovery code"]' && seen.note === RECOVER_WORDS.note
        && seen.id.mono && seen.id.placeholder === 'From the host' && seen.id.value === MATCH_ID
        && seen.code.type === 'password' && seen.code.autocomplete === 'off' && seen.code.autocapitalize === 'off' && seen.code.spellcheck === 'false' && seen.code.placeholder === '32 characters'
        && seen.noHint === null && seen.action === 'Recover seat' && seen.key && JSON.stringify(seen.taps) === '[["onBack"]]', seen };
    });

    await check('secret: the code stays in its box; keystrokes report only its length; onRecover hands it over once; no other report, attribute or layout carries it; Frontend can’t give it back; it leaves the box once recovered, at clearCode() and on dispose', async () => {
      const m = mount({});
      typeCode(m.s, SECRET);
      const lengths = m.calls.filter(c => c[0] === 'onCode').map(c => c[1]);
      tap(m.action());
      const handed = m.calls.filter(c => c[0] === 'onRecover').map(c => c[1]);
      // Everything the component reported or put in the page, but the one hand-over.
      const others = JSON.stringify(m.calls.filter(c => c[0] !== 'onRecover'));
      const inPage = m.root.outerHTML.includes(SECRET) || [...m.root.querySelectorAll('*')].some(n => [...n.attributes].some(a => a.value.includes(SECRET)));
      const inLayout = JSON.stringify(m.s.layout()).includes(SECRET);
      let givenBack = false;
      try { m.s.update({ recoveryCode: SECRET }); } catch { givenBack = true; }
      const kept = m.code.value === SECRET;
      m.s.update({ view: 'recovered', seat: 4 });
      const afterRecovered = m.code.value;
      m.s.dispose();
      const m2 = mount({});
      typeCode(m2.s, SECRET);
      m2.s.clearCode();
      const afterClear = m2.code.value;
      typeCode(m2.s, SECRET);
      const box = m2.code;
      m2.s.dispose();
      const seen = { lengths: [lengths.length, lengths.at(-1)], handed: handed.map(h => ({ matchId: h.matchId, length: h.recoveryCode.length, same: h.recoveryCode === SECRET })), others: others.includes(SECRET), inPage, inLayout, givenBack, kept, afterRecovered, afterClear, afterDispose: box.value };
      return { ok: seen.lengths[0] === 32 && JSON.stringify(seen.lengths[1]) === '{"length":32}' && lengths.every(l => Object.keys(l).join() === 'length')
        && handed.length === 1 && seen.handed[0].matchId === MATCH_ID && seen.handed[0].same && !seen.others && !inPage && !inLayout && givenBack && kept
        && afterRecovered === '' && afterClear === '' && seen.afterDispose === '', seen };
    });

    await check('typing: the Match ID’s keystrokes report what the box holds; Frontend’s value replaces it, the caret at its end; Return recovers when available, and not when refused', async () => {
      const m = mount({ matchId: '', recover: { enabled: false } });
      m.id.focus();
      type(m.id, 'MTCH-8f2c4e');
      m.s.update({ matchId: 'mtch-8f2c4e' });
      const given = { value: m.id.value, caret: [m.id.selectionStart, m.id.selectionEnd] };
      enter(m.id);
      const before = m.calls.filter(c => c[0] === 'onRecover').length;
      m.s.update({ recover: { enabled: true } });
      typeCode(m.s, SECRET);
      enter(m.code);
      const seen = { given, before, recovered: m.calls.filter(c => c[0] === 'onRecover').length, reports: m.calls.filter(c => c[0] === 'onMatchId').map(c => c[1]) };
      m.s.dispose();
      return { ok: given.value === 'mtch-8f2c4e' && JSON.stringify(given.caret) === '[11,11]' && seen.before === 0 && seen.recovered === 1 && JSON.stringify(seen.reports) === '["MTCH-8f2c4e"]', seen };
    });

    await check('refused: the words under the code’s box, which is ringed in paper and described by them; gone when cleared', async () => {
      const m = mount({ codeError: RECOVER_WORDS.refused });
      const note = m.q('.ms-k-error');
      const seen = { words: words(note), under: m.qa('.ms-k-field')[1].nextElementSibling === note, beforeNote: note.nextElementSibling === m.q('.ms-k-group-note'),
        ringed: m.qa('.ms-k-input')[1].hasAttribute('data-invalid'), invalid: m.code.getAttribute('aria-invalid'), why: describedBy(m.code) };
      m.s.update({ codeError: null });
      seen.after = { notes: m.qa('.ms-k-error').length, ringed: m.qa('.ms-k-input')[1].hasAttribute('data-invalid'), described: m.code.getAttribute('aria-describedby') };
      m.s.dispose();
      return { ok: seen.words === RECOVER_WORDS.refused && seen.under && seen.beforeNote && seen.ringed && seen.invalid === 'true' && seen.why === RECOVER_WORDS.refused
        && seen.after.notes === 0 && !seen.after.ringed && seen.after.described === null, seen };
    });

    await check('recover: refused with Frontend’s reason, and dimmed; busy reads “Checking…”, is refused and shows the spinner', async () => {
      const m = mount({ recover: { enabled: false, reason: 'Type the Match ID and the code' } });
      const off = { refused: refused(m.action()), why: describedBy(m.action()), look: getComputedStyle(m.action()).opacity };
      tap(m.action());
      m.s.update({ recover: { enabled: true, busy: true } });
      const busy = { busy: m.action().getAttribute('aria-busy'), label: m.action().querySelector('.ms-k-btn-label')?.textContent };
      tap(m.action());
      const seen = { off, busy, taps: taps(m.calls).length };
      m.s.dispose();
      return { ok: off.refused && off.why === 'Type the Match ID and the code' && off.look === '0.4' && busy.busy === 'true' && busy.label === 'Checking…' && seen.taps === 0, seen };
    });

    await check('recovered: the check, “Seat 4 is yours again”, the line and Continue; a focused Recover seat that leaves returns the focus to the screen', async () => {
      const m = mount({});
      m.action().focus();
      m.s.update({ view: 'recovered', seat: 4 });
      await Promise.resolve();
      const seen = { focus: document.activeElement === m.root, returned: m.calls.filter(c => c[0] === 'onFocusReturn').map(c => c[1]),
        title: words(m.q('.ms-k-wait-title')), line: words(m.q('.ms-k-wait-line')), tile: !!m.q('.ms-k-wait-tile svg'), fields: m.qa('.ms-k-field').length, action: words(m.action()) };
      tap(m.action());
      seen.taps = taps(m.calls);
      m.s.dispose();
      return { ok: seen.focus && JSON.stringify(seen.returned) === '[{"intent":"recover","value":null}]' && seen.title === 'Seat 4 is yours again' && seen.line === 'Back to the match where it is now'
        && seen.tile && seen.fields === 0 && seen.action === 'Continue' && JSON.stringify(seen.taps) === '[["onContinue"]]', seen };
    });

    await check('offline: the words over the foot; with Recover seat enabled they refuse nothing; Frontend’s refusal refuses with the reason; Back stays usable', async () => {
      const m = mount({ error: RECOVER_WORDS.offline });
      const note = m.q('.ms-k-error');
      const alone = { words: words(note), overFoot: note.nextElementSibling === m.q('.ms-ep-foot'), refused: refused(m.action()) };
      m.s.update({ recover: { enabled: false, reason: RECOVER_WORDS.offline } });
      tap(m.action()); tap(m.q('.ms-ep-back'));
      const given = { refused: refused(m.action()), why: describedBy(m.action()), taps: taps(m.calls) };
      m.s.dispose();
      const seen = { alone, given };
      return { ok: alone.words === RECOVER_WORDS.offline && alone.overFoot && !alone.refused && given.refused && given.why === RECOVER_WORDS.offline && JSON.stringify(given.taps) === '[["onBack"]]', seen };
    });

    await check('not interactive: every control refused, nothing dimmed, the boxes read-only, typing unreported', async () => {
      const m = mount({ interactive: false });
      const buttons = m.qa('button');
      for (const b of buttons) tap(b);
      type(m.id, 'X'); typeCode(m.s, 'abc'); enter(m.code);
      const seen = { refused: buttons.map(refused), dimmed: buttons.filter(b => b.hasAttribute('data-off')).length, readOnly: [m.id.readOnly, m.code.readOnly], taps: taps(m.calls).length };
      m.s.dispose();
      return { ok: seen.refused.every(Boolean) && seen.dimmed === 0 && seen.readOnly.every(Boolean) && seen.taps === 0, seen };
    });

    await check('insets: Frontend’s safe areas place the screen 8 px under the top one and 16 px over the bottom one; null gives the browser’s', async () => {
      const m = mount({});
      const given = m.s.layout().safe;
      m.s.update({ insets: null });
      const browser = m.s.layout().safe;
      m.s.dispose();
      const seen = { given, browser };
      return { ok: given.top === 47 && given.bottom === 34 && browser.top === 0 && browser.bottom === 0, seen };
    });

    await check('text: with the Largest text (200 %) the screen scrolls and its foot is reached', async () => {
      document.documentElement.style.fontSize = '200%';
      const m = mount({ codeError: RECOVER_WORDS.refused });
      await frames();
      const screen = m.q('.ms-ep-screen');
      const scrolls = screen.scrollHeight > screen.clientHeight;
      screen.scrollTop = screen.scrollHeight;
      await frames();
      const a = m.action().getBoundingClientRect(), r = m.root.getBoundingClientRect();
      const seen = { scrolls, footInView: a.bottom <= r.bottom - 34 && a.top >= r.top };
      m.s.dispose();
      document.documentElement.style.fontSize = '';
      return { ok: seen.scrolls && seen.footInView, seen };
    });

    await check('text later: mounted at the Standard text, then the Largest set and a part opened (the code refused under its box, and the recovered seat), the screen lays out as one mounted at the Largest (kit 0.8.1 followTextSize)', async () => {
      const html = document.documentElement.style;
      const boxes = m => {
        const f = m.root.getBoundingClientRect();
        return [...m.root.querySelectorAll('button, input, .ms-k-row, .ms-k-list, .ms-k-error, .ms-k-field, h1, h2, p')].filter(n => n.getClientRects().length)
          .map(n => { const r = n.getBoundingClientRect(); return [r.top - f.top, r.left - f.left, r.width, r.height].map(v => Math.round(v * 100) / 100); });
      };
      const late = async (first, then) => {
        html.fontSize = '100%'; const m = mount(first); await frames();
        html.fontSize = '200%'; await frames();
        m.s.update(then); await frames(); await frames();
        const seen = boxes(m); m.s.dispose(); return seen;
      };
      const fresh = async input => { html.fontSize = '200%'; const m = mount(input); await frames(); await frames(); const seen = boxes(m); m.s.dispose(); return seen; };
      const seen = {
        refused: { late: await late({}, { codeError: RECOVER_WORDS.refused }), fresh: await fresh({ codeError: RECOVER_WORDS.refused }) },
        recovered: { late: await late({}, { view: 'recovered', seat: 4 }), fresh: await fresh({ view: 'recovered', seat: 4 }) },
      };
      html.fontSize = '';
      const same = v => v.late.length > 0 && JSON.stringify(v.late) === JSON.stringify(v.fresh);
      return { ok: same(seen.refused) && same(seen.recovered), seen };
    });

    await check('input: malformed input is refused', async () => {
      const bad = [{ view: 'done' }, { matchId: null }, { codeLength: 0 }, { codeError: 3 }, { recover: null }, { seat: 0 }, { view: 'recovered' }, { insets: { top: '47px' } }, { recoveryCode: 'x' }, { code: 'x' }];
      const refusedAll = bad.map(i => { try { nextRecoverInput(RECOVER_DEFAULTS, i); return false; } catch { return true; } });
      return { ok: refusedAll.every(Boolean), seen: refusedAll };
    });

    await check('dispose: safe twice; afterwards nothing fires, layout() is null and nothing is left', async () => {
      const m = mount({});
      const { id, code } = m, action = m.action();
      m.s.dispose(); m.s.dispose();
      type(id, 'X'); type(code, 'Y'); tap(action); m.s.update({ matchId: 'AB' }); m.s.focus('code');
      const seen = { left: frame.childElementCount, layout: m.s.layout(), taps: taps(m.calls).length };
      return { ok: seen.left === 0 && seen.layout === null && seen.taps === 0, seen };
    });
  }

  await check(`motion: only the spinner turns${mode === 'device-reduced' ? '; with the device’s Reduce motion it stands still' : ', and with the game’s Reduce motion it stands still'}`, async () => {
    const turning = root => root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName ?? a.constructor.name);
    const m = mount({ recover: { enabled: true, busy: true } });
    await frames();
    const full = turning(m.root);
    m.s.update({ reducedMotion: true });
    await frames();
    const reduced = turning(m.root);
    m.s.update({ reducedMotion: false, recover: { enabled: true } });
    await frames();
    const idle = turning(m.root);
    m.s.dispose();
    const seen = { full, reduced, idle };
    if (mode === 'device-reduced') return { ok: full.length === 0 && idle.length === 0, seen };
    return { ok: full.length > 0 && full.every(n => /spin/.test(n)) && reduced.length === 0 && idle.length === 0, seen };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

// mothership:dev-only
//
// Host controls' lifecycle probe: it drives the real component (../host-controls.mjs) in the real phone shell's sheet,
// in the browser, under whatever headers serve the page (design/tools/host-controls-check.mjs serves the production
// ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   report    each row reports its tap, and only that: the deadline, the bots, a seat's code, the confirm; the
//             keyboard as the finger
//   command   in flight, only that row is busy, with the spinner at its end; refused, it is dimmed, with Frontend's
//             reason as its line and its description; the others keep their own state; the confirm's Abort match
//             busy in the shell's footer
//   retry     (0.1.1) the list's footer has Retry, primary and not local, only while Frontend gives it; it reports
//             through the shell's footer, busy and refused as given; the refused rows keep Frontend's words
//   reconnect the commands wait with the banner's words, not dimmed; the confirm still opens; the footer's Reveal,
//             Hide, Copy and Keep playing are this phone's own (the shell's local actions) and still work
//   privacy   the code is in the page only while revealed; never in an attribute, a report or the layout; it leaves
//             when hidden, when the view changes, when the viewer changes, when concealed and on dispose; given
//             while hidden, it is refused
//   minutes   the minutes left as Frontend gives them, never counted down here; no line without them
//   focus     each row keeps its element and the focus; a focus in what ends returns to the content, reported once
//   words     the names, the sheet's frame and footer from hostControlsSheet() for each view
//   layout    the list and the card 16 px in, at both sizes; at the Largest text every word whole and the footer in view
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    the spinner turns, and stands still with Reduce motion (the game's, or the device's)
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { hostControlsSheet, HOST_WORDS, CODE_MASK, codeGroups, maskGroups, matchIdGroups } from '../host-controls.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runHostControlsProbe({ sizes, mountState, disposeState, inputOf, codeOf, SAMPLE_CODE, REAL_CODE, REAL_MATCH_ID, SEATS, REFUSED }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  document.body.append(frame);
  const sizeTo = key => { const s = sizes[key]; Object.assign(frame.style, { width: `${s.width}px`, height: `${s.height}px` }); return s; };
  let size = sizeTo('390x844');
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  /** A sheet with every callback recorded; update() moves the component and the shell's frame together, as Frontend does. */
  const mount = (input = inputOf(), shellExtra = {}) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const m = mountState(frame, 'list', size.insets, Object.fromEntries(['onDeadline', 'onBots', 'onIssueRecovery', 'onAbortAsk', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    if (Object.keys(shellExtra).length) m.shell.update(shellExtra);
    const root = m.host.element;
    const q = s => root.querySelector(s);
    const update = (next, extra = {}) => { current = { ...current, ...next }; m.host.update(next); m.shell.update({ sheet: hostControlsSheet(current), ...extra }); };
    return { m, calls, root, q, update, row: intent => q(`[data-intent="${intent}"]`), seat: n => q(`[data-intent="issue-recovery"][data-value="${n}"]`),
      footer: () => [...m.shell.element.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')] };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const reports = calls => calls.filter(c => c[0] !== 'onFocusReturn');
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const key = node => { node.focus(); node.click(); };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const busy = node => node.getAttribute('aria-busy') === 'true';
  const dimmed = node => node.hasAttribute('data-off');
  const spins = node => !!node.querySelector('.ms-k-row-trail > .ms-k-spinner');
  const line = node => node.querySelector('.ms-k-row-sub')?.textContent ?? null;
  /** Whether the code is anywhere in the page's markup (its text or any attribute). */
  // In the markup or in the text (0.1.2: the code is drawn in groups, so the text is where it reads whole).
  const inPage = (code = SAMPLE_CODE) => document.documentElement.outerHTML.includes(code) || document.body.textContent.includes(code);
  const inAttributes = () => [...document.querySelectorAll('*')].some(n => [...n.attributes].some(a => a.value.includes(SAMPLE_CODE)));

  if (mode === 'full') {
    await check('report: each row reports its tap, and only that; the keyboard as the finger', async () => {
      const s = mount();
      tap(s.row('deadline'));
      key(s.row('bots'));
      tap(s.seat(3));
      key(s.seat(5));
      tap(s.row('abort-ask'));
      const got = reports(s.calls);
      disposeState(s.m);
      return { ok: JSON.stringify(got) === JSON.stringify([['onDeadline'], ['onBots'], ['onIssueRecovery', 3], ['onIssueRecovery', 5], ['onAbortAsk']]), got };
    });
    await check('command: in flight, only that row is busy with the spinner at its end; the others keep their own state', async () => {
      const s = mount(inputOf({ bots: { enabled: true, busy: true }, seats: SEATS.map(x => (x.seat === 2 ? { ...x, busy: true } : x)) }));
      const bots = s.row('bots'), seat2 = s.seat(2);
      bots.focus();
      tap(bots); tap(seat2);
      const seen = { bots: { busy: busy(bots), spins: spins(bots), dimmed: dimmed(bots), line: line(bots), focus: document.activeElement === bots },
        seat2: { busy: busy(seat2), spins: spins(seat2), chevron: !!seat2.querySelector('.ms-k-row-chev svg') },
        deadline: { busy: busy(s.row('deadline')), spins: spins(s.row('deadline')), refused: refused(s.row('deadline')) }, seat1: busy(s.seat(1)) || spins(s.seat(1)) };
      tap(s.row('deadline')); tap(s.seat(1));
      s.update({ bots: { enabled: true } });
      const after = { busy: busy(bots), spins: spins(bots), same: s.row('bots') === bots };
      const got = reports(s.calls);
      disposeState(s.m);
      const ok = seen.bots.busy && seen.bots.spins && !seen.bots.dimmed && seen.bots.line === HOST_WORDS.botsLine && seen.bots.focus && seen.seat2.busy && seen.seat2.spins && seen.seat2.chevron
        && !seen.deadline.busy && !seen.deadline.spins && !seen.deadline.refused && !seen.seat1 && JSON.stringify(got) === JSON.stringify([['onDeadline'], ['onIssueRecovery', 1]]) && !after.busy && !after.spins && after.same;
      return { ok, seen, after, got };
    });
    await check('command: refused, the row dimmed, Frontend\'s reason as its line and its description; the usual line back when offered', async () => {
      const s = mount(inputOf({ deadline: { enabled: false, reason: REFUSED.deadline }, abort: { enabled: false, reason: 'Only between turns' } }));
      const d = s.row('deadline'), a = s.row('abort-ask');
      tap(d); tap(a);
      const seen = { refused: refused(d), dimmed: dimmed(d), line: line(d), why: describedBy(d), abort: { refused: refused(a), dimmed: dimmed(a), line: line(a) }, bots: refused(s.row('bots')) };
      s.update({ deadline: { enabled: true }, abort: { enabled: true } });
      const after = { refused: refused(d), line: line(d), why: describedBy(d), abortLine: line(a) };
      const got = reports(s.calls);
      disposeState(s.m);
      const ok = seen.refused && seen.dimmed && seen.line === REFUSED.deadline && seen.why === REFUSED.deadline && seen.abort.refused && seen.abort.dimmed && seen.abort.line === 'Only between turns'
        && !seen.bots && got.length === 0 && !after.refused && after.line === HOST_WORDS.deadlineLine && after.why === null && after.abortLine === HOST_WORDS.abortLine;
      return { ok, seen, after, got };
    });
    await check('command: the confirm\'s Abort match is the shell\'s footer: busy while the abort is in flight, refused with Frontend\'s reason', async () => {
      const s = mount(inputOf({ view: 'abort' }));
      const [keep, abort] = s.footer();
      tap(keep); tap(abort);
      const first = s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]);
      s.update({ abort: { enabled: true, busy: true } });
      const inFlight = busy(s.footer()[1]);
      s.update({ abort: { enabled: false, reason: 'Only between turns' } });
      const off = { refused: refused(s.footer()[1]), why: describedBy(s.footer()[1]) };
      const words = s.footer().map(b => b.textContent.trim());
      disposeState(s.m);
      return { ok: JSON.stringify(first) === JSON.stringify(['keep', 'abort']) && inFlight && off.refused && off.why === 'Only between turns' && words.join('|') === 'Keep playing|Abort match', first, inFlight, off, words };
    });
    await check('retry: the list\'s footer has Retry, the kit\'s primary and a command (not local), only while Frontend gives it; it reports, busy and refused as given; the refused rows keep Frontend\'s words (0.1.1)', async () => {
      const unsure = 'Session request outcome unknown. Retry the original request.', waits = { enabled: false, reason: unsure };
      const s = mount(inputOf({ deadline: waits, bots: waits, abort: waits, retry: { enabled: true } }));
      const [retry] = s.footer();
      const look = { words: s.footer().map(b => b.textContent.trim()).join('|'), primary: retry?.classList.contains('ms-k-btn-primary'), local: retry?.dataset.intent };
      tap(retry);
      const reported = s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]);
      const rows = { line: s.root.querySelector('[data-intent="deadline"] .ms-k-row-sub')?.textContent, why: describedBy(s.root.querySelector('[data-intent="bots"]')),
        refused: ['deadline', 'bots', 'abort-ask'].every(i => refused(s.root.querySelector(`[data-intent="${i}"]`))) };
      s.update({ retry: { enabled: false, busy: true } });
      const inFlight = busy(s.footer()[0]);
      s.update({ retry: null });
      const gone = s.footer().length;
      s.update({ retry: { enabled: true }, view: 'abort' });
      const abortFooter = s.footer().map(b => b.textContent.trim()).join('|');
      disposeState(s.m);
      return { ok: look.words === HOST_WORDS.retry && look.primary && look.local === 'sheet-action' && JSON.stringify(reported) === '["retry"]'
        && rows.line === unsure && rows.why === unsure && rows.refused && inFlight && gone === 0 && abortFooter === 'Keep playing|Abort match', look, reported, rows, inFlight, gone, abortFooter };
    });
    await check('reconnect: the commands wait with the banner\'s words, not dimmed; the confirm still opens', async () => {
      const s = mount(inputOf({ status: 'stale' }), { status: 'stale', banner: { kind: 'reconnecting' } });
      for (const n of [s.row('deadline'), s.row('bots'), s.seat(1)]) tap(n);
      const waits = [s.row('deadline'), s.row('bots'), s.seat(1)].map(n => ({ refused: refused(n), dimmed: dimmed(n), why: describedBy(n) }));
      tap(s.row('abort-ask'));
      const got = reports(s.calls);
      disposeState(s.m);
      return { ok: waits.every(w => w.refused && !w.dimmed && w.why === 'Controls return when the match is current') && JSON.stringify(got) === JSON.stringify([['onAbortAsk']]), waits, got };
    });
    await check('reconnect: the footer\'s Reveal, Hide, Copy and Keep playing are this phone\'s own and still work; Abort match waits with the banner\'s words', async () => {
      const stale = { status: 'stale', banner: { kind: 'reconnecting' } };
      const s = mount(inputOf({ status: 'stale', view: 'code', code: codeOf(true) }), stale);
      for (const b of s.footer()) tap(b);
      const code = s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]);
      disposeState(s.m);
      const t = mount(inputOf({ status: 'stale', view: 'abort' }), stale);
      const [keep, abort] = t.footer();
      tap(keep); tap(abort);
      const confirm = { actions: t.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]), keep: refused(keep), abort: refused(abort), dimmed: dimmed(abort), why: describedBy(abort), warn: abort.classList.contains('ms-k-btn-warn') };
      disposeState(t.m);
      const ok = code.join() === 'hide,copy' && confirm.actions.join() === 'keep' && !confirm.keep && confirm.abort && !confirm.dimmed && confirm.why === 'Controls return when the match is current' && confirm.warn;
      return { ok, code, confirm };
    });
    await check('wrap: the code and the Match ID are drawn in groups that never wrap, their text the value itself (0.1.2)', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(false, 15, { matchId: REAL_MATCH_ID, value: REAL_CODE }) }));
      const line = sel => { const n = s.q(sel), groups = [...n.querySelectorAll(':scope > .ms-hc-group')];
        return { text: n.textContent, groups: groups.map(g => g.textContent), nowrap: groups.every(g => getComputedStyle(g).whiteSpace === 'nowrap'),
          breaks: n.querySelectorAll(':scope > wbr').length, wordBreak: getComputedStyle(n).wordBreak }; };
      const hidden = line('.ms-hc-code'), id = line('.ms-hc-match-id');
      s.update({ code: codeOf(true, 15, { matchId: REAL_MATCH_ID, value: REAL_CODE }) });
      const shown = line('.ms-hc-code');
      disposeState(s.m);
      const ok = hidden.text === CODE_MASK && hidden.groups.join() === maskGroups().join() && hidden.nowrap && hidden.breaks === 0 && hidden.wordBreak === 'normal'
        && shown.text === REAL_CODE && shown.groups.join() === codeGroups(REAL_CODE).join() && shown.groups.every(g => g.length <= 6) && shown.nowrap && shown.breaks === shown.groups.length - 1
        && id.text === REAL_MATCH_ID && id.groups.join() === matchIdGroups(REAL_MATCH_ID).join() && id.groups.length === 5 && id.nowrap && id.breaks === 4;
      return { ok, hidden, shown, id };
    });
    await check('privacy: the code is in the page only while revealed; hidden, the fixed dots', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(false) }));
      const hidden = { inPage: inPage(), text: s.q('.ms-hc-code').textContent };
      s.update({ code: codeOf(true) });
      const shown = { inPage: inPage(), text: s.q('.ms-hc-code').textContent, count: document.body.textContent.split(SAMPLE_CODE).length - 1 };
      s.update({ code: codeOf(false) });
      const again = { inPage: inPage(), text: s.q('.ms-hc-code').textContent };
      disposeState(s.m);
      return { ok: !hidden.inPage && hidden.text === CODE_MASK && shown.inPage && shown.text === SAMPLE_CODE && shown.count === 1 && !again.inPage && again.text === CODE_MASK, hidden, shown, again };
    });
    await check('privacy: revealed, then reconnecting: Hide is still taken, and once Frontend hides it the code leaves the page', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      const live = inPage();
      s.update({ status: 'stale' }, { status: 'stale', banner: { kind: 'reconnecting' } });
      const [hide, copy] = s.footer();
      const stale = { inPage: inPage(), hide: hide?.textContent.trim(), intent: hide?.getAttribute('data-intent'), refused: refused(hide), dimmed: dimmed(hide), copyRefused: refused(copy) };
      tap(hide);
      const actions = s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]);
      s.update({ code: codeOf(false) });
      const hidden = { inPage: inPage(), text: s.q('.ms-hc-code').textContent, reveal: s.footer()[0]?.textContent.trim(), attributes: inAttributes() };
      disposeState(s.m);
      const ok = live && stale.inPage && stale.hide === HOST_WORDS.hide && stale.intent === 'sheet-local' && !stale.refused && !stale.dimmed && !stale.copyRefused
        && actions.join() === 'hide' && !hidden.inPage && hidden.text === CODE_MASK && hidden.reveal === HOST_WORDS.reveal && !hidden.attributes;
      return { ok, live, stale, actions, hidden };
    });
    await check('privacy: the code is never in an attribute, a report or the layout', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      s.q('.ms-hc-code').focus?.();
      tap(s.footer()[0]); tap(s.footer()[1]);
      for (const n of s.root.querySelectorAll('[data-intent]')) tap(n);
      const seen = { attributes: inAttributes(), reports: JSON.stringify(s.calls).includes(SAMPLE_CODE), layout: JSON.stringify(s.m.shell.layout()).includes(SAMPLE_CODE),
        sheet: JSON.stringify(hostControlsSheet(inputOf({ view: 'code', code: codeOf(true) }))).includes(SAMPLE_CODE), actions: s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]) };
      disposeState(s.m);
      return { ok: !seen.attributes && !seen.reports && !seen.layout && !seen.sheet && seen.actions.join() === 'hide,copy', seen };
    });
    await check('privacy: the code leaves the page when the viewer changes, and is kept only if the same update gives the new viewer\'s', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      s.m.host.update({ viewer: 5 });
      const dropped = { inPage: inPage(), card: s.q('.ms-hc-card')?.hidden ?? null };
      s.m.host.update({ viewer: 4, code: codeOf(true) });
      const given = inPage();
      disposeState(s.m);
      return { ok: !dropped.inPage && dropped.card === true && given, dropped, given };
    });
    await check('privacy: the code leaves the page while concealed, refused if given then, and comes back only when given', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      s.m.host.update({ status: 'concealed' });
      const hidden = inPage();
      s.m.host.update({ code: codeOf(true) });
      const givenHidden = inPage();
      s.m.host.update({ status: 'live' });
      const back = inPage();
      s.m.host.update({ code: codeOf(true) });
      const given = inPage();
      disposeState(s.m);
      return { ok: !hidden && !givenHidden && !back && given, hidden, givenHidden, back, given };
    });
    await check('privacy: the code leaves the page when the view changes and on dispose; given while hidden, it is refused', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      s.update({ view: 'list' });
      const onList = inPage();
      s.update({ view: 'code', code: codeOf(true) });
      const back = inPage();
      s.m.host.dispose();
      const disposed = inPage();
      disposeState(s.m);
      let refusedHidden = false;
      try { mountState(frame, 'list', size.insets, {}, { input: inputOf({ view: 'code', code: { ...codeOf(false), value: SAMPLE_CODE } }) }); } catch (error) { refusedHidden = /only while it is revealed/.test(String(error)); }
      frame.replaceChildren();
      return { ok: !onList && back && !disposed && refusedHidden && !inPage(), onList, back, disposed, refusedHidden };
    });
    await check('minutes: the minutes left as Frontend gives them, never counted down here; no line without them', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(false, 5) }));
      const meta = () => (s.q('.ms-hc-meta').hidden ? null : s.q('.ms-hc-meta').textContent.trim());
      const first = meta();
      await new Promise(done => setTimeout(done, 1200));
      const later = meta();
      s.update({ code: codeOf(false, 1) });
      const one = meta();
      s.update({ code: { ...codeOf(false), minutes: null } });
      const none = meta();
      disposeState(s.m);
      return { ok: first === 'Works once · 5 minutes' && later === first && one === 'Works once · 1 minute' && none === null, first, later, one, none };
    });
    await check('focus: each row keeps its element and the focus; a focused seat that leaves the list returns the focus once', async () => {
      const s = mount();
      const seat4 = s.seat(4);
      seat4.focus();
      s.update({ bots: { enabled: true, busy: true } });
      s.update({ bots: { enabled: true }, seats: SEATS.map(x => ({ ...x, busy: x.seat === 4 })) });
      s.update({ seats: SEATS });
      const kept = s.seat(4) === seat4 && document.activeElement === seat4;
      s.update({ seats: SEATS.filter(x => x.seat !== 4) });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const gone = { row: !!s.seat(4), active: document.activeElement === s.root };
      disposeState(s.m);
      return { ok: kept && !gone.row && gone.active && returns.length === 1 && returns[0][1]?.intent === 'issue-recovery' && returns[0][1]?.value === '4', kept, gone, returns };
    });
    await check('focus: a focus in a view that ends returns to the content, reported once', async () => {
      const s = mount();
      s.row('abort-ask').focus();
      s.update({ view: 'abort' });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      disposeState(s.m);
      return { ok: active && returns.length === 1 && returns[0][1]?.intent === 'abort-ask', active, returns };
    });
    await check('words: the content\'s name; the sheet\'s frame and footer from hostControlsSheet() for each view', async () => {
      const s = mount();
      const frameOf = () => ({ title: s.m.shell.element.querySelector('.ms-ps-sheet-title h2').textContent, sub: s.m.shell.element.querySelector('.ms-ps-sheet-title p').hidden ? null : s.m.shell.element.querySelector('.ms-ps-sheet-title p').textContent,
        back: !!s.m.shell.element.querySelector('.ms-ps-sheet [data-intent="sheet-back"]'), foot: s.footer().map(b => b.textContent.trim()).join('|') });
      const list = frameOf();
      s.update({ view: 'code', code: codeOf(false) });
      const hidden = frameOf();
      s.update({ code: codeOf(true) });
      const shown = frameOf();
      s.update({ view: 'abort', code: null });
      const confirm = frameOf();
      const seen = { name: [s.root.getAttribute('role'), s.root.getAttribute('aria-label')].join(), list, hidden, shown, confirm,
        confirmWords: [s.q('.ms-k-wait-title').textContent, s.q('.ms-k-wait-line').textContent] };
      disposeState(s.m);
      const ok = seen.name === 'group,Host controls' && list.title === 'Host controls' && list.sub === null && list.back && list.foot === ''
        && hidden.title === 'Recovery code' && hidden.sub === 'Private to this phone' && hidden.foot === 'Reveal|Copy' && shown.foot === 'Hide|Copy'
        && confirm.title === 'Host controls' && confirm.foot === 'Keep playing|Abort match' && seen.confirmWords.join('|') === 'Abort the match?|It ends now for everyone, with no winner.';
      return { ok, seen };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the list and the card 16 px in, in the large sheet`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        await frames();
        const r = frame.getBoundingClientRect(), list = s.q('.ms-k-list').getBoundingClientRect();
        const listIn = [list.left - r.left, r.right - list.right];
        s.update({ view: 'code', code: codeOf(false) });
        await frames();
        const card = s.q('.ms-hc-card').getBoundingClientRect();
        const cardIn = [card.left - r.left, r.right - card.right];
        const detent = s.m.shell.element.querySelector('.ms-ps-sheet').dataset.detent;
        disposeState(s.m);
        return { ok: listIn.every(v => Math.abs(v - 16) < 0.5) && cardIn.every(v => Math.abs(v - 16) < 0.5) && detent === 'large', listIn, cardIn, detent };
      });
    }
    size = sizeTo('390x844');
    for (const [which, input] of [['the list', inputOf()], ['the revealed code', inputOf({ view: 'code', code: codeOf(true) })]]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling, the footer in view`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input);
        await frames();
        const words = [...s.root.querySelectorAll('.ms-k-row-title, .ms-k-row-sub, .ms-k-group-label, .ms-k-group-note, .ms-hc-card > *')];
        const cut = words.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const body = s.m.shell.sheetBody, last = s.root.lastElementChild;
        last.scrollIntoView({ block: 'end' });
        await frames();
        const v = body.getBoundingClientRect(), l = last.getBoundingClientRect();
        const reachable = l.bottom <= v.bottom + 0.5;
        const foot = s.footer().every(b => { const bb = b.getBoundingClientRect(); return bb.bottom <= frame.getBoundingClientRect().bottom + 0.5; });
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: cut.length === 0 && reachable && foot, cut, reachable, foot };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount(inputOf({ view: 'code', code: codeOf(true) }));
      const body = s.m.shell.sheetBody;
      s.update({ view: 'list', code: null });
      const row = s.row('bots');
      s.m.host.dispose(); s.m.host.dispose();
      tap(row);
      s.m.host.update({ view: 'code', code: codeOf(true) });
      const seen = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected, inPage: inPage() };
      disposeState(s.m);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && !seen.inPage && frame.children.length === 0, seen };
    });
  }
  await check(`motion: the spinner ${deviceReduced ? 'stands still with the device\'s Reduce motion' : 'turns, and stands still with the game\'s Reduce motion'}`, async () => {
    const s = mount(inputOf({ bots: { enabled: true, busy: true } }));
    const spin = () => getComputedStyle(s.q('.ms-k-row-trail > .ms-k-spinner')).animationName;
    const first = spin();
    s.m.host.update({ reducedMotion: true });
    const reduced = spin();
    disposeState(s.m);
    return { ok: deviceReduced ? first === 'none' && reduced === 'none' : first !== 'none' && reduced === 'none', first, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

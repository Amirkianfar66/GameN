// mothership:dev-only
//
// Display settings' lifecycle probe: it drives the real component (../display-settings.mjs; the sheet's content in
// the real phone shell's sheet) in the browser, under whatever headers serve the page
// (design/tools/display-settings-check.mjs serves the production ones), and reports what it saw. Each check is
// one behaviour Frontend relies on:
//   report    the switch reports the setting it asks for; a size its scale, the current one nothing; Menu and
//             Host controls report; the keyboard as the finger; nothing is stored or applied by the component
//   lock      the phone's own Reduce Motion: the switch on, dimmed and refused, Frontend's reason as the row's
//             line and as the switch's description; the usual line back when the lock lifts
//   refused   not interactive refuses every control without dimming; reconnecting refuses nothing (the shell's
//             sheet still takes taps)
//   host      the Host group only with hostControls; unavailable, dimmed and refused with Frontend's reason;
//             gone with the input, and a focus in it returns to the content, reported once
//   focus     the switch and the sizes keep their elements and the focus through updates and a new text size
//   words     the names: the page's group, the switch, the sizes' radio group, Menu
//   layout    the page under the safe areas at both sizes, reported; at the Large text the sizes side by side, at
//             the Largest one a row, every word whole and every control reachable
//   text later  the page mounted at the Standard text, then the Largest, its size and the lock: laid out as one
//             mounted at the Largest with them (the kit's followTextSize, 0.8.1)
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    the switch's thumb slides in 220 ms, and in 80 ms with Reduce motion (the game's, or the device's)
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { SETTINGS_WORDS } from '../display-settings.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runDisplaySettingsProbe({ sizes, mountState, disposeState, LOCK }) {
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
  /** A state with every callback recorded. */
  const mount = key => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const m = mountState(frame, key, size.insets, Object.fromEntries(['onReducedMotion', 'onTextScale', 'onBack', 'onHostControls', 'onFocusReturn', 'onLayout'].map(n => [n, record(n)])));
    const root = m.settings.element;
    const q = s => root.querySelector(s);
    return { m, calls, root, q, toggle: () => q('.ms-k-switch'), size: v => q(`.ms-k-seg-btn[data-value="${v}"]`), hostRow: () => q('[data-intent="host-controls"]'), back: () => q('.ms-ep-back') };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const key = node => { node.focus(); node.click(); };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const dimmed = node => node.hasAttribute('data-off');
  const line = s => s.q('.ms-ds-motion .ms-k-row-sub')?.textContent ?? null;
  const reports = calls => calls.filter(c => c[0] !== 'onLayout' && c[0] !== 'onFocusReturn');

  if (mode === 'full') {
    for (const which of ['page', 'sheet']) {
      await check(`report: the ${which}'s switch asks for its other setting, a size reports its scale, the current one nothing; the keyboard as the finger`, async () => {
        const s = mount(which);
        tap(s.toggle());
        const first = s.toggle().getAttribute('aria-checked');
        s.m.settings.update({ reducedMotion: true });
        key(s.toggle());
        tap(s.size('1.5'));
        tap(s.size('1'));
        key(s.size('2'));
        const got = reports(s.calls);
        disposeState(s.m);
        // The switch stays as given until Frontend gives the new setting: the component stores nothing.
        return { ok: first === 'false' && JSON.stringify(got) === JSON.stringify([['onReducedMotion', true], ['onReducedMotion', false], ['onTextScale', 1.5], ['onTextScale', 2]]), got, first };
      });
    }
    await check('report: Menu on the page, Host controls in the sheet', async () => {
      const p = mount('page');
      tap(p.back());
      const page = reports(p.calls);
      disposeState(p.m);
      const s = mount('sheet-host');
      key(s.hostRow());
      const sheet = reports(s.calls);
      disposeState(s.m);
      return { ok: JSON.stringify(page) === JSON.stringify([['onBack']]) && JSON.stringify(sheet) === JSON.stringify([['onHostControls']]), page, sheet };
    });
    for (const which of ['page-locked', 'sheet-locked']) {
      await check(`lock: ${which === 'page-locked' ? 'the page' : 'the sheet'}: the switch on, dimmed and refused; Frontend's reason as the row's line and the switch's description; the sizes still work; unlocked, the usual line`, async () => {
        const s = mount(which);
        const t = s.toggle();
        t.focus();
        tap(t);
        const seen = { checked: t.getAttribute('aria-checked'), refused: refused(t), dimmed: dimmed(t), why: describedBy(t), line: line(s), focus: document.activeElement === t, rowLocked: s.q('.ms-ds-motion').hasAttribute('data-locked') };
        tap(s.size('1.5'));
        s.m.settings.update({ motionLock: null, reducedMotion: false });
        const after = { checked: t.getAttribute('aria-checked'), refused: refused(t), why: describedBy(t), line: line(s), same: s.toggle() === t };
        const got = reports(s.calls);
        disposeState(s.m);
        const ok = seen.checked === 'true' && seen.refused && seen.dimmed && seen.why === LOCK.reason && seen.line === LOCK.reason && seen.focus && seen.rowLocked
          && JSON.stringify(got) === JSON.stringify([['onTextScale', 1.5]]) && after.checked === 'false' && !after.refused && after.why === null && after.line === SETTINGS_WORDS.motionLine && after.same;
        return { ok, seen, after, got };
      });
    }
    await check('refused: not interactive, every control refused and nothing dimmed; taps come back with the input', async () => {
      const s = mount('sheet-host');
      s.m.settings.update({ interactive: false });
      const all = [s.toggle(), ...s.q('.ms-k-seg').children, s.hostRow()];
      for (const n of all) tap(n);
      const seen = all.map(n => ({ refused: refused(n), dimmed: dimmed(n) }));
      s.m.settings.update({ interactive: true });
      tap(s.toggle());
      const got = reports(s.calls);
      disposeState(s.m);
      return { ok: seen.every(x => x.refused && !x.dimmed) && JSON.stringify(got) === JSON.stringify([['onReducedMotion', true]]), seen, got };
    });
    await check('refused: reconnecting refuses nothing: the sheet under the shell\'s banner still takes every tap', async () => {
      const s = mount('sheet-stale');
      const banner = !!s.m.shell.element.querySelector('.ms-ps-banner');
      tap(s.toggle()); tap(s.size('2')); tap(s.hostRow());
      const got = reports(s.calls);
      const anyRefused = [s.toggle(), ...s.q('.ms-k-seg').children, s.hostRow()].some(refused);
      disposeState(s.m);
      return { ok: banner && !anyRefused && JSON.stringify(got) === JSON.stringify([['onReducedMotion', true], ['onTextScale', 2], ['onHostControls']]), banner, got };
    });
    await check('host: the Host group only with hostControls; unavailable, dimmed and refused with Frontend\'s reason; a focus in it returns once when it goes', async () => {
      const s = mount('sheet');
      const none = { group: !!s.q('.ms-ds-host'), labels: [...s.root.querySelectorAll('.ms-k-group-label')].map(n => n.textContent) };
      s.m.settings.update({ hostControls: { enabled: false, reason: 'Opens when the round ends' } });
      const row = s.hostRow();
      tap(row);
      const off = { refused: refused(row), dimmed: dimmed(row), why: describedBy(row) };
      s.m.settings.update({ hostControls: { enabled: true } });
      const on = { same: s.hostRow() === row, refused: refused(row), labels: [...s.root.querySelectorAll('.ms-k-group-label')].map(n => n.textContent) };
      row.focus();
      s.m.settings.update({ hostControls: null });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const gone = { group: !!s.q('.ms-ds-host'), active: document.activeElement === s.root };
      const got = reports(s.calls);
      disposeState(s.m);
      const ok = !none.group && none.labels.join('|') === 'Display|Text size' && off.refused && off.dimmed && off.why === 'Opens when the round ends' && on.same && !on.refused
        && on.labels.join('|') === 'Display|Text size|Host' && !gone.group && gone.active && returns.length === 1 && returns[0][1]?.intent === 'host-controls' && got.length === 0;
      return { ok, none, off, on, gone, returns };
    });
    await check('focus: the switch and the chosen size keep their elements and the focus through updates and a new text size', async () => {
      const s = mount('page');
      const t = s.toggle(), large = s.size('1.5');
      t.focus();
      s.m.settings.update({ reducedMotion: true });
      s.m.settings.update({ reducedMotion: false, motionLock: null });
      const switchKept = s.toggle() === t && document.activeElement === t;
      large.focus();
      // Frontend applies the new size to the page's text, then gives it back.
      document.documentElement.style.fontSize = '150%';
      s.m.settings.update({ textScale: 1.5 });
      await frames();
      const sizeKept = s.size('1.5') === large && document.activeElement === large && large.getAttribute('aria-checked') === 'true';
      document.documentElement.style.fontSize = '';
      disposeState(s.m);
      return { ok: switchKept && sizeKept, switchKept, sizeKept };
    });
    await check('words: the page is a group named "Display"; the switch is a switch named "Reduce motion"; the sizes a radio group named "Text size"; Menu', async () => {
      const s = mount('page');
      const t = s.toggle(), seg = s.q('.ms-k-seg');
      const seen = { page: [s.root.getAttribute('role'), s.root.getAttribute('aria-label')], toggle: [t.getAttribute('role'), t.getAttribute('aria-label')], seg: [seg.getAttribute('role'), seg.getAttribute('aria-label')],
        radios: [...seg.children].map(b => `${b.getAttribute('role')}:${b.textContent}:${b.getAttribute('aria-checked')}`), back: s.back().textContent.trim(), title: s.q('.ms-ep-nav-title').textContent, note: s.q('.ms-k-group-note').textContent };
      disposeState(s.m);
      const ok = seen.page.join() === 'group,Display' && seen.toggle.join() === 'switch,Reduce motion' && seen.seg.join() === 'radiogroup,Text size'
        && seen.radios.join('|') === 'radio:Standard:true|radio:Large:false|radio:Largest:false' && seen.back === 'Menu' && seen.title === 'Display' && seen.note === SETTINGS_WORDS.note;
      return { ok, seen };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the page under the safe areas, its options 16 px in; layout() and onLayout agree`, async () => {
        size = sizeTo(sizeKey);
        const s = mount('page');
        await frames();
        const l = s.m.settings.layout();
        const r = s.root.getBoundingClientRect(), nav = s.q('.ms-ep-nav').getBoundingClientRect(), list = s.q('.ms-k-list').getBoundingClientRect();
        const reported = named(s.calls, 'onLayout').at(-1)?.[1] ?? null;
        const seen = { navTop: nav.top - r.top, listLeft: list.left - r.left, listRight: r.right - list.right, layout: l, reported };
        disposeState(s.m);
        const ok = seen.navTop >= size.insets.top && seen.navTop <= size.insets.top + 8.5 && Math.abs(seen.listLeft - 16) < 0.5 && Math.abs(seen.listRight - 16) < 0.5
          && l.size.width === size.width && l.size.height === size.height && l.safe.top === size.insets.top && l.safe.bottom === size.insets.bottom && JSON.stringify(reported) === JSON.stringify(l);
        return { ok, seen };
      });
    }
    size = sizeTo('390x844');
    for (const [which, text, stacked] of [['page-large', 150, false], ['page-largest', 200, true], ['sheet-largest', 200, true]]) {
      await check(`layout: ${which.startsWith('page') ? 'the page' : 'the sheet'} with the ${text === 150 ? 'Large' : 'Largest'} text (${text} %): the sizes ${stacked ? 'one a row' : 'side by side'}, every word whole, every control reachable`, async () => {
        document.documentElement.style.fontSize = `${text}%`;
        const s = mount(which);
        await frames();
        const seg = s.q('.ms-k-seg');
        const asRows = seg.children[1].getBoundingClientRect().top > seg.children[0].getBoundingClientRect().bottom - 0.5;
        const words = [...s.root.querySelectorAll('.ms-k-row-title, .ms-k-row-sub, .ms-k-seg-label, .ms-k-group-label, .ms-k-group-note, .ms-ep-nav-title')];
        const cut = words.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const scroller = which.startsWith('page') ? s.q('.ms-ep-screen') : s.m.shell.sheetBody;
        const last = s.hostRow() ?? s.q('.ms-k-group-note');
        last.scrollIntoView({ block: 'end' });
        await frames();
        const v = scroller.getBoundingClientRect(), lr = last.getBoundingClientRect();
        const reachable = lr.bottom <= v.bottom + 0.5 && lr.top >= v.top - 0.5;
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: asRows === stacked && cut.length === 0 && reachable, asRows, cut, reachable };
      });
    }
    await check('text later: the page mounted at the Standard text, then the Largest set with its size chosen and the phone\'s lock opened, lays out as a page mounted at the Largest with them (kit 0.8.1 followTextSize)', async () => {
      const html = document.documentElement.style;
      const later = { textScale: 2, reducedMotion: true, motionLock: LOCK };
      const boxes = p => {
        const f = p.root.getBoundingClientRect();
        return [...p.root.querySelectorAll('button, .ms-k-row, .ms-k-list, .ms-k-seg, .ms-k-seg-btn, .ms-k-switch, h1, h2, p')].filter(n => n.getClientRects().length)
          .map(n => { const r = n.getBoundingClientRect(); return [r.top - f.top, r.left - f.left, r.width, r.height].map(v => Math.round(v * 100) / 100); });
      };
      html.fontSize = '100%';
      const late = mount('page');
      await frames();
      html.fontSize = '200%';
      await frames();
      late.m.settings.update(later);
      await frames(); await frames();
      const after = boxes(late);
      disposeState(late.m);
      // The same input given before the first layout: a page mounted at the Largest with it.
      const fresh = mount('page');
      fresh.m.settings.update(later);
      await frames(); await frames();
      const want = boxes(fresh);
      disposeState(fresh.m);
      html.fontSize = '';
      return { ok: after.length > 0 && JSON.stringify(after) === JSON.stringify(want), after, want };
    });

    await check('dispose: safe twice; afterwards nothing is left, nothing fires, and the page\'s layout() is null', async () => {
      const p = mount('page');
      const t = p.toggle();
      p.m.settings.dispose(); p.m.settings.dispose();
      tap(t);
      p.m.settings.update({ reducedMotion: true });
      const page = { left: frame.children.length, layout: p.m.settings.layout(), calls: reports(p.calls).length, connected: p.root.isConnected };
      const s = mount('sheet-host');
      const body = s.m.shell.sheetBody, row = s.hostRow();
      s.m.settings.dispose(); s.m.settings.dispose();
      tap(row);
      const sheet = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected };
      disposeState(s.m);
      return { ok: page.left === 0 && page.layout === null && page.calls === 0 && !page.connected && sheet.body === 0 && sheet.calls === 0 && !sheet.connected && frame.children.length === 0, page, sheet };
    });
  }
  await check(`motion: the switch's thumb ${deviceReduced ? 'slides in 80 ms with the device\'s Reduce motion' : 'slides in 220 ms, and in 80 ms with the game\'s Reduce motion'}`, async () => {
    const s = mount('page');
    const ms = () => getComputedStyle(s.toggle(), '::after').transitionDuration;
    const first = ms();
    s.m.settings.update({ reducedMotion: true });
    const reduced = ms();
    disposeState(s.m);
    return { ok: deviceReduced ? first === '0.08s' && reduced === '0.08s' : first === '0.22s' && reduced === '0.08s', first, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

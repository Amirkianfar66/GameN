// mothership:dev-only
//
// Character selection's lifecycle probe: it drives the real component (../character-select.mjs) in the
// browser, under whatever headers serve the page (design/tools/character-select-check.mjs serves the
// production ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   choose    a tap on a free character reports onChoose(id); on another while one is this phone's too; on
//             this phone's own, nothing; the keyboard as the finger
//   refused   a taken one, a closed one, a free one while choosing is not offered, this phone's while saving,
//             and every one while reconnecting, concealed or not interactive takes no tap, keeps its focus,
//             and says why; only what is taken or closed is dimmed
//   focus     each cell keeps its element and the focus through clock ticks, changes of holder and a new
//             order; a cell that ends moves the focus to the screen and reports it once (onFocusReturn)
//   private   a new viewer drops this phone's choice, its saving state, the offer and the toast; concealed
//             drops them too; what the same update gives the new viewer is kept
//   time      the clock shows what it is given, amber from 0:05; no clock without one; the clock reaching
//             0:00 is not "Time is up"; only `closed` is
//   words     the accessible names, the grid's group, and the foot's line said as it changes; once time is
//             up, the foot invites no tap the screen refuses
//   layout    the grid 12 px under the bar, the foot 16 px above the bottom safe area, at both sizes; a
//             change reported; at the Larger texts every name whole and the foot reachable
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    the saving spinner turns, and stands still with Reduce motion (the game's, or the device's)
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { mountCharacterSelect, CHOOSE_WORDS } from '../character-select.mjs';
import { RECONNECTING } from '../../phone-shell/phone-shell.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runCharacterSelectProbe({ sizes, choiceOf, characters }) {
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
  /** A screen with every callback recorded. */
  const mount = (input = {}, extra = {}) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const handlers = Object.fromEntries(['onChoose', 'onRetry', 'onFocusReturn', 'onLayout'].map(n => [n, record(n)]));
    const screen = mountCharacterSelect(frame, { ...choiceOf(input), insets: size.insets }, { ...handlers, ...extra });
    const q = s => screen.element.querySelector(s);
    return { screen, calls, root: screen.element, q, cell: id => q(`.ms-cs-grid [data-value="${id}"]`) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const key = (node, k) => { node.focus(); node.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); if (['Enter', ' '].includes(k)) node.click(); };
  const cellState = node => ({ state: node.dataset.state, refused: node.getAttribute('aria-disabled') === 'true', busy: node.getAttribute('aria-busy') === 'true', pressed: node.getAttribute('aria-pressed'),
    note: node.querySelector('.ms-k-cell-note')?.hidden ? '' : node.querySelector('.ms-k-cell-note')?.textContent ?? '', why: describedBy(node), label: node.getAttribute('aria-label') });
  const footOf = s => ({ name: s.q('.ms-cs-name').textContent, line: s.q('.ms-cs-line').textContent.trim(), spinner: !!s.q('.ms-cs-line .ms-k-spinner'), pill: s.q('.ms-cs-foot .ms-k-pill')?.textContent ?? null,
    empty: !!s.q('.ms-cs-foot > .ms-k-pt-empty') });
  const toastOf = s => s.q('.ms-ps-toast')?.textContent ?? null;
  const timerOf = s => { const t = s.q('.ms-ps-timer'); return t && !t.hidden && t.getClientRects().length ? { text: t.textContent.trim(), urgent: t.hasAttribute('data-urgent') } : null; };
  const subOf = s => s.q('.ms-ps-sub')?.textContent ?? null;
  const NOVA = { id: 'c6', state: 'confirmed' };

  if (mode === 'full') {
    await check('choose: a free character reports onChoose(id), once per tap; the keyboard as the finger', async () => {
      const s = mount({ holders: { c4: 2, c8: 1 } });
      tap(s.cell('c1'));
      key(s.cell('c5'), 'Enter');
      const calls = named(s.calls, 'onChoose');
      s.screen.dispose();
      return { ok: JSON.stringify(calls) === JSON.stringify([['onChoose', 'c1'], ['onChoose', 'c5']]), calls };
    });
    await check('choose: another free character while one is this phone\'s reports it; this phone\'s own reports nothing', async () => {
      const s = mount({ mine: NOVA });
      tap(s.cell('c6'));
      key(s.cell('c6'), ' ');
      const own = named(s.calls, 'onChoose').length;
      tap(s.cell('c1'));
      const calls = named(s.calls, 'onChoose');
      const mine = cellState(s.cell('c6'));
      s.screen.dispose();
      // This phone's own is not dimmed or refused: it simply changes nothing (sheet 16: "Tap another to change").
      return { ok: own === 0 && JSON.stringify(calls) === JSON.stringify([['onChoose', 'c1']]) && !mine.refused && mine.state === 'confirmed', own, calls, mine };
    });
    await check('refused: a taken character is dimmed, refused, keeps its focus and says who holds it', async () => {
      const s = mount({ holders: { c4: 2, c8: 1 } });
      const node = s.cell('c4');
      node.focus();
      tap(node);
      key(node, 'Enter');
      const seen = cellState(node);
      const ok = named(s.calls, 'onChoose').length === 0 && document.activeElement === node && seen.state === 'taken' && seen.refused && seen.why === 'Taken by player 2'
        && seen.note === 'Taken · 2' && seen.label === `${characters[3].name}, taken by player 2`;
      s.screen.dispose();
      return { ok, seen };
    });
    await check('refused: Time is up (closed) dims and refuses every character but this phone\'s, with its reason', async () => {
      const s = mount({ mine: { id: 'c7', state: 'assigned' }, closed: true, time: 0 });
      for (const c of characters) tap(s.cell(c.id));
      const all = characters.map(c => ({ id: c.id, ...cellState(s.cell(c.id)) }));
      const others = all.filter(c => c.id !== 'c7'), mine = all.find(c => c.id === 'c7'), sub = subOf(s);
      const ok = named(s.calls, 'onChoose').length === 0 && others.every(c => c.state === 'taken' && c.refused && (c.why === CHOOSE_WORDS.closed || /^Taken by player \d$/.test(c.why)))
        && others.filter(c => c.why === CHOOSE_WORDS.closed).length === 3 && mine.state === 'confirmed' && !mine.refused && mine.note === CHOOSE_WORDS.assignedNote && sub === CHOOSE_WORDS.closed;
      s.screen.dispose();
      return { ok, all, sub };
    });
    await check('refused: while choosing is not offered, a free character is refused with Frontend\'s reason, not dimmed', async () => {
      const s = mount({ holders: { c4: 2 }, choose: { enabled: false, reason: 'Opens when every seat is filled' } });
      tap(s.cell('c1'));
      const seen = cellState(s.cell('c1'));
      const without = (() => { s.screen.update({ choose: { enabled: false } }); return cellState(s.cell('c1')); })();
      s.screen.update({ choose: { enabled: true } });
      tap(s.cell('c1'));
      const calls = named(s.calls, 'onChoose');
      s.screen.dispose();
      return { ok: seen.state === 'available' && seen.refused && seen.why === 'Opens when every seat is filled' && without.refused && without.why === null
        && JSON.stringify(calls) === JSON.stringify([['onChoose', 'c1']]), seen, without, calls };
    });
    await check('refused: this phone\'s choice while saving is busy and takes no tap; the others still report', async () => {
      const s = mount({ mine: { id: 'c6', state: 'saving' } });
      tap(s.cell('c6'));
      const seen = cellState(s.cell('c6'));
      tap(s.cell('c1'));
      const calls = named(s.calls, 'onChoose');
      s.screen.dispose();
      return { ok: seen.state === 'selected' && seen.busy && seen.pressed === 'true' && seen.note === CHOOSE_WORDS.saving && JSON.stringify(calls) === JSON.stringify([['onChoose', 'c1']]), seen, calls };
    });
    await check('refused: reconnecting, every cell refused with the banner\'s words, nothing dimmed; Retry reported', async () => {
      const s = mount({ holders: { c4: 2 }, status: 'stale' });
      for (const c of characters) tap(s.cell(c.id));
      const free = cellState(s.cell('c1'));
      const banner = s.q('.ms-ps-banner');
      tap(banner?.querySelector('[data-intent="retry"]'));
      const ok = named(s.calls, 'onChoose').length === 0 && free.state === 'available' && free.refused && free.why === RECONNECTING.sub && !!banner && named(s.calls, 'onRetry').length === 1;
      s.screen.dispose();
      return { ok, free, banner: banner?.textContent ?? null, calls: s.calls };
    });
    await check('refused: not interactive, every cell refused, nothing dimmed; taps come back with the input', async () => {
      const s = mount({ holders: { c4: 2 }, interactive: false });
      tap(s.cell('c1'));
      const seen = cellState(s.cell('c1'));
      s.screen.update({ interactive: true });
      tap(s.cell('c1'));
      const calls = named(s.calls, 'onChoose');
      s.screen.dispose();
      return { ok: seen.state === 'available' && seen.refused && JSON.stringify(calls) === JSON.stringify([['onChoose', 'c1']]), seen, calls };
    });
    await check('focus: a cell keeps its element and the focus through clock ticks, changes of holder, its own choice and a new order', async () => {
      const s = mount({ holders: { c4: 2 } });
      const node = s.cell('c1');
      node.focus();
      for (let i = 0; i < 8; i += 1) s.screen.update({ timer: { remainingMs: 21000 - i * 250 }, holders: { c4: 2, ...(i > 3 ? { c2: 8 } : {}) } });
      s.screen.update({ mine: { id: 'c1', state: 'saving' } });
      s.screen.update({ mine: { id: 'c1', state: 'confirmed' } });
      const same = s.cell('c1') === node && document.activeElement === node;
      s.screen.update({ characters: [...characters].reverse() });
      const order = [...s.q('.ms-cs-grid').children].map(n => n.dataset.value);
      const kept = s.cell('c1') === node && document.activeElement === node;
      s.screen.dispose();
      return { ok: same && kept && order.join() === [...characters].reverse().map(c => c.id).join(), same, kept, order };
    });
    await check('focus: a focused cell that ends moves the focus to the screen and reports it once (onFocusReturn)', async () => {
      const s = mount({ holders: {} });
      s.cell('c3').focus();
      s.screen.update({ characters: [] });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const ok = document.activeElement === s.root && returns.length === 1 && returns[0][1]?.intent === 'choose' && returns[0][1]?.value === 'c3' && s.q('.ms-cs-grid').children.length === 0;
      s.screen.dispose();
      return { ok, returns, active: document.activeElement?.className ?? null };
    });
    await check('private: a new viewer drops this phone\'s choice, its saving state, the offer and the toast', async () => {
      const toast = { id: 'assigned', text: CHOOSE_WORDS.assigned(characters[6].name), icon: 'info' };
      const s = mount({ mine: { id: 'c6', state: 'saving' }, toast });
      await frames();
      const before = { foot: footOf(s), toast: toastOf(s), selected: !!s.q('.ms-cs-grid [data-state="selected"]') };
      s.screen.update({ viewer: 5 });
      await frames();
      const after = { foot: footOf(s), toast: toastOf(s), selected: !!s.q('.ms-cs-grid [data-state="selected"]'), free: cellState(s.cell('c6')), offer: cellState(s.cell('c1')) };
      tap(s.cell('c1'));
      s.screen.update({ viewer: 6, mine: { id: 'c2', state: 'confirmed' }, choose: { enabled: true } });
      const given = { foot: footOf(s), mine: cellState(s.cell('c2')) };
      const ok = before.selected && before.foot.spinner && before.toast === toast.text
        && !after.selected && after.foot.name === CHOOSE_WORDS.none && after.foot.line === CHOOSE_WORDS.tapOne && !after.foot.spinner && after.foot.empty && after.toast === null
        && after.free.state === 'available' && after.offer.refused && named(s.calls, 'onChoose').length === 0
        && given.foot.name === characters[1].name && given.mine.state === 'confirmed';
      s.screen.dispose();
      return { ok, before, after, given };
    });
    await check('private: concealed drops this phone\'s choice and the toast, refuses every tap, and nothing comes back by itself', async () => {
      const s = mount({ mine: NOVA, toast: { id: 't', text: 'Assigned: Nova' } });
      s.screen.update({ status: 'concealed' });
      await frames();
      tap(s.cell('c1'));
      const hidden = { foot: footOf(s), toast: toastOf(s), mine: cellState(s.cell('c6')), free: cellState(s.cell('c1')), taken: cellState(s.cell('c4')) };
      s.screen.update({ mine: NOVA });
      const offered = footOf(s).name;
      s.screen.update({ status: 'live' });
      const shown = footOf(s).name;
      const ok = hidden.foot.name === CHOOSE_WORDS.none && hidden.toast === null && hidden.mine.state === 'available' && hidden.free.refused && hidden.taken.note === 'Taken · 2'
        && named(s.calls, 'onChoose').length === 0 && offered === CHOOSE_WORDS.none && shown === CHOOSE_WORDS.none;
      s.screen.dispose();
      return { ok, hidden, offered, shown };
    });
    await check('time: the clock shows what it is given, amber from 0:05; none without one; 0:00 alone is not "Time is up"', async () => {
      const s = mount({ time: 21 });
      const seen = [timerOf(s)];
      for (const ms of [5200, 5000, 4000, 0]) { s.screen.update({ timer: { remainingMs: ms } }); seen.push(timerOf(s)); }
      const atZero = { sub: subOf(s), free: cellState(s.cell('c1')) };
      s.screen.update({ timer: null });
      const none = timerOf(s);
      s.screen.update({ closed: true });
      const closed = { sub: subOf(s), free: cellState(s.cell('c1')) };
      const texts = seen.map(t => `${t.text}${t.urgent ? '!' : ''}`).join(' ');
      const ok = texts === '0:21 0:06 0:05! 0:04! 0:00!' && atZero.sub === CHOOSE_WORDS.sub && atZero.free.state === 'available' && !atZero.free.refused
        && none === null && closed.sub === CHOOSE_WORDS.closed && closed.free.state === 'taken' && closed.free.refused;
      s.screen.dispose();
      return { ok, texts, atZero, none, closed };
    });
    await check('words: once time is up, the foot invites no tap it refuses; assigned and saving keep their words', async () => {
      const s = mount({ mine: NOVA });
      const before = footOf(s);
      s.screen.update({ closed: true, timer: { remainingMs: 0 } });
      const chosen = footOf(s);
      s.screen.update({ mine: null });
      const none = footOf(s);
      s.screen.update({ mine: { id: 'c7', state: 'assigned' } });
      const assigned = footOf(s);
      s.screen.update({ mine: { id: 'c6', state: 'saving' } });
      const saving = footOf(s);
      s.screen.update({ closed: false, mine: null });
      const open = footOf(s);
      const ok = before.line === CHOOSE_WORDS.change && chosen.name === characters[5].name && chosen.line === CHOOSE_WORDS.closed && chosen.pill === CHOOSE_WORDS.yours && !chosen.empty
        && none.name === CHOOSE_WORDS.none && none.line === CHOOSE_WORDS.closed && none.empty
        && assigned.line === CHOOSE_WORDS.auto && saving.line === CHOOSE_WORDS.savingLine && saving.spinner && open.line === CHOOSE_WORDS.tapOne;
      s.screen.dispose();
      return { ok, before, chosen, none, assigned, saving, open };
    });
    await check('words: the cells\' names, the grid\'s group, this phone\'s own pressed, and the foot\'s line said as it changes', async () => {
      const s = mount({ mine: { id: 'c6', state: 'saving' } });
      const grid = s.q('.ms-cs-grid');
      const names = characters.map(c => s.cell(c.id).getAttribute('aria-label'));
      const pressed = characters.filter(c => s.cell(c.id).getAttribute('aria-pressed') === 'true').map(c => c.id);
      const line = s.q('.ms-cs-line');
      const saving = footOf(s);
      s.screen.update({ mine: NOVA });
      const confirmed = footOf(s);
      s.screen.update({ mine: { id: 'c7', state: 'assigned' }, closed: true });
      const assigned = footOf(s);
      const ok = grid.getAttribute('role') === 'group' && grid.getAttribute('aria-label') === CHOOSE_WORDS.group && names[5] === `${characters[5].name}, yours` && names[0] === characters[0].name
        && names[3] === `${characters[3].name}, taken by player 2` && pressed.join() === 'c6' && line.getAttribute('aria-live') === 'polite'
        && saving.spinner && saving.line === CHOOSE_WORDS.savingLine && saving.pill === null
        && confirmed.line === CHOOSE_WORDS.change && confirmed.pill === CHOOSE_WORDS.yours && !confirmed.spinner
        && assigned.name === characters[6].name && assigned.line === CHOOSE_WORDS.auto && assigned.pill === null;
      s.screen.dispose();
      return { ok, names, pressed, saving, confirmed, assigned };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the grid 12 px under the bar and 16 px in, the foot 16 px above the bottom safe area; layout() and onLayout agree`, async () => {
        size = sizeTo(sizeKey);
        const s = mount({ mine: NOVA });
        await frames();
        const l = s.screen.layout();
        const r = s.root.getBoundingClientRect(), g = s.q('.ms-cs-grid').getBoundingClientRect(), f = s.q('.ms-cs-foot').getBoundingClientRect();
        const reported = named(s.calls, 'onLayout').at(-1)?.[1] ?? null;
        const seen = { gridTop: g.top - r.top - l.bars.top, gridLeft: g.left - r.left, gridRight: r.right - g.right, footBottom: r.bottom - f.bottom - size.insets.bottom, layout: l, reported };
        const ok = Math.abs(seen.gridTop - 12) < 0.5 && Math.abs(seen.gridLeft - 16) < 0.5 && Math.abs(seen.gridRight - 16) < 0.5 && Math.abs(seen.footBottom - 16) < 0.5
          && l.size.width === size.width && l.size.height === size.height && l.safe.top === size.insets.top && l.safe.bottom === size.insets.bottom && JSON.stringify(reported) === JSON.stringify(l);
        s.screen.dispose();
        return { ok, seen };
      });
    }
    size = sizeTo('390x844');
    for (const [text, list] of [[150, false], [200, true]]) {
      await check(`layout: with the ${text === 150 ? 'Large' : 'Largest'} text (${text} %), every name whole${list ? ', the nine as a list' : ''}, and the foot in view or reached by scrolling`, async () => {
        document.documentElement.style.fontSize = `${text}%`;
        const s = mount({ mine: NOVA });
        await frames();
        const grid = s.q('.ms-cs-grid'), screen = s.q('.ms-cs-screen');
        const labels = [...grid.querySelectorAll('.ms-k-cell-label')];
        const cut = labels.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const asList = grid.children[1].getBoundingClientRect().top > grid.children[0].getBoundingClientRect().bottom - 0.5;
        const scrolls = screen.scrollHeight > screen.clientHeight + 0.5;
        screen.scrollTop = screen.scrollHeight;
        await frames();
        const foot = s.q('.ms-cs-foot').getBoundingClientRect(), view = screen.getBoundingClientRect();
        const footSeen = foot.bottom <= view.bottom + 0.5 && foot.top >= view.top - 0.5;
        document.documentElement.style.fontSize = '';
        s.screen.dispose();
        return { ok: cut.length === 0 && asList === list && footSeen, cut, asList, scrolls, footSeen };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left, nothing fires, layout() is null and update() is ignored', async () => {
      const s = mount({});
      const node = s.cell('c1');
      s.screen.dispose();
      s.screen.dispose();
      tap(node);
      s.screen.update({ mine: NOVA });
      return { ok: frame.children.length === 0 && s.screen.layout() === null && named(s.calls, 'onChoose').length === 0 && !s.root.isConnected, left: frame.children.length };
    });
  }
  await check(`motion: the saving spinner ${deviceReduced ? 'stands still with the device\'s Reduce motion' : 'turns, and stands still with the game\'s Reduce motion'}`, async () => {
    const s = mount({ mine: { id: 'c6', state: 'saving' } });
    const spin = () => getComputedStyle(s.q('.ms-cs-line .ms-k-spinner')).animationName;
    const first = spin();
    s.screen.update({ reducedMotion: true });
    const reduced = spin();
    s.screen.dispose();
    return { ok: deviceReduced ? first === 'none' && reduced === 'none' : first !== 'none' && reduced === 'none', first, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

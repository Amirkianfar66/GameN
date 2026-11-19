// mothership:dev-only
//
// Panels' lifecycle probe: it drives the real component (../panels.mjs) in the real phone shell's sheet, in the
// browser, under whatever headers serve the page (design/tools/panels-check.mjs serves the production ones), and
// reports what it saw. Each check is one behaviour Frontend relies on (the Lead's answers on #296):
//   report    each row reports its destination, and only that; the keyboard as the finger
//   refuse    a destination this player can't use is dimmed and refused, its line unchanged, Frontend's reason as its
//             description; only Frontend's `enabled` decides it, never the line; a destination not given has no row
//   windows   the windows as given; none, "No window here", still enabled and opening Windows
//   reconnect the rows keep taking taps while reconnecting; a destination not enabled stays refused;
//             `interactive: false` refuses everything and dims nothing more
//   players   the line: the room, then Injured or Eliminated; "In Jail" in the room's place when jailed; with no room,
//             the health word alone; "(you)" from the viewer; the Captain's and the Officer's paper badges
//   privacy   a player takes only the public facts: a role or a revealed faction is refused, never drawn
//   steps     the ruleset's steps in Frontend's order and words, the icon by kind, an unknown kind the Round order
//             icon; no note, and no step words of its own
//   focus     each row keeps its element and the focus; a focus in what ends returns to the content, reported once
//   words     the content's name for each view, and the sheet's frame from panelsSheet()
//   layout    the lists 16 px in, at both sizes; at the Largest text every word whole and the last part reachable
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own, with or without Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { panelsSheet, PANELS_WORDS, ROUND_STEP_ICONS } from '../panels.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runPanelsProbe({ sizes, mountState, disposeState, inputOf, playersOf, OTHERS_IN_JAIL, STEPS, REFUSED }) {
  const W = PANELS_WORDS;
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
    const m = mountState(frame, 'list', size.insets, Object.fromEntries(['onOpen', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    if (Object.keys(shellExtra).length) m.shell.update(shellExtra);
    const root = m.host.element;
    const q = s => root.querySelector(s);
    const update = (next, extra = {}) => { current = { ...current, ...next }; m.host.update(next); m.shell.update({ sheet: panelsSheet(current), ...extra }); };
    return { m, calls, root, q, update, row: value => q(`[data-intent="open"][data-value="${value}"]`), seat: n => q(`[data-seat="${n}"]`) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const reports = calls => calls.filter(c => c[0] === 'onOpen');
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const key = node => { node.focus(); node.click(); };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const dimmed = node => node.hasAttribute('data-off');
  // A destination is a cell (the kit's tile: its name and note); Players' seats and Round order's steps are rows.
  const line = node => { const sub = node?.querySelector('.ms-k-tile-note, .ms-k-row-sub'); return sub && !sub.hidden ? sub.textContent : null; };
  const title = node => node?.querySelector('.ms-k-tile-name, .ms-k-row-title')?.textContent ?? null;
  const ALL = ['windows', 'navigation', 'hospital', 'players', 'round-order'];

  if (mode === 'full') {
    await check('report: each row reports its destination, and only that; the keyboard as the finger', async () => {
      const s = mount(inputOf({ navigation: { enabled: true }, hospital: { enabled: true } }));
      tap(s.row('windows')); key(s.row('navigation')); tap(s.row('hospital')); key(s.row('players')); tap(s.row('round-order'));
      const got = s.calls.filter(c => c[0] !== 'onFocusReturn');
      disposeState(s.m);
      return { ok: JSON.stringify(got) === JSON.stringify(ALL.map(d => ['onOpen', d])), got };
    });
    await check('refuse: a destination this player can\'t use is dimmed and refused, its line unchanged, Frontend\'s reason as its description', async () => {
      const s = mount();
      const nav = s.row('navigation'), hosp = s.row('hospital');
      tap(nav); tap(hosp); key(nav);
      const seen = { nav: { refused: refused(nav), dimmed: dimmed(nav), line: line(nav), why: describedBy(nav) }, hosp: { refused: refused(hosp), dimmed: dimmed(hosp), line: line(hosp), why: describedBy(hosp) },
        windows: refused(s.row('windows')) || dimmed(s.row('windows')), views: refused(s.row('players')) || refused(s.row('round-order')) };
      const before = reports(s.calls).length;
      s.update({ navigation: { enabled: true } });
      const after = { refused: refused(nav), dimmed: dimmed(nav), line: line(nav), why: describedBy(nav), same: s.row('navigation') === nav };
      tap(nav);
      const got = reports(s.calls);
      disposeState(s.m);
      const ok = seen.nav.refused && seen.nav.dimmed && seen.nav.line === W.navigationLine && seen.nav.why === REFUSED.navigation
        && seen.hosp.refused && seen.hosp.dimmed && seen.hosp.line === W.hospitalLine && seen.hosp.why === REFUSED.hospital && !seen.windows && !seen.views
        && before === 0 && !after.refused && !after.dimmed && after.line === W.navigationLine && after.why === null && after.same && JSON.stringify(got) === JSON.stringify([['onOpen', 'navigation']]);
      return { ok, seen, before, after, got };
    });
    await check('refuse: only Frontend\'s `enabled` decides, never the line; a destination not given has no row', async () => {
      // The Captain's Navigation, a patient's Hospital panel: open as Frontend says, the lines the same words.
      const s = mount(inputOf({ navigation: { enabled: true }, hospital: { enabled: true } }));
      const open = ['navigation', 'hospital'].map(d => ({ d, refused: refused(s.row(d)), line: line(s.row(d)) }));
      s.update({ navigation: null, hospital: null });
      const gone = { navigation: !!s.row('navigation'), hospital: !!s.row('hospital'), windows: !!s.row('windows') };
      s.update({ windows: null });
      // One grid of cells (the owner, 19 November): with none of the three given, it holds Players and Round order alone.
      const none = { cells: [...s.q('.ms-pn-tiles').children].map(n => n.dataset.value), rows: [...s.root.querySelectorAll('[data-intent="open"]')].map(n => n.dataset.value) };
      s.update({ windows: { enabled: true, rooms: [['Room A', 'Room B']] }, navigation: { enabled: false } });
      const back = [...s.root.querySelectorAll('[data-intent="open"]')].map(n => n.dataset.value);
      disposeState(s.m);
      const ok = open.every(o => !o.refused) && open[0].line === W.navigationLine && open[1].line === W.hospitalLine && !gone.navigation && !gone.hospital && gone.windows
        && none.cells.join() === 'players,round-order' && none.rows.join() === 'players,round-order' && back.join() === 'windows,navigation,players,round-order';
      return { ok, open, gone, none, back };
    });
    await check('windows: the windows as given; none, "No window here", still enabled and opening Windows; dimmed only when Frontend says', async () => {
      const s = mount();
      const pairs = line(s.row('windows'));
      s.update({ windows: { enabled: true, rooms: [] } });
      const none = { line: line(s.row('windows')), refused: refused(s.row('windows')), dimmed: dimmed(s.row('windows')) };
      tap(s.row('windows'));
      s.update({ windows: { enabled: false, rooms: [], reason: 'Not now' } });
      const off = { refused: refused(s.row('windows')), dimmed: dimmed(s.row('windows')), why: describedBy(s.row('windows')) };
      tap(s.row('windows'));
      const got = reports(s.calls);
      disposeState(s.m);
      const ok = pairs === 'Room A ↔ Room B · Room A ↔ Hospital' && none.line === 'No window here' && !none.refused && !none.dimmed && off.refused && off.dimmed && off.why === 'Not now'
        && JSON.stringify(got) === JSON.stringify([['onOpen', 'windows']]);
      return { ok, pairs, none, off, got };
    });
    await check('reconnect: the rows keep taking taps; a destination not enabled stays refused; not interactive, all refused and nothing more dimmed', async () => {
      const s = mount(inputOf({ status: 'stale' }), { status: 'stale', banner: { kind: 'reconnecting' } });
      for (const d of ALL) tap(s.row(d));
      const stale = { got: reports(s.calls).map(c => c[1]), dimmed: ALL.filter(d => dimmed(s.row(d))) };
      s.update({ status: 'live', interactive: false });
      const off = { refused: ALL.filter(d => refused(s.row(d))), dimmed: ALL.filter(d => dimmed(s.row(d))) };
      const before = reports(s.calls).length;
      for (const d of ALL) tap(s.row(d));
      const after = reports(s.calls).length;
      disposeState(s.m);
      const ok = stale.got.join() === 'windows,players,round-order' && stale.dimmed.join() === 'navigation,hospital' && off.refused.join() === ALL.join() && off.dimmed.join() === 'navigation,hospital' && after === before;
      return { ok, stale, off, before, after };
    });
    await check('players: the room, then Injured or Eliminated; "In Jail" in the room\'s place; no room, the health word alone; "(you)" from the viewer', async () => {
      const people = [
        { seat: 1, name: 'Ava', character: 'c8', location: 'Room A', health: 'Healthy', jailed: false, captain: false, officer: false },
        { seat: 2, name: 'Ben', character: 'c4', location: 'Hospital', health: 'Injured', jailed: false, captain: true, officer: false },
        { seat: 3, name: 'Cleo', character: 'c6', location: 'Jail', health: 'Healthy', jailed: true, captain: false, officer: true },
        { seat: 4, name: 'Dev', character: 'c1', location: 'Jail', health: 'Injured', jailed: true, captain: false, officer: false },
        { seat: 5, name: 'Eli', character: 'c3', location: null, health: 'Eliminated', jailed: false, captain: false, officer: false },
        { seat: 6, name: 'Fay', character: 'c9', location: 'Room B', health: 'Eliminated', jailed: false, captain: false, officer: false },
        { seat: 7, name: 'Gus', character: 'c5', location: null, health: 'Healthy', jailed: false, captain: false, officer: false },
      ];
      const s = mount(inputOf({ view: 'players', players: people }));
      const rows = people.map(p => ({ title: title(s.seat(p.seat)), line: line(s.seat(p.seat)) }));
      const badges = people.map(p => [...s.seat(p.seat).querySelectorAll('.ms-k-pill')].map(b => [b.textContent, b.dataset.tone, !!b.querySelector('svg')].join(':')).join('|'));
      const buttons = s.root.querySelectorAll('button, [data-intent]').length;
      s.update({ viewer: 1 });
      const viewer = [title(s.seat(1)), title(s.seat(4))];
      disposeState(s.m);
      const want = [['1 · Ava', 'Room A'], ['2 · Ben', 'Hospital · Injured'], ['3 · Cleo', 'In Jail'], ['4 · Dev (you)', 'In Jail · Injured'], ['5 · Eli', 'Eliminated'], ['6 · Fay', 'Room B · Eliminated'], ['7 · Gus', null]];
      const ok = JSON.stringify(rows.map(r => [r.title, r.line])) === JSON.stringify(want) && badges.join('/') === '/Captain:paper:true/Officer:paper:true////'
        && buttons === 0 && viewer.join('|') === '1 · Ava (you)|4 · Dev';
      return { ok, rows, badges, buttons, viewer };
    });
    await check('privacy: a player takes only the public facts; a role or a revealed faction is refused, never drawn', async () => {
      const refusedKeys = [];
      for (const extra of [{ role: 'Doctor' }, { revealedFaction: 'Red' }, { team: 'Blue' }]) {
        const people = playersOf().map(p => (p.seat === 3 ? { ...p, ...extra } : p));
        try { mountState(frame, 'list', size.insets, {}, { input: inputOf({ view: 'players', players: people }) }); } catch (error) { if (new RegExp(`not ${Object.keys(extra)[0]}`).test(String(error))) refusedKeys.push(Object.keys(extra)[0]); }
        frame.replaceChildren();
      }
      const s = mount(inputOf({ view: 'players' }));
      let updateRefused = false;
      try { s.m.host.update({ players: playersOf().map(p => ({ ...p, role: 'Hacker' })) }); } catch { updateRefused = true; }
      const page = document.documentElement.outerHTML;
      const kept = s.root.querySelectorAll('.ms-k-row').length;
      disposeState(s.m);
      const ok = refusedKeys.join() === 'role,revealedFaction,team' && updateRefused && !/Hacker|Doctor/.test(page) && kept === 9;
      return { ok, refusedKeys, updateRefused, kept };
    });
    await check('steps: the ruleset\'s steps in Frontend\'s order and words, the icon by kind, an unknown kind the Round order icon; no note, no words of its own', async () => {
      const s = mount();
      // The Round order icon, from the Panels list's own Round order row.
      const rulesIcon = s.row('round-order').querySelector('.ms-k-tile-icon').dataset.icon; // the icon's name: a painted drawing carries its own ids (kit 0.9.0)
      s.update({ view: 'round-order' });
      const rows = [...s.q('.ms-pn-steps').children].map(li => ({ kind: li.firstChild.dataset.kind, title: title(li.firstChild), line: line(li.firstChild) }));
      const pack = rows.map((r, i) => r.title === STEPS[i].title && r.line === STEPS[i].timing && r.kind === STEPS[i].kind).every(Boolean);
      const note = !!s.q('.ms-k-group-note');
      // Another ruleset's order, and a phase the map doesn't know.
      const other = [{ kind: 'food-supply', title: 'Food Supply', timing: null }, { kind: 'turns', title: 'Player turns', timing: '60 s each' }, { kind: 'new-phase', title: 'Something new', timing: '9 s' }];
      s.update({ steps: other });
      const items = [...s.q('.ms-pn-steps').children];
      const reordered = items.map(li => title(li.firstChild)).join('|');
      const noTiming = line(items[0].firstChild) === null;
      const unknown = s.m.host.element.querySelector('[data-kind="new-phase"] .ms-k-row-icon')?.dataset.icon;
      s.update({ steps: [] });
      const empty = { hidden: s.q('.ms-pn-steps').hidden, words: s.root.innerText.trim() };
      disposeState(s.m);
      const ok = rows.length === 6 && pack && !note && reordered === 'Food Supply|Player turns|Something new' && noTiming && !!unknown && unknown === rulesIcon
        && empty.hidden && empty.words === '' && ROUND_STEP_ICONS.navigation === 'course';
      return { ok, rows, note, reordered, noTiming, unknownIsRoundOrders: unknown === rulesIcon, empty };
    });
    await check('steps: the Round order row says "Phases and timings" only once a step has its timing, else "The phases, in order" (the Lead, 18 November)', async () => {
      const s = mount();
      const row = s.row('round-order');
      const withTimings = line(row);
      s.update({ steps: STEPS.map(x => ({ ...x, timing: null })) });
      const without = line(s.row('round-order'));
      s.update({ steps: [{ ...STEPS[0], timing: null }, STEPS[1]] });
      const some = line(s.row('round-order'));
      s.update({ steps: [] });
      const none = line(s.row('round-order'));
      const sameRow = s.row('round-order') === row && title(row) === PANELS_WORDS.roundOrder;
      disposeState(s.m);
      const ok = withTimings === PANELS_WORDS.roundOrderLine && without === PANELS_WORDS.roundOrderPhases && some === PANELS_WORDS.roundOrderLine
        && none === PANELS_WORDS.roundOrderPhases && sameRow;
      return { ok, withTimings, without, some, none, sameRow };
    });
    await check('focus: each row keeps its element and the focus; a focused destination that leaves returns the focus once', async () => {
      const s = mount(inputOf({ navigation: { enabled: true } }));
      const nav = s.row('navigation');
      nav.focus();
      s.update({ navigation: { enabled: false, reason: REFUSED.navigation } });
      s.update({ navigation: { enabled: true }, windows: { enabled: true, rooms: [] } });
      const kept = s.row('navigation') === nav && document.activeElement === nav;
      s.update({ navigation: null });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const gone = { row: !!s.row('navigation'), active: document.activeElement === s.root };
      disposeState(s.m);
      return { ok: kept && !gone.row && gone.active && returns.length === 1 && returns[0][1]?.intent === 'open' && returns[0][1]?.value === 'navigation', kept, gone, returns };
    });
    await check('focus: a focus in a view that ends returns to the content, reported once; a seat keeps its row through updates', async () => {
      const s = mount();
      s.row('players').focus();
      s.update({ view: 'players' });
      await Promise.resolve();
      await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      const eli = s.seat(5);
      s.update({ players: playersOf().map(p => (p.seat === 5 ? { ...p, health: 'Eliminated' } : p)) });
      const same = s.seat(5) === eli && line(eli) === 'Hospital · Eliminated';
      disposeState(s.m);
      return { ok: active && returns.length === 1 && returns[0][1]?.intent === 'open' && returns[0][1]?.value === 'players' && same, active, returns, same };
    });
    await check('words: the content\'s name for each view, and the sheet\'s frame from panelsSheet()', async () => {
      const s = mount();
      const frameOf = () => { const sheet = s.m.shell.element.querySelector('.ms-ps-sheet'); return { title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, back: !!sheet.querySelector('[data-intent="sheet-back"]'), detent: sheet.dataset.detent, foot: sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn').length, name: s.root.getAttribute('aria-label') }; };
      const list = frameOf();
      s.update({ view: 'players' });
      const players = frameOf();
      s.update({ view: 'round-order' });
      const order = frameOf();
      disposeState(s.m);
      const ok = list.title === 'Panels' && !list.back && list.detent === 'auto' && list.foot === 0 && list.name === 'Panels'
        && players.title === 'Players' && players.back && players.detent === 'large' && players.name === 'Players'
        && order.title === 'Round order' && order.back && order.detent === 'large' && order.name === 'Round order' && s.root.getAttribute('role') === 'group';
      return { ok, list, players, order };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the lists 16 px in, in each view`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        // The Panels list's one grid of cells, and Players' and Round order's lists.
        const inset = () => { const r = frame.getBoundingClientRect(); return [...s.root.querySelectorAll('.ms-k-list, .ms-k-tiles')].filter(n => !n.hidden).map(n => { const b = n.getBoundingClientRect(); return [b.left - r.left, r.right - b.right]; }); };
        await frames();
        const list = inset();
        s.update({ view: 'players' });
        await frames();
        const players = inset();
        s.update({ view: 'round-order' });
        await frames();
        const order = inset();
        disposeState(s.m);
        const all = [...list, ...players, ...order];
        return { ok: list.length === 1 && players.length === 1 && order.length === 1 && all.every(([l, r]) => Math.abs(l - 16) < 0.5 && Math.abs(r - 16) < 0.5), list, players, order };
      });
    }
    size = sizeTo('390x844');
    for (const [which, input] of [['the list', inputOf()], ['Players', inputOf({ view: 'players', players: playersOf(OTHERS_IN_JAIL) })], ['Round order', inputOf({ view: 'round-order' })]]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input);
        await frames();
        const words = [...s.root.querySelectorAll('.ms-k-tile-name, .ms-k-tile-note, .ms-k-row-title, .ms-k-row-sub, .ms-k-group-note, .ms-k-pill')].filter(n => n.getClientRects().length);
        const cut = words.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const pills = [...s.root.querySelectorAll('.ms-k-pill')].map(p => { const b = p.getBoundingClientRect(), r = frame.getBoundingClientRect(); return b.right <= r.right + 0.5 && b.left >= r.left - 0.5; });
        const body = s.m.shell.sheetBody, last = [...s.root.children].filter(n => !n.hidden && !n.classList.contains('ms-k-vh')).pop();
        last.scrollIntoView({ block: 'end' });
        await frames();
        const v = body.getBoundingClientRect(), l = last.getBoundingClientRect();
        const reachable = l.bottom <= v.bottom + 0.5;
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: cut.length === 0 && pills.every(Boolean) && reachable, cut, pills, reachable };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount();
      const body = s.m.shell.sheetBody;
      const row = s.row('windows');
      s.m.host.dispose(); s.m.host.dispose();
      tap(row);
      s.m.host.update({ view: 'players' });
      const seen = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected };
      disposeState(s.m);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && frame.children.length === 0, seen };
    });
  }
  await check(`motion: none of its own${deviceReduced ? ', with the device\'s Reduce motion' : ', with or without the game\'s Reduce motion'}`, async () => {
    const s = mount();
    await frames();
    const own = () => s.root.getAnimations({ subtree: true }).length;
    const first = own();
    s.update({ view: 'players' });
    const players = own();
    s.m.host.update({ reducedMotion: true });
    const reduced = { own: own(), mode: s.root.dataset.motion };
    disposeState(s.m);
    return { ok: first === 0 && players === 0 && reduced.own === 0 && reduced.mode === 'reduced', first, players, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

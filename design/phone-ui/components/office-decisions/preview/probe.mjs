// mothership:dev-only
//
// Office decisions' lifecycle probe: it drives the real component (../office-decisions.mjs) in the real phone shell's
// sheet, in the browser, under whatever headers serve the page (design/tools/office-decisions-check.mjs serves the
// production ones), and reports what it saw. Each check is one behaviour Frontend relies on (the Lead's decisions on
// #300):
//   choose    exactly the given choices can be chosen, each reporting its seat; the rest dimmed and refused, each with
//             Frontend's note only when given; the chosen one "Selected"; "You" on this player's cell
//   footer    Appoint, Block and Acknowledge are the commands, Appoint and Block naming the choice and waiting for it;
//             Skip is this phone's own and sends nothing; no ✕; the sheet's frame and footer for each view
//   words     the Captain's waiting block, the block's notice, the route's rows and the acknowledgement, with the
//             names and the move as given; the fixed words that state a rule as the pack's
//   tie       Blue and Red report the direction; refused and busy with Frontend's state
//   route     the map's places, the ship's in amber, the next step dashed only to acknowledge it, and the tie's line;
//             its name built from the given position
//   privacy   the Navigation view refused unless the viewer is the Captain or the Officer; the direction, the tie, the
//             choices and the choice leave the page on a view or viewer change and while concealed, and nothing comes
//             back by itself
//   reconnect choosing a cell and Skip still work; Appoint, Block, Acknowledge, Blue and Red wait with the banner's words
//   focus     a cell keeps its element and the focus; a focus in what ends returns to the content, once
//   layout    the content 16 px in at both sizes, the route map at 210 px; at the Largest text the 3 × 3's list form with
//             every name whole, the last part reached by scrolling and the footer in view
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own, with or without Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { OFFICE_WORDS, officeDecisionsSheet, nextOfficeDecisionsInput, OFFICE_DECISIONS_DEFAULTS } from '../office-decisions.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runOfficeDecisionsProbe({ sizes, mountState, disposeState, appointOf, blockOf, navOf, tieOf, person }) {
  const W = OFFICE_WORDS;
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
  const mount = (input = appointOf(), shellExtra = {}, key = 'appoint') => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const m = mountState(frame, key, size.insets, Object.fromEntries(['onChoose', 'onDirection', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    m.shell.update({ sheet: officeDecisionsSheet(input), ...shellExtra });
    const root = m.host.element;
    const q = s => root.querySelector(s);
    // As Frontend does: a new view or viewer holds nothing of the last one's, unless the same update gives the new one's.
    const OWN = ['choices', 'chosen', 'command', 'navigation'];
    const update = (next, extra = {}) => {
      const changed = ('viewer' in next && next.viewer !== current.viewer) || ('view' in next && next.view !== current.view);
      if (changed) current = Object.fromEntries(Object.entries(current).filter(([k]) => !OWN.includes(k) || k in next));
      current = { ...current, ...next };
      m.host.update(next);
      m.shell.update({ sheet: officeDecisionsSheet(current), ...extra });
    };
    return { m, calls, root, q, update, footer: () => [...m.shell.element.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')],
      cell: seat => q(`.ms-k-cell[data-value="${seat}"]`), direction: d => q(`[data-intent="direction"][data-value="${d}"]`) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const reports = calls => calls.filter(c => c[0] !== 'onFocusReturn');
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const refused = node => node?.getAttribute('aria-disabled') === 'true';
  const busy = node => node?.getAttribute('aria-busy') === 'true';
  const dimmed = node => node?.hasAttribute('data-off');
  const shown = node => !!node && !node.hidden && node.getClientRects().length > 0 && !node.closest('[hidden]');
  const inPage = text => document.documentElement.outerHTML.includes(text);
  const frameOf = s => { const sheet = s.m.shell.element.querySelector('.ms-ps-sheet'); return { title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, line: sheet.querySelector('.ms-ps-sheet-title p')?.textContent ?? null, back: !!sheet.querySelector('[data-intent="sheet-back"]'), close: !!sheet.querySelector('[data-intent="sheet-close"]'), detent: sheet.dataset.detent, foot: s.footer().map(b => b.textContent.trim()).join('|') }; };
  const ON = { enabled: true };
  const waits = 'Controls return when the match is current';

  if (!deviceReduced) {
    await check('choose: exactly the given choices report their seat; the rest dimmed and refused with Frontend\'s note only when given; "Selected" and "You"', async () => {
      const s = mount(appointOf({ chosen: null }));
      for (let n = 1; n <= 9; n += 1) tap(s.cell(n));
      s.cell(7).focus(); s.cell(7).click();
      const got = named(s.calls, 'onChoose').map(c => c[1]);
      const states = [...s.root.querySelectorAll('.ms-k-cell')].map(c => `${c.dataset.value}:${c.dataset.state}:${refused(c) ? 'off' : 'on'}:${c.querySelector('.ms-k-cell-note')?.hidden ? '' : c.querySelector('.ms-k-cell-note').textContent}`);
      s.update({ chosen: 3 });
      const chosen = { state: s.cell(3).dataset.state, note: s.cell(3).querySelector('.ms-k-cell-note').textContent, pressed: s.cell(3).getAttribute('aria-pressed') };
      const you = [...s.root.querySelectorAll('.ms-k-you')].filter(shown).map(n => n.closest('.ms-k-cell').dataset.value);
      // A note only when given: without one, a dimmed cell says nothing under its name.
      s.update({ seats: appointOf().seats.map(x => (x.seat === 5 ? { ...x, note: null } : x)) });
      const quiet = s.cell(5).querySelector('.ms-k-cell-note').hidden && s.cell(5).dataset.state === 'ineligible';
      s.update({ seats: appointOf().seats.map(x => (x.seat === 5 ? { ...x, note: 'Taken to Hospital this round' } : x)) });
      const asGiven = s.cell(5).querySelector('.ms-k-cell-note').textContent;
      disposeState(s.m);
      const expect = ['1:available:on:', '2:ineligible:off:In Hospital', '3:available:on:', '4:ineligible:off:You are Captain', '5:ineligible:off:Injured', '6:ineligible:off:In Jail', '7:available:on:', '8:available:on:', '9:ineligible:off:Out'];
      return { ok: got.join() === '1,3,7,8,7' && states.join('|') === expect.join('|') && chosen.state === 'selected' && chosen.note === W.selected && chosen.pressed === 'true' && you.join() === '4' && quiet && asGiven === 'Taken to Hospital this round',
        got, states, chosen, you, quiet, asGiven };
    });
    await check('footer: Appoint, Block and Acknowledge the commands, naming the choice and waiting for it; Skip this phone\'s own; no ✕; each view\'s frame', async () => {
      const sheets = {
        appoint: officeDecisionsSheet(appointOf()), none: officeDecisionsSheet(appointOf({ chosen: null })), appointing: officeDecisionsSheet({ view: 'appointing', viewer: 4, captain: person(2) }),
        block: officeDecisionsSheet(blockOf()), blocked: officeDecisionsSheet(blockOf({ view: 'blocked', blocked: person(7) })), route: officeDecisionsSheet(navOf({})),
        tie: officeDecisionsSheet(tieOf()), confirm: officeDecisionsSheet(navOf({ direction: 'Blue', next: 'B2', confirmation: true })),
        refusedCommand: officeDecisionsSheet(appointOf({ command: { enabled: false, reason: 'Not available now' } })), busy: officeDecisionsSheet(blockOf({ command: { enabled: true, busy: true } })),
      };
      const plain = Object.values(sheets).every(f => f.id === 'office' && f.back === false && f.close === false && f.detent === 'large');
      const a = sheets.appoint.actions, b = sheets.block.actions, c = sheets.confirm.actions;
      const s = mount(blockOf(), {}, 'block');
      const first = frameOf(s);
      const [skip, block] = s.footer();
      tap(skip); tap(block);
      s.update({ chosen: null });
      const waiting = { label: s.footer()[1].textContent.trim(), off: refused(s.footer()[1]) && dimmed(s.footer()[1]) };
      tap(s.footer()[1]);
      s.update({ view: 'navigation', offices: { captain: 4, officer: 3 }, navigation: { position: 'B1', direction: 'Blue', next: 'B2', confirmation: true }, command: ON });
      tap(s.footer()[0]);
      const got = named(s.calls, 'onSheetAction').map(x => x[1]).join('|');
      disposeState(s.m);
      return { ok: plain && a.length === 1 && a[0].id === 'appoint' && a[0].label === 'Appoint Cleo' && a[0].icon === 'officer' && !a[0].local && a[0].enabled
        && sheets.none.actions[0].label === 'Appoint' && sheets.none.actions[0].enabled === false && sheets.appointing.actions.length === 0
        && b.length === 2 && b[0].id === 'skip' && b[0].local === true && b[0].kind === 'secondary' && b[1].label === 'Block Gus' && b[1].icon === 'block' && !b[1].local
        && sheets.blocked.actions.length === 0 && sheets.blocked.sub === W.blockLine && sheets.route.actions.length === 0 && sheets.tie.actions.length === 0
        && c.length === 1 && c[0].id === 'acknowledge' && c[0].icon === 'acknowledge' && !c[0].local && sheets.refusedCommand.actions[0].reason === 'Not available now' && sheets.refusedCommand.actions[0].enabled === false
        && sheets.busy.actions[1].busy === true && first.title === W.blockTitle && first.line === W.blockLine && !first.back && !first.close && first.foot === 'Skip|Block Gus'
        && waiting.label === 'Block' && waiting.off && got === 'skip|block|acknowledge', plain, appoint: a, block: b, confirm: c, first, waiting, got };
    });
    await check('words: the Captain\'s waiting block (44 px, as drawn), the block\'s notice, the route\'s rows and the acknowledgement, names and moves as given', async () => {
      const s = mount({ view: 'appointing', viewer: 4, captain: person(2) }, {}, 'appointing');
      const wait = s.q('.ms-k-wait');
      const waiting = [wait.querySelector('.ms-k-wait-title').textContent, wait.querySelector('.ms-k-wait-line').textContent, Math.round(wait.querySelector('.ms-k-pt').getBoundingClientRect().width)];
      s.update({ captain: person(7) });
      const other = s.q('.ms-k-wait-title').textContent;
      s.update({ view: 'blocked', blocked: person(7), offices: { captain: 2, officer: 4 } });
      const notice = [...s.q('.ms-od-notice').children].map(n => n.textContent);
      s.update({ view: 'navigation', offices: { captain: 4, officer: 3 }, navigation: { position: 'R2' } });
      const rows = () => [...s.root.querySelectorAll('.ms-k-row')].map(r => [r.querySelector('.ms-k-row-title')?.textContent, r.querySelector('.ms-k-row-sub')?.hidden === false ? r.querySelector('.ms-k-row-sub').textContent : '', r.querySelector('.ms-k-row-value')?.textContent ?? ''].join(':'));
      const route = rows();
      s.update({ navigation: { position: 'B1', direction: 'Red', next: 'R1', confirmation: true } });
      const confirm = rows();
      disposeState(s.m);
      return { ok: waiting.join('|') === `Ben is choosing an Officer|${W.random}|44` && other === 'Gus is choosing an Officer' && notice.join('|') === 'BLOCKED|Gus can’t move this round|Everyone sees the block'
        && route.join('|') === 'Position::R2|Next move::Being set' && confirm.join('|') === 'Next move::Red · to R1|Acknowledge:You can’t change or veto it:', waiting, other, notice, route, confirm };
    });
    await check('tie: Blue and Red report the direction; refused and busy with Frontend\'s state', async () => {
      const s = mount(tieOf(), {}, 'tie');
      const note = s.q('.ms-k-group-note').textContent;
      tap(s.direction('Blue')); tap(s.direction('Red'));
      s.update({ command: { enabled: true, busy: true } });
      const sending = busy(s.direction('Blue'));
      tap(s.direction('Red'));
      s.update({ command: { enabled: false, reason: 'The Officer has chosen' } });
      const off = { refused: refused(s.direction('Blue')), dimmed: dimmed(s.direction('Blue')), why: describedBy(s.direction('Blue')) };
      tap(s.direction('Blue'));
      const got = named(s.calls, 'onDirection').map(c => c[1]);
      disposeState(s.m);
      return { ok: note === W.tieNote && got.join() === 'Blue,Red' && sending && off.refused && off.dimmed && off.why === 'The Officer has chosen', note, got, sending, off };
    });
    await check('route: the ship\'s place in amber, the next step dashed only to acknowledge it, the tie\'s line only on a tie; its name from the given position', async () => {
      const s = mount(navOf({}), {}, 'route');
      const map = () => s.q('.ms-od-route');
      const dashed = () => [...map().querySelectorAll('line[stroke-dasharray]')].map(l => [l.getAttribute('x1'), l.getAttribute('y1'), l.getAttribute('x2'), l.getAttribute('y2')].join(','));
      const amber = () => [...map().querySelectorAll('circle')].filter(c => c.getAttribute('fill') === '#F1B84B').map(c => `${c.getAttribute('cx')},${c.getAttribute('cy')},${c.getAttribute('r')}`);
      const tieLine = () => [...map().querySelectorAll('text')].some(t => t.textContent === W.tieMap);
      const route = { dashed: dashed(), amber: amber(), tie: tieLine(), name: map().getAttribute('aria-label'), role: map().getAttribute('role') };
      s.update({ navigation: { position: 'B1', direction: 'Blue', next: 'B2', confirmation: true } });
      const confirm = { dashed: dashed() };
      s.update({ navigation: { position: 'R1', direction: 'Red', next: 'R2', confirmation: true } });
      const red = { dashed: dashed(), amber: amber(), name: map().getAttribute('aria-label') };
      s.update({ navigation: { position: 'Junction', tie: true }, offices: { captain: 2, officer: 4 } });
      const tie = { dashed: dashed(), tie: tieLine(), name: map().getAttribute('aria-label') };
      disposeState(s.m);
      return { ok: route.dashed.length === 0 && route.amber.join() === '140,126,11' && !route.tie && route.name === 'Route: the ship is at B1 on the Blue arm' && route.role === 'img'
        && confirm.dashed.join() === '140,126,106,92' && red.dashed.join() === '220,126,254,92' && red.amber.join() === '220,126,11' && red.name === 'Route: the ship is at R1 on the Red arm'
        && tie.dashed.length === 0 && tie.tie && tie.name === 'Route: the ship is at Junction', route, confirm, red, tie };
    });
    await check('privacy: the Navigation view refused unless the viewer is the Captain or the Officer; what is the office\'s leaves on a view or viewer change and while concealed; nothing comes back', async () => {
      const throws = fn => { try { fn(); return false; } catch { return true; } };
      const refusals = {
        stranger: throws(() => officeDecisionsSheet(navOf({}, { viewer: 6 }))), noViewer: throws(() => officeDecisionsSheet(navOf({}, { viewer: null }))),
        noOffices: throws(() => officeDecisionsSheet(navOf({}, { offices: { captain: null, officer: null } }))),
        captain: !throws(() => officeDecisionsSheet(navOf({}))), officer: !throws(() => officeDecisionsSheet(tieOf())),
      };
      const s = mount(tieOf(), {}, 'tie');
      const before = !!s.direction('Blue') && inPage(W.tieNote);
      s.update({ viewer: 3, offices: { captain: 2, officer: 3 } });
      const viewerGone = { buttons: !!s.direction('Blue'), note: inPage(W.tieNote), map: shown(s.q('.ms-od-route')) };
      s.update({ viewer: 4, offices: { captain: 2, officer: 4 }, navigation: { position: 'B1', tie: true }, command: ON });
      const back = !!s.direction('Blue');
      s.update({ status: 'concealed' });
      const concealed = { words: s.root.innerText.trim(), map: !!s.q('.ms-od-route'), foot: s.footer().length };
      s.update({ status: 'live' });
      const after = { map: shown(s.q('.ms-od-route')), note: inPage(W.tieNote) };
      s.update({ view: 'appoint', seats: appointOf().seats, offices: { captain: 4, officer: null } });
      const viewGone = { chosen: s.root.querySelectorAll('.ms-k-cell[data-state="selected"]').length, choosable: [...s.root.querySelectorAll('.ms-k-cell')].filter(c => !refused(c)).length };
      disposeState(s.m);
      const n = nextOfficeDecisionsInput(nextOfficeDecisionsInput(OFFICE_DECISIONS_DEFAULTS, tieOf()), { view: 'blocked' });
      return { ok: Object.values(refusals).every(Boolean) && before && !viewerGone.buttons && !viewerGone.note && !viewerGone.map && back && concealed.words === '' && !concealed.map && concealed.foot === 0
        && !after.map && !after.note && viewGone.chosen === 0 && viewGone.choosable === 0 && n.navigation === null && n.command.enabled === false,
        refusals, before, viewerGone, back, concealed, after, viewGone };
    });
    await check('reconnect: choosing a cell and Skip still work; Appoint, Block, Acknowledge, Blue and Red wait with the banner\'s words', async () => {
      const stale = { status: 'stale', banner: { kind: 'reconnecting' } };
      const s = mount(blockOf({ status: 'stale' }), stale, 'block');
      tap(s.cell(3));
      const [skip, block] = s.footer();
      tap(skip); tap(block);
      const blockWait = { refused: refused(block), dimmed: dimmed(block), why: describedBy(block) };
      s.update({ view: 'navigation', offices: { captain: 2, officer: 4 }, navigation: { position: 'B1', tie: true }, command: ON }, stale);
      tap(s.direction('Blue')); tap(s.direction('Red'));
      const tieWait = ['Blue', 'Red'].map(d => ({ refused: refused(s.direction(d)), dimmed: dimmed(s.direction(d)), why: describedBy(s.direction(d)) }));
      s.update({ offices: { captain: 4, officer: 3 }, navigation: { position: 'B1', direction: 'Blue', next: 'B2', confirmation: true } }, stale);
      const [ack] = s.footer();
      tap(ack);
      const ackWait = { refused: refused(ack), why: describedBy(ack) };
      s.update({ status: 'live' }, { status: 'live', banner: null });
      s.update({ navigation: { position: 'B1', tie: true }, offices: { captain: 2, officer: 4 } });
      const live = !refused(s.direction('Blue')) && describedBy(s.direction('Blue')) === null;
      const got = reports(s.calls).map(c => c.slice(0, 2).join(':'));
      disposeState(s.m);
      return { ok: got.join('|') === 'onChoose:3|onSheetAction:skip' && blockWait.refused && !blockWait.dimmed && blockWait.why === waits && tieWait.every(t => t.refused && !t.dimmed && t.why === waits)
        && ackWait.refused && ackWait.why === waits && live, got, blockWait, tieWait, ackWait, live };
    });
    await check('focus: a cell keeps its element and the focus as the choice changes; a focused Blue that leaves returns the focus once', async () => {
      const s = mount(appointOf({ chosen: null }));
      const cell = s.cell(7);
      cell.focus();
      s.update({ chosen: 7 });
      s.update({ chosen: 1 });
      const kept = s.cell(7) === cell && document.activeElement === cell && cell.dataset.state === 'available';
      s.update({ view: 'navigation', offices: { captain: 2, officer: 4 }, navigation: { position: 'B1', tie: true }, command: ON });
      await Promise.resolve(); await frames();
      s.direction('Blue').focus();
      // The tie is settled: the route stays, the buttons leave.
      s.update({ navigation: { position: 'B1', direction: 'Blue', next: 'B2', confirmation: false } });
      await Promise.resolve(); await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      disposeState(s.m);
      return { ok: kept && active && returns.length === 2 && returns[0][1]?.intent === 'choose' && returns[1][1]?.intent === 'direction' && returns[1][1]?.value === 'Blue', kept, active, returns };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the content 16 px in, the 3 × 3 three across, the route map at 210 px`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        await frames();
        const r = () => frame.getBoundingClientRect();
        const inset = n => { const b = n.getBoundingClientRect(); return [b.left - r().left, r().right - b.right]; };
        const grid = inset(s.q('.ms-k-grid9'));
        const across = new Set([...s.root.querySelectorAll('.ms-k-cell')].map(c => Math.round(c.getBoundingClientRect().top))).size;
        s.update({ view: 'navigation', offices: { captain: 4, officer: 3 }, navigation: { position: 'B1' } });
        await frames();
        const map = s.q('.ms-od-route').getBoundingClientRect();
        const route = inset(s.q('.ms-od-route')), list = inset(s.q('.ms-k-list'));
        disposeState(s.m);
        const sixteen = v => v.every(x => Math.abs(x - 16) < 0.5);
        return { ok: sixteen(grid) && across === 3 && sixteen(route) && sixteen(list) && Math.abs(map.height - 210) < 0.5, grid, across, route, list, height: map.height };
      });
    }
    size = sizeTo('390x844');
    for (const [which, input, key] of [['Choose your Officer', appointOf(), 'appoint'], ['Block movement', blockOf(), 'block'], ['Navigation, acknowledge', navOf({ direction: 'Blue', next: 'B2', confirmation: true }), 'confirm'], ['the tie', tieOf(), 'tie']]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling, the footer in view`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input, {}, key);
        await frames();
        const parts = [...s.root.querySelectorAll('.ms-k-cell-label, .ms-k-cell-note, .ms-k-row-title, .ms-k-row-sub, .ms-k-row-value, .ms-k-group-note, .ms-k-btn-label, .ms-od-notice p, .ms-k-wait-title, .ms-k-wait-line')].filter(shown);
        const cut = parts.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const list = s.q('.ms-k-grid9') ? getComputedStyle(s.q('.ms-k-grid9')).gridTemplateColumns.split(' ').length === 1 : null;
        const body = s.m.shell.sheetBody, last = [...s.root.children].filter(n => shown(n) && !n.classList.contains('ms-k-vh')).pop();
        last.scrollIntoView({ block: 'end' });
        await frames();
        const reachable = last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5;
        const foot = s.footer().every(b => b.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom + 0.5);
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: parts.length > 0 && cut.length === 0 && list !== false && reachable && foot, parts: parts.length, cut, list, reachable, foot };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount(tieOf(), {}, 'tie');
      const body = s.m.shell.sheetBody;
      const blue = s.direction('Blue');
      s.m.host.dispose(); s.m.host.dispose();
      tap(blue);
      s.m.host.update({ view: 'appoint' });
      const seen = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected, map: !!document.querySelector('.ms-od-route') };
      disposeState(s.m);
      const left = [...frame.children].map(n => n.className || n.tagName);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && !seen.map && left.length === 0, seen, left };
    });
  }
  await check(`motion: none of its own${deviceReduced ? ', with the device\'s Reduce motion' : ', with or without the game\'s Reduce motion'}`, async () => {
    const s = mount();
    await frames();
    const own = () => s.root.getAnimations({ subtree: true }).length;
    const first = own();
    s.update({ chosen: 7 });
    const chosen = own();
    s.m.host.update({ reducedMotion: true });
    const reduced = { own: own(), mode: s.root.dataset.motion };
    disposeState(s.m);
    return { ok: first === 0 && chosen === 0 && reduced.own === 0 && reduced.mode === 'reduced', first, chosen, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

// mothership:dev-only
//
// The Captain console's lifecycle probe: it drives the real component (../captain-console.mjs) in the real phone shell's
// sheet, in the browser, under whatever headers serve the page (design/tools/captain-console-check.mjs serves the
// production ones), and reports what it saw. Each check is one behaviour Frontend relies on (the Lead's decisions on
// #302):
//   plates    an available plate reports its kind; a used or unavailable one is refused; their lines "Once a match",
//             "Used" or Frontend's reason, exactly as given, and never worked out
//   art       each plate draws its state's art from the film bundle's property, and nothing covers it
//   footer    Cancel this phone's own; Release and Eject the commands, busy and refused with Frontend's state; the ✕
//             on the console only; the sheet's frame and footer for each view
//   confirm   the who block with Frontend's names in the pack's words, and the facts
//   privacy   every view refused unless the viewer is the Captain; the plates, the names and the command leave the
//             page when the viewer changes and when concealed, and nothing comes back by itself
//   reconnect opening a confirm and Cancel still work; Release and Eject wait with the banner's words
//   focus     a plate keeps its element and the focus; a focus in what ends returns to the content, once
//   layout    the content 16 px in at both sizes, the plates two across at 150 px with their art 140 × 78; at the
//             Largest text every word whole and the footer in view
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own, with or without Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { CAPTAIN_CONSOLE_DEFAULTS, CAPTAIN_CONSOLE_WORDS, captainConsoleSheet, nextCaptainConsoleInput } from '../captain-console.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runCaptainConsoleProbe({ sizes, mountState, disposeState, consoleOf, USED, JAILED }) {
  const W = CAPTAIN_CONSOLE_WORDS;
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
  const mount = (input = consoleOf(), shellExtra = {}, key = 'console') => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const m = mountState(frame, key, size.insets, Object.fromEntries(['onPlate', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    m.shell.update({ sheet: captainConsoleSheet(input), ...shellExtra });
    const root = m.host.element;
    const q = s => root.querySelector(s);
    const OWN = ['plates', 'jailed', 'command'];
    const update = (next, extra = {}) => {
      if ('viewer' in next && next.viewer !== current.viewer) current = Object.fromEntries(Object.entries(current).filter(([k]) => !OWN.includes(k) || k in next));
      current = { ...current, ...next };
      m.host.update(next);
      m.shell.update({ sheet: captainConsoleSheet(current), ...extra });
    };
    return { m, calls, root, q, update, footer: () => [...m.shell.element.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')], plate: kind => q(`[data-intent="plate"][data-value="${kind}"]`) };
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
  const lineOf = tile => { const n = tile.querySelector('.ms-k-tile-note'); return shown(n) ? n.textContent : null; };
  const waits = 'Controls return when the match is current';

  if (!deviceReduced) {
    await check('plates: an available plate reports its kind; a used or unavailable one is refused; the lines as given, never worked out', async () => {
      const s = mount();
      tap(s.plate('release')); s.plate('eject').focus(); s.plate('eject').click();
      const both = named(s.calls, 'onPlate').map(c => c[1]);
      const lines = [lineOf(s.plate('release')), lineOf(s.plate('eject'))];
      s.update({ plates: USED, jailed: [] });
      tap(s.plate('release')); tap(s.plate('eject'));
      const used = { reports: named(s.calls, 'onPlate').length, states: [s.plate('release').dataset.state, s.plate('eject').dataset.state], refused: [refused(s.plate('release')), refused(s.plate('eject'))], lines: [lineOf(s.plate('release')), lineOf(s.plate('eject'))] };
      // Frontend's reason exactly as given; none given, no line; an empty jailed list changes nothing on an available plate.
      s.update({ plates: { release: { state: 'unavailable', reason: 'Not available now' }, eject: { state: 'unavailable' } } });
      const reasons = [lineOf(s.plate('release')), lineOf(s.plate('eject'))];
      s.update({ plates: { release: { state: 'available' }, eject: { state: 'available' } }, jailed: [] });
      const notWorkedOut = [lineOf(s.plate('release')), refused(s.plate('release'))];
      disposeState(s.m);
      return { ok: both.join() === 'release,eject' && lines.join('|') === `${W.onceAMatch}|${W.onceAMatch}` && used.reports === 2 && used.states.join() === 'spent,unavailable' && used.refused.every(Boolean)
        && used.lines.join('|') === `${W.used}|No one in Jail` && reasons[0] === 'Not available now' && reasons[1] === null && notWorkedOut[0] === W.onceAMatch && notWorkedOut[1] === false, both, lines, used, reasons, notWorkedOut };
    });
    await check('art: each plate draws its state\'s art from the film bundle, and nothing covers it', async () => {
      const s = mount();
      const art = () => ['release', 'eject'].map(k => { const n = s.plate(k).querySelector('.ms-cc-plate-art'); return `${n.dataset.plate}:${(getComputedStyle(n).backgroundImage.match(/plate-[a-z-]+?(?:-[A-Za-z0-9_-]{8})?\.svg/) ?? [''])[0].replace(/-[A-Za-z0-9_-]{8}\.svg$/, '.svg')}`; });
      const first = art();
      s.update({ plates: USED, jailed: [] });
      const later = art();
      // The name and the line sit under the art: nothing of them overlaps it (#222 item 17).
      const overlaps = ['release', 'eject'].flatMap(k => {
        const tile = s.plate(k), a = tile.querySelector('.ms-cc-plate-art').getBoundingClientRect();
        return [...tile.querySelectorAll('.ms-k-tile-name, .ms-k-tile-note')].filter(shown).map(n => n.getBoundingClientRect()).filter(r => r.top < a.bottom - 0.5).map(() => k);
      });
      disposeState(s.m);
      return { ok: first.join() === 'release-available:plate-release-available.svg,eject-available:plate-eject-available.svg' && later.join() === 'release-used:plate-release-used.svg,eject-unavailable:plate-eject-unavailable.svg' && overlaps.length === 0, first, later, overlaps };
    });
    await check('footer: Cancel this phone\'s own; Release and Eject the commands with Frontend\'s state; the ✕ on the console only', async () => {
      const sheets = {
        console: captainConsoleSheet(consoleOf()), release: captainConsoleSheet(consoleOf({ view: 'release' })), eject: captainConsoleSheet(consoleOf({ view: 'eject' })),
        refusedCommand: captainConsoleSheet(consoleOf({ view: 'release', command: { enabled: false, reason: 'Not available now' } })), busy: captainConsoleSheet(consoleOf({ view: 'eject', command: { enabled: true, busy: true } })),
      };
      const s = mount(consoleOf({ view: 'release' }), {}, 'release');
      const frameOf = () => { const sheet = s.m.shell.element.querySelector('.ms-ps-sheet'); return { title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, close: !!sheet.querySelector('[data-intent="sheet-close"]'), foot: s.footer().map(b => b.textContent.trim()).join('|') }; };
      const confirm = frameOf();
      const [cancel, release] = s.footer();
      tap(cancel); tap(release);
      s.update({ command: { enabled: true, busy: true } });
      const sending = busy(s.footer()[1]);
      tap(s.footer()[1]);
      s.update({ command: { enabled: false, reason: 'Not available now' } });
      const off = { refused: refused(s.footer()[1]), dimmed: dimmed(s.footer()[1]), why: describedBy(s.footer()[1]) };
      s.update({ view: 'console', command: { enabled: true } });
      const consoleFrame = frameOf();
      const got = named(s.calls, 'onSheetAction').map(c => c[1]).join('|');
      disposeState(s.m);
      const [c1, c2] = sheets.release.actions, e2 = sheets.eject.actions[1];
      return { ok: sheets.console.close === true && sheets.console.sub === W.consoleLine && sheets.console.actions.length === 0 && sheets.release.close === false && !sheets.release.sub
        && c1.id === 'cancel' && c1.local === true && c1.kind === 'secondary' && c2.id === 'release' && c2.kind === 'primary' && !c2.local && e2.id === 'eject' && e2.kind === 'warn' && e2.label === W.eject
        && sheets.refusedCommand.actions[1].enabled === false && sheets.refusedCommand.actions[1].reason === 'Not available now' && sheets.busy.actions[1].busy === true
        && confirm.title === W.title && !confirm.close && confirm.foot === 'Cancel|Release' && consoleFrame.close && consoleFrame.foot === '' && sending && off.refused && off.dimmed && off.why === 'Not available now' && got === 'cancel|release',
        sheets, confirm, consoleFrame, sending, off, got };
    });
    await check('confirm: the who block with Frontend\'s names in the pack\'s words, and the facts', async () => {
      const s = mount(consoleOf({ view: 'release' }), {}, 'release');
      const who = () => [s.q('.ms-k-who-title').textContent, shown(s.q('.ms-k-who-sub')) ? s.q('.ms-k-who-sub').textContent : null, s.q('.ms-k-who-lead').dataset.icon];
      const facts = () => [...s.root.querySelectorAll('.ms-k-fact')].map(f => f.textContent);
      const release = { who: who(), facts: facts() };
      s.update({ jailed: ['Fay'] });
      const one = who()[1];
      s.update({ jailed: ['Fay', 'Ike', 'Gus'] });
      const three = who()[1];
      s.update({ jailed: [] });
      const none = who()[1];
      s.update({ view: 'eject', jailed: JAILED });
      const eject = { who: who(), facts: facts() };
      disposeState(s.m);
      return { ok: release.who.join('|') === `${W.releaseTitle}|Fay and Ike are in Jail|release` && release.facts.join('|') === `${W.onYourTurn}|${W.frees}|${W.hospital}`
        && one === 'Fay is in Jail' && three === 'Fay, Ike and Gus are in Jail' && none === null && eject.who.join('|') === `${W.ejectTitle}|Fay and Ike are in Jail|eject` && eject.facts.join('|') === `${W.onYourTurn}|${W.ejects}|${W.hospital}`,
        release, one, three, none, eject };
    });
    await check('privacy: every view refused unless the viewer is the Captain; the plates, the names and the command leave on a viewer change and while concealed; nothing comes back', async () => {
      const throws = fn => { try { fn(); return false; } catch { return true; } };
      const refusals = { stranger: throws(() => captainConsoleSheet(consoleOf({ viewer: 5 }))), noViewer: throws(() => captainConsoleSheet(consoleOf({ viewer: null }))),
        noCaptain: throws(() => captainConsoleSheet(consoleOf({ captain: null }))), captain: !throws(() => captainConsoleSheet(consoleOf())) };
      const s = mount(consoleOf({ view: 'release' }), {}, 'release');
      const before = inPage('Fay and Ike are in Jail');
      // A new Captain on this phone (Frontend gives the seat): the last one's names and command are dropped.
      s.update({ viewer: 5, captain: 5 });
      const moved = { names: inPage('Fay and Ike are in Jail'), refused: refused(s.footer()[1]) };
      s.update({ viewer: 4, captain: 4, jailed: JAILED, command: { enabled: true }, plates: consoleOf().plates });
      s.update({ status: 'concealed' });
      const concealed = { words: s.root.innerText.trim(), foot: s.footer().length };
      s.update({ status: 'live', view: 'console' });
      const back = { names: inPage('Fay and Ike are in Jail'), states: [s.plate('release').dataset.state, s.plate('eject').dataset.state] };
      disposeState(s.m);
      const n = nextCaptainConsoleInput(nextCaptainConsoleInput(CAPTAIN_CONSOLE_DEFAULTS, consoleOf()), { status: 'concealed' });
      return { ok: Object.values(refusals).every(Boolean) && before && !moved.names && moved.refused && concealed.words === '' && concealed.foot === 0 && !back.names && back.states.join() === 'unavailable,unavailable'
        && n.jailed.length === 0 && n.plates.release.state === 'unavailable', refusals, before, moved, concealed, back };
    });
    await check('reconnect: opening a confirm and Cancel still work; Release and Eject wait with the banner\'s words', async () => {
      const stale = { status: 'stale', banner: { kind: 'reconnecting' } };
      const s = mount(consoleOf({ status: 'stale' }), stale);
      tap(s.plate('release'));
      s.update({ view: 'release' }, stale);
      const [cancel, release] = s.footer();
      tap(release); tap(cancel);
      const releaseWait = { refused: refused(release), dimmed: dimmed(release), why: describedBy(release) };
      s.update({ view: 'eject' }, stale);
      const eject = s.footer()[1];
      tap(eject);
      const ejectWait = { refused: refused(eject), why: describedBy(eject) };
      const got = reports(s.calls).map(c => c.slice(0, 2).join(':'));
      disposeState(s.m);
      return { ok: got.join('|') === 'onPlate:release|onSheetAction:cancel' && releaseWait.refused && !releaseWait.dimmed && releaseWait.why === waits && ejectWait.refused && ejectWait.why === waits, got, releaseWait, ejectWait };
    });
    await check('focus: a plate keeps its element and the focus through its states; a focused plate that leaves returns the focus once', async () => {
      const s = mount();
      const plate = s.plate('eject');
      plate.focus();
      s.update({ plates: { release: { state: 'available' }, eject: { state: 'unavailable', reason: 'No one in Jail' } } });
      s.update({ plates: { release: { state: 'available' }, eject: { state: 'available' } } });
      const kept = s.plate('eject') === plate && document.activeElement === plate;
      s.update({ view: 'eject' });
      await Promise.resolve(); await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      disposeState(s.m);
      return { ok: kept && active && returns.length === 1 && returns[0][1]?.intent === 'plate' && returns[0][1]?.value === 'eject', kept, active, returns };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the content 16 px in, the plates two across at 150 px, their art 140 × 78 and centred`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        await frames();
        const r = () => frame.getBoundingClientRect();
        const inset = n => { const b = n.getBoundingClientRect(); return [b.left - r().left, r().right - b.right]; };
        const grid = inset(s.q('.ms-cc-plates'));
        const tiles = ['release', 'eject'].map(k => s.plate(k).getBoundingClientRect());
        const arts = ['release', 'eject'].map(k => { const t = s.plate(k).getBoundingClientRect(), a = s.plate(k).querySelector('.ms-cc-plate-art').getBoundingClientRect(); return { w: a.width, h: a.height, centred: Math.abs((a.left + a.right) / 2 - (t.left + t.right) / 2) < 0.5 }; });
        const note = inset(s.q('.ms-k-group-note'));
        s.update({ view: 'release' });
        await frames();
        const who = inset(s.q('.ms-k-who')), facts = inset(s.q('.ms-k-facts'));
        disposeState(s.m);
        const sixteen = v => v.every(x => Math.abs(x - 16) < 0.5);
        return { ok: sixteen(grid) && sixteen(who) && sixteen(facts) && Math.abs(tiles[0].top - tiles[1].top) < 0.5 && tiles.every(t => t.height >= 150) && arts.every(a => Math.abs(a.w - 140) < 0.5 && Math.abs(a.h - 78) < 0.5 && a.centred),
          grid, tiles: tiles.map(t => [t.width, t.height]), arts, note, who, facts };
      });
    }
    size = sizeTo('390x844');
    for (const [which, input, key] of [['the console', consoleOf(), 'console'], ['the commands used', consoleOf({ plates: USED, jailed: [] }), 'used'], ['the Release confirm', consoleOf({ view: 'release', jailed: ['Fay', 'Ike', 'Gus'] }), 'release']]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling, the footer in view`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input, {}, key);
        await frames();
        const parts = [...s.root.querySelectorAll('.ms-k-tile-name, .ms-k-tile-note, .ms-k-group-note, .ms-k-who-title, .ms-k-who-sub, .ms-k-fact-text')].filter(shown);
        const cut = parts.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const body = s.m.shell.sheetBody, last = [...s.root.children].filter(n => shown(n) && !n.classList.contains('ms-k-vh')).pop();
        last.scrollIntoView({ block: 'end' });
        await frames();
        const reachable = last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5;
        const foot = s.footer().every(b => b.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom + 0.5);
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: parts.length > 0 && cut.length === 0 && reachable && foot, parts: parts.length, cut, reachable, foot };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount();
      const body = s.m.shell.sheetBody;
      const plate = s.plate('release');
      s.m.host.dispose(); s.m.host.dispose();
      tap(plate);
      s.m.host.update({ view: 'release' });
      const seen = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected, plates: !!document.querySelector('.ms-cc-plates') };
      disposeState(s.m);
      const left = [...frame.children].map(n => n.className || n.tagName);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && !seen.plates && left.length === 0, seen, left };
    });
  }
  await check(`motion: none of its own${deviceReduced ? ', with the device\'s Reduce motion' : ', with or without the game\'s Reduce motion'}`, async () => {
    const s = mount();
    await frames();
    const own = () => s.root.getAnimations({ subtree: true }).length;
    const first = own();
    s.update({ plates: USED, jailed: [] });
    const changed = own();
    s.m.host.update({ reducedMotion: true });
    const reduced = { own: own(), mode: s.root.dataset.motion };
    disposeState(s.m);
    return { ok: first === 0 && changed === 0 && reduced.own === 0 && reduced.mode === 'reduced', first, changed, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

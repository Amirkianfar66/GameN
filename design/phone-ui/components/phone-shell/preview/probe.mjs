// mothership:dev-only
//
// The phone shell's lifecycle probe: it drives the real component (../phone-shell.mjs) in the browser,
// under whatever headers serve the page (design/tools/phone-shell-check.mjs serves the production ones),
// and reports what it saw. Each check is one behaviour Frontend relies on:
//   focus     a focused control keeps its element and the focus through ordinary updates; the focused
//             control ending moves the focus to the shell and reports it once (onFocusReturn)
//   refused   an unavailable, busy or non-interactive control takes no tap, and says why
//   stale     reconnecting, only Retry, ⋮ and a sheet's back and close work
//   private   concealed, nothing to read and no control; this viewer's inputs are dropped, also when
//             the viewer changes
//   time      the clock shows what it is given, amber in the last 10 s, and never counts by itself
//   layout    the bars and the stage are measured, and a change of text size, insets or bars reported
//   layers    the cover lies over the stage and above all it holds, under the overlays and the sheet; with a
//             sheet open the toast stays above it and the banner under it, as the pack's; with the banner
//             showing, a docked sheet stays below it, so Retry and the sheet's Close are both in sight
//   large     at the Largest text, in the shell's phone container: a row's value goes under its title and a
//             stacking segmented control stacks; at the Standard text neither changes
//   nobar     with bar: null the stage runs to the top edge, the overlays keep the bar's place (as the pack's
//             do on its films), and slot('clock') keeps its element
//   edge      with edge: true the stage and its cover fill the shell, under the bar when there is one;
//             layout() gives the safe areas, also when only they change; the overlays stay where they are
//   backdrop  the room view's space behind the bars by default, the phone's canvas with backdrop: 'canvas'
//   head      a sheet's head action sits after the title and before Close, keeps its element and the focus,
//             reports onSheetAction, works while reconnecting (it is this phone's own), and returns the focus
//             when it goes
//   toast     shown once per id, gone after its time, cleared by suspend()
//   motion    the sheet slides, or fades in 80 ms with Reduce motion (the game's, or the device's)
//   hud       a long press on a capped tab label shows its word large, and only then
//   dispose   after dispose(), nothing is left and nothing fires
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { mountPhoneShell, TOAST_MS, RECONNECTING } from '../phone-shell.mjs';
import { createKit } from '../../kit/kit.mjs';

const wait = ms => new Promise(done => setTimeout(done, ms));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runPhoneShellProbe({ sizes, versions, person }) {
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
  const SELF = 4;
  const own = () => ({ viewer: SELF, versions, insets: size.insets,
    bar: { kind: 'turn', who: person(SELF), self: true, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} },
    tabs: { variant: 'game', view: 'room', hero: { mode: 'pass' } } });
  const passSheet = { id: 'pass', title: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', close: true, back: true,
    actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'pass', label: 'Pass', kind: 'primary', icon: 'pass' }] };
  /** A shell with every callback recorded. */
  const mount = (input = own(), extra = {}) => {
    const calls = [];
    const record = name => (...args) => calls.push([name, ...args]);
    const handlers = Object.fromEntries(['onTab', 'onHero', 'onPromises', 'onMenu', 'onCancelTarget', 'onChip', 'onRetry', 'onSheetAction',
      'onSheetBack', 'onSheetClose', 'onFocusReturn', 'onLayout'].map(n => [n, record(n)]));
    const shell = mountPhoneShell(frame, input, { ...handlers, ...extra });
    return { shell, calls, root: shell.element, q: s => shell.element.querySelector(s), qa: s => [...shell.element.querySelectorAll(s)] };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };

  if (mode === 'full') {
    await check('focus: the hero, a tab and Promises keep their element and the focus through eight clock ticks and a badge change', async () => {
      const s = mount();
      const results = [];
      for (const selector of ['.ms-ps-hero', '.ms-ps-tab[data-value="panels"]', '.ms-ps-promises']) {
        const node = s.q(selector);
        node.focus();
        for (let i = 0; i < 8; i += 1) {
          s.shell.update({ bar: { ...own().bar, timer: { remainingMs: 42000 - i * 250 }, promises: { count: 1 + (i % 2) } },
            tabs: { variant: 'game', view: 'room', hero: { mode: 'pass' }, badges: { panels: i % 3 } } });
        }
        results.push({ selector, same: s.q(selector) === node, focused: document.activeElement === node });
      }
      s.shell.dispose();
      return { ok: results.every(r => r.same && r.focused), results };
    });

    await check('focus: a sheet\'s focused button ending moves the focus to the shell, then onFocusReturn once', async () => {
      const s = mount({ ...own(), sheet: passSheet });
      const pass = s.q('[data-intent="sheet-action"][data-value="pass"]');
      pass.focus();
      s.shell.update({ sheet: { ...passSheet, actions: passSheet.actions.map(a => (a.id === 'pass' ? { ...a, busy: true } : a)) } });
      const kept = s.q('[data-intent="sheet-action"][data-value="pass"]') === pass && document.activeElement === pass;
      s.shell.update({ sheet: null });
      await Promise.resolve();
      await Promise.resolve();
      const returns = named(s.calls, 'onFocusReturn');
      const detail = { kept, focusOnShell: document.activeElement === s.root, returns: returns.map(r => r[1]) };
      // The target bar's Cancel, the same way.
      s.shell.update({ target: { icon: 'rescue', title: 'Rescue', sub: 'Choose a player' } });
      s.q('[data-intent="cancel-target"]').focus();
      s.shell.update({ target: null });
      await Promise.resolve();
      await Promise.resolve();
      detail.cancelReturn = named(s.calls, 'onFocusReturn').slice(1).map(r => r[1]);
      s.shell.dispose();
      return { ok: detail.kept && detail.focusOnShell && returns.length === 1 && returns[0][1]?.intent === 'sheet-action' && returns[0][1]?.value === 'pass'
        && detail.cancelReturn.length === 1 && detail.cancelReturn[0]?.intent === 'cancel-target', ...detail };
    });

    await check('refused: an unavailable hero takes no tap and is described by its reason; a busy one takes none; an offered one fires once', async () => {
      const s = mount({ ...own(), tabs: { variant: 'game', hero: { mode: 'pass', enabled: false, reason: 'Not your turn' } } });
      const hero = s.q('.ms-ps-hero');
      hero.click();
      const off = { calls: named(s.calls, 'onHero').length, ariaDisabled: hero.getAttribute('aria-disabled'), dimmed: hero.hasAttribute('data-off'), reason: describedBy(hero) };
      s.shell.update({ tabs: { variant: 'game', hero: { mode: 'pass', busy: true } } });
      hero.click();
      const busy = { calls: named(s.calls, 'onHero').length, ariaBusy: hero.getAttribute('aria-busy'), dimmed: hero.hasAttribute('data-off') };
      s.shell.update({ tabs: { variant: 'game', hero: { mode: 'pass' } } });
      hero.click();
      const on = { calls: named(s.calls, 'onHero').map(c => c[1]), ariaDisabled: hero.getAttribute('aria-disabled'), reason: describedBy(hero) };
      s.shell.dispose();
      return { ok: off.calls === 0 && off.ariaDisabled === 'true' && off.dimmed && off.reason === 'Not your turn' && busy.calls === 0 && busy.ariaBusy === 'true'
        && !busy.dimmed && on.calls.length === 1 && on.calls[0] === 'pass' && on.ariaDisabled === null && on.reason === null, off, busy, on };
    });

    await check('refused: interactive: false takes no tap anywhere', async () => {
      const s = mount({ ...own(), interactive: false, sheet: passSheet, target: { title: 'Rescue' }, banner: { kind: 'reconnecting' } });
      const buttons = s.qa('button[data-intent]');
      for (const b of buttons) b.click();
      const fired = s.calls.filter(c => !['onLayout', 'onFocusReturn'].includes(c[0]));
      const refused = buttons.every(b => b.getAttribute('aria-disabled') === 'true');
      s.shell.dispose();
      return { ok: buttons.length >= 8 && fired.length === 0 && refused, buttons: buttons.length, fired };
    });

    await check('stale: only Retry, ⋮ and a sheet\'s back and close work; the rest say why', async () => {
      const s = mount({ ...own(), status: 'stale', banner: { kind: 'reconnecting' }, sheet: passSheet, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' } });
      const local = ['retry', 'menu', 'sheet-back', 'sheet-close'];
      const buttons = s.qa('button[data-intent]');
      for (const b of buttons) b.click();
      const fired = s.calls.filter(c => !['onLayout', 'onFocusReturn'].includes(c[0])).map(c => c[0]);
      const game = buttons.filter(b => !local.includes(b.dataset.intent));
      const described = game.every(b => b.getAttribute('aria-disabled') === 'true' && describedBy(b) === RECONNECTING.sub);
      const localOpen = buttons.filter(b => local.includes(b.dataset.intent)).every(b => b.getAttribute('aria-disabled') !== 'true');
      s.shell.update({ status: 'live', banner: null });
      const hero = s.q('.ms-ps-hero');
      hero.click();
      const live = { hero: named(s.calls, 'onHero').length, reason: describedBy(hero) };
      s.shell.dispose();
      const want = ['onRetry', 'onMenu', 'onSheetBack', 'onSheetClose'];
      return { ok: fired.length === 4 && want.every(n => fired.includes(n)) && described && localOpen && game.length >= 6 && live.hero === 1 && live.reason === null,
        fired, game: game.length, described, localOpen, live };
    });

    await check('private: concealed, nothing to read and no control; the clock\'s place and the stage keep their size', async () => {
      const s = mount({ ...own(), sheet: passSheet, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' }, toast: { id: 't1', text: 'Turn passed' } });
      await frames();
      const slot = s.shell.slot('clock');
      const live = s.shell.layout();
      s.shell.update({ status: 'concealed' });
      await frames();
      const text = s.root.textContent;
      const words = ['Dev', 'Your turn', 'Player 4', 'R3', '0:42', 'Promises', 'Pass', 'Rescue', 'Other rooms', 'Turn passed', 'Board', 'Actions'];
      const leaks = words.filter(w => text.includes(w));
      const concealed = { leaks, buttons: s.qa('button').length, slotSame: s.shell.slot('clock') === slot, slotHidden: slot.hidden, sheetBody: s.shell.sheetBody,
        stage: s.shell.layout().stage, liveStage: live.stage, barHidden: s.q('.ms-ps-tb').getAttribute('aria-hidden') };
      // Shown again with no new viewer inputs: the public bar returns; the tabs, sheet, target, chip and Promises do not.
      s.shell.update({ status: 'live' });
      const after = { name: s.q('.ms-ps-name')?.textContent ?? null, promises: !!s.q('.ms-ps-promises'), tabs: s.qa('button.ms-ps-tab').length, sheet: !!s.q('.ms-ps-sheet'),
        target: !!s.q('.ms-ps-target'), chip: !!s.q('.ms-ps-chip'), toast: !!s.q('.ms-ps-toast') };
      s.shell.dispose();
      return { ok: leaks.length === 0 && concealed.buttons === 0 && concealed.slotSame && concealed.slotHidden && concealed.sheetBody === null && concealed.barHidden === 'true'
        && concealed.stage.height === live.stage.height && after.name === 'Your turn' && !after.promises && after.tabs === 0 && !after.sheet && !after.target && !after.chip && !after.toast,
        concealed, after };
    });

    await check('private: a new viewer drops the last one\'s tabs, sheet, target, chip and Promises, unless the update gives the new viewer\'s', async () => {
      const s = mount({ ...own(), sheet: passSheet, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' } });
      s.shell.update({ viewer: 5 });
      const dropped = { tabs: s.qa('button.ms-ps-tab').length, sheet: !!s.q('.ms-ps-sheet'), target: !!s.q('.ms-ps-target'), chip: !!s.q('.ms-ps-chip'), promises: !!s.q('.ms-ps-promises') };
      s.shell.update({ viewer: 6, tabs: { variant: 'game', hero: { mode: 'vote' } }, bar: { ...own().bar, promises: { count: 2 } } });
      const given = { tabs: s.qa('button.ms-ps-tab').length, hero: s.q('.ms-ps-hero')?.dataset.mode ?? null, promises: s.q('.ms-ps-promises')?.getAttribute('aria-label') ?? null };
      s.shell.dispose();
      return { ok: dropped.tabs === 0 && !dropped.sheet && !dropped.target && !dropped.chip && !dropped.promises && given.tabs === 4 && given.hero === 'vote' && given.promises === 'Promises, 2 new', dropped, given };
    });

    await check('time: the clock shows what it is given (m:ss, rounded up), amber at 10 s and under, a ring when asked, and never counts by itself', async () => {
      const s = mount();
      const read = () => ({ text: s.q('.ms-ps-timer')?.lastChild.textContent, urgent: s.q('.ms-ps-timer')?.hasAttribute('data-urgent'), label: s.q('.ms-ps-timer')?.getAttribute('aria-label'),
        ring: s.q('.ms-ps-ring')?.style.getPropertyValue('--p') ?? null });
      const seen = {};
      const at = ms => s.shell.update({ bar: { ...own().bar, timer: { remainingMs: ms } } });
      at(41001); seen.rounded = read();
      at(10001); seen.notYet = read();
      at(10000); seen.urgent = read();
      at(125000); seen.minutes = read();
      s.shell.update({ bar: { ...own().bar, timer: { remainingMs: 3000, ring: 0.6 } } }); seen.ring = read();
      at(42000); seen.before = read();
      await wait(1300);
      seen.after = read();
      s.shell.update({ bar: { ...own().bar, timer: null } }); seen.none = !!s.q('.ms-ps-timer');
      s.shell.dispose();
      return { ok: seen.rounded.text === '0:42' && !seen.notYet.urgent && seen.urgent.urgent && seen.minutes.text === '2:05' && seen.ring.ring === '0.6' && seen.ring.text === '0:03'
        && seen.after.text === seen.before.text && seen.before.label === '42 seconds left' && seen.none === false, ...seen };
    });

    await check('layout: the bars and the stage are measured; text size, insets and the bars\' changes are reported', async () => {
      const s = mount();
      await frames();
      const first = s.shell.layout();
      const reports = () => named(s.calls, 'onLayout').map(c => c[1]);
      const html = document.documentElement;
      html.style.fontSize = '150%';
      await frames(); await frames();
      const large = s.shell.layout();
      html.style.fontSize = '';
      await frames(); await frames();
      s.shell.update({ insets: { top: 59, bottom: 34 } });
      await frames();
      const insets = s.shell.layout();
      s.shell.update({ insets: size.insets, tabs: null });
      await frames();
      const display = s.shell.layout();
      s.shell.update({ tabs: { variant: 'talk' } });
      await frames();
      const talk = s.shell.layout();
      const seen = reports();
      s.shell.dispose();
      return { ok: first.bars.top === 99 && first.bars.bottom === 92 && first.stage.height === 653 && large.bars.top > first.bars.top && insets.bars.top === 111
        && display.bars.bottom === 34 && talk.bars.bottom === 0 && talk.covered.bottom > 60 && seen.length >= 4, first, large, insets, display, talk, reports: seen.length };
    });

    await check('layers: the cover lies over the stage and above all it holds, under the target bar, the banner, the toast and the sheet; over a sheet the toast stays on top and the banner under, as the pack', async () => {
      const s = mount();
      // What the stage holds may stack as high as it likes inside it: the room scene's tags sit at 3150.
      const high = document.createElement('div');
      Object.assign(high.style, { position: 'absolute', inset: '0', zIndex: '3150' });
      s.shell.stage.append(high);
      const card = document.createElement('div');
      Object.assign(card.style, { position: 'absolute', inset: '0', pointerEvents: 'auto' });
      s.shell.slot('cover').append(card);
      await frames();
      const at = node => { const r = node.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); };
      const settle = async selector => { await frames(); await Promise.all((s.q(selector)?.getAnimations() ?? []).map(a => a.finished.catch(() => null))); };
      const stageBox = s.shell.stage.getBoundingClientRect(), coverBox = s.shell.slot('cover').getBoundingClientRect();
      const sameBox = ['top', 'left', 'width', 'height'].every(k => Math.abs(stageBox[k] - coverBox[k]) < 0.5);
      const middle = () => document.elementFromPoint(stageBox.left + stageBox.width / 2, stageBox.top + stageBox.height * 0.6);
      const overStage = middle() === card;
      // Each overlay alone (they share the strip under the bar), over the cover.
      const alone = async (input, selector) => { s.shell.update({ target: null, banner: null, toast: null, ...input }); await settle(selector); const node = s.q(selector); return !!node && node.contains(at(node)); };
      const target = await alone({ target: { title: 'Rescue' } }, '.ms-ps-target');
      const banner = await alone({ banner: { kind: 'reconnecting' } }, '.ms-ps-banner');
      const toast = await alone({ toast: { id: 'layers-1', text: 'Registered' } }, '.ms-ps-toast');
      // A large docked sheet lies over the cover, and the toast stays above it (the pack: toast 70, sheet 45, banner 42).
      // The banner stays under the sheet in its layers; while it shows, the sheet docks 8 px below it, so Retry and
      // the sheet's Close are both in sight.
      s.shell.update({ toast: null, banner: { kind: 'reconnecting' }, sheet: { ...passSheet, id: 'layers', detent: 'large' } });
      await settle('.ms-ps-sheet');
      await frames();
      const sheet = s.q('.ms-ps-sheet');
      const sheetOverCover = sheet.contains(middle());
      const bannerNode = s.q('.ms-ps-banner'), retry = bannerNode.querySelector('[data-intent="retry"]'), close = sheet.querySelector('[data-intent="sheet-close"]');
      const bannerLayered = Number(getComputedStyle(s.q('.ms-ps-over')).zIndex) < Number(getComputedStyle(sheet).zIndex);
      const bannerBox = bannerNode.getBoundingClientRect();
      const sheetGap = sheet.getBoundingClientRect().top - bannerBox.bottom;
      const bothInSight = bannerNode.contains(at(bannerNode)) && retry.contains(at(retry)) && close.contains(at(close)) && sheetGap >= 7.5;
      // Without the banner, the large sheet docks at its place again: 8 px under the bar, where the banner was.
      s.shell.update({ banner: null });
      await frames(); await frames();
      const backUp = Math.abs(sheet.getBoundingClientRect().top - bannerBox.top) < 1;
      const bannerUnderSheet = bannerLayered && bothInSight && backUp;
      s.shell.update({ banner: null, toast: { id: 'layers-2', text: 'Over the sheet' } });
      await settle('.ms-ps-toast');
      const toastOverSheet = s.q('.ms-ps-toast').contains(at(s.q('.ms-ps-toast')));
      const keptCover = s.shell.slot('cover') === card.parentElement;
      s.shell.dispose();
      return { ok: sameBox && overStage && target && banner && toast && sheetOverCover && bannerUnderSheet && toastOverSheet && keptCover,
        sameBox, overStage, target, banner, toast, sheetOverCover, bannerUnderSheet, bannerLayered, bothInSight, sheetGap: Math.round(sheetGap * 10) / 10, backUp,
        toastOverSheet, keptCover };
    });

    await check('large: at the Largest text a row\'s value goes under its title and a stacking segmented control stacks; at the Standard text neither changes', async () => {
      const kit = createKit(document);
      const measure = async text => {
        document.documentElement.style.fontSize = text === 100 ? '' : `${text}%`;
        const s = mount({ ...own(), sheet: { id: 'large', title: 'Your role', sub: 'Only on this phone', close: true, detent: 'large' } });
        await frames();
        const rows = [
          kit.row({ tag: 'div', title: 'Move', value: 'Used this round', icon: 'move' }),
          kit.row({ tag: 'div', title: 'Promises', value: 'Given 0/1 · Received 1/1', icon: 'promise' }),
        ];
        const seg = kit.seg({ options: [{ id: 'card', label: 'Card' }, { id: 'knowledge', label: 'Knowledge' }, { id: 'resources', label: 'Resources' }], value: 'card', stack: true, label: 'Part' });
        const short = kit.seg({ options: [{ id: 7, label: '7' }, { id: 8, label: '8' }, { id: 9, label: '9' }], value: 8, label: 'Players' });
        s.shell.sheetBody.append(kit.list(rows), seg, short);
        await frames();
        const box = n => n.getBoundingClientRect();
        const under = rows.map(r => box(r.querySelector('.ms-k-row-value')).top >= box(r.querySelector('.ms-k-row-title')).bottom - 1);
        const beside = rows.map(r => Math.abs(box(r.querySelector('.ms-k-row-value')).top - box(r.querySelector('.ms-k-row-main')).top) < box(r.querySelector('.ms-k-row-title')).height);
        const apart = rows.map(r => { const t = box(r.querySelector('.ms-k-row-title')), v = box(r.querySelector('.ms-k-row-value')); return t.right <= v.left + 0.5 || t.bottom <= v.top + 0.5; });
        const tops = n => [...n.children].map(b => Math.round(box(b).top));
        const whole = n => [...n.children].every(b => box(b.lastChild).width <= box(b).width + 0.5);
        const result = { under, beside, apart, stacked: new Set(tops(seg)).size === 3, segWhole: whole(seg), shortRow: new Set(tops(short)).size === 1,
          phoneEm: Math.round(box(s.q('.ms-phone-shell')).width / parseFloat(getComputedStyle(s.q('.ms-phone-shell')).fontSize) * 10) / 10 };
        s.shell.dispose();
        return result;
      };
      const largest = await measure(200), standard = await measure(100);
      document.documentElement.style.fontSize = '';
      const ok = largest.under.every(Boolean) && largest.apart.every(Boolean) && largest.stacked && largest.segWhole && largest.shortRow
        && standard.beside.every(Boolean) && standard.apart.every(Boolean) && !standard.stacked && standard.segWhole && standard.shortRow;
      return { ok, largest, standard };
    });

    await check('nobar: with bar: null the stage runs to the top edge, the overlays keep the bar\'s place, and slot(\'clock\') keeps its element', async () => {
      const s = mount({ ...own(), bar: null, tabs: null, banner: { kind: 'reconnecting' }, toast: { id: 'rejoined', text: 'Rejoined · the stage carried on', icon: 'retry' } });
      // Measured at rest: the toast drops in.
      await frames();
      await Promise.all(s.q('.ms-ps-toast').getAnimations().map(a => a.finished.catch(() => null)));
      const box = s.root.getBoundingClientRect(), clock = s.shell.slot('clock');
      const first = s.shell.layout();
      const top = selector => Math.round((s.q(selector).getBoundingClientRect().top - box.top) * 100) / 100;
      const banner = top('.ms-ps-banner'), toast = top('.ms-ps-toast'), cover = top('.ms-ps-cover');
      const bar = s.q('.ms-ps-tb'), hidden = getComputedStyle(bar).display === 'none' && bar.getAttribute('aria-hidden') === 'true';
      // Concealed with no bar, nothing to read; the bar comes back when given again, its clock place unchanged.
      s.shell.update({ status: 'concealed' });
      const concealed = s.root.innerText.trim() === '';
      s.shell.update({ status: 'live', bar: own().bar });
      await frames();
      const back = s.shell.layout();
      const sameClock = s.shell.slot('clock') === clock;
      s.shell.dispose();
      // The bar's place is where the bar ends when it comes back (99 px: the 47 px safe area and the bar's 52):
      // the pack's toast and banner keep it on its films, below the film's clock chip (sheet 18).
      const place = back.bars.top;
      return { ok: first.bars.top === 0 && cover === 0 && hidden && place === 99 && Math.abs(banner - (place + 8)) < 0.5 && Math.abs(toast - (place + 10)) < 0.5 && concealed && sameClock,
        bars: first.bars, cover, banner, toast, place, hidden, concealed, back: back.bars, sameClock };
    });

    await check('edge: with edge: true the stage and its cover fill the shell under the bar, layout() gives the safe areas, and the overlays stay where they are', async () => {
      const toast = { id: 'rejoined', text: 'Rejoined · the stage carried on', icon: 'retry' };
      const s = mount({ ...own(), tabs: null, edge: true, banner: { kind: 'reconnecting' }, toast });
      await frames();
      await Promise.all(s.q('.ms-ps-toast').getAnimations().map(a => a.finished.catch(() => null)));
      const box = s.root.getBoundingClientRect();
      const rect = selector => { const r = s.q(selector).getBoundingClientRect(); return [r.top - box.top, box.bottom - r.bottom, r.left - box.left, box.right - r.right].map(v => Math.round(v * 100) / 100); };
      const whole = r => r.every(v => v === 0);
      const top = selector => Math.round((s.q(selector).getBoundingClientRect().top - box.top) * 100) / 100;
      const under = { stage: rect('.ms-ps-stage'), cover: rect('.ms-ps-cover') };
      const first = s.shell.layout();
      // The bar's glass lies over the stage: what is under a point in the bar is the bar.
      const overBar = !!document.elementFromPoint(box.left + 40, box.top + first.safe.top + 26)?.closest('.ms-ps-tb');
      const banner = top('.ms-ps-banner'), toastTop = top('.ms-ps-toast');
      // No bar, still edge to edge; then edge off: the stage between the safe areas' top edge and the foot's.
      s.shell.update({ bar: null });
      await frames();
      const nobar = s.shell.layout();
      s.shell.update({ edge: false });
      await frames();
      const off = s.shell.layout();
      // Edge again: a change of the safe areas alone is reported (nothing else moves).
      s.shell.update({ edge: true });
      await frames();
      const before = named(s.calls, 'onLayout').length;
      s.shell.update({ insets: { top: 20, bottom: 0 } });
      await frames();
      await wait(50);
      const reported = named(s.calls, 'onLayout').slice(before).at(-1)?.[1] ?? null;
      let refused = false;
      try { s.shell.update({ edge: 'yes' }); } catch (error) { refused = error instanceof TypeError && /edge is true or false/.test(error.message); }
      s.shell.dispose();
      const { top: safeTop, bottom: safeBottom } = size.insets;
      const ok = whole(under.stage) && whole(under.cover) && first.bars.top === 0 && first.bars.bottom === 0 && first.stage.height === size.height
        && first.safe.top === safeTop && first.safe.bottom === safeBottom && overBar
        && Math.abs(banner - (99 + 8)) < 0.5 && Math.abs(toastTop - (99 + 10)) < 0.5
        && nobar.bars.top === 0 && nobar.bars.bottom === 0 && off.bars.top === 0 && off.bars.bottom === safeBottom
        && reported?.safe.top === 20 && reported?.safe.bottom === 0 && refused;
      return { ok, under, first, overBar, banner, toast: toastTop, nobar: nobar.bars, off: off.bars, reported: reported?.safe ?? null, refused };
    });

    await check('backdrop: the room view\'s space behind the bars by default, the phone\'s canvas with backdrop: \'canvas\', and nothing else', async () => {
      const s = mount({ ...own(), tabs: null });
      const colour = () => getComputedStyle(s.root).backgroundColor;
      const scene = colour();
      s.shell.update({ backdrop: 'canvas' });
      const canvas = colour();
      s.shell.update({ backdrop: 'scene' });
      const back = colour();
      let refused = false;
      try { s.shell.update({ backdrop: 'paper' }); } catch (error) { refused = error instanceof TypeError && /backdrop is scene or canvas/.test(error.message); }
      s.shell.dispose();
      // The pack's .scene (#07090F) and its phone's canvas (kit.css .ph, --canvas #10141C).
      return { ok: scene === 'rgb(7, 9, 15)' && canvas === 'rgb(16, 20, 28)' && back === scene && refused, scene, canvas, back, refused };
    });

    await check('head: a sheet\'s head action sits before Close, keeps its focus, reports onSheetAction, works while reconnecting and returns the focus when it goes', async () => {
      const hide = { id: 'hide', icon: 'hide', label: 'Hide card' };
      const sheet = { id: 'card', title: 'Your role', sub: 'Only on this phone', detent: 'large', head: [hide] };
      const s = mount({ ...own(), sheet });
      const head = s.q('.ms-ps-sheet-head');
      const order = [...head.children].map(c => c.classList.contains('ms-ps-sheet-title') ? 'title' : c.dataset.intent);
      const button = s.q('[data-intent="sheet-head"]');
      const label = button?.getAttribute('aria-label');
      button.focus();
      // Kept, with the focus, through updates of the sheet's words and the action's own.
      s.shell.update({ sheet: { ...sheet, title: 'Your role · Doctor' } });
      s.shell.update({ sheet: { ...sheet, head: [{ ...hide, label: 'Hide your card' }] } });
      const kept = s.q('[data-intent="sheet-head"]') === button && document.activeElement === button && button.getAttribute('aria-label') === 'Hide your card';
      button.click();
      const tapped = JSON.stringify(s.calls.filter(c => c[0] === 'onSheetAction'));
      // While reconnecting it is still taken (this phone's own, as Back and Close); a footer action is not.
      s.shell.update({ status: 'stale', sheet: { ...sheet, actions: [{ id: 'send', label: 'Send' }] } });
      button.click();
      s.q('.ms-ps-sheet-foot button').click();
      const stale = s.calls.filter(c => c[0] === 'onSheetAction').map(c => c[1]).join(',');
      // Unavailable with a reason: refused, focusable, described.
      s.shell.update({ status: 'live', sheet: { ...sheet, head: [{ ...hide, enabled: false, reason: 'Not while the film plays' }] } });
      const before = s.calls.filter(c => c[0] === 'onSheetAction').length;
      button.click();
      const off = button.getAttribute('aria-disabled') === 'true' && describedBy(button) === 'Not while the film plays' && s.calls.filter(c => c[0] === 'onSheetAction').length === before;
      // Gone while focused (the card hidden): the focus returns, and says which control ended.
      button.focus();
      s.shell.update({ sheet: { ...sheet, head: [] } });
      // The policy says which control ended in a microtask, once the focus is on the shell.
      await Promise.resolve();
      await Promise.resolve();
      const gone = !s.q('[data-intent="sheet-head"]') && document.activeElement === s.root;
      const returned = JSON.stringify(named(s.calls, 'onFocusReturn').at(-1)?.[1] ?? null);
      s.shell.dispose();
      const ok = order.join(',') === 'title,sheet-head,sheet-close' && label === 'Hide card' && kept && tapped === '[["onSheetAction","hide","card"]]'
        && stale === 'hide,hide' && off && gone && returned === '{"intent":"sheet-head","value":"hide"}';
      return { ok, order, label, kept, tapped, stale, off, gone, returned };
    });

    await check('toast: shown once per id, gone after its time, and cleared by suspend()', async () => {
      const s = mount({ ...own(), toast: { id: 'passed-1', text: 'Turn passed', icon: 'info' } });
      const shown = !!s.q('.ms-ps-toast');
      await wait(TOAST_MS + 450);
      const gone = !s.q('.ms-ps-toast');
      s.shell.update({ toast: { id: 'passed-1', text: 'Turn passed', icon: 'info' } });
      const notAgain = !s.q('.ms-ps-toast');
      s.shell.update({ toast: { id: 'registered-2', text: 'Registered' } });
      const next = s.q('.ms-ps-toast')?.textContent ?? null;
      s.shell.suspend();
      const suspended = !s.q('.ms-ps-toast');
      s.shell.resume();
      const resumed = !s.q('.ms-ps-toast');
      s.shell.dispose();
      return { ok: shown && gone && notAgain && next === 'Registered' && suspended && resumed, shown, gone, notAgain, next, suspended, resumed };
    });

    await check('hud: a long press shows a capped tab\'s word large at 200% text, and nothing at 100%', async () => {
      const s = mount();
      const press = async () => {
        const tab = s.q('.ms-ps-tab[data-value="switch"]');
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await wait(650);
        const hud = s.q('.ms-ps-hud')?.textContent ?? null;
        tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        return { hud, after: !!s.q('.ms-ps-hud') };
      };
      const plain = await press();
      document.documentElement.style.fontSize = '200%';
      await frames();
      const large = await press();
      document.documentElement.style.fontSize = '';
      s.shell.dispose();
      return { ok: plain.hud === null && large.hud === 'Board' && !large.after, plain, large };
    });

    await check('dispose: twice is safe; layout(), slot() and sheetBody are null; nothing is left and nothing fires', async () => {
      const s = mount({ ...own(), sheet: passSheet });
      const hero = s.q('.ms-ps-hero');
      s.shell.dispose();
      s.shell.dispose();
      hero.click();
      s.shell.update({ status: 'stale' });
      return { ok: s.shell.layout() === null && s.shell.slot('clock') === null && s.shell.sheetBody === null && !frame.querySelector('.ms-phone-shell')
        && s.calls.filter(c => c[0] !== 'onLayout').length === 0, left: frame.children.length };
    });
  }

  await check(`motion: the sheet slides in, or fades in 80 ms with Reduce motion${deviceReduced ? ' (the device\'s, emulated)' : ''}`, async () => {
    const s = mount({ ...own(), sheet: passSheet });
    const look = () => { const st = getComputedStyle(s.q('.ms-ps-sheet')); return { name: st.animationName, duration: st.animationDuration }; };
    const normal = look();
    s.shell.update({ reducedMotion: true, sheet: { ...passSheet, id: 'pass-2' } });
    const reduced = look();
    s.shell.dispose();
    const fade = r => r.name === 'ms-ps-fade' && r.duration === '0.08s';
    return { ok: fade(reduced) && (deviceReduced ? fade(normal) : normal.name === 'ms-ps-sheet-in'), normal, reduced };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

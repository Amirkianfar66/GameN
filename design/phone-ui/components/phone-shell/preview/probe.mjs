// mothership:dev-only
//
// The phone shell's lifecycle probe: it drives the real component (../phone-shell.mjs) in the browser,
// under whatever headers serve the page (design/tools/phone-shell-check.mjs serves the production ones),
// and reports what it saw. Each check is one behaviour Frontend relies on:
//   focus     a focused control keeps its element and the focus through ordinary updates; the focused
//             control ending moves the focus to the shell and reports it once (onFocusReturn); a final target bar
//             (target.cancel false, 0.2.12) keeps its words with no Cancel
//   refused   an unavailable, busy or non-interactive control takes no tap, and says why
//   stale     reconnecting, only Retry, ⋮, the target bar's Cancel and a sheet's back and close work
//   out       an eliminated player's banner (0.2.8): the pack's words and icon, no Retry, the controls as given;
//             a docked sheet stays below it; it is this viewer's, and reconnecting takes its place while given
//   private   concealed, nothing to read and no control; this viewer's inputs are dropped, also when
//             the viewer changes
//   time      the clock shows what it is given, amber in the last 10 s, and never counts by itself
//   layout    the bars and the stage are measured, and a change of text size, insets or bars reported
//   layers    the cover lies over the stage and above all it holds, under the overlays and the sheet; with a
//             sheet open the toast stays above it and the banner under it, as the pack's; with the banner
//             showing, a docked sheet stays below it, so Retry and the sheet's Close are both in sight
//   large     at the Largest text, in the shell's phone container: a row's value goes under its title, a
//             stacking segmented control stacks, and the sheet's footer buttons stay inside it; at the Standard
//             text none of these changes
//   nobar     with bar: null the stage runs to the top edge, the overlays keep the bar's place (as the pack's
//             do on its films), and slot('clock') keeps its element
//   edge      with edge: true the stage and its cover fill the shell, under the bar when there is one;
//             layout() gives the safe areas, also when only they change; the overlays stay where they are
//   reach     the cover's reach (--ms-ps-cover-top, --ms-ps-cover-bottom) is how far it lies from the phone's
//             edges, so a part in the cover reaches the whole phone by them (with bars, no bar, talk, edge)
//   backdrop  the room view's space behind the bars by default, the phone's canvas with backdrop: 'canvas'
//   head      a sheet's head action sits after the title and before Close, keeps its element and the focus,
//             reports onSheetAction, works while reconnecting (it is this phone's own), and returns the focus
//             when it goes
//   footer    a footer action is primary, secondary or warn (the pack's Abort match); a local one (a code's
//             Reveal, Hide and Copy, a confirm's Keep playing) works while reconnecting, a command does not
//   talk      the private talk's two buttons stay inside the phone at the Largest text, a row each when they
//             don't fit; a docked sheet stays 10 px above them; layout().covered.bottom is what they cover
//   toast     shown once per id, gone after its time, cleared by suspend(); it takes no tap, so a tap at its
//             centre reaches the control under it (kit 0.8.0); words too long for one line wrap inside the phone at
//             every text size, its paper holds them, and words that fit keep one line (kit 0.8.2)
//   motion    the sheet slides and the toast drops in (the kit's, 0.8.0), or each fades in 80 ms with Reduce
//             motion (the game's, or the device's)
//   words     a phase bar's line changing (the lit Blackout's "Lights out in 0:03", then 0:02; ../phase-bars.mjs,
//             0.2.10) builds only the bar's left part again: the bar keeps its height, Promises, the round, the
//             clock and ⋮ keep their elements and places, the focus stays, and no layout is reported
//   hud       a long press on a capped tab label shows its word large, and only then
//   card      Card is the last tab and draws this viewer's own crew portrait (0.3.0, the owner's 18 November 2026
//             decision): the top bar's portrait itself, the same picture, shape and 32 px size (0.3.1), with no ring
//             at rest and an amber one only while its sheet is open; with no character it keeps the card icon; the
//             tab is named Card and announces open as the others do; the portrait's foot is an icon's foot, so the
//             label keeps its level and the bar its height at every text size
//   dispose   after dispose(), nothing is left and nothing fires
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { mountPhoneShell, TOAST_MS, RECONNECTING, OUT } from '../phone-shell.mjs';
import { phaseBar } from '../phase-bars.mjs';
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

    // 0.2.12: a choice made and final (the Disabler's fixed position, sheet 30) keeps its bar's words with no Cancel, so
    // nothing reads as undo; the rule makes the position final (#310's change 3).
    await check('focus: a final target bar (target.cancel false, 0.2.12) keeps its words and element with no Cancel; made final while Cancel has the focus, the focus comes back to the shell, reported once; Cancel is back when the choice can be left again', async () => {
      const choosing = { icon: 'rescue', title: 'Choose a position', sub: 'Room A · any position, even empty' };
      const fixed = { icon: 'rescue', title: 'Position A3 fixed', sub: 'Resolves after the window · no effect shown now', cancel: false };
      const s = mount({ ...own(), target: choosing });
      const node = s.q('.ms-ps-target');
      s.q('[data-intent="cancel-target"]').focus();
      s.shell.update({ target: fixed });
      await Promise.resolve();
      await Promise.resolve();
      const returns = named(s.calls, 'onFocusReturn').map(r => r[1]);
      const final = { same: s.q('.ms-ps-target') === node, cancel: !!s.q('[data-intent="cancel-target"]'), title: s.q('.ms-ps-target b')?.textContent ?? null,
        sub: s.q('.ms-ps-target .ms-ps-text span')?.textContent ?? null, role: node.getAttribute('role'), marked: node.hasAttribute('data-final'),
        focusOnShell: document.activeElement === s.root, returns: returns.length, returned: returns[0]?.intent ?? null };
      s.shell.update({ target: choosing });
      const again = { same: s.q('.ms-ps-target') === node, cancel: !!s.q('[data-intent="cancel-target"]'), marked: node.hasAttribute('data-final') };
      let refused = false;
      try { s.shell.update({ target: { ...fixed, cancel: 'no' } }); } catch (error) { refused = /target.cancel is true or false/.test(String(error)); }
      s.shell.dispose();
      return { ok: final.same && !final.cancel && final.title === 'Position A3 fixed' && final.sub === fixed.sub && final.role === 'status' && final.marked
        && final.focusOnShell && final.returns === 1 && final.returned === 'cancel-target' && again.same && again.cancel && !again.marked && refused, final, again, refused };
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

    await check('stale: only Retry, ⋮, the target bar\'s Cancel and a sheet\'s back and close work; the rest say why', async () => {
      const s = mount({ ...own(), status: 'stale', banner: { kind: 'reconnecting' }, sheet: passSheet, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' } });
      const local = ['retry', 'menu', 'cancel-target', 'sheet-back', 'sheet-close'];
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
      const want = ['onRetry', 'onMenu', 'onCancelTarget', 'onSheetBack', 'onSheetClose'];
      return { ok: fired.length === 5 && want.every(n => fired.includes(n)) && described && localOpen && game.length >= 5 && live.hero === 1 && live.reason === null,
        fired, game: game.length, described, localOpen, live };
    });

    await check('out: an eliminated player\'s banner has the pack\'s words and icon and no Retry, and leaves the controls as given; a docked sheet stays below it; it is this viewer\'s, so a new viewer or concealment drops it, and reconnecting takes its place while given', async () => {
      const tabs = { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false }, enabled: { actions: false }, reasons: { actions: 'You’re out' } };
      const s = mount({ ...own(), tabs, banner: { kind: 'out' } });
      await frames();
      const node = s.q('.ms-ps-banner');
      const look = { kind: node?.dataset.kind ?? null, title: node?.querySelector('.ms-ps-text b')?.textContent ?? null, sub: node?.querySelector('.ms-ps-text span')?.textContent ?? null,
        icon: !!node?.querySelector('.ms-ps-banner-icon svg'), buttons: node?.querySelectorAll('button').length ?? null, role: node?.getAttribute('role') ?? null };
      const words = look.kind === 'out' && look.title === OUT.title && look.sub === OUT.sub && look.icon && look.buttons === 0 && look.role === 'status';
      // The controls are as Frontend gives them: the phone is live, a tab it offers takes a tap, and the one it doesn't
      // is described by its reason.
      s.q('.ms-ps-tab[data-value="card"]').click();
      const actions = s.q('.ms-ps-tab[data-value="actions"]');
      actions.click();
      const controls = { taps: named(s.calls, 'onTab').length, actionsOff: actions.getAttribute('aria-disabled') === 'true', reason: describedBy(actions) };
      const asGiven = controls.taps === 1 && controls.actionsOff && controls.reason === 'You’re out';
      // A large docked sheet stays below it, as below the reconnecting banner.
      s.shell.update({ sheet: { ...passSheet, id: 'out-sheet', detent: 'large' } });
      await frames();
      await Promise.all(s.q('.ms-ps-sheet').getAnimations().map(a => a.finished.catch(() => null)));
      await frames();
      const gap = s.q('.ms-ps-sheet').getBoundingClientRect().top - s.q('.ms-ps-banner').getBoundingClientRect().bottom;
      s.shell.update({ sheet: null });
      // Reconnecting takes its place while it is given, with Retry; the eliminated player's comes back when given again.
      s.shell.update({ status: 'stale', banner: { kind: 'reconnecting' } });
      const swapped = s.q('.ms-ps-banner')?.dataset.kind === 'reconnecting' && !!s.q('.ms-ps-banner [data-intent="retry"]');
      s.shell.update({ status: 'live', banner: { kind: 'out' } });
      const back = s.q('.ms-ps-banner')?.dataset.kind === 'out' && !s.q('.ms-ps-banner button');
      // It is this viewer's: a new viewer drops it unless the update gives the new viewer's own; concealment drops it,
      // and it does not come back by itself.
      s.shell.update({ viewer: 5 });
      const newViewer = !s.q('.ms-ps-banner');
      s.shell.update({ viewer: SELF, banner: { kind: 'out' } });
      const given = s.q('.ms-ps-banner')?.dataset.kind === 'out';
      s.shell.update({ status: 'concealed' });
      const concealed = !s.q('.ms-ps-banner') && !s.root.textContent.includes(OUT.title) && !s.root.textContent.includes(OUT.sub);
      s.shell.update({ status: 'live' });
      const notBack = !s.q('.ms-ps-banner');
      // The reconnecting banner is the phone's, not the viewer's: a new viewer keeps it.
      s.shell.update({ status: 'stale', banner: { kind: 'reconnecting' } });
      s.shell.update({ viewer: 6 });
      const phoneKept = s.q('.ms-ps-banner')?.dataset.kind === 'reconnecting';
      s.shell.dispose();
      return { ok: words && asGiven && gap >= 7.5 && swapped && back && newViewer && given && concealed && notBack && phoneKept,
        look, controls, gap: Math.round(gap * 10) / 10, swapped, back, newViewer, given, concealed, notBack, phoneKept };
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
      // The toast takes no tap (kit 0.8.0), so a hit test passes through it: its paint order is read with its pointer
      // events on for that one measurement only.
      const painted = node => { node.style.pointerEvents = 'auto'; const hit = node.contains(at(node)); node.style.pointerEvents = ''; return hit; };
      const settle = async selector => { await frames(); await Promise.all((s.q(selector)?.getAnimations() ?? []).map(a => a.finished.catch(() => null))); };
      const stageBox = s.shell.stage.getBoundingClientRect(), coverBox = s.shell.slot('cover').getBoundingClientRect();
      const sameBox = ['top', 'left', 'width', 'height'].every(k => Math.abs(stageBox[k] - coverBox[k]) < 0.5);
      const middle = () => document.elementFromPoint(stageBox.left + stageBox.width / 2, stageBox.top + stageBox.height * 0.6);
      const overStage = middle() === card;
      // Each overlay alone (they share the strip under the bar), over the cover.
      const alone = async (input, selector) => { s.shell.update({ target: null, banner: null, toast: null, ...input }); await settle(selector); const node = s.q(selector); return !!node && painted(node); };
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
      const toastOverSheet = painted(s.q('.ms-ps-toast'));
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
        const s = mount({ ...own(), sheet: { id: 'large', title: 'Your role', sub: 'Only on this phone', close: true, detent: 'large',
          actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'register', label: 'Register Rescue', kind: 'primary', icon: 'rescue' }] } });
        try {
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
        const sheetBox = box(s.q('.ms-ps-sheet')), feet = [...s.q('.ms-ps-sheet-foot').querySelectorAll('.ms-k-btn')];
        const footInside = feet.every(b => box(b).left >= sheetBox.left - 0.5 && box(b).right <= sheetBox.right + 0.5);
        const footWhole = feet.every(b => b.scrollWidth <= b.clientWidth + 1);
        const footRows = new Set(feet.map(b => Math.round(box(b).top))).size;
        const phone = frame.querySelector('.ms-phone-shell');
        return { under, beside, apart, stacked: new Set(tops(seg)).size === 3, segWhole: whole(seg), shortRow: new Set(tops(short)).size === 1, footInside, footWhole, footRows,
          phoneEm: Math.round(box(phone).width / parseFloat(getComputedStyle(phone).fontSize) * 10) / 10 };
        } finally { s.shell.dispose(); document.documentElement.style.fontSize = ''; }
      };
      const largest = await measure(200), standard = await measure(100);
      const ok = largest.under.every(Boolean) && largest.apart.every(Boolean) && largest.stacked && largest.segWhole && largest.shortRow
        && largest.footInside && largest.footWhole
        && standard.beside.every(Boolean) && standard.apart.every(Boolean) && !standard.stacked && standard.segWhole && standard.shortRow
        && standard.footInside && standard.footWhole && standard.footRows === 1;
      return { ok, largest, standard };
    });

    // The text size changing on a live phone (0.2.11). The Gameplay builder found, in Chromium 153, that a part opened after
    // the text size changed took the old size's container rules: at 200 % Move's target bar stood side by side, its chip's
    // label was cut, and a sheet's Cancel and Register Rescue stayed side by side; a part open through the change was right.
    await check('textsize: after the text size changes on a live phone, a target bar, a chip and a sheet opened afterwards take the new size\'s rules, as parts open through the change and a shell mounted at that size do; back at the Standard text, the Standard rules', async () => {
      const kit = createKit(document);
      const target = { icon: 'move', title: 'Move within Room A', sub: 'Choose an empty position · or another room on the Board' };
      const chip = { id: 'move-board', label: 'Other rooms on the Board', icon: 'board', tone: 'paper' };
      const sheet = { id: 'textsize', title: 'Rescue', sub: 'Once a round', close: true, detent: 'large',
        actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'register', label: 'Register Rescue', kind: 'primary', icon: 'rescue' }] };
      const text = size => { document.documentElement.style.fontSize = size === 100 ? '' : `${size}%`; };
      const box = n => n.getBoundingClientRect();
      // The sheet's body holds a row with a value and a segmented control that stacks: the kit's own two phone rules.
      const fill = s => {
        const row = kit.row({ tag: 'div', title: 'Promises', value: 'Given 0/1 · Received 1/1', icon: 'promise' });
        const seg = kit.seg({ options: [{ id: 'card', label: 'Card' }, { id: 'knowledge', label: 'Knowledge' }, { id: 'resources', label: 'Resources' }], value: 'card', stack: true, label: 'Part' });
        s.shell.sheetBody.replaceChildren(kit.list([row]), seg);
      };
      // How each open part is laid out, by the shell's rules (14 em, 19 em) and the kit's (19 em, 15 em).
      const read = s => {
        const t = s.q('.ms-ps-target'), c = s.q('.ms-ps-chip'), foot = s.q('.ms-ps-sheet-foot'), row = s.q('.ms-ps-sheet-body .ms-k-row'), seg = s.q('.ms-ps-sheet-body .ms-k-seg');
        const words = t?.querySelector('.ms-ps-text'), cancel = t?.querySelector(':scope > .ms-k-btn'), label = c?.querySelector('.ms-k-btn-label');
        return {
          target: t ? { display: getComputedStyle(t).display, cancelUnder: box(cancel).top >= box(words).bottom - 0.5, height: Math.round(box(t).height) } : null,
          chip: c ? { whiteSpace: getComputedStyle(c).whiteSpace, whole: label.scrollWidth <= label.clientWidth + 1 } : null,
          foot: foot ? { wrap: getComputedStyle(foot).flexWrap, rows: new Set([...foot.querySelectorAll('.ms-k-btn')].map(b => Math.round(box(b).top))).size } : null,
          row: row ? { valueUnder: box(row.querySelector('.ms-k-row-value')).top >= box(row.querySelector('.ms-k-row-title')).bottom - 1 } : null,
          seg: seg ? { stacked: new Set([...seg.children].map(b => Math.round(box(b).top))).size === seg.children.length } : null,
        };
      };
      const open = async s => { s.shell.update({ target, chip, sheet }); fill(s); await frames(); await frames(); };
      const shut = async s => { s.shell.update({ target: null, chip: null, sheet: null }); await frames(); };
      // A shell mounted at each size, its parts open from the start: what each size's rules draw.
      const fresh = async size => { text(size); const s = mount(); try { await open(s); return read(s); } finally { s.shell.dispose(); text(100); } };
      const large = await fresh(200), standard = await fresh(100);
      const s = mount();
      let after, back, again, through;
      try {
        await frames();
        // 200 % first, with nothing open; then the target bar, the chip and the sheet open (the builder's two sequences).
        text(200); await frames(); await frames();
        await open(s); after = read(s);
        // The same the other way: closed, back to the Standard text with nothing open, then opened.
        await shut(s);
        text(100); await frames(); await frames();
        await open(s); back = read(s);
        // Open through each change (the case that was already right).
        text(200); await frames(); await frames(); again = read(s);
        text(100); await frames(); await frames(); through = read(s);
      } finally { s.shell.dispose(); text(100); }
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const drawn = large.target?.display === 'grid' && large.target.cancelUnder && large.chip?.whiteSpace === 'normal' && large.chip.whole && large.foot?.wrap === 'wrap'
        && large.row?.valueUnder && large.seg?.stacked && standard.target?.display === 'flex' && standard.foot?.wrap === 'nowrap' && standard.foot.rows === 1
        && standard.row?.valueUnder === false && standard.seg?.stacked === false;
      return { ok: drawn && same(after, large) && same(back, standard) && same(again, large) && same(through, standard), large, standard, after, back, again, through };
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

    await check('reach: the cover\'s reach (--ms-ps-cover-top, --ms-ps-cover-bottom) is how far it lies from the phone\'s edges, so a part in it reaches the whole phone: with the bars, with no bar, with the private talk\'s buttons, and edge to edge', async () => {
      const cases = {
        bars: own(),
        nobar: { ...own(), bar: null },
        talk: { ...own(), bar: { kind: 'pair', pair: [person(1), person(SELF)], round: 3, timer: { remainingMs: 47000 }, promises: { count: 0 }, menu: {} }, tabs: { variant: 'talk' } },
        edge: { ...own(), edge: true },
      };
      const px = v => Math.round(v * 100) / 100;
      const out = {};
      for (const [name, input] of Object.entries(cases)) {
        const s = mount(input);
        try {
          await frames();
          const box = s.root.getBoundingClientRect(), slot = s.shell.slot('cover'), cover = slot.getBoundingClientRect();
          // A part in the cover that reaches past it by the two lengths, as the round stamp does to centre on the phone.
          const part = document.createElement('div');
          Object.assign(part.style, { position: 'absolute', left: '0', right: '0', top: 'calc(0px - var(--ms-ps-cover-top, 0px))', bottom: 'calc(0px - var(--ms-ps-cover-bottom, 0px))' });
          slot.append(part);
          const r = part.getBoundingClientRect();
          out[name] = { cover: [px(cover.top - box.top), px(box.bottom - cover.bottom)], part: [px(r.top - box.top), px(box.bottom - r.bottom)], height: px(r.height), phone: px(box.height) };
          part.remove();
        } finally { s.shell.dispose(); }
      }
      const fills = c => c.part[0] === 0 && c.part[1] === 0 && c.height === c.phone;
      const ok = Object.values(out).every(fills) && out.bars.cover[0] === 99 && out.bars.cover[1] > 0 && out.nobar.cover[0] === 0 && out.nobar.cover[1] > 0
        && out.talk.cover[0] === 99 && out.talk.cover[1] === 0 && out.edge.cover[0] === 0 && out.edge.cover[1] === 0;
      return { ok, ...out };
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

    await check('footer: an action is primary, secondary or warn (the pack\'s Abort match, outlined in paper); a local one works while reconnecting, a command is refused with the banner\'s words, and interactive: false refuses both', async () => {
      const abort = { id: 'abort', title: 'Host controls', close: true, back: true, detent: 'large',
        actions: [{ id: 'keep', label: 'Keep playing', local: true }, { id: 'abort', label: 'Abort match', kind: 'warn' }] };
      const code = { id: 'code', title: 'Recovery code', sub: 'Private to this phone', close: true, back: true, detent: 'large',
        actions: [{ id: 'hide', label: 'Hide', icon: 'hide', local: true }, { id: 'copy', label: 'Copy', icon: 'copy', kind: 'primary', local: true }] };
      const s = mount({ ...own(), sheet: abort });
      try {
        const btn = id => s.q(`.ms-ps-sheet-foot [data-value="${id}"]`);
        const reported = () => named(s.calls, 'onSheetAction').map(c => c[1]).join(',');
        const warn = btn('abort'), keep = btn('keep');
        // The warn kind is the kit's warn button, the pack's .btn-warn: no fill, and a 2 px ring in its own paper ink.
        const cs = getComputedStyle(warn);
        const warnLook = { bg: cs.backgroundColor, ink: cs.color, ring: cs.boxShadow };
        const looks = warn.classList.contains('ms-k-btn-warn') && keep.classList.contains('ms-k-btn-secondary')
          && warnLook.bg === 'rgba(0, 0, 0, 0)' && warnLook.ring.startsWith(warnLook.ink) && /\binset\b/.test(warnLook.ring) && /\b2px\b/.test(warnLook.ring);
        const intents = `${keep.dataset.intent},${warn.dataset.intent}`;
        // Any other kind is drawn as secondary, as before.
        s.shell.update({ sheet: { ...abort, actions: [{ ...abort.actions[0], kind: 'tinted' }, abort.actions[1]] } });
        const other = btn('keep').classList.contains('ms-k-btn-secondary');
        // Reconnecting: Keep playing (local) is taken; Abort match (a command) is refused with the banner's words.
        s.shell.update({ status: 'stale', sheet: abort });
        keep.click();
        warn.click();
        const staleWhy = { keep: describedBy(keep), abort: describedBy(warn) };
        // A recovery code's Hide and Copy are this phone's own: taken while reconnecting.
        s.shell.update({ sheet: code });
        btn('hide').click();
        btn('copy').click();
        const whileStale = reported();
        // interactive: false refuses a local action too.
        s.shell.update({ status: 'live', interactive: false });
        btn('hide').click();
        const refused = reported() === whileStale;
        // Live: the command is taken.
        s.shell.update({ interactive: true, sheet: abort });
        btn('abort').click();
        const live = reported();
        const ok = looks && intents === 'sheet-local,sheet-action' && other && staleWhy.keep === null && staleWhy.abort === RECONNECTING.sub
          && whileStale === 'keep,hide,copy' && refused && live === 'keep,hide,copy,abort';
        return { ok, looks, warnLook, intents, other, staleWhy, whileStale, refused, live };
      } finally { s.shell.dispose(); }
    });

    await check('talk: the private talk\'s two buttons stay inside the phone and whole at the Largest text on 320 × 568, a row each where they do not fit side by side; a docked sheet stays 10 px above them and layout().covered.bottom is how much they cover; at the Standard text, the pack\'s two equal columns', async () => {
      const talk = { ...own(), bar: { kind: 'pair', pair: [person(1), person(SELF)], round: 3, timer: { remainingMs: 47000 }, promises: { count: 0 }, menu: {} }, tabs: { variant: 'talk' },
        sheet: { id: 'promises', title: 'Promises', close: true } };
      const px = v => Math.round(v * 100) / 100;
      const was = { width: frame.style.width, height: frame.style.height };
      const out = {};
      try {
        for (const [name, text, width, height, insets] of [['standard', 100, size.width, size.height, size.insets], ['largest', 200, 320, 568, { top: 20, bottom: 0 }]]) {
          document.documentElement.style.fontSize = `${text}%`;
          Object.assign(frame.style, { width: `${width}px`, height: `${height}px` });
          const s = mount({ ...talk, insets });
          try {
            await frames();
            await frames();
            const sheetNode = s.q('.ms-ps-sheet');
            await Promise.all(sheetNode.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming?.().endTime)).map(a => a.finished.catch(() => null)));
            const box = s.root.getBoundingClientRect(), foot = s.q('.ms-ps-talk').getBoundingClientRect(), sheet = sheetNode.getBoundingClientRect();
            const buttons = s.qa('.ms-ps-talk .ms-k-btn');
            const rects = buttons.map(b => b.getBoundingClientRect());
            out[name] = {
              inside: rects.every(r => r.left >= box.left - 0.5 && r.right <= box.right + 0.5),
              whole: buttons.every(b => b.scrollWidth <= b.clientWidth + 1),
              rows: new Set(rects.map(r => Math.round(r.top))).size,
              widths: rects.map(r => px(r.width)),
              gap: px(foot.top - sheet.bottom),
              covered: s.shell.layout().covered.bottom,
              footFromBottom: px(box.bottom - foot.top),
            };
          } finally { s.shell.dispose(); }
        }
      } finally {
        document.documentElement.style.fontSize = '';
        Object.assign(frame.style, was);
      }
      const { standard: st, largest: lg } = out;
      const ok = st.inside && st.whole && st.rows === 1 && Math.abs(st.widths[0] - st.widths[1]) < 0.5 && Math.abs(st.gap - 10) < 0.5 && Math.abs(st.covered - st.footFromBottom) < 0.5
        && lg.inside && lg.whole && (lg.rows === 1 ? Math.abs(lg.widths[0] - lg.widths[1]) < 0.5 : true) && Math.abs(lg.gap - 10) < 0.5 && Math.abs(lg.covered - lg.footFromBottom) < 0.5;
      return { ok, ...out };
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

    await check('toast: it takes no tap; a tap at its centre reaches the control under it', async () => {
      const s = mount({ ...own(), toast: { id: 'through-1', text: 'Copied' } });
      // A control under the toast's place: a button over the whole cover, where a component draws over the stage.
      const under = document.createElement('button');
      under.type = 'button';
      under.textContent = 'Under';
      Object.assign(under.style, { position: 'absolute', inset: '0', pointerEvents: 'auto' });
      let taps = 0;
      under.addEventListener('click', () => { taps += 1; });
      s.shell.slot('cover').append(under);
      const node = s.q('.ms-ps-toast');
      await frames();
      await Promise.all(node.getAnimations().map(a => a.finished.catch(() => null)));
      const r = node.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const none = getComputedStyle(node).pointerEvents === 'none';
      // The toast does lie over that point: with its pointer events on, the same point finds it.
      node.style.pointerEvents = 'auto';
      const over = node.contains(document.elementFromPoint(x, y));
      node.style.pointerEvents = '';
      const hit = document.elementFromPoint(x, y);
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      s.shell.dispose();
      return { ok: none && over && hit === under && taps === 1, none, over, hit: hit === under ? 'the control' : hit?.className ?? null, taps };
    });

    // The toast at larger text (kit 0.8.2). The in-game animation builder measured the kit's toast cutting the game's longer
    // words at the Large and Largest text: "That phase closed · choices cleared" needed 390 and 520 of its 302 px at 390 × 844.
    await check('toast: words too long for one line wrap inside the phone and its paper holds them, at every text size on 390, 430 and 320 px phones; words that fit keep one line', async () => {
      const lines = ['The ship moved · Round 12 complete', 'That phase closed · choices cleared', 'Captain election open', 'Turn passed'];
      const phones = [[390, 844, [100, 150, 200]], [430, 932, [100, 150, 200]], [320, 568, [100, 200]]];
      const was = { width: frame.style.width, height: frame.style.height };
      const px = v => Math.round(v * 10) / 10;
      const results = [];
      try {
        for (const [width, height, texts] of phones) for (const text of texts) {
          document.documentElement.style.fontSize = text === 100 ? '' : `${text}%`;
          Object.assign(frame.style, { width: `${width}px`, height: `${height}px` });
          for (const [i, words] of lines.entries()) {
            const s = mount({ ...own(), toast: { id: `fit-${width}-${text}-${i}`, text: words, icon: 'info' } });
            try {
              await frames();
              const node = s.q('.ms-ps-toast');
              node.getAnimations().forEach(a => a.finish());
              const phone = s.root.getBoundingClientRect(), box = node.getBoundingClientRect();
              const span = node.querySelector('.ms-k-toast-text'), spanBox = span.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(span);
              const rects = [...range.getClientRects()].filter(q => q.width > 0);
              // The words' width on one line, measured beside them in the same font, and the room the toast gives them.
              const one = span.cloneNode(true);
              Object.assign(one.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', width: 'max-content' });
              node.append(one);
              const need = one.getBoundingClientRect().width;
              one.remove();
              const cs = getComputedStyle(node), icon = node.querySelector('svg').getBoundingClientRect().width;
              const room = phone.width - 32 - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - icon - parseFloat(cs.columnGap);
              // The paper: the toast's box with its corners rounded as drawn (a radius of at most half the box).
              const r = Math.min(parseFloat(cs.borderTopLeftRadius), box.height / 2, box.width / 2);
              const onPaper = (x, y) => {
                if (x < box.left - 0.5 || x > box.right + 0.5 || y < box.top - 0.5 || y > box.bottom + 0.5) return false;
                const cx = Math.min(Math.max(x, box.left + r), box.right - r), cy = Math.min(Math.max(y, box.top + r), box.bottom - r);
                return Math.hypot(x - cx, y - cy) <= r + 0.5;
              };
              const corners = q => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]];
              const count = new Set(rects.map(q => Math.round(q.top))).size;
              results.push({
                phone: `${width}x${height}`, text, words, lines: count, need: px(need), room: px(room), box: [px(box.width), px(box.height)], radius: px(r),
                inside: box.left >= phone.left + 15.5 && box.right <= phone.right - 15.5,
                held: rects.every(q => corners(q).every(([x, y]) => onPaper(x, y))),
                whole: span.textContent === words && rects.every(q => q.left >= spanBox.left - 0.5 && q.right <= spanBox.right + 0.5),
                wraps: need <= room + 0.5 ? count === 1 : count >= 2,
              });
            } finally { s.shell.dispose(); }
          }
        }
      } finally {
        document.documentElement.style.fontSize = '';
        Object.assign(frame.style, was);
      }
      const good = r => r.inside && r.held && r.whole && r.wraps;
      return { ok: results.length === 32 && results.every(good), failing: results.filter(r => !good(r)), results };
    });

    await check('words: the lit Blackout\'s line counts down (Lights out in 0:03, 0:02, 0:01) and the lights go out; the bar keeps its height, its right side keeps its elements and places, the focus stays and no layout is reported', async () => {
      // The bar as phase-bars.mjs gives it at each second of the lit five, then dark: only its words and its clock change.
      const at = (lightsOutMs, dark = false) => phaseBar({ phase: 'BLACKOUT', dark, lightsOutMs, round: 3, remainingMs: 10000 + lightsOutMs, promises: { count: 1 }, menu: {} });
      const s = mount({ ...own(), bar: at(3000), tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } } });
      await frames();
      const parts = ['.ms-ps-tb', '.ms-ps-promises', '.ms-ps-round', '.ms-ps-timer', '.ms-ps-menu'];
      const read = () => ({ sub: s.q('.ms-ps-sub')?.textContent ?? null, clock: s.q('.ms-ps-timer')?.lastChild.textContent ?? null, tone: s.q('.ms-ps-tb').dataset.tone ?? null, who: s.q('.ms-ps-who'),
        nodes: parts.map(p => s.q(p)), boxes: parts.map(p => { const r = s.q(p).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100); }),
        bars: s.shell.layout().bars, focused: document.activeElement === s.q('.ms-ps-promises') });
      s.q('.ms-ps-promises').focus();
      const seen = [read()];
      const layouts = named(s.calls, 'onLayout').length;
      for (const [ms, dark] of [[2000, false], [1000, false], [0, true]]) {
        s.shell.update({ bar: at(ms, dark) });
        await frames();
        seen.push(read());
      }
      const first = seen[0];
      const steady = seen.every(m => m.nodes.every((n, i) => n === first.nodes[i]) && JSON.stringify(m.boxes) === JSON.stringify(first.boxes) && JSON.stringify(m.bars) === JSON.stringify(first.bars) && m.focused);
      // The left part is built again for each new line, so a stale line can never stay.
      const rebuilt = seen.every((m, i) => i === 0 || m.who !== seen[i - 1].who);
      const reported = named(s.calls, 'onLayout').length - layouts;
      const detail = { subs: seen.map(m => m.sub), clocks: seen.map(m => m.clock), tones: seen.map(m => m.tone), boxes: first.boxes, bars: first.bars, steady, rebuilt, reported };
      s.shell.dispose();
      return { ok: steady && rebuilt && reported === 0 && JSON.stringify(detail.subs) === JSON.stringify(['Lights out in 0:03', 'Lights out in 0:02', 'Lights out in 0:01', 'Dark · positions fixed'])
        && JSON.stringify(detail.clocks) === JSON.stringify(['0:13', '0:12', '0:11', '0:10']) && JSON.stringify(detail.tones) === JSON.stringify([null, null, null, 'dark']), ...detail };
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

    await check('card: Card is the last tab and draws this viewer\'s own crew portrait as the top bar draws it, the same picture, shape and 32 px size; no character keeps the card icon; named Card, open announced, an amber ring only while open; the label keeps its level and the bar its height at every text size; concealed, a new viewer and the private talk draw none', async () => {
      const me = person(SELF);
      const game = (extra = {}) => ({ ...own().tabs, me, ...extra });
      const s = mount({ ...own(), tabs: game() });
      await frames();
      const tab = () => s.q('.ms-ps-tab[data-value="card"]'), picture = () => tab()?.querySelector('.ms-ps-tab-pt') ?? null;
      const colour = value => { const i = document.createElement('i'); i.style.color = value; s.root.append(i); const c = getComputedStyle(i).color; i.remove(); return c; };
      const facts = () => {
        const p = picture(), r = p?.getBoundingClientRect() ?? null, label = tab().querySelector('.ms-ps-tab-label'), lb = label.getBoundingClientRect();
        const panels = s.q('.ms-ps-tab[data-value="panels"]'), other = panels.querySelector('.ms-ps-tab-label').getBoundingClientRect(), icon = panels.querySelector('.ms-ps-ic').getBoundingClientRect();
        const bar = s.q('.ms-ps-tabs').getBoundingClientRect();
        return { picture: !!p, image: p ? getComputedStyle(p).backgroundImage : null, box: r ? [r.width, r.height] : null, fit: p ? getComputedStyle(p).backgroundSize : null,
          // The ring: none, or the colour of the inset shadow that draws it.
          ring: p ? (getComputedStyle(p).boxShadow === 'none' ? null : /rgba?\([^)]+\)/.exec(getComputedStyle(p).boxShadow)?.[0] ?? 'other') : null,
          hidden: p?.getAttribute('aria-hidden') ?? null, icon: tab().querySelector('.ms-ps-tab-icon').dataset.icon.split(':')[0], drawnIcon: !!tab().querySelector('svg'),
          // The picture's foot is an icon's foot, it stays inside the bar, and the bar keeps the height it has without it.
          labelLevel: Math.abs(lb.top - other.top), pictureLevel: r ? Math.abs(r.bottom - icon.bottom) : null, insideBar: r ? r.top >= bar.top : null, barHeight: bar.height,
          inside: lb.right <= s.root.getBoundingClientRect().right + 0.5 && lb.left >= s.root.getBoundingClientRect().left - 0.5,
          whole: label.scrollWidth <= label.clientWidth + 1, name: tab().getAttribute('aria-label'), words: label.textContent, expanded: tab().getAttribute('aria-expanded') };
      };
      const order = s.qa('.ms-ps-tabs > *').map(n => n.dataset.value ?? 'hero');
      // The top bar's own portrait of the same person: its picture, how it is fitted, and its box.
      const top = s.q('.ms-ps-who .ms-ps-pt'), topBox = top.getBoundingClientRect();
      const rest = { ...facts(), barImage: getComputedStyle(top).backgroundImage, barFit: getComputedStyle(top).backgroundSize, barBox: [topBox.width, topBox.height] };
      // Open: the same element keeps the focus, the tab says expanded, and only then is the ring amber.
      const node = tab();
      node.focus();
      s.shell.update({ tabs: game({ open: 'card' }) });
      const open = { ...facts(), same: tab() === node, focused: document.activeElement === node, accent: colour('var(--ms-ps-accent)') };
      node.click();
      const tapped = named(s.calls, 'onTab').map(c => c[1]);
      // Unavailable: the whole tab at the pack's 38 %, with its reason, as every tab.
      s.shell.update({ tabs: game({ enabled: { card: false }, reasons: { card: 'Not available now' } }) });
      const off = { opacity: getComputedStyle(tab()).opacity, picture: !!picture(), reason: describedBy(tab()) };
      // No character, no person, or a character the crew bundle has no portrait for: the pack's card icon.
      s.shell.update({ tabs: game({ me: { ...me, character: null } }) });
      const none = facts();
      s.shell.update({ tabs: own().tabs });
      const absent = facts();
      s.shell.update({ tabs: game({ me: { ...me, character: 'c0' } }) });
      const unknown = facts();
      s.shell.update({ tabs: game({ open: 'card', me: { ...me, character: null } }) });
      const noneOpen = { ...facts(), filled: tab().querySelector('.ms-ps-tab-icon').dataset.icon };
      // Every text size on the three phones: the portrait keeps its box and its place, and the label its level.
      s.shell.update({ tabs: game() });
      const sized = {};
      for (const [key, width, height, text] of [['390 standard', 390, 844, ''], ['390 largest', 390, 844, '200%'], ['430 standard', 430, 932, ''], ['430 largest', 430, 932, '200%'], ['320 standard', 320, 568, ''], ['320 largest', 320, 568, '200%']]) {
        Object.assign(frame.style, { width: `${width}px`, height: `${height}px` });
        document.documentElement.style.fontSize = text;
        await frames();
        sized[key] = facts();
        // The bar's height with the card icon in the portrait's place, at this size: the portrait must not change it.
        s.shell.update({ tabs: game({ me: null }) });
        await frames();
        sized[key].barHeightWithIcon = s.q('.ms-ps-tabs').getBoundingClientRect().height;
        s.shell.update({ tabs: game() });
        await frames();
      }
      // A long press at the Largest text shows the tab's word with its own icon, as every tab.
      tab().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await wait(650);
      const hud = { words: s.q('.ms-ps-hud')?.textContent ?? null, icon: s.q('.ms-ps-hud-icon')?.dataset.icon ?? null };
      tab().dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
      document.documentElement.style.fontSize = '';
      await frames();
      // This viewer's own: none while concealed, none after it, none for a new viewer; the private talk's My card keeps its icon.
      s.shell.update({ status: 'concealed' });
      const concealed = s.qa('.ms-ps-tab-pt').length;
      s.shell.update({ status: 'live' });
      const shownAgain = s.qa('.ms-ps-tab-pt').length;
      s.shell.update({ tabs: game() });
      const givenAgain = s.qa('.ms-ps-tab-pt').length;
      s.shell.update({ viewer: 5 });
      const newViewer = s.qa('.ms-ps-tab-pt').length;
      s.shell.update({ viewer: SELF, tabs: { variant: 'talk', me } });
      const talk = { pictures: s.qa('.ms-ps-tab-pt').length, buttons: s.qa('.ms-ps-talk button').length, icon: s.q('.ms-ps-talk [data-value="my-card"] .ms-k-btn-icon')?.dataset.icon?.split(':')[0] ?? null };
      s.shell.dispose();
      const plain = f => !f.picture && f.icon === 'card' && f.drawnIcon;
      return { ok: order.join() === 'switch,actions,hero,panels,card'
        && rest.picture && rest.image !== 'none' && rest.image === rest.barImage && rest.fit === rest.barFit && rest.fit === 'contain' && rest.box.join() === rest.barBox.join() && rest.box.join() === '32,32'
        && rest.hidden === 'true' && rest.icon === 'card' && !rest.drawnIcon
        && rest.name === null && rest.words === 'Card' && rest.expanded === 'false' && rest.ring === null
        && open.picture && open.same && open.focused && open.expanded === 'true' && open.ring === open.accent && tapped.join() === 'card'
        && off.opacity === '0.38' && off.picture && off.reason === 'Not available now'
        && plain(none) && plain(absent) && plain(unknown) && plain(noneOpen) && noneOpen.filled === 'card:filled' && noneOpen.expanded === 'true'
        && Object.values(sized).every(f => f.picture && f.box[0] === 32 && f.box[1] === 32 && f.labelLevel < 0.5 && f.pictureLevel < 0.5 && f.insideBar && f.barHeight === f.barHeightWithIcon && f.inside && f.whole)
        && hud.words === 'Card' && hud.icon === 'card:filled'
        && concealed === 0 && shownAgain === 0 && givenAgain === 1 && newViewer === 0 && talk.pictures === 0 && talk.buttons === 2 && talk.icon === 'card',
        order, rest, open, tapped, off, none, absent, unknown, noneOpen, sized, hud, concealed, shownAgain, givenAgain, newViewer, talk };
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

  await check(`motion: the sheet slides in and the toast drops in, or each fades in 80 ms with Reduce motion${deviceReduced ? ' (the device\'s, emulated)' : ''}`, async () => {
    const s = mount({ ...own(), sheet: passSheet, toast: { id: 'motion-1', text: 'Turn passed', icon: 'info' } });
    const look = selector => { const st = getComputedStyle(s.q(selector)); return { name: st.animationName, duration: st.animationDuration }; };
    const normal = look('.ms-ps-sheet'), normalToast = look('.ms-ps-toast');
    s.shell.update({ reducedMotion: true, sheet: { ...passSheet, id: 'pass-2' } });
    const reduced = look('.ms-ps-sheet'), reducedToast = look('.ms-ps-toast');
    s.shell.dispose();
    // The toast is the kit's (kit 0.8.0): its drop and its fade are kit.css's.
    const fade = (r, name = 'ms-ps-fade') => r.name === name && r.duration === '0.08s';
    const drop = r => r.name === 'ms-k-toast-in' && r.duration === '0.22s';
    return { ok: fade(reduced) && fade(reducedToast, 'ms-k-fade') && (deviceReduced ? fade(normal) && fade(normalToast, 'ms-k-fade') : normal.name === 'ms-ps-sheet-in' && drop(normalToast)),
      normal, reduced, normalToast, reducedToast };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

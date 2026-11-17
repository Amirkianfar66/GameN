// mothership:dev-only
//
// Host setup and the host lobby's lifecycle probe: it drives the real components (../host-setup.mjs,
// ../host-lobby.mjs) in the browser, under whatever headers serve the page (design/tools/host-room-check.mjs
// serves the production ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   setup     the pack's words, the counts and the chosen count's mix from Frontend; Back, a count and Open
//             report their taps; Opening… refused while busy; a failed opening over the foot
//   lobby     the code card, the seats, the bots and Start with Frontend's reason under it; each tap reports
//   stepper   − refused at none, + at Frontend's most; Frontend's refusal refuses both, with its reason
//   keyed     a request's Admit keeps its element and the focus while others come and go; when its own request
//             leaves, the focus goes to the screen, and onFocusReturn says which
//   offline   the note under the card; it refuses nothing by itself; Frontend's refusals refuse, with the
//             reason; Leave and Copy stay usable
//   toast     once per id, 10 px under the nav bar, gone after 2.4 s; a new id replaces it; the kit's toast
//             (entry-parts 0.3.0), so it takes no tap: a tap at its centre reaches what is under it
//   refused   not interactive: every control refused, nothing dimmed
//   insets    Frontend's safe areas, or the browser's
//   text      with the Largest text the screens scroll, and the foot is reached
//   input     malformed input is refused
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    only the toast moves: in from 8 px over 220 ms, or a plain fade with Reduce motion (the game's or
//             the device's)
// With the device's Reduce motion emulated, only the motion check runs.

import { mountHostSetup, nextHostSetupInput, HOST_SETUP_DEFAULTS, SETUP_WORDS } from '../host-setup.mjs';
import { mountHostLobby, nextHostLobbyInput, HOST_LOBBY_DEFAULTS, LOBBY_WORDS } from '../host-lobby.mjs';
import { ENTRY_TOAST_MS } from '../../entry-parts/entry-parts.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const wait = ms => new Promise(done => setTimeout(done, ms));

export async function runHostRoomProbe({ sizes, lobbyOf, REQUESTS, COUNTS }) {
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
  const mountSetup = input => {
    const { calls, record } = recorder();
    const s = mountHostSetup(frame, { insets: size.insets, counts: COUNTS, count: 9, ...input }, Object.fromEntries(['onBack', 'onCount', 'onOpen', 'onLayout', 'onFocusReturn'].map(n => [n, record(n)])));
    return { s, calls, root: s.element, q: sel => s.element.querySelector(sel) };
  };
  const mountLobby = input => {
    const { calls, record } = recorder();
    const s = mountHostLobby(frame, { insets: size.insets, ...input }, Object.fromEntries(['onLeave', 'onCopy', 'onAdmit', 'onBots', 'onStart', 'onLayout', 'onFocusReturn'].map(n => [n, record(n)])));
    return { s, calls, root: s.element, q: sel => s.element.querySelector(sel), qa: sel => [...s.element.querySelectorAll(sel)] };
  };
  const taps = calls => calls.filter(c => !['onLayout', 'onFocusReturn'].includes(c[0]));
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const refused = node => node.getAttribute('aria-disabled') === 'true';
  const rel = (root, node) => node.getBoundingClientRect().top - root.getBoundingClientRect().top;
  const words = node => node?.innerText.replace(/\s+/g, ' ').trim() ?? null;
  const stepperButtons = m => m.qa('.ms-k-stepper-btn');

  if (mode === 'full') {
    await check('setup: the pack’s words, the counts and the chosen count’s mix from Frontend; Back, a count and Open report their taps', async () => {
      const m = mountSetup({});
      const seen = { title: words(m.q('.ms-ep-nav-title')), back: words(m.q('.ms-ep-back')), heading: words(m.q('.ms-ep-large-title')),
        counts: m.qa ? null : [...m.root.querySelectorAll('.ms-k-seg-btn')].map(b => `${b.textContent}:${b.getAttribute('aria-checked')}`), mix: words(m.q('.ms-k-seg + .ms-k-group-note')),
        rows: [...m.root.querySelectorAll('.ms-k-row')].map(words), open: words(m.q('.ms-hs-open')) };
      tap(m.q('.ms-ep-back')); tap(m.root.querySelector('.ms-k-seg-btn[data-value="7"]')); tap(m.q('.ms-hs-open'));
      m.s.update({ count: 7 });
      seen.mix7 = words(m.q('.ms-k-seg + .ms-k-group-note'));
      m.s.update({ count: null });
      seen.noMix = m.q('.ms-k-seg + .ms-k-group-note').hidden;
      seen.taps = taps(m.calls);
      m.s.dispose();
      return { ok: seen.title === 'Host' && seen.back === 'Menu' && seen.heading === 'New room' && JSON.stringify(seen.counts) === '["7:false","8:false","9:true"]' && seen.mix === '5 Blue · 3 Red · 1 Alien'
        && seen.rows[0] === 'Players ask to join You admit each one' && seen.rows[1] === 'Bots fill empty seats Set them in the lobby' && seen.open === 'Open room'
        && seen.mix7 === '4 Blue · 2 Red · 1 Alien' && seen.noMix && JSON.stringify(seen.taps) === '[["onBack"],["onCount",7],["onOpen",9]]', seen };
    });

    await check('the game\u2019s gaps: a count given without its mix draws no line (G1); Leave unavailable is dimmed and refused, with Frontend\u2019s reason, and reports nothing (G6)', async () => {
      const m = mountSetup({ counts: COUNTS.map(c => ({ value: c.value, mix: null })) });
      const note = m.q('.ms-k-seg + .ms-k-group-note');
      const setupSeen = { hidden: note.hidden, words: note.textContent };
      m.s.update({ counts: COUNTS });
      setupSeen.back = words(m.q('.ms-k-seg + .ms-k-group-note'));
      m.s.dispose();
      const l = mountLobby(lobbyOf({ leave: { enabled: false, reason: 'Not available in this test' } }));
      const back = l.q('.ms-ep-back');
      tap(back);
      const leaveSeen = { refused: refused(back), dimmed: back.hasAttribute('data-off'), reason: describedBy(back), taps: taps(l.calls) };
      l.s.update({ leave: { enabled: true } });
      tap(l.q('.ms-ep-back'));
      leaveSeen.after = { refused: refused(l.q('.ms-ep-back')), reason: describedBy(l.q('.ms-ep-back')), taps: taps(l.calls) };
      l.s.dispose();
      const seen = { setupSeen, leaveSeen };
      return { ok: setupSeen.hidden && setupSeen.words === '' && setupSeen.back === '5 Blue · 3 Red · 1 Alien' && leaveSeen.refused && leaveSeen.dimmed && leaveSeen.reason === 'Not available in this test'
        && leaveSeen.taps.length === 0 && !leaveSeen.after.refused && leaveSeen.after.reason === null && JSON.stringify(leaveSeen.after.taps) === '[["onLeave"]]', seen };
    });

    await check('setup: Opening… refused while busy; a failed opening is the kit’s inline error over the foot, with Frontend’s words', async () => {
      const m = mountSetup({ open: { enabled: true, busy: true } });
      tap(m.q('.ms-hs-open'));
      const busy = { label: m.q('.ms-hs-open .ms-k-btn-label').textContent, busy: m.q('.ms-hs-open').getAttribute('aria-busy'), taps: taps(m.calls).length };
      m.s.update({ open: { enabled: true }, error: 'The room did not open. Try again.' });
      const note = m.q('.ms-ep-foot > .ms-k-error');
      const error = { words: words(note), role: note?.getAttribute('role'), first: m.q('.ms-ep-foot').firstElementChild === note };
      m.s.update({ error: null });
      error.gone = !m.q('.ms-k-error');
      m.s.dispose();
      const seen = { busy, error };
      return { ok: busy.label === SETUP_WORDS.opening && busy.busy === 'true' && busy.taps === 0 && error.words === 'The room did not open. Try again.' && error.role === 'alert' && error.first && error.gone, seen };
    });

    await check('lobby: the code card, the seats, the bots and Start with Frontend’s reason under it; each tap reports', async () => {
      const m = mountLobby({ ...lobbyOf({ requests: REQUESTS }) });
      const seen = { code: words(m.q('.ms-ep-code')), codeName: m.q('.ms-ep-code').getAttribute('aria-label'), copy: words(m.q('.ms-ep-copy')),
        seats: words(m.q('.ms-ep-code-seats')), bar: m.q('.ms-ep-progress i').style.width, asking: m.qa('.ms-k-group-label')[0].textContent,
        requests: m.qa('.ms-k-list')[0].children.length, members: m.qa('.ms-k-list')[1].children.length, host: words(m.qa('.ms-k-list')[1].firstElementChild),
        bots: words(m.q('.ms-k-list:last-of-type .ms-k-row-main')), startRefused: refused(m.q('.ms-hl-start')), startNote: words(m.q('.ms-ep-foot .ms-k-group-note')), startWhy: describedBy(m.q('.ms-hl-start')) };
      tap(m.q('.ms-ep-back')); tap(m.q('.ms-ep-copy')); tap(m.q('[data-intent="admit"][data-value="adm-table"]')); tap(stepperButtons(m)[1]); tap(m.q('.ms-hl-start'));
      m.s.update(lobbyOf({ humans: 6, bots: 3 }));
      tap(m.q('.ms-hl-start')); tap(stepperButtons(m)[0]);
      seen.taps = taps(m.calls);
      seen.startNoteAfter = m.q('.ms-ep-foot .ms-k-group-note').hidden;
      m.s.dispose();
      return { ok: seen.code === 'K7Q2XM' && seen.codeName === 'Room code K 7 Q 2 X M' && seen.copy === 'Copy' && seen.seats === '5 of 9 seats' && seen.bar.startsWith('55.5')
        && seen.asking === 'Asking to join · 2' && seen.requests === 2 && seen.members === 5 && seen.host === '1 Ava Host' && seen.bots === 'Bots Up to 4'
        && seen.startRefused && seen.startNote === '4 more seats to fill' && seen.startWhy === '4 more seats to fill' && seen.startNoteAfter
        && JSON.stringify(seen.taps) === '[["onLeave"],["onCopy"],["onAdmit","adm-table"],["onBots",1],["onStart"],["onBots",2]]', seen };
    });

    await check('stepper: − refused at none, dimmed; + refused at Frontend’s most, keeping its look as sheet 11 draws Full, with Frontend’s reason; Frontend’s refusal refuses both, dimmed, with its reason', async () => {
      const m = mountLobby(lobbyOf());
      const [less, more] = stepperButtons(m);
      const atNone = [refused(less), refused(more)];
      const noneLook = getComputedStyle(less).opacity;
      m.s.update({ bots: { count: 4, max: 4, enabled: true, reason: 'Every seat is taken' } });
      const atMost = [refused(less), refused(more)];
      const mostLook = getComputedStyle(more).opacity, mostWhy = describedBy(more);
      tap(more);
      m.s.update({ bots: { count: 2, max: 4, enabled: false, reason: 'Not available now' } });
      const off = [refused(less), refused(more), describedBy(less), describedBy(more)];
      tap(less); tap(more);
      const offLook = [getComputedStyle(less).opacity, getComputedStyle(more).opacity];
      const seen = { atNone, noneLook, atMost, mostLook, mostWhy, off, offLook, taps: taps(m.calls).length, value: m.q('.ms-k-stepper-value').textContent };
      m.s.dispose();
      return { ok: JSON.stringify(atNone) === '[true,false]' && noneLook === '0.35' && JSON.stringify(atMost) === '[false,true]' && mostLook === '1' && mostWhy === 'Every seat is taken'
        && off[0] && off[1] && off[2] === 'Not available now' && off[3] === 'Not available now' && JSON.stringify(offLook) === '["0.35","0.35"]' && seen.taps === 0 && seen.value === '2', seen };
    });

    await check('keyed: a request’s Admit keeps its element and the focus while others come and go; when its own request leaves, the focus goes to the screen and onFocusReturn says which', async () => {
      const m = mountLobby(lobbyOf({ requests: REQUESTS }));
      const table = m.q('[data-value="adm-table"]');
      table.focus();
      m.s.update(lobbyOf({ requests: [REQUESTS[1]] }));
      const kept = { same: m.q('[data-value="adm-table"]') === table, focused: document.activeElement === table };
      m.s.update(lobbyOf({ requests: [{ id: 'adm-hana', name: 'Hana', device: 'phone' }, REQUESTS[1]] }));
      kept.again = document.activeElement === table && m.qa('.ms-k-list')[0].children.length === 2;
      m.s.update(lobbyOf({ requests: [{ id: 'adm-hana', name: 'Hana', device: 'phone' }] }));
      await Promise.resolve();
      const returned = { root: document.activeElement === m.root, report: m.calls.filter(c => c[0] === 'onFocusReturn').map(c => c[1]) };
      m.s.dispose();
      const seen = { kept, returned };
      return { ok: kept.same && kept.focused && kept.again && returned.root && JSON.stringify(returned.report) === '[{"intent":"admit","value":"adm-table"}]', seen };
    });

    await check('offline: the note under the card; with every control enabled it refuses nothing; Frontend’s refusals refuse with the reason; Leave and Copy stay usable', async () => {
      const m = mountLobby({ ...lobbyOf({ requests: REQUESTS }), notice: 'offline' });
      const note = m.q('.ms-k-error');
      const alone = { words: words(note), underCard: m.q('.ms-ep-code-card').nextElementSibling === note, role: note.getAttribute('role'),
        refused: [...m.qa('[data-intent="admit"]'), m.q('.ms-hl-start'), stepperButtons(m)[1]].map(refused) };
      m.s.update(lobbyOf({ requests: REQUESTS, notice: 'offline' }));
      tap(m.q('[data-intent="admit"]')); tap(stepperButtons(m)[1]); tap(m.q('.ms-hl-start')); tap(m.q('.ms-ep-back')); tap(m.q('.ms-ep-copy'));
      const given = { refused: [...m.qa('[data-intent="admit"]'), m.q('.ms-hl-start'), stepperButtons(m)[1]].map(refused), why: describedBy(m.q('.ms-hl-start')), taps: taps(m.calls).map(c => c[0]) };
      m.s.update({ notice: null });
      const gone = !m.q('.ms-k-error');
      m.s.dispose();
      const seen = { alone, given, gone };
      return { ok: alone.words === LOBBY_WORDS.offline && alone.underCard && alone.role === 'alert' && JSON.stringify(alone.refused) === '[false,false,true,false]'
        && given.refused.every(Boolean) && given.why === LOBBY_WORDS.offline && JSON.stringify(given.taps) === '["onLeave","onCopy"]' && gone, seen };
    });

    await check('toast: once per id, 10 px under the nav bar, gone after 2.4 s; a new id replaces it; a tap at its centre reaches what is under it', async () => {
      const m = mountLobby(lobbyOf());
      m.s.update({ copied: true, toast: { id: 'copied-1', text: 'Copied', icon: 'check' } });
      await frames();
      const t = m.q('.ms-k-toast');
      for (const a of t.getAnimations()) a.finish();
      const nav = m.q('.ms-ep-nav');
      const first = { words: words(t), role: t.getAttribute('role'), top: rel(m.root, t), navBottom: rel(m.root, nav) + nav.getBoundingClientRect().height, copy: words(m.q('.ms-ep-copy')) };
      // It takes no tap (the kit's toast): at its centre, a tap reaches what it lies over, as if it weren't there.
      const r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      t.style.pointerEvents = 'auto';
      const over = t.contains(document.elementFromPoint(x, y));
      t.style.pointerEvents = '';
      const hit = document.elementFromPoint(x, y);
      t.style.display = 'none';
      const without = document.elementFromPoint(x, y);
      t.style.display = '';
      const through = { over, none: getComputedStyle(t).pointerEvents === 'none', same: !!hit && hit === without && !t.contains(hit), under: hit?.className ?? null };
      m.s.update({ toast: { id: 'copied-1', text: 'Copied', icon: 'check' }, seats: { filled: 6, total: 9 } });
      const same = m.q('.ms-k-toast') === t;
      m.s.update({ toast: { id: 'refused-1', text: 'Select the room code to copy.', icon: 'info' } });
      const replaced = { words: words(m.q('.ms-k-toast')), count: m.qa('.ms-k-toast').length };
      await wait(ENTRY_TOAST_MS + 450);
      const gone = m.qa('.ms-k-toast').length === 0;
      m.s.dispose();
      const seen = { first, through, same, replaced, gone };
      return { ok: first.words === 'Copied' && first.role === 'status' && Math.abs(first.top - (first.navBottom + 10)) < 0.5 && first.top === 109 && first.copy === 'Copied'
        && through.over && through.none && through.same && same && replaced.words === 'Select the room code to copy.' && replaced.count === 1 && gone, seen };
    });

    await check('not interactive: every control refused, nothing dimmed', async () => {
      const m = mountLobby({ ...lobbyOf({ requests: REQUESTS, humans: 6, bots: 3 }), interactive: false });
      const all = m.qa('button');
      for (const b of all) tap(b);
      const seen = { refused: all.map(refused), off: all.filter(b => b.hasAttribute('data-off')).map(b => b.className), taps: taps(m.calls).length };
      m.s.dispose();
      // Nothing is dimmed, not even + at Frontend's most (6 people and 3 bots of 9), which keeps its look as sheet 11 draws Full.
      return { ok: seen.refused.every(Boolean) && JSON.stringify(seen.off) === '[]' && seen.taps === 0, seen };
    });

    await check('insets: Frontend’s safe areas place the screen 8 px under the top one and 16 px over the bottom one; null gives the browser’s', async () => {
      const m = mountSetup({});
      const given = m.s.layout().safe;
      m.s.update({ insets: null });
      const browser = m.s.layout().safe;
      m.s.dispose();
      const seen = { given, browser };
      return { ok: given.top === 47 && given.bottom === 34 && browser.top === 0 && browser.bottom === 0, seen };
    });

    await check('text: with the Largest text (200 %) the lobby scrolls and its foot is reached; the toast follows the nav bar; at 100, 150 and 200 % the code and Copy stay inside the card at both sizes', async () => {
      // The code card at each text size and phone width: Copy beside the code at the Standard text, under it from
      // the Large text where the pack's row would push it past the card, and the code's own characters inside.
      const fits = [];
      for (const [key, size] of Object.entries(sizes)) {
        for (const text of [100, 150, 200]) {
          document.documentElement.style.fontSize = `${text}%`;
          const host = document.createElement('div');
          Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
          document.body.append(host);
          const s = mountHostLobby(host, { ...lobbyOf(), insets: size.insets }, {});
          await frames();
          const card = s.element.querySelector('.ms-ep-code-card'), code = s.element.querySelector('.ms-ep-code'), copy = s.element.querySelector('.ms-ep-copy');
          const c = card.getBoundingClientRect(), pad = parseFloat(getComputedStyle(card).paddingRight), b = copy.getBoundingClientRect(), k = code.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(code);
          const glyphs = range.getBoundingClientRect();
          fits.push({ size: key, text, copyInside: b.right <= c.right - pad + 0.05 && b.left >= c.left, codeInside: glyphs.right <= c.right - pad + 0.05, under: b.top >= k.bottom - 0.05 });
          s.dispose();
          host.remove();
        }
      }
      document.documentElement.style.fontSize = '200%';
      const m = mountLobby({ ...lobbyOf({ requests: REQUESTS }), toast: { id: 't', text: 'Copied', icon: 'check' } });
      await frames();
      const screen = m.q('.ms-ep-screen');
      const scrolls = screen.scrollHeight > screen.clientHeight;
      screen.scrollTop = screen.scrollHeight;
      await frames();
      const start = m.q('.ms-hl-start').getBoundingClientRect(), box = m.root.getBoundingClientRect();
      const nav = m.q('.ms-ep-nav'), t = m.q('.ms-k-toast');
      for (const a of t.getAnimations()) a.finish();
      const seen = { scrolls, startInView: start.bottom <= box.bottom - 34 && start.top >= box.top, toastTop: rel(m.root, t), navBottom: nav.offsetTop + nav.offsetHeight, fits };
      m.s.dispose();
      document.documentElement.style.fontSize = '';
      const beside = fits.filter(f => f.text === 100).every(f => !f.under), under = fits.filter(f => f.text > 100).every(f => f.under);
      return { ok: seen.scrolls && seen.startInView && Math.abs(seen.toastTop - (seen.navBottom + 10)) < 0.5 && fits.every(f => f.copyInside && f.codeInside) && beside && under, seen };
    });

    await check('input: malformed input is refused', async () => {
      const setupBad = [{ counts: [{ value: 9 }] }, { counts: [{ value: 9, mix: 'x' }], count: 8 }, { open: null }, { error: 3 }, { insets: { top: '47px' } }];
      const lobbyBad = [{ members: [{ seat: 1, name: 'A', kind: 'guest' }] }, { members: [{ seat: 1, name: 'A', kind: 'host' }, { seat: 1, name: 'B', kind: 'person' }] },
        { requests: [{ id: 'a', name: 'A', device: 'tablet' }] }, { bots: { count: -1, max: 2 } }, { notice: 'down' }, { toast: { id: 'a' } }, { seats: { filled: 1, total: 0 } }];
      const refusedAll = [...setupBad.map(i => { try { nextHostSetupInput(HOST_SETUP_DEFAULTS, i); return false; } catch { return true; } }),
        ...lobbyBad.map(i => { try { nextHostLobbyInput(HOST_LOBBY_DEFAULTS, i); return false; } catch { return true; } })];
      return { ok: refusedAll.every(Boolean), refusedAll };
    });

    await check('dispose: safe twice; afterwards nothing fires, layout() is null and nothing is left, the toast with it', async () => {
      const m = mountLobby({ ...lobbyOf({ requests: REQUESTS }), toast: { id: 'x', text: 'Copied', icon: 'check' } });
      const copy = m.q('.ms-ep-copy');
      m.s.dispose(); m.s.dispose();
      tap(copy);
      m.s.update({ notice: 'offline' });
      const seen = { left: frame.childElementCount, layout: m.s.layout(), taps: taps(m.calls).length, reasons: document.querySelectorAll('.ms-k-vh').length };
      return { ok: seen.left === 0 && seen.layout === null && seen.taps === 0 && seen.reasons === 0, seen };
    });
  }

  await check(`motion: only the toast moves, in from 8 px over 220 ms${deviceReduced ? '; with the device’s Reduce motion a plain fade' : ', or a plain fade with the game’s Reduce motion'}`, async () => {
    const m = mountLobby(lobbyOf());
    await frames();
    const atRest = m.root.getAnimations({ subtree: true }).length;
    m.s.update({ toast: { id: 'm1', text: 'Copied', icon: 'check' } });
    const full = m.q('.ms-k-toast').getAnimations().map(a => a.animationName);
    m.s.update({ reducedMotion: true, toast: { id: 'm2', text: 'Copied', icon: 'check' } });
    const reduced = m.q('.ms-k-toast').getAnimations().map(a => a.animationName);
    m.s.dispose();
    const seen = { atRest, full, reduced };
    // The kit's toast (entry-parts 0.3.0): its drop and its fade are kit.css's.
    return { ok: atRest === 0 && JSON.stringify(full) === (deviceReduced ? '["ms-k-fade"]' : '["ms-k-toast-in"]') && JSON.stringify(reduced) === '["ms-k-fade"]', seen };
  });

  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

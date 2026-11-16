// mothership:dev-only
//
// The Hacker lifecycle probe: it drives the real component (../hacker.mjs, on the kit) inside the real
// phone shell, in the browser, under whatever headers serve the page (design/tools/hacker-check.mjs serves the
// production ones), and reports what it saw. Each check is one behaviour Frontend relies on; audience, leaks and
// private are the Lead's note 3:
//   guess     a tap on each guess reports its side; the guess is Frontend's (nothing changes until it is given
//             back); the three are one radio group kept by their place, so a focused one keeps its element
//   picks     a tap on an offered cell reports its seat as Frontend gave it, picked or not (Q1); the picks are
//             drawn in their order with the check and "Pick 1"–"Pick 4"; at four, the rest stay available; "You"
//             on this phone's own; a seat not offered says "Not available now" and takes no tap; an empty seat in
//             an eight-player match; a focused cell keeps its element and the focus as the picks change
//   refused   while sending, the guess and the cells take no tap; in the confirm step, no cell does; not
//             interactive or reconnecting, none does, and reconnecting says the shell's words
//   results   MATCHED with "In the Code · Yes" or "No"; NO MATCH with "Scan · Blocked in Round 4", or no row;
//             CODE CORRECT with its two lines; CODE WRONG with "Your one attempt is used" alone (the Lead's Q-b);
//             each a status, which reads as it opens
//   words     the target bar, and every sheet's id, title, sub, close, detent and buttons
//   footer    the sheets' buttons in the real shell: live, each enabled one is taken; reconnecting, only Cancel,
//             Next, Back and Done (this phone's own) are, and Scan and Submit Code are refused with the
//             banner's words
//   audience  the shared display (no viewer) draws none of the parts; another phone, as Frontend composes it
//             from the public view, has no part and none of the Hacker's words; a part handed to another viewer
//             empties itself
//   leaks     no guess, pick, result, "In the Code" or blocked round reaches an attribute, the console, the
//             shell's onLayout, or a callback but onGuess and onPick, in any state, through any tap or update; the
//             Code's visually hidden names (ids ms-hk-…) are in the page while the Code is drawn, and leave it with
//             the rest when concealed or handed to another viewer
//   inputs    an unknown key, a side that is not one, a result that does not hold together, five picks, a pick
//             twice, not offered or not in the match, the confirm step without four: each an error; a checked
//             input checks to itself
//   private   concealed, every part empties itself and drops this viewer's inputs; shown again, nothing comes
//             back until given; a new viewer's phone shows none of the last viewer's
//   focus     a focused guess or cell removed returns the focus to the root and reports its place or seat,
//             never a side or a pick
//   text      at the Largest text (200 %) on 320 × 568: the guesses one row, every word whole; the Code a list of
//             whole names, each row at least 44 px; the results' lines whole. At Large (150 %) on 390 × 844 the
//             Code stays a 3 × 3
//   dispose   after dispose(), nothing is left and nothing fires; update() does nothing
//   motion    each result's stamp snaps in over 120 ms, as REGISTERED (the handoff's motion table), and with
//             Reduce motion (the game's or the device's) is there at once; nothing else of its own moves
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { HACKER_WORDS, SIDES, checkCodeResult, checkFinalCode, checkScanGuess, checkScanResult, codeSheet, mountCodeResult, mountFinalCode,
  mountScanGuess, mountScanResult, scanBar, scanSheet } from '../hacker.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { HACKER_STATES } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));
const MOUNTS = { guess: mountScanGuess, result: mountScanResult, code: mountFinalCode, outcome: mountCodeResult };
/** The Hacker's own words: a guess, a pick, a result. None may reach an attribute, the console or the layout. */
const SECRET = /\b(?:Blue|Red|Alien)\b|Pick \d|MATCHED|NO MATCH|In the Code|Blocked in Round|CODE (?:CORRECT|WRONG)|unlocked|attempt is used/i;
const PART_STATES = ['scan-guess', 'scan-matched', 'scan-not-in-code', 'scan-nomatch', 'scan-nomatch-free', 'code-pick', 'code-confirm', 'code-not-offered', 'code-eight', 'code-correct', 'code-wrong'];

export async function runHackerProbe({ sizes, versions }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const inputOf = (key, extra = {}) => ({ viewer: 'seat-4', versions, ...HACKER_STATES[key].part.input, ...extra });

  /** A phone with the shell and a part in its sheet body (no room behind: the part is what is probed). */
  function phone(key, extra = {}, sizeKey = '390x844', { shellExtra = {}, onLayout = null } = {}) {
    const size = sizes[sizeKey], state = HACKER_STATES[key];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    const shell = mountPhoneShell(frame, { ...state.shell, viewer: 'seat-4', versions, insets: size.insets, ...shellExtra },
      { onSheetAction: record('onSheetAction'), onCancelTarget: record('onCancelTarget'), ...(onLayout ? { onLayout } : {}) });
    const part = state.part ? MOUNTS[state.part.kind](shell.sheetBody, inputOf(key, extra), { onGuess: record('onGuess'), onPick: record('onPick'), onFocusReturn: record('onFocusReturn') }) : null;
    return { frame, shell, part, intents, root: part?.element ?? null, dispose: () => { part?.dispose(); shell.dispose(); frame.remove(); } };
  }
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const guesses = root => [...root.querySelectorAll('.ms-k-seg-btn')];
  const cell = (root, n) => root.querySelector(`.ms-k-cell[data-value="${n}"]`);
  const text = root => (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const reported = (p, name) => p.intents.filter(i => i[0] === name).map(i => i[1]);
  const nameOf = node => (node.getAttribute('aria-labelledby') ? document.getElementById(node.getAttribute('aria-labelledby'))?.textContent ?? null : node.getAttribute('aria-label'));
  const describedBy = node => (node.getAttribute('aria-describedby') ? document.getElementById(node.getAttribute('aria-describedby'))?.textContent ?? null : null);

  if (mode === 'full') {
    await check('guess', async () => {
      const p = phone('scan-no-guess');
      const before = guesses(p.root);
      const checked = () => guesses(p.root).map(b => b.getAttribute('aria-checked'));
      const none = checked();
      before[1].focus();
      for (const b of before) tap(b);
      const told = reported(p, 'onGuess');
      // The guess is Frontend's: nothing changes until it is given.
      const unchanged = checked();
      p.part.update({ guess: 'Red' });
      const red = checked();
      const kept = guesses(p.root).every((b, i) => b === before[i]) && document.activeElement === before[1];
      const group = p.root.querySelector('.ms-k-seg');
      const detail = { none, told, unchanged, red, kept, role: group.getAttribute('role'), label: group.getAttribute('aria-label'), words: guesses(p.root).map(text), places: guesses(p.root).map(b => b.dataset.value) };
      p.dispose();
      return { ok: detail.none.join() === 'false,false,false' && JSON.stringify(told) === JSON.stringify(SIDES) && detail.unchanged.join() === 'false,false,false'
        && detail.red.join() === 'false,true,false' && kept && detail.role === 'radiogroup' && detail.label === 'Guess' && detail.words.join() === 'Blue,Red,Alien'
        && detail.places.join() === '0,1,2', ...detail };
    });

    await check('picks', async () => {
      const p = phone('code-pick', { picks: [] });
      const ben = cell(p.root, 2);
      ben.focus();
      for (const n of [2, 5, 6, 8]) tap(cell(p.root, n));
      const told = reported(p, 'onPick');
      const before = [...p.root.querySelectorAll('.ms-k-cell')];
      // Frontend gives the picks back, in the order picked.
      p.part.update({ picks: ['seat-8', 'seat-2', 'seat-5', 'seat-6'] });
      const read = n => { const c = cell(p.root, n); return [c.dataset.state, c.getAttribute('aria-pressed'), text(c.querySelector('.ms-k-cell-note')), !!c.querySelector('.ms-k-cell-mark'), c.getAttribute('aria-disabled')]; };
      const drawn = Object.fromEntries([2, 5, 6, 8, 1, 4].map(n => [n, read(n)]));
      // At four, a tap on a picked cell and on an unpicked one still reports (Q1).
      tap(cell(p.root, 2));
      tap(cell(p.root, 1));
      const more = reported(p, 'onPick').slice(4);
      const kept = [...p.root.querySelectorAll('.ms-k-cell')].every((c, i) => c === before[i]) && document.activeElement === ben;
      const you = [...p.root.querySelectorAll('.ms-k-you')].map(y => y.closest('.ms-k-cell').dataset.value);
      const names = [nameOf(cell(p.root, 8)), nameOf(cell(p.root, 1))];
      p.dispose();
      // Seats not offered, and an eight-player match.
      const q = phone('code-not-offered');
      const off = cell(q.root, 3);
      tap(off);
      const notOffered = { state: off.dataset.state, note: text(off.querySelector('.ms-k-cell-note')), disabled: off.getAttribute('aria-disabled'), taps: reported(q, 'onPick').length, name: nameOf(off) };
      q.dispose();
      const r = phone('code-eight');
      const all = r.root.querySelectorAll('.ms-k-cell');
      const empty = { cells: all.length, ninth: all[8]?.dataset.state ?? null, hidden: all[8]?.getAttribute('aria-hidden') ?? null };
      r.dispose();
      return { ok: JSON.stringify(told) === JSON.stringify(['seat-2', 'seat-5', 'seat-6', 'seat-8'])
        && JSON.stringify(drawn) === JSON.stringify({ 1: ['available', 'false', '', false, null], 2: ['selected', 'true', 'Pick 2', true, null], 4: ['available', 'false', '', false, null],
          5: ['selected', 'true', 'Pick 3', true, null], 6: ['selected', 'true', 'Pick 4', true, null], 8: ['selected', 'true', 'Pick 1', true, null] })
        && JSON.stringify(more) === JSON.stringify(['seat-2', 'seat-1']) && kept && you.join() === '4'
        && JSON.stringify(names) === JSON.stringify(['Player 8, Hana, Pick 1', 'Player 1, Ava'])
        && notOffered.state === 'ineligible' && notOffered.note === HACKER_WORDS.notAvailable && notOffered.disabled === 'true' && notOffered.taps === 0
        && notOffered.name === 'Player 3, Cleo, Not available now'
        && empty.cells === 9 && empty.ninth === 'empty' && empty.hidden === 'true', told, drawn, more, kept, you, names, notOffered, empty };
    });

    await check('refused', async () => {
      const results = {};
      // Sending: the guess and the cells take no tap.
      const g = phone('scan-sending');
      for (const b of guesses(g.root)) tap(b);
      results.scanSending = { taps: reported(g, 'onGuess').length, disabled: guesses(g.root).map(b => b.getAttribute('aria-disabled')).join() };
      g.dispose();
      const c = phone('code-two', { phase: 'sending' });
      tap(cell(c.root, 1));
      results.codeSending = reported(c, 'onPick').length;
      c.dispose();
      // The confirm step: no cell takes a tap, and none is dimmed (the pack draws the grid as it was).
      const k = phone('code-confirm');
      for (const n of [1, 2]) tap(cell(k.root, n));
      results.confirm = { taps: reported(k, 'onPick').length, dimmed: k.root.querySelectorAll('.ms-k-cell[data-off]').length };
      k.dispose();
      // Not interactive, and reconnecting.
      const n = phone('scan-guess', { interactive: false });
      for (const b of guesses(n.root)) tap(b);
      results.notInteractive = reported(n, 'onGuess').length;
      n.dispose();
      const s = phone('code-pick', { status: 'stale' });
      tap(cell(s.root, 1));
      const sg = phone('scan-guess', { status: 'stale' });
      for (const b of guesses(sg.root)) tap(b);
      results.stale = { picks: reported(s, 'onPick').length, guesses: reported(sg, 'onGuess').length, why: [describedBy(cell(s.root, 1)), describedBy(guesses(sg.root)[0])] };
      s.dispose();
      sg.dispose();
      return { ok: results.scanSending.taps === 0 && results.scanSending.disabled === 'true,true,true' && results.codeSending === 0 && results.confirm.taps === 0 && results.confirm.dimmed === 0
        && results.notInteractive === 0 && results.stale.picks === 0 && results.stale.guesses === 0 && results.stale.why.every(w => w === HACKER_WORDS.stale), ...results };
    });

    await check('results', async () => {
      const read = key => {
        const p = phone(key);
        const notice = p.root.querySelector('.ms-k-notice');
        const out = notice ? { stamp: text(notice.querySelector('.ms-k-stamp')), tone: notice.querySelector('.ms-k-stamp').dataset.tone ?? null, lines: [...notice.querySelectorAll(':scope > p')].map(text),
          row: notice.querySelector('.ms-k-row') ? [text(notice.querySelector('.ms-k-row-title')), text(notice.querySelector('.ms-k-row-value')), notice.querySelector('.ms-k-row-icon')?.dataset.tint ?? null] : null,
          status: notice.getAttribute('role') } : null;
        p.dispose();
        return out;
      };
      const got = Object.fromEntries(['scan-matched', 'scan-not-in-code', 'scan-nomatch', 'scan-nomatch-free', 'code-correct', 'code-wrong'].map(k => [k, read(k)]));
      const want = {
        'scan-matched': { stamp: 'MATCHED', tone: 'amber', lines: ['Gus · Blue guess'], row: ['In the Code', 'Yes', 'paper'], status: 'status' },
        'scan-not-in-code': { stamp: 'MATCHED', tone: 'amber', lines: ['Gus · Blue guess'], row: ['In the Code', 'No', 'paper'], status: 'status' },
        'scan-nomatch': { stamp: 'NO MATCH', tone: null, lines: ['Gus · Red guess'], row: ['Scan', 'Blocked in Round 4', 'steel'], status: 'status' },
        'scan-nomatch-free': { stamp: 'NO MATCH', tone: null, lines: ['Gus · Alien guess'], row: null, status: 'status' },
        'code-correct': { stamp: 'CODE CORRECT', tone: 'amber', lines: ['Hack Spaceship is unlocked', 'Using it is a separate action on your turn'], row: null, status: 'status' },
        'code-wrong': { stamp: 'CODE WRONG', tone: null, lines: ['Your one attempt is used'], row: null, status: 'status' },
      };
      // The row follows the result as it changes in place.
      const p = phone('scan-matched');
      p.part.update({ matched: false, inCode: null, guess: 'Red', blockedRound: 4 });
      const changed = [text(p.root.querySelector('.ms-k-stamp')), text(p.root.querySelector('.ms-k-row-value')), p.root.querySelectorAll('.ms-k-row').length];
      p.part.update({ blockedRound: null });
      const gone = p.root.querySelectorAll('.ms-k-row, .ms-k-list').length;
      p.dispose();
      return { ok: JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(changed) === JSON.stringify(['NO MATCH', 'Blocked in Round 4', 1]) && gone === 0, got, changed, gone };
    });

    await check('words', async () => {
      const bar = scanBar();
      const sheets = [scanSheet(), scanSheet({ guess: 'Blue' }), scanSheet({ guess: 'Blue', phase: 'sending' }), scanSheet({ step: 'result' }),
        codeSheet({ step: 'pick', count: 2 }), codeSheet({ step: 'pick', count: 4 }), codeSheet({ step: 'confirm' }), codeSheet({ step: 'confirm', phase: 'sending' }), codeSheet({ step: 'result' })];
      const said = sheets.map(s => [s.id, s.title, s.sub, s.close, s.detent ?? null, s.actions.map(a => `${a.id}:${a.label}${a.icon ? `:${a.icon}` : ''}${a.busy ? ':busy' : ''}${a.local ? ':local' : ''}${a.enabled === false ? ':off' : ''}`).join('|')]);
      const want = [
        ['scan', 'Scan', 'Only on this phone', false, null, 'cancel:Cancel:local|scan:Scan:scan:off'],
        ['scan', 'Scan', 'Only on this phone', false, null, 'cancel:Cancel:local|scan:Scan:scan'],
        ['scan', 'Scan', 'Only on this phone', false, null, 'cancel:Cancel:local:off|scan:Scanning…:scan:busy'],
        ['scan', 'Scan', 'Only on this phone', false, null, 'done:Done:local'],
        ['code', 'Final Code', 'Only on this phone', false, 'large', 'next:Next:local:off'],
        ['code', 'Final Code', 'Only on this phone', false, 'large', 'next:Next:local'],
        ['code', 'Final Code', 'Only on this phone', false, 'large', 'back:Back:local|submit:Submit Code:code'],
        ['code', 'Final Code', 'Only on this phone', false, 'large', 'back:Back:local:off|submit:Submitting…:code:busy'],
        ['code', 'Final Code', 'Only on this phone', false, 'large', 'done:Done:local'],
      ];
      return { ok: JSON.stringify(bar) === JSON.stringify({ icon: 'scan', title: 'Scan', sub: 'Choose a player in your room' }) && JSON.stringify(said) === JSON.stringify(want), bar, said };
    });

    await check('footer', async () => {
      // Each sheet with buttons, in the real shell, live and reconnecting; every button tapped once.
      const sheets = { guess: scanSheet({ guess: 'Blue' }), result: scanSheet({ step: 'result' }), pick: codeSheet({ step: 'pick', count: 4 }), confirm: codeSheet({ step: 'confirm' }), done: codeSheet({ step: 'result' }) };
      const size = sizes['390x844'];
      const run = status => Object.fromEntries(Object.entries(sheets).map(([key, sheet]) => {
        const frame = document.createElement('div');
        frame.className = 'pv-phone';
        Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
        document.body.append(frame);
        const taken = [];
        const shell = mountPhoneShell(frame, { ...HACKER_STATES['scan-guess'].shell, sheet, status, viewer: 'seat-4', versions, insets: size.insets, ...(status === 'stale' ? { banner: { kind: 'reconnecting' } } : {}) },
          { onSheetAction: (id, sheetId) => taken.push(`${sheetId}:${id}`) });
        const buttons = [...frame.querySelectorAll('.ms-ps-sheet-foot > button')];
        for (const b of buttons) tap(b);
        const why = Object.fromEntries(buttons.map(b => [b.dataset.value, describedBy(b)]));
        shell.dispose();
        frame.remove();
        return [key, { taken, why }];
      }));
      const live = run('live'), stale = run('stale');
      return { ok: JSON.stringify(Object.values(live).map(r => r.taken)) === JSON.stringify([['scan:cancel', 'scan:scan'], ['scan:done'], ['code:next'], ['code:back', 'code:submit'], ['code:done']])
        && Object.values(live).every(r => Object.values(r.why).every(w => w === null))
        && JSON.stringify(Object.values(stale).map(r => r.taken)) === JSON.stringify([['scan:cancel'], ['scan:done'], ['code:next'], ['code:back'], ['code:done']])
        && stale.guess.why.scan === HACKER_WORDS.stale && stale.confirm.why.submit === HACKER_WORDS.stale
        && stale.guess.why.cancel === null && stale.result.why.done === null && stale.pick.why.next === null && stale.confirm.why.back === null && stale.done.why.done === null, live, stale };
    });

    await check('audience', async () => {
      const results = {};
      for (const key of PART_STATES) {
        // The shared display: no viewer. Each part draws nothing.
        const shared = phone(key, { viewer: null }, '390x844', { shellExtra: { viewer: null } });
        const sharedParts = shared.frame.querySelectorAll('.ms-hacker *:not(.ms-k-vh)').length;
        const sharedWords = SECRET.test(text(shared.frame));
        shared.dispose();
        // Another phone, as Frontend composes it from the public view: the shell and its bar, no part, no sheet.
        const st = HACKER_STATES[key], size = sizes['390x844'];
        const frame = document.createElement('div');
        frame.className = 'pv-phone';
        Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
        document.body.append(frame);
        const other = mountPhoneShell(frame, { bar: st.shell.bar, tabs: st.shell.tabs, viewer: 'seat-7', versions, insets: size.insets }, {});
        const otherParts = frame.querySelectorAll('.ms-hacker').length, otherWords = SECRET.test(text(frame));
        other.dispose();
        frame.remove();
        // The Hacker's part handed to another viewer: it empties itself.
        const handed = phone(key);
        handed.part.update({ viewer: 'seat-7' });
        const handedWords = SECRET.test(text(handed.root)) || handed.root.querySelectorAll('.ms-k-cell, .ms-k-seg, .ms-k-notice').length > 0;
        handed.dispose();
        results[key] = { sharedParts, sharedWords, otherParts, otherWords, handedWords };
      }
      return { ok: Object.values(results).every(r => r.sharedParts === 0 && !r.sharedWords && r.otherParts === 0 && !r.otherWords && !r.handedWords), results };
    });

    await check('leaks', async () => {
      const said = [], layouts = [], callbacks = [], hits = [], names = [];
      // The Code's visually hidden names (ms-k-vh spans, id ms-hk-N-cN), which its cells' aria-labelledby reads.
      const named = frame => frame.querySelectorAll('[id^="ms-hk-"]').length;
      const isCode = key => HACKER_STATES[key].part?.kind === 'code';
      const spied = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
      const original = Object.fromEntries(spied.map(k => [k, console[k]]));
      for (const k of spied) console[k] = (...args) => { said.push([k, ...args.map(String)]); original[k](...args); };
      const scan = (frame, where) => {
        for (const el of [frame, ...frame.querySelectorAll('*')]) {
          for (const a of el.attributes) if (SECRET.test(a.value) || SECRET.test(a.name)) hits.push([where, el.tagName.toLowerCase(), a.name, a.value.slice(0, 80)]);
        }
      };
      try {
        for (const key of [...PART_STATES, 'scan-choose', 'scan-sending', 'scan-error', 'code-two', 'code-sending', 'code-error']) {
          const p = phone(key, {}, '390x844', { onLayout: layout => layouts.push(JSON.stringify(layout)) });
          await frames();
          scan(p.frame, key);
          if (p.root) {
            for (const b of guesses(p.root)) { b.focus(); tap(b); }
            for (const c of p.root.querySelectorAll('.ms-k-cell')) { c.focus(); tap(c); }
            const st = HACKER_STATES[key].part;
            if (st.kind === 'guess') for (const s of [...SIDES, null]) { p.part.update({ guess: s }); p.shell.update({ sheet: scanSheet({ guess: s }) }); scan(p.frame, `${key} ${s}`); }
            if (st.kind === 'code' && st.input.step === 'pick') {
              for (const picks of [['seat-1'], ['seat-1', 'seat-2', 'seat-5', 'seat-6']]) { p.part.update({ picks: picks.filter(s => st.input.offered.includes(s)) }); scan(p.frame, `${key} ${picks.length}`); }
            }
          }
          for (const b of p.frame.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')) tap(b);
          const drawn = named(p.frame);
          p.part?.update({ status: 'concealed' });
          await microtasks();
          scan(p.frame, `${key} concealed`);
          if (isCode(key)) names.push({ key, when: 'concealed', drawn, left: named(p.frame) });
          // Every callback but onGuess and onPick, as it was said.
          callbacks.push(...p.intents.filter(i => !['onGuess', 'onPick'].includes(i[0])).map(i => [i[0], JSON.stringify(i.slice(1))]));
          p.dispose();
        }
        // Handed to another viewer, the names leave with the rest.
        for (const key of [...PART_STATES, 'code-two', 'code-sending', 'code-error'].filter(isCode)) {
          const p = phone(key);
          const drawn = named(p.frame);
          p.part.update({ viewer: 'seat-7' });
          await microtasks();
          scan(p.frame, `${key} another viewer`);
          names.push({ key, when: 'another viewer', drawn, left: named(p.frame) });
          p.dispose();
        }
      } finally {
        for (const k of spied) console[k] = original[k];
      }
      const loud = said.filter(s => s.slice(1).some(t => SECRET.test(t)));
      const laid = layouts.filter(l => SECRET.test(l));
      const told = callbacks.filter(c => SECRET.test(c[1]));
      const stayed = names.filter(n => !(n.drawn > 0 && n.left === 0));
      return { ok: hits.length === 0 && loud.length === 0 && laid.length === 0 && told.length === 0 && layouts.length > 0 && callbacks.length > 0
        && names.length > 0 && stayed.length === 0,
        hits: hits.slice(0, 20), console: loud.slice(0, 10), onLayout: laid.slice(0, 5), callbacks: told.slice(0, 10), layoutsSeen: layouts.length, callbacksSeen: callbacks.length,
        names: { checked: names.length, stayed } };
    });

    await check('inputs', async () => {
      const errors = [];
      const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
      const people = HACKER_STATES['code-pick'].part.input.people, all = people.map(p => p.seat);
      const gus = { seat: 'seat-7', name: 'Gus' };
      expectError('an unknown key', () => checkScanGuess({ target: gus, colour: 'red' }));
      expectError('a guess that is not a side', () => checkScanGuess({ target: gus, guess: 'Green' }));
      expectError('a target without a name', () => checkScanGuess({ target: { seat: 'seat-7' } }));
      expectError('a match without inCode', () => checkScanResult({ target: gus, guess: 'Blue', matched: true }));
      expectError('inCode without a match', () => checkScanResult({ target: gus, guess: 'Blue', matched: false, inCode: true }));
      expectError('a match that blocks a round', () => checkScanResult({ target: gus, guess: 'Blue', matched: true, inCode: true, blockedRound: 4 }));
      expectError('a round that is not one', () => checkScanResult({ target: gus, guess: 'Red', matched: false, blockedRound: 0 }));
      expectError('a result without its target', () => checkScanResult({ guess: 'Blue', matched: true, inCode: true }));
      expectError('five picks', () => checkFinalCode({ people, offered: all, picks: all.slice(0, 5) }));
      expectError('a pick twice', () => checkFinalCode({ people, offered: all, picks: ['seat-1', 1] }));
      expectError('a pick not offered', () => checkFinalCode({ people, offered: all.slice(1), picks: ['seat-1'] }));
      expectError('a pick not in the match', () => checkFinalCode({ people: people.slice(0, 8), offered: all.slice(0, 8), picks: ['seat-9'] }));
      expectError('the confirm step without four', () => checkFinalCode({ people, offered: all, picks: all.slice(0, 3), step: 'confirm' }));
      expectError('a person twice', () => checkFinalCode({ people: [...people.slice(0, 8), people[0]] }));
      expectError('correct that is not true or false', () => checkCodeResult({ correct: 'yes' }));
      expectError('a sheet step that is not one', () => scanSheet({ step: 'check' }));
      expectError('a count that is not one', () => codeSheet({ step: 'pick', count: 5 }));
      const p = phone('code-pick');
      expectError('an unknown key in an update', () => p.part.update({ colour: 'red' }));
      p.dispose();
      const once = checkFinalCode(inputOf('code-confirm')), twice = checkFinalCode(once);
      const guessOnce = checkScanGuess(inputOf('scan-guess')), resultOnce = checkScanResult(inputOf('scan-matched'));
      const idempotent = JSON.stringify(once) === JSON.stringify(twice) && JSON.stringify(guessOnce) === JSON.stringify(checkScanGuess(guessOnce)) && JSON.stringify(resultOnce) === JSON.stringify(checkScanResult(resultOnce));
      return { ok: errors.every(([, thrown]) => thrown) && idempotent, errors, idempotent };
    });

    await check('private', async () => {
      const results = {};
      const PRIVATE = ['Gus', 'Hana', 'Ben', 'Guess', 'Pick', 'MATCHED', 'NO MATCH', 'CODE', 'Blocked', 'In the Code', 'Choose four', 'One attempt', 'Hack Spaceship'];
      for (const key of ['scan-guess', 'scan-matched', 'scan-nomatch', 'code-confirm', 'code-correct', 'code-wrong']) {
        const p = phone(key);
        p.part.update({ status: 'concealed' });
        const concealed = text(p.root);
        p.part.update({ status: 'live' });
        const back = text(p.root);
        p.dispose();
        const q = phone(key);
        q.part.update({ viewer: 'seat-7' });
        const other = text(q.root);
        q.dispose();
        results[key] = { concealed, back, other, leaked: PRIVATE.filter(w => concealed.includes(w) || back.includes(w) || other.includes(w)) };
      }
      return { ok: Object.values(results).every(r => r.leaked.length === 0 && r.concealed === ''), results };
    });

    await check('focus', async () => {
      const p = phone('scan-guess');
      guesses(p.root)[2].focus();
      p.part.update({ status: 'concealed' });
      await microtasks();
      const guess = { onRoot: document.activeElement === p.root, returned: reported(p, 'onFocusReturn') };
      p.dispose();
      const q = phone('code-pick');
      cell(q.root, 5).focus();
      q.part.update({ status: 'concealed' });
      await microtasks();
      const code = { onRoot: document.activeElement === q.root, returned: reported(q, 'onFocusReturn') };
      q.dispose();
      return { ok: guess.onRoot && guess.returned.length === 1 && guess.returned[0]?.intent === 'guess' && guess.returned[0]?.value === '2'
        && code.onRoot && code.returned.length === 1 && code.returned[0]?.intent === 'pick' && code.returned[0]?.value === '5', guess, code };
    });

    await check('text', async () => {
      // Measured at rest: a result's stamp snaps in from 1.3 times its size, so its finite animations finish first.
      const rest = root => Promise.all(root.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));
      const at = async (key, sizeKey, percent, read) => {
        document.documentElement.style.fontSize = `${percent}%`;
        const p = phone(key, {}, sizeKey);
        await rest(p.root);
        const out = read(p.root);
        p.dispose();
        document.documentElement.style.fontSize = '';
        return out;
      };
      const inside = (node, box) => { const r = node.getBoundingClientRect(), b = box.getBoundingClientRect(); return r.left >= b.left - 0.5 && r.right <= b.right + 0.5; };
      const whole = nodes => nodes.every(n => n.scrollWidth <= n.clientWidth + 1);
      const guess = await at('scan-guess', '320x568', 200, root => {
        const opts = guesses(root), top = n => Math.round(n.getBoundingClientRect().top);
        return { row: opts.every(o => top(o) === top(opts[0])), whole: whole(opts) && opts.every(o => inside(o, root)), who: whole([...root.querySelectorAll('.ms-k-who-title, .ms-k-who-sub')]) };
      });
      const code = await at('code-pick', '320x568', 200, root => {
        const cells = [...root.querySelectorAll('.ms-k-cell:not([data-state="empty"])')];
        const left = n => Math.round(n.getBoundingClientRect().left);
        return { list: cells.every(c => left(c) === left(cells[0])), whole: cells.every(c => c.scrollWidth <= c.clientWidth + 1 && inside(c, root)), tall: cells.every(c => c.getBoundingClientRect().height >= 44),
          names: cells.every(c => [...c.querySelectorAll('.ms-k-cell-label, .ms-k-cell-note:not([hidden])')].every(w => inside(w, c))) };
      });
      const result = await at('scan-nomatch', '320x568', 200, root => ({ whole: [...root.querySelectorAll('.ms-k-notice > p, .ms-k-row-title, .ms-k-row-value, .ms-k-stamp')].every(n => inside(n, root)) }));
      const large = await at('code-pick', '390x844', 150, root => {
        const cells = [...root.querySelectorAll('.ms-k-cell')], top = n => Math.round(n.getBoundingClientRect().top);
        return { perRow: cells.filter(c => top(c) === top(cells[0])).length };
      });
      return { ok: guess.row && guess.whole && guess.who && code.list && code.whole && code.tall && code.names && result.whole && large.perRow === 3, guess, code, result, large };
    });

    await check('dispose', async () => {
      const p = phone('code-pick');
      const root = p.root, one = cell(root, 1);
      p.part.dispose();
      tap(one);
      p.part.update({ picks: [] });
      const detail = { left: root.isConnected, taps: reported(p, 'onPick').length, body: p.shell.sheetBody?.querySelectorAll('.ms-hacker').length ?? 0 };
      p.shell.dispose();
      p.frame.remove();
      return { ok: !detail.left && detail.taps === 0 && detail.body === 0, ...detail };
    });
  }

  await check('motion', async () => {
    const STAMPED = ['scan-matched', 'scan-nomatch', 'code-correct', 'code-wrong'];
    const seen = {};
    for (const key of ['scan-guess', 'code-pick', ...STAMPED]) {
      for (const reducedMotion of [false, true]) {
        const p = phone(key, { reducedMotion });
        await frames();
        seen[`${key}${reducedMotion ? ' reduced' : ''}`] = p.root.getAnimations({ subtree: true }).map(a => ({
          name: a.animationName ?? a.constructor.name, duration: a.effect?.getTiming?.().duration ?? null, stamp: !!a.effect?.target?.matches?.('.ms-hk-result > .ms-k-stamp') }));
        p.dispose();
      }
    }
    // The stamp snaps only where a result shows and Reduce motion is off; the device's Reduce motion stops it too.
    const snaps = key => !deviceReduced && STAMPED.includes(key);
    const ok = Object.entries(seen).every(([k, list]) => {
      const [key, reduced] = k.split(' ');
      if (reduced || !snaps(key)) return list.length === 0;
      return list.length === 1 && list[0].name === 'ms-hk-stamp-in' && list[0].duration === 120 && list[0].stamp;
    });
    return { ok, seen };
  });

  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

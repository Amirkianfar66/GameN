// mothership:dev-only
//
// The ballot's and the result window's lifecycle probe: it drives the real component (../vote.mjs) inside
// the real phone shell, in the browser, under whatever headers serve the page (design/tools/vote-check.mjs
// serves the production ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   select    an available cell reports its seat; the pick is Frontend's (the cell shows `selected` only
//             when it is given back), and the shell's footer says "Vote for Ava" and reports `vote`
//   refused   a cell that can't be chosen, a ballot already sent, a busy request and a non-interactive
//             phone take no tap; an unavailable cell keeps its focus and says why
//   stale     reconnecting, every cell is refused, keeps its look and says "Controls return…"
//   focus     a focused cell keeps its element and the focus through updates; a cell that ends moves the
//             focus to the ballot and reports it once
//   private   concealed, the ballot draws nothing and drops this viewer's inputs; a new viewer's phone
//             shows none of the last viewer's pick or ballot
//   result    the window draws the tally as it is given: each candidate's count once, 0 as 0, none on a
//             seat that was not a candidate, the chosen amber, no control and no ballot; in the shell's
//             cover it lies over the room scene's tags and takes the taps there; concealed, nothing drawn
//             and no words left in the page; shown again, drawn afresh
//   words     the headline and its line for all six outcomes, and no claim the tally does not hold
//   compact   at 320 × 568 with 200 % text the art and stamp step aside, the roster is a list of whole
//             names and the window scrolls as one column; at 390 × 844 the window is whole
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    nothing of the component's own moves (the window's arrival is Motion's); with Reduce
//             motion, the game's or the device's, nothing moves at all
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { ballotSheet, mountBallot, mountVoteResult, resultWords, VOTE_WORDS } from '../vote.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountRoomScene } from '../../room-scene/room-scene.mjs';
import { VOTE_STATES } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));

export async function runVoteProbe({ sizes, versions, room }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const ballotInput = key => ({ ...VOTE_STATES[key].ballot, versions });
  const resultInput = key => ({ ...VOTE_STATES[key].result, versions });

  /** A phone with the shell, the room scene in its stage and, for a ballot, the shell's sheet. */
  function phone(sizeKey = '390x844', { sheet = null } = {}) {
    const size = sizes[sizeKey];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    let scene = null;
    const shell = mountPhoneShell(frame, { viewer: 4, versions, insets: size.insets, sheet,
      bar: { kind: 'phase', icon: 'vote', title: 'Jail vote', sub: 'Your ballot is private', round: 3, timer: { remainingMs: 37000 }, promises: { count: 0 }, menu: {} },
      tabs: { variant: 'game', view: 'room', hero: { mode: 'vote' } } },
    { onSheetAction: record('onSheetAction'), onSheetClose: record('onSheetClose'), onLayout: l => scene?.update({ size: l.stage }) });
    scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
    return { frame, shell, scene, intents, record, dispose: () => { scene.dispose(); shell.dispose(); frame.remove(); } };
  }
  const cellOf = (root, n) => root.querySelector(`.ms-vote-grid > :nth-child(${n})`);
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const described = node => {
    const id = node.getAttribute('aria-describedby');
    return id ? document.getElementById(id)?.textContent ?? null : null;
  };

  if (mode === 'full') {
    await check('select', async () => {
      const input = ballotInput('jail-open');
      const p = phone('390x844', { sheet: ballotSheet(input) });
      const ballot = mountBallot(p.shell.sheetBody, input, { onSelect: p.record('onSelect') });
      tap(cellOf(ballot.element, 1));
      const reported = p.intents.filter(i => i[0] === 'onSelect').map(i => i[1]);
      // The pick is Frontend's: nothing changes until it is given back.
      const unchanged = cellOf(ballot.element, 1).dataset.state === 'available';
      const next = { ...input, selected: 1 };
      ballot.update({ selected: 1 });
      p.shell.update({ sheet: ballotSheet(next) });
      const picked = cellOf(ballot.element, 1);
      const voteButton = p.frame.querySelector('.ms-ps-sheet-foot [data-value="vote"]');
      tap(voteButton);
      const sent = p.intents.filter(i => i[0] === 'onSheetAction');
      const detail = { reported, unchanged, pickedState: picked.dataset.state, pressed: picked.getAttribute('aria-pressed'), note: picked.querySelector('.ms-k-cell-note')?.textContent,
        voteLabel: voteButton.textContent.trim(), sent };
      ballot.dispose(); p.dispose();
      return { ok: reported.length === 1 && reported[0] === 1 && unchanged && detail.pickedState === 'selected' && detail.pressed === 'true' && detail.note === 'Selected'
        && detail.voteLabel === 'Vote for Ava' && sent.length === 1 && sent[0][1] === 'vote' && sent[0][2] === 'ballot', ...detail };
    });

    await check('refused', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const seen = [];
      const ballot = mountBallot(host, ballotInput('captain-open'), { onSelect: n => seen.push(n) });
      // Eli (5) is not a candidate in the election: refused, focusable, and says "Not available now" (T3: the
      // projection gives no reason, and the phone works none out).
      const eli = cellOf(ballot.element, 5);
      eli.focus();
      tap(eli);
      const ineligible = { state: eli.dataset.state, disabled: eli.getAttribute('aria-disabled'), focused: document.activeElement === eli, label: eli.getAttribute('aria-label'), tag: eli.tagName };
      ballot.update({ busy: 'vote' });
      tap(cellOf(ballot.element, 1));
      const busyTaps = seen.length;
      ballot.update({ busy: null, interactive: false });
      tap(cellOf(ballot.element, 1));
      const offTaps = seen.length;
      ballot.update({ interactive: true, own: { seat: 2 } });
      tap(cellOf(ballot.element, 1));
      const sentTaps = seen.length;
      const after = [1, 2, 6].map(n => ({ seat: n, state: cellOf(ballot.element, n).dataset.state, note: cellOf(ballot.element, n).querySelector('.ms-k-cell-note')?.textContent ?? '' }));
      ballot.update({ own: null });
      tap(cellOf(ballot.element, 1));
      const open = seen.slice();
      ballot.dispose(); host.remove();
      return { ok: ineligible.state === 'ineligible' && ineligible.disabled === 'true' && ineligible.focused && ineligible.tag === 'BUTTON' && ineligible.label === 'Player 5, Eli, Not available now'
        && busyTaps === 0 && offTaps === 0 && sentTaps === 0
        && after[0].state === 'faded' && after[1].state === 'confirmed' && after[1].note === 'Your vote' && after[2].state === 'ineligible' && after[2].note === 'Not available now'
        && open.length === 1 && open[0] === 1, ineligible, busyTaps, offTaps, sentTaps, after, open };
    });

    await check('stale', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const seen = [];
      const ballot = mountBallot(host, { ...ballotInput('jail-selected') }, { onSelect: n => seen.push(n) });
      const before = [...ballot.element.querySelectorAll('.ms-k-cell')].map(c => c.dataset.state).join();
      ballot.update({ status: 'stale' });
      const cell = cellOf(ballot.element, 2);
      tap(cell);
      const after = [...ballot.element.querySelectorAll('.ms-k-cell')].map(c => c.dataset.state).join();
      const detail = { taps: seen.length, disabled: cell.getAttribute('aria-disabled'), why: described(cell), lookKept: before === after, off: cell.hasAttribute('data-off') };
      ballot.update({ status: 'live' });
      tap(cellOf(ballot.element, 2));
      detail.liveAgain = seen.slice();
      ballot.dispose(); host.remove();
      return { ok: detail.taps === 0 && detail.disabled === 'true' && detail.why === VOTE_WORDS.stale && detail.lookKept && !detail.off && detail.liveAgain.length === 1, ...detail };
    });

    await check('focus', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const returned = [];
      const ballot = mountBallot(host, ballotInput('jail-open'), { onFocusReturn: d => returned.push(d) });
      const ike = cellOf(ballot.element, 9);
      ike.focus();
      for (let i = 0; i < 5; i += 1) ballot.update({ selected: i % 2 ? 1 : null });
      const kept = document.activeElement === ike && cellOf(ballot.element, 9) === ike;
      // An 8-player roster: seat 9 is an empty frame now, so the focused cell ends.
      ballot.update({ roster: VOTE_STATES['captain-8-selected'].ballot.roster.map(p => ({ ...p, candidate: p.seat <= 8 && p.seat !== 6 })), selected: null });
      await microtasks();
      const detail = { kept, onRoot: document.activeElement === ballot.element, returned, empty: cellOf(ballot.element, 9)?.dataset.state, hidden: cellOf(ballot.element, 9)?.getAttribute('aria-hidden') };
      ballot.dispose(); host.remove();
      return { ok: kept && detail.onRoot && returned.length === 1 && returned[0]?.intent === 'select' && returned[0]?.value === '9' && detail.empty === 'empty' && detail.hidden === 'true', ...detail };
    });

    await check('private', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const ballot = mountBallot(host, { ...ballotInput('jail-selected'), own: null }, {});
      ballot.update({ status: 'concealed' });
      const concealed = { text: ballot.element.textContent.trim(), cells: ballot.element.querySelectorAll('.ms-k-cell').length, hidden: ballot.element.getAttribute('aria-hidden'),
        sheetActions: ballotSheet({ ...ballotInput('jail-selected'), status: 'concealed' }).actions.length };
      // Shown again without this viewer's inputs given again: nothing of the pick comes back.
      ballot.update({ status: 'live' });
      const back = { selected: ballot.element.querySelectorAll('[data-state="selected"]').length, available: ballot.element.querySelectorAll('[data-state="available"]').length };
      ballot.update({ selected: 1, own: null, mode: 'open' });
      // A new viewer on this phone, without their own inputs: the last viewer's pick is gone.
      ballot.update({ viewer: 7 });
      const newViewer = { selected: ballot.element.querySelectorAll('[data-state="selected"]').length, you: cellOf(ballot.element, 7).querySelector('.ms-k-you') !== null,
        lastYou: cellOf(ballot.element, 4).querySelector('.ms-k-you') !== null };
      ballot.dispose(); host.remove();
      return { ok: concealed.text === '' && concealed.cells === 0 && concealed.hidden === 'true' && concealed.sheetActions === 0
        && back.selected === 0 && back.available === 0 && newViewer.selected === 0 && newViewer.you && !newViewer.lastYou, concealed, back, newViewer };
    });

    await check('result', async () => {
      const p = phone('390x844');
      const input = resultInput('result-jailed');
      const result = mountVoteResult(p.shell.slot('cover'), input);
      const root = result.element;
      const cells = [...root.querySelectorAll('.ms-k-grid9 > .ms-k-cell')].map(c => ({ state: c.dataset.state, count: c.querySelector('.ms-k-count')?.textContent ?? null,
        you: !!c.querySelector('.ms-k-you'), label: c.getAttribute('aria-label'), note: c.querySelector('.ms-k-cell-note:not([hidden])')?.textContent ?? null }));
      const expected = { 1: '1', 2: '0', 3: '0', 4: '1', 5: '0', 6: null, 7: '5', 8: '0', 9: null };
      const counts = cells.every((c, i) => c.count === expected[i + 1]);
      const detail = { cells, counts, buttons: root.querySelectorAll('button, [tabindex], a, input').length, chosen: cells[6].state, you: cells[3].you,
        label: cells[6].label, foot: root.querySelector('.ms-result-foot')?.innerText.replace(/\s+/g, ' ').trim(),
        // No ballot: nothing in the window says who voted for whom.
        ballots: /voted for|ballot of|'s vote/i.test(root.textContent) };
      const box = root.getBoundingClientRect(), stage = p.shell.stage.getBoundingClientRect();
      detail.inset = { left: Math.round(box.left - stage.left), right: Math.round(stage.right - box.right), top: Math.round(box.top - stage.top), bottom: Math.round(stage.bottom - box.bottom) };
      // In the shell's cover, the window lies over the room scene's tags and presses (which stack inside the
      // stage up to z-index 3150) and takes the taps there, so the room under it takes none.
      await frames();
      const under = [...p.shell.stage.querySelectorAll('.ms-rs-tag')].map(tag => tag.getBoundingClientRect())
        .filter(r => r.width > 0 && r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom);
      detail.over = { tags: under.length, hits: under.map(r => !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.ms-vote-result')) };
      result.update({ status: 'concealed' });
      detail.concealed = { hidden: root.hidden, shown: root.getClientRects().length, text: root.textContent.trim(), cells: root.querySelectorAll('.ms-k-cell').length };
      // Shown again, drawn afresh from the same public tally.
      result.update({ status: 'live' });
      detail.again = { title: root.querySelector('.ms-result-title').textContent, cells: root.querySelectorAll('.ms-k-grid9 > .ms-k-cell').length };
      result.dispose(); p.dispose();
      return { ok: counts && detail.buttons === 0 && detail.chosen === 'winner' && detail.you && detail.label === 'Player 7, Gus, 5 votes' && !detail.ballots
        && cells.every(c => c.note === null) && cells[5].label === 'Player 6, Fay'
        && detail.over.tags > 0 && detail.over.hits.every(Boolean)
        && detail.foot === 'Ballots stay private Round 3' && detail.inset.left === 10 && detail.inset.right === 10 && detail.inset.top === 8 && detail.inset.bottom === 10
        && detail.concealed.hidden && detail.concealed.shown === 0 && detail.concealed.text === '' && detail.concealed.cells === 0
        && detail.again.title === 'Gus goes to Jail' && detail.again.cells === 9, ...detail };
    });

    await check('words', async () => {
      const want = {
        'result-elected': ['Captain', 'Ben is Captain', '8 votes · 8 could vote'], 'result-runoff': ['Runoff', 'Tie · runoff', '8 votes · 8 could vote'],
        'result-no-captain': ['No Captain', 'No Captain', '0 votes · 8 could vote'], 'result-jailed': ['Jailed', 'Gus goes to Jail', '7 votes · 4 needed of 8'],
        'result-jail-full': ['No room', 'Gus chosen · Jail full', 'Chosen, but every Jail place is taken. Gus stays.'],
        'result-no-one': ['No one', 'No one goes to Jail', 'No one reached 4 votes.'],
      };
      const seen = Object.fromEntries(Object.keys(want).map(k => { const w = resultWords(resultInput(k)); return [k, [w.stamp, w.title, w.line]]; }));
      const same = Object.keys(want).every(k => JSON.stringify(want[k]) === JSON.stringify(seen[k]));
      // Without the threshold, and with a tie at it, the window claims only what the tally holds.
      const noThreshold = resultWords({ ...resultInput('result-jailed'), needed: null }).line;
      const tieAt = resultWords({ ...resultInput('result-no-one'), tally: { ...resultInput('result-no-one').tally, counts: { 'seat-1': 4, 'seat-7': 4 } } }).line;
      return { ok: same && noThreshold === '7 votes · 8 could vote' && tieAt === 'No one was chosen.', seen, noThreshold, tieAt };
    });

    await check('compact', async () => {
      const outcome = {};
      for (const [key, sizeKey, text] of [['normal', '390x844', null], ['large', '320x568', 200]]) {
        document.documentElement.style.fontSize = text ? `${text}%` : '';
        const p = phone(sizeKey);
        const result = mountVoteResult(p.shell.slot('cover'), resultInput('result-jailed'));
        await frames();
        const root = result.element, q = s => root.querySelector(s);
        const shown = node => !!node && node.getClientRects().length > 0;
        const grid = q('.ms-k-grid9');
        const names = [...root.querySelectorAll('.ms-k-cell-label')].filter(shown).map(n => ({ text: n.textContent, whole: n.scrollWidth <= n.clientWidth + 1 }));
        const inner = q('.ms-result-inner');
        outcome[key] = { art: shown(q('.ms-result-art')), stamp: shown(q('.ms-result-stamp')), columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          names: names.length, whole: names.every(n => n.whole), scrollsAsOne: getComputedStyle(inner).overflowY === 'auto', titleSize: parseFloat(getComputedStyle(q('.ms-result-title')).fontSize) };
        result.dispose(); p.dispose();
      }
      document.documentElement.style.fontSize = '';
      const { normal, large } = outcome;
      return { ok: normal.art && normal.stamp && normal.columns === 3 && !normal.scrollsAsOne
        && !large.art && !large.stamp && large.columns === 1 && large.whole && large.names === 9 && large.scrollsAsOne && large.titleSize <= 30, normal, large };
    });

    await check('dispose', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const seen = [];
      const ballot = mountBallot(host, ballotInput('jail-open'), { onSelect: n => seen.push(n) });
      const cell = cellOf(ballot.element, 1);
      ballot.dispose();
      tap(cell);
      ballot.update({ selected: 1 });
      const p = phone('390x844');
      const result = mountVoteResult(p.shell.slot('cover'), resultInput('result-elected'));
      result.dispose();
      const detail = { ballotLeft: host.childElementCount, taps: seen.length, resultLeft: p.shell.slot('cover').querySelectorAll('.ms-vote-result').length };
      p.dispose(); host.remove();
      return { ok: detail.ballotLeft === 0 && detail.taps === 0 && detail.resultLeft === 0, ...detail };
    });
  }

  await check('motion', async () => {
    const outcome = {};
    for (const reduced of [false, true]) {
      const host = document.createElement('div');
      document.body.append(host);
      const ballot = mountBallot(host, { ...ballotInput('jail-open'), reducedMotion: reduced }, {});
      const p = phone('390x844');
      const result = mountVoteResult(p.shell.slot('cover'), { ...resultInput('result-jailed'), reducedMotion: reduced });
      ballot.update({ selected: 1 });
      await frames();
      const own = [ballot.element, result.element];
      const moving = document.getAnimations().filter(a => own.some(root => root.contains(a.effect?.target ?? null)));
      outcome[reduced ? 'game-reduced' : 'as-set'] = { motionAttr: [ballot.element.dataset.motion ?? null, result.element.dataset.motion ?? null], moving: moving.length };
      ballot.dispose(); result.dispose(); p.dispose(); host.remove();
    }
    const asSet = outcome['as-set'], reduced = outcome['game-reduced'];
    return { ok: asSet.moving === 0 && reduced.moving === 0 && reduced.motionAttr.every(v => v === 'reduced') && asSet.motionAttr.every(v => v === null), deviceReduced, ...outcome };
  });

  return { mode, ok: checks.every(c => c.ok), checks };
}

// mothership:dev-only
//
// Promises' lifecycle probe: it drives the real component (../promises.mjs) in the real phone shell's sheet, in the
// browser, under whatever headers serve the page (design/tools/promises-check.mjs serves the production ones), and
// reports what it saw. Each check is one behaviour Frontend relies on (the Lead's answers on #297):
//   report    each row, tile and player reports its tap, and only that; the keyboard as the finger
//   footer    Next and Back are this phone's own; Next waits for a choice; Offer, Decline and Accept are the commands,
//             busy and refused in the shell's footer with Frontend's state
//   offer     Offer a Promise refused when the projection doesn't offer it: dimmed, Frontend's reason as its description
//   lists     in a talk, the talk's group, and Received or Given only for an accepted Promise; outside a talk, both,
//             with "No Promise …"; an offer of this player's waits under "Waiting for Ava"
//   words     Frontend's exact terms, condition, when and why drawn exactly as given, never composed or trimmed; no
//             why, no line; the sheet's frame and footer from promisesSheet() for each view
//   target    Jail Vote's players are exactly the given targets; the chosen one marked; a player not given is refused;
//             each row's seat keeps its "·" (a no-break space, 0.1.1)
//   refused   Frontend's words for a refused command (0.1.1, R2), as given, in the kit's alert, last in the terms and
//             the partner's offer and nowhere else; gone when cleared, at a new viewer and while concealed
//   privacy   a Promise that doesn't name the viewer as its giver or recipient is refused; the Promises, the draft,
//             the talk and Jail Vote's players leave the page when the viewer changes and when concealed, and nothing
//             comes back by itself
//   reconnect viewing and choosing still work; Offer, Decline and Accept wait with the banner's words
//   focus     each row and tile keeps its element and the focus; a focus in what ends returns to the content, once
//   layout    the content 16 px in at both sizes, the kinds two across; at the Largest text every word whole, the last
//             part reached by scrolling and the footer in view
//   notes     at 390 × 844 with the Standard text, the talk's cells' notes within two lines, for each kind offered (the
//             Lead, 19 November); the six kinds' own lines, sheet 33's, are recorded
//   dispose   after dispose(), nothing is left and nothing fires
//   motion    none of its own, with or without Reduce motion
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { promisesSheet, PROMISE_WORDS, PROMISE_KINDS } from '../promises.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runPromisesProbe({ sizes, mountState, disposeState, inputOf, AVA, DEV, TARGETS, TERMS, CONDITION, INCOMING, OFFERED, RESULTS }) {
  const W = PROMISE_WORDS;
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
    const m = mountState(frame, 'list', size.insets, Object.fromEntries(['onOffer', 'onIncoming', 'onKind', 'onTarget', 'onFocusReturn', 'onSheetAction', 'onSheetBack', 'onRetry'].map(n => [n, record(n)])), { input });
    let current = input;
    m.shell.update({ sheet: promisesSheet(input), ...shellExtra });
    const root = m.host.element;
    const q = s => root.querySelector(s);
    // As Frontend does: a new viewer's sheet holds nothing of the last viewer's, unless the same update gives the new one's.
    const OWN = ['talk', 'draft', 'targets', 'given', 'received', 'error'];
    const update = (next, extra = {}) => {
      if ('viewer' in next && next.viewer !== current.viewer) current = Object.fromEntries(Object.entries(current).filter(([k]) => !OWN.includes(k) || k in next));
      current = { ...current, ...next };
      m.host.update(next);
      m.shell.update({ sheet: promisesSheet(current), ...extra });
    };
    return { m, calls, root, q, update, footer: () => [...m.shell.element.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')],
      tile: kind => q(`[data-intent="kind"][data-value="${kind}"]`), player: seat => q(`[data-intent="target"][data-value="${seat}"]`) };
  };
  const named = (calls, name) => calls.filter(c => c[0] === name);
  const reports = calls => calls.filter(c => c[0] !== 'onFocusReturn');
  const describedBy = node => { const id = node?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
  const tap = node => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const key = node => { node.focus(); node.click(); };
  const refused = node => node?.getAttribute('aria-disabled') === 'true';
  const busy = node => node?.getAttribute('aria-busy') === 'true';
  const dimmed = node => node?.hasAttribute('data-off');
  const shown = node => !!node && !node.hidden && node.getClientRects().length > 0 && !node.closest('[hidden]');
  const words = root => [...root.querySelectorAll('.ms-k-group-label, .ms-k-row-title, .ms-k-row-sub, .ms-k-row-value:not(:has(.ms-k-pill)), .ms-k-pill, .ms-k-group-note, .ms-pr-card-name, .ms-pr-card-terms, .ms-k-fact-text, .ms-k-tile-name, .ms-k-tile-note')].filter(shown).map(n => n.textContent);
  /** How many lines a note's words take: its text's distinct line boxes. */
  const linesOf = node => {
    if (!node) return 0;
    const range = document.createRange();
    range.selectNodeContents(node);
    const tops = [];
    for (const b of range.getClientRects()) if (b.width > 0 && !tops.some(top => Math.abs(top - b.top) < 2)) tops.push(b.top);
    return tops.length;
  };
  const labels = root => [...root.querySelectorAll('.ms-k-group-label')].filter(shown).map(n => n.textContent);
  const frameOf = s => { const sheet = s.m.shell.element.querySelector('.ms-ps-sheet'); return { title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, back: !!sheet.querySelector('[data-intent="sheet-back"]'), detent: sheet.dataset.detent, foot: s.footer().map(b => b.textContent.trim()).join('|') }; };
  const inPage = text => document.documentElement.outerHTML.includes(text);
  const ON = { enabled: true };
  const accepted = (side, extra = {}) => (side === 'given'
    ? { id: 'g', kind: 'MEET_A', giver: DEV, recipient: AVA, state: 'accepted', status: 'Fulfilled', when: 'Round 3 voting', why: 'Dev was in Room A when Round 3’s voting began.', ...extra }
    : { id: 'r', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'accepted', status: 'Pending', when: 'next Captain election', why: 'Checked when that election is held.', ...extra });

  if (mode === 'full') {
    await check('report: each row, tile and player reports its tap, and only that; the keyboard as the finger', async () => {
      const s = mount();
      tap(s.q('[data-intent="offer"]')); key(s.q('[data-intent="incoming"]'));
      s.update({ view: 'kinds' });
      tap(s.tile('MEET_A')); key(s.tile('JAIL_VOTE'));
      s.update({ view: 'target', draft: { kind: 'JAIL_VOTE', target: null, terms: null } });
      tap(s.player(2)); key(s.player(9));
      const got = reports(s.calls);
      disposeState(s.m);
      return { ok: JSON.stringify(got) === JSON.stringify([['onOffer'], ['onIncoming'], ['onKind', 'MEET_A'], ['onKind', 'JAIL_VOTE'], ['onTarget', 2], ['onTarget', 9]]), got };
    });
    await check('footer: Next and Back are this phone\'s own and Next waits for a choice; Offer, Decline and Accept are the commands, busy and refused with Frontend\'s state', async () => {
      const s = mount(inputOf({ view: 'kinds' }));
      const before = { next: refused(s.footer()[0]), local: s.footer()[0].dataset.intent };
      tap(s.footer()[0]);
      s.update({ draft: { kind: 'MEET_A', target: null, terms: null } });
      tap(s.footer()[0]);
      s.update({ view: 'confirm', draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A } });
      const [back, offer] = s.footer();
      tap(back); tap(offer);
      s.update({ offer: { enabled: true, busy: true } });
      const inFlight = busy(s.footer()[1]);
      s.update({ offer: { enabled: false, reason: 'Only during your private talk' } });
      const off = { refused: refused(s.footer()[1]), why: describedBy(s.footer()[1]) };
      s.update({ view: 'incoming', offer: ON, answer: { accept: { enabled: true, busy: true }, decline: { enabled: false, reason: 'Waiting for the server' } } });
      const [decline, accept] = s.footer();
      const answer = { words: s.footer().map(b => b.textContent.trim()).join('|'), acceptBusy: busy(accept), declineRefused: refused(decline), why: describedBy(decline), acceptCommand: accept.dataset.intent !== 'sheet-local' };
      const actions = named(s.calls, 'onSheetAction').map(c => c[1]);
      disposeState(s.m);
      const ok = before.next && before.local === 'sheet-local' && actions.join() === 'next,back,offer' && back.dataset.intent === 'sheet-local' && offer.dataset.intent !== 'sheet-local'
        && inFlight && off.refused && off.why === 'Only during your private talk' && answer.words === 'Decline|Accept' && answer.acceptBusy && answer.declineRefused && answer.why === 'Waiting for the server' && answer.acceptCommand;
      return { ok, before, actions, inFlight, off, answer };
    });
    await check('offer: Offer a Promise refused when the projection doesn\'t offer it: dimmed, Frontend\'s reason as its description', async () => {
      const s = mount(inputOf({ offer: { enabled: false, reason: 'You have given your one Promise' } }));
      const row = s.q('[data-intent="offer"]');
      tap(row);
      const seen = { refused: refused(row), dimmed: dimmed(row), why: describedBy(row), line: row.querySelector('.ms-k-tile-note').textContent };
      s.update({ offer: ON });
      tap(row);
      const got = reports(s.calls);
      disposeState(s.m);
      return { ok: seen.refused && seen.dimmed && seen.why === 'You have given your one Promise' && seen.line === W.offerLine && JSON.stringify(got) === JSON.stringify([['onOffer']]), seen, got };
    });
    await check('lists: in a talk, the talk\'s group, and Received or Given only once accepted; outside, both with "No Promise …"; an offer waiting for Ava', async () => {
      const s = mount();
      const talk = labels(s.root);
      s.update({ received: accepted('received') });
      const talkAccepted = { labels: labels(s.root), incoming: !!s.q('[data-intent="incoming"]') };
      s.update({ talk: null, offer: null, received: null });
      const outside = { labels: labels(s.root), words: words(s.root).filter(w => w.startsWith('No Promise') || w.startsWith('“Not')) };
      s.update({ talk: AVA, offer: ON, given: OFFERED, received: INCOMING });
      // In the talk, the cells (the Actions grid): Offer a Promise, then the offer to answer with the amber dot.
      const cells = [...s.root.querySelectorAll('.ms-pr-talk > .ms-k-tile')].map(t => [t.dataset.intent, t.querySelector('.ms-k-tile-name').textContent, t.querySelector('.ms-k-tile-note').textContent, t.querySelector('.ms-k-tile-icon').hasAttribute('data-waiting')].join(':'));
      const waiting = { labels: labels(s.root), row: words(s.root).filter(w => w.startsWith('Offered')), cells };
      disposeState(s.m);
      const ok = talk.join('|') === 'With Ava · talking now' && talkAccepted.labels.join('|') === 'With Ava · talking now|Received' && !talkAccepted.incoming
        && outside.labels.join('|') === 'Received|Given' && outside.words.join('|') === `No Promise received.|No Promise given.|${W.notProof}`
        && waiting.labels.join('|') === 'Waiting for Ava|With Ava · talking now' && waiting.row.join('|') === 'Offered to Ava · not counted yet|Offered'
        && waiting.cells.join('|') === `offer:${W.offer}:${W.offerLine}:false|incoming:${W.offered('Ava')}:${PROMISE_KINDS[INCOMING.kind].name}:true`;
      return { ok, talk, talkAccepted, outside, waiting };
    });
    await check('words: Frontend\'s exact terms, condition, when and why drawn exactly as given, never composed or trimmed; no why, no line', async () => {
      // The contract's details stay: whatever Frontend gives is the card's words, to the letter.
      const terms = 'Ava votes for Dev in every ballot of the specified next Captain election in which Dev is a candidate, including runoffs (agreed in Round 3).';
      const condition = 'If Dev is a candidate in no ballot of that election, the result is Condition not met';
      const s = mount(inputOf({ view: 'incoming', received: { ...INCOMING, terms, condition } }));
      const card = { terms: s.q('.ms-pr-card-terms').textContent, facts: [...s.root.querySelectorAll('.ms-k-fact-text')].map(n => n.textContent) };
      s.update({ received: { ...INCOMING, terms, condition: null } });
      const noCondition = [...s.root.querySelectorAll('.ms-k-fact-text')].map(n => n.textContent);
      s.update({ view: 'list', talk: null, offer: null, received: accepted('received', { when: 'Round 4 election', why: null }) });
      const result = { line: [...s.root.querySelectorAll('.ms-k-row-sub')].filter(shown)[0]?.textContent, notes: [...s.root.querySelectorAll('.ms-k-group-note')].filter(shown).map(n => n.textContent) };
      s.update({ view: 'confirm', talk: AVA, offer: ON, received: null, draft: { kind: 'MEET_A', target: null, terms: 'Dev will be in Room A when Round 3’s voting begins, after Sync.' } });
      const confirm = { terms: s.q('.ms-pr-card-terms').textContent, facts: [...s.root.querySelectorAll('.ms-k-fact')].map(li => [li.dataset.icon, li.textContent].join(':')) };
      disposeState(s.m);
      const ok = card.terms === terms && card.facts.join('|') === [condition, W.usesReceived, W.neverForced].join('|') && noCondition.join('|') === [W.usesReceived, W.neverForced].join('|')
        && result.line === 'From Ava · Round 4 election' && result.notes.join('|') === `No Promise given.|${W.notProof}`
        && confirm.terms === 'Dev will be in Room A when Round 3’s voting begins, after Sync.' && confirm.facts.join('|') === `info:${W.usesGiven('Ava')}|lock:${W.onlyPair('Ava')}`;
      return { ok, card, noCondition, result, confirm };
    });
    await check('words: the content\'s name, and the sheet\'s frame and footer from promisesSheet() for each view', async () => {
      const s = mount();
      const list = frameOf(s);
      s.update({ view: 'kinds', draft: { kind: 'MEET_A', target: null, terms: null } });
      const kinds = { ...frameOf(s), note: s.q('.ms-k-group-note').textContent, tiles: [...s.root.querySelectorAll('.ms-k-tile')].map(t => [t.querySelector('.ms-k-tile-name').textContent, t.dataset.state, t.getAttribute('aria-pressed')].join(':')) };
      s.update({ view: 'target', draft: { kind: 'JAIL_VOTE', target: null, terms: null } });
      const target = frameOf(s);
      s.update({ view: 'confirm', draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A } });
      const confirm = { ...frameOf(s), name: s.q('.ms-pr-card-name').textContent };
      s.update({ view: 'incoming' });
      const incoming = { ...frameOf(s), name: s.q('.ms-pr-card-name').textContent, portrait: !!s.q('.ms-k-comic .ms-k-pt') };
      const name = [s.root.getAttribute('role'), s.root.getAttribute('aria-label')].join(',');
      disposeState(s.m);
      const ok = list.title === 'Promises' && !list.back && list.detent === 'large' && list.foot === ''
        && kinds.title === 'Offer to Ava' && kinds.back && kinds.foot === 'Next' && kinds.note === W.kindsNote('Ava') && kinds.tiles.length === 6 && kinds.tiles[4] === 'Meet in Room A:selected:true' && kinds.tiles[0] === 'Captain Support:available:false'
        && target.title === W.targetTitle && target.back && target.foot === 'Next'
        && confirm.title === 'Check the terms' && confirm.back && confirm.foot === 'Back|Offer' && confirm.name === 'Meet in Room A'
        && incoming.title === 'Offer from Ava' && !incoming.back && incoming.foot === 'Decline|Accept' && incoming.name === 'Captain Support' && incoming.portrait && name === 'group,Promises';
      return { ok, list, kinds, target, confirm, incoming, name };
    });
    await check('target: Jail Vote\'s players are exactly the given targets; the chosen one marked; a player not given is refused', async () => {
      const few = TARGETS.filter(t => [2, 6, 9].includes(t.seat));
      const s = mount(inputOf({ view: 'target', targets: few, draft: { kind: 'JAIL_VOTE', target: 6, terms: null } }));
      const rows = [...s.root.querySelectorAll('[data-intent="target"]')].map(r => [r.dataset.value, r.querySelector('.ms-k-row-title').textContent, r.getAttribute('aria-pressed'), shown(r.querySelector('.ms-pr-chosen'))].join(':'));
      let outside = false;
      try { s.m.host.update({ draft: { kind: 'JAIL_VOTE', target: 4, terms: null } }); } catch (error) { outside = /one of the given targets/.test(String(error)); }
      s.update({ targets: few.filter(t => t.seat !== 9) });
      const after = [...s.root.querySelectorAll('[data-intent="target"]')].map(r => r.dataset.value);
      disposeState(s.m);
      // Each seat keeps its "·" on its line (a no-break space, 0.1.1): the row draws the words' join exactly.
      const seat = n => W.seat(n, few.find(t => t.seat === n).name);
      const joined = W.seat(2, 'Ben') === '2\u00a0· Ben';
      const ok = rows.join('|') === `2:${seat(2)}:false:false|6:${seat(6)}:true:true|9:${seat(9)}:false:false` && joined && outside && after.join() === '2,6';
      return { ok, rows: rows.map(r => r.replace(/\u00a0/g, '~')), joined, outside, after };
    });
    await check('refused: Frontend\'s words for a refused command, as given, in the kit\'s alert, last in the terms and the partner\'s offer and nowhere else; gone when cleared, at a new viewer and while concealed, and never back by themselves', async () => {
      const OFFER = 'That choice is no longer offered.', SERVER = 'The server did not allow that command.';
      const note = s => s.q('.ms-pr-error');
      const seen = s => { const n = note(s); return n ? { words: n.textContent, role: n.getAttribute('role'), kit: n.classList.contains('ms-k-error'), last: n === s.root.lastElementChild, shown: shown(n) } : null; };
      const s = mount(inputOf({ view: 'confirm', draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A }, error: OFFER }));
      const terms = seen(s), first = note(s);
      s.update({ error: OFFER });
      const same = note(s) === first;
      s.update({ error: SERVER });
      const replaced = seen(s);
      s.update({ error: null });
      const cleared = note(s) === null && !inPage(OFFER) && !inPage(SERVER);
      s.update({ view: 'list', error: SERVER });
      const list = inPage(SERVER);
      s.update({ view: 'incoming' });
      const incoming = seen(s);
      s.update({ viewer: 5 });
      const newViewer = inPage(SERVER);
      disposeState(s.m);
      const c = mount(inputOf({ view: 'incoming', error: SERVER }));
      const before = inPage(SERVER);
      c.m.host.update({ status: 'concealed' });
      const concealed = inPage(SERVER);
      c.m.host.update({ status: 'live' });
      const back = inPage(SERVER);
      disposeState(c.m);
      const ok = terms?.words === OFFER && terms.role === 'alert' && terms.kit && terms.last && terms.shown && same
        && replaced?.words === SERVER && replaced.last && cleared && !list && incoming?.words === SERVER && incoming.last && incoming.shown
        && !newViewer && before && !concealed && !back;
      return { ok, terms, same, replaced, cleared, list, incoming, newViewer, before, concealed, back };
    });
    await check('privacy: a Promise that doesn\'t name the viewer as its giver or recipient is refused', async () => {
      const BEN = TARGETS.find(t => t.seat === 2);
      const cases = [
        ['given by another', { given: { ...OFFERED, giver: BEN } }],
        ['received by another', { received: { ...INCOMING, recipient: BEN } }],
        ['given, named as recipient', { given: { ...OFFERED, giver: AVA, recipient: DEV } }],
        ['no viewer', { viewer: null, received: INCOMING }],
      ];
      const refusedCases = [];
      for (const [name, extra] of cases) {
        try { mountState(frame, 'list', size.insets, {}, { input: inputOf(extra) }); } catch (error) { if (/pair's only/.test(String(error))) refusedCases.push(name); }
        frame.replaceChildren();
      }
      return { ok: refusedCases.length === cases.length && !inPage(OFFERED.terms), refusedCases };
    });
    await check('privacy: the Promises, the draft, the talk and Jail Vote\'s players leave the page when the viewer changes, unless the same update gives the new viewer\'s', async () => {
      const s = mount(inputOf({ given: accepted('given'), view: 'confirm', draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A } }));
      const before = { terms: inPage(TERMS.MEET_A), card: shown(s.q('.ms-pr-card')) };
      s.update({ viewer: 5 });
      const dropped = { terms: inPage(TERMS.MEET_A), card: shown(s.q('.ms-pr-card')) };
      s.update({ view: 'list' });
      const list = { why: inPage('Dev was in Room A'), labels: labels(s.root), talk: !!s.q('[data-intent="offer"]') };
      // Handed back to Dev, then to Eli with Eli's own in the same update: Eli's is kept.
      const ELI = { seat: 5, name: 'Eli', character: TARGETS.find(t => t.seat === 5).character };
      s.update({ viewer: 4 });
      s.update({ viewer: 5, received: { ...INCOMING, recipient: ELI }, talk: AVA, offer: ON });
      const kept = { incoming: !!s.q('[data-intent="incoming"]'), line: s.q('[data-intent="incoming"] .ms-k-tile-name')?.textContent };
      disposeState(s.m);
      const ok = before.terms && before.card && !dropped.terms && !dropped.card && !list.why && list.labels.join('|') === 'Received|Given' && !list.talk && kept.incoming && kept.line === 'Ava offered you one';
      return { ok, before, dropped, list, kept };
    });
    await check('privacy: while concealed, everything of this viewer\'s leaves the page, given then it is refused, and nothing comes back by itself', async () => {
      const s = mount(inputOf({ view: 'incoming' }));
      const before = inPage(INCOMING.terms);
      s.m.host.update({ status: 'concealed' });
      const hidden = { terms: inPage(INCOMING.terms), card: shown(s.q('.ms-pr-card')) };
      s.m.host.update({ received: INCOMING, draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A } });
      const givenHidden = inPage(INCOMING.terms) || inPage(TERMS.MEET_A);
      s.m.host.update({ status: 'live' });
      const back = inPage(INCOMING.terms);
      s.m.host.update({ received: INCOMING, talk: AVA });
      const given = inPage(INCOMING.terms);
      disposeState(s.m);
      return { ok: before && !hidden.terms && !hidden.card && !givenHidden && !back && given, before, hidden, givenHidden, back, given };
    });
    await check('reconnect: viewing and choosing still work; Offer, Decline and Accept wait with the banner\'s words', async () => {
      const stale = { status: 'stale', banner: { kind: 'reconnecting' } };
      const s = mount(inputOf({ status: 'stale' }), stale);
      tap(s.q('[data-intent="offer"]')); tap(s.q('[data-intent="incoming"]'));
      s.update({ view: 'kinds', draft: { kind: 'MEET_A', target: null, terms: null } }, stale);
      tap(s.tile('OFFICER_SELECTION')); tap(s.footer()[0]);
      s.update({ view: 'confirm', draft: { kind: 'MEET_A', target: null, terms: TERMS.MEET_A } }, stale);
      const [back, offer] = s.footer();
      tap(back); tap(offer);
      const offerWait = { refused: refused(offer), dimmed: dimmed(offer), why: describedBy(offer) };
      s.update({ view: 'incoming' }, stale);
      const [decline, accept] = s.footer();
      tap(decline); tap(accept);
      const answerWait = [decline, accept].map(b => ({ refused: refused(b), why: describedBy(b) }));
      const got = reports(s.calls).map(c => c.slice(0, 2).join(':'));
      disposeState(s.m);
      const waits = 'Controls return when the match is current';
      const ok = got.join('|') === 'onOffer|onIncoming|onKind:OFFICER_SELECTION|onSheetAction:next|onSheetAction:back' && offerWait.refused && !offerWait.dimmed && offerWait.why === waits
        && answerWait.every(a => a.refused && a.why === waits);
      return { ok, got, offerWait, answerWait };
    });
    await check('focus: a tile keeps its element and the focus through its states; a focused incoming row that leaves returns the focus once', async () => {
      const s = mount(inputOf({ view: 'kinds' }));
      const tile = s.tile('NO_JAIL_VOTE');
      tile.focus();
      s.update({ draft: { kind: 'NO_JAIL_VOTE', target: null, terms: null } });
      s.update({ draft: { kind: 'MEET_B', target: null, terms: null } });
      const kept = s.tile('NO_JAIL_VOTE') === tile && document.activeElement === tile && tile.dataset.state === 'available';
      s.update({ view: 'list', draft: { kind: null, target: null, terms: null } });
      await Promise.resolve(); await frames();
      s.q('[data-intent="incoming"]').focus();
      // Ava's offer is answered elsewhere: it leaves the list.
      s.update({ received: null });
      await Promise.resolve(); await frames();
      const returns = named(s.calls, 'onFocusReturn');
      const active = document.activeElement === s.root;
      disposeState(s.m);
      return { ok: kept && active && returns.length === 2 && returns[0][1]?.intent === 'kind' && returns[1][1]?.intent === 'incoming', kept, active, returns };
    });
    for (const sizeKey of ['390x844', '430x932']) {
      await check(`layout: at ${sizeKey.replace('x', ' × ')}, the content 16 px in, the kinds two across`, async () => {
        size = sizeTo(sizeKey);
        const s = mount();
        const r = () => frame.getBoundingClientRect();
        const inset = n => { const b = n.getBoundingClientRect(); return [b.left - r().left, r().right - b.right]; };
        await frames();
        const list = inset(s.q('.ms-k-list'));
        s.update({ view: 'kinds' });
        await frames();
        const tiles = [...s.root.querySelectorAll('.ms-k-tile')].map(t => t.getBoundingClientRect());
        const across = new Set(tiles.map(t => Math.round(t.top))).size;
        const grid = inset(s.q('.ms-k-tiles'));
        s.update({ view: 'incoming' });
        await frames();
        const card = inset(s.q('.ms-k-comic'));
        disposeState(s.m);
        const sixteen = v => v.every(x => Math.abs(x - 16) < 0.5);
        return { ok: sixteen(list) && sixteen(grid) && sixteen(card) && tiles.length === 6 && across === 3 && tiles.every(t => t.height >= 118), list, grid, card, rows: across };
      });
    }
    size = sizeTo('390x844');
    // The Lead, 19 November: a cell's note fits two lines at 390 × 844 at the Standard text; where it wouldn't, it is
    // shorter, not taller. The talk's cells: Offer a Promise, and the offer to answer with each kind's name. The six
    // kinds' tiles say sheet 33's own lines: recorded here, not held to the rule.
    await check('notes: at 390 × 844 with the Standard text, the talk\'s cells\' notes within two lines, for each kind offered', async () => {
      const s = mount();
      const seen = [];
      for (const kind of Object.keys(PROMISE_KINDS)) {
        s.update({ received: { ...INCOMING, kind } });
        await frames();
        for (const cell of s.root.querySelectorAll('.ms-pr-talk > .ms-k-tile')) seen.push({ kind, intent: cell.dataset.intent, note: cell.querySelector('.ms-k-tile-note')?.textContent ?? null, lines: linesOf(cell.querySelector('.ms-k-tile-note')) });
      }
      s.update({ view: 'kinds' });
      await frames();
      const kinds = [...s.root.querySelectorAll('.ms-k-tile')].map(t => ({ kind: t.dataset.value, note: t.querySelector('.ms-k-tile-note')?.textContent ?? null, lines: linesOf(t.querySelector('.ms-k-tile-note')) }));
      disposeState(s.m);
      const font = getComputedStyle(document.documentElement).fontSize;
      const ok = font === '16px' && seen.length === 2 * Object.keys(PROMISE_KINDS).length && seen.every(n => n.lines >= 1 && n.lines <= 2);
      return { ok, font, over: seen.filter(n => n.lines > 2), seen, kinds };
    });
    for (const [which, input] of [['the kinds', inputOf({ view: 'kinds', draft: { kind: 'MEET_A', target: null, terms: null } })], ['the incoming offer', inputOf({ view: 'incoming' })], ['a result', { view: 'list', viewer: 4, quota: RESULTS['not-fulfilled'].quota, received: RESULTS['not-fulfilled'].received }]]) {
      await check(`layout: ${which} with the Largest text (200 %): every word whole, the last part reached by scrolling, the footer in view`, async () => {
        document.documentElement.style.fontSize = '200%';
        const s = mount(input);
        await frames();
        const parts = [...s.root.querySelectorAll('.ms-k-row-title, .ms-k-row-sub, .ms-k-row-value, .ms-k-pill, .ms-k-group-label, .ms-k-group-note, .ms-pr-card-name, .ms-pr-card-terms, .ms-k-fact-text, .ms-k-tile-name, .ms-k-tile-note')].filter(shown);
        const cut = parts.filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent);
        const body = s.m.shell.sheetBody, last = [...s.root.children].filter(n => shown(n) && !n.classList.contains('ms-k-vh')).pop();
        last.scrollIntoView({ block: 'end' });
        await frames();
        const reachable = last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5;
        const foot = s.footer().every(b => b.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom + 0.5);
        document.documentElement.style.fontSize = '';
        disposeState(s.m);
        return { ok: cut.length === 0 && reachable && foot, cut, reachable, foot };
      });
    }
    await check('dispose: safe twice; afterwards nothing is left in the sheet and nothing fires', async () => {
      const s = mount(inputOf({ view: 'incoming' }));
      const body = s.m.shell.sheetBody;
      s.update({ view: 'list' });
      const row = s.q('[data-intent="offer"]');
      s.m.host.dispose(); s.m.host.dispose();
      tap(row);
      s.m.host.update({ view: 'incoming' });
      const seen = { body: body.children.length, calls: reports(s.calls).length, connected: s.root.isConnected, terms: inPage(INCOMING.terms) && !!document.querySelector('.ms-pr-card-terms') };
      disposeState(s.m);
      const left = [...frame.children].map(n => n.className || n.tagName);
      return { ok: seen.body === 0 && seen.calls === 0 && !seen.connected && !seen.terms && left.length === 0, seen, left };
    });
  }
  await check(`motion: none of its own${deviceReduced ? ', with the device\'s Reduce motion' : ', with or without the game\'s Reduce motion'}`, async () => {
    const s = mount(inputOf({ view: 'kinds' }));
    await frames();
    const own = () => s.root.getAnimations({ subtree: true }).length;
    const first = own();
    s.update({ draft: { kind: 'MEET_A', target: null, terms: null } });
    const chosen = own();
    s.m.host.update({ reducedMotion: true });
    const reduced = { own: own(), mode: s.root.dataset.motion };
    disposeState(s.m);
    return { ok: first === 0 && chosen === 0 && reduced.own === 0 && reduced.mode === 'reduced', first, chosen, reduced };
  });
  frame.remove();
  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

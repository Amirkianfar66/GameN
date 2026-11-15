// mothership:dev-only
//
// The Card sheet's lifecycle probe: it drives the real component (../card.mjs) inside the real phone shell,
// in the browser, under whatever headers serve the page (design/tools/card-check.mjs serves the production
// ones), and reports what it saw. Each check is one behaviour Frontend relies on:
//   view      a part of the segmented control reports its view; the view is Frontend's (nothing changes until
//             it is given back), and a focused part keeps its element and the focus as the view changes
//   hide      cardSheet() offers "Hide card" in the head while the card shows and none while hidden; hidden,
//             the card's back says "Hidden" with Show, which reports, and no private word is in the page
//   refused   not interactive, the segmented control and Show take no tap; reconnecting, both still work
//             (they are local, as the shell's back and close)
//   private   concealed, nothing is drawn and every input of this viewer's is dropped; a new viewer's phone
//             shows none of the last viewer's card, knowledge or resources
//   knowledge the rows are the projection's knowledge as it is: the Undercover's seat, the Insider's trio,
//             the Hacker's Scans; nothing known says so, and knowledge not given says nothing
//   resources the rows are the ones Frontend gives, in its order, with its words; no other
//   fit       the card fills the space above the segmented control at 5 : 7, at most 440 px tall; hidden, the
//             back is 240 px wide; at 200 % text on 320 × 568 the card still fits and the parts' words are whole
//   dispose   after dispose(), nothing is left, the role card included, and nothing fires
//   motion    nothing of the component's own moves
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { cardSheet, mountCardSheet, CARD_SHEET_WORDS } from '../card.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { CARD_STATES } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));

export async function runCardProbe({ sizes, versions }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  const input = (key, extra = {}) => ({ ...CARD_STATES[key].card, versions, ...extra });

  /** A phone with the shell and the Card sheet in its sheet body (no room behind: the sheet is what is probed). */
  function phone(sizeKey = '390x844', key = 'card', extra = {}) {
    const size = sizes[sizeKey];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    const shell = mountPhoneShell(frame, { ...CARD_STATES[key].shell, versions, insets: size.insets, sheet: cardSheet(input(key, extra)) }, { onSheetAction: record('onSheetAction') });
    const part = mountCardSheet(shell.sheetBody, input(key, extra), { onView: record('onView'), onShow: record('onShow'), onFocusReturn: record('onFocusReturn') });
    return { frame, shell, part, intents, dispose: () => { part.dispose(); shell.dispose(); frame.remove(); } };
  }
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const segPart = (root, view) => root.querySelector(`.ms-card-views [data-value="${view}"]`);
  const words = root => root.textContent.replace(/\s+/g, ' ').trim();
  const shown = node => !!node && node.getClientRects().length > 0;

  if (mode === 'full') {
    await check('view', async () => {
      const p = phone();
      const root = p.part.element;
      const knowledge = segPart(root, 'knowledge');
      knowledge.focus();
      tap(knowledge);
      const reported = p.intents.filter(i => i[0] === 'onView').map(i => i[1]);
      const unchanged = root.dataset.view === 'card';
      p.part.update({ view: 'knowledge' });
      await frames();
      const detail = { reported, unchanged, view: root.dataset.view, kept: segPart(root, 'knowledge') === knowledge && document.activeElement === knowledge,
        checked: knowledge.getAttribute('aria-checked'), rows: [...root.querySelectorAll('.ms-card-panel .ms-k-row-title')].map(n => n.textContent),
        cardShown: shown(root.querySelector('.ms-card-fit')), segFirst: root.querySelector('.ms-card-views').getBoundingClientRect().top < (root.querySelector('.ms-card-panel').getBoundingClientRect().top) };
      p.dispose();
      return { ok: reported.length === 1 && reported[0] === 'knowledge' && unchanged && detail.view === 'knowledge' && detail.kept && detail.checked === 'true'
        && detail.rows.length === 0 && !detail.cardShown && detail.segFirst, ...detail };
    });

    await check('hide', async () => {
      const p = phone();
      const root = p.part.element;
      const head = cardSheet(input('card')).head.map(h => [h.id, h.label]);
      const headHidden = cardSheet(input('card', { hidden: true })).head;
      p.part.update({ hidden: true });
      p.shell.update({ sheet: cardSheet(input('card', { hidden: true })) });
      await frames();
      const show = root.querySelector('.ms-rc-back [data-intent="show-role"]');
      tap(show);
      // No private word stays in the page: not the role, its team or lines, the knowledge or the resources.
      const text = words(root);
      const secrets = ['Doctor', 'Blue team', 'Two shared injections', 'Weapons', 'Shared injections', 'Undercover'].filter(w => text.includes(w));
      const detail = { head, headHidden, text, secrets, showReported: p.intents.filter(i => i[0] === 'onShow').length, view: root.dataset.view,
        back: shown(root.querySelector('.ms-rc-back')), seg: shown(root.querySelector('.ms-card-views')) };
      p.dispose();
      return { ok: JSON.stringify(head) === JSON.stringify([['hide', 'Hide card']]) && headHidden.length === 0 && detail.back && !detail.seg
        && /Hidden/.test(text) && /Show/.test(text) && secrets.length === 0 && detail.showReported === 1 && detail.view === 'hidden', ...detail };
    });

    await check('refused', async () => {
      const p = phone();
      const root = p.part.element;
      p.part.update({ interactive: false });
      tap(segPart(root, 'resources'));
      const offTaps = p.intents.filter(i => i[0] === 'onView').length;
      const disabled = segPart(root, 'resources').getAttribute('aria-disabled');
      p.part.update({ interactive: true, status: 'stale' });
      tap(segPart(root, 'resources'));
      const staleTaps = p.intents.filter(i => i[0] === 'onView').map(i => i[1]);
      p.part.update({ hidden: true });
      tap(root.querySelector('.ms-rc-back [data-intent="show-role"]'));
      const staleShow = p.intents.filter(i => i[0] === 'onShow').length;
      p.part.update({ interactive: false });
      tap(root.querySelector('.ms-rc-back [data-intent="show-role"]'));
      const offShow = p.intents.filter(i => i[0] === 'onShow').length;
      p.dispose();
      return { ok: offTaps === 0 && disabled === 'true' && staleTaps.length === 1 && staleTaps[0] === 'resources' && staleShow === 1 && offShow === 1, offTaps, disabled, staleTaps, staleShow, offShow };
    });

    await check('private', async () => {
      const p = phone('390x844', 'knowledge-hacker');
      const root = p.part.element;
      p.part.update({ status: 'concealed' });
      await microtasks();
      const concealed = { text: words(root), hidden: root.getAttribute('aria-hidden'), card: root.querySelectorAll('.ms-rc-card').length, rows: root.querySelectorAll('.ms-k-row').length };
      // Shown again without this viewer's inputs: nothing of theirs comes back by itself.
      p.part.update({ status: 'live' });
      const back = { text: words(root), rows: root.querySelectorAll('.ms-k-row').length, card: root.querySelectorAll('.ms-rc-card').length, view: root.dataset.view };
      p.part.update(input('knowledge-hacker'));
      // A new viewer on this phone, without their own inputs.
      p.part.update({ viewer: 7 });
      const other = { text: words(root), rows: root.querySelectorAll('.ms-k-row').length, card: root.querySelectorAll('.ms-rc-card').length };
      p.dispose();
      const clean = t => !/Hacker|Undercover|Player 6|Round 2|Scans/.test(t);
      return { ok: concealed.hidden === 'true' && concealed.card === 0 && concealed.rows === 0 && clean(concealed.text)
        && back.rows === 0 && back.card === 0 && clean(back.text) && back.view === 'card' && other.rows === 0 && other.card === 0 && clean(other.text), concealed, back, other };
    });

    await check('knowledge', async () => {
      const seen = {};
      for (const key of ['knowledge-hacker', 'knowledge-insider', 'knowledge-empty']) {
        const p = phone('390x844', key);
        const root = p.part.element;
        seen[key] = { rows: [...root.querySelectorAll('.ms-card-panel .ms-k-row')].map(r => [r.querySelector('.ms-k-row-title')?.textContent, r.querySelector('.ms-k-row-value:not([hidden])')?.textContent ?? null, r.querySelector('.ms-k-row-sub:not([hidden])')?.textContent ?? null]),
          label: root.querySelector('.ms-card-panel .ms-k-group-label')?.textContent ?? null, note: root.querySelector('.ms-card-panel .ms-k-group-note')?.textContent ?? null };
        p.dispose();
      }
      const p = phone('390x844', 'knowledge-empty', { knowledge: null });
      seen.notGiven = { text: words(p.part.element.querySelector('.ms-card-panel')), shown: shown(p.part.element.querySelector('.ms-card-panel')) };
      p.dispose();
      const h = seen['knowledge-hacker'], i = seen['knowledge-insider'], e = seen['knowledge-empty'];
      return { ok: JSON.stringify(h.rows) === JSON.stringify([['Undercover', 'Player 6', null], ['Round 2 · Player 7', null, 'Guess Blue · matched · in the Code']]) && h.label === 'Scans' && h.note === null
        && JSON.stringify(i.rows) === JSON.stringify([['Unmapped trio', 'Players 2, 6, 8', null]]) && e.rows.length === 0 && e.note === CARD_SHEET_WORDS.noKnowledge
        && seen.notGiven.text === '' && !seen.notGiven.shown, ...seen };
    });

    await check('resources', async () => {
      const p = phone('390x844', 'resources');
      const rows = [...p.part.element.querySelectorAll('.ms-card-panel .ms-k-row')].map(r => [r.querySelector('.ms-k-row-title').textContent, r.querySelector('.ms-k-row-value').textContent]);
      p.part.update({ resources: [{ kind: 'promises', value: 'Given 1/1 · Received 0/1' }, { kind: 'weapons', value: '1' }] });
      const given = [...p.part.element.querySelectorAll('.ms-card-panel .ms-k-row')].map(r => [r.querySelector('.ms-k-row-title').textContent, r.querySelector('.ms-k-row-value').textContent]);
      p.dispose();
      return { ok: JSON.stringify(rows) === JSON.stringify([['Weapons', '0'], ['Role Action', 'Available'], ['Move', 'Used this round'], ['Shared injections', '2 of 2'], ['Promises', 'Given 0/1 · Received 1/1']])
        && JSON.stringify(given) === JSON.stringify([['Promises', 'Given 1/1 · Received 0/1'], ['Weapons', '1']]), rows, given };
    });

    await check('fit', async () => {
      const out = {};
      for (const [key, sizeKey, text, extra] of [['card', '390x844', null, {}], ['hidden', '390x844', null, { hidden: true }], ['large', '320x568', 200, {}]]) {
        document.documentElement.style.fontSize = text ? `${text}%` : '';
        const p = phone(sizeKey, 'card', extra);
        await frames();
        const root = p.part.element, body = p.shell.sheetBody.getBoundingClientRect();
        const card = (root.querySelector('.ms-rc-card') ?? root.querySelector('.ms-rc-back')).getBoundingClientRect();
        const seg = root.querySelector('.ms-card-views');
        const segRect = seg.getBoundingClientRect();
        const labels = [...seg.querySelectorAll('.ms-k-seg-label')].map(l => ({ text: l.textContent, whole: l.scrollWidth <= l.clientWidth + 1 }));
        out[key] = { w: Math.round(card.width), h: Math.round(card.height), ratio: Math.round(card.width / card.height * 1000) / 1000, centred: Math.abs((card.left + card.right) / 2 - (body.left + body.right) / 2) <= 1,
          inBody: card.top >= body.top - 1 && card.bottom <= body.bottom + 1, aboveSeg: shown(seg) ? card.bottom <= segRect.top : null, segShown: shown(seg), labels };
        p.dispose();
      }
      document.documentElement.style.fontSize = '';
      const { card, hidden, large } = out;
      return { ok: card.h <= 440 && card.ratio === 0.714 && card.centred && card.aboveSeg && hidden.w === 240 && hidden.h === 336 && hidden.centred && !hidden.segShown
        && large.aboveSeg && large.inBody && large.labels.every(l => l.whole), ...out };
    });

    await check('dispose', async () => {
      const p = phone();
      const root = p.part.element, host = root.parentNode;
      const part = segPart(root, 'resources');
      p.part.dispose();
      tap(part);
      p.part.update({ view: 'resources' });
      const detail = { left: host.querySelectorAll('.ms-card-sheet, .ms-own-card').length, taps: p.intents.filter(i => i[0] === 'onView').length };
      p.shell.dispose(); p.frame.remove();
      return { ok: detail.left === 0 && detail.taps === 0, ...detail };
    });
  }

  await check('motion', async () => {
    const out = {};
    for (const reduced of [false, true]) {
      const p = phone('390x844', 'card', { reducedMotion: reduced });
      p.part.update({ view: 'resources' });
      p.part.update({ view: 'card' });
      await frames();
      const own = [...p.part.element.querySelectorAll('[class*="ms-card-"]'), p.part.element];
      const moving = document.getAnimations().filter(a => own.includes(a.effect?.target));
      out[reduced ? 'game-reduced' : 'as-set'] = { moving: moving.length, attr: p.part.element.dataset.motion ?? null };
      p.dispose();
    }
    return { ok: out['as-set'].moving === 0 && out['game-reduced'].moving === 0 && out['game-reduced'].attr === 'reduced' && out['as-set'].attr === null, deviceReduced, ...out };
  });

  return { mode, ok: checks.every(c => c.ok), checks };
}

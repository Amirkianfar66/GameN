// mothership:dev-only
//
// The Hacker beside the pack: the pinned prototype's own drawing of Scan and the final Code
// (design/phone-ui/prototype/screens-more.mjs scan() and code(), with ui.mjs, kit.css and screens.css; the frozen
// Food release pins ui.mjs and kit.css, so they stay as they are) and the runtime component (../hacker.mjs, on
// the kit) in the phone shell, drawn in the same page from the same synthetic fixtures, compared frame by
// frame: the sheet's title, sub, close and footer; the target bar and its Cancel; who; the three guesses; each
// cell's place, words, state, marks and name; the line under the grid; each result's stamp, lines and row; and
// where each sits, to within half a pixel. It is how the component shows it draws the pack's frames and not a
// second design of them. No word is amended. One line the Lead dropped is taken out of the pack's frame before it
// is measured (DROPPED, below), and the check says so.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountPart } from './preview.mjs';
import { PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;
/**
 * The pack's words the Lead dropped, taken out of the pack's own frame before it is measured, so the rest is
 * compared as drawn. Q-b (16 November; docs/design/phone-ui-handoff.md at b3e5823e): CODE WRONG's "Scan stays
 * available" states a rule the planet-navigation overlay leaves open (rules/overlays/
 * planet-navigation-code-owner-decisions-2026-10-25.json, open_integration_details[5], CODE-OPEN-02), so Scan's
 * state shows on its Actions tile alone. If the pack no longer draws a line here, the frame differs.
 */
const DROPPED = Object.freeze({ 'code-wrong': Object.freeze([{ in: '.registered', words: 'Scan stays available' }]) });

/** Loads the pack's own stylesheets into this page, for the pack's half of the comparison. */
function loadPack() {
  // Literal URLs, so the bundler carries both files (a computed one would be left for run time).
  return Promise.all([new URL('../../../prototype/kit.css', import.meta.url), new URL('../../../prototype/screens.css', import.meta.url)].map(url => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error(`${url.pathname} did not load`)); });
    document.head.append(link);
    return loaded;
  }));
}

const CASES = Object.entries(PACK_FRAMES).map(([state, f]) => ({ state, frame: f.frame, size: f.size ?? '390x844', text: f.text ?? null }));

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(origin, node) {
  if (!visible(node) || !origin) return null;
  const f = origin.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
/** The computed look a person sees: colours, the edge, the type. */
const LOOK = ['background-color', 'box-shadow', 'color', 'font-size', 'font-weight', 'line-height', 'border-radius'];
const lookOf = node => (visible(node) ? Object.fromEntries(LOOK.map(p => [p, getComputedStyle(node).getPropertyValue(p)])) : null);
/** Every finite animation in a subtree (the sheet's slide), finished, so each part is measured at rest. */
const settle = root => Promise.all((root?.getAnimations?.({ subtree: true }) ?? []).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));
/** An element's name as a screen reader gets it here: its aria-labelledby words, else its aria-label. */
const nameOf = node => {
  if (!node) return null;
  const ids = node.getAttribute('aria-labelledby');
  if (ids) return ids.split(/\s+/).map(id => node.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim();
  return node.getAttribute('aria-label');
};

export async function runHackerAgreement({ sizes, inputsFor }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], { width, height, insets } = size;
    const [screen, ...rest] = c.frame.split('&');
    const params = Object.fromEntries(rest.map(kv => kv.split('=').map(decodeURIComponent)));
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them), drawn by the pack itself.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
    pack.style.setProperty('--safe-t', `${insets.top}px`);
    pack.style.setProperty('--safe-b', `${insets.bottom}px`);
    document.body.append(pack);
    MORE_SCREENS[screen](pack, params);
    const dropped = (DROPPED[c.state] ?? []).map(d => {
      const line = [...pack.querySelectorAll(`${d.in} > p`)].find(p => p.textContent.trim() === d.words) ?? null;
      line?.remove();
      return { words: d.words, found: !!line };
    });
    // The component's phone: the shell, with the part in its sheet, as the preview draws the state.
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(host);
    const { shell: shellInput, part: partInput } = inputsFor(c.state, size);
    const shell = mountPhoneShell(host, shellInput, {});
    const part = mountPart(shell, partInput);
    await document.fonts.ready;
    await frames();
    await Promise.all([settle(pack), settle(host)]);
    await frames();
    const differences = [];
    const compare = (name, what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) differences.push({ part: name, what, pack: a ?? null, component: b ?? null }); };
    for (const d of dropped) if (!d.found) differences.push({ part: 'dropped', what: 'the pack no longer draws it', pack: null, component: d.words });
    const compareBox = (name, a, b) => { if (!near(a, b)) differences.push({ part: name, what: 'box', pack: a, component: b }); };
    const compareLook = (name, a, b) => {
      const la = lookOf(a), lb = lookOf(b);
      if (la === null || lb === null) { if (la !== lb) differences.push({ part: name, what: 'look', pack: la, component: lb }); return; }
      for (const p of LOOK) if (la[p] !== lb[p]) differences.push({ part: name, what: p, pack: la[p], component: lb[p] });
    };
    const root = part?.element ?? null;
    // The frame: the top bar, the sheet, its words, its close, its body and its footer (the Lead's note 1).
    const sheetA = pack.querySelector('.sheet'), sheetB = host.querySelector('.ms-ps-sheet');
    const bodyA = sheetA?.querySelector('.sheet-body') ?? null, bodyB = shell.sheetBody;
    compareBox('top bar', box(pack, pack.querySelector('.tb')), box(host, host.querySelector('.ms-ps-tb')));
    compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
    compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
    compare('sheet', 'close', !!sheetA?.querySelector('.sheet-head [aria-label="Close"]'), !!sheetB?.querySelector('[data-intent="sheet-close"]'));
    compareBox('sheet', box(pack, sheetA), box(host, sheetB));
    compareBox('sheet body', box(pack, bodyA), box(host, bodyB));
    const footA = [...(sheetA?.querySelectorAll('.sheet-foot .btn') ?? [])], footB = [...(sheetB?.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn') ?? [])];
    compare('footer', 'words', footA.map(words), footB.map(words));
    footA.forEach((b, i) => {
      compareBox(`footer ${i + 1}`, box(sheetA, b), box(sheetB, footB[i] ?? null));
      compareLook(`footer ${i + 1}`, b, footB[i] ?? null);
    });
    // Scan · choose: the target bar and its Cancel.
    const barA = pack.querySelector('.target-bar'), barB = host.querySelector('.ms-ps-target');
    compare('target bar', 'words', [words(barA?.querySelector('b')), words(barA?.querySelector('.banner-text span')), words(barA?.querySelector('.btn'))],
      [words(barB?.querySelector('.ms-ps-text b')), words(barB?.querySelector('.ms-ps-text span')), words(barB?.querySelector('[data-intent="cancel-target"]'))]);
    compareBox('target bar', box(pack, barA), box(host, barB));
    // Scan · guess: who, and the three guesses.
    const whoA = bodyA?.querySelector('.confirm-who'), whoB = root?.querySelector('.ms-k-who');
    compare('who', 'words', [words(whoA?.querySelector(':scope > div > b')), words(whoA?.querySelector(':scope > div > span'))], [words(whoB?.querySelector('.ms-k-who-title')), words(whoB?.querySelector('.ms-k-who-sub'))]);
    compareBox('who', box(bodyA, whoA), box(bodyB, whoB));
    compareBox('who portrait', box(whoA, whoA?.querySelector(':scope > .pt')), box(whoB, whoB?.querySelector('.ms-k-who-lead .ms-k-pt')));
    compareBox('who title', box(whoA, whoA?.querySelector(':scope > div > b')), box(whoB, whoB?.querySelector('.ms-k-who-title')));
    compareBox('who sub', box(whoA, whoA?.querySelector(':scope > div > span')), box(whoB, whoB?.querySelector('.ms-k-who-sub')));
    const segA = bodyA?.querySelector('.seg'), segB = root?.querySelector('.ms-k-seg');
    compare('guess', 'group', segA ? [segA.getAttribute('role'), segA.getAttribute('aria-label')] : null, segB ? [segB.getAttribute('role'), segB.getAttribute('aria-label')] : null);
    compareBox('guess', box(bodyA, segA), box(bodyB, segB));
    compareLook('guess', segA, segB);
    const optsA = [...(segA?.querySelectorAll('button') ?? [])], optsB = [...(segB?.querySelectorAll('button') ?? [])];
    compare('guess', 'options', optsA.map(b => [words(b), b.getAttribute('aria-checked')]), optsB.map(b => [words(b), b.getAttribute('aria-checked')]));
    optsA.forEach((b, i) => { compareBox(`guess ${i + 1}`, box(segA, b), box(segB, optsB[i] ?? null)); compareLook(`guess ${i + 1}`, b, optsB[i] ?? null); });
    // The final Code: the 3 × 3, each cell, and the line under it.
    const gridA = bodyA?.querySelector('.grid9'), gridB = root?.querySelector('.ms-k-grid9');
    compareBox('grid', box(bodyA, gridA), box(bodyB, gridB));
    const cellsA = [...(gridA?.querySelectorAll(':scope > .cell') ?? [])], cellsB = [...(gridB?.querySelectorAll(':scope > .ms-k-cell') ?? [])];
    compare('grid', 'cells', cellsA.length, cellsB.length);
    cellsA.forEach((a, i) => {
      const b = cellsB[i] ?? null, n = `cell ${i + 1}`;
      compare(n, 'state', a.dataset.state, b?.dataset.state ?? null);
      compare(n, 'pressed', a.getAttribute('aria-pressed'), b?.getAttribute('aria-pressed') ?? null);
      compare(n, 'words', [words(a.querySelector('.cell-name')), words(a.querySelector('.cell-note')), words(a.querySelector('.you'))],
        [words(b?.querySelector('.ms-k-cell-name')), words(b?.querySelector('.ms-k-cell-note')), words(b?.querySelector('.ms-k-you'))]);
      compare(n, 'mark', !!a.querySelector('.cell-mark'), !!b?.querySelector('.ms-k-cell-mark'));
      // The pack's aria-label, read here from the page's words (the Lead's note 3).
      compare(n, 'accessible name', a.getAttribute('aria-label'), nameOf(b));
      compareBox(n, box(gridA, a), box(gridB, b));
      compareLook(n, a, b);
      compareBox(`${n} portrait`, box(a, a.querySelector('.pt')), box(b, b?.querySelector('.ms-k-pt')));
      compareBox(`${n} name`, box(a, a.querySelector('.cell-name')), box(b, b?.querySelector('.ms-k-cell-name')));
      compareBox(`${n} note`, box(a, a.querySelector('.cell-note')), box(b, b?.querySelector('.ms-k-cell-note')));
      compareBox(`${n} you`, box(a, a.querySelector('.you')), box(b, b?.querySelector('.ms-k-you')));
      compareBox(`${n} mark`, box(a, a.querySelector('.cell-mark')), box(b, b?.querySelector('.ms-k-cell-mark')));
    });
    const lineA = bodyA?.querySelector(':scope > .group-note') ?? null, lineB = root?.querySelector('.ms-k-group-note') ?? null;
    compare('line', 'words', words(lineA), words(lineB));
    compareBox('line', box(bodyA, lineA), box(bodyB, lineB));
    compareLook('line', lineA, lineB);
    // The results: the notice's stamp and lines, and Scan's row.
    const noticeA = bodyA?.querySelector('.registered'), noticeB = root?.querySelector('.ms-k-notice');
    compareBox('result', box(bodyA, noticeA), box(bodyB, noticeB));
    const stampA = noticeA?.querySelector('.stamp'), stampB = noticeB?.querySelector('.ms-k-stamp');
    compare('stamp', 'words', words(stampA), words(stampB));
    compare('stamp', 'tone', stampA?.dataset.tone ?? null, stampB?.dataset.tone ?? null);
    compareBox('stamp', box(noticeA, stampA), box(noticeB, stampB));
    compareLook('stamp', stampA, stampB);
    const linesA = [...(noticeA?.querySelectorAll(':scope > p') ?? [])], linesB = [...(noticeB?.querySelectorAll(':scope > p') ?? [])];
    compare('result', 'lines', linesA.map(words), linesB.map(words));
    linesA.forEach((p, i) => { compareBox(`result line ${i + 1}`, box(noticeA, p), box(noticeB, linesB[i] ?? null)); compareLook(`result line ${i + 1}`, p, linesB[i] ?? null); });
    const rowA = noticeA?.querySelector('.row'), rowB = noticeB?.querySelector('.ms-k-row');
    compare('row', 'words', [words(rowA?.querySelector('.row-title')), words(rowA?.querySelector('.row-value'))], [words(rowB?.querySelector('.ms-k-row-title')), words(rowB?.querySelector('.ms-k-row-value'))]);
    compare('row', 'tint', rowA?.querySelector('.row-icon')?.dataset.tint ?? null, rowB?.querySelector('.ms-k-row-icon')?.dataset.tint ?? null);
    compareBox('row', box(noticeA, rowA), box(noticeB, rowB));
    compareLook('row', rowA, rowB);
    compareBox('row icon', box(rowA, rowA?.querySelector('.row-icon')), box(rowB, rowB?.querySelector('.ms-k-row-icon')));
    compareLook('row icon', rowA?.querySelector('.row-icon'), rowB?.querySelector('.ms-k-row-icon'));
    checks.push({ id: `agree: ${c.state} (${c.frame}${c.size !== '390x844' ? ` at ${c.size}` : ''}${c.text ? ` at ${c.text}% text` : ''})`, ok: differences.length === 0, detail: { differences, ...(dropped.length ? { dropped: dropped.map(d => d.words) } : {}) } });
    part?.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

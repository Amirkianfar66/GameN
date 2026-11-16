// mothership:dev-only
//
// Actions beside the pack: the pinned prototype's own drawing of each Actions frame (design/phone-ui/prototype/
// screens-game.mjs actions() and room(), screens-more.mjs system(), with ui.mjs, kit.css and screens.css; the
// frozen Food release pins ui.mjs and kit.css, so they stay as they are) and the runtime component (../actions.mjs,
// with ../../play-parts) in the phone shell, drawn in the same page from the same synthetic fixtures, compared
// frame by frame: the sheet's title, sub and footer; the section head; each tile's place, words, badge, mark and
// look; the target bar and the chip; the list's groups and rows; the check's person or icon, its words and facts;
// After Register's stamp, headline, detail, people and time line; "Outcome unknown"'s notice; Pass's line; and
// where each sits, to within half a pixel. It is how the component shows it draws the pack's frames and not a
// second design of them. The pack's reasons are given as text (the Lead's L1), so no word is amended.

import { GAME_SCREENS } from '../../../prototype/screens-game.mjs';
import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountPart } from './preview.mjs';
import { PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;
const SCREENS = { ...GAME_SCREENS, ...MORE_SCREENS };

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
/** Every finite animation in a subtree (the sheet's slide, the stamp's snap), finished, so each part is measured at rest. */
const settle = root => Promise.all((root?.getAnimations?.({ subtree: true }) ?? []).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));

export async function runActionsAgreement({ sizes, inputsFor }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], { width, height, insets } = size;
    const [screen, ...rest] = c.frame.split('&');
    const params = Object.fromEntries(rest.map(kv => kv.split('=').map(decodeURIComponent)));
    // A text size applies to the whole page, both halves (the pack's frames of sheet 53 set it the same way).
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them), drawn by the pack itself.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
    pack.style.setProperty('--safe-t', `${insets.top}px`);
    pack.style.setProperty('--safe-b', `${insets.bottom}px`);
    document.body.append(pack);
    SCREENS[screen](pack, params);
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
    const compareBox = (name, a, b) => { if (!near(a, b)) differences.push({ part: name, what: 'box', pack: a, component: b }); };
    const compareLook = (name, a, b) => {
      const la = lookOf(a), lb = lookOf(b);
      if (la === null || lb === null) { if (la !== lb) differences.push({ part: name, what: 'look', pack: la, component: lb }); return; }
      for (const p of LOOK) if (la[p] !== lb[p]) differences.push({ part: name, what: p, pack: la[p], component: lb[p] });
    };
    const root = part?.element ?? null;
    // The frame: the top bar, the sheet, its words, its body and its footer.
    const sheetA = pack.querySelector('.sheet'), sheetB = host.querySelector('.ms-ps-sheet');
    const bodyA = sheetA?.querySelector('.sheet-body') ?? null, bodyB = shell.sheetBody;
    compareBox('top bar', box(pack, pack.querySelector('.tb')), box(host, host.querySelector('.ms-ps-tb')));
    compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
    compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
    compareBox('sheet', box(pack, sheetA), box(host, sheetB));
    compareBox('sheet body', box(pack, bodyA), box(host, bodyB));
    const footA = [...(sheetA?.querySelectorAll('.sheet-foot .btn') ?? [])], footB = [...(sheetB?.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn') ?? [])];
    compare('footer', 'words', footA.map(words), footB.map(words));
    footA.forEach((b, i) => compareBox(`footer ${i + 1}`, box(sheetA, b), box(sheetB, footB[i] ?? null)));
    // The tiles: the section head, each tile, and the line under them.
    const head = [bodyA?.querySelector('.section-head'), root?.querySelector('.ms-ac-head')];
    compare('section head', 'words', [words(head[0]?.querySelector('h3')), words(head[0]?.querySelector('span'))], [words(head[1]?.querySelector('h3')), words(head[1]?.querySelector('span'))]);
    compareBox('section head', box(bodyA, head[0]), box(bodyB, head[1]));
    const tilesA = [...(bodyA?.querySelectorAll('.tiles .tile') ?? [])], tilesB = [...(root?.querySelectorAll('.ms-ac-tiles .ms-k-tile') ?? [])];
    compare('tiles', 'count', tilesA.length, tilesB.length);
    tilesA.forEach((a, i) => {
      const b = tilesB[i] ?? null, n = `tile ${i + 1}`;
      // The pack's spent tile is an unavailable tile with the server's reason (L1); its submitting is sending.
      compare(n, 'state', a.dataset.state === 'submitting' ? 'sending' : a.dataset.state === 'spent' ? 'unavailable' : a.dataset.state, b?.dataset.state ?? null);
      compare(n, 'words', [words(a.querySelector('b')), words(a.querySelector('small')), words(a.querySelector('.tile-badge')), words(a.querySelector('.mini-stamp'))],
        [words(b?.querySelector('.ms-k-tile-name')), words(b?.querySelector('.ms-k-tile-note')), words(b?.querySelector('.ms-k-tile-badge')), words(b?.querySelector('.ms-k-tile-stamp'))]);
      compare(n, 'accessible name', a.getAttribute('aria-label'), b?.getAttribute('aria-label') ?? null);
      compareBox(n, box(bodyA, a), box(bodyB, b));
      compareLook(n, a, b);
      compareBox(`${n} icon`, box(a, a.querySelector('.tile-icon')), box(b, b?.querySelector('.ms-k-tile-icon')));
      compareLook(`${n} icon`, a.querySelector('.tile-icon'), b?.querySelector('.ms-k-tile-icon'));
      compareBox(`${n} name`, box(a, a.querySelector('b')), box(b, b?.querySelector('.ms-k-tile-name')));
      compareLook(`${n} name`, a.querySelector('b'), b?.querySelector('.ms-k-tile-name'));
      compareBox(`${n} note`, box(a, a.querySelector('small')), box(b, b?.querySelector('.ms-k-tile-note')));
      compareLook(`${n} note`, a.querySelector('small'), b?.querySelector('.ms-k-tile-note'));
      compareBox(`${n} badge`, box(a, a.querySelector('.tile-badge')), box(b, b?.querySelector('.ms-k-tile-badge')));
      compareBox(`${n} mark`, box(a, a.querySelector('.mini-stamp')), box(b, b?.querySelector('.ms-k-tile-stamp')));
    });
    // The note under the tiles, or Pass's line (both the kit's group note in the body).
    const noteA = bodyA?.querySelector(':scope > .group-note') ?? null, noteB = root?.querySelector('.ms-k-group-note') ?? null;
    compare('note', 'words', words(noteA), words(noteB));
    compareBox('note', box(bodyA, noteA), box(bodyB, noteB));
    // While choosing: the target bar and the chip.
    const barA = pack.querySelector('.target-bar'), barB = host.querySelector('.ms-ps-target');
    compare('target bar', 'words', [words(barA?.querySelector('b')), words(barA?.querySelector('.banner-text span'))], [words(barB?.querySelector('.ms-ps-text b')), words(barB?.querySelector('.ms-ps-text span'))]);
    compareBox('target bar', box(pack, barA), box(host, barB));
    const chipA = pack.querySelector('.offroom .btn'), chipB = host.querySelector('.ms-ps-chip-btn');
    compare('chip', 'words', words(chipA), words(chipB));
    compareBox('chip', box(pack, chipA), box(host, chipB));
    // The list: its group labels and rows.
    const labelsA = [...(bodyA?.querySelectorAll('.offroom-list .group-label') ?? [])], labelsB = [...(root?.querySelectorAll('.ms-ac-list .ms-k-group-label') ?? [])];
    compare('list', 'groups', labelsA.map(words), labelsB.map(words));
    labelsA.forEach((l, i) => compareBox(`group ${i + 1}`, box(bodyA, l), box(bodyB, labelsB[i] ?? null)));
    const rowsA = [...(bodyA?.querySelectorAll('.offroom-list .row') ?? [])], rowsB = [...(root?.querySelectorAll('.ms-ac-list .ms-k-row') ?? [])];
    compare('list', 'rows', rowsA.length, rowsB.length);
    rowsA.forEach((r, i) => {
      const b = rowsB[i] ?? null;
      compare(`row ${i + 1}`, 'words', [words(r.querySelector('.row-title')), words(r.querySelector('.row-sub'))], [words(b?.querySelector('.ms-k-row-title')), words(b?.querySelector('.ms-k-row-sub'))]);
      compareBox(`row ${i + 1}`, box(bodyA, r), box(bodyB, b));
      compareBox(`row ${i + 1} portrait`, box(r, r.querySelector('.pt')), box(b, b?.querySelector('.ms-k-pt')));
    });
    // The check: the person or the action's icon, its words, its facts.
    const whoA = bodyA?.querySelector('.confirm-who'), whoB = root?.querySelector('.ms-k-who');
    compare('who', 'words', [words(whoA?.querySelector(':scope > div > b')), words(whoA?.querySelector(':scope > div > span'))], [words(whoB?.querySelector('.ms-k-who-title')), words(whoB?.querySelector('.ms-k-who-sub'))]);
    compareBox('who', box(bodyA, whoA), box(bodyB, whoB));
    compareBox('who portrait', box(whoA, whoA?.querySelector(':scope > .pt')), box(whoB, whoB?.querySelector('.ms-k-who-lead[data-form="person"] .ms-k-pt')));
    compareBox('who icon', box(whoA, whoA?.querySelector(':scope > .tile-icon')), box(whoB, whoB?.querySelector('.ms-k-who-lead[data-form="icon"]')));
    compareLook('who icon', whoA?.querySelector(':scope > .tile-icon'), whoB?.querySelector('.ms-k-who-lead[data-form="icon"]'));
    compareBox('who title', box(whoA, whoA?.querySelector(':scope > div > b')), box(whoB, whoB?.querySelector('.ms-k-who-title')));
    compareBox('who sub', box(whoA, whoA?.querySelector(':scope > div > span')), box(whoB, whoB?.querySelector('.ms-k-who-sub')));
    const factsA = [...(bodyA?.querySelectorAll('.facts li') ?? [])], factsB = [...(root?.querySelectorAll('.ms-k-facts li') ?? [])];
    compare('facts', 'words', factsA.map(words), factsB.map(words));
    factsA.forEach((f, i) => {
      compareBox(`fact ${i + 1}`, box(bodyA, f), box(bodyB, factsB[i] ?? null));
      compareBox(`fact ${i + 1} icon`, box(f, f.querySelector('.ic')), box(factsB[i] ?? null, factsB[i]?.querySelector('.ms-k-ic')));
      compareLook(`fact ${i + 1}`, f, factsB[i] ?? null);
    });
    // After Register: the stamp, the headline, the detail, the people, the time line.
    const afterA = bodyA?.querySelector('.after'), afterB = root?.querySelector('.ms-ac-after');
    compare('after', 'kind', afterA?.dataset.kind ?? null, afterB?.dataset.kind ?? null);
    compareBox('after', box(bodyA, afterA), box(bodyB, afterB));
    compare('stamp', 'words', words(afterA?.querySelector('.after-head .stamp')), words(afterB?.querySelector('.ms-ac-after-head .ms-k-stamp')));
    compare('stamp', 'tone', afterA?.querySelector('.after-head .stamp')?.dataset.tone ?? null, afterB?.querySelector('.ms-ac-after-head .ms-k-stamp')?.dataset.tone ?? null);
    compareBox('stamp', box(afterA, afterA?.querySelector('.after-head .stamp')), box(afterB, afterB?.querySelector('.ms-ac-after-head .ms-k-stamp')));
    compare('headline', 'words', words(afterA?.querySelector('.after-head h3')), words(afterB?.querySelector('.ms-ac-after-head h3')));
    compareBox('headline', box(afterA, afterA?.querySelector('.after-head h3')), box(afterB, afterB?.querySelector('.ms-ac-after-head h3')));
    compare('detail', 'words', words(afterA?.querySelector('.after-detail')), words(afterB?.querySelector('.ms-ac-after-detail')));
    compareBox('detail', box(afterA, afterA?.querySelector('.after-detail')), box(afterB, afterB?.querySelector('.ms-ac-after-detail')));
    const peopleA = [...(afterA?.querySelectorAll('.list .row') ?? [])], peopleB = [...(afterB?.querySelectorAll('.ms-ac-after-people .ms-k-row') ?? [])];
    compare('people', 'words', peopleA.map(r => [words(r.querySelector('.row-title')), words(r.querySelector('.row-sub'))]), peopleB.map(r => [words(r.querySelector('.ms-k-row-title')), words(r.querySelector('.ms-k-row-sub'))]));
    peopleA.forEach((r, i) => compareBox(`person ${i + 1}`, box(afterA, r), box(afterB, peopleB[i] ?? null)));
    const stepsA = [...(afterA?.querySelectorAll('.steps li') ?? [])], stepsB = [...(afterB?.querySelectorAll('.ms-pp-steps li') ?? [])];
    compare('steps', 'words', stepsA.map(s => [s.dataset.step, words(s.querySelector('b')), words(s.querySelector('div > span'))]), stepsB.map(s => [s.dataset.step, words(s.querySelector('b')), words(s.querySelector('div > span'))]));
    stepsA.forEach((s, i) => {
      compareBox(`step ${i + 1}`, box(afterA, s), box(afterB, stepsB[i] ?? null));
      compareBox(`step ${i + 1} dot`, box(s, s.querySelector('.step-dot')), box(stepsB[i] ?? null, stepsB[i]?.querySelector('.ms-pp-step-dot')));
      compareLook(`step ${i + 1} dot`, s.querySelector('.step-dot'), stepsB[i]?.querySelector('.ms-pp-step-dot'));
    });
    // "Outcome unknown": the notice.
    const noticeA = bodyA?.querySelector('.registered'), noticeB = root?.querySelector('.ms-pp-notice');
    compare('notice', 'words', [...(noticeA?.querySelectorAll('p') ?? [])].map(words), [...(noticeB?.querySelectorAll('p') ?? [])].map(words));
    compareBox('notice', box(bodyA, noticeA), box(bodyB, noticeB));
    compareBox('notice icon', box(noticeA, noticeA?.querySelector('.big-icon .ic')), box(noticeB, noticeB?.querySelector('.ms-pp-notice-icon .ms-k-ic')));
    [...(noticeA?.querySelectorAll('p') ?? [])].forEach((p, i) => compareBox(`notice line ${i + 1}`, box(noticeA, p), box(noticeB, noticeB?.querySelectorAll('p')[i] ?? null)));
    checks.push({ id: `agree: ${c.state} (${c.frame}${c.size !== '390x844' ? ` at ${c.size}` : ''}${c.text ? ` at ${c.text}% text` : ''})`, ok: differences.length === 0, detail: { differences } });
    part?.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

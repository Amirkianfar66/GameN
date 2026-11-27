// mothership:dev-only
//
// The Hospital panel beside the pack: the pinned prototype's own drawing of the panel
// (design/phone-ui/prototype/screens-more.mjs panel(), with ui.mjs, kit.css and screens.css; the frozen Food release
// pins ui.mjs and kit.css, so they stay as they are) and the runtime component (../hospital-panel.mjs, on the kit)
// in the phone shell, drawn in the same page from the same synthetic fixtures, compared frame by frame: the sheet's
// title, sub, close, body and footer; the number display; each key's place, words, pressed state and look; the line
// under the keys; and each status's stamp or icon and lines, and where each sits, to within half a pixel. It is how
// the component shows it draws the pack's frames and not a second design of them. No word is amended, and nothing
// is taken out of the pack's frames.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountPart } from './preview.mjs';
import { PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;
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
/** The computed look a person sees: colours, the edge, the type, the halo. */
const LOOK = ['background-color', 'box-shadow', 'color', 'font-size', 'font-weight', 'line-height', 'border-radius', 'text-shadow', 'letter-spacing', 'font-variant-numeric'];
const lookOf = node => (visible(node) ? Object.fromEntries(LOOK.map(p => [p, getComputedStyle(node).getPropertyValue(p)])) : null);
/** Every finite animation in a subtree (the sheet's slide, a stamp's snap), finished, so each part is measured at rest. */
const settle = root => Promise.all((root?.getAnimations?.({ subtree: true }) ?? []).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));
/** The picture an icon draws: each shape's path and how it is painted (the pack's ic() and the kit's icon family). */
const iconOf = node => {
  const svg = node?.querySelector('svg');
  if (!svg) return null;
  return [...svg.querySelectorAll('path, circle, rect')].map(e => [e.tagName, e.getAttribute('d') ?? '', getComputedStyle(e).fill, getComputedStyle(e).stroke]);
};

export async function runPanelAgreement({ sizes, inputsFor }) {
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
    // The frame: the top bar, the sheet, its words, its close, its body and its footer.
    const sheetA = pack.querySelector('.sheet'), sheetB = host.querySelector('.ms-ps-sheet');
    const bodyA = sheetA?.querySelector('.sheet-body') ?? null, bodyB = shell.sheetBody;
    compareBox('top bar', box(pack, pack.querySelector('.tb')), box(host, host.querySelector('.ms-ps-tb')));
    compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
    compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
    compare('sheet', 'close', !!sheetA?.querySelector('.sheet-head [aria-label="Close"]'), !!sheetB?.querySelector('[data-intent="sheet-close"]'));
    compareBox('sheet', box(pack, sheetA), box(host, sheetB));
    compareBox('sheet body', box(pack, bodyA), box(host, bodyB));
    compareBox('close', box(sheetA, sheetA?.querySelector('.sheet-head [aria-label="Close"]')), box(sheetB, sheetB?.querySelector('[data-intent="sheet-close"]')));
    const footA = [...(sheetA?.querySelectorAll('.sheet-foot .btn') ?? [])], footB = [...(sheetB?.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn') ?? [])];
    compare('footer', 'words', footA.map(words), footB.map(words));
    footA.forEach((b, i) => {
      compareBox(`footer ${i + 1}`, box(sheetA, b), box(sheetB, footB[i] ?? null));
      compareLook(`footer ${i + 1}`, b, footB[i] ?? null);
      compare(`footer ${i + 1}`, 'icon', !!b.querySelector('svg'), !!footB[i]?.querySelector('svg'));
    });
    // The keypad: the display, the keys, and the line under them.
    const displayA = bodyA?.querySelector('.display-num'), displayB = root?.querySelector('.ms-hp-display');
    compare('display', 'words', words(displayA), words(displayB));
    compare('display', 'live', displayA?.getAttribute('aria-live') ?? null, displayB?.getAttribute('aria-live') ?? null);
    compareBox('display', box(bodyA, displayA), box(bodyB, displayB));
    compareLook('display', displayA, displayB);
    const padA = bodyA?.querySelector('.keypad'), padB = root?.querySelector('.ms-hp-keypad');
    compareBox('keypad', box(bodyA, padA), box(bodyB, padB));
    const keysA = [...(padA?.querySelectorAll(':scope > .key') ?? [])], keysB = [...(padB?.querySelectorAll(':scope > .ms-hp-key') ?? [])];
    compare('keypad', 'keys', keysA.map(words), keysB.map(words));
    keysA.forEach((a, i) => {
      const b = keysB[i] ?? null, n = `key ${i + 1}`;
      compare(n, 'pressed', a.getAttribute('aria-pressed'), b?.getAttribute('aria-pressed') ?? null);
      compare(n, 'tag', a.tagName, b?.tagName ?? null);
      compareBox(n, box(padA, a), box(padB, b));
      compareLook(n, a, b);
    });
    const lineA = bodyA?.querySelector(':scope > .group-note') ?? null, lineB = root?.querySelector('.ms-k-group-note') ?? null;
    compare('line', 'words', words(lineA), words(lineB));
    compareBox('line', box(bodyA, lineA), box(bodyB, lineB));
    compareLook('line', lineA, lineB);
    // The status: the notice's stamp or icon, and its lines.
    const noticeA = bodyA?.querySelector('.registered'), noticeB = root?.querySelector('.ms-k-notice');
    compareBox('status', box(bodyA, noticeA), box(bodyB, noticeB));
    const stampA = noticeA?.querySelector('.stamp'), stampB = noticeB?.querySelector('.ms-k-stamp');
    compare('stamp', 'words', words(stampA), words(stampB));
    compare('stamp', 'tone', stampA?.dataset.tone ?? null, stampB?.dataset.tone ?? null);
    compareBox('stamp', box(noticeA, stampA), box(noticeB, stampB));
    compareLook('stamp', stampA, stampB);
    const iconA = noticeA?.querySelector('.big-icon'), iconB = noticeB?.querySelector('.ms-k-notice-icon');
    compare('icon', 'drawn', iconOf(iconA), iconOf(iconB));
    compareBox('icon', box(noticeA, iconA), box(noticeB, iconB));
    compareBox('icon picture', box(noticeA, iconA?.querySelector('svg')), box(noticeB, iconB?.querySelector('svg')));
    const linesA = [...(noticeA?.querySelectorAll(':scope > p') ?? [])], linesB = [...(noticeB?.querySelectorAll(':scope > p') ?? [])];
    compare('status', 'lines', linesA.map(words), linesB.map(words));
    linesA.forEach((p, i) => { compareBox(`status line ${i + 1}`, box(noticeA, p), box(noticeB, linesB[i] ?? null)); compareLook(`status line ${i + 1}`, p, linesB[i] ?? null); });
    checks.push({ id: `agree: ${c.state} (${c.frame}${c.size !== '390x844' ? ` at ${c.size}` : ''}${c.text ? ` at ${c.text}% text` : ''})`, ok: differences.length === 0, detail: { differences } });
    part?.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

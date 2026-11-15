// mothership:dev-only
//
// The Card sheet beside the pack: the pinned prototype's own drawing of sheet 31's frames
// (design/phone-ui/prototype/screens-game.mjs card(), with ui.mjs, kit.css and screens.css; the frozen Food
// release pins ui.mjs and kit.css, so they stay as they are) and the runtime component (../card.mjs) in the
// phone shell, drawn in the same page from the same synthetic fixtures, compared frame by frame. Compared: the
// sheet's title, sub and head action, the card's place and the card, the segmented control and its words, the
// rows' titles, values and subs, the group label and note, the card's back with its words and Show, and where
// each sits in the sheet's body, to within half a pixel. It is how the component shows it draws the pack's
// sheet 31 and not a second design of it.

import { GAME_SCREENS } from '../../../prototype/screens-game.mjs';
import { mountCardSheet } from '../card.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;

/**
 * The one accepted difference from the pinned pack: the empty Knowledge line. The pack's "Your role starts with
 * no knowledge of other players." states a rule the phone can't know. Under the principle of the owner's T3
 * (docs/design/owner-decisions.md, 11 November 2026: the phone never works out anything from the rules itself),
 * the Lead's decision on #270 is "You have no knowledge of other players.", pending the owner's confirmation.
 * Before comparing, the pack's drawing in this page (never its source) is amended to it, and the amendment is
 * recorded; everything else is compared as the pack draws it.
 */
const PACK_EMPTY = 'Your role starts with no knowledge of other players.';
const AMENDED_EMPTY = 'You have no knowledge of other players.';
const WHY = 'T3\'s principle (the owner, 11 November 2026: the phone never works out anything from the rules itself): the Lead\'s decision on #270, pending the owner\'s confirmation';
function amend(pack) {
  const accepted = [];
  for (const note of pack.querySelectorAll('.sheet-body .group-note')) {
    if (note.textContent !== PACK_EMPTY) continue;
    accepted.push({ part: 'knowledge', what: 'empty line', pack: PACK_EMPTY, amended: AMENDED_EMPTY, why: WHY });
    note.textContent = AMENDED_EMPTY;
  }
  return accepted;
}

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

const CASES = Object.keys(PACK_FRAMES).map(state => ({ state, frame: PACK_FRAMES[state], size: '390x844' }));

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(origin, node) {
  if (!visible(node) || !origin) return null;
  const f = origin.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

/** A row's words, as the pack's row() and the kit's row() hold them. */
const rowFacts = (row, kit) => ({
  title: words(row.querySelector(kit ? '.ms-k-row-title' : '.row-title')),
  value: words(row.querySelector(kit ? '.ms-k-row-value' : '.row-value')),
  sub: words(row.querySelector(kit ? '.ms-k-row-sub' : '.row-sub')),
});

export async function runCardAgreement({ sizes, inputsFor }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], { width, height, insets } = size;
    const [screen, ...rest] = c.frame.split('&');
    const params = Object.fromEntries(rest.map(kv => kv.split('=').map(decodeURIComponent)));
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them), drawn by the pack itself.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
    pack.style.setProperty('--safe-t', `${insets.top}px`);
    pack.style.setProperty('--safe-b', `${insets.bottom}px`);
    document.body.append(pack);
    GAME_SCREENS[screen](pack, params);
    const accepted = amend(pack);
    // The component's phone: the shell, with the Card sheet in its sheet.
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(host);
    const { shell: shellInput, component } = inputsFor(c.state, size);
    const shell = mountPhoneShell(host, shellInput, {});
    const part = mountCardSheet(shell.sheetBody, component, {});
    await document.fonts.ready;
    // The shell's sheet slides in (220 ms): measure where it rests, not where it starts.
    await Promise.all((shell.element.querySelector('.ms-ps-sheet')?.getAnimations() ?? []).map(a => a.finished));
    await frames();
    const differences = [];
    const compare = (name, what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) differences.push({ part: name, what, pack: a ?? null, component: b ?? null }); };
    const compareBox = (name, a, b) => { if (!near(a, b)) differences.push({ part: name, what: 'box', pack: a, component: b }); };
    const sheetA = pack.querySelector('.sheet'), sheetB = shell.element.querySelector('.ms-ps-sheet');
    const bodyA = sheetA?.querySelector('.sheet-body'), bodyB = shell.sheetBody;
    compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
    compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
    compareBox('top bar', box(pack, pack.querySelector('.tb')), box(host, shell.element.querySelector('.ms-ps-tb')));
    compareBox('sheet', box(pack, sheetA), box(host, sheetB));
    compareBox('sheet body', box(pack, bodyA), box(host, bodyB));
    // The head's "Hide card" (the shell's sheet.head), where the card shows.
    compareBox('hide card', box(sheetA, sheetA?.querySelector('.sheet-head [aria-label="Hide card"]')), box(sheetB, sheetB?.querySelector('.ms-ps-sheet-head [aria-label="Hide card"]')));
    // The card's place and the card, or its back.
    // The card's place, where the pack draws one (hidden, the pack's back sits in the body itself).
    if (bodyA?.querySelector('.card-fit')) compareBox('card place', box(bodyA, bodyA.querySelector('.card-fit')), box(bodyB, part.element.querySelector('.ms-card-fit:not([hidden])')));
    compareBox('card', box(bodyA, bodyA?.querySelector('.card-fit .rolecard')), box(bodyB, part.element.querySelector('.ms-rc-card')));
    compareBox('card back', box(bodyA, bodyA?.querySelector('.cardback')), box(bodyB, part.element.querySelector('.ms-rc-back')));
    compare('card back', 'words', words(bodyA?.querySelector('.cardback p')), words(part.element.querySelector('.ms-rc-back p')));
    compare('show', 'words', words(bodyA?.querySelector('.cardback .btn')), words(part.element.querySelector('.ms-rc-back .ms-k-btn')));
    compareBox('show', box(bodyA, bodyA?.querySelector('.cardback .btn')), box(bodyB, part.element.querySelector('.ms-rc-back .ms-k-btn')));
    // The segmented control: its place, its words and the part that is open.
    const segA = bodyA?.querySelector('.seg'), segB = part.element.querySelector('.ms-card-views');
    compareBox('views', box(bodyA, segA), box(bodyB, segB));
    compare('views', 'words', [...(segA?.querySelectorAll('button') ?? [])].map(words), visible(segB) ? [...segB.querySelectorAll('.ms-k-seg-btn')].map(words) : []);
    compare('views', 'open', words(segA?.querySelector('button[aria-pressed="true"]')), visible(segB) ? words(segB.querySelector('[aria-checked="true"]')) : null);
    [...(segA?.querySelectorAll('button') ?? [])].forEach((b, i) => compareBox(`views ${i + 1}`, box(bodyA, b), box(bodyB, segB?.querySelectorAll('.ms-k-seg-btn')[i] ?? null)));
    // The rows, the group label and the note.
    const rowsA = [...(bodyA?.querySelectorAll('.row') ?? [])], rowsB = [...part.element.querySelectorAll('.ms-card-panel .ms-k-row')];
    compare('rows', 'count', rowsA.length, rowsB.length);
    rowsA.forEach((r, i) => {
      compare(`row ${i + 1}`, 'words', rowFacts(r, false), rowsB[i] ? rowFacts(rowsB[i], true) : null);
      compareBox(`row ${i + 1}`, box(bodyA, r), box(bodyB, rowsB[i] ?? null));
    });
    compare('group label', 'words', words(bodyA?.querySelector('.group-label')), words(part.element.querySelector('.ms-card-panel .ms-k-group-label')));
    compareBox('group label', box(bodyA, bodyA?.querySelector('.group-label')), box(bodyB, part.element.querySelector('.ms-card-panel .ms-k-group-label')));
    compare('note', 'words', words(bodyA?.querySelector('.group-note')), words(part.element.querySelector('.ms-card-panel .ms-k-group-note')));
    compareBox('note', box(bodyA, bodyA?.querySelector('.group-note')), box(bodyB, part.element.querySelector('.ms-card-panel .ms-k-group-note')));
    checks.push({ id: `agree: ${c.state} (${c.frame})`, ok: differences.length === 0, detail: { differences, accepted } });
    part.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

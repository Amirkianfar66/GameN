// mothership:dev-only
//
// The Roles list beside the pack: the pinned prototype's own end screen (design/phone-ui/prototype/screens-more.mjs
// end(), with ui.mjs, kit.css and screens.css; the frozen Food release pins ui.mjs and kit.css, so they stay as they
// are) and the runtime component (../end-roles.mjs, on the kit) in the phone shell's cover over the end scene, drawn in
// the same page from the same synthetic fixtures, compared for each result the pack draws (Blue, Red, Blue with the
// Alien, no survivors, aborted) at both development sizes, at the Standard, Large and Largest text (150 % and 200 %;
// sheet 44 has no larger frame, so the pack's own end screen at that size): "Roles", each row (its place, the
// portrait, the name, the chip, its team and its square), the Code's line, the list's place and its scrolled height,
// and "Return to lobby", in words, look and where each sits, to within half a pixel. It is how the component shows it draws the pack's
// screen and not a second design of it. No word is amended. The pack's hero and title block are the end scene's
// (#271, compared in its own check): they are taken out of the pack's drawing before it is shown. At the larger text,
// one difference is accepted, and recorded: the list starts 13 px under the scene's title block (the Lead's Q3), where
// the pack's stays at 58 % under its own. The larger-text rules for the chip and the name (end-roles.css) change
// nothing here: they act only for a longer name or role, or text above 200 %.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { PREVIEW_SIZES, PREVIEW_STATES, inputsFor, mountPhone, titleBottom } from './preview.mjs';

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

/** The Standard text, then the Large and Largest (the Lead's Q3: the pack draws no larger frame of sheet 44). */
const TEXT_SIZES = Object.freeze([null, 150, 200]);
/** The states drawn after the pack's own end screen, and which result each is. */
const CASES = Object.entries(PREVIEW_STATES).filter(([, s]) => s.pack).map(([state, s]) => ({ state, winner: s.pack }));

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(origin, node) {
  if (!visible(node) || !origin) return null;
  const f = origin.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.textContent.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
/** The computed look a person sees: colours, the edge, the type. */
const LOOK = ['background-color', 'box-shadow', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'border-radius', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color'];
const lookOf = node => (visible(node) ? Object.fromEntries(LOOK.map(p => [p, getComputedStyle(node).getPropertyValue(p)])) : null);
/** Every finite animation in a subtree, finished, so each part is measured at rest. */
const settle = root => Promise.all((root?.getAnimations?.({ subtree: true }) ?? []).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));
/** The pack's portraits are images: they are measured once they have their pictures. */
const decoded = root => Promise.all([...root.querySelectorAll('img')].map(img => img.decode().catch(() => null)));

export async function runEndRolesAgreement() {
  await loadPack();
  const checks = [];
  for (const text of TEXT_SIZES) for (const c of CASES) {
    for (const [sizeKey, size] of Object.entries(PREVIEW_SIZES)) {
      const { width, height, insets } = size;
      document.documentElement.style.fontSize = text ? `${text}%` : '';
      // The pack's phone (kit.css .ph, its safe areas as the review frames set them), drawn by the pack itself; its
      // hero and title block (the end scene's) are taken out before it is shown, so no poster is asked for.
      const pack = document.createElement('div');
      pack.className = 'ph';
      Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
      pack.style.setProperty('--safe-t', `${insets.top}px`);
      pack.style.setProperty('--safe-b', `${insets.bottom}px`);
      MORE_SCREENS.end(pack, { winner: c.winner });
      for (const node of pack.querySelectorAll('.end-hero, .end-title')) node.remove();
      document.body.append(pack);
      // The component's phone: the shell, the scene in its stage and the list in its cover, as the preview draws the state.
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px`, overflow: 'hidden' });
      document.body.append(host);
      const phone = mountPhone(host, inputsFor(c.state, size));
      await document.fonts.ready;
      await decoded(pack);
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
      const root = phone.roles.element;
      // The list: its place, "Roles", the rows, the Code's line, and how far it scrolls.
      const listA = pack.querySelector('.end-list'), listB = root.querySelector('.ms-er-list');
      compareBox('list', box(pack, listA), box(host, listB));
      compare('list', 'scrolled height', listA?.scrollHeight ?? null, listB && visible(listB) ? listB.scrollHeight : null);
      const labelA = listA?.querySelector('.group-label') ?? null, labelB = listB?.querySelector('.ms-er-label') ?? null;
      compare('Roles', 'words', words(labelA), words(labelB));
      compareBox('Roles', box(listA, labelA), box(listB, labelB));
      compareLook('Roles', labelA, labelB);
      const rowsA = [...(listA?.querySelectorAll('.reveal-row') ?? [])], rowsB = [...(listB?.querySelectorAll('.ms-er-row') ?? [])];
      compare('rows', 'count', rowsA.length, rowsB.length);
      rowsA.forEach((a, i) => {
        const b = rowsB[i] ?? null, n = `row ${i + 1}`;
        compareBox(n, box(listA, a), box(listB, b));
        compareLook(n, a, b);
        compareBox(`${n} portrait`, box(a, a.querySelector('.pt')), box(b, b?.querySelector('.ms-k-pt')));
        const nameA = a.querySelector('b'), nameB = b?.querySelector('.ms-er-name') ?? null;
        compare(`${n} name`, 'words', words(nameA), words(nameB));
        compareBox(`${n} name`, box(a, nameA), box(b, nameB));
        compareLook(`${n} name`, nameA, nameB);
        const chipA = a.querySelector('.team-chip'), chipB = b?.querySelector('.ms-er-chip') ?? null;
        // The chip's words are the role; the component also says the team, visually hidden, for the colour.
        compare(`${n} chip`, 'words', words(chipA), words(chipB?.querySelector('.ms-er-role')));
        compare(`${n} chip`, 'team', chipA?.dataset.team ?? null, chipB?.dataset.team ?? null);
        compareBox(`${n} chip`, box(a, chipA), box(b, chipB));
        compareLook(`${n} chip`, chipA, chipB);
        const squareA = chipA?.querySelector('i') ?? null, squareB = chipB?.querySelector('.ms-er-square') ?? null;
        compareBox(`${n} square`, box(chipA, squareA), box(chipB, squareB));
        compareLook(`${n} square`, squareA, squareB);
      });
      const noteA = listA?.querySelector('.group-note') ?? null, noteB = listB?.querySelector('.ms-er-note') ?? null;
      compare('Code', 'words', words(noteA), words(noteB));
      compareBox('Code', box(listA, noteA), box(listB, noteB));
      compareLook('Code', noteA, noteB);
      // "Return to lobby".
      const actionsA = pack.querySelector('.menu-actions'), actionsB = root.querySelector('.ms-er-actions');
      compareBox('actions', box(pack, actionsA), box(host, actionsB));
      const buttonA = actionsA?.querySelector('.btn') ?? null, buttonB = actionsB?.querySelector('.ms-k-btn') ?? null;
      compare('button', 'words', words(buttonA), words(buttonB));
      compareBox('button', box(actionsA, buttonA), box(actionsB, buttonB));
      compareLook('button', buttonA, buttonB);
      compareBox('button icon', box(buttonA, buttonA?.querySelector('.ic')), box(buttonB, buttonB?.querySelector('.ms-k-ic')));
      // Q3 (the Lead, 16 November): at the larger text the list starts 13 px under the end scene's title block, where
      // the pack's stays at 58 % under its own. Its sides and its bottom stay the pack's. Nothing else is accepted.
      const accepted = [];
      const moved = differences.findIndex(d => d.part === 'list' && d.what === 'box');
      if (text && moved >= 0) {
        const { pack: a, component: b } = differences[moved];
        const top = Math.max(0.58 * height, (titleBottom(phone.scene) ?? 0) + 13);
        const close = (u, v) => Math.abs(u - v) <= TOLERANCE;
        if (a && b && close(a.x, b.x) && close(a.w, b.w) && close(a.y + a.h, b.y + b.h) && close(b.y, top)) {
          accepted.push({ ...differences[moved], why: 'Q3: at the larger text the list starts 13 px under the end scene\'s title block' });
          differences.splice(moved, 1);
        }
      }
      checks.push({ id: `agree: ${c.state} (the pack's end screen, winner=${c.winner}) at ${sizeKey}${text ? ` at ${text}% text` : ''}`, ok: differences.length === 0, detail: { differences, accepted } });
      phone.dispose();
      pack.remove();
      host.remove();
    }
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

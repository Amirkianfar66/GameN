// mothership:dev-only
//
// The private talk beside the pack: the pinned prototype's own drawing of sheet 25 (design/phone-ui/prototype/
// screens-more.mjs talk(), with ui.mjs, art.mjs, kit.css and screens.css; the frozen Food release pins ui.mjs,
// kit.css and art.mjs, so they stay as they are) and the runtime component (../private-talk.mjs, with
// ../../play-parts) in the phone shell, drawn in the same page from the same synthetic fixtures, compared frame by
// frame: the pair bar's words; the sheet's title and footer; who asked, or whose claim; each side card's place,
// state, checked state, words, lock and look, and its art; the line under the cards; the claim's card; and in the
// talk, the capsule's pictures, the two seated, their tags, the ambient and the talk's two buttons; and where each
// sits, to within half a pixel. It is how the component shows it draws the pack's frames and not a second design
// of them. No word is amended.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountPart, mountStage, stageLayout } from './preview.mjs';
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
/** The computed look a person sees: colours, the edge, the type, and the card's dimming. */
const LOOK = ['background-color', 'box-shadow', 'color', 'font-size', 'font-weight', 'line-height', 'border-radius', 'opacity', 'filter'];
const lookOf = node => (visible(node) ? Object.fromEntries(LOOK.map(p => [p, getComputedStyle(node).getPropertyValue(p)])) : null);
/** Every finite animation in a subtree (the sheet's slide), finished, so each part is measured at rest. */
const settle = root => Promise.all((root?.getAnimations?.({ subtree: true }) ?? []).filter(a => a.effect?.getTiming?.().iterations !== Infinity).map(a => a.finished.catch(() => null)));

export async function runTalkAgreement({ sizes, inputsFor }) {
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
    // The component's phone: the shell, with the room scene or the capsule in its stage and the part in its sheet.
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(host);
    const inputs = inputsFor(c.state, size);
    let stage = null;
    const shell = mountPhoneShell(host, inputs.shell, { onLayout: layout => { if (layout.stage.width > 0 && layout.stage.height > 0) stage?.update(stageLayout(inputs, layout)); } });
    stage = mountStage(shell, inputs);
    stage.suspend();
    const part = mountPart(shell, inputs.part);
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
    // The pair bar: its place and its words.
    compareBox('top bar', box(pack, pack.querySelector('.tb')), box(host, host.querySelector('.ms-ps-tb')));
    compare('top bar', 'words', [words(pack.querySelector('.tb-name')), words(pack.querySelector('.tb-sub'))], [words(host.querySelector('.ms-ps-name')), words(host.querySelector('.ms-ps-sub'))]);
    compareBox('top bar portraits', box(pack, pack.querySelector('.tb .pt-pair')), box(host, host.querySelector('.ms-ps-tb .ms-ps-pair')));
    // The sheet: its words, its place, its body and its footer.
    const sheetA = pack.querySelector('.sheet'), sheetB = host.querySelector('.ms-ps-sheet');
    const bodyA = sheetA?.querySelector('.sheet-body') ?? null, bodyB = shell.sheetBody;
    compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
    compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
    compareBox('sheet', box(pack, sheetA), box(host, sheetB));
    compareBox('sheet body', box(pack, bodyA), box(host, bodyB));
    const footA = [...(sheetA?.querySelectorAll('.sheet-foot .btn') ?? [])], footB = [...(sheetB?.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn') ?? [])];
    compare('footer', 'words', footA.map(words), footB.map(words));
    footA.forEach((b, i) => compareBox(`footer ${i + 1}`, box(sheetA, b), box(sheetB, footB[i] ?? null)));
    // Who asked (declare), or whose claim (the claim).
    const whoA = bodyA?.querySelector('.confirm-who'), whoB = root?.querySelector('.ms-k-who');
    compare('who', 'words', [words(whoA?.querySelector(':scope > div > b')), words(whoA?.querySelector(':scope > div > span'))], [words(whoB?.querySelector('.ms-k-who-title')), words(whoB?.querySelector('.ms-k-who-sub'))]);
    compareBox('who', box(bodyA, whoA), box(bodyB, whoB));
    compareBox('who portrait', box(whoA, whoA?.querySelector(':scope > .pt')), box(whoB, whoB?.querySelector('.ms-k-who-lead .ms-k-pt')));
    compareBox('who title', box(whoA, whoA?.querySelector(':scope > div > b')), box(whoB, whoB?.querySelector('.ms-k-who-title')));
    compareBox('who sub', box(whoA, whoA?.querySelector(':scope > div > span')), box(whoB, whoB?.querySelector('.ms-k-who-sub')));
    // The side cards: one radio group, each card's place, state, choice, words, lock, art and look.
    const groupA = bodyA?.querySelector('.declare-sides'), groupB = root?.querySelector('.ms-pt-sides');
    compare('cards', 'group', [groupA?.getAttribute('role') ?? null, groupA?.getAttribute('aria-label') ?? null], [groupB?.getAttribute('role') ?? null, groupB?.getAttribute('aria-label') ?? null]);
    compareBox('cards', box(bodyA, groupA), box(bodyB, groupB));
    const cardsA = [...(groupA?.querySelectorAll('.tile') ?? [])], cardsB = [...(groupB?.querySelectorAll('.ms-k-tile') ?? [])];
    compare('cards', 'count', cardsA.length, cardsB.length);
    cardsA.forEach((a, i) => {
      const b = cardsB[i] ?? null, n = `card ${i + 1}`;
      compare(n, 'state', [a.dataset.state, a.getAttribute('role'), a.getAttribute('aria-checked'), a.getAttribute('aria-disabled')],
        [b?.dataset.state ?? null, b?.getAttribute('role') ?? null, b?.getAttribute('aria-checked') ?? null, b?.getAttribute('aria-disabled') ?? null]);
      compare(n, 'words', [words(a.querySelector('b')), words(a.querySelector('small'))], [words(b?.querySelector('.ms-k-tile-name')), words(b?.querySelector('.ms-k-tile-note'))]);
      compare(n, 'lock', !!a.querySelector('small .ic'), !!b?.querySelector('.ms-k-tile-note .ms-k-ic'));
      compareBox(n, box(bodyA, a), box(bodyB, b));
      compareLook(n, a, b);
      compareBox(`${n} art`, box(a, a.querySelector('.hack-card')), box(b, b?.querySelector('.ms-k-tile-art')));
      compareBox(`${n} art drawing`, box(a, a.querySelector('.hack-card svg')), box(b, b?.querySelector('.ms-k-tile-art svg')));
      compareLook(`${n} art`, a.querySelector('.hack-card'), b?.querySelector('.ms-k-tile-art'));
      compare(`${n} art`, 'drawing', a.querySelector('.hack-card svg')?.outerHTML.replace(/ style="[^"]*"/, '') ?? null, b?.querySelector('.ms-k-tile-art svg')?.outerHTML ?? null);
      compareBox(`${n} name`, box(a, a.querySelector('b')), box(b, b?.querySelector('.ms-k-tile-name')));
      compareLook(`${n} name`, a.querySelector('b'), b?.querySelector('.ms-k-tile-name'));
      compareBox(`${n} note`, box(a, a.querySelector('small')), box(b, b?.querySelector('.ms-k-tile-note')));
      compareLook(`${n} note`, a.querySelector('small'), b?.querySelector('.ms-k-tile-note'));
      compareBox(`${n} lock`, box(a, a.querySelector('small .ic')), box(b, b?.querySelector('.ms-k-tile-note .ms-k-ic')));
    });
    // The line under the cards (the kit's group note in the body).
    const noteA = bodyA?.querySelector(':scope > .group-note') ?? null, noteB = root?.querySelector('.ms-pt-note') ?? null;
    compare('note', 'words', words(noteA), words(noteB));
    compareBox('note', box(bodyA, noteA), box(bodyB, noteB));
    compareLook('note', noteA, noteB);
    // The claim's card: at most 160 px, centred under who.
    const claimA = bodyA ? [...bodyA.children].find(n => n.style?.maxWidth === '160px')?.querySelector('.hack-card') ?? null : null;
    const claimB = root?.querySelector('.ms-pt-card') ?? null;
    compareBox('claim card', box(bodyA, claimA), box(bodyB, claimB));
    compareBox('claim card drawing', box(bodyA, claimA?.querySelector('svg')), box(bodyB, claimB?.querySelector('svg')));
    compare('claim card', 'drawing', claimA?.querySelector('svg')?.outerHTML.replace(/ style="[^"]*"/, '') ?? null, claimB?.querySelector('svg')?.outerHTML ?? null);
    // The talk: the capsule's pictures, the two seated, their tags, the ambient, and the talk's two buttons.
    const capsuleA = pack.querySelector('.scene.vt-capsule'), capsuleB = host.querySelector('.ms-pt-capsule');
    const layersA = [...(capsuleA?.querySelectorAll('.scene-art') ?? [])], layersB = [...(capsuleB?.querySelectorAll('.ms-pt-layer') ?? [])];
    compare('capsule', 'pictures', layersA.map(l => [l.style.backgroundImage.match(/capsule\/([\w-]+)\.svg/)?.[1] ?? null, l.style.zIndex]),
      layersB.map(l => [l.style.getPropertyValue('--ms-pt-art').match(/capsule-([\w-]+)\)/)?.[1] ?? null, l.style.zIndex]));
    layersA.forEach((l, i) => compareBox(`picture ${i + 1}`, box(pack, l), box(host, layersB[i] ?? null)));
    compareBox('ambient', box(pack, capsuleA?.querySelector('svg.amb')), box(host, capsuleB?.querySelector('svg.amb')));
    const figsA = [...(capsuleA?.querySelectorAll('.fig') ?? [])], figsB = [...(capsuleB?.querySelectorAll('.ms-pt-fig') ?? [])];
    compare('seated', 'count', figsA.length, figsB.length);
    figsA.forEach((f, i) => {
      compareBox(`seated ${i + 1}`, box(pack, f), box(host, figsB[i] ?? null));
      compare(`seated ${i + 1}`, 'mirror', [f.style.transform, f.style.zIndex], [figsB[i]?.style.transform ?? null, figsB[i]?.style.zIndex ?? null]);
    });
    const tagsA = [...(capsuleA?.querySelectorAll('.tag') ?? [])], tagsB = [...(capsuleB?.querySelectorAll('.ms-pt-tag') ?? [])];
    compare('tags', 'words', tagsA.map(t => [words(t), t.hasAttribute('data-self')]), tagsB.map(t => [words(t), t.hasAttribute('data-self')]));
    tagsA.forEach((t, i) => {
      compareBox(`tag ${i + 1}`, box(pack, t), box(host, tagsB[i] ?? null));
      compareLook(`tag ${i + 1}`, t, tagsB[i] ?? null);
      compareBox(`tag ${i + 1} number`, box(t, t.querySelector('.num')), box(tagsB[i] ?? null, tagsB[i]?.querySelector('.ms-pt-tag-num')));
      compareLook(`tag ${i + 1} number`, t.querySelector('.num'), tagsB[i]?.querySelector('.ms-pt-tag-num'));
    });
    const talkA = [...pack.querySelectorAll('.menu-actions .btn')], talkB = [...host.querySelectorAll('.ms-ps-talk .ms-k-btn')];
    compare('talk buttons', 'words', talkA.map(words), talkB.map(words));
    talkA.forEach((b, i) => compareBox(`talk button ${i + 1}`, box(pack, b), box(host, talkB[i] ?? null)));
    checks.push({ id: `agree: ${c.state} (${c.frame}${c.size !== '390x844' ? ` at ${c.size}` : ''}${c.text ? ` at ${c.text}% text` : ''})`, ok: differences.length === 0, detail: { differences } });
    part?.dispose();
    stage.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

// mothership:dev-only
//
// The stage beside the pack: the frozen prototype's boarding screen (design/phone-ui/prototype/
// screens-pregame.mjs PREGAME_SCREENS.boarding, with kit.css and screens.css) and the runtime stage
// (../boarding-stage.mjs), drawn in the same page at the same moment, compared case by case: the words, the
// states and where each part sits, to within half a pixel. It is how the stage shows it draws sheet 19 and
// not a second design of it.
//
// Not compared: the film's picture (Motion & Cinematics', accepted in #266; the pack draws it with its own
// review frame, an iframe the production policy refuses, so the agreement leaves it out). Skip's place and
// words are compared.

import { PREGAME_SCREENS } from '../../../prototype/screens-pregame.mjs';
import { mountBoardingStage } from '../boarding-stage.mjs';

const TOLERANCE = 0.5;

/** Loads the pack's own stylesheets into this page, for the pack's half of the comparison. */
function loadPack() {
  return Promise.all(['kit.css', 'screens.css'].map(file => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(`../../../prototype/${file}`, import.meta.url).href;
    const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error(`${file} did not load`)); });
    document.head.append(link);
    return loaded;
  }));
}

const clock = t => ({ elapsedMs: t, endsAtMs: 10000 });
/** One moment of the boarding: the pack's screen parameters and the stage's input. */
const CASES = [
  { id: 'film · Skip at 0:01.5', only: ['skip'], pack: { t: 1500 }, stage: { clock: clock(1500), view: 'film', skip: { enabled: true } } },
  { id: 'skipped locally · Round 1 in 0:04', pack: { t: 6000, state: 'skipped' }, stage: { clock: clock(6000), view: 'holding', skip: null } },
  { id: 'waiting for the server', pack: { t: 10000, state: 'waiting' }, stage: { clock: clock(10000), view: 'waiting', skip: null } },
  { id: 'skipped locally at 430 × 932', size: '430x932', pack: { t: 8200, state: 'skipped' }, stage: { clock: clock(8200), view: 'holding', skip: null } },
  { id: 'waiting at 430 × 932', size: '430x932', pack: { t: 10000, state: 'waiting' }, stage: { clock: clock(10000), view: 'waiting', skip: null } },
  { id: 'film · Skip at 430 × 932', size: '430x932', only: ['skip'], pack: { t: 6000 }, stage: { clock: clock(6000), view: 'film', skip: { enabled: true } } },
];

/** The parts compared, as [name, the pack's selector, the stage's selector, compare words]. */
const PARTS = [
  ['wait', '.wait', '.ms-k-wait', false], ['tile', '.wait .big-icon', '.ms-k-wait-tile', false],
  ['title', '.wait h2', '.ms-k-wait-title', true], ['line', '.wait p', '.ms-k-wait-line', true],
  ['spinner', '.wait .spinner', '.ms-k-spinner', false], ['skip', '.film-skip .btn', '.ms-bst-skip', true],
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(frame, node) {
  if (!visible(node)) return null;
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

export async function runBoardingStageAgreement({ sizes }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size ?? '390x844'];
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them) and the stage's, side by side.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    PREGAME_SCREENS.boarding(pack, c.pack);
    // The pack draws its film through the films' review stage in an iframe, which the production policy refuses
    // (frame-src) and which is not compared: it leaves before the pack's phone enters the page. Skip stays.
    for (const frame of pack.querySelectorAll('iframe')) frame.remove();
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const stage = mountBoardingStage(host, { ...c.stage, insets: size.insets });
    await document.fonts.ready;
    await frames();
    const root = stage.element;
    const differences = [];
    const parts = {};
    // In the film's view only Skip is on top: the holding screen waits under the opaque film for the crossfade.
    for (const [name, packSel, stageSel, compareWords] of PARTS.filter(([name]) => !c.only || c.only.includes(name))) {
      const a = pack.querySelector(packSel), b = root.querySelector(stageSel);
      const pa = box(pack, a), pb = box(host, b);
      const wa = compareWords ? words(a) : null, wb = compareWords ? words(b) : null;
      parts[name] = { pack: pa, stage: pb, words: wa };
      if (!near(pa, pb)) differences.push({ part: name, what: 'box', pack: pa, stage: pb });
      if (wa !== wb) differences.push({ part: name, what: 'words', pack: wa, stage: wb });
    }
    // The states: the countdown is a timer, as the pack marks it; the tile's icon.
    const states = [
      ['line is a timer', pack.querySelector('.wait p')?.getAttribute('role') === 'timer', root.querySelector('.ms-k-wait-line')?.getAttribute('role') === 'timer' && c.stage.view === 'holding'],
      ['tile icon', pack.querySelector('.wait .big-icon svg') ? 'drawn' : null, c.stage.view === 'film' ? null : root.querySelector('.ms-k-wait-tile svg') ? 'drawn' : null],
    ];
    if (!c.only) for (const [what, a, b] of states) if (a !== b) differences.push({ part: 'state', what, pack: a, stage: b });
    checks.push({ id: `agree: ${c.id}${c.size ? '' : ' at 390 × 844'}`, ok: differences.length === 0, detail: { differences, parts } });
    stage.dispose();
    pack.remove();
    host.remove();
  }
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

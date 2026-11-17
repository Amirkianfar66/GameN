// mothership:dev-only
//
// The stage beside the pack: the frozen prototype's role screen (design/phone-ui/prototype/
// screens-pregame.mjs PREGAME_SCREENS.role, with kit.css and screens.css) and the runtime stage
// (../role-stage.mjs with ../role-card.mjs), drawn in the same page at the same moment of the stage,
// compared case by case: the words, the states and where each part sits, to within half a pixel. It is
// how the stage shows it draws the pack's role stage and not a second design of it.
//
// Not compared: the film's view (the film is Motion & Cinematics', accepted in #266, and the pack draws it
// with its own review frame), and the looks of Ready, Skip film and Show role, which come from the shared
// kit; Ready's place is compared.

import { PREGAME_SCREENS } from '../../../prototype/screens-pregame.mjs';
import { mountRoleStage } from '../role-stage.mjs';

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

/** One moment of the stage: the pack's screen parameters and the stage's input. */
const CASES = ({ cardOf }) => {
  const clock = t => ({ elapsedMs: t, filmAtMs: 20000, endsAtMs: 30000 });
  const base = t => ({ viewer: 4, clock: clock(t), view: 'card', film: 'pending', card: cardOf('Doctor'), ready: { mode: 'ready', enabled: false } });
  return [
    { id: 't01 · the card, 0:01', pack: { t: 1000 }, stage: base(1000) },
    { id: 't12 · the card, 0:12', pack: { t: 12000 }, stage: base(12000) },
    { id: 'missing · art and film unavailable, 0:24', pack: { t: 24000, state: 'missing' }, stage: { ...base(24000), film: 'missing', card: cardOf('Doctor', { art: 'missing' }) } },
    { id: 'skipped · the film skipped, 0:22', pack: { t: 22000, state: 'skipped' }, stage: { ...base(22000), film: 'skipped' } },
    { id: 'concealed · the card back, 0:09', pack: { t: 9000, state: 'concealed' }, stage: { ...base(9000), status: 'concealed' } },
    { id: 't30 · Ready, 0:30', pack: { t: 30000 }, stage: { ...base(30000), view: 'after', ready: { mode: 'ready', enabled: true } } },
    { id: 'waiting · Ready used, 6 of 9 ready', pack: { t: 31000, state: 'waiting' }, stage: { ...base(31000), view: 'after', ready: { mode: 'done' }, roster: { ready: 6, total: 9 } } },
    { id: 'hacker · a Red card at 430 × 932', size: '430x932', role: 'Hacker', pack: { t: 5000 }, stage: { ...base(5000), card: cardOf('Hacker') } },
    { id: 'waiting · at 430 × 932', size: '430x932', pack: { t: 31000, state: 'waiting' }, stage: { ...base(31000), view: 'after', ready: { mode: 'done' }, roster: { ready: 6, total: 9 } } },
  ];
};

/** The parts compared, as [name, the pack's selector, the stage's selector, compare words]. */
const PARTS = [
  ['bar', '.tb', '.ms-ps-tb', false], ['title', '.tb-name', '.ms-ps-name', true], ['sub', '.tb-sub', '.ms-ps-sub', true],
  ['glyph', '.tb-glyph', '.ms-ps-glyph', false], ['timer', '.timer', '.ms-ps-timer', true],
  ['strip', '[role="progressbar"]', '.ms-rst-strip', false],
  ['card', '.rolecard, .cardback', '.ms-rc-card, .ms-rc-back', false], ['art', '.rc-art', '.ms-rc-art', false],
  ['person', '.rc-person', '.ms-rc-person', false], ['device', '.rc-device', '.ms-rc-device', false],
  ['name', '.rc-name', '.ms-rc-name', true], ['team', '.rc-team', '.ms-rc-team', true], ['facts', '.rc-facts', '.ms-rc-facts', true],
  ['missing', '.rc-missing', '.ms-rc-missing', true], ['back', '.cardback p', '.ms-rc-back p', true],
  ['note', '.stage-foot .note', '.ms-rst-note', true], ['ready', '.stage-foot .btn', '.ms-rst-ready', true],
  ['stamp', '.pill', '.ms-rc-stamp', true],
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
/** Every picture in a part has loaded (the pack's are <img>; the stage's are backgrounds on its bundles' properties). */
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));

export async function runRoleStageAgreement({ sizes, cardOf }) {
  await loadPack();
  const checks = [];
  for (const c of CASES({ cardOf })) {
    const size = sizes[c.size ?? '390x844'];
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them) and the stage's, side by side.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    PREGAME_SCREENS.role(pack, { role: c.role ?? 'Doctor', ...c.pack });
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const stage = mountRoleStage(host, { ...c.stage, insets: size.insets });
    await document.fonts.ready;
    await pictures(pack);
    await frames();
    const root = stage.element;
    const differences = [];
    const parts = {};
    for (const [name, packSel, stageSel, compareWords] of PARTS) {
      const a = pack.querySelector(packSel), b = root.querySelector(stageSel);
      const pa = box(pack, a), pb = box(host, b);
      const wa = compareWords ? words(a) : null, wb = compareWords ? words(b) : null;
      parts[name] = { pack: pa, stage: pb, words: wa };
      if (!near(pa, pb)) differences.push({ part: name, what: 'box', pack: pa, stage: pb });
      if (wa !== wb) differences.push({ part: name, what: 'words', pack: wa, stage: wb });
    }
    // The states: the strip's value, Ready's availability and the card's accessible name.
    const states = [
      ['strip value', pack.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') ?? null, root.querySelector('.ms-rst-strip:not([hidden])')?.getAttribute('aria-valuenow') ?? null],
      ['ready unavailable', pack.querySelector('.stage-foot .btn')?.getAttribute('aria-disabled') === 'true', root.querySelector('.ms-rst-ready')?.getAttribute('aria-disabled') === 'true'],
      ['card name', pack.querySelector('.rolecard')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-rc-card')?.getAttribute('aria-label') ?? null],
      ['team', pack.querySelector('.rolecard')?.dataset.team ?? null, root.querySelector('.ms-rc-card')?.dataset.team ?? null],
    ];
    for (const [what, a, b] of states) if (a !== b) differences.push({ part: 'state', what, pack: a, stage: b });
    checks.push({ id: `agree: ${c.id}${c.size ? '' : ' at 390 × 844'}`, ok: differences.length === 0, detail: { differences, parts } });
    stage.dispose();
    pack.remove();
    host.remove();
  }
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

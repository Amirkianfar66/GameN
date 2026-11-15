// mothership:dev-only
//
// One half of the kit's comparison with the pack (design/tools/kit-check.mjs). pack.html draws every case of
// cases.mjs with the pinned pack's builders and only the pack's kit.css; kit.html draws them with the kit and
// only the kit's styles (and the phone shell's, whose docked sheet is the game's glass). Each case is drawn on
// a plain surface 358 px wide (a 390 px phone's content) and, where it says so, on glass: in the pack's sheet,
// and in the shell's sheet inside a component's own .ms-kit root, as a sheet's content is in the game.
// ?text=200 draws everything at 200% text. window.__kitPage.measure() reports every part of every case:
// its box from the case's own corner, its computed type, colours and spacing, its ::before and ::after,
// and an icon's drawing, for the check to compare side by side.

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import * as ui from '../../../prototype/ui.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { createControlPolicy, createKit } from '../kit.mjs';
import { CASES } from './cases.mjs';

const SIDE = document.documentElement.dataset.side;
const TEXT = Number(new URLSearchParams(location.search).get('text') ?? 100);
const PHONE = 390, CONTENT = 358;
// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew; the
// portraits on the CSS properties the game's crew bundle defines (as the shell's preview does).
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}
document.documentElement.style.fontSize = TEXT === 100 ? '' : `${TEXT}%`;
Object.assign(document.body.style, { margin: '0', background: '#10141C' });

/** Every case's own box: a block the width of a phone's content, so a block control fills the same width. */
function caseBox(c) {
  const box = document.createElement('div');
  box.dataset.case = c.id;
  Object.assign(box.style, { display: 'flow-root', width: `${CONTENT}px`, margin: '0 0 20px' });
  return box;
}
const section = name => {
  const node = document.createElement('section');
  node.dataset.section = name;
  Object.assign(node.style, { position: 'relative', width: `${PHONE}px` });
  document.body.append(node);
  return node;
};

function drawPack() {
  const plain = section('plain');
  plain.style.padding = '16px';
  plain.style.boxSizing = 'border-box';
  for (const c of CASES) { const box = caseBox(c); box.append(...[c.pack({ ui })].flat()); plain.append(box); }
  // The pack's glass: its own sheet in its phone frame, with no bars, tall enough to hold every case.
  const glass = section('glass');
  const ph = ui.h('div.ph', { 'data-chrome': 'none', style: { width: `${PHONE}px`, height: '12000px', '--safe-t': '0px', '--safe-b': '0px' } });
  const boxes = CASES.filter(c => c.where === 'both').map(c => { const box = caseBox(c); box.append(...[c.pack({ ui })].flat()); return box; });
  const [sheet] = ui.sheet({ title: 'On glass', body: boxes, detent: 'large', close: false, scrim: false });
  ph.append(sheet);
  glass.append(ph);
  return { glassHost: ph, glassBody: sheet.querySelector('.sheet-body') };
}

function drawKit() {
  const kit = createKit(document);
  const plain = section('plain');
  plain.style.padding = '16px';
  plain.style.boxSizing = 'border-box';
  const root = document.createElement('div');
  root.className = 'ms-kit';
  plain.append(root);
  const plainPolicy = createControlPolicy({ root });
  for (const c of CASES) { const box = caseBox(c); box.append(...[c.kit({ kit, versions, control: plainPolicy.control })].flat()); root.append(box); }
  // The game's glass: the phone shell's docked sheet, and in its body a component's own .ms-kit root.
  const glass = section('glass');
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'relative', width: `${PHONE}px`, height: '12000px' });
  glass.append(host);
  const shell = mountPhoneShell(host, { versions, insets: { top: 0, right: 0, bottom: 0, left: 0 }, bar: { kind: 'phase', icon: 'panel', title: 'On glass' }, tabs: null,
    sheet: { id: 'glass', title: 'On glass', close: false, detent: 'large', actions: [] } });
  const component = document.createElement('div');
  component.className = 'ms-kit';
  shell.sheetBody.append(component);
  const glassPolicy = createControlPolicy({ root: component });
  for (const c of CASES.filter(x => x.where === 'both')) { const box = caseBox(c); box.append(...[c.kit({ kit, versions, control: glassPolicy.control })].flat()); component.append(box); }
  return { glassHost: host, glassBody: shell.sheetBody };
}

const { glassHost, glassBody } = SIDE === 'pack' ? drawPack() : drawKit();

/** The glass frame fits what it holds, so its sheet never scrolls (a scroll bar would narrow one side only). */
function fitGlass() {
  const top = glassBody.getBoundingClientRect().top - glassHost.getBoundingClientRect().top;
  glassHost.style.height = `${Math.ceil(top + glassBody.scrollHeight + 24)}px`;
}

const STYLE = ['display', 'position', 'box-sizing', 'color', 'background-color', 'background-image', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius',
  'border-bottom-left-radius', 'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-bottom-width', 'border-left-width', 'box-shadow', 'opacity',
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-shadow', 'text-overflow',
  'white-space', 'overflow-x', 'overflow-y', 'transform', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'column-gap', 'row-gap', 'visibility', 'cursor', 'list-style-type', 'vertical-align'];
const PSEUDO = ['content', 'display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'background-color', 'background-image', 'border-top-width', 'border-top-style',
  'border-top-color', 'border-right-color', 'border-top-left-radius', 'box-shadow', 'transform', 'opacity', 'animation-duration', 'animation-timing-function', 'animation-iteration-count'];
const round = n => Math.round(n * 100) / 100;
const shown = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';

function part(box, node, options = {}) {
  if (!shown(node)) return null;
  const b = box.getBoundingClientRect(), r = node.getBoundingClientRect(), s = getComputedStyle(node);
  const out = { box: { x: round(r.left - b.left), y: round(r.top - b.top), w: round(r.width), h: round(r.height) }, style: {} };
  for (const key of STYLE) out.style[key] = s.getPropertyValue(key);
  // A portrait is a picture element in the pack and a painted tile in the kit: its picture is not a style.
  if (options.portrait) delete out.style['background-image'];
  if (options.words) out.words = (node.tagName === 'INPUT' ? node.value : node.innerText).replace(/\s+/g, ' ').trim();
  if (options.svg) {
    out.drawing = node.innerHTML;
    out.viewBox = node.getAttribute('viewBox');
    out.style['--ic-knock'] = s.getPropertyValue('--ic-knock').trim() || '(none)';
  }
  if (options.placeholder) out.placeholder = (node.tagName === 'INPUT' ? getComputedStyle(node, '::placeholder') : s).getPropertyValue('color');
  for (const pseudo of options.pseudo ?? []) {
    const p = getComputedStyle(node, pseudo);
    const content = p.getPropertyValue('content');
    out[pseudo] = content === 'none' || content === 'normal' ? { content: 'none' } : Object.fromEntries(PSEUDO.map(key => [key, p.getPropertyValue(key)]));
  }
  return out;
}

async function measure() {
  await document.fonts.ready;
  fitGlass();
  // A spinner's turn and a switch's slide hold still, at their start, so both sides are read at one moment.
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; }
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  const out = { side: SIDE, text: TEXT, sections: {} };
  for (const name of ['plain', 'glass']) {
    const cases = {};
    for (const box of document.querySelectorAll(`[data-section="${name}"] [data-case]`)) {
      const c = CASES.find(x => x.id === box.dataset.case);
      const parts = {};
      for (const [partName, packSelector, kitSelector, options] of c.parts) parts[partName] = part(box, box.querySelector(SIDE === 'pack' ? packSelector : kitSelector), options);
      cases[c.id] = parts;
    }
    const s = document.querySelector(`[data-section="${name}"]`).getBoundingClientRect();
    out.sections[name] = { size: { width: round(s.width), height: round(s.height) }, cases };
  }
  return out;
}

window.__kitPage = { side: SIDE, text: TEXT, measure, cases: CASES.map(c => ({ id: c.id, where: c.where })) };

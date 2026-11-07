// mothership:dev-only
//
// Pilot 2 on the cinematic stage: the board-v2 review page (synthetic, unmodified) in a frame as
// the board, standing for the snapshot the server published at Sync. By default the Blackhole is
// drawn behind the crew, in each room's art layer (nothing over the board); the display's stage cut
// (in P27's six-second presentation stage after an actual Sync) is an overlay over it. The display's frame is
// 1920 x 1080; a phone's w x h. The insert is the space shot alone. A review page's controller: no
// world, branch or actor exists here.

import { filmEnd, BLACKHOLE_VERSION, VARIANTS } from './film.mjs';
import { insertSvg, overlaySvg } from './compose.mjs';
import { scopeIds } from '../../lib/scene.mjs';
import { artHolders } from '../../lib/stage-kit.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

async function boardFrame(root, { w, h, roster = 9 }) {
  const iframe = document.createElement('iframe');
  iframe.title = 'Board v2 review page (synthetic)';
  Object.assign(iframe.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, border: '0', transformOrigin: '50% 46%' });
  iframe.src = `../board-v2/index.html?beds=4&roster=${roster}&fixture=mixed`;
  root.append(iframe);
  await new Promise(done => iframe.addEventListener('load', done, { once: true }));
  const doc = iframe.contentDocument;
  for (let i = 0; i < 200 && !doc.querySelector('.v2-room'); i += 1) await new Promise(done => setTimeout(done, 25));
  await Promise.all([...doc.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
  const rect = node => { const b = node.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const board = rect(doc.querySelector('.v2-board'));
  const rooms = [...doc.querySelectorAll('.v2-room')].map(rect);
  return { iframe, layout: { width: w, height: h, board, rooms } };
}

function overlayHost(root, w, h) {
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, pointerEvents: 'none' });
  root.append(host);
  return host;
}

/** A board surface (display or phone): the stage cut over the board (display, stage only), or behind the crew. */
async function mountBoard(root, { surface, variant, w, h }) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const { iframe, layout } = await boardFrame(root, { w, h });
  const host = overlayHost(root, w, h);
  const holders = artHolders(iframe.contentDocument, w, h, { film: 'blackhole-art' });
  const end = filmEnd(surface, variant);
  const seek = async t => {
    const { svg, art, frame } = overlaySvg(t, layout, { surface, variant });
    host.innerHTML = svg;
    holders.forEach((holder, i) => { holder.innerHTML = art ? scopeIds(art, `r${i}`) : ''; });
    iframe.style.transform = variant === 'stage' && frame.board && frame.board.scale !== 1 ? `scale(${frame.board.scale})` : '';
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { board: 'board-v2 mixed (synthetic)' } };
}

export const mountDisplay = (root, { variant = 'full', w = 1920, h = 1080 } = {}) => mountBoard(root, { surface: 'display', variant, w, h });
export const mountPhone = (root, { variant = 'full', w = 390, h = 844 } = {}) => {
  if (variant === 'stage') throw new Error('The stage cut is the display\'s only');
  return mountBoard(root, { surface: 'phone', variant, w, h });
};

export async function mountInsert(root, { variant = 'full', case: shot = 'titled', w = 1920, h = 1080 } = {}) {
  const host = overlayHost(root, w, h);
  const end = filmEnd('insert', 'full');
  const seek = async t => { host.innerHTML = insertSvg(t, { width: w, height: h, titled: shot !== 'textless' }).svg; await frames(); return { t, done: t >= end }; };
  return { seek, end, size: [w, h], selector: '#stage', fixture: null };
}

export const PILOT_STAGE = Object.freeze({
  id: 'blackhole', version: BLACKHOLE_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ display: mountDisplay, phone: mountPhone, insert: mountInsert }),
});

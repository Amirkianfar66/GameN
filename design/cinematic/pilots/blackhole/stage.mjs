// mothership:dev-only
//
// Pilot 2 on the cinematic stage: the board-v2 review page (synthetic, unmodified) in a frame as
// the board under the overlay, standing for the snapshot the server published at Sync, and the
// overlay at t over it. The display's frame is 1920 x 1080; a phone's w x h. The insert is the
// space shot alone. A review page's controller: no world, branch or actor exists here.

import { filmEnd, BLACKHOLE_VERSION, VARIANTS } from './film.mjs';
import { insertSvg, overlaySvg } from './compose.mjs';

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

export async function mountDisplay(root, { variant = 'full', w = 1920, h = 1080 } = {}) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const { iframe, layout } = await boardFrame(root, { w, h });
  const host = overlayHost(root, w, h);
  const end = filmEnd('display', variant);
  const seek = async t => {
    const { svg, frame } = overlaySvg(t, layout, { surface: 'display', variant });
    host.innerHTML = svg;
    iframe.style.transform = variant === 'full' && frame.board && frame.board.scale !== 1 ? `scale(${frame.board.scale})` : '';
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { board: 'board-v2 mixed (synthetic)' } };
}

export async function mountPhone(root, { variant = 'full', w = 390, h = 844 } = {}) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const { layout } = await boardFrame(root, { w, h });
  const host = overlayHost(root, w, h);
  const end = filmEnd('phone', variant);
  const seek = async t => {
    host.innerHTML = overlaySvg(t, layout, { surface: 'phone', variant }).svg;
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { board: 'board-v2 mixed (synthetic)' } };
}

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

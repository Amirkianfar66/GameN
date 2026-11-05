// mothership:dev-only
//
// Library group 2's public films on the cinematic stage (design/cinematic/stage.html?pilot=navigation
// &case=transit|arrival-blue|arrival-red): for the review gallery and the exports. The transit plays
// over the board-v2 review page (synthetic, unmodified) standing for the board under the band; the
// arrival and every insert are full frames with no board. Nothing here reads a game fact.

import { frames } from '../../cinematic/lib/stage-kit.mjs';
import { FILM_CASES, NAV_FILMS_VERSION, VARIANTS, arrivalSvg, filmEnd, transitInsert, transitOverlay } from './films.mjs';

const sideOf = name => (name === 'arrival-blue' ? 'Blue' : 'Red');
const caseOf = name => {
  const film = name ?? 'transit';
  if (!FILM_CASES.includes(film)) throw new Error(`No navigation film ${film}`);
  return film;
};

/** The board-v2 review page in a frame, measured: the board's rooms area for the band. */
async function boardFrame(root, { w, h }) {
  const iframe = document.createElement('iframe');
  iframe.title = 'Board v2 review page (synthetic)';
  Object.assign(iframe.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, border: '0' });
  iframe.src = '../board-v2/index.html?beds=4&roster=9&fixture=mixed';
  root.append(iframe);
  await new Promise(done => iframe.addEventListener('load', done, { once: true }));
  const doc = iframe.contentDocument;
  for (let i = 0; i < 200 && !doc.querySelector('.v2-board'); i += 1) await new Promise(done => setTimeout(done, 25));
  await Promise.all([...doc.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
  const b = doc.querySelector('.v2-board').getBoundingClientRect();
  return { width: w, height: h, board: { x: b.left, y: b.top, w: b.width, h: b.height } };
}
function host(root, w, h) {
  const node = document.createElement('div');
  Object.assign(node.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, pointerEvents: 'none' });
  root.append(node);
  return node;
}

async function mount(root, surface, { variant = 'full', case: name, w, h }) {
  const film = caseOf(name);
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const end = filmEnd(film, surface, variant);
  if (film === 'transit' && surface !== 'insert') {
    const layout = await boardFrame(root, { w, h });
    const layer = host(root, w, h);
    const seek = async t => { layer.innerHTML = transitOverlay(t, layout, { surface, variant }).svg; await frames(); return { t, done: t >= end }; };
    return { seek, end, size: [w, h], selector: '#stage', fixture: { board: 'board-v2 mixed (synthetic)' } };
  }
  const layer = host(root, w, h);
  const draw = film === 'transit'
    ? t => transitInsert(t, { width: w, height: h, variant }).svg
    : t => arrivalSvg(t, sideOf(film), { surface: surface === 'insert' ? 'display' : surface, width: w, height: h, variant }).svg;
  const seek = async t => { layer.innerHTML = draw(t); await frames(); return { t, done: t >= end }; };
  return { seek, end, size: [w, h], selector: '#stage', fixture: null };
}

export const mountDisplay = (root, options = {}) => mount(root, 'display', { w: 1920, h: 1080, ...options });
export const mountPhone = (root, options = {}) => mount(root, 'phone', { w: 390, h: 844, ...options });
export const mountInsert = (root, options = {}) => mount(root, 'insert', { w: 1920, h: 1080, ...options });

export const PILOT_STAGE = Object.freeze({
  id: 'navigation', version: NAV_FILMS_VERSION, variants: VARIANTS, cases: FILM_CASES,
  surfaces: Object.freeze({ display: mountDisplay, phone: mountPhone, insert: mountInsert }),
});

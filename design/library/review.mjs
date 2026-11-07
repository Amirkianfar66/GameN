// mothership:dev-only
//
// The library review pages' shared frame (from group 2 on; group 1's page keeps its own copy):
// the page's parameters, the dossier's small parts, a state card, motion players, the controls and
// the art loader. A review page draws synthetic fixtures; it is never a client.
//   ?w=390|320  the sheet width   &text=2  200% text   &motion=reduced   &only=<group>
// window.__lib = { ready, seek(kind, t), setReduced(on) } for design/tools/library-capture.mjs.

import { loadBundles } from '../prototypes/js/bundles.js';
import { el } from '../abilities/js/dossier.js';

export { el };
export const params = new URLSearchParams(location.search);
export const root = document.documentElement;
root.style.setProperty('--lib-width', `${Number(params.get('w') ?? 390)}px`);
if (params.get('text') === '2') root.dataset.text = '2';
let reduced = params.get('motion') === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
root.dataset.motion = reduced ? 'reduced' : 'full';
export const isReduced = () => reduced;

// ---------- small parts (the dossier's) ----------

export const tape = text => el('span', { class: 'lib-tape' }, text);
export const stamp = (text, extra = {}) => el('span', { class: 'ab-stamp', 'aria-hidden': 'true', ...extra }, text);
export const words = (text, cls = 'lib-words') => el('p', { class: cls }, text);
export const buttons = (...labels) => el('div', { class: 'lib-buttons' }, labels.map(label => el('button', { type: 'button', class: 'ab-button' }, label)));
export function strip(tapeText, stampText, ...children) {
  return el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, tape(tapeText), stampText ? el('span', { class: 'lib-stamp-slot' }, stamp(stampText)) : null), ...children);
}
/** One state: a phone-width sheet, its state id and the view fields that make it. */
export function card(state, fields, ...content) {
  return el('figure', { class: 'lib-card', 'data-state': state },
    el('div', { class: 'lib-card__sheet' }, ...content),
    el('figcaption', {}, el('div', { class: 'lib-card__state' }, 'state', el('b', {}, state)), el('p', { class: 'lib-card__fields' }, fields)));
}

// ---------- motion players ----------

const players = {};
/**
 * A motion player card: a stage, Play, a scrubber. `film` gives the length ({ end(reduced) }), a
 * caption, and build(stage) -> { seek(t, reduced) } that draws the frame at t.
 */
export function player(kind, title, film) {
  const stage = el('div', { class: 'lib-player__stage' });
  const range = el('input', { type: 'range', min: '0', max: String(film.end(reduced)), value: '0', step: '10', 'aria-label': `${title} time` });
  const time = el('span', {}, '0 ms');
  const play = el('button', { type: 'button' }, 'Play');
  const node = card(`motion: ${kind}`, film.caption, el('div', { class: 'lib-player' }, stage, el('div', { class: 'lib-player__controls' }, play, range, time)));
  let parts = film.build(stage);
  const seek = t => {
    const end = film.end(reduced);
    range.max = String(end);
    parts.seek(Math.min(t, end), reduced);
    range.value = String(Math.round(t));
    time.textContent = `${Math.round(Math.min(t, end))} ms`;
  };
  range.addEventListener('input', () => seek(Number(range.value)));
  play.addEventListener('click', () => {
    const start = performance.now();
    const tick = now => { const t = now - start; seek(t); if (t < film.end(reduced)) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  players[kind] = { seek, rebuild: () => { stage.replaceChildren(); parts = film.build(stage); seek(0); } };
  seek(0);
  return node;
}
const setReduced = on => { reduced = on; root.dataset.motion = on ? 'reduced' : 'full'; for (const p of Object.values(players)) p.rebuild(); };

// ---------- the page ----------

/** The prototype bundles, then each [href, mark] stylesheet; a mark joins root's data-art once its sheet has loaded. */
export async function loadArt(sheets) {
  await loadBundles(['public-board', 'player-ui', 'roles']);
  for (const [href, mark] of sheets) {
    await new Promise(resolve => {
      const link = el('link', { rel: 'stylesheet', href });
      link.addEventListener('load', () => { root.dataset.art = `${root.dataset.art ?? ''} ${mark}`.trim(); resolve(); }, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.append(link);
    });
  }
}

function controls() {
  const sel = (id, label, options, value, on) => {
    const s = el('select', { id }, options.map(([v, t]) => el('option', { value: v, selected: v === value ? true : null }, t)));
    s.addEventListener('change', () => on(s.value));
    return el('label', { for: id }, label, s);
  };
  const go = (k, v) => { const url = new URL(location.href); url.searchParams.set(k, v); location.href = url.href; };
  return el('div', { class: 'lib-controls' },
    sel('lib-w', 'Sheet width', [['390', '390 px'], ['320', '320 px']], params.get('w') ?? '390', v => go('w', v)),
    sel('lib-text', 'Text', [['1', '100%'], ['2', '200%']], params.get('text') ?? '1', v => go('text', v)),
    sel('lib-motion', 'Motion', [['full', 'Full'], ['reduced', 'Reduced']], reduced ? 'reduced' : 'full', v => setReduced(v === 'reduced')));
}

/** The page: a header, then each group ([id, title, () => cards]) unless &only= names another. */
export function mountPage({ title, intro, groups }) {
  const app = document.getElementById('lib-app');
  const only = params.get('only');
  app.replaceChildren(
    el('header', { class: 'lib-head' }, el('h1', {}, title), el('p', {}, intro), controls()),
    ...groups.filter(([id]) => !only || only === id).map(([id, heading, cards]) => el('section', { class: 'lib-group', id: `lib-${id}`, 'aria-label': heading }, el('h2', {}, heading), el('div', { class: 'lib-cards' }, cards()))),
  );
  app.removeAttribute('aria-busy');
  window.__lib = { ready: true, seek: (kind, t) => players[kind]?.seek(t), setReduced };
}

export function failed(error) {
  document.getElementById('lib-app').textContent = `Review page failed: ${error.message}`;
  window.__lib = { ready: false, error: error.message };
  throw error;
}

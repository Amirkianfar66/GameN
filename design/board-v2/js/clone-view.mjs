// mothership:dev-only
//
// The Clone's private card and films on the board-v2 review page (storyboard S3; docs/design/clone-s3.md),
// and its art on one sheet (?sheet=clone). A picture for review, not a client: no command, server, clock
// or private state exists here, and every input is a synthetic fixture (clone-fixtures.mjs). A review
// page's controller: not to be ported.
//
// The card is the Alien's own: drawn in the sheet over the Hospital and the Jail (js/turns.mjs), as its
// private claim, on the Alien's own phone alone. The board is page.js's, the same for every viewer: the
// public figure is the ordinary one, on the Alien's own phone too.
//
//   ?film=clone            the board, and on the Alien's own phone its card
//     &case=activate|expire|jailed|r5   clone-fixtures.mjs CLONE_CASES (default activate)
//     &t=<ms>              the moment, from the film's start (default 1000); with &state=, none: the card at rest
//     &state=active|ended  the card at rest, as a reconnect shows it (no film)
//     &viewer=own|player|display   the Alien's own phone (default), another player's, or the display
//     &play=1              play it again and again
//   &motion=reduced        the device's reduced-motion setting
//   &text=2                enlarged text (js/turns-view.mjs)

import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { FRAME } from '../../board-motion/figures/body.mjs';
import { CLONE, CLONE_CARD, FIGURE_SPAN, cloneBodyHeight, cloneCardLayout, halftoneSvg, markSvg, outlineSvg, scanSvg, stageSvg } from '../fx/clone.mjs';
import { cloneCard, cloneEnd, cloneFilmFor, cloneFrame, cloneWords } from '../films/clone.mjs';
import { CLONE_SEAT, cloneCase } from './clone-fixtures.mjs';
import { LOCATION_OF, turnsLayout } from './layout.mjs';
import { turnsOptions } from './turns-view.mjs';

const [, BY] = FRAME.box;
/** The scan band's height, as a share of the figure's. */
const BAND = 0.3;

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else if (value !== null && value !== undefined) node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}
const px = v => `${Number(v.toFixed(2))}px`;
const box = rect => ({ left: px(rect.left), top: px(rect.top), width: px(rect.width), height: px(rect.height) });

export const isCloneFilm = film => film === 'clone';
export const cloneCaseName = params => params.get('case') ?? 'activate';

/** The standing portrait of a seat's character in the clothes of its place (the board's own figure functions). */
const portraitSvg = (seat, prefix) => dressedFigureSvg(CREW[seat.character], skeletonOf('stand'), { outfit: outfitFor(LOCATION_OF[seat.room]), prefix });

/**
 * The card in a sheet body of the given width: its words column first (they set its height at the
 * page's text size), then its portrait window, the stage, the two places and the scan band. Returns
 * { node, layout, parts } for the frame to drive.
 */
function buildCard({ width, seat, status }) {
  const node = el('div', { class: 'v2-clone', role: 'group', 'aria-label': 'Your Clone', 'data-film': 'clone', 'data-seat': String(seat.seat), style: { width: px(width) } });
  const words = el('div', { class: 'v2-clone__words' },
    el('span', { class: 'v2-clone__stamps', 'aria-hidden': 'true' },
      el('span', { class: 'v2-clone__stamp v2-clone__stamp--active', 'data-stamp': 'active' }, 'Clone active'),
      el('span', { class: 'v2-clone__stamp v2-clone__stamp--ended', 'data-stamp': 'ended' }, 'Clone ended')),
    el('p', { class: 'v2-clone__line' }, cloneWords(status)));
  node.append(words);
  return { node, words };
}

/** Lays the card out once its words are in the page: its height, the portrait and the places. */
function layCard({ node, words, seat, width }) {
  const first = cloneCardLayout({ width });
  Object.assign(words.style, { left: px(first.words.left), top: px(first.words.top), width: px(first.words.width) });
  const height = Math.max(CLONE_CARD.height, Math.ceil(words.offsetHeight + 2 * CLONE_CARD.pad));
  const layout = cloneCardLayout({ width, height });
  node.style.height = px(height);
  Object.assign(words.style, { top: px((height - words.offsetHeight) / 2) });
  const { portrait } = layout;
  const pane = el('div', { class: 'v2-clone__portrait', 'aria-hidden': 'true', style: box(portrait) });
  node.prepend(pane);
  const stage = el('div', { class: 'v2-clone__stage', style: { left: '0px', top: '0px', width: px(portrait.width), height: px(portrait.height) } });
  pane.append(stage);
  const local = place => ({ left: place.left - portrait.left, top: place.top - portrait.top, width: place.size, height: place.size });
  const part = (name, place, inner) => {
    const div = el('div', { class: `v2-clone__part v2-clone__part--${name}`, 'data-part': name, style: box(local(place)) });
    div.innerHTML = inner;
    pane.append(div);
    return div;
  };
  const prefix = `cl${seat.seat}`;
  const figure = portraitSvg(seat, `${prefix}r`);
  const parts = {
    stage,
    real: part('real', layout.real, figure),
    outline: part('outline', layout.real, outlineSvg(figure, { prefix: `${prefix}o` })),
    halftone: part('halftone', layout.clone, ''),
    clone: part('clone', layout.clone, portraitSvg(seat, `${prefix}c`)),
    scan: el('div', { class: 'v2-clone__scan', 'data-part': 'scan' }),
  };
  pane.append(parts.scan);
  return { layout, parts, figure, prefix };
}

/** The review page's ?film=clone, on the screen the viewer gives, over the board page.js has drawn. */
export function mountClone({ app, board, roster, params }) {
  const viewer = params.get('viewer') ?? 'own';
  if (!['own', 'player', 'display'].includes(viewer)) throw new Error(`No viewer ${viewer}`);
  document.documentElement.dataset.film = 'clone';
  document.documentElement.dataset.viewer = viewer;
  // Everyone but the Alien sees the board alone: nothing of the Clone, no node, no request.
  if (viewer !== 'own') { window.__cloneFrame = { card: false, viewer }; return; }
  const reduced = params.get('motion') === 'reduced';
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  const name = params.get('case') ?? 'activate';
  const c = cloneCase(name, roster);
  const state = params.get('state');
  if (state && !['active', 'ended'].includes(state)) throw new Error(`No state ${state}`);
  // The film this case's live change starts (none at rest: a reconnect shows the card as it is).
  const film = state ? null : cloneFilmFor({ before: c.before, after: c.after, live: true });
  const status = c.after;
  const shows = cloneCard({ status, eliminated: c.own.health === 'Eliminated' });
  if (state && shows !== state) throw new Error(`The ${name} case's view shows ${shows}, not ${state}`);
  if (!state && !film) throw new Error(`The ${name} case starts no film: give &state=`);

  // The sheet over the Hospital and the Jail, as js/turns.mjs lays it out with the board: the card is its private claim.
  const options = turnsOptions(params);
  const layout = turnsLayout({ width: innerWidth, height: innerHeight }, roster, { insets: board.insets, bars: options.bars, actions: options.actions });
  if (!layout.fits || layout.board.navTop !== board.navTop || layout.board.boardTop !== board.boardTop) throw new Error('clone: the page and turns.mjs lay the board out differently');
  const { sheet } = layout;
  const BORDER = 2;
  const layer = el('div', { class: 'v2-turns', 'data-ui': 'sheet', 'data-film': 'clone' });
  app.append(layer);
  const section = el('section', { class: 'v2-sheet-ui', 'aria-label': 'Your controls', 'data-claim': 'clone', style: box(sheet) });
  // The card alone in the sheet: no command, so no actions row. Its body reaches down to a gap above the raised Pass,
  // never under it (cloneBodyHeight()); it scrolls only if the card were taller still.
  const bodyHeight = cloneBodyHeight(sheet, board.pass);
  const body = el('div', { class: 'v2-sheet-ui__body', 'data-film': 'clone', style: { left: px(sheet.body.left - sheet.left - BORDER), top: px(sheet.body.top - sheet.top - BORDER), width: px(sheet.body.width), height: px(bodyHeight) } });
  section.append(body);
  layer.append(section);
  const { node, words } = buildCard({ width: sheet.body.width, seat: c.own, status });
  body.append(node);
  const { layout: card, parts, figure, prefix } = layCard({ node, words, seat: c.own, width: sheet.body.width });
  const { portrait } = card;
  const floor = card.real.feet[1] - portrait.top;
  const span = place => ({ head: place.top - portrait.top + (FIGURE_SPAN.top - BY) * place.unit, feet: place.feet[1] - portrait.top });

  const apply = t => {
    const f = film ? cloneFrame(film, t, { reduced }) : cloneFrame(state === 'active' ? 'activate' : 'expire', Infinity, { reduced });
    node.hidden = !f.card;
    parts.stage.innerHTML = stageSvg({ width: portrait.width, height: portrait.height, real: card.real.feet[0] - portrait.left, clone: card.clone.feet[0] - portrait.left, floor, lit: f.pad, prefix: `${prefix}s` });
    parts.real.style.opacity = String(f.real.opacity);
    parts.outline.style.opacity = String(f.outline.opacity);
    parts.clone.style.opacity = String(f.clone.opacity);
    parts.halftone.style.opacity = String(f.halftone.opacity);
    parts.halftone.innerHTML = f.halftone.opacity > 0 ? halftoneSvg(figure, { density: f.halftone.density, prefix: `${prefix}h` }) : '';
    parts.halftone.dataset.density = String(f.halftone.density);
    for (const [key, value] of Object.entries(f.stamps)) {
      const stamp = node.querySelector(`[data-stamp="${key}"]`);
      stamp.style.opacity = String(value.opacity);
      stamp.style.transform = value.scale !== 1 ? `rotate(-6deg) scale(${value.scale})` : '';
    }
    // The scan band over its place: its leading edge at y of the way from the feet to the head.
    if (f.scan) {
      const place = f.scan.over === 'real' ? card.real : card.clone;
      const { head, feet } = span(place);
      const height = (feet - head) * BAND;
      const edge = feet - f.scan.y * (feet - head);
      const left = place.left - portrait.left;
      const top = f.scan.dir === 'up' ? edge : edge - height;
      Object.assign(parts.scan.style, { display: 'block', left: px(left), top: px(top), width: px(place.size), height: px(height), opacity: String(f.scan.opacity), transform: f.scan.dir === 'down' ? 'scaleY(-1)' : '' });
      parts.scan.dataset.over = f.scan.over;
      parts.scan.dataset.edge = edge.toFixed(2);
      parts.scan.innerHTML = scanSvg({ width: Math.round(place.size), height: Math.round(height), prefix: `${prefix}b` });
    } else {
      parts.scan.style.display = 'none';
      parts.scan.innerHTML = '';
    }
    node.dataset.stage = f.stage;
    document.documentElement.dataset.stage = f.stage;
    return { ...f, film, card: f.card, layout: card, sheet: { left: sheet.left, top: sheet.top, body: { ...sheet.body, height: bodyHeight }, actions: sheet.actions }, words: cloneWords(status) };
  };
  if (params.get('play') === '1' && film) {
    const startAt = performance.now();
    const length = cloneEnd(film, reduced) + 1200;
    const tick = now => { apply((now - startAt) % length); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  } else {
    window.__cloneFrame = apply(state ? Infinity : Number(params.get('t') ?? 1000));
  }
}

/** ?sheet=clone: the Clone's art for review: the card's parts for each character, the outfits, the films' frames and the tray's mark. */
export function drawCloneSheet(app) {
  const sheetNode = el('div', { class: 'v2-clone-sheet' });
  app.replaceChildren(sheetNode);
  const title = (words, x, y) => sheetNode.append(el('p', { class: 'v2-sheet__title', style: { left: px(x), top: px(y) } }, words));
  const note = (words, x, y, width) => sheetNode.append(el('p', { class: 'v2-sheet__note', style: { left: px(x), top: px(y), width: px(width) } }, words));
  const cell = (x, y, w, h, inner) => { const d = el('div', { class: 'v2-sheet__cell', style: { left: px(x), top: px(y), width: px(w), height: px(h) } }); d.innerHTML = inner; sheetNode.append(d); return d; };
  title('The Clone, privately (S3): the Alien\'s own card, never the board', 20, 14);
  note('Each character as the card draws it: itself (the duplicate, resolved, is this same drawing), its halftone duplicate forming and formed, and its dotted outline once hidden. Synthetic: any character may be the Alien.', 20, 36, 1180);
  const ids = Object.keys(CREW);
  ids.forEach((id, i) => {
    const seat = { seat: i + 1, character: id, room: 'room-a' };
    const fig = portraitSvg(seat, `sh${i}`);
    const x = 20 + (i % 3) * 400, y = 72 + Math.floor(i / 3) * 150;
    cell(x, y, 380, 140, '');
    const pieces = [fig, halftoneSvg(fig, { density: 0.45, prefix: `sh${i}h1` }), halftoneSvg(fig, { density: 1, prefix: `sh${i}h2` }), outlineSvg(fig, { prefix: `sh${i}o` })];
    pieces.forEach((svg, j) => { const d = cell(x + 6 + j * 93, y + 6, 88, 128, svg); d.style.background = CLONE.stage; });
  });
  // The outfits: the portrait is in the clothes of the Alien's place (a Jail vote can put an active Clone's Alien in the prison suit).
  const y2 = 532;
  title('Its place\'s clothes: Room A, the Jail, the Hospital', 20, y2);
  ['Room A', 'Jail', 'Hospital'].forEach((place, j) => {
    const fig = dressedFigureSvg(CREW.c3, skeletonOf('stand'), { outfit: outfitFor(place), prefix: `so${j}` });
    const d = cell(20 + j * 96, y2 + 24, 88, 128, fig); d.style.background = CLONE.stage;
    const o = cell(320 + j * 96, y2 + 24, 88, 128, outlineSvg(fig, { prefix: `so${j}o` })); o.style.background = CLONE.stage;
  });
  // The scan band, the stage and the tray's mark.
  title('The scan band, the stage, the tray\'s mark (32 and 64 px)', 640, y2);
  const band = cell(640, y2 + 24, 88, 40, scanSvg({ width: 88, height: 40, prefix: 'sb' })); band.style.background = CLONE.stage;
  cell(740, y2 + 24, 160, 104, stageSvg({ width: 160, height: 104, real: 52, clone: 112, floor: 98, lit: 1, prefix: 'ss' }));
  const m1 = cell(920, y2 + 24, 32, 32, markSvg()); m1.style.background = '#F4EBDD';
  const m2 = cell(964, y2 + 24, 64, 64, markSvg()); m2.style.background = '#F4EBDD';
  document.documentElement.dataset.sheet = 'clone';
}

export { CLONE_SEAT };

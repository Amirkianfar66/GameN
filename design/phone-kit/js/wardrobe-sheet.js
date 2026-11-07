// mothership:dev-only
//
// The review sheet of the room clothes (design/board-motion/figures/wardrobe.mjs): the nine
// characters in the crew suit, the Hospital gown and the Jail suit, front and back, and every
// place of the Hospital and the Jail in its room's clothes. Synthetic: no seat, no match.
import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { OUTFITS, dressedFigureSvg } from '../../board-motion/figures/wardrobe.mjs';

const ids = Object.keys(CREW);
const sheet = document.getElementById('sheet');
let n = 0;
function cell(id, gesture, outfit, label = '') {
  const sk = skeletonOf(gesture);
  const prefix = `w${(n += 1)}`;
  const box = document.createElement('div');
  box.className = 'sheet-cell';
  box.dataset.outfit = outfit;
  const body = document.createElement('div'); body.className = 'fig'; body.innerHTML = dressedFigureSvg(CREW[id], sk, { outfit, prefix: `${prefix}b` });
  box.append(body);
  if ((sk.front ?? []).length) {
    const prop = document.createElement('div'); prop.className = 'prop'; box.append(prop);
    const front = document.createElement('div'); front.className = 'fig'; front.innerHTML = dressedFigureSvg(CREW[id], sk, { outfit, prefix: `${prefix}f`, layer: 'front' });
    box.append(front);
  }
  if (label) { const l = document.createElement('span'); l.className = 'label'; l.textContent = label; box.append(l); }
  return box;
}
function section(title, columns, rows) {
  const s = document.createElement('section'); s.className = 'sheet-section';
  const h = document.createElement('h2'); h.textContent = title; s.append(h);
  const grid = document.createElement('div'); grid.className = 'sheet-grid'; grid.style.setProperty('--cols', String(columns.length));
  grid.append(document.createElement('span'));
  for (const c of columns) { const t = document.createElement('span'); t.className = 'sheet-head'; t.textContent = c.title; grid.append(t); }
  for (const id of rows.filter(id => !only || only.includes(id))) {
    const r = document.createElement('span'); r.className = 'sheet-row'; r.textContent = `${id} · ${CREW[id].sign}`; grid.append(r);
    for (const c of columns) grid.append(cell(id, c.gesture, c.outfit, c.label ?? ''));
  }
  s.append(grid);
  sheet.append(s);
}
const h1 = document.createElement('h1'); h1.textContent = 'Room clothes · wardrobe-0.1.0 (proposal)';
const note = document.createElement('p'); note.className = 'sheet-note';
note.textContent = 'Synthetic review sheet. Clothes follow the public location only: crew suit in the Command Room, Room A and Room B; gown in the Hospital; striped suit in the Jail. Cell colors only tell the outfits apart on this sheet.';
sheet.append(h1, note);
const query = new URLSearchParams(location.search);
const page = query.get('page') ?? 'lineup';
if (query.get('size')) document.documentElement.style.setProperty('--cell', `${Number(query.get('size'))}px`);
const only = query.get('only') ? query.get('only').split(',') : null;
if (page === 'lineup') {
  section('Lineup: front and back', OUTFITS.flatMap(outfit => [
    { title: `${outfit} · front`, gesture: 'stand', outfit },
    // The rig's standing back view is the Jail door's (J2): hands up on the door, the back of the suit or gown to us.
    { title: `${outfit} · back`, gesture: 'doorBack', outfit },
  ]), ids);
} else if (page === 'hospital') {
  section('Hospital places in the gown', ['bedSitting', 'bedLying', 'wheelchair', 'ivPole', 'benchSling+injured', 'bedSitting+still'].map(gesture => ({ title: gesture, gesture, outfit: 'gown' })), ids);
} else if (page === 'jail') {
  section('Jail places in the striped suit', ['benchHunched', 'doorBack', 'wallLean', 'floorSit', 'cotLying', 'benchHunched+injured'].map(gesture => ({ title: gesture, gesture, outfit: 'prison' })), ids);
}
window.__designReady = true;

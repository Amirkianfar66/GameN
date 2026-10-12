// mothership:dev-only
//
// The character vocabulary sheet: each of the nine characters in each of the eleven states of
// design/board-motion/contract/coverage.json, drawn live by the figure rig and the prototype's
// own stylesheet, exactly as the board draws them. Rows are characters, columns are states.
// Nothing in it is a match; every name is synthetic.

import { h } from './h.js';
import { CREW, SYNTHETIC_LABEL } from './fixtures.js';
import { loadBundles } from '../../prototypes/js/bundles.js';
import { drawFigure, pieceElement, placePiece } from './board.js';
import { STANCES } from './layout.js';
import { walkPose } from '../figures/motion.mjs';
import { FIGURE_VERSION } from '../figures/body.mjs';

const coverage = await (await fetch(new URL('../contract/coverage.json', import.meta.url))).json();
const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const STATES = coverage.vocabulary.states;
/** A cell's panel, in CSS pixels: its name band and the room kept under the feet. */
const SIZE = { width: 104, height: 132, cap: 8, pad: 6 };

function cell(character, index, state) {
  const n = index + 1;
  const piece = pieceElement({ n, character: character.id, name: NAMES[index] });
  // Each character in its own stance, as in a crowd; Eliminated lies on the deck; a move is the walk.
  let gesture = STANCES[index % STANCES.length];
  let skeleton;
  let mirror = false;
  const badges = piece.querySelector('.bm-piece__badges');
  piece.dataset.health = 'Healthy';
  let note = null;
  switch (state.id) {
    case 'pressed-focused':
      piece.dataset.target = 'eligible';
      piece.append(h('button', { type: 'button', class: 'bm-piece__target', 'data-demo': 'focus', 'aria-label': `Select Player ${n}, ${NAMES[index]}` }));
      break;
    case 'eligible':
      piece.dataset.target = 'eligible';
      piece.append(h('button', { type: 'button', class: 'bm-piece__target', tabindex: '-1', 'aria-label': `Select Player ${n}, ${NAMES[index]}` }));
      break;
    case 'selected': piece.dataset.target = 'selected'; break;
    case 'multi-selected': piece.dataset.target = 'picked'; piece.append(h('span', { class: 'bm-piece__pick' }, String((index % 4) + 1))); break;
    case 'pending': piece.dataset.target = 'pending'; note = ['pending', 'Sending']; break;
    case 'accepted-registration': note = ['registered', 'Registered']; break;
    case 'rejected-unavailable': piece.dataset.target = 'other'; note = ['not-accepted', 'Not accepted']; break;
    case 'authoritative-movement':
      // Mid-stride between rooms, as the motion director draws the walk (figures/motion.mjs).
      gesture = '*';
      skeleton = walkPose(0.22 + (index % 3) * 0.25);
      mirror = index % 2 === 1;
      break;
    case 'public-status-change': {
      const kind = ['injured', 'captain', 'jailed', 'eliminated'][index % 4];
      if (kind === 'injured') piece.dataset.health = 'Injured';
      if (kind === 'eliminated') {
        piece.dataset.health = 'Eliminated';
        piece.dataset.revealed = ['Blue', 'Red', 'Alien'][index % 3];
        badges.append(h('span', { class: 'bm-reveal' }, piece.dataset.revealed));
        gesture = 'down';
      }
      if (kind === 'captain') piece.dataset.captain = '';
      if (kind === 'jailed') piece.dataset.jailed = '';
      badges.prepend(h('span', { class: 'bm-badge', 'data-badge': kind }));
      break;
    }
    case 'active-turn': piece.dataset.active = ''; break;
    default: break;
  }
  Object.assign(piece.dataset, { kind: 'solo', gesture, mirror: String(mirror), place: 'solo' });
  drawFigure(piece.querySelector('.bm-piece__body'), piece.querySelector('.bm-piece__front'), character.id, gesture, `v${n}${state.id.replace(/[^a-z]/g, '')}`, skeleton);
  placePiece(piece, { kind: 'solo', at: [0.5, 0], depth: 1, gesture: gesture === '*' ? 'stand' : gesture, mirror }, SIZE);
  return h('td', { 'data-state': state.id },
    h('section', { class: 'bm-room bm-vocab__room', 'data-room': 'vocabulary', 'data-board': 'own', style: { width: `${SIZE.width}px`, height: `${SIZE.height}px`, '--bm-cap': `${SIZE.cap}px`, '--bm-pad': `${SIZE.pad}px` } },
      h('div', { class: 'bm-stage', 'aria-hidden': 'true' }),
      state.id === 'authoritative-movement' ? h('span', { class: 'bm-trail bm-vocab__trail', 'aria-hidden': 'true' }) : null,
      h('ol', { class: 'bm-pieces' }, piece)),
    note ? h('span', { class: 'bm-stamp bm-vocab__stamp', 'data-kind': note[0] }, note[1]) : null);
}

await loadBundles(['public-board', 'player-ui', 'roles']);
document.getElementById('app').append(
  h('header', { class: 'bm-vocab__head' },
    h('h1', null, 'Nine characters, eleven states'),
    h('p', null, `${SYNTHETIC_LABEL}. Every state is drawn by the same rules for all nine characters; only the picture differs. Full-body figures drawn live by the figure rig (owner's decisions of 9 October 2026): a crowd stance by seat number, the walk of a move, lying on the deck when Eliminated. In a room each character takes its place's gesture instead. Issue #87, ${FIGURE_VERSION}, a proposal.`)),
  h('table', { class: 'bm-vocab', 'data-board': 'own' },
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Character'), STATES.map(state => h('th', { scope: 'col' }, state.id.replace(/-/g, ' '))))),
    h('tbody', null, CREW.map((character, index) => h('tr', null, h('th', { scope: 'row' }, `${character.id} · ${character.sign}`), STATES.map(state => cell(character, index, state)))))));
document.querySelector('[data-demo="focus"]')?.focus();
for (const button of document.querySelectorAll('[data-demo="focus"]')) button.classList.add('bm-vocab__focus');
window.__designReady = true;

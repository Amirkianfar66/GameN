// mothership:dev-only
//
// The character vocabulary sheet: each of the nine characters in each of the eleven states of
// design/board-motion/contract/coverage.json, drawn by the prototype's own stylesheet. Rows are
// characters, columns are states. Nothing in it is a match; every name is synthetic.

import { h } from './h.js';
import { CREW, SYNTHETIC_LABEL } from './fixtures.js';
import { loadBundles } from '../../prototypes/js/bundles.js';

const coverage = await (await fetch(new URL('../contract/coverage.json', import.meta.url))).json();
const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const STATES = coverage.vocabulary.states;

function cell(character, index, state) {
  const n = index + 1;
  const piece = h('li', { class: 'bm-piece', 'data-seat': n, 'data-character': character.id, 'data-kind': 'stand', 'data-piece': 'standee', 'data-health': 'Healthy', style: { '--x': 0.5, '--row': 0, '--depth': 1 } },
    h('span', { class: 'bm-piece__body' }, h('span', { class: 'bm-piece__ring' }), h('span', { class: 'bm-piece__art' }), h('span', { class: 'bm-piece__turn' }), h('span', { class: 'bm-piece__badges' })),
    h('span', { class: 'bm-piece__tag' }, h('span', { class: 'bm-piece__num' }, String(n)), h('span', { class: 'bm-piece__name' }, NAMES[index])));
  const badges = piece.querySelector('.bm-piece__badges');
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
    case 'authoritative-movement': piece.dataset.demo = 'flight'; piece.style.setProperty('--settle', `${character.settle}deg`); piece.style.setProperty('--hop', `${character.hop}px`); break;
    case 'public-status-change': {
      const kind = ['injured', 'captain', 'jailed', 'eliminated'][index % 4];
      if (kind === 'injured') piece.dataset.health = 'Injured';
      if (kind === 'eliminated') { piece.dataset.health = 'Eliminated'; piece.dataset.revealed = ['Blue', 'Red', 'Alien'][index % 3]; badges.append(h('span', { class: 'bm-reveal' }, piece.dataset.revealed)); }
      if (kind === 'captain') piece.dataset.captain = '';
      if (kind === 'jailed') piece.dataset.jailed = '';
      badges.prepend(h('span', { class: 'bm-badge', 'data-badge': kind }));
      break;
    }
    case 'active-turn': piece.dataset.active = ''; break;
    default: break;
  }
  return h('td', { 'data-state': state.id },
    h('section', { class: 'bm-room bm-vocab__room', 'data-room': 'room-a', 'data-board': 'own', style: { '--cx': 512, '--cw': 600, '--edge': 600, '--at': 0.78, '--room-rows': 1, '--row-unit': '60px' } },
      h('div', { class: 'bm-stage', 'aria-hidden': 'true' }),
      state.id === 'authoritative-movement' ? h('span', { class: 'bm-trail bm-vocab__trail', 'aria-hidden': 'true' }) : null,
      h('ol', { class: 'bm-pieces' }, piece)),
    note ? h('span', { class: 'bm-stamp bm-vocab__stamp', 'data-kind': note[0] }, note[1]) : null);
}

await loadBundles(['public-board', 'player-ui', 'roles']);
document.getElementById('app').append(
  h('header', { class: 'bm-vocab__head' },
    h('h1', null, 'Nine characters, eleven states'),
    h('p', null, `${SYNTHETIC_LABEL}. Every state is drawn by the same rules for all nine characters; only the picture, and in a move each one's lift and settle, differ. Issue #87, board-motion 0.1.0, a proposal.`)),
  h('table', { class: 'bm-vocab', 'data-board': 'own' },
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Character'), STATES.map(state => h('th', { scope: 'col' }, state.id.replace(/-/g, ' '))))),
    h('tbody', null, CREW.map((character, index) => h('tr', null, h('th', { scope: 'row' }, `${character.id} · ${character.sign}`), STATES.map(state => cell(character, index, state)))))));
document.querySelector('[data-demo="focus"]')?.focus();
for (const button of document.querySelectorAll('[data-demo="focus"]')) button.classList.add('bm-vocab__focus');
window.__designReady = true;

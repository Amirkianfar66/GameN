// mothership:dev-only
//
// O–P: the ballot (Vote replaces Pass while a vote is open) and the five-second result. Both use one
// 3 × 3 roster: seat n is always cell n, so a 7- or 8-player match leaves its last cells empty rather
// than inventing players. Eligibility comes from the server's ballot (eligible voters and targets);
// the fixture below only stands in for it.

import { h, ic, pt, button, topBar, sheet, cell, stamp, pill, groupNote, toast } from './ui.mjs';
import { RESULT_ART } from '../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';
import { ROSTER, SELF, seatOf } from './fixtures.mjs';
import { game } from './screens.mjs';

/** Public status of each seat in the vote fixture (synthetic): 5 Injured in Hospital, 6 in Jail, 9 eliminated. */
const STATUS = Object.freeze({ 5: 'Injured', 6: 'In Jail', 9: 'Out' });

function eligibility(kind, roster, state) {
  const seats = ROSTER.filter(p => p.seat <= roster);
  const runoff = kind === 'captain' && state === 'runoff' ? [1, 2] : null;
  return Object.fromEntries(seats.map(p => {
    const status = STATUS[p.seat];
    let ok = status !== 'Out' && status !== 'In Jail';
    if (kind === 'captain' && status === 'Injured') ok = false;
    let note = ok ? '' : status;
    if (runoff && !runoff.includes(p.seat)) { ok = false; note = 'Not in runoff'; }
    return [p.seat, { ok, note }];
  }));
}

function grid(kind, roster, { picked = null, locked = false, state = 'open' } = {}) {
  const el = eligibility(kind, roster, state);
  // The wrap is a size container: where the text is large for the width, the 3 × 3 becomes a list (kit.css).
  return h('div.grid-wrap', h('div.grid9.vote-grid', { role: 'group', 'aria-label': kind === 'captain' ? 'Captain candidates' : 'Jail vote candidates' },
    Array.from({ length: 9 }, (_, i) => {
      const p = seatOf(i + 1);
      if (i + 1 > roster) return cell(null);
      const e = el[p.seat];
      const st = !e.ok ? 'ineligible' : picked === p.seat ? (locked ? 'confirmed' : 'selected') : locked ? 'faded' : 'available';
      return cell(p, { state: st, note: picked === p.seat ? (locked ? 'Your vote' : 'Selected') : e.note, you: p.seat === SELF, mark: picked === p.seat ? 'check' : null, go: st === 'available' ? `s=vote&kind=${kind}&roster=${roster}&state=selected` : null });
    })));
}

const RESULTS = {
  CAPTAIN_ELECTED: { kind: 'captain', tone: 'gold', piece: 'vote-captain-star', title: 'Ben is Captain', counts: { 1: 2, 2: 4, 3: 1, 4: 0, 7: 0, 8: 1 }, winner: 2, tag: 'CAPTAIN' },
  RUNOFF_REQUIRED: { kind: 'captain', tone: 'paper', piece: 'vote-tie-burst', title: 'Tie · runoff', counts: { 1: 3, 2: 3, 3: 1, 4: 0, 7: 1, 8: 0 }, tied: [1, 2], tag: 'RUNOFF' },
  NO_CAPTAIN_ELECTED: { kind: 'captain', tone: 'paper', piece: 'vote-empty-chair', title: 'No Captain', counts: { 1: 0, 2: 0, 3: 0, 4: 0, 7: 0, 8: 0 }, tag: 'NO CAPTAIN' },
  PLAYER_JAILED: { kind: 'jail', tone: 'steel', piece: 'vote-cell-bars', title: 'Gus goes to Jail', counts: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 0, 7: 5, 8: 0 }, winner: 7, tag: 'JAILED' },
  JAIL_FULL: { kind: 'jail', tone: 'steel', piece: 'vote-cell-bars', title: 'Gus chosen · Jail full', counts: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 0, 7: 5, 8: 0 }, winner: 7, tag: 'NO ROOM', sub: 'Chosen, but every Jail place is taken. Gus stays.' },
  NO_JAIL_SELECTION: { kind: 'jail', tone: 'paper', piece: 'vote-empty-cell', title: 'No one goes to Jail', counts: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 7: 3, 8: 1 }, tag: 'NO ONE', sub: 'No one reached 4 votes.' },
};

export const VOTE_SCREENS = {
  /**
   * O. The ballot. state: start (the vote has opened; Pass is now Vote) | open | selected | submitted |
   * abstained | closed | runoff | cannot.
   */
  vote(root, p) {
    const kind = p.kind ?? 'jail';
    const roster = Number(p.roster ?? 9);
    const state = p.state ?? 'open';
    const picked = ['selected', 'submitted'].includes(state) ? 1 : null;
    const locked = ['submitted', 'abstained', 'closed', 'cannot'].includes(state);
    const title = state === 'runoff' ? 'Captain runoff' : kind === 'captain' ? 'Captain election' : 'Jail vote';
    const seconds = state === 'closed' ? 0 : state === 'runoff' ? 52 : state === 'start' ? 60 : 37;
    const sub = state === 'runoff' ? 'Ava and Ben tied' : 'Your ballot is private';
    if (state === 'start') {
      game(root, {
        top: topBar({ kind: 'phase', icon: kind === 'captain' ? 'captain' : 'vote', title, sub, round: kind === 'captain' ? 2 : 3, seconds }),
        scene: { kind: 'room', room: 'room-a', active: null },
        tabs: { hero: 'vote', go: { switch: 's=board', card: 's=card&role=Doctor', panels: 's=panels', hero: `s=vote&kind=${kind}&roster=${roster}` } },
        toast: toast(`${title} open`, 'info'),
      });
      return;
    }
    const foot = locked
      ? [button(state === 'abstained' ? 'Abstained' : state === 'closed' ? 'Voting closed' : state === 'cannot' ? 'You can’t vote' : 'Ballot registered', { kind: 'secondary', disabled: true, icon: state === 'cannot' ? 'eliminated' : 'check' })]
      : [button('Abstain', { kind: 'secondary', go: `s=vote&kind=${kind}&roster=${roster}&state=abstained` }), button(picked ? `Vote for ${seatOf(picked).name}` : 'Vote', { disabled: !picked, go: `s=vote&kind=${kind}&roster=${roster}&state=submitted` })];
    const body = [
      state === 'closed' ? h('div', { style: { margin: '0 0 10px' } }, pill('Closed · result next', { icon: 'lock', tone: 'paper' })) : null,
      state === 'cannot' ? groupNote('Eliminated players don’t vote. You can still watch.') : null,
      // Above the roster, where it is seen without scrolling (not under the foot).
      state === 'abstained' ? h('div', { style: { margin: '0 0 10px' } }, pill('You abstained', { icon: 'check', tone: 'paper' })) : null,
      grid(kind, roster, { picked: state === 'abstained' ? null : picked, locked, state }),
    ];
    game(root, {
      top: topBar({ kind: 'phase', icon: kind === 'captain' ? 'captain' : 'vote', title, sub, round: kind === 'captain' ? 2 : 3, seconds }),
      scene: { kind: 'room', room: 'room-a', active: null },
      tabs: { hero: locked && state !== 'closed' && state !== 'cannot' ? 'voted' : state === 'cannot' ? 'vote-off' : 'vote', go: { switch: 's=board', card: 's=card&role=Doctor', panels: 's=panels' } },
      sheet: sheet({ title, sub: roster < 9 ? `${roster} players` : null, body, foot, detent: 'large', close: 's=room&room=room-a' }),
    });
  },

  /** P. The five-second result: the same roster with the permitted counts, the result highlighted. */
  result(root, p) {
    const outcome = p.outcome ?? 'PLAYER_JAILED';
    const r = RESULTS[outcome];
    const roster = Number(p.roster ?? 9);
    const kind = r.kind;
    const el = eligibility(kind, roster, outcome === 'RUNOFF_REQUIRED' ? 'open' : 'open');
    const voters = ROSTER.filter(x => x.seat <= roster && STATUS[x.seat] !== 'Out').length;
    const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
    const piece = h('span.piece', { html: RESULT_ART[r.piece]() });
    const head = h('div.result-head', { 'data-tone': r.tone }, piece,
      h('div', { style: { minWidth: 0 } }, h('span.result-stamp', stamp(r.tag, r.tone === 'gold' ? 'amber' : null)), h('h2', r.title), h('p', r.sub ?? (kind === 'captain' ? `${total} votes · ${voters} could vote` : `${total} votes · 4 needed of ${voters}`))));
    const cells = Array.from({ length: 9 }, (_, i) => {
      const seat = seatOf(i + 1);
      if (i + 1 > roster) return cell(null);
      const e = el[seat.seat];
      if (!e.ok) return cell(seat, { state: 'ineligible', note: e.note });
      const n = r.counts[seat.seat] ?? 0;
      const st = r.winner === seat.seat || r.tied?.includes(seat.seat) ? 'winner' : 'available';
      // The count is said once, by its badge (the owner, 10 November); the accessible name still says it.
      return cell(seat, { state: st, count: n, label: `Player ${seat.seat}, ${seat.name}, ${n} ${n === 1 ? 'vote' : 'votes'}`, you: seat.seat === SELF });
    });
    const gridEl = h('div.grid9', { role: 'group', 'aria-label': 'Result' }, cells.map(c => { if (c.tagName !== 'BUTTON') return c; const d = h('div.cell', { 'data-state': c.dataset.state, 'aria-label': c.getAttribute('aria-label') }); d.append(...c.childNodes); return d; }));
    // The head and the roster scroll together under the foot. Where the text is large for the width (the
    // Largest text on a 320 phone) the stamp goes (the headline says the same), the roster becomes a list of
    // whole names (kit.css) and the foot scrolls with the rest, so the names get the height (screens.css).
    const win = h('section.result-window', { role: 'dialog', 'aria-label': `${kind === 'captain' ? 'Captain election' : 'Jail vote'} result` },
      h('div.result-inner', h('div.result-scroll', head, h('div.result-body', gridEl)),
        h('div.result-foot', ic('lock', { filled: true }), h('span.grow', 'Ballots stay private'), h('span.result-round', `${kind === 'captain' ? 'Round 2' : 'Round 3'}`))));
    game(root, {
      top: topBar({ kind: 'phase', icon: kind === 'captain' ? 'captain' : 'jail', title: kind === 'captain' ? 'Election · result' : 'Jail vote · result', short: 'Vote result', round: kind === 'captain' ? 2 : 3, seconds: Number(p.seconds ?? 4), ring: (5 - Number(p.seconds ?? 4)) / 5, urgentAt: -1 }),
      scene: { kind: 'room', room: 'room-a', active: null },
      tabs: { hero: 'vote-off', go: { switch: 's=board', card: 's=card&role=Doctor', panels: 's=panels' } },
      overlay: [win],
    });
  },
};

// mothership:dev-only
//
// N's destinations (Promises from the top bar; Windows, Players and Round order from Panels; Settings
// and Host controls from the top bar's ⋮) and Q: offices, navigation, private talk, Scan and Code, the
// Hospital panel, Blackout, the Blackhole presentation, the eliminated phone, the match result and the
// system states. Reuses the shared components only.

import { h, ic, pt, button, iconButton, topBar, sheet, row, list, groupLabel, groupNote, cell, stamp, pill, toast, banner } from './ui.mjs';
import { paintCapsule, cardUrl } from './art.mjs';
import { HACK_ART } from '../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';
import { ROSTER, SELF, ROLE_FIXTURES, seatOf, ROOM_CODE } from './fixtures.mjs';
import { game, turnBar, measure, seatsFor } from './screens.mjs';
import { floating, targetBar, tile } from './screens-game.mjs';

const HOSTED = new URL('../../../apps/game/hosted/', import.meta.url).href;
const LIBRARY = new URL('../../../apps/game/candidates/planet-library/', import.meta.url).href;
const roomScene = (room = 'room-a', extra = {}) => ({ kind: 'room', room, ...extra });
const TAB_GO = Object.freeze({ switch: 's=board', actions: 's=actions&role=Doctor&active=7', card: 's=card&role=Doctor', panels: 's=panels' });
/** Tabs under a Panels destination (Panels shows open), and under a sheet opened from the top bar (none open). */
const panelsTabs = (extra = {}) => ({ open: 'panels', go: { ...TAB_GO, panels: null }, ...extra });
const plainTabs = (extra = {}) => ({ go: TAB_GO, ...extra });
const pick = (seat, state, note, go) => cell(seatOf(seat), { state, note, go, you: seat === SELF });
const art = (fn, cls = 'piece') => h(`span.${cls}`, { html: fn() });

// A synthetic drawing (strokes in 512 × 280), for the Windows sheets.
const sketch = (paths, colour = '#F7D886') => h('div.canvas-box', { html: `<svg viewBox="0 0 512 280" aria-hidden="true">${paths.map(d => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>` });
const ARROW = ['M80 200 C 160 120, 260 110, 380 120', 'M350 92 L 386 120 L 348 146'];
const NUMBER = ['M120 70 L 150 50 L 150 220', 'M110 220 L 190 220', 'M260 60 C 330 40, 360 120, 300 140 C 360 150, 350 240, 260 220'];
const FACE = ['M256 60 A 90 90 0 1 0 256.1 60', 'M220 120 L 222 132', 'M290 120 L 292 132', 'M210 180 C 240 205, 280 205, 305 180'];

const PROMISES = [
  ['captain', 'Captain Support', 'Next election: every ballot in which they are a candidate'],
  ['officer', 'Officer Selection', 'If you win the next election, appoint them'],
  ['jail', 'Jail Vote', 'Vote to jail a player you name at the next Jail vote'],
  ['block', 'No Jail Vote', 'Don’t vote to jail them at the next Jail vote'],
  ['room', 'Meet in Room A', 'Be in Room A when voting starts'],
  ['room', 'Meet in Room B', 'Be in Room B when voting starts'],
];

/** HACK-DECLARE-02: the sides a target may declare: its own faction, or any of the three for the Undercover and the Alien. */
export function declarableSides(role) {
  return ['Undercover', 'Alien'].includes(role) ? ['blue', 'red', 'alien'] : [(ROLE_FIXTURES[role]?.team ?? 'Blue').toLowerCase()];
}

/**
 * The four result states, one match moment each, within the lifetime quota (one given, one received).
 * pending: the election has not happened; fulfilled: the Promise was kept; not-fulfilled: the opportunity
 * came and the ballot or room differed; condition: the required opportunity never came (P23, P24).
 */
export const PROMISE_RESULTS = {
  pending: { round: 3, quota: 'Given 0/1 · Received 1/1', received: { from: 1, kind: 'Captain Support', sub: 'From Ava · next Captain election', status: 'Pending', why: 'Checked when that election is held.' } },
  fulfilled: { round: 4, quota: 'Given 1/1 · Received 0/1', given: { to: 1, kind: 'Meet in Room A', sub: 'To Ava · Round 3 voting', status: 'Fulfilled', why: 'Dev was in Room A when Round 3’s voting began.' } },
  'not-fulfilled': { round: 5, quota: 'Given 0/1 · Received 1/1', received: { from: 1, kind: 'Captain Support', sub: 'From Ava · Round 4 election', status: 'Not fulfilled', why: 'In the runoff, a ballot in which Dev was a candidate, Ava voted for Ben.' } },
  condition: { round: 5, quota: 'Given 0/1 · Received 1/1', received: { from: 1, kind: 'Captain Support', sub: 'From Ava · Round 4 election', status: 'Condition not met', why: 'Dev was a candidate in no ballot of that election.' } },
};
const promiseRow = x => row({ tag: 'div', lead: pt(seatOf(x.from ?? x.to).character, 36), title: x.kind, sub: x.sub, value: x.status === 'Fulfilled' ? pill(x.status, { icon: 'check', tone: 'amber' }) : pill(x.status) });

function routeSvg({ position = 'B1', direction = null, tie = false } = {}) {
  const P = { Start: [180, 204], Junction: [180, 164], B1: [140, 126], B2: [106, 92], 'Blue Planet': [72, 54], R1: [220, 126], R2: [254, 92], 'Red Planet': [288, 54] };
  const text = (x, y, words, anchor, colour = '#B9C4D3') => `<text x="${x}" y="${y}" fill="${colour}" font-size="12" font-weight="600" font-family="Inter, system-ui, sans-serif" text-anchor="${anchor}">${words}</text>`;
  const node = k => {
    const [x, y] = P[k]; const here = k === position; const planet = k.includes('Planet');
    const fill = planet ? (k.startsWith('Blue') ? '#2979FF' : '#E8423F') : here ? '#F1B84B' : '#34415A';
    const label = planet ? text(x, y - 22, k, 'middle', '#F4EBDD') : ['B1', 'B2'].includes(k) ? text(x - 16, y + 4, k, 'end') : ['R1', 'R2'].includes(k) ? text(x + 16, y + 4, k, 'start') : text(x + 16, y + 4, k, 'start');
    return `<g><circle cx="${x}" cy="${y}" r="${planet ? 15 : here ? 11 : 7}" fill="${fill}" stroke="#F4EBDD" stroke-width="${here ? 3 : 1.5}"/>${label}</g>`;
  };
  const line = (a, b, colour) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${colour}" stroke-width="5" stroke-linecap="round"/>`;
  const next = direction === 'Blue' && position === 'B1' ? 'B2' : null;
  return `<svg viewBox="0 0 360 224" aria-hidden="true">${line('Start', 'Junction', '#55657E')}${line('Junction', 'B1', '#2B4C80')}${line('B1', 'B2', '#2B4C80')}${line('B2', 'Blue Planet', '#2B4C80')}${line('Junction', 'R1', '#7A2E2C')}${line('R1', 'R2', '#7A2E2C')}${line('R2', 'Red Planet', '#7A2E2C')}${next ? `<line x1="${P[position][0]}" y1="${P[position][1]}" x2="${P[next][0]}" y2="${P[next][1]}" stroke="#F1B84B" stroke-width="5" stroke-dasharray="6 6" stroke-linecap="round"/>` : ''}${Object.keys(P).map(node).join('')}${tie ? text(180, 220, 'Genuine tie · the Officer chooses', 'middle', '#F1B84B') : ''}</svg>`;
}

export const MORE_SCREENS = {
  // ── N. Promises ───────────────────────────────────────────────────────
  /** state: list | kinds | confirm | offered | incoming | results */
  promises(root, p) {
    const state = p.state ?? 'list';
    let body, foot = null, title = 'Promises', back = null;
    if (state === 'kinds') {
      title = 'Offer to Ava'; back = 's=promises&state=list';
      body = [groupNote('Only during your private talk. It counts once Ava accepts.'), h('div', { style: { height: '10px' } }),
        h('div.tiles', { style: { gridTemplateColumns: 'repeat(2, 1fr)' } }, PROMISES.map(([icon, label, sub], i) => h('button.tile', { type: 'button', 'data-state': i === 4 ? 'selected' : 'available', 'data-go': 's=promises&state=confirm', style: { minHeight: '118px' } },
          h('span.tile-icon', ic(icon, { filled: true })), h('b', label), h('small', sub))))];
      foot = [button('Next', { go: 's=promises&state=confirm' })];
    } else if (state === 'confirm') {
      title = 'Check the terms'; back = 's=promises&state=kinds';
      body = [h('article.comic', { style: { padding: '14px' } }, h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, h('span.tile-icon', { style: { width: '42px', height: '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--ink)', color: 'var(--paper)' } }, ic('room', { filled: true })), h('b', { style: { font: '800 1.25rem/1 var(--font-letter)', letterSpacing: '0.04em', textTransform: 'uppercase' } }, 'Meet in Room A')),
        h('p', { style: { margin: '10px 0 0', font: '500 1rem/1.4 var(--font-ui)' } }, 'Dev will be in Room A when Round 3’s voting begins.')),
        h('ul.facts', h('li', ic('info', { filled: true }), h('span', 'Uses your one given Promise only if Ava accepts')), h('li', ic('lock', { filled: true }), h('span', 'Only you and Ava see it')))];
      foot = [button('Back', { kind: 'secondary', go: 's=promises&state=kinds' }), button('Offer', { go: 's=promises&state=offered' })];
    } else if (state === 'incoming') {
      title = 'Offer from Ava';
      body = [h('article.comic', { style: { padding: '14px' } }, h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, pt(seatOf(1).character, 42), h('b', { style: { font: '800 1.25rem/1 var(--font-letter)', letterSpacing: '0.04em', textTransform: 'uppercase' } }, 'Captain Support')),
        // P23: every ballot of the specified election in which the recipient is a candidate; never a candidate is Condition not met.
        h('p', { style: { margin: '10px 0 0', font: '500 1rem/1.4 var(--font-ui)' } }, 'Ava votes for Dev at the next Captain election: in every ballot of that election in which the recipient is a candidate.')),
        h('ul.facts', h('li', ic('info', { filled: true }), h('span', 'If Dev is a candidate in no ballot of that election, the result is Condition not met')), h('li', ic('info', { filled: true }), h('span', 'Accepting uses your one received Promise')), h('li', ic('info', { filled: true }), h('span', 'A Promise is never forced: it is checked against real ballots')))];
      foot = [button('Decline', { kind: 'secondary', go: 's=promises&state=list' }), button('Accept', { go: 's=promises&state=results' })];
    } else if (state === 'results') {
      // A player gives at most one Promise and receives at most one in a match, so a phone's results hold at
      // most two. Each scenario (case) is a separate match moment, one per result state (P23, P24).
      const R = PROMISE_RESULTS[p.case ?? 'pending'] ?? PROMISE_RESULTS.pending;
      title = 'Promises';
      body = [
        list(row({ tag: 'div', icon: 'promise', tint: 'amber', title: 'Your quota', value: R.quota })),
        groupLabel('Received'), R.received ? [list(promiseRow(R.received)), groupNote(R.received.why)] : groupNote('No Promise received.'),
        groupLabel('Given'), R.given ? [list(promiseRow(R.given)), groupNote(R.given.why)] : groupNote('No Promise given.'),
        groupNote('“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying.'),
      ];
      game(root, { top: turnBar({ active: 7, seconds: 42, round: R.round, open: 'promises' }), scene: roomScene(), tabs: plainTabs(), sheet: sheet({ title, body, close: 's=room&room=room-a', detent: 'large' }) });
      return;
    } else {
      body = [
        list(row({ tag: 'div', icon: 'promise', tint: 'amber', title: 'Your quota', value: 'Given 0/1 · Received 0/1' })),
        state === 'offered' ? [groupLabel('Waiting for Ava'), list(row({ tag: 'div', lead: pt(seatOf(1).character, 36), title: 'Meet in Room A', sub: 'Offered to Ava · not counted yet', value: pill('Offered') }))] : null,
        groupLabel('With Ava · talking now'),
        list(row({ icon: 'plus', tint: 'paper', title: 'Offer a Promise', sub: 'Six kinds · exact terms', chevron: true, go: 's=promises&state=kinds' }),
          row({ icon: 'inbox', tint: 'amber', title: 'Ava offered you one', sub: 'Captain Support', chevron: true, go: 's=promises&state=incoming' })),
      ];
    }
    game(root, { top: topBar({ kind: 'pair', pair: [seatOf(1), seatOf(SELF)], sub: 'Private talk', round: 3, seconds: 41, open: 'promises' }), scene: roomScene(), tabs: plainTabs(), sheet: sheet({ title, body, foot, back, close: 's=room&room=room-a', detent: 'large' }) });
  },

  // ── N. Windows ────────────────────────────────────────────────────────
  /** state: view | draw | shown | none */
  windows(root, p) {
    const state = p.state ?? 'view';
    let body, foot = null;
    if (state === 'none') body = [h('div.wait', h('span.big-icon', ic('window')), h('h2', { style: { fontSize: '1.25rem' } }, 'No window here'), h('p', 'The Command Room has no window'))];
    else if (state === 'draw' || state === 'shown') {
      body = [
        h('div.section-head', h('h3', 'Room A ↔ Hospital'), h('span', 'Your station · A2')),
        state === 'shown' ? [h('div', { style: { position: 'relative' } }, sketch(NUMBER), h('span', { style: { position: 'absolute', right: '10px', top: '10px' } }, stamp('SHOWN', 'amber'))), h('div.drawing-meta', h('span', '2 · Dev · Round 3'), h('span', 'Can’t be changed'))]
          : [sketch(['M120 70 L 150 50 L 150 220', 'M110 220 L 190 220']), h('div.swatches', { role: 'radiogroup', 'aria-label': 'Ink' }, ['#F7D886', '#F4EBDD', '#57BBA8', '#C2408F'].map((c, i) => h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(i === 0), 'aria-pressed': String(i === 0), 'aria-label': ['Gold', 'Paper', 'Teal', 'Pink'][i], style: { background: c } })),
            h('span', { style: { flex: 1 } }), iconButton('retry', 'Undo stroke'), iconButton('close', 'Clear drawing'))],
        groupLabel('Shown this round'),
        h('div', sketch(ARROW, '#F4EBDD'), h('div.drawing-meta', h('span', '1 · Eli · Round 3'), h('span', 'Unverified'))),
      ];
      foot = state === 'shown' ? [button('Done', { kind: 'secondary', go: 's=windows&state=view' })] : [button('Show', { icon: 'show', go: 's=windows&state=shown' })];
    } else {
      body = [
        h('div.section-head', h('h3', 'Room A ↔ Room B'), h('span', 'Ends with the round')),
        h('div', sketch(FACE, '#57BBA8'), h('div.drawing-meta', h('span', '1 · Hana · Round 3'), h('span', 'Unverified'))),
        h('div', { style: { height: '12px' } }),
        h('div.section-head', h('h3', 'Room A ↔ Hospital'), h('span', 'Ends with the round')),
        h('div', sketch(ARROW, '#F4EBDD'), h('div.drawing-meta', h('span', '1 · Eli · Round 3'), h('span', 'Unverified'))),
      ];
    }
    game(root, { top: turnBar(), scene: roomScene(), tabs: panelsTabs(), sheet: sheet({ title: 'Windows', body, foot, back: 's=panels', close: 's=room&room=room-a', detent: 'large' }) });
  },

  // ── N. Settings (the top bar's ⋮), Players, Round order, Host controls ──
  /** The settings menu (⋮, beside the clock): this phone's display and, for the host, Host controls. */
  settings(root, p) {
    const text = p.size ?? '1';
    const host = p.host === '1' && p.from !== 'menu';
    const keep = `${p.from ? `&from=${p.from}` : ''}${host ? '&host=1' : ''}`;
    const display = [
      list(row({ tag: 'div', icon: 'motion', tint: 'steel', title: 'Reduce motion', sub: 'Films become stills; no shake or travel', trail: h('button.switch', { type: 'button', role: 'switch', 'aria-checked': p.reduced === '1' ? 'true' : 'false', 'aria-label': 'Reduce motion', 'data-go': `s=settings&reduced=${p.reduced === '1' ? '0' : '1'}${keep}` }) })),
      groupLabel('Text size'),
      h('div.seg', { role: 'radiogroup', 'aria-label': 'Text size' }, [['1', 'Standard'], ['1.5', 'Large'], ['2', 'Largest']].map(([v, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(text === v), 'data-go': `s=settings&size=${v}${keep}` }, l))),
      groupNote('These stay on this phone. They never change the match.'),
    ];
    if (p.from === 'menu') { root.append(h('div.screen', h('div.nav-bar', h('button.btn.btn-plain', { type: 'button', 'data-go': 's=menu' }, ic('chevronLeft'), h('span', 'Menu')), h('h1', 'Display'), h('span.spacer')), ...display)); return; }
    const body = [groupLabel('Display'), ...display,
      host ? [groupLabel('Host'), list(row({ icon: 'host', tint: 'amber', title: 'Host controls', sub: 'Bots, deadlines, recovery, abort', chevron: true, go: 's=host-controls' }))] : null];
    game(root, { top: turnBar({ open: 'menu' }), scene: roomScene(), tabs: plainTabs(), sheet: sheet({ title: 'Settings', body, close: 's=room&room=room-a' }) });
  },

  players(root) {
    const seats = seatsFor();
    const status = s => s.health === 'Injured' ? 'Injured' : s.health === 'Eliminated' ? 'Eliminated' : s.jailed ? 'In Jail' : null;
    const body = [list(seats.map(s => row({ tag: 'div', lead: pt(s.character, 36), title: `${s.seat} · ${s.seat === SELF ? `${s.name} (you)` : s.name}`, sub: [s.location, status(s)].filter(Boolean).join(' · '),
      trail: h('span', { style: { display: 'inline-flex', gap: '4px' } }, s.seat === 2 ? pill('Captain', { icon: 'captain', tone: 'paper' }) : null, s.seat === 3 ? pill('Officer', { icon: 'officer', tone: 'paper' }) : null) }))),
    groupNote('Public facts only: seats, rooms, health and offices.')];
    game(root, { top: turnBar(), scene: roomScene(), tabs: panelsTabs(), sheet: sheet({ title: 'Players', body, back: 's=panels', close: 's=room&room=room-a', detent: 'large' }) });
  },

  rules(root) {
    const steps = [['hourglass', 'Before turns', '15 s · Officer block, Blackhole'], ['actions', 'Turns', '60 s each · private talk after a turn'], ['blackhole', 'Ship synchronized', '6 s · only after a Blackhole'], ['vote', 'Jail vote', '60 s, then 5 s result'], ['dark', 'Blackout', '5 s lit, 10 s dark'], ['course', 'Navigation', '15 s, then the offices acknowledge']];
    game(root, { top: turnBar(), scene: roomScene(), tabs: panelsTabs(), sheet: sheet({ title: 'Round order', body: [list(steps.map(([i, t, s]) => row({ tag: 'div', icon: i, tint: 'steel', title: t, sub: s }))), groupNote('Current order. The owner’s Blackout-before-voting order is an Integration proposal, pending the rules update.')], back: 's=panels', close: 's=room&room=room-a', detent: 'large' }) });
  },

  'host-controls'(root, p) {
    const state = p.state ?? 'list';
    let body, foot = null;
    if (state === 'code') {
      body = [h('div.code-card', h('div.code-label', 'Recovery for Player 4 · Dev'), h('div', { style: { margin: '10px 0 4px', font: '600 0.875rem/1.3 var(--font-ui)', color: 'var(--text-secondary)' } }, 'Match ID'),
        h('div', { style: { font: '700 1.125rem/1.2 ui-monospace, monospace', color: 'var(--paper)' } }, 'mtch-8f2c4e'),
        h('div', { style: { margin: '12px 0 4px', font: '600 0.875rem/1.3 var(--font-ui)', color: 'var(--text-secondary)' } }, 'Code'),
        h('div', { style: { font: '700 1rem/1.4 ui-monospace, monospace', color: 'var(--paper)', wordBreak: 'break-all' } }, p.reveal === '1' ? 'q7Hc2-Lm9xT-4ZpWd-8rVnK-2bYs6-Jt' : '•••••• •••••• •••••• •••••• ••••••'),
        h('div.meta', ic('timer'), h('span', 'Works once · 15 minutes'))),
      groupNote('Show it only to Player 4. It never appears on the shared display.')];
      foot = [button(p.reveal === '1' ? 'Hide' : 'Reveal', { kind: 'secondary', icon: p.reveal === '1' ? 'hide' : 'show', go: `s=host-controls&state=code${p.reveal === '1' ? '' : '&reveal=1'}` }), button('Copy', { icon: 'copy', go: 's=host-controls&state=code&copied=1' })];
    } else if (state === 'abort') {
      body = [h('div.wait', h('span.big-icon', ic('warning', { filled: true })), h('h2', { style: { fontSize: '1.25rem' } }, 'Abort the match?'), h('p', 'It ends now for everyone, with no winner.'))];
      foot = [button('Keep playing', { kind: 'secondary', go: 's=host-controls' }), button('Abort match', { kind: 'warn', go: 's=end&winner=aborted' })];
    } else {
      body = [list(row({ icon: 'timer', tint: 'steel', title: 'Check the deadline', sub: 'Asks the server to move on if time is up' }), row({ icon: 'bot', tint: 'steel', title: 'Run bots', sub: 'Bots act if they can' })),
        groupLabel('Recovery codes'),
        list(ROSTER.slice(0, 5).map(s => row({ lead: pt(s.character, 36), title: `${s.seat} · ${s.name}`, sub: 'New code', chevron: true, go: 's=host-controls&state=code' }))),
        h('div', { style: { height: '14px' } }),
        list(row({ icon: 'warning', tint: 'paper', title: 'Abort match', sub: 'Ends with no winner', chevron: true, go: 's=host-controls&state=abort' }))];
    }
    game(root, { top: turnBar({ open: 'menu' }), scene: roomScene(), tabs: plainTabs(), sheet: sheet({ title: state === 'code' ? 'Recovery code' : 'Host controls', sub: state === 'code' ? 'Private to this phone' : null, body, foot, back: state === 'list' ? 's=settings&host=1' : 's=host-controls', close: 's=room&room=room-a', detent: 'large' }) });
    if (p.copied === '1') root.append(toast('Copied'));
  },

  // ── Q. Captain and Officer ────────────────────────────────────────────
  /** state: appoint | waiting | console | release | eject | used */
  captain(root, p) {
    const state = p.state ?? 'console';
    if (state === 'appoint' || state === 'waiting') {
      const eligible = new Set([1, 3, 4, 7, 8]);
      const body = state === 'waiting'
        ? [h('div.wait', pt(seatOf(2).character, 76), h('h2', { style: { fontSize: '1.25rem' } }, 'Ben is choosing an Officer'), h('p', 'Chosen at random if time runs out'))]
        : [h('div.grid9', Array.from({ length: 9 }, (_, i) => { const s = i + 1; return s === 4 ? pick(s, 'ineligible', 'You are Captain') : eligible.has(s) ? pick(s, s === 3 ? 'selected' : 'available', s === 3 ? 'Selected' : '', 's=captain&state=appoint') : pick(s, 'ineligible', s === 5 ? 'Injured' : s === 6 ? 'In Jail' : s === 9 ? 'Out' : 'In Hospital'); }))];
      game(root, { top: topBar({ kind: 'phase', icon: 'officer', title: state === 'waiting' ? 'New Officer' : 'Appoint Officer', sub: state === 'waiting' ? 'Ben chooses' : 'Random if time runs out', round: 2, seconds: 22 }), scene: roomScene('command-room', { fixture: { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'] }, active: null, offices: { captain: 4 } } }), tabs: { hero: 'pass-off', go: {} },
        sheet: sheet({ title: state === 'waiting' ? 'Officer appointment' : 'Choose your Officer', body, foot: state === 'waiting' ? null : [button('Appoint Cleo', { icon: 'officer' })], detent: 'large', close: false }) });
      return;
    }
    const plates = (release, eject) => h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
      [['release', 'Release', release], ['eject', 'Eject', eject]].map(([k, l, st]) => h(st === 'available' ? 'button.tile' : 'div.tile', { type: st === 'available' ? 'button' : null, 'data-state': st === 'available' ? 'available' : st === 'used' ? 'spent' : 'unavailable', 'data-go': st === 'available' ? `s=captain&state=${k}` : null, style: { minHeight: '150px' } },
        h('img', { src: `${HOSTED}board-v2-film-art/captain/plate-${k}-${st}.svg`, alt: '', style: { width: '100%', maxWidth: '140px', height: '78px', objectFit: 'contain' } }), h('b', l), h('small', st === 'available' ? 'Once a match' : st === 'used' ? 'Used' : 'No one in Jail'))));
    if (state === 'release' || state === 'eject') {
      const release = state === 'release';
      const body = [h('div.confirm-who', h('span.tile-icon', ic(release ? 'release' : 'eject', { filled: true })), h('div', h('b', release ? 'Release the Jail' : 'Eject the Jail'), h('span', 'Fay and Ike are in Jail'))),
        h('ul.facts', h('li', ic('info', { filled: true }), h('span', 'Once a match, on your turn in the Command Room')), h('li', ic('info', { filled: true }), h('span', release ? 'Frees everyone physically in Jail now' : 'Ejects everyone physically in Jail now')), h('li', ic('info', { filled: true }), h('span', 'Hospital detention is not affected')))];
      game(root, { top: turnBar({ active: SELF, seconds: 33 }), scene: roomScene('command-room', { fixture: { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'], 6: ['Jail', 'J1'], 9: ['Jail', 'J2'] }, active: SELF, offices: { captain: 4, officer: 3 } } }), tabs: { hero: 'pass' }, sheet: sheet({ title: 'Captain console', body, foot: [button('Cancel', { kind: 'secondary', go: 's=captain&state=console' }), button(release ? 'Release' : 'Eject', { kind: release ? 'primary' : 'warn' })], close: false }) });
      return;
    }
    const used = state === 'used';
    game(root, { top: turnBar({ active: SELF, seconds: 44 }), scene: roomScene('command-room', { fixture: { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'], 6: ['Jail', 'J1'], 9: ['Jail', 'J2'] }, active: SELF, offices: { captain: 4, officer: 3 } } }), tabs: { hero: 'pass', open: 'actions' },
      sheet: sheet({ title: 'Captain console', sub: 'Command Room · your turn', body: [plates(used ? 'used' : 'available', used ? 'unavailable' : 'available'), groupNote('Each command works once a match, whoever is Captain.')], close: 's=room&room=command-room&state=own' }) });
  },

  /** Officer's movement block in the 15 s before turns. state: pick | done | others */
  officer(root, p) {
    const state = p.state ?? 'pick';
    if (state === 'others') {
      game(root, { top: topBar({ kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Turns start at 0:00', round: 3, seconds: 9 }), scene: roomScene('room-a', { active: null, blocked: 7 }), tabs: { hero: 'pass-off' } });
      return;
    }
    const body = state === 'done'
      ? [h('div.registered', stamp('BLOCKED', 'amber'), h('p', 'Gus can’t move this round'), h('p', 'Everyone sees the block'))]
      : [h('div.grid9', Array.from({ length: 9 }, (_, i) => { const s = i + 1; return s === 9 ? pick(s, 'ineligible', 'Out') : s === 8 ? pick(s, 'ineligible', 'Blocked last round') : pick(s, s === 7 ? 'selected' : 'available', s === 7 ? 'Selected' : '', 's=officer&state=pick'); }))];
    game(root, { top: topBar({ kind: 'phase', icon: 'officer', title: 'Block a move', sub: 'Before turns · Officer', round: 3, seconds: 11 }), scene: roomScene('room-b', { fixture: { place: { 4: ['Room B', 'B4'] }, active: null, offices: { captain: 2, officer: 4 } } }), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: 'Block movement', sub: 'Optional · once a round', body, foot: state === 'done' ? null : [button('Skip', { kind: 'secondary' }), button('Block Gus', { icon: 'block', go: 's=officer&state=done' })], detent: 'large', close: false }) });
  },

  // ── Q. Navigation (private to the offices; neutral for everyone else) ─
  /** state: public | route | tie | confirm | moved */
  nav(root, p) {
    const state = p.state ?? 'public';
    if (state === 'public' || state === 'moved') {
      root.append(h('div', { style: { position: 'absolute', inset: '0', backgroundImage: `url("${LIBRARY}transit.poster.webp")`, backgroundSize: 'cover', backgroundPosition: 'center' } }));
      root.append(topBar({ kind: 'phase', icon: 'course', title: state === 'moved' ? 'The ship moved' : 'Setting course', sub: state === 'moved' ? 'Round 3 complete' : 'The offices are setting it', round: 3, seconds: state === 'moved' ? null : 11 }));
      root.append(h('div', { style: { position: 'absolute', left: '16px', right: '16px', bottom: 'calc(var(--safe-b) + 24px)', textAlign: 'center' } }, pill(state === 'moved' ? 'One step on the route · destination hidden' : 'Same 15 seconds every round', { icon: 'course', tone: 'paper' })));
      return;
    }
    const isOfficer = state === 'tie';
    const body = [h('div.route', { html: routeSvg({ position: 'B1', direction: state === 'confirm' ? 'Blue' : null, tie: state === 'tie' }), 'aria-label': 'Route: the ship is at B1 on the Blue arm' }),
      state === 'route' ? list(row({ tag: 'div', icon: 'course', tint: 'slate', title: 'Position', value: 'B1' }), row({ tag: 'div', icon: 'direction', tint: 'slate', title: 'Next move', value: 'Being set' })) : null,
      state === 'tie' ? [groupNote('A genuine tie. Choose the direction; no choice means a random draw.'), h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' } }, button('Blue', { kind: 'secondary', icon: 'planet' }), button('Red', { kind: 'secondary', icon: 'planet' }))] : null,
      state === 'confirm' ? list(row({ tag: 'div', icon: 'direction', tint: 'amber', title: 'Next move', value: 'Blue · to B2' }), row({ tag: 'div', icon: 'acknowledge', tint: 'slate', title: 'Acknowledge', sub: 'You can’t change or veto it' })) : null];
    game(root, { top: topBar({ kind: 'phase', icon: 'course', title: 'Setting course', sub: isOfficer ? 'Officer · private' : 'Captain · private', round: 3, seconds: state === 'confirm' ? 13 : 9 }), scene: roomScene('command-room', { fixture: { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'] }, active: null, offices: { captain: 4, officer: 3 } } }), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: 'Navigation', sub: 'Only the Captain and Officer see this', body, foot: state === 'confirm' ? [button('Acknowledge', { icon: 'acknowledge' })] : null, detent: 'large', close: false }) });
  },

  // ── Q. Private talk (Hack) ────────────────────────────────────────────
  /** stage: declare | result | talk | waiting */
  talk(root, p) {
    const stage = p.stage ?? 'talk';
    const pair = [seatOf(1), seatOf(SELF)];
    const top = topBar({ kind: 'pair', pair, sub: stage === 'declare' ? 'Private talk · declare' : stage === 'result' ? 'Private talk · claim' : 'Private talk', round: 3, seconds: stage === 'declare' ? 12 : stage === 'result' ? 4 : 47 });
    if (stage === 'talk' || stage === 'waiting') {
      root.append(h('div.scene.vt-capsule'));
      root.append(top);
      const dims = measure(root);
      const host = h('div', { style: { position: 'absolute', left: '0', top: `${dims.top}px`, width: `${dims.width}px`, height: `${dims.height - dims.top}px` } });
      root.querySelector('.scene').append(host);
      paintCapsule(host, { width: dims.width, height: dims.height - dims.top, pair: [1, SELF], seats: seatsFor(), busy: true, self: SELF, ambient: true });
      root.append(h('div.menu-actions', { style: { gap: '10px' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, button('Promises', { kind: 'secondary', icon: 'promise', go: 's=promises&state=list' }), button('My card', { kind: 'secondary', icon: 'card', go: 's=card&role=Doctor' }))));
      return;
    }
    const declare = stage === 'declare';
    // HACK-DECLARE-02: the same three side controls for every role. A role that must declare its own side
    // finds the other two disabled, on its own phone only; Undercover and Alien may claim any side.
    const role = p.role ?? 'Doctor';
    const allowed = declarableSides(role);
    const bluff = allowed.length > 1;
    const chosen = p.side ?? (ROLE_FIXTURES[role]?.team ?? 'Blue').toLowerCase();
    const word = s => s[0].toUpperCase() + s.slice(1);
    const body = declare
      ? [h('div.confirm-who', pt(seatOf(1).character, 56), h('div', h('b', 'Ava asked to talk'), h('span', 'Declare a side. It is a claim, not a check.'))),
        h('div.declare-sides', { role: 'radiogroup', 'aria-label': 'Side to declare' }, ['blue', 'red', 'alien'].map(s => {
          const ok = allowed.includes(s);
          return h('button.tile', { type: 'button', role: 'radio', 'aria-checked': String(ok && s === chosen), 'aria-disabled': ok ? null : 'true', 'data-state': !ok ? 'unavailable' : s === chosen ? 'selected' : 'available', 'data-go': ok ? `s=talk&stage=declare&role=${encodeURIComponent(role)}&side=${s}` : null },
            art(HACK_ART[`hack-side-${s}`], 'hack-card'), h('b', word(s)), ok ? null : h('small', ic('lock', { filled: true }), 'Not for your role'));
        })),
        groupNote(bluff ? 'Your role may claim any side. Only you see this.' : `Your role declares its own side: ${word(allowed[0])}. Only you see this.`)]
      : [h('div.confirm-who', pt(seatOf(SELF).character, 56), h('div', h('b', 'Dev claims Blue'), h('span', 'Unverified · only Ava sees this'))), h('div', { style: { maxWidth: '160px', margin: '6px auto 0' } }, art(HACK_ART['hack-side-blue'], 'hack-card'))];
    game(root, { top, scene: roomScene('room-a', { active: null }), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: declare ? 'Declare your side' : 'Ava sees your claim', body, foot: declare ? [button(`Declare ${word(chosen)}`, { icon: 'declare' })] : null, close: false }) });
    root.querySelectorAll('.hack-card svg').forEach(svg => { svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block'; });
  },

  // ── Q. Scan and Code (Hacker) ─────────────────────────────────────────
  /** state: target | guess | result | wrong */
  scan(root, p) {
    const state = p.state ?? 'target';
    if (state === 'target') {
      game(root, { top: turnBar({ active: SELF, seconds: 40 }), scene: roomScene('room-a', { active: SELF, targets: [1, 4, 7, 9], picked: [] }), tabs: { hero: 'pass' },
        overlay: [targetBar('scan', 'Scan', 'Choose a player in your room', { cancel: 's=actions&role=Hacker&active=4' })] });
      return;
    }
    const body = state === 'guess'
      ? [h('div.confirm-who', pt(seatOf(7).character, 56), h('div', h('b', 'Scan Gus'), h('span', 'Guess a side. A wrong guess also blocks your next round.'))),
        h('div.seg', { role: 'radiogroup', 'aria-label': 'Guess', style: { marginTop: '6px' } }, ['Blue', 'Red', 'Alien'].map((s, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(i === 0) }, s)))]
      : state === 'result'
        ? [h('div.registered', stamp('MATCHED', 'amber'), h('p', 'Gus · Blue guess'), list(row({ tag: 'div', icon: 'code', tint: 'paper', title: 'In the Code', value: 'Yes' })))]
        : [h('div.registered', stamp('NO MATCH'), h('p', 'Gus · Red guess'), list(row({ tag: 'div', icon: 'lock', tint: 'steel', title: 'Scan', value: 'Blocked in Round 4' })))];
    game(root, { top: turnBar({ active: SELF, seconds: 34 }), scene: roomScene('room-a', { active: SELF, targets: [7], picked: [7] }), tabs: { hero: 'pass' },
      sheet: sheet({ title: 'Scan', sub: 'Only on this phone', body, foot: state === 'guess' ? [button('Cancel', { kind: 'secondary', go: 's=scan&state=target' }), button('Scan', { icon: 'scan', go: 's=scan&state=result' })] : [button('Done', { kind: 'secondary' })], close: false }) });
  },

  /** state: pick | confirm | correct | wrong */
  code(root, p) {
    const state = p.state ?? 'pick';
    const picks = [2, 5, 6, 8];
    const body = state === 'pick' || state === 'confirm'
      ? [h('div.grid9', Array.from({ length: 9 }, (_, i) => { const s = i + 1; const k = picks.indexOf(s); return cell(seatOf(s), { state: k >= 0 ? 'selected' : 'available', note: k >= 0 ? `Pick ${k + 1}` : '', you: s === SELF, mark: k >= 0 ? 'check' : null }); })),
        groupNote(state === 'confirm' ? 'One attempt for the whole match. It can’t be retried.' : 'Choose four players. Order doesn’t matter.')]
      : state === 'correct'
        ? [h('div.registered', stamp('CODE CORRECT', 'amber'), h('p', 'Hack Spaceship is unlocked'), h('p', 'Using it is a separate action on your turn'))]
        : [h('div.registered', stamp('CODE WRONG'), h('p', 'Your one attempt is used'), h('p', 'Scan stays available'))];
    game(root, { top: turnBar({ active: 7, seconds: 28 }), scene: roomScene(), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: 'Final Code', sub: 'Only on this phone', body, foot: state === 'pick' ? [button('Next', { go: 's=code&state=confirm' })] : state === 'confirm' ? [button('Back', { kind: 'secondary', go: 's=code&state=pick' }), button('Submit Code', { icon: 'code', go: 's=code&state=correct' })] : [button('Done', { kind: 'secondary' })], detent: 'large', close: false }) });
  },

  // ── Q. Hospital panel (patient-private) ───────────────────────────────
  /** state: enter | entered | queued | wrong | unavailable | spent */
  panel(root, p) {
    const state = p.state ?? 'enter';
    const keypad = digit => h('div', h('div.display-num', { 'aria-live': 'polite' }, digit ?? '_'), h('div.keypad', Array.from({ length: 9 }, (_, i) => h('button.key', { type: 'button', 'aria-pressed': String(digit === String(i + 1)), 'data-go': `s=panel&state=entered` }, String(i + 1)))));
    const body = state === 'enter' || state === 'entered'
      ? [keypad(state === 'entered' ? '3' : null), groupNote('One attempt: the Doctor’s player number.')]
      : state === 'queued' ? [h('div.registered', stamp('REGISTERED', 'amber'), h('p', 'Your request is queued for Rescue'), h('p', 'Nothing happens until then'))]
        : state === 'wrong' ? [h('div.registered', stamp('WRONG NUMBER'), h('p', 'Your attempt is used'))]
          : state === 'spent' ? [h('div.registered', h('span.big-icon', ic('lock', { filled: true })), h('p', 'Your attempt is used'))]
            : [h('div.registered', h('span.big-icon', ic('panel')), h('p', 'The panel is unavailable right now'))];
    game(root, { top: turnBar({ active: 7, seconds: 25 }), scene: roomScene('hospital'), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: 'Hospital panel', sub: 'Only on this phone', body, foot: state === 'entered' ? [button('Submit 3', { icon: 'panel', go: 's=panel&state=queued' })] : null, detent: 'large', close: 's=room&room=hospital' }) });
  },

  // ── Q. Blackout ───────────────────────────────────────────────────────
  /** state: lit | dark | pick | chosen. Identical for everyone except the Disabler's own position picker. */
  blackout(root, p) {
    const state = p.state ?? 'lit';
    const dark = state !== 'lit';
    const disabler = state === 'pick' || state === 'chosen';
    game(root, {
      top: topBar({ kind: 'phase', icon: dark ? 'dark' : 'lit', title: 'Blackout', sub: dark ? 'Dark · positions fixed' : 'Lights out in 0:03', round: 3, seconds: dark ? 8 : 13, tone: dark ? 'dark' : null }),
      scene: roomScene('room-a', { active: null, dark, slots: disabler ? { ids: ['A1', 'A2', 'A3', 'A4', 'A5'], picked: state === 'chosen' ? 'A3' : null } : null }),
      tabs: { hero: 'pass-off', disabled: dark ? { actions: !disabler } : {} },
      overlay: [disabler ? targetBar('position', state === 'chosen' ? 'Position A3 fixed' : 'Choose a position', state === 'chosen' ? 'Resolves after the window · no effect shown now' : 'Room A · any position, even empty', { cancel: 's=blackout&state=pick' }) : null],
    });
  },

  /** The six-second post-Sync presentation (approved film; its poster here). */
  blackhole(root) {
    root.append(h('div', { style: { position: 'absolute', inset: '0', backgroundImage: `url("${LIBRARY}blackhole.poster.webp")`, backgroundSize: 'cover', backgroundPosition: 'center' } }));
    root.append(topBar({ kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, seconds: 4, ring: 1 / 3, urgentAt: -1 }));
    root.append(h('div', { style: { position: 'absolute', left: '16px', right: '16px', bottom: 'calc(var(--safe-b) + 24px)', textAlign: 'center' } }, pill('Jail vote opens next · a full 60 s', { icon: 'vote', tone: 'paper' })));
  },

  // ── Q. Eliminated ──────────────────────────────────────────────────────
  eliminated(root) {
    game(root, {
      top: turnBar(),
      scene: { kind: 'room', room: 'room-a', health: { 4: 'Eliminated' } },
      tabs: { hero: 'pass-off', disabled: { actions: true }, go: { switch: 's=board', card: 's=card&role=Doctor', panels: 's=panels' } },
      overlay: [banner({ icon: 'eliminated', title: 'You’re out', sub: 'You can watch. Your role stays private.' })],
    });
  },

  // ── Q. Match end ──────────────────────────────────────────────────────
  /** winner: Blue | Red | alien | none | aborted */
  end(root, p) {
    const winner = p.winner ?? 'Blue';
    const poster = winner === 'Red' ? 'arrival-red' : winner === 'Blue' || winner === 'alien' ? 'arrival-blue' : null;
    root.append(h('div.end-hero', { style: poster ? { backgroundImage: `url("${LIBRARY}${poster}.poster.webp")` } : { background: 'radial-gradient(circle at 50% 40%, #1B2333, #0A0D14)' } }));
    const title = { Blue: 'Blue reached Blue Planet', Red: 'Red reached Red Planet', alien: 'Blue reached Blue Planet', none: 'No survivors', aborted: 'Match aborted' }[winner];
    const tag = { Blue: 'BLUE WINS', Red: 'RED WINS', alien: 'BLUE WINS · ALIEN TOO', none: 'NO WINNER', aborted: 'NO WINNER' }[winner];
    root.append(h('div.end-title', stamp(tag, winner === 'none' || winner === 'aborted' ? null : 'gold'), h('h1', title), h('p', winner === 'alien' ? 'The Alien survived and used Blackhole' : winner === 'aborted' ? 'The host ended the match' : 'Round 6')));
    if (winner !== 'aborted') {
      const roles = [[1, 'Doctor', 'Blue'], [2, 'Insider', 'Blue'], [3, 'Blue Disabler', 'Blue'], [4, 'Supplier', 'Blue'], [5, 'Engineer', 'Blue'], [6, 'Undercover', 'Red'], [7, 'Hacker', 'Red'], [8, 'Red Disabler', 'Red'], [9, 'Alien', 'Alien']];
      root.append(h('div.end-list', h('p.group-label', { style: { marginTop: 0 } }, 'Roles'), roles.map(([s, r, t]) => h('div.reveal-row', pt(seatOf(s).character, 34), h('b', `${s} · ${seatOf(s).name}${s === SELF ? ' (you)' : ''}`), h('span.team-chip', { 'data-team': t }, h('i'), r))),
        h('p.group-note', 'Original Code: Players 2, 5, 6, 9')));
    }
    root.append(h('div.menu-actions', button('Return to lobby', { block: true, kind: 'secondary', icon: 'leave', go: 's=menu' })));
  },

  // ── Q. System states ──────────────────────────────────────────────────
  /** state: loading | unknown | asset | stale */
  system(root, p) {
    const state = p.state ?? 'loading';
    if (state === 'loading') {
      root.append(topBar({ kind: 'phase', icon: 'hourglass', title: 'Loading the ship', sub: 'Room 3 of 5', seconds: null }));
      root.append(h('div', { style: { position: 'absolute', left: '16px', right: '16px', top: 'calc(var(--top) + 16px)', bottom: 'calc(var(--safe-b) + 90px)', borderRadius: '18px', background: 'linear-gradient(110deg, #171D29 30%, #202837 50%, #171D29 70%)', boxShadow: 'inset 0 0 0 1px var(--hairline)' } }));
      root.append(h('div.menu-actions', h('p.group-note', { style: { textAlign: 'center' } }, 'Every phone loads the same pictures.')));
      return;
    }
    if (state === 'asset') {
      game(root, { top: turnBar(), scene: roomScene('room-a', { veil: '#202837' }), tabs: { hero: 'pass-off' },
        overlay: [h('div', { style: { position: 'absolute', left: '16px', right: '16px', top: 'calc(var(--top) + 60px)', zIndex: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, seatsFor().filter(s => s.location === 'Room A').map(s => h('div.cell', { 'data-state': 'available' }, pt(s.character, 60), h('span.cell-name', h('b.num', String(s.seat)), h('span', s.seat === SELF ? 'You' : s.name)), h('span.cell-note', s.slot)))),
          banner({ icon: 'warning', title: 'Room picture unavailable', sub: 'Positions and controls still work' })] });
      return;
    }
    if (state === 'stale') {
      game(root, { top: turnBar({ active: SELF, seconds: 0 }), scene: roomScene('room-a', { active: SELF }), tabs: { hero: 'pass-off' }, toast: toast('That phase closed · choices cleared', 'info') });
      return;
    }
    game(root, { top: turnBar({ active: SELF, seconds: 19 }), scene: roomScene('room-a', { active: SELF }), tabs: { hero: 'pass-off' },
      sheet: sheet({ title: 'Outcome unknown', body: [h('div.registered', h('span.big-icon', ic('warning', { filled: true })), h('p', 'Rescue Eli was sent, but no answer came back.'), h('p', 'Check before doing anything else.'))],
        foot: [button('Retry the same', { kind: 'secondary', icon: 'retry' }), button('Check receipt', { icon: 'check' })], close: false }) });
  },
};

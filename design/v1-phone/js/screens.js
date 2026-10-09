// mothership:dev-only
//
// Draws every state of the phone-first V1 journey from its synthetic fixture. One function
// per view; the shared parts (masthead, caption, timer, dock, board, piece, card) are below.
//
// What a state may show is decided by its surface and audience in contract/journey.json:
// a public state is drawn from public facts only, and nothing role-specific is ever put
// outside .j-private, the deliberately opened private container. Buttons that lead to
// another state carry data-to; app.js follows them. Nothing here is the game.

import { h, vh } from './h.js';
import {
  BASE_SEATS, CREW, END_REVEAL, FIXTURES, LONG_NAMES, ROLE_GUIDE, ROLE_LOOK, SYNTHETIC_IDS, SYNTHETIC_LABEL, VIEWER, callSign, roleOf, say,
} from './fixtures.js';

const PHASE = { HACK: 'Hack', CAPTAIN_ELECTION: 'Captain election', RELEASE_CHOICE: 'Release choice', RELEASE_VOTE: 'Release vote', JAIL_VOTE: 'Jail vote', SHOWDOWN: 'Showdown', FINISHED: 'Match finished', ABORTED: say('abortedPhase') };
const ROOMS = [['command', 'Command Room'], ['room-a', 'Room A'], ['room-b', 'Room B'], ['hospital', 'Hospital'], ['jail', 'Jail']];
const grouped = code => code.match(/.{1,4}/g) ?? [];
const clock = seconds => seconds === null || seconds === undefined ? '–:––' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/* ---------- shared parts ---------- */

let NAMES = null;
function nameOf(seat) { return NAMES ? NAMES[seat.n - 1] : seat.name; }
const who = seat => `Player ${seat.n} · ${nameOf(seat)}`;

function btn(label, { primary = false, quiet = false, danger = false, wide = false, disabled = false, to = null, act = null, glyph = null, sub = null, id = null, attrs = {} } = {}) {
  const classes = ['j-btn', primary && 'j-btn--primary', quiet && 'j-btn--quiet', danger && 'j-btn--danger', wide && 'j-btn--wide'].filter(Boolean).join(' ');
  return h('button', { type: 'button', class: classes, 'aria-disabled': disabled ? 'true' : null, 'data-to': to, 'data-act': act, id, ...attrs },
    glyph ? h('span', { class: 'j-btn__glyph', 'data-glyph': glyph, 'aria-hidden': 'true' }) : null,
    sub ? h('span', null, label, h('span', { class: 'j-btn__sub' }, sub)) : label);
}
const chip = (text, kind = null) => h('span', { class: 'j-chip', 'data-kind': kind }, text);
const notice = (text, kind = 'info', extra = {}) => h('p', { class: 'j-notice', 'data-kind': kind, role: kind === 'problem' ? 'alert' : 'status', ...extra }, text);
const proposal = (text = 'Proposal') => h('span', { class: 'j-proposal', title: 'Not in the pinned release: see docs/design/v1-phone-handoff.md' }, text);
const caption = (text, attrs = {}) => h('h1', { class: 'j-cap', ...attrs }, text);
const kicker = text => h('p', { class: 'j-kicker' }, text);
const h2 = (text, small = null) => h('h2', { class: small ? 'j-h2 j-h2--row' : 'j-h2' }, text, small ? h('small', null, small) : null);

function face(seat, { token = false } = {}) {
  if (!token && seat.character) return h('span', { class: 'j-face', 'data-character': seat.character, 'aria-hidden': 'true' });
  return h('span', { class: 'j-face j-face--token', 'data-token': String(seat.n), 'aria-hidden': 'true' });
}

function mast(surface, { conn = 'live', label = null } = {}) {
  const word = label ?? { host: 'Host', player: 'Player', display: 'Shared display', any: 'V1 playtest' }[surface];
  return h('header', { class: 'j-mast' },
    h('span', { class: 'j-mast__word' }, 'Mothership'),
    conn === 'stale' ? h('span', { class: 'j-conn', 'data-conn': 'stale' }, 'Reconnecting') : null,
    h('span', { class: 'j-mast__surface' }, word));
}

function screen({ surface, wide = false, conn = 'live', mastLabel = null, noMast = false, before = [], main = [], dock = null, overlay = null, attrs = {} }) {
  return h('div', { class: 'j-screen', 'data-surface': surface, 'data-wide': wide || null, ...attrs },
    h('p', { class: 'j-synthetic' }, SYNTHETIC_LABEL),
    noMast ? null : mast(surface, { conn, label: mastLabel }),
    before,
    h('main', { class: 'j-main', id: 'main' }, main),
    dock,
    overlay);
}

function dock(...children) {
  return h('div', { class: 'j-dock' }, h('div', { class: 'j-dock__in' }, children));
}

function timerBlock(t, { strip = false } = {}) {
  const state = t.syncing ? 'syncing' : t.expired ? 'expired' : t.seconds !== null && t.seconds <= 10 ? 'final' : 'running';
  const spoken = t.syncing ? 'Syncing time with the server' : t.expired ? 'Time is up' : `${t.seconds} seconds remaining`;
  return h('div', { class: 'j-timer', 'data-state': state, role: 'timer', 'aria-live': 'off', 'aria-label': `${t.label}: ${spoken}`, 'data-countdown': t.syncing || t.expired ? null : t.seconds, 'data-total': t.total },
    h('span', { class: 'j-timer__value', 'aria-hidden': 'true' }, t.syncing ? '–:––' : clock(t.expired ? 0 : t.seconds)),
    strip ? null : h('span', { class: 'j-timer__label', 'aria-hidden': 'true' }, t.label));
}
function bar(t, { thin = false } = {}) {
  const left = t.syncing || t.expired ? 0 : Math.round(100 * t.seconds / t.total);
  const state = t.syncing ? 'syncing' : t.expired ? 'expired' : 'running';
  return h('div', { class: thin ? 'j-strip__bar' : 'j-bar', 'data-state': state, 'aria-hidden': 'true', style: { '--left': `${left}%` }, 'data-bar-total': t.total }, h('span'));
}

function head(title, t = null, { sticky = true } = {}) {
  return h('div', { class: 'j-head', 'data-sticky': sticky && t ? true : null }, caption(title), t ? timerBlock(t) : null);
}

/** A seat slot: the face (character once it is a fact, the numbered token before), number, name, room and state. */
function slot(seat, { self = false } = {}) {
  const open = seat.kind === 'open';
  const stateChip = seat.state === 'confirmed' ? chip('Confirmed', 'done') : seat.state === 'choosing' ? chip('Choosing…', 'wait')
    : seat.state === 'ready' ? chip('Ready', 'done') : seat.state === 'reading' ? chip('Reading…', 'wait') : null;
  const name = open ? 'Open' : seat.name ? nameOf(seat) : seat.kind === 'bot' ? `Bot ${seat.n}` : null;
  return h('li', { class: 'j-slot', 'data-seat': `seat-${seat.n}`, 'data-state': open ? 'open' : seat.state ?? 'seated', 'data-self': self || null },
    h('span', { class: 'j-slot__face' }, seat.character ? face(seat) : h('span', { class: 'j-slot__num', 'aria-hidden': 'true' }, seat.n)),
    h('span', { class: 'j-slot__who' }, seat.character ? h('b', null, vh('Player '), seat.n) : vh(`Player ${seat.n}`), name ? [vh(', '), name] : seat.device ? [vh(', device '), h('span', { class: 'j-tag' }, seat.device)] : null),
    h('span', { class: 'j-slot__meta' },
      seat.kind === 'bot' ? chip('Bot', 'bot') : null,
      seat.room ? h('span', null, seat.room) : null,
      stateChip,
      self ? chip('You', 'you') : null));
}

/* ---------- the comic board ---------- */

function piece(seat, { viewer, active }) {
  const marks = [];
  if (seat.captain) marks.push('captain');
  if (seat.jailed) marks.push('jail');
  if (seat.health === 'Injured') marks.push('injured');
  if (seat.health === 'Eliminated') marks.push('eliminated');
  const words = [seat.health, seat.jailed && 'Jailed', seat.captain && 'Captain', seat.revealed && `Revealed: ${seat.revealed}`, seat.n === active && 'Active turn'].filter(Boolean).join(', ');
  return h('li', { class: 'j-piece', 'data-seat': `seat-${seat.n}`, 'data-character': seat.character, 'data-self': seat.n === viewer || null, 'data-health': seat.health },
    h('span', { class: 'j-piece__body', 'aria-hidden': 'true' }),
    seat.n === active ? h('span', { class: 'j-piece__mark', 'data-mark': 'turn', 'aria-hidden': 'true' }) : null,
    marks.slice(0, 2).map((mark, index) => h('span', { class: `j-piece__mark${index ? ' j-piece__mark--2' : ''}`, 'data-mark': mark, 'aria-hidden': 'true' })),
    seat.n === viewer ? h('span', { class: 'j-piece__you', 'aria-hidden': 'true' }, 'You') : null,
    h('span', { class: 'j-piece__tag' }, h('b', null, vh('Player '), seat.n), vh(', '), h('span', null, nameOf(seat)), vh(seat.n === viewer ? ' (you)' : ''), vh(`: ${words}`)));
}

function board(seats, { viewer = VIEWER, active = null, picking = null, final = false, wide = false, stale = false, moving = null } = {}) {
  const rooms = final ? [['final', 'Final Zone'], ...ROOMS] : ROOMS;
  const viewerSeat = seats.find(seat => seat.n === viewer);
  return h('section', { class: 'j-boardwrap', 'aria-labelledby': 'j-board-h' },
    h('h2', { class: 'j-vh', id: 'j-board-h' }, 'The ship'),
    h('ul', { class: 'j-board', 'data-picking': picking ? true : null, 'data-final': final || null, 'data-wide': wide || null, 'data-stale': stale || null },
      rooms.map(([id, name]) => {
        const here = seats.filter(seat => seat.location === name);
        if (final && id !== 'final' && here.length === 0) return null;
        const offered = picking?.offered.includes(name);
        const mine = viewerSeat?.location === name;
        return h('li', { class: 'j-room', 'data-room': id, 'data-crowded': here.length > 5 || (here.length > 3 && ['hospital', 'jail'].includes(id)) || null,
          'data-offer': picking ? (offered ? 'yes' : 'no') : null, 'data-picked': picking?.picked === name || null, 'data-here': mine || null },
        h('h3', { class: 'j-room__cap' }, name),
        mine && !picking && !wide ? h('span', { class: 'j-room__here' }, 'You are here') : null,
        offered ? h('button', { type: 'button', class: 'j-room__go', 'data-act': 'pick-room', 'data-room': name }, picking.picked === name ? 'Picked' : `Move here`) : null,
        here.length ? h('ul', { class: 'j-pieces', style: { '--n': here.length } }, here.map(seat => {
          const node = piece(seat, { viewer, active });
          if (seat.n === moving?.seat) {
            node.setAttribute('data-moving', '');
            node.style.setProperty('--from-x', `${moving.x}px`);
            node.style.setProperty('--from-y', `${moving.y}px`);
          }
          return node;
        })) : h('p', { class: 'j-vh' }, 'No players here.'));
      })));
}

function phaseStrip(data, viewer) {
  const { round, phase, timer: t } = data;
  let what;
  let num = null;
  if (phase.kind === 'ORDINARY_TURN') {
    const seat = data.seats.find(s => s.n === phase.active);
    what = phase.active === viewer ? 'Your turn' : `${nameOf(seat)}’s turn`;
    num = phase.active === viewer ? null : phase.active;
  } else what = PHASE[phase.kind];
  return h('div', { class: 'j-strip', 'data-stale': data.stale || null, 'data-cue': data.newRound ? 'round' : 'phase' },
    h('div', { class: 'j-strip__box' },
      h('p', null,
        h('span', { class: 'j-strip__round' }, round ? `Round ${round}` : 'Final showdown'),
        h('span', { class: 'j-strip__what' }, num ? [h('span', { class: 'j-tag', 'aria-hidden': 'true' }, num), ' '] : null, what, num ? vh(` (Player ${num})`) : null)),
      timerBlock({ ...t, label: 'Time remaining' }, { strip: true })),
    bar(t, { thin: true }));
}

/* ---------- the private card ---------- */

function roleCard(role, character, { compact = false, small = false } = {}) {
  const look = ROLE_LOOK[role];
  return h('div', { class: 'j-rolecard', 'data-face': 'front', 'data-compact': compact || null, 'data-device': look.device, 'data-team': look.team.toLowerCase(), 'data-character': character },
    h('span', { class: 'j-rolecard__art', 'aria-hidden': 'true' }),
    h('div', { class: 'j-rolecard__plate' },
      h('p', { class: 'j-rolecard__name' }, role),
      h('p', { class: 'j-rolecard__team' }, `${look.team === 'Alien' ? 'Alien' : `${look.team} team`}`)));
}

function cardBack({ small = false, stamp = null, words = 'Private', note = null, dealt = false } = {}) {
  return h('div', { class: 'j-rolecard', 'data-face': 'back', 'data-small': small || null, 'data-dealt': dealt || null, role: 'img', 'aria-label': 'Your role card, face down' },
    h('span', { class: 'j-rolecard__eye', 'aria-hidden': 'true' }),
    stamp ? null : h('span', { class: 'j-rolecard__word', 'aria-hidden': 'true' }, words),
    note ? h('span', { class: 'j-rolecard__small', 'aria-hidden': 'true' }, note) : null,
    stamp ? h('span', { class: 'j-rolecard__stamp' }, stamp) : null);
}

const STATUS = { idle: 'Nothing in progress', choosing: 'Choosing', confirming: 'Not sent yet', busy: 'Submitting', checking: 'Checking', unknown: 'Result unknown', registered: 'Accepted', 'not-accepted': 'Not accepted', dropped: 'Nothing in progress' };

function actionCard(card, seats, viewer) {
  if (!card) return null;
  const kind = card.kind === 'result' ? card.outcome : card.kind === 'busy' && card.status === 'Checking' ? 'checking' : card.kind;
  const statusKind = { idle: 'plain', choosing: 'plain', confirming: 'dashed', unknown: 'dashed', registered: 'stamp' }[kind] ?? null;
  const body = [];
  if (card.kind === 'idle') {
    body.push(h('ul', { class: 'j-offers' }, card.offers.map(([name, state, open]) => h('li', { class: 'j-offer' },
      h('span', { class: 'j-offer__name' }, name),
      chip(state === 'available' ? say('available') : state === 'paused' ? 'Paused' : say('notAvailable'), state === 'available' ? 'done' : 'wait'),
      state === 'available' && open ? btn(open, { primary: true, wide: true, to: name === 'Move' ? 'game.choose-room' : 'game.choose-target' }) : null))));
    if (card.note) body.push(h('p', { class: 'j-card__text' }, card.note));
  } else if (card.kind === 'choosing') {
    body.push(h('p', { class: 'j-card__prompt', id: 'j-card-prompt' }, card.prompt));
    body.push(h('p', { class: 'j-card__text' }, say('chooseNote')));
    const list = h('div', { class: 'j-choices', role: 'group', 'aria-labelledby': 'j-card-prompt' });
    for (const choice of card.choices ?? []) {
      if (choice.room) {
        list.append(h('button', { type: 'button', class: 'j-choice j-choice--plain', 'data-act': 'choose', 'data-value': choice.room, 'data-room-choice': choice.room }, h('span', { class: 'j-choice__name' }, choice.room), h('span', { class: 'j-choice__detail' }, 'Move here')));
        continue;
      }
      const seat = seats.find(s => s.n === choice.seat);
      const detail = [seat.health, seat.jailed && 'Jailed', seat.captain && 'Captain'].filter(Boolean).join(' · ');
      list.append(h('button', { type: 'button', class: 'j-choice', 'data-act': 'choose', 'data-value': `seat-${seat.n}` },
        h('span', { class: 'j-choice__face' }, face(seat)),
        h('span', { class: 'j-choice__name' }, h('b', null, vh('Player '), seat.n), vh(', '), seat.n === viewer ? `${nameOf(seat)} (you)` : nameOf(seat)),
        h('span', { class: 'j-choice__detail' }, detail)));
    }
    for (const extra of card.extra ?? []) list.append(h('button', { type: 'button', class: 'j-choice j-choice--plain', 'data-act': 'choose', 'data-value': extra }, h('span', { class: 'j-choice__name' }, extra), h('span')));
    for (const answer of card.answers ?? []) list.append(h('button', { type: 'button', class: 'j-choice j-choice--plain', 'data-act': 'choose', 'data-value': answer }, h('span', { class: 'j-choice__name' }, answer), h('span')));
    body.push(list);
    if (card.note) body.push(h('p', { class: 'j-card__text' }, card.note));
    body.push(btn(say('cancel'), { quiet: true, act: 'cancel' }));
  } else if (card.kind === 'confirming') {
    body.push(h('p', { class: 'j-card__prompt' }, card.prompt));
    body.push(h('p', { class: 'j-card__text' }, card.consequence));
    body.push(h('div', { class: 'j-card__controls' }, btn(card.confirm, { primary: true, wide: true, act: 'confirm' }), btn(say('chooseSomeoneElse'), { act: 'back' })));
  } else if (card.kind === 'busy') {
    body.push(h('p', { class: 'j-card__text', role: 'status' }, card.text));
    body.push(h('div', { class: 'j-card__wait', 'aria-hidden': 'true' }));
  } else if (card.kind === 'result') {
    body.push(h('p', { class: 'j-card__prompt', role: 'status' }, card.text));
    if (card.detail) body.push(h('p', { class: 'j-card__text' }, card.detail));
    body.push(btn(card.action ?? say('done'), { wide: true, to: card.outcome === 'unknown' ? 'game.checking' : card.title === 'Vote' ? null : 'game.not-available' }));
  }
  const statusWord = kind === 'registered' ? (card.stampWord ?? 'Registered') : STATUS[kind];
  return h('section', { class: 'j-card', 'data-selected': ['choosing', 'confirming', 'busy', 'checking'].includes(kind) || null, 'aria-labelledby': 'j-card-title' },
    h('div', { class: 'j-card__head' },
      h('h3', { class: 'j-card__title', id: 'j-card-title', tabindex: '-1' }, card.title ?? 'Your action'),
      h('span', { class: 'j-card__status', 'data-kind': statusKind }, statusWord)),
    body);
}

function privateSheet(sheet, data, viewer) {
  const seats = data.seats;
  const self = seats.find(s => s.n === viewer);
  // Choosing a room: the card sits low and the board stays visible and pressable above it.
  if (sheet.peek) return h('div', { class: 'j-peek', 'data-sheet': 'private' },
    h('section', { class: 'j-sheet j-sheet--peek j-private', role: 'region', 'aria-labelledby': 'j-private-h' },
      h('div', { class: 'j-sheet__head' }, h('h2', { class: 'j-sheet__title', id: 'j-private-h', tabindex: '-1' }, 'Private card'), btn('Hide', { act: 'hide-private', glyph: 'private-closed' })),
      actionCard(sheet.card, seats, viewer)));
  return h('div', { class: 'j-scrim', 'data-sheet': 'private' },
    h('section', { class: 'j-sheet j-private', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'j-private-h' },
      h('span', { class: 'j-sheet__grip', 'aria-hidden': 'true' }),
      h('div', { class: 'j-sheet__head' },
        h('h2', { class: 'j-sheet__title', id: 'j-private-h', tabindex: '-1' }, 'Private card'),
        btn('Hide', { act: 'hide-private', glyph: 'private-closed' })),
      h('p', { class: 'j-private__hint' }, say('privateHint')),
      roleCard(sheet.role, self.character, { compact: true }),
      h('details', { class: 'j-more' }, h('summary', null, 'About this role'), h('div', { class: 'j-more__body' }, h('p', null, ROLE_GUIDE[sheet.role]))),
      sheet.hack ? notice(sheet.hack, 'info') : null,
      sheet.ballotLine ? notice(sheet.ballotLine, 'ok') : null,
      sheet.acknowledgments ? h('section', { class: 'j-stack', 'aria-labelledby': 'j-ack-h' }, h2(say('supplyResults')), ...sheet.acknowledgments.map(line => h('p', { class: 'j-notice', 'data-kind': 'ok', id: 'j-ack-h' }, line))) : null,
      sheet.knowledge ? h('section', { class: 'j-stack', 'aria-labelledby': 'j-know-h' }, h('h2', { class: 'j-h2', id: 'j-know-h' }, 'What you know'), h('ul', { class: 'j-know' }, sheet.knowledge.map(line => h('li', null, line)))) : null,
      sheet.card ? h('section', { class: 'j-stack', 'aria-label': 'Actions' }, h2('Actions'), actionCard(sheet.card, seats, viewer)) : null));
}

/* ---------- public panels during a match ---------- */

function votePanel(vote, seats) {
  if (!vote) return null;
  const list = ids => h('ul', { class: 'j-vote__list' }, ids.map(n => { const seat = seats.find(s => s.n === n); return h('li', null, h('b', null, vh('Player '), n), vh(', '), nameOf(seat)); }));
  const parts = [kicker(PHASE[vote.kind])];
  if (vote.kind === 'CAPTAIN_ELECTION') parts.push(h('p', { class: 'j-card__text' }, 'Candidates:'), list(vote.candidates));
  if (vote.kind === 'JAIL_VOTE') parts.push(h('p', { class: 'j-card__text' }, 'Can be voted into Jail:'), list(vote.candidates));
  if (vote.kind === 'RELEASE_CHOICE') parts.push(h('p', { class: 'j-card__text' }, `Player ${vote.chooser} may ask for a vote on releasing one jailed player.`), h('p', { class: 'j-card__text' }, 'Jailed:'), list(vote.jailed));
  if (vote.kind === 'RELEASE_VOTE') parts.push(h('p', { class: 'j-card__text' }, `The vote is on releasing Player ${vote.subject} from Jail.`));
  if (vote.voters) parts.push(h('p', { class: 'j-card__text' }, `${vote.voters} players may vote. Each ballot is private; only the count is published, when the vote closes.`));
  return h('section', { class: 'j-panel j-vote', 'aria-label': 'Voting' }, parts);
}

function tallyPanel(tally, seats) {
  if (!tally) return null;
  const total = Object.values(tally.counts).reduce((a, b) => a + b, 0);
  const rows = Object.entries(tally.counts).sort((a, b) => b[1] - a[1]).map(([n, votes]) => {
    const seat = seats.find(s => s.n === Number(n));
    return h('li', null, h('span', null, h('b', null, `${n}`), ' ', nameOf(seat)), h('span', { class: 'j-tally__bar', style: { '--share': `${Math.round(100 * votes / tally.voters)}%` }, 'aria-hidden': 'true' }), h('span', { class: 'j-tally__n' }, `${votes}`, vh(votes === 1 ? ' vote' : ' votes')));
  });
  return h('section', { class: 'j-panel j-vote', 'aria-labelledby': 'j-tally-h' },
    h('h2', { class: 'j-kicker', id: 'j-tally-h' }, `${say('lastVote')} · ${PHASE[tally.kind]}`),
    h('p', { class: 'j-tally__line' }, tally.line),
    h('ul', { class: 'j-tally' }, rows),
    h('p', { class: 'j-card__text' }, `${tally.voters} players could vote. Abstained or did not vote: ${tally.voters - total}.`));
}

function summaryPanel(lines) {
  if (!lines) return null;
  return h('section', { class: 'j-panel j-summary', 'aria-labelledby': 'j-sum-h' },
    h('div', { class: 'j-row' }, h('h2', { class: 'j-kicker', id: 'j-sum-h' }, 'What changed since the last phase'), proposal('Frontend proposal')),
    h('ul', { class: 'j-stack' }, lines.map(([mark, line]) => h('li', null, h('span', { class: 'j-summary__glyph', 'data-mark': mark, 'aria-hidden': 'true' }), h('span', null, line)))),
    h('p', { class: 'j-card__text' }, 'Only what every player can see changed. Nothing here comes from a registered action.'));
}

function readable(seats, viewer, open = false) {
  return h('details', { class: 'j-more j-readable', open: open || null },
    h('summary', null, say('readableList')),
    h('div', { class: 'j-more__body' },
      h('table', { class: 'j-table' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Player'), h('th', { scope: 'col' }, 'Where'), h('th', { scope: 'col' }, 'Status'))),
        h('tbody', null, seats.map(seat => h('tr', { 'data-self': seat.n === viewer || null },
          h('th', { scope: 'row' }, `${seat.n} · ${nameOf(seat)}${seat.n === viewer ? ' (you)' : ''}`),
          h('td', { 'data-label': 'Where' }, seat.location),
          h('td', { 'data-label': 'Status' }, [seat.health, seat.jailed && 'Jailed', seat.captain && 'Captain', seat.revealed && `Revealed: ${seat.revealed}`].filter(Boolean).join(', '))))))));
}

/* ---------- views ---------- */

const VIEWS = {
  entry(data) {
    if (data.variant === 'signing') return screen({ surface: 'any', main: [h('section', { class: 'j-panel j-system' }, h('span', { class: 'j-system__glyph', 'aria-hidden': 'true' }, '…'), h('p', { class: 'j-lede' }, 'Signing in…'))] });
    if (data.variant === 'failed') return screen({ surface: 'any', main: [caption('Could not sign in'), h('section', { class: 'j-panel j-system' }, h('span', { class: 'j-system__glyph', 'aria-hidden': 'true' }, '!'), h('p', null, say('signinFailed')))], dock: dock(btn('Reload', { primary: true, wide: true, to: 'entry.choose' })) });
    const door = (id, title, text, to) => h('a', { class: 'j-door', 'data-door': id, href: `?state=${to}`, 'data-to': to },
      h('span', { class: 'j-door__art', 'aria-hidden': 'true' }), h('span', null, h('span', { class: 'j-door__title' }, title), h('span', { class: 'j-door__text' }, text)));
    return screen({ surface: 'any', main: [
      caption('Welcome aboard'),
      h('p', { class: 'j-lede' }, 'A table game for 7 to 9 players. Everyone plays on their own phone.'),
      h('nav', { class: 'j-doors', 'aria-label': 'Open this page as' },
        door('player', 'Join a game', 'Type the room code the host gives you.', 'join.code'),
        door('host', 'Host a game', 'Create a lobby, seat players and start.', 'host.create'),
        door('display', 'Shared display', 'Show the public board on a screen everyone can see.', 'display.admit')),
      h('p', { class: 'j-quiet' }, say('oneTabPerPlayer')),
      h('details', { class: 'j-more' }, h('summary', null, 'Details', h('span', { class: 'j-more__state' }, 'This device')), h('div', { class: 'j-more__body' }, h('p', { class: 'j-quiet' }, 'Device identifier'), h('p', { class: 'j-tag' }, 'H8dNs2qLwT…'), h('p', { class: 'j-quiet' }, 'Only a shared display needs to read this out to the host.')))] });
  },

  'host-create'(data) {
    const tile = n => h('label', { class: 'j-count__tile' },
      h('input', { type: 'radio', name: 'seats', value: String(n), checked: data.selected === n || null }),
      h('span', { class: 'j-count__face' }, h('span', { class: 'j-count__n' }, n), h('span', { class: 'j-count__word' }, 'seats')));
    return screen({ surface: 'host', main: [
      caption('Host a game'),
      h('p', { class: 'j-lede' }, 'How many players? Every seat must be filled before you start: by a player on their own phone, or by a practice bot.'),
      h('fieldset', { class: 'j-stack' }, h('legend', { class: 'j-h2' }, 'Seats'), h('div', { class: 'j-count' }, [7, 8, 9].map(tile))),
      h('p', { class: 'j-quiet' }, 'Hosting shows no roles. To play as well, join from a second tab or phone with the room code.')],
    dock: dock(btn('Create lobby', { primary: true, wide: true, to: 'host.lobby-empty' })) });
  },

  'host-lobby'(data) {
    const filled = data.seats.filter(seat => seat.kind !== 'open').length;
    const codePanel = h('section', { class: 'j-panel', 'aria-labelledby': 'j-code-h' },
      h('h2', { class: 'j-kicker', id: 'j-code-h' }, 'Room code'),
      h('p', { class: 'j-code', 'aria-label': `Room code ${SYNTHETIC_IDS.code.split('').join(' ')}` }, grouped(SYNTHETIC_IDS.code).map(group => h('span', { 'aria-hidden': 'true' }, group))),
      h('div', { class: 'j-row' }, btn('Copy code', { act: 'copy' }), btn('Share…', { to: 'host.share' }), proposal('Share: proposal')),
      h('p', { class: 'j-quiet' }, 'Players open Join a game and type this code.'));
    const reqList = data.requests.length === 0 ? h('p', { class: 'j-quiet' }, say('noRequests')) : h('ul', { class: 'j-requests' }, data.requests.map(req => {
      const vacant = data.seats.filter(seat => seat.kind === 'open').map(seat => seat.n);
      const noSeat = req.state === 'no-seat';
      return h('li', { class: 'j-panel j-request', 'data-fresh': req.fresh || null, 'data-status': req.state ?? 'pending' },
        h('p', { class: 'j-request__who' }, 'Device', h('span', { class: 'j-tag' }, req.device), h('span', null, `starts in ${req.room}`)),
        noSeat ? notice('No free seat. Lower the bot count to make room, or leave the request waiting.', 'info') : h('div', { class: 'j-request__seat' },
          h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'Seat'),
            h('select', { class: 'j-select', 'aria-label': 'Seat for this player', disabled: req.state === 'unsettled' || null }, vacant.map(n => h('option', { value: `seat-${n}`, selected: n === req.seat || null }, `Player ${n}`)))),
          btn(req.state === 'unsettled' ? say('sendSame') : 'Seat', { primary: true, to: 'host.full' })),
        req.state === 'unsettled' ? btn(say('giveUp'), { quiet: true }) : null);
    }));
    const disclosure = (title, state, open, body) => h('details', { class: 'j-more', open: open || null }, h('summary', null, title, h('span', { class: 'j-more__state' }, state)), h('div', { class: 'j-more__body' }, body));
    const bots = disclosure('Practice bots', data.bots ? `${data.bots} bots` : 'No bots', data.botsOpen, [
      h('p', { class: 'j-quiet' }, say('soloTip')),
      h('div', { class: 'j-stepper' }, btn('−', { attrs: { 'aria-label': 'Fewer bots' } }), h('p', { class: 'j-stepper__value', 'aria-live': 'polite' }, `${data.botDraft ?? data.bots}`, h('small', null, 'bots')), btn('+', { attrs: { 'aria-label': 'More bots' } })),
      btn(data.bots ? 'Update bots' : 'Add bots', { wide: true, disabled: (data.botDraft ?? data.bots) === data.bots }),
      h('p', { class: 'j-quiet' }, 'Bots take free seats only and never remove a player.')]);
    const display = disclosure('Shared display', 'Not admitted', data.displayOpen, [
      h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'Identifier shown on the shared display'), h('input', { class: 'j-input j-input--code', type: 'text', value: data.displayOpen ? SYNTHETIC_IDS.display : '', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'j-display-help' })),
      h('p', { class: 'j-quiet', id: 'j-display-help' }, 'Open the display on the other screen first. It shows this identifier.'),
      btn(say('admitDisplay'), { wide: true })]);
    const end = disclosure('End this lobby', '', false, [h('p', { class: 'j-quiet' }, say('endNote')), btn(say('endAsk'), { danger: true, to: 'host.end-confirm' })]);
    const full = filled === data.count;
    const main = [
      caption('Your lobby'),
      data.notice ? notice(data.notice.text, data.notice.kind) : null,
      codePanel,
      data.requests.length ? h('section', { class: 'j-stack', 'aria-labelledby': 'j-req-h' }, h('h2', { class: 'j-h2', id: 'j-req-h' }, 'Requests to join ', h('span', { class: 'j-badge' }, data.requests.length)), reqList) : null,
      h('section', { class: 'j-stack', 'aria-labelledby': 'j-seat-h' }, h('h2', { class: 'j-h2 j-h2--row', id: 'j-seat-h' }, 'Seats', h('small', null, `${filled} of ${data.count} filled`)), h('ol', { class: 'j-slots' }, data.seats.map(seat => slot(seat)))),
      data.requests.length ? null : h('section', { class: 'j-stack' }, h('h2', { class: 'j-h2' }, 'Requests to join'), reqList),
      bots, display, end];
    const overlay = data.hostSheet === 'share' ? h('div', { class: 'j-scrim' }, h('section', { class: 'j-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'j-share-h' },
      h('span', { class: 'j-sheet__grip', 'aria-hidden': 'true' }),
      h('div', { class: 'j-sheet__head' }, h('h2', { class: 'j-sheet__title', id: 'j-share-h' }, 'Invite players'), btn('Close', { to: 'host.lobby-empty' })),
      h('p', { class: 'j-code', 'aria-label': `Room code ${SYNTHETIC_IDS.code.split('').join(' ')}` }, grouped(SYNTHETIC_IDS.code).map(group => h('span', { 'aria-hidden': 'true' }, group))),
      btn('Copy code', { wide: true, act: 'copy' }),
      h('div', { class: 'j-panel j-stack' }, h('div', { class: 'j-row' }, h('p', { class: 'j-kicker' }, 'Join link and QR code'), proposal()),
        h('div', { class: 'j-qr', role: 'img', 'aria-label': 'Placeholder for a QR code: not generated' }, qrPlaceholder()),
        h('p', { class: 'j-card__text' }, 'Not in the release. A link that fills in the room code puts a joining code in an address, where history, logs and screenshots keep it. Integration decides.'),
        btn('Share link…', { wide: true, disabled: true })))) : null;
    return screen({ surface: 'host', main, overlay,
      dock: dock(btn('Start setup', { primary: true, wide: true, disabled: !full, to: full ? 'host.choosing' : null, sub: full ? 'Locks the seats. Everyone gets 30 seconds to choose a character.' : null }),
        full ? null : h('p', { class: 'j-dock__note' }, `Fill all ${data.count} seats to start: ${data.count - filled} open.`)) });
  },

  'host-setup'(data) {
    const choosing = data.stage === 'choosing';
    const done = data.seats.filter(seat => seat.state === (choosing ? 'confirmed' : 'ready')).length;
    const waitingNames = data.seats.filter(seat => seat.state === (choosing ? 'choosing' : 'reading'));
    const line = data.timer.expired
      ? (choosing ? say('selectionOverHost') : `${say('readingOver')}`)
      : choosing ? say('unconfirmedAssigned') : say('readingWaits');
    return screen({ surface: 'host', main: [
      head(choosing ? 'Choosing characters' : 'Reading roles', data.timer),
      bar(data.timer),
      h('p', { class: 'j-lede', role: 'status' }, line),
      h('div', { class: 'j-progress' }, h('p', { class: 'j-progress__count' }, `${done} of ${data.seats.length} ${choosing ? 'confirmed' : 'Ready'}`),
        h('div', { class: 'j-pips', 'aria-hidden': 'true' }, data.seats.map(seat => h('span', { class: 'j-pip', 'data-done': seat.state === 'confirmed' || seat.state === 'ready' || null })))),
      data.timer.expired && !choosing ? notice(`Still reading: ${waitingNames.map(seat => `Player ${seat.n} · ${nameOf(seat)}`).join(', ')}.`, 'info') : null,
      h('ol', { class: 'j-slots j-on-dark' }, data.seats.map(seat => slot(seat))),
      h('p', { class: 'j-quiet' }, say('hostNoRoles')),
      h('details', { class: 'j-more' }, h('summary', null, 'Host tools', h('span', { class: 'j-more__state' }, 'Seat recovery, end')), h('div', { class: 'j-more__body' }, btn('Move a seat to another device', { wide: true, to: 'host.recovery' }), btn(say('endAsk'), { danger: true, wide: true, to: 'host.end-confirm' })))] });
  },

  'host-running'(data) {
    const active = data.seats.find(seat => seat.n === data.phase.active);
    const main = [
      caption('Match running'),
      h('section', { class: 'j-panel j-panel--dark j-stack', 'aria-labelledby': 'j-hs-h' },
        h('div', { class: 'j-row' }, h('h2', { class: 'j-kicker', id: 'j-hs-h' }, 'Now'), proposal('Frontend: read the public view')),
        h('div', { class: 'j-strip__box' },
          h('p', null, h('span', { class: 'j-strip__round' }, `Round ${data.round}`), h('span', { class: 'j-strip__what' }, `${nameOf(active)}’s turn`)),
          timerBlock({ ...data.timer, label: 'Time remaining' }, { strip: true })),
        h('p', { class: 'j-card__text' }, 'The same public facts as the shared display. Hosting shows no roles.')),
      h('section', { class: 'j-stack', 'aria-labelledby': 'j-tools-h' }, h('h2', { class: 'j-h2', id: 'j-tools-h' }, 'Host tools'),
        h('details', { class: 'j-more' }, h('summary', null, 'Move a seat to another device', h('span', { class: 'j-more__state' }, 'One-time code')), h('div', { class: 'j-more__body' }, h('p', { class: 'j-quiet' }, 'For a player whose phone died or who changes phone. Their seat, character and role stay the same.'), btn('Open seat recovery', { wide: true, to: 'host.recovery' }))),
        h('details', { class: 'j-more' }, h('summary', null, 'Shared display', h('span', { class: 'j-more__state' }, 'Admitted')), h('div', { class: 'j-more__body' }, h('p', { class: 'j-quiet' }, 'Open the board on a screen everyone can see.')))),
    ];
    let overlay = null;
    if (data.hostSheet === 'end') overlay = h('div', { class: 'j-scrim' }, h('section', { class: 'j-sheet', 'data-kind': 'confirm', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'j-end-h', 'aria-describedby': 'j-end-d' },
      h('span', { class: 'j-sheet__grip', 'aria-hidden': 'true' }),
      h('h2', { class: 'j-sheet__title', id: 'j-end-h' }, 'End the match for everyone?'),
      h('p', { id: 'j-end-d' }, say('endNote')),
      btn(say('endKeep'), { primary: true, wide: true, to: 'host.running', attrs: { 'data-autofocus': '' } }),
      h('div', { class: 'j-confirm-gap', 'aria-hidden': 'true' }),
      btn(say('endYes'), { danger: true, to: 'host.ended' })));
    if (data.hostSheet === 'recovery') {
      const r = data.recovery;
      overlay = h('div', { class: 'j-scrim' }, h('section', { class: 'j-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'j-rec-h' },
        h('span', { class: 'j-sheet__grip', 'aria-hidden': 'true' }),
        h('div', { class: 'j-sheet__head' }, h('h2', { class: 'j-sheet__title', id: 'j-rec-h' }, 'Move a seat'), btn('Close', { to: 'host.running' })),
        h('p', { class: 'j-quiet' }, 'Human seats only. The seat keeps its character, name and role; nothing is dealt again.'),
        h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'Seat to move'), h('select', { class: 'j-select', disabled: r.unsettled || null }, data.seats.slice(0, 6).map(seat => h('option', { selected: seat.n === r.seat || null }, `Player ${seat.n} · ${nameOf(seat)}`)))),
        r.unsettled ? notice(`The request for Player ${r.seat} is not settled. If the server carried it out, a code this page never received now exists for that seat, and any code issued for it before no longer works.`, 'uncertain') : null,
        r.issued ? h('div', { class: 'j-panel j-recovery j-stack' },
          h('p', { class: 'j-kicker' }, `Code for Player ${r.seat} · ${nameOf(data.seats[r.seat - 1])}`),
          h('p', { class: 'j-code j-code--small', 'aria-label': 'One-time code (synthetic)' }, grouped(SYNTHETIC_IDS.recovery).map(group => h('span', null, group))),
          h('p', { class: 'j-card__text' }, 'Works once, until 21:47. Match identifier: ', h('span', { class: 'j-tag' }, SYNTHETIC_IDS.match)),
          h('p', { class: 'j-card__text' }, `${say('codeOtherDevice')} ${say('codeMemory')}`),
          h('div', { class: 'j-row' }, btn('Copy code'), btn(say('takeOffPage'), { quiet: true }))) : null,
        btn(r.unsettled ? say('sendSame') : say('issueCode'), { primary: !r.issued, wide: true }),
        r.unsettled ? btn(say('giveUp'), { quiet: true }) : null));
    }
    return screen({ surface: 'host', main, overlay, dock: dock(btn(say('endAsk'), { danger: true, wide: true, to: 'host.end-confirm' })) });
  },

  'host-ended'() {
    return screen({ surface: 'host', main: [
      caption('Match ended'),
      h('section', { class: 'j-result' }, h('p', { class: 'j-result__line' }, say('abortedPhase')), h('p', { class: 'j-result__sub' }, say('aborted'))),
      h('p', { class: 'j-lede' }, 'Nothing was revealed. A new game is a new match with a new room code; this one stays as it ended.')],
    dock: dock(btn('Start a new game', { primary: true, wide: true, to: 'host.create', sub: 'Creates a fresh lobby' })) });
  },

  'join-form'(data) {
    const field = h('label', { class: 'j-field' },
      h('span', { class: 'j-field__label' }, 'Room code', h('span', { class: 'j-field__count' }, `${data.code.length}/12`)),
      h('input', { class: 'j-input j-input--code', id: 'j-code', type: 'text', inputmode: 'text', enterkeyhint: 'go', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '14', value: data.code ? grouped(data.code).join(' ') : '', 'aria-invalid': data.invalid ? 'true' : null, 'aria-describedby': 'j-code-help', disabled: data.busy || data.unsettled || null }));
    const status = data.invalid ? notice(say('codeForm'), 'problem')
      : data.refused ? notice('This room cannot take your request. Check the code with the host: the room may not exist or may have started, or this device may already be in it.', 'problem')
      : data.unsettled ? notice('Asking to join: no answer. Press again to send the same request again.', 'uncertain')
      : data.busyServer ? notice(`The server is busy. Wait ${data.busyServer} s, then press again.`, 'info') : null;
    const label = data.busy ? 'Asking to join…' : data.unsettled ? say('sendSame') : 'Ask to join';
    return screen({ surface: 'player', main: [
      caption('Join a game'),
      h('p', { class: 'j-lede' }, 'Type the room code from the host.'),
      h('form', { class: 'j-stack', id: 'j-join-form', 'data-submit-to': data.busy ? null : 'join.waiting-host', novalidate: '' }, field),
      h('p', { class: 'j-quiet', id: 'j-code-help' }, '12 characters: 0–9 and A–F.'),
      status,
      data.unsettled ? btn(say('giveUp'), { quiet: true }) : null,
      h('p', null, h('a', { class: 'j-link', href: '?state=join.recover', 'data-to': 'join.recover' }, 'Moving to a new phone? Take over your seat'))],
    dock: dock(btn(label, { primary: true, wide: true, disabled: data.busy || data.invalid, to: data.busy ? null : 'join.waiting-host' })) });
  },

  'join-wait'(data) {
    const states = {
      waiting: { cap: 'Waiting to be seated', big: 'Request sent', token: '?', lines: [say('waitingSeat')], facts: [['Your device', h('span', { class: 'j-tag' }, data.device)], ['You start in', data.room]], quiet: 'The host sees the same device tag beside your request. Keep this tab open.' },
      seated: { cap: 'You are seated', big: `Player ${data.seat}`, token: data.seat, lines: [say('waitingSetup'), 'Next: choose your character.'], facts: [['Your device', h('span', { class: 'j-tag' }, data.device)], ['You start in', data.room]] },
      ended: { cap: 'Match ended', big: 'Not started', token: '–', lines: [say('endedInLobby')], button: ['Join another game', 'join.code'] },
      'recover-checking': { cap: 'Taking over a seat', big: 'Checking…', token: '?', lines: [say('recoverWaiting')], button: [say('sendSame'), null], quietButton: [say('recoverStartOver'), 'join.recover'] },
      'recover-refused': { cap: 'Taking over a seat', big: 'No seat yet', token: '–', lines: ['The server has not given this device a seat in this match. If the request is still on its way this page will find out; otherwise ask the host for a new code and start over.'], quietButton: [say('recoverStartOver'), 'join.recover'] },
    };
    const s = states[data.state];
    return screen({ surface: 'player', main: [
      caption(s.cap),
      h('section', { class: 'j-panel j-wait', 'data-state': data.state, role: 'status' },
        h('span', { class: 'j-wait__token', 'aria-hidden': 'true' }, s.token),
        h('p', { class: 'j-wait__big' }, s.big),
        s.lines.map(line => h('p', null, line)),
        s.facts ? h('dl', { class: 'j-facts' }, s.facts.map(([term, value]) => [h('dt', null, term), h('dd', null, value)])) : null),
      s.quiet ? h('p', { class: 'j-quiet' }, s.quiet) : null,
      data.seats ? h('section', { class: 'j-stack' }, h2('Seats', `${data.seats.filter(seat => seat.kind !== 'open').length} of ${data.seats.length} filled`), h('ol', { class: 'j-slots' }, data.seats.map(seat => slot(seat, { self: seat.n === data.seat })))) : null,
      s.quietButton ? btn(s.quietButton[0], { quiet: true, to: s.quietButton[1] }) : null],
    dock: s.button ? dock(btn(s.button[0], { primary: true, wide: true, to: s.button[1] })) : null });
  },

  'join-recover'() {
    return screen({ surface: 'player', main: [
      caption('Take over your seat'),
      h('p', { class: 'j-lede' }, 'Ask the host for a one-time code. Your seat, character and role stay the same; nothing is dealt again.'),
      h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'Match identifier, from the host'), h('input', { class: 'j-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', value: '' })),
      h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'One-time recovery code, from the host'), h('input', { class: 'j-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', value: '' })),
      h('p', { class: 'j-quiet' }, 'The code is long: copy it from the host’s screen if you can. It leaves this field as soon as you send it.'),
      h('p', null, h('a', { class: 'j-link', href: '?state=join.code', 'data-to': 'join.code' }, 'Back to joining with a room code'))],
    dock: dock(btn('Take over the seat', { primary: true, wide: true, to: 'join.recover-checking' })) });
  },

  select(data) {
    if (data.phase === 'assigned') return VIEWS.reveal({ phase: 'concealed', timer: data.timer, assigned: data.assigned });
    const frozen = ['submitting', 'retry', 'expired', 'confirmed'].includes(data.phase) || data.timer.syncing;
    const tile = entry => {
      const holder = data.taken[entry.id];
      const mine = data.selected === entry.id && !holder;
      return h('button', { type: 'button', class: 'j-crewtile', 'data-character': entry.id, 'aria-pressed': String(mine),
        'aria-disabled': holder || frozen ? 'true' : null, 'data-act': 'pick-crew', 'data-confirmed': String(mine && data.phase === 'confirmed'),
        'data-just-taken': data.justTaken === entry.id || null,
        'aria-label': holder ? `${entry.sign}, taken by Player ${holder}` : entry.sign },
        h('span', { class: 'j-crewtile__art', 'aria-hidden': 'true' }),
        h('span', { class: 'j-crewtile__sign', 'aria-hidden': 'true' }, entry.sign),
        holder ? h('span', { class: 'j-crewtile__state', 'aria-hidden': 'true' }, `Player ${holder}`)
          : mine ? h('span', { class: 'j-crewtile__state', 'aria-hidden': 'true' }, '✓') : null);
    };
    const status = data.phase === 'conflict' ? notice(say('characterTaken'), 'problem')
      : data.phase === 'unavailable' ? notice(say('selectionUnavailable'), 'problem')
      : data.phase === 'retry' ? notice(say('choiceUncertain'), 'uncertain') : null;
    return screen({ surface: 'player', noMast: true, main: [
      head(say('chooseCharacter'), data.timer),
      bar(data.timer),
      h('div', { class: `j-crew${frozen ? ' j-crewgrid-frozen' : ''}`, role: 'group', 'aria-label': say('chooseCharacter'),
        'data-selection-state': data.phase }, CREW.map(tile)), status],
      dock: data.phase === 'retry' ? dock(btn(say('sameChoiceAgain'), { primary: true, wide: true, act: 'retry-crew' })) : null });
  },

  reveal(data) {
    const me = { n: VIEWER, character: data.assigned?.character ?? 'c1', name: data.assigned?.name ?? 'Cleo' };
    const role = data.role ?? roleOf(VIEWER);
    const banner = data.phase === 'reconnecting' ? h('p', { class: 'j-notice', 'data-kind': 'problem', role: 'alert' }, 'Connection lost. Your role card is hidden until the connection is back. The deal is unchanged and the server’s timer keeps running.') : null;
    let card; let lines = []; let dockBody;
    const ready = (disabled, label = 'Ready', to = 'reveal.ready-sending') => btn(label, { primary: true, wide: true, disabled, to: disabled ? null : to });
    switch (data.phase) {
      case 'dealing':
        card = cardBack({ note: 'Dealing…' });
        lines = [say('freshRole')];
        dockBody = null;
        break;
      case 'concealed': case 'recovered': case 'backgrounded':
        card = h('button', { type: 'button', class: 'j-reveal-tap', 'data-act': 'reveal', 'data-to': 'reveal.revealed', 'aria-label': say('revealMine'), 'aria-expanded': 'false' }, cardBack({ words: say('tapToReveal'), dealt: data.phase === 'concealed' && !data.assigned }));
        lines = [];
        if (data.phase === 'recovered') lines.unshift('This device has taken over Player 3. Your role is the same: reveal it here, then press Ready again on this device.');
        if (data.phase === 'backgrounded') lines.unshift('Hidden while you were away from this screen.');
        dockBody = null;
        break;
      case 'revealed':
        card = h('div', { class: 'j-private j-cardslot j-role-surface', id: 'j-role-view' }, roleCard(role, me.character),
          h('button', { type: 'button', class: 'j-reveal-toggle', 'data-to': 'reveal.concealed', 'aria-label': say('hideMine'), 'aria-expanded': 'true', 'aria-controls': 'j-role-view' }));
        lines = [];
        dockBody = [ready(false)];
        break;
      case 'sending':
        card = cardBack({});
        lines = ['Confirming your readiness…'];
        dockBody = [btn('Confirming…', { primary: true, wide: true, disabled: true })];
        break;
      case 'retry':
        card = cardBack({});
        lines = [];
        dockBody = [btn(say('readyAgain'), { primary: true, wide: true, to: 'reveal.ready-early' })];
        break;
      case 'ready-early': case 'waiting': case 'everyone':
        card = h('div', { class: 'j-ready-mark', role: 'status', 'aria-label': say('readyWaiting') }, h('span', { 'aria-hidden': 'true' }, '✓'));
        lines = [];
        dockBody = null;
        break;
      case 'reconnecting':
        card = cardBack({ note: 'Hidden' });
        dockBody = null;
        break;
      default: card = cardBack({});
    }
    return screen({ surface: 'player', conn: data.phase === 'reconnecting' ? 'stale' : 'live', noMast: true, main: [
      banner,
      head(data.assigned ? 'Your character and role' : 'Your role card', data.timer),
      bar(data.timer),
      h('div', { class: 'j-cardslot' }, card),
      lines.map(line => h('p', { class: 'j-vh', role: 'status' }, line)),
      data.phase === 'retry' ? h('p', { class: 'j-vh', role: 'status' }, say('readyUncertain')) : null],
    dock: dockBody ? dock(...dockBody) : null });
  },

  devices() {
    const roles = Object.keys(ROLE_LOOK);
    return screen({ surface: 'player', wide: true, mastLabel: 'Reference sheet', main: [
      caption('The nine role cards'),
      notice('A review sheet, not a screen: each card is what one seat sees, privately, when it turns its own card up. The character differs from card to card to show that any of the nine may hold any device.', 'info'),
      h('div', { class: 'j-private', style: { 'grid-template-columns': 'repeat(auto-fill, minmax(17rem, 1fr))', 'align-items': 'start' } },
        roles.map((role, index) => h('section', { class: 'j-cardslot', 'aria-label': role }, roleCard(role, CREW[index].id), h('p', { class: 'j-guide' }, ROLE_GUIDE[role]))))] });
  },

  game(data, ctx) {
    const viewer = data.viewer ?? VIEWER;
    const self = data.seats.find(seat => seat.n === viewer);
    const sheetOpen = ctx.sheet === null ? false : ctx.sheet === true ? true : Boolean(data.sheet);
    const sheet = data.sheet ?? { role: roleOf(viewer), card: { kind: 'idle', offers: data.phase.kind === 'ORDINARY_TURN' && data.phase.active === viewer ? [['Move', 'available', say('chooseMove')], ['Shot', 'available', say('chooseTarget')]] : [['Move', 'unavailable', null], ['Shot', 'unavailable', null]] } };
    const own = data.phase.kind === 'ORDINARY_TURN' && data.phase.active === viewer;
    const out = self.health === 'Eliminated';
    const voter = data.vote && data.vote.kind !== 'RELEASE_CHOICE' && !out;
    let turn;
    if (data.stale) turn = { what: 'Reconnecting', sub: say('pausedStale') };
    else if (data.unsynced) turn = { what: 'Syncing time', sub: say('pausedUnsynced') };
    else if (out) turn = { what: 'You are out', sub: 'You can keep watching the match.' };
    else if (own) turn = { what: 'Your turn', sub: 'Open your private card to act.', mine: true };
    else if (data.phase.kind === 'ORDINARY_TURN') turn = { what: `${nameOf(data.seats.find(s => s.n === data.phase.active))}’s turn`, sub: 'Your card stays closed until you open it.' };
    else if (data.phase.kind === 'HACK') turn = { what: 'Hack', sub: 'A Hack conversation is in progress.' };
    else if (data.phase.kind === 'RELEASE_CHOICE') turn = { what: 'Release choice', sub: `Player ${data.vote.chooser} decides.` };
    else if (data.phase.kind === 'SHOWDOWN') turn = { what: 'Showdown', sub: 'Every player still in has one showdown shot.' };
    else if (voter) turn = { what: PHASE[data.phase.kind], sub: 'You may vote. Your ballot is private.', mine: true };
    else turn = { what: PHASE[data.phase.kind], sub: '' };
    const statusBits = [self.location, self.health, self.jailed && 'Jailed', self.captain && 'Captain', self.revealed && `Revealed: ${self.revealed}`].filter(Boolean);
    const selfLine = h('p', { class: 'j-self' },
      h('span', { class: 'j-self__who' }, face(self), h('span', null, h('span', { class: 'j-tag' }, viewer), ' ', nameOf(self), vh(' (you)'))),
      statusBits.map(bit => chip(bit, bit === 'Injured' ? 'wait' : bit === 'Eliminated' ? 'out' : ['Captain', 'Jailed'].includes(bit) || bit.startsWith('Revealed') ? 'square' : null)));
    const toast = data.toast ? notice(data.toast, 'ok') : null;
    const main = [
      data.stale ? h('p', { class: 'j-notice', 'data-kind': 'problem', role: 'alert' }, say('stale')) : null,
      toast,
      summaryPanel(data.summary),
      votePanel(data.vote, data.seats),
      tallyPanel(data.tally, data.seats),
      board(data.seats, { viewer, active: data.phase.active, picking: data.picking ? { ...data.picking, picked: ctx.pickedRoom ?? data.picking.picked } : null, final: data.final, stale: data.stale, moving: data.moving }),
      selfLine,
      readable(data.seats, viewer, data.readableOpen),
    ];
    return screen({ surface: 'player', conn: data.stale ? 'stale' : 'live', noMast: true, before: [phaseStrip(data, viewer)], main,
      overlay: sheetOpen && !out ? privateSheet(sheet, data, viewer) : null,
      dock: dock(h('div', { class: 'j-dock__pair' },
        h('div', { class: 'j-turn', 'data-mine': turn.mine || null, role: 'status' }, h('span', { class: 'j-turn__what' }, turn.what), turn.sub ? h('span', { class: 'j-turn__sub' }, turn.sub) : null),
        out ? null : btn('Private card', { act: 'open-private', glyph: 'private-closed', attrs: { class: 'j-btn j-privbtn', 'aria-expanded': String(sheetOpen) } }))) });
  },

  system(data) {
    const v = {
      loading: { cap: null, glyph: '…', heading: 'Connecting', lines: [say('connecting')] },
      unconfirmed: { cap: 'Access', glyph: '?', heading: say('unconfirmed'), lines: [say('unconfirmed1'), 'This can pass, so try again. It also happens when a seat has been moved to another device: the device it was moved from is then no longer in the match. If you did not expect it, ask the host.'], button: say('tryAgain') },
      'no-access': { cap: 'Access', glyph: '!', heading: say('noAccess'), lines: [say('noAccess1'), say('noAccess2')] },
      incompatible: { cap: 'Update', glyph: '↻', heading: say('updateRequired'), lines: [say('incompatible1'), say('incompatible2')], button: 'Reload' },
      'moved-in': { cap: 'Seat taken over', glyph: '✓', heading: 'This device now holds Player 3', lines: [say('takenOver'), 'Your seat, character and role are unchanged. If setup is still running, reveal your card and press Ready on this device.'] },
    }[data.variant];
    return screen({ surface: 'player', main: [v.cap ? caption(v.cap) : null,
      h('section', { class: 'j-panel j-system', role: 'status' }, h('span', { class: 'j-system__glyph', 'aria-hidden': 'true' }, v.glyph), h('h2', { class: 'j-sheet__title' }, v.heading), v.lines.map(line => h('p', null, line)))],
    dock: v.button ? dock(btn(v.button, { primary: true, wide: true })) : null });
  },

  end(data) {
    if (data.aborted) {
      return screen({ surface: 'player', main: [caption(say('abortedPhase')),
        h('section', { class: 'j-result' }, h('p', { class: 'j-result__line' }, 'No winner'), h('p', { class: 'j-result__sub' }, say('aborted'))),
        h('p', { class: 'j-lede' }, 'Nothing was revealed: a match the host ends shows no roles and no Code.'),
        h('p', { class: 'j-quiet' }, say('matchOver'))],
      dock: dock(btn('Join a new game', { primary: true, wide: true, to: 'join.code' })) });
    }
    return screen({ surface: 'player', main: endContent(data), dock: dock(btn('Join a new game', { primary: true, wide: true, to: 'join.code' })) });
  },

  'display-admit'() {
    return screen({ surface: 'display', wide: true, main: [caption('Shared display'),
      h('section', { class: 'j-panel j-stack' }, h('p', { class: 'j-kicker' }, 'Give this identifier to the host'), h('p', { class: 'j-displayid' }, SYNTHETIC_IDS.display), h('p', { class: 'j-card__text' }, 'The host admits this screen. It then shows the public board only: no roles, ever.')),
      h('label', { class: 'j-field' }, h('span', { class: 'j-field__label' }, 'Match identifier, from the host'), h('input', { class: 'j-input', type: 'text', value: SYNTHETIC_IDS.match })),
      btn('Show this match', { primary: true })] });
  },

  'display-setup'(data) {
    const done = data.seats.filter(seat => seat.state === 'confirmed').length;
    return screen({ surface: 'display', wide: true, main: [
      head('Choosing characters', data.timer, { sticky: false }),
      bar(data.timer),
      h('p', { class: 'j-lede' }, say('unconfirmedAssigned')),
      h('p', { class: 'j-progress__count' }, `${done} of ${data.seats.length} confirmed`),
      h('ol', { class: 'j-slots j-slots--wide' }, data.seats.map(seat => slot(seat)))] });
  },

  'display-board'(data) {
    return screen({ surface: 'display', wide: true, before: [phaseStrip(data, null)], main: [
      h('div', { class: 'j-game' },
        board(data.seats, { viewer: null, active: data.phase.active, wide: true }),
        h('div', { class: 'j-game__side' }, tallyPanel(data.tally, data.seats), readable(data.seats, null, true)))] });
  },

  'display-result'(data) {
    return screen({ surface: 'display', wide: true, main: endContent({ winner: data.winner, alien: data.alien, reveal: true }) });
  },
};

/** How a match ended, the same words on every phone and the display. */
function endContent(data) {
  const seats = END_REVEAL.roles;
  const winnerLine = data.winner === 'Draw' ? say('draw') : say('blue');
  const team = data.winner === 'Draw' ? 'none' : data.winner.toLowerCase();
  const reveal = data.reveal ? h('section', { class: 'j-panel j-stack', 'aria-labelledby': 'j-rev-h' },
    h('h2', { class: 'j-kicker', id: 'j-rev-h' }, 'Final reveal · Roles'),
    h('table', { class: 'j-table j-reveal' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, vh('Character')), h('th', { scope: 'col' }, 'Player'), h('th', { scope: 'col' }, 'Role'))),
      h('tbody', null, seats.map(seat => {
        const look = ROLE_LOOK[seat.role];
        return h('tr', { 'data-self': seat.n === VIEWER || null }, h('td', null, face(seat)), h('th', { scope: 'row' }, `${seat.n} · ${nameOf(seat)}${seat.n === VIEWER ? ' (you)' : ''}`),
          h('td', null, h('span', { class: 'j-swatch', 'data-team': look.team.toLowerCase(), 'aria-hidden': 'true' }), seat.role, look.team === 'Alien' ? null : h('span', { class: 'j-quiet' }, ` · ${look.team}`)));
      }))),
    h('p', { class: 'j-card__text' }, `The Code was: ${END_REVEAL.code.map(n => `Player ${n}`).join(', ')}.`)) : null;
  return [
    caption('Match finished'),
    h('section', { class: 'j-result', 'aria-live': 'polite' },
      h('p', { class: 'j-result__line' }, h('span', { class: 'j-swatch', 'data-team': team, 'aria-hidden': 'true' }), winnerLine),
      data.alien && data.winner === 'Blue' ? h('p', { class: 'j-result__sub' }, h('span', { class: 'j-swatch', 'data-team': 'alien', 'aria-hidden': 'true' }), say('alienWithBlue')) : null),
    reveal,
    data.next ? h('section', { class: 'j-panel j-stack' }, h('p', { class: 'j-kicker' }, 'Play again'), h('p', null, 'A new game is a new match: the host creates a lobby with a new room code, and everyone joins it and chooses again. Nothing of this match is reset or reused.')) : null];
}

function qrPlaceholder() {
  // Deliberately not a QR code: a labeled stand-in, so nobody mistakes it for a working one.
  return h('span', { class: 'j-qr__stand-in', 'aria-hidden': 'true' }, 'QR code', h('br'), 'not generated');
}

/** Draws one state. `ctx.names` 'long' swaps in the longest names; `ctx.sheet` forces the private sheet open or closed. */
export function render(stateId, ctx = {}) {
  const fixture = FIXTURES[stateId];
  if (!fixture) throw new Error(`No fixture for ${stateId}`);
  NAMES = ctx.names === 'long' ? LONG_NAMES : null;
  const data = { ...fixture.data, ...(ctx.override ?? {}) };
  if (ctx.card && data.sheet) data.sheet = { ...data.sheet, card: ctx.card };
  const node = VIEWS[fixture.view](data, ctx);
  node.dataset.state = stateId;
  return node;
}

export function surfaceOf(stateId) { return FIXTURES[stateId]?.surface ?? 'player'; }

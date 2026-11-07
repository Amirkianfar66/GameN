// mothership:dev-only
//
// Library group 6's review page: the Captain's Officer appointment, the Officer's movement block,
// the public strip's office stages, the office badges (the reviewed Captain badge beside the new
// Officer and block badges) and the board's block marker, each computed by states.mjs from a
// synthetic player view (protocol 3 candidate shape). Motion players run motion.mjs. A review page:
// synthetic fixtures, no server, never a client. The frame is ../review.mjs.

import { OFFICE_COPY as C } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { APPOINT_STATES, BLOCK_STATES, appointState, badges, blockState, publicStage, selfBlocked } from './states.mjs';
import { buttons, card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';
import { seatIdOf, seatNumber } from '../seats.mjs';

// ---------- the synthetic match (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
/** A seat in words, from its canonical id (the views and the commands carry ids; the words show numbers). */
const who = id => `Player ${seatNumber(id)}, ${NAMES[seatNumber(id) - 1]}`;
const CAPTAIN = 'seat-7', OFFICER = 'seat-3', BLOCKED = 'seat-5';
/** The page's shorthand: a player number stands for its seat's canonical id. */
const id = x => (typeof x === 'number' ? seatIdOf(x) : x);

/** A view with only what the state map reads, every field named as the contract names it. */
function view({ seat = CAPTAIN, phase = 'ORDINARY_TURN', round = 4, captain = CAPTAIN, officer = OFFICER, blocked = null, offers = {} }) {
  return {
    round, phase: { id: `r${round}-${phase}`, kind: phase }, self: { seatId: id(seat) },
    offices: { captainSeatId: id(captain), officerSeatId: id(officer), blockedSeatId: id(blocked) },
    offers: Object.entries(offers).map(([type, targetSeatIds]) => ({ type, targetSeatIds: targetSeatIds.map(id), slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const fieldText = (v, extra = '') => `round ${v.round} · ${v.phase.kind} · ${v.self.seatId} (${NAMES[seatNumber(v.self.seatId) - 1]}) · offices {captain ${v.offices.captainSeatId ?? 'null'}, officer ${v.offices.officerSeatId ?? 'null'}, blocked ${v.offices.blockedSeatId ?? 'null'}} · offers [${v.offers.map(o => `${o.type} [${o.targetSeatIds.join(',')}]`).join('; ')}]${extra}`;

// ---------- parts ----------

const ICONS = { captain: 'var(--ms-asset-marker-captain-badge)', officer: 'var(--of-asset-of-badge-officer)', blocked: 'var(--of-asset-of-badge-blocked)' };
const badgeIcon = (kind, size = 'of-badge') => el('span', { class: `${size} of-badge--${kind}`, 'aria-hidden': 'true', style: `--of-art: ${ICONS[kind]}` });
const LABEL = { captain: C.captain, officer: C.officer, blocked: C.blockedBadge };
/** A name tag with its badges, each badge named in words beside it. */
function tag(v, seat) {
  const list = badges(v, seat);
  return el('span', { class: 'of-tag' }, el('b', {}, who(seat)), ...list.map(kind => el('span', { class: `of-tag__badge of-tag__badge--${kind}` }, badgeIcon(kind), LABEL[kind])));
}
/** A board seat: a stand-in figure (labelled so), its name tag, and the tape at its feet when blocked. */
function boardSeat(v, seat, { tape = null } = {}) {
  const blocked = v.offices.blockedSeatId === seat;
  const figure = el('span', { class: 'of-figure', 'aria-hidden': 'true' });
  const tapeNode = blocked || tape ? (tape ?? el('span', { class: 'of-tape', 'aria-hidden': 'true' })) : null;
  return el('div', { class: 'of-seat', role: 'img', 'aria-label': `${who(seat)}${badges(v, seat).map(k => `, ${LABEL[k]}`).join('')}` },
    el('div', { class: 'of-stand' }, figure, tapeNode, ...badges(v, seat).filter(k => k !== 'blocked').map(k => badgeIcon(k, 'of-badge of-badge--float'))),
    tag(v, seat));
}
const playerButtons = (targets, picked) => el('div', { class: 'of-players', role: 'group', 'aria-label': 'Players' }, targets.map(t => el('button', { type: 'button', class: 'ab-button of-player', 'data-seat-id': t, 'aria-pressed': t === picked ? 'true' : 'false' }, who(t))));

// ---------- the Captain's appointment ----------

function appointView(s) {
  const T = C.tapeAppoint;
  switch (s.state) {
    case 'choose': return strip(T, null, words(C.appointChoose), playerButtons(s.targets, null), el('p', { class: 'of-note' }, C.officeNote));
    case 'confirm': return strip(T, null, words(C.appointConfirm(who(s.target))), playerButtons(s.targets, s.target), buttons(C.appoint, C.back), el('p', { class: 'of-note' }, C.officeNote));
    case 'sending': return strip(T, C.stampSending, words(C.appointSending));
    case 'appointed': return strip(T, C.stampAppointed, el('div', { class: 'of-result' }, badgeIcon('officer', 'of-badge of-badge--big'), words(C.appointDone(who(s.officer)))));
    case 'refused': return strip(T, null, words(C.appointRefused), s.targets.length ? playerButtons(s.targets, null) : null);
    case 'vacant': return strip(T, null, words(C.vacant));
    case 'closed': return strip(T, null, words(C.appointClosed));
    default: return el('p', { class: 'of-none' }, 'Nothing is drawn: the appointment is only on the Captain\'s phone, during its 30 seconds.');
  }
}
function captainCases() {
  const eligible = [1, 2, 3, 4, 5, 6];
  const v = (opts = {}) => view({ phase: 'OFFICER_APPOINTMENT', officer: null, offers: { APPOINT_OFFICER: eligible }, ...opts });
  const add = (labelText, vv, opts = {}) => {
    const s = appointState(vv, opts);
    return card(`appointment: ${s.state}${labelText ? ` (${labelText})` : ''}`, fieldText(vv, opts.picked ? ` · picked ${opts.picked} here` : opts.pending ? ` · pending ${opts.pending}` : opts.rejected ? ' · rejected here NOT_ALLOWED' : ''), appointView(s));
  };
  return [
    add('six eligible players', v()),
    add('', v(), { picked: 'seat-3' }),
    add('', v(), { pending: 'APPOINT_OFFICER', picked: 'seat-3' }),
    add('the view names the Officer', v({ officer: 3, offers: {} })),
    add('NOT_ALLOWED', v(), { rejected: { APPOINT_OFFICER: { phaseId: 'r4-OFFICER_APPOINTMENT', code: 'NOT_ALLOWED' } } }),
    add('no eligible player', v({ offers: { APPOINT_OFFICER: [] } })),
    add('the window closing', v({ offers: {} })),
    add('not the Captain', view({ seat: 2, phase: 'OFFICER_APPOINTMENT', officer: null })),
  ];
}

// ---------- the Officer's block ----------

function blockView(s) {
  const T = C.tapeBlock;
  switch (s.state) {
    case 'choose': return strip(T, null, words(C.blockChoose), playerButtons(s.targets, null));
    case 'confirm': return strip(T, null, words(C.blockConfirm(who(s.target))), playerButtons(s.targets, s.target), buttons(C.block, C.back));
    case 'sending': return strip(T, C.stampSending, words(C.blockSending));
    case 'blocked': return strip(T, C.stampBlocked, el('div', { class: 'of-result' }, badgeIcon('blocked', 'of-badge of-badge--big'), words(C.blockDone(who(s.target)))));
    case 'refused': return strip(T, null, words(C.blockRefused));
    case 'closed': return strip(T, null, words(C.blockClosed));
    default: return el('p', { class: 'of-none' }, 'Nothing is drawn: the block is only on the Officer\'s phone, during the 15-second pre-turn window.');
  }
}
function officerCases() {
  const targets = [1, 2, 4, 5, 6, 7, 8];
  const v = (opts = {}) => view({ seat: OFFICER, phase: 'PRE_TURN', offers: { BLOCK_MOVE: targets }, ...opts });
  const add = (labelText, vv, opts = {}) => {
    const s = blockState(vv, opts);
    return card(`block: ${s.state}${labelText ? ` (${labelText})` : ''}`, fieldText(vv, opts.picked ? ` · picked ${opts.picked} here` : opts.pending ? ` · pending ${opts.pending}` : opts.rejected ? ' · rejected here NOT_ALLOWED' : ''), blockView(s));
  };
  return [
    add('last round\'s target left out by the offer', v()),
    add('', v(), { picked: BLOCKED }),
    add('', v(), { pending: 'BLOCK_MOVE', picked: BLOCKED }),
    add('the view names the block', v({ blocked: BLOCKED, offers: {} })),
    add('NOT_ALLOWED', v(), { rejected: { BLOCK_MOVE: { phaseId: 'r4-PRE_TURN', code: 'NOT_ALLOWED' } } }),
    add('no offer', v({ offers: {} })),
    add('not the Officer', view({ seat: 2, phase: 'PRE_TURN' })),
  ];
}

// ---------- the public strip and the board ----------

function publicStrip(v) {
  const s = publicStage(v);
  const line = s.stage === 'appointing' ? C.appointing : s.stage === 'pre-turn' ? C.preTurn : s.stage === 'quiet' ? C.quiet : v.offices.officerSeatId !== null ? C.officerIs(who(v.offices.officerSeatId)) : C.noOfficer;
  const blockLine = v.offices.blockedSeatId !== null ? el('p', { class: 'of-public-block' }, badgeIcon('blocked'), C.blockedIs(who(v.offices.blockedSeatId))) : null;
  const seats = [v.offices.captainSeatId, v.offices.officerSeatId, v.offices.blockedSeatId, 'seat-1'].filter((n, i, a) => n !== null && a.indexOf(n) === i);
  return strip(C.tapeOffices, null, el('p', { class: 'of-public' }, line), blockLine, el('div', { class: 'of-board' }, seats.map(n => boardSeat(v, n))),
    selfBlocked(v) ? el('p', { class: 'of-self' }, C.selfBlocked) : null);
}
function publicCases() {
  return [
    card('public: the appointment window', fieldText(view({ seat: 1, phase: 'OFFICER_APPOINTMENT', officer: null })), publicStrip(view({ seat: 1, phase: 'OFFICER_APPOINTMENT', officer: null }))),
    card('public: the Officer appointed', fieldText(view({ seat: 1 })), publicStrip(view({ seat: 1 }))),
    card('public: no Officer this term', fieldText(view({ seat: 1, officer: null })), publicStrip(view({ seat: 1, officer: null }))),
    card('public: the pre-turn window, with an Officer', fieldText(view({ seat: 1, phase: 'PRE_TURN' })), publicStrip(view({ seat: 1, phase: 'PRE_TURN' }))),
    card('public: the pre-turn window, no Officer (the same 15 s)', fieldText(view({ seat: 1, phase: 'PRE_TURN', officer: null })), publicStrip(view({ seat: 1, phase: 'PRE_TURN', officer: null }))),
    card('public: a block this round', fieldText(view({ seat: 1, blocked: BLOCKED })), publicStrip(view({ seat: 1, blocked: BLOCKED }))),
    card('public: the blocked player\'s own phone', fieldText(view({ seat: BLOCKED, blocked: BLOCKED })), publicStrip(view({ seat: BLOCKED, blocked: BLOCKED }))),
    card('public: the next round, the block expired', fieldText(view({ seat: 1, round: 5 })), publicStrip(view({ seat: 1, round: 5 }))),
  ];
}

// ---------- the badge family ----------

function badgeCards() {
  const row = (kind, about) => el('div', { class: 'of-family' }, badgeIcon(kind, 'of-badge of-badge--big'), badgeIcon(kind), badgeIcon(kind, 'of-badge of-badge--small'), el('p', {}, el('b', {}, LABEL[kind]), ` · ${about}`));
  const tray = (icon, title, sub) => el('div', { class: 'of-tray' }, el('span', { class: `of-icon of-icon--${icon}`, 'aria-hidden': 'true' }), el('div', {}, el('strong', {}, title), el('span', {}, sub)));
  return [
    card('badges: the offices and the block', 'the reviewed Captain badge (marker-captain.badge, unchanged) beside the new Officer and block badges, at 48, 36 and 24 px', el('div', { class: 'of-families' },
      row('captain', 'the reviewed board badge, unchanged'), row('officer', 'two chevrons: a public office, never a role'), row('blocked', 'a dashed rim: a state that ends with the round'))),
    card('tray: the appointment and the block', 'the Captain\'s entry during OFFICER_APPOINTMENT; the Officer\'s during PRE_TURN', el('div', { class: 'of-trays' }, tray('appoint', C.tapeAppoint, '30 seconds'), tray('block', C.tapeBlock, 'Before the turns'))),
  ];
}

// ---------- motion players ----------

function motionPlayer(kind) {
  const caption = { appoint: 'when a seat newly holds the Officer office', block: 'when a seat is newly blocked (public)', expire: 'when the block ends with its round' }[kind];
  return {
    caption: `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · ${caption}`,
    end: reduced => motionEnd(kind, reduced),
    build: stage => {
      const v = view({ seat: 1, officer: kind === 'appoint' ? OFFICER : OFFICER, blocked: kind === 'appoint' ? null : BLOCKED });
      const seat = kind === 'appoint' ? OFFICER : BLOCKED;
      const tape = el('span', { class: 'of-tape', 'aria-hidden': 'true' });
      const node = boardSeat(v, seat, { tape: kind === 'appoint' ? null : tape });
      const pin = node.querySelector('.of-badge--float');
      const ring = el('span', { class: 'of-ring', 'aria-hidden': 'true' });
      if (pin) pin.append(ring);
      stage.append(el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, el('span', { class: 'lib-tape' }, C.tapeOffices)), el('div', { class: 'of-board' }, node)));
      return {
        seek: (t, reduced) => {
          const F = FRAMES[kind](t, { reduced });
          if (kind === 'appoint' && pin) {
            Object.assign(pin.style, { opacity: String(F.badge.opacity), transform: `rotate(${F.badge.rotate}deg) scale(${F.badge.scale})` });
            Object.assign(ring.style, { opacity: String(F.ring.opacity), transform: `scale(${F.ring.scale})` });
          } else if (kind !== 'appoint') {
            Object.assign(tape.style, { opacity: String(F.tape.opacity), clipPath: `inset(0 ${(1 - F.tape.reveal) * 100}% 0 0)`, translate: `-50% ${F.tape.drop}px` });
          }
        },
      };
    },
  };
}

// ---------- the page ----------

async function main() {
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [new URL('./assets/offices.art.css', import.meta.url).href, 'offices'],
  ]);
  mountPage({
    title: 'Library group 6: offices',
    intro: `Every state is computed by states.mjs from a synthetic player view (protocol 3 candidate fields). Gus (7) is Captain, Cleo (3) the Officer, Eli (5) the player blocked in the round that has a block. Figures on the board are stand-ins, labelled so. Appointment states: ${APPOINT_STATES.join(', ')}. Block states: ${BLOCK_STATES.join(', ')}. Words are proposals for Frontend.`,
    groups: [
      ['captain', 'The Captain\'s Officer appointment (30 s)', captainCases],
      ['officer', 'The Officer\'s movement block (the 15-second pre-turn window)', officerCases],
      ['public', 'The public strip, name tags and the board\'s block marker', publicCases],
      ['badges', 'The badge family, and the tray', badgeCards],
      ['motion', 'Motion (once, on its cause)', () => ['appoint', 'block', 'expire'].map(kind => player(kind, kind, motionPlayer(kind)))],
    ],
  });
}

main().catch(failed);

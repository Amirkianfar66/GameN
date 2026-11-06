// mothership:dev-only
//
// Library group 4's review page: the giver's composer, the recipient's inbox and the ledger of a
// seat's Promises, each computed by states.mjs from a synthetic player view (protocol 3 candidate
// shape) and drawn with this group's art (assets/promises.art.css) and the dossier's parts. Motion
// players run motion.mjs. A review page: synthetic fixtures, no server, never a client. The frame
// is ../review.mjs.

import { KIND_FILES, SEAL_FILES, platePercent } from './art.mjs';
import { BLURBS, PENDING_R13, PROMISE_COPY as C, TITLES, decided, label, result, term } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { COMPOSER_STATES, INBOX_STATES, KINDS, composerState, inboxState, ledger } from './states.mjs';
import { buttons, card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';

// ---------- the synthetic match (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const name = n => NAMES[n - 1];
const HANA = 8, CLEO = 3, ELI = 5;

/** A view with only what the state map reads, every field named as the contract names it. */
function view({ seat = HANA, round = 4, phase = 'HACK', offers = [], recipients = [CLEO], targets = [1, 2, 3, 4, 5, 6, 7, 9], promises = [] }) {
  return {
    round, playerCount: 9, phase: { id: `r${round}-${phase}`, kind: phase, startedAt: 0, endsAt: null }, self: { seatId: seat },
    offers: offers.map(type => ({ type, targetSeatIds: type === 'OFFER_PROMISE' ? recipients : [], slotIds: [], windowIds: [], promiseTargetSeatIds: type === 'OFFER_PROMISE' ? targets : [] })),
    promises, promiseQuota: { given: false, received: false },
  };
}
let serial = 0;
const promise = (fields) => ({ id: `promise-${++serial}`, giverSeatId: HANA, recipientSeatId: CLEO, targetSeatId: null, round: 4, electionId: null, accepted: false, status: 'Pending', offerStatus: 'offered', ...fields, ...(fields.offerStatus === 'accepted' ? { accepted: true } : {}) });
const election = kind => (kind === 'CAPTAIN_SUPPORT' || kind === 'OFFICER_SELECTION' ? 'election-r5' : null);
const fieldText = (v, extra = '') => `round ${v.round} · ${v.phase.kind} · seat ${v.self.seatId} (${name(v.self.seatId)}) · offers [${v.offers.map(o => o.type).join(', ')}] · promises [${v.promises.map(p => `${p.kind} ${p.giverSeatId}→${p.recipientSeatId}${p.targetSeatId ? ` target ${p.targetSeatId}` : ''} ${p.offerStatus}${p.offerStatus === 'accepted' ? ` ${p.status}` : ''}`).join('; ')}]${extra}`;

// ---------- the card ----------

const art = (cls, file, extra = {}) => el('span', { class: cls, 'aria-hidden': 'true', style: `--pr-art: var(--pr-asset-${file})`, ...extra });
/** A kind's icon, with the room letter as page text on a door's plate. */
function kindIcon(kind, cls = 'pr-kind') {
  const node = art(cls, KIND_FILES[kind]);
  if (kind === 'MEET_A' || kind === 'MEET_B') {
    const p = platePercent();
    node.append(el('span', { class: 'pr-plate', style: `left:${p.left}%;top:${p.top}%;width:${p.width}%;height:${p.height}%` }, kind === 'MEET_A' ? 'A' : 'B'));
  }
  return node;
}
const labelsFor = (record, reader) => ({ giver: label(record.giver, reader, name), recipient: label(record.recipient, reader, name), target: record.target ? label(record.target, reader, name) : null, round: record.round });

/** A Promise card: its band (icon and title), the exact term, its fields, and (once accepted) its seal and status. */
function promiseCard(record, reader, { status = null, note = null } = {}) {
  const t = labelsFor(record, reader);
  const fields = el('dl', { class: 'pr-fields' },
    el('dt', {}, C.from), el('dd', {}, t.giver === 'you' ? 'You' : t.giver),
    el('dt', {}, C.to), el('dd', {}, t.recipient === 'you' ? 'You' : t.recipient),
    record.kind === 'JAIL_VOTE' ? [el('dt', {}, C.target), el('dd', {}, t.target === 'you' ? 'You' : t.target)] : null,
    el('dt', {}, C.when), el('dd', {}, decided(record.kind, t).replace(/^Decided /, '').replace(/^by /, 'By ').replace(/^when /, 'When ')));
  return el('article', { class: 'pr-card', 'data-kind': record.kind, 'aria-label': `${TITLES[record.kind]} Promise` },
    el('header', { class: 'pr-band' }, kindIcon(record.kind), el('h3', { class: 'pr-title' }, TITLES[record.kind])),
    el('p', { class: 'pr-term' }, term(record.kind, t)),
    fields,
    status ? el('div', { class: 'pr-status' }, art('pr-seal', SEAL_FILES[status]), el('p', {}, result(record.kind, status, t))) : null,
    note ? el('p', { class: 'pr-note' }, note) : null);
}

// ---------- the composer (giver) ----------

function chooser(s, reader) {
  const tile = kind => el('button', { type: 'button', class: 'pr-tile', 'aria-pressed': 'false' }, kindIcon(kind, 'pr-tile__icon'), el('span', { class: 'pr-tile__text' }, el('strong', {}, TITLES[kind]), el('span', {}, BLURBS[kind])));
  return el('div', { class: 'pr-tiles', role: 'group', 'aria-label': 'Promise cards' }, KINDS.map(tile));
}
const noteText = (note, reader) => {
  if (!note) return null;
  const who = label(note.partner, reader, name);
  if (note.offer === 'declined') return note.side === 'received' ? C.noteDeclinedReceived(who) : C.noteDeclinedGiven(who);
  return note.side === 'received' ? C.noteExpiredReceived(who) : C.noteExpiredGiven(who);
};

/** The composer strip for a state from composerState(). */
export function composerView(s, v) {
  const reader = v.self.seatId;
  const R = s.recipient ? label(s.recipient, reader, name) : null;
  const note = s.note ? el('p', { class: 'pr-note' }, noteText({ ...s.note, side: 'given' }, reader)) : null;
  const draftRecord = (kind, target = null) => ({ kind, giver: reader, recipient: s.recipient, target, round: v.round });
  switch (s.state) {
    case 'closed': return strip(C.tape, null, words(C.closed), note, words(C.quotaGive, 'lib-note'));
    case 'given': return strip(C.tape, null, words(C.given));
    case 'choose': return strip(C.tape, null, words(R ? C.choose(R) : C.chooseWho), chooser(s, reader), note, words(C.quotaGive, 'lib-note'));
    case 'target': return strip(C.tape, null, words(C.chooseTarget), el('div', { class: 'pr-targets', role: 'group', 'aria-label': 'Jail vote target' }, s.targets.map(n => el('button', { type: 'button', class: 'ab-button pr-target' }, `${n} ${name(n)}`))), buttons(C.back));
    case 'review': return strip(C.tape, null, words(C.review(R)), promiseCard(draftRecord(s.kind, s.target), reader), buttons(C.offer, C.back), words(C.quotaGive, 'lib-note'));
    case 'sending': return strip(C.tape, C.stampSending, art('pr-envelope', 'pr-envelope'), words(C.sending));
    case 'waiting': return strip(C.tape, C.stampOffered, art('pr-envelope', 'pr-envelope'), words(C.waiting(label(s.record.recipient, reader, name))), promiseCard(s.record, reader));
    case 'refused': return strip(C.tape, null, words(C.refused), note);
    default: return null;
  }
}

function composerCases() {
  const out = [];
  const add = (labelText, v, opts = {}) => {
    const s = composerState(v, opts);
    const extra = [opts.pending ? ` · pending ${opts.pending}` : '', opts.draft ? ` · draft ${JSON.stringify(opts.draft).replace(/"/g, '')} here` : '', opts.rejected?.OFFER_PROMISE ? ` · rejected here ${opts.rejected.OFFER_PROMISE.code}` : ''].join('');
    out.push(card(`composer: ${s.state}${labelText ? ` (${labelText})` : ''}`, fieldText(v, extra), composerView(s, v)));
  };
  const talk = { offers: ['OFFER_PROMISE'] };
  add('outside private talk', view({ phase: 'ORDINARY_TURN' }));
  add('the six cards', view(talk));
  add('two players to choose from', view({ ...talk, recipients: [CLEO, ELI] }));
  add('Jail Vote picked', view(talk), { draft: { kind: 'JAIL_VOTE' } });
  for (const kind of KINDS) add(TITLES[kind], view(talk), { draft: { kind, target: kind === 'JAIL_VOTE' ? ELI : undefined } });
  add('', view(talk), { pending: 'OFFER_PROMISE', draft: { kind: 'MEET_A' } });
  add('', view({ promises: [promise({ kind: 'MEET_A' })] }));
  add('NOT_ALLOWED', view(talk), { rejected: { OFFER_PROMISE: { phaseId: 'r4-HACK', code: 'NOT_ALLOWED' } } });
  add('Cleo declined: nothing used', view({ ...talk, promises: [promise({ kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5', offerStatus: 'declined' })] }));
  add('not answered: nothing used', view({ phase: 'JAIL_VOTE', promises: [promise({ kind: 'NO_JAIL_VOTE', offerStatus: 'expired' })] }));
  add('the one given Promise is made', view({ ...talk, promises: [promise({ kind: 'JAIL_VOTE', targetSeatId: ELI, offerStatus: 'accepted' })] }));
  return out;
}

// ---------- the inbox (recipient) ----------

export function inboxView(s, v) {
  const reader = v.self.seatId;
  switch (s.state) {
    case 'none': return s.note ? strip(C.tape, null, el('p', { class: 'pr-note' }, noteText({ ...s.note, side: 'received' }, reader))) : el('p', { class: 'pr-none' }, 'Nothing is drawn: no offer awaits this seat\'s answer.');
    case 'incoming': return strip(C.tape, null, words(C.incoming(label(s.record.giver, reader, name))), promiseCard(s.record, reader), words(C.incomingRule, 'lib-note'), el('div', { class: 'lib-buttons pr-even' }, el('button', { type: 'button', class: 'ab-button' }, C.accept), el('button', { type: 'button', class: 'ab-button' }, C.decline)));
    case 'decline-only': return strip(C.tape, null, words(C.incoming(label(s.record.giver, reader, name))), promiseCard(s.record, reader), words(C.declineOnly, 'lib-note'), el('div', { class: 'lib-buttons pr-even' }, el('button', { type: 'button', class: 'ab-button' }, C.decline)));
    case 'answering': return strip(C.tape, C.stampSending, words(C.answering), promiseCard(s.record, reader));
    case 'locked': return strip(C.tape, null, words(C.locked), promiseCard(s.record, reader));
    default: return null;
  }
}

function inboxCases() {
  const out = [];
  const add = (labelText, v, opts = {}) => {
    const s = inboxState(v, opts);
    out.push(card(`inbox: ${s.state}${labelText ? ` (${labelText})` : ''}`, fieldText(v, opts.pending ? ` · pending ${opts.pending}` : ''), inboxView(s, v)));
  };
  const answer = { offers: ['ACCEPT_PROMISE', 'DECLINE_PROMISE'] };
  add('Jail Vote', view({ seat: CLEO, ...answer, promises: [promise({ kind: 'JAIL_VOTE', targetSeatId: ELI })] }));
  add('Captain Support', view({ seat: CLEO, ...answer, promises: [promise({ kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5' })] }));
  add('Meet in B', view({ seat: CLEO, ...answer, promises: [promise({ kind: 'MEET_B' })] }));
  add('the one received Promise is made', view({ seat: CLEO, offers: ['DECLINE_PROMISE'], promises: [promise({ giverSeatId: ELI, kind: 'OFFICER_SELECTION', electionId: 'election-r5', offerStatus: 'accepted' }), promise({ kind: 'NO_JAIL_VOTE' })] }));
  add('accepting', view({ seat: CLEO, ...answer, promises: [promise({ kind: 'OFFICER_SELECTION', electionId: 'election-r5' })] }), { pending: 'ACCEPT_PROMISE' });
  add('the talk has closed', view({ seat: CLEO, phase: 'JAIL_VOTE', promises: [promise({ kind: 'MEET_A' })] }));
  add('declined here: nothing used', view({ seat: CLEO, promises: [promise({ kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5', offerStatus: 'declined' })] }));
  add('nothing offered', view({ seat: CLEO }));
  return out;
}

// ---------- the ledger (both) ----------

function ledgerView(v) {
  const reader = v.self.seatId;
  const l = ledger(v);
  const slot = (record, title, empty) => (record
    ? el('div', { class: 'pr-slot' }, el('h4', {}, title(record)), promiseCard(record, reader, { status: record.status }), el('p', { class: 'pr-privacy' }, C.privacy))
    : el('div', { class: 'pr-slot pr-slot--empty' }, el('p', {}, empty)));
  return strip(C.tapeLedger, null,
    slot(l.given, r => C.givenTitle(label(r.recipient, reader, name)), C.givenEmpty),
    slot(l.received, r => C.receivedTitle(label(r.giver, reader, name)), C.receivedEmpty));
}

function ledgerCases() {
  const at = (seat, promises, round = 6, phase = 'ORDINARY_TURN') => view({ seat, round, phase, promises });
  const cases = [
    ['nothing made yet', at(HANA, [])],
    ['given: Meet in A, Pending', at(HANA, [promise({ kind: 'MEET_A', offerStatus: 'accepted', round: 6 })], 6, 'HACK')],
    ['given: Jail Vote, Fulfilled; received: Captain Support, Pending', at(HANA, [promise({ kind: 'JAIL_VOTE', targetSeatId: ELI, offerStatus: 'accepted', status: 'Fulfilled' }), promise({ giverSeatId: CLEO, recipientSeatId: HANA, kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5', offerStatus: 'accepted', round: 5 })])],
    ['the same pair from Cleo\'s phone', at(CLEO, [promise({ kind: 'JAIL_VOTE', targetSeatId: ELI, offerStatus: 'accepted', status: 'Fulfilled' }), promise({ giverSeatId: CLEO, recipientSeatId: HANA, kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5', offerStatus: 'accepted', round: 5 })])],
    ['given: Meet in B, Not fulfilled; received: Officer Selection, Condition not met', at(HANA, [promise({ kind: 'MEET_B', offerStatus: 'accepted', status: 'Not fulfilled' }), promise({ giverSeatId: ELI, recipientSeatId: HANA, kind: 'OFFICER_SELECTION', electionId: 'election-r5', offerStatus: 'accepted', status: 'Condition not met', round: 5 })])],
    ['given: Captain Support, Condition not met; received: No Jail Vote, Fulfilled', at(HANA, [promise({ kind: 'CAPTAIN_SUPPORT', electionId: 'election-r5', offerStatus: 'accepted', status: 'Condition not met', round: 5 }), promise({ giverSeatId: ELI, recipientSeatId: HANA, kind: 'NO_JAIL_VOTE', offerStatus: 'accepted', status: 'Fulfilled' })])],
    ['declined and not-answered offers are not records', at(HANA, [promise({ kind: 'MEET_B', offerStatus: 'declined' }), promise({ giverSeatId: ELI, recipientSeatId: HANA, kind: 'JAIL_VOTE', targetSeatId: CLEO, offerStatus: 'expired' })])],
  ];
  return cases.map(([labelText, v]) => card(`ledger (${labelText})`, fieldText(v), ledgerView(v)));
}

// ---------- the tray ----------

function trayCards() {
  const tray = el('div', { class: 'pr-tray' }, el('span', { class: 'pr-icon', 'aria-hidden': 'true' }), el('div', {}, el('strong', {}, 'Promises'), el('span', {}, 'One to give and one to receive')));
  const pending = Object.entries(PENDING_R13).map(([kind, why]) => el('li', {}, el('b', {}, TITLES[kind]), `: ${why}`));
  return [
    card('tray: Promises', 'the Actions tray entry, every player, the whole match', tray),
    card('words waiting on R13', 'the terms whose exact sense the contract does not state', el('ul', { class: 'pr-r13' }, pending)),
  ];
}

// ---------- motion players ----------

function motionPlayer(kind) {
  const caption = { offer: 'on the giver\'s accepted OFFER_PROMISE receipt', arrive: 'when an offer to this seat first appears', accept: 'when the Promise is first seen accepted (both phones)', decline: 'when first seen declined or not answered (both phones)', result: 'when first seen with a result, as its own opportunity closes (R6)' }[kind];
  return {
    caption: `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · ${caption}`,
    end: reduced => motionEnd(kind, reduced),
    build: stage => {
      const record = { kind: kind === 'decline' ? 'CAPTAIN_SUPPORT' : 'JAIL_VOTE', giver: HANA, recipient: CLEO, target: kind === 'decline' ? null : ELI, round: 4 };
      const reader = kind === 'arrive' ? CLEO : HANA;
      const t = labelsFor(record, reader);
      // accept and result animate the seal in the card's own status row, where it rests (never over the card's words).
      const cardNode = promiseCard(record, reader, kind === 'accept' || kind === 'result' ? { status: 'Pending' } : {});
      const box = el('div', { class: 'pr-stage' }, cardNode);
      const envelope = art('pr-envelope pr-envelope--float', 'pr-envelope');
      const row = cardNode.querySelector('.pr-status');
      const seal = row?.querySelector('.pr-seal') ?? null;
      const rowText = row?.querySelector('p') ?? null;
      const ring = el('span', { class: 'pr-ring', 'aria-hidden': 'true' });
      const after = art('pr-seal pr-seal--after', SEAL_FILES.Fulfilled);
      if (kind === 'accept') { seal.classList.add('pr-seal--anchor'); seal.append(ring); }
      if (kind === 'result') { seal.classList.add('pr-seal--anchor'); seal.append(after); }
      const mark = stamp({ offer: C.stampOffered, arrive: '', accept: C.stampPending, decline: C.stampDeclined, result: C.stampFulfilled }[kind]);
      if (kind === 'offer' || kind === 'arrive') box.append(envelope);
      stage.append(el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, el('span', { class: 'lib-tape' }, C.tape), kind === 'arrive' ? null : el('span', { class: 'lib-stamp-slot' }, mark)), box));
      return {
        seek: (time, reduced) => {
          const F = FRAMES[kind](time, { reduced });
          if (kind === 'offer') {
            Object.assign(cardNode.style, { opacity: String(F.card.opacity), transform: `translateY(${-30 * F.card.lift}%) scale(${F.card.scale})` });
            Object.assign(envelope.style, { opacity: String(F.envelope.opacity), transform: `translate(-50%, -50%) scale(${F.envelope.scale})` });
            Object.assign(mark.style, { opacity: String(F.done ? 1 : 0) });
          } else if (kind === 'arrive') {
            Object.assign(envelope.style, { opacity: String(F.envelope.opacity), transform: `translate(-50%, ${-50 - 60 * (1 - F.envelope.drop)}%)` });
            Object.assign(cardNode.style, { opacity: String(F.card.opacity), transform: `translateY(${20 * (1 - F.card.rise)}%)` });
          } else if (kind === 'accept') {
            Object.assign(seal.style, { opacity: String(F.seal.opacity), transform: `rotate(${F.seal.rotate}deg) scale(${F.seal.scale})` });
            Object.assign(ring.style, { opacity: String(F.ring.opacity), transform: `scale(${F.ring.scale})` });
            rowText.style.opacity = String(F.seal.opacity);
            Object.assign(mark.style, { opacity: String(F.done ? 1 : F.seal.opacity) });
          } else if (kind === 'decline') {
            Object.assign(cardNode.style, { opacity: String(F.card.opacity), transform: `rotate(${F.card.tilt}deg)` });
            Object.assign(mark.style, { opacity: String(F.stamp.opacity), transform: `rotate(${F.stamp.rotate}deg) scale(${F.stamp.scale})` });
          } else {
            // The Pending seal's own picture turns edge-on, the result's seal (stacked in the same place) turns face-on.
            seal.style.setProperty('--pr-before-turn', String(Math.max(0.001, F.before.turn)));
            seal.style.setProperty('--pr-before-opacity', String(F.before.opacity));
            Object.assign(after.style, { opacity: String(F.after.opacity), transform: `scaleX(${Math.max(0.001, F.after.turn)})` });
            rowText.textContent = F.after.opacity > 0 ? result(record.kind, 'Fulfilled', t) : result(record.kind, 'Pending', t);
            Object.assign(mark.style, { opacity: String(F.stamp.opacity), transform: `rotate(${F.stamp.rotate}deg) scale(${F.stamp.scale})` });
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
    [new URL('./assets/promises.art.css', import.meta.url).href, 'promises'],
  ]);
  mountPage({
    title: 'Library group 4: Promises',
    intro: `Every state is computed by states.mjs from a synthetic player view (protocol 3 candidate fields). Hana (8) and Cleo (3) are a private-talk pair; Eli (5) is a Jail Vote target. A Promise is pair-private: only its giver and recipient ever see it. Composer states: ${COMPOSER_STATES.join(', ')}. Inbox states: ${INBOX_STATES.join(', ')}. Words are proposals for Frontend; those marked R13 wait on the contract's meaning.`,
    groups: [
      ['composer', 'The giver\'s composer (private talk)', composerCases],
      ['inbox', 'The recipient\'s inbox (private talk)', inboxCases],
      ['ledger', 'The ledger: one given, one received', ledgerCases],
      ['others', 'The tray, and the words waiting on R13', trayCards],
      ['motion', 'Motion (once, on its cause, on the pair\'s phones only)', () => ['offer', 'arrive', 'accept', 'decline', 'result'].map(kind => player(kind, kind, motionPlayer(kind)))],
    ],
  });
}

main().catch(failed);

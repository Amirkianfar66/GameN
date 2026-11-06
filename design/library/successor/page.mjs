// mothership:dev-only
//
// Library group 8's review page, the successor sweep: the nine current role cards with their held
// devices under current names (the Doctor's reviewed art, the Engineer's new device; the removed
// Blue Officer's device never drawn), the action overlay's successor entries with their library
// marks, the lobby's compact host and join states at 320 x 568, the Round 3 Supply's private receipt,
// and the admission walk's plan. Synthetic fixtures; never a client. The frame is ../review.mjs.

import { SUCCESSOR_COPY as C } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { CURRENT_ROLES, OVERLAY, ROLE_DEVICES } from './names.mjs';
import { LOBBY_STATES, SUPPLY_EVENT, admissionPlan, inventoryAtRest, lobbyState, supplyReceipt } from './states.mjs';
import { buttons, card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const who = n => `Player ${n}, ${NAMES[n - 1]}`;

// ---------- role cards and the overlay ----------

function roleCard(role) {
  const d = ROLE_DEVICES[role];
  return el('figure', { class: 'sw-role' },
    el('div', { class: 'sw-role__picture' }, el('span', { class: 'sw-role__figure', 'aria-hidden': 'true' }), el('span', { class: 'sw-role__device', 'aria-hidden': 'true', style: `--sw-art: var(${d.property})` })),
    el('figcaption', {}, el('b', {}, role), el('span', {}, d.source === 'reviewed' ? `reviewed ${d.asset}${d.note ? ' (current name)' : ''}` : `new: ${d.asset}`)));
}
function roleCards() {
  return [
    card('role cards: the nine current roles', 'each card\'s held device: the reviewed exports under current names; the Engineer\'s device is new; the removed Blue Officer\'s device is never drawn', el('div', { class: 'sw-roles' }, CURRENT_ROLES.map(roleCard))),
    card('action overlay: successor entries', 'each command an offer names, its current label and its mark (a library group\'s, or the ability kit\'s unchanged icon)', el('ul', { class: 'sw-overlay' }, OVERLAY.map(o => el('li', {}, el('span', { class: 'sw-mark', 'aria-hidden': 'true', style: `--sw-art: var(${o.mark})` }), el('span', { class: 'sw-entry' }, el('b', {}, o.label), el('code', {}, o.command)), el('span', { class: 'sw-from' }, o.group ? `group ${o.group}` : 'ability kit'))))),
  ];
}

// ---------- the lobby ----------

const member = (n, controller = 'human', ready = false) => ({ seatId: n, displayName: NAMES[n - 1], characterId: null, controller, ready });
function snapshot({ isHost = false, selfSeatId = 2, players = 7, members = [member(1), member(2), member(3)], pending = [], status = 'lobby' }) {
  return { matchId: 'm1', roomCode: 'K7Q2ZD', status, playerCount: players, isHost, selfSeatId, members, pendingAdmissions: pending, setup: null, privateRole: null, publicView: null, playerView: null };
}
const codePlate = code => el('div', { class: 'sw-code', role: 'img', 'aria-label': `${C.codeLabel}: ${code.split('').join(' ')}` }, code.split('').map(ch => el('span', { 'aria-hidden': 'true' }, ch)));
const seatList = members => el('ol', { class: 'sw-seats' }, members.map(m => el('li', {}, el('b', {}, who(m.seatId)), m.controller === 'bot' ? el('span', { class: 'sw-tag' }, C.memberBot) : null)));
function lobbyView(s) {
  const T = C.tapeLobby;
  switch (s.state) {
    case 'start': return strip(T, null, words(C.start), buttons(C.host, C.join), el('label', { class: 'sw-field' }, C.codeLabel, el('input', { type: 'text', inputmode: 'text', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', maxlength: '6', size: '6', placeholder: '______' })), el('p', { class: 'sw-note' }, C.joinAs));
    case 'requesting': return strip(T, C.stampSending, words(C.requesting));
    case 'waiting': return strip(T, null, s.code ? codePlate(s.code) : null, words(C.waiting));
    case 'host': return strip(T, null, codePlate(s.code), el('p', { class: 'sw-note' }, C.shareCode), el('p', { class: 'sw-count' }, `${C.seats(s.seats.filled, s.seats.total)} · ${C.bots(s.seats.bots)}`), seatList(s.members),
      s.pending.length ? el('ul', { class: 'sw-pending' }, s.pending.map(p => el('li', {}, el('span', {}, `${p.displayName} (${C.pendingKind(p.kind)})`), el('button', { type: 'button', class: 'ab-button sw-approve' }, C.approve)))) : null,
      el('div', { class: 'sw-bots', role: 'group', 'aria-label': 'Bots' }, el('button', { type: 'button', class: 'ab-button sw-step', 'aria-label': 'One bot fewer' }, '−'), el('span', {}, C.bots(s.seats.bots)), el('button', { type: 'button', class: 'ab-button sw-step', 'aria-label': 'One bot more' }, '+')),
      el('p', { class: 'sw-note' }, C.beginHint(s.seats.filled, s.seats.total)), s.canBegin ? buttons(C.begin) : null);
    case 'joined': return strip(T, null, codePlate(s.code), el('p', { class: 'sw-count' }, C.seats(s.seats.filled, s.seats.total)), seatList(s.members), words(C.joined));
    case 'display': return strip(T, null, codePlate(s.code), el('p', { class: 'sw-count' }, C.seats(s.seats.filled, s.seats.total)), seatList(s.members), words(C.display));
    case 'refused': return strip(T, null, words(C.refused[s.code] ?? C.refused.other), buttons(C.join));
    case 'setup': return strip(T, null, words(C.setup));
    default: return null;
  }
}
function lobbyCases() {
  const add = (labelText, snap, opts = {}) => {
    const s = lobbyState(snap, opts);
    return card(`lobby: ${s.state}${labelText ? ` (${labelText})` : ''}`, snap ? `session ${snap.status} · ${snap.playerCount} seats · host ${snap.isHost} · self ${snap.selfSeatId ?? 'null'} · members ${snap.members.length} (${snap.members.filter(m => m.controller === 'bot').length} bots) · pending ${snap.pendingAdmissions.length}` : `no snapshot${opts.requested ? ' · requestAdmission sent' : ''}${opts.acknowledged ? ' · answered ok' : ''}${opts.error ? ` · failed ${opts.error}` : ''}`, lobbyView(s));
  };
  const full = Array.from({ length: 7 }, (_, i) => member(i + 1, i >= 4 ? 'bot' : 'human'));
  return [
    add('', null),
    add('', null, { requested: true }),
    add('the host has the request', null, { requested: true, acknowledged: true, code: 'K7Q2ZD' }),
    add('two requests, seats to fill', snapshot({ isHost: true, selfSeatId: 1, pending: [{ id: 'a1', kind: 'player', displayName: 'Dev' }, { id: 'a2', kind: 'display', displayName: 'Lounge TV' }] })),
    add('every seat filled with bots', snapshot({ isHost: true, selfSeatId: 1, members: full })),
    add('', snapshot({})),
    add('the shared display', snapshot({ selfSeatId: null }), { kind: 'display' }),
    add('NOT_FOUND', null, { error: 'NOT_FOUND' }),
    add('RATE_LIMITED', null, { error: 'RATE_LIMITED' }),
    add('choosing', snapshot({ status: 'choosing' })),
  ];
}

// ---------- the Supply ----------

function supplyCards() {
  // Synthetic views (seat 4 receives). R15's SUPPLY_RECEIVED is proposed, not in the contract: the
  // first card shows the receipt as it plays once the marker exists; the others are what plays today.
  const SELF = 'seat-4';
  const inv = (n, events = []) => ({ round: 3, self: { seatId: SELF, ordinaryWeapons: n }, events });
  const marker = { id: 'ev-supply-r3-4', kind: SUPPLY_EVENT.kind, round: 3, audience: { kind: 'player', seatId: SELF }, seatIds: [SELF], actorSeatId: null };
  const synced = { id: 'ev-sync-r3', kind: 'BLACKHOLE_SYNCED', round: 3, audience: { kind: 'public' }, seatIds: [], actorSeatId: null };
  const r = supplyReceipt(inv(0), inv(1, [marker]));
  // The strip is what the phone draws: the count alone. The check that no receipt plays is review text, in the field line.
  const atRest = (label, field, before, after) => card(label, `${field} · ${supplyReceipt(before, after) ? 'ERROR: a receipt' : 'supplyReceipt() null: no crate, no stamp, no "received"'}`, strip(C.tapeSupply, null, el('p', { class: 'sw-count' }, C.inventory(inventoryAtRest(after).ordinaryWeapons))));
  return [
    card('supply: the Supplier\'s phone after its command', 'SUPPLY accepted in Round 3 (this phone\'s receipt): registered, never delivered; the Sync may keep another reality (P03)', strip(C.tapeSupply, null, words(C.supplierWaiting))),
    card('supply: a recipient, with R15\'s delivery marker (proposed)', `events + SUPPLY_RECEIVED (R15, player audience ${SELF}, actorSeatId null) · self.ordinaryWeapons 0 → ${r.total} in round ${r.round}: the receipt plays once, on this phone only`, strip(C.tapeSupply, null, el('div', { class: 'sw-receipt' }, el('span', { class: 'sw-crate', 'aria-hidden': 'true' }), words(C.supplyReceived)), el('p', { class: 'sw-note' }, C.supplyPrivate))),
    atRest('supply: weapons restored by an actual Blackhole Sync (no delivery)', 'events + BLACKHOLE_SYNCED (public) · self.ordinaryWeapons 0 → 1 · no SUPPLY_RECEIVED: a restore (P03), never presented as a Supply delivery', inv(0), inv(1, [synced])),
    atRest('supply: weapons grow without R15\'s marker (missing field: no receipt)', 'self.ordinaryWeapons 0 → 1 · no SUPPLY_RECEIVED in the view (the protocol 3 candidate has none): the count changes at rest', inv(0), inv(1)),
    card('supply: anyone else', 'no change in this seat\'s view: nothing is drawn, on the board or the display', el('p', { class: 'sw-none' }, 'Nothing is drawn: no delivery is public.')),
  ];
}

// ---------- the admission walk ----------

/** The schematic: the origin panel (when known), the path between the board's panels, and the Hospital's berth. Stand-in tokens. */
function walkStage(plan, { still = false } = {}) {
  const known = Boolean(plan.from);
  return el('div', { class: 'sw-walk' },
    known
      ? el('div', { class: 'sw-panel sw-panel--room' }, el('h5', {}, plan.from.location), el('span', { class: 'sw-slot' }, plan.from.slotId), el('span', { class: `sw-token sw-token--room${still ? ' sw-token--origin' : ''}`, 'aria-hidden': 'true' }))
      : el('div', { class: 'sw-panel sw-panel--unknown' }, el('h5', {}, 'Origin unknown'), el('span', { class: 'sw-slot' }, 'no walk')),
    el('span', { class: `sw-path${known ? '' : ' sw-path--none'}`, 'aria-hidden': 'true' }),
    el('div', { class: 'sw-panel sw-panel--hospital' }, el('h5', {}, 'Hospital'), el('span', { class: 'sw-slot' }, plan.to), el('span', { class: 'sw-berth', 'aria-hidden': 'true' }), el('span', { class: 'sw-token sw-token--hospital', 'aria-hidden': 'true' })));
}
function admissionCards() {
  const walk = admissionPlan({ location: 'Room A', slotId: 'A3' }, { location: 'Hospital', slotId: 'H2' });
  const snap = admissionPlan(null, { location: 'Hospital', slotId: 'H2' });
  return [
    card(`admission: ${walk.plan}`, 'previous placement Room A A3 (known) → Hospital H2: leave, cross, walk to the berth, lie down (2,400 ms); stand-in tokens, labelled', strip(C.tapeAdmission, null, walkStage(walk, { still: true }), words(C.admissionWalk(who(5))))),
    card(`admission: ${snap.plan}`, 'no previous placement (a reconnect without it: R4) → drawn at the berth at once', strip(C.tapeAdmission, null, walkStage(snap), words(C.admissionSnap(who(5))))),
  ];
}

// ---------- motion players ----------

function supplyPlayer() {
  return {
    caption: `${MOTION.supply.end} ms full · ${MOTION.reduced.end} ms reduced · when this seat's ordinary weapons first grow (its own phone)`,
    end: reduced => motionEnd('supply', reduced),
    build: stage => {
      const crate = el('span', { class: 'sw-crate', 'aria-hidden': 'true' });
      stage.append(strip(C.tapeSupply, null, el('div', { class: 'sw-receipt' }, crate, words(C.supplyReceived))));
      return { seek: (t, reduced) => { const F = FRAMES.supply(t, { reduced }); Object.assign(crate.style, { opacity: String(F.crate.opacity), transform: `translateY(${-24 * (1 - F.crate.drop)}px)`, filter: `brightness(${0.85 + 0.15 * F.tag.glow})` }); } };
    },
  };
}
function admissionPlayer() {
  return {
    caption: `${MOTION.admission.end} ms full · ${MOTION.reduced.end} ms reduced · on the public placement (the walk only with R4's origin)`,
    end: reduced => motionEnd('admission', reduced),
    build: stage => {
      const node = walkStage(admissionPlan({ location: 'Room A', slotId: 'A3' }, { location: 'Hospital', slotId: 'H2' }));
      stage.append(strip(C.tapeAdmission, null, node));
      const inRoom = node.querySelector('.sw-token--room'), inWard = node.querySelector('.sw-token--hospital');
      return {
        seek: (t, reduced) => {
          const F = FRAMES.admission(t, { reduced });
          const room = F.panel === 'room';
          const x = room ? 20 + 60 * (F.stage === 'leave' ? F.progress : 1) : 5 + 55 * (F.stage === 'enter' ? F.progress : F.stage === 'settle' ? 1 : 0);
          Object.assign(inRoom.style, { opacity: String(room ? F.opacity : 0), left: `${x}%`, transform: `translateY(${-F.bob}px)` });
          Object.assign(inWard.style, { opacity: String(room ? 0 : F.opacity), left: `${room ? 5 : x}%`, transform: `translateY(${-F.bob}px) rotate(${-90 * F.lie}deg)` });
        },
      };
    },
  };
}
function seatPlayer() {
  return {
    caption: `${MOTION.seat.end} ms full · ${MOTION.reduced.end} ms reduced · a lobby seat newly filled`,
    end: reduced => motionEnd('seat', reduced),
    build: stage => {
      const list = seatList([member(1), member(2), member(3)]);
      const row = list.lastElementChild;
      stage.append(strip(C.tapeLobby, null, list));
      return { seek: (t, reduced) => { const F = FRAMES.seat(t, { reduced }); Object.assign(row.style, { opacity: String(F.opacity), transform: `translateX(${-16 * (1 - F.slide)}px)` }); } };
    },
  };
}

// ---------- the page ----------

async function main() {
  const lib = name => new URL(`../${name}`, import.meta.url).href;
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [lib('hack-engineer/assets/library.art.css'), 'library'], [lib('navigation/assets/navigation.art.css'), 'navigation'], [lib('hospital-panel/assets/hospital-panel.art.css'), 'hospital-panel'],
    [lib('promises/assets/promises.art.css'), 'promises'], [lib('windows/assets/windows.art.css'), 'windows'], [lib('offices/assets/offices.art.css'), 'offices'],
    [new URL('./assets/successor.art.css', import.meta.url).href, 'successor'],
  ]);
  mountPage({
    title: 'Library group 8: the successor sweep',
    intro: `Synthetic fixtures (protocol 3 candidate session snapshot and player view). Current role names only; reviewed exports keep their historical ids. Lobby states: ${LOBBY_STATES.join(', ')}. Figures and tokens are stand-ins, labelled so. Words are proposals for Frontend.`,
    groups: [
      ['roles', 'Role cards and the action overlay under current names', roleCards],
      ['lobby', 'The lobby: compact host and join states (320 x 568)', lobbyCases],
      ['supply', 'The Round 3 Supply: private receipts only', supplyCards],
      ['admission', 'The admission walk (proposal)', admissionCards],
      ['motion', 'Motion (once, on its cause)', () => [player('supply', 'supply', supplyPlayer()), player('admission', 'admission', admissionPlayer()), player('seat', 'seat', seatPlayer())]],
    ],
  });
}

main().catch(failed);

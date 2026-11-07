// mothership:dev-only
//
// Library group 3's review page: every state of a Hospital patient's own code console, each
// computed by states.mjs from a synthetic player view (protocol 3 candidate shape, plus R12's
// proposed fields where a card says so) and drawn with this group's art (assets/
// hospital-panel.art.css), the medical module's rescue tag and the dossier's parts. Motion players run
// motion.mjs. A review page: synthetic fixtures, no server, never a client. The frame is ../review.mjs.

import { rescueCrossSvg } from '../../board-v2/fx/medical.mjs';
import { PARTS, partPercent } from './art.mjs';
import { PANEL_COPY as C } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { STATES, panelState } from './states.mjs';
import { SEAT_IDS, seatIdOf, seatKey } from '../seats.mjs';
import { buttons, card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';

// ---------- the synthetic match (labelled as such on the page) ----------

const PATIENT = 8, OTHER = 3;
const PLACES = { 1: 'Room A', 2: 'Room A', 3: 'Room A', 4: 'Room B', 5: 'Room B', 6: 'Command Room', 7: 'Room B', 8: 'Hospital', 9: 'Jail' };

/** A view with only what the state map reads, every field named as the contract (and R12, where marked) names it. */
function view({ seat = PATIENT, role = 'Undercover', round = 4, phase = 'ORDINARY_TURN', playerCount = 9, offers = [], health = 'Injured', location = PLACES[seat], medical = { admittedRound: 3, rescueDueAfterRound: 5, rescueOpportunity: 'NEXT_NORMAL_ROUND' }, panelAttemptSpent = false, panelRequest, injectionsRemaining = null }) {
  const seats = Array.from({ length: playerCount }, (_, i) => i + 1).map(n => ({ seatId: seatIdOf(n), health: n === seat ? health : 'Healthy', location: n === seat ? location : PLACES[n], slotId: null, jailed: n === 9, captain: n === 6, officer: false, revealedFaction: null, rescueDueAfterRound: n === seat && medical ? medical.rescueDueAfterRound : null, medical: n === seat ? medical : null }));
  const abilities = { panelAttemptSpent, injectionsRemaining };
  if (panelRequest !== undefined) abilities.panelRequest = panelRequest;
  return {
    round, playerCount, phase: { id: `r${round}-${phase}`, kind: phase, startedAt: 0, endsAt: null },
    self: { seatId: seatIdOf(seat), role }, board: { kind: 'PLAYER_CURRENT', seats }, abilities,
    offers: offers.map(type => ({ type, targetSeatIds: [], slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const fieldText = (v, extra = '') => {
  const own = v.board.seats.find(s => s.seatId === v.self.seatId);
  const a = Object.entries(v.abilities).filter(([, x]) => x !== null && x !== false).map(([k, x]) => `${k === 'panelRequest' ? 'R12 ' : ''}${k} ${JSON.stringify(x).replace(/"/g, '')}`);
  return `round ${v.round} · ${v.phase.kind} · ${v.self.seatId} (${v.self.role}) · ${own.health}, ${own.location}${own.medical ? ` · medical ${JSON.stringify(own.medical).replace(/"/g, '')}` : ''} · ${a.join(' · ') || 'panelAttemptSpent false'} · offers [${v.offers.map(o => o.type).join(', ')}]${extra}`;
};

// ---------- the console ----------

const overlay = name => el('span', { class: 'hp-layer hp-overlay', 'aria-hidden': 'true', style: `--hp-art: var(--hp-asset-hp-${name})` });
const LAMP = { available: 'ready', choosing: 'ready', sending: 'busy', registered: 'busy', reserved: 'ok', treated: 'ok', wrong: 'warn' };
const STAMP = { sending: C.stampSending, registered: C.stampRegistered, reserved: C.stampReserved, wrong: C.stampWrong, treated: C.stampTreated, 'no-effect': C.stampNoEffect, discarded: C.stampNotKept, used: C.stampUsed };

/** The console for a state: the number shows only while it is being chosen or sent, never after. */
function consoleView(s, { digits = null } = {}) {
  const screen = partPercent('screen');
  const shown = digits ?? (s.state === 'choosing' || s.state === 'sending' ? String(s.number) : s.state === 'available' ? C.screenEmpty : '');
  const name = ['Hospital panel console.', LAMP[s.state] ? `Lamp ${LAMP[s.state]}.` : 'Lamp off.', s.state === 'reserved' ? 'An injection is reserved in the cradle.' : '', s.state === 'choosing' || s.state === 'sending' ? `The screen shows ${shown}.` : ''].filter(Boolean).join(' ');
  return el('div', { class: 'hp-console', role: 'img', 'aria-label': name },
    el('span', { class: 'hp-layer hp-base', 'aria-hidden': 'true' }),
    overlay(`lamp-${LAMP[s.state] ?? 'off'}`),
    s.state === 'reserved' ? overlay('vial-reserved') : null,
    s.state === 'treated' || s.state === 'no-effect' ? overlay('vial-spent') : null,
    s.state === 'wrong' ? overlay('strike') : null,
    el('span', { class: 'hp-screen', 'aria-hidden': 'true', style: `left:${screen.left}%;top:${screen.top}%;width:${screen.width}%;height:${screen.height}%` }, shown));
}
/** The keypad: each key shows its player number and keeps its canonical seat id for the command (data-seat-id). */
function keypadView(keys, picked) {
  return el('div', { class: 'hp-keys', role: 'group', 'aria-label': 'Player numbers' },
    keys.map(k => el('button', { type: 'button', class: 'ab-button hp-key', 'data-seat-id': k.seatId, 'aria-pressed': k.seatId === picked ? 'true' : 'false' }, String(k.number))));
}
const crossImg = tone => el('img', { src: `data:image/svg+xml;base64,${btoa(rescueCrossSvg(tone === 'closed' ? 'none' : tone))}`, alt: '' });
const deadlineLine = d => (d ? el('p', { class: 'hp-deadline' }, crossImg(d.tone), C.deadline(d)) : null);
const privacy = () => el('p', { class: 'hp-privacy' }, C.privacy);

/** The console strip for a state from panelState(). */
export function panelView(s) {
  if (s.state === 'none') return el('p', { class: 'hp-none' }, 'Nothing is drawn: the panel is for a living Hospital patient, on their own phone.');
  const T = C.tapePanel;
  const tail = [deadlineLine(s.deadline), privacy()];
  switch (s.state) {
    case 'available': return strip(T, null, consoleView(s), words(C.ask), keypadView(s.keys, null), ...tail);
    case 'choosing': return strip(T, null, consoleView(s), words(C.choose(s.number)), keypadView(s.keys, s.seatId), buttons(C.send, C.clear), ...tail);
    case 'sending': return strip(T, STAMP.sending, consoleView(s), words(C.sending), ...tail);
    case 'registered': return strip(T, STAMP.registered, consoleView(s), words(C.registered), words(C.registeredNote, 'lib-note'), ...tail);
    case 'reserved': return strip(T, STAMP.reserved, consoleView(s), words(C.reserved), words(C.reservedNote, 'lib-note'), ...tail);
    case 'wrong': return strip(T, STAMP.wrong, consoleView(s), words(C.wrong), ...tail);
    case 'treated': return strip(T, STAMP.treated, consoleView(s), words(C.treated), ...tail);
    case 'no-effect': return strip(T, STAMP['no-effect'], consoleView(s), words(C.noEffect), ...tail);
    case 'discarded': return strip(T, STAMP.discarded, consoleView(s), words(C.discarded), ...tail);
    case 'exhausted': return strip(T, null, consoleView(s), words(C.exhausted), ...tail);
    case 'refused': return strip(T, null, consoleView(s), words(C.refused), ...tail);
    case 'used': return strip(T, STAMP.used, consoleView(s), words(C.used), ...tail);
    case 'closed': return strip(T, null, consoleView(s), words(C.closed), ...tail);
    default: return null;
  }
}

function patientCases() {
  const out = [];
  const add = (label, v, opts = {}) => {
    const s = panelState(v, opts);
    const extra = [opts.pending ? `pending ${opts.pending}` : '', opts.picked ? `picked ${opts.picked} here` : '', Object.keys(opts.accepted ?? {}).length ? 'accepted here PANEL_CODE' : '', opts.rejected?.PANEL_CODE ? `rejected here ${opts.rejected.PANEL_CODE.code}${opts.rejected.PANEL_CODE.code === 'NO_INJECTION' ? ' (R12)' : ''}` : ''].filter(Boolean).map(x => ` · ${x}`).join('');
    out.push(card(`patient: ${s.state}${label ? ` (${label})` : ''}`, fieldText(v, extra), panelView(s)));
  };
  const open = { offers: ['PANEL_CODE'] };
  const phase = 'r4-ORDINARY_TURN';
  add('nine players', view(open));
  add('seven players', view({ ...open, playerCount: 7, seat: 5, location: 'Hospital' }));
  add('rescue due this round', view({ ...open, medical: { admittedRound: 3, rescueDueAfterRound: 4, rescueOpportunity: 'CURRENT_NORMAL_ROUND' } }));
  add('the Doctor as a patient: no count', view({ ...open, role: 'Doctor', injectionsRemaining: 1 }));
  add('', view(open), { picked: 'seat-6' });
  add('', view(open), { pending: 'PANEL_CODE', picked: 'seat-6' });
  add('R12 not in the view', view({ panelAttemptSpent: true }), { accepted: { PANEL_CODE: phase } });
  add('R12', view({ panelAttemptSpent: true, panelRequest: { round: 4, result: 'RESERVED', status: 'QUEUED' } }));
  add('R12', view({ panelAttemptSpent: true, panelRequest: { round: 4, result: 'WRONG', status: null } }));
  add('R12: no injection left', view(open), { rejected: { PANEL_CODE: { phaseId: phase, code: 'NO_INJECTION' } } });
  add('NOT_ALLOWED: the reason unknown', view(open), { rejected: { PANEL_CODE: { phaseId: phase, code: 'NOT_ALLOWED' } } });
  add('outside the turns', view({ phase: 'JAIL_VOTE' }));
  add('an earlier round, R12 not in the view', view({ round: 5, panelAttemptSpent: true, medical: { admittedRound: 3, rescueDueAfterRound: 5, rescueOpportunity: 'CURRENT_NORMAL_ROUND' } }));
  add('R12; R3 rules this out: a healed seat leaves the Hospital', view({ round: 5, health: 'Healthy', medical: null, panelAttemptSpent: true, panelRequest: { round: 4, result: 'RESERVED', status: 'TREATED' } }));
  add('R12; R3 rules this out: a healed seat leaves the Hospital', view({ round: 5, health: 'Healthy', medical: null, panelAttemptSpent: true, panelRequest: { round: 4, result: 'RESERVED', status: 'NO_EFFECT' } }));
  add('R12', view({ round: 5, panelAttemptSpent: true, panelRequest: { round: 4, result: 'RESERVED', status: 'DISCARDED' }, medical: { admittedRound: 3, rescueDueAfterRound: 5, rescueOpportunity: 'CURRENT_NORMAL_ROUND' } }));
  add('no rescue round left', view({ round: 6, panelAttemptSpent: true, medical: { admittedRound: 3, rescueDueAfterRound: 5, rescueOpportunity: 'CLOSED' } }));
  return out;
}

function otherCards() {
  const away = view({ seat: OTHER, health: 'Healthy', medical: null, offers: [] });
  const tray = el('div', { class: 'hp-tray' }, el('span', { class: 'hp-icon', 'aria-hidden': 'true' }), el('div', {}, el('strong', {}, 'Hospital panel'), el('span', {}, 'One attempt in the match')));
  return [
    card(`not a patient: ${panelState(away).state}`, fieldText(away), panelView(panelState(away))),
    card('tray: Hospital panel (a patient)', 'the patient\'s Actions tray entry; shown only while the seat is a living Hospital patient', tray),
  ];
}

// ---------- motion players ----------

function consolePlayer(kind) {
  return {
    caption: `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · ${{ press: 'a key picked here (local feedback)', register: 'on the accepted receipt', reserve: 'when the view first carries R12 RESERVED', wrong: 'when the view first carries R12 WRONG' }[kind]}`,
    end: reduced => motionEnd(kind, reduced),
    build: stage => {
      const base = kind === 'press' ? { state: 'choosing', number: 6 } : kind === 'register' ? { state: 'sending', number: 6 } : { state: kind === 'reserve' ? 'reserved' : 'wrong' };
      const node = consoleView(base, { digits: kind === 'press' || kind === 'register' ? '6' : '' });
      const lamp = node.querySelector('.hp-overlay');
      const screen = node.querySelector('.hp-screen');
      const scan = overlay('scan');
      if (kind === 'register') node.append(scan);
      const vial = node.querySelectorAll('.hp-overlay')[1] ?? null;
      const strike = kind === 'wrong' ? node.querySelectorAll('.hp-overlay')[1] : null;
      const mark = stamp({ register: C.stampRegistered, reserve: C.stampReserved, wrong: C.stampWrong, press: '' }[kind]);
      const keys = kind === 'press' ? keypadView(SEAT_IDS.map(seatKey), 'seat-6') : null;
      const cap = keys ? keys.querySelector('[aria-pressed="true"]') : null;
      stage.append(el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, el('span', { class: 'lib-tape' }, C.tapePanel), kind === 'press' ? null : el('span', { class: 'lib-stamp-slot' }, mark)), node, keys));
      const { screen: s } = PARTS;
      return {
        seek: (t, reduced) => {
          const F = FRAMES[kind](t, { reduced });
          if (kind === 'press') {
            Object.assign(cap.style, { transform: `scale(${F.cap.scale})`, opacity: String(0.6 + 0.4 * F.cap.lit) });
            Object.assign(screen.style, { opacity: String(F.digit.opacity), transform: `scale(${F.digit.scale})` });
            return;
          }
          Object.assign(mark.style, { opacity: String(F.stamp.opacity), transform: `rotate(${F.stamp.rotate}deg) scale(${F.stamp.scale})` });
          if (kind === 'register') {
            screen.style.opacity = String(F.digits.opacity);
            Object.assign(scan.style, { opacity: String(F.scan?.opacity ?? 0), transform: `translateX(${(F.scan?.x ?? 0) * ((s.w - 14) / 320) * 100}%)` });
          } else if (kind === 'reserve') {
            Object.assign(vial.style, { opacity: String(F.vial.opacity), transform: `translateY(${(1 - F.vial.rise) * 30}%)`, filter: `brightness(${0.7 + 0.3 * F.vial.glow})` });
          } else {
            Object.assign(strike.style, { clipPath: `inset(0 ${(1 - F.strike.draw) * 100}% 0 0)`, opacity: String(F.strike.opacity) });
          }
          if (lamp) lamp.style.opacity = '1';
        },
      };
    },
  };
}

// ---------- the page ----------

async function main() {
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [new URL('./assets/hospital-panel.art.css', import.meta.url).href, 'hospital-panel'],
  ]);
  mountPage({
    title: 'Library group 3: Hospital panel',
    intro: `Every state is computed by states.mjs from a synthetic player view (protocol 3 candidate fields; R12's proposed panelRequest and NO_INJECTION only where a card says so). Hana (8) is a Hospital patient; Cleo (3) is not. The console is the patient's own, whatever their role; it never shows an injection count, and the number leaves the screen once sent. States: ${STATES.join(', ')}. Words are proposals for Frontend.`,
    groups: [
      ['patient', 'The patient\'s console (private)', patientCases],
      ['others', 'Every other seat, and the tray', otherCards],
      ['motion', 'Motion (once, on its cause)', () => ['press', 'register', 'reserve', 'wrong'].map(kind => player(kind, kind, consolePlayer(kind)))],
    ],
  });
}

main().catch(failed);

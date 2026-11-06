// mothership:dev-only
//
// Library group 7's review page: the end reveal after the arrival (each side's emblem and roles,
// the winners from the result only, the Alien's co-win only when the result says so, the Code), the
// no-survivors ending, the host's abort, and the recovery states (reconnecting, restored, stale, a
// failed picture or film, a late join after the end). Every ending is computed by states.mjs from a
// synthetic view (protocol 3 candidate shape). Motion players run motion.mjs. A review page:
// synthetic fixtures, no server, never a client. The frame is ../review.mjs.

import { BANNER_FILES, EMBLEM_FILES } from './art.mjs';
import { END_COPY as C, listNumbers } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { CONNECTION_STATES, END_STATES, SIDES, connectionState, endState, filmDecision } from './states.mjs';
import { card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';
import { seatIdOf, seatNumber } from '../seats.mjs';

// ---------- the synthetic matches (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
/** A seat in words, from its canonical id (the views carry ids; the words show numbers). */
const who = id => `Player ${seatNumber(id)}, ${NAMES[seatNumber(id) - 1]}`;
const ROSTER = {
  7: ['Insider', 'Undercover', 'Doctor', 'Hacker', 'Alien', 'Supplier', 'Blue Disabler'],
  8: ['Hacker', 'Insider', 'Alien', 'Blue Disabler', 'Undercover', 'Doctor', 'Red Disabler', 'Supplier'],
  9: ['Engineer', 'Doctor', 'Undercover', 'Alien', 'Insider', 'Red Disabler', 'Supplier', 'Hacker', 'Blue Disabler'],
};
const codeOf = roles => roles.map((role, i) => [role, i + 1]).filter(([role]) => ['Undercover', 'Alien', 'Insider', 'Doctor'].includes(role)).map(([, n]) => seatIdOf(n));
function view({ players = 7, phase = 'FINISHED', result = { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false } }) {
  const roles = ROSTER[players];
  return {
    playerCount: players, round: 7, phase: { id: `r7-${phase}`, kind: phase, startedAt: 0, endsAt: null },
    result, endReveal: phase === 'FINISHED' ? { roles: roles.map((role, i) => ({ seatId: seatIdOf(i + 1), role })), code: codeOf(roles) } : null,
  };
}
const fieldText = v => `${v.playerCount} players · ${v.phase.kind} · result ${v.result ? JSON.stringify(v.result).replace(/"/g, '') : 'null'} · endReveal ${v.endReveal ? `${v.endReveal.roles.length} roles, code [${v.endReveal.code.join(',')}]` : 'null'}`;

// ---------- parts ----------

const art = (cls, file) => el('span', { class: cls, 'aria-hidden': 'true', style: `--en-art: var(--en-asset-${file})` });
const emblem = (side, cls = 'en-emblem') => art(cls, EMBLEM_FILES[side]);

function banner(kind, line) {
  return el('div', { class: `en-banner en-banner--${kind}`, style: `--en-art: var(--en-asset-${BANNER_FILES[kind]})` }, kind !== 'none' ? emblem(kind, 'en-emblem en-emblem--banner') : null, el('p', {}, line));
}
function roleCard(x) {
  return el('li', { class: `en-role${x.winner ? ' en-role--winner' : ''}` }, el('span', { class: 'en-role__name' }, who(x.seatId)), el('b', { class: 'en-role__role' }, x.role), x.winner ? el('span', { class: 'en-role__mark' }, C.winnerMark) : null);
}
function reveal(s) {
  return el('section', { class: 'en-reveal', 'aria-label': C.revealTitle },
    el('h3', {}, C.revealTitle),
    ...SIDES.filter(side => s.bySide[side].length).map(side => el('div', { class: `en-side en-side--${side.toLowerCase()}` },
      el('h4', {}, emblem(side), C.sides[side]),
      el('ol', { class: 'en-roles' }, s.bySide[side].map(roleCard)))),
    el('div', { class: 'en-code' }, el('div', { class: 'en-code__plate', role: 'img', 'aria-label': C.code(listNumbers(s.code.map(seatNumber))) }, s.code.map(id => el('span', { 'aria-hidden': 'true' }, String(seatNumber(id))))), el('p', {}, C.code(listNumbers(s.code.map(seatNumber))))));
}
/** The ending's strip for a state from endState(). */
function endView(s) {
  switch (s.state) {
    case 'arrival': return strip(C.tapeEnd, C.stampWins, banner(s.winner, C.wins(s.winner)), words(C.arrived(s.winner)),
      s.alienCoWinner ? el('p', { class: 'en-cowin' }, emblem('Alien'), C.coWin) : null, reveal(s));
    case 'no-survivors': return strip(C.tapeEnd, C.stampNoWinner, banner('none', C.noSurvivors), el('div', { class: 'en-flatline', 'aria-hidden': 'true' }), reveal(s));
    case 'aborted': return strip(C.tapeEnd, C.stampEnded, banner('none', C.aborted));
    default: return el('p', { class: 'en-none' }, 'Nothing is drawn: the view carries no terminal result.');
  }
}

function arrivalCases() {
  const add = (labelText, v) => card(`end: ${endState(v).state} (${labelText})`, fieldText(v), endView(endState(v)));
  return [
    add('Blue wins, 7 players', view({ players: 7 })),
    add('Red wins and the Alien co-wins, 9 players', view({ players: 9, result: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true } })),
    add('Blue wins, the Alien does not co-win, 8 players', view({ players: 8 })),
  ];
}
function otherCases() {
  const add = (labelText, v) => card(`end: ${endState(v).state}${labelText ? ` (${labelText})` : ''}`, fieldText(v), endView(endState(v)));
  return [
    add('8 players', view({ players: 8, result: { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false } })),
    add('the host\'s abort', view({ phase: 'ABORTED', result: { winner: null, reason: 'ABORTED', alienCoWinner: false } })),
    add('a crew all jailed or injured is not an ending', { ...view({}), phase: { id: 'r6-JAIL_VOTE', kind: 'JAIL_VOTE', startedAt: 0, endsAt: 60000 }, result: null, endReveal: null }),
  ];
}

// ---------- recovery ----------

function connectionStrip(state) {
  if (state === 'ok') return null;
  const icon = state === 'restored' ? el('span', { class: 'en-ok', 'aria-hidden': 'true' }, '✓') : el('span', { class: 'en-signal', 'aria-hidden': 'true' });
  return el('div', { class: `en-connection en-connection--${state}`, role: 'status' }, icon, el('p', {}, C[state]));
}
function recoveryCases() {
  const board = el('div', { class: 'en-board', 'aria-hidden': 'true' }, el('span', {}, 'board (stand-in)'));
  const cases = [
    ['reconnecting', { online: false, now: 10000 }],
    ['restored', { online: true, now: 10500, restoredAt: 10000 }],
    ['stale', { online: true, now: 70000, phaseEndsAt: 60000 }],
  ];
  const out = cases.map(([labelText, input]) => {
    const s = connectionState(input);
    return card(`connection: ${s.state}`, `client: online ${input.online}, now ${input.now}${input.restoredAt ? `, restoredAt ${input.restoredAt}` : ''}${input.phaseEndsAt ? `, phase endsAt ${input.phaseEndsAt}` : ''}`, strip(C.tapeConnection, null, connectionStrip(s.state), board.cloneNode(true)));
  });
  out.push(card('asset: a picture did not load', 'the static stand-in for any picture; the words carry what it shows', strip(C.tapeConnection, null, el('div', { class: 'en-failed' }, el('span', { class: 'en-broken', 'aria-hidden': 'true' }), el('p', {}, C.pictureFailed)))));
  out.push(card('asset: a film did not load', 'the film is skipped; the scene\'s final state and its words stand alone', strip(C.tapeConnection, null, el('div', { class: 'en-failed' }, el('span', { class: 'en-broken', 'aria-hidden': 'true' }), el('p', {}, C.filmFailed)))));
  const late = filmDecision({ start: 0, end: motionEnd('reveal', false, 7), now: 600000 });
  const v = view({ players: 7 });
  out.push(card(`late join after the end: ${late.decision}`, `filmDecision({ start 0, end ${motionEnd('reveal', false, 7)}, now 600000 }) → ${late.decision}: the reveal drawn at rest, nothing replayed`, el('div', {}, el('p', { class: 'en-late' }, C.lateJoin), endView(endState(v)))));
  return out;
}

// ---------- motion players ----------

function revealPlayer() {
  const v = view({ players: 9, result: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true } });
  return {
    caption: `${motionEnd('reveal', false, 9)} ms full (9 seats) · ${MOTION.reduced.end} ms reduced · from FINISHED's startedAt + the arrival film's length`,
    end: reduced => motionEnd('reveal', reduced, 9),
    build: stage => {
      const node = endView(endState(v));
      stage.append(node);
      const bannerNode = node.querySelector('.en-banner'), bannerEmblem = node.querySelector('.en-emblem--banner');
      const roles = [...node.querySelectorAll('.en-role')], plate = node.querySelector('.en-code__plate');
      return {
        seek: (t, reduced) => {
          const F = FRAMES.reveal(t, { count: roles.length, reduced });
          Object.assign(bannerNode.style, { opacity: String(F.banner.opacity), transform: `translateY(${-40 * (1 - F.banner.drop)}px)` });
          if (bannerEmblem) Object.assign(bannerEmblem.style, { opacity: String(F.emblem.opacity), transform: `scale(${F.emblem.scale})` });
          roles.forEach((r, i) => Object.assign(r.style, { opacity: String(F.roles[i].opacity), transform: `rotateX(${(1 - F.roles[i].turn) * 90}deg)` }));
          Object.assign(plate.style, { opacity: String(F.code.opacity), transform: `scale(${F.code.scale})` });
        },
      };
    },
  };
}
function noSurvivorsPlayer() {
  const v = view({ players: 8, result: { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false } });
  return {
    caption: `${MOTION.noSurvivors.end} ms full · ${MOTION.reduced.end} ms reduced · from FINISHED's startedAt`,
    end: reduced => motionEnd('noSurvivors', reduced),
    build: stage => {
      const shade = el('div', { class: 'en-dim', 'aria-hidden': 'true' });
      const node = endView(endState(v));
      stage.append(el('div', { class: 'en-dimwrap' }, node, shade));
      const line = node.querySelector('.en-flatline'), text = node.querySelector('.en-banner p');
      return {
        seek: (t, reduced) => {
          const F = FRAMES.noSurvivors(t, { reduced });
          shade.style.opacity = String(F.dim * 0.4);
          Object.assign(line.style, { opacity: String(F.line.opacity), clipPath: `inset(0 ${(1 - F.line.draw) * 100}% 0 0)` });
          text.style.opacity = String(F.words.opacity);
        },
      };
    },
  };
}
function stripPlayer(out) {
  return {
    caption: `${MOTION.strip.end} ms full · ${MOTION.reduced.end} ms reduced · ${out ? 'the restored strip fades away' : 'the reconnecting strip slides down'}`,
    end: reduced => motionEnd('strip', reduced),
    build: stage => {
      const s = connectionStrip(out ? 'restored' : 'reconnecting');
      stage.append(strip(C.tapeConnection, null, el('div', { class: 'en-stripstage' }, s, el('div', { class: 'en-board', 'aria-hidden': 'true' }, el('span', {}, 'board (stand-in)')))));
      return {
        seek: (t, reduced) => {
          const F = FRAMES.strip(t, { reduced, out });
          Object.assign(s.style, { opacity: String(F.opacity), transform: `translateY(${-100 * (1 - F.slide)}%)` });
        },
      };
    },
  };
}

// ---------- the page ----------

async function main() {
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [new URL('./assets/end.art.css', import.meta.url).href, 'end'],
  ]);
  mountPage({
    title: 'Library group 7: the end and recovery',
    intro: `Every ending is computed by states.mjs from a synthetic view (protocol 3 candidate fields): result and endReveal only. Rosters are synthetic. The reveal follows the arrival film (library group 2). End states: ${END_STATES.join(', ')}. Connection states: ${CONNECTION_STATES.join(', ')} (from the client's own transport and clock). Words are proposals for Frontend.`,
    groups: [
      ['arrival', 'The arrival\'s end reveal', arrivalCases],
      ['others', 'No survivors, the abort, and a crew that is not an ending', otherCases],
      ['recovery', 'Reconnect, stale, failed assets and a late join', recoveryCases],
      ['motion', 'Motion (once, on the server\'s clock)', () => [player('reveal', 'reveal', revealPlayer()), player('noSurvivors', 'no survivors', noSurvivorsPlayer()), player('strip-in', 'strip in', stripPlayer(false)), player('strip-out', 'strip out', stripPlayer(true))]],
    ],
  });
}

main().catch(failed);

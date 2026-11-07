// mothership:dev-only
//
// Library group 2's review page: every state of the offices' route panel and of the public
// navigation strip, each computed by states.mjs from a synthetic view (protocol 3 candidate shape)
// and drawn with this group's art (assets/navigation.art.css), the dossier's parts and the public
// films (films.mjs). Motion players run motion.mjs and films.mjs. A review page: synthetic fixtures,
// no server, never a client. The frame (parameters, cards, players, controls) is ../review.mjs.

import { LABELS, anchorPercent, slug } from './art.mjs';
import { NAV_COPY as C } from './copy.mjs';
import { arrivalSvg, filmEnd, transitBoardArt } from './films.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { step } from './route.mjs';
import { STATES, officePanelState, panelStep, publicNavState } from './states.mjs';
import { buttons, card, el, failed, loadArt, mountPage, player, stamp, strip, words } from '../review.mjs';

// ---------- the synthetic match (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const CAPTAIN = 7, OFFICER = 2, CREW = 5;
const title = seat => (seat === CAPTAIN ? 'Captain' : seat === OFFICER ? 'Officer' : 'crew');

/** A view with only what the state maps read, every field named as the contract names it. */
function view({ seat, round = 4, phase = 'ORDINARY_TURN', offers = [], position = 'B1', direction = null, lastMovedRound = round - 1, arrivedAt = null, events = [] }) {
  const office = seat === CAPTAIN || seat === OFFICER;
  const stage = phase === 'NAV_CAPTAIN_CONFIRM' ? 'CAPTAIN' : phase === 'NAV_OFFICER_CONFIRM' ? 'OFFICER' : null;
  return {
    round,
    phase: { id: `r${round}-${phase.toLowerCase()}`, kind: phase, startedAt: 0, endsAt: null },
    offices: { captainSeatId: CAPTAIN, officerSeatId: OFFICER, blockedSeatId: null },
    self: { seatId: seat },
    navigation: { lastMovedRound, arrivedAt },
    events,
    // tieChoice and confirmation as a server might fill them; the state map does not read them (request R11).
    privateNavigation: office ? { position, direction, tieChoice: phase === 'NAV_TIE' && seat === OFFICER, confirmation: stage } : null,
    offers: offers.map(type => ({ type, targetSeatIds: [], slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const fieldText = (v, extra = '') => `round ${v.round} · ${v.phase.kind} · seat ${v.self.seatId} (${title(v.self.seatId)}) · privateNavigation ${v.privateNavigation ? JSON.stringify(v.privateNavigation).replace(/"/g, '') : 'null'} · offers [${v.offers.map(o => o.type).join(', ')}]${extra}`;

// ---------- the office panel ----------

const at = position => { const a = anchorPercent(position); return `left:${a.left}%;top:${a.top}%`; };
const courseLayer = ([from, to], extra = {}) => el('span', { class: 'nav-course', 'aria-hidden': 'true', style: `--nav-art: var(--nav-asset-nav-course-${slug(from)}-${slug(to)})`, ...extra });
const planetLabel = (position, text) => el('span', { class: 'nav-label', 'aria-hidden': 'true', style: `left:${(LABELS[position].at[0] / 320) * 100}%;top:${(LABELS[position].at[1] / 236) * 100}%` }, text);

/** The map's accessible name: where the ship is and, when there is one, where the course leads. */
function mapName(s, courses) {
  const parts = ['Course map.', C.where(s.position)];
  if (courses.length === 2) parts.push(`Two courses: to ${courses[0][1]} or to ${courses[1][1]}.`);
  else if (s.direction) parts.push(C.direction(s.direction));
  if (courses.length === 1 && s.course) parts.push(C.course(s.course));
  return parts.join(' ');
}
function panel(s, { courses = [] } = {}) {
  return el('div', { class: 'nav-panel', role: 'img', 'aria-label': mapName(s, courses) },
    el('span', { class: 'nav-panel__base', 'aria-hidden': 'true' }),
    courses.map(c => courseLayer(c)),
    el('span', { class: 'nav-ship', 'aria-hidden': 'true', style: at(s.position) }),
    planetLabel('Blue Planet', 'Blue'), planetLabel('Red Planet', 'Red'));
}
/** The arms' shape key, as the panel draws them: a ring for the Blue arm's lamps, a diamond for the Red arm's. */
const shape = arm => el('span', { class: `nav-shape nav-shape--${arm === 'Blue' ? 'round' : 'diamond'}`, 'aria-hidden': 'true' });
const legend = () => el('ul', { class: 'nav-legend' },
  el('li', {}, shape('Blue'), el('b', {}, 'Blue arm:'), ' one line, round lamps, the ringed Blue Planet.'),
  el('li', {}, shape('Red'), el('b', {}, 'Red arm:'), ' a double line, diamond lamps, the cratered Red Planet.'));
/** The tie's two choices: the same weight and colour (neither is suggested), each with its arm's shape key. */
const tieButtons = () => el('div', { class: 'lib-buttons nav-even' },
  ['Blue', 'Red'].map(arm => el('button', { type: 'button', class: 'ab-button' }, shape(arm), arm === 'Blue' ? C.chooseBlue : C.chooseRed)));
const privacy = () => el('p', { class: 'nav-privacy' }, C.privacy);
const both = position => [[position, step(position, 'Blue').to], [position, step(position, 'Red').to]];

/** The office panel for a state from officePanelState(). */
export function officeView(s) {
  const T = C.tapeCourse;
  const course = s.course ? [[s.position, s.course.to]] : [];
  switch (s.state) {
    case 'none': return el('p', { class: 'nav-none' }, 'Nothing is drawn for this seat: only the Captain and the Officer see the course.');
    case 'idle': return strip(T, null, panel(s), words(C.where(s.position)), words(C.idleNote, 'lib-note'), legend(), privacy());
    case 'setting': return strip(T, null, panel(s), words(C.setting), words(C.where(s.position), 'lib-note'), legend(), privacy());
    case 'tie': return strip(T, null, panel(s, { courses: both(s.position) }), words(C.tieAsk), tieButtons(), legend(), privacy());
    case 'chosen': {
      const made = s.direction ? step(s.position, s.direction) : null;
      return strip(T, C.stampChosen, panel({ ...s, course: made }, { courses: made ? [[s.position, made.to]] : [] }), words(C.chosen(s.direction)), made ? el('p', { class: 'nav-course-words' }, C.course(made)) : null);
    }
    case 'sending': return s.command === 'CHOOSE_NAV_DIRECTION'
      ? strip(T, C.stampSending, panel(s, { courses: both(s.position) }), words(C.sending))
      : strip(T, C.stampSending, panel(s, { courses: course }), words(C.direction(s.direction)), words(C.sending, 'lib-note'));
    case 'confirm': return strip(T, null, panel(s, { courses: course }), words(C.direction(s.direction)), el('p', { class: 'nav-course-words' }, C.course(s.course)), words(C.confirmAsk(s.office), 'lib-note'), buttons(C.confirmButton), privacy());
    case 'confirmed': return strip(T, C.stampConfirmed, panel(s, { courses: course }), words(C.direction(s.direction)), words(C.confirmed, 'lib-note'));
    case 'closed': return strip(T, null, panel(s, { courses: course }), words(C.direction(s.direction)), words(C.closed, 'lib-note'));
    case 'waiting': return strip(T, null, panel(s, { courses: course }), words(C.direction(s.direction)), el('p', { class: 'nav-course-words' }, C.course(s.course)), words(C.waiting(s.stage), 'lib-note'));
    case 'arrived': return strip(T, C.stampArrived, panel(s), words(C.arrived(s.position)));
    default: return null;
  }
}

function officeCases(seat) {
  const out = [];
  const add = (label, v, opts = {}) => {
    const s = officePanelState(v, opts);
    const extra = opts.pending ? ` · pending ${opts.pending}` : Object.keys(opts.accepted ?? {}).length ? ` · accepted here ${Object.keys(opts.accepted).join(', ')}` : '';
    out.push(card(`${title(seat).toLowerCase()} panel: ${s.state}${label ? ` (${label})` : ''}`, fieldText(v, extra), officeView(s)));
  };
  const V = o => view({ seat, ...o });
  if (seat === CAPTAIN) {
    add('Round 2, at the Junction', V({ round: 2, position: 'Junction' }));
    add('at B1', V({ position: 'B1' }));
    add('the tie stage, not choosing', V({ phase: 'NAV_TIE', position: 'B1' }));
    add('B1, Blue: advance', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B1', direction: 'Blue', offers: ['CONFIRM_NAVIGATION'] }));
    add('B2, Red: switch', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B2', direction: 'Red', offers: ['CONFIRM_NAVIGATION'] }));
    add('R2, Red: arrive', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'R2', direction: 'Red', offers: ['CONFIRM_NAVIGATION'] }));
    add('', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B1', direction: 'Blue', offers: ['CONFIRM_NAVIGATION'] }), { pending: 'CONFIRM_NAVIGATION' });
    add('', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B1', direction: 'Blue' }), { accepted: { CONFIRM_NAVIGATION: 'r4-nav_captain_confirm' } });
    add('a reconnect after acknowledging', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B1', direction: 'Blue' }));
    add('the Officer\'s stage', V({ phase: 'NAV_OFFICER_CONFIRM', position: 'B1', direction: 'Blue' }));
    add('', V({ round: 6, position: 'Red Planet', arrivedAt: 'Red', lastMovedRound: 6 }));
  } else {
    add('at R1', V({ position: 'R1' }));
    add('at the Junction', V({ phase: 'NAV_TIE', position: 'Junction', offers: ['CHOOSE_NAV_DIRECTION'] }));
    add('at B2', V({ phase: 'NAV_TIE', position: 'B2', offers: ['CHOOSE_NAV_DIRECTION'] }));
    add('', V({ phase: 'NAV_TIE', position: 'B2', offers: ['CHOOSE_NAV_DIRECTION'] }), { pending: 'CHOOSE_NAV_DIRECTION' });
    add('', V({ phase: 'NAV_TIE', position: 'B2', direction: 'Red' }), { accepted: { CHOOSE_NAV_DIRECTION: 'r4-nav_tie' } });
    add('the Captain\'s stage', V({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B2', direction: 'Red' }));
    add('', V({ phase: 'NAV_OFFICER_CONFIRM', position: 'B2', direction: 'Red', offers: ['CONFIRM_NAVIGATION'] }));
    add('', V({ phase: 'NAV_OFFICER_CONFIRM', position: 'B2', direction: 'Red' }), { accepted: { CONFIRM_NAVIGATION: 'r4-nav_officer_confirm' } });
  }
  return out;
}

function otherCards() {
  const crew = view({ seat: CREW, phase: 'NAV_CAPTAIN_CONFIRM' });
  const tray = el('div', { class: 'nav-tray' }, el('span', { class: 'nav-icon', 'aria-hidden': 'true' }), el('div', {}, el('strong', {}, 'Course'), el('span', {}, 'Captain and Officer only')));
  return [
    card(`crew: ${officePanelState(crew).state}`, fieldText(crew), officeView(officePanelState(crew))),
    card('tray: course (offices)', 'the offices\' Actions tray entry for the Course panel; never shown to another seat', tray),
  ];
}

// ---------- the public strip ----------

const ROOMS = ['../../board-motion/assets/scenes/room-a.back.svg', '../../board-motion/assets/scenes/room-b.back.svg'];
const BAND = [366, 250];
const ARRIVAL = [366, 480];
/** The transit behind the crew over the two rooms' back pictures: the rooms' art layer, as the board draws it (no figures here). */
function bandFilm(t, variant) {
  const [width, height] = BAND;
  const { art } = transitBoardArt(t, { width, height, board: { x: 0, y: 0, w: width, h: height } }, { surface: 'phone', variant });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="navigation-transit" style="pointer-events:none">${art}</svg>`;
}
const arrivalFilm = (t, side, variant) => arrivalSvg(t, side, { surface: 'phone', width: ARRIVAL[0], height: ARRIVAL[1], variant }).svg;
const filmBox = (kind, svg) => {
  const layer = el('div', { class: 'nav-film__layer', 'aria-hidden': 'true' });
  layer.innerHTML = svg;
  return el('div', { class: `nav-film nav-film--${kind}` }, kind === 'band' ? el('div', { class: 'nav-film__rooms', 'aria-hidden': 'true' }, ROOMS.map(src => el('img', { src, alt: '' }))) : null, layer);
};

/** The public strip for a state from publicNavState(). */
export function publicView(s) {
  switch (s.state) {
    case 'idle': return el('p', { class: 'nav-none' }, 'Nothing is drawn before the first movement.');
    case 'navigating': return el('div', { class: 'nav-public' }, el('span', { class: 'nav-dial', 'aria-hidden': 'true' }), el('p', {}, C.publicNavigating));
    case 'moved': return el('div', { class: 'nav-public' }, el('span', { class: 'nav-chip-mark', 'aria-hidden': 'true' }), el('p', {}, C.publicMoved(s.round)));
    case 'transit': return [filmBox('band', bandFilm(s.t, 'full')), el('p', { class: 'nav-film-words' }, C.publicTransit(s.round))];
    case 'arrived': return [filmBox('arrival', arrivalFilm(4000, s.planet.split(' ')[0], 'full')), el('p', { class: 'nav-film-words' }, C.publicArrived(s.planet))];
    default: return null;
  }
}

function publicCards() {
  const move = { id: 'ev-move-3', kind: 'MOVEMENT_COMPLETED', round: 3, audience: { kind: 'public' }, publishedAt: 10_000, expiresAt: 40_000 };
  const transitEnd = filmEnd('transit', 'phone');
  const cases = [
    ['Round 1, before the first movement', view({ seat: CREW, round: 1, lastMovedRound: 0 }), {}],
    ['the tie stage', view({ seat: CREW, phase: 'NAV_TIE' }), {}],
    ['a confirmation stage: drawn the same', view({ seat: CREW, phase: 'NAV_CAPTAIN_CONFIRM' }), {}],
    ['Round 4, after Round 3\'s movement', view({ seat: CREW, round: 4, lastMovedRound: 3 }), {}],
    ['900 ms into the movement\'s film', view({ seat: CREW, round: 4, lastMovedRound: 3, events: [move] }), { now: 10_900, transitEnd }],
    ['a late join after the film', view({ seat: CREW, round: 4, lastMovedRound: 3, events: [move] }), { now: 10_000 + transitEnd + 50, transitEnd }],
    ['Blue', view({ seat: CREW, round: 6, phase: 'FINISHED', lastMovedRound: 6, arrivedAt: 'Blue' }), {}],
    ['Red', view({ seat: CREW, round: 5, phase: 'FINISHED', lastMovedRound: 5, arrivedAt: 'Red' }), {}],
  ];
  return cases.map(([label, v, opts]) => {
    const s = publicNavState(v, opts);
    const fields = `round ${v.round} · ${v.phase.kind} · navigation ${JSON.stringify(v.navigation).replace(/"/g, '')} · events [${v.events.map(e => e.kind).join(', ')}]${opts.now ? ` · now − publishedAt ${opts.now - move.publishedAt} ms` : ''}`;
    return card(`public: ${s.state}${label ? ` (${label})` : ''}`, fields, publicView(s));
  });
}

// ---------- motion players ----------

/** The step players: a panel with the course drawn, the token, the destination's pulse. */
function stepFilm(from, to) {
  const made = panelStep(from, to);
  return {
    caption: `${MOTION.step.end} ms full · ${MOTION.reduced.end} ms reduced · ${from} to ${to} (${made.kind}) · once, when the office's view shows the new position`,
    end: reduced => motionEnd('step', reduced),
    build: stage => {
      const s = { position: from, direction: made.direction };
      const node = panel(s, { courses: [[from, to]] });
      const course = node.querySelector('.nav-course');
      const token = node.querySelector('.nav-ship');
      const after = el('span', { class: 'nav-ship', 'aria-hidden': 'true', style: at(to) });
      const pulse = el('span', { class: 'nav-pulse', 'aria-hidden': 'true', style: `${at(to)};opacity:0` });
      node.append(after, pulse);
      stage.append(node, el('p', { class: 'nav-course-words', style: 'color: var(--ms-color-text)' }, C.stepWords(made)));
      return {
        seek: (t, reduced) => {
          const F = FRAMES.step(t, made, { reduced });
          if (F.reduced) {
            course.style.opacity = '0';
            Object.assign(token.style, { left: `${F.before.left}%`, top: `${F.before.top}%`, opacity: String(F.before.opacity), transform: '' });
            after.style.opacity = String(F.after.opacity);
            pulse.style.opacity = '0';
            return;
          }
          course.style.opacity = String(F.course.opacity);
          Object.assign(token.style, { left: `${F.token.left}%`, top: `${F.token.top}%`, opacity: '1', transform: `scale(${F.token.scale})` });
          after.style.opacity = '0';
          Object.assign(pulse.style, { opacity: String(F.pulse.opacity), transform: `scale(${F.pulse.scale})` });
        },
      };
    },
  };
}
function stampFilm(kind) {
  const choose = kind === 'choose';
  return {
    caption: `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · once, on the accepted receipt`,
    end: reduced => motionEnd(kind, reduced),
    build: stage => {
      const s = { position: choose ? 'Junction' : 'B1', direction: choose ? 'Red' : 'Blue' };
      const node = panel(s, { courses: choose ? both('Junction') : [['B1', 'B2']] });
      const other = choose ? node.querySelectorAll('.nav-course')[0] : null;
      const mark = stamp(choose ? C.stampChosen : C.stampConfirmed);
      stage.append(el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, el('span', { class: 'lib-tape' }, C.tapeCourse), el('span', { class: 'lib-stamp-slot' }, mark)), node));
      return {
        seek: (t, reduced) => {
          const F = FRAMES[kind](t, { reduced });
          if (other) other.style.opacity = String(F.other.opacity);
          Object.assign(mark.style, { opacity: String(F.stamp.opacity), transform: `rotate(${F.stamp.rotate}deg) scale(${F.stamp.scale})` });
        },
      };
    },
  };
}
const filmPlayer = (kind, draw, endOf, caption) => ({
  caption,
  end: reduced => endOf(reduced ? 'reduced' : 'full'),
  build: stage => {
    const box = filmBox(kind === 'transit' ? 'band' : 'arrival', '');
    stage.append(box);
    const layer = box.querySelector('.nav-film__layer');
    return { seek: (t, reduced) => { layer.innerHTML = draw(t, reduced ? 'reduced' : 'full'); } };
  },
});

function motionCards() {
  return [
    player('step-advance', 'Advance', stepFilm('B1', 'B2')),
    player('step-switch', 'Switch', stepFilm('B2', 'R2')),
    player('step-arrive', 'Arrive', stepFilm('R2', 'Red Planet')),
    player('choose', 'Tie choice accepted', stampFilm('choose')),
    player('confirm', 'Acknowledgement accepted', stampFilm('confirm')),
    player('transit', 'Public transit', filmPlayer('transit', bandFilm, v => filmEnd('transit', 'phone', v), `${filmEnd('transit', 'phone')} ms on a phone (${filmEnd('transit', 'display')} ms on the display) · reduced ${filmEnd('transit', 'phone', 'reduced')} ms · the same for every movement`)),
    player('arrival-blue', 'Arrival: Blue Planet', filmPlayer('arrival', (t, v) => arrivalFilm(t, 'Blue', v), v => filmEnd('arrival-blue', 'phone', v), `${filmEnd('arrival-blue', 'phone')} ms on a phone (${filmEnd('arrival-blue', 'display')} ms on the display) · reduced: the final still, ${filmEnd('arrival-blue', 'phone', 'reduced')} ms in`)),
    player('arrival-red', 'Arrival: Red Planet', filmPlayer('arrival', (t, v) => arrivalFilm(t, 'Red', v), v => filmEnd('arrival-red', 'phone', v), `${filmEnd('arrival-red', 'phone')} ms on a phone (${filmEnd('arrival-red', 'display')} ms on the display) · reduced: the final still, ${filmEnd('arrival-red', 'phone', 'reduced')} ms in`)),
  ];
}

// ---------- the page ----------

async function main() {
  await loadArt([
    [new URL('../../abilities/assets/abilities.art.css', import.meta.url).href, 'abilities'],
    [new URL('./assets/navigation.art.css', import.meta.url).href, 'navigation'],
  ]);
  mountPage({
    title: 'Library group 2: navigation',
    intro: `Every state is computed by states.mjs from a synthetic view (protocol 3 candidate fields): the offices' private route panel and the public strip. Offices: Gus (the Captain) and Ben (the Officer); Eli is ordinary crew. The panel never shows a total, a weight or the direction before a ship hack; the public strip never shows the route or a direction until arrival. Office states: ${STATES.office.join(', ')}. Public: ${STATES.public.join(', ')}. Words are proposals for Frontend.`,
    groups: [
      ['captain', 'The Captain\'s panel (private)', () => officeCases(CAPTAIN)],
      ['officer', 'The Officer\'s panel (private)', () => officeCases(OFFICER)],
      ['others', 'Every other seat, and the tray', otherCards],
      ['public', 'The public strip (every screen)', publicCards],
      ['motion', 'Motion and films', motionCards],
    ],
  });
}

main().catch(failed);

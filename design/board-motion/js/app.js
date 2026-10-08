// mothership:dev-only
//
// The board-motion prototype (issue #87): a working phone screen where every action is played
// on the comic board. It mirrors the pinned release's controller semantics
// (apps/game/src/connected/action-flow.ts, packages/presentation/src/model/connected-player.ts):
// one command at a time; what can be chosen is only what the viewer's own view offers; a
// choice is confirmed explicitly; "accepted" is only what the server answered; a choice that
// was not sent does not outlive the conditions it was made under. The server here is a
// labeled stand-in that answers as the fixture panel says. Nothing is resolved.

import { h, vh } from './h.js';
import { createBoard } from './board.js';
import { createDirector } from './director.js';
import { COPY, PROPOSED, SHELL } from './copy.js';
import { SCENARIOS, EVENTS, SYNTHETIC_LABEL, VIEWER, LONG_NAMES, scenario as findScenario } from './fixtures.js';
import { MOVE_ROOMS } from './layout.js';
import { loadBundles } from '../../prototypes/js/bundles.js';

const params = new URLSearchParams(location.search);
const chrome = params.get('chrome') !== '0';
const frozen = params.has('t') || params.get('freeze') === '1' || !chrome;
const stations = await (await fetch(new URL('../contract/stations.json', import.meta.url))).json();

/** replaceChildren that skips nothing-children, so that no "null" is ever drawn. */
const put = (node, ...children) => node.replaceChildren(...children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false));

const ROLE_LOOK = {
  Officer: ['officer', 'Blue'], Insider: ['insider', 'Blue'], Cracker: ['cracker', 'Blue'], 'Blue Disabler': ['blue-disabler', 'Blue'], Supplier: ['supplier', 'Blue'],
  Undercover: ['undercover', 'Red'], Hacker: ['hacker', 'Red'], 'Red Disabler': ['red-disabler', 'Red'], Alien: ['alien', 'Alien'],
};
const TRAY_ORDER = ['shot', 'disable', 'protect', 'rescue', 'scan', 'supply', 'hack', 'code', 'showdown-shot', 'vote', 'release-choice', 'release-vote'];
const SEAT_KINDS = ['shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot', 'vote', 'release-choice'];
const PARTS = { scan: 1, supply: 2, code: 4 };
const ICON = { shot: '◎', disable: '⊘', protect: '◇', rescue: '+', hack: '⌁', 'showdown-shot': '◎', scan: '?', supply: '⇄', code: '#', vote: '✓', 'release-choice': '⌂', 'release-vote': '✓' };

// ---------- state ----------
const S = { motion: params.get('motion') === 'reduced' ? 'reduced' : 'full' };
const announce = { public: [], private: [] };

function load(id) {
  const entry = findScenario(id);
  const st = entry.s();
  Object.assign(S, {
    scenarioId: entry.id, title: entry.title, public: st.public, private: st.private, flow: st.flow, view: st.view,
    answer: params.get('answer') ?? st.answer, banner: st.banner, legacy: st.legacy, notice: st.notice, revision: 1, timer: st.public.phase.seconds,
    names: params.get('names') ?? entry.names ?? 'short', armedAt: 0, lastSnapshot: null,
  });
  if (S.names === 'long') S.public.seats.forEach((seat, index) => { seat.name = LONG_NAMES[index]; });
  // A scenario that starts mid-flow takes its picks as seat numbers or answers, as the controls carry them.
  S.flow = { ...S.flow, picked: [...(S.flow.picked ?? [])] };
}

const seatOf = n => S.public.seats.find(seat => seat.n === n);
const nameOf = n => seatOf(n)?.name ?? `Player ${n}`;
const whoIs = n => COPY.who(n, n === VIEWER);
const offers = () => S.private.offers;
const seatsPicked = () => S.flow.picked.filter(value => typeof value === 'number');
const voteOn = () => (S.public.phase.kind === 'CAPTAIN_ELECTION' || S.public.phase.kind === 'JAIL_VOTE' ? S.public.phase.kind : 'other');
const releaseSubject = () => (S.public.ballot?.release ? whoIs(S.public.ballot.release) : null);
const paused = () => S.banner === 'stale' || S.timer <= 0;

function offerSeats(kind) {
  const offer = offers()[kind];
  if (kind === 'code') return offer ? S.public.seats.map(seat => seat.n) : [];
  if (kind === 'vote') return offer?.targets ?? [];
  return Array.isArray(offer) ? offer : [];
}
const isOpen = kind => (kind === 'release-vote' ? Boolean(offers()['release-vote']) : kind === 'code' ? Boolean(offers().code) : offerSeats(kind).length > 0 || (kind === 'vote' && Boolean(offers().vote)));

function passAvailable() {
  const settled = ['accepted', 'rejected', 'not-accepted', 'unknown'].includes(S.flow.step) && S.flow.step !== 'unknown' && Date.now() - S.armedAt > 400;
  return Boolean(offers().pass) && !S.legacy && !paused() && S.public.phase.kind === 'ORDINARY_TURN' && S.public.active === VIEWER && (S.flow.step === 'idle' || settled);
}

// ---------- the controller: the release's steps, in the prototype ----------
function openAction(kind) {
  if (S.flow.step !== 'idle' || paused()) return;
  S.flow = { step: 'choosing', kind, picked: [] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function pick(value) {
  const { kind, picked } = S.flow;
  if (S.flow.step !== 'choosing') return;
  const seat = typeof value === 'number' ? value : null;
  if (seat !== null && !offerSeats(kind).includes(seat)) return;
  if (seat !== null && picked.includes(seat)) return;
  const next = [...picked, value];
  const whole = kind === 'scan' ? next.length === 2 : kind in PARTS ? next.length === PARTS[kind] : true;
  S.flow = whole ? { step: 'confirming', kind, picked: next } : { step: 'choosing', kind, picked: next };
  S.picking = seat;
  render({ focus: 'strip' });
}

function back() {
  const { step, kind, picked } = S.flow;
  if (step === 'choosing') S.flow = picked.length ? { step, kind, picked: picked.slice(0, -1) } : { step: 'idle' };
  else if (step === 'confirming') S.flow = kind === 'move' || kind === 'pass' ? { step: 'idle' } : { step: 'choosing', kind, picked: picked.slice(0, -1) };
  render({ focus: S.flow.step === 'idle' ? 'nav' : 'strip' });
}

function confirm() {
  if (S.flow.step !== 'confirming' || paused()) return;
  S.flow = { ...S.flow, step: 'submitting' };
  render({ focus: 'strip' });
  const answer = S.answer;
  const latency = params.get('play') === 'register' ? 0 : answer === 'slow' ? 2500 : 650;
  setTimeout(() => respond(answer), latency);
}

function respond(answer) {
  if (S.flow.step !== 'submitting' && S.flow.step !== 'checking') return;
  S.armedAt = Date.now();
  if (answer === 'reject' || answer === 'reject-closed') S.flow = { ...S.flow, step: 'rejected', code: answer === 'reject' ? 'NOT_ALLOWED' : 'PHASE_CLOSED' };
  else if (answer === 'lose' && S.flow.step === 'submitting') S.flow = { ...S.flow, step: 'unknown' };
  else {
    S.flow = { ...S.flow, step: 'accepted' };
    announce.private.push(acceptedText());
    authoritativeFollowUp();
  }
  render({ focus: 'strip' });
}

/** What the server does next, publicly, for the commands whose effect is immediate: a move and a Pass. */
function authoritativeFollowUp() {
  const { kind, picked } = S.flow;
  if (kind === 'move') setTimeout(() => deliver({ type: 'PUBLIC_MOVE', seat: VIEWER, location: picked[0] }), params.has('t') ? 0 : 500);
  if (kind === 'pass') setTimeout(() => deliver({ type: 'PHASE_CHANGED', next: 'turn' }), params.has('t') ? 0 : 600);
  if (kind === 'scan') S.private.knowledge = [...S.private.knowledge, `Round ${S.public.round}: you scanned ${whoIs(picked[0])}, guessing ${picked[1]}. Synthetic: the server gives the result here, privately.`];
}

function checkAgain() {
  if (S.flow.step !== 'unknown') return;
  S.flow = { ...S.flow, step: 'checking' };
  render({ focus: 'strip' });
  setTimeout(() => respond('accept'), 600);
}

function dismiss() {
  if (!['accepted', 'rejected', 'unknown'].includes(S.flow.step) || S.flow.step === 'unknown') return;
  S.flow = { step: 'idle' };
  render({ focus: 'nav' });
}

function pressRoom(location, tag) {
  tag?.closest('.bm-tag')?.setAttribute('data-pressed', '');
  setTimeout(() => tag?.closest('.bm-tag')?.removeAttribute('data-pressed'), 140);
  if (S.flow.step !== 'idle') { notice(SHELL.finishFirst); return; }
  if (paused() || !(offers().move ?? []).includes(location)) { notice(SHELL.cannotMove); return; }
  S.flow = { step: 'confirming', kind: 'move', picked: [location] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function pressPass() {
  if (!passAvailable()) return;
  S.flow = { step: 'confirming', kind: 'pass', picked: ['pass'] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function notice(text) { S.notice = text; render(); clearTimeout(S.noticeTimer); if (!frozen) S.noticeTimer = setTimeout(() => { S.notice = null; render(); }, 2600); }

/** A choice that was not sent is dropped when the page goes to the background, the view goes stale or time runs out. */
function dropUnsent(reason) {
  if (S.flow.step === 'choosing' || S.flow.step === 'confirming') { S.flow = { step: 'idle' }; S.notice = reason; }
  if (S.view === 'card') S.view = 'board';
}

// ---------- public facts: the authoritative updates every screen receives ----------
function deliver(fact) {
  const previous = structuredClone(S.public);
  let kind = 'update';
  if (fact.type === 'REPLAY') { kind = 'replay'; }
  else if (fact.type === 'RECONNECT') { kind = 'reconnect'; S.revision += 1; dropUnsent(COPY.choiceDropped); }
  else {
    S.revision += 1;
    const seat = fact.seat ? seatOf(fact.seat) : null;
    if (fact.type === 'PUBLIC_MOVE' && seat) {
      seat.location = fact.location;
      if (fact.jailed !== undefined) seat.jailed = fact.jailed;
      if (seat.n === VIEWER) { S.private.offers.move = (S.private.offers.move ?? []).filter(room => room !== fact.location); if (S.flow.kind === 'move' && S.flow.step === 'accepted') S.flow = { ...S.flow, arrived: true }; }
      announce.public.push(COPY.announce.location(seat.n, fact.location));
    }
    if (fact.type === 'PUBLIC_HEALTH_CHANGED' && seat) {
      seat.health = fact.health;
      if (fact.revealedFaction) seat.revealedFaction = fact.revealedFaction;
      announce.public.push(COPY.announce.health(seat.n, fact.health));
    }
    if (fact.type === 'VIEW_CAPTAIN') {
      for (const other of S.public.seats) if (other.captain && other.n !== fact.seat) { other.captain = false; announce.public.push(COPY.announce.captainEnded(other.n)); }
      seatOf(fact.seat).captain = true;
      announce.public.push(COPY.announce.captain(fact.seat));
    }
    if (fact.type === 'PHASE_CHANGED') {
      const living = S.public.seats.filter(item => item.health !== 'Eliminated').map(item => item.n);
      const at = living.indexOf(S.public.active ?? living[0]);
      S.public.active = living[(at + 1) % living.length];
      if (fact.next === 'round') S.public.round = Math.min(5, S.public.round + 1);
      S.public.phase = { kind: 'ORDINARY_TURN', seconds: 60 };
      S.timer = 60;
      if (S.flow.kind === 'pass' && S.flow.step === 'accepted') S.flow = { ...S.flow, phaseShown: true };
      if (S.flow.step === 'choosing' || S.flow.step === 'confirming') { S.flow = { step: 'idle' }; S.notice = COPY.choiceDropped; }
      S.private.offers.pass = S.public.active === VIEWER;
    }
  }
  render({ previous, kind });
}

// ---------- drawing ----------
const root = document.getElementById('app');
const phone = h('div', { class: 'bm-app', 'data-frame': chrome ? 'phone' : 'full', id: 'bm-app' });
const status = h('header', { class: 'bm-status', 'data-cue-at': 'phase' });
const strip = h('section', { class: 'bm-strip', id: 'bm-strip', 'aria-live': 'polite', hidden: true });
const tray = h('section', { class: 'bm-tray', id: 'bm-tray', 'aria-labelledby': 'bm-tray-heading', hidden: true });
const card = h('section', { class: 'bm-sheet', id: 'bm-card', 'aria-labelledby': 'bm-card-heading', hidden: true });
const menu = h('section', { class: 'bm-sheet', id: 'bm-menu', 'aria-labelledby': 'bm-menu-heading', hidden: true });
const nav = h('nav', { class: 'bm-nav', 'aria-label': SHELL.navigation });
const live = h('div', { class: 'bm-vh', 'aria-live': 'polite', id: 'bm-live' });
const livePrivate = h('div', { class: 'bm-vh', 'aria-live': 'polite', id: 'bm-live-private', 'data-private': 'true' });
const boardHost = h('div', { class: 'bm-board-host', style: { display: 'contents' } });
phone.append(h('p', { class: 'bm-synthetic' }, 'Synthetic'), status, boardHost, strip, nav, tray, card, menu, live, livePrivate);
const board = createBoard(boardHost, { stations, interactive: true, viewer: VIEWER });
const fx = h('div', { class: 'bm-fx', 'aria-hidden': 'true' });
board.element.append(fx);
// Every cue either board plays, for the flows tool to count (dev-only): replays and reconnects must add none.
const cueLog = [];
window.__bmCues = cueLog;
const director = createDirector({ board, status, fx, hold: params.has('t'), reduced: () => S.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches, onCue: entry => cueLog.push({ board: 'own', ...entry }) });

// The observer: what every other phone and the shared display draw at the same moment.
let observer = null;
function buildObserver(container) {
  const app = h('div', { class: 'bm-app', 'data-frame': 'phone', 'data-observer': 'true' });
  const ostatus = h('header', { class: 'bm-status' });
  const host = h('div', { style: { display: 'contents' } });
  app.append(ostatus, host);
  // The other screens' phone, in a frame of its own size: what every other player and the display draw.
  container.append(h('div', { class: 'bm-frame' }, app));
  const oboard = createBoard(host, { stations, interactive: false, viewer: null, label: PROPOSED.observerTitle });
  const ofx = h('div', { class: 'bm-fx', 'aria-hidden': 'true' });
  oboard.element.append(ofx);
  const odirector = createDirector({ board: oboard, status: ostatus, fx: ofx, hold: params.has('t'), reduced: () => S.motion === 'reduced', onCue: entry => cueLog.push({ board: 'observer', ...entry }) });
  return { app, status: ostatus, board: oboard, director: odirector };
}

function drawStatus(target) {
  const { phase, round, active } = S.public;
  const own = target === status;
  const line = phase.kind === 'ORDINARY_TURN' ? (active === VIEWER && own ? COPY.phase.yourTurn : `${nameOf(active)}’s turn`) : COPY.phase.kind[phase.kind];
  const detail = phase.kind === 'ORDINARY_TURN' ? `Player ${active} · ${seatOf(active)?.location ?? ''}` : COPY.phase.round(round);
  const seconds = Math.max(0, S.timer);
  put(target,
    h('span', { class: 'bm-status__round' }, COPY.phase.round(round)),
    h('div', { class: 'bm-status__phase' }, h('p', { class: 'bm-status__line' }, line), h('p', { class: 'bm-status__detail' }, seconds === 0 ? COPY.timer.waiting : detail)),
    h('span', { class: 'bm-timer', role: 'timer', 'aria-label': `${COPY.timer.label}: ${seconds} seconds`, 'data-final': String(seconds <= 10) }, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`));
}

function boardCues() {
  const { step, kind } = S.flow;
  if (S.banner === 'stale' || S.view === 'card' || S.view === 'menu') return {};
  if (kind === 'move' && ['confirming', 'submitting', 'accepted'].includes(step) && !S.flow.arrived) return { ghost: { location: S.flow.picked[0], state: step === 'confirming' ? 'tentative' : 'pending' } };
  if (!kind || kind === 'move' || kind === 'pass' || kind === 'release-vote') return {};
  const multi = kind === 'supply' || kind === 'code';
  const seats = seatsPicked();
  if (step === 'choosing') {
    const facting = kind === 'scan' && seats.length === 1;
    return { choosing: true, eligible: facting ? [] : offerSeats(kind).filter(n => !seats.includes(n)), picked: seats, multi };
  }
  if (step === 'confirming') return { choosing: true, picked: seats, multi };
  if (step === 'submitting' || step === 'checking') return { pending: seats };
  return {};
}

function stripContent() {
  const { step, kind, picked = [] } = S.flow;
  if (step === 'idle') return null;
  const seats = picked.filter(value => typeof value === 'number');
  const kindLabel = h('span', { class: 'bm-strip__kind' }, COPY.kind[kind]);
  // The detail line may open with the progress of a choice in several parts.
  const line = (text, detail = null, lead = null) => [h('p', { class: 'bm-strip__line', id: 'bm-strip-line', tabindex: '-1' }, text), detail || lead ? h('p', { class: 'bm-strip__detail' }, lead, detail) : null];
  const button = (label, act, primary = false, extra = {}) => h('button', { type: 'button', class: `bm-btn${primary ? ' bm-btn--primary' : ''}`, 'data-act': act, ...extra }, label);
  const progress = of => h('div', { class: 'bm-strip__progress', 'aria-hidden': 'true' }, Array.from({ length: of }, (_, index) => h('span', { 'data-done': String(index < seats.length) }, index < seats.length ? String(index + 1) : '')));
  if (step === 'choosing') {
    let text, lead = null, controls = [];
    if (kind === 'scan' && seats.length === 1) {
      text = COPY.compound.scanGuess(whoIs(seats[0]));
      controls = ['Blue', 'Red', 'Alien'].map(faction => button(faction, `answer:${faction}`, false, { class: 'bm-btn bm-btn--choice' }));
    } else if (kind === 'supply') { text = seats.length === 0 ? COPY.compound.supplyFirst : COPY.compound.supplySecond; lead = progress(2); }
    else if (kind === 'code') { text = COPY.compound.codePick(4 - seats.length); lead = progress(4); }
    else if (kind === 'scan') text = COPY.compound.scanSeat;
    else if (kind === 'vote') { text = COPY.ballot.votePrompt[voteOn()]; controls = [button(COPY.ballot.abstain, 'answer:none', false, { class: 'bm-btn bm-btn--choice' })]; }
    else if (kind === 'release-choice') { text = COPY.choosePrompt['release-choice']; controls = [button(COPY.ballot.noRequest, 'answer:none', false, { class: 'bm-btn bm-btn--choice' })]; }
    else if (kind === 'release-vote') {
      text = COPY.ballot.releaseVotePrompt(releaseSubject());
      controls = [button(COPY.ballot.yes, 'answer:yes'), button(COPY.ballot.no, 'answer:no'), button(COPY.ballot.abstain, 'answer:none')].map(b => { b.classList.add('bm-btn--choice'); return b; });
    } else text = COPY.choosePrompt[kind];
    const tap = kind === 'release-vote' || (kind === 'scan' && seats.length === 1) ? null : SHELL.tapCharacter;
    const backLabel = seats.length > 0 ? COPY.compound.undo(seats.at(-1) === VIEWER ? `Player ${VIEWER} (you)` : `Player ${seats.at(-1)}`) : COPY.cancel;
    const words = line(text, seats.length && kind !== 'scan' ? COPY.compound.picked(seats.map(n => (n === VIEWER ? `Player ${n} (you)` : `Player ${n}`)).join(', ')) : tap, lead);
    // Going back sits at the side of the words. Beside a single answer (Abstain, No release
    // request) it shares that answer's row, and a long one (Take back Player 2) with no answer
    // takes the row itself, so that the question keeps the whole width.
    const back = button(backLabel, 'back');
    return controls.length === 1 || (controls.length === 0 && backLabel.length > 11)
      ? { step, kindLabel, text: words, controls: [...controls, back] } : { step, kindLabel, text: words, controls, side: back };
  }
  if (step === 'confirming') {
    return { step, kindLabel, text: line(confirmText(), consequence()),
      controls: [button(COPY.confirm[kind], 'confirm', true, { 'aria-disabled': String(paused()) }), button(COPY.chooseAgain, 'back')] };
  }
  if (step === 'submitting' || step === 'checking') return { step, kindLabel, stamp: ['pending', PROPOSED.pendingStamp], text: line(step === 'checking' ? COPY.checking : COPY.submitting[kind]), controls: [] };
  if (step === 'accepted') return { step, kindLabel, stamp: ['registered', PROPOSED.registeredStamp], text: line(acceptedText(), acceptedDetail()), controls: [], side: button(COPY.done, 'dismiss', true) };
  if (step === 'rejected') return { step: 'not-accepted', kindLabel, stamp: ['not-accepted', PROPOSED.notAcceptedStamp], text: line(COPY.rejected[S.flow.code], S.flow.code === 'NOT_ALLOWED' ? COPY.tryAgainHint : null), controls: [], side: button(COPY.ok, 'dismiss', true) };
  if (step === 'unknown') return { step, kindLabel, stamp: ['unknown', PROPOSED.unknownStamp], text: line(COPY.unknown, COPY.unknownDetail), controls: [], side: button(COPY.checkAgain, 'check', true) };
  return null;
}

function confirmText() {
  const { kind, picked } = S.flow;
  const seats = picked.filter(value => typeof value === 'number');
  switch (kind) {
    case 'pass': return SHELL.passConfirm;
    case 'move': return COPY.confirmMove(picked[0]);
    case 'vote': return picked[0] === 'none' ? COPY.ballot.confirmAbstain : COPY.ballot.confirmVote[voteOn()](whoIs(picked[0]));
    case 'release-choice': return picked[0] === 'none' ? COPY.ballot.confirmNoRequest : COPY.ballot.confirmRelease(whoIs(picked[0]));
    case 'release-vote': return picked[0] === 'none' ? COPY.ballot.confirmAbstain : COPY.ballot.confirmReleaseVote[picked[0]](releaseSubject());
    case 'scan': return COPY.compound.confirmScan(whoIs(seats[0]), picked[1]);
    case 'supply': return COPY.compound.confirmSupply(whoIs(seats[0]), whoIs(seats[1]));
    case 'code': return COPY.compound.confirmCode([...seats].sort((a, b) => a - b).map(n => (n === VIEWER ? `Player ${n} (you)` : `Player ${n}`)).join(', '));
    default: return COPY.confirmTarget[kind](whoIs(seats[0]));
  }
}
const consequence = () => (S.flow.kind === 'release-choice' && S.flow.picked[0] === 'none' ? COPY.ballot.consequenceNoRequest : COPY.consequence[S.flow.kind]);
function acceptedText() {
  const { kind, picked } = S.flow;
  const seats = picked.filter(value => typeof value === 'number');
  switch (kind) {
    case 'pass': return SHELL.passAccepted;
    case 'move': return COPY.moved(picked[0]);
    case 'vote': return picked[0] === 'none' ? COPY.ballot.abstained : COPY.ballot.votedFor(whoIs(picked[0]));
    case 'release-choice': return picked[0] === 'none' ? COPY.ballot.noRequestMade : COPY.ballot.releaseRequested(whoIs(picked[0]));
    case 'release-vote': return picked[0] === 'none' ? COPY.ballot.abstained : COPY.ballot.releaseVoted[picked[0]];
    case 'scan': return COPY.compound.scanAccepted(whoIs(seats[0]), picked[1]);
    case 'supply': return COPY.compound.supplyAccepted(whoIs(seats[0]), whoIs(seats[1]));
    case 'code': return COPY.compound.codeAccepted;
    default: return COPY.acceptedTarget[kind](whoIs(seats[0]));
  }
}
function acceptedDetail() {
  const { kind } = S.flow;
  if (kind === 'pass') return SHELL.passDetail;
  if (kind === 'move') return S.flow.arrived ? PROPOSED.moveArrived : PROPOSED.moveSent;
  if (['vote', 'release-choice', 'release-vote'].includes(kind)) return COPY.ballot.acceptedDetail[kind];
  if (kind === 'scan') return COPY.compound.scanDetail;
  if (kind === 'supply') return COPY.compound.supplyDetail;
  if (kind === 'code') return COPY.compound.codeDetail;
  return COPY.acceptedDetail[kind];
}

function drawStrip() {
  const content = stripContent();
  strip.hidden = content === null;
  if (!content) { put(strip); delete strip.dataset.step; return; }
  strip.dataset.step = content.step;
  if (S.enter) { strip.dataset.enter = ''; S.enter = false; setTimeout(() => delete strip.dataset.enter, 260); }
  // The words first, with the action's name set into them; one control at the side (back, Done,
  // OK, Check again); answers and the confirmation in one row beneath.
  put(strip, h('div', { class: 'bm-strip__text' }, content.kindLabel, content.text),
    content.side ? h('div', { class: 'bm-strip__side' }, content.side) : null,
    content.stamp ? h('span', { class: 'bm-stamp', 'data-kind': content.stamp[0] }, content.stamp[1]) : null,
    content.controls.length ? h('div', { class: 'bm-strip__controls' }, content.controls) : null);
}

function drawTray() {
  tray.hidden = !(S.view === 'actions' && S.flow.step === 'idle');
  if (tray.hidden) return;
  const open = TRAY_ORDER.filter(kind => isOpen(kind));
  put(tray,
    h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-tray-heading', tabindex: '-1' }, SHELL.nav.actions), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×')),
    S.private.pending ? h('p', { class: 'bm-tray__empty' }, COPY.queued(S.private.pending)) : null,
    paused() ? h('p', { class: 'bm-tray__empty' }, S.banner === 'stale' ? COPY.actions.pausedStale : COPY.actions.pausedExpired)
      : open.length ? h('ul', { class: 'bm-tray__grid' }, open.map(kind => h('li', null, h('button', { type: 'button', class: 'bm-chip', 'data-act': `open:${kind}`, id: `bm-open-${kind}` },
        h('span', { class: 'bm-chip__icon', 'aria-hidden': 'true' }, ICON[kind] ?? '•'), h('span', { class: 'bm-chip__name' }, COPY.kind[kind]), h('span', { class: 'bm-chip__hint' }, COPY.open[kind])))))
        : h('p', { class: 'bm-tray__empty' }, SHELL.noActions));
}

function drawCard() {
  card.hidden = S.view !== 'card';
  if (card.hidden) { put(card); return; }
  // Built only while open: closed, there is no private word in the document.
  const self = seatOf(VIEWER);
  const [device, team] = ROLE_LOOK[S.private.role] ?? ['officer', 'Blue'];
  const knowledge = [...S.private.knowledge, ...(S.private.hackPartner ? [COPY.hackWith(S.private.hackPartner)] : [])];
  put(card,
    h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-card-heading', tabindex: '-1' }, SHELL.yourCard), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×')),
    h('p', { class: 'bm-hint' }, COPY.privateArea.hint),
    h('div', { class: 'bm-card bm-private', 'data-character': self.character, 'data-device': device, 'data-team': team.toLowerCase() },
      h('span', { class: 'bm-card__art', 'aria-hidden': 'true' }),
      h('div', null, h('p', { class: 'bm-card__name' }, S.private.role), h('p', { class: 'bm-card__team' }, `${team} team`))),
    knowledge.length ? h('ul', { class: 'bm-know', 'aria-label': 'What you know' }, knowledge.map(item => h('li', null, item))) : null);
}

function drawMenu() {
  menu.hidden = S.view !== 'menu';
  if (menu.hidden) { put(menu); return; }
  put(menu,
    h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-menu-heading', tabindex: '-1' }, SHELL.nav.menu), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×')),
    h('p', { class: 'bm-hint' }, SYNTHETIC_LABEL),
    h('table', { class: 'bm-list' }, h('caption', { class: 'bm-vh' }, SHELL.readableList),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, COPY.roster.column.player), h('th', { scope: 'col' }, COPY.roster.column.location), h('th', { scope: 'col' }, COPY.roster.column.status))),
      h('tbody', null, S.public.seats.map(seat => h('tr', null, h('th', { scope: 'row' }, `${seat.n} · ${seat.name}`), h('td', null, seat.location),
        h('td', null, [seat.n === VIEWER ? COPY.marker.self : null, seat.n === S.public.active ? COPY.marker.turn : null, seat.captain ? COPY.marker.captain : null, seat.health !== 'Healthy' ? seat.health : null, seat.jailed ? COPY.marker.jailed : null, seat.revealedFaction ? COPY.marker.faction(seat.revealedFaction) : null].filter(Boolean).join(', ') || COPY.roster.noStatus))))),
    h('label', { class: 'bm-hint' }, h('input', { type: 'checkbox', 'data-act': 'motion', checked: S.motion === 'reduced' }), ' Reduce motion'));
}

function drawNav() {
  const item = (view, label, icon) => h('button', { type: 'button', 'data-view': view, 'aria-pressed': String(S.view === view), id: `bm-nav-${view}` }, h('span', { class: 'bm-nav__icon', 'data-icon': icon, 'aria-hidden': 'true' }), h('span', null, label));
  const available = passAvailable();
  put(nav, item('board', SHELL.nav.board, 'board'), item('actions', SHELL.nav.actions, 'actions'),
    S.legacy ? h('span', { 'aria-hidden': 'true' }) : h('button', { type: 'button', class: 'bm-pass', id: 'bm-pass', 'data-act': 'pass', 'aria-label': SHELL.passLabel, 'aria-disabled': String(!available) },
      h('span', { class: 'bm-nav__icon', 'data-icon': 'pass', 'aria-hidden': 'true' }), h('span', null, 'Pass')),
    item('card', SHELL.nav.card, 'card'), item('menu', SHELL.nav.menu, 'menu'));
}

function render({ previous = null, kind = 'update', focus = null } = {}) {
  markShort();
  const before = previous ? director.before() : null;
  const obefore = previous && observer ? observer.director.before() : null;
  phone.dataset.motion = S.motion;
  phone.dataset.view = S.view;
  document.documentElement.dataset.motion = S.motion;
  drawStatus(status);
  board.update(S.public, boardCues());
  drawStrip(); drawTray(); drawCard(); drawMenu(); drawNav();
  fitBoard(board.element);
  phone.querySelector('.bm-notice')?.remove();
  phone.querySelector('.bm-banner')?.remove();
  if (S.banner === 'stale') phone.append(h('p', { class: 'bm-banner', role: 'status' }, COPY.banner.stale));
  else if (S.notice) phone.append(h('p', { class: 'bm-notice', role: 'status' }, S.notice));
  if (previous) director.after(previous, S.public, before, { kind, revision: S.revision });
  if (observer) {
    drawStatus(observer.status);
    observer.board.update(S.public, {});
    fitBoard(observer.board.element);
    if (previous) observer.director.after(previous, S.public, obefore, { kind, revision: S.revision });
  }
  for (const text of announce.public.splice(0)) live.append(h('p', null, text));
  for (const text of announce.private.splice(0)) livePrivate.append(h('p', null, text));
  // Private words leave the document as soon as nothing private is open.
  if (S.view !== 'card' && S.flow.step === 'idle') livePrivate.replaceChildren();
  if (focus === 'strip') document.getElementById('bm-strip-line')?.focus({ preventScroll: true });
  if (focus === 'nav') document.getElementById('bm-nav-actions')?.focus({ preventScroll: true });
  if (focus === 'sheet') phone.querySelector('.bm-sheet:not([hidden]) h2, .bm-tray:not([hidden]) h2')?.focus({ preventScroll: true });
  window.__bmState = { scenario: S.scenarioId, flow: S.flow, view: S.view, active: S.public.active, revision: S.revision };
}

/**
 * The board's three bands share the screen by public occupancy. Each band needs its rooms' name
 * tags, the piece pad and one row unit per row of characters, inside the panels' borders; what
 * is left is shared out. The row unit is at least 44 px while characters can be tapped, so that
 * no two press areas overlap and none reaches under a room's tag; with nothing to tap (a
 * confirmation, a receipt) it may shrink to 30 px, so a taller strip never covers a room.
 */
const BANDS = { top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] };
function fitBoard(element) {
  const height = element.clientHeight;
  if (!height) return;
  const style = element.style;
  const board = getComputedStyle(element);
  const outer = parseFloat(board.paddingTop) + parseFloat(board.paddingBottom) + 2 * parseFloat(board.rowGap);
  if (element.dataset.final === 'true') { style.setProperty('--row-unit', `${Math.min(76, Math.max(48, (height - outer - 32) / 3))}px`); return; }
  const live = Boolean(element.querySelector('.bm-piece__target'));
  const minUnit = live ? 44 : 30;
  const base = Object.entries(BANDS).map(([, rooms]) => Math.max(...rooms.map(id => {
    const room = element.querySelector(`.bm-room[data-room="${id}"]`);
    const tag = room.querySelector('.bm-tag');
    const fixed = tag.classList.contains('bm-tag--fixed');
    // A move tag's button is its press area; a fixed caption keeps its 3 px inset above and below.
    // A public label over a head (On the ballot, a published count) gets its own line below the tag.
    const label = room.querySelector('.bm-piece__subject, .bm-piece__tally') ? 16 : 0;
    const cap = Math.ceil((fixed ? tag.offsetHeight + 6 : Math.max(44, tag.offsetHeight)) + label);
    room.style.setProperty('--bm-cap', `${cap}px`);
    const css = getComputedStyle(room);
    return parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth) + cap + parseFloat(css.getPropertyValue('--bm-pad'));
  })));
  const rows = Object.keys(BANDS).map(band => Number(style.getPropertyValue(`--rows-${band}`)) || 0);
  const total = rows.reduce((sum, value) => sum + value, 0);
  const spare = height - outer - base.reduce((a, b) => a + b, 0);
  const unit = Math.max(minUnit, Math.min(74, spare / Math.max(1, total)));
  const need = base.map((value, index) => value + rows[index] * unit);
  const weights = [0.8, 1.25, 1].map((w, index) => (rows[index] === 0 ? 0 : w));
  const left = Math.max(0, height - outer - need.reduce((a, b) => a + b, 0));
  const share = weights.reduce((a, b) => a + b, 0) || 1;
  const sizes = need.map((value, index) => value + (left * weights[index]) / share);
  style.setProperty('--row-unit', `${unit}px`);
  for (const [index, band] of Object.keys(BANDS).entries()) style.setProperty(`--band-${band}`, `${sizes[index]}px`);
}

/** A short phone (568 px tall and the like) draws the same parts tighter: see .bm-app[data-short]. */
const SHORT_PX = 640;
const markShort = () => { phone.dataset.short = String(phone.clientHeight > 0 && phone.clientHeight <= SHORT_PX); };

// ---------- input ----------
phone.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const room = target.closest('button[data-move-room]');
  if (room) { pressRoom(room.dataset.moveRoom, room); return; }
  const choose = target.closest('button[data-intent="action/choose"]');
  if (choose) { pick(Number(choose.dataset.value.slice(5))); return; }
  const view = target.closest('button[data-view]');
  if (view) {
    const next = view.dataset.view === S.view && view.dataset.view !== 'board' ? 'board' : view.dataset.view;
    if (next === 'actions' && S.flow.step !== 'idle') { document.getElementById('bm-strip-line')?.focus(); return; }
    S.view = next;
    render({ focus: next === 'board' ? null : 'sheet' });
    return;
  }
  const act = target.closest('[data-act]')?.dataset.act;
  if (!act || target.closest('[aria-disabled="true"]')) { if (act === 'pass') notice(S.legacy ? PROPOSED.passLegacy : PROPOSED.passNotYours); return; }
  if (act.startsWith('open:')) openAction(act.slice(5));
  else if (act.startsWith('answer:')) pick(act.slice(7));
  else if (act === 'back') back();
  else if (act === 'confirm') confirm();
  else if (act === 'dismiss') dismiss();
  else if (act === 'check') checkAgain();
  else if (act === 'pass') pressPass();
  else if (act === 'close') { S.view = 'board'; render({ focus: 'nav' }); }
});
phone.addEventListener('change', event => {
  if (event.target.dataset?.act === 'motion') { S.motion = event.target.checked ? 'reduced' : 'full'; render(); }
});
phone.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (S.view !== 'board') { S.view = 'board'; render({ focus: 'nav' }); }
  else if (S.flow.step === 'choosing' || S.flow.step === 'confirming') back();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { dropUnsent(COPY.choiceDropped); director.cancelAll(); observer?.director.cancelAll(); render(); }
});
new ResizeObserver(() => { fitBoard(board.element); if (observer) fitBoard(observer.board.element); }).observe(board.element);
new ResizeObserver(markShort).observe(phone);

// ---------- the page around the phone: frame, observer and fixture controls ----------
async function loadArt() {
  await loadBundles(['public-board', 'player-ui', 'roles']);
  await new Promise(resolve => {
    const link = h('link', { rel: 'stylesheet', href: new URL('../assets/board-motion.art.css', import.meta.url).href });
    link.addEventListener('load', () => { document.documentElement.dataset.art = `${document.documentElement.dataset.art ?? ''} board-motion`.trim(); resolve(); }, { once: true });
    link.addEventListener('error', resolve, { once: true });
    document.head.append(link);
  });
}

function fixturePanel() {
  const select = h('select', { id: 'bm-scenario', 'aria-label': 'Scenario' });
  const groups = [...new Set(SCENARIOS.map(entry => entry.group))];
  for (const group of groups) select.append(h('optgroup', { label: group }, SCENARIOS.filter(entry => entry.group === group).map(entry => h('option', { value: entry.id, selected: entry.id === S.scenarioId }, entry.title))));
  select.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('scenario', select.value); location.href = url.href; });
  const answer = h('select', { id: 'bm-answer', 'aria-label': 'Next server answer' },
    [['accept', 'Accept (registered)'], ['reject', 'Reject: not allowed'], ['reject-closed', 'Reject: phase closed'], ['lose', 'Lose the answer (unknown)'], ['slow', 'Slow, then accept']].map(([value, label]) => h('option', { value, selected: value === S.answer }, label)));
  answer.addEventListener('change', () => { S.answer = answer.value; });
  const events = h('div', { class: 'bm-events' }, EVENTS.map(event => {
    const button = h('button', { type: 'button', 'data-event': event.id }, event.label);
    button.addEventListener('click', () => deliver(event.fact));
    return button;
  }));
  const toggle = (label, on, fn) => { const input = h('input', { type: 'checkbox', checked: on }); input.addEventListener('change', () => fn(input.checked)); return h('label', null, input, ` ${label}`); };
  return h('aside', { class: 'bm-panel', 'aria-label': 'Prototype controls (not part of the design)' },
    h('h2', null, 'Prototype controls · synthetic'),
    h('p', null, `${SYNTHETIC_LABEL}. Issue #87. The phone on the left is the design; these controls are not.`),
    h('fieldset', null, h('legend', null, 'Scenario'), select, h('button', { type: 'button', id: 'bm-restart' }, 'Restart')),
    h('fieldset', null, h('legend', null, 'The stand-in server'), answer, h('p', null, 'Every answer is labeled synthetic. Nothing is resolved.')),
    h('fieldset', null, h('legend', null, 'Public facts, to every screen'), events),
    h('fieldset', null, h('legend', null, 'Display'),
      toggle('Reduced motion', S.motion === 'reduced', on => { S.motion = on ? 'reduced' : 'full'; render(); }),
      toggle('Long names', S.names === 'long', on => { const url = new URL(location.href); url.searchParams.set('names', on ? 'long' : 'short'); location.href = url.href; })));
}

load(params.get('scenario') ?? 'board.idle');
await loadArt();
if (chrome) {
  const frame = h('div', { class: 'bm-frame', style: { '--frame-w': `${Number(params.get('w') ?? 390)}px`, '--frame-h': `${Number(params.get('h') ?? 844)}px` } }, phone);
  const watch = h('section', { class: 'bm-observer', 'aria-label': PROPOSED.observerTitle }, h('h2', null, PROPOSED.observerTitle));
  // ?panel=0 leaves out the fixture panel: the phone and the other screens side by side, for a capture.
  const panel = params.get('panel') === '0' ? null : fixturePanel();
  root.append(h('div', { class: 'bm-proto', 'data-pair': panel ? null : 'true' }, h('div', null, h('h2', { class: 'bm-vh' }, 'The phone'), frame), watch, panel));
  panel?.querySelector('#bm-restart').addEventListener('click', () => location.reload());
  observer = buildObserver(watch);
} else {
  root.append(phone);
  if (params.get('safe') === '1') { phone.style.setProperty('--bm-safe-top', '47px'); phone.style.setProperty('--bm-safe-bottom', '34px'); }
}
render();
if (!frozen) setInterval(() => { if (S.timer > 0 && S.public.phase.kind !== 'FINISHED') { S.timer -= 1; drawStatus(status); if (observer) drawStatus(observer.status); if (S.timer === 0) { dropUnsent(COPY.choiceDropped); render(); } } }, 1000);

// ---------- holds for storyboards and captures: ?play=<step>&t=<ms> ----------
const PLAY = {
  move: () => deliver(EVENTS.find(e => e.id === 'move').fact),
  injure: () => deliver(EVENTS.find(e => e.id === 'injure').fact),
  eliminate: () => deliver(EVENTS.find(e => e.id === 'eliminate').fact),
  jail: () => deliver(EVENTS.find(e => e.id === 'jail').fact),
  captain: () => deliver(EVENTS.find(e => e.id === 'captain').fact),
  phase: () => deliver(EVENTS.find(e => e.id === 'phase').fact),
  round: () => deliver(EVENTS.find(e => e.id === 'round').fact),
  replay: () => { deliver(EVENTS.find(e => e.id === 'move').fact); deliver({ type: 'REPLAY' }); },
  pick: () => { const first = offerSeats(S.flow.kind).find(n => !seatsPicked().includes(n)); if (first) pick(first); },
  register: () => confirm(),
  tray: () => { S.view = 'actions'; render(); },
  strip: () => openAction('shot'),
  card: () => { S.view = 'card'; render(); },
  tag: () => pressRoom('Room B', document.querySelector('[data-move-room="Room B"]')),
  self: () => { S.flow = { step: 'accepted', kind: 'move', picked: ['Room B'] }; render(); deliver({ type: 'PUBLIC_MOVE', seat: VIEWER, location: 'Room B' }); },
  reject: () => { S.answer = 'reject'; confirm(); },
};
const play = params.get('play');
if (play && PLAY[play]) {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  PLAY[play]();
  await new Promise(resolve => setTimeout(resolve, 20));
}
if (params.has('t')) {
  const t = Number(params.get('t'));
  const only = params.get('only');
  for (const animation of document.getAnimations()) {
    const target = animation.effect?.target;
    if (only && target instanceof Element && !target.matches(only) && !target.closest(only)) { animation.finish(); continue; }
    animation.pause();
    animation.currentTime = Math.min(t, Number(animation.effect?.getComputedTiming().endTime ?? t));
  }
}
window.__designReady = true;

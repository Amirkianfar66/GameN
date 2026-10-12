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
import { createBoard, geometry, pressRect } from './board.js';
import { SCENES } from '../scenes/index.mjs';
import { createDirector } from './director.js';
import { COPY, PROPOSED, SHELL } from './copy.js';
import { SCENARIOS, EVENTS, PRIVATE_EVENTS, SYNTHETIC_LABEL, VIEWER, LONG_NAMES, scenario as findScenario } from './fixtures.js';
import { MOVE_ROOMS } from './layout.js';
import { loadBundles } from '../../prototypes/js/bundles.js';
import { assemble, cancelMotion, closedFolder, insiderFile, pauseFile } from '../../abilities/js/dossier.js';
import { alienFile, BEAT_ID, clipIn, codeCard, hackerFile, printFresh, punch, scanTarget } from '../../abilities/js/intel.js';
import { cell, deliveries, discharge, drain, dropIn, rescueKit, supplyTags, target, tie, vials } from '../../abilities/js/tools.js';
import { crack, guardNotes, rounds, spend, weaponsNote } from '../../abilities/js/guard.js';
import { ballotBox, ballotSlip, connect, hackLink, handOn, post, speakingTurn } from '../../abilities/js/ballot.js';
import { specialShot } from '../../abilities/js/finale.js';

const params = new URLSearchParams(location.search);
const chrome = params.get('chrome') !== '0';
const frozen = params.has('t') || params.get('freeze') === '1' || !chrome;

/** replaceChildren that skips nothing-children, so that no "null" is ever drawn. */
const put = (node, ...children) => node.replaceChildren(...children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false));

/**
 * What each part of the phone last drew, by what it shows. An update that changes nothing in a part
 * (a duplicate snapshot, a public fact about someone else, the timer) leaves it as it is: nothing in
 * it plays again, and focus stays where it was. keep(node, key) says whether the part is already drawn.
 */
const drawnAs = new WeakMap();
const keep = (node, key) => { if (drawnAs.get(node) === key) return true; drawnAs.set(node, key); return false; };
const forget = node => drawnAs.delete(node);

const ROLE_LOOK = {
  Officer: ['officer', 'Blue'], Insider: ['insider', 'Blue'], Cracker: ['cracker', 'Blue'], 'Blue Disabler': ['blue-disabler', 'Blue'], Supplier: ['supplier', 'Blue'],
  Undercover: ['undercover', 'Red'], Hacker: ['hacker', 'Red'], 'Red Disabler': ['red-disabler', 'Red'], Alien: ['alien', 'Alien'],
};
const TRAY_ORDER = ['shot', 'disable', 'protect', 'rescue', 'scan', 'supply', 'hack', 'code', 'showdown-shot', 'vote', 'release-choice', 'release-vote'];
const SEAT_KINDS = ['shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot', 'vote', 'release-choice'];
const PARTS = { scan: 1, supply: 2, code: 4 };
// A match's two ends: the view's phase is FINISHED (a winner, the roles and the Code) or ABORTED (none of them).
const TERMINAL = ['FINISHED', 'ABORTED'];
const ICON = { shot: '◎', disable: '⊘', protect: '◇', rescue: '+', hack: '⌁', 'showdown-shot': '◎', scan: '?', supply: '⇄', code: '#', vote: '✓', 'release-choice': '⌂', 'release-vote': '✓' };

// ---------- state ----------
const S = { motion: params.get('motion') === 'reduced' ? 'reduced' : 'full' };
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reducedNow = () => S.motion === 'reduced' || motionQuery.matches;
const announce = { public: [], private: [] };
let countdownTimer = null;

function load(id) {
  const entry = findScenario(id);
  const st = entry.s();
  Object.assign(S, {
    scenarioId: entry.id, title: entry.title, fixtureStatus: entry.status ?? 'synthetic', public: st.public, private: st.private, flow: st.flow, view: st.view,
    answer: params.get('answer') ?? st.answer, banner: st.banner, legacy: st.legacy, notice: st.notice, revision: 1, timer: st.public.phase.seconds,
    // DSN-REQ-16, recommended: an out-of-date or timed-out view keeps the release's card, marked, instead of PR #88's closed folder.
    staleCard: params.get('stale') === 'card' || Boolean(st.staleCard),
    names: params.get('names') ?? entry.names ?? 'short', armedAt: 0, lastSnapshot: null,
    concealed: document.visibilityState !== 'visible', disposed: false, privateQuiet: false, requests: { sent: 0, lookups: 0 },
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
const ended = () => TERMINAL.includes(S.public.phase.kind);
// A finished match has no timer to run out: its end is never a pause.
// The view may be out of date: the connection is lost, or the latest update could not be read (the release's two banners).
const outOfDate = () => S.banner === 'stale' || S.banner === 'unreadable';
const paused = () => outOfDate() || (S.timer <= 0 && !ended());
const privateVisible = () => !S.concealed && !S.disposed && document.visibilityState === 'visible' && !paused();
// The card follows the private surfaces, except where an out-of-date or timed-out view keeps it (S.staleCard).
const cardVisible = () => !S.concealed && !S.disposed && document.visibilityState === 'visible' && (!paused() || S.staleCard);

function offerSeats(kind) {
  const offer = offers()[kind];
  if (kind === 'code') return offer ? S.public.seats.map(seat => seat.n) : [];
  if (kind === 'vote') return offer?.targets ?? [];
  return Array.isArray(offer) ? offer : [];
}
const isOpen = kind => (kind === 'release-vote' ? Boolean(offers()['release-vote']) : kind === 'code' ? Boolean(offers().code) : offerSeats(kind).length > 0 || (kind === 'vote' && Boolean(offers().vote)));

function passAvailable() {
  const settled = ['accepted', 'rejected', 'not-accepted', 'unknown'].includes(S.flow.step) && S.flow.step !== 'unknown' && Date.now() - S.armedAt > 400;
  return Boolean(offers().pass) && !S.legacy && privateVisible() && S.public.phase.kind === 'ORDINARY_TURN' && S.public.active === VIEWER && (S.flow.step === 'idle' || settled);
}

// ---------- the controller: the release's steps, in the prototype ----------
function openAction(kind) {
  if (S.flow.step !== 'idle' || !privateVisible()) return;
  S.privateQuiet = false;
  S.flow = { step: 'choosing', kind, picked: [] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function pick(value) {
  const { kind, picked } = S.flow;
  if (S.flow.step !== 'choosing' || !privateVisible()) return;
  S.privateQuiet = false;
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
  if (S.flow.step !== 'confirming' || !privateVisible()) return;
  S.privateQuiet = false;
  S.requests.sent += 1;
  S.flow = { ...S.flow, step: 'submitting', weaponsAtSend: S.private.resources?.weapons };
  render({ focus: 'strip' });
  const answer = S.answer;
  const latency = params.get('play') === 'register' ? 0 : answer === 'slow' ? 2500 : 650;
  setTimeout(() => respond(answer), latency);
}

function respond(answer) {
  if (S.disposed) return;
  if (S.flow.step !== 'submitting' && S.flow.step !== 'checking') return;
  S.armedAt = Date.now();
  if (answer === 'reject' || answer === 'reject-closed') S.flow = { ...S.flow, step: 'rejected', code: answer === 'reject' ? 'NOT_ALLOWED' : 'PHASE_CLOSED' };
  else if (answer === 'lose' && S.flow.step === 'submitting') S.flow = { ...S.flow, step: 'unknown' };
  else {
    S.flow = { ...S.flow, step: 'accepted' };
    // Synthetic: a Rescue's use is reserved when it is accepted (V1-15), so the view that comes with the acceptance counts one fewer.
    if (S.flow.kind === 'rescue' && S.private.resources?.rescues > 0) S.private.resources = { ...S.private.resources, rescues: S.private.resources.rescues - 1 };
    // Synthetic: a shot uses one ordinary weapon when it is accepted, and the view says so.
    if (S.flow.kind === 'shot' && S.private.resources?.weapons > 0) S.private.resources = { ...S.private.resources, weapons: S.private.resources.weapons - 1 };
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
  if (kind === 'scan' && S.private.intel?.undercoverSeatId) {
    // Synthetic: the result the server returns with the acceptance (V1-14), as the fixture's ?scan= answer says
    // (wrong, in or out). It reaches the Hacker's file, and nowhere else; the receipt itself says nothing of it.
    const answer = params.get('scan') ?? 'wrong';
    const matched = answer !== 'wrong';
    S.private.intel = { ...S.private.intel, scanResults: [...(S.private.intel.scanResults ?? []), { round: S.public.round, target: picked[0], guess: picked[1], matched, inCode: matched ? answer === 'in' : null }] };
  } else if (kind === 'scan') S.private.knowledge = [...S.private.knowledge, `Round ${S.public.round}: you scanned ${whoIs(picked[0])}, guessing ${picked[1]}. Synthetic: the server gives the result here, privately.`];
}

function checkAgain() {
  if (S.flow.step !== 'unknown' || !privateVisible()) return;
  S.privateQuiet = false;
  S.requests.lookups += 1;
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
  if (!privateVisible() || !(offers().move ?? []).includes(location)) { notice(SHELL.cannotMove); return; }
  S.privateQuiet = false;
  S.flow = { step: 'confirming', kind: 'move', picked: [location] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function pressPass() {
  if (!passAvailable()) return;
  S.privateQuiet = false;
  S.flow = { step: 'confirming', kind: 'pass', picked: ['pass'] };
  S.view = 'board';
  S.enter = true;
  render({ focus: 'strip' });
}

function notice(text) { S.notice = text; render(); clearTimeout(S.noticeTimer); if (!frozen) S.noticeTimer = setTimeout(() => { S.notice = null; render(); }, 2600); }

/** A choice that was not sent is dropped when the page goes to the background, the view goes stale or time runs out. */
function dropUnsent(reason) {
  if (S.flow.step === 'choosing' || S.flow.step === 'confirming') { S.flow = { step: 'idle' }; S.notice = reason; }
  S.view = 'board';
}

/** Conceal presentation without discarding a sent request or its recovery state. */
function conceal() {
  dropUnsent(COPY.choiceDropped);
  S.concealed = true;
  S.privateQuiet = true;
  S.enter = false;
  announce.private.length = 0;
  livePrivate.replaceChildren();
  for (const animation of phone.getAnimations({ subtree: true })) {
    const target = animation.effect?.target;
    if (target instanceof Element && target.closest('.bm-strip, .bm-sheet, .bm-tray')) animation.cancel();
  }
  director.cancelAll();
  observer?.director.cancelAll();
}

/** The view went out of date with the card kept (S.staleCard): drop what was not sent, quiet the strip; the card stays. */
function pausePrivate() {
  if (S.flow.step === 'choosing' || S.flow.step === 'confirming') { S.flow = { step: 'idle' }; S.notice = COPY.choiceDropped; }
  announce.private.length = 0;
  livePrivate.replaceChildren();
  for (const animation of phone.getAnimations({ subtree: true })) {
    const target = animation.effect?.target;
    if (target instanceof Element && target.closest('.bm-strip, .bm-tray')) animation.cancel();
  }
}

function reopen() {
  if (S.disposed || document.visibilityState !== 'visible' || (paused() && !S.staleCard)) return false;
  S.concealed = false;
  // Restoring the same private status is quiet; only a new interaction may cue it.
  return true;
}

// ---------- the connection: out of date, and back (the release's banners and announcements) ----------
/** The view goes out of date: the connection is lost ('stale'), or the latest update could not be read ('unreadable'). */
function goStale(variant) {
  S.banner = variant;
  announce.public.push(variant === 'unreadable' ? COPY.announce.unreadable : COPY.announce.connectionLost);
  render();
}
const phaseNow = () => (S.public.phase.kind === 'ORDINARY_TURN' ? (S.public.active === VIEWER ? COPY.phase.yourTurn : COPY.phase.turnOf(S.public.active)) : COPY.phase.kind[S.public.phase.kind]);
/** A fresh view arrives after the gap: said once ("Reconnected. Round 2. Your turn."), and nothing in it plays (a reconnect settles at once). */
function restoreView() {
  const was = S.banner;
  S.banner = null;
  if (!was) { render(); return; }
  S.revision += 1;
  announce.public.push((was === 'unreadable' ? COPY.announce.readableAgain : COPY.announce.reconnected)(`${COPY.phase.round(S.public.round)}. ${phaseNow()}.`));
  render({ previous: structuredClone(S.public), kind: 'reconnect' });
}
/** The release's Reconnect now (session/reconnect): the stand-in reconnects shortly. Pressed again meanwhile, nothing more is asked. */
function reconnectNow() {
  if (!outOfDate() || S.reconnecting) return;
  S.reconnecting = true;
  render();
  setTimeout(() => { S.reconnecting = false; restoreView(); }, params.has('t') ? 0 : 600);
}

// ---------- public facts: the authoritative updates every screen receives ----------
/**
 * A fact of the seat's own view alone (synthetic): the round's resolution granting the Undercover's
 * Protection, or using it up. Nothing public changes, so no screen plays a cue.
 */
function deliverPrivate(fact) {
  if (S.disposed) return;
  const list = [...(S.private.intel?.protections ?? [])];
  if (fact.type === 'PRIVATE_GUARD_GRANTED' && !list.some(entry => entry.seat === fact.seat)) list.push({ seat: fact.seat, activeFromRound: S.public.round + 1, consumed: false });
  if (fact.type === 'PRIVATE_GUARD_USED') { const at = list.findIndex(entry => entry.seat === fact.seat); if (at >= 0) list[at] = { ...list[at], consumed: true }; }
  S.private.intel = { ...(S.private.intel ?? {}), protections: list };
  render();
}

function deliver(fact) {
  if (S.disposed) return;
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
    if (fact.type === 'MATCH_ENDED') {
      // The view's phase turns FINISHED, with the winner the server names and the end reveal, or ABORTED, with
      // neither (the contract's terminal view): no timer, no active seat, no ballot, nothing offered. As in the
      // release, nothing private is drawn any more (the card and the actions are disabled): a choice in progress,
      // even a receipt, leaves the strip, and an open card or tray closes.
      S.public.phase = { kind: fact.phase, seconds: 0 };
      S.timer = 0;
      S.public.active = null;
      S.public.ballot = null;
      S.public.result = fact.phase === 'FINISHED' ? fact.result : null;
      S.public.endReveal = fact.phase === 'FINISHED' ? fact.endReveal : null;
      S.private.offers = { pass: false, move: [] };
      S.flow = { step: 'idle' };
      if (S.view === 'card' || S.view === 'actions') S.view = 'board';
      announce.public.push(fact.phase === 'ABORTED' ? COPY.result.aborted : COPY.result.winner[fact.result.winner]);
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
// The match's end, public: on this phone, on every other one and on the shared display alike.
const result = h('section', { class: 'bm-result', id: 'bm-result', 'aria-labelledby': 'bm-result-heading', tabindex: '0', hidden: true });
const menu = h('section', { class: 'bm-sheet', id: 'bm-menu', 'aria-labelledby': 'bm-menu-heading', hidden: true });
const nav = h('nav', { class: 'bm-nav', 'aria-label': SHELL.navigation });
const live = h('div', { class: 'bm-vh', 'aria-live': 'polite', id: 'bm-live' });
const livePrivate = h('div', { class: 'bm-vh', 'aria-live': 'polite', id: 'bm-live-private', 'data-private': 'true' });
const boardHost = h('div', { class: 'bm-board-host', style: { display: 'contents' } });
// The connection banner (the release's buildBanners): out of date, with its one control.
const banner = h('div', { class: 'bm-banner', id: 'bm-banner', role: 'note', hidden: true });
phone.append(h('p', { class: 'bm-synthetic' }, 'Synthetic'), status, boardHost, strip, result, nav, tray, card, menu, banner, live, livePrivate);
const board = createBoard(boardHost, { interactive: true, viewer: VIEWER });
const fx = h('div', { class: 'bm-fx', 'aria-hidden': 'true' });
board.element.append(fx);
// Every cue either board plays, for the flows tool to count (dev-only): replays and reconnects must add none.
const cueLog = [];
window.__bmCues = cueLog;
const director = createDirector({ board, status, fx, result, hold: params.has('t'), reduced: reducedNow, onCue: entry => cueLog.push({ board: 'own', ...entry }) });

// The observer: what every other phone and the shared display draw at the same moment.
let observer = null;
function buildObserver(container) {
  const app = h('div', { class: 'bm-app', 'data-frame': 'phone', 'data-observer': 'true' });
  const ostatus = h('header', { class: 'bm-status' });
  const host = h('div', { style: { display: 'contents' } });
  const oresult = h('section', { class: 'bm-result', 'aria-labelledby': 'bm-oresult-heading', hidden: true });
  app.append(ostatus, host, oresult);
  // The other screens' phone, in a frame of its own size: what every other player and the display draw.
  container.append(h('div', { class: 'bm-frame' }, app));
  const oboard = createBoard(host, { interactive: false, viewer: null, label: PROPOSED.observerTitle });
  const ofx = h('div', { class: 'bm-fx', 'aria-hidden': 'true' });
  oboard.element.append(ofx);
  const odirector = createDirector({ board: oboard, status: ostatus, fx: ofx, result: oresult, hold: params.has('t'), reduced: reducedNow, onCue: entry => cueLog.push({ board: 'observer', ...entry }) });
  return { app, status: ostatus, board: oboard, result: oresult, director: odirector };
}

function drawStatus(target) {
  const { phase, round, active } = S.public;
  const own = target === status;
  const line = phase.kind === 'ORDINARY_TURN' ? (active === VIEWER && own ? COPY.phase.yourTurn : `${nameOf(active)}’s turn`) : COPY.phase.kind[phase.kind];
  const detail = phase.kind === 'ORDINARY_TURN' ? `Player ${active} · ${seatOf(active)?.location ?? ''}` : COPY.phase.round(round);
  const seconds = Math.max(0, S.timer);
  const over = TERMINAL.includes(phase.kind);
  // At the end the phase's words may take both lines ("Match ended by the host"): the round is in its chip already.
  if (over) target.dataset.over = 'true'; else delete target.dataset.over;
  put(target,
    h('span', { class: 'bm-status__round' }, COPY.phase.round(round)),
    h('div', { class: 'bm-status__phase' }, h('p', { class: 'bm-status__line' }, line), over ? null : h('p', { class: 'bm-status__detail' }, seconds === 0 ? COPY.timer.waiting : detail)),
    // A finished or ended match has no deadline (the contract's terminal phase): the release says so instead of a count.
    over ? h('span', { class: 'bm-timer', 'data-state': 'none' }, h('span', { 'aria-hidden': 'true' }, '–'), vh(COPY.timer.none))
      : h('span', { class: 'bm-timer', role: 'timer', 'aria-label': `${COPY.timer.label}: ${seconds} seconds`, 'data-final': String(seconds <= 10) }, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`));
}

function boardCues() {
  const { step, kind } = S.flow;
  if (!privateVisible() || S.view === 'card' || S.view === 'menu') return {};
  if (kind === 'move' && ['confirming', 'submitting', 'checking', 'accepted'].includes(step) && !S.flow.arrived) return { ghost: { location: S.flow.picked[0], state: step === 'confirming' ? 'tentative' : 'pending' } };
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
  // A set of picks (a Code attempt's four, Supply's two) is named in seat order, whatever order it was picked in.
  const unordered = kind === 'code' || kind === 'supply';
  const listed = unordered ? [...seats].sort((a, b) => a - b) : seats;
  // The ability art in the strip (design/abilities/): the Code card, filled in seat order; the target of a Scan (swept
  // while it is on its way), a Rescue (the medical cross) or a Disable (the sparks), beside the question.
  const one = seats.length === 1 ? identity(seats[0]) : null;
  const art = kind === 'code' ? codeCard(seats.map(identity).filter(Boolean))
    : kind === 'scan' && one ? scanTarget(one, { sweeping: step === 'submitting' || step === 'checking' })
    : kind === 'rescue' && one ? target(one, 'cross')
    : kind === 'disable' && one ? target(one, 'spark')
    : kind === 'shot' && one ? target(one, 'reticle')
    // The showdown's special shot takes the same reticle: every seat in the Final Zone shoots alike.
    : kind === 'showdown-shot' && one ? target(one, 'reticle')
    : kind === 'protect' && one ? target(one, 'shield')
    // The seat's own ballot: its pick ticked, a release vote's subject ticked or crossed, or a blank slip for an abstention;
    // a Hack's request (the asked player in the comms ring).
    : kind === 'vote' && (one || picked[0] === 'none') ? ballotSlip({ seat: one, vote: one ? 'for' : 'abstain' })
    : kind === 'release-vote' && ['yes', 'no', 'none'].includes(picked[0]) ? ballotSlip({ seat: identity(S.public.ballot?.release), vote: picked[0] === 'none' ? 'abstain' : picked[0] })
    : kind === 'hack' && one ? target(one, 'comms') : null;
  // On a short phone the Code card sits small at the start of the detail line, so the board keeps its height.
  const inlineArt = kind === 'code' && phone.dataset.short === 'true';
  // What the action uses, at the start of the detail line: the Cracker's vials (the view's count), the one
  // Disable's cell (spent on its receipt), Supply's two tags (the picks in seat order, tied on the receipt).
  const rescues = S.private.resources?.rescues;
  const weapons = S.private.resources?.weapons;
  const lead0 = inlineArt ? art
    : kind === 'rescue' && typeof rescues === 'number' ? vials(rescues)
    : kind === 'disable' ? cell({ spent: step === 'accepted' })
    : kind === 'supply' ? supplyTags(seats.map(identity).filter(Boolean), { tied: step === 'accepted' })
    // The rounds the seat holds; after an accepted shot, the one it used, once the view's count has fallen.
    : kind === 'shot' && typeof weapons === 'number' ? rounds(weapons, { spent: step === 'accepted' ? Math.max(0, (S.flow.weaponsAtSend ?? weapons) - weapons) : 0 })
    // The ballot box, the slip in its slot once the ballot is accepted; the speaking turn's microphone, handed on once Pass is accepted;
    // the Captain's release request, the jailed player in the key ring, small (its long label leaves the question too little width beside it).
    : kind === 'vote' || kind === 'release-vote' ? ballotBox({ posted: step === 'accepted' })
    : kind === 'release-choice' && one ? target(one, 'key')
    // The showdown's one special shot: full while offered, spent on its receipt (V1-20: used at registration, no refund).
    : kind === 'showdown-shot' ? specialShot({ spent: step === 'accepted' })
    : kind === 'pass' ? speakingTurn({ passed: step === 'accepted' }) : null;
  const withArt = words => (art === null || inlineArt ? words : kind === 'code' ? [...words, art] : [art, ...words]);
  if (step === 'choosing') {
    let text, lead = lead0, controls = [];
    if (kind === 'scan' && seats.length === 1) {
      text = COPY.compound.scanGuess(whoIs(seats[0]));
      controls = ['Blue', 'Red', 'Alien'].map(faction => button(faction, `answer:${faction}`, false, { class: 'bm-btn bm-btn--choice' }));
    } else if (kind === 'supply') text = seats.length === 0 ? COPY.compound.supplyFirst : COPY.compound.supplySecond;
    else if (kind === 'code') text = COPY.compound.codePick(4 - seats.length);
    else if (kind === 'scan') text = COPY.compound.scanSeat;
    else if (kind === 'vote') { text = COPY.ballot.votePrompt[voteOn()]; controls = [button(COPY.ballot.abstain, 'answer:none', false, { class: 'bm-btn bm-btn--choice' })]; }
    else if (kind === 'release-choice') { text = COPY.choosePrompt['release-choice']; controls = [button(COPY.ballot.noRequest, 'answer:none', false, { class: 'bm-btn bm-btn--choice' })]; }
    else if (kind === 'release-vote') {
      text = COPY.ballot.releaseVotePrompt(releaseSubject());
      controls = [button(COPY.ballot.yes, 'answer:yes'), button(COPY.ballot.no, 'answer:no'), button(COPY.ballot.abstain, 'answer:none')].map(b => { b.classList.add('bm-btn--choice'); return b; });
    } else text = COPY.choosePrompt[kind];
    const tap = kind === 'release-vote' || (kind === 'scan' && seats.length === 1) ? null : SHELL.tapCharacter;
    const backLabel = seats.length > 0 ? COPY.compound.undo(seats.at(-1) === VIEWER ? `Player ${VIEWER} (you)` : `Player ${seats.at(-1)}`) : COPY.cancel;
    const words = withArt(line(text, seats.length && kind !== 'scan' ? COPY.compound.picked(listed.map(n => (n === VIEWER ? `Player ${n} (you)` : `Player ${n}`)).join(', ')) : tap, lead));
    // Going back sits at the side of the words. Beside a single answer (Abstain, No release
    // request) it shares that answer's row, and a long one (Take back Player 2) with no answer
    // takes the row itself, so that the question keeps the whole width.
    const back = button(backLabel, 'back');
    return controls.length === 1 || (controls.length === 0 && backLabel.length > 11)
      ? { step, kindLabel, text: words, controls: [...controls, back] } : { step, kindLabel, text: words, controls, side: back };
  }
  if (step === 'confirming') {
    return { step, kindLabel, text: withArt(line(confirmText(), consequence(), lead0)),
      controls: [button(COPY.confirm[kind], 'confirm', true, { 'aria-disabled': String(paused()) }), button(COPY.chooseAgain, 'back')] };
  }
  if (step === 'submitting' || step === 'checking') return { step, kindLabel, stamp: ['pending', PROPOSED.pendingStamp], text: withArt(line(step === 'checking' ? COPY.checking : COPY.submitting[kind], null, lead0)), controls: [] };
  if (step === 'accepted') return { step, kindLabel, stamp: ['registered', PROPOSED.registeredStamp], text: withArt(line(acceptedText(), acceptedDetail(), lead0)), controls: [], side: button(COPY.done, 'dismiss', true) };
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
    case 'supply': { const [a, b] = [...seats].sort((x, y) => x - y); return COPY.compound.confirmSupply(whoIs(a), whoIs(b)); }
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
    case 'supply': { const [a, b] = [...seats].sort((x, y) => x - y); return COPY.compound.supplyAccepted(whoIs(a), whoIs(b)); }
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

// What the strip last drew: its step, its action and the picks so far, for the beats that play once when it changes.
let stripWas = null;
function drawStrip() {
  const content = privateVisible() ? stripContent() : null;
  strip.hidden = content === null;
  if (!content) { put(strip); delete strip.dataset.step; delete strip.dataset.enter; delete strip.dataset.settled; stripWas = null; return; }
  if (S.enter) { strip.dataset.enter = ''; S.enter = false; setTimeout(() => delete strip.dataset.enter, 260); }
  // The words first, with the action's name set into them; one control at the side (back, Done,
  // OK, Check again); answers and the confirmation in one row beneath.
  const next = h('div', null, h('div', { class: 'bm-strip__text' }, content.kindLabel, content.text),
    content.side ? h('div', { class: 'bm-strip__side' }, content.side) : null,
    content.stamp ? h('span', { class: 'bm-stamp', 'data-kind': content.stamp[0] }, content.stamp[1]) : null,
    content.controls.length ? h('div', { class: 'bm-strip__controls' }, content.controls) : null);
  // An update that changes nothing in the strip (a duplicate snapshot, a public fact about someone else)
  // leaves it as it is: nothing in it plays again, and focus stays where it was.
  if (strip.dataset.step === content.step && strip.innerHTML === next.innerHTML) return;
  // Drawn again in the same step (a pick, a newer fact), the stamp is already down: it lands only when the step changes.
  if (strip.dataset.step === content.step) strip.dataset.settled = ''; else delete strip.dataset.settled;
  strip.dataset.step = content.step;
  strip.replaceChildren(...next.childNodes);
  const now = { step: content.step, kind: S.flow.kind, picked: seatsPicked(), rescues: S.private.resources?.rescues ?? null, weapons: S.private.resources?.weapons ?? null };
  if (stripWas && stripWas.kind === now.kind && !reducedNow()) stripBeats(stripWas, now);
  stripWas = now;
}

/**
 * The strip's ability art plays its beats once, as the strip changes: a pick clipping into the Code
 * card or a Supply tag; on the receipt the Code card punched, Supply's tags tied, the Disable's cell
 * discharged; a vial emptying when the view's Rescue count falls (never ahead of it). Never on a strip
 * drawn from scratch (a scenario, a reopen, a recovery), never in reduced motion: there the art is at rest.
 */
function stripBeats(was, now) {
  const added = now.picked.filter(n => !was.picked.includes(n));
  if ((now.kind === 'code' || now.kind === 'supply') && added.length === 1) clipIn(strip.querySelector(`:is(.ab-code-card, .ab-tags) .ab-chip[data-seat="${added[0]}"]`));
  const receipt = now.step === 'accepted' && was.step !== 'accepted';
  if (receipt && now.kind === 'code') punch(strip.querySelector('.ab-code-card'));
  if (receipt && now.kind === 'supply') tie(strip.querySelector('.ab-tags'));
  if (receipt && now.kind === 'disable') discharge(strip.querySelector('.ab-cell'));
  if (receipt && (now.kind === 'vote' || now.kind === 'release-vote')) post(strip.querySelector('.ab-box'));
  if (receipt && now.kind === 'pass') handOn(strip.querySelector('.ab-mic'));
  if (receipt && now.kind === 'showdown-shot') spend(strip.querySelector('.ab-special'));
  // A round leaves the rack when the view's weapon count falls, never ahead of it.
  if (now.kind === 'shot' && now.weapons !== null && was.weapons !== null && now.weapons < was.weapons) {
    for (const round of [...strip.querySelectorAll('.ab-round[data-spent="true"]')].slice(-(was.weapons - now.weapons))) spend(round);
  }
  if (now.kind === 'rescue' && now.rescues !== null && was.rescues !== null && now.rescues < was.rescues) {
    const all = strip.querySelectorAll('.ab-vial');
    for (let index = now.rescues; index < was.rescues; index += 1) drain(all[index]);
  }
}

function drawTray() {
  tray.hidden = (S.concealed && !paused()) || S.disposed || document.visibilityState !== 'visible' || !(S.view === 'actions' && S.flow.step === 'idle');
  if (tray.hidden) { put(tray); forget(tray); return; }
  const open = TRAY_ORDER.filter(kind => isOpen(kind));
  if (keep(tray, JSON.stringify([paused(), S.banner, S.private.pending, open]))) return;
  put(tray,
    h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-tray-heading', tabindex: '-1' }, SHELL.nav.actions), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×')),
    !paused() && S.private.pending ? h('p', { class: 'bm-tray__empty' }, COPY.queued(S.private.pending)) : null,
    paused() ? h('p', { class: 'bm-tray__empty' }, outOfDate() ? COPY.actions.pausedStale : COPY.actions.pausedExpired)
      : open.length ? h('ul', { class: 'bm-tray__grid' }, open.map(kind => h('li', null, h('button', { type: 'button', class: 'bm-chip', 'data-act': `open:${kind}`, id: `bm-open-${kind}` },
        // The action's mark (design/abilities/, slice 7) once the art has arrived; until then its glyph.
        h('span', { class: 'bm-chip__icon', 'data-kind': kind, 'aria-hidden': 'true' }, ICON[kind] ?? '•'), h('span', { class: 'bm-chip__name' }, COPY.kind[kind]), h('span', { class: 'bm-chip__hint' }, COPY.open[kind])))))
        : h('p', { class: 'bm-tray__empty' }, SHELL.noActions));
}

// Supply's slips (design/abilities/js/tools.js) drop into the card once, the first time this page shows each.
const slipsShown = new Set();
// The Protections this page has shown, and whether used up, so that one turning used up cracks once.
const guardsShown = new Map();
// The Hacks this page has shown (round and partner), so that a note's cord runs once.
const linksShown = new Set();
/** The seat's own acknowledgments, as the release shows them: the Supplier's results, a received weapon, an unavailable history. */
function deliveriesFor(acks) {
  if (!acks) return null;
  return deliveries({
    supplied: (acks.supplierResults ?? []).map(result => ({ round: result.round, recipients: result.recipients.map(identity).filter(Boolean) })),
    received: acks.receivedSupply ?? [],
    self: identity(VIEWER),
    unavailable: acks.historyAvailable === false && S.private.role === 'Supplier',
  });
}

// The seat's own file (design/abilities/): the Insider's, the Hacker's or the Alien's, from what
// the view carries. Built once per content and kept while the card stays open, so that inspecting a
// portrait survives an update; it assembles the first time it is opened in this page and appears at
// rest after that. A Scan result that arrives later is printed once, the first time it is seen, and
// never again. Forgotten as soon as nothing private is open.
let fileNode = null;
let fileKey = '';
let fileSeen = false;
const scansSeen = new Set();
const publicFacts = n => {
  const seat = seatOf(n);
  if (!seat) return '';
  return [seat.location, seat.health, seat.captain ? COPY.marker.captain : null, seat.jailed ? COPY.marker.jailed : null].filter(Boolean).join(' · ');
};
/** A seat's public identity: its number, the name and the character its player chose. */
const identity = n => { const seat = seatOf(n); return seat ? { n: seat.n, name: seat.name, character: seat.character } : null; };
function spotOnBoard(n) {
  S.view = 'board';
  render({ focus: 'nav' });
  const piece = board.pieces.get(n);
  if (!piece) return;
  piece.dataset.spot = '';
  setTimeout(() => delete piece.dataset.spot, 1700);
}
function fileFor(intel) {
  let build = null, key = '', scanKeys = [];
  const opts = { describe: publicFacts, onShow: spotOnBoard };
  if (intel?.insiderCandidates?.length === 3) {
    const seats = intel.insiderCandidates.map(identity).filter(Boolean);
    key = JSON.stringify(['insider', seats]);
    build = () => insiderFile(seats, opts);
  } else if (intel?.undercoverSeatId) {
    const known = identity(intel.undercoverSeatId);
    const scans = (intel.scanResults ?? []).map(scan => ({ ...scan, target: identity(scan.target), self: scan.target === VIEWER })).filter(scan => scan.target);
    scanKeys = scans.map(scan => `${scan.round}:${scan.target.n}`);
    key = JSON.stringify(['hacker', known, scans]);
    build = () => hackerFile(known, scans, opts);
  } else if (intel?.code?.length === 4) {
    const members = intel.code.map(identity).filter(Boolean);
    key = JSON.stringify(['alien', members]);
    build = () => alienFile(members, { ...opts, self: VIEWER });
  }
  if (!build) return { file: null, fresh: [] };
  if (!fileNode || fileKey !== key) {
    fileNode = build();
    // Private content of the open card, like the role card: the prototype's secrecy measurements know it by this class.
    fileNode.classList.add('bm-private');
    fileKey = key;
  }
  // The results this page has not shown yet; the first open shows every result as part of the file.
  const fresh = fileSeen ? scanKeys.filter(scan => !scansSeen.has(scan)) : [];
  for (const scan of scanKeys) scansSeen.add(scan);
  return { file: fileNode, fresh };
}

function drawCard() {
  card.hidden = S.view !== 'card' || S.disposed;
  if (card.hidden) { put(card); forget(card); fileNode = null; return; }
  const head = h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-card-heading', tabindex: '-1' }, SHELL.yourCard), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×'));
  if (!cardVisible()) {
    // Hidden (the page went to the background, or the view is out of date): one closed folder,
    // the same for every role and seat. Nothing private is in the page until it is opened again.
    fileNode = null;
    if (keep(card, JSON.stringify(['hidden', paused()]))) return;
    put(card, head, closedFolder(paused() ? PROPOSED.cardHiddenStale : PROPOSED.cardHidden),
      paused() ? null : h('p', { class: 'ab-folder__open' }, h('button', { type: 'button', class: 'ab-button', 'data-act': 'reveal' }, PROPOSED.cardReveal)));
    return;
  }
  // Built only while open: closed, there is no private word in the document.
  const self = seatOf(VIEWER);
  const [device, team] = ROLE_LOOK[S.private.role] ?? ['officer', 'Blue'];
  const knowledge = S.private.knowledge;
  // A Hack's partner, to each of the two while the server says they are in one (hackPartnerSeatId): the same note for both.
  const partner = S.private.hackPartner ? identity(S.private.hackPartner) : null;
  const { file, fresh } = fileFor(S.private.intel);
  const rescues = S.private.resources?.rescues ?? 0;
  const weapons = S.private.resources?.weapons;
  // The Undercover's Protections, as its own view carries them (knowledge.protections), in the view's order.
  const guards = (S.private.intel?.protections ?? []).map(entry => ({ seat: identity(entry.seat), activeFromRound: entry.activeFromRound, consumed: entry.consumed, self: entry.seat === VIEWER })).filter(entry => entry.seat);
  // Kept on a view that is out of date or whose time is up (S.staleCard): at rest, nothing played; marked when it may be out of date.
  const held = paused();
  const stale = held && outOfDate();
  if (keep(card, JSON.stringify(['open', S.private.role, self.character, knowledge, fileKey, rescues, weapons, guards, partner, S.private.acks])) && (!file || card.contains(file))) {
    // The same card: only the inspected player's public facts follow the board, said again by its live region.
    const inspected = Number(file?.dataset.inspect);
    const facts = inspected ? file.querySelector('.ab-inspect__facts') : null;
    if (facts && facts.textContent !== publicFacts(inspected)) facts.textContent = publicFacts(inspected);
    // Out of date, its time up, or current again: the same card in place, marked or not, its file paused or not, so focus stays.
    markCard(stale);
    if (file) pauseFile(file, held);
    if (file && reducedNow()) cancelMotion(file);
    return;
  }
  put(card, head,
    h('p', { class: 'bm-hint' }, COPY.privateArea.hint),
    h('div', { class: 'bm-card bm-private', 'data-character': self.character, 'data-device': device, 'data-team': team.toLowerCase() },
      h('span', { class: 'bm-card__art', 'aria-hidden': 'true' }),
      h('div', null, h('p', { class: 'bm-card__name' }, S.private.role), h('p', { class: 'bm-card__team' }, `${team} team`))),
    file,
    // The Cracker's Rescues while one is left: the release's sentence, with its vials. At none the release says nothing.
    rescues > 0 ? rescueKit(rescues) : null,
    // What the seat holds, as the release says it for every seat: "Ordinary weapons you hold: N."
    typeof weapons === 'number' ? weaponsNote(weapons) : null,
    guardNotes(guards),
    partner ? hackLink(identity(VIEWER), partner) : null,
    deliveriesFor(S.private.acks),
    knowledge.length ? h('ul', { class: 'bm-know', 'aria-label': 'What you know' }, knowledge.map(item => h('li', null, item))) : null);
  markCard(stale);
  if (file) pauseFile(file, held);
  // A held card plays nothing: what it shows is at rest, as the latest view the page has.
  const still = reducedNow() || held;
  for (const slip of card.querySelectorAll('.ab-slip')) {
    if (slipsShown.has(slip.dataset.slip)) continue;
    slipsShown.add(slip.dataset.slip);
    if (!still) dropIn(slip);
  }
  // A Protection this page showed whole and the view now says is used up cracks, once.
  for (const note of card.querySelectorAll('.ab-guard')) {
    const used = note.dataset.used === 'true';
    if (used && guardsShown.get(note.dataset.guard) === false && !still) crack(note.querySelector('.ab-target__mark'));
    guardsShown.set(note.dataset.guard, used);
  }
  // A Hack's note: the cord runs from chip to chip the first time this page shows that Hack.
  const link = card.querySelector('.ab-kit[data-kit="hack"]');
  if (link) {
    const key = `${S.public.round}:${link.dataset.partner}`;
    if (!linksShown.has(key) && !still) connect(link.querySelector('.ab-link__cord'));
    linksShown.add(key);
  }
  if (file && !fileSeen) { fileSeen = true; assemble(file, { reduced: still }); }
  else if (file && fresh.length) for (const scan of fresh) printFresh(file, scan, { reduced: still });
  else if (file && still) cancelMotion(file);
}

/** The card kept on a view that may be out of date (DSN-REQ-16): one mark under its heading, the same for every role, put in or taken out in place. */
function markCard(stale) {
  const mark = card.querySelector(':scope > .bm-card-stale');
  if (stale && !mark) card.querySelector(':scope > .bm-sheet__head')?.after(h('p', { class: 'bm-card-stale', role: 'note' }, h('span', { class: 'bm-card-stale__icon', 'aria-hidden': 'true' }), PROPOSED.cardStale));
  else if (!stale && mark) mark.remove();
}

function drawMenu() {
  menu.hidden = S.view !== 'menu';
  if (menu.hidden) { put(menu); forget(menu); return; }
  if (keep(menu, JSON.stringify([S.public.seats, S.public.active]))) {
    // Reduced motion switched elsewhere (the fixture panel): the box says so, and keeps its focus.
    const box = menu.querySelector('[data-act="motion"]');
    if (box) box.checked = S.motion === 'reduced';
    return;
  }
  put(menu,
    h('div', { class: 'bm-sheet__head' }, h('h2', { id: 'bm-menu-heading', tabindex: '-1' }, SHELL.nav.menu), h('button', { type: 'button', class: 'bm-close', 'data-act': 'close', 'aria-label': SHELL.closePanel }, '×')),
    h('p', { class: 'bm-hint' }, SYNTHETIC_LABEL),
    h('table', { class: 'bm-list' }, h('caption', { class: 'bm-vh' }, SHELL.readableList),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, COPY.roster.column.player), h('th', { scope: 'col' }, COPY.roster.column.location), h('th', { scope: 'col' }, COPY.roster.column.status))),
      h('tbody', null, S.public.seats.map(seat => h('tr', null, h('th', { scope: 'row' }, `${seat.n} · ${seat.name}`), h('td', null, seat.location),
        h('td', null, [seat.n === VIEWER ? COPY.marker.self : null, seat.n === S.public.active ? COPY.marker.turn : null, seat.captain ? COPY.marker.captain : null, seat.health !== 'Healthy' ? seat.health : null, seat.jailed ? COPY.marker.jailed : null, seat.revealedFaction ? COPY.marker.faction(seat.revealedFaction) : null].filter(Boolean).join(', ') || COPY.roster.noStatus))))),
    h('label', { class: 'bm-hint' }, h('input', { type: 'checkbox', 'data-act': 'motion', checked: S.motion === 'reduced' }), ' Reduce motion'));
}

/**
 * The connection banner, in the release's words with its one control, Reconnect now, and the reviewed stale-connection
 * icon. Drawn again only when it changes, so that focus on its button survives an update. Every sheet keeps clear of it
 * (--bm-banner-clear: its bottom edge), so that a sheet's heading and Close stay in view on a short phone.
 */
function drawBanner() {
  const words = outOfDate() ? COPY.banner[S.banner] : null;
  banner.hidden = words === null;
  if (words === null) { put(banner); forget(banner); delete banner.dataset.variant; }
  else if (!keep(banner, JSON.stringify([S.banner, Boolean(S.reconnecting)]))) {
    banner.dataset.variant = S.banner;
    put(banner, h('span', { class: 'bm-banner__icon', 'aria-hidden': 'true' }), h('p', { class: 'bm-banner__text' }, words),
      h('button', { type: 'button', class: 'bm-btn bm-banner__act', 'data-act': 'reconnect', 'aria-disabled': String(Boolean(S.reconnecting)) }, COPY.banner.reconnect));
  }
  clearBanner();
}
/** --bm-banner-clear, the banner's bottom edge: measured again whenever its height changes (its words wrap with the width and the reader's text). */
function clearBanner() {
  if (banner.hidden) phone.style.removeProperty('--bm-banner-clear');
  else phone.style.setProperty('--bm-banner-clear', `${banner.offsetTop + banner.offsetHeight + 6}px`);
}

/** Each role's side, for the colour of its name in the end's cast list: the role look the release keeps (ROLE_LOOK). */
const sideOf = role => (ROLE_LOOK[role]?.[1] ?? '').toLowerCase();
/**
 * The match's end, the same on every screen (the release's result, packages/presentation/src/model/result.ts): the
 * winner the server names, struck on a ribbon, and the Alien's co-win; then, only because the view now carries them
 * (V1-18: the roles and the Code at the end only), every seat's role in seat order, each row with the seat's character
 * and its side's colour, and the Code in seat order, its four rows pinned. A match the host ended says so, and
 * reveals nothing: the view carries neither. Drawn from the public view alone; own: this phone, which names its
 * seat "(you)" as the release does; the other screens name nobody so.
 */
function drawResult(target, { own }) {
  const { phase, round, result: outcome, endReveal } = S.public;
  if (!TERMINAL.includes(phase.kind)) { target.hidden = true; put(target); forget(target); return; }
  // The menu covers it on this phone, as the release hides it behind its menu; it is drawn again as it was.
  target.hidden = own && S.view === 'menu';
  if (keep(target, JSON.stringify([phase.kind, round, outcome, endReveal, S.public.seats.map(seat => seat.character)]))) return;
  const finished = phase.kind === 'FINISHED' && outcome !== null;
  const heading = own ? 'bm-result-heading' : 'bm-oresult-heading';
  const label = n => (own && n === VIEWER ? `Player ${n} (you)` : `Player ${n}`);
  target.dataset.ended = finished ? 'finished' : 'aborted';
  if (finished) target.dataset.winner = outcome.winner; else delete target.dataset.winner;
  const roles = endReveal ? [...endReveal.roles].sort((a, b) => a.seat - b.seat) : [];
  const code = endReveal ? [...endReveal.code].sort((a, b) => a - b) : [];
  put(target,
    h('div', { class: 'bm-result__head' },
      h('h2', { class: 'bm-result__heading', id: heading, tabindex: '-1' }, COPY.result.heading),
      h('p', { class: 'bm-result__outcome' }, finished ? COPY.result.winner[outcome.winner] : COPY.result.aborted),
      finished && outcome.alienCoWinner ? h('p', { class: 'bm-result__line' }, COPY.result.alienCoWinner) : null),
    endReveal ? [
      // A table, as in the release, drawn as a cast list in two columns: its roles keep the table's meaning.
      h('table', { class: 'bm-cast', role: 'table', 'aria-labelledby': `${heading}-roles` },
        h('caption', { class: 'bm-cast__caption', id: `${heading}-roles` }, COPY.result.revealHeading),
        h('thead', { class: 'bm-vh', role: 'rowgroup' }, h('tr', { role: 'row' }, h('th', { scope: 'col', role: 'columnheader' }, COPY.result.columns.player), h('th', { scope: 'col', role: 'columnheader' }, COPY.result.columns.role))),
        h('tbody', { class: 'bm-cast__rows', role: 'rowgroup' }, roles.map((entry, index) => h('tr', { class: 'bm-cast__row', role: 'row', 'data-seat': entry.seat, 'data-end-faction': sideOf(entry.role), 'data-code': String(code.includes(entry.seat)), 'data-self': own && entry.seat === VIEWER ? 'true' : null, style: { '--i': index } },
          h('th', { class: 'bm-cast__who', scope: 'row', role: 'rowheader' }, h('span', { class: 'bm-cast__chip', 'data-character': seatOf(entry.seat)?.character, 'aria-hidden': 'true' }), h('span', { class: 'bm-cast__label' }, label(entry.seat))),
          h('td', { class: 'bm-cast__role', role: 'cell' }, h('span', { class: 'bm-cast__name' }, entry.role), code.includes(entry.seat) ? h('span', { class: 'bm-cast__pin', 'aria-hidden': 'true' }) : null))))),
      h('p', { class: 'bm-result__code' }, h('span', { class: 'bm-cast__pin', 'aria-hidden': 'true' }), COPY.result.code(code.map(label).join(', '))),
    ] : null);
}

function drawNav() {
  // At the match's end the card and the actions are closed for good, as in the release; marked, not removed, so that focus stays.
  const over = ended();
  const item = (view, label, icon) => h('button', { type: 'button', 'data-view': view, 'aria-pressed': String(S.view === view), id: `bm-nav-${view}`, 'aria-disabled': over && (view === 'card' || view === 'actions') ? 'true' : null }, h('span', { class: 'bm-nav__icon', 'data-icon': icon, 'aria-hidden': 'true' }), h('span', null, label));
  const available = passAvailable();
  if (keep(nav, JSON.stringify([S.view, available, S.legacy, over]))) return;
  put(nav, item('board', SHELL.nav.board, 'board'), item('actions', SHELL.nav.actions, 'actions'),
    S.legacy ? h('span', { 'aria-hidden': 'true' }) : h('button', { type: 'button', class: 'bm-pass', id: 'bm-pass', 'data-act': 'pass', 'aria-label': SHELL.passLabel, 'aria-disabled': String(!available) },
      h('span', { class: 'bm-nav__icon', 'data-icon': 'pass', 'aria-hidden': 'true' }), h('span', null, 'Pass')),
    item('card', SHELL.nav.card, 'card'), item('menu', SHELL.nav.menu, 'menu'));
}

function render({ previous = null, kind = 'update', focus = null } = {}) {
  // Out of date or timed out: what was not sent is dropped and the actions pause; the private surfaces are concealed,
  // or, where the card is kept (S.staleCard), only the strip and the tray, as in the release.
  if (paused() && !S.concealed) {
    if (!S.staleCard) conceal();
    else if (!S.pauseHandled) { S.pauseHandled = true; pausePrivate(); }
  }
  if (!paused()) S.pauseHandled = false;
  markShort();
  const before = previous ? director.before() : null;
  const obefore = previous && observer ? observer.director.before() : null;
  phone.dataset.motion = S.motion;
  phone.dataset.view = S.view;
  phone.dataset.privateQuiet = String(S.privateQuiet);
  phone.querySelector('.bm-synthetic').textContent = S.fixtureStatus === 'layout-stress' ? 'Synthetic · layout stress' : 'Synthetic';
  document.documentElement.dataset.motion = S.motion;
  drawStatus(status);
  board.update(S.public, boardCues());
  drawStrip(); drawTray(); drawCard(); drawMenu(); drawNav(); drawResult(result, { own: true });
  // Reduced motion, switched on mid-beat, leaves the strip's art at rest at once, and the end's sheet as it stands.
  if (reducedNow()) {
    director.cancelAll();
    observer?.director.cancelAll();
    for (const animation of strip.getAnimations({ subtree: true })) if (animation.id === BEAT_ID) animation.finish();
    for (const sheet of [result, observer?.result]) if (sheet?.dataset.cue === 'reveal') delete sheet.dataset.cue;
  }
  fitBoard(board);
  phone.querySelector('.bm-notice')?.remove();
  drawBanner();
  if (!outOfDate() && S.notice) phone.append(h('p', { class: 'bm-notice', role: 'status' }, S.notice));
  const cueKind = paused() || S.disposed ? 'reconnect' : kind;
  if (previous) director.after(previous, S.public, before, { kind: cueKind, revision: S.revision });
  if (observer) {
    drawStatus(observer.status);
    observer.board.update(S.public, {});
    drawResult(observer.result, { own: false });
    fitBoard(observer.board);
    if (previous) observer.director.after(previous, S.public, obefore, { kind: cueKind, revision: S.revision });
  }
  for (const text of announce.public.splice(0)) live.append(h('p', null, text));
  for (const text of announce.private.splice(0)) if (privateVisible()) livePrivate.append(h('p', null, text));
  // Private words leave the document as soon as nothing private is open.
  if (!privateVisible() || (S.view !== 'card' && S.flow.step === 'idle')) livePrivate.replaceChildren();
  if (focus === 'strip') document.getElementById('bm-strip-line')?.focus({ preventScroll: true });
  if (focus === 'nav') document.getElementById('bm-nav-actions')?.focus({ preventScroll: true });
  if (focus === 'sheet') phone.querySelector('.bm-sheet:not([hidden]) h2, .bm-tray:not([hidden]) h2')?.focus({ preventScroll: true });
  window.__bmState = { scenario: S.scenarioId, phase: S.public.phase.kind, flow: S.flow, view: S.view, active: S.public.active, revision: S.revision,
    concealed: S.concealed, disposed: S.disposed, requests: { ...S.requests } };
}

/**
 * The board's three bands share the screen by public occupancy. Each room's scene needs its name
 * tag and, for the places taken in it, a panel tall enough that every taken place's press area is
 * whole, at least 44 x 44, clear of the tag and of every other press area (scenes/frame.mjs and
 * board.js lay them out; the captures measure them); an empty room keeps a sliver of its scene.
 * What is left is shared out by weight, a band growing no taller than its scenes can fill
 * without cropping their places off the sides; past that the middle band takes the rest.
 */
const BANDS = { top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] };
function fitBoard(api) {
  const element = api.element;
  const height = element.clientHeight;
  if (!height) return;
  const style = element.style;
  const board = getComputedStyle(element);
  const outer = parseFloat(board.paddingTop) + parseFloat(board.paddingBottom) + 2 * parseFloat(board.rowGap);
  if (element.dataset.final === 'true') { api.layout(); return; }
  const fits = (id, width, h) => {
    const panel = api.panels.get(id);
    const css = getComputedStyle(panel);
    const size = { width, height: h, cap: parseFloat(css.getPropertyValue('--bm-cap')) || 32, pad: parseFloat(css.getPropertyValue('--bm-pad')) || 6 };
    // Reserve 44 px press space for the controls that are actually offered. A
    // confirmation has no character targets; treating every decorative figure as
    // a button forced the board to expand underneath the selection strip.
    const targetPlaces = new Set([...panel.querySelectorAll('.bm-piece__target')].map(target => target.closest('.bm-piece').dataset.place));
    const places = api.placesIn(id).filter(place => api.element.dataset.board !== 'own' || targetPlaces.has(String(place.place)));
    const rects = places.map(place => pressRect(geometry(place, size), size));
    if (rects.some(r => r.top < size.cap - 0.5 || r.top + r.side > h - size.pad + 0.5)) return false;
    return rects.every((a, i) => rects.every((b, j) => j <= i || a.left + a.side <= b.left || b.left + b.side <= a.left || a.top + a.side <= b.top || b.top + b.side <= a.top));
  };
  const needs = Object.values(BANDS).map(rooms => rooms.map(id => {
    const panel = api.panels.get(id);
    const tag = panel.querySelector('.bm-tag');
    const fixed = tag.classList.contains('bm-tag--fixed');
    // A move tag's button is its press area; a fixed caption keeps its 3 px inset above and below.
    // A public label over a head (On the ballot, a published count) gets its own line below the tag.
    const label = panel.querySelector('.bm-piece__subject, .bm-piece__tally') ? 16 : 0;
    const cap = Math.ceil((fixed ? tag.offsetHeight + 6 : Math.max(44, tag.offsetHeight)) + label);
    panel.style.setProperty('--bm-cap', `${cap}px`);
    const css = getComputedStyle(panel);
    const borders = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
    const width = panel.clientWidth;
    let need = cap + 24;
    if (api.placesIn(id).length) {
      need = cap + 50;
      while (need < 900 && !fits(id, width, need)) need += 2;
    }
    const scene = SCENES[id];
    const most = scene ? (width * (scene.inner[3] - scene.inner[1])) / (scene.focus[2] - scene.focus[0]) : Infinity;
    return { need: need + borders, most: Math.max(need, most) + borders };
  }));
  const need = needs.map(list => Math.max(...list.map(entry => entry.need)));
  const most = needs.map((list, index) => Math.max(need[index], Math.min(...list.map(entry => entry.most))));
  const sizes = [...need];
  let left = Math.max(0, height - outer - need.reduce((a, b) => a + b, 0));
  const weights = [0.8, 1.25, 1];
  for (let round = 0; round < 4 && left > 0.5; round += 1) {
    const open = sizes.map((size, index) => (size < most[index] ? weights[index] : 0));
    const share = open.reduce((a, b) => a + b, 0);
    if (!share) { sizes[1] += left; left = 0; break; }
    let given = 0;
    sizes.forEach((size, index) => { const add = Math.min((left * open[index]) / share, most[index] - size); sizes[index] += add; given += add; });
    left -= given;
  }
  for (const [index, band] of Object.keys(BANDS).entries()) style.setProperty(`--band-${band}`, `${sizes[index]}px`);
  api.layout();
}

/** A short phone (568 px tall and the like) draws the same parts tighter: see .bm-app[data-short]. */
const SHORT_PX = 640;
const markShort = () => { phone.dataset.short = String(phone.clientHeight > 0 && phone.clientHeight <= SHORT_PX); };

// ---------- input ----------
phone.addEventListener('click', event => {
  if (S.disposed || document.visibilityState !== 'visible') return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const room = target.closest('button[data-move-room]');
  if (room) { pressRoom(room.dataset.moveRoom, room); return; }
  const choose = target.closest('button[data-intent="action/choose"]');
  if (choose) { pick(Number(choose.dataset.value.slice(5))); return; }
  const view = target.closest('button[data-view]');
  if (view?.getAttribute('aria-disabled') === 'true') return;
  if (view) {
    const next = view.dataset.view === S.view && view.dataset.view !== 'board' ? 'board' : view.dataset.view;
    if (next === 'card' || next === 'actions') {
      if (!reopen()) {
        if (next === 'actions' && !S.disposed && outOfDate()) {
          // A public pause notice, with no private offer or queued-command details.
          S.view = 'actions'; render({ focus: 'sheet' });
        }
        // The card while it cannot be shown: the closed folder, the same for every role.
        if (next === 'card' && !S.disposed) { S.view = 'card'; render({ focus: 'sheet' }); }
        return;
      }
    }
    if (next === 'actions' && S.flow.step !== 'idle') { S.view = 'board'; render({ focus: 'strip' }); return; }
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
  else if (act === 'reveal') { if (reopen()) render({ focus: 'sheet' }); }
  else if (act === 'reconnect') reconnectNow();
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
  if (document.visibilityState !== 'visible') conceal();
  render(); // Foregrounding never opens private content, resends or checks a request.
});
function onSystemMotion() {
  if (!S.disposed && window.__designReady) render();
}
motionQuery.addEventListener('change', onSystemMotion);
window.addEventListener('pagehide', () => {
  conceal(); S.disposed = true; clearInterval(countdownTimer); render();
  director.dispose(); observer?.director.dispose();
  motionQuery.removeEventListener('change', onSystemMotion);
});
new ResizeObserver(() => { fitBoard(board); if (observer) fitBoard(observer.board); }).observe(board.element);
new ResizeObserver(markShort).observe(phone);
new ResizeObserver(clearBanner).observe(banner);

// ---------- the page around the phone: frame, observer and fixture controls ----------
async function loadArt() {
  await loadBundles(['public-board', 'player-ui', 'roles']);
  // The ability art (design/abilities/): private, and loaded whole on every player phone with its
  // other bundles, whatever the seat's role, so that which art arrives says nothing about the role.
  await new Promise(resolve => {
    const link = h('link', { rel: 'stylesheet', href: new URL('../../abilities/assets/abilities.art.css', import.meta.url).href });
    link.addEventListener('load', () => { document.documentElement.dataset.art = `${document.documentElement.dataset.art ?? ''} abilities`.trim(); resolve(); }, { once: true });
    link.addEventListener('error', resolve, { once: true });
    document.head.append(link);
  });
  // The room scenes: every room's picture and the layers drawn in front of its places, before the first
  // match view, whatever the seat's role, state or turn. Marked on the root once it has arrived. The
  // figures need no art: the figure rig draws them from public facts.
  await new Promise(resolve => {
    const link = h('link', { rel: 'stylesheet', href: new URL('../assets/board-motion.scenes.css', import.meta.url).href });
    link.addEventListener('load', () => { document.documentElement.dataset.art = `${document.documentElement.dataset.art ?? ''} board-motion-scenes`.trim(); resolve(); }, { once: true });
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
    h('fieldset', null, h('legend', null, 'View lifecycle · synthetic'),
      ...[['stale', 'Make the view stale'], ['unreadable', 'An update could not be read'], ['fresh', 'Restore a fresh view'], ['expire', 'Expire the local timer']].map(([id, label]) => {
        const button = h('button', { type: 'button', id: `bm-${id}` }, label);
        button.addEventListener('click', () => {
          if (id === 'expire') { S.timer = 0; render(); }
          else if (id === 'fresh') restoreView();
          else goStale(id);
        });
        return button;
      }),
      // DSN-REQ-16: the release keeps the card on an out-of-date view; PR #88 closes it into the folder.
      toggle('Keep the card on an out-of-date view (DSN-REQ-16)', S.staleCard, on => { S.staleCard = on; render(); })),
    h('fieldset', null, h('legend', null, 'Public facts, to every screen'), events),
    h('fieldset', null, h('legend', null, 'Private facts, to this seat alone'), h('div', { class: 'bm-events' }, PRIVATE_EVENTS.map(event => {
      const button = h('button', { type: 'button', 'data-private-event': event.id }, event.label);
      button.addEventListener('click', () => deliverPrivate(event.fact));
      return button;
    }))),
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
if (!frozen) countdownTimer = setInterval(() => { if (S.timer > 0 && !ended()) { S.timer -= 1; drawStatus(status); if (observer) drawStatus(observer.status); if (S.timer === 0) render(); } }, 1000);

// ---------- holds for storyboards and captures: ?play=<step>&t=<ms> ----------
const PLAY = {
  move: () => deliver(EVENTS.find(e => e.id === 'move').fact),
  injure: () => deliver(EVENTS.find(e => e.id === 'injure').fact),
  // Injured first, then the end-of-round move, which withdraws the hit in flight: the limp to the Hospital.
  hospital: () => { deliver(EVENTS.find(e => e.id === 'injure').fact); deliver(EVENTS.find(e => e.id === 'to-hospital').fact); },
  release: () => deliver(EVENTS.find(e => e.id === 'release').fact),
  eliminate: () => deliver(EVENTS.find(e => e.id === 'eliminate').fact),
  // The end of the round: Player 6 is Healthy again and leaves the Hospital; on every screen alike, naming no rescuer.
  recover: () => { deliver(EVENTS.find(e => e.id === 'recover').fact); deliver(EVENTS.find(e => e.id === 'leave-hospital').fact); },
  // The seat's own view alone: the Undercover's Protection granted at the round's end, or used up.
  'guard-granted': () => deliverPrivate(PRIVATE_EVENTS.find(e => e.id === 'guard-granted').fact),
  'guard-used': () => deliverPrivate(PRIVATE_EVENTS.find(e => e.id === 'guard-used').fact),
  jail: () => deliver(EVENTS.find(e => e.id === 'jail').fact),
  captain: () => deliver(EVENTS.find(e => e.id === 'captain').fact),
  phase: () => deliver(EVENTS.find(e => e.id === 'phase').fact),
  round: () => deliver(EVENTS.find(e => e.id === 'round').fact),
  // The match's end: Blue wins (the result, the roles and the Code), or the host ends it (nothing revealed).
  finish: () => deliver(EVENTS.find(e => e.id === 'finish').fact),
  abort: () => deliver(EVENTS.find(e => e.id === 'abort').fact),
  replay: () => { deliver(EVENTS.find(e => e.id === 'move').fact); deliver({ type: 'REPLAY' }); },
  pick: () => { const first = offerSeats(S.flow.kind).find(n => !seatsPicked().includes(n)); if (first) pick(first); },
  register: () => confirm(),
  tray: () => { S.view = 'actions'; render(); },
  menu: () => { S.view = 'menu'; render(); },
  // The connection: lost, an update unreadable, and the release's Reconnect now.
  stale: () => goStale('stale'),
  reconnect: () => reconnectNow(),
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

// mothership:dev-only
/**
 * Ability art, slice 8: choosing a character and the role card's reveal, on the release's two setup steps
 * (apps/game/hosted/setup-controls.js, createPlayerSetup, and role-confirmation.js, createRoleConfirmation): the same
 * markup, hooks and words, with the kit's art and its motion. A reference for Frontend made of labeled synthetic
 * fixtures: not the game, not Firebase, and nothing here talks to a server. The stand-in server answers as the panel says.
 *
 * What is whose. Who has taken which character is public (the lobby's identities): every phone draws it alike, as a
 * stamp with the taker's seat. The seat's own pick and its confirmation are its own. The role card is the seat's own
 * view's self.role: built only while it is turned up, and its back, like the card put away once the seat is Ready, is
 * the same for every role. No beat plays for a page that loads, a fresh view after a gap, or a duplicate: only for a
 * change this page saw, and never in reduced motion beyond the 80 ms fade.
 */
import { loadBundles } from '../../prototypes/js/bundles.js';

const params = new URLSearchParams(location.search);
const chrome = params.get('chrome') !== '0';
const frozen = params.has('t');

export const VIEWER = 3;
export const SYNTHETIC_LABEL = 'Synthetic fixture · design prototype, not a match';
/** The release's nine call signs, in its order (setup-controls.js): characters c1 to c9. */
export const CALL_SIGNS = ['Vega', 'Rigel', 'Lyra', 'Atlas', 'Orion', 'Nova', 'Juno', 'Mira', 'Echo'];
export const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];

/** The release's words, quoted exactly. The check finds every one verbatim in the file RELEASE_FILES names for it. */
export const SETUP_COPY = {
  choose: 'Choose your character',
  yourRole: 'Your role',
  waiting: 'Waiting',
  taken: 'Taken. Choose another character.',
  unavailable: 'Selection unavailable. Try again.',
  interrupted: 'Connection interrupted. Retry your selection.',
  retry: 'Retry selection',
  selectionOver: 'Selection time has ended. Waiting for the server…',
  readingOver: 'Reading time has ended. Waiting for everyone to be Ready.',
  syncing: 'Synchronizing countdown…',
  readyWaiting: 'Ready. Waiting for the timer and other players.',
};
export const ROLE_COPY = {
  heading: 'Your private role',
  reveal: 'Reveal my role',
  hide: 'Hide my role',
  back: 'Tap to reveal',
  ready: 'Ready',
  confirming: 'Confirming…',
  retryReady: 'Retry Ready',
  noRole: 'Waiting for a fresh, authorized role.',
  done: 'You are ready. Waiting for everyone else.',
  busy: 'Confirming your readiness…',
  uncertain: 'Your Ready answer is uncertain. Send the same request again.',
  understood: 'Press Ready when you understand your role.',
  first: 'Reveal your role, then press Ready.',
  notConfirmed: 'Ready not confirmed. Try again.',
};
export const RELEASE_FILES = { SETUP_COPY: 'apps/game/hosted/setup-controls.js', ROLE_COPY: 'apps/game/hosted/role-confirmation.js' };
const takenBy = (callSign, seat) => `${callSign}, taken by Player ${seat}`;
const timerLabel = (stage, seconds) => `${stage === 'choosing' ? 'Character selection' : 'Role reading'} · ${seconds} s`;

/** The release's role table (comic-shell.ts ROLES): each role's device and side, for the card's picture and its words. */
const ROLES = {
  Officer: ['officer', 'Blue'], Insider: ['insider', 'Blue'], Cracker: ['cracker', 'Blue'], 'Blue Disabler': ['blue-disabler', 'Blue'], Supplier: ['supplier', 'Blue'],
  Undercover: ['undercover', 'Red'], Hacker: ['hacker', 'Red'], 'Red Disabler': ['red-disabler', 'Red'], Alien: ['alien', 'Alien'],
};

/**
 * The beats of the reviewed cue-role-card-turn (design/contract/motion-cues.json; tokens 0.4.0 motionBeatsMs.roleCardTurn,
 * 900 ms in all): the card comes up face down when the reading stage begins (opening), turns over while the role's
 * device is put into the hand of the player's own character, still without its colour (accent), and the colour comes on (settle).
 */
export const TURN_BEATS = { opening: 220, accent: 520, settle: 160 };

// ---------- the fixtures: the setup's public facts and the seat's own ----------
export const SCENARIOS = [
  { id: 'select.open', group: 'Choosing a character', title: 'Choosing: two characters taken by others', stage: 'choosing', seconds: 24, holders: { 2: 'c4', 6: 'c7' } },
  { id: 'select.sending', group: 'Choosing a character', title: 'Rigel tapped: on its way', stage: 'choosing', seconds: 21, holders: { 2: 'c4', 6: 'c7' }, own: { selected: 'c2', busy: true } },
  { id: 'select.confirmed', group: 'Choosing a character', title: 'Rigel confirmed: the seat\'s own check', stage: 'choosing', seconds: 18, holders: { 2: 'c4', 6: 'c7', 3: 'c2' } },
  { id: 'select.crowded', group: 'Choosing a character', title: 'Seven taken, the own pick confirmed, two left', stage: 'choosing', seconds: 9, holders: { 1: 'c9', 2: 'c4', 3: 'c2', 4: 'c5', 5: 'c1', 6: 'c7', 8: 'c3' } },
  { id: 'select.refused', group: 'Choosing a character', title: 'Taken first: the server refuses, the holder\'s stamp', stage: 'choosing', seconds: 16, holders: { 2: 'c4', 5: 'c2', 6: 'c7' }, own: { selected: 'c2', notice: 'taken' } },
  { id: 'select.retry', group: 'Choosing a character', title: 'The answer was lost: Retry selection', stage: 'choosing', seconds: 14, holders: { 2: 'c4', 6: 'c7' }, own: { selected: 'c2', kept: true } },
  { id: 'select.expired', group: 'Choosing a character', title: 'Time is up: every card settles', stage: 'choosing', seconds: 0, holders: { 1: 'c9', 2: 'c4', 3: 'c2', 6: 'c7' } },
  { id: 'role.back', group: 'The role card', title: 'Face down: Tap to reveal', stage: 'awaiting-ready', seconds: 28, role: 'Insider', character: 'c2' },
  { id: 'role.face', group: 'The role card', title: 'Turned up: the Insider, its device in Rigel\'s hand', stage: 'awaiting-ready', seconds: 25, role: 'Insider', character: 'c2', card: { visible: true, seen: true } },
  { id: 'role.face-red', group: 'The role card', title: 'Turned up: the Red Disabler', stage: 'awaiting-ready', seconds: 25, role: 'Red Disabler', character: 'c6', card: { visible: true, seen: true } },
  { id: 'role.face-alien', group: 'The role card', title: 'Turned up: the Alien', stage: 'awaiting-ready', seconds: 25, role: 'Alien', character: 'c8', card: { visible: true, seen: true } },
  { id: 'role.seen', group: 'The role card', title: 'Hidden again: Ready is offered', stage: 'awaiting-ready', seconds: 19, role: 'Insider', character: 'c2', card: { seen: true } },
  { id: 'role.confirming', group: 'The role card', title: 'Ready pressed: the card put away, confirming', stage: 'awaiting-ready', seconds: 17, role: 'Insider', character: 'c2', card: { seen: true, busy: true } },
  { id: 'role.ready', group: 'The role card', title: 'Ready: the card put away, stamped', stage: 'awaiting-ready', seconds: 15, role: 'Insider', character: 'c2', card: { seen: true, ready: true } },
  { id: 'role.retry', group: 'The role card', title: 'The Ready answer was lost: Retry Ready', stage: 'awaiting-ready', seconds: 12, role: 'Insider', character: 'c2', card: { seen: true, retry: true } },
  { id: 'role.assigned', group: 'The role card', title: 'Assigned when time ran out: the server\'s character, face down', stage: 'awaiting-ready', seconds: 30, role: 'Supplier', character: 'c8' },
];
export const scenario = id => SCENARIOS.find(entry => entry.id === id) ?? SCENARIOS[0];

// ---------- state ----------
const S = {};
function load(id) {
  const entry = scenario(id);
  const holders = new Map(Object.entries(entry.holders ?? {}).map(([seat, character]) => [Number(seat), character]));
  Object.assign(S, {
    scenarioId: entry.id, title: entry.title, stage: entry.stage, seconds: entry.seconds, holders,
    selected: entry.own?.selected ?? holders.get(VIEWER) ?? null, busy: Boolean(entry.own?.busy), kept: Boolean(entry.own?.kept),
    notice: entry.own?.notice === 'taken' ? SETUP_COPY.taken : '',
    role: entry.role ?? 'Insider', character: entry.character ?? holders.get(VIEWER) ?? 'c2',
    visible: Boolean(entry.card?.visible), seen: Boolean(entry.card?.seen), roleBusy: Boolean(entry.card?.busy),
    readyAccepted: Boolean(entry.card?.ready), retry: Boolean(entry.card?.retry), failure: '',
    answer: params.get('answer') ?? 'accept', motion: params.get('motion') === 'reduced' ? 'reduced' : 'full',
  });
}
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reducedNow = () => S.motion === 'reduced' || motionQuery.matches;
const ownConfirmed = () => S.holders.get(VIEWER) !== undefined && S.holders.get(VIEWER) === S.selected && !S.busy && !S.kept;
const holderOf = character => [...S.holders].find(([seat, held]) => held === character && seat !== VIEWER)?.[0];

// ---------- the phone: the release's markup ----------
const el = (tag, text, attrs = {}) => {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) if (value !== null && value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : String(value));
  return node;
};
const root = document.getElementById('app');
const phone = el('div', null, { class: 'su-phone', id: 'su-app' });
const lobby = el('div', null, { class: 'connected-lobby' });
const setup = el('section', null, { class: 'connected-player-setup' });
const progress = el('section', null, { class: 'connected-setup-progress phone-setup-compact', 'aria-labelledby': 'setup-progress-heading' });
const title = el('h2', '', { id: 'setup-progress-heading' });
const countdown = el('p', '', { id: 'setup-countdown', role: 'timer', 'aria-live': 'off', class: 'setup-countdown' });
const head = el('div', null, { class: 'phone-setup-head' });
head.append(title, countdown);
progress.append(head);
const picker = el('section', null, { class: 'connected-identity', 'aria-label': SETUP_COPY.choose });
const grid = el('div', null, { class: 'crew-picker', role: 'group', 'aria-label': SETUP_COPY.choose });
const crewStatus = el('p', '', { id: 'crew-status', role: 'status' });
const retry = el('button', SETUP_COPY.retry, { type: 'button', id: 'crew-save' });
const tiles = CALL_SIGNS.map((callSign, index) => {
  const id = `c${index + 1}`;
  const button = el('button', callSign, { type: 'button', class: 'crew-option', 'data-character': id, 'aria-pressed': 'false' });
  button.addEventListener('click', () => { if (!button.disabled) { S.selected = id; S.notice = ''; confirmChoice(); } });
  grid.append(button);
  return { id, callSign, button };
});
picker.append(grid, crewStatus, retry);
// The release's Ready note is a card back with a check. The treatment adds its stamp, the release's word (aria-hidden: the note's name says it).
const readyNote = el('div', '✓', { id: 'setup-ready-waiting', class: 'phone-role-back', role: 'status', 'aria-label': SETUP_COPY.readyWaiting, tabindex: '-1' });
readyNote.append(el('span', ROLE_COPY.ready, { class: 'ab-ready-stamp', 'aria-hidden': 'true' }));
const roleNode = el('section', null, { class: 'connected-role-confirmation ms-shell', 'aria-labelledby': 'setup-role-heading', 'data-motion': 'full' });
const roleStatus = el('p', ROLE_COPY.noRole, { id: 'setup-role-status', role: 'status', class: 'ms-visually-hidden' });
const toggle = el('button', null, { type: 'button', id: 'setup-role-toggle', class: 'phone-role-toggle', 'aria-label': ROLE_COPY.reveal, 'aria-expanded': 'false', 'aria-controls': 'setup-role-card' });
const card = el('div', null, { class: 'ms-private__panel', id: 'setup-role-card' });
const ready = el('button', ROLE_COPY.ready, { type: 'button', id: 'setup-role-ready' });
// The release's back holds its words directly; the treatment wraps them (proposed: span.ab-back-words) so that their band grows with them.
const back = el('div', null, { class: 'phone-role-back', 'aria-hidden': 'true' });
back.append(el('span', ROLE_COPY.back, { class: 'ab-back-words' }));
const surface = el('div', null, { class: 'phone-role-surface' });
surface.append(back, card, toggle);
roleNode.append(el('h2', ROLE_COPY.heading, { id: 'setup-role-heading', class: 'ms-visually-hidden' }), roleStatus, surface, ready);
setup.append(progress, picker, readyNote, roleNode);
lobby.append(setup);
phone.append(el('p', 'Synthetic', { class: 'su-synthetic', 'aria-hidden': 'true' }), lobby);

/** The release's comic role card (renderComicRoleCard): built only while it is turned up; closed, no role word is in the page. */
function roleCard(name, character) {
  const [device, team] = ROLES[name] ?? ['officer', 'Blue'];
  const node = el('div', null, { class: 'ms-role-card ms-role-card--full', 'data-device': device, 'data-character': character, 'data-team': team.toLowerCase() });
  const text = el('div', null, { class: 'ms-role-card__text' });
  text.append(el('p', name, { class: 'ms-role-card__name' }), el('p', `${team} team`, { class: 'ms-role-card__team' }));
  node.append(el('span', null, { class: 'ms-role-card__art', 'aria-hidden': 'true' }), text);
  return node;
}

// ---------- motion: every beat from a token of 0.4.0, played once for the change that caused it ----------
const token = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
const ease = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'ease';
const M = () => ({ selection: token('--ms-motion-selection'), card: token('--ms-motion-card'), stamp: token('--ms-motion-stamp'), fade: token('--ms-motion-reduced-fade') });
const fadeIn = node => node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: M().fade, easing: 'linear' });
/**
 * A stamp lands: the taker's seat on a taken card, the seat's own check, READY. registrationStamp, 120 ms, snapping down at
 * the stamp's own rotation; in reduced motion the 80 ms fade. pseudoElement: the release's own check is its card's ::after.
 */
function land(node, { rotate = token('--ms-stamp-rotation') || -4, pseudoElement = null } = {}) {
  if (!node) return;
  const options = pseudoElement ? { pseudoElement } : {};
  if (reducedNow()) { node.animate([{ opacity: 0 }, { opacity: 1 }], { ...options, duration: M().fade, easing: 'linear' }); return; }
  node.animate([{ transform: `rotate(${rotate}deg) scale(1.6)`, opacity: 0 }, { transform: `rotate(${rotate}deg) scale(1)`, opacity: 1 }], { ...options, duration: M().stamp, easing: ease('--ms-ease-snap') });
}
/** The seat's own pick confirmed: it pops (cardTransition, 220 ms) on the approved burst, and its check lands. Reduced: the check's fade. */
function pop(tile) {
  if (!reducedNow()) {
    tile.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: M().card, easing: ease('--ms-ease-settle') });
    const burst = el('span', null, { class: 'ab-burst', 'aria-hidden': 'true' });
    tile.append(burst);
    burst.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: M().card, easing: ease('--ms-ease-standard') })
      .finished.then(() => burst.remove(), () => burst.remove());
  }
  land(tile, { rotate: 0, pseudoElement: '::after' });
}
/** The reading stage begins: the card comes up from the lower edge, face down (the cue's opening, 220 ms). */
function rise() {
  if (reducedNow()) { fadeIn(surface); return; }
  surface.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: TURN_BEATS.opening, easing: ease('--ms-ease-settle') });
}
let turning = null;
/**
 * Turned up by the player's own tap: the back turns away and the face turns in (the cue's accent, 520 ms), the role's
 * device is put into the hand of the player's own character, still without its colour, and the colour comes on (the
 * settle, 160 ms). Reduced: the face at once, with the 80 ms fade. Hiding mid-turn, or reduced motion switched on, ends it.
 */
function turnUp() {
  const face = card.querySelector('.ms-role-card');
  if (!face) return;
  if (reducedNow()) { back.hidden = true; fadeIn(face); return; }
  const half = TURN_BEATS.accent / 2;
  const art = face.querySelector('.ms-role-card__art');
  back.hidden = false;
  const steps = [
    back.animate([{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(90deg)' }], { duration: half, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }),
    face.animate([{ transform: 'perspective(900px) rotateY(-90deg)' }, { transform: 'perspective(900px) rotateY(0deg)' }], { duration: half, delay: half, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'backwards' }),
    art.animate([{ transform: 'translate(26%, 34%) rotate(16deg)', filter: 'grayscale(1)' }, { transform: 'none', filter: 'grayscale(1)' }], { pseudoElement: '::after', duration: half, delay: half, easing: ease('--ms-ease-sweep'), fill: 'backwards' }),
    art.animate([{ filter: 'grayscale(1)' }, { filter: 'grayscale(0)' }], { pseudoElement: '::after', duration: TURN_BEATS.settle, delay: TURN_BEATS.accent, easing: ease('--ms-ease-standard'), fill: 'backwards' }),
  ];
  turning = steps;
  Promise.all(steps.map(step => step.finished)).then(() => { if (turning === steps) { turning = null; settleTurn(); } }, () => {});
}
function settleTurn() {
  for (const step of turning ?? []) step.cancel();
  turning = null;
  for (const animation of back.getAnimations()) animation.cancel();
  back.hidden = S.visible && !S.readyAccepted;
}
/** Everything moving finishes at once, as it is (the timer closing, reduced motion switched on, the page put away). */
function settleAll() {
  for (const animation of phone.getAnimations({ subtree: true })) { try { animation.finish(); } catch { animation.cancel(); } }
  settleTurn();
}

// ---------- drawing: the release's draw(), and the treatment's marks; beats only for a change this page saw ----------
let seen = null; // what the page last drew: holders, the own confirmation, the stage, Ready
function render({ kind = 'update' } = {}) {
  const expired = S.stage === 'choosing' && S.seconds <= 0;
  const reading = S.stage === 'awaiting-ready';
  phone.dataset.stage = S.stage;
  setup.dataset.stage = S.stage;
  title.textContent = S.stage === 'choosing' ? SETUP_COPY.choose : reading ? SETUP_COPY.yourRole : SETUP_COPY.waiting;
  countdown.hidden = !(S.stage === 'choosing' || reading);
  countdown.dataset.state = S.seconds <= 0 ? 'expired' : S.seconds <= 10 ? 'final' : 'running';
  countdown.setAttribute('aria-label', S.seconds > 0 ? timerLabel(S.stage, S.seconds) : S.stage === 'choosing' ? SETUP_COPY.selectionOver : SETUP_COPY.readingOver);
  countdown.textContent = `0:${String(Math.max(0, S.seconds)).padStart(2, '0')}`;

  // Choosing: the nine cards. A taken card is stamped with its taker's seat (public); the seat's own, ringed, checked once confirmed.
  picker.hidden = S.stage !== 'choosing';
  const confirmed = ownConfirmed();
  const frozenPick = expired || S.busy || S.kept || S.stage !== 'choosing' || confirmed;
  for (const { id, callSign, button } of tiles) {
    const holder = holderOf(id);
    button.disabled = frozenPick || holder !== undefined;
    button.setAttribute('aria-disabled', String(button.disabled));
    button.setAttribute('aria-pressed', String(S.selected === id));
    button.setAttribute('data-taken', String(holder !== undefined));
    button.setAttribute('data-confirmed', String(confirmed && S.selected === id));
    button.setAttribute('aria-label', holder ? takenBy(callSign, holder) : callSign);
    // Proposed hook: the seat's own pick on its way to the server (the release only disables every card meanwhile).
    if (S.selected === id && (S.busy || S.kept) && S.stage === 'choosing') button.dataset.sending = S.kept ? 'kept' : 'true'; else delete button.dataset.sending;
    // The taker's seat, stamped (proposed: span.ab-taken, aria-hidden, since the card's name already says it).
    let stamp = button.querySelector('.ab-taken');
    if (holder === undefined) stamp?.remove();
    else if (stamp?.dataset.seat !== String(holder)) {
      stamp?.remove();
      stamp = el('span', null, { class: 'ab-taken', 'data-seat': holder, 'aria-hidden': 'true' });
      stamp.append(el('span', 'Player', { class: 'ab-taken__word' }), document.createTextNode(' '), el('span', String(holder), { class: 'ab-taken__seat' }));
      button.append(stamp);
    }
  }
  retry.hidden = !S.kept || confirmed || expired;
  retry.disabled = S.busy || expired || S.stage !== 'choosing';
  crewStatus.textContent = S.notice || (S.kept && !S.busy ? SETUP_COPY.interrupted : '');
  crewStatus.hidden = crewStatus.textContent === '';

  // The role card: face down (the same back for every role), turned up by the player, put away once Ready.
  const doneReady = reading && S.readyAccepted;
  readyNote.hidden = !doneReady;
  roleNode.hidden = !reading || doneReady;
  const show = reading && S.visible && !doneReady;
  if (show && !card.firstChild) card.append(roleCard(S.role, S.character));
  if (!show && card.firstChild) { for (const step of turning ?? []) step.cancel(); turning = null; card.replaceChildren(); }
  card.hidden = !show;
  if (!turning) back.hidden = show;
  toggle.disabled = S.roleBusy;
  toggle.hidden = doneReady;
  toggle.setAttribute('aria-label', S.visible ? ROLE_COPY.hide : ROLE_COPY.reveal);
  toggle.setAttribute('aria-expanded', String(S.visible));
  ready.hidden = !reading || doneReady || !S.seen;
  ready.disabled = !S.seen || S.roleBusy;
  ready.textContent = S.roleBusy ? ROLE_COPY.confirming : S.retry ? ROLE_COPY.retryReady : ROLE_COPY.ready;
  roleStatus.setAttribute('class', S.failure ? 'phone-role-error' : 'ms-visually-hidden');
  roleStatus.textContent = S.failure || (doneReady ? ROLE_COPY.done : S.roleBusy ? ROLE_COPY.busy : S.retry ? ROLE_COPY.uncertain : S.seen ? ROLE_COPY.understood : ROLE_COPY.first);

  // The beats: only for a change this page saw. A load, or a fresh view after a gap, draws the same facts at rest.
  const now = { holders: new Map(S.holders), confirmed, stage: S.stage, ready: doneReady };
  if (kind === 'update' && seen) {
    // A stamp lands only on cards on screen: the server's assignments at the deal are drawn at rest, unseen.
    if (S.stage === 'choosing') for (const { id, button } of tiles) {
      const holder = holderOf(id);
      const before = [...seen.holders].find(([seat, held]) => held === id && seat !== VIEWER)?.[0];
      if (holder !== undefined && holder !== before) land(button.querySelector('.ab-taken'));
    }
    if (confirmed && !seen.confirmed) pop(tiles.find(tile => tile.id === S.selected).button);
    if (reading && seen.stage === 'choosing') rise();
    if (doneReady && !seen.ready) land(readyNote.querySelector('.ab-ready-stamp'));
  }
  if (expired) settleAll();
  seen = now;
}

// ---------- the stand-in server, and the player's own steps (the release's controller) ----------
let disposed = false; // The page put away for good: nothing answers, counts down or moves after it.
const later = (ms, fn) => setTimeout(() => { if (!disposed) fn(); }, frozen ? 0 : ms);
function confirmChoice() {
  if (S.busy || S.stage !== 'choosing' || S.seconds <= 0 || ownConfirmed()) return;
  S.busy = true; S.kept = false;
  render();
  later(S.answer === 'slow' ? 2400 : 500, () => {
    S.busy = false;
    if (S.answer === 'lose') S.kept = true;
    else if (S.answer === 'taken') {
      // Someone else's confirmation reached the server first: a public fact, drawn on every phone as that seat's stamp.
      const free = [...Array(9).keys()].map(n => n + 1).find(seat => seat !== VIEWER && !S.holders.has(seat));
      if (free) S.holders.set(free, S.selected);
      S.notice = SETUP_COPY.taken;
    } else { S.holders.set(VIEWER, S.selected); S.kept = false; }
    render();
  });
}
retry.addEventListener('click', confirmChoice);
toggle.addEventListener('click', () => {
  if (toggle.disabled || S.readyAccepted) return;
  S.visible = !S.visible;
  if (S.visible) S.seen = true;
  render();
  if (S.visible) turnUp();
});
ready.addEventListener('click', () => {
  if (ready.disabled) return;
  // As in the release: the card is put away at once, face down, while Ready is on its way.
  S.roleBusy = true; S.visible = false; S.failure = '';
  render();
  later(S.answer === 'slow' ? 2400 : 500, () => {
    S.roleBusy = false;
    if (S.answer === 'lose') S.retry = true;
    else if (S.answer === 'taken') S.failure = ROLE_COPY.notConfirmed;
    else { S.readyAccepted = true; S.retry = false; }
    render();
    if (S.readyAccepted) readyNote.focus({ preventScroll: true });
  });
});
/** The page goes to the background: the card is concealed at once (the release's conceal()), never turned up again by itself. */
function conceal() { if (S.visible) { S.visible = false; render(); } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') conceal(); });

// ---------- the public facts the panel delivers ----------
export const EVENTS = [
  { id: 'other-pick', label: 'Another player takes a character' },
  { id: 'expire', label: 'Time runs out' },
  { id: 'deal', label: 'The roles are dealt: the reading stage' },
  { id: 'fresh', label: 'A fresh view after a gap (reconnect)' },
  { id: 'hide-page', label: 'The page goes to the background' },
];
function deliver(id) {
  if (id === 'other-pick') {
    const seat = [1, 2, 4, 5, 6, 7, 8, 9].find(n => !S.holders.has(n));
    const free = tiles.map(tile => tile.id).find(character => ![...S.holders.values()].includes(character) && character !== S.selected);
    if (seat && free) { S.holders.set(seat, free); render(); }
  } else if (id === 'expire') { S.seconds = 0; render(); }
  else if (id === 'deal') {
    // The server assigns every character not confirmed (the seat's own included) and deals the roles: the reading stage begins.
    for (const seat of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      if (S.holders.has(seat)) continue;
      const free = tiles.map(tile => tile.id).find(character => ![...S.holders.values()].includes(character));
      S.holders.set(seat, free);
    }
    S.character = S.holders.get(VIEWER);
    S.stage = 'awaiting-ready'; S.seconds = 30; S.busy = false; S.kept = false; S.notice = '';
    render();
  } else if (id === 'fresh') render({ kind: 'reconnect' });
  else if (id === 'hide-page') conceal();
}

// ---------- the art, the frame and the fixture panel ----------
async function loadArt() {
  await loadBundles(['public-board', 'player-ui', 'roles']);
  // The ability art: loaded whole on every player phone with its other bundles, whatever the seat's role.
  await new Promise(resolve => {
    const link = el('link', null, { rel: 'stylesheet', href: new URL('../assets/abilities.art.css', import.meta.url).href });
    link.addEventListener('load', () => { document.documentElement.dataset.art = `${document.documentElement.dataset.art ?? ''} abilities`.trim(); resolve(); }, { once: true });
    link.addEventListener('error', resolve, { once: true });
    document.head.append(link);
  });
}
function fixturePanel() {
  const select = el('select', null, { id: 'su-scenario', 'aria-label': 'Scenario' });
  for (const group of [...new Set(SCENARIOS.map(entry => entry.group))]) {
    const optgroup = el('optgroup', null, { label: group });
    for (const entry of SCENARIOS.filter(item => item.group === group)) optgroup.append(el('option', entry.title, { value: entry.id, selected: entry.id === S.scenarioId }));
    select.append(optgroup);
  }
  select.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('scenario', select.value); location.href = url.href; });
  const answer = el('select', null, { id: 'su-answer', 'aria-label': 'The next answer' });
  for (const [value, label] of [['accept', 'Accept'], ['taken', 'Refuse (taken first, or Ready refused)'], ['lose', 'Lose the answer'], ['slow', 'Answer slowly']]) answer.append(el('option', label, { value, selected: value === S.answer }));
  answer.addEventListener('change', () => { S.answer = answer.value; });
  const facts = el('fieldset');
  facts.append(el('legend', 'Public facts · synthetic'));
  for (const event of EVENTS) {
    const button = el('button', event.label, { type: 'button', id: `su-${event.id}` });
    button.addEventListener('click', () => deliver(event.id));
    facts.append(button);
  }
  const reduced = el('input', null, { type: 'checkbox', id: 'su-reduced', checked: S.motion === 'reduced' });
  reduced.addEventListener('change', () => { S.motion = reduced.checked ? 'reduced' : 'full'; if (reduced.checked) settleAll(); });
  const label = el('label');
  label.append(reduced, document.createTextNode(' Reduced motion'));
  const first = el('fieldset');
  first.append(el('legend', 'Scenario'), select);
  const server = el('fieldset');
  server.append(el('legend', 'The stand-in server'), answer, el('p', 'Every answer is labeled synthetic. Nothing is resolved.'));
  const display = el('fieldset');
  display.append(el('legend', 'Display'), label);
  const panel = el('aside', null, { class: 'su-panel', 'aria-label': 'Prototype controls' });
  panel.append(el('p', SYNTHETIC_LABEL), first, server, facts, display);
  return panel;
}

load(params.get('scenario') ?? 'select.open');
await loadArt();
if (chrome) {
  const frame = el('div', null, { class: 'su-frame', style: `--frame-w: ${Number(params.get('w') ?? 390)}px; --frame-h: ${Number(params.get('h') ?? 844)}px` });
  frame.append(phone);
  const wrap = el('div', null, { class: 'su-proto' });
  const holder = el('div');
  holder.append(el('h2', 'The phone', { class: 'su-vh' }), frame);
  wrap.append(holder, fixturePanel());
  root.append(wrap);
} else {
  root.append(phone);
  if (params.get('safe') === '1') { phone.style.setProperty('--su-safe-top', '47px'); phone.style.setProperty('--su-safe-bottom', '34px'); }
}
phone.dataset.short = String(Number(params.get('h') ?? innerHeight) <= 640);
render({ kind: 'load' });
const countdownTimer = frozen ? null : setInterval(() => { if (S.seconds > 0 && (S.stage === 'choosing' || S.stage === 'awaiting-ready')) { S.seconds -= 1; render(); } }, 1000);
// The system's reduced motion switched on, with no new fact: everything moving finishes at once, as the panel's switch
// does. Switched off again, nothing plays again: a beat is only ever for a change the page saw.
const onSystemMotion = event => { if (event.matches) settleAll(); };
motionQuery.addEventListener('change', onSystemMotion);
// The page put away: the card concealed and everything at rest, so a page brought back from the back-forward cache
// resumes nothing. Put away for good, the countdown and the stand-in server stop, and the listener goes.
window.addEventListener('pagehide', event => {
  conceal(); settleAll();
  if (event.persisted) return;
  disposed = true; clearInterval(countdownTimer);
  motionQuery.removeEventListener('change', onSystemMotion);
});

// ---------- holds for storyboards and captures: ?play=<beat>&t=<ms> ----------
const PLAY = {
  // The seat's own pick confirmed: the pop and its check.
  confirm: () => { S.answer = 'accept'; tiles.find(tile => tile.id === 'c2').button.click(); },
  // Another seat takes a character: its stamp lands on every phone.
  stamp: () => deliver('other-pick'),
  // The reading stage begins: the card comes up face down.
  deal: () => deliver('deal'),
  // The player turns the card up.
  reveal: () => toggle.click(),
  // Ready accepted: the card put away, stamped.
  ready: () => { S.answer = 'accept'; ready.click(); },
};
const play = params.get('play');
if (play && PLAY[play]) {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  PLAY[play]();
  await new Promise(resolve => setTimeout(resolve, 20));
}
if (frozen) {
  const t = Number(params.get('t'));
  for (const animation of document.getAnimations()) {
    animation.pause();
    animation.currentTime = Math.min(t, Number(animation.effect?.getComputedTiming().endTime ?? t));
  }
}
window.__suState = S;
window.__designReady = true;

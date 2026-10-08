// Hosted playtest entry, promoted from the connected client at 4b6dc327.
// Reuses the server-authoritative client and its reviewed lifecycle reconciliation.
// The local emulator entry and fixture harness remain separate and excluded from this build.

import {
  createComicFeeds, createSetupFeed, createConnectedApi, createConnectedPlayerScreen, createConnectedTableScreen, createLifecycleRequests, readAdmission, readHostSession, readLobby, shellTokenStylesheet,
} from '@mothership/game';
import { SeatSessionSchema } from '@mothership/contracts';
import { renderComicPlayerShell, renderComicTableShell } from '@mothership/presentation';
import { nextDesignTokens } from '@mothership/design-tokens';
import { createTransport } from './transport-provider.js';
import { browserPorts, mountScreen } from './browser-host.js';
import '../src/styles/shell.css';
import './preview.css';
import './comic-tokens.css';
import './comic.css';
import './comic-layout.css';
import './setup.css';
import './phone.css';
import './compact-phone.css';
import { disclosure, dock, copyControl, choiceTiles, publicSlots } from './phone-ui.js';
import { createPlayerSetup, createSetupProgress } from './setup-controls.js';
import { createSetupClock } from './setup-clock.js';
import { loadArt } from './art.mjs';
import { createPracticeControls } from './practice-controls.js';

// What this page keeps across a reload, per tab: which kind of device it is and the
// identifiers of its match and its own admission request, or, for a device that took over
// a seat with a recovery code, the public number of that seat (or, until the server has
// answered, only that it asked for one). Nothing of the game: no role, target, view or
// payload, and never a recovery code. ("Role" is the game's word, so it is not used for the
// device.) The sign-in credential is kept separately by the Firebase client, also per tab
// (PROVISIONAL, adoption assessment G4), and the client core keeps the identifiers of one
// unresolved command and of a host's request for a recovery code that is not settled.
const RESUME_KEY = 'mothership:connected-resume';
const resume = {
  load() {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(RESUME_KEY) ?? 'null');
      return value !== null && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  },
  save: value => window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(value)),
  clear: () => window.sessionStorage.removeItem(RESUME_KEY),
};

const tokenStyle = document.createElement('style');
tokenStyle.textContent = shellTokenStylesheet(nextDesignTokens);
document.head.append(tokenStyle);

const lobby = document.getElementById('lobby');
const app = document.getElementById('app');
const ports = browserPorts();
const transport = await createTransport();
const api = createConnectedApi(transport, ports);
const deviceKind = new URLSearchParams(window.location.search).get('as');
document.body.dataset.device = ['host', 'player', 'display'].includes(deviceKind) ? deviceKind : 'entry';
void loadArt(deviceKind);

function el(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}
function facts(entries) {
  const list = el('dl', undefined, { class: 'connected-facts' });
  for (const [term, value, id] of entries) list.append(el('dt', term), el('dd', value, id ? { id } : {}));
  return list;
}
const page = el('main', undefined, { class: 'connected-lobby', id: 'connected-lobby' });
const statusLine = el('p', '', { class: 'connected-status', id: 'connected-status', role: 'status' });
function say(text, kind = 'info') {
  statusLine.dataset.kind = kind;
  if (statusLine.textContent !== text) statusLine.textContent = text;
}
// Forgets which match this tab was in. The identity stays; the match itself is not touched.
const forget = el('button', 'Forget this match on this tab', { type: 'button', id: 'connected-forget', class: 'connected-quiet' });
function forgetMatch() {
  resume.clear();
  // And what was kept about it: a request that was not settled, and the identifiers of a command.
  window.sessionStorage.removeItem(UNSETTLED_KEY);
  try {
    ports.unresolved.clear();
  } catch {
    // Storage that cannot be cleared holds identifiers only.
  }
  window.location.reload();
}
forget.addEventListener('click', forgetMatch);
function frame(title, ...content) {
  const extra = content.filter(node => node.tagName === 'DETAILS');
  const primary = content.filter(node => node.tagName !== 'DETAILS');
  const menu = disclosure(el, 'Menu', ...extra, ...(resume.load() === null ? [] : [forget]));
  menu.classList.add('phone-options');
  page.replaceChildren(el('h1', title, { class: 'phone-caption', tabindex: '-1' }),
    ...primary, statusLine, ...(extra.length || resume.load() !== null ? [menu] : []));
  // The page takes the place of whatever the document came with: its first line, shown while this script loads.
  if (!lobby.contains(page)) lobby.replaceChildren(page);
}

// The lifecycle operations. The rule for them is the client core's (lifecycle-requests.ts):
// what was entered goes into a request once, and until the server has settled that request,
// pressing again sends it again as it is. This page only says what happened, and keeps the
// controls from showing anything other than what will be sent.
//
// The one thing kept across a reload is a host's request for a recovery code that is not
// settled, as identifiers only: the client core writes nothing else, whatever it is asked.
const UNSETTLED_KEY = 'mothership:unsettled-requests';
const lifecycle = createLifecycleRequests({
  ids: ports.ids,
  clock: ports.clock,
  store: {
    load() {
      try {
        return JSON.parse(window.sessionStorage.getItem(UNSETTLED_KEY) ?? 'null');
      } catch {
        return null;
      }
    },
    save(value) {
      if (Object.keys(value).length === 0) window.sessionStorage.removeItem(UNSETTLED_KEY);
      else window.sessionStorage.setItem(UNSETTLED_KEY, JSON.stringify(value));
    },
  },
});

/** Sends one lifecycle request, or the one already kept under the key, and says what came of it. Returns the client core's outcome. */
async function operate(key, build, call, what, { invalid = 'That is not a request this page can send.', durable = false } = {}) {
  say(lifecycle.unsettled(key) === null ? `${what}…` : `${what}: sending the same request again…`);
  const outcome = await lifecycle.send(key, build, call, { durable });
  if (outcome.kind === 'invalid') say(invalid, 'problem');
  else if (outcome.kind === 'done') say(`${what}: done.`);
  else if (outcome.kind === 'refused') say(`${what}: refused by the server (${outcome.code}).`, 'problem');
  else if (outcome.kind === 'unsettled') {
    const wait = outcome.retryAfterMs === null || outcome.retryAfterMs <= 0 ? '' : ` Wait ${Math.ceil(outcome.retryAfterMs / 1000)} s first.`;
    const again = 'Press again to send the same request again.';
    if (outcome.why === 'no-answer') say(`${what}: no answer. ${again}`, 'problem');
    else if (outcome.why === 'not-now') say(`${what}: not done${outcome.code === null ? '' : ` (${outcome.code})`}.${wait} ${again}`, 'problem');
    else say(`${what}: refused by the server (${outcome.code}). An earlier try of this same request got no answer, so it may have been carried out, or may yet be. ${again}`, 'problem');
  }
  for (const refresh of keptControls) refresh();
  return outcome;
}

/** Every control tied to a kept request redraws itself when any request is settled or given up. */
const keptControls = new Set();
/**
 * Ties a control to the request kept for it. While one is kept, what the person entered
 * cannot be changed, because it is no longer what would be sent; the control says that
 * pressing it sends the same request again; and a second control gives the request up.
 * Returns what goes on the page in place of the control alone.
 */
function keeping(key, button, inputs = [], onGivenUp = () => {}) {
  const label = button.textContent;
  const giveUp = el('button', 'Give this request up', { type: 'button', class: 'connected-quiet', 'data-give-up': key });
  const refresh = () => {
    const kept = lifecycle.unsettled(key) !== null;
    for (const input of inputs) input.disabled = kept;
    button.textContent = kept ? 'Send the same request again' : label;
    giveUp.hidden = !kept;
  };
  giveUp.addEventListener('click', () => {
    // Nothing is given up while a send is on its way.
    if (!lifecycle.abandon(key)) return;
    say('Given up. If the server received that request, it may still carry it out.', 'problem');
    for (const each of keptControls) each();
    onGivenUp();
    button.focus();
  });
  keptControls.add(refresh);
  refresh();
  const group = el('div', undefined, { class: 'connected-control' });
  group.append(button, giveUp);
  return group;
}

// How long a listener the server refused waits before it is opened again: a second and a
// half at first, then half as long again each time, up to this many seconds. A display
// waits like this until the host admits it, so the longest wait is also the longest time
// between the host admitting it and its page showing so.
const RETRY_FIRST_MS = 1_500;
const RETRY_LONGEST_MS = 6_000;

/**
 * Listens to a document and keeps trying while the rules refuse it, as they do until this
 * identity is admitted. `onRefused` is told each time the server refuses, for a page that
 * has reason to expect otherwise.
 */
function listenPersistently(target, read, onValue, onRefused = () => {}) {
  let stop = () => {};
  let stopped = false;
  let timer = null;
  let wait = RETRY_FIRST_MS;
  const start = () => {
    stop = transport.listenDocument(target, {
      onSnapshot: snapshot => {
        if (stopped || !snapshot.fresh) return;
        wait = RETRY_FIRST_MS;
        const outcome = read(snapshot.value);
        if (outcome.kind === 'accepted') onValue(outcome.value);
      },
      // A refused listener is dead. It is started again; it is not an empty document.
      onError: reason => {
        if (stopped) return;
        // This transport cannot tell a refusal from a sign-in it could not confirm, and the
        // page is told of either: what it then says states neither as fact.
        if (reason === 'refused' || reason === 'authorization-uncertain') onRefused();
        timer = window.setTimeout(start, wait);
        wait = Math.min(RETRY_LONGEST_MS, Math.round(wait * 1.5));
      },
    });
  };
  start();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stop();
  };
}

/**
 * Watches the lobby and calls `open` once there is a match to show. A match the host ended
 * before it started has none: no view was ever written for it, and the rules refuse a read
 * of a view that is not there, as they refuse a stranger. A device that can read the lobby
 * is in the match, so for it an ended match without a view is one that never started. The
 * page then says so through `endedInLobby` and opens nothing. `lobbyRefused` is told each
 * time the server refuses the lobby itself, and `waiting` when the lobby can be read and
 * the match has not started.
 */
function openOnceStarted(matchId, viewTarget, open, endedInLobby, lobbyRefused = () => {}, waiting = () => {}) {
  let asked = false;
  return listenPersistently({ kind: 'lobby', matchId }, payload => readLobby(payload, matchId), view => {
    if (view.status === 'lobby') return waiting();
    if (view.status !== 'aborted') return open();
    if (asked) return;
    asked = true;
    let stop = () => {};
    let settled = false;

    let wait = RETRY_FIRST_MS;
    const settle = exists => {
      if (settled) return;
      settled = true;
      stop();
      if (exists) open();
      else endedInLobby();
    };
    const read = () => {
      stop = transport.listenDocument(viewTarget, {
        onSnapshot: snapshot => {
          if (snapshot.fresh) settle(snapshot.value !== null);
        },
        // A transient Auth/App Check denial cannot establish whether this ended match
        // ever started. Open the normal quarantined screen so it can offer recovery.
        onError: reason => {
          if (reason === 'refused') return settle(false);
          if (reason === 'authorization-uncertain') return settle(true);
          if (settled) return;
          window.setTimeout(read, wait);
          wait = Math.min(RETRY_LONGEST_MS, Math.round(wait * 1.5));
        },
      });
      if (settled) stop();
    };
    read();
  }, lobbyRefused);
}

/** Lobby listeners of this page. They end when the match is on screen: the screen has its own. */
const lobbyWatchers = [];
let mounted = false;
function showMatch(screen, render, matchId, seatId) {
  if (mounted) return;
  mounted = true;
  for (const stop of lobbyWatchers.splice(0)) stop();
  const feeds = createComicFeeds({ transport, ports, matchId, ...(seatId ? { seatId } : {}) });
  mountScreen({ container: app, screen, render: (model, phone) => render(model, {
    ...phone,
    identities: feeds.identities()?.seats ?? [],
    practice: model.connection === 'live' ? feeds.practice() : null,
    acknowledgments: model.connection === 'live' ? feeds.acknowledgments() : null,
  }), subscribeExtra: listener => feeds.subscribe(listener), onDispose: () => feeds.dispose() });
  let accessWasCurrent = false;
  // The console steps aside once the match itself is on screen.
  const settle = () => {
    const model = screen.getFrame().model;
    const current = model.screen === 'match' && model.connection === 'live';
    if (!current && accessWasCurrent) feeds.quarantine();
    if (current && !accessWasCurrent) feeds.start();
    accessWasCurrent = current;
    if (model.screen !== 'connecting') lobby.hidden = true;
  };
  screen.subscribe(settle);
  settle();
  const nextGame = el('button', seatId ? 'Join a new game' : 'Show another match', { type: 'button', id: 'connected-next-game', class: 'phone-next' });
  nextGame.addEventListener('click', forgetMatch);
  app.append(nextGame);
  const updateNext = () => {
    const model = screen.getFrame().model;
    const ended = model.match?.result != null;
    nextGame.hidden = !ended && model.screen !== 'blocked';
    if (ended && model.match?.privateArea?.open) screen.dispatch({ type: 'private/toggle' });
  };
  screen.subscribe(updateNext); updateNext();
  globalThis.mothershipConnected = { ...(globalThis.mothershipConnected ?? {}), frame: () => screen.getFrame() };
}

const ENDED_IN_LOBBY = 'The host ended this match before it started. There is nothing of it to show.';

function chooseDevice(uid) {
  frame('Welcome aboard',
    el('p', 'A table game for 7 to 9 players. Everyone plays on their own phone.'),
    (() => {
      const list = el('ul', undefined, { class: 'phone-doors' });
      for (const [name, label] of [['player', 'Join a game'], ['host', 'Host a game'], ['display', 'Shared display']]) {
        const item = el('li');
        item.append(el('a', label, { href: `?as=${name}`, id: `connected-as-${name}` }));
        list.append(item);
      }
      return list;
    })(),
    el('p', 'Play together, in the same room. Keep each player’s private card on their own screen.'),
    disclosure(el, 'This device', facts([['Identifier', uid, 'connected-uid']]), el('p', 'Each tab is its own device with its own identity. Open one tab per player.')),
  );
}

async function host(uid) {
  let state = resume.load();
  if (state?.device !== 'host') state = null;
  if (state === null) {
    const count = el('select', undefined, { id: 'connected-player-count' });
    for (const value of [7, 8, 9]) count.append(el('option', `${value} players`, { value: String(value) }));
    const create = el('button', 'Create lobby', { type: 'button', id: 'connected-create' });
    const label = choiceTiles(el, count, 'How many players?', 'count');
    frame('Host a game', label,
      dock(el, keeping('create', create, [count])), disclosure(el, 'This device', facts([['Identifier', uid, 'connected-uid']])));
    create.addEventListener('click', async () => {
      const outcome = await operate('create', requestId => ({ protocolVersion: 2, requestId, playerCount: Number(count.value) }), request => api.createMatch(request), 'Creating the lobby');
      if (outcome.kind !== 'done') return;
      resume.save({ device: 'host', matchId: outcome.result.matchId });
      void host(uid);
    });
    return;
  }

  const { matchId } = state;
  let session = null;
  let seats = [];
  let requests = [];
  let hostScreen = null, stopHostScreen = () => {};
  const practiceFeed = createComicFeeds({ transport, ports, matchId });
  const setupFeed = createSetupFeed({ transport, ports, matchId });
  const setupProgress = createSetupProgress({ el });
  const setupClock = createSetupClock({ api, ports, matchId, onTick: () => draw() });
  const practiceControls = createPracticeControls({ matchId, api, lifecycle, operate, feed: practiceFeed, el, onChange: () => draw() });
  // Built once and updated in place, so a request that arrives while the host is typing or
  // choosing takes nothing away from under their hands.
  const list = el('ul', undefined, { id: 'connected-requests' });
  const none = el('p', 'Waiting for players', { id: 'connected-no-requests' });
  const rows = new Map();
  const displayUid = el('input', undefined, { type: 'text', id: 'connected-display-uid', autocomplete: 'off', spellcheck: 'false' });
  const displayLabel = el('label', 'Identifier shown on the shared display');
  displayLabel.append(displayUid);
  const admit = el('button', 'Admit the display', { type: 'button', id: 'connected-admit-display' });
  admit.addEventListener('click', () => operate('admit', requestId => ({ protocolVersion: 2, matchId, requestId, displayUid: displayUid.value.trim() }), body => api.admitDisplay(body), 'Admitting the display', { invalid: 'That is not an identifier a display shows.' }));
  const admitControl = keeping('admit', admit, [displayUid]);
  const start = el('button', 'Start setup', { type: 'button', id: 'connected-start' });
  start.addEventListener('click', () => {
    if (start.disabled) return;
    return operate('start', requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId, requestId }), body => api.beginSetup(body), 'Starting character selection');
  });
  const startControl = keeping('start', start);
  // Ending the match is the host's alone and cannot be undone, so it takes two presses, and
  // the second control is not where the first one was. The server records the match as
  // ended by the host, without a winner; this page decides nothing about it.
  let askingToEnd = false;
  const end = el('button', 'End the match for everyone…', { type: 'button', id: 'connected-end' });
  const endNote = el('p', 'This ends the match for every player and for the display. It is recorded as ended by the host, without a winner, and cannot be undone.', { id: 'connected-end-note' });
  const endCancel = el('button', 'No, keep the match', { type: 'button', id: 'connected-end-cancel' });
  const endConfirm = el('button', 'Yes, end the match now', { type: 'button', id: 'connected-end-confirm' });
  end.addEventListener('click', () => {
    askingToEnd = true;
    draw();
    // Focus goes to the way back, not to the control that ends the match.
    endCancel.focus();
  });
  endCancel.addEventListener('click', () => {
    askingToEnd = false;
    draw();
    end.focus();
  });
  endConfirm.addEventListener('click', async () => {
    const outcome = await operate('end', requestId => ({ protocolVersion: 2, matchId, requestId }), body => api.abortMatch(body), 'Ending the match');
    if (outcome.kind !== 'done') return;
    askingToEnd = false;
    draw();
  });
  const endControl = keeping('end', endConfirm);
  const endDialog = el('dialog', undefined, { class: 'phone-confirm', role: 'alertdialog', 'aria-labelledby': 'connected-end-title', 'aria-describedby': 'connected-end-note' });
  endDialog.append(el('h2', 'End this match?', { id: 'connected-end-title' }), endNote, endCancel, endControl);
  endDialog.addEventListener('cancel', event => { event.preventDefault(); askingToEnd = false; draw(); end.focus(); });
  // A seat can be moved to another device with a one-time code that only the host can ask
  // for. A code is shown here from this page's memory only, and is good until the time the
  // server names. Nothing changes for the seat until the other device uses it.
  //
  // One request for a code is made at a time, for the whole console. Until the server has
  // settled it, pressing again sends that very request again, and no other seat can be asked
  // about: a second request could be overtaken by the first and leave a dead code on screen.
  // A request that is not settled is kept across a reload of this page, as identifiers only.
  const recoverySeat = el('select', undefined, { id: 'connected-recovery-seat' });
  const recoverySeatLabel = el('label', 'Seat to move to another device');
  recoverySeatLabel.append(recoverySeat);
  const recoveryIssue = el('button', 'Issue a one-time recovery code', { type: 'button', id: 'connected-recovery-issue' });
  const recoveryCodes = el('ul', undefined, { id: 'connected-recovery-codes', class: 'connected-codes' });
  const recoveryNote = el('p', '', { id: 'connected-recovery-note' });
  /** The codes this page was given and has not taken off the screen: one for a seat at most. In memory only. */
  const codes = new Map();
  let codesShown = '';
  const drawCodes = () => {
    const showing = [...codes].map(([seatId, issued]) => `${seatId}/${issued.expiresAt}`).join();
    recoveryCodes.hidden = codes.size === 0;
    if (showing === codesShown) return;
    codesShown = showing;
    recoveryCodes.replaceChildren(...[...codes].map(([seatId, issued]) => {
      const item = el('li', undefined, { class: 'connected-row', 'data-recovery-seat': seatId });
      const remove = el('button', 'Take it off this page', { type: 'button', class: 'connected-quiet', id: `connected-recovery-remove-${seatId}` });
      remove.addEventListener('click', () => {
        codes.delete(seatId);
        drawCodes();
        recoveryIssue.focus();
      });
      item.append(
        el('span', `Player ${seatId.slice(5)}:`),
        el('span', issued.code, { class: 'connected-code', id: `connected-recovery-code-${seatId}` }),
        el('span', `Works once, until ${new Date(issued.expiresAt).toLocaleTimeString()}.`),
        copyControl(el, 'Copy recovery code', () => issued.code, say), remove,
      );
      return item;
    }));
  };
  /** The seat a request that is not settled asks about, or null when no request is kept. */
  const seatAskedFor = () => {
    const seatId = lifecycle.unsettled('recovery')?.request?.seatId;
    return typeof seatId === 'string' && /^seat-[1-9]$/.test(seatId) ? seatId : null;
  };
  recoveryIssue.addEventListener('click', async () => {
    const seatId = seatAskedFor() ?? recoverySeat.value;
    const who = `Player ${seatId.slice(5)}`;
    // A new code for a seat replaces the one before it. So whatever this page shows for that
    // seat comes off the screen before the request leaves, whether or not an answer comes back.
    codes.delete(seatId);
    drawCodes();
    recoveryNote.textContent = '';
    const outcome = await operate('recovery', requestId => ({ protocolVersion: 2, matchId, requestId, seatId }), body => api.issueSeatRecovery(body), `Issuing a recovery code for ${who}`, { durable: true });
    draw();
    if (outcome.kind === 'unsettled') {
      recoveryNote.textContent = `The request for ${who} is not settled. If the server carried it out, a code this page never received now exists for that seat, and any code issued for it before no longer works. `
        + 'Send the same request again until the server answers: no other seat can be asked about until then.';
      return;
    }
    if (outcome.kind !== 'done') return;
    // The client core believes an answer only for the seat that was asked about.
    const issued = outcome.result;
    if (issued.recoveryToken === null) {
      // The service gives a code out once. This answer repeats one whose first copy was lost on the way.
      recoveryNote.textContent = `A code for ${who} was issued, but the answer that carried it was lost and the service does not give a code out twice. Issue a new one: it replaces the lost one.`;
      return;
    }
    codes.set(issued.seatId, { code: issued.recoveryToken, expiresAt: issued.expiresAt });
    drawCodes();
    recoveryNote.textContent = 'The other device also needs the match identifier shown above. The device that holds the seat now loses it when the code is used. '
      + 'A code is kept nowhere but on this page: reloading the page loses it.';
  });
  const recoveryControl = keeping('recovery', recoveryIssue, [recoverySeat], () => {
    recoveryNote.textContent = 'That request was given up. If the server carried it out, a code this page never received exists for that seat until it is replaced or runs out.';
    draw();
  });
  // Kept by a console for another match in this tab: not this match's to send.
  if (lifecycle.unsettled('recovery') !== null && lifecycle.unsettled('recovery').request?.matchId !== matchId) lifecycle.abandon('recovery');
  if (seatAskedFor() !== null) {
    recoveryNote.textContent = `A request for a recovery code for Player ${seatAskedFor().slice(5)}, made before this page was reloaded, is not settled. Send the same request again: the answer will say whether a code was issued.`;
  }
  const roomCard = el('section', undefined, { class: 'phone-room-code', 'aria-labelledby': 'connected-code-title' });
  roomCard.append(el('h2', 'Room code', { id: 'connected-code-title' }), el('p', '…', { id: 'connected-room-code' }),
    copyControl(el, 'Copy', () => session?.roomCode, say));
  const slots = el('ol', undefined, { class: 'phone-slots', id: 'connected-roster', 'aria-label': 'Lobby seats' });
  let slotsKey = '';
  const startHelp = el('p', '', { id: 'connected-start-help' });
  start.setAttribute('aria-describedby', 'connected-start-help');
  const hostProgress = el('p', '', { class: 'phone-host-status', id: 'connected-host-progress', role: 'status' });
  const hostNext = el('button', 'Start a new game', { type: 'button', id: 'connected-host-next' });
  hostNext.addEventListener('click', forgetMatch);
  const requestsBlock = el('section', undefined, { class: 'phone-requests' });
  requestsBlock.append(el('h2', 'Requests to join', { id: 'connected-requests-title', tabindex: '-1' }), none, list);
  const botFold = disclosure(el, 'Practice bots', practiceControls.node);
  frame('Your lobby', roomCard, el('p', '…', { id: 'connected-seated' }), slots, requestsBlock, botFold,
    setupProgress.node, hostProgress, dock(el, startControl, startHelp, hostNext),
    disclosure(el, 'Move a seat to another device', el('h2', 'Seat recovery', { id: 'connected-recovery-title' }), recoverySeatLabel, recoveryControl, recoveryCodes, recoveryNote),
    disclosure(el, 'Shared display', displayLabel, admitControl),
    disclosure(el, 'Match details', facts([['This device', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id'], ['Status', '…', 'connected-match-status']]),
      copyControl(el, 'Copy match identifier', () => matchId, say), el('p', 'Hosting gives no view of anyone’s role. To play, join from another tab with the room code.')),
    disclosure(el, 'End match', end), endDialog,
  );
  const setText = (id, text) => {
    const node = document.getElementById(id);
    if (node.textContent !== text) node.textContent = text;
  };

  function row(request) {
    let entry = rows.get(request.id);
    if (entry !== undefined) return entry;
    const item = el('li', undefined, { class: 'connected-row', 'data-admission': request.id });
    const text = el('span');
    const seat = el('select', undefined, { 'aria-label': 'Seat for this player' });
    const approve = el('button', 'Seat this player', { type: 'button', 'data-approve': request.id });
    approve.addEventListener('click', () => operate(`approve ${request.id}`, requestId => ({ protocolVersion: 2, matchId, requestId, admissionId: request.id, seatId: seat.value }), body => api.approveAdmission(body), 'Seating the player'));
    const control = keeping(`approve ${request.id}`, approve, [seat]);
    item.append(text, seat, control);
    list.append(item);
    entry = { item, text, seat, approve, control };
    rows.set(request.id, entry);
    return entry;
  }

  const draw = () => {
    const playerCount = session?.playerCount ?? null;
    const setup = setupFeed.public();
    const open = session?.status === 'lobby' && (setup?.stage === 'lobby' || setupFeed.status() === 'absent');
    setupClock.setActive(['choosing', 'awaiting-ready'].includes(setup?.stage));
    setupProgress.update(setup, setupClock.read());
    const taken = new Set(seats.map(seat => seat.seatId));
    const vacant = playerCount === null ? [] : Array.from({ length: playerCount }, (unused, index) => `seat-${index + 1}`).filter(seatId => !taken.has(seatId));
    setText('connected-room-code', session?.roomCode ?? '…');
    setText('connected-seated', playerCount === null ? '…' : `${seats.length} of ${playerCount} seated`);
    setText('connected-match-status', session?.status === 'lobby' ? setup?.stage ?? 'lobby' : session?.status ?? '…');
    none.hidden = requests.length > 0;
    const publicIdentities = practiceFeed.identities()?.seats ?? [], botSeats = practiceFeed.practice()?.botSeatIds ?? [];
    const nextSlots = JSON.stringify([playerCount, seats, publicIdentities, botSeats]);
    if (nextSlots !== slotsKey) { slotsKey = nextSlots; slots.replaceChildren(...publicSlots(el, playerCount ?? 0, seats, publicIdentities, botSeats)); }
    const ended = ['complete', 'aborted'].includes(session?.status);
    page.querySelector('h1').textContent = open ? 'Your lobby' : ended ? 'Match ended' : session?.status === 'running' ? 'Match running' : setup?.stage === 'awaiting-ready' ? 'Reading roles' : 'Choosing characters';
    setupProgress.node.hidden = session?.status === 'running' || ended;
    roomCard.hidden = !open;
    requestsBlock.hidden = !open;
    startControl.hidden = !open;
    botFold.hidden = !open;
    hostNext.hidden = !ended;
    hostProgress.hidden = open;
    hostProgress.textContent = session?.status === 'running' ? 'Match running. Players act on their own phones.'
      : ended ? session.status === 'aborted' ? 'Match ended by the host. No winner.' : 'Match finished. The result is on the players’ screens.'
      : setup?.stage === 'awaiting-ready' ? 'Reading roles. Play begins after the 30-second minimum and everyone is Ready.' : 'Choosing characters. Everyone gets the full 30 seconds.';
    if (session?.status === 'running' && hostScreen === null) {
      hostScreen = createConnectedTableScreen({ transport, matchId, ports, host: { reload: () => window.location.reload() } });
      const syncHostProgress = () => {
        const model = hostScreen.getFrame().model;
        if (session?.status !== 'running') return;
        hostProgress.textContent = model.connection === 'live' && model.match
          ? `${model.match.phase.roundLabel} · ${model.match.phase.phaseLabel}${model.match.phase.detail ? ` · ${model.match.phase.detail}` : ''}`
          : 'Match running. Connecting to public progress…';
      };
      stopHostScreen = hostScreen.subscribe(syncHostProgress);
      hostScreen.start(); syncHostProgress();
      const visibility = () => hostScreen.setPageVisible(document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('pagehide', () => { document.removeEventListener('visibilitychange', visibility); stopHostScreen(); hostScreen.dispose(); }, { once: true });
    }
    startHelp.hidden = !open;
    startHelp.textContent = !practiceControls.readyToStart() ? 'Waiting for the bot settings to settle…'
      : vacant.length > 0 ? `Fill all ${playerCount} seats to start: ${vacant.length} open.` : 'Locks the seats. Everyone gets 30 seconds to choose a character.';

    for (const request of requests) {
      const { item, text, seat, approve, control } = row(request);
      // The first characters of the device's identifier, as that device shows it, tell two requests apart.
      const who = `Device ${request.admission.uid.slice(0, 6)}`;
      if (request.admission.status === 'approved') {
        const hadFocus = item.contains(document.activeElement);
        item.dataset.status = 'approved';
        text.textContent = `${who}: seated as Player ${request.admission.seatId.slice(5)}, starting in ${request.admission.initialRoom}`;
        seat.remove();
        control.remove();
        // The server's own record settles a request for this seating that was still kept.
        lifecycle.abandon(`approve ${request.id}`);
        // The control that was just used is gone; the keyboard goes on to the next thing to do.
        if (hadFocus) (list.querySelector('button[data-approve]:not([disabled])') ?? (start.disabled ? document.getElementById('connected-requests-title') : start)).focus();
        continue;
      }
      item.dataset.status = 'pending';
      text.textContent = `${who} asks to join, starting in ${request.admission.initialRoom}`;
      // While a request for this seating is kept, the seat it asks for is what stays shown.
      if (lifecycle.unsettled(`approve ${request.id}`) === null) {
        const chosen = vacant.includes(seat.value) ? seat.value : vacant[0];
        if ([...seat.options].map(option => option.value).join() !== vacant.join()) seat.replaceChildren(...vacant.map(seatId => el('option', `Player ${seatId.slice(5)}`, { value: seatId })));
        if (chosen !== undefined) seat.value = chosen;
      }
      approve.disabled = (vacant.length === 0 && lifecycle.unsettled(`approve ${request.id}`) === null) || !open;
    }
    practiceControls.update({ playerCount, status: session?.status ?? null, seats, setupOpen: open });
    start.disabled = playerCount === null || seats.length !== playerCount || !open || !practiceControls.readyToStart();
    // What the server's own record says settles a request that was still kept: a match that
    // has started needs no start, and one that is over needs no end.
    if (session !== null && session.status !== 'lobby' || setup !== null && setup.stage !== 'lobby') lifecycle.abandon('start');
    // A match that is over, either way, cannot be ended again.
    const endable = session !== null && (session.status === 'lobby' || session.status === 'running');
    if (session !== null && !endable) lifecycle.abandon('end');
    if (!endable) askingToEnd = false;
    end.hidden = !endable || askingToEnd;
    for (const node of [endNote, endCancel, endControl]) node.hidden = !endable || !askingToEnd;
    if (askingToEnd && !endDialog.open) endDialog.showModal();
    else if (!askingToEnd && endDialog.open) endDialog.close();
    // Only a seat that is taken can be moved, and only in a match that is not over.
    const movable = endable ? seats.map(seat => seat.seatId).filter(seatId => practiceControls.canRecover(seatId)) : [];
    const asked = seatAskedFor();
    const listed = asked === null || movable.includes(asked) ? movable : [...movable, asked];
    const chosenSeat = asked ?? (movable.includes(recoverySeat.value) ? recoverySeat.value : movable[0]);
    if ([...recoverySeat.options].map(option => option.value).join() !== listed.join()) recoverySeat.replaceChildren(...listed.map(seatId => el('option', `Player ${seatId.slice(5)}`, { value: seatId })));
    if (chosenSeat !== undefined) recoverySeat.value = chosenSeat;
    // A request that is not settled is still shown, so that it can be sent again or given up.
    const recovering = movable.length > 0 || asked !== null;
    for (const node of [document.getElementById('connected-recovery-title'), recoverySeatLabel, recoveryControl, recoveryNote]) node.hidden = !recovering;
    if (!recovering) codes.clear();
    drawCodes();
    for (const refresh of keptControls) refresh();
  };
  draw();
  const stopSetup = setupFeed.subscribe(draw);
  practiceFeed.start(); setupFeed.start();
  window.addEventListener('pagehide', () => { stopSetup(); setupClock.dispose(); setupFeed.dispose(); practiceControls.dispose(); practiceFeed.dispose(); }, { once: true });
  transport.listenDocument({ kind: 'session', matchId }, {
    onSnapshot: snapshot => {
      const read = readHostSession(snapshot.value);
      if (!snapshot.fresh || read.kind !== 'accepted') return;
      session = read.value;
      draw();
    },
    onError: () => say('The match could not be read. Reload to try again.', 'problem'),
  });
  transport.listenDocument({ kind: 'lobby', matchId }, {
    onSnapshot: snapshot => {
      const read = readLobby(snapshot.value, matchId);
      if (!snapshot.fresh || read.kind !== 'accepted') return;
      seats = read.value.seats;
      draw();
    },
    onError: () => {},
  });
  transport.listenCollection({ kind: 'admissions', matchId }, {
    onSnapshot: snapshot => {
      if (!snapshot.fresh) return;
      // A request that cannot be read is left out, not guessed at.
      requests = snapshot.value.map(item => ({ id: item.id, read: readAdmission(item.data) })).filter(item => item.read.kind === 'accepted')
        .map(item => ({ id: item.id, admission: item.read.value })).sort((a, b) => a.admission.requestedAt - b.admission.requestedAt || a.id.localeCompare(b.id));
      draw();
    },
    onError: () => {},
  });
}

const MATCH_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** Startup stays separate from the gameplay screen and never persists private roles. */
function identityPicker(matchId, seatId) {
  const feed = createSetupFeed({ transport, ports, matchId, seatId });
  const identities = createComicFeeds({ transport, ports, matchId });
  const clock = createSetupClock({ api, ports, matchId, onTick: () => control.refresh() });
  const control = createPlayerSetup({ matchId, seatId, feed, identities, api, lifecycle, operate, el, clock, onStageChange: () => say('') });
  const visibility = () => {
    control.conceal();
    if (document.visibilityState === 'hidden') { feed.quarantine(); identities.quarantine(); clock.suspend(); }
    else { feed.start(); identities.start(); control.refresh(); }
  };
  const blur = () => control.conceal();
  const stop = () => {
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur);
    window.removeEventListener('pagehide', stop); control.dispose(); clock.dispose(); feed.dispose(); identities.dispose();
  };
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  window.addEventListener('pagehide', stop, { once: true });
  lobbyWatchers.push(stop);
  feed.start(); identities.start();
  return control.node;
}

async function player(uid) {
  let state = resume.load();
  if (state?.device !== 'player' || typeof state.matchId !== 'string' || !MATCH_ID.test(state.matchId)) state = null;
  if (state === null) {
    const code = el('input', undefined, { type: 'text', id: 'connected-room-code-input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '32', inputmode: 'text', enterkeyhint: 'go' });
    const codeLabel = el('label', 'Room code');
    codeLabel.append(code);
    const join = el('button', 'Ask to join', { type: 'button', id: 'connected-join' });
    // Taking over a seat that another device held, with a one-time code from the host. The
    // code goes from the field into the request and nowhere else: not into the address, not
    // into storage. It leaves the field the moment the request is made; the request is kept
    // in this page's memory only, to be sent again as it is if no answer comes. The match
    // identifier is not a secret.
    const recoverMatch = el('input', undefined, { type: 'text', id: 'connected-recover-match', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' });
    const recoverMatchLabel = el('label', 'Match identifier, from the host');
    recoverMatchLabel.append(recoverMatch);
    const recoverCode = el('input', undefined, { type: 'text', id: 'connected-recover-code', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' });
    const recoverCodeLabel = el('label', 'One-time recovery code, from the host');
    recoverCodeLabel.append(recoverCode);
    const recover = el('button', 'Take over the seat', { type: 'button', id: 'connected-recover' });
    recover.addEventListener('click', async () => {
      let asked = lifecycle.unsettled('recover')?.request ?? null;
      if (asked === null) {
        asked = { matchId: recoverMatch.value.trim(), recoveryToken: recoverCode.value.trim() };
        recoverCode.value = '';
        if (!MATCH_ID.test(asked.matchId)) return say('That is not a match identifier and a recovery code.', 'problem');
      }
      const { matchId, recoveryToken } = asked;
      // Before anything is sent, this tab notes which match it asked for a seat in, and nothing
      // else. If the answer is lost, even across a reload, the server can then be asked whether
      // this device has a seat there, instead of the seat being left with nobody.
      resume.save({ device: 'player', matchId, recovering: true });
      const outcome = await operate('recover', requestId => ({ protocolVersion: 2, matchId, requestId, recoveryToken }), request => api.redeemSeatRecovery(request), 'Taking over the seat',
        { invalid: 'That is not a match identifier and a recovery code.' });
      if (outcome.kind === 'busy') return;
      if (outcome.kind === 'done') {
        // The seat is named by the answer, and the match by the request that was answered.
        resume.save({ device: 'player', matchId: outcome.request.matchId, seatId: outcome.result.seatId });
        return void player(uid);
      }
      if (outcome.kind === 'invalid' || outcome.kind === 'refused') {
        // Settled: this device was given nothing. It is in no match.
        resume.clear();
        return;
      }
      // Not settled. The request stays in memory to be sent again; and the server is asked
      // whether it has in fact given this device a seat, which settles it either way.
      void player(uid);
    });
    const joinForm = el('form', undefined, { class: 'phone-join-form' });
    const codeHelp = el('p', '12 characters: 0–9 and A–F.', { id: 'connected-code-help', class: 'ms-visually-hidden' });
    code.setAttribute('aria-describedby', 'connected-code-help');
    code.addEventListener('input', () => { code.value = code.value.toUpperCase(); });
    joinForm.append(codeLabel, codeHelp,
      dock(el, keeping('join', join, [code])));
    joinForm.addEventListener('submit', event => { event.preventDefault(); if (!join.disabled) join.click(); });
    frame('Join a game', joinForm,
      disclosure(el, 'Moving to a new phone? Take over your seat', recoverMatchLabel, recoverCodeLabel, keeping('recover', recover, [recoverMatch, recoverCode])),
      disclosure(el, 'This device', facts([['Identifier', uid, 'connected-uid']])));
    join.addEventListener('click', async () => {
      const outcome = await operate('join', requestId => ({ protocolVersion: 2, requestId, roomCode: code.value.replace(/\s+/g, '').toUpperCase() }), request => api.requestAdmission(request), 'Asking to join',
        { invalid: 'A room code is twelve characters, 0 to 9 and A to F.' });
      if (outcome.kind === 'refused' && outcome.code === 'FORBIDDEN') say('This room cannot take this request. Check the code with the host, or whether this device already has a seat.', 'problem');
      if (outcome.kind !== 'done') return;
      resume.save({ device: 'player', matchId: outcome.result.matchId, admissionId: outcome.result.admissionId });
      void player(uid);
    });
    return;
  }

  const { matchId, admissionId } = state;
  let seatId = null;
  let shown = null;
  let identityPanel = null;
  /** Draws the waiting page. It is redrawn only when what it says has changed, so a control on it keeps the keyboard. */
  const draw = (text, ...controls) => {
    const says = `${seatId}/${text}/${controls.length}`;
    if (says === shown) return;
    shown = says;
    const waitingCard = el('section', undefined, { class: 'phone-waiting' });
    waitingCard.append(el('span', seatId === null ? '?' : seatId.slice(5), { class: 'phone-seat-number', 'aria-hidden': 'true' }),
      el('h2', seatId === null ? 'Request sent' : `Player ${seatId.slice(5)}`, { id: 'connected-seat' }),
      el('p', text, { id: 'connected-waiting' }));
    frame(seatId === null ? 'Waiting to be seated' : 'You are seated', waitingCard,
      ...(identityPanel ? [identityPanel] : []), ...controls,
      disclosure(el, 'This device', facts([['Identifier', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id']])));
  };
  const open = () => showMatch(createConnectedPlayerScreen({ transport, matchId, seatId, ports, host: { reload: () => window.location.reload() } }), renderComicPlayerShell, matchId, seatId);
  // A seated player may read the lobby. If the server refuses that, this device is not in the match (any more).
  const openWhenRunning = () => openOnceStarted(matchId, { kind: 'player-view', matchId }, open, () => draw(ENDED_IN_LOBBY),
    () => draw('The server does not let this device read the match. If its seat was moved to another device, this one is no longer in it.'));

  if (state.recovering === true) {
    // This device asked to take a seat over and has no answer it can rely on: the answer was
    // lost, or the page was reloaded before it came. What the server lets this device read
    // settles it. Only a device in the match can read its lobby; a device that can has the seat.
    const resend = el('button', 'Send the same request again', { type: 'button', id: 'connected-recover-again' });
    const startOver = el('button', 'Start over with another code', { type: 'button', id: 'connected-recover-start-over', class: 'connected-quiet' });
    const controls = () => (lifecycle.unsettled('recover') === null ? [startOver] : [resend, startOver]);
    let inTheMatch = false;
    let waitingInLobby = false;
    let stopSeatSession = () => {};
    lobbyWatchers.push(() => { waitingInLobby = false; stopSeatSession(); });
    resend.addEventListener('click', async () => {
      // Only a request that is kept can be sent again: after a reload there is none, and the code is gone with it.
      const kept = lifecycle.unsettled('recover')?.request ?? null;
      if (kept === null) return;
      const outcome = await operate('recover', () => kept, request => api.redeemSeatRecovery(request), 'Taking over the seat');
      if (outcome.kind !== 'done') return draw(WAITING_FOR_AN_ANSWER, ...controls());
      // The answer says which seat. Whether the match has started is for the lobby to say.
      resume.save({ device: 'player', matchId: outcome.request.matchId, seatId: outcome.result.seatId });
      for (const stop of lobbyWatchers.splice(0)) stop();
      void player(uid);
    });
    startOver.addEventListener('click', () => {
      // The request, and the code in it, are let go. If the server carried the request out
      // after all, this device has the seat, and reloading this page will find that out.
      lifecycle.abandon('recover');
      resume.clear();
      for (const stop of lobbyWatchers.splice(0)) stop();
      say('Started over. If the earlier request was carried out after all, this device has the seat.', 'problem');
      void player(uid);
    });
    const WAITING_FOR_AN_ANSWER = 'This device asked to take over a seat in this match and has no answer yet. Asking the server whether it has the seat…';
    draw(WAITING_FOR_AN_ANSWER, ...controls());
    /** Reads the seat's own view to learn which seat it is, then opens the match. */
    const learnSeatAndOpen = () => {
      let stop = () => {};
      let settled = false;
      const read = () => {
        stop = transport.listenDocument({ kind: 'player-view', matchId }, {
          onSnapshot: snapshot => {
            const own = snapshot.value?.self?.seatId;
            if (settled || !snapshot.fresh || typeof own !== 'string' || !/^seat-[1-9]$/.test(own)) return;
            settled = true;
            stop();
            seatId = own;
            resume.save({ device: 'player', matchId, seatId });
            open();
          },
          // The view of a device that is in a running match exists. A read that fails is tried again.
          onError: () => {
            if (!settled) window.setTimeout(read, 1_500);
          },
        });
        if (settled) stop();
      };
      read();
    };
    /** The lobby can be read, so the server has this device in the match: that settles the request, whatever became of its answer. */
    const settledByTheServer = () => {
      inTheMatch = true;
      // The request, and the code in it, are not needed any more.
      lifecycle.abandon('recover');
    };
    let learning = false;
    lobbyWatchers.push(openOnceStarted(matchId, { kind: 'player-view', matchId },
      () => {
        waitingInLobby = false;
        stopSeatSession();
        settledByTheServer();
        if (learning) return;
        learning = true;
        draw('This device has taken over a seat. Opening the match…');
        learnSeatAndOpen();
      },
      () => { waitingInLobby = false; stopSeatSession(); draw(ENDED_IN_LOBBY); },
      () => {
        waitingInLobby = false;
        stopSeatSession();
        draw(inTheMatch
          ? 'The server does not let this device read the match. If its seat was moved to another device, this one is no longer in it.'
          : 'The server has not given this device a seat in this match. If the request is still on its way this page will find out; otherwise ask the host for a new code and start over.', ...controls());
      },
      () => {
        waitingInLobby = true;
        settledByTheServer();
        const waiting = 'This device has taken over a seat. Follow the setup steps below.';
        draw(waiting);
        if (seatId !== null) return;
        // Recovery writes this own-UID metadata even before a player view exists. A
        // missing legacy document keeps the waiting/view-after-start fallback above.
        stopSeatSession();
        stopSeatSession = listenPersistently({ kind: 'seat-session', matchId }, payload => {
          const parsed = SeatSessionSchema.safeParse(payload);
          return parsed.success && parsed.data.matchId === matchId
            ? { kind: 'accepted', value: parsed.data } : { kind: 'missing' };
        }, session => {
          if (!waitingInLobby || seatId !== null || transport.currentUid() !== uid) return;
          seatId = session.seatId;
          resume.save({ device: 'player', matchId, seatId });
          identityPanel = identityPicker(matchId, seatId);
          draw(waiting);
        });
      }));
    return;
  }
  if (admissionId === undefined && /^seat-[1-9]$/.test(state.seatId ?? '')) {
    // This device took over a seat with a recovery code. It has no request of its own to watch.
    seatId = state.seatId;
    identityPanel = identityPicker(matchId, seatId);
    draw('This device has taken over the seat. Waiting for the match.');
    lobbyWatchers.push(openWhenRunning());
    return;
  }
  draw('Waiting for the host to seat you.');
  let watchingLobby = false;
  lobbyWatchers.push(listenPersistently({ kind: 'admission', matchId, admissionId }, readAdmission, admission => {
    if (admission.status !== 'approved' || watchingLobby) return;
    watchingLobby = true;
    seatId = admission.seatId;
    identityPanel = identityPicker(matchId, seatId);
    draw('Seated. Follow the setup steps below.');
    // The private view does not exist before the start, and a listener on it is refused,
    // not empty. So the lobby is watched, and the match is opened once it is running.
    lobbyWatchers.push(openWhenRunning());
  }));
}

async function display(uid) {
  let state = resume.load();
  if (state?.device !== 'display') state = null;
  if (state === null) {
    const match = el('input', undefined, { type: 'text', id: 'connected-match-input', autocomplete: 'off', spellcheck: 'false' });
    const label = el('label', 'Match identifier, from the host');
    label.append(match);
    const watch = el('button', 'Show this match', { type: 'button', id: 'connected-watch' });
    frame('Shared display', el('p', 'Give this identifier to the host, who admits the display:'), facts([['This display', uid, 'connected-uid']]), label, watch);
    watch.addEventListener('click', () => {
      const matchId = match.value.trim();
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(matchId)) return say('That is not a match identifier.', 'problem');
      resume.save({ device: 'display', matchId });
      void display(uid);
    });
    return;
  }
  const { matchId } = state;
  const setupFeed = createSetupFeed({ transport, ports, matchId });
  const setupProgress = createSetupProgress({ el });
  const setupClock = createSetupClock({ api, ports, matchId, onTick: () => updateProgress() });
  const updateProgress = () => {
    const setup = setupFeed.public();
    setupClock.setActive(['choosing', 'awaiting-ready'].includes(setup?.stage));
    setupProgress.update(setup, setupClock.read());
  };
  const stopProgress = setupFeed.subscribe(updateProgress);
  lobbyWatchers.push(() => { stopProgress(); setupClock.dispose(); setupFeed.dispose(); });
  setupFeed.start(); setupProgress.update(setupFeed.public());
  const waiting = text => frame('Shared display', facts([['This display', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id']]), el('p', text, { id: 'connected-waiting' }), setupProgress.node);
  waiting('Waiting to be admitted by the host, and for the match to start.');
  // Until the host admits this identity the rules refuse the lobby, so the listener keeps asking.
  lobbyWatchers.push(openOnceStarted(matchId, { kind: 'public-view', matchId },
    () => showMatch(createConnectedTableScreen({ transport, matchId, ports, host: { reload: () => window.location.reload() } }), renderComicTableShell, matchId),
    () => waiting(ENDED_IN_LOBBY)));
}

frame('Mothership playtest', el('p', 'Signing in…'));
try {
  const uid = await transport.signIn();
  if (deviceKind === 'host') await host(uid);
  else if (deviceKind === 'player') await player(uid);
  else if (deviceKind === 'display') await display(uid);
  else chooseDevice(uid);
} catch {
  frame('Mothership playtest', el('p', 'Could not verify this session. Check your connection and reload to try again.', { id: 'connected-signin-failed' }));
}

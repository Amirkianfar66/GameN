// Hosted playtest entry, promoted from the connected client at 4b6dc327.
// Reuses the server-authoritative client and its reviewed lifecycle reconciliation.
// The local emulator entry and fixture harness remain separate and excluded from this build.

import {
  createConnectedApi, createConnectedPlayerScreen, createConnectedTableScreen, createLifecycleRequests, readAdmission, readHostSession, readLobby, shellTokenStylesheet,
} from '@mothership/game';
import { renderConnectedPlayerShell, renderTableShell } from '@mothership/presentation';
import { proposedDesignTokens } from '@mothership/design-tokens';
import { createHostedTransport } from '../dist/browser/hosted-transport.js';
import { browserPorts, mountScreen } from './browser-host.js';
import '../src/styles/shell.css';
import './preview.css';

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
tokenStyle.textContent = shellTokenStylesheet(proposedDesignTokens);
document.head.append(tokenStyle);

const lobby = document.getElementById('lobby');
const app = document.getElementById('app');
const ports = browserPorts();
const configResponse = await fetch('/preview-config.json', { cache: 'no-store', redirect: 'error', credentials: 'omit' });
if (!configResponse.ok) throw new Error('Hosted preview configuration is unavailable');
const transport = createHostedTransport(await configResponse.json());
const api = createConnectedApi(transport, ports);
const deviceKind = new URLSearchParams(window.location.search).get('as');

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
forget.addEventListener('click', () => {
  resume.clear();
  // And what was kept about it: a request that was not settled, and the identifiers of a command.
  window.sessionStorage.removeItem(UNSETTLED_KEY);
  try {
    ports.unresolved.clear();
  } catch {
    // Storage that cannot be cleared holds identifiers only.
  }
  window.location.reload();
});
function frame(title, ...content) {
  page.replaceChildren(
    el('h1', title),
    el('p', 'V1 playtest preview. Use test matches only. Keep this tab open to retain your session.', { class: 'connected-banner' }),
    ...content,
    statusLine,
    ...(resume.load() === null ? [] : [forget]),
  );
  if (!lobby.contains(page)) lobby.append(page);
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

/**
 * Listens to a document and keeps trying while the rules refuse it, as they do until this
 * identity is admitted. `onRefused` is told each time the server refuses, for a page that
 * has reason to expect otherwise.
 */
function listenPersistently(target, read, onValue, onRefused = () => {}) {
  let stop = () => {};
  let stopped = false;
  let timer = null;
  const start = () => {
    stop = transport.listenDocument(target, {
      onSnapshot: snapshot => {
        if (!snapshot.fresh) return;
        const outcome = read(snapshot.value);
        if (outcome.kind === 'accepted') onValue(outcome.value);
      },
      // A refused listener is dead. It is started again; it is not an empty document.
      onError: reason => {
        if (stopped) return;
        if (reason === 'refused') onRefused();
        timer = window.setTimeout(start, 1_500);
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
        // Refused: there is no view. A read that merely failed says nothing, and is tried again.
        onError: reason => {
          if (reason === 'refused') settle(false);
          else if (!settled) window.setTimeout(read, 1_500);
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
function showMatch(screen, render) {
  if (mounted) return;
  mounted = true;
  for (const stop of lobbyWatchers.splice(0)) stop();
  mountScreen({ container: app, screen, render });
  // The console steps aside once the match itself is on screen.
  const settle = () => {
    if (screen.getFrame().model.screen !== 'connecting') lobby.hidden = true;
  };
  screen.subscribe(settle);
  settle();
  globalThis.mothershipConnected = { ...(globalThis.mothershipConnected ?? {}), frame: () => screen.getFrame() };
}

const ENDED_IN_LOBBY = 'The host ended this match before it started. There is nothing of it to show.';

function chooseDevice(uid) {
  frame('Mothership playtest',
    facts([['This device', uid, 'connected-uid']]),
    el('h2', 'Open this page as'),
    (() => {
      const list = el('ul');
      for (const [name, label] of [['host', 'Host: create a lobby, seat players, start the match'], ['player', 'Player: ask to join with a room code'], ['display', 'Shared display: public information only']]) {
        const item = el('li');
        item.append(el('a', label, { href: `?as=${name}`, id: `connected-as-${name}` }));
        list.append(item);
      }
      return list;
    })(),
    el('p', 'Each tab is its own device with its own identity. Open one tab per player.'),
  );
}

async function host(uid) {
  let state = resume.load();
  if (state?.device !== 'host') state = null;
  if (state === null) {
    const count = el('select', undefined, { id: 'connected-player-count' });
    for (const value of [7, 8, 9]) count.append(el('option', `${value} players`, { value: String(value) }));
    const create = el('button', 'Create lobby', { type: 'button', id: 'connected-create' });
    const label = el('label', 'Players');
    label.append(count);
    frame('Host', facts([['This device', uid, 'connected-uid']]), label, keeping('create', create, [count]));
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
  // Built once and updated in place, so a request that arrives while the host is typing or
  // choosing takes nothing away from under their hands.
  const list = el('ul', undefined, { id: 'connected-requests' });
  const none = el('p', 'None yet. Give the players the room code.', { id: 'connected-no-requests' });
  const rows = new Map();
  const displayUid = el('input', undefined, { type: 'text', id: 'connected-display-uid', autocomplete: 'off', spellcheck: 'false' });
  const displayLabel = el('label', 'Identifier shown on the shared display');
  displayLabel.append(displayUid);
  const admit = el('button', 'Admit the display', { type: 'button', id: 'connected-admit-display' });
  admit.addEventListener('click', () => operate('admit', requestId => ({ protocolVersion: 2, matchId, requestId, displayUid: displayUid.value.trim() }), body => api.admitDisplay(body), 'Admitting the display', { invalid: 'That is not an identifier a display shows.' }));
  const admitControl = keeping('admit', admit, [displayUid]);
  const start = el('button', 'Start the match', { type: 'button', id: 'connected-start' });
  start.addEventListener('click', () => operate('start', requestId => ({ protocolVersion: 2, matchId, requestId }), body => api.startMatch(body), 'Starting the match'));
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
        remove,
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
  frame('Host',
    facts([
      ['This device', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id'], ['Room code', '…', 'connected-room-code'],
      ['Players', '…', 'connected-seated'], ['Status', '…', 'connected-match-status'],
    ]),
    el('h2', 'Requests to join', { id: 'connected-requests-title', tabindex: '-1' }), none, list,
    el('h2', 'Shared display'), displayLabel, admitControl,
    el('h2', 'Start'), startControl,
    el('h2', 'End'), end, endNote, endCancel, endControl,
    el('h2', 'Move a seat to another device', { id: 'connected-recovery-title' }), recoverySeatLabel, recoveryControl, recoveryCodes, recoveryNote,
    el('p', 'Hosting gives no view of anyone’s role. To play, join from another tab with the room code.'),
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
    const open = session?.status === 'lobby';
    const taken = new Set(seats.map(seat => seat.seatId));
    const vacant = playerCount === null ? [] : Array.from({ length: playerCount }, (unused, index) => `seat-${index + 1}`).filter(seatId => !taken.has(seatId));
    setText('connected-room-code', session?.roomCode ?? '…');
    setText('connected-seated', playerCount === null ? '…' : `${seats.length} of ${playerCount} seated`);
    setText('connected-match-status', session?.status ?? '…');
    none.hidden = requests.length > 0;

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
    start.disabled = playerCount === null || seats.length !== playerCount || !open;
    // What the server's own record says settles a request that was still kept: a match that
    // has started needs no start, and one that is over needs no end.
    if (session !== null && session.status !== 'lobby') lifecycle.abandon('start');
    // A match that is over, either way, cannot be ended again.
    const endable = session !== null && (session.status === 'lobby' || session.status === 'running');
    if (session !== null && !endable) lifecycle.abandon('end');
    if (!endable) askingToEnd = false;
    end.hidden = !endable || askingToEnd;
    for (const node of [endNote, endCancel, endControl]) node.hidden = !endable || !askingToEnd;
    // Only a seat that is taken can be moved, and only in a match that is not over.
    const movable = endable ? seats.map(seat => seat.seatId) : [];
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

async function player(uid) {
  let state = resume.load();
  if (state?.device !== 'player' || typeof state.matchId !== 'string' || !MATCH_ID.test(state.matchId)) state = null;
  if (state === null) {
    const code = el('input', undefined, { type: 'text', id: 'connected-room-code-input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '12' });
    const codeLabel = el('label', 'Room code');
    codeLabel.append(code);
    const room = el('select', undefined, { id: 'connected-initial-room' });
    for (const name of ['Room A', 'Room B']) room.append(el('option', name, { value: name }));
    const roomLabel = el('label', 'Where you start');
    roomLabel.append(room);
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
    frame('Player', facts([['This device', uid, 'connected-uid']]), codeLabel, roomLabel, keeping('join', join, [code, room]),
      el('h2', 'Or take over a seat from another device'), recoverMatchLabel, recoverCodeLabel, keeping('recover', recover, [recoverMatch, recoverCode]));
    join.addEventListener('click', async () => {
      const outcome = await operate('join', requestId => ({ protocolVersion: 2, requestId, roomCode: code.value.trim().toUpperCase(), initialRoom: room.value }), request => api.requestAdmission(request), 'Asking to join',
        { invalid: 'A room code is twelve characters, 0 to 9 and A to F.' });
      if (outcome.kind !== 'done') return;
      resume.save({ device: 'player', matchId: outcome.result.matchId, admissionId: outcome.result.admissionId });
      void player(uid);
    });
    return;
  }

  const { matchId, admissionId } = state;
  let seatId = null;
  let shown = null;
  /** Draws the waiting page. It is redrawn only when what it says has changed, so a control on it keeps the keyboard. */
  const draw = (text, ...controls) => {
    const says = `${seatId}/${text}/${controls.length}`;
    if (says === shown) return;
    shown = says;
    frame('Player', facts([['This device', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id'], ['Seat', seatId === null ? 'Not seated yet' : `Player ${seatId.slice(5)}`, 'connected-seat']]),
      el('p', text, { id: 'connected-waiting' }), ...controls);
  };
  const open = () => showMatch(createConnectedPlayerScreen({ transport, matchId, seatId, ports, host: { reload: () => window.location.reload() } }), renderConnectedPlayerShell);
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
        settledByTheServer();
        if (learning) return;
        learning = true;
        draw('This device has taken over a seat. Opening the match…');
        learnSeatAndOpen();
      },
      () => draw(ENDED_IN_LOBBY),
      () => draw(inTheMatch
        ? 'The server does not let this device read the match. If its seat was moved to another device, this one is no longer in it.'
        : 'The server has not given this device a seat in this match. If the request is still on its way this page will find out; otherwise ask the host for a new code and start over.', ...controls()),
      () => {
        // Which seat it is, the seat's own view will say once the match has started.
        settledByTheServer();
        draw('This device has taken over a seat. Waiting for the host to start the match.');
      }));
    return;
  }
  if (admissionId === undefined && /^seat-[1-9]$/.test(state.seatId ?? '')) {
    // This device took over a seat with a recovery code. It has no request of its own to watch.
    seatId = state.seatId;
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
    draw('Seated. Waiting for the host to start the match.');
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
  const waiting = text => frame('Shared display', facts([['This display', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id']]), el('p', text, { id: 'connected-waiting' }));
  waiting('Waiting to be admitted by the host, and for the match to start.');
  // Until the host admits this identity the rules refuse the lobby, so the listener keeps asking.
  lobbyWatchers.push(openOnceStarted(matchId, { kind: 'public-view', matchId },
    () => showMatch(createConnectedTableScreen({ transport, matchId, ports, host: { reload: () => window.location.reload() } }), renderTableShell),
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

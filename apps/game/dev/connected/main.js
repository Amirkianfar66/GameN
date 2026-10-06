// mothership:dev-only
//
// The emulator-connected preview: a development console for the lobby, and the real client
// screens for the match, against the LOCAL Firebase Auth, Firestore and Functions emulators.
//
// What is real here: the Firebase web client, anonymous identities, Security Rules, the
// protocol-2 service, the client core's validation, sessions and command flow, and the same
// phone and table screens the fixture harness shows.
//
// What is not: a deployed project, a designed lobby, or the complete game. The lobby below
// is a plain console written for this preview; designed lobby screens are still to come.
// Nothing here is part of the game client and none of it may be deployed.

import {
  createConnectedApi, createConnectedPlayerScreen, createConnectedTableScreen, readAdmission, readHostSession, readLobby, shellTokenStylesheet,
} from '@mothership/game';
import { renderConnectedPlayerShell, renderTableShell } from '@mothership/presentation';
import { proposedDesignTokens } from '@mothership/design-tokens';
import { createEmulatorTransport } from '../../dist/browser/firebase-transport.js';
import { browserPorts, mountScreen } from '../harness/host.js';
import '../../src/styles/shell.css';
import './connected.css';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

// The fixed loopback ports of infra/firebase/firebase.json. The page reaches the emulators
// under the name it was itself opened with: a browser allows six connections to one host and
// every tab keeps one open to Firestore, so tabs opened as 127.0.0.1 and tabs opened as
// localhost do not use up one another's.
const loopback = window.location.hostname === 'localhost' ? 'localhost' : '127.0.0.1';
const EMULATORS = { projectId: 'demo-mothership', authOrigin: `http://${loopback}:9199`, firestoreHost: loopback, firestorePort: 8180, functionsOrigin: `http://${loopback}:5101` };

// What this page keeps across a reload, per tab: which kind of device it is and the
// identifiers of its match and its own admission request. Nothing of the game: no role,
// target, view or payload. ("Role" is the game's word, so it is not used for the device.) The
// sign-in credential is kept separately by the Firebase client, also per tab (PROVISIONAL,
// adoption assessment G4), and the client core keeps the identifiers of one unresolved command.
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
const transport = createEmulatorTransport({ ...EMULATORS, credentialPersistence: 'session' });
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
  window.location.reload();
});
function frame(title, ...content) {
  page.replaceChildren(
    el('h1', title),
    el('p', 'Local emulator. A development backend on this machine, not a live match. This lobby is a development console, not a designed screen.', { class: 'connected-banner' }),
    ...content,
    statusLine,
    ...(resume.load() === null ? [] : [forget]),
  );
  if (!lobby.contains(page)) lobby.append(page);
}

// One lifecycle operation at a time per key. If no answer arrives, the very same request,
// with the same identifier, is what goes again on the next press: the service then returns
// the original result instead of doing the thing twice.
const unanswered = new Map();
const inFlight = new Set();
async function operate(key, build, call, what, invalid = 'That is not a request this page can send.') {
  // A second press while the first is still on its way sends nothing.
  if (inFlight.has(key)) return null;
  const request = unanswered.get(key) ?? build(ports.ids.next());
  unanswered.set(key, request);
  inFlight.add(key);
  say(`${what}…`);
  let result;
  try {
    result = await call(request);
  } catch {
    // The client core refused to send it: it is not a request the protocol allows. Nothing left this page.
    unanswered.delete(key);
    say(invalid, 'problem');
    return null;
  } finally {
    inFlight.delete(key);
  }
  if (result.kind === 'done') {
    unanswered.delete(key);
    say(`${what}: done.`);
    return result.result;
  }
  if (result.kind === 'api-failure') {
    // A refusal settles this request, and a new press is a new one. "Unavailable" and "slow
    // down" settle nothing: the same request, with the same identifier, is what goes again.
    const unsettled = result.code === 'UNAVAILABLE' || result.code === 'RATE_LIMITED';
    if (!unsettled) unanswered.delete(key);
    const wait = result.retryAfterMs === null ? '' : ` Wait ${Math.ceil(result.retryAfterMs / 1000)} s first.`;
    say(unsettled ? `${what}: not done (${result.code}).${wait} Press again to send the same request again.` : `${what}: refused by the server (${result.code}).`, 'problem');
    return null;
  }
  say(`${what}: no answer. Press again to send the same request again.`, 'problem');
  return null;
}

/** Listens to a document and keeps trying while the rules refuse it, as they do until this identity is admitted. */
function listenPersistently(target, read, onValue) {
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
      onError: () => {
        if (!stopped) timer = window.setTimeout(start, 1_500);
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
 * page then says so through `endedInLobby` and opens nothing.
 */
function openOnceStarted(matchId, viewTarget, open, endedInLobby) {
  let asked = false;
  return listenPersistently({ kind: 'lobby', matchId }, payload => readLobby(payload, matchId), view => {
    if (view.status === 'lobby') return;
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
    stop = transport.listenDocument(viewTarget, {
      onSnapshot: snapshot => {
        if (snapshot.fresh) settle(snapshot.value !== null);
      },
      onError: () => settle(false),
    });
    if (settled) stop();
  });
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
  frame('Emulator-connected preview',
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
    frame('Host', facts([['This device', uid, 'connected-uid']]), label, create);
    create.addEventListener('click', async () => {
      const created = await operate('create', requestId => ({ protocolVersion: 2, requestId, playerCount: Number(count.value) }), request => api.createMatch(request), 'Creating the lobby');
      if (created === null) return;
      resume.save({ device: 'host', matchId: created.matchId });
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
  admit.addEventListener('click', () => operate('admit', requestId => ({ protocolVersion: 2, matchId, requestId, displayUid: displayUid.value.trim() }), body => api.admitDisplay(body), 'Admitting the display', 'That is not an identifier a display shows.'));
  const start = el('button', 'Start the match', { type: 'button', id: 'connected-start' });
  start.addEventListener('click', () => operate('start', requestId => ({ protocolVersion: 2, matchId, requestId }), body => api.startMatch(body), 'Starting the match'));
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
    const done = await operate('end', requestId => ({ protocolVersion: 2, matchId, requestId }), body => api.abortMatch(body), 'Ending the match');
    if (done === null) return;
    askingToEnd = false;
    draw();
  });
  frame('Host',
    facts([
      ['This device', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id'], ['Room code', '…', 'connected-room-code'],
      ['Players', '…', 'connected-seated'], ['Status', '…', 'connected-match-status'],
    ]),
    el('h2', 'Requests to join', { id: 'connected-requests-title', tabindex: '-1' }), none, list,
    el('h2', 'Shared display'), displayLabel, admit,
    el('h2', 'Start'), start,
    el('h2', 'End'), end, endNote, endCancel, endConfirm,
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
    item.append(text, seat, approve);
    list.append(item);
    entry = { item, text, seat, approve };
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
      const { item, text, seat, approve } = row(request);
      // The first characters of the device's identifier, as that device shows it, tell two requests apart.
      const who = `Device ${request.admission.uid.slice(0, 6)}`;
      if (request.admission.status === 'approved') {
        const hadFocus = item.contains(document.activeElement);
        item.dataset.status = 'approved';
        text.textContent = `${who}: seated as Player ${request.admission.seatId.slice(5)}, starting in ${request.admission.initialRoom}`;
        seat.remove();
        approve.remove();
        // The control that was just used is gone; the keyboard goes on to the next thing to do.
        if (hadFocus) (list.querySelector('button[data-approve]:not([disabled])') ?? (start.disabled ? document.getElementById('connected-requests-title') : start)).focus();
        continue;
      }
      item.dataset.status = 'pending';
      text.textContent = `${who} asks to join, starting in ${request.admission.initialRoom}`;
      const chosen = vacant.includes(seat.value) ? seat.value : vacant[0];
      if ([...seat.options].map(option => option.value).join() !== vacant.join()) seat.replaceChildren(...vacant.map(seatId => el('option', `Player ${seatId.slice(5)}`, { value: seatId })));
      if (chosen !== undefined) seat.value = chosen;
      approve.disabled = vacant.length === 0 || !open;
    }
    start.disabled = playerCount === null || seats.length !== playerCount || !open;
    // A match that is over, either way, cannot be ended again.
    const endable = session !== null && (session.status === 'lobby' || session.status === 'running');
    if (!endable) askingToEnd = false;
    end.hidden = !endable || askingToEnd;
    for (const node of [endNote, endCancel, endConfirm]) node.hidden = !endable || !askingToEnd;
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

async function player(uid) {
  let state = resume.load();
  if (state?.device !== 'player') state = null;
  if (state === null) {
    const code = el('input', undefined, { type: 'text', id: 'connected-room-code-input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '12' });
    const codeLabel = el('label', 'Room code');
    codeLabel.append(code);
    const room = el('select', undefined, { id: 'connected-initial-room' });
    for (const name of ['Room A', 'Room B']) room.append(el('option', name, { value: name }));
    const roomLabel = el('label', 'Where you start');
    roomLabel.append(room);
    const join = el('button', 'Ask to join', { type: 'button', id: 'connected-join' });
    frame('Player', facts([['This device', uid, 'connected-uid']]), codeLabel, roomLabel, join);
    join.addEventListener('click', async () => {
      const requested = await operate('join', requestId => ({ protocolVersion: 2, requestId, roomCode: code.value.trim().toUpperCase(), initialRoom: room.value }), request => api.requestAdmission(request), 'Asking to join',
        'A room code is twelve characters, 0 to 9 and A to F.');
      if (requested === null) return;
      resume.save({ device: 'player', matchId: requested.matchId, admissionId: requested.admissionId });
      void player(uid);
    });
    return;
  }

  const { matchId, admissionId } = state;
  let seatId = null;
  const draw = text => frame('Player', facts([['This device', uid, 'connected-uid'], ['Match', matchId, 'connected-match-id'], ['Seat', seatId === null ? 'Not seated yet' : `Player ${seatId.slice(5)}`, 'connected-seat']]), el('p', text, { id: 'connected-waiting' }));
  draw('Waiting for the host to seat you.');
  let watchingLobby = false;
  lobbyWatchers.push(listenPersistently({ kind: 'admission', matchId, admissionId }, readAdmission, admission => {
    if (admission.status !== 'approved' || watchingLobby) return;
    watchingLobby = true;
    seatId = admission.seatId;
    draw('Seated. Waiting for the host to start the match.');
    // The private view does not exist before the start, and a listener on it is refused,
    // not empty. So the lobby is watched, and the match is opened once it is running.
    lobbyWatchers.push(openOnceStarted(matchId, { kind: 'player-view', matchId },
      () => showMatch(createConnectedPlayerScreen({ transport, matchId, seatId, ports, host: { reload: () => window.location.reload() } }), renderConnectedPlayerShell),
      () => draw(ENDED_IN_LOBBY)));
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

frame('Emulator-connected preview', el('p', 'Signing in…'));
try {
  const uid = await transport.signIn();
  globalThis.mothershipConnected = { as: deviceKind, uid, resume: () => resume.load() };
  if (deviceKind === 'host') await host(uid);
  else if (deviceKind === 'player') await player(uid);
  else if (deviceKind === 'display') await display(uid);
  else chooseDevice(uid);
} catch {
  frame('Emulator-connected preview', el('p', 'Could not sign in. Are the local emulators running? See apps/game/dev/connected/README.md.', { id: 'connected-signin-failed' }));
}

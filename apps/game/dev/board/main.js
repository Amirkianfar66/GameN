// mothership:dev-only
//
// Board simulation: the release's own player (or display) screen, controller, host, styles
// and art, fed synthetic views by a scripted in-page transport instead of a backend. It
// exercises layout, focus, targets, the strip and motion in a browser. It is not an engine,
// applies no rule, proves nothing about multiplayer behavior and is never deployed.
//
//   ?scenario=<id from scenarios.mjs>   which synthetic match to show (default: spread)
//   ?as=display                         the shared display instead of the player's phone
//   ?answer=accept|reject|hang|lost     how the scripted desk answers a command (default: accept)
//   ?latency=<ms>                       how long it takes to answer (default: 450)
//   ?motion=reduced                     start with the in-app reduced-motion setting
//   ?time-left=<ms>                     start near the end of the same 60-second turn
//   ?hold-move                         keep an accepted Move awaiting its public view
//   ?kit=off                           without the Designer's ability kit, as the hosted build draws the file today

import { createComicFeeds, createConnectedPlayerScreen, createConnectedTableScreen, shellTokenStylesheet } from '@mothership/game';
import { nextDesignTokens } from '@mothership/design-tokens';
import { FullReceiptSchema, FullPlayerViewSchema, FullPublicViewSchema } from '@mothership/contracts';
import { renderComicPlayerShell, renderComicTableShell } from '@mothership/presentation';
import '../../src/styles/shell.css';
import '../../hosted/preview.css';
import '../../hosted/comic-tokens.css';
import '../../hosted/comic.css';
import '../../hosted/comic-layout.css';
import '../../hosted/setup.css';
import '../../hosted/phone.css';
import '../../hosted/compact-phone.css';
import '../../hosted/board-play.css';
import '../../hosted/private-card.css';
import '../../hosted/scene-board.css';
import '../../hosted/ability-art.css';
import '../../hosted/phone-feedback.css';
import '../../hosted/phase-feedback.css';
import { browserPorts, mountScreen } from '../../hosted/browser-host.js';
import { loadArt } from '../../hosted/art.mjs';
import { identities, MATCH, ownAcknowledgments, playerView, publicView, SCENARIOS } from './scenarios.mjs';

globalThis[Symbol.for('mothership:dev-only')] = true;

const params = new URLSearchParams(window.location.search);
const id = params.get('scenario') ?? 'spread';
const definition = SCENARIOS[id];
const display = params.get('as') === 'display';
const latency = Number(params.get('latency') ?? 450);
const self = `seat-${definition?.self ?? 3}`;

const tokenStyle = document.createElement('style');
tokenStyle.textContent = shellTokenStylesheet(nextDesignTokens);
document.head.append(tokenStyle);
document.body.dataset.device = display ? 'display' : 'player';
await loadArt(display ? 'display' : 'player', document, { abilities: params.get('kit') !== 'off', scenes: params.get('scenes') !== 'off' });

const app = document.getElementById('app');
if (!definition) throw new Error(`Unknown scenario ${id}`);

/** What the scripted desk did, for the capture script to read. Synthetic data only. */
const log = [];
// The scenario factory already places the turn 18 seconds in (42 seconds remaining).
// Shift that sample, retaining the full 60-second window and the original default.
const timeLeft = Math.min(60_000, Math.max(1_000, Number(params.get('time-left') ?? 42_000)));
const phaseStart = params.has('phase-start') ? Number(params.get('phase-start')) : null;
if (phaseStart !== null && (!Number.isSafeInteger(phaseStart) || phaseStart <= 0)) throw new Error('Invalid fixed fixture phase start');
const started = phaseStart ?? Date.now() - (42_000 - timeLeft);
let revision = 1;
let awaitingResult = params.has('await-result'), resultStarted = started;
let moved = null;
const publicOverrides = new Map();
let deadlineExpired = false, terminal = null;
const listeners = new Map();
const viewFor = () => {
  const view = display ? publicView(definition, resultStarted, revision, moved) : playerView(definition, resultStarted, revision, moved);
  if (awaitingResult && definition.voteResult) {
    view.phase = { id: 'fixture-vote-open', kind: definition.voteResult.kind, startedAt: started, endsAt: started + 60000 };
    view.voteResult = null; view.lastTally = null;
  }
  for (const seat of view.seats) Object.assign(seat, publicOverrides.get(seat.seatId) ?? {});
  if (deadlineExpired) {
    const duration = view.phase.endsAt - view.phase.startedAt;
    view.phase.endsAt = Date.now() - 1; view.phase.startedAt = view.phase.endsAt - duration;
    if (view.voteResult) { view.voteResult.startedAt = view.phase.startedAt; view.voteResult.endsAt = view.phase.endsAt; }
  }
  if (terminal) {
    view.phase = { id: `phase-${terminal}`, kind: terminal === 'finished' ? 'FINISHED' : 'ABORTED', startedAt: view.phase.startedAt, endsAt: null };
    view.activeSeatId = null;
    view.ballot = { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null };
    if ('voteResult' in view) view.voteResult = null;
    if (terminal === 'finished') {
      const roles = ['Insider', 'Cracker', 'Officer', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
      view.result = { winner: 'Blue', alienCoWinner: true };
      view.endReveal = { roles: view.seats.map((seat, index) => ({ seatId: seat.seatId, role: roles[index] })), code: ['seat-1', 'seat-2', 'seat-4', 'seat-9'] };
    }
    if (!display) { view.self.movementDestinations = []; view.legalTargets = {}; for (const key of ['releaseVoteAvailable','shotAvailable','disablerAvailable','hackAvailable','scanAvailable','codeAttemptAvailable']) view.self[key] = false; }
  }
  return (display ? FullPublicViewSchema : FullPlayerViewSchema).parse(view);
};
const documents = {
  'player-view': () => (display ? null : viewFor()),
  'public-view': () => (display ? viewFor() : null),
  identities: () => identities(definition),
  'practice-bots': () => null,
  'seat-session': () => null,
  'own-acknowledgments': () => null,
};
function publish(kind, fresh = true) {
  for (const listener of listeners.get(kind) ?? []) listener.onSnapshot({ value: structuredClone(documents[kind]?.() ?? null), fresh });
}
const receipts = new Map();
let receiptAvailable = params.get('answer') !== 'lost';
const operations = [];
const transport = {
  mode: 'emulator',
  currentUid: () => 'simulation-uid',
  signIn: async () => 'simulation-uid',
  async post(operation, body) {
    if (operation === 'v1ServerTime') return { protocolVersion: 2, serverTimeMs: Date.now() };
    if (operation === 'v1Command') {
      log.push({ at: Date.now() - started, commandId: body.commandId, command: body.command });
      operations.push({ operation, commandId: body.commandId });
      const answer = params.get('answer') ?? 'accept';
      if (answer === 'hang') return new Promise(() => {});
      await new Promise(resolve => setTimeout(resolve, latency));
      const receipt = { protocolVersion: 2, matchId: MATCH, phaseId: body.phaseId, commandId: body.commandId,
        ...(answer === 'reject' ? { status: 'rejected', code: 'NOT_ALLOWED' } : { status: 'accepted', code: 'REGISTERED' }) };
      receipts.set(body.commandId, receipt);
      // A move the desk accepts is public at once: the next view has the player in the room asked for.
      if (answer !== 'reject' && body.command.type === 'MOVE' && !params.has('hold-move')) setTimeout(() => window.__simulation.move(body.command.destination), 60);
      if (answer === 'lost') return { ok: false, serverTimeMs: Date.now(), error: { code: 'UNAVAILABLE' } };
      return { ok: true, serverTimeMs: Date.now(), receipt };
    }
    if (operation === 'v1Receipt') {
      operations.push({ operation, commandId: body.commandId });
      if (receiptAvailable && receipts.has(body.commandId)) return { status: 'found', serverTimeMs: Date.now(), receipt: receipts.get(body.commandId) };
    }
    return { ok: false, serverTimeMs: Date.now(), error: { code: 'UNAVAILABLE' } };
  },
  listenDocument(target, listener) {
    if (!listeners.has(target.kind)) listeners.set(target.kind, new Set());
    listeners.get(target.kind).add(listener);
    setTimeout(() => listener.onSnapshot({ value: structuredClone(documents[target.kind]?.() ?? null), fresh: true }), 20);
    return () => listeners.get(target.kind).delete(listener);
  },
  listenCollection: () => () => {},
};

const ports = browserPorts();
const screen = display
  ? createConnectedTableScreen({ transport, matchId: MATCH, ports, host: { reload: () => window.location.reload() } })
  : createConnectedPlayerScreen({ transport, matchId: MATCH, seatId: self, ports, host: { reload: () => window.location.reload() } });
const feeds = createComicFeeds({ transport, ports, matchId: MATCH, ...(display ? {} : { seatId: self }) });
let frameCount = 0;
const stopCounting = screen.subscribe(() => { frameCount += 1; });
const render = display ? renderComicTableShell : renderComicPlayerShell;
await transport.signIn();
const unmount = mountScreen({ container: app, screen, render: (model, phone) => render(model, { ...phone, identities: feeds.identities()?.seats ?? [], practice: null, acknowledgments: display || model.connection !== 'live' ? null : ownAcknowledgments(definition) }),
  subscribeExtra: listener => feeds.subscribe(listener), onDispose: () => { stopCounting(); feeds.dispose(); } });
feeds.start();
if (params.get('motion') === 'reduced') screen.dispatch({ type: 'settings/reduce-motion', checked: true });

window.__simulation = {
  scenario: id, title: definition.title, log, operations,
  get frames() { return frameCount; }, // Actual screen emissions, not DOM mutation/animation guesses.
  /** Synthetic server closes the vote; the consumer still only reads its next snapshot. */
  showResult() { awaitingResult = false; resultStarted = Date.now(); revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** The public update a server would send: the player's own seat in another room. */
  move(destination) { moved = destination; revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** Synthetic public updates for motion/resize regressions; parsed again before publication. */
  publicSeat(n, fields) { publicOverrides.set(`seat-${n}`, { ...(publicOverrides.get(`seat-${n}`) ?? {}), ...fields }); revision += 1; publish(display ? 'public-view' : 'player-view'); },
  motion(reduced) { screen.dispatch({ type: 'settings/reduce-motion', checked: reduced }); },
  expire() { deadlineExpired = true; revision += 1; publish(display ? 'public-view' : 'player-view'); },
  end(kind = 'finished') { terminal = kind; revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** The same view again, as a fresh snapshot. */
  redeliver() { revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** The view as a cache would serve it: not confirmed by the server. */
  stale() { publish(display ? 'public-view' : 'player-view', false); },
  /** Resume the synthetic receipt desk. A capture may restore its recorded receipt after reload,
   * into this desk's memory only; the actual client persists only reconciliation identifiers. */
  recover(receipt = null) {
    if (receipt !== null) { const checked = FullReceiptSchema.parse(receipt); receipts.set(checked.commandId, checked); }
    receiptAvailable = true;
  },
  /** The synthetic desk's receipt, for a driver to hold outside the browser across reload. */
  receipt() { return [...receipts.values()][0] ?? null; },
  dispose() { unmount(); },
};

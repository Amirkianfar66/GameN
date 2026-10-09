// mothership:dev-only
//
// Board simulation: the release's own player (or display) screen, controller, host, styles
// and art, fed synthetic views by a scripted in-page transport instead of a backend. It
// exercises layout, focus, targets, the strip and motion in a browser. It is not an engine,
// applies no rule, proves nothing about multiplayer behavior and is never deployed.
//
//   ?scenario=<id from scenarios.mjs>   which synthetic match to show (default: spread)
//   ?as=display                         the shared display instead of the player's phone
//   ?answer=accept|reject|hang          how the scripted desk answers a command (default: accept)
//   ?latency=<ms>                       how long it takes to answer (default: 450)
//   ?motion=reduced                     start with the in-app reduced-motion setting

import { createComicFeeds, createConnectedPlayerScreen, createConnectedTableScreen, shellTokenStylesheet } from '@mothership/game';
import { nextDesignTokens } from '@mothership/design-tokens';
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
import { browserPorts, mountScreen } from '../../hosted/browser-host.js';
import { loadArt } from '../../hosted/art.mjs';
import { identities, MATCH, playerView, publicView, SCENARIOS } from './scenarios.mjs';

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
await loadArt(display ? 'display' : 'player');

const app = document.getElementById('app');
if (!definition) throw new Error(`Unknown scenario ${id}`);

/** What the scripted desk did, for the capture script to read. Synthetic data only. */
const log = [];
const started = Date.now();
let revision = 1;
let moved = null;
const listeners = new Map();
const viewFor = () => (display ? publicView(definition, started, revision, moved) : playerView(definition, started, revision, moved));
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
const transport = {
  mode: 'emulator',
  currentUid: () => 'simulation-uid',
  signIn: async () => 'simulation-uid',
  async post(operation, body) {
    if (operation === 'v1ServerTime') return { protocolVersion: 2, serverTimeMs: Date.now() };
    if (operation === 'v1Command') {
      log.push({ at: Date.now() - started, command: body.command });
      const answer = params.get('answer') ?? 'accept';
      if (answer === 'hang') return new Promise(() => {});
      await new Promise(resolve => setTimeout(resolve, latency));
      const receipt = { protocolVersion: 2, matchId: MATCH, phaseId: body.phaseId, commandId: body.commandId,
        ...(answer === 'reject' ? { status: 'rejected', code: 'NOT_ALLOWED' } : { status: 'accepted', code: 'REGISTERED' }) };
      receipts.set(body.commandId, receipt);
      // A move the desk accepts is public at once: the next view has the player in the room asked for.
      if (answer !== 'reject' && body.command.type === 'MOVE') setTimeout(() => window.__simulation.move(body.command.destination), 60);
      return { ok: true, serverTimeMs: Date.now(), receipt };
    }
    if (operation === 'v1Receipt' && receipts.has(body.commandId)) return { ok: true, serverTimeMs: Date.now(), receipt: receipts.get(body.commandId) };
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
const render = display ? renderComicTableShell : renderComicPlayerShell;
await transport.signIn();
mountScreen({ container: app, screen, render: (model, phone) => render(model, { ...phone, identities: feeds.identities()?.seats ?? [], practice: null, acknowledgments: null }),
  subscribeExtra: listener => feeds.subscribe(listener), onDispose: () => feeds.dispose() });
feeds.start();
if (params.get('motion') === 'reduced') screen.dispatch({ type: 'settings/reduce-motion', checked: true });

window.__simulation = {
  scenario: id, title: definition.title, log,
  /** The public update a server would send: the player's own seat in another room. */
  move(destination) { moved = destination; revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** The same view again, as a fresh snapshot. */
  redeliver() { revision += 1; publish(display ? 'public-view' : 'player-view'); },
  /** The view as a cache would serve it: not confirmed by the server. */
  stale() { publish(display ? 'public-view' : 'player-view', false); },
};

globalThis[Symbol.for('mothership:dev-only')]=true;

import {createPlanetController, createPlanetSession} from '@mothership/game';
import {postHostedPlanetRequest} from '../../../dist/browser/planet-request.js';
import {loadArt} from '../../../hosted/art.mjs';
import {setCrewPictureSurface} from '../../../hosted/crew-runtime.mjs';
import {mountPlanetRenderer} from '../../../hosted/planet/render.mjs';
import {mountFoodApp} from '../../../hosted/planet/food-app.mjs';
import {createFoodAssets} from '../../../hosted/planet/food-assets.mjs';
import {createPlanetPreferences} from '../../../hosted/planet/preferences.mjs';
import {PLANET_LIBRARY_MEDIA} from '../../../hosted/planet/library-assets.mjs';
import {observeFoodTrial} from './observe.mjs';
import {createFoodPushSession} from './push.mjs';
import '../../../hosted/comic-tokens.css';
import '../../../hosted/comic.css';
import '../../../hosted/comic-layout.css';
import '../../../hosted/claude-phone-kit.css';
import '../../../hosted/board-v2.css';
import '../../../hosted/planet/planet.css';
import '../../../hosted/crew-runtime.css';
import '../../../hosted/planet/phone.css';

const root = document.getElementById('planet-root');
try { await start(); }
catch {
  root.textContent = 'Food trial unavailable. Open the local trial link for this test seat.';
  root.dataset.trial = 'unavailable';
}

async function start() {
  if (location.protocol !== 'http:' || location.hostname !== '127.0.0.1' || !location.port) throw Error('Loopback only');
  const ticket = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{32}$/.test(ticket)) throw Error('Trial seat capability required');
  const headers = {authorization: 'Bearer ' + ticket, 'content-type': 'application/json'};
  async function request(route, value = null, signal) {
    const init = {headers, credentials: 'omit', cache: 'no-store', redirect: 'error', signal};
    if (value !== null) Object.assign(init, {method: 'POST', body: JSON.stringify(value)});
    const response = await fetch('/trial/' + route, init);
    if (!response.ok) throw Object.assign(Error('Food trial transport'), {authorization: response.status === 403});
    return route === 'frames' ? response : response.json();
  }
  const binding = await request('binding');
  const preferences = createPlanetPreferences(document), assets = createFoodAssets(document);
  const artReady = Promise.all([loadArt('player', document), assets.load(), document.fonts.ready]);
  root.dataset.trial = 'waiting';
  root.textContent = 'Waiting for the local Food trial to start.';
  window.foodCoordinatorTrial = {artReady};
  const start = await request('start');
  if (!start.started) throw Error('Local trial closed');
  root.replaceChildren();
  const scope = JSON.stringify([binding.arm, binding.matchId, binding.seatId, binding.uid]);
  const storage = name => {
    const key = 'food-coordinator-trial:' + name + ':' + scope;
    return {load: () => sessionStorage.getItem(key), save: value => sessionStorage.setItem(key, value),
      clear: () => sessionStorage.removeItem(key)};
  };
  const ports = {clock: {now: () => performance.now()}, ids: {next: () => crypto.randomUUID()}, unresolved: storage('ordinary'),
    scheduler: {setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: value => window.clearTimeout(value)}};
  const visible = () => document.visibilityState === 'visible' && document.hasFocus();
  const session = binding.arm === 'push'
    ? createFoodPushSession({binding, ports, request, identities: binding.identities})
    : await startBaseline(binding, ports, storage, ticket, visible());
  const ordinaryTransport = session.gameTransport('player');
  session.setVisible(visible());

  // Both trial arms mount the same installed Food controller and Designer
  // renderer with the same surrounding Planet board. Only the feed ports vary.
  const observation = observeFoodTrial(root, binding);
  const game = createPlanetController(ordinaryTransport, ports, {matchId: binding.matchId, surface: 'player'});
  let food;
  root.classList.add('planet-container');
  const gameRoot = document.createElement('div');
  root.append(gameRoot);
  const renderer = mountPlanetRenderer(gameRoot, game, {cinematics: PLANET_LIBRARY_MEDIA,
    settings: parent => preferences.controls(parent), food: {openTasks: () => food?.openTasks()}});
  const observeTransport = {...ordinaryTransport, listen(audience, listener) {
    return ordinaryTransport.listen(audience, {
      snapshot(packet) {
        setCrewPictureSurface(root, packet.food?.publicView.versions);
        observation.project(packet, session.frameMetadata?.(packet), listener.snapshot);
      },
      error(kind) { observation.invalidate(); listener.error(kind); },
    });
  }};
  food = mountFoodApp(gameRoot, {session: {foodTransport: () => observation.wrapFoodTransport(session.foodTransport())},
    game, transport: observeTransport, binding, ports, recovery: storage('food'), assets,
    preferences: preferences.get, renderer});
  observation.attach(food.controller);
  const refresh = game.subscribe(() => food.refresh());
  const syncVisibility = () => setVisible(visible());
  const onBlur = () => setVisible(false);
  function setVisible(value) {
    // Native Food sends its causal UP before authority delivery is suspended.
    food.setVisible(value);
    session.setVisible(value);
  }
  setVisible(visible());
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('focus', syncVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pagehide', onBlur);
  await game.start();
  root.dataset.trial = 'ready';
  window.foodCoordinatorTrial = {
    artReady,
    report: () => ({arm: binding.arm, variant: binding.variant ?? null, backendSource: binding.backendSource ?? null,
      ...observation.report(), delivery: session.report?.() ?? null}),
    dispose() {
      setVisible(false);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', syncVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onBlur);
      refresh();
      observation.dispose();
      food.dispose();
      game.dispose();
      renderer.dispose();
      preferences.dispose();
      assets.dispose();
      session.dispose();
      root.replaceChildren();
    },
  };
}

async function startBaseline(binding, ports, storage, ticket, visible) {
  const projectId = 'gamen-mothership-staging', key = 'loopback-diagnostic-key', messagingSenderId = '100000000001';
  const config = {projectId, apiKey: key, appId: '1:' + messagingSenderId + ':web:local',
    messagingSenderId, authDomain: projectId + '.firebaseapp.com', pageOrigin: 'https://' + projectId + '.web.app',
    recaptchaEnterpriseSiteKey: key};
  const connection = {
    mode: 'authenticated', currentUid: () => binding.uid, signIn: async () => binding.uid,
    request: value => postHostedPlanetRequest(config, {
      getIdToken: async () => ticket, getAppCheckToken: async () => key,
      fetch: (_url, init) => fetch('/trial/baseline', init),
    }, value, ports),
  };
  const session = createPlanetSession(connection, ports, {resume: storage('resume'), requests: storage('setup')});
  session.setVisible(visible);
  await session.start(binding.matchId);
  if (session.getModel().selfSeatId !== binding.seatId) {
    session.dispose();
    throw Error('Trial baseline binding unavailable');
  }
  return session;
}

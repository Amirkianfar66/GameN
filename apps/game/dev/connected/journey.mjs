// mothership:dev-only
//
// The first connected flow, in a real browser, against the LOCAL Firebase emulators.
//
// A host, a shared display and seven players, each in a browser context of its own (its own
// storage, sign-in and connections, as a separate device would have), drive the
// emulator-connected preview page through one journey. Every step is asserted; the run stops
// at the first one that does not hold.
//
// A second scenario (MOTHERSHIP_JOURNEY=shot) seats nine players and has the Officer
// register a shot on its own turn. It waits for that turn in real 60-second phases, so it
// can take up to about ten minutes. A third (MOTHERSHIP_JOURNEY=roles) follows a whole first
// round of a nine-player match: each role that has an action naming one seat registers it
// on its own turn, and one player requests a Hack. About eleven minutes. A fourth
// (MOTHERSHIP_JOURNEY=votes) plays a seven-player match from its start to the end of its
// second round's Jail vote: a Jail vote, a Captain election that ties and is run again, the
// Captain's release choice and the vote on it. Nobody acts on a turn; every phase is still a
// real 60-second window, so it takes about twenty-one minutes. A fifth
// (MOTHERSHIP_JOURNEY=knowledge) reads what each of seven phones is told in private, checks
// it against what the other phones show, and has the Hacker scan a player on its own turn.
// Up to about eight minutes. A sixth (MOTHERSHIP_JOURNEY=end) has the host end a
// seven-player match: every screen then shows the match as ended by the host, without a
// winner and with nothing revealed. Under a minute.
//
// What this is: the real Firebase web client, real anonymous identities, real Security
// Rules, the real protocol-2 service and its real 60-second phases, in headless Chrome.
// What this is not: phones, a screen reader, people, a deployed project, or a whole match.
// Where a fault is arranged (an answer dropped, the network taken away) it is arranged in the
// browser's own network layer and said so; nothing the backend answers is invented, with one
// labeled exception (an injected "slow down" answer, which the backend cannot be made to give).
//
// Run with the emulators up:  node dev/connected/journey.mjs [evidence directory]
// or all in one:              npm run dev:connected:journey --workspace @mothership/game
// MOTHERSHIP_EVIDENCE_DIR names the evidence directory when no argument can be passed.

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from '../capture/browser.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const ORIGIN = 'http://127.0.0.1:5173';
const HUB = 'http://127.0.0.1:4500/emulators';
const FIRESTORE = '127.0.0.1:8180';
const FUNCTIONS = '127.0.0.1:5101';
const SEVEN_PLAYER_ROLES = ['Alien', 'Blue Disabler', 'Cracker', 'Hacker', 'Insider', 'Supplier', 'Undercover'];
const PHONE = { width: 390, height: 844, scale: 2, mobile: true };
const DESK = { width: 1280, height: 800, scale: 1, mobile: false };
const MATCH = "document.querySelector('.ms-shell[data-screen=\"match\"]')";
/** How long a page gets to load and sign in. Up to ten of them load at once, on whatever else the machine is doing, and the first load after a build is the slowest. */
const PAGE_LOAD_MS = 30_000;

const SCENARIO = ['shot', 'roles', 'votes', 'knowledge', 'end', 'lobby-end'].includes(process.env.MOTHERSHIP_JOURNEY) ? process.env.MOTHERSHIP_JOURNEY : 'movement';
/** Seven players is the journey that was asked for. Nine is the only match with every role, and the smallest with a first-round shot. */
const PLAYERS = ['movement', 'votes', 'knowledge', 'end', 'lobby-end'].includes(SCENARIO) ? 7 : 9;
const WORDS = { 7: 'seven', 9: 'nine' };

const evidence = process.argv[2] ?? process.env.MOTHERSHIP_EVIDENCE_DIR ?? null;
const outDir = evidence ? resolve(evidence) : null;
const started = Date.now();
const log = [];
function note(text) {
  const line = `[${String(((Date.now() - started) / 1000).toFixed(1)).padStart(6)} s] ${text}`;
  log.push(line);
  console.log(line);
}
const facts = { run: { startedAt: new Date(started).toISOString(), origin: ORIGIN, scenario: SCENARIO, players: PLAYERS }, steps: [] };
function established(step, statements) {
  facts.steps.push({ step, statements });
  note(`ESTABLISHED ${step}`);
  for (const statement of statements) note(`  - ${statement}`);
}

async function preview() {
  const answering = await fetch(ORIGIN).then(response => response.text()).catch(() => null);
  if (answering !== null) {
    if (!answering.includes('emulator-connected preview')) throw new Error('Port 5173 is serving something else. The local Functions accept no other origin.');
    return { reused: true, close: async () => {} };
  }
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: fileURLToPath(new URL('./vite.config.mjs', import.meta.url)), logLevel: 'warn' });
  await server.listen();
  return { reused: false, close: () => server.close() };
}

/** Every device of this run, so that the end of the run can ask each how often it was loaded. */
const devices = [];

/** A device: one page in a browser context of its own, with its network watched. */
async function device(browser, label, shape) {
  const page = await openPage(browser, { ...shape, ownContext: true });
  await page.send('Network.enable');
  // How often this script loaded the page. The page counts for itself how often it was loaded.
  let loadsMade = 0;
  const reloadPage = page.reload.bind(page);
  page.reload = (...parameters) => {
    loadsMade += 1;
    return reloadPage(...parameters);
  };
  // Notes when the phase this page shows changes, by the machine's clock, and every line the
  // page puts in a live region, as it is put there (a line leaves the page again after a
  // few seconds). It only reads.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    window.name = String((Number(window.name) || 0) + 1);
    window.__phases = [];
    window.__spoken = [];
    window.__watch = [];
    const watch = what => { window.__watch.push({ what, at: Date.now() }); };
    document.addEventListener('visibilitychange', () => watch('page ' + document.visibilityState));
    window.addEventListener('blur', () => watch('window blurred'));
    window.addEventListener('focus', () => watch('window focused'));
    let lastState = null;
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && node.matches('#ms-live-polite p, #ms-live-assertive p')) window.__spoken.push(node.textContent);
      }
    }).observe(document, { childList: true, subtree: true });
    let last = null;
    setInterval(() => {
      let phase = null;
      try { phase = globalThis.mothershipConnected?.frame?.().model.match?.phase ?? null; } catch { return; }
      const label = phase === null ? null : phase.roundLabel + ', ' + phase.phaseLabel;
      if (label !== null && label !== last) {
        last = label;
        window.__phases.push({ label, at: Date.now() });
      }
      let state = null;
      try {
        const model = globalThis.mothershipConnected.frame().model;
        state = 'connection ' + model.connection + ', timer ' + (model.match?.phase.timer.state ?? 'none') + ', private panel ' + (model.match?.privateArea?.open === true ? 'open' : model.match?.privateArea ? 'closed' : 'absent');
      } catch { return; }
      if (state !== lastState) {
        lastState = state;
        watch(state);
      }
    }, 50);
  })();` });
  // Every interception rule is off until a step turns one on, and so is interception itself.
  // It used to be on for the whole run. With Chrome 155 that now and then left a request
  // that matches none of the patterns below waiting forever: one page's sign-in, or its
  // request to join, or a module it was loading. It was about one run in three, and none in
  // twenty-four with interception off. So requests are intercepted only while a step has a
  // fault arranged, and no longer than that.
  const PATTERNS = [
    { urlPattern: `*${FUNCTIONS}/*/v1Command`, requestStage: 'Request' }, { urlPattern: `*${FUNCTIONS}/*/v1Command`, requestStage: 'Response' },
    { urlPattern: `*${FUNCTIONS}/*/v1Receipt`, requestStage: 'Request' },
  ];
  const faults = { dropCommandAnswer: 0, dropCommandRequest: 0, dropReceiptRequests: false, slowDownOnce: null };
  const anyFault = () => faults.dropCommandAnswer > 0 || faults.dropCommandRequest > 0 || faults.dropReceiptRequests || faults.slowDownOnce !== null;
  let intercepting = false;
  const intercept = () => {
    const wanted = anyFault();
    if (wanted === intercepting) return;
    intercepting = wanted;
    void page.send(wanted ? 'Fetch.enable' : 'Fetch.disable', wanted ? { patterns: PATTERNS } : {}).catch(() => {});
  };
  // Arranging a fault turns interception on at once, ahead of whatever the step does next.
  // It is turned off a moment after the last fault is used up, so that the request the fault
  // was for is dealt with first.
  const fault = new Proxy(faults, {
    set(target, name, value) {
      target[name] = value;
      if (anyFault()) intercept();
      else setTimeout(intercept, 0);
      return true;
    },
  });
  const calls = [];           // Every operation this page sent to Functions, with what came back, in the order sent.
  const listened = new Set(); // Every Firestore path this page asked to listen to.
  const pending = new Map();
  const arranged = new Map(); // What this script did to a request, by its network identifier.
  const postData = async (requestId, request) => request.postData ?? (request.hasPostData ? (await page.send('Network.getRequestPostData', { requestId }).catch(() => ({ postData: '' }))).postData : '');
  const record = call => {
    calls.push(call);
    calls.sort((a, b) => a.at - b.at);
  };

  const stop = browser.on(message => {
    if (message.sessionId !== page.sessionId) return;
    const { method, params } = message;
    if (method === 'Fetch.requestPaused') {
      const operation = params.request.url.split('/').at(-1);
      const answer = params.responseStatusCode !== undefined || params.responseErrorReason !== undefined;
      const go = () => page.send('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {});
      const fail = what => {
        arranged.set(params.networkId, { dropped: what });
        return page.send('Fetch.failRequest', { requestId: params.requestId, errorReason: 'ConnectionAborted' }).catch(() => {});
      };
      if (params.request.method !== 'POST') return void go();
      if (operation === 'v1Command' && !answer && fault.slowDownOnce !== null) {
        // INJECTED, and the only answer in this journey the backend did not give: the backend
        // allows 120 commands a minute and cannot be made to refuse one here.
        const body = JSON.stringify({ ok: false, serverTimeMs: Date.now(), error: { code: 'RATE_LIMITED', retryAfterMs: fault.slowDownOnce } });
        fault.slowDownOnce = null;
        arranged.set(params.networkId, { injected: true });
        return void page.send('Fetch.fulfillRequest', {
          requestId: params.requestId, responseCode: 429, body: Buffer.from(body).toString('base64'),
          responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: ORIGIN }, { name: 'cache-control', value: 'no-store' }],
        }).catch(() => {});
      }
      if (operation === 'v1Command' && !answer && fault.dropCommandRequest > 0) {
        fault.dropCommandRequest -= 1;
        return void fail('request');
      }
      if (operation === 'v1Command' && answer && fault.dropCommandAnswer > 0) {
        fault.dropCommandAnswer -= 1;
        return void fail('answer');
      }
      if (operation === 'v1Receipt' && !answer && fault.dropReceiptRequests) return void fail('request');
      return void go();
    }
    if (method === 'Network.requestWillBeSent') {
      const { request, requestId } = params;
      if (request.method !== 'POST') return;
      if (request.url.includes(FUNCTIONS)) pending.set(requestId, { operation: request.url.split('/').at(-1), at: Date.now(), request: postData(requestId, request).then(text => JSON.parse(text || 'null')).catch(() => null) });
      if (request.url.includes(FIRESTORE)) {
        // The listen channel carries one JSON message per form field. A message that adds a
        // target names the documents, or the parent and the collection, it wants to hear about.
        void postData(requestId, request).then(text => {
          for (const [field, value] of new URLSearchParams(text)) {
            if (!/^req\d+___data__$/.test(field)) continue;
            const target = JSON.parse(value).addTarget;
            if (target === undefined) continue;
            const relative = name => name.replace(/^projects\/demo-mothership\/databases\/\(default\)\/documents\/?/, '');
            for (const name of target.documents?.documents ?? []) listened.add(relative(name));
            if (target.query) listened.add(`${relative(target.query.parent)}/${target.query.structuredQuery.from.map(from => from.collectionId).join('+')}/*`);
          }
        }).catch(error => listened.add(`UNREADABLE LISTEN REQUEST: ${error.message}`));
      }
    }
    if ((method === 'Network.loadingFinished' || method === 'Network.loadingFailed') && pending.has(params.requestId)) {
      const call = pending.get(params.requestId);
      // Why a request ended without an answer, as the browser's network layer says it: cancelled by the page, or failed.
      if (method === 'Network.loadingFailed') arranged.set(params.requestId, { ...(arranged.get(params.requestId) ?? {}), ended: params.canceled ? 'cancelled by the page' : params.errorText });
      const answered = method === 'Network.loadingFinished' ? page.send('Network.getResponseBody', { requestId: params.requestId }).catch(() => null) : null;
      void Promise.all([call.request, answered]).then(([request, body]) => {
        let response = null;
        try { response = body === null ? null : JSON.parse(body.base64Encoded ? Buffer.from(body.body, 'base64').toString() : body.body); } catch { /* not JSON: no answer */ }
        record({ operation: call.operation, at: call.at, tookMs: Date.now() - call.at, request, response, ...(arranged.get(params.requestId) ?? {}) });
        pending.delete(params.requestId);
      });
    }
  });
  /** Every operation that was sent has been answered or has failed, and is in `calls`. */
  async function quiet() {
    for (let waited = 0; pending.size > 0; waited += 50) {
      if (waited > 15_000) throw new Error(`${label}: an operation never finished`);
      await sleep(50);
    }
  }

  const text = selector => page.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
  const exists = selector => page.evaluate(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  const attribute = (selector, name) => page.evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`);
  const made = {
    label, page, fault, calls, listened, text, exists, attribute, stop,
    open(kind, ready) {
      loadsMade += 1;
      return page.goto(`${ORIGIN}/?as=${kind}`, ready, PAGE_LOAD_MS);
    },
    /** How often this script loaded the page, and how often the page says it was loaded. A tab keeps its name across reloads. */
    loads: async () => ({ byThisScript: loadsMade, counted: await page.evaluate('Number(window.name)') }),
    uid: () => page.evaluate('globalThis.mothershipConnected?.uid ?? null'),
    frame: () => page.evaluate('JSON.parse(JSON.stringify(globalThis.mothershipConnected.frame()))'),
    /** Everything this page keeps where it would survive the page: both storages and the names of its databases. */
    stored: () => page.evaluate(`(async () => {
      const databases = {};
      for (const { name } of await indexedDB.databases()) {
        const database = await new Promise((done, failed) => { const open = indexedDB.open(name); open.onsuccess = () => done(open.result); open.onerror = () => failed(open.error); });
        databases[name] = {};
        for (const store of database.objectStoreNames) {
          databases[name][store] = await new Promise((done, failed) => { const all = database.transaction(store).objectStore(store).getAll(); all.onsuccess = () => done(all.result); all.onerror = () => failed(all.error); });
        }
        database.close();
      }
      return {
        session: Object.fromEntries(Object.entries(window.sessionStorage)),
        local: Object.fromEntries(Object.entries(window.localStorage)),
        databases,
        caches: await caches.keys(),
        cookies: document.cookie,
        serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
      };
    })()`),
    quiet,
    /** What this page sent to one operation, once nothing is in flight. */
    async operations(operation) {
      await quiet();
      return calls.filter(call => call.operation === operation);
    },
    async shot(name, options) {
      if (outDir !== null) await page.screenshot(join(outDir, name), options);
    },
  };
  devices.push(made);
  return made;
}

/**
 * No page was loaded by anything but this script. A page that reloads itself loses whatever
 * its player was doing, and every check made on it afterwards is made on another page.
 */
async function noPageReloadedItself() {
  const loads = {};
  for (const who of devices) {
    const { byThisScript, counted } = await who.loads();
    loads[who.label] = counted;
    assert.equal(counted, byThisScript, `${who.label} was loaded ${counted} time(s), and this script loaded it ${byThisScript} time(s)`);
    assert.equal(await who.page.evaluate('window.mothershipHotReloadRefused ?? 0') >= 1, true, `${who.label}: the development server's hot-reload connection was refused`);
  }
  facts.run.pageLoads = loads;
  note('No page was loaded by anything but this script: each tab counted as many loads as the script made, and each refused the development server’s hot-reload connection.');
}

const CARD = '[data-region="action"]';
/** The phase a device shows, and how much of it its own countdown says is left. */
async function phaseOf(who) {
  const phase = (await who.frame()).model.match?.phase ?? null;
  if (phase === null) return null;
  const running = phase.timer.state === 'running';
  const [minutes, seconds] = running ? phase.timer.display.split(':').map(Number) : [0, 0];
  return { label: `${phase.roundLabel}, ${phase.phaseLabel}`, running, remaining: minutes * 60 + seconds };
}
/**
 * Phases are real 60-second windows. A step that must happen inside one waits for the next
 * if too little is left of the current one, so that no step here straddles a phase by accident.
 */
async function roomFor(who, needSeconds) {
  const phase = await phaseOf(who);
  if (phase.running && phase.remaining >= needSeconds) return phase;
  note(`${who.label}: ${phase.remaining} s left of "${phase.label}"; this step needs ${needSeconds} s, so it waits for the next phase.`);
  await who.page.waitFor(`(() => {
    const phase = globalThis.mothershipConnected.frame().model.match?.phase;
    return phase && phase.timer.state === 'running' && phase.roundLabel + ', ' + phase.phaseLabel !== ${JSON.stringify(phase.label)};
  })()`, `${who.label}: the next phase`, 90_000);
  return phaseOf(who);
}
const card = who => who.page.evaluate(`(() => {
  const state = document.querySelector('${CARD}');
  return state === null ? null : { status: state.dataset.status, step: state.dataset.step, text: state.innerText.replace(/\\s+/g, ' ').trim() };
})()`);
const cardIs = (who, status, label, timeoutMs = 15_000) => who.page.waitFor(`document.querySelector('${CARD}')?.dataset.status === ${JSON.stringify(status)}`, `${who.label}: ${label}`, timeoutMs);
const focused = who => who.page.evaluate("document.activeElement?.id || document.activeElement?.tagName || null");
const spoken = who => who.page.evaluate("[...document.querySelectorAll('#ms-live-polite p, #ms-live-assertive p')].map(line => line.textContent)");
/** Every line the page has put in a live region since it was last loaded, including those that have left it again. */
const everSpoken = who => who.page.evaluate('[...window.__spoken]');
/** What the page noted about itself lately: visibility, focus, connection, clock and private panel, each when it changed. */
const lately = async (who, count = 10) => (await who.page.evaluate('window.__watch.slice(-' + count + ')')).map(entry => `${new Date(entry.at).toISOString().slice(14, 23)} ${entry.what}`).join('; ');

async function openPanel(who) {
  if (await who.attribute('#ms-private-toggle', 'aria-expanded') === 'true') return;
  await who.page.tap('#ms-private-toggle');
  await who.page.waitFor("document.querySelector('.ms-role-card') !== null", `${who.label}: the private panel is open`);
}
/** By touch, up to the last step before anything is sent. Returns the destination the server offered and the player chose. */
async function chooseMove(who) {
  await openPanel(who);
  await who.page.waitFor("document.getElementById('ms-action-open-move') !== null", `${who.label}: a move is offered`);
  await who.page.tap('#ms-action-open-move');
  await who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, `${who.label}: destinations are listed`);
  const offered = await who.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => choice.dataset.value)");
  assert.equal(offered.length > 0, true, `${who.label}: the server offers somewhere to go`);
  await who.page.tap('button[data-intent="action/choose"]');
  await who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, `${who.label}: asked to confirm`);
  return offered[0];
}
/** A control that has just appeared is inactive for a moment, so a tap meant for what was there before sends nothing. */
const whenActive = (who, selector) => who.page.waitFor(`document.querySelector(${JSON.stringify(selector)}) !== null && document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-disabled') !== 'true'`, `${who.label}: ${selector} is active`);
async function tapWhenActive(who, selector) {
  await whenActive(who, selector);
  await who.page.tap(selector);
}
/** A picture of the card as it stands, once whatever is appearing has appeared. */
async function cardShot(who, name, control = null) {
  if (control !== null) await whenActive(who, control);
  await sleep(350);
  await who.shot(name, { selector: '[data-action="connected"]' });
}
/** Where the authoritative public view, as the shared display draws it, puts a seat. */
const shownAt = (display, seat) => display.page.evaluate(`(() => {
  const model = globalThis.mothershipConnected.frame().model;
  return model.match.board.zones.flatMap(zone => zone.seats).find(entry => entry.number === ${seat})?.location ?? null;
})()`);
const waitShownAt = (display, seat, location, label) => display.page.waitFor(`(() => {
  const model = globalThis.mothershipConnected.frame().model;
  return model.match?.board.zones.flatMap(zone => zone.seats).find(entry => entry.number === ${seat})?.location === ${JSON.stringify(location)};
})()`, label);
/**
 * Everything a phone shows and holds in its model, apart from the list of what its own seat
 * is told. That list may name other roles, because the server tells that seat about them;
 * nothing else on a phone may. What the list says is checked in the knowledge journey.
 */
const shownApartFromWhatItIsTold = player => player.page.evaluate(`(() => {
  const page = document.body.cloneNode(true);
  for (const told of page.querySelectorAll('[data-region="knowledge"]')) told.remove();
  const model = JSON.stringify(globalThis.mothershipConnected.frame().model, (key, value) => (key === 'knowledge' ? undefined : value));
  return model + ' ' + page.textContent;
})()`);
/** Nothing of a match that is private may be anywhere that outlives the page. */
function assertStored(stored, label, { unresolved, alsoAbsent = [] }) {
  const SIGN_IN = 'firebase:authUser:emulator-only:mothership-emulator-1';
  const expected = [SIGN_IN, 'mothership:connected-resume', ...(unresolved ? ['mothership:unresolved-command'] : [])].sort();
  assert.deepEqual(Object.keys(stored.session).sort(), expected, `${label}: session storage holds the sign-in, which match this tab is in${unresolved ? ', the identifiers of one unresolved command' : ''}, and nothing else`);
  assert.deepEqual([stored.local, stored.caches, stored.cookies, stored.serviceWorkers], [{}, [], '', 0], `${label}: nothing in local storage, the cache store or cookies, and no service worker`);
  assert.deepEqual(Object.keys(stored.databases), ['firebase-heartbeat-database'], `${label}: the one database is the Firebase SDK's own heartbeat record`);
  // The sign-in is the SDK's record of an identity: these fields and no others.
  assert.deepEqual(Object.keys(JSON.parse(stored.session[SIGN_IN])).sort(), ['apiKey', 'appName', 'createdAt', 'emailVerified', 'isAnonymous', 'lastLoginAt', 'providerData', 'stsTokenManager', 'uid']);
  // Everything else that is stored, read as text. (The sign-in is left out: its tokens are random letters.)
  const everything = JSON.stringify({ ...stored, session: { ...stored.session, [SIGN_IN]: null } });
  for (const word of [...SEVEN_PLAYER_ROLES, ...alsoAbsent, 'Room A', 'Room B', 'Command Room', 'Hospital', 'Jail', 'MOVE', 'REGISTER_SHOT', 'destination', 'target', 'role', 'legalTargets', 'knowledge', 'faction']) {
    assert.equal(everything.toLowerCase().includes(word.toLowerCase()), false, `${label}: nothing stored contains "${word}"`);
  }
}

/**
 * The seven-player voting scenario: a match from its start to the end of its second round's
 * Jail vote. Nobody acts on a turn. In the votes the players cast real ballots through the
 * card, and everything said about a count is read from the server's own public view.
 * Every phase is a real 60-second server window that ends only at its deadline.
 */
async function votesScenario({ display, players, seatOf, matchId }) {
  for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
  const [A, B, C, D, E, F, G] = players;
  const seat = who => seatOf.get(who);
  const name = number => `Player ${number}`;
  const names = numbers => [...numbers].sort((a, b) => a - b).map(name).join(', ');
  const everySeat = players.map(seat);
  for (const player of players) await openPanel(player);

  const voteOf = who => who.page.evaluate('JSON.parse(JSON.stringify(globalThis.mothershipConnected.frame().model.match.vote))');
  // Where the display puts a seat and how it marks it. Whose turn it is has nothing to do with a vote, so that marker is left out.
  const seatOnBoard = number => display.page.evaluate(`(() => {
    const found = globalThis.mothershipConnected.frame().model.match.board.zones.flatMap(zone => zone.seats).find(entry => entry.number === ${number});
    return found ? { location: found.location, markers: found.markers.filter(marker => marker.kind !== 'turn').map(marker => marker.label) } : null;
  })()`);
  const offers = who => who.page.evaluate("[...document.querySelectorAll('.ms-offer')].map(offer => [offer.dataset.kind, offer.querySelector('button') !== null])");
  /** The display shows this phase, with the server's time, and (where given) this is what its voting panel says is open. */
  const phaseOpens = (label, current = null, timeoutMs = 100_000) => display.page.waitFor(`(() => {
    const match = globalThis.mothershipConnected.frame().model.match;
    if (!match || match.phase.timer.state !== 'running' || match.phase.roundLabel + ', ' + match.phase.phaseLabel !== ${JSON.stringify(label)}) return false;
    return ${current === null ? 'true' : `JSON.stringify(match.vote?.current ?? null) === ${JSON.stringify(JSON.stringify(current))}`};
  })()`, `the display shows "${label}"`, timeoutMs);
  /** Lines about a ballot, and the ones among them a phone says about its own. */
  const aboutABallot = line => /vote for|voted|recorded|abstention|abstain|requested/i.test(line);
  const itsOwn = line => /^(Your (vote|abstention|choice)|Release vote for .* requested\.|Sending your (ballot|choice))/.test(line);
  /** How often a page has said a sentence. What a page says at one moment is one line, so the sentence is looked for inside each. */
  const timesSaid = async (who, sentence) => (await everSpoken(who)).filter(heard => heard.includes(sentence)).length;

  /** Ballots that were started a second time, each with what the page showed and noted when the first try stopped. */
  const startedAgain = [];
  /**
   * One ballot through the card. By touch unless `keys` is set, in which case only Tab and
   * Enter are used. Returns what the card listed, asked and said, and what was sent.
   *
   * If a try stops before anything was sent, it is started once more and that is recorded
   * with the reason: a choice that is not sent is dropped by design when the page loses
   * its fresh view, its clock or its open panel, and a player would simply choose again.
   * A try that sent something is never repeated.
   */
  async function ballot(who, kind, value, options = {}) {
    try {
      return await tryBallot(who, kind, value, options);
    } catch (error) {
      if (error.nothingSent !== true) throw error;
      startedAgain.push(`${who.label}, ${kind}: ${error.message}`);
      note(`STARTED AGAIN, nothing had been sent: ${error.message}`);
      // Put down whatever is half chosen, as a player would.
      for (let presses = 0; presses < 3 && await who.exists('#ms-action-back'); presses += 1) await who.page.tap('#ms-action-back');
      return tryBallot(who, kind, value, options);
    }
  }
  // The phone waits 8 s for an answer and then asks the server what became of the command,
  // so an acceptance can take longer than that to appear. A phase is 60 s.
  const ACCEPT_WITHIN_MS = 25_000;
  async function tryBallot(who, kind, value, { keys = false, picture = null } = {}) {
    await openPanel(who);
    await who.page.waitFor(`document.getElementById('ms-action-open-${kind}') !== null`, `${who.label}: ${kind} is offered`, 20_000);
    const before = (await who.operations('v1Command')).length;
    const activate = async id => {
      if (keys) {
        await who.page.tabTo(id, 60);
        await who.page.press('Enter');
      } else await who.page.tap(`#${id}`);
    };
    // If a step does not arrive, say what the page showed and what it noted about itself, instead of only that time ran out.
    const reached = (wait, what) => wait.catch(async error => {
      const commands = (await who.operations('v1Command')).slice(before);
      const failure = new Error(`${error.message}. ${who.label} while waiting for ${what}: card ${JSON.stringify(await card(who).catch(() => null))}; focus on ${await focused(who).catch(() => '?')}; `
        + `commands sent ${JSON.stringify(commands.map(call => call.response?.receipt?.status ?? call.response?.error?.code ?? call.dropped ?? 'no answer'))}; lately: ${await lately(who).catch(() => '?')}`);
      failure.nothingSent = commands.length === 0;
      throw failure;
    });
    await activate(`ms-action-open-${kind}`);
    await reached(who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, `${who.label}: the server's choices are listed`), 'the choices');
    const asked = await who.text('#ms-action-step');
    const listed = await who.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => [choice.dataset.value, choice.querySelector('.ms-target__name').textContent])");
    if (picture !== null) await who.shot(`${picture}-choices.png`, { selector: '[data-action="connected"]' });
    await activate(`ms-action-choice-${value}`);
    await reached(who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, `${who.label}: asked to confirm`), 'the question');
    const confirm = (await card(who)).text;
    await reached(whenActive(who, '#ms-action-confirm'), 'the confirm control to become active');
    if (picture !== null) await who.shot(`${picture}-confirm.png`, { selector: '[data-action="connected"]' });
    const confirmedAt = Date.now();
    await activate('ms-action-confirm');
    await reached(cardIs(who, 'accepted', `${kind} is accepted`, ACCEPT_WITHIN_MS), 'the acceptance');
    const shownAfterMs = Date.now() - confirmedAt;
    const said = (await card(who)).text;
    const sent = (await who.operations('v1Command')).slice(before);
    return { asked, listed, confirm, said, sent, shownAfterMs };
  }
  /** The card is put away; the phone then shows its own ballot from the server's view, or (for a release choice) nothing more. */
  async function putAway(who, ownBallot) {
    await tapWhenActive(who, '#ms-action-dismiss');
    await cardIs(who, 'idle', 'the card is put away');
    if (ownBallot === null) return;
    await who.page.waitFor("document.getElementById('ms-own-ballot') !== null", `${who.label}: the server's view states its ballot`);
    assert.equal(await who.text('#ms-own-ballot'), ownBallot, who.label);
  }
  /** Ballots whose command went out more than once, as the identical request, because no answer came within the phone's 8 seconds. */
  const sentAgain = [];
  /**
   * One confirmation made one command, this one, and the server accepted it. If its answer
   * was slower than the phone waits, the phone sends the identical request again and the
   * server answers with the same receipt: that is still one command, and it is recorded.
   */
  const accepted = (result, command) => {
    assert.equal(result.sent.length >= 1, true, 'A command was sent');
    const [call] = result.sent;
    assert.deepEqual(call.request.command, command);
    for (const again of result.sent.slice(1)) assert.deepEqual(again.request, call.request, 'Sent again as the identical request, with the same identifier');
    const receipt = { protocolVersion: 2, matchId, phaseId: call.request.phaseId, commandId: call.request.commandId, status: 'accepted', code: 'REGISTERED' };
    const answered = result.sent.filter(each => each.response !== null);
    assert.equal(answered.length >= 1, true, 'The server answered');
    for (const each of answered) assert.deepEqual(each.response.receipt, receipt, 'Every answer is the one receipt');
    if (result.sent.length > 1) sentAgain.push({ command: command.type, times: result.sent.length, answersTookMs: result.sent.map(each => each.tookMs) });
  };
  /** How long the server took to answer each of a set of ballots cast at the same moment, and how long each phone took to show the acceptance. */
  const timings = results => ({
    answersTookMs: results.flatMap(result => result.sent.map(each => each.tookMs)).sort((a, b) => a - b),
    shownAfterMs: results.map(result => result.shownAfterMs).sort((a, b) => a - b),
  });
  const span = values => `${(Math.min(...values) / 1000).toFixed(1)} to ${(Math.max(...values) / 1000).toFixed(1)} s`;
  const cast = new Map(players.map(player => [player, 0]));
  const count = who => cast.set(who, cast.get(who) + 1);

  // ---------------------------------------------------------------- V1. The first round, with nobody acting
  await phaseOpens('Round 1, Jail vote', null, 9 * 60_000);
  const roundOne = await display.page.evaluate('window.__phases');
  assert.equal(roundOne.filter(phase => /^Round 1, Player \d’s turn$/.test(phase.label)).length, 7, 'Seven turns, one for each seat');
  // How long the display showed each turn after the first, which it joined a moment late.
  const shownFor = roundOne.slice(2).map((phase, index) => (phase.at - roundOne[index + 1].at) / 1000);
  assert.equal(shownFor.every(seconds => seconds >= 59.5 && seconds <= 75), true, `No turn ended before its 60 seconds were up: ${shownFor.join(', ')}`);
  assert.deepEqual((await everSpoken(display)).filter(line => /counted/.test(line)), [], 'No count has been published yet');
  established('V1. A first round with nobody acting (seven players)', [
    `The display followed ${roundOne.length - 1} phases to the Jail vote: ${roundOne.slice(0, -1).map(phase => `"${phase.label.replace('Round 1, ', '')}"`).join(', ')}.`,
    `Nobody did anything, and no phase ended early: the display showed each turn after the first for between ${Math.min(...shownFor).toFixed(1)} and ${Math.max(...shownFor).toFixed(1)} seconds. (The server closes a phase at its 60-second deadline, when a client asks it to look.)`,
    'No Captain exists in a first round, so the server opened no release choice: the Jail vote followed the last turn.',
  ]);

  // ---------------------------------------------------------------- V2. The Jail vote
  const jailed = seat(G);
  const own = seat(F);
  const open = { title: 'Jail vote', lines: [`Can be voted into Jail: ${names(everySeat)}.`, '7 players may vote.'] };
  const publicJailVote = { heading: 'Voting', current: open, lastTally: null };
  assert.deepEqual(await voteOf(display), publicJailVote);
  for (const player of players) {
    await player.page.waitFor("document.getElementById('ms-action-open-vote') !== null", `${player.label}: the vote is offered`, 20_000);
    assert.deepEqual(await voteOf(player), publicJailVote, `${player.label} shows what the display shows`);
    assert.deepEqual(await offers(player), [['move', false], ['shot', false], ['vote', true]], `${player.label}: a vote, and nothing else, can be started`);
  }
  await display.shot('v1-table-display-jail-vote-open.png');

  // One player uses the keyboard alone, one loses the server's answer, one abstains, one votes for itself, one does not vote.
  const byKeys = await ballot(A, 'vote', `seat-${jailed}`, { keys: true });
  count(A);
  assert.equal(byKeys.asked, 'Who do you vote to send to Jail?');
  assert.deepEqual(byKeys.listed, [...[...everySeat].sort((a, b) => a - b).map(number => [`seat-${number}`, number === seat(A) ? `${name(number)} (you)` : name(number)]), ['none', 'Abstain']], 'Every seat the server lists, its own among them, then the abstention');
  assert.match(byKeys.confirm, new RegExp(`Vote to send ${name(jailed)} to Jail\\? This is your one ballot in this vote\\.`));
  accepted(byKeys, { type: 'VOTE', targetSeatId: `seat-${jailed}` });
  assert.match(byKeys.said.replace(/^accepted /i, ''), new RegExp(`^Your vote for ${name(jailed)} is recorded\\. This is not a result\\.`));
  await A.shot('v2-phone-ballot-recorded.png', { selector: '[data-action="connected"]' });

  C.fault.dropCommandAnswer = 1;
  const [votedB, votedC, votedD, abstained, selfVote] = await Promise.all([
    ballot(B, 'vote', `seat-${jailed}`, { picture: 'v3-phone-jail-vote' }), ballot(C, 'vote', `seat-${jailed}`), ballot(D, 'vote', `seat-${jailed}`),
    ballot(E, 'vote', 'none'), ballot(F, 'vote', `seat-${own}`),
  ]);
  for (const who of [B, C, D, E, F]) count(who);
  accepted(votedB, { type: 'VOTE', targetSeatId: `seat-${jailed}` });
  accepted(votedD, { type: 'VOTE', targetSeatId: `seat-${jailed}` });
  // C's answer was dropped in the browser (ARRANGED). The phone asked, and the server had the ballot.
  assert.deepEqual(votedC.sent.map(call => [call.dropped, call.response]), [['answer', null]], 'One ballot left the page; its answer never arrived');
  const lookups = await C.operations('v1Receipt');
  assert.deepEqual([lookups.at(-1).request.commandId, lookups.at(-1).response.status, lookups.at(-1).response.receipt.status], [votedC.sent[0].request.commandId, 'found', 'accepted']);
  assert.deepEqual(votedC.sent[0].request.command, { type: 'VOTE', targetSeatId: `seat-${jailed}` });
  accepted(abstained, { type: 'VOTE', targetSeatId: null });
  assert.match(abstained.confirm, /Abstain from this vote\? This is your one ballot in this vote\./);
  assert.match(abstained.said.replace(/^accepted /i, ''), /^Your abstention is recorded\./);
  accepted(selfVote, { type: 'VOTE', targetSeatId: `seat-${own}` });
  assert.match(selfVote.confirm, /Vote to send yourself to Jail\?/);
  assert.match(selfVote.said.replace(/^accepted /i, ''), /^Your vote for yourself is recorded\./);

  for (const who of [A, B, C, D]) await putAway(who, `Your ballot in this vote: ${name(jailed)}.`);
  await putAway(E, 'Your ballot in this vote: an abstention.');
  await putAway(F, 'Your ballot in this vote: yourself.');
  for (const who of [A, B, C, D, E, F]) assert.deepEqual(await offers(who), [['move', false], ['shot', false]], `${who.label}: the server offers no second ballot`);
  await B.shot('v4-phone-own-ballot.png');

  // A reload: the ballot comes back from the server's view, and from nowhere on the device.
  await D.page.reload(MATCH, 20_000);
  assert.equal(await D.exists('#ms-own-ballot'), false, 'A reloaded page shows nothing private until it is asked to');
  await openPanel(D);
  await D.page.waitFor("document.getElementById('ms-own-ballot') !== null", `${D.label}: its ballot, from the server's view`);
  assert.equal(await D.text('#ms-own-ballot'), `Your ballot in this vote: ${name(jailed)}.`);
  assert.equal(await D.exists('#ms-action-open-vote'), false);
  for (const who of [A, C, D, E, F]) assertStored(await who.stored(), who.label, { unresolved: false, alsoAbsent: ['VOTE', 'ballot', 'abstain'] });

  // While the vote is open nothing of any ballot is public: not on the display, not on another phone.
  assert.deepEqual(await voteOf(display), publicJailVote, 'The display says what it said before anyone voted');
  assert.equal(/Your ballot|recorded|abstention/i.test(await display.page.evaluate('document.body.textContent')), false);
  assert.deepEqual((await everSpoken(display)).filter(aboutABallot), [], 'The display has said nothing of any ballot');
  assert.equal(await G.exists('#ms-own-ballot'), false, 'The player who has not voted is shown no ballot');
  assert.deepEqual(await voteOf(G), publicJailVote);
  assert.deepEqual(await offers(G), [['move', false], ['shot', false], ['vote', true]], 'and may still vote until the deadline');
  for (const who of players) assert.deepEqual((await everSpoken(who)).filter(line => aboutABallot(line) && !itsOwn(line)), [], `${who.label} heard of no ballot but its own`);
  assert.deepEqual((await everSpoken(G)).filter(aboutABallot), [], 'and the player who has not voted heard of none at all');
  established('V2. A Jail vote: seven voters, real ballots, and nothing of a ballot shown to anyone else', [
    `The display and every phone said the same thing about the open vote, from the public ballot: "${open.lines.join(' ')}"`,
    `Every phone was offered a vote and nothing else. Each listed the seats the server listed (its own among them) and "Abstain".`,
    `${A.label} voted with Tab and Enter alone; ${B.label}, ${C.label} and ${D.label} by touch, for the same seat. ${E.label} abstained (VOTE with no seat). ${F.label} voted for its own seat, which the server lists. ${G.label} cast no ballot.`,
    `ARRANGED: the answer to ${C.label}'s ballot was dropped in the browser. The phone asked the server, which had the ballot: one VOTE, accepted once.`,
    'Each ballot: one confirmation, one VOTE, receipt accepted. The card then said the ballot was recorded and that this is not a result.',
    'Afterwards each phone showed its own ballot from the server’s view, inside its open private panel, and was offered no second one. A reloaded phone showed it again after reopening the panel, and nothing of a ballot was in any page’s storage.',
    'Until the deadline the display’s voting panel was unchanged and nothing of any ballot was on it or spoken by it; no phone heard of a ballot but its own; the player who had not voted could still vote.',
  ]);

  // ---------------------------------------------------------------- V3. The count
  const candidates = everySeat.filter(number => number !== jailed);
  const election = { title: 'Captain election', lines: [`Candidates: ${names(candidates)}.`, '7 players may vote.'] };
  await phaseOpens('Round 2, Captain election', election);
  const counted = (await voteOf(display)).lastTally;
  const expectedCounts = [...everySeat].sort((a, b) => a - b).map(number => ({ seatId: `seat-${number}`, label: name(number), votes: number === jailed ? 4 : number === own ? 1 : 0 }));
  assert.deepEqual(counted, { heading: 'Last vote counted', title: 'Jail vote', counts: expectedCounts, lines: ['7 players could vote.', 'Abstained or did not vote: 2.', `Sent to Jail: ${name(jailed)}.`] });
  assert.deepEqual(await seatOnBoard(jailed), { location: 'Jail', markers: ['Healthy', 'Jailed'] });
  assert.equal(await timesSaid(display, `Jail vote counted. Sent to Jail: ${name(jailed)}.`), 1, 'The display says the count once, in words');
  const afterJail = await voteOf(display);
  for (const player of players) {
    await player.page.waitFor("document.getElementById('ms-action-open-vote') !== null", `${player.label}: the election is offered`, 20_000);
    assert.deepEqual(await voteOf(player), afterJail, `${player.label} shows the count and the election as the display does`);
    assert.equal(await player.exists('#ms-own-ballot'), false, 'The ballot of the vote that closed is no longer shown');
  }
  await display.shot('v5-table-display-jail-vote-counted.png');
  established('V3. The count is published when the vote closes, to everyone alike', [
    `The Jail vote ended at its deadline. The server's public view then carried the count: ${expectedCounts.filter(row => row.votes > 0).map(row => `${row.label} ${row.votes}`).join(', ')}, the other seats 0; 7 could vote; 2 abstained or did not vote; "Sent to Jail: ${name(jailed)}."`,
    `The display and all seven phones showed that count in the same words, the display spoke it once, and its board showed ${name(jailed)} in Jail, marked "Jailed".`,
    'Nothing shown or spoken says who voted for whom.',
  ]);

  // ---------------------------------------------------------------- V4. A Captain election that ties, and is run again
  const first = seat(A);
  const second = seat(D);
  // The jailed player votes too, and is not a candidate.
  const tied = await Promise.all([
    ballot(A, 'vote', `seat-${first}`, { picture: 'v6-phone-election' }), ballot(B, 'vote', `seat-${first}`), ballot(C, 'vote', `seat-${first}`),
    ballot(D, 'vote', `seat-${second}`), ballot(E, 'vote', `seat-${second}`), ballot(F, 'vote', `seat-${second}`), ballot(G, 'vote', 'none'),
  ]);
  for (const who of players) count(who);
  assert.equal(tied[0].asked, 'Who do you vote for as Captain?');
  assert.match(tied[0].confirm, /Vote for yourself as Captain\?/);
  for (const [index, result] of tied.entries()) {
    assert.deepEqual(result.listed.map(entry => entry[0]), [...[...candidates].sort((a, b) => a - b).map(number => `seat-${number}`), 'none'], `${players[index].label}: the six candidates the server lists, and the abstention`);
    accepted(result, { type: 'VOTE', targetSeatId: index < 3 ? `seat-${first}` : index < 6 ? `seat-${second}` : null });
  }
  const together = timings(tied);
  note(`Seven ballots cast at the same moment: the server answered in ${span(together.answersTookMs)}; the phones showed the acceptance after ${span(together.shownAfterMs)}.`);
  for (const who of players) await tapWhenActive(who, '#ms-action-dismiss');
  const runoff = { title: 'Captain election', lines: [`Candidates: ${names([first, second])}.`, '7 players may vote.'] };
  await phaseOpens('Round 2, Captain election', runoff);
  const tie = (await voteOf(display)).lastTally;
  assert.deepEqual([tie.title, tie.lines], ['Captain election', ['7 players could vote.', 'Abstained or did not vote: 1.', 'Nobody was elected.']]);
  assert.deepEqual(tie.counts.filter(row => row.votes > 0).map(row => [row.label, row.votes]), [first, second].sort((a, b) => a - b).map(number => [name(number), 3]));
  assert.equal((await display.page.evaluate("globalThis.mothershipConnected.frame().model.match.board.zones.flatMap(zone => zone.seats).some(entry => entry.captain)")), false, 'Nobody is Captain');
  await display.shot('v7-table-display-election-tied.png');

  const again = await Promise.all([
    ballot(A, 'vote', `seat-${first}`), ballot(B, 'vote', `seat-${first}`), ballot(C, 'vote', `seat-${first}`), ballot(D, 'vote', `seat-${first}`),
    ballot(E, 'vote', `seat-${second}`), ballot(F, 'vote', 'none'),
  ]);
  for (const who of [A, B, C, D, E, F]) count(who);
  for (const [index, result] of again.entries()) {
    assert.deepEqual(result.listed.map(entry => entry[0]), [...[first, second].sort((a, b) => a - b).map(number => `seat-${number}`), 'none'], 'Only the two tied candidates, and the abstention');
    accepted(result, { type: 'VOTE', targetSeatId: index < 4 ? `seat-${first}` : index === 4 ? `seat-${second}` : null });
  }
  for (const who of [A, B, C, D, E, F]) await tapWhenActive(who, '#ms-action-dismiss');
  await display.page.waitFor(`(() => {
    const match = globalThis.mothershipConnected.frame().model.match;
    return match && match.phase.timer.state === 'running' && /’s turn$/.test(match.phase.phaseLabel) && (match.vote?.lastTally?.lines ?? []).includes('Elected Captain: ${name(first)}.');
  })()`, 'the second count elects a Captain', 100_000);
  const elected = (await voteOf(display)).lastTally;
  assert.deepEqual(elected.counts.map(row => [row.label, row.votes]), [first, second].sort((a, b) => a - b).map(number => [name(number), number === first ? 4 : 1]));
  assert.deepEqual(elected.lines, ['7 players could vote.', 'Abstained or did not vote: 2.', `Elected Captain: ${name(first)}.`]);
  assert.deepEqual(await seatOnBoard(first), { location: 'Command Room', markers: ['Healthy', 'Captain'] });
  assert.equal(await timesSaid(display, 'Captain election counted. Nobody was elected.'), 1);
  assert.equal(await timesSaid(display, `Captain election counted. Elected Captain: ${name(first)}.`), 1);
  await display.shot('v8-table-display-captain-elected.png');
  established('V4. A Captain election that ties is run again among the tied candidates', [
    `The server opened a Captain election for round 2 with six candidates (every seat but the jailed ${name(jailed)}) and seven voters. The jailed player was offered the vote and was not on the list.`,
    `Three ballots for ${name(first)} (one of them that player's own), three for ${name(second)}, one abstention. Count: 3 and 3, "Nobody was elected."`,
    `The server then opened a second Captain election with only ${names([first, second])} as candidates; every phone listed exactly those two and "Abstain".`,
    `Four ballots for ${name(first)}, one for ${name(second)}, one abstention, one player silent. Count: 4 and 1, "Elected Captain: ${name(first)}." The board showed ${name(first)} in the Command Room, marked "Captain".`,
    'Both counts were spoken once by the display.',
    `MEASURED, on this machine's emulators: the seven ballots of the first election were confirmed at the same moment. The server answered them in ${span(together.answersTookMs)}, and the phones showed the acceptance ${span(together.shownAfterMs)} after the confirmation. A phone waits 8 s for an answer before it asks the server what became of its command.`,
  ]);

  // ---------------------------------------------------------------- V5. The Captain's release choice
  const releaseChoice = { title: 'Release choice', lines: [`${name(first)} may ask for a vote on releasing one jailed player.`, `Jailed: ${name(jailed)}.`] };
  await phaseOpens('Round 2, Release choice', releaseChoice, 9 * 60_000);
  for (const player of players.filter(candidate => candidate !== A)) {
    await player.page.waitFor("globalThis.mothershipConnected.frame().model.match.phase.phaseLabel === 'Release choice' && document.querySelector('.ms-offer') !== null", `${player.label} shows the release choice`, 20_000);
    assert.deepEqual(await offers(player), [['move', false], ['shot', false]], `${player.label} is not the Captain and is offered nothing`);
    assert.deepEqual((await voteOf(player)).current, releaseChoice);
  }
  const asked = await ballot(A, 'release-choice', `seat-${jailed}`, { picture: 'v9-phone-release-choice' });
  count(A);
  assert.equal(asked.asked, 'Ask for a release vote for which jailed player?');
  assert.deepEqual(asked.listed, [[`seat-${jailed}`, name(jailed)], ['none', 'No release request']]);
  assert.match(asked.confirm, new RegExp(`Ask for a vote on releasing ${name(jailed)} from Jail\\? The Captain has one release request in a match\\. This uses it, whatever the vote decides\\.`));
  accepted(asked, { type: 'RELEASE_CHOICE', targetSeatId: `seat-${jailed}` });
  assert.match(asked.said.replace(/^accepted /i, ''), new RegExp(`^Release vote for ${name(jailed)} requested\\.`));
  await putAway(A, null);
  assert.deepEqual(await offers(A), [['move', false], ['shot', false]], 'One choice: the server offers no second');
  assert.deepEqual((await voteOf(display)).current, releaseChoice, 'Until the phase ends the display says what it said before the choice');
  assert.deepEqual((await everSpoken(display)).filter(line => /requested|release vote for/i.test(line)), [], 'and has said nothing of the choice');
  for (const player of players.filter(candidate => candidate !== A)) assert.deepEqual((await everSpoken(player)).filter(line => /requested/i.test(line)), [], `${player.label} is told nothing of the choice`);
  established('V5. The Captain’s release choice', [
    `After the seven turns of round 2 the server opened a release choice. The display and every phone said: "${releaseChoice.lines.join(' ')}"`,
    `Only the Captain's phone was offered a choice: the jailed ${name(jailed)}, or "No release request". Before confirming, it said what asking uses up.`,
    `One confirmation, one RELEASE_CHOICE naming seat ${jailed}, receipt accepted. Nothing public changed until the phase ended.`,
  ]);

  // ---------------------------------------------------------------- V6. The vote on the release
  const releaseVote = { title: 'Release vote', lines: [`The vote is on releasing ${name(jailed)} from Jail.`, '7 players may vote.'] };
  await phaseOpens('Round 2, Release vote', releaseVote);
  const answers = await Promise.all([
    ballot(A, 'release-vote', 'yes'), ballot(B, 'release-vote', 'yes'), ballot(C, 'release-vote', 'yes'), ballot(D, 'release-vote', 'yes'),
    ballot(E, 'release-vote', 'no'), ballot(F, 'release-vote', 'none'), ballot(G, 'release-vote', 'yes', { picture: 'v10-phone-release-vote' }),
  ]);
  for (const who of players) count(who);
  assert.equal(answers[0].asked, `Release ${name(jailed)} from Jail?`);
  assert.equal(answers[6].asked, 'Release yourself from Jail?', 'The jailed player votes on their own release, and is asked in the second person');
  for (const [index, result] of answers.entries()) {
    assert.deepEqual(result.listed, [['yes', 'Yes, release'], ['no', 'No, do not release'], ['none', 'Abstain']]);
    accepted(result, { type: 'RELEASE_VOTE', approve: index === 4 ? false : index === 5 ? null : true });
  }
  for (const who of [A, B, C, D, G]) await putAway(who, 'Your ballot in this vote: yes.');
  await putAway(E, 'Your ballot in this vote: no.');
  await putAway(F, 'Your ballot in this vote: an abstention.');
  assert.deepEqual((await voteOf(display)).current, releaseVote);

  const jailVoteTwo = { title: 'Jail vote', lines: [`Can be voted into Jail: ${names(everySeat)}.`, '7 players may vote.'] };
  await phaseOpens('Round 2, Jail vote', jailVoteTwo);
  assert.deepEqual((await voteOf(display)).lastTally, { heading: 'Last vote counted', title: 'Release vote', counts: [], lines: [`The vote was on releasing ${name(jailed)}.`, 'Yes: 5 of 7.', `${name(jailed)} was released.`] });
  const released = await seatOnBoard(jailed);
  assert.deepEqual([['Room A', 'Room B'].includes(released.location), released.markers], [true, ['Healthy']], 'Out of Jail, back in a room, no longer marked');
  assert.equal(await timesSaid(display, `Release vote counted. ${name(jailed)} was released.`), 1);
  await display.shot('v11-table-display-release-counted.png');
  established('V6. The vote on the release', [
    `The server opened a release vote on ${name(jailed)}; the display and the phones said so from the public ballot. All seven were offered "Yes, release", "No, do not release" and "Abstain"; the jailed player was asked "Release yourself from Jail?".`,
    'Five voted yes (the jailed player among them), one no, one abstained: seven RELEASE_VOTE commands, each accepted once. Each phone then showed its own ballot from the server’s view.',
    `Count, published when the vote closed: "Yes: 5 of 7. ${name(jailed)} was released." The board showed ${name(jailed)} in ${released.location}, no longer marked "Jailed", and the server opened the round's Jail vote with all seven seats.`,
  ]);

  // ---------------------------------------------------------------- V7. A vote in which nobody votes
  for (const player of players) {
    await player.page.waitFor("document.getElementById('ms-action-open-vote') !== null", `${player.label}: the vote is offered`, 20_000);
    assert.deepEqual(await offers(player), [['move', false], ['shot', false], ['vote', true]], `${player.label} may vote`);
  }
  await display.page.waitFor(`(() => {
    const match = globalThis.mothershipConnected.frame().model.match;
    return match && match.phase.roundLabel === 'Round 3' && match.vote?.lastTally?.title === 'Jail vote';
  })()`, 'the second Jail vote is counted', 100_000);
  assert.equal(await timesSaid(display, 'Jail vote counted. Nobody was sent to Jail.'), 1);
  const silent = (await voteOf(display)).lastTally;
  assert.deepEqual([silent.counts.every(row => row.votes === 0), silent.lines], [true, ['7 players could vote.', 'Abstained or did not vote: 7.', 'Nobody was sent to Jail.']]);
  for (const who of [display, ...players]) assert.equal(new Set((await who.operations('v1Command')).map(call => call.request.commandId)).size, who === display ? 0 : cast.get(who), `${who.label}: only what it confirmed was sent`);
  const followed = await display.page.evaluate('window.__phases');
  facts.match = {
    note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS,
    phasesFollowed: followed.map((phase, index) => ({ label: phase.label, secondsAfterThePreviousOne: index === 0 ? null : Math.round((phase.at - followed[index - 1].at) / 100) / 10 })),
    jailVote: { votedForSeat: jailed, selfVoteBySeat: own, counts: Object.fromEntries(expectedCounts.map(row => [row.label, row.votes])) },
    election: { firstCount: Object.fromEntries(tie.counts.map(row => [row.label, row.votes])), secondCount: Object.fromEntries(elected.counts.map(row => [row.label, row.votes])), captainSeat: first },
    release: { requestedForSeat: jailed, yes: 5, voters: 7, released: true },
    ballotsSentBySeat: Object.fromEntries(players.map(player => [name(seat(player)), cast.get(player)])),
  };
  facts.match.ballotsStartedAgain = startedAgain;
  facts.match.commandsSentAgainAsTheIdenticalRequest = sentAgain;
  facts.match.sevenSimultaneousBallots = together;
  established('V7. A vote in which nobody votes', [
    'In the second Jail vote all seven were offered a ballot and none cast one. The server closed the vote at its deadline and published: every seat 0, "Abstained or did not vote: 7. Nobody was sent to Jail." Round 3 began.',
    `Over the whole journey each phone sent exactly the ballots it confirmed (${players.map(player => cast.get(player)).join(', ')}) and the display sent none.`,
    startedAgain.length === 0 ? 'No ballot had to be started a second time.' : `${startedAgain.length} ballot(s) were started a second time after the first try stopped with nothing sent. What the page showed each time is in facts.json under ballotsStartedAgain.`,
    sentAgain.length === 0 ? 'No command had to be sent a second time.' : `${sentAgain.length} command(s) were sent a second time as the identical request because the first answer took longer than the phone waits; each was accepted once. They are listed in facts.json.`,
    'NOT RUN: any turn action, a vote with a phone offline, an injured or eliminated voter, a second release request, and anything after the start of round 3.',
  ]);
}

/**
 * The seven-player private-knowledge scenario. What each phone is told in its private panel
 * is read, and checked against what the other phones show: the script can see all seven,
 * which no player can. Then the Hacker scans a player on its own turn, guessing that
 * player's real faction, and the result is checked against the Alien's own statement of
 * the Code.
 */
async function knowledgeScenario({ display, players, seatOf, matchId }) {
  for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
  const seat = who => seatOf.get(who);
  const name = number => `Player ${number}`;
  const roleOf = new Map();
  const known = new Map();
  const knowledgeOf = who => who.page.evaluate("[...document.querySelectorAll('[data-region=\"knowledge\"] li')].map(item => item.textContent)");
  for (const player of players) {
    assert.equal(await player.exists('[data-region="knowledge"]'), false, 'Closed, nothing a seat is told is in the document');
    await openPanel(player);
    roleOf.set(player, await player.text('.ms-role-card'));
    known.set(player, await knowledgeOf(player));
  }
  assert.deepEqual([...roleOf.values()].sort(), SEVEN_PLAYER_ROLES);
  const holder = role => players.find(player => roleOf.get(player) === role);
  const factionOf = player => (roleOf.get(player) === 'Alien' ? 'Alien' : ['Undercover', 'Hacker'].includes(roleOf.get(player)) ? 'Red' : 'Blue');
  const listed = (numbers, self = null) => [...numbers].sort((a, b) => a - b).map(number => (number === self ? `${name(number)} (you)` : name(number))).join(', ');

  // ---------------------------------------------------------------- K1. What each seat is told
  const WEAPONS = 'Ordinary weapons you hold: 0.';
  const three = [holder('Undercover'), holder('Alien'), holder('Cracker')].map(seat);
  assert.deepEqual(known.get(holder('Insider')), [`${listed(three)} hold the roles Undercover, Alien and Cracker, one each. You are not told which of them holds which.`, WEAPONS], 'The Insider is told the three seats that really hold those roles');
  assert.deepEqual(known.get(holder('Hacker')), [`The Undercover is ${name(seat(holder('Undercover')))}.`, WEAPONS], 'The Hacker is told the seat that really holds Undercover');
  assert.deepEqual(known.get(holder('Undercover')), ['Ordinary weapons you hold: 1.'], 'The Undercover holds one weapon');
  assert.deepEqual(known.get(holder('Cracker')), [WEAPONS, 'Rescues you have left: 2.']);
  for (const role of ['Blue Disabler', 'Supplier']) assert.deepEqual(known.get(holder(role)), [WEAPONS], `${role}: told only what it holds`);
  const alien = holder('Alien');
  const [codeLine, ...rest] = known.get(alien);
  assert.deepEqual(rest, [WEAPONS]);
  const codeMatch = /^The Code is these four players: (.+)\.$/.exec(codeLine);
  assert.notEqual(codeMatch, null, codeLine);
  const code = codeMatch[1].split(', ').map(entry => Number(/^Player (\d)/.exec(entry)[1]));
  assert.deepEqual([code.length, new Set(code).size], [4, 4], 'Four different players');
  assert.equal(codeMatch[1].includes(`${name(seat(alien))} (you)`), true, 'The Alien is in the Code and is told so in the second person');
  assert.equal(code.includes(seat(holder('Undercover'))), false, 'The Undercover is not in the Code');
  // Nobody is told what belongs to another role.
  for (const player of players) {
    const text = known.get(player).join(' ');
    assert.equal(/hold the roles/.test(text), player === holder('Insider'), player.label);
    assert.equal(/The Undercover is/.test(text), player === holder('Hacker'), player.label);
    assert.equal(/The Code is/.test(text), player === alien, player.label);
    assertStored(await player.stored(), player.label, { unresolved: false, alsoAbsent: ['The Code', 'hold the roles', 'you hold', 'What you know'] });
  }
  assert.equal(/What you know|The Code is|The Undercover is|hold the roles|you hold/.test(await display.page.evaluate('document.body.textContent')), false, 'None of it is on the shared display');
  await holder('Insider').shot('k1-phone-what-you-know.png');
  established('K1. What each seat is told in private, checked against the other six phones', [
    'With its private panel open each phone lists what the server’s view tells that seat; closed, none of it is in the document.',
    `The Insider's phone names three seats as holding Undercover, Alien and Cracker. The three phones that show those roles are exactly those seats.`,
    `The Hacker's phone names the Undercover's seat, and the phone in that seat shows Undercover.`,
    `The Alien's phone lists a Code of four different seats, its own among them and the Undercover's not.`,
    'The Undercover is told it holds one weapon, the Cracker that it has two Rescues, and every other seat that it holds no weapon and nothing else. No phone is told what belongs to another role, the display shows none of it, and none of it is in any page’s storage.',
  ]);

  // ---------------------------------------------------------------- K2. A Scan on the Hacker's own turn
  const hacker = holder('Hacker');
  const bySeat = new Map(players.map(player => [seat(player), player]));
  const offers = who => who.page.evaluate("[...document.querySelectorAll('.ms-offer')].map(offer => [offer.dataset.kind, offer.querySelector('button') !== null])");
  const boardOf = async () => JSON.stringify((await display.frame()).model.match.board);
  let last = null;
  let turns = 0;
  for (; turns < PLAYERS; turns += 1) {
    if (last !== null) await display.page.waitFor(`(() => { const p = globalThis.mothershipConnected.frame().model.match.phase; return p.timer.state === 'running' && p.phaseLabel !== ${JSON.stringify(last)}; })()`, 'the next turn', 100_000);
    await display.page.waitFor("globalThis.mothershipConnected.frame().model.match.phase.timer.state === 'running'", 'the display has the server’s time');
    const phase = await display.page.evaluate("(() => { const m = globalThis.mothershipConnected.frame().model.match; return { label: m.phase.phaseLabel, active: m.board.zones.flatMap(zone => zone.seats).find(entry => entry.isActive)?.number ?? null }; })()");
    last = phase.label;
    // On every turn: no phone but the Hacker's on its own turn lists a Scan.
    for (const player of players.filter(candidate => !(candidate === hacker && phase.active === seat(hacker)))) {
      const theirs = await offers(player);
      assert.equal(theirs.length >= 2, true, `${player.label}: the idle card is on screen`);
      assert.equal(theirs.some(offer => offer[0] === 'scan' || offer[0] === 'supply' || offer[0] === 'code'), false, `${player.label} is not offered a Scan, a Supply or a Code attempt`);
    }
    if (phase.active === seat(hacker)) break;
  }
  assert.equal(turns < PLAYERS, true, 'The Hacker had a turn');
  await hacker.page.waitFor("document.getElementById('ms-action-open-scan') !== null", 'the Hacker is offered a Scan on its own turn', 20_000);
  const board = await boardOf();
  await hacker.page.tap('#ms-action-open-scan');
  await hacker.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, 'the seats the server lists');
  assert.equal(await hacker.text('#ms-action-step'), 'Who do you scan?');
  const scannable = await hacker.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => choice.dataset.value)");
  assert.equal(scannable.includes(`seat-${seat(hacker)}`), true, 'The server lists the Hacker’s own seat too');
  // Another player if the server lists one, else itself. The guess is that player's real faction.
  const targetSeat = Number((scannable.find(value => value !== `seat-${seat(hacker)}`) ?? scannable[0]).slice(5));
  const target = bySeat.get(targetSeat);
  const guess = factionOf(target);
  await hacker.page.tap(`#ms-action-choice-seat-${targetSeat}`);
  await hacker.page.waitFor("document.getElementById('ms-action-progress') !== null", 'the second part is asked for');
  const who = target === hacker ? 'yourself' : name(targetSeat);
  assert.equal(await hacker.text('#ms-action-step'), `Guess a faction for ${who}.`);
  assert.deepEqual(await hacker.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => choice.dataset.value)"), ['Blue', 'Red', 'Alien']);
  assert.equal((await hacker.operations('v1Command')).length, 0, 'Nothing is sent by choosing');
  await hacker.shot('k2-phone-scan-guess.png', { selector: '[data-action="connected"]' });
  await hacker.page.tap(`#ms-action-choice-${guess.toLowerCase()}`);
  await hacker.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, 'asked to confirm');
  assert.match((await card(hacker)).text, new RegExp(`Scan ${who}, guessing ${guess}\\? This uses your Scan for this round, whatever the result\\.`));
  await tapWhenActive(hacker, '#ms-action-confirm');
  await cardIs(hacker, 'accepted', 'the Scan is accepted', 20_000);
  // One command. If its answer does not arrive within the 8 s a phone waits, the phone asks what became of it and
  // sends the identical request again; the server then answers with the one receipt. Whatever happened is recorded.
  const scanCalls = await hacker.operations('v1Command');
  const [sent] = scanCalls;
  const scanAnswers = scanCalls.map(call => ({ tookMs: call.tookMs, answer: call.response?.receipt?.status ?? call.response?.error?.code ?? call.ended ?? call.dropped ?? 'no answer' }));
  assert.deepEqual(sent.request.command, { type: 'SCAN', targetSeatId: `seat-${targetSeat}`, guess });
  for (const again of scanCalls.slice(1)) assert.deepEqual(again.request, sent.request, 'Sent again only as the identical request, with the same identifier');
  const scanReceipt = { protocolVersion: 2, matchId, phaseId: sent.request.phaseId, commandId: sent.request.commandId, status: 'accepted', code: 'REGISTERED' };
  const scanAnswered = scanCalls.filter(call => call.response !== null);
  assert.equal(scanAnswered.length >= 1, true, `The server answered: ${JSON.stringify(scanAnswers)}`);
  for (const call of scanAnswered) assert.deepEqual(call.response.receipt, scanReceipt, 'Every answer is the one receipt');
  if (scanCalls.length > 1) note(`The SCAN went out ${scanCalls.length} times as the identical request: ${JSON.stringify(scanAnswers)}; lookups: ${JSON.stringify((await hacker.operations('v1Receipt')).map(call => ({ tookMs: call.tookMs, answer: call.response?.status ?? call.response?.error?.code ?? call.ended ?? 'no answer' })))}.`);
  assert.match((await card(hacker)).text.replace(/^accepted /i, ''), new RegExp(`^Scan of ${who}, guessing ${guess}, accepted\\. The result is listed under`));
  // The result, as the server's next view gives it: right, and membership as the Alien's own Code says.
  const result = `Round 1: you scanned ${who} and guessed ${guess}. The guess was right, and that player is ${code.includes(targetSeat) ? '' : 'not '}in the Code.`;
  await hacker.page.waitFor(`[...document.querySelectorAll('[data-region="knowledge"] li')].some(item => item.textContent === ${JSON.stringify(result)})`, 'the result is listed', 20_000);
  assert.deepEqual(await knowledgeOf(hacker), [`The Undercover is ${name(seat(holder('Undercover')))}.`, result, WEAPONS]);
  await hacker.shot('k3-phone-scan-result.png');
  await tapWhenActive(hacker, '#ms-action-dismiss');
  await cardIs(hacker, 'idle', 'the card is put away');
  assert.equal((await offers(hacker)).some(offer => offer[0] === 'scan'), false, 'The server offers no second Scan this round');
  // Nobody else is told, and nothing public moved.
  await sleep(1_500);
  assert.equal(await boardOf(), board, 'The shared display’s board is what it was before the Scan');
  for (const player of players.filter(candidate => candidate !== hacker)) {
    assert.deepEqual(await knowledgeOf(player), known.get(player), `${player.label} is told nothing new`);
    assert.deepEqual((await everSpoken(player)).filter(line => /scan/i.test(line)), [], `${player.label} heard nothing of a Scan`);
  }
  assert.deepEqual((await everSpoken(display)).filter(line => /scan/i.test(line)), []);
  assertStored(await hacker.stored(), hacker.label, { unresolved: false, alsoAbsent: ['SCAN', 'guess', 'you scanned', 'The Code'] });
  facts.match = {
    note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS,
    turnsFollowed: turns + 1,
    scan: { bySeat: seat(hacker), ofSeat: targetSeat, ofOwnSeat: target === hacker, guess, seatsListed: scannable.length, commandCalls: scanAnswers },
  };
  established('K2. A Scan on the Hacker’s own turn, and its result', [
    `The journey followed ${turns + 1} turn(s) to the Hacker's. On every one of them no other phone listed a Scan, a Supply or a Code attempt.`,
    `On its own turn the Hacker's phone offered a Scan with ${scannable.length} seat(s) from the server, its own among them. It asked for the seat, then for a guess among Blue, Red and Alien, and sent nothing until the choice was confirmed.`,
    `One confirmation made one SCAN naming seat ${targetSeat} and guessing ${guess}, that player's real faction as its own phone's role shows. Receipt accepted.${scanCalls.length > 1 ? ` The request went out ${scanCalls.length} times, each time as the identical request (${scanAnswers.map(call => `${call.answer} after ${call.tookMs} ms`).join('; ')}), and was accepted once.` : ''}`,
    `The server's next view carried the result and the phone listed it: the guess was right, and that player is ${code.includes(targetSeat) ? '' : 'not '}in the Code, which agrees with the Code the Alien's phone lists.`,
    'The server offered no second Scan in the round. No other phone was told anything, the display’s board did not change, nothing of a Scan was spoken anywhere but privately on the Hacker’s phone, and nothing of it was in the page’s storage.',
    'NOT RUN: a wrong guess, a Supply (round 3 only) and a Code attempt (round 5 only) against the backend. They are unit-tested.',
  ]);
}

/**
 * The host ends a match that is still a lobby: seven players are seated and a display is
 * admitted, and nothing has started. No role was dealt and no view was ever written, so
 * there is no match to show. Every device says that, and opens nothing.
 */
async function lobbyEndScenario({ host, display, players, matchId }) {
  const shown = selector => host.page.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); return node !== null && !node.hidden; })()`);
  const ENDED = 'The host ended this match before it started. There is nothing of it to show.';
  const waitingText = who => who.text('#connected-waiting');
  for (const player of players) assert.equal(await waitingText(player), 'Seated. Waiting for the host to start the match.', player.label);
  assert.equal(await waitingText(display), 'Waiting to be admitted by the host, and for the match to start.');
  assert.equal(await host.text('#connected-match-status'), 'lobby');

  // A lobby can be ended, with the same two presses as a match that is being played.
  assert.deepEqual([await shown('#connected-end'), await shown('#connected-end-confirm')], [true, false]);
  await host.page.tabTo('connected-end', 60);
  await host.page.press('Enter');
  await host.page.waitFor("!document.getElementById('connected-end-confirm').hidden", 'the host is asked to confirm');
  assert.equal(await focused(host), 'connected-end-cancel');
  assert.equal((await host.operations('v1AbortMatch')).length, 0, 'Asking sends nothing');
  await host.page.tabTo('connected-end-confirm', 10);
  await host.page.press('Enter');
  await host.page.waitFor("document.getElementById('connected-match-status').textContent === 'aborted'", 'the host console reads the match as ended', 20_000);
  const aborts = await host.operations('v1AbortMatch');
  assert.deepEqual(aborts.map(call => [call.request.matchId, call.response.ok, call.response.result]), [[matchId, true, { aborted: true }]], 'One confirmation, one request');
  assert.deepEqual([await shown('#connected-end'), await shown('#connected-end-confirm')], [false, false], 'It cannot be ended again');
  assert.deepEqual([await host.page.evaluate("document.getElementById('connected-start').disabled"), (await host.operations('v1StartMatch')).length], [true, 0], 'and it cannot be started');

  // Every device says what happened. None of them opens a match, waits for one, or says it lost access.
  for (const who of [display, ...players]) {
    await who.page.waitFor(`document.getElementById('connected-waiting')?.textContent === ${JSON.stringify(ENDED)}`, `${who.label} says the match ended before it started`, 20_000);
  }
  await sleep(3_000);
  for (const who of [display, ...players]) {
    assert.equal(await waitingText(who), ENDED, `${who.label}: still says so`);
    assert.equal(await who.exists('.ms-shell'), false, `${who.label}: no match screen was opened`);
    assert.doesNotMatch(await who.page.evaluate('document.body.textContent'), /No access|Connecting|Reconnecting/, who.label);
    assert.equal((await who.operations('v1Command')).length + (await who.operations('v1Advance')).length, 0, `${who.label} sent nothing about a match`);
  }
  await display.shot('l1-display-ended-in-the-lobby.png');
  await players[0].shot('l2-phone-ended-in-the-lobby.png');

  // A reloaded phone and a reloaded display say the same, from what the server lets them read.
  for (const who of [players[1], display]) {
    await who.page.reload(`document.getElementById('connected-waiting')?.textContent === ${JSON.stringify(ENDED)}`, 20_000);
    assert.equal(await who.exists('.ms-shell'), false, `${who.label}: nothing is opened after a reload either`);
  }
  for (const player of players) assertStored(await player.stored(), player.label, { unresolved: false });

  facts.match = {
    note: 'A throwaway lobby on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS, endedByHost: true, everStarted: false,
  };
  established('L. The host ends a match that is still a lobby (seven players seated, a display admitted)', [
    'The host console offers to end a lobby with the same two presses as a running match. One v1AbortMatch; the console then read "aborted" and offered neither to start the match nor to end it again.',
    `The display and all seven phones then said: "${ENDED}" None of them opened a match screen, went on waiting, or said it had lost access.`,
    'No role was ever dealt, so there was nothing private to show or to keep: nothing of a match was in any page or its storage.',
    'A reloaded phone and a reloaded display said the same.',
  ]);
}

/**
 * The host ends a seven-player match that is being played. Every screen then shows what the
 * server's view says: ended by the host, no winner, nothing revealed.
 */
async function endScenario({ host, display, players, seatOf, matchId }) {
  for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
  const roleOf = new Map();
  for (const player of players) {
    await openPanel(player);
    roleOf.set(player, await player.text('.ms-role-card'));
    await player.page.waitFor("document.querySelector('.ms-offer') !== null", `${player.label}: the card is on screen`);
  }
  assert.deepEqual([...roleOf.values()].sort(), SEVEN_PLAYER_ROLES);
  const resultOf = who => who.page.evaluate('JSON.parse(JSON.stringify(globalThis.mothershipConnected.frame().model.match?.result ?? null))');
  for (const who of [display, ...players]) assert.equal(await resultOf(who), null, `${who.label}: no result while the match is played`);
  const shown = selector => host.page.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); return node !== null && !node.hidden; })()`);

  // ---------------------------------------------------------------- E1. Ending takes two presses, and the first sends nothing
  assert.deepEqual([await shown('#connected-end'), await shown('#connected-end-confirm'), await shown('#connected-end-cancel')], [true, false, false]);
  await host.page.tabTo('connected-end', 60);
  await host.page.press('Enter');
  await host.page.waitFor("!document.getElementById('connected-end-confirm').hidden", 'the host is asked to confirm');
  assert.equal(await focused(host), 'connected-end-cancel', 'Focus is on the way back, not on the control that ends the match');
  assert.match(await host.text('#connected-end-note'), /cannot be undone/);
  assert.equal((await host.operations('v1AbortMatch')).length, 0, 'Asking sends nothing');
  await host.page.press('Enter');
  await host.page.waitFor("!document.getElementById('connected-end').hidden", 'the host changed their mind');
  assert.deepEqual([await shown('#connected-end-confirm'), await focused(host)], [false, 'connected-end']);
  await sleep(500);
  assert.equal((await host.operations('v1AbortMatch')).length, 0);
  for (const who of [display, ...players]) assert.equal(await resultOf(who), null, `${who.label}: the match goes on`);
  await host.shot('e1-host-console-running.png');

  // ---------------------------------------------------------------- E2. The host ends the match
  await host.page.press('Enter');
  await host.page.waitFor("!document.getElementById('connected-end-confirm').hidden", 'the host is asked again');
  await host.shot('e2-host-asked-to-confirm.png');
  await host.page.tabTo('connected-end-confirm', 10);
  const pressedAt = Date.now();
  await host.page.press('Enter');
  await host.page.waitFor("document.getElementById('connected-match-status').textContent === 'aborted'", 'the host console reads the match as ended', 20_000);
  const [abort, ...more] = await host.operations('v1AbortMatch');
  assert.deepEqual(more, [], 'One confirmation, one request');
  assert.deepEqual(Object.keys(abort.request).sort(), ['matchId', 'protocolVersion', 'requestId']);
  assert.deepEqual([abort.request.matchId, abort.response.ok, abort.response.result], [matchId, true, { aborted: true }]);
  assert.equal(await host.text('#connected-status'), 'Ending the match: done.');
  assert.deepEqual([await shown('#connected-end'), await shown('#connected-end-confirm'), await shown('#connected-end-cancel')], [false, false, false], 'A match that is over cannot be ended again');
  assert.equal(await host.page.evaluate("document.getElementById('connected-start').disabled"), true);

  // ---------------------------------------------------------------- E3. Every screen shows what the server's view says
  const ENDED = { heading: 'Result', outcome: 'The host ended this match. There is no winner.', lines: [], reveal: null };
  for (const who of [display, ...players]) {
    await who.page.waitFor("globalThis.mothershipConnected.frame().model.match?.phase.phaseLabel === 'Match ended by the host'", `${who.label} shows the match as ended`, 20_000);
    assert.deepEqual(await resultOf(who), ENDED, who.label);
    assert.equal(await who.page.evaluate("globalThis.mothershipConnected.frame().model.match.phase.timer.state"), 'none', 'No countdown is left');
    assert.equal(await who.text('[data-region="result"] .ms-result__outcome'), ENDED.outcome);
  }
  const heardAfterMs = Date.now() - pressedAt;
  const everyRole = new RegExp(`\\b(${SEVEN_PLAYER_ROLES.join('|')})\\b`);
  assert.equal(everyRole.test(await display.page.evaluate('document.body.textContent')), false, 'The display names no role');
  assert.equal(/The Code was|wins/.test(await display.page.evaluate('document.body.textContent')), false);
  for (const player of players) {
    assert.equal(await player.text('.ms-role-card'), roleOf.get(player), 'A phone still shows its own role, in its own private panel');
    assert.equal(await player.page.evaluate("globalThis.mothershipConnected.frame().model.match.privateArea.content.actions.notice"), 'The match is over.');
    assert.equal(await player.exists('[data-action="connected"] button'), false, `${player.label}: nothing can be started`);
    // An ended match reveals nothing: a phone still names no role but its own, apart from what its own seat was told.
    const shown = await shownApartFromWhatItIsTold(player);
    for (const role of SEVEN_PLAYER_ROLES) assert.equal(new RegExp(`\\b${role}\\b`).test(shown), role === roleOf.get(player), `${player.label} shows its own role and no other (${role})`);
    assert.equal((await player.operations('v1Command')).length, 0);
  }
  assert.equal((await everSpoken(display)).filter(line => line.includes('The host ended this match. There is no winner.')).length, 1, 'The display says it once');
  await display.shot('e3-table-display-ended.png');
  await players[0].shot('e4-phone-ended.png');

  // ---------------------------------------------------------------- E4. It is still so after a reload
  await players[1].page.reload(MATCH, 20_000);
  await players[1].page.waitFor("globalThis.mothershipConnected.frame().model.match?.phase.phaseLabel === 'Match ended by the host'", 'the reloaded phone shows the match as ended', 20_000);
  assert.deepEqual(await resultOf(players[1]), ENDED);
  assert.equal(await players[1].exists('.ms-role-card'), false, 'A reloaded phone shows nothing private until it is asked to');
  await display.page.reload(MATCH, 20_000);
  await display.page.waitFor("globalThis.mothershipConnected.frame().model.match?.phase.phaseLabel === 'Match ended by the host'", 'the reloaded display shows the match as ended', 20_000);
  assert.deepEqual(await resultOf(display), ENDED);
  facts.match = {
    note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS,
    endedByHost: true,
    everyScreenShowedItWithinMs: heardAfterMs,
  };
  established('E. The host ends a match that is being played (seven players)', [
    'The host console asks before ending: the first press only asks, puts focus on the way back, and sends nothing. Declining left the match running on all eight screens.',
    'With the keyboard alone the host then confirmed: one v1AbortMatch carrying the match and a request identifier and nothing else; the answer was "aborted". The console read the match as "aborted" from its own session document and offered no way to end or start it again.',
    `Within ${(heardAfterMs / 1000).toFixed(1)} s the display and all seven phones showed, from the server's own views: "Match ended by the host", no countdown, and "The host ended this match. There is no winner."`,
    'Nothing was revealed: the display named no role and no Code, and each phone showed its own role in its own private panel and no other. Every phone said the match is over and had no control left; none had sent a command.',
    'A reloaded phone and a reloaded display showed the same ended match.',
    'NOT RUN: a finished match with a winner and its end reveal, which needs a whole match; ending a match from the lobby before it starts; a lost answer to the request.',
  ]);
}

/**
 * The nine-player scenario: a shot registered on the Officer's own turn, which is the only
 * ordinary shot the approved ruleset opens in a first round. Every turn is a real
 * 60-second phase and nothing here can shorten one, so this waits for as many of them as
 * the server's turn order puts before the Officer's.
 */
async function shotScenario({ display, players, seatOf, matchId }) {
  for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
  const roles = new Map();
  for (const player of players) {
    await openPanel(player);
    roles.set(player, await player.text('.ms-role-card'));
  }
  assert.equal(new Set(roles.values()).size, PLAYERS, 'Nine players, nine different roles');
  const officer = players.find(player => roles.get(player) === 'Officer');
  assert.notEqual(officer, undefined, 'A nine-player match has an Officer');
  const seat = seatOf.get(officer);
  const others = players.filter(player => player !== officer);
  const shotOffer = who => who.page.evaluate("(() => { const offer = document.querySelector('.ms-offer[data-kind=\"shot\"]'); return offer === null ? null : [offer.querySelector('.ms-offer__status').textContent, offer.querySelector('button') !== null]; })()");
  for (const player of others) assert.deepEqual(await shotOffer(player), ['Not available', false], `${player.label} is offered no shot in round 1`);
  const ownTurn = "globalThis.mothershipConnected.frame().model.match.phase.phaseLabel === 'Your turn'";
  if (!await officer.page.evaluate(ownTurn)) {
    assert.deepEqual(await shotOffer(officer), ['Not available', false], 'Outside its own turn the Officer is offered no shot either');
    note(`The Officer is Player ${seat}. It is "${(await phaseOf(display)).label}"; waiting for Player ${seat}’s own turn. Each turn is a real 60-second phase.`);
    await officer.page.waitFor(ownTurn, 'the Officer’s own turn', PLAYERS * 66_000);
  }
  // The phone must have the server's time before its countdown means anything, or before it offers anything.
  await officer.page.waitFor("globalThis.mothershipConnected.frame().model.match.phase.timer.state === 'running'", 'the Officer’s phone has the server’s time');
  const turn = await phaseOf(officer);
  assert.equal(turn.running && turn.remaining >= 25, true, `Enough of the turn is left (${turn.remaining} s)`);
  await officer.page.waitFor("document.getElementById('ms-action-open-shot') !== null", 'a shot is offered on the Officer’s own turn').catch(async error => {
    // Say what the phone showed instead, so that a failure after a long wait can be read.
    throw new Error(`${error.message}. Panel open: ${await officer.attribute('#ms-private-toggle', 'aria-expanded')}; card: ${JSON.stringify(await card(officer))}`);
  });
  assert.deepEqual(await shotOffer(officer), ['Available', true]);
  await officer.shot('s1-officer-own-turn.png');

  const publicBefore = JSON.stringify((await display.frame()).model.match.board);
  await officer.page.tap('#ms-action-open-shot');
  await officer.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, 'the legal targets are listed');
  const targets = await officer.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => choice.dataset.value)");
  assert.equal(targets.length > 0 && !targets.includes(`seat-${seat}`), true, 'The server lists targets, and not the Officer itself');
  // Observed, not required here: which seats are legal targets is the server's rule to apply.
  const ownPlace = await shownAt(display, seat);
  let sameLocation = true;
  for (const target of targets) sameLocation &&= await shownAt(display, Number(target.slice(5))) === ownPlace;
  await cardShot(officer, 's2-officer-choose-target.png');
  const target = targets[0];
  const targetNumber = Number(target.slice(5));
  await officer.page.tap('button[data-intent="action/choose"]');
  await officer.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, 'asked to confirm');
  assert.match((await card(officer)).text, new RegExp(`Register a shot at Player ${targetNumber}\\?`));
  assert.equal((await officer.operations('v1Command')).length, 0, 'Choosing a target sends nothing');
  await cardShot(officer, 's3-officer-confirm-shot.png', '#ms-action-confirm');
  await officer.page.tap('#ms-action-confirm');
  await cardIs(officer, 'accepted', 'the shot is registered');
  const [sent, ...more] = await officer.operations('v1Command');
  assert.equal(more.length, 0, 'One confirmation, one command');
  assert.deepEqual(sent.request.command, { type: 'REGISTER_SHOT', targetSeatId: target });
  assert.deepEqual(sent.response.receipt, { protocolVersion: 2, matchId, phaseId: sent.request.phaseId, commandId: sent.request.commandId, status: 'accepted', code: 'REGISTERED' });
  const registered = await card(officer);
  assert.match(registered.text, new RegExp(`Shot at Player ${targetNumber} registered\\.`));
  assert.match(registered.text, /This is not a result\. Registered shots are resolved at the end of the round\./);
  await cardShot(officer, 's4-officer-shot-registered.png', '#ms-action-dismiss');

  // Registration is not damage, and it is nobody else's to see.
  await sleep(2_000);
  assert.equal(JSON.stringify((await display.frame()).model.match.board), publicBefore, 'The shared display shows exactly what it showed before: nobody is hurt, nothing is marked');
  const targetPlayer = players.find(player => seatOf.get(player) === targetNumber);
  assert.equal((await targetPlayer.frame()).model.match.location.self.health, 'Healthy', 'The target is as healthy as before');
  for (const player of others) {
    assert.equal((await spoken(player)).some(line => /shot|registered/i.test(line)), false, `${player.label} was told nothing about a shot`);
    assert.equal((await player.operations('v1Command')).length, 0);
  }
  await display.shot('s5-table-display-after-registration.png');

  // Put away, the card says what the server's own view says: one action waiting. It names no target.
  await tapWhenActive(officer, '#ms-action-dismiss');
  await cardIs(officer, 'idle', 'the card is put away');
  const waiting = await card(officer);
  assert.match(waiting.text, /One action of yours is registered and waiting to be resolved\./);
  assert.deepEqual(await shotOffer(officer), ['Not available', false], 'The Officer’s one ordinary shot is spent: the server offers no second');
  const forbidden = [...new Set(roles.values()), target];
  assertStored(await officer.stored(), officer.label, { unresolved: false, alsoAbsent: forbidden });

  // After a reload that is still what the phone knows, from the server's view and from nothing kept.
  await officer.page.reload(MATCH, 20_000);
  await openPanel(officer);
  await cardIs(officer, 'idle', 'the reloaded card');
  const reloaded = await card(officer);
  assert.match(reloaded.text, /One action of yours is registered and waiting to be resolved\./);
  assert.equal(new RegExp(`Player ${targetNumber}\\b`).test(reloaded.text), false, 'The reloaded phone does not know, and does not say, who the target was');
  assert.equal((await officer.operations('v1Command')).length, 1, 'and it sent nothing more');
  await cardShot(officer, 's6-officer-reloaded.png');
  for (const player of others) assertStored(await player.stored(), player.label, { unresolved: false, alsoAbsent: forbidden });

  const phasesSeen = await display.page.evaluate('window.__phases');
  facts.match = {
    note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS,
    phasesShownByTheDisplayBeforeTheShot: phasesSeen.map(phase => phase.label),
  };
  established('6b. On its own turn the Officer registers a shot (nine players)', [
    `A nine-player match on the real backend. The Officer was Player ${seat}; nobody else was offered a shot, and the Officer was not offered one outside its own turn. The display had shown ${phasesSeen.length} phase${phasesSeen.length === 1 ? '' : 's'} when that turn came.`,
    `On its own turn the phone offered a shot, listed the server’s legal targets (${targets.length}${sameLocation ? ', all of them publicly in the Officer’s own location' : ''}), and after one confirmation sent one v1Command (REGISTER_SHOT). The backend’s receipt: accepted, REGISTERED.`,
    'The phone says the shot is registered, that this is not a result, and that registered shots are resolved at the end of the round.',
    'Registration is not damage: the shared display’s board was identical before and after, the target is as healthy as before, and no other phone was told anything.',
    'Put away, the card says one action is registered and waiting, from the server’s own view, and the server offers the Officer no second shot. After a reload it says the same and does not know the target. Nothing about the shot is kept in any tab.',
    'The resolution of that shot at the end of the round is NOT RUN: this slice ends at registration.',
  ]);
}

/**
 * The nine-player scenario for the actions that name one seat. It follows the first round
 * turn by turn, in whatever order the server set: on its own turn each of the Officer, the
 * two Disablers, the Undercover and the Cracker registers its action, and the first player
 * with none of those requests a Hack, which the server then runs as a phase of its own.
 * Every turn is a real 60-second phase.
 */
async function rolesScenario({ display, players, seatOf, matchId }) {
  for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
  const roleOf = new Map();
  for (const player of players) {
    await openPanel(player);
    roleOf.set(player, await player.text('.ms-role-card'));
  }
  assert.equal(new Set(roleOf.values()).size, PLAYERS, 'Nine players, nine different roles');
  const bySeat = new Map(players.map(player => [seatOf.get(player), player]));
  /** What each of these roles registers on its own turn. Nothing here says the role has it: the journey asserts that the server offers it. */
  const PLAN = { Officer: 'shot', 'Blue Disabler': 'disable', 'Red Disabler': 'disable', Undercover: 'protect', Cracker: 'rescue' };
  const WORDS = {
    shot: { command: 'REGISTER_SHOT', accepted: /^Shot at (Player \d|yourself) registered\./ }, disable: { command: 'DISABLE', accepted: /^Disable at (Player \d|yourself) registered\./ },
    protect: { command: 'PROTECT', accepted: /^Protection for (Player \d|yourself) registered\./ }, rescue: { command: 'RESCUE', accepted: /^Rescue of (Player \d|yourself) registered\./ },
    hack: { command: 'REQUEST_HACK', accepted: /^Hack request with Player \d accepted\./ },
  };
  const offers = who => who.page.evaluate("[...document.querySelectorAll('.ms-offer')].map(offer => [offer.dataset.kind, offer.querySelector('.ms-offer__status').textContent, offer.querySelector('button') !== null])");
  const boardOf = async () => JSON.stringify((await display.frame()).model.match.board);
  const phaseOnDisplay = () => display.page.evaluate("(() => { const m = globalThis.mothershipConnected.frame().model.match; return { label: m.phase.roundLabel + ', ' + m.phase.phaseLabel, kind: m.phase.phaseLabel, active: m.board.zones.flatMap(zone => zone.seats).find(seat => seat.isActive)?.number ?? null }; })()");
  /** One action through the card by touch: the first seat the server lists. Returns what was sent and what the card then said. */
  async function act(who, kind) {
    await who.page.waitFor(`document.getElementById('ms-action-open-${kind}') !== null`, `${who.label}: ${kind} is offered`);
    await who.page.tap(`#ms-action-open-${kind}`);
    await who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, `${who.label}: the server's choices are listed`);
    const listed = await who.page.evaluate("[...document.querySelectorAll('button[data-intent=\"action/choose\"]')].map(choice => choice.dataset.value)");
    assert.equal(listed.length > 0, true);
    await who.page.tap('button[data-intent="action/choose"]');
    await who.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, `${who.label}: asked to confirm`);
    const before = (await who.operations('v1Command')).length;
    await tapWhenActive(who, '#ms-action-confirm');
    await cardIs(who, 'accepted', `${kind} is accepted`);
    const sent = (await who.operations('v1Command')).slice(before);
    assert.equal(sent.length, 1, 'One confirmation, one command');
    assert.deepEqual(sent[0].request.command, { type: WORDS[kind].command, targetSeatId: listed[0] });
    assert.deepEqual(sent[0].response.receipt, { protocolVersion: 2, matchId, phaseId: sent[0].request.phaseId, commandId: sent[0].request.commandId, status: 'accepted', code: 'REGISTERED' });
    const said = await card(who);
    // The status mark is drawn in capitals; the words after it are the report.
    assert.match(said.text.replace(/^accepted /i, ''), WORDS[kind].accepted, `${who.label}: ${said.text}`);
    return { listed, target: listed[0], said: said.text };
  }

  const done = [];
  let hack = null;
  let hackPhaseSeen = false;
  let lastLabel = null;
  const turnsSeen = [];
  // Until every planned action is registered and the Hack has been seen, or the ordinary turns run out.
  for (let phases = 0; phases < PLAYERS + 3 && (done.length < Object.keys(PLAN).length || hack === null || !hackPhaseSeen); phases += 1) {
    if (lastLabel !== null) {
      await display.page.waitFor(`(() => { const p = globalThis.mothershipConnected.frame().model.match.phase; return p.roundLabel + ', ' + p.phaseLabel !== ${JSON.stringify(lastLabel)}; })()`, 'the next phase', 90_000);
    }
    await display.page.waitFor("globalThis.mothershipConnected.frame().model.match.phase.timer.state === 'running'", 'the display has the server’s time');
    const phase = await phaseOnDisplay();
    lastLabel = phase.label;
    turnsSeen.push(phase.label);
    if (phase.kind === 'Hack') {
      // The server runs the Hack as a phase of its own. Its two players are told who with; nobody else is.
      hackPhaseSeen = true;
      const partner = bySeat.get(Number(hack.target.slice(5)));
      for (const [who, other] of [[hack.by, partner], [partner, hack.by]]) {
        await openPanel(who);
        await who.page.waitFor("document.getElementById('ms-hack-with') !== null", `${who.label} is told it is in a Hack`);
        assert.equal(await who.text('#ms-hack-with'), `Hack: you and Player ${seatOf.get(other)}.`);
      }
      for (const player of players.filter(candidate => candidate !== hack.by && candidate !== partner)) {
        assert.equal(await player.exists('#ms-hack-with'), false, `${player.label} is not in the Hack and is told nothing of it`);
      }
      assert.equal(/you and Player/.test(await display.page.evaluate('document.body.textContent')), false, 'The shared display does not say who is in it');
      await hack.by.shot('r3-phone-in-a-hack.png');
      await display.shot('r4-table-display-hack-phase.png');
      note(`The Hack phase: Player ${seatOf.get(hack.by)} and Player ${seatOf.get(partner)} are each told who with; nobody else is.`);
      continue;
    }
    if (phase.active === null) break;
    const actor = bySeat.get(phase.active);
    const role = roleOf.get(actor);
    await actor.page.waitFor("globalThis.mothershipConnected.frame().model.match.phase.phaseLabel === 'Your turn' && globalThis.mothershipConnected.frame().model.match.phase.timer.state === 'running'", `${actor.label} sees its own turn`);
    await openPanel(actor);
    await actor.page.waitFor("document.querySelector('.ms-offer') !== null", `${actor.label}: the card lists what is offered`);
    const kind = PLAN[role] ?? null;
    // On its own turn every seat may request a Hack, until two were requested this round.
    const offeredNow = await offers(actor);
    const listedNow = offeredNow.map(offer => offer[0]);
    // No other phone is offered anything that belongs to a turn: only a move, where it still has one.
    for (const player of players.filter(candidate => candidate !== actor)) {
      const theirs = await offers(player);
      // Its card is open and idle, so what follows is read from a list that is really on screen.
      assert.deepEqual(theirs.map(offer => offer[0]).filter(name => name === 'move' || name === 'shot'), ['move', 'shot'], `${player.label}: the idle card is on screen`);
      for (const [name, , hasControl] of theirs) assert.equal(name === 'move' || !hasControl, true, `${player.label} is offered ${name} outside its own turn`);
      assert.deepEqual(theirs.map(offer => offer[0]).filter(name => name !== 'move' && name !== 'shot'), [], `${player.label}: no role action is listed outside its own turn`);
    }
    if (kind !== null) {
      assert.equal(listedNow.includes(kind), true, `Player ${phase.active} (${role}) is offered "${kind}" on its own turn: ${JSON.stringify(listedNow)}`);
      const board = await boardOf();
      const result = await act(actor, kind);
      // Registration is not damage, and nobody else is told.
      await sleep(1_500);
      assert.equal(await boardOf(), board, 'The shared display’s board is what it was before the registration');
      for (const player of players.filter(candidate => candidate !== actor)) {
        assert.equal((await spoken(player)).some(line => /registered|Disable|Protection|Rescue|Shot at/i.test(line)), false, `${player.label} was told nothing`);
      }
      if (done.length === 0) await actor.shot('r1-phone-role-action-registered.png', { selector: '[data-action="connected"]' });
      await tapWhenActive(actor, '#ms-action-dismiss');
      await cardIs(actor, 'idle', 'the card is put away');
      assert.match((await card(actor)).text, /action(s)? of yours (is|are) registered and waiting to be resolved\./, 'The view lists it as waiting');
      assert.equal((await offers(actor)).some(offer => offer[0] === kind && offer[2]), false, `The server offers no second ${kind} this turn`);
      assertStored(await actor.stored(), actor.label, { unresolved: false, alsoAbsent: [...new Set(roleOf.values()), result.target, WORDS[kind].command] });
      done.push({ seat: phase.active, role, kind, targets: result.listed.length, selfListed: result.listed.includes(`seat-${phase.active}`) });
      note(`Player ${phase.active} (${role}) registered "${kind}" on its own turn; the server listed ${result.listed.length} seat(s)${result.listed.includes(`seat-${phase.active}`) ? ', its own among them' : ''}.`);
    } else if (hack === null && offeredNow.some(offer => offer[0] === 'hack' && offer[2])) {
      const result = await act(actor, 'hack');
      await actor.shot('r2-phone-hack-requested.png', { selector: '[data-action="connected"]' });
      await tapWhenActive(actor, '#ms-action-dismiss');
      await cardIs(actor, 'idle', 'the card is put away');
      assert.equal((await offers(actor)).some(offer => offer[0] === 'hack' && offer[2]), false, 'One Hack request: the server offers no second');
      hack = { by: actor, target: result.target };
      note(`Player ${phase.active} (${role}) requested a Hack with Player ${result.target.slice(5)}; accepted.`);
    }
  }

  assert.deepEqual(done.map(entry => entry.role).sort(), Object.keys(PLAN).sort(), 'Each of the five roles registered its action on its own turn');
  assert.notEqual(hack, null, 'A Hack was requested');
  assert.equal(hackPhaseSeen, true, 'and the server ran it as a phase');
  for (const who of [display, ...players]) assert.equal((await who.operations('v1Command')).length, who === display ? 0 : [...done.map(entry => bySeat.get(entry.seat)), hack.by].filter(actor => actor === who).length, `${who.label}: only what it confirmed was sent`);
  await display.shot('r5-table-display-after-the-registrations.png');
  facts.match = {
    note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
    playerCount: PLAYERS,
    phasesFollowed: turnsSeen,
    registered: done,
    hack: { requestedBySeat: seatOf.get(hack.by), withSeat: Number(hack.target.slice(5)) },
  };
  established('6c. Each role’s action that names one seat, on its own turn (nine players, one round)', [
    `The journey followed ${turnsSeen.length} phases of the first round in the server’s own order: ${turnsSeen.map(label => `"${label.replace('Round 1, ', '')}"`).join(', ')}.`,
    ...done.map(entry => `Player ${entry.seat} (${entry.role}): on its own turn the phone had a control for "${entry.kind}", with ${entry.targets} seat(s) from the server${entry.selfListed ? ', its own among them' : ''}; one confirmation sent one ${WORDS[entry.kind].command}; receipt accepted, REGISTERED.`),
    'After each registration the shared display’s board was identical to before, no other phone was told anything, and the acting phone’s card then said an action was registered and waiting, from the server’s own view.',
    'On every ordinary turn followed, every other phone’s card was on screen and idle; it listed a move and a shot and nothing else, and had a control for nothing but a move. So a Disable, Protection or a Rescue was listed on a phone only during that phone’s own turn.',
    `Hack: Player ${seatOf.get(hack.by)} requested one with Player ${hack.target.slice(5)} (REQUEST_HACK, accepted). When that turn ended the server opened a Hack phase; the two players’ phones each said who with, no other phone and not the display did.`,
    'NOT RUN: what any of these registrations resolves to at the end of the round, and the voting phases after it.',
  ]);
}

const browserErrors = [];
async function main() {
  const hub = await fetch(HUB).then(response => response.json()).catch(() => null);
  if (hub === null || !hub.auth || !hub.firestore || !hub.functions) throw new Error('The local Auth, Firestore and Functions emulators are not running. See apps/game/dev/connected/README.md.');
  if (outDir !== null) await mkdir(outDir, { recursive: true });
  const served = await preview();
  const launched = await launchBrowser();
  const browser = await connect(launched.endpoint);
  browser.on(message => {
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  });
  try {
    await (async () => {
    facts.run.browser = (await browser.send('Browser.getVersion')).product;
    facts.run.previewServer = served.reused ? 'already running' : 'started by this script';
    note(`Browser: ${facts.run.browser}. Preview server: ${facts.run.previewServer}.`);

    const host = await device(browser, 'host', DESK);
    const display = await device(browser, 'display', DESK);
    const players = [];
    for (let index = 0; index < PLAYERS; index += 1) players.push(await device(browser, `player-${index + 1}`, PHONE));
    const everyone = [host, display, ...players];

    // ---------------------------------------------------------------- 1. The host creates a lobby
    await host.open('host', "document.getElementById('connected-create')");
    assert.equal(await host.page.evaluate("document.getElementById('connected-player-count').value"), '7', 'Seven players unless the host says otherwise');
    // The one control set through the page's own DOM instead of by input: a list on a development console.
    if (PLAYERS !== 7) await host.page.evaluate(`(() => { const count = document.getElementById('connected-player-count'); count.value = '${PLAYERS}'; count.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await host.page.click('#connected-create');
    await host.page.waitFor("/^[A-F0-9]{12}$/.test(document.getElementById('connected-room-code')?.textContent ?? '')", 'the room code on the host console');
    const matchId = await host.text('#connected-match-id');
    const roomCode = await host.text('#connected-room-code');
    await host.page.waitFor("document.getElementById('connected-match-status').textContent === 'lobby'", 'the lobby is open');
    assert.equal(await host.text('#connected-seated'), `0 of ${PLAYERS} seated`);
    assert.equal((await host.operations('v1CreateMatch')).length, 1);
    await host.shot('01-host-lobby-created.png');
    established(`1. The host creates a ${WORDS[PLAYERS]}-player lobby`, [
      'One v1CreateMatch from the host page; the answer named a match and a twelve-character room code.',
      `The host console then read the lobby from its own session document and the lobby document: 0 of ${PLAYERS} seated, status "lobby".`,
    ]);

    // ---------------------------------------------------------------- 2. Players authenticate and request admission
    await Promise.all(players.map(player => player.open('player', "document.getElementById('connected-join')")));
    await display.open('display', "document.getElementById('connected-watch')");
    const uids = new Map();
    for (const who of everyone) uids.set(who, await who.uid());
    assert.equal(new Set(uids.values()).size, PLAYERS + 2, 'Every device has an identity of its own');
    for (const [index, player] of players.entries()) {
      await player.page.tap('#connected-room-code-input');
      await player.page.type(roomCode);
      if (index % 2 === 1) await player.page.evaluate("(() => { const room = document.getElementById('connected-initial-room'); room.value = 'Room B'; room.dispatchEvent(new Event('change', { bubbles: true })); })()");
      await player.page.waitFor("document.getElementById('connected-join') !== null", 'the join control');
      await player.page.tap('#connected-join');
    }
    for (const player of players) {
      await player.page.waitFor("document.getElementById('connected-waiting')?.textContent.startsWith('Waiting for the host')", `${player.label} is waiting to be seated`);
      assert.equal(await player.text('#connected-seat'), 'Not seated yet');
      assert.equal(await player.exists('.ms-shell'), false, 'Asking shows nothing of a match');
    }
    await players[0].shot('02-player-waiting-to-be-seated.png');
    established('2. Players authenticate and request admission', [
      `${PLAYERS + 2} browser contexts signed in anonymously to the Auth emulator and hold ${PLAYERS + 2} different identities.`,
      `${PLAYERS} of them asked to join with the room code (${Math.ceil(PLAYERS / 2)} starting in Room A, ${Math.floor(PLAYERS / 2)} in Room B) and are waiting; none shows anything of a match.`,
    ]);

    // ---------------------------------------------------------------- 3. The host approves seats and starts the match
    await host.page.waitFor(`document.querySelectorAll('#connected-requests li[data-status="pending"]').length === ${PLAYERS}`, 'every request is on the host console');
    assert.equal(await host.page.evaluate("document.getElementById('connected-start').disabled"), true, 'The match cannot be started before every seat is taken');
    await host.shot('03-host-requests.png');
    // The keyboard does the seating: Tab to the first request's control, Enter, and focus moves on to the next.
    for (let seated = 1; seated <= PLAYERS; seated += 1) {
      await host.page.evaluate("document.querySelector('#connected-requests button[data-approve]').id = 'connected-next-approve'");
      await host.page.tabTo('connected-next-approve', 40);
      await host.page.press('Enter');
      await host.page.waitFor(`document.getElementById('connected-seated').textContent === '${seated} of ${PLAYERS} seated'`, `${seated} seated`);
    }
    assert.equal((await host.operations('v1ApproveAdmission')).length, PLAYERS);
    for (const player of players) await player.page.waitFor("document.getElementById('connected-waiting')?.textContent.startsWith('Seated.')", `${player.label} learns its seat`);
    const seatOf = new Map();
    for (const player of players) seatOf.set(player, Number((await player.text('#connected-seat')).replace('Player ', '')));
    assert.deepEqual([...seatOf.values()].sort(), Array.from({ length: PLAYERS }, (unused, index) => index + 1), 'Every player has a seat of its own');

    // The display shows its identifier and waits; the host admits it by that identifier.
    await display.page.click('#connected-match-input');
    await display.page.type(matchId);
    await display.page.click('#connected-watch');
    await display.page.waitFor("document.getElementById('connected-waiting') !== null", 'the display is waiting');
    await host.page.click('#connected-display-uid');
    await host.page.type(uids.get(display));
    await host.page.click('#connected-admit-display');
    // The first operations after the page server or the emulators were (re)started can be slow. If this one does not
    // come through, say what the console said instead of only that time ran out.
    await host.page.waitFor("document.getElementById('connected-status').textContent === 'Admitting the display: done.'", 'the display is admitted', 30_000).catch(async error => {
      throw new Error(`${error.message}. The host console said: "${await host.text('#connected-status')}"; the display field held ${JSON.stringify(await host.page.evaluate("document.getElementById('connected-display-uid').value"))}; admissions sent: ${JSON.stringify((await host.operations('v1AdmitDisplay')).map(call => call.response?.ok ?? call.response?.error?.code ?? 'no answer'))}`);
    });
    assert.equal(await display.exists('.ms-shell'), false, 'An admitted display shows no match before one has started');

    await host.page.waitFor("document.getElementById('connected-start').disabled === false", 'the start control is available');
    // One scenario ends here, before anything starts.
    if (SCENARIO === 'lobby-end') return await lobbyEndScenario({ host, display, players, matchId });
    await host.page.tabTo('connected-start', 40);
    const pressedStartAt = Date.now();
    await host.page.press('Enter');
    await host.page.waitFor("document.getElementById('connected-match-status').textContent === 'running'", 'the match is running');
    assert.equal((await host.operations('v1StartMatch')).length, 1);
    await host.shot('04-host-match-running.png');
    established('3. The host approves seats and starts the match', [
      `The host console listed ${PLAYERS} requests; each was seated with the keyboard alone (Tab, Enter), ${PLAYERS} v1ApproveAdmission calls, and each player page learned its seat from its own admission document.`,
      'The display was admitted by the identifier it shows, and showed no match before the start.',
      'One v1StartMatch; the host console then read status "running".',
    ]);

    if (SCENARIO === 'shot') return await shotScenario({ display, players, seatOf, matchId });
    if (SCENARIO === 'roles') return await rolesScenario({ display, players, seatOf, matchId });
    if (SCENARIO === 'votes') return await votesScenario({ display, players, seatOf, matchId });
    if (SCENARIO === 'knowledge') return await knowledgeScenario({ display, players, seatOf, matchId });
    if (SCENARIO === 'end') return await endScenario({ host, display, players, seatOf, matchId });

    // ---------------------------------------------------------------- 4. Each player receives only their authorized private view
    for (const who of [display, ...players]) await who.page.waitFor(MATCH, `${who.label} shows the match`, 20_000);
    for (const who of everyone) assert.equal(await who.page.evaluate('document.visibilityState'), 'visible', `${who.label} is a page in front of its user`);
    const [A, B, C, D, E, F, G] = players;
    const roles = new Map();
    for (const player of players) {
      assert.equal(await player.text('#ms-title'), `You are Player ${seatOf.get(player)}`);
      assert.equal(await player.text('#ms-banner-source'), 'Local emulator. A development backend, not a live match.', 'The screen says which backend it is on');
      assert.equal(/fixture/i.test(await player.page.evaluate('document.body.textContent')), false, 'and nothing on it says "fixture"');
      // Closed: nothing private is in the model or in the document.
      assert.equal((await player.frame()).model.match.privateArea.content, null);
      assert.equal(await player.exists('.ms-role-card'), false);
      if (player === B) {
        // One player uses the keyboard for everything.
        await B.page.tabTo('ms-private-toggle', 30);
        await B.page.press('Enter');
        await B.page.waitFor("document.querySelector('.ms-role-card') !== null", `${B.label}: the private panel is open`);
      } else {
        await openPanel(player);
      }
      roles.set(player, await player.text('.ms-role-card'));
      // Nothing can be started until this device has the server's time. Then: what the
      // server offers this seat now, in words: a move, and no shot. Those are the first two
      // rows; a role's own action may be listed after them, and the roles journey checks those.
      await player.page.waitFor("document.getElementById('ms-action-open-move') !== null", `${player.label}: the clock is trusted and a move is offered`);
      assert.deepEqual(await player.page.evaluate("[...document.querySelectorAll('.ms-offer')].slice(0, 2).map(offer => [offer.dataset.kind, offer.querySelector('.ms-offer__status').textContent, offer.querySelector('button') !== null])"),
        [['move', 'Available', true], ['shot', 'Not available', false]], `${player.label}: a move is offered and no shot`);
    }
    assert.deepEqual([...roles.values()].sort(), SEVEN_PLAYER_ROLES, 'Seven players hold the seven roles of the seven-player roster, each once');
    for (const player of players) {
      const shown = await shownApartFromWhatItIsTold(player);
      for (const role of SEVEN_PLAYER_ROLES) {
        assert.equal(new RegExp(`\\b${role}\\b`).test(shown), role === roles.get(player), `${player.label} shows its own role and no other (${role})`);
      }
      const expected = [`matches/${matchId}/admissions/<its own request>`, `matches/${matchId}/lobby/public`, `matches/${matchId}/playerViews/${uids.get(player)}`];
      assert.deepEqual([...player.listened].map(path => path.replace(/\/admissions\/[0-9a-f]{64}$/, '/admissions/<its own request>')).sort(), expected, `${player.label} listens to its own request, the lobby and its own view, and to nothing else`);
      assert.deepEqual((await player.operations('v1Command')).length + (await player.operations('v1Receipt')).length, 0);
      assertStored(await player.stored(), player.label, { unresolved: false });
    }
    await A.shot('05-phone-private-panel-open.png');
    established('4. Each player receives only their authorized private view', [
      'Seven phones show seven different seats and, with the private panel open, the seven roles of the seven-player roster, each exactly once. Apart from the list of what its own seat is told, which the knowledge journey checks, no phone names a role that is not its own. With the panel closed nothing private was in the page or its model.',
      'Each phone asked Firestore for three things in all: its own admission request, the lobby, and the private view stored under its own identity. No phone asked for another view.',
      'Every phone says it is on the local emulator.',
      'What each phone keeps in the browser: its sign-in for this tab, which match the tab is in, and the Firebase SDK’s own heartbeat record. No role, location, target or view.',
    ]);

    // ---------------------------------------------------------------- 5. The shared display receives only public information
    const table = await display.frame();
    assert.deepEqual([table.model.surface, table.model.mode, table.model.connection], ['table', 'emulator', 'live']);
    assert.equal(table.model.match.board.zones.flatMap(zone => zone.seats).length, 7);
    const tableShows = `${JSON.stringify(table)} ${await display.page.evaluate('document.body.textContent')}`;
    for (const role of SEVEN_PLAYER_ROLES) assert.equal(new RegExp(`\\b${role}\\b`).test(tableShows), false, `The display shows no role (${role})`);
    assert.equal(await display.exists('[data-region="private"]'), false, 'The display has no private panel');
    assert.equal(await display.exists('button[data-intent^="action/"]'), false, 'The display has no control that sends a command');
    assert.deepEqual([...display.listened].sort(), [`matches/${matchId}/lobby/public`, `matches/${matchId}/views/public`], 'The display listens to the lobby and the public view only');
    assert.deepEqual([...host.listened].sort(), [`matches/${matchId}/admissions/*`, `matches/${matchId}/control/session`, `matches/${matchId}/lobby/public`], 'The host console listens to its session, the lobby and the requests only');
    const startPlaces = new Map();
    for (const player of players) startPlaces.set(player, await shownAt(display, seatOf.get(player)));
    await display.shot('06-table-display.png');
    established('5. The shared display receives only public information', [
      'The display listens to two documents: the lobby and the public view. It shows seven seats with their public location and health, the phase and the countdown.',
      'No role name is anywhere in its page or model, it has no private panel, and it has no control that could send a command.',
    ]);

    // ---------------------------------------------------------------- 6. A player performs a legal movement
    await roomFor(A, 12);
    const destinationA = await chooseMove(A);
    assert.notEqual(destinationA, startPlaces.get(A), 'The server offers somewhere other than where the player is');
    assert.equal((await A.operations('v1Command')).length, 0, 'Choosing sends nothing');
    await cardShot(A, '07-phone-confirm-move.png', '#ms-action-confirm');
    await tapWhenActive(A, '#ms-action-confirm');
    await cardIs(A, 'accepted', 'the move is accepted');
    const [sentA, ...moreA] = await A.operations('v1Command');
    assert.equal(moreA.length, 0, 'One tap, one command');
    assert.deepEqual([sentA.request.protocolVersion, sentA.request.matchId, sentA.request.command], [2, matchId, { type: 'MOVE', destination: destinationA }]);
    assert.deepEqual(sentA.response.receipt, { protocolVersion: 2, matchId, phaseId: sentA.request.phaseId, commandId: sentA.request.commandId, status: 'accepted', code: 'REGISTERED' });
    // The card says what the server accepted. Where the player is, is read from the view, below.
    assert.match((await card(A)).text, new RegExp(`Move to ${destinationA} accepted\\.`));
    await waitShownAt(display, seatOf.get(A), destinationA, 'the display shows the move');
    await A.page.waitFor(`globalThis.mothershipConnected.frame().model.match.location.name === ${JSON.stringify(destinationA)}`, 'the mover’s own screen shows the move');
    await cardShot(A, '08-phone-move-accepted.png', '#ms-action-dismiss');
    await tapWhenActive(A, '#ms-action-dismiss');
    await cardIs(A, 'idle', 'the card is put away');
    assert.equal(await A.exists('#ms-action-open-move'), false, 'One move a round: the server offers no second one');
    assert.equal((await A.operations('v1Command')).length, 1);

    // The same by keyboard alone.
    await roomFor(B, 12);
    const keyboard = [];
    await B.page.tabTo('ms-action-open-move', 30);
    await B.page.press('Enter');
    await B.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'choosing'`, `${B.label}: destinations are listed`);
    keyboard.push(['after opening', await focused(B)]);
    await B.page.press('Tab');
    const destinationB = await B.page.evaluate("document.activeElement?.dataset.intent === 'action/choose' ? document.activeElement.dataset.value : null");
    assert.notEqual(destinationB, null, 'One Tab from the prompt is the first destination');
    await B.page.press('Enter');
    await B.page.waitFor(`document.querySelector('${CARD}')?.dataset.step === 'confirming'`, `${B.label}: asked to confirm`);
    keyboard.push(['after choosing', await focused(B)]);
    await B.page.waitFor("document.getElementById('ms-action-confirm')?.getAttribute('aria-disabled') !== 'true'", `${B.label}: the confirm control is active`);
    await B.page.tabTo('ms-action-confirm', 6);
    await B.page.press('Enter');
    await cardIs(B, 'accepted', 'the move is accepted');
    keyboard.push(['after the answer', await focused(B)]);
    // Focus goes to the line that says what the card now asks, and during a request it rests on
    // the card's title, which is not redrawn. It is never put on a control that could send.
    assert.deepEqual(keyboard, [['after opening', 'ms-action-step'], ['after choosing', 'ms-action-step'], ['after the answer', 'ms-action-title']]);
    const [sentB, ...moreB] = await B.operations('v1Command');
    assert.equal(moreB.length, 0);
    assert.deepEqual([sentB.request.command, sentB.response.receipt.status, sentB.response.receipt.commandId], [{ type: 'MOVE', destination: destinationB }, 'accepted', sentB.request.commandId]);
    await waitShownAt(display, seatOf.get(B), destinationB, 'the display shows the second move');
    established('6. A player performs a legal movement', [
      `By touch: Player ${seatOf.get(A)} chose "${destinationA}" from the destinations the server offered, confirmed, and the page sent one v1Command (MOVE). Choosing sent nothing.`,
      `By keyboard alone: Player ${seatOf.get(B)} moved to "${destinationB}" with Tab and Enter. Focus went to the card’s own prompt at each step and rested on the card’s title while the request was out; it was never put on a control that could send.`,
      'After each move the shared display and the mover’s own screen show the new location, from the server’s views; the mover is offered no second move this round.',
      'No shot is offered to anyone: a seven-player match has no ordinary shot before round 4 (adoption assessment, G5). Registering a shot is NOT RUN in this journey.',
    ]);

    // ---------------------------------------------------------------- 8a. The answer is lost
    await roomFor(C, 15);
    C.fault.dropCommandAnswer = 1;
    const destinationC = await chooseMove(C);
    await tapWhenActive(C, '#ms-action-confirm');
    await cardIs(C, 'accepted', 'the lost answer is found');
    const commandsC = await C.operations('v1Command');
    const lookupsC = await C.operations('v1Receipt');
    assert.deepEqual(commandsC.map(call => [call.dropped, call.response]), [['answer', null]], 'One command left the page; its answer never arrived');
    assert.equal(lookupsC.length >= 1, true);
    assert.deepEqual([lookupsC.at(-1).request.commandId, lookupsC.at(-1).response.status, lookupsC.at(-1).response.receipt.status], [commandsC[0].request.commandId, 'found', 'accepted']);
    await waitShownAt(display, seatOf.get(C), destinationC, 'the display shows the move whose answer was lost');

    // ---------------------------------------------------------------- 8b. The request is lost
    await roomFor(D, 15);
    D.fault.dropCommandRequest = 1;
    const destinationD = await chooseMove(D);
    await tapWhenActive(D, '#ms-action-confirm');
    await cardIs(D, 'accepted', 'the lost request is sent again');
    const commandsD = await D.operations('v1Command');
    const lookupsD = await D.operations('v1Receipt');
    assert.deepEqual(commandsD.map(call => call.dropped ?? call.response?.receipt?.status), ['request', 'accepted'], 'The first never left the browser; the second was accepted');
    assert.deepEqual(commandsD[1].request, commandsD[0].request, 'What was sent again is the identical request, with the same identifier');
    assert.deepEqual(lookupsD.map(call => call.response?.status), ['unknown'], 'Before sending again the page asked, and the server knew of no such command');
    await waitShownAt(display, seatOf.get(D), destinationD, 'the display shows the move that was sent twice');
    established('8a/8b. Unresolved commands are reconciled, without a second effect', [
      `Answer lost (dropped in the browser after the server had decided): Player ${seatOf.get(C)}’s page sent one v1Command, heard nothing, asked v1Receipt, found the accepted receipt and showed the move. It sent no second command.`,
      `Request lost (dropped before it left the browser): Player ${seatOf.get(D)}’s page heard nothing, asked v1Receipt, was told "unknown", sent the identical request again under the same identifier, and it was accepted once.`,
      'Both moves are in the authoritative public view, each once.',
    ]);

    // ---------------------------------------------------------------- 8c. A reload with a command unresolved
    await roomFor(E, 28);
    const uidE = await E.uid();
    E.fault.dropCommandAnswer = 1;
    E.fault.dropReceiptRequests = true;
    const destinationE = await chooseMove(E);
    await tapWhenActive(E, '#ms-action-confirm');
    await cardIs(E, 'checking', 'the command is unresolved');
    const keptE = await E.stored();
    assertStored(keptE, `${E.label}, with a command unresolved`, { unresolved: true });
    const kept = JSON.parse(keptE.session['mothership:unresolved-command']);
    const [sentE] = await E.operations('v1Command');
    assert.deepEqual(kept, { matchId, seatId: `seat-${seatOf.get(E)}`, phaseId: sentE.request.phaseId, commandId: sentE.request.commandId }, 'Four identifiers are kept, and nothing about what the command was');
    assert.equal(await E.exists('button[data-intent="action/open"], button[data-intent="action/choose"], button[data-intent="action/confirm"]'), false, 'While one command is unresolved the card offers no way to start another');
    await E.shot('09-phone-command-unresolved.png', { selector: '[data-action="connected"]' });   // at once: it will not stay unresolved for long

    const reloadedAt = Date.now();
    await E.page.reload(MATCH, 20_000);
    assert.equal(await E.uid(), uidE, 'The reload kept the identity, so it kept the seat');
    assert.equal(await E.text('#ms-title'), `You are Player ${seatOf.get(E)}`);
    assert.equal(await E.exists('.ms-role-card'), false, 'A reloaded page shows nothing private until it is asked to');
    await openPanel(E);
    await cardIs(E, 'unknown', 'the reloaded page cannot find out', 20_000);
    const unknownE = await card(E);
    assert.match(unknownE.text, /This page was reloaded before the server answered, so it cannot send the action again\./);
    assert.equal(unknownE.text.includes(destinationE), false, 'The reloaded page does not know what the action was');
    assert.equal(await E.exists('button[data-intent="action/open"]'), false, 'and still offers no way to start another');
    await cardShot(E, '10-phone-reloaded-result-unknown.png', '#ms-action-check');
    E.fault.dropReceiptRequests = false;
    await tapWhenActive(E, '#ms-action-check');
    await cardIs(E, 'accepted', 'the reloaded page learns the command was accepted');
    const acceptedE = await card(E);
    assert.match(acceptedE.text, /The server accepted your action\./);
    assert.equal(acceptedE.text.includes(destinationE), false);
    const afterReload = (await E.operations('v1Command')).filter(call => call.at >= reloadedAt);
    assert.equal(afterReload.length, 0, 'A reloaded page sends no command: it only asks');
    assert.equal((await E.operations('v1Command')).length, 1);
    await waitShownAt(display, seatOf.get(E), destinationE, 'the display shows the move made before the reload');
    await E.page.waitFor(`globalThis.mothershipConnected.frame().model.match.location.name === ${JSON.stringify(destinationE)}`, 'the reloaded page shows where its player now is');
    await cardShot(E, '11-phone-reloaded-accepted.png', '#ms-action-dismiss');
    assertStored(await E.stored(), `${E.label}, once resolved`, { unresolved: false });
    established('8c. Reload with a command unresolved', [
      `Player ${seatOf.get(E)} confirmed a move; its answer and every lookup were dropped in the browser, so the command stayed unresolved. The tab then held exactly four identifiers for it (match, seat, phase, command) and nothing about the move.`,
      'While it was unresolved the card offered no way to start another action.',
      'The page was reloaded. The same identity came back from the tab’s session, so the same seat; nothing private was shown until the panel was opened.',
      'The reloaded page sent no command at all. It asked for the receipt, and while its lookups were still being dropped it said the result was unknown and that it could not send the action again.',
      'With lookups let through, "Check again" found the receipt: accepted. The page says the action was accepted and that it no longer knows what it was. The move is in the authoritative views. The four identifiers are gone from the tab.',
    ]);

    // ---------------------------------------------------------------- 7. Authoritative phase changes; an unsent choice does not outlive its phase
    await roomFor(F, 6);
    const phaseF = await phaseOf(F);
    const destinationF = await chooseMove(F);
    await cardShot(F, '12-phone-choice-not-sent.png', '#ms-action-confirm');
    note(`Player ${seatOf.get(F)} has chosen "${destinationF}" and not confirmed. Waiting for the server to end "${phaseF.label}".`);
    await F.page.waitFor(`(() => {
      const phase = globalThis.mothershipConnected.frame().model.match.phase;
      return phase.roundLabel + ', ' + phase.phaseLabel !== ${JSON.stringify(phaseF.label)};
    })()`, 'the next phase on the phone', 90_000);
    await cardIs(F, 'idle', 'the unsent choice is gone');
    assert.equal((await F.operations('v1Command')).length, 0, 'Nothing was sent for a choice that was never confirmed');
    assert.equal((await spoken(F)).includes('Your choice was not sent.'), true, 'and the player is told so');
    assert.equal(await shownAt(display, seatOf.get(F)), startPlaces.get(F), 'The player has not moved');
    const phasesSeen = await display.page.evaluate('window.__phases');
    assert.equal(phasesSeen.length >= 2, true);
    assert.equal(phasesSeen[1].at - pressedStartAt >= 60_000, true, `The first phase did not end before its 60 seconds were up (${phasesSeen[1].at - pressedStartAt} ms after the start was pressed)`);
    for (let index = 2; index < phasesSeen.length; index += 1) {
      const lasted = phasesSeen[index].at - phasesSeen[index - 1].at;
      assert.equal(lasted > 58_500 && lasted < 70_000, true, `Each later phase lasted about its 60 seconds as the display saw it (${lasted} ms)`);
    }
    const advances = [];
    for (const who of [display, ...players]) {
      for (const call of await who.operations('v1Advance')) {
        advances.push({ from: who.label, result: call.response?.result ?? call.response?.error?.code ?? null, secondsAfterStartPressed: Number(((call.at - pressedStartAt) / 1000).toFixed(1)) });
      }
    }
    advances.sort((a, b) => a.secondsAfterStartPressed - b.secondsAfterStartPressed);
    assert.equal(advances.length >= 1, true, 'Somebody asked the server to look at the deadline');
    assert.equal(advances.every(call => call.secondsAfterStartPressed >= 60), true, 'Nobody asked before the 60 seconds were up');
    assert.equal(advances.filter(call => call.result === 'advanced').length, 1, 'The server advanced the phase once, whoever asked and however often');
    assert.deepEqual(advances.filter(call => call.result !== 'advanced' && call.result !== 'unchanged'), []);
    established('7. Real receipts and authoritative phase changes', [
      'Every receipt above is the backend’s own: accepted and REGISTERED, carrying the identifier of the command the page sent, and found again by lookup where the answer was lost.',
      `The shared display showed ${phasesSeen.length} phases: ${phasesSeen.map(phase => `"${phase.label}"`).join(', ')}. The first ended ${((phasesSeen[1].at - pressedStartAt) / 1000).toFixed(1)} s after the host pressed Start, never earlier than the server’s 60-second window.`,
      `Deadline catch-up the pages asked for (v1Advance): ${advances.map(call => `${call.from} at ${call.secondsAfterStartPressed} s, "${call.result}"`).join('; ')}. Nobody asked before the 60 seconds were up, and the server advanced the phase once.`,
      `Player ${seatOf.get(F)} had chosen "${destinationF}" and not confirmed when the phase changed. The choice was dropped, nothing was sent, the player was told "Your choice was not sent.", and the player had not moved.`,
    ]);

    // ---------------------------------------------------------------- 8d. Reconnect; and a retry delay is respected
    await roomFor(G, 40);
    await G.page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const offlineAt = Date.now();
    await G.page.waitFor("document.getElementById('ms-banner-connection') !== null", 'the phone says the connection is lost', 30_000);
    note(`Player ${seatOf.get(G)}’s phone noticed the lost connection after ${((Date.now() - offlineAt) / 1000).toFixed(1)} s.`);
    assert.match(await G.text('#ms-banner-connection'), /^Connection lost\. Showing the last known state, which may be out of date\./);
    assert.equal(await G.exists('button[data-intent="action/open"]'), false, 'Nothing can be started on a view the server has not confirmed');
    assert.match(await G.page.evaluate("document.querySelector('[data-region=\"actions\"]').textContent"), /Actions are paused until the connection is restored\./);
    assert.equal(await G.page.evaluate("document.querySelector('.ms-offer[data-kind=\"move\"] .ms-offer__status').textContent"), 'Paused', 'It does not call a move "available" on a view it can no longer vouch for');
    await G.shot('13-phone-connection-lost.png');

    // Meanwhile another player moves, and is told to slow down first (INJECTED: see the top of this file).
    F.fault.slowDownOnce = 3_000;
    const destinationF2 = await chooseMove(F);
    await tapWhenActive(F, '#ms-action-confirm');
    await cardIs(F, 'accepted', 'the move goes through after the wait', 20_000);
    const commandsF = await F.operations('v1Command');
    const lookupsF = await F.operations('v1Receipt');
    assert.deepEqual(commandsF.map(call => call.injected ? 'injected RATE_LIMITED' : call.response?.receipt?.status), ['injected RATE_LIMITED', 'accepted']);
    assert.deepEqual(commandsF[1].request, commandsF[0].request, 'After the wait, the identical request');
    const nextRequestAt = Math.min(commandsF[1].at, ...lookupsF.map(call => call.at));
    assert.equal(nextRequestAt - commandsF[0].at >= 3_000, true, `Nothing was sent for this command during the 3 seconds the answer named (${nextRequestAt - commandsF[0].at} ms)`);
    await waitShownAt(display, seatOf.get(F), destinationF2, 'the display shows the move');
    assert.notEqual((await G.frame()).model.match.roster.zones.flatMap(zone => zone.seats).find(entry => entry.number === seatOf.get(F)).location, destinationF2, 'The disconnected phone still shows the last state it was sent');

    await G.page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const onlineAt = Date.now();
    await G.page.waitFor("document.getElementById('ms-banner-connection') === null && globalThis.mothershipConnected.frame().model.connection === 'live'", 'the phone is connected again', 60_000);
    note(`Player ${seatOf.get(G)}’s phone was current again ${((Date.now() - onlineAt) / 1000).toFixed(1)} s after the network came back.`);
    assert.equal((await G.frame()).model.match.roster.zones.flatMap(zone => zone.seats).find(entry => entry.number === seatOf.get(F)).location, destinationF2, 'Reconnected, it shows what happened while it was away');
    await roomFor(G, 12);
    const destinationG = await chooseMove(G);
    await tapWhenActive(G, '#ms-action-confirm');
    await cardIs(G, 'accepted', 'a move after reconnecting is accepted');
    assert.equal((await G.operations('v1Command')).length, 1);
    await waitShownAt(display, seatOf.get(G), destinationG, 'the display shows the move made after reconnecting');
    established('8d. Reconnect, and a retry delay', [
      `Player ${seatOf.get(G)}’s phone was taken offline in the browser. It said the connection was lost and that what it showed might be out of date, paused its actions, and offered nothing to start.`,
      `INJECTED, not from the backend: Player ${seatOf.get(F)}’s first command was answered "RATE_LIMITED, retry after 3000 ms" by this script. The page sent nothing more for that command for ${nextRequestAt - commandsF[0].at} ms, then sent the identical request, which the backend accepted.`,
      'Back online, the phone was current again by itself, showed the move made while it was away, offered its own move again, and that move was accepted.',
    ]);

    // ---------------------------------------------------------------- 9. What is left behind
    const finalPlaces = new Map();
    for (const player of players) finalPlaces.set(player, await shownAt(display, seatOf.get(player)));
    const expectedPlaces = new Map([[A, destinationA], [B, destinationB], [C, destinationC], [D, destinationD], [E, destinationE], [F, destinationF2], [G, destinationG]]);
    for (const player of players) assert.equal(finalPlaces.get(player), expectedPlaces.get(player), `${player.label} is where its one accepted move put it`);
    const accepted = [];
    for (const player of players) {
      const commands = await player.operations('v1Command');
      const identifiers = new Set(commands.map(call => call.request.commandId));
      assert.equal(identifiers.size, 1, `${player.label} used one command identifier in the whole journey`);
      accepted.push(...identifiers);
      assertStored(await player.stored(), `${player.label}, at the end`, { unresolved: false });
    }
    assert.equal(new Set(accepted).size, 7);
    assert.deepEqual([(await display.operations('v1Command')).length, (await display.operations('v1Receipt')).length, (await host.operations('v1Command')).length], [0, 0, 0], 'Neither the display nor the host console ever sent a command or asked for a receipt');
    const displayStored = await display.stored();
    assertStored(displayStored, display.label, { unresolved: false });
    assertStored(await host.stored(), host.label, { unresolved: false });
    await display.shot('14-table-display-after-seven-moves.png');
    facts.match = {
      note: 'A throwaway match on the local emulator with anonymous emulator identities. Nothing here is a real match or a real person.',
      playerCount: 7,
      seats: players.map(player => ({ seat: seatOf.get(player), device: player.label, startedIn: startPlaces.get(player), movedTo: finalPlaces.get(player) })),
      phasesShownByTheDisplay: phasesSeen.map(phase => ({ label: phase.label, secondsAfterStartPressed: Number(((phase.at - pressedStartAt) / 1000).toFixed(1)) })),
      operations: Object.fromEntries(everyone.map(who => [who.label, who.calls.reduce((counts, call) => ({ ...counts, [call.operation]: (counts[call.operation] ?? 0) + 1 }), {})])),
    };
    established('9. At the end', [
      'Seven players, seven accepted moves, seven command identifiers; every seat is where its one move put it in the authoritative public view.',
      'No tab holds anything of the match but its sign-in and which match it is in. The display and the host console never sent a command.',
    ]);
    })();
    // Whichever scenario ran, and only if it held to its end.
    await noPageReloadedItself();
  } finally {
    if (outDir !== null) {
      await writeFile(join(outDir, 'journey-log.txt'), `${log.join('\n')}\n`);
      await writeFile(join(outDir, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
    }
    browser.close();
    await launched.close();
    await served.close();
  }
}

main().then(() => {
  if (browserErrors.length > 0) {
    console.error(`Uncaught errors in a page:\n${browserErrors.join('\n')}`);
    process.exitCode = 1;
  }
}, error => {
  console.error(error);
  if (browserErrors.length > 0) console.error(`Uncaught errors in a page:\n${browserErrors.join('\n')}`);
  process.exitCode = 1;
});

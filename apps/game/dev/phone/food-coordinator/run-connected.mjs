globalThis[Symbol.for('mothership:dev-only')]=true;

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {mkdir, readFile, writeFile, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startFoodTrialBridge, createFoodApplySignal} from './bridge.mjs';
import {reviewedFoodBackend} from './backend.mjs';
import {launchBrowser, connect, openPage, sleep} from '../../capture/browser.mjs';
import {createHostedPreviewHeaders} from '../../../../../scripts/hosted-preview-policy.mjs';

const paths = new Map();
const tests = [];
for (const argument of process.argv.slice(2)) {
  const match = /^--(backend|bundle|artwork|output|java|firestore-jar)=(.+)$/.exec(argument);
  if (!match) tests.push(argument);
  else {
    assert.ok(!paths.has(match[1]), 'Pass one --' + match[1]);
    paths.set(match[1], resolve(match[2]));
  }
}
assert.ok(paths.size === 6 && tests.length > 0 && new Set(tests).size === tests.length
  && tests.every(name => ['invitations', 'timed', 'lifecycle'].includes(name)),
'Pass --backend, --bundle, --artwork, --output, --java and --firestore-jar as =PATH options, followed by one or more case names');
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const backend = paths.get('backend'), bundle = paths.get('bundle'), artwork = paths.get('artwork'), output = paths.get('output');
const folder = fileURLToPath(new URL('./', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const backendGit = (...args) => execFileSync('git', args, {cwd: backend, encoding: 'utf8'}).trim();
const expectedHeaders = createHostedPreviewHeaders('gamen-mothership-staging');
const report = {scope: 'Two locally automated desktop Chromium phones with trusted touch and a dedicated Firestore emulator. Native renderer, with focus emulation recorded. Representative functional runs.',
  source: git('rev-parse', 'HEAD'), sourceDirty: !!git('status', '--porcelain'), backend: reviewedFoodBackend,
  node: process.version, emulatorJarSha256: sha(await readFile(paths.get('firestore-jar'))),
  artworkInventorySha256: sha(await readFile(join(artwork, 'preview-release.json'))),
  headers: expectedHeaders, bundle: {}, trials: []};
assert.equal(report.sourceDirty, false);
assert.equal(backendGit('rev-parse', 'HEAD'), report.backend);
assert.equal(backendGit('status', '--porcelain'), '');
report.backendInputs = {};
for (const name of ['package-lock.json', 'services/game-api/dev/food-task-coordinator/coordinator.mjs',
  'services/game-api/dev/food-task-coordinator/firestore.mjs', 'services/game-api/dev/food-task-coordinator/fixture.mjs',
  'services/game-api/dev/food-task-coordinator/drive.mjs', 'services/game-api/dist/planet-game.js',
  'packages/contracts/dist/index.js', 'packages/engine/dist/index.js']) {
  report.backendInputs[name] = sha(await readFile(join(backend, name)));
}
for (const name of await readdir(join(bundle, 'assets'))) report.bundle[name] = sha(await readFile(join(bundle, 'assets', name)));
await mkdir(output, {recursive: true, mode: 0o700});
assert.deepEqual(await readdir(output), [], 'Use a fresh output directory');
let emulator, chrome, browser;
let emulatorLog = '';

async function port() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const chosen = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return chosen;
}

async function startEmulator() {
  const selected = await port();
  const java = paths.get('java'), jar = paths.get('firestore-jar');
  emulator = spawn(java, ['-jar', jar, '--host', '127.0.0.1', '--port', String(selected), '--project_id', 'demo-mothership'],
    {cwd: output, stdio: ['ignore', 'pipe', 'pipe']});
  const collect = chunk => { emulatorLog = (emulatorLog + chunk).slice(-50_000); };
  emulator.stdout.on('data', collect);
  emulator.stderr.on('data', collect);
  const deadline = Date.now() + 20_000;
  while (!emulatorLog.includes('API endpoint:')) {
    if (emulator.exitCode !== null || Date.now() >= deadline) throw Error('Disposable loopback Firestore did not start');
    await sleep(50);
  }
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + selected;
  process.env.GAMEN_FOOD_COORDINATOR_BACKEND = backend;
}

function safeError(error) {
  return String(error?.message ?? error)
    .replace(/(?:#|Bearer )[A-Za-z0-9_-]{32}/g, '[actor capability]')
    .replace(/\bps-[A-Za-z0-9_-]+/g, '[local fixture identity]').slice(0, 1200);
}

const reported = 'window.foodCoordinatorTrial?.report?.()';
const ready = "document.querySelector('#planet-root')?.dataset.trial === 'ready'";
const screen = ".planet-food.ph[data-screen='food-task']:not([hidden])";
const enabled = selector => `(() => {const n=document.querySelector(${JSON.stringify(selector)});return !!n && !n.closest('[hidden], [inert], [aria-disabled="true"], :disabled');})()`;
const command = kind => `${reported}?.commands.filter(r=>r.kind===${JSON.stringify(kind)}).at(-1)`;
const domMatch = 'document.visibilityState === "visible" && document.hasFocus()';
const controls = {hold: `${screen} .fs-ctl[data-act="hold"]`, release: `${screen} .fs-ctl[data-act="release"]`,
  lock: `${screen} .fs-ctl[data-act="lock"][data-next]`, key: `${screen} .fs-ctl[data-act="key"]`};

async function wait(page, expression, label, limit = 5500) {
  await page.waitFor(expression, label, limit);
}

async function receipt(page, kind, state) {
  const last = command(kind);
  await wait(page, `${last}?.receipt?.status === "accepted"${state ? ` && ${last}?.receipt?.requestState === "${state}"` : ''}`,
    kind + (state ? ' ' + state : '') + ' receipt', 6500);
  return page.evaluate(last);
}

async function point(page, selector, limit = 5500) {
  const query = JSON.stringify(selector);
  const value = await page.evaluate(`new Promise(resolve => {
    const end = performance.now()+${limit};
    function check(){
      const n=document.querySelector(${query});
      if(n && !n.closest('[hidden], [inert], [aria-disabled="true"], :disabled')){
        const r=n.getBoundingClientRect(), x=Math.round(r.x+r.width/2), y=Math.round(r.y+r.height/2);
        if(n.contains(document.elementFromPoint(x,y))) return resolve({x,y});
      }
      if(performance.now()>=end) return resolve(null);
      requestAnimationFrame(check);
    }
    check();
  })`);
  assert.ok(value, 'Enabled native hit target: ' + selector);
  return value;
}

async function touchDown(page, selector, limit) {
  const hit = await point(page, selector, limit);
  await page.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [hit]});
}
const touchUp = page => page.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
async function tap(page, selector, limit) { await touchDown(page, selector, limit); await touchUp(page); }

function verifyHeaders(page) {
  const received = browser.events.find(event => event.sessionId === page.sessionId && event.method === 'Network.responseReceived'
    && event.params.type === 'Document' && event.params.response.status === 200)?.params.response.headers;
  assert.ok(received, 'Document response was observed');
  const normalized = Object.fromEntries(Object.entries(received).map(([key, value]) => [key.toLowerCase(), value]));
  for (const {key, value} of expectedHeaders) assert.equal(normalized[key.toLowerCase()], value, key);
}

async function screenshot(page, name, trial) {
  const {data} = await page.send('Page.captureScreenshot', {format: 'png', fromSurface: true});
  const bytes = Buffer.from(data, 'base64');
  const path = name + '.png';
  await writeFile(join(output, path), bytes, {mode: 0o600});
  const size = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  trial.captures.push({path, size, sha256: sha(bytes)});
}

async function prepare(kind, trial) {
  const driverName = kind === 'invitations' ? 'invitation-pilot.mjs' : 'pilot.mjs';
  const {prepareFoodTrial} = await import(join(folder, driverName));
  const signal = createFoodApplySignal();
  const activity = {applied: 0, admitted: 0};
  trial.activity = activity;
  const lab = await prepareFoodTrial({onEvent(event) {
    signal.observe(event);
    if (event.stage === 'applied' && event.kind === 'command') activity.applied++;
    if (event.stage === 'durably-admitted' && event.kind === 'command') activity.admitted++;
  }});
  const pages = {};
  let bridge;
  try {
    bridge = await startFoodTrialBridge({...lab, applySignal: signal, bundle, artwork});
    trial.variant = lab.variant;
    trial.backendSource = lab.backendSource;
    let i = 0;
    for (const actor of lab.actors) {
      const [width, height] = i === 0 ? [390, 844] : [430, 932];
      const page = await openPage(browser, {width, height, mobile: true, ownContext: true});
      pages[actor.label] = page;
      await page.send('Network.enable');
      await page.send('Emulation.setFocusEmulationEnabled', {enabled: true});
      await page.media({'prefers-reduced-motion': i === 0 ? 'no-preference' : 'reduce'});
      await page.send('Page.navigate', {url: bridge.urls[actor.label]});
      await wait(page, "document.querySelector('#planet-root')?.dataset.trial === 'waiting'", actor.label + ' waiting', 9000);
      await page.evaluate('window.foodCoordinatorTrial.artReady.then(() => true)');
      verifyHeaders(page);
      i++;
    }
    await bridge.start();
    for (const [label, page] of Object.entries(pages)) {
      await wait(page, ready, label + ' native trial ready', 9000);
      assert.equal(await page.evaluate(domMatch), true, label + ' visible and focused');
      trial.surfaces[label] = await page.evaluate('[innerWidth,innerHeight,matchMedia("(prefers-reduced-motion: reduce)").matches]');
    }
    return {pages, lab, async close() {
      for (const page of Object.values(pages)) await page.close().catch(() => {});
      await bridge.close();
      await lab.close();
    }};
  } catch (error) {
    for (const page of Object.values(pages)) await page.close().catch(() => {});
    try { await bridge?.close(); } finally { await lab.close(); }
    throw error;
  }
}

async function invitations({pages, lab}, trial) {
  const a = pages['crew-1'], b = pages['crew-2'];
  async function ask(page, partnerSeat) {
    await tap(page, '.planet-food.ph:not([hidden]) [data-go="food:tasks"]');
    await tap(page, '.planet-food.ph:not([hidden]) [data-go="partners"]');
    await tap(page, '#food-partner-' + partnerSeat);
    await tap(page, '#food-action-ask');
    await receipt(page, 'TASK_ASK', 'PENDING');
  }
  await ask(a, lab.actors[1].seatId);
  await wait(b, enabled('#food-action-decline'), 'authorized first invitation');
  await screenshot(b, 'invitation-reduced-430x932', trial);
  await tap(b, '#food-action-decline');
  await receipt(b, 'DECLINE', 'DECLINED');
  await wait(a, enabled('#food-action-ok'), 'decline closure on first volunteer');
  await screenshot(a, 'decline-full-390x844', trial);
  await tap(a, '#food-action-ok');
  await ask(b, lab.actors[0].seatId);
  await tap(a, '#food-action-join');
  await receipt(a, 'JOIN', 'JOINED');
  await Promise.all([a, b].map(page => wait(page, `${reported}?.frames.some(f=>f.stage==="BRIEFING")`, 'native briefing')));
  trial.acceptance = 'Both phones observed briefing after four exact request receipts';
}

async function timed({pages}, trial) {
  const {winch, panel} = pages;
  await touchDown(winch, controls.hold, 10_000);
  await receipt(winch, 'HOLD_DOWN');
  await tap(panel, controls.release);
  await receipt(panel, 'PANEL_RELEASE');
  // Follow only the native rendered next-action cue. This does not read hidden
  // state, issue network commands, change a clock or enable a control.
  await tap(panel, controls.lock, 8000);
  await receipt(panel, 'PANEL_LOCK');
  await wait(winch, enabled(controls.hold + '[data-next]'), 'native let-go cue', 8500);
  await touchUp(winch);
  await receipt(winch, 'HOLD_UP');
  await tap(winch, controls.key);
  await receipt(winch, 'KEY');
  await tap(panel, controls.key);
  await receipt(panel, 'KEY');
  const delivery = `document.querySelector(${JSON.stringify(screen + ' [aria-label="Delivered"]')})`;
  await Promise.all([winch, panel].map(page => wait(page, delivery, 'server delivery card')));
  await Promise.all([
    screenshot(winch, 'delivered-full-390x844', trial),
    screenshot(panel, 'delivered-reduced-430x932', trial),
  ]);
  trial.acceptance = 'Both exact Key receipts and rendered delivery';
}

async function lifecycle({pages}, trial) {
  const {winch} = pages;
  await touchDown(winch, controls.hold, 10_000);
  await touchUp(winch);
  const [down, up] = await Promise.all([receipt(winch, 'HOLD_DOWN'), receipt(winch, 'HOLD_UP')]);
  trial.upBeforeDownAck = up.attempts[0].sentAtMs < down.receipt.atMs;
  assert.equal(trial.upBeforeDownAck, true);
  await touchDown(winch, controls.hold);
  await wait(winch, `document.querySelector(${JSON.stringify(controls.hold + '[data-holding]')})`, 'visible held contact before background');
  const preHide = await winch.evaluate(`${reported}.frames.filter(f=>f.epoch).at(-1).epoch`);
  const {targetInfo} = await winch.send('Target.getTargetInfo');
  const {targetId} = await browser.send('Target.createTarget', {url: 'about:blank', browserContextId: targetInfo.browserContextId});
  try {
    await winch.send('Emulation.setFocusEmulationEnabled', {enabled: false});
    await browser.send('Target.activateTarget', {targetId});
    await wait(winch, 'document.visibilityState === "hidden"', 'actual browser hidden state', 2000);
    trial.hidden = await winch.evaluate(`document.visibilityState === "hidden" && !document.querySelector(${JSON.stringify(screen)})`);
    assert.equal(trial.hidden, true);
  } finally {
    await browser.send('Target.closeTarget', {targetId});
    await winch.send('Page.bringToFront');
    await winch.send('Emulation.setFocusEmulationEnabled', {enabled: true});
  }
  await wait(winch, domMatch + ' && ' + enabled(controls.hold), 'same actor resumes fresh view');
  const newEpoch = await winch.evaluate(`${reported}.frames.filter(f=>f.epoch).at(-1).epoch`);
  trial.newEpoch = newEpoch !== preHide;
  assert.equal(trial.newEpoch, true);
  await wait(winch, `${reported}.commands.filter(x=>x.kind==="HOLD_UP" && x.receipt?.status==="accepted").length === 2`,
    'second original UP settled after hide/reconnect');
  await touchUp(winch);
  trial.acceptance = 'Causal UP before DOWN acknowledgement and an observed hide/reconnect';
}

try {
  await startEmulator();
  chrome = await launchBrowser();
  browser = await connect(chrome.endpoint);
  const {product, protocolVersion} = await browser.send('Browser.getVersion');
  report.browser = {product, protocolVersion};
  for (const name of tests) {
    const trial = {name, focusEmulation: true, surfaces: {}, commands: {}, captures: [], status: 'starting'};
    report.trials.push(trial);
    let rig;
    try {
      rig = await prepare(name, trial);
      await ({invitations, timed, lifecycle}[name])(rig, trial);
      trial.status = 'passed';
    } catch (error) {
      trial.status = 'failed';
      trial.error = safeError(error);
      process.exitCode = 1;
      if (rig) {
        for (const [label, page] of Object.entries(rig.pages)) {
          await screenshot(page, name + '-' + label + '-at-stop', trial).catch(() => {});
        }
      }
    } finally {
      if (rig) {
        for (const [label, page] of Object.entries(rig.pages)) {
          trial.commands[label] = (await page.evaluate(reported).catch(() => null)) ?? null;
        }
        await rig.close();
      }
      console.log(name + ': ' + trial.status + (trial.error ? ' (' + trial.error + ')' : ''));
    }
  }
} catch (error) {
  report.error = safeError(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  browser?.close();
  await chrome?.close();
  if (emulator && emulator.exitCode === null) {
    const ended = once(emulator, 'exit');
    emulator.kill('SIGTERM');
    await Promise.race([ended, sleep(4000)]);
    if (emulator.exitCode === null) emulator.kill('SIGKILL');
  }
  await writeFile(join(output, 'emulator.log'), emulatorLog, {mode: 0o600});
  report.sourceStillIsolated = backendGit('rev-parse', 'HEAD') === report.backend && backendGit('status', '--porcelain') === '';
  await writeFile(join(output, 'report-' + tests.join('-') + '.json'), JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
}

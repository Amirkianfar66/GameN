import assert from 'node:assert/strict';
import { request } from 'node:http';
import test from 'node:test';
import { PlayerViewSchema, PublicViewSchema, RoleSchema, ServerTimeResponseSchema, ApiFailureSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { renderPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { createFixtureTransport } from '../dev/fixture/fixture-transport.mjs';
import { AUDIENCES, createScenario, STEPS } from '../dev/fixture/scenario.mjs';
import { createDevServer, resolveStatic } from '../dev/serve.mjs';
import { createFakeHost, flush } from './support/fakes.mjs';

const roles = RoleSchema.options;
const schemaFor = audience => (audience === 'public' ? PublicViewSchema : PlayerViewSchema);

function recorder() {
  const events = [];
  return { events, listener: { onPayload: payload => events.push(payload), onConnectionChange: state => events.push(state) } };
}

test('every view the scripted scenario emits satisfies the shared contract at every step', () => {
  for (const variant of ['protected', 'unprotected']) {
    let now = 1_000;
    const scenario = createScenario({ now: () => now, variant });
    do {
      now += 5_000;
      for (const audience of AUDIENCES) {
        const view = scenario.viewFor(audience);
        assert.deepEqual(schemaFor(audience).parse(view), view, `${variant} ${scenario.step().id} ${audience}`);
      }
    } while (scenario.advance());
    assert.equal(scenario.step().id, STEPS.at(-1).id);
    assert.equal(scenario.advance(), false, 'The script ends; it does not loop or invent further steps');
  }
});

test('the first two steps are the authored contract fixture, byte for byte', () => {
  const authored = createOfficerFixture('protected');
  const scenario = createScenario({ now: () => 0 });
  assert.deepEqual(scenario.viewFor('public'), authored.before.public);
  assert.deepEqual(scenario.viewFor('seat-1'), authored.before.officer);
  assert.deepEqual(scenario.viewFor('seat-2'), authored.before.target);
  scenario.advance();
  assert.equal(scenario.step().id, 'registered');
  assert.deepEqual(scenario.viewFor('public'), authored.afterRegistration.public);
  assert.deepEqual(scenario.viewFor('seat-1'), authored.afterRegistration.officer);
  assert.deepEqual(scenario.viewFor('seat-2'), authored.afterRegistration.target);
  assert.deepEqual(STEPS.map(step => step.source.startsWith('authored')), [true, true, false, false]);
});

test('server-only fixture truth never leaves the scenario, whatever is asked of it', () => {
  for (const variant of ['protected', 'unprotected']) {
    const scenario = createScenario({ now: () => 0, variant });
    const emitted = [];
    for (const audience of AUDIENCES) scenario.subscribe(audience, { onPayload: payload => emitted.push([audience, payload]), onConnectionChange: () => {} });
    while (scenario.advance());
    for (const audience of AUDIENCES) {
      scenario.redeliver(audience);
      scenario.inject(audience, 'incompatible-protocol');
      scenario.inject(audience, 'unreadable');
    }
    // One seat's view may be misdelivered to the other seat to test the client. It is
    // refused for the public feed: nothing private goes there under any control.
    scenario.inject('seat-1', 'other-audience');
    scenario.inject('seat-2', 'other-audience');
    assert.throws(() => scenario.inject('public', 'other-audience'), /never sent on the public feed/);
    assert.throws(() => scenario.inject('seat-3', 'unreadable'), /Unknown fixture audience/);
    const everything = JSON.stringify([emitted, scenario.status(), AUDIENCES.map(audience => scenario.viewFor(audience))]);
    for (const secret of ['serverOnly', 'protection', 'grantedBy', 'resolutionExpectation', 'officerOrdinaryShotsRemaining', 'lifetimeReceipts']) {
      assert.equal(everything.includes(secret), false, `${variant}: ${secret}`);
    }
    // The public feed and the operator status name no role at all; a phone names only its own.
    const publicOnly = JSON.stringify([emitted.filter(([audience]) => audience === 'public'), scenario.status()]);
    for (const role of roles) assert.equal(publicOnly.includes(role), false, role);
    // Apart from the deliberate misdelivery above, a phone's feed names only its own role.
    const seatTwo = emitted.filter(([audience]) => audience === 'seat-2').map(([, payload]) => payload);
    const misdelivered = seatTwo.filter(payload => payload.self?.seatId === 'seat-1');
    assert.equal(misdelivered.length, 1);
    const ownFeed = JSON.stringify(seatTwo.filter(payload => payload.self?.seatId !== 'seat-1'));
    for (const role of roles.filter(role => role !== 'Insider')) assert.equal(ownFeed.includes(role), false, role);
  }
});

test('the two variants are indistinguishable to every audience through the whole script', () => {
  const run = variant => {
    let now = 0;
    const scenario = createScenario({ now: () => now, variant });
    const emitted = [];
    for (const audience of AUDIENCES) scenario.subscribe(audience, { onPayload: payload => emitted.push([audience, payload]), onConnectionChange: () => {} });
    do { now += 7_000; } while (scenario.advance());
    return emitted;
  };
  assert.deepEqual(run('protected'), run('unprotected'));
});

test('a hidden registration is delivered to the registering seat and to nobody else', () => {
  const scenario = createScenario({ now: () => 0 });
  const feeds = Object.fromEntries(AUDIENCES.map(audience => [audience, recorder()]));
  for (const audience of AUDIENCES) scenario.subscribe(audience, feeds[audience].listener);
  const counts = () => AUDIENCES.map(audience => feeds[audience].events.length);
  assert.deepEqual(counts(), [2, 2, 2], 'connected, then the current view');
  scenario.advance();
  assert.deepEqual(counts(), [2, 3, 2]);
  assert.deepEqual(feeds['seat-1'].events.at(-1).ownPendingCommandIds, ['fixture-command-1']);
  scenario.advance();
  assert.deepEqual(counts(), [3, 4, 3], 'A public phase change reaches everyone');
});

test('a feed follows the transport contract: connected, then the current view, again after every reconnect', () => {
  const scenario = createScenario({ now: () => 0 });
  const { events, listener } = recorder();
  const stop = scenario.subscribe('public', listener);
  assert.deepEqual(events.map(event => (typeof event === 'string' ? event : `rev ${event.viewRevision}`)), ['connected', 'rev 10']);
  scenario.setConnected('public', false);
  scenario.advance();
  scenario.advance();
  assert.deepEqual(events.slice(2), ['disconnected'], 'Nothing is delivered while the feed is down');
  scenario.setConnected('public', true);
  assert.deepEqual(events.slice(3).map(event => (typeof event === 'string' ? event : `rev ${event.viewRevision}`)), ['connected', 'rev 11']);
  stop();
  scenario.advance();
  assert.equal(events.length, 5);
  assert.throws(() => scenario.subscribe('seat-3', listener), /Unknown fixture audience/);
});

test('server time is virtual: it starts at the authored phase start and can be run forward', () => {
  let now = 9_000_000;
  const scenario = createScenario({ now: () => now });
  const started = scenario.viewFor('public').phase.startedAt;
  assert.equal(scenario.serverTimeMs(), started);
  now += 12_500;
  assert.equal(scenario.serverTimeMs(), started + 12_500);
  scenario.skipToDeadline();
  assert.equal(scenario.serverTimeMs(), started + 60_000);
  assert.equal(scenario.viewFor('public').phase.id, 'phase-a', 'Running the clock out does not advance the phase');
  now += 3_000;
  scenario.advance();
  scenario.advance();
  const next = scenario.viewFor('public').phase;
  assert.deepEqual([next.kind, next.startedAt, next.endsAt - next.startedAt], ['ORDINARY_TURN', started + 63_000, 60_000], 'The next turn gets its full minute from when it opens');
});

test('the real player screen runs against the fixture transport, labeled as fixture throughout', async () => {
  const host = createFakeHost();
  let now = 0;
  const scenario = createScenario({ now: () => now });
  const screen = createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-1'), matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  let { model } = screen.getFrame();
  assert.equal(model.mode, 'fixture');
  assert.equal(model.banners[0].text, 'Fixture data. A synthetic development scenario, not a live match.');
  assert.equal(model.match.phase.phaseLabel, 'Your turn');
  assert.equal(model.match.actions.cards[0].statusLabel, 'Available');
  assert.equal(model.match.phase.timer.display, '1:00');

  scenario.advance();
  await flush();
  assert.equal(screen.getFrame().model.match.actions.cards[0].statusLabel, 'Not available');
  now += 2_000;
  scenario.advance();
  await flush();
  model = screen.getFrame().model;
  assert.equal(model.match.phase.phaseLabel, 'Player 2’s turn');
  scenario.advance();
  await flush();
  model = screen.getFrame().model;
  assert.equal(model.match.phase.phaseLabel, 'Round resolution');
  assert.equal(model.match.location.self.health, 'Healthy', 'The script shows no outcome');
  assert.equal(toHtml(renderPlayerShell(model)).includes('Fixture data.'), true);
  screen.dispose();
});

test('the real table screen is unmoved by the registration step and never sees a role', async () => {
  const host = createFakeHost();
  const scenario = createScenario({ now: () => 0 });
  const transport = createFixtureTransport(scenario, 'public');
  assert.deepEqual(Object.keys(transport).sort(), ['advanceIfExpired', 'audience', 'mode', 'serverTime', 'subscribe']);
  const screen = createTableScreen({ transport, matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  const frame = screen.getFrame();
  scenario.advance();
  await flush();
  assert.equal(screen.getFrame(), frame);
  while (scenario.advance()) await flush();
  await flush();
  const html = toHtml(renderTableShell(screen.getFrame().model));
  for (const role of roles) assert.equal(html.includes(role), false, role);
  screen.dispose();
});

test('the operator’s bad payloads exercise the client’s defences end to end', async () => {
  const host = createFakeHost();
  const scenario = createScenario({ now: () => 0 });
  const screen = createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-2'), matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  scenario.inject('seat-2', 'unreadable');
  assert.deepEqual(screen.getFrame().model.banners.map(banner => banner.variant), ['fixture', 'unreadable']);
  scenario.redeliver('seat-2');
  assert.deepEqual(screen.getFrame().model.banners.map(banner => banner.variant), ['fixture']);
  scenario.inject('seat-2', 'incompatible-protocol');
  assert.equal(screen.getFrame().model.blocked.heading, 'Update required');
  scenario.redeliver('seat-2');
  assert.equal(screen.getFrame().model.screen, 'match');
  scenario.inject('seat-2', 'other-audience');
  assert.equal(screen.getFrame().model.blocked.heading, 'Match data check failed');
  assert.equal(JSON.stringify(screen.getFrame().model).includes('Officer'), false, 'The other seat’s role is not shown');
  scenario.redeliver('seat-2');
  assert.equal(screen.getFrame().model.screen, 'blocked');
  assert.throws(() => scenario.inject('seat-2', 'made-up'), /Unknown injection/);
  screen.dispose();
});

test('command endpoints are not scripted in this slice and say so with the contract’s own error', async () => {
  const scenario = createScenario({ now: () => 0 });
  const transport = createFixtureTransport(scenario, 'seat-1');
  for (const call of [transport.submitCommand({}), transport.lookupReceipt({}), transport.advanceIfExpired({})]) {
    const answer = ApiFailureSchema.parse(await call);
    assert.equal(answer.error.code, 'UNAVAILABLE');
  }
  assert.ok(ServerTimeResponseSchema.safeParse(await transport.serverTime()).success);
});

// --- The loopback development server ---

async function withServer(t) {
  const devServer = createDevServer({ now: () => 0 });
  const origin = await devServer.listen(0);
  t.after(() => devServer.close());
  return { devServer, origin };
}

async function firstEvents(origin, audience, count) {
  const controller = new AbortController();
  const response = await fetch(`${origin}/api/fixture/stream?audience=${audience}`, { signal: controller.signal });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  const events = [];
  while (events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    for (;;) {
      const end = text.indexOf('\n\n');
      if (end === -1) break;
      const block = text.slice(0, end);
      text = text.slice(end + 2);
      const name = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (name) events.push({ name, data: JSON.parse(data) });
    }
  }
  controller.abort();
  return events;
}

test('the server streams each audience its own authored view and nothing server-only', async t => {
  const { origin } = await withServer(t);
  const authored = createOfficerFixture('protected');
  for (const [audience, expected] of [['public', authored.before.public], ['seat-1', authored.before.officer], ['seat-2', authored.before.target]]) {
    const [event] = await firstEvents(origin, audience, 1);
    assert.equal(event.name, 'payload');
    assert.deepEqual(event.data, expected);
  }
  assert.equal((await fetch(`${origin}/api/fixture/stream?audience=seat-9`)).status, 400);
  assert.equal((await fetch(`${origin}/api/fixture/stream`)).status, 400);
  const time = ServerTimeResponseSchema.parse(await (await fetch(`${origin}/api/fixture/time`)).json());
  assert.equal(time.serverTimeMs, authored.before.public.phase.startedAt);
});

test('a browser can load the client modules but never the contract fixture or anything off the allowlist', async t => {
  const { origin } = await withServer(t);
  for (const [path, type] of [
    ['/', 'text/html'], ['/harness/player.html', 'text/html'], ['/harness/host.js', 'text/javascript'], ['/styles/shell.css', 'text/css'],
    ['/styles/tokens.css', 'text/css'], ['/modules/game/index.js', 'text/javascript'], ['/modules/presentation/index.js', 'text/javascript'],
    ['/modules/contracts/index.js', 'text/javascript'], ['/modules/zod/index.js', 'text/javascript'],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('content-type').startsWith(type), true, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
  }
  for (const path of [
    '/modules/contracts/fixtures.js', '/modules/contracts/fixtures.d.ts', '/modules/game/index.d.ts', '/modules/zod/package.json',
    // On a filesystem that ignores case these name the same files as the allowed or denied ones.
    '/modules/contracts/Fixtures.js', '/modules/contracts/FIXTURES.js', '/modules/contracts/fixtures.JS', '/modules/contracts/FIXTURES.JS',
    '/modules/game/Index.js', '/modules/Game/index.js', '/harness/Player.html', '/modules/zod/Package.json', '/Styles/shell.css',
    '/modules/game/../../package.json', '/modules/game/%2e%2e/%2e%2e/package.json', '/modules/game/..%2f..%2fpackage.json',
    '/harness/../serve.mjs', '/harness/../fixture/scenario.mjs', '/harness/.hidden', '/modules/zod/index.cjs',
    '/package.json', '/rules/source-manifest.json', '/apps/game/dev/serve.mjs', '/.git/config', '/modules/game/', '/nope',
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    assert.equal((await response.text()).includes('serverOnly'), false, path);
  }
  assert.match(await (await fetch(`${origin}/styles/tokens.css`)).text(), /--ms-color-canvas: #10141C;/);
});

test('the path mapping refuses traversal, odd separators and wrong case before any file is opened', () => {
  // fetch normalizes dot segments away before sending, so the mapping is exercised directly.
  for (const path of [
    '/modules/game/../../package.json', '/modules/game/../dev/serve.mjs', '/modules/game/./index.js', '/modules/game//index.js',
    '/modules/game/..', '/modules/game/', '/modules/game', '/harness/../serve.mjs', '/harness/.hidden', '/modules/game/.git/config',
    '/modules/game/screens\\screen.js', '/modules/game/C:/x.js', '/modules/game/index.js\0.css',
    '/modules/contracts/fixtures.js', '/modules/contracts/Fixtures.js', '/modules/contracts/FIXTURES.JS', '/modules/contracts/fixture.js',
    '/modules/contracts/index.d.ts', '/modules/contracts/package.json', '/modules/game/Index.js', '/modules/game/missing.js', '/nope',
  ]) {
    assert.equal(resolveStatic(path), null, path);
  }
  assert.match(resolveStatic('/modules/game/index.js'), /apps\/game\/dist\/index\.js$/);
  assert.match(resolveStatic('/modules/contracts/index.js'), /packages\/contracts\/dist\/index\.js$/);
  assert.match(resolveStatic('/harness/player.html'), /apps\/game\/dev\/harness\/player\.html$/);
  assert.match(resolveStatic('/'), /harness\/index\.html$/);
});

test('harness pages are served under a policy that forbids inline script and inline style', async t => {
  const { origin } = await withServer(t);
  for (const path of ['/', '/harness/player.html', '/harness/table.html', '/harness/operator.html']) {
    const response = await fetch(origin + path);
    const policy = response.headers.get('content-security-policy');
    const html = await response.text();
    assert.match(policy, /default-src 'none'/, path);
    assert.match(policy, /style-src 'self'(;|$)/, path);
    assert.equal(policy.includes("'unsafe-inline'") || policy.includes("'unsafe-eval'"), false, path);
    const importMaps = html.match(/<script type="importmap">/g)?.length ?? 0;
    assert.equal((policy.match(/'sha256-/g) ?? []).length, importMaps, path);
    assert.equal(/<style|style="|\son[a-z]+="/i.test(html), false, `${path} has inline style or handlers`);
    assert.equal(html.includes('mothership:dev-only'), true, path);
    assert.equal(/fixtures\.js|@mothership\/contracts\/fixtures/.test(html), false, path);
  }
});

test('the server answers only on its loopback name and refuses pages from other origins', async t => {
  const { origin, devServer } = await withServer(t);
  const port = Number(new URL(origin).port);
  // The bind is the real control: a client that is not a browser can send any Host it likes.
  assert.equal(devServer.address().address, '127.0.0.1');
  // fetch does not let a caller choose the Host header, so these go through node:http.
  const statusForHost = host => new Promise((resolveStatus, rejectStatus) => {
    request({ host: '127.0.0.1', port, path: '/api/fixture/time', headers: { host } }, response => {
      response.resume();
      resolveStatus(response.statusCode);
    }).on('error', rejectStatus).end();
  });
  assert.equal(await statusForHost(`127.0.0.1:${port}`), 200);
  assert.equal(await statusForHost(`localhost:${port}`), 200);
  // A name that merely resolves to this machine (DNS rebinding) is not accepted.
  assert.equal(await statusForHost('attacker.example'), 421);
  assert.equal(await statusForHost(`attacker.example:${port}`), 421);
  assert.equal(await statusForHost(`127.0.0.1:${port + 1}`), 421);
  assert.equal((await fetch(`${origin}/api/operator/status`, { headers: { origin: 'https://attacker.example' } })).status, 403);
  const post = (path, init = {}) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', ...init });
  assert.equal((await post('/api/operator/advance', { headers: { 'content-type': 'application/json', origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await post('/api/operator/advance', { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await post('/api/operator/redeliver', { body: 'not json' })).status, 400);
  assert.equal((await post('/api/operator/redeliver', { body: '[]' })).status, 400);
  // A well-formed body is refused for its size alone, and a small one is accepted.
  assert.equal((await post('/api/operator/redeliver', { body: JSON.stringify({ pad: 'x'.repeat(5_000) }) })).status, 413);
  assert.equal((await post('/api/operator/redeliver', { body: JSON.stringify({ pad: 'x'.repeat(3_000) }) })).status, 200);
  assert.equal((await post('/api/operator/made-up')).status, 400);
  assert.equal((await post('/api/operator/inject', { body: JSON.stringify({ audience: 'seat-1', kind: 'made-up' }) })).status, 400);
  assert.equal((await post('/api/operator/drop', { body: JSON.stringify({ audience: 'seat-7' }) })).status, 400);
  assert.equal((await fetch(`${origin}/api/fixture/time`, { method: 'DELETE' })).status, 405);
  // HEAD on a stream is answered at once instead of holding a subscriber open.
  const head = await fetch(`${origin}/api/fixture/stream?audience=public`, { method: 'HEAD', signal: AbortSignal.timeout(2_000) });
  assert.equal(head.status, 405);
  assert.equal(devServer.scenario.status().subscribers.public, 0);
});

test('a bad payload is aimed at one named seat and never reaches the public feed', async t => {
  const { origin, devServer } = await withServer(t);
  const inject = body => fetch(`${origin}/api/operator/inject`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const publicFeed = [];
  devServer.scenario.subscribe('public', { onPayload: payload => publicFeed.push(payload), onConnectionChange: () => {} });
  assert.equal((await inject({ kind: 'other-audience' })).status, 400, 'no audience named');
  assert.equal((await inject({ kind: 'other-audience', audience: 'all' })).status, 400, 'broadcast refused');
  assert.equal((await inject({ kind: 'other-audience', audience: 'public' })).status, 400, 'public refused');
  assert.equal((await inject({ kind: 'other-audience', audience: 'seat-2' })).status, 200);
  assert.equal((await inject({ kind: 'unreadable', audience: 'public' })).status, 200, 'a non-private bad payload may be sent to the table');
  const sent = JSON.stringify(publicFeed);
  for (const role of roles) assert.equal(sent.includes(role), false, role);
  assert.equal(sent.includes('"self"'), false);
});

test('operator actions drive the script over HTTP; command endpoints stay unscripted', async t => {
  const { origin, devServer } = await withServer(t);
  const post = async (path, body = {}) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200, path);
    return response.json();
  };
  let status = await post('/api/operator/advance');
  assert.deepEqual([status.fixtureOnly, status.step.id, status.revisions], [true, 'registered', { public: 10, 'seat-1': 21, 'seat-2': 30 }]);
  assert.equal(JSON.stringify(status).includes('Officer'), false);
  status = await post('/api/operator/expire');
  assert.equal(status.serverTimeMs, status.phase.endsAt);
  status = await post('/api/operator/drop', { audience: 'public' });
  assert.deepEqual(status.connected, { public: false, 'seat-1': true, 'seat-2': true });
  status = await post('/api/operator/expire');
  assert.deepEqual(status.connected, { public: false, 'seat-1': true, 'seat-2': true }, 'Running the clock out leaves a dropped feed dropped');
  await assert.rejects(() => fetch(`${origin}/api/fixture/stream?audience=public`), 'A dropped feed is a failed connection, not an error page');
  status = await post('/api/operator/restore', { audience: 'all' });
  assert.equal(status.connected.public, true);
  for (const path of ['/api/fixture/submit-command', '/api/fixture/lookup-receipt', '/api/fixture/advance-if-expired']) {
    assert.equal(ApiFailureSchema.parse(await post(path)).error.code, 'UNAVAILABLE');
  }
  status = await post('/api/operator/restart', { variant: 'unprotected' });
  assert.deepEqual([status.variant, status.step.id], ['unprotected', 'officer-turn']);
  assert.equal(devServer.scenario.step().id, 'officer-turn');
});

test('an open stream receives later views and a restart notice, and is closed when the feed is dropped', async t => {
  const { origin, devServer } = await withServer(t);
  const pending = firstEvents(origin, 'seat-1', 3);
  await new Promise(resolve => setTimeout(resolve, 50));
  devServer.scenario.advance();
  devServer.scenario.restart();
  const events = await pending;
  assert.deepEqual(events.map(event => event.name), ['payload', 'payload', 'restart']);
  assert.deepEqual(events[1].data.ownPendingCommandIds, ['fixture-command-1']);

  const controller = new AbortController();
  const response = await fetch(`${origin}/api/fixture/stream?audience=seat-2`, { signal: controller.signal });
  const reader = response.body.getReader();
  await reader.read();
  devServer.scenario.setConnected('seat-2', false);
  let closed = false;
  for (let attempt = 0; attempt < 5 && !closed; attempt += 1) closed = (await reader.read()).done;
  assert.equal(closed, true);
  controller.abort();
});

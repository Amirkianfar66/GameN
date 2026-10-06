import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerPresentationEventSchema, PlayerViewSchema, ServerTimeResponseSchema } from '@mothership/contracts';
import { createDevServer } from '../dev/serve.mjs';

// The harness pages' own transport, the one module of the harness that only a browser runs.
// Here it runs in Node against the real development server on loopback, with stand-ins for
// the two things a page has and Node does not: an EventSource, and addresses relative to
// the page. Test-only; it shows the transport hands over what the server sends, in order,
// and nothing about a real browser.

/** A minimal EventSource over fetch: named events with JSON data, "open" and "error", and close. */
function eventSourceFor(origin) {
  return class StandInEventSource {
    #listeners = new Map();
    #abort = new AbortController();
    constructor(path) {
      void this.#read(origin + path);
    }
    addEventListener(type, listener) {
      this.#listeners.set(type, [...(this.#listeners.get(type) ?? []), listener]);
    }
    #emit(type, event = {}) {
      for (const listener of this.#listeners.get(type) ?? []) listener(event);
    }
    async #read(url) {
      try {
        const response = await fetch(url, { signal: this.#abort.signal });
        this.#emit('open');
        const decoder = new TextDecoder();
        let buffered = '';
        for await (const chunk of response.body) {
          buffered += decoder.decode(chunk, { stream: true });
          let end = buffered.indexOf('\n\n');
          while (end !== -1) {
            const block = buffered.slice(0, end);
            buffered = buffered.slice(end + 2);
            const type = /^event: (.*)$/m.exec(block)?.[1];
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (type !== undefined) this.#emit(type, { data });
            end = buffered.indexOf('\n\n');
          }
        }
        this.#emit('error');
      } catch {
        if (!this.#abort.signal.aborted) this.#emit('error');
      }
    }
    close() {
      this.#abort.abort();
    }
  };
}

async function inPage(t) {
  const devServer = createDevServer({ now: () => 0 });
  const origin = await devServer.listen(0);
  const real = { fetch: globalThis.fetch, EventSource: globalThis.EventSource };
  globalThis.EventSource = eventSourceFor(origin);
  // A page's requests are relative to the page.
  globalThis.fetch = (resource, init) => real.fetch(typeof resource === 'string' && resource.startsWith('/') ? origin + resource : resource, init);
  t.after(async () => {
    globalThis.fetch = real.fetch;
    globalThis.EventSource = real.EventSource;
    await devServer.close();
  });
  const { createHttpFixtureTransport, FIXTURE_MATCH_ID } = await import('../dev/harness/http-transport.js');
  const post = (path, body) => real.fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { createHttpFixtureTransport, FIXTURE_MATCH_ID, post };
}

function listening(transport) {
  const heard = [];
  const waiting = [];
  const push = item => {
    heard.push(item);
    for (const check of [...waiting]) check();
  };
  const stop = transport.subscribe({
    onConnectionChange: state => push({ kind: state }),
    onPayload: view => push({ kind: 'view', view }),
    onEventPayload: event => push({ kind: 'event', event }),
  });
  const until = (test, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for: ${label}`)), 5_000);
    const check = () => {
      if (!test(heard)) return;
      clearTimeout(timer);
      waiting.splice(waiting.indexOf(check), 1);
      resolve(heard);
    };
    waiting.push(check);
    check();
  });
  return { heard, stop, until };
}

test('the page transport hands over views and presentation events as the server sent them, in the order it sent them', async t => {
  const { createHttpFixtureTransport, FIXTURE_MATCH_ID, post } = await inPage(t);
  const transport = createHttpFixtureTransport('seat-1');
  assert.deepEqual([transport.mode, transport.audience], ['fixture', 'player'], 'Always labeled as the fixture');
  const feed = listening(transport);
  t.after(() => feed.stop());

  await feed.until(heard => heard.some(item => item.kind === 'view'), 'the first view');
  assert.deepEqual(feed.heard.map(item => item.kind), ['connected', 'view'], 'Connected first, then the current view');
  const first = feed.heard[1].view;
  assert.equal(PlayerViewSchema.safeParse(first).success, true);
  assert.equal(first.matchId, FIXTURE_MATCH_ID);

  // A public fact: the view, then the event written with it. Then the reverse order.
  await post('/api/operator/synthetic', { fact: 'move' });
  await feed.until(heard => heard.filter(item => item.kind === 'event').length === 1, 'the first event');
  assert.deepEqual(feed.heard.slice(2).map(item => item.kind), ['view', 'event']);
  const [moved, event] = feed.heard.slice(2).map(item => item.view ?? item.event);
  assert.equal(PlayerPresentationEventSchema.safeParse(event).success, true, 'A presentation event reaches the listener on its own channel, unvalidated and whole');
  assert.deepEqual([event.fact.type, event.viewRevision], ['PUBLIC_MOVE', moved.viewRevision]);

  await post('/api/operator/event-order', { order: 'event-first' });
  await post('/api/operator/synthetic', { fact: 'status' });
  await feed.until(heard => heard.filter(item => item.kind === 'view').length === 3, 'the third view');
  assert.deepEqual(feed.heard.slice(4).map(item => item.kind), ['event', 'view'], 'Nothing is reordered on the way');

  // Something that is not an event at all is still handed over: the client core decides.
  await post('/api/operator/inject-event', { audience: 'seat-1', kind: 'unreadable' });
  await feed.until(heard => heard.filter(item => item.kind === 'event').length === 3, 'the unreadable event');
  assert.deepEqual(feed.heard.at(-1), { kind: 'event', event: { note: 'not a presentation event' } });

  // The endpoints a page calls.
  assert.equal(ServerTimeResponseSchema.safeParse(await transport.serverTime()).success, true);
  const lookup = await transport.lookupReceipt({ protocolVersion: 1, matchId: FIXTURE_MATCH_ID, commandId: 'no-such-command' });
  assert.equal(lookup.status, 'unknown');

  // A dropped feed is reported once; the table's transport has no command endpoints at all.
  await post('/api/operator/drop', { audience: 'seat-1' });
  await feed.until(heard => heard.at(-1).kind === 'disconnected', 'the feed going down');
  const table = createHttpFixtureTransport('public');
  assert.deepEqual([table.audience, typeof table.submitCommand, typeof table.lookupReceipt], ['public', 'undefined', 'undefined']);

  // Stopped, it hears nothing more.
  feed.stop();
  const count = feed.heard.length;
  await post('/api/operator/restore', { audience: 'seat-1' });
  await post('/api/operator/synthetic', { fact: 'move' });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(feed.heard.length, count);
});

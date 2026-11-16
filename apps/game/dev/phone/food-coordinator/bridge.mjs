globalThis[Symbol.for('mothership:dev-only')]=true;

import {randomBytes, createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {FoodTaskCommandRequestSchema, PlanetServiceRequestSchema} from '@mothership/contracts';
import {applyHostedPreviewHeaders} from '../../../../../scripts/hosted-preview-policy.mjs';

const project = 'gamen-mothership-staging';
const receiptContext = FoodTaskCommandRequestSchema.omit({command: true});
const contentTypes = {html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml',
  webp: 'image/webp', png: 'image/png', mp4: 'video/mp4', woff2: 'font/woff2'};
const allowedBaseline = new Set(['read', 'foodCommand', 'foodReceipt', 'foodHeartbeat', 'command', 'receipt']);
const allowedProduction = new Set([...allowedBaseline, 'foodWatch', 'foodClock']);
export const localAppCheck = 'loopback-diagnostic-key';
const digest = value => createHash('sha256').update(value).digest('hex');
const safeFile = path => /^[a-z0-9._/-]+$/i.test(path) && path.split('/').every(part => part && part !== '..' && part !== '.');

async function approvedArt(directory) {
  const index = JSON.parse(await readFile(join(directory, 'preview-release.json'), 'utf8'));
  if (index.projectId !== project) throw Error('Expected the reviewed Hosting artifact');
  const art = new Map();
  for (const entry of index.files.filter(file => file.path.startsWith('art/'))) {
    if (!safeFile(entry.path)) throw Error('Unexpected artifact file path');
    const bytes = await readFile(join(directory, entry.path));
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw Error('Artifact art digest mismatch');
    art.set('/' + entry.path, bytes);
  }
  if (!art.has('/art/food-supply/supply-room.back.svg')) throw Error('Expected approved Food room drawings');
  return art;
}

// This wake signal has no receipt authority. The bridge re-reads the exact
// original receipt from the durable adapter even when an apply event arrives.
export function createFoodApplySignal() {
  const waiting = new Map();
  let publication = null;
  return {
    observe(event) {
      // The coordinator emits this immediately before calling the subscriber.
      // An unpublished or coalesced checkpoint never enters this slot.
      if (event.stage === 'published') publication = event;
      if (event.stage === 'applied' && event.kind === 'command') {
        for (const wake of waiting.get(event.commandId) ?? []) wake();
      }
    },
    ownPublication(frame, actor, originals, taskId) {
      const event = publication;
      publication = null;
      const view = frame.playerView;
      if (!event || event.frameEpoch !== frame.frameEpoch || event.frameSequence !== frame.frameSequence
        || event.audience !== 'player' || !frame.fresh || !originals.has(event.commandId)
        || view?.seatId !== actor.seatId || view.matchId !== actor.matchId
        || view.participantTask?.taskId !== taskId) return null;
      return {commandId: event.commandId, publishedAtMs: event.localMs};
    },
    watch(commandId) {
      let closed = false, changed = false, current = null;
      const callbacks = waiting.get(commandId) ?? new Set();
      const wake = () => { changed = true; current?.(); };
      callbacks.add(wake);
      waiting.set(commandId, callbacks);
      return {
        async next(signal) {
          if (closed || signal.aborted) return false;
          if (!changed) await new Promise(resolve => {
            current = resolve;
            signal.addEventListener('abort', resolve, {once: true});
          }).finally(() => { signal.removeEventListener('abort', current); current = null; });
          const ready = changed;
          changed = false;
          return !closed && !signal.aborted && ready;
        },
        close() {
          closed = true;
          current?.();
          callbacks.delete(wake);
          if (!callbacks.size) waiting.delete(commandId);
        },
      };
    },
  };
}

// Actor IDs come solely from the enclosing local experiment. The browser
// presents a per-seat random capability and never supplies a trusted UID.
export async function startFoodTrialBridge({
  coordinator, taskId, actors, baseline, production, applySignal, serverNow, bundle, artwork, startTrial, variant, backendSource,
}) {
  const art = await approvedArt(artwork);
  const tickets = new Map(), labels = new Set(), bindings = new Set(), sockets = new Set(), streams = new Set();
  let launch = null, started = !startTrial, release;
  const startGate = new Promise(resolve => { release = resolve; });
  for (const actor of actors) {
    const binding = JSON.stringify([actor.matchId, actor.seatId]);
    if (!['push', 'read', 'production'].includes(actor.arm) || !actor.label || labels.has(actor.label) || bindings.has(binding)
      || !actor.uid || !actor.matchId || !/^seat-[1-9]$/.test(actor.seatId)) throw Error('Invalid local trial actor');
    if (actor.arm === 'push' && (!coordinator || !taskId || !applySignal || typeof serverNow !== 'function')
      || actor.arm === 'read' && typeof baseline !== 'function'
      || actor.arm === 'production' && typeof production !== 'function') throw Error('Trial arm lacks its durable driver');
    labels.add(actor.label);
    bindings.add(binding);
    const identities = (actor.identities ?? []).map(({seatId, characterId, displayName}) => {
      if (!/^seat-[1-9]$/.test(seatId) || !/^c[1-9]$/.test(characterId) || typeof displayName !== 'string') {
        throw Error('Invalid public trial roster');
      }
      return {seatId, characterId, displayName};
    });
    tickets.set(randomBytes(24).toString('base64url'), {
      actor: Object.freeze({...actor, identities}), originals: new Set(),
    });
  }
  if (!tickets.size) throw Error('Explicit synthetic seat bindings are required');

  const server = createServer({requestTimeout: 12_000, headersTimeout: 5_000}, (req, res) => {
    void handle(req, res).catch(error => {
      if (res.destroyed) return;
      if (res.headersSent) { res.end(); return; }
      const code = error?.code;
      if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') json(res, 403, {error: 'authorization'});
      else if (code === 'BAD_TRIAL_REQUEST') json(res, 400, {error: 'bad-request'});
      else json(res, 503, {error: 'unavailable'});
    });
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const host = '127.0.0.1:' + server.address().port, origin = 'http://' + host;
  const productionRequests = Object.fromEntries(actors.map(actor => [actor.label, {}]));
  const planetApi = production?.({
    origin,
    verifyIdToken: async token => {
      const binding = tickets.get(token);
      if (binding?.actor.arm !== 'production') throw Error('Unknown local actor');
      return {uid: binding.actor.uid};
    },
    verifyAppCheckToken: async token => { if (token !== localAppCheck) throw Error('Invalid local app proof'); },
  });
  return {
    origin,
    productionRequests,
    urls: Object.fromEntries([...tickets].map(([ticket, {actor}]) => [actor.label, origin + '/#' + ticket])),
    start() {
      if (started) return Promise.resolve();
      launch ??= Promise.resolve().then(startTrial).then(() => { started = true; release(); });
      return launch;
    },
    async close() {
      // Stop Firestore watches before the caller closes its durable client.
      for (const detach of streams) detach();
      const closed = once(server, 'close');
      server.close();
      for (const socket of sockets) socket.destroy();
      await closed;
    },
  };

  async function handle(req, res) {
    applyHostedPreviewHeaders(res, project);
    res.setHeader('Cache-Control', 'no-store');
    if (req.socket.remoteAddress !== '127.0.0.1' || req.headers.host !== host
      || (req.headers.origin !== undefined && req.headers.origin !== origin)
      || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, {error: 'authorization'});
    const path = req.url;
    if (!path.startsWith('/trial/')) return staticFile(req, res, path);
    const ticket = /^Bearer ([A-Za-z0-9_-]{32})$/.exec(req.headers.authorization ?? '')?.[1];
    const binding = tickets.get(ticket);
    if (!binding) return json(res, 403, {error: 'authorization'});
    const {actor, originals} = binding;
    const {uid, matchId, seatId, arm} = actor;
    if (req.method === 'GET' && path === '/trial/binding') {
      return json(res, 200, {uid, matchId, seatId, arm, variant, backendSource,
        taskId: arm === 'push' ? taskId : null, identities: actor.identities});
    }
    if (req.method === 'GET' && path === '/trial/start') {
      if (!started) await Promise.race([startGate, once(res, 'close')]);
      return json(res, 200, {started});
    }
    if (!started) return json(res, 409, {error: 'waiting'});
    if (path === '/trial/planetApi' && req.method === 'POST' && arm === 'production') {
      const q = await body(req);
      if (!allowedProduction.has(q?.operation) || (q.request?.matchId ?? q.matchId) !== matchId) badRequest();
      const counts = productionRequests[actor.label];
      counts[q.operation] = (counts[q.operation] ?? 0) + 1;
      return planetApi({method: req.method, headers: req.headers, body: q}, Object.assign(res, {
        set(name, value) { res.setHeader(name, value); },
        status(status) { res.statusCode = status; return res; },
        json(value) { return json(res, res.statusCode, value); },
      }));
    }
    if (path === '/trial/baseline' && req.method === 'POST' && arm === 'read') {
      const q = await body(req), parsed = PlanetServiceRequestSchema.safeParse(q);
      if (!parsed.success || !allowedBaseline.has(q.operation)
        || (q.request?.matchId ?? q.matchId) !== matchId) badRequest();
      return json(res, 200, await baseline(uid, parsed.data));
    }
    if (arm !== 'push') return json(res, 404, {error: 'missing'});
    if (req.method === 'GET' && path === '/trial/frames') return frames(res, actor, originals);
    if (req.method === 'GET' && path === '/trial/snapshot') return json(res, 200, await coordinator.snapshot(taskId, uid));
    if (req.method !== 'POST') return json(res, 404, {error: 'missing'});
    const value = await body(req);
    if (path === '/trial/clock') return json(res, 200, await coordinator.clockSample(taskId, uid));
    if (path === '/trial/heartbeat') return json(res, 200, await coordinator.heartbeat(taskId, uid));
    if (path === '/trial/receipt') {
      const context = check(receiptContext, value, matchId);
      return json(res, 200, answer(await coordinator.receipt(taskId, uid, context)));
    }
    if (path === '/trial/command') {
      const request = check(FoodTaskCommandRequestSchema, value, matchId);
      const {command, ...context} = request;
      if (command.type !== 'TASK_PRESS') badRequest();
      // Only exact originating requests in this immutable test binding may be
      // correlated. The durable adapter still decides whether to accept them.
      if (command.taskId === taskId && originals.size < 512) originals.add(context.commandId);
      const wake = applySignal.watch(context.commandId);
      const abort = new AbortController();
      res.once('close', () => abort.abort());
      const budget = AbortSignal.any([abort.signal, AbortSignal.timeout(7_500)]);
      try {
        const admitted = await coordinator.submit(taskId, uid, request);
        let original = await coordinator.receipt(taskId, uid, context);
        while (original?.phase !== 'applied' && await wake.next(budget)) {
          original = await coordinator.receipt(taskId, uid, context);
        }
        return json(res, 200, answer(original?.phase === 'applied' ? original : admitted));
      } finally {
        wake.close();
      }
    }
    return json(res, 404, {error: 'missing'});
  }

  function answer(outcome) {
    return {outcome, serverTimeMs: serverNow()};
  }

  function frames(res, actor, originals) {
    res.writeHead(200, {'Content-Type': 'text/event-stream; charset=utf-8'});
    res.flushHeaders();
    let pending = null, paused = false, stopped = false;
    const write = () => {
      paused = false;
      if (pending === null || stopped) return;
      const frame = pending;
      pending = null;
      paused = !res.write('data: ' + JSON.stringify(frame) + '\n\n');
    };
    const stop = coordinator.subscribe(taskId, actor.uid, frame => {
      const witness = applySignal.ownPublication(frame, actor, originals, taskId);
      if (stopped || res.destroyed) return;
      const {ownCommandWitness: _untrusted, ...packet} = frame;
      pending = witness ? {...packet, ownCommandWitness: witness} : packet;
      if (!paused) write();
    }, error => {
      if (stopped || res.destroyed) return;
      res.end('event: failure\ndata: ' + (error?.code === 'FORBIDDEN' ? 'authorization' : 'network') + '\n\n');
    });
    const detach = () => {
      if (stopped) return;
      stopped = true;
      streams.delete(detach);
      res.off('drain', write);
      stop();
    };
    streams.add(detach);
    res.on('drain', write);
    res.once('close', detach);
  }

  async function staticFile(req, res, path) {
    if (req.method !== 'GET') return json(res, 404, {error: 'missing'});
    const file = path === '/' ? 'index.html' : path.slice(1), extension = file.split('.').at(-1);
    if (!safeFile(file) || !contentTypes[extension]) return json(res, 404, {error: 'missing'});
    let bytes = art.get(path);
    if (!bytes && (file === 'index.html' || file.startsWith('assets/'))) {
      try { bytes = await readFile(join(bundle, file)); } catch { /* Missing build file. */ }
    }
    if (!bytes) return json(res, 404, {error: 'missing'});
    res.writeHead(200, {'Content-Type': contentTypes[extension]});
    res.end(bytes);
  }
}

function json(res, status, value) {
  if (res.destroyed) return;
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(value));
}

function badRequest() { throw Object.assign(Error('Invalid trial request'), {code: 'BAD_TRIAL_REQUEST'}); }

function check(schema, value, matchId) {
  const parsed = schema.safeParse(value);
  if (!parsed.success || parsed.data.matchId !== matchId) badRequest();
  return parsed.data;
}

async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) badRequest();
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16_384) badRequest();
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks)); } catch { badRequest(); }
}

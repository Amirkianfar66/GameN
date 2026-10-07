// mothership:dev-only
//
// Local development server for the fixture harness. It serves the built client modules,
// the harness pages and a scripted fixture feed. It is not the game backend, performs no
// authentication, and must never be deployed or reachable from another machine.
//
//   npm run dev:fixture --workspace @mothership/game     (builds first)
//   PORT=4310 node apps/game/dev/serve.mjs

import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proposedDesignTokens } from '@mothership/design-tokens';
import { shellTokenStylesheet } from '@mothership/game';
import { AUDIENCES, COMMAND_PLANS, createScenario, EVENT_INJECTIONS, EVENT_ORDERS, SYNTHETIC_FACTS } from './fixture/scenario.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const at = path => resolve(repositoryRoot, path);

// Every servable path is listed here. Nothing else on disk can be requested.
const STATIC_ROOTS = [
  ['/harness/', at('apps/game/dev/harness')],
  ['/modules/game/', at('apps/game/dist')],
  ['/modules/presentation/', at('packages/presentation/dist')],
  ['/modules/contracts/', at('packages/contracts/dist')],
  ['/modules/zod/', at('node_modules/zod')],
];
const STATIC_FILES = new Map([
  ['/', at('apps/game/dev/harness/index.html')],
  ['/styles/shell.css', at('apps/game/src/styles/shell.css')],
]);
// The contract fixture holds server-only truth. A browser is never given the module.
const DENIED = /(^|\/)fixtures?(\.d)?\.(js|ts|map)$|\.(d\.ts|tsbuildinfo|map|cjs|cts|md)$|(^|\/)package\.json$/i;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const INJECTIONS = new Set(['incompatible-protocol', 'unreadable', 'other-audience']);
const MAX_BODY_BYTES = 4_096;

/** Maps a request path to the one file it may be answered with, or null. */
export function resolveStatic(pathname) {
  if (STATIC_FILES.has(pathname)) return STATIC_FILES.get(pathname);
  for (const [prefix, directory] of STATIC_ROOTS) {
    if (!pathname.startsWith(prefix)) continue;
    const relative = pathname.slice(prefix.length);
    if (relative === '' || DENIED.test(relative) || /[\\:\0]/.test(relative)) return null;
    const segments = relative.split('/');
    if (segments.some(segment => segment === '' || segment.startsWith('.'))) return null;
    const file = resolve(directory, relative);
    if (!file.startsWith(directory + sep)) return null;
    // A file is served only under its exact on-disk name. On a filesystem that ignores
    // case, "Fixtures.js" would otherwise open "fixtures.js" and walk past the name check
    // above; and a link inside an allowed directory cannot lead out of it.
    try {
      if (realpathSync.native(file) !== join(realpathSync.native(directory), ...segments)) return null;
    } catch {
      return null;
    }
    return file;
  }
  return null;
}

// Harness pages run under a policy with no inline script or style except the page's own
// import map, which is allowed by hash. Markup that relied on inline code would break here.
function contentSecurityPolicy(html) {
  const hashes = [...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)]
    .map(match => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
  return [
    "default-src 'none'", `script-src 'self' ${hashes.join(' ')}`.trim(), "style-src 'self'", "connect-src 'self'",
    "img-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
  ].join('; ');
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('Request body too large');
    chunks.push(chunk);
  }
  const body = chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new SyntaxError('Request body must be a JSON object');
  return body;
}

/**
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @param {'protected' | 'unprotected'} [options.variant]
 * @param {(entry: { method: string, path: string }) => void} [options.onRequest] Called for every accepted request line.
 * @param {number} [options.slowAnswerMs] How long a deliberately slow command answer is held back.
 */
export function createDevServer({ now = Date.now, variant = 'protected', onRequest, slowAnswerMs } = {}) {
  const scenario = createScenario({ now, variant, slowAnswerMs });
  const tokenStylesheet = shellTokenStylesheet(proposedDesignTokens);
  const streams = new Set();
  let origins = new Set();

  const headers = extra => ({ 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra });
  const send = (response, status, body, type = 'text/plain; charset=utf-8', extra = {}) => {
    response.writeHead(status, headers({ 'content-type': type, ...extra }));
    response.end(body);
  };
  const sendJson = (response, status, value) => send(response, status, JSON.stringify(value), TYPES['.json']);
  const serverTimeMs = () => Math.round(scenario.serverTimeMs());
  const notScripted = () => ({ ok: false, serverTimeMs: serverTimeMs(), error: { code: 'UNAVAILABLE' } });

  function openStream(response, audience) {
    // While the operator has the feed switched off the connection is cut before any
    // response, which a browser treats as a network failure and keeps retrying.
    if (!scenario.isConnected(audience)) return response.socket?.destroy();
    response.writeHead(200, headers({ 'content-type': 'text/event-stream; charset=utf-8', connection: 'keep-alive' }));
    response.write('retry: 1000\n\n');
    const write = (event, data) => response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    let stop = () => {};
    const close = () => {
      stop();
      streams.delete(close);
      response.end();
    };
    streams.add(close);
    response.on('close', () => {
      stop();
      streams.delete(close);
    });
    stop = scenario.subscribe(audience, {
      onPayload: payload => write('payload', payload),
      // The audience's presentation events travel on the same connection as its views, so a
      // screen still holds one connection. They stay two kinds of message.
      onEventPayload: payload => write('presentation-event', payload),
      // A dropped feed is a closed connection; the browser's reconnect attempts then fail
      // until the operator switches the feed back on.
      onConnectionChange: next => {
        if (next === 'disconnected') close();
      },
      onRestart: () => write('restart', {}),
    });
  }

  async function operate(action, body) {
    const audiences = body.audience === undefined || body.audience === 'all' ? AUDIENCES : [body.audience];
    if (audiences.some(audience => !AUDIENCES.includes(audience))) throw new RangeError('Unknown audience');
    if (action === 'restart') scenario.restart(body.variant === 'unprotected' ? 'unprotected' : 'protected');
    else if (action === 'advance') scenario.advance();
    else if (action === 'end-turn') scenario.endFirstTurn();
    else if (action === 'expire') {
      // Real server time never jumps, so a connected client has no reason to re-measure it.
      // Bouncing each live feed makes its screen reconnect and pick the new time up honestly.
      // A feed the operator has switched off stays off.
      scenario.skipToDeadline();
      for (const audience of AUDIENCES.filter(candidate => scenario.isConnected(candidate))) {
        scenario.setConnected(audience, false);
        scenario.setConnected(audience, true);
      }
    } else if (action === 'drop') audiences.forEach(audience => scenario.setConnected(audience, false));
    else if (action === 'restore') audiences.forEach(audience => scenario.setConnected(audience, true));
    else if (action === 'redeliver') audiences.forEach(audience => scenario.redeliver(audience));
    else if (action === 'plan-command') {
      if (!COMMAND_PLANS.includes(body.plan)) throw new RangeError('Unknown command plan');
      scenario.planNextCommand(body.plan);
    } else if (action === 'command-service') {
      if (body.state !== 'answering' && body.state !== 'silent') throw new RangeError('Unknown command service state');
      scenario.setCommandService(body.state);
    } else if (action === 'inject') {
      // A bad payload is aimed at one named feed, never broadcast.
      if (!AUDIENCES.includes(body.audience)) throw new RangeError('Injection needs one audience');
      if (!INJECTIONS.has(body.kind)) throw new RangeError('Unknown injection');
      scenario.inject(body.audience, body.kind);
    } else if (action === 'synthetic') {
      if (!SYNTHETIC_FACTS.includes(body.fact)) throw new RangeError('Unknown synthetic fact');
      scenario.synthetic(body.fact);
    } else if (action === 'event-order') {
      if (!EVENT_ORDERS.includes(body.order)) throw new RangeError('Unknown event order');
      scenario.setEventOrder(body.order);
    } else if (action === 'redeliver-events') audiences.forEach(audience => scenario.redeliverEvents(audience));
    else if (action === 'inject-event') {
      if (!AUDIENCES.includes(body.audience)) throw new RangeError('Injection needs one audience');
      if (!EVENT_INJECTIONS.includes(body.kind)) throw new RangeError('Unknown event injection');
      scenario.injectEvent(body.audience, body.kind);
    } else throw new RangeError('Unknown operator action');
    return scenario.status();
  }

  async function handle(request, response) {
    // Requests must address this server by a loopback name, and a browser page from any
    // other origin may not drive it.
    const origin = `http://${request.headers.host}`;
    if (!origins.has(origin)) return send(response, 421, 'Unexpected host');
    if (request.headers.origin !== undefined && !origins.has(request.headers.origin)) return send(response, 403, 'Cross-origin request refused');
    const url = new URL(request.url ?? '/', origin);
    const { pathname } = url;
    onRequest?.({ method: request.method ?? '', path: pathname + url.search });

    if (pathname === '/api/fixture/stream') {
      // A stream has no meaningful HEAD; answering one would hold a subscriber open.
      if (request.method !== 'GET') return send(response, 405, 'Method not allowed', undefined, { allow: 'GET' });
      const audience = url.searchParams.get('audience');
      return AUDIENCES.includes(audience) ? openStream(response, audience) : send(response, 400, 'Unknown audience');
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === '/api/fixture/time') return sendJson(response, 200, { protocolVersion: 1, serverTimeMs: serverTimeMs() });
      if (pathname === '/api/operator/status') return sendJson(response, 200, scenario.status());
      if (pathname === '/styles/tokens.css') return send(response, 200, tokenStylesheet, TYPES['.css']);
      const file = resolveStatic(pathname);
      const type = file ? TYPES[extname(file)] : undefined;
      if (!file || !type) return send(response, 404, 'Not found');
      try {
        const body = await readFile(file);
        const extra = extname(file) === '.html' ? { 'content-security-policy': contentSecurityPolicy(body.toString('utf8')) } : {};
        return send(response, 200, body, type, extra);
      } catch {
        return send(response, 404, 'Not found');
      }
    }

    if (request.method === 'POST') {
      if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) return send(response, 415, 'JSON only');
      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        return error instanceof RangeError ? send(response, 413, 'Request body too large') : send(response, 400, 'Unreadable request body');
      }
      if (pathname === '/api/fixture/advance-if-expired') return sendJson(response, 200, notScripted());
      if (pathname === '/api/fixture/submit-command' || pathname === '/api/fixture/lookup-receipt') {
        // The seat is named in the address, as for the feed. It selects a fixture identity; it is not authentication.
        const audience = url.searchParams.get('audience');
        if (!AUDIENCES.includes(audience)) return send(response, 400, 'Unknown audience');
        let result = pathname === '/api/fixture/submit-command' ? scenario.submitCommand(audience, body) : scenario.lookupReceipt(audience, body);
        if (result.answered === 'later') {
          // A request that is slow to arrive: the desk sees it only after the wait.
          await new Promise(resolveDelay => setTimeout(resolveDelay, result.delayMs));
          // The server may be closing in the meantime. A page that has gone away does not
          // take its request back, though: it still arrives, as a real one would.
          result = result.resume();
          if (response.destroyed || response.socket?.destroyed) return undefined;
        }
        // No answer: a gateway error with nothing in it, which the harness transport reports
        // as a failed request. The connection is deliberately not cut instead: a browser
        // re-sends a request by itself when its connection closes before any response
        // (measured: one fetch, six identical POSTs), which would defeat the arrangement.
        if (!result.answered) return send(response, 504, '');
        return sendJson(response, 200, result.body);
      }
      if (pathname.startsWith('/api/operator/')) {
        try {
          return sendJson(response, 200, await operate(pathname.slice('/api/operator/'.length), body));
        } catch (error) {
          return send(response, 400, error instanceof RangeError ? error.message : 'Operator request failed');
        }
      }
      return send(response, 404, 'Not found');
    }
    return send(response, 405, 'Method not allowed', undefined, { allow: 'GET, HEAD, POST' });
  }

  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      if (!response.headersSent) send(response, 500, 'Development server error');
      else response.end();
    });
  });

  return {
    scenario,
    /** Where the server is listening, once it is. */
    address: () => server.address(),
    /** Binds to the loopback interface only. Port 0 picks a free port. */
    listen(port = 4310) {
      return new Promise((resolveListen, rejectListen) => {
        server.once('error', rejectListen);
        server.listen(port, '127.0.0.1', () => {
          const bound = server.address().port;
          origins = new Set([`http://127.0.0.1:${bound}`, `http://localhost:${bound}`]);
          resolveListen(`http://127.0.0.1:${bound}`);
        });
      });
    },
    close() {
      for (const close of [...streams]) close();
      return new Promise(resolveClose => {
        server.close(() => resolveClose());
        server.closeAllConnections();
      });
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 4310);
  const devServer = createDevServer();
  const origin = await devServer.listen(port);
  console.log(`Mothership fixture harness (development only, synthetic data): ${origin}/`);
  console.log('Not a game server. No authentication. Loopback only. Stop with Ctrl+C.');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => devServer.close().then(() => process.exit(0)));
}

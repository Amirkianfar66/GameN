// mothership:dev-only
//
// Serves the design/ directory on the loopback interface so the Designer's pages can be
// opened in a browser. Read-only, GET only, nothing outside design/ is reachable.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DESIGN_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
};

export async function startStaticServer({ port = 0 } = {}) {
  const server = createServer(async (request, response) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      response.end(body);
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method not allowed');
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      return send(400, 'Bad request');
    }
    // A browser asks for this by itself. There is none, and that is not an error of a page.
    if (pathname === '/favicon.ico') {
      response.writeHead(204, { 'cache-control': 'no-store' });
      return response.end();
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(DESIGN_ROOT, `.${pathname}`);
    if (file !== DESIGN_ROOT && !file.startsWith(DESIGN_ROOT + sep)) return send(403, 'Forbidden');
    const type = TYPES[extname(file)];
    if (!type) return send(404, 'Not found');
    try {
      if (!(await stat(file)).isFile()) return send(404, 'Not found');
      send(200, request.method === 'HEAD' ? '' : await readFile(file), type);
    } catch {
      send(404, 'Not found');
    }
  });
  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', done);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(done => server.close(done)),
  };
}

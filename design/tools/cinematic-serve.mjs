// mothership:dev-only
//
// Serves design/ on the loopback interface for the cinematic review gallery, with the media types
// the gallery's videos, previews and cue mixes need and byte ranges for video seeking. Read-only,
// GET and HEAD only, nothing outside design/ is reachable.
//   node design/tools/cinematic-serve.mjs [port]   then open /cinematic/gallery.html

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.opus': 'audio/ogg',
};

export async function startCinematicServer({ port = 0 } = {}) {
  const server = createServer(async (request, response) => {
    const send = (status, body = '', headers = {}) => { response.writeHead(status, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers }); response.end(body); };
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method not allowed');
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { return send(400, 'Bad request'); }
    if (pathname === '/favicon.ico') return send(204);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(ROOT, `.${pathname}`);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) return send(403, 'Forbidden');
    const type = TYPES[extname(file)];
    if (!type) return send(404, 'Not found');
    try {
      if (!(await stat(file)).isFile()) return send(404, 'Not found');
      const body = await readFile(file);
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
      if (range) {
        const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        if (start >= body.length || start > end) return send(416, '', { 'content-range': `bytes */${body.length}` });
        return send(206, request.method === 'HEAD' ? '' : body.subarray(start, end + 1), { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': String(end - start + 1) });
      }
      send(200, request.method === 'HEAD' ? '' : body, { 'content-type': type, 'accept-ranges': 'bytes' });
    } catch { send(404, 'Not found'); }
  });
  await new Promise((done, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', done); });
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { origin } = await startCinematicServer({ port: Number(process.argv[2] ?? 0) });
  console.log(`Cinematic gallery: ${origin}/cinematic/gallery.html`);
}

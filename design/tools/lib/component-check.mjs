// mothership:dev-only
//
// What every Designer component's check shares (design/tools/phone-shell-check.mjs, kit-check.mjs and the
// Designer team's next ones): its preview bundled as the game bundles a component (Vite: ordinary bundling, no
// copy), served with the hosted game's production response headers (scripts/prepare-hosted-preview.mjs: the
// Content Security Policy of scripts/hosted-preview-policy.mjs and the six other headers), each policy report
// classified, and the source state the record is made against. A component's own check draws its states,
// runs its probes and writes its record with these.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { build } from 'vite';
import { createHostedPreviewCsp } from '../../../scripts/hosted-preview-policy.mjs';

/** The hosted game's response headers, as scripts/prepare-hosted-preview.mjs writes them for staging. */
export const PRODUCTION_HEADERS = Object.freeze([
  ['Cache-Control', 'no-store'],
  ['Content-Security-Policy', createHostedPreviewCsp('gamen-mothership-staging')],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Robots-Tag', 'noindex, nofollow'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
]);
export const TYPES = Object.freeze({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' });
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** The headers as a record lists them, with their digest. */
export function recordedHeaders() {
  const headers = PRODUCTION_HEADERS.map(([key, value]) => ({ key, value }));
  return { headers, headersSha256: sha256(JSON.stringify(headers)) };
}

/** Collects the page's policy reports from before its first script runs (Page.addScriptToEvaluateOnNewDocument). */
export const POLICY_LISTENER = 'window.__policy = []; document.addEventListener("securitypolicyviolation", e => window.__policy.push({ directive: e.violatedDirective, blocked: String(e.blockedURI), source: String(e.sourceFile).replace(location.origin + "/", ""), line: e.lineNumber, column: e.columnNumber }));';

/**
 * One report is known and not the component's: zod's eval feature probe (node_modules/zod/v4/core/util.js
 * allowsEval: `try { return Function(""), true } catch { return false }`), which zod catches before
 * falling back to its ordinary parser. The game's own bundle has the same probe (in its crew-runtime
 * chunk, through @mothership/contracts), so the live game reports it too. A report is that one only when
 * the bundled code at the reported place is the probe; every other report fails the page.
 */
export async function classify(out, violation) {
  if (violation.directive !== 'script-src' || violation.blocked !== 'eval' || !violation.source) return 'unexpected';
  const code = (await readFile(join(out, violation.source), 'utf8').catch(() => '')).split('\n')[violation.line - 1] ?? '';
  const near = code.slice(Math.max(0, violation.column - 160), violation.column + 60);
  return /Cloudflare[\s\S]*try\{return Function\(``\),!0\}catch\{return!1\}/.test(near) ? 'known: zod eval probe, caught; the live game bundle has it too' : 'unexpected';
}

/**
 * Bundles a preview folder: its index.html, or the pages named in `pages` ({ name: file }). Bundled, the game's
 * package imports resolve from node_modules: a preview's import map is for its unbundled page only, and an inline
 * script would be refused by the production policy anyway. The pack's art.mjs finds the crew's portraits from its
 * own place at run time (design/crew-drawing/assets/portraits/), which no bundle carries; they are copied to where
 * it looks from the bundle, as the pack's own pages serve them.
 */
export async function bundlePreview({ repo, root, name, pages = null }) {
  const out = await mkdtemp(join(tmpdir(), `${name}-`));
  await build({
    root, base: './', logLevel: 'warn', configFile: false, publicDir: false,
    plugins: [{ name: `${name}-no-import-map`, transformIndexHtml: html => html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '') }],
    build: { outDir: out, emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, sourcemap: false, cssMinify: false,
      ...(pages ? { rollupOptions: { input: Object.fromEntries(Object.entries(pages).map(([key, file]) => [key, join(root, file)])) } } : {}) },
  });
  await cp(join(repo, 'design/crew-drawing/assets/portraits'), join(out, 'crew-drawing/assets/portraits'), { recursive: true });
  return out;
}

/** Serves a bundle with the production headers, on 404 too. */
export function serve(root) {
  const server = createServer(async (request, response) => {
    const path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://check').pathname)));
    if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(path.endsWith(sep) ? join(path, 'index.html') : path);
      response.writeHead(200, Object.fromEntries([['Content-Type', TYPES[extname(path)] ?? 'application/octet-stream'], ...PRODUCTION_HEADERS]));
      response.end(body);
    } catch {
      response.writeHead(404, Object.fromEntries(PRODUCTION_HEADERS)).end('Not found');
    }
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

/**
 * The source a record shows, read before anything is written: the commit, and whether these paths are as
 * committed. Every component's review folder is output, not source, and is left out.
 */
export function sourceState(repo, paths) {
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const sourceClean = execFileSync('git', ['status', '--porcelain', '--', ...paths, ':(exclude,glob)design/phone-ui/components/*/review/**'], { cwd: repo, encoding: 'utf8' }).trim() === '';
  return { sourceCommit, sourceClean };
}

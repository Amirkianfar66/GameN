import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import { readHostedConfiguration } from '../apps/game/dist/browser/hosted-config.js';
import { checkProductionExclusion, workspaceOptions } from '../apps/game/scripts/check-production-exclusion.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.argv[2];
if (!configPath || process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-hosted-preview.mjs PUBLIC_CONFIG_JSON');
const config = readHostedConfiguration(JSON.parse(await readFile(resolve(configPath), 'utf8')));
await build({ configFile: join(root, 'apps/game/hosted/vite.config.mjs') });
const output = join(root, 'dist/hosted-preview');
await writeFile(join(output, 'preview-config.json'), JSON.stringify(config, null, 2) + '\n');
const exclusion = checkProductionExclusion(workspaceOptions(root, [output]));
if (exclusion.problems.length) throw new Error(exclusion.problems.join('\n'));
const files = [];
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await scan(path);
    else {
      const bytes = await readFile(path);
      files.push({ path: relative(output, path), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await scan(output);
files.sort((a, b) => a.path.localeCompare(b.path));
const digest = createHash('sha256').update(JSON.stringify(files)).digest('hex');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
const release = { kind: 'hosted-playtest-preview', sourceCommit, sourceDirty, projectId: config.projectId,
  assetManifestVersion: `v1-preview-${digest.slice(0,16)}`, bundleSha256: digest, files };
await writeFile(join(output, 'preview-release.json'), JSON.stringify(release, null, 2) + '\n');
const functionsOrigin = `https://us-central1-${config.projectId}.cloudfunctions.net`;
const csp = [
  "default-src 'none'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'none'",
  "script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self'",
  `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseappcheck.googleapis.com https://recaptchaenterprise.googleapis.com https://www.google.com ${functionsOrigin}`,
  'frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
].join('; ');
const hosting = { hosting: { site: config.projectId, public: 'hosted-preview',
  ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
  headers: [{ source: '**', headers: [
    { key: 'Cache-Control', value: 'no-store' }, { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ] }],
} };
await writeFile(join(root, 'dist/firebase-hosting.json'), JSON.stringify(hosting, null, 2) + '\n');
console.log(JSON.stringify({ ...release, files: files.length, deployment: 'not performed', configFile: 'dist/firebase-hosting.json' }, null, 2));

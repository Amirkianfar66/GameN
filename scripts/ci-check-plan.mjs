import {execFileSync} from 'node:child_process';
import {readFileSync, appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const jobs = ['verify', 'backend-emulator', 'backend-declared-hack-emulator',
  'backend-board-v2-emulator', 'frontend-emulator', 'frontend-board-v2-emulator'];
const frontend = new Set(['verify', 'frontend-emulator', 'frontend-board-v2-emulator']);
// Owner/rule decisions and machine-readable approvals are release inputs, not prose-only changes.
const prose = path => /^(?:docs\/.*\.md|README\.md|AGENTS\.md|\.github\/pull_request_template\.md)$/.test(path)
  && !/(?:^|\/)(?:owner-decisions|decisions|.*decision.*|.*rules.*|.*approval.*)\.md$/.test(path);
const client = path => /^(?:apps\/game\/(?:src|hosted|dev|test|test-emulator)\/|packages\/presentation\/(?:src|test)\/)/.test(path)
  && /\.(?:ts|tsx|mjs|js|css|html|json)$/.test(path)
  && !path.startsWith('apps/game/hosted/build/')
  // Build/source admission changes may alter what ships, so retain the complete release gate.
  && !/(?:^|\/)(?:.*config|.*policy|.*approval|.*release|.*manifest|package(?:-lock)?)\./.test(path);

export function planChecks(paths, {eventName = 'pull_request', releaseCandidate = false} = {}) {
  if (!Array.isArray(paths) || paths.some(p => typeof p !== 'string' || !p || p.startsWith('/')
    || p.split('/').includes('..') || /[\0\r\n\\]/.test(p))) throw Error('Invalid changed paths');
  let scope = 'full';
  if (eventName === 'pull_request' && !releaseCandidate && paths.length) {
    if (paths.every(prose)) scope = 'docs';
    else if (paths.every(p => prose(p) || client(p))) scope = 'frontend';
  }
  return Object.freeze({scope, required: Object.freeze(jobs.filter(j => scope === 'full'
    || scope === 'frontend' && frontend.has(j) || scope === 'docs' && j === 'verify'))});
}

export function assertCheckResults(scope, results) {
  if (!['docs', 'frontend', 'full'].includes(scope)) throw Error('Missing or unknown check plan');
  for (const job of jobs) {
    const required = scope === 'full' || scope === 'frontend' && frontend.has(job) || job === 'verify';
    const expected = required ? 'success' : 'skipped';
    if (results[job] !== expected) throw Error(`${job}: expected ${expected}, received ${results[job] ?? 'missing'}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--assert') {
    if (process.env.CHECK_PLAN_RESULT !== 'success') throw Error('Check planning did not succeed');
    assertCheckResults(process.env.CHECK_SCOPE, JSON.parse(process.env.CHECK_RESULTS ?? '{}'));
  } else {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const pr = event.pull_request;
    let paths = [];
    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      if (![pr?.base?.sha, pr?.head?.sha].every(s => /^[a-f0-9]{40}$/.test(s))) throw Error('Exact PR commits required');
      paths = execFileSync('git', ['diff', '--name-only', '-z', `${pr.base.sha}...${pr.head.sha}`], {encoding: 'utf8'})
        .split('\0').filter(Boolean);
    }
    const plan = planChecks(paths, {eventName: process.env.GITHUB_EVENT_NAME,
      releaseCandidate: pr?.labels?.some(label => label.name === 'release-candidate') === true});
    if (!process.env.GITHUB_OUTPUT) throw Error('Workflow output missing');
    appendFileSync(process.env.GITHUB_OUTPUT, `scope=${plan.scope}\n`);
    console.log(JSON.stringify({...plan, paths}, null, 2));
  }
}

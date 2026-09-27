import { readFileSync, rmSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { workspaces } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
for (const workspace of workspaces) {
  if (!/^(apps|services|packages|infra|tools)\/[a-z-]+$/.test(workspace)) throw new Error('Unexpected workspace path');
  rmSync(new URL(`${workspace}/dist/`, root), { recursive: true, force: true });
}
console.log(`Removed generated dist directories in ${workspaces.length} workspaces`);

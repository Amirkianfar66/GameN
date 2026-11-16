globalThis[Symbol.for('mothership:dev-only')]=true;

import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const reviewedFoodBackend = '0d2969db3ad851cb489fd2e3ed5706e5d4ec9942';

export function loadReviewedFoodBackend() {
  const directory = process.env.GAMEN_FOOD_COORDINATOR_BACKEND;
  if (!directory) throw Error('Set GAMEN_FOOD_COORDINATOR_BACKEND to the reviewed Backend worktree');
  const root = resolve(directory);
  // The experiment runs an approved copy of the server paths. Documentation
  // can advance separately from that pinned source.
  try {
    execFileSync('git', ['-C', root, 'diff', '--quiet', reviewedFoodBackend, '--',
      'services/game-api', 'packages/contracts', 'packages/engine', 'infra/firebase', 'package-lock.json'],
    {stdio: 'ignore'});
  } catch {
    throw Error('Food Backend source differs from ' + reviewedFoodBackend);
  }
  return path => import(pathToFileURL(resolve(root, 'services/game-api', path)).href);
}

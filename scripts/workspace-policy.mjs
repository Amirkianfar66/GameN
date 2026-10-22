// Runtime specifiers are exact: allowing a package never opens all of its subpaths.
export const workspaces = ['apps/game', 'services/game-api', 'packages/engine', 'packages/contracts', 'packages/presentation', 'packages/design-tokens', 'infra/firebase', 'tools/balance'];
export const runtimeDependencies = {
  'apps/game': ['@mothership/contracts', '@mothership/presentation', '@mothership/design-tokens', 'react', 'react-dom', 'firebase', '@noble/hashes'],
  'services/game-api': ['@mothership/contracts', '@mothership/engine', 'firebase-admin'],
  'packages/engine': ['@mothership/contracts'],
  'packages/contracts': ['zod'],
  'packages/presentation': ['@mothership/contracts'],
  'packages/design-tokens': [],
  'infra/firebase': ['@mothership/game-api', '@mothership/contracts', 'firebase-admin', 'firebase-functions'],
  'tools/balance': ['@mothership/contracts', '@mothership/engine'],
};
export const developmentDependencies = {
  'apps/game': ['@types/react', '@types/react-dom', 'vite', '@vitejs/plugin-react'],
};
export const runtimeSpecifiers = {
  ...runtimeDependencies,
  'apps/game': ['@mothership/contracts', '@mothership/presentation', '@mothership/design-tokens', 'react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/app-check', '@noble/hashes/sha2.js'],
  'services/game-api': ['@mothership/contracts', '@mothership/engine', 'node:crypto', 'firebase-admin/firestore'],
  'infra/firebase': ['@mothership/game-api', '@mothership/contracts', 'node:crypto', 'node:buffer', 'firebase-admin/app', 'firebase-admin/auth', 'firebase-admin/app-check', 'firebase-admin/firestore', 'firebase-admin/functions', 'firebase-functions/v2/tasks', 'firebase-functions/v2/https', 'firebase-functions/v2/firestore', 'firebase-functions/v2/scheduler', 'firebase-functions/v2/core'],
};

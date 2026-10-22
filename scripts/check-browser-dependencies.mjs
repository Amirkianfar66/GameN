// Explicit proposal acceptance probe. It fails if the staged browser dependencies are absent.
// It compiles and bundles a synthetic API client without rendering, connecting or creating a project.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'apps/game/package.json'), 'utf8'));
const expected = { dependencies: { react: '19.3.0', 'react-dom': '19.3.0', firebase: '12.18.0' }, devDependencies: { '@types/react': '19.3.0', '@types/react-dom': '19.3.0', vite: '8.3.3', '@vitejs/plugin-react': '6.1.2' } };
for (const [kind, packages] of Object.entries(expected)) {
  for (const [name, version] of Object.entries(packages)) assert.equal(manifest[kind]?.[name], version, `Apply the reviewed browser dependency proposals first: ${name}@${version}`);
}
const require = createRequire(resolve(root, 'apps/game/package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const temporary = mkdtempSync(resolve(tmpdir(), 'mothership-browser-dependencies-'));
try {
  for (const name of ['react', 'react-dom', 'firebase', '@types/react', '@types/react-dom']) {
    const link = resolve(temporary, 'node_modules', name);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(dirname(require.resolve(`${name}/package.json`)), link, 'dir');
  }
  writeFileSync(resolve(temporary, 'package.json'), '{"type":"module"}');
  const probe = resolve(temporary, 'entry.tsx');
  writeFileSync(probe, `import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
export function renderSmoke(container: HTMLElement) {
  const View = () => {
    const label = useSyncExternalStore(() => () => undefined, () => 'Dependency compatibility smoke');
    return <main aria-label={label}>{label}</main>;
  };
  createRoot(container).render(<View />);
}
export function clientApiSmoke() {
  const app = initializeApp({ projectId: 'demo-mothership', apiKey: 'synthetic-smoke' }, 'smoke');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, 'http://127.0.0.1:9199');
  const firestore = initializeFirestore(app, { localCache: memoryLocalCache() });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8180);
  return { app, auth, firestore, initializeAppCheck, ReCaptchaEnterpriseProvider };
}
`);
  const configPath = resolve(root, 'tsconfig.check.browser.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  assert.equal(parsed.errors.length, 0);
  const program = ts.createProgram([probe], { ...parsed.options, noEmit: true, composite: false, declaration: false, rootDir: temporary, tsBuildInfoFile: undefined });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
  const output = resolve(temporary, 'bundle');
  await build({ configFile: false, root: temporary, plugins: [react()], build: { outDir: output, emptyOutDir: true, lib: { entry: probe, formats: ['es'], fileName: 'smoke' } } });
  const { checkProductionExclusion, workspaceOptions } = await import(pathToFileURL(resolve(root, 'apps/game/scripts/check-production-exclusion.mjs')).href);
  const result = checkProductionExclusion(workspaceOptions(root, [output]));
  assert.deepEqual(result.problems, [], `Compatibility bundle exclusion failure: ${result.problems.join('\n')}`);
  console.log('Browser dependency smoke: strict TSX + modular Auth/Firestore/App Check declarations and React/Vite bundle passed; exclusion passed; no SDK connection or browser rendering executed');
} finally { rmSync(temporary, { recursive: true, force: true }); }

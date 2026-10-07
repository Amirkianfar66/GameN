import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import hosted from '../../apps/game/hosted/vite.config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'apps/game/package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const clientRequire = createRequire(require.resolve('firebase/package.json'));
const appManifestPath = clientRequire.resolve('@firebase/app/package.json');
const appManifest = JSON.parse(readFileSync(appManifestPath, 'utf8'));
const expectedRegistry = resolve(dirname(appManifestPath), appManifest.module);
const registryPattern = /\/node_modules\/@firebase\/app\/dist\/esm\/index\.esm\.js$/u;

test('the actual hosted bundle uses exactly the app registry selected by the pinned client SDK', async () => {
  const result = await build({ ...hosted, configFile: false, logLevel: 'silent', build: { ...hosted.build, write: false } });
  const modules = new Set(result.output.filter(item => item.type === 'chunk').flatMap(chunk => Object.keys(chunk.modules)));
  const registries = [...modules].filter(id => registryPattern.test(id));
  assert.deepEqual(registries, [expectedRegistry], 'App Check and Auth must register with the same client app factory');
});


test('the hosted build fails closed if resolution would include both installed app registries', async () => {
  await assert.rejects(build({ ...hosted, configFile: false, logLevel: 'silent', resolve: { dedupe: [] }, build: { ...hosted.build, write: false } }), /requires exactly one Firebase app registry/u);
});

test('the hosted resolution initializes App Check against its app without a browser, network request or token', async t => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'mothership-app-registry-'));
  try {
    mkdirSync(resolve(temporary, 'node_modules'));
    symlinkSync(dirname(require.resolve('firebase/package.json')), resolve(temporary, 'node_modules/firebase'), 'dir');
    const entry = resolve(temporary, 'probe.mjs');
    writeFileSync(entry, `import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
export async function probe() {
  let tokenCalls = 0;
  const app = initializeApp({ projectId: 'mothership-registry-check', appId: '1:123456789:web:abc123', apiKey: 'synthetic-registry-check' }, 'registry-check');
  try {
    const appCheck = initializeAppCheck(app, { isTokenAutoRefreshEnabled: false,
      provider: new CustomProvider({ getToken: async () => { tokenCalls += 1; throw new Error('The probe must not request tokens'); } }) });
    return { sameApp: appCheck.app === app, tokenCalls };
  } finally { await deleteApp(app); }
}
`);
    const result = await build({ ...hosted, configFile: false, logLevel: 'silent', build: { ...hosted.build, write: false, lib: { entry, formats: ['es'] } } });
    const chunks = (Array.isArray(result) ? result : [result]).flatMap(output => output.output).filter(item => item.type === 'chunk');
    assert.equal(chunks.length, 1);
    const executable = resolve(temporary, 'registration.mjs');
    writeFileSync(executable, chunks[0].code);
    let networkCalls = 0;
    t.mock.method(globalThis, 'fetch', async () => { networkCalls += 1; throw new Error('The registry probe must not use the network'); });
    const { probe } = await import(pathToFileURL(executable).href);
    assert.deepEqual(await probe(), { sameApp: true, tokenCalls: 0 });
    assert.equal(networkCalls, 0);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('eight compiled ESM entrypoints import without credentials; Firebase uses validated demo configuration', async () => {
  for (const name of ['game', 'game-api', 'engine', 'contracts', 'presentation', 'design-tokens', 'balance']) {
    const module = await import(`@mothership/${name}`);
    assert.equal(typeof module, 'object');
  }
  const environment={...process.env,GCLOUD_PROJECT:'demo-mothership',GCP_PROJECT:'demo-mothership',FUNCTIONS_EMULATOR:'true',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8180',MOTHERSHIP_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5101'};
  delete environment.FIREBASE_CONFIG;
  execFileSync(process.execPath,['--input-type=module','-e',"await import('@mothership/firebase')"],{env:environment});
  const contracts = await import('@mothership/contracts');
  assert.equal('createOfficerFixture' in contracts, false, 'Fixture must require an explicit subpath import');
});

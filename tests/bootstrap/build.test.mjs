import assert from 'node:assert/strict';
import test from 'node:test';

test('all eight compiled ESM entrypoints import without cloud credentials or a renderer', async () => {
  for (const name of ['game', 'game-api', 'engine', 'contracts', 'presentation', 'design-tokens', 'firebase', 'balance']) {
    const module = await import(`@mothership/${name}`);
    assert.equal(typeof module, 'object');
  }
  const contracts = await import('@mothership/contracts');
  assert.equal('createOfficerFixture' in contracts, false, 'Fixture must require an explicit subpath import');
});

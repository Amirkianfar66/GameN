import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmulatorTransport } from '../dist/browser/firebase-transport.js';

// What the emulator transport refuses to be built for. No connection is made here.

const LOCAL = { projectId: 'demo-mothership', authOrigin: 'http://127.0.0.1:9199', firestoreHost: '127.0.0.1', firestorePort: 8180, functionsOrigin: 'http://127.0.0.1:5101', credentialPersistence: 'memory' };

test('the emulator transport serves the demo project on loopback hosts and nothing else', () => {
  for (const [name, options] of Object.entries({
    'another project': { ...LOCAL, projectId: 'mothership-production' },
    'a remote Auth origin': { ...LOCAL, authOrigin: 'https://identitytoolkit.googleapis.com' },
    'a remote Functions origin': { ...LOCAL, functionsOrigin: 'https://us-central1-demo-mothership.cloudfunctions.net' },
    'a Functions origin with a path': { ...LOCAL, functionsOrigin: 'http://127.0.0.1:5101/elsewhere' },
    'a remote Firestore host': { ...LOCAL, firestoreHost: 'firestore.googleapis.com' },
    'a host that only starts like loopback': { ...LOCAL, firestoreHost: '127.0.0.1.example.com' },
    'a port that is not one': { ...LOCAL, firestorePort: 0 },
    'https on loopback': { ...LOCAL, authOrigin: 'https://127.0.0.1:9199' },
  })) {
    assert.throws(() => createEmulatorTransport(options), /demo project|loopback hosts only/, name);
  }
});

test('the transport is not part of the headless package entry', async () => {
  const entry = await import('@mothership/game');
  assert.equal('createEmulatorTransport' in entry, false, 'The client core can be loaded without the Firebase client');
});

globalThis[Symbol.for('mothership:dev-only')] = true;
// mothership:dev-only — isolated local integration verification, never a hosted dependency.
import { createEmulatorTransport } from '../../dist/browser/firebase-transport.js';
export async function createTransport() {
  if (!['127.0.0.1','localhost'].includes(location.hostname)) throw new Error('Loopback only');
  return createEmulatorTransport({projectId:'demo-mothership',authOrigin:'http://127.0.0.1:9399',firestoreHost:'127.0.0.1',firestorePort:8380,functionsOrigin:'http://127.0.0.1:5204',credentialPersistence:'session'});
}

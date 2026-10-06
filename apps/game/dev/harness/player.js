// mothership:dev-only
import { createPlayerScreen } from '@mothership/game';
import { renderPlayerShell } from '@mothership/presentation';
import { browserPorts, mountScreen } from './host.js';
import { createHttpFixtureTransport, FIXTURE_MATCH_ID } from './http-transport.js';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

// Only the two controlled seats have an authored view. Anything else falls back to seat 1.
const requested = new URLSearchParams(window.location.search).get('seat');
const audienceKey = requested === 'seat-2' ? 'seat-2' : 'seat-1';

const screen = createPlayerScreen({
  transport: createHttpFixtureTransport(audienceKey),
  matchId: FIXTURE_MATCH_ID,
  ports: browserPorts(),
  host: { reload: () => window.location.reload() },
});
mountScreen({ container: document.getElementById('app'), screen, render: renderPlayerShell });

// Read-only handle for inspecting the current frame from the developer console.
globalThis.mothershipHarness = { surface: 'player', audienceKey, frame: () => screen.getFrame() };

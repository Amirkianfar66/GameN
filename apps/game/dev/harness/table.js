// mothership:dev-only
import { createTableScreen } from '@mothership/game';
import { renderTableShell } from '@mothership/presentation';
import { browserPorts, mountScreen } from './host.js';
import { createHttpFixtureTransport, FIXTURE_MATCH_ID } from './http-transport.js';

// The display asks for the public feed and nothing else. Its transport has no command method.
const screen = createTableScreen({
  transport: createHttpFixtureTransport('public'),
  matchId: FIXTURE_MATCH_ID,
  ports: browserPorts(),
  host: { reload: () => window.location.reload() },
});
mountScreen({ container: document.getElementById('app'), screen, render: renderTableShell });

// Read-only handle for inspecting the current frame from the developer console.
globalThis.mothershipHarness = { surface: 'table', audienceKey: 'public', frame: () => screen.getFrame() };

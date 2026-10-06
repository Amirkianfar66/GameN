// mothership:dev-only
//
// Transport from a harness page to the local fixture server. It always reports mode
// "fixture", so every screen it feeds is labeled as synthetic. Naming a seat in the
// query string selects an authored fixture view; it is not authentication.

/** The only match the scripted fixture contains. */
export const FIXTURE_MATCH_ID = 'fixture-match-a';

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  return response.json();
}
async function postJson(path, body) {
  const response = await fetch(path, { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return response.json();
}

/** @param {'public' | 'seat-1' | 'seat-2'} audienceKey */
export function createHttpFixtureTransport(audienceKey) {
  const transport = {
    mode: 'fixture',
    audience: audienceKey === 'public' ? 'public' : 'player',
    subscribe(listener) {
      const source = new EventSource(`/api/fixture/stream?audience=${encodeURIComponent(audienceKey)}`);
      let open = false;
      source.addEventListener('open', () => {
        open = true;
        listener.onConnectionChange('connected');
      });
      source.addEventListener('payload', event => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = event.data;
        }
        // Handed over unvalidated: the client core decides whether it is a readable view.
        listener.onPayload(payload);
      });
      // The operator restarted the script as a new match session.
      source.addEventListener('restart', () => window.location.reload());
      source.addEventListener('error', () => {
        // The browser keeps retrying by itself; only the first failure is a state change.
        if (!open) return;
        open = false;
        listener.onConnectionChange('disconnected');
      });
      return () => source.close();
    },
    serverTime: () => getJson('/api/fixture/time'),
    advanceIfExpired: request => postJson('/api/fixture/advance-if-expired', request),
  };
  if (transport.audience === 'player') {
    transport.submitCommand = command => postJson('/api/fixture/submit-command', command);
    transport.lookupReceipt = request => postJson('/api/fixture/lookup-receipt', request);
  }
  return transport;
}

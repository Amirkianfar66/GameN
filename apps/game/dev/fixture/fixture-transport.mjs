// mothership:dev-only
//
// An in-process transport over the scripted scenario, for tests. It satisfies the same
// transport interface a real backend adapter will, and always reports mode "fixture".

/**
 * @param {ReturnType<import('./scenario.mjs').createScenario>} scenario
 * @param {'public' | 'seat-1' | 'seat-2'} audienceKey Fixture identity selection. This is not authentication.
 */
export function createFixtureTransport(scenario, audienceKey) {
  const serverTimeMs = () => Math.round(scenario.serverTimeMs());
  // Command scripting arrives with the shot-flow slice. Until then the fixture answers with
  // the contract's own "try again later" error rather than inventing a receipt.
  const notScripted = () => Promise.resolve({ ok: false, serverTimeMs: serverTimeMs(), error: { code: 'UNAVAILABLE' } });
  const transport = {
    mode: 'fixture',
    audience: audienceKey === 'public' ? 'public' : 'player',
    subscribe: listener => scenario.subscribe(audienceKey, listener),
    serverTime: () => Promise.resolve({ protocolVersion: 1, serverTimeMs: serverTimeMs() }),
    advanceIfExpired: notScripted,
  };
  if (transport.audience === 'player') {
    transport.submitCommand = notScripted;
    transport.lookupReceipt = notScripted;
  }
  return transport;
}

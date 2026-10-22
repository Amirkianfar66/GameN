// mothership:dev-only
//
// An in-process transport over the scripted scenario, for tests. It satisfies the same
// transport interface a real backend adapter will, and always reports mode "fixture".

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

/**
 * @param {ReturnType<import('./scenario.mjs').createScenario>} scenario
 * @param {'public' | 'seat-1' | 'seat-2'} audienceKey Fixture identity selection. This is not authentication.
 * @param {object} [options]
 * @param {(ms: number) => Promise<void>} [options.wait] How a deliberately slow request is held back. Without it, a slow request arrives at once.
 */
export function createFixtureTransport(scenario, audienceKey, { wait } = {}) {
  const serverTimeMs = () => Math.round(scenario.serverTimeMs());
  // Expiry catch-up is not scripted: the client does not call it yet. The fixture answers
  // with the contract's own "try again later" error rather than inventing a result.
  const notScripted = () => Promise.resolve({ ok: false, serverTimeMs: serverTimeMs(), error: { code: 'UNAVAILABLE' } });
  // The desk is consulted as the request is made, so the script moves at that moment.
  const deliver = async result => {
    // Slow to arrive: the desk sees the request only after the wait.
    if (result.answered === 'later') {
      if (wait) await wait(result.delayMs);
      return deliver(result.resume());
    }
    // No answer at all: to a client that is a request that failed in transit.
    if (!result.answered) throw new Error('The fixture arranged for this request to get no answer');
    return result.body;
  };
  const transport = {
    mode: 'fixture',
    audience: audienceKey === 'public' ? 'public' : 'player',
    subscribe: listener => scenario.subscribe(audienceKey, listener),
    serverTime: () => Promise.resolve({ protocolVersion: 1, serverTimeMs: serverTimeMs() }),
    advanceIfExpired: notScripted,
  };
  if (transport.audience === 'player') {
    transport.submitCommand = command => deliver(scenario.submitCommand(audienceKey, command));
    transport.lookupReceipt = request => deliver(scenario.lookupReceipt(audienceKey, request));
  }
  return transport;
}

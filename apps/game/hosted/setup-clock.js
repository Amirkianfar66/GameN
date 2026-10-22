import { createServerClock } from '@mothership/game';

// Countdown estimates only. Server tasks and transactions own every transition.
export function createSetupClock({ api, ports, matchId, onTick = () => {} }) {
  const clock = createServerClock(ports.clock);
  let active = false, disposed = false, generation = 0, timer = null, nextSync = 0, pending = false;
  async function synchronize() {
    if (pending || !active || disposed) return;
    const token = generation; pending = true;
    try {
      const result = await api.serverTime(matchId);
      if (token !== generation || !active || disposed) return;
      if (result.kind === 'time') clock.addSample(result.sample);
      else clock.invalidate();
    } catch {
      if (token === generation && active && !disposed) clock.invalidate();
    } finally {
      if (token === generation) { pending = false; nextSync = ports.clock.now() + 15_000; if (active && !disposed) onTick(); }
    }
  }
  function tick() {
    if (!active || disposed) return;
    timer = null;
    if (ports.clock.now() >= nextSync) void synchronize();
    onTick();
    timer = ports.scheduler.setTimeout(tick, 1000);
  }
  function stop() {
    active = false; generation++; pending = false; clock.invalidate();
    if (timer !== null) ports.scheduler.clearTimeout(timer);
    timer = null;
  }
  return {
    setActive(value) {
      if (disposed || value === active) return;
      if (!value) return stop();
      active = true; nextSync = 0; void synchronize();
      timer = ports.scheduler.setTimeout(tick, 1000);
    },
    read: () => active && !disposed ? clock.read() : { status: 'unsynced' },
    suspend: stop,
    dispose() { stop(); disposed = true; },
  };
}

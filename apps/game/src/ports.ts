// Everything the client core needs from its host. Injecting these keeps the core free of
// browser globals, deterministic under test, and unable to read the device's wall clock.

export interface MonotonicClock {
  /** Milliseconds from an arbitrary origin. Only differences between readings are meaningful. */
  now(): number;
}

export interface Scheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ClientPorts {
  readonly clock: MonotonicClock;
  readonly scheduler: Scheduler;
}

/** A source of command identifiers. An identifier carries no meaning and is never reused. */
export interface IdSource {
  /** A new identifier that satisfies the shared contract's identifier format, e.g. a random UUID. */
  next(): string;
}

/** What a player's phone needs beyond a display: a way to name the commands it sends. */
export interface PlayerPorts extends ClientPorts {
  readonly ids: IdSource;
}
